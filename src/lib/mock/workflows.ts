/**
 * Mock data layer for workflows. Single source of truth.
 *
 * Mirrors what tRPC will return — when wiring real backend, swap
 * `mockWorkflows.list(q)` for `api.workflow.list.useQuery(q)`.
 *
 * Required DB fields (per the Phase 5 workflow engine):
 *   workflows: id, tenantId, name, description, status, trigger (jsonb),
 *              isVisual, nodes (jsonb), edges (jsonb), tags (text[]),
 *              ownerId, lastModifiedAt, createdAt, retryPolicy, timeoutMs,
 *              concurrency, errorHandler
 *   workflowActions: workflowId, order, type, config (jsonb)   (linear mode)
 *   workflowExecutions: id, workflowId, status, startedAt, endedAt,
 *                       triggerData (jsonb), stepResults (jsonb),
 *                       failureReason, triggeredBy
 *
 * Dual-mode rendering:
 *   - isVisual=false → render numbered linear step list from `nodes` ordered by index
 *   - isVisual=true  → render SVG graph from `nodes` + `edges`
 */

/* ── Types ───────────────────────────────────────────────────────────────── */

export type WorkflowStatus = "ENABLED" | "DISABLED" | "DRAFT"

export type TriggerType =
  | "form_submitted"
  | "booking_created"
  | "payment_received"
  | "manual"
  | "schedule"
  | "webhook"
  | "event"

export interface WorkflowTrigger {
  type: TriggerType
  label: string
  configSummary: string
}

/* discriminated node union — keep flat fields so SVG layout is trivial */
export type WorkflowNodeType =
  | "TRIGGER"
  | "ACTION"
  | "IF"
  | "SWITCH"
  | "WAIT"
  | "LOOP"
  | "MERGE"
  | "SUB_WORKFLOW"
  | "STOP"
  | "ERROR"
  | "SET_VARIABLE"

export type ActionKind =
  | "send_email"
  | "send_sms"
  | "create_invoice"
  | "create_booking"
  | "update_field"
  | "call_webhook"
  | "ai_draft"
  | "create_task"

export interface WorkflowNodeBase {
  id: string
  type: WorkflowNodeType
  label: string
  summary: string  /* short config preview */
  /* deterministic layout — column = depth, row = sibling index in rank */
  col: number
  row: number
}

export interface TriggerNode extends WorkflowNodeBase { type: "TRIGGER"; triggerType: TriggerType }
export interface ActionNode extends WorkflowNodeBase { type: "ACTION"; actionKind: ActionKind }
export interface IfNode extends WorkflowNodeBase { type: "IF"; condition: string }
export interface SwitchNode extends WorkflowNodeBase { type: "SWITCH"; cases: string[] }
export interface WaitNode extends WorkflowNodeBase { type: "WAIT"; waitFor: string }
export interface LoopNode extends WorkflowNodeBase { type: "LOOP"; over: string; mode: "sequential" | "parallel" }
export interface MergeNode extends WorkflowNodeBase { type: "MERGE"; mode: "wait_all" | "wait_any" | "append" }
export interface SubWorkflowNode extends WorkflowNodeBase { type: "SUB_WORKFLOW"; targetWorkflowId: string; runMode: "sync" | "fire_and_forget" }
export interface StopNode extends WorkflowNodeBase { type: "STOP" }
export interface ErrorNode extends WorkflowNodeBase { type: "ERROR"; reason: string }
export interface SetVariableNode extends WorkflowNodeBase { type: "SET_VARIABLE"; varName: string; expression: string }

export type WorkflowNode =
  | TriggerNode | ActionNode | IfNode | SwitchNode | WaitNode
  | LoopNode | MergeNode | SubWorkflowNode | StopNode | ErrorNode | SetVariableNode

export interface WorkflowEdge {
  from: string
  to: string
  handle?: "true" | "false" | "default" | string  /* e.g. case_N */
  label?: string
}

export interface WorkflowStats {
  runsLast30d: number
  successRate: number          /* 0–100 */
  avgDurationMs: number
  lastRunAt: string | null     /* pre-formatted */
  lastRunStatus: ExecutionStatus | null
  /* 30-day daily counts — index 0 = oldest, 29 = today */
  daily: Array<{ runs: number; failures: number }>
}

export type ExecutionStatus = "queued" | "running" | "paused" | "failed" | "completed"

export interface StepResult {
  nodeId: string
  nodeLabel: string
  nodeType: WorkflowNodeType
  status: "ok" | "fail" | "skipped" | "running"
  durationMs: number
  outputPreview: string
  error: string | null
}

export interface Execution {
  id: string
  workflowId: string
  workflowName: string
  status: ExecutionStatus
  startedAt: string            /* pre-formatted: "Today 10:14" */
  endedAt: string | null
  durationMs: number
  trigger: { summary: string; payloadPreview: string }
  stepsTotal: number
  stepsCompleted: number
  failureReason: string | null
  triggeredBy: { name: string; type: "user" | "system" | "webhook" | "schedule" }
  outputPreview: string
  steps: StepResult[]
}

export interface WorkflowSettings {
  retryPolicy: "none" | "linear" | "exponential"
  retryMax: number
  timeoutMs: number
  concurrency: number
  errorHandler: "halt" | "continue" | "branch_to_error"
}

export interface Workflow {
  id: string
  name: string
  description: string
  status: WorkflowStatus
  trigger: WorkflowTrigger
  isVisual: boolean
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  stats: WorkflowStats
  tags: string[]
  owner: { id: string; initials: string; name: string }
  lastModifiedAt: string
  createdAt: string
  settings: WorkflowSettings
  recentExecutions: Execution[]
  usesWorkflowIds: string[]
  usedByWorkflowIds: string[]
}

export interface WorkflowFilters {
  status?: WorkflowStatus[]
  trigger?: TriggerType[]
  tag?: string[]
  owner?: string[]
  failing?: boolean
}

export type WorkflowSortBy = "lastRun" | "runsLast30d" | "successRate" | "name" | "lastModifiedAt"
export type WorkflowSortDir = "asc" | "desc"

export interface WorkflowQuery {
  segment?: string
  search?: string
  filters?: WorkflowFilters
  sortBy?: WorkflowSortBy
  sortDir?: WorkflowSortDir
}

export interface WorkflowStatsSummary {
  enabled: number
  runsToday: number
  successRate7d: number
  failuresToday: number
  avgDurationMs: number
}

export interface SegmentDef {
  group: string
  items?: Array<{ id: string; label: string; count: number; icon?: string; pinned?: boolean; dot?: "ok" | "warn" | "danger" }>
  tags?: string[]
}

/* ── Trigger metadata ────────────────────────────────────────────────────── */

export const TRIGGER_META: Record<TriggerType, { label: string; icon: string; tone: "info" | "ok" | "warn" | "accent" | "muted" }> = {
  form_submitted:    { label: "Form submitted",     icon: "file",     tone: "info"   },
  booking_created:   { label: "Booking created",    icon: "calendar", tone: "ok"     },
  payment_received:  { label: "Payment received",   icon: "money",    tone: "ok"     },
  manual:            { label: "Manual",             icon: "play",     tone: "muted"  },
  schedule:          { label: "Schedule",           icon: "clock",    tone: "warn"   },
  webhook:           { label: "Webhook",            icon: "link",     tone: "info"   },
  event:             { label: "Event match",        icon: "bolt",     tone: "accent" },
}

export const STATUS_META: Record<WorkflowStatus, { label: string; tone: "ok" | "muted" | "info" }> = {
  ENABLED:  { label: "Enabled",  tone: "ok"    },
  DISABLED: { label: "Disabled", tone: "muted" },
  DRAFT:    { label: "Draft",    tone: "info"  },
}

export const NODE_ICON: Record<WorkflowNodeType, string> = {
  TRIGGER:      "bolt",
  ACTION:       "sparkles",
  IF:           "filter",
  SWITCH:       "filter",
  WAIT:         "clock",
  LOOP:         "refresh",
  MERGE:        "link",
  SUB_WORKFLOW: "workflow",
  STOP:         "x",
  ERROR:        "flag",
  SET_VARIABLE: "code",
}

export const ACTION_ICON: Record<ActionKind, string> = {
  send_email:      "mail",
  send_sms:        "chat",
  create_invoice:  "invoice",
  create_booking:  "calendar",
  update_field:    "code",
  call_webhook:    "link",
  ai_draft:        "sparkles",
  create_task:     "check",
}

/* ── Frozen "now" — labels precomputed at module load (no Date.now in render) */

const NOW_MS = Date.UTC(2026, 4, 12, 10, 14)   /* May 12 2026 10:14 UTC */
const MIN  = 60_000
const HOUR = 60 * MIN
const DAY  = 24 * HOUR

function ago(ms: number): string {
  const d = NOW_MS - ms
  if (d < MIN)        return `${Math.max(1, Math.floor(d / 1000))}s ago`
  if (d < HOUR)       return `${Math.floor(d / MIN)}m ago`
  if (d < DAY)        return `${Math.floor(d / HOUR)}h ago`
  if (d < 7 * DAY)    return `${Math.floor(d / DAY)}d ago`
  return `${Math.floor(d / (7 * DAY))}w ago`
}

function fmtTime(ms: number): string {
  const d = new Date(ms)
  const sameDay = Math.floor(d.getTime() / DAY) === Math.floor(NOW_MS / DAY)
  const yest    = Math.floor(d.getTime() / DAY) === Math.floor(NOW_MS / DAY) - 1
  const hh = d.getUTCHours().toString().padStart(2, "0")
  const mm = d.getUTCMinutes().toString().padStart(2, "0")
  if (sameDay) return `Today ${hh}:${mm}`
  if (yest)    return `Yesterday ${hh}:${mm}`
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  return `${months[d.getUTCMonth()]} ${d.getUTCDate()} ${hh}:${mm}`
}

/* ── Helpers for building nodes ──────────────────────────────────────────── */

function trig(id: string, label: string, summary: string, triggerType: TriggerType, col = 0, row = 0): TriggerNode {
  return { id, type: "TRIGGER", label, summary, col, row, triggerType }
}
function act(id: string, label: string, summary: string, kind: ActionKind, col: number, row: number): ActionNode {
  return { id, type: "ACTION", label, summary, col, row, actionKind: kind }
}
function ifn(id: string, label: string, condition: string, col: number, row: number): IfNode {
  return { id, type: "IF", label, summary: condition, col, row, condition }
}
function wait(id: string, label: string, waitFor: string, col: number, row: number): WaitNode {
  return { id, type: "WAIT", label, summary: waitFor, col, row, waitFor }
}
function stop(id: string, col: number, row: number, label = "End"): StopNode {
  return { id, type: "STOP", label, summary: "halt", col, row }
}

/* ── Daily sparkline generator (deterministic) ───────────────────────────── */

function dailyFor(seed: number, baseRuns: number, baseFails: number): WorkflowStats["daily"] {
  /* deterministic pseudo-random via mulberry32 */
  let s = seed >>> 0
  const rnd = () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296 }
  const out: WorkflowStats["daily"] = []
  for (let i = 0; i < 30; i++) {
    const runs = Math.max(0, Math.floor(baseRuns * (0.5 + rnd())))
    const fails = Math.min(runs, Math.floor(baseFails * rnd() + (rnd() > 0.85 ? 1 : 0)))
    out.push({ runs, failures: fails })
  }
  return out
}

/* ── Sample executions builder ───────────────────────────────────────────── */

function buildExecutions(workflowId: string, workflowName: string, nodes: WorkflowNode[], scenarios: Array<{
  status: ExecutionStatus
  agoMs: number
  duration: number
  trigger: string
  payload: string
  triggeredBy: Execution["triggeredBy"]
  failureReason?: string
  failedAt?: string  /* node id */
  output: string
}>): Execution[] {
  return scenarios.map((sc, i) => {
    const startedMs = NOW_MS - sc.agoMs
    const failIdx = sc.failedAt ? nodes.findIndex(n => n.id === sc.failedAt) : -1
    const steps: StepResult[] = nodes.map((n, idx) => {
      const isFail = failIdx >= 0 && idx === failIdx
      const isSkipped = failIdx >= 0 && idx > failIdx
      const stepStatus: StepResult["status"] = isFail ? "fail" : isSkipped ? "skipped" : sc.status === "running" && idx === nodes.length - 1 ? "running" : "ok"
      const dur = isSkipped ? 0 : Math.floor(sc.duration / nodes.length * (0.6 + (idx % 3) * 0.2))
      return {
        nodeId: n.id,
        nodeLabel: n.label,
        nodeType: n.type,
        status: stepStatus,
        durationMs: dur,
        outputPreview: stepStatus === "fail" ? sc.failureReason ?? "step failed"
          : stepStatus === "skipped" ? "skipped: upstream failure"
          : `${n.label} → ok`,
        error: stepStatus === "fail" ? sc.failureReason ?? "step failed" : null,
      }
    })
    return {
      id: `run_${workflowId}_${(i + 1).toString().padStart(3, "0")}`,
      workflowId,
      workflowName,
      status: sc.status,
      startedAt: fmtTime(startedMs),
      endedAt: sc.status === "running" || sc.status === "queued" ? null : fmtTime(startedMs + sc.duration),
      durationMs: sc.duration,
      trigger: { summary: sc.trigger, payloadPreview: sc.payload },
      stepsTotal: nodes.length,
      stepsCompleted: steps.filter(s => s.status === "ok").length,
      failureReason: sc.failureReason ?? null,
      triggeredBy: sc.triggeredBy,
      outputPreview: sc.output,
      steps,
    }
  })
}

/* ── Workflow dataset ────────────────────────────────────────────────────── */

const WORKFLOWS: Workflow[] = (() => {
  /* — 1. Send invoice on payment — */
  const wf1Nodes: WorkflowNode[] = [
    trig("n1", "Payment received", "Stripe webhook · invoices.paid", "payment_received", 0, 0),
    act("n2", "Find related invoice", "lookup by payment.metadata.invoiceId", "update_field", 1, 0),
    ifn("n3", "Invoice exists?", "invoice != null", 2, 0),
    act("n4", "Mark invoice paid", "invoices.status = PAID", "update_field", 3, 0),
    act("n5", "Send receipt email", "template: receipt-v2", "send_email", 4, 0),
    act("n6", "Notify owner", "channel: ops-team", "send_sms", 5, 0),
    stop("n7", 6, 0),
  ]
  const wf1Edges: WorkflowEdge[] = [
    { from: "n1", to: "n2" },
    { from: "n2", to: "n3" },
    { from: "n3", to: "n4", handle: "true",  label: "yes" },
    { from: "n3", to: "n7", handle: "false", label: "no" },
    { from: "n4", to: "n5" },
    { from: "n5", to: "n6" },
    { from: "n6", to: "n7" },
  ]

  /* — 2. Welcome new client — */
  const wf2Nodes: WorkflowNode[] = [
    trig("w1", "Booking created", "first booking of customer", "booking_created", 0, 0),
    act("w2", "Send welcome email", "template: welcome-v3", "send_email", 1, 0),
    wait("w3", "Wait 24 hours", "delay: 24h", 2, 0),
    ifn("w4", "Plan tier?", "client.plan == 'pro'", 3, 0),
    act("w5", "Draft onboarding", "claude · tone:warm", "ai_draft", 4, 0),
    act("w6", "Send basic guide", "template: lite-welcome", "send_email", 4, 1),
    stop("w7", 5, 0),
  ]
  const wf2Edges: WorkflowEdge[] = [
    { from: "w1", to: "w2" },
    { from: "w2", to: "w3" },
    { from: "w3", to: "w4" },
    { from: "w4", to: "w5", handle: "true", label: "pro" },
    { from: "w4", to: "w6", handle: "false", label: "lite" },
    { from: "w5", to: "w7" },
    { from: "w6", to: "w7" },
  ]

  /* — 3. Chase overdue invoices (linear, scheduled) — */
  const wf3Nodes: WorkflowNode[] = [
    trig("c1", "Daily 9am",         "cron: 0 9 * * *",                     "schedule", 0, 0),
    act("c2", "Find overdue",       "invoices where dueDate < today",       "update_field", 1, 0),
    act("c3", "Send reminder #1",   "if daysLate <= 7",                     "send_email", 2, 0),
    act("c4", "Send reminder #2",   "if daysLate > 7 && <= 14",             "send_email", 3, 0),
    act("c5", "Flag account",       "if daysLate > 14",                     "update_field", 4, 0),
  ]
  const wf3Edges: WorkflowEdge[] = [
    { from: "c1", to: "c2" }, { from: "c2", to: "c3" }, { from: "c3", to: "c4" }, { from: "c4", to: "c5" },
  ]

  /* — 4. Sprint review reminder — */
  const wf4Nodes: WorkflowNode[] = [
    trig("s1", "Monday 8am",      "cron: 0 8 * * 1",         "schedule", 0, 0),
    act("s2", "Find active",      "engagements.status=ACTIVE", "update_field", 1, 0),
    act("s3", "Email owners",     "template: sprint-review", "send_email", 2, 0),
  ]
  const wf4Edges: WorkflowEdge[] = [{ from: "s1", to: "s2" }, { from: "s2", to: "s3" }]

  /* — 5. Discovery form → pipeline — */
  const wf5Nodes: WorkflowNode[] = [
    trig("d1", "Form submitted",      "form: discovery-v2", "form_submitted", 0, 0),
    act("d2", "Create customer",      "customers.insert",   "update_field",   1, 0),
    act("d3", "Create deal",          "stage: DISCOVERY",   "update_field",   2, 0),
    act("d4", "Assign owner",         "owner: round-robin", "update_field",   3, 0),
    act("d5", "Send Slack alert",     "channel: #leads",    "send_sms",       4, 0),
    act("d6", "Draft outreach",       "claude · style:warm", "ai_draft",      5, 0),
  ]
  const wf5Edges: WorkflowEdge[] = [
    { from: "d1", to: "d2" }, { from: "d2", to: "d3" }, { from: "d3", to: "d4" },
    { from: "d4", to: "d5" }, { from: "d5", to: "d6" },
  ]

  /* — 6. Monthly digest — */
  const wf6Nodes: WorkflowNode[] = [
    trig("m1", "1st of month",   "cron: 0 9 1 * *",       "schedule", 0, 0),
    act("m2", "Build summary",   "ai · last 30 days",     "ai_draft", 1, 0),
    act("m3", "Send to clients", "template: monthly",     "send_email", 2, 0),
  ]
  const wf6Edges: WorkflowEdge[] = [{ from: "m1", to: "m2" }, { from: "m2", to: "m3" }]

  /* — 7. Audit completion → report draft — */
  const wf7Nodes: WorkflowNode[] = [
    trig("a1", "Audit completed", "event: audit/completed", "event", 0, 0),
    act("a2", "Generate report",  "claude · 5-lens template", "ai_draft", 1, 0),
    act("a3", "Create draft doc", "drive · synced", "create_task", 2, 0),
    act("a4", "Notify owner",     "to: owner.email", "send_email", 3, 0),
  ]
  const wf7Edges: WorkflowEdge[] = [
    { from: "a1", to: "a2" }, { from: "a2", to: "a3" }, { from: "a3", to: "a4" },
  ]

  /* — 8. Booking confirmation thread — */
  const wf8Nodes: WorkflowNode[] = [
    trig("b1", "Booking created",   "channel: web",        "booking_created", 0, 0),
    act("b2", "Send confirmation",  "template: booking-v1", "send_email", 1, 0),
    wait("b3", "Wait until -24h",   "until: booking.startsAt - 24h", 2, 0),
    act("b4", "Send reminder",      "template: reminder-v1", "send_email", 3, 0),
    wait("b5", "Wait until -1h",    "until: booking.startsAt - 1h", 4, 0),
    act("b6", "Send SMS nudge",     "to: customer.phone",  "send_sms", 5, 0),
  ]
  const wf8Edges: WorkflowEdge[] = [
    { from: "b1", to: "b2" }, { from: "b2", to: "b3" }, { from: "b3", to: "b4" },
    { from: "b4", to: "b5" }, { from: "b5", to: "b6" },
  ]

  /* — 9. Failed payment recovery (FAILING) — */
  const wf9Nodes: WorkflowNode[] = [
    trig("p1", "Payment failed", "event: payment/failed", "event", 0, 0),
    act("p2", "Notify customer", "template: payment-failed", "send_email", 1, 0),
    wait("p3", "Wait 48h",       "delay: 48h",            2, 0),
    ifn("p4", "Retried?",       "payment.retried == true", 3, 0),
    act("p5", "Pause engagement", "engagements.status=PAUSED", "update_field", 4, 0),
    stop("p6", 4, 1),
  ]
  const wf9Edges: WorkflowEdge[] = [
    { from: "p1", to: "p2" }, { from: "p2", to: "p3" }, { from: "p3", to: "p4" },
    { from: "p4", to: "p6", handle: "true" },
    { from: "p4", to: "p5", handle: "false" },
  ]

  /* — 10. Lead enrichment — */
  const wf10Nodes: WorkflowNode[] = [
    trig("l1", "New customer",      "customers.created",    "event", 0, 0),
    act("l2", "Call enrichment API", "clearbit · webhook",  "call_webhook", 1, 0),
    act("l3", "Update customer",    "merge response",        "update_field", 2, 0),
    act("l4", "Tag by industry",    "tags += industry",      "update_field", 3, 0),
  ]
  const wf10Edges: WorkflowEdge[] = [
    { from: "l1", to: "l2" }, { from: "l2", to: "l3" }, { from: "l3", to: "l4" },
  ]

  /* — 11. Quote follow-up (DRAFT) — */
  const wf11Nodes: WorkflowNode[] = [
    trig("q1", "Manual",            "manual run from /pipeline", "manual", 0, 0),
    wait("q2", "Wait 3 days",       "delay: 3d",                 1, 0),
    act("q3", "Send nudge email",   "template: quote-followup",  "send_email", 2, 0),
  ]
  const wf11Edges: WorkflowEdge[] = [{ from: "q1", to: "q2" }, { from: "q2", to: "q3" }]

  /* — 12. Form-to-Slack webhook (DISABLED) — */
  const wf12Nodes: WorkflowNode[] = [
    trig("h1", "Webhook hit",      "POST /hooks/forms-slack", "webhook", 0, 0),
    act("h2", "Post to Slack",     "channel: #intake",        "call_webhook", 1, 0),
  ]
  const wf12Edges: WorkflowEdge[] = [{ from: "h1", to: "h2" }]

  const owner = { id: "u-lh", initials: "LH", name: "Luke Hodges" }

  const list: Workflow[] = [
    {
      id: "wf-invoice-on-payment",
      name: "Send invoice on payment",
      description: "When Stripe reports a payment, mark the matching invoice paid and email the receipt.",
      status: "ENABLED",
      trigger: { type: "payment_received", label: "Payment received", configSummary: "stripe.payment.succeeded" },
      isVisual: true,
      nodes: wf1Nodes, edges: wf1Edges,
      stats: { runsLast30d: 312, successRate: 99, avgDurationMs: 412, lastRunAt: ago(NOW_MS - 14 * MIN), lastRunStatus: "completed", daily: dailyFor(1, 11, 0) },
      tags: ["billing", "stripe"],
      owner,
      lastModifiedAt: "Apr 22 2026",
      createdAt: "Aug 10 2025",
      settings: { retryPolicy: "exponential", retryMax: 3, timeoutMs: 30000, concurrency: 10, errorHandler: "branch_to_error" },
      recentExecutions: buildExecutions("wf-invoice-on-payment", "Send invoice on payment", wf1Nodes, [
        { status: "completed", agoMs: 14 * MIN, duration: 412, trigger: "stripe.payment.succeeded", payload: "{ paymentId: 'pi_3OQx2', amount: 6125, invoiceId: 'inv-204' }", triggeredBy: { name: "Stripe webhook", type: "webhook" }, output: "invoice marked PAID · receipt sent" },
        { status: "completed", agoMs: 2 * HOUR, duration: 389, trigger: "stripe.payment.succeeded", payload: "{ paymentId: 'pi_3OQw1', amount: 2400, invoiceId: 'inv-198' }", triggeredBy: { name: "Stripe webhook", type: "webhook" }, output: "invoice marked PAID · receipt sent" },
        { status: "completed", agoMs: 5 * HOUR, duration: 442, trigger: "stripe.payment.succeeded", payload: "{ paymentId: 'pi_3OQv0', amount: 1800, invoiceId: 'inv-194' }", triggeredBy: { name: "Stripe webhook", type: "webhook" }, output: "invoice marked PAID · receipt sent" },
        { status: "completed", agoMs: 14 * HOUR, duration: 391, trigger: "stripe.payment.succeeded", payload: "{ paymentId: 'pi_3OQu0' }", triggeredBy: { name: "Stripe webhook", type: "webhook" }, output: "ok" },
        { status: "completed", agoMs: 1 * DAY, duration: 411, trigger: "stripe.payment.succeeded", payload: "{ paymentId: 'pi_3OQt5' }", triggeredBy: { name: "Stripe webhook", type: "webhook" }, output: "ok" },
        { status: "completed", agoMs: 2 * DAY, duration: 412, trigger: "stripe.payment.succeeded", payload: "{ paymentId: 'pi_3OQr2' }", triggeredBy: { name: "Stripe webhook", type: "webhook" }, output: "ok" },
        { status: "completed", agoMs: 3 * DAY, duration: 398, trigger: "stripe.payment.succeeded", payload: "{ paymentId: 'pi_3OQq1' }", triggeredBy: { name: "Stripe webhook", type: "webhook" }, output: "ok" },
        { status: "completed", agoMs: 4 * DAY, duration: 420, trigger: "stripe.payment.succeeded", payload: "{ paymentId: 'pi_3OQp0' }", triggeredBy: { name: "Stripe webhook", type: "webhook" }, output: "ok" },
        { status: "completed", agoMs: 5 * DAY, duration: 433, trigger: "stripe.payment.succeeded", payload: "{ paymentId: 'pi_3OQo0' }", triggeredBy: { name: "Stripe webhook", type: "webhook" }, output: "ok" },
        { status: "completed", agoMs: 6 * DAY, duration: 405, trigger: "stripe.payment.succeeded", payload: "{ paymentId: 'pi_3OQn0' }", triggeredBy: { name: "Stripe webhook", type: "webhook" }, output: "ok" },
      ]),
      usesWorkflowIds: [],
      usedByWorkflowIds: ["wf-booking-confirmation"],
    },
    {
      id: "wf-welcome-client",
      name: "Welcome new client",
      description: "Send a warm welcome email and a personalized onboarding draft based on plan tier.",
      status: "ENABLED",
      trigger: { type: "booking_created", label: "Booking created", configSummary: "first booking of customer" },
      isVisual: true,
      nodes: wf2Nodes, edges: wf2Edges,
      stats: { runsLast30d: 48, successRate: 96, avgDurationMs: 1240, lastRunAt: ago(NOW_MS - 3 * HOUR), lastRunStatus: "completed", daily: dailyFor(2, 2, 0) },
      tags: ["onboarding", "ai"],
      owner,
      lastModifiedAt: "May 8 2026",
      createdAt: "Sep 2 2025",
      settings: { retryPolicy: "linear", retryMax: 2, timeoutMs: 60000, concurrency: 5, errorHandler: "halt" },
      recentExecutions: buildExecutions("wf-welcome-client", "Welcome new client", wf2Nodes, [
        { status: "completed", agoMs: 3 * HOUR, duration: 1240, trigger: "booking/created", payload: "{ bookingId: 'bk-9281', customerId: 'cust-nw', plan: 'pro' }", triggeredBy: { name: "system", type: "system" }, output: "welcome sent · onboarding drafted" },
        { status: "completed", agoMs: 8 * HOUR, duration: 1180, trigger: "booking/created", payload: "{ bookingId: 'bk-9278', plan: 'pro' }", triggeredBy: { name: "system", type: "system" }, output: "ok" },
        { status: "completed", agoMs: 12 * HOUR, duration: 980, trigger: "booking/created", payload: "{ bookingId: 'bk-9275', plan: 'lite' }", triggeredBy: { name: "system", type: "system" }, output: "lite welcome sent" },
        { status: "failed",    agoMs: 1 * DAY,  duration: 30010, trigger: "booking/created", payload: "{ bookingId: 'bk-9270', plan: 'pro' }", triggeredBy: { name: "system", type: "system" }, failureReason: "timeout evaluating condition after 30s", failedAt: "w4", output: "—" },
        { status: "completed", agoMs: 2 * DAY,  duration: 1101, trigger: "booking/created", payload: "{ bookingId: 'bk-9268' }", triggeredBy: { name: "system", type: "system" }, output: "ok" },
      ]),
      usesWorkflowIds: ["wf-lead-enrichment"],
      usedByWorkflowIds: [],
    },
    {
      id: "wf-chase-overdue",
      name: "Chase overdue invoices",
      description: "Each morning, find invoices past due and send reminders escalating by age.",
      status: "ENABLED",
      trigger: { type: "schedule", label: "Schedule", configSummary: "every day at 9:00 AM" },
      isVisual: false,
      nodes: wf3Nodes, edges: wf3Edges,
      stats: { runsLast30d: 30, successRate: 100, avgDurationMs: 2200, lastRunAt: ago(NOW_MS - 1 * HOUR), lastRunStatus: "completed", daily: dailyFor(3, 1, 0) },
      tags: ["billing", "automation"],
      owner,
      lastModifiedAt: "Apr 18 2026",
      createdAt: "Jun 4 2025",
      settings: { retryPolicy: "none", retryMax: 0, timeoutMs: 300000, concurrency: 1, errorHandler: "continue" },
      recentExecutions: buildExecutions("wf-chase-overdue", "Chase overdue invoices", wf3Nodes, [
        { status: "completed", agoMs: 1 * HOUR, duration: 2200, trigger: "cron: 0 9 * * *", payload: "{ tick: '2026-05-12T09:00Z' }", triggeredBy: { name: "scheduler", type: "schedule" }, output: "3 reminders sent" },
        { status: "completed", agoMs: 1 * DAY,  duration: 2100, trigger: "cron tick",       payload: "{ tick: '2026-05-11T09:00Z' }", triggeredBy: { name: "scheduler", type: "schedule" }, output: "2 reminders sent" },
        { status: "completed", agoMs: 2 * DAY,  duration: 2350, trigger: "cron tick",       payload: "{ tick: '2026-05-10T09:00Z' }", triggeredBy: { name: "scheduler", type: "schedule" }, output: "4 reminders sent" },
      ]),
      usesWorkflowIds: [],
      usedByWorkflowIds: [],
    },
    {
      id: "wf-sprint-review",
      name: "Sprint review reminder",
      description: "Every Monday morning, ping every active engagement owner with the week's sprint review agenda.",
      status: "ENABLED",
      trigger: { type: "schedule", label: "Schedule", configSummary: "every Monday 8:00 AM" },
      isVisual: false,
      nodes: wf4Nodes, edges: wf4Edges,
      stats: { runsLast30d: 4, successRate: 100, avgDurationMs: 1820, lastRunAt: ago(NOW_MS - 2 * DAY), lastRunStatus: "completed", daily: dailyFor(4, 0, 0) },
      tags: ["team", "internal"],
      owner,
      lastModifiedAt: "Mar 1 2026",
      createdAt: "Jan 8 2026",
      settings: { retryPolicy: "linear", retryMax: 1, timeoutMs: 60000, concurrency: 1, errorHandler: "halt" },
      recentExecutions: buildExecutions("wf-sprint-review", "Sprint review reminder", wf4Nodes, [
        { status: "completed", agoMs: 2 * DAY,  duration: 1820, trigger: "cron tick", payload: "{ tick: '2026-05-10T08:00Z' }", triggeredBy: { name: "scheduler", type: "schedule" }, output: "8 owners pinged" },
        { status: "completed", agoMs: 9 * DAY,  duration: 1750, trigger: "cron tick", payload: "{ tick: '2026-05-03T08:00Z' }", triggeredBy: { name: "scheduler", type: "schedule" }, output: "8 owners pinged" },
      ]),
      usesWorkflowIds: [],
      usedByWorkflowIds: [],
    },
    {
      id: "wf-discovery-to-pipeline",
      name: "Discovery form → pipeline",
      description: "When a discovery form lands, spin up a customer, create a pipeline deal, and draft outreach.",
      status: "ENABLED",
      trigger: { type: "form_submitted", label: "Form submitted", configSummary: "form: discovery-v2" },
      isVisual: false,
      nodes: wf5Nodes, edges: wf5Edges,
      stats: { runsLast30d: 22, successRate: 100, avgDurationMs: 3120, lastRunAt: ago(NOW_MS - 6 * HOUR), lastRunStatus: "completed", daily: dailyFor(5, 1, 0) },
      tags: ["intake", "sales"],
      owner,
      lastModifiedAt: "May 2 2026",
      createdAt: "Jul 14 2025",
      settings: { retryPolicy: "linear", retryMax: 2, timeoutMs: 120000, concurrency: 5, errorHandler: "branch_to_error" },
      recentExecutions: buildExecutions("wf-discovery-to-pipeline", "Discovery form → pipeline", wf5Nodes, [
        { status: "completed", agoMs: 6 * HOUR, duration: 3120, trigger: "form/submitted", payload: "{ formId: 'discovery-v2', email: 'mira@seaglass.studio', company: 'Sea Glass Studio' }", triggeredBy: { name: "form", type: "system" }, output: "customer cust-sg created · deal added" },
        { status: "completed", agoMs: 1 * DAY,  duration: 2950, trigger: "form/submitted", payload: "{ formId: 'discovery-v2' }", triggeredBy: { name: "form", type: "system" }, output: "ok" },
      ]),
      usesWorkflowIds: ["wf-lead-enrichment"],
      usedByWorkflowIds: [],
    },
    {
      id: "wf-monthly-digest",
      name: "Monthly digest",
      description: "First of every month, build and send a recap of the past 30 days to every active client.",
      status: "ENABLED",
      trigger: { type: "schedule", label: "Schedule", configSummary: "1st of month at 9:00 AM" },
      isVisual: false,
      nodes: wf6Nodes, edges: wf6Edges,
      stats: { runsLast30d: 1, successRate: 100, avgDurationMs: 8200, lastRunAt: ago(NOW_MS - 11 * DAY), lastRunStatus: "completed", daily: dailyFor(6, 0, 0) },
      tags: ["communications", "ai"],
      owner,
      lastModifiedAt: "Feb 27 2026",
      createdAt: "Jan 1 2026",
      settings: { retryPolicy: "exponential", retryMax: 3, timeoutMs: 600000, concurrency: 1, errorHandler: "halt" },
      recentExecutions: buildExecutions("wf-monthly-digest", "Monthly digest", wf6Nodes, [
        { status: "completed", agoMs: 11 * DAY, duration: 8200, trigger: "cron tick", payload: "{ tick: '2026-05-01T09:00Z' }", triggeredBy: { name: "scheduler", type: "schedule" }, output: "14 digests sent" },
      ]),
      usesWorkflowIds: [],
      usedByWorkflowIds: [],
    },
    {
      id: "wf-audit-to-report",
      name: "Audit completion → report draft",
      description: "When an audit lens closes out, draft a five-lens report and notify the engagement owner.",
      status: "ENABLED",
      trigger: { type: "event", label: "Event match", configSummary: "audit/completed" },
      isVisual: true,
      nodes: wf7Nodes, edges: wf7Edges,
      stats: { runsLast30d: 9, successRate: 100, avgDurationMs: 4100, lastRunAt: ago(NOW_MS - 1 * DAY), lastRunStatus: "completed", daily: dailyFor(7, 0, 0) },
      tags: ["audit", "ai", "internal"],
      owner,
      lastModifiedAt: "Apr 30 2026",
      createdAt: "Oct 18 2025",
      settings: { retryPolicy: "linear", retryMax: 2, timeoutMs: 120000, concurrency: 3, errorHandler: "branch_to_error" },
      recentExecutions: buildExecutions("wf-audit-to-report", "Audit completion → report draft", wf7Nodes, [
        { status: "completed", agoMs: 1 * DAY, duration: 4100, trigger: "audit/completed", payload: "{ engagementId: 'c-northwind', lens: 'TECHNOLOGY' }", triggeredBy: { name: "audit-engine", type: "system" }, output: "report drafted · owner notified" },
      ]),
      usesWorkflowIds: [],
      usedByWorkflowIds: [],
    },
    {
      id: "wf-booking-confirmation",
      name: "Booking confirmation thread",
      description: "Send confirmation, reminder, then SMS nudge before a booking starts.",
      status: "ENABLED",
      trigger: { type: "booking_created", label: "Booking created", configSummary: "any booking" },
      isVisual: true,
      nodes: wf8Nodes, edges: wf8Edges,
      stats: { runsLast30d: 84, successRate: 98, avgDurationMs: 720, lastRunAt: ago(NOW_MS - 40 * MIN), lastRunStatus: "completed", daily: dailyFor(8, 3, 0) },
      tags: ["bookings", "notifications"],
      owner,
      lastModifiedAt: "May 1 2026",
      createdAt: "Aug 30 2025",
      settings: { retryPolicy: "exponential", retryMax: 3, timeoutMs: 60000, concurrency: 20, errorHandler: "continue" },
      recentExecutions: buildExecutions("wf-booking-confirmation", "Booking confirmation thread", wf8Nodes, [
        { status: "completed", agoMs: 40 * MIN, duration: 720, trigger: "booking/created", payload: "{ bookingId: 'bk-9290', customerId: 'cust-cf' }", triggeredBy: { name: "system", type: "system" }, output: "confirmation sent" },
        { status: "running",   agoMs: 3 * MIN,  duration: 180, trigger: "booking/created", payload: "{ bookingId: 'bk-9291' }", triggeredBy: { name: "system", type: "system" }, output: "running" },
      ]),
      usesWorkflowIds: ["wf-invoice-on-payment"],
      usedByWorkflowIds: [],
    },
    {
      id: "wf-failed-payment-recovery",
      name: "Failed payment recovery",
      description: "If a payment fails, notify the customer and pause their engagement after 48h with no retry.",
      status: "ENABLED",
      trigger: { type: "event", label: "Event match", configSummary: "payment/failed" },
      isVisual: true,
      nodes: wf9Nodes, edges: wf9Edges,
      stats: { runsLast30d: 14, successRate: 71, avgDurationMs: 2400, lastRunAt: ago(NOW_MS - 6 * HOUR), lastRunStatus: "failed", daily: dailyFor(9, 1, 1) },
      tags: ["billing", "recovery"],
      owner,
      lastModifiedAt: "Apr 12 2026",
      createdAt: "Nov 22 2025",
      settings: { retryPolicy: "linear", retryMax: 2, timeoutMs: 600000, concurrency: 5, errorHandler: "branch_to_error" },
      recentExecutions: buildExecutions("wf-failed-payment-recovery", "Failed payment recovery", wf9Nodes, [
        { status: "failed",    agoMs: 6 * HOUR, duration: 30020, trigger: "payment/failed", payload: "{ paymentId: 'pi_failed_1', customerId: 'cust-br' }", triggeredBy: { name: "Stripe", type: "webhook" }, failureReason: "Customer email bounced — send_email step failed", failedAt: "p2", output: "—" },
        { status: "completed", agoMs: 2 * DAY, duration: 2400, trigger: "payment/failed", payload: "{ paymentId: 'pi_failed_0' }", triggeredBy: { name: "Stripe", type: "webhook" }, output: "ok" },
      ]),
      usesWorkflowIds: [],
      usedByWorkflowIds: [],
    },
    {
      id: "wf-lead-enrichment",
      name: "Lead enrichment",
      description: "Hit an enrichment API when a new customer lands, then tag by industry.",
      status: "ENABLED",
      trigger: { type: "event", label: "Event match", configSummary: "customers/created" },
      isVisual: false,
      nodes: wf10Nodes, edges: wf10Edges,
      stats: { runsLast30d: 28, successRate: 93, avgDurationMs: 1450, lastRunAt: ago(NOW_MS - 6 * HOUR), lastRunStatus: "completed", daily: dailyFor(10, 1, 0) },
      tags: ["intake", "enrichment"],
      owner,
      lastModifiedAt: "Apr 28 2026",
      createdAt: "Oct 5 2025",
      settings: { retryPolicy: "exponential", retryMax: 3, timeoutMs: 30000, concurrency: 10, errorHandler: "continue" },
      recentExecutions: buildExecutions("wf-lead-enrichment", "Lead enrichment", wf10Nodes, [
        { status: "completed", agoMs: 6 * HOUR, duration: 1450, trigger: "customers/created", payload: "{ customerId: 'cust-sg' }", triggeredBy: { name: "system", type: "system" }, output: "tagged: wellness" },
      ]),
      usesWorkflowIds: [],
      usedByWorkflowIds: ["wf-welcome-client", "wf-discovery-to-pipeline"],
    },
    {
      id: "wf-quote-followup",
      name: "Quote follow-up nudge",
      description: "Three-day follow-up email to a prospect who got a quote.",
      status: "DRAFT",
      trigger: { type: "manual", label: "Manual", configSummary: "run from /pipeline detail" },
      isVisual: false,
      nodes: wf11Nodes, edges: wf11Edges,
      stats: { runsLast30d: 0, successRate: 0, avgDurationMs: 0, lastRunAt: null, lastRunStatus: null, daily: dailyFor(11, 0, 0) },
      tags: ["sales"],
      owner,
      lastModifiedAt: "May 9 2026",
      createdAt: "May 9 2026",
      settings: { retryPolicy: "none", retryMax: 0, timeoutMs: 60000, concurrency: 1, errorHandler: "halt" },
      recentExecutions: [],
      usesWorkflowIds: [],
      usedByWorkflowIds: [],
    },
    {
      id: "wf-form-to-slack",
      name: "Form → Slack alert",
      description: "Quick Slack ping when a form posts to the intake webhook.",
      status: "DISABLED",
      trigger: { type: "webhook", label: "Webhook", configSummary: "POST /hooks/forms-slack" },
      isVisual: false,
      nodes: wf12Nodes, edges: wf12Edges,
      stats: { runsLast30d: 0, successRate: 0, avgDurationMs: 0, lastRunAt: ago(NOW_MS - 60 * DAY), lastRunStatus: "completed", daily: dailyFor(12, 0, 0) },
      tags: ["intake", "internal"],
      owner,
      lastModifiedAt: "Feb 14 2026",
      createdAt: "Dec 2 2025",
      settings: { retryPolicy: "none", retryMax: 0, timeoutMs: 10000, concurrency: 10, errorHandler: "halt" },
      recentExecutions: [],
      usesWorkflowIds: [],
      usedByWorkflowIds: [],
    },
  ]
  return list
})()

/* ── Segments + tags ─────────────────────────────────────────────────────── */

const ALL_TAGS = Array.from(new Set(WORKFLOWS.flatMap(w => w.tags))).sort()

export function getSegments(): SegmentDef[] {
  return [
    {
      group: "Saved views",
      items: [
        { id: "all",      label: "All workflows",  count: WORKFLOWS.length, icon: "workflow" },
        { id: "enabled",  label: "Enabled",        count: WORKFLOWS.filter(w => w.status === "ENABLED").length, icon: "play", pinned: true },
        { id: "disabled", label: "Disabled",       count: WORKFLOWS.filter(w => w.status === "DISABLED").length, icon: "pause" },
        { id: "drafts",   label: "Drafts",         count: WORKFLOWS.filter(w => w.status === "DRAFT").length, icon: "file" },
        { id: "failing",  label: "Failing now",    count: WORKFLOWS.filter(w => w.stats.lastRunStatus === "failed").length, icon: "flag", dot: "danger" },
        { id: "most-run", label: "Most-run (30d)", count: WORKFLOWS.filter(w => w.stats.runsLast30d > 30).length, icon: "chart" },
        { id: "recent",   label: "Recently edited", count: WORKFLOWS.length, icon: "clock" },
      ],
    },
    {
      group: "By trigger",
      items: (Object.keys(TRIGGER_META) as TriggerType[]).map(t => ({
        id: `trigger:${t}`,
        label: TRIGGER_META[t].label,
        count: WORKFLOWS.filter(w => w.trigger.type === t).length,
      })).filter(it => it.count > 0),
    },
    { group: "Tags", tags: ALL_TAGS },
  ]
}

/* ── Match helpers ───────────────────────────────────────────────────────── */

function matchSegment(row: Workflow, segment: string | undefined): boolean {
  if (!segment || segment === "all") return true
  switch (segment) {
    case "enabled":  return row.status === "ENABLED"
    case "disabled": return row.status === "DISABLED"
    case "drafts":   return row.status === "DRAFT"
    case "failing":  return row.stats.lastRunStatus === "failed"
    case "most-run": return row.stats.runsLast30d > 30
    case "recent":   return true   /* sort handles this */
    default:
      if (segment.startsWith("trigger:")) return row.trigger.type === segment.slice(8)
      if (segment.startsWith("tag:"))     return row.tags.includes(segment.slice(4))
      return true
  }
}

function matchFilters(row: Workflow, f: WorkflowFilters | undefined): boolean {
  if (!f) return true
  if (f.status?.length  && !f.status.includes(row.status)) return false
  if (f.trigger?.length && !f.trigger.includes(row.trigger.type)) return false
  if (f.tag?.length     && !f.tag.some(t => row.tags.includes(t))) return false
  if (f.owner?.length   && !f.owner.includes(row.owner.id)) return false
  if (f.failing === true && row.stats.lastRunStatus !== "failed") return false
  return true
}

function matchSearch(row: Workflow, search: string | undefined): boolean {
  if (!search?.trim()) return true
  const q = search.toLowerCase()
  return row.name.toLowerCase().includes(q)
    || row.description.toLowerCase().includes(q)
    || row.tags.some(t => t.toLowerCase().includes(q))
    || row.trigger.label.toLowerCase().includes(q)
}

function sortRows(rows: Workflow[], by: WorkflowSortBy = "lastRun", dir: WorkflowSortDir = "desc"): Workflow[] {
  const mult = dir === "asc" ? 1 : -1
  const score = (w: Workflow): number => {
    switch (by) {
      case "lastRun":          return w.stats.runsLast30d  /* proxy — recency built into mock */
      case "runsLast30d":      return w.stats.runsLast30d
      case "successRate":      return w.stats.successRate
      case "name":             return 0
      case "lastModifiedAt":   return w.stats.runsLast30d
    }
  }
  const sorted = [...rows]
  sorted.sort((a, b) => {
    if (by === "name") return a.name.localeCompare(b.name) * mult
    return (score(a) - score(b)) * mult
  })
  return sorted
}

/* ── Aggregate stats ─────────────────────────────────────────────────────── */

function summary(rows: Workflow[]): WorkflowStatsSummary {
  const enabled = rows.filter(w => w.status === "ENABLED").length
  /* "today" = first day of the daily array since we precomputed deterministically */
  const runsToday = rows.reduce((s, w) => s + (w.stats.daily[29]?.runs ?? 0), 0)
  const failuresToday = rows.reduce((s, w) => s + (w.stats.daily[29]?.failures ?? 0), 0)
  /* success-rate weighted by 7-day runs */
  const last7 = rows.map(w => {
    const r = w.stats.daily.slice(-7)
    const total = r.reduce((s, d) => s + d.runs, 0)
    const fail  = r.reduce((s, d) => s + d.failures, 0)
    return { total, fail }
  })
  const totalRuns = last7.reduce((s, x) => s + x.total, 0)
  const totalFail = last7.reduce((s, x) => s + x.fail, 0)
  const successRate7d = totalRuns ? Math.round(((totalRuns - totalFail) / totalRuns) * 100) : 100
  const totalDur = rows.reduce((s, w) => s + w.stats.avgDurationMs * w.stats.runsLast30d, 0)
  const totalDurRuns = rows.reduce((s, w) => s + w.stats.runsLast30d, 0)
  const avgDurationMs = totalDurRuns ? Math.round(totalDur / totalDurRuns) : 0
  return { enabled, runsToday, successRate7d, failuresToday, avgDurationMs }
}

/* ── Flat execution index (across all workflows) ─────────────────────────── */

const ALL_EXECUTIONS: Execution[] = WORKFLOWS.flatMap(w => w.recentExecutions)

/* ── Public API (tRPC-shaped) ────────────────────────────────────────────── */

export const mockWorkflows = {
  list(q: WorkflowQuery = {}): Workflow[] {
    const filtered = WORKFLOWS.filter(r =>
      matchSegment(r, q.segment) && matchFilters(r, q.filters) && matchSearch(r, q.search))
    return sortRows(filtered, q.sortBy, q.sortDir)
  },

  total(): number { return WORKFLOWS.length },

  getById(id: string): Workflow | null {
    return WORKFLOWS.find(w => w.id === id) ?? null
  },

  executions(workflowId: string): Execution[] {
    const w = WORKFLOWS.find(x => x.id === workflowId)
    return w ? w.recentExecutions : []
  },

  getExecution(id: string): Execution | null {
    return ALL_EXECUTIONS.find(e => e.id === id) ?? null
  },

  stats: summary,

  allTags(): string[] { return ALL_TAGS },

  allOwners(): Array<{ id: string; initials: string; name: string }> {
    const map = new Map<string, { id: string; initials: string; name: string }>()
    for (const w of WORKFLOWS) map.set(w.owner.id, w.owner)
    return Array.from(map.values())
  },

  segments: getSegments,
}
