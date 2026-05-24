/**
 * Mock data layer for the unified inbox (/admin/inbox).
 *
 * Discriminated union — each item type has its own payload, but shares
 * id/timestamp/who/source/related metadata. Future tRPC procedure:
 *   inbox.list(filters) → InboxItem[]
 *   inbox.markRead(id) / inbox.reply({ id, body }) / inbox.approve(id) / ...
 *
 * Required DB fields:
 *   inboxItems: id, type, source, who, body, occurredAt, unread, tenantId
 *   inboxItem_relations: itemId, relType, relId
 *   Per-type payload stored in jsonb `payload` column or per-type sub-table.
 */

export type InboxItemType =
  | "approval"      /* invoice/contract awaiting sign-off */
  | "message"       /* portal reply from client */
  | "workflow"      /* automation run status */
  | "payment"       /* incoming payment */
  | "review"        /* customer review submitted */
  | "audit"         /* security/audit alert */
  | "pipeline"      /* deal stage change */
  | "form"          /* form submission */
  | "booking"       /* booking made/changed */

export type InboxTone = "accent" | "warn" | "info" | "ok" | "muted"

export interface RelatedRef {
  type: "engagement" | "invoice" | "workflow" | "booking" | "review" | "form" | "customer" | "payment" | "deal" | "audit-event"
  label: string
  href: string
}

export type InboxBucket = "today" | "yesterday" | "earlier"

export interface InboxItemBase {
  id: string
  type: InboxItemType
  tone: InboxTone
  source: string                  /* "Approval", "Portal reply", "Workflow", ... */
  who: { name: string; initials: string; role?: string; email?: string }
  preview: string                 /* one-line list summary */
  meta: string                    /* "/inv_2041 · 4h ago" — list footer */
  occurredAt: string              /* display */
  occurredAtTs: number
  bucket: InboxBucket             /* computed at mock layer to keep render pure */
  unread: boolean
  related: RelatedRef[]
}

/* ── Type-specific payloads ──────────────────────────────────────────────── */

export interface ApprovalItem extends InboxItemBase {
  type: "approval"
  payload: {
    title: string
    subtitle: string
    message: string
    invoice: {
      id: string
      currency: "$" | "£"
      lineItems: Array<{ label: string; amount: number }>
      total: number
      dueDate: string
    }
  }
}

export interface MessageItem extends InboxItemBase {
  type: "message"
  payload: {
    threadTitle: string
    body: string
    thread: Array<{ author: string; initials: string; when: string; body: string }>
  }
}

export interface WorkflowItem extends InboxItemBase {
  type: "workflow"
  payload: {
    runId: string
    workflowName: string
    state: "running" | "paused" | "failed" | "completed"
    failureReason: string | null
    stepsTotal: number
    stepsDone: number
    queuedCount: number
    nextRetryAt: string | null
  }
}

export interface PaymentItem extends InboxItemBase {
  type: "payment"
  payload: {
    amount: number
    currency: "$" | "£"
    customer: string
    invoiceId: string
    method: string
    receivedAt: string
    feeAmount: number
    netAmount: number
  }
}

export interface ReviewItem extends InboxItemBase {
  type: "review"
  payload: {
    rating: number              /* 1-5 */
    title: string
    body: string
    publishableByDefault: boolean
    customer: string
    booking: { id: string; label: string }
  }
}

export interface AuditItem extends InboxItemBase {
  type: "audit"
  payload: {
    severity: "INFO" | "WARNING" | "ERROR" | "CRITICAL"
    action: string
    entity: string
    diff: string
    ip: string
  }
}

export interface PipelineItem extends InboxItemBase {
  type: "pipeline"
  payload: {
    dealId: string
    dealName: string
    fromStage: string
    toStage: string
    value: number
    currency: "$" | "£"
    autoEngagementCreated: boolean
    engagementId: string | null
  }
}

export interface FormItem extends InboxItemBase {
  type: "form"
  payload: {
    formId: string
    formName: string
    submissionId: string
    fields: Array<{ label: string; value: string }>
    routedTo: string                  /* "pipeline", "team", "customer service" */
  }
}

export interface BookingItem extends InboxItemBase {
  type: "booking"
  payload: {
    bookingId: string
    title: string
    customer: string
    startsAt: string
    endsAt: string
    location: string
    attendees: string[]
  }
}

export type InboxItem =
  | ApprovalItem | MessageItem | WorkflowItem | PaymentItem | ReviewItem
  | AuditItem | PipelineItem | FormItem | BookingItem

/* ── Dataset ─────────────────────────────────────────────────────────────── */

const NOW = Date.now()
const HRS = (h: number) => NOW - h * 60 * 60 * 1000
const DAYS = (d: number) => NOW - d * 24 * 60 * 60 * 1000
const DAY_MS = 24 * 60 * 60 * 1000

function bucketFor(ts: number): InboxBucket {
  const delta = NOW - ts
  if (delta < DAY_MS) return "today"
  if (delta < 2 * DAY_MS) return "yesterday"
  return "earlier"
}

const RAW: Array<Omit<InboxItem, "bucket">> = [
  {
    id: "inb-approval-2041",
    type: "approval", tone: "accent", source: "Approval",
    who: { name: "Sarah Rowe", initials: "SR", role: "finance · acme", email: "sarah@acme.studios" },
    preview: "Approve Q2 final invoice · $14,200",
    meta: "/inv_2041 · 4h ago",
    occurredAt: "4h ago", occurredAtTs: HRS(4),
    unread: true,
    related: [
      { type: "engagement", label: "Engagement · Acme Q2 retainer", href: "/admin/clients/c-vellum" },
      { type: "invoice", label: "Previous · /inv_2027 (paid)", href: "/admin/payments/inv-2027" },
      { type: "customer", label: "Client · Acme Studios", href: "/admin/customers/cust-vl" },
    ],
    payload: {
      title: "Acme · Q2 final",
      subtitle: "$14,200 due Apr 28",
      message: "Final invoice ready for sign-off. Same scope as the Q2 brief — happy to push back if anything changed on your side.",
      invoice: {
        id: "inv_2041",
        currency: "$",
        lineItems: [
          { label: "Retainer · Q2 final",     amount: 12000 },
          { label: "Approved scope creep",    amount: 1800 },
          { label: "VAT @ 0%",                amount: 0 },
        ],
        total: 14200,
        dueDate: "Apr 28, 2026",
      },
    },
  },
  {
    id: "inb-workflow-887",
    type: "workflow", tone: "warn", source: "Workflow",
    who: { name: "Stripe sync", initials: "SY", role: "automation" },
    preview: "Run paused — rate limit. 12 invoices queued.",
    meta: "/wf_887 · 3h ago",
    occurredAt: "3h ago", occurredAtTs: HRS(3),
    unread: true,
    related: [
      { type: "workflow", label: "Workflow · Stripe sync", href: "/admin/workflows/wf-887" },
      { type: "audit-event", label: "Latest run · /wf_887_run_4421", href: "/admin/workflows/wf-887/executions" },
    ],
    payload: {
      runId: "wf_887_run_4421",
      workflowName: "Stripe invoice sync",
      state: "paused",
      failureReason: "Stripe API 429 — rate limit exceeded on /v1/invoices",
      stepsTotal: 14,
      stepsDone: 9,
      queuedCount: 12,
      nextRetryAt: "in 7 min",
    },
  },
  {
    id: "inb-message-design",
    type: "message", tone: "info", source: "Portal reply",
    who: { name: "Jamie Park", initials: "JP", role: "design lead · Westfield", email: "jamie@westfield.co" },
    preview: "\"The portal copy looks great but can we tighten…\"",
    meta: "design review · 2h ago",
    occurredAt: "2h ago", occurredAtTs: HRS(2),
    unread: true,
    related: [
      { type: "engagement", label: "Engagement · Westfield brand refresh", href: "/admin/clients/c-arden" },
      { type: "customer", label: "Client · Westfield", href: "/admin/customers/cust-ar" },
    ],
    payload: {
      threadTitle: "Portal copy review · sprint 3",
      body: "The portal copy looks great but can we tighten the welcome line on the dashboard? Right now it reads a touch corporate — we want it warmer. Maybe drop the third sentence entirely and let the CTA do the work?",
      thread: [
        { author: "Luke Hodges", initials: "LH", when: "yesterday", body: "Pushed v3 of the copy to staging — let me know what you think." },
        { author: "Jamie Park",  initials: "JP", when: "2h ago",    body: "The portal copy looks great but can we tighten the welcome line on the dashboard?" },
      ],
    },
  },
  {
    id: "inb-payment-2039",
    type: "payment", tone: "ok", source: "Payment",
    who: { name: "Stripe", initials: "ST", role: "billing" },
    preview: "Acme Studios paid $4,200",
    meta: "/inv_2039 · 09:42",
    occurredAt: "09:42", occurredAtTs: HRS(8),
    unread: false,
    related: [
      { type: "invoice", label: "Invoice · /inv_2039", href: "/admin/payments/inv-2039" },
      { type: "customer", label: "Client · Acme Studios", href: "/admin/customers/cust-vl" },
    ],
    payload: {
      amount: 4200, currency: "$",
      customer: "Acme Studios",
      invoiceId: "inv_2039",
      method: "Card · Visa ····4242",
      receivedAt: "Apr 23, 09:42 BST",
      feeAmount: 124,
      netAmount: 4076,
    },
  },
  {
    id: "inb-audit-login",
    type: "audit", tone: "muted", source: "Audit",
    who: { name: "Luke Hodges", initials: "LH", role: "owner" },
    preview: "Logged into platform admin",
    meta: "ip 82.34.21.4 · 08:14",
    occurredAt: "08:14", occurredAtTs: HRS(9),
    unread: false,
    related: [
      { type: "audit-event", label: "Audit log entry", href: "/admin/audit" },
    ],
    payload: {
      severity: "INFO",
      action: "AUTH.LOGIN_SUCCESS",
      entity: "USR-001",
      diff: "session created · expires in 8h",
      ip: "82.34.21.4",
    },
  },
  {
    id: "inb-pipeline-443",
    type: "pipeline", tone: "info", source: "Pipeline",
    who: { name: "Pipeline", initials: "PL", role: "automation" },
    preview: "Deal moved to Won · Olsen Brands · $12k",
    meta: "/deal_443 · auto-engagement created",
    occurredAt: "yesterday", occurredAtTs: DAYS(1),
    unread: false,
    related: [
      { type: "deal", label: "Deal · /deal_443", href: "/admin/pipeline/deal-443" },
      { type: "engagement", label: "New engagement · Olsen Brands", href: "/admin/clients/c-pebble" },
    ],
    payload: {
      dealId: "deal_443",
      dealName: "Olsen Brands · brand refresh",
      fromStage: "PROPOSAL",
      toStage: "CLOSED_WON",
      value: 12000, currency: "$",
      autoEngagementCreated: true,
      engagementId: "c-pebble",
    },
  },
  {
    id: "inb-review-88",
    type: "review", tone: "ok", source: "Review",
    who: { name: "Mira Sato", initials: "MS", role: "founder · Northwind", email: "mira@northwind.co" },
    preview: "Left a 5★ for sprint 3 demo",
    meta: "/review_88 · Sun",
    occurredAt: "Sun", occurredAtTs: DAYS(3),
    unread: false,
    related: [
      { type: "review", label: "Review · /review_88", href: "/admin/reviews" },
      { type: "booking", label: "Booking · sprint 3 demo", href: "/admin/bookings/bk-2203" },
      { type: "customer", label: "Client · Northwind Co.", href: "/admin/customers/cust-nw" },
    ],
    payload: {
      rating: 5,
      title: "Sharp work on sprint 3 — fastest demo we've seen",
      body: "The pace from kickoff to working demo was unreal. Documentation was clear, the workflow walkthrough saved my team a week. The only nit: I'd love a heads-up doc the day before each review so we can pre-load context.",
      publishableByDefault: true,
      customer: "Northwind Co.",
      booking: { id: "bk-2203", label: "Sprint 3 demo · Tue 11:30" },
    },
  },
  {
    id: "inb-form-intake",
    type: "form", tone: "muted", source: "Form",
    who: { name: "Discovery intake", initials: "DI", role: "form" },
    preview: "New submission · Discovery intake",
    meta: "/form_intake · routed to pipeline",
    occurredAt: "yesterday", occurredAtTs: DAYS(1),
    unread: false,
    related: [
      { type: "form", label: "Submission · /form_intake_2204", href: "/admin/forms/submissions/sub-2204" },
      { type: "deal", label: "Created deal · /deal_512", href: "/admin/pipeline/deal-512" },
    ],
    payload: {
      formId: "form_intake",
      formName: "Discovery intake",
      submissionId: "sub-2204",
      fields: [
        { label: "Company",         value: "Bowery Mills" },
        { label: "Contact",         value: "Jonas Hale" },
        { label: "Email",           value: "jonas@bowery.mill" },
        { label: "Budget range",    value: "$30k – $60k" },
        { label: "Project type",    value: "Discovery + scoping" },
        { label: "Timeline",        value: "Start within 4 weeks" },
        { label: "Notes",           value: "We've been burned by two agencies. Looking for someone who can ship and stay." },
      ],
      routedTo: "pipeline",
    },
  },
  {
    id: "inb-booking-2204",
    type: "booking", tone: "info", source: "Booking",
    who: { name: "Northwind Co.", initials: "NW", role: "client" },
    preview: "Booked sprint review · Tue 11:30",
    meta: "/bk_2204 · Mon",
    occurredAt: "Mon", occurredAtTs: DAYS(2),
    unread: false,
    related: [
      { type: "booking", label: "Booking · /bk_2204", href: "/admin/bookings/bk-2204" },
      { type: "engagement", label: "Engagement · Northwind Q2 retainer", href: "/admin/clients/c-northwind" },
      { type: "customer", label: "Client · Northwind Co.", href: "/admin/customers/cust-nw" },
    ],
    payload: {
      bookingId: "bk-2204",
      title: "Sprint 4 review",
      customer: "Northwind Co.",
      startsAt: "Tue Apr 28 · 11:30 BST",
      endsAt:   "Tue Apr 28 · 12:30 BST",
      location: "Google Meet",
      attendees: ["Luke Hodges", "Mira Sato", "Priya Vance"],
    },
  },
  {
    id: "inb-workflow-310",
    type: "workflow", tone: "ok", source: "Workflow",
    who: { name: "Monthly digest", initials: "MD", role: "automation" },
    preview: "Sent 8 client digests successfully",
    meta: "/wf_310 · Sun 09:00",
    occurredAt: "Sun 09:00", occurredAtTs: DAYS(3),
    unread: false,
    related: [
      { type: "workflow", label: "Workflow · Monthly digest", href: "/admin/workflows/wf-310" },
    ],
    payload: {
      runId: "wf_310_run_88",
      workflowName: "Monthly client digest",
      state: "completed",
      failureReason: null,
      stepsTotal: 8,
      stepsDone: 8,
      queuedCount: 0,
      nextRetryAt: null,
    },
  },
]

const ITEMS: InboxItem[] = RAW.map(r => ({ ...r, bucket: bucketFor(r.occurredAtTs) } as InboxItem))

/* ── Query / mutations (mocked) ──────────────────────────────────────────── */

export interface InboxFilters {
  filter?: "all" | "unread" | "mentions" | "assigned"
  source?: string             /* e.g. "Approval", "Workflow" — matches `source` */
  client?: string             /* substring of customer name */
}

export const mockInbox = {
  list(f: InboxFilters = {}): InboxItem[] {
    return ITEMS.filter(it => {
      if (f.filter === "unread" && !it.unread) return false
      if (f.filter === "mentions" && it.type !== "message") return false
      if (f.filter === "assigned" && it.type !== "approval" && it.type !== "workflow") return false
      if (f.source && it.source !== f.source) return false
      if (f.client) {
        const blob = `${it.who.name} ${it.preview} ${"customer" in (it.payload as object) ? (it.payload as { customer?: string }).customer ?? "" : ""}`.toLowerCase()
        if (!blob.includes(f.client.toLowerCase())) return false
      }
      return true
    }).sort((a, b) => b.occurredAtTs - a.occurredAtTs)
  },

  getById(id: string): InboxItem | null {
    return ITEMS.find(i => i.id === id) ?? null
  },

  counts() {
    return {
      total: ITEMS.length,
      unread: ITEMS.filter(i => i.unread).length,
      mentions: ITEMS.filter(i => i.type === "message").length,
      assigned: ITEMS.filter(i => i.type === "approval" || i.type === "workflow").length,
      bySource: {
        Approval: ITEMS.filter(i => i.source === "Approval").length,
        "Portal reply": ITEMS.filter(i => i.source === "Portal reply").length,
        Workflow: ITEMS.filter(i => i.source === "Workflow").length,
        Payment: ITEMS.filter(i => i.source === "Payment").length,
        Audit: ITEMS.filter(i => i.source === "Audit").length,
        Review: ITEMS.filter(i => i.source === "Review").length,
        Form: ITEMS.filter(i => i.source === "Form").length,
        Booking: ITEMS.filter(i => i.source === "Booking").length,
        Pipeline: ITEMS.filter(i => i.source === "Pipeline").length,
      } as Record<string, number>,
      byClient: {
        Northwind: ITEMS.filter(i => i.preview.includes("Northwind") || i.who.name.includes("Northwind") || ("customer" in (i.payload as object) && (i.payload as { customer?: string }).customer === "Northwind Co.")).length,
        Acme: ITEMS.filter(i => i.preview.includes("Acme") || i.who.name.includes("Acme") || ("customer" in (i.payload as object) && (i.payload as { customer?: string }).customer === "Acme Studios")).length,
        Olsen: ITEMS.filter(i => i.preview.includes("Olsen") || i.who.name.includes("Olsen")).length,
        Westfield: ITEMS.filter(i => i.preview.includes("Westfield") || i.who.name.includes("Westfield") || i.who.role?.includes("Westfield")).length,
      } as Record<string, number>,
    }
  },
}
