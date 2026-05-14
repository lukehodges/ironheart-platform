"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  ArrowLeft,
  ChevronRight,
  Send,
  Download,
  Archive,
  FileText,
  CheckCircle2,
  Clock,
  Calendar,
  Pen,
  User,
  Shield,
  AlertCircle,
} from "lucide-react"
import { deals, contacts, sites } from "../../../_mock-data"

// ─── Agreement stage timeline ────────────────────────────────────

const AGREEMENT_STAGES = [
  "Draft",
  "Sent",
  "Negotiation",
  "Signed by Supply",
  "Signed by Demand",
  "Executed",
] as const

type AgreementStage = (typeof AGREEMENT_STAGES)[number]

// ─── Page ────────────────────────────────────────────────────────

export default function DealAgreementPage() {
  const params = useParams()
  const dealId = typeof params.id === "string" ? params.id : "D-0038"
  const deal = deals.find((d) => d.id === dealId) ?? deals.find((d) => d.id === "D-0038")!

  const site = sites.find((s) => s.ref === deal.siteRef) ?? null
  const supplyContact = contacts.find((c) => c.id === deal.supplyContact) ?? null
  const demandContact = contacts.find((c) => c.id === deal.demandContact) ?? null

  // Mock agreement state (derive from deal stage)
  const currentAgreementStage: AgreementStage =
    deal.stage === "Completed" || deal.stage === "Credits Allocated" || deal.stage === "LPA Confirmed"
      ? "Executed"
      : deal.stage === "Contracts Signed" || deal.stage === "Payment Received" || deal.stage === "Payment Pending"
      ? "Signed by Demand"
      : deal.stage === "Legal Review"
      ? "Signed by Supply"
      : deal.stage === "Legal Drafting"
      ? "Negotiation"
      : deal.stage === "Quote Accepted"
      ? "Sent"
      : "Draft"

  const currentStageIndex = AGREEMENT_STAGES.indexOf(currentAgreementStage)

  const unitPrice = site?.price ?? 3000
  const totalValue = unitPrice * deal.units
  const deposit = Math.round(totalValue * 0.1)
  const planningMilestone = Math.round(totalValue * 0.4)
  const completion = totalValue - deposit - planningMilestone

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-screen-xl mx-auto px-6 py-6">
        {/* Back link */}
        <Link
          href={`/admin/brokerage-mockups/deals/${deal.id}`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Deal
        </Link>

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1 text-xs text-muted-foreground mb-4">
          <Link href="/admin/brokerage-mockups/deals" className="hover:text-foreground">
            Deals
          </Link>
          <ChevronRight className="h-3 w-3" />
          <Link href={`/admin/brokerage-mockups/deals/${deal.id}`} className="hover:text-foreground">
            {deal.id}
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground font-medium">Agreement</span>
        </nav>

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">
            Credit Purchase Agreement
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {deal.id} &mdash; {deal.title}
          </p>
        </div>

        {/* ─── Stage Timeline ────────────────────────── */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center gap-0">
              {AGREEMENT_STAGES.map((stage, idx) => {
                const isCompleted = idx < currentStageIndex
                const isCurrent = idx === currentStageIndex
                return (
                  <div key={stage} className="flex items-center flex-1 min-w-0">
                    <div className="flex flex-col items-center w-full relative">
                      <div className="flex items-center w-full h-2 relative">
                        {idx > 0 && (
                          <div
                            className={`absolute left-0 right-1/2 h-1 rounded-l ${
                              isCompleted || isCurrent
                                ? "bg-emerald-500"
                                : "bg-muted"
                            }`}
                          />
                        )}
                        {idx < AGREEMENT_STAGES.length - 1 && (
                          <div
                            className={`absolute left-1/2 right-0 h-1 rounded-r ${
                              isCompleted ? "bg-emerald-500" : "bg-muted"
                            }`}
                          />
                        )}
                        <div
                          className={`relative z-10 mx-auto w-6 h-6 rounded-full flex items-center justify-center border-2 ${
                            isCompleted
                              ? "bg-emerald-500 border-emerald-500"
                              : isCurrent
                              ? "bg-amber-500 border-amber-500 ring-2 ring-amber-200 dark:ring-amber-500/30 ring-offset-1"
                              : "bg-background border-muted-foreground/20"
                          }`}
                        >
                          {isCompleted && (
                            <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                          )}
                          {isCurrent && (
                            <div className="w-2 h-2 rounded-full bg-white" />
                          )}
                        </div>
                      </div>
                      <span
                        className={`mt-1.5 text-[10px] leading-tight text-center font-medium px-0.5 ${
                          isCompleted
                            ? "text-emerald-600 dark:text-emerald-400"
                            : isCurrent
                            ? "text-amber-700 dark:text-amber-400 font-semibold"
                            : "text-muted-foreground/50"
                        }`}
                      >
                        {stage}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* ─── Two Column Layout ─────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
          {/* LEFT COLUMN */}
          <div className="flex flex-col gap-6">
            {/* Agreement Summary Panel */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">
                  Agreement Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Parties */}
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                    Parties
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Supply */}
                    <div className="p-3 rounded-lg border border-border bg-muted/30">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 flex items-center justify-center text-[9px] font-bold">
                          {supplyContact?.initials ?? "??"}
                        </div>
                        <Badge className="bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30 text-[9px]">
                          Supply
                        </Badge>
                      </div>
                      <p className="text-sm font-medium">
                        {supplyContact ? (
                          <Link
                            href={`/admin/brokerage-mockups/contacts/${supplyContact.id}`}
                            className="hover:text-primary transition-colors"
                          >
                            {supplyContact.name}
                          </Link>
                        ) : (
                          deal.supplyContactName || "TBD"
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {supplyContact?.company ?? ""}
                      </p>
                    </div>

                    {/* Demand */}
                    <div className="p-3 rounded-lg border border-border bg-muted/30">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-500/15 text-blue-700 dark:text-blue-400 flex items-center justify-center text-[9px] font-bold">
                          {demandContact?.initials ?? "??"}
                        </div>
                        <Badge className="bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/30 text-[9px]">
                          Demand
                        </Badge>
                      </div>
                      <p className="text-sm font-medium">
                        {demandContact ? (
                          <Link
                            href={`/admin/brokerage-mockups/contacts/${demandContact.id}`}
                            className="hover:text-primary transition-colors"
                          >
                            {demandContact.name}
                          </Link>
                        ) : (
                          deal.demandContactName || "TBD"
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {demandContact?.company ?? ""}
                      </p>
                    </div>

                    {/* Broker */}
                    <div className="p-3 rounded-lg border border-border bg-muted/30">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-6 h-6 rounded-full bg-violet-100 dark:bg-violet-500/15 text-violet-700 dark:text-violet-400 flex items-center justify-center text-[9px] font-bold">
                          {deal.brokerInitials}
                        </div>
                        <Badge className="bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-200 dark:border-violet-500/30 text-[9px]">
                          Broker
                        </Badge>
                      </div>
                      <p className="text-sm font-medium">{deal.broker}</p>
                      <p className="text-xs text-muted-foreground">Ironheart Brokerage</p>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Credit Details */}
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                    Credit Details
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div>
                      <p className="text-[10px] text-muted-foreground mb-0.5">Type</p>
                      <p className="text-sm font-medium">{deal.unitType}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground mb-0.5">Quantity</p>
                      <p className="text-sm font-medium">{deal.unitsLabel}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground mb-0.5">Unit Price</p>
                      <p className="text-sm font-medium">
                        &pound;{unitPrice.toLocaleString("en-GB")}/{deal.unitType === "BNG" ? "unit" : "kg"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground mb-0.5">Total Value</p>
                      <p className="text-sm font-bold tabular-nums">
                        &pound;{totalValue.toLocaleString("en-GB")}
                      </p>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Payment Schedule */}
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                    Payment Schedule
                  </p>
                  <div className="rounded-lg border border-border overflow-hidden">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-muted/50 border-b border-border">
                          <th className="px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                            Milestone
                          </th>
                          <th className="px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider text-right">
                            Percentage
                          </th>
                          <th className="px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider text-right">
                            Amount
                          </th>
                          <th className="px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider text-center">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-border">
                          <td className="px-4 py-3 text-sm">Deposit</td>
                          <td className="px-4 py-3 text-sm tabular-nums text-right">10%</td>
                          <td className="px-4 py-3 text-sm font-medium tabular-nums text-right">
                            &pound;{deposit.toLocaleString("en-GB")}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Badge className="bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/30 text-[10px]">
                              Pending
                            </Badge>
                          </td>
                        </tr>
                        <tr className="border-b border-border">
                          <td className="px-4 py-3 text-sm">Planning Approval</td>
                          <td className="px-4 py-3 text-sm tabular-nums text-right">40%</td>
                          <td className="px-4 py-3 text-sm font-medium tabular-nums text-right">
                            &pound;{planningMilestone.toLocaleString("en-GB")}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Badge variant="outline" className="text-[10px]">
                              Not Due
                            </Badge>
                          </td>
                        </tr>
                        <tr>
                          <td className="px-4 py-3 text-sm">Completion</td>
                          <td className="px-4 py-3 text-sm tabular-nums text-right">50%</td>
                          <td className="px-4 py-3 text-sm font-medium tabular-nums text-right">
                            &pound;{completion.toLocaleString("en-GB")}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Badge variant="outline" className="text-[10px]">
                              Not Due
                            </Badge>
                          </td>
                        </tr>
                      </tbody>
                      <tfoot>
                        <tr className="bg-muted/30 border-t border-border">
                          <td className="px-4 py-3 text-sm font-semibold">Total</td>
                          <td className="px-4 py-3 text-sm font-semibold text-right">100%</td>
                          <td className="px-4 py-3 text-sm font-bold tabular-nums text-right">
                            &pound;{totalValue.toLocaleString("en-GB")}
                          </td>
                          <td />
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                <Separator />

                {/* Warranties */}
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                    Warranties
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-start gap-2 p-2.5 rounded-lg border border-border bg-muted/20">
                      <Shield className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Credit Validity</p>
                        <p className="text-xs text-muted-foreground">
                          Credits are warranted to be valid and registered with Natural England for the Solent catchment area.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 p-2.5 rounded-lg border border-border bg-muted/20">
                      <Shield className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Monitoring Commitment</p>
                        <p className="text-xs text-muted-foreground">
                          Supply party commits to {site?.commitmentYears ?? 80}-year monitoring and maintenance programme as required by the S106 agreement.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Duration */}
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    Commitment Period
                  </p>
                  <p className="text-sm font-medium">
                    {site?.commitmentYears ?? 80} years from date of execution
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    In accordance with the {site?.legalAgreement ?? "S106"} agreement requirements
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Document Section */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">
                  Agreement Document
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 p-4 rounded-lg border border-border bg-muted/20">
                  <div className="w-12 h-12 rounded-lg bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">
                      CreditPurchaseAgreement_{deal.id}.pdf
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Generated 5 Mar 2026 &middot; 18 pages &middot; 842 KB
                    </p>
                  </div>
                  <Badge className="bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/30 text-[10px] shrink-0">
                    Awaiting Signatures
                  </Badge>
                </div>

                {/* E-signature status */}
                <div className="mt-4 space-y-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    E-Signature Status
                  </p>
                  <div className="flex items-center gap-3 p-3 rounded-lg border border-border">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 flex items-center justify-center">
                      <Pen className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        {supplyContact?.name ?? deal.supplyContactName}
                      </p>
                      <p className="text-xs text-muted-foreground">Supply Party</p>
                    </div>
                    {currentStageIndex >= 3 ? (
                      <Badge className="bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30 text-[10px]">
                        Signed
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px]">
                        Pending
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg border border-border">
                    <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-500/15 text-blue-700 dark:text-blue-400 flex items-center justify-center">
                      <Pen className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        {demandContact?.name ?? deal.demandContactName}
                      </p>
                      <p className="text-xs text-muted-foreground">Demand Party</p>
                    </div>
                    {currentStageIndex >= 4 ? (
                      <Badge className="bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30 text-[10px]">
                        Signed
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px]">
                        Pending
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* RIGHT SIDEBAR */}
          <div className="flex flex-col gap-6">
            {/* Key Dates */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Key Dates</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Created</span>
                  </div>
                  <span className="text-xs font-medium">{deal.createdDate}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Send className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Sent</span>
                  </div>
                  <span className="text-xs font-medium">5 Mar 2026</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Expected Signing</span>
                  </div>
                  <span className="text-xs font-medium">{deal.expectedClose}</span>
                </div>
              </CardContent>
            </Card>

            {/* Related Documents */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Related Documents</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-3 p-2.5 rounded-lg border border-border hover:bg-muted/50 transition-colors cursor-pointer">
                  <FileText className="w-4 h-4 text-red-500 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate">CreditReservation_{deal.id}.pdf</p>
                    <p className="text-[10px] text-muted-foreground">5 Mar 2026 &middot; 245 KB</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-2.5 rounded-lg border border-border hover:bg-muted/50 transition-colors cursor-pointer">
                  <FileText className="w-4 h-4 text-red-500 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate">HeadsOfTerms_{deal.id}.pdf</p>
                    <p className="text-[10px] text-muted-foreground">28 Feb 2026 &middot; 189 KB</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-2.5 rounded-lg border border-border hover:bg-muted/50 transition-colors cursor-pointer">
                  <FileText className="w-4 h-4 text-blue-500 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate">SiteAssessment_{deal.siteRef}.pdf</p>
                    <p className="text-[10px] text-muted-foreground">8 Oct 2025 &middot; 3.2 MB</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-2.5 rounded-lg border border-border hover:bg-muted/50 transition-colors cursor-pointer">
                  <FileText className="w-4 h-4 text-amber-500 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate">S106_Agreement_{deal.siteRef}.pdf</p>
                    <p className="text-[10px] text-muted-foreground">15 Jun 2025 &middot; 1.1 MB</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button className="w-full gap-1.5 justify-start" size="sm">
                  <Send className="h-3.5 w-3.5" />
                  Send for Signature
                </Button>
                <Button variant="outline" className="w-full gap-1.5 justify-start" size="sm">
                  <Download className="h-3.5 w-3.5" />
                  Download Agreement
                </Button>
                <Button variant="outline" className="w-full gap-1.5 justify-start" size="sm">
                  <Archive className="h-3.5 w-3.5" />
                  Archive
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
