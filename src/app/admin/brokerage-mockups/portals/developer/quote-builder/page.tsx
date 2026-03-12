"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import {
  Search,
  MapPin,
  Leaf,
  TreeDeciduous,
  Check,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Star,
  Shield,
  Clock,
  Building2,
  Phone,
  Mail,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Eye,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { sites } from "../../../_mock-data"
import type { Site, Catchment, LPA } from "../../../_mock-data"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type CreditType = "nitrogen" | "phosphorus" | "bng"
type BudgetRange = "any" | "under50" | "50to100" | "100to250" | "over250"

interface Requirement {
  planningRef: string
  lpa: LPA | ""
  creditType: CreditType
  quantity: number
  catchment: Catchment | ""
  targetDate: string
  budget: BudgetRange
}

interface ScoredSite extends Site {
  matchScore: number
  distanceKm: number
  estimatedTotal: number
  deliveryEstimate: string
  isPartial: boolean
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const LPA_OPTIONS: { value: LPA; label: string }[] = [
  { value: "Eastleigh", label: "Eastleigh Borough Council" },
  { value: "Fareham", label: "Fareham Borough Council" },
  { value: "Winchester", label: "Winchester City Council" },
  { value: "Test Valley", label: "Test Valley Borough Council" },
  { value: "New Forest", label: "New Forest District Council" },
]

const CATCHMENT_OPTIONS: { value: Catchment; label: string }[] = [
  { value: "Solent", label: "Solent" },
  { value: "Test Valley", label: "Test Valley" },
  { value: "Stour", label: "Stour" },
  { value: "Exe", label: "Exe" },
  { value: "Tees", label: "Tees" },
]

const LPA_CATCHMENT_MAP: Record<LPA, Catchment> = {
  Eastleigh: "Solent",
  Fareham: "Solent",
  Winchester: "Solent",
  "Test Valley": "Test Valley",
  "New Forest": "Solent",
}

const BUDGET_OPTIONS: { value: BudgetRange; label: string }[] = [
  { value: "any", label: "No preference" },
  { value: "under50", label: "Under \u00a350K" },
  { value: "50to100", label: "\u00a350K \u2013 \u00a3100K" },
  { value: "100to250", label: "\u00a3100K \u2013 \u00a3250K" },
  { value: "over250", label: "\u00a3250K+" },
]

const UNIT_LABELS: Record<CreditType, string> = {
  nitrogen: "kg N/yr",
  phosphorus: "kg P/yr",
  bng: "area HUs",
}

const CREDIT_TYPE_TO_UNIT: Record<CreditType, string> = {
  nitrogen: "Nitrogen",
  phosphorus: "Phosphorus",
  bng: "BNG",
}

// Simulated developer reference point (central Eastleigh) for distance calc
const DEVELOPER_LAT = 50.9667
const DEVELOPER_LNG = -1.3500

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function generalArea(site: Site): string {
  // Show general area, not exact address
  const lpaLabel = LPA_OPTIONS.find((o) => o.value === site.lpa)?.label ?? site.lpa
  return `${site.lpa}, Hampshire`
}

function computeMatches(requirement: Requirement): ScoredSite[] {
  const unitType = CREDIT_TYPE_TO_UNIT[requirement.creditType]
  const catchment = requirement.catchment

  const candidates = sites.filter(
    (s) =>
      s.unitType === unitType &&
      s.available > 0 &&
      (catchment === "" || s.catchment === catchment)
  )

  if (candidates.length === 0) return []

  const maxPrice = Math.max(...candidates.map((s) => s.price))

  const scored: ScoredSite[] = candidates.map((site) => {
    const distanceKm = haversineKm(DEVELOPER_LAT, DEVELOPER_LNG, site.lat, site.lng)
    const isPartial = site.available < requirement.quantity
    const isRegistered = !!site.registrationRef

    // Match score: availability (40), price competitiveness (30), registration (20), proximity (10)
    const availabilityScore =
      site.available >= requirement.quantity
        ? 40
        : (site.available / requirement.quantity) * 40
    const priceScore = maxPrice > 0 ? (1 - site.price / maxPrice) * 30 : 15
    const registrationScore = isRegistered ? 20 : 0
    const proximityScore = distanceKm < 15 ? 10 : distanceKm < 30 ? 5 : 0
    const matchScore = Math.round(availabilityScore + priceScore + registrationScore + proximityScore)

    const unitsToAllocate = Math.min(site.available, requirement.quantity)
    const estimatedTotal = unitsToAllocate * site.price

    const deliveryEstimate =
      site.status === "Active" || site.status === "Registered"
        ? "4\u20136 weeks"
        : "8\u201312 weeks"

    return {
      ...site,
      matchScore,
      distanceKm,
      estimatedTotal,
      deliveryEstimate,
      isPartial,
    }
  })

  scored.sort((a, b) => b.matchScore - a.matchScore)
  return scored
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function PortalHeader() {
  return (
    <header className="border-b border-slate-200 bg-white sticky top-0 z-30">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-600 to-teal-500 flex items-center justify-center">
            <Leaf className="w-4 h-4 text-white" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-lg font-bold text-slate-900 tracking-tight">Ironheart</span>
            <span className="text-sm font-medium text-slate-400">Developer Portal</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="hidden md:flex items-center gap-1">
          {[
            { label: "My Credits", active: false },
            { label: "Request Quote", active: true },
            { label: "Documents", active: false },
            { label: "Account", active: false },
          ].map((item) => (
            <button
              key={item.label}
              className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                item.active
                  ? "bg-emerald-50 text-emerald-700"
                  : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* User */}
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-slate-700">Rachel Morrison</p>
            <p className="text-xs text-slate-400">Taylor Wimpey</p>
          </div>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
            <span className="text-xs font-bold text-white">RM</span>
          </div>
        </div>
      </div>
    </header>
  )
}

function CreditTypeButton({
  value,
  label,
  icon,
  selected,
  onClick,
}: {
  value: CreditType
  label: string
  icon: React.ReactNode
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all text-left ${
        selected
          ? "border-emerald-500 bg-emerald-50 shadow-sm"
          : "border-slate-200 bg-white hover:border-slate-300"
      }`}
    >
      <div
        className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
          selected ? "bg-emerald-100" : "bg-slate-100"
        }`}
      >
        {icon}
      </div>
      <div>
        <p className={`text-sm font-semibold ${selected ? "text-emerald-800" : "text-slate-700"}`}>
          {label}
        </p>
      </div>
    </button>
  )
}

function TrustSignal({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-sm text-slate-600">
      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
      <span>{label}</span>
    </div>
  )
}

function OptionCard({
  site,
  rank,
  requirement,
  onRequestQuote,
}: {
  site: ScoredSite
  rank: number
  requirement: Requirement
  onRequestQuote: (site: ScoredSite) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const isBest = rank === 0
  const capacityPercent = Math.round(
    ((site.total - site.available) / site.total) * 100
  )
  const availablePercent = 100 - capacityPercent

  return (
    <Card className={`overflow-hidden transition-shadow ${isBest ? "ring-2 ring-emerald-400 shadow-md" : "shadow-sm"}`}>
      <CardContent className="p-0">
        {/* Top badge strip */}
        {isBest && (
          <div className="bg-gradient-to-r from-emerald-600 to-teal-500 px-5 py-2 flex items-center gap-2">
            <Star className="w-4 h-4 text-white fill-white" />
            <span className="text-sm font-semibold text-white">Best Match</span>
          </div>
        )}

        <div className="p-5 space-y-4">
          {/* Header row */}
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-bold text-slate-900">{site.name}</h3>
                <Badge
                  variant="outline"
                  className={`text-xs font-semibold ${
                    site.matchScore >= 90
                      ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                      : site.matchScore >= 70
                        ? "border-blue-300 bg-blue-50 text-blue-700"
                        : "border-slate-300 bg-slate-50 text-slate-600"
                  }`}
                >
                  {site.matchScore}% match
                </Badge>
                {site.isPartial && (
                  <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-700 text-xs font-semibold">
                    Partial
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-4 text-sm text-slate-500">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {generalArea(site)}
                </span>
                <span className="flex items-center gap-1">
                  <Leaf className="w-3.5 h-3.5" />
                  {site.catchment}
                </span>
                <span>{site.distanceKm.toFixed(1)} km away</span>
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-slate-400 font-medium mb-0.5">Available</p>
              <p className="text-sm font-bold text-slate-800">{site.availableLabel}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium mb-0.5">Price</p>
              <p className="text-sm font-bold text-slate-800">{site.priceLabel}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium mb-0.5">Estimated Total</p>
              <p className="text-sm font-bold text-slate-800">
                {formatCurrency(site.estimatedTotal)}
                <span className="text-xs font-normal text-slate-400 ml-1">+ VAT</span>
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium mb-0.5">Est. Delivery</p>
              <p className="text-sm font-bold text-slate-800 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                {site.deliveryEstimate}
              </p>
            </div>
          </div>

          {/* Capacity bar */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Site capacity</span>
              <span className="text-slate-500 font-medium">
                {availablePercent}% available
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-400 transition-all"
                style={{ width: `${availablePercent}%` }}
              />
            </div>
          </div>

          {/* Partial notice */}
          {site.isPartial && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
              <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-700">
                <span className="font-semibold">Partial:</span> {site.available} of{" "}
                {requirement.quantity} {UNIT_LABELS[requirement.creditType]} available — can be
                combined with another site
              </p>
            </div>
          )}

          {/* Trust signals */}
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {site.registrationRef && (
              <TrustSignal label="Registered with Natural England" />
            )}
            {site.legalAgreement && (
              <TrustSignal label={`${site.legalAgreement} agreement in place`} />
            )}
            {(site.status === "Active" || site.status === "Registered") && (
              <TrustSignal label="Annual monitoring confirmed" />
            )}
          </div>

          <Separator />

          {/* Expandable details */}
          {expanded && (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-slate-700">Site Details</h4>
                  {site.mitigationType && (
                    <div>
                      <p className="text-xs text-slate-400 mb-0.5">Mitigation Type</p>
                      <p className="text-sm text-slate-700">{site.mitigationType}</p>
                    </div>
                  )}
                  {site.registrationRef && (
                    <div>
                      <p className="text-xs text-slate-400 mb-0.5">Registration Reference</p>
                      <p className="text-sm font-mono text-slate-700">{site.registrationRef}</p>
                    </div>
                  )}
                  {site.commitmentYears && (
                    <div>
                      <p className="text-xs text-slate-400 mb-0.5">Commitment Period</p>
                      <p className="text-sm text-slate-700">{site.commitmentYears} years</p>
                    </div>
                  )}
                  {site.hmmpStatus && (
                    <div>
                      <p className="text-xs text-slate-400 mb-0.5">HMMP Status</p>
                      <Badge
                        variant="outline"
                        className={`text-xs ${
                          site.hmmpStatus === "approved"
                            ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                            : site.hmmpStatus === "submitted"
                              ? "border-blue-300 bg-blue-50 text-blue-700"
                              : "border-slate-300 bg-slate-50 text-slate-600"
                        }`}
                      >
                        {site.hmmpStatus.charAt(0).toUpperCase() + site.hmmpStatus.slice(1)}
                      </Badge>
                    </div>
                  )}
                </div>
                <div className="space-y-3">
                  {site.unitType === "BNG" && site.habitatSummary && (
                    <>
                      <h4 className="text-sm font-semibold text-slate-700">Habitat Types Available</h4>
                      {site.habitatSummary.map((h) => (
                        <div
                          key={h.category}
                          className="flex items-center justify-between text-sm border border-slate-100 rounded-lg px-3 py-2"
                        >
                          <span className="text-slate-600">{h.categoryLabel}</span>
                          <span className="font-semibold text-slate-800">
                            {h.improvementUnits.toFixed(1)} {h.sizeUnit === "ha" ? "area HUs" : "hedgerow HUs"}
                          </span>
                        </div>
                      ))}
                    </>
                  )}
                  {/* General area indicator */}
                  <div>
                    <h4 className="text-sm font-semibold text-slate-700 mb-2">Location</h4>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 flex items-center gap-3">
                      <MapPin className="w-5 h-5 text-emerald-500 shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-slate-700">{generalArea(site)}</p>
                        <p className="text-xs text-slate-400">
                          {site.catchment} catchment &middot; {site.distanceKm.toFixed(1)} km from
                          development site
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <Separator />
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors"
            >
              {expanded ? (
                <>
                  <ChevronUp className="w-4 h-4" />
                  Hide Details
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4" />
                  View Details
                </>
              )}
            </button>
            <div className="flex-1" />
            <Button
              onClick={() => onRequestQuote(site)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
            >
              Request Quote
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function DeveloperQuoteBuilderPage() {
  // Step tracking
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [submitted, setSubmitted] = useState(false)

  // Step 1: requirement form
  const [requirement, setRequirement] = useState<Requirement>({
    planningRef: "F/25/00198",
    lpa: "Eastleigh",
    creditType: "nitrogen",
    quantity: 30,
    catchment: "Solent",
    targetDate: "2026-06-15",
    budget: "any",
  })

  // Step 2: selected option for quoting
  const [selectedSite, setSelectedSite] = useState<ScoredSite | null>(null)

  // Step 3: quote form
  const [quoteNotes, setQuoteNotes] = useState("")
  const [quotePhone, setQuotePhone] = useState("")

  // Compute matches
  const matches = useMemo(() => {
    if (step < 2) return []
    return computeMatches(requirement)
  }, [step, requirement])

  // Auto-set catchment when LPA changes
  function handleLpaChange(lpa: LPA) {
    const catchment = LPA_CATCHMENT_MAP[lpa]
    setRequirement((r) => ({ ...r, lpa, catchment: catchment ?? r.catchment }))
  }

  function handleFindCredits() {
    if (!requirement.lpa || requirement.quantity <= 0) {
      toast.error("Please fill in the required fields")
      return
    }
    setStep(2)
    toast.success("Searching available credits...")
  }

  function handleRequestQuote(site: ScoredSite) {
    setSelectedSite(site)
    setStep(3)
  }

  function handleSubmitQuote() {
    setSubmitted(true)
    toast("Quote request QR-2026-0089 submitted \u2014 broker notification sent", {
      duration: 5000,
    })
  }

  function handleBackToResults() {
    setStep(2)
    setSelectedSite(null)
    setSubmitted(false)
  }

  function handleBackToRequirement() {
    setStep(1)
  }

  return (
    <div className="min-h-screen bg-slate-50/70">
      <PortalHeader />

      {/* Preview banner */}
      <div className="max-w-4xl mx-auto px-6 pt-6">
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-5 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Eye className="w-4 h-4 text-amber-600 shrink-0" />
            <p className="text-sm font-medium text-amber-800">
              Preview mode &mdash; Developer Quote Builder
            </p>
            <p className="text-sm text-amber-700 hidden sm:block">
              This portal allows developers to search and request quotes for environmental credits
            </p>
          </div>
          <Badge variant="outline" className="border-amber-400 bg-amber-100 text-amber-700 font-semibold whitespace-nowrap">
            Coming Q2 2026
          </Badge>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {/* Page title */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Request a Quote</h1>
          <p className="text-slate-500 mt-1">
            Find available environmental credits for your development and request a formal quotation.
          </p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2">
          {[
            { num: 1, label: "Your Requirement" },
            { num: 2, label: "Available Options" },
            { num: 3, label: "Quote Request" },
          ].map((s, i) => (
            <div key={s.num} className="flex items-center gap-2">
              {i > 0 && (
                <div
                  className={`w-8 h-px ${step >= s.num ? "bg-emerald-400" : "bg-slate-200"}`}
                />
              )}
              <div className="flex items-center gap-2">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                    step > s.num
                      ? "bg-emerald-500 text-white"
                      : step === s.num
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-200 text-slate-400"
                  }`}
                >
                  {step > s.num ? <Check className="w-3.5 h-3.5" /> : s.num}
                </div>
                <span
                  className={`text-sm font-medium hidden sm:inline ${
                    step >= s.num ? "text-slate-700" : "text-slate-400"
                  }`}
                >
                  {s.label}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* ─── Step 1: Your Requirement ─── */}
        {step === 1 && (
          <Card className="shadow-sm border-slate-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg text-slate-900">What credits do you need?</CardTitle>
              <p className="text-sm text-slate-500">
                Tell us about your development and we'll find matching credit options.
              </p>
            </CardHeader>
            <CardContent className="space-y-6 pt-4">
              {/* Planning ref + LPA */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label className="text-slate-700 font-medium">
                    Planning Application Reference
                  </Label>
                  <Input
                    value={requirement.planningRef}
                    onChange={(e) =>
                      setRequirement((r) => ({ ...r, planningRef: e.target.value }))
                    }
                    placeholder="e.g. F/25/00198"
                    className="bg-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-700 font-medium">Local Planning Authority</Label>
                  <Select
                    value={requirement.lpa}
                    onValueChange={(v) => handleLpaChange(v as LPA)}
                  >
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="Select LPA" />
                    </SelectTrigger>
                    <SelectContent>
                      {LPA_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              {/* Credit type */}
              <div className="space-y-3">
                <Label className="text-slate-700 font-medium">Credit Type</Label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <CreditTypeButton
                    value="bng"
                    label="BNG Habitat Units"
                    icon={<TreeDeciduous className="w-5 h-5 text-emerald-600" />}
                    selected={requirement.creditType === "bng"}
                    onClick={() => setRequirement((r) => ({ ...r, creditType: "bng" }))}
                  />
                  <CreditTypeButton
                    value="nitrogen"
                    label="Nutrient Neutrality (Nitrogen)"
                    icon={<Leaf className="w-5 h-5 text-teal-600" />}
                    selected={requirement.creditType === "nitrogen"}
                    onClick={() => setRequirement((r) => ({ ...r, creditType: "nitrogen" }))}
                  />
                  <CreditTypeButton
                    value="phosphorus"
                    label="Nutrient Neutrality (Phosphorus)"
                    icon={<Leaf className="w-5 h-5 text-blue-600" />}
                    selected={requirement.creditType === "phosphorus"}
                    onClick={() => setRequirement((r) => ({ ...r, creditType: "phosphorus" }))}
                  />
                </div>
              </div>

              {/* Quantity + catchment */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label className="text-slate-700 font-medium">Required Quantity</Label>
                  <div className="flex">
                    <Input
                      type="number"
                      min={1}
                      value={requirement.quantity}
                      onChange={(e) =>
                        setRequirement((r) => ({
                          ...r,
                          quantity: parseInt(e.target.value) || 0,
                        }))
                      }
                      className="rounded-r-none bg-white"
                    />
                    <div className="flex items-center px-3 border border-l-0 border-input rounded-r-md bg-slate-50 text-sm text-slate-500 whitespace-nowrap">
                      {UNIT_LABELS[requirement.creditType]}
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-700 font-medium">Preferred Catchment</Label>
                  <Select
                    value={requirement.catchment}
                    onValueChange={(v) =>
                      setRequirement((r) => ({ ...r, catchment: v as Catchment }))
                    }
                  >
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="Select catchment" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATCHMENT_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Target date + budget */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label className="text-slate-700 font-medium">Target Date</Label>
                  <Input
                    type="date"
                    value={requirement.targetDate}
                    onChange={(e) =>
                      setRequirement((r) => ({ ...r, targetDate: e.target.value }))
                    }
                    className="bg-white"
                  />
                  <p className="text-xs text-slate-400">When do you need credits by?</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-700 font-medium">
                    Budget Range <span className="text-slate-400 font-normal">(optional)</span>
                  </Label>
                  <Select
                    value={requirement.budget}
                    onValueChange={(v) =>
                      setRequirement((r) => ({ ...r, budget: v as BudgetRange }))
                    }
                  >
                    <SelectTrigger className="bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {BUDGET_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  onClick={handleFindCredits}
                  size="lg"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                >
                  <Search className="w-4 h-4 mr-2" />
                  Find Available Credits
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ─── Step 2: Available Options ─── */}
        {step === 2 && (
          <div className="space-y-6">
            {/* Back + summary */}
            <div className="flex items-center gap-4">
              <button
                onClick={handleBackToRequirement}
                className="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Edit Requirement
              </button>
              <Separator orientation="vertical" className="h-5" />
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Badge variant="outline" className="text-xs border-slate-300">
                  {requirement.planningRef}
                </Badge>
                <span>
                  {requirement.quantity} {UNIT_LABELS[requirement.creditType]}
                </span>
                <span>&middot;</span>
                <span>{requirement.catchment} catchment</span>
              </div>
            </div>

            {/* Results header */}
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Available credits matching your requirement
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                {matches.length} option{matches.length !== 1 ? "s" : ""} found
                {requirement.catchment ? ` in ${requirement.catchment} catchment` : ""}
              </p>
            </div>

            {/* Option cards */}
            {matches.length > 0 ? (
              <div className="space-y-4">
                {matches.map((site, i) => (
                  <OptionCard
                    key={site.ref}
                    site={site}
                    rank={i}
                    requirement={requirement}
                    onRequestQuote={handleRequestQuote}
                  />
                ))}
              </div>
            ) : (
              <Card className="shadow-sm border-slate-200">
                <CardContent className="py-12 text-center">
                  <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                    <Search className="w-6 h-6 text-slate-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-700 mb-1">
                    No matching credits found
                  </h3>
                  <p className="text-sm text-slate-500 max-w-md mx-auto">
                    We couldn't find any available credits matching your requirements. Try adjusting
                    your catchment or credit type, or contact a broker for assistance.
                  </p>
                  <Button
                    variant="outline"
                    onClick={handleBackToRequirement}
                    className="mt-4"
                  >
                    <ArrowLeft className="w-4 h-4 mr-1.5" />
                    Modify Search
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Can't find section */}
            <Card className="shadow-sm border-slate-200 bg-slate-50/50">
              <CardContent className="py-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-slate-800">
                      Can't find what you need?
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">
                      If none of these options meet your requirements, we can search our wider
                      network of gain sites or source new supply.
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        toast.success("Call request submitted \u2014 a broker will call within 1 hour")
                      }}
                      className="border-slate-300"
                    >
                      <Phone className="w-3.5 h-3.5 mr-1.5" />
                      Speak to a Broker
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        toast.success(
                          `Interest registered for ${requirement.quantity} ${UNIT_LABELS[requirement.creditType]} in ${requirement.catchment || "all"} catchment${requirement.catchment ? "" : "s"}`
                        )
                      }}
                      className="border-slate-300"
                    >
                      <Mail className="w-3.5 h-3.5 mr-1.5" />
                      Register Interest
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ─── Step 3: Quote Request ─── */}
        {step === 3 && !submitted && selectedSite && (
          <div className="space-y-6">
            {/* Back */}
            <button
              onClick={handleBackToResults}
              className="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Results
            </button>

            {/* Selected option summary */}
            <Card className="shadow-sm border-emerald-200 bg-emerald-50/30">
              <CardContent className="py-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                      <Leaf className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">{selectedSite.name}</p>
                      <p className="text-xs text-slate-500">
                        {generalArea(selectedSite)} &middot; {selectedSite.catchment} catchment
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-slate-900">
                      {formatCurrency(selectedSite.estimatedTotal)}
                    </p>
                    <p className="text-xs text-slate-500">
                      {Math.min(selectedSite.available, requirement.quantity)}{" "}
                      {UNIT_LABELS[requirement.creditType]} &middot;{" "}
                      {selectedSite.deliveryEstimate}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quote form */}
            <Card className="shadow-sm border-slate-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg text-slate-900">Submit Quote Request</CardTitle>
                <p className="text-sm text-slate-500">
                  Our broker team will prepare a formal quotation and contact you within 2 business
                  hours.
                </p>
              </CardHeader>
              <CardContent className="space-y-5 pt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label className="text-slate-700 font-medium">Your Name</Label>
                    <Input value="Rachel Morrison" readOnly className="bg-slate-50 text-slate-600" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-700 font-medium">Company</Label>
                    <Input value="Taylor Wimpey" readOnly className="bg-slate-50 text-slate-600" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label className="text-slate-700 font-medium">Email</Label>
                    <Input
                      value="rachel.morrison@taylorwimpey.co.uk"
                      readOnly
                      className="bg-slate-50 text-slate-600"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-700 font-medium">
                      Phone <span className="text-slate-400 font-normal">(optional)</span>
                    </Label>
                    <Input
                      value={quotePhone}
                      onChange={(e) => setQuotePhone(e.target.value)}
                      placeholder="e.g. 07700 900123"
                      className="bg-white"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-700 font-medium">
                    Additional Notes <span className="text-slate-400 font-normal">(optional)</span>
                  </Label>
                  <Textarea
                    value={quoteNotes}
                    onChange={(e) => setQuoteNotes(e.target.value)}
                    placeholder="Any specific requirements, timescales, or questions for the broker..."
                    rows={4}
                    className="bg-white resize-none"
                  />
                </div>

                {/* Summary */}
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-2">
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Quote Summary
                  </h4>
                  <div className="grid grid-cols-2 gap-y-1.5 text-sm">
                    <span className="text-slate-500">Planning Ref</span>
                    <span className="font-medium text-slate-700 font-mono text-xs">
                      {requirement.planningRef}
                    </span>
                    <span className="text-slate-500">Credit Type</span>
                    <span className="font-medium text-slate-700">
                      {CREDIT_TYPE_TO_UNIT[requirement.creditType]}
                    </span>
                    <span className="text-slate-500">Quantity</span>
                    <span className="font-medium text-slate-700">
                      {Math.min(selectedSite.available, requirement.quantity)}{" "}
                      {UNIT_LABELS[requirement.creditType]}
                    </span>
                    <span className="text-slate-500">Site</span>
                    <span className="font-medium text-slate-700">{selectedSite.name}</span>
                    <span className="text-slate-500">Estimated Cost</span>
                    <span className="font-bold text-slate-800">
                      {formatCurrency(selectedSite.estimatedTotal)}
                      <span className="font-normal text-slate-400 ml-1">+ VAT</span>
                    </span>
                  </div>
                </div>

                <div className="pt-2">
                  <Button
                    onClick={handleSubmitQuote}
                    size="lg"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm w-full sm:w-auto"
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    Submit Quote Request
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ─── Step 3: Success ─── */}
        {step === 3 && submitted && selectedSite && (
          <div className="space-y-6">
            <Card className="shadow-sm border-emerald-200">
              <CardContent className="py-12 text-center">
                <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-5">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 mb-2">
                  Quote request submitted!
                </h2>
                <p className="text-sm text-slate-500 max-w-lg mx-auto mb-4">
                  Reference:{" "}
                  <span className="font-mono font-semibold text-slate-700">QR-2026-0089</span>. A
                  broker will contact you within 2 business hours with a formal quotation.
                </p>

                <div className="inline-flex flex-col items-start text-left rounded-xl border border-slate-200 bg-slate-50 px-6 py-4 space-y-2 text-sm mb-6">
                  <div className="flex items-center gap-2 text-slate-500">
                    <Building2 className="w-4 h-4" />
                    <span>
                      {selectedSite.name} &middot;{" "}
                      {Math.min(selectedSite.available, requirement.quantity)}{" "}
                      {UNIT_LABELS[requirement.creditType]}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-500">
                    <Shield className="w-4 h-4" />
                    <span>Estimated: {formatCurrency(selectedSite.estimatedTotal)} + VAT</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-500">
                    <Clock className="w-4 h-4" />
                    <span>Estimated delivery: {selectedSite.deliveryEstimate}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-500">
                    <Mail className="w-4 h-4" />
                    <span>Confirmation sent to rachel.morrison@taylorwimpey.co.uk</span>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setStep(1)
                      setSubmitted(false)
                      setSelectedSite(null)
                      setQuoteNotes("")
                      setQuotePhone("")
                    }}
                    className="border-slate-300"
                  >
                    <ArrowLeft className="w-4 h-4 mr-1.5" />
                    New Quote
                  </Button>
                  <Button
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => toast("My Credits page \u2014 coming soon")}
                  >
                    View My Credits
                    <ExternalLink className="w-4 h-4 ml-1.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white mt-12">
        <div className="max-w-6xl mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Leaf className="w-4 h-4 text-emerald-500" />
            <span className="text-sm text-slate-400">
              Ironheart Developer Portal &middot; BNG &amp; Nutrient Credit Marketplace
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-400">
            <span>Support: 0800 123 4567</span>
            <span>&middot;</span>
            <span>developers@ironheart.co.uk</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
