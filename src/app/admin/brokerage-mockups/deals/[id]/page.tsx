"use client"

import { useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import {
  ArrowLeft,
  ArrowRight,
  ArrowRightLeft,
  Calendar,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Download,
  Edit,
  ExternalLink,
  FileText,
  FileSignature,
  Leaf,
  Mail,
  MoreHorizontal,
  Pencil,
  Phone,
  Plus,
  Receipt,
  Shield,
  TreePine,
  Upload,
  User,
  Zap,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Progress } from "@/components/ui/progress"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts"
import {
  deals as sharedDeals,
  contacts as sharedContacts,
  sites as sharedSites,
  getDealLifecycle,
} from "../../_mock-data"
import { DealLifecycleBar } from "../../_components/deal-lifecycle-bar"

// ============================================================================
// HARDCODED DATA
// ============================================================================

const DEAL_STAGES = [
  { key: "lead", label: "Lead" },
  { key: "qualified", label: "Qualified" },
  { key: "assessment-booked", label: "Assessment Booked" },
  { key: "assessment-complete", label: "Assessment Complete" },
  { key: "s106-in-progress", label: "S106 In Progress" },
  { key: "ne-registered", label: "NE Registered" },
  { key: "matched", label: "Matched" },
  { key: "quote-sent", label: "Quote Sent" },
  { key: "credits-reserved", label: "Credits Reserved" },
  { key: "contract-signed", label: "Contract Signed" },
  { key: "payment-received", label: "Payment Received" },
  { key: "credits-allocated", label: "Credits Allocated" },
  { key: "completed", label: "Completed" },
  { key: "lost", label: "Lost" },
] as const

// ============================================================================
// DEALS LOOKUP - dynamic data per deal
// ============================================================================

interface DealData {
  id: string
  title: string
  stage: string
  stageIndex: number
  probability: number
  broker: string
  brokerInitials: string
  value: number
  commission: number
  commissionRate: number
  landownerReceives: number
  unitType: string
  unitLabel: string
  quantity: string
  unitPrice: string
  catchment: string
  paymentStatus: string
  created: string
  stageChanged: string
  expectedClose: string
  daysInPipeline: number
  daysLeft: number
  supply: {
    name: string
    initials: string
    role: string
    company: string
    phone: string
    email: string
    contactSlug: string
  }
  demand: {
    name: string
    initials: string
    role: string
    company: string
    phone: string
    email: string
    contactSlug: string
  }
  site: {
    id: string
    name: string
    status: string
    catchment: string
    availability: string
  }
  activityItems: {
    id: number
    type: "stage" | "note" | "email" | "system"
    date: string
    time: string
    user: string
    initials: string
    description: string
    detail: string
  }[]
  documents: {
    id: number
    name: string
    type: string
    uploadedBy: string
    date: string
    size: string
  }[]
  commissionSplitData: { label: string; value: number; color: string }[]
  complianceItems: {
    title: string
    due: string
    assignee: string
    assigneeInitials: string
    assigneeColor: string
  }[]
  isBNG?: boolean
}

const DEALS_LOOKUP: Record<string, DealData> = {
  "D-0035": {
    id: "D-0035",
    title: "Whiteley Farm Nitrogen Credits",
    stage: "Completed",
    stageIndex: 12,
    probability: 100,
    broker: "James Harris",
    brokerInitials: "JH",
    value: 360000,
    commission: 72000,
    commissionRate: 20,
    landownerReceives: 288000,
    unitType: "Nitrogen Credit",
    unitLabel: "(kg/yr)",
    quantity: "120 kg N/yr",
    unitPrice: "\u00A33,000 / kg",
    catchment: "Solent",
    paymentStatus: "Paid",
    created: "5 Jun 2025",
    stageChanged: "18 Nov 2025",
    expectedClose: "Nov 2025",
    daysInPipeline: 166,
    daysLeft: 0,
    supply: {
      name: "Robert Whiteley",
      initials: "RW",
      role: "Landowner",
      company: "Whiteley Farm Estate",
      phone: "07700 900123",
      email: "r.whiteley@whiteleyfarm.co.uk",
      contactSlug: "robert-whiteley",
    },
    demand: {
      name: "Mark Stevens",
      initials: "MS",
      role: "Developer",
      company: "Persimmon Homes",
      phone: "020 7000 5678",
      email: "m.stevens@persimmon.co.uk",
      contactSlug: "mark-stevens",
    },
    site: {
      id: "S-0003",
      name: "Whiteley Farm",
      status: "Completed",
      catchment: "Solent",
      availability: "0 of 120 kg N/yr available",
    },
    activityItems: [
      { id: 1, type: "stage", date: "18 Nov 2025", time: "10:00", user: "James Harris", initials: "JH", description: "Deal marked as Completed", detail: "All credits allocated and payment received. Deal closed successfully." },
      { id: 2, type: "stage", date: "10 Nov 2025", time: "14:30", user: "James Harris", initials: "JH", description: "Credits Allocated", detail: "120 kg N/yr credits officially allocated to Persimmon Homes development." },
      { id: 3, type: "email", date: "1 Nov 2025", time: "09:15", user: "James Harris", initials: "JH", description: "Payment confirmation sent", detail: "Final payment of \u00A3360,000 received from Persimmon. Confirmation sent to Robert Whiteley." },
      { id: 4, type: "stage", date: "15 Oct 2025", time: "16:45", user: "James Harris", initials: "JH", description: "Contract Signed", detail: "Both parties signed final credit transfer agreement." },
      { id: 5, type: "stage", date: "5 Jun 2025", time: "09:00", user: "James Harris", initials: "JH", description: "Deal created", detail: "New deal: Whiteley Farm Nitrogen Credits. 120 kg N/yr supply from Whiteley Farm." },
    ],
    documents: [
      { id: 1, name: "CreditTransfer_D0035_Final.pdf", type: "PDF", uploadedBy: "James Harris", date: "18 Nov 2025", size: "312 KB" },
      { id: 2, name: "Whiteley_Farm_Assessment.pdf", type: "PDF", uploadedBy: "Tom Jenkins", date: "20 Jul 2025", size: "4.1 MB" },
      { id: 3, name: "Persimmon_PlanningApproval.pdf", type: "PDF", uploadedBy: "Mark Stevens", date: "8 Aug 2025", size: "2.3 MB" },
    ],
    commissionSplitData: [
      { label: "Developer Pays", value: 360000, color: "#3b82f6" },
      { label: "Platform Commission", value: 72000, color: "#10b981" },
      { label: "Landowner Receives", value: 288000, color: "#6366f1" },
    ],
    complianceItems: [
      { title: "Annual Monitoring Report", due: "Due 5 Jun 2026", assignee: "Tom Jenkins", assigneeInitials: "TJ", assigneeColor: "bg-emerald-100 text-emerald-700" },
      { title: "NE Annual Review", due: "Due 18 Nov 2026", assignee: "James Harris", assigneeInitials: "JH", assigneeColor: "bg-amber-100 text-amber-700" },
    ],
  },
  "D-0038": {
    id: "D-0038",
    title: "Manor Fields Nitrogen Credits",
    stage: "Credits Reserved",
    stageIndex: 8,
    probability: 80,
    broker: "James Harris",
    brokerInitials: "JH",
    value: 135000,
    commission: 27000,
    commissionRate: 20,
    landownerReceives: 108000,
    unitType: "Nitrogen Credit",
    unitLabel: "(kg/yr)",
    quantity: "45 kg N/yr",
    unitPrice: "\u00A33,000 / kg",
    catchment: "Solent",
    paymentStatus: "Awaiting Deposit",
    created: "15 Feb 2026",
    stageChanged: "5 Mar 2026",
    expectedClose: "28 Mar 2026",
    daysInPipeline: 20,
    daysLeft: 23,
    supply: {
      name: "David Ashford",
      initials: "DA",
      role: "Landowner",
      company: "Ashford Farm Estate",
      phone: "07700 900456",
      email: "d.ashford@ashfordfarm.co.uk",
      contactSlug: "david-ashford",
    },
    demand: {
      name: "Rachel Morrison",
      initials: "RM",
      role: "Developer",
      company: "Taylor Wimpey Southern",
      phone: "020 7000 1234",
      email: "r.morrison@taylorwimpey.com",
      contactSlug: "rachel-morrison",
    },
    site: {
      id: "S-0005",
      name: "Manor Fields",
      status: "Active",
      catchment: "Solent",
      availability: "45 of 95 kg N/yr available",
    },
    activityItems: [
      { id: 1, type: "stage", date: "5 Mar 2026", time: "14:32", user: "James Harris", initials: "JH", description: "Moved deal to Credits Reserved", detail: "Stage changed from Quote Sent to Credits Reserved after deposit confirmation." },
      { id: 2, type: "note", date: "4 Mar 2026", time: "11:15", user: "James Harris", initials: "JH", description: "Added note", detail: "Taylor Wimpey legal team confirmed. Awaiting deposit payment before proceeding to contract stage." },
      { id: 3, type: "email", date: "28 Feb 2026", time: "09:45", user: "James Harris", initials: "JH", description: "Email sent to Rachel Morrison", detail: "Credit Reservation Confirmation  -  45 kg N/yr reserved at Manor Fields for Taylor Wimpey Southern." },
      { id: 4, type: "stage", date: "25 Feb 2026", time: "16:20", user: "James Harris", initials: "JH", description: "Moved deal to Matched", detail: "Demand matched to Manor Fields supply. 45 kg N/yr available in Solent catchment at agreed price." },
      { id: 5, type: "system", date: "20 Feb 2026", time: "08:00", user: "System", initials: "SY", description: "Auto-matched demand to Manor Fields", detail: "System identified Manor Fields (S-0005) as matching supply: 45 kg N/yr available in Solent catchment." },
      { id: 6, type: "email", date: "17 Feb 2026", time: "10:30", user: "Rachel Morrison", initials: "RM", description: "Enquiry received from Taylor Wimpey", detail: "Rachel Morrison (Taylor Wimpey Southern) submitted enquiry: 30-50 kg N/yr needed in Solent catchment for Hedge End development." },
      { id: 7, type: "stage", date: "15 Feb 2026", time: "09:00", user: "James Harris", initials: "JH", description: "Deal created", detail: "New deal created: Manor Fields Nitrogen Credits. Initial enquiry from Taylor Wimpey development pipeline." },
    ],
    documents: [
      { id: 1, name: "Credit_Reservation_D0038.pdf", type: "PDF", uploadedBy: "James Harris", date: "5 Mar 2026", size: "245 KB" },
      { id: 2, name: "TaylorWimpey_PlanningApp.pdf", type: "PDF", uploadedBy: "Rachel Morrison", date: "18 Feb 2026", size: "1.8 MB" },
      { id: 3, name: "ManorFields_Assessment.pdf", type: "PDF", uploadedBy: "Tom Jenkins", date: "8 Oct 2025", size: "3.2 MB" },
    ],
    commissionSplitData: [
      { label: "Developer Pays", value: 135000, color: "#3b82f6" },
      { label: "Platform Commission", value: 27000, color: "#10b981" },
      { label: "Landowner Receives", value: 108000, color: "#6366f1" },
    ],
    complianceItems: [
      { title: "S106 Compliance Review", due: "Due 15 Apr 2026", assignee: "James Harris", assigneeInitials: "JH", assigneeColor: "bg-amber-100 text-amber-700" },
      { title: "LPA Condition Discharge", due: "Due 28 Apr 2026", assignee: "Sarah Croft", assigneeInitials: "SC", assigneeColor: "bg-purple-100 text-purple-700" },
    ],
  },
  "D-0042": {
    id: "D-0042",
    title: "Taylor Wimpey Hedge End",
    stage: "Matched",
    stageIndex: 6,
    probability: 60,
    broker: "James Harris",
    brokerInitials: "JH",
    value: 90000,
    commission: 18000,
    commissionRate: 20,
    landownerReceives: 72000,
    unitType: "Nitrogen Credit",
    unitLabel: "(kg/yr)",
    quantity: "30 kg N/yr",
    unitPrice: "\u00A33,000 / kg",
    catchment: "Solent",
    paymentStatus: "Not Yet Invoiced",
    created: "20 Jan 2026",
    stageChanged: "2 Mar 2026",
    expectedClose: "May 2026",
    daysInPipeline: 46,
    daysLeft: 55,
    supply: {
      name: "Catherine Wells",
      initials: "CW",
      role: "Landowner",
      company: "Wells Estate",
      phone: "07700 900789",
      email: "c.wells@wellsestate.co.uk",
      contactSlug: "catherine-wells",
    },
    demand: {
      name: "Rachel Morrison",
      initials: "RM",
      role: "Developer",
      company: "Taylor Wimpey Southern",
      phone: "020 7000 1234",
      email: "r.morrison@taylorwimpey.com",
      contactSlug: "rachel-morrison",
    },
    site: {
      id: "S-0008",
      name: "Hedge End Meadow",
      status: "Active",
      catchment: "Solent",
      availability: "30 of 50 kg N/yr available",
    },
    activityItems: [
      { id: 1, type: "stage", date: "2 Mar 2026", time: "11:00", user: "James Harris", initials: "JH", description: "Moved deal to Matched", detail: "Demand matched to Hedge End Meadow supply. 30 kg N/yr available at agreed price." },
      { id: 2, type: "system", date: "28 Feb 2026", time: "08:00", user: "System", initials: "SY", description: "Auto-matched to Hedge End Meadow", detail: "System identified Hedge End Meadow (S-0008) as matching supply for Taylor Wimpey Hedge End development." },
      { id: 3, type: "note", date: "15 Feb 2026", time: "14:20", user: "James Harris", initials: "JH", description: "Added note", detail: "Taylor Wimpey confirmed separate deal needed for Hedge End development. Different planning application from Manor Fields." },
      { id: 4, type: "email", date: "5 Feb 2026", time: "09:30", user: "Rachel Morrison", initials: "RM", description: "Enquiry received", detail: "Rachel Morrison enquired about 30 kg N/yr for Hedge End residential development." },
      { id: 5, type: "stage", date: "20 Jan 2026", time: "09:00", user: "James Harris", initials: "JH", description: "Deal created", detail: "New deal: Taylor Wimpey Hedge End. 30 kg N/yr demand for residential development." },
    ],
    documents: [
      { id: 1, name: "HedgeEnd_PlanningApp.pdf", type: "PDF", uploadedBy: "Rachel Morrison", date: "25 Jan 2026", size: "2.1 MB" },
      { id: 2, name: "HedgeEndMeadow_Assessment.pdf", type: "PDF", uploadedBy: "Tom Jenkins", date: "10 Dec 2025", size: "3.5 MB" },
    ],
    commissionSplitData: [
      { label: "Developer Pays", value: 90000, color: "#3b82f6" },
      { label: "Platform Commission", value: 18000, color: "#10b981" },
      { label: "Landowner Receives", value: 72000, color: "#6366f1" },
    ],
    complianceItems: [
      { title: "Ecological Impact Assessment", due: "Due 20 May 2026", assignee: "Tom Jenkins", assigneeInitials: "TJ", assigneeColor: "bg-emerald-100 text-emerald-700" },
      { title: "S106 Agreement Review", due: "Due 10 Jun 2026", assignee: "Sarah Croft", assigneeInitials: "SC", assigneeColor: "bg-purple-100 text-purple-700" },
    ],
  },
  "D-0037": {
    id: "D-0037",
    title: "Fareham Woodland BNG / TBD",
    stage: "Prospecting",
    stageIndex: 0,
    probability: 10,
    broker: "James Harris",
    brokerInitials: "JH",
    value: 562500,
    commission: 101250,
    commissionRate: 18,
    landownerReceives: 461250,
    unitType: "Biodiversity Credits",
    unitLabel: "(BNG HUs)",
    quantity: "22.5 BNG HUs (18.0 area + 4.5 hedgerow)",
    unitPrice: "£25,000 / HU",
    catchment: "Solent",
    paymentStatus: "Not Started",
    created: "10 Feb 2026",
    stageChanged: "10 Feb 2026",
    expectedClose: "Dec 2026",
    daysInPipeline: 27,
    daysLeft: 265,
    supply: {
      name: "Ian Stockbridge",
      initials: "IS",
      role: "Landowner",
      company: "Stockbridge Estates Ltd",
      phone: "07700 900801",
      email: "i.stockbridge@stockbridgeestates.co.uk",
      contactSlug: "C-008",
    },
    demand: {
      name: "TBD — No buyer matched yet",
      initials: "?",
      role: "Developer",
      company: "—",
      phone: "—",
      email: "—",
      contactSlug: "",
    },
    site: {
      id: "S-0008",
      name: "Fareham Woodland",
      status: "Under Assessment",
      catchment: "Solent",
      availability: "206.0 area HU + 13.5 hedgerow HU available",
    },
    activityItems: [
      { id: 1, type: "stage", date: "10 Feb 2026", time: "11:24", user: "James Harris", initials: "JH", description: "Deal created in Prospecting stage", detail: "Initial supply registration for Fareham Woodland BNG credits. Site under assessment — metric calculation in progress." },
      { id: 2, type: "system", date: "10 Feb 2026", time: "11:24", user: "System", initials: "SY", description: "BNG site S-0008 linked to deal", detail: "Site capacity: 206.0 area HUs (147.0 HU net gain) + 13.5 hedgerow HUs (12.3 HU net gain) · Statutory Metric 1.0 · Conservation Covenant · 30-year commitment" },
      { id: 3, type: "note", date: "24 Feb 2026", time: "14:10", user: "James Harris", initials: "JH", description: "Note added", detail: "BGS registration application submitted. HMMP draft under preparation by Tom Jenkins. Target NE registration by Jun 2026." },
    ],
    documents: [],
    commissionSplitData: [
      { label: "Total Deal Value", value: 562500, color: "#3b82f6" },
      { label: "Platform Commission (18%)", value: 101250, color: "#10b981" },
      { label: "Landowner Receives", value: 461250, color: "#6366f1" },
    ],
    complianceItems: [
      { title: "BNG Habitat Survey Approval (NE)", due: "Due 01 Jun 2026", assignee: "Tom Jenkins", assigneeInitials: "TJ", assigneeColor: "bg-emerald-100 text-emerald-700" },
      { title: "Biodiversity Gain Site Registration", due: "Due 30 Jun 2026", assignee: "James Harris", assigneeInitials: "JH", assigneeColor: "bg-blue-100 text-blue-700" },
      { title: "HMMP Approval", due: "Due 01 Aug 2026", assignee: "Tom Jenkins", assigneeInitials: "TJ", assigneeColor: "bg-emerald-100 text-emerald-700" },
    ],
    isBNG: true,
  },
}

const DEFAULT_DEAL_ID = "D-0038"

// ── Resolve contact name → shared contact ID for linking ──
function resolveContactId(name: string): string {
  const contact = sharedContacts.find(
    (c) => c.name.toLowerCase() === name.toLowerCase()
  )
  return contact?.id ?? name
}

// ── Resolve site name → shared site ref for linking ──
function resolveSiteRef(siteId: string): string {
  const site = sharedSites.find((s) => s.ref === siteId)
  return site?.ref ?? siteId
}

// ============================================================================
// ACTIVITY ICON/COLOR MAP
// ============================================================================

function getActivityIcon(type: string) {
  switch (type) {
    case "stage":
      return <ArrowRight className="w-3.5 h-3.5" />
    case "note":
      return <Pencil className="w-3.5 h-3.5" />
    case "email":
      return <Mail className="w-3.5 h-3.5" />
    case "system":
      return <Zap className="w-3.5 h-3.5" />
    default:
      return <FileText className="w-3.5 h-3.5" />
  }
}

function getActivityColor(type: string) {
  switch (type) {
    case "stage":
      return "bg-blue-100 text-blue-600"
    case "note":
      return "bg-amber-100 text-amber-600"
    case "email":
      return "bg-purple-100 text-purple-600"
    case "system":
      return "bg-emerald-100 text-emerald-600"
    default:
      return "bg-muted text-muted-foreground"
  }
}

// ============================================================================
// STAGE PROGRESS BAR
// ============================================================================

function StageProgressBar({ currentIndex }: { currentIndex: number }) {
  return (
    <div className="w-full overflow-x-auto">
      <div className="flex items-center min-w-[900px] gap-0">
        {DEAL_STAGES.map((stage, idx) => {
          const isCompleted = idx < currentIndex
          const isCurrent = idx === currentIndex
          const isFuture = idx > currentIndex

          return (
            <div key={stage.key} className="flex items-center flex-1 min-w-0">
              <div className="flex flex-col items-center w-full relative">
                {/* Connector bar */}
                <div className="flex items-center w-full h-2 relative">
                  {idx > 0 && (
                    <div
                      className={`absolute left-0 right-1/2 h-1 rounded-l ${
                        isCompleted || isCurrent
                          ? "bg-emerald-500"
                          : "bg-muted"
                      }`}
                    />
                  )}
                  {idx < DEAL_STAGES.length - 1 && (
                    <div
                      className={`absolute left-1/2 right-0 h-1 rounded-r ${
                        isCompleted ? "bg-emerald-500" : "bg-muted"
                      }`}
                    />
                  )}
                  {/* Node dot */}
                  <div
                    className={`relative z-10 mx-auto w-5 h-5 rounded-full flex items-center justify-center border-2 ${
                      isCompleted
                        ? "bg-emerald-500 border-emerald-500"
                        : isCurrent
                        ? "bg-amber-500 border-amber-500 ring-2 ring-amber-200 ring-offset-1"
                        : "bg-background border-muted-foreground/20"
                    }`}
                  >
                    {isCompleted && (
                      <Check className="w-3 h-3 text-white" />
                    )}
                    {isCurrent && (
                      <div className="w-2 h-2 rounded-full bg-white" />
                    )}
                  </div>
                </div>
                {/* Label */}
                <span
                  className={`mt-1.5 text-[9px] leading-tight text-center font-medium px-0.5 ${
                    isCompleted
                      ? "text-emerald-600"
                      : isCurrent
                      ? "text-amber-700 font-semibold"
                      : "text-muted-foreground/50"
                  }`}
                >
                  {stage.label}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ============================================================================
// PARTIES CARDS
// ============================================================================

function SupplyPartyCard({ deal }: { deal: DealData }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Supply
          </span>
          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
            <Leaf className="w-3 h-3 mr-1" />
            Supply
          </Badge>
        </div>
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm font-bold shrink-0">
            {deal.supply.initials}
          </div>
          <div className="min-w-0">
            <Link
              href={`/admin/brokerage-mockups/contacts/${resolveContactId(deal.supply.name)}`}
              className="text-sm font-semibold text-foreground hover:text-primary transition-colors"
            >
              {deal.supply.name}
            </Link>
            <p className="text-xs text-muted-foreground">{deal.supply.role}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {deal.supply.company}
            </p>
            <div className="flex flex-col gap-1 mt-2">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Phone className="w-3 h-3" />
                <span>{deal.supply.phone}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Mail className="w-3 h-3" />
                <span>{deal.supply.email}</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function DemandPartyCard({ deal }: { deal: DealData }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Demand
          </span>
          <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-[10px]">
            <User className="w-3 h-3 mr-1" />
            Demand
          </Badge>
        </div>
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-bold shrink-0">
            {deal.demand.initials}
          </div>
          <div className="min-w-0">
            <Link
              href={`/admin/brokerage-mockups/contacts/${resolveContactId(deal.demand.name)}`}
              className="text-sm font-semibold text-foreground hover:text-primary transition-colors"
            >
              {deal.demand.name}
            </Link>
            <p className="text-xs text-muted-foreground">{deal.demand.role}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {deal.demand.company}
            </p>
            <div className="flex flex-col gap-1 mt-2">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Phone className="w-3 h-3" />
                <span>{deal.demand.phone}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Mail className="w-3 h-3" />
                <span>{deal.demand.email}</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// LINKED SITE
// ============================================================================

function LinkedSiteCard({ deal }: { deal: DealData }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Leaf className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Link
                  href={`/admin/brokerage-mockups/sites/${deal.site.id}`}
                  className="text-sm font-semibold hover:text-primary transition-colors"
                >
                  {deal.site.name}
                </Link>
                <span className="text-xs text-muted-foreground">{deal.site.id}</span>
                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
                  {deal.site.status}
                </Badge>
              </div>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <span className="inline-block w-2 h-2 rounded-full bg-blue-400" />
                  {deal.site.catchment}
                </span>
                <span className="text-xs text-muted-foreground">
                  {deal.site.availability}
                </span>
              </div>
            </div>
          </div>
          <Link
            href={`/admin/brokerage-mockups/sites/${deal.site.id}`}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <ExternalLink className="w-4 h-4 text-muted-foreground" />
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// UNIT DETAILS GRID
// ============================================================================

function UnitDetailsGrid({ deal }: { deal: DealData }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">Unit Details</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Unit Type
            </p>
            <p className="text-sm font-medium">{deal.unitType}</p>
            <p className="text-xs text-muted-foreground">{deal.unitLabel}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Quantity
            </p>
            <p className="text-sm font-medium">{deal.quantity}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Unit Price
            </p>
            <p className="text-sm font-medium">{deal.unitPrice}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Catchment
            </p>
            <p className="text-sm font-medium">{deal.catchment}</p>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-border">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-muted-foreground">Total Estimated Value</span>
            <span className="text-xl font-bold tabular-nums">&pound;{deal.value.toLocaleString("en-GB")}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// ACTIVITY TIMELINE
// ============================================================================

function ActivityTimeline({ deal }: { deal: DealData }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold">Activity Timeline</CardTitle>
          <button className="text-xs text-primary font-medium hover:underline flex items-center gap-1">
            <Plus className="w-3 h-3" />
            Add Activity
          </button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-[15px] top-4 bottom-4 w-px bg-border" />

          <div className="flex flex-col gap-5">
            {deal.activityItems.map((item) => (
              <div key={item.id} className="flex gap-3 relative">
                {/* Icon circle */}
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10 ${getActivityColor(
                    item.type
                  )}`}
                >
                  {getActivityIcon(item.type)}
                </div>
                <div className="flex-1 min-w-0 pt-0.5">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <span className="text-sm font-medium">{item.description}</span>
                    <span className="text-xs text-muted-foreground">&middot;</span>
                    <span className="text-xs text-muted-foreground">
                      {item.date} at {item.time}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {item.detail}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold ${
                        item.initials === "SY"
                          ? "bg-muted text-muted-foreground"
                          : item.initials === "RM"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {item.initials}
                    </div>
                    <span className="text-[11px] text-muted-foreground">{item.user}</span>
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
// DOCUMENTS TABLE
// ============================================================================

function DocumentsSection({ deal }: { deal: DealData }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold">Documents</CardTitle>
          <button className="text-xs text-primary font-medium hover:underline flex items-center gap-1">
            <Upload className="w-3 h-3" />
            Upload
          </button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="divide-y divide-border rounded-lg border border-border overflow-hidden">
          {deal.documents.map((doc) => (
            <div key={doc.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors">
              <div className="w-8 h-8 rounded bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{doc.name}</p>
                <p className="text-xs text-muted-foreground">
                  {doc.uploadedBy} &middot; {doc.date} &middot; {doc.size}
                </p>
              </div>
              <Badge variant="outline" className="text-[10px] shrink-0">
                {doc.type}
              </Badge>
              <button className="p-1.5 rounded hover:bg-muted transition-colors shrink-0">
                <Download className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// FINANCIALS PANEL (sidebar)
// ============================================================================

function FinancialsPanel({ deal }: { deal: DealData }) {
  const commissionPct = deal.commissionRate
  const landownerPct = 100 - commissionPct
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">Financials</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Value breakdown */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Estimated Value</span>
            <span className="text-sm font-semibold tabular-nums">&pound;{deal.value.toLocaleString("en-GB")}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Commission Rate</span>
            <span className="text-sm font-semibold">{commissionPct}%</span>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <span className="text-xs font-semibold">Commission Amount</span>
            <span className="text-base font-bold text-emerald-600 tabular-nums">&pound;{deal.commission.toLocaleString("en-GB")}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Payment Status</span>
            <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-[10px]">
              {deal.paymentStatus}
            </Badge>
          </div>
        </div>

        {/* Commission split visual */}
        <div className="pt-3 border-t border-border">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Payment Flow
          </p>
          <div className="space-y-2">
            {/* Developer pays */}
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
              <span className="text-xs text-muted-foreground flex-1">Developer Pays</span>
              <span className="text-xs font-semibold tabular-nums">&pound;{deal.value.toLocaleString("en-GB")}</span>
            </div>
            {/* Stacked bar visual */}
            <div className="h-6 rounded-lg overflow-hidden flex">
              <div
                className="bg-emerald-500 flex items-center justify-center"
                style={{ width: `${commissionPct}%` }}
                title={`Platform Commission: \u00A3${deal.commission.toLocaleString("en-GB")}`}
              >
                <span className="text-[9px] font-bold text-white">{commissionPct}%</span>
              </div>
              <div
                className="bg-indigo-400 flex items-center justify-center"
                style={{ width: `${landownerPct}%` }}
                title={`Landowner Receives: \u00A3${deal.landownerReceives.toLocaleString("en-GB")}`}
              >
                <span className="text-[9px] font-bold text-white">{landownerPct}%</span>
              </div>
            </div>
            {/* Legend */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-[10px] text-muted-foreground">Platform &pound;{(deal.commission / 1000).toFixed(0)}k</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-indigo-400" />
                <span className="text-[10px] text-muted-foreground">Landowner &pound;{(deal.landownerReceives / 1000).toFixed(0)}k</span>
              </div>
            </div>
          </div>
        </div>

        {/* Recharts bar for split */}
        <div className="pt-3 border-t border-border">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Commission Split
          </p>
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={deal.commissionSplitData}
                layout="vertical"
                margin={{ top: 0, right: 8, bottom: 0, left: 0 }}
              >
                <XAxis
                  type="number"
                  tickFormatter={(v: number) =>
                    `\u00A3${(v / 1000).toFixed(0)}k`
                  }
                  tick={{ fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="label"
                  width={95}
                  tick={{ fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={(value: any) =>
                    `\u00A3${Number(value).toLocaleString("en-GB")}`
                  }
                  contentStyle={{
                    fontSize: 12,
                    borderRadius: 8,
                    border: "1px solid #e5e7eb",
                  }}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={18}>
                  {deal.commissionSplitData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// KEY DATES PANEL (sidebar)
// ============================================================================

function KeyDatesPanel({ deal }: { deal: DealData }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">Key Dates</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Created</span>
          </div>
          <span className="text-xs font-medium">{deal.created}</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Stage Changed</span>
          </div>
          <span className="text-xs font-medium">{deal.stageChanged}</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Expected Close</span>
          </div>
          <span className="text-xs font-medium">{deal.expectedClose}</span>
        </div>
        <div className="pt-2 border-t border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Days in Pipeline</span>
          </div>
          <Badge variant="secondary" className="text-[10px]">
            {deal.daysInPipeline} days
          </Badge>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// COMPLIANCE PANEL (sidebar)
// ============================================================================

function CompliancePanel({ deal }: { deal: DealData }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">Related Compliance</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {deal.complianceItems.map((item, idx) => (
          <Link
            key={idx}
            href="/admin/brokerage-mockups/compliance"
            className="block rounded-lg border border-border p-3 hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium">{item.title}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{item.due}</p>
              </div>
              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
                Upcoming
              </Badge>
            </div>
            <div className="flex items-center gap-1.5 mt-2">
              <div className={`w-4 h-4 rounded-full ${item.assigneeColor} flex items-center justify-center text-[7px] font-bold`}>
                {item.assigneeInitials}
              </div>
              <span className="text-[11px] text-muted-foreground">{item.assignee}</span>
            </div>
          </Link>
        ))}
      </CardContent>
    </Card>
  )
}

// ============================================================================
// BNG CREDIT BREAKDOWN (shown for BNG deals)
// ============================================================================

const DISTINCTIVENESS_COLORS: Record<string, string> = {
  v_low: "bg-slate-100 text-slate-700 border-slate-300",
  low: "bg-slate-100 text-slate-700 border-slate-300",
  medium: "bg-amber-50 text-amber-700 border-amber-300",
  high: "bg-emerald-50 text-emerald-700 border-emerald-300",
  v_high: "bg-green-100 text-green-800 border-green-300",
}
const DISTINCTIVENESS_LABELS: Record<string, string> = {
  v_low: "V.Low", low: "Low", medium: "Medium", high: "High", v_high: "V.High",
}
const CONDITION_LABELS: Record<string, string> = {
  poor: "Poor", fairly_poor: "Fairly Poor", moderate: "Moderate",
  fairly_good: "Fairly Good", good: "Good",
}

function BNGCreditBreakdown({ dealSiteId, dealId }: { dealSiteId: string; dealId: string }) {
  const sharedDeal = sharedDeals.find(d => d.id === dealId)
  const site = sharedSites.find(s => s.ref === dealSiteId)

  if (!site || !site.habitatSummary) return null

  const bngAllocation = sharedDeal?.bngAllocation ?? []
  const habitatSummary = site.habitatSummary
  const improvementHabitats = site.improvementHabitats ?? []

  const totalBNGUnits = bngAllocation.reduce((s, a) => s + a.units, 0)
  const totalValue = bngAllocation.reduce((s, a) => s + a.value, 0)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
          <TreePine className="h-3.5 w-3.5 text-emerald-600" />
          BNG Credit Breakdown
        </p>
      </div>

      {/* Deal allocation summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {bngAllocation.map((alloc) => (
          <Card key={alloc.category}>
            <CardContent className="p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                {alloc.categoryLabel}
              </p>
              <p className="text-xl font-bold text-foreground">{alloc.units.toFixed(1)}</p>
              <p className="text-xs text-muted-foreground">{alloc.unitLabel}</p>
              <p className="text-xs font-medium text-emerald-700 mt-1">
                £{(alloc.value).toLocaleString("en-GB")}
              </p>
            </CardContent>
          </Card>
        ))}
        <Card>
          <CardContent className="p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Total HUs
            </p>
            <p className="text-xl font-bold text-foreground">{totalBNGUnits.toFixed(1)}</p>
            <p className="text-xs text-muted-foreground">combined</p>
            <p className="text-xs font-medium text-emerald-700 mt-1">
              £{totalValue.toLocaleString("en-GB")}
            </p>
          </CardContent>
        </Card>
        <Card className="border-emerald-200 bg-emerald-50/30">
          <CardContent className="p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Unit Price
            </p>
            <p className="text-xl font-bold text-foreground">£25,000</p>
            <p className="text-xs text-muted-foreground">per HU</p>
            <p className="text-xs font-medium text-muted-foreground mt-1">
              18% commission
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Site capacity vs deal allocation */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TreePine className="h-4 w-4 text-emerald-600" />
              Site Capacity vs. Deal Allocation
            </CardTitle>
            <Link
              href={`/admin/brokerage-mockups/sites/${dealSiteId}`}
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              View site <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
          <p className="text-xs text-muted-foreground">
            {site.name} ({dealSiteId}) · {site.metricVersion ?? "Statutory Metric 1.0"} · {site.legalAgreement ?? "Conservation Covenant"} · {site.commitmentYears ?? 30}-year commitment
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="text-xs">
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Site Total</TableHead>
                <TableHead className="text-right">Baseline HUs</TableHead>
                <TableHead className="text-right">Improvement HUs</TableHead>
                <TableHead className="text-right">HU Gain</TableHead>
                <TableHead className="text-right">This Deal</TableHead>
                <TableHead className="text-right">Remaining</TableHead>
                <TableHead className="text-right">% Used</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {habitatSummary.map((row) => {
                const dealAlloc = bngAllocation.find(a => a.category === row.category)
                const dealUnits = dealAlloc?.units ?? 0
                const remaining = row.improvementUnits - dealUnits
                const pctUsed = row.improvementUnits > 0 ? (dealUnits / row.improvementUnits) * 100 : 0
                return (
                  <TableRow key={row.category}>
                    <TableCell className="font-medium text-foreground">{row.categoryLabel}</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {row.improvementSize} {row.sizeUnit}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">{row.baselineUnits.toFixed(1)}</TableCell>
                    <TableCell className="text-right tabular-nums font-medium text-foreground">{row.improvementUnits.toFixed(1)}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      <span className="text-emerald-700 font-semibold">+{row.unitGain.toFixed(1)}</span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {dealUnits > 0 ? (
                        <span className="font-semibold text-blue-700">{dealUnits.toFixed(1)}</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-emerald-700">{remaining.toFixed(1)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Progress value={pctUsed} className="h-1.5 w-16" />
                        <span className="text-xs text-muted-foreground w-8 text-right">{pctUsed.toFixed(1)}%</span>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Improvement habitat parcels being offered */}
      {improvementHabitats.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Enhancement Habitats (Source Parcels)</CardTitle>
            <p className="text-xs text-muted-foreground">
              These improvement parcels generate the biodiversity units being offered in this deal
            </p>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="text-xs">
                  <TableHead>Habitat Type</TableHead>
                  <TableHead>Distinctiveness</TableHead>
                  <TableHead>Condition</TableHead>
                  <TableHead className="text-right">Size</TableHead>
                  <TableHead className="text-right">HUs</TableHead>
                  <TableHead className="text-right">HU Gain</TableHead>
                  <TableHead className="text-right">Temporal Risk</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {improvementHabitats.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div className="font-medium text-foreground text-sm">{p.specificHabitatType}</div>
                      <div className="text-xs text-muted-foreground">{p.broadHabitatType}</div>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-xs font-medium ${DISTINCTIVENESS_COLORS[p.distinctiveness] ?? ""}`}>
                        {DISTINCTIVENESS_LABELS[p.distinctiveness] ?? p.distinctiveness}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {CONDITION_LABELS[p.condition] ?? p.condition}
                    </TableCell>
                    <TableCell className="text-right text-sm tabular-nums">{p.size} {p.sizeUnit}</TableCell>
                    <TableCell className="text-right text-sm tabular-nums font-medium">{p.biodiversityUnits.toFixed(1)}</TableCell>
                    <TableCell className="text-right text-sm">
                      {p.unitGain !== null ? (
                        <span className="text-emerald-700 font-semibold">+{p.unitGain.toFixed(1)}</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {p.temporalRisk !== null ? `×${p.temporalRisk}` : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <tfoot>
                <tr className="border-t border-border bg-muted/30">
                  <td colSpan={4} className="px-4 py-2 text-sm font-semibold text-foreground">TOTAL</td>
                  <td className="px-4 py-2 text-sm font-semibold text-right tabular-nums">
                    {improvementHabitats.reduce((s, p) => s + p.biodiversityUnits, 0).toFixed(1)}
                  </td>
                  <td className="px-4 py-2 text-sm font-semibold text-right text-emerald-700 tabular-nums">
                    +{improvementHabitats.filter(p => p.unitGain !== null).reduce((s, p) => s + (p.unitGain ?? 0), 0).toFixed(1)}
                  </td>
                  <td className="px-4 py-2" />
                </tr>
              </tfoot>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ============================================================================
// V1: TWO-COLUMN LAYOUT
// ============================================================================

function TwoColumnLayout({ deal }: { deal: DealData }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6">
      {/* LEFT COLUMN - Main Content */}
      <div className="flex flex-col gap-5">
        {/* Parties */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Parties
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <SupplyPartyCard deal={deal} />
            <DemandPartyCard deal={deal} />
          </div>
        </div>

        {/* Linked Site */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Linked Site
          </p>
          <LinkedSiteCard deal={deal} />
        </div>

        {/* Unit Details */}
        <UnitDetailsGrid deal={deal} />

        {/* BNG Credit Breakdown (BNG deals only) */}
        {deal.isBNG && deal.site.id && (
          <BNGCreditBreakdown dealSiteId={deal.site.id} dealId={deal.id} />
        )}

        {/* Activity Timeline */}
        <ActivityTimeline deal={deal} />

        {/* Documents */}
        <DocumentsSection deal={deal} />
      </div>

      {/* RIGHT COLUMN - Sidebar */}
      <div className="flex flex-col gap-5">
        <FinancialsPanel deal={deal} />
        <KeyDatesPanel deal={deal} />
        <CompliancePanel deal={deal} />
      </div>
    </div>
  )
}

// ============================================================================
// V2: TABBED FULL-WIDTH LAYOUT
// ============================================================================

function TabbedLayout({ deal }: { deal: DealData }) {
  const commissionPct = deal.commissionRate
  const landownerPct = 100 - commissionPct
  return (
    <Tabs defaultValue="overview" className="w-full">
      <TabsList className="w-full justify-start mb-6">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="activity">Activity</TabsTrigger>
        <TabsTrigger value="documents">Documents</TabsTrigger>
        <TabsTrigger value="financials">Financials</TabsTrigger>
      </TabsList>

      {/* OVERVIEW TAB */}
      <TabsContent value="overview">
        <div className="space-y-6">
          {/* Top summary row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Deal Value
                </p>
                <p className="text-lg font-bold tabular-nums">&pound;{deal.value.toLocaleString("en-GB")}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Commission
                </p>
                <p className="text-lg font-bold text-emerald-600 tabular-nums">&pound;{deal.commission.toLocaleString("en-GB")}</p>
                <p className="text-xs text-muted-foreground">{commissionPct}% rate</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Days in Pipeline
                </p>
                <p className="text-lg font-bold tabular-nums">{deal.daysInPipeline}</p>
                <p className="text-xs text-muted-foreground">Since {deal.created}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Expected Close
                </p>
                <p className="text-lg font-bold">{deal.expectedClose}</p>
                <p className="text-xs text-muted-foreground">{deal.daysLeft > 0 ? `${deal.daysLeft} days left` : "Closed"}</p>
              </CardContent>
            </Card>
          </div>

          {/* Parties */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Parties
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <SupplyPartyCard deal={deal} />
              <DemandPartyCard deal={deal} />
            </div>
          </div>

          {/* Linked Site + Unit Details side by side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Linked Site
              </p>
              <LinkedSiteCard deal={deal} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Key Dates
              </p>
              <Card>
                <CardContent className="p-4 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Created</span>
                    </div>
                    <span className="text-xs font-medium">{deal.created}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ArrowRightLeft className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Stage Changed</span>
                    </div>
                    <span className="text-xs font-medium">{deal.stageChanged}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Expected Close</span>
                    </div>
                    <span className="text-xs font-medium">{deal.expectedClose}</span>
                  </div>
                  <div className="pt-2 border-t border-border flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Days in Pipeline</span>
                    </div>
                    <Badge variant="secondary" className="text-[10px]">
                      {deal.daysInPipeline} days
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Unit Details full width */}
          <UnitDetailsGrid deal={deal} />

          {/* BNG Credit Breakdown (BNG deals only) */}
          {deal.isBNG && deal.site.id && (
            <BNGCreditBreakdown dealSiteId={deal.site.id} dealId={deal.id} />
          )}

          {/* Compliance */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Compliance Items
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {deal.complianceItems.map((item, idx) => (
                <Link key={idx} href="/admin/brokerage-mockups/compliance" className="block">
                  <Card className="hover:bg-muted/50 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <Shield className="w-4 h-4 text-emerald-500" />
                          <div>
                            <p className="text-sm font-medium">{item.title}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{item.due}</p>
                          </div>
                        </div>
                        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
                          Upcoming
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </TabsContent>

      {/* ACTIVITY TAB */}
      <TabsContent value="activity">
        <ActivityTimeline deal={deal} />
      </TabsContent>

      {/* DOCUMENTS TAB */}
      <TabsContent value="documents">
        <DocumentsSection deal={deal} />
      </TabsContent>

      {/* FINANCIALS TAB */}
      <TabsContent value="financials">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: breakdown */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Deal Value Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Unit Price</span>
                  <span className="text-sm font-medium tabular-nums">{deal.unitPrice}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Quantity</span>
                  <span className="text-sm font-medium">{deal.quantity}</span>
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-border">
                  <span className="text-sm font-semibold">Total Deal Value</span>
                  <span className="text-lg font-bold tabular-nums">&pound;{deal.value.toLocaleString("en-GB")}</span>
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t border-border">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Commission Rate</span>
                  <span className="text-sm font-medium">{commissionPct}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-emerald-700">Commission Amount</span>
                  <span className="text-lg font-bold text-emerald-600 tabular-nums">&pound;{deal.commission.toLocaleString("en-GB")}</span>
                </div>
              </div>

              <div className="pt-4 border-t border-border">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Landowner Receives</span>
                  <span className="text-sm font-medium tabular-nums">&pound;{deal.landownerReceives.toLocaleString("en-GB")}</span>
                </div>
              </div>

              <div className="pt-4 border-t border-border flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Payment Status</span>
                <Badge className="bg-amber-50 text-amber-700 border-amber-200">
                  {deal.paymentStatus}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Right: chart */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Payment Flow</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Stacked horizontal bar */}
              <div className="mb-6">
                <p className="text-xs text-muted-foreground mb-2">Developer pays &pound;{deal.value.toLocaleString("en-GB")}</p>
                <div className="h-8 rounded-lg overflow-hidden flex">
                  <div
                    className="bg-emerald-500 flex items-center justify-center"
                    style={{ width: `${commissionPct}%` }}
                  >
                    <span className="text-[10px] font-bold text-white">{commissionPct}%</span>
                  </div>
                  <div
                    className="bg-indigo-400 flex items-center justify-center"
                    style={{ width: `${landownerPct}%` }}
                  >
                    <span className="text-[10px] font-bold text-white">{landownerPct}%</span>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span className="text-xs text-muted-foreground">Platform Commission &pound;{deal.commission.toLocaleString("en-GB")}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-indigo-400" />
                    <span className="text-xs text-muted-foreground">Landowner &pound;{deal.landownerReceives.toLocaleString("en-GB")}</span>
                  </div>
                </div>
              </div>

              {/* Recharts visualization */}
              <div className="h-40 mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={deal.commissionSplitData}
                    layout="vertical"
                    margin={{ top: 0, right: 16, bottom: 0, left: 0 }}
                  >
                    <XAxis
                      type="number"
                      tickFormatter={(v: number) =>
                        `\u00A3${(v / 1000).toFixed(0)}k`
                      }
                      tick={{ fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="label"
                      width={110}
                      tick={{ fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      formatter={(value: any) =>
                        `\u00A3${Number(value).toLocaleString("en-GB")}`
                      }
                      contentStyle={{
                        fontSize: 12,
                        borderRadius: 8,
                        border: "1px solid #e5e7eb",
                      }}
                    />
                    <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={22}>
                      {deal.commissionSplitData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      </TabsContent>
    </Tabs>
  )
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function DealDetailPage() {
  const params = useParams()
  const dealId = typeof params.id === "string" ? params.id : DEFAULT_DEAL_ID
  const lookupDeal = DEALS_LOOKUP[dealId]

  // Fallback: build DealData from shared mock data when no DEALS_LOOKUP entry
  const deal: DealData | null = lookupDeal ?? (() => {
    const shared = sharedDeals.find(d => d.id === dealId)
    if (!shared) return null
    const supplyContact = sharedContacts.find(c => c.id === shared.supplyContact)
    const demandContact = sharedContacts.find(c => c.id === shared.demandContact)
    const dealSite = sharedSites.find(s => s.ref === shared.siteRef)
    const stageIdx = DEAL_STAGES.findIndex(s => s.label.toLowerCase().replace(/\s+/g, "-") === shared.stage.toLowerCase().replace(/\s+/g, "-"))
    return {
      id: shared.id,
      title: shared.title,
      stage: shared.stage,
      stageIndex: stageIdx >= 0 ? stageIdx : 0,
      probability: shared.probability,
      broker: shared.broker,
      brokerInitials: shared.brokerInitials,
      value: shared.value,
      commission: shared.commission,
      commissionRate: shared.commissionRate,
      landownerReceives: shared.value - shared.commission,
      unitType: shared.unitType === "BNG" ? "BNG Unit" : "Nitrogen Credit",
      unitLabel: shared.unitType === "BNG" ? "(area HUs)" : "(kg/yr)",
      quantity: shared.unitsLabel,
      unitPrice: shared.units > 0 ? `£${Math.round(shared.value / shared.units).toLocaleString()} / ${shared.unitType === "BNG" ? "unit" : "kg"}` : "—",
      catchment: shared.catchment,
      paymentStatus: "—",
      created: shared.createdDate,
      stageChanged: shared.createdDate,
      expectedClose: shared.expectedClose,
      daysInPipeline: Math.max(0, Math.round((Date.now() - new Date(shared.createdDate).getTime()) / 86400000)),
      daysLeft: Math.max(0, Math.round((new Date(shared.expectedClose).getTime() - Date.now()) / 86400000)),
      supply: {
        name: supplyContact?.name ?? shared.supplyContactName,
        initials: supplyContact?.initials ?? shared.supplyContactName.split(" ").map(w => w[0]).join(""),
        role: supplyContact?.type ?? "Landowner",
        company: supplyContact?.company ?? "",
        phone: supplyContact?.phone ?? "",
        email: supplyContact?.email ?? "",
        contactSlug: supplyContact?.id ?? "",
      },
      demand: {
        name: demandContact?.name ?? shared.demandContactName,
        initials: demandContact?.initials ?? shared.demandContactName.split(" ").map(w => w[0]).join(""),
        role: demandContact?.type ?? "Developer",
        company: demandContact?.company ?? "",
        phone: demandContact?.phone ?? "",
        email: demandContact?.email ?? "",
        contactSlug: demandContact?.id ?? "",
      },
      site: {
        id: shared.siteRef,
        name: shared.siteName,
        status: dealSite?.status ?? "—",
        catchment: shared.catchment,
        availability: dealSite ? `${dealSite.available} of ${dealSite.total} ${dealSite.unitType === "BNG" ? "HUs" : "kg N/yr"} available` : "—",
      },
      activityItems: [
        { id: 1, type: "stage" as const, date: shared.createdDate, time: "09:00", user: shared.broker, initials: shared.brokerInitials, description: "Deal created", detail: `New deal: ${shared.title}` },
      ],
      documents: [],
      commissionSplitData: [
        { label: "Developer Pays", value: shared.value, color: "#3b82f6" },
        { label: "Platform Commission", value: shared.commission, color: "#10b981" },
        { label: "Landowner Receives", value: shared.value - shared.commission, color: "#6366f1" },
      ],
      complianceItems: [],
      isBNG: shared.unitType === "BNG",
    } satisfies DealData
  })()

  const [variant, setVariant] = useState<"v1" | "v2">("v1")

  if (!deal) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-screen-xl mx-auto px-6 py-6">
          <Link
            href="/admin/brokerage-mockups/deals"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Deals
          </Link>
          <div className="flex flex-col items-center justify-center py-24">
            <h2 className="text-xl font-semibold text-foreground mb-2">Deal not found</h2>
            <p className="text-sm text-muted-foreground mb-6">
              No deal with ID <span className="font-mono font-medium">{dealId}</span> exists.
            </p>
            <Link href="/admin/brokerage-mockups/deals">
              <button className="px-4 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
                View all deals
              </button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-screen-xl mx-auto px-6 py-6">
        {/* VARIANT TOGGLE */}
        <div className="flex items-center justify-between mb-5">
          <Link
            href="/admin/brokerage-mockups/deals"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Deals
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground mr-1">Layout:</span>
            <button
              onClick={() => setVariant("v1")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
                variant === "v1"
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-muted-foreground border-border hover:bg-muted"
              }`}
            >
              V1: Two-Column
            </button>
            <button
              onClick={() => setVariant("v2")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
                variant === "v2"
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-muted-foreground border-border hover:bg-muted"
              }`}
            >
              V2: Tabbed
            </button>
          </div>
        </div>

        {/* BREADCRUMB */}
        <nav className="flex items-center gap-1 text-xs text-muted-foreground mb-4">
          <Link href="/admin/brokerage-mockups/deals" className="hover:text-foreground">
            Deals
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground font-medium">{deal.id}</span>
        </nav>

        {/* LIFECYCLE BAR */}
        {(() => {
          const sharedDeal = sharedDeals.find(d => d.id === dealId);
          if (!sharedDeal) return null;
          const lifecycle = getDealLifecycle(sharedDeal.id, sharedDeal.stage, sharedDeal.side);
          return (
            <Card className="mb-6">
              <CardContent className="py-3 px-4">
                <DealLifecycleBar
                  currentStage={lifecycle.currentStage}
                  completedStages={lifecycle.completedStages}
                  track={lifecycle.track}
                  dealId={dealId}
                />
              </CardContent>
            </Card>
          );
        })()}

        {/* HEADER */}
        <div className="mb-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">
                {deal.title}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Deal {deal.id} &middot; Assigned to {deal.broker}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge className={(() => {
                const s = deal.stage.toLowerCase();
                if (s === "completed" || s === "credits allocated" || s === "payment received")
                  return "bg-emerald-50 text-emerald-700 border-emerald-200";
                if (s === "lost")
                  return "bg-red-50 text-red-700 border-red-200";
                if (s === "matched" || s === "quote sent" || s === "credits reserved" || s === "contract signed")
                  return "bg-blue-50 text-blue-700 border-blue-200";
                return "bg-amber-50 text-amber-700 border-amber-200";
              })()}>
                {deal.stage}
              </Badge>
              <Badge variant="outline">
                {deal.probability}% probability
              </Badge>
              <Link
                href={`/admin/brokerage-mockups/deals/${deal.id}/quote`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-border bg-background hover:bg-muted transition-colors"
              >
                <Receipt className="w-3.5 h-3.5" />
                Quote
              </Link>
              <Link
                href={`/admin/brokerage-mockups/deals/${deal.id}/agreement`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-border bg-background hover:bg-muted transition-colors"
              >
                <FileSignature className="w-3.5 h-3.5" />
                Agreement
              </Link>
              <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-border bg-background hover:bg-muted transition-colors">
                <Edit className="w-3.5 h-3.5" />
                Edit
              </button>
              <button className="inline-flex items-center justify-center w-8 h-8 rounded-md border border-border bg-background hover:bg-muted transition-colors">
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* LAYOUT VARIANT */}
        {variant === "v1" ? <TwoColumnLayout deal={deal} /> : <TabbedLayout deal={deal} />}
      </div>
    </div>
  )
}
