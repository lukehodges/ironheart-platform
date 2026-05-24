"use client"

import { api } from "@/lib/trpc/react"
import Link from "next/link"
import { CheckCircle2, Clock, AlertCircle, Calendar, FileText } from "lucide-react"

// formStatus enum: PENDING | COMPLETED | EXPIRED | CANCELLED
// A node with formSendId set means a form was dispatched; status starts PENDING.
const FORM_STATUS_DISPLAY: Record<
  string,
  { label: string; tone: "ok" | "warn" | "muted" }
> = {
  PENDING: { label: "Awaiting response", tone: "warn" },
  COMPLETED: { label: "Completed", tone: "ok" },
  EXPIRED: { label: "Expired", tone: "muted" },
  CANCELLED: { label: "Cancelled", tone: "muted" },
}

export function AuditProgressView({
  engagementId,
  engagementTitle,
  stage,
}: {
  engagementId: string
  engagementTitle: string
  stage: string
}) {
  const progressQuery = api.onboarding.clientGetAuditProgress.useQuery({
    engagementId,
  })

  if (progressQuery.isLoading) {
    return (
      <div style={{ padding: 32, fontSize: 13, color: "var(--ih-ink-50)" }}>
        Loading audit progress…
      </div>
    )
  }

  if (progressQuery.error) {
    return (
      <div style={{ padding: 32, background: "var(--ih-bg)" }}>
        <h1 className="ih-serif" style={{ fontSize: 26, marginBottom: 8, color: "var(--ih-ink)" }}>
          Cannot load audit
        </h1>
        <p style={{ fontSize: 13, color: "var(--ih-ink-50)" }}>
          {progressQuery.error.message}
        </p>
      </div>
    )
  }

  const progress = progressQuery.data
  const nodes = progress?.chartNodes ?? []
  const upcoming = progress?.upcomingSessions ?? []
  const activity = progress?.activity ?? []

  const nodesWithSend = nodes.filter((n) => n.formSendId)
  const totalSends = nodesWithSend.length
  const completed = nodesWithSend.filter((n) => n.formStatus === "COMPLETED").length
  const pct = totalSends > 0 ? Math.round((completed / totalSends) * 100) : 0

  return (
    <div style={{ padding: 32, maxWidth: 880, display: "flex", flexDirection: "column", gap: 32, background: "var(--ih-bg)" }}>
      {/* Header */}
      <div>
        <p className="ih-eyebrow" style={{ marginBottom: 6 }}>Audit progress</p>
        <h1 className="ih-serif" style={{ fontSize: 32, margin: "0 0 8px", color: "var(--ih-ink)" }}>
          {engagementTitle}
        </h1>
        <p style={{ fontSize: 13, color: "var(--ih-ink-50)", lineHeight: 1.5 }}>
          Track form completion and upcoming sessions. Findings are released
          after your audit report is published.
        </p>
      </div>

      {/* Top stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
        <StatCard label="Forms sent" value={totalSends.toString()} />
        <StatCard label="Completed" value={`${completed} / ${totalSends}`} />
        <StatCard label="Progress" value={`${pct}%`} />
      </div>

      {/* Forms checklist */}
      <section>
        <h2 className="ih-serif" style={{ fontSize: 20, margin: "0 0 12px", color: "var(--ih-ink)" }}>
          Form checklist
        </h2>
        {nodesWithSend.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--ih-ink-50)", fontStyle: "italic" }}>
            No forms sent yet. Your consultant will send invitations once the org chart is approved.{" "}
            <Link href="./onboarding" style={{ color: "var(--ih-accent)", textDecoration: "underline" }}>
              View org chart →
            </Link>
          </p>
        ) : (
          <div
            style={{
              border: "1px solid var(--ih-line)",
              borderRadius: 8,
              overflow: "hidden",
              background: "var(--ih-surface)",
            }}
          >
            {nodesWithSend.map((node, i) => (
              <div key={node.nodeId} style={{ borderTop: i > 0 ? "1px solid var(--ih-line)" : "none" }}>
                <FormRow node={node} />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Upcoming sessions */}
      <section>
        <h2 className="ih-serif" style={{ fontSize: 20, margin: "0 0 12px", color: "var(--ih-ink)" }}>
          Upcoming sessions
        </h2>
        {upcoming.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--ih-ink-50)", fontStyle: "italic" }}>
            No upcoming sessions scheduled.
          </p>
        ) : (
          <div
            style={{
              border: "1px solid var(--ih-line)",
              borderRadius: 8,
              overflow: "hidden",
              background: "var(--ih-surface)",
            }}
          >
            {upcoming.map((s, i) => (
              <div
                key={s.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: 12,
                  borderTop: i > 0 ? "1px solid var(--ih-line)" : "none",
                }}
              >
                <Calendar size={16} style={{ color: "var(--ih-ink-40)", flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 500, color: "var(--ih-ink)", margin: 0 }}>{s.title}</p>
                  <p className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-50)", marginTop: 2 }}>
                    {new Date(s.startsAt).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Activity feed */}
      <section>
        <h2 className="ih-serif" style={{ fontSize: 20, margin: "0 0 12px", color: "var(--ih-ink)" }}>
          Recent activity
        </h2>
        {activity.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--ih-ink-50)", fontStyle: "italic" }}>
            No activity yet.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {activity.slice(0, 10).map((row) => (
              <div key={row.id} style={{ fontSize: 11, display: "flex", alignItems: "flex-start", gap: 8 }}>
                <span
                  style={{
                    display: "inline-block",
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    marginTop: 3,
                    flexShrink: 0,
                    background:
                      row.actorType === "CONSULTANT"
                        ? "var(--ih-info)"
                        : row.actorType === "CLIENT"
                          ? "var(--ih-warn)"
                          : "var(--ih-ink-40)",
                  }}
                />
                <div style={{ flex: 1 }}>
                  <p style={{ color: "var(--ih-ink-65)", margin: 0, lineHeight: 1.4 }}>
                    <span style={{ fontWeight: 500, color: "var(--ih-ink)" }}>{row.actorName}</span> ·{" "}
                    {row.message}
                  </p>
                  <p className="ih-mono" style={{ fontSize: 9, color: "var(--ih-ink-40)", marginTop: 2 }}>
                    {new Date(row.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Locked findings strip */}
      <section
        style={{
          borderRadius: 8,
          border: "1px dashed var(--ih-line)",
          background: "var(--ih-surface-2)",
          padding: 24,
          textAlign: "center",
        }}
      >
        <FileText size={24} style={{ margin: "0 auto 8px", color: "var(--ih-ink-30)" }} />
        <h3 className="ih-serif" style={{ fontSize: 18, margin: "0 0 6px", color: "var(--ih-ink)" }}>
          Findings locked
        </h3>
        <p style={{ fontSize: 13, color: "var(--ih-ink-50)", margin: 0 }}>
          Your audit report — including RAG scores, findings, and
          recommendations — will appear here once your consultant publishes it.
        </p>
      </section>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="ih-card" style={{ padding: 16 }}>
      <p className="ih-eyebrow" style={{ marginBottom: 6 }}>{label}</p>
      <p className="ih-serif" style={{ fontSize: 32, margin: 0, color: "var(--ih-ink)" }}>{value}</p>
    </div>
  )
}

function FormRow({
  node,
}: {
  node: {
    nodeId: string
    label: string
    formStatus: string | null
    formCompletedAt: Date | null
    contactName: string | null
    contactEmail: string | null
  }
}) {
  const status = node.formStatus ?? "PENDING"
  const display = FORM_STATUS_DISPLAY[status] ?? FORM_STATUS_DISPLAY.PENDING
  const Icon =
    status === "COMPLETED"
      ? CheckCircle2
      : status === "PENDING"
        ? Clock
        : AlertCircle
  const iconColor =
    display.tone === "ok"
      ? "var(--ih-ok)"
      : display.tone === "warn"
        ? "var(--ih-warn)"
        : "var(--ih-ink-40)"

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: 12 }}>
      <Icon size={16} style={{ color: iconColor, flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: 13, fontWeight: 500, color: "var(--ih-ink)", margin: 0 }}>
          {node.contactName ?? node.label}
        </p>
        <p style={{ fontSize: 11, color: "var(--ih-ink-50)", margin: 0 }}>
          {node.contactEmail ?? "—"}
        </p>
      </div>
      <span style={{ fontSize: 11, color: iconColor }}>{display.label}</span>
      {node.formCompletedAt && (
        <span className="ih-mono" style={{ fontSize: 9, color: "var(--ih-ink-40)" }}>
          {new Date(node.formCompletedAt).toLocaleDateString()}
        </span>
      )}
    </div>
  )
}
