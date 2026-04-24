"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import {
  Plus,
  Search,
  X,
  Phone,
  Mail,
  Clock,
  Calendar,
  AlertTriangle,
  ChevronRight,
  MoreHorizontal,
  PoundSterling,
  TrendingUp,
  Target,
  ArrowRight,
  MessageSquare,
  Link2,
  User,
  GripVertical,
  ArrowUpRight,
  Filter,
  Check,
  Circle,
} from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

type Stage = "lead" | "qualified" | "proposal" | "negotiation" | "won" | "lost"

interface Deal {
  id: string
  company: string
  description: string
  value: number
  valueLabel: string
  source: string
  daysInStage: number
  addedLabel: string
  owner: string
  ownerInitials: string
  nextAction?: string
  nextActionDate?: string
  isOverdue?: boolean
  linkedProject?: string
  stage: Stage
}

interface Activity {
  type: "email" | "call" | "note" | "created" | "moved"
  description: string
  date: string
}

// ─── Mock Data ─────────────────────────────────────────────────────────────────

const DEALS: Deal[] = [
  // Lead
  {
    id: "d1",
    company: "Harrison Building Group",
    description: "Commercial HVAC Replacement",
    value: 85000,
    valueLabel: "£85,000",
    source: "Website enquiry",
    daysInStage: 3,
    addedLabel: "3 days ago",
    owner: "Luke Hodges",
    ownerInitials: "LH",
    nextAction: "Qualify call",
    nextActionDate: "14 Apr 2026",
    stage: "lead",
  },
  {
    id: "d2",
    company: "Mrs Fenwick",
    description: "Kitchen Refit",
    value: 12000,
    valueLabel: "£12,000",
    source: "Referral — TechCorp",
    daysInStage: 0,
    addedLabel: "Today",
    owner: "Sarah Chen",
    ownerInitials: "SC",
    nextAction: "Send intro email",
    nextActionDate: "12 Apr 2026",
    stage: "lead",
  },
  {
    id: "d3",
    company: "Sunridge Leisure Centre",
    description: "Pool Heating System",
    value: 45000,
    valueLabel: "£45,000",
    source: "Cold outreach",
    daysInStage: 7,
    addedLabel: "1 week ago",
    owner: "Mike Torres",
    ownerInitials: "MT",
    nextAction: "Follow up call",
    nextActionDate: "10 Apr 2026",
    isOverdue: true,
    stage: "lead",
  },
  // Qualified
  {
    id: "d4",
    company: "Northgate Council",
    description: "40x Boiler Replacements",
    value: 180000,
    valueLabel: "£180,000",
    source: "Procurement tender",
    daysInStage: 6,
    addedLabel: "5 Apr 2026",
    owner: "Luke Hodges",
    ownerInitials: "LH",
    nextAction: "Submit proposal",
    nextActionDate: "30 Apr 2026",
    stage: "qualified",
  },
  {
    id: "d5",
    company: "Apex Logistics",
    description: "Warehouse Fit-out",
    value: 62000,
    valueLabel: "£62,000",
    source: "Intro call complete",
    daysInStage: 9,
    addedLabel: "2 Apr 2026",
    owner: "Mike Torres",
    ownerInitials: "MT",
    nextAction: "Decision by May",
    nextActionDate: "1 May 2026",
    stage: "qualified",
  },
  {
    id: "d6",
    company: "The Grand Hotel",
    description: "HVAC Overhaul",
    value: 34000,
    valueLabel: "£34,000",
    source: "Survey booked",
    daysInStage: 4,
    addedLabel: "7 Apr 2026",
    owner: "Sarah Chen",
    ownerInitials: "SC",
    nextAction: "Site survey",
    nextActionDate: "16 Apr 2026",
    stage: "qualified",
  },
  // Proposal Sent
  {
    id: "d7",
    company: "CityLink Offices",
    description: "Full M&E Package",
    value: 128000,
    valueLabel: "£128,000",
    source: "Proposal sent 8 Apr",
    daysInStage: 3,
    addedLabel: "8 Apr 2026",
    owner: "Luke Hodges",
    ownerInitials: "LH",
    nextAction: "Follow up",
    nextActionDate: "15 Apr 2026",
    isOverdue: false,
    stage: "proposal",
  },
  {
    id: "d8",
    company: "Manor House Estate",
    description: "Annual Maintenance Contract",
    value: 24000,
    valueLabel: "£24,000/yr",
    source: "Proposal sent 2 Apr",
    daysInStage: 9,
    addedLabel: "2 Apr 2026",
    owner: "Sarah Chen",
    ownerInitials: "SC",
    nextAction: "Chase response",
    nextActionDate: "8 Apr 2026",
    isOverdue: true,
    stage: "proposal",
  },
  // Negotiation
  {
    id: "d9",
    company: "Redwood Retail Park",
    description: "Multi-unit Gas Install",
    value: 95000,
    valueLabel: "£95,000",
    source: "Price discussion",
    daysInStage: 12,
    addedLabel: "30 Mar 2026",
    owner: "Luke Hodges",
    ownerInitials: "LH",
    nextAction: "Counter-offer call",
    nextActionDate: "13 Apr 2026",
    isOverdue: true,
    stage: "negotiation",
  },
  {
    id: "d10",
    company: "Halcyon Group",
    description: "Data Centre Cooling",
    value: 215000,
    valueLabel: "£215,000",
    source: "Final T&Cs review",
    daysInStage: 18,
    addedLabel: "24 Mar 2026",
    owner: "Luke Hodges",
    ownerInitials: "LH",
    nextAction: "Legal sign-off",
    nextActionDate: "16 Apr 2026",
    stage: "negotiation",
  },
  // Won
  {
    id: "d11",
    company: "TechCorp",
    description: "Kitchen Renovation",
    value: 42000,
    valueLabel: "£42,000",
    source: "Signed 10 Jan 2026",
    daysInStage: 91,
    addedLabel: "10 Jan 2026",
    owner: "Luke Hodges",
    ownerInitials: "LH",
    linkedProject: "PRJ-001",
    stage: "won",
  },
  {
    id: "d12",
    company: "City Council",
    description: "Boiler Programme",
    value: 94000,
    valueLabel: "£94,000",
    source: "Signed 15 Dec 2025",
    daysInStage: 117,
    addedLabel: "15 Dec 2025",
    owner: "Luke Hodges",
    ownerInitials: "LH",
    linkedProject: "PRJ-005",
    stage: "won",
  },
]

const NORTHGATE_ACTIVITIES: Activity[] = [
  {
    type: "email",
    description: "Proposal sent (PDF, 18 pages)",
    date: "8 Apr 2026",
  },
  {
    type: "call",
    description: "Intro call — 45 mins — discussed scope and budget range",
    date: "5 Apr 2026",
  },
  {
    type: "note",
    description: "Email received — interested in annual maintenance add-on too",
    date: "3 Apr 2026",
  },
  {
    type: "created",
    description: "Lead created via procurement tender",
    date: "1 Apr 2026",
  },
]

const STAGES: { id: Stage; label: string; color: string }[] = [
  { id: "lead", label: "Lead", color: "text-zinc-600" },
  { id: "qualified", label: "Qualified", color: "text-blue-600" },
  { id: "proposal", label: "Proposal Sent", color: "text-violet-600" },
  { id: "negotiation", label: "Negotiation", color: "text-amber-600" },
  { id: "won", label: "Won", color: "text-emerald-600" },
  { id: "lost", label: "Lost", color: "text-zinc-400" },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtGBP(val: number) {
  return `£${val.toLocaleString()}`
}

function stagePipelineValue(stage: Stage) {
  return DEALS.filter((d) => d.stage === stage).reduce((s, d) => s + d.value, 0)
}

function stageDealCount(stage: Stage) {
  return DEALS.filter((d) => d.stage === stage).length
}

// ─── Stage Badge ──────────────────────────────────────────────────────────────

function StageBadge({ stage }: { stage: Stage }) {
  const map: Record<Stage, string> = {
    lead: "bg-zinc-100 text-zinc-600 border-zinc-200",
    qualified: "bg-blue-50 text-blue-700 border-blue-200",
    proposal: "bg-violet-50 text-violet-700 border-violet-200",
    negotiation: "bg-amber-50 text-amber-700 border-amber-200",
    won: "bg-emerald-50 text-emerald-700 border-emerald-200",
    lost: "bg-zinc-50 text-zinc-400 border-zinc-200",
  }
  const labels: Record<Stage, string> = {
    lead: "Lead",
    qualified: "Qualified",
    proposal: "Proposal Sent",
    negotiation: "Negotiation",
    won: "Won",
    lost: "Lost",
  }
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold",
        map[stage]
      )}
    >
      {labels[stage]}
    </span>
  )
}

// ─── Activity Icon ────────────────────────────────────────────────────────────

function ActivityIcon({ type }: { type: Activity["type"] }) {
  const base = "h-6 w-6 rounded-full flex items-center justify-center shrink-0"
  if (type === "email")
    return (
      <div className={cn(base, "bg-blue-50")}>
        <Mail className="h-3 w-3 text-blue-600" />
      </div>
    )
  if (type === "call")
    return (
      <div className={cn(base, "bg-emerald-50")}>
        <Phone className="h-3 w-3 text-emerald-600" />
      </div>
    )
  if (type === "note")
    return (
      <div className={cn(base, "bg-amber-50")}>
        <MessageSquare className="h-3 w-3 text-amber-600" />
      </div>
    )
  return (
    <div className={cn(base, "bg-zinc-100")}>
      <Circle className="h-3 w-3 text-zinc-400" />
    </div>
  )
}

// ─── Deal Card ────────────────────────────────────────────────────────────────

function DealCard({
  deal,
  isWon,
  isSelected,
  onClick,
}: {
  deal: Deal
  isWon: boolean
  isSelected: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "group w-full text-left rounded-xl border p-3 transition-all space-y-2.5 cursor-pointer",
        isSelected
          ? "border-zinc-900 bg-zinc-50 shadow-sm ring-1 ring-zinc-900/10"
          : isWon
          ? "border-emerald-100 bg-emerald-50/30 hover:border-emerald-200"
          : "border-zinc-200 bg-white hover:border-zinc-300 hover:shadow-sm"
      )}
    >
      {/* Drag handle + company */}
      <div className="flex items-start gap-2">
        <GripVertical className="h-4 w-4 text-zinc-300 mt-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="flex-1 min-w-0">
          <p className={cn("text-sm font-semibold leading-snug", isWon ? "text-emerald-800" : "text-zinc-900")}>
            {deal.company}
          </p>
          <p className="text-xs text-zinc-500 mt-0.5 leading-snug">{deal.description}</p>
        </div>
        <div
          className={cn(
            "rounded-lg px-2 py-1 text-xs font-bold shrink-0 tabular-nums",
            isWon ? "bg-emerald-100 text-emerald-800" : "bg-zinc-900 text-white"
          )}
        >
          {deal.valueLabel}
        </div>
      </div>

      {/* Source + days */}
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-zinc-400 truncate pr-2">{deal.source}</span>
        <span className="text-zinc-400 shrink-0">
          {deal.daysInStage === 0 ? "Today" : `${deal.daysInStage}d`}
        </span>
      </div>

      {/* Next action */}
      {deal.nextAction && (
        <div
          className={cn(
            "flex items-center gap-1.5 rounded-lg px-2 py-1.5",
            deal.isOverdue
              ? "bg-red-50 border border-red-200"
              : "bg-zinc-50 border border-zinc-200"
          )}
        >
          {deal.isOverdue ? (
            <AlertTriangle className="h-3 w-3 text-red-500 shrink-0" />
          ) : (
            <Clock className="h-3 w-3 text-zinc-400 shrink-0" />
          )}
          <span
            className={cn(
              "text-[11px] font-medium flex-1 truncate",
              deal.isOverdue ? "text-red-700" : "text-zinc-600"
            )}
          >
            {deal.nextAction}
          </span>
          {deal.nextActionDate && (
            <span
              className={cn(
                "text-[10px] shrink-0",
                deal.isOverdue ? "text-red-600 font-semibold" : "text-zinc-400"
              )}
            >
              {deal.nextActionDate}
            </span>
          )}
        </div>
      )}

      {/* Linked project */}
      {deal.linkedProject && (
        <div className="flex items-center gap-1.5 text-[11px] text-emerald-700">
          <Link2 className="h-3 w-3" />
          <span>Project #{deal.linkedProject}</span>
        </div>
      )}

      {/* Owner + hover actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div className="h-5 w-5 rounded-full bg-zinc-200 flex items-center justify-center text-[9px] font-bold text-zinc-600">
            {deal.ownerInitials}
          </div>
          <span className="text-[11px] text-zinc-400">{deal.owner.split(" ")[0]}</span>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            className="h-6 px-2 rounded-md bg-zinc-100 hover:bg-zinc-200 text-[10px] font-medium text-zinc-600 flex items-center gap-1 transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <ArrowRight className="h-3 w-3" />
            Move
          </button>
          <button
            className="h-6 w-6 rounded-md bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreHorizontal className="h-3.5 w-3.5 text-zinc-500" />
          </button>
        </div>
      </div>
    </button>
  )
}

// ─── Kanban Column ────────────────────────────────────────────────────────────

function KanbanColumn({
  stage,
  deals,
  selectedDealId,
  onSelectDeal,
}: {
  stage: (typeof STAGES)[number]
  deals: Deal[]
  selectedDealId: string | null
  onSelectDeal: (id: string) => void
}) {
  const total = deals.reduce((s, d) => s + d.value, 0)
  const isWonOrLost = stage.id === "won" || stage.id === "lost"

  const headerColors: Record<Stage, string> = {
    lead: "bg-zinc-50 border-zinc-200",
    qualified: "bg-blue-50 border-blue-100",
    proposal: "bg-violet-50 border-violet-100",
    negotiation: "bg-amber-50 border-amber-100",
    won: "bg-emerald-50 border-emerald-100",
    lost: "bg-zinc-50 border-zinc-200",
  }

  const countColors: Record<Stage, string> = {
    lead: "bg-zinc-200 text-zinc-700",
    qualified: "bg-blue-100 text-blue-700",
    proposal: "bg-violet-100 text-violet-700",
    negotiation: "bg-amber-100 text-amber-700",
    won: "bg-emerald-100 text-emerald-700",
    lost: "bg-zinc-100 text-zinc-400",
  }

  return (
    <div className="flex flex-col w-72 shrink-0">
      {/* Column header */}
      <div className={cn("rounded-t-xl border px-3 py-2.5", headerColors[stage.id])}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={cn("text-sm font-semibold", stage.color)}>{stage.label}</span>
            <span
              className={cn(
                "inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums",
                countColors[stage.id]
              )}
            >
              {deals.length}
            </span>
          </div>
          {total > 0 && !isWonOrLost && (
            <span className="text-xs font-semibold text-zinc-600 tabular-nums">
              {fmtGBP(total)}
            </span>
          )}
          {isWonOrLost && total > 0 && (
            <span className="text-xs font-medium text-zinc-400 tabular-nums">{fmtGBP(total)}</span>
          )}
        </div>
      </div>

      {/* Cards */}
      <div
        className={cn(
          "flex-1 border-l border-r border-b rounded-b-xl p-2 space-y-2 min-h-[120px]",
          isWonOrLost ? "border-zinc-100 bg-zinc-50/50" : "border-zinc-200 bg-zinc-50/30"
        )}
      >
        {deals.map((deal) => (
          <DealCard
            key={deal.id}
            deal={deal}
            isWon={stage.id === "won"}
            isSelected={selectedDealId === deal.id}
            onClick={() => onSelectDeal(deal.id)}
          />
        ))}

        {deals.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="h-8 w-8 rounded-full bg-zinc-100 flex items-center justify-center mb-2">
              <Circle className="h-4 w-4 text-zinc-300" />
            </div>
            <p className="text-xs text-zinc-400">No deals</p>
          </div>
        )}

        {/* Add deal at bottom */}
        <button className="w-full flex items-center gap-1.5 rounded-lg py-2 px-2 text-xs text-zinc-400 hover:text-zinc-600 hover:bg-white transition-colors border border-transparent hover:border-zinc-200">
          <Plus className="h-3.5 w-3.5" />
          Add deal
        </button>
      </div>
    </div>
  )
}

// ─── Deal Detail Panel ────────────────────────────────────────────────────────

function DealDetailPanel({ deal, onClose }: { deal: Deal; onClose: () => void }) {
  const nextStageLabel: Record<Stage, string | null> = {
    lead: "Move to Qualified",
    qualified: "Move to Proposal Sent",
    proposal: "Move to Negotiation",
    negotiation: "Mark as Won",
    won: null,
    lost: null,
  }

  const nextAction = nextStageLabel[deal.stage]

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-white border-l border-zinc-200 shadow-xl z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-start justify-between px-5 py-4 border-b border-zinc-200 shrink-0">
        <div className="min-w-0 flex-1 pr-3">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-base font-semibold text-zinc-900 leading-snug">{deal.company}</h2>
            <StageBadge stage={deal.stage} />
          </div>
          <p className="text-sm text-zinc-500 mt-0.5">{deal.description}</p>
          <p className="text-lg font-bold text-zinc-900 mt-1.5">{deal.valueLabel}</p>
        </div>
        <button
          onClick={onClose}
          className="h-7 w-7 rounded-md flex items-center justify-center text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition-colors shrink-0"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

        {/* Contact info */}
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 space-y-3">
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Contact</p>
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-zinc-200 flex items-center justify-center text-sm font-bold text-zinc-600 shrink-0">
              JN
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-900">James Northgate</p>
              <p className="text-xs text-zinc-500">Procurement Manager</p>
            </div>
          </div>
          <div className="space-y-2">
            <a
              href="mailto:james@northgate.gov.uk"
              className="flex items-center gap-2 text-xs text-zinc-600 hover:text-zinc-900 transition-colors group"
            >
              <Mail className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
              <span className="group-hover:underline">james@northgate.gov.uk</span>
            </a>
            <a
              href="tel:07700900456"
              className="flex items-center gap-2 text-xs text-zinc-600 hover:text-zinc-900 transition-colors group"
            >
              <Phone className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
              <span className="group-hover:underline">07700 900456</span>
            </a>
          </div>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Description</p>
          <p className="text-sm text-zinc-700 leading-relaxed">
            40x Worcester Bosch residential boilers — social housing programme — council tender. Decision expected end of April pending internal approval.
          </p>
        </div>

        {/* Stage timeline */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Timeline</p>
          <div className="space-y-2">
            {[
              { label: "Lead added", date: "1 Apr 2026", done: true },
              { label: "Qualified", date: "5 Apr 2026", done: true },
              { label: "Proposal Sent", date: "8 Apr 2026 · 4 days in stage", done: false, current: true },
              { label: "Negotiation", date: "—", done: false },
              { label: "Won", date: "—", done: false },
            ].map(({ label, date, done, current }) => (
              <div key={label} className="flex items-center gap-3">
                <div
                  className={cn(
                    "h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0",
                    done
                      ? "border-emerald-500 bg-emerald-500"
                      : current
                      ? "border-blue-500 bg-blue-500"
                      : "border-zinc-200 bg-white"
                  )}
                >
                  {(done || current) && <Check className="h-2.5 w-2.5 text-white" />}
                </div>
                <div className="flex-1 flex items-center justify-between">
                  <span
                    className={cn(
                      "text-xs font-medium",
                      done || current ? "text-zinc-900" : "text-zinc-400"
                    )}
                  >
                    {label}
                  </span>
                  <span
                    className={cn(
                      "text-[11px]",
                      current ? "text-blue-600 font-semibold" : done ? "text-zinc-500" : "text-zinc-300"
                    )}
                  >
                    {date}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Next action */}
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 space-y-1">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
            <p className="text-xs font-semibold text-red-700">Next Action — Overdue</p>
          </div>
          <p className="text-sm text-red-800 font-medium pl-6">Follow up on proposal</p>
          <p className="text-xs text-red-600 pl-6">Due 15 Apr 2026</p>
        </div>

        {/* Activity log */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Activity</p>
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2.5 text-xs gap-1"
            >
              <Plus className="h-3 w-3" />
              Add
            </Button>
          </div>

          <div className="space-y-3">
            {NORTHGATE_ACTIVITIES.map((activity, i) => (
              <div key={i} className="flex items-start gap-3">
                <ActivityIcon type={activity.type} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-zinc-700 leading-snug">{activity.description}</p>
                  <p className="text-[11px] text-zinc-400 mt-0.5">{activity.date}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="shrink-0 border-t border-zinc-200 px-5 py-4 space-y-2">
        {nextAction && (
          <Button className="w-full bg-zinc-900 hover:bg-zinc-700 text-white h-9 gap-2 text-sm font-semibold">
            <ArrowUpRight className="h-4 w-4" />
            {nextAction}
          </Button>
        )}
        <Button
          variant="ghost"
          className="w-full h-9 text-red-600 hover:text-red-700 hover:bg-red-50 text-sm font-medium"
        >
          Mark as Lost
        </Button>
      </div>
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function CRMPage() {
  const [selectedDealId, setSelectedDealId] = useState<string | null>("d4")
  const [searchQuery, setSearchQuery] = useState("")

  const selectedDeal = DEALS.find((d) => d.id === selectedDealId) ?? null

  const openDeals = DEALS.filter(
    (d) => d.stage !== "won" && d.stage !== "lost"
  )
  const pipelineValue = openDeals.reduce((s, d) => s + d.value, 0)
  const wonThisQuarter = DEALS.filter((d) => d.stage === "won").reduce(
    (s, d) => s + d.value,
    0
  )
  const avgDealSize =
    openDeals.length > 0 ? Math.round(pipelineValue / openDeals.length) : 0

  const dealsForStage = (stage: Stage) =>
    DEALS.filter((d) => d.stage === stage)

  return (
    <div className="animate-fade-in flex flex-col h-full">
      {/* Page header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">CRM Pipeline</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            Track prospects from first contact through to signed contract
          </p>
        </div>
        <Button className="gap-2 bg-zinc-900 hover:bg-zinc-700 text-white shrink-0">
          <Plus className="h-4 w-4" />
          Add Deal
        </Button>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-4 gap-4 mb-6 shrink-0">
        {[
          {
            label: "Open Deals",
            value: String(openDeals.length),
            icon: Target,
            iconBg: "bg-blue-50",
            iconColor: "text-blue-600",
          },
          {
            label: "Pipeline Value",
            value: `£${pipelineValue.toLocaleString()}`,
            icon: PoundSterling,
            iconBg: "bg-emerald-50",
            iconColor: "text-emerald-600",
          },
          {
            label: "Won This Quarter",
            value: `£${wonThisQuarter.toLocaleString()}`,
            icon: TrendingUp,
            iconBg: "bg-violet-50",
            iconColor: "text-violet-600",
          },
          {
            label: "Avg Deal Size",
            value: `£${avgDealSize.toLocaleString()}`,
            icon: BarChart3Icon,
            iconBg: "bg-amber-50",
            iconColor: "text-amber-600",
          },
        ].map(({ label, value, icon: Icon, iconBg, iconColor }) => (
          <div key={label} className="rounded-xl border border-zinc-200 bg-white p-4 flex items-center gap-3">
            <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center shrink-0", iconBg)}>
              <Icon className={cn("h-4 w-4", iconColor)} />
            </div>
            <div>
              <p className="text-xs text-zinc-500">{label}</p>
              <p className="text-xl font-bold text-zinc-900 leading-tight tabular-nums">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-3 mb-4 shrink-0">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400 pointer-events-none" />
          <Input
            placeholder="Search deals, companies…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 pl-8 pr-3 text-sm"
          />
        </div>
        <button className="h-8 px-3 rounded-lg border border-zinc-200 bg-white text-xs text-zinc-600 hover:bg-zinc-50 flex items-center gap-1.5 transition-colors">
          <User className="h-3.5 w-3.5 text-zinc-400" />
          Owner
          <ChevronRight className="h-3 w-3 text-zinc-300 rotate-90" />
        </button>
        <button className="h-8 px-3 rounded-lg border border-zinc-200 bg-white text-xs text-zinc-600 hover:bg-zinc-50 flex items-center gap-1.5 transition-colors">
          <Filter className="h-3.5 w-3.5 text-zinc-400" />
          Filter
        </button>
      </div>

      {/* Kanban board */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden min-h-0">
        <div className="flex gap-4 h-full pb-4 min-w-max">
          {STAGES.map((stage) => (
            <KanbanColumn
              key={stage.id}
              stage={stage}
              deals={dealsForStage(stage.id)}
              selectedDealId={selectedDealId}
              onSelectDeal={(id) =>
                setSelectedDealId((prev) => (prev === id ? null : id))
              }
            />
          ))}
        </div>
      </div>

      {/* Deal detail panel */}
      {selectedDeal && (
        <>
          <div
            className="fixed inset-0 bg-black/10 z-40"
            onClick={() => setSelectedDealId(null)}
          />
          <DealDetailPanel
            deal={selectedDeal}
            onClose={() => setSelectedDealId(null)}
          />
        </>
      )}
    </div>
  )
}

// Inline icon component to avoid missing import
function BarChart3Icon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  )
}
