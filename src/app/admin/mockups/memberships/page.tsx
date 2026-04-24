"use client"

import { useState } from "react"
import {
  Plus,
  Users,
  TrendingUp,
  Activity,
  XCircle,
  MoreHorizontal,
  Pencil,
  Eye,
  PauseCircle,
  CalendarClock,
  Search,
  Download,
  ChevronDown,
  ChevronUp,
  Star,
  Zap,
  Ticket,
  AlertTriangle,
  RotateCcw,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

// ─── Types ──────────────────────────────────────────────────────────

type PlanId = "basic" | "premium" | "day"
type MemberStatus = "ACTIVE" | "CANCELLED" | "PAUSED"

interface Plan {
  id: PlanId
  name: string
  price: string
  period: string
  classLimit: string
  classTypes: string
  discount: string
  activeCount: number
  highlight?: boolean
  color: "zinc" | "indigo" | "amber"
  features: string[]
}

interface ActiveMembership {
  id: string
  name: string
  initials: string
  avatarColor: string
  plan: PlanId
  planLabel: string
  price: string
  status: MemberStatus
  since: string
  usedCount: number
  totalCount: number | null // null = unlimited
  renewsLabel: string
  limitReached?: boolean
}

// ─── Mock Data ──────────────────────────────────────────────────────

const PLANS: Plan[] = [
  {
    id: "basic",
    name: "Basic Pass",
    price: "£29",
    period: "/month",
    classLimit: "4 classes/month",
    classTypes: "Any class type",
    discount: "10% discount on extras",
    activeCount: 47,
    color: "zinc",
    features: ["4 classes per month", "Any class type", "10% discount on retail", "Email support"],
  },
  {
    id: "premium",
    name: "Premium Pass",
    price: "£49",
    period: "/month",
    classLimit: "Unlimited classes",
    classTypes: "Priority booking",
    discount: "15% discount on extras",
    activeCount: 23,
    highlight: true,
    color: "indigo",
    features: ["Unlimited classes", "Priority booking window", "15% discount on retail", "Guest passes (2/month)", "Dedicated support"],
  },
  {
    id: "day",
    name: "Day Pass",
    price: "£8",
    period: "/purchase",
    classLimit: "1 class per purchase",
    classTypes: "Any class type",
    discount: "No discount",
    activeCount: 0,
    color: "amber",
    features: ["1 class per purchase", "Any class type", "No commitment", "Purchase anytime"],
  },
]

const ACTIVE_MEMBERSHIPS: ActiveMembership[] = [
  { id: "m1",  name: "Emma Patel",    initials: "EP", avatarColor: "bg-violet-500",  plan: "premium", planLabel: "Premium Pass", price: "£49/mo", status: "ACTIVE",    since: "1 Jan 2026",  usedCount: 0,  totalCount: null, renewsLabel: "Renews 1 May" },
  { id: "m2",  name: "Lily Chen",     initials: "LC", avatarColor: "bg-indigo-500",  plan: "basic",   planLabel: "Basic Pass",   price: "£29/mo", status: "ACTIVE",    since: "15 Feb 2026", usedCount: 2,  totalCount: 4,    renewsLabel: "Renews 15 May" },
  { id: "m3",  name: "Olivia Stone",  initials: "OS", avatarColor: "bg-orange-500",  plan: "basic",   planLabel: "Basic Pass",   price: "£29/mo", status: "ACTIVE",    since: "1 Mar 2026",  usedCount: 3,  totalCount: 4,    renewsLabel: "Renews 1 May" },
  { id: "m4",  name: "Aisha Johnson", initials: "AJ", avatarColor: "bg-pink-500",    plan: "premium", planLabel: "Premium Pass", price: "£49/mo", status: "ACTIVE",    since: "10 Nov 2025", usedCount: 0,  totalCount: null, renewsLabel: "Renews 10 May" },
  { id: "m5",  name: "Tom Harvey",    initials: "TH", avatarColor: "bg-teal-600",    plan: "basic",   planLabel: "Basic Pass",   price: "£29/mo", status: "ACTIVE",    since: "20 Jan 2026", usedCount: 4,  totalCount: 4,    renewsLabel: "Renews 20 May", limitReached: true },
  { id: "m6",  name: "Sophie Wright", initials: "SW", avatarColor: "bg-rose-500",    plan: "premium", planLabel: "Premium Pass", price: "£49/mo", status: "ACTIVE",    since: "5 Dec 2025",  usedCount: 0,  totalCount: null, renewsLabel: "Renews 5 May" },
  { id: "m7",  name: "Marcus Brown",  initials: "MB", avatarColor: "bg-amber-600",   plan: "basic",   planLabel: "Basic Pass",   price: "£29/mo", status: "ACTIVE",    since: "1 Apr 2026",  usedCount: 0,  totalCount: 4,    renewsLabel: "Renews 1 May" },
  { id: "m8",  name: "James Liu",     initials: "JL", avatarColor: "bg-blue-500",    plan: "basic",   planLabel: "Basic Pass",   price: "£29/mo", status: "CANCELLED", since: "1 Apr 2026",  usedCount: 0,  totalCount: 4,    renewsLabel: "Ends 30 Apr" },
  { id: "m9",  name: "Rachel Green",  initials: "RG", avatarColor: "bg-emerald-600", plan: "premium", planLabel: "Premium Pass", price: "£49/mo", status: "ACTIVE",    since: "22 Feb 2026", usedCount: 0,  totalCount: null, renewsLabel: "Renews 22 May" },
  { id: "m10", name: "David Park",    initials: "DP", avatarColor: "bg-slate-500",   plan: "day",     planLabel: "Day Pass",     price: "£8/use", status: "ACTIVE",    since: "Apr 2026",    usedCount: 3,  totalCount: null, renewsLabel: "3 purchases this month" },
]

// ─── Sub-components ──────────────────────────────────────────────────

function MemberStatusBadge({ status }: { status: MemberStatus }) {
  if (status === "ACTIVE") {
    return (
      <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
        Active
      </span>
    )
  }
  if (status === "CANCELLED") {
    return (
      <span className="inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-xs font-medium text-rose-600">
        Cancelled
      </span>
    )
  }
  return (
    <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
      Paused
    </span>
  )
}

function UsageCell({ used, total, limitReached }: { used: number; total: number | null; limitReached?: boolean }) {
  if (total === null) {
    return (
      <div>
        <p className="text-sm text-zinc-600 tabular-nums">{used > 0 ? `${used} this month` : "0/∞ this month"}</p>
        <p className="text-[11px] text-zinc-400 mt-0.5">Unlimited</p>
      </div>
    )
  }

  const pct = Math.round((used / total) * 100)
  return (
    <div className="min-w-[100px]">
      {limitReached ? (
        <div className="flex items-center gap-1.5 mb-1">
          <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-600">
            <AlertTriangle className="h-3 w-3" />
            Limit Reached
          </span>
        </div>
      ) : null}
      <div className="flex items-center gap-2">
        <div className="h-1.5 w-20 rounded-full bg-zinc-100 overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              limitReached ? "bg-rose-400" : pct >= 75 ? "bg-amber-400" : "bg-emerald-400"
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className={cn("text-xs tabular-nums font-medium", limitReached ? "text-rose-600" : "text-zinc-600")}>
          {used}/{total}
        </span>
      </div>
    </div>
  )
}

function KpiCard({
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
    <div className="rounded-xl border border-zinc-200 bg-white p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-bold text-zinc-900 mt-1">{value}</p>
          {sub && <p className="text-xs text-zinc-500 mt-0.5">{sub}</p>}
        </div>
        <div className={cn("p-2 rounded-lg", accent)}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </div>
  )
}

// ─── Plan Card ───────────────────────────────────────────────────────

function PlanCard({ plan }: { plan: Plan }) {
  const colorConfig = {
    zinc: {
      header: "bg-zinc-900",
      headerText: "text-white",
      headerSub: "text-zinc-400",
      badge: "bg-white/10 text-zinc-300",
      icon: "text-zinc-300",
    },
    indigo: {
      header: "bg-gradient-to-br from-indigo-600 to-indigo-800",
      headerText: "text-white",
      headerSub: "text-indigo-200",
      badge: "bg-white/15 text-indigo-100",
      icon: "text-indigo-200",
    },
    amber: {
      header: "bg-gradient-to-br from-amber-500 to-amber-600",
      headerText: "text-white",
      headerSub: "text-amber-100",
      badge: "bg-white/15 text-amber-100",
      icon: "text-amber-200",
    },
  }[plan.color]

  const PlanIcon = plan.color === "indigo" ? Star : plan.color === "amber" ? Ticket : Zap

  return (
    <div className="rounded-xl border border-zinc-200 overflow-hidden hover:shadow-md transition-all group">
      {/* Header */}
      <div className={cn("p-5", colorConfig.header)}>
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <PlanIcon className={cn("h-4 w-4", colorConfig.icon)} />
            <h3 className={cn("text-base font-semibold", colorConfig.headerText)}>{plan.name}</h3>
            {plan.highlight && (
              <span className={cn("text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded", colorConfig.badge)}>
                Popular
              </span>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 text-white/60 hover:text-white hover:bg-white/10 transition-all"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Pencil className="h-4 w-4" />
                Edit Plan
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Eye className="h-4 w-4" />
                View Members
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="flex items-baseline gap-1">
          <span className={cn("text-3xl font-bold", colorConfig.headerText)}>{plan.price}</span>
          <span className={cn("text-sm", colorConfig.headerSub)}>{plan.period}</span>
        </div>
      </div>

      {/* Body */}
      <div className="p-5 bg-white">
        <ul className="space-y-2 mb-5">
          {plan.features.map((f) => (
            <li key={f} className="flex items-start gap-2 text-sm text-zinc-600">
              <span className="h-1.5 w-1.5 rounded-full bg-zinc-400 mt-1.5 shrink-0" />
              {f}
            </li>
          ))}
        </ul>
        <div className="flex items-center justify-between pt-4 border-t border-zinc-100">
          <div className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-zinc-400" />
            <span className="text-xs text-zinc-600 font-medium">
              {plan.activeCount > 0 ? `${plan.activeCount} active members` : "Purchase-based"}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Button variant="outline" size="sm" className="h-7 text-xs">
              <Eye className="h-3 w-3 mr-1" />
              View Members
            </Button>
            <Button variant="outline" size="sm" className="h-7 text-xs">
              <Pencil className="h-3 w-3 mr-1" />
              Edit
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Plans Section ───────────────────────────────────────────────────

function PlansSection() {
  const [open, setOpen] = useState(true)

  return (
    <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-zinc-50 transition-colors"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="flex items-center gap-3">
          <Zap className="h-4 w-4 text-zinc-500" />
          <span className="text-sm font-semibold text-zinc-900">Membership Plans</span>
          <span className="inline-flex items-center rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-xs font-medium text-zinc-600">
            {PLANS.length} plans
          </span>
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-zinc-400" /> : <ChevronDown className="h-4 w-4 text-zinc-400" />}
      </button>

      {open && (
        <div className="px-5 pb-5 border-t border-zinc-100">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            {PLANS.map((plan) => (
              <PlanCard key={plan.id} plan={plan} />
            ))}
            {/* Add plan card */}
            <button className="rounded-xl border-2 border-dashed border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50 transition-all flex flex-col items-center justify-center gap-2 min-h-[260px] text-zinc-400 hover:text-zinc-600">
              <Plus className="h-6 w-6" />
              <span className="text-sm font-medium">New Plan</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Active Memberships Tab ──────────────────────────────────────────

type PlanFilter = "all" | PlanId
type StatusFilter = "all" | MemberStatus

function ActiveMembershipsSection() {
  const [search, setSearch] = useState("")
  const [planFilter, setPlanFilter] = useState<PlanFilter>("all")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")

  const filtered = ACTIVE_MEMBERSHIPS.filter((m) => {
    if (planFilter !== "all" && m.plan !== planFilter) return false
    if (statusFilter !== "all" && m.status !== statusFilter) return false
    if (search && !m.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const planChips: { key: PlanFilter; label: string }[] = [
    { key: "all", label: "All Plans" },
    { key: "basic", label: "Basic Pass" },
    { key: "premium", label: "Premium Pass" },
    { key: "day", label: "Day Pass" },
  ]

  return (
    <div className="space-y-4">
      {/* Filter Row */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Plan chips */}
        <div className="flex items-center gap-2 flex-wrap">
          {planChips.map((chip) => (
            <button
              key={chip.key}
              onClick={() => setPlanFilter(chip.key)}
              className={cn(
                "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                planFilter === chip.key
                  ? "border-zinc-900 bg-zinc-900 text-white"
                  : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
              )}
            >
              {chip.label}
            </button>
          ))}
        </div>

        <div className="h-4 w-px bg-zinc-200 hidden sm:block" />

        {/* Status filter */}
        <div className="flex items-center gap-2">
          {(["all", "ACTIVE", "CANCELLED", "PAUSED"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s as StatusFilter)}
              className={cn(
                "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                statusFilter === s
                  ? "border-zinc-900 bg-zinc-900 text-white"
                  : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
              )}
            >
              {s === "all" ? "All Status" : s === "ACTIVE" ? "Active" : s === "CANCELLED" ? "Cancelled" : "Paused"}
            </button>
          ))}
        </div>

        <div className="flex-1" />

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <Input
            placeholder="Search member..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 w-[200px]"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-zinc-200 overflow-hidden bg-white">
        <Table>
          <TableHeader>
            <TableRow className="bg-zinc-50 border-b border-zinc-200">
              <TableHead className="text-xs font-semibold text-zinc-500 uppercase tracking-wide pl-5">Customer</TableHead>
              <TableHead className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Plan</TableHead>
              <TableHead className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Status</TableHead>
              <TableHead className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Usage (this month)</TableHead>
              <TableHead className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Started</TableHead>
              <TableHead className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Next Renewal</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((m) => (
              <TableRow key={m.id} className="group hover:bg-zinc-50 transition-colors">
                <TableCell className="pl-5">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarFallback className={cn(m.avatarColor, "text-white text-xs font-semibold")}>
                        {m.initials}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium text-zinc-900">{m.name}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-zinc-700">{m.planLabel}</span>
                    <span className="text-xs text-zinc-400 tabular-nums">{m.price}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <MemberStatusBadge status={m.status} />
                </TableCell>
                <TableCell>
                  <UsageCell used={m.usedCount} total={m.totalCount} limitReached={m.limitReached} />
                </TableCell>
                <TableCell>
                  <span className="text-sm text-zinc-500">{m.since}</span>
                </TableCell>
                <TableCell>
                  <span className={cn(
                    "text-sm",
                    m.status === "CANCELLED" ? "text-rose-500 font-medium" : "text-zinc-500"
                  )}>
                    {m.renewsLabel}
                  </span>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Eye className="h-4 w-4" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <CalendarClock className="h-4 w-4" />
                        Adjust Usage
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <PauseCircle className="h-4 w-4" />
                        Pause
                      </DropdownMenuItem>
                      {m.status === "CANCELLED" && (
                        <DropdownMenuItem>
                          <RotateCcw className="h-4 w-4" />
                          Reactivate
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-rose-600 focus:text-rose-600">
                        <XCircle className="h-4 w-4" />
                        Cancel Membership
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {filtered.length === 0 && (
          <div className="py-12 text-center">
            <Users className="h-8 w-8 text-zinc-300 mx-auto mb-2" />
            <p className="text-sm text-zinc-500">No memberships match your filters.</p>
          </div>
        )}
      </div>

      <p className="text-xs text-zinc-400">
        Showing {filtered.length} of {ACTIVE_MEMBERSHIPS.length} memberships
      </p>
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────

export default function MembershipsPage() {
  // MRR = (47 × 29) + (23 × 49) = 1363 + 1127 = 2490
  const mrr = 47 * 29 + 23 * 49

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Memberships</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Manage plans, track active subscriptions, and monitor member usage.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" className="text-xs">
            <Download className="h-3.5 w-3.5 mr-1.5" />
            Export CSV
          </Button>
          <Button variant="outline" size="sm" className="text-xs">
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            New Plan
          </Button>
          <Button size="sm" className="bg-zinc-900 hover:bg-zinc-700 text-white text-xs">
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Add Membership
          </Button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Active Members"
          value="9"
          sub="Basic (5) · Premium (3) · Day (1)"
          icon={Users}
          accent="bg-zinc-100 text-zinc-600"
        />
        <KpiCard
          label="MRR"
          value={`£${mrr.toLocaleString()}`}
          sub="Monthly recurring revenue"
          icon={TrendingUp}
          accent="bg-emerald-50 text-emerald-600"
        />
        <KpiCard
          label="Avg Usage Rate"
          value="72%"
          sub="Of monthly class allowances"
          icon={Activity}
          accent="bg-blue-50 text-blue-600"
        />
        <KpiCard
          label="Cancellations"
          value="1"
          sub="This month"
          icon={XCircle}
          accent="bg-rose-50 text-rose-500"
        />
      </div>

      {/* Plans Section (collapsible) */}
      <PlansSection />

      {/* Active Memberships */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-base font-semibold text-zinc-900">Active Memberships</h2>
          <span className="inline-flex items-center rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-xs font-medium text-zinc-600">
            {ACTIVE_MEMBERSHIPS.length} total
          </span>
        </div>
        <ActiveMembershipsSection />
      </div>
    </div>
  )
}
