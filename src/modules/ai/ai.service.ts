// src/modules/ai/ai.service.ts

import Anthropic from "@anthropic-ai/sdk"
import { logger } from "@/shared/logger"
import { redis } from "@/shared/redis"
import { db } from "@/shared/db"
import { BadRequestError } from "@/shared/errors"
import { createCallerFactory } from "@/shared/trpc"
import { aiRepository } from "./ai.repository"
import { agentTools, handleDescribeModule } from "./tools"
import { executeCode } from "./ai.executor"
import { buildSystemPrompt } from "./ai.prompts"
import { CircleDetector } from "./ai.circle-detector"
import type {
  AgentContext,
  AgentResponse,
  AgentStreamEvent,
  ToolCallRecord,
  ToolResultRecord,
  TokenUsage,
  PageContext,
} from "./ai.types"

const log = logger.child({ module: "ai.service" })

// Lazy-init singleton — NEVER construct at module load time
let anthropicClient: Anthropic | null = null
function getClient(): Anthropic {
  if (!anthropicClient) {
    anthropicClient = new Anthropic() // reads ANTHROPIC_API_KEY from env
  }
  return anthropicClient
}

// Lazy-init to avoid circular import (ai.service -> root -> ai module -> ai.service)
let cachedCreateCaller: ReturnType<typeof createCallerFactory> | null = null
async function getCreateCaller() {
  if (!cachedCreateCaller) {
    const { appRouter } = await import("@/server/root")
    if (!appRouter) {
      throw new Error("appRouter is undefined — circular dependency may not be resolved yet")
    }
    cachedCreateCaller = createCallerFactory(appRouter)
  }
  return cachedCreateCaller
}

const MAX_TOOL_ITERATIONS = 5
const DEFAULT_MODEL = "claude-sonnet-4-20250514"
const MAX_TOKENS = 4096
const TOKEN_BUDGET = 50_000

const RATE_LIMIT_PER_MINUTE = 20

async function checkRateLimit(tenantId: string, userId: string): Promise<boolean> {
  const key = `ai:rate:${tenantId}:${userId}`
  const current = await redis.incr(key)
  if (current === 1) {
    await redis.expire(key, 60)
  }
  return current <= RATE_LIMIT_PER_MINUTE
}

/**
 * Build a pre-authenticated tRPC caller for the AI agent.
 * Every call goes through the full middleware stack: auth, tenant isolation, RBAC, rate limiting.
 *
 * IMPORTANT: `session.user.id` must be the WorkOS user ID (not internal DB ID),
 * because `tenantProcedure` middleware uses it to look up the DB user via
 * `eq(users.workosUserId, workosUserId)`.
 *
 * The original `Request` is threaded through for correct IP-based rate limiting.
 */
async function buildTrpcCaller(ctx: AgentContext, req: Request) {
  const createCaller = await getCreateCaller()
  return createCaller({
    db,
    session: { user: { id: ctx.workosUserId } } as any,
    tenantId: ctx.tenantId,
    tenantSlug: "",
    user: null, // Populated by tenantProcedure middleware from session
    requestId: crypto.randomUUID(),
    req,
  })
}

/**
 * Handle a tool call from Claude — either describe_module or execute_code.
 */
async function handleToolCall(
  toolName: string,
  toolInput: unknown,
  trpcCaller: Awaited<ReturnType<typeof buildTrpcCaller>>,
  ctx: AgentContext
): Promise<{ result: unknown; durationMs: number; error?: string }> {
  if (toolName === "describe_module") {
    const input = toolInput as { module: string }
    return await handleDescribeModule(input)
  }

  if (toolName === "execute_code") {
    const input = toolInput as { code: string }
    try {
      const { result, durationMs } = await executeCode(
        input.code,
        trpcCaller,
        {
          tenantId: ctx.tenantId,
          userId: ctx.userId,
          userPermissions: ctx.userPermissions,
          pageContext: ctx.pageContext,
        }
      )
      return { result, durationMs }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Code execution failed"
      log.error({ err, code: input.code.slice(0, 200) }, "Code execution error")
      return { result: null, durationMs: 0, error: errorMsg }
    }
  }

  return { result: null, durationMs: 0, error: `Unknown tool: ${toolName}` }
}


export const aiService = {
  async *sendMessageStreaming(
    tenantId: string,
    userId: string,
    workosUserId: string,
    userPermissions: string[],
    req: Request,
    input: {
      conversationId?: string
      message: string
      pageContext?: PageContext
    }
  ): AsyncGenerator<AgentStreamEvent> {
    // Rate limit check
    const allowed = await checkRateLimit(tenantId, userId)
    if (!allowed) {
      throw new BadRequestError("Rate limit exceeded. Please wait a moment before sending another message.")
    }

    // 1. Get or create conversation
    let conversation = input.conversationId
      ? await aiRepository.getConversation(tenantId, input.conversationId)
      : null

    if (!conversation) {
      conversation = await aiRepository.createConversation(tenantId, userId)
    }

    // Token budget check
    if (conversation.tokenCount >= TOKEN_BUDGET) {
      throw new BadRequestError("This conversation has exceeded the token budget. Please start a new conversation.")
    }

    yield { type: "status", message: "Processing your message..." }

    // 2. Save user message
    await aiRepository.addMessage(conversation.id, {
      role: "user",
      content: input.message,
      pageContext: input.pageContext,
    })

    // 3. Load conversation history
    const history = await aiRepository.getMessages(conversation.id, 20)

    // 4. Build Anthropic messages array from history
    const anthropicMessages: Anthropic.MessageParam[] = rebuildAnthropicMessages(history)

    // 5. Build agent context and tRPC caller
    const ctx: AgentContext = { tenantId, userId, workosUserId, userPermissions, pageContext: input.pageContext }
    const trpcCaller = await buildTrpcCaller(ctx, req)

    // 6. Agent loop with streaming
    const allToolCalls: ToolCallRecord[] = []
    const allToolResults: ToolResultRecord[] = []
    let totalInputTokens = 0
    let totalOutputTokens = 0
    let finalContent = ""
    const systemPrompt = await buildSystemPrompt(input.pageContext)
    const circleDetector = new CircleDetector()

    for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
      log.info({ conversationId: conversation.id, iteration, maxIterations: MAX_TOOL_ITERATIONS }, "Agent streaming iteration")

      const stream = getClient().messages.stream({
        model: DEFAULT_MODEL,
        max_tokens: MAX_TOKENS,
        system: systemPrompt,
        messages: anthropicMessages,
        tools: agentTools,
      })

      const response = await stream.finalMessage()

      totalInputTokens += response.usage.input_tokens
      totalOutputTokens += response.usage.output_tokens

      const textBlocks = response.content.filter((b) => b.type === "text")
      const toolUseBlocks = response.content.filter((b) => b.type === "tool_use")

      log.info({
        conversationId: conversation.id,
        iteration,
        textBlocks: textBlocks.length,
        toolCalls: toolUseBlocks.map((t) => ({ name: t.name, inputPreview: JSON.stringify(t.input).slice(0, 200) })),
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        stopReason: response.stop_reason,
      }, "Agent iteration result")

      // Yield text deltas from text blocks
      for (const block of textBlocks) {
        if (block.text) {
          yield { type: "text_delta" as const, content: block.text }
        }
      }

      // If no tool calls, we're done
      if (toolUseBlocks.length === 0) {
        finalContent = textBlocks.map((b) => b.text).join("\n")
        break
      }

      // Append assistant message with tool_use content
      anthropicMessages.push({ role: "assistant", content: response.content })

      // Execute each tool call
      const toolResultBlocks: Anthropic.ToolResultBlockParam[] = []

      for (const toolUse of toolUseBlocks) {
        const toolCallRecord: ToolCallRecord = {
          id: toolUse.id,
          name: toolUse.name,
          input: toolUse.input,
        }
        allToolCalls.push(toolCallRecord)

        // Emit appropriate stream event
        if (toolUse.name === "execute_code") {
          const codeInput = toolUse.input as { code: string }
          yield { type: "code_executing" as const, code: codeInput.code }
        } else {
          yield { type: "tool_call" as const, toolName: toolUse.name, input: toolUse.input }
        }

        // Execute
        const { result, durationMs, error } = await handleToolCall(
          toolUse.name,
          toolUse.input,
          trpcCaller,
          ctx
        )

        if (error) {
          allToolResults.push({ toolCallId: toolUse.id, output: null, error })
          toolResultBlocks.push({
            type: "tool_result",
            tool_use_id: toolUse.id,
            content: JSON.stringify({ error }),
            is_error: true,
          })

          if (toolUse.name === "execute_code") {
            yield { type: "code_result" as const, result: null, durationMs, error }
          } else {
            yield { type: "tool_result" as const, toolName: toolUse.name, result: { error }, durationMs }
          }
        } else {
          allToolResults.push({ toolCallId: toolUse.id, output: result })
          toolResultBlocks.push({
            type: "tool_result",
            tool_use_id: toolUse.id,
            content: JSON.stringify(result, null, 2),
          })

          if (toolUse.name === "execute_code") {
            yield { type: "code_result" as const, result, durationMs }
          } else {
            yield { type: "tool_result" as const, toolName: toolUse.name, result, durationMs }
          }
        }

        circleDetector.record(toolUse.name, toolUse.input, error ?? null)
      }

      // Check for circling before continuing
      circleDetector.endIteration()
      const circleReason = circleDetector.detect()
      if (circleReason) {
        log.warn({ conversationId: conversation.id, iteration, reason: circleReason }, "Circle detected — stopping agent loop")
        finalContent = "I'm running into a repeated issue and don't want to waste your time retrying. " +
          "The error I keep hitting: " + (allToolResults.filter(r => r.error).pop()?.error ?? "unknown") +
          ". Please try rephrasing your question or contact support if this persists."
        yield { type: "text_delta" as const, content: finalContent }
        break
      }

      // Append tool results
      anthropicMessages.push({ role: "user", content: toolResultBlocks })

      // On the penultimate iteration, nudge the model to wrap up
      if (iteration === MAX_TOOL_ITERATIONS - 2) {
        anthropicMessages.push({
          role: "user",
          content: "[System: This is your last tool round. Respond with your best answer using the data you have. Do not call any more tools.]",
        })
      }
    }

    // If loop exhausted without a final text response, synthesize one
    if (!finalContent && allToolResults.length > 0) {
      finalContent = "I wasn't able to fully resolve your question within the tool limit. Here's what I found so far — please try rephrasing or narrowing your question."
    }

    // 7. Save assistant response
    const tokenUsage: TokenUsage = {
      inputTokens: totalInputTokens,
      outputTokens: totalOutputTokens,
      model: DEFAULT_MODEL,
    }

    await aiRepository.addMessage(conversation.id, {
      role: "assistant",
      content: finalContent,
      toolCalls: allToolCalls.length > 0 ? allToolCalls : undefined,
      toolResults: allToolResults.length > 0 ? allToolResults : undefined,
      tokenUsage,
    })

    // 8. Update conversation
    const newTokenCount = conversation.tokenCount + totalInputTokens + totalOutputTokens
    const updates: Record<string, unknown> = {
      tokenCount: newTokenCount,
      costCents: conversation.costCents + estimateCostCents(totalInputTokens, totalOutputTokens),
    }

    if (!conversation.title && history.length <= 2) {
      updates.title = input.message.slice(0, 100)
    }

    await aiRepository.updateConversation(conversation.id, updates)

    log.info(
      { conversationId: conversation.id, toolCalls: allToolCalls.length, inputTokens: totalInputTokens, outputTokens: totalOutputTokens },
      "Agent streaming response complete"
    )

    yield {
      type: "done" as const,
      content: finalContent,
      tokenUsage,
      toolCallCount: allToolCalls.length,
      conversationId: conversation.id,
    }
  },

  async sendMessage(
    tenantId: string,
    userId: string,
    workosUserId: string,
    userPermissions: string[],
    req: Request,
    input: {
      conversationId?: string
      message: string
      pageContext?: PageContext
    }
  ): Promise<AgentResponse> {
    // Rate limit check
    const allowed = await checkRateLimit(tenantId, userId)
    if (!allowed) {
      throw new BadRequestError("Rate limit exceeded. Please wait a moment before sending another message.")
    }

    // 1. Get or create conversation
    let conversation = input.conversationId
      ? await aiRepository.getConversation(tenantId, input.conversationId)
      : null

    if (!conversation) {
      conversation = await aiRepository.createConversation(tenantId, userId)
    }

    if (conversation.tokenCount >= TOKEN_BUDGET) {
      throw new BadRequestError("This conversation has exceeded the token budget. Please start a new conversation.")
    }

    // 2. Save user message
    await aiRepository.addMessage(conversation.id, {
      role: "user",
      content: input.message,
      pageContext: input.pageContext,
    })

    // 3. Load history + build messages
    const history = await aiRepository.getMessages(conversation.id, 20)
    const anthropicMessages: Anthropic.MessageParam[] = rebuildAnthropicMessages(history)

    // 4. Build context + caller
    const ctx: AgentContext = { tenantId, userId, workosUserId, userPermissions, pageContext: input.pageContext }
    const trpcCaller = await buildTrpcCaller(ctx, req)

    // 5. Agent loop
    const allToolCalls: ToolCallRecord[] = []
    const allToolResults: ToolResultRecord[] = []
    let totalInputTokens = 0
    let totalOutputTokens = 0
    let finalContent = ""
    const systemPrompt = await buildSystemPrompt(input.pageContext)
    const circleDetector = new CircleDetector()

    for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
      log.info({ conversationId: conversation.id, iteration }, "Agent iteration")

      const response = await getClient().messages.create({
        model: DEFAULT_MODEL,
        max_tokens: MAX_TOKENS,
        system: systemPrompt,
        messages: anthropicMessages,
        tools: agentTools,
      })

      totalInputTokens += response.usage.input_tokens
      totalOutputTokens += response.usage.output_tokens

      const textBlocks = response.content.filter((b) => b.type === "text")
      const toolUseBlocks = response.content.filter((b) => b.type === "tool_use")

      if (toolUseBlocks.length === 0) {
        finalContent = textBlocks.map((b) => b.text).join("\n")
        break
      }

      anthropicMessages.push({ role: "assistant", content: response.content })
      const toolResultBlocks: Anthropic.ToolResultBlockParam[] = []

      for (const toolUse of toolUseBlocks) {
        allToolCalls.push({ id: toolUse.id, name: toolUse.name, input: toolUse.input })

        const { result, error } = await handleToolCall(toolUse.name, toolUse.input, trpcCaller, ctx)

        if (error) {
          allToolResults.push({ toolCallId: toolUse.id, output: null, error })
          toolResultBlocks.push({ type: "tool_result", tool_use_id: toolUse.id, content: JSON.stringify({ error }), is_error: true })
        } else {
          allToolResults.push({ toolCallId: toolUse.id, output: result })
          toolResultBlocks.push({ type: "tool_result", tool_use_id: toolUse.id, content: JSON.stringify(result, null, 2) })
        }

        circleDetector.record(toolUse.name, toolUse.input, error ?? null)
      }

      circleDetector.endIteration()
      const circleReason = circleDetector.detect()
      if (circleReason) {
        log.warn({ conversationId: conversation.id, iteration, reason: circleReason }, "Circle detected — stopping agent loop")
        finalContent = "I'm running into a repeated issue and don't want to waste your time retrying. " +
          "The error I keep hitting: " + (allToolResults.filter(r => r.error).pop()?.error ?? "unknown") +
          ". Please try rephrasing your question or contact support if this persists."
        break
      }

      anthropicMessages.push({ role: "user", content: toolResultBlocks })

      if (iteration === MAX_TOOL_ITERATIONS - 2) {
        anthropicMessages.push({
          role: "user",
          content: "[System: This is your last tool round. Respond with your best answer using the data you have. Do not call any more tools.]",
        })
      }
    }

    if (!finalContent && allToolResults.length > 0) {
      finalContent = "I wasn't able to fully resolve your question within the tool limit. Here's what I found so far — please try rephrasing or narrowing your question."
    }

    // 6. Save + update
    const tokenUsage: TokenUsage = {
      inputTokens: totalInputTokens,
      outputTokens: totalOutputTokens,
      model: DEFAULT_MODEL,
    }

    const assistantMessage = await aiRepository.addMessage(conversation.id, {
      role: "assistant",
      content: finalContent,
      toolCalls: allToolCalls.length > 0 ? allToolCalls : undefined,
      toolResults: allToolResults.length > 0 ? allToolResults : undefined,
      tokenUsage,
    })

    const newTokenCount = conversation.tokenCount + totalInputTokens + totalOutputTokens
    const updates: Record<string, unknown> = {
      tokenCount: newTokenCount,
      costCents: conversation.costCents + estimateCostCents(totalInputTokens, totalOutputTokens),
    }

    if (!conversation.title && history.length <= 2) {
      updates.title = input.message.slice(0, 100)
    }

    await aiRepository.updateConversation(conversation.id, updates)

    log.info(
      { conversationId: conversation.id, toolCalls: allToolCalls.length, inputTokens: totalInputTokens, outputTokens: totalOutputTokens },
      "Agent response complete"
    )

    return {
      conversationId: conversation.id,
      messageId: assistantMessage.id,
      content: finalContent,
      toolCalls: allToolCalls,
      toolResults: allToolResults,
      tokenUsage,
    }
  },
}

/**
 * Rebuild Anthropic-compatible messages from stored history.
 */
function rebuildAnthropicMessages(
  history: { role: string; content: string; toolCalls?: ToolCallRecord[] | null; toolResults?: ToolResultRecord[] | null }[]
): Anthropic.MessageParam[] {
  const msgs: Anthropic.MessageParam[] = []

  for (const m of history) {
    if (m.role === "system") continue

    if (m.role === "assistant" && m.toolCalls && m.toolCalls.length > 0) {
      const contentBlocks: Anthropic.ContentBlockParam[] = []

      if (m.content) {
        contentBlocks.push({ type: "text", text: m.content })
      }

      for (const tc of m.toolCalls) {
        contentBlocks.push({
          type: "tool_use",
          id: tc.id,
          name: tc.name,
          input: tc.input as Record<string, unknown>,
        })
      }

      msgs.push({ role: "assistant", content: contentBlocks })

      if (m.toolResults && m.toolResults.length > 0) {
        const resultBlocks: Anthropic.ToolResultBlockParam[] = m.toolResults.map((tr) => ({
          type: "tool_result" as const,
          tool_use_id: tr.toolCallId,
          content: tr.error
            ? JSON.stringify({ error: tr.error })
            : JSON.stringify(tr.output, null, 2),
          ...(tr.error ? { is_error: true } : {}),
        }))
        msgs.push({ role: "user", content: resultBlocks })
      }
    } else {
      msgs.push({
        role: m.role as "user" | "assistant",
        content: m.content,
      })
    }
  }

  return msgs
}

function estimateCostCents(inputTokens: number, outputTokens: number): number {
  const inputCostPer1M = 300
  const outputCostPer1M = 1500
  const cost = (inputTokens / 1_000_000) * inputCostPer1M + (outputTokens / 1_000_000) * outputCostPer1M
  return Math.ceil(cost)
}
