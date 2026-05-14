"use client"

import { useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  Edit,
  ExternalLink,
  FileText,
  Handshake,
  Leaf,
  Mail,
  MapPin,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  Phone,
  Plus,
  Star,
  Tag,
  TrendingUp,
  User,
  X,
  Zap,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { contacts, sites, deals, assessments } from "../../_mock-data"

// ============================================================================
// HELPERS
// ============================================================================

function stageColor(stage: string): string {
  const colors: Record<string, string> = {
    Prospecting: "bg-slate-100 text-slate-700 border-slate-200",
    "Initial Contact": "bg-slate-100 text-slate-700 border-slate-200",
    "Requirements Gathered": "bg-blue-50 text-blue-700 border-blue-200",
    "Site Matched": "bg-blue-50 text-blue-700 border-blue-200",
    "Quote Sent": "bg-amber-50 text-amber-700 border-amber-200",
    "Quote Accepted": "bg-amber-50 text-amber-700 border-amber-200",
    "Legal Drafting": "bg-violet-50 text-violet-700 border-violet-200",
    "Legal Review": "bg-violet-50 text-violet-700 border-violet-200",
    "Contracts Signed": "bg-emerald-50 text-emerald-700 border-emerald-200",
    "Payment Pending": "bg-orange-50 text-orange-700 border-orange-200",
    "Payment Received": "bg-emerald-50 text-emerald-700 border-emerald-200",
    "Credits Allocated": "bg-emerald-50 text-emerald-700 border-emerald-200",
    "LPA Confirmed": "bg-emerald-50 text-emerald-700 border-emerald-200",
    Completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  }
  return colors[stage] ?? "bg-muted text-muted-foreground border-border"
}

function siteStatusColor(status: string): string {
  const colors: Record<string, string> = {
    Active: "bg-emerald-50 text-emerald-700 border-emerald-200",
    Registered: "bg-blue-50 text-blue-700 border-blue-200",
    "Under Assessment": "bg-amber-50 text-amber-700 border-amber-200",
    "Legal In Progress": "bg-violet-50 text-violet-700 border-violet-200",
    Prospecting: "bg-slate-100 text-slate-700 border-slate-200",
    "Fully Allocated": "bg-slate-100 text-slate-700 border-slate-200",
  }
  return colors[status] ?? "bg-muted text-muted-foreground border-border"
}

// ============================================================================
// HARDCODED COMMUNICATION LOG
// ============================================================================

interface CommEntry {
  id: number
  type: "call" | "email" | "note" | "meeting"
  title: string
  description: string
  date: string
  author: string
  authorInitials: string
}

const supplyCommunications: CommEntry[] = [
  { id: 1, type: "call", title: "Follow-up call re: annual monitoring", description: "Discussed upcoming monitoring visit scheduled for March. Landowner confirmed access via eastern gate.", date: "2026-03-05", author: "James Harris", authorInitials: "JH" },
  { id: 2, type: "email", title: "Sent updated credit allocation summary", description: "Emailed Q1 2026 allocation report showing 50 kg/yr allocated of 95 kg/yr total.", date: "2026-02-28", author: "James Harris", authorInitials: "JH" },
  { id: 3, type: "meeting", title: "On-site visit with assessor", description: "Accompanied Sarah Chen for annual monitoring visit. Buffer strips establishing well.", date: "2026-02-15", author: "Sarah Croft", authorInitials: "SC" },
  { id: 4, type: "note", title: "Landowner interested in BNG", description: "Robert mentioned interest in exploring BNG credits for the woodland parcel to the north. Worth a follow-up assessment.", date: "2026-01-20", author: "James Harris", authorInitials: "JH" },
  { id: 5, type: "email", title: "S106 agreement renewal reminder", description: "Sent reminder about upcoming 5-year review of the S106 agreement terms.", date: "2025-12-10", author: "Tom Jenkins", authorInitials: "TJ" },
  { id: 6, type: "call", title: "Initial onboarding call", description: "Welcome call to discuss nutrient neutrality programme and next steps for baseline assessment.", date: "2025-05-01", author: "James Harris", authorInitials: "JH" },
]

const demandCommunications: CommEntry[] = [
  { id: 1, type: "call", title: "Discussed credit requirements for Phase 2", description: "Developer needs additional 45 kg/yr nitrogen credits for expanded planning application.", date: "2026-03-07", author: "James Harris", authorInitials: "JH" },
  { id: 2, type: "email", title: "Sent quote for Botley Meadows credits", description: "Formal quote issued for 45 kg/yr at £3,000/kg. Awaiting response.", date: "2026-03-01", author: "James Harris", authorInitials: "JH" },
  { id: 3, type: "meeting", title: "Planning strategy meeting", description: "Met with planning team to discuss credit procurement timeline aligned with LPA submission dates.", date: "2026-02-20", author: "Sarah Croft", authorInitials: "SC" },
  { id: 4, type: "note", title: "Budget approved for Q2 credit purchases", description: "Rachel confirmed internal budget approval for up to £200k in credit purchases this quarter.", date: "2026-02-10", author: "James Harris", authorInitials: "JH" },
  { id: 5, type: "email", title: "Credit certificate for Phase 1 delivered", description: "Sent final credit allocation certificate for the Whiteley Farm deal (30 kg/yr).", date: "2026-01-15", author: "Tom Jenkins", authorInitials: "TJ" },
  { id: 6, type: "call", title: "Initial enquiry about nutrient credits", description: "First contact about nitrogen credit requirements for planned development near Eastleigh.", date: "2025-11-05", author: "James Harris", authorInitials: "JH" },
]

// ============================================================================
// HARDCODED DEMAND PROJECTS
// ============================================================================

interface DemandProject {
  id: string
  name: string
  planningRef: string
  status: string
  statusColor: string
  units: number
  location: string
}

const demandProjects: DemandProject[] = [
  { id: "P-001", name: "Eastleigh Gateway Phase 1", planningRef: "O/22/89432", status: "Approved", statusColor: "bg-emerald-50 text-emerald-700 border-emerald-200", units: 120, location: "Eastleigh" },
  { id: "P-002", name: "Eastleigh Gateway Phase 2", planningRef: "O/23/12456", status: "Pending", statusColor: "bg-amber-50 text-amber-700 border-amber-200", units: 200, location: "Eastleigh" },
  { id: "P-003", name: "Whiteley Meadows", planningRef: "F/24/56789", status: "Pre-application", statusColor: "bg-slate-100 text-slate-700 border-slate-200", units: 85, location: "Whiteley" },
]

interface CreditRequirement {
  type: string
  needed: number
  fulfilled: number
  unit: string
}

const creditRequirements: CreditRequirement[] = [
  { type: "Nitrogen", needed: 75, fulfilled: 30, unit: "kg/yr" },
  { type: "Phosphorus", needed: 20, fulfilled: 0, unit: "kg/yr" },
  { type: "BNG", needed: 15, fulfilled: 0, unit: "units" },
]

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function CommIcon({ type }: { type: CommEntry["type"] }) {
  switch (type) {
    case "call":
      return <Phone className="h-3.5 w-3.5" />
    case "email":
      return <Mail className="h-3.5 w-3.5" />
    case "meeting":
      return <Calendar className="h-3.5 w-3.5" />
    case "note":
      return <FileText className="h-3.5 w-3.5" />
  }
}

function commTypeLabel(type: CommEntry["type"]): string {
  switch (type) {
    case "call": return "Phone Call"
    case "email": return "Email"
    case "meeting": return "Meeting"
    case "note": return "Note"
  }
}

function CommunicationLog({ entries }: { entries: CommEntry[] }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Communication Log</CardTitle>
          <Button variant="outline" size="sm">
            <Plus className="h-3.5 w-3.5" />
            Add Entry
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-[17px] top-2 bottom-2 w-px bg-border" />

          <div className="space-y-4">
            {entries.map((entry) => (
              <div key={entry.id} className="relative flex gap-3">
                <div className="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border bg-card text-muted-foreground">
                  <CommIcon type={entry.type} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-medium text-sm text-foreground">{entry.title}</span>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      {commTypeLabel(entry.type)}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-1">{entry.description}</p>
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {entry.date}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {entry.author}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// SUPPLY CONTACT LAYOUT
// ============================================================================

function SupplyLayout({ contact }: { contact: typeof contacts[0] }) {
  const contactSites = sites.filter((s) => s.contact === contact.id)
  const contactDeals = deals.filter((d) => d.supplyContact === contact.id)
  const contactAssessments = assessments.filter((a) =>
    contactSites.some((s) => s.ref === a.siteRef)
  )

  const totalCredits = contactSites.reduce((sum, s) => sum + s.total, 0)
  const totalDealValue = contactDeals.reduce((sum, d) => sum + d.value, 0)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-6">
      {/* Left Column (65%) */}
      <div className="space-y-6">
        {/* Sites Owned */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Sites Owned</CardTitle>
              <Badge variant="outline">{contactSites.length} site{contactSites.length !== 1 ? "s" : ""}</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {contactSites.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">No sites linked to this contact.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Site</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Catchment</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Available</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contactSites.map((site) => (
                    <TableRow key={site.ref}>
                      <TableCell>
                        <Link
                          href={`/admin/brokerage-mockups/sites/${site.ref}`}
                          className="font-medium text-foreground hover:text-primary transition-colors"
                        >
                          {site.name}
                        </Link>
                        <div className="text-[11px] text-muted-foreground">{site.ref}</div>
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${siteStatusColor(site.status)}`}>
                          {site.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{site.catchment}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{site.unitType}</TableCell>
                      <TableCell className="text-right text-sm">{site.totalLabel}</TableCell>
                      <TableCell className="text-right text-sm">{site.availableLabel}</TableCell>
                      <TableCell className="text-right text-sm">{site.priceLabel}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Assessment History */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Assessment History</CardTitle>
              <Badge variant="outline">{contactAssessments.length} assessment{contactAssessments.length !== 1 ? "s" : ""}</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {contactAssessments.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">No assessments found.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Assessment</TableHead>
                    <TableHead>Site</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Credit Yield</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contactAssessments.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium text-sm">{a.id}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{a.siteName}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{a.type}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{a.date}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {a.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {a.creditYieldLabel ?? "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Active Deals */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Active Deals</CardTitle>
              <Badge variant="outline">{contactDeals.length} deal{contactDeals.length !== 1 ? "s" : ""}</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {contactDeals.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">No deals linked to this contact.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Deal</TableHead>
                    <TableHead>Stage</TableHead>
                    <TableHead>Demand Contact</TableHead>
                    <TableHead>Site</TableHead>
                    <TableHead className="text-right">Units</TableHead>
                    <TableHead className="text-right">Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contactDeals.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell>
                        <Link
                          href={`/admin/brokerage-mockups/deals/${d.id}`}
                          className="font-medium text-foreground hover:text-primary transition-colors"
                        >
                          {d.title}
                        </Link>
                        <div className="text-[11px] text-muted-foreground">{d.id}</div>
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${stageColor(d.stage)}`}>
                          {d.stage}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {d.demandContactName || "-"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {d.siteName || "-"}
                      </TableCell>
                      <TableCell className="text-right text-sm">{d.unitsLabel}</TableCell>
                      <TableCell className="text-right text-sm font-medium">{d.displayValue}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Communication Log */}
        <CommunicationLog entries={supplyCommunications} />
      </div>

      {/* Right Sidebar (35%) */}
      <div className="space-y-6">
        {/* Key Stats */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Key Stats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total Credits Generated</span>
              <span className="text-sm font-semibold">{totalCredits} kg/yr</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total Value of Deals</span>
              <span className="text-sm font-semibold">
                {new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(totalDealValue)}
              </span>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Active Deals</span>
              <span className="text-sm font-semibold">{contactDeals.filter((d) => d.stage !== "Completed").length}</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Sites</span>
              <span className="text-sm font-semibold">{contactSites.length}</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Years as Partner</span>
              <span className="text-sm font-semibold">1</span>
            </div>
          </CardContent>
        </Card>

        {/* Relationship Timeline */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Relationship Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <div className="absolute left-[11px] top-2 bottom-2 w-px bg-border" />
              <div className="space-y-4">
                {[
                  { label: "First Contact", date: "May 2025", done: true },
                  { label: "Baseline Assessment", date: "Jun 2025", done: true },
                  { label: "S106 Signed", date: "Jul 2025", done: true },
                  { label: "First Sale", date: "Sep 2025", done: true },
                  { label: "Annual Monitoring", date: "Mar 2026", done: false },
                ].map((step, i) => (
                  <div key={i} className="relative flex items-start gap-3">
                    <div className={`relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${step.done ? "bg-emerald-100 text-emerald-600" : "border-2 border-border bg-card text-muted-foreground"}`}>
                      {step.done ? (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      ) : (
                        <Clock className="h-3 w-3" />
                      )}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-foreground">{step.label}</div>
                      <div className="text-xs text-muted-foreground">{step.date}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tags */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Tags</CardTitle>
              <Button variant="ghost" size="sm">
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {contact.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2.5 py-1 text-xs font-medium text-foreground"
                >
                  <Tag className="h-3 w-3 text-muted-foreground" />
                  {tag}
                  <button className="ml-0.5 text-muted-foreground hover:text-foreground">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              <button className="inline-flex items-center gap-1 rounded-full border border-dashed border-border px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground hover:border-foreground transition-colors">
                <Plus className="h-3 w-3" />
                Add tag
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Assigned Broker */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Assigned Broker</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-primary text-primary-foreground text-sm font-medium">
                  JH
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="text-sm font-medium text-foreground">James Harris</div>
                <div className="text-xs text-muted-foreground">Senior Broker</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact Details */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Contact Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
              <a href={`mailto:${contact.email}`} className="text-primary hover:underline truncate">
                {contact.email}
              </a>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-foreground">{contact.phone}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-foreground">{contact.location}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-foreground">{contact.company}</span>
            </div>
            {contact.role && (
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-foreground">{contact.role}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ============================================================================
// DEMAND CONTACT LAYOUT
// ============================================================================

function DemandLayout({ contact }: { contact: typeof contacts[0] }) {
  const contactDeals = deals.filter((d) => d.demandContact === contact.id)
  const totalSpend = contactDeals.reduce((sum, d) => sum + d.value, 0)
  const totalCreditsPurchased = contactDeals
    .filter((d) => ["Payment Received", "Credits Allocated", "LPA Confirmed", "Completed"].includes(d.stage))
    .reduce((sum, d) => sum + d.units, 0)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-6">
      {/* Left Column */}
      <div className="space-y-6">
        {/* Developments / Projects */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Developments / Projects</CardTitle>
              <Badge variant="outline">{demandProjects.length} project{demandProjects.length !== 1 ? "s" : ""}</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project</TableHead>
                  <TableHead>Planning Ref</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead className="text-right">Dwellings</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {demandProjects.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium text-sm">{p.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground font-mono">{p.planningRef}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${p.statusColor}`}>
                        {p.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{p.location}</TableCell>
                    <TableCell className="text-right text-sm">{p.units}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Credit Requirements */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Credit Requirements</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {creditRequirements.map((req) => {
              const pct = req.needed > 0 ? Math.round((req.fulfilled / req.needed) * 100) : 0
              return (
                <div key={req.type}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium text-foreground">{req.type}</span>
                    <span className="text-xs text-muted-foreground">
                      {req.fulfilled} / {req.needed} {req.unit} ({pct}%)
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${pct >= 100 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-blue-500"}`}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>

        {/* Active Deals */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Active Deals</CardTitle>
              <Badge variant="outline">{contactDeals.length} deal{contactDeals.length !== 1 ? "s" : ""}</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {contactDeals.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">No deals linked to this contact.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Deal</TableHead>
                    <TableHead>Stage</TableHead>
                    <TableHead>Supply Contact</TableHead>
                    <TableHead>Site</TableHead>
                    <TableHead className="text-right">Units</TableHead>
                    <TableHead className="text-right">Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contactDeals.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell>
                        <Link
                          href={`/admin/brokerage-mockups/deals/${d.id}`}
                          className="font-medium text-foreground hover:text-primary transition-colors"
                        >
                          {d.title}
                        </Link>
                        <div className="text-[11px] text-muted-foreground">{d.id}</div>
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${stageColor(d.stage)}`}>
                          {d.stage}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {d.supplyContactName || "-"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {d.siteName || "-"}
                      </TableCell>
                      <TableCell className="text-right text-sm">{d.unitsLabel}</TableCell>
                      <TableCell className="text-right text-sm font-medium">{d.displayValue}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Communication Log */}
        <CommunicationLog entries={demandCommunications} />
      </div>

      {/* Right Sidebar */}
      <div className="space-y-6">
        {/* Key Stats */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Key Stats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total Credits Purchased</span>
              <span className="text-sm font-semibold">{totalCreditsPurchased} kg/yr</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total Spend</span>
              <span className="text-sm font-semibold">
                {new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(totalSpend)}
              </span>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Active Requirements</span>
              <span className="text-sm font-semibold">{creditRequirements.filter((r) => r.fulfilled < r.needed).length}</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Active Deals</span>
              <span className="text-sm font-semibold">{contactDeals.filter((d) => d.stage !== "Completed").length}</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Projects</span>
              <span className="text-sm font-semibold">{demandProjects.length}</span>
            </div>
          </CardContent>
        </Card>

        {/* Relationship Timeline */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Relationship Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <div className="absolute left-[11px] top-2 bottom-2 w-px bg-border" />
              <div className="space-y-4">
                {[
                  { label: "Initial Enquiry", date: "Nov 2025", done: true },
                  { label: "Requirements Gathered", date: "Dec 2025", done: true },
                  { label: "First Credit Purchase", date: "Jan 2026", done: true },
                  { label: "Phase 2 Discussions", date: "Mar 2026", done: false },
                ].map((step, i) => (
                  <div key={i} className="relative flex items-start gap-3">
                    <div className={`relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${step.done ? "bg-blue-100 text-blue-600" : "border-2 border-border bg-card text-muted-foreground"}`}>
                      {step.done ? (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      ) : (
                        <Clock className="h-3 w-3" />
                      )}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-foreground">{step.label}</div>
                      <div className="text-xs text-muted-foreground">{step.date}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tags */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Tags</CardTitle>
              <Button variant="ghost" size="sm">
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {contact.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2.5 py-1 text-xs font-medium text-foreground"
                >
                  <Tag className="h-3 w-3 text-muted-foreground" />
                  {tag}
                  <button className="ml-0.5 text-muted-foreground hover:text-foreground">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              <button className="inline-flex items-center gap-1 rounded-full border border-dashed border-border px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground hover:border-foreground transition-colors">
                <Plus className="h-3 w-3" />
                Add tag
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Assigned Broker */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Assigned Broker</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-primary text-primary-foreground text-sm font-medium">
                  JH
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="text-sm font-medium text-foreground">James Harris</div>
                <div className="text-xs text-muted-foreground">Senior Broker</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact Details */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Contact Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
              <a href={`mailto:${contact.email}`} className="text-primary hover:underline truncate">
                {contact.email}
              </a>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-foreground">{contact.phone}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-foreground">{contact.location}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-foreground">{contact.company}</span>
            </div>
            {contact.role && (
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-foreground">{contact.role}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function ContactDetailPage() {
  const params = useParams()
  const id = params.id as string

  // Support both ID-based lookup (C-005) and slug-based lookup (david-ashford)
  const contact = contacts.find((c) => c.id === id)
    ?? contacts.find((c) => c.name.toLowerCase().replace(/\s+/g, "-") === id.toLowerCase())
    ?? contacts[0]
  const isSupply = contact.side === "supply"

  return (
    <div className="max-w-screen-2xl mx-auto px-6 py-6">
      {/* Back link */}
      <Link
        href="/admin/brokerage-mockups/contacts"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Contacts
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <Avatar className="h-14 w-14">
            <AvatarFallback className={`${contact.avatarColor} text-white text-lg font-semibold`}>
              {contact.initials}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">{contact.name}</h1>
              <Badge variant="outline" className="text-xs">{contact.type}</Badge>
              {isSupply ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                  <Leaf className="h-3 w-3" />
                  Supply
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                  <Building2 className="h-3 w-3" />
                  Demand
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {contact.company}{contact.role ? ` - ${contact.role}` : ""}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Edit className="h-3.5 w-3.5" />
            Edit
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon-sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Handshake className="h-4 w-4" />
                Create Deal
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Mail className="h-4 w-4" />
                Send Email
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Phone className="h-4 w-4" />
                Log Call
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <FileText className="h-4 w-4" />
                View Documents
              </DropdownMenuItem>
              <DropdownMenuItem>
                <ExternalLink className="h-4 w-4" />
                Open in CRM
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Layout based on side */}
      {isSupply ? (
        <SupplyLayout contact={contact} />
      ) : (
        <DemandLayout contact={contact} />
      )}
    </div>
  )
}
