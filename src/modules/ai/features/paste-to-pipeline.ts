// src/modules/ai/features/paste-to-pipeline.ts

import Anthropic from "@anthropic-ai/sdk"
import { logger } from "@/shared/logger"
import { getVerticalProfile } from "../verticals"
import type { ExtractedEntities } from "../ai.types"

const log = logger.child({ module: "ai.paste-to-pipeline" })

let client: Anthropic | null = null
function getClient(): Anthropic {
  if (!client) client = new Anthropic()
  return client
}

const SONNET_MODEL = "claude-sonnet-4-20250514"

/**
 * Extract structured entities from unstructured text input.
 * Returns extracted entities for user review before committing.
 */
export async function extractEntities(
  tenantId: string,
  rawInput: string
): Promise<ExtractedEntities> {
  const vertical = await getVerticalProfile(tenantId)

  const prompt = `Extract structured data from the following unstructured text. This is from a ${vertical.name} business.

TEXT:
${rawInput}

${vertical.systemPromptAddendum}

Extract the following entities if present:
1. **Customer info**: name, email, phone, company, notes
2. **Booking/appointment info**: service type, date, time, duration, notes
3. **Tasks/action items**: title, priority (LOW/MEDIUM/HIGH/URGENT), due date, assignee
4. **General notes**: any observations or context not fitting above categories

TERMINOLOGY MAPPING:
${Object.entries(vertical.terminology).map(([k, v]) => `- "${v}" means "${k}"`).join("\n")}

Respond with JSON:
{
  "customer": { "name": null, "email": null, "phone": null, "company": null, "notes": null } or null,
  "booking": { "service": null, "date": null, "time": null, "duration": null, "notes": null } or null,
  "tasks": [{ "title": "...", "priority": "MEDIUM", "dueDate": null, "assignee": null }],
  "notes": ["observation 1", "observation 2"],
  "confidence": 0-100
}

RULES:
- Only include entities you're confident about. Set confidence accordingly.
- Dates should be in ISO 8601 format (YYYY-MM-DD).
- Times should be in 24h format (HH:MM).
- If you're unsure about a field, set it to null.
- Don't invent data — only extract what's in the text.`

  const response = await getClient().messages.create({
    model: SONNET_MODEL,
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  })

  const text = response.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("")

  let parsed: Omit<ExtractedEntities, "rawInput">
  try {
    parsed = JSON.parse(text)
  } catch {
    log.warn({ tenantId }, "Failed to parse extraction result")
    parsed = {
      customer: null,
      booking: null,
      tasks: [],
      notes: [text],
      confidence: 20,
    }
  }

  log.info(
    { tenantId, hasCustomer: !!parsed.customer, hasBooking: !!parsed.booking, tasks: parsed.tasks.length, confidence: parsed.confidence },
    "Entities extracted from paste"
  )

  return { ...parsed, rawInput }
}
