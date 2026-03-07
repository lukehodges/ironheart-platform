"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  Building2,
  MapPin,
  Ruler,
  PoundSterling,
  Calendar,
  Users,
  Layers,
  CheckCircle,
  AlertCircle,
  XCircle,
  Target,
  TrendingUp,
  AlertTriangle,
  Search,
} from "lucide-react"

type ClientType = "Buyer" | "Tenant"
type MatchStatus = "match" | "close" | "miss"

interface Requirement {
  id: string
  clientName: string
  clientType: ClientType
  propertyType: string
  sizeMin: number
  sizeMax: number | null
  location: string
  budgetMax: number
  budgetLabel: string
  dateAdded: string
  matchCount: number
}

interface MatchCriteria {
  type: MatchStatus
  size: MatchStatus
  location: MatchStatus
  budget: MatchStatus
}

interface PropertyMatch {
  id: string
  name: string
  address: string
  propertyType: string
  sizeSqft: number
  sizeNote?: string
  price: number
  priceLabel: string
  priceNote?: string
  locationArea: string
  locationNote?: string
  score: number
  criteria: MatchCriteria
}

const REQUIREMENTS: Requirement[] = [
  { id: "r1", clientName: "Coastal Logistics Ltd",    clientType: "Tenant", propertyType: "Industrial",      sizeMin: 8000, sizeMax: 15000, location: "Swansea / Neath corridor",       budgetMax: 65000,   budgetLabel: "£65,000 pa",   dateAdded: "18 Feb 2026", matchCount: 3 },
  { id: "r2", clientName: "Domino's Pizza Group",      clientType: "Tenant", propertyType: "Retail / Leisure",sizeMin: 800,  sizeMax: 1400,  location: "Swansea city centre or suburbs", budgetMax: 30000,   budgetLabel: "£30,000 pa",   dateAdded: "24 Feb 2026", matchCount: 2 },
  { id: "r3", clientName: "Jones & Morgan Solicitors", clientType: "Tenant", propertyType: "Office",          sizeMin: 600,  sizeMax: 1200,  location: "Swansea city centre",            budgetMax: 18000,   budgetLabel: "£18,000 pa",   dateAdded: "11 Jan 2026", matchCount: 4 },
  { id: "r4", clientName: "Capital Industrial REIT",   clientType: "Buyer",  propertyType: "Industrial",      sizeMin: 10000,sizeMax: null,  location: "South Wales (any)",              budgetMax: 1500000, budgetLabel: "£1,500,000",   dateAdded: "3 Feb 2026",  matchCount: 2 },
  { id: "r5", clientName: "Valleys Retail Co",         clientType: "Tenant", propertyType: "Retail",          sizeMin: 1000, sizeMax: 3000,  location: "Bridgend / Port Talbot",         budgetMax: 40000,   budgetLabel: "£40,000 pa",   dateAdded: "9 Mar 2026",  matchCount: 1 },
  { id: "r6", clientName: "Premier Inn Hotels",        clientType: "Buyer",  propertyType: "Leisure",         sizeMin: 5000, sizeMax: null,  location: "Cardiff or Swansea",             budgetMax: 4000000, budgetLabel: "£4,000,000",   dateAdded: "14 Jan 2026", matchCount: 0 },
  { id: "r7", clientName: "Tidy Tech Ltd",             clientType: "Tenant", propertyType: "Office",          sizeMin: 400,  sizeMax: 800,   location: "Newport",                        budgetMax: 12000,   budgetLabel: "£12,000 pa",   dateAdded: "26 Feb 2026", matchCount: 3 },
  { id: "r8", clientName: "Evans Recruitment",         clientType: "Tenant", propertyType: "Office",          sizeMin: 1500, sizeMax: 2500,  location: "Swansea",                        budgetMax: 28000,   budgetLabel: "£28,000 pa",   dateAdded: "5 Mar 2026",  matchCount: 2 },
  { id: "r9", clientName: "Atlantic Trade Parks",      clientType: "Buyer",  propertyType: "Trade Counter",   sizeMin: 3000, sizeMax: 6000,  location: "South Wales (any)",              budgetMax: 800000,  budgetLabel: "£800,000",     dateAdded: "21 Feb 2026", matchCount: 0 },
]

const MATCHES: Record<string, PropertyMatch[]> = {
  r1: [
    { id: "p1", name: "Baglan Energy Park — Unit 12",   address: "Brunel Way, Baglan, Neath",                          propertyType: "Industrial", sizeSqft: 8500,  price: 42500, priceLabel: "£42,500 pa", locationArea: "Neath / Baglan", score: 94, criteria: { type: "match", size: "match", location: "match", budget: "match" } },
    { id: "p2", name: "Cross Hands Industrial Estate",  address: "Cross Hands Business Park, Carmarthenshire",         propertyType: "Industrial", sizeSqft: 14200, price: 71000, priceLabel: "£71,000 pa", priceNote: "£6k above max", locationArea: "Cross Hands", locationNote: "12 miles from Neath", score: 91, criteria: { type: "match", size: "match", location: "close", budget: "close" } },
    { id: "p3", name: "Cwmdu Industrial Estate",        address: "Cwmdu, Swansea SA5",                                 propertyType: "Industrial", sizeSqft: 5800,  price: 29000, priceLabel: "£29,000 pa", sizeNote: "Below minimum — 2,200 sqft short", locationArea: "Swansea", score: 68, criteria: { type: "match", size: "miss", location: "match", budget: "match" } },
  ],
  r3: [
    { id: "p4", name: "Unit 3 Axis Court",              address: "Swansea Enterprise Park, Llansamlet, Swansea",       propertyType: "Office",     sizeSqft: 1240,  price: 14500, priceLabel: "£14,500 pa", locationArea: "Swansea Enterprise Park", score: 88, criteria: { type: "match", size: "match", location: "match", budget: "match" } },
    { id: "p5", name: "Sketty Lane Commercial",         address: "Sketty Lane, Uplands, Swansea",                      propertyType: "Office",     sizeSqft: 950,   price: 14000, priceLabel: "£14,000 pa", locationArea: "Swansea", score: 85, criteria: { type: "match", size: "match", location: "match", budget: "match" } },
    { id: "p6", name: "Bridgend Business Centre — Suite 7", address: "Bridgend Business Centre, CF31",                 propertyType: "Office",     sizeSqft: 620,   price: 8200,  priceLabel: "£8,200 pa", sizeNote: "Slightly below minimum", locationArea: "Bridgend", locationNote: "Outside preferred area", score: 72, criteria: { type: "match", size: "close", location: "miss", budget: "match" } },
    { id: "p7", name: "First Floor, Kingsway",          address: "Kingsway, Swansea City Centre, SA1",                 propertyType: "Office",     sizeSqft: 1800,  price: 22500, priceLabel: "£22,500 pa", sizeNote: "Over maximum by 600 sqft", priceNote: "£4.5k above max", locationArea: "Swansea city centre", score: 54, criteria: { type: "match", size: "miss", location: "match", budget: "miss" } },
  ],
}

function getPlaceholderMatches(req: Requirement): PropertyMatch[] {
  if (req.matchCount === 0) return []
  return Array.from({ length: req.matchCount }, (_, i) => ({
    id: `placeholder-${req.id}-${i}`,
    name: `Available Property ${i + 1}`,
    address: `${req.location} · Details pending`,
    propertyType: req.propertyType,
    sizeSqft: req.sizeMin + Math.floor(Math.random() * (req.sizeMax ? req.sizeMax - req.sizeMin : 5000)),
    price: Math.floor(req.budgetMax * 0.85),
    priceLabel: req.clientType === "Buyer"
      ? `£${(Math.floor(req.budgetMax * 0.85)).toLocaleString("en-GB")}`
      : `£${(Math.floor(req.budgetMax * 0.85)).toLocaleString("en-GB")} pa`,
    locationArea: req.location,
    score: 70 + Math.floor(Math.random() * 20),
    criteria: { type: "match", size: "match", location: "close", budget: "match" },
  }))
}

function scoreColor(score: number): { bar: string; text: string; bg: string } {
  if (score >= 75) return { bar: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-50" }
  if (score >= 50) return { bar: "bg-amber-500", text: "text-amber-700", bg: "bg-amber-50" }
  return { bar: "bg-red-500", text: "text-red-700", bg: "bg-red-50" }
}

function formatSize(sqft: number): string { return `${sqft.toLocaleString("en-GB")} sqft` }
function formatSizeRange(min: number, max: number | null): string {
  if (max === null) return `${min.toLocaleString("en-GB")}+ sqft`
  return `${min.toLocaleString("en-GB")}–${max.toLocaleString("en-GB")} sqft`
}

function clientTypeColor(type: ClientType): string {
  return type === "Buyer" ? "bg-violet-100 text-violet-700 border-violet-200" : "bg-sky-100 text-sky-700 border-sky-200"
}

function propertyTypeColor(type: string): string {
  const map: Record<string, string> = {
    Industrial: "bg-orange-100 text-orange-700 border-orange-200",
    Office: "bg-sky-100 text-sky-700 border-sky-200",
    Retail: "bg-rose-100 text-rose-700 border-rose-200",
    "Retail / Leisure": "bg-rose-100 text-rose-700 border-rose-200",
    Leisure: "bg-teal-100 text-teal-700 border-teal-200",
    "Trade Counter": "bg-purple-100 text-purple-700 border-purple-200",
  }
  return map[type] ?? "bg-slate-100 text-slate-700 border-slate-200"
}

function CriteriaPill({ label, status }: { label: string; status: MatchStatus }) {
  const config = {
    match: { icon: CheckCircle, className: "bg-emerald-50 text-emerald-700 border-emerald-200", iconClass: "text-emerald-500" },
    close: { icon: AlertCircle, className: "bg-amber-50 text-amber-700 border-amber-200",  iconClass: "text-amber-500" },
    miss:  { icon: XCircle,     className: "bg-red-50 text-red-700 border-red-200",          iconClass: "text-red-500" },
  }[status]
  const Icon = config.icon
  return (
    <span className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[11px] font-semibold ${config.className}`}>
      <Icon className={`h-3 w-3 ${config.iconClass}`} />{label}
    </span>
  )
}

function PropertyMatchCard({ match, rank }: { match: PropertyMatch; rank: number }) {
  const colors = scoreColor(match.score)
  const isPlaceholder = match.id.startsWith("placeholder-")
  return (
    <div className="border border-stone-200 rounded-xl bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-150">
      <div className={`px-4 py-3 flex items-center justify-between ${colors.bg} border-b border-stone-200`}>
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider">#{rank}</span>
          <div>
            <p className="text-[13px] font-bold text-stone-900">{match.name}</p>
            <p className="text-[11px] text-stone-500 flex items-center gap-1 mt-0.5">
              <MapPin className="h-3 w-3" />{match.address}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="text-right">
            <p className={`text-2xl font-bold tabular-nums leading-none ${colors.text}`}>{match.score}%</p>
            <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider mt-0.5">Match</p>
          </div>
        </div>
      </div>
      <div className="px-4 pt-2.5 pb-0">
        <div className="relative h-1.5 w-full bg-stone-100 rounded-full overflow-hidden">
          <div className={`absolute left-0 top-0 h-full rounded-full transition-all duration-700 ${colors.bar}`} style={{ width: `${match.score}%` }} />
        </div>
      </div>
      <div className="px-4 py-3">
        {isPlaceholder ? (
          <div className="flex items-center gap-2 py-2">
            <div className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
            <p className="text-[12px] text-stone-400 italic">Match details loading — data pending confirmation</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div>
                <p className="text-[10px] text-stone-400 font-semibold uppercase tracking-wider mb-1">Type</p>
                <span className={`inline-flex items-center rounded border px-2 py-0.5 text-[11px] font-semibold ${propertyTypeColor(match.propertyType)}`}>
                  {match.propertyType}
                </span>
              </div>
              <div>
                <p className="text-[10px] text-stone-400 font-semibold uppercase tracking-wider mb-1">Size</p>
                <p className="text-[12px] font-semibold text-stone-800">{formatSize(match.sizeSqft)}</p>
                {match.sizeNote && <p className="text-[10px] text-amber-600 mt-0.5">{match.sizeNote}</p>}
              </div>
              <div>
                <p className="text-[10px] text-stone-400 font-semibold uppercase tracking-wider mb-1">Price / Rent</p>
                <p className="text-[12px] font-semibold text-stone-800">{match.priceLabel}</p>
                {match.priceNote && <p className="text-[10px] text-amber-600 mt-0.5">{match.priceNote}</p>}
              </div>
            </div>
            {match.locationNote && (
              <div className="flex items-center gap-1.5 mb-3 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
                <AlertCircle className="h-3 w-3 shrink-0" /><span>Location note: {match.locationNote}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 flex-wrap">
              <CriteriaPill label="Type" status={match.criteria.type} />
              <CriteriaPill label="Size" status={match.criteria.size} />
              <CriteriaPill label="Location" status={match.criteria.location} />
              <CriteriaPill label="Budget" status={match.criteria.budget} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function RequirementCard({ req, isSelected, onClick }: { req: Requirement; isSelected: boolean; onClick: () => void }) {
  const hasNoMatches = req.matchCount === 0
  return (
    <button
      onClick={onClick}
      className={[
        "w-full text-left rounded-xl border transition-all duration-150 cursor-pointer",
        isSelected ? "border-blue-300 bg-blue-50/80 shadow-sm" : hasNoMatches ? "border-red-200 bg-red-50/40 hover:bg-red-50/70 hover:border-red-300" : "border-stone-200 bg-white hover:border-stone-300 hover:shadow-sm",
      ].join(" ")}
      style={isSelected ? { borderLeftWidth: "3px", borderLeftColor: "rgb(59 130 246)" } : {}}
    >
      <div className="p-3.5">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-start gap-1.5 min-w-0">
            <Users className="h-3.5 w-3.5 text-stone-400 mt-0.5 shrink-0" />
            <p className={`text-[12px] font-bold leading-tight truncate ${isSelected ? "text-blue-900" : "text-stone-800"}`}>
              {req.clientName}
            </p>
          </div>
          <span className={`shrink-0 inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${clientTypeColor(req.clientType)}`}>
            {req.clientType}
          </span>
        </div>
        <div className="flex items-center gap-1.5 mb-2">
          <Layers className="h-3 w-3 text-stone-400 shrink-0" />
          <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-semibold ${propertyTypeColor(req.propertyType)}`}>
            {req.propertyType}
          </span>
        </div>
        <div className="space-y-1 mb-2.5">
          <div className="flex items-center gap-1.5">
            <Ruler className="h-3 w-3 text-stone-400 shrink-0" />
            <p className="text-[11px] text-stone-600">{formatSizeRange(req.sizeMin, req.sizeMax)}</p>
          </div>
          <div className="flex items-center gap-1.5">
            <MapPin className="h-3 w-3 text-stone-400 shrink-0" />
            <p className="text-[11px] text-stone-600 truncate">{req.location}</p>
          </div>
          <div className="flex items-center gap-1.5">
            <PoundSterling className="h-3 w-3 text-stone-400 shrink-0" />
            <p className="text-[11px] font-semibold text-stone-700">Max {req.budgetLabel}</p>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3 text-stone-400" />
            <p className="text-[10px] text-stone-400">{req.dateAdded}</p>
          </div>
          <div className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${req.matchCount === 0 ? "bg-red-100 text-red-600" : req.matchCount >= 3 ? "bg-emerald-100 text-emerald-700" : "bg-stone-100 text-stone-600"}`}>
            <Target className="h-2.5 w-2.5" />
            {req.matchCount === 0 ? "No matches" : `${req.matchCount} match${req.matchCount !== 1 ? "es" : ""}`}
          </div>
        </div>
      </div>
    </button>
  )
}

function StatCard({ label, value, icon: Icon, accent }: { label: string; value: string | number; icon: React.ElementType; accent: string }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-stone-200 bg-white shadow-sm">
      <div className={`p-2 rounded-lg ${accent}`}><Icon className="h-4 w-4" /></div>
      <div>
        <p className="text-[10px] text-stone-500 font-semibold uppercase tracking-wider">{label}</p>
        <p className="text-xl font-bold text-stone-900 leading-tight">{value}</p>
      </div>
    </div>
  )
}

function NoMatchesPanel({ req }: { req: Requirement }) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center px-8">
      <div className="h-14 w-14 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center mb-4">
        <Search className="h-7 w-7 text-red-400" />
      </div>
      <h3 className="text-[15px] font-bold text-stone-800 mb-1.5">No matches found</h3>
      <p className="text-[13px] text-stone-500 max-w-xs leading-relaxed mb-4">
        No available properties currently match{" "}
        <span className="font-semibold text-stone-700">{req.clientName}</span>'s requirements for{" "}
        {req.propertyType.toLowerCase()} space in {req.location}.
      </p>
      <div className="rounded-xl border border-stone-200 bg-stone-50 px-5 py-3 text-left w-full max-w-xs">
        <p className="text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-2">Requirement summary</p>
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[11px] text-stone-600"><Ruler className="h-3 w-3 text-stone-400 shrink-0" />{formatSizeRange(req.sizeMin, req.sizeMax)}</div>
          <div className="flex items-center gap-2 text-[11px] text-stone-600"><MapPin className="h-3 w-3 text-stone-400 shrink-0" />{req.location}</div>
          <div className="flex items-center gap-2 text-[11px] text-stone-600"><PoundSterling className="h-3 w-3 text-stone-400 shrink-0" />Max {req.budgetLabel}</div>
        </div>
      </div>
      <p className="text-[11px] text-stone-400 mt-4">
        New stock added to the system will be automatically scored against this requirement.
      </p>
    </div>
  )
}

export default function RequirementsMatcherPage() {
  const [selectedId, setSelectedId] = useState<string>("r1")

  const selectedReq = REQUIREMENTS.find((r) => r.id === selectedId) ?? REQUIREMENTS[0]
  const matches = MATCHES[selectedId] ?? (selectedReq.matchCount > 0 ? getPlaceholderMatches(selectedReq) : [])
  const sortedMatches = [...matches].sort((a, b) => b.score - a.score)

  const strongMatchCount = REQUIREMENTS.flatMap((r) => MATCHES[r.id] ?? []).filter((m) => m.score >= 75).length
  const noMatchCount = REQUIREMENTS.filter((r) => r.matchCount === 0).length

  return (
    <div className="bg-[#fafaf9] text-stone-900 flex flex-col rounded-xl ring-1 ring-border">
      {/* Header */}
      <div className="bg-white border-b border-stone-200 rounded-t-xl">
        <div className="px-6 pt-4 pb-3">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <Building2 className="h-5 w-5 text-blue-600" />
                <span className="text-[11px] font-bold text-blue-600 uppercase tracking-widest">BP2 Property</span>
                <span className="text-stone-300 text-[11px]">|</span>
                <span className="text-[11px] text-stone-400 uppercase tracking-widest">South Wales Commercial</span>
              </div>
              <h1 className="text-xl font-bold text-stone-900 tracking-tight">Requirements Matcher</h1>
              <p className="text-[12px] text-stone-400 mt-0.5">
                Live scoring — match active buyer &amp; tenant requirements against available stock
              </p>
            </div>
          </div>
        </div>
        <div className="px-6 pb-4">
          <div className="flex items-center gap-3 flex-wrap">
            <StatCard label="Active Requirements" value={REQUIREMENTS.length} icon={Users} accent="bg-blue-100 text-blue-600" />
            <StatCard label="Properties Available" value={23} icon={Building2} accent="bg-stone-100 text-stone-600" />
            <StatCard label="Strong Matches (75%+)" value={strongMatchCount} icon={TrendingUp} accent="bg-emerald-100 text-emerald-600" />
            <StatCard label="Without a Match" value={noMatchCount} icon={AlertTriangle} accent="bg-red-100 text-red-600" />
          </div>
        </div>
        <Separator className="bg-stone-200" />
      </div>

      {/* Split panel body */}
      <div className="flex overflow-hidden" style={{ height: "max(600px, calc(100vh - 320px))" }}>
        {/* Left panel: requirements list */}
        <div className="w-80 shrink-0 border-r border-stone-200 flex flex-col" style={{ backgroundColor: "#fafaf9" }}>
          <div className="px-4 py-3 border-b border-stone-200 bg-[#fafaf9]">
            <p className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">Active Requirements</p>
            <p className="text-[11px] text-stone-400 mt-0.5">{REQUIREMENTS.length} clients · click to view matches</p>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-3 flex flex-col gap-2">
              {REQUIREMENTS.map((req) => (
                <RequirementCard key={req.id} req={req} isSelected={req.id === selectedId} onClick={() => setSelectedId(req.id)} />
              ))}
            </div>
          </ScrollArea>
          <div className="px-4 py-3 border-t border-stone-200 bg-[#fafaf9]">
            <div className="flex flex-col gap-1">
              <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-0.5">Indicators</p>
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-sm bg-red-200 border border-red-300" />
                <span className="text-[10px] text-stone-500">Red tint — no matches found</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-sm bg-blue-400 border border-blue-500" />
                <span className="text-[10px] text-stone-500">Blue border — selected</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right panel: matched properties */}
        <div className="flex-1 bg-white flex flex-col overflow-hidden">
          <div className="px-6 py-3 border-b border-stone-200 flex items-center justify-between shrink-0">
            <div>
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${clientTypeColor(selectedReq.clientType)}`}>
                  {selectedReq.clientType}
                </span>
                <p className="text-[14px] font-bold text-stone-900">{selectedReq.clientName}</p>
              </div>
              <p className="text-[11px] text-stone-500 mt-0.5">
                {selectedReq.propertyType} · {formatSizeRange(selectedReq.sizeMin, selectedReq.sizeMax)} · {selectedReq.location} · Max {selectedReq.budgetLabel}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {sortedMatches.length > 0 && (
                <>
                  <span className="text-[11px] text-stone-400">Sorted by match score</span>
                  <Badge className={`text-[11px] font-bold ${sortedMatches[0]?.score >= 75 ? "bg-emerald-100 text-emerald-700 border-emerald-200" : sortedMatches[0]?.score >= 50 ? "bg-amber-100 text-amber-700 border-amber-200" : "bg-red-100 text-red-700 border-red-200"}`}>
                    Best: {sortedMatches[0]?.score}%
                  </Badge>
                </>
              )}
            </div>
          </div>
          <ScrollArea className="flex-1">
            {sortedMatches.length === 0 ? (
              <NoMatchesPanel req={selectedReq} />
            ) : (
              <div className="p-5 flex flex-col gap-4">
                {sortedMatches.map((match, i) => <PropertyMatchCard key={match.id} match={match} rank={i + 1} />)}
                <div className="flex items-center gap-4 justify-center pt-2 pb-1">
                  <div className="flex items-center gap-1.5 text-[11px] text-stone-500"><div className="h-2 w-6 rounded-full bg-emerald-500" />75–100% Strong match</div>
                  <div className="flex items-center gap-1.5 text-[11px] text-stone-500"><div className="h-2 w-6 rounded-full bg-amber-500" />50–74% Partial match</div>
                  <div className="flex items-center gap-1.5 text-[11px] text-stone-500"><div className="h-2 w-6 rounded-full bg-red-500" />Below 50% Weak match</div>
                </div>
              </div>
            )}
          </ScrollArea>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-white border-t border-stone-200 px-6 py-3 rounded-b-xl">
        <div className="flex items-center justify-between text-[11px] text-stone-400">
          <span>BP2 Property · Commercial Agency · South Wales · Requirements Matcher v1.0</span>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5"><CheckCircle className="h-3 w-3 text-emerald-500" /><span>✓ Full match</span></div>
            <div className="flex items-center gap-1.5"><AlertCircle className="h-3 w-3 text-amber-500" /><span>~ Close match</span></div>
            <div className="flex items-center gap-1.5"><XCircle className="h-3 w-3 text-red-500" /><span>✗ Miss</span></div>
          </div>
        </div>
      </div>
    </div>
  )
}
