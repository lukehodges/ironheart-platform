"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import {
  FileText,
  Download,
  Send,
  Printer,
  ArrowLeft,
  Shield,
  Check,
  CheckCircle2,
  QrCode,
  Award,
  Building2,
  MapPin,
  Leaf,
  Calendar,
} from "lucide-react"
import { deals, sites, contacts } from "../../_mock-data"

// ---------------------------------------------------------------------------
// Eligible stages for credit certificate generation
// ---------------------------------------------------------------------------

const CERT_STAGES = new Set(["Credits Allocated", "LPA Confirmed", "Completed"])

// ---------------------------------------------------------------------------
// LPA details (mock)
// ---------------------------------------------------------------------------

const LPA_DETAILS: Record<string, { fullName: string; planningDept: string; email: string }> = {
  Eastleigh: {
    fullName: "Eastleigh Borough Council",
    planningDept: "Planning & Building Control",
    email: "planning@eastleigh.gov.uk",
  },
  Fareham: {
    fullName: "Fareham Borough Council",
    planningDept: "Development Management",
    email: "planning@fareham.gov.uk",
  },
  Winchester: {
    fullName: "Winchester City Council",
    planningDept: "Strategic Planning",
    email: "planning@winchester.gov.uk",
  },
  "Test Valley": {
    fullName: "Test Valley Borough Council",
    planningDept: "Planning & Building",
    email: "planning@testvalley.gov.uk",
  },
  "New Forest": {
    fullName: "New Forest District Council",
    planningDept: "Planning Development Control",
    email: "planning@newforest.gov.uk",
  },
}

// ---------------------------------------------------------------------------
// Mock planning references per deal
// ---------------------------------------------------------------------------

const PLANNING_REFS: Record<string, string> = {
  "D-0031": "O/25/94817",
  "D-0032": "O/25/94603",
  "D-0035": "O/25/93245",
}

// ---------------------------------------------------------------------------
// Mock BNG habitat breakdown for certificate display
// ---------------------------------------------------------------------------

interface HabitatBreakdownRow {
  habitatType: string
  units: number
  distinctiveness: string
}

function getBngHabitatBreakdown(dealId: string): HabitatBreakdownRow[] {
  // In reality this would come from the site's improvement parcels
  // For the mockup, generate from BNG deal allocation data or site data
  const deal = deals.find((d) => d.id === dealId)
  if (!deal?.bngAllocation) return []
  return deal.bngAllocation.map((a) => ({
    habitatType: a.habitatType,
    units: a.units,
    distinctiveness: a.category === "area" ? "Very High" : "High",
  }))
}

// ---------------------------------------------------------------------------
// Issuer options
// ---------------------------------------------------------------------------

interface Issuer {
  name: string
  position: string
}

const ISSUERS: Issuer[] = [
  { name: "James Harris", position: "Senior Broker" },
  { name: "Sarah Croft", position: "Senior Environmental Consultant" },
  { name: "Tom Jenkins", position: "Brokerage Manager" },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function generateCertRef(deal: { id: string; unitType: string }): string {
  const prefix = deal.unitType === "BNG" ? "BNG" : "NN"
  const num = deal.id.replace("D-", "")
  return `${prefix}-CERT-2026-${num}`
}

function distinctivenessLabel(d: string): string {
  const map: Record<string, string> = {
    v_low: "Very Low",
    low: "Low",
    medium: "Medium",
    high: "High",
    v_high: "Very High",
  }
  return map[d] ?? d
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CreditCertificatePage() {
  // -- Deal selection
  const eligibleDeals = useMemo(
    () => deals.filter((d) => CERT_STAGES.has(d.stage)),
    [],
  )

  const [selectedDealId, setSelectedDealId] = useState(
    () => eligibleDeals.find((d) => d.id === "D-0031")?.id ?? eligibleDeals[0]?.id ?? "",
  )

  const selectedDeal = useMemo(
    () => eligibleDeals.find((d) => d.id === selectedDealId) ?? eligibleDeals[0] ?? null,
    [eligibleDeals, selectedDealId],
  )

  const selectedSite = useMemo(
    () => (selectedDeal ? sites.find((s) => s.ref === selectedDeal.siteRef) ?? null : null),
    [selectedDeal],
  )

  const demandContact = useMemo(
    () => (selectedDeal ? contacts.find((c) => c.id === selectedDeal.demandContact) ?? null : null),
    [selectedDeal],
  )

  const supplyContact = useMemo(
    () => (selectedDeal ? contacts.find((c) => c.id === selectedDeal.supplyContact) ?? null : null),
    [selectedDeal],
  )

  // -- Certificate options
  const [includeHabitatBreakdown, setIncludeHabitatBreakdown] = useState(true)
  const [includeCompliance, setIncludeCompliance] = useState(true)
  const [includeQrCode, setIncludeQrCode] = useState(true)
  const [selectedIssuer, setSelectedIssuer] = useState(ISSUERS[0].name)
  const [customNotes, setCustomNotes] = useState("")

  // -- Derived
  const certRef = selectedDeal ? generateCertRef(selectedDeal) : ""
  const issuer = ISSUERS.find((i) => i.name === selectedIssuer) ?? ISSUERS[0]
  const isBNG = selectedDeal?.unitType === "BNG"
  const isNitrogen = selectedDeal?.unitType === "Nitrogen"
  const lpaDetails = selectedSite ? LPA_DETAILS[selectedSite.lpa] : null
  const planningRef = selectedDeal ? PLANNING_REFS[selectedDeal.id] ?? "APP/2026/0001" : ""
  const today = new Date()

  // BNG habitat data from site improvement parcels
  const bngHabitatRows = useMemo(() => {
    if (!isBNG || !selectedSite?.improvementHabitats) {
      // Fallback to deal allocation if present
      return selectedDeal ? getBngHabitatBreakdown(selectedDeal.id) : []
    }
    return selectedSite.improvementHabitats.map((h) => ({
      habitatType: h.specificHabitatType,
      units: h.biodiversityUnits,
      distinctiveness: distinctivenessLabel(h.distinctiveness),
    }))
  }, [isBNG, selectedSite, selectedDeal])

  // -- When deal changes
  const handleDealChange = (dealId: string) => {
    setSelectedDealId(dealId)
  }

  // -- Action handlers
  const handleDownload = () => {
    toast.success(`Certificate downloaded: ${certRef}.pdf`, {
      description: "PDF saved to your Downloads folder",
    })
  }

  const handleSendDeveloper = () => {
    const email = demandContact?.email ?? "developer"
    toast.success(`Certificate sent to ${demandContact?.name ?? "developer"}`, {
      description: `Emailed to ${email}`,
    })
  }

  const handleSendLPA = () => {
    const lpaName = lpaDetails?.fullName ?? selectedSite?.lpa ?? "LPA"
    toast.success(`Certificate sent to ${lpaName} planning department`, {
      description: `Emailed to ${lpaDetails?.email ?? "planning@lpa.gov.uk"}`,
    })
  }

  const handleAddToDeal = () => {
    toast.success(`Certificate added to deal ${selectedDeal?.id} document tracker`, {
      description: `${certRef} linked to ${selectedDeal?.title}`,
    })
  }

  const handlePrint = () => {
    toast.success("Print dialog opened", {
      description: `Printing ${certRef}`,
    })
  }

  if (!selectedDeal) {
    return (
      <div className="p-8">
        <p className="text-muted-foreground">No eligible deals found for certificate generation.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* ── Header ── */}
      <div className="border-b bg-card">
        <div className="mx-auto max-w-[1600px] px-6 py-4">
          <Link
            href="/admin/brokerage-mockups/documents"
            className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Documents
          </Link>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                <Award className="h-6 w-6 text-emerald-500" />
                Credit Certificate Generator
              </h1>
              <p className="text-muted-foreground mt-1">
                Generate formal credit allocation certificates for LPA submission
              </p>
            </div>
            <Badge variant="outline" className="text-emerald-600 border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-800">
              <Shield className="h-3 w-3 mr-1" />
              Official Document
            </Badge>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1600px] px-6 py-6">
        {/* ── Deal Selector + Summary ── */}
        <div className="mb-6 grid gap-6 lg:grid-cols-[1fr_2fr]">
          {/* Deal selector */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Select Deal</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={selectedDealId} onValueChange={handleDealChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a deal..." />
                </SelectTrigger>
                <SelectContent>
                  {eligibleDeals.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      <span className="font-medium">{d.id}</span>
                      <span className="text-muted-foreground ml-2">{d.title}</span>
                      <Badge variant="outline" className="ml-2 text-[10px]">
                        {d.stage}
                      </Badge>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-2">
                Showing deals at Credits Allocated, LPA Confirmed, or Completed stages
              </p>
            </CardContent>
          </Card>

          {/* Deal summary */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Deal Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Deal Reference</p>
                  <p className="font-semibold">{selectedDeal.id}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Developer</p>
                  <p className="font-semibold">{demandContact?.company ?? selectedDeal.demandContactName}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Landowner</p>
                  <p className="font-semibold">{supplyContact?.name ?? selectedDeal.supplyContactName}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Gain Site</p>
                  <p className="font-semibold">{selectedDeal.siteName}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Credit Type</p>
                  <Badge variant={isBNG ? "default" : "secondary"} className="mt-0.5">
                    {isBNG ? "BNG" : selectedDeal.unitType}
                  </Badge>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Units</p>
                  <p className="font-semibold">{selectedDeal.unitsLabel}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Deal Value</p>
                  <p className="font-semibold">{selectedDeal.displayValue}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Current Stage</p>
                  <Badge
                    variant="outline"
                    className={
                      selectedDeal.stage === "Completed"
                        ? "border-emerald-300 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-400"
                        : selectedDeal.stage === "LPA Confirmed"
                          ? "border-blue-300 text-blue-700 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-800 dark:text-blue-400"
                          : "border-amber-300 text-amber-700 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-400"
                    }
                  >
                    {selectedDeal.stage}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Main Layout: Options + Certificate ── */}
        <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
          {/* ── Sidebar Options ── */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Certificate Options</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Certificate type (auto-detected) */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Certificate Type</Label>
                  <div className="flex items-center gap-2">
                    <Leaf className="h-4 w-4 text-emerald-500" />
                    <span className="text-sm font-medium">
                      {isBNG ? "Biodiversity Net Gain" : "Nutrient Neutrality"}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">Auto-detected from deal unit type</p>
                </div>

                <Separator />

                {/* Include habitat breakdown (BNG only) */}
                {isBNG && (
                  <>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="habitat-breakdown" className="text-sm cursor-pointer">
                        Include Habitat Breakdown
                      </Label>
                      <Switch
                        id="habitat-breakdown"
                        checked={includeHabitatBreakdown}
                        onCheckedChange={setIncludeHabitatBreakdown}
                      />
                    </div>
                    <Separator />
                  </>
                )}

                {/* Include compliance declaration */}
                <div className="flex items-center justify-between">
                  <Label htmlFor="compliance" className="text-sm cursor-pointer">
                    Include Compliance Declaration
                  </Label>
                  <Switch
                    id="compliance"
                    checked={includeCompliance}
                    onCheckedChange={setIncludeCompliance}
                  />
                </div>

                <Separator />

                {/* Include QR code */}
                <div className="flex items-center justify-between">
                  <Label htmlFor="qr-code" className="text-sm cursor-pointer">
                    Include QR Verification Code
                  </Label>
                  <Switch
                    id="qr-code"
                    checked={includeQrCode}
                    onCheckedChange={setIncludeQrCode}
                  />
                </div>

                <Separator />

                {/* Issuer */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Issuer</Label>
                  <Select value={selectedIssuer} onValueChange={setSelectedIssuer}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ISSUERS.map((i) => (
                        <SelectItem key={i.name} value={i.name}>
                          {i.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground">{issuer.position}</p>
                </div>

                <Separator />

                {/* Custom notes */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Custom Notes</Label>
                  <Textarea
                    placeholder="Additional notes to include on the certificate..."
                    value={customNotes}
                    onChange={(e) => setCustomNotes(e.target.value)}
                    rows={3}
                    className="text-sm"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Action buttons */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button className="w-full justify-start gap-2" onClick={handleDownload}>
                  <Download className="h-4 w-4" />
                  Download PDF
                </Button>
                <Button variant="outline" className="w-full justify-start gap-2" onClick={handleSendDeveloper}>
                  <Send className="h-4 w-4" />
                  Send to Developer
                </Button>
                <Button variant="outline" className="w-full justify-start gap-2" onClick={handleSendLPA}>
                  <Building2 className="h-4 w-4" />
                  Send to LPA
                </Button>
                <Button variant="outline" className="w-full justify-start gap-2" onClick={handleAddToDeal}>
                  <FileText className="h-4 w-4" />
                  Add to Deal Documents
                </Button>
                <Button variant="outline" className="w-full justify-start gap-2" onClick={handlePrint}>
                  <Printer className="h-4 w-4" />
                  Print
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* ── Certificate Preview ── */}
          <div className="flex justify-center">
            <div className="w-full max-w-[820px]">
              <div
                className="bg-white text-gray-900 shadow-xl rounded-sm"
                style={{
                  fontFamily: "'Georgia', 'Times New Roman', serif",
                }}
              >
                {/* Decorative top border */}
                <div className="h-2 bg-gradient-to-r from-emerald-700 via-emerald-600 to-emerald-700" />

                {/* Inner border frame */}
                <div className="m-4 border-2 border-emerald-700/30">
                  {/* Certificate Header */}
                  <div className="px-10 pt-10 pb-6 text-center border-b border-emerald-700/20">
                    {/* Logo / Organization name */}
                    <div className="flex items-center justify-center gap-3 mb-4">
                      <div className="h-12 w-12 rounded-full bg-emerald-700 flex items-center justify-center">
                        <Leaf className="h-6 w-6 text-white" />
                      </div>
                    </div>
                    <p className="text-xs tracking-[0.3em] text-emerald-800 uppercase font-sans font-semibold mb-3">
                      Ironheart Environmental Ltd
                    </p>

                    <h2 className="text-2xl font-bold tracking-wide text-gray-900 uppercase mb-1">
                      {isBNG ? "Biodiversity Net Gain" : "Nutrient Neutrality"}
                    </h2>
                    <h3 className="text-lg tracking-widest text-emerald-800 uppercase">
                      Credit Allocation Certificate
                    </h3>

                    <div className="mt-5 flex items-center justify-center gap-8 text-sm text-gray-600">
                      <div>
                        <span className="text-gray-400 text-xs block">Certificate Reference</span>
                        <span className="font-semibold text-gray-900 font-mono text-base">{certRef}</span>
                      </div>
                      <div className="h-8 w-px bg-gray-200" />
                      <div>
                        <span className="text-gray-400 text-xs block">Date of Issue</span>
                        <span className="font-semibold text-gray-900">{formatDate(today)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Certification Statement */}
                  <div className="px-10 py-6 border-b border-emerald-700/20">
                    <p className="text-sm font-bold tracking-wide text-emerald-800 uppercase mb-4">
                      This is to certify that:
                    </p>
                    <p className="text-[15px] leading-relaxed text-gray-800">
                      <span className="font-bold text-gray-900">{selectedDeal.units} {selectedDeal.unitsLabel.replace(/^[\d.]+ /, "")}</span>{" "}
                      {isNitrogen ? "nitrogen credits" : "biodiversity units"} have been allocated from the gain site
                      detailed below to satisfy the environmental obligation for the specified development.
                    </p>
                  </div>

                  {/* Gain Site Details */}
                  <div className="px-10 py-6 border-b border-emerald-700/20">
                    <div className="flex items-center gap-2 mb-4">
                      <MapPin className="h-4 w-4 text-emerald-700" />
                      <h4 className="text-sm font-bold tracking-wide text-emerald-800 uppercase">
                        Gain Site
                      </h4>
                    </div>
                    <div className="grid grid-cols-[140px_1fr] gap-y-2.5 text-sm">
                      <span className="text-gray-500">Name</span>
                      <span className="font-semibold text-gray-900">{selectedSite?.name ?? "N/A"}</span>

                      <span className="text-gray-500">Address</span>
                      <span className="text-gray-800">{selectedSite?.address ?? "N/A"}</span>

                      <span className="text-gray-500">
                        {isBNG ? "Gain Site Register Ref" : "Registration Ref"}
                      </span>
                      <span className="font-mono text-gray-900">
                        {selectedSite?.registrationRef ?? selectedSite?.bgsReference ?? "Pending"}
                      </span>

                      <span className="text-gray-500">Registration Date</span>
                      <span className="text-gray-800">
                        {selectedSite?.registeredDate
                          ? formatDate(new Date(selectedSite.registeredDate))
                          : "Pending"}
                      </span>

                      <span className="text-gray-500">Legal Agreement</span>
                      <span className="text-gray-800">
                        {selectedSite?.legalAgreement ?? "S106 Agreement"}
                      </span>
                    </div>
                  </div>

                  {/* Development Details */}
                  <div className="px-10 py-6 border-b border-emerald-700/20">
                    <div className="flex items-center gap-2 mb-4">
                      <Building2 className="h-4 w-4 text-emerald-700" />
                      <h4 className="text-sm font-bold tracking-wide text-emerald-800 uppercase">
                        To satisfy the obligation for
                      </h4>
                    </div>
                    <div className="grid grid-cols-[140px_1fr] gap-y-2.5 text-sm">
                      <span className="text-gray-500">Developer</span>
                      <span className="font-semibold text-gray-900">
                        {demandContact?.company ?? selectedDeal.demandContactName}
                      </span>

                      <span className="text-gray-500">Planning Application</span>
                      <span className="font-mono text-gray-900">{planningRef}</span>

                      <span className="text-gray-500">Local Planning Authority</span>
                      <span className="text-gray-800">
                        {lpaDetails?.fullName ?? `${selectedSite?.lpa} Borough Council`}
                      </span>

                      <span className="text-gray-500">Development</span>
                      <span className="text-gray-800">{selectedDeal.title}</span>
                    </div>
                  </div>

                  {/* Credit Specification */}
                  <div className="px-10 py-6 border-b border-emerald-700/20">
                    <div className="flex items-center gap-2 mb-4">
                      <Award className="h-4 w-4 text-emerald-700" />
                      <h4 className="text-sm font-bold tracking-wide text-emerald-800 uppercase">
                        Credit Specification
                      </h4>
                    </div>
                    <div className="grid grid-cols-[140px_1fr] gap-y-2.5 text-sm mb-4">
                      <span className="text-gray-500">Credit Type</span>
                      <span className="font-semibold text-gray-900">
                        {isBNG ? "BNG Area Habitat Units" : "Nitrogen Credits"}
                      </span>

                      <span className="text-gray-500">Quantity</span>
                      <span className="font-bold text-gray-900 text-base">
                        {selectedDeal.unitsLabel}
                      </span>

                      <span className="text-gray-500">Catchment</span>
                      <span className="text-gray-800">{selectedDeal.catchment}</span>

                      <span className="text-gray-500">Value</span>
                      <span className="text-gray-800">{selectedDeal.displayValue}</span>
                    </div>

                    {/* BNG: Habitat Breakdown Table */}
                    {isBNG && includeHabitatBreakdown && bngHabitatRows.length > 0 && (
                      <div className="mt-4">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                          Habitat Breakdown
                        </p>
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-gray-200">
                              <th className="text-left py-1.5 text-gray-500 font-medium text-xs">
                                Habitat Type
                              </th>
                              <th className="text-right py-1.5 text-gray-500 font-medium text-xs w-20">
                                Units
                              </th>
                              <th className="text-right py-1.5 text-gray-500 font-medium text-xs w-28">
                                Distinctiveness
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {bngHabitatRows.map((row, i) => (
                              <tr key={i} className="border-b border-gray-100">
                                <td className="py-1.5 text-gray-800">{row.habitatType}</td>
                                <td className="py-1.5 text-right font-semibold text-gray-900">
                                  {row.units.toFixed(1)}
                                </td>
                                <td className="py-1.5 text-right text-gray-600">
                                  {row.distinctiveness}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Nitrogen: Loading details */}
                    {isNitrogen && selectedSite && (
                      <div className="mt-4 bg-gray-50 rounded p-4">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                          Nutrient Budget
                        </p>
                        <div className="grid grid-cols-[180px_1fr] gap-y-2 text-sm">
                          <span className="text-gray-500">Baseline Loading</span>
                          <span className="text-gray-800">
                            {selectedSite.baselineLoading ?? "N/A"} kg N/yr
                          </span>

                          <span className="text-gray-500">Proposed Loading</span>
                          <span className="text-gray-800">
                            {selectedSite.proposedLoading ?? "N/A"} kg N/yr
                          </span>

                          <span className="text-gray-500">Net Credit</span>
                          <span className="font-bold text-emerald-700">
                            {selectedSite.baselineLoading && selectedSite.proposedLoading
                              ? `${selectedSite.baselineLoading - selectedSite.proposedLoading} kg N/yr`
                              : "N/A"}
                          </span>

                          <span className="text-gray-500">Mitigation</span>
                          <span className="text-gray-800 text-xs leading-snug">
                            {selectedSite.mitigationType ?? "N/A"}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Management & Monitoring */}
                  <div className="px-10 py-6 border-b border-emerald-700/20">
                    <div className="flex items-center gap-2 mb-4">
                      <Calendar className="h-4 w-4 text-emerald-700" />
                      <h4 className="text-sm font-bold tracking-wide text-emerald-800 uppercase">
                        Management & Monitoring
                      </h4>
                    </div>
                    <div className="grid grid-cols-[180px_1fr] gap-y-2.5 text-sm">
                      <span className="text-gray-500">Management Period</span>
                      <span className="text-gray-800">
                        {selectedSite?.commitmentYears ?? (isBNG ? 30 : 80)} years
                      </span>

                      <span className="text-gray-500">HMMP Status</span>
                      <span className="text-gray-800">
                        {selectedSite?.hmmpStatus
                          ? selectedSite.hmmpStatus.charAt(0).toUpperCase() + selectedSite.hmmpStatus.slice(1)
                          : "Approved"}
                      </span>

                      <span className="text-gray-500">Monitoring Frequency</span>
                      <span className="text-gray-800">Annual</span>

                      <span className="text-gray-500">Management Body</span>
                      <span className="text-gray-800">Hampshire Land Management Ltd</span>

                      <span className="text-gray-500">Next Monitoring Due</span>
                      <span className="text-gray-800">
                        {formatDate(new Date(today.getFullYear() + 1, today.getMonth(), 1))}
                      </span>
                    </div>
                  </div>

                  {/* Compliance Declaration */}
                  {includeCompliance && (
                    <div className="px-10 py-6 border-b border-emerald-700/20">
                      <div className="flex items-center gap-2 mb-4">
                        <Shield className="h-4 w-4 text-emerald-700" />
                        <h4 className="text-sm font-bold tracking-wide text-emerald-800 uppercase">
                          Compliance Declaration
                        </h4>
                      </div>
                      <p className="text-sm text-gray-600 mb-4">
                        The undersigned confirms that:
                      </p>
                      <div className="space-y-2.5">
                        {[
                          isBNG
                            ? "The gain site is registered on the BNG Register maintained by Natural England"
                            : "The gain site is registered under the Natural England nutrient mitigation scheme",
                          "The credits allocated represent genuine additionality beyond any baseline requirements",
                          "No credits have been double-counted or allocated to any other development",
                          "A Habitat Management and Monitoring Plan is in place for the full management period",
                          "The responsible body has been appointed for long-term management and monitoring",
                        ].map((item, i) => (
                          <div key={i} className="flex items-start gap-2.5">
                            <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                            <p className="text-sm text-gray-700 leading-snug">{item}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Custom Notes */}
                  {customNotes.trim() && (
                    <div className="px-10 py-6 border-b border-emerald-700/20">
                      <h4 className="text-sm font-bold tracking-wide text-emerald-800 uppercase mb-3">
                        Additional Notes
                      </h4>
                      <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                        {customNotes}
                      </p>
                    </div>
                  )}

                  {/* Signature Block + QR */}
                  <div className="px-10 py-8">
                    <div className="flex justify-between items-end">
                      {/* Signature block */}
                      <div className="space-y-5 flex-1">
                        <div>
                          <p className="text-sm text-gray-500 mb-1">Issued by:</p>
                          <div className="w-56 border-b border-gray-300 pb-0.5 mb-1" />
                          <p className="text-sm font-semibold text-gray-900">{issuer.name}</p>
                          <p className="text-xs text-gray-500">{issuer.position}</p>
                          <p className="text-xs text-gray-500">Ironheart Environmental Ltd</p>
                        </div>

                        <div className="flex gap-8">
                          <div>
                            <p className="text-sm text-gray-500 mb-1">Signature:</p>
                            <div className="w-48 border-b border-gray-300" />
                          </div>
                          <div>
                            <p className="text-sm text-gray-500 mb-1">Date:</p>
                            <div className="w-36 border-b border-gray-300" />
                          </div>
                        </div>
                      </div>

                      {/* QR Code Placeholder */}
                      {includeQrCode && (
                        <div className="ml-8 flex-shrink-0">
                          <div className="flex gap-4 items-start">
                            <div className="w-24 h-24 border-2 border-gray-300 rounded-sm bg-gray-50 flex flex-col items-center justify-center">
                              <QrCode className="h-10 w-10 text-gray-400" />
                              <span className="text-[9px] text-gray-400 mt-1">QR CODE</span>
                            </div>
                            <div className="text-xs text-gray-500 space-y-0.5 pt-1">
                              <p>Scan to verify this</p>
                              <p>certificate online</p>
                              <p className="font-mono text-gray-600 mt-1.5">
                                ironheart.co.uk/verify/
                              </p>
                              <p className="font-mono font-semibold text-gray-800">
                                {certRef}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Footer metadata */}
                    <Separator className="my-6 bg-gray-200" />
                    <div className="flex items-center justify-between text-xs text-gray-400">
                      <div className="space-y-0.5">
                        <p>Certificate ID: <span className="font-mono font-medium text-gray-500">{certRef}</span></p>
                        <p>
                          Verification:{" "}
                          <span className="font-mono text-gray-500">
                            ironheart.co.uk/verify/{selectedDeal.id.replace("D-", "").padStart(4, "0")}
                          </span>
                        </p>
                      </div>
                      <div className="text-right space-y-0.5">
                        <p>Ironheart Environmental Ltd</p>
                        <p>Registered in England & Wales</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Decorative bottom border */}
                <div className="h-2 bg-gradient-to-r from-emerald-700 via-emerald-600 to-emerald-700" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
