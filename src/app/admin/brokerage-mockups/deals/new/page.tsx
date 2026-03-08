"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
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
  Leaf,
  Building2,
  Search,
  MapPin,
  User,
  Plus,
  X,
} from "lucide-react"
import {
  contacts,
  sites,
} from "../../_mock-data"

// ─── Brokers ─────────────────────────────────────────────────────

const BROKERS = [
  { id: "JH", name: "James Harris" },
  { id: "SC", name: "Sarah Croft" },
  { id: "TJ", name: "Tom Jenkins" },
]

// ─── Page ────────────────────────────────────────────────────────

export default function NewDealPage() {
  const [side, setSide] = useState<"supply" | "demand">("supply")
  const [contactSearch, setContactSearch] = useState("")
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null)
  const [selectedSiteRef, setSelectedSiteRef] = useState<string | null>(null)
  const [broker, setBroker] = useState("James Harris")
  const [showContactDropdown, setShowContactDropdown] = useState(false)

  // Demand-side requirement fields
  const [demandUnitType, setDemandUnitType] = useState("Nitrogen")
  const [demandQuantity, setDemandQuantity] = useState("")
  const [demandCatchment, setDemandCatchment] = useState("Solent")
  const [demandMaxBudget, setDemandMaxBudget] = useState("")
  const [demandPlanningRef, setDemandPlanningRef] = useState("")

  // Filtered contacts by side
  const filteredContacts = useMemo(() => {
    const sideContacts = contacts.filter((c) => c.side === side)
    if (!contactSearch.trim()) return sideContacts
    return sideContacts.filter(
      (c) =>
        c.name.toLowerCase().includes(contactSearch.toLowerCase()) ||
        c.company.toLowerCase().includes(contactSearch.toLowerCase())
    )
  }, [side, contactSearch])

  const selectedContact = contacts.find((c) => c.id === selectedContactId) ?? null
  const selectedSite = sites.find((s) => s.ref === selectedSiteRef) ?? null

  // Reset selections when side changes
  function handleSideChange(newSide: "supply" | "demand") {
    setSide(newSide)
    setSelectedContactId(null)
    setSelectedSiteRef(null)
    setContactSearch("")
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-screen-md mx-auto px-6 py-6">
        {/* Back link */}
        <Link
          href="/admin/brokerage-mockups/deals"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Deals
        </Link>

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">New Deal</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Create a new supply or demand deal in the pipeline
          </p>
        </div>

        {/* ─── Side Toggle ──────────────────────────── */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Deal Side</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleSideChange("supply")}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all text-sm font-medium ${
                  side === "supply"
                    ? "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                    : "border-border bg-card text-muted-foreground hover:bg-muted/50"
                }`}
              >
                <Leaf className="h-4 w-4" />
                Supply Deal
                <span className="text-[10px] font-normal opacity-80">(Landowner onboarding)</span>
              </button>
              <button
                onClick={() => handleSideChange("demand")}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all text-sm font-medium ${
                  side === "demand"
                    ? "border-blue-500 bg-blue-500/10 text-blue-700 dark:text-blue-400"
                    : "border-border bg-card text-muted-foreground hover:bg-muted/50"
                }`}
              >
                <Building2 className="h-4 w-4" />
                Demand Deal
                <span className="text-[10px] font-normal opacity-80">(Developer requirement)</span>
              </button>
            </div>
          </CardContent>
        </Card>

        {/* ─── Contact Picker ───────────────────────── */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">
              {side === "supply" ? "Supply Contact" : "Demand Contact"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedContact ? (
              <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white ${selectedContact.avatarColor}`}
                  >
                    {selectedContact.initials}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{selectedContact.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {selectedContact.company} &middot; {selectedContact.type}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedContactId(null)
                    setContactSearch("")
                  }}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : (
              <div className="relative">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={contactSearch}
                    onChange={(e) => {
                      setContactSearch(e.target.value)
                      setShowContactDropdown(true)
                    }}
                    onFocus={() => setShowContactDropdown(true)}
                    placeholder={`Search ${side} contacts...`}
                    className="w-full h-10 text-sm rounded-md border border-input bg-transparent pl-10 pr-3 focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                {showContactDropdown && (
                  <div className="absolute z-20 top-full mt-1 w-full rounded-lg border border-border bg-popover shadow-lg max-h-60 overflow-y-auto">
                    {filteredContacts.length === 0 ? (
                      <p className="px-4 py-3 text-xs text-muted-foreground">
                        No {side} contacts found
                      </p>
                    ) : (
                      filteredContacts.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => {
                            setSelectedContactId(c.id)
                            setShowContactDropdown(false)
                            setContactSearch("")
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-accent/50 transition-colors text-left"
                        >
                          <div
                            className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 ${c.avatarColor}`}
                          >
                            {c.initials}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{c.name}</p>
                            <p className="text-[11px] text-muted-foreground truncate">
                              {c.company} &middot; {c.type}
                            </p>
                          </div>
                          <Badge
                            variant="outline"
                            className="ml-auto shrink-0 text-[10px]"
                          >
                            {c.activeDeals} deals
                          </Badge>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ─── Supply: Site Linker ──────────────────── */}
        {side === "supply" && (
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Linked Site</CardTitle>
            </CardHeader>
            <CardContent>
              <Select
                value={selectedSiteRef ?? "none"}
                onValueChange={(v) => setSelectedSiteRef(v === "none" ? null : v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a site..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No site selected</SelectItem>
                  {sites.map((s) => (
                    <SelectItem key={s.ref} value={s.ref}>
                      {s.name} ({s.ref}) &mdash; {s.availableLabel} available
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedSite && (
                <div className="mt-3 p-3 rounded-lg border border-border bg-muted/30">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400 flex items-center justify-center shrink-0">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{selectedSite.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {selectedSite.address}
                      </p>
                      <div className="flex items-center gap-3 mt-2 flex-wrap">
                        <Badge
                          variant="outline"
                          className="text-[10px]"
                        >
                          {selectedSite.unitType}
                        </Badge>
                        <span className="text-[11px] text-muted-foreground">
                          {selectedSite.availableLabel} available of {selectedSite.totalLabel}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {selectedSite.priceLabel}
                        </span>
                        <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30 text-[10px]">
                          {selectedSite.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ─── Demand: Requirement Capture ───────────── */}
        {side === "demand" && (
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">
                Requirement Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    Unit Type
                  </label>
                  <Select value={demandUnitType} onValueChange={setDemandUnitType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Nitrogen">Nitrogen (kg N/yr)</SelectItem>
                      <SelectItem value="Phosphorus">Phosphorus (kg P/yr)</SelectItem>
                      <SelectItem value="BNG">BNG (units)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    Quantity Needed
                  </label>
                  <input
                    type="text"
                    value={demandQuantity}
                    onChange={(e) => setDemandQuantity(e.target.value)}
                    placeholder="e.g. 45"
                    className="w-full h-10 text-sm rounded-md border border-input bg-transparent px-3 focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    Catchment Area
                  </label>
                  <Select value={demandCatchment} onValueChange={setDemandCatchment}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Solent">Solent</SelectItem>
                      <SelectItem value="Test Valley">Test Valley</SelectItem>
                      <SelectItem value="Stour">Stour</SelectItem>
                      <SelectItem value="Exe">Exe</SelectItem>
                      <SelectItem value="Tees">Tees</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    Max Budget
                  </label>
                  <input
                    type="text"
                    value={demandMaxBudget}
                    onChange={(e) => setDemandMaxBudget(e.target.value)}
                    placeholder="e.g. £150,000"
                    className="w-full h-10 text-sm rounded-md border border-input bg-transparent px-3 focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Planning Reference (optional)
                </label>
                <input
                  type="text"
                  value={demandPlanningRef}
                  onChange={(e) => setDemandPlanningRef(e.target.value)}
                  placeholder="e.g. F/24/12345"
                  className="w-full h-10 text-sm rounded-md border border-input bg-transparent px-3 focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* ─── Assigned Broker ──────────────────────── */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Assigned Broker</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={broker} onValueChange={setBroker}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BROKERS.map((b) => (
                  <SelectItem key={b.id} value={b.name}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* ─── Initial Stage ────────────────────────── */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Initial Stage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30">
              <div className="w-8 h-8 rounded-full bg-slate-500/10 flex items-center justify-center">
                <User className="h-4 w-4 text-slate-600 dark:text-slate-400" />
              </div>
              <div>
                <p className="text-sm font-medium">Prospecting</p>
                <p className="text-xs text-muted-foreground">
                  All new deals start in the Prospecting stage
                </p>
              </div>
              <Badge className="ml-auto bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20 text-[10px]">
                Auto-set
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Separator className="mb-6" />

        {/* ─── Actions ──────────────────────────────── */}
        <div className="flex items-center justify-end gap-3">
          <Link href="/admin/brokerage-mockups/deals">
            <Button variant="outline">Cancel</Button>
          </Link>
          <Button className="gap-1.5">
            <Plus className="h-4 w-4" />
            Create Deal
          </Button>
        </div>
      </div>
    </div>
  )
}
