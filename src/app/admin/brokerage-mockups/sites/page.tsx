"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import {
  MapPin,
  Plus,
  Download,
  Search,
  ChevronDown,
  ChevronUp,
  X,
  ArrowUpDown,
  Leaf,
  TreePine,
  ClipboardCheck,
  LayoutList,
  Map,
  LayoutGrid,
  User,
  ExternalLink,
} from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SiteStatus =
  | "Active"
  | "Registered"
  | "Under Assessment"
  | "Legal In Progress"
  | "Prospecting"
  | "Fully Allocated"

type UnitType = "kg N/yr" | "BNG units"
type Catchment = "Solent" | "Test Valley"
type LPA = "Winchester" | "Eastleigh" | "Fareham" | "Test Valley"
type ViewMode = "table" | "map" | "grid"
type SortField = "ref" | "name" | "status" | "total" | "available" | "price" | "lpa"
type SortDir = "asc" | "desc"

interface Site {
  ref: string
  name: string
  status: SiteStatus
  contact: string
  catchment: Catchment
  unitType: UnitType
  total: number | null
  totalLabel: string
  allocated: number
  allocatedLabel: string
  available: number | null
  availableLabel: string
  price: number | null
  priceLabel: string
  lpa: LPA
  /** Approximate map position (% from top-left of the Hampshire map placeholder) */
  mapX: number
  mapY: number
}

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const SITES: Site[] = [
  {
    ref: "S-0001",
    name: "Whiteley Farm",
    status: "Active",
    contact: "Robert Whiteley",
    catchment: "Solent",
    unitType: "kg N/yr",
    total: 180,
    totalLabel: "180",
    allocated: 165,
    allocatedLabel: "165",
    available: 15,
    availableLabel: "15",
    price: 3200,
    priceLabel: "\u00a33,200",
    lpa: "Winchester",
    mapX: 52,
    mapY: 62,
  },
  {
    ref: "S-0002",
    name: "Botley Meadows",
    status: "Active",
    contact: "Margaret Thornton",
    catchment: "Solent",
    unitType: "kg N/yr",
    total: 130,
    totalLabel: "130",
    allocated: 45,
    allocatedLabel: "45",
    available: 85,
    availableLabel: "85",
    price: 2500,
    priceLabel: "\u00a32,500",
    lpa: "Eastleigh",
    mapX: 58,
    mapY: 55,
  },
  {
    ref: "S-0003",
    name: "Hamble Wetlands",
    status: "Legal In Progress",
    contact: "John Hamble",
    catchment: "Solent",
    unitType: "BNG units",
    total: 22.5,
    totalLabel: "22.5",
    allocated: 0,
    allocatedLabel: "0",
    available: 22.5,
    availableLabel: "22.5",
    price: 14000,
    priceLabel: "\u00a314,000",
    lpa: "Eastleigh",
    mapX: 64,
    mapY: 60,
  },
  {
    ref: "S-0004",
    name: "Riverside Meadows",
    status: "Under Assessment",
    contact: "Susan Marsh",
    catchment: "Solent",
    unitType: "kg N/yr",
    total: null,
    totalLabel: "TBD",
    allocated: 0,
    allocatedLabel: "0",
    available: null,
    availableLabel: "TBD",
    price: null,
    priceLabel: "TBD",
    lpa: "Fareham",
    mapX: 60,
    mapY: 68,
  },
  {
    ref: "S-0005",
    name: "Manor Fields",
    status: "Active",
    contact: "David Ashford",
    catchment: "Solent",
    unitType: "kg N/yr",
    total: 95,
    totalLabel: "95",
    allocated: 50,
    allocatedLabel: "50",
    available: 45,
    availableLabel: "45",
    price: 3000,
    priceLabel: "\u00a33,000",
    lpa: "Winchester",
    mapX: 46,
    mapY: 42,
  },
  {
    ref: "S-0006",
    name: "Test Valley Grassland",
    status: "Registered",
    contact: "Ian Stockbridge",
    catchment: "Test Valley",
    unitType: "kg N/yr",
    total: 150,
    totalLabel: "150",
    allocated: 0,
    allocatedLabel: "0",
    available: 150,
    availableLabel: "150",
    price: 2800,
    priceLabel: "\u00a32,800",
    lpa: "Test Valley",
    mapX: 34,
    mapY: 30,
  },
  {
    ref: "S-0007",
    name: "Wickham Solar Farm",
    status: "Prospecting",
    contact: "Helen Wickham",
    catchment: "Solent",
    unitType: "BNG units",
    total: null,
    totalLabel: "Est. 12",
    allocated: 0,
    allocatedLabel: "0",
    available: null,
    availableLabel: "Est. 12",
    price: null,
    priceLabel: "TBD",
    lpa: "Winchester",
    mapX: 54,
    mapY: 52,
  },
  {
    ref: "S-0008",
    name: "Curdridge Farm",
    status: "Prospecting",
    contact: "William Curdridge",
    catchment: "Solent",
    unitType: "kg N/yr",
    total: null,
    totalLabel: "Est. 100",
    allocated: 0,
    allocatedLabel: "0",
    available: null,
    availableLabel: "Est. 100",
    price: null,
    priceLabel: "TBD",
    lpa: "Eastleigh",
    mapX: 56,
    mapY: 58,
  },
]

// ---------------------------------------------------------------------------
// Status badge config
// ---------------------------------------------------------------------------

const STATUS_CONFIG: Record<SiteStatus, { bg: string; text: string; dot: string; border: string }> = {
  Active:            { bg: "bg-green-50",   text: "text-green-700",   dot: "bg-green-500",   border: "border-green-200" },
  Registered:        { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500", border: "border-emerald-200" },
  "Under Assessment":{ bg: "bg-blue-50",    text: "text-blue-700",    dot: "bg-blue-500",    border: "border-blue-200" },
  "Legal In Progress":{ bg: "bg-amber-50",  text: "text-amber-700",   dot: "bg-amber-500",  border: "border-amber-200" },
  Prospecting:       { bg: "bg-gray-50",    text: "text-gray-600",    dot: "bg-gray-400",    border: "border-gray-200" },
  "Fully Allocated": { bg: "bg-purple-50",  text: "text-purple-700",  dot: "bg-purple-500",  border: "border-purple-200" },
}

const ALL_STATUSES: SiteStatus[] = ["Active", "Registered", "Under Assessment", "Legal In Progress", "Prospecting", "Fully Allocated"]
const ALL_CATCHMENTS: Catchment[] = ["Solent", "Test Valley"]
const ALL_LPAS: LPA[] = ["Winchester", "Eastleigh", "Fareham", "Test Valley"]
const ALL_UNIT_TYPES: UnitType[] = ["kg N/yr", "BNG units"]

// ---------------------------------------------------------------------------
// Reusable sub-components
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: SiteStatus }) {
  const cfg = STATUS_CONFIG[status]
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium ${cfg.bg} ${cfg.text} ${cfg.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {status}
    </span>
  )
}

function UnitTypeBadge({ type }: { type: UnitType }) {
  const isNitrogen = type === "kg N/yr"
  return (
    <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium ${
      isNitrogen ? "bg-sky-50 text-sky-700" : "bg-lime-50 text-lime-700"
    }`}>
      {isNitrogen ? <Leaf className="w-3 h-3" /> : <TreePine className="w-3 h-3" />}
      {type}
    </span>
  )
}

function CatchmentPill({ catchment }: { catchment: Catchment }) {
  return (
    <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
      {catchment}
    </span>
  )
}

function CapacityBar({ total, allocated, available, totalLabel, allocatedLabel, availableLabel }: {
  total: number | null
  allocated: number
  available: number | null
  totalLabel: string
  allocatedLabel: string
  availableLabel: string
}) {
  if (total === null) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
          <div className="h-full rounded-full bg-muted-foreground/20 animate-pulse" style={{ width: "30%" }} />
        </div>
        <span className="text-xs text-muted-foreground italic whitespace-nowrap">TBD</span>
      </div>
    )
  }
  const allocPct = total > 0 ? Math.round((allocated / total) * 100) : 0
  const availPct = 100 - allocPct
  return (
    <div className="space-y-1">
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden flex">
        <div className="h-full bg-blue-400 rounded-l-full" style={{ width: `${allocPct}%` }} />
        <div className="h-full bg-green-400 rounded-r-full" style={{ width: `${availPct}%` }} />
      </div>
      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span>{allocatedLabel} alloc</span>
        <span className={`font-medium ${(available ?? 0) > 0 ? "text-green-600" : "text-muted-foreground"}`}>
          {availableLabel} avail
        </span>
      </div>
    </div>
  )
}

function AvailableCell({ available, availableLabel }: { available: number | null; availableLabel: string }) {
  if (available === null) return <span className="italic text-muted-foreground">TBD</span>
  if (available === 0) return <span className="text-muted-foreground">0</span>
  return <span className="font-semibold text-green-700">{availableLabel}</span>
}

interface StatCardProps {
  label: string
  value: string | number
  sub?: string
  icon: React.ReactNode
  color?: string
}

function StatCard({ label, value, sub, icon, color = "bg-card" }: StatCardProps) {
  return (
    <div className={`${color} border border-border rounded-xl p-5 flex flex-col gap-2`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
        <span className="text-muted-foreground/40">{icon}</span>
      </div>
      <div className="flex items-end gap-2">
        <span className="text-3xl font-bold tracking-tight text-foreground leading-none">{value}</span>
        {sub && <span className="text-sm text-muted-foreground mb-0.5">{sub}</span>}
      </div>
    </div>
  )
}

function SortButton({ field, currentField, currentDir, onSort, children }: {
  field: SortField
  currentField: SortField
  currentDir: SortDir
  onSort: (f: SortField) => void
  children: React.ReactNode
}) {
  const isActive = field === currentField
  return (
    <button
      onClick={() => onSort(field)}
      className="flex items-center gap-1 group"
    >
      {children}
      {isActive ? (
        currentDir === "asc" ? <ChevronUp className="w-3 h-3 text-foreground/60" /> : <ChevronDown className="w-3 h-3 text-foreground/60" />
      ) : (
        <ArrowUpDown className="w-3 h-3 text-muted-foreground/40 group-hover:text-muted-foreground" />
      )}
    </button>
  )
}

// ---------------------------------------------------------------------------
// Filter dropdown helper
// ---------------------------------------------------------------------------

function FilterSelect<T extends string>({ label, options, value, onChange, placeholder }: {
  label: string
  options: T[]
  value: T | ""
  onChange: (v: T | "") => void
  placeholder?: string
}) {
  return (
    <Select value={value || "all"} onValueChange={(v) => onChange(v === "all" ? "" as T | "" : v as T)}>
      <SelectTrigger className="h-9 w-auto min-w-[120px] text-sm">
        <SelectValue placeholder={placeholder ?? `All ${label}`} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{placeholder ?? `All ${label}`}</SelectItem>
        {options.map((o) => (
          <SelectItem key={o} value={o}>{o}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

// ---------------------------------------------------------------------------
// Main page component
// ---------------------------------------------------------------------------

export default function SitesListPage() {
  // View mode
  const [view, setView] = useState<ViewMode>("table")

  // Filters
  const [searchText, setSearchText] = useState("")
  const [statusFilter, setStatusFilter] = useState<SiteStatus | "">("")
  const [catchmentFilter, setCatchmentFilter] = useState<Catchment | "">("")
  const [lpaFilter, setLpaFilter] = useState<LPA | "">("")
  const [unitTypeFilter, setUnitTypeFilter] = useState<UnitType | "">("")
  const [hasAvailableOnly, setHasAvailableOnly] = useState(false)

  // Sort (table view)
  const [sortField, setSortField] = useState<SortField>("ref")
  const [sortDir, setSortDir] = useState<SortDir>("asc")

  // Map selected site
  const [selectedSiteRef, setSelectedSiteRef] = useState<string | null>(null)

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortField(field)
      setSortDir("asc")
    }
  }

  const hasActiveFilters = searchText || statusFilter || catchmentFilter || lpaFilter || unitTypeFilter || hasAvailableOnly

  const clearFilters = () => {
    setSearchText("")
    setStatusFilter("")
    setCatchmentFilter("")
    setLpaFilter("")
    setUnitTypeFilter("")
    setHasAvailableOnly(false)
  }

  // Filtered & sorted sites
  const filtered = useMemo(() => {
    let results = [...SITES]

    if (searchText) {
      const q = searchText.toLowerCase()
      results = results.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.ref.toLowerCase().includes(q) ||
          s.contact.toLowerCase().includes(q)
      )
    }
    if (statusFilter) results = results.filter((s) => s.status === statusFilter)
    if (catchmentFilter) results = results.filter((s) => s.catchment === catchmentFilter)
    if (lpaFilter) results = results.filter((s) => s.lpa === lpaFilter)
    if (unitTypeFilter) results = results.filter((s) => s.unitType === unitTypeFilter)
    if (hasAvailableOnly) results = results.filter((s) => s.available !== null && s.available > 0)

    // Sort
    results.sort((a, b) => {
      let cmp = 0
      switch (sortField) {
        case "ref": cmp = a.ref.localeCompare(b.ref); break
        case "name": cmp = a.name.localeCompare(b.name); break
        case "status": cmp = a.status.localeCompare(b.status); break
        case "total": cmp = (a.total ?? -1) - (b.total ?? -1); break
        case "available": cmp = (a.available ?? -1) - (b.available ?? -1); break
        case "price": cmp = (a.price ?? -1) - (b.price ?? -1); break
        case "lpa": cmp = a.lpa.localeCompare(b.lpa); break
      }
      return sortDir === "asc" ? cmp : -cmp
    })

    return results
  }, [searchText, statusFilter, catchmentFilter, lpaFilter, unitTypeFilter, hasAvailableOnly, sortField, sortDir])

  // Stat computations
  const activeSites = SITES.filter((s) => s.status === "Active").length
  const totalAvailableN = SITES.filter((s) => s.unitType === "kg N/yr" && s.available !== null)
    .reduce((sum, s) => sum + (s.available ?? 0), 0)
  const totalAvailableBNG = SITES.filter((s) => s.unitType === "BNG units" && s.available !== null)
    .reduce((sum, s) => sum + (s.available ?? 0), 0)
  const underAssessment = SITES.filter((s) => s.status === "Under Assessment").length

  return (
    <div className="max-w-screen-2xl mx-auto px-6 py-8 space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">
            Ironheart Brokerage · Sites
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Sites
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gain sites generating nutrient and BNG credits across all catchments
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors">
            <Download className="w-4 h-4" />
            Export
          </button>
          <button className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition-colors">
            <Plus className="w-4 h-4" />
            New Site
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Sites"
          value={SITES.length}
          icon={<MapPin className="w-5 h-5" />}
        />
        <StatCard
          label="Active Sites"
          value={activeSites}
          sub="generating credits"
          icon={<Leaf className="w-5 h-5" />}
        />
        <StatCard
          label="Credits Available"
          value={`${totalAvailableN} kg`}
          sub={`+ ${totalAvailableBNG} BNG`}
          icon={<TreePine className="w-5 h-5" />}
        />
        <StatCard
          label="Under Assessment"
          value={underAssessment}
          sub={underAssessment === 1 ? "site" : "sites"}
          icon={<ClipboardCheck className="w-5 h-5" />}
        />
      </div>

      {/* View toggle + filter bar */}
      <div className="bg-card border border-border rounded-xl">
        <div className="px-4 py-3 flex flex-wrap items-center gap-3 border-b border-border/50">
          {/* View toggle */}
          <div className="flex items-center bg-muted rounded-lg p-0.5 mr-2">
            {([
              { key: "table" as ViewMode, label: "Table", icon: LayoutList },
              { key: "map" as ViewMode, label: "Map", icon: Map },
              { key: "grid" as ViewMode, label: "Grid", icon: LayoutGrid },
            ]).map((v) => {
              const Icon = v.icon
              return (
                <button
                  key={v.key}
                  onClick={() => setView(v.key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    view === v.key
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {v.label}
                </button>
              )
            })}
          </div>

          {/* Search */}
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search sites..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-lg bg-card placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
            />
            {searchText && (
              <button onClick={() => setSearchText("")} className="absolute right-2 top-1/2 -translate-y-1/2">
                <X className="w-4 h-4 text-muted-foreground hover:text-foreground" />
              </button>
            )}
          </div>

          {/* Filters */}
          <FilterSelect label="Status" options={ALL_STATUSES} value={statusFilter} onChange={setStatusFilter} />
          <FilterSelect label="Catchment" options={ALL_CATCHMENTS} value={catchmentFilter} onChange={setCatchmentFilter} />
          <FilterSelect label="LPA" options={ALL_LPAS} value={lpaFilter} onChange={setLpaFilter} />
          <FilterSelect label="Unit Type" options={ALL_UNIT_TYPES} value={unitTypeFilter} onChange={setUnitTypeFilter} />

          {/* Has available toggle */}
          <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer select-none whitespace-nowrap">
            <button
              role="switch"
              aria-checked={hasAvailableOnly}
              onClick={() => setHasAvailableOnly(!hasAvailableOnly)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                hasAvailableOnly ? "bg-emerald-500" : "bg-muted"
              }`}
            >
              <span
                className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
                  hasAvailableOnly ? "translate-x-[18px]" : "translate-x-[3px]"
                }`}
              />
            </button>
            Has available units
          </label>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 ml-auto whitespace-nowrap"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Content area */}
        {view === "table" && <TableView sites={filtered} sortField={sortField} sortDir={sortDir} onSort={handleSort} />}
        {view === "map" && <MapView sites={filtered} selectedRef={selectedSiteRef} onSelect={setSelectedSiteRef} />}
        {view === "grid" && <GridView sites={filtered} />}

        {/* Footer */}
        <div className="border-t border-border/50 bg-muted/30 px-5 py-3 flex items-center justify-between rounded-b-xl">
          <span className="text-xs text-muted-foreground">
            Showing <span className="font-medium text-foreground/70">{filtered.length}</span> of{" "}
            <span className="font-medium text-foreground/70">{SITES.length}</span> sites
          </span>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            {ALL_STATUSES.filter((s) => SITES.some((site) => site.status === s)).map((s) => (
              <span key={s} className="flex items-center gap-1.5">
                <span className={`inline-block w-2 h-2 rounded-full ${STATUS_CONFIG[s].dot}`} />
                {s}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// V1: Data Table View
// ---------------------------------------------------------------------------

function TableView({ sites, sortField, sortDir, onSort }: {
  sites: Site[]
  sortField: SortField
  sortDir: SortDir
  onSort: (f: SortField) => void
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border/50 bg-muted/50">
            <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
              <SortButton field="ref" currentField={sortField} currentDir={sortDir} onSort={onSort}>Ref</SortButton>
            </th>
            <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap w-[200px]">
              <SortButton field="name" currentField={sortField} currentDir={sortDir} onSort={onSort}>Site</SortButton>
            </th>
            <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
              <SortButton field="status" currentField={sortField} currentDir={sortDir} onSort={onSort}>Status</SortButton>
            </th>
            <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
              Contact
            </th>
            <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
              Catchment
            </th>
            <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
              Unit Type
            </th>
            <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap w-[180px]">
              Capacity
            </th>
            <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
              <SortButton field="available" currentField={sortField} currentDir={sortDir} onSort={onSort}>Available</SortButton>
            </th>
            <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
              <SortButton field="price" currentField={sortField} currentDir={sortDir} onSort={onSort}>Price / Unit</SortButton>
            </th>
            <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
              <SortButton field="lpa" currentField={sortField} currentDir={sortDir} onSort={onSort}>LPA</SortButton>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/50">
          {sites.map((site) => (
            <tr
              key={site.ref}
              className="group hover:bg-emerald-50/30 transition-colors cursor-pointer"
            >
              <td className="px-5 py-3.5">
                <Link href={`/admin/brokerage-mockups/sites/${site.ref}`} className="text-xs font-mono text-muted-foreground hover:text-primary">{site.ref}</Link>
              </td>
              <td className="px-4 py-3.5">
                <Link href={`/admin/brokerage-mockups/sites/${site.ref}`} className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                    <MapPin className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div>
                    <div className="font-medium text-foreground group-hover:text-emerald-700 leading-snug">{site.name}</div>
                    <div className="text-[11px] text-muted-foreground">{site.lpa} district</div>
                  </div>
                </Link>
              </td>
              <td className="px-4 py-3.5">
                <StatusBadge status={site.status} />
              </td>
              <td className="px-4 py-3.5">
                <div className="flex items-center gap-1.5">
                  <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <User className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                  <span className="text-foreground/80 text-sm">{site.contact}</span>
                </div>
              </td>
              <td className="px-4 py-3.5">
                <CatchmentPill catchment={site.catchment} />
              </td>
              <td className="px-4 py-3.5">
                <UnitTypeBadge type={site.unitType} />
              </td>
              <td className="px-4 py-3.5 w-[180px]">
                <CapacityBar
                  total={site.total}
                  allocated={site.allocated}
                  available={site.available}
                  totalLabel={site.totalLabel}
                  allocatedLabel={site.allocatedLabel}
                  availableLabel={site.availableLabel}
                />
              </td>
              <td className="px-4 py-3.5 text-right">
                <AvailableCell available={site.available} availableLabel={site.availableLabel} />
              </td>
              <td className="px-4 py-3.5 text-right">
                {site.price !== null ? (
                  <span className="font-semibold text-foreground tabular-nums">{site.priceLabel}</span>
                ) : (
                  <span className="text-muted-foreground italic">TBD</span>
                )}
              </td>
              <td className="px-4 py-3.5">
                <span className="text-sm text-muted-foreground">{site.lpa}</span>
              </td>
            </tr>
          ))}
          {sites.length === 0 && (
            <tr>
              <td colSpan={10} className="text-center py-12 text-muted-foreground">
                No sites match the current filters.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

// ---------------------------------------------------------------------------
// V2: Map View
// ---------------------------------------------------------------------------

function MapView({ sites, selectedRef, onSelect }: {
  sites: Site[]
  selectedRef: string | null
  onSelect: (ref: string | null) => void
}) {
  return (
    <div className="flex flex-col lg:flex-row min-h-[560px]">
      {/* Left: Map placeholder */}
      <div className="lg:w-[55%] p-4">
        <div className="relative w-full h-full min-h-[400px] lg:min-h-[520px] rounded-xl overflow-hidden bg-gradient-to-br from-slate-200 via-slate-150 to-slate-100 border border-slate-200">
          {/* Hampshire outline shape (stylized CSS polygon) */}
          <div className="absolute inset-4">
            {/* Water area bottom-right (Solent) */}
            <div className="absolute bottom-0 right-0 w-[70%] h-[25%] bg-sky-100/60 rounded-tl-3xl" />
            <div className="absolute bottom-0 right-[30%] w-[25%] h-[15%] bg-sky-100/40 rounded-t-2xl" />

            {/* Area labels */}
            <div className="absolute top-[18%] left-[22%] text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
              Test Valley
            </div>
            <div className="absolute top-[40%] left-[38%] text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
              Winchester
            </div>
            <div className="absolute top-[50%] left-[55%] text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
              Eastleigh
            </div>
            <div className="absolute top-[65%] left-[52%] text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
              Fareham
            </div>
            <div className="absolute bottom-[8%] right-[10%] text-[10px] font-medium text-sky-400/80 uppercase tracking-wider">
              The Solent
            </div>

            {/* Site pins */}
            {sites.map((site) => {
              const cfg = STATUS_CONFIG[site.status]
              const isSelected = selectedRef === site.ref
              return (
                <button
                  key={site.ref}
                  onClick={() => onSelect(isSelected ? null : site.ref)}
                  className="absolute group"
                  style={{
                    left: `${site.mapX}%`,
                    top: `${site.mapY}%`,
                    transform: "translate(-50%, -50%)",
                  }}
                >
                  {/* Pin dot */}
                  <div
                    className={`w-4 h-4 rounded-full border-2 border-white shadow-md transition-transform ${cfg.dot} ${
                      isSelected ? "scale-150 ring-2 ring-emerald-400 ring-offset-1" : "group-hover:scale-125"
                    }`}
                  />
                  {/* Tooltip on hover */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                    <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap shadow-lg">
                      <div className="font-medium">{site.name}</div>
                      <div className="text-gray-300 mt-0.5">
                        {site.availableLabel} {site.unitType} available
                      </div>
                      <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45 -mt-1" />
                    </div>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Map legend */}
          <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur rounded-lg border border-slate-200 px-3 py-2 text-[10px] flex flex-wrap gap-x-3 gap-y-1">
            {ALL_STATUSES.filter((s) => sites.some((site) => site.status === s)).map((s) => (
              <span key={s} className="flex items-center gap-1">
                <span className={`w-2 h-2 rounded-full ${STATUS_CONFIG[s].dot}`} />
                <span className="text-gray-500">{s}</span>
              </span>
            ))}
          </div>

          {/* Map title */}
          <div className="absolute top-3 left-3 bg-white/90 backdrop-blur rounded-lg border border-slate-200 px-3 py-1.5">
            <span className="text-xs font-semibold text-gray-700">Hampshire &amp; Solent</span>
          </div>
        </div>
      </div>

      {/* Right: Card list */}
      <div className="lg:w-[45%] border-t lg:border-t-0 lg:border-l border-border/50 overflow-y-auto max-h-[560px]">
        <div className="p-4 space-y-3">
          {sites.map((site) => {
            const isSelected = selectedRef === site.ref
            return (
              <div
                key={site.ref}
                onClick={() => onSelect(isSelected ? null : site.ref)}
                className={`w-full text-left rounded-xl border p-4 transition-all cursor-pointer ${
                  isSelected
                    ? "border-emerald-400 bg-emerald-50/40 shadow-sm ring-1 ring-emerald-200"
                    : "border-border bg-card hover:border-muted-foreground/30 hover:shadow-sm"
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="font-medium text-foreground">{site.name}</div>
                    <div className="text-xs text-muted-foreground">{site.ref} · {site.contact}</div>
                  </div>
                  <StatusBadge status={site.status} />
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <CatchmentPill catchment={site.catchment} />
                  <UnitTypeBadge type={site.unitType} />
                </div>
                <CapacityBar
                  total={site.total}
                  allocated={site.allocated}
                  available={site.available}
                  totalLabel={site.totalLabel}
                  allocatedLabel={site.allocatedLabel}
                  availableLabel={site.availableLabel}
                />
                <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                  <span>Price: {site.priceLabel} / unit</span>
                  <Link
                    href={`/admin/brokerage-mockups/sites/${site.ref}`}
                    className="flex items-center gap-1 text-emerald-600 font-medium hover:text-emerald-700"
                    onClick={(e) => e.stopPropagation()}
                  >
                    View <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            )
          })}
          {sites.length === 0 && (
            <div className="text-center py-12 text-muted-foreground text-sm">
              No sites match the current filters.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// V3: Card Grid View
// ---------------------------------------------------------------------------

function GridView({ sites }: { sites: Site[] }) {
  return (
    <div className="p-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {sites.map((site) => {
          const capacityPct =
            site.total !== null && site.total > 0
              ? Math.round(((site.available ?? 0) / site.total) * 100)
              : null

          return (
            <Link
              key={site.ref}
              href={`/admin/brokerage-mockups/sites/${site.ref}`}
              className="group bg-card border border-border rounded-xl hover:shadow-md hover:border-muted-foreground/30 transition-all cursor-pointer flex flex-col"
            >
              {/* Card header */}
              <div className="p-4 pb-3 border-b border-border/50">
                <div className="flex items-start justify-between mb-1">
                  <span className="text-[11px] font-mono text-muted-foreground">{site.ref}</span>
                  <StatusBadge status={site.status} />
                </div>
                <h3 className="font-semibold text-foreground group-hover:text-emerald-700 transition-colors">
                  {site.name}
                </h3>
                <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                  <User className="w-3 h-3" />
                  {site.contact}
                </div>
              </div>

              {/* Card body */}
              <div className="p-4 flex-1 flex flex-col gap-3">
                {/* Tags */}
                <div className="flex items-center gap-2 flex-wrap">
                  <CatchmentPill catchment={site.catchment} />
                  <UnitTypeBadge type={site.unitType} />
                  <span className="text-[11px] text-muted-foreground">{site.lpa}</span>
                </div>

                {/* Capacity gauge */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Capacity</span>
                    {capacityPct !== null ? (
                      <span className="font-medium text-foreground/80">{site.totalLabel} total</span>
                    ) : (
                      <span className="text-muted-foreground italic">TBD</span>
                    )}
                  </div>
                  {site.total !== null && site.total > 0 ? (
                    <div className="space-y-1">
                      <div className="h-3 bg-muted rounded-full overflow-hidden flex">
                        <div
                          className="h-full bg-blue-400 transition-all"
                          style={{ width: `${Math.round((site.allocated / site.total) * 100)}%` }}
                        />
                        <div
                          className="h-full bg-green-400 transition-all"
                          style={{ width: `${Math.round(((site.available ?? 0) / site.total) * 100)}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px]">
                        <span className="text-blue-600">{site.allocatedLabel} allocated</span>
                        <span className="text-green-600 font-medium">{site.availableLabel} available</span>
                      </div>
                    </div>
                  ) : (
                    <div className="h-3 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-muted-foreground/20 rounded-full animate-pulse" style={{ width: "25%" }} />
                    </div>
                  )}
                </div>

                {/* Key metrics */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div className="bg-muted/50 rounded-lg px-3 py-2">
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Available</div>
                    <div className="text-sm font-semibold text-foreground mt-0.5">
                      <AvailableCell available={site.available} availableLabel={site.availableLabel} />
                    </div>
                  </div>
                  <div className="bg-muted/50 rounded-lg px-3 py-2">
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Price</div>
                    <div className="text-sm font-semibold text-foreground mt-0.5">
                      {site.price !== null ? site.priceLabel : <span className="text-muted-foreground italic font-normal">TBD</span>}
                    </div>
                  </div>
                </div>
              </div>

              {/* Card footer */}
              <div className="px-4 py-3 border-t border-border/50 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{site.lpa} district</span>
                <span className="text-xs font-medium text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                  View details <ExternalLink className="w-3 h-3" />
                </span>
              </div>
            </Link>
          )
        })}
      </div>
      {sites.length === 0 && (
        <div className="text-center py-12 text-muted-foreground text-sm">
          No sites match the current filters.
        </div>
      )}
    </div>
  )
}
