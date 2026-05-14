"use client"

import { useState, useMemo } from "react"
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
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  PoundSterling,
  AlertTriangle,
  Clock,
  TrendingUp,
  Plus,
  List,
  LayoutGrid,
  MoreHorizontal,
  Eye,
  Bell,
  CheckCircle2,
  Download,
  ArrowLeft,
} from "lucide-react"
import { invoices } from "../../_mock-data"
import type { InvoiceStatus } from "../../_mock-data"

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

function daysBetween(a: string, b: string): number {
  const d1 = new Date(a)
  const d2 = new Date(b)
  return Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24))
}

function daysOutstanding(invoice: (typeof invoices)[number]): number {
  if (invoice.paidDate) return daysBetween(invoice.issuedDate, invoice.paidDate)
  const today = "2026-03-08"
  return daysBetween(invoice.issuedDate, today)
}

function invoiceStatusStyle(status: InvoiceStatus) {
  switch (status) {
    case "Paid":
      return "bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-400"
    case "Sent":
      return "bg-blue-500/10 text-blue-700 border-blue-500/20 dark:text-blue-400"
    case "Overdue":
      return "bg-red-500/10 text-red-700 border-red-500/20 dark:text-red-400"
    case "Draft":
      return "bg-zinc-500/10 text-zinc-600 border-zinc-500/20 dark:text-zinc-400"
    case "Viewed":
      return "bg-violet-500/10 text-violet-700 border-violet-500/20 dark:text-violet-400"
    default:
      return "bg-muted text-muted-foreground"
  }
}

// ---------------------------------------------------------------------------
// Aging bucket helper
// ---------------------------------------------------------------------------

type AgingBucket = "current" | "31-60" | "61-90" | "90+"

function getAgingBucket(invoice: (typeof invoices)[number]): AgingBucket | null {
  if (invoice.status === "Paid" || invoice.status === "Draft") return null
  const today = "2026-03-08"
  const days = daysBetween(invoice.issuedDate, today)
  if (days <= 30) return "current"
  if (days <= 60) return "31-60"
  if (days <= 90) return "61-90"
  return "90+"
}

const BUCKET_META: Record<AgingBucket, { label: string; color: string }> = {
  current: { label: "Current (0-30 days)", color: "text-emerald-600 dark:text-emerald-400" },
  "31-60": { label: "31-60 days", color: "text-amber-600 dark:text-amber-400" },
  "61-90": { label: "61-90 days", color: "text-orange-600 dark:text-orange-400" },
  "90+": { label: "90+ days", color: "text-red-600 dark:text-red-400" },
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function InvoicesPage() {
  const [view, setView] = useState<"list" | "aging">("list")
  const [statusFilter, setStatusFilter] = useState<string>("all")

  // Computed stats
  const stats = useMemo(() => {
    const outstanding = invoices.filter(
      (i) => i.status !== "Paid" && i.status !== "Draft",
    )
    const overdue = invoices.filter((i) => i.status === "Overdue")
    const paid = invoices.filter((i) => i.status === "Paid")

    const totalOutstanding = outstanding.reduce((s, i) => s + i.amount, 0)
    const overdueAmount = overdue.reduce((s, i) => s + i.amount, 0)
    const avgDaysToPayment =
      paid.length > 0
        ? Math.round(
            paid.reduce((s, i) => s + daysBetween(i.issuedDate, i.paidDate!), 0) /
              paid.length,
          )
        : 0
    const totalCommission = invoices.reduce((s, i) => s + i.commissionAmount, 0)
    const collectedCommission = paid.reduce((s, i) => s + i.commissionAmount, 0)
    const collectionRate =
      totalCommission > 0
        ? Number(((collectedCommission / totalCommission) * 100).toFixed(1))
        : 0

    return {
      totalOutstanding,
      overdueCount: overdue.length,
      overdueAmount,
      avgDaysToPayment,
      collectionRate,
    }
  }, [])

  // Filter invoices
  const filteredInvoices = useMemo(() => {
    if (statusFilter === "all") return invoices
    return invoices.filter((i) => i.status === statusFilter)
  }, [statusFilter])

  // Aging buckets
  const agingBuckets = useMemo(() => {
    const buckets: Record<AgingBucket, (typeof invoices)[number][]> = {
      current: [],
      "31-60": [],
      "61-90": [],
      "90+": [],
    }
    invoices.forEach((inv) => {
      const bucket = getAgingBucket(inv)
      if (bucket) buckets[bucket].push(inv)
    })
    return buckets
  }, [])

  return (
    <div className="max-w-screen-2xl mx-auto px-6 py-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
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
            Invoice Management
          </h1>
          <p className="text-[13px] text-muted-foreground mt-1">
            Track and manage all invoices across deals
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Create Invoice
        </Button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600">
                <PoundSterling className="h-4 w-4" />
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider mb-1">
              Total Outstanding
            </p>
            <p className="text-2xl font-bold text-foreground tracking-tight">
              {fmtGBP(stats.totalOutstanding)}
            </p>
            <p className="text-[12px] text-muted-foreground mt-1">
              {invoices.filter((i) => i.status !== "Paid" && i.status !== "Draft").length} invoices pending
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="p-2 rounded-lg bg-red-500/10 text-red-600">
                <AlertTriangle className="h-4 w-4" />
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider mb-1">
              Overdue
            </p>
            <p className="text-2xl font-bold text-foreground tracking-tight">
              {stats.overdueCount} ({fmtGBP(stats.overdueAmount)})
            </p>
            <p className="text-[12px] text-muted-foreground mt-1">
              Requires immediate attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600">
                <Clock className="h-4 w-4" />
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider mb-1">
              Avg Days to Payment
            </p>
            <p className="text-2xl font-bold text-foreground tracking-tight">
              {stats.avgDaysToPayment} days
            </p>
            <p className="text-[12px] text-muted-foreground mt-1">
              Based on paid invoices
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600">
                <TrendingUp className="h-4 w-4" />
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider mb-1">
              Collection Rate
            </p>
            <p className="text-2xl font-bold text-foreground tracking-tight">
              {stats.collectionRate}%
            </p>
            <Progress value={stats.collectionRate} className="mt-2 h-1.5" />
            <p className="text-[12px] text-muted-foreground mt-1">
              Of total commission earned
            </p>
          </CardContent>
        </Card>
      </div>

      {/* View Toggle + Filters */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
          <button
            onClick={() => setView("list")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
              view === "list"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <List className="h-3.5 w-3.5" />
            List
          </button>
          <button
            onClick={() => setView("aging")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
              view === "aging"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            Aging Buckets
          </button>
        </div>

        {view === "list" && (
          <div className="flex items-center gap-3">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px] h-9 text-sm">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="Draft">Draft</SelectItem>
                <SelectItem value="Sent">Sent</SelectItem>
                <SelectItem value="Viewed">Viewed</SelectItem>
                <SelectItem value="Paid">Paid</SelectItem>
                <SelectItem value="Overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* List View */}
      {view === "list" && (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-[11px]">Invoice #</TableHead>
                  <TableHead className="text-[11px]">Deal</TableHead>
                  <TableHead className="text-[11px]">Contact</TableHead>
                  <TableHead className="text-[11px] text-right">Amount</TableHead>
                  <TableHead className="text-[11px] text-right">Comm %</TableHead>
                  <TableHead className="text-[11px] text-right">Commission</TableHead>
                  <TableHead className="text-[11px]">Status</TableHead>
                  <TableHead className="text-[11px]">Issued</TableHead>
                  <TableHead className="text-[11px]">Due</TableHead>
                  <TableHead className="text-[11px] text-right">Days Out</TableHead>
                  <TableHead className="text-[11px] w-[50px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="text-[12px] font-mono font-medium">
                      {inv.invoiceNumber}
                    </TableCell>
                    <TableCell className="text-[12px]">
                      <Link
                        href={`/admin/brokerage-mockups/deals/${inv.dealId}`}
                        className="text-primary hover:underline"
                      >
                        {inv.dealTitle}
                      </Link>
                    </TableCell>
                    <TableCell className="text-[12px]">
                      <Link
                        href={`/admin/brokerage-mockups/contacts/${inv.contactId}`}
                        className="text-primary hover:underline"
                      >
                        {inv.contactName}
                      </Link>
                    </TableCell>
                    <TableCell className="text-[12px] text-right font-semibold tabular-nums">
                      {fmtGBP(inv.amount)}
                    </TableCell>
                    <TableCell className="text-[12px] text-right tabular-nums text-muted-foreground">
                      {(inv.commissionRate * 100).toFixed(0)}%
                    </TableCell>
                    <TableCell className="text-[12px] text-right font-semibold tabular-nums">
                      {fmtGBP(inv.commissionAmount)}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded border px-2 py-0.5 text-[10px] font-semibold ${invoiceStatusStyle(inv.status)}`}
                      >
                        {inv.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-[12px] text-muted-foreground whitespace-nowrap">
                      {new Date(inv.issuedDate).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </TableCell>
                    <TableCell className="text-[12px] text-muted-foreground whitespace-nowrap">
                      {new Date(inv.dueDate).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </TableCell>
                    <TableCell className="text-[12px] text-right tabular-nums">
                      {inv.status === "Paid" ? (
                        <span className="text-emerald-600 dark:text-emerald-400">
                          {daysBetween(inv.issuedDate, inv.paidDate!)}d
                        </span>
                      ) : inv.status === "Draft" ? (
                        <span className="text-muted-foreground">--</span>
                      ) : (
                        <span
                          className={
                            daysOutstanding(inv) > daysBetween(inv.issuedDate, inv.dueDate)
                              ? "text-red-600 dark:text-red-400 font-medium"
                              : "text-foreground"
                          }
                        >
                          {daysOutstanding(inv)}d
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem className="gap-2 text-sm">
                            <Eye className="h-3.5 w-3.5" /> View
                          </DropdownMenuItem>
                          <DropdownMenuItem className="gap-2 text-sm">
                            <Bell className="h-3.5 w-3.5" /> Send Reminder
                          </DropdownMenuItem>
                          <DropdownMenuItem className="gap-2 text-sm">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Mark Paid
                          </DropdownMenuItem>
                          <DropdownMenuItem className="gap-2 text-sm">
                            <Download className="h-3.5 w-3.5" /> Download
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Aging Buckets View */}
      {view === "aging" && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {(["current", "31-60", "61-90", "90+"] as AgingBucket[]).map((bucket) => {
            const items = agingBuckets[bucket]
            const total = items.reduce((s, i) => s + i.amount, 0)
            const meta = BUCKET_META[bucket]

            return (
              <div key={bucket} className="space-y-3">
                {/* Bucket header */}
                <Card>
                  <CardContent className="p-4">
                    <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider mb-1">
                      {meta.label}
                    </p>
                    <p className={`text-xl font-bold tabular-nums ${meta.color}`}>
                      {fmtGBP(total)}
                    </p>
                    <p className="text-[12px] text-muted-foreground">
                      {items.length} invoice{items.length !== 1 ? "s" : ""}
                    </p>
                  </CardContent>
                </Card>

                {/* Invoice cards in bucket */}
                {items.length === 0 ? (
                  <Card>
                    <CardContent className="p-4 text-center">
                      <p className="text-[12px] text-muted-foreground">No invoices</p>
                    </CardContent>
                  </Card>
                ) : (
                  items.map((inv) => (
                    <Card key={inv.id}>
                      <CardContent className="p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[12px] font-mono font-medium text-foreground">
                            {inv.invoiceNumber}
                          </span>
                          <Badge
                            variant="outline"
                            className={`text-[10px] ${invoiceStatusStyle(inv.status)}`}
                          >
                            {inv.status}
                          </Badge>
                        </div>
                        <p className="text-[12px] text-muted-foreground truncate">
                          {inv.dealTitle}
                        </p>
                        <p className="text-[12px] font-medium text-foreground">
                          {inv.contactName}
                        </p>
                        <div className="flex items-center justify-between pt-1 border-t border-border">
                          <span className="text-[11px] text-muted-foreground">
                            Due{" "}
                            {new Date(inv.dueDate).toLocaleDateString("en-GB", {
                              day: "numeric",
                              month: "short",
                            })}
                          </span>
                          <span className="text-sm font-bold tabular-nums text-foreground">
                            {fmtGBP(inv.amount)}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            )
          })}
        </div>
      )}

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
