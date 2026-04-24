"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import {
  Plus,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Circle,
  Clock,
  AlertTriangle,
  TrendingUp,
  Briefcase,
  PoundSterling,
  BarChart3,
  FileText,
  Pencil,
  Layers,
  MoreHorizontal,
  Receipt,
} from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

type ProjectStatus = "ON_TRACK" | "AT_RISK" | "OVER_BUDGET" | "NOT_STARTED" | "COMPLETED"
type PhaseStatus = "COMPLETED" | "IN_PROGRESS" | "NOT_STARTED"
type JobStatus = "COMPLETED" | "IN_PROGRESS" | "PENDING"
type InvoiceStatus = "PAID" | "SENT" | "OVERDUE" | "DRAFT"

interface PhaseJob {
  id: string
  title: string
  status: JobStatus
}

interface PhaseInvoice {
  number: string
  amount: number
  status: InvoiceStatus
}

interface Phase {
  number: number
  name: string
  status: PhaseStatus
  budget: number
  spent: number
  startDate: string
  endDate: string
  jobs: PhaseJob[]
  invoice: PhaseInvoice | null
}

interface Project {
  id: string
  number: string
  name: string
  customer: string
  phasesComplete: number
  phasesTotal: number
  spent: number
  budget: number
  openJobs: number
  status: ProjectStatus
  phases: Phase[]
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const PROJECTS: Project[] = [
  {
    id: "prj-001",
    number: "#PRJ-001",
    name: "Kitchen Renovation",
    customer: "TechCorp HQ",
    phasesComplete: 3,
    phasesTotal: 5,
    spent: 28400,
    budget: 42000,
    openJobs: 4,
    status: "ON_TRACK",
    phases: [
      {
        number: 1,
        name: "Design & Planning",
        status: "COMPLETED",
        budget: 3200,
        spent: 3200,
        startDate: "15 Jan 2026",
        endDate: "28 Jan 2026",
        jobs: [
          { id: "J-0821", title: "Site survey & measurements", status: "COMPLETED" },
          { id: "J-0822", title: "Design sign-off & permits", status: "COMPLETED" },
        ],
        invoice: { number: "INV-0041", amount: 3200, status: "PAID" },
      },
      {
        number: 2,
        name: "Demolition",
        status: "COMPLETED",
        budget: 4800,
        spent: 4800,
        startDate: "3 Feb 2026",
        endDate: "10 Feb 2026",
        jobs: [
          { id: "J-0843", title: "Strip existing units & flooring", status: "COMPLETED" },
          { id: "J-0844", title: "Asbestos check & removal", status: "COMPLETED" },
          { id: "J-0845", title: "Waste disposal", status: "COMPLETED" },
        ],
        invoice: { number: "INV-0052", amount: 4800, status: "PAID" },
      },
      {
        number: 3,
        name: "Structural Work",
        status: "COMPLETED",
        budget: 12400,
        spent: 12400,
        startDate: "15 Feb 2026",
        endDate: "10 Mar 2026",
        jobs: [
          { id: "J-0856", title: "First fix plumbing", status: "COMPLETED" },
          { id: "J-0857", title: "First fix electrical", status: "COMPLETED" },
          { id: "J-0858", title: "Wall boarding & plastering", status: "COMPLETED" },
          { id: "J-0859", title: "Flooring preparation", status: "COMPLETED" },
          { id: "J-0860", title: "Window & door alterations", status: "COMPLETED" },
        ],
        invoice: { number: "INV-0061", amount: 12400, status: "PAID" },
      },
      {
        number: 4,
        name: "Fitting & Installation",
        status: "IN_PROGRESS",
        budget: 14000,
        spent: 8000,
        startDate: "15 Mar 2026",
        endDate: "",
        jobs: [
          { id: "J-0878", title: "Plumbing rough-in", status: "COMPLETED" },
          { id: "J-0879", title: "Electrical first fix", status: "COMPLETED" },
          { id: "J-0890", title: "Kitchen unit install", status: "IN_PROGRESS" },
          { id: "J-0891", title: "Worktop fitting", status: "PENDING" },
        ],
        invoice: null,
      },
      {
        number: 5,
        name: "Snagging & Sign-off",
        status: "NOT_STARTED",
        budget: 7600,
        spent: 0,
        startDate: "",
        endDate: "",
        jobs: [],
        invoice: null,
      },
    ],
  },
  {
    id: "prj-002",
    number: "#PRJ-002",
    name: "HVAC Installation",
    customer: "RetailCo Stockport",
    phasesComplete: 1,
    phasesTotal: 4,
    spent: 8200,
    budget: 31500,
    openJobs: 2,
    status: "ON_TRACK",
    phases: [],
  },
  {
    id: "prj-003",
    number: "#PRJ-003",
    name: "Full Rewire",
    customer: "Old Mill Estate",
    phasesComplete: 2,
    phasesTotal: 3,
    spent: 14800,
    budget: 18000,
    openJobs: 1,
    status: "OVER_BUDGET",
    phases: [],
  },
  {
    id: "prj-004",
    number: "#PRJ-004",
    name: "Office Fit-out",
    customer: "Acme Industrial",
    phasesComplete: 0,
    phasesTotal: 6,
    spent: 0,
    budget: 65000,
    openJobs: 0,
    status: "NOT_STARTED",
    phases: [],
  },
  {
    id: "prj-005",
    number: "#PRJ-005",
    name: "Boiler Replacement Programme",
    customer: "City Council",
    phasesComplete: 5,
    phasesTotal: 8,
    spent: 52100,
    budget: 94000,
    openJobs: 6,
    status: "AT_RISK",
    phases: [],
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtGBP(val: number) {
  return `£${val.toLocaleString()}`
}

function pct(spent: number, budget: number) {
  if (budget === 0) return 0
  return Math.round((spent / budget) * 100)
}

// ─── Status Helpers ───────────────────────────────────────────────────────────

function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  const map: Record<ProjectStatus, { label: string; className: string }> = {
    ON_TRACK: {
      label: "On Track",
      className: "bg-emerald-50 text-emerald-700 border-emerald-200",
    },
    AT_RISK: {
      label: "At Risk",
      className: "bg-amber-50 text-amber-700 border-amber-200",
    },
    OVER_BUDGET: {
      label: "Over Budget",
      className: "bg-red-50 text-red-700 border-red-200",
    },
    NOT_STARTED: {
      label: "Not Started",
      className: "bg-zinc-100 text-zinc-600 border-zinc-200",
    },
    COMPLETED: {
      label: "Completed",
      className: "bg-blue-50 text-blue-700 border-blue-200",
    },
  }
  const { label, className } = map[status]
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold",
        className
      )}
    >
      {label}
    </span>
  )
}

function PhaseStatusBadge({ status }: { status: PhaseStatus }) {
  if (status === "COMPLETED")
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
        <CheckCircle2 className="h-3 w-3" /> Completed
      </span>
    )
  if (status === "IN_PROGRESS")
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
        <Clock className="h-3 w-3" /> In Progress
      </span>
    )
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[11px] font-semibold text-zinc-500">
      <Circle className="h-3 w-3" /> Not Started
    </span>
  )
}

function JobStatusIcon({ status }: { status: JobStatus }) {
  if (status === "COMPLETED") return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
  if (status === "IN_PROGRESS") return <Clock className="h-3.5 w-3.5 text-blue-500 shrink-0" />
  return <Circle className="h-3.5 w-3.5 text-zinc-300 shrink-0" />
}

function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  const map: Record<InvoiceStatus, string> = {
    PAID: "bg-emerald-50 text-emerald-700 border-emerald-200",
    SENT: "bg-blue-50 text-blue-700 border-blue-200",
    OVERDUE: "bg-red-50 text-red-700 border-red-200",
    DRAFT: "bg-zinc-100 text-zinc-500 border-zinc-200",
  }
  const labels: Record<InvoiceStatus, string> = {
    PAID: "Paid",
    SENT: "Sent",
    OVERDUE: "Overdue",
    DRAFT: "Draft",
  }
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold", map[status])}>
      {labels[status]}
    </span>
  )
}

// ─── Phase Card ───────────────────────────────────────────────────────────────

function PhaseCard({ phase, isExpanded, onToggle }: { phase: Phase; isExpanded: boolean; onToggle: () => void }) {
  const spentPct = pct(phase.spent, phase.budget)
  const isCurrent = phase.status === "IN_PROGRESS"

  return (
    <div
      className={cn(
        "rounded-xl border transition-all",
        isCurrent
          ? "border-blue-200 bg-blue-50/40"
          : phase.status === "COMPLETED"
          ? "border-zinc-200 bg-white"
          : "border-dashed border-zinc-200 bg-zinc-50/50"
      )}
    >
      {/* Phase header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-4 text-left"
      >
        {/* Number bubble */}
        <div
          className={cn(
            "h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
            phase.status === "COMPLETED"
              ? "bg-emerald-100 text-emerald-700"
              : isCurrent
              ? "bg-blue-600 text-white"
              : "bg-zinc-200 text-zinc-500"
          )}
        >
          {phase.status === "COMPLETED" ? <CheckCircle2 className="h-4 w-4" /> : phase.number}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={cn(
                "text-sm font-semibold",
                phase.status === "NOT_STARTED" ? "text-zinc-400" : "text-zinc-900"
              )}
            >
              Phase {phase.number}: {phase.name}
            </span>
            {isCurrent && (
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded">
                Current
              </span>
            )}
            <PhaseStatusBadge status={phase.status} />
          </div>
          {(phase.startDate || phase.endDate) && (
            <p className="text-xs text-zinc-400 mt-0.5">
              {phase.startDate}
              {phase.endDate ? ` — ${phase.endDate}` : " — ongoing"}
            </p>
          )}
        </div>

        <div className="flex items-center gap-4 shrink-0">
          <div className="text-right">
            <p className="text-sm font-semibold text-zinc-900">{fmtGBP(phase.budget)}</p>
            {phase.spent > 0 && (
              <p className="text-xs text-zinc-500">
                {fmtGBP(phase.spent)} spent
              </p>
            )}
          </div>
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-zinc-400" />
          ) : (
            <ChevronRight className="h-4 w-4 text-zinc-400" />
          )}
        </div>
      </button>

      {/* Expanded body */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-zinc-100">
          {/* Budget progress */}
          {phase.budget > 0 && phase.spent > 0 && (
            <div className="pt-3 space-y-1.5">
              <div className="flex justify-between text-xs text-zinc-500">
                <span>Budget utilisation</span>
                <span className="font-semibold text-zinc-700">{spentPct}%</span>
              </div>
              <Progress
                value={spentPct}
                className={cn(
                  "h-1.5",
                  spentPct > 90 ? "[&>div]:bg-red-500" : "[&>div]:bg-emerald-500"
                )}
              />
              <div className="flex justify-between text-xs">
                <span className="text-zinc-500">
                  {fmtGBP(phase.spent)} of {fmtGBP(phase.budget)}
                </span>
                <span className="text-zinc-500">
                  {fmtGBP(phase.budget - phase.spent)} remaining
                </span>
              </div>
            </div>
          )}

          {/* Jobs list */}
          {phase.jobs.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Jobs</p>
              <div className="space-y-1">
                {phase.jobs.map((job) => (
                  <div
                    key={job.id}
                    className="flex items-center gap-2.5 rounded-lg bg-white border border-zinc-100 px-3 py-2"
                  >
                    <JobStatusIcon status={job.status} />
                    <span className="text-xs text-zinc-400 font-mono shrink-0">{job.id}</span>
                    <span
                      className={cn(
                        "text-sm flex-1",
                        job.status === "COMPLETED"
                          ? "text-zinc-400 line-through"
                          : job.status === "IN_PROGRESS"
                          ? "text-zinc-900 font-medium"
                          : "text-zinc-600"
                      )}
                    >
                      {job.title}
                    </span>
                    <span
                      className={cn(
                        "text-[11px] font-medium",
                        job.status === "COMPLETED"
                          ? "text-emerald-600"
                          : job.status === "IN_PROGRESS"
                          ? "text-blue-600"
                          : "text-zinc-400"
                      )}
                    >
                      {job.status === "COMPLETED"
                        ? "Done"
                        : job.status === "IN_PROGRESS"
                        ? "In Progress"
                        : "Pending"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {phase.status === "NOT_STARTED" && phase.jobs.length === 0 && (
            <div className="pt-1 flex items-center gap-2 text-xs text-zinc-400 italic">
              <Circle className="h-3.5 w-3.5" />
              No jobs created yet for this phase.
            </div>
          )}

          {/* Invoice row */}
          <div className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-3 py-2.5">
            <div className="flex items-center gap-2">
              <Receipt className="h-4 w-4 text-zinc-400" />
              {phase.invoice ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-zinc-700">{phase.invoice.number}</span>
                  <span className="text-sm text-zinc-900 font-semibold">{fmtGBP(phase.invoice.amount)}</span>
                  <InvoiceStatusBadge status={phase.invoice.status} />
                </div>
              ) : phase.status === "IN_PROGRESS" ? (
                <span className="text-sm text-zinc-500">Invoice not yet generated</span>
              ) : (
                <span className="text-sm text-zinc-400 italic">Invoice pending phase completion</span>
              )}
            </div>
            {!phase.invoice && phase.status === "IN_PROGRESS" && (
              <Button
                size="sm"
                className="h-7 px-3 text-xs bg-zinc-900 hover:bg-zinc-700 text-white gap-1.5"
              >
                <FileText className="h-3 w-3" />
                Generate milestone invoice
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Project List Card ────────────────────────────────────────────────────────

function ProjectCard({
  project,
  isSelected,
  onClick,
}: {
  project: Project
  isSelected: boolean
  onClick: () => void
}) {
  const completion = pct(project.phasesComplete, project.phasesTotal)
  const spentPct = pct(project.spent, project.budget)

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left rounded-xl border p-4 transition-all space-y-3",
        isSelected
          ? "border-zinc-900 bg-white shadow-sm ring-1 ring-zinc-900/10"
          : "border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50/50"
      )}
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-mono text-zinc-400 font-medium">{project.number}</span>
            <span className="text-sm font-semibold text-zinc-900 leading-snug">{project.name}</span>
          </div>
          <p className="text-xs text-zinc-500 mt-0.5">{project.customer}</p>
        </div>
        <ProjectStatusBadge status={project.status} />
      </div>

      {/* Progress bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-zinc-500">
            {project.phasesComplete}/{project.phasesTotal} phases
          </span>
          <span className="font-semibold text-zinc-700">{spentPct}%</span>
        </div>
        <Progress
          value={spentPct}
          className={cn(
            "h-1.5",
            project.status === "OVER_BUDGET"
              ? "[&>div]:bg-red-500"
              : project.status === "AT_RISK"
              ? "[&>div]:bg-amber-500"
              : "[&>div]:bg-emerald-500"
          )}
        />
      </div>

      {/* Bottom row */}
      <div className="flex items-center justify-between text-xs text-zinc-500">
        <span>
          {fmtGBP(project.spent)}{" "}
          <span className="text-zinc-300">/</span>{" "}
          {fmtGBP(project.budget)}
        </span>
        {project.openJobs > 0 ? (
          <span className="inline-flex items-center gap-1 text-zinc-600">
            <Briefcase className="h-3 w-3" />
            {project.openJobs} open {project.openJobs === 1 ? "job" : "jobs"}
          </span>
        ) : (
          <span className="text-zinc-300">No open jobs</span>
        )}
      </div>
    </button>
  )
}

// ─── Detail Panel ─────────────────────────────────────────────────────────────

function ProjectDetailPanel({ project }: { project: Project }) {
  const [expandedPhases, setExpandedPhases] = useState<Set<number>>(new Set([4]))

  function togglePhase(phaseNum: number) {
    setExpandedPhases((prev) => {
      const next = new Set(prev)
      if (next.has(phaseNum)) {
        next.delete(phaseNum)
      } else {
        next.add(phaseNum)
      }
      return next
    })
  }

  const remaining = project.budget - project.spent
  const completion = pct(project.spent, project.budget)

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Detail header */}
      <div className="flex items-start justify-between gap-4 p-5 border-b border-zinc-200 shrink-0">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono text-zinc-400">{project.number}</span>
            <h2 className="text-lg font-semibold text-zinc-900">{project.name}</h2>
          </div>
          <p className="text-sm text-zinc-500 mt-0.5">{project.customer}</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
            <Pencil className="h-3.5 w-3.5" /> Edit
          </Button>
          <Button size="sm" className="h-8 gap-1.5 text-xs bg-zinc-900 hover:bg-zinc-700 text-white">
            <Plus className="h-3.5 w-3.5" /> Add Phase
          </Button>
        </div>
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-4 gap-0 border-b border-zinc-200 shrink-0">
        {[
          { label: "Total Budget", value: fmtGBP(project.budget), highlight: false },
          { label: "Spent", value: fmtGBP(project.spent), highlight: false },
          { label: "Remaining", value: fmtGBP(remaining), highlight: remaining < 0 },
          { label: "Completion", value: `${completion}%`, highlight: false },
        ].map(({ label, value, highlight }, i) => (
          <div
            key={label}
            className={cn(
              "px-5 py-3.5 border-r border-zinc-200 last:border-r-0",
              highlight ? "bg-red-50" : "bg-zinc-50/50"
            )}
          >
            <p className="text-xs text-zinc-500">{label}</p>
            <p className={cn("text-sm font-bold mt-0.5", highlight ? "text-red-700" : "text-zinc-900")}>
              {value}
            </p>
          </div>
        ))}
      </div>

      {/* Phase timeline */}
      <div className="flex-1 overflow-y-auto p-5">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5" />
              Phase Timeline
            </span>
            <span className="text-xs text-zinc-400">
              {project.phasesComplete}/{project.phasesTotal} complete
            </span>
          </div>

          {/* Phase connector line + cards */}
          <div className="relative">
            {/* Vertical connector */}
            <div className="absolute left-[13px] top-7 bottom-7 w-px bg-zinc-200 z-0" />

            <div className="space-y-3 relative z-10">
              {project.phases.map((phase) => (
                <PhaseCard
                  key={phase.number}
                  phase={phase}
                  isExpanded={expandedPhases.has(phase.number)}
                  onToggle={() => togglePhase(phase.number)}
                />
              ))}
            </div>
          </div>

          {/* Add phase CTA */}
          <button className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-zinc-200 py-3 text-xs text-zinc-400 hover:bg-zinc-50 hover:text-zinc-600 transition-colors">
            <Plus className="h-3.5 w-3.5" />
            Add Phase
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type FilterChip = "all" | "active" | "at_risk" | "over_budget" | "not_started"

export default function ProjectsPage() {
  const [filter, setFilter] = useState<FilterChip>("all")
  const [selectedId, setSelectedId] = useState<string>("prj-001")

  const filterMap: Record<FilterChip, (p: Project) => boolean> = {
    all: () => true,
    active: (p) => p.status === "ON_TRACK" || p.status === "AT_RISK",
    at_risk: (p) => p.status === "AT_RISK",
    over_budget: (p) => p.status === "OVER_BUDGET",
    not_started: (p) => p.status === "NOT_STARTED",
  }

  const filtered = PROJECTS.filter(filterMap[filter])
  const selectedProject = PROJECTS.find((p) => p.id === selectedId) ?? PROJECTS[0]

  const totalPipeline = PROJECTS.reduce((s, p) => s + p.budget, 0)
  const avgCompletion = Math.round(
    PROJECTS.reduce((s, p) => s + pct(p.phasesComplete, p.phasesTotal), 0) / PROJECTS.length
  )
  const activeCount = PROJECTS.filter((p) => p.status === "ON_TRACK" || p.status === "AT_RISK").length
  const overBudgetCount = PROJECTS.filter((p) => p.status === "OVER_BUDGET").length

  const CHIPS: { id: FilterChip; label: string; count: number }[] = [
    { id: "all", label: "All", count: PROJECTS.length },
    { id: "active", label: "Active", count: activeCount },
    { id: "at_risk", label: "At Risk", count: 1 },
    { id: "over_budget", label: "Over Budget", count: overBudgetCount },
    { id: "not_started", label: "Not Started", count: 1 },
  ]

  return (
    <div className="animate-fade-in flex flex-col h-full">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Projects</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Multi-phase projects with milestones, jobs, and invoicing</p>
        </div>
        <Button className="gap-2 bg-zinc-900 hover:bg-zinc-700 text-white">
          <Plus className="h-4 w-4" />
          New Project
        </Button>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          {
            label: "Active Projects",
            value: String(activeCount),
            icon: Briefcase,
            iconBg: "bg-blue-50",
            iconColor: "text-blue-600",
          },
          {
            label: "Total Pipeline Value",
            value: `£${totalPipeline.toLocaleString()}`,
            icon: PoundSterling,
            iconBg: "bg-emerald-50",
            iconColor: "text-emerald-600",
          },
          {
            label: "Avg Completion",
            value: `${avgCompletion}%`,
            icon: BarChart3,
            iconBg: "bg-zinc-50",
            iconColor: "text-zinc-600",
          },
          {
            label: "Over Budget",
            value: String(overBudgetCount),
            icon: AlertTriangle,
            iconBg: "bg-red-50",
            iconColor: "text-red-600",
          },
        ].map(({ label, value, icon: Icon, iconBg, iconColor }) => (
          <div key={label} className="rounded-xl border border-zinc-200 bg-white p-4 flex items-center gap-3">
            <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center shrink-0", iconBg)}>
              <Icon className={cn("h-4 w-4", iconColor)} />
            </div>
            <div>
              <p className="text-xs text-zinc-500">{label}</p>
              <p className="text-xl font-bold text-zinc-900 leading-tight">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Split panel layout */}
      <div className="flex gap-5 flex-1 min-h-0">
        {/* Left: project list */}
        <div className="w-[35%] flex flex-col gap-3 min-h-0">
          {/* Filter chips */}
          <div className="flex flex-wrap gap-1.5 shrink-0">
            {CHIPS.map(({ id, label, count }) => (
              <button
                key={id}
                onClick={() => setFilter(id)}
                className={cn(
                  "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors gap-1",
                  filter === id
                    ? "border-zinc-900 bg-zinc-900 text-white"
                    : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
                )}
              >
                {label}
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums",
                    filter === id ? "bg-white/20 text-white" : "bg-zinc-100 text-zinc-500"
                  )}
                >
                  {count}
                </span>
              </button>
            ))}
          </div>

          {/* Project cards */}
          <div className="flex flex-col gap-2.5 overflow-y-auto flex-1 pr-1">
            {filtered.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                isSelected={selectedId === project.id}
                onClick={() => setSelectedId(project.id)}
              />
            ))}
          </div>
        </div>

        {/* Right: detail panel */}
        <div className="flex-1 rounded-xl border border-zinc-200 bg-white overflow-hidden flex flex-col min-h-0">
          {selectedProject && <ProjectDetailPanel project={selectedProject} />}
        </div>
      </div>
    </div>
  )
}
