"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Handshake,
  TrendingUp,
  CheckCircle2,
  Clock,
  LayoutGrid,
  List,
  Columns3,
  Plus,
  Download,
  Search,
  Filter,
  ChevronDown,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  X,
} from "lucide-react"

// ─── Types ─────────────────────────────────────────────────────────

type Stage =
  | "Lead"
  | "Qualified"
  | "Assessment Booked"
  | "Assessment Complete"
  | "S106 In Progress"
  | "NE Registered"
  | "Matched"
  | "Quote Sent"
  | "Credits Reserved"
  | "Contract Signed"
  | "Payment Received"
  | "Credits Allocated"
  | "Completed"

type Side = "supply" | "demand"
type UnitType = "Nitrogen" | "Phosphorus" | "BNG"
type Catchment = "Solent" | "Test Valley"

interface Deal {
  id: string
  title: string
  stage: Stage
  contact: string
  side: Side
  unitType: UnitType
  units: string
  catchment: Catchment
  value: number
  displayValue: string
  probability: number
  broker: string
  brokerInitials: string
  expectedClose: string
}

type ViewMode = "v1" | "v2" | "v3"
type SortField = "id" | "title" | "stage" | "contact" | "value" | "probability" | "broker" | "expectedClose"
type SortDir = "asc" | "desc"

// ─── Stage Configuration ───────────────────────────────────────────

const STAGE_CONFIG: Record<Stage, { color: string; borderColor: string; bgColor: string; textColor: string; order: number }> = {
  "Lead":                { color: "bg-slate-400",   borderColor: "border-l-slate-400",   bgColor: "bg-slate-500/10",   textColor: "text-slate-700 dark:text-slate-300",   order: 0 },
  "Qualified":           { color: "bg-blue-400",    borderColor: "border-l-blue-400",    bgColor: "bg-blue-500/10",    textColor: "text-blue-700 dark:text-blue-300",     order: 1 },
  "Assessment Booked":   { color: "bg-cyan-400",    borderColor: "border-l-cyan-400",    bgColor: "bg-cyan-500/10",    textColor: "text-cyan-700 dark:text-cyan-300",     order: 2 },
  "Assessment Complete": { color: "bg-teal-400",    borderColor: "border-l-teal-400",    bgColor: "bg-teal-500/10",    textColor: "text-teal-700 dark:text-teal-300",     order: 3 },
  "S106 In Progress":    { color: "bg-indigo-400",  borderColor: "border-l-indigo-400",  bgColor: "bg-indigo-500/10",  textColor: "text-indigo-700 dark:text-indigo-300", order: 4 },
  "NE Registered":       { color: "bg-violet-400",  borderColor: "border-l-violet-400",  bgColor: "bg-violet-500/10",  textColor: "text-violet-700 dark:text-violet-300", order: 5 },
  "Matched":             { color: "bg-amber-400",   borderColor: "border-l-amber-400",   bgColor: "bg-amber-500/10",   textColor: "text-amber-700 dark:text-amber-300",   order: 6 },
  "Quote Sent":          { color: "bg-orange-400",  borderColor: "border-l-orange-400",  bgColor: "bg-orange-500/10",  textColor: "text-orange-700 dark:text-orange-300", order: 7 },
  "Credits Reserved":    { color: "bg-yellow-500",  borderColor: "border-l-yellow-500",  bgColor: "bg-yellow-500/10",  textColor: "text-yellow-700 dark:text-yellow-300", order: 8 },
  "Contract Signed":     { color: "bg-lime-500",    borderColor: "border-l-lime-500",    bgColor: "bg-lime-500/10",    textColor: "text-lime-700 dark:text-lime-300",     order: 9 },
  "Payment Received":    { color: "bg-green-500",   borderColor: "border-l-green-500",   bgColor: "bg-green-500/10",   textColor: "text-green-700 dark:text-green-300",   order: 10 },
  "Credits Allocated":   { color: "bg-emerald-500", borderColor: "border-l-emerald-500", bgColor: "bg-emerald-500/10", textColor: "text-emerald-700 dark:text-emerald-300", order: 11 },
  "Completed":           { color: "bg-emerald-600", borderColor: "border-l-emerald-600", bgColor: "bg-emerald-600/10", textColor: "text-emerald-800 dark:text-emerald-200", order: 12 },
}

const ACTIVE_STAGES: Stage[] = [
  "Lead", "Qualified", "Assessment Booked", "Assessment Complete",
  "S106 In Progress", "NE Registered", "Matched", "Quote Sent",
  "Credits Reserved", "Contract Signed", "Payment Received", "Credits Allocated",
]

const ALL_STAGES: Stage[] = [...ACTIVE_STAGES, "Completed"]

// ─── Broker Avatars ────────────────────────────────────────────────

const BROKER_STYLES: Record<string, string> = {
  JH: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  SC: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
  TJ: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
}

// ─── Unit Type Config ──────────────────────────────────────────────

const UNIT_TYPE_STYLES: Record<UnitType, string> = {
  Nitrogen: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
  Phosphorus: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20",
  BNG: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
}

// ─── Mock Deals ────────────────────────────────────────────────────

const DEALS: Deal[] = [
  { id: "D-0035", title: "Whiteley Farm Nitrogen Credits", stage: "Completed", contact: "Robert Whiteley", side: "supply", unitType: "Nitrogen", units: "120 kg N/yr", catchment: "Solent", value: 360000, displayValue: "£360,000", probability: 100, broker: "James Harris", brokerInitials: "JH", expectedClose: "Nov 2025" },
  { id: "D-0036", title: "Botley Meadows Phase 1", stage: "NE Registered", contact: "Margaret Thornton", side: "supply", unitType: "Nitrogen", units: "85 kg N/yr", catchment: "Solent", value: 212500, displayValue: "£212,500", probability: 75, broker: "James Harris", brokerInitials: "JH", expectedClose: "Apr 2026" },
  { id: "D-0037", title: "Hamble Wetlands BNG", stage: "S106 In Progress", contact: "John Hamble", side: "supply", unitType: "BNG", units: "14.2 BNG units", catchment: "Solent", value: 198800, displayValue: "£198,800", probability: 65, broker: "James Harris", brokerInitials: "JH", expectedClose: "May 2026" },
  { id: "D-0038", title: "Manor Fields N Credits", stage: "Credits Reserved", contact: "Taylor Wimpey", side: "demand", unitType: "Nitrogen", units: "45 kg N/yr", catchment: "Solent", value: 135000, displayValue: "£135,000", probability: 80, broker: "James Harris", brokerInitials: "JH", expectedClose: "Mar 2026" },
  { id: "D-0039", title: "Riverside Meadows", stage: "Assessment Booked", contact: "Susan Marsh", side: "supply", unitType: "Nitrogen", units: "TBD", catchment: "Solent", value: 180000, displayValue: "Est. £180,000", probability: 40, broker: "Sarah Croft", brokerInitials: "SC", expectedClose: "Jun 2026" },
  { id: "D-0040", title: "Fareham Creek Wetland", stage: "Qualified", contact: "Peter Langstone", side: "supply", unitType: "Nitrogen", units: "Est. 60 kg N/yr", catchment: "Solent", value: 150000, displayValue: "£150,000", probability: 35, broker: "Sarah Croft", brokerInitials: "SC", expectedClose: "Jul 2026" },
  { id: "D-0041", title: "Bellway Whiteley Development", stage: "Quote Sent", contact: "Bellway Homes", side: "demand", unitType: "Nitrogen", units: "55 kg N/yr", catchment: "Solent", value: 165000, displayValue: "£165,000", probability: 70, broker: "James Harris", brokerInitials: "JH", expectedClose: "Apr 2026" },
  { id: "D-0042", title: "Taylor Wimpey Hedge End", stage: "Matched", contact: "Taylor Wimpey", side: "demand", unitType: "Nitrogen", units: "30 kg N/yr", catchment: "Solent", value: 90000, displayValue: "£90,000", probability: 60, broker: "James Harris", brokerInitials: "JH", expectedClose: "May 2026" },
  { id: "D-0043", title: "Eastleigh Meadow P Credits", stage: "Lead", contact: "George Palmer", side: "supply", unitType: "Phosphorus", units: "Est. 40 kg P/yr", catchment: "Solent", value: 100000, displayValue: "Est. £100,000", probability: 15, broker: "Sarah Croft", brokerInitials: "SC", expectedClose: "Aug 2026" },
  { id: "D-0044", title: "Wickham Solar Farm BNG", stage: "Lead", contact: "Helen Wickham", side: "supply", unitType: "BNG", units: "Est. 8 BNG", catchment: "Solent", value: 96000, displayValue: "Est. £96,000", probability: 20, broker: "Tom Jenkins", brokerInitials: "TJ", expectedClose: "Sep 2026" },
  { id: "D-0045", title: "Persimmon North Whiteley", stage: "Qualified", contact: "Persimmon Homes", side: "demand", unitType: "Nitrogen", units: "75 kg N/yr", catchment: "Solent", value: 225000, displayValue: "£225,000", probability: 40, broker: "James Harris", brokerInitials: "JH", expectedClose: "Jun 2026" },
  { id: "D-0046", title: "Test Valley Grassland", stage: "Assessment Complete", contact: "Ian Stockbridge", side: "supply", unitType: "Nitrogen", units: "95 kg N/yr", catchment: "Test Valley", value: 237500, displayValue: "£237,500", probability: 55, broker: "Tom Jenkins", brokerInitials: "TJ", expectedClose: "May 2026" },
  { id: "D-0047", title: "Havant Coastal Wetland", stage: "Lead", contact: "Claire Brighton", side: "supply", unitType: "Nitrogen", units: "Est. 50 kg N/yr", catchment: "Solent", value: 125000, displayValue: "Est. £125,000", probability: 10, broker: "Sarah Croft", brokerInitials: "SC", expectedClose: "Oct 2026" },
  { id: "D-0048", title: "Linden Homes Botley", stage: "Contract Signed", contact: "Linden Homes", side: "demand", unitType: "Nitrogen", units: "38 kg N/yr", catchment: "Solent", value: 114000, displayValue: "£114,000", probability: 90, broker: "James Harris", brokerInitials: "JH", expectedClose: "Mar 2026" },
  { id: "D-0049", title: "Curdridge Farm Conversion", stage: "Qualified", contact: "William Curdridge", side: "supply", unitType: "Nitrogen", units: "Est. 70 kg N/yr", catchment: "Solent", value: 175000, displayValue: "£175,000", probability: 30, broker: "Sarah Croft", brokerInitials: "SC", expectedClose: "Jul 2026" },
  { id: "D-0050", title: "Miller Homes Fair Oak", stage: "Payment Received", contact: "Miller Homes", side: "demand", unitType: "Nitrogen", units: "25 kg N/yr", catchment: "Solent", value: 75000, displayValue: "£75,000", probability: 95, broker: "James Harris", brokerInitials: "JH", expectedClose: "Mar 2026" },
  { id: "D-0051", title: "Hedge End Extension BNG", stage: "Credits Allocated", contact: "David Wilson Homes", side: "demand", unitType: "BNG", units: "6.5 BNG", catchment: "Solent", value: 78000, displayValue: "£78,000", probability: 98, broker: "Sarah Croft", brokerInitials: "SC", expectedClose: "Mar 2026" },
  { id: "D-0052", title: "Bishop's Waltham Pasture", stage: "Assessment Booked", contact: "Catherine Wells", side: "supply", unitType: "Nitrogen", units: "TBD", catchment: "Solent", value: 200000, displayValue: "Est. £200,000", probability: 35, broker: "Tom Jenkins", brokerInitials: "TJ", expectedClose: "Jun 2026" },
]

// ─── Utility Functions ─────────────────────────────────────────────

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `£${(value / 1_000_000).toFixed(2)}m`
  return `£${value.toLocaleString("en-GB")}`
}

function getDealsByStage(deals: Deal[], stage: Stage): Deal[] {
  return deals.filter((d) => d.stage === stage)
}

function stageTotal(deals: Deal[]): number {
  return deals.reduce((sum, d) => sum + d.value, 0)
}

// ─── Sub Components ────────────────────────────────────────────────

function BrokerAvatar({ initials, name }: { initials: string; name?: string }) {
  const style = BROKER_STYLES[initials] ?? "bg-muted text-muted-foreground"
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold tracking-wide shrink-0 cursor-default ${style}`}
          >
            {initials}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          {name ?? initials}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

function SideIndicator({ side }: { side: Side }) {
  return (
    <span
      className={`inline-block h-2 w-2 rounded-full shrink-0 ${
        side === "supply" ? "bg-green-500" : "bg-blue-500"
      }`}
      title={side === "supply" ? "Supply" : "Demand"}
    />
  )
}

function StageBadge({ stage, size = "sm" }: { stage: Stage; size?: "sm" | "xs" }) {
  const config = STAGE_CONFIG[stage]
  const sizeClass = size === "xs"
    ? "text-[10px] px-1.5 py-0"
    : "text-[11px] px-2 py-0.5"
  return (
    <span
      className={`inline-flex items-center rounded border font-semibold whitespace-nowrap ${sizeClass} ${config.bgColor} ${config.textColor} border-current/10`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${config.color} mr-1.5`} />
      {stage}
    </span>
  )
}

function UnitBadge({ unitType, units }: { unitType: UnitType; units: string }) {
  return (
    <span
      className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-semibold ${UNIT_TYPE_STYLES[unitType]}`}
    >
      {units}
    </span>
  )
}

function CatchmentPill({ catchment }: { catchment: Catchment }) {
  return (
    <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground border border-border">
      {catchment}
    </span>
  )
}

function ProbabilityPill({ probability }: { probability: number }) {
  const color =
    probability >= 80
      ? "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20"
      : probability >= 50
      ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20"
      : "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20"
  return (
    <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-bold tabular-nums ${color}`}>
      {probability}%
    </span>
  )
}

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  accent,
}: {
  label: string
  value: string
  sub?: string
  icon: React.ElementType
  accent: string
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-lg border border-border bg-card">
      <div className={`p-2 rounded-md ${accent}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">
          {label}
        </p>
        <p className="text-lg font-bold text-foreground leading-tight">{value}</p>
        {sub && (
          <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>
        )}
      </div>
    </div>
  )
}

// ─── Filter Bar ────────────────────────────────────────────────────

function FilterBar({
  filters,
  setFilters,
  showFilters,
  setShowFilters,
}: {
  filters: {
    stage: string
    contact: string
    broker: string
    unitType: string
    catchment: string
  }
  setFilters: React.Dispatch<React.SetStateAction<typeof filters>>
  showFilters: boolean
  setShowFilters: React.Dispatch<React.SetStateAction<boolean>>
}) {
  const hasActiveFilters = Object.values(filters).some((v) => v !== "all" && v !== "")

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Button
          variant={showFilters ? "secondary" : "outline"}
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className="text-xs gap-1.5"
        >
          <Filter className="h-3 w-3" />
          Filters
          {hasActiveFilters && (
            <span className="ml-1 h-4 w-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center">
              {Object.values(filters).filter((v) => v !== "all" && v !== "").length}
            </span>
          )}
          <ChevronDown className={`h-3 w-3 transition-transform ${showFilters ? "rotate-180" : ""}`} />
        </Button>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              setFilters({ stage: "all", contact: "", broker: "all", unitType: "all", catchment: "all" })
            }
            className="text-xs text-muted-foreground gap-1"
          >
            <X className="h-3 w-3" />
            Clear
          </Button>
        )}
      </div>
      {showFilters && (
        <div className="flex items-end gap-3 flex-wrap p-3 rounded-lg border border-border bg-muted/30">
          <div className="space-y-1">
            <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Stage</label>
            <Select value={filters.stage} onValueChange={(v) => setFilters((p) => ({ ...p, stage: v }))}>
              <SelectTrigger className="h-8 w-40 text-xs">
                <SelectValue placeholder="All Stages" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stages</SelectItem>
                {ALL_STAGES.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Contact</label>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
              <input
                type="text"
                value={filters.contact}
                onChange={(e) => setFilters((p) => ({ ...p, contact: e.target.value }))}
                placeholder="Search contact..."
                className="h-8 w-44 text-xs rounded-md border border-input bg-transparent pl-7 pr-3 focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Broker</label>
            <Select value={filters.broker} onValueChange={(v) => setFilters((p) => ({ ...p, broker: v }))}>
              <SelectTrigger className="h-8 w-40 text-xs">
                <SelectValue placeholder="All Brokers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Brokers</SelectItem>
                <SelectItem value="James Harris">James Harris</SelectItem>
                <SelectItem value="Sarah Croft">Sarah Croft</SelectItem>
                <SelectItem value="Tom Jenkins">Tom Jenkins</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Unit Type</label>
            <Select value={filters.unitType} onValueChange={(v) => setFilters((p) => ({ ...p, unitType: v }))}>
              <SelectTrigger className="h-8 w-36 text-xs">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="Nitrogen">Nitrogen</SelectItem>
                <SelectItem value="Phosphorus">Phosphorus</SelectItem>
                <SelectItem value="BNG">BNG</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Catchment</label>
            <Select value={filters.catchment} onValueChange={(v) => setFilters((p) => ({ ...p, catchment: v }))}>
              <SelectTrigger className="h-8 w-36 text-xs">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Catchments</SelectItem>
                <SelectItem value="Solent">Solent</SelectItem>
                <SelectItem value="Test Valley">Test Valley</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── V1: Kanban Board ──────────────────────────────────────────────

function KanbanDealCard({ deal }: { deal: Deal }) {
  const stageConfig = STAGE_CONFIG[deal.stage]
  return (
    <Link
      href={`/admin/brokerage-mockups/deals/${deal.id}`}
      className="block text-inherit no-underline"
    >
      <div
        className={`rounded-md border border-border bg-card p-3 hover:bg-accent/40 transition-all cursor-pointer hover:shadow-sm border-l-[3px] ${stageConfig.borderColor}`}
      >
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <span className="text-[10px] text-muted-foreground font-mono">{deal.id}</span>
          <BrokerAvatar initials={deal.brokerInitials} name={deal.broker} />
        </div>
        <p className="text-[12px] font-semibold text-foreground leading-tight mb-2">
          {deal.title}
        </p>
        <div className="flex items-center gap-1.5 mb-2">
          <SideIndicator side={deal.side} />
          <span className="text-[11px] text-foreground/80 font-medium truncate">
            {deal.contact}
          </span>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap mb-2">
          <UnitBadge unitType={deal.unitType} units={deal.units} />
          <CatchmentPill catchment={deal.catchment} />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[12px] font-bold tabular-nums text-foreground">
            {deal.displayValue}
          </span>
          <ProbabilityPill probability={deal.probability} />
        </div>
      </div>
    </Link>
  )
}

function KanbanColumn({
  stage,
  deals,
  isCollapsed,
}: {
  stage: Stage
  deals: Deal[]
  isCollapsed?: boolean
}) {
  const config = STAGE_CONFIG[stage]
  const total = stageTotal(deals)

  if (isCollapsed) {
    return (
      <div className="flex flex-col w-48 shrink-0 opacity-80">
        <div className="rounded-lg border border-border bg-muted/30 px-3 py-3">
          <div className="flex items-center gap-2 mb-1">
            <div className={`h-2 w-2 rounded-full ${config.color}`} />
            <span className="text-[12px] font-semibold text-foreground">{stage}</span>
          </div>
          <div className="flex items-center gap-2 pl-4">
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
              {deals.length}
            </span>
            <span className="text-[11px] text-muted-foreground">{formatCurrency(total)}</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col w-72 shrink-0">
      <div className="rounded-t-lg border border-b-0 border-border bg-muted/50 px-4 py-3">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <div className={`h-2 w-2 rounded-full ${config.color}`} />
            <span className="text-[13px] font-semibold text-foreground">{stage}</span>
          </div>
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
            {deals.length}
          </span>
        </div>
        <p className="text-[11px] text-muted-foreground pl-4">
          Value: <span className="text-foreground/70 font-medium">{formatCurrency(total)}</span>
        </p>
      </div>
      <div className="flex-1 rounded-b-lg border border-t-0 border-border bg-background/50 overflow-hidden">
        <ScrollArea className="h-full max-h-[calc(100vh-380px)]">
          <div className="p-2 flex flex-col gap-2">
            {deals.length === 0 ? (
              <p className="text-[11px] text-muted-foreground text-center py-6 italic">
                No deals
              </p>
            ) : (
              deals.map((deal) => (
                <KanbanDealCard key={deal.id} deal={deal} />
              ))
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}

function KanbanView({ deals }: { deals: Deal[] }) {
  return (
    <div className="px-6 py-4">
      <div className="flex gap-3 items-start overflow-x-auto pb-4">
        {ACTIVE_STAGES.map((stage) => (
          <KanbanColumn
            key={stage}
            stage={stage}
            deals={getDealsByStage(deals, stage)}
          />
        ))}
        <KanbanColumn
          stage="Completed"
          deals={getDealsByStage(deals, "Completed")}
          isCollapsed
        />
      </div>
    </div>
  )
}

// ─── V2: Table/List View ───────────────────────────────────────────

function SortHeader({
  label,
  field,
  currentSort,
  currentDir,
  onSort,
}: {
  label: string
  field: SortField
  currentSort: SortField
  currentDir: SortDir
  onSort: (field: SortField) => void
}) {
  const isActive = currentSort === field
  return (
    <button
      onClick={() => onSort(field)}
      className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors group"
    >
      {label}
      {isActive ? (
        currentDir === "asc" ? (
          <ArrowUp className="h-3 w-3 text-foreground" />
        ) : (
          <ArrowDown className="h-3 w-3 text-foreground" />
        )
      ) : (
        <ArrowUpDown className="h-3 w-3 opacity-0 group-hover:opacity-50 transition-opacity" />
      )}
    </button>
  )
}

function TableView({ deals }: { deals: Deal[] }) {
  const router = useRouter()
  const [sortField, setSortField] = useState<SortField>("id")
  const [sortDir, setSortDir] = useState<SortDir>("asc")

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDir("asc")
    }
  }

  const sorted = [...deals].sort((a, b) => {
    const dir = sortDir === "asc" ? 1 : -1
    switch (sortField) {
      case "id":
        return dir * a.id.localeCompare(b.id)
      case "title":
        return dir * a.title.localeCompare(b.title)
      case "stage":
        return dir * (STAGE_CONFIG[a.stage].order - STAGE_CONFIG[b.stage].order)
      case "contact":
        return dir * a.contact.localeCompare(b.contact)
      case "value":
        return dir * (a.value - b.value)
      case "probability":
        return dir * (a.probability - b.probability)
      case "broker":
        return dir * a.broker.localeCompare(b.broker)
      case "expectedClose":
        return dir * a.expectedClose.localeCompare(b.expectedClose)
      default:
        return 0
    }
  })

  return (
    <div className="px-6 py-4">
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="px-3 py-2.5 w-8">
                  <input type="checkbox" className="rounded border-border" disabled />
                </th>
                <th className="px-3 py-2.5">
                  <SortHeader label="Deal" field="id" currentSort={sortField} currentDir={sortDir} onSort={handleSort} />
                </th>
                <th className="px-3 py-2.5">
                  <SortHeader label="Title" field="title" currentSort={sortField} currentDir={sortDir} onSort={handleSort} />
                </th>
                <th className="px-3 py-2.5">
                  <SortHeader label="Stage" field="stage" currentSort={sortField} currentDir={sortDir} onSort={handleSort} />
                </th>
                <th className="px-3 py-2.5">
                  <SortHeader label="Contact" field="contact" currentSort={sortField} currentDir={sortDir} onSort={handleSort} />
                </th>
                <th className="px-3 py-2.5">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Units</span>
                </th>
                <th className="px-3 py-2.5">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Catchment</span>
                </th>
                <th className="px-3 py-2.5">
                  <SortHeader label="Value" field="value" currentSort={sortField} currentDir={sortDir} onSort={handleSort} />
                </th>
                <th className="px-3 py-2.5">
                  <SortHeader label="Prob." field="probability" currentSort={sortField} currentDir={sortDir} onSort={handleSort} />
                </th>
                <th className="px-3 py-2.5">
                  <SortHeader label="Broker" field="broker" currentSort={sortField} currentDir={sortDir} onSort={handleSort} />
                </th>
                <th className="px-3 py-2.5">
                  <SortHeader label="Close" field="expectedClose" currentSort={sortField} currentDir={sortDir} onSort={handleSort} />
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((deal, i) => (
                <tr
                  key={deal.id}
                  onClick={() => router.push(`/admin/brokerage-mockups/deals/${deal.id}`)}
                  className={`border-b border-border last:border-0 hover:bg-accent/40 cursor-pointer transition-colors ${
                    i % 2 === 0 ? "bg-background" : "bg-muted/20"
                  }`}
                >
                  <td className="px-3 py-2.5">
                    <input type="checkbox" className="rounded border-border" disabled onClick={(e) => e.stopPropagation()} />
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="text-[11px] font-mono text-muted-foreground">{deal.id}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="text-[12px] font-semibold text-foreground">{deal.title}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <StageBadge stage={deal.stage} size="xs" />
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <SideIndicator side={deal.side} />
                      <Link
                        href="/admin/brokerage-mockups/contacts"
                        onClick={(e) => e.stopPropagation()}
                        className="text-[12px] text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        {deal.contact}
                      </Link>
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <UnitBadge unitType={deal.unitType} units={deal.units} />
                  </td>
                  <td className="px-3 py-2.5">
                    <CatchmentPill catchment={deal.catchment} />
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="text-[12px] font-bold tabular-nums">{deal.displayValue}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <ProbabilityPill probability={deal.probability} />
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <BrokerAvatar initials={deal.brokerInitials} name={deal.broker} />
                      <span className="text-[11px] text-muted-foreground hidden xl:inline">{deal.broker}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="text-[11px] text-muted-foreground">{deal.expectedClose}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ─── V3: Combined (mini-kanban summary + table) ────────────────────

function MiniKanbanSummary({ deals }: { deals: Deal[] }) {
  return (
    <div className="px-6 py-4">
      <div className="flex gap-2 overflow-x-auto pb-2">
        {ALL_STAGES.map((stage) => {
          const stageDeals = getDealsByStage(deals, stage)
          const config = STAGE_CONFIG[stage]
          const total = stageTotal(stageDeals)
          const isActive = stageDeals.length > 0
          return (
            <div
              key={stage}
              className={`shrink-0 rounded-lg border px-3 py-2 min-w-[120px] transition-all ${
                isActive
                  ? "border-border bg-card"
                  : "border-border/50 bg-muted/20 opacity-60"
              }`}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <div className={`h-2 w-2 rounded-full ${config.color}`} />
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide truncate">
                  {stage}
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-base font-bold text-foreground tabular-nums">
                  {stageDeals.length}
                </span>
                <span className="text-[10px] text-muted-foreground font-medium tabular-nums">
                  {formatCurrency(total)}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function CombinedView({ deals }: { deals: Deal[] }) {
  return (
    <>
      <MiniKanbanSummary deals={deals} />
      <Separator />
      <TableView deals={deals} />
    </>
  )
}

// ─── Page Component ────────────────────────────────────────────────

export default function DealsPipelinePage() {
  const [viewMode, setViewMode] = useState<ViewMode>("v1")
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState({
    stage: "all",
    contact: "",
    broker: "all",
    unitType: "all",
    catchment: "all",
  })

  // Apply filters
  const filteredDeals = DEALS.filter((d) => {
    if (filters.stage !== "all" && d.stage !== filters.stage) return false
    if (filters.contact && !d.contact.toLowerCase().includes(filters.contact.toLowerCase())) return false
    if (filters.broker !== "all" && d.broker !== filters.broker) return false
    if (filters.unitType !== "all" && d.unitType !== filters.unitType) return false
    if (filters.catchment !== "all" && d.catchment !== filters.catchment) return false
    return true
  })

  // Computed stats (always from full dataset)
  const totalDeals = DEALS.length
  const pipelineValue = DEALS.reduce((sum, d) => sum + d.value, 0)
  const completedDeals = DEALS.filter(
    (d) => d.stage === "Completed" || d.stage === "Credits Allocated"
  ).length
  const underOfferDeals = DEALS.filter(
    (d) => d.stage === "Quote Sent" || d.stage === "Credits Reserved" || d.stage === "Contract Signed"
  ).length

  const viewButtons: { key: ViewMode; label: string; icon: React.ElementType }[] = [
    { key: "v1", label: "Kanban", icon: Columns3 },
    { key: "v2", label: "Table", icon: List },
    { key: "v3", label: "Combined", icon: LayoutGrid },
  ]

  return (
    <div className="min-h-screen">
      {/* ─── Sticky Header ────────────────────────── */}
      <div className="sticky top-14 z-30 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-screen-2xl mx-auto px-6 pt-4 pb-3">
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <Handshake className="h-4 w-4 text-primary" />
                <span className="text-[11px] font-semibold text-primary uppercase tracking-widest">
                  BNG / Nutrient Credits
                </span>
                <span className="text-border text-[11px]">|</span>
                <span className="text-[11px] text-muted-foreground uppercase tracking-widest">
                  Solent Catchment
                </span>
              </div>
              <h1 className="text-xl font-bold text-foreground tracking-tight">
                Deals Pipeline
              </h1>
              <p className="text-[12px] text-muted-foreground mt-0.5">
                Live view -- {new Date("2026-03-07").toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="text-xs gap-1.5">
                <Download className="h-3 w-3" />
                Export
              </Button>
              <Button size="sm" className="text-xs gap-1.5">
                <Plus className="h-3 w-3" />
                New Deal
              </Button>
            </div>
          </div>

          {/* ─── Stat Cards ──────────────────────────── */}
          <div className="flex items-center gap-3 flex-wrap mb-3">
            <StatCard
              label="Total Deals"
              value={String(totalDeals)}
              sub={`${DEALS.filter((d) => d.stage !== "Completed").length} active`}
              icon={Handshake}
              accent="bg-blue-500/10 text-blue-600 dark:text-blue-400"
            />
            <StatCard
              label="Pipeline Value"
              value={formatCurrency(pipelineValue)}
              sub="All stages combined"
              icon={TrendingUp}
              accent="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            />
            <StatCard
              label="Completed"
              value={String(completedDeals)}
              sub="Credits Allocated + Completed"
              icon={CheckCircle2}
              accent="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            />
            <StatCard
              label="Under Offer"
              value={String(underOfferDeals)}
              sub="Quote Sent to Contract Signed"
              icon={Clock}
              accent="bg-amber-500/10 text-amber-600 dark:text-amber-400"
            />
          </div>

          {/* ─── View Toggle + Filters ───────────────── */}
          <div className="flex items-start justify-between gap-4">
            <FilterBar
              filters={filters}
              setFilters={setFilters}
              showFilters={showFilters}
              setShowFilters={setShowFilters}
            />
            <div className="flex items-center shrink-0">
              <div className="flex items-center rounded-lg border border-border bg-muted/50 p-0.5">
                {viewButtons.map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    onClick={() => setViewMode(key)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                      viewMode === key
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Content Area ─────────────────────────── */}
      <div className="max-w-screen-2xl mx-auto">
        {filteredDeals.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <Search className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm font-medium text-foreground mb-1">No deals found</p>
              <p className="text-xs text-muted-foreground">
                Adjust your filters to see results
              </p>
            </div>
          </div>
        ) : (
          <>
            {viewMode === "v1" && <KanbanView deals={filteredDeals} />}
            {viewMode === "v2" && <TableView deals={filteredDeals} />}
            {viewMode === "v3" && <CombinedView deals={filteredDeals} />}
          </>
        )}
      </div>

      {/* ─── Footer ───────────────────────────────── */}
      <div className="max-w-screen-2xl mx-auto px-6 pb-6">
        <Separator className="mb-4" />
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>
            Ironheart Brokerage -- BNG / Nutrient Credits -- Solent & Test Valley
          </span>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-green-500 inline-block" />
              Supply side
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-blue-500 inline-block" />
              Demand side
            </span>
            <Separator orientation="vertical" className="h-3" />
            <span>
              Showing {filteredDeals.length} of {DEALS.length} deals
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
