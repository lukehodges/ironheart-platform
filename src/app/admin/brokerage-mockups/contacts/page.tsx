"use client"

import { useState, useMemo } from "react"
import {
  Search,
  Plus,
  Download,
  Leaf,
  Building2,
  Phone,
  Mail,
  MapPin,
  MoreHorizontal,
  Eye,
  Pencil,
  Handshake,
  LayoutList,
  Columns2,
  Contact,
  Clock,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Switch } from "@/components/ui/switch"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ContactSide = "supply" | "demand"
type ContactType = "Landowner" | "Farmer" | "Developer" | "Housebuilder"

interface MockContact {
  id: string
  name: string
  company: string | null
  type: ContactType
  side: ContactSide
  email: string
  phone: string
  location: string
  activeDeals: number
  tags: string[]
  lastActivity: string
  initials: string
  avatarColor: string
}

// ---------------------------------------------------------------------------
// Mock Data
// ---------------------------------------------------------------------------

const AVATAR_COLORS = [
  "bg-emerald-600",
  "bg-blue-600",
  "bg-amber-600",
  "bg-purple-600",
  "bg-rose-600",
  "bg-indigo-600",
  "bg-teal-600",
  "bg-orange-600",
  "bg-cyan-600",
  "bg-pink-600",
  "bg-lime-600",
  "bg-sky-600",
  "bg-violet-600",
  "bg-fuchsia-600",
  "bg-red-600",
]

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

const contacts: MockContact[] = [
  // SUPPLY (8)
  {
    id: "c-001",
    name: "Robert Whiteley",
    company: "Whiteley Farm Estate",
    type: "Landowner",
    side: "supply",
    email: "r.whiteley@whiteleyfarm.co.uk",
    phone: "07700 900123",
    location: "Whiteley, Hampshire",
    activeDeals: 1,
    tags: ["landowner", "nitrogen"],
    lastActivity: "5 Mar 2026",
    initials: "RW",
    avatarColor: AVATAR_COLORS[0],
  },
  {
    id: "c-002",
    name: "Margaret Thornton",
    company: "Thornton Land",
    type: "Landowner",
    side: "supply",
    email: "m.thornton@thorntonland.co.uk",
    phone: "07700 900234",
    location: "Botley, Hampshire",
    activeDeals: 1,
    tags: ["landowner", "nitrogen"],
    lastActivity: "4 Mar 2026",
    initials: "MT",
    avatarColor: AVATAR_COLORS[1],
  },
  {
    id: "c-003",
    name: "John Hamble",
    company: "Hamble Estate Ltd",
    type: "Landowner",
    side: "supply",
    email: "j.hamble@hambleestate.co.uk",
    phone: "07700 900345",
    location: "Hamble, Hampshire",
    activeDeals: 1,
    tags: ["landowner", "bng"],
    lastActivity: "3 Mar 2026",
    initials: "JH",
    avatarColor: AVATAR_COLORS[2],
  },
  {
    id: "c-004",
    name: "David Ashford",
    company: "Ashford Farm Estate",
    type: "Landowner",
    side: "supply",
    email: "d.ashford@ashfordfarm.co.uk",
    phone: "07700 900456",
    location: "Kings Worthy, Winchester",
    activeDeals: 1,
    tags: ["landowner", "nitrogen"],
    lastActivity: "5 Mar 2026",
    initials: "DA",
    avatarColor: AVATAR_COLORS[3],
  },
  {
    id: "c-005",
    name: "Susan Marsh",
    company: null,
    type: "Farmer",
    side: "supply",
    email: "s.marsh@gmail.com",
    phone: "07700 900567",
    location: "Fareham, Hampshire",
    activeDeals: 1,
    tags: ["farmer", "nitrogen"],
    lastActivity: "1 Mar 2026",
    initials: "SM",
    avatarColor: AVATAR_COLORS[4],
  },
  {
    id: "c-006",
    name: "Ian Stockbridge",
    company: "Stockbridge Estates",
    type: "Landowner",
    side: "supply",
    email: "i.stockbridge@stockbridge.co.uk",
    phone: "07700 900678",
    location: "Stockbridge, Hampshire",
    activeDeals: 1,
    tags: ["landowner", "nitrogen"],
    lastActivity: "28 Feb 2026",
    initials: "IS",
    avatarColor: AVATAR_COLORS[5],
  },
  {
    id: "c-007",
    name: "Helen Wickham",
    company: null,
    type: "Farmer",
    side: "supply",
    email: "h.wickham@outlook.com",
    phone: "07700 900789",
    location: "Wickham, Hampshire",
    activeDeals: 1,
    tags: ["farmer", "bng", "solar"],
    lastActivity: "27 Feb 2026",
    initials: "HW",
    avatarColor: AVATAR_COLORS[6],
  },
  {
    id: "c-008",
    name: "William Curdridge",
    company: "Curdridge Hall Farm",
    type: "Landowner",
    side: "supply",
    email: "w.curdridge@curdridgehall.co.uk",
    phone: "07700 900890",
    location: "Curdridge, Hampshire",
    activeDeals: 1,
    tags: ["landowner", "nitrogen"],
    lastActivity: "25 Feb 2026",
    initials: "WC",
    avatarColor: AVATAR_COLORS[7],
  },
  // DEMAND (7)
  {
    id: "c-009",
    name: "Rachel Morrison",
    company: "Taylor Wimpey Southern",
    type: "Developer",
    side: "demand",
    email: "r.morrison@taylorwimpey.com",
    phone: "020 7000 1234",
    location: "London",
    activeDeals: 2,
    tags: ["developer", "nitrogen"],
    lastActivity: "5 Mar 2026",
    initials: "RM",
    avatarColor: AVATAR_COLORS[8],
  },
  {
    id: "c-010",
    name: "Simon Barratt",
    company: "Barratt Homes Hampshire",
    type: "Housebuilder",
    side: "demand",
    email: "s.barratt@barrattdev.co.uk",
    phone: "020 7000 2345",
    location: "Southampton",
    activeDeals: 1,
    tags: ["housebuilder", "nitrogen"],
    lastActivity: "4 Mar 2026",
    initials: "SB",
    avatarColor: AVATAR_COLORS[9],
  },
  {
    id: "c-011",
    name: "James Bellway",
    company: "Bellway Homes South",
    type: "Housebuilder",
    side: "demand",
    email: "j.bellway@bellway.co.uk",
    phone: "020 7000 3456",
    location: "Basingstoke",
    activeDeals: 1,
    tags: ["housebuilder", "nitrogen"],
    lastActivity: "2 Mar 2026",
    initials: "JB",
    avatarColor: AVATAR_COLORS[10],
  },
  {
    id: "c-012",
    name: "Karen Persimmon",
    company: "Persimmon Homes Solent",
    type: "Developer",
    side: "demand",
    email: "k.persimmon@persimmonhomes.com",
    phone: "023 8000 4567",
    location: "Southampton",
    activeDeals: 1,
    tags: ["developer", "nitrogen"],
    lastActivity: "1 Mar 2026",
    initials: "KP",
    avatarColor: AVATAR_COLORS[11],
  },
  {
    id: "c-013",
    name: "Mark Linden",
    company: "Linden Homes South",
    type: "Housebuilder",
    side: "demand",
    email: "m.linden@lindenhomes.co.uk",
    phone: "020 7000 5678",
    location: "Southampton",
    activeDeals: 1,
    tags: ["housebuilder", "nitrogen"],
    lastActivity: "28 Feb 2026",
    initials: "ML",
    avatarColor: AVATAR_COLORS[12],
  },
  {
    id: "c-014",
    name: "Paul Miller",
    company: "Miller Homes Southern",
    type: "Housebuilder",
    side: "demand",
    email: "p.miller@millerhomes.co.uk",
    phone: "023 8000 6789",
    location: "Eastleigh",
    activeDeals: 1,
    tags: ["housebuilder", "nitrogen"],
    lastActivity: "26 Feb 2026",
    initials: "PM",
    avatarColor: AVATAR_COLORS[13],
  },
  {
    id: "c-015",
    name: "Sarah Wilson",
    company: "David Wilson Homes",
    type: "Housebuilder",
    side: "demand",
    email: "s.wilson@dwh.co.uk",
    phone: "023 8000 7890",
    location: "Winchester",
    activeDeals: 1,
    tags: ["housebuilder", "nitrogen", "bng"],
    lastActivity: "24 Feb 2026",
    initials: "SW",
    avatarColor: AVATAR_COLORS[14],
  },
]

// ---------------------------------------------------------------------------
// Badge helpers
// ---------------------------------------------------------------------------

function SideBadge({ side }: { side: ContactSide }) {
  if (side === "supply") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
        <Leaf className="h-3 w-3" />
        Supply
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
      <Building2 className="h-3 w-3" />
      Demand
    </span>
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
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${styles[type]}`}
    >
      {type}
    </span>
  )
}

function InitialsAvatar({
  initials,
  color,
  size = "md",
}: {
  initials: string
  color: string
  size?: "sm" | "md" | "lg"
}) {
  const sizeClasses = {
    sm: "h-7 w-7 text-[10px]",
    md: "h-9 w-9 text-xs",
    lg: "h-11 w-11 text-sm",
  }
  return (
    <div
      className={`${sizeClasses[size]} ${color} flex shrink-0 items-center justify-center rounded-full font-semibold text-white`}
    >
      {initials}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Variation 1 — Data Table with Tabs
// ---------------------------------------------------------------------------

function V1DataTable({
  filteredContacts,
  sideTab,
  setSideTab,
  searchQuery,
  setSearchQuery,
  typeFilter,
  setTypeFilter,
  activeDealsOnly,
  setActiveDealsOnly,
}: {
  filteredContacts: MockContact[]
  sideTab: string
  setSideTab: (v: string) => void
  searchQuery: string
  setSearchQuery: (v: string) => void
  typeFilter: string
  setTypeFilter: (v: string) => void
  activeDealsOnly: boolean
  setActiveDealsOnly: (v: boolean) => void
}) {
  const allCount = contacts.length
  const supplyCount = contacts.filter((c) => c.side === "supply").length
  const demandCount = contacts.filter((c) => c.side === "demand").length

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <Tabs value={sideTab} onValueChange={setSideTab}>
        <div className="flex items-center justify-between gap-4">
          <TabsList>
            <TabsTrigger value="all">All ({allCount})</TabsTrigger>
            <TabsTrigger value="supply">Supply ({supplyCount})</TabsTrigger>
            <TabsTrigger value="demand">Demand ({demandCount})</TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Download className="h-3.5 w-3.5" />
              Export
            </Button>
            <Button size="sm">
              <Plus className="h-3.5 w-3.5" />
              New Contact
            </Button>
          </div>
        </div>

        {/* Search & Filters Bar */}
        <div className="flex flex-wrap items-center gap-3 mt-4">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, company, or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="Landowner">Landowner</SelectItem>
              <SelectItem value="Farmer">Farmer</SelectItem>
              <SelectItem value="Developer">Developer</SelectItem>
              <SelectItem value="Housebuilder">Housebuilder</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2 text-sm">
            <Switch
              checked={activeDealsOnly}
              onCheckedChange={setActiveDealsOnly}
            />
            <span className="text-muted-foreground whitespace-nowrap">Active Deals</span>
          </div>
        </div>

        {/* All three tabs render the same table, filtered by sideTab */}
        {["all", "supply", "demand"].map((tab) => (
          <TabsContent key={tab} value={tab}>
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[240px]">Name</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead className="w-[110px]">Type</TableHead>
                      <TableHead className="w-[100px]">Side</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead className="w-[130px]">Phone</TableHead>
                      <TableHead className="w-[160px]">Location</TableHead>
                      <TableHead className="w-[80px] text-center">Deals</TableHead>
                      <TableHead>Tags</TableHead>
                      <TableHead className="w-[40px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredContacts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10} className="h-32 text-center text-muted-foreground">
                          No contacts match your filters.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredContacts.map((c) => (
                        <TableRow key={c.id} className="group cursor-pointer">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <InitialsAvatar initials={c.initials} color={c.avatarColor} size="sm" />
                              <span className="font-medium text-foreground group-hover:text-primary transition-colors">
                                {c.name}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {c.company ?? <span className="italic text-muted-foreground/50">--</span>}
                          </TableCell>
                          <TableCell>
                            <TypeBadge type={c.type} />
                          </TableCell>
                          <TableCell>
                            <SideBadge side={c.side} />
                          </TableCell>
                          <TableCell className="text-muted-foreground text-xs">{c.email}</TableCell>
                          <TableCell className="text-muted-foreground text-xs">{c.phone}</TableCell>
                          <TableCell>
                            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                              <MapPin className="h-3 w-3" />
                              {c.location}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            {c.activeDeals > 0 ? (
                              <div className="flex items-center justify-center gap-1.5">
                                <span className="font-semibold text-foreground">{c.activeDeals}</span>
                                <div className="h-1.5 w-6 rounded-full bg-muted overflow-hidden">
                                  <div
                                    className="h-full rounded-full bg-primary"
                                    style={{ width: `${Math.min(c.activeDeals * 50, 100)}%` }}
                                  />
                                </div>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">0</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {c.tags.map((tag) => (
                                <span
                                  key={tag}
                                  className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon-sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem>
                                  <Eye className="h-4 w-4" />
                                  View Profile
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Pencil className="h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem>
                                  <Handshake className="h-4 w-4" />
                                  Create Deal
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            <div className="text-xs text-muted-foreground mt-2">
              Showing {filteredContacts.length} of {contacts.length} contacts
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Variation 2 — Two-Column Card Layout (Supply | Demand split)
// ---------------------------------------------------------------------------

function V2SplitCards({
  filteredContacts,
  searchQuery,
  setSearchQuery,
  typeFilter,
  setTypeFilter,
  activeDealsOnly,
  setActiveDealsOnly,
}: {
  filteredContacts: MockContact[]
  searchQuery: string
  setSearchQuery: (v: string) => void
  typeFilter: string
  setTypeFilter: (v: string) => void
  activeDealsOnly: boolean
  setActiveDealsOnly: (v: boolean) => void
}) {
  const supplyContacts = filteredContacts.filter((c) => c.side === "supply")
  const demandContacts = filteredContacts.filter((c) => c.side === "demand")

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, company, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="Landowner">Landowner</SelectItem>
            <SelectItem value="Farmer">Farmer</SelectItem>
            <SelectItem value="Developer">Developer</SelectItem>
            <SelectItem value="Housebuilder">Housebuilder</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2 text-sm">
          <Switch checked={activeDealsOnly} onCheckedChange={setActiveDealsOnly} />
          <span className="text-muted-foreground whitespace-nowrap">Active Deals</span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-3.5 w-3.5" />
            Export
          </Button>
          <Button size="sm">
            <Plus className="h-3.5 w-3.5" />
            New Contact
          </Button>
        </div>
      </div>

      {/* Two-column split */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Supply Column */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1">
              <Leaf className="h-3.5 w-3.5 text-emerald-600" />
              <span className="text-sm font-semibold text-emerald-700">Supply</span>
            </div>
            <span className="text-xs text-muted-foreground">{supplyContacts.length} contacts</span>
          </div>
          <div className="space-y-3">
            {supplyContacts.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground text-sm">
                  No supply contacts match your filters.
                </CardContent>
              </Card>
            ) : (
              supplyContacts.map((c) => (
                <Card key={c.id} className="hover:border-emerald-200 transition-colors group cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <InitialsAvatar initials={c.initials} color={c.avatarColor} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-sm group-hover:text-primary transition-colors">{c.name}</span>
                          <TypeBadge type={c.type} />
                        </div>
                        {c.company && (
                          <p className="text-xs text-muted-foreground mb-2">{c.company}</p>
                        )}
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {c.email}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {c.phone}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {c.location}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="inline-flex items-center gap-1 text-xs">
                            <Handshake className="h-3 w-3 text-muted-foreground" />
                            <span className="font-medium">{c.activeDeals}</span>
                            <span className="text-muted-foreground">active deal{c.activeDeals !== 1 ? "s" : ""}</span>
                          </span>
                          <div className="flex gap-1">
                            {c.tags.map((tag) => (
                              <span
                                key={tag}
                                className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* Demand Column */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1">
              <Building2 className="h-3.5 w-3.5 text-blue-600" />
              <span className="text-sm font-semibold text-blue-700">Demand</span>
            </div>
            <span className="text-xs text-muted-foreground">{demandContacts.length} contacts</span>
          </div>
          <div className="space-y-3">
            {demandContacts.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground text-sm">
                  No demand contacts match your filters.
                </CardContent>
              </Card>
            ) : (
              demandContacts.map((c) => (
                <Card key={c.id} className="hover:border-blue-200 transition-colors group cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <InitialsAvatar initials={c.initials} color={c.avatarColor} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-sm group-hover:text-primary transition-colors">{c.name}</span>
                          <TypeBadge type={c.type} />
                        </div>
                        {c.company && (
                          <p className="text-xs text-muted-foreground mb-2">{c.company}</p>
                        )}
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {c.email}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {c.phone}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {c.location}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="inline-flex items-center gap-1 text-xs">
                            <Handshake className="h-3 w-3 text-muted-foreground" />
                            <span className="font-medium">{c.activeDeals}</span>
                            <span className="text-muted-foreground">active deal{c.activeDeals !== 1 ? "s" : ""}</span>
                          </span>
                          <div className="flex gap-1">
                            {c.tags.map((tag) => (
                              <span
                                key={tag}
                                className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Variation 3 — CRM-style List
// ---------------------------------------------------------------------------

function V3CrmList({
  filteredContacts,
  searchQuery,
  setSearchQuery,
  typeFilter,
  setTypeFilter,
  activeDealsOnly,
  setActiveDealsOnly,
}: {
  filteredContacts: MockContact[]
  searchQuery: string
  setSearchQuery: (v: string) => void
  typeFilter: string
  setTypeFilter: (v: string) => void
  activeDealsOnly: boolean
  setActiveDealsOnly: (v: boolean) => void
}) {
  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, company, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="Landowner">Landowner</SelectItem>
            <SelectItem value="Farmer">Farmer</SelectItem>
            <SelectItem value="Developer">Developer</SelectItem>
            <SelectItem value="Housebuilder">Housebuilder</SelectItem>
          </SelectContent>
        </Select>
        <Select defaultValue="all">
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Side" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sides</SelectItem>
            <SelectItem value="supply">Supply</SelectItem>
            <SelectItem value="demand">Demand</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2 text-sm">
          <Switch checked={activeDealsOnly} onCheckedChange={setActiveDealsOnly} />
          <span className="text-muted-foreground whitespace-nowrap">Active Deals</span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-3.5 w-3.5" />
            Export
          </Button>
          <Button size="sm">
            <Plus className="h-3.5 w-3.5" />
            New Contact
          </Button>
        </div>
      </div>

      {/* CRM Rows */}
      <div className="space-y-2">
        {filteredContacts.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground text-sm">
              No contacts match your filters.
            </CardContent>
          </Card>
        ) : (
          filteredContacts.map((c) => (
            <Card key={c.id} className="hover:border-primary/20 hover:shadow-sm transition-all group cursor-pointer">
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  {/* Avatar */}
                  <InitialsAvatar initials={c.initials} color={c.avatarColor} size="lg" />

                  {/* Main info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 mb-0.5">
                      <span className="text-base font-semibold group-hover:text-primary transition-colors">
                        {c.name}
                      </span>
                      <SideBadge side={c.side} />
                      <TypeBadge type={c.type} />
                    </div>
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-1">
                      {c.company ? (
                        <span>{c.company}</span>
                      ) : (
                        <span className="italic">Independent</span>
                      )}
                      <span className="text-border">|</span>
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {c.location}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {c.email}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {c.phone}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Last activity: {c.lastActivity}
                      </span>
                    </div>
                  </div>

                  {/* Right section: deals + tags + actions */}
                  <div className="flex items-center gap-4 shrink-0">
                    {/* Deal count */}
                    <div className="text-center px-3">
                      <div className="text-lg font-bold text-foreground">{c.activeDeals}</div>
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
                        Deal{c.activeDeals !== 1 ? "s" : ""}
                      </div>
                    </div>

                    {/* Tags */}
                    <div className="hidden xl:flex flex-col gap-1 min-w-[80px]">
                      {c.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground text-center"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        View
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                          >
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
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <div className="text-xs text-muted-foreground">
        Showing {filteredContacts.length} of {contacts.length} contacts
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function ContactsPage() {
  const [variation, setVariation] = useState<"v1" | "v2" | "v3">("v1")
  const [searchQuery, setSearchQuery] = useState("")
  const [sideTab, setSideTab] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")
  const [activeDealsOnly, setActiveDealsOnly] = useState(false)

  // Apply filters
  const filteredContacts = useMemo(() => {
    return contacts.filter((c) => {
      // Side filter (for V1 tabs)
      if (sideTab !== "all" && c.side !== sideTab) return false

      // Type filter
      if (typeFilter !== "all" && c.type !== typeFilter) return false

      // Active deals filter
      if (activeDealsOnly && c.activeDeals === 0) return false

      // Search
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        const matchesName = c.name.toLowerCase().includes(q)
        const matchesCompany = c.company?.toLowerCase().includes(q) ?? false
        const matchesEmail = c.email.toLowerCase().includes(q)
        const matchesLocation = c.location.toLowerCase().includes(q)
        if (!matchesName && !matchesCompany && !matchesEmail && !matchesLocation) return false
      }

      return true
    })
  }, [searchQuery, sideTab, typeFilter, activeDealsOnly])

  return (
    <div className="max-w-screen-2xl mx-auto px-6 py-6">
      {/* Page Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Contacts</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage landowners, farmers, developers, and housebuilders across supply and demand sides.
          </p>
        </div>

        {/* Variation Switcher */}
        <div className="flex items-center gap-1 rounded-lg border border-border bg-muted p-1">
          <button
            onClick={() => setVariation("v1")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
              variation === "v1"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <LayoutList className="h-3.5 w-3.5" />
            V1: Table
          </button>
          <button
            onClick={() => setVariation("v2")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
              variation === "v2"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Columns2 className="h-3.5 w-3.5" />
            V2: Split
          </button>
          <button
            onClick={() => setVariation("v3")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
              variation === "v3"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Contact className="h-3.5 w-3.5" />
            V3: CRM
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Total Contacts</p>
                <p className="text-2xl font-bold mt-0.5">{contacts.length}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                <Contact className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Supply Side</p>
                <p className="text-2xl font-bold mt-0.5 text-emerald-600">
                  {contacts.filter((c) => c.side === "supply").length}
                </p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                <Leaf className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Demand Side</p>
                <p className="text-2xl font-bold mt-0.5 text-blue-600">
                  {contacts.filter((c) => c.side === "demand").length}
                </p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Active Deals</p>
                <p className="text-2xl font-bold mt-0.5">
                  {contacts.reduce((sum, c) => sum + c.activeDeals, 0)}
                </p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                <Handshake className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Variations */}
      {variation === "v1" && (
        <V1DataTable
          filteredContacts={filteredContacts}
          sideTab={sideTab}
          setSideTab={setSideTab}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          typeFilter={typeFilter}
          setTypeFilter={setTypeFilter}
          activeDealsOnly={activeDealsOnly}
          setActiveDealsOnly={setActiveDealsOnly}
        />
      )}
      {variation === "v2" && (
        <V2SplitCards
          filteredContacts={filteredContacts}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          typeFilter={typeFilter}
          setTypeFilter={setTypeFilter}
          activeDealsOnly={activeDealsOnly}
          setActiveDealsOnly={setActiveDealsOnly}
        />
      )}
      {variation === "v3" && (
        <V3CrmList
          filteredContacts={filteredContacts}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          typeFilter={typeFilter}
          setTypeFilter={setTypeFilter}
          activeDealsOnly={activeDealsOnly}
          setActiveDealsOnly={setActiveDealsOnly}
        />
      )}
    </div>
  )
}
