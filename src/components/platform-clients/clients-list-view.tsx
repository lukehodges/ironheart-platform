"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { api } from "@/lib/trpc/react"
import { Icon } from "@/components/shell"
import { SegmentRail } from "@/components/shared/segment-rail"
import { EmptyState } from "@/components/shared/empty-state"
import type { SegmentRailGroup } from "@/components/shared/segment-rail"

/* ── Types ───────────────────────────────────────────────────────────────── */

type EngagementStage =
  | "DISCOVERY" | "PROPOSAL" | "CONTRACTED" | "ONBOARDING"
  | "AUDITING" | "REPORTING" | "IMPLEMENTING" | "RETAINER"
  | "CLOSED_WON" | "CLOSED_LOST"

interface PlatformRow {
  engagement: {
    id: string
    title: string
    type: "PROJECT" | "RETAINER" | "HYBRID"
    status: string
    stage: EngagementStage | null
    qualificationData: unknown
    createdAt: Date
    updatedAt: Date
    discoveryNotes: string | null
  }
  customer: {
    id: string
    firstName: string
    lastName: string
    email: string | null
    phone: string | null
    notes: string | null
  }
}

/* ── Stage metadata ──────────────────────────────────────────────────────── */

const STAGE_ORDER: EngagementStage[] = [
  "DISCOVERY", "PROPOSAL", "CONTRACTED", "ONBOARDING",
  "AUDITING", "REPORTING", "IMPLEMENTING", "RETAINER",
  "CLOSED_WON", "CLOSED_LOST",
]

const STAGE_META: Record<EngagementStage, { label: string; tone: string; idx: number }> = {
  DISCOVERY:    { label: "Discovery",    tone: "info",    idx: 0 },
  PROPOSAL:     { label: "Proposal",     tone: "accent",  idx: 1 },
  CONTRACTED:   { label: "Contracted",   tone: "ok",      idx: 2 },
  ONBOARDING:   { label: "Onboarding",   tone: "ok",      idx: 3 },
  AUDITING:     { label: "Auditing",     tone: "warn",    idx: 4 },
  REPORTING:    { label: "Reporting",    tone: "warn",    idx: 5 },
  IMPLEMENTING: { label: "Implementing", tone: "accent",  idx: 6 },
  RETAINER:     { label: "Retainer",     tone: "ok",      idx: 7 },
  CLOSED_WON:   { label: "Won",          tone: "ok",      idx: 8 },
  CLOSED_LOST:  { label: "Lost",         tone: "danger",  idx: 9 },
}

const TYPE_LABEL: Record<string, string> = {
  PROJECT: "Project",
  RETAINER: "Retainer",
  HYBRID: "Hybrid",
}

/* ── Helpers ─────────────────────────────────────────────────────────────── */

function companyName(row: PlatformRow): string {
  return row.customer.notes?.trim() || `${row.customer.firstName} ${row.customer.lastName}`
}

function customerInitials(row: PlatformRow): string {
  const name = companyName(row)
  const words = name.split(/\s+/).filter(Boolean)
  if (words.length === 1) return (words[0]![0] ?? "?").toUpperCase()
  return ((words[0]![0] ?? "") + (words[1]![0] ?? "")).toUpperCase()
}

function relativeDate(d: Date | string): string {
  const ms = Date.now() - new Date(d).getTime()
  const days = Math.floor(ms / 86_400_000)
  if (days === 0) return "today"
  if (days === 1) return "yesterday"
  if (days < 7) return `${days}d ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  if (days < 365) return `${Math.floor(days / 30)}mo ago`
  return `${Math.floor(days / 365)}y ago`
}

/* ── TH style ────────────────────────────────────────────────────────────── */

const TH: React.CSSProperties = {
  textAlign: "left", padding: "10px 10px", fontWeight: 500, fontSize: 10,
  color: "var(--ih-ink-40)", textTransform: "uppercase", letterSpacing: "0.12em",
  fontFamily: "var(--ih-font-mono)",
}

/* ── Stage progress bar ──────────────────────────────────────────────────── */

function StageBar({ stage }: { stage: EngagementStage | null }) {
  if (!stage) return <span style={{ color: "var(--ih-ink-30)" }}>—</span>
  const s = STAGE_META[stage]
  return (
    <div style={{ display: "inline-flex", flexDirection: "column", gap: 3, minWidth: 92 }}>
      <span className={`ih-pill ${s.tone !== "muted" ? `ih-pill-${s.tone}` : ""}`}
        style={{ fontSize: 9, padding: "2px 6px", alignSelf: "flex-start" }}>
        {s.label}
      </span>
      <div style={{ display: "flex", gap: 2, height: 3 }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} style={{
            flex: 1, height: 3, borderRadius: 1,
            background: i < s.idx ? "var(--ih-ink)" : i === s.idx ? "var(--ih-accent)" : "var(--ih-surface-3)",
          }} />
        ))}
      </div>
    </div>
  )
}

/* ── Preview drawer ──────────────────────────────────────────────────────── */

function PreviewDrawer({ row, onClose }: { row: PlatformRow; onClose: () => void }) {
  const qual = row.engagement.qualificationData as Record<string, unknown> | null
  const company = companyName(row)
  const initials = customerInitials(row)
  const stage = row.engagement.stage
  const stageMeta = stage ? STAGE_META[stage] : null

  return (
    <aside key={row.engagement.id} className="animate-slide-in-right" style={{
      width: 360, borderLeft: "1px solid var(--ih-line)", background: "var(--ih-surface-2)",
      display: "flex", flexDirection: "column", flexShrink: 0,
    }}>
      <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--ih-line)", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div className="ih-avatar ih-avatar-lg" style={{ background: "var(--ih-surface)", color: "var(--ih-ink)", fontFamily: "var(--ih-font-serif)", fontStyle: "italic", fontSize: 16 }}>
            {initials}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{company}</div>
            <div className="ih-eyebrow" style={{ fontSize: 9, marginTop: 2 }}>
              {row.customer.firstName} {row.customer.lastName} · {relativeDate(row.engagement.updatedAt)}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          <Link href={`/platform/clients/${row.engagement.id}`} className="ih-btn ih-btn-quiet ih-btn-icon" style={{ height: 24, width: 24, textDecoration: "none" }} title="Open client hub">
            <Icon name="arrowUpRight" size={12} />
          </Link>
          <button className="ih-btn ih-btn-quiet ih-btn-icon" style={{ height: 24, width: 24 }} onClick={onClose} title="Close">
            <Icon name="x" size={12} />
          </button>
        </div>
      </div>

      <div className="scrollbar-thin" style={{ flex: 1, overflowY: "auto", padding: 16 }}>
        <div className="ih-serif" style={{ fontSize: 22, lineHeight: 1.15, marginBottom: 6 }}>
          {row.engagement.title.split(" ").slice(0, -1).join(" ")}{" "}
          <span className="ih-italic-red">{row.engagement.title.split(" ").slice(-1)[0]}</span>
        </div>
        <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
          <span className="ih-pill" style={{ fontSize: 9, padding: "2px 6px" }}>{TYPE_LABEL[row.engagement.type] ?? row.engagement.type}</span>
          <span className={`ih-pill ih-pill-${row.engagement.status === "PAUSED" ? "warn" : row.engagement.status === "ACTIVE" ? "ok" : "info"}`} style={{ fontSize: 9, padding: "2px 6px" }}>
            {row.engagement.status[0]}{row.engagement.status.slice(1).toLowerCase()}
          </span>
          {stageMeta && (
            <span className={`ih-pill ih-pill-${stageMeta.tone}`} style={{ fontSize: 9, padding: "2px 6px" }}>
              {stageMeta.label}
            </span>
          )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, background: "var(--ih-line)", border: "1px solid var(--ih-line)", borderRadius: "var(--ih-r-md)", overflow: "hidden", marginBottom: 16 }}>
          {[
            { label: "Type",       value: TYPE_LABEL[row.engagement.type] ?? row.engagement.type },
            { label: "Last update", value: relativeDate(row.engagement.updatedAt) },
          ].map((s) => (
            <div key={s.label} style={{ background: "var(--ih-surface)", padding: "10px 12px" }}>
              <div className="ih-eyebrow" style={{ fontSize: 8, marginBottom: 4 }}>{s.label}</div>
              <div className="ih-serif ih-num" style={{ fontSize: 18, color: "var(--ih-ink)", lineHeight: 1 }}>{s.value}</div>
            </div>
          ))}
        </div>

        {qual && typeof qual === "object" && (qual.revenue || qual.teamSize || (Array.isArray(qual.painPoints) && qual.painPoints.length > 0)) && (
          <>
            <div className="ih-eyebrow" style={{ marginBottom: 8 }}>Qualification</div>
            <div className="ih-card" style={{ padding: 12, marginBottom: 16 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12 }}>
                {!!qual.revenue && <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--ih-ink-50)" }}>Revenue</span>
                  <span className="ih-mono">{String(qual.revenue as string)}</span>
                </div>}
                {!!qual.teamSize && <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--ih-ink-50)" }}>Team size</span>
                  <span className="ih-mono">{String(qual.teamSize as number)}</span>
                </div>}
                {!!qual.industry && <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--ih-ink-50)" }}>Industry</span>
                  <span>{String(qual.industry as string)}</span>
                </div>}
                {Array.isArray(qual.painPoints) && qual.painPoints.length > 0 && (
                  <div>
                    <span style={{ color: "var(--ih-ink-50)", display: "block", marginBottom: 4 }}>Pain points</span>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                      {(qual.painPoints as string[]).map((p, i) => (
                        <span key={i} className="ih-pill" style={{ fontSize: 9, padding: "2px 6px", textTransform: "lowercase" }}>{p}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        <div className="ih-eyebrow" style={{ marginBottom: 8 }}>Contact</div>
        <div className="ih-card" style={{ padding: 12 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12 }}>
            {[
              ["Company", company],
              ["Contact", `${row.customer.firstName} ${row.customer.lastName}`],
              ["Email", row.customer.email ?? "—"],
              ["Phone", row.customer.phone ?? "—"],
            ].map(([k, v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <span style={{ color: "var(--ih-ink-50)" }}>{k}</span>
                <span style={{ color: "var(--ih-ink)", textAlign: "right", fontFamily: k === "Phone" ? "var(--ih-font-mono)" : undefined }}>{v}</span>
              </div>
            ))}
          </div>
        </div>

        {row.engagement.discoveryNotes && (
          <>
            <div className="ih-eyebrow" style={{ marginTop: 16, marginBottom: 8 }}>Discovery notes</div>
            <div style={{ fontSize: 12, color: "var(--ih-ink-65)", lineHeight: 1.6, background: "var(--ih-surface)", border: "1px solid var(--ih-line)", borderRadius: "var(--ih-r-md)", padding: "10px 12px" }}>
              {row.engagement.discoveryNotes}
            </div>
          </>
        )}
      </div>

      <div style={{ borderTop: "1px solid var(--ih-line)", padding: 12, display: "flex", flexDirection: "column", gap: 6, background: "var(--ih-surface)" }}>
        <Link href={`/platform/clients/${row.engagement.id}`} className="ih-btn ih-btn-accent" style={{ width: "100%", textDecoration: "none", justifyContent: "center" }}>
          <Icon name="arrowUpRight" size={12} /> Open client hub
        </Link>
      </div>
    </aside>
  )
}

/* ── Debounced search input ───────────────────────────────────────────────── */

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

/* ── Main view ───────────────────────────────────────────────────────────── */

export function ClientsListView() {
  const [activeStage, setActiveStage] = useState<EngagementStage | "all">("all")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [searchRaw, setSearchRaw] = useState("")
  const search = useDebounce(searchRaw, 300)

  const { data, isLoading, isError, refetch } = api.consulting.listForPlatform.useQuery({
    stage: activeStage === "all" ? undefined : activeStage,
    search: search.trim() || undefined,
    limit: 50,
  })

  const rows: PlatformRow[] = data?.rows ?? []
  const stageCounts: Record<string, number> = data?.stageCounts ?? {}
  const selected = selectedId ? rows.find(r => r.engagement.id === selectedId) ?? null : null

  /* ── Segment rail config ── */
  const totalCount = Object.values(stageCounts).reduce((a, b) => a + b, 0)
  const activeGroups: SegmentRailGroup[] = [
    {
      title: "View",
      items: [
        {
          label: "All clients",
          value: "all",
          count: totalCount,
          icon: "users",
          active: activeStage === "all",
        },
      ],
    },
    {
      title: "Stage",
      items: STAGE_ORDER.map((s) => ({
        label: STAGE_META[s].label,
        value: s,
        count: stageCounts[s] ?? 0,
        active: activeStage === s,
        dot: stageCounts[s]
          ? (STAGE_META[s].tone as "ok" | "warn" | "info" | "danger" | "accent" | "muted")
          : undefined,
      })),
    },
  ]

  const viewLabel = activeStage === "all"
    ? "All clients"
    : STAGE_META[activeStage].label

  return (
    <div style={{ display: "flex", height: "calc(100vh - 120px)", margin: "-24px -24px" }}>
      <SegmentRail
        groups={activeGroups}
        onChange={(v) => {
          setActiveStage(v as EngagementStage | "all")
          setSelectedId(null)
        }}
      />

      <section style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        {/* Header */}
        <div style={{ padding: "18px 20px 14px", borderBottom: "1px solid var(--ih-line)" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
            <div>
              <div className="ih-eyebrow" style={{ marginBottom: 6 }}>Platform · Clients</div>
              <h1 className="ih-serif" style={{ fontSize: 26, margin: 0 }}>
                {viewLabel.split(" ").slice(0, -1).join(" ")}{" "}
                <span className="ih-italic-red">{viewLabel.split(" ").slice(-1)[0]}</span>
              </h1>
              <div style={{ fontSize: 12, color: "var(--ih-ink-50)", marginTop: 4 }}>
                {isLoading ? "Loading…" : `${rows.length} engagement${rows.length !== 1 ? "s" : ""}`}
              </div>
            </div>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <Link href="/platform/clients/new" className="ih-btn ih-btn-accent ih-btn-sm" style={{ textDecoration: "none" }}>
                <Icon name="plus" size={12} /> New client
              </Link>
            </div>
          </div>
        </div>

        {/* Search bar */}
        <div style={{ padding: "10px 20px", display: "flex", gap: 8, alignItems: "center", borderBottom: "1px solid var(--ih-line)" }}>
          <div style={{ position: "relative", flex: 1, maxWidth: 360, minWidth: 220 }}>
            <Icon name="search" size={13} style={{ position: "absolute", left: 10, top: 8, color: "var(--ih-ink-40)" }} />
            <input
              className="ih-input"
              placeholder="Search company, contact, engagement title…"
              style={{ paddingLeft: 30 }}
              value={searchRaw}
              onChange={e => setSearchRaw(e.target.value)}
            />
          </div>
          {searchRaw.trim() && (
            <button className="ih-btn ih-btn-quiet ih-btn-sm" onClick={() => setSearchRaw("")} style={{ height: 30, fontSize: 11 }}>
              <Icon name="x" size={10} /> Clear
            </button>
          )}
        </div>

        {/* Table */}
        {isError ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12 }}>
            <span style={{ fontSize: 13, color: "var(--ih-ink-50)" }}>Failed to load engagements.</span>
            <button className="ih-btn ih-btn-ghost ih-btn-sm" onClick={() => void refetch()}>Retry</button>
          </div>
        ) : isLoading ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon name="refresh" size={16} style={{ color: "var(--ih-ink-40)", animation: "spin 1s linear infinite" }} />
          </div>
        ) : rows.length === 0 ? (
          <div style={{ flex: 1 }}>
            <EmptyState
              icon="users"
              title="No engagements"
              description={search.trim() ? `No matches for "${search}".` : activeStage !== "all" ? `No engagements in ${STAGE_META[activeStage].label}.` : "No client engagements yet. Add one to get started."}
              action={search.trim() ? { label: "Clear search", onClick: () => setSearchRaw("") } : undefined}
            />
          </div>
        ) : (
          <div className="scrollbar-thin" style={{ flex: 1, overflowY: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead style={{ position: "sticky", top: 0, background: "var(--ih-bg)", zIndex: 1 }}>
                <tr style={{ borderBottom: "1px solid var(--ih-line)" }}>
                  <th style={TH}>Client · Engagement</th>
                  <th style={TH}>Type</th>
                  <th style={TH}>Stage</th>
                  <th style={TH}>Status</th>
                  <th style={TH}>Last update</th>
                  <th style={{ width: 36 }}></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const isSelected = row.engagement.id === selectedId
                  const company = companyName(row)
                  const initials = customerInitials(row)
                  return (
                    <tr key={row.engagement.id}
                      onClick={() => setSelectedId(isSelected ? null : row.engagement.id)}
                      style={{
                        background: isSelected ? "var(--ih-accent-soft-2)" : "transparent",
                        borderTop: "1px solid var(--ih-line)", cursor: "pointer",
                      }}
                    >
                      {/* Company + engagement title */}
                      <td style={{ padding: "10px 10px" }}>
                        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                          <div className="ih-avatar" style={{ background: "var(--ih-surface-2)", color: "var(--ih-ink-65)" }}>{initials}</div>
                          <div style={{ minWidth: 0 }}>
                            <span style={{ fontWeight: 500, fontSize: 12.5 }}>{company}</span>
                            <div style={{ fontSize: 11, color: "var(--ih-ink-50)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 240 }}>
                              {row.engagement.title}
                            </div>
                          </div>
                        </div>
                      </td>
                      {/* Type */}
                      <td style={{ padding: "10px 10px" }}>
                        <span className="ih-pill" style={{ fontSize: 9, padding: "2px 6px" }}>
                          {TYPE_LABEL[row.engagement.type] ?? row.engagement.type}
                        </span>
                      </td>
                      {/* Stage */}
                      <td style={{ padding: "10px 10px" }}>
                        <StageBar stage={row.engagement.stage} />
                      </td>
                      {/* Status */}
                      <td style={{ padding: "10px 10px" }}>
                        <span className={`ih-pill ih-pill-${row.engagement.status === "ACTIVE" ? "ok" : row.engagement.status === "PAUSED" ? "warn" : row.engagement.status === "CANCELLED" ? "danger" : ""}`}
                          style={{ fontSize: 9, padding: "2px 6px" }}>
                          {row.engagement.status[0]}{row.engagement.status.slice(1).toLowerCase()}
                        </span>
                      </td>
                      {/* Last update */}
                      <td style={{ padding: "10px 10px" }} className="ih-mono">
                        <span style={{ fontSize: 11, color: "var(--ih-ink-50)" }}>{relativeDate(row.engagement.updatedAt)}</span>
                      </td>
                      {/* Open link */}
                      <td style={{ padding: "10px 14px 10px 4px" }} onClick={e => e.stopPropagation()}>
                        <Link href={`/platform/clients/${row.engagement.id}`}
                          className="ih-btn ih-btn-quiet ih-btn-icon"
                          style={{ height: 22, width: 22, textDecoration: "none" }}
                          title="Open client hub">
                          <Icon name="arrowUpRight" size={11} />
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer count */}
        <div style={{ padding: "8px 20px", borderTop: "1px solid var(--ih-line)", fontSize: 11, color: "var(--ih-ink-50)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>{rows.length} engagement{rows.length !== 1 ? "s" : ""}{data?.hasMore ? " (more available)" : ""}</span>
          {data?.hasMore && (
            <span className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-30)" }}>showing first 50</span>
          )}
        </div>
      </section>

      {selected && <PreviewDrawer row={selected} onClose={() => setSelectedId(null)} />}
    </div>
  )
}
