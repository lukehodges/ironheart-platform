"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { NotificationToast, DropdownMenu } from "@/components/shared"
import { Icon } from "@/components/shell"

/* ── Data ────────────────────────────────────────────────────────────────── */
const WEEKS = ["Mar 17", "Mar 24", "Mar 31", "Apr 07", "Apr 14", "Apr 21"]
const COL_W = 130

type Milestone = { id: string; title: string; status: string; start: number; span: number; deliverables: number; accepted: number; current?: boolean; items: { t: string; s: string }[] }

const MILESTONES: Milestone[] = [
  { id: "m1", title: "Discovery & kickoff", status: "COMPLETED", start: 0, span: 1.0, deliverables: 2, accepted: 2, items: [{ t: "Kickoff agenda + RACI", s: "ACCEPTED" }, { t: "Stakeholder map", s: "ACCEPTED" }] },
  { id: "m2", title: "Audit fieldwork", status: "COMPLETED", start: 1.0, span: 1.5, deliverables: 3, accepted: 3, items: [{ t: "Interview transcripts (12)", s: "ACCEPTED" }, { t: "Workflow inventory · raw", s: "ACCEPTED" }, { t: "Time-on-task spreadsheet", s: "ACCEPTED" }] },
  { id: "m3", title: "Audit findings & report", status: "IN_PROGRESS", start: 2.5, span: 1.0, deliverables: 4, accepted: 1, current: true, items: [{ t: "Findings deck (v2)", s: "ACCEPTED" }, { t: "Audit summary", s: "PENDING_APPROVAL" }, { t: "Workflow gap analysis", s: "DELIVERED" }, { t: "Recommendations memo", s: "PENDING" }] },
  { id: "m4", title: "Roadmap & retainer plan", status: "UPCOMING", start: 3.5, span: 1.0, deliverables: 2, accepted: 0, items: [{ t: "3-month roadmap", s: "PENDING" }, { t: "Retainer proposal v1", s: "PENDING" }] },
  { id: "m5", title: "Handover & close", status: "UPCOMING", start: 4.5, span: 1.0, deliverables: 2, accepted: 0, items: [{ t: "Handover doc + recordings", s: "PENDING" }, { t: "Engagement close-out", s: "PENDING" }] },
]

const STATUS_COLORS: Record<string, { color: string; label: string }> = {
  ACCEPTED: { color: "var(--ih-ok)", label: "Accepted" },
  DELIVERED: { color: "var(--ih-info)", label: "Delivered" },
  PENDING_APPROVAL: { color: "var(--ih-warn)", label: "Awaiting client" },
  PENDING: { color: "var(--ih-ink-30)", label: "Pending" },
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"]
const CASHFLOW = [
  { m: "Jan", paid: 0, expected: 0, recurring: false },
  { m: "Feb", paid: 0, expected: 0, recurring: false },
  { m: "Mar", paid: 12.25, expected: 0, recurring: false },
  { m: "Apr", paid: 0, expected: 6.125, recurring: false },
  { m: "May", paid: 0, expected: 6.125, recurring: false },
  { m: "Jun", paid: 0, expected: 4.2, recurring: true },
]

const INVOICES = [
  { n: "NW-001", desc: "Engagement deposit", amt: 12250, date: "Mar 20", paid: "Mar 22", status: "PAID", method: "Stripe · card" },
  { n: "NW-002", desc: "Audit findings (50%)", amt: 6125, date: "Apr 04", due: "Apr 18", status: "SENT", method: "Stripe · pending" },
  { n: "NW-003", desc: "Roadmap & handover", amt: 6125, date: "—", due: "On completion", status: "DRAFT", method: "Auto on milestone" },
]

/* ── Sub-components ──────────────────────────────────────────────────────── */

function StatusDot({ s }: { s: string }) {
  const m = STATUS_COLORS[s] ?? { color: "var(--ih-ink-30)", label: s }
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <span style={{ width: 6, height: 6, borderRadius: 999, background: m.color }} />
      <span className="ih-mono" style={{ fontSize: 9.5, color: "var(--ih-ink-50)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{m.label}</span>
    </div>
  )
}

function WorkView() {
  const [toast, setToast] = useState<{message: string; tone?: string} | null>(null)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set(["m3"]))
  const [workView, setWorkView] = useState<"gantt" | "board" | "list">("gantt")
  const toggle = (id: string) => setExpandedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })

  return (
    <div style={{ padding: "20px 28px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 18 }}>
        <div>
          <div className="ih-eyebrow" style={{ marginBottom: 6 }}>Work {"·"} milestones + deliverables + approvals, fused</div>
          <h1 className="ih-serif" style={{ fontSize: 28, margin: 0 }}>The <span className="ih-italic-red">work</span></h1>
          <div style={{ fontSize: 12, color: "var(--ih-ink-50)", marginTop: 6 }}>5 milestones {"·"} 13 deliverables {"·"} 8 accepted {"·"} 1 awaiting client</div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <div style={{ display: "flex", border: "1px solid var(--ih-line)", borderRadius: "var(--ih-r-md)", padding: 2, gap: 2 }}>
            {(["gantt", "board", "list"] as const).map(v => (
              <button key={v} onClick={() => setWorkView(v)} className={`ih-btn ${workView === v ? "ih-btn-sm" : "ih-btn-quiet ih-btn-sm"}`} style={{ height: 22, background: workView === v ? "var(--ih-surface-2)" : "transparent", border: 0, textTransform: "capitalize" }}>{v === "gantt" ? "Gantt" : v === "board" ? "Board" : "List"}</button>
            ))}
          </div>
          <button className="ih-btn ih-btn-quiet ih-btn-sm" onClick={() => setToast({message: "Hidden completed milestones", tone: "ok"})}><Icon name="filter" size={11} /> Hide done</button>
        </div>
      </div>

      {workView !== "gantt" ? (
        <div className="ih-card" style={{ padding: "48px 28px", textAlign: "center" }}>
          <Icon name={workView === "board" ? "grid" : "list"} size={24} style={{ color: "var(--ih-ink-30)", marginBottom: 12 }} />
          <div className="ih-serif" style={{ fontSize: 20, marginBottom: 8 }}>{workView === "board" ? "Board" : "List"} view</div>
          <p style={{ margin: 0, fontSize: 12, color: "var(--ih-ink-50)" }}>
            {workView === "board" ? "Kanban board view with milestones as columns and deliverables as cards." : "Flat list of all deliverables sorted by status and due date."}
          </p>
          <div className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)", marginTop: 12 }}>View switching is under development</div>
        </div>
      ) : (
      <div style={{ border: "1px solid var(--ih-line)", borderRadius: "var(--ih-r-xl)", background: "var(--ih-surface)", overflow: "hidden" }}>
        {/* Gantt header */}
        <div style={{ display: "flex", borderBottom: "1px solid var(--ih-line)", paddingLeft: 320, position: "sticky", top: 0, background: "var(--ih-bg)", zIndex: 2 }}>
          {WEEKS.map((w, i) => (
            <div key={w} style={{ width: COL_W, padding: "10px 12px", borderRight: i < WEEKS.length - 1 ? "1px dashed var(--ih-line)" : "none" }}>
              <div className="ih-mono" style={{ fontSize: 9, color: "var(--ih-ink-40)", textTransform: "uppercase", letterSpacing: "0.14em" }}>Week {i + 1}</div>
              <div className="ih-mono" style={{ fontSize: 11, color: "var(--ih-ink-65)", marginTop: 2 }}>{w}</div>
            </div>
          ))}
        </div>
        {MILESTONES.map((m) => {
          const expanded = expandedIds.has(m.id)
          const barColor = m.status === "COMPLETED" ? "var(--ih-ok)" : m.status === "IN_PROGRESS" ? "var(--ih-accent)" : "var(--ih-surface-3)"
          const barFg = m.status === "UPCOMING" ? "var(--ih-ink-65)" : "#fff"
          return (
            <div key={m.id}>
              <div style={{ display: "flex", borderBottom: "1px solid var(--ih-line)", background: m.current ? "var(--ih-accent-soft-2)" : "transparent" }}>
                <div style={{ width: 320, padding: "12px 16px", display: "flex", alignItems: "center", gap: 10, borderRight: "1px solid var(--ih-line)" }}>
                  <button className="ih-btn ih-btn-quiet ih-btn-icon" style={{ height: 18, width: 18 }} onClick={() => toggle(m.id)}>
                    <Icon name={expanded ? "chevronDown" : "chevronRight"} size={10} />
                  </button>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: m.current ? 600 : 500 }}>{m.title}</div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 3 }}>
                      <span className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-50)" }}>{m.accepted}/{m.deliverables} accepted</span>
                      {m.current && <span className="ih-pill ih-pill-accent" style={{ fontSize: 8, padding: "1px 5px" }}>NOW</span>}
                    </div>
                  </div>
                </div>
                <div style={{ position: "relative", flex: 1, height: 48 }}>
                  {WEEKS.map((_, i) => <div key={i} style={{ position: "absolute", left: COL_W * (i + 1), top: 0, bottom: 0, width: 1, borderLeft: "1px dashed var(--ih-line)" }} />)}
                  <div style={{ position: "absolute", top: 12, height: 24, left: COL_W * m.start, width: COL_W * m.span - 6, background: barColor, color: barFg, borderRadius: "var(--ih-r-md)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 10px", fontSize: 11, fontWeight: 500 }}>
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {m.status === "COMPLETED" && <Icon name="check" size={10} stroke={2.5} style={{ marginRight: 4, verticalAlign: -1 }} />}
                      {m.title}
                    </span>
                    {m.current && <span className="ih-mono" style={{ fontSize: 9, opacity: 0.85 }}>day 4 / 7</span>}
                  </div>
                </div>
              </div>
              {expanded && m.items.map((it, i) => (
                <div key={i} style={{ display: "flex", borderBottom: "1px dashed var(--ih-line)", background: "var(--ih-surface-2)" }}>
                  <div style={{ width: 320, padding: "7px 16px 7px 50px", display: "flex", alignItems: "center", gap: 10, borderRight: "1px solid var(--ih-line)" }}>
                    <Icon name="file" size={11} style={{ color: "var(--ih-ink-40)" }} />
                    <span style={{ fontSize: 11.5, flex: 1 }}>{it.t}</span>
                  </div>
                  <div style={{ flex: 1, padding: "7px 12px", display: "flex", alignItems: "center", gap: 10 }}>
                    <StatusDot s={it.s} />
                    {it.s === "PENDING_APPROVAL" && <button className="ih-btn ih-btn-quiet ih-btn-sm" style={{ height: 20, marginLeft: "auto" }} onClick={() => setToast({message: "Nudge sent to client", tone: "ok"})}>Nudge client {"→"}</button>}
                    {it.s === "DELIVERED" && <button className="ih-btn ih-btn-quiet ih-btn-sm" style={{ height: 20, marginLeft: "auto" }} onClick={() => setToast({message: "Approval request sent", tone: "ok"})}>Request approval {"→"}</button>}
                    {it.s === "PENDING" && <button className="ih-btn ih-btn-quiet ih-btn-sm" style={{ height: 20, marginLeft: "auto" }} onClick={() => setToast({message: "Upload zone ready — drag files to upload", tone: "info"})}>Upload {"→"}</button>}
                  </div>
                </div>
              ))}
            </div>
          )
        })}
      </div>
      )}

      {/* Bottom panels */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 16, marginTop: 18 }}>
        <div className="ih-card" style={{ padding: 14 }}>
          <div className="ih-eyebrow" style={{ marginBottom: 10 }}>Approval batch {"·"} ready to send</div>
          <div style={{ fontSize: 12, color: "var(--ih-ink-65)", marginBottom: 12 }}>
            2 deliverables are <strong>Delivered</strong> but you haven&apos;t requested client approval yet. Bundle them into one approval request to Sarah?
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {["Workflow gap analysis", "Audit summary v3 final"].map((d) => (
              <label key={d} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", border: "1px solid var(--ih-line)", borderRadius: "var(--ih-r-sm)" }}>
                <input type="checkbox" defaultChecked style={{ accentColor: "var(--ih-accent)" }} />
                <span style={{ fontSize: 12 }}>{d}</span>
              </label>
            ))}
          </div>
          <button className="ih-btn ih-btn-accent ih-btn-sm" style={{ marginTop: 10 }} onClick={() => setToast({message: "Approval request sent for both deliverables", tone: "ok"})}>
            <Icon name="check" size={11} /> Request approval for both
          </button>
        </div>
        <div className="ih-card" style={{ padding: 14 }}>
          <div className="ih-eyebrow" style={{ marginBottom: 10 }}>Health signals</div>
          {[
            { l: "On-time delivery rate", v: "92%", tone: "ok" },
            { l: "Avg client reply", v: "3h", tone: "ok" },
            { l: "Milestone slippage", v: "0d", tone: "ok" },
            { l: "Audit window left", v: "4d", tone: "warn" },
          ].map((s) => (
            <div key={s.l} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px dashed var(--ih-line)", fontSize: 12 }}>
              <span style={{ color: "var(--ih-ink-50)" }}>{s.l}</span>
              <span className="ih-mono" style={{ color: s.tone === "ok" ? "var(--ih-ok)" : "var(--ih-warn)" }}>{"●"} {s.v}</span>
            </div>
          ))}
        </div>
      </div>
      {toast && <NotificationToast message={toast.message} tone={toast.tone as any} onDismiss={() => setToast(null)} />}
    </div>
  )
}

function MoneyView() {
  const [toast, setToast] = useState<{message: string; tone?: string} | null>(null)
  return (
    <div style={{ padding: "20px 28px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 18 }}>
        <div>
          <div className="ih-eyebrow" style={{ marginBottom: 6 }}>Money {"·"} proposal {"·"} invoices {"·"} cashflow, fused</div>
          <h1 className="ih-serif" style={{ fontSize: 28, margin: 0 }}>The <span className="ih-italic-red">money</span></h1>
        </div>
        <div style={{ display: "flex", gap: 16, fontSize: 11 }}>
          {[
            { l: "Total value", v: "£24,500", tone: "var(--ih-ink)" },
            { l: "Paid to date", v: "£12,250", tone: "var(--ih-ok)" },
            { l: "Outstanding", v: "£6,125", tone: "var(--ih-accent)" },
            { l: "Upcoming", v: "£6,125", tone: "var(--ih-ink-65)" },
          ].map((s) => (
            <div key={s.l} style={{ textAlign: "right" }}>
              <div className="ih-eyebrow" style={{ fontSize: 9, marginBottom: 4 }}>{s.l}</div>
              <div className="ih-serif ih-num" style={{ fontSize: 22, color: s.tone, lineHeight: 1 }}>{s.v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Proposal strip */}
      <div className="ih-card" style={{ padding: 16, marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
          <div>
            <div className="ih-eyebrow" style={{ marginBottom: 4 }}>Proposal v2 {"·"} approved Mar 18</div>
            <div style={{ fontSize: 14, fontWeight: 500 }}>Map workflows, audit, deliver 3-mo roadmap</div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="ih-btn ih-btn-quiet ih-btn-sm" onClick={() => setToast({message: "Opening proposal...", tone: "info"})}><Icon name="eye" size={11} /> View</button>
            <button className="ih-btn ih-btn-quiet ih-btn-sm" onClick={() => setToast({message: "Creating proposal revision...", tone: "info"})}><Icon name="plus" size={11} /> Revise</button>
          </div>
        </div>
        <div style={{ display: "flex", gap: 0, alignItems: "stretch", marginTop: 14, border: "1px solid var(--ih-line)", borderRadius: "var(--ih-r-md)", overflow: "hidden", background: "var(--ih-surface-2)" }}>
          {[
            { label: "Deposit", amt: "£12,250", trigger: "On signing", paid: true, sent: false },
            { label: "Audit done", amt: "£6,125", trigger: "On milestone #3", paid: false, sent: true },
            { label: "Handover", amt: "£6,125", trigger: "On completion", paid: false, sent: false },
          ].map((s, i, arr) => (
            <div key={s.label} style={{ flex: 1, padding: "12px 14px", borderRight: i < arr.length - 1 ? "1px solid var(--ih-line)" : "none", position: "relative" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <span className="ih-mono" style={{ fontSize: 9, color: "var(--ih-ink-40)", textTransform: "uppercase", letterSpacing: "0.14em" }}>0{i + 1}</span>
                <span style={{ width: 12, height: 12, borderRadius: 999, background: s.paid ? "var(--ih-ok)" : s.sent ? "var(--ih-warn)" : "var(--ih-surface-3)", border: "1px solid var(--ih-line)" }} />
              </div>
              <div style={{ fontSize: 12.5, fontWeight: 500 }}>{s.label}</div>
              <div className="ih-num" style={{ fontSize: 16, marginTop: 4 }}>{s.amt}</div>
              <div className="ih-mono" style={{ fontSize: 9.5, color: "var(--ih-ink-50)", marginTop: 4 }}>{s.trigger}</div>
              <div className="ih-mono" style={{ fontSize: 9.5, color: s.paid ? "var(--ih-ok)" : s.sent ? "var(--ih-warn)" : "var(--ih-ink-40)", marginTop: 2 }}>
                {s.paid ? "● paid Mar 22" : s.sent ? "● sent · awaiting" : "● auto on milestone"}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cashflow */}
      <div className="ih-card" style={{ padding: 16, marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
          <div>
            <div className="ih-eyebrow" style={{ marginBottom: 4 }}>Cashflow forecast {"·"} this engagement</div>
            <div style={{ fontSize: 12, color: "var(--ih-ink-65)" }}>Includes retainer projection if proposal v3 is signed</div>
          </div>
          <div style={{ display: "flex", gap: 12, fontSize: 11, color: "var(--ih-ink-50)" }}>
            <span><span className="ih-dot ih-dot-ok" style={{ marginRight: 6 }} /> Paid</span>
            <span><span className="ih-dot ih-dot-accent" style={{ marginRight: 6 }} /> Expected</span>
            <span><span className="ih-dot ih-dot-muted" style={{ marginRight: 6 }} /> Projected retainer</span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 12, height: 140, padding: "8px 0", borderTop: "1px solid var(--ih-line)" }}>
          {CASHFLOW.map((c) => {
            const total = c.paid + c.expected
            const max = 14
            return (
              <div key={c.m} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <div className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-65)" }}>{"£"}{(total || c.expected).toFixed(1)}K</div>
                <div style={{ width: "100%", maxWidth: 80, height: 96, position: "relative", display: "flex", flexDirection: "column-reverse", gap: 1 }}>
                  {c.paid > 0 && <div style={{ height: `${(c.paid / max) * 96}px`, background: "var(--ih-ok)", borderRadius: c.expected ? 0 : "2px 2px 0 0" }} />}
                  {c.expected > 0 && <div style={{ height: `${(c.expected / max) * 96}px`, background: c.recurring ? "var(--ih-surface-3)" : "var(--ih-accent)", borderTop: c.recurring ? "1px dashed var(--ih-accent)" : "none", borderRadius: "2px 2px 0 0" }} />}
                </div>
                <div className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)", textTransform: "uppercase" }}>{c.m}</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Invoice table */}
      <div className="ih-card" style={{ overflow: "hidden" }}>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--ih-line)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div className="ih-eyebrow">Invoices {"·"} 3</div>
          <button className="ih-btn ih-btn-quiet ih-btn-sm" onClick={() => setToast({message: "Export started — check your downloads", tone: "ok"})}><Icon name="download" size={11} /> Export CSV</button>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ background: "var(--ih-surface-2)", borderBottom: "1px solid var(--ih-line)" }}>
              {["Invoice", "Description", "Amount", "Issued", "Due", "Status", "Method", ""].map((h) => (
                <th key={h} style={{ textAlign: "left", padding: "8px 12px", fontFamily: "var(--ih-font-mono)", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--ih-ink-40)", fontWeight: 500 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {INVOICES.map((inv) => (
              <tr key={inv.n} style={{ borderBottom: "1px solid var(--ih-line)" }}>
                <td style={{ padding: "10px 12px", fontFamily: "var(--ih-font-mono)", fontSize: 11 }}>{inv.n}</td>
                <td style={{ padding: "10px 12px" }}>{inv.desc}</td>
                <td style={{ padding: "10px 12px", fontFamily: "var(--ih-font-mono)", fontWeight: 500 }}>{"£"}{inv.amt.toLocaleString()}</td>
                <td style={{ padding: "10px 12px", color: "var(--ih-ink-65)" }} className="ih-mono">{inv.date}</td>
                <td style={{ padding: "10px 12px", color: "var(--ih-ink-65)" }} className="ih-mono">{inv.due || inv.paid}</td>
                <td style={{ padding: "10px 12px" }}>
                  <span className={`ih-pill ${inv.status === "PAID" ? "ih-pill-ok" : inv.status === "SENT" ? "ih-pill-warn" : ""}`} style={{ fontSize: 9 }}>{inv.status}</span>
                </td>
                <td style={{ padding: "10px 12px", color: "var(--ih-ink-50)", fontSize: 11 }}>{inv.method}</td>
                <td style={{ padding: "10px 12px", textAlign: "right" }}>
                  <DropdownMenu
                    trigger={<button className="ih-btn ih-btn-quiet ih-btn-icon" style={{ height: 22, width: 22 }}><Icon name="moreH" size={11} /></button>}
                    items={[
                      { label: "View details", onClick: () => setToast({ message: "Invoice details loaded", tone: "info" }) },
                      { label: "Send reminder", onClick: () => setToast({ message: "Payment reminder sent", tone: "ok" }) },
                      { label: "Download PDF", onClick: () => { setToast({ message: "Exporting PDF...", tone: "info" }); setTimeout(() => setToast({ message: "PDF downloaded", tone: "ok" }), 1000) } },
                    ]}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {toast && <NotificationToast message={toast.message} tone={toast.tone as any} onDismiss={() => setToast(null)} />}
    </div>
  )
}

/* ── Main page with tabs ──────────────────────────────────────────────────── */

export default function WorkMoneyPage() {
  const [activeTab, setActiveTab] = useState<"work" | "money">("work")

  return (
    <div style={{ margin: "-24px -24px" }}>
      <div style={{ display: "flex", borderBottom: "1px solid var(--ih-line)", padding: "0 28px" }}>
        {(["work", "money"] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{ padding: "12px 16px", fontSize: 13, fontWeight: activeTab === tab ? 500 : 400, color: activeTab === tab ? "var(--ih-ink)" : "var(--ih-ink-50)", background: "transparent", border: 0, borderBottom: activeTab === tab ? "2px solid var(--ih-accent)" : "2px solid transparent", marginBottom: -1, cursor: "pointer", textTransform: "capitalize" }}>{tab}</button>
        ))}
      </div>
      {activeTab === "work" ? <WorkView /> : <MoneyView />}

    </div>
  )
}
