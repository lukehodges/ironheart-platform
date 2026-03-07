import Link from "next/link"
import {
  ArrowLeft,
  Building2,
  MapPin,
  User,
  Banknote,
  CalendarCheck,
  ChevronRight,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  MessageSquare,
  TrendingUp,
  Lock,
  ExternalLink,
} from "lucide-react"
import { DEALS } from "../../_data/deals"
import type { DealDetail, DocumentItem, DealActivity, Stage } from "../../_data/deals"

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STAGE_ORDER: Stage[] = ["instruction", "under-offer", "exchanged", "completed"]

const STAGE_LABELS: Record<Stage, string> = {
  instruction: "Instruction",
  "under-offer": "Under Offer",
  exchanged: "Exchanged",
  completed: "Completed",
}

const STAGE_HEADER: Record<Stage, { bg: string; border: string }> = {
  instruction: { bg: "bg-[#E8EDF5]", border: "border-[#C8D0E0]" },
  "under-offer": { bg: "bg-[#F2EDE8]", border: "border-[#DED0C8]" },
  exchanged: { bg: "bg-[#EDE8F5]", border: "border-[#CEC8D8]" },
  completed: { bg: "bg-[#E8F0EC]", border: "border-[#C8D8CE]" },
}

const STAGE_BADGE: Record<Stage, string> = {
  instruction: "bg-[#E3EAF5] text-[#2A4A7A] border-[#C0CEEA]",
  "under-offer": "bg-[#F5EDE0] text-[#7A4A18] border-[#E0D0B0]",
  exchanged: "bg-[#EDE0F5] text-[#5A2A7A] border-[#CEB8E0]",
  completed: "bg-[#E0F0E8] text-[#1A5A38] border-[#B0D8C0]",
}

const PROPERTY_TYPE_COLORS: Record<string, string> = {
  Office: "bg-sky-100 text-sky-700 border-sky-200",
  Retail: "bg-rose-100 text-rose-700 border-rose-200",
  Industrial: "bg-orange-100 text-orange-700 border-orange-200",
  "Trade Counter": "bg-purple-100 text-purple-700 border-purple-200",
  Leisure: "bg-teal-100 text-teal-700 border-teal-200",
}

const AGENT_NAMES: Record<string, string> = {
  DB: "Daniel Brooks",
  RJ: "Rachel Jones",
  MW: "Mark Williams",
}

const AGENT_AVATAR_COLORS: Record<string, string> = {
  DB: "bg-blue-100 text-blue-700",
  RJ: "bg-violet-100 text-violet-700",
  MW: "bg-emerald-100 text-emerald-700",
}

const ACTIVITY_DOT: Record<DealActivity["type"], string> = {
  milestone: "bg-[#85B898]",
  legal: "bg-[#7BA8C8]",
  financial: "bg-[#C8A850]",
  note: "bg-[#B8A898]",
  communication: "bg-[#B098C8]",
}

const ACTIVITY_LABEL: Record<DealActivity["type"], string> = {
  milestone: "Milestone",
  legal: "Legal",
  financial: "Financial",
  note: "Note",
  communication: "Communication",
}

function formatDealValue(value: number, type: "pa" | "sale"): string {
  if (type === "sale") {
    if (value >= 1_000_000) {
      const m = value / 1_000_000
      return `£${m % 1 === 0 ? m.toFixed(0) : m.toFixed(2)}m`
    }
    if (value >= 100_000) return `£${(value / 1_000).toFixed(0)}k`
    return `£${value.toLocaleString("en-GB")}`
  }
  return `£${value.toLocaleString("en-GB")} pa`
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
}

function formatShortDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" })
}

// ─── Stage Progress Tracker ──────────────────────────────────────────────────

function StageTracker({ currentStage }: { currentStage: Stage }) {
  const currentIdx = STAGE_ORDER.indexOf(currentStage)

  return (
    <div className="flex items-center justify-center gap-0 py-5">
      {STAGE_ORDER.map((stage, idx) => {
        const isCompleted = idx < currentIdx
        const isCurrent = idx === currentIdx
        const isFuture = idx > currentIdx

        return (
          <div key={stage} className="flex items-center">
            {/* Connector before (except first) */}
            {idx > 0 && (
              <div
                className={`h-0.5 w-12 ${
                  isCompleted || isCurrent ? "bg-[#85B898]" : "bg-[#C8C0B8]"
                }`}
              />
            )}

            {/* Node */}
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`relative h-7 w-7 rounded-full flex items-center justify-center transition-all ${
                  isCompleted
                    ? "bg-[#85B898]"
                    : isCurrent
                    ? "bg-[#3A6B8A] ring-2 ring-[#90B5D0] ring-offset-1"
                    : "bg-white border-2 border-[#C8C0B8]"
                }`}
              >
                {isCompleted && (
                  <CheckCircle2 className="h-3.5 w-3.5 text-white" />
                )}
                {isCurrent && (
                  <div className="h-2.5 w-2.5 rounded-full bg-white" />
                )}
              </div>
              <span
                className={`text-[10px] font-semibold whitespace-nowrap ${
                  isCompleted
                    ? "text-[#5A8A6A]"
                    : isCurrent
                    ? "text-[#3A6B8A]"
                    : "text-[#A8A098]"
                }`}
              >
                {STAGE_LABELS[stage]}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Document Checklist ──────────────────────────────────────────────────────

function DocStatusIcon({ status }: { status: DocumentItem["status"] }) {
  if (status === "complete") return <div className="h-2 w-2 rounded-full bg-[#6BAE85] shrink-0" />
  if (status === "pending") return <div className="h-2 w-2 rounded-full bg-[#C8A850] shrink-0" />
  if (status === "awaiting") return <div className="h-2 w-2 rounded-full bg-[#7BA8C8] shrink-0" />
  return <div className="h-2 w-2 rounded-full bg-[#C8C0B8] shrink-0" />
}

function DocStatusPill({ status }: { status: DocumentItem["status"] }) {
  if (status === "complete") return null
  if (status === "pending")
    return (
      <span className="text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-[#FBF4E0] text-[#96741A] border border-[#E8D898]">
        Pending
      </span>
    )
  if (status === "awaiting")
    return (
      <span className="text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-[#E8F0F8] text-[#3A6A9A] border border-[#B8D0E8]">
        Awaiting
      </span>
    )
  return (
    <span className="text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-[#F0EEEC] text-[#9A9088] border border-[#DED8D0]">
      N/A
    </span>
  )
}

function DocumentChecklist({ documents }: { documents: DocumentItem[] }) {
  const relevant = documents.filter((d) => d.status !== "na")
  const complete = relevant.filter((d) => d.status === "complete").length
  const total = relevant.length
  const pct = total > 0 ? Math.round((complete / total) * 100) : 0

  return (
    <div className="bg-white rounded-xl border border-[#E8E3DC] shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-[#F0EDE8]">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#9A9088] mb-2">
          Documents &amp; Milestones
        </p>
        <div className="flex items-center justify-between text-[11px] text-[#8A8078] mb-2">
          <span>{complete} of {total} complete</span>
          <span className="font-semibold text-[#5A8A6A]">{pct}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-[#EDE8E0] overflow-hidden">
          <div
            className="h-full rounded-full bg-[#85B898] transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      <div className="divide-y divide-[#F5F2EE]">
        {documents.map((doc) => (
          <div key={doc.id} className="flex items-center gap-3 px-5 py-2.5">
            <DocStatusIcon status={doc.status} />
            <span
              className={`flex-1 text-[12px] font-medium ${
                doc.status === "complete"
                  ? "line-through text-[#ABA398]"
                  : doc.status === "na"
                  ? "text-[#BEB8B0]"
                  : "text-[#4A4440]"
              }`}
            >
              {doc.label}
            </span>
            {doc.date && (
              <span className="text-[10px] text-[#9A9088] tabular-nums shrink-0">
                {formatShortDate(doc.date)}
              </span>
            )}
            <DocStatusPill status={doc.status} />
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Activity Log ────────────────────────────────────────────────────────────

function ActivityLog({ activity }: { activity: DealActivity[] }) {
  return (
    <div className="bg-white rounded-xl border border-[#E8E3DC] shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-[#F0EDE8]">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#9A9088]">
          Activity Log
        </p>
      </div>
      <div className="px-5 py-3">
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-[5px] top-3 bottom-3 w-px bg-[#EDE8E0]" />

          <div className="flex flex-col gap-4">
            {activity.map((entry, i) => (
              <div key={i} className="flex gap-3.5 items-start relative">
                <div className={`h-2.5 w-2.5 rounded-full mt-1.5 shrink-0 z-10 ${ACTIVITY_DOT[entry.type]}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-[#9A9088]">
                      {ACTIVITY_LABEL[entry.type]}
                    </span>
                    <span className="text-[10px] text-[#B0A898] tabular-nums">
                      {formatDate(entry.date)}
                    </span>
                    {entry.agent && (
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                          AGENT_AVATAR_COLORS[entry.agent] ?? "bg-[#EDE8E0] text-[#8A8078]"
                        }`}
                      >
                        {entry.agent}
                      </span>
                    )}
                  </div>
                  <p className="text-[12px] font-medium text-[#3A3430] leading-snug">
                    {entry.text}
                  </p>
                  {entry.detail && (
                    <p className="text-[11px] text-[#8A8078] mt-0.5 leading-snug">{entry.detail}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Next Actions ────────────────────────────────────────────────────────────

function NextActions({ actions }: { actions: string[] }) {
  return (
    <div className="bg-white rounded-xl border border-[#E8E3DC] shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-[#F0EDE8]">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#9A9088]">
          Next Actions
        </p>
      </div>
      <div className="px-5 py-3">
        <div className="flex flex-col gap-2.5">
          {actions.map((action, i) => (
            <div key={i} className="flex items-start gap-3">
              <span className="text-[11px] font-bold text-[#C8C0B8] tabular-nums w-4 shrink-0 pt-px">
                {i + 1}.
              </span>
              <p className="text-[12px] text-[#4A4440] leading-snug">{action}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="px-5 py-2.5 border-t border-[#F5F2EE]">
        <p className="text-[10px] text-[#B0A898]">Updated automatically as deal progresses</p>
      </div>
    </div>
  )
}

// ─── Section Label ───────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-wider text-[#9A9088] mb-3">
      {children}
    </p>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default async function DealDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const deal: DealDetail | undefined = DEALS.find((d) => d.id === id)

  if (!deal) {
    return (
      <div className="min-h-screen bg-[#F8F6F2] flex items-center justify-center">
        <div className="text-center">
          <p className="text-2xl font-semibold text-[#4A4440] mb-2">Deal not found</p>
          <p className="text-[#8A8078] mb-6">No deal with ID &ldquo;{id}&rdquo; exists in the pipeline.</p>
          <Link
            href="/admin/bp2-demo/deals-pipeline"
            className="inline-flex items-center gap-2 text-[14px] font-medium text-[#3A6B8A] hover:text-[#2A5A7A]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Deals Pipeline
          </Link>
        </div>
      </div>
    )
  }

  const header = STAGE_HEADER[deal.stage]
  const stageBadge = STAGE_BADGE[deal.stage]
  const typeBadge = PROPERTY_TYPE_COLORS[deal.propertyType] ?? "bg-stone-100 text-stone-700 border-stone-200"
  const agentName = AGENT_NAMES[deal.agentInitials] ?? deal.agentInitials
  const agentColor = AGENT_AVATAR_COLORS[deal.agentInitials] ?? "bg-stone-100 text-stone-700"
  const isLetting = deal.dealValueType === "pa"

  return (
    <div className="min-h-screen bg-[#F8F6F2]">
      <div className="max-w-6xl mx-auto px-6 py-6">

        {/* Back nav + breadcrumb */}
        <div className="flex items-center justify-between mb-5">
          <Link
            href="/admin/bp2-demo/deals-pipeline"
            className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#6A6058] hover:text-[#3A3430] transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Deals Pipeline
          </Link>
          <nav className="flex items-center gap-1 text-[11px] text-[#B0A898]">
            <span>Admin</span>
            <ChevronRight className="h-3 w-3" />
            <span>BP2 Demo</span>
            <ChevronRight className="h-3 w-3" />
            <Link href="/admin/bp2-demo/deals-pipeline" className="hover:text-[#6A6058]">
              Deals Pipeline
            </Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-[#6A6058] font-medium truncate max-w-[200px]">{deal.address}</span>
          </nav>
        </div>

        {/* Header card */}
        <div className={`rounded-xl border ${header.bg} ${header.border} shadow-sm p-6 mb-4`}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <Building2 className="h-3.5 w-3.5 text-[#5A7A9A]" />
                <span className="text-[11px] font-semibold text-[#5A7A9A] uppercase tracking-widest">
                  BP2 Property &middot; Commercial Agency
                </span>
              </div>
              <h1 className="text-2xl font-semibold text-[#2A2420] tracking-tight leading-tight mb-3">
                {deal.address}
              </h1>
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`inline-flex items-center rounded border px-2 py-0.5 text-[11px] font-semibold tracking-wide ${stageBadge}`}
                >
                  {STAGE_LABELS[deal.stage]}
                </span>
                <span
                  className={`inline-flex items-center rounded border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${typeBadge}`}
                >
                  {deal.propertyType}
                </span>
                <div
                  className={`h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-bold ${agentColor}`}
                  title={agentName}
                >
                  {deal.agentInitials}
                </div>
                <span className="text-[12px] text-[#6A6058]">{agentName}</span>
              </div>
            </div>

            {/* Deal value */}
            <div className="text-right shrink-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#9A9088] mb-0.5">
                Deal Value
              </p>
              <p className="text-3xl font-bold text-[#2A2420] tabular-nums leading-none">
                {formatDealValue(deal.dealValue, deal.dealValueType)}
              </p>
              <p className="text-[11px] text-[#8A8078] mt-1">
                {deal.dealValueType === "pa" ? "Per annum lease" : "Freehold sale"}
              </p>
            </div>
          </div>

          {/* Meta row */}
          <div className="flex items-center gap-6 mt-4 pt-4 border-t border-black/[0.06] flex-wrap">
            <div className="flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-[#8A8078]" />
              <span className="text-[11px] text-[#8A8078]">{deal.counterpartyLabel}:</span>
              <span className="text-[12px] font-semibold text-[#3A3430]">{deal.counterpartyName}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CalendarCheck className="h-3.5 w-3.5 text-[#8A8078]" />
              <span className="text-[11px] text-[#8A8078]">Instructed:</span>
              <span className="text-[12px] font-semibold text-[#3A3430]">{formatDate(deal.instructionDate)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-[#8A8078]" />
              <span className="text-[11px] text-[#8A8078]">Target completion:</span>
              <span className="text-[12px] font-semibold text-[#3A3430]">{formatDate(deal.targetCompletion)}</span>
            </div>
          </div>
        </div>

        {/* Stage tracker */}
        <div className="bg-white rounded-xl border border-[#E8E3DC] shadow-sm mb-5">
          <StageTracker currentStage={deal.stage} />
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* LEFT — col-span-2 */}
          <div className="lg:col-span-2 flex flex-col gap-5">

            {/* Deal Summary card */}
            <div className="bg-white rounded-xl border border-[#E8E3DC] shadow-sm p-5">
              <SectionLabel>Deal Summary</SectionLabel>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[#9A9088] mb-0.5">
                    Deal Value
                  </p>
                  <p className="text-[15px] font-bold text-[#2A2420] tabular-nums">
                    {formatDealValue(deal.dealValue, deal.dealValueType)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[#9A9088] mb-0.5">
                    Deal Type
                  </p>
                  <p className="text-[14px] font-semibold text-[#3A3430]">
                    {deal.dealValueType === "pa" ? "Letting" : "Investment Sale"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[#9A9088] mb-0.5">
                    Instruction Date
                  </p>
                  <p className="text-[14px] font-semibold text-[#3A3430]">{formatDate(deal.instructionDate)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[#9A9088] mb-0.5">
                    Target Completion
                  </p>
                  <p className="text-[14px] font-semibold text-[#3A3430]">{formatDate(deal.targetCompletion)}</p>
                </div>
              </div>

              {/* Lease-specific fields */}
              {isLetting && (deal.leaseTerm || deal.rentFreeMonths !== undefined || deal.breakClause) && (
                <div className="pt-4 border-t border-[#F5F2EE]">
                  <div className="grid grid-cols-2 gap-4">
                    {deal.leaseTerm && (
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-[#9A9088] mb-0.5">
                          Lease Term
                        </p>
                        <p className="text-[13px] font-medium text-[#3A3430]">{deal.leaseTerm}</p>
                      </div>
                    )}
                    {deal.rentFreeMonths !== undefined && deal.rentFreeMonths > 0 && (
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-[#9A9088] mb-0.5">
                          Rent Free
                        </p>
                        <p className="text-[13px] font-medium text-[#3A3430]">
                          {deal.rentFreeMonths} month{deal.rentFreeMonths !== 1 ? "s" : ""}
                        </p>
                      </div>
                    )}
                    {deal.breakClause && (
                      <div className="col-span-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-[#9A9088] mb-0.5">
                          Break Clause
                        </p>
                        <p className="text-[13px] font-medium text-[#3A3430]">{deal.breakClause}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Parties card */}
            <div className="bg-white rounded-xl border border-[#E8E3DC] shadow-sm p-5">
              <SectionLabel>Parties</SectionLabel>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Landlord / Vendor */}
                <div>
                  <p className="text-[11px] font-semibold text-[#8A8078] mb-2">
                    {isLetting ? "Landlord" : "Vendor"}
                  </p>
                  <div className="space-y-1.5">
                    <div className="flex items-start gap-2">
                      <Building2 className="h-3.5 w-3.5 text-[#B0A898] mt-0.5 shrink-0" />
                      <p className="text-[13px] font-semibold text-[#3A3430]">{deal.landlord.name}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <User className="h-3.5 w-3.5 text-[#B0A898] shrink-0" />
                      <p className="text-[12px] text-[#6A6058]">{deal.landlord.contact}</p>
                    </div>
                    {deal.landlord.solicitorFirm && (
                      <div className="mt-2 pt-2 border-t border-[#F5F2EE]">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-[#C8C0B8] mb-1">
                          Solicitors
                        </p>
                        <p className="text-[12px] font-medium text-[#5A5450]">{deal.landlord.solicitorFirm}</p>
                        {deal.landlord.solicitorContact && (
                          <p className="text-[11px] text-[#8A8078]">{deal.landlord.solicitorContact}</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Tenant / Buyer */}
                <div>
                  <p className="text-[11px] font-semibold text-[#8A8078] mb-2">
                    {deal.counterpartyLabel}
                  </p>
                  <div className="space-y-1.5">
                    <div className="flex items-start gap-2">
                      <Building2 className="h-3.5 w-3.5 text-[#B0A898] mt-0.5 shrink-0" />
                      <p className="text-[13px] font-semibold text-[#3A3430]">{deal.counterparty.name}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <User className="h-3.5 w-3.5 text-[#B0A898] shrink-0" />
                      <p className="text-[12px] text-[#6A6058]">{deal.counterparty.contact}</p>
                    </div>
                    {deal.counterparty.solicitorFirm && (
                      <div className="mt-2 pt-2 border-t border-[#F5F2EE]">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-[#C8C0B8] mb-1">
                          Solicitors
                        </p>
                        <p className="text-[12px] font-medium text-[#5A5450]">{deal.counterparty.solicitorFirm}</p>
                        {deal.counterparty.solicitorContact && (
                          <p className="text-[11px] text-[#8A8078]">{deal.counterparty.solicitorContact}</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Linked Property card */}
            {deal.propertyId !== null ? (
              <div className="bg-white rounded-xl border border-[#E8E3DC] shadow-sm p-5">
                <SectionLabel>Linked Property</SectionLabel>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <MapPin className="h-4 w-4 text-[#7BA8C8]" />
                      <p className="text-[14px] font-semibold text-[#2A2420]">{deal.address}</p>
                    </div>
                    <span
                      className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${typeBadge}`}
                    >
                      {deal.propertyType}
                    </span>
                    <p className="text-[11px] text-[#9A9088] mt-2">
                      Full enquiry history, viewing log and property details in one place.
                    </p>
                  </div>
                  <Link
                    href={`/admin/bp2-demo/property-stock/${deal.propertyId}`}
                    className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#EFF5FA] text-[#3A6B8A] border border-[#C8DCE8] text-[12px] font-semibold hover:bg-[#E3EEF7] transition-colors"
                  >
                    View Full Property
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-[#E8DCB8] bg-[#FAF6E8] p-5">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-4.5 w-4.5 text-[#C8A030] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[13px] font-semibold text-[#7A6020] mb-0.5">
                      Property not yet added to stock system
                    </p>
                    <p className="text-[12px] text-[#9A8040] leading-relaxed">
                      Connecting deals to listings centralises your pipeline — enquiry history, viewings,
                      and deal status visible in one place, without hunting across emails and spreadsheets.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Insight strip */}
            <div className="rounded-xl border border-[#DED8C8] bg-[#F5F2E8] px-5 py-4">
              <div className="flex items-center gap-3">
                <TrendingUp className="h-4.5 w-4.5 text-[#8A7848] shrink-0" />
                <p className="text-[13px] text-[#6A5A38] leading-relaxed">
                  Every party, document, and action for this deal — tracked in one place.{" "}
                  <span className="font-semibold text-[#5A4A28]">
                    No more status-update emails or spreadsheet hunting.
                  </span>
                </p>
              </div>
            </div>

            {/* Agent Notes (if present) */}
            {deal.notes && (
              <div className="bg-white rounded-xl border border-[#E8E3DC] shadow-sm p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Lock className="h-3.5 w-3.5 text-[#B0A898]" />
                  <SectionLabel>Agent Notes</SectionLabel>
                </div>
                <div className="rounded-lg bg-[#FAF7F2] border border-[#EDE8E0] px-4 py-3">
                  <p className="text-[13px] text-[#5A5048] leading-relaxed">{deal.notes}</p>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT — col-span-1 */}
          <div className="flex flex-col gap-5">
            <DocumentChecklist documents={deal.documents} />
            <ActivityLog activity={deal.activity} />
            <NextActions actions={deal.nextActions} />
          </div>
        </div>
      </div>
    </div>
  )
}
