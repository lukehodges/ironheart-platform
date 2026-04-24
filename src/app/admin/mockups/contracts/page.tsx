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
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import {
  Plus,
  MoreHorizontal,
  Eye,
  Pencil,
  Pause,
  Play,
  Trash2,
  CalendarClock,
  X,
  RefreshCcw,
  PoundSterling,
  FileText,
  Check,
  Calendar,
  ChevronRight,
  User,
  Repeat2,
} from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

type ContractStatus = "ACTIVE" | "PAUSED" | "CANCELLED"
type BillingType = "PER_JOB" | "MONTHLY" | "QUARTERLY" | "ON_COMPLETION"

interface Contract {
  id: string
  ref: string
  name: string
  customer: string
  service: string
  schedule: string
  resource: string
  value: string
  valueRaw: number
  billingType: BillingType
  billing: string
  status: ContractStatus
  nextJob: string | null
  pausedSince?: string
}

// ─── Hardcoded data ───────────────────────────────────────────────────────────

const CONTRACTS: Contract[] = [
  {
    id: "c1",
    ref: "RC-001",
    name: "Weekly Cleaning",
    customer: "Acme Ltd",
    service: "Commercial Cleaning",
    schedule: "Every Monday",
    resource: "Sarah Chen",
    value: "£80/job",
    valueRaw: 80,
    billingType: "PER_JOB",
    billing: "Per Job",
    status: "ACTIVE",
    nextJob: "Mon 14 Apr",
  },
  {
    id: "c2",
    ref: "RC-002",
    name: "Monthly Retainer Visit",
    customer: "RetailCo",
    service: "Retainer Maintenance",
    schedule: "Monthly (1st Thu)",
    resource: "Mike Torres",
    value: "£400/month",
    valueRaw: 400,
    billingType: "MONTHLY",
    billing: "Monthly",
    status: "ACTIVE",
    nextJob: "Thu 1 May",
  },
  {
    id: "c3",
    ref: "RC-003",
    name: "Quarterly Site Audit",
    customer: "TechCorp",
    service: "Site Compliance Audit",
    schedule: "Every 3 months",
    resource: "Mike Torres + Van 1",
    value: "£1,200/quarter",
    valueRaw: 1200,
    billingType: "QUARTERLY",
    billing: "Quarterly",
    status: "ACTIVE",
    nextJob: "1 Jul",
  },
  {
    id: "c4",
    ref: "RC-004",
    name: "Bi-weekly Window Clean",
    customer: "Green Valley",
    service: "Window Cleaning",
    schedule: "Fortnightly (Wed)",
    resource: "Pressure Washer + Mike Torres",
    value: "£120/visit",
    valueRaw: 120,
    billingType: "PER_JOB",
    billing: "Per Job",
    status: "PAUSED",
    nextJob: null,
    pausedSince: "15 Mar",
  },
  {
    id: "c5",
    ref: "RC-005",
    name: "Daily Waste Route",
    customer: "City Council",
    service: "Commercial Waste Collection",
    schedule: "Mon–Fri 07:30",
    resource: "Van 2",
    value: "£240/day",
    valueRaw: 240,
    billingType: "MONTHLY",
    billing: "Monthly",
    status: "ACTIVE",
    nextJob: "Tomorrow 07:30",
  },
  {
    id: "c6",
    ref: "RC-006",
    name: "Annual Safety Inspection",
    customer: "Old Mill Estate",
    service: "Fire Safety Inspection",
    schedule: "Annually (January)",
    resource: "Sarah Chen",
    value: "£350/year",
    valueRaw: 350,
    billingType: "ON_COMPLETION",
    billing: "On Completion",
    status: "ACTIVE",
    nextJob: "Jan 2027",
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function StatusBadge({ status, pausedSince }: { status: ContractStatus; pausedSince?: string }) {
  if (status === "ACTIVE")
    return (
      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
        Active
      </span>
    )
  if (status === "PAUSED")
    return (
      <div>
        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          Paused
        </span>
        {pausedSince && (
          <p className="text-xs text-zinc-400 mt-0.5">since {pausedSince}</p>
        )}
      </div>
    )
  return (
    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold bg-zinc-100 text-zinc-500 border border-zinc-200">
      Cancelled
    </span>
  )
}

const BILLING_STYLES: Record<BillingType, string> = {
  PER_JOB: "bg-zinc-100 text-zinc-600 border-zinc-200",
  MONTHLY: "bg-blue-50 text-blue-700 border-blue-200",
  QUARTERLY: "bg-purple-50 text-purple-700 border-purple-200",
  ON_COMPLETION: "bg-amber-50 text-amber-700 border-amber-200",
}

const BILLING_LABELS: Record<BillingType, string> = {
  PER_JOB: "Per Job",
  MONTHLY: "Monthly",
  QUARTERLY: "Quarterly",
  ON_COMPLETION: "On Completion",
}

function BillingBadge({ type }: { type: BillingType }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
        BILLING_STYLES[type],
      )}
    >
      {BILLING_LABELS[type]}
    </span>
  )
}

// ─── New Contract Panel ────────────────────────────────────────────────────────

type Frequency = "Daily" | "Weekly" | "Monthly" | "Yearly"
type BillingSchedule = "job" | "weekly" | "monthly" | "completion"

const DAYS = ["M", "T", "W", "T", "F", "S", "S"]
const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

const NEXT_OCCURRENCES = [
  "Mon 14 Apr 2026",
  "Mon 21 Apr 2026",
  "Mon 28 Apr 2026",
  "Mon 4 May 2026",
  "Mon 11 May 2026",
]

function NewContractPanel({ onClose }: { onClose: () => void }) {
  const [freq, setFreq] = useState<Frequency>("Weekly")
  const [activeDays, setActiveDays] = useState<Set<number>>(new Set([0])) // Monday
  const [billing, setBilling] = useState<BillingSchedule>("job")
  const [forever, setForever] = useState(true)

  const toggleDay = (i: number) => {
    setActiveDays((prev) => {
      const next = new Set(prev)
      if (next.has(i)) {
        if (next.size > 1) next.delete(i)
      } else {
        next.add(i)
      }
      return next
    })
  }

  // Human-readable summary
  const selectedDayNames = DAY_LABELS.filter((_, i) => activeDays.has(i))
  const rruleSummary =
    freq === "Weekly"
      ? `Every ${selectedDayNames.join(" and ")}`
      : freq === "Daily"
      ? "Every day"
      : freq === "Monthly"
      ? "Monthly (1st occurrence)"
      : "Annually"

  return (
    <div className="fixed inset-y-0 right-0 w-[440px] bg-white border-l border-zinc-200 shadow-xl z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200 flex-shrink-0">
        <div>
          <h2 className="text-base font-semibold text-zinc-900">New Contract</h2>
          <p className="text-xs text-zinc-500 mt-0.5">Set up a recurring service agreement</p>
        </div>
        <button
          onClick={onClose}
          className="h-7 w-7 rounded-md flex items-center justify-center text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">

        {/* Customer */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-700 uppercase tracking-wide">Customer</label>
          <Select defaultValue="">
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Search or select customer…" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="acme">Acme Ltd</SelectItem>
              <SelectItem value="retailco">RetailCo</SelectItem>
              <SelectItem value="techcorp">TechCorp</SelectItem>
              <SelectItem value="greenvalley">Green Valley</SelectItem>
              <SelectItem value="citycouncil">City Council</SelectItem>
              <SelectItem value="oldmill">Old Mill Estate</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Service type */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-700 uppercase tracking-wide">Service Type</label>
          <Select defaultValue="">
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Select service…" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cleaning">Commercial Cleaning</SelectItem>
              <SelectItem value="waste">Waste Collection</SelectItem>
              <SelectItem value="audit">Site Audit</SelectItem>
              <SelectItem value="windows">Window Cleaning</SelectItem>
              <SelectItem value="fire">Fire Safety Inspection</SelectItem>
              <SelectItem value="retainer">Retainer Maintenance</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Preferred Resource */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-700 uppercase tracking-wide">
            Preferred Resource{" "}
            <span className="text-zinc-400 font-normal normal-case">(optional)</span>
          </label>
          <Select defaultValue="">
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Any available…" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sarah">Sarah Chen</SelectItem>
              <SelectItem value="mike">Mike Torres</SelectItem>
              <SelectItem value="van1">Van 1</SelectItem>
              <SelectItem value="van2">Van 2</SelectItem>
              <SelectItem value="any">Any available</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Separator />

        {/* ── Schedule builder ── */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Repeat2 className="h-4 w-4 text-zinc-400" />
            <label className="text-xs font-semibold text-zinc-700 uppercase tracking-wide">Schedule</label>
          </div>

          {/* Frequency selector */}
          <div className="space-y-1.5">
            <p className="text-xs text-zinc-500 font-medium">Repeats</p>
            <div className="grid grid-cols-4 rounded-lg border border-zinc-200 overflow-hidden">
              {(["Daily", "Weekly", "Monthly", "Yearly"] as Frequency[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFreq(f)}
                  className={cn(
                    "py-2 text-xs font-semibold transition-colors border-r border-zinc-200 last:border-r-0",
                    freq === f
                      ? "bg-zinc-900 text-white"
                      : "bg-white text-zinc-600 hover:bg-zinc-50"
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Weekly: day picker */}
          {freq === "Weekly" && (
            <div className="space-y-3">
              <p className="text-xs text-zinc-500 font-medium">On these days</p>
              <div className="flex items-center gap-1.5">
                {DAYS.map((d, i) => (
                  <button
                    key={`${d}-${i}`}
                    onClick={() => toggleDay(i)}
                    className={cn(
                      "h-9 w-9 rounded-full text-xs font-bold transition-all border",
                      activeDays.has(i)
                        ? "bg-zinc-900 text-white border-zinc-900"
                        : "bg-white text-zinc-500 border-zinc-200 hover:border-zinc-400 hover:bg-zinc-50"
                    )}
                  >
                    {d}
                  </button>
                ))}
              </div>

              {/* Interval */}
              <div className="flex items-center gap-2.5">
                <span className="text-xs text-zinc-600">Every</span>
                <Input
                  type="number"
                  defaultValue="1"
                  min="1"
                  max="52"
                  className="h-8 w-16 text-center text-sm font-semibold"
                />
                <span className="text-xs text-zinc-600">week(s)</span>
              </div>
            </div>
          )}

          {/* Monthly options */}
          {freq === "Monthly" && (
            <div className="space-y-2">
              <p className="text-xs text-zinc-500 font-medium">On</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Day of month", sub: "e.g. 14th" },
                  { label: "Day of week", sub: "e.g. First Thursday" },
                ].map((opt, i) => (
                  <label
                    key={i}
                    className={cn(
                      "flex flex-col gap-0.5 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors",
                      i === 1
                        ? "border-zinc-900 bg-zinc-900 text-white"
                        : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
                    )}
                  >
                    <span className="text-xs font-semibold">{opt.label}</span>
                    <span className={cn("text-xs", i === 1 ? "text-zinc-400" : "text-zinc-400")}>{opt.sub}</span>
                  </label>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2 mt-1">
                <Select defaultValue="first">
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="first">First</SelectItem>
                    <SelectItem value="second">Second</SelectItem>
                    <SelectItem value="third">Third</SelectItem>
                    <SelectItem value="last">Last</SelectItem>
                  </SelectContent>
                </Select>
                <Select defaultValue="thursday">
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"].map((d) => (
                      <SelectItem key={d} value={d.toLowerCase()}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Start date */}
          <div className="space-y-1.5">
            <p className="text-xs text-zinc-500 font-medium">Start date</p>
            <Input type="date" className="h-9" defaultValue="2026-04-14" />
          </div>

          {/* End condition */}
          <div className="space-y-2">
            <p className="text-xs text-zinc-500 font-medium">Ends</p>
            <div className="space-y-2">
              {[
                { id: "forever", label: "Forever", sub: "No end date" },
                { id: "until", label: "Until date", sub: "e.g. 31 Dec 2026" },
                { id: "count", label: "After N occurrences", sub: "e.g. 12 times" },
              ].map((opt) => (
                <label
                  key={opt.id}
                  className={cn(
                    "flex items-center gap-3 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors",
                    (opt.id === "forever" && forever) ||
                    (opt.id !== "forever" && !forever && opt.id === "until")
                      ? "border-zinc-900 bg-zinc-50"
                      : "border-zinc-200 bg-white hover:bg-zinc-50"
                  )}
                  onClick={() => setForever(opt.id === "forever")}
                >
                  <div
                    className={cn(
                      "h-4 w-4 rounded-full border-2 flex-shrink-0 transition-colors flex items-center justify-center",
                      (opt.id === "forever" && forever) ||
                      (opt.id !== "forever" && !forever && opt.id === "until")
                        ? "border-zinc-900 bg-zinc-900"
                        : "border-zinc-300 bg-white"
                    )}
                  >
                    {((opt.id === "forever" && forever) ||
                      (opt.id !== "forever" && !forever && opt.id === "until")) && (
                      <div className="h-1.5 w-1.5 rounded-full bg-white" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-zinc-900">{opt.label}</p>
                    <p className="text-xs text-zinc-400">{opt.sub}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Next 5 occurrences preview */}
          <div className="rounded-xl bg-zinc-50 border border-zinc-200 px-4 py-3 space-y-2">
            <div className="flex items-center gap-2">
              <RefreshCcw className="h-3.5 w-3.5 text-zinc-400" />
              <span className="text-xs font-semibold text-zinc-700">{rruleSummary}</span>
            </div>
            <div>
              <p className="text-xs text-zinc-500 font-medium mb-2">Next 5 occurrences</p>
              <div className="space-y-1">
                {NEXT_OCCURRENCES.map((d, i) => (
                  <div
                    key={d}
                    className="flex items-center gap-2 rounded-lg bg-white border border-zinc-200 px-2.5 py-1.5"
                  >
                    <div className={cn(
                      "h-1.5 w-1.5 rounded-full flex-shrink-0",
                      i === 0 ? "bg-zinc-900" : "bg-zinc-300"
                    )} />
                    <Calendar className="h-3 w-3 text-zinc-400 flex-shrink-0" />
                    <span className="text-xs text-zinc-700 font-medium">{d}</span>
                    {i === 0 && (
                      <span className="ml-auto text-xs text-emerald-600 font-medium">Next</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <Separator />

        {/* Invoicing schedule */}
        <div className="space-y-2.5">
          <label className="text-xs font-semibold text-zinc-700 uppercase tracking-wide">Invoicing Schedule</label>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                { id: "job", label: "Per Job", sub: "Invoice after each visit" },
                { id: "weekly", label: "Weekly", sub: "Every Monday" },
                { id: "monthly", label: "Monthly", sub: "1st of month" },
                { id: "completion", label: "On Completion", sub: "When contract ends" },
              ] as const
            ).map(({ id, label, sub }) => (
              <label
                key={id}
                onClick={() => setBilling(id)}
                className={cn(
                  "flex flex-col gap-0.5 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors",
                  billing === id
                    ? "border-zinc-900 bg-zinc-900 text-white"
                    : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
                )}
              >
                <span className="text-xs font-semibold">{label}</span>
                <span className={cn("text-xs", billing === id ? "text-zinc-400" : "text-zinc-400")}>{sub}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Job value */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-700 uppercase tracking-wide">Job Value</label>
          <div className="relative">
            <PoundSterling className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
            <Input placeholder="0.00" className="h-9 pl-8" />
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-700 uppercase tracking-wide">
            Notes <span className="text-zinc-400 font-normal normal-case">(optional)</span>
          </label>
          <textarea
            className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 resize-none focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
            rows={3}
            placeholder="Internal notes about this contract…"
          />
        </div>
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 border-t border-zinc-200 px-5 py-4 flex items-center gap-2">
        <Button className="flex-1 bg-zinc-900 hover:bg-zinc-700 text-white h-9 font-semibold">
          Create Contract
        </Button>
        <Button variant="outline" className="h-9" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

type FilterTab = "all" | "active" | "paused" | "cancelled"

export default function ContractsPage() {
  const [filter, setFilter] = useState<FilterTab>("all")
  const [panelOpen, setPanelOpen] = useState(true)

  const activeContracts = CONTRACTS.filter((c) => c.status === "ACTIVE")
  const pausedContracts = CONTRACTS.filter((c) => c.status === "PAUSED")

  const filtered = CONTRACTS.filter((c) => {
    if (filter === "active") return c.status === "ACTIVE"
    if (filter === "paused") return c.status === "PAUSED"
    if (filter === "cancelled") return c.status === "CANCELLED"
    return true
  })

  // Monthly recurring revenue estimate
  const mrr = activeContracts.reduce((sum, c) => {
    // RC-001: £80/job × ~4 jobs/month = £320
    // RC-002: £400/month
    // RC-003: £1200/quarter ÷ 3 = £400/month
    // RC-005: £240/day × ~20 days = £4,800/month
    // RC-006: £350/year ÷ 12 ≈ £29/month
    if (c.ref === "RC-001") return sum + 320
    if (c.ref === "RC-002") return sum + 400
    if (c.ref === "RC-003") return sum + 400
    if (c.ref === "RC-005") return sum + 4800
    if (c.ref === "RC-006") return sum + 29
    return sum
  }, 0)

  // Jobs this month estimate
  const jobsThisMonth = 4 + 1 + 1 + 20 + 0 // weekly×4 + monthly + quarterly(not this month) + daily

  const FILTER_TABS: { id: FilterTab; label: string }[] = [
    { id: "all", label: `All (${CONTRACTS.length})` },
    { id: "active", label: `Active (${activeContracts.length})` },
    { id: "paused", label: `Paused (${pausedContracts.length})` },
    { id: "cancelled", label: "Cancelled (0)" },
  ]

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Contracts</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            Recurring service agreements with auto-generated jobs
          </p>
        </div>
        <Button
          className="gap-2 bg-zinc-900 hover:bg-zinc-700 text-white"
          onClick={() => setPanelOpen(true)}
        >
          <Plus className="h-4 w-4" />
          New Contract
        </Button>
      </div>

      {/* ── KPI row ── */}
      <div className="grid grid-cols-4 gap-4">
        {[
          {
            label: "Active",
            value: String(activeContracts.length),
            Icon: FileText,
            accent: "text-emerald-600",
            bg: "bg-emerald-50",
          },
          {
            label: "Paused",
            value: String(pausedContracts.length),
            Icon: Pause,
            accent: "text-amber-600",
            bg: "bg-amber-50",
          },
          {
            label: "Monthly Revenue",
            value: `£${mrr.toLocaleString()}`,
            Icon: PoundSterling,
            accent: "text-zinc-900",
            bg: "bg-zinc-100",
          },
          {
            label: "Jobs This Month",
            value: String(jobsThisMonth),
            Icon: CalendarClock,
            accent: "text-blue-600",
            bg: "bg-blue-50",
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

      {/* ── Filter chips ── */}
      <div className="flex items-center gap-2">
        {FILTER_TABS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setFilter(id)}
            className={cn(
              "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              filter === id
                ? "border-zinc-900 bg-zinc-900 text-white"
                : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Table ── */}
      <div className="rounded-xl border border-zinc-200 overflow-hidden bg-white">
        <Table>
          <TableHeader>
            <TableRow className="bg-zinc-50 hover:bg-zinc-50">
              <TableHead className="text-xs font-semibold text-zinc-600 py-3 pl-5">Contract</TableHead>
              <TableHead className="text-xs font-semibold text-zinc-600 py-3">Customer</TableHead>
              <TableHead className="text-xs font-semibold text-zinc-600 py-3">Service</TableHead>
              <TableHead className="text-xs font-semibold text-zinc-600 py-3">Schedule</TableHead>
              <TableHead className="text-xs font-semibold text-zinc-600 py-3">Resources</TableHead>
              <TableHead className="text-xs font-semibold text-zinc-600 py-3">Value</TableHead>
              <TableHead className="text-xs font-semibold text-zinc-600 py-3">Billing</TableHead>
              <TableHead className="text-xs font-semibold text-zinc-600 py-3">Status</TableHead>
              <TableHead className="text-xs font-semibold text-zinc-600 py-3">Next Job</TableHead>
              <TableHead className="text-xs font-semibold text-zinc-600 py-3 text-right pr-5">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((contract) => (
              <TableRow key={contract.id} className="hover:bg-zinc-50/50 cursor-pointer group">
                <TableCell className="py-3.5 pl-5">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-mono text-zinc-400">#{contract.ref}</span>
                    </div>
                    <p className="text-sm font-semibold text-zinc-900 mt-0.5">{contract.name}</p>
                  </div>
                </TableCell>
                <TableCell className="py-3.5">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-full bg-zinc-100 flex items-center justify-center text-xs font-semibold text-zinc-600 flex-shrink-0">
                      {contract.customer.slice(0, 1)}
                    </div>
                    <span className="text-sm text-zinc-700">{contract.customer}</span>
                  </div>
                </TableCell>
                <TableCell className="py-3.5">
                  <span className="text-sm text-zinc-600">{contract.service}</span>
                </TableCell>
                <TableCell className="py-3.5">
                  <div className="flex items-center gap-1.5">
                    <RefreshCcw className="h-3 w-3 text-zinc-400 flex-shrink-0" />
                    <span className="text-sm text-zinc-700">{contract.schedule}</span>
                  </div>
                </TableCell>
                <TableCell className="py-3.5">
                  <div className="flex items-center gap-1.5">
                    <User className="h-3 w-3 text-zinc-400 flex-shrink-0" />
                    <span className="text-sm text-zinc-600">{contract.resource}</span>
                  </div>
                </TableCell>
                <TableCell className="py-3.5">
                  <span className="text-sm font-semibold text-zinc-900">{contract.value}</span>
                </TableCell>
                <TableCell className="py-3.5">
                  <BillingBadge type={contract.billingType} />
                </TableCell>
                <TableCell className="py-3.5">
                  <StatusBadge status={contract.status} pausedSince={contract.pausedSince} />
                </TableCell>
                <TableCell className="py-3.5">
                  {contract.nextJob ? (
                    <div className="flex items-center gap-1.5 text-sm text-zinc-700">
                      <CalendarClock className="h-3.5 w-3.5 text-zinc-400" />
                      {contract.nextJob}
                    </div>
                  ) : (
                    <span className="text-sm text-zinc-400">—</span>
                  )}
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
                    <DropdownMenuContent align="end" className="w-52">
                      <DropdownMenuItem className="gap-2 text-xs">
                        <Eye className="h-3.5 w-3.5" /> View Contract
                      </DropdownMenuItem>
                      <DropdownMenuItem className="gap-2 text-xs">
                        <Pencil className="h-3.5 w-3.5" /> Edit Contract
                      </DropdownMenuItem>
                      <DropdownMenuItem className="gap-2 text-xs">
                        <CalendarClock className="h-3.5 w-3.5" /> View Generated Jobs
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {contract.status === "ACTIVE" ? (
                        <DropdownMenuItem className="gap-2 text-xs text-amber-700 focus:text-amber-700">
                          <Pause className="h-3.5 w-3.5" /> Pause Contract
                        </DropdownMenuItem>
                      ) : contract.status === "PAUSED" ? (
                        <DropdownMenuItem className="gap-2 text-xs text-emerald-700 focus:text-emerald-700">
                          <Play className="h-3.5 w-3.5" /> Resume Contract
                        </DropdownMenuItem>
                      ) : null}
                      <DropdownMenuItem className="gap-2 text-xs text-red-600 focus:text-red-600">
                        <Trash2 className="h-3.5 w-3.5" /> Cancel Contract
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Table footer */}
        <div className="border-t border-zinc-100 px-5 py-3 flex items-center justify-between bg-zinc-50/50">
          <p className="text-xs text-zinc-500">
            {filtered.length} contract{filtered.length !== 1 ? "s" : ""}
            {filter !== "all" && <> matching <span className="font-medium capitalize">{filter}</span></>}
          </p>
          <div className="flex items-center gap-1 text-xs text-zinc-400">
            <ChevronRight className="h-3 w-3" />
            <span>Export</span>
          </div>
        </div>
      </div>

      {/* ── New Contract panel overlay ── */}
      {panelOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/20 backdrop-blur-[1px] z-40"
            onClick={() => setPanelOpen(false)}
          />
          <NewContractPanel onClose={() => setPanelOpen(false)} />
        </>
      )}
    </div>
  )
}
