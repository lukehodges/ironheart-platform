"use client"

import { useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft,
  Building2,
  Calendar,
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
  Zap,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

// ============================================================================
// TYPES
// ============================================================================

type ContactSide = "supply" | "demand"
type ContactType = "Landowner" | "Farmer" | "Developer" | "Housebuilder"

interface ContactDetail {
  id: string
  slug: string
  name: string
  company: string | null
  type: ContactType
  side: ContactSide
  email: string
  phone: string
  address: string
  location: string
  initials: string
  avatarColor: string
  tags: string[]
  createdDate: string
  lastActivity: string
}

interface ContactDeal {
  id: string
  ref: string
  title: string
  stage: string
  stageColor: string
  value: string
  role: "supply" | "demand"
  date: string
  linkedSite: string | null
  linkedSiteRef: string | null
}

interface ContactSite {
  ref: string
  name: string
  status: string
  statusColor: string
  catchment: string
  unitType: string
  totalCapacity: string
  available: string
  unitPrice: string
}

interface ContactNote {
  id: number
  author: string
  authorInitials: string
  authorColor: string
  date: string
  time: string
  content: string
}

interface ActivityItem {
  id: number
  type: "deal" | "note" | "email" | "system" | "site"
  date: string
  time: string
  user: string
  initials: string
  description: string
  detail: string
}

interface FinancialSummary {
  totalDealValue: string
  totalCommission: string
  commissionRate: string
  paidCommission: string
  outstandingCommission: string
  paymentStatus: string
  paymentStatusColor: string
  invoiceCount: number
}

interface ContactData {
  contact: ContactDetail
  deals: ContactDeal[]
  sites: ContactSite[]
  notes: ContactNote[]
  activity: ActivityItem[]
  financials: FinancialSummary
}

// ============================================================================
// HARDCODED DATA
// ============================================================================

const CONTACTS_DATA: Record<string, ContactData> = {
  "david-ashford": {
    contact: {
      id: "c-004",
      slug: "david-ashford",
      name: "David Ashford",
      company: "Ashford Farm Estate",
      type: "Landowner",
      side: "supply",
      email: "d.ashford@ashfordfarm.co.uk",
      phone: "07700 900456",
      address: "Manor Farm Lane, Kings Worthy, Winchester, SO21 1HR",
      location: "Kings Worthy, Winchester",
      initials: "DA",
      avatarColor: "bg-purple-600",
      tags: ["landowner", "nitrogen"],
      createdDate: "12 Sep 2024",
      lastActivity: "5 Mar 2026",
    },
    deals: [
      {
        id: "d-0038",
        ref: "D-0038",
        title: "Manor Fields Nitrogen Credits",
        stage: "Credits Reserved",
        stageColor: "bg-amber-50 text-amber-700 border-amber-200",
        value: "\u00A3135,000",
        role: "supply",
        date: "15 Feb 2026",
        linkedSite: "Manor Fields",
        linkedSiteRef: "S-0005",
      },
    ],
    sites: [
      {
        ref: "S-0005",
        name: "Manor Fields",
        status: "Active",
        statusColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
        catchment: "Solent",
        unitType: "Nitrogen Credit (kg/yr)",
        totalCapacity: "95 kg N/yr",
        available: "45 kg N/yr",
        unitPrice: "\u00A33,000 / kg",
      },
    ],
    notes: [
      {
        id: 1,
        author: "James Harris",
        authorInitials: "JH",
        authorColor: "bg-amber-100 text-amber-700",
        date: "5 Mar 2026",
        time: "15:20",
        content:
          "Spoke with David about the Taylor Wimpey reservation. He is happy with the agreed price of \u00A33,000/kg and confirmed he will sign the contract once TW deposit clears.",
      },
      {
        id: 2,
        author: "Sarah Croft",
        authorInitials: "SC",
        authorColor: "bg-purple-100 text-purple-700",
        date: "28 Feb 2026",
        time: "10:45",
        content:
          "David confirmed boundary adjustments with neighbouring farm are complete. No issues with the NE registration boundary plan.",
      },
      {
        id: 3,
        author: "James Harris",
        authorInitials: "JH",
        authorColor: "bg-amber-100 text-amber-700",
        date: "8 Oct 2025",
        time: "14:00",
        content:
          "Site assessment completed by Tom Jenkins. Baseline data confirmed: 12.4 ha, arable to grassland conversion. Estimated 95 kg N/yr total mitigation capacity.",
      },
      {
        id: 4,
        author: "James Harris",
        authorInitials: "JH",
        authorColor: "bg-amber-100 text-amber-700",
        date: "12 Sep 2024",
        time: "09:30",
        content:
          "Initial meeting with David Ashford at Manor Farm. Discussed nitrogen credit opportunities. Very interested in land-use change on Manor Fields (12 ha). Follow-up assessment to be booked.",
      },
    ],
    activity: [
      {
        id: 1,
        type: "deal",
        date: "5 Mar 2026",
        time: "14:32",
        user: "James Harris",
        initials: "JH",
        description: "Deal D-0038 moved to Credits Reserved",
        detail:
          "Manor Fields Nitrogen Credits deal advanced to Credits Reserved stage after Taylor Wimpey deposit confirmation.",
      },
      {
        id: 2,
        type: "note",
        date: "5 Mar 2026",
        time: "15:20",
        user: "James Harris",
        initials: "JH",
        description: "Note added",
        detail:
          "Spoke with David about the Taylor Wimpey reservation and contract signing timeline.",
      },
      {
        id: 3,
        type: "email",
        date: "28 Feb 2026",
        time: "11:00",
        user: "James Harris",
        initials: "JH",
        description: "Email sent to David Ashford",
        detail:
          "Credit Reservation Confirmation for 45 kg N/yr at Manor Fields. Awaiting Taylor Wimpey deposit.",
      },
      {
        id: 4,
        type: "deal",
        date: "25 Feb 2026",
        time: "16:20",
        user: "James Harris",
        initials: "JH",
        description: "Deal D-0038 matched",
        detail:
          "Manor Fields supply matched to Taylor Wimpey demand: 45 kg N/yr in Solent catchment.",
      },
      {
        id: 5,
        type: "site",
        date: "14 Nov 2024",
        time: "10:00",
        user: "System",
        initials: "SY",
        description: "Site S-0005 registered with Natural England",
        detail:
          "Manor Fields registered under NE ref NE-SOL-2024-0087. 95 kg N/yr total capacity confirmed.",
      },
      {
        id: 6,
        type: "site",
        date: "8 Oct 2024",
        time: "09:00",
        user: "Tom Jenkins",
        initials: "TJ",
        description: "Site assessment completed",
        detail:
          "Nutrient site assessment completed at Manor Fields. 12.4 ha arable to grassland conversion.",
      },
      {
        id: 7,
        type: "system",
        date: "12 Sep 2024",
        time: "09:30",
        user: "James Harris",
        initials: "JH",
        description: "Contact created",
        detail:
          "David Ashford added as supply-side contact (Landowner) from Ashford Farm Estate.",
      },
    ],
    financials: {
      totalDealValue: "\u00A3135,000",
      totalCommission: "\u00A327,000",
      commissionRate: "20%",
      paidCommission: "\u00A30",
      outstandingCommission: "\u00A327,000",
      paymentStatus: "Awaiting Deposit",
      paymentStatusColor: "bg-amber-50 text-amber-700 border-amber-200",
      invoiceCount: 1,
    },
  },

  "rachel-morrison": {
    contact: {
      id: "c-009",
      slug: "rachel-morrison",
      name: "Rachel Morrison",
      company: "Taylor Wimpey Southern",
      type: "Developer",
      side: "demand",
      email: "r.morrison@taylorwimpey.com",
      phone: "020 7000 1234",
      address: "Gate House, Turnpike Road, High Wycombe, HP12 3NR",
      location: "London",
      initials: "RM",
      avatarColor: "bg-cyan-600",
      tags: ["developer", "nitrogen"],
      createdDate: "18 Feb 2026",
      lastActivity: "5 Mar 2026",
    },
    deals: [
      {
        id: "d-0038",
        ref: "D-0038",
        title: "Manor Fields Nitrogen Credits",
        stage: "Credits Reserved",
        stageColor: "bg-amber-50 text-amber-700 border-amber-200",
        value: "\u00A3135,000",
        role: "demand",
        date: "15 Feb 2026",
        linkedSite: "Manor Fields",
        linkedSiteRef: "S-0005",
      },
      {
        id: "d-0042",
        ref: "D-0042",
        title: "Taylor Wimpey Hedge End",
        stage: "Matched",
        stageColor: "bg-blue-50 text-blue-700 border-blue-200",
        value: "\u00A390,000",
        role: "demand",
        date: "22 Feb 2026",
        linkedSite: null,
        linkedSiteRef: null,
      },
    ],
    sites: [],
    notes: [
      {
        id: 1,
        author: "James Harris",
        authorInitials: "JH",
        authorColor: "bg-amber-100 text-amber-700",
        date: "5 Mar 2026",
        time: "16:00",
        content:
          "Rachel confirmed that Taylor Wimpey legal team are satisfied with the credit reservation terms. Deposit payment should be processed within 5 business days.",
      },
      {
        id: 2,
        author: "James Harris",
        authorInitials: "JH",
        authorColor: "bg-amber-100 text-amber-700",
        date: "28 Feb 2026",
        time: "09:45",
        content:
          "Sent credit reservation confirmation email to Rachel. She acknowledged receipt and is passing to their legal department.",
      },
      {
        id: 3,
        author: "James Harris",
        authorInitials: "JH",
        authorColor: "bg-amber-100 text-amber-700",
        date: "22 Feb 2026",
        time: "11:30",
        content:
          "Rachel submitted second enquiry for Hedge End development. Needs 30 kg N/yr in Solent catchment. Separate planning application from the Manor Fields deal.",
      },
      {
        id: 4,
        author: "James Harris",
        authorInitials: "JH",
        authorColor: "bg-amber-100 text-amber-700",
        date: "18 Feb 2026",
        time: "10:30",
        content:
          "New enquiry from Rachel Morrison at Taylor Wimpey. Looking for 30-50 kg N/yr nitrogen credits in Solent catchment for upcoming development.",
      },
    ],
    activity: [
      {
        id: 1,
        type: "deal",
        date: "5 Mar 2026",
        time: "14:32",
        user: "James Harris",
        initials: "JH",
        description: "Deal D-0038 moved to Credits Reserved",
        detail:
          "Manor Fields Nitrogen Credits deal advanced after deposit confirmation from Taylor Wimpey.",
      },
      {
        id: 2,
        type: "email",
        date: "28 Feb 2026",
        time: "09:45",
        user: "James Harris",
        initials: "JH",
        description: "Email sent to Rachel Morrison",
        detail:
          "Credit Reservation Confirmation for 45 kg N/yr at Manor Fields.",
      },
      {
        id: 3,
        type: "deal",
        date: "25 Feb 2026",
        time: "16:20",
        user: "James Harris",
        initials: "JH",
        description: "Deal D-0038 matched",
        detail:
          "Manor Fields supply matched to Taylor Wimpey demand: 45 kg N/yr in Solent catchment.",
      },
      {
        id: 4,
        type: "deal",
        date: "22 Feb 2026",
        time: "11:30",
        user: "James Harris",
        initials: "JH",
        description: "Deal D-0042 created",
        detail:
          "Taylor Wimpey Hedge End deal created. 30 kg N/yr needed in Solent catchment.",
      },
      {
        id: 5,
        type: "email",
        date: "18 Feb 2026",
        time: "10:30",
        user: "Rachel Morrison",
        initials: "RM",
        description: "Enquiry received",
        detail:
          "Rachel Morrison (Taylor Wimpey Southern) submitted enquiry: 30-50 kg N/yr needed in Solent catchment.",
      },
      {
        id: 6,
        type: "system",
        date: "18 Feb 2026",
        time: "10:31",
        user: "System",
        initials: "SY",
        description: "Contact created",
        detail:
          "Rachel Morrison added as demand-side contact (Developer) from Taylor Wimpey Southern.",
      },
    ],
    financials: {
      totalDealValue: "\u00A3225,000",
      totalCommission: "\u00A345,000",
      commissionRate: "20%",
      paidCommission: "\u00A30",
      outstandingCommission: "\u00A345,000",
      paymentStatus: "Awaiting Payment",
      paymentStatusColor: "bg-amber-50 text-amber-700 border-amber-200",
      invoiceCount: 2,
    },
  },

  "robert-whiteley": {
    contact: {
      id: "c-001",
      slug: "robert-whiteley",
      name: "Robert Whiteley",
      company: "Whiteley Farm Estate",
      type: "Landowner",
      side: "supply",
      email: "r.whiteley@whiteleyfarm.co.uk",
      phone: "07700 900123",
      address: "Whiteley Farm, Whiteley Lane, Fareham, PO15 7LJ",
      location: "Whiteley, Hampshire",
      initials: "RW",
      avatarColor: "bg-emerald-600",
      tags: ["landowner", "nitrogen"],
      createdDate: "15 Mar 2024",
      lastActivity: "5 Mar 2026",
    },
    deals: [
      {
        id: "d-0035",
        ref: "D-0035",
        title: "Whiteley Farm Nitrogen Credits",
        stage: "Completed",
        stageColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
        value: "\u00A3360,000",
        role: "supply",
        date: "10 Jun 2025",
        linkedSite: "Whiteley Farm",
        linkedSiteRef: "S-0001",
      },
    ],
    sites: [
      {
        ref: "S-0001",
        name: "Whiteley Farm",
        status: "Active",
        statusColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
        catchment: "Solent",
        unitType: "Nitrogen Credit (kg/yr)",
        totalCapacity: "180 kg N/yr",
        available: "15 kg N/yr",
        unitPrice: "\u00A33,200 / kg",
      },
    ],
    notes: [
      {
        id: 1,
        author: "James Harris",
        authorInitials: "JH",
        authorColor: "bg-amber-100 text-amber-700",
        date: "5 Mar 2026",
        time: "11:00",
        content:
          "Annual review call with Robert. Whiteley Farm site performing well. Only 15 kg N/yr remaining. Discussed potential second site on adjacent land (approx 8 ha).",
      },
      {
        id: 2,
        author: "Tom Jenkins",
        authorInitials: "TJ",
        authorColor: "bg-teal-100 text-teal-700",
        date: "28 Feb 2026",
        time: "14:30",
        content:
          "Annual habitat monitoring visit completed. Site in good condition. Grassland establishment progressing well. Report filed with NE.",
      },
      {
        id: 3,
        author: "James Harris",
        authorInitials: "JH",
        authorColor: "bg-amber-100 text-amber-700",
        date: "15 Nov 2025",
        time: "10:00",
        content:
          "Final allocation delivered to Barratt Homes. Deal D-0035 completed. Robert received full payment of \u00A3288,000 (net of 20% commission).",
      },
      {
        id: 4,
        author: "Sarah Croft",
        authorInitials: "SC",
        authorColor: "bg-purple-100 text-purple-700",
        date: "10 Jun 2025",
        time: "16:00",
        content:
          "Contract signed with Barratt Homes for 120 kg N/yr. Largest single allocation to date. Robert very pleased with the terms.",
      },
      {
        id: 5,
        author: "James Harris",
        authorInitials: "JH",
        authorColor: "bg-amber-100 text-amber-700",
        date: "15 Mar 2024",
        time: "09:00",
        content:
          "First meeting with Robert Whiteley. He owns 25 ha at Whiteley Farm. Interested in converting 18 ha of arable to permanent grassland for nitrogen credits. Very keen to proceed.",
      },
    ],
    activity: [
      {
        id: 1,
        type: "note",
        date: "5 Mar 2026",
        time: "11:00",
        user: "James Harris",
        initials: "JH",
        description: "Annual review call with Robert Whiteley",
        detail:
          "Discussed site performance and potential second site on adjacent land.",
      },
      {
        id: 2,
        type: "site",
        date: "28 Feb 2026",
        time: "14:30",
        user: "Tom Jenkins",
        initials: "TJ",
        description: "Annual habitat monitoring completed",
        detail:
          "Whiteley Farm monitoring visit completed. Site in good condition.",
      },
      {
        id: 3,
        type: "deal",
        date: "15 Nov 2025",
        time: "10:00",
        user: "James Harris",
        initials: "JH",
        description: "Deal D-0035 completed",
        detail:
          "Whiteley Farm Nitrogen Credits deal completed. 120 kg N/yr delivered to Barratt Homes. \u00A3360,000 total value.",
      },
      {
        id: 4,
        type: "email",
        date: "15 Nov 2025",
        time: "10:30",
        user: "System",
        initials: "SY",
        description: "Payment processed for Robert Whiteley",
        detail:
          "\u00A3288,000 transferred to Robert Whiteley (Whiteley Farm Estate). Commission of \u00A372,000 retained.",
      },
      {
        id: 5,
        type: "deal",
        date: "10 Jun 2025",
        time: "16:00",
        user: "Sarah Croft",
        initials: "SC",
        description: "Contract signed for D-0035",
        detail:
          "Barratt Homes signed contract for 120 kg N/yr from Whiteley Farm.",
      },
      {
        id: 6,
        type: "site",
        date: "20 Apr 2024",
        time: "09:00",
        user: "System",
        initials: "SY",
        description: "Site S-0001 registered with Natural England",
        detail:
          "Whiteley Farm registered. 180 kg N/yr total capacity confirmed.",
      },
      {
        id: 7,
        type: "system",
        date: "15 Mar 2024",
        time: "09:00",
        user: "James Harris",
        initials: "JH",
        description: "Contact created",
        detail:
          "Robert Whiteley added as supply-side contact (Landowner) from Whiteley Farm Estate.",
      },
    ],
    financials: {
      totalDealValue: "\u00A3360,000",
      totalCommission: "\u00A372,000",
      commissionRate: "20%",
      paidCommission: "\u00A372,000",
      outstandingCommission: "\u00A30",
      paymentStatus: "Fully Paid",
      paymentStatusColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
      invoiceCount: 1,
    },
  },
}

// Fallback data for unknown IDs
const FALLBACK_CONTACT: ContactData = CONTACTS_DATA["david-ashford"]

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function getActivityIcon(type: string) {
  switch (type) {
    case "deal":
      return <Handshake className="w-3.5 h-3.5" />
    case "note":
      return <Pencil className="w-3.5 h-3.5" />
    case "email":
      return <Mail className="w-3.5 h-3.5" />
    case "system":
      return <Zap className="w-3.5 h-3.5" />
    case "site":
      return <Leaf className="w-3.5 h-3.5" />
    default:
      return <FileText className="w-3.5 h-3.5" />
  }
}

function getActivityColor(type: string) {
  switch (type) {
    case "deal":
      return "bg-blue-100 text-blue-600"
    case "note":
      return "bg-amber-100 text-amber-600"
    case "email":
      return "bg-purple-100 text-purple-600"
    case "system":
      return "bg-emerald-100 text-emerald-600"
    case "site":
      return "bg-teal-100 text-teal-600"
    default:
      return "bg-gray-100 text-gray-600"
  }
}

function SideBadge({ side }: { side: ContactSide }) {
  if (side === "supply") {
    return (
      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">
        <Leaf className="w-3 h-3 mr-1" />
        Supply
      </Badge>
    )
  }
  return (
    <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
      <Building2 className="w-3 h-3 mr-1" />
      Demand
    </Badge>
  )
}

function TypeBadge({ type }: { type: ContactType }) {
  const styles: Record<ContactType, string> = {
    Landowner: "border-amber-200 bg-amber-50 text-amber-700",
    Farmer: "border-emerald-200 bg-emerald-50 text-emerald-700",
    Developer: "border-blue-200 bg-blue-50 text-blue-700",
    Housebuilder: "border-indigo-200 bg-indigo-50 text-indigo-700",
  }
  return (
    <Badge
      className={`${styles[type]} text-xs`}
    >
      {type}
    </Badge>
  )
}

// ============================================================================
// CONTACT INFO CARD
// ============================================================================

function ContactInfoCard({ contact }: { contact: ContactDetail }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">Contact Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-3">
          <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Email
            </p>
            <p className="text-sm">{contact.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Phone
            </p>
            <p className="text-sm">{contact.phone}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Address
            </p>
            <p className="text-sm">{contact.address}</p>
          </div>
        </div>
        {contact.company && (
          <div className="flex items-center gap-3">
            <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Company
              </p>
              <p className="text-sm">{contact.company}</p>
              <p className="text-xs text-muted-foreground">{contact.type}</p>
            </div>
          </div>
        )}
        <div className="pt-3 border-t border-border">
          <div className="flex items-center gap-3">
            <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Contact Since
              </p>
              <p className="text-sm">{contact.createdDate}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Last Activity
            </p>
            <p className="text-sm">{contact.lastActivity}</p>
          </div>
        </div>
        {contact.tags.length > 0 && (
          <div className="pt-3 border-t border-border">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Tags
            </p>
            <div className="flex flex-wrap gap-1.5">
              {contact.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-md bg-muted px-2 py-0.5 text-[11px] text-muted-foreground"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================================================
// FINANCIAL SUMMARY CARD
// ============================================================================

function FinancialSummaryCard({ financials, contact }: { financials: FinancialSummary; contact: ContactDetail }) {
  const isPaid = financials.paymentStatus === "Fully Paid"

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">Financial Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Total Deal Value</span>
            <span className="text-sm font-semibold tabular-nums">
              {financials.totalDealValue}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Commission Rate</span>
            <span className="text-sm font-semibold">{financials.commissionRate}</span>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <span className="text-xs font-semibold">Total Commission</span>
            <span className="text-base font-bold text-emerald-600 tabular-nums">
              {financials.totalCommission}
            </span>
          </div>
        </div>

        <div className="space-y-3 pt-3 border-t border-border">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Paid</span>
            <span className="text-sm font-medium tabular-nums text-emerald-600">
              {financials.paidCommission}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Outstanding</span>
            <span className={`text-sm font-medium tabular-nums ${isPaid ? "text-muted-foreground" : "text-amber-600"}`}>
              {financials.outstandingCommission}
            </span>
          </div>
          {/* Progress bar */}
          <div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full ${isPaid ? "bg-emerald-500" : "bg-amber-400"}`}
                style={{
                  width: isPaid ? "100%" : "0%",
                }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              {isPaid ? "All commissions collected" : "Pending collection"}
            </p>
          </div>
        </div>

        <div className="pt-3 border-t border-border flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Payment Status</span>
          <Badge className={`${financials.paymentStatusColor} text-[10px]`}>
            {financials.paymentStatus}
          </Badge>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Invoices</span>
          <span className="text-sm font-medium">{financials.invoiceCount}</span>
        </div>

        {/* Payment flow for supply contacts */}
        {contact.side === "supply" && (
          <div className="pt-3 border-t border-border">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Payment Flow
            </p>
            <div className="space-y-2">
              <div className="h-5 rounded-lg overflow-hidden flex">
                <div
                  className="bg-emerald-500 flex items-center justify-center"
                  style={{ width: "20%" }}
                >
                  <span className="text-[8px] font-bold text-white">20%</span>
                </div>
                <div
                  className="bg-indigo-400 flex items-center justify-center"
                  style={{ width: "80%" }}
                >
                  <span className="text-[8px] font-bold text-white">80%</span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-[10px] text-muted-foreground">
                    Platform
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-indigo-400" />
                  <span className="text-[10px] text-muted-foreground">
                    Landowner
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================================================
// DEALS TAB
// ============================================================================

function DealsTab({ deals }: { deals: ContactDeal[] }) {
  if (deals.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Handshake className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No deals associated with this contact.</p>
          <Button variant="outline" size="sm" className="mt-4">
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Create Deal
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold">
            Deals ({deals.length})
          </CardTitle>
          <Button variant="outline" size="sm">
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            New Deal
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[90px]">Ref</TableHead>
              <TableHead>Title</TableHead>
              <TableHead className="w-[140px]">Stage</TableHead>
              <TableHead className="w-[80px]">Role</TableHead>
              <TableHead className="w-[110px] text-right">Value</TableHead>
              <TableHead className="w-[110px]">Date</TableHead>
              <TableHead className="w-[140px]">Linked Site</TableHead>
              <TableHead className="w-[40px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {deals.map((deal) => (
              <TableRow key={deal.id} className="group">
                <TableCell>
                  <Link
                    href={`/admin/brokerage-mockups/deals/${deal.id}`}
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    {deal.ref}
                  </Link>
                </TableCell>
                <TableCell>
                  <Link
                    href={`/admin/brokerage-mockups/deals/${deal.id}`}
                    className="text-sm font-medium text-foreground hover:text-primary transition-colors"
                  >
                    {deal.title}
                  </Link>
                </TableCell>
                <TableCell>
                  <Badge className={`${deal.stageColor} text-[10px]`}>
                    {deal.stage}
                  </Badge>
                </TableCell>
                <TableCell>
                  {deal.role === "supply" ? (
                    <span className="inline-flex items-center gap-1 text-xs text-emerald-700">
                      <Leaf className="w-3 h-3" />
                      Supply
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs text-blue-700">
                      <Building2 className="w-3 h-3" />
                      Demand
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <span className="text-sm font-semibold tabular-nums">
                    {deal.value}
                  </span>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {deal.date}
                </TableCell>
                <TableCell>
                  {deal.linkedSite && deal.linkedSiteRef ? (
                    <Link
                      href={`/admin/brokerage-mockups/sites/${deal.linkedSiteRef}`}
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      <Leaf className="w-3 h-3" />
                      {deal.linkedSite}
                    </Link>
                  ) : (
                    <span className="text-xs text-muted-foreground/50 italic">
                      --
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  <Link
                    href={`/admin/brokerage-mockups/deals/${deal.id}`}
                    className="p-1.5 rounded hover:bg-muted transition-colors inline-flex opacity-0 group-hover:opacity-100"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// SITES TAB
// ============================================================================

function SitesTab({ sites, isSupply }: { sites: ContactSite[]; isSupply: boolean }) {
  if (!isSupply) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Leaf className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            Sites are only associated with supply-side contacts.
          </p>
        </CardContent>
      </Card>
    )
  }

  if (sites.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Leaf className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            No sites associated with this contact.
          </p>
          <Button variant="outline" size="sm" className="mt-4">
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Add Site
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold">
            Sites ({sites.length})
          </CardTitle>
          <Button variant="outline" size="sm">
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Add Site
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 p-4 pt-0">
        {sites.map((site) => (
          <div
            key={site.ref}
            className="rounded-lg border border-border p-4 hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Leaf className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/admin/brokerage-mockups/sites/${site.ref}`}
                      className="text-sm font-semibold hover:text-primary transition-colors"
                    >
                      {site.name}
                    </Link>
                    <span className="text-xs text-muted-foreground">
                      {site.ref}
                    </span>
                    <Badge className={`${site.statusColor} text-[10px]`}>
                      {site.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <span className="inline-block w-2 h-2 rounded-full bg-blue-400" />
                      {site.catchment}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {site.unitType}
                    </span>
                  </div>
                </div>
              </div>
              <Link
                href={`/admin/brokerage-mockups/sites/${site.ref}`}
                className="p-2 rounded-lg hover:bg-muted transition-colors"
              >
                <ExternalLink className="w-4 h-4 text-muted-foreground" />
              </Link>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">
                  Total Capacity
                </p>
                <p className="text-sm font-medium">{site.totalCapacity}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">
                  Available
                </p>
                <p className="text-sm font-medium text-emerald-600">
                  {site.available}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">
                  Unit Price
                </p>
                <p className="text-sm font-medium">{site.unitPrice}</p>
              </div>
            </div>
            {/* Capacity bar */}
            <div className="mt-3">
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-blue-500"
                  style={{
                    width:
                      site.name === "Manor Fields"
                        ? "52.6%"
                        : site.name === "Whiteley Farm"
                        ? "91.7%"
                        : "50%",
                  }}
                />
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-[10px] text-muted-foreground">
                  Allocated
                </span>
                <span className="text-[10px] text-muted-foreground">
                  Available
                </span>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

// ============================================================================
// NOTES TAB
// ============================================================================

function NotesTab({ notes }: { notes: ContactNote[] }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold">
            Notes ({notes.length})
          </CardTitle>
          <Button variant="outline" size="sm">
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Add Note
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-0 p-0">
        <div className="divide-y divide-border">
          {notes.map((note) => (
            <div key={note.id} className="p-4 hover:bg-muted/30 transition-colors">
              <div className="flex items-start gap-3">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${note.authorColor}`}
                >
                  {note.authorInitials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium">{note.author}</span>
                    <span className="text-xs text-muted-foreground">
                      {note.date} at {note.time}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {note.content}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// ACTIVITY TIMELINE
// ============================================================================

function ActivityTimeline({ activity }: { activity: ActivityItem[] }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">Activity Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-[15px] top-4 bottom-4 w-px bg-border" />

          <div className="flex flex-col gap-5">
            {activity.map((item) => (
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
                    <span className="text-sm font-medium">
                      {item.description}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      &middot;
                    </span>
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
                          : item.initials === "JH"
                          ? "bg-amber-100 text-amber-700"
                          : item.initials === "SC"
                          ? "bg-purple-100 text-purple-700"
                          : item.initials === "TJ"
                          ? "bg-teal-100 text-teal-700"
                          : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      {item.initials}
                    </div>
                    <span className="text-[11px] text-muted-foreground">
                      {item.user}
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
// V1: TWO-COLUMN LAYOUT (65/35)
// ============================================================================

function TwoColumnLayout({ data }: { data: ContactData }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
      {/* LEFT COLUMN -- Main Content */}
      <div className="flex flex-col gap-5">
        {/* Tabbed content: Deals, Sites, Notes */}
        <Tabs defaultValue="deals">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="deals" className="gap-1.5">
              <Handshake className="w-3.5 h-3.5" />
              Deals ({data.deals.length})
            </TabsTrigger>
            {data.contact.side === "supply" && (
              <TabsTrigger value="sites" className="gap-1.5">
                <Leaf className="w-3.5 h-3.5" />
                Sites ({data.sites.length})
              </TabsTrigger>
            )}
            <TabsTrigger value="notes" className="gap-1.5">
              <MessageSquare className="w-3.5 h-3.5" />
              Notes ({data.notes.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="deals" className="mt-4">
            <DealsTab deals={data.deals} />
          </TabsContent>

          {data.contact.side === "supply" && (
            <TabsContent value="sites" className="mt-4">
              <SitesTab
                sites={data.sites}
                isSupply={data.contact.side === "supply"}
              />
            </TabsContent>
          )}

          <TabsContent value="notes" className="mt-4">
            <NotesTab notes={data.notes} />
          </TabsContent>
        </Tabs>

        {/* Activity Timeline below tabs */}
        <ActivityTimeline activity={data.activity} />
      </div>

      {/* RIGHT COLUMN -- Sidebar */}
      <div className="flex flex-col gap-5">
        <ContactInfoCard contact={data.contact} />
        <FinancialSummaryCard
          financials={data.financials}
          contact={data.contact}
        />
      </div>
    </div>
  )
}

// ============================================================================
// V2: FULL-WIDTH SINGLE PAGE SECTIONS
// ============================================================================

function FullWidthLayout({ data }: { data: ContactData }) {
  return (
    <div className="space-y-6">
      {/* Top summary row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Total Deal Value
            </p>
            <p className="text-lg font-bold tabular-nums">
              {data.financials.totalDealValue}
            </p>
            <p className="text-xs text-muted-foreground">
              {data.deals.length} deal{data.deals.length !== 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Commission
            </p>
            <p className="text-lg font-bold text-emerald-600 tabular-nums">
              {data.financials.totalCommission}
            </p>
            <p className="text-xs text-muted-foreground">
              {data.financials.commissionRate} rate
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Payment Status
            </p>
            <div className="mt-1">
              <Badge
                className={`${data.financials.paymentStatusColor} text-xs`}
              >
                {data.financials.paymentStatus}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {data.financials.invoiceCount} invoice{data.financials.invoiceCount !== 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Contact Since
            </p>
            <p className="text-lg font-bold">{data.contact.createdDate.split(" ").slice(1).join(" ")}</p>
            <p className="text-xs text-muted-foreground">
              Last active {data.contact.lastActivity}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Contact info + Financial side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ContactInfoCard contact={data.contact} />
        <FinancialSummaryCard
          financials={data.financials}
          contact={data.contact}
        />
      </div>

      {/* Deals section */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Deals
        </p>
        <DealsTab deals={data.deals} />
      </div>

      {/* Sites section (supply only) */}
      {data.contact.side === "supply" && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Sites
          </p>
          <SitesTab
            sites={data.sites}
            isSupply={data.contact.side === "supply"}
          />
        </div>
      )}

      {/* Notes + Activity side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Notes
          </p>
          <NotesTab notes={data.notes} />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Activity
          </p>
          <ActivityTimeline activity={data.activity} />
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function ContactDetailPage() {
  const params = useParams()
  const [variant, setVariant] = useState<"v1" | "v2">("v1")

  const slug = typeof params.id === "string" ? params.id : ""
  const data = CONTACTS_DATA[slug] ?? FALLBACK_CONTACT

  const { contact } = data

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-screen-xl mx-auto px-6 py-6">
        {/* VARIANT TOGGLE + BACK */}
        <div className="flex items-center justify-between mb-5">
          <Link
            href="/admin/brokerage-mockups/contacts"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Contacts
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
              V2: Full-Width
            </button>
          </div>
        </div>

        {/* BREADCRUMB */}
        <nav className="flex items-center gap-1 text-xs text-muted-foreground mb-4">
          <Link
            href="/admin/brokerage-mockups/contacts"
            className="hover:text-foreground"
          >
            Contacts
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground font-medium">{contact.name}</span>
        </nav>

        {/* HEADER */}
        <div className="mb-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-start gap-4">
              {/* Avatar */}
              <div
                className={`w-14 h-14 rounded-full ${contact.avatarColor} flex items-center justify-center text-lg font-bold text-white shrink-0`}
              >
                {contact.initials}
              </div>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">
                  {contact.name}
                </h1>
                <div className="flex items-center gap-2 mt-1.5">
                  {contact.company && (
                    <span className="text-sm text-muted-foreground">
                      {contact.company}
                    </span>
                  )}
                  {contact.company && (
                    <span className="text-muted-foreground">&middot;</span>
                  )}
                  <span className="text-sm text-muted-foreground">
                    {contact.location}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <TypeBadge type={contact.type} />
              <SideBadge side={contact.side} />
              <Button variant="outline" size="sm">
                <Edit className="w-3.5 h-3.5 mr-1.5" />
                Edit
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Quick contact actions */}
          <div className="flex items-center gap-3 mt-4">
            <Button variant="outline" size="sm">
              <Mail className="w-3.5 h-3.5 mr-1.5" />
              Email
            </Button>
            <Button variant="outline" size="sm">
              <Phone className="w-3.5 h-3.5 mr-1.5" />
              Call
            </Button>
            <Button variant="outline" size="sm">
              <MessageSquare className="w-3.5 h-3.5 mr-1.5" />
              Add Note
            </Button>
            <Button size="sm">
              <Handshake className="w-3.5 h-3.5 mr-1.5" />
              Create Deal
            </Button>
          </div>
        </div>

        {/* LAYOUT VARIANT */}
        {variant === "v1" ? (
          <TwoColumnLayout data={data} />
        ) : (
          <FullWidthLayout data={data} />
        )}
      </div>
    </div>
  )
}
