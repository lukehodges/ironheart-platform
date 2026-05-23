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
    return <div className="p-8">Loading audit progress…</div>
  }

  if (progressQuery.error) {
    return (
      <div className="p-8">
        <h1 className="font-serif text-2xl mb-2">Cannot load audit</h1>
        <p className="text-sm text-muted-foreground">
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
    <div className="p-8 max-w-5xl space-y-8">
      {/* Header */}
      <div>
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          Audit progress
        </p>
        <h1 className="font-serif text-3xl mt-1">{engagementTitle}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Track form completion and upcoming sessions. Findings are released
          after your audit report is published.
        </p>
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Forms sent" value={totalSends.toString()} />
        <StatCard label="Completed" value={`${completed} / ${totalSends}`} />
        <StatCard label="Progress" value={`${pct}%`} />
      </div>

      {/* Forms checklist */}
      <section>
        <h2 className="font-serif text-xl mb-3">Form checklist</h2>
        {nodesWithSend.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">
            No forms sent yet. Your consultant will send invitations once the
            org chart is approved.{" "}
            <Link href="./onboarding" className="text-primary underline">
              View org chart →
            </Link>
          </p>
        ) : (
          <div className="border border-border rounded-md divide-y divide-border">
            {nodesWithSend.map((node) => (
              <FormRow key={node.nodeId} node={node} />
            ))}
          </div>
        )}
      </section>

      {/* Upcoming sessions */}
      <section>
        <h2 className="font-serif text-xl mb-3">Upcoming sessions</h2>
        {upcoming.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">
            No upcoming sessions scheduled.
          </p>
        ) : (
          <div className="border border-border rounded-md divide-y divide-border">
            {upcoming.map((s) => (
              <div key={s.id} className="flex items-center gap-3 p-3">
                <Calendar size={16} className="text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-sm font-medium">{s.title}</p>
                  <p className="text-xs text-muted-foreground">
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
        <h2 className="font-serif text-xl mb-3">Recent activity</h2>
        {activity.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">
            No activity yet.
          </p>
        ) : (
          <div className="space-y-2">
            {activity.slice(0, 10).map((row) => (
              <div key={row.id} className="text-xs flex items-start gap-2">
                <span
                  className={`inline-block w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${
                    row.actorType === "CONSULTANT"
                      ? "bg-blue-500"
                      : row.actorType === "CLIENT"
                        ? "bg-amber-500"
                        : "bg-gray-400"
                  }`}
                />
                <div className="flex-1">
                  <p className="text-foreground/80">
                    <span className="font-medium">{row.actorName}</span> ·{" "}
                    {row.message}
                  </p>
                  <p className="text-[10px] text-muted-foreground font-mono">
                    {new Date(row.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Locked findings strip */}
      <section className="rounded-md border border-dashed border-border bg-muted/30 p-6 text-center">
        <FileText size={24} className="mx-auto text-muted-foreground/50 mb-2" />
        <h3 className="font-serif text-lg">Findings locked</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Your audit report — including RAG scores, findings, and
          recommendations — will appear here once your consultant publishes it.
        </p>
      </section>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-border rounded-md p-4">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="font-serif text-3xl mt-1">{value}</p>
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
      ? "text-emerald-600"
      : display.tone === "warn"
        ? "text-amber-600"
        : "text-muted-foreground"

  return (
    <div className="flex items-center gap-3 p-3">
      <Icon size={16} className={iconColor} />
      <div className="flex-1">
        <p className="text-sm font-medium">
          {node.contactName ?? node.label}
        </p>
        <p className="text-xs text-muted-foreground">
          {node.contactEmail ?? "—"}
        </p>
      </div>
      <span className={`text-xs ${iconColor}`}>{display.label}</span>
      {node.formCompletedAt && (
        <span className="text-[10px] text-muted-foreground font-mono">
          {new Date(node.formCompletedAt).toLocaleDateString()}
        </span>
      )}
    </div>
  )
}
