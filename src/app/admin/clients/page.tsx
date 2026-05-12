"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Icon, type IconName } from "@/components/shell"

/* ── Data ────────────────────────────────────────────────────────────────── */

interface SegmentItem {
  id: string; label: string; count: number;
  icon?: IconName; active?: boolean; pinned?: boolean; dot?: string;
}
interface Segment {
  group: string; items?: SegmentItem[]; tags?: string[];
}

const SEGMENTS: Segment[] = [
  { group: "Saved views", items: [
    { id: "all",       label: "All clients",         count: 47, icon: "users",  active: false },
    { id: "mine",      label: "My active",           count: 12, icon: "star",   active: true,  pinned: true },
    { id: "audit",     label: "Auditing now",        count: 3,  icon: "audit",  pinned: true },
    { id: "awaiting",  label: "Awaiting approval",   count: 5,  icon: "clock",  pinned: true },
    { id: "overdue",   label: "Overdue invoices",    count: 2,  icon: "invoice", dot: "danger" },
    { id: "risk",      label: "At risk",             count: 4,  icon: "flag",   dot: "danger" },
    { id: "closing",   label: "Closing this month",  count: 6,  icon: "target" },
  ]},
  { group: "By stage", items: [
    { id: "discovery", label: "Discovery",     count: 3 },
    { id: "proposal",  label: "Proposal sent", count: 5 },
    { id: "active",    label: "Active",        count: 24 },
    { id: "retainer",  label: "On retainer",   count: 10 },
    { id: "won",       label: "Closed won",    count: 28 },
  ]},
  { group: "By type", items: [
    { id: "project",   label: "Project",  count: 15 },
    { id: "retain",    label: "Retainer", count: 10 },
    { id: "hybrid",    label: "Hybrid",   count: 4 },
  ]},
  { group: "Tags", tags: ["fintech", "ecommerce", "saas", "legal", "manufacturing", "wellness"] },
]

type Row = {
  id: string; initials: string; customer: string; contact: string;
  title: string; type: string; status: string; stage: string;
  health: number | null; value: number | null; valueUnit?: string;
  next: string; nextWhen: string; nextTone: string;
  owner: string; lastActivity: string;
  proposed?: boolean; risk?: boolean;
}

const ROWS: Row[] = [
  { id: "c-northwind", initials: "NW", customer: "Northwind Co.", contact: "Mira Sato", title: "Q2 retainer", type: "RETAINER", status: "ACTIVE", stage: "AUDITING", health: 92, value: 24500, valueUnit: "\u00a3", next: "Sprint review Tue", nextWhen: "2d", nextTone: "info", owner: "LH", lastActivity: "4h ago" },
  { id: "c-vellum", initials: "VC", customer: "Vellum & Co.", contact: "Tom Reeves", title: "Client portal rebuild", type: "PROJECT", status: "ACTIVE", stage: "IMPLEMENTING", health: 78, value: 48000, valueUnit: "\u00a3", next: "Send invoice #3", nextWhen: "today", nextTone: "accent", owner: "LH", lastActivity: "1d ago" },
  { id: "c-seaglass", initials: "SG", customer: "Sea Glass Studio", contact: "Mira Patel", title: "Discovery + scoping", type: "PROJECT", status: "PROPOSED", stage: "PROPOSAL", health: 65, value: 18000, valueUnit: "\u00a3", proposed: true, next: "Awaiting decision", nextWhen: "5d", nextTone: "warn", owner: "LH", lastActivity: "3d ago" },
  { id: "c-bowery", initials: "BM", customer: "Bowery Mills", contact: "Jonas Hale", title: "Monthly ops retainer", type: "RETAINER", status: "ACTIVE", stage: "RETAINER", health: 88, value: 4200, valueUnit: "\u00a3/mo", next: "Q1 review call", nextWhen: "Wed", nextTone: "info", owner: "LH", lastActivity: "2d ago" },
  { id: "c-brigham", initials: "BA", customer: "Brigham Architects", contact: "Eleanor Brigham", title: "Workflow rebuild", type: "PROJECT", status: "PAUSED", stage: "IMPLEMENTING", health: 42, value: 12000, valueUnit: "\u00a3", risk: true, next: "Overdue invoice \u00a34,000", nextWhen: "12d late", nextTone: "danger", owner: "LH", lastActivity: "18d ago" },
  { id: "c-pebble", initials: "PP", customer: "Pebble & Pine", contact: "Asha Kapoor", title: "Initial discovery", type: "PROJECT", status: "DRAFT", stage: "DISCOVERY", health: null, value: null, next: "Discovery call", nextWhen: "Tue 10am", nextTone: "info", owner: "LH", lastActivity: "1d ago" },
  { id: "c-midatl", initials: "MA", customer: "Mid-Atlantic Co.", contact: "Daniel Foss", title: "Reporting setup", type: "PROJECT", status: "ACTIVE", stage: "REPORTING", health: 81, value: 15500, valueUnit: "\u00a3", next: "Share deliverable", nextWhen: "today", nextTone: "info", owner: "LH", lastActivity: "6h ago" },
  { id: "c-castor", initials: "CF", customer: "Castor Foods", contact: "Yuki Sato", title: "Customer ops audit", type: "PROJECT", status: "ACTIVE", stage: "AUDITING", health: 90, value: 22000, valueUnit: "\u00a3", next: "Audit window closes", nextWhen: "Fri", nextTone: "warn", owner: "LH", lastActivity: "5h ago" },
  { id: "c-arden", initials: "AR", customer: "Arden Health", contact: "Priya Vance", title: "Booking system audit + handover", type: "HYBRID", status: "ACTIVE", stage: "REPORTING", health: 84, value: 38000, valueUnit: "\u00a3", next: "Findings call", nextWhen: "Thu", nextTone: "info", owner: "LH", lastActivity: "1d ago" },
]

const STAGE_META: Record<string, { idx: number; label: string; tone: string }> = {
  DISCOVERY:    { idx: 0, label: "Discovery",    tone: "info" },
  PROPOSAL:     { idx: 1, label: "Proposal",     tone: "warn" },
  CONTRACTED:   { idx: 2, label: "Contracted",   tone: "info" },
  ONBOARDING:   { idx: 3, label: "Onboarding",   tone: "info" },
  AUDITING:     { idx: 4, label: "Auditing",     tone: "info" },
  REPORTING:    { idx: 5, label: "Reporting",    tone: "info" },
  IMPLEMENTING: { idx: 6, label: "Implementing", tone: "info" },
  RETAINER:     { idx: 7, label: "Retainer",     tone: "ok"   },
  CLOSED_WON:   { idx: 8, label: "Won",          tone: "ok"   },
  CLOSED_LOST:  { idx: 8, label: "Lost",         tone: "muted"},
}

/* ── Sub-components ──────────────────────────────────────────────────────── */

function SegmentRail({ activeSegment, onSegmentChange }: { activeSegment: string; onSegmentChange: (id: string) => void }) {
  return (
    <aside style={{ width: 200, borderRight: "1px solid var(--ih-line)", padding: "12px 8px", overflowY: "auto", flexShrink: 0 }} className="scrollbar-thin">
      {SEGMENTS.map((sec, i) => (
        <div key={i} style={{ marginBottom: 12 }}>
          <div className="ih-eyebrow" style={{ padding: "8px 8px 4px", fontSize: 9 }}>{sec.group}</div>
          {sec.items && sec.items.map((it) => {
            const isActive = it.id === activeSegment
            return (
              <div key={it.id} onClick={() => onSegmentChange(it.id)} style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "5px 8px", borderRadius: "var(--ih-r-sm)",
                background: isActive ? "var(--ih-surface)" : "transparent",
                border: isActive ? "1px solid var(--ih-line)" : "1px solid transparent",
                fontSize: 12, color: isActive ? "var(--ih-ink)" : "var(--ih-ink-65)", cursor: "pointer",
                position: "relative",
              }}>
                {isActive && <span style={{ position: "absolute", left: -8, top: "50%", transform: "translateY(-50%)", width: 2, height: 14, background: "var(--ih-accent)", borderRadius: 2 }} />}
                {it.pinned && <Icon name="pin" size={10} style={{ color: "var(--ih-accent)" }} />}
                {!it.pinned && it.icon && <Icon name={it.icon} size={12} style={{ color: "var(--ih-ink-40)" }} />}
                {!it.pinned && !it.icon && <span style={{ width: 12 }} />}
                <span style={{ flex: 1, fontWeight: isActive ? 500 : 400 }}>{it.label}</span>
                {it.dot && <span className={`ih-dot ih-dot-${it.dot}`} />}
                <span className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)" }}>{it.count}</span>
              </div>
            )
          })}
          {sec.tags && (
            <div style={{ padding: "4px 8px", display: "flex", flexWrap: "wrap", gap: 4 }}>
              {sec.tags.map((t) => (
                <span key={t} className="ih-pill" style={{ fontSize: 9, padding: "2px 6px", textTransform: "lowercase", letterSpacing: "0.02em", fontFamily: "var(--ih-font-sans)" }}>
                  #{t}
                </span>
              ))}
            </div>
          )}
        </div>
      ))}
      <button className="ih-btn ih-btn-quiet ih-btn-sm" style={{ width: "100%", justifyContent: "flex-start", marginTop: 4 }}>
        <Icon name="plus" size={11} /> New segment
      </button>
    </aside>
  )
}

function HealthBar({ value }: { value: number | null }) {
  if (value === null || value === undefined) return <span className="ih-num" style={{ color: "var(--ih-ink-30)", fontSize: 11 }}>{"\u2014"}</span>
  const tone = value >= 80 ? "var(--ih-ok)" : value >= 60 ? "var(--ih-warn)" : "var(--ih-danger)"
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div style={{ width: 36, height: 4, background: "var(--ih-surface-3)", borderRadius: 2, overflow: "hidden" }}>
        <div style={{ width: `${value}%`, height: "100%", background: tone }} />
      </div>
      <span className="ih-num" style={{ fontSize: 11, color: "var(--ih-ink-65)" }}>{value}</span>
    </div>
  )
}

function StagePill({ stage, status }: { stage: string; status: string }) {
  const s = STAGE_META[stage] ?? { idx: 0, label: stage, tone: "muted" }
  const isClosed = status === "CANCELLED" || status === "COMPLETED"
  return (
    <div style={{ display: "inline-flex", flexDirection: "column", gap: 3, minWidth: 92 }}>
      <span className={`ih-pill ${s.tone !== "muted" ? `ih-pill-${s.tone}` : ""}`} style={{ fontSize: 9, padding: "2px 6px", alignSelf: "flex-start" }}>
        {s.label}
      </span>
      <div style={{ display: "flex", gap: 2, height: 3 }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} style={{
            flex: 1, height: 3, borderRadius: 1,
            background: i < s.idx ? "var(--ih-ink)" : i === s.idx ? "var(--ih-accent)" : "var(--ih-surface-3)",
            opacity: isClosed ? 0.4 : 1,
          }} />
        ))}
      </div>
    </div>
  )
}

function NextActionCell({ row }: { row: Row }) {
  if (!row.next) return <span style={{ color: "var(--ih-ink-30)" }}>{"\u2014"}</span>
  const toneMap: Record<string, string> = { accent: "var(--ih-accent)", warn: "var(--ih-warn)", info: "var(--ih-info)", danger: "var(--ih-danger)", muted: "var(--ih-ink-50)" }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <span style={{ fontSize: 12, color: row.nextTone === "danger" ? "var(--ih-danger)" : "var(--ih-ink)" }}>{row.next}</span>
      <span className="ih-mono" style={{ fontSize: 10, color: toneMap[row.nextTone] }}>{"\u00b7"} {row.nextWhen}</span>
    </div>
  )
}

function ClientRow({ row, onClick, isSelected }: { row: Row; onClick: () => void; isSelected: boolean }) {
  return (
    <tr onClick={onClick} style={{
      background: isSelected ? "var(--ih-accent-soft-2)" : row.risk ? "rgba(192,57,43,0.025)" : "transparent",
      borderTop: "1px solid var(--ih-line)",
      cursor: "pointer",
    }}>
      <td style={{ padding: "10px 10px 10px 14px", width: 28 }}>
        <input type="checkbox" style={{ accentColor: "var(--ih-accent)" }} onClick={e => e.stopPropagation()} />
      </td>
      <td style={{ padding: "10px 10px" }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div className="ih-avatar" style={{ background: row.risk ? "var(--ih-danger-soft)" : "var(--ih-surface-2)", color: row.risk ? "var(--ih-danger)" : "var(--ih-ink-65)" }}>{row.initials}</div>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontWeight: 500, fontSize: 12.5 }}>{row.customer}</span>
              {row.risk && <span className="ih-pill ih-pill-danger" style={{ fontSize: 8, padding: "1px 5px" }}>AT RISK</span>}
            </div>
            <div style={{ fontSize: 11, color: "var(--ih-ink-50)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 240 }}>{row.title}</div>
          </div>
        </div>
      </td>
      <td style={{ padding: "10px 10px" }}>
        <span className="ih-pill" style={{ fontSize: 9, padding: "2px 6px" }}>{row.type === "PROJECT" ? "Project" : row.type === "RETAINER" ? "Retainer" : "Hybrid"}</span>
      </td>
      <td style={{ padding: "10px 10px" }}>
        <StagePill stage={row.stage} status={row.status} />
      </td>
      <td style={{ padding: "10px 10px" }}><HealthBar value={row.health} /></td>
      <td style={{ padding: "10px 10px" }}>
        {row.value ? (
          <div className="ih-num" style={{ fontSize: 12.5 }}>
            {row.proposed && <span style={{ color: "var(--ih-ink-40)", fontSize: 10, marginRight: 4 }}>est.</span>}
            {row.valueUnit === "\u00a3" ? "\u00a3" : ""}{row.value.toLocaleString()}{row.valueUnit === "\u00a3/mo" ? "/mo" : ""}
          </div>
        ) : <span style={{ color: "var(--ih-ink-30)" }}>{"\u2014"}</span>}
      </td>
      <td style={{ padding: "10px 10px" }}><NextActionCell row={row} /></td>
      <td style={{ padding: "10px 10px" }}>
        <div className="ih-avatar" style={{ width: 22, height: 22, fontSize: 9 }}>{row.owner}</div>
      </td>
      <td style={{ padding: "10px 10px", fontSize: 11, color: "var(--ih-ink-50)" }} className="ih-mono">{row.lastActivity}</td>
      <td style={{ padding: "10px 14px 10px 10px" }}>
        <button className="ih-btn ih-btn-quiet ih-btn-icon" style={{ height: 22, width: 22 }} onClick={e => e.stopPropagation()}><Icon name="moreH" size={12} /></button>
      </td>
    </tr>
  )
}

function PreviewDrawer({ row, onClose }: { row: Row; onClose: () => void }) {
  return (
    <aside style={{ width: 360, borderLeft: "1px solid var(--ih-line)", background: "var(--ih-surface-2)", display: "flex", flexDirection: "column", flexShrink: 0 }}>
      <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--ih-line)", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div className="ih-avatar ih-avatar-lg" style={{ background: "var(--ih-danger-soft)", color: "var(--ih-danger)", fontFamily: "var(--ih-font-serif)", fontStyle: "italic", fontSize: 16 }}>{row.initials}</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{row.customer}</div>
            <div className="ih-eyebrow" style={{ fontSize: 9, marginTop: 2 }}>{row.contact} {"\u00b7"} paused 18d</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          <Link href={`/admin/clients/${row.id}`} className="ih-btn ih-btn-quiet ih-btn-icon" style={{ height: 24, width: 24, textDecoration: "none" }}><Icon name="arrowUpRight" size={12} /></Link>
          <button className="ih-btn ih-btn-quiet ih-btn-icon" style={{ height: 24, width: 24 }} onClick={onClose}><Icon name="x" size={12} /></button>
        </div>
      </div>

      <div className="scrollbar-thin" style={{ flex: 1, overflowY: "auto", padding: 16 }}>
        <div className="ih-serif" style={{ fontSize: 22, lineHeight: 1.1, marginBottom: 6 }}>
          Workflow <span className="ih-italic-red">rebuild</span>
        </div>
        <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
          <span className="ih-pill" style={{ fontSize: 9, padding: "2px 6px" }}>Project</span>
          <span className="ih-pill ih-pill-warn" style={{ fontSize: 9, padding: "2px 6px" }}>Paused</span>
          <span className="ih-pill ih-pill-info" style={{ fontSize: 9, padding: "2px 6px" }}>Implementing</span>
        </div>

        <div style={{ background: "var(--ih-danger-soft)", borderRadius: "var(--ih-r-md)", padding: "10px 12px", marginBottom: 16, display: "flex", gap: 10, alignItems: "flex-start" }}>
          <Icon name="flag" size={14} style={{ color: "var(--ih-danger)", marginTop: 1 }} />
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--ih-danger)", marginBottom: 2 }}>Why this is at risk</div>
            <div style={{ fontSize: 11.5, color: "var(--ih-ink)", lineHeight: 1.45 }}>
              Invoice #2 is <strong>12 days overdue</strong>, client hasn&apos;t replied in 18 days, and the payment-reminder workflow paused after 3 attempts. Last contact bounced.
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 1, background: "var(--ih-line)", border: "1px solid var(--ih-line)", borderRadius: "var(--ih-r-md)", overflow: "hidden", marginBottom: 16 }}>
          {[
            { label: "Outstanding", value: "\u00a34,000",  tone: "var(--ih-danger)" },
            { label: "Days late",   value: "12",      tone: "var(--ih-danger)" },
            { label: "Last reply",  value: "18d",     tone: "var(--ih-ink)" },
          ].map((s) => (
            <div key={s.label} style={{ background: "var(--ih-surface)", padding: "10px 12px" }}>
              <div className="ih-eyebrow" style={{ fontSize: 8, marginBottom: 4 }}>{s.label}</div>
              <div className="ih-serif ih-num" style={{ fontSize: 20, color: s.tone, lineHeight: 1 }}>{s.value}</div>
            </div>
          ))}
        </div>

        <div className="ih-eyebrow" style={{ marginBottom: 8 }}>Recent activity</div>
        {[
          { date: "Apr 02", text: "Payment-reminder workflow paused after 3 attempts", tone: "warn" },
          { date: "Mar 28", text: "Reminder #2 sent \u00b7 no reply", tone: "muted" },
          { date: "Mar 24", text: "Reminder #1 sent \u00b7 no reply", tone: "muted" },
          { date: "Mar 20", text: "Invoice #2 due \u00b7 \u00a34,000", tone: "danger" },
          { date: "Mar 18", text: "Last reply from Eleanor Brigham", tone: "info" },
          { date: "Mar 02", text: "Invoice #1 paid in full \u00b7 \u00a38,000", tone: "ok" },
        ].map((it, i) => (
          <div key={i} style={{ display: "flex", gap: 10, padding: "7px 0", borderBottom: "1px dashed var(--ih-line)" }}>
            <span className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)", width: 44, flexShrink: 0 }}>{it.date}</span>
            <span className={`ih-dot ih-dot-${it.tone}`} style={{ marginTop: 5, flexShrink: 0 }} />
            <span style={{ fontSize: 11.5, color: "var(--ih-ink-65)", lineHeight: 1.45 }}>{it.text}</span>
          </div>
        ))}

        <div className="ih-eyebrow" style={{ marginTop: 16, marginBottom: 8 }}>Customer</div>
        <div className="ih-card" style={{ padding: 12 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12 }}>
            {[
              ["Contact", "Eleanor Brigham"],
              ["Email",   "eleanor@brigham-arch.co"],
              ["Phone",   "+44 20 7946 0958"],
              ["Tags",    "fintech, repeat"],
              ["Customer since", "Aug 2024"],
              ["Total spend",    "\u00a38,000"],
              ["Last booking",   "Jan 14, 2026"],
            ].map(([k, v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <span style={{ color: "var(--ih-ink-50)" }}>{k}</span>
                <span style={{ color: "var(--ih-ink)", textAlign: "right", fontFamily: k === "Phone" || k === "Total spend" ? "var(--ih-font-mono)" : undefined }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ borderTop: "1px solid var(--ih-line)", padding: 12, display: "flex", flexDirection: "column", gap: 6, background: "var(--ih-surface)" }}>
        <button className="ih-btn ih-btn-accent" style={{ width: "100%" }}>
          <Icon name="mail" size={12} /> Send dunning reminder
        </button>
        <div style={{ display: "flex", gap: 6 }}>
          <button className="ih-btn ih-btn-ghost ih-btn-sm" style={{ flex: 1 }}><Icon name="phone" size={11} /> Call</button>
          <button className="ih-btn ih-btn-ghost ih-btn-sm" style={{ flex: 1 }}><Icon name="calendar" size={11} /> Schedule</button>
          <button className="ih-btn ih-btn-ghost ih-btn-sm" style={{ flex: 1 }}><Icon name="pause" size={11} /> Close lost</button>
        </div>
      </div>
    </aside>
  )
}

/* ── Main screen ──────────────────────────────────────────────────────────── */

const TH_STYLE: React.CSSProperties = { textAlign: "left", padding: "10px 10px", fontWeight: 500, fontSize: 10, color: "var(--ih-ink-40)", textTransform: "uppercase", letterSpacing: "0.12em", fontFamily: "var(--ih-font-mono)" }

export default function ClientsListPage() {
  const [selectedId, setSelectedId] = useState<string | null>("c-brigham")
  const [activeSegment, setActiveSegment] = useState("mine")
  const [search, setSearch] = useState("")
  const selected = ROWS.find((r) => r.id === selectedId)

  const filteredRows = useMemo(() => {
    let rows = ROWS
    // Segment filtering
    switch (activeSegment) {
      case "all": break
      case "mine": break // all rows belong to LH
      case "audit": rows = rows.filter(r => r.stage === "AUDITING"); break
      case "awaiting": rows = rows.filter(r => r.status === "PROPOSED" || r.status === "PAUSED"); break
      case "overdue": rows = rows.filter(r => r.nextTone === "danger"); break
      case "risk": rows = rows.filter(r => r.risk === true); break
      case "closing": rows = rows.filter(r => r.stage === "REPORTING" || r.stage === "RETAINER"); break
      // By stage
      case "discovery": rows = rows.filter(r => r.stage === "DISCOVERY"); break
      case "proposal": rows = rows.filter(r => r.stage === "PROPOSAL"); break
      case "active": rows = rows.filter(r => r.status === "ACTIVE"); break
      case "retainer": rows = rows.filter(r => r.stage === "RETAINER"); break
      case "won": rows = rows.filter(r => r.stage === "CLOSED_WON"); break
      // By type
      case "project": rows = rows.filter(r => r.type === "PROJECT"); break
      case "retain": rows = rows.filter(r => r.type === "RETAINER"); break
      case "hybrid": rows = rows.filter(r => r.type === "HYBRID"); break
    }
    // Search filtering
    if (search.trim()) {
      const q = search.toLowerCase()
      rows = rows.filter(r => r.customer.toLowerCase().includes(q) || r.title.toLowerCase().includes(q) || r.contact.toLowerCase().includes(q))
    }
    return rows
  }, [activeSegment, search])

  return (
    <div style={{ display: "flex", height: "calc(100vh - 120px)", margin: "-24px -24px" }}>
      <SegmentRail activeSegment={activeSegment} onSegmentChange={setActiveSegment} />

      <section style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "18px 20px 14px", borderBottom: "1px solid var(--ih-line)" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
            <div>
              <div className="ih-eyebrow" style={{ marginBottom: 6 }}>Saved view {"\u00b7"} pinned</div>
              <h1 className="ih-serif" style={{ fontSize: 26, margin: 0 }}>My <span className="ih-italic-red">active</span></h1>
              <div style={{ fontSize: 12, color: "var(--ih-ink-50)", marginTop: 4 }}>9 engagements {"\u00b7"} 5 need a reply from you {"\u00b7"} last refreshed 2s ago</div>
            </div>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <button className="ih-btn ih-btn-quiet ih-btn-sm"><Icon name="filter" size={11} /> 3 filters</button>
              <button className="ih-btn ih-btn-quiet ih-btn-sm"><Icon name="sliders" size={11} /> Columns</button>
              <div style={{ width: 1, height: 18, background: "var(--ih-line)" }} />
              <div style={{ display: "flex", border: "1px solid var(--ih-line)", borderRadius: "var(--ih-r-md)", padding: 2, gap: 2 }}>
                <button className="ih-btn ih-btn-sm" style={{ height: 22, background: "var(--ih-surface-2)", border: 0, color: "var(--ih-ink)" }}><Icon name="list" size={11} /> Table</button>
                <button className="ih-btn ih-btn-quiet ih-btn-sm" style={{ height: 22 }}><Icon name="grid" size={11} /> Board</button>
              </div>
            </div>
          </div>
        </div>

        <div style={{ padding: "14px 20px", display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 1, background: "var(--ih-line)", borderBottom: "1px solid var(--ih-line)" }}>
          {[
            { label: "Active", value: "9", sub: "+2 vs last week", tone: "var(--ih-ink)" },
            { label: "Monthly recurring", value: "\u00a311.4K", sub: "across 4 retainers", tone: "var(--ih-ok)" },
            { label: "Project pipeline", value: "\u00a3128K", sub: "in flight", tone: "var(--ih-ink)" },
            { label: "Awaiting approval", value: "5", sub: "oldest: 4d", tone: "var(--ih-warn)" },
            { label: "Overdue invoices", value: "2", sub: "\u00a36,400 total", tone: "var(--ih-danger)" },
          ].map((s) => (
            <div key={s.label} style={{ background: "var(--ih-bg)", padding: "12px 16px" }}>
              <div className="ih-eyebrow" style={{ fontSize: 9, marginBottom: 4 }}>{s.label}</div>
              <div className="ih-serif ih-num" style={{ fontSize: 26, lineHeight: 1, color: s.tone }}>{s.value}</div>
              <div className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)", marginTop: 6 }}>{s.sub}</div>
            </div>
          ))}
        </div>

        <div style={{ padding: "10px 20px", display: "flex", gap: 8, alignItems: "center", borderBottom: "1px solid var(--ih-line)" }}>
          <div style={{ position: "relative", flex: 1, maxWidth: 320 }}>
            <Icon name="search" size={13} style={{ position: "absolute", left: 10, top: 8, color: "var(--ih-ink-40)" }} />
            <input className="ih-input" placeholder="Search clients, engagement titles, tags\u2026" style={{ paddingLeft: 30 }} value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <span className="ih-pill" style={{ background: "var(--ih-accent-soft)", color: "var(--ih-accent)", borderColor: "transparent" }}>Stage: any <Icon name="x" size={9} /></span>
          <span className="ih-pill">Owner: me <Icon name="x" size={9} /></span>
          <span className="ih-pill">Type: any <Icon name="x" size={9} /></span>
          <button className="ih-btn ih-btn-quiet ih-btn-sm">+ Filter</button>
          <div style={{ flex: 1 }} />
          <span className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)" }}>SORT: LAST ACTIVITY {"\u2193"}</span>
        </div>

        <div className="scrollbar-thin" style={{ flex: 1, overflowY: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead style={{ position: "sticky", top: 0, background: "var(--ih-bg)", zIndex: 1 }}>
              <tr style={{ borderBottom: "1px solid var(--ih-line)" }}>
                <th style={{ width: 28, padding: "10px 10px 10px 14px" }}></th>
                <th style={TH_STYLE}>Client {"\u00b7"} Engagement</th>
                <th style={TH_STYLE}>Type</th>
                <th style={TH_STYLE}>Stage</th>
                <th style={TH_STYLE}>Health</th>
                <th style={TH_STYLE}>Value</th>
                <th style={TH_STYLE}>Next action</th>
                <th style={TH_STYLE}>Owner</th>
                <th style={TH_STYLE}>Last activity</th>
                <th style={{ width: 36 }}></th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((r) => <ClientRow key={r.id} row={r} onClick={() => setSelectedId(r.id)} isSelected={r.id === selectedId} />)}
            </tbody>
          </table>
        </div>

        <div style={{ padding: "8px 20px", borderTop: "1px solid var(--ih-line)", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11, color: "var(--ih-ink-50)" }}>
          <span>{filteredRows.length} of 47 engagements</span>
          <div style={{ display: "flex", gap: 4 }}>
            <button className="ih-btn ih-btn-quiet ih-btn-icon" style={{ height: 22, width: 22 }}><Icon name="chevronLeft" size={11} /></button>
            <button className="ih-btn ih-btn-quiet ih-btn-icon" style={{ height: 22, width: 22 }}><Icon name="chevronRight" size={11} /></button>
          </div>
        </div>
      </section>

      {selected && <PreviewDrawer row={selected} onClose={() => setSelectedId(null)} />}
    </div>
  )
}
