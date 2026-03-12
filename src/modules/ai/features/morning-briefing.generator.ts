// src/modules/ai/features/morning-briefing.generator.ts

import Anthropic from "@anthropic-ai/sdk"
import { logger } from "@/shared/logger"
import { getVerticalProfile } from "../verticals"
import type { MorningBriefing, BriefingSection, BriefingMetrics } from "../ai.types"

const log = logger.child({ module: "ai.morning-briefing.generator" })

let client: Anthropic | null = null
function getClient(): Anthropic {
  if (!client) client = new Anthropic()
  return client
}

const SONNET_MODEL = "claude-sonnet-4-20250514"

/**
 * Generate a morning briefing narrative from gathered data.
 */
export async function generateBriefing(
  tenantId: string,
  data: {
    metrics: BriefingMetrics
    recentBookings: unknown[]
    recentReviews: unknown[]
    failedWorkflows: unknown[]
    pendingActions: unknown[]
  }
): Promise<MorningBriefing> {
  const vertical = await getVerticalProfile(tenantId)

  const prompt = `Generate a morning briefing for a ${vertical.name} business. Be concise, actionable, and prioritize what needs attention today.

METRICS (last 24 hours):
${JSON.stringify(data.metrics, null, 2)}

RECENT BOOKINGS (pending/new):
${JSON.stringify(data.recentBookings.slice(0, 10), null, 2)}

RECENT REVIEWS:
${JSON.stringify(data.recentReviews.slice(0, 5), null, 2)}

FAILED WORKFLOWS:
${JSON.stringify(data.failedWorkflows.slice(0, 5), null, 2)}

PENDING AGENT ACTIONS (needing approval):
${JSON.stringify(data.pendingActions.slice(0, 5), null, 2)}

${vertical.systemPromptAddendum}

FORMAT: Respond with JSON:
{
  "narrative": "2-3 paragraph executive summary",
  "sections": [
    { "title": "Section name", "priority": "high|medium|low", "content": "Details", "references": [{ "type": "booking|customer|review", "id": "uuid", "label": "display name" }] }
  ]
}

RULES:
- Lead with the most important items
- Flag anomalies (unusual cancellation rate, low ratings, failed workflows)
- Suggest specific actions for high-priority items
- Use ${vertical.name} terminology
- Keep narrative under 500 words
- Include 3-5 sections max`

  const response = await getClient().messages.create({
    model: SONNET_MODEL,
    max_tokens: 2048,
    messages: [{ role: "user", content: prompt }],
  })

  const text = response.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("")

  let parsed: { narrative: string; sections: BriefingSection[] }
  try {
    parsed = JSON.parse(text)
  } catch {
    log.warn({ tenantId }, "Failed to parse briefing JSON — using raw text")
    parsed = {
      narrative: text,
      sections: [],
    }
  }

  log.info({ tenantId, sections: parsed.sections.length }, "Morning briefing generated")

  return {
    tenantId,
    generatedAt: new Date(),
    narrative: parsed.narrative,
    sections: parsed.sections,
    metrics: data.metrics,
  }
}
