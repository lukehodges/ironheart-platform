"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Separator } from "@/components/ui/separator"
import {
  PoundSterling,
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
} from "lucide-react"
import { payments } from "../../_mock-data"

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

function paymentStatusStyle(status: string) {
  switch (status) {
    case "Completed":
      return "bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-400"
    case "Pending":
      return "bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-400"
    case "Failed":
      return "bg-red-500/10 text-red-700 border-red-500/20 dark:text-red-400"
    default:
      return "bg-muted text-muted-foreground"
  }
}

function isThisMonth(dateStr: string): boolean {
  return dateStr.startsWith("2026-03")
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function PaymentsPage() {
  const [tab, setTab] = useState<"incoming" | "outgoing">("incoming")

  const incoming = useMemo(() => payments.filter((p) => p.direction === "incoming"), [])
  const outgoing = useMemo(() => payments.filter((p) => p.direction === "outgoing"), [])

  const currentPayments = tab === "incoming" ? incoming : outgoing

  // Stats for incoming
  const incomingStats = useMemo(() => {
    const totalReceived = incoming
      .filter((p) => p.status === "Completed")
      .reduce((s, p) => s + p.amount, 0)
    const pending = incoming
      .filter((p) => p.status === "Pending")
      .reduce((s, p) => s + p.amount, 0)
    const thisMonth = incoming
      .filter((p) => isThisMonth(p.date))
      .reduce((s, p) => s + p.amount, 0)
    return { totalReceived, pending, thisMonth }
  }, [incoming])

  // Stats for outgoing
  const outgoingStats = useMemo(() => {
    const totalPaid = outgoing
      .filter((p) => p.status === "Completed")
      .reduce((s, p) => s + p.amount, 0)
    const pending = outgoing
      .filter((p) => p.status === "Pending")
      .reduce((s, p) => s + p.amount, 0)
    const thisMonth = outgoing
      .filter((p) => isThisMonth(p.date))
      .reduce((s, p) => s + p.amount, 0)
    return { totalPaid, pending, thisMonth }
  }, [outgoing])

  // Running balance for current tab
  const paymentsWithBalance = useMemo(() => {
    let balance = 0
    return currentPayments.map((p) => {
      balance += p.status === "Completed" ? p.amount : 0
      return { ...p, runningBalance: balance }
    })
  }, [currentPayments])

  // Reconciliation: match incoming to outgoing by dealId
  const matchedDeals = useMemo(() => {
    const incomingDeals = new Set(incoming.map((p) => p.dealId))
    const outgoingDeals = new Set(outgoing.map((p) => p.dealId))
    return new Set([...incomingDeals].filter((d) => outgoingDeals.has(d)))
  }, [incoming, outgoing])

  const totalCompleted = tab === "incoming"
    ? incomingStats.totalReceived
    : outgoingStats.totalPaid
  const pending = tab === "incoming" ? incomingStats.pending : outgoingStats.pending
  const thisMonth = tab === "incoming" ? incomingStats.thisMonth : outgoingStats.thisMonth

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
          Payment Tracking
        </h1>
        <p className="text-[13px] text-muted-foreground mt-1">
          Track incoming and outgoing payments across all deals
        </p>
      </div>

      {/* Tab Toggle */}
      <div className="flex items-center gap-1 p-1 bg-muted rounded-lg mb-6 w-fit">
        <button
          onClick={() => setTab("incoming")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
            tab === "incoming"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <ArrowDownLeft className="h-3.5 w-3.5" />
          Incoming
        </button>
        <button
          onClick={() => setTab("outgoing")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
            tab === "outgoing"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <ArrowUpRight className="h-3.5 w-3.5" />
          Outgoing
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600">
                <CheckCircle2 className="h-4 w-4" />
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider mb-1">
              {tab === "incoming" ? "Total Received" : "Total Paid"}
            </p>
            <p className="text-2xl font-bold text-foreground tracking-tight">
              {fmtGBP(totalCompleted)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600">
                <Clock className="h-4 w-4" />
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider mb-1">
              Pending
            </p>
            <p className="text-2xl font-bold text-foreground tracking-tight">
              {fmtGBP(pending)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600">
                <PoundSterling className="h-4 w-4" />
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider mb-1">
              This Month
            </p>
            <p className="text-2xl font-bold text-foreground tracking-tight">
              {fmtGBP(thisMonth)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Running Balance */}
      <Card className="mb-4">
        <CardHeader className="py-3 px-5">
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Running Balance ({tab === "incoming" ? "Received" : "Paid Out"})
          </CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-4 pt-0">
          <p className="text-2xl font-bold text-foreground tabular-nums">
            {fmtGBP(
              paymentsWithBalance.length > 0
                ? paymentsWithBalance[paymentsWithBalance.length - 1].runningBalance
                : 0,
            )}
          </p>
        </CardContent>
      </Card>

      {/* Payments Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[11px]">Date</TableHead>
                <TableHead className="text-[11px]">Contact</TableHead>
                <TableHead className="text-[11px]">Deal</TableHead>
                <TableHead className="text-[11px] text-right">Amount</TableHead>
                <TableHead className="text-[11px]">Method</TableHead>
                <TableHead className="text-[11px]">Status</TableHead>
                <TableHead className="text-[11px]">Reference</TableHead>
                <TableHead className="text-[11px] text-center">Reconciled</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paymentsWithBalance.map((pay) => {
                const isReconciled = matchedDeals.has(pay.dealId)
                return (
                  <TableRow key={pay.id}>
                    <TableCell className="text-[12px] text-muted-foreground whitespace-nowrap">
                      {new Date(pay.date).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </TableCell>
                    <TableCell className="text-[12px]">
                      <Link
                        href={`/admin/brokerage-mockups/contacts/${pay.contactId}`}
                        className="text-primary hover:underline font-medium"
                      >
                        {pay.contactName}
                      </Link>
                    </TableCell>
                    <TableCell className="text-[12px]">
                      <Link
                        href={`/admin/brokerage-mockups/deals/${pay.dealId}`}
                        className="text-primary hover:underline"
                      >
                        {pay.dealTitle}
                      </Link>
                    </TableCell>
                    <TableCell className="text-[12px] text-right font-semibold tabular-nums">
                      {fmtGBP(pay.amount)}
                    </TableCell>
                    <TableCell className="text-[12px] text-muted-foreground">
                      {pay.method}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded border px-2 py-0.5 text-[10px] font-semibold ${paymentStatusStyle(pay.status)}`}
                      >
                        {pay.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-[12px] font-mono text-muted-foreground">
                      {pay.id}
                    </TableCell>
                    <TableCell className="text-center">
                      {isReconciled ? (
                        <span className="text-emerald-600 dark:text-emerald-400" title="Matched">
                          <CheckCircle2 className="h-4 w-4 inline-block" />
                        </span>
                      ) : (
                        <span className="text-amber-600 dark:text-amber-400" title="Unmatched">
                          <AlertTriangle className="h-4 w-4 inline-block" />
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

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
