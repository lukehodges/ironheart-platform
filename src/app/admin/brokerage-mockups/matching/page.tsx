"use client"

import { useState } from "react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  GitCompareArrows,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ChevronRight,
  ChevronLeft,
  Building2,
  Leaf,
  MapPin,
  PoundSterling,
  User,
  FileText,
  Handshake,
  ArrowUpDown,
  Sparkles,
  Package,
  TrendingDown,
  CircleDot,
  Search,
  LayoutPanelLeft,
  ListOrdered,
  Check,
  X,
  Info,
  Settings2,
} from "lucide-react"
import { sites, deals } from "../_mock-data"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type MatchTier = "best" | "good" | "partial"
type SortMode = "price" | "quantity" | "distance"

interface DemandDeal {
  id: string
  ref: string
  title: string
  developer: string
  unitType: string
  quantity: number
  catchment: string
  budget: number
  budgetPerKg: number
  planningRef: string
  stage: string
}

interface SupplyMatch {
  id: string
  ref: string
  siteName: string
  contact: string
  contactRole: string
  available: number
  unitPrice: number
  totalCost: number
  commission: number
  commissionRate: number
  catchment: string
  catchmentMatch: boolean
  tier: MatchTier
  chips: string[]
  lowStock?: boolean
  partialFill?: boolean
  partialNote?: string
  status: string
}

interface UnmatchedSupply {
  ref: string
  siteName: string
  available: number
  unit: string
  catchment: string
  reason: string
}

// ---------------------------------------------------------------------------
// Hardcoded Data
// ---------------------------------------------------------------------------

const DEMAND_DEALS: DemandDeal[] = [
  {
    id: "d-0042",
    ref: "D-0042",
    title: "Taylor Wimpey Hedge End",
    developer: "Taylor Wimpey",
    unitType: "Nitrogen Credit (kg/yr)",
    quantity: 30,
    catchment: "Solent",
    budget: 100000,
    budgetPerKg: 3333,
    planningRef: "F/24/95231",
    stage: "Matched",
  },
  {
    id: "d-0045",
    ref: "D-0045",
    title: "Persimmon North Whiteley",
    developer: "Persimmon Homes",
    unitType: "Nitrogen Credit (kg/yr)",
    quantity: 75,
    catchment: "Solent",
    budget: 225000,
    budgetPerKg: 3000,
    planningRef: "F/24/95587",
    stage: "Qualified",
  },
  {
    id: "d-0041",
    ref: "D-0041",
    title: "Bellway Whiteley Development",
    developer: "Bellway Homes",
    unitType: "Nitrogen Credit (kg/yr)",
    quantity: 55,
    catchment: "Solent",
    budget: 165000,
    budgetPerKg: 3000,
    planningRef: "F/24/94012",
    stage: "Quote Sent",
  },
]

const SUPPLY_MATCHES: Record<string, SupplyMatch[]> = {
  "d-0042": [
    {
      id: "s-0002",
      ref: "S-0002",
      siteName: "Botley Meadows",
      contact: "Margaret Thornton",
      contactRole: "Landowner",
      available: 85,
      unitPrice: 2500,
      totalCost: 75000,
      commission: 15000,
      commissionRate: 20,
      catchment: "Solent",
      catchmentMatch: true,
      tier: "best",
      chips: ["Lowest price"],
      status: "Active",
    },
    {
      id: "s-0005",
      ref: "S-0005",
      siteName: "Manor Fields",
      contact: "David Ashford",
      contactRole: "Landowner",
      available: 45,
      unitPrice: 3000,
      totalCost: 90000,
      commission: 18000,
      commissionRate: 20,
      catchment: "Solent",
      catchmentMatch: true,
      tier: "good",
      chips: [],
      status: "Active",
    },
    {
      id: "s-0001",
      ref: "S-0001",
      siteName: "Whiteley Farm",
      contact: "Robert Whiteley",
      contactRole: "Landowner",
      available: 15,
      unitPrice: 3200,
      totalCost: 48000,
      commission: 9600,
      commissionRate: 20,
      catchment: "Solent",
      catchmentMatch: true,
      tier: "partial",
      chips: ["Highest price"],
      lowStock: true,
      partialFill: true,
      partialNote: "Partial fill only: 15 of 30 kg needed",
      status: "Active",
    },
  ],
  "d-0045": [
    {
      id: "s-0002",
      ref: "S-0002",
      siteName: "Botley Meadows",
      contact: "Margaret Thornton",
      contactRole: "Landowner",
      available: 85,
      unitPrice: 2500,
      totalCost: 187500,
      commission: 37500,
      commissionRate: 20,
      catchment: "Solent",
      catchmentMatch: true,
      tier: "best",
      chips: ["Lowest price"],
      status: "Active",
    },
    {
      id: "s-0005",
      ref: "S-0005",
      siteName: "Manor Fields",
      contact: "David Ashford",
      contactRole: "Landowner",
      available: 45,
      unitPrice: 3000,
      totalCost: 135000,
      commission: 27000,
      commissionRate: 20,
      catchment: "Solent",
      catchmentMatch: true,
      tier: "partial",
      chips: [],
      partialFill: true,
      partialNote: "Partial fill only: 45 of 75 kg needed",
      status: "Active",
    },
    {
      id: "s-0001",
      ref: "S-0001",
      siteName: "Whiteley Farm",
      contact: "Robert Whiteley",
      contactRole: "Landowner",
      available: 15,
      unitPrice: 3200,
      totalCost: 48000,
      commission: 9600,
      commissionRate: 20,
      catchment: "Solent",
      catchmentMatch: true,
      tier: "partial",
      chips: ["Highest price"],
      lowStock: true,
      partialFill: true,
      partialNote: "Partial fill only: 15 of 75 kg needed",
      status: "Active",
    },
  ],
  "d-0041": [
    {
      id: "s-0002",
      ref: "S-0002",
      siteName: "Botley Meadows",
      contact: "Margaret Thornton",
      contactRole: "Landowner",
      available: 85,
      unitPrice: 2500,
      totalCost: 137500,
      commission: 27500,
      commissionRate: 20,
      catchment: "Solent",
      catchmentMatch: true,
      tier: "best",
      chips: ["Lowest price"],
      status: "Active",
    },
    {
      id: "s-0005",
      ref: "S-0005",
      siteName: "Manor Fields",
      contact: "David Ashford",
      contactRole: "Landowner",
      available: 45,
      unitPrice: 3000,
      totalCost: 135000,
      commission: 27000,
      commissionRate: 20,
      catchment: "Solent",
      catchmentMatch: true,
      tier: "partial",
      chips: [],
      partialFill: true,
      partialNote: "Partial fill only: 45 of 55 kg needed",
      status: "Active",
    },
    {
      id: "s-0001",
      ref: "S-0001",
      siteName: "Whiteley Farm",
      contact: "Robert Whiteley",
      contactRole: "Landowner",
      available: 15,
      unitPrice: 3200,
      totalCost: 48000,
      commission: 9600,
      commissionRate: 20,
      catchment: "Solent",
      catchmentMatch: true,
      tier: "partial",
      chips: ["Highest price"],
      lowStock: true,
      partialFill: true,
      partialNote: "Partial fill only: 15 of 55 kg needed",
      status: "Active",
    },
  ],
}

const UNMATCHED_SUPPLY: UnmatchedSupply[] = [
  {
    ref: "S-0006",
    siteName: "Test Valley Grassland",
    available: 150,
    unit: "kg N/yr",
    catchment: "Test Valley",
    reason: "No demand in Test Valley catchment",
  },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function tierConfig(tier: MatchTier) {
  switch (tier) {
    case "best":
      return {
        label: "Best Match",
        border: "border-emerald-300",
        bg: "bg-emerald-50/60",
        badge: "bg-emerald-100 text-emerald-800 border-emerald-200",
        ring: "ring-emerald-200",
        accent: "text-emerald-700",
        dot: "bg-emerald-500",
      }
    case "good":
      return {
        label: "Good Match",
        border: "border-border",
        bg: "bg-card",
        badge: "bg-blue-100 text-blue-800 border-blue-200",
        ring: "ring-blue-200",
        accent: "text-blue-700",
        dot: "bg-blue-500",
      }
    case "partial":
      return {
        label: "Partial Match",
        border: "border-amber-300",
        bg: "bg-amber-50/40",
        badge: "bg-amber-100 text-amber-800 border-amber-200",
        ring: "ring-amber-200",
        accent: "text-amber-700",
        dot: "bg-amber-500",
      }
  }
}

function sortMatches(matches: SupplyMatch[], sortBy: SortMode): SupplyMatch[] {
  const sorted = [...matches]
  switch (sortBy) {
    case "price":
      return sorted.sort((a, b) => a.unitPrice - b.unitPrice)
    case "quantity":
      return sorted.sort((a, b) => b.available - a.available)
    case "distance":
      // Mock distance sort — same as price for now
      return sorted.sort((a, b) => a.unitPrice - b.unitPrice)
    default:
      return sorted
  }
}

// ---------------------------------------------------------------------------
// V1 — Split Panel View
// ---------------------------------------------------------------------------

function SplitPanelView() {
  const [selectedDealId, setSelectedDealId] = useState<string>("d-0042")
  const [sortBy, setSortBy] = useState<SortMode>("price")

  const selectedDeal = DEMAND_DEALS.find((d) => d.id === selectedDealId) ?? DEMAND_DEALS[0]
  const matches = sortMatches(SUPPLY_MATCHES[selectedDealId] ?? [], sortBy)

  return (
    <div className="flex flex-1 overflow-hidden" style={{ height: "calc(100vh - 170px)" }}>
      {/* ---- Left Panel: Demand Selector ---- */}
      <div className="w-[45%] shrink-0 border-r border-border flex flex-col bg-background">
        {/* Panel header */}
        <div className="px-5 py-4 border-b border-border bg-card">
          <div className="flex items-center gap-2 mb-1">
            <Building2 className="h-4 w-4 text-blue-600" />
            <h2 className="text-sm font-bold text-foreground">Demand Requirements</h2>
          </div>
          <p className="text-xs text-muted-foreground">Select an open demand deal to find matching supply</p>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-3">
            {/* Demand deal selector */}
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                Select Demand Deal
              </label>
              <Select value={selectedDealId} onValueChange={setSelectedDealId}>
                <SelectTrigger className="bg-card">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DEMAND_DEALS.map((deal) => (
                    <SelectItem key={deal.id} value={deal.id}>
                      <span className="font-mono text-xs text-muted-foreground mr-1.5">{deal.ref}</span>
                      {deal.title} -- {deal.quantity} kg N/yr -- {deal.catchment}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* Selected deal details */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Building2 className="h-4 w-4 text-blue-700" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">{selectedDeal.developer}</p>
                  <p className="text-[11px] text-muted-foreground">Developer</p>
                </div>
                <Badge className="ml-auto bg-blue-100 text-blue-800 border-blue-200 text-[10px]">
                  Demand
                </Badge>
              </div>

              <Card className="bg-card border-border">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Deal Reference</span>
                    <Link href={`/admin/brokerage-mockups/deals/${selectedDeal.ref}`} className="font-mono text-sm font-bold text-primary hover:underline">{selectedDeal.ref}</Link>
                  </div>
                  <Separator />
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <Leaf className="h-3 w-3 text-emerald-600" />
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Unit Type</span>
                      </div>
                      <p className="text-xs font-medium text-foreground">{selectedDeal.unitType}</p>
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <Package className="h-3 w-3 text-muted-foreground" />
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Quantity</span>
                      </div>
                      <p className="text-sm font-bold text-foreground">{selectedDeal.quantity} kg/yr</p>
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <MapPin className="h-3 w-3 text-red-500" />
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Catchment</span>
                      </div>
                      <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[11px]">{selectedDeal.catchment}</Badge>
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <PoundSterling className="h-3 w-3 text-muted-foreground" />
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Max Budget</span>
                      </div>
                      <p className="text-sm font-bold text-foreground">{formatCurrency(selectedDeal.budget)}</p>
                      <p className="text-[10px] text-muted-foreground">{formatCurrency(selectedDeal.budgetPerKg)}/kg</p>
                    </div>
                  </div>
                  <Separator />
                  <div className="flex items-center gap-1.5">
                    <FileText className="h-3 w-3 text-muted-foreground" />
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Planning Ref</span>
                    <span className="ml-auto text-xs font-mono text-foreground">{selectedDeal.planningRef}</span>
                  </div>
                </CardContent>
              </Card>

              {/* OR: Manual entry mockup */}
              <div className="border border-dashed border-border rounded-xl p-4 bg-muted/50/50">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Or enter manually</p>
                <p className="text-[11px] text-muted-foreground">
                  Unit type, quantity, catchment, and budget fields for ad-hoc matching
                </p>
              </div>

              {/* Find Matches button */}
              <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" size="lg">
                <Search className="h-4 w-4" />
                Find Matches
              </Button>
            </div>
          </div>
        </ScrollArea>
      </div>

      {/* ---- Right Panel: Matching Results ---- */}
      <div className="flex-1 bg-card flex flex-col overflow-hidden">
        {/* Results header */}
        <div className="px-5 py-3 border-b border-border flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span className="text-sm font-bold text-foreground">
                {matches.length} matching site{matches.length !== 1 ? "s" : ""} found
              </span>
            </div>
            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px]">
              {selectedDeal.catchment} catchment
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground">Sort by:</span>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortMode)}>
              <SelectTrigger className="w-[150px] h-8 text-xs bg-card">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="price">
                  <span className="flex items-center gap-1.5">
                    <PoundSterling className="h-3 w-3" /> Price (lowest)
                  </span>
                </SelectItem>
                <SelectItem value="quantity">
                  <span className="flex items-center gap-1.5">
                    <ArrowUpDown className="h-3 w-3" /> Available Qty
                  </span>
                </SelectItem>
                <SelectItem value="distance">
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-3 w-3" /> Distance
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Match results */}
        <ScrollArea className="flex-1">
          <div className="p-5 space-y-4">
            {matches.map((match, index) => {
              const config = tierConfig(match.tier)
              return (
                <div
                  key={match.id}
                  className={`rounded-xl border-2 ${config.border} ${config.bg} overflow-hidden transition-all hover:shadow-md`}
                >
                  {/* Tier header */}
                  {match.tier === "best" && (
                    <div className="px-4 py-2 bg-emerald-100/80 border-b border-emerald-200 flex items-center gap-2">
                      <Sparkles className="h-3.5 w-3.5 text-emerald-700" />
                      <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Best Match</span>
                    </div>
                  )}

                  <div className="p-4">
                    {/* Site header row */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-start gap-3">
                        <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${
                          match.tier === "best" ? "bg-emerald-200" : match.tier === "good" ? "bg-blue-100" : "bg-amber-100"
                        }`}>
                          <Leaf className={`h-5 w-5 ${
                            match.tier === "best" ? "text-emerald-700" : match.tier === "good" ? "text-blue-700" : "text-amber-700"
                          }`} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <Link href={`/admin/brokerage-mockups/sites/${match.ref}`} className="text-sm font-bold text-foreground hover:text-emerald-700 transition-colors">{match.siteName}</Link>
                            <Link href={`/admin/brokerage-mockups/sites/${match.ref}`} className="font-mono text-[11px] text-muted-foreground hover:text-primary">{match.ref}</Link>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px]">Active</Badge>
                            {match.lowStock && (
                              <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-[10px]">
                                <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />
                                Low Stock
                              </Badge>
                            )}
                            {match.chips.map((chip) => (
                              <Badge key={chip} className={`text-[10px] ${
                                chip === "Lowest price"
                                  ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                                  : "bg-muted text-muted-foreground border-border"
                              }`}>
                                {chip}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Total Cost</p>
                        <p className="text-lg font-bold text-foreground">{formatCurrency(match.totalCost)}</p>
                      </div>
                    </div>

                    {/* Contact */}
                    <div className="flex items-center gap-2 mb-3 pb-3 border-b border-border/50">
                      <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center">
                        <User className="h-3 w-3 text-muted-foreground" />
                      </div>
                      <span className="text-xs font-medium text-foreground">{match.contact}</span>
                      <span className="text-[10px] text-muted-foreground">({match.contactRole})</span>
                    </div>

                    {/* Key metrics grid */}
                    <div className="grid grid-cols-4 gap-3 mb-3">
                      <div>
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">Available</p>
                        <p className={`text-sm font-bold ${
                          match.partialFill ? "text-amber-600" : "text-emerald-700"
                        }`}>
                          {match.available} kg/yr
                        </p>
                        {match.partialFill && (
                          <p className="text-[10px] text-amber-600 font-medium mt-0.5">{match.partialNote}</p>
                        )}
                        {!match.partialFill && (
                          <p className="text-[10px] text-emerald-600 mt-0.5">More than enough</p>
                        )}
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">Unit Price</p>
                        <p className="text-sm font-bold text-foreground">{formatCurrency(match.unitPrice)}/kg</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">Commission ({match.commissionRate}%)</p>
                        <p className="text-sm font-bold text-foreground">{formatCurrency(match.commission)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">Catchment</p>
                        <div className="flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                          <span className="text-xs font-medium text-emerald-700">{match.catchment}</span>
                        </div>
                      </div>
                    </div>

                    {/* Partial fill warning */}
                    {match.partialFill && (
                      <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg mb-3">
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                        <p className="text-[11px] text-amber-700 font-medium">
                          This site can only partially fulfil the demand. Additional supply sources needed.
                        </p>
                      </div>
                    )}

                    {/* Action */}
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="outline" size="sm" className="text-xs" asChild>
                        <Link href={`/admin/brokerage-mockups/sites/${match.ref}`}>View Site</Link>
                      </Button>
                      {match.tier === "best" ? (
                        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs" asChild>
                          <Link href="/admin/brokerage-mockups/deals/new">
                            <Handshake className="h-3.5 w-3.5" />
                            Create Deal
                          </Link>
                        </Button>
                      ) : match.partialFill ? (
                        <Button variant="outline" size="sm" className="text-xs border-amber-300 text-amber-700 hover:bg-amber-50" asChild>
                          <Link href="/admin/brokerage-mockups/deals/new">
                            <Handshake className="h-3.5 w-3.5" />
                            Create Deal (Partial)
                          </Link>
                        </Button>
                      ) : (
                        <Button variant="secondary" size="sm" className="text-xs" asChild>
                          <Link href="/admin/brokerage-mockups/deals/new">
                            <Handshake className="h-3.5 w-3.5" />
                            Create Deal
                          </Link>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}

            {/* Divider */}
            <div className="pt-2">
              <Separator />
            </div>

            {/* Unmatched Supply */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <TrendingDown className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold text-foreground">Unmatched Supply</h3>
                <span className="text-[11px] text-muted-foreground">Sites with credits but no matching demand</span>
              </div>
              {UNMATCHED_SUPPLY.map((uSite) => (
                <div
                  key={uSite.ref}
                  className="border border-border rounded-lg p-3 bg-muted/50 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
                      <Leaf className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <Link href={`/admin/brokerage-mockups/sites/${uSite.ref}`} className="text-xs font-bold text-foreground hover:text-emerald-700">{uSite.siteName}</Link>
                        <Link href={`/admin/brokerage-mockups/sites/${uSite.ref}`} className="font-mono text-[10px] text-muted-foreground hover:text-primary">{uSite.ref}</Link>
                      </div>
                      <p className="text-[11px] text-muted-foreground">{uSite.available} {uSite.unit} available</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-muted text-muted-foreground border-border text-[10px]">{uSite.catchment}</Badge>
                    <span className="text-[11px] text-muted-foreground italic">{uSite.reason}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// V2 — Wizard Steps View
// ---------------------------------------------------------------------------

function WizardView() {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [selectedDealId, setSelectedDealId] = useState<string>("d-0042")
  const [sortBy, setSortBy] = useState<SortMode>("price")

  const selectedDeal = DEMAND_DEALS.find((d) => d.id === selectedDealId) ?? DEMAND_DEALS[0]
  const matches = sortMatches(SUPPLY_MATCHES[selectedDealId] ?? [], sortBy)

  const steps = [
    { num: 1 as const, label: "Select Deal" },
    { num: 2 as const, label: "Review Requirements" },
    { num: 3 as const, label: "Ranked Matches" },
  ]

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Step indicator */}
      <div className="px-6 py-4 bg-card border-b border-border">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between">
            {steps.map((s, i) => (
              <div key={s.num} className="flex items-center gap-0">
                {/* Step circle */}
                <button
                  onClick={() => setStep(s.num)}
                  className={`flex items-center gap-2.5 group cursor-pointer ${
                    step === s.num ? "" : "opacity-70 hover:opacity-100"
                  }`}
                >
                  <div
                    className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      step === s.num
                        ? "bg-emerald-600 text-white shadow-md shadow-emerald-200"
                        : step > s.num
                        ? "bg-emerald-100 text-emerald-700 border-2 border-emerald-300"
                        : "bg-muted text-muted-foreground border-2 border-border"
                    }`}
                  >
                    {step > s.num ? <Check className="h-4 w-4" /> : s.num}
                  </div>
                  <span
                    className={`text-sm font-medium ${
                      step === s.num ? "text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {s.label}
                  </span>
                </button>
                {/* Connector line */}
                {i < steps.length - 1 && (
                  <div className="flex-1 mx-4">
                    <div
                      className={`h-0.5 w-full rounded-full transition-colors ${
                        step > s.num ? "bg-emerald-400" : "bg-muted"
                      }`}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Step content */}
      <ScrollArea className="flex-1 bg-background">
        <div className="max-w-3xl mx-auto px-6 py-6">
          {/* Step 1: Select Deal */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-bold text-foreground mb-1">Select a Demand Deal</h2>
                <p className="text-sm text-muted-foreground">Choose an open demand deal to find matching supply sites in the correct catchment area.</p>
              </div>

              <div className="space-y-3">
                {DEMAND_DEALS.map((deal) => (
                  <button
                    key={deal.id}
                    onClick={() => {
                      setSelectedDealId(deal.id)
                      setStep(2)
                    }}
                    className={`w-full text-left rounded-xl border-2 transition-all p-4 cursor-pointer ${
                      selectedDealId === deal.id
                        ? "border-emerald-300 bg-emerald-50/50 shadow-sm"
                        : "border-border bg-card hover:border-border hover:shadow-sm"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${
                          selectedDealId === deal.id ? "bg-emerald-200" : "bg-blue-100"
                        }`}>
                          <Building2 className={`h-5 w-5 ${
                            selectedDealId === deal.id ? "text-emerald-700" : "text-blue-700"
                          }`} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="font-mono text-xs text-muted-foreground">{deal.ref}</span>
                            <h3 className="text-sm font-bold text-foreground">{deal.title}</h3>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {deal.developer} -- {deal.quantity} kg N/yr -- {deal.catchment} catchment
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-[10px]">{deal.stage}</Badge>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                    <div className="flex items-center gap-4 mt-3 ml-13">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Package className="h-3 w-3" />
                        {deal.quantity} kg/yr
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {deal.catchment}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <PoundSterling className="h-3 w-3" />
                        {formatCurrency(deal.budget)}
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  onClick={() => setStep(2)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  Review Requirements
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Review Requirements */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-bold text-foreground mb-1">Review Requirements</h2>
                <p className="text-sm text-muted-foreground">Confirm the demand parameters before searching for matching supply.</p>
              </div>

              <Card className="border-border bg-card">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3 mb-4 pb-4 border-b border-border/50">
                    <div className="h-12 w-12 rounded-xl bg-blue-100 flex items-center justify-center">
                      <Building2 className="h-6 w-6 text-blue-700" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-muted-foreground">{selectedDeal.ref}</span>
                        <h3 className="text-base font-bold text-foreground">{selectedDeal.title}</h3>
                      </div>
                      <p className="text-xs text-muted-foreground">{selectedDeal.developer}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 rounded-lg bg-muted/50 border border-border/50">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Leaf className="h-3.5 w-3.5 text-emerald-600" />
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Unit Type</span>
                      </div>
                      <p className="text-sm font-semibold text-foreground">{selectedDeal.unitType}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50 border border-border/50">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Package className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Quantity Needed</span>
                      </div>
                      <p className="text-sm font-bold text-foreground">{selectedDeal.quantity} kg N/yr</p>
                    </div>
                    <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-100">
                      <div className="flex items-center gap-1.5 mb-1">
                        <MapPin className="h-3.5 w-3.5 text-emerald-600" />
                        <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Catchment Required</span>
                      </div>
                      <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">{selectedDeal.catchment}</Badge>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50 border border-border/50">
                      <div className="flex items-center gap-1.5 mb-1">
                        <PoundSterling className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Max Budget</span>
                      </div>
                      <p className="text-sm font-bold text-foreground">{formatCurrency(selectedDeal.budget)}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{formatCurrency(selectedDeal.budgetPerKg)}/kg max</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50 border border-border/50 col-span-2">
                      <div className="flex items-center gap-1.5 mb-1">
                        <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Planning Reference</span>
                      </div>
                      <p className="text-sm font-mono font-medium text-foreground">{selectedDeal.planningRef}</p>
                    </div>
                  </div>

                  {/* Info callout */}
                  <div className="flex items-start gap-2 mt-4 p-3 bg-blue-50 border border-blue-100 rounded-lg">
                    <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold text-blue-800">Matching Criteria</p>
                      <p className="text-[11px] text-blue-600 mt-0.5">
                        Sites must be in the <strong>{selectedDeal.catchment}</strong> catchment with available Nitrogen credits.
                        Results ranked by unit price with availability and catchment validation.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex items-center justify-between pt-2">
                <Button variant="outline" onClick={() => setStep(1)}>
                  <ChevronLeft className="h-4 w-4" />
                  Back
                </Button>
                <Button
                  onClick={() => setStep(3)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  size="lg"
                >
                  <Search className="h-4 w-4" />
                  Find Matching Supply
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Ranked Matches */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-bold text-foreground mb-1">Ranked Matches</h2>
                  <p className="text-sm text-muted-foreground">
                    {matches.length} supply site{matches.length !== 1 ? "s" : ""} match{matches.length === 1 ? "es" : ""} the
                    requirements for <span className="font-semibold text-foreground">{selectedDeal.ref} {selectedDeal.developer}</span>
                  </p>
                </div>
                <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortMode)}>
                  <SelectTrigger className="w-[150px] h-8 text-xs bg-card">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="price">Price (lowest)</SelectItem>
                    <SelectItem value="quantity">Available Qty</SelectItem>
                    <SelectItem value="distance">Distance</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Comparison table header */}
              <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                {/* Table header row */}
                <div className="grid grid-cols-[1fr_1fr_1fr] border-b border-border bg-muted/50">
                  {matches.map((match, idx) => {
                    const config = tierConfig(match.tier)
                    return (
                      <div
                        key={match.id}
                        className={`p-4 ${idx < matches.length - 1 ? "border-r border-border" : ""} ${
                          match.tier === "best" ? "bg-emerald-50/70" : ""
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className={`${config.badge} text-[10px] font-bold`}>
                            {config.label}
                          </Badge>
                          {match.lowStock && (
                            <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-[10px]">
                              Low Stock
                            </Badge>
                          )}
                        </div>
                        <Link href={`/admin/brokerage-mockups/sites/${match.ref}`} className="text-sm font-bold text-foreground hover:text-emerald-700">{match.siteName}</Link>
                        <Link href={`/admin/brokerage-mockups/sites/${match.ref}`} className="font-mono text-[10px] text-muted-foreground hover:text-primary">{match.ref}</Link>
                      </div>
                    )
                  })}
                </div>

                {/* Contact row */}
                <div className="grid grid-cols-[1fr_1fr_1fr] border-b border-border/50">
                  {matches.map((match, idx) => (
                    <div key={match.id} className={`px-4 py-3 ${idx < matches.length - 1 ? "border-r border-border/50" : ""} ${
                      match.tier === "best" ? "bg-emerald-50/30" : ""
                    }`}>
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Contact</p>
                      <div className="flex items-center gap-2">
                        <div className="h-5 w-5 rounded-full bg-muted flex items-center justify-center">
                          <User className="h-2.5 w-2.5 text-muted-foreground" />
                        </div>
                        <span className="text-xs font-medium text-foreground">{match.contact}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Available qty row */}
                <div className="grid grid-cols-[1fr_1fr_1fr] border-b border-border/50">
                  {matches.map((match, idx) => (
                    <div key={match.id} className={`px-4 py-3 ${idx < matches.length - 1 ? "border-r border-border/50" : ""} ${
                      match.tier === "best" ? "bg-emerald-50/30" : ""
                    }`}>
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Available</p>
                      <p className={`text-sm font-bold ${match.partialFill ? "text-amber-600" : "text-emerald-700"}`}>
                        {match.available} kg/yr
                      </p>
                      {match.partialFill && (
                        <p className="text-[10px] text-amber-600 mt-0.5">{match.partialNote}</p>
                      )}
                      {!match.partialFill && (
                        <p className="text-[10px] text-emerald-600 mt-0.5">Sufficient supply</p>
                      )}
                    </div>
                  ))}
                </div>

                {/* Unit price row */}
                <div className="grid grid-cols-[1fr_1fr_1fr] border-b border-border/50">
                  {matches.map((match, idx) => (
                    <div key={match.id} className={`px-4 py-3 ${idx < matches.length - 1 ? "border-r border-border/50" : ""} ${
                      match.tier === "best" ? "bg-emerald-50/30" : ""
                    }`}>
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Unit Price</p>
                      <p className="text-sm font-bold text-foreground">{formatCurrency(match.unitPrice)}/kg</p>
                      {match.chips.includes("Lowest price") && (
                        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px] mt-1">Lowest price</Badge>
                      )}
                      {match.chips.includes("Highest price") && (
                        <Badge className="bg-muted text-muted-foreground border-border text-[10px] mt-1">Highest price</Badge>
                      )}
                    </div>
                  ))}
                </div>

                {/* Total cost row */}
                <div className="grid grid-cols-[1fr_1fr_1fr] border-b border-border/50">
                  {matches.map((match, idx) => (
                    <div key={match.id} className={`px-4 py-3 ${idx < matches.length - 1 ? "border-r border-border/50" : ""} ${
                      match.tier === "best" ? "bg-emerald-50/30" : ""
                    }`}>
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Total Cost</p>
                      <p className="text-lg font-bold text-foreground">{formatCurrency(match.totalCost)}</p>
                    </div>
                  ))}
                </div>

                {/* Commission row */}
                <div className="grid grid-cols-[1fr_1fr_1fr] border-b border-border/50">
                  {matches.map((match, idx) => (
                    <div key={match.id} className={`px-4 py-3 ${idx < matches.length - 1 ? "border-r border-border/50" : ""} ${
                      match.tier === "best" ? "bg-emerald-50/30" : ""
                    }`}>
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Commission (20%)</p>
                      <p className="text-sm font-bold text-emerald-700">{formatCurrency(match.commission)}</p>
                    </div>
                  ))}
                </div>

                {/* Catchment row */}
                <div className="grid grid-cols-[1fr_1fr_1fr] border-b border-border/50">
                  {matches.map((match, idx) => (
                    <div key={match.id} className={`px-4 py-3 ${idx < matches.length - 1 ? "border-r border-border/50" : ""} ${
                      match.tier === "best" ? "bg-emerald-50/30" : ""
                    }`}>
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Catchment</p>
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        <span className="text-xs font-semibold text-emerald-700">{match.catchment}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Action row */}
                <div className="grid grid-cols-[1fr_1fr_1fr]">
                  {matches.map((match, idx) => (
                    <div key={match.id} className={`px-4 py-4 ${idx < matches.length - 1 ? "border-r border-border/50" : ""} ${
                      match.tier === "best" ? "bg-emerald-50/30" : ""
                    }`}>
                      {match.tier === "best" ? (
                        <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs" size="sm" asChild>
                          <Link href="/admin/brokerage-mockups/deals/new">
                            <Handshake className="h-3.5 w-3.5" />
                            Create Deal
                          </Link>
                        </Button>
                      ) : match.partialFill ? (
                        <Button variant="outline" className="w-full text-xs border-amber-300 text-amber-700 hover:bg-amber-50" size="sm" asChild>
                          <Link href="/admin/brokerage-mockups/deals/new">
                            <Handshake className="h-3.5 w-3.5" />
                            Create Deal (Partial)
                          </Link>
                        </Button>
                      ) : (
                        <Button variant="secondary" className="w-full text-xs" size="sm" asChild>
                          <Link href="/admin/brokerage-mockups/deals/new">
                            <Handshake className="h-3.5 w-3.5" />
                            Create Deal
                          </Link>
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Unmatched Supply */}
              <div className="pt-2">
                <Separator />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <TrendingDown className="h-4 w-4 text-muted-foreground" />
                  <h3 className="text-sm font-semibold text-foreground">Unmatched Supply</h3>
                </div>
                {UNMATCHED_SUPPLY.map((uSite) => (
                  <div
                    key={uSite.ref}
                    className="border border-border rounded-lg p-3 bg-card flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
                        <Leaf className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <Link href={`/admin/brokerage-mockups/sites/${uSite.ref}`} className="text-xs font-bold text-foreground hover:text-emerald-700">{uSite.siteName}</Link>
                          <Link href={`/admin/brokerage-mockups/sites/${uSite.ref}`} className="font-mono text-[10px] text-muted-foreground hover:text-primary">{uSite.ref}</Link>
                        </div>
                        <p className="text-[11px] text-muted-foreground">{uSite.available} {uSite.unit} available</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-muted text-muted-foreground border-border text-[10px]">{uSite.catchment}</Badge>
                      <span className="text-[11px] text-muted-foreground italic">{uSite.reason}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Back button */}
              <div className="flex items-center justify-between pt-2">
                <Button variant="outline" onClick={() => setStep(2)}>
                  <ChevronLeft className="h-4 w-4" />
                  Back to Requirements
                </Button>
                <Button variant="outline" onClick={() => setStep(1)}>
                  Match Another Deal
                </Button>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function MatchingToolPage() {
  const [view, setView] = useState<"split" | "wizard">("split")

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <div className="bg-card border-b border-border shadow-sm">
        <div className="px-6 py-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <GitCompareArrows className="h-5 w-5 text-emerald-600" />
                <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-widest">
                  Ironheart Brokerage
                </span>
                <span className="text-muted-foreground/50 text-[11px]">|</span>
                <span className="text-[11px] text-muted-foreground uppercase tracking-widest">
                  BNG / Nutrient Credits
                </span>
              </div>
              <h1 className="text-xl font-bold text-foreground tracking-tight">
                Supply / Demand Matching
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Find available supply sites for demand requirements -- ranked by price, availability, and geographic constraint
              </p>
            </div>
            {/* View toggle */}
            <div className="flex items-center gap-1 bg-muted rounded-lg p-1 shrink-0">
              <button
                onClick={() => setView("split")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
                  view === "split"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <LayoutPanelLeft className="h-3.5 w-3.5" />
                Split Panel
              </button>
              <button
                onClick={() => setView("wizard")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
                  view === "wizard"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <ListOrdered className="h-3.5 w-3.5" />
                Wizard Steps
              </button>
            </div>
          </div>
        </div>

        {/* Quick stats */}
        <div className="px-6 pb-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 rounded-lg border border-blue-100">
              <Building2 className="h-3.5 w-3.5 text-blue-600" />
              <span className="text-xs font-semibold text-blue-800">3 Open Demands</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 rounded-lg border border-emerald-100">
              <Leaf className="h-3.5 w-3.5 text-emerald-600" />
              <span className="text-xs font-semibold text-emerald-800">145 kg N/yr Available (Solent)</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 rounded-lg border border-amber-100">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
              <span className="text-xs font-semibold text-amber-800">1 Unmatched Supply Site</span>
            </div>
          </div>

          {/* Matching Rules panel */}
          <div className="mt-3 p-3 rounded-lg border border-border bg-card">
            <div className="flex items-center gap-2 mb-2">
              <Settings2 className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-bold text-foreground">Matching Rules</span>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                <span>Geographic: Same catchment</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                <span>Unit Type: Match required</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                <span>Availability: Check stock</span>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground mt-2 italic">
              Matching rules are configurable per vertical in Settings
            </p>
          </div>
        </div>

        <Separator className="bg-muted" />
      </div>

      {/* View content */}
      {view === "split" ? <SplitPanelView /> : <WizardView />}
    </div>
  )
}
