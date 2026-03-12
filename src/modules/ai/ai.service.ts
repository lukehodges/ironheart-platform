// src/modules/ai/ai.service.ts

import Anthropic from "@anthropic-ai/sdk"
import { logger } from "@/shared/logger"
import { redis } from "@/shared/redis"
import { BadRequestError } from "@/shared/errors"
import { aiRepository } from "./ai.repository"
import { allTools, getToolsForUser } from "./tools"
import { buildSystemPrompt } from "./ai.prompts"
import type { AgentContext, AgentResponse, AgentStreamEvent, ToolCallRecord, ToolResultRecord, TokenUsage, PageContext } from "./ai.types"

const log = logger.child({ module: "ai.service" })

// Lazy-init singleton — NEVER construct at module load time
let anthropicClient: Anthropic | null = null
function getClient(): Anthropic {
  if (!anthropicClient) {
    anthropicClient = new Anthropic()  // reads ANTHROPIC_API_KEY from env
  }
  return anthropicClient
}

const MAX_TOOL_ITERATIONS = 5
const DEFAULT_MODEL = "claude-sonnet-4-20250514"
const MAX_TOKENS = 4096
const TOKEN_BUDGET = 50_000
const RATE_LIMIT_PER_MINUTE = 20
const TOOL_TIMEOUT_MS = 10_000

async function checkRateLimit(tenantId: string, userId: string): Promise<boolean> {
  const key = `ai:rate:${tenantId}:${userId}`
  const current = await redis.incr(key)
  if (current === 1) {
    await redis.expire(key, 60)
  }
  return current <= RATE_LIMIT_PER_MINUTE
}

async function executeToolWithTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number = TOOL_TIMEOUT_MS
): Promise<T> {
  return Promise.race([
    fn(),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Tool execution timed out")), timeoutMs)
    ),
  ])
}

export const aiService = {
  async *sendMessageStreaming(
    tenantId: string,
    userId: string,
    userPermissions: string[],
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

    // 4. Build Anthropic messages array from history, preserving tool_use structure
    const anthropicMessages: Anthropic.MessageParam[] = rebuildAnthropicMessages(history)

    // 5. Get tools available to this user
    const ctx: AgentContext = { tenantId, userId, userPermissions, pageContext: input.pageContext }
    const availableTools = getToolsForUser(allTools, userPermissions)

    const anthropicTools: Anthropic.Tool[] = availableTools.map((t) => ({
      name: t.name,
      description: t.description,
      input_schema: t.inputSchema as Anthropic.Tool["input_schema"],
    }))

    // 6. Agent loop with streaming
    const allToolCalls: ToolCallRecord[] = []
    const allToolResults: ToolResultRecord[] = []
    let totalInputTokens = 0
    let totalOutputTokens = 0
    let finalContent = ""

    for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
      log.info({ conversationId: conversation.id, iteration }, "Agent streaming iteration")

      const stream = getClient().messages.stream({
        model: DEFAULT_MODEL,
        max_tokens: MAX_TOKENS,
        system: buildSystemPrompt(input.pageContext),
        messages: anthropicMessages,
        tools: anthropicTools,
      })

      // Collect the full response via streaming
      const response = await stream.finalMessage()

      totalInputTokens += response.usage.input_tokens
      totalOutputTokens += response.usage.output_tokens

      const textBlocks = response.content.filter((b) => b.type === "text")
      const toolUseBlocks = response.content.filter((b) => b.type === "tool_use")

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
        const tool = availableTools.find((t) => t.name === toolUse.name)
        const toolCallRecord: ToolCallRecord = {
          id: toolUse.id,
          name: toolUse.name,
          input: toolUse.input,
        }
        allToolCalls.push(toolCallRecord)

        yield { type: "tool_call" as const, toolName: toolUse.name, input: toolUse.input }

        if (!tool) {
          const errorResult = { toolCallId: toolUse.id, output: null, error: `Unknown tool: ${toolUse.name}` }
          allToolResults.push(errorResult)
          toolResultBlocks.push({ type: "tool_result", tool_use_id: toolUse.id, content: JSON.stringify({ error: errorResult.error }) })
          yield { type: "tool_result" as const, toolName: toolUse.name, result: { error: errorResult.error }, durationMs: 0 }
          continue
        }

        try {
          const startMs = Date.now()
          const result = await executeToolWithTimeout(() => tool.execute(toolUse.input, ctx))
          const durationMs = Date.now() - startMs

          log.info({ tool: toolUse.name, durationMs }, "Tool executed (streaming)")

          allToolResults.push({ toolCallId: toolUse.id, output: result })
          toolResultBlocks.push({ type: "tool_result", tool_use_id: toolUse.id, content: JSON.stringify(result, null, 2) })
          yield { type: "tool_result" as const, toolName: toolUse.name, result, durationMs }
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : "Tool execution failed"
          log.error({ err, tool: toolUse.name }, "Tool execution error (streaming)")

          allToolResults.push({ toolCallId: toolUse.id, output: null, error: errorMsg })
          toolResultBlocks.push({ type: "tool_result", tool_use_id: toolUse.id, content: JSON.stringify({ error: errorMsg }), is_error: true })
          yield { type: "tool_result" as const, toolName: toolUse.name, result: { error: errorMsg }, durationMs: 0 }
        }
      }

      // Append tool results
      anthropicMessages.push({ role: "user", content: toolResultBlocks })
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
    userPermissions: string[],
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

    // Token budget check
    if (conversation.tokenCount >= TOKEN_BUDGET) {
      throw new BadRequestError("This conversation has exceeded the token budget. Please start a new conversation.")
    }

    // 2. Save user message
    await aiRepository.addMessage(conversation.id, {
      role: "user",
      content: input.message,
      pageContext: input.pageContext,
    })

    // 3. Load conversation history (last 20 messages max for context window)
    const history = await aiRepository.getMessages(conversation.id, 20)

    // 4. Build Anthropic messages array from history, preserving tool_use structure
    const anthropicMessages: Anthropic.MessageParam[] = rebuildAnthropicMessages(history)

    // 5. Get tools available to this user
    const ctx: AgentContext = { tenantId, userId, userPermissions, pageContext: input.pageContext }
    const availableTools = getToolsForUser(allTools, userPermissions)

    // 6. Convert tools to Anthropic format
    const anthropicTools: Anthropic.Tool[] = availableTools.map((t) => ({
      name: t.name,
      description: t.description,
      input_schema: t.inputSchema as Anthropic.Tool["input_schema"],
    }))

    // 7. Agent loop — call Claude, execute tools, repeat
    const allToolCalls: ToolCallRecord[] = []
    const allToolResults: ToolResultRecord[] = []
    let totalInputTokens = 0
    let totalOutputTokens = 0
    let finalContent = ""

    for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
      log.info({ conversationId: conversation.id, iteration }, "Agent iteration")

      const response = await getClient().messages.create({
        model: DEFAULT_MODEL,
        max_tokens: MAX_TOKENS,
        system: buildSystemPrompt(input.pageContext),
        messages: anthropicMessages,
        tools: anthropicTools,
      })

      totalInputTokens += response.usage.input_tokens
      totalOutputTokens += response.usage.output_tokens

      // Extract text blocks and tool_use blocks
      const textBlocks = response.content.filter((b) => b.type === "text")
      const toolUseBlocks = response.content.filter((b) => b.type === "tool_use")

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
        const tool = availableTools.find((t) => t.name === toolUse.name)
        const toolCallRecord: ToolCallRecord = {
          id: toolUse.id,
          name: toolUse.name,
          input: toolUse.input,
        }
        allToolCalls.push(toolCallRecord)

        if (!tool) {
          const errorResult = { toolCallId: toolUse.id, output: null, error: `Unknown tool: ${toolUse.name}` }
          allToolResults.push(errorResult)
          toolResultBlocks.push({ type: "tool_result", tool_use_id: toolUse.id, content: JSON.stringify({ error: errorResult.error }) })
          continue
        }

        try {
          const startMs = Date.now()
          const result = await executeToolWithTimeout(() => tool.execute(toolUse.input, ctx))
          const durationMs = Date.now() - startMs

          const resultStr = JSON.stringify(result, null, 2)
          log.info({ tool: toolUse.name, durationMs }, "Tool executed")

          allToolResults.push({ toolCallId: toolUse.id, output: result })
          toolResultBlocks.push({ type: "tool_result", tool_use_id: toolUse.id, content: resultStr })
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : "Tool execution failed"
          log.error({ err, tool: toolUse.name }, "Tool execution error")

          allToolResults.push({ toolCallId: toolUse.id, output: null, error: errorMsg })
          toolResultBlocks.push({ type: "tool_result", tool_use_id: toolUse.id, content: JSON.stringify({ error: errorMsg }), is_error: true })
        }
      }

      // Append tool results
      anthropicMessages.push({ role: "user", content: toolResultBlocks })
    }

    // 8. Save assistant response
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

    // 9. Update conversation token count + generate title if first message
    const newTokenCount = conversation.tokenCount + totalInputTokens + totalOutputTokens
    const updates: Record<string, unknown> = {
      tokenCount: newTokenCount,
      costCents: conversation.costCents + estimateCostCents(totalInputTokens, totalOutputTokens),
    }

    if (!conversation.title && history.length <= 2) {
      // Auto-generate title from first user message (truncate)
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
 *
 * For assistant messages with tool calls, we reconstruct the tool_use content
 * blocks so Claude recognises its prior tool invocations. The following user
 * message then carries the corresponding tool_result blocks. Without this,
 * Claude loses tool context on multi-turn conversations and falls back to
 * faking tool calls as XML text.
 */
function rebuildAnthropicMessages(
  history: { role: string; content: string; toolCalls?: ToolCallRecord[] | null; toolResults?: ToolResultRecord[] | null }[]
): Anthropic.MessageParam[] {
  const msgs: Anthropic.MessageParam[] = []

  for (const m of history) {
    if (m.role === "system") continue

    if (m.role === "assistant" && m.toolCalls && m.toolCalls.length > 0) {
      // Reconstruct assistant message with tool_use content blocks
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

      // Inject a user message with tool_result blocks for each tool call
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

// Rough cost estimation (Sonnet 4 pricing — update if model changes)
function estimateCostCents(inputTokens: number, outputTokens: number): number {
  const inputCostPer1M = 300  // $3.00 per 1M input tokens
  const outputCostPer1M = 1500 // $15.00 per 1M output tokens
  const cost = (inputTokens / 1_000_000) * inputCostPer1M + (outputTokens / 1_000_000) * outputCostPer1M
  return Math.ceil(cost) // Round up to nearest cent
}
