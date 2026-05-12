"use client"

import { useState } from "react"
import { NotificationToast } from "@/components/shared"
import { Icon } from "@/components/shell"

/* -- Data ----------------------------------------------------------------- */
const SYSLOG_ROWS = [
  { sev: "WARNING",  t: "10:42:18",    actor: { name: "Luke Hodges", role: "owner" },     action: "ENGAGEMENT.STAGE_CHANGE",      entity: "ENG-0027", diff: "AUDITING → REPORTING",              ip: "82.14.12.4" },
  { sev: "INFO",     t: "10:42:17",    actor: { name: "system",      role: "workflow" },   action: "AUDIT_REPORT.GENERATE",        entity: "AR-0027",  diff: "status: NULL → DRAFT",             ip: "—" },
  { sev: "INFO",     t: "10:39:02",    actor: { name: "Luke Hodges", role: "owner" },     action: "FINDING.CREATE",               entity: "F-0431",   diff: "OPS · \u2018Shift handoff via WhatsApp’", ip: "82.14.12.4" },
  { sev: "INFO",     t: "10:21:55",    actor: { name: "Sarah Chen",  role: "client" },    action: "APPROVAL.GRANT",               entity: "DEL-0099", diff: "PENDING → ACCEPTED",               ip: "212.45.9.18" },
  { sev: "INFO",     t: "09:11:30",    actor: { name: "system",      role: "workflow" },   action: "INVOICE.CREATE",               entity: "NW-002",   diff: "amount: £6,125 · status: SENT", ip: "—" },
  { sev: "ERROR",    t: "08:54:12",    actor: { name: "system",      role: "scheduler" }, action: "WORKFLOW.RUN_FAILED",           entity: "WF-021",   diff: "step 3 timeout · retry 1/3",       ip: "—" },
  { sev: "WARNING",  t: "Wed 16:24",   actor: { name: "Luke Hodges", role: "owner" },     action: "PERMISSION.IMPERSONATE",       entity: "USR-209",  diff: "started · target Sarah Chen",      ip: "82.14.12.4" },
  { sev: "INFO",     t: "Wed 14:02",   actor: { name: "Tom Hardy",   role: "client_admin" }, action: "USER.INVITE",               entity: "USR-213",  diff: "tom@northwind.co → portal_viewer",  ip: "212.45.9.18" },
  { sev: "INFO",     t: "Wed 11:18",   actor: { name: "Priya Patel", role: "staff" },     action: "DELIVERABLE.UPLOAD",           entity: "DEL-0098", diff: "file: workflow-gap-v3.pdf · 4.2MB", ip: "82.14.12.4" },
  { sev: "CRITICAL", t: "Tue 22:01",   actor: { name: "—",      role: "external" },  action: "AUTH.LOGIN_FAILED",            entity: "USR-209",  diff: "5 attempts · IP blocked 1h",       ip: "104.28.12.9" },
  { sev: "INFO",     t: "Tue 18:33",   actor: { name: "Alex Wong",   role: "staff" },     action: "AUDIT_SESSION.UPDATE_LENS",    entity: "AS-0027",  diff: "TECHNOLOGY · rag: NULL → AMBER", ip: "82.14.12.4" },
  { sev: "INFO",     t: "Tue 14:00",   actor: { name: "system",      role: "billing" },   action: "PAYMENT.RECEIVED",             entity: "INV-NW-001", diff: "Stripe · £12,250 · card_visa", ip: "—" },
]

const SEV_TONE: Record<string, { c: string; bold?: boolean }> = {
  DEBUG:    { c: "var(--ih-ink-40)" },
  INFO:     { c: "var(--ih-ink-65)" },
  WARNING:  { c: "#B8821F" },
  ERROR:    { c: "#C0392B" },
  CRITICAL: { c: "#C0392B", bold: true },
}

/* -- Page ----------------------------------------------------------------- */
export default function AuditSystemLogPage() {
  const [toast, setToast] = useState<{message: string; tone?: string} | null>(null)
  const [filters, setFilters] = useState(["Severity ≥ INFO", "Last 24h", "All actors", "All entities"])
  return (
    <div style={{ padding: "20px 28px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 16 }}>
        <div>
          <div className="ih-eyebrow" style={{ marginBottom: 6 }}>System {"·"} Audit log {"·"} the other audit</div>
          <h1 className="ih-serif" style={{ fontSize: 28, margin: 0 }}>Every <span className="ih-italic-red">change</span>, recorded.</h1>
          <div style={{ fontSize: 12, color: "var(--ih-ink-50)", marginTop: 6 }}>
            The RBAC + compliance trail. Distinct from the per-engagement <strong>Audit Workspace</strong>. Retained 7 years. SOC-2 ready.
          </div>
        </div>
        <div style={{ display: "flex", gap: 18, fontSize: 11 }}>
          {[
            { l: "Events today",    v: "1,247",   tone: "var(--ih-ink)" },
            { l: "Warnings",        v: "12",      tone: "#B8821F" },
            { l: "Errors / 24h",    v: "2",       tone: "#C0392B" },
            { l: "Logins",          v: "48",      tone: "var(--ih-ink-65)" },
          ].map((s) => (
            <div key={s.l} style={{ textAlign: "right" }}>
              <div className="ih-eyebrow" style={{ fontSize: 9, marginBottom: 4 }}>{s.l}</div>
              <div className="ih-serif ih-num" style={{ fontSize: 22, color: s.tone, lineHeight: 1 }}>{s.v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Filter chips */}
      <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
        <span className="ih-eyebrow" style={{ marginRight: 6 }}>Filters</span>
        <span className="ih-pill" style={{ fontSize: 10 }}>Severity {"≥"} INFO {"×"}</span>
        <span className="ih-pill" style={{ fontSize: 10 }}>Last 24h {"×"}</span>
        <span className="ih-pill" style={{ fontSize: 10 }}>All actors {"×"}</span>
        <span className="ih-pill" style={{ fontSize: 10 }}>All entities {"×"}</span>
        <button className="ih-btn ih-btn-quiet ih-btn-sm" style={{ height: 22 }} onClick={() => setToast({message: "Add filter dialog coming soon", tone: "info"})}><Icon name="plus" size={10} /> Add</button>
        <div style={{ flex: 1 }} />
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10.5, color: "var(--ih-ink-50)" }}>
          <Icon name="sparkles" size={10} style={{ color: "var(--ih-accent)" }} />
          Try: &ldquo;show me Sarah&apos;s actions on ENG-0027 since Friday&rdquo;
        </div>
      </div>

      {/* Log table */}
      <div className="ih-card" style={{ overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11.5, fontFamily: "var(--ih-font-mono)" }}>
          <thead>
            <tr style={{ background: "var(--ih-surface-2)", borderBottom: "1px solid var(--ih-line)" }}>
              {["sev", "when", "actor", "action", "entity", "diff", "ip"].map((h) => (
                <th key={h} style={{ textAlign: "left", padding: "8px 12px", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--ih-ink-40)", fontWeight: 500 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SYSLOG_ROWS.map((r, i) => {
              const t = SEV_TONE[r.sev] ?? SEV_TONE.INFO
              return (
                <tr key={i} style={{ borderBottom: "1px solid var(--ih-line)" }}>
                  <td style={{ padding: "9px 12px", color: t.c, fontWeight: t.bold ? 700 : 500, fontSize: 10 }}>
                    {r.sev === "CRITICAL" ? "● ● ●" : r.sev === "ERROR" ? "● ●" : r.sev === "WARNING" ? "● " : "·"} {r.sev}
                  </td>
                  <td style={{ padding: "9px 12px", color: "var(--ih-ink-50)" }}>{r.t}</td>
                  <td style={{ padding: "9px 12px" }}>
                    <span style={{ color: "var(--ih-ink-90)" }}>{r.actor.name}</span>
                    <span style={{ color: "var(--ih-ink-40)", fontSize: 9.5, marginLeft: 4 }}>{"·"} {r.actor.role}</span>
                  </td>
                  <td style={{ padding: "9px 12px", color: "var(--ih-accent)" }}>{r.action}</td>
                  <td style={{ padding: "9px 12px", color: "var(--ih-ink-65)" }}>{r.entity}</td>
                  <td style={{ padding: "9px 12px", color: "var(--ih-ink-65)", fontFamily: "var(--ih-font-sans)" }}>{r.diff}</td>
                  <td style={{ padding: "9px 12px", color: "var(--ih-ink-40)" }}>{r.ip}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {toast && <NotificationToast message={toast.message} tone={toast.tone as any} onDismiss={() => setToast(null)} />}
    </div>
  )
}
