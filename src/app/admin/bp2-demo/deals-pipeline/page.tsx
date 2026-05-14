"use client"

import Link from "next/link"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Building2,
  TrendingUp,
  CheckCircle2,
  Clock,
  LayoutGrid,
  ChevronRight,
  MapPin,
  User,
  Banknote,
} from "lucide-react"

type PropertyType = "Office" | "Retail" | "Industrial" | "Trade Counter" | "Leisure"
type DealValueType = "pa" | "sale"
type Stage = "instruction" | "under-offer" | "exchanged" | "completed"

interface Deal {
  id: string
  address: string
  propertyType: PropertyType
  dealValue: number
  dealValueType: DealValueType
  counterpartyLabel: "Tenant" | "Buyer" | "Vendor"
  counterpartyName: string
  daysInStage: number
  agentInitials: string
}

const PIPELINE: Record<Stage, Deal[]> = {
  instruction: [
    {
      id: "i1",
      address: "Unit 4, Kingsway, Swansea",
      propertyType: "Office",
      dealValue: 28000,
      dealValueType: "pa",
      counterpartyLabel: "Tenant",
      counterpartyName: "Davies & Partners",
      daysInStage: 3,
      agentInitials: "DB",
    },
    {
      id: "i2",
      address: "47 Queen Street, Cardiff",
      propertyType: "Retail",
      dealValue: 45000,
      dealValueType: "pa",
      counterpartyLabel: "Vendor",
      counterpartyName: "Cardiff Retail Ltd",
      daysInStage: 7,
      agentInitials: "RJ",
    },
    {
      id: "i3",
      address: "Riverside Business Park, Newport",
      propertyType: "Industrial",
      dealValue: 62000,
      dealValueType: "pa",
      counterpartyLabel: "Tenant",
      counterpartyName: "Newport Logistics",
      daysInStage: 2,
      agentInitials: "DB",
    },
  ],
  "under-offer": [
    {
      id: "u1",
      address: "Ground Floor, Wind Street, Swansea",
      propertyType: "Leisure",
      dealValue: 38500,
      dealValueType: "pa",
      counterpartyLabel: "Tenant",
      counterpartyName: "Cornerstone Bars Ltd",
      daysInStage: 18,
      agentInitials: "DB",
    },
    {
      id: "u2",
      address: "Brunel Way, Baglan Energy Park",
      propertyType: "Industrial",
      dealValue: 1200000,
      dealValueType: "sale",
      counterpartyLabel: "Buyer",
      counterpartyName: "Capital Industrial Fund",
      daysInStage: 24,
      agentInitials: "RJ",
    },
    {
      id: "u3",
      address: "Station Road, Neath",
      propertyType: "Trade Counter",
      dealValue: 22000,
      dealValueType: "pa",
      counterpartyLabel: "Tenant",
      counterpartyName: "Toolstation Holdings",
      daysInStage: 12,
      agentInitials: "MW",
    },
    {
      id: "u4",
      address: "Ocean Way, Cardiff",
      propertyType: "Office",
      dealValue: 3400000,
      dealValueType: "sale",
      counterpartyLabel: "Buyer",
      counterpartyName: "Welsh Development Corp",
      daysInStage: 31,
      agentInitials: "DB",
    },
  ],
  exchanged: [
    {
      id: "e1",
      address: "Pontardawe Business Centre",
      propertyType: "Office",
      dealValue: 18500,
      dealValueType: "pa",
      counterpartyLabel: "Tenant",
      counterpartyName: "Hughes & Co Solicitors",
      daysInStage: 45,
      agentInitials: "DB",
    },
    {
      id: "e2",
      address: "Cross Hands Food Park",
      propertyType: "Industrial",
      dealValue: 875000,
      dealValueType: "sale",
      counterpartyLabel: "Buyer",
      counterpartyName: "Greens Logistics",
      daysInStage: 38,
      agentInitials: "RJ",
    },
  ],
  completed: [
    {
      id: "c1",
      address: "High Street, Llanelli",
      propertyType: "Retail",
      dealValue: 26000,
      dealValueType: "pa",
      counterpartyLabel: "Tenant",
      counterpartyName: "Greggs PLC",
      daysInStage: 67,
      agentInitials: "DB",
    },
    {
      id: "c2",
      address: "Bridgend Trade Park",
      propertyType: "Trade Counter",
      dealValue: 34000,
      dealValueType: "pa",
      counterpartyLabel: "Tenant",
      counterpartyName: "Screwfix Ltd",
      daysInStage: 52,
      agentInitials: "MW",
    },
    {
      id: "c3",
      address: "Celtic Business Park, Port Talbot",
      propertyType: "Industrial",
      dealValue: 2100000,
      dealValueType: "sale",
      counterpartyLabel: "Buyer",
      counterpartyName: "Atlantic Property Partners",
      daysInStage: 89,
      agentInitials: "RJ",
    },
    {
      id: "c4",
      address: "Sketty Lane, Swansea",
      propertyType: "Office",
      dealValue: 14500,
      dealValueType: "pa",
      counterpartyLabel: "Tenant",
      counterpartyName: "Apex Accountants",
      daysInStage: 71,
      agentInitials: "DB",
    },
  ],
}

function formatValue(value: number, type: DealValueType): string {
  if (type === "sale") {
    if (value >= 1_000_000) return `£${(value / 1_000_000).toFixed(2).replace(/\.00$/, "")}m`
    return `£${value.toLocaleString("en-GB")}`
  }
  return `£${value.toLocaleString("en-GB")} pa`
}

function formatColumnValue(deals: Deal[]): string {
  const total = deals.reduce((sum, d) => sum + d.dealValue, 0)
  if (total >= 1_000_000) return `£${(total / 1_000_000).toFixed(2)}m`
  return `£${total.toLocaleString("en-GB")}`
}

function allDeals(): Deal[] {
  return [
    ...PIPELINE.instruction,
    ...PIPELINE["under-offer"],
    ...PIPELINE.exchanged,
    ...PIPELINE.completed,
  ]
}

function totalPipelineValue(): string {
  const total = allDeals().reduce((sum, d) => sum + d.dealValue, 0)
  if (total >= 1_000_000) return `£${(total / 1_000_000).toFixed(2)}m`
  return `£${total.toLocaleString("en-GB")}`
}

const PROPERTY_TYPE_STYLES: Record<PropertyType, string> = {
  Office: "bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20",
  Retail: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20",
  Industrial: "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20",
  "Trade Counter": "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20",
  Leisure: "bg-teal-500/10 text-teal-700 dark:text-teal-400 border-teal-500/20",
}

const AGENT_AVATAR_STYLES: Record<string, string> = {
  DB: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  RJ: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
  MW: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
}

const COLUMN_CONFIG: Record<Stage, { label: string; dotColor: string }> = {
  instruction: { label: "Instruction", dotColor: "bg-blue-500" },
  "under-offer": { label: "Under Offer", dotColor: "bg-amber-500" },
  exchanged: { label: "Exchanged", dotColor: "bg-violet-500" },
  completed: { label: "Completed", dotColor: "bg-emerald-500" },
}

function AgentAvatar({ initials }: { initials: string }) {
  const style = AGENT_AVATAR_STYLES[initials] ?? "bg-muted text-muted-foreground"
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
          Agent: {initials}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

function DaysChip({ days }: { days: number }) {
  const isOverdue = days > 30
  const isWarning = days > 14 && days <= 30
  const style = isOverdue
    ? "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
    : isWarning
    ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20"
    : "bg-muted text-muted-foreground border-border"
  return (
    <div className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-semibold tabular-nums ${style}`}>
      <Clock className="h-2.5 w-2.5" />
      {days}d
    </div>
  )
}

function PropertyTypeBadge({ type }: { type: PropertyType }) {
  return (
    <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase ${PROPERTY_TYPE_STYLES[type]}`}>
      {type}
    </span>
  )
}

function DealCard({ deal }: { deal: Deal }) {
  return (
    <div className="rounded-md border border-border bg-card p-3.5 hover:bg-accent/40 transition-colors cursor-pointer">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-start gap-1.5 min-w-0">
          <MapPin className="h-3 w-3 text-muted-foreground mt-0.5 shrink-0" />
          <p className="text-[12px] font-semibold text-foreground leading-tight">{deal.address}</p>
        </div>
        <AgentAvatar initials={deal.agentInitials} />
      </div>
      <div className="flex items-center gap-1.5 flex-wrap mb-2">
        <PropertyTypeBadge type={deal.propertyType} />
        <DaysChip days={deal.daysInStage} />
      </div>
      <div className="flex items-center gap-1.5 mb-1.5">
        <Banknote className="h-3 w-3 text-muted-foreground shrink-0" />
        <span className="text-[13px] font-bold tabular-nums text-foreground">
          {formatValue(deal.dealValue, deal.dealValueType)}
        </span>
        {deal.dealValueType === "sale" && (
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide ml-0.5">Sale</span>
        )}
      </div>
      <div className="flex items-center gap-1.5">
        <User className="h-3 w-3 text-muted-foreground shrink-0" />
        <span className="text-[11px] text-muted-foreground font-medium">{deal.counterpartyLabel}:</span>
        <span className="text-[11px] text-foreground/70 font-medium truncate">{deal.counterpartyName}</span>
      </div>
    </div>
  )
}

function KanbanColumn({ stage }: { stage: Stage }) {
  const deals = PIPELINE[stage]
  const config = COLUMN_CONFIG[stage]
  return (
    <div className="flex flex-col w-72 shrink-0">
      <div className="rounded-t-lg border border-b-0 border-border bg-muted/50 px-4 py-3">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <div className={`h-2 w-2 rounded-full ${config.dotColor}`} />
            <span className="text-[13px] font-semibold text-foreground">{config.label}</span>
          </div>
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
            {deals.length}
          </span>
        </div>
        <p className="text-[11px] text-muted-foreground pl-4">
          Pipeline: <span className="text-foreground/70 font-medium">{formatColumnValue(deals)}</span>
        </p>
      </div>
      <div className="flex-1 rounded-b-lg border border-t-0 border-border bg-background/50 overflow-hidden">
        <ScrollArea className="h-full max-h-[calc(100vh-300px)]">
          <div className="p-2.5 flex flex-col gap-2">
            {deals.map((deal) => (
              <Link key={deal.id} href={`/admin/bp2-demo/deals-pipeline/${deal.id}`}>
                <DealCard deal={deal} />
              </Link>
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}

function StatCard({ label, value, sub, icon: Icon, accent }: {
  label: string; value: string; sub?: string; icon: React.ElementType; accent: string
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-lg border border-border bg-card">
      <div className={`p-2 rounded-md ${accent}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">{label}</p>
        <p className="text-lg font-bold text-foreground leading-tight">{value}</p>
        {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

function PipelineLegend() {
  const stages: Stage[] = ["instruction", "under-offer", "exchanged", "completed"]
  return (
    <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
      {stages.map((stage, i) => {
        const config = COLUMN_CONFIG[stage]
        return (
          <div key={stage} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="h-3 w-3 text-border" />}
            <div className={`h-1.5 w-1.5 rounded-full ${config.dotColor}`} />
            <span>{config.label}</span>
          </div>
        )
      })}
    </div>
  )
}

export default function DealsPipelinePage() {
  const total = allDeals().length
  const completedThisMonth = PIPELINE.completed.length
  const pipelineValue = totalPipelineValue()
  const activeDeals = PIPELINE.instruction.length + PIPELINE["under-offer"].length + PIPELINE.exchanged.length
  const stages: Stage[] = ["instruction", "under-offer", "exchanged", "completed"]

  return (
    <div className="-m-6">
      {/* Sticky header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border">
        <div className="px-6 pt-4 pb-3">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <Building2 className="h-4 w-4 text-primary" />
                <span className="text-[11px] font-semibold text-primary uppercase tracking-widest">BP2 Property</span>
                <span className="text-border text-[11px]">|</span>
                <span className="text-[11px] text-muted-foreground uppercase tracking-widest">South Wales Commercial</span>
              </div>
              <h1 className="text-xl font-bold text-foreground tracking-tight">Deals Pipeline</h1>
              <p className="text-[12px] text-muted-foreground mt-0.5">
                Live view · {new Date("2026-03-04").toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
              </p>
            </div>
            <div className="flex items-center self-center">
              <PipelineLegend />
            </div>
          </div>
        </div>
        <div className="px-6 pb-4">
          <div className="flex items-center gap-3 flex-wrap">
            <StatCard
              label="Total Deals"
              value={String(total)}
              sub={`${activeDeals} active · ${completedThisMonth} completed`}
              icon={LayoutGrid}
              accent="bg-blue-500/10 text-blue-600 dark:text-blue-400"
            />
            <StatCard
              label="Pipeline Value"
              value={pipelineValue}
              sub="All stages combined"
              icon={TrendingUp}
              accent="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            />
            <StatCard
              label="Completed This Month"
              value={String(completedThisMonth)}
              sub={`${formatColumnValue(PIPELINE.completed)} transacted`}
              icon={CheckCircle2}
              accent="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            />
            <StatCard
              label="Under Offer"
              value={String(PIPELINE["under-offer"].length)}
              sub={`${formatColumnValue(PIPELINE["under-offer"])} in solicitors`}
              icon={Clock}
              accent="bg-amber-500/10 text-amber-600 dark:text-amber-400"
            />
            <div className="ml-auto flex items-center gap-3">
              <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mr-1">Agents</span>
                {Object.entries(AGENT_AVATAR_STYLES).map(([initials, style]) => (
                  <div key={initials} className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold ${style}`}>
                    {initials}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <Separator />
      </div>

      {/* Kanban board */}
      <div className="px-6 py-5">
        <div className="flex gap-4 items-start overflow-x-auto pb-4">
          {stages.map((stage) => <KanbanColumn key={stage} stage={stage} />)}
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 pb-6">
        <Separator className="mb-4" />
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>BP2 Property · Commercial Agency · South Wales</span>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-red-500 inline-block" />&gt;30 days - overdue
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 inline-block" />14–30 days - watch
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground inline-block" />&lt;14 days - on track
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
