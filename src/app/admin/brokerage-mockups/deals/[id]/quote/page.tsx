"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ArrowLeft,
  ChevronRight,
  Send,
  Save,
  Download,
  Leaf,
  Building2,
  Phone,
  Mail,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react"
import { deals, contacts, sites } from "../../../_mock-data"

// ─── Page ────────────────────────────────────────────────────────

export default function DealQuotePage() {
  const params = useParams()
  const dealId = typeof params.id === "string" ? params.id : "D-0038"
  const deal = deals.find((d) => d.id === dealId) ?? deals.find((d) => d.id === "D-0038")!

  const site = sites.find((s) => s.ref === deal.siteRef) ?? null
  const supplyContact = contacts.find((c) => c.id === deal.supplyContact) ?? null
  const demandContact = contacts.find((c) => c.id === deal.demandContact) ?? null

  const defaultUnitPrice = site?.price ?? 3000
  const [unitPrice, setUnitPrice] = useState(defaultUnitPrice)
  const [commissionRate, setCommissionRate] = useState(20)
  const [paymentTerms, setPaymentTerms] = useState("lump-sum")
  const [notes, setNotes] = useState("")

  const quantity = deal.units
  const subtotal = useMemo(() => unitPrice * quantity, [unitPrice, quantity])
  const commissionAmount = useMemo(
    () => Math.round(subtotal * (commissionRate / 100)),
    [subtotal, commissionRate]
  )
  const landownerPayment = subtotal - commissionAmount
  const totalToDeveloper = subtotal

  // Capacity check
  const availableUnits = site?.available ?? 0
  const capacitySufficient = availableUnits >= quantity
  const capacityPartial = availableUnits > 0 && availableUnits < quantity

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
          <span className="text-foreground font-medium">Quote</span>
        </nav>

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">
            Quote for {deal.id} &mdash; {deal.title}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Generate a credit purchase quote / proposal
          </p>
        </div>

        {/* ─── Two Column Layout ─────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
          {/* LEFT COLUMN */}
          <div className="flex flex-col gap-6">
            {/* Credit Details */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Credit Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                      Unit Type
                    </p>
                    <p className="text-sm font-medium">{deal.unitType}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                      Quantity
                    </p>
                    <p className="text-sm font-medium">{deal.unitsLabel}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                      Catchment
                    </p>
                    <p className="text-sm font-medium">{deal.catchment}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                      Source Site
                    </p>
                    <p className="text-sm font-medium">{deal.siteName || "TBD"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Pricing */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Pricing</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Unit price */}
                <div className="flex items-center justify-between">
                  <label className="text-sm text-muted-foreground">Unit Price</label>
                  <div className="flex items-center gap-1">
                    <span className="text-sm text-muted-foreground">&pound;</span>
                    <input
                      type="number"
                      value={unitPrice}
                      onChange={(e) => setUnitPrice(Number(e.target.value) || 0)}
                      className="w-28 h-8 text-sm text-right font-medium rounded-md border border-input bg-transparent px-2 focus:outline-none focus:ring-2 focus:ring-ring tabular-nums"
                    />
                    <span className="text-xs text-muted-foreground">
                      /{deal.unitType === "BNG" ? "unit" : "kg"}
                    </span>
                  </div>
                </div>

                {/* Quantity */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Quantity</span>
                  <span className="text-sm font-medium tabular-nums">
                    {quantity} {deal.unitType === "BNG" ? "units" : "kg/yr"}
                  </span>
                </div>

                <Separator />

                {/* Subtotal */}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Subtotal</span>
                  <span className="text-sm font-semibold tabular-nums">
                    &pound;{subtotal.toLocaleString("en-GB")}
                  </span>
                </div>

                <Separator />

                {/* Commission rate */}
                <div className="flex items-center justify-between">
                  <label className="text-sm text-muted-foreground">Commission Rate</label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      value={commissionRate}
                      onChange={(e) => setCommissionRate(Number(e.target.value) || 0)}
                      min={0}
                      max={100}
                      className="w-16 h-8 text-sm text-right font-medium rounded-md border border-input bg-transparent px-2 focus:outline-none focus:ring-2 focus:ring-ring tabular-nums"
                    />
                    <span className="text-sm text-muted-foreground">%</span>
                  </div>
                </div>

                {/* Commission amount */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Commission Amount</span>
                  <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400 tabular-nums">
                    &pound;{commissionAmount.toLocaleString("en-GB")}
                  </span>
                </div>

                {/* Landowner payment */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Landowner Payment</span>
                  <span className="text-sm font-medium tabular-nums">
                    &pound;{landownerPayment.toLocaleString("en-GB")}
                  </span>
                </div>

                <Separator />

                {/* Total to developer */}
                <div className="flex items-center justify-between pt-2">
                  <span className="text-base font-bold">Total to Developer</span>
                  <span className="text-xl font-bold tabular-nums">
                    &pound;{totalToDeveloper.toLocaleString("en-GB")}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Payment Terms & Notes */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Terms</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">
                      Payment Terms
                    </label>
                    <Select value={paymentTerms} onValueChange={setPaymentTerms}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="lump-sum">Lump Sum</SelectItem>
                        <SelectItem value="staged">Staged Payments</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">
                      Validity Period
                    </label>
                    <div className="flex items-center h-10 px-3 rounded-md border border-input bg-muted/30 text-sm">
                      30 days
                    </div>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    Notes / Additional Terms
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Any additional terms, conditions, or notes for this quote..."
                    rows={4}
                    className="w-full text-sm rounded-md border border-input bg-transparent px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* RIGHT SIDEBAR */}
          <div className="flex flex-col gap-6">
            {/* Deal Summary */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Deal Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Deal ID</span>
                  <Link
                    href={`/admin/brokerage-mockups/deals/${deal.id}`}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    {deal.id}
                  </Link>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Stage</span>
                  <Badge variant="outline" className="text-[10px]">
                    {deal.stage}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Broker</span>
                  <span className="text-xs font-medium">{deal.broker}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Expected Close</span>
                  <span className="text-xs font-medium">{deal.expectedClose}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Probability</span>
                  <span className="text-xs font-medium">{Math.round(deal.probability * 100)}%</span>
                </div>
              </CardContent>
            </Card>

            {/* Supply Site Capacity Check */}
            {site && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold">
                    Supply Site Capacity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Site</span>
                      <Link
                        href={`/admin/brokerage-mockups/sites/${site.ref}`}
                        className="text-xs font-medium text-primary hover:underline"
                      >
                        {site.name}
                      </Link>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Total Capacity</span>
                      <span className="text-xs font-medium">{site.totalLabel}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Already Allocated</span>
                      <span className="text-xs font-medium">{site.allocatedLabel}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Available</span>
                      <span className="text-xs font-bold">{site.availableLabel}</span>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Requested</span>
                      <span className="text-xs font-medium">{deal.unitsLabel}</span>
                    </div>

                    {/* Status indicator */}
                    <div
                      className={`flex items-center gap-2 p-2.5 rounded-lg border ${
                        capacitySufficient
                          ? "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30"
                          : capacityPartial
                          ? "bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30"
                          : "bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30"
                      }`}
                    >
                      {capacitySufficient ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      ) : (
                        <AlertTriangle
                          className={`h-4 w-4 shrink-0 ${
                            capacityPartial
                              ? "text-amber-600 dark:text-amber-400"
                              : "text-red-600 dark:text-red-400"
                          }`}
                        />
                      )}
                      <span
                        className={`text-xs font-medium ${
                          capacitySufficient
                            ? "text-emerald-700 dark:text-emerald-400"
                            : capacityPartial
                            ? "text-amber-700 dark:text-amber-400"
                            : "text-red-700 dark:text-red-400"
                        }`}
                      >
                        {capacitySufficient
                          ? "Sufficient capacity available"
                          : capacityPartial
                          ? `Partial capacity: ${site.availableLabel} of ${deal.unitsLabel} requested`
                          : "No capacity available at this site"}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Parties */}
            {supplyContact && (
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <Leaf className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                    <CardTitle className="text-sm font-semibold">Supply Contact</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 ${supplyContact.avatarColor}`}
                    >
                      {supplyContact.initials}
                    </div>
                    <div className="min-w-0">
                      <Link
                        href={`/admin/brokerage-mockups/contacts/${supplyContact.id}`}
                        className="text-sm font-medium hover:text-primary transition-colors"
                      >
                        {supplyContact.name}
                      </Link>
                      <p className="text-xs text-muted-foreground">{supplyContact.company}</p>
                      <div className="flex flex-col gap-1 mt-1.5">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Phone className="w-3 h-3" />
                          <span>{supplyContact.phone}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Mail className="w-3 h-3" />
                          <span>{supplyContact.email}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {demandContact && (
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                    <CardTitle className="text-sm font-semibold">Demand Contact</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 ${demandContact.avatarColor}`}
                    >
                      {demandContact.initials}
                    </div>
                    <div className="min-w-0">
                      <Link
                        href={`/admin/brokerage-mockups/contacts/${demandContact.id}`}
                        className="text-sm font-medium hover:text-primary transition-colors"
                      >
                        {demandContact.name}
                      </Link>
                      <p className="text-xs text-muted-foreground">{demandContact.company}</p>
                      <div className="flex flex-col gap-1 mt-1.5">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Phone className="w-3 h-3" />
                          <span>{demandContact.phone}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Mail className="w-3 h-3" />
                          <span>{demandContact.email}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* ─── Action Bar ────────────────────────────── */}
        <Separator className="my-6" />
        <div className="flex items-center justify-end gap-3">
          <Button variant="outline" className="gap-1.5">
            <Download className="h-4 w-4" />
            Download PDF
          </Button>
          <Button variant="secondary" className="gap-1.5">
            <Save className="h-4 w-4" />
            Save Draft
          </Button>
          <Button className="gap-1.5">
            <Send className="h-4 w-4" />
            Send Quote
          </Button>
        </div>
      </div>
    </div>
  )
}
