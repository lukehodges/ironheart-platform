"use client"

import { useState } from "react"
import Link from "next/link"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  PoundSterling,
  Leaf,
  TrendingUp,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Calendar,
  CheckCircle2,
  FileText,
  MessageSquare,
  UserPlus,
  ArrowRight,
  Activity,
  BarChart3,
  Eye,
} from "lucide-react"
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts"

// ─── Mock Data ─────────────────────────────────────────────────────────────

const DEALS_BY_STAGE = [
  { stage: "Lead", count: 3, value: 321000, color: "#94a3b8" },
  { stage: "Qualified", count: 3, value: 550000, color: "#60a5fa" },
  { stage: "Assessment Booked", count: 2, value: 380000, color: "#818cf8" },
  { stage: "Assessment Complete", count: 1, value: 237500, color: "#a78bfa" },
  { stage: "S106 In Progress", count: 1, value: 198800, color: "#f59e0b" },
  { stage: "NE Registered", count: 1, value: 212500, color: "#34d399" },
  { stage: "Matched", count: 1, value: 90000, color: "#fbbf24" },
  { stage: "Quote Sent", count: 1, value: 165000, color: "#fb923c" },
  { stage: "Credits Reserved", count: 1, value: 135000, color: "#eab308" },
  { stage: "Contract Signed", count: 1, value: 114000, color: "#22c55e" },
]

const LIFECYCLE_STAGES = [
  { stage: "Prospect", count: 5, color: "#94a3b8" },
  { stage: "Assess", count: 3, color: "#60a5fa" },
  { stage: "Legal", count: 2, color: "#818cf8" },
  { stage: "Match", count: 3, color: "#a78bfa" },
  { stage: "Quote", count: 2, color: "#f59e0b" },
  { stage: "Agreement", count: 1, color: "#fb923c" },
  { stage: "Payment", count: 1, color: "#eab308" },
  { stage: "Allocate", count: 1, color: "#34d399" },
  { stage: "Confirm", count: 1, color: "#22c55e" },
  { stage: "Compliance", count: 1, color: "#10b981" },
]

const CREDITS_GAUGE = [
  { name: "Allocated", value: 260, color: "#3b82f6" },
  { name: "Available", value: 295, color: "#22c55e" },
  { name: "Reserved", value: 45, color: "#f59e0b" },
]

const UPCOMING_ASSESSMENTS = [
  { date: "Mon 10 Mar", site: "Whiteley Farm", assessor: "Tom Jenkins", initials: "TJ", status: "Confirmed" as const },
  { date: "Wed 12 Mar", site: "Manor Fields", assessor: "Sarah Croft", initials: "SC", status: "Scheduled" as const },
  { date: "Fri 14 Mar", site: "Riverside Meadows", assessor: "Tom Jenkins", initials: "TJ", status: "Scheduled" as const },
  { date: "Tue 18 Mar", site: "Oakwood Estate", assessor: "Sarah Croft", initials: "SC", status: "Confirmed" as const },
]

const OVERDUE_COMPLIANCE = [
  { title: "Annual Habitat Monitoring Report", site: "Whiteley Farm", due: "28 Feb 2026", daysOverdue: 7, assigned: "Tom Jenkins", initials: "TJ" },
  { title: "NE Registry Update", site: "Botley Meadows", due: "01 Mar 2026", daysOverdue: 6, assigned: "James Harris", initials: "JH" },
  { title: "S106 Compliance Review", site: "Hamble Wetlands", due: "03 Mar 2026", daysOverdue: 4, assigned: "James Harris", initials: "JH" },
]

const RECENT_ACTIVITY = [
  { time: "2 hours ago", user: "James Harris", initials: "JH", action: "moved Deal D-0042 to", entity: "Quote Sent", icon: "move" as const },
  { time: "3 hours ago", user: "Sarah Croft", initials: "SC", action: "completed assessment at", entity: "Manor Fields", icon: "check" as const },
  { time: "Yesterday", user: "System", initials: "SY", action: "Credits Reserved for D-0038 (45 kg N/yr from", entity: "Whiteley Farm)", icon: "credit" as const },
  { time: "Yesterday", user: "James Harris", initials: "JH", action: "added note on D-0041:", entity: "'Developer confirmed budget'", icon: "note" as const },
  { time: "2 days ago", user: "James Harris", initials: "JH", action: "New contact added:", entity: "Bellway Homes (Developer)", icon: "contact" as const },
  { time: "2 days ago", user: "Sarah Croft", initials: "SC", action: "uploaded document to", entity: "Manor Fields assessment", icon: "doc" as const },
  { time: "3 days ago", user: "Tom Jenkins", initials: "TJ", action: "scheduled assessment for", entity: "Riverside Meadows", icon: "calendar" as const },
  { time: "4 days ago", user: "System", initials: "SY", action: "Deal D-0050 moved to", entity: "Payment Received", icon: "move" as const },
]

type Variation = "v1" | "v2" | "v3"
type DateRange = "7d" | "30d" | "90d" | "YTD"

// ─── Helper Components ─────────────────────────────────────────────────────

function ActivityIcon({ type }: { type: string }) {
  const cls = "h-3.5 w-3.5"
  switch (type) {
    case "move": return <ArrowRight className={cls} />
    case "check": return <CheckCircle2 className={cls} />
    case "credit": return <Leaf className={cls} />
    case "note": return <MessageSquare className={cls} />
    case "contact": return <UserPlus className={cls} />
    case "doc": return <FileText className={cls} />
    case "calendar": return <Calendar className={cls} />
    default: return <Activity className={cls} />
  }
}

function CustomBarTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: { stage: string; count: number; value: number } }> }) {
  if (!active || !payload?.length) return null
  const data = payload[0].payload
  return (
    <div className="bg-popover text-popover-foreground border border-border rounded-lg px-3 py-2 shadow-lg text-xs">
      <p className="font-semibold">{data.stage}</p>
      <p className="text-muted-foreground">{data.count} deals &middot; {"\u00A3"}{data.value.toLocaleString("en-GB")}</p>
    </div>
  )
}

function CustomPieTooltip({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number }> }) {
  if (!active || !payload?.length) return null
  const item = payload[0]
  return (
    <div className="bg-popover text-popover-foreground border border-border rounded-lg px-3 py-2 shadow-lg text-xs">
      <p className="font-semibold">{item.name}</p>
      <p className="text-muted-foreground">{item.value.toLocaleString("en-GB")} kg</p>
    </div>
  )
}

// ─── V1: Clean Corporate ────────────────────────────────────────────────────

function DashboardV1({ dateRange, setDateRange }: { dateRange: DateRange; setDateRange: (r: DateRange) => void }) {
  return (
    <div className="max-w-screen-2xl mx-auto px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">BNG / Nutrient Brokerage</p>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Solent catchment overview &middot; 7 March 2026</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Date Range Selector */}
          <div className="flex items-center rounded-lg border border-border bg-muted/50 p-0.5">
            {(["7d", "30d", "90d", "YTD"] as const).map((r) => (
              <button
                key={r}
                onClick={() => setDateRange(r)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  dateRange === r
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
          {/* Quick Actions */}
          <Separator orientation="vertical" className="h-8 mx-1" />
          <Link href="/admin/brokerage-mockups/deals" className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground px-3 py-1.5 rounded-md text-xs font-medium hover:bg-primary/90 transition-colors">
            <Plus className="h-3.5 w-3.5" /> New Deal
          </Link>
          <Link href="/admin/brokerage-mockups/sites" className="inline-flex items-center gap-1.5 border border-border bg-card px-3 py-1.5 rounded-md text-xs font-medium hover:bg-accent transition-colors">
            <Plus className="h-3.5 w-3.5" /> New Site
          </Link>
          <Link href="/admin/brokerage-mockups/contacts" className="inline-flex items-center gap-1.5 border border-border bg-card px-3 py-1.5 rounded-md text-xs font-medium hover:bg-accent transition-colors">
            <Plus className="h-3.5 w-3.5" /> New Contact
          </Link>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Link href="/admin/brokerage-mockups/deals" className="block hover:ring-2 hover:ring-primary/20 rounded-xl transition-all">
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <PoundSterling className="h-4 w-4 text-blue-600" />
                </div>
                <div className="flex items-center gap-1 text-xs font-medium text-emerald-600">
                  <ArrowUpRight className="h-3 w-3" /> +12%
                </div>
              </div>
              <p className="text-2xl font-bold tracking-tight">{"\u00A3"}2,403,800</p>
              <p className="text-xs text-muted-foreground mt-1">Active Pipeline &middot; 17 active deals</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/brokerage-mockups/inventory" className="block hover:ring-2 hover:ring-primary/20 rounded-xl transition-all">
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 rounded-lg bg-emerald-500/10">
                  <Leaf className="h-4 w-4 text-emerald-600" />
                </div>
                <div className="flex items-center gap-1 text-xs font-medium text-amber-600">
                  <ArrowDownRight className="h-3 w-3" /> -8%
                </div>
              </div>
              <p className="text-2xl font-bold tracking-tight">295 <span className="text-sm font-medium text-muted-foreground">kg N/yr</span></p>
              <p className="text-xs text-muted-foreground mt-1">Credits Available &middot; across 4 active sites</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/brokerage-mockups/financials" className="block hover:ring-2 hover:ring-primary/20 rounded-xl transition-all">
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 rounded-lg bg-violet-500/10">
                  <TrendingUp className="h-4 w-4 text-violet-600" />
                </div>
                <div className="flex items-center gap-1 text-xs font-medium text-emerald-600">
                  <ArrowUpRight className="h-3 w-3" /> +24%
                </div>
              </div>
              <p className="text-2xl font-bold tracking-tight">{"\u00A3"}187,400</p>
              <p className="text-xs text-muted-foreground mt-1">Commission YTD &middot; {"\u00A3"}42,600 this month</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/brokerage-mockups/compliance" className="block hover:ring-2 hover:ring-primary/20 rounded-xl transition-all">
          <Card className="border-red-200/50">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 rounded-lg bg-red-500/10">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                </div>
                <Badge className="bg-red-500 text-white text-[10px] px-1.5 py-0 border-0">3</Badge>
              </div>
              <p className="text-2xl font-bold tracking-tight">3 <span className="text-sm font-medium text-muted-foreground">items</span></p>
              <p className="text-xs text-muted-foreground mt-1">Overdue Compliance &middot; 7 due this week</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-5 gap-4">
        {/* Deals by Stage - 60% */}
        <Card className="col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              Deals by Stage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={DEALS_BY_STAGE} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                  <XAxis type="number" tickFormatter={(v: number) => String(v)} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis type="category" dataKey="stage" width={110} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <RechartsTooltip content={<CustomBarTooltip />} />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={18}>
                    {DEALS_BY_STAGE.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Credits Gauge - 40% */}
        <Card className="col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Leaf className="h-4 w-4 text-muted-foreground" />
              Credit Allocation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={CREDITS_GAUGE}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                    startAngle={90}
                    endAngle={-270}
                  >
                    {CREDITS_GAUGE.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip content={<CustomPieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center">
                  <p className="text-lg font-bold">600</p>
                  <p className="text-[10px] text-muted-foreground">kg total capacity</p>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-center gap-4 mt-2">
              {CREDITS_GAUGE.map((item) => (
                <div key={item.name} className="flex items-center gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-[11px] text-muted-foreground">{item.name}</span>
                  <span className="text-[11px] font-medium">{item.value.toLocaleString("en-GB")}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Deal Lifecycle Funnel */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Activity className="h-4 w-4 text-muted-foreground" />
            Deal Lifecycle
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-1 h-[100px]">
            {LIFECYCLE_STAGES.map((s) => {
              const maxCount = Math.max(...LIFECYCLE_STAGES.map(ls => ls.count), 1);
              const height = Math.max((s.count / maxCount) * 80, 4);
              return (
                <Link
                  key={s.stage}
                  href={`/admin/brokerage-mockups/deals?stage=${encodeURIComponent(s.stage)}`}
                  className="flex-1 flex flex-col items-center gap-1 group"
                >
                  <span className="text-[10px] font-bold text-foreground">{s.count}</span>
                  <div
                    className="w-full rounded-t transition-all group-hover:opacity-80"
                    style={{ height: `${height}px`, background: s.color }}
                  />
                  <span className="text-[9px] text-muted-foreground text-center leading-tight truncate w-full">
                    {s.stage}
                  </span>
                </Link>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Lists Row */}
      <div className="grid grid-cols-2 gap-4">
        {/* Upcoming Assessments */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              Upcoming Assessments
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {UPCOMING_ASSESSMENTS.map((a, i) => (
              <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg border border-border hover:bg-accent/30 transition-colors">
                <div className="bg-muted rounded-md px-2.5 py-1.5 text-center shrink-0">
                  <p className="text-[10px] font-medium text-muted-foreground leading-none">{a.date.split(" ")[0]}</p>
                  <p className="text-sm font-bold leading-tight">{a.date.split(" ")[1]}</p>
                  <p className="text-[10px] text-muted-foreground leading-none">{a.date.split(" ")[2]}</p>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{a.site}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <div className="h-5 w-5 rounded-full bg-muted flex items-center justify-center text-[9px] font-bold text-muted-foreground shrink-0">
                      {a.initials}
                    </div>
                    <span className="text-xs text-muted-foreground">{a.assessor}</span>
                  </div>
                </div>
                <Badge className={a.status === "Confirmed"
                  ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20"
                  : "bg-blue-500/10 text-blue-700 border-blue-500/20"
                }>
                  {a.status}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Overdue Compliance */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                Overdue Compliance Alerts
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge className="bg-red-500/10 text-red-600 border-red-500/20">{OVERDUE_COMPLIANCE.length} overdue</Badge>
                <Link href="/admin/brokerage-mockups/compliance" className="text-xs text-muted-foreground hover:text-primary transition-colors">
                  View All &rarr;
                </Link>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {OVERDUE_COMPLIANCE.map((item, i) => (
              <div key={i} className="border-l-2 border-red-500 pl-3 py-2 rounded-r-lg bg-red-500/[0.03] hover:bg-red-500/[0.06] transition-colors">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium">{item.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.site}</p>
                  </div>
                  <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-[9px] font-bold text-muted-foreground shrink-0">
                    {item.initials}
                  </div>
                </div>
                <p className="text-xs text-red-600 font-medium mt-1">
                  Due {item.due} &middot; {item.daysOverdue} days overdue
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Activity Feed */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Activity className="h-4 w-4 text-muted-foreground" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {RECENT_ACTIVITY.map((item, i) => (
              <div key={i} className="flex items-center gap-3 py-2.5 px-2 rounded-md hover:bg-accent/30 transition-colors">
                <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <ActivityIcon type={item.icon} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm">
                    <span className="font-medium">{item.user}</span>
                    {" "}<span className="text-muted-foreground">{item.action}</span>
                    {" "}{/^D-\d{4}/.test(item.entity) || item.action.includes("D-00") ? (
                      <Link href="/admin/brokerage-mockups/deals" className="font-medium text-primary hover:underline">{item.entity}</Link>
                    ) : item.icon === "check" || item.icon === "calendar" || item.icon === "doc" ? (
                      <Link href="/admin/brokerage-mockups/sites" className="font-medium text-primary hover:underline">{item.entity}</Link>
                    ) : (
                      <span className="font-medium text-primary">{item.entity}</span>
                    )}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">{item.time}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── V2: Dark-Accented ─────────────────────────────────────────────────────

function DashboardV2({ dateRange, setDateRange }: { dateRange: DateRange; setDateRange: (r: DateRange) => void }) {
  return (
    <div className="max-w-screen-2xl mx-auto px-6 py-6 space-y-6">
      {/* Header with gradient */}
      <div className="rounded-xl bg-gradient-to-r from-slate-900 to-slate-800 p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="h-8 w-8 rounded-lg bg-emerald-500 flex items-center justify-center">
                <Leaf className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-widest text-slate-400">BNG / Nutrient Brokerage</p>
                <h1 className="text-xl font-bold tracking-tight">Dashboard</h1>
              </div>
            </div>
            <p className="text-sm text-slate-400">Solent catchment &middot; 7 March 2026</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center rounded-lg bg-white/10 p-0.5 backdrop-blur">
              {(["7d", "30d", "90d", "YTD"] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setDateRange(r)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    dateRange === r
                      ? "bg-white text-slate-900 shadow"
                      : "text-slate-300 hover:text-white"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
            <Separator orientation="vertical" className="h-8 bg-white/20" />
            <Link href="/admin/brokerage-mockups/deals" className="inline-flex items-center gap-1.5 bg-emerald-500 text-white px-3 py-1.5 rounded-md text-xs font-semibold hover:bg-emerald-400 transition-colors">
              <Plus className="h-3.5 w-3.5" /> New Deal
            </Link>
            <Link href="/admin/brokerage-mockups/sites" className="inline-flex items-center gap-1.5 bg-white/10 text-white px-3 py-1.5 rounded-md text-xs font-medium hover:bg-white/20 transition-colors backdrop-blur">
              <Plus className="h-3.5 w-3.5" /> New Site
            </Link>
            <Link href="/admin/brokerage-mockups/contacts" className="inline-flex items-center gap-1.5 bg-white/10 text-white px-3 py-1.5 rounded-md text-xs font-medium hover:bg-white/20 transition-colors backdrop-blur">
              <Plus className="h-3.5 w-3.5" /> New Contact
            </Link>
          </div>
        </div>
      </div>

      {/* Stat Cards - dark themed */}
      <div className="grid grid-cols-4 gap-4">
        <Link href="/admin/brokerage-mockups/deals" className="block hover:ring-2 hover:ring-primary/20 rounded-xl transition-all">
          <div className="rounded-xl bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700/50 p-5 text-white h-full">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2.5 rounded-xl bg-blue-500/20 ring-1 ring-blue-500/30">
                <PoundSterling className="h-5 w-5 text-blue-400" />
              </div>
              <div className="flex items-center gap-1 text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                <ArrowUpRight className="h-3 w-3" /> 12%
              </div>
            </div>
            <p className="text-3xl font-bold tracking-tight">{"\u00A3"}2.40M</p>
            <p className="text-xs text-slate-400 mt-1.5">Active Pipeline</p>
            <p className="text-[11px] text-slate-500 mt-0.5">17 active deals</p>
          </div>
        </Link>

        <Link href="/admin/brokerage-mockups/inventory" className="block hover:ring-2 hover:ring-primary/20 rounded-xl transition-all">
          <div className="rounded-xl bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700/50 p-5 text-white h-full">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2.5 rounded-xl bg-emerald-500/20 ring-1 ring-emerald-500/30">
                <Leaf className="h-5 w-5 text-emerald-400" />
              </div>
              <div className="flex items-center gap-1 text-xs font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">
                <ArrowDownRight className="h-3 w-3" /> 8%
              </div>
            </div>
            <p className="text-3xl font-bold tracking-tight">295</p>
            <p className="text-xs text-slate-400 mt-1.5">Credits Available (kg N/yr)</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Across 4 active sites</p>
          </div>
        </Link>

        <Link href="/admin/brokerage-mockups/financials" className="block hover:ring-2 hover:ring-primary/20 rounded-xl transition-all">
          <div className="rounded-xl bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700/50 p-5 text-white h-full">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2.5 rounded-xl bg-violet-500/20 ring-1 ring-violet-500/30">
                <TrendingUp className="h-5 w-5 text-violet-400" />
              </div>
              <div className="flex items-center gap-1 text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                <ArrowUpRight className="h-3 w-3" /> 24%
              </div>
            </div>
            <p className="text-3xl font-bold tracking-tight">{"\u00A3"}187.4K</p>
            <p className="text-xs text-slate-400 mt-1.5">Commission YTD</p>
            <p className="text-[11px] text-slate-500 mt-0.5">{"\u00A3"}42,600 this month</p>
          </div>
        </Link>

        <Link href="/admin/brokerage-mockups/compliance" className="block hover:ring-2 hover:ring-primary/20 rounded-xl transition-all">
          <div className="rounded-xl bg-gradient-to-br from-red-950/80 to-slate-900 border border-red-800/30 p-5 text-white h-full">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2.5 rounded-xl bg-red-500/20 ring-1 ring-red-500/30">
                <AlertTriangle className="h-5 w-5 text-red-400" />
              </div>
              <div className="h-6 w-6 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center animate-pulse">
                3
              </div>
            </div>
            <p className="text-3xl font-bold tracking-tight">3</p>
            <p className="text-xs text-slate-400 mt-1.5">Overdue Compliance</p>
            <p className="text-[11px] text-slate-500 mt-0.5">7 due this week</p>
          </div>
        </Link>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-5 gap-4">
        {/* Deals by Stage */}
        <div className="col-span-3 rounded-xl bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700/50 p-5">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-slate-400" />
            Deals by Stage
          </h3>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={DEALS_BY_STAGE} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.06)" />
                <XAxis type="number" tick={{ fontSize: 11, fill: "#94a3b8" }} stroke="rgba(255,255,255,0.1)" />
                <YAxis type="category" dataKey="stage" width={110} tick={{ fontSize: 11, fill: "#94a3b8" }} stroke="rgba(255,255,255,0.1)" />
                <RechartsTooltip content={<CustomBarTooltip />} />
                <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={18}>
                  {DEALS_BY_STAGE.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Credits Gauge */}
        <div className="col-span-2 rounded-xl bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700/50 p-5">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Leaf className="h-4 w-4 text-slate-400" />
            Credit Allocation
          </h3>
          <div className="h-[200px] relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={CREDITS_GAUGE}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={4}
                  dataKey="value"
                  startAngle={90}
                  endAngle={-270}
                  stroke="none"
                >
                  {CREDITS_GAUGE.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip content={<CustomPieTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <p className="text-xl font-bold text-white">600</p>
                <p className="text-[10px] text-slate-400">kg total capacity</p>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-center gap-4 mt-3">
            {CREDITS_GAUGE.map((item) => (
              <div key={item.name} className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-[11px] text-slate-400">{item.name}</span>
                <span className="text-[11px] font-medium text-white">{item.value.toLocaleString("en-GB")}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Lists Row */}
      <div className="grid grid-cols-2 gap-4">
        {/* Upcoming Assessments */}
        <div className="rounded-xl bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700/50 p-5">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-slate-400" />
            Upcoming Assessments
          </h3>
          <div className="space-y-2.5">
            {UPCOMING_ASSESSMENTS.map((a, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] transition-colors">
                <div className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-center shrink-0">
                  <p className="text-[10px] font-medium text-slate-500 leading-none">{a.date.split(" ")[0]}</p>
                  <p className="text-sm font-bold text-white leading-tight">{a.date.split(" ")[1]}</p>
                  <p className="text-[10px] text-slate-500 leading-none">{a.date.split(" ")[2]}</p>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{a.site}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <div className="h-5 w-5 rounded-full bg-slate-700 flex items-center justify-center text-[9px] font-bold text-slate-300 shrink-0">
                      {a.initials}
                    </div>
                    <span className="text-xs text-slate-400">{a.assessor}</span>
                  </div>
                </div>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  a.status === "Confirmed"
                    ? "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/20"
                    : "bg-blue-500/15 text-blue-400 ring-1 ring-blue-500/20"
                }`}>
                  {a.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Overdue Compliance */}
        <div className="rounded-xl bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700/50 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-400" />
              Overdue Compliance Alerts
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold bg-red-500/15 text-red-400 ring-1 ring-red-500/20 px-2 py-0.5 rounded-full">
                {OVERDUE_COMPLIANCE.length} overdue
              </span>
              <Link href="/admin/brokerage-mockups/compliance" className="text-xs text-slate-400 hover:text-white transition-colors">
                View All &rarr;
              </Link>
            </div>
          </div>
          <div className="space-y-2.5">
            {OVERDUE_COMPLIANCE.map((item, i) => (
              <div key={i} className="border-l-2 border-red-500 pl-3 py-2.5 pr-3 rounded-r-lg bg-red-500/[0.05] hover:bg-red-500/[0.08] transition-colors">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-white">{item.title}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{item.site}</p>
                  </div>
                  <div className="h-6 w-6 rounded-full bg-slate-700 flex items-center justify-center text-[9px] font-bold text-slate-300 shrink-0">
                    {item.initials}
                  </div>
                </div>
                <p className="text-xs text-red-400 font-medium mt-1.5">
                  Due {item.due} &middot; {item.daysOverdue} days overdue
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Activity Feed */}
      <div className="rounded-xl bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700/50 p-5">
        <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <Activity className="h-4 w-4 text-slate-400" />
          Recent Activity
        </h3>
        <div className="space-y-0.5">
          {RECENT_ACTIVITY.map((item, i) => (
            <div key={i} className="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-white/[0.03] transition-colors">
              <div className="h-8 w-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 shrink-0">
                <ActivityIcon type={item.icon} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm">
                  <span className="font-medium text-white">{item.user}</span>
                  {" "}<span className="text-slate-400">{item.action}</span>
                  {" "}{/^D-\d{4}/.test(item.entity) || item.action.includes("D-00") ? (
                    <Link href="/admin/brokerage-mockups/deals" className="font-medium text-emerald-400 hover:underline">{item.entity}</Link>
                  ) : item.icon === "check" || item.icon === "calendar" || item.icon === "doc" ? (
                    <Link href="/admin/brokerage-mockups/sites" className="font-medium text-emerald-400 hover:underline">{item.entity}</Link>
                  ) : (
                    <span className="font-medium text-emerald-400">{item.entity}</span>
                  )}
                </p>
              </div>
              <span className="text-xs text-slate-500 whitespace-nowrap shrink-0">{item.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── V3: Compact Data-Dense ─────────────────────────────────────────────────

function DashboardV3({ dateRange, setDateRange }: { dateRange: DateRange; setDateRange: (r: DateRange) => void }) {
  return (
    <div className="max-w-screen-2xl mx-auto px-4 py-4 space-y-3">
      {/* Compact Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold tracking-tight">Dashboard</h1>
          <Separator orientation="vertical" className="h-5" />
          <p className="text-xs text-muted-foreground">Solent &middot; 7 Mar 2026</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-md border border-border bg-muted/50 p-0.5">
            {(["7d", "30d", "90d", "YTD"] as const).map((r) => (
              <button
                key={r}
                onClick={() => setDateRange(r)}
                className={`px-2 py-1 rounded text-[10px] font-medium transition-colors ${
                  dateRange === r
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
          <Link href="/admin/brokerage-mockups/deals" className="inline-flex items-center gap-1 bg-primary text-primary-foreground px-2.5 py-1 rounded text-[10px] font-medium hover:bg-primary/90">
            <Plus className="h-3 w-3" /> Deal
          </Link>
          <Link href="/admin/brokerage-mockups/sites" className="inline-flex items-center gap-1 border border-border px-2.5 py-1 rounded text-[10px] font-medium hover:bg-accent">
            <Plus className="h-3 w-3" /> Site
          </Link>
          <Link href="/admin/brokerage-mockups/contacts" className="inline-flex items-center gap-1 border border-border px-2.5 py-1 rounded text-[10px] font-medium hover:bg-accent">
            <Plus className="h-3 w-3" /> Contact
          </Link>
        </div>
      </div>

      {/* Compact Stat Cards - single row with more density */}
      <div className="grid grid-cols-4 gap-2">
        <Link href="/admin/brokerage-mockups/deals" className="block hover:ring-2 hover:ring-primary/20 rounded-xl transition-all">
          <div className="rounded-lg border border-border bg-card px-3 py-2.5 flex items-center gap-3 h-full">
            <div className="p-1.5 rounded bg-blue-500/10 shrink-0">
              <PoundSterling className="h-3.5 w-3.5 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="text-lg font-bold tracking-tight leading-none">{"\u00A3"}2,403,800</p>
                <span className="text-[10px] font-semibold text-emerald-600 flex items-center gap-0.5">
                  <ArrowUpRight className="h-2.5 w-2.5" />12%
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">Active Pipeline &middot; 17 deals</p>
            </div>
          </div>
        </Link>

        <Link href="/admin/brokerage-mockups/inventory" className="block hover:ring-2 hover:ring-primary/20 rounded-xl transition-all">
          <div className="rounded-lg border border-border bg-card px-3 py-2.5 flex items-center gap-3 h-full">
            <div className="p-1.5 rounded bg-emerald-500/10 shrink-0">
              <Leaf className="h-3.5 w-3.5 text-emerald-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="text-lg font-bold tracking-tight leading-none">295 <span className="text-[10px] font-normal text-muted-foreground">kg</span></p>
                <span className="text-[10px] font-semibold text-amber-600 flex items-center gap-0.5">
                  <ArrowDownRight className="h-2.5 w-2.5" />8%
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">Credits &middot; 4 sites</p>
            </div>
          </div>
        </Link>

        <Link href="/admin/brokerage-mockups/financials" className="block hover:ring-2 hover:ring-primary/20 rounded-xl transition-all">
          <div className="rounded-lg border border-border bg-card px-3 py-2.5 flex items-center gap-3 h-full">
            <div className="p-1.5 rounded bg-violet-500/10 shrink-0">
              <TrendingUp className="h-3.5 w-3.5 text-violet-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="text-lg font-bold tracking-tight leading-none">{"\u00A3"}187,400</p>
                <span className="text-[10px] font-semibold text-emerald-600 flex items-center gap-0.5">
                  <ArrowUpRight className="h-2.5 w-2.5" />24%
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">Commission &middot; {"\u00A3"}42.6K/mo</p>
            </div>
          </div>
        </Link>

        <Link href="/admin/brokerage-mockups/compliance" className="block hover:ring-2 hover:ring-primary/20 rounded-xl transition-all">
          <div className="rounded-lg border border-red-200/50 bg-card px-3 py-2.5 flex items-center gap-3 h-full">
            <div className="p-1.5 rounded bg-red-500/10 shrink-0">
              <AlertTriangle className="h-3.5 w-3.5 text-red-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="text-lg font-bold tracking-tight leading-none text-red-600">3</p>
                <span className="text-[10px] font-semibold bg-red-500 text-white px-1.5 py-0 rounded-full">!</span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">Overdue &middot; 7 due this week</p>
            </div>
          </div>
        </Link>
      </div>

      {/* Dense 3-column layout */}
      <div className="grid grid-cols-12 gap-3">
        {/* Charts Column - 5 cols */}
        <div className="col-span-5 space-y-3">
          {/* Deals by Stage */}
          <Card className="shadow-none">
            <CardContent className="p-3">
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Deals by Stage</h3>
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={DEALS_BY_STAGE} layout="vertical" margin={{ top: 0, right: 12, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                    <XAxis type="number" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis type="category" dataKey="stage" width={95} tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
                    <RechartsTooltip content={<CustomBarTooltip />} />
                    <Bar dataKey="count" radius={[0, 3, 3, 0]} barSize={14}>
                      {DEALS_BY_STAGE.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Credits Gauge - compact */}
          <Card className="shadow-none">
            <CardContent className="p-3">
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Credit Allocation</h3>
              <div className="flex items-center gap-3">
                <div className="h-[120px] w-[120px] relative shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={CREDITS_GAUGE}
                        cx="50%"
                        cy="50%"
                        innerRadius={38}
                        outerRadius={55}
                        paddingAngle={3}
                        dataKey="value"
                        startAngle={90}
                        endAngle={-270}
                      >
                        {CREDITS_GAUGE.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="text-center">
                      <p className="text-xs font-bold">600</p>
                      <p className="text-[8px] text-muted-foreground">total kg</p>
                    </div>
                  </div>
                </div>
                <div className="flex-1 space-y-1.5">
                  {CREDITS_GAUGE.map((item) => (
                    <div key={item.name} className="flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-muted-foreground">{item.name}</span>
                      </div>
                      <span className="font-semibold tabular-nums">{item.value.toLocaleString("en-GB")} kg</span>
                    </div>
                  ))}
                  <Separator className="my-1" />
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground">Utilisation</span>
                    <span className="font-semibold">50.8%</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Middle Column - Assessments + Compliance - 4 cols */}
        <div className="col-span-4 space-y-3">
          {/* Upcoming Assessments - compact */}
          <Card className="shadow-none">
            <CardContent className="p-3">
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Upcoming Assessments</h3>
              <div className="space-y-1">
                {UPCOMING_ASSESSMENTS.map((a, i) => (
                  <div key={i} className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-accent/30 transition-colors">
                    <span className="text-[10px] font-mono font-medium text-muted-foreground w-16 shrink-0">{a.date}</span>
                    <span className="text-xs font-medium truncate flex-1">{a.site}</span>
                    <TooltipProvider delayDuration={200}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="h-5 w-5 rounded-full bg-muted flex items-center justify-center text-[8px] font-bold text-muted-foreground shrink-0 cursor-default">
                            {a.initials}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">{a.assessor}</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${
                      a.status === "Confirmed"
                        ? "bg-emerald-500/10 text-emerald-700"
                        : "bg-blue-500/10 text-blue-700"
                    }`}>
                      {a.status === "Confirmed" ? "CONF" : "SCHED"}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Overdue Compliance - compact */}
          <Card className="shadow-none border-red-200/30">
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-red-600">Overdue Compliance</h3>
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] font-bold bg-red-500 text-white px-1.5 py-0.5 rounded-full">{OVERDUE_COMPLIANCE.length}</span>
                  <Link href="/admin/brokerage-mockups/compliance" className="text-[10px] text-muted-foreground hover:text-primary transition-colors">
                    View All &rarr;
                  </Link>
                </div>
              </div>
              <div className="space-y-1">
                {OVERDUE_COMPLIANCE.map((item, i) => (
                  <div key={i} className="border-l-2 border-red-500 pl-2 py-1.5">
                    <p className="text-xs font-medium leading-tight">{item.title}</p>
                    <div className="flex items-center justify-between mt-0.5">
                      <span className="text-[10px] text-muted-foreground">{item.site}</span>
                      <span className="text-[10px] text-red-600 font-medium">{item.daysOverdue}d overdue</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Extra dense stats */}
          <Card className="shadow-none">
            <CardContent className="p-3">
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Key Metrics</h3>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground">Avg Deal Value</span>
                  <span className="font-semibold tabular-nums">{"\u00A3"}130K</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground">Win Rate</span>
                  <span className="font-semibold tabular-nums">68%</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground">Avg Days to Close</span>
                  <span className="font-semibold tabular-nums">42d</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground">Commission Rate</span>
                  <span className="font-semibold tabular-nums">20%</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground">Sites Active</span>
                  <span className="font-semibold tabular-nums">6</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground">Supply Gap</span>
                  <span className="font-semibold tabular-nums text-red-600">15 kg</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground">Active Contacts</span>
                  <span className="font-semibold tabular-nums">15</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground">Invoices Pending</span>
                  <span className="font-semibold tabular-nums text-amber-600">3</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Activity Column - 3 cols */}
        <div className="col-span-3">
          <Card className="shadow-none h-full">
            <CardContent className="p-3 h-full flex flex-col">
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Activity Feed</h3>
              <ScrollArea className="flex-1">
                <div className="space-y-0.5 pr-2">
                  {RECENT_ACTIVITY.map((item, i) => (
                    <div key={i} className="flex items-start gap-2 py-1.5 px-1.5 rounded hover:bg-accent/30 transition-colors">
                      <div className="h-5 w-5 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                        <ActivityIcon type={item.icon} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] leading-snug">
                          <span className="font-medium">{item.user}</span>
                          {" "}<span className="text-muted-foreground">{item.action}</span>
                          {" "}{/^D-\d{4}/.test(item.entity) || item.action.includes("D-00") ? (
                            <Link href="/admin/brokerage-mockups/deals" className="font-medium text-primary hover:underline">{item.entity}</Link>
                          ) : item.icon === "check" || item.icon === "calendar" || item.icon === "doc" ? (
                            <Link href="/admin/brokerage-mockups/sites" className="font-medium text-primary hover:underline">{item.entity}</Link>
                          ) : (
                            <span className="font-medium text-primary">{item.entity}</span>
                          )}
                        </p>
                        <p className="text-[9px] text-muted-foreground mt-0.5">{item.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [variation, setVariation] = useState<Variation>("v1")
  const [dateRange, setDateRange] = useState<DateRange>("30d")

  return (
    <div>
      {/* Variation Selector */}
      <div className="border-b border-border bg-muted/30">
        <div className="max-w-screen-xl mx-auto px-6 py-2 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Eye className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground mr-2">Variation:</span>
            <div className="flex items-center rounded-lg border border-border bg-background p-0.5">
              {([
                { key: "v1" as const, label: "V1 - Corporate" },
                { key: "v2" as const, label: "V2 - Dark Accent" },
                { key: "v3" as const, label: "V3 - Compact Dense" },
              ]).map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setVariation(key)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    variation === key
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Mockup only &middot; All data is hardcoded
          </p>
        </div>
      </div>

      {/* Render selected variation */}
      {variation === "v1" && <DashboardV1 dateRange={dateRange} setDateRange={setDateRange} />}
      {variation === "v2" && <DashboardV2 dateRange={dateRange} setDateRange={setDateRange} />}
      {variation === "v3" && <DashboardV3 dateRange={dateRange} setDateRange={setDateRange} />}
    </div>
  )
}
