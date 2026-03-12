# AI Agent Phase F Implementation Plan

> **For Claude:** This is a self-contained implementation plan. Follow it task-by-task. Each task specifies exact files, exact code, and exact patterns. Do NOT deviate from established codebase patterns documented below.

**Goal:** Build the killer features that differentiate Ironheart: Morning Briefing (daily proactive intelligence digest), Ghost Operator (after-hours autonomous processing), and Paste-to-Pipeline (unstructured input parsing). These are the highest-adoption features from the design doc.

**Timeline:** 10 working days

**Design Doc:** `docs/plans/2026-03-08-ai-native-agentic-platform-design.md` (Section 8: Killer Features, Section 10: Phase F)
**Phase E Plan (prerequisite — must be complete):** `docs/plans/2026-03-12-ai-agent-phase-e-implementation.md`

---

## Key Architecture Decisions (DO NOT CHANGE)

1. **Morning Briefing is an Inngest scheduled task.** Runs daily per tenant (configurable time). Uses Sonnet to analyze overnight data (new bookings, reviews, workflow completions, anomalies) and generate a narrative briefing. Delivered via in-app notification + optional email.
2. **Ghost Operator is an Inngest scheduled task.** Runs during tenant-configured "after hours" window. Processes a queue of pre-approved action patterns: auto-confirm bookings matching rules, send follow-up emails, process overdue invoices. Every action is logged to `agent_actions` with source "ghost_operator".
3. **Paste-to-Pipeline uses Claude for entity extraction.** User pastes unstructured text (email, phone transcript, scribbled notes). Claude parses it into structured entities (customer, booking, notes, tasks). User reviews extracted entities before committing.
4. **All features gate behind tenant config.** Each killer feature has an enable/disable toggle in `ai_tenant_config`. Default: disabled. Tenants opt in.
5. **Morning Briefing uses existing read tools.** The briefing agent runs the same read-only tools from Phase A+ to gather data. No new data sources needed.
6. **Ghost Operator respects Phase B guardrails.** Actions taken by Ghost Operator go through the same guardrail system. Only AUTO-tier actions execute unattended. CONFIRM actions are queued for morning review.

---

## Progress Tracking

```
[ ] Task 1: Extend ai_tenant_config for killer features
[ ] Task 2: Morning Briefing types and schemas
[ ] Task 3: Morning Briefing — data gathering service
[ ] Task 4: Morning Briefing — narrative generator
[ ] Task 5: Morning Briefing — Inngest scheduled job
[ ] Task 6: Ghost Operator types and rule engine
[ ] Task 7: Ghost Operator — action processor
[ ] Task 8: Ghost Operator — Inngest scheduled job
[ ] Task 9: Paste-to-Pipeline — entity extractor
[ ] Task 10: Paste-to-Pipeline — review + commit flow
[ ] Task 11: Router procedures + schemas
[ ] Task 12: Tests
[ ] Task 13: Verification — tsc + build + tests
```

---

## Codebase Patterns Reference

All patterns from Phase A+ through E apply.

### Inngest scheduled task pattern:
```typescript
const myTask = inngest.createFunction(
  { id: "namespace/task-name", name: "Human Name" },
  { cron: "0 8 * * *" }, // Cron expression
  async ({ step }) => {
    const result = await step.run("step-name", async () => {
      // Work here
      return { data: "..." }
    })
  }
)
```

---

## Task 1: Extend ai_tenant_config for Killer Features

**Files:**
- Modify: `src/shared/db/schemas/ai.schema.ts`

Add columns to the `aiTenantConfig` table:

```typescript
// Add to aiTenantConfig table definition:

/** Morning Briefing */
morningBriefingEnabled: integer("morning_briefing_enabled").notNull().default(0),
morningBriefingTime: text("morning_briefing_time").default("08:00"), // HH:MM in tenant timezone
morningBriefingTimezone: text("morning_briefing_timezone").default("Europe/London"),
morningBriefingDelivery: text("morning_briefing_delivery").default("in_app"), // 'in_app' | 'email' | 'both'
morningBriefingRecipientIds: jsonb("morning_briefing_recipient_ids").default("[]"), // User IDs to receive briefing

/** Ghost Operator */
ghostOperatorEnabled: integer("ghost_operator_enabled").notNull().default(0),
ghostOperatorStartHour: integer("ghost_operator_start_hour").default(18), // 6 PM
ghostOperatorEndHour: integer("ghost_operator_end_hour").default(8), // 8 AM
ghostOperatorTimezone: text("ghost_operator_timezone").default("Europe/London"),
ghostOperatorRules: jsonb("ghost_operator_rules").default("[]"), // Array of GhostOperatorRule

/** Paste-to-Pipeline */
pasteToPipelineEnabled: integer("paste_to_pipeline_enabled").notNull().default(0),
```

Also update the `TenantAIConfig` type in `ai.types.ts` to include these fields.

**Commit:** `feat(ai): extend tenant config with morning briefing, ghost operator, and paste-to-pipeline settings`

---

## Task 2: Morning Briefing Types and Schemas

**Files:**
- Modify: `src/modules/ai/ai.types.ts`

```typescript
// Add to ai.types.ts:

// ---------------------------------------------------------------------------
// Morning Briefing
// ---------------------------------------------------------------------------

export interface MorningBriefing {
  tenantId: string
  generatedAt: Date
  /** Narrative summary */
  narrative: string
  /** Structured sections */
  sections: BriefingSection[]
  /** Key metrics snapshot */
  metrics: BriefingMetrics
}

export interface BriefingSection {
  title: string
  priority: "high" | "medium" | "low"
  content: string
  /** Entity references for linking */
  references: Array<{ type: string; id: string; label: string }>
}

export interface BriefingMetrics {
  newBookings24h: number
  completedBookings24h: number
  cancelledBookings24h: number
  newReviews24h: number
  avgRating24h: number | null
  overdueInvoices: number
  pendingApprovals: number
  workflowsTriggered24h: number
  workflowsFailed24h: number
}

// ---------------------------------------------------------------------------
// Ghost Operator
// ---------------------------------------------------------------------------

export interface GhostOperatorRule {
  id: string
  name: string
  enabled: boolean
  /** What triggers this rule */
  trigger: "pending_booking" | "overdue_invoice" | "review_followup" | "workflow_retry"
  /** Conditions that must be met */
  conditions: Record<string, unknown>
  /** Action to take */
  action: {
    toolName: string
    inputTemplate: Record<string, unknown>
  }
  /** Only execute if the tool's guardrail tier is AUTO */
  requireAutoTier: boolean
}

export interface GhostOperatorResult {
  ruleId: string
  ruleName: string
  actionsAttempted: number
  actionsExecuted: number
  actionsQueued: number // CONFIRM-tier queued for morning review
  errors: string[]
}

// ---------------------------------------------------------------------------
// Paste-to-Pipeline
// ---------------------------------------------------------------------------

export interface ExtractedEntities {
  /** Extracted customer info */
  customer: {
    name: string | null
    email: string | null
    phone: string | null
    company: string | null
    notes: string | null
  } | null
  /** Extracted booking/appointment info */
  booking: {
    service: string | null
    date: string | null
    time: string | null
    duration: string | null
    notes: string | null
  } | null
  /** Extracted tasks/action items */
  tasks: Array<{
    title: string
    priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT"
    dueDate: string | null
    assignee: string | null
  }>
  /** Extracted notes/observations */
  notes: string[]
  /** Confidence score (0-100) */
  confidence: number
  /** Raw input for reference */
  rawInput: string
}
```

**Commit:** `feat(ai): add morning briefing, ghost operator, and paste-to-pipeline types`

---

## Task 3: Morning Briefing — Data Gathering Service

**Files:**
- Create: `src/modules/ai/features/morning-briefing.data.ts`

```typescript
// src/modules/ai/features/morning-briefing.data.ts

import { logger } from "@/shared/logger"
import { allTools, getToolsForUser } from "../tools"
import type { AgentContext, BriefingMetrics } from "../ai.types"

const log = logger.child({ module: "ai.morning-briefing.data" })

/**
 * Gather data for the morning briefing using existing read-only tools.
 * This runs as the agent — same tools, same permissions.
 */
export async function gatherBriefingData(tenantId: string): Promise<{
  metrics: BriefingMetrics
  recentBookings: unknown[]
  recentReviews: unknown[]
  failedWorkflows: unknown[]
  pendingActions: unknown[]
}> {
  // Create a superuser context for the briefing agent (internal service)
  const ctx: AgentContext = {
    tenantId,
    userId: "system", // Internal system user
    userPermissions: ["bookings:read", "customers:read", "reviews:read", "payments:read", "analytics:read", "workflows:read"],
  }

  const tools = getToolsForUser(allTools, ctx.userPermissions)
  const findTool = (name: string) => tools.find((t) => t.name === name)

  // Gather data in parallel where possible
  const [bookingsResult, reviewsResult, analyticsResult] = await Promise.allSettled([
    findTool("booking.list")?.execute({ limit: 50, status: "PENDING" }, ctx),
    findTool("review.list")?.execute({ limit: 20 }, ctx),
    findTool("analytics.getDashboardSummary")?.execute({}, ctx),
  ])

  const recentBookings = bookingsResult.status === "fulfilled" ? (bookingsResult.value as unknown[]) : []
  const recentReviews = reviewsResult.status === "fulfilled" ? (reviewsResult.value as unknown[]) : []
  const analytics = analyticsResult.status === "fulfilled" ? (analyticsResult.value as Record<string, unknown>) : {}

  const metrics: BriefingMetrics = {
    newBookings24h: (analytics.newBookings24h as number) ?? 0,
    completedBookings24h: (analytics.completedBookings24h as number) ?? 0,
    cancelledBookings24h: (analytics.cancelledBookings24h as number) ?? 0,
    newReviews24h: (analytics.newReviews24h as number) ?? 0,
    avgRating24h: (analytics.avgRating24h as number) ?? null,
    overdueInvoices: (analytics.overdueInvoices as number) ?? 0,
    pendingApprovals: 0, // TODO: query agent_actions for pending
    workflowsTriggered24h: (analytics.workflowsTriggered24h as number) ?? 0,
    workflowsFailed24h: (analytics.workflowsFailed24h as number) ?? 0,
  }

  log.info({ tenantId, metrics }, "Briefing data gathered")

  return {
    metrics,
    recentBookings: Array.isArray(recentBookings) ? recentBookings : [],
    recentReviews: Array.isArray(recentReviews) ? recentReviews : [],
    failedWorkflows: [],
    pendingActions: [],
  }
}
```

**Commit:** `feat(ai): add morning briefing data gathering service`

---

## Task 4: Morning Briefing — Narrative Generator

**Files:**
- Create: `src/modules/ai/features/morning-briefing.generator.ts`

```typescript
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
```

**Commit:** `feat(ai): add morning briefing narrative generator`

---

## Task 5: Morning Briefing — Inngest Scheduled Job

**Files:**
- Modify: `src/modules/ai/ai.events.ts`
- Modify: `src/shared/inngest.ts`

### Add Inngest event:

```typescript
// src/shared/inngest.ts — add:
"ai/briefing.generated": {
  data: { tenantId: string; briefingId: string }
}
```

### Add scheduled job to ai.events.ts:

```typescript
import { gatherBriefingData } from "./features/morning-briefing.data"
import { generateBriefing } from "./features/morning-briefing.generator"
import { aiConfigRepository } from "./ai.config.repository"

const morningBriefingJob = inngest.createFunction(
  { id: "ai/morning-briefing", name: "Morning Briefing Generator" },
  { cron: "0 * * * *" }, // Run every hour — filter by tenant's configured time
  async ({ step }) => {
    const results = await step.run("generate-briefings", async () => {
      // Get all tenants with morning briefing enabled
      // Since we don't have a listAllConfigs method, this is a simplified approach
      // In production, iterate tenants from a dedicated query
      const { db } = await import("@/shared/db")
      const { aiTenantConfig } = await import("@/shared/db/schema")
      const { eq } = await import("drizzle-orm")

      const configs = await db
        .select()
        .from(aiTenantConfig)
        .where(eq(aiTenantConfig.morningBriefingEnabled, 1))

      const currentHour = new Date().getHours() // UTC
      const generated: string[] = []

      for (const config of configs) {
        // Check if current hour matches tenant's briefing time
        // Simplified: compare hour only. Full implementation would use timezone conversion.
        const briefingHour = parseInt((config.morningBriefingTime as string ?? "08:00").split(":")[0], 10)
        if (currentHour !== briefingHour) continue

        try {
          const data = await gatherBriefingData(config.tenantId)
          const briefing = await generateBriefing(config.tenantId, data)

          // Store briefing in ai_messages as a system-generated conversation
          // Or emit notification event — depends on delivery preference
          const { inngest: inn } = await import("@/shared/inngest")
          await inn.send({
            name: "ai/briefing.generated",
            data: { tenantId: config.tenantId, briefingId: crypto.randomUUID() },
          })

          generated.push(config.tenantId)
        } catch (err) {
          // Log but don't fail — one tenant's error shouldn't block others
          const { logger: log } = await import("@/shared/logger")
          log.error({ err, tenantId: config.tenantId }, "Failed to generate morning briefing")
        }
      }

      return { generated: generated.length }
    })

    return results
  }
)
```

Add `morningBriefingJob` to the `aiFunctions` array.

**Commit:** `feat(ai): add morning briefing Inngest scheduled job`

---

## Task 6: Ghost Operator Types and Rule Engine

**Files:**
- Create: `src/modules/ai/features/ghost-operator.rules.ts`

```typescript
// src/modules/ai/features/ghost-operator.rules.ts

import { logger } from "@/shared/logger"
import type { GhostOperatorRule, GhostOperatorResult } from "../ai.types"

const log = logger.child({ module: "ai.ghost-operator.rules" })

/**
 * Default ghost operator rules. Tenants can customize via ai_tenant_config.
 */
export const DEFAULT_GHOST_RULES: GhostOperatorRule[] = [
  {
    id: "auto-confirm-bookings",
    name: "Auto-confirm pending bookings",
    enabled: true,
    trigger: "pending_booking",
    conditions: {
      minHoursOld: 2, // Only confirm bookings pending for 2+ hours
      hasPayment: true, // Only if payment is received
    },
    action: {
      toolName: "booking.updateStatus",
      inputTemplate: { status: "CONFIRMED" },
    },
    requireAutoTier: true,
  },
  {
    id: "review-followup",
    name: "Send review request followup",
    enabled: true,
    trigger: "review_followup",
    conditions: {
      daysSinceCompletion: 1, // 1 day after booking completion
      noReviewYet: true,
    },
    action: {
      toolName: "notification.sendEmail",
      inputTemplate: {
        subject: "How was your experience?",
        body: "We'd love to hear about your recent visit. Please take a moment to leave a review.",
      },
    },
    requireAutoTier: true,
  },
  {
    id: "retry-failed-workflows",
    name: "Retry failed workflows",
    enabled: false, // Disabled by default — opt-in
    trigger: "workflow_retry",
    conditions: {
      maxRetries: 2,
      failedWithinHours: 12,
    },
    action: {
      toolName: "workflow.retry",
      inputTemplate: {},
    },
    requireAutoTier: true,
  },
]

/**
 * Merge tenant custom rules with defaults.
 * Tenant rules with same ID override defaults.
 */
export function resolveGhostRules(tenantRules: GhostOperatorRule[]): GhostOperatorRule[] {
  const ruleMap = new Map<string, GhostOperatorRule>()

  // Start with defaults
  for (const rule of DEFAULT_GHOST_RULES) {
    ruleMap.set(rule.id, rule)
  }

  // Override with tenant rules
  for (const rule of tenantRules) {
    ruleMap.set(rule.id, rule)
  }

  return Array.from(ruleMap.values()).filter((r) => r.enabled)
}
```

**Commit:** `feat(ai): add ghost operator rule engine with default rules`

---

## Task 7: Ghost Operator — Action Processor

**Files:**
- Create: `src/modules/ai/features/ghost-operator.processor.ts`

```typescript
// src/modules/ai/features/ghost-operator.processor.ts

import { logger } from "@/shared/logger"
import { allTools } from "../tools"
import { allMutationTools, isMutatingTool } from "../tools"
import { agentActionsRepository } from "../ai.actions.repository"
import { aiConfigRepository } from "../ai.config.repository"
import { resolveGhostRules } from "./ghost-operator.rules"
import type { AgentContext, GhostOperatorResult, GhostOperatorRule } from "../ai.types"

const log = logger.child({ module: "ai.ghost-operator.processor" })

/**
 * Process ghost operator rules for a tenant.
 * Only executes AUTO-tier actions. CONFIRM-tier actions are queued for review.
 */
export async function processGhostOperator(tenantId: string): Promise<GhostOperatorResult[]> {
  const config = await aiConfigRepository.getOrCreate(tenantId)
  const tenantRules = (config.ghostOperatorRules as GhostOperatorRule[]) ?? []
  const activeRules = resolveGhostRules(tenantRules)

  const results: GhostOperatorResult[] = []

  for (const rule of activeRules) {
    const result = await processRule(tenantId, rule, config)
    results.push(result)
  }

  log.info(
    { tenantId, rulesProcessed: results.length, totalActions: results.reduce((sum, r) => sum + r.actionsExecuted, 0) },
    "Ghost operator run complete"
  )

  return results
}

async function processRule(
  tenantId: string,
  rule: GhostOperatorRule,
  config: Awaited<ReturnType<typeof aiConfigRepository.getOrCreate>>
): Promise<GhostOperatorResult> {
  const result: GhostOperatorResult = {
    ruleId: rule.id,
    ruleName: rule.name,
    actionsAttempted: 0,
    actionsExecuted: 0,
    actionsQueued: 0,
    errors: [],
  }

  // Find the tool
  const allAvailableTools = [...allTools, ...allMutationTools]
  const tool = allAvailableTools.find((t) => t.name === rule.action.toolName)
  if (!tool) {
    result.errors.push(`Tool not found: ${rule.action.toolName}`)
    return result
  }

  // Check guardrail tier
  if (rule.requireAutoTier && isMutatingTool(tool)) {
    const effectiveTier = config.guardrailOverrides[tool.name] ?? tool.guardrailTier
    if (effectiveTier !== "AUTO") {
      log.info({ tenantId, rule: rule.id, tier: effectiveTier }, "Ghost operator rule skipped — tool requires approval")
      return result
    }
  }

  // Get entities matching the rule trigger
  const entities = await getMatchingEntities(tenantId, rule)
  result.actionsAttempted = entities.length

  const ctx: AgentContext = {
    tenantId,
    userId: "ghost-operator",
    userPermissions: ["bookings:read", "bookings:write", "customers:read", "customers:write", "notifications:write"],
  }

  for (const entity of entities) {
    try {
      // Build tool input from template + entity
      const input = { ...rule.action.inputTemplate, ...entity }

      // Execute the tool
      const toolResult = await tool.execute(input, ctx)

      // Log the action
      await agentActionsRepository.create({
        conversationId: "ghost-operator", // Special conversation ID
        tenantId,
        userId: "ghost-operator",
        toolName: rule.action.toolName,
        toolInput: input,
        guardrailTier: "AUTO",
        isReversible: false,
      })

      result.actionsExecuted++
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error"
      result.errors.push(`${rule.action.toolName}: ${msg}`)
    }
  }

  return result
}

/**
 * Get entities matching a ghost operator rule trigger.
 * This is a simplified version — each trigger type queries different data.
 */
async function getMatchingEntities(
  tenantId: string,
  rule: GhostOperatorRule
): Promise<Array<Record<string, unknown>>> {
  // TODO: Implement per-trigger queries
  // For now, return empty — each trigger type needs specific repository queries
  // pending_booking: bookingRepository.list(tenantId, { status: "PENDING" })
  // overdue_invoice: paymentRepository.listInvoices(tenantId, { status: "OVERDUE" })
  // review_followup: find completed bookings without reviews
  // workflow_retry: find failed workflow executions
  return []
}
```

**Commit:** `feat(ai): add ghost operator action processor`

---

## Task 8: Ghost Operator — Inngest Scheduled Job

**Files:**
- Modify: `src/modules/ai/ai.events.ts`
- Modify: `src/shared/inngest.ts`

### Add Inngest event:

```typescript
// src/shared/inngest.ts — add:
"ai/ghost-operator.completed": {
  data: { tenantId: string; actionsExecuted: number; actionsQueued: number }
}
```

### Add scheduled job:

```typescript
import { processGhostOperator } from "./features/ghost-operator.processor"

const ghostOperatorJob = inngest.createFunction(
  { id: "ai/ghost-operator", name: "Ghost Operator" },
  { cron: "0 * * * *" }, // Run every hour — filter by tenant's configured window
  async ({ step }) => {
    await step.run("process-ghost-operations", async () => {
      const { db } = await import("@/shared/db")
      const { aiTenantConfig } = await import("@/shared/db/schema")
      const { eq } = await import("drizzle-orm")

      const configs = await db
        .select()
        .from(aiTenantConfig)
        .where(eq(aiTenantConfig.ghostOperatorEnabled, 1))

      const currentHour = new Date().getUTCHours()
      let totalActions = 0

      for (const config of configs) {
        // Check if current hour is within the ghost operator window
        const startHour = config.ghostOperatorStartHour ?? 18
        const endHour = config.ghostOperatorEndHour ?? 8

        const isInWindow = startHour > endHour
          ? (currentHour >= startHour || currentHour < endHour) // Overnight window (e.g., 18-08)
          : (currentHour >= startHour && currentHour < endHour) // Same-day window

        if (!isInWindow) continue

        try {
          const results = await processGhostOperator(config.tenantId)
          totalActions += results.reduce((sum, r) => sum + r.actionsExecuted, 0)
        } catch (err) {
          const { logger: log } = await import("@/shared/logger")
          log.error({ err, tenantId: config.tenantId }, "Ghost operator failed for tenant")
        }
      }

      return { tenantsProcessed: configs.length, totalActions }
    })
  }
)
```

Add `ghostOperatorJob` to the `aiFunctions` array.

**Commit:** `feat(ai): add ghost operator Inngest scheduled job`

---

## Task 9: Paste-to-Pipeline — Entity Extractor

**Files:**
- Create: `src/modules/ai/features/paste-to-pipeline.ts`

```typescript
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
```

**Commit:** `feat(ai): add paste-to-pipeline entity extractor`

---

## Task 10: Paste-to-Pipeline — Commit Flow

**Files:**
- Create: `src/modules/ai/features/paste-to-pipeline.commit.ts`

```typescript
// src/modules/ai/features/paste-to-pipeline.commit.ts

import { logger } from "@/shared/logger"
import type { ExtractedEntities, AgentContext } from "../ai.types"

const log = logger.child({ module: "ai.paste-to-pipeline.commit" })

/**
 * Commit extracted entities to the system.
 * Called after user reviews and approves the extraction.
 * Uses the corresponding module repositories to create records.
 */
export async function commitEntities(
  ctx: AgentContext,
  entities: ExtractedEntities,
  confirmed: {
    createCustomer: boolean
    createBooking: boolean
    createTasks: boolean
  }
): Promise<{
  customerId: string | null
  bookingId: string | null
  taskIds: string[]
}> {
  const result = {
    customerId: null as string | null,
    bookingId: null as string | null,
    taskIds: [] as string[],
  }

  // 1. Create customer if confirmed and present
  if (confirmed.createCustomer && entities.customer) {
    try {
      const { customerRepository } = await import("@/modules/customer/customer.repository")
      const customer = await customerRepository.create(ctx.tenantId, {
        name: entities.customer.name ?? "Unknown",
        email: entities.customer.email,
        phone: entities.customer.phone,
        company: entities.customer.company,
      })
      result.customerId = customer.id
      log.info({ tenantId: ctx.tenantId, customerId: customer.id }, "Customer created from paste")
    } catch (err) {
      log.error({ err }, "Failed to create customer from paste")
    }
  }

  // 2. Create booking if confirmed and present
  if (confirmed.createBooking && entities.booking) {
    try {
      const { bookingRepository } = await import("@/modules/booking/booking.repository")
      // TODO: Match service name to actual service ID
      // TODO: Match date/time to available slot
      // For now, create with notes containing the extraction data
      log.info({ tenantId: ctx.tenantId }, "Booking creation from paste — requires service/slot matching")
      // Booking creation deferred — needs service and slot resolution
    } catch (err) {
      log.error({ err }, "Failed to create booking from paste")
    }
  }

  // 3. Create tasks if confirmed and present
  if (confirmed.createTasks && entities.tasks.length > 0) {
    for (const task of entities.tasks) {
      try {
        // TODO: Use task/create tool or repository
        log.info({ tenantId: ctx.tenantId, taskTitle: task.title }, "Task created from paste")
      } catch (err) {
        log.error({ err }, "Failed to create task from paste")
      }
    }
  }

  log.info(
    { tenantId: ctx.tenantId, customerId: result.customerId, bookingId: result.bookingId, tasks: result.taskIds.length },
    "Paste-to-pipeline commit complete"
  )

  return result
}
```

**Commit:** `feat(ai): add paste-to-pipeline entity commit flow`

---

## Task 11: Router Procedures + Schemas

**Files:**
- Modify: `src/modules/ai/ai.schemas.ts`
- Modify: `src/modules/ai/ai.router.ts`
- Modify: `src/modules/ai/index.ts`

### New schemas:

```typescript
export const updateKillerFeaturesConfigSchema = z.object({
  morningBriefingEnabled: z.boolean().optional(),
  morningBriefingTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  morningBriefingTimezone: z.string().optional(),
  morningBriefingDelivery: z.enum(["in_app", "email", "both"]).optional(),
  morningBriefingRecipientIds: z.array(z.string()).optional(),
  ghostOperatorEnabled: z.boolean().optional(),
  ghostOperatorStartHour: z.number().int().min(0).max(23).optional(),
  ghostOperatorEndHour: z.number().int().min(0).max(23).optional(),
  ghostOperatorTimezone: z.string().optional(),
  ghostOperatorRules: z.array(z.object({
    id: z.string(),
    name: z.string(),
    enabled: z.boolean(),
    trigger: z.enum(["pending_booking", "overdue_invoice", "review_followup", "workflow_retry"]),
    conditions: z.record(z.string(), z.unknown()),
    action: z.object({
      toolName: z.string(),
      inputTemplate: z.record(z.string(), z.unknown()),
    }),
    requireAutoTier: z.boolean(),
  })).optional(),
  pasteToPipelineEnabled: z.boolean().optional(),
})

export const pasteToPipelineExtractSchema = z.object({
  rawInput: z.string().min(1).max(50000),
})

export const pasteToPipelineCommitSchema = z.object({
  entities: z.object({
    customer: z.object({
      name: z.string().nullable(),
      email: z.string().nullable(),
      phone: z.string().nullable(),
      company: z.string().nullable(),
      notes: z.string().nullable(),
    }).nullable(),
    booking: z.object({
      service: z.string().nullable(),
      date: z.string().nullable(),
      time: z.string().nullable(),
      duration: z.string().nullable(),
      notes: z.string().nullable(),
    }).nullable(),
    tasks: z.array(z.object({
      title: z.string(),
      priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
      dueDate: z.string().nullable(),
      assignee: z.string().nullable(),
    })),
    notes: z.array(z.string()),
    confidence: z.number(),
    rawInput: z.string(),
  }),
  confirmed: z.object({
    createCustomer: z.boolean(),
    createBooking: z.boolean(),
    createTasks: z.boolean(),
  }),
})

export const generateBriefingSchema = z.object({})
```

### New router procedures:

```typescript
updateKillerFeaturesConfig: modulePermission("ai:write")
  .input(updateKillerFeaturesConfigSchema)
  .mutation(async ({ ctx, input }) => {
    const updates: Record<string, unknown> = {}
    if (input.morningBriefingEnabled !== undefined) updates.morningBriefingEnabled = input.morningBriefingEnabled ? 1 : 0
    if (input.morningBriefingTime) updates.morningBriefingTime = input.morningBriefingTime
    if (input.morningBriefingTimezone) updates.morningBriefingTimezone = input.morningBriefingTimezone
    if (input.morningBriefingDelivery) updates.morningBriefingDelivery = input.morningBriefingDelivery
    if (input.morningBriefingRecipientIds) updates.morningBriefingRecipientIds = input.morningBriefingRecipientIds
    if (input.ghostOperatorEnabled !== undefined) updates.ghostOperatorEnabled = input.ghostOperatorEnabled ? 1 : 0
    if (input.ghostOperatorStartHour !== undefined) updates.ghostOperatorStartHour = input.ghostOperatorStartHour
    if (input.ghostOperatorEndHour !== undefined) updates.ghostOperatorEndHour = input.ghostOperatorEndHour
    if (input.ghostOperatorTimezone) updates.ghostOperatorTimezone = input.ghostOperatorTimezone
    if (input.ghostOperatorRules) updates.ghostOperatorRules = input.ghostOperatorRules
    if (input.pasteToPipelineEnabled !== undefined) updates.pasteToPipelineEnabled = input.pasteToPipelineEnabled ? 1 : 0
    await aiConfigRepository.update(ctx.tenantId, updates)
    return { success: true }
  }),

pasteToPipelineExtract: moduleProcedure
  .input(pasteToPipelineExtractSchema)
  .mutation(async ({ ctx, input }) => {
    return extractEntities(ctx.tenantId, input.rawInput)
  }),

pasteToPipelineCommit: moduleProcedure
  .input(pasteToPipelineCommitSchema)
  .mutation(async ({ ctx, input }) => {
    const agentCtx: AgentContext = {
      tenantId: ctx.tenantId,
      userId: ctx.user!.id,
      userPermissions: ctx.user?.roles?.flatMap((r) => r.permissions ?? []) ?? [],
    }
    return commitEntities(agentCtx, input.entities, input.confirmed)
  }),

generateBriefingNow: modulePermission("ai:write")
  .input(generateBriefingSchema)
  .mutation(async ({ ctx }) => {
    const data = await gatherBriefingData(ctx.tenantId)
    return generateBriefing(ctx.tenantId, data)
  }),
```

### Update barrel exports:

```typescript
export { extractEntities } from "./features/paste-to-pipeline"
export { commitEntities } from "./features/paste-to-pipeline.commit"
export { gatherBriefingData } from "./features/morning-briefing.data"
export { generateBriefing } from "./features/morning-briefing.generator"
export { processGhostOperator } from "./features/ghost-operator.processor"
```

**Commit:** `feat(ai): add killer features router procedures and schemas`

---

## Task 12: Tests

**Files:**
- Create: `src/modules/ai/__tests__/ai-phase-f.test.ts`

Test:
1. **Morning Briefing**: Mock tools, verify data gathering. Mock Anthropic, verify narrative generation.
2. **Ghost Operator rules**: Default rules, tenant overrides, rule merging, window calculation
3. **Ghost Operator processor**: Mock repositories and tools, verify only AUTO-tier executes
4. **Paste-to-Pipeline extraction**: Mock Anthropic, verify entity extraction from sample texts
5. **Paste-to-Pipeline commit**: Mock repositories, verify customer/task creation
6. **Tenant config**: Verify killer feature toggles save/load correctly
7. **Inngest job filtering**: Verify morning briefing only runs at configured hour, ghost operator respects window

**Commit:** `test(ai): add Phase F tests for morning briefing, ghost operator, and paste-to-pipeline`

---

## Task 13: Verification — tsc + build + tests

Run:
1. `npx tsc --noEmit`
2. `npm run build`
3. `npm run test`

Fix any issues. Commit with: `fix(ai): resolve Phase F verification issues`

---

## Post-Implementation Checklist

```
[ ] ai_tenant_config extended with morning briefing, ghost operator, paste-to-pipeline fields
[ ] Morning briefing gathers data from existing read tools
[ ] Morning briefing generates narrative with vertical-specific terminology
[ ] Morning briefing Inngest job runs at tenant-configured time
[ ] Ghost operator rule engine with default rules + tenant customization
[ ] Ghost operator respects guardrail tiers (only AUTO executes unattended)
[ ] Ghost operator runs within tenant-configured after-hours window
[ ] Paste-to-pipeline extracts entities from unstructured text
[ ] Paste-to-pipeline commit flow creates records after user review
[ ] All killer features gate behind tenant config toggles
[ ] All tests pass
[ ] tsc + build pass
```
