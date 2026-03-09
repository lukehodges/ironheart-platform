"use client"

import Link from "next/link"
import {
  Eye,
  ChevronRight,
  CheckCircle2,
  Clock,
  FileText,
  Download,
  AlertCircle,
  Leaf,
} from "lucide-react"

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const DEALS = [
  {
    ref: "D-0038",
    developer: "Taylor Wimpey plc",
    units: "30 kg/yr",
    value: "£60,000",
    status: "Payment received",
  },
]

const DOCUMENTS = [
  { name: "S106 Agreement",                    status: "Signed",   date: "14 Jan 2026" },
  { name: "Conservation Covenant",             status: "Signed",   date: "14 Jan 2026" },
  { name: "Habitat Management and Monitoring Plan v1.0", status: "Approved", date: "20 Jan 2026" },
]

const OBLIGATIONS = [
  { name: "Annual habitat survey",  due: "Dec 2026", progress: "Not yet started" },
  { name: "HMMP Year 1 review",     due: "Jan 2027", progress: "Not yet started" },
]

const TOTAL_KG = 48.2
const ALLOCATED_KG = 30
const AVAILABLE_KG = TOTAL_KG - ALLOCATED_KG
const ALLOC_PCT = Math.round((ALLOCATED_KG / TOTAL_KG) * 100)
const AVAIL_PCT = 100 - ALLOC_PCT

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SummaryCard({ label, value, sub, badge, icon }: {
  label: string
  value: string
  sub?: string
  badge?: { text: string; color: string }
  icon?: React.ReactNode
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-5 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
        {icon && <span className="text-muted-foreground">{icon}</span>}
      </div>
      <div className="flex items-end gap-2 flex-wrap">
        <span className="text-xl font-bold tracking-tight text-foreground leading-none">{value}</span>
        {badge && (
          <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold ${badge.color}`}>
            {badge.text}
          </span>
        )}
      </div>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function LandownerPortalPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-6 space-y-6">
      {/* Preview banner */}
      <div className="rounded-xl border border-amber-300 bg-amber-50 px-5 py-3.5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Eye className="w-4 h-4 text-amber-600 shrink-0" />
          <p className="text-sm font-medium text-amber-800">
            Preview mode — This is the Landowner Portal view
          </p>
          <p className="text-sm text-amber-700 hidden sm:block">
            Available to landowners from Q2 2026
          </p>
        </div>
        <span className="inline-flex items-center rounded-full border border-amber-400 bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700 whitespace-nowrap">
          Coming Q2 2026
        </span>
      </div>

      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/admin/brokerage-mockups/dashboard" className="hover:text-foreground transition-colors">
          Dashboard
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground font-medium">Landowner Portal</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Welcome back, Robert Whiteley</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Whiteley Farm · Solent Catchment · BGS-SOL-2024-0847
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">Last login: Today, 9:14 AM</p>
        </div>
        <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
          <span className="text-lg font-bold text-emerald-700">RW</span>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SummaryCard
          label="Your site"
          value="Whiteley Farm"
          badge={{ text: "Active", color: "bg-emerald-50 text-emerald-700 border-emerald-200" }}
          icon={<Leaf className="w-5 h-5" />}
        />
        <SummaryCard
          label="Credits available"
          value="18.2 kg/yr"
          sub="Nitrogen credits · Solent catchment"
          icon={<CheckCircle2 className="w-5 h-5" />}
        />
        <SummaryCard
          label="Next obligation"
          value="Annual Survey"
          sub="Due Dec 2026"
          icon={<Clock className="w-5 h-5" />}
        />
      </div>

      {/* Site status card */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border/50 flex items-center justify-between">
          <h2 className="font-semibold text-foreground">Site Status</h2>
          <span className="inline-flex items-center gap-1.5 rounded-md border bg-emerald-50 border-emerald-200 px-2.5 py-1 text-sm font-semibold text-emerald-700">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Active
          </span>
        </div>
        <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
          <div className="space-y-3">
            <Row label="Site name"       value="Whiteley Farm" />
            <Row label="BGS Reference"   value="BGS-SOL-2024-0847" mono />
            <Row label="Registered"      value="14 Jan 2026" />
            <Row label="Agreement type"  value="S106 / Conservation Covenant" />
            <Row label="Management period" value="30 years (to 2056)" />
            <Row label="Credit type"     value="Nitrogen Credits" />
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Credit capacity
              </p>
              <div className="space-y-2">
                <div className="h-3 bg-muted rounded-full overflow-hidden flex">
                  <div className="h-full bg-blue-400 transition-all" style={{ width: `${ALLOC_PCT}%` }} />
                  <div className="h-full bg-emerald-400 transition-all" style={{ width: `${AVAIL_PCT}%` }} />
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <p className="text-muted-foreground">Total</p>
                    <p className="font-semibold text-foreground">{TOTAL_KG} kg/yr</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Allocated</p>
                    <p className="font-semibold text-blue-700">{ALLOCATED_KG} kg/yr ({ALLOC_PCT}%)</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Available</p>
                    <p className="font-semibold text-emerald-700">{AVAILABLE_KG} kg/yr ({AVAIL_PCT}%)</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Your deals */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border/50">
          <h2 className="font-semibold text-foreground">Your Deals</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/50 bg-muted/50">
              <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Deal</th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Developer</th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Units</th>
              <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Value</th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {DEALS.map((deal) => (
              <tr key={deal.ref} className="hover:bg-muted/30 transition-colors">
                <td className="px-5 py-3.5">
                  <span className="font-mono text-xs text-muted-foreground">{deal.ref}</span>
                </td>
                <td className="px-4 py-3.5 font-medium text-foreground">{deal.developer}</td>
                <td className="px-4 py-3.5 text-muted-foreground">{deal.units}</td>
                <td className="px-4 py-3.5 text-right font-semibold text-foreground">{deal.value}</td>
                <td className="px-4 py-3.5">
                  <span className="inline-flex items-center gap-1.5 rounded-md border bg-emerald-50 border-emerald-200 px-2 py-0.5 text-xs font-medium text-emerald-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    {deal.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Payment history */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border/50">
          <h2 className="font-semibold text-foreground">Payment History</h2>
        </div>
        <div className="divide-y divide-border/50">
          <div className="px-5 py-4 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">Credit sale — Deal D-0038</p>
              <p className="text-xs text-muted-foreground">15 Jan 2026</p>
            </div>
            <span className="text-base font-bold text-emerald-700">£60,000</span>
          </div>
        </div>
      </div>

      {/* Documents */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border/50">
          <h2 className="font-semibold text-foreground">Your Documents</h2>
        </div>
        <div className="divide-y divide-border/50">
          {DOCUMENTS.map((doc) => (
            <div key={doc.name} className="px-5 py-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{doc.name}</p>
                  <p className="text-xs text-muted-foreground">{doc.date}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${
                  doc.status === "Signed"   ? "bg-emerald-50 border-emerald-200 text-emerald-700" :
                  doc.status === "Approved" ? "bg-blue-50 border-blue-200 text-blue-700" :
                  "bg-muted border-border text-muted-foreground"
                }`}>
                  {doc.status}
                </span>
                <button className="text-muted-foreground hover:text-foreground transition-colors">
                  <Download className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Upcoming obligations */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border/50">
          <h2 className="font-semibold text-foreground">Upcoming Obligations</h2>
        </div>
        <div className="divide-y divide-border/50">
          {OBLIGATIONS.map((obl) => (
            <div key={obl.name} className="px-5 py-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
                  <AlertCircle className="w-4 h-4 text-amber-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{obl.name}</p>
                  <p className="text-xs text-muted-foreground">Due {obl.due}</p>
                </div>
              </div>
              <span className="inline-flex items-center rounded-md border bg-muted border-border px-2 py-0.5 text-xs font-medium text-muted-foreground">
                {obl.progress}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Row helper
// ---------------------------------------------------------------------------

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-xs text-muted-foreground whitespace-nowrap">{label}</span>
      <span className={`text-xs font-medium text-foreground text-right ${mono ? "font-mono" : ""}`}>{value}</span>
    </div>
  )
}
