"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table"
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
  Pencil,
  Check,
  X,
  PoundSterling,
  CalendarClock,
  Wallet,
  Info,
  Sliders,
  Building2,
} from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

interface SplitSegment {
  label: string
  description: string
  pct: number
  color: string
  textColor: string
  amount: number
}

interface OverrideRule {
  id: string
  service: string
  engineerPct: number
  notes: string
  status: "active" | "inactive"
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PREVIEW_JOB_VALUE = 200
const PLATFORM_PCT = 13
const TRAVEL_FIXED = 4 // estimated for preview

const platformAmount = (PREVIEW_JOB_VALUE * PLATFORM_PCT) / 100 // 26
const travelAmount = TRAVEL_FIXED // 4
const netAfter = PREVIEW_JOB_VALUE - platformAmount - travelAmount // 170
const ENGINEER_PCT_OF_NET = 35
const engineerAmount = (netAfter * ENGINEER_PCT_OF_NET) / 100 // 59.50
const businessAmount = netAfter - engineerAmount // 110.50

const SPLIT_SEGMENTS: SplitSegment[] = [
  {
    label: "Platform Fee",
    description: "Fixed 13% platform charge",
    pct: (platformAmount / PREVIEW_JOB_VALUE) * 100,
    color: "bg-violet-500",
    textColor: "text-violet-700",
    amount: platformAmount,
  },
  {
    label: "Travel",
    description: "Actual miles × £0.45/mile",
    pct: (travelAmount / PREVIEW_JOB_VALUE) * 100,
    color: "bg-blue-400",
    textColor: "text-blue-700",
    amount: travelAmount,
  },
  {
    label: "Engineer Commission",
    description: "35% of net (after platform + travel)",
    pct: (engineerAmount / PREVIEW_JOB_VALUE) * 100,
    color: "bg-emerald-500",
    textColor: "text-emerald-700",
    amount: engineerAmount,
  },
  {
    label: "Business Share",
    description: "Remainder after all deductions",
    pct: (businessAmount / PREVIEW_JOB_VALUE) * 100,
    color: "bg-zinc-400",
    textColor: "text-zinc-600",
    amount: businessAmount,
  },
]

const INITIAL_OVERRIDES: OverrideRule[] = [
  {
    id: "o1",
    service: "Boiler Repair",
    engineerPct: 40,
    notes: "Premium skill uplift",
    status: "active",
  },
  {
    id: "o2",
    service: "Emergency Callout",
    engineerPct: 30,
    notes: "+£20 callout fee applied first",
    status: "active",
  },
  {
    id: "o3",
    service: "Contract Jobs",
    engineerPct: 32,
    notes: "Margin reserved for account management",
    status: "active",
  },
]

const SERVICE_OPTIONS = [
  "Boiler Service",
  "Boiler Repair",
  "Emergency Callout",
  "Contract Jobs",
  "Plumbing",
  "Gas Safety Inspection",
  "Central Heating",
  "Landlord Certificate",
]

const PAYOUT_SETTINGS = [
  {
    label: "Payout Frequency",
    value: "Weekly, every Friday",
    icon: CalendarClock,
  },
  {
    label: "Minimum Payout",
    value: "£25.00",
    icon: PoundSterling,
  },
  {
    label: "Payout Method",
    value: "Direct to bank account or platform wallet credit",
    icon: Wallet,
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtGBP(val: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 2,
  }).format(val)
}

function StatusBadge({ status }: { status: "active" | "inactive" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold border",
        status === "active"
          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
          : "bg-zinc-100 text-zinc-500 border-zinc-200",
      )}
    >
      {status === "active" ? "Active" : "Inactive"}
    </span>
  )
}

// ─── Default Rule Card ────────────────────────────────────────────────────────

function DefaultRuleCard() {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
      {/* Card header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200 bg-zinc-50">
        <div className="flex items-center gap-2">
          <Sliders className="h-4 w-4 text-zinc-500" />
          <span className="text-sm font-bold text-zinc-900">Default Rule</span>
          <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
            Global
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-7 gap-1.5 text-xs border-zinc-200 text-zinc-600 hover:bg-zinc-100"
        >
          <Pencil className="h-3 w-3" />
          Edit Rule
        </Button>
      </div>

      <div className="px-5 py-5 space-y-5">
        {/* Proportion bar */}
        <div>
          <div className="flex rounded-full overflow-hidden h-4 gap-px">
            {SPLIT_SEGMENTS.map((seg) => (
              <div
                key={seg.label}
                className={cn("h-full transition-all", seg.color)}
                style={{ width: `${seg.pct}%` }}
                title={`${seg.label}: ${seg.pct.toFixed(1)}%`}
              />
            ))}
          </div>
          <div className="flex items-center gap-4 mt-2 flex-wrap">
            {SPLIT_SEGMENTS.map((seg) => (
              <div key={seg.label} className="flex items-center gap-1.5">
                <div className={cn("h-2.5 w-2.5 rounded-full shrink-0", seg.color)} />
                <span className="text-[11px] text-zinc-500 font-medium">{seg.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Split breakdown */}
        <div className="space-y-1">
          {SPLIT_SEGMENTS.map((seg) => (
            <div
              key={seg.label}
              className="flex items-center justify-between py-2.5 border-b border-zinc-100 last:border-0"
            >
              <div className="flex items-center gap-2.5">
                <div className={cn("h-3 w-3 rounded-full shrink-0", seg.color)} />
                <div>
                  <p className="text-sm font-medium text-zinc-900">{seg.label}</p>
                  <p className="text-[11px] text-zinc-400">{seg.description}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-zinc-900 tabular-nums">
                  {seg.label === "Travel" ? "Variable" : `${seg.pct.toFixed(0)}%`}
                </p>
              </div>
            </div>
          ))}
        </div>

        <Separator />

        {/* Live preview */}
        <div className="rounded-xl bg-zinc-50 border border-zinc-200 px-4 py-4 space-y-3">
          <div className="flex items-center gap-2">
            <Info className="h-3.5 w-3.5 text-zinc-400" />
            <span className="text-xs font-semibold text-zinc-700">
              Live Preview — Job Value: {fmtGBP(PREVIEW_JOB_VALUE)}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {SPLIT_SEGMENTS.map((seg) => (
              <div
                key={seg.label}
                className="rounded-lg bg-white border border-zinc-200 px-3 py-2.5 space-y-0.5"
              >
                <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wide">
                  {seg.label}
                </p>
                <p className={cn("text-base font-bold tabular-nums", seg.textColor)}>
                  {fmtGBP(seg.amount)}
                </p>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-zinc-400 leading-relaxed">
            Travel calculated from actual distance at £0.45/mile. Engineer commission is 35% of net
            revenue after platform fee and travel are deducted.
          </p>
        </div>
      </div>
    </div>
  )
}

// ─── Service-Specific Overrides ───────────────────────────────────────────────

function OverridesSection() {
  const [overrides, setOverrides] = useState<OverrideRule[]>(INITIAL_OVERRIDES)
  const [addingNew, setAddingNew] = useState(false)
  const [newService, setNewService] = useState("")
  const [newPct, setNewPct] = useState("")
  const [newNotes, setNewNotes] = useState("")

  function handleSave() {
    if (!newService || !newPct) return
    const rule: OverrideRule = {
      id: `o${Date.now()}`,
      service: newService,
      engineerPct: Number(newPct),
      notes: newNotes,
      status: "active",
    }
    setOverrides((prev) => [...prev, rule])
    setAddingNew(false)
    setNewService("")
    setNewPct("")
    setNewNotes("")
  }

  function handleCancel() {
    setAddingNew(false)
    setNewService("")
    setNewPct("")
    setNewNotes("")
  }

  function toggleStatus(id: string) {
    setOverrides((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, status: r.status === "active" ? "inactive" : "active" } : r,
      ),
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-zinc-900">Service-Specific Overrides</h2>
          <p className="text-sm text-zinc-500 mt-0.5">
            Override the default split for particular service types
          </p>
        </div>
        {!addingNew && (
          <Button
            className="gap-2 bg-zinc-900 hover:bg-zinc-700 text-white h-9"
            onClick={() => setAddingNew(true)}
          >
            <Plus className="h-4 w-4" />
            Add Override
          </Button>
        )}
      </div>

      <div className="rounded-xl border border-zinc-200 overflow-hidden bg-white">
        <Table>
          <TableHeader>
            <TableRow className="bg-zinc-50 hover:bg-zinc-50">
              <TableHead className="text-xs font-semibold text-zinc-600 py-3 pl-5">
                Service Type
              </TableHead>
              <TableHead className="text-xs font-semibold text-zinc-600 py-3">
                Engineer %
              </TableHead>
              <TableHead className="text-xs font-semibold text-zinc-600 py-3">Notes</TableHead>
              <TableHead className="text-xs font-semibold text-zinc-600 py-3">Status</TableHead>
              <TableHead className="text-xs font-semibold text-zinc-600 py-3 text-right pr-5">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {overrides.map((rule) => (
              <TableRow key={rule.id} className="hover:bg-zinc-50/50">
                <TableCell className="py-3.5 pl-5">
                  <span className="text-sm font-semibold text-zinc-900">{rule.service}</span>
                </TableCell>
                <TableCell className="py-3.5">
                  <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700 tabular-nums">
                    {rule.engineerPct}%
                  </span>
                </TableCell>
                <TableCell className="py-3.5">
                  <span className="text-sm text-zinc-500">{rule.notes}</span>
                </TableCell>
                <TableCell className="py-3.5">
                  <StatusBadge status={rule.status} />
                </TableCell>
                <TableCell className="py-3.5 text-right pr-5">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2.5 text-xs text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100"
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2.5 text-xs text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100"
                      onClick={() => toggleStatus(rule.id)}
                    >
                      {rule.status === "active" ? "Disable" : "Enable"}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}

            {/* Inline add form */}
            {addingNew && (
              <TableRow className="bg-blue-50/40 hover:bg-blue-50/40">
                <TableCell className="py-3 pl-5">
                  <Select value={newService} onValueChange={setNewService}>
                    <SelectTrigger className="h-8 text-xs w-44">
                      <SelectValue placeholder="Select service…" />
                    </SelectTrigger>
                    <SelectContent>
                      {SERVICE_OPTIONS.map((s) => (
                        <SelectItem key={s} value={s} className="text-xs">
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="py-3">
                  <div className="relative w-20">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      placeholder="35"
                      value={newPct}
                      onChange={(e) => setNewPct(e.target.value)}
                      className="h-8 text-xs pr-6"
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-zinc-400">
                      %
                    </span>
                  </div>
                </TableCell>
                <TableCell className="py-3">
                  <Input
                    placeholder="Optional notes…"
                    value={newNotes}
                    onChange={(e) => setNewNotes(e.target.value)}
                    className="h-8 text-xs"
                  />
                </TableCell>
                <TableCell className="py-3">
                  <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                    Active
                  </span>
                </TableCell>
                <TableCell className="py-3 text-right pr-5">
                  <div className="flex items-center justify-end gap-1.5">
                    <Button
                      size="sm"
                      className="h-7 px-3 bg-zinc-900 hover:bg-zinc-700 text-white text-xs gap-1"
                      onClick={handleSave}
                    >
                      <Check className="h-3 w-3" />
                      Save
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 px-3 text-xs border-zinc-200 text-zinc-600 hover:bg-zinc-50 gap-1"
                      onClick={handleCancel}
                    >
                      <X className="h-3 w-3" />
                      Cancel
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        <div className="border-t border-zinc-100 px-5 py-3 bg-zinc-50/50">
          <p className="text-xs text-zinc-500">
            {overrides.length} override rule{overrides.length !== 1 ? "s" : ""} configured —
            service-specific rules take precedence over the default rule
          </p>
        </div>
      </div>
    </div>
  )
}

// ─── Payout Schedule Card ─────────────────────────────────────────────────────

function PayoutScheduleCard() {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200 bg-zinc-50">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-zinc-500" />
          <span className="text-sm font-bold text-zinc-900">Payout Schedule</span>
        </div>
      </div>
      <div className="divide-y divide-zinc-100">
        {PAYOUT_SETTINGS.map(({ label, value, icon: Icon }) => (
          <div key={label} className="flex items-center justify-between px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-zinc-100 flex items-center justify-center shrink-0">
                <Icon className="h-3.5 w-3.5 text-zinc-500" />
              </div>
              <div>
                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">
                  {label}
                </p>
                <p className="text-sm font-medium text-zinc-900 mt-0.5">{value}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </div>
      <div className="px-5 py-3 border-t border-zinc-100 bg-zinc-50/50">
        <div className="flex items-start gap-2">
          <Info className="h-3.5 w-3.5 text-zinc-400 mt-0.5 shrink-0" />
          <p className="text-[11px] text-zinc-500 leading-relaxed">
            Engineers can choose to accumulate earnings in their platform wallet and withdraw at any
            time, or receive automatic weekly bank transfers if balance exceeds the minimum
            threshold.
          </p>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SplitRulesPage() {
  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Revenue Split Rules</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            Configure how job revenue is distributed between platform, engineers, and the business
          </p>
        </div>
      </div>

      {/* Default rule */}
      <DefaultRuleCard />

      {/* Overrides table */}
      <OverridesSection />

      {/* Payout schedule */}
      <PayoutScheduleCard />

      <Separator />
      <div className="flex items-center justify-between text-[11px] text-zinc-400 pb-2">
        <span>Ironheart Platform — Finance Module</span>
        <span>All data hardcoded for mockup purposes</span>
      </div>
    </div>
  )
}
