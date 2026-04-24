"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
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
import { cn } from "@/lib/utils"
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  LayoutList,
  Columns3,
  MoreHorizontal,
  Eye,
  Pencil,
  UserCheck,
  Trash2,
  CheckCircle2,
  Clock,
  AlertCircle,
  Circle,
} from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

type JobStatus = "unassigned" | "scheduled" | "in_progress" | "completed"
type JobPriority = "normal" | "urgent"

interface Job {
  id: string
  ref: string
  customer: string
  addressSnippet: string
  serviceType: string
  serviceColor: string
  assignedName: string | null
  assignedInitials: string | null
  assignedAvatarColor: string | null
  timeSlot: string
  status: JobStatus
  priority: JobPriority
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const JOBS: Job[] = [
  {
    id: "j1",
    ref: "J-0908",
    customer: "Acme Ltd",
    addressSnippet: "12 Park Ln, SE1",
    serviceType: "Gas Service",
    serviceColor: "blue",
    assignedName: null,
    assignedInitials: null,
    assignedAvatarColor: null,
    timeSlot: "Flexible",
    status: "unassigned",
    priority: "normal",
  },
  {
    id: "j2",
    ref: "J-0909",
    customer: "TechCorp HQ",
    addressSnippet: "4 Canary Wharf, E14",
    serviceType: "CCTV Install",
    serviceColor: "violet",
    assignedName: null,
    assignedInitials: null,
    assignedAvatarColor: null,
    timeSlot: "14:00–16:00",
    status: "unassigned",
    priority: "urgent",
  },
  {
    id: "j3",
    ref: "J-0910",
    customer: "RetailCo",
    addressSnippet: "89 Oxford St, W1",
    serviceType: "Boiler Repair",
    serviceColor: "amber",
    assignedName: "Sarah Chen",
    assignedInitials: "SC",
    assignedAvatarColor: "bg-violet-500",
    timeSlot: "09:00–11:00",
    status: "scheduled",
    priority: "urgent",
  },
  {
    id: "j4",
    ref: "J-0911",
    customer: "Green Valley",
    addressSnippet: "34 Mill Rd, SW6",
    serviceType: "Window Clean",
    serviceColor: "teal",
    assignedName: "Mike Torres",
    assignedInitials: "MT",
    assignedAvatarColor: "bg-blue-500",
    timeSlot: "10:30–12:00",
    status: "scheduled",
    priority: "normal",
  },
  {
    id: "j5",
    ref: "J-0912",
    customer: "City Council",
    addressSnippet: "Council Depot, N1",
    serviceType: "Gas Service",
    serviceColor: "blue",
    assignedName: "Priya Nair",
    assignedInitials: "PN",
    assignedAvatarColor: "bg-pink-500",
    timeSlot: "08:00–10:00",
    status: "scheduled",
    priority: "normal",
  },
  {
    id: "j6",
    ref: "J-0913",
    customer: "Old Mill Estate",
    addressSnippet: "Old Mill, EC1",
    serviceType: "Fire Safety",
    serviceColor: "rose",
    assignedName: "Amir Khalil",
    assignedInitials: "AK",
    assignedAvatarColor: "bg-emerald-600",
    timeSlot: "08:30–09:30",
    status: "in_progress",
    priority: "normal",
  },
  {
    id: "j7",
    ref: "J-0914",
    customer: "Shoreditch Café",
    addressSnippet: "22 Brick Ln, E1",
    serviceType: "Boiler Repair",
    serviceColor: "amber",
    assignedName: "Sarah Chen",
    assignedInitials: "SC",
    assignedAvatarColor: "bg-violet-500",
    timeSlot: "09:00–11:00",
    status: "in_progress",
    priority: "urgent",
  },
  {
    id: "j8",
    ref: "J-0915",
    customer: "Patel & Sons",
    addressSnippet: "88 Green St, E7",
    serviceType: "Electrical",
    serviceColor: "yellow",
    assignedName: "James Holloway",
    assignedInitials: "JH",
    assignedAvatarColor: "bg-amber-600",
    timeSlot: "07:00–08:30",
    status: "in_progress",
    priority: "normal",
  },
  {
    id: "j9",
    ref: "J-0916",
    customer: "Harbour Club",
    addressSnippet: "1 Chelsea Hbr, SW10",
    serviceType: "CCTV Install",
    serviceColor: "violet",
    assignedName: "Mike Torres",
    assignedInitials: "MT",
    assignedAvatarColor: "bg-blue-500",
    timeSlot: "07:00–08:00",
    status: "completed",
    priority: "normal",
  },
  {
    id: "j10",
    ref: "J-0917",
    customer: "Acme Ltd",
    addressSnippet: "12 Park Ln, SE1",
    serviceType: "Window Clean",
    serviceColor: "teal",
    assignedName: "Priya Nair",
    assignedInitials: "PN",
    assignedAvatarColor: "bg-pink-500",
    timeSlot: "07:30–08:30",
    status: "completed",
    priority: "normal",
  },
  {
    id: "j11",
    ref: "J-0918",
    customer: "RetailCo",
    addressSnippet: "89 Oxford St, W1",
    serviceType: "Gas Service",
    serviceColor: "blue",
    assignedName: "Amir Khalil",
    assignedInitials: "AK",
    assignedAvatarColor: "bg-emerald-600",
    timeSlot: "08:00–09:00",
    status: "completed",
    priority: "normal",
  },
  {
    id: "j12",
    ref: "J-0919",
    customer: "TechCorp HQ",
    addressSnippet: "4 Canary Wharf, E14",
    serviceType: "Fire Safety",
    serviceColor: "rose",
    assignedName: "James Holloway",
    assignedInitials: "JH",
    assignedAvatarColor: "bg-amber-600",
    timeSlot: "07:00–08:00",
    status: "completed",
    priority: "normal",
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SERVICE_COLOR_MAP: Record<string, string> = {
  blue: "bg-blue-500",
  violet: "bg-violet-500",
  amber: "bg-amber-500",
  teal: "bg-teal-500",
  rose: "bg-rose-500",
  yellow: "bg-yellow-400",
}

const SERVICE_BADGE_MAP: Record<string, string> = {
  blue: "bg-blue-50 text-blue-700 border-blue-200",
  violet: "bg-violet-50 text-violet-700 border-violet-200",
  amber: "bg-amber-50 text-amber-700 border-amber-200",
  teal: "bg-teal-50 text-teal-700 border-teal-200",
  rose: "bg-rose-50 text-rose-700 border-rose-200",
  yellow: "bg-yellow-50 text-yellow-700 border-yellow-200",
}

function ServiceBadge({ type, color }: { type: string; color: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
        SERVICE_BADGE_MAP[color] ?? "bg-zinc-100 text-zinc-600 border-zinc-200",
      )}
    >
      {type}
    </span>
  )
}

function PriorityBadge({ priority }: { priority: JobPriority }) {
  if (priority === "urgent") {
    return (
      <span className="inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-600">
        Urgent
      </span>
    )
  }
  return (
    <span className="inline-flex items-center rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-xs font-medium text-zinc-500">
      Normal
    </span>
  )
}

const STATUS_INFO: Record<
  JobStatus,
  { label: string; badgeClass: string; Icon: React.ElementType }
> = {
  unassigned: {
    label: "Unassigned",
    badgeClass: "bg-zinc-100 text-zinc-500 border-zinc-200",
    Icon: Circle,
  },
  scheduled: {
    label: "Scheduled",
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
    Icon: Clock,
  },
  in_progress: {
    label: "In Progress",
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
    Icon: AlertCircle,
  },
  completed: {
    label: "Completed",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
    Icon: CheckCircle2,
  },
}

function StatusBadge({ status }: { status: JobStatus }) {
  const { label, badgeClass, Icon } = STATUS_INFO[status]
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold",
        badgeClass,
      )}
    >
      <Icon className="h-3 w-3" />
      {label}
    </span>
  )
}

function ResourceAvatar({
  name,
  initials,
  avatarColor,
}: {
  name: string | null
  initials: string | null
  avatarColor: string | null
}) {
  if (!name || !initials) {
    return (
      <span className="text-xs text-zinc-400 italic">Unassigned</span>
    )
  }
  return (
    <div className="flex items-center gap-2">
      <div
        className={cn(
          "h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0",
          avatarColor ?? "bg-zinc-400",
        )}
      >
        {initials}
      </div>
      <span className="text-xs font-medium text-zinc-700">{name}</span>
    </div>
  )
}

// ─── Board Column ──────────────────────────────────────────────────────────────

const COLUMN_CONFIG: {
  status: JobStatus
  title: string
  headerClass: string
  borderClass: string
  countClass: string
}[] = [
  {
    status: "unassigned",
    title: "Unassigned",
    headerClass: "bg-zinc-50 border-zinc-200",
    borderClass: "border-l-zinc-400",
    countClass: "bg-zinc-200 text-zinc-600",
  },
  {
    status: "scheduled",
    title: "Scheduled",
    headerClass: "bg-blue-50 border-blue-100",
    borderClass: "border-l-blue-500",
    countClass: "bg-blue-100 text-blue-700",
  },
  {
    status: "in_progress",
    title: "In Progress",
    headerClass: "bg-amber-50 border-amber-100",
    borderClass: "border-l-amber-500",
    countClass: "bg-amber-100 text-amber-700",
  },
  {
    status: "completed",
    title: "Completed",
    headerClass: "bg-emerald-50 border-emerald-100",
    borderClass: "border-l-emerald-500",
    countClass: "bg-emerald-100 text-emerald-700",
  },
]

function JobCard({ job }: { job: Job }) {
  const colConfig = COLUMN_CONFIG.find((c) => c.status === job.status)!

  return (
    <div
      className={cn(
        "bg-white rounded-lg border border-zinc-200 border-l-[3px] p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer space-y-2.5",
        colConfig.borderClass,
      )}
    >
      {/* Top row: ref + priority */}
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-mono text-zinc-400">{job.ref}</span>
        {job.priority === "urgent" && (
          <span className="inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-1.5 py-0.5 text-[10px] font-bold text-rose-600">
            URGENT
          </span>
        )}
      </div>

      {/* Customer + address */}
      <div>
        <p className="text-sm font-semibold text-zinc-900 leading-tight">{job.customer}</p>
        <p className="text-xs text-zinc-500 mt-0.5">{job.addressSnippet}</p>
      </div>

      {/* Service badge */}
      <ServiceBadge type={job.serviceType} color={job.serviceColor} />

      {/* Footer: resource + time */}
      <div className="flex items-center justify-between pt-1 border-t border-zinc-100">
        <ResourceAvatar
          name={job.assignedName}
          initials={job.assignedInitials}
          avatarColor={job.assignedAvatarColor}
        />
        <span className="text-[11px] text-zinc-400 tabular-nums flex-shrink-0">{job.timeSlot}</span>
      </div>
    </div>
  )
}

function BoardView({ jobs }: { jobs: Job[] }) {
  return (
    <div className="grid grid-cols-4 gap-4 items-start">
      {COLUMN_CONFIG.map(({ status, title, headerClass, countClass }) => {
        const colJobs = jobs.filter((j) => j.status === status)
        return (
          <div key={status} className="flex flex-col gap-3">
            {/* Column header */}
            <div
              className={cn(
                "flex items-center gap-2 rounded-lg border px-3 py-2",
                headerClass,
              )}
            >
              <span className="text-xs font-semibold text-zinc-700 flex-1">{title}</span>
              <span
                className={cn(
                  "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold tabular-nums",
                  countClass,
                )}
              >
                {colJobs.length}
              </span>
            </div>

            {/* Cards */}
            <div className="space-y-2.5">
              {colJobs.map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
            </div>

            {/* Empty state */}
            {colJobs.length === 0 && (
              <div className="rounded-lg border-2 border-dashed border-zinc-200 py-6 flex items-center justify-center">
                <p className="text-xs text-zinc-400">No jobs</p>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── List View ────────────────────────────────────────────────────────────────

function ListView({ jobs }: { jobs: Job[] }) {
  return (
    <div className="rounded-xl border border-zinc-200 overflow-hidden bg-white">
      <Table>
        <TableHeader>
          <TableRow className="bg-zinc-50 hover:bg-zinc-50">
            <TableHead className="text-xs font-semibold text-zinc-600 py-3 pl-5">Job Ref</TableHead>
            <TableHead className="text-xs font-semibold text-zinc-600 py-3">Customer</TableHead>
            <TableHead className="text-xs font-semibold text-zinc-600 py-3">Service</TableHead>
            <TableHead className="text-xs font-semibold text-zinc-600 py-3">Resource</TableHead>
            <TableHead className="text-xs font-semibold text-zinc-600 py-3">Time</TableHead>
            <TableHead className="text-xs font-semibold text-zinc-600 py-3">Status</TableHead>
            <TableHead className="text-xs font-semibold text-zinc-600 py-3">Priority</TableHead>
            <TableHead className="text-xs font-semibold text-zinc-600 py-3 text-right pr-5">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {jobs.map((job) => (
            <TableRow key={job.id} className="hover:bg-zinc-50/50 cursor-pointer group">
              <TableCell className="py-3.5 pl-5">
                <span className="text-xs font-mono font-semibold text-zinc-600">{job.ref}</span>
              </TableCell>
              <TableCell className="py-3.5">
                <div>
                  <p className="text-sm font-semibold text-zinc-900">{job.customer}</p>
                  <p className="text-xs text-zinc-400 mt-0.5">{job.addressSnippet}</p>
                </div>
              </TableCell>
              <TableCell className="py-3.5">
                <ServiceBadge type={job.serviceType} color={job.serviceColor} />
              </TableCell>
              <TableCell className="py-3.5">
                <ResourceAvatar
                  name={job.assignedName}
                  initials={job.assignedInitials}
                  avatarColor={job.assignedAvatarColor}
                />
              </TableCell>
              <TableCell className="py-3.5">
                <span className="text-sm text-zinc-600 tabular-nums">{job.timeSlot}</span>
              </TableCell>
              <TableCell className="py-3.5">
                <StatusBadge status={job.status} />
              </TableCell>
              <TableCell className="py-3.5">
                <PriorityBadge priority={job.priority} />
              </TableCell>
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
                      <Eye className="h-3.5 w-3.5" /> View Job
                    </DropdownMenuItem>
                    <DropdownMenuItem className="gap-2 text-xs">
                      <Pencil className="h-3.5 w-3.5" /> Edit Job
                    </DropdownMenuItem>
                    <DropdownMenuItem className="gap-2 text-xs">
                      <UserCheck className="h-3.5 w-3.5" /> Assign Resource
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="gap-2 text-xs text-rose-600 focus:text-rose-600">
                      <Trash2 className="h-3.5 w-3.5" /> Cancel Job
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className="border-t border-zinc-100 px-5 py-3 flex items-center bg-zinc-50/50">
        <p className="text-xs text-zinc-500">{jobs.length} jobs today</p>
      </div>
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

type ViewMode = "board" | "list"

const totalToday = JOBS.length
const completedCount = JOBS.filter((j) => j.status === "completed").length
const inProgressCount = JOBS.filter((j) => j.status === "in_progress").length
const unassignedCount = JOBS.filter((j) => j.status === "unassigned").length

export default function JobsPage() {
  const [view, setView] = useState<ViewMode>("board")

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Jobs</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Scheduling and dispatch for today</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Date nav */}
          <div className="flex items-center gap-1 rounded-lg border border-zinc-200 bg-white overflow-hidden">
            <button className="flex h-9 w-8 items-center justify-center text-zinc-400 hover:bg-zinc-50 hover:text-zinc-700 transition-colors">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-3 text-sm font-semibold text-zinc-900 border-x border-zinc-200 h-9 flex items-center">
              Today
            </span>
            <button className="flex h-9 w-8 items-center justify-center text-zinc-400 hover:bg-zinc-50 hover:text-zinc-700 transition-colors">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <Button className="gap-2 bg-zinc-900 hover:bg-zinc-700 text-white">
            <Plus className="h-4 w-4" />
            New Job
          </Button>
        </div>
      </div>

      {/* ── KPI row ── */}
      <div className="grid grid-cols-4 gap-4">
        {[
          {
            label: "Total Today",
            value: String(totalToday),
            Icon: CheckCircle2,
            accent: "text-zinc-600",
            bg: "bg-zinc-100",
          },
          {
            label: "Completed",
            value: String(completedCount),
            Icon: CheckCircle2,
            accent: "text-emerald-600",
            bg: "bg-emerald-50",
          },
          {
            label: "In Progress",
            value: String(inProgressCount),
            Icon: AlertCircle,
            accent: "text-amber-600",
            bg: "bg-amber-50",
          },
          {
            label: "Unassigned",
            value: String(unassignedCount),
            Icon: Circle,
            accent: "text-rose-600",
            bg: "bg-rose-50",
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

      {/* ── View toggle ── */}
      <div className="flex items-center gap-2">
        <div className="flex items-center rounded-lg border border-zinc-200 overflow-hidden bg-white">
          <button
            onClick={() => setView("board")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors border-r border-zinc-200",
              view === "board"
                ? "bg-zinc-900 text-white"
                : "text-zinc-600 hover:bg-zinc-50",
            )}
          >
            <Columns3 className="h-3.5 w-3.5" />
            Board
          </button>
          <button
            onClick={() => setView("list")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors",
              view === "list"
                ? "bg-zinc-900 text-white"
                : "text-zinc-600 hover:bg-zinc-50",
            )}
          >
            <LayoutList className="h-3.5 w-3.5" />
            List
          </button>
        </div>
      </div>

      {/* ── Content ── */}
      {view === "board" ? (
        <BoardView jobs={JOBS} />
      ) : (
        <ListView jobs={JOBS} />
      )}
    </div>
  )
}
