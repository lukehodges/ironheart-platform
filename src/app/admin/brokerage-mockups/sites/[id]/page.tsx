"use client"

import { useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import {
  ChevronRight,
  Edit,
  MoreHorizontal,
  MapPin,
  Phone,
  Mail,
  User,
  FileText,
  Download,
  Upload,
  ExternalLink,
  Calendar,
  Shield,
  Clock,
  ArrowUpRight,
  Leaf,
  Archive,
  FileDown,
  ClipboardCheck,
  Pencil,
  MailIcon,
  ArrowRight,
  TreeDeciduous,
  Sprout,
  Globe,
  Building2,
} from "lucide-react"
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts"

import {
  sites as sharedSites,
  assessments as sharedAssessments,
  deals as sharedDeals,
  documents as sharedDocuments,
  contacts as sharedContacts,
} from "../../_mock-data"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"

// ---------------------------------------------------------------------------
// Site data lookup
// ---------------------------------------------------------------------------

interface SiteData {
  ref: string
  name: string
  status: "Active" | "Registered" | "Under Assessment" | "Legal In Progress" | "Prospecting" | "Fully Allocated"
  address: string
  lat: number
  lng: number
  catchment: string
  lpa: string
  region: string
  owner: { name: string; role: string; company: string; phone: string; email: string; initials: string }
  registration: { ref: string; date: string; agreement: string; commitment: string; expires: string; cost: string }
  baseline: { landUse: string; area: string; soil: string; currentLoading: string; proposedLoading: string; mitigation: string }
  allocations: { ref: string; deal: string; buyer: string; quantity: string; unitPrice: string; total: string; status: "Delivered" | "Confirmed" | "Reserved"; date: string }[]
  documents: { name: string; type: string; size: string; uploaded: string; by: string }[]
  linkedDeals: { ref: string; title: string; stage: string; contact: string; value: string }[]
  activities: { icon: string; time: string; user: string; text: string }[]
  capacityData: { name: string; value: number; color: string }[]
  capacityTotal: number
  capacityAllocated: number
  capacityAvailable: number
  complianceItems: { title: string; due: string; status: "Upcoming" | "Due Soon" | "Overdue" }[]
  assessment: { date: string; assessor: string; initials: string; type: string }
}

const SITES_DATA: Record<string, SiteData> = {
  "S-0005": {
    ref: "S-0005",
    name: "Manor Fields",
    status: "Active",
    address: "Manor Farm Lane, Kings Worthy, Winchester, SO21 1HR",
    lat: 51.0925,
    lng: -1.3108,
    catchment: "Solent",
    lpa: "Winchester City Council",
    region: "Hampshire",
    owner: { name: "David Ashford", role: "Landowner", company: "Ashford Farm Estate", phone: "07700 900456", email: "d.ashford@ashfordfarm.co.uk", initials: "DA" },
    registration: { ref: "NE-SOL-2024-0087", date: "14 Nov 2024", agreement: "S106", commitment: "30 years", expires: "14 Nov 2054", cost: "\u00a34,200" },
    baseline: { landUse: "Arable", area: "12.4 ha", soil: "Clay", currentLoading: "142 kg N/yr", proposedLoading: "47 kg N/yr", mitigation: "Land Use Change" },
    allocations: [
      { ref: "A-0008", deal: "D-0035", buyer: "Barratt Homes", quantity: "45 kg N/yr", unitPrice: "\u00a33,000", total: "\u00a3135,000", status: "Delivered", date: "Nov 2025" },
      { ref: "A-0012", deal: "D-0038", buyer: "Taylor Wimpey", quantity: "45 kg N/yr", unitPrice: "\u00a33,000", total: "\u00a3135,000", status: "Reserved", date: "Mar 2026" },
      { ref: "A-0003", deal: "D-0029", buyer: "Persimmon Homes", quantity: "5 kg N/yr", unitPrice: "\u00a32,800", total: "\u00a314,000", status: "Confirmed", date: "Sep 2025" },
    ],
    documents: [
      { name: "ManorFields_NE_Registration.pdf", type: "PDF", size: "2.4 MB", uploaded: "14 Nov 2024", by: "James Harris" },
      { name: "ManorFields_S106_Agreement.pdf", type: "PDF", size: "1.8 MB", uploaded: "10 Nov 2024", by: "James Harris" },
      { name: "ManorFields_SiteAssessment_2024.pdf", type: "PDF", size: "4.1 MB", uploaded: "8 Oct 2024", by: "Tom Jenkins" },
      { name: "ManorFields_BoundaryPlan.dwg", type: "DWG", size: "12.6 MB", uploaded: "15 Sep 2024", by: "Sarah Croft" },
    ],
    linkedDeals: [
      { ref: "D-0035", title: "Whiteley Farm Nitrogen Credits", stage: "Completed", contact: "Barratt Homes", value: "\u00a3360,000" },
      { ref: "D-0038", title: "Manor Fields N Credits", stage: "Credits Reserved", contact: "Taylor Wimpey", value: "\u00a3135,000" },
    ],
    activities: [
      { icon: "stage", time: "5 Mar 2026", user: "James Harris", text: "Deal D-0038 moved to Credits Reserved" },
      { icon: "note", time: "4 Mar 2026", user: "James Harris", text: "Note: 'Taylor Wimpey legal team confirmed. Awaiting deposit.'" },
      { icon: "email", time: "28 Feb 2026", user: "System", text: "Email sent to Rachel Morrison: Credit Reservation Confirmation" },
      { icon: "stage", time: "14 Nov 2024", user: "James Harris", text: "Site registered with Natural England (NE-SOL-2024-0087)" },
      { icon: "doc", time: "8 Oct 2024", user: "Tom Jenkins", text: "Site assessment completed and report uploaded" },
    ],
    capacityData: [
      { name: "Allocated", value: 50, color: "#3b82f6" },
      { name: "Available", value: 45, color: "#22c55e" },
    ],
    capacityTotal: 95,
    capacityAllocated: 50,
    capacityAvailable: 45,
    complianceItems: [
      { title: "Annual Habitat Monitoring", due: "14 Nov 2026", status: "Upcoming" },
      { title: "NE Registry Update", due: "14 Nov 2026", status: "Upcoming" },
      { title: "S106 Compliance Review", due: "14 May 2026", status: "Due Soon" },
    ],
    assessment: { date: "8 Oct 2024", assessor: "Tom Jenkins", initials: "TJ", type: "Nutrient Site Assessment" },
  },
  "S-0001": {
    ref: "S-0001",
    name: "Whiteley Farm",
    status: "Active",
    address: "Whiteley Lane, Fareham, Hampshire, PO15 7LJ",
    lat: 50.8862,
    lng: -1.2487,
    catchment: "Solent",
    lpa: "Winchester City Council",
    region: "Hampshire",
    owner: { name: "Robert Whiteley", role: "Landowner", company: "Whiteley Farms Ltd", phone: "07700 900123", email: "r.whiteley@whiteleyfarms.co.uk", initials: "RW" },
    registration: { ref: "NE-SOL-2023-0042", date: "15 Mar 2023", agreement: "S106", commitment: "30 years", expires: "15 Mar 2053", cost: "\u00a33,800" },
    baseline: { landUse: "Grassland", area: "18.2 ha", soil: "Loam", currentLoading: "210 kg N/yr", proposedLoading: "30 kg N/yr", mitigation: "Land Use Change" },
    allocations: [
      { ref: "A-0001", deal: "D-0029", buyer: "Persimmon Homes", quantity: "80 kg N/yr", unitPrice: "\u00a33,200", total: "\u00a3256,000", status: "Delivered", date: "Jun 2024" },
      { ref: "A-0002", deal: "D-0035", buyer: "Barratt Homes", quantity: "85 kg N/yr", unitPrice: "\u00a33,200", total: "\u00a3272,000", status: "Delivered", date: "Sep 2024" },
    ],
    documents: [
      { name: "WhiteleyFarm_NE_Registration.pdf", type: "PDF", size: "2.1 MB", uploaded: "15 Mar 2023", by: "James Harris" },
      { name: "WhiteleyFarm_S106_Agreement.pdf", type: "PDF", size: "1.6 MB", uploaded: "10 Mar 2023", by: "James Harris" },
      { name: "WhiteleyFarm_SiteAssessment.pdf", type: "PDF", size: "3.8 MB", uploaded: "1 Feb 2023", by: "Tom Jenkins" },
    ],
    linkedDeals: [
      { ref: "D-0029", title: "Persimmon N Credits Batch 1", stage: "Completed", contact: "Persimmon Homes", value: "\u00a3256,000" },
      { ref: "D-0035", title: "Barratt Whiteley Credits", stage: "Completed", contact: "Barratt Homes", value: "\u00a3272,000" },
    ],
    activities: [
      { icon: "stage", time: "15 Sep 2024", user: "James Harris", text: "Deal D-0035 completed - all credits delivered" },
      { icon: "email", time: "10 Sep 2024", user: "System", text: "Final credit certificate sent to Barratt Homes" },
      { icon: "stage", time: "20 Jun 2024", user: "James Harris", text: "Deal D-0029 completed - all credits delivered" },
      { icon: "doc", time: "1 Feb 2023", user: "Tom Jenkins", text: "Site assessment completed and report uploaded" },
    ],
    capacityData: [
      { name: "Allocated", value: 165, color: "#3b82f6" },
      { name: "Available", value: 15, color: "#22c55e" },
    ],
    capacityTotal: 180,
    capacityAllocated: 165,
    capacityAvailable: 15,
    complianceItems: [
      { title: "Annual Habitat Monitoring Report", due: "28 Feb 2026", status: "Overdue" },
      { title: "NE Registry Update", due: "20 Mar 2026", status: "Upcoming" },
    ],
    assessment: { date: "1 Feb 2023", assessor: "Tom Jenkins", initials: "TJ", type: "Nutrient Site Assessment" },
  },
}

// Default fallback for unrecognized IDs
const DEFAULT_SITE_REF = "S-0005"

// Module-level mutable references - set by the page component before render
let site = { ref: SITES_DATA[DEFAULT_SITE_REF].ref, name: SITES_DATA[DEFAULT_SITE_REF].name, status: SITES_DATA[DEFAULT_SITE_REF].status, address: SITES_DATA[DEFAULT_SITE_REF].address, lat: SITES_DATA[DEFAULT_SITE_REF].lat, lng: SITES_DATA[DEFAULT_SITE_REF].lng, catchment: SITES_DATA[DEFAULT_SITE_REF].catchment, lpa: SITES_DATA[DEFAULT_SITE_REF].lpa, region: SITES_DATA[DEFAULT_SITE_REF].region }
let owner = SITES_DATA[DEFAULT_SITE_REF].owner
let registration = SITES_DATA[DEFAULT_SITE_REF].registration
let baseline = SITES_DATA[DEFAULT_SITE_REF].baseline
let allocations = SITES_DATA[DEFAULT_SITE_REF].allocations
let documents = SITES_DATA[DEFAULT_SITE_REF].documents
let linkedDeals = SITES_DATA[DEFAULT_SITE_REF].linkedDeals
let activities = SITES_DATA[DEFAULT_SITE_REF].activities
let capacityData = SITES_DATA[DEFAULT_SITE_REF].capacityData
let complianceItems = SITES_DATA[DEFAULT_SITE_REF].complianceItems
let assessment = SITES_DATA[DEFAULT_SITE_REF].assessment

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const allocationStatusColor: Record<string, string> = {
  Delivered: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Confirmed: "bg-blue-50 text-blue-700 border-blue-200",
  Reserved: "bg-amber-50 text-amber-700 border-amber-200",
}

const dealStageColor: Record<string, string> = {
  Completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  "Credits Reserved": "bg-amber-50 text-amber-700 border-amber-200",
}

const complianceStatusColor: Record<string, string> = {
  Upcoming: "text-emerald-600",
  "Due Soon": "text-amber-600",
  Overdue: "text-red-600",
}

const complianceBorderColor: Record<string, string> = {
  Upcoming: "border-l-emerald-400",
  "Due Soon": "border-l-amber-400",
  Overdue: "border-l-red-400",
}

// ── BNG helpers ──────────────────────────────────────────────────────────────

const DISTINCTIVENESS_LABELS: Record<string, string> = {
  v_low: "V.Low", low: "Low", medium: "Medium", high: "High", v_high: "V.High",
}

const DISTINCTIVENESS_COLORS: Record<string, string> = {
  v_low: "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300",
  low: "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300",
  medium: "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300",
  high: "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-300",
  v_high: "bg-green-100 text-green-800 border-green-300 dark:bg-green-900/40 dark:text-green-300",
}

const CONDITION_LABELS: Record<string, string> = {
  poor: "Poor", fairly_poor: "Fairly Poor", moderate: "Moderate",
  fairly_good: "Fairly Good", good: "Good",
}

const CATEGORY_LABELS: Record<string, string> = {
  area: "Areas", hedgerow: "Hedgerows", watercourse: "Watercourses", individual_tree: "Ind. Trees",
}

function activityIcon(type: string) {
  switch (type) {
    case "stage":
      return <ArrowRight className="w-3.5 h-3.5 text-blue-500" />
    case "note":
      return <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
    case "email":
      return <MailIcon className="w-3.5 h-3.5 text-indigo-500" />
    case "doc":
      return <FileText className="w-3.5 h-3.5 text-emerald-500" />
    default:
      return <Clock className="w-3.5 h-3.5 text-muted-foreground" />
  }
}

// ── BNG Site Content (habitat tabs + enriched sidebar) ───────────────────────

function BNGSiteContent({ sharedSite }: { sharedSite: NonNullable<ReturnType<typeof sharedSites.find>> }) {
  const [activeTab, setActiveTab] = useState("summary")
  const [baselineFilter, setBaselineFilter] = useState<string>("all")
  const [enhancementFilter, setEnhancementFilter] = useState<string>("all")

  const habitatSummary = sharedSite.habitatSummary ?? []
  const baselineHabitats = sharedSite.baselineHabitats ?? []
  const improvementHabitats = sharedSite.improvementHabitats ?? []

  const filteredBaseline = baselineFilter === "all"
    ? baselineHabitats
    : baselineHabitats.filter(h => h.category === baselineFilter)

  const filteredImprovement = enhancementFilter === "all"
    ? improvementHabitats
    : improvementHabitats.filter(h => h.category === enhancementFilter)

  const totalBaselineHUs = habitatSummary.reduce((s, r) => s + r.baselineUnits, 0)
  const totalImprovementHUs = habitatSummary.reduce((s, r) => s + r.improvementUnits, 0)
  const totalHUGain = habitatSummary.reduce((s, r) => s + r.unitGain, 0)
  const totalAllocatedHUs = habitatSummary.reduce((s, r) => s + r.allocatedUnits, 0)

  return (
    <div className="mt-6 space-y-6">
      {/* Top stat cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-xs text-muted-foreground">Net HU Gain</p>
          <p className="mt-1 text-2xl font-bold text-green-600 dark:text-green-400">+{totalHUGain.toFixed(1)}</p>
          <p className="text-xs text-muted-foreground">area HUs</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-xs text-muted-foreground">Improvement HUs</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{totalImprovementHUs.toFixed(1)}</p>
          <p className="text-xs text-muted-foreground">total capacity</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-xs text-muted-foreground">Allocated</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{totalAllocatedHUs.toFixed(1)}</p>
          <p className="text-xs text-muted-foreground">area HUs</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-xs text-muted-foreground">Available</p>
          <p className="mt-1 text-2xl font-bold text-blue-600 dark:text-blue-400">
            {(totalImprovementHUs - totalAllocatedHUs).toFixed(1)}
          </p>
          <p className="text-xs text-muted-foreground">area HUs</p>
        </div>
      </div>

      {/* Main tabs */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px]">
        <div>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="summary">Habitat Summary</TabsTrigger>
              <TabsTrigger value="baseline">Baseline</TabsTrigger>
              <TabsTrigger value="enhancement">Enhancement</TabsTrigger>
              <TabsTrigger value="allocations">Allocations</TabsTrigger>
            </TabsList>

            {/* ── Habitat Summary tab ─────────────────────────────────── */}
            <TabsContent value="summary">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Habitat Category Summary</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Mirrors Natural England Biodiversity Gain Site Register format
                  </p>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="text-xs">
                          <TableHead>Category</TableHead>
                          <TableHead className="text-right">Parcels</TableHead>
                          <TableHead className="text-right">Baseline</TableHead>
                          <TableHead className="text-right">Baseline HUs</TableHead>
                          <TableHead className="text-right">Improvement</TableHead>
                          <TableHead className="text-right">Improve HUs</TableHead>
                          <TableHead className="text-right">HU Gain</TableHead>
                          <TableHead className="text-right">Alloc'd HUs</TableHead>
                          <TableHead className="text-right">% Alloc</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {["area", "hedgerow", "watercourse", "individual_tree"].map(cat => {
                          const row = habitatSummary.find(r => r.category === cat)
                          if (!row) {
                            return (
                              <TableRow key={cat} className="text-muted-foreground">
                                <TableCell className="font-medium">{CATEGORY_LABELS[cat]}</TableCell>
                                <TableCell className="text-right">0</TableCell>
                                <TableCell className="text-right">—</TableCell>
                                <TableCell className="text-right">—</TableCell>
                                <TableCell className="text-right">—</TableCell>
                                <TableCell className="text-right">—</TableCell>
                                <TableCell className="text-right">—</TableCell>
                                <TableCell className="text-right">—</TableCell>
                                <TableCell className="text-right">—</TableCell>
                              </TableRow>
                            )
                          }
                          const parcelCount = row.baselineParcelCount + row.improvementParcelCount
                          return (
                            <TableRow key={cat}>
                              <TableCell className="font-medium text-foreground">{row.categoryLabel}</TableCell>
                              <TableCell className="text-right">{parcelCount}</TableCell>
                              <TableCell className="text-right text-muted-foreground">
                                {row.baselineSize} {row.sizeUnit}
                              </TableCell>
                              <TableCell className="text-right">{row.baselineUnits.toFixed(2)}</TableCell>
                              <TableCell className="text-right text-muted-foreground">
                                {row.improvementSize} {row.sizeUnit}
                              </TableCell>
                              <TableCell className="text-right">{row.improvementUnits.toFixed(2)}</TableCell>
                              <TableCell className="text-right">
                                <span className="font-semibold text-green-600 dark:text-green-400">
                                  +{row.unitGain.toFixed(2)}
                                </span>
                              </TableCell>
                              <TableCell className="text-right">{row.allocatedUnits.toFixed(2)}</TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <Progress value={row.allocatedPercent} className="h-1.5 w-16" />
                                  <span className="text-xs text-muted-foreground w-10 text-right">
                                    {row.allocatedPercent.toFixed(1)}%
                                  </span>
                                </div>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                      <tfoot>
                        <tr className="border-t border-border font-semibold bg-muted/30">
                          <td className="px-4 py-2 text-sm font-semibold text-foreground">TOTAL</td>
                          <td className="px-4 py-2 text-sm text-right">
                            {habitatSummary.reduce((s, r) => s + r.baselineParcelCount + r.improvementParcelCount, 0)}
                          </td>
                          <td className="px-4 py-2" />
                          <td className="px-4 py-2 text-sm text-right">{totalBaselineHUs.toFixed(2)}</td>
                          <td className="px-4 py-2" />
                          <td className="px-4 py-2 text-sm text-right">{totalImprovementHUs.toFixed(2)}</td>
                          <td className="px-4 py-2 text-sm text-right text-green-600 dark:text-green-400 font-semibold">
                            +{totalHUGain.toFixed(2)}
                          </td>
                          <td className="px-4 py-2 text-sm text-right">{totalAllocatedHUs.toFixed(2)}</td>
                          <td className="px-4 py-2" />
                        </tr>
                      </tfoot>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── Baseline tab ────────────────────────────────────────── */}
            <TabsContent value="baseline">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base">Baseline Habitats</CardTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {baselineHabitats.length} parcels surveyed · {baselineHabitats.reduce((s, p) => s + p.size, 0).toFixed(1)} ha + {baselineHabitats.filter(p => p.category === "hedgerow").reduce((s, p) => s + p.size, 0).toFixed(1)} km hedgerow
                      </p>
                    </div>
                    <select
                      value={baselineFilter}
                      onChange={e => setBaselineFilter(e.target.value)}
                      className="text-xs rounded-md border border-border bg-background px-2 py-1 text-foreground"
                    >
                      <option value="all">All Categories</option>
                      <option value="area">Areas</option>
                      <option value="hedgerow">Hedgerows</option>
                    </select>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="text-xs">
                        <TableHead>Habitat Type</TableHead>
                        <TableHead>Broad Type</TableHead>
                        <TableHead>Distinctiveness</TableHead>
                        <TableHead>Condition</TableHead>
                        <TableHead className="text-right">Parcels</TableHead>
                        <TableHead className="text-right">Size</TableHead>
                        <TableHead className="text-right">HUs</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredBaseline.map(p => (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium text-foreground text-sm">
                            {p.specificHabitatType}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">{p.broadHabitatType}</TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-xs font-medium ${DISTINCTIVENESS_COLORS[p.distinctiveness]}`}>
                              {DISTINCTIVENESS_LABELS[p.distinctiveness]}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground capitalize">
                            {CONDITION_LABELS[p.condition]}
                          </TableCell>
                          <TableCell className="text-right text-sm">{p.parcelCount}</TableCell>
                          <TableCell className="text-right text-sm">{p.size} {p.sizeUnit}</TableCell>
                          <TableCell className="text-right text-sm font-mono">{p.biodiversityUnits.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                    <tfoot>
                      <tr className="border-t border-border bg-muted/30">
                        <td colSpan={4} className="px-4 py-2 text-sm font-semibold text-foreground">TOTAL</td>
                        <td className="px-4 py-2 text-sm font-semibold text-right">
                          {filteredBaseline.reduce((s, p) => s + p.parcelCount, 0)}
                        </td>
                        <td className="px-4 py-2" />
                        <td className="px-4 py-2 text-sm font-semibold text-right font-mono">
                          {filteredBaseline.reduce((s, p) => s + p.biodiversityUnits, 0).toFixed(2)}
                        </td>
                      </tr>
                    </tfoot>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── Enhancement tab ─────────────────────────────────────── */}
            <TabsContent value="enhancement">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base">Enhancement Habitats</CardTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Target habitat types after management · temporal risk multipliers applied
                      </p>
                    </div>
                    <select
                      value={enhancementFilter}
                      onChange={e => setEnhancementFilter(e.target.value)}
                      className="text-xs rounded-md border border-border bg-background px-2 py-1 text-foreground"
                    >
                      <option value="all">All Categories</option>
                      <option value="area">Areas</option>
                      <option value="hedgerow">Hedgerows</option>
                    </select>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="text-xs">
                        <TableHead>Habitat Type</TableHead>
                        <TableHead>Distinctiveness</TableHead>
                        <TableHead>Condition</TableHead>
                        <TableHead className="text-right">Parcels</TableHead>
                        <TableHead className="text-right">Size</TableHead>
                        <TableHead className="text-right">HUs</TableHead>
                        <TableHead className="text-right">HU Gain</TableHead>
                        <TableHead className="text-right">% Alloc</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredImprovement.map(p => (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium text-foreground text-sm">
                            <div>{p.specificHabitatType}</div>
                            {p.temporalRisk !== null && (
                              <div className="text-xs text-muted-foreground">
                                Temporal risk ×{p.temporalRisk}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-xs font-medium ${DISTINCTIVENESS_COLORS[p.distinctiveness]}`}>
                              {DISTINCTIVENESS_LABELS[p.distinctiveness]}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {CONDITION_LABELS[p.condition]}
                          </TableCell>
                          <TableCell className="text-right text-sm">{p.parcelCount}</TableCell>
                          <TableCell className="text-right text-sm">{p.size} {p.sizeUnit}</TableCell>
                          <TableCell className="text-right text-sm font-mono">{p.biodiversityUnits.toFixed(2)}</TableCell>
                          <TableCell className="text-right text-sm">
                            {p.unitGain !== null ? (
                              <span className="font-semibold text-green-600 dark:text-green-400">
                                +{p.unitGain.toFixed(2)}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Progress value={p.allocatedPercent} className="h-1.5 w-12" />
                              <span className="text-xs text-muted-foreground w-8 text-right">
                                {p.allocatedPercent.toFixed(0)}%
                              </span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                    <tfoot>
                      <tr className="border-t border-border bg-muted/30">
                        <td colSpan={3} className="px-4 py-2 text-sm font-semibold text-foreground">TOTAL</td>
                        <td className="px-4 py-2 text-sm font-semibold text-right">
                          {filteredImprovement.reduce((s, p) => s + p.parcelCount, 0)}
                        </td>
                        <td className="px-4 py-2" />
                        <td className="px-4 py-2 text-sm font-semibold text-right font-mono">
                          {filteredImprovement.reduce((s, p) => s + p.biodiversityUnits, 0).toFixed(2)}
                        </td>
                        <td className="px-4 py-2 text-sm font-semibold text-right text-green-600 dark:text-green-400">
                          +{totalHUGain.toFixed(2)}
                        </td>
                        <td className="px-4 py-2" />
                      </tr>
                    </tfoot>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── Allocations tab ──────────────────────────────────────── */}
            <TabsContent value="allocations">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Allocations</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    No allocations yet — site is Under Assessment
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="rounded-full bg-muted p-4 mb-3">
                      <Leaf className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium text-foreground">No allocations yet</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Allocations will appear here once the site is registered and matched to developments.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* BNG right sidebar */}
        <div className="space-y-4">
          {/* Registration */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Shield className="h-4 w-4 text-muted-foreground" />
                Registration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">BGS Reference</p>
                <p className="font-mono font-medium text-foreground">{sharedSite.bgsReference ?? "Pending"}</p>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-xs text-muted-foreground">Legal Agreement</p>
                  <p className="font-medium text-foreground">{sharedSite.legalAgreement ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Commitment</p>
                  <p className="font-medium text-foreground">{sharedSite.commitmentYears ?? 30} years</p>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Enhancement Start</p>
                <p className="font-medium text-foreground">{sharedSite.enhancementStartDate ?? "TBD"}</p>
              </div>
            </CardContent>
          </Card>

          {/* Geography */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Globe className="h-4 w-4 text-muted-foreground" />
                Geography
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">National Character Area</p>
                <p className="font-medium text-foreground">{sharedSite.nationalCharacterArea ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">LNRS Area</p>
                <p className="font-medium text-foreground">{sharedSite.lnrsArea ?? "—"}</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-xs text-muted-foreground">LPA</p>
                  <p className="font-medium text-foreground">{sharedSite.lpa}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">IMD Decile</p>
                  <p className="font-medium text-foreground">{sharedSite.imdDecile ?? "—"} / 10</p>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">LSOA</p>
                <p className="font-medium text-foreground">{sharedSite.lsoa ?? "—"}</p>
              </div>
            </CardContent>
          </Card>

          {/* Metric */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Sprout className="h-4 w-4 text-muted-foreground" />
                Biodiversity Metric
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Metric Version</p>
                <p className="font-medium text-foreground">{sharedSite.metricVersion ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">HMMP Status</p>
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                  sharedSite.hmmpStatus === "approved"
                    ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300"
                    : sharedSite.hmmpStatus === "submitted"
                    ? "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300"
                    : "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                }`}>
                  {sharedSite.hmmpStatus ?? "not started"}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

// ── Nutrient Budget Card ─────────────────────────────────────────────────────

function NutrientBudgetCard({ sharedSite }: { sharedSite: NonNullable<ReturnType<typeof sharedSites.find>> }) {
  if (!sharedSite.baselineLoading || !sharedSite.proposedLoading) return null
  const creditYield = sharedSite.baselineLoading - sharedSite.proposedLoading
  const reductionPct = Math.round((creditYield / sharedSite.baselineLoading) * 100)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Leaf className="h-4 w-4 text-emerald-500" />
          Nutrient Budget
        </CardTitle>
        {sharedSite.mitigationType && (
          <p className="text-sm text-muted-foreground">{sharedSite.mitigationType}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3 font-mono text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Baseline loading</span>
            <span className="font-semibold text-foreground">{sharedSite.baselineLoading.toLocaleString()} kg N/yr</span>
          </div>
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="pl-2">({(sharedSite.baselineLoading / sharedSite.areaHectares).toFixed(2)} kg N/ha/yr × {sharedSite.areaHectares} ha)</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Proposed loading</span>
            <span className="font-semibold text-foreground">− {sharedSite.proposedLoading.toLocaleString()} kg N/yr</span>
          </div>
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="pl-2">({(sharedSite.proposedLoading / sharedSite.areaHectares).toFixed(2)} kg N/ha/yr × {sharedSite.areaHectares} ha)</span>
          </div>
          <div className="h-px bg-border" />
          <div className="flex items-center justify-between">
            <span className="font-medium text-foreground">Credit yield</span>
            <span className="font-bold text-green-600 dark:text-green-400">{creditYield.toLocaleString()} kg N/yr</span>
          </div>
        </div>
        <div className="rounded-lg border-2 border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-950/30 text-center">
          <p className="text-sm font-semibold text-green-800 dark:text-green-300">
            {reductionPct}% reduction in nitrogen loading to watercourse
          </p>
          <p className="text-xs text-green-700 dark:text-green-400 mt-0.5">
            {creditYield.toLocaleString()} kg/yr available · {sharedSite.legalAgreement ?? "S106"} · {sharedSite.commitmentYears ?? 80}-year commitment
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

function GeographyCard({ sharedSite }: { sharedSite: NonNullable<ReturnType<typeof sharedSites.find>> }) {
  if (!sharedSite.nationalCharacterArea && !sharedSite.lnrsArea) return null
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Globe className="h-4 w-4 text-muted-foreground" />
          Geography
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {sharedSite.nationalCharacterArea && (
          <div>
            <p className="text-xs text-muted-foreground">National Character Area</p>
            <p className="font-medium text-foreground">{sharedSite.nationalCharacterArea}</p>
          </div>
        )}
        {sharedSite.lnrsArea && (
          <div>
            <p className="text-xs text-muted-foreground">LNRS Area</p>
            <p className="font-medium text-foreground">{sharedSite.lnrsArea}</p>
          </div>
        )}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <p className="text-xs text-muted-foreground">Catchment</p>
            <p className="font-medium text-foreground">{sharedSite.catchment}</p>
          </div>
          {sharedSite.lsoa && (
            <div>
              <p className="text-xs text-muted-foreground">LSOA</p>
              <p className="font-medium text-foreground">{sharedSite.lsoa}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Shared sub-components used by both layouts
// ---------------------------------------------------------------------------

const STATUS_BADGE_COLORS: Record<string, string> = {
  Active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Registered: "bg-green-50 text-green-700 border-green-200",
  "Under Assessment": "bg-blue-50 text-blue-700 border-blue-200",
  "Legal In Progress": "bg-amber-50 text-amber-700 border-amber-200",
  "Fully Allocated": "bg-purple-50 text-purple-700 border-purple-200",
}

function PageHeader({ variant, setVariant }: { variant: "v1" | "v2"; setVariant: (v: "v1" | "v2") => void }) {
  const badgeColor = STATUS_BADGE_COLORS[site.status] ?? "bg-slate-50 text-slate-700 border-slate-200"

  return (
    <div className="border-b border-border bg-background">
      <div className="max-w-screen-2xl mx-auto px-6 py-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-4">
          <Link href="/admin/brokerage-mockups/sites" className="hover:text-foreground transition-colors">
            Sites
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-foreground font-medium">{site.ref}</span>
        </div>

        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">{site.name}</h1>
            <Badge className={badgeColor}>{site.status}</Badge>
          </div>

          <div className="flex items-center gap-2">
            {/* Layout toggle */}
            <div className="flex items-center bg-muted rounded-lg p-1 mr-2">
              <button
                onClick={() => setVariant("v1")}
                className={`text-xs px-2.5 py-1 rounded-md transition-colors font-medium ${
                  variant === "v1" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Two-Column
              </button>
              <button
                onClick={() => setVariant("v2")}
                className={`text-xs px-2.5 py-1 rounded-md transition-colors font-medium ${
                  variant === "v2" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Tabbed
              </button>
            </div>

            <Button variant="outline" size="sm">
              <Edit className="w-3.5 h-3.5" />
              Edit
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon-sm">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <Archive className="w-4 h-4" />
                  Archive
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <FileDown className="w-4 h-4" />
                  Export
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </div>
  )
}

function LocationSection() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <MapPin className="w-4 h-4 text-muted-foreground" />
          Location
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-foreground">{site.address}</p>

        {/* Map placeholder */}
        <div className="w-full h-48 bg-muted rounded-lg flex items-center justify-center border border-border">
          <div className="text-center">
            <MapPin className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">Map view</p>
            <p className="text-[10px] text-muted-foreground/60 mt-0.5">
              {site.lat}, {site.lng}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 pt-1">
          <div>
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">Catchment</p>
            <Badge variant="outline" className="text-xs font-medium">{site.catchment}</Badge>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">LPA</p>
            <p className="text-sm font-medium">{site.lpa}</p>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">Region</p>
            <p className="text-sm font-medium">{site.region}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function OwnerCard() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <User className="w-4 h-4 text-muted-foreground" />
          Site Owner
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-start gap-3">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-emerald-100 text-emerald-700 text-sm font-semibold">
              {owner.initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold">{owner.name}</p>
              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] px-1.5 py-0">
                Supply
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">{owner.role}</p>
            <p className="text-xs text-muted-foreground">{owner.company}</p>
            <div className="flex items-center gap-4 mt-2">
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Phone className="w-3 h-3" />
                {owner.phone}
              </span>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Mail className="w-3 h-3" />
                {owner.email}
              </span>
            </div>
          </div>
          <Button variant="ghost" size="icon-sm" asChild>
            <Link href={`/admin/brokerage-mockups/contacts/${sharedSites.find((s) => s.ref === site.ref)?.contact ?? "C-005"}`}>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function RegistrationSection() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <ClipboardCheck className="w-4 h-4 text-muted-foreground" />
          Registration Details
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4">
          <div>
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">Registry Ref</p>
            <p className="text-sm font-medium font-mono">{registration.ref}</p>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">Registered</p>
            <p className="text-sm font-medium">{registration.date}</p>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">Legal Agreement</p>
            <p className="text-sm font-medium">{registration.agreement}</p>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">Commitment</p>
            <p className="text-sm font-medium">{registration.commitment}</p>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">Expires</p>
            <p className="text-sm font-medium">{registration.expires}</p>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">Registration Cost</p>
            <p className="text-sm font-medium">{registration.cost}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function BaselineSection() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Leaf className="w-4 h-4 text-muted-foreground" />
          Baseline Data
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4">
          <div>
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">Current Land Use</p>
            <p className="text-sm font-medium">{baseline.landUse}</p>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">Site Area</p>
            <p className="text-sm font-medium">{baseline.area}</p>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">Soil Type</p>
            <p className="text-sm font-medium">{baseline.soil}</p>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">Current Loading</p>
            <p className="text-sm font-medium">{baseline.currentLoading}</p>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">Proposed Loading</p>
            <p className="text-sm font-medium">{baseline.proposedLoading}</p>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">Mitigation</p>
            <p className="text-sm font-medium">{baseline.mitigation}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function AllocationsTable() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold">Allocations</CardTitle>
          <Badge variant="secondary" className="text-[10px]">{allocations.length} allocations</Badge>
        </div>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Ref</TableHead>
              <TableHead className="text-xs">Deal</TableHead>
              <TableHead className="text-xs">Buyer</TableHead>
              <TableHead className="text-xs">Quantity</TableHead>
              <TableHead className="text-xs">Unit Price</TableHead>
              <TableHead className="text-xs text-right">Total</TableHead>
              <TableHead className="text-xs">Status</TableHead>
              <TableHead className="text-xs">Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {allocations.map((a) => (
              <TableRow key={a.ref}>
                <TableCell className="font-mono text-xs text-muted-foreground">{a.ref}</TableCell>
                <TableCell>
                  <Link
                    href={`/admin/brokerage-mockups/deals/${a.deal}`}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    {a.deal}
                  </Link>
                </TableCell>
                <TableCell className="text-xs">{a.buyer}</TableCell>
                <TableCell className="text-xs">{a.quantity}</TableCell>
                <TableCell className="text-xs">{a.unitPrice}</TableCell>
                <TableCell className="text-xs text-right font-medium">{a.total}</TableCell>
                <TableCell>
                  <Badge className={`text-[10px] border ${allocationStatusColor[a.status]}`}>
                    {a.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{a.date}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

function DocumentsSection() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <FileText className="w-4 h-4 text-muted-foreground" />
            Documents
          </CardTitle>
          <Button variant="outline" size="sm" className="h-7 text-xs">
            <Upload className="w-3 h-3" />
            Upload
          </Button>
        </div>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Filename</TableHead>
              <TableHead className="text-xs">Type</TableHead>
              <TableHead className="text-xs">Size</TableHead>
              <TableHead className="text-xs">Uploaded</TableHead>
              <TableHead className="text-xs">By</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {documents.map((d) => (
              <TableRow key={d.name}>
                <TableCell className="text-xs font-medium">{d.name}</TableCell>
                <TableCell>
                  <Badge variant="secondary" className="text-[10px]">{d.type}</Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{d.size}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{d.uploaded}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{d.by}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon-sm">
                    <Download className="w-3.5 h-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

function ActivityTimeline() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Clock className="w-4 h-4 text-muted-foreground" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((a, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="mt-0.5 w-6 h-6 rounded-full bg-muted flex items-center justify-center shrink-0">
                {activityIcon(a.icon)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-foreground">
                  <span className="font-medium">{a.user}</span>
                  {" - "}
                  {a.text}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{a.time}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function LinkedDealsSection() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">Linked Deals</CardTitle>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Deal</TableHead>
              <TableHead className="text-xs">Title</TableHead>
              <TableHead className="text-xs">Stage</TableHead>
              <TableHead className="text-xs">Contact</TableHead>
              <TableHead className="text-xs text-right">Value</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {linkedDeals.map((d) => (
              <TableRow key={d.ref}>
                <TableCell>
                  <Link
                    href={`/admin/brokerage-mockups/deals/${d.ref}`}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    {d.ref}
                  </Link>
                </TableCell>
                <TableCell className="text-xs">{d.title}</TableCell>
                <TableCell>
                  <Badge className={`text-[10px] border ${dealStageColor[d.stage] ?? "bg-muted text-muted-foreground border-border"}`}>
                    {d.stage}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs">{d.contact}</TableCell>
                <TableCell className="text-xs text-right font-medium">{d.value}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

function AssessmentHistorySection() {
  const siteAssessments = sharedAssessments.filter((a) => a.siteRef === site.ref)
  if (siteAssessments.length === 0) return null

  const assessmentStatusColor: Record<string, string> = {
    Approved: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800",
    Scheduled: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800",
    "In Progress": "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800",
    "Under Review": "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/30 dark:text-indigo-400 dark:border-indigo-800",
    "Revision Requested": "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800",
    "Data Submitted": "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/30 dark:text-sky-400 dark:border-sky-800",
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <ClipboardCheck className="w-4 h-4 text-muted-foreground" />
            Assessment History
          </CardTitle>
          <Badge variant="secondary" className="text-[10px]">{siteAssessments.length} assessments</Badge>
        </div>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Type</TableHead>
              <TableHead className="text-xs">Date</TableHead>
              <TableHead className="text-xs">Assessor</TableHead>
              <TableHead className="text-xs">Status</TableHead>
              <TableHead className="text-xs">Credit Yield</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {siteAssessments.map((a) => (
              <TableRow key={a.id}>
                <TableCell className="text-xs font-medium">{a.type}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{a.date}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{a.assessorName}</TableCell>
                <TableCell>
                  <Badge className={`text-[10px] border ${assessmentStatusColor[a.status] ?? "bg-muted text-muted-foreground border-border"}`}>
                    {a.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs font-medium">
                  {a.creditYieldLabel ?? <span className="text-muted-foreground italic">Pending</span>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

function LegalStatusSection() {
  const siteDocs = sharedDocuments.filter(
    (d) => d.linkedEntityType === "site" && d.linkedEntityId === site.ref
  )
  if (siteDocs.length === 0) return null

  const docStatusColor: Record<string, string> = {
    Completed: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800",
    Signed: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800",
    Draft: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800",
    Sent: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/30 dark:text-indigo-400 dark:border-indigo-800",
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Shield className="w-4 h-4 text-muted-foreground" />
          Legal Status
        </CardTitle>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Document</TableHead>
              <TableHead className="text-xs">Type</TableHead>
              <TableHead className="text-xs">Status</TableHead>
              <TableHead className="text-xs">Uploaded</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {siteDocs.map((d) => (
              <TableRow key={d.id}>
                <TableCell className="text-xs font-medium">{d.name}</TableCell>
                <TableCell>
                  <Badge variant="secondary" className="text-[10px]">{d.type}</Badge>
                </TableCell>
                <TableCell>
                  <Badge className={`text-[10px] border ${docStatusColor[d.status] ?? "bg-muted text-muted-foreground border-border"}`}>
                    {d.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{d.uploadedDate}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

function CapacityPanel() {
  const siteData = SITES_DATA[site.ref] ?? SITES_DATA[DEFAULT_SITE_REF]
  const total = siteData.capacityTotal
  const allocated = siteData.capacityAllocated
  const available = siteData.capacityAvailable
  const allocatedPct = total > 0 ? ((allocated / total) * 100).toFixed(1) : "0"
  const availablePct = total > 0 ? ((available / total) * 100).toFixed(1) : "0"

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Credit Capacity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex justify-center">
          <div className="relative w-44 h-44">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={capacityData}
                  cx="50%"
                  cy="50%"
                  innerRadius={52}
                  outerRadius={70}
                  paddingAngle={3}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {capacityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <p className="text-2xl font-bold">{available}</p>
              <p className="text-[10px] text-muted-foreground">available</p>
            </div>
          </div>
        </div>

        <div className="space-y-2 mt-4">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-muted-foreground/30" />
              Total
            </span>
            <span className="font-medium">{total} kg N/yr</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              Allocated
            </span>
            <span className="font-medium">{allocated} kg N/yr <span className="text-muted-foreground text-xs">({allocatedPct}%)</span></span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
              Available
            </span>
            <span className="font-medium">{available} kg N/yr <span className="text-muted-foreground text-xs">({availablePct}%)</span></span>
          </div>
        </div>

        <Separator className="my-4" />

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Unit Type</span>
            <span className="font-medium">Nitrogen Credit (kg/yr)</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Unit Price</span>
            <span className="font-medium">£3,000 / kg N/yr</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function AssessmentPanel() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <ClipboardCheck className="w-4 h-4 text-muted-foreground" />
          Assessment
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-blue-100 text-blue-700 text-xs font-semibold">
              {assessment.initials}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-medium">{assessment.assessor}</p>
            <p className="text-xs text-muted-foreground">Assessor</p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Date</span>
            <span className="font-medium">{assessment.date}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Type</span>
            <span className="font-medium">{assessment.type}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Report</span>
            <Link href="#" className="text-primary hover:underline flex items-center gap-1 font-medium">
              <FileText className="w-3 h-3" />
              View Report
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function CompliancePanel() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Shield className="w-4 h-4 text-muted-foreground" />
          Compliance
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {complianceItems.map((c, i) => (
            <Link
              key={i}
              href="/admin/brokerage-mockups/compliance"
              className={`block rounded-lg border border-border p-3 border-l-4 hover:bg-accent/30 transition-colors ${complianceBorderColor[c.status]}`}
            >
              <p className="text-xs font-medium">{c.title}</p>
              <div className="flex items-center justify-between mt-1.5">
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Calendar className="w-3 h-3" />
                  Due {c.due}
                </span>
                <span className={`text-[11px] font-medium ${complianceStatusColor[c.status]}`}>
                  {c.status}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// V1: Two-column layout (65 / 35)
// ---------------------------------------------------------------------------

function TwoColumnLayout({ sharedSite, isBNG }: { sharedSite: ReturnType<typeof sharedSites.find> | null; isBNG: boolean }) {
  return (
    <div className="max-w-screen-2xl mx-auto px-6 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
        {/* Left column - main content */}
        <div className="space-y-6">
          <LocationSection />
          <OwnerCard />
          <RegistrationSection />
          <BaselineSection />
          {isBNG && sharedSite && <BNGSiteContent sharedSite={sharedSite} />}
          {!isBNG && sharedSite && <NutrientBudgetCard sharedSite={sharedSite} />}
          <AllocationsTable />
          <AssessmentHistorySection />
          <LegalStatusSection />
          <DocumentsSection />
          <ActivityTimeline />
          <LinkedDealsSection />
        </div>

        {/* Right column - sidebar */}
        <div className="space-y-6">
          {!isBNG && <CapacityPanel />}
          <AssessmentPanel />
          <CompliancePanel />
          {sharedSite && <GeographyCard sharedSite={sharedSite} />}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// V2: Tabbed layout - full width
// ---------------------------------------------------------------------------

function TabbedLayout({ sharedSite, isBNG }: { sharedSite: ReturnType<typeof sharedSites.find> | null; isBNG: boolean }) {
  return (
    <div className="max-w-screen-2xl mx-auto px-6 py-6">
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="allocations">Allocations</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
        </TabsList>

        {/* --- Overview tab ------------------------------------------------ */}
        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Top row: location + capacity + owner */}
            <div className="lg:col-span-2">
              <LocationSection />
            </div>
            {!isBNG && (
              <div>
                <CapacityPanel />
              </div>
            )}

            {/* Second row: owner + assessment */}
            <OwnerCard />
            <AssessmentPanel />
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Quick Stats</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">Total Allocated Value</p>
                    <p className="text-xl font-bold">£284,000</p>
                    <p className="text-xs text-muted-foreground">across 3 allocations</p>
                  </div>
                  <Separator />
                  <div>
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">Linked Deals</p>
                    <p className="text-xl font-bold">2</p>
                    <p className="text-xs text-muted-foreground">1 completed, 1 in progress</p>
                  </div>
                  <Separator />
                  <div>
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">Compliance Items</p>
                    <p className="text-xl font-bold">3</p>
                    <p className="text-xs text-muted-foreground">1 due soon, 2 upcoming</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Third row: registration + baseline */}
            <div className="lg:col-span-2">
              <RegistrationSection />
            </div>
            <BaselineSection />

            {/* BNG / Nutrient enrichment */}
            {isBNG && sharedSite && (
              <div className="lg:col-span-3">
                <BNGSiteContent sharedSite={sharedSite} />
              </div>
            )}
            {!isBNG && sharedSite && (
              <>
                <div className="lg:col-span-2">
                  <NutrientBudgetCard sharedSite={sharedSite} />
                </div>
                <GeographyCard sharedSite={sharedSite} />
              </>
            )}

            {/* Fourth row: activity + linked deals */}
            <div className="lg:col-span-2">
              <ActivityTimeline />
            </div>
            <LinkedDealsSection />
          </div>
        </TabsContent>

        {/* --- Allocations tab --------------------------------------------- */}
        <TabsContent value="allocations">
          <div className="space-y-6">
            {/* Summary stats */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">Total Allocations</p>
                  <p className="text-2xl font-bold">3</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">Units Allocated</p>
                  <p className="text-2xl font-bold">50 <span className="text-sm font-normal text-muted-foreground">kg N/yr</span></p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">Units Available</p>
                  <p className="text-2xl font-bold text-emerald-600">45 <span className="text-sm font-normal text-muted-foreground">kg N/yr</span></p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">Total Value</p>
                  <p className="text-2xl font-bold">£284,000</p>
                </CardContent>
              </Card>
            </div>

            <AllocationsTable />

            {/* Capacity visualization */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <CapacityPanel />
              <LinkedDealsSection />
            </div>
          </div>
        </TabsContent>

        {/* --- Documents tab ----------------------------------------------- */}
        <TabsContent value="documents">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold">Site Documents</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{documents.length} files associated with this site</p>
              </div>
              <Button variant="outline" size="sm">
                <Upload className="w-3.5 h-3.5" />
                Upload Document
              </Button>
            </div>

            <Card>
              <CardContent className="px-0 py-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Filename</TableHead>
                      <TableHead className="text-xs">Type</TableHead>
                      <TableHead className="text-xs">Size</TableHead>
                      <TableHead className="text-xs">Uploaded</TableHead>
                      <TableHead className="text-xs">Uploaded By</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {documents.map((d) => (
                      <TableRow key={d.name}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm font-medium">{d.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-[10px]">{d.type}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{d.size}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{d.uploaded}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{d.by}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon-sm">
                            <Download className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Upload dropzone placeholder */}
            <div className="border-2 border-dashed border-border rounded-xl p-12 text-center">
              <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm font-medium">Drop files here to upload</p>
              <p className="text-xs text-muted-foreground mt-1">PDF, DOCX, DWG, JPG, PNG up to 25 MB</p>
              <Button variant="outline" size="sm" className="mt-4">
                Browse Files
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* --- Compliance tab ---------------------------------------------- */}
        <TabsContent value="compliance">
          <div className="space-y-6">
            {/* Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">Overdue</p>
                      <p className="text-2xl font-bold text-red-600">0</p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center">
                      <Shield className="w-5 h-5 text-emerald-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">Due Soon</p>
                      <p className="text-2xl font-bold text-amber-600">1</p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center">
                      <Clock className="w-5 h-5 text-amber-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">Upcoming</p>
                      <p className="text-2xl font-bold text-emerald-600">2</p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Full compliance list */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Compliance Obligations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {complianceItems.map((c, i) => (
                    <div
                      key={i}
                      className={`rounded-lg border border-border p-4 border-l-4 ${complianceBorderColor[c.status]} flex items-center justify-between`}
                    >
                      <div>
                        <p className="text-sm font-medium">{c.title}</p>
                        <div className="flex items-center gap-3 mt-1.5">
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="w-3 h-3" />
                            Due {c.due}
                          </span>
                          <Badge
                            className={`text-[10px] ${
                              c.status === "Due Soon"
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : "bg-emerald-50 text-emerald-700 border-emerald-200"
                            } border`}
                          >
                            {c.status}
                          </Badge>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" className="text-xs" asChild>
                        <Link href="/admin/brokerage-mockups/compliance">
                          <ArrowUpRight className="w-3 h-3" />
                          View
                        </Link>
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Registration info */}
            <RegistrationSection />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function SiteDetailPage() {
  const params = useParams()
  const siteId = typeof params.id === "string" ? params.id : DEFAULT_SITE_REF
  const siteData = SITES_DATA[siteId]

  const [variant, setVariant] = useState<"v1" | "v2">("v1")
  const sharedSite = sharedSites.find(s => s.ref === siteId) ?? null
  const isBNG = sharedSite?.unitType === "BNG"

  if (!siteData && !sharedSite) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-screen-2xl mx-auto px-6 py-6">
          <Link href="/admin/brokerage-mockups/sites" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowRight className="h-4 w-4 rotate-180" />
            Back to Sites
          </Link>
          <div className="flex flex-col items-center justify-center py-24">
            <h2 className="text-xl font-semibold text-foreground mb-2">Site not found</h2>
            <p className="text-sm text-muted-foreground mb-6">
              No site with ID <span className="font-mono font-medium">{siteId}</span> exists.
            </p>
            <Link href="/admin/brokerage-mockups/sites">
              <Button size="sm">View all sites</Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Assign module-level variables from the looked-up site data
  // This allows all sub-components to work without prop-drilling
  if (siteData) {
    site = { ref: siteData.ref, name: siteData.name, status: siteData.status, address: siteData.address, lat: siteData.lat, lng: siteData.lng, catchment: siteData.catchment, lpa: siteData.lpa, region: siteData.region }
    owner = siteData.owner
    registration = siteData.registration
    baseline = siteData.baseline
    allocations = siteData.allocations
    documents = siteData.documents
    linkedDeals = siteData.linkedDeals
    activities = siteData.activities
    capacityData = siteData.capacityData
    complianceItems = siteData.complianceItems
    assessment = siteData.assessment
  } else if (sharedSite) {
    // Fallback: populate from shared mock data for sites without inline SITES_DATA entries
    const siteAssessments = sharedAssessments.filter(a => a.siteRef === sharedSite.ref)
    const siteDeals = sharedDeals.filter(d => d.siteRef === sharedSite.ref)
    const siteDocs = sharedDocuments.filter(d => d.linkedEntityType === "site" && d.linkedEntityId === sharedSite.ref)
    const contact = sharedContacts.find(c => c.id === sharedSite.contact)

    site = {
      ref: sharedSite.ref,
      name: sharedSite.name,
      status: sharedSite.status as SiteData["status"],
      address: sharedSite.address,
      lat: sharedSite.lat,
      lng: sharedSite.lng,
      catchment: sharedSite.catchment,
      lpa: sharedSite.lpa,
      region: "Hampshire",
    }
    owner = {
      name: contact?.name ?? sharedSite.contactName,
      role: contact?.type ?? "Landowner",
      company: contact?.company ?? "",
      phone: contact?.phone ?? "",
      email: contact?.email ?? "",
      initials: contact?.initials ?? sharedSite.contactName.split(" ").map(w => w[0]).join(""),
    }
    registration = {
      ref: sharedSite.registrationRef ?? sharedSite.bgsReference ?? "Pending",
      date: sharedSite.registeredDate ?? "Pending",
      agreement: sharedSite.legalAgreement ?? "—",
      commitment: `${sharedSite.commitmentYears ?? 30} years`,
      expires: "—",
      cost: "—",
    }
    baseline = {
      landUse: sharedSite.currentUse,
      area: `${sharedSite.areaHectares} ha`,
      soil: sharedSite.soilType,
      currentLoading: sharedSite.baselineLoading ? `${sharedSite.baselineLoading} kg N/yr` : "—",
      proposedLoading: sharedSite.proposedLoading ? `${sharedSite.proposedLoading} kg N/yr` : "—",
      mitigation: sharedSite.mitigationType ?? "—",
    }
    allocations = siteDeals.map(d => ({
      ref: d.id,
      deal: d.id,
      buyer: d.demandContactName,
      quantity: d.unitsLabel,
      unitPrice: `£${d.value > 0 && d.units > 0 ? Math.round(d.value / d.units).toLocaleString() : "—"}`,
      total: d.displayValue,
      status: "Reserved" as const,
      date: d.expectedClose,
    }))
    documents = siteDocs.map(d => ({
      name: d.name,
      type: d.type,
      size: d.fileSize,
      uploaded: d.uploadedDate,
      by: d.uploadedBy,
    }))
    linkedDeals = siteDeals.map(d => ({
      ref: d.id,
      title: d.title,
      stage: d.stage,
      contact: d.demandContactName,
      value: d.displayValue,
    }))
    activities = []
    capacityData = [
      { name: "Allocated", value: sharedSite.allocated, color: "#3b82f6" },
      { name: "Available", value: sharedSite.available, color: "#22c55e" },
    ]
    complianceItems = []
    assessment = siteAssessments[0]
      ? { date: siteAssessments[0].date, assessor: siteAssessments[0].assessorName, initials: siteAssessments[0].assessorName.split(" ").map(w => w[0]).join(""), type: siteAssessments[0].type }
      : { date: "—", assessor: "—", initials: "—", type: "—" }
  }

  return (
    <div className="min-h-screen bg-background">
      <PageHeader variant={variant} setVariant={setVariant} />
      {variant === "v1" ? <TwoColumnLayout sharedSite={sharedSite} isBNG={isBNG} /> : <TabbedLayout sharedSite={sharedSite} isBNG={isBNG} />}
    </div>
  )
}
