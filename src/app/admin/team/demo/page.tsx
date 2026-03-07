"use client"

/**
 * /admin/team/demo — Premium Team Management Demo Dashboard
 *
 * PROTECTED: In production this route is covered by the admin layout which
 * uses withAuth({ ensureSignedIn: true }) from @workos-inc/authkit-nextjs.
 *
 * WorkOS Integration Points:
 *  • "Invite Member" button → WorkOS AuthKit invite flow (/api/auth/callback)
 *  • "Manage Access" sidebar panel → @workos-inc/widgets <UserManagement /> embed point
 *    See: https://workos.com/docs/user-management/widgets/react
 */

import { useState, useMemo } from "react"
import {
  LayoutGrid,
  List,
  Search,
  UserPlus,
  MoreHorizontal,
  Users,
  TrendingUp,
  Building2,
  Activity,
  Shield,
  ExternalLink,
  ChevronRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

// ─── Types ────────────────────────────────────────────────────────────────────

type Status = "active" | "inactive" | "suspended"
type EmployeeType = "employed" | "self_employed" | "contractor"
type Availability = "available" | "blocked" | "unavailable"
type ViewMode = "table" | "grid"
type StatusFilter = "all" | Status

interface Department {
  id: string
  name: string
  color: string
  count: number
}

interface Member {
  id: string
  name: string
  initials: string
  title: string
  department: string
  status: Status
  employeeType: EmployeeType
  skills: string[]
  capacity: { used: number; max: number }
  availability: Availability
  email: string
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const DEPARTMENTS: Department[] = [
  { id: "engineering", name: "Engineering", color: "#3b82f6", count: 8 },
  { id: "design", name: "Design", color: "#8b5cf6", count: 4 },
  { id: "sales", name: "Sales", color: "#f97316", count: 5 },
  { id: "operations", name: "Operations", color: "#10b981", count: 4 },
  { id: "customer-success", name: "Customer Success", color: "#f43f5e", count: 3 },
]

const MEMBERS: Member[] = [
  // Engineering
  { id: "1", name: "Alex Chen", initials: "AC", title: "Senior Engineer", department: "Engineering", status: "active", employeeType: "employed", skills: ["React", "TypeScript", "Node.js"], capacity: { used: 8, max: 10 }, availability: "available", email: "alex.chen@ironheart.io" },
  { id: "2", name: "Jordan Rivera", initials: "JR", title: "Staff Engineer", department: "Engineering", status: "active", employeeType: "employed", skills: ["Python", "AWS", "Kubernetes"], capacity: { used: 9, max: 10 }, availability: "available", email: "jordan.r@ironheart.io" },
  { id: "3", name: "Sam Patel", initials: "SP", title: "Frontend Engineer", department: "Engineering", status: "active", employeeType: "contractor", skills: ["React", "CSS", "Figma"], capacity: { used: 6, max: 10 }, availability: "available", email: "sam.p@ironheart.io" },
  { id: "4", name: "Morgan Kim", initials: "MK", title: "Backend Engineer", department: "Engineering", status: "active", employeeType: "employed", skills: ["Go", "PostgreSQL", "Redis"], capacity: { used: 7, max: 10 }, availability: "available", email: "morgan.k@ironheart.io" },
  { id: "5", name: "Taylor Okonkwo", initials: "TO", title: "DevOps Engineer", department: "Engineering", status: "active", employeeType: "employed", skills: ["AWS", "Docker", "CI/CD"], capacity: { used: 9, max: 10 }, availability: "blocked", email: "taylor.o@ironheart.io" },
  { id: "6", name: "Drew Nakamura", initials: "DN", title: "Junior Engineer", department: "Engineering", status: "inactive", employeeType: "employed", skills: ["React", "TypeScript"], capacity: { used: 0, max: 10 }, availability: "unavailable", email: "drew.n@ironheart.io" },
  { id: "7", name: "Casey Walsh", initials: "CW", title: "Data Engineer", department: "Engineering", status: "active", employeeType: "employed", skills: ["Python", "Spark", "SQL"], capacity: { used: 4, max: 10 }, availability: "blocked", email: "casey.w@ironheart.io" },
  { id: "8", name: "Riley Strauss", initials: "RS", title: "QA Engineer", department: "Engineering", status: "active", employeeType: "contractor", skills: ["Cypress", "Jest"], capacity: { used: 3, max: 10 }, availability: "available", email: "riley.s@ironheart.io" },
  // Design
  { id: "9", name: "Sofia Marchetti", initials: "SM", title: "Principal Designer", department: "Design", status: "active", employeeType: "employed", skills: ["Figma", "Brand", "UX"], capacity: { used: 7, max: 10 }, availability: "available", email: "sofia.m@ironheart.io" },
  { id: "10", name: "Blake Thompson", initials: "BT", title: "UI Designer", department: "Design", status: "active", employeeType: "employed", skills: ["Figma", "Illustrator"], capacity: { used: 8, max: 10 }, availability: "available", email: "blake.t@ironheart.io" },
  { id: "11", name: "Quinn Adeyemi", initials: "QA", title: "Motion Designer", department: "Design", status: "active", employeeType: "contractor", skills: ["After Effects", "Lottie"], capacity: { used: 5, max: 10 }, availability: "blocked", email: "quinn.a@ironheart.io" },
  { id: "12", name: "Avery Kowalski", initials: "AK", title: "Product Designer", department: "Design", status: "active", employeeType: "employed", skills: ["Figma", "Research"], capacity: { used: 9, max: 10 }, availability: "available", email: "avery.k@ironheart.io" },
  // Sales
  { id: "13", name: "Lucas Ferreira", initials: "LF", title: "Sales Lead", department: "Sales", status: "active", employeeType: "self_employed", skills: ["CRM", "Negotiation", "SaaS"], capacity: { used: 9, max: 10 }, availability: "available", email: "lucas.f@ironheart.io" },
  { id: "14", name: "Emma Vogt", initials: "EV", title: "Account Executive", department: "Sales", status: "active", employeeType: "employed", skills: ["Salesforce", "Outreach"], capacity: { used: 7, max: 10 }, availability: "available", email: "emma.v@ironheart.io" },
  { id: "15", name: "James Chukwu", initials: "JC", title: "Sales Dev Rep", department: "Sales", status: "active", employeeType: "employed", skills: ["LinkedIn", "Cold Calling"], capacity: { used: 6, max: 10 }, availability: "available", email: "james.c@ironheart.io" },
  { id: "16", name: "Mia Santos", initials: "MS", title: "Enterprise AE", department: "Sales", status: "suspended", employeeType: "employed", skills: ["Enterprise Sales"], capacity: { used: 0, max: 10 }, availability: "unavailable", email: "mia.s@ironheart.io" },
  { id: "17", name: "Ethan Barrows", initials: "EB", title: "Sales Ops Analyst", department: "Sales", status: "active", employeeType: "employed", skills: ["SQL", "Salesforce", "Analytics"], capacity: { used: 8, max: 10 }, availability: "blocked", email: "ethan.b@ironheart.io" },
  // Operations
  { id: "18", name: "Priya Mehta", initials: "PM", title: "Operations Manager", department: "Operations", status: "active", employeeType: "employed", skills: ["Process", "Lean", "PM"], capacity: { used: 8, max: 10 }, availability: "available", email: "priya.m@ironheart.io" },
  { id: "19", name: "Caleb Johansson", initials: "CJ", title: "Finance Analyst", department: "Operations", status: "active", employeeType: "employed", skills: ["Excel", "QuickBooks", "FP&A"], capacity: { used: 7, max: 10 }, availability: "available", email: "caleb.j@ironheart.io" },
  { id: "20", name: "Nora Fitzgerald", initials: "NF", title: "HR Specialist", department: "Operations", status: "inactive", employeeType: "employed", skills: ["HRIS", "Recruiting"], capacity: { used: 0, max: 10 }, availability: "unavailable", email: "nora.f@ironheart.io" },
  { id: "21", name: "Oscar Delgado", initials: "OD", title: "Legal Counsel", department: "Operations", status: "active", employeeType: "contractor", skills: ["Contract Law", "IP"], capacity: { used: 6, max: 10 }, availability: "blocked", email: "oscar.d@ironheart.io" },
  // Customer Success
  { id: "22", name: "Ava Sterling", initials: "AS", title: "CS Manager", department: "Customer Success", status: "active", employeeType: "employed", skills: ["Zendesk", "NPS", "Churn"], capacity: { used: 8, max: 10 }, availability: "available", email: "ava.s@ironheart.io" },
  { id: "23", name: "Leo Yamamoto", initials: "LY", title: "Customer Success Mgr", department: "Customer Success", status: "active", employeeType: "employed", skills: ["Intercom", "Onboarding"], capacity: { used: 8, max: 10 }, availability: "available", email: "leo.y@ironheart.io" },
  { id: "24", name: "Zoe Whitfield", initials: "ZW", title: "Support Engineer", department: "Customer Success", status: "active", employeeType: "employed", skills: ["Technical Writing", "APIs"], capacity: { used: 6, max: 10 }, availability: "available", email: "zoe.w@ironheart.io" },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDept(name: string): Department | undefined {
  return DEPARTMENTS.find((d) => d.name === name)
}

function capacityColor(used: number, max: number): string {
  const pct = max > 0 ? (used / max) * 100 : 0
  if (pct > 80) return "#ef4444"
  if (pct > 60) return "#f59e0b"
  return "#10b981"
}

function capacityTextClass(used: number, max: number): string {
  const pct = max > 0 ? (used / max) * 100 : 0
  if (pct > 80) return "text-red-600"
  if (pct > 60) return "text-amber-600"
  return "text-emerald-600"
}

// ─── Micro-components ─────────────────────────────────────────────────────────

function AvailabilityDot({ availability }: { availability: Availability }) {
  if (availability === "available") {
    return (
      <span className="relative inline-flex h-2.5 w-2.5 shrink-0">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
      </span>
    )
  }
  if (availability === "blocked") {
    return <span className="inline-flex h-2.5 w-2.5 shrink-0 rounded-full bg-amber-400" />
  }
  return <span className="inline-flex h-2.5 w-2.5 shrink-0 rounded-full bg-zinc-300" />
}

function StatusBadge({ status }: { status: Status }) {
  const styles: Record<Status, string> = {
    active: "bg-emerald-50 text-emerald-700 border-emerald-200",
    inactive: "bg-zinc-100 text-zinc-500 border-zinc-200",
    suspended: "bg-amber-50 text-amber-700 border-amber-200",
  }
  const labels: Record<Status, string> = {
    active: "Active",
    inactive: "Inactive",
    suspended: "Suspended",
  }
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium", styles[status])}>
      {labels[status]}
    </span>
  )
}

function EmployeeTypeBadge({ type }: { type: EmployeeType }) {
  const labels: Record<EmployeeType, string> = {
    employed: "FTE",
    self_employed: "Self",
    contractor: "Contract",
  }
  return (
    <span className="inline-flex items-center rounded border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 font-mono text-[10px] font-medium text-zinc-500">
      {labels[type]}
    </span>
  )
}

function CapacityBar({ used, max }: { used: number; max: number }) {
  const pct = max > 0 ? (used / max) * 100 : 0
  const color = capacityColor(used, max)
  const textClass = capacityTextClass(used, max)
  return (
    <div className="space-y-1 w-20">
      <div className="flex items-center justify-between">
        <span className={cn("font-mono text-[11px] font-semibold tabular-nums", textClass)}>
          {used}
          <span className="text-zinc-400 font-normal">/{max}</span>
        </span>
      </div>
      <div className="h-1 w-full rounded-full bg-zinc-100 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  )
}

function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  trend,
}: {
  label: string
  value: string
  sub?: string
  icon: React.ComponentType<{ className?: string }>
  trend?: { label: string; positive: boolean }
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400">{label}</span>
        <div className="h-7 w-7 rounded-lg bg-zinc-100 flex items-center justify-center">
          <Icon className="h-3.5 w-3.5 text-zinc-400" />
        </div>
      </div>
      <div className="flex items-end gap-2">
        <span className="text-3xl font-bold font-mono tabular-nums leading-none text-zinc-900">{value}</span>
        {trend && (
          <span className={cn("text-xs font-medium mb-0.5", trend.positive ? "text-emerald-600" : "text-red-500")}>
            {trend.positive ? "↑" : "↓"} {trend.label}
          </span>
        )}
      </div>
      {sub && <p className="text-xs text-zinc-400">{sub}</p>}
    </div>
  )
}

function WorkOSAccessPanel() {
  return (
    <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Shield className="h-3.5 w-3.5 text-blue-500 shrink-0" />
        <span className="text-xs font-semibold text-blue-700">WorkOS Access</span>
      </div>
      <p className="text-[11px] leading-relaxed text-blue-600">
        Invite flows, SSO &amp; SCIM provisioning via WorkOS AuthKit. Embed the{" "}
        <code className="font-mono bg-blue-100 px-1 rounded text-[10px]">&lt;UserManagement /&gt;</code>{" "}
        widget here for full access control.
      </p>
      <div className="space-y-2">
        <button
          type="button"
          className="flex w-full items-center gap-1.5 text-[11px] font-medium text-blue-600 hover:text-blue-800 transition-colors"
          onClick={() => alert("WorkOS <UserManagement /> widget integration point")}
        >
          <ExternalLink className="h-3 w-3 shrink-0" />
          User Management Widget
        </button>
        <button
          type="button"
          className="flex w-full items-center gap-1.5 text-[11px] font-medium text-blue-600 hover:text-blue-800 transition-colors"
        >
          <ChevronRight className="h-3 w-3 shrink-0" />
          View Audit Logs
        </button>
      </div>
    </div>
  )
}

function MemberGridCard({ member }: { member: Member }) {
  const dept = getDept(member.department)
  const availLabel: Record<Availability, string> = {
    available: "Available",
    blocked: "Blocked",
    unavailable: "Unavailable",
  }
  return (
    <div
      className="relative rounded-xl border border-zinc-200 bg-white p-4 space-y-3 hover:-translate-y-px hover:shadow-md transition-all duration-200 cursor-pointer overflow-hidden"
      style={{ borderLeft: `3px solid ${dept?.color ?? "#e4e4e7"}` }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar
            className="h-9 w-9 shrink-0 text-xs ring-2 ring-white"
            style={{ backgroundColor: dept?.color ? `${dept.color}20` : undefined }}
          >
            <AvatarFallback
              className="text-xs font-semibold"
              style={{ color: dept?.color, backgroundColor: `${dept?.color}15` }}
            >
              {member.initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-zinc-900 truncate leading-tight">{member.name}</p>
            <p className="text-xs text-zinc-500 truncate leading-tight">{member.title}</p>
          </div>
        </div>
        <StatusBadge status={member.status} />
      </div>

      {/* Dept + type */}
      <div className="flex items-center gap-2">
        <span
          className="inline-flex h-2 w-2 rounded-full shrink-0"
          style={{ backgroundColor: dept?.color }}
        />
        <span className="text-xs text-zinc-600 truncate">{member.department}</span>
        <EmployeeTypeBadge type={member.employeeType} />
      </div>

      {/* Skills */}
      <div className="flex flex-wrap gap-1">
        {member.skills.slice(0, 3).map((s) => (
          <span
            key={s}
            className="inline-flex items-center rounded-md border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 text-[10px] font-medium text-zinc-600"
          >
            {s}
          </span>
        ))}
        {member.skills.length > 3 && (
          <span className="inline-flex items-center rounded-md border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 text-[10px] font-medium text-zinc-400">
            +{member.skills.length - 3}
          </span>
        )}
      </div>

      <Separator className="bg-zinc-100" />

      {/* Availability + capacity */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <AvailabilityDot availability={member.availability} />
          <span className="text-[11px] text-zinc-500">{availLabel[member.availability]}</span>
        </div>
        <CapacityBar used={member.capacity.used} max={member.capacity.max} />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-0.5">
        <button
          type="button"
          className="text-[11px] font-medium text-zinc-500 hover:text-zinc-900 transition-colors"
        >
          View Profile
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6">
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem>Edit</DropdownMenuItem>
            <DropdownMenuItem>Send Message</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-amber-600">Suspend</DropdownMenuItem>
            <DropdownMenuItem className="text-red-600">Remove</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TeamDemoPage() {
  const [view, setView] = useState<ViewMode>("table")
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [deptFilter, setDeptFilter] = useState<string | null>(null)

  const filtered = useMemo(() => {
    return MEMBERS.filter((m) => {
      if (statusFilter !== "all" && m.status !== statusFilter) return false
      if (deptFilter && m.department !== deptFilter) return false
      if (search) {
        const q = search.toLowerCase()
        return (
          m.name.toLowerCase().includes(q) ||
          m.title.toLowerCase().includes(q) ||
          m.email.toLowerCase().includes(q) ||
          m.skills.some((s) => s.toLowerCase().includes(q))
        )
      }
      return true
    })
  }, [search, statusFilter, deptFilter])

  const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
    { value: "all", label: "All" },
    { value: "active", label: "Active" },
    { value: "inactive", label: "Inactive" },
    { value: "suspended", label: "Suspended" },
  ]

  const availLabel: Record<Availability, string> = {
    available: "Available",
    blocked: "Blocked",
    unavailable: "Unavailable",
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* ── Breadcrumb ─────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-1.5 text-xs text-zinc-400">
          <span>Admin</span>
          <ChevronRight className="h-3 w-3" />
          <span className="text-zinc-600 font-medium">People</span>
          <span className="ml-2 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-600 uppercase tracking-wide">
            Demo
          </span>
        </div>

        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900">People</h1>
            <p className="mt-0.5 text-sm text-zinc-500">
              Manage staff capacity, availability, and department structure.
            </p>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                className="gap-2 bg-zinc-900 text-white hover:bg-zinc-700"
                onClick={() => alert("WorkOS AuthKit invite flow: /api/auth/callback?action=invite")}
              >
                <UserPlus className="h-4 w-4" />
                Invite Member
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              Triggers WorkOS AuthKit invite flow
            </TooltipContent>
          </Tooltip>
        </div>

        {/* ── KPI Row ────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <KpiCard
            label="Total Members"
            value="24"
            sub="Across 5 departments"
            icon={Users}
          />
          <KpiCard
            label="Active Rate"
            value="87%"
            sub="21 active this week"
            icon={TrendingUp}
            trend={{ label: "2% vs last mo.", positive: true }}
          />
          <KpiCard
            label="Departments"
            value="5"
            sub="Engineering, Design + 3"
            icon={Building2}
          />
          <KpiCard
            label="Avg Capacity"
            value="6.2"
            sub="Out of 10 max daily"
            icon={Activity}
            trend={{ label: "0.4 vs last mo.", positive: false }}
          />
        </div>

        {/* ── Body: Sidebar + Main ───────────────────────────────────────────── */}
        <div className="flex items-start gap-5">
          {/* ── Sidebar ─────────────────────────────────────────────────────── */}
          <aside className="w-52 shrink-0 sticky top-4 space-y-4">
            {/* Department filter */}
            <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
              <div className="px-4 py-3 border-b border-zinc-100">
                <span className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400">
                  Departments
                </span>
              </div>
              <div className="p-1.5 space-y-0.5">
                {/* All */}
                <button
                  type="button"
                  onClick={() => setDeptFilter(null)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition-colors",
                    deptFilter === null
                      ? "bg-zinc-900 text-white font-semibold"
                      : "text-zinc-600 hover:bg-zinc-50 font-medium"
                  )}
                >
                  <span>All members</span>
                  <span
                    className={cn(
                      "font-mono text-[11px]",
                      deptFilter === null ? "text-white/70" : "text-zinc-400"
                    )}
                  >
                    {MEMBERS.length}
                  </span>
                </button>

                <Separator className="bg-zinc-100 my-1" />

                {DEPARTMENTS.map((dept) => (
                  <button
                    key={dept.id}
                    type="button"
                    onClick={() => setDeptFilter(dept.name === deptFilter ? null : dept.name)}
                    className={cn(
                      "flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition-colors",
                      deptFilter === dept.name
                        ? "bg-zinc-100 font-semibold text-zinc-900"
                        : "text-zinc-600 hover:bg-zinc-50 font-medium"
                    )}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: dept.color }}
                      />
                      <span className="truncate">{dept.name}</span>
                    </span>
                    <span className="font-mono text-[11px] text-zinc-400 shrink-0">{dept.count}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* WorkOS panel */}
            <WorkOSAccessPanel />
          </aside>

          {/* ── Main Content ────────────────────────────────────────────────── */}
          <div className="flex-1 min-w-0 space-y-3">
            {/* Search + view toggle */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
                <Input
                  placeholder="Search by name, title, skill…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-9 text-sm border-zinc-200 bg-white placeholder:text-zinc-400"
                />
              </div>
              {/* View toggle */}
              <div className="flex items-center rounded-lg border border-zinc-200 bg-white p-0.5 gap-0.5">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => setView("table")}
                      className={cn(
                        "h-7 w-7 flex items-center justify-center rounded-md transition-colors",
                        view === "table"
                          ? "bg-zinc-900 text-white"
                          : "text-zinc-400 hover:text-zinc-700"
                      )}
                    >
                      <List className="h-3.5 w-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">Table view</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => setView("grid")}
                      className={cn(
                        "h-7 w-7 flex items-center justify-center rounded-md transition-colors",
                        view === "grid"
                          ? "bg-zinc-900 text-white"
                          : "text-zinc-400 hover:text-zinc-700"
                      )}
                    >
                      <LayoutGrid className="h-3.5 w-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">Grid view</TooltipContent>
                </Tooltip>
              </div>
            </div>

            {/* Status filter chips */}
            <div className="flex items-center gap-1.5">
              {STATUS_FILTERS.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => setStatusFilter(f.value)}
                  className={cn(
                    "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                    statusFilter === f.value
                      ? "border-zinc-900 bg-zinc-900 text-white"
                      : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
                  )}
                >
                  {f.label}
                </button>
              ))}
              {(search || statusFilter !== "all" || deptFilter) && (
                <>
                  <Separator orientation="vertical" className="h-4 mx-1" />
                  <button
                    type="button"
                    className="text-xs text-zinc-400 hover:text-zinc-700 transition-colors"
                    onClick={() => { setSearch(""); setStatusFilter("all"); setDeptFilter(null) }}
                  >
                    Clear filters
                  </button>
                </>
              )}
              <span className="ml-auto font-mono text-xs text-zinc-400 tabular-nums">
                {filtered.length} member{filtered.length !== 1 ? "s" : ""}
              </span>
            </div>

            {/* ── TABLE VIEW ──────────────────────────────────────────────── */}
            {view === "table" && (
              <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-zinc-200">
                      <TableHead className="pl-5 text-[11px] font-semibold uppercase tracking-widest text-zinc-400 w-[220px]">
                        Member
                      </TableHead>
                      <TableHead className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400 w-[140px]">
                        Department
                      </TableHead>
                      <TableHead className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400 w-[80px]">
                        Status
                      </TableHead>
                      <TableHead className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400 w-[100px]">
                        Availability
                      </TableHead>
                      <TableHead className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400 w-[110px]">
                        Capacity
                      </TableHead>
                      <TableHead className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400">
                        Skills
                      </TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-24 text-center text-sm text-zinc-400">
                          No members match your filters.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filtered.map((member) => {
                        const dept = getDept(member.department)
                        return (
                          <TableRow
                            key={member.id}
                            className="group hover:bg-zinc-50/80 cursor-pointer border-zinc-100 transition-colors"
                            style={{ borderLeft: `3px solid ${dept?.color ?? "transparent"}` }}
                          >
                            {/* Member */}
                            <TableCell className="py-3 pl-4">
                              <div className="flex items-center gap-3">
                                <Avatar
                                  className="h-8 w-8 shrink-0 text-xs"
                                  style={{ backgroundColor: dept?.color ? `${dept.color}15` : undefined }}
                                >
                                  <AvatarFallback
                                    className="text-[11px] font-semibold"
                                    style={{ color: dept?.color, backgroundColor: `${dept?.color}15` }}
                                  >
                                    {member.initials}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-zinc-900 truncate leading-tight">
                                    {member.name}
                                  </p>
                                  <p className="text-xs text-zinc-400 truncate leading-tight flex items-center gap-1.5">
                                    {member.title}
                                    <EmployeeTypeBadge type={member.employeeType} />
                                  </p>
                                </div>
                              </div>
                            </TableCell>

                            {/* Department */}
                            <TableCell className="py-3">
                              <div className="flex items-center gap-1.5">
                                <span
                                  className="h-2 w-2 rounded-full shrink-0"
                                  style={{ backgroundColor: dept?.color }}
                                />
                                <span className="text-xs text-zinc-600 truncate">{member.department}</span>
                              </div>
                            </TableCell>

                            {/* Status */}
                            <TableCell className="py-3">
                              <StatusBadge status={member.status} />
                            </TableCell>

                            {/* Availability */}
                            <TableCell className="py-3">
                              <div className="flex items-center gap-1.5">
                                <AvailabilityDot availability={member.availability} />
                                <span className="text-xs text-zinc-500">{availLabel[member.availability]}</span>
                              </div>
                            </TableCell>

                            {/* Capacity */}
                            <TableCell className="py-3">
                              <CapacityBar used={member.capacity.used} max={member.capacity.max} />
                            </TableCell>

                            {/* Skills */}
                            <TableCell className="py-3">
                              <div className="flex items-center gap-1 flex-wrap">
                                {member.skills.slice(0, 2).map((s) => (
                                  <span
                                    key={s}
                                    className="inline-flex items-center rounded border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 text-[10px] font-medium text-zinc-600"
                                  >
                                    {s}
                                  </span>
                                ))}
                                {member.skills.length > 2 && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="inline-flex items-center rounded border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 text-[10px] font-medium text-zinc-400 cursor-default">
                                        +{member.skills.length - 2}
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent className="text-xs">
                                      {member.skills.slice(2).join(", ")}
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                              </div>
                            </TableCell>

                            {/* Actions */}
                            <TableCell className="py-3 pr-3">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-40">
                                  <DropdownMenuItem>View Profile</DropdownMenuItem>
                                  <DropdownMenuItem>Edit Details</DropdownMenuItem>
                                  <DropdownMenuItem>Send Message</DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem className="text-amber-600">
                                    Change Status
                                  </DropdownMenuItem>
                                  <DropdownMenuItem className="text-red-600">
                                    Remove Member
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* ── GRID VIEW ───────────────────────────────────────────────── */}
            {view === "grid" && (
              <>
                {filtered.length === 0 ? (
                  <div className="flex h-24 items-center justify-center rounded-xl border border-zinc-200 bg-white">
                    <p className="text-sm text-zinc-400">No members match your filters.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {filtered.map((member) => (
                      <MemberGridCard key={member.id} member={member} />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}
