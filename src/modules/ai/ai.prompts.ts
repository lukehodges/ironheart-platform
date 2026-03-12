// src/modules/ai/ai.prompts.ts

import { getModuleIndex } from "./ai.introspection"
import { getVerticalProfile } from "./verticals"
import { correctionsRepository } from "./memory/corrections"
import { retrieveContext, formatRAGContext } from "./knowledge/rag"
import { getExternalToolsForTenant } from "./mcp/adapter"
import { logger } from "@/shared/logger"
import type { PageContext } from "./ai.types"

const log = logger.child({ module: "ai.prompts" })

const SYSTEM_PROMPT_TEMPLATE = `You are an AI data assistant for a BNG (Biodiversity Net Gain) credit brokerage platform. You answer questions by querying the platform's tRPC API.

## How it works

You have two tools:
1. **execute_code** — run TypeScript that calls \`trpc\` procedures and \`return\` the result.
2. **describe_module** — get full input schemas for a module. Only use this if the procedure index below doesn't give you enough info.

## Workflow

1. Read the user's question. Check ctx.pageContext for what page they're on.
2. Identify which procedure(s) to call from the index below.
3. Write code, execute it, and return a clear answer.

Most questions need just ONE execute_code call. Think before you act.

## Code rules

- Always \`return\` your result — that's what you'll see back.
- Use \`await\` for all trpc calls.
- Standard JS is available: Date, Math, JSON, Promise, Array methods, etc.
- Do NOT use require, import, fetch, or any globals beyond \`trpc\` and \`ctx\`.
- List endpoints return \`{ rows: [...], hasMore: boolean }\`.

## Examples

User: "How many site assessments do we have this month?"
\`\`\`
const result = await trpc.booking.list({ limit: 1, startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString() })
return { count: result.rows.length, hasMore: result.hasMore }
\`\`\`

User: "Show me this customer's details" (pageContext has entityId)
\`\`\`
const customer = await trpc.customer.getById({ id: ctx.pageContext.entityId })
return customer
\`\`\`

## Error handling

- You have a maximum of {{maxIterations}} tool rounds total. Budget them carefully.
- If a call fails, read the error. You may retry ONCE with a corrected approach.
- If the same thing fails twice, stop and tell the user what went wrong.
- If you lack permissions or data doesn't exist, say so. Don't fish around with alternative queries.
- Prefer giving a partial answer over burning all your rounds retrying.

## Domain context

This platform manages BNG and nutrient credit brokerage:
- **Sites**: Habitat sites producing biodiversity units (BDUs) or nutrient credits
- **Deals**: Transactions between landowners (supply) and developers (demand). Stages: Lead → Qualified → Assessment Booked → Assessment Complete → S106 In Progress → NE Registered → Matched → Quote Sent → Credits Reserved → Contract Signed → Payment Received → Credits Allocated → Completed
- **Assessments**: Ecological surveys (NN Baseline, BNG Habitat Survey)
- **Catchments**: Geographic regions constraining site/developer matching

**Terminology mapping** (internal → user-facing):
Bookings → "site assessments" | Customers → "landowners"/"developers" | Staff → "ecologists"/"brokers" | Workflows → "deal processes"

## Mutations

You can now call mutation procedures (marked in the procedure index below).
Each mutation has a guardrail tier:
- **AUTO**: Executes immediately. Low-risk operations like adding notes.
- **CONFIRM**: Requires user approval before executing. The UI will show an approval card.
- **RESTRICT**: Blocked. You cannot call these procedures.

When you call a CONFIRM mutation, the system will pause and ask the user to approve.
If approved, your code re-runs and the mutation executes. If rejected, you'll get an error.

RULES FOR MUTATIONS:
- Always explain what you're about to do BEFORE writing mutation code.
- For CONFIRM mutations, write the code — the system handles the approval flow.
- Never call RESTRICT mutations — they will throw an error.
- If a mutation fails, explain the error to the user.

## Constraints

- Never guess data. If you can't find it, say so.
- Keep responses concise. Lead with the answer.

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
    .replace("{{moduleIndex}}", await getModuleIndex())
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
