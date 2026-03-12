// src/modules/ai/memory/summarizer.ts

import Anthropic from "@anthropic-ai/sdk"
import { logger } from "@/shared/logger"
import { aiRepository } from "../ai.repository"

const log = logger.child({ module: "ai.memory.summarizer" })

let client: Anthropic | null = null
function getClient(): Anthropic {
  if (!client) client = new Anthropic()
  return client
}

const HAIKU_MODEL = "claude-haiku-4-5-20251001"
const SUMMARIZE_THRESHOLD = 10

/**
 * Summarize conversation if message count since last summary exceeds threshold.
 * Uses Haiku for fast, cheap summarization.
 */
export async function maybeSummarize(conversationId: string): Promise<void> {
  const conversation = await aiRepository.getConversationById(conversationId)
  if (!conversation) {
    log.warn({ conversationId }, "Conversation not found for summarization")
    return
  }

  const messages = await aiRepository.getMessages(conversationId)

  // Count messages since last summary
  const lastSummaryAt = conversation.summaryUpdatedAt
  const messagesSinceSummary = lastSummaryAt
    ? messages.filter((m) => m.createdAt > lastSummaryAt)
    : messages

  if (messagesSinceSummary.length < SUMMARIZE_THRESHOLD) {
    return
  }

  log.info(
    { conversationId, messageCount: messagesSinceSummary.length },
    "Summarizing conversation"
  )

  const transcript = messagesSinceSummary
    .map((m) => `${m.role}: ${m.content}`)
    .join("\n")

  const previousSummary = conversation.summary
    ? `Previous summary:\n${conversation.summary}\n\n`
    : ""

  try {
    const response = await getClient().messages.create({
      model: HAIKU_MODEL,
      max_tokens: 500,
      messages: [
        {
          role: "user",
          content: `${previousSummary}Summarize this conversation concisely, preserving key facts, decisions, and context needed for continuity. Focus on what the user wanted, what was done, and any pending items.\n\n${transcript}`,
        },
      ],
    })

    const summary =
      response.content[0]?.type === "text" ? response.content[0].text : null

    if (summary) {
      await aiRepository.updateConversation(conversationId, {
        summary,
        summaryUpdatedAt: new Date(),
      })
      log.info({ conversationId }, "Conversation summary updated")
    }
  } catch (err) {
    log.error({ conversationId, err }, "Failed to summarize conversation")
  }
}

/**
 * Get effective conversation history: summary + recent messages.
 * Returns the summary (if any) plus the last 20 messages for context.
 */
export async function getEffectiveHistory(conversationId: string): Promise<{
  summary: string | null
  recentMessages: Array<{
    role: "system" | "user" | "assistant"
    content: string
  }>
}> {
  const conversation = await aiRepository.getConversationById(conversationId)
  if (!conversation) {
    return { summary: null, recentMessages: [] }
  }

  // Get the last 20 messages for recent context
  const allMessages = await aiRepository.getMessages(conversationId)
  const recentMessages = allMessages.slice(-20).map((m) => ({
    role: m.role,
    content: m.content,
  }))

  return {
    summary: conversation.summary,
    recentMessages,
  }
}
