// TODO(data-wiring): Engagement summary (hero, stage, dates) is now LIVE via
// server-component fetch in ../page.tsx. All tabs below (Engagements,
// Bookings, Deals, Invoices, Workflows, Documents, Activity, Team) and the
// right-rail (Contacts, Copilot, Pinned, Recent) are still MOCK — pending:
// - bookings.listForEngagement
// - deals.listForCustomer (BUILD)
// - payment.listInvoices({ engagementId })
// - workflow.listForEngagement
// - documents.list({ engagementId }) (BUILD)
// - activityFeed (BUILD)
// - consulting.listTeamContacts (engagement_org_chart already exists — wire it next slice)
// - customerNotes.list({ engagementId, pinned: true })
"use client"

import { useState } from "react"
import Link from "next/link"
import { NotificationToast, InlineFormRow, DropdownMenu, EmailDraftDialog, FileUploadZone } from "@/components/shared"
import { Icon } from "@/components/shell"
import { OrgChartSection } from "./org-chart-section"

const MOCK_BADGE_STYLE = { color: "var(--ih-accent)", fontStyle: "italic", fontSize: 10, fontFamily: "var(--ih-font-sans)" } as const

export interface EngagementHubProps {
  engagement: {
    id: string
    title: string
    stage: string
    status: string | null
    type: string | null
    createdAt: Date | string | null
    updatedAt: Date | string | null
  }
  customer: {
    id: string
    firstName: string | null
    lastName: string | null
    email: string | null
    phone: string | null
    notes: string | null
    createdAt: Date | string | null
  }
  clientTenantSlug: string | null
  companyLabel: string
}

/* ------------------------------------------------------------------ */
/*  Tiny helpers                                                       */
/* ------------------------------------------------------------------ */

function SectionHead({ eyebrow, title, action }: { eyebrow: string; title: string; action?: React.ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 14 }}>
      <div>
        <div className="ih-eyebrow">{eyebrow}</div>
        <h3 style={{ margin: "2px 0 0", fontSize: 15, fontWeight: 600 }}>{title}</h3>
      </div>
      {action}
    </div>
  )
}

function Btn({ children, accent, ghost, sm, onClick, style }: { children: React.ReactNode; accent?: boolean; ghost?: boolean; sm?: boolean; onClick?: () => void; style?: React.CSSProperties }) {
  const cls = ["ih-btn", sm && "ih-btn-sm", ghost && "ih-btn-ghost", accent && "ih-btn-accent"].filter(Boolean).join(" ")
  return <button className={cls} onClick={onClick} style={style}>{children}</button>
}

/* ------------------------------------------------------------------ */
/*  Tab content components                                             */
/* ------------------------------------------------------------------ */

function OverviewTab({ setActiveTab, engagement, customer: _customer, clientTenantSlug: _clientTenantSlug, companyLabel }: {
  setActiveTab: (i: number) => void
  engagement: EngagementHubProps["engagement"]
  customer: EngagementHubProps["customer"]
  clientTenantSlug: string | null
  companyLabel: string
}) {
  const [expanded, setExpanded] = useState(false)
  return (
    <>
      {/* Org chart — LIVE via api.onboarding.getChart */}
      <OrgChartSection engagementId={engagement.id} companyLabel={companyLabel} />

      {/* Connection map */}
      <div style={{ marginBottom: 24 }}>
        <SectionHead eyebrow="Connection map" title="Everything tied to this client" action={<button className="ih-btn ih-btn-quiet ih-btn-sm" onClick={() => setExpanded(e => !e)}>{expanded ? "Collapse" : "Expand"} {"→"}</button>} />
        <div style={{ display: "grid", gridTemplateColumns: expanded ? "repeat(3, 1fr)" : "repeat(6, 1fr)", gap: 10 }}>
          {[
            { l: "Engagement", v: "Q2 retainer · sprint 4", icon: "handshake" as const, count: "1 active", tone: "accent" },
            { l: "Bookings", v: "14 total · 2 upcoming", icon: "calendar" as const, count: "next Tue 11:30", tone: "info" },
            { l: "Pipeline", v: "2 open deals", icon: "pipeline" as const, count: "£32k weighted", tone: "muted" },
            { l: "Invoices", v: "8 issued · 1 open", icon: "invoice" as const, count: "£4.2k due", tone: "warn" },
            { l: "Workflows", v: "3 attached · 12 runs", icon: "workflow" as const, count: "all healthy", tone: "ok" },
            { l: "Team", v: "Mira, Sam, you", icon: "users" as const, count: "3 assigned", tone: "muted" },
          ].map((c) => (
            <div key={c.l} className="ih-card" style={{ padding: 12, cursor: "pointer" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <Icon name={c.icon} size={13} style={{ color: c.tone === "accent" ? "var(--ih-accent)" : c.tone === "warn" ? "var(--ih-warn)" : c.tone === "ok" ? "var(--ih-ok)" : c.tone === "info" ? "var(--ih-info)" : "var(--ih-ink-40)" }} />
                <Icon name="arrowUpRight" size={10} style={{ color: "var(--ih-ink-30)" }} />
              </div>
              <div className="ih-eyebrow" style={{ marginBottom: 4 }}>{c.l}</div>
              <div style={{ fontSize: 12, fontWeight: 500, lineHeight: 1.3, marginBottom: 4 }}>{c.v}</div>
              <div className="ih-mono" style={{ fontSize: 9.5, color: "var(--ih-ink-40)" }}>{c.count}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Engagement detail card */}
      <div className="ih-card" style={{ marginBottom: 20 }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--ih-line)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <span className="ih-eyebrow">/eng_0481 {"·"} current engagement</span>
            <h3 style={{ margin: "4px 0 0", fontSize: 18, fontFamily: "var(--ih-font-serif)", letterSpacing: "-0.01em" }}>Q2 retainer {"·"} sprint 4 of 6</h3>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button className="ih-btn ih-btn-ghost ih-btn-sm" onClick={() => { window.location.href = "/platform/clients/c-northwind/overview" }}>Open workspace <Icon name="arrowUpRight" size={11} /></button>
          </div>
        </div>
        <div style={{ padding: 20 }}>
          {/* Sprint progress */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 6, marginBottom: 18 }}>
            {[1, 2, 3, 4, 5, 6].map(n => (
              <div key={n} style={{ height: 56, borderRadius: 8, border: "1px solid var(--ih-line)", padding: 10, background: n < 4 ? "var(--ih-surface-2)" : n === 4 ? "var(--ih-accent-soft)" : "transparent", position: "relative" }}>
                <div className="ih-mono" style={{ fontSize: 9, color: n === 4 ? "var(--ih-accent)" : "var(--ih-ink-40)", textTransform: "uppercase", letterSpacing: "0.1em" }}>SPRINT {n}</div>
                <div style={{ fontSize: 13, fontWeight: 500, marginTop: 4, color: n > 4 ? "var(--ih-ink-40)" : "var(--ih-ink)" }}>
                  {n < 4 ? "✓ shipped" : n === 4 ? "in progress" : "queued"}
                </div>
                {n === 4 && <div style={{ position: "absolute", bottom: 6, left: 10, right: 10, height: 3, background: "rgba(209,58,31,0.2)", borderRadius: 2, overflow: "hidden" }}><div style={{ width: "78%", height: "100%", background: "var(--ih-accent)" }} /></div>}
              </div>
            ))}
          </div>
          {/* Deliverables row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
            <div>
              <div className="ih-eyebrow" style={{ marginBottom: 8 }}>Deliverables {"·"} 4</div>
              {([["Stripe → Airtable sync", "ok"], ["Approval workflow", "ok"], ["Client portal v2", "accent"], ["Monthly digest email", "muted"]] as [string, string][]).map(([t, s]) => (
                <div key={t} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 0", fontSize: 12 }}>
                  <span className={`ih-dot ih-dot-${s}`} /> {t}
                </div>
              ))}
            </div>
            <div>
              <div className="ih-eyebrow" style={{ marginBottom: 8 }}>Recent decisions {"·"} 3</div>
              <div style={{ fontSize: 11.5, color: "var(--ih-ink-65)", lineHeight: 1.6 }}>
                <p style={{ margin: "0 0 6px" }}>{"·"} <span className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)" }}>Fri</span> Move portal launch to sprint 5.</p>
                <p style={{ margin: "0 0 6px" }}>{"·"} <span className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)" }}>Wed</span> Approved scope creep {"·"} +6h budget.</p>
                <p style={{ margin: "0" }}>{"·"} <span className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)" }}>Mon</span> Sam takes over Stripe sync ownership.</p>
              </div>
            </div>
            <div>
              <div className="ih-eyebrow" style={{ marginBottom: 8 }}>Risk {"·"} radar</div>
              <div style={{ display: "grid", gap: 6 }}>
                <div style={{ display: "flex", gap: 8, padding: "6px 8px", border: "1px solid var(--ih-line)", borderRadius: 6, fontSize: 11.5 }}>
                  <span className="ih-dot ih-dot-warn" style={{ marginTop: 4 }} />
                  <span><strong>Portal v2 scope</strong> {"·"} 6h over forecast</span>
                </div>
                <div style={{ display: "flex", gap: 8, padding: "6px 8px", border: "1px solid var(--ih-line)", borderRadius: 6, fontSize: 11.5 }}>
                  <span className="ih-dot ih-dot-ok" style={{ marginTop: 4 }} />
                  <span><strong>Renewal signal</strong> {"·"} NPS 9 last touch</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bookings + Invoices side by side */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
        <div className="ih-card">
          <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--ih-line)", display: "flex", justifyContent: "space-between" }}>
            <div><span className="ih-eyebrow">Upcoming bookings</span></div>
            <button className="ih-btn ih-btn-quiet ih-btn-sm" onClick={() => setActiveTab(2)}>All 14 {"→"}</button>
          </div>
          {([
            ["Tue 13", "11:30", "Sprint review", "30m · Zoom", "info"],
            ["Wed 14", "09:00", "Stand-up · Sam", "15m · internal", "muted"],
            ["Fri 16", "15:00", "Stakeholder demo", "45m · Northwind HQ", "accent"],
          ] as [string, string, string, string, string][]).map(([d, t, title, sub, tone], i) => (
            <div key={i} style={{ padding: "10px 16px", borderTop: i === 0 ? "0" : "1px solid var(--ih-line)", display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 12, alignItems: "center" }}>
              <div style={{ width: 44, textAlign: "center", padding: "4px 0", border: "1px solid var(--ih-line)", borderRadius: 6 }}>
                <div className="ih-mono" style={{ fontSize: 9, color: "var(--ih-ink-40)", textTransform: "uppercase" }}>{d.split(" ")[0]}</div>
                <div className="ih-serif" style={{ fontSize: 18, lineHeight: 1 }}>{d.split(" ")[1]}</div>
              </div>
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 500 }}>{title} <span className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)", marginLeft: 4 }}>{"·"} {t}</span></div>
                <div className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)", marginTop: 2 }}>{sub}</div>
              </div>
              <Icon name="chevronRight" size={11} style={{ color: "var(--ih-ink-30)" }} />
            </div>
          ))}
        </div>
        <div className="ih-card">
          <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--ih-line)", display: "flex", justifyContent: "space-between" }}>
            <div><span className="ih-eyebrow">Recent invoices</span></div>
            <button className="ih-btn ih-btn-quiet ih-btn-sm" onClick={() => setActiveTab(4)}>All 8 {"→"}</button>
          </div>
          {([
            ["/inv_2041", "Q2 · M2 retainer", "£14,200", "Apr 28", "warn", "sent"],
            ["/inv_2027", "Q2 · M1 retainer", "£14,200", "Mar 28", "ok", "paid"],
            ["/inv_2013", "Discovery sprint", "£ 8,400", "Mar 03", "ok", "paid"],
            ["/inv_1991", "Onboarding setup", "£ 2,400", "Feb 14", "ok", "paid"],
          ] as [string, string, string, string, string, string][]).map(([id, label, amt, when, tone, status], i) => (
            <div key={id} style={{ padding: "10px 16px", borderTop: i === 0 ? "0" : "1px solid var(--ih-line)", display: "grid", gridTemplateColumns: "auto 1fr auto auto", gap: 10, alignItems: "center" }}>
              <span className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)" }}>{id}</span>
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 500 }}>{label}</div>
                <div className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)", marginTop: 2 }}>{when}</div>
              </div>
              <span className={`ih-pill ih-pill-${tone === "warn" ? "warn" : "ok"}`} style={{ fontSize: 9 }}>{status}</span>
              <span className="ih-mono" style={{ fontSize: 12, fontWeight: 500 }}>{amt}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Workflows attached */}
      <div className="ih-card">
        <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--ih-line)", display: "flex", justifyContent: "space-between" }}>
          <div><span className="ih-eyebrow">Workflows attached {"·"} this client</span></div>
          <button className="ih-btn ih-btn-quiet ih-btn-sm" onClick={() => setActiveTab(5)}>Attach more {"→"}</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 0 }}>
          {([
            ["Onboarding · Northwind", "Triggered on new booking", "12 runs · 100% ok", "ok", "/wf_204"],
            ["Invoice → Stripe sync", "Hourly · paid sync", "186 runs · 1 paused", "warn", "/wf_887"],
            ["Monthly digest", "1st of month · 09:00", "3 runs · all sent", "ok", "/wf_310"],
          ] as [string, string, string, string, string][]).map(([t, sub, runs, tone, id], i) => (
            <div key={id} style={{ padding: 16, borderLeft: i === 0 ? "0" : "1px solid var(--ih-line)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)" }}>{id}</span>
                <span className={`ih-dot ih-dot-${tone}`} />
              </div>
              <div style={{ fontSize: 12.5, fontWeight: 500 }}>{t}</div>
              <div style={{ fontSize: 11, color: "var(--ih-ink-65)", marginTop: 4 }}>{sub}</div>
              <div className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)", marginTop: 8 }}>{runs}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

function EngagementsTab() {
  const engagements = [
    {
      id: "eng_0481",
      title: "Q2 Retainer",
      type: "RETAINER",
      stage: "AUDITING",
      sprints: "Sprint 4 of 6",
      start: "1 Mar 2025",
      end: "31 Aug 2025",
      value: "£24,500",
      stages: [
        { label: "Discovery", done: true },
        { label: "Proposal", done: true },
        { label: "Contracted", done: true },
        { label: "Auditing", done: false, current: true },
        { label: "Implementing", done: false },
        { label: "Handover", done: false },
      ],
    },
    {
      id: "eng_0312",
      title: "Initial Discovery",
      type: "PROJECT",
      stage: "COMPLETED",
      sprints: "Completed",
      start: "14 Jan 2025",
      end: "28 Feb 2025",
      value: "£8,400",
      stages: [
        { label: "Discovery", done: true },
        { label: "Proposal", done: true },
        { label: "Contracted", done: true },
        { label: "Auditing", done: true },
        { label: "Implementing", done: true },
        { label: "Handover", done: true },
      ],
    },
  ]

  return (
    <div>
      <SectionHead
        eyebrow="engagements"
        title="All engagements for Northwind Co."
        action={<Btn accent sm onClick={() => { window.location.href = "/platform/clients/new" }}><Icon name="plus" size={11} /> New engagement</Btn>}
      />
      <div style={{ display: "grid", gap: 12 }}>
        {engagements.map((eng) => (
          <div key={eng.id} className="ih-card" style={{ padding: 0, cursor: "pointer" }}>
            <div style={{ padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
                  <span className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)" }}>/{eng.id}</span>
                  <span className={`ih-pill ${eng.stage === "COMPLETED" ? "ih-pill-ok" : "ih-pill-accent"}`} style={{ fontSize: 9 }}>{eng.type}</span>
                  <span className={`ih-pill ${eng.stage === "COMPLETED" ? "ih-pill-ok" : ""}`} style={{ fontSize: 9 }}>{eng.stage}</span>
                </div>
                <h4 style={{ margin: 0, fontSize: 16, fontFamily: "var(--ih-font-serif)" }}>{eng.title}</h4>
                <div style={{ display: "flex", gap: 16, marginTop: 8, fontSize: 11.5, color: "var(--ih-ink-50)" }}>
                  <span><Icon name="calendar" size={10} /> {eng.start} {"→"} {eng.end}</span>
                  <span><Icon name="clock" size={10} /> {eng.sprints}</span>
                  <span className="ih-mono" style={{ fontWeight: 600, color: "var(--ih-ink)" }}>{eng.value}</span>
                </div>
              </div>
              <Icon name="chevronRight" size={13} style={{ color: "var(--ih-ink-30)", marginTop: 4 }} />
            </div>
            {/* Mini stage strip */}
            <div style={{ padding: "0 20px 14px", display: "flex", gap: 4 }}>
              {eng.stages.map((s) => (
                <div
                  key={s.label}
                  style={{
                    flex: 1,
                    height: 4,
                    borderRadius: 2,
                    background: s.done ? "var(--ih-ok)" : s.current ? "var(--ih-accent)" : "var(--ih-line)",
                  }}
                  title={s.label}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function BookingsTab() {
  const [filter, setFilter] = useState<"upcoming" | "past">("upcoming")
  const bookings = [
    { date: "Tue 13 May", time: "11:30", duration: "45m", title: "Sprint review", attendees: "Mira Sato, Luke", type: "Review", tone: "accent" },
    { date: "Wed 14 May", time: "09:00", duration: "15m", title: "Stand-up · Sam", attendees: "Sam Park", type: "Internal", tone: "muted" },
    { date: "Fri 16 May", time: "15:00", duration: "45m", title: "Stakeholder demo", attendees: "Mira Sato, Sam Park, Lara Kim", type: "Demo", tone: "info" },
    { date: "Tue 20 May", time: "11:30", duration: "30m", title: "Sprint 5 kickoff", attendees: "Mira Sato, Luke", type: "Planning", tone: "accent" },
    { date: "Thu 22 May", time: "14:00", duration: "20m", title: "Invoice review", attendees: "Lara Kim", type: "Finance", tone: "warn" },
    { date: "Fri 23 May", time: "10:00", duration: "60m", title: "Portal v2 walkthrough", attendees: "Mira Sato, Jamie F.", type: "Demo", tone: "info" },
  ]
  const pastBookings = [
    { date: "Fri 9 May", time: "15:00", duration: "30m", title: "Sprint 3 retro", attendees: "Mira Sato, Luke", type: "Review", tone: "muted" },
    { date: "Tue 6 May", time: "11:30", duration: "45m", title: "Sprint 3 review", attendees: "Mira Sato, Sam Park", type: "Review", tone: "muted" },
    { date: "Fri 2 May", time: "14:00", duration: "20m", title: "Scope change discussion", attendees: "Mira Sato", type: "Ad-hoc", tone: "muted" },
  ]
  const rows = filter === "upcoming" ? bookings : pastBookings

  return (
    <div>
      <SectionHead
        eyebrow="bookings"
        title="Sessions for Northwind Co."
        action={<Btn accent sm onClick={() => { window.location.href = "/platform/bookings/new" }}><Icon name="plus" size={11} /> Book new session</Btn>}
      />
      <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
        {(["upcoming", "past"] as const).map((f) => (
          <button
            key={f}
            className={`ih-btn ih-btn-sm ${filter === f ? "ih-btn-ghost" : "ih-btn-quiet"}`}
            onClick={() => setFilter(f)}
            style={{ textTransform: "capitalize" }}
          >
            {f}
          </button>
        ))}
      </div>
      <div className="ih-card" style={{ padding: 0 }}>
        {/* Header */}
        <div style={{ display: "grid", gridTemplateColumns: "100px 60px 50px 1fr 1fr 80px", gap: 12, padding: "10px 16px", borderBottom: "1px solid var(--ih-line)" }}>
          {["Date", "Time", "Dur.", "Title", "Attendees", "Type"].map((h) => (
            <div key={h} className="ih-mono" style={{ fontSize: 9, color: "var(--ih-ink-40)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{h}</div>
          ))}
        </div>
        {rows.map((b, i) => (
          <div
            key={i}
            style={{
              display: "grid",
              gridTemplateColumns: "100px 60px 50px 1fr 1fr 80px",
              gap: 12,
              padding: "10px 16px",
              borderTop: i === 0 ? "0" : "1px solid var(--ih-line)",
              cursor: "pointer",
              fontSize: 12.5,
            }}
          >
            <span style={{ fontWeight: 500 }}>{b.date}</span>
            <span className="ih-mono" style={{ fontSize: 11, color: "var(--ih-ink-65)" }}>{b.time}</span>
            <span className="ih-mono" style={{ fontSize: 11, color: "var(--ih-ink-40)" }}>{b.duration}</span>
            <span style={{ fontWeight: 500 }}>{b.title}</span>
            <span style={{ color: "var(--ih-ink-65)", fontSize: 11.5 }}>{b.attendees}</span>
            <span className={`ih-pill ih-pill-${b.tone === "warn" ? "warn" : b.tone === "accent" ? "accent" : b.tone === "info" ? "info" : ""}`} style={{ fontSize: 9, justifySelf: "start" }}>{b.type}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function DealsTab() {
  const deals = [
    { name: "Q3 Retainer Renewal", stage: "Negotiation", value: "£28,000", probability: "75%", nextAction: "Send renewal proposal by Jun 20", tone: "accent" },
    { name: "Portal Phase 2 Expansion", stage: "Qualified", value: "£18,000", probability: "40%", nextAction: "Discovery call after sprint 5 demo", tone: "info" },
  ]

  return (
    <div>
      <SectionHead
        eyebrow="pipeline"
        title="Deals for Northwind Co."
        action={<Btn accent sm onClick={() => { window.location.href = "/platform/pipeline/new" }}><Icon name="plus" size={11} /> New deal</Btn>}
      />
      <div className="ih-card" style={{ padding: 0 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 110px 90px 70px 1fr", gap: 12, padding: "10px 16px", borderBottom: "1px solid var(--ih-line)" }}>
          {["Deal", "Stage", "Value", "Prob.", "Next action"].map((h) => (
            <div key={h} className="ih-mono" style={{ fontSize: 9, color: "var(--ih-ink-40)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{h}</div>
          ))}
        </div>
        {deals.map((d, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 110px 90px 70px 1fr", gap: 12, padding: "12px 16px", borderTop: i === 0 ? "0" : "1px solid var(--ih-line)", cursor: "pointer", fontSize: 12.5 }}>
            <span style={{ fontWeight: 500 }}>{d.name}</span>
            <span className={`ih-pill ih-pill-${d.tone === "accent" ? "accent" : "info"}`} style={{ fontSize: 9, justifySelf: "start" }}>{d.stage}</span>
            <span className="ih-mono" style={{ fontWeight: 600 }}>{d.value}</span>
            <span className="ih-mono" style={{ color: "var(--ih-ink-65)" }}>{d.probability}</span>
            <span style={{ color: "var(--ih-ink-65)", fontSize: 11.5 }}>{d.nextAction}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function InvoicesTab() {
  const invoices = [
    { number: "NW-001", description: "Deposit", amount: "£12,250", issued: "20 Mar 2025", due: "3 Apr 2025", status: "PAID", method: "Stripe", tone: "ok" },
    { number: "NW-002", description: "Audit findings", amount: "£6,125", issued: "4 Apr 2025", due: "18 Apr 2025", status: "SENT", method: "Stripe pending", tone: "warn" },
    { number: "NW-003", description: "Handover", amount: "£6,125", issued: "—", due: "—", status: "DRAFT", method: "Auto on milestone", tone: "muted" },
    { number: "NW-000", description: "Discovery sprint", amount: "£8,400", issued: "3 Mar 2025", due: "17 Mar 2025", status: "PAID", method: "Bank transfer", tone: "ok" },
  ]

  const totalInvoiced = "£32,900"
  const totalPaid = "£20,650"
  const totalOutstanding = "£6,125"

  return (
    <div>
      <SectionHead eyebrow="invoices" title="Invoices for Northwind Co." />
      {/* Summary bar */}
      <div style={{ display: "flex", gap: 24, marginBottom: 16, padding: "14px 20px", border: "1px solid var(--ih-line)", borderRadius: 10, background: "var(--ih-surface-2)" }}>
        {([
          ["Total invoiced", totalInvoiced, ""],
          ["Paid", totalPaid, "ok"],
          ["Outstanding", totalOutstanding, "warn"],
        ] as [string, string, string][]).map(([label, val, tone]) => (
          <div key={label}>
            <div className="ih-eyebrow" style={{ marginBottom: 4 }}>{label}</div>
            <div className="ih-serif" style={{ fontSize: 22, lineHeight: 1, color: tone === "warn" ? "var(--ih-warn)" : tone === "ok" ? "var(--ih-ok)" : "var(--ih-ink)" }}>{val}</div>
          </div>
        ))}
      </div>

      <div className="ih-card" style={{ padding: 0 }}>
        <div style={{ display: "grid", gridTemplateColumns: "80px 1fr 90px 90px 90px 70px 110px", gap: 10, padding: "10px 16px", borderBottom: "1px solid var(--ih-line)" }}>
          {["Number", "Description", "Amount", "Issued", "Due", "Status", "Method"].map((h) => (
            <div key={h} className="ih-mono" style={{ fontSize: 9, color: "var(--ih-ink-40)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{h}</div>
          ))}
        </div>
        {invoices.map((inv, i) => (
          <div key={inv.number} style={{ display: "grid", gridTemplateColumns: "80px 1fr 90px 90px 90px 70px 110px", gap: 10, padding: "10px 16px", borderTop: i === 0 ? "0" : "1px solid var(--ih-line)", cursor: "pointer", fontSize: 12.5 }}>
            <span className="ih-mono" style={{ fontSize: 11, fontWeight: 600 }}>{inv.number}</span>
            <span style={{ fontWeight: 500 }}>{inv.description}</span>
            <span className="ih-mono" style={{ fontWeight: 600 }}>{inv.amount}</span>
            <span className="ih-mono" style={{ fontSize: 11, color: "var(--ih-ink-65)" }}>{inv.issued}</span>
            <span className="ih-mono" style={{ fontSize: 11, color: "var(--ih-ink-65)" }}>{inv.due}</span>
            <span className={`ih-pill ih-pill-${inv.tone}`} style={{ fontSize: 9, justifySelf: "start" }}>{inv.status}</span>
            <span style={{ fontSize: 11, color: "var(--ih-ink-50)" }}>{inv.method}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function WorkflowsTab() {
  const [workflowList, setWorkflowList] = useState([
    { id: "WF-204", name: "Onboarding · Northwind", trigger: "Triggered on new booking", runs: 12, health: "ok" as const, lastRun: "2 hours ago" },
    { id: "WF-887", name: "Invoice → Stripe sync", trigger: "Hourly · paid invoice sync", runs: 186, health: "warn" as const, lastRun: "14 min ago" },
    { id: "WF-310", name: "Monthly digest", trigger: "1st of month · 09:00 UTC", runs: 3, health: "ok" as const, lastRun: "10 days ago" },
  ])
  const [showAttach, setShowAttach] = useState(false)
  const AVAILABLE_WF = [
    { id: "WF-401", name: "NPS survey after completion", trigger: "On engagement close" },
    { id: "WF-402", name: "Auto-chase overdue invoices", trigger: "Daily · 09:00" },
    { id: "WF-403", name: "Weekly status digest", trigger: "Every Monday · 08:00" },
  ]

  return (
    <div>
      <SectionHead
        eyebrow="workflows"
        title="Workflows attached to Northwind Co."
        action={<Btn accent sm onClick={() => setShowAttach(s => !s)}><Icon name="plus" size={11} /> Attach workflow</Btn>}
      />
      {showAttach && (
        <div className="ih-card" style={{ padding: 0, marginBottom: 12, overflow: "hidden" }}>
          <div style={{ padding: "10px 16px", background: "var(--ih-surface-2)", borderBottom: "1px solid var(--ih-line)" }}>
            <span className="ih-eyebrow">Available workflows</span>
          </div>
          {AVAILABLE_WF.filter(a => !workflowList.some(w => w.id === a.id)).map((wf, i) => (
            <div key={wf.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 16px", borderTop: i === 0 ? "0" : "1px solid var(--ih-line)" }}>
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 500 }}>{wf.name}</div>
                <div className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)" }}>{wf.trigger}</div>
              </div>
              <Btn sm ghost onClick={() => { setWorkflowList(prev => [...prev, { ...wf, runs: 0, health: "ok" as const, lastRun: "never" }]); }}>Attach</Btn>
            </div>
          ))}
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
        {workflowList.map((wf) => (
          <div key={wf.id} className="ih-card" style={{ padding: 16, cursor: "pointer" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
              <span className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)" }}>{wf.id}</span>
              <span className={`ih-dot ih-dot-${wf.health}`} />
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{wf.name}</div>
            <div style={{ fontSize: 11.5, color: "var(--ih-ink-65)", marginBottom: 12 }}>{wf.trigger}</div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10 }}>
              <span className="ih-mono" style={{ color: "var(--ih-ink-40)" }}>{wf.runs} runs</span>
              <span className="ih-mono" style={{ color: "var(--ih-ink-40)" }}>{wf.lastRun}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function DocumentsTab({ setToast }: { setToast: (t: {message: string; tone?: string}) => void }) {
  const [showUpload, setShowUpload] = useState(false)
  const folders = [
    {
      name: "Proposals",
      files: [
        { name: "Northwind Q2 Retainer — Proposal v2.pdf", type: "PDF", date: "28 Feb 2025", size: "1.2 MB" },
        { name: "Northwind Discovery — Proposal v1.pdf", type: "PDF", date: "10 Jan 2025", size: "840 KB" },
      ],
    },
    {
      name: "Contracts",
      files: [
        { name: "Q2 Retainer Agreement — signed.pdf", type: "PDF", date: "1 Mar 2025", size: "320 KB" },
        { name: "NDA — Northwind Co.pdf", type: "PDF", date: "12 Jan 2025", size: "180 KB" },
      ],
    },
    {
      name: "Audit",
      files: [
        { name: "Process Audit Report — Sprint 1-3.pdf", type: "PDF", date: "2 May 2025", size: "2.4 MB" },
        { name: "Tech Stack Assessment.xlsx", type: "XLSX", date: "18 Apr 2025", size: "580 KB" },
        { name: "Interview Notes — Mira.docx", type: "DOCX", date: "20 Mar 2025", size: "45 KB" },
      ],
    },
    {
      name: "Implementation",
      files: [
        { name: "Stripe Integration Spec.md", type: "MD", date: "10 Apr 2025", size: "28 KB" },
        { name: "Portal v2 Wireframes.fig", type: "FIG", date: "22 Apr 2025", size: "6.1 MB" },
      ],
    },
  ]

  const typeIcon = (type: string) => {
    if (type === "PDF") return "file" as const
    if (type === "XLSX") return "chart" as const
    if (type === "FIG") return "grid" as const
    return "file" as const
  }

  return (
    <div>
      <SectionHead
        eyebrow="documents"
        title="Files for Northwind Co."
        action={
          <div style={{ display: "flex", gap: 6 }}>
            <Btn sm ghost onClick={() => window.open("https://drive.google.com/drive/folders/demo", "_blank")}><Icon name="folder" size={11} /> Open Drive folder</Btn>
            <Btn sm accent onClick={() => setShowUpload(s => !s)}><Icon name="plus" size={11} /> Upload</Btn>
          </div>
        }
      />
      {showUpload && (
        <div style={{ marginBottom: 16 }}>
          <FileUploadZone onUpload={() => { setShowUpload(false); setToast({ message: "File uploaded", tone: "ok" }) }} />
        </div>
      )}
      <div style={{ display: "grid", gap: 16 }}>
        {folders.map((folder) => (
          <div key={folder.name}>
            <div className="ih-eyebrow" style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
              <Icon name="folder" size={11} style={{ color: "var(--ih-ink-40)" }} />
              {folder.name} {"·"} {folder.files.length}
            </div>
            <div className="ih-card" style={{ padding: 0 }}>
              {folder.files.map((f, i) => (
                <div
                  key={f.name}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "auto 1fr 50px 100px 70px",
                    gap: 12,
                    padding: "10px 16px",
                    borderTop: i === 0 ? "0" : "1px solid var(--ih-line)",
                    cursor: "pointer",
                    alignItems: "center",
                    fontSize: 12.5,
                  }}
                >
                  <Icon name={typeIcon(f.type)} size={14} style={{ color: "var(--ih-ink-40)" }} />
                  <span style={{ fontWeight: 500 }}>{f.name}</span>
                  <span className="ih-mono" style={{ fontSize: 9, color: "var(--ih-ink-40)" }}>{f.type}</span>
                  <span className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-50)" }}>{f.date}</span>
                  <span className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)", textAlign: "right" }}>{f.size}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ActivityTab() {
  const groups = [
    {
      label: "Today · 10 May",
      items: [
        { time: "09:42", icon: "money" as const, tone: "ok", title: "Stripe", desc: "processed payment for NW-001 · £12,250" },
        { time: "08:51", icon: "check" as const, tone: "ok", title: "Mira Sato", desc: "approved Q2 audit brief" },
      ],
    },
    {
      label: "Yesterday · 9 May",
      items: [
        { time: "16:30", icon: "clock" as const, tone: "accent", title: "Luke", desc: "logged 4.5h to sprint 4 · Client portal v2" },
        { time: "14:15", icon: "mail" as const, tone: "muted", title: "System", desc: "invoice chase sent for NW-002 · £6,125" },
        { time: "10:00", icon: "calendar" as const, tone: "info", title: "Sprint review", desc: "completed · 45m · Mira Sato attended" },
      ],
    },
    {
      label: "8 May",
      items: [
        { time: "11:20", icon: "flag" as const, tone: "accent", title: "Stage transition", desc: "moved to AUDITING from CONTRACTED" },
        { time: "09:45", icon: "check" as const, tone: "ok", title: "Deliverable", desc: "Stripe → Airtable sync marked complete" },
      ],
    },
    {
      label: "7 May",
      items: [
        { time: "15:30", icon: "chat" as const, tone: "muted", title: "Jamie F.", desc: "new comment on Portal v2 wireframes" },
        { time: "12:00", icon: "workflow" as const, tone: "ok", title: "Workflow", desc: "monthly digest sent successfully" },
        { time: "09:00", icon: "calendar" as const, tone: "muted", title: "Stand-up", desc: "15m · Sam Park · internal" },
      ],
    },
    {
      label: "6 May",
      items: [
        { time: "16:00", icon: "invoice" as const, tone: "warn", title: "Invoice", desc: "NW-002 marked as sent · £6,125 · due 18 Apr" },
        { time: "11:30", icon: "pin" as const, tone: "muted", title: "Luke", desc: "pinned note: renewal conversation slot last week of June" },
      ],
    },
  ]

  return (
    <div>
      <SectionHead eyebrow="activity" title="Full timeline for Northwind Co." />
      <div style={{ display: "grid", gap: 24 }}>
        {groups.map((group) => (
          <div key={group.label}>
            <div className="ih-eyebrow" style={{ marginBottom: 10, fontSize: 10 }}>{group.label}</div>
            <div style={{ display: "grid", gap: 0 }}>
              {group.items.map((item, i) => (
                <div
                  key={i}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "44px 20px 1fr",
                    gap: 10,
                    padding: "8px 0",
                    alignItems: "flex-start",
                    borderTop: i === 0 ? "0" : "1px solid var(--ih-line)",
                  }}
                >
                  <span className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)", paddingTop: 2 }}>{item.time}</span>
                  <Icon
                    name={item.icon}
                    size={13}
                    style={{
                      color:
                        item.tone === "ok" ? "var(--ih-ok)"
                        : item.tone === "accent" ? "var(--ih-accent)"
                        : item.tone === "warn" ? "var(--ih-warn)"
                        : item.tone === "info" ? "var(--ih-info)"
                        : "var(--ih-ink-40)",
                      marginTop: 2,
                    }}
                  />
                  <div style={{ fontSize: 12.5 }}>
                    <strong style={{ fontWeight: 500 }}>{item.title}</strong>
                    <span style={{ color: "var(--ih-ink-65)", marginLeft: 6 }}>{item.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function TeamTab() {
  const [showAddContact, setShowAddContact] = useState(false)
  const [clientTeam, setClientTeam] = useState([
    { name: "Mira Sato", role: "Founder · primary contact", initials: "MS", questionnaire: "Completed", call: "3 calls", tone: "ok" },
    { name: "Sam Park", role: "Ops lead", initials: "SP", questionnaire: "Completed", call: "2 calls", tone: "ok" },
    { name: "Lara Kim", role: "Finance", initials: "LK", questionnaire: "Sent — awaiting", call: "1 call", tone: "warn" },
    { name: "Jamie F.", role: "Engineering", initials: "JF", questionnaire: "Not sent", call: "No calls", tone: "muted" },
  ])

  const ourTeam = [
    { name: "Luke Hodges", role: "Owner · lead consultant", initials: "LH", assigned: "All sprints", tone: "accent" },
  ]

  return (
    <div>
      <SectionHead
        eyebrow="team"
        title="People on Northwind Co."
        action={<Btn accent sm onClick={() => setShowAddContact(s => !s)}><Icon name="plus" size={11} /> Add contact</Btn>}
      />

      {showAddContact && (
        <div style={{ marginBottom: 14 }}>
          <InlineFormRow
            fields={[
              { key: "name", label: "Name", type: "text", placeholder: "Full name" },
              { key: "email", label: "Email", type: "text", placeholder: "email@company.co" },
              { key: "role", label: "Role", type: "text", placeholder: "e.g. Engineering" },
            ]}
            onSave={(vals) => {
              setClientTeam(prev => [...prev, { name: vals.name, role: vals.role, initials: vals.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase(), questionnaire: "Not sent", call: "No calls", tone: "muted" }])
              setShowAddContact(false)
            }}
            onCancel={() => setShowAddContact(false)}
          />
        </div>
      )}

      {/* Client team */}
      <div style={{ marginBottom: 24 }}>
        <div className="ih-eyebrow" style={{ marginBottom: 10 }}>Client team {"·"} {clientTeam.length}</div>
        <div className="ih-card" style={{ padding: 0 }}>
          {clientTeam.map((p, i) => (
            <div
              key={p.name}
              style={{
                display: "grid",
                gridTemplateColumns: "auto 1fr auto auto auto",
                gap: 14,
                padding: "12px 16px",
                borderTop: i === 0 ? "0" : "1px solid var(--ih-line)",
                alignItems: "center",
              }}
            >
              <div className="ih-avatar" style={{ width: 32, height: 32, fontSize: 11 }}>{p.initials}</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{p.name}</div>
                <div className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-50)" }}>{p.role}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span className={`ih-dot ih-dot-${p.tone}`} />
                <span style={{ fontSize: 11, color: "var(--ih-ink-65)" }}>{p.questionnaire}</span>
              </div>
              <span className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)" }}>{p.call}</span>
              <Icon name="chevronRight" size={11} style={{ color: "var(--ih-ink-30)" }} />
            </div>
          ))}
        </div>
      </div>

      {/* Our team */}
      <div>
        <div className="ih-eyebrow" style={{ marginBottom: 10 }}>Our team {"·"} {ourTeam.length}</div>
        <div className="ih-card" style={{ padding: 0 }}>
          {ourTeam.map((p, i) => (
            <div
              key={p.name}
              style={{
                display: "grid",
                gridTemplateColumns: "auto 1fr auto auto",
                gap: 14,
                padding: "12px 16px",
                borderTop: i === 0 ? "0" : "1px solid var(--ih-line)",
                alignItems: "center",
              }}
            >
              <div className="ih-avatar" style={{ width: 32, height: 32, fontSize: 11, background: "var(--ih-accent-soft)", color: "var(--ih-accent)" }}>{p.initials}</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{p.name}</div>
                <div className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-50)" }}>{p.role}</div>
              </div>
              <span className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-50)" }}>{p.assigned}</span>
              <Icon name="chevronRight" size={11} style={{ color: "var(--ih-ink-30)" }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Main page                                                          */
/* ------------------------------------------------------------------ */

export default function ClientHubPage({ engagement, customer, clientTenantSlug, companyLabel }: EngagementHubProps) {
  const [activeTab, setActiveTab] = useState(0)
  const [toast, setToast] = useState<{message: string; tone?: string} | null>(null)
  const [emailDraft, setEmailDraft] = useState<{to: string; subject: string; body: string} | null>(null)
  const tabs = ["Overview", "Engagements", "Bookings ★ Mock", "Deals ★ Mock", "Invoices ★ Mock", "Workflows ★ Mock", "Documents ★ Mock", "Activity ★ Mock", "Team"]

  const tabContent = [
    <OverviewTab key="overview" setActiveTab={setActiveTab} engagement={engagement} customer={customer} clientTenantSlug={clientTenantSlug} companyLabel={companyLabel} />,
    <EngagementsTab key="engagements" />,
    <BookingsTab key="bookings" />,
    <DealsTab key="deals" />,
    <InvoicesTab key="invoices" />,
    <WorkflowsTab key="workflows" />,
    <DocumentsTab key="documents" setToast={(t: {message: string; tone?: string}) => setToast(t)} />,
    <ActivityTab key="activity" />,
    <TeamTab key="team" />,
  ]

  const contactName = `${customer.firstName ?? ""} ${customer.lastName ?? ""}`.trim() || "—"
  const firstChar = companyLabel.trim().charAt(0).toUpperCase() || "·"
  const wordsInLabel = companyLabel.trim().split(/\s+/)
  const labelHead = wordsInLabel.slice(0, -1).join(" ")
  const labelTail = wordsInLabel.slice(-1)[0]
  const since = customer.createdAt
    ? new Date(customer.createdAt).toLocaleDateString("en-GB", { month: "short", year: "numeric" })
    : "—"
  const statusTone =
    engagement.status === "ACTIVE" ? "ok"
    : engagement.status === "PAUSED" ? "warn"
    : engagement.status === "COMPLETED" ? "muted"
    : engagement.status === "CANCELLED" ? "danger"
    : "info"

  return (
    <div style={{ margin: "-24px -24px" }}>
      {/* Hero header — LIVE from engagement + customer */}
      <div style={{ padding: "24px 28px 18px", borderBottom: "1px solid var(--ih-line)", display: "grid", gridTemplateColumns: "1fr auto", gap: 24, alignItems: "flex-end" }}>
        <div style={{ display: "flex", gap: 18, alignItems: "flex-end" }}>
          <div className="ih-avatar ih-hatch" style={{ width: 84, height: 84, borderRadius: 16, fontSize: 36, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--ih-surface-2)", border: "1px solid var(--ih-line)" }}>
            <span style={{ fontStyle: "italic", fontFamily: "var(--ih-font-serif)", color: "var(--ih-ink)" }}>{firstChar}</span>
          </div>
          <div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
              <span className="ih-eyebrow">/eng_{engagement.id.slice(0, 6)} {"·"} engagement</span>
              <span className={`ih-pill ih-pill-${statusTone}`}><span className={`ih-dot ih-dot-${statusTone}`}/> {(engagement.status ?? "DRAFT").toLowerCase()}</span>
              <span className="ih-pill">{engagement.stage}</span>
            </div>
            <h1 className="ih-serif" style={{ margin: 0, fontSize: 44, lineHeight: 0.98 }}>
              {labelHead ? labelHead + " " : ""}<span className="ih-italic-red">{labelTail}</span>
            </h1>
            <div style={{ marginTop: 10, display: "flex", gap: 18, fontSize: 11.5, color: "var(--ih-ink-50)", flexWrap: "wrap" }}>
              <span><Icon name="building" size={11}/> &nbsp;{contactName}</span>
              <span><Icon name="mail" size={11}/> &nbsp;{customer.email ?? "—"}</span>
              <span><Icon name="phone" size={11}/> &nbsp;{customer.phone ?? "—"}</span>
              <span><Icon name="clock" size={11}/> &nbsp;Customer since {since}</span>
            </div>
            {/* Sub-route links — those pages are already on live data (Phase 0.1.C / 0.3 / 0.4 / 0.5) */}
            <div style={{ marginTop: 10, display: "flex", gap: 6, flexWrap: "wrap" }}>
              <Link href={`/platform/clients/${engagement.id}/onboarding`} className="ih-btn ih-btn-ghost ih-btn-sm" style={{ textDecoration: "none" }}>
                <Icon name="users" size={11}/> Onboarding
              </Link>
              <Link href={`/platform/clients/${engagement.id}/audit`} className="ih-btn ih-btn-ghost ih-btn-sm" style={{ textDecoration: "none" }}>
                <Icon name="check" size={11}/> Audit workspace
              </Link>
              <Link href={`/platform/clients/${engagement.id}/report`} className="ih-btn ih-btn-ghost ih-btn-sm" style={{ textDecoration: "none" }}>
                <Icon name="file" size={11}/> Report
              </Link>
              {clientTenantSlug && (
                <Link href={`/${clientTenantSlug}/dashboard`} className="ih-btn ih-btn-ghost ih-btn-sm" style={{ textDecoration: "none" }} target="_blank">
                  <Icon name="arrowUpRight" size={11}/> Client portal
                </Link>
              )}
            </div>
          </div>
        </div>
        {/* Vital stats inline — ★ Mock */}
        <div style={{ display: "flex", gap: 22 }}>
          {([
            ["Lifetime ★ Mock", "£48.2k", "ok"],
            ["This sprint ★ Mock", "32/40h", "accent"],
            ["Open inv. ★ Mock", "£4.2k", "warn"],
            ["Health ★ Mock", "A−", "ok"],
          ] as [string, string, string][]).map(([l, v, t]) => (
            <div key={l}>
              <div className="ih-eyebrow" style={{ marginBottom: 4, ...MOCK_BADGE_STYLE }}>{l}</div>
              <div className="ih-serif" style={{ fontSize: 26, lineHeight: 1, color: t === "warn" ? "var(--ih-warn)" : t === "accent" ? "var(--ih-accent)" : "var(--ih-ink)" }}>{v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ padding: "0 28px", display: "flex", gap: 0, borderBottom: "1px solid var(--ih-line)", background: "var(--ih-bg)" }}>
        {tabs.map((t, i) => (
          <button key={t} onClick={() => setActiveTab(i)} style={{ background: "transparent", border: 0, padding: "12px 14px", fontSize: 12.5, color: activeTab === i ? "var(--ih-ink)" : "var(--ih-ink-50)", fontWeight: activeTab === i ? 500 : 400, cursor: "pointer", borderBottom: activeTab === i ? "2px solid var(--ih-accent)" : "2px solid transparent", marginBottom: "-1px" }}>{t}</button>
        ))}
      </div>

      {/* Body grid */}
      <div style={{ display: "grid", gridTemplateColumns: activeTab === 0 ? "1fr 320px" : "1fr", gap: 0 }}>
        <div style={{ padding: "20px 28px 48px", borderRight: activeTab === 0 ? "1px solid var(--ih-line)" : "none" }}>
          {tabContent[activeTab]}
        </div>

        {/* Right rail: only on Overview */}
        {activeTab === 0 && (
          <div style={{ padding: "20px 20px 48px", background: "var(--ih-surface-2)", borderTop: 0 }}>
            <div className="ih-eyebrow" style={{ marginBottom: 14 }}>Right rail {"·"} contextual</div>

            {/* Contacts */}
            <div className="ih-card" style={{ marginBottom: 12, background: "var(--ih-surface)" }}>
              <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--ih-line)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span className="ih-eyebrow">Contacts {"·"} 4</span>
                <button className="ih-btn ih-btn-quiet ih-btn-sm" style={{ height: 22, padding: "0 6px" }} onClick={() => setActiveTab(8)}><Icon name="plus" size={11} /></button>
              </div>
              <div>
                {([
                  ["Mira Sato", "Founder · primary", "green"],
                  ["Sam Park", "Ops lead", "muted"],
                  ["Lara Kim", "Finance", "muted"],
                  ["Jamie F.", "Engineering", "muted"],
                ] as [string, string, string][]).map(([n, r, t]) => (
                  <div key={n} style={{ padding: "8px 14px", display: "flex", gap: 10, alignItems: "center", borderTop: "1px solid var(--ih-line)" }}>
                    <div className="ih-avatar" style={{ width: 24, height: 24, fontSize: 9 }}>{n.split(" ").map(w => w[0]).join("")}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 500 }}>{n}</div>
                      <div className="ih-mono" style={{ fontSize: 9.5, color: "var(--ih-ink-40)" }}>{r}</div>
                    </div>
                    {t === "green" && <span className="ih-dot ih-dot-ok" />}
                  </div>
                ))}
              </div>
            </div>

            {/* AI summary */}
            <div className="ih-card ih-card-pad" style={{ marginBottom: 12, background: "var(--ih-ink)", color: "#fff", padding: 16, borderColor: "transparent" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                <Icon name="sparkles" size={13} style={{ color: "#fff" }} />
                <span className="ih-eyebrow" style={{ color: "rgba(255,255,255,0.6)" }}>Copilot {"·"} this client</span>
              </div>
              <p style={{ margin: 0, fontSize: 12, lineHeight: 1.55, color: "rgba(255,255,255,0.85)" }}>
                Sprint 4 is <strong style={{ color: "#fff" }}>78% complete</strong> and 6h over forecast. Mira&apos;s last touch was a NPS 9 &mdash; good renewal window. Outstanding invoice is 14 days old; I drafted a friendly chase ready to send.
              </p>
              <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
                <button className="ih-btn ih-btn-sm" style={{ background: "rgba(255,255,255,0.15)", color: "#fff" }} onClick={() => setEmailDraft({ to: "mira@northwind.co", subject: "Friendly reminder: Invoice NW-002 outstanding", body: "Hi Mira,\n\nJust a quick note to check in on invoice NW-002 for £4,200. It was sent on Apr 28 and is now 14 days past due.\n\nIf there is anything holding this up or if you need a copy re-sent, just let me know.\n\nThanks,\nLuke" })}>Send chase</button>
                <button className="ih-btn ih-btn-sm" style={{ background: "transparent", color: "rgba(255,255,255,0.7)", borderColor: "rgba(255,255,255,0.2)" }} onClick={() => setEmailDraft({ to: "mira@northwind.co", subject: "Q3 Renewal — Northwind Co.", body: "Hi Mira,\n\nWith sprint 4 wrapping up and the Q2 retainer entering its final stretch, I wanted to open the conversation about continuing into Q3.\n\nBased on the audit findings and the momentum we have built, I have drafted a proposed scope for the next quarter. Happy to walk through it on our next call.\n\nLooking forward to discussing.\n\nBest,\nLuke" })}>Draft renewal</button>
              </div>
            </div>

            {/* Pinned notes */}
            <div className="ih-card" style={{ marginBottom: 12, background: "var(--ih-surface)" }}>
              <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--ih-line)" }}>
                <span className="ih-eyebrow">Pinned {"·"} 2</span>
              </div>
              <div style={{ padding: "12px 14px" }}>
                <div style={{ fontSize: 12, lineHeight: 1.5, paddingBottom: 10, marginBottom: 10, borderBottom: "1px solid var(--ih-line)" }}>
                  <strong>Prefers async.</strong> Don&apos;t book past 16:00 UK. Lara approves all spend &gt; £500.
                  <div className="ih-mono" style={{ fontSize: 9.5, color: "var(--ih-ink-40)", marginTop: 6 }}>luke {"·"} 4 weeks ago</div>
                </div>
                <div style={{ fontSize: 12, lineHeight: 1.5 }}>
                  Renewal conversation slot: <strong>last week of June</strong>. Q3 brief drafted in /docs.
                  <div className="ih-mono" style={{ fontSize: 9.5, color: "var(--ih-ink-40)", marginTop: 6 }}>luke {"·"} 6 days ago</div>
                </div>
              </div>
            </div>

            {/* Recent activity tail */}
            <div className="ih-card" style={{ background: "var(--ih-surface)" }}>
              <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--ih-line)" }}>
                <span className="ih-eyebrow">Recent {"·"} 5</span>
              </div>
              <div>
                {([
                  ["09:42", "Stripe", "paid /inv_2039", "ok"],
                  ["08:51", "Mira", "approved Q2 brief", "ok"],
                  ["Mon", "Portal", "new comment from Jamie", "muted"],
                  ["Sun", "Workflow", "monthly digest sent", "ok"],
                  ["Fri", "You", "logged 4.5h to sprint 4", "muted"],
                ] as [string, string, string, string][]).map((r, i) => (
                  <div key={i} style={{ padding: "8px 14px", display: "grid", gridTemplateColumns: "36px 1fr auto", gap: 8, alignItems: "center", borderTop: "1px solid var(--ih-line)", fontSize: 11.5 }}>
                    <span className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)" }}>{r[0]}</span>
                    <span><strong style={{ fontWeight: 500 }}>{r[1]}</strong> <span style={{ color: "var(--ih-ink-65)" }}>{r[2]}</span></span>
                    <span className={`ih-dot ih-dot-${r[3]}`} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
      {toast && <NotificationToast message={toast.message} tone={toast.tone as any} onDismiss={() => setToast(null)} />}
      {emailDraft && <EmailDraftDialog open={true} onClose={() => setEmailDraft(null)} to={emailDraft.to} subject={emailDraft.subject} body={emailDraft.body} onSend={() => { setEmailDraft(null); setToast({ message: "Email sent", tone: "ok" }) }} />}
    </div>
  )
}
