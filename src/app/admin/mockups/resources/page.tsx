"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import {
  Plus,
  Search,
  MoreHorizontal,
  Eye,
  Pencil,
  Calendar,
  UserX,
  Users,
  Activity,
  AlertTriangle,
  Car,
  Wrench,
  User,
} from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

type ResourceType = "person" | "vehicle" | "equipment"
type ResourceStatus = "available" | "busy" | "offline"
type TabFilter = "all" | ResourceType

interface Resource {
  id: string
  name: string
  type: ResourceType
  status: ResourceStatus
  skills: string[]
  schedule: string | null
  utilisationPct: number
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const RESOURCES: Resource[] = [
  {
    id: "r1",
    name: "Sarah Chen",
    type: "person",
    status: "busy",
    skills: ["Gas Safe", "First Aid", "CCTV"],
    schedule: "09:00–14:00",
    utilisationPct: 85,
  },
  {
    id: "r2",
    name: "Mike Torres",
    type: "person",
    status: "available",
    skills: ["CCTV", "Electrical"],
    schedule: null,
    utilisationPct: 45,
  },
  {
    id: "r3",
    name: "Priya Nair",
    type: "person",
    status: "busy",
    skills: ["Gas Safe", "Plumbing", "First Aid"],
    schedule: "08:00–17:00",
    utilisationPct: 92,
  },
  {
    id: "r4",
    name: "James Holloway",
    type: "person",
    status: "offline",
    skills: ["Electrical", "PAT Testing"],
    schedule: null,
    utilisationPct: 0,
  },
  {
    id: "r5",
    name: "Amir Khalil",
    type: "person",
    status: "available",
    skills: ["Fire Safety", "First Aid"],
    schedule: null,
    utilisationPct: 30,
  },
  {
    id: "r6",
    name: "Van 1 — LK21 ABC",
    type: "vehicle",
    status: "busy",
    skills: ["3.5t", "Tow Bar"],
    schedule: "08:30–17:00",
    utilisationPct: 90,
  },
  {
    id: "r7",
    name: "Van 2 — YH19 DEF",
    type: "vehicle",
    status: "available",
    skills: ["3.5t"],
    schedule: null,
    utilisationPct: 55,
  },
  {
    id: "r8",
    name: "Pressure Washer #2",
    type: "equipment",
    status: "available",
    skills: ["200 bar", "Hot water"],
    schedule: null,
    utilisationPct: 20,
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TYPE_STYLES: Record<ResourceType, string> = {
  person: "bg-blue-50 text-blue-700 border-blue-200",
  vehicle: "bg-zinc-100 text-zinc-600 border-zinc-200",
  equipment: "bg-amber-50 text-amber-700 border-amber-200",
}

const TYPE_LABELS: Record<ResourceType, string> = {
  person: "Person",
  vehicle: "Vehicle",
  equipment: "Equipment",
}

const TYPE_ICONS: Record<ResourceType, React.ElementType> = {
  person: User,
  vehicle: Car,
  equipment: Wrench,
}

function TypeBadge({ type }: { type: ResourceType }) {
  const Icon = TYPE_ICONS[type]
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
        TYPE_STYLES[type],
      )}
    >
      <Icon className="h-3 w-3" />
      {TYPE_LABELS[type]}
    </span>
  )
}

const STATUS_STYLES: Record<ResourceStatus, string> = {
  available: "bg-emerald-50 text-emerald-700 border-emerald-200",
  busy: "bg-rose-50 text-rose-700 border-rose-200",
  offline: "bg-zinc-100 text-zinc-500 border-zinc-200",
}

const STATUS_LABELS: Record<ResourceStatus, string> = {
  available: "Available",
  busy: "Busy",
  offline: "Offline",
}

function StatusBadge({ status }: { status: ResourceStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold",
        STATUS_STYLES[status],
      )}
    >
      <span
        className={cn(
          "mr-1.5 h-1.5 w-1.5 rounded-full",
          status === "available"
            ? "bg-emerald-500"
            : status === "busy"
            ? "bg-rose-500"
            : "bg-zinc-400",
        )}
      />
      {STATUS_LABELS[status]}
    </span>
  )
}

function UtilisationCell({ pct }: { pct: number }) {
  const color =
    pct >= 80 ? "bg-rose-400" : pct >= 50 ? "bg-amber-400" : "bg-emerald-400"
  return (
    <div className="flex items-center gap-2 min-w-[80px]">
      <div className="h-1.5 w-16 rounded-full bg-zinc-100 overflow-hidden flex-shrink-0">
        <div
          className={cn("h-full rounded-full transition-all", color)}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs tabular-nums font-medium text-zinc-600">{pct}%</span>
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

const TAB_OPTIONS: { id: TabFilter; label: string }[] = [
  { id: "all", label: `All` },
  { id: "person", label: `People (${RESOURCES.filter((r) => r.type === "person").length})` },
  { id: "vehicle", label: `Vehicles (${RESOURCES.filter((r) => r.type === "vehicle").length})` },
  { id: "equipment", label: `Equipment (${RESOURCES.filter((r) => r.type === "equipment").length})` },
]

const totalCount = RESOURCES.length
const activeCount = RESOURCES.filter((r) => r.status !== "offline").length
const avgUtilisation = Math.round(
  RESOURCES.filter((r) => r.status !== "offline").reduce((s, r) => s + r.utilisationPct, 0) /
    (RESOURCES.filter((r) => r.status !== "offline").length || 1),
)
const expiringCerts = 3

export default function ResourcesPage() {
  const [tab, setTab] = useState<TabFilter>("all")
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  const filtered = RESOURCES.filter((r) => {
    if (tab !== "all" && r.type !== tab) return false
    if (statusFilter !== "all" && r.status !== statusFilter) return false
    if (search && !r.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Resources</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            Manage people, vehicles, and equipment across your operation
          </p>
        </div>
        <Button className="gap-2 bg-zinc-900 hover:bg-zinc-700 text-white">
          <Plus className="h-4 w-4" />
          Add Resource
        </Button>
      </div>

      {/* ── KPI row ── */}
      <div className="grid grid-cols-4 gap-4">
        {[
          {
            label: "Total Resources",
            value: String(totalCount),
            Icon: Users,
            accent: "text-zinc-600",
            bg: "bg-zinc-100",
          },
          {
            label: "Active Today",
            value: String(activeCount),
            Icon: Activity,
            accent: "text-emerald-600",
            bg: "bg-emerald-50",
          },
          {
            label: "Utilisation",
            value: `${avgUtilisation}%`,
            Icon: Activity,
            accent: "text-blue-600",
            bg: "bg-blue-50",
          },
          {
            label: "Certs Expiring",
            value: String(expiringCerts),
            Icon: AlertTriangle,
            accent: "text-amber-600",
            bg: "bg-amber-50",
          },
        ].map(({ label, value, Icon, accent, bg }) => (
          <div key={label} className="rounded-xl border border-zinc-200 bg-white p-5 space-y-1">
            <div className="flex items-center justify-between">
              <p className="text-xs text-zinc-500 font-medium">{label}</p>
              <div className={cn("h-7 w-7 rounded-lg flex items-center justify-center", bg)}>
                <Icon className={cn("h-3.5 w-3.5", accent)} />
              </div>
            </div>
            <p className="text-2xl font-bold text-zinc-900 tabular-nums">{value}</p>
          </div>
        ))}
      </div>

      {/* ── Tab bar ── */}
      <div className="flex items-center gap-2">
        {TAB_OPTIONS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              tab === id
                ? "border-zinc-900 bg-zinc-900 text-white"
                : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Search + filter bar ── */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <Input
            placeholder="Search resources…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-9 w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="available">Available</SelectItem>
            <SelectItem value="busy">Busy</SelectItem>
            <SelectItem value="offline">Offline</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* ── Table ── */}
      <div className="rounded-xl border border-zinc-200 overflow-hidden bg-white">
        <Table>
          <TableHeader>
            <TableRow className="bg-zinc-50 hover:bg-zinc-50">
              <TableHead className="text-xs font-semibold text-zinc-600 py-3 pl-5">Name</TableHead>
              <TableHead className="text-xs font-semibold text-zinc-600 py-3">Type</TableHead>
              <TableHead className="text-xs font-semibold text-zinc-600 py-3">Status</TableHead>
              <TableHead className="text-xs font-semibold text-zinc-600 py-3">Skills / Certs</TableHead>
              <TableHead className="text-xs font-semibold text-zinc-600 py-3">Today&apos;s Schedule</TableHead>
              <TableHead className="text-xs font-semibold text-zinc-600 py-3">Utilisation</TableHead>
              <TableHead className="text-xs font-semibold text-zinc-600 py-3 text-right pr-5">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((resource) => {
              const TypeIcon = TYPE_ICONS[resource.type]
              return (
                <TableRow key={resource.id} className="hover:bg-zinc-50/50 cursor-pointer group">
                  {/* Name */}
                  <TableCell className="py-3.5 pl-5">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-zinc-100 flex items-center justify-center flex-shrink-0">
                        <TypeIcon className="h-4 w-4 text-zinc-500" />
                      </div>
                      <span className="text-sm font-semibold text-zinc-900">{resource.name}</span>
                    </div>
                  </TableCell>

                  {/* Type */}
                  <TableCell className="py-3.5">
                    <TypeBadge type={resource.type} />
                  </TableCell>

                  {/* Status */}
                  <TableCell className="py-3.5">
                    <StatusBadge status={resource.status} />
                  </TableCell>

                  {/* Skills */}
                  <TableCell className="py-3.5">
                    <div className="flex flex-wrap gap-1">
                      {resource.skills.map((skill) => (
                        <span
                          key={skill}
                          className="inline-flex items-center rounded border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 text-[11px] font-medium text-zinc-600"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </TableCell>

                  {/* Schedule */}
                  <TableCell className="py-3.5">
                    {resource.schedule ? (
                      <div className="flex items-center gap-1.5 text-sm text-zinc-700">
                        <Calendar className="h-3.5 w-3.5 text-zinc-400 flex-shrink-0" />
                        {resource.schedule}
                      </div>
                    ) : (
                      <span className="text-sm text-zinc-400">Unassigned</span>
                    )}
                  </TableCell>

                  {/* Utilisation */}
                  <TableCell className="py-3.5">
                    <UtilisationCell pct={resource.utilisationPct} />
                  </TableCell>

                  {/* Actions */}
                  <TableCell className="py-3.5 text-right pr-5">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-zinc-400 hover:text-zinc-700 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem className="gap-2 text-xs">
                          <Eye className="h-3.5 w-3.5" /> View
                        </DropdownMenuItem>
                        <DropdownMenuItem className="gap-2 text-xs">
                          <Pencil className="h-3.5 w-3.5" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem className="gap-2 text-xs">
                          <Calendar className="h-3.5 w-3.5" /> Schedule
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="gap-2 text-xs text-rose-600 focus:text-rose-600">
                          <UserX className="h-3.5 w-3.5" /> Deactivate
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>

        {/* Table footer */}
        <div className="border-t border-zinc-100 px-5 py-3 flex items-center justify-between bg-zinc-50/50">
          <p className="text-xs text-zinc-500">
            {filtered.length} resource{filtered.length !== 1 ? "s" : ""}
            {tab !== "all" && (
              <>
                {" "}
                &middot; <span className="font-medium capitalize">{tab}s</span>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  )
}
