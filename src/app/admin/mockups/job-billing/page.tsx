"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
import {
  ChevronRight,
  CheckCircle2,
  Clock,
  Package,
  FileText,
  Send,
  PoundSterling,
  User,
  Info,
  Save,
  CalendarDays,
  ToggleLeft,
  ToggleRight,
  Pencil,
} from "lucide-react"

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const TIME_ENTRIES = [
  {
    resource: "Sarah Chen",
    initials: "SC",
    clockIn: "09:47",
    clockOut: "12:33",
    duration: "2h 46m",
    durationHours: 2 + 46 / 60,
    rate: 45,
    amount: 124.5,
  },
]

const MATERIALS = [
  { id: 1, name: "Fernox F1 Inhibitor 500ml", qty: 1, unit: 12.5, total: 12.5 },
  { id: 2, name: "PTFE Tape", qty: 2, unit: 1.2, total: 2.4 },
  { id: 3, name: "Boiler Pressure Relief Valve", qty: 1, unit: 38.0, total: 38.0 },
  { id: 4, name: "Gas Pipe Fittings (x4)", qty: 4, unit: 3.75, total: 15.0 },
]

const LABOUR_TOTAL = 124.5
const MATERIALS_TOTAL = 67.9
const JOB_TOTAL = LABOUR_TOTAL + MATERIALS_TOTAL // 192.40

const SPLIT_LINES = [
  {
    label: "Platform Fee",
    description: "Fixed charge",
    amount: 25.0,
    pct: 13.0,
    color: "bg-violet-500",
  },
  {
    label: "Travel Cost",
    description: "8 miles lookup",
    amount: 3.6,
    pct: 1.9,
    color: "bg-blue-400",
  },
  {
    label: "Engineer Commission",
    description: "35% of job total",
    amount: 67.36,
    pct: 35.0,
    color: "bg-emerald-500",
  },
  {
    label: "Business Share",
    description: "Remainder",
    amount: 96.44,
    pct: 50.1,
    color: "bg-zinc-400",
  },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmtGBP(val: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 2,
  }).format(val)
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function Breadcrumb() {
  return (
    <nav className="flex items-center gap-1.5 text-xs text-zinc-400">
      <span className="hover:text-zinc-600 cursor-pointer transition-colors">Admin</span>
      <ChevronRight className="h-3 w-3" />
      <span className="hover:text-zinc-600 cursor-pointer transition-colors">Jobs</span>
      <ChevronRight className="h-3 w-3" />
      <span className="hover:text-zinc-600 cursor-pointer transition-colors">#J-0891</span>
      <ChevronRight className="h-3 w-3" />
      <span className="text-zinc-700 font-medium">Billing</span>
    </nav>
  )
}

function SectionHeader({
  icon: Icon,
  title,
  total,
}: {
  icon: React.ElementType
  title: string
  total?: number
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 bg-zinc-50">
      <div className="flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 text-zinc-500" />
        <span className="text-xs font-bold text-zinc-600 uppercase tracking-wide">{title}</span>
      </div>
      {total !== undefined && (
        <span className="text-xs font-bold text-zinc-800 tabular-nums">{fmtGBP(total)}</span>
      )}
    </div>
  )
}

function TimeEntriesTable() {
  return (
    <div className="rounded-xl border border-zinc-200 overflow-hidden bg-white">
      <SectionHeader icon={Clock} title="Time Entries" total={LABOUR_TOTAL} />
      <Table>
        <TableHeader>
          <TableRow className="bg-white hover:bg-white">
            <TableHead className="text-[11px] text-zinc-400 font-semibold py-2.5">Resource</TableHead>
            <TableHead className="text-[11px] text-zinc-400 font-semibold py-2.5">Start</TableHead>
            <TableHead className="text-[11px] text-zinc-400 font-semibold py-2.5">End</TableHead>
            <TableHead className="text-[11px] text-zinc-400 font-semibold py-2.5">Duration</TableHead>
            <TableHead className="text-[11px] text-zinc-400 font-semibold py-2.5 text-right">Rate</TableHead>
            <TableHead className="text-[11px] text-zinc-400 font-semibold py-2.5 text-right">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {TIME_ENTRIES.map((e, i) => (
            <TableRow key={i}>
              <TableCell className="py-3">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-full bg-zinc-900 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                    {e.initials}
                  </div>
                  <span className="text-sm font-medium text-zinc-900">{e.resource}</span>
                </div>
              </TableCell>
              <TableCell className="text-sm text-zinc-700 py-3 tabular-nums">{e.clockIn}</TableCell>
              <TableCell className="text-sm text-zinc-700 py-3 tabular-nums">{e.clockOut}</TableCell>
              <TableCell className="py-3">
                <Badge className="bg-zinc-100 text-zinc-700 border-zinc-200 text-xs font-medium border">
                  {e.duration}
                </Badge>
              </TableCell>
              <TableCell className="text-sm text-zinc-500 py-3 text-right tabular-nums">
                £{e.rate}/hr
              </TableCell>
              <TableCell className="text-sm font-bold text-zinc-900 py-3 text-right tabular-nums">
                {fmtGBP(e.amount)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function MaterialsTable() {
  return (
    <div className="rounded-xl border border-zinc-200 overflow-hidden bg-white">
      <SectionHeader icon={Package} title="Materials" total={MATERIALS_TOTAL} />
      <Table>
        <TableHeader>
          <TableRow className="bg-white hover:bg-white">
            <TableHead className="text-[11px] text-zinc-400 font-semibold py-2.5">Item</TableHead>
            <TableHead className="text-[11px] text-zinc-400 font-semibold py-2.5 text-right">Unit Price</TableHead>
            <TableHead className="text-[11px] text-zinc-400 font-semibold py-2.5 text-center">Qty</TableHead>
            <TableHead className="text-[11px] text-zinc-400 font-semibold py-2.5 text-right">Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {MATERIALS.map((m) => (
            <TableRow key={m.id}>
              <TableCell className="text-sm font-medium text-zinc-900 py-3">{m.name}</TableCell>
              <TableCell className="text-sm text-zinc-500 py-3 text-right tabular-nums">{fmtGBP(m.unit)}</TableCell>
              <TableCell className="text-sm text-zinc-600 py-3 text-center tabular-nums">{m.qty}</TableCell>
              <TableCell className="text-sm font-semibold text-zinc-900 py-3 text-right tabular-nums">{fmtGBP(m.total)}</TableCell>
            </TableRow>
          ))}
          <TableRow className="bg-zinc-50 hover:bg-zinc-50">
            <TableCell colSpan={3} className="text-xs font-bold text-zinc-600 py-2.5 pl-4">Materials total</TableCell>
            <TableCell className="text-sm font-bold text-zinc-900 py-2.5 text-right tabular-nums">{fmtGBP(MATERIALS_TOTAL)}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  )
}

function LineSummaryCard() {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
      <SectionHeader icon={FileText} title="Line Items Summary" />
      <div className="px-5 py-4 space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-zinc-500">Labour subtotal</span>
          <span className="text-zinc-700 font-semibold tabular-nums">{fmtGBP(LABOUR_TOTAL)}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-zinc-500">Materials subtotal</span>
          <span className="text-zinc-700 font-semibold tabular-nums">{fmtGBP(MATERIALS_TOTAL)}</span>
        </div>
        <Separator className="my-1" />
        <div className="flex items-center justify-between">
          <span className="text-base font-bold text-zinc-900">Job Total</span>
          <span className="text-xl font-bold text-zinc-900 tabular-nums">{fmtGBP(JOB_TOTAL)}</span>
        </div>
        <div className="rounded-lg bg-zinc-50 border border-zinc-200 px-3 py-2 flex items-start gap-2 mt-1">
          <Info className="h-3.5 w-3.5 text-zinc-400 mt-0.5 shrink-0" />
          <p className="text-[11px] text-zinc-500 leading-relaxed">
            Split engine will apply platform fee, travel cost, engineer commission, and business share to this total.
          </p>
        </div>
      </div>
    </div>
  )
}

function SplitPreviewCard() {
  const totalCheck = SPLIT_LINES.reduce((s, l) => s + l.amount, 0)
  const checksOut = Math.abs(totalCheck - JOB_TOTAL) < 0.01

  return (
    <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
      <div className="px-5 py-4 border-b border-zinc-200 bg-zinc-900">
        <div className="flex items-center gap-2">
          <PoundSterling className="h-4 w-4 text-zinc-300" />
          <span className="text-sm font-bold text-white">Revenue Distribution</span>
        </div>
        <p className="text-xs text-zinc-400 mt-0.5">
          Split engine preview — {fmtGBP(JOB_TOTAL)} job total
        </p>
      </div>

      {/* Proportion bar */}
      <div className="px-5 pt-4 pb-2">
        <div className="flex rounded-full overflow-hidden h-3 gap-px">
          {SPLIT_LINES.map((line) => (
            <div
              key={line.label}
              className={cn("h-full transition-all", line.color)}
              style={{ width: `${line.pct}%` }}
              title={`${line.label}: ${line.pct}%`}
            />
          ))}
        </div>
        <div className="flex items-center justify-between mt-1.5 flex-wrap gap-x-3 gap-y-0.5">
          {SPLIT_LINES.map((line) => (
            <div key={line.label} className="flex items-center gap-1">
              <div className={cn("h-2 w-2 rounded-full shrink-0", line.color)} />
              <span className="text-[10px] text-zinc-500">{line.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Lines */}
      <div className="px-5 pb-4 space-y-1 mt-1">
        {SPLIT_LINES.map((line) => (
          <div key={line.label} className="flex items-center justify-between py-1.5 border-b border-zinc-100 last:border-0">
            <div className="flex items-center gap-2">
              <div className={cn("h-2.5 w-2.5 rounded-full shrink-0", line.color)} />
              <div>
                <p className="text-sm font-medium text-zinc-900">{line.label}</p>
                <p className="text-[11px] text-zinc-400">{line.description}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-zinc-900 tabular-nums">{fmtGBP(line.amount)}</p>
              <p className="text-[11px] text-zinc-400 tabular-nums">{line.pct}%</p>
            </div>
          </div>
        ))}

        {/* Check row */}
        <div className="flex items-center justify-between pt-2 mt-1 border-t border-zinc-200">
          <div className="flex items-center gap-1.5">
            {checksOut ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            ) : (
              <Info className="h-4 w-4 text-red-500" />
            )}
            <span className="text-xs font-semibold text-zinc-700">Total check</span>
          </div>
          <span className={cn("text-sm font-bold tabular-nums", checksOut ? "text-emerald-600" : "text-red-600")}>
            {fmtGBP(totalCheck)} {checksOut ? "✓" : "✗"}
          </span>
        </div>
      </div>
    </div>
  )
}

function InvoiceSettingsCard() {
  const [vatEnabled, setVatEnabled] = useState(false)
  const [billTo, setBillTo] = useState("Mr Johnson")
  const [notes, setNotes] = useState("")

  const vatAmount = vatEnabled ? Math.round(JOB_TOTAL * 0.2 * 100) / 100 : 0
  const invoiceTotal = JOB_TOTAL + vatAmount

  return (
    <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
      <div className="px-5 py-4 border-b border-zinc-200 bg-zinc-50">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-zinc-500" />
          <span className="text-sm font-bold text-zinc-900">Invoice Settings</span>
        </div>
      </div>
      <div className="px-5 py-4 space-y-4">
        {/* Bill to */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-500 flex items-center gap-1.5">
            <User className="h-3 w-3" />
            Bill To
          </label>
          <div className="flex items-center gap-2 h-9 rounded-lg border border-zinc-200 px-3 bg-white focus-within:ring-2 focus-within:ring-zinc-900 focus-within:border-transparent transition-all">
            <input
              value={billTo}
              onChange={(e) => setBillTo(e.target.value)}
              className="flex-1 text-sm text-zinc-900 bg-transparent focus:outline-none"
            />
            <Pencil className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
          </div>
        </div>

        {/* Invoice date / due date */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-500">Invoice Date</label>
            <div className="h-9 rounded-lg border border-zinc-200 px-3 flex items-center text-sm text-zinc-700 bg-zinc-50">
              11 Apr 2026
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-500">Due Date</label>
            <div className="h-9 rounded-lg border border-zinc-200 px-3 flex items-center text-sm text-zinc-700 bg-zinc-50">
              25 Apr 2026
            </div>
          </div>
        </div>

        <div className="text-[11px] text-zinc-400 -mt-2">Payment terms: 14 days</div>

        {/* VAT toggle */}
        <div className="flex items-center justify-between py-2 border-t border-zinc-100">
          <div>
            <p className="text-sm font-semibold text-zinc-800">VAT 20%</p>
            <p className="text-[11px] text-zinc-400">
              {vatEnabled ? `Adds ${fmtGBP(vatAmount)} — total ${fmtGBP(invoiceTotal)}` : "Not applied"}
            </p>
          </div>
          <button
            onClick={() => setVatEnabled(!vatEnabled)}
            className="text-zinc-700 hover:text-zinc-900 transition-colors"
          >
            {vatEnabled ? (
              <ToggleRight className="h-7 w-7 text-zinc-900" />
            ) : (
              <ToggleLeft className="h-7 w-7 text-zinc-400" />
            )}
          </button>
        </div>

        {/* Invoice total */}
        <div className="rounded-lg bg-zinc-50 border border-zinc-200 px-4 py-3 flex items-center justify-between">
          <span className="text-sm font-bold text-zinc-700">Invoice Total</span>
          <span className="text-xl font-bold text-zinc-900 tabular-nums">{fmtGBP(invoiceTotal)}</span>
        </div>

        {/* Notes */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-500">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Add invoice notes or payment instructions..."
            className="w-full rounded-lg border border-zinc-200 bg-white p-2.5 text-xs text-zinc-700 placeholder:text-zinc-400 resize-none focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
          />
        </div>

        {/* Actions */}
        <div className="space-y-2 pt-1">
          <Button className="w-full h-12 bg-zinc-900 hover:bg-zinc-700 text-white font-bold text-sm rounded-xl flex items-center gap-2">
            <Send className="h-4 w-4" />
            Generate Invoice
          </Button>
          <Button
            variant="outline"
            className="w-full h-10 border-zinc-200 text-zinc-600 font-medium text-sm rounded-xl flex items-center gap-2 hover:bg-zinc-50"
          >
            <Save className="h-4 w-4" />
            Save Draft
          </Button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function JobBillingPage() {
  return (
    <div className="space-y-6 animate-fade-in max-w-screen-xl mx-auto">
      <Breadcrumb />

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 mb-1.5 flex-wrap">
            <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">
              Boiler Service &amp; Safety Inspection
            </h1>
            <Badge className="bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wide">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Completed
            </Badge>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm text-zinc-600 font-medium">#J-0891</span>
            <span className="text-zinc-300">·</span>
            <span className="text-sm text-zinc-500 flex items-center gap-1">
              <User className="h-3.5 w-3.5" />
              Mr Johnson
            </span>
            <span className="text-zinc-300">·</span>
            <span className="text-sm text-zinc-500 flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5" />
              11 Apr 2026
            </span>
            <span className="text-zinc-300">·</span>
            <span className="text-sm text-zinc-500 flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              09:47 – 12:33 (2h 46m)
            </span>
          </div>
        </div>
        <Button className="h-10 px-5 bg-zinc-900 hover:bg-zinc-700 text-white font-bold text-sm rounded-xl flex items-center gap-2 shrink-0">
          <Send className="h-4 w-4" />
          Generate Invoice
        </Button>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left: detail tables */}
        <div className="xl:col-span-2 space-y-5">
          <TimeEntriesTable />
          <MaterialsTable />
          <LineSummaryCard />
        </div>

        {/* Right: split + invoice settings */}
        <div className="xl:col-span-1 space-y-5">
          <SplitPreviewCard />
          <InvoiceSettingsCard />
        </div>
      </div>

      <Separator />
      <div className="flex items-center justify-between text-[11px] text-zinc-400 pb-2">
        <span>Ironheart Platform — Jobs Module</span>
        <span>All data hardcoded for mockup purposes</span>
      </div>
    </div>
  )
}
