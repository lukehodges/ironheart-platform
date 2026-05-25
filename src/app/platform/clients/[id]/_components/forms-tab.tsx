"use client"

import Link from "next/link"
import { Icon } from "@/components/shell"
import { api } from "@/lib/trpc/react"

interface FormsTabProps {
  engagementId: string
}

const STATUS_ORDER = ["COMPLETED", "PENDING", "SENT", "EXPIRED"] as const
const STATUS_TONE: Record<string, string> = {
  COMPLETED: "ok",
  PENDING: "warn",
  SENT: "info",
  EXPIRED: "danger",
}
const STATUS_LABEL: Record<string, string> = {
  COMPLETED: "Completed",
  PENDING: "In Progress",
  SENT: "Sent",
  EXPIRED: "Expired",
}

function formatDate(d: Date | string | null | undefined): string {
  if (!d) return "—"
  const dt = typeof d === "string" ? new Date(d) : d
  return dt.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

/** Forms tab on the engagement hub.
 *  Live via api.forms.listResponses scoped to engagementId (Slice 2).
 *  Stats: Sent | In Progress | Completed | Avg time.
 *  Rows grouped visually by status (Completed → In Progress → Pending). */
export function FormsTab({ engagementId }: FormsTabProps) {
  const responsesQuery = api.forms.listResponses.useQuery({
    engagementId,
    limit: 50,
  })

  const templatesQuery = api.forms.listTemplates.useQuery({
    engagementId,
    limit: 200,
  })

  const rows = responsesQuery.data?.rows ?? []
  const templates = templatesQuery.data?.rows ?? []
  const templateById = new Map(templates.map((t) => [t.id, t]))

  // Stats — counters
  const completedRows = rows.filter((r) => r.status === "COMPLETED")
  const pendingRows = rows.filter((r) => r.status === "PENDING")
  const sentTotal = rows.length

  // Avg time — best-effort: createdAt → completedAt for COMPLETED rows
  let avgLabel = "—"
  const durations: number[] = []
  for (const r of completedRows) {
    if (r.completedAt && r.createdAt) {
      const start = new Date(r.createdAt).getTime()
      const end = new Date(r.completedAt).getTime()
      if (end > start) durations.push(end - start)
    }
  }
  if (durations.length > 0) {
    const avgMs = durations.reduce((a, b) => a + b, 0) / durations.length
    const mins = Math.round(avgMs / 60000)
    if (mins < 60) avgLabel = `${mins}m`
    else if (mins < 60 * 24) avgLabel = `${Math.round(mins / 60)}h`
    else avgLabel = `${Math.round(mins / (60 * 24))}d`
  }

  const stats = [
    { l: "Sent", v: String(sentTotal) },
    { l: "In Progress", v: String(pendingRows.length) },
    { l: "Completed", v: String(completedRows.length) },
    { l: "Avg time", v: avgLabel },
  ]

  // Group rows by status using the explicit order; unknown statuses tail.
  const grouped: Array<{ status: string; rows: typeof rows }> = []
  for (const status of STATUS_ORDER) {
    const group = rows.filter((r) => r.status === status)
    if (group.length > 0) grouped.push({ status, rows: group })
  }

  const isLoading = responsesQuery.isLoading
  const isEmpty = !isLoading && rows.length === 0

  return (
    <div>
      {/* Section header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 16 }}>
        <div>
          <div className="ih-eyebrow">Forms</div>
          <h3 style={{ margin: "2px 0 0", fontSize: 15, fontWeight: 600 }}>Questionnaire submissions</h3>
        </div>
        <Link
          href={`/platform/clients/${engagementId}/onboarding`}
          className="ih-btn ih-btn-quiet ih-btn-sm"
          style={{ textDecoration: "none" }}
        >
          Open onboarding <Icon name="arrowUpRight" size={11} />
        </Link>
      </div>

      {/* Stat strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 18 }}>
        {stats.map((s) => (
          <div key={s.l} className="ih-card" style={{ padding: "12px 14px" }}>
            <div className="ih-eyebrow" style={{ marginBottom: 4 }}>{s.l}</div>
            <div className="ih-serif" style={{ fontSize: 24, lineHeight: 1, color: "var(--ih-ink)" }}>{s.v}</div>
          </div>
        ))}
      </div>

      {/* Table card */}
      <div className="ih-card" style={{ overflow: "hidden" }}>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--ih-line)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span className="ih-eyebrow">Submissions</span>
          <span className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-50)" }}>{rows.length} total</span>
        </div>

        {isLoading && (
          <div style={{ padding: 24, textAlign: "center", fontSize: 12, color: "var(--ih-ink-50)" }}>
            Loading…
          </div>
        )}

        {isEmpty && (
          <div style={{ padding: "32px 24px", textAlign: "center" }}>
            <Icon name="file" size={24} style={{ color: "var(--ih-ink-30)", marginBottom: 8 }} />
            <div style={{ fontSize: 13, color: "var(--ih-ink-65)", marginBottom: 4 }}>
              No questionnaires sent yet.
            </div>
            <div style={{ fontSize: 12, color: "var(--ih-ink-50)" }}>
              Approve the org chart plan to send.
            </div>
          </div>
        )}

        {!isLoading && !isEmpty && (
          <div>
            {/* Header row */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1.4fr 1.6fr 0.9fr 1.1fr 0.6fr",
                gap: 12,
                padding: "10px 18px",
                borderBottom: "1px solid var(--ih-line)",
                background: "var(--ih-surface-2)",
              }}
            >
              {["Contact", "Template", "Status", "Submitted", "Action"].map((h) => (
                <span key={h} className="ih-eyebrow" style={{ fontSize: 9 }}>{h}</span>
              ))}
            </div>

            {grouped.map((group, gi) => (
              <div key={group.status}>
                {/* Group header */}
                <div
                  style={{
                    padding: "8px 18px",
                    background: "var(--ih-bg)",
                    borderTop: gi === 0 ? "0" : "1px solid var(--ih-line)",
                    borderBottom: "1px solid var(--ih-line)",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <span className={`ih-dot ih-dot-${STATUS_TONE[group.status] ?? "muted"}`} />
                  <span className="ih-eyebrow" style={{ fontSize: 9 }}>
                    {STATUS_LABEL[group.status] ?? group.status} · {group.rows.length}
                  </span>
                </div>

                {group.rows.map((r, ri) => {
                  const tpl = templateById.get(r.templateId)
                  const submitted = r.status === "COMPLETED" ? r.completedAt : r.createdAt
                  return (
                    <div
                      key={r.id}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1.4fr 1.6fr 0.9fr 1.1fr 0.6fr",
                        gap: 12,
                        padding: "12px 18px",
                        borderTop: ri === 0 ? "0" : "1px solid var(--ih-line)",
                        alignItems: "center",
                      }}
                    >
                      <span style={{ fontSize: 13 }}>
                        {r.customerName?.trim() || "—"}
                      </span>
                      <span style={{ fontSize: 13 }}>{tpl?.name ?? "—"}</span>
                      <span>
                        <span className={`ih-pill ih-pill-${STATUS_TONE[r.status] ?? "muted"}`}>
                          <span className={`ih-dot ih-dot-${STATUS_TONE[r.status] ?? "muted"}`} />
                          {STATUS_LABEL[r.status] ?? r.status}
                        </span>
                      </span>
                      <span className="ih-mono" style={{ fontSize: 11, color: "var(--ih-ink-65)" }}>
                        {formatDate(submitted)}
                      </span>
                      <span>
                        {r.status === "COMPLETED" ? (
                          <Link
                            href={`/platform/forms/submissions/${r.id}`}
                            className="ih-btn ih-btn-quiet ih-btn-sm"
                            style={{ textDecoration: "none" }}
                          >
                            View <Icon name="arrowUpRight" size={10} />
                          </Link>
                        ) : (
                          <span className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)" }}>—</span>
                        )}
                      </span>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
