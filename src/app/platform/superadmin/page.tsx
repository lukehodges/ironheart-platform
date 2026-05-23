"use client"

/* Platform-admin dashboard — renders inside `/platform` layout (sidebar + topbar).
   Mocked tenants/MRR/modules data via `@/lib/mock/platform`. */

import { useState, useMemo, useRef, useEffect } from "react"
import Link from "next/link"
import { Icon } from "@/components/shell"
import {
  NotificationToast,
  type ToastTone,
  ConfirmDialog,
  EmailDraftDialog,
  InlineFormRow,
} from "@/components/shared"
import {
  mockPlatform,
  PLAN_LABEL,
  STATUS_LABEL,
  type Tenant,
  type TenantFilters,
  type TenantSortBy,
  type TenantSortDir,
  type TenantPlan,
  type TenantStatus,
  type TenantHealthTone,
} from "@/lib/mock/platform"

/* topbar height — drawer top offset (matches --ih-topbar-h: 48px) */
const TOPBAR_H = 48

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

/* ── Helpers ─────────────────────────────────────────────────────────────── */

function toneColor(t: TenantHealthTone): string {
  if (t === "warn") return "var(--ih-warn)"
  if (t === "danger") return "var(--ih-danger)"
  if (t === "info") return "var(--ih-info)"
  if (t === "ok") return "var(--ih-ok)"
  return "var(--ih-ink-50)"
}

function toneSoft(t: TenantHealthTone): string {
  if (t === "warn") return "var(--ih-warn-soft)"
  if (t === "danger") return "var(--ih-danger-soft)"
  if (t === "info") return "var(--ih-info-soft)"
  if (t === "ok") return "var(--ih-ok-soft)"
  return "var(--ih-surface-2)"
}

/* ── Filter chips ────────────────────────────────────────────────────────── */

function FilterChips({
  filters, search,
  onRemoveFilter, onClearSearch, onClearAll,
}: {
  filters: TenantFilters
  search: string
  onRemoveFilter: (k: keyof TenantFilters, v?: string) => void
  onClearSearch: () => void
  onClearAll: () => void
}) {
  const chips: React.ReactNode[] = []
  filters.plan?.forEach(p => chips.push(
    <span key={`plan-${p}`} className="ih-pill" onClick={() => onRemoveFilter("plan", p)}
      style={{ background: "var(--ih-accent-soft)", color: "var(--ih-accent)", borderColor: "transparent", cursor: "pointer" }}>
      Plan: {PLAN_LABEL[p]} <Icon name="x" size={9} />
    </span>
  ))
  filters.status?.forEach(s => chips.push(
    <span key={`status-${s}`} className="ih-pill" onClick={() => onRemoveFilter("status", s)} style={{ cursor: "pointer" }}>
      Status: {STATUS_LABEL[s]} <Icon name="x" size={9} />
    </span>
  ))
  filters.module?.forEach(m => chips.push(
    <span key={`mod-${m}`} className="ih-pill" onClick={() => onRemoveFilter("module", m)} style={{ cursor: "pointer" }}>
      Module: {m} <Icon name="x" size={9} />
    </span>
  ))
  filters.tag?.forEach(t => chips.push(
    <span key={`tag-${t}`} className="ih-pill" onClick={() => onRemoveFilter("tag", t)}
      style={{ background: "var(--ih-accent-soft)", color: "var(--ih-accent)", borderColor: "transparent", cursor: "pointer" }}>
      #{t} <Icon name="x" size={9} />
    </span>
  ))
  filters.health?.forEach(h => chips.push(
    <span key={`hl-${h}`} className="ih-pill" onClick={() => onRemoveFilter("health", h)} style={{ cursor: "pointer" }}>
      Health: {h} <Icon name="x" size={9} />
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

/* ── Row 3-dot menu ──────────────────────────────────────────────────────── */

function RowActionMenu({
  row, onOpen, onAdjustModules, onToggleStatus, onSendInvoice, onArchive,
}: {
  row: Tenant
  onOpen: () => void
  onAdjustModules: () => void
  onToggleStatus: () => void
  onSendInvoice: () => void
  onArchive: () => void
}) {
  const isSuspended = row.status === "SUSPENDED"
  return (
    <Popover align="right" width={200} trigger={
      <button className="ih-btn ih-btn-quiet ih-btn-icon" style={{ height: 22, width: 22 }} onClick={e => e.stopPropagation()}>
        <Icon name="moreH" size={12} />
      </button>
    }>
      {(close) => (
        <>
          <PopoverItem onClick={() => { onOpen(); close() }}>Open tenant</PopoverItem>
          <PopoverItem onClick={() => { onAdjustModules(); close() }}>Adjust modules</PopoverItem>
          <div style={{ height: 1, background: "var(--ih-line)", margin: "4px 0" }} />
          <PopoverItem onClick={() => { onToggleStatus(); close() }}>{isSuspended ? "Resume tenant" : "Suspend tenant"}</PopoverItem>
          <PopoverItem onClick={() => { onSendInvoice(); close() }}>Send invoice</PopoverItem>
          <div style={{ height: 1, background: "var(--ih-line)", margin: "4px 0" }} />
          <PopoverItem danger onClick={() => { onArchive(); close() }}>Archive tenant</PopoverItem>
        </>
      )}
    </Popover>
  )
}

/* ── Slide-in drawer ─────────────────────────────────────────────────────── */

function TenantDrawer({
  row, onClose, onAdjustModules, onSuspend, onResume, onArchive, onSendInvoice, statusOverride,
}: {
  row: Tenant
  onClose: () => void
  onAdjustModules: () => void
  onSuspend: () => void
  onResume: () => void
  onArchive: () => void
  onSendInvoice: () => void
  statusOverride: TenantStatus | null
}) {
  const status = statusOverride ?? row.status
  const isSuspended = status === "SUSPENDED"
  const titleWords = row.name.split(" ")
  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{
        position: "fixed", top: TOPBAR_H, right: 0, bottom: 0, left: 0, zIndex: 40,
        background: "rgba(14,16,19,0.18)", cursor: "pointer",
      }} />
      <aside key={row.id} className="animate-slide-in-right" style={{
        position: "fixed", top: TOPBAR_H, right: 0, bottom: 0, width: 420, zIndex: 50,
        borderLeft: "1px solid var(--ih-line)", background: "var(--ih-surface-2)",
        boxShadow: "-12px 0 32px rgba(0,0,0,0.12)",
        display: "flex", flexDirection: "column",
      }}>
      <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--ih-line)", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div className="ih-avatar ih-avatar-lg" style={{ background: "var(--ih-surface)", color: "var(--ih-ink)", fontFamily: "var(--ih-font-serif)", fontStyle: "italic", fontSize: 16 }}>
            {row.initials}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{row.name}</div>
            <div style={{ display: "flex", gap: 4, marginTop: 4, alignItems: "center" }}>
              <span className="ih-pill ih-mono" style={{ fontSize: 9, padding: "2px 6px" }}>{row.planLabel}</span>
              <span className={`ih-pill ih-pill-${status === "ACTIVE" ? "ok" : status === "TRIAL" ? "info" : status === "SUSPENDED" ? "warn" : "muted"}`} style={{ fontSize: 9, padding: "2px 6px" }}>
                {STATUS_LABEL[status]}
              </span>
            </div>
          </div>
        </div>
        <button className="ih-btn ih-btn-quiet ih-btn-icon" style={{ height: 24, width: 24 }} onClick={onClose} title="Close">
          <Icon name="x" size={12} />
        </button>
      </div>

      <div className="scrollbar-thin" style={{ flex: 1, overflowY: "auto", padding: 16 }}>
        <div className="ih-serif" style={{ fontSize: 22, lineHeight: 1.15, marginBottom: 6 }}>
          {titleWords.slice(0, -1).join(" ")}{titleWords.length > 1 ? " " : ""}
          <span className="ih-italic-red">{titleWords.slice(-1)[0]}</span>
        </div>
        <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
          <span className="ih-pill" style={{ fontSize: 9, padding: "2px 6px" }}>{row.region}</span>
          {row.tags.map(t => <span key={t} className="ih-pill" style={{ fontSize: 9, padding: "2px 6px", textTransform: "lowercase" }}>#{t}</span>)}
        </div>

        {/* Stat row (4 cells) */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 1, background: "var(--ih-line)", border: "1px solid var(--ih-line)", borderRadius: "var(--ih-r-md)", overflow: "hidden", marginBottom: 16 }}>
          {[
            { label: "MRR",    value: `$${row.mrr}`, tone: "var(--ih-ink)" },
            { label: "Seats",  value: String(row.seats), tone: "var(--ih-ink)" },
            { label: "Health", value: row.healthGrade, tone: toneColor(row.healthTone) },
            { label: "Since",  value: row.since.split(" ")[0], tone: "var(--ih-ink-65)" },
          ].map(s => (
            <div key={s.label} style={{ background: "var(--ih-surface)", padding: "10px 12px" }}>
              <div className="ih-eyebrow" style={{ fontSize: 8, marginBottom: 4 }}>{s.label}</div>
              <div className="ih-serif ih-num" style={{ fontSize: 20, color: s.tone, lineHeight: 1 }}>{s.value}</div>
            </div>
          ))}
        </div>

        <div className="ih-eyebrow" style={{ marginBottom: 8 }}>Modules enabled · {row.modulesEnabledCount}</div>
        <div className="ih-card" style={{ padding: 12, marginBottom: 16 }}>
          {row.modules.map((m, i) => (
            <div key={m.slug} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
              padding: "6px 0", borderTop: i === 0 ? 0 : "1px dashed var(--ih-line)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span className={`ih-dot ih-dot-${m.enabled ? "ok" : "muted"}`} />
                <span style={{ fontSize: 12 }}>{m.name}</span>
              </div>
              <span className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)" }}>{m.enabled ? "on" : "off"}</span>
            </div>
          ))}
        </div>

        <div className="ih-eyebrow" style={{ marginBottom: 8 }}>Recent activity</div>
        {[
          { date: row.lastSeen, text: "Owner signed in", tone: "ok" as const },
          { date: "Yesterday", text: `Invoice ${row.mrr ? "issued · $" + row.mrr : "skipped (trial)"}`, tone: "info" as const },
          { date: "Mon", text: `${row.seats} seats reported`, tone: "muted" as const },
          { date: "Fri", text: `Module adoption recalculated`, tone: "muted" as const },
        ].map((it, i) => (
          <div key={i} style={{ display: "flex", gap: 10, padding: "7px 0", borderBottom: "1px dashed var(--ih-line)" }}>
            <span className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)", width: 70, flexShrink: 0 }}>{it.date}</span>
            <span className={`ih-dot ih-dot-${it.tone}`} style={{ marginTop: 5, flexShrink: 0 }} />
            <span style={{ fontSize: 11.5, color: "var(--ih-ink-65)", lineHeight: 1.45 }}>{it.text}</span>
          </div>
        ))}

        <div className="ih-eyebrow" style={{ marginTop: 16, marginBottom: 8 }}>Current subscription</div>
        <div className="ih-card" style={{ padding: 12, marginBottom: 16 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12 }}>
            {[
              ["Plan",       row.planLabel],
              ["MRR",        `$${row.mrr}`],
              ["Seats",      String(row.seats)],
              ["Status",     STATUS_LABEL[status]],
              ["Started",    row.since],
              ["Region",     row.region],
            ].map(([k, v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <span style={{ color: "var(--ih-ink-50)" }}>{k}</span>
                <span style={{ color: "var(--ih-ink)", textAlign: "right", fontFamily: k === "MRR" || k === "Seats" ? "var(--ih-font-mono)" : undefined }}>{v}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="ih-eyebrow" style={{ marginBottom: 8 }}>Billing contact</div>
        <div className="ih-card" style={{ padding: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <div className="ih-avatar" style={{ width: 28, height: 28, fontSize: 11 }}>{row.owner.initials}</div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12.5, fontWeight: 500 }}>{row.owner.name}</div>
              <div className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-50)" }}>{row.owner.email}</div>
            </div>
          </div>
          <div style={{ fontSize: 11, color: "var(--ih-ink-65)", display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "var(--ih-ink-50)" }}>Billing email</span>
            <span className="ih-mono">{row.billingEmail}</span>
          </div>
        </div>
      </div>

      <div style={{ borderTop: "1px solid var(--ih-line)", padding: 12, display: "flex", flexDirection: "column", gap: 6, background: "var(--ih-surface)" }}>
        <Link href={`/platform/tenants/${row.id}`} className="ih-btn ih-btn-accent" style={{ width: "100%", textDecoration: "none", justifyContent: "center" }}>
          <Icon name="arrowUpRight" size={12} /> Open tenant settings
        </Link>
        <div style={{ display: "flex", gap: 6 }}>
          <button className="ih-btn ih-btn-ghost ih-btn-sm" style={{ flex: 1 }} onClick={onAdjustModules}><Icon name="sliders" size={11} /> Modules</button>
          {isSuspended
            ? <button className="ih-btn ih-btn-ghost ih-btn-sm" style={{ flex: 1 }} onClick={onResume}><Icon name="play" size={11} /> Resume</button>
            : <button className="ih-btn ih-btn-ghost ih-btn-sm" style={{ flex: 1 }} onClick={onSuspend}><Icon name="pause" size={11} /> Suspend</button>}
          <button className="ih-btn ih-btn-ghost ih-btn-sm" style={{ flex: 1 }} onClick={onSendInvoice}><Icon name="mail" size={11} /> Invoice</button>
        </div>
        <button className="ih-btn ih-btn-quiet ih-btn-sm" style={{ width: "100%", justifyContent: "center", color: "var(--ih-danger)" }} onClick={onArchive}>Archive tenant</button>
      </div>
    </aside>
    </>
  )
}

/* ── Card view ───────────────────────────────────────────────────────────── */

function TenantCard({ row, onClick }: { row: Tenant; onClick: () => void }) {
  const ring = row.activityScore
  return (
    <div onClick={onClick} className="ih-card" style={{ padding: 16, cursor: "pointer", display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", minWidth: 0 }}>
          <div className="ih-avatar" style={{ width: 30, height: 30, fontSize: 11 }}>{row.initials}</div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{row.name}</div>
            <div className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-50)" }}>{row.planLabel}</div>
          </div>
        </div>
        <div style={{ position: "relative", width: 36, height: 36, flexShrink: 0 }} title={`Health ${row.healthGrade}`}>
          <svg width="36" height="36" viewBox="0 0 36 36">
            <circle cx="18" cy="18" r="15" fill="none" stroke="var(--ih-surface-3)" strokeWidth="3"/>
            <circle cx="18" cy="18" r="15" fill="none" stroke={toneColor(row.healthTone)} strokeWidth="3"
              strokeDasharray={`${(ring/100)*94.25} 94.25`} strokeLinecap="round" transform="rotate(-90 18 18)"/>
          </svg>
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--ih-font-serif)", fontSize: 11 }}>{row.healthGrade}</div>
        </div>
      </div>
      <div className="ih-serif" style={{ fontSize: 26, lineHeight: 1 }}>
        ${row.mrr}<span className="ih-italic-red" style={{ fontSize: 14, marginLeft: 4 }}>/mo</span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--ih-ink-50)" }}>
        <span><span className="ih-num" style={{ color: "var(--ih-ink)" }}>{row.seats}</span> seats</span>
        <span><span className="ih-num" style={{ color: "var(--ih-ink)" }}>{row.modulesEnabledCount}</span> modules</span>
        <span className="ih-mono">{row.lastSeen}</span>
      </div>
    </div>
  )
}

/* ── Main ────────────────────────────────────────────────────────────────── */

export default function PlatformSuperadminPage() {
  const [view, setView] = useState<"table" | "cards">("table")
  const [segment, setSegment] = useState("all")
  const [search, setSearch] = useState("")
  const [filters, setFilters] = useState<TenantFilters>({})
  const [sortBy, setSortBy] = useState<TenantSortBy>("lastSeen")
  const [sortDir, setSortDir] = useState<TenantSortDir>("desc")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [adjustModulesFor, setAdjustModulesFor] = useState<Tenant | null>(null)
  const [emailFor, setEmailFor] = useState<Tenant | null>(null)
  const [archiveFor, setArchiveFor] = useState<Tenant | null>(null)
  const [statusOverrides, setStatusOverrides] = useState<Record<string, TenantStatus>>({})
  const [toast, setToast] = useState<{ message: string; tone: ToastTone } | null>(null)

  const rows = useMemo(
    () => mockPlatform.tenants({ segment, search, filters, sortBy, sortDir }),
    [segment, search, filters, sortBy, sortDir]
  )
  const stats = useMemo(() => mockPlatform.stats(rows), [rows])
  const modules = mockPlatform.modules()
  const revenue = mockPlatform.revenue()
  const healthFlags = mockPlatform.healthFlags()
  const segments = mockPlatform.segments()
  const allTags = mockPlatform.allTags()
  const selected = selectedId ? rows.find(r => r.id === selectedId) ?? mockPlatform.getTenant(selectedId) : null

  function addFilter<K extends keyof TenantFilters>(key: K, value: string) {
    setFilters(prev => {
      const current = (prev[key] as string[] | undefined) ?? []
      if (current.includes(value)) return prev
      return { ...prev, [key]: [...current, value] as TenantFilters[K] }
    })
  }
  function removeFilter<K extends keyof TenantFilters>(key: K, value?: string) {
    setFilters(prev => {
      const next = { ...prev }
      if (value === undefined) { delete next[key]; return next }
      const current = (prev[key] as string[] | undefined) ?? []
      const remaining = current.filter(v => v !== value)
      if (remaining.length === 0) { delete next[key]; return next }
      return { ...next, [key]: remaining as TenantFilters[K] }
    })
  }
  function clearAll() { setFilters({}); setSearch("") }

  function toggleStatus(t: Tenant) {
    const current = statusOverrides[t.id] ?? t.status
    const next: TenantStatus = current === "SUSPENDED" ? "ACTIVE" : "SUSPENDED"
    setStatusOverrides(p => ({ ...p, [t.id]: next }))
    setToast({ message: next === "SUSPENDED" ? `Suspended ${t.name}` : `Resumed ${t.name}`, tone: next === "SUSPENDED" ? "warn" : "ok" })
  }

  const activeFilterCount =
    (filters.plan?.length ?? 0) + (filters.status?.length ?? 0)
    + (filters.module?.length ?? 0) + (filters.tag?.length ?? 0)
    + (filters.health?.length ?? 0)

  /* ── Render ────────────────────────────────────────────────────────────── */

  return (
    <div>
      {/* Header */}
      <div style={{ padding: "24px 28px 12px", borderBottom: "1px solid var(--ih-line)", display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16, flexWrap: "wrap" }}>
        <div>
          <div className="ih-eyebrow" style={{ marginBottom: 6 }}>Platform · all tenants</div>
          <h1 className="ih-serif" style={{ margin: 0, fontSize: 32 }}>
            {stats.tenantsCount} tenants. <span className="ih-italic-red">{stats.mrrLabel}</span> MRR.
          </h1>
        </div>
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          {/* View toggle */}
          <div style={{ display: "flex", border: "1px solid var(--ih-line)", borderRadius: "var(--ih-r-md)", padding: 2, gap: 2 }}>
            <button onClick={() => setView("table")} className="ih-btn ih-btn-sm"
              style={{ height: 22, background: view === "table" ? "var(--ih-surface-2)" : "transparent", border: 0, color: view === "table" ? "var(--ih-ink)" : "var(--ih-ink-50)" }}>
              <Icon name="list" size={11} /> Table
            </button>
            <button onClick={() => setView("cards")} className="ih-btn ih-btn-sm"
              style={{ height: 22, background: view === "cards" ? "var(--ih-surface-2)" : "transparent", border: 0, color: view === "cards" ? "var(--ih-ink)" : "var(--ih-ink-50)" }}>
              <Icon name="grid" size={11} /> Cards
            </button>
          </div>
          <div style={{ width: 1, height: 18, background: "var(--ih-line)" }} />
          {/* Plan popover */}
          <Popover align="right" width={200} trigger={
            <button className="ih-btn ih-btn-ghost ih-btn-sm">
              {filters.plan?.length ? `${filters.plan.length} plan${filters.plan.length !== 1 ? "s" : ""}` : "All plans"}
              <Icon name="chevronDown" size={10} />
            </button>
          }>
            {() => (
              <>
                <PopoverHeader>Plan</PopoverHeader>
                {(["trial","starter","pro","enterprise"] as TenantPlan[]).map(p => {
                  const active = filters.plan?.includes(p) ?? false
                  return <PopoverItem key={p} active={active} onClick={() => active ? removeFilter("plan", p) : addFilter("plan", p)}>{PLAN_LABEL[p]}</PopoverItem>
                })}
              </>
            )}
          </Popover>
          {/* Health popover */}
          <Popover align="right" width={180} trigger={
            <button className="ih-btn ih-btn-ghost ih-btn-sm">
              Health: {filters.health?.length ? filters.health.join(",") : "any"}
              <Icon name="chevronDown" size={10} />
            </button>
          }>
            {() => (
              <>
                <PopoverHeader>Health</PopoverHeader>
                {(["ok","info","warn","danger","muted"] as TenantHealthTone[]).map(h => {
                  const active = filters.health?.includes(h) ?? false
                  return <PopoverItem key={h} active={active} onClick={() => active ? removeFilter("health", h) : addFilter("health", h)}>{h}</PopoverItem>
                })}
              </>
            )}
          </Popover>
        </div>
      </div>

      {/* KPI row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", borderBottom: "1px solid var(--ih-line)" }}>
        {([
          ["MRR",          stats.mrrLabel,                       `+${revenue.growthPct}%`,                 "ok"],
          ["Tenants",      String(stats.tenantsCount),           `+3 mo`,                                  "ok"],
          ["Active /7d",   String(stats.activeLast7d),           `${stats.active7dPct}%`,                  "muted"],
          ["Churn /30d",   String(stats.churn30d),               `${stats.churn30dPct}%`,                  "warn"],
          ["LTV / CAC",    stats.ltvCacLabel,                    "stable",                                 "muted"],
          ["Trial → paid", `${stats.trialToPaidPct}%`,      "+4pts",                                  "ok"],
        ] as const).map((s, i) => (
          <div key={s[0]} style={{ padding: "16px 20px", borderLeft: i === 0 ? "0" : "1px solid var(--ih-line)" }}>
            <span className="ih-eyebrow">{s[0]}</span>
            <div className="ih-serif" style={{ fontSize: 24, lineHeight: 1, marginTop: 6 }}>{s[1]}</div>
            <div className="ih-mono" style={{ fontSize: 10, color: s[3] === "warn" ? "var(--ih-warn)" : s[3] === "ok" ? "var(--ih-ok)" : "var(--ih-ink-40)", marginTop: 6 }}>{s[2]}</div>
          </div>
        ))}
      </div>

      {/* Tenant area */}
      <div style={{ padding: "20px 28px" }}>
        {/* Segment tabs row */}
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14, alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {segments.map(s => (
              <button key={s.id} onClick={() => setSegment(s.id)} className={`ih-btn ${segment === s.id ? "ih-btn-ghost" : "ih-btn-quiet"} ih-btn-sm`}>{s.label}</button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <div style={{ position: "relative" }}>
              <Icon name="search" size={12} style={{ position: "absolute", left: 8, top: 7, color: "var(--ih-ink-40)" }} />
              <input className="ih-input" placeholder="Search tenants…" style={{ paddingLeft: 26, height: 28, fontSize: 12, width: 200 }}
                value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Popover align="right" width={260} trigger={
              <button className="ih-btn ih-btn-quiet ih-btn-sm">
                <Icon name="filter" size={11} /> {activeFilterCount ? `${activeFilterCount} filter${activeFilterCount !== 1 ? "s" : ""}` : "Filters"}
              </button>
            }>
              {() => (
                <>
                  <PopoverHeader>Status</PopoverHeader>
                  {(["ACTIVE","TRIAL","SUSPENDED","CHURNED"] as TenantStatus[]).map(s => {
                    const active = filters.status?.includes(s) ?? false
                    return <PopoverItem key={s} active={active} onClick={() => active ? removeFilter("status", s) : addFilter("status", s)}>{STATUS_LABEL[s]}</PopoverItem>
                  })}
                  <PopoverHeader>Module</PopoverHeader>
                  {modules.map(m => {
                    const active = filters.module?.includes(m.slug) ?? false
                    return <PopoverItem key={m.slug} active={active} onClick={() => active ? removeFilter("module", m.slug) : addFilter("module", m.slug)}>{m.name}</PopoverItem>
                  })}
                  <PopoverHeader>Tag</PopoverHeader>
                  {allTags.map(t => {
                    const active = filters.tag?.includes(t) ?? false
                    return <PopoverItem key={t} active={active} onClick={() => active ? removeFilter("tag", t) : addFilter("tag", t)}>#{t}</PopoverItem>
                  })}
                </>
              )}
            </Popover>
            <Popover align="right" width={200} trigger={
              <button className="ih-btn ih-btn-quiet ih-btn-sm"><Icon name="sliders" size={11} /> Columns</button>
            }>
              {() => (
                <>
                  <PopoverHeader>Columns</PopoverHeader>
                  <PopoverItem active onClick={() => setToast({ message: "Column config saved", tone: "ok" })}>Tenant</PopoverItem>
                  <PopoverItem active onClick={() => setToast({ message: "Column config saved", tone: "ok" })}>Plan</PopoverItem>
                  <PopoverItem active onClick={() => setToast({ message: "Column config saved", tone: "ok" })}>Users</PopoverItem>
                  <PopoverItem active onClick={() => setToast({ message: "Column config saved", tone: "ok" })}>MRR</PopoverItem>
                  <PopoverItem active onClick={() => setToast({ message: "Column config saved", tone: "ok" })}>Activity</PopoverItem>
                  <PopoverItem active onClick={() => setToast({ message: "Column config saved", tone: "ok" })}>Health</PopoverItem>
                  <PopoverItem active onClick={() => setToast({ message: "Column config saved", tone: "ok" })}>Last seen</PopoverItem>
                  <PopoverItem active onClick={() => setToast({ message: "Column config saved", tone: "ok" })}>Modules</PopoverItem>
                </>
              )}
            </Popover>
            <Popover align="right" width={200} trigger={
              <button className="ih-btn ih-btn-quiet ih-btn-sm">
                <Icon name="filter" size={11} /> Sort: {sortBy} {sortDir === "desc" ? "↓" : "↑"}
              </button>
            }>
              {() => (
                <>
                  <PopoverHeader>Sort by</PopoverHeader>
                  {(["lastSeen","mrr","name","seats","activity"] as TenantSortBy[]).map(s => (
                    <PopoverItem key={s} active={sortBy === s} onClick={() => setSortBy(s)}>{s}</PopoverItem>
                  ))}
                  <PopoverHeader>Direction</PopoverHeader>
                  <PopoverItem active={sortDir === "desc"} onClick={() => setSortDir("desc")}>Descending</PopoverItem>
                  <PopoverItem active={sortDir === "asc"} onClick={() => setSortDir("asc")}>Ascending</PopoverItem>
                </>
              )}
            </Popover>
          </div>
        </div>

        {/* Filter chips */}
        {(activeFilterCount > 0 || search.trim()) && (
          <div style={{ marginBottom: 12 }}>
            <FilterChips
              filters={filters} search={search}
              onRemoveFilter={removeFilter}
              onClearSearch={() => setSearch("")}
              onClearAll={clearAll}
            />
          </div>
        )}

        {/* Table / Cards */}
        {view === "table" ? (
          <div className="ih-card" style={{ overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: "var(--ih-surface-2)" }}>
                  {["Tenant","Plan","Users","MRR","Activity","Health","Last seen","Modules",""].map(h => (
                    <th key={h} className="ih-mono" style={{ textAlign: "left", padding: "10px 14px", fontSize: 10, color: "var(--ih-ink-50)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.1em", borderBottom: "1px solid var(--ih-line)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map(r => {
                  const status = statusOverrides[r.id] ?? r.status
                  return (
                    <tr key={r.id} onClick={() => setSelectedId(r.id)}
                      style={{
                        borderTop: "1px solid var(--ih-line)", cursor: "pointer",
                        background: r.id === selectedId ? "var(--ih-accent-soft-2)" : "transparent",
                      }}>
                      <td style={{ padding: "11px 14px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div className="ih-avatar" style={{ width: 22, height: 22, fontSize: 9 }}>{r.initials}</div>
                          <strong style={{ fontSize: 12.5, fontWeight: 500 }}>{r.name}</strong>
                          {status === "SUSPENDED" && <span className="ih-pill ih-pill-warn" style={{ fontSize: 8, padding: "1px 5px" }}>SUSPENDED</span>}
                        </div>
                      </td>
                      <td style={{ padding: "11px 14px", color: "var(--ih-ink-65)" }}>
                        <span onClick={e => { e.stopPropagation(); addFilter("plan", r.plan) }}
                          className="ih-mono ih-pill" title={`Filter by ${PLAN_LABEL[r.plan]}`}
                          style={{ fontSize: 10, padding: "2px 6px", cursor: "pointer" }}>{r.planLabel}</span>
                      </td>
                      <td style={{ padding: "11px 14px" }}><span className="ih-num">{r.seats}</span></td>
                      <td style={{ padding: "11px 14px" }}><span className="ih-num" style={{ fontWeight: 500 }}>${r.mrr}</span></td>
                      <td style={{ padding: "11px 14px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <div style={{ width: 50, height: 4, background: "var(--ih-surface-2)", borderRadius: 2, overflow: "hidden" }}>
                            <div style={{ width: `${r.activityScore}%`, height: "100%", background: toneColor(r.healthTone) }} />
                          </div>
                          <span className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-50)" }}>{r.activityScore}</span>
                        </div>
                      </td>
                      <td style={{ padding: "11px 14px" }}>
                        <span onClick={e => { e.stopPropagation(); addFilter("health", r.healthTone) }}
                          className="ih-pill" title={`Filter by health ${r.healthTone}`}
                          style={{
                            background: toneSoft(r.healthTone), color: toneColor(r.healthTone),
                            borderColor: "transparent", fontFamily: "var(--ih-font-mono)", cursor: "pointer",
                          }}>{r.healthGrade}</span>
                      </td>
                      <td style={{ padding: "11px 14px", color: "var(--ih-ink-50)" }}><span className="ih-mono" style={{ fontSize: 11 }}>{r.lastSeen}</span></td>
                      <td style={{ padding: "11px 14px", color: "var(--ih-ink-65)" }}><span className="ih-mono" style={{ fontSize: 11 }}>{r.modulesActiveLabel}</span></td>
                      <td style={{ padding: "11px 14px", textAlign: "right" }} onClick={e => e.stopPropagation()}>
                        <RowActionMenu
                          row={r}
                          onOpen={() => setSelectedId(r.id)}
                          onAdjustModules={() => setAdjustModulesFor(r)}
                          onToggleStatus={() => toggleStatus(r)}
                          onSendInvoice={() => setEmailFor(r)}
                          onArchive={() => setArchiveFor(r)}
                        />
                      </td>
                    </tr>
                  )
                })}
                {rows.length === 0 && (
                  <tr><td colSpan={9} style={{ padding: 40, textAlign: "center", color: "var(--ih-ink-40)", fontSize: 12 }}>
                    No tenants match these filters.{" "}
                    <button onClick={clearAll} className="ih-btn ih-btn-quiet ih-btn-sm" style={{ height: 22, marginLeft: 4 }}>Clear filters</button>
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
            {rows.map(r => <TenantCard key={r.id} row={r} onClick={() => setSelectedId(r.id)} />)}
            {rows.length === 0 && (
              <div style={{ gridColumn: "1 / -1", padding: 40, textAlign: "center", color: "var(--ih-ink-40)", fontSize: 12 }}>
                No tenants match these filters.{" "}
                <button onClick={clearAll} className="ih-btn ih-btn-quiet ih-btn-sm" style={{ height: 22, marginLeft: 4 }}>Clear filters</button>
              </div>
            )}
          </div>
        )}

        {/* Module adoption + health flags */}
        <div style={{ marginTop: 20, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div className="ih-card">
            <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--ih-line)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span className="ih-eyebrow">Module adoption · last 30d</span>
              <span className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)" }}>{modules.length} modules</span>
            </div>
            <div style={{ padding: 18 }}>
              {modules.map(m => {
                const active = filters.module?.includes(m.slug) ?? false
                const barColor = m.adoptionTone === "ok" ? "var(--ih-ok)" : m.adoptionTone === "warn" ? "var(--ih-warn)" : m.adoptionTone === "accent" ? "var(--ih-accent)" : m.adoptionTone === "info" ? "var(--ih-info)" : "var(--ih-ink-30)"
                return (
                  <div key={m.slug} onClick={() => active ? removeFilter("module", m.slug) : addFilter("module", m.slug)}
                    style={{ marginBottom: 10, cursor: "pointer", padding: 4, borderRadius: "var(--ih-r-sm)", background: active ? "var(--ih-accent-soft)" : "transparent" }}
                    title={active ? `Remove module filter: ${m.name}` : `Filter to tenants with ${m.name}`}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 4 }}>
                      <span>{m.name}</span>
                      <span className="ih-mono" style={{ color: "var(--ih-ink-40)" }}>{m.adoptionPct}%</span>
                    </div>
                    <div style={{ height: 5, background: "var(--ih-surface-2)", borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ width: `${m.adoptionPct}%`, height: "100%", background: barColor }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="ih-card">
            <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--ih-line)" }}>
              <span className="ih-eyebrow">Health flags · {healthFlags.length}</span>
            </div>
            {healthFlags.map((f, i) => (
              <div key={f.tenantId} style={{ padding: "12px 18px", borderTop: i === 0 ? "0" : "1px solid var(--ih-line)", display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 12, alignItems: "center" }}>
                <span className={`ih-dot ih-dot-${f.tone}`} />
                <div>
                  <div style={{ fontSize: 12, fontWeight: 500 }}>{f.tenantName}</div>
                  <div className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)" }}>{f.reason}</div>
                </div>
                <button className="ih-btn ih-btn-quiet ih-btn-sm" onClick={() => setSelectedId(f.tenantId)}>Open →</button>
              </div>
            ))}
          </div>
        </div>

        {/* Revenue + plan breakdown */}
        <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div className="ih-card">
            <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--ih-line)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span className="ih-eyebrow">Revenue · last 12 mo</span>
              <span className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ok)" }}>+{revenue.growthPct}%</span>
            </div>
            <div style={{ padding: 18 }}>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 100, marginBottom: 10 }}>
                {revenue.series.map(p => {
                  const max = Math.max(...revenue.series.map(x => x.mrr))
                  const h = (p.mrr / max) * 100
                  return (
                    <div key={p.month} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                      <div style={{ width: "100%", height: `${h}%`, background: "var(--ih-accent)", borderRadius: 2 }} title={`${p.month}: $${p.mrr.toLocaleString()}`} />
                      <span className="ih-mono" style={{ fontSize: 9, color: "var(--ih-ink-40)" }}>{p.month}</span>
                    </div>
                  )
                })}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 1, background: "var(--ih-line)", border: "1px solid var(--ih-line)", borderRadius: "var(--ih-r-md)", overflow: "hidden" }}>
                {[
                  { label: "MRR", value: `$${(revenue.mrr / 1000).toFixed(1)}k` },
                  { label: "ARR", value: `$${(revenue.arr / 1000).toFixed(0)}k` },
                  { label: "Churn", value: `${revenue.churnPct}%` },
                ].map(s => (
                  <div key={s.label} style={{ background: "var(--ih-surface)", padding: "8px 10px" }}>
                    <div className="ih-eyebrow" style={{ fontSize: 8, marginBottom: 3 }}>{s.label}</div>
                    <div className="ih-serif ih-num" style={{ fontSize: 16, lineHeight: 1 }}>{s.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="ih-card">
            <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--ih-line)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span className="ih-eyebrow">Revenue by plan</span>
              <Link href="/platform/subscriptions" className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-50)", textDecoration: "none" }}>
                All subs →
              </Link>
            </div>
            <div style={{ padding: 18 }}>
              {revenue.byPlan.map(p => {
                const maxMrr = Math.max(...revenue.byPlan.map(x => x.mrr || 1))
                const active = filters.plan?.includes(p.plan) ?? false
                return (
                  <div key={p.plan} onClick={() => active ? removeFilter("plan", p.plan) : addFilter("plan", p.plan)}
                    style={{ marginBottom: 12, cursor: "pointer", padding: 4, borderRadius: "var(--ih-r-sm)", background: active ? "var(--ih-accent-soft)" : "transparent" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: 12 }}>{p.label}</span>
                      <span>
                        <span className="ih-num" style={{ fontSize: 12, fontWeight: 500 }}>${p.mrr}</span>
                        <span className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)", marginLeft: 6 }}>{p.count} tenant{p.count !== 1 ? "s" : ""}</span>
                      </span>
                    </div>
                    <div style={{ height: 5, background: "var(--ih-surface-2)", borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ width: `${(p.mrr / maxMrr) * 100}%`, height: "100%", background: p.plan === "enterprise" ? "var(--ih-accent)" : p.plan === "pro" ? "var(--ih-info)" : p.plan === "starter" ? "var(--ih-ok)" : "var(--ih-ink-30)" }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Drawer */}
      {selected && (
        <TenantDrawer
          row={selected}
          statusOverride={statusOverrides[selected.id] ?? null}
          onClose={() => setSelectedId(null)}
          onAdjustModules={() => setAdjustModulesFor(selected)}
          onSuspend={() => toggleStatus(selected)}
          onResume={() => toggleStatus(selected)}
          onArchive={() => setArchiveFor(selected)}
          onSendInvoice={() => setEmailFor(selected)}
        />
      )}

      {/* Adjust modules inline form */}
      {adjustModulesFor && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9990, background: "rgba(14,16,19,0.3)" }} onClick={() => setAdjustModulesFor(null)}>
          <div className="animate-pop-in" onClick={e => e.stopPropagation()} style={{
            position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", zIndex: 9991,
            width: 480, background: "var(--ih-surface)", border: "1px solid var(--ih-line)",
            borderRadius: "var(--ih-r-md)", boxShadow: "0 16px 48px rgba(0,0,0,0.12)", padding: 16,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div className="ih-eyebrow">Adjust modules · {adjustModulesFor.name}</div>
              <button className="ih-btn ih-btn-quiet ih-btn-sm" onClick={() => setAdjustModulesFor(null)}><Icon name="x" size={11} /></button>
            </div>
            <InlineFormRow
              fields={[
                { key: "module", label: "Module", type: "select", options: modules.map(m => ({ label: m.name, value: m.slug })) },
                { key: "action", label: "Action", type: "select", options: [{ label: "Enable", value: "enable" }, { label: "Disable", value: "disable" }] },
              ]}
              onSave={(vals) => {
                const modName = modules.find(m => m.slug === vals.module)?.name ?? vals.module
                setToast({ message: `${vals.action === "enable" ? "Enabled" : "Disabled"} ${modName} for ${adjustModulesFor.name}`, tone: "ok" })
                setAdjustModulesFor(null)
              }}
              onCancel={() => setAdjustModulesFor(null)}
            />
          </div>
        </div>
      )}

      {/* Email dialog */}
      {emailFor && (
        <EmailDraftDialog
          open
          onClose={() => setEmailFor(null)}
          to={emailFor.billingEmail}
          subject={`Invoice · ${emailFor.name} · ${emailFor.planLabel}`}
          body={`Hi ${emailFor.owner.name.split(" ")[0]},\n\nPlease find attached your invoice for ${emailFor.name} (${emailFor.planLabel}, ${emailFor.seats} seats).\n\nAmount due: $${emailFor.mrr}\n\nThanks,\nPlatform billing`}
          onSend={() => { setToast({ message: `Invoice sent to ${emailFor.name}`, tone: "ok" }); setEmailFor(null) }}
        />
      )}

      {/* Archive confirm */}
      <ConfirmDialog
        open={!!archiveFor}
        title={archiveFor ? `Archive ${archiveFor.name}?` : ""}
        description="The tenant will be hidden from lists but retained for audit. Subscriptions cancel at period end. You can restore later from settings."
        confirmLabel="Archive"
        confirmTone="danger"
        onConfirm={() => {
          if (!archiveFor) return
          setToast({ message: `Archived ${archiveFor.name}`, tone: "warn" })
          setArchiveFor(null)
          setSelectedId(null)
        }}
        onCancel={() => setArchiveFor(null)}
      />

      {toast && <NotificationToast message={toast.message} tone={toast.tone} onDismiss={() => setToast(null)} />}
    </div>
  )
}
