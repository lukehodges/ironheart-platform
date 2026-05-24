"use client"

import { useMemo, useState, useRef, useEffect } from "react"
import { Icon } from "@/components/shell"
import { mockAuditLog, type AuditLogEntry, type AuditLogFilters, type AuditTimeframe, type LogSeverity } from "@/lib/mock/audit-log"

/* ── Severity styling ─────────────────────────────────────────────────────
   Compact filled badge + matching left-edge stripe on row. Drops the dots.
   ──────────────────────────────────────────────────────────────────────── */

interface SevStyle {
  short: string
  text: string
  bg: string
  edge: string | null     /* row left-edge color; null = no edge */
}

const SEV_STYLE: Record<LogSeverity, SevStyle> = {
  DEBUG:    { short: "DBG",  text: "var(--ih-ink-50)", bg: "var(--ih-surface-3)",         edge: null },
  INFO:     { short: "INFO", text: "var(--ih-ink-65)", bg: "var(--ih-surface-2)",         edge: null },
  WARNING:  { short: "WARN", text: "#7A5712",          bg: "rgba(184,130,31,0.12)",       edge: "#B8821F" },
  ERROR:    { short: "ERR",  text: "#8B271B",          bg: "rgba(192,57,43,0.10)",        edge: "#C0392B" },
  CRITICAL: { short: "CRIT", text: "#fff",             bg: "#C0392B",                     edge: "#C0392B" },
}

const SEV_ORDER: LogSeverity[] = ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]

function SeverityBadge({ severity, large = false }: { severity: LogSeverity; large?: boolean }) {
  const s = SEV_STYLE[severity]
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      minWidth: large ? 64 : 44, padding: large ? "4px 10px" : "2px 6px",
      borderRadius: 3, fontSize: large ? 11 : 9.5, fontWeight: 600,
      letterSpacing: "0.08em", fontFamily: "var(--ih-font-mono)",
      color: s.text, background: s.bg,
    }}>
      {s.short}
    </span>
  )
}

/* ── Popover (shared) ────────────────────────────────────────────────────── */

function Popover({
  trigger, children, align = "left", width = 200,
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
function PopoverItem({ active, onClick, children }: { active?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "var(--ih-surface-2)" }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = active ? "var(--ih-accent-soft)" : "transparent" }}
      style={{
        display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "6px 10px",
        border: 0, background: active ? "var(--ih-accent-soft)" : "transparent",
        fontSize: 12, color: "var(--ih-ink)", cursor: "pointer", textAlign: "left", borderRadius: "var(--ih-r-sm)",
      }}>
      {active ? <Icon name="check" size={11} style={{ color: "var(--ih-accent)" }} /> : <span style={{ width: 11 }} />}
      {children}
    </button>
  )
}

/* ── Detail drawer ───────────────────────────────────────────────────────── */

function EventDrawer({ entry, allEntries, onClose }: { entry: AuditLogEntry; allEntries: AuditLogEntry[]; onClose: () => void }) {
  const related = allEntries.filter(e => e.id !== entry.id && (e.entity === entry.entity || e.actor.name === entry.actor.name)).slice(0, 5)

  const diffParts = entry.diff.split("→").map(p => p.trim())
  const hasTransition = diffParts.length === 2

  return (
    <aside key={entry.id} className="animate-slide-in-right" style={{
      width: 380, borderLeft: "1px solid var(--ih-line)", background: "var(--ih-surface-2)",
      display: "flex", flexDirection: "column", flexShrink: 0,
    }}>
      {/* Header */}
      <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--ih-line)", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <SeverityBadge severity={entry.severity} large />
            <span className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-50)" }}>{entry.id}</span>
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, fontFamily: "var(--ih-font-mono)", color: "var(--ih-accent)" }}>{entry.action}</div>
          <div className="ih-eyebrow" style={{ fontSize: 9, marginTop: 4 }}>{entry.when}</div>
        </div>
        <button className="ih-btn ih-btn-quiet ih-btn-icon" style={{ height: 24, width: 24 }} onClick={onClose} title="Close">
          <Icon name="x" size={12} />
        </button>
      </div>

      <div className="scrollbar-thin" style={{ flex: 1, overflowY: "auto", padding: 16 }}>
        {/* Actor */}
        <div className="ih-eyebrow" style={{ marginBottom: 6 }}>Actor</div>
        <div className="ih-card" style={{ padding: 12, marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div className="ih-avatar" style={{ width: 32, height: 32, fontSize: 11, background: "var(--ih-surface-2)", color: "var(--ih-ink)" }}>
              {entry.actor.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12.5, fontWeight: 500 }}>{entry.actor.name}</div>
              <div className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-50)" }}>{entry.actor.role}</div>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10, paddingTop: 10, borderTop: "1px dashed var(--ih-line)" }}>
            <div>
              <div className="ih-eyebrow" style={{ fontSize: 8, marginBottom: 2 }}>IP address</div>
              <div className="ih-mono" style={{ fontSize: 11 }}>{entry.ip}</div>
            </div>
            <div>
              <div className="ih-eyebrow" style={{ fontSize: 8, marginBottom: 2 }}>Source</div>
              <div className="ih-mono" style={{ fontSize: 11 }}>{entry.ip === "—" ? "internal" : "browser"}</div>
            </div>
          </div>
        </div>

        {/* Entity */}
        <div className="ih-eyebrow" style={{ marginBottom: 6 }}>Target entity</div>
        <div className="ih-card" style={{ padding: 12, marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div className="ih-mono" style={{ fontSize: 12, color: "var(--ih-ink)", marginBottom: 2 }}>{entry.entity}</div>
              <div style={{ fontSize: 10.5, color: "var(--ih-ink-50)" }}>{describeEntity(entry.entity)}</div>
            </div>
            <button className="ih-btn ih-btn-quiet ih-btn-sm" style={{ height: 22 }} title="Open entity">
              <Icon name="arrowUpRight" size={11} />
            </button>
          </div>
        </div>

        {/* Change diff */}
        <div className="ih-eyebrow" style={{ marginBottom: 6 }}>Change</div>
        {hasTransition ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 8, alignItems: "center", marginBottom: 14 }}>
            <div style={{ padding: "8px 10px", background: "var(--ih-surface)", border: "1px solid var(--ih-line)", borderRadius: "var(--ih-r-sm)", fontSize: 11, fontFamily: "var(--ih-font-mono)" }}>
              {diffParts[0]}
            </div>
            <Icon name="arrowRight" size={14} style={{ color: "var(--ih-ink-40)" }} />
            <div style={{ padding: "8px 10px", background: "var(--ih-surface)", border: "1px solid var(--ih-accent-soft-2)", borderRadius: "var(--ih-r-sm)", fontSize: 11, fontFamily: "var(--ih-font-mono)", color: "var(--ih-accent)" }}>
              {diffParts[1]}
            </div>
          </div>
        ) : (
          <div style={{ padding: "10px 12px", background: "var(--ih-surface)", border: "1px solid var(--ih-line)", borderRadius: "var(--ih-r-sm)", fontSize: 11.5, marginBottom: 14, lineHeight: 1.5 }}>
            {entry.diff}
          </div>
        )}

        {/* Related */}
        {related.length > 0 && (
          <>
            <div className="ih-eyebrow" style={{ marginBottom: 6 }}>Related events</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {related.map(r => (
                <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", border: "1px solid var(--ih-line)", borderRadius: "var(--ih-r-sm)", background: "var(--ih-surface)" }}>
                  <SeverityBadge severity={r.severity} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="ih-mono" style={{ fontSize: 10.5, color: "var(--ih-accent)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.action}</div>
                    <div style={{ fontSize: 10, color: "var(--ih-ink-50)" }}>{r.when} · {r.actor.name}</div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div style={{ borderTop: "1px solid var(--ih-line)", padding: 12, display: "flex", gap: 6, background: "var(--ih-surface)" }}>
        <button className="ih-btn ih-btn-ghost ih-btn-sm" style={{ flex: 1 }}
          onClick={() => navigator.clipboard?.writeText(entry.id)}>
          <Icon name="link" size={11} /> Copy ID
        </button>
        <button className="ih-btn ih-btn-ghost ih-btn-sm" style={{ flex: 1 }}>
          <Icon name="download" size={11} /> Export
        </button>
      </div>
    </aside>
  )
}

function describeEntity(entityId: string): string {
  const prefix = entityId.split("-")[0]
  const map: Record<string, string> = {
    ENG: "Engagement",
    AR: "Audit report",
    F: "Audit finding",
    DEL: "Deliverable",
    NW: "Invoice",
    INV: "Invoice",
    WF: "Workflow",
    USR: "User",
    AS: "Audit session",
  }
  return map[prefix] ?? "Entity"
}

/* ── Page ────────────────────────────────────────────────────────────────── */

export default function AuditSystemLogPage() {
  const [filters, setFilters] = useState<AuditLogFilters>({ severity: ["INFO", "WARNING", "ERROR", "CRITICAL"], timeframe: "24h" })
  const [search, setSearch] = useState("")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const timeframe: AuditTimeframe = filters.timeframe ?? "all"

  const rows = useMemo(() => mockAuditLog.list({ filters, search }), [filters, search])
  const totalEvents = useMemo(() => mockAuditLog.list({}).length, [])
  const stats = useMemo(() => mockAuditLog.stats(rows), [rows])
  const selected = selectedId ? rows.find(r => r.id === selectedId) ?? null : null

  function toggleSeverity(s: LogSeverity) {
    setFilters(f => {
      const cur = f.severity ?? []
      const next = cur.includes(s) ? cur.filter(x => x !== s) : [...cur, s]
      return { ...f, severity: next.length ? next : undefined }
    })
  }
  function toggleRole(r: string) {
    setFilters(f => {
      const cur = f.actorRole ?? []
      const next = cur.includes(r) ? cur.filter(x => x !== r) : [...cur, r]
      return { ...f, actorRole: next.length ? next : undefined }
    })
  }
  function toggleEntity(p: string) {
    setFilters(f => {
      const cur = f.entityPrefix ?? []
      const next = cur.includes(p) ? cur.filter(x => x !== p) : [...cur, p]
      return { ...f, entityPrefix: next.length ? next : undefined }
    })
  }
  function setTimeframe(t: AuditTimeframe) { setFilters(f => ({ ...f, timeframe: t })) }
  function clearAll() { setFilters({}); setSearch("") }

  const severityChipLabel = (() => {
    const s = filters.severity
    if (!s || s.length === 0) return "Any severity"
    if (s.length === SEV_ORDER.length) return "All severities"
    return `Severity: ${s.join(", ")}`
  })()
  const roleChipLabel = filters.actorRole?.length ? `Actors: ${filters.actorRole.join(", ")}` : "All actors"
  const entityChipLabel = filters.entityPrefix?.length ? `Entities: ${filters.entityPrefix.join(", ")}` : "All entities"
  const timeframeLabel = timeframe === "24h" ? "Last 24h" : timeframe === "7d" ? "Last 7d" : "All time"

  return (
    <div style={{ display: "flex", height: "calc(100vh - 120px)", margin: "-24px -24px" }}>
      <section style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", padding: "20px 28px", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 16 }}>
          <div>
            <div className="ih-eyebrow" style={{ marginBottom: 6 }}>System · Audit log · the other audit</div>
            <h1 className="ih-serif" style={{ fontSize: 28, margin: 0 }}>Every <span className="ih-italic-red">change</span>, recorded.</h1>
            <div style={{ fontSize: 12, color: "var(--ih-ink-50)", marginTop: 6 }}>
              The RBAC + compliance trail. Distinct from the per-engagement <strong>Audit Workspace</strong>. Retained 7 years. SOC-2 ready.
            </div>
          </div>
          <div style={{ display: "flex", gap: 18, fontSize: 11 }}>
            {[
              { l: "Events shown", v: String(stats.total),    tone: "var(--ih-ink)" },
              { l: "Warnings",     v: String(stats.warnings), tone: "#B8821F" },
              { l: "Errors",       v: String(stats.errors),   tone: "#C0392B" },
              { l: "Logins",       v: String(stats.logins),   tone: "var(--ih-ink-65)" },
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

          <Popover width={180} trigger={
            <span className="ih-pill" style={{ fontSize: 10, cursor: "pointer" }}>{severityChipLabel}</span>
          }>{() => (
            <>
              <PopoverHeader>Severity</PopoverHeader>
              {SEV_ORDER.map(s => (
                <PopoverItem key={s} active={filters.severity?.includes(s) ?? false} onClick={() => toggleSeverity(s)}>{s}</PopoverItem>
              ))}
            </>
          )}</Popover>

          <Popover width={140} trigger={
            <span className="ih-pill" style={{ fontSize: 10, cursor: "pointer" }}>{timeframeLabel}</span>
          }>{(close) => (
            <>
              <PopoverHeader>Time range</PopoverHeader>
              <PopoverItem active={timeframe === "24h"} onClick={() => { setTimeframe("24h"); close() }}>Last 24h</PopoverItem>
              <PopoverItem active={timeframe === "7d"}  onClick={() => { setTimeframe("7d");  close() }}>Last 7d</PopoverItem>
              <PopoverItem active={timeframe === "all"} onClick={() => { setTimeframe("all"); close() }}>All time</PopoverItem>
            </>
          )}</Popover>

          <Popover width={180} trigger={
            <span className="ih-pill" style={{ fontSize: 10, cursor: "pointer" }}>{roleChipLabel}</span>
          }>{() => (
            <>
              <PopoverHeader>Actor role</PopoverHeader>
              {mockAuditLog.allRoles().map(r => (
                <PopoverItem key={r} active={filters.actorRole?.includes(r) ?? false} onClick={() => toggleRole(r)}>{r}</PopoverItem>
              ))}
            </>
          )}</Popover>

          <Popover width={180} trigger={
            <span className="ih-pill" style={{ fontSize: 10, cursor: "pointer" }}>{entityChipLabel}</span>
          }>{() => (
            <>
              <PopoverHeader>Entity prefix</PopoverHeader>
              {mockAuditLog.allEntityPrefixes().map(p => (
                <PopoverItem key={p} active={filters.entityPrefix?.includes(p) ?? false} onClick={() => toggleEntity(p)}>{p}…</PopoverItem>
              ))}
            </>
          )}</Popover>

          <div style={{ position: "relative", marginLeft: 6, width: 220 }}>
            <Icon name="search" size={11} style={{ position: "absolute", left: 8, top: 6, color: "var(--ih-ink-40)" }} />
            <input className="ih-input" placeholder="Search action, entity, actor…"
              style={{ paddingLeft: 26, height: 24, fontSize: 11 }}
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>

          <button onClick={clearAll} className="ih-btn ih-btn-quiet ih-btn-sm" style={{ height: 22 }}>Clear</button>

          <div style={{ flex: 1 }} />
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10.5, color: "var(--ih-ink-50)" }}>
            <Icon name="sparkles" size={10} style={{ color: "var(--ih-accent)" }} />
            {rows.length} of {totalEvents} events
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
              {rows.map((r) => {
                const isSelected = r.id === selectedId
                const edge = SEV_STYLE[r.severity].edge
                return (
                  <tr key={r.id} onClick={() => setSelectedId(isSelected ? null : r.id)}
                    style={{
                      borderBottom: "1px solid var(--ih-line)",
                      cursor: "pointer",
                      background: isSelected ? "var(--ih-accent-soft-2)" : "transparent",
                      boxShadow: edge ? `inset 2px 0 0 ${edge}` : undefined,
                    }}
                    onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = "var(--ih-surface-2)" }}
                    onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = "transparent" }}>
                    <td style={{ padding: "9px 12px" }}>
                      <SeverityBadge severity={r.severity} />
                    </td>
                    <td style={{ padding: "9px 12px", color: "var(--ih-ink-50)" }}>{r.when}</td>
                    <td style={{ padding: "9px 12px" }}>
                      <span style={{ color: "var(--ih-ink)" }}>{r.actor.name}</span>
                      <span style={{ color: "var(--ih-ink-40)", fontSize: 9.5, marginLeft: 4 }}>· {r.actor.role}</span>
                    </td>
                    <td style={{ padding: "9px 12px", color: "var(--ih-accent)" }}>{r.action}</td>
                    <td style={{ padding: "9px 12px", color: "var(--ih-ink-65)" }}>{r.entity}</td>
                    <td style={{ padding: "9px 12px", color: "var(--ih-ink-65)", fontFamily: "var(--ih-font-sans)" }}>{r.diff}</td>
                    <td style={{ padding: "9px 12px", color: "var(--ih-ink-40)" }}>{r.ip}</td>
                  </tr>
                )
              })}
              {rows.length === 0 && (
                <tr><td colSpan={7} style={{ padding: 40, textAlign: "center", color: "var(--ih-ink-40)", fontSize: 11, fontFamily: "var(--ih-font-sans)" }}>
                  No events match these filters.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {selected && <EventDrawer entry={selected} allEntries={mockAuditLog.list({})} onClose={() => setSelectedId(null)} />}
    </div>
  )
}
