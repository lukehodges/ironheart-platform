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
import { Separator } from "@/components/ui/separator"
import {
  PoundSterling,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  BarChart3,
  Calculator,
  Eye,
} from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Variation = "executive" | "dashboard" | "accountant"

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const STAT_CARDS = {
  totalDealValue: { value: 1_875_000, label: "Total Deal Value (YTD)", subtitle: "14 deals closed or in progress" },
  totalCommission: { value: 187_400, label: "Total Commission (YTD)", subtitle: "at 20% average rate" },
  collected: { value: 142_800, label: "Collected", subtitle: "76.2% of earned", pct: 76.2 },
  outstanding: { value: 44_600, label: "Outstanding", subtitle: "3 invoices pending", count: 3 },
}

const MONTHLY_COMMISSION = [
  { month: "Oct", collected: 18_200, outstanding: 0, total: 18_200 },
  { month: "Nov", collected: 31_500, outstanding: 0, total: 31_500 },
  { month: "Dec", collected: 22_800, outstanding: 0, total: 22_800 },
  { month: "Jan", collected: 28_400, outstanding: 0, total: 28_400 },
  { month: "Feb", collected: 37_700, outstanding: 6_200, total: 43_900 },
  { month: "Mar", collected: 4_200, outstanding: 38_400, total: 42_600 },
]

const BROKER_COMMISSION = [
  { name: "James Harris", initials: "JH", commission: 112_440, pct: 60, deals: 9, color: "#3b82f6" },
  { name: "Sarah Croft", initials: "SC", commission: 56_220, pct: 30, deals: 4, color: "#8b5cf6" },
  { name: "Tom Jenkins", initials: "TJ", commission: 18_740, pct: 10, deals: 1, color: "#10b981" },
]

const OUTSTANDING_PAYMENTS = [
  {
    invoice: "INV-0019",
    deal: "D-0038",
    contact: "Taylor Wimpey",
    amount: 27_000,
    status: "Sent" as const,
    issued: "5 Mar 2026",
    due: "5 Apr 2026",
    overdue: null,
  },
  {
    invoice: "INV-0017",
    deal: "D-0048",
    contact: "Linden Homes",
    amount: 11_400,
    status: "Overdue" as const,
    issued: "15 Feb 2026",
    due: "15 Mar 2026",
    overdue: "0 days (due today)",
  },
  {
    invoice: "INV-0015",
    deal: "D-0046",
    contact: "Ian Stockbridge",
    amount: 6_200,
    status: "Draft" as const,
    issued: null,
    due: null,
    overdue: null,
  },
]

const RECENT_TRANSACTIONS = [
  { date: "3 Mar 2026", type: "Payment" as const, contact: "Barratt Homes", deal: "D-0035", amount: 72_000, method: "Bank Transfer", status: "Cleared" as const },
  { date: "28 Feb 2026", type: "Commission" as const, contact: "Miller Homes", deal: "D-0050", amount: 15_000, method: "--", status: "Pending Invoice" as const },
  { date: "25 Feb 2026", type: "Payment" as const, contact: "Persimmon Homes", deal: "D-0029", amount: 2_800, method: "Stripe", status: "Cleared" as const },
  { date: "20 Feb 2026", type: "Commission" as const, contact: "David Wilson Homes", deal: "D-0051", amount: 15_600, method: "--", status: "Invoiced" as const },
  { date: "15 Feb 2026", type: "Payment" as const, contact: "Linden Homes", deal: "D-0048", amount: 22_800, method: "Bank Transfer", status: "Cleared" as const },
]

const COMMISSION_SPLIT = {
  developerPays: 135_000,
  platformTakes: 27_000,
  platformPct: 20,
  landownerReceives: 108_000,
  landownerPct: 80,
}

const PIE_DATA_UNIT_TYPE = [
  { name: "Nitrogen Credits", value: 156_200, color: "#3b82f6" },
  { name: "BNG Units", value: 15_600, color: "#10b981" },
  { name: "Phosphorus Credits", value: 15_600, color: "#f59e0b" },
]

// Accountant view: transaction ledger
const FULL_LEDGER = [
  { date: "3 Mar 2026", ref: "TXN-0078", type: "Payment Received", description: "Barratt Homes - D-0035 final payment", debit: null, credit: 72_000, balance: 142_800 },
  { date: "28 Feb 2026", ref: "TXN-0077", type: "Commission Earned", description: "Miller Homes - D-0050 (25 kg N/yr)", debit: 15_000, credit: null, balance: 70_800 },
  { date: "25 Feb 2026", ref: "TXN-0076", type: "Payment Received", description: "Persimmon Homes - D-0029 final tranche", debit: null, credit: 2_800, balance: 55_800 },
  { date: "20 Feb 2026", ref: "TXN-0075", type: "Commission Earned", description: "David Wilson Homes - D-0051 (6.5 BNG)", debit: 15_600, credit: null, balance: 53_000 },
  { date: "15 Feb 2026", ref: "TXN-0074", type: "Payment Received", description: "Linden Homes - D-0048 deposit", debit: null, credit: 22_800, balance: 37_400 },
  { date: "8 Feb 2026", ref: "TXN-0073", type: "Commission Earned", description: "Taylor Wimpey - D-0038 (45 kg N/yr)", debit: 27_000, credit: null, balance: 14_600 },
  { date: "1 Feb 2026", ref: "TXN-0072", type: "Payment Received", description: "Barratt Homes - D-0035 tranche 2", debit: null, credit: 14_600, balance: 14_600 },
]

const INVOICE_AGING = [
  { range: "Current (0-30 days)", count: 1, amount: 27_000 },
  { range: "31-60 days", count: 1, amount: 11_400 },
  { range: "61-90 days", count: 0, amount: 0 },
  { range: "90+ days", count: 0, amount: 0 },
  { range: "Draft", count: 1, amount: 6_200 },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmtGBP(value: number): string {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value)
}

function fmtGBPk(value: number): string {
  if (value >= 1_000) return `\u00a3${(value / 1_000).toFixed(1)}k`
  return fmtGBP(value)
}

// ---------------------------------------------------------------------------
// Status badge styles
// ---------------------------------------------------------------------------

function invoiceStatusStyle(status: string) {
  switch (status) {
    case "Sent":
      return "bg-blue-500/10 text-blue-700 border-blue-500/20"
    case "Overdue":
      return "bg-red-500/10 text-red-700 border-red-500/20"
    case "Draft":
      return "bg-zinc-500/10 text-zinc-600 border-zinc-500/20"
    case "Paid":
      return "bg-emerald-500/10 text-emerald-700 border-emerald-500/20"
    default:
      return "bg-muted text-muted-foreground"
  }
}

function transactionTypeStyle(type: string) {
  switch (type) {
    case "Payment":
      return "bg-emerald-500/10 text-emerald-700 border-emerald-500/20"
    case "Commission":
      return "bg-blue-500/10 text-blue-700 border-blue-500/20"
    case "Refund":
      return "bg-red-500/10 text-red-700 border-red-500/20"
    default:
      return "bg-muted text-muted-foreground"
  }
}

function transactionStatusStyle(status: string) {
  switch (status) {
    case "Cleared":
      return "bg-emerald-500/10 text-emerald-700 border-emerald-500/20"
    case "Pending Invoice":
      return "bg-amber-500/10 text-amber-700 border-amber-500/20"
    case "Invoiced":
      return "bg-blue-500/10 text-blue-700 border-blue-500/20"
    default:
      return "bg-muted text-muted-foreground"
  }
}

// ---------------------------------------------------------------------------
// Stat Card Component
// ---------------------------------------------------------------------------

function StatCard({
  label,
  value,
  subtitle,
  icon: Icon,
  accent,
  progress,
}: {
  label: string
  value: string
  subtitle: string
  icon: React.ElementType
  accent: string
  progress?: number
}) {
  return (
    <Card className="flex-1 min-w-[200px]">
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className={`p-2 rounded-lg ${accent}`}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider mb-1">
          {label}
        </p>
        <p className="text-2xl font-bold text-foreground tracking-tight leading-tight">
          {value}
        </p>
        <p className="text-[12px] text-muted-foreground mt-1">{subtitle}</p>
        {progress !== undefined && (
          <div className="mt-3 h-1.5 w-full bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Commission Flow Visualization
// ---------------------------------------------------------------------------

function CommissionFlowViz({ compact }: { compact?: boolean }) {
  const boxH = compact ? "py-3 px-3" : "py-4 px-5"
  const textSize = compact ? "text-sm" : "text-lg"
  const labelSize = compact ? "text-[10px]" : "text-[11px]"

  return (
    <div className="flex items-center gap-2 w-full">
      {/* Developer */}
      <div className={`flex-1 rounded-lg border border-blue-200 bg-blue-50 ${boxH} text-center`}>
        <p className={`${labelSize} text-blue-600 font-medium uppercase tracking-wider mb-0.5`}>
          Developer Pays
        </p>
        <p className={`${textSize} font-bold text-blue-700`}>{fmtGBP(COMMISSION_SPLIT.developerPays)}</p>
      </div>

      <div className="flex flex-col items-center shrink-0">
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
      </div>

      {/* Platform */}
      <div className={`flex-1 rounded-lg border border-emerald-200 bg-emerald-50 ${boxH} text-center`}>
        <p className={`${labelSize} text-emerald-600 font-medium uppercase tracking-wider mb-0.5`}>
          Platform ({COMMISSION_SPLIT.platformPct}%)
        </p>
        <p className={`${textSize} font-bold text-emerald-700`}>{fmtGBP(COMMISSION_SPLIT.platformTakes)}</p>
      </div>

      <div className="flex flex-col items-center shrink-0">
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
      </div>

      {/* Landowner */}
      <div className={`flex-1 rounded-lg border border-amber-200 bg-amber-50 ${boxH} text-center`}>
        <p className={`${labelSize} text-amber-600 font-medium uppercase tracking-wider mb-0.5`}>
          Landowner ({COMMISSION_SPLIT.landownerPct}%)
        </p>
        <p className={`${textSize} font-bold text-amber-700`}>{fmtGBP(COMMISSION_SPLIT.landownerReceives)}</p>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Broker Avatar
// ---------------------------------------------------------------------------

function BrokerAvatar({ initials, color }: { initials: string; color: string }) {
  return (
    <div
      className="h-8 w-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0"
      style={{ backgroundColor: color }}
    >
      {initials}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Custom Recharts Tooltip
// ---------------------------------------------------------------------------

function MonthlyTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; dataKey: string }>; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-card border border-border rounded-lg shadow-lg p-3 text-xs">
      <p className="font-semibold text-foreground mb-1">{label} 2025/26</p>
      {payload.map((entry) => (
        <p key={entry.dataKey} className="text-muted-foreground">
          {entry.dataKey === "collected" ? "Collected" : "Outstanding"}: {fmtGBP(entry.value)}
        </p>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// V1: Executive Summary
// ---------------------------------------------------------------------------

function ExecutiveSummary() {
  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label={STAT_CARDS.totalDealValue.label}
          value={fmtGBP(STAT_CARDS.totalDealValue.value)}
          subtitle={STAT_CARDS.totalDealValue.subtitle}
          icon={PoundSterling}
          accent="bg-blue-500/10 text-blue-600"
        />
        <StatCard
          label={STAT_CARDS.totalCommission.label}
          value={fmtGBP(STAT_CARDS.totalCommission.value)}
          subtitle={STAT_CARDS.totalCommission.subtitle}
          icon={TrendingUp}
          accent="bg-emerald-500/10 text-emerald-600"
        />
        <StatCard
          label={STAT_CARDS.collected.label}
          value={fmtGBP(STAT_CARDS.collected.value)}
          subtitle={STAT_CARDS.collected.subtitle}
          icon={CheckCircle2}
          accent="bg-emerald-500/10 text-emerald-600"
          progress={STAT_CARDS.collected.pct}
        />
        <StatCard
          label={STAT_CARDS.outstanding.label}
          value={fmtGBP(STAT_CARDS.outstanding.value)}
          subtitle={STAT_CARDS.outstanding.subtitle}
          icon={AlertCircle}
          accent="bg-amber-500/10 text-amber-600"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Commission by Month */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Commission by Month</CardTitle>
            <CardDescription className="text-xs">Oct 2025 - Mar 2026 (collected vs outstanding)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={MONTHLY_COMMISSION} barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} className="text-muted-foreground" />
                  <YAxis
                    tickFormatter={(v: number) => fmtGBPk(v)}
                    tick={{ fontSize: 11 }}
                    className="text-muted-foreground"
                    width={60}
                  />
                  <Tooltip content={<MonthlyTooltip />} />
                  <Bar dataKey="collected" stackId="commission" fill="#10b981" radius={[0, 0, 0, 0]} name="Collected" />
                  <Bar dataKey="outstanding" stackId="commission" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Outstanding" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center gap-4 mt-3 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500 inline-block" /> Collected
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-amber-500 inline-block" /> Outstanding
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Commission by Broker */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Commission by Broker</CardTitle>
            <CardDescription className="text-xs">YTD performance breakdown</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {BROKER_COMMISSION.map((broker) => (
              <div key={broker.name} className="space-y-2">
                <div className="flex items-center gap-3">
                  <BrokerAvatar initials={broker.initials} color={broker.color} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-foreground">{broker.name}</p>
                      <p className="text-sm font-bold text-foreground tabular-nums">{fmtGBP(broker.commission)}</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] text-muted-foreground">{broker.deals} deal{broker.deals !== 1 ? "s" : ""}</p>
                      <p className="text-[11px] text-muted-foreground">{broker.pct}%</p>
                    </div>
                  </div>
                </div>
                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${broker.pct}%`, backgroundColor: broker.color }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Commission Flow */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Commission Split (Example: D-0038 Manor Fields)</CardTitle>
          <CardDescription className="text-xs">How commission flows from developer through platform to landowner</CardDescription>
        </CardHeader>
        <CardContent>
          <CommissionFlowViz />
        </CardContent>
      </Card>

      {/* Outstanding Payments */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold">Outstanding Payments</CardTitle>
              <CardDescription className="text-xs">3 invoices requiring attention</CardDescription>
            </div>
            <span className="text-[11px] text-primary font-medium cursor-pointer hover:underline">
              View All Invoices
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[11px]">Invoice</TableHead>
                <TableHead className="text-[11px]">Deal</TableHead>
                <TableHead className="text-[11px]">Contact</TableHead>
                <TableHead className="text-[11px] text-right">Amount</TableHead>
                <TableHead className="text-[11px]">Status</TableHead>
                <TableHead className="text-[11px]">Issued</TableHead>
                <TableHead className="text-[11px]">Due</TableHead>
                <TableHead className="text-[11px]">Overdue</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {OUTSTANDING_PAYMENTS.map((inv) => (
                <TableRow key={inv.invoice}>
                  <TableCell className="font-medium text-[12px]">{inv.invoice}</TableCell>
                  <TableCell className="text-[12px]">
                    <Link href={`/admin/brokerage-mockups/deals/${inv.deal}`} className="text-primary hover:underline">{inv.deal}</Link>
                  </TableCell>
                  <TableCell className="text-[12px] font-medium">{inv.contact}</TableCell>
                  <TableCell className="text-[12px] text-right font-semibold tabular-nums">{fmtGBP(inv.amount)}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center rounded border px-2 py-0.5 text-[10px] font-semibold ${invoiceStatusStyle(inv.status)}`}>
                      {inv.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-[12px] text-muted-foreground">{inv.issued ?? "--"}</TableCell>
                  <TableCell className="text-[12px] text-muted-foreground">{inv.due ?? "--"}</TableCell>
                  <TableCell className="text-[12px]">
                    {inv.overdue ? (
                      <span className="text-red-600 font-medium">{inv.overdue}</span>
                    ) : (
                      <span className="text-muted-foreground">--</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Recent Transactions */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Recent Transactions</CardTitle>
          <CardDescription className="text-xs">Latest financial activity</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[11px]">Date</TableHead>
                <TableHead className="text-[11px]">Type</TableHead>
                <TableHead className="text-[11px]">Contact</TableHead>
                <TableHead className="text-[11px]">Deal</TableHead>
                <TableHead className="text-[11px] text-right">Amount</TableHead>
                <TableHead className="text-[11px]">Method</TableHead>
                <TableHead className="text-[11px]">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {RECENT_TRANSACTIONS.map((txn, i) => (
                <TableRow key={i}>
                  <TableCell className="text-[12px] text-muted-foreground whitespace-nowrap">{txn.date}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center rounded border px-2 py-0.5 text-[10px] font-semibold ${transactionTypeStyle(txn.type)}`}>
                      {txn.type}
                    </span>
                  </TableCell>
                  <TableCell className="text-[12px] font-medium">{txn.contact}</TableCell>
                  <TableCell className="text-[12px]">
                    <Link href={`/admin/brokerage-mockups/deals/${txn.deal}`} className="text-primary hover:underline">{txn.deal}</Link>
                  </TableCell>
                  <TableCell className="text-[12px] text-right font-semibold tabular-nums">{fmtGBP(txn.amount)}</TableCell>
                  <TableCell className="text-[12px] text-muted-foreground">{txn.method}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center rounded border px-2 py-0.5 text-[10px] font-semibold ${transactionStatusStyle(txn.status)}`}>
                      {txn.status}
                    </span>
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
// V2: Financial Dashboard
// ---------------------------------------------------------------------------

function FinancialDashboard() {
  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label={STAT_CARDS.totalDealValue.label}
          value={fmtGBP(STAT_CARDS.totalDealValue.value)}
          subtitle={STAT_CARDS.totalDealValue.subtitle}
          icon={PoundSterling}
          accent="bg-blue-500/10 text-blue-600"
        />
        <StatCard
          label={STAT_CARDS.totalCommission.label}
          value={fmtGBP(STAT_CARDS.totalCommission.value)}
          subtitle={STAT_CARDS.totalCommission.subtitle}
          icon={TrendingUp}
          accent="bg-emerald-500/10 text-emerald-600"
        />
        <StatCard
          label={STAT_CARDS.collected.label}
          value={fmtGBP(STAT_CARDS.collected.value)}
          subtitle={STAT_CARDS.collected.subtitle}
          icon={CheckCircle2}
          accent="bg-emerald-500/10 text-emerald-600"
          progress={STAT_CARDS.collected.pct}
        />
        <StatCard
          label={STAT_CARDS.outstanding.label}
          value={fmtGBP(STAT_CARDS.outstanding.value)}
          subtitle={STAT_CARDS.outstanding.subtitle}
          icon={AlertCircle}
          accent="bg-amber-500/10 text-amber-600"
        />
      </div>

      {/* Commission Flow Visualization */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Commission Flow Model</CardTitle>
          <CardDescription className="text-xs">
            How revenue flows from developer through platform commission to landowner payment (example: D-0038 Manor Fields, 45 kg N/yr at 3,000/kg)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CommissionFlowViz />
          <Separator className="my-4" />
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Total Credit Value</p>
              <p className="text-lg font-bold text-foreground">{fmtGBP(135_000)}</p>
              <p className="text-[11px] text-muted-foreground">45 kg N/yr x 3,000/kg</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Platform Revenue</p>
              <p className="text-lg font-bold text-emerald-600">{fmtGBP(27_000)}</p>
              <p className="text-[11px] text-muted-foreground">20% commission rate</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Landowner Payout</p>
              <p className="text-lg font-bold text-amber-600">{fmtGBP(108_000)}</p>
              <p className="text-[11px] text-muted-foreground">80% to supply side</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Commission */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Commission by Month</CardTitle>
            <CardDescription className="text-xs">Stacked: collected (green) vs outstanding (amber)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={MONTHLY_COMMISSION} barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tickFormatter={(v: number) => fmtGBPk(v)} tick={{ fontSize: 11 }} width={55} />
                  <Tooltip content={<MonthlyTooltip />} />
                  <Bar dataKey="collected" stackId="a" fill="#10b981" name="Collected" />
                  <Bar dataKey="outstanding" stackId="a" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Outstanding" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center gap-4 mt-2 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500 inline-block" /> Collected
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-amber-500 inline-block" /> Outstanding
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Commission by Unit Type (Pie) */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Commission by Unit Type</CardTitle>
            <CardDescription className="text-xs">YTD breakdown by credit type</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={PIE_DATA_UNIT_TYPE}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                  >
                    {PIE_DATA_UNIT_TYPE.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={((value: number | string) => fmtGBP(Number(value))) as never}
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid var(--border)" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-center gap-5 mt-1">
              {PIE_DATA_UNIT_TYPE.map((item) => (
                <div key={item.name} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span className="h-2.5 w-2.5 rounded-sm inline-block" style={{ backgroundColor: item.color }} />
                  <span>{item.name}</span>
                  <span className="font-semibold text-foreground">{fmtGBP(item.value)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Broker Performance */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Broker Performance</CardTitle>
          <CardDescription className="text-xs">Commission earned by broker, YTD</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={BROKER_COMMISSION} layout="vertical" barSize={20}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
                <XAxis type="number" tickFormatter={(v: number) => fmtGBPk(v)} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={100} />
                <Tooltip
                  formatter={((value: number | string) => fmtGBP(Number(value))) as never}
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid var(--border)" }}
                />
                <Bar dataKey="commission" fill="#3b82f6" radius={[0, 4, 4, 0]} name="Commission">
                  {BROKER_COMMISSION.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-border">
            {BROKER_COMMISSION.map((broker) => (
              <div key={broker.name} className="flex items-center gap-3">
                <BrokerAvatar initials={broker.initials} color={broker.color} />
                <div>
                  <p className="text-[12px] font-semibold">{broker.name}</p>
                  <p className="text-[11px] text-muted-foreground">{broker.deals} deal{broker.deals !== 1 ? "s" : ""} -- {broker.pct}% of total</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Outstanding + Recent in 2-col */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Outstanding */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Outstanding Payments</CardTitle>
            <CardDescription className="text-xs">Invoices requiring action</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-[11px]">Invoice</TableHead>
                  <TableHead className="text-[11px]">Contact</TableHead>
                  <TableHead className="text-[11px] text-right">Amount</TableHead>
                  <TableHead className="text-[11px]">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {OUTSTANDING_PAYMENTS.map((inv) => (
                  <TableRow key={inv.invoice}>
                    <TableCell className="font-medium text-[12px]">{inv.invoice}</TableCell>
                    <TableCell className="text-[12px]">{inv.contact}</TableCell>
                    <TableCell className="text-[12px] text-right font-semibold tabular-nums">{fmtGBP(inv.amount)}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded border px-2 py-0.5 text-[10px] font-semibold ${invoiceStatusStyle(inv.status)}`}>
                        {inv.status}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Recent Transactions</CardTitle>
            <CardDescription className="text-xs">Latest activity</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-[11px]">Date</TableHead>
                  <TableHead className="text-[11px]">Type</TableHead>
                  <TableHead className="text-[11px]">Contact</TableHead>
                  <TableHead className="text-[11px] text-right">Amount</TableHead>
                  <TableHead className="text-[11px]">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {RECENT_TRANSACTIONS.map((txn, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-[12px] text-muted-foreground whitespace-nowrap">{txn.date}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded border px-2 py-0.5 text-[10px] font-semibold ${transactionTypeStyle(txn.type)}`}>
                        {txn.type}
                      </span>
                    </TableCell>
                    <TableCell className="text-[12px] font-medium">{txn.contact}</TableCell>
                    <TableCell className="text-[12px] text-right font-semibold tabular-nums">{fmtGBP(txn.amount)}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded border px-2 py-0.5 text-[10px] font-semibold ${transactionStatusStyle(txn.status)}`}>
                        {txn.status}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// V3: Accountant View
// ---------------------------------------------------------------------------

function AccountantView() {
  const totalEarned = STAT_CARDS.totalCommission.value
  const totalCollected = STAT_CARDS.collected.value
  const totalOutstanding = STAT_CARDS.outstanding.value
  const collectionRate = STAT_CARDS.collected.pct

  return (
    <div className="space-y-6">
      {/* Summary Grid - compact stat boxes */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        <div className="border border-border rounded-lg p-3 bg-card">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Deal Value YTD</p>
          <p className="text-lg font-bold tabular-nums">{fmtGBP(STAT_CARDS.totalDealValue.value)}</p>
        </div>
        <div className="border border-border rounded-lg p-3 bg-card">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Commission Earned</p>
          <p className="text-lg font-bold tabular-nums">{fmtGBP(totalEarned)}</p>
        </div>
        <div className="border border-border rounded-lg p-3 bg-card">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Collected</p>
          <p className="text-lg font-bold tabular-nums text-emerald-600">{fmtGBP(totalCollected)}</p>
        </div>
        <div className="border border-border rounded-lg p-3 bg-card">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Outstanding</p>
          <p className="text-lg font-bold tabular-nums text-amber-600">{fmtGBP(totalOutstanding)}</p>
        </div>
        <div className="border border-border rounded-lg p-3 bg-card">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Collection Rate</p>
          <p className="text-lg font-bold tabular-nums">{collectionRate}%</p>
        </div>
        <div className="border border-border rounded-lg p-3 bg-card">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Open Invoices</p>
          <p className="text-lg font-bold tabular-nums">{STAT_CARDS.outstanding.count}</p>
        </div>
      </div>

      {/* Commission split summary line */}
      <Card>
        <CardHeader className="py-3 px-5">
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Commission Split Model</CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-4 pt-0">
          <CommissionFlowViz compact />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Invoice Aging */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Invoice Aging Report</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-[11px]">Period</TableHead>
                  <TableHead className="text-[11px] text-center">Count</TableHead>
                  <TableHead className="text-[11px] text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {INVOICE_AGING.map((row) => (
                  <TableRow key={row.range}>
                    <TableCell className="text-[12px] font-medium">{row.range}</TableCell>
                    <TableCell className="text-[12px] text-center tabular-nums">{row.count}</TableCell>
                    <TableCell className={`text-[12px] text-right tabular-nums font-semibold ${row.amount > 0 && row.range !== "Current (0-30 days)" && row.range !== "Draft" ? "text-red-600" : ""}`}>
                      {row.amount > 0 ? fmtGBP(row.amount) : "--"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell className="text-[12px] font-bold">Total Outstanding</TableCell>
                  <TableCell className="text-[12px] text-center font-bold tabular-nums">
                    {INVOICE_AGING.reduce((s, r) => s + r.count, 0)}
                  </TableCell>
                  <TableCell className="text-[12px] text-right font-bold tabular-nums">
                    {fmtGBP(INVOICE_AGING.reduce((s, r) => s + r.amount, 0))}
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </CardContent>
        </Card>

        {/* Monthly Running Totals */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Monthly Commission Summary</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-[11px]">Month</TableHead>
                  <TableHead className="text-[11px] text-right">Earned</TableHead>
                  <TableHead className="text-[11px] text-right">Collected</TableHead>
                  <TableHead className="text-[11px] text-right">Outstanding</TableHead>
                  <TableHead className="text-[11px] text-right">Running Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(() => {
                  let runningTotal = 0
                  return MONTHLY_COMMISSION.map((m) => {
                    runningTotal += m.total
                    return (
                      <TableRow key={m.month}>
                        <TableCell className="text-[12px] font-medium">{m.month}</TableCell>
                        <TableCell className="text-[12px] text-right tabular-nums">{fmtGBP(m.total)}</TableCell>
                        <TableCell className="text-[12px] text-right tabular-nums text-emerald-600">{fmtGBP(m.collected)}</TableCell>
                        <TableCell className="text-[12px] text-right tabular-nums text-amber-600">
                          {m.outstanding > 0 ? fmtGBP(m.outstanding) : "--"}
                        </TableCell>
                        <TableCell className="text-[12px] text-right tabular-nums font-semibold">{fmtGBP(runningTotal)}</TableCell>
                      </TableRow>
                    )
                  })
                })()}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell className="text-[12px] font-bold">Total</TableCell>
                  <TableCell className="text-[12px] text-right font-bold tabular-nums">{fmtGBP(totalEarned)}</TableCell>
                  <TableCell className="text-[12px] text-right font-bold tabular-nums text-emerald-600">{fmtGBP(totalCollected)}</TableCell>
                  <TableCell className="text-[12px] text-right font-bold tabular-nums text-amber-600">{fmtGBP(totalOutstanding)}</TableCell>
                  <TableCell className="text-[12px] text-right font-bold tabular-nums">{fmtGBP(totalEarned)}</TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Broker Commission Breakdown */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Broker Commission Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[11px]">Broker</TableHead>
                <TableHead className="text-[11px] text-center">Deals</TableHead>
                <TableHead className="text-[11px] text-right">Commission Earned</TableHead>
                <TableHead className="text-[11px] text-right">% of Total</TableHead>
                <TableHead className="text-[11px] text-right">Avg per Deal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {BROKER_COMMISSION.map((b) => (
                <TableRow key={b.name}>
                  <TableCell className="text-[12px]">
                    <div className="flex items-center gap-2">
                      <BrokerAvatar initials={b.initials} color={b.color} />
                      <span className="font-medium">{b.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-[12px] text-center tabular-nums">{b.deals}</TableCell>
                  <TableCell className="text-[12px] text-right tabular-nums font-semibold">{fmtGBP(b.commission)}</TableCell>
                  <TableCell className="text-[12px] text-right tabular-nums">{b.pct}%</TableCell>
                  <TableCell className="text-[12px] text-right tabular-nums">{fmtGBP(Math.round(b.commission / b.deals))}</TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell className="text-[12px] font-bold">Total</TableCell>
                <TableCell className="text-[12px] text-center font-bold tabular-nums">
                  {BROKER_COMMISSION.reduce((s, b) => s + b.deals, 0)}
                </TableCell>
                <TableCell className="text-[12px] text-right font-bold tabular-nums">{fmtGBP(totalEarned)}</TableCell>
                <TableCell className="text-[12px] text-right font-bold tabular-nums">100%</TableCell>
                <TableCell className="text-[12px] text-right font-bold tabular-nums">
                  {fmtGBP(Math.round(totalEarned / BROKER_COMMISSION.reduce((s, b) => s + b.deals, 0)))}
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      </Card>

      {/* Outstanding Invoices Detail */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Outstanding Invoices</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[11px]">Invoice #</TableHead>
                <TableHead className="text-[11px]">Deal</TableHead>
                <TableHead className="text-[11px]">Contact</TableHead>
                <TableHead className="text-[11px] text-right">Amount</TableHead>
                <TableHead className="text-[11px]">Status</TableHead>
                <TableHead className="text-[11px]">Issued</TableHead>
                <TableHead className="text-[11px]">Due</TableHead>
                <TableHead className="text-[11px]">Days Overdue</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {OUTSTANDING_PAYMENTS.map((inv) => (
                <TableRow key={inv.invoice}>
                  <TableCell className="text-[12px] font-mono font-medium">{inv.invoice}</TableCell>
                  <TableCell className="text-[12px] font-mono">
                    <Link href={`/admin/brokerage-mockups/deals/${inv.deal}`} className="text-primary hover:underline">{inv.deal}</Link>
                  </TableCell>
                  <TableCell className="text-[12px] font-medium">{inv.contact}</TableCell>
                  <TableCell className="text-[12px] text-right tabular-nums font-semibold">{fmtGBP(inv.amount)}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center rounded border px-2 py-0.5 text-[10px] font-semibold ${invoiceStatusStyle(inv.status)}`}>
                      {inv.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-[12px] text-muted-foreground font-mono">{inv.issued ?? "--"}</TableCell>
                  <TableCell className="text-[12px] text-muted-foreground font-mono">{inv.due ?? "--"}</TableCell>
                  <TableCell className="text-[12px]">
                    {inv.overdue ? (
                      <span className="text-red-600 font-semibold">{inv.overdue}</span>
                    ) : (
                      <span className="text-muted-foreground">--</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={3} className="text-[12px] font-bold">Total Outstanding</TableCell>
                <TableCell className="text-[12px] text-right font-bold tabular-nums">
                  {fmtGBP(OUTSTANDING_PAYMENTS.reduce((s, inv) => s + inv.amount, 0))}
                </TableCell>
                <TableCell colSpan={4} />
              </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      </Card>

      {/* Transaction Ledger */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Transaction Ledger</CardTitle>
            <span className="text-[10px] text-muted-foreground">All amounts in GBP</span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[11px]">Date</TableHead>
                <TableHead className="text-[11px]">Ref</TableHead>
                <TableHead className="text-[11px]">Type</TableHead>
                <TableHead className="text-[11px]">Description</TableHead>
                <TableHead className="text-[11px] text-right">Debit</TableHead>
                <TableHead className="text-[11px] text-right">Credit</TableHead>
                <TableHead className="text-[11px] text-right">Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {FULL_LEDGER.map((txn) => (
                <TableRow key={txn.ref}>
                  <TableCell className="text-[12px] text-muted-foreground font-mono whitespace-nowrap">{txn.date}</TableCell>
                  <TableCell className="text-[12px] font-mono font-medium">{txn.ref}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center rounded border px-2 py-0.5 text-[10px] font-semibold ${
                      txn.type.includes("Payment") ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20" : "bg-blue-500/10 text-blue-700 border-blue-500/20"
                    }`}>
                      {txn.type}
                    </span>
                  </TableCell>
                  <TableCell className="text-[12px] text-muted-foreground max-w-[280px] truncate">{txn.description}</TableCell>
                  <TableCell className="text-[12px] text-right tabular-nums font-mono">
                    {txn.debit ? fmtGBP(txn.debit) : ""}
                  </TableCell>
                  <TableCell className="text-[12px] text-right tabular-nums font-mono text-emerald-600">
                    {txn.credit ? fmtGBP(txn.credit) : ""}
                  </TableCell>
                  <TableCell className="text-[12px] text-right tabular-nums font-mono font-semibold">{fmtGBP(txn.balance)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Recent Transactions - condensed */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Recent Transactions (Cash Basis)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[11px]">Date</TableHead>
                <TableHead className="text-[11px]">Type</TableHead>
                <TableHead className="text-[11px]">Contact</TableHead>
                <TableHead className="text-[11px]">Deal</TableHead>
                <TableHead className="text-[11px] text-right">Amount</TableHead>
                <TableHead className="text-[11px]">Method</TableHead>
                <TableHead className="text-[11px]">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {RECENT_TRANSACTIONS.map((txn, i) => (
                <TableRow key={i}>
                  <TableCell className="text-[12px] text-muted-foreground font-mono whitespace-nowrap">{txn.date}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center rounded border px-2 py-0.5 text-[10px] font-semibold ${transactionTypeStyle(txn.type)}`}>
                      {txn.type}
                    </span>
                  </TableCell>
                  <TableCell className="text-[12px] font-medium">{txn.contact}</TableCell>
                  <TableCell className="text-[12px] font-mono">
                    <Link href={`/admin/brokerage-mockups/deals/${txn.deal}`} className="text-primary hover:underline">{txn.deal}</Link>
                  </TableCell>
                  <TableCell className="text-[12px] text-right font-semibold tabular-nums font-mono">{fmtGBP(txn.amount)}</TableCell>
                  <TableCell className="text-[12px] text-muted-foreground">{txn.method}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center rounded border px-2 py-0.5 text-[10px] font-semibold ${transactionStatusStyle(txn.status)}`}>
                      {txn.status}
                    </span>
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
// Main Page
// ---------------------------------------------------------------------------

const VARIATIONS: { key: Variation; label: string; icon: React.ElementType; description: string }[] = [
  { key: "executive", label: "Executive Summary", icon: Eye, description: "High-level KPIs and charts" },
  { key: "dashboard", label: "Financial Dashboard", icon: BarChart3, description: "Commission flow and unit breakdown" },
  { key: "accountant", label: "Accountant View", icon: Calculator, description: "Dense tables, ledger, and aging" },
]

export default function FinancialsOverviewPage() {
  const [variation, setVariation] = useState<Variation>("executive")

  return (
    <div className="max-w-screen-2xl mx-auto px-6 py-6">
      {/* Page Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <PoundSterling className="h-4 w-4 text-emerald-600" />
            <span className="text-[11px] font-semibold text-emerald-600 uppercase tracking-widest">
              Financials
            </span>
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            Financial Overview
          </h1>
          <p className="text-[13px] text-muted-foreground mt-1">
            Commission tracking, payments, and financial performance -- YTD as of 7 Mar 2026
          </p>
        </div>
      </div>

      {/* Variation Switcher */}
      <div className="flex items-center gap-1 p-1 bg-muted rounded-lg mb-6 w-fit">
        {VARIATIONS.map((v) => {
          const Icon = v.icon
          const isActive = variation === v.key
          return (
            <button
              key={v.key}
              onClick={() => setVariation(v.key)}
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

      {/* Variation Description */}
      <div className="flex items-center gap-2 mb-6">
        <div className="h-1 w-1 rounded-full bg-muted-foreground" />
        <p className="text-[12px] text-muted-foreground">
          {VARIATIONS.find((v) => v.key === variation)?.description}
        </p>
      </div>

      {/* Content */}
      {variation === "executive" && <ExecutiveSummary />}
      {variation === "dashboard" && <FinancialDashboard />}
      {variation === "accountant" && <AccountantView />}

      {/* Footer */}
      <Separator className="mt-8 mb-4" />
      <div className="flex items-center justify-between text-[11px] text-muted-foreground pb-4">
        <span>Ironheart Brokerage -- BNG / Nutrient Credit Platform</span>
        <span>Financial data is illustrative only. All figures are hardcoded for mockup purposes.</span>
      </div>
    </div>
  )
}
