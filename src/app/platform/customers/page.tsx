"use client"

import { useState, useMemo, useRef, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Icon, type IconName } from "@/components/shell"
import { NotificationToast, type ToastTone, ConfirmDialog, EmailDraftDialog } from "@/components/shared"
import {
  mockCustomers,
  STATUS_META,
  type Customer,
  type CustomerFilters,
  type CustomerSortBy,
  type CustomerSortDir,
  type CustomerStatus,
} from "@/lib/mock/customers"

/* ── Column config ───────────────────────────────────────────────────────── */

type ColumnId = "customer" | "status" | "industry" | "engagements" | "ltv" | "lastActivity" | "owner"

interface ColumnDef { id: ColumnId; label: string; default: boolean }
const COLUMNS: ColumnDef[] = [
  { id: "customer",     label: "Customer",       default: true },
  { id: "status",       label: "Status",         default: true },
  { id: "industry",     label: "Industry",       default: true },
  { id: "engagements",  label: "Engagements",    default: true },
  { id: "ltv",          label: "Lifetime value", default: true },
  { id: "lastActivity", label: "Last activity",  default: true },
  { id: "owner",        label: "Owner",          default: true },
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
          maxHeight: 380, overflowY: "auto",
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
  const segments = mockCustomers.segments()
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

function StatusPill({ status, onClick }: { status: CustomerStatus; onClick?: () => void }) {
  const m = STATUS_META[status]
  return (
    <span
      onClick={(e) => { if (onClick) { e.stopPropagation(); onClick() } }}
      className={`ih-pill ${m.tone !== "muted" ? `ih-pill-${m.tone}` : ""}`}
      title={onClick ? `Filter by status: ${m.label}` : undefined}
      style={{ fontSize: 9, padding: "2px 6px", cursor: onClick ? "pointer" : "default" }}
    >
      {m.label}
    </span>
  )
}

function EngagementDots({ row }: { row: Customer }) {
  const total = row.engagementSummary.active + row.engagementSummary.proposed + row.engagementSummary.closed
  if (total === 0) return <span style={{ color: "var(--ih-ink-30)", fontSize: 11 }}>—</span>
  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
      <span className="ih-num" style={{ fontSize: 12 }}>{total}</span>
      <div style={{ display: "flex", gap: 2 }}>
        {Array.from({ length: row.engagementSummary.active }).map((_, i) => <span key={`a-${i}`} className="ih-dot ih-dot-ok" title="active" />)}
        {Array.from({ length: row.engagementSummary.proposed }).map((_, i) => <span key={`p-${i}`} className="ih-dot ih-dot-info" title="proposed" />)}
        {Array.from({ length: row.engagementSummary.closed }).map((_, i) => <span key={`c-${i}`} className="ih-dot ih-dot-muted" title="closed" />)}
      </div>
    </div>
  )
}

/* ── Row action menu ─────────────────────────────────────────────────────── */

function RowActionMenu({
  row, onView, onAddFilter, onEmail, onMerge, onArchive,
}: {
  row: Customer;
  onView: () => void;
  onAddFilter: (k: keyof CustomerFilters, v: string) => void;
  onEmail: () => void;
  onMerge: () => void;
  onArchive: () => void;
}) {
  return (
    <Popover align="right" width={200} trigger={
      <button className="ih-btn ih-btn-quiet ih-btn-icon" style={{ height: 22, width: 22 }} onClick={e => e.stopPropagation()}>
        <Icon name="moreH" size={12} />
      </button>
    }>
      {(close) => (
        <>
          <PopoverItem onClick={() => { onView(); close() }}>Open preview</PopoverItem>
          <Link href={`/platform/customers/${row.id}`} style={{ textDecoration: "none" }}>
            <PopoverItem onClick={close}>Open full page</PopoverItem>
          </Link>
          <div style={{ height: 1, background: "var(--ih-line)", margin: "4px 0" }} />
          <PopoverItem onClick={() => { onEmail(); close() }}>Send email…</PopoverItem>
          <PopoverItem onClick={() => { onAddFilter("status", row.status); close() }}>Filter same status</PopoverItem>
          <PopoverItem onClick={() => { onAddFilter("industry", row.industry); close() }}>Filter same industry</PopoverItem>
          <div style={{ height: 1, background: "var(--ih-line)", margin: "4px 0" }} />
          <PopoverItem onClick={() => { onMerge(); close() }}>Merge with…</PopoverItem>
          <PopoverItem danger onClick={() => { onArchive(); close() }}>Archive customer</PopoverItem>
        </>
      )}
    </Popover>
  )
}

/* ── Row ─────────────────────────────────────────────────────────────────── */

function CustomerRow({
  row, columns, isSelected, onClick, onAddFilter, onEmail, onMerge, onArchive,
}: {
  row: Customer; columns: ColumnId[]; isSelected: boolean;
  onClick: () => void;
  onAddFilter: (k: keyof CustomerFilters, v: string) => void;
  onEmail: () => void; onMerge: () => void; onArchive: () => void;
}) {
  const visible = (c: ColumnId) => columns.includes(c)
  const atRisk = row.openInvoices > 0 && row.status !== "ACTIVE"
  return (
    <tr onClick={onClick} style={{
      background: isSelected ? "var(--ih-accent-soft-2)" : atRisk ? "rgba(192,57,43,0.025)" : "transparent",
      borderTop: "1px solid var(--ih-line)", cursor: "pointer",
    }}>
      <td style={{ padding: "10px 10px 10px 14px", width: 28 }}>
        <input type="checkbox" style={{ accentColor: "var(--ih-accent)" }} onClick={e => e.stopPropagation()} />
      </td>
      {visible("customer") && (
        <td style={{ padding: "10px 10px" }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <div className="ih-avatar" style={{ background: atRisk ? "var(--ih-danger-soft)" : "var(--ih-surface-2)", color: atRisk ? "var(--ih-danger)" : "var(--ih-ink-65)" }}>{row.initials}</div>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontWeight: 500, fontSize: 12.5 }}>{row.name}</span>
                {atRisk && <span className="ih-pill ih-pill-danger" style={{ fontSize: 8, padding: "1px 5px" }}>AT RISK</span>}
              </div>
              <div style={{ fontSize: 11, color: "var(--ih-ink-50)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 240 }}>
                {row.primaryContact.name} · {row.primaryContact.email}
              </div>
            </div>
          </div>
        </td>
      )}
      {visible("status") && (
        <td style={{ padding: "10px 10px" }}>
          <StatusPill status={row.status} onClick={() => onAddFilter("status", row.status)} />
        </td>
      )}
      {visible("industry") && (
        <td style={{ padding: "10px 10px" }}>
          <span onClick={(e) => { e.stopPropagation(); onAddFilter("industry", row.industry) }}
            className="ih-pill" title={`Filter by industry: ${row.industry}`}
            style={{ fontSize: 9, padding: "2px 6px", cursor: "pointer" }}>
            {row.industry}
          </span>
        </td>
      )}
      {visible("engagements") && <td style={{ padding: "10px 10px" }}><EngagementDots row={row} /></td>}
      {visible("ltv") && (
        <td style={{ padding: "10px 10px" }}>
          {row.lifetimeValue > 0
            ? <div className="ih-num" style={{ fontSize: 12.5 }}>£{row.lifetimeValue.toLocaleString()}</div>
            : <span style={{ color: "var(--ih-ink-30)" }}>—</span>}
        </td>
      )}
      {visible("lastActivity") && (
        <td style={{ padding: "10px 10px", fontSize: 11, color: "var(--ih-ink-50)" }} className="ih-mono">{row.lastActivity}</td>
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
      <td style={{ padding: "10px 14px 10px 10px" }} onClick={e => e.stopPropagation()}>
        <RowActionMenu row={row} onView={onClick} onAddFilter={onAddFilter} onEmail={onEmail} onMerge={onMerge} onArchive={onArchive} />
      </td>
    </tr>
  )
}

/* ── Card grid view ──────────────────────────────────────────────────────── */

function CardGrid({ rows, onClick, selectedId }: { rows: Customer[]; onClick: (id: string) => void; selectedId: string | null }) {
  return (
    <div className="scrollbar-thin" style={{ flex: 1, overflowY: "auto", padding: 20 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
        {rows.map(r => {
          const atRisk = r.openInvoices > 0 && r.status !== "ACTIVE"
          const isSel = r.id === selectedId
          return (
            <div key={r.id} onClick={() => onClick(r.id)} className="ih-card" style={{
              padding: 14, cursor: "pointer",
              borderColor: isSel ? "var(--ih-accent)" : undefined,
              boxShadow: isSel ? "0 0 0 1px var(--ih-accent)" : undefined,
            }}>
              <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
                <div className="ih-avatar ih-avatar-lg" style={{ background: atRisk ? "var(--ih-danger-soft)" : "var(--ih-surface-2)", color: atRisk ? "var(--ih-danger)" : "var(--ih-ink)", fontFamily: "var(--ih-font-serif)", fontStyle: "italic" }}>{r.initials}</div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <span style={{ fontSize: 13.5, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.name}</span>
                  </div>
                  <div style={{ fontSize: 11, color: "var(--ih-ink-50)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.primaryContact.name}</div>
                </div>
                <StatusPill status={r.status} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 10 }}>
                <div>
                  <div className="ih-eyebrow" style={{ fontSize: 8, marginBottom: 2 }}>Lifetime value</div>
                  <div className="ih-num ih-serif" style={{ fontSize: 22, lineHeight: 1 }}>
                    {r.lifetimeValue > 0 ? `£${(r.lifetimeValue / 1000).toFixed(1)}k` : "—"}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div className="ih-eyebrow" style={{ fontSize: 8, marginBottom: 2 }}>Engagements</div>
                  <EngagementDots row={r} />
                </div>
              </div>
              <div style={{ fontSize: 11, color: "var(--ih-ink-65)", borderTop: "1px dashed var(--ih-line)", paddingTop: 8 }}>
                {r.recentActivity[0]?.text ?? "No recent activity"}
              </div>
              <div className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)", marginTop: 4 }}>{r.lastActivity}</div>
            </div>
          )
        })}
        {rows.length === 0 && (
          <div style={{ gridColumn: "1 / -1", padding: 40, textAlign: "center", color: "var(--ih-ink-40)", fontSize: 12 }}>No customers match these filters.</div>
        )}
      </div>
    </div>
  )
}

/* ── Drawer tabs ─────────────────────────────────────────────────────────── */

type DrawerTab = "overview" | "engagements" | "bookings" | "invoices" | "contacts" | "notes"

function DrawerOverview({ row }: { row: Customer }) {
  return (
    <>
      <div className="ih-eyebrow" style={{ marginBottom: 8 }}>Recent activity</div>
      {row.recentActivity.map((it, i) => (
        <div key={i} style={{ display: "flex", gap: 10, padding: "7px 0", borderBottom: "1px dashed var(--ih-line)" }}>
          <span className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)", width: 60, flexShrink: 0 }}>{it.date}</span>
          <span className={`ih-dot ih-dot-${it.tone}`} style={{ marginTop: 5, flexShrink: 0 }} />
          {it.href
            ? <Link href={it.href} style={{ fontSize: 11.5, color: "var(--ih-ink-65)", lineHeight: 1.45, textDecoration: "none" }}>{it.text}</Link>
            : <span style={{ fontSize: 11.5, color: "var(--ih-ink-65)", lineHeight: 1.45 }}>{it.text}</span>}
        </div>
      ))}
      <div className="ih-eyebrow" style={{ marginTop: 16, marginBottom: 8 }}>Customer detail</div>
      <div className="ih-card" style={{ padding: 12 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12 }}>
          {[
            ["Industry",   row.industry],
            ["Employees",  row.employees],
            ["Address",    row.address],
            ["Source",     row.source],
            ["Customer since", row.since],
            ["Tags",       row.tags.join(", ") || "—"],
          ].map(([k, v]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
              <span style={{ color: "var(--ih-ink-50)" }}>{k}</span>
              <span style={{ color: "var(--ih-ink)", textAlign: "right" }}>{v}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

function DrawerEngagements({ row }: { row: Customer }) {
  if (row.engagementIds.length === 0) return <div style={{ fontSize: 12, color: "var(--ih-ink-50)", padding: 12, textAlign: "center" }}>No engagements yet.</div>
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {row.engagementIds.map(id => (
        <Link key={id} href={`/platform/clients/${id}`} className="ih-card" style={{ padding: 10, textDecoration: "none", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)" }}>/{id}</div>
            <div style={{ fontSize: 12.5, fontWeight: 500, color: "var(--ih-ink)" }}>Engagement detail</div>
          </div>
          <Icon name="arrowUpRight" size={12} style={{ color: "var(--ih-ink-40)" }} />
        </Link>
      ))}
    </div>
  )
}

function DrawerBookings({ row }: { row: Customer }) {
  if (row.bookingIds.length === 0) return <div style={{ fontSize: 12, color: "var(--ih-ink-50)", padding: 12, textAlign: "center" }}>No bookings yet.</div>
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {row.bookingIds.map(id => (
        <Link key={id} href={`/platform/bookings/${id}`} className="ih-card" style={{ padding: "8px 10px", textDecoration: "none", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span className="ih-mono" style={{ fontSize: 11, color: "var(--ih-ink)" }}>/{id}</span>
          <Icon name="arrowUpRight" size={11} style={{ color: "var(--ih-ink-40)" }} />
        </Link>
      ))}
    </div>
  )
}

function DrawerInvoices({ row }: { row: Customer }) {
  if (row.invoiceIds.length === 0) return <div style={{ fontSize: 12, color: "var(--ih-ink-50)", padding: 12, textAlign: "center" }}>No invoices yet.</div>
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {row.invoiceIds.map(id => (
        <Link key={id} href={`/platform/payments/${id}`} className="ih-card" style={{ padding: "8px 10px", textDecoration: "none", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span className="ih-mono" style={{ fontSize: 11, color: "var(--ih-ink)" }}>/{id}</span>
          <Icon name="arrowUpRight" size={11} style={{ color: "var(--ih-ink-40)" }} />
        </Link>
      ))}
    </div>
  )
}

function DrawerContacts({ row }: { row: Customer }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {row.contacts.map(c => (
        <div key={c.id} className="ih-card" style={{ padding: 10 }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 6 }}>
            <div className="ih-avatar" style={{ width: 26, height: 26, fontSize: 10 }}>{c.name.split(" ").map(s => s[0]).slice(0, 2).join("")}</div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 12.5, fontWeight: 500 }}>{c.name}</span>
                {c.isPrimary && <span className="ih-pill ih-pill-accent" style={{ fontSize: 8, padding: "1px 5px" }}>PRIMARY</span>}
              </div>
              <span className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-50)" }}>{c.role}</span>
            </div>
          </div>
          <div style={{ fontSize: 11, color: "var(--ih-ink-65)", display: "flex", flexDirection: "column", gap: 2 }}>
            <span><Icon name="mail" size={10} /> {c.email}</span>
            <span className="ih-mono"><Icon name="phone" size={10} /> {c.phone}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

function DrawerNotes({
  row, notes, draft, setDraft, onSave,
}: {
  row: Customer; notes: Array<{ id: string; text: string; when: string; by: string }>;
  draft: string; setDraft: (v: string) => void; onSave: () => void;
}) {
  return (
    <>
      <div className="ih-card" style={{ padding: 10, marginBottom: 10 }}>
        <div style={{ fontSize: 12, lineHeight: 1.55, color: "var(--ih-ink-65)" }}>{row.notes}</div>
      </div>
      <div className="ih-card" style={{ padding: 10, marginBottom: 12 }}>
        <textarea
          value={draft}
          onChange={e => setDraft(e.target.value)}
          placeholder="Add a note…"
          className="ih-input"
          rows={3}
          style={{ width: "100%", fontSize: 12, resize: "vertical", padding: 8 }}
        />
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 6 }}>
          <button className="ih-btn ih-btn-accent ih-btn-sm" disabled={!draft.trim()} onClick={onSave}>
            <Icon name="plus" size={11} /> Save note
          </button>
        </div>
      </div>
      {notes.map(n => (
        <div key={n.id} className="ih-card" style={{ padding: 10, marginBottom: 6 }}>
          <div className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)", marginBottom: 4 }}>{n.by} · {n.when}</div>
          <div style={{ fontSize: 12, lineHeight: 1.5 }}>{n.text}</div>
        </div>
      ))}
    </>
  )
}

/* ── Preview drawer ──────────────────────────────────────────────────────── */

function PreviewDrawer({
  row, onClose, onEmail, onMerge, onArchive, onCreateEngagement, onSchedule,
}: {
  row: Customer; onClose: () => void;
  onEmail: () => void; onMerge: () => void; onArchive: () => void;
  onCreateEngagement: () => void; onSchedule: () => void;
}) {
  const [tab, setTab] = useState<DrawerTab>("overview")
  const [draft, setDraft] = useState("")
  const [notes, setNotes] = useState<Array<{ id: string; text: string; when: string; by: string }>>([])
  const atRisk = row.openInvoices > 0 && row.status !== "ACTIVE"
  const titleWords = row.name.split(" ")
  const lastWord = titleWords[titleWords.length - 1]
  const restWords = titleWords.slice(0, -1).join(" ")

  function saveNote() {
    if (!draft.trim()) return
    setNotes(prev => [{ id: `note-${prev.length + 1}`, text: draft, when: "just now", by: "luke" }, ...prev])
    setDraft("")
  }

  const TABS: Array<{ id: DrawerTab; label: string }> = [
    { id: "overview",    label: "Overview" },
    { id: "engagements", label: `Engagements (${row.engagementIds.length})` },
    { id: "bookings",    label: `Bookings (${row.bookingIds.length})` },
    { id: "invoices",    label: `Invoices (${row.invoiceIds.length})` },
    { id: "contacts",    label: `Contacts (${row.contacts.length})` },
    { id: "notes",       label: "Notes" },
  ]

  return (
    <aside key={row.id} className="animate-slide-in-right" style={{
      width: 380, borderLeft: "1px solid var(--ih-line)", background: "var(--ih-surface-2)",
      display: "flex", flexDirection: "column", flexShrink: 0,
    }}>
      <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--ih-line)", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div className="ih-avatar ih-avatar-lg" style={{ background: atRisk ? "var(--ih-danger-soft)" : "var(--ih-surface)", color: atRisk ? "var(--ih-danger)" : "var(--ih-ink)", fontFamily: "var(--ih-font-serif)", fontStyle: "italic", fontSize: 16 }}>
            {row.initials}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{row.name}</div>
            <div className="ih-eyebrow" style={{ fontSize: 9, marginTop: 2 }}>
              {row.primaryContact.name} · since {row.since}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          <Link href={`/platform/customers/${row.id}`} className="ih-btn ih-btn-quiet ih-btn-icon" style={{ height: 24, width: 24, textDecoration: "none" }} title="Open full page">
            <Icon name="arrowUpRight" size={12} />
          </Link>
          <button className="ih-btn ih-btn-quiet ih-btn-icon" style={{ height: 24, width: 24 }} onClick={onClose} title="Close">
            <Icon name="x" size={12} />
          </button>
        </div>
      </div>

      <div className="scrollbar-thin" style={{ flex: 1, overflowY: "auto", padding: 16 }}>
        <div className="ih-serif" style={{ fontSize: 22, lineHeight: 1.15, marginBottom: 6 }}>
          {restWords}{restWords && " "}
          <span className="ih-italic-red">{lastWord}</span>
        </div>
        <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
          <StatusPill status={row.status} />
          <span className="ih-pill" style={{ fontSize: 9, padding: "2px 6px" }}>{row.industry}</span>
          {row.tags.map(t => <span key={t} className="ih-pill" style={{ fontSize: 9, padding: "2px 6px", textTransform: "lowercase" }}>#{t}</span>)}
        </div>

        {atRisk && (
          <div style={{ background: "var(--ih-danger-soft)", borderRadius: "var(--ih-r-md)", padding: "10px 12px", marginBottom: 14, display: "flex", gap: 10, alignItems: "flex-start" }}>
            <Icon name="flag" size={14} style={{ color: "var(--ih-danger)", marginTop: 1 }} />
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--ih-danger)", marginBottom: 2 }}>At risk</div>
              <div style={{ fontSize: 11.5, color: "var(--ih-ink)", lineHeight: 1.45 }}>{row.openInvoices} open invoice{row.openInvoices !== 1 ? "s" : ""} · status {row.status.toLowerCase()}.</div>
            </div>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, background: "var(--ih-line)", border: "1px solid var(--ih-line)", borderRadius: "var(--ih-r-md)", overflow: "hidden", marginBottom: 14 }}>
          {[
            { label: "Lifetime value", value: row.lifetimeValue > 0 ? `£${row.lifetimeValue.toLocaleString()}` : "—", tone: "var(--ih-ink)" },
            { label: "Engagements",    value: String(row.engagementSummary.active + row.engagementSummary.proposed + row.engagementSummary.closed), tone: "var(--ih-ink)" },
            { label: "Open invoices",  value: String(row.openInvoices), tone: row.openInvoices > 0 ? "var(--ih-danger)" : "var(--ih-ink)" },
            { label: "Last activity",  value: row.lastActivity, tone: "var(--ih-ink)" },
          ].map((s) => (
            <div key={s.label} style={{ background: "var(--ih-surface)", padding: "10px 12px" }}>
              <div className="ih-eyebrow" style={{ fontSize: 8, marginBottom: 4 }}>{s.label}</div>
              <div className="ih-serif ih-num" style={{ fontSize: 18, color: s.tone, lineHeight: 1 }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 0, borderBottom: "1px solid var(--ih-line)", marginBottom: 12, overflowX: "auto" }} className="scrollbar-thin">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              background: "transparent", border: 0, padding: "6px 8px", fontSize: 11,
              color: tab === t.id ? "var(--ih-ink)" : "var(--ih-ink-50)",
              fontWeight: tab === t.id ? 500 : 400, cursor: "pointer",
              borderBottom: tab === t.id ? "2px solid var(--ih-accent)" : "2px solid transparent",
              marginBottom: -1, whiteSpace: "nowrap",
            }}>
              {t.label}
            </button>
          ))}
        </div>

        {tab === "overview"    && <DrawerOverview row={row} />}
        {tab === "engagements" && <DrawerEngagements row={row} />}
        {tab === "bookings"    && <DrawerBookings row={row} />}
        {tab === "invoices"    && <DrawerInvoices row={row} />}
        {tab === "contacts"    && <DrawerContacts row={row} />}
        {tab === "notes"       && <DrawerNotes row={row} notes={notes} draft={draft} setDraft={setDraft} onSave={saveNote} />}
      </div>

      <div style={{ borderTop: "1px solid var(--ih-line)", padding: 12, display: "flex", flexDirection: "column", gap: 6, background: "var(--ih-surface)" }}>
        <Link href={`/platform/customers/${row.id}`} className="ih-btn ih-btn-accent" style={{ width: "100%", textDecoration: "none", justifyContent: "center" }}>
          <Icon name="arrowUpRight" size={12} /> Open customer hub
        </Link>
        <div style={{ display: "flex", gap: 6 }}>
          <button className="ih-btn ih-btn-ghost ih-btn-sm" style={{ flex: 1 }} onClick={onEmail}><Icon name="mail" size={11} /> Email</button>
          <button className="ih-btn ih-btn-ghost ih-btn-sm" style={{ flex: 1 }} onClick={onSchedule}><Icon name="calendar" size={11} /> Schedule</button>
          <button className="ih-btn ih-btn-ghost ih-btn-sm" style={{ flex: 1 }} onClick={onCreateEngagement}><Icon name="plus" size={11} /> Engagement</button>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button className="ih-btn ih-btn-quiet ih-btn-sm" style={{ flex: 1 }} onClick={onMerge}><Icon name="link" size={11} /> Merge</button>
          <button className="ih-btn ih-btn-quiet ih-btn-sm" style={{ flex: 1, color: "var(--ih-danger)" }} onClick={onArchive}><Icon name="x" size={11} /> Archive</button>
        </div>
      </div>
    </aside>
  )
}

/* ── Filter chips bar ────────────────────────────────────────────────────── */

function FilterChips({
  filters, activeTags, search,
  onRemoveFilter, onRemoveTag, onClearSearch, onClearAll,
}: {
  filters: CustomerFilters; activeTags: string[]; search: string;
  onRemoveFilter: (k: keyof CustomerFilters, v?: string) => void;
  onRemoveTag: (t: string) => void;
  onClearSearch: () => void;
  onClearAll: () => void;
}) {
  const chips: React.ReactNode[] = []
  filters.status?.forEach(s => chips.push(
    <span key={`status-${s}`} className="ih-pill" onClick={() => onRemoveFilter("status", s)}
      style={{ background: "var(--ih-accent-soft)", color: "var(--ih-accent)", borderColor: "transparent", cursor: "pointer" }}>
      Status: {STATUS_META[s].label} <Icon name="x" size={9} />
    </span>
  ))
  filters.industry?.forEach(i => chips.push(
    <span key={`ind-${i}`} className="ih-pill" onClick={() => onRemoveFilter("industry", i)} style={{ cursor: "pointer" }}>
      Industry: {i} <Icon name="x" size={9} />
    </span>
  ))
  filters.owner?.forEach(o => {
    const owner = mockCustomers.allOwners().find(x => x.id === o)
    chips.push(
      <span key={`owner-${o}`} className="ih-pill" onClick={() => onRemoveFilter("owner", o)} style={{ cursor: "pointer" }}>
        Owner: {owner?.name ?? o} <Icon name="x" size={9} />
      </span>
    )
  })
  if (filters.hasOpenInvoices) chips.push(
    <span key="oi" className="ih-pill ih-pill-warn" onClick={() => onRemoveFilter("hasOpenInvoices")} style={{ cursor: "pointer" }}>
      Open invoices <Icon name="x" size={9} />
    </span>
  )
  if (filters.highValue) chips.push(
    <span key="hv" className="ih-pill" onClick={() => onRemoveFilter("highValue")} style={{ cursor: "pointer" }}>
      High value <Icon name="x" size={9} />
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

/* ── Merge popover content ───────────────────────────────────────────────── */

function MergePicker({ row, onPick }: { row: Customer; onPick: (target: Customer) => void }) {
  const others = mockCustomers.list().filter(c => c.id !== row.id)
  return (
    <>
      <PopoverHeader>Merge {row.name} into…</PopoverHeader>
      {others.map(o => (
        <PopoverItem key={o.id} onClick={() => onPick(o)}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div className="ih-avatar" style={{ width: 18, height: 18, fontSize: 8 }}>{o.initials}</div>
            <span>{o.name}</span>
          </div>
        </PopoverItem>
      ))}
    </>
  )
}

/* ── Main ────────────────────────────────────────────────────────────────── */

export default function CustomersListPage() {
  const router = useRouter()
  const [view, setView] = useState<"table" | "grid">("table")
  const [selectedId, setSelectedId] = useState<string | null>("cust-nw")
  const [activeSegment, setActiveSegment] = useState("active")
  const [search, setSearch] = useState("")
  const [filters, setFilters] = useState<CustomerFilters>({})
  const [activeTags, setActiveTags] = useState<string[]>([])
  const [sortBy, setSortBy] = useState<CustomerSortBy>("lastActivity")
  const [sortDir, setSortDir] = useState<CustomerSortDir>("desc")
  const [visibleColumns, setVisibleColumns] = useState<ColumnId[]>(COLUMNS.filter(c => c.default).map(c => c.id))

  /* mutation state */
  const [toast, setToast] = useState<{ message: string; tone?: ToastTone } | null>(null)
  const [emailFor, setEmailFor] = useState<Customer | null>(null)
  const [mergeFor, setMergeFor] = useState<Customer | null>(null)
  const [archiveFor, setArchiveFor] = useState<Customer | null>(null)
  const [confirmMerge, setConfirmMerge] = useState<{ source: Customer; target: Customer } | null>(null)

  const rows = useMemo(() =>
    mockCustomers.list({
      segment: activeSegment, search,
      filters: { ...filters, tag: activeTags.length ? activeTags : undefined },
      sortBy, sortDir,
    }),
    [activeSegment, search, filters, activeTags, sortBy, sortDir]
  )
  const stats = useMemo(() => mockCustomers.stats(rows), [rows])
  const total = mockCustomers.total()
  const selected = selectedId ? rows.find(r => r.id === selectedId) ?? mockCustomers.getById(selectedId) : null
  const activeFilterCount =
    (filters.status?.length ?? 0) + (filters.industry?.length ?? 0) + (filters.owner?.length ?? 0)
    + (filters.hasOpenInvoices ? 1 : 0) + (filters.highValue ? 1 : 0) + activeTags.length

  function addFilter<K extends keyof CustomerFilters>(key: K, value: string) {
    setFilters(prev => {
      if (key === "hasOpenInvoices" || key === "highValue") return { ...prev, [key]: true }
      const current = (prev[key] as string[] | undefined) ?? []
      if (current.includes(value)) return prev
      return { ...prev, [key]: [...current, value] as CustomerFilters[K] }
    })
  }
  function removeFilter<K extends keyof CustomerFilters>(key: K, value?: string) {
    setFilters(prev => {
      const next = { ...prev }
      if (key === "hasOpenInvoices" || key === "highValue" || value === undefined) { delete next[key]; return next }
      const current = (prev[key] as string[] | undefined) ?? []
      const remaining = current.filter(v => v !== value)
      if (remaining.length === 0) { delete next[key]; return next }
      return { ...next, [key]: remaining as CustomerFilters[K] }
    })
  }
  function toggleTag(t: string) { setActiveTags(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]) }
  function clearAll() { setFilters({}); setActiveTags([]); setSearch("") }

  const viewLabel = mockCustomers.segments().flatMap(s => s.items ?? []).find(i => i.id === activeSegment)?.label ?? "Customers"
  const labelParts = viewLabel.split(" ")
  const labelLast = labelParts[labelParts.length - 1]
  const labelRest = labelParts.slice(0, -1).join(" ")

  return (
    <div style={{ display: "flex", height: "calc(100vh - 120px)", margin: "-24px -24px" }}>
      <SegmentRail
        activeSegment={activeSegment} onSegmentChange={setActiveSegment}
        activeTags={activeTags} onTagToggle={toggleTag}
      />

      <section style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        {/* Header */}
        <div style={{ padding: "18px 20px 14px", borderBottom: "1px solid var(--ih-line)" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
            <div>
              <div className="ih-eyebrow" style={{ marginBottom: 6 }}>Customer book · CRM · <span style={{ color: "var(--ih-accent)" }}>★ Demo data</span></div>
              <h1 className="ih-serif" style={{ fontSize: 26, margin: 0 }}>
                {labelRest}{labelRest && " "}
                <span className="ih-italic-red">{labelLast}</span>
              </h1>
              <div style={{ fontSize: 12, color: "var(--ih-ink-50)", marginTop: 4 }}>
                {rows.length} customer{rows.length !== 1 ? "s" : ""} · {stats.openInvoices} open invoice{stats.openInvoices !== 1 ? "s" : ""} · last refreshed 2s ago
              </div>
            </div>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <Popover width={240} trigger={
                <button className="ih-btn ih-btn-quiet ih-btn-sm">
                  <Icon name="filter" size={11} /> {activeFilterCount ? `${activeFilterCount} filter${activeFilterCount !== 1 ? "s" : ""}` : "Filter"}
                </button>
              }>{() => (
                <>
                  <PopoverHeader>Status</PopoverHeader>
                  {(Object.keys(STATUS_META) as CustomerStatus[]).map(s => {
                    const active = filters.status?.includes(s) ?? false
                    return <PopoverItem key={s} active={active} onClick={() => active ? removeFilter("status", s) : addFilter("status", s)}>{STATUS_META[s].label}</PopoverItem>
                  })}
                  <PopoverHeader>Industry</PopoverHeader>
                  {mockCustomers.allIndustries().map(i => {
                    const active = filters.industry?.includes(i) ?? false
                    return <PopoverItem key={i} active={active} onClick={() => active ? removeFilter("industry", i) : addFilter("industry", i)}>{i}</PopoverItem>
                  })}
                  <PopoverHeader>State</PopoverHeader>
                  <PopoverItem active={!!filters.hasOpenInvoices} onClick={() => filters.hasOpenInvoices ? removeFilter("hasOpenInvoices") : addFilter("hasOpenInvoices", "true")}>Open invoices</PopoverItem>
                  <PopoverItem active={!!filters.highValue} onClick={() => filters.highValue ? removeFilter("highValue") : addFilter("highValue", "true")}>High value (£30k+)</PopoverItem>
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
                  {(["lastActivity", "lifetimeValue", "name", "since", "engagements"] as CustomerSortBy[]).map(s => (
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
                <button onClick={() => setView("grid")} className="ih-btn ih-btn-sm"
                  style={{ height: 22, background: view === "grid" ? "var(--ih-surface-2)" : "transparent", border: 0, color: view === "grid" ? "var(--ih-ink)" : "var(--ih-ink-50)" }}>
                  <Icon name="grid" size={11} /> Cards
                </button>
              </div>
              <button className="ih-btn ih-btn-accent ih-btn-sm" onClick={() => { setToast({ message: "New customer · draft started", tone: "ok" }); router.push("/platform/customers/cust-nw") }}>
                <Icon name="plus" size={11} /> Add
              </button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div style={{ padding: "14px 20px", display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 1, background: "var(--ih-line)", borderBottom: "1px solid var(--ih-line)" }}>
          {[
            { label: "Total customers",  value: String(rows.length),                                       sub: `of ${total} total`,            tone: "var(--ih-ink)" },
            { label: "Active",           value: String(stats.active),                                      sub: "with engagements",             tone: "var(--ih-ok)" },
            { label: "Lifetime value",   value: `£${(stats.lifetimeValue / 1000).toFixed(0)}K`,            sub: "sum across rows",              tone: "var(--ih-ink)" },
            { label: "Avg LTV",          value: stats.avgLifetimeValue ? `£${(stats.avgLifetimeValue / 1000).toFixed(1)}k` : "—", sub: "per customer", tone: "var(--ih-ink)" },
            { label: "New this quarter", value: String(stats.newThisQuarter),                              sub: stats.newThisQuarter ? "fresh signups" : "none yet", tone: stats.newThisQuarter ? "var(--ih-accent)" : "var(--ih-ink-50)" },
          ].map((s) => (
            <div key={s.label} style={{ background: "var(--ih-bg)", padding: "12px 16px" }}>
              <div className="ih-eyebrow" style={{ fontSize: 9, marginBottom: 4 }}>{s.label}</div>
              <div className="ih-serif ih-num" style={{ fontSize: 26, lineHeight: 1, color: s.tone }}>{s.value}</div>
              <div className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)", marginTop: 6 }}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Search + chips */}
        <div style={{ padding: "10px 20px", display: "flex", gap: 8, alignItems: "center", borderBottom: "1px solid var(--ih-line)", flexWrap: "wrap" }}>
          <div style={{ position: "relative", flex: 1, maxWidth: 320, minWidth: 220 }}>
            <Icon name="search" size={13} style={{ position: "absolute", left: 10, top: 8, color: "var(--ih-ink-40)" }} />
            <input className="ih-input" placeholder="Search customers, contacts, tags…"
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
                  {visibleColumns.includes("customer")     && <th style={TH_STYLE} onClick={() => { setSortBy("name"); setSortDir(d => d === "asc" ? "desc" : "asc") }}>Customer {sortBy === "name" && (sortDir === "desc" ? "↓" : "↑")}</th>}
                  {visibleColumns.includes("status")       && <th style={TH_STYLE}>Status</th>}
                  {visibleColumns.includes("industry")     && <th style={TH_STYLE}>Industry</th>}
                  {visibleColumns.includes("engagements")  && <th style={TH_STYLE} onClick={() => { setSortBy("engagements"); setSortDir(d => d === "asc" ? "desc" : "asc") }}>Engagements {sortBy === "engagements" && (sortDir === "desc" ? "↓" : "↑")}</th>}
                  {visibleColumns.includes("ltv")          && <th style={TH_STYLE} onClick={() => { setSortBy("lifetimeValue"); setSortDir(d => d === "asc" ? "desc" : "asc") }}>Lifetime value {sortBy === "lifetimeValue" && (sortDir === "desc" ? "↓" : "↑")}</th>}
                  {visibleColumns.includes("lastActivity") && <th style={TH_STYLE} onClick={() => { setSortBy("lastActivity"); setSortDir(d => d === "asc" ? "desc" : "asc") }}>Last activity {sortBy === "lastActivity" && (sortDir === "desc" ? "↓" : "↑")}</th>}
                  {visibleColumns.includes("owner")        && <th style={TH_STYLE}>Owner</th>}
                  <th style={{ width: 36 }}></th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <CustomerRow key={r.id} row={r} columns={visibleColumns}
                    isSelected={r.id === selectedId}
                    onClick={() => setSelectedId(r.id)}
                    onAddFilter={addFilter}
                    onEmail={() => setEmailFor(r)}
                    onMerge={() => setMergeFor(r)}
                    onArchive={() => setArchiveFor(r)}
                  />
                ))}
                {rows.length === 0 && (
                  <tr><td colSpan={visibleColumns.length + 2} style={{ padding: 40, textAlign: "center", color: "var(--ih-ink-40)", fontSize: 12 }}>
                    No customers match these filters.{" "}
                    <button onClick={clearAll} className="ih-btn ih-btn-quiet ih-btn-sm" style={{ height: 22, marginLeft: 4 }}>Clear filters</button>
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <CardGrid rows={rows} onClick={setSelectedId} selectedId={selectedId} />
        )}

        <div style={{ padding: "8px 20px", borderTop: "1px solid var(--ih-line)", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11, color: "var(--ih-ink-50)" }}>
          <span>{rows.length} of {total} customers</span>
          <div style={{ display: "flex", gap: 4 }}>
            <button className="ih-btn ih-btn-quiet ih-btn-icon" style={{ height: 22, width: 22 }}><Icon name="chevronLeft" size={11} /></button>
            <button className="ih-btn ih-btn-quiet ih-btn-icon" style={{ height: 22, width: 22 }}><Icon name="chevronRight" size={11} /></button>
          </div>
        </div>
      </section>

      {selected && (
        <PreviewDrawer
          row={selected}
          onClose={() => setSelectedId(null)}
          onEmail={() => setEmailFor(selected)}
          onMerge={() => setMergeFor(selected)}
          onArchive={() => setArchiveFor(selected)}
          onCreateEngagement={() => { setToast({ message: `Engagement draft created for ${selected.name}`, tone: "ok" }); router.push("/platform/clients/new") }}
          onSchedule={() => setToast({ message: `Schedule call with ${selected.primaryContact.name}`, tone: "info" })}
        />
      )}

      {/* Email dialog */}
      {emailFor && (
        <EmailDraftDialog
          open
          onClose={() => setEmailFor(null)}
          to={emailFor.primaryContact.email}
          subject={`Re: ${emailFor.recentActivity[0]?.text ?? "Catching up"}`}
          body={`Hi ${emailFor.primaryContact.name.split(" ")[0]},\n\n`}
          onSend={() => { setToast({ message: `Email sent to ${emailFor.primaryContact.name}`, tone: "ok" }); setEmailFor(null) }}
        />
      )}

      {/* Merge popover (overlay style — use simple confirm) */}
      {mergeFor && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9990, background: "rgba(14,16,19,0.3)" }} onClick={() => setMergeFor(null)}>
          <div className="animate-pop-in" onClick={e => e.stopPropagation()} style={{
            position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", zIndex: 9991,
            width: 320, background: "var(--ih-surface)", border: "1px solid var(--ih-line)",
            borderRadius: "var(--ih-r-md)", boxShadow: "0 16px 48px rgba(0,0,0,0.12)", padding: 4,
          }}>
            <MergePicker row={mergeFor} onPick={(target) => { setConfirmMerge({ source: mergeFor, target }); setMergeFor(null) }} />
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!confirmMerge}
        title={confirmMerge ? `Merge ${confirmMerge.source.name} into ${confirmMerge.target.name}?` : ""}
        description="All engagements, bookings, invoices, and notes will move to the target customer. The source record will be archived."
        confirmLabel="Merge"
        onConfirm={() => {
          if (!confirmMerge) return
          setToast({ message: `Merged ${confirmMerge.source.name} → ${confirmMerge.target.name}`, tone: "ok" })
          setConfirmMerge(null)
        }}
        onCancel={() => setConfirmMerge(null)}
      />

      <ConfirmDialog
        open={!!archiveFor}
        title={archiveFor ? `Archive ${archiveFor.name}?` : ""}
        description="The customer will be hidden from lists but retained for audit. You can restore later from settings."
        confirmLabel="Archive"
        onConfirm={() => {
          if (!archiveFor) return
          setToast({ message: `Archived ${archiveFor.name}`, tone: "warn" })
          setArchiveFor(null)
        }}
        onCancel={() => setArchiveFor(null)}
      />

      {toast && <NotificationToast message={toast.message} tone={toast.tone} onDismiss={() => setToast(null)} />}
    </div>
  )
}
