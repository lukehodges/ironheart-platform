"use client"

import { useMemo } from "react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  ArrowLeft,
  TrendingUp,
  Clock,
  Target,
  PoundSterling,
  CalendarDays,
} from "lucide-react"
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts"
import { deals } from "../../_mock-data"

// ---------------------------------------------------------------------------
// Pipeline stage order for funnel
// ---------------------------------------------------------------------------

const STAGE_ORDER = [
  "Prospecting",
  "Initial Contact",
  "Requirements Gathered",
  "Site Matched",
  "Quote Sent",
  "Quote Accepted",
  "Legal Drafting",
  "Legal Review",
  "Contracts Signed",
  "Payment Pending",
  "Payment Received",
  "Credits Allocated",
  "LPA Confirmed",
  "Completed",
] as const

const LOSS_REASONS = [
  { reason: "Price too high", count: 3, percentage: 30 },
  { reason: "Competitor won deal", count: 2, percentage: 20 },
  { reason: "Developer pulled out", count: 2, percentage: 20 },
  { reason: "Planning permission denied", count: 1, percentage: 10 },
  { reason: "Insufficient credits", count: 1, percentage: 10 },
  { reason: "Timeline mismatch", count: 1, percentage: 10 },
]

const PIE_COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))"]

function formatCurrency(v: number) {
  return v >= 1000 ? `£${(v / 1000).toFixed(v >= 100000 ? 0 : 1)}k` : `£${v}`
}

function formatCurrencyFull(v: number) {
  return `£${v.toLocaleString("en-GB")}`
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PipelineAnalyticsPage() {
  // Compute metrics from deals
  const stageCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const d of deals) {
      counts[d.stage] = (counts[d.stage] ?? 0) + 1
    }
    return STAGE_ORDER.map((stage) => ({
      stage,
      count: counts[stage] ?? 0,
    }))
  }, [])

  const funnelData = useMemo(() => {
    return stageCounts.filter((s) => s.count > 0)
  }, [stageCounts])

  // Conversion rates between sequential stages
  const conversionData = useMemo(() => {
    const result: { from: string; to: string; rate: number }[] = []
    for (let i = 0; i < funnelData.length - 1; i++) {
      if (funnelData[i].count > 0) {
        const rate = Math.round((funnelData[i + 1].count / funnelData[i].count) * 100)
        result.push({
          from: funnelData[i].stage,
          to: funnelData[i + 1].stage,
          rate: Math.min(rate, 100),
        })
      }
    }
    return result
  }, [funnelData])

  // Deal velocity - avg days per stage (simulated)
  const velocityData = useMemo(() => {
    const stageVelocity: Record<string, number> = {
      "Prospecting": 12,
      "Initial Contact": 8,
      "Requirements Gathered": 15,
      "Site Matched": 5,
      "Quote Sent": 10,
      "Quote Accepted": 7,
      "Legal Drafting": 18,
      "Legal Review": 14,
      "Contracts Signed": 3,
      "Payment Pending": 21,
      "Payment Received": 5,
      "Credits Allocated": 7,
      "LPA Confirmed": 10,
    }
    return Object.entries(stageVelocity).map(([stage, days]) => ({
      stage,
      days,
      isBottleneck: days >= 18,
    }))
  }, [])

  // Win/Loss pie
  const winLossData = useMemo(() => {
    const completed = deals.filter((d) => d.stage === "Completed").length
    // Illustrative data: lost count includes historical deals not present in the current dataset
    const lost = 10
    const inProgress = deals.filter((d) => d.stage !== "Completed").length
    return [
      { name: "Won", value: completed },
      { name: "Lost", value: lost },
      { name: "In Progress", value: inProgress },
    ]
  }, [])

  // Forecasting - next 6 months
  const forecastData = useMemo(() => {
    const months = ["Apr 2026", "May 2026", "Jun 2026", "Jul 2026", "Aug 2026", "Sep 2026"]
    const values = [245000, 310000, 185000, 420000, 290000, 350000]
    const commissions = values.map((v) => Math.round(v * 0.2))
    return months.map((month, i) => ({
      month,
      value: values[i],
      commission: commissions[i],
    }))
  }, [])

  // Summary stats
  const stats = useMemo(() => {
    const activeDeals = deals.filter((d) => d.stage !== "Completed")
    const completedDeals = deals.filter((d) => d.stage === "Completed")
    const avgDealSize = Math.round(deals.reduce((s, d) => s + d.value, 0) / deals.length)
    const avgTimeToClose = 135 // simulated days
    const winRate = completedDeals.length > 0
      ? Math.round((completedDeals.length / (completedDeals.length + 10)) * 100)
      : 0
    return { avgDealSize, avgTimeToClose, winRate, activeCount: activeDeals.length }
  }, [])

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/admin/brokerage-mockups/reports">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Reports
          </Button>
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-foreground">Pipeline Analytics</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Deal conversion rates, velocity, and forecasting
        </p>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <Select defaultValue="all-time">
          <SelectTrigger className="w-[160px] bg-card">
            <CalendarDays className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Date range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
            <SelectItem value="ytd">Year to date</SelectItem>
            <SelectItem value="all-time">All time</SelectItem>
          </SelectContent>
        </Select>
        <Select defaultValue="all">
          <SelectTrigger className="w-[160px] bg-card">
            <SelectValue placeholder="Catchment" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Catchments</SelectItem>
            <SelectItem value="solent">Solent</SelectItem>
            <SelectItem value="test-valley">Test Valley</SelectItem>
            <SelectItem value="stour">Stour</SelectItem>
            <SelectItem value="exe">Exe</SelectItem>
          </SelectContent>
        </Select>
        <Select defaultValue="all">
          <SelectTrigger className="w-[160px] bg-card">
            <SelectValue placeholder="Broker" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Brokers</SelectItem>
            <SelectItem value="jh">James Harris</SelectItem>
            <SelectItem value="sc">Sarah Croft</SelectItem>
            <SelectItem value="tj">Tom Jenkins</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Avg Deal Size", value: formatCurrencyFull(stats.avgDealSize), icon: PoundSterling },
          { label: "Avg Time to Close", value: `${stats.avgTimeToClose} days`, icon: Clock },
          { label: "Win Rate", value: `${stats.winRate}%`, icon: Target },
          { label: "Active Deals", value: stats.activeCount.toString(), icon: TrendingUp },
        ].map((stat) => (
          <Card key={stat.label} className="border-border bg-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <stat.icon className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{stat.label}</span>
              </div>
              <p className="text-xl font-bold text-foreground">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Conversion Funnel */}
      <Card className="border-border bg-card">
        <CardContent className="p-5">
          <h2 className="text-sm font-bold text-foreground mb-1">Conversion Funnel</h2>
          <p className="text-xs text-muted-foreground mb-4">Deals at each pipeline stage</p>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={funnelData} layout="vertical" margin={{ left: 120, right: 40 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis type="number" className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                <YAxis dataKey="stage" type="category" width={110} className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: 8 }}
                  labelStyle={{ color: "hsl(var(--foreground))" }}
                />
                <Bar dataKey="count" fill="hsl(var(--chart-1))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {/* Conversion rates */}
          <div className="mt-4 flex flex-wrap gap-2">
            {conversionData.map((c) => (
              <Badge key={c.from} variant="outline" className="text-[10px] font-mono">
                {c.from.split(" ").map(w => w[0]).join("")} → {c.to.split(" ").map(w => w[0]).join("")}: {c.rate}%
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Deal Velocity */}
      <Card className="border-border bg-card">
        <CardContent className="p-5">
          <h2 className="text-sm font-bold text-foreground mb-1">Deal Velocity</h2>
          <p className="text-xs text-muted-foreground mb-4">Average days spent in each stage. Bottleneck stages highlighted.</p>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={velocityData} layout="vertical" margin={{ left: 130, right: 40 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis type="number" className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} label={{ value: "Days", position: "insideBottomRight", offset: -5, fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                <YAxis dataKey="stage" type="category" width={120} className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: 8 }}
                  labelStyle={{ color: "hsl(var(--foreground))" }}
                />
                <Bar dataKey="days" radius={[0, 4, 4, 0]}>
                  {velocityData.map((entry, index) => (
                    <Cell key={index} fill={entry.isBottleneck ? "hsl(var(--chart-2))" : "hsl(var(--chart-1))"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Win/Loss + Loss Reasons */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-border bg-card">
          <CardContent className="p-5">
            <h2 className="text-sm font-bold text-foreground mb-1">Win/Loss Analysis</h2>
            <p className="text-xs text-muted-foreground mb-4">Deal outcomes breakdown <span className="italic">(includes historical data)</span></p>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={winLossData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {winLossData.map((_entry, index) => (
                      <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend />
                  <Tooltip
                    contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: 8 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="p-5">
            <h2 className="text-sm font-bold text-foreground mb-1">Loss Reasons</h2>
            <p className="text-xs text-muted-foreground mb-4">Why deals were lost (historical)</p>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Reason</TableHead>
                  <TableHead className="text-xs text-right">Count</TableHead>
                  <TableHead className="text-xs text-right">%</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {LOSS_REASONS.map((lr) => (
                  <TableRow key={lr.reason}>
                    <TableCell className="text-xs text-foreground">{lr.reason}</TableCell>
                    <TableCell className="text-xs text-right text-foreground">{lr.count}</TableCell>
                    <TableCell className="text-xs text-right text-muted-foreground">{lr.percentage}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Forecasting */}
      <Card className="border-border bg-card">
        <CardContent className="p-5">
          <h2 className="text-sm font-bold text-foreground mb-1">Pipeline Forecast</h2>
          <p className="text-xs text-muted-foreground mb-4">Projected pipeline value and commission (next 6 months)</p>
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={forecastData} margin={{ left: 20, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                <YAxis className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v: number) => formatCurrency(v)} />
                <Tooltip
                  contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: 8 }}
                  labelStyle={{ color: "hsl(var(--foreground))" }}
                  formatter={(value) => formatCurrencyFull(value as number)}
                />
                <Legend />
                <Bar dataKey="value" name="Pipeline Value" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="commission" name="Expected Commission" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
