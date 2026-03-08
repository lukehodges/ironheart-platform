"use client"

import { useState } from "react"
import Link from "next/link"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import {
  PoundSterling,
  Users,
  Briefcase,
  MapPin,
  Calendar,
  ArrowLeft,
} from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts"
import { brokerCommissions, monthlyCommission, deals } from "../../_mock-data"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmtGBP(value: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function fmtGBPk(value: number): string {
  if (value >= 1_000) return `\u00a3${(value / 1_000).toFixed(1)}k`
  return fmtGBP(value)
}

// Commission target per broker
const BROKER_TARGETS: Record<string, number> = {
  "James Harris": 150_000,
  "Sarah Croft": 80_000,
  "Tom Jenkins": 40_000,
}

const BROKER_COLORS: Record<string, string> = {
  "James Harris": "#3b82f6",
  "Sarah Croft": "#8b5cf6",
  "Tom Jenkins": "#f59e0b",
}

// Broker deal details
const brokerDeals = deals.filter(
  (d) =>
    ["Payment Received", "Credits Allocated", "LPA Confirmed", "Completed"].includes(
      d.stage,
    ) || d.commission > 0,
)

// By catchment
const catchmentData = (() => {
  const map: Record<string, { commission: number; dealCount: number }> = {}
  deals.forEach((d) => {
    if (!map[d.catchment]) map[d.catchment] = { commission: 0, dealCount: 0 }
    map[d.catchment].commission += d.commission
    map[d.catchment].dealCount += 1
  })
  return Object.entries(map).map(([name, data]) => ({
    name,
    commission: data.commission,
    dealCount: data.dealCount,
  }))
})()

// Cumulative monthly data
const cumulativeMonthly = (() => {
  let cumulative = 0
  return monthlyCommission.map((m) => {
    cumulative += m.amount
    return { ...m, cumulative }
  })
})()

const ytdTotal = monthlyCommission.reduce((s, m) => s + m.amount, 0)

// ---------------------------------------------------------------------------
// Views
// ---------------------------------------------------------------------------

type ViewMode = "broker" | "deal" | "catchment" | "period"

// ---------------------------------------------------------------------------
// By Broker View
// ---------------------------------------------------------------------------

function ByBrokerView() {
  const chartData = brokerCommissions
    .slice()
    .sort((a, b) => b.commission - a.commission)
    .map((b) => ({ name: b.name, commission: b.commission }))

  return (
    <div className="space-y-6">
      {/* Broker Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {brokerCommissions.map((broker) => {
          const target = BROKER_TARGETS[broker.name] ?? 100_000
          const pctOfTarget = Math.round((broker.commission / target) * 100)
          return (
            <Card key={broker.name}>
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-4">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className={`${broker.avatarColor} text-white text-sm font-bold`}>
                      {broker.initials}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{broker.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {broker.dealCount} deal{broker.dealCount !== 1 ? "s" : ""} -- Pipeline {fmtGBP(broker.pipelineValue)}
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground">Commission Earned</span>
                    <span className="text-lg font-bold tabular-nums text-foreground">
                      {fmtGBP(broker.commission)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground">
                      Target: {fmtGBP(target)}
                    </span>
                    <span className="font-semibold text-foreground">{pctOfTarget}%</span>
                  </div>
                  <Progress value={Math.min(pctOfTarget, 100)} className="h-2" />
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Horizontal Bar Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Commission Ranking</CardTitle>
          <CardDescription className="text-xs">Brokers ranked by commission earned</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" barSize={24}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
                <XAxis type="number" tickFormatter={(v: number) => fmtGBPk(v)} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={110} />
                <Tooltip
                  formatter={((value: number | string) => fmtGBP(Number(value))) as never}
                  contentStyle={{
                    fontSize: 12,
                    borderRadius: 8,
                    border: "1px solid var(--border)",
                    backgroundColor: "var(--card)",
                    color: "var(--foreground)",
                  }}
                />
                <Bar dataKey="commission" radius={[0, 4, 4, 0]} name="Commission">
                  {chartData.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={BROKER_COLORS[entry.name] ?? "#6b7280"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Broker Deals Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Broker Deal Breakdown</CardTitle>
          <CardDescription className="text-xs">Individual commission per deal per broker</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[11px]">Broker</TableHead>
                <TableHead className="text-[11px]">Deal</TableHead>
                <TableHead className="text-[11px]">Stage</TableHead>
                <TableHead className="text-[11px] text-right">Deal Value</TableHead>
                <TableHead className="text-[11px] text-right">Rate</TableHead>
                <TableHead className="text-[11px] text-right">Commission</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {brokerDeals
                .sort((a, b) => a.broker.localeCompare(b.broker))
                .map((deal) => (
                  <TableRow key={deal.id}>
                    <TableCell className="text-[12px] font-medium">{deal.broker}</TableCell>
                    <TableCell className="text-[12px]">
                      <Link
                        href={`/admin/brokerage-mockups/deals/${deal.id}`}
                        className="text-primary hover:underline"
                      >
                        {deal.title}
                      </Link>
                    </TableCell>
                    <TableCell className="text-[12px] text-muted-foreground">{deal.stage}</TableCell>
                    <TableCell className="text-[12px] text-right tabular-nums">
                      {fmtGBP(deal.value)}
                    </TableCell>
                    <TableCell className="text-[12px] text-right tabular-nums text-muted-foreground">
                      {(deal.commissionRate * 100).toFixed(0)}%
                    </TableCell>
                    <TableCell className="text-[12px] text-right tabular-nums font-semibold">
                      {fmtGBP(deal.commission)}
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

// ---------------------------------------------------------------------------
// By Deal View
// ---------------------------------------------------------------------------

function ByDealView() {
  const totalValue = deals.reduce((s, d) => s + d.value, 0)
  const totalCommission = deals.reduce((s, d) => s + d.commission, 0)

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Commission by Deal</CardTitle>
        <CardDescription className="text-xs">All deals with commission breakdown</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-[11px]">Deal</TableHead>
              <TableHead className="text-[11px]">Supply Contact</TableHead>
              <TableHead className="text-[11px]">Demand Contact</TableHead>
              <TableHead className="text-[11px] text-right">Value</TableHead>
              <TableHead className="text-[11px] text-right">Rate</TableHead>
              <TableHead className="text-[11px] text-right">Commission</TableHead>
              <TableHead className="text-[11px]">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {deals.map((deal) => (
              <TableRow key={deal.id}>
                <TableCell className="text-[12px]">
                  <Link
                    href={`/admin/brokerage-mockups/deals/${deal.id}`}
                    className="text-primary hover:underline font-medium"
                  >
                    {deal.title}
                  </Link>
                </TableCell>
                <TableCell className="text-[12px]">
                  {deal.supplyContactName ? (
                    <Link
                      href={`/admin/brokerage-mockups/contacts/${deal.supplyContact}`}
                      className="text-primary hover:underline"
                    >
                      {deal.supplyContactName}
                    </Link>
                  ) : (
                    <span className="text-muted-foreground">--</span>
                  )}
                </TableCell>
                <TableCell className="text-[12px]">
                  {deal.demandContactName ? (
                    <Link
                      href={`/admin/brokerage-mockups/contacts/${deal.demandContact}`}
                      className="text-primary hover:underline"
                    >
                      {deal.demandContactName}
                    </Link>
                  ) : (
                    <span className="text-muted-foreground">--</span>
                  )}
                </TableCell>
                <TableCell className="text-[12px] text-right tabular-nums">
                  {fmtGBP(deal.value)}
                </TableCell>
                <TableCell className="text-[12px] text-right tabular-nums text-muted-foreground">
                  {(deal.commissionRate * 100).toFixed(0)}%
                </TableCell>
                <TableCell className="text-[12px] text-right tabular-nums font-semibold">
                  {fmtGBP(deal.commission)}
                </TableCell>
                <TableCell>
                  <span className="text-[11px] text-muted-foreground">{deal.stage}</span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colSpan={3} className="text-[12px] font-bold">
                Total
              </TableCell>
              <TableCell className="text-[12px] text-right font-bold tabular-nums">
                {fmtGBP(totalValue)}
              </TableCell>
              <TableCell />
              <TableCell className="text-[12px] text-right font-bold tabular-nums">
                {fmtGBP(totalCommission)}
              </TableCell>
              <TableCell />
            </TableRow>
          </TableFooter>
        </Table>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// By Catchment View
// ---------------------------------------------------------------------------

function ByCatchmentView() {
  const CATCHMENT_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444"]

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Commission by Catchment Area</CardTitle>
          <CardDescription className="text-xs">Geographic breakdown of commissions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={catchmentData} barSize={40}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(v: number) => fmtGBPk(v)} tick={{ fontSize: 11 }} width={60} />
                <Tooltip
                  formatter={((value: number | string) => fmtGBP(Number(value))) as never}
                  contentStyle={{
                    fontSize: 12,
                    borderRadius: 8,
                    border: "1px solid var(--border)",
                    backgroundColor: "var(--card)",
                    color: "var(--foreground)",
                  }}
                />
                <Bar dataKey="commission" radius={[4, 4, 0, 0]} name="Commission">
                  {catchmentData.map((_, i) => (
                    <Cell key={i} fill={CATCHMENT_COLORS[i % CATCHMENT_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Catchment Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[11px]">Catchment</TableHead>
                <TableHead className="text-[11px] text-center">Deals</TableHead>
                <TableHead className="text-[11px] text-right">Total Commission</TableHead>
                <TableHead className="text-[11px] text-right">Avg per Deal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {catchmentData
                .sort((a, b) => b.commission - a.commission)
                .map((c) => (
                  <TableRow key={c.name}>
                    <TableCell className="text-[12px] font-medium">{c.name}</TableCell>
                    <TableCell className="text-[12px] text-center tabular-nums">
                      {c.dealCount}
                    </TableCell>
                    <TableCell className="text-[12px] text-right tabular-nums font-semibold">
                      {fmtGBP(c.commission)}
                    </TableCell>
                    <TableCell className="text-[12px] text-right tabular-nums text-muted-foreground">
                      {fmtGBP(Math.round(c.commission / c.dealCount))}
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell className="text-[12px] font-bold">Total</TableCell>
                <TableCell className="text-[12px] text-center font-bold tabular-nums">
                  {catchmentData.reduce((s, c) => s + c.dealCount, 0)}
                </TableCell>
                <TableCell className="text-[12px] text-right font-bold tabular-nums">
                  {fmtGBP(catchmentData.reduce((s, c) => s + c.commission, 0))}
                </TableCell>
                <TableCell />
              </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

// ---------------------------------------------------------------------------
// By Period View
// ---------------------------------------------------------------------------

function ByPeriodView() {
  return (
    <div className="space-y-6">
      {/* YTD Total */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider mb-1">
                Year to Date Total
              </p>
              <p className="text-3xl font-bold text-foreground tabular-nums">
                {fmtGBP(ytdTotal)}
              </p>
              <p className="text-[12px] text-muted-foreground mt-1">
                {monthlyCommission.length} months tracked
              </p>
            </div>
            <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-600">
              <PoundSterling className="h-6 w-6" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Monthly Bar Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Monthly Commission</CardTitle>
          <CardDescription className="text-xs">Commission earned per month</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyCommission} barSize={40}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(v: number) => fmtGBPk(v)} tick={{ fontSize: 11 }} width={60} />
                <Tooltip
                  formatter={((value: number | string) => fmtGBP(Number(value))) as never}
                  contentStyle={{
                    fontSize: 12,
                    borderRadius: 8,
                    border: "1px solid var(--border)",
                    backgroundColor: "var(--card)",
                    color: "var(--foreground)",
                  }}
                />
                <Bar dataKey="amount" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Commission" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Cumulative Trend */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Cumulative Commission</CardTitle>
          <CardDescription className="text-xs">Running total over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cumulativeMonthly} barSize={40}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(v: number) => fmtGBPk(v)} tick={{ fontSize: 11 }} width={60} />
                <Tooltip
                  formatter={((value: number | string) => fmtGBP(Number(value))) as never}
                  contentStyle={{
                    fontSize: 12,
                    borderRadius: 8,
                    border: "1px solid var(--border)",
                    backgroundColor: "var(--card)",
                    color: "var(--foreground)",
                  }}
                />
                <Bar dataKey="cumulative" fill="#10b981" radius={[4, 4, 0, 0]} name="Cumulative" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Monthly Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Monthly Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[11px]">Month</TableHead>
                <TableHead className="text-[11px] text-right">Commission</TableHead>
                <TableHead className="text-[11px] text-right">Cumulative</TableHead>
                <TableHead className="text-[11px] text-right">% of YTD</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cumulativeMonthly.map((m) => (
                <TableRow key={m.month}>
                  <TableCell className="text-[12px] font-medium">{m.month}</TableCell>
                  <TableCell className="text-[12px] text-right tabular-nums font-semibold">
                    {fmtGBP(m.amount)}
                  </TableCell>
                  <TableCell className="text-[12px] text-right tabular-nums">
                    {fmtGBP(m.cumulative)}
                  </TableCell>
                  <TableCell className="text-[12px] text-right tabular-nums text-muted-foreground">
                    {((m.amount / ytdTotal) * 100).toFixed(1)}%
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell className="text-[12px] font-bold">Total</TableCell>
                <TableCell className="text-[12px] text-right font-bold tabular-nums">
                  {fmtGBP(ytdTotal)}
                </TableCell>
                <TableCell />
                <TableCell className="text-[12px] text-right font-bold tabular-nums">
                  100%
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

const VIEW_OPTIONS: { key: ViewMode; label: string; icon: React.ElementType }[] = [
  { key: "broker", label: "By Broker", icon: Users },
  { key: "deal", label: "By Deal", icon: Briefcase },
  { key: "catchment", label: "By Catchment", icon: MapPin },
  { key: "period", label: "By Period", icon: Calendar },
]

export default function CommissionsPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("broker")

  return (
    <div className="max-w-screen-2xl mx-auto px-6 py-6">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/admin/brokerage-mockups/financials"
          className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground mb-2 transition-colors"
        >
          <ArrowLeft className="h-3 w-3" />
          Back to Financials
        </Link>
        <div className="flex items-center gap-2 mb-1">
          <PoundSterling className="h-4 w-4 text-emerald-600" />
          <span className="text-[11px] font-semibold text-emerald-600 uppercase tracking-widest">
            Financials
          </span>
        </div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">
          Commission Breakdown
        </h1>
        <p className="text-[13px] text-muted-foreground mt-1">
          Analyse commission performance across brokers, deals, catchments, and time periods
        </p>
      </div>

      {/* View Toggle */}
      <div className="flex items-center gap-1 p-1 bg-muted rounded-lg mb-6 w-fit">
        {VIEW_OPTIONS.map((v) => {
          const Icon = v.icon
          const isActive = viewMode === v.key
          return (
            <button
              key={v.key}
              onClick={() => setViewMode(v.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                isActive
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {v.label}
            </button>
          )
        })}
      </div>

      {/* Content */}
      {viewMode === "broker" && <ByBrokerView />}
      {viewMode === "deal" && <ByDealView />}
      {viewMode === "catchment" && <ByCatchmentView />}
      {viewMode === "period" && <ByPeriodView />}

      {/* Footer */}
      <Separator className="mt-8 mb-4" />
      <div className="flex items-center justify-between text-[11px] text-muted-foreground pb-4">
        <span>Ironheart Brokerage -- BNG / Nutrient Credit Platform</span>
        <span>
          Financial data is illustrative only. All figures are hardcoded for mockup
          purposes.
        </span>
      </div>
    </div>
  )
}
