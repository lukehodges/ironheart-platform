"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Icon, type IconName } from "@/components/shell"
import { NotificationToast, type ToastTone } from "@/components/shared"
import {
  mockInbox,
  type ApprovalItem,
  type AuditItem,
  type BookingItem,
  type FormItem,
  type InboxFilters,
  type InboxItem,
  type InboxItemType,
  type InboxTone,
  type MessageItem,
  type PaymentItem,
  type PipelineItem,
  type ReviewItem,
  type WorkflowItem,
} from "@/lib/mock/inbox"

/* ── Static maps ─────────────────────────────────────────────────────────── */

const TYPE_ICON: Record<InboxItemType, IconName> = {
  approval: "check", message: "chat", workflow: "bolt", payment: "money",
  review: "star", audit: "audit", pipeline: "pipeline", form: "file", booking: "calendar",
}

const RELATED_ICON: Record<string, IconName> = {
  engagement: "handshake", invoice: "invoice", workflow: "bolt", booking: "calendar",
  review: "star", form: "file", customer: "user", payment: "money", deal: "pipeline",
  "audit-event": "audit",
}

function toneColor(t: InboxTone): string {
  return t === "accent" ? "var(--ih-accent)"
    : t === "warn" ? "var(--ih-warn)"
    : t === "info" ? "var(--ih-info)"
    : t === "ok" ? "var(--ih-ok)" : "var(--ih-ink-40)"
}

/* ── Inline reply form ───────────────────────────────────────────────────── */

function InlineReply({
  placeholder, primaryLabel, tone = "accent", onSend, onCancel,
}: {
  placeholder: string; primaryLabel: string; tone?: "accent" | "danger";
  onSend: (body: string) => void; onCancel: () => void;
}) {
  const [body, setBody] = useState("")
  return (
    <div className="ih-card" style={{ background: "var(--ih-surface)", padding: 10, marginTop: 6, display: "flex", flexDirection: "column", gap: 8 }}>
      <textarea
        autoFocus
        value={body}
        onChange={e => setBody(e.target.value)}
        placeholder={placeholder}
        rows={4}
        className="ih-input"
        style={{ resize: "vertical", fontFamily: "var(--ih-font-sans)", fontSize: 12, padding: 8, minHeight: 60 }}
      />
      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
        <button className="ih-btn ih-btn-quiet ih-btn-sm" onClick={onCancel}>Cancel</button>
        <button
          className={`ih-btn ih-btn-sm ${tone === "danger" ? "ih-btn-ghost" : "ih-btn-accent"}`}
          style={tone === "danger" ? { color: "var(--ih-danger)", borderColor: "var(--ih-danger-soft)" } : undefined}
          disabled={!body.trim()}
          onClick={() => { onSend(body); setBody("") }}
        >
          {primaryLabel}
        </button>
      </div>
    </div>
  )
}

/* ── Type-specific detail components ─────────────────────────────────────── */

function ApprovalDetail({ item, onAction }: { item: ApprovalItem; onAction: (label: string, tone: ToastTone) => void }) {
  const [mode, setMode] = useState<"notes" | "pushback" | null>(null)
  const { invoice, message } = item.payload
  const currencyFmt = (n: number) => `${invoice.currency}${n.toLocaleString()}`

  return (
    <>
      <div className="ih-card" style={{ padding: 14, marginBottom: 12, background: "var(--ih-surface)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <div className="ih-avatar">{item.who.initials}</div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 500 }}>{item.who.name}</div>
            <div className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)" }}>{item.who.role} · {item.occurredAt}</div>
          </div>
        </div>
        <p style={{ margin: "8px 0 0", fontSize: 12, color: "var(--ih-ink-65)", lineHeight: 1.6 }}>"{message}"</p>
      </div>

      <div className="ih-card" style={{ background: "var(--ih-surface)", padding: 14, marginBottom: 12 }}>
        <div className="ih-eyebrow" style={{ marginBottom: 8 }}>Invoice summary · /{invoice.id}</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 4, fontSize: 12 }}>
          {invoice.lineItems.map(li => (
            <div key={li.label} style={{ display: "contents" }}>
              <span style={{ color: "var(--ih-ink-65)" }}>{li.label}</span>
              <span className="ih-num">{li.amount === 0 ? "—" : currencyFmt(li.amount)}</span>
            </div>
          ))}
          <div style={{ gridColumn: "1 / -1", height: 1, background: "var(--ih-line)", margin: "6px 0" }} />
          <strong>Total</strong><strong className="ih-num">{currencyFmt(invoice.total)}</strong>
          <span style={{ color: "var(--ih-ink-40)", fontSize: 10.5 }}>Due {invoice.dueDate}</span>
          <span />
        </div>
      </div>

      <div style={{ display: "grid", gap: 6 }}>
        <button className="ih-btn ih-btn-accent" style={{ height: 36, justifyContent: "center" }}
          onClick={() => onAction(`Approved & sent · /${invoice.id}`, "ok")}>
          <Icon name="check" size={12} /> Approve & send
        </button>
        <button className="ih-btn ih-btn-ghost" style={{ height: 32 }}
          onClick={() => setMode(m => m === "notes" ? null : "notes")}>
          <Icon name="chat" size={11} /> Reply with notes
        </button>
        <button className="ih-btn ih-btn-quiet" style={{ height: 32 }}
          onClick={() => setMode(m => m === "pushback" ? null : "pushback")}>
          <Icon name="x" size={11} /> Push back
        </button>
      </div>

      {mode === "notes" && (
        <InlineReply
          placeholder="Add notes for Sarah — anything to clarify before approval?"
          primaryLabel="Send notes"
          onSend={(b) => { onAction(`Notes sent · ${b.slice(0, 28)}…`, "info"); setMode(null) }}
          onCancel={() => setMode(null)}
        />
      )}
      {mode === "pushback" && (
        <InlineReply
          placeholder="Push back — explain what needs to change before you can approve."
          primaryLabel="Send pushback"
          tone="danger"
          onSend={(b) => { onAction(`Pushed back · ${b.slice(0, 28)}…`, "warn"); setMode(null) }}
          onCancel={() => setMode(null)}
        />
      )}
    </>
  )
}

function MessageDetail({ item, onAction }: { item: MessageItem; onAction: (label: string, tone: ToastTone) => void }) {
  const [mode, setMode] = useState<"reply" | null>(null)
  return (
    <>
      <div className="ih-eyebrow" style={{ marginBottom: 8 }}>{item.payload.threadTitle}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
        {item.payload.thread.map((m, i) => (
          <div key={i} className="ih-card" style={{ padding: 12, background: "var(--ih-surface)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <div className="ih-avatar" style={{ width: 22, height: 22, fontSize: 9 }}>{m.initials}</div>
              <span style={{ fontSize: 11.5, fontWeight: 500 }}>{m.author}</span>
              <span className="ih-mono" style={{ fontSize: 9.5, color: "var(--ih-ink-40)" }}>· {m.when}</span>
            </div>
            <p style={{ margin: 0, fontSize: 12, color: "var(--ih-ink-65)", lineHeight: 1.5 }}>{m.body}</p>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gap: 6 }}>
        <button className="ih-btn ih-btn-accent" style={{ height: 36, justifyContent: "center" }}
          onClick={() => setMode(m => m === "reply" ? null : "reply")}>
          <Icon name="chat" size={12} /> Reply
        </button>
        <div style={{ display: "flex", gap: 6 }}>
          <button className="ih-btn ih-btn-ghost ih-btn-sm" style={{ flex: 1 }}
            onClick={() => onAction("Marked as resolved", "ok")}>
            <Icon name="check" size={11} /> Resolve
          </button>
          <button className="ih-btn ih-btn-ghost ih-btn-sm" style={{ flex: 1 }}
            onClick={() => onAction("Thread forwarded to team", "info")}>
            <Icon name="arrowUpRight" size={11} /> Forward
          </button>
        </div>
      </div>

      {mode === "reply" && (
        <InlineReply
          placeholder={`Reply to ${item.who.name.split(" ")[0]}…`}
          primaryLabel="Send reply"
          onSend={(b) => { onAction(`Reply sent · ${b.slice(0, 28)}…`, "ok"); setMode(null) }}
          onCancel={() => setMode(null)}
        />
      )}
    </>
  )
}

function WorkflowDetail({ item, onAction }: { item: WorkflowItem; onAction: (label: string, tone: ToastTone) => void }) {
  const wf = item.payload
  const progress = (wf.stepsDone / wf.stepsTotal) * 100
  const stateColor = wf.state === "paused" ? "var(--ih-warn)"
    : wf.state === "failed" ? "var(--ih-danger)"
    : wf.state === "completed" ? "var(--ih-ok)"
    : "var(--ih-info)"

  return (
    <>
      <div className="ih-card" style={{ padding: 14, marginBottom: 12, background: "var(--ih-surface)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 12.5, fontWeight: 500 }}>{wf.workflowName}</div>
            <div className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)" }}>run /{wf.runId}</div>
          </div>
          <span className="ih-pill" style={{ fontSize: 9, padding: "2px 6px", background: stateColor, color: "#fff", borderColor: "transparent" }}>
            {wf.state.toUpperCase()}
          </span>
        </div>

        <div style={{ marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10.5, color: "var(--ih-ink-50)", marginBottom: 4 }}>
            <span>Progress</span><span className="ih-mono">{wf.stepsDone} / {wf.stepsTotal}</span>
          </div>
          <div style={{ height: 4, background: "var(--ih-surface-3)", borderRadius: 2, overflow: "hidden" }}>
            <div style={{ width: `${progress}%`, height: "100%", background: stateColor }} />
          </div>
        </div>

        {wf.failureReason && (
          <div style={{ padding: "8px 10px", background: "var(--ih-danger-soft)", borderRadius: 4, fontSize: 11.5, color: "var(--ih-danger)", marginBottom: 8 }}>
            <strong style={{ fontWeight: 600 }}>Why it paused:</strong> {wf.failureReason}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, fontSize: 11 }}>
          <div>
            <div className="ih-eyebrow" style={{ fontSize: 8, marginBottom: 2 }}>Queued</div>
            <div className="ih-num" style={{ fontSize: 14 }}>{wf.queuedCount}</div>
          </div>
          <div>
            <div className="ih-eyebrow" style={{ fontSize: 8, marginBottom: 2 }}>Next retry</div>
            <div className="ih-num" style={{ fontSize: 14, color: "var(--ih-ink-65)" }}>{wf.nextRetryAt ?? "—"}</div>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gap: 6 }}>
        {wf.state === "paused" && (
          <>
            <button className="ih-btn ih-btn-accent" style={{ height: 36, justifyContent: "center" }}
              onClick={() => onAction(`Resumed · /${wf.runId}`, "ok")}>
              <Icon name="play" size={12} /> Resume run
            </button>
            <button className="ih-btn ih-btn-ghost" style={{ height: 32 }}
              onClick={() => onAction("Retry triggered", "info")}>
              <Icon name="refresh" size={11} /> Retry now
            </button>
          </>
        )}
        {wf.state === "failed" && (
          <>
            <button className="ih-btn ih-btn-accent" style={{ height: 36, justifyContent: "center" }}
              onClick={() => onAction(`Retry triggered · /${wf.runId}`, "info")}>
              <Icon name="refresh" size={12} /> Retry run
            </button>
            <button className="ih-btn ih-btn-ghost" style={{ height: 32 }}
              onClick={() => onAction(`Workflow disabled`, "warn")}>
              <Icon name="pause" size={11} /> Disable workflow
            </button>
          </>
        )}
        {wf.state === "completed" && (
          <button className="ih-btn ih-btn-quiet" style={{ height: 32 }}
            onClick={() => onAction("Marked acknowledged", "muted")}>
            <Icon name="check" size={11} /> Acknowledge
          </button>
        )}
        <Link href={`/platform/workflows/${wf.runId.split("_")[0]}-${wf.runId.split("_")[1]}/executions`} className="ih-btn ih-btn-quiet" style={{ height: 32, textDecoration: "none", justifyContent: "flex-start" }}>
          <Icon name="audit" size={11} /> Open run logs
        </Link>
      </div>
    </>
  )
}

function PaymentDetail({ item, onAction }: { item: PaymentItem; onAction: (label: string, tone: ToastTone) => void }) {
  const p = item.payload
  return (
    <>
      <div className="ih-card" style={{ padding: 14, marginBottom: 12, background: "var(--ih-surface)" }}>
        <div className="ih-eyebrow" style={{ marginBottom: 6 }}>Payment received</div>
        <div className="ih-serif ih-num" style={{ fontSize: 28, color: "var(--ih-ok)", lineHeight: 1, marginBottom: 6 }}>
          {p.currency}{p.amount.toLocaleString()}
        </div>
        <div style={{ fontSize: 11.5, color: "var(--ih-ink-65)", marginBottom: 10 }}>
          from <strong>{p.customer}</strong> · {p.receivedAt}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 4, fontSize: 11.5 }}>
          <span style={{ color: "var(--ih-ink-50)" }}>Method</span>
          <span className="ih-mono">{p.method}</span>
          <span style={{ color: "var(--ih-ink-50)" }}>Invoice</span>
          <span className="ih-mono">/{p.invoiceId}</span>
          <span style={{ color: "var(--ih-ink-50)" }}>Processor fee</span>
          <span className="ih-num">{p.currency}{p.feeAmount.toLocaleString()}</span>
          <div style={{ gridColumn: "1 / -1", height: 1, background: "var(--ih-line)", margin: "4px 0" }} />
          <strong>Net to you</strong>
          <strong className="ih-num">{p.currency}{p.netAmount.toLocaleString()}</strong>
        </div>
      </div>

      <div style={{ display: "grid", gap: 6 }}>
        <Link href={`/platform/payments/${p.invoiceId}`} className="ih-btn ih-btn-accent" style={{ height: 36, justifyContent: "center", textDecoration: "none" }}>
          <Icon name="invoice" size={12} /> Open invoice
        </Link>
        <div style={{ display: "flex", gap: 6 }}>
          <button className="ih-btn ih-btn-ghost ih-btn-sm" style={{ flex: 1 }}
            onClick={() => onAction("Receipt emailed", "ok")}>
            <Icon name="mail" size={11} /> Send receipt
          </button>
          <button className="ih-btn ih-btn-ghost ih-btn-sm" style={{ flex: 1 }}
            onClick={() => onAction("Refund flow opened", "warn")}>
            <Icon name="refresh" size={11} /> Refund
          </button>
        </div>
      </div>
    </>
  )
}

function ReviewDetail({ item, onAction }: { item: ReviewItem; onAction: (label: string, tone: ToastTone) => void }) {
  const r = item.payload
  const [mode, setMode] = useState<"reply" | null>(null)
  return (
    <>
      <div className="ih-card" style={{ padding: 14, marginBottom: 12, background: "var(--ih-surface)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 8 }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <Icon key={i} name="star" size={14} style={{ color: i < r.rating ? "var(--ih-warn)" : "var(--ih-ink-30)" }} />
          ))}
          <span className="ih-mono" style={{ fontSize: 11, color: "var(--ih-ink-65)", marginLeft: 4 }}>{r.rating}.0</span>
        </div>
        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 6 }}>{r.title}</div>
        <p style={{ margin: "6px 0 10px", fontSize: 12, color: "var(--ih-ink-65)", lineHeight: 1.5 }}>"{r.body}"</p>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--ih-ink-50)", paddingTop: 8, borderTop: "1px dashed var(--ih-line)" }}>
          <span>{r.customer}</span>
          <span className="ih-mono">{r.booking.label}</span>
        </div>
      </div>

      <div className="ih-card" style={{ padding: "10px 12px", marginBottom: 12, background: r.publishableByDefault ? "var(--ih-ok-soft)" : "var(--ih-warn-soft)", display: "flex", gap: 8, alignItems: "center" }}>
        <Icon name="check" size={12} style={{ color: r.publishableByDefault ? "var(--ih-ok)" : "var(--ih-warn)" }} />
        <span style={{ fontSize: 11.5, color: "var(--ih-ink)" }}>
          {r.publishableByDefault ? "Auto-publishable (≥ 4★ threshold)" : "Held for moderation"}
        </span>
      </div>

      <div style={{ display: "grid", gap: 6 }}>
        <button className="ih-btn ih-btn-accent" style={{ height: 36, justifyContent: "center" }}
          onClick={() => setMode(m => m === "reply" ? null : "reply")}>
          <Icon name="chat" size={12} /> Reply publicly
        </button>
        <div style={{ display: "flex", gap: 6 }}>
          <button className="ih-btn ih-btn-ghost ih-btn-sm" style={{ flex: 1 }}
            onClick={() => onAction("Decline-to-publish recorded", "warn")}>
            <Icon name="x" size={11} /> Decline
          </button>
          <button className="ih-btn ih-btn-ghost ih-btn-sm" style={{ flex: 1 }}
            onClick={() => onAction("Shared with team", "ok")}>
            <Icon name="users" size={11} /> Share team
          </button>
        </div>
      </div>

      {mode === "reply" && (
        <InlineReply
          placeholder={`Public response to ${item.who.name.split(" ")[0]}…`}
          primaryLabel="Publish reply"
          onSend={(b) => { onAction(`Reply published · ${b.slice(0, 28)}…`, "ok"); setMode(null) }}
          onCancel={() => setMode(null)}
        />
      )}
    </>
  )
}

function AuditDetail({ item, onAction }: { item: AuditItem; onAction: (label: string, tone: ToastTone) => void }) {
  const a = item.payload
  return (
    <>
      <div className="ih-card" style={{ padding: 14, marginBottom: 12, background: "var(--ih-surface)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
          <span className="ih-pill" style={{ fontSize: 9, padding: "2px 6px", fontFamily: "var(--ih-font-mono)" }}>
            {a.severity}
          </span>
          <span className="ih-mono" style={{ fontSize: 11, color: "var(--ih-accent)" }}>{a.action}</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 6, fontSize: 11.5 }}>
          <span style={{ color: "var(--ih-ink-50)" }}>Entity</span>
          <span className="ih-mono">{a.entity}</span>
          <span style={{ color: "var(--ih-ink-50)" }}>IP address</span>
          <span className="ih-mono">{a.ip}</span>
          <span style={{ color: "var(--ih-ink-50)" }}>Change</span>
          <span style={{ fontFamily: "var(--ih-font-mono)", fontSize: 10.5, textAlign: "right", maxWidth: 220, overflowWrap: "break-word" }}>{a.diff}</span>
        </div>
      </div>

      <div style={{ display: "grid", gap: 6 }}>
        <Link href="/platform/audit-log" className="ih-btn ih-btn-accent" style={{ height: 36, justifyContent: "center", textDecoration: "none" }}>
          <Icon name="audit" size={12} /> Open audit trail
        </Link>
        <div style={{ display: "flex", gap: 6 }}>
          <button className="ih-btn ih-btn-ghost ih-btn-sm" style={{ flex: 1 }}
            onClick={() => onAction("Acknowledged", "muted")}>
            <Icon name="check" size={11} /> Acknowledge
          </button>
          <button className="ih-btn ih-btn-ghost ih-btn-sm" style={{ flex: 1 }}
            onClick={() => onAction("Investigation started", "warn")}>
            <Icon name="search" size={11} /> Investigate
          </button>
        </div>
      </div>
    </>
  )
}

function PipelineDetail({ item, onAction }: { item: PipelineItem; onAction: (label: string, tone: ToastTone) => void }) {
  const d = item.payload
  return (
    <>
      <div className="ih-card" style={{ padding: 14, marginBottom: 12, background: "var(--ih-surface)" }}>
        <div className="ih-eyebrow" style={{ marginBottom: 6 }}>Deal · /{d.dealId}</div>
        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 10 }}>{d.dealName}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <span className="ih-pill" style={{ fontSize: 9, padding: "2px 6px" }}>{d.fromStage}</span>
          <Icon name="arrowRight" size={12} style={{ color: "var(--ih-ink-40)" }} />
          <span className="ih-pill ih-pill-ok" style={{ fontSize: 9, padding: "2px 6px" }}>{d.toStage}</span>
        </div>
        <div className="ih-serif ih-num" style={{ fontSize: 22, color: "var(--ih-ok)", lineHeight: 1 }}>
          {d.currency}{d.value.toLocaleString()}
        </div>
        {d.autoEngagementCreated && (
          <div style={{ marginTop: 10, padding: "8px 10px", background: "var(--ih-info-soft)", borderRadius: 4, fontSize: 11, color: "var(--ih-ink)", display: "flex", gap: 6, alignItems: "center" }}>
            <Icon name="bolt" size={11} style={{ color: "var(--ih-info)" }} />
            Auto-engagement created
          </div>
        )}
      </div>

      <div style={{ display: "grid", gap: 6 }}>
        {d.engagementId && (
          <Link href={`/platform/clients/${d.engagementId}`} className="ih-btn ih-btn-accent" style={{ height: 36, justifyContent: "center", textDecoration: "none" }}>
            <Icon name="handshake" size={12} /> Open new engagement
          </Link>
        )}
        <Link href={`/platform/pipeline/${d.dealId}`} className="ih-btn ih-btn-ghost" style={{ height: 32, textDecoration: "none", justifyContent: "flex-start" }}>
          <Icon name="pipeline" size={11} /> Open deal
        </Link>
        <button className="ih-btn ih-btn-quiet" style={{ height: 32 }}
          onClick={() => onAction(`Welcome email sent to ${d.dealName}`, "ok")}>
          <Icon name="mail" size={11} /> Send welcome
        </button>
      </div>
    </>
  )
}

function FormDetail({ item, onAction }: { item: FormItem; onAction: (label: string, tone: ToastTone) => void }) {
  const f = item.payload
  return (
    <>
      <div className="ih-card" style={{ padding: 14, marginBottom: 12, background: "var(--ih-surface)" }}>
        <div className="ih-eyebrow" style={{ marginBottom: 8 }}>{f.formName} · /{f.submissionId}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 11.5 }}>
          {f.fields.map(fld => (
            <div key={fld.label} style={{ display: "grid", gridTemplateColumns: "100px 1fr", gap: 8 }}>
              <span style={{ color: "var(--ih-ink-50)" }}>{fld.label}</span>
              <span style={{ color: "var(--ih-ink)", overflowWrap: "anywhere" }}>{fld.value}</span>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px dashed var(--ih-line)", fontSize: 10.5, color: "var(--ih-ink-50)" }}>
          Routed to: <span className="ih-mono">{f.routedTo}</span>
        </div>
      </div>

      <div style={{ display: "grid", gap: 6 }}>
        <Link href={`/platform/forms/submissions/${f.submissionId}`} className="ih-btn ih-btn-accent" style={{ height: 36, justifyContent: "center", textDecoration: "none" }}>
          <Icon name="file" size={12} /> Open submission
        </Link>
        <div style={{ display: "flex", gap: 6 }}>
          <button className="ih-btn ih-btn-ghost ih-btn-sm" style={{ flex: 1 }}
            onClick={() => onAction("Reassigned to pipeline owner", "info")}>
            <Icon name="users" size={11} /> Reassign
          </button>
          <button className="ih-btn ih-btn-quiet ih-btn-sm" style={{ flex: 1 }}
            onClick={() => onAction("Submission archived", "muted")}>
            <Icon name="folder" size={11} /> Archive
          </button>
        </div>
      </div>
    </>
  )
}

function BookingDetail({ item, onAction }: { item: BookingItem; onAction: (label: string, tone: ToastTone) => void }) {
  const b = item.payload
  return (
    <>
      <div className="ih-card" style={{ padding: 14, marginBottom: 12, background: "var(--ih-surface)" }}>
        <div className="ih-eyebrow" style={{ marginBottom: 6 }}>Booking · /{b.bookingId}</div>
        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 10 }}>{b.title}</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 6, fontSize: 11.5 }}>
          <span style={{ color: "var(--ih-ink-50)" }}>Customer</span>
          <span>{b.customer}</span>
          <span style={{ color: "var(--ih-ink-50)" }}>Starts</span>
          <span className="ih-mono">{b.startsAt}</span>
          <span style={{ color: "var(--ih-ink-50)" }}>Ends</span>
          <span className="ih-mono">{b.endsAt}</span>
          <span style={{ color: "var(--ih-ink-50)" }}>Where</span>
          <span>{b.location}</span>
        </div>
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px dashed var(--ih-line)" }}>
          <div className="ih-eyebrow" style={{ fontSize: 8, marginBottom: 6 }}>Attendees ({b.attendees.length})</div>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {b.attendees.map(a => (
              <span key={a} className="ih-pill" style={{ fontSize: 10, padding: "2px 6px" }}>{a}</span>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gap: 6 }}>
        <Link href={`/platform/bookings/${b.bookingId}`} className="ih-btn ih-btn-accent" style={{ height: 36, justifyContent: "center", textDecoration: "none" }}>
          <Icon name="calendar" size={12} /> Open booking
        </Link>
        <div style={{ display: "flex", gap: 6 }}>
          <button className="ih-btn ih-btn-ghost ih-btn-sm" style={{ flex: 1 }}
            onClick={() => onAction("Reschedule flow opened", "info")}>
            <Icon name="refresh" size={11} /> Reschedule
          </button>
          <button className="ih-btn ih-btn-ghost ih-btn-sm" style={{ flex: 1 }}
            onClick={() => onAction("Internal notes added", "ok")}>
            <Icon name="chat" size={11} /> Add notes
          </button>
        </div>
      </div>
    </>
  )
}

/* ── Detail rail orchestrator ───────────────────────────────────────────── */

function DetailRail({ item, onAction }: { item: InboxItem; onAction: (msg: string, tone: ToastTone) => void }) {
  const titles = useMemo(() => {
    switch (item.type) {
      case "approval": return { eyebrow: `/${item.payload.invoice.id} · approval`, title: item.payload.title, accent: item.payload.subtitle }
      case "message":  return { eyebrow: `${item.who.role ?? ""} · message`, title: item.payload.threadTitle, accent: `${item.who.name}` }
      case "workflow": return { eyebrow: `/${item.payload.runId} · workflow`, title: item.payload.workflowName, accent: item.payload.state.toUpperCase() }
      case "payment":  return { eyebrow: `/${item.payload.invoiceId} · payment`, title: item.payload.customer, accent: `${item.payload.currency}${item.payload.amount.toLocaleString()}` }
      case "review":   return { eyebrow: `review · ${item.payload.customer}`, title: item.payload.title, accent: `${item.payload.rating}★` }
      case "audit":    return { eyebrow: `audit · ${item.payload.severity}`, title: item.payload.action, accent: item.payload.entity }
      case "pipeline": return { eyebrow: `/${item.payload.dealId} · pipeline`, title: item.payload.dealName, accent: `→ ${item.payload.toStage}` }
      case "form":     return { eyebrow: `/${item.payload.submissionId} · form`, title: item.payload.formName, accent: `routed to ${item.payload.routedTo}` }
      case "booking":  return { eyebrow: `/${item.payload.bookingId} · booking`, title: item.payload.title, accent: item.payload.startsAt }
    }
  }, [item])

  return (
    <aside key={item.id} className="animate-slide-in-right" style={{ borderLeft: "1px solid var(--ih-line)", background: "var(--ih-surface-2)", padding: 20, overflowY: "auto" }}>
      <span className="ih-eyebrow">{titles.eyebrow}</span>
      <h2 className="ih-serif" style={{ margin: "6px 0 14px", fontSize: 22, lineHeight: 1.15 }}>
        {titles.title}<br />
        <span className="ih-italic-red">{titles.accent}</span>
      </h2>

      {item.type === "approval" && <ApprovalDetail item={item} onAction={onAction} />}
      {item.type === "message"  && <MessageDetail  item={item} onAction={onAction} />}
      {item.type === "workflow" && <WorkflowDetail item={item} onAction={onAction} />}
      {item.type === "payment"  && <PaymentDetail  item={item} onAction={onAction} />}
      {item.type === "review"   && <ReviewDetail   item={item} onAction={onAction} />}
      {item.type === "audit"    && <AuditDetail    item={item} onAction={onAction} />}
      {item.type === "pipeline" && <PipelineDetail item={item} onAction={onAction} />}
      {item.type === "form"     && <FormDetail     item={item} onAction={onAction} />}
      {item.type === "booking"  && <BookingDetail  item={item} onAction={onAction} />}

      <div className="ih-hr" style={{ margin: "20px 0 12px" }} />
      <div className="ih-eyebrow" style={{ marginBottom: 8 }}>Related</div>
      <div style={{ display: "grid", gap: 6, fontSize: 12 }}>
        {item.related.map((r, i) => (
          <Link key={i} href={r.href}
            style={{ display: "flex", gap: 8, alignItems: "center", color: "var(--ih-ink)", textDecoration: "none", padding: "6px 8px", borderRadius: "var(--ih-r-sm)", transition: "background 0.15s" }}
            onMouseEnter={e => { e.currentTarget.style.background = "var(--ih-surface)" }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent" }}>
            <Icon name={RELATED_ICON[r.type] ?? "link"} size={11} style={{ color: "var(--ih-ink-50)" }} />
            <span style={{ flex: 1 }}>{r.label}</span>
            <Icon name="arrowUpRight" size={10} style={{ color: "var(--ih-ink-40)" }} />
          </Link>
        ))}
      </div>
    </aside>
  )
}

/* ── Page ────────────────────────────────────────────────────────────────── */

type FilterKey = "all" | "unread" | "mentions" | "assigned"

interface FilterState { kind: "filter"; value: FilterKey }
interface SourceState { kind: "source"; value: string }
interface ClientState { kind: "client"; value: string }
type ActiveFilter = FilterState | SourceState | ClientState

export default function InboxPage() {
  const [active, setActive] = useState<ActiveFilter>({ kind: "filter", value: "all" })
  const [readIds, setReadIds] = useState<Set<string>>(new Set())
  const [selectedId, setSelectedId] = useState<string | null>("inb-approval-2041")
  const [toast, setToast] = useState<{ msg: string; tone: ToastTone } | null>(null)

  const query: InboxFilters = useMemo(() => {
    if (active.kind === "filter")  return { filter: active.value }
    if (active.kind === "source")  return { source: active.value }
    if (active.kind === "client")  return { client: active.value }
    return {}
  }, [active])

  const allItems = mockInbox.list(query)
  const counts = mockInbox.counts()

  /* Apply local read-state overrides */
  const items = allItems.map(it => readIds.has(it.id) ? { ...it, unread: false } : it)

  /* Group items by bucket (computed in mock layer to keep render pure) */
  const grouped = useMemo(() => {
    const groups: Record<string, InboxItem[]> = {}
    const labels: string[] = []

    const needsYou = items.filter(it => it.unread && (it.type === "approval" || it.type === "workflow" || it.type === "message"))
    if (needsYou.length) { labels.push(`Needs you · ${needsYou.length}`); groups[`Needs you · ${needsYou.length}`] = needsYou }

    const bucketLabel: Record<string, string> = { today: "Today", yesterday: "Yesterday", earlier: "Earlier" }
    const rest = items.filter(it => !needsYou.includes(it))
    for (const it of rest) {
      const label = bucketLabel[it.bucket] ?? "Earlier"
      if (!groups[label]) { groups[label] = []; labels.push(label) }
      groups[label].push(it)
    }

    return { labels, groups }
  }, [items])

  const selected = items.find(i => i.id === selectedId) ?? null

  function handleSelect(id: string) {
    setSelectedId(id)
    setReadIds(prev => { const next = new Set(prev); next.add(id); return next })
  }

  function fireAction(msg: string, tone: ToastTone = "ok") {
    setToast({ msg, tone })
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: selected ? "260px 1fr 380px" : "260px 1fr", height: "calc(100vh - 120px)", margin: "-24px -24px 0" }}>
      {/* Source rail */}
      <div style={{ borderRight: "1px solid var(--ih-line)", padding: "20px 12px", background: "var(--ih-surface-2)", overflowY: "auto" }}>
        <div className="ih-eyebrow" style={{ padding: "0 8px 8px" }}>Filters</div>
        {([
          ["All",            String(counts.total),    "all"],
          ["Unread",         String(counts.unread),   "unread"],
          ["Mentions",       String(counts.mentions), "mentions"],
          ["Assigned to me", String(counts.assigned), "assigned"],
        ] as [string, string, FilterKey][]).map(([l, c, key]) => {
          const a = active.kind === "filter" && active.value === key
          return (
            <div key={l} onClick={() => setActive({ kind: "filter", value: key })}
              style={{
                display: "flex", justifyContent: "space-between", padding: "6px 10px",
                borderRadius: 6, fontSize: 12, fontWeight: a ? 500 : 400,
                background: a ? "var(--ih-surface)" : "transparent",
                border: a ? "1px solid var(--ih-line)" : "1px solid transparent", cursor: "pointer",
              }}>
              <span>{l}</span><span className="ih-mono" style={{ color: "var(--ih-ink-40)", fontSize: 10 }}>{c}</span>
            </div>
          )
        })}

        <div className="ih-eyebrow" style={{ padding: "16px 8px 8px" }}>By source</div>
        {([
          ["check",    "Approval",      "accent"],
          ["chat",     "Portal reply",  "info"],
          ["bolt",     "Workflow",      "warn"],
          ["money",    "Payment",       "ok"],
          ["audit",    "Audit",         "muted"],
          ["star",     "Review",        "ok"],
          ["file",     "Form",          "muted"],
          ["calendar", "Booking",       "info"],
          ["pipeline", "Pipeline",      "info"],
        ] as [IconName, string, InboxTone][]).map(([i, l, t]) => {
          const a = active.kind === "source" && active.value === l
          const c = counts.bySource[l] ?? 0
          if (c === 0) return null
          return (
            <div key={l} onClick={() => setActive({ kind: "source", value: l })}
              style={{
                display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", fontSize: 12,
                color: a ? "var(--ih-ink)" : "var(--ih-ink-65)", cursor: "pointer",
                background: a ? "var(--ih-surface)" : "transparent", borderRadius: 6, fontWeight: a ? 500 : 400,
              }}>
              <Icon name={i} size={12} style={{ color: toneColor(t) }} />
              <span style={{ flex: 1 }}>{l}</span>
              <span className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)" }}>{c}</span>
            </div>
          )
        })}

        <div className="ih-eyebrow" style={{ padding: "16px 8px 8px" }}>By client</div>
        {Object.entries(counts.byClient).filter(([, c]) => c > 0).map(([n, c]) => {
          const a = active.kind === "client" && active.value === n
          return (
            <div key={n} onClick={() => setActive({ kind: "client", value: n })}
              style={{
                display: "flex", alignItems: "center", gap: 8, padding: "5px 10px", fontSize: 12,
                color: a ? "var(--ih-ink)" : "var(--ih-ink-65)", cursor: "pointer",
                background: a ? "var(--ih-surface)" : "transparent", borderRadius: 6, fontWeight: a ? 500 : 400,
              }}>
              <div className="ih-avatar" style={{ width: 18, height: 18, fontSize: 8 }}>{n[0]}</div>
              <span style={{ flex: 1 }}>{n}</span>
              <span className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)" }}>{c}</span>
            </div>
          )
        })}
      </div>

      {/* Stream */}
      <div style={{ overflowY: "auto" }} className="scrollbar-thin">
        <div style={{ padding: "20px 24px 12px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
          <div>
            <div className="ih-eyebrow">{items.length} event{items.length !== 1 ? "s" : ""} · last 24h · <span style={{ color: "var(--ih-accent)" }}>★ Demo data</span></div>
            <h1 className="ih-serif" style={{ margin: "6px 0 0", fontSize: 32 }}>Inbox. <span className="ih-italic-red">One</span> stream, every source.</h1>
          </div>
          {readIds.size > 0 && (
            <button className="ih-btn ih-btn-quiet ih-btn-sm" onClick={() => { setReadIds(new Set()); fireAction("Marked as unread", "muted") }}>
              <Icon name="refresh" size={11} /> Mark all unread
            </button>
          )}
        </div>

        {items.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--ih-ink-40)", fontSize: 12 }}>
            Inbox empty for this filter.{" "}
            <button onClick={() => setActive({ kind: "filter", value: "all" })} className="ih-btn ih-btn-quiet ih-btn-sm" style={{ height: 22, marginLeft: 4 }}>Show all</button>
          </div>
        ) : (
          grouped.labels.map(label => (
            <div key={label}>
              <div className="ih-eyebrow" style={{ padding: "16px 24px 6px", borderTop: "1px solid var(--ih-line)" }}>{label}</div>
              {grouped.groups[label].map(it => {
                const isSelected = it.id === selectedId
                return (
                  <div key={it.id} onClick={() => handleSelect(it.id)} style={{
                    display: "grid", gridTemplateColumns: "24px 24px 1fr auto", gap: 10, alignItems: "center",
                    padding: "12px 24px", borderTop: "1px solid var(--ih-line)",
                    background: isSelected ? "var(--ih-accent-soft-2)" : it.unread ? "var(--ih-surface)" : "transparent",
                    borderLeft: isSelected ? "2px solid var(--ih-accent)" : "2px solid transparent",
                    cursor: "pointer", transition: "background 0.12s",
                  }}
                    onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = "var(--ih-surface-2)" }}
                    onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = it.unread ? "var(--ih-surface)" : "transparent" }}>
                    {it.unread && !isSelected
                      ? <span style={{ width: 6, height: 6, background: "var(--ih-accent)", borderRadius: 999 }} />
                      : <span />}
                    <Icon name={TYPE_ICON[it.type]} size={13} style={{ color: toneColor(it.tone) }} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, marginBottom: 2 }}>
                        <span className="ih-mono" style={{ fontSize: 9.5, color: "var(--ih-ink-40)", textTransform: "uppercase", letterSpacing: "0.1em", marginRight: 8 }}>{it.source}</span>
                        <strong style={{ fontWeight: 500 }}>{it.who.name}</strong>
                      </div>
                      <div style={{ fontSize: 12.5, color: "var(--ih-ink-65)", lineHeight: 1.4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{it.preview}</div>
                      <div className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)", marginTop: 3 }}>{it.meta}</div>
                    </div>
                    <span className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)" }}>↵</span>
                  </div>
                )
              })}
            </div>
          ))
        )}
      </div>

      {selected && <DetailRail item={selected} onAction={fireAction} />}
      {toast && <NotificationToast message={toast.msg} tone={toast.tone} onDismiss={() => setToast(null)} />}
    </div>
  )
}
