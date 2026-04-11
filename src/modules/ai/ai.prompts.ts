// src/modules/ai/ai.prompts.ts

import { getFilteredModuleIndex } from "./ai.introspection"
import { getVerticalProfile } from "./verticals"
import { correctionsRepository } from "./memory/corrections"
import { retrieveContext, formatRAGContext } from "./knowledge/rag"
import { getExternalToolsForTenant } from "./mcp/adapter"
import { logger } from "@/shared/logger"
import type { PageContext } from "./ai.types"

const log = logger.child({ module: "ai.prompts" })

const SYSTEM_PROMPT_TEMPLATE = `You are an AI data assistant for a business platform. You answer questions by querying the platform's tRPC API.

## Tools

1. **execute_code** — run TypeScript that calls \`trpc\` procedures and \`return\` the result.
2. **describe_module** — get input schemas for a module's procedures. Use BEFORE any unfamiliar mutation.

## Workflow

1. Check ctx.pageContext for what page the user is on.
2. For queries: write code directly using the procedure index below.
3. For mutations: call describe_module FIRST, then write code.

Most queries need ONE execute_code call. Mutations need describe_module first, then execute_code.

## Code rules

- Always \`return\` your result.
- Use \`await\` for all trpc calls.
- Standard JS available: Date, Math, JSON, Promise, Array methods.
- Do NOT use require, import, fetch, or any globals beyond \`trpc\` and \`ctx\`.
- List endpoints return \`{ rows: [...], hasMore: boolean }\`.

## Type pitfalls

- **Dates**: \`new Date("2026-03-20")\` — Date object, NOT a string.
- **UUIDs**: Must be valid UUIDs. Never use placeholders. Query for them first.
- **Enums**: Use EXACT values from schema. Call describe_module if unsure.
- **Addresses**: Object \`{ line1?, city?, county?, postcode?, country? }\`, not a string.
- **Times**: \`"HH:MM"\` string, e.g. \`"09:00"\`.

## Examples

Query — list with date filter:
\`\`\`
const result = await trpc.booking.list({ limit: 50, startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1) })
return { count: result.rows.length, hasMore: result.hasMore }
\`\`\`

Query — get by ID from page context:
\`\`\`
return await trpc.customer.getById({ id: ctx.pageContext.entityId })
\`\`\`

Mutation — look up UUIDs first, then create:
\`\`\`
const customers = await trpc.customer.list({ search: "Jane Smith", limit: 1 })
if (!customers.rows[0]) return { error: "Customer not found" }
const services = await trpc.service.list({ limit: 10 })
const service = services.rows.find(s => s.name.includes("Assessment"))
if (!service) return { error: "No matching service found" }
return await trpc.booking.create({
  customerId: customers.rows[0].id, serviceId: service.id,
  scheduledDate: new Date("2026-03-24"), scheduledTime: "10:00",
  durationMinutes: 60, locationType: "VENUE"
})
\`\`\`

## Error handling

- Maximum {{maxIterations}} tool rounds. Budget carefully.
- If a call fails, fix the EXACT issue. If it fails twice, stop and explain.
- Prefer a partial answer over burning all rounds retrying.
- Use describe_module BEFORE attempting — not after a failure.

## Mutations

Guardrail tiers: **AUTO** = immediate | **CONFIRM** = needs user approval | **RESTRICT** = blocked.
- Explain what you'll do BEFORE writing mutation code.
- Use describe_module to check schemas BEFORE your first attempt.
- Never call RESTRICT mutations.

## Constraints

- Never guess data. Query for UUIDs first.
- Keep responses concise. Lead with the answer.
- Only include fields you actually have values for.

## Page context
{{pageContext}}

## Procedure index
{{moduleIndex}}`

export async function buildSystemPrompt(pageContext?: PageContext): Promise<string> {
  const contextStr = pageContext
    ? `Route: ${pageContext.route}${pageContext.entityType ? `, Entity: ${pageContext.entityType}` : ""}${pageContext.entityId ? ` (ID: ${pageContext.entityId})` : ""}`
    : "No specific page context"

  return SYSTEM_PROMPT_TEMPLATE
    .replace("{{pageContext}}", contextStr)
    .replace("{{moduleIndex}}", await getFilteredModuleIndex(pageContext))
    .replace("{{maxIterations}}", "5")
}

// ---------------------------------------------------------------------------
// Dynamic System Prompt Assembly
// ---------------------------------------------------------------------------

export async function assembleSystemPrompt(params: {
  tenantId: string
  pageContext?: PageContext
  userMessage: string
  conversationSummary?: string | null
}): Promise<string> {
  const { tenantId, pageContext, userMessage, conversationSummary } = params

  // 1. Base prompt (existing builder with module index)
  const parts: string[] = [await buildSystemPrompt(pageContext)]

  // 2. Vertical profile context
  try {
    const profile = await getVerticalProfile(tenantId)
    if (profile.systemPromptAddendum) {
      parts.push(`## Vertical Context (${profile.name})\n${profile.systemPromptAddendum}`)
    }
    if (Object.keys(profile.terminology).length > 0) {
      const termLines = Object.entries(profile.terminology)
        .map(([key, value]) => `- ${key} → ${value}`)
        .join("\n")
      parts.push(`## Additional Terminology\n${termLines}`)
    }
  } catch (err) {
    log.warn({ tenantId, err }, "Failed to load vertical profile")
  }

  // 3. Conversation summary (long-term memory)
  if (conversationSummary) {
    parts.push(`## Conversation History Summary\n${conversationSummary}`)
  }

  // 4. Recent corrections (learned mistakes)
  try {
    const corrections = await correctionsRepository.getAllRecentCorrections(tenantId)
    if (corrections.length > 0) {
      const correctionLines = corrections.map((c) => {
        let line = `- Tool "${c.toolName}"`
        if (c.rejectionReason) line += `: ${c.rejectionReason}`
        if (c.correctAction) line += ` → Correct approach: ${c.correctAction}`
        return line
      })
      parts.push(`## Learned Corrections\nAvoid repeating these past mistakes:\n${correctionLines.join("\n")}`)
    }
  } catch (err) {
    log.warn({ tenantId, err }, "Failed to load corrections")
  }

  // 5. RAG context (knowledge base)
  try {
    const ragResults = await retrieveContext(tenantId, userMessage)
    const ragSection = formatRAGContext(ragResults)
    if (ragSection) {
      parts.push(ragSection)
    }
  } catch (err) {
    log.warn({ tenantId, err }, "Failed to retrieve RAG context")
  }

  // 6. External MCP tools
  try {
    const externalTools = await getExternalToolsForTenant(tenantId)
    if (externalTools.length > 0) {
      const toolLines = externalTools.map((t) => {
        const schemaStr = JSON.stringify(t.inputSchema)
        return `  - \`${t.name}\` — ${t.description} [${t.guardrailTier}]\n    Input: ${schemaStr}`
      })
      parts.push(
        `## External Tools (MCP)\n` +
        `These tools come from external MCP servers. Call them using \`await ctx.external("toolName", args)\` in your execute_code blocks.\n` +
        `CONFIRM tools require user approval. RESTRICT tools are blocked.\n\n` +
        toolLines.join("\n")
      )
    }
  } catch (err) {
    log.warn({ tenantId, err }, "Failed to load external tools")
  }

  return parts.join("\n\n")
}
