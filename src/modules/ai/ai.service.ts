// src/modules/ai/ai.service.ts

import Anthropic from "@anthropic-ai/sdk"
import { logger } from "@/shared/logger"
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

export const aiService = {
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
    // 1. Get or create conversation
    let conversation = input.conversationId
      ? await aiRepository.getConversation(tenantId, input.conversationId)
      : null

    if (!conversation) {
      conversation = await aiRepository.createConversation(tenantId, userId)
    }

    // 2. Save user message
    await aiRepository.addMessage(conversation.id, {
      role: "user",
      content: input.message,
      pageContext: input.pageContext,
    })

    // 3. Load conversation history (last 20 messages max for context window)
    const history = await aiRepository.getMessages(conversation.id, 20)

    // 4. Build Anthropic messages array from history
    const anthropicMessages: Anthropic.MessageParam[] = history
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }))

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
      if (toolUseBlocks.length === 0 || response.stop_reason === "end_turn") {
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
          const result = await tool.execute(toolUse.input, ctx)
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

// Rough cost estimation (Sonnet 4 pricing — update if model changes)
function estimateCostCents(inputTokens: number, outputTokens: number): number {
  const inputCostPer1M = 300  // $3.00 per 1M input tokens
  const outputCostPer1M = 1500 // $15.00 per 1M output tokens
  const cost = (inputTokens / 1_000_000) * inputCostPer1M + (outputTokens / 1_000_000) * outputCostPer1M
  return Math.ceil(cost) // Round up to nearest cent
}
