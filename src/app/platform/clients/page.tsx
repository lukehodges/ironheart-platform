"use client"

import { useState, useMemo, useRef, useEffect } from "react"
import Link from "next/link"
import { Icon, type IconName } from "@/components/shell"
import {
  mockClients,
  STAGE_META,
  STAGE_ORDER,
  TYPE_LABEL,
  type ClientEngagement,
  type ClientFilters,
  type ClientSortBy,
  type ClientSortDir,
  type EngagementStage,
  type EngagementType,
} from "@/lib/mock/clients"

/* ── Column config ───────────────────────────────────────────────────────── */

type ColumnId = "customer" | "type" | "stage" | "health" | "value" | "next" | "owner" | "lastActivity"

interface ColumnDef { id: ColumnId; label: string; default: boolean }
const COLUMNS: ColumnDef[] = [
  { id: "customer",     label: "Client · Engagement", default: true },
  { id: "type",         label: "Type",                default: true },
  { id: "stage",        label: "Stage",               default: true },
  { id: "health",       label: "Health",              default: true },
  { id: "value",        label: "Value",               default: true },
  { id: "next",         label: "Next action",         default: true },
  { id: "owner",        label: "Owner",               default: true },
  { id: "lastActivity", label: "Last activity",       default: true },
]

const TH_STYLE: React.CSSProperties = {
  textAlign: "left", padding: "10px 10px", fontWeight: 500, fontSize: 10,
  color: "var(--ih-ink-40)", textTransform: "uppercase", letterSpacing: "0.12em",
  fontFamily: "var(--ih-font-mono)", cursor: "pointer", userSelect: "none",
}

/* ── Popover (lightweight click-outside) ─────────────────────────────────── */

function Popover({
  trigger, children, align = "left", width = 220,
}: { trigger: React.ReactNode; children: (close: () => void) => React.ReactNode; align?: "left" | "right"; width?: number }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener("mousedown", h)
    return () => document.removeEventListener("mousedown", h)
  }, [open])
  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block" }}>
      <div onClick={() => setOpen(o => !o)}>{trigger}</div>
      {open && (
        <div className="animate-pop-in" style={{
          position: "absolute", top: "calc(100% + 6px)", [align === "right" ? "right" : "left"]: 0,
          zIndex: 100, width, background: "var(--ih-surface)", border: "1px solid var(--ih-line)",
          borderRadius: "var(--ih-r-md)", boxShadow: "0 8px 24px rgba(0,0,0,0.08)", padding: 4,
        }}>
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  )
}

function PopoverHeader({ children }: { children: React.ReactNode }) {
  return <div className="ih-eyebrow" style={{ padding: "8px 10px 4px", fontSize: 9 }}>{children}</div>
}
function PopoverItem({ active, onClick, children, danger }: { active?: boolean; onClick: () => void; children: React.ReactNode; danger?: boolean }) {
  return (
    <button onClick={onClick}
      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "var(--ih-surface-2)" }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = active ? "var(--ih-accent-soft)" : "transparent" }}
      style={{
        display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "6px 10px",
        border: 0, background: active ? "var(--ih-accent-soft)" : "transparent",
        fontSize: 12, color: danger ? "var(--ih-danger)" : "var(--ih-ink)", cursor: "pointer",
        textAlign: "left", borderRadius: "var(--ih-r-sm)",
      }}>
      {active && <Icon name="check" size={11} style={{ color: "var(--ih-accent)" }} />}
      {!active && <span style={{ width: 11 }} />}
      {children}
    </button>
  )
}

/* ── Segment rail ────────────────────────────────────────────────────────── */

function SegmentRail({
  activeSegment, onSegmentChange,
  activeTags, onTagToggle,
}: {
  activeSegment: string; onSegmentChange: (id: string) => void;
  activeTags: string[]; onTagToggle: (tag: string) => void;
}) {
  const segments = mockClients.segments()
  return (
    <aside style={{ width: 200, borderRight: "1px solid var(--ih-line)", padding: "12px 8px", overflowY: "auto", flexShrink: 0 }} className="scrollbar-thin">
      {segments.map((sec, i) => (
        <div key={i} style={{ marginBottom: 12 }}>
          <div className="ih-eyebrow" style={{ padding: "8px 8px 4px", fontSize: 9 }}>{sec.group}</div>
          {sec.items?.map((it) => {
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
                {!it.pinned && it.icon && <Icon name={it.icon as IconName} size={12} style={{ color: "var(--ih-ink-40)" }} />}
                {!it.pinned && !it.icon && <span style={{ width: 12 }} />}
                <span style={{ flex: 1, fontWeight: isActive ? 500 : 400 }}>{it.label}</span>
                {it.dot && <span className={`ih-dot ih-dot-${it.dot}`} />}
                <span className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)" }}>{it.count}</span>
              </div>
            )
          })}
          {sec.tags && (
            <div style={{ padding: "4px 8px", display: "flex", flexWrap: "wrap", gap: 4 }}>
              {sec.tags.map((t) => {
                const on = activeTags.includes(t)
                return (
                  <span key={t} onClick={() => onTagToggle(t)} className="ih-pill"
                    style={{
                      fontSize: 9, padding: "2px 6px", textTransform: "lowercase",
                      letterSpacing: "0.02em", fontFamily: "var(--ih-font-sans)",
                      cursor: "pointer",
                      background: on ? "var(--ih-accent-soft)" : undefined,
                      color: on ? "var(--ih-accent)" : undefined,
                      borderColor: on ? "transparent" : undefined,
                    }}>
                    #{t}
                  </span>
                )
              })}
            </div>
          )}
        </div>
      ))}
    </aside>
  )
}

/* ── Cells ───────────────────────────────────────────────────────────────── */

function HealthBar({ value }: { value: number | null }) {
  if (value === null) return <span className="ih-num" style={{ color: "var(--ih-ink-30)", fontSize: 11 }}>—</span>
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

function StagePill({ row, onClick }: { row: ClientEngagement; onClick: (stage: EngagementStage) => void }) {
  const s = STAGE_META[row.stage]
  const isClosed = row.status === "CANCELLED" || row.status === "COMPLETED"
  return (
    <div style={{ display: "inline-flex", flexDirection: "column", gap: 3, minWidth: 92 }}>
      <span
        onClick={(e) => { e.stopPropagation(); onClick(row.stage) }}
        className={`ih-pill ${s.tone !== "muted" ? `ih-pill-${s.tone}` : ""}`}
        title={`Filter by stage: ${s.label}`}
        style={{ fontSize: 9, padding: "2px 6px", alignSelf: "flex-start", cursor: "pointer" }}
      >
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

function NextActionCell({ row }: { row: ClientEngagement }) {
  if (!row.nextAction) return <span style={{ color: "var(--ih-ink-30)" }}>—</span>
  const toneMap: Record<string, string> = { accent: "var(--ih-accent)", warn: "var(--ih-warn)", info: "var(--ih-info)", danger: "var(--ih-danger)", muted: "var(--ih-ink-50)" }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <span style={{ fontSize: 12, color: row.nextAction.tone === "danger" ? "var(--ih-danger)" : "var(--ih-ink)" }}>{row.nextAction.text}</span>
      <span className="ih-mono" style={{ fontSize: 10, color: toneMap[row.nextAction.tone] }}>· {row.nextAction.when}</span>
    </div>
  )
}

function RowActionMenu({ row, onView, onAddFilter }: { row: ClientEngagement; onView: () => void; onAddFilter: (k: keyof ClientFilters, v: string) => void }) {
  return (
    <Popover align="right" width={180} trigger={
      <button className="ih-btn ih-btn-quiet ih-btn-icon" style={{ height: 22, width: 22 }} onClick={e => e.stopPropagation()}>
        <Icon name="moreH" size={12} />
      </button>
    }>
      {(close) => (
        <>
          <PopoverItem onClick={() => { onView(); close() }}>Open preview</PopoverItem>
          <Link href={`/platform/clients/${row.id}`} style={{ textDecoration: "none" }}>
            <PopoverItem onClick={close}>Open full page</PopoverItem>
          </Link>
          <div style={{ height: 1, background: "var(--ih-line)", margin: "4px 0" }} />
          <PopoverItem onClick={() => { onAddFilter("stage", row.stage); close() }}>Filter same stage</PopoverItem>
          <PopoverItem onClick={() => { onAddFilter("type", row.type); close() }}>Filter same type</PopoverItem>
          <PopoverItem onClick={() => { onAddFilter("owner", row.owner.id); close() }}>Filter same owner</PopoverItem>
          <div style={{ height: 1, background: "var(--ih-line)", margin: "4px 0" }} />
          <PopoverItem danger onClick={close}>Archive engagement</PopoverItem>
        </>
      )}
    </Popover>
  )
}

/* ── Row ─────────────────────────────────────────────────────────────────── */

function ClientRow({
  row, columns, isSelected, onClick, onAddFilter,
}: {
  row: ClientEngagement; columns: ColumnId[]; isSelected: boolean;
  onClick: () => void; onAddFilter: (k: keyof ClientFilters, v: string) => void;
}) {
  const visible = (c: ColumnId) => columns.includes(c)
  return (
    <tr onClick={onClick} style={{
      background: isSelected ? "var(--ih-accent-soft-2)" : row.risk ? "rgba(192,57,43,0.025)" : "transparent",
      borderTop: "1px solid var(--ih-line)", cursor: "pointer",
    }}>
      <td style={{ padding: "10px 10px 10px 14px", width: 28 }}>
        <input type="checkbox" style={{ accentColor: "var(--ih-accent)" }} onClick={e => e.stopPropagation()} />
      </td>
      {visible("customer") && (
        <td style={{ padding: "10px 10px" }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <div className="ih-avatar" style={{ background: row.risk ? "var(--ih-danger-soft)" : "var(--ih-surface-2)", color: row.risk ? "var(--ih-danger)" : "var(--ih-ink-65)" }}>{row.customer.initials}</div>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontWeight: 500, fontSize: 12.5 }}>{row.customer.name}</span>
                {row.risk && <span className="ih-pill ih-pill-danger" style={{ fontSize: 8, padding: "1px 5px" }}>AT RISK</span>}
              </div>
              <div style={{ fontSize: 11, color: "var(--ih-ink-50)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 240 }}>{row.title}</div>
            </div>
          </div>
        </td>
      )}
      {visible("type") && (
        <td style={{ padding: "10px 10px" }}>
          <span onClick={(e) => { e.stopPropagation(); onAddFilter("type", row.type) }}
            className="ih-pill" title={`Filter by type: ${TYPE_LABEL[row.type]}`}
            style={{ fontSize: 9, padding: "2px 6px", cursor: "pointer" }}>
            {TYPE_LABEL[row.type]}
          </span>
        </td>
      )}
      {visible("stage") && (
        <td style={{ padding: "10px 10px" }}>
          <StagePill row={row} onClick={(s) => onAddFilter("stage", s)} />
        </td>
      )}
      {visible("health") && <td style={{ padding: "10px 10px" }}><HealthBar value={row.health} /></td>}
      {visible("value") && (
        <td style={{ padding: "10px 10px" }}>
          {row.value ? (
            <div className="ih-num" style={{ fontSize: 12.5 }}>
              {row.proposed && <span style={{ color: "var(--ih-ink-40)", fontSize: 10, marginRight: 4 }}>est.</span>}
              {row.valueUnit === "£" ? "£" : ""}{row.value.toLocaleString()}{row.valueUnit === "£/mo" ? "/mo" : ""}
            </div>
          ) : <span style={{ color: "var(--ih-ink-30)" }}>—</span>}
        </td>
      )}
      {visible("next") && <td style={{ padding: "10px 10px" }}><NextActionCell row={row} /></td>}
      {visible("owner") && (
        <td style={{ padding: "10px 10px" }}>
          <div onClick={(e) => { e.stopPropagation(); onAddFilter("owner", row.owner.id) }}
            className="ih-avatar" title={`Filter by owner: ${row.owner.name}`}
            style={{ width: 22, height: 22, fontSize: 9, cursor: "pointer" }}>
            {row.owner.initials}
          </div>
        </td>
      )}
      {visible("lastActivity") && (
        <td style={{ padding: "10px 10px", fontSize: 11, color: "var(--ih-ink-50)" }} className="ih-mono">{row.lastActivity}</td>
      )}
      <td style={{ padding: "10px 14px 10px 10px" }} onClick={e => e.stopPropagation()}>
        <RowActionMenu row={row} onView={onClick} onAddFilter={onAddFilter} />
      </td>
    </tr>
  )
}

/* ── Preview drawer (right side, slides in) ──────────────────────────────── */

function PreviewDrawer({ row, onClose }: { row: ClientEngagement; onClose: () => void }) {
  return (
    <aside key={row.id} className="animate-slide-in-right" style={{
      width: 360, borderLeft: "1px solid var(--ih-line)", background: "var(--ih-surface-2)",
      display: "flex", flexDirection: "column", flexShrink: 0,
    }}>
      <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--ih-line)", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div className="ih-avatar ih-avatar-lg" style={{ background: row.risk ? "var(--ih-danger-soft)" : "var(--ih-surface)", color: row.risk ? "var(--ih-danger)" : "var(--ih-ink)", fontFamily: "var(--ih-font-serif)", fontStyle: "italic", fontSize: 16 }}>
            {row.customer.initials}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{row.customer.name}</div>
            <div className="ih-eyebrow" style={{ fontSize: 9, marginTop: 2 }}>
              {row.customer.contactName} · {row.status.toLowerCase()} · {row.lastActivity}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          <Link href={`/platform/clients/${row.id}`} className="ih-btn ih-btn-quiet ih-btn-icon" style={{ height: 24, width: 24, textDecoration: "none" }} title="Open full page">
            <Icon name="arrowUpRight" size={12} />
          </Link>
          <button className="ih-btn ih-btn-quiet ih-btn-icon" style={{ height: 24, width: 24 }} onClick={onClose} title="Close">
            <Icon name="x" size={12} />
          </button>
        </div>
      </div>

      <div className="scrollbar-thin" style={{ flex: 1, overflowY: "auto", padding: 16 }}>
        <div className="ih-serif" style={{ fontSize: 22, lineHeight: 1.15, marginBottom: 6 }}>
          {row.title.split(" ").slice(0, -1).join(" ")}{" "}
          <span className="ih-italic-red">{row.title.split(" ").slice(-1)[0]}</span>
        </div>
        <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
          <span className="ih-pill" style={{ fontSize: 9, padding: "2px 6px" }}>{TYPE_LABEL[row.type]}</span>
          <span className={`ih-pill ih-pill-${row.status === "PAUSED" ? "warn" : row.status === "ACTIVE" ? "ok" : "info"}`} style={{ fontSize: 9, padding: "2px 6px" }}>
            {row.status[0] + row.status.slice(1).toLowerCase()}
          </span>
          <span className={`ih-pill ih-pill-${STAGE_META[row.stage].tone}`} style={{ fontSize: 9, padding: "2px 6px" }}>{STAGE_META[row.stage].label}</span>
          {row.tags.map(t => <span key={t} className="ih-pill" style={{ fontSize: 9, padding: "2px 6px", textTransform: "lowercase" }}>#{t}</span>)}
        </div>

        {row.risk && row.riskReason && (
          <div style={{ background: "var(--ih-danger-soft)", borderRadius: "var(--ih-r-md)", padding: "10px 12px", marginBottom: 16, display: "flex", gap: 10, alignItems: "flex-start" }}>
            <Icon name="flag" size={14} style={{ color: "var(--ih-danger)", marginTop: 1 }} />
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--ih-danger)", marginBottom: 2 }}>Why this is at risk</div>
              <div style={{ fontSize: 11.5, color: "var(--ih-ink)", lineHeight: 1.45 }}>{row.riskReason}</div>
            </div>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 1, background: "var(--ih-line)", border: "1px solid var(--ih-line)", borderRadius: "var(--ih-r-md)", overflow: "hidden", marginBottom: 16 }}>
          {[
            row.outstanding
              ? { label: "Outstanding", value: `£${row.outstanding.amount.toLocaleString()}`, tone: "var(--ih-danger)" }
              : { label: "Value",       value: row.value ? `${row.valueUnit === "£" ? "£" : ""}${row.value.toLocaleString()}${row.valueUnit === "£/mo" ? "/mo" : ""}` : "—", tone: "var(--ih-ink)" },
            row.outstanding
              ? { label: "Days late",   value: String(row.outstanding.daysLate), tone: "var(--ih-danger)" }
              : { label: "Health",      value: row.health ? String(row.health) : "—", tone: row.health && row.health < 60 ? "var(--ih-danger)" : "var(--ih-ink)" },
            { label: "Last reply",  value: row.lastActivity, tone: "var(--ih-ink)" },
          ].map((s) => (
            <div key={s.label} style={{ background: "var(--ih-surface)", padding: "10px 12px" }}>
              <div className="ih-eyebrow" style={{ fontSize: 8, marginBottom: 4 }}>{s.label}</div>
              <div className="ih-serif ih-num" style={{ fontSize: 20, color: s.tone, lineHeight: 1 }}>{s.value}</div>
            </div>
          ))}
        </div>

        <div className="ih-eyebrow" style={{ marginBottom: 8 }}>Recent activity</div>
        {row.recentActivity.map((it, i) => (
          <div key={i} style={{ display: "flex", gap: 10, padding: "7px 0", borderBottom: "1px dashed var(--ih-line)" }}>
            <span className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)", width: 60, flexShrink: 0 }}>{it.date}</span>
            <span className={`ih-dot ih-dot-${it.tone}`} style={{ marginTop: 5, flexShrink: 0 }} />
            <span style={{ fontSize: 11.5, color: "var(--ih-ink-65)", lineHeight: 1.45 }}>{it.text}</span>
          </div>
        ))}

        <div className="ih-eyebrow" style={{ marginTop: 16, marginBottom: 8 }}>Customer</div>
        <div className="ih-card" style={{ padding: 12 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12 }}>
            {[
              ["Contact", row.customer.contactName],
              ["Email",   row.customer.email],
              ["Phone",   row.customer.phone],
              ["Tags",    row.tags.join(", ") || "—"],
              ["Customer since", row.customer.since],
              ["Total spend", `£${row.customer.totalSpend.toLocaleString()}`],
              ["Last booking",  row.customer.lastBooking ?? "—"],
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
        <Link href={`/platform/clients/${row.id}`} className="ih-btn ih-btn-accent" style={{ width: "100%", textDecoration: "none", justifyContent: "center" }}>
          <Icon name="arrowUpRight" size={12} /> Open client hub
        </Link>
        <div style={{ display: "flex", gap: 6 }}>
          <button className="ih-btn ih-btn-ghost ih-btn-sm" style={{ flex: 1 }}><Icon name="mail" size={11} /> Email</button>
          <button className="ih-btn ih-btn-ghost ih-btn-sm" style={{ flex: 1 }}><Icon name="calendar" size={11} /> Schedule</button>
          <button className="ih-btn ih-btn-ghost ih-btn-sm" style={{ flex: 1 }}><Icon name="pause" size={11} /> Pause</button>
        </div>
      </div>
    </aside>
  )
}

/* ── Board view (kanban by stage) ────────────────────────────────────────── */

function BoardView({ rows, onRowClick }: { rows: ClientEngagement[]; onRowClick: (id: string) => void }) {
  const stagesToShow: EngagementStage[] = ["DISCOVERY", "PROPOSAL", "AUDITING", "REPORTING", "IMPLEMENTING", "RETAINER"]
  return (
    <div className="scrollbar-thin" style={{ flex: 1, overflowX: "auto", overflowY: "hidden", padding: 20 }}>
      <div style={{ display: "flex", gap: 12, height: "100%", minWidth: "fit-content" }}>
        {stagesToShow.map(stage => {
          const stageRows = rows.filter(r => r.stage === stage)
          const meta = STAGE_META[stage]
          return (
            <div key={stage} style={{
              width: 260, flexShrink: 0, display: "flex", flexDirection: "column",
              background: "var(--ih-surface-2)", borderRadius: "var(--ih-r-md)", border: "1px solid var(--ih-line)",
            }}>
              <div style={{ padding: "10px 12px", borderBottom: "1px solid var(--ih-line)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span className={`ih-pill ih-pill-${meta.tone}`} style={{ fontSize: 9, padding: "2px 6px" }}>{meta.label}</span>
                </div>
                <span className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)" }}>{stageRows.length}</span>
              </div>
              <div className="scrollbar-thin" style={{ flex: 1, overflowY: "auto", padding: 8, display: "flex", flexDirection: "column", gap: 8 }}>
                {stageRows.length === 0 && <div style={{ padding: 12, fontSize: 11, color: "var(--ih-ink-40)", textAlign: "center" }}>Nothing here</div>}
                {stageRows.map(r => (
                  <div key={r.id} onClick={() => onRowClick(r.id)} className="ih-card" style={{ padding: 10, cursor: "pointer" }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                      <div className="ih-avatar" style={{ width: 22, height: 22, fontSize: 9, background: r.risk ? "var(--ih-danger-soft)" : "var(--ih-surface-2)", color: r.risk ? "var(--ih-danger)" : "var(--ih-ink-65)" }}>{r.customer.initials}</div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.customer.name}</div>
                        <div style={{ fontSize: 10, color: "var(--ih-ink-50)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.title}</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
                      <span className="ih-pill" style={{ fontSize: 8, padding: "1px 5px" }}>{TYPE_LABEL[r.type]}</span>
                      {r.value && <span className="ih-num" style={{ fontSize: 11 }}>£{(r.value / 1000).toFixed(1)}k</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ── Filter chips bar ────────────────────────────────────────────────────── */

function FilterChips({
  filters, activeTags, search,
  onRemoveFilter, onRemoveTag, onClearSearch, onClearAll,
}: {
  filters: ClientFilters; activeTags: string[]; search: string;
  onRemoveFilter: (k: keyof ClientFilters, v?: string) => void;
  onRemoveTag: (t: string) => void;
  onClearSearch: () => void;
  onClearAll: () => void;
}) {
  const chips: React.ReactNode[] = []
  filters.stage?.forEach(s => chips.push(
    <span key={`stage-${s}`} className="ih-pill" onClick={() => onRemoveFilter("stage", s)}
      style={{ background: "var(--ih-accent-soft)", color: "var(--ih-accent)", borderColor: "transparent", cursor: "pointer" }}>
      Stage: {STAGE_META[s].label} <Icon name="x" size={9} />
    </span>
  ))
  filters.type?.forEach(t => chips.push(
    <span key={`type-${t}`} className="ih-pill" onClick={() => onRemoveFilter("type", t)} style={{ cursor: "pointer" }}>
      Type: {TYPE_LABEL[t]} <Icon name="x" size={9} />
    </span>
  ))
  filters.owner?.forEach(o => {
    const owner = mockClients.allOwners().find(x => x.id === o)
    chips.push(
      <span key={`owner-${o}`} className="ih-pill" onClick={() => onRemoveFilter("owner", o)} style={{ cursor: "pointer" }}>
        Owner: {owner?.name ?? o} <Icon name="x" size={9} />
      </span>
    )
  })
  filters.status?.forEach(st => chips.push(
    <span key={`status-${st}`} className="ih-pill" onClick={() => onRemoveFilter("status", st)} style={{ cursor: "pointer" }}>
      Status: {st[0] + st.slice(1).toLowerCase()} <Icon name="x" size={9} />
    </span>
  ))
  if (filters.risk) chips.push(
    <span key="risk" className="ih-pill ih-pill-danger" onClick={() => onRemoveFilter("risk")} style={{ cursor: "pointer" }}>
      At risk <Icon name="x" size={9} />
    </span>
  )
  if (filters.proposed) chips.push(
    <span key="proposed" className="ih-pill" onClick={() => onRemoveFilter("proposed")} style={{ cursor: "pointer" }}>
      Proposed <Icon name="x" size={9} />
    </span>
  )
  activeTags.forEach(t => chips.push(
    <span key={`tag-${t}`} className="ih-pill" onClick={() => onRemoveTag(t)}
      style={{ background: "var(--ih-accent-soft)", color: "var(--ih-accent)", borderColor: "transparent", cursor: "pointer" }}>
      #{t} <Icon name="x" size={9} />
    </span>
  ))
  if (search.trim()) chips.push(
    <span key="search" className="ih-pill" onClick={onClearSearch} style={{ cursor: "pointer" }}>
      Search: &quot;{search}&quot; <Icon name="x" size={9} />
    </span>
  )

  if (chips.length === 0) return null
  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
      {chips}
      <button onClick={onClearAll} className="ih-btn ih-btn-quiet ih-btn-sm" style={{ height: 22, fontSize: 10 }}>Clear all</button>
    </div>
  )
}

/* ── Main ────────────────────────────────────────────────────────────────── */

export default function ClientsListPage() {
  const [view, setView] = useState<"table" | "board">("table")
  const [selectedId, setSelectedId] = useState<string | null>("c-brigham")
  const [activeSegment, setActiveSegment] = useState("mine")
  const [search, setSearch] = useState("")
  const [filters, setFilters] = useState<ClientFilters>({})
  const [activeTags, setActiveTags] = useState<string[]>([])
  const [sortBy, setSortBy] = useState<ClientSortBy>("lastActivity")
  const [sortDir, setSortDir] = useState<ClientSortDir>("desc")
  const [visibleColumns, setVisibleColumns] = useState<ColumnId[]>(COLUMNS.filter(c => c.default).map(c => c.id))

  const rows = useMemo(() =>
    mockClients.list({ segment: activeSegment, search, filters: { ...filters, tag: activeTags.length ? activeTags : undefined }, sortBy, sortDir }),
    [activeSegment, search, filters, activeTags, sortBy, sortDir]
  )
  const stats = useMemo(() => mockClients.stats(rows), [rows])
  const total = mockClients.total()
  const selected = selectedId ? rows.find(r => r.id === selectedId) ?? mockClients.getById(selectedId) : null
  const activeFilterCount =
    (filters.stage?.length ?? 0) + (filters.type?.length ?? 0) + (filters.owner?.length ?? 0)
    + (filters.status?.length ?? 0) + (filters.risk ? 1 : 0) + (filters.proposed ? 1 : 0)
    + activeTags.length

  function addFilter<K extends keyof ClientFilters>(key: K, value: string) {
    setFilters(prev => {
      if (key === "risk" || key === "proposed") return { ...prev, [key]: true }
      const current = (prev[key] as string[] | undefined) ?? []
      if (current.includes(value)) return prev
      return { ...prev, [key]: [...current, value] as ClientFilters[K] }
    })
  }
  function removeFilter<K extends keyof ClientFilters>(key: K, value?: string) {
    setFilters(prev => {
      const next = { ...prev }
      if (key === "risk" || key === "proposed" || value === undefined) { delete next[key]; return next }
      const current = (prev[key] as string[] | undefined) ?? []
      const remaining = current.filter(v => v !== value)
      if (remaining.length === 0) { delete next[key]; return next }
      return { ...next, [key]: remaining as ClientFilters[K] }
    })
  }
  function toggleTag(t: string) {
    setActiveTags(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])
  }
  function clearAll() {
    setFilters({}); setActiveTags([]); setSearch("")
  }

  const viewLabel = activeSegment === "mine" ? "My active"
    : mockClients.segments().flatMap(s => s.items ?? []).find(i => i.id === activeSegment)?.label
    ?? "Clients"

  return (
    <div style={{ display: "flex", height: "calc(100vh - 120px)", margin: "-24px -24px" }}>
      <SegmentRail
        activeSegment={activeSegment} onSegmentChange={setActiveSegment}
        activeTags={activeTags} onTagToggle={toggleTag}
      />

      <section style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "18px 20px 14px", borderBottom: "1px solid var(--ih-line)" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
            <div>
              <div className="ih-eyebrow" style={{ marginBottom: 6 }}>Saved view · pinned <span style={{ color: "var(--ih-warn)", fontStyle: "italic", fontFamily: "var(--ih-font-sans)", textTransform: "none", letterSpacing: 0 }}>★ Demo data</span></div>
              <h1 className="ih-serif" style={{ fontSize: 26, margin: 0 }}>
                {viewLabel.split(" ").slice(0, -1).join(" ")}{" "}
                <span className="ih-italic-red">{viewLabel.split(" ").slice(-1)[0]}</span>
              </h1>
              <div style={{ fontSize: 12, color: "var(--ih-ink-50)", marginTop: 4 }}>
                {rows.length} engagement{rows.length !== 1 ? "s" : ""} · {rows.filter(r => r.nextAction).length} need a reply from you · last refreshed 2s ago
              </div>
            </div>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <Popover width={240} trigger={
                <button className="ih-btn ih-btn-quiet ih-btn-sm">
                  <Icon name="filter" size={11} /> {activeFilterCount ? `${activeFilterCount} filter${activeFilterCount !== 1 ? "s" : ""}` : "Filter"}
                </button>
              }>{() => (
                <>
                  <PopoverHeader>Stage</PopoverHeader>
                  {STAGE_ORDER.filter(s => s !== "CLOSED_LOST").map(s => {
                    const active = filters.stage?.includes(s) ?? false
                    return <PopoverItem key={s} active={active} onClick={() => active ? removeFilter("stage", s) : addFilter("stage", s)}>{STAGE_META[s].label}</PopoverItem>
                  })}
                  <PopoverHeader>Type</PopoverHeader>
                  {(Object.keys(TYPE_LABEL) as EngagementType[]).map(t => {
                    const active = filters.type?.includes(t) ?? false
                    return <PopoverItem key={t} active={active} onClick={() => active ? removeFilter("type", t) : addFilter("type", t)}>{TYPE_LABEL[t]}</PopoverItem>
                  })}
                  <PopoverHeader>State</PopoverHeader>
                  <PopoverItem active={!!filters.risk} onClick={() => filters.risk ? removeFilter("risk") : addFilter("risk", "true")}>At risk</PopoverItem>
                  <PopoverItem active={!!filters.proposed} onClick={() => filters.proposed ? removeFilter("proposed") : addFilter("proposed", "true")}>Proposed</PopoverItem>
                </>
              )}</Popover>

              <Popover width={200} trigger={
                <button className="ih-btn ih-btn-quiet ih-btn-sm"><Icon name="sliders" size={11} /> Columns</button>
              }>{() => (
                <>
                  <PopoverHeader>Visible columns</PopoverHeader>
                  {COLUMNS.map(c => {
                    const active = visibleColumns.includes(c.id)
                    return (
                      <PopoverItem key={c.id} active={active}
                        onClick={() => setVisibleColumns(active ? visibleColumns.filter(x => x !== c.id) : [...visibleColumns, c.id])}>
                        {c.label}
                      </PopoverItem>
                    )
                  })}
                </>
              )}</Popover>

              <Popover align="right" width={200} trigger={
                <button className="ih-btn ih-btn-quiet ih-btn-sm">
                  <Icon name="filter" size={11} />
                  Sort: {sortBy} {sortDir === "desc" ? "↓" : "↑"}
                </button>
              }>{() => (
                <>
                  <PopoverHeader>Sort by</PopoverHeader>
                  {(["lastActivity", "value", "health", "customer", "stage"] as ClientSortBy[]).map(s => (
                    <PopoverItem key={s} active={sortBy === s} onClick={() => setSortBy(s)}>{s}</PopoverItem>
                  ))}
                  <PopoverHeader>Direction</PopoverHeader>
                  <PopoverItem active={sortDir === "desc"} onClick={() => setSortDir("desc")}>Descending</PopoverItem>
                  <PopoverItem active={sortDir === "asc"} onClick={() => setSortDir("asc")}>Ascending</PopoverItem>
                </>
              )}</Popover>

              <div style={{ width: 1, height: 18, background: "var(--ih-line)" }} />
              <div style={{ display: "flex", border: "1px solid var(--ih-line)", borderRadius: "var(--ih-r-md)", padding: 2, gap: 2 }}>
                <button onClick={() => setView("table")} className="ih-btn ih-btn-sm"
                  style={{ height: 22, background: view === "table" ? "var(--ih-surface-2)" : "transparent", border: 0, color: view === "table" ? "var(--ih-ink)" : "var(--ih-ink-50)" }}>
                  <Icon name="list" size={11} /> Table
                </button>
                <button onClick={() => setView("board")} className="ih-btn ih-btn-sm"
                  style={{ height: 22, background: view === "board" ? "var(--ih-surface-2)" : "transparent", border: 0, color: view === "board" ? "var(--ih-ink)" : "var(--ih-ink-50)" }}>
                  <Icon name="grid" size={11} /> Board
                </button>
              </div>
            </div>
          </div>
        </div>

        <div style={{ padding: "14px 20px", display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 1, background: "var(--ih-line)", borderBottom: "1px solid var(--ih-line)" }}>
          {[
            { label: "Showing",            value: String(rows.length), sub: `of ${total} total`, tone: "var(--ih-ink)" },
            { label: "Monthly recurring",  value: `£${(stats.monthlyRecurring / 1000).toFixed(1)}K`, sub: "active retainers", tone: "var(--ih-ok)" },
            { label: "Project pipeline",   value: `£${(stats.projectPipeline / 1000).toFixed(0)}K`, sub: "in flight", tone: "var(--ih-ink)" },
            { label: "Awaiting approval",  value: String(stats.awaitingApproval), sub: stats.awaitingApproval ? "needs attention" : "all clear", tone: stats.awaitingApproval ? "var(--ih-warn)" : "var(--ih-ink-50)" },
            { label: "Overdue invoices",   value: String(stats.overdueInvoices.count), sub: `£${stats.overdueInvoices.total.toLocaleString()} total`, tone: stats.overdueInvoices.count ? "var(--ih-danger)" : "var(--ih-ink-50)" },
          ].map((s) => (
            <div key={s.label} style={{ background: "var(--ih-bg)", padding: "12px 16px" }}>
              <div className="ih-eyebrow" style={{ fontSize: 9, marginBottom: 4 }}>{s.label}</div>
              <div className="ih-serif ih-num" style={{ fontSize: 26, lineHeight: 1, color: s.tone }}>{s.value}</div>
              <div className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)", marginTop: 6 }}>{s.sub}</div>
            </div>
          ))}
        </div>

        <div style={{ padding: "10px 20px", display: "flex", gap: 8, alignItems: "center", borderBottom: "1px solid var(--ih-line)", flexWrap: "wrap" }}>
          <div style={{ position: "relative", flex: 1, maxWidth: 320, minWidth: 220 }}>
            <Icon name="search" size={13} style={{ position: "absolute", left: 10, top: 8, color: "var(--ih-ink-40)" }} />
            <input className="ih-input" placeholder="Search clients, engagement titles, tags…"
              style={{ paddingLeft: 30 }} value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <FilterChips
            filters={filters} activeTags={activeTags} search={search}
            onRemoveFilter={removeFilter} onRemoveTag={(t) => toggleTag(t)}
            onClearSearch={() => setSearch("")} onClearAll={clearAll}
          />
          <div style={{ flex: 1 }} />
          <span className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)" }}>
            SORT: {sortBy.toUpperCase()} {sortDir === "desc" ? "↓" : "↑"}
          </span>
        </div>

        {view === "table" ? (
          <div className="scrollbar-thin" style={{ flex: 1, overflowY: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead style={{ position: "sticky", top: 0, background: "var(--ih-bg)", zIndex: 1 }}>
                <tr style={{ borderBottom: "1px solid var(--ih-line)" }}>
                  <th style={{ width: 28, padding: "10px 10px 10px 14px" }}></th>
                  {visibleColumns.includes("customer") && <th style={TH_STYLE} onClick={() => { setSortBy("customer"); setSortDir(d => d === "asc" ? "desc" : "asc") }}>Client · Engagement {sortBy === "customer" && (sortDir === "desc" ? "↓" : "↑")}</th>}
                  {visibleColumns.includes("type") && <th style={TH_STYLE}>Type</th>}
                  {visibleColumns.includes("stage") && <th style={TH_STYLE} onClick={() => { setSortBy("stage"); setSortDir(d => d === "asc" ? "desc" : "asc") }}>Stage {sortBy === "stage" && (sortDir === "desc" ? "↓" : "↑")}</th>}
                  {visibleColumns.includes("health") && <th style={TH_STYLE} onClick={() => { setSortBy("health"); setSortDir(d => d === "asc" ? "desc" : "asc") }}>Health {sortBy === "health" && (sortDir === "desc" ? "↓" : "↑")}</th>}
                  {visibleColumns.includes("value") && <th style={TH_STYLE} onClick={() => { setSortBy("value"); setSortDir(d => d === "asc" ? "desc" : "asc") }}>Value {sortBy === "value" && (sortDir === "desc" ? "↓" : "↑")}</th>}
                  {visibleColumns.includes("next") && <th style={TH_STYLE}>Next action</th>}
                  {visibleColumns.includes("owner") && <th style={TH_STYLE}>Owner</th>}
                  {visibleColumns.includes("lastActivity") && <th style={TH_STYLE} onClick={() => { setSortBy("lastActivity"); setSortDir(d => d === "asc" ? "desc" : "asc") }}>Last activity {sortBy === "lastActivity" && (sortDir === "desc" ? "↓" : "↑")}</th>}
                  <th style={{ width: 36 }}></th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <ClientRow key={r.id} row={r} columns={visibleColumns}
                    isSelected={r.id === selectedId}
                    onClick={() => setSelectedId(r.id)}
                    onAddFilter={addFilter} />
                ))}
                {rows.length === 0 && (
                  <tr><td colSpan={visibleColumns.length + 2} style={{ padding: 40, textAlign: "center", color: "var(--ih-ink-40)", fontSize: 12 }}>
                    No engagements match these filters.{" "}
                    <button onClick={clearAll} className="ih-btn ih-btn-quiet ih-btn-sm" style={{ height: 22, marginLeft: 4 }}>Clear filters</button>
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <BoardView rows={rows} onRowClick={setSelectedId} />
        )}

        <div style={{ padding: "8px 20px", borderTop: "1px solid var(--ih-line)", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11, color: "var(--ih-ink-50)" }}>
          <span>{rows.length} of {total} engagements</span>
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
