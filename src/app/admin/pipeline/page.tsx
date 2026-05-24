"use client"

import { useState, useMemo, useRef, useEffect } from "react"
import Link from "next/link"
import { Icon, type IconName } from "@/components/shell"
import { NotificationToast, type ToastTone } from "@/components/shared"
import {
  mockPipeline,
  STAGE_META,
  STAGE_ORDER,
  BOARD_STAGES,
  SOURCE_LABEL,
  STAGE_PROBABILITY,
  type Deal,
  type DealFilters,
  type DealSortBy,
  type DealSortDir,
  type DealStage,
  type DealSource,
} from "@/lib/mock/pipeline"

/* ── Column config ───────────────────────────────────────────────────────── */

type ColumnId = "deal" | "stage" | "value" | "probability" | "close" | "owner" | "lastActivity"

interface ColumnDef { id: ColumnId; label: string; default: boolean }
const COLUMNS: ColumnDef[] = [
  { id: "deal",         label: "Deal · Customer",  default: true },
  { id: "stage",        label: "Stage",            default: true },
  { id: "value",        label: "Value",            default: true },
  { id: "probability",  label: "Probability",      default: true },
  { id: "close",        label: "Expected close",   default: true },
  { id: "owner",        label: "Owner",            default: true },
  { id: "lastActivity", label: "Last activity",    default: true },
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
  const segments = mockPipeline.segments()
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

function StagePill({ row, onClick }: { row: Deal; onClick: (stage: DealStage) => void }) {
  const s = STAGE_META[row.stage]
  const isClosed = row.stage === "CLOSED_WON" || row.stage === "CLOSED_LOST"
  return (
    <div style={{ display: "inline-flex", flexDirection: "column", gap: 3, minWidth: 96 }}>
      <span
        onClick={(e) => { e.stopPropagation(); onClick(row.stage) }}
        className={`ih-pill ih-pill-${s.tone}`}
        title={`Filter by stage: ${s.label}`}
        style={{ fontSize: 9, padding: "2px 6px", alignSelf: "flex-start", cursor: "pointer" }}
      >
        {s.label}
      </span>
      <div style={{ display: "flex", gap: 2, height: 3 }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} style={{
            flex: 1, height: 3, borderRadius: 1,
            background: i < s.idx ? "var(--ih-ink)" : i === s.idx ? "var(--ih-accent)" : "var(--ih-surface-3)",
            opacity: isClosed && row.stage === "CLOSED_LOST" ? 0.3 : 1,
          }} />
        ))}
      </div>
    </div>
  )
}

function ProbabilityCell({ value }: { value: number }) {
  const tone = value >= 70 ? "var(--ih-ok)" : value >= 40 ? "var(--ih-warn)" : "var(--ih-ink-50)"
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div style={{ width: 32, height: 4, background: "var(--ih-surface-3)", borderRadius: 2, overflow: "hidden" }}>
        <div style={{ width: `${value}%`, height: "100%", background: tone }} />
      </div>
      <span className="ih-num" style={{ fontSize: 11, color: "var(--ih-ink-65)" }}>{value}%</span>
    </div>
  )
}

function CloseDateCell({ row }: { row: Deal }) {
  const isPast = row.isPastDueClose
  return (
    <span className="ih-mono" style={{ fontSize: 11, color: isPast ? "var(--ih-danger)" : "var(--ih-ink-65)" }}>
      {row.expectedClose}{isPast && " · overdue"}
    </span>
  )
}

function RowActionMenu({ row, onView, onAddFilter, onAdvance, onMarkWon, onMarkLost, onMoveTop, onArchive }: {
  row: Deal
  onView: () => void
  onAddFilter: (k: keyof DealFilters, v: string) => void
  onAdvance: () => void
  onMarkWon: () => void
  onMarkLost: () => void
  onMoveTop: () => void
  onArchive: () => void
}) {
  return (
    <Popover align="right" width={180} trigger={
      <button className="ih-btn ih-btn-quiet ih-btn-icon" style={{ height: 22, width: 22 }} onClick={e => e.stopPropagation()}>
        <Icon name="moreH" size={12} />
      </button>
    }>
      {(close) => (
        <>
          <PopoverItem onClick={() => { onView(); close() }}>Open preview</PopoverItem>
          <Link href={`/admin/pipeline/${row.id}`} style={{ textDecoration: "none" }}>
            <PopoverItem onClick={close}>Open full page</PopoverItem>
          </Link>
          <div style={{ height: 1, background: "var(--ih-line)", margin: "4px 0" }} />
          <PopoverItem onClick={() => { onAdvance(); close() }}>Advance stage</PopoverItem>
          <PopoverItem onClick={() => { onMarkWon(); close() }}>Mark won</PopoverItem>
          <PopoverItem onClick={() => { onMarkLost(); close() }} danger>Mark lost</PopoverItem>
          <div style={{ height: 1, background: "var(--ih-line)", margin: "4px 0" }} />
          <PopoverItem onClick={() => { onMoveTop(); close() }}>Move to top</PopoverItem>
          <PopoverItem onClick={() => { onAddFilter("stage", row.stage); close() }}>Filter same stage</PopoverItem>
          <PopoverItem onClick={() => { onAddFilter("owner", row.owner.id); close() }}>Filter same owner</PopoverItem>
          <div style={{ height: 1, background: "var(--ih-line)", margin: "4px 0" }} />
          <PopoverItem onClick={() => { onArchive(); close() }} danger>Archive deal</PopoverItem>
        </>
      )}
    </Popover>
  )
}

/* ── Row ─────────────────────────────────────────────────────────────────── */

function DealRow({
  row, columns, isSelected, isPinned,
  onClick, onAddFilter, onAdvance, onMarkWon, onMarkLost, onMoveTop, onArchive,
}: {
  row: Deal
  columns: ColumnId[]
  isSelected: boolean
  isPinned: boolean
  onClick: () => void
  onAddFilter: (k: keyof DealFilters, v: string) => void
  onAdvance: () => void
  onMarkWon: () => void
  onMarkLost: () => void
  onMoveTop: () => void
  onArchive: () => void
}) {
  const visible = (c: ColumnId) => columns.includes(c)
  const isStuck = row.staleness === "stuck" && row.stage !== "CLOSED_WON" && row.stage !== "CLOSED_LOST"
  return (
    <tr onClick={onClick} style={{
      background: isSelected ? "var(--ih-accent-soft-2)" : isStuck ? "rgba(184,134,11,0.04)" : "transparent",
      borderTop: "1px solid var(--ih-line)", cursor: "pointer",
    }}>
      <td style={{ padding: "10px 10px 10px 14px", width: 28 }}>
        <input type="checkbox" style={{ accentColor: "var(--ih-accent)" }} onClick={e => e.stopPropagation()} />
      </td>
      {visible("deal") && (
        <td style={{ padding: "10px 10px" }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <div className="ih-avatar" style={{ background: "var(--ih-surface-2)", color: "var(--ih-ink-65)" }}>{row.customer.initials}</div>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontWeight: 500, fontSize: 12.5 }}>{row.title}</span>
                {isPinned && <span className="ih-pill ih-pill-accent" style={{ fontSize: 8, padding: "1px 5px" }}>PINNED</span>}
                {isStuck && <span className="ih-pill ih-pill-warn" style={{ fontSize: 8, padding: "1px 5px" }}>STUCK</span>}
              </div>
              <div style={{ fontSize: 11, color: "var(--ih-ink-50)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 260 }}>
                {row.customer.name} · {SOURCE_LABEL[row.source]}
              </div>
            </div>
          </div>
        </td>
      )}
      {visible("stage") && (
        <td style={{ padding: "10px 10px" }}>
          <StagePill row={row} onClick={(s) => onAddFilter("stage", s)} />
        </td>
      )}
      {visible("value") && (
        <td style={{ padding: "10px 10px" }}>
          <div className="ih-num" style={{ fontSize: 12.5 }}>£{row.value.toLocaleString()}</div>
        </td>
      )}
      {visible("probability") && (
        <td style={{ padding: "10px 10px" }}><ProbabilityCell value={row.probability} /></td>
      )}
      {visible("close") && (
        <td style={{ padding: "10px 10px" }}><CloseDateCell row={row} /></td>
      )}
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
        <RowActionMenu row={row} onView={onClick} onAddFilter={onAddFilter}
          onAdvance={onAdvance} onMarkWon={onMarkWon} onMarkLost={onMarkLost}
          onMoveTop={onMoveTop} onArchive={onArchive} />
      </td>
    </tr>
  )
}

/* ── Preview drawer ──────────────────────────────────────────────────────── */

type DrawerForm = "none" | "lost" | "proposal" | "note"

function PreviewDrawer({
  row, stageOverride, onClose, onAdvance, onSetStage, onMarkWon, onMarkLost, onToast,
}: {
  row: Deal
  stageOverride: DealStage | null
  onClose: () => void
  onAdvance: () => void
  onSetStage: (s: DealStage) => void
  onMarkWon: () => void
  onMarkLost: (reason: string) => void
  onToast: (m: string, t: ToastTone) => void
}) {
  const [form, setForm] = useState<DrawerForm>("none")
  const [lostReason, setLostReason] = useState("Budget constraints")
  const [proposalBody, setProposalBody] = useState(`Hi ${row.customer.contactName.split(" ")[0]},\n\nAttaching the proposal for "${row.title}" — £${row.value.toLocaleString()}. Happy to walk through it on a call.\n\nLuke`)
  const [noteBody, setNoteBody] = useState("")

  const effectiveStage: DealStage = stageOverride ?? row.stage
  const meta = STAGE_META[effectiveStage]
  const titleWords = row.title.split(" ")
  const titleHead = titleWords.slice(0, -1).join(" ")
  const titleTail = titleWords.slice(-1)[0]

  return (
    <aside key={row.id} className="animate-slide-in-right" style={{
      width: 380, borderLeft: "1px solid var(--ih-line)", background: "var(--ih-surface-2)",
      display: "flex", flexDirection: "column", flexShrink: 0,
    }}>
      <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--ih-line)", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div className="ih-avatar ih-avatar-lg" style={{ background: "var(--ih-surface)", color: "var(--ih-ink)", fontFamily: "var(--ih-font-serif)", fontStyle: "italic", fontSize: 16 }}>
            {row.customer.initials}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{row.customer.name}</div>
            <div className="ih-eyebrow" style={{ fontSize: 9, marginTop: 2 }}>
              {row.customer.contactName} · {SOURCE_LABEL[row.source].toLowerCase()} · {row.lastActivity}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          <Link href={`/admin/pipeline/${row.id}`} className="ih-btn ih-btn-quiet ih-btn-icon" style={{ height: 24, width: 24, textDecoration: "none" }} title="Open full page">
            <Icon name="arrowUpRight" size={12} />
          </Link>
          <button className="ih-btn ih-btn-quiet ih-btn-icon" style={{ height: 24, width: 24 }} onClick={onClose} title="Close">
            <Icon name="x" size={12} />
          </button>
        </div>
      </div>

      <div className="scrollbar-thin" style={{ flex: 1, overflowY: "auto", padding: 16 }}>
        <div className="ih-serif" style={{ fontSize: 22, lineHeight: 1.15, marginBottom: 6 }}>
          {titleHead}{titleHead && " "}<span className="ih-italic-red">{titleTail}</span>
        </div>
        <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
          <span className={`ih-pill ih-pill-${meta.tone}`} style={{ fontSize: 9, padding: "2px 6px" }}>{meta.label}</span>
          <span className="ih-pill" style={{ fontSize: 9, padding: "2px 6px" }}>{SOURCE_LABEL[row.source]}</span>
          {row.tags.map(t => <span key={t} className="ih-pill" style={{ fontSize: 9, padding: "2px 6px", textTransform: "lowercase" }}>#{t}</span>)}
        </div>

        {/* Stage transition pills */}
        <div className="ih-eyebrow" style={{ marginBottom: 6 }}>Stage</div>
        <div style={{ display: "flex", gap: 4, marginBottom: 16, flexWrap: "wrap" }}>
          {STAGE_ORDER.filter(s => s !== "CLOSED_LOST").map(s => {
            const on = s === effectiveStage
            const m = STAGE_META[s]
            return (
              <button key={s} onClick={() => onSetStage(s)}
                className={`ih-pill ${on ? `ih-pill-${m.tone}` : ""}`}
                style={{ fontSize: 9, padding: "3px 8px", cursor: "pointer", border: 0,
                  fontWeight: on ? 600 : 400, opacity: on ? 1 : 0.65,
                }}>
                {m.label}
              </button>
            )
          })}
        </div>

        {/* Stat row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 1, background: "var(--ih-line)", border: "1px solid var(--ih-line)", borderRadius: "var(--ih-r-md)", overflow: "hidden", marginBottom: 16 }}>
          {[
            { label: "Value",       value: `£${row.value.toLocaleString()}`,   tone: "var(--ih-ink)" },
            { label: "Probability", value: `${row.probability}%`,              tone: row.probability >= 70 ? "var(--ih-ok)" : row.probability >= 40 ? "var(--ih-warn)" : "var(--ih-ink)" },
            { label: "Close",       value: row.expectedClose,                  tone: row.isPastDueClose ? "var(--ih-danger)" : "var(--ih-ink)" },
          ].map((s) => (
            <div key={s.label} style={{ background: "var(--ih-surface)", padding: "10px 12px" }}>
              <div className="ih-eyebrow" style={{ fontSize: 8, marginBottom: 4 }}>{s.label}</div>
              <div className="ih-serif ih-num" style={{ fontSize: 20, color: s.tone, lineHeight: 1 }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Lost reason callout */}
        {row.stage === "CLOSED_LOST" && row.lostReason && (
          <div style={{ background: "var(--ih-danger-soft)", borderRadius: "var(--ih-r-md)", padding: "10px 12px", marginBottom: 16, display: "flex", gap: 10, alignItems: "flex-start" }}>
            <Icon name="x" size={14} style={{ color: "var(--ih-danger)", marginTop: 1 }} />
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--ih-danger)", marginBottom: 2 }}>Why this was lost</div>
              <div style={{ fontSize: 11.5, color: "var(--ih-ink)", lineHeight: 1.45 }}>{row.lostReason}</div>
            </div>
          </div>
        )}

        {/* Won callout w/ engagement link */}
        {row.stage === "CLOSED_WON" && row.engagementId && (
          <Link href={`/admin/clients/${row.engagementId}`} style={{ textDecoration: "none" }}>
            <div style={{ background: "var(--ih-ok-soft)", borderRadius: "var(--ih-r-md)", padding: "10px 12px", marginBottom: 16, display: "flex", gap: 10, alignItems: "center", cursor: "pointer" }}>
              <Icon name="check" size={14} style={{ color: "var(--ih-ok)" }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "var(--ih-ok)" }}>Engagement created</div>
                <div style={{ fontSize: 11.5, color: "var(--ih-ink)" }}>Open {row.engagementId} →</div>
              </div>
              <Icon name="arrowUpRight" size={12} style={{ color: "var(--ih-ok)" }} />
            </div>
          </Link>
        )}

        {/* Recent activity */}
        <div className="ih-eyebrow" style={{ marginBottom: 8 }}>Recent activity</div>
        {row.activity.slice(0, 4).map((it, i) => (
          <div key={i} style={{ display: "flex", gap: 10, padding: "7px 0", borderBottom: "1px dashed var(--ih-line)" }}>
            <span className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)", width: 60, flexShrink: 0 }}>{it.date}</span>
            <span className={`ih-dot ih-dot-${it.tone}`} style={{ marginTop: 5, flexShrink: 0 }} />
            <span style={{ fontSize: 11.5, color: "var(--ih-ink-65)", lineHeight: 1.45 }}>
              <strong style={{ color: "var(--ih-ink)", fontWeight: 500 }}>{it.title}</strong>
              {" — "}{it.desc}
            </span>
          </div>
        ))}

        {/* Customer card */}
        <div className="ih-eyebrow" style={{ marginTop: 16, marginBottom: 8 }}>Customer</div>
        <Link href={`/admin/customers/${row.customer.id}`} style={{ textDecoration: "none", color: "inherit" }}>
          <div className="ih-card" style={{ padding: 12, cursor: "pointer" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12 }}>
              {[
                ["Contact", row.customer.contactName],
                ["Email",   row.customer.email],
                ["Phone",   row.customer.phone],
                ["Source",  SOURCE_LABEL[row.source]],
                ["Owner",   row.owner.name],
                ["Days in stage", `${row.daysInStage}d`],
              ].map(([k, v]) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <span style={{ color: "var(--ih-ink-50)" }}>{k}</span>
                  <span style={{ color: "var(--ih-ink)", textAlign: "right", fontFamily: k === "Phone" || k === "Days in stage" ? "var(--ih-font-mono)" : undefined }}>{v}</span>
                </div>
              ))}
              <div style={{ marginTop: 4, display: "flex", justifyContent: "flex-end", color: "var(--ih-accent)", fontSize: 11 }}>
                Open customer <Icon name="arrowUpRight" size={10} />
              </div>
            </div>
          </div>
        </Link>

        {/* Inline forms */}
        {form === "lost" && (
          <div className="ih-card" style={{ padding: 12, marginTop: 16 }}>
            <div className="ih-eyebrow" style={{ marginBottom: 8 }}>Mark lost — reason</div>
            <select value={lostReason} onChange={e => setLostReason(e.target.value)}
              style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--ih-line)", borderRadius: "var(--ih-r-sm)", fontSize: 12, background: "var(--ih-surface)", color: "var(--ih-ink)", marginBottom: 8 }}>
              <option>Budget constraints</option>
              <option>Timing not right</option>
              <option>Went with competitor</option>
              <option>No decision made</option>
              <option>Relationship lost</option>
              <option>Other</option>
            </select>
            <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
              <button className="ih-btn ih-btn-ghost ih-btn-sm" onClick={() => setForm("none")}>Cancel</button>
              <button className="ih-btn ih-btn-sm" style={{ background: "var(--ih-danger)", color: "#fff", border: 0 }}
                onClick={() => { onMarkLost(lostReason); setForm("none") }}>
                Confirm lost
              </button>
            </div>
          </div>
        )}
        {form === "proposal" && (
          <div className="ih-card" style={{ padding: 12, marginTop: 16 }}>
            <div className="ih-eyebrow" style={{ marginBottom: 8 }}>Draft proposal email</div>
            <input className="ih-input" defaultValue={`Proposal — ${row.title}`} style={{ marginBottom: 6, fontSize: 12 }} />
            <textarea value={proposalBody} onChange={e => setProposalBody(e.target.value)}
              style={{ width: "100%", minHeight: 100, padding: 10, border: "1px solid var(--ih-line)", borderRadius: "var(--ih-r-sm)", fontSize: 12, fontFamily: "inherit", background: "var(--ih-surface)", color: "var(--ih-ink)", resize: "vertical", outline: "none", marginBottom: 8 }} />
            <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
              <button className="ih-btn ih-btn-ghost ih-btn-sm" onClick={() => setForm("none")}>Discard</button>
              <button className="ih-btn ih-btn-accent ih-btn-sm" onClick={() => { setForm("none"); onToast("Proposal sent to " + row.customer.contactName, "ok") }}>
                <Icon name="mail" size={11} /> Send
              </button>
            </div>
          </div>
        )}
        {form === "note" && (
          <div className="ih-card" style={{ padding: 12, marginTop: 16 }}>
            <div className="ih-eyebrow" style={{ marginBottom: 8 }}>Add note</div>
            <textarea value={noteBody} onChange={e => setNoteBody(e.target.value)} placeholder="What did you learn?"
              style={{ width: "100%", minHeight: 70, padding: 10, border: "1px solid var(--ih-line)", borderRadius: "var(--ih-r-sm)", fontSize: 12, fontFamily: "inherit", background: "var(--ih-surface)", color: "var(--ih-ink)", resize: "vertical", outline: "none", marginBottom: 8 }} />
            <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
              <button className="ih-btn ih-btn-ghost ih-btn-sm" onClick={() => { setForm("none"); setNoteBody("") }}>Cancel</button>
              <button className="ih-btn ih-btn-accent ih-btn-sm" disabled={!noteBody.trim()}
                onClick={() => { setForm("none"); setNoteBody(""); onToast("Note saved", "ok") }}>
                Save note
              </button>
            </div>
          </div>
        )}
      </div>

      <div style={{ borderTop: "1px solid var(--ih-line)", padding: 12, display: "flex", flexDirection: "column", gap: 6, background: "var(--ih-surface)" }}>
        {row.stage !== "CLOSED_WON" && row.stage !== "CLOSED_LOST" && (
          <button className="ih-btn ih-btn-accent" style={{ width: "100%", justifyContent: "center" }} onClick={onAdvance}>
            <Icon name="arrowRight" size={12} /> Advance to {STAGE_META[nextStage(row.stage)].label}
          </button>
        )}
        <div style={{ display: "flex", gap: 6 }}>
          <button className="ih-btn ih-btn-ghost ih-btn-sm" style={{ flex: 1 }} onClick={() => { setForm("none"); onMarkWon() }}>
            <Icon name="check" size={11} /> Won
          </button>
          <button className="ih-btn ih-btn-ghost ih-btn-sm" style={{ flex: 1 }} onClick={() => setForm(form === "lost" ? "none" : "lost")}>
            <Icon name="x" size={11} /> Lost
          </button>
          <button className="ih-btn ih-btn-ghost ih-btn-sm" style={{ flex: 1 }} onClick={() => setForm(form === "proposal" ? "none" : "proposal")}>
            <Icon name="mail" size={11} /> Proposal
          </button>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button className="ih-btn ih-btn-ghost ih-btn-sm" style={{ flex: 1 }} onClick={() => setForm(form === "note" ? "none" : "note")}>
            <Icon name="plus" size={11} /> Note
          </button>
          <button className="ih-btn ih-btn-ghost ih-btn-sm" style={{ flex: 1 }} onClick={() => onToast(`Meeting requested with ${row.customer.contactName}`, "info")}>
            <Icon name="calendar" size={11} /> Meet
          </button>
          <button className="ih-btn ih-btn-ghost ih-btn-sm" style={{ flex: 1 }} onClick={() => onToast(`Calling ${row.customer.phone}`, "info")}>
            <Icon name="phone" size={11} /> Call
          </button>
        </div>
      </div>
    </aside>
  )
}

function nextStage(s: DealStage): DealStage {
  const i = STAGE_ORDER.indexOf(s)
  for (let j = i + 1; j < STAGE_ORDER.length; j++) {
    if (STAGE_ORDER[j] !== "CLOSED_LOST") return STAGE_ORDER[j]
  }
  return "CLOSED_WON"
}

/* ── Board view ──────────────────────────────────────────────────────────── */

function BoardView({
  rows, onRowClick, stageOverrides,
}: {
  rows: Deal[]
  onRowClick: (id: string) => void
  stageOverrides: Record<string, DealStage>
}) {
  return (
    <div className="scrollbar-thin" style={{ flex: 1, overflowX: "auto", overflowY: "hidden", padding: 20 }}>
      <div style={{ display: "flex", gap: 12, height: "100%", minWidth: "fit-content" }}>
        {BOARD_STAGES.map(stage => {
          const meta = STAGE_META[stage]
          const stageRows = rows.filter(r => (stageOverrides[r.id] ?? r.stage) === stage)
          const sumValue = stageRows.reduce((s, r) => s + r.value, 0)
          return (
            <div key={stage} style={{
              width: 260, flexShrink: 0, display: "flex", flexDirection: "column",
              background: "var(--ih-surface-2)", borderRadius: "var(--ih-r-md)", border: "1px solid var(--ih-line)",
            }}>
              <div style={{ padding: "10px 12px", borderBottom: "1px solid var(--ih-line)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span className={`ih-pill ih-pill-${meta.tone}`} style={{ fontSize: 9, padding: "2px 6px" }}>{meta.label}</span>
                  <span className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)" }}>{stageRows.length}</span>
                </div>
                <span className="ih-num" style={{ fontSize: 11, color: "var(--ih-ink-65)" }}>£{(sumValue / 1000).toFixed(1)}k</span>
              </div>
              <div className="scrollbar-thin" style={{ flex: 1, overflowY: "auto", padding: 8, display: "flex", flexDirection: "column", gap: 8 }}>
                {stageRows.length === 0 && <div style={{ padding: 12, fontSize: 11, color: "var(--ih-ink-40)", textAlign: "center" }}>Empty</div>}
                {stageRows.map(r => {
                  const isStuck = r.staleness === "stuck"
                  return (
                    <div key={r.id} onClick={() => onRowClick(r.id)} className="ih-card"
                      style={{ padding: 10, cursor: "pointer", borderLeft: isStuck ? "2px solid var(--ih-warn)" : undefined }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
                        <div className="ih-avatar" style={{ width: 22, height: 22, fontSize: 9 }}>{r.customer.initials}</div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontSize: 12, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.customer.name}</div>
                          <div style={{ fontSize: 10, color: "var(--ih-ink-50)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.title}</div>
                        </div>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
                        <span className="ih-num" style={{ fontSize: 11.5, fontWeight: 500 }}>£{(r.value / 1000).toFixed(1)}k</span>
                        <span className="ih-mono" style={{ fontSize: 9, color: "var(--ih-ink-40)" }}>{r.probability}% · {r.daysInStage}d</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6, paddingTop: 6, borderTop: "1px solid var(--ih-line)" }}>
                        <div className="ih-avatar" style={{ width: 16, height: 16, fontSize: 8 }}>{r.owner.initials}</div>
                        <span className="ih-mono" style={{ fontSize: 9, color: "var(--ih-ink-40)" }}>{r.lastActivity}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ── Filter chips ────────────────────────────────────────────────────────── */

function FilterChips({
  filters, activeTags, search,
  onRemoveFilter, onRemoveTag, onClearSearch, onClearAll,
}: {
  filters: DealFilters; activeTags: string[]; search: string;
  onRemoveFilter: (k: keyof DealFilters, v?: string) => void;
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
  filters.source?.forEach(s => chips.push(
    <span key={`source-${s}`} className="ih-pill" onClick={() => onRemoveFilter("source", s)} style={{ cursor: "pointer" }}>
      Source: {SOURCE_LABEL[s]} <Icon name="x" size={9} />
    </span>
  ))
  filters.owner?.forEach(o => {
    const owner = mockPipeline.allOwners().find(x => x.id === o)
    chips.push(
      <span key={`owner-${o}`} className="ih-pill" onClick={() => onRemoveFilter("owner", o)} style={{ cursor: "pointer" }}>
        Owner: {owner?.name ?? o} <Icon name="x" size={9} />
      </span>
    )
  })
  filters.staleness?.forEach(s => chips.push(
    <span key={`stale-${s}`} className="ih-pill ih-pill-warn" onClick={() => onRemoveFilter("staleness", s)} style={{ cursor: "pointer" }}>
      {s} <Icon name="x" size={9} />
    </span>
  ))
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

export default function PipelineListPage() {
  const [view, setView] = useState<"table" | "board">("board")
  const [selectedId, setSelectedId] = useState<string | null>("deal_olsen")
  const [activeSegment, setActiveSegment] = useState("open")
  const [search, setSearch] = useState("")
  const [filters, setFilters] = useState<DealFilters>({})
  const [activeTags, setActiveTags] = useState<string[]>([])
  const [sortBy, setSortBy] = useState<DealSortBy>("lastActivity")
  const [sortDir, setSortDir] = useState<DealSortDir>("desc")
  const [visibleColumns, setVisibleColumns] = useState<ColumnId[]>(COLUMNS.filter(c => c.default).map(c => c.id))
  const [toast, setToast] = useState<{ msg: string; tone: ToastTone } | null>(null)
  const [pinned, setPinned] = useState<string[]>([])
  const [archived, setArchived] = useState<string[]>([])
  const [stageOverrides, setStageOverrides] = useState<Record<string, DealStage>>({})
  const [lostReasons, setLostReasons] = useState<Record<string, string>>({})

  const baseRows = useMemo(() =>
    mockPipeline.list({ segment: activeSegment, search, filters: { ...filters, tag: activeTags.length ? activeTags : undefined }, sortBy, sortDir }),
    [activeSegment, search, filters, activeTags, sortBy, sortDir]
  )
  /* apply local overrides — stage/archive/pinned */
  const rows = useMemo(() => {
    const withOverrides = baseRows
      .filter(r => !archived.includes(r.id))
      .map(r => stageOverrides[r.id] ? { ...r, stage: stageOverrides[r.id], probability: STAGE_PROBABILITY[stageOverrides[r.id]] ?? r.probability } : r)
    const pinnedSet = new Set(pinned)
    return [...withOverrides].sort((a, b) => {
      const ap = pinnedSet.has(a.id) ? 1 : 0
      const bp = pinnedSet.has(b.id) ? 1 : 0
      if (ap !== bp) return bp - ap
      return 0
    })
  }, [baseRows, archived, stageOverrides, pinned])

  const stats = useMemo(() => mockPipeline.stats(rows), [rows])
  const total = mockPipeline.total()
  const selected = selectedId ? rows.find(r => r.id === selectedId) ?? mockPipeline.getById(selectedId) : null
  const selectedStageOverride = selected ? stageOverrides[selected.id] ?? null : null

  const activeFilterCount =
    (filters.stage?.length ?? 0) + (filters.source?.length ?? 0)
    + (filters.owner?.length ?? 0) + (filters.staleness?.length ?? 0)
    + activeTags.length

  function addFilter<K extends keyof DealFilters>(key: K, value: string) {
    setFilters(prev => {
      const current = (prev[key] as string[] | undefined) ?? []
      if (current.includes(value)) return prev
      return { ...prev, [key]: [...current, value] as DealFilters[K] }
    })
  }
  function removeFilter<K extends keyof DealFilters>(key: K, value?: string) {
    setFilters(prev => {
      const next = { ...prev }
      if (value === undefined) { delete next[key]; return next }
      const current = (prev[key] as string[] | undefined) ?? []
      const remaining = current.filter(v => v !== value)
      if (remaining.length === 0) { delete next[key]; return next }
      return { ...next, [key]: remaining as DealFilters[K] }
    })
  }
  function toggleTag(t: string) {
    setActiveTags(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])
  }
  function clearAll() { setFilters({}); setActiveTags([]); setSearch("") }

  function fireToast(msg: string, tone: ToastTone) { setToast({ msg, tone }) }

  function setStage(id: string, s: DealStage) {
    setStageOverrides(prev => ({ ...prev, [id]: s }))
    fireToast(`Moved to ${STAGE_META[s].label}`, "ok")
  }
  function advance(id: string) {
    const row = mockPipeline.getById(id)
    if (!row) return
    const cur = stageOverrides[id] ?? row.stage
    setStage(id, nextStage(cur))
  }
  function markWon(id: string) {
    setStageOverrides(prev => ({ ...prev, [id]: "CLOSED_WON" }))
    fireToast("Deal marked Won — engagement queued", "ok")
  }
  function markLost(id: string, reason: string) {
    setStageOverrides(prev => ({ ...prev, [id]: "CLOSED_LOST" }))
    setLostReasons(prev => ({ ...prev, [id]: reason }))
    fireToast(`Marked lost · ${reason}`, "warn")
  }
  function togglePin(id: string) {
    setPinned(prev => prev.includes(id) ? prev.filter(x => x !== id) : [id, ...prev])
    fireToast(pinned.includes(id) ? "Unpinned" : "Pinned to top", "info")
  }
  function archive(id: string) {
    setArchived(prev => [...prev, id])
    if (selectedId === id) setSelectedId(null)
    fireToast("Deal archived", "muted")
  }

  const viewLabel = (() => {
    if (activeSegment === "mine") return "My pipeline"
    if (activeSegment === "open") return "Open pipeline"
    const match = mockPipeline.segments().flatMap(s => s.items ?? []).find(i => i.id === activeSegment)
    return match?.label ?? "Pipeline"
  })()

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
              <div className="ih-eyebrow" style={{ marginBottom: 6 }}>Pipeline · saved view</div>
              <h1 className="ih-serif" style={{ fontSize: 26, margin: 0 }}>
                {viewLabel.split(" ").slice(0, -1).join(" ")}{" "}
                <span className="ih-italic-red">{viewLabel.split(" ").slice(-1)[0]}</span>
              </h1>
              <div style={{ fontSize: 12, color: "var(--ih-ink-50)", marginTop: 4 }}>
                {rows.length} deal{rows.length !== 1 ? "s" : ""} · weighted £{Math.round(stats.weightedValue).toLocaleString()} · closing this month £{stats.closingThisMonth.toLocaleString()}
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
                  {STAGE_ORDER.map(s => {
                    const active = filters.stage?.includes(s) ?? false
                    return <PopoverItem key={s} active={active} onClick={() => active ? removeFilter("stage", s) : addFilter("stage", s)}>{STAGE_META[s].label}</PopoverItem>
                  })}
                  <PopoverHeader>Source</PopoverHeader>
                  {(Object.keys(SOURCE_LABEL) as DealSource[]).map(src => {
                    const active = filters.source?.includes(src) ?? false
                    return <PopoverItem key={src} active={active} onClick={() => active ? removeFilter("source", src) : addFilter("source", src)}>{SOURCE_LABEL[src]}</PopoverItem>
                  })}
                  <PopoverHeader>Owner</PopoverHeader>
                  {mockPipeline.allOwners().map(o => {
                    const active = filters.owner?.includes(o.id) ?? false
                    return <PopoverItem key={o.id} active={active} onClick={() => active ? removeFilter("owner", o.id) : addFilter("owner", o.id)}>{o.name}</PopoverItem>
                  })}
                  <PopoverHeader>Staleness</PopoverHeader>
                  {(["fresh", "stale", "stuck"] as const).map(s => {
                    const active = filters.staleness?.includes(s) ?? false
                    return <PopoverItem key={s} active={active} onClick={() => active ? removeFilter("staleness", s) : addFilter("staleness", s)}>{s}</PopoverItem>
                  })}
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
                  {(["lastActivity", "value", "probability", "expectedClose", "customer", "stage", "daysInStage"] as DealSortBy[]).map(s => (
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

        {/* Stats — reflects filtered rows */}
        <div style={{ padding: "14px 20px", display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 1, background: "var(--ih-line)", borderBottom: "1px solid var(--ih-line)" }}>
          {[
            { label: "Pipeline value",   value: `£${(stats.totalValue / 1000).toFixed(0)}K`,    sub: `${stats.count} deal${stats.count !== 1 ? "s" : ""}`, tone: "var(--ih-ink)" },
            { label: "Weighted",         value: `£${(stats.weightedValue / 1000).toFixed(0)}K`, sub: "by probability",                                     tone: "var(--ih-accent)" },
            { label: "Closing this mo",  value: `£${(stats.closingThisMonth / 1000).toFixed(0)}K`, sub: stats.closingThisMonth ? "in flight" : "nothing scheduled", tone: stats.closingThisMonth ? "var(--ih-ok)" : "var(--ih-ink-50)" },
            { label: "Win rate (30d)",   value: `${stats.winRate}%`,                            sub: "won / closed",                                       tone: stats.winRate >= 50 ? "var(--ih-ok)" : "var(--ih-ink)" },
            { label: "Avg deal size",    value: `£${(stats.avgDealSize / 1000).toFixed(1)}K`,   sub: "open deals",                                         tone: "var(--ih-ink)" },
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
            <input className="ih-input" placeholder={"Search deals, customers, tags…"}
              style={{ paddingLeft: 30 }} value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <FilterChips
            filters={filters} activeTags={activeTags} search={search}
            onRemoveFilter={removeFilter} onRemoveTag={toggleTag}
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
                  {visibleColumns.includes("deal") && <th style={TH_STYLE} onClick={() => { setSortBy("customer"); setSortDir(d => d === "asc" ? "desc" : "asc") }}>Deal · Customer {sortBy === "customer" && (sortDir === "desc" ? "↓" : "↑")}</th>}
                  {visibleColumns.includes("stage") && <th style={TH_STYLE} onClick={() => { setSortBy("stage"); setSortDir(d => d === "asc" ? "desc" : "asc") }}>Stage {sortBy === "stage" && (sortDir === "desc" ? "↓" : "↑")}</th>}
                  {visibleColumns.includes("value") && <th style={TH_STYLE} onClick={() => { setSortBy("value"); setSortDir(d => d === "asc" ? "desc" : "asc") }}>Value {sortBy === "value" && (sortDir === "desc" ? "↓" : "↑")}</th>}
                  {visibleColumns.includes("probability") && <th style={TH_STYLE} onClick={() => { setSortBy("probability"); setSortDir(d => d === "asc" ? "desc" : "asc") }}>Probability {sortBy === "probability" && (sortDir === "desc" ? "↓" : "↑")}</th>}
                  {visibleColumns.includes("close") && <th style={TH_STYLE} onClick={() => { setSortBy("expectedClose"); setSortDir(d => d === "asc" ? "desc" : "asc") }}>Expected close {sortBy === "expectedClose" && (sortDir === "desc" ? "↓" : "↑")}</th>}
                  {visibleColumns.includes("owner") && <th style={TH_STYLE}>Owner</th>}
                  {visibleColumns.includes("lastActivity") && <th style={TH_STYLE} onClick={() => { setSortBy("lastActivity"); setSortDir(d => d === "asc" ? "desc" : "asc") }}>Last activity {sortBy === "lastActivity" && (sortDir === "desc" ? "↓" : "↑")}</th>}
                  <th style={{ width: 36 }}></th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <DealRow key={r.id} row={r} columns={visibleColumns}
                    isSelected={r.id === selectedId}
                    isPinned={pinned.includes(r.id)}
                    onClick={() => setSelectedId(r.id)}
                    onAddFilter={addFilter}
                    onAdvance={() => advance(r.id)}
                    onMarkWon={() => markWon(r.id)}
                    onMarkLost={() => markLost(r.id, "Other")}
                    onMoveTop={() => togglePin(r.id)}
                    onArchive={() => archive(r.id)} />
                ))}
                {rows.length === 0 && (
                  <tr><td colSpan={visibleColumns.length + 2} style={{ padding: 40, textAlign: "center", color: "var(--ih-ink-40)", fontSize: 12 }}>
                    No deals match these filters.{" "}
                    <button onClick={clearAll} className="ih-btn ih-btn-quiet ih-btn-sm" style={{ height: 22, marginLeft: 4 }}>Clear filters</button>
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <BoardView rows={rows} onRowClick={setSelectedId} stageOverrides={stageOverrides} />
        )}

        <div style={{ padding: "8px 20px", borderTop: "1px solid var(--ih-line)", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11, color: "var(--ih-ink-50)" }}>
          <span>{rows.length} of {total} deals</span>
          <div style={{ display: "flex", gap: 4 }}>
            <button className="ih-btn ih-btn-quiet ih-btn-icon" style={{ height: 22, width: 22 }}><Icon name="chevronLeft" size={11} /></button>
            <button className="ih-btn ih-btn-quiet ih-btn-icon" style={{ height: 22, width: 22 }}><Icon name="chevronRight" size={11} /></button>
          </div>
        </div>
      </section>

      {selected && (
        <PreviewDrawer
          row={lostReasons[selected.id] ? { ...selected, lostReason: lostReasons[selected.id] } : selected}
          stageOverride={selectedStageOverride}
          onClose={() => setSelectedId(null)}
          onAdvance={() => advance(selected.id)}
          onSetStage={(s) => setStage(selected.id, s)}
          onMarkWon={() => markWon(selected.id)}
          onMarkLost={(reason) => markLost(selected.id, reason)}
          onToast={fireToast}
        />
      )}

      {toast && <NotificationToast message={toast.msg} tone={toast.tone} onDismiss={() => setToast(null)} />}
    </div>
  )
}
