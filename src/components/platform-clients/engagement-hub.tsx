"use client"

import { useState } from "react"
import Link from "next/link"
import { api } from "@/lib/trpc/react"
import type { OrgChartTree } from "@/modules/onboarding/onboarding.types"
import {
  ArrowRight,
  Calendar,
  FileText,
  ClipboardList,
  FileBarChart,
} from "lucide-react"

// ── Constants ──────────────────────────────────────────────────────────────

const STAGES = [
  "DISCOVERY",
  "PROPOSAL",
  "CONTRACTED",
  "ONBOARDING",
  "AUDITING",
  "REPORTING",
  "IMPLEMENTING",
  "RETAINER",
  "CLOSED_WON",
] as const

const TABS = ["overview", "team", "activity", "audit", "report"] as const
type Tab = (typeof TABS)[number]

// ── Types ──────────────────────────────────────────────────────────────────

interface EngagementProps {
  id: string
  title: string
  stage: string
  type: string
  status: string
  auditWindowStart: Date | null
  auditWindowEnd: Date | null
  qualificationData: Record<string, unknown> | null
  createdAt: Date
}

interface CustomerProps {
  name: string
  email: string
  phone: string | null
  company: string
}

interface Props {
  engagementId: string
  engagement: EngagementProps
  customer: CustomerProps | null
  reportStatus: string | null
}

// ── Root component ─────────────────────────────────────────────────────────

export function EngagementHub({
  engagementId,
  engagement,
  customer,
  reportStatus,
}: Props) {
  const [tab, setTab] = useState<Tab>("overview")

  return (
    <div
      className="flex h-full flex-col"
      style={{ background: "var(--ih-bg)", color: "var(--ih-ink)" }}
    >
      <EngagementHeader
        engagement={engagement}
        customer={customer}
      />
      <StagePipeline currentStage={engagement.stage} />
      <TabBar tab={tab} onTab={setTab} />
      <div className="flex-1 overflow-y-auto">
        {tab === "overview" && (
          <OverviewTab
            engagementId={engagementId}
            engagement={engagement}
            customer={customer}
            reportStatus={reportStatus}
          />
        )}
        {tab === "team" && <TeamTab engagementId={engagementId} />}
        {tab === "activity" && <ActivityTab engagementId={engagementId} />}
        {tab === "audit" && (
          <ComingSoonTab
            title="Audit workspace"
            href={`/platform/clients/${engagementId}/audit`}
          />
        )}
        {tab === "report" && (
          <ComingSoonTab
            title="Report editor"
            href={`/platform/clients/${engagementId}/report`}
          />
        )}
      </div>
    </div>
  )
}

// ── Header ─────────────────────────────────────────────────────────────────

function EngagementHeader({
  engagement,
  customer,
}: {
  engagement: EngagementProps
  customer: CustomerProps | null
}) {
  const initials = (customer?.company ?? "C").slice(0, 2).toUpperCase()

  return (
    <div
      className="px-8 py-6 border-b"
      style={{ borderColor: "var(--ih-line)" }}
    >
      <p className="ih-eyebrow">
        Platform / Clients / {engagement.title}
      </p>
      <div className="flex items-start gap-4 mt-3">
        {/* Avatar */}
        <div
          className="w-14 h-14 rounded-md flex items-center justify-center font-serif text-xl flex-shrink-0"
          style={{
            background: "var(--ih-surface-2)",
            border: "1px solid var(--ih-line)",
          }}
        >
          {initials}
        </div>

        {/* Name + meta */}
        <div className="flex-1 min-w-0">
          <h1 className="ih-serif text-3xl">
            {customer?.company ?? "Unnamed client"}
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--ih-ink-65)" }}>
            {engagement.title} ·{" "}
            <span className="ih-mono">{engagement.type}</span>
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-2 flex-shrink-0">
          <Link
            href={`/platform/clients/${engagement.id}/onboarding`}
            className="px-3 py-1.5 text-sm rounded-md border"
            style={{ borderColor: "var(--ih-line)" }}
          >
            Org chart
          </Link>
          <Link
            href={`/platform/clients/${engagement.id}/audit`}
            className="px-3 py-1.5 text-sm rounded-md border"
            style={{ borderColor: "var(--ih-line)" }}
          >
            Audit
          </Link>
          <Link
            href={`/platform/clients/${engagement.id}/report`}
            className="px-3 py-1.5 text-sm rounded-md"
            style={{ background: "var(--ih-accent)", color: "white" }}
          >
            Report
          </Link>
        </div>
      </div>
    </div>
  )
}

// ── Stage pipeline strip ───────────────────────────────────────────────────

function StagePipeline({ currentStage }: { currentStage: string }) {
  const currentIdx = STAGES.indexOf(currentStage as (typeof STAGES)[number])

  return (
    <div
      className="px-8 py-4 border-b"
      style={{
        borderColor: "var(--ih-line)",
        background: "var(--ih-surface-2)",
      }}
    >
      <div className="flex items-center gap-1">
        {STAGES.map((s, i) => {
          const done = i < currentIdx
          const current = i === currentIdx
          return (
            <div key={s} className="flex items-center gap-1 flex-1">
              <div className="flex flex-col items-center gap-1 flex-1">
                <div
                  className="w-6 h-6 rounded-full text-[10px] font-mono flex items-center justify-center"
                  style={{
                    background: current
                      ? "var(--ih-accent)"
                      : done
                        ? "var(--ih-ok)"
                        : "var(--ih-line)",
                    color:
                      current || done ? "white" : "var(--ih-ink-50)",
                  }}
                >
                  {done ? "✓" : i + 1}
                </div>
                <p
                  className="text-[9px] ih-mono uppercase text-center leading-tight"
                  style={{
                    color: current
                      ? "var(--ih-ink)"
                      : "var(--ih-ink-50)",
                  }}
                >
                  {s.replace(/_/g, " ")}
                </p>
              </div>
              {i < STAGES.length - 1 && (
                <div
                  className="h-px flex-1 mb-4"
                  style={{
                    background: done
                      ? "var(--ih-ok)"
                      : "var(--ih-line)",
                  }}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Tab bar ────────────────────────────────────────────────────────────────

function TabBar({
  tab,
  onTab,
}: {
  tab: Tab
  onTab: (t: Tab) => void
}) {
  return (
    <div
      className="px-8 border-b flex gap-4"
      style={{ borderColor: "var(--ih-line)" }}
    >
      {TABS.map((t) => (
        <button
          key={t}
          onClick={() => onTab(t)}
          className="py-2 text-sm border-b-2 capitalize"
          style={{
            borderColor:
              tab === t ? "var(--ih-accent)" : "transparent",
            color:
              tab === t ? "var(--ih-ink)" : "var(--ih-ink-65)",
            fontWeight: tab === t ? 500 : 400,
          }}
        >
          {t}
        </button>
      ))}
    </div>
  )
}

// ── Overview tab ──────────────────────────────────────────────────────────

function OverviewTab({
  engagementId,
  engagement,
  customer,
  reportStatus,
}: {
  engagementId: string
  engagement: EngagementProps
  customer: CustomerProps | null
  reportStatus: string | null
}) {
  const chartQuery = api.onboarding.getChart.useQuery({ engagementId })
  const auditQuery = api.auditWorkspace.getOrCreate.useQuery({ engagementId })

  const nodeCount = flattenChart(chartQuery.data ?? []).length
  const findingCount = (auditQuery.data?.lenses ?? []).reduce(
    (n: number, l: { findings?: unknown[] }) =>
      n + (l.findings?.length ?? 0),
    0
  )

  return (
    <div className="p-8 grid grid-cols-3 gap-6">
      {/* Left + centre — 2/3 width */}
      <div className="col-span-2 space-y-6">
        {/* Connection map */}
        <section>
          <p className="ih-eyebrow mb-3">Quick access</p>
          <div className="grid grid-cols-2 gap-3">
            <ConnectionCard
              href={`/platform/clients/${engagementId}/onboarding`}
              icon={ClipboardList}
              label="Org chart"
              value={
                chartQuery.isLoading
                  ? "Loading…"
                  : `${nodeCount} node${nodeCount === 1 ? "" : "s"}`
              }
            />
            <ConnectionCard
              href={`/platform/clients/${engagementId}/audit`}
              icon={FileBarChart}
              label="Audit workspace"
              value={
                auditQuery.isLoading
                  ? "Loading…"
                  : `${findingCount} finding${findingCount === 1 ? "" : "s"}`
              }
            />
            <ConnectionCard
              href={`/platform/clients/${engagementId}/report`}
              icon={FileText}
              label="Audit report"
              value={reportStatus ?? "Not started"}
            />
            <ConnectionCard
              href={`/platform/bookings?engagementId=${engagementId}`}
              icon={Calendar}
              label="Sessions"
              value="View bookings"
            />
          </div>
        </section>

        {/* Qualification data */}
        {engagement.qualificationData &&
          Object.keys(engagement.qualificationData).length > 0 && (
            <section
              className="ih-card p-6"
            >
              <p className="ih-eyebrow mb-3">Discovery — qualification</p>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                {(engagement.qualificationData.teamSize as string | undefined) && (
                  <KV
                    k="Team size"
                    v={engagement.qualificationData.teamSize as string}
                  />
                )}
                {(engagement.qualificationData.revenue as string | undefined) && (
                  <KV
                    k="Revenue"
                    v={engagement.qualificationData.revenue as string}
                  />
                )}
                {(engagement.qualificationData.industry as string | undefined) && (
                  <KV
                    k="Industry"
                    v={engagement.qualificationData.industry as string}
                  />
                )}
                {typeof engagement.qualificationData.decisionMaker ===
                  "boolean" && (
                  <KV
                    k="Decision maker"
                    v={
                      engagement.qualificationData.decisionMaker
                        ? "Primary contact"
                        : "Elsewhere"
                    }
                  />
                )}
                {Array.isArray(engagement.qualificationData.painPoints) &&
                  (engagement.qualificationData.painPoints as string[])
                    .length > 0 && (
                    <div className="col-span-2 mt-2">
                      <p className="ih-eyebrow mb-1">Pain points</p>
                      <ul className="list-disc ml-4 space-y-1">
                        {(
                          engagement.qualificationData
                            .painPoints as string[]
                        ).map((p, i) => (
                          <li key={i}>{p}</li>
                        ))}
                      </ul>
                    </div>
                  )}
              </div>
            </section>
          )}
      </div>

      {/* Right rail */}
      <aside className="space-y-4">
        {customer && (
          <div className="ih-card p-4">
            <p className="ih-eyebrow mb-2">Primary contact</p>
            <p className="font-medium">{customer.name}</p>
            {customer.email && (
              <a
                className="text-sm block mt-1"
                style={{ color: "var(--ih-info)" }}
                href={`mailto:${customer.email}`}
              >
                {customer.email}
              </a>
            )}
            {customer.phone && (
              <p
                className="text-sm mt-1"
                style={{ color: "var(--ih-ink-65)" }}
              >
                {customer.phone}
              </p>
            )}
          </div>
        )}

        <div className="ih-card p-4">
          <p className="ih-eyebrow mb-2">Engagement</p>
          <KV k="Stage" v={engagement.stage} />
          <KV k="Type" v={engagement.type} />
          <KV k="Status" v={engagement.status} />
          <KV
            k="Created"
            v={new Date(engagement.createdAt).toLocaleDateString()}
          />
          {engagement.auditWindowStart && (
            <KV
              k="Audit window"
              v={`${new Date(engagement.auditWindowStart).toLocaleDateString()} → ${
                engagement.auditWindowEnd
                  ? new Date(engagement.auditWindowEnd).toLocaleDateString()
                  : "TBD"
              }`}
            />
          )}
        </div>
      </aside>
    </div>
  )
}

// ── Team tab ───────────────────────────────────────────────────────────────

function TeamTab({ engagementId }: { engagementId: string }) {
  const chartQuery = api.onboarding.getChart.useQuery({ engagementId })
  const persons = flattenPersons(chartQuery.data ?? [])

  if (chartQuery.isLoading) {
    return (
      <div className="p-8" style={{ color: "var(--ih-ink-65)" }}>
        Loading…
      </div>
    )
  }

  return (
    <div className="p-8 max-w-3xl">
      <p className="ih-eyebrow mb-3">Client contacts (from org chart)</p>
      {persons.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--ih-ink-65)" }}>
          No people in the chart yet.{" "}
          <Link
            href={`/platform/clients/${engagementId}/onboarding`}
            className="underline"
            style={{ color: "var(--ih-info)" }}
          >
            Build the org chart first.
          </Link>
        </p>
      ) : (
        <div
          className="ih-card divide-y"
          style={{ borderColor: "var(--ih-line)" }}
        >
          {persons.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-3 p-3"
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs ih-mono flex-shrink-0"
                style={{ background: "var(--ih-surface-2)" }}
              >
                {(p.contactName ?? p.label).slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">
                  {p.contactName ?? p.label}
                </p>
                <p
                  className="text-xs"
                  style={{ color: "var(--ih-ink-65)" }}
                >
                  {p.contactRole ?? "—"} ·{" "}
                  {p.contactEmail ?? "no email"}
                </p>
              </div>
              {p.interviewMode && (
                <span
                  className="ih-mono text-[10px] uppercase tracking-wide px-2 py-0.5 rounded border flex-shrink-0"
                  style={{ borderColor: "var(--ih-line)" }}
                >
                  {p.interviewMode}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Activity tab ───────────────────────────────────────────────────────────

function ActivityTab({ engagementId }: { engagementId: string }) {
  const activityQuery = api.onboarding.getActivity.useQuery({
    engagementId,
    limit: 50,
  })

  if (activityQuery.isLoading) {
    return (
      <div className="p-8" style={{ color: "var(--ih-ink-65)" }}>
        Loading…
      </div>
    )
  }

  const rows: ActivityRow[] = activityQuery.data?.rows ?? []

  return (
    <div className="p-8 max-w-3xl">
      <p className="ih-eyebrow mb-3">Activity</p>
      {rows.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--ih-ink-65)" }}>
          No activity recorded yet.
        </p>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <div
              key={row.id}
              className="flex items-start gap-3 ih-card p-3"
            >
              <span
                className="inline-block w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
                style={{
                  background:
                    row.actorType === "CONSULTANT"
                      ? "var(--ih-info)"
                      : row.actorType === "CLIENT"
                        ? "var(--ih-warn)"
                        : "var(--ih-ink-50)",
                }}
              />
              <div className="flex-1">
                <p className="text-sm">
                  <span className="font-medium">{row.actorName}</span>{" "}
                  — {row.message}
                </p>
                <p
                  className="text-xs mt-0.5 ih-mono"
                  style={{ color: "var(--ih-ink-50)" }}
                >
                  {new Date(row.createdAt).toLocaleString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Coming soon placeholder tab ────────────────────────────────────────────

function ComingSoonTab({
  title,
  href,
}: {
  title: string
  href: string
}) {
  return (
    <div className="p-12 text-center">
      <p className="ih-eyebrow mb-2">{title}</p>
      <p
        className="text-sm mb-6"
        style={{ color: "var(--ih-ink-65)" }}
      >
        The {title.toLowerCase()} lives on its own dedicated page.
      </p>
      <Link
        href={href}
        className="px-4 py-2 rounded-md inline-block"
        style={{ background: "var(--ih-accent)", color: "white" }}
      >
        Open {title.toLowerCase()}
      </Link>
    </div>
  )
}

// ── Shared micro-components ────────────────────────────────────────────────

function ConnectionCard({
  href,
  icon: Icon,
  label,
  value,
}: {
  href: string
  icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>
  label: string
  value: string
}) {
  return (
    <Link
      href={href}
      className="ih-card p-4 block transition-colors"
      style={{ borderColor: "var(--ih-line)" }}
    >
      <div className="flex items-start justify-between">
        <Icon size={16} style={{ color: "var(--ih-ink-65)" }} />
        <ArrowRight size={12} style={{ color: "var(--ih-ink-50)" }} />
      </div>
      <p className="ih-eyebrow mt-3">{label}</p>
      <p className="font-medium text-sm mt-1">{value}</p>
    </Link>
  )
}

function KV({ k, v }: { k: string; v: string | number | boolean }) {
  return (
    <div className="text-sm py-1 flex items-baseline gap-2">
      <span
        className="ih-mono uppercase text-[10px] tracking-wide flex-shrink-0"
        style={{ color: "var(--ih-ink-50)" }}
      >
        {k}
      </span>
      <span style={{ color: "var(--ih-ink)" }}>{String(v)}</span>
    </div>
  )
}

// ── Internal types ─────────────────────────────────────────────────────────

type ChartPerson = OrgChartTree & { contactEmail: string }

interface ActivityRow {
  id: string
  actorType: string
  actorName: string
  message: string
  createdAt: Date | string
}

// ── Tree utilities ─────────────────────────────────────────────────────────

function flattenChart(tree: OrgChartTree[]): OrgChartTree[] {
  const out: OrgChartTree[] = []
  const walk = (n: OrgChartTree) => {
    out.push(n)
    for (const c of n.children) walk(c)
  }
  for (const r of tree) walk(r)
  return out
}

function flattenPersons(tree: OrgChartTree[]): ChartPerson[] {
  const out: ChartPerson[] = []
  const walk = (n: OrgChartTree) => {
    if (n.type === "PERSON" && n.contactEmail) {
      out.push(n as ChartPerson)
    }
    for (const c of n.children) walk(c)
  }
  for (const r of tree) walk(r)
  return out
}
