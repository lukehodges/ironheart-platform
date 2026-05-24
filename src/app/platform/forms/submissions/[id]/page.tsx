"use client"

import Link from "next/link"
import { Icon } from "@/components/shell"

/* ── Demo Data ─────────────────────────────────────────────────────────── */

type FieldResponse = {
  label: string; type: string; value: string; required: boolean;
}

const SUBMISSION = {
  id: "sub-1042",
  formName: "Owner / Director Questionnaire",
  formId: "tpl-1",
  submittedBy: "Sarah Chen",
  email: "sarah@northwind.io",
  client: "Northwind Traders",
  submittedAt: "May 8, 2026 at 2:14 PM",
  completedIn: "18 min",
  status: "complete" as const,
  booking: { id: "bk-9281", label: "Strategy session · May 14" },
  engagement: { id: "eng-204", label: "Growth Advisory · Northwind" },
}

const RESPONSES: FieldResponse[] = [
  { label: "Full name", type: "text", value: "Sarah Chen", required: true },
  { label: "Role / Title", type: "text", value: "CEO", required: true },
  { label: "Years in current role", type: "number", value: "8", required: true },
  { label: "What is your primary business goal for the next 12 months?", type: "textarea", value: "Scale revenue from $2.4M to $4M while maintaining current margins and team culture. We want to expand into the US East Coast market and hire 6 new team members by Q3.", required: true },
  { label: "How would you rate your current operational efficiency?", type: "rating", value: "4", required: true },
  { label: "Biggest challenge facing the business right now", type: "select", value: "Talent retention", required: true },
  { label: "Do you have a documented strategic plan?", type: "boolean", value: "Yes", required: false },
  { label: "What keeps you up at night about the business?", type: "textarea", value: "Worried about losing key team members to competitors offering remote-first policies. Also concerned about cash conversion cycle lengthening — our DSO has crept from 32 to 48 days over the last two quarters.", required: false },
  { label: "Preferred engagement start date", type: "date", value: "June 1, 2026", required: false },
]

const STATUS_TONE: Record<string, string> = { complete: "ok", partial: "warn", expired: "danger" }

/* ── Page ──────────────────────────────────────────────────────────────── */

export default function FormSubmissionDetailPage() {
  return (
    <div style={{ padding: "24px 28px 48px", maxWidth: 900, margin: "0 auto" }}>
      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <Link href="/platform/forms" style={{ display: "flex", alignItems: "center", gap: 4, textDecoration: "none", color: "var(--ih-ink-50)" }}>
          <Icon name="chevronLeft" size={12}/>
          <span className="ih-eyebrow">Forms</span>
        </Link>
        <Icon name="chevronRight" size={10} style={{ color: "var(--ih-ink-30)" }}/>
        <span className="ih-eyebrow">Submissions</span>
        <Icon name="chevronRight" size={10} style={{ color: "var(--ih-ink-30)" }}/>
        <span className="ih-eyebrow" style={{ color: "var(--ih-accent)" }}>{SUBMISSION.id}</span>
        <span className="ih-eyebrow" style={{ marginLeft: 8, color: "var(--ih-accent)" }}>★</span>
      </div>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, gap: 24, flexWrap: "wrap" }}>
        <div>
          <h1 className="ih-serif" style={{ margin: 0, fontSize: 32, lineHeight: 1 }}>{SUBMISSION.formName}</h1>
          <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 12, fontSize: 12, color: "var(--ih-ink-65)" }}>
            <span>Submitted by <strong style={{ color: "var(--ih-ink)" }}>{SUBMISSION.submittedBy}</strong></span>
            <span>&middot;</span>
            <span>{SUBMISSION.client}</span>
            <span>&middot;</span>
            <span className="ih-mono" style={{ fontSize: 11 }}>{SUBMISSION.submittedAt}</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <span className={`ih-pill ih-pill-${STATUS_TONE[SUBMISSION.status]}`}><span className={`ih-dot ih-dot-${STATUS_TONE[SUBMISSION.status]}`}/> {SUBMISSION.status}</span>
          <button className="ih-btn ih-btn-ghost ih-btn-sm"><Icon name="download" size={12}/> Export PDF</button>
          <button className="ih-btn ih-btn-quiet ih-btn-sm" style={{ color: "var(--ih-danger)" }}><Icon name="x" size={11}/> Delete</button>
        </div>
      </div>

      {/* Info strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 24 }}>
        {[
          { l: "Submitted by", v: SUBMISSION.submittedBy, sub: SUBMISSION.email, icon: "user" as const },
          { l: "Client", v: SUBMISSION.client, sub: "Active engagement", icon: "building" as const },
          { l: "Completed in", v: SUBMISSION.completedIn, sub: "Avg for this form: 12m", icon: "clock" as const },
          { l: "Responses", v: `${RESPONSES.length} of ${RESPONSES.length + 1}`, sub: "1 signature field", icon: "check" as const },
        ].map((s) => (
          <div key={s.l} className="ih-card" style={{ padding: "12px 14px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
              <span className="ih-eyebrow">{s.l}</span>
              <Icon name={s.icon} size={12} style={{ color: "var(--ih-ink-30)" }} />
            </div>
            <div style={{ fontSize: 14, fontWeight: 500 }}>{s.v}</div>
            <div className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)", marginTop: 2 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Responses */}
      <div className="ih-card" style={{ overflow: "hidden", marginBottom: 20 }}>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--ih-line)" }}>
          <span className="ih-eyebrow">Responses</span>
          <h3 style={{ margin: "2px 0 0", fontSize: 15, fontWeight: 600 }}>Field-by-field answers</h3>
        </div>

        <div style={{ padding: 0 }}>
          {RESPONSES.map((r, i) => (
            <div key={i} style={{ padding: "14px 18px", borderTop: i === 0 ? "0" : "1px solid var(--ih-line)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span className="ih-mono" style={{ fontSize: 9, color: "var(--ih-ink-30)" }}>{i + 1}</span>
                  <span style={{ fontSize: 12, fontWeight: 500 }}>{r.label}</span>
                  {r.required && <span style={{ fontSize: 9, color: "var(--ih-danger)" }}>*</span>}
                </div>
                <span className="ih-mono" style={{ fontSize: 9, color: "var(--ih-ink-40)", textTransform: "uppercase" }}>{r.type}</span>
              </div>

              {/* Render value based on type */}
              {r.type === "rating" ? (
                <div style={{ display: "flex", gap: 3, marginTop: 2 }}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Icon key={n} name="star" size={16} style={{ color: n <= Number(r.value) ? "var(--ih-warn)" : "var(--ih-ink-30)" }}/>
                  ))}
                  <span className="ih-mono" style={{ fontSize: 11, color: "var(--ih-ink-65)", marginLeft: 6 }}>{r.value}/5</span>
                </div>
              ) : r.type === "boolean" ? (
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Icon name={r.value === "Yes" ? "check" : "x"} size={13} style={{ color: r.value === "Yes" ? "var(--ih-ok)" : "var(--ih-danger)" }}/>
                  <span style={{ fontSize: 13 }}>{r.value}</span>
                </div>
              ) : r.type === "textarea" ? (
                <div style={{ fontSize: 13, lineHeight: 1.6, color: "var(--ih-ink)", padding: "6px 0", whiteSpace: "pre-wrap" }}>
                  {r.value}
                </div>
              ) : (
                <div style={{ fontSize: 13, color: "var(--ih-ink)" }}>{r.value}</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Signature section */}
      <div className="ih-card" style={{ padding: 18, marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div>
            <span className="ih-eyebrow">Signature</span>
            <h3 style={{ margin: "2px 0 0", fontSize: 15, fontWeight: 600 }}>Digital signature captured</h3>
          </div>
          <span className="ih-pill ih-pill-ok"><span className="ih-dot ih-dot-ok"/> Verified</span>
        </div>
        <div style={{ height: 80, background: "var(--ih-surface-2)", borderRadius: 8, border: "1px solid var(--ih-line)", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
          {/* Simulated signature */}
          <svg width="200" height="50" viewBox="0 0 200 50" style={{ opacity: 0.7 }}>
            <path d="M10 35 Q30 10 50 30 Q70 50 90 25 Q110 5 130 30 Q140 40 150 30 Q160 20 170 25 Q180 30 190 20" stroke="var(--ih-ink)" strokeWidth="1.5" fill="none"/>
          </svg>
          <div className="ih-mono" style={{ position: "absolute", bottom: 6, right: 10, fontSize: 9, color: "var(--ih-ink-40)" }}>Sarah Chen &middot; May 8, 2026 2:14 PM</div>
        </div>
      </div>

      {/* Related records */}
      <div className="ih-card" style={{ padding: 18 }}>
        <div className="ih-eyebrow" style={{ marginBottom: 10 }}>Related records</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Link href="/platform/bookings/bk-9281" style={{ textDecoration: "none", color: "inherit" }}>
            <div className="ih-card" style={{ padding: 12, display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
              <Icon name="calendar" size={14} style={{ color: "var(--ih-accent)" }}/>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 500 }}>{SUBMISSION.booking.label}</div>
                <div className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)" }}>{SUBMISSION.booking.id}</div>
              </div>
              <Icon name="arrowUpRight" size={11} style={{ color: "var(--ih-ink-30)" }}/>
            </div>
          </Link>
          <Link href="/platform/clients/eng-204" style={{ textDecoration: "none", color: "inherit" }}>
            <div className="ih-card" style={{ padding: 12, display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
              <Icon name="handshake" size={14} style={{ color: "var(--ih-accent)" }}/>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 500 }}>{SUBMISSION.engagement.label}</div>
                <div className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)" }}>{SUBMISSION.engagement.id}</div>
              </div>
              <Icon name="arrowUpRight" size={11} style={{ color: "var(--ih-ink-30)" }}/>
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}
