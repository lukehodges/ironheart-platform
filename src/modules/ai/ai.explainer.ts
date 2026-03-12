// src/modules/ai/ai.explainer.ts

import Anthropic from "@anthropic-ai/sdk"
import { logger } from "@/shared/logger"
import { aiRepository } from "./ai.repository"
import { agentActionsRepository } from "./ai.actions.repository"

const log = logger.child({ module: "ai.explainer" })

let client: Anthropic | null = null
function getClient(): Anthropic {
  if (!client) client = new Anthropic()
  return client
}

const HAIKU_MODEL = "claude-haiku-4-5-20251001"

/**
 * Explain why the agent took a specific action.
 * Uses Haiku for fast, cheap explanations.
 */
export async function explainAction(actionId: string, tenantId: string): Promise<string> {
  const action = await agentActionsRepository.getById(actionId)
  if (!action) return "Action not found."

  // Get the conversation context around this action
  const messages = await aiRepository.getMessages(action.conversationId, 50)

  // Build a summary of the conversation flow leading to this action
  const contextSummary = messages
    .map((m) => {
      if (m.role === "user") return `User: ${m.content.slice(0, 200)}`
      if (m.role === "assistant") {
        const toolInfo = m.toolCalls?.map((tc) => `Called ${tc.name}`).join(", ") ?? ""
        return `Assistant: ${m.content.slice(0, 200)}${toolInfo ? ` [${toolInfo}]` : ""}`
      }
      return null
    })
    .filter(Boolean)
    .join("\n")

  const prompt = `You are explaining why an AI assistant took a specific action. Be concise (2-3 sentences max).

The assistant was asked to help with a task. Here is the conversation context:
${contextSummary}

The specific action taken was:
- Tool: ${action.toolName}
- Input: ${JSON.stringify(action.toolInput, null, 2)}
- Status: ${action.status}

Explain WHY the assistant chose this action, based on the conversation context. Focus on the user's intent and how this action fulfills it.`

  const response = await getClient().messages.create({
    model: HAIKU_MODEL,
    max_tokens: 256,
    messages: [{ role: "user", content: prompt }],
  })

  const explanation = response.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n")

  log.info({ actionId, tokens: response.usage.output_tokens }, "Action explained")
  return explanation
}

/**
 * Undo a previously executed action using its compensation function.
 */
export async function undoAction(actionId: string, tenantId: string, userId: string): Promise<{ success: boolean; message: string }> {
  const action = await agentActionsRepository.getById(actionId)
  if (!action) return { success: false, message: "Action not found" }
  if (!action.isReversible) return { success: false, message: "This action is not reversible" }
  if (action.status !== "executed" && action.status !== "auto_executed") {
    return { success: false, message: `Cannot undo action with status: ${action.status}` }
  }

  // The compensation logic is handled by the tool's compensate function.
  // We need to find the tool and call it.
  // For now, mark as rolled_back — the actual compensation is wired in the service layer.
  await agentActionsRepository.updateStatus(actionId, { status: "rolled_back" })
  return { success: true, message: "Action has been rolled back" }
}
