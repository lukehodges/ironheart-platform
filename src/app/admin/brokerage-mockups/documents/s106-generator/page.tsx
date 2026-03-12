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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import {
  FileText,
  Download,
  Send,
  Save,
  ArrowLeft,
  Scale,
  Users,
  Building2,
  MapPin,
  PoundSterling,
  Calendar,
  FileSignature,
  Printer,
  Check,
} from "lucide-react"
import { deals, sites, contacts } from "../../_mock-data"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type DocumentType = "s106" | "conservation-covenant" | "heads-of-terms"

type PaymentTerms =
  | "lump-sum"
  | "staged-50-50"
  | "staged-3-instalments"

// ---------------------------------------------------------------------------
// LPA address map (mocked — in reality from gazetteer)
// ---------------------------------------------------------------------------

const LPA_ADDRESSES: Record<string, string> = {
  Eastleigh: "Eastleigh Borough Council, Eastleigh House, Upper Market Street, Eastleigh SO50 9YN",
  Fareham: "Fareham Borough Council, Civic Offices, Civic Way, Fareham PO16 7AZ",
  Winchester: "Winchester City Council, City Offices, Colebrook Street, Winchester SO23 9LJ",
  "Test Valley": "Test Valley Borough Council, Beech Hurst, Weyhill Road, Andover SP10 3AJ",
  "New Forest": "New Forest District Council, Appletree Court, Beaulieu Road, Lyndhurst SO43 7PA",
}

// ---------------------------------------------------------------------------
// Eligible deal stages for legal document generation
// ---------------------------------------------------------------------------

const LEGAL_STAGES = new Set(["Legal Drafting", "Legal Review", "Contracts Signed"])

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount)
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
}

function ordinalDay(day: number): string {
  if (day >= 11 && day <= 13) return `${day}th`
  switch (day % 10) {
    case 1: return `${day}st`
    case 2: return `${day}nd`
    case 3: return `${day}rd`
    default: return `${day}th`
  }
}

function formatLegalDate(date: Date): string {
  const day = date.getDate()
  const month = date.toLocaleDateString("en-GB", { month: "long" })
  const year = date.getFullYear()
  return `${ordinalDay(day)} day of ${month} ${year}`
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function S106GeneratorPage() {
  // -- Template type state
  const [docType, setDocType] = useState<DocumentType>("s106")

  // -- Deal selection
  const eligibleDeals = useMemo(
    () => deals.filter((d) => LEGAL_STAGES.has(d.stage)),
    [],
  )
  const [selectedDealId, setSelectedDealId] = useState("D-0045")

  const selectedDeal = useMemo(
    () => eligibleDeals.find((d) => d.id === selectedDealId) ?? eligibleDeals[0],
    [eligibleDeals, selectedDealId],
  )

  const selectedSite = useMemo(
    () => sites.find((s) => s.ref === selectedDeal?.siteRef) ?? null,
    [selectedDeal],
  )

  const demandContact = useMemo(
    () => contacts.find((c) => c.id === selectedDeal?.demandContact) ?? null,
    [selectedDeal],
  )

  const supplyContact = useMemo(
    () => contacts.find((c) => c.id === selectedDeal?.supplyContact) ?? null,
    [selectedDeal],
  )

  // -- Configuration form state (auto-populated, editable)
  const [developerName, setDeveloperName] = useState(() =>
    demandContact ? `${demandContact.company}` : "",
  )
  const [developerAddress, setDeveloperAddress] = useState(() =>
    demandContact ? `${demandContact.company}, ${demandContact.location}` : "",
  )
  const [developerSolicitor, setDeveloperSolicitor] = useState("Shoosmiths LLP")
  const [developerSolicitorAddress, setDeveloperSolicitorAddress] = useState("Shoosmiths LLP, 1 Bishops Square, Southampton SO14 3AR")
  const [landownerName, setLandownerName] = useState(() =>
    supplyContact ? `${supplyContact.name}` : "",
  )
  const [landownerAddress, setLandownerAddress] = useState(() =>
    selectedSite ? selectedSite.address : "",
  )
  const [landownerSolicitor, setLandownerSolicitor] = useState("Blake Morgan")
  const [landownerSolicitorAddress, setLandownerSolicitorAddress] = useState("Blake Morgan, Tollgate, Chandler's Ford, Eastleigh SO53 3TY")
  const [lpaName, setLpaName] = useState(() =>
    selectedSite ? `${selectedSite.lpa} Borough Council` : "",
  )
  const [lpaAddress, setLpaAddress] = useState(() =>
    selectedSite ? LPA_ADDRESSES[selectedSite.lpa] ?? "" : "",
  )
  const [lpaCaseOfficer, setLpaCaseOfficer] = useState("Sarah Williams")

  const [planningRef, setPlanningRef] = useState("F/25/00198")
  const [paymentTerms, setPaymentTerms] = useState<PaymentTerms>("staged-50-50")
  const [monitoringPeriod, setMonitoringPeriod] = useState("30")
  const [managementCompany, setManagementCompany] = useState("Hampshire Land Management Ltd")
  const [responsibleBody, setResponsibleBody] = useState("Natural England")

  // Computed values
  const unitPrice = selectedDeal ? selectedDeal.value / selectedDeal.units : 0
  const totalValue = selectedDeal?.value ?? 0
  const creditType = selectedDeal?.unitType ?? "Nitrogen"
  const creditQuantity = selectedDeal?.units ?? 0
  const unitsLabel = selectedDeal?.unitsLabel ?? ""
  const gainSiteRef = selectedSite?.registrationRef ?? selectedSite?.bgsReference ?? "Pending"

  // -- When deal changes, re-populate
  const handleDealChange = (dealId: string) => {
    setSelectedDealId(dealId)
    const deal = eligibleDeals.find((d) => d.id === dealId)
    if (!deal) return

    const site = sites.find((s) => s.ref === deal.siteRef)
    const demand = contacts.find((c) => c.id === deal.demandContact)
    const supply = contacts.find((c) => c.id === deal.supplyContact)

    if (demand) {
      setDeveloperName(demand.company)
      setDeveloperAddress(`${demand.company}, ${demand.location}`)
    }
    if (supply) {
      setLandownerName(supply.name)
      setLandownerAddress(site?.address ?? "")
    }
    if (site) {
      setLpaName(`${site.lpa} Borough Council`)
      setLpaAddress(LPA_ADDRESSES[site.lpa] ?? "")
    }
  }

  // -- Document rendering
  const today = new Date()

  // ─── Build filename base ──────────────────────────────────────────────
  const fileBase = useMemo(() => {
    const typePrefix =
      docType === "s106"
        ? "S106"
        : docType === "conservation-covenant"
          ? "ConsCov"
          : "HoT"
    const sitePart = selectedSite?.name.replace(/\s+/g, "") ?? "Unknown"
    return `${typePrefix}_${selectedDeal?.id}_${sitePart}`
  }, [docType, selectedDeal, selectedSite])

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="min-h-screen bg-background">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="border-b border-border bg-card">
        <div className="mx-auto max-w-7xl px-6 py-5">
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
                <Scale className="h-6 w-6 text-amber-500" />
                Legal Document Generator
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Generate S106 agreements, conservation covenants, and heads of terms from deal data
              </p>
            </div>
            <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-400">
              <FileSignature className="mr-1 h-3 w-3" />
              Legal
            </Badge>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-6 space-y-6">
        {/* ── Section 1: Template & Deal Selection ─────────────── */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              Template &amp; Deal Selection
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Document type tabs */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Document Type</Label>
              <Tabs value={docType} onValueChange={(v) => setDocType(v as DocumentType)}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="s106" className="text-xs sm:text-sm">
                    S106 Agreement
                  </TabsTrigger>
                  <TabsTrigger value="conservation-covenant" className="text-xs sm:text-sm">
                    Conservation Covenant
                  </TabsTrigger>
                  <TabsTrigger value="heads-of-terms" className="text-xs sm:text-sm">
                    Heads of Terms
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Deal selector */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Select Deal</Label>
              <Select value={selectedDealId} onValueChange={handleDealChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a deal..." />
                </SelectTrigger>
                <SelectContent>
                  {eligibleDeals.map((deal) => (
                    <SelectItem key={deal.id} value={deal.id}>
                      <span className="font-mono text-xs text-muted-foreground mr-2">{deal.id}</span>
                      {deal.title}
                      <span className="ml-2 text-xs text-muted-foreground">({deal.stage})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Deal summary */}
            {selectedDeal && (
              <div className="rounded-lg border border-border bg-muted/40 p-4">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Deal</p>
                    <p className="font-medium">{selectedDeal.title}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Parties</p>
                    <p className="font-medium">{selectedDeal.demandContactName} / {selectedDeal.supplyContactName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Site</p>
                    <p className="font-medium">{selectedDeal.siteName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Credit Type</p>
                    <Badge variant="outline" className="text-xs">{selectedDeal.unitType}</Badge>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Units</p>
                    <p className="font-medium">{selectedDeal.unitsLabel}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Value</p>
                    <p className="font-semibold text-emerald-600">{selectedDeal.displayValue}</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Section 2: Configuration ─────────────────────────── */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              Document Configuration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left column — Parties */}
              <div className="space-y-5">
                <h3 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
                  <Building2 className="h-4 w-4" /> Parties
                </h3>

                {docType !== "conservation-covenant" && (
                  <>
                    <div className="space-y-3">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Developer</p>
                      <div className="space-y-2">
                        <Label htmlFor="dev-name" className="text-xs">Name</Label>
                        <Input id="dev-name" value={developerName} onChange={(e) => setDeveloperName(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="dev-addr" className="text-xs">Address</Label>
                        <Input id="dev-addr" value={developerAddress} onChange={(e) => setDeveloperAddress(e.target.value)} />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Developer Solicitor</p>
                      <div className="space-y-2">
                        <Label htmlFor="dev-sol" className="text-xs">Firm</Label>
                        <Input id="dev-sol" value={developerSolicitor} onChange={(e) => setDeveloperSolicitor(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="dev-sol-addr" className="text-xs">Address</Label>
                        <Input id="dev-sol-addr" value={developerSolicitorAddress} onChange={(e) => setDeveloperSolicitorAddress(e.target.value)} />
                      </div>
                    </div>
                  </>
                )}

                <div className="space-y-3">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Landowner</p>
                  <div className="space-y-2">
                    <Label htmlFor="lo-name" className="text-xs">Name</Label>
                    <Input id="lo-name" value={landownerName} onChange={(e) => setLandownerName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lo-addr" className="text-xs">Address</Label>
                    <Input id="lo-addr" value={landownerAddress} onChange={(e) => setLandownerAddress(e.target.value)} />
                  </div>
                </div>

                {docType !== "conservation-covenant" && (
                  <div className="space-y-3">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Landowner Solicitor</p>
                    <div className="space-y-2">
                      <Label htmlFor="lo-sol" className="text-xs">Firm</Label>
                      <Input id="lo-sol" value={landownerSolicitor} onChange={(e) => setLandownerSolicitor(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lo-sol-addr" className="text-xs">Address</Label>
                      <Input id="lo-sol-addr" value={landownerSolicitorAddress} onChange={(e) => setLandownerSolicitorAddress(e.target.value)} />
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {docType === "conservation-covenant" ? "Responsible Body" : "Local Planning Authority"}
                  </p>
                  {docType === "conservation-covenant" ? (
                    <div className="space-y-2">
                      <Label htmlFor="resp-body" className="text-xs">Organisation</Label>
                      <Input id="resp-body" value={responsibleBody} onChange={(e) => setResponsibleBody(e.target.value)} />
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="lpa-name" className="text-xs">Authority</Label>
                        <Input id="lpa-name" value={lpaName} onChange={(e) => setLpaName(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lpa-addr" className="text-xs">Address</Label>
                        <Input id="lpa-addr" value={lpaAddress} onChange={(e) => setLpaAddress(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lpa-officer" className="text-xs">Case Officer</Label>
                        <Input id="lpa-officer" value={lpaCaseOfficer} onChange={(e) => setLpaCaseOfficer(e.target.value)} />
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Right column — Terms */}
              <div className="space-y-5">
                <h3 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
                  <PoundSterling className="h-4 w-4" /> Terms
                </h3>

                <div className="space-y-2">
                  <Label htmlFor="planning-ref" className="text-xs">Planning Application Reference</Label>
                  <Input id="planning-ref" value={planningRef} onChange={(e) => setPlanningRef(e.target.value)} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs">Credit Type</Label>
                    <Input value={creditType} disabled className="bg-muted" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Credit Quantity</Label>
                    <Input value={unitsLabel} disabled className="bg-muted" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs">Unit Price</Label>
                    <Input value={formatCurrency(unitPrice)} disabled className="bg-muted" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Total Value</Label>
                    <Input value={formatCurrency(totalValue)} disabled className="bg-muted font-semibold" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="payment-terms" className="text-xs">Payment Terms</Label>
                  <Select value={paymentTerms} onValueChange={(v) => setPaymentTerms(v as PaymentTerms)}>
                    <SelectTrigger id="payment-terms">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lump-sum">Lump Sum on Completion</SelectItem>
                      <SelectItem value="staged-50-50">Staged: 50% deposit, 50% on allocation</SelectItem>
                      <SelectItem value="staged-3-instalments">Staged: 3 equal instalments</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="monitoring" className="text-xs">Monitoring Period (years)</Label>
                  <Input id="monitoring" value={monitoringPeriod} onChange={(e) => setMonitoringPeriod(e.target.value)} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mgmt-co" className="text-xs">Management Company</Label>
                  <Input id="mgmt-co" value={managementCompany} onChange={(e) => setManagementCompany(e.target.value)} />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Gain Site Register Reference</Label>
                  <Input value={gainSiteRef} disabled className="bg-muted" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Section 3: Document Preview ──────────────────────── */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                Document Preview
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {docType === "s106"
                    ? "S106 Agreement"
                    : docType === "conservation-covenant"
                      ? "Conservation Covenant"
                      : "Heads of Terms"}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => window.print()}
                >
                  <Printer className="mr-1 h-3 w-3" />
                  Print
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Document container — always light mode */}
            <div className="bg-white text-gray-900 border border-gray-200 rounded-lg shadow-sm print:shadow-none print:border-none mx-auto max-w-[210mm]">
              <div className="px-12 py-16 sm:px-16 sm:py-20" style={{ fontFamily: "'Georgia', 'Times New Roman', serif", lineHeight: "1.7" }}>
                {docType === "s106" && (
                  <S106Document
                    date={today}
                    lpaName={lpaName}
                    lpaAddress={lpaAddress}
                    developerName={developerName}
                    developerAddress={developerAddress}
                    landownerName={landownerName}
                    landownerAddress={landownerAddress}
                    planningRef={planningRef}
                    dealTitle={selectedDeal?.title ?? ""}
                    siteName={selectedSite?.name ?? ""}
                    siteAddress={selectedSite?.address ?? ""}
                    catchment={selectedDeal?.catchment ?? "Solent"}
                    creditType={creditType}
                    creditQuantity={creditQuantity}
                    unitsLabel={unitsLabel}
                    unitPrice={unitPrice}
                    totalValue={totalValue}
                    paymentTerms={paymentTerms}
                    monitoringPeriod={monitoringPeriod}
                    managementCompany={managementCompany}
                    gainSiteRef={gainSiteRef}
                    registeredDate={selectedSite?.registeredDate}
                    metricVersion={selectedSite?.metricVersion}
                  />
                )}
                {docType === "conservation-covenant" && (
                  <ConservationCovenantDocument
                    date={today}
                    landownerName={landownerName}
                    landownerAddress={landownerAddress}
                    responsibleBody={responsibleBody}
                    siteName={selectedSite?.name ?? ""}
                    siteAddress={selectedSite?.address ?? ""}
                    gainSiteRef={gainSiteRef}
                    monitoringPeriod={monitoringPeriod}
                    managementCompany={managementCompany}
                    areaHectares={selectedSite?.areaHectares ?? 0}
                    creditType={creditType}
                    creditQuantity={creditQuantity}
                    unitsLabel={unitsLabel}
                    metricVersion={selectedSite?.metricVersion}
                  />
                )}
                {docType === "heads-of-terms" && (
                  <HeadsOfTermsDocument
                    date={today}
                    developerName={developerName}
                    developerAddress={developerAddress}
                    landownerName={landownerName}
                    landownerAddress={landownerAddress}
                    lpaName={lpaName}
                    planningRef={planningRef}
                    dealTitle={selectedDeal?.title ?? ""}
                    dealId={selectedDeal?.id ?? ""}
                    siteName={selectedSite?.name ?? ""}
                    siteAddress={selectedSite?.address ?? ""}
                    creditType={creditType}
                    creditQuantity={creditQuantity}
                    unitsLabel={unitsLabel}
                    unitPrice={unitPrice}
                    totalValue={totalValue}
                    paymentTerms={paymentTerms}
                    monitoringPeriod={monitoringPeriod}
                    managementCompany={managementCompany}
                    gainSiteRef={gainSiteRef}
                    broker={selectedDeal?.broker ?? ""}
                    catchment={selectedDeal?.catchment ?? "Solent"}
                  />
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Action Bar (sticky bottom) ─────────────────────────── */}
      <div className="sticky bottom-0 z-20 border-t border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="mx-auto max-w-7xl px-6 py-3 flex items-center justify-between gap-3 flex-wrap">
          <div className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{fileBase}</span>
            <span className="mx-2 text-border">|</span>
            {selectedDeal?.id} &middot; {selectedSite?.name ?? "Unknown"}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => toast.success(`Document downloaded: ${fileBase}.docx`, { description: "Word document saved to Downloads" })}
            >
              <Download className="mr-1.5 h-3.5 w-3.5" />
              Download as Word
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => toast.success(`PDF generated: ${fileBase}.pdf`, { description: "PDF saved to Downloads" })}
            >
              <Download className="mr-1.5 h-3.5 w-3.5" />
              Download as PDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => toast.success(`Document sent to ${developerSolicitor} and ${landownerSolicitor}`, { description: "Email dispatched with document attached" })}
            >
              <Send className="mr-1.5 h-3.5 w-3.5" />
              Send to Solicitors
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => toast.success(`Template saved: ${docType === "s106" ? "S106" : docType === "conservation-covenant" ? "Conservation Covenant" : "Heads of Terms"} ${creditType} Credits`, { description: "Template available in template library" })}
            >
              <Save className="mr-1.5 h-3.5 w-3.5" />
              Save as Template
            </Button>
            <Button
              size="sm"
              onClick={() => toast.success(`Document added to deal ${selectedDeal?.id} document tracker`, { description: "Visible on deal timeline and documents tab" })}
            >
              <Check className="mr-1.5 h-3.5 w-3.5" />
              Track in Documents
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}


// ==========================================================================
// S106 Agreement Document
// ==========================================================================

function S106Document({
  date,
  lpaName,
  lpaAddress,
  developerName,
  developerAddress,
  landownerName,
  landownerAddress,
  planningRef,
  dealTitle,
  siteName,
  siteAddress,
  catchment,
  creditType,
  creditQuantity,
  unitsLabel,
  unitPrice,
  totalValue,
  paymentTerms,
  monitoringPeriod,
  managementCompany,
  gainSiteRef,
  registeredDate,
  metricVersion,
}: {
  date: Date
  lpaName: string
  lpaAddress: string
  developerName: string
  developerAddress: string
  landownerName: string
  landownerAddress: string
  planningRef: string
  dealTitle: string
  siteName: string
  siteAddress: string
  catchment: string
  creditType: string
  creditQuantity: number
  unitsLabel: string
  unitPrice: number
  totalValue: number
  paymentTerms: PaymentTerms
  monitoringPeriod: string
  managementCompany: string
  gainSiteRef: string
  registeredDate?: string
  metricVersion?: string
}) {
  const isNitrogen = creditType === "Nitrogen"
  const isBNG = creditType === "BNG"
  const unitTypeDesc = isNitrogen ? "kg/yr of nitrogen credits" : "biodiversity habitat units"
  const registeredStatus = registeredDate ? "registered" : "to be registered"

  return (
    <div className="space-y-8">
      {/* Title */}
      <div className="text-center space-y-3">
        <h1 className="text-xl font-bold tracking-wide uppercase text-gray-900" style={{ letterSpacing: "0.15em" }}>
          Section 106 Agreement
        </h1>
        <p className="text-sm text-gray-600 italic">
          Town and Country Planning Act 1990 (as amended)
        </p>
      </div>

      {/* Date */}
      <p className="text-center text-sm text-gray-700">
        <span className="uppercase tracking-wider font-semibold text-gray-500 text-xs">Dated</span>
        <br />
        {formatLegalDate(date)}
      </p>

      {/* Parties */}
      <div className="space-y-4">
        <p className="text-center text-sm font-semibold uppercase tracking-wider text-gray-500">Between</p>

        <div className="space-y-4 text-sm">
          <div className="pl-6">
            <p><span className="font-semibold">(1)</span> <span className="font-semibold uppercase">{lpaName}</span> {`("the Council")`}</p>
            <p className="pl-6 text-gray-600">of {lpaAddress}</p>
          </div>
          <div className="pl-6">
            <p><span className="font-semibold">(2)</span> <span className="font-semibold uppercase">{developerName}</span> {`("the Developer")`}</p>
            <p className="pl-6 text-gray-600">of {developerAddress}</p>
          </div>
          <div className="pl-6">
            <p><span className="font-semibold">(3)</span> <span className="font-semibold uppercase">{landownerName}</span> {`("the Landowner")`}</p>
            <p className="pl-6 text-gray-600">of {landownerAddress}</p>
          </div>
        </div>
      </div>

      {/* Relating to */}
      <div className="space-y-2 text-sm">
        <p className="font-semibold uppercase tracking-wider text-gray-500 text-xs">Relating To</p>
        <p>Planning Application Reference: <span className="font-semibold">{planningRef}</span></p>
        <p>Land at: <span className="font-semibold">{siteName}</span>, {siteAddress}</p>
      </div>

      <DocDivider />

      {/* Recitals */}
      <div className="space-y-4">
        <h2 className="text-base font-bold uppercase tracking-wider text-gray-800">Recitals</h2>

        <div className="space-y-4 text-sm">
          <p className="pl-6">
            <span className="font-semibold -ml-6 inline-block w-6">A.</span>
            The Developer has submitted planning application <span className="font-semibold">{planningRef}</span> for{" "}
            {dealTitle} (&quot;the Development&quot;).
          </p>

          {isBNG ? (
            <p className="pl-6">
              <span className="font-semibold -ml-6 inline-block w-6">B.</span>
              The Development is required to achieve a minimum 10% biodiversity net gain in accordance
              with the Environment Act 2021 and Schedule 7A of the Town and Country Planning Act 1990.
            </p>
          ) : (
            <p className="pl-6">
              <span className="font-semibold -ml-6 inline-block w-6">B.</span>
              The Development is located within the {catchment} catchment area and is required to achieve
              nutrient neutrality in accordance with Natural England&apos;s advice and the Conservation of
              Habitats and Species Regulations 2017.
            </p>
          )}

          <p className="pl-6">
            <span className="font-semibold -ml-6 inline-block w-6">C.</span>
            The Landowner is the freehold owner of land at {siteName}, {siteAddress} (&quot;the Gain Site&quot;)
            which is {registeredStatus} on the {isBNG ? "Biodiversity Gain Site Register" : "nutrient mitigation register"} under
            reference <span className="font-semibold">{gainSiteRef}</span>.
          </p>

          <p className="pl-6">
            <span className="font-semibold -ml-6 inline-block w-6">D.</span>
            The parties have agreed that the Developer shall secure{" "}
            <span className="font-semibold">{unitsLabel}</span> from the Gain Site to satisfy
            the {isBNG ? "biodiversity net gain obligation" : "nutrient neutrality requirement"} for the Development.
          </p>
        </div>
      </div>

      <DocDivider />

      {/* Operative Provisions */}
      <div className="space-y-6">
        <h2 className="text-base font-bold uppercase tracking-wider text-gray-800">Operative Provisions</h2>

        {/* 1. Definitions */}
        <div className="space-y-3 text-sm">
          <h3 className="font-bold text-gray-800">1. DEFINITIONS AND INTERPRETATION</h3>
          <p className="pl-6">1.1 In this Agreement:</p>
          <div className="pl-12 space-y-2 text-gray-700">
            {isBNG ? (
              <p>&quot;Biodiversity Units&quot; means {unitsLabel} calculated in accordance with the {metricVersion ?? "Statutory Biodiversity Metric"};</p>
            ) : (
              <p>&quot;Nitrogen Credits&quot; means {unitsLabel} of nutrient mitigation capacity calculated in accordance with Natural England&apos;s nutrient budget methodology;</p>
            )}
            <p>&quot;Commencement Date&quot; means the date of this Agreement;</p>
            <p>&quot;Completion Date&quot; means the date on which all {isBNG ? "Biodiversity Units have" : "Nitrogen Credits have"} been allocated and registered;</p>
            <p>&quot;Gain Site&quot; means the land at {siteName} shown edged red on Plan 1 annexed hereto;</p>
            <p>&quot;HMMP&quot; means the Habitat Management and Monitoring Plan approved by {isBNG ? "Natural England" : lpaName} dated {registeredDate ?? "[date]"};</p>
            <p>&quot;Monitoring Period&quot; means {monitoringPeriod} years from the Commencement Date;</p>
            <p>&quot;Credit Payment&quot; means the sum of {formatCurrency(totalValue)} payable by the Developer to the Landowner;</p>
          </div>
        </div>

        {/* 2. Developer Obligations */}
        <div className="space-y-3 text-sm">
          <h3 className="font-bold text-gray-800">2. DEVELOPER&apos;S OBLIGATIONS</h3>
          <p className="pl-6">
            2.1 The Developer shall pay to the Landowner (through the Broker) the sum of{" "}
            <span className="font-semibold">{formatCurrency(totalValue)}</span> (&quot;the Credit Payment&quot;) in
            accordance with the payment schedule at Schedule 1.
          </p>
          <p className="pl-6">
            2.2 The Developer shall not Commence Development until such time as:
          </p>
          <div className="pl-12 space-y-1">
            <p>(a) the Credit Payment (or the first instalment thereof) has been made in full; and</p>
            <p>(b) the {isBNG ? "Biodiversity Units have" : "Nitrogen Credits have"} been allocated on the {isBNG ? "Gain Site Register" : "mitigation register"} against the Development.</p>
          </div>
        </div>

        {/* 3. Landowner Obligations */}
        <div className="space-y-3 text-sm">
          <h3 className="font-bold text-gray-800">3. LANDOWNER&apos;S OBLIGATIONS</h3>
          <p className="pl-6">3.1 The Landowner shall:</p>
          <div className="pl-12 space-y-1">
            <p>(a) maintain the Gain Site in accordance with the HMMP for the duration of the Monitoring Period;</p>
            <p>(b) permit access to the Gain Site for monitoring purposes no fewer than 2 times per calendar year;</p>
            <p>(c) not carry out any works on the Gain Site that would diminish the {isBNG ? "biodiversity value of the habitats created" : "nutrient mitigation capacity of the land"};</p>
            <p>(d) provide annual monitoring reports to the Council within 3 months of each anniversary of the Commencement Date.</p>
          </div>
        </div>

        {/* 4. Payment Schedule */}
        <div className="space-y-3 text-sm">
          <h3 className="font-bold text-gray-800">4. PAYMENT SCHEDULE</h3>
          <p className="pl-6">4.1 The Credit Payment shall be made as follows:</p>
          <div className="pl-12 space-y-2">
            {paymentTerms === "lump-sum" && (
              <p>
                The full sum of <span className="font-semibold">{formatCurrency(totalValue)}</span> (plus VAT if applicable) within
                14 days of the date of this Agreement.
              </p>
            )}
            {paymentTerms === "staged-50-50" && (
              <>
                <p>(a) 50% of the Credit Payment (<span className="font-semibold">{formatCurrency(totalValue * 0.5)}</span>) upon execution of this Agreement;</p>
                <p>(b) 50% of the Credit Payment (<span className="font-semibold">{formatCurrency(totalValue * 0.5)}</span>) upon confirmation of allocation on the {isBNG ? "Gain Site Register" : "mitigation register"}.</p>
              </>
            )}
            {paymentTerms === "staged-3-instalments" && (
              <>
                <p>(a) One-third of the Credit Payment (<span className="font-semibold">{formatCurrency(Math.round(totalValue / 3))}</span>) upon execution of this Agreement;</p>
                <p>(b) One-third of the Credit Payment (<span className="font-semibold">{formatCurrency(Math.round(totalValue / 3))}</span>) upon confirmation of allocation on the {isBNG ? "Gain Site Register" : "mitigation register"};</p>
                <p>(c) One-third of the Credit Payment (<span className="font-semibold">{formatCurrency(totalValue - 2 * Math.round(totalValue / 3))}</span>) upon issuance of the LPA confirmation letter.</p>
              </>
            )}
          </div>
        </div>

        {/* 5. Registration */}
        <div className="space-y-3 text-sm">
          <h3 className="font-bold text-gray-800">5. REGISTRATION AND ALLOCATION</h3>
          <p className="pl-6">
            5.1 Within 28 days of receipt of the Credit Payment (or the first instalment), the Landowner
            shall procure the allocation of <span className="font-semibold">{unitsLabel}</span> from the Gain Site
            against planning application <span className="font-semibold">{planningRef}</span> on
            the {isBNG ? "Gain Site Register" : "nutrient mitigation register"}.
          </p>
        </div>

        {/* 6. Monitoring */}
        <div className="space-y-3 text-sm">
          <h3 className="font-bold text-gray-800">6. MONITORING AND COMPLIANCE</h3>
          <p className="pl-6">
            6.1 The Landowner shall appoint <span className="font-semibold">{managementCompany}</span> as
            the Habitat Management Body for the Monitoring Period.
          </p>
          <p className="pl-6">
            6.2 Annual monitoring shall be carried out in accordance with the methodology set out in
            the HMMP.
          </p>
          <p className="pl-6">
            6.3 Monitoring reports shall be submitted to the Council and, where applicable, Natural England
            within 3 months of each monitoring visit.
          </p>
        </div>

        {/* 7. Default */}
        <div className="space-y-3 text-sm">
          <h3 className="font-bold text-gray-800">7. DEFAULT AND REMEDIES</h3>
          <p className="pl-6">
            7.1 In the event that the Landowner fails to maintain the Gain Site in accordance with
            the HMMP, the Council may:
          </p>
          <div className="pl-12 space-y-1">
            <p>(a) serve notice requiring remedial action within 90 days;</p>
            <p>(b) carry out remedial works and recover reasonable costs from the Landowner.</p>
          </div>
          <p className="pl-6">
            7.2 In the event that the Developer fails to make the Credit Payment in accordance with
            Schedule 1, the Landowner may terminate this Agreement by giving 28 days&apos; written notice.
          </p>
        </div>

        {/* 8. Duration */}
        <div className="space-y-3 text-sm">
          <h3 className="font-bold text-gray-800">8. DURATION</h3>
          <p className="pl-6">
            8.1 This Agreement shall remain in force for the Monitoring Period of{" "}
            <span className="font-semibold">{monitoringPeriod} years</span> from the Commencement Date.
          </p>
          <p className="pl-6">
            8.2 The obligations contained herein shall be binding on successors in title to the
            Landowner and any person deriving title from or under them.
          </p>
        </div>
      </div>

      <DocDivider />

      {/* Schedules */}
      <div className="space-y-6">
        {/* Schedule 1 */}
        <div className="space-y-3 text-sm">
          <h3 className="font-bold text-gray-800 uppercase">Schedule 1: Payment Details</h3>
          <div className="border border-gray-300 rounded overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left p-3 font-semibold text-gray-700 border-b border-gray-300">Instalment</th>
                  <th className="text-left p-3 font-semibold text-gray-700 border-b border-gray-300">Trigger Event</th>
                  <th className="text-right p-3 font-semibold text-gray-700 border-b border-gray-300">Amount</th>
                </tr>
              </thead>
              <tbody>
                {paymentTerms === "lump-sum" && (
                  <tr>
                    <td className="p-3 border-b border-gray-200">Full payment</td>
                    <td className="p-3 border-b border-gray-200">Within 14 days of execution</td>
                    <td className="p-3 border-b border-gray-200 text-right font-semibold">{formatCurrency(totalValue)}</td>
                  </tr>
                )}
                {paymentTerms === "staged-50-50" && (
                  <>
                    <tr>
                      <td className="p-3 border-b border-gray-200">1st instalment (50%)</td>
                      <td className="p-3 border-b border-gray-200">Upon execution of Agreement</td>
                      <td className="p-3 border-b border-gray-200 text-right font-semibold">{formatCurrency(totalValue * 0.5)}</td>
                    </tr>
                    <tr>
                      <td className="p-3 border-b border-gray-200">2nd instalment (50%)</td>
                      <td className="p-3 border-b border-gray-200">Upon confirmation of allocation</td>
                      <td className="p-3 border-b border-gray-200 text-right font-semibold">{formatCurrency(totalValue * 0.5)}</td>
                    </tr>
                  </>
                )}
                {paymentTerms === "staged-3-instalments" && (
                  <>
                    <tr>
                      <td className="p-3 border-b border-gray-200">1st instalment (33.3%)</td>
                      <td className="p-3 border-b border-gray-200">Upon execution of Agreement</td>
                      <td className="p-3 border-b border-gray-200 text-right font-semibold">{formatCurrency(Math.round(totalValue / 3))}</td>
                    </tr>
                    <tr>
                      <td className="p-3 border-b border-gray-200">2nd instalment (33.3%)</td>
                      <td className="p-3 border-b border-gray-200">Upon confirmation of allocation</td>
                      <td className="p-3 border-b border-gray-200 text-right font-semibold">{formatCurrency(Math.round(totalValue / 3))}</td>
                    </tr>
                    <tr>
                      <td className="p-3 border-b border-gray-200">3rd instalment (33.4%)</td>
                      <td className="p-3 border-b border-gray-200">Upon LPA confirmation letter</td>
                      <td className="p-3 border-b border-gray-200 text-right font-semibold">{formatCurrency(totalValue - 2 * Math.round(totalValue / 3))}</td>
                    </tr>
                  </>
                )}
                <tr className="bg-gray-50">
                  <td className="p-3 font-bold" colSpan={2}>Total</td>
                  <td className="p-3 text-right font-bold">{formatCurrency(totalValue)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Schedule 2 */}
        <div className="space-y-3 text-sm">
          <h3 className="font-bold text-gray-800 uppercase">Schedule 2: {isBNG ? "Biodiversity Units" : "Nutrient Credits"}</h3>
          <div className="border border-gray-300 rounded overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left p-3 font-semibold text-gray-700 border-b border-gray-300">Credit Type</th>
                  <th className="text-right p-3 font-semibold text-gray-700 border-b border-gray-300">Quantity</th>
                  <th className="text-right p-3 font-semibold text-gray-700 border-b border-gray-300">Unit Price</th>
                  <th className="text-right p-3 font-semibold text-gray-700 border-b border-gray-300">Value</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="p-3 border-b border-gray-200">{isNitrogen ? "Nitrogen mitigation credits" : "Biodiversity habitat units"}</td>
                  <td className="p-3 border-b border-gray-200 text-right">{unitsLabel}</td>
                  <td className="p-3 border-b border-gray-200 text-right">{formatCurrency(unitPrice)}</td>
                  <td className="p-3 border-b border-gray-200 text-right font-semibold">{formatCurrency(totalValue)}</td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="p-3 font-bold" colSpan={3}>Total</td>
                  <td className="p-3 text-right font-bold">{formatCurrency(totalValue)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Schedule 3 */}
        <div className="space-y-3 text-sm">
          <h3 className="font-bold text-gray-800 uppercase">Schedule 3: Plan</h3>
          <div className="border border-gray-300 rounded p-6 bg-gray-50 text-center text-gray-500 italic">
            <MapPin className="h-8 w-8 mx-auto mb-2 text-gray-400" />
            <p>Site boundary plan for {siteName}</p>
            <p className="text-xs mt-1">({siteAddress})</p>
            <p className="text-xs mt-1">Gain Site Register Reference: {gainSiteRef}</p>
            <p className="text-xs mt-2 text-gray-400">[Plan to be annexed]</p>
          </div>
        </div>
      </div>

      <DocDivider />

      {/* Execution */}
      <div className="space-y-8 text-sm">
        <p className="text-center text-gray-600 italic">
          EXECUTED as a deed on the date first written above.
        </p>

        <div className="space-y-10">
          <SignatureBlock
            label={`SIGNED by ${developerName}`}
            capacity="Developer"
          />
          <SignatureBlock
            label={`SIGNED by ${landownerName}`}
            capacity="Landowner"
          />
          <SignatureBlock
            label={`For and on behalf of ${lpaName}`}
            capacity="Authorised signatory"
          />
        </div>
      </div>
    </div>
  )
}


// ==========================================================================
// Conservation Covenant Document
// ==========================================================================

function ConservationCovenantDocument({
  date,
  landownerName,
  landownerAddress,
  responsibleBody,
  siteName,
  siteAddress,
  gainSiteRef,
  monitoringPeriod,
  managementCompany,
  areaHectares,
  creditType,
  creditQuantity,
  unitsLabel,
  metricVersion,
}: {
  date: Date
  landownerName: string
  landownerAddress: string
  responsibleBody: string
  siteName: string
  siteAddress: string
  gainSiteRef: string
  monitoringPeriod: string
  managementCompany: string
  areaHectares: number
  creditType: string
  creditQuantity: number
  unitsLabel: string
  metricVersion?: string
}) {
  const isBNG = creditType === "BNG"

  return (
    <div className="space-y-8">
      {/* Title */}
      <div className="text-center space-y-3">
        <h1 className="text-xl font-bold tracking-wide uppercase text-gray-900" style={{ letterSpacing: "0.15em" }}>
          Conservation Covenant
        </h1>
        <p className="text-sm text-gray-600 italic">
          Environment Act 2021, Part 7
        </p>
      </div>

      {/* Date */}
      <p className="text-center text-sm text-gray-700">
        <span className="uppercase tracking-wider font-semibold text-gray-500 text-xs">Dated</span>
        <br />
        {formatLegalDate(date)}
      </p>

      {/* Parties */}
      <div className="space-y-4">
        <p className="text-center text-sm font-semibold uppercase tracking-wider text-gray-500">Between</p>

        <div className="space-y-4 text-sm">
          <div className="pl-6">
            <p><span className="font-semibold">(1)</span> <span className="font-semibold uppercase">{landownerName}</span> {`("the Landowner")`}</p>
            <p className="pl-6 text-gray-600">of {landownerAddress}</p>
          </div>
          <div className="pl-6">
            <p><span className="font-semibold">(2)</span> <span className="font-semibold uppercase">{responsibleBody}</span> {`("the Responsible Body")`}</p>
            <p className="pl-6 text-gray-600">acting as a responsible body designated under section 127 of the Environment Act 2021</p>
          </div>
        </div>
      </div>

      {/* Relating to */}
      <div className="space-y-2 text-sm">
        <p className="font-semibold uppercase tracking-wider text-gray-500 text-xs">In Respect Of</p>
        <p>Land at: <span className="font-semibold">{siteName}</span>, {siteAddress}</p>
        <p>Title Number: [HM Land Registry title number]</p>
        <p>Area: approximately <span className="font-semibold">{areaHectares} hectares</span></p>
      </div>

      <DocDivider />

      {/* Recitals */}
      <div className="space-y-4">
        <h2 className="text-base font-bold uppercase tracking-wider text-gray-800">Recitals</h2>

        <div className="space-y-4 text-sm">
          <p className="pl-6">
            <span className="font-semibold -ml-6 inline-block w-6">A.</span>
            The Landowner is the freehold owner of land at {siteName}, {siteAddress} (&quot;the Land&quot;).
          </p>
          <p className="pl-6">
            <span className="font-semibold -ml-6 inline-block w-6">B.</span>
            The Land {gainSiteRef !== "Pending" ? "is" : "is to be"} registered on the Biodiversity Gain Site
            Register under reference <span className="font-semibold">{gainSiteRef}</span> and will provide
            off-site {isBNG ? "biodiversity units" : "nutrient mitigation credits"} for the purposes of
            the Environment Act 2021.
          </p>
          <p className="pl-6">
            <span className="font-semibold -ml-6 inline-block w-6">C.</span>
            The Responsible Body has agreed to enter into this conservation covenant to secure the
            long-term conservation and management of the Land for a minimum period
            of {monitoringPeriod} years.
          </p>
          <p className="pl-6">
            <span className="font-semibold -ml-6 inline-block w-6">D.</span>
            This covenant is made pursuant to sections 117&ndash;128 of the Environment Act 2021 and
            is intended to have effect as a conservation covenant within the meaning of that Act.
          </p>
        </div>
      </div>

      <DocDivider />

      {/* Operative Provisions */}
      <div className="space-y-6">
        <h2 className="text-base font-bold uppercase tracking-wider text-gray-800">Operative Provisions</h2>

        {/* 1. Definitions */}
        <div className="space-y-3 text-sm">
          <h3 className="font-bold text-gray-800">1. DEFINITIONS</h3>
          <div className="pl-12 space-y-2 text-gray-700">
            <p>&quot;Conservation Objectives&quot; means the habitat creation, enhancement and management objectives set out in Schedule 1;</p>
            <p>&quot;HMMP&quot; means the Habitat Management and Monitoring Plan annexed at Schedule 2;</p>
            <p>&quot;Monitoring Period&quot; means {monitoringPeriod} years from the date of this Covenant;</p>
            <p>&quot;Habitat Management Body&quot; means {managementCompany} or such other body as may be appointed with the prior written consent of the Responsible Body;</p>
            {isBNG && (
              <p>&quot;Biodiversity Units&quot; means {unitsLabel} as calculated under the {metricVersion ?? "Statutory Biodiversity Metric"};</p>
            )}
          </div>
        </div>

        {/* 2. Landowner Obligations */}
        <div className="space-y-3 text-sm">
          <h3 className="font-bold text-gray-800">2. LANDOWNER&apos;S OBLIGATIONS</h3>
          <p className="pl-6">2.1 The Landowner covenants with the Responsible Body to:</p>
          <div className="pl-12 space-y-1">
            <p>(a) manage and maintain the Land in accordance with the HMMP for the duration of the Monitoring Period;</p>
            <p>(b) carry out all habitat creation works specified in the HMMP within the timescales set out therein;</p>
            <p>(c) appoint and maintain the Habitat Management Body for the duration of the Monitoring Period;</p>
            <p>(d) permit access to the Land by the Responsible Body or its agents for inspection and monitoring purposes upon reasonable notice;</p>
            <p>(e) not carry out, cause or permit any activity on the Land that would be inconsistent with the Conservation Objectives;</p>
            <p>(f) provide annual monitoring reports to the Responsible Body in accordance with Schedule 2.</p>
          </div>
        </div>

        {/* 3. Restrictions */}
        <div className="space-y-3 text-sm">
          <h3 className="font-bold text-gray-800">3. RESTRICTIONS ON THE LAND</h3>
          <p className="pl-6">3.1 The Landowner shall not without the prior written consent of the Responsible Body:</p>
          <div className="pl-12 space-y-1">
            <p>(a) carry out any development (within the meaning of section 55 of the Town and Country Planning Act 1990) on the Land;</p>
            <p>(b) apply any fertilisers, pesticides or herbicides to the Land except as specified in the HMMP;</p>
            <p>(c) alter the drainage or hydrology of the Land;</p>
            <p>(d) introduce any non-native species to the Land;</p>
            <p>(e) grant any lease, licence or other interest in the Land that would be inconsistent with this Covenant.</p>
          </div>
        </div>

        {/* 4. Responsible Body Rights */}
        <div className="space-y-3 text-sm">
          <h3 className="font-bold text-gray-800">4. RESPONSIBLE BODY&apos;S RIGHTS</h3>
          <p className="pl-6">
            4.1 The Responsible Body shall have the right to enter the Land upon giving not less than
            7 days&apos; written notice for the purposes of inspecting compliance with this Covenant.
          </p>
          <p className="pl-6">
            4.2 In the event of a breach of this Covenant, the Responsible Body may exercise such
            remedies as are available under sections 124&ndash;126 of the Environment Act 2021.
          </p>
        </div>

        {/* 5. Duration */}
        <div className="space-y-3 text-sm">
          <h3 className="font-bold text-gray-800">5. DURATION AND MODIFICATION</h3>
          <p className="pl-6">
            5.1 This Covenant shall have effect for the Monitoring Period
            of <span className="font-semibold">{monitoringPeriod} years</span> from the date hereof.
          </p>
          <p className="pl-6">
            5.2 This Covenant may only be modified or discharged in accordance with sections 125&ndash;126
            of the Environment Act 2021.
          </p>
          <p className="pl-6">
            5.3 This Covenant shall be registered as a local land charge and shall be binding on
            successors in title to the Landowner.
          </p>
        </div>
      </div>

      <DocDivider />

      {/* Schedules */}
      <div className="space-y-6 text-sm">
        <div className="space-y-3">
          <h3 className="font-bold text-gray-800 uppercase">Schedule 1: Conservation Objectives</h3>
          <div className="border border-gray-300 rounded p-4 bg-gray-50 text-gray-600 space-y-2">
            <p>The conservation objectives for the Land are:</p>
            <div className="pl-6 space-y-1">
              <p>1. Creation and establishment of {isBNG ? "biodiversity habitats yielding " + unitsLabel : "nutrient mitigation capacity of " + unitsLabel};</p>
              <p>2. Maintenance of habitat condition to achieve target condition scores as specified in the HMMP;</p>
              <p>3. Enhancement of ecological connectivity with surrounding habitats;</p>
              <p>4. Long-term monitoring and adaptive management for a period of {monitoringPeriod} years.</p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="font-bold text-gray-800 uppercase">Schedule 2: Habitat Management and Monitoring Plan</h3>
          <div className="border border-gray-300 rounded p-6 bg-gray-50 text-center text-gray-500 italic">
            <p>[HMMP to be annexed &mdash; see separate document]</p>
            <p className="text-xs mt-1">Reference: {gainSiteRef}</p>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="font-bold text-gray-800 uppercase">Schedule 3: Plan of the Land</h3>
          <div className="border border-gray-300 rounded p-6 bg-gray-50 text-center text-gray-500 italic">
            <MapPin className="h-8 w-8 mx-auto mb-2 text-gray-400" />
            <p>Site boundary plan for {siteName}</p>
            <p className="text-xs mt-1">({siteAddress})</p>
            <p className="text-xs mt-1">Approximate area: {areaHectares} hectares</p>
            <p className="text-xs mt-2 text-gray-400">[Plan to be annexed]</p>
          </div>
        </div>
      </div>

      <DocDivider />

      {/* Execution */}
      <div className="space-y-8 text-sm">
        <p className="text-center text-gray-600 italic">
          EXECUTED as a deed on the date first written above.
        </p>

        <div className="space-y-10">
          <SignatureBlock
            label={`SIGNED by ${landownerName}`}
            capacity="Landowner"
          />
          <SignatureBlock
            label={`For and on behalf of ${responsibleBody}`}
            capacity="Responsible Body — Authorised signatory"
          />
        </div>
      </div>
    </div>
  )
}


// ==========================================================================
// Heads of Terms Document
// ==========================================================================

function HeadsOfTermsDocument({
  date,
  developerName,
  developerAddress,
  landownerName,
  landownerAddress,
  lpaName,
  planningRef,
  dealTitle,
  dealId,
  siteName,
  siteAddress,
  creditType,
  creditQuantity,
  unitsLabel,
  unitPrice,
  totalValue,
  paymentTerms,
  monitoringPeriod,
  managementCompany,
  gainSiteRef,
  broker,
  catchment,
}: {
  date: Date
  developerName: string
  developerAddress: string
  landownerName: string
  landownerAddress: string
  lpaName: string
  planningRef: string
  dealTitle: string
  dealId: string
  siteName: string
  siteAddress: string
  creditType: string
  creditQuantity: number
  unitsLabel: string
  unitPrice: number
  totalValue: number
  paymentTerms: PaymentTerms
  monitoringPeriod: string
  managementCompany: string
  gainSiteRef: string
  broker: string
  catchment: string
}) {
  const isNitrogen = creditType === "Nitrogen"

  const paymentDesc =
    paymentTerms === "lump-sum"
      ? `Lump sum of ${formatCurrency(totalValue)} payable within 14 days of execution`
      : paymentTerms === "staged-50-50"
        ? `50% (${formatCurrency(totalValue * 0.5)}) on execution; 50% (${formatCurrency(totalValue * 0.5)}) on allocation confirmation`
        : `Three equal instalments of approximately ${formatCurrency(Math.round(totalValue / 3))}`

  return (
    <div className="space-y-8">
      {/* Title */}
      <div className="text-center space-y-3">
        <h1 className="text-xl font-bold tracking-wide uppercase text-gray-900" style={{ letterSpacing: "0.15em" }}>
          Heads of Terms
        </h1>
        <p className="text-sm font-semibold text-red-600 uppercase tracking-wider">
          Subject to Contract
        </p>
      </div>

      {/* Date and ref */}
      <div className="text-sm text-gray-600 text-center space-y-1">
        <p>Date: {formatDate(date)}</p>
        <p>Reference: {dealId}</p>
      </div>

      {/* Not legally binding notice */}
      <div className="border-2 border-gray-300 rounded p-4 bg-gray-50 text-sm text-gray-600 italic text-center">
        These Heads of Terms are not intended to be legally binding and are subject to the
        preparation and execution of formal legal agreements. Either party may withdraw at
        any time prior to exchange of contracts.
      </div>

      <DocDivider />

      {/* Terms */}
      <div className="space-y-5 text-sm">
        <h2 className="text-base font-bold text-gray-800">KEY TERMS</h2>

        <div className="space-y-4">
          <HoTItem number={1} title="Transaction">
            Purchase of {isNitrogen ? "nutrient neutrality credits (nitrogen)" : "biodiversity net gain units"} by
            the Developer from the Landowner via brokerage arrangement.
          </HoTItem>

          <HoTItem number={2} title="Buyer (Developer)">
            <span className="font-semibold">{developerName}</span>
            <br />
            <span className="text-gray-600">{developerAddress}</span>
          </HoTItem>

          <HoTItem number={3} title="Seller (Landowner)">
            <span className="font-semibold">{landownerName}</span>
            <br />
            <span className="text-gray-600">{landownerAddress}</span>
          </HoTItem>

          <HoTItem number={4} title="Broker">
            Ironheart Environmental (Broker: {broker})
          </HoTItem>

          <HoTItem number={5} title="Planning Application">
            Reference <span className="font-semibold">{planningRef}</span> submitted
            to {lpaName} in respect of {dealTitle}.
          </HoTItem>

          <HoTItem number={6} title="Gain Site">
            <span className="font-semibold">{siteName}</span>, {siteAddress}
            <br />
            Register Reference: {gainSiteRef}
          </HoTItem>

          <HoTItem number={7} title="Credits">
            <span className="font-semibold">{unitsLabel}</span> of{" "}
            {isNitrogen ? "nitrogen mitigation credits" : "biodiversity habitat units"}
            <br />
            Catchment: {catchment}
          </HoTItem>

          <HoTItem number={8} title="Price">
            <span className="font-semibold">{formatCurrency(unitPrice)}</span> per{" "}
            {isNitrogen ? "kg/yr" : "habitat unit"}
            <br />
            Total consideration: <span className="font-semibold">{formatCurrency(totalValue)}</span> (exclusive of VAT)
          </HoTItem>

          <HoTItem number={9} title="Payment Terms">
            {paymentDesc}
          </HoTItem>

          <HoTItem number={10} title="Brokerage Commission">
            Payable by the Landowner to Ironheart Environmental at the agreed rate, separate
            to this transaction.
          </HoTItem>

          <HoTItem number={11} title="Monitoring &amp; Management">
            The Landowner shall maintain the Gain Site for a period of{" "}
            <span className="font-semibold">{monitoringPeriod} years</span> through
            {" "}<span className="font-semibold">{managementCompany}</span>.
          </HoTItem>

          <HoTItem number={12} title="Conditions Precedent">
            <div className="space-y-1 mt-1">
              <p>(a) Satisfactory legal due diligence on the Gain Site;</p>
              <p>(b) {isNitrogen
                ? "Confirmation of nutrient credit calculations by Natural England"
                : "Confirmation of biodiversity metric calculations and registration on the Gain Site Register"
              };</p>
              <p>(c) Approval of the Habitat Management and Monitoring Plan;</p>
              <p>(d) Execution of a formal {isNitrogen ? "S106 Agreement" : "Conservation Covenant"}.</p>
            </div>
          </HoTItem>

          <HoTItem number={13} title="Target Completion">
            The parties shall use reasonable endeavours to complete the transaction within 60 days
            of these Heads of Terms being agreed.
          </HoTItem>

          <HoTItem number={14} title="Governing Law">
            English law. Any disputes to be referred to mediation in the first instance.
          </HoTItem>
        </div>
      </div>

      <DocDivider />

      {/* Acknowledgement */}
      <div className="space-y-8 text-sm">
        <p className="text-center text-gray-600 italic">
          Acknowledged and agreed (subject to contract):
        </p>

        <div className="space-y-10">
          <SignatureBlock
            label={`For and on behalf of ${developerName}`}
            capacity="Developer"
          />
          <SignatureBlock
            label={`For and on behalf of ${landownerName}`}
            capacity="Landowner"
          />
        </div>
      </div>
    </div>
  )
}


// ==========================================================================
// Shared sub-components
// ==========================================================================

function DocDivider() {
  return (
    <div className="py-2">
      <div className="border-t border-gray-300" />
    </div>
  )
}

function SignatureBlock({ label, capacity }: { label: string; capacity: string }) {
  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-8">
        <div className="space-y-1 flex-1 min-w-0">
          <p className="font-semibold text-sm text-gray-800">{label}</p>
          <p className="text-xs text-gray-500">{capacity}</p>
        </div>
        <div className="border-b border-gray-400 flex-1 min-w-[200px]" />
      </div>
      <div className="flex items-end justify-between gap-8">
        <p className="text-xs text-gray-500 flex-1 min-w-0">In the presence of:</p>
        <div className="border-b border-gray-400 flex-1 min-w-[200px]" />
      </div>
      <div className="flex items-end justify-between gap-8">
        <p className="text-xs text-gray-500 flex-1 min-w-0">Date:</p>
        <div className="border-b border-gray-400 flex-1 min-w-[200px]" />
      </div>
    </div>
  )
}

function HoTItem({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4">
      <span className="font-semibold text-gray-500 w-8 flex-shrink-0 text-right">{number}.</span>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-800 mb-1">{title}</p>
        <div className="text-gray-700">{children}</div>
      </div>
    </div>
  )
}
