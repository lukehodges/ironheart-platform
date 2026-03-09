"use client"

/**
 * /admin/team/demo/member - Individual Team Member Profile Demo
 *
 * Static demo using mock data. In production this route is /admin/team/[id]
 * and fetches via api.team.getById. Protected by WorkOS AuthKit at layout level.
 */

import { useState } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  CalendarDays,
  Building2,
  User,
  DollarSign,
  Pencil,
  MoreHorizontal,
  ChevronRight,
  Activity,
  Zap,
  Layers,
  TrendingUp,
  Clock,
  Check,
  Minus,
} from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = "overview" | "schedule" | "skills" | "capacity" | "activity"

// ─── Mock Data ────────────────────────────────────────────────────────────────

const DEPT_COLOR = "#3b82f6"

const MEMBER = {
  name: "Alex Chen",
  initials: "AC",
  title: "Senior Engineer",
  department: "Engineering",
  email: "alex.chen@ironheart.io",
  phone: "+44 7700 900123",
  location: "London, UK",
  joined: "15 Mar 2022",
  status: "active" as const,
  availability: "available" as const,
  employeeType: "employed" as const,
  capacity: { used: 8, max: 10 },
  hourlyRate: 85,
  bio: "Full-stack engineer specialising in React and Node.js. Previously at Monzo. Advocate for TypeScript-first codebases and test-driven development. Remote-first with occasional London office visits.",
  reportsTo: "Jordan Rivera",
  reportsToTitle: "Staff Engineer",
  emergencyContact: {
    name: "Michelle Chen",
    phone: "+44 7700 900456",
    relation: "Spouse",
  },
}

const ASSIGNMENTS = [
  {
    id: "1",
    project: "Ironheart Platform Rebuild",
    client: "Internal",
    capacityPct: 40,
    from: "15 Jan 2026",
    to: "30 Apr 2026",
    status: "active" as const,
    color: "#3b82f6",
  },
  {
    id: "2",
    project: "API Gateway Migration",
    client: "Internal",
    capacityPct: 30,
    from: "1 Mar 2026",
    to: "31 Mar 2026",
    status: "active" as const,
    color: "#8b5cf6",
  },
  {
    id: "3",
    project: "TechCorp Security Audit",
    client: "TechCorp Ltd",
    capacityPct: 10,
    from: "1 Mar 2026",
    to: "15 Mar 2026",
    status: "completing" as const,
    color: "#f97316",
  },
]

const SKILLS = [
  { name: "React", level: 5, label: "Expert", category: "Frontend" },
  { name: "TypeScript", level: 5, label: "Expert", category: "Language" },
  { name: "Node.js", level: 4, label: "Advanced", category: "Backend" },
  { name: "PostgreSQL", level: 3, label: "Proficient", category: "Database" },
  { name: "AWS", level: 3, label: "Proficient", category: "Infrastructure" },
  { name: "Docker", level: 2, label: "Familiar", category: "Infrastructure" },
]

// Each day: blocks are portions of the 09:00–18:00 window (9h total)
const SCHEDULE = [
  {
    day: "Mon", date: "3",
    blocks: [{ type: "available" as const, hours: 9 }],
    label: "09:00–18:00",
  },
  {
    day: "Tue", date: "4",
    blocks: [{ type: "available" as const, hours: 9 }],
    label: "09:00–18:00",
  },
  {
    day: "Wed", date: "5",
    blocks: [
      { type: "available" as const, hours: 4 },
      { type: "blocked" as const, hours: 5 },
    ],
    label: "09:00–13:00",
    note: "Blocked 13:00–18:00",
  },
  {
    day: "Thu", date: "6",
    blocks: [{ type: "available" as const, hours: 9 }],
    label: "09:00–18:00",
  },
  {
    day: "Fri", date: "7",
    blocks: [
      { type: "available" as const, hours: 8 },
      { type: "off" as const, hours: 1 },
    ],
    label: "09:00–17:00",
  },
  {
    day: "Sat", date: "8",
    blocks: [{ type: "off" as const, hours: 9 }],
    label: "Off",
  },
  {
    day: "Sun", date: "9",
    blocks: [{ type: "off" as const, hours: 9 }],
    label: "Off",
  },
]

const CAPACITY_WEEK = [
  { label: "M", date: "25 Feb", used: 7, max: 10 },
  { label: "T", date: "26 Feb", used: 8, max: 10 },
  { label: "W", date: "27 Feb", used: 9, max: 10 },
  { label: "T", date: "28 Feb", used: 8, max: 10 },
  { label: "F", date: "1 Mar", used: 6, max: 10 },
  { label: "M", date: "3 Mar", used: 8, max: 10, today: true },
]

const ACTIVITY = [
  {
    id: "1",
    icon: Activity,
    action: "Capacity limit updated to 8/10",
    time: "Today, 09:42",
    author: "Alex Chen",
    type: "capacity" as const,
  },
  {
    id: "2",
    icon: Layers,
    action: "Assigned to TechCorp Security Audit",
    time: "3 days ago",
    author: "Jordan Rivera",
    type: "assignment" as const,
  },
  {
    id: "3",
    icon: Zap,
    action: "Skill 'PostgreSQL' added at Proficient level",
    time: "1 week ago",
    author: "Alex Chen",
    type: "skill" as const,
  },
  {
    id: "4",
    icon: CalendarDays,
    action: "Recurring block added: Wed 13:00–18:00",
    time: "2 weeks ago",
    author: "Jordan Rivera",
    type: "schedule" as const,
  },
  {
    id: "5",
    icon: DollarSign,
    action: "Pay rate updated to £85/hr",
    time: "15 Jan 2026",
    author: "Admin",
    type: "finance" as const,
  },
  {
    id: "6",
    icon: User,
    action: "Profile created and onboarding initiated",
    time: "15 Mar 2022",
    author: "System",
    type: "system" as const,
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function capacityBarColor(used: number, max: number) {
  const pct = max > 0 ? (used / max) * 100 : 0
  if (pct > 80) return { bar: "#ef4444", text: "text-red-600" }
  if (pct > 60) return { bar: "#f59e0b", text: "text-amber-600" }
  return { bar: "#10b981", text: "text-emerald-600" }
}

// ─── Micro-components ─────────────────────────────────────────────────────────

function AvailabilityPulse() {
  return (
    <span className="relative inline-flex h-2.5 w-2.5 shrink-0">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
    </span>
  )
}

function SkillDots({ level }: { level: number }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <span
          key={i}
          className="h-2 w-2 rounded-full transition-colors"
          style={{
            backgroundColor: i < level ? DEPT_COLOR : undefined,
            border: i < level ? "none" : "1.5px solid #d4d4d8",
          }}
        />
      ))}
    </div>
  )
}

// ─── Sidebar Cards ────────────────────────────────────────────────────────────

function SidebarCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
      <div className="px-4 py-3 border-b border-zinc-100">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400">{title}</span>
      </div>
      <div className="p-4">{children}</div>
    </div>
  )
}

function ContactCard() {
  return (
    <SidebarCard title="Contact">
      <div className="space-y-2.5">
        {[
          { icon: Mail, label: MEMBER.email },
          { icon: Phone, label: MEMBER.phone },
          { icon: MapPin, label: MEMBER.location },
          { icon: CalendarDays, label: `Joined ${MEMBER.joined}` },
        ].map(({ icon: Icon, label }) => (
          <div key={label} className="flex items-center gap-2.5">
            <div className="h-6 w-6 rounded-md bg-zinc-100 flex items-center justify-center shrink-0">
              <Icon className="h-3 w-3 text-zinc-400" />
            </div>
            <span className="text-xs text-zinc-600 truncate">{label}</span>
          </div>
        ))}
      </div>
    </SidebarCard>
  )
}

function DeptCard() {
  return (
    <SidebarCard title="Department">
      <div className="flex items-center gap-2.5">
        <div
          className="h-6 w-6 rounded-md flex items-center justify-center shrink-0"
          style={{ backgroundColor: `${DEPT_COLOR}20` }}
        >
          <Building2 className="h-3 w-3" style={{ color: DEPT_COLOR }} />
        </div>
        <div>
          <p className="text-xs font-semibold text-zinc-900">{MEMBER.department}</p>
          <p className="text-[11px] text-zinc-400">Primary</p>
        </div>
      </div>
    </SidebarCard>
  )
}

function ReportsToCard() {
  return (
    <SidebarCard title="Reports To">
      <div className="flex items-center gap-2.5">
        <Avatar
          className="h-7 w-7 text-[10px]"
          style={{ backgroundColor: `${DEPT_COLOR}15` }}
        >
          <AvatarFallback className="text-[10px] font-semibold" style={{ color: DEPT_COLOR, backgroundColor: `${DEPT_COLOR}15` }}>
            JR
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="text-xs font-semibold text-zinc-900">{MEMBER.reportsTo}</p>
          <p className="text-[11px] text-zinc-400">{MEMBER.reportsToTitle}</p>
        </div>
      </div>
    </SidebarCard>
  )
}

function PayRateCard() {
  return (
    <SidebarCard title="Pay Rate">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xl font-bold text-zinc-900">
            £{MEMBER.hourlyRate}
          </span>
          <span className="text-xs text-zinc-400">/hr</span>
        </div>
        <button type="button" className="text-[11px] font-medium text-zinc-400 hover:text-zinc-700 transition-colors flex items-center gap-1">
          History <ChevronRight className="h-3 w-3" />
        </button>
      </div>
    </SidebarCard>
  )
}

// ─── Tab Components ───────────────────────────────────────────────────────────

function OverviewTab() {
  return (
    <div className="space-y-6">
      {/* Bio */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5 space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400">Bio</p>
        <p className="text-sm text-zinc-600 leading-relaxed">{MEMBER.bio}</p>
      </div>

      {/* Current assignments */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-zinc-900">Active Assignments</h3>
          <span className="font-mono text-xs text-zinc-400">{ASSIGNMENTS.length} projects</span>
        </div>
        <div className="space-y-2">
          {ASSIGNMENTS.map((a) => (
            <div
              key={a.id}
              className="rounded-xl border border-zinc-200 bg-white p-4 hover:bg-zinc-50/80 cursor-pointer transition-colors"
              style={{ borderLeft: `3px solid ${a.color}` }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-zinc-900 truncate">{a.project}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">{a.client}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium",
                      a.status === "active"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-amber-50 text-amber-700 border-amber-200"
                    )}
                  >
                    {a.status === "active" ? "Active" : "Completing"}
                  </span>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <div className="h-1.5 w-24 rounded-full bg-zinc-100 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${a.capacityPct}%`, backgroundColor: a.color }}
                    />
                  </div>
                  <span className="font-mono text-[11px] font-semibold text-zinc-600">
                    {a.capacityPct}%
                  </span>
                  <span className="text-[11px] text-zinc-400">capacity</span>
                </div>
                <span className="text-[11px] text-zinc-400">{a.from} – {a.to}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Emergency contact */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5 space-y-3">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400">Emergency Contact</p>
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Name", value: MEMBER.emergencyContact.name },
            { label: "Phone", value: MEMBER.emergencyContact.phone },
            { label: "Relationship", value: MEMBER.emergencyContact.relation },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-[11px] text-zinc-400 mb-0.5">{label}</p>
              <p className="text-xs font-medium text-zinc-700">{value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function ScheduleTab() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-zinc-900">Week of 3 Mar 2026</h3>
          <p className="text-xs text-zinc-400 mt-0.5">09:00–18:00 working window · 9h/day</p>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-zinc-400">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: `${DEPT_COLOR}40` }} />
            Available
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-amber-200" />
            Blocked
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-zinc-100" />
            Off
          </span>
        </div>
      </div>

      {/* Week grid */}
      <div className="grid grid-cols-7 gap-2">
        {SCHEDULE.map((day) => {
          const isToday = day.date === "3"
          const totalAvailableHours = day.blocks
            .filter((b) => b.type === "available")
            .reduce((sum, b) => sum + b.hours, 0)

          return (
            <div key={day.day} className="flex flex-col items-center gap-2">
              {/* Day header */}
              <div className="text-center">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400">{day.day}</p>
                <div
                  className={cn(
                    "text-sm font-bold mt-0.5 mx-auto flex items-center justify-center",
                    isToday ? "text-white rounded-full" : "text-zinc-700"
                  )}
                  style={
                    isToday
                      ? { backgroundColor: DEPT_COLOR, width: 24, height: 24 }
                      : { width: 24, height: 24 }
                  }
                >
                  {day.date}
                </div>
              </div>

              {/* Block column */}
              <div className="w-full rounded-lg overflow-hidden" style={{ height: 120 }}>
                <div className="flex flex-col h-full">
                  {day.blocks.map((block, i) => (
                    <div
                      key={i}
                      className={cn(
                        "transition-colors border",
                        block.type === "blocked"
                          ? "bg-amber-100 border-amber-200"
                          : block.type === "off"
                            ? "bg-zinc-100 border-zinc-200"
                            : ""
                      )}
                      style={{
                        flexGrow: block.hours,
                        flexShrink: 1,
                        flexBasis: 0,
                        backgroundColor: block.type === "available" ? `${DEPT_COLOR}18` : undefined,
                        borderColor: block.type === "available" ? `${DEPT_COLOR}30` : undefined,
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Hours label */}
              <div className="text-center">
                {totalAvailableHours > 0 ? (
                  <>
                    <p className="font-mono text-xs font-bold text-zinc-700">{totalAvailableHours}h</p>
                    <p className="text-[10px] text-zinc-400 leading-tight">{day.label}</p>
                  </>
                ) : (
                  <>
                    <Minus className="h-3 w-3 text-zinc-300 mx-auto" />
                    <p className="text-[10px] text-zinc-400 mt-0.5">Off</p>
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Note */}
      {SCHEDULE.find((d) => d.note) && (
        <div className="rounded-lg border border-amber-100 bg-amber-50/60 px-4 py-3">
          <p className="text-xs text-amber-700">
            <span className="font-semibold">Wed:</span>{" "}
            {SCHEDULE.find((d) => d.note)?.note} - recurring block
          </p>
        </div>
      )}
    </div>
  )
}

function SkillsTab() {
  const levelColor: Record<string, string> = {
    Expert: "text-blue-700 bg-blue-50 border-blue-200",
    Advanced: "text-violet-700 bg-violet-50 border-violet-200",
    Proficient: "text-emerald-700 bg-emerald-50 border-emerald-200",
    Familiar: "text-amber-700 bg-amber-50 border-amber-200",
    Learning: "text-zinc-600 bg-zinc-100 border-zinc-200",
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400">
          {SKILLS.length} skills verified
        </p>
        <Button variant="outline" size="sm" className="text-xs h-7 gap-1.5">
          <Pencil className="h-3 w-3" />
          Edit Skills
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {SKILLS.map((skill) => (
          <div
            key={skill.name}
            className="rounded-xl border border-zinc-200 bg-white p-4 flex items-center justify-between hover:bg-zinc-50/80 transition-colors"
          >
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-zinc-900">{skill.name}</span>
                <span
                  className={cn(
                    "inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-medium",
                    levelColor[skill.label] ?? levelColor.Familiar
                  )}
                >
                  {skill.label}
                </span>
              </div>
              <SkillDots level={skill.level} />
            </div>
            <span className="text-[10px] text-zinc-400 font-mono">{skill.category}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function CapacityTab() {
  const avg =
    Math.round((CAPACITY_WEEK.reduce((s, d) => s + d.used, 0) / CAPACITY_WEEK.length) * 10) / 10
  const peak = Math.max(...CAPACITY_WEEK.map((d) => d.used))
  const today = CAPACITY_WEEK.find((d) => d.today)
  const { bar: todayBarColor, text: todayTextClass } = capacityBarColor(
    today?.used ?? 0,
    today?.max ?? 10
  )

  return (
    <div className="space-y-5">
      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Today", value: `${today?.used ?? "-"}/10`, color: todayTextClass },
          { label: "Week Avg", value: `${avg}/10`, color: "text-zinc-900" },
          { label: "Peak", value: `${peak}/10`, color: "text-red-600" },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl border border-zinc-200 bg-white p-4 space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400">{label}</p>
            <p className={cn("font-mono text-2xl font-bold tabular-nums", color)}>{value}</p>
          </div>
        ))}
      </div>

      {/* Sparkline */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5 space-y-4">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400">
          Last 6 working days
        </p>
        <div className="flex items-end gap-3 h-24">
          {CAPACITY_WEEK.map((day) => {
            const heightPct = (day.used / day.max) * 100
            const { bar } = capacityBarColor(day.used, day.max)
            return (
              <Tooltip key={day.date}>
                <TooltipTrigger asChild>
                  <div className="flex flex-col items-center gap-1.5 flex-1 cursor-default">
                    <div className="w-full flex items-end justify-center" style={{ height: 80 }}>
                      <div
                        className={cn(
                          "w-full rounded-t-md transition-all",
                          day.today ? "ring-2 ring-offset-1" : ""
                        )}
                        style={{
                          height: `${heightPct}%`,
                          backgroundColor: day.today ? bar : `${bar}70`,
                          outline: day.today ? `2px solid ${bar}` : undefined,
                          outlineOffset: day.today ? "2px" : undefined,
                        }}
                      />
                    </div>
                    <span
                      className={cn(
                        "font-mono text-[10px] font-bold",
                        day.today ? "text-zinc-900" : "text-zinc-400"
                      )}
                    >
                      {day.label}
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent className="text-xs">
                  {day.date}: {day.used}/{day.max} capacity
                  {day.today ? " (today)" : ""}
                </TooltipContent>
              </Tooltip>
            )
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-1 border-t border-zinc-100">
          <span>Max daily capacity: {CAPACITY_WEEK[0]?.max ?? 10}</span>
          <span>
            <TrendingUp className="h-3 w-3 inline mr-1 text-emerald-500" />
            Utilisation: {Math.round(avg * 10)}%
          </span>
        </div>
      </div>
    </div>
  )
}

function ActivityTab() {
  const typeAccent: Record<string, string> = {
    capacity: "#10b981",
    assignment: "#3b82f6",
    skill: "#8b5cf6",
    schedule: "#f97316",
    finance: "#f43f5e",
    system: "#71717a",
  }

  return (
    <div className="space-y-1">
      {ACTIVITY.map((item, i) => {
        const Icon = item.icon
        const color = typeAccent[item.type] ?? "#71717a"
        const isLast = i === ACTIVITY.length - 1
        return (
          <div key={item.id} className="flex gap-4">
            {/* Icon + connecting line */}
            <div className="flex flex-col items-center">
              <div
                className="h-8 w-8 rounded-full flex items-center justify-center shrink-0 z-10"
                style={{ backgroundColor: `${color}15` }}
              >
                <Icon className="h-3.5 w-3.5" style={{ color }} />
              </div>
              {!isLast && (
                <div className="w-px flex-1 bg-zinc-100 my-1" />
              )}
            </div>

            {/* Content */}
            <div className={cn("flex-1 pb-5", isLast ? "pb-0" : "")}>
              <div className="rounded-xl border border-zinc-200 bg-white p-3.5 space-y-1">
                <p className="text-sm font-medium text-zinc-800">{item.action}</p>
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1 text-[11px] text-zinc-400">
                    <Clock className="h-3 w-3" />
                    {item.time}
                  </span>
                  <span className="text-[11px] text-zinc-400">by {item.author}</span>
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "schedule", label: "Schedule" },
  { id: "skills", label: "Skills" },
  { id: "capacity", label: "Capacity" },
  { id: "activity", label: "Activity" },
]

export default function TeamMemberDemoPage() {
  const [activeTab, setActiveTab] = useState<Tab>("overview")
  const { bar: capBarColor, text: capTextClass } = capacityBarColor(
    MEMBER.capacity.used,
    MEMBER.capacity.max
  )

  return (
    <TooltipProvider>
      <div className="space-y-5">
        {/* ── Nav ──────────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="gap-1.5 text-zinc-500 hover:text-zinc-900 -ml-2" asChild>
            <Link href="/admin/team/demo">
              <ArrowLeft className="h-4 w-4" />
              People
            </Link>
          </Button>
          <ChevronRight className="h-3.5 w-3.5 text-zinc-300" />
          <span className="text-sm text-zinc-600 font-medium">{MEMBER.name}</span>
          <span className="ml-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-600 uppercase tracking-wide">
            Demo
          </span>
        </div>

        {/* ── Hero Header ──────────────────────────────────────────────────── */}
        <div
          className="rounded-xl border border-zinc-200 bg-white overflow-hidden"
          style={{ borderLeft: `4px solid ${DEPT_COLOR}` }}
        >
          <div className="p-6">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
              {/* Avatar */}
              <div
                className="h-20 w-20 rounded-full flex items-center justify-center text-2xl font-bold shrink-0"
                style={{
                  backgroundColor: `${DEPT_COLOR}18`,
                  color: DEPT_COLOR,
                  boxShadow: `0 0 0 3px ${DEPT_COLOR}35, 0 0 0 5px white`,
                }}
              >
                {MEMBER.initials}
              </div>

              {/* Core info */}
              <div className="flex-1 min-w-0 space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h1 className="text-2xl font-bold text-zinc-900">{MEMBER.name}</h1>
                    <p className="text-sm text-zinc-500 mt-0.5">
                      {MEMBER.title}
                      <span className="mx-2 text-zinc-300">·</span>
                      <span style={{ color: DEPT_COLOR }} className="font-medium">{MEMBER.department}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8">
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem>Send Message</DropdownMenuItem>
                        <DropdownMenuItem>Manage Access</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-amber-600">Change Status</DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600">Remove Member</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Status + capacity row */}
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <AvailabilityPulse />
                    <span className="text-xs font-medium text-emerald-700">Available</span>
                  </div>
                  <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                    Active
                  </span>
                  <span className="inline-flex items-center rounded border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 font-mono text-[10px] font-medium text-zinc-500">
                    FTE
                  </span>
                  <Separator orientation="vertical" className="h-4" />
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-1.5 cursor-default">
                        <span className="text-xs text-zinc-400">Capacity</span>
                        <span className={cn("font-mono text-xs font-bold tabular-nums", capTextClass)}>
                          {MEMBER.capacity.used}
                        </span>
                        <span className="text-xs text-zinc-300">/</span>
                        <span className="text-xs text-zinc-400">{MEMBER.capacity.max}</span>
                        <div className="w-20 h-1.5 rounded-full bg-zinc-100 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${(MEMBER.capacity.used / MEMBER.capacity.max) * 100}%`,
                              backgroundColor: capBarColor,
                            }}
                          />
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent className="text-xs">
                      {MEMBER.capacity.used}/{MEMBER.capacity.max} daily booking slots used
                    </TooltipContent>
                  </Tooltip>
                </div>

                {/* Contact row */}
                <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
                  {[
                    { icon: Mail, text: MEMBER.email },
                    { icon: Phone, text: MEMBER.phone },
                    { icon: MapPin, text: MEMBER.location },
                    { icon: CalendarDays, text: `Joined ${MEMBER.joined}` },
                  ].map(({ icon: Icon, text }) => (
                    <span key={text} className="flex items-center gap-1.5 text-xs text-zinc-400">
                      <Icon className="h-3 w-3 shrink-0" />
                      {text}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Body: Sidebar + Tabs ─────────────────────────────────────────── */}
        <div className="flex gap-5 items-start">
          {/* Sidebar */}
          <aside className="w-52 shrink-0 sticky top-4 space-y-3">
            <ContactCard />
            <DeptCard />
            <ReportsToCard />
            <PayRateCard />
          </aside>

          {/* Main content */}
          <div className="flex-1 min-w-0 space-y-4">
            {/* Custom underline tab bar */}
            <div className="flex border-b border-zinc-200">
              {TABS.map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActiveTab(id)}
                  className={cn(
                    "px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px",
                    activeTab === id
                      ? "border-zinc-900 text-zinc-900"
                      : "border-transparent text-zinc-400 hover:text-zinc-700"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="pt-1">
              {activeTab === "overview" && <OverviewTab />}
              {activeTab === "schedule" && <ScheduleTab />}
              {activeTab === "skills" && <SkillsTab />}
              {activeTab === "capacity" && <CapacityTab />}
              {activeTab === "activity" && <ActivityTab />}
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}
