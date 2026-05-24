"use client"

import { useState, useMemo, useRef, useEffect } from "react"
import Link from "next/link"
import { Icon, type IconName } from "@/components/shell"
import { NotificationToast, ConfirmDialog, type ToastTone } from "@/components/shared"
import {
  mockTeam,
  STATUS_META,
  LEVEL_ORDER,
  type TeamMember,
  type TeamFilters,
  type TeamSortBy,
  type TeamSortDir,
  type MemberLevel,
  type MemberStatus,
} from "@/lib/mock/team"

/* ── Column config ───────────────────────────────────────────────────────── */

type ColumnId = "name" | "department" | "level" | "status" | "utilization" | "assignments" | "manager" | "lastActive"
interface ColumnDef { id: ColumnId; label: string; default: boolean }
const COLUMNS: ColumnDef[] = [
  { id: "name",        label: "Name",        default: true },
  { id: "department",  label: "Department",  default: true },
  { id: "level",       label: "Level",       default: true },
  { id: "status",      label: "Status",      default: true },
  { id: "utilization", label: "Utilization", default: true },
  { id: "assignments", label: "Assignments", default: true },
  { id: "manager",     label: "Manager",     default: true },
  { id: "lastActive",  label: "Last active", default: true },
]

const TH_STYLE: React.CSSProperties = {
  textAlign: "left", padding: "10px 10px", fontWeight: 500, fontSize: 10,
  color: "var(--ih-ink-40)", textTransform: "uppercase", letterSpacing: "0.12em",
  fontFamily: "var(--ih-font-mono)", cursor: "pointer", userSelect: "none",
}

/* ── Popover ─────────────────────────────────────────────────────────────── */

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
  const segments = mockTeam.segments()
  return (
    <aside style={{ width: 200, borderRight: "1px solid var(--ih-line)", padding: "12px 8px", overflowY: "auto", flexShrink: 0 }} className="scrollbar-thin">
      {segments.map((sec, i) => (
        <div key={i} style={{ marginBottom: 12 }}>
          <div className="ih-eyebrow" style={{ padding: "8px 8px 4px", fontSize: 9 }}>{sec.group}</div>
          {sec.items?.map(it => {
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
              {sec.tags.map(t => {
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

function UtilBar({ pct }: { pct: number }) {
  const tone = pct >= 90 ? "var(--ih-danger)" : pct >= 75 ? "var(--ih-warn)" : pct >= 50 ? "var(--ih-ok)" : "var(--ih-ink-30)"
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div style={{ width: 44, height: 4, background: "var(--ih-surface-3)", borderRadius: 2, overflow: "hidden" }}>
        <div style={{ width: `${Math.min(100, pct)}%`, height: "100%", background: tone }} />
      </div>
      <span className="ih-num" style={{ fontSize: 11, color: "var(--ih-ink-65)" }}>{pct}%</span>
    </div>
  )
}

function StatusPillCell({ status, onClick }: { status: MemberStatus; onClick: () => void }) {
  const meta = STATUS_META[status]
  return (
    <span onClick={(e) => { e.stopPropagation(); onClick() }}
      className={`ih-pill ${meta.tone !== "muted" ? `ih-pill-${meta.tone}` : ""}`}
      style={{ fontSize: 9, padding: "2px 6px", cursor: "pointer" }} title={`Filter by status: ${meta.label}`}>
      {meta.label}
    </span>
  )
}

function LevelPillCell({ level, onClick }: { level: MemberLevel; onClick: () => void }) {
  return (
    <span onClick={(e) => { e.stopPropagation(); onClick() }}
      className="ih-pill ih-mono" style={{ fontSize: 9, padding: "2px 6px", cursor: "pointer", letterSpacing: "0.04em" }}
      title={`Filter by level: ${level}`}>
      {level}
    </span>
  )
}

function RowActionMenu({
  m, onOpen, onAddFilter, onEmail, onSchedule, onLeave, onArchive,
}: {
  m: TeamMember; onOpen: () => void;
  onAddFilter: (k: keyof TeamFilters, v: string) => void;
  onEmail: () => void; onSchedule: () => void; onLeave: () => void; onArchive: () => void;
}) {
  return (
    <Popover align="right" width={200} trigger={
      <button className="ih-btn ih-btn-quiet ih-btn-icon" style={{ height: 22, width: 22 }} onClick={e => e.stopPropagation()}>
        <Icon name="moreH" size={12} />
      </button>
    }>
      {(close) => (
        <>
          <PopoverItem onClick={() => { onOpen(); close() }}>Open profile</PopoverItem>
          <PopoverItem onClick={() => { onEmail(); close() }}>Email</PopoverItem>
          <PopoverItem onClick={() => { onSchedule(); close() }}>Schedule 1:1</PopoverItem>
          <Link href={`/platform/calendar?owner=${m.id}`} style={{ textDecoration: "none" }}>
            <PopoverItem onClick={close}>View calendar</PopoverItem>
          </Link>
          <div style={{ height: 1, background: "var(--ih-line)", margin: "4px 0" }} />
          <PopoverItem onClick={() => { onAddFilter("department", m.department); close() }}>Filter by department</PopoverItem>
          <PopoverItem onClick={() => { onAddFilter("level", m.level); close() }}>Filter by level</PopoverItem>
          <div style={{ height: 1, background: "var(--ih-line)", margin: "4px 0" }} />
          <PopoverItem onClick={() => { onLeave(); close() }}>Mark on leave</PopoverItem>
          <PopoverItem onClick={() => { onSchedule(); close() }}>Adjust permissions</PopoverItem>
          <PopoverItem danger onClick={() => { onArchive(); close() }}>Archive member</PopoverItem>
        </>
      )}
    </Popover>
  )
}

/* ── Row ─────────────────────────────────────────────────────────────────── */

function MemberRow({
  m, columns, isSelected, onClick, onAddFilter,
  onEmail, onSchedule, onLeave, onArchive,
}: {
  m: TeamMember; columns: ColumnId[]; isSelected: boolean;
  onClick: () => void; onAddFilter: (k: keyof TeamFilters, v: string) => void;
  onEmail: () => void; onSchedule: () => void; onLeave: () => void; onArchive: () => void;
}) {
  const visible = (c: ColumnId) => columns.includes(c)
  return (
    <tr onClick={onClick} style={{
      background: isSelected ? "var(--ih-accent-soft-2)" : "transparent",
      borderTop: "1px solid var(--ih-line)", cursor: "pointer",
    }}>
      <td style={{ padding: "10px 10px 10px 14px", width: 28 }}>
        <input type="checkbox" style={{ accentColor: "var(--ih-accent)" }} onClick={e => e.stopPropagation()} />
      </td>
      {visible("name") && (
        <td style={{ padding: "10px 10px" }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <div className="ih-avatar" style={{ background: "var(--ih-surface-2)", color: "var(--ih-ink)" }}>{m.initials}</div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 500, fontSize: 12.5 }}>{m.name}</div>
              <div style={{ fontSize: 11, color: "var(--ih-ink-50)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 220 }}>{m.title}</div>
            </div>
          </div>
        </td>
      )}
      {visible("department") && (
        <td style={{ padding: "10px 10px" }}>
          <span onClick={(e) => { e.stopPropagation(); onAddFilter("department", m.department) }}
            className="ih-pill" title={`Filter by department: ${m.department}`}
            style={{ fontSize: 9, padding: "2px 6px", cursor: "pointer" }}>
            {m.department}
          </span>
        </td>
      )}
      {visible("level") && (
        <td style={{ padding: "10px 10px" }}>
          <LevelPillCell level={m.level} onClick={() => onAddFilter("level", m.level)} />
        </td>
      )}
      {visible("status") && (
        <td style={{ padding: "10px 10px" }}>
          <StatusPillCell status={m.status} onClick={() => onAddFilter("status", m.status)} />
        </td>
      )}
      {visible("utilization") && <td style={{ padding: "10px 10px" }}><UtilBar pct={m.capacity.utilizationPct} /></td>}
      {visible("assignments") && (
        <td style={{ padding: "10px 10px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <span className="ih-num" style={{ fontSize: 12, color: "var(--ih-ink-65)" }}>{m.assignments.length}</span>
            {m.assignments.slice(0, 2).map(a => (
              <span key={a.engagementId} className="ih-pill" style={{ fontSize: 9, padding: "1px 5px" }}>{a.customerName.split(" ")[0]}</span>
            ))}
            {m.assignments.length > 2 && <span className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)" }}>+{m.assignments.length - 2}</span>}
          </div>
        </td>
      )}
      {visible("manager") && (
        <td style={{ padding: "10px 10px" }}>
          {m.manager ? (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div className="ih-avatar" style={{ width: 20, height: 20, fontSize: 8 }}>{m.manager.initials}</div>
              <span style={{ fontSize: 11.5 }}>{m.manager.name}</span>
            </div>
          ) : <span className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-30)" }}>—</span>}
        </td>
      )}
      {visible("lastActive") && (
        <td style={{ padding: "10px 10px", fontSize: 11, color: "var(--ih-ink-50)" }} className="ih-mono">{m.lastActiveAt}</td>
      )}
      <td style={{ padding: "10px 14px 10px 10px" }} onClick={e => e.stopPropagation()}>
        <RowActionMenu m={m} onOpen={onClick} onAddFilter={onAddFilter}
          onEmail={onEmail} onSchedule={onSchedule} onLeave={onLeave} onArchive={onArchive} />
      </td>
    </tr>
  )
}

/* ── Card grid view ──────────────────────────────────────────────────────── */

function CardGrid({ rows, onClick, selectedId }: { rows: TeamMember[]; onClick: (id: string) => void; selectedId: string | null }) {
  return (
    <div className="scrollbar-thin" style={{ flex: 1, overflowY: "auto", padding: 20 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
        {rows.map(m => {
          const pct = m.capacity.utilizationPct
          const ringTone = pct >= 90 ? "var(--ih-danger)" : pct >= 75 ? "var(--ih-warn)" : "var(--ih-ok)"
          return (
            <div key={m.id} onClick={() => onClick(m.id)} className="ih-card" style={{
              padding: 14, cursor: "pointer",
              outline: m.id === selectedId ? "1px solid var(--ih-accent)" : "none",
            }}>
              <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
                <div className="ih-avatar" style={{ width: 40, height: 40, fontSize: 14 }}>{m.initials}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{m.name}</div>
                  <div style={{ fontSize: 11, color: "var(--ih-ink-50)" }}>{m.title}</div>
                </div>
                <div style={{ position: "relative", width: 36, height: 36 }} title={`${pct}% utilization`}>
                  <svg width="36" height="36" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="14" stroke="var(--ih-surface-3)" strokeWidth="3" fill="none" />
                    <circle cx="18" cy="18" r="14" stroke={ringTone} strokeWidth="3" fill="none"
                      strokeDasharray={`${(Math.min(100, pct) / 100) * 88} 88`}
                      strokeLinecap="round"
                      transform="rotate(-90 18 18)" />
                  </svg>
                  <span className="ih-num" style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10 }}>{pct}</span>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                <span className={`ih-pill ${STATUS_META[m.status].tone !== "muted" ? `ih-pill-${STATUS_META[m.status].tone}` : ""}`} style={{ fontSize: 9, padding: "2px 6px" }}>{STATUS_META[m.status].label}</span>
                <span className="ih-pill ih-mono" style={{ fontSize: 9, padding: "2px 6px" }}>{m.level}</span>
                <span className="ih-pill" style={{ fontSize: 9, padding: "2px 6px" }}>{m.department}</span>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {m.assignments.slice(0, 3).map(a => (
                  <span key={a.engagementId} className="ih-pill" style={{ fontSize: 9, padding: "1px 5px" }}>{a.customerName}</span>
                ))}
                {m.assignments.length > 3 && <span className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)" }}>+{m.assignments.length - 3}</span>}
                {m.assignments.length === 0 && <span className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-30)" }}>No active assignments</span>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ── Org chart (vertical, CSS lines) ─────────────────────────────────────── */

function OrgChart({ rows, onClick, selectedId }: { rows: TeamMember[]; onClick: (id: string) => void; selectedId: string | null }) {
  /* find roots = members in `rows` who have no manager (or whose manager isn't in `rows`) */
  const ids = new Set(rows.map(m => m.id))
  const roots = rows.filter(m => !m.manager || !ids.has(m.manager.id))

  function renderNode(m: TeamMember, depth: number): React.ReactNode {
    const children = rows.filter(c => c.manager?.id === m.id)
    const isSelected = m.id === selectedId
    return (
      <div key={m.id} style={{ display: "flex", flexDirection: "column", alignItems: "center", position: "relative" }}>
        <div onClick={() => onClick(m.id)} className="ih-card" style={{
          padding: "8px 12px", cursor: "pointer", minWidth: 180,
          outline: isSelected ? "1px solid var(--ih-accent)" : "none",
          display: "flex", alignItems: "center", gap: 8,
          background: depth === 0 ? "var(--ih-surface)" : "var(--ih-surface-2)",
        }}>
          <div className="ih-avatar" style={{ width: 28, height: 28, fontSize: 10 }}>{m.initials}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 500 }}>{m.name}</div>
            <div style={{ fontSize: 10, color: "var(--ih-ink-50)" }}>{m.role}</div>
          </div>
          <span className={`ih-pill ih-mono`} style={{ fontSize: 8, padding: "1px 4px" }}>{m.level}</span>
        </div>
        {children.length > 0 && (
          <>
            <div style={{ width: 1, height: 20, background: "var(--ih-line-2)" }} />
            <div style={{ position: "relative", display: "flex", gap: 20, paddingTop: 0 }}>
              {children.length > 1 && (
                <div style={{
                  position: "absolute", top: 0, left: 0, right: 0, height: 1,
                  background: "var(--ih-line-2)",
                }} />
              )}
              {children.map(c => (
                <div key={c.id} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <div style={{ width: 1, height: 20, background: "var(--ih-line-2)" }} />
                  {renderNode(c, depth + 1)}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    )
  }

  return (
    <div className="scrollbar-thin" style={{ flex: 1, overflow: "auto", padding: "32px 20px" }}>
      <div style={{ display: "flex", gap: 48, alignItems: "flex-start", justifyContent: "center", minWidth: "fit-content" }}>
        {roots.length === 0 && <div style={{ color: "var(--ih-ink-40)", fontSize: 12 }}>No members in this view.</div>}
        {roots.map(r => renderNode(r, 0))}
      </div>
    </div>
  )
}

/* ── Slide-in drawer ─────────────────────────────────────────────────────── */

function PreviewDrawer({
  m, onClose, onEmail, onSchedule,
}: { m: TeamMember; onClose: () => void; onEmail: () => void; onSchedule: () => void }) {
  return (
    <aside key={m.id} className="animate-slide-in-right" style={{
      width: 360, borderLeft: "1px solid var(--ih-line)", background: "var(--ih-surface-2)",
      display: "flex", flexDirection: "column", flexShrink: 0,
    }}>
      <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--ih-line)", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div className="ih-avatar ih-avatar-lg" style={{ background: "var(--ih-surface)", color: "var(--ih-ink)", fontFamily: "var(--ih-font-serif)", fontStyle: "italic", fontSize: 16 }}>
            {m.initials}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{m.name}</div>
            <div className="ih-eyebrow" style={{ fontSize: 9, marginTop: 2 }}>
              {m.role} · {STATUS_META[m.status].label.toLowerCase()} · {m.lastActiveAt}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          <Link href={`/platform/team/${m.id}`} className="ih-btn ih-btn-quiet ih-btn-icon" style={{ height: 24, width: 24, textDecoration: "none" }} title="Open full page">
            <Icon name="arrowUpRight" size={12} />
          </Link>
          <button className="ih-btn ih-btn-quiet ih-btn-icon" style={{ height: 24, width: 24 }} onClick={onClose} title="Close">
            <Icon name="x" size={12} />
          </button>
        </div>
      </div>

      <div className="scrollbar-thin" style={{ flex: 1, overflowY: "auto", padding: 16 }}>
        <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
          <span className={`ih-pill ${STATUS_META[m.status].tone !== "muted" ? `ih-pill-${STATUS_META[m.status].tone}` : ""}`} style={{ fontSize: 9, padding: "2px 6px" }}>{STATUS_META[m.status].label}</span>
          <span className="ih-pill ih-mono" style={{ fontSize: 9, padding: "2px 6px" }}>{m.level}</span>
          <span className="ih-pill" style={{ fontSize: 9, padding: "2px 6px" }}>{m.department}</span>
          <span className="ih-pill" style={{ fontSize: 9, padding: "2px 6px" }}>{m.employment.type}</span>
          {m.tags.map(t => <span key={t} className="ih-pill" style={{ fontSize: 9, padding: "2px 6px", textTransform: "lowercase" }}>#{t}</span>)}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, background: "var(--ih-line)", border: "1px solid var(--ih-line)", borderRadius: "var(--ih-r-md)", overflow: "hidden", marginBottom: 16 }}>
          {[
            { label: "Utilization", value: `${m.capacity.utilizationPct}%`, tone: m.capacity.utilizationPct >= 90 ? "var(--ih-danger)" : "var(--ih-ink)" },
            { label: "Billable hrs", value: `${m.capacity.billableHoursThisWeek}h`, tone: "var(--ih-ink)" },
            { label: "PTO balance", value: `${m.capacity.ptoBalanceDays}d`, tone: "var(--ih-ink)" },
            { label: "Tenure", value: m.employment.tenureLabel, tone: "var(--ih-ink)" },
          ].map(s => (
            <div key={s.label} style={{ background: "var(--ih-surface)", padding: "10px 12px" }}>
              <div className="ih-eyebrow" style={{ fontSize: 8, marginBottom: 4 }}>{s.label}</div>
              <div className="ih-serif ih-num" style={{ fontSize: 20, color: s.tone, lineHeight: 1 }}>{s.value}</div>
            </div>
          ))}
        </div>

        <div className="ih-eyebrow" style={{ marginBottom: 8 }}>Current assignments</div>
        {m.assignments.length === 0 && <div style={{ fontSize: 11, color: "var(--ih-ink-40)", padding: "8px 0" }}>No active assignments.</div>}
        {m.assignments.map(a => (
          <Link key={a.engagementId} href={`/platform/clients/${a.engagementId}`}
            style={{ display: "flex", gap: 10, padding: "7px 0", borderBottom: "1px dashed var(--ih-line)", textDecoration: "none", color: "inherit" }}>
            <span className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)", width: 30, flexShrink: 0 }}>{a.allocationPct}%</span>
            <span style={{ fontSize: 11.5, color: "var(--ih-ink)", flex: 1 }}>{a.customerName}</span>
            <span className={`ih-pill`} style={{ fontSize: 8, padding: "1px 5px" }}>{a.stage}</span>
          </Link>
        ))}

        <div className="ih-eyebrow" style={{ marginTop: 16, marginBottom: 8 }}>Top skills</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
          {m.skills.slice(0, 5).map(s => (
            <span key={s.name} className="ih-pill" style={{ fontSize: 9, padding: "2px 6px", display: "inline-flex", alignItems: "center", gap: 4 }}>
              {s.name}
              <span className="ih-mono" style={{ color: "var(--ih-ink-40)", fontSize: 8 }}>L{s.level}</span>
            </span>
          ))}
        </div>

        <div className="ih-eyebrow" style={{ marginTop: 16, marginBottom: 8 }}>Manager</div>
        <div className="ih-card" style={{ padding: 12, display: "flex", alignItems: "center", gap: 10 }}>
          {m.manager ? (
            <>
              <div className="ih-avatar" style={{ width: 28, height: 28, fontSize: 10 }}>{m.manager.initials}</div>
              <Link href={`/platform/team/${m.manager.id}`} style={{ fontSize: 12.5, fontWeight: 500, textDecoration: "none", color: "inherit" }}>{m.manager.name}</Link>
            </>
          ) : (
            <span style={{ fontSize: 11.5, color: "var(--ih-ink-50)" }}>No manager — top of hierarchy.</span>
          )}
        </div>
      </div>

      <div style={{ borderTop: "1px solid var(--ih-line)", padding: 12, display: "flex", flexDirection: "column", gap: 6, background: "var(--ih-surface)" }}>
        <Link href={`/platform/team/${m.id}`} className="ih-btn ih-btn-accent" style={{ width: "100%", textDecoration: "none", justifyContent: "center" }}>
          <Icon name="arrowUpRight" size={12} /> Open profile
        </Link>
        <div style={{ display: "flex", gap: 6 }}>
          <button className="ih-btn ih-btn-ghost ih-btn-sm" style={{ flex: 1 }} onClick={onEmail}><Icon name="mail" size={11} /> Email</button>
          <button className="ih-btn ih-btn-ghost ih-btn-sm" style={{ flex: 1 }} onClick={onSchedule}><Icon name="calendar" size={11} /> 1:1</button>
          <Link href={`/platform/calendar?owner=${m.id}`} className="ih-btn ih-btn-ghost ih-btn-sm" style={{ flex: 1, textDecoration: "none", justifyContent: "center" }}>
            <Icon name="clock" size={11} /> Calendar
          </Link>
        </div>
      </div>
    </aside>
  )
}

/* ── Filter chips ────────────────────────────────────────────────────────── */

function FilterChips({
  filters, activeTags, search,
  onRemoveFilter, onRemoveTag, onClearSearch, onClearAll,
}: {
  filters: TeamFilters; activeTags: string[]; search: string;
  onRemoveFilter: (k: keyof TeamFilters, v?: string) => void;
  onRemoveTag: (t: string) => void;
  onClearSearch: () => void;
  onClearAll: () => void;
}) {
  const chips: React.ReactNode[] = []
  filters.department?.forEach(d => chips.push(
    <span key={`dep-${d}`} className="ih-pill" onClick={() => onRemoveFilter("department", d)} style={{ cursor: "pointer" }}>
      Department: {d} <Icon name="x" size={9} />
    </span>
  ))
  filters.level?.forEach(l => chips.push(
    <span key={`lev-${l}`} className="ih-pill" onClick={() => onRemoveFilter("level", l)} style={{ cursor: "pointer" }}>
      Level: {l} <Icon name="x" size={9} />
    </span>
  ))
  filters.status?.forEach(s => chips.push(
    <span key={`sta-${s}`} className="ih-pill" onClick={() => onRemoveFilter("status", s)} style={{ cursor: "pointer" }}>
      Status: {STATUS_META[s].label} <Icon name="x" size={9} />
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

export default function TeamPage() {
  const [view, setView] = useState<"table" | "cards" | "org">("table")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [activeSegment, setActiveSegment] = useState("active")
  const [search, setSearch] = useState("")
  const [filters, setFilters] = useState<TeamFilters>({})
  const [activeTags, setActiveTags] = useState<string[]>([])
  const [sortBy, setSortBy] = useState<TeamSortBy>("name")
  const [sortDir, setSortDir] = useState<TeamSortDir>("asc")
  const [visibleColumns, setVisibleColumns] = useState<ColumnId[]>(COLUMNS.filter(c => c.default).map(c => c.id))

  const [toast, setToast] = useState<{ message: string; tone: ToastTone } | null>(null)
  const [archiveTarget, setArchiveTarget] = useState<TeamMember | null>(null)
  const [leaveTarget, setLeaveTarget] = useState<TeamMember | null>(null)

  const rows = useMemo(() =>
    mockTeam.list({ segment: activeSegment, search, filters: { ...filters, tag: activeTags.length ? activeTags : undefined }, sortBy, sortDir }),
    [activeSegment, search, filters, activeTags, sortBy, sortDir]
  )
  const stats = useMemo(() => mockTeam.stats(rows), [rows])
  const total = mockTeam.total()
  const selected = selectedId ? rows.find(r => r.id === selectedId) ?? mockTeam.getById(selectedId) : null
  const activeFilterCount =
    (filters.department?.length ?? 0) + (filters.level?.length ?? 0)
    + (filters.status?.length ?? 0) + (filters.managerId?.length ?? 0) + activeTags.length

  function addFilter<K extends keyof TeamFilters>(key: K, value: string) {
    setFilters(prev => {
      const current = (prev[key] as string[] | undefined) ?? []
      if (current.includes(value)) return prev
      return { ...prev, [key]: [...current, value] as TeamFilters[K] }
    })
  }
  function removeFilter<K extends keyof TeamFilters>(key: K, value?: string) {
    setFilters(prev => {
      const next = { ...prev }
      if (value === undefined) { delete next[key]; return next }
      const current = (prev[key] as string[] | undefined) ?? []
      const remaining = current.filter(v => v !== value)
      if (remaining.length === 0) { delete next[key]; return next }
      return { ...next, [key]: remaining as TeamFilters[K] }
    })
  }
  function toggleTag(t: string) {
    setActiveTags(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])
  }
  function clearAll() {
    setFilters({}); setActiveTags([]); setSearch("")
  }
  function emailMember(m: TeamMember) {
    setToast({ message: `Email drafted to ${m.name}`, tone: "info" })
  }
  function scheduleMember(m: TeamMember) {
    setToast({ message: `Booking pre-filled · 1:1 with ${m.name}`, tone: "info" })
  }

  const viewLabel = activeSegment === "active" ? "Active team"
    : mockTeam.segments().flatMap(s => s.items ?? []).find(i => i.id === activeSegment)?.label
    ?? "Team"

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
              <div className="ih-eyebrow" style={{ marginBottom: 6 }}>Team · workspace · <span style={{ color: "var(--ih-accent)" }}>★</span></div>
              <h1 className="ih-serif" style={{ fontSize: 30, margin: 0 }}>
                Team. Your <span className="ih-italic-red">operating</span> bench.
              </h1>
              <div style={{ fontSize: 12, color: "var(--ih-ink-50)", marginTop: 4 }}>
                {rows.length} of {total} members · {viewLabel} · {stats.onLeave} on leave · last refreshed 2s ago
              </div>
            </div>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <Popover width={240} trigger={
                <button className="ih-btn ih-btn-quiet ih-btn-sm">
                  <Icon name="filter" size={11} /> {activeFilterCount ? `${activeFilterCount} filter${activeFilterCount !== 1 ? "s" : ""}` : "Filter"}
                </button>
              }>{() => (
                <>
                  <PopoverHeader>Department</PopoverHeader>
                  {mockTeam.allDepartments().map(d => {
                    const active = filters.department?.includes(d) ?? false
                    return <PopoverItem key={d} active={active} onClick={() => active ? removeFilter("department", d) : addFilter("department", d)}>{d}</PopoverItem>
                  })}
                  <PopoverHeader>Level</PopoverHeader>
                  {LEVEL_ORDER.map(l => {
                    const active = filters.level?.includes(l) ?? false
                    return <PopoverItem key={l} active={active} onClick={() => active ? removeFilter("level", l) : addFilter("level", l)}>{l}</PopoverItem>
                  })}
                  <PopoverHeader>Status</PopoverHeader>
                  {(Object.keys(STATUS_META) as MemberStatus[]).map(s => {
                    const active = filters.status?.includes(s) ?? false
                    return <PopoverItem key={s} active={active} onClick={() => active ? removeFilter("status", s) : addFilter("status", s)}>{STATUS_META[s].label}</PopoverItem>
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
                  <Icon name="filter" size={11} /> Sort: {sortBy} {sortDir === "desc" ? "↓" : "↑"}
                </button>
              }>{() => (
                <>
                  <PopoverHeader>Sort by</PopoverHeader>
                  {(["name", "utilization", "tenure", "assignments", "lastActive"] as TeamSortBy[]).map(s => (
                    <PopoverItem key={s} active={sortBy === s} onClick={() => setSortBy(s)}>{s}</PopoverItem>
                  ))}
                  <PopoverHeader>Direction</PopoverHeader>
                  <PopoverItem active={sortDir === "desc"} onClick={() => setSortDir("desc")}>Descending</PopoverItem>
                  <PopoverItem active={sortDir === "asc"} onClick={() => setSortDir("asc")}>Ascending</PopoverItem>
                </>
              )}</Popover>

              <div style={{ width: 1, height: 18, background: "var(--ih-line)" }} />
              <div style={{ display: "flex", border: "1px solid var(--ih-line)", borderRadius: "var(--ih-r-md)", padding: 2, gap: 2 }}>
                {(["table", "cards", "org"] as const).map(v => (
                  <button key={v} onClick={() => setView(v)} className="ih-btn ih-btn-sm"
                    style={{ height: 22, background: view === v ? "var(--ih-surface-2)" : "transparent", border: 0, color: view === v ? "var(--ih-ink)" : "var(--ih-ink-50)" }}>
                    <Icon name={v === "table" ? "list" : v === "cards" ? "grid" : "workflow"} size={11} /> {v[0].toUpperCase() + v.slice(1)}
                  </button>
                ))}
              </div>
              <div style={{ width: 1, height: 18, background: "var(--ih-line)" }} />
              <button className="ih-btn ih-btn-accent ih-btn-sm" onClick={() => setToast({ message: "Invitation form opened …", tone: "info" })}>
                <Icon name="plus" size={11} /> Invite
              </button>
            </div>
          </div>
        </div>

        <div style={{ padding: "14px 20px", display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 1, background: "var(--ih-line)", borderBottom: "1px solid var(--ih-line)" }}>
          {[
            { label: "Headcount",         value: String(stats.headcount),       sub: `of ${total} total`,                   tone: "var(--ih-ink)" },
            { label: "Avg utilization",   value: `${stats.avgUtilization}%`,    sub: "active members",                       tone: stats.avgUtilization >= 90 ? "var(--ih-warn)" : "var(--ih-ok)" },
            { label: "Billable this week",value: `${stats.billableThisWeek}h`,  sub: "across team",                          tone: "var(--ih-ink)" },
            { label: "On leave",          value: String(stats.onLeave),         sub: stats.onLeave ? "active leaves" : "all in", tone: stats.onLeave ? "var(--ih-warn)" : "var(--ih-ink-50)" },
            { label: "Open roles",        value: String(stats.openRoles),       sub: "hiring pipeline",                      tone: stats.openRoles ? "var(--ih-accent)" : "var(--ih-ink-50)" },
          ].map(s => (
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
            <input className="ih-input" placeholder="Search names, titles, skills, tags…"
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

        {view === "table" && (
          <div className="scrollbar-thin" style={{ flex: 1, overflowY: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead style={{ position: "sticky", top: 0, background: "var(--ih-bg)", zIndex: 1 }}>
                <tr style={{ borderBottom: "1px solid var(--ih-line)" }}>
                  <th style={{ width: 28, padding: "10px 10px 10px 14px" }}></th>
                  {visibleColumns.includes("name")        && <th style={TH_STYLE} onClick={() => { setSortBy("name");        setSortDir(d => d === "asc" ? "desc" : "asc") }}>Name {sortBy === "name" && (sortDir === "desc" ? "↓" : "↑")}</th>}
                  {visibleColumns.includes("department")  && <th style={TH_STYLE}>Department</th>}
                  {visibleColumns.includes("level")       && <th style={TH_STYLE}>Level</th>}
                  {visibleColumns.includes("status")      && <th style={TH_STYLE}>Status</th>}
                  {visibleColumns.includes("utilization") && <th style={TH_STYLE} onClick={() => { setSortBy("utilization"); setSortDir(d => d === "asc" ? "desc" : "asc") }}>Utilization {sortBy === "utilization" && (sortDir === "desc" ? "↓" : "↑")}</th>}
                  {visibleColumns.includes("assignments") && <th style={TH_STYLE} onClick={() => { setSortBy("assignments"); setSortDir(d => d === "asc" ? "desc" : "asc") }}>Assignments {sortBy === "assignments" && (sortDir === "desc" ? "↓" : "↑")}</th>}
                  {visibleColumns.includes("manager")     && <th style={TH_STYLE}>Manager</th>}
                  {visibleColumns.includes("lastActive")  && <th style={TH_STYLE} onClick={() => { setSortBy("lastActive");  setSortDir(d => d === "asc" ? "desc" : "asc") }}>Last active {sortBy === "lastActive" && (sortDir === "desc" ? "↓" : "↑")}</th>}
                  <th style={{ width: 36 }}></th>
                </tr>
              </thead>
              <tbody>
                {rows.map(m => (
                  <MemberRow key={m.id} m={m} columns={visibleColumns}
                    isSelected={m.id === selectedId}
                    onClick={() => setSelectedId(m.id)}
                    onAddFilter={addFilter}
                    onEmail={() => emailMember(m)}
                    onSchedule={() => scheduleMember(m)}
                    onLeave={() => setLeaveTarget(m)}
                    onArchive={() => setArchiveTarget(m)} />
                ))}
                {rows.length === 0 && (
                  <tr><td colSpan={visibleColumns.length + 2} style={{ padding: 40, textAlign: "center", color: "var(--ih-ink-40)", fontSize: 12 }}>
                    No members match these filters.{" "}
                    <button onClick={clearAll} className="ih-btn ih-btn-quiet ih-btn-sm" style={{ height: 22, marginLeft: 4 }}>Clear filters</button>
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {view === "cards" && <CardGrid rows={rows} onClick={setSelectedId} selectedId={selectedId} />}
        {view === "org"   && <OrgChart rows={rows} onClick={setSelectedId} selectedId={selectedId} />}

        <div style={{ padding: "8px 20px", borderTop: "1px solid var(--ih-line)", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11, color: "var(--ih-ink-50)" }}>
          <span>{rows.length} of {total} members</span>
        </div>
      </section>

      {selected && (
        <PreviewDrawer m={selected}
          onClose={() => setSelectedId(null)}
          onEmail={() => emailMember(selected)}
          onSchedule={() => scheduleMember(selected)} />
      )}

      <ConfirmDialog
        open={!!archiveTarget}
        title={`Archive ${archiveTarget?.name ?? ""}?`}
        description="The member will be hidden from active lists but retained for audit. You can restore later from settings."
        confirmLabel="Archive" confirmTone="danger"
        onConfirm={() => { setToast({ message: `Archived ${archiveTarget?.name}`, tone: "warn" }); setArchiveTarget(null) }}
        onCancel={() => setArchiveTarget(null)} />

      <ConfirmDialog
        open={!!leaveTarget}
        title={`Mark ${leaveTarget?.name ?? ""} as on leave?`}
        description="Status flips to ON_LEAVE. Their bookings stay on the calendar; assignments are kept for reporting."
        confirmLabel="Mark on leave"
        onConfirm={() => { setToast({ message: `${leaveTarget?.name} marked on leave`, tone: "info" }); setLeaveTarget(null) }}
        onCancel={() => setLeaveTarget(null)} />

      {toast && <NotificationToast message={toast.message} tone={toast.tone} onDismiss={() => setToast(null)} />}
    </div>
  )
}
