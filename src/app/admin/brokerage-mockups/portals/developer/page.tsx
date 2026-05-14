"use client"

import Link from "next/link"
import {
  Eye,
  ChevronRight,
  CheckCircle2,
  Download,
  FileText,
  ArrowRight,
  Building2,
  Leaf,
} from "lucide-react"

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const CERTIFICATE_ROWS = [
  { label: "Developer",                value: "Taylor Wimpey plc" },
  { label: "Development site",         value: "200-home scheme, Eastleigh, Hampshire" },
  { label: "Local Planning Authority", value: "Eastleigh Borough Council" },
  { label: "BNG requirement",          value: "30 biodiversity units (off-site)" },
  { label: "Gain site",                value: "Whiteley Farm" },
  { label: "BGS reference",            value: "BGS-SOL-2024-0847", mono: true },
  { label: "Units allocated",          value: "30 kg/yr nitrogen credits" },
  { label: "Agreement type",           value: "S106" },
  { label: "Legal agreement signed",   value: "14 January 2026" },
  { label: "Management period",        value: "30 years (to 2056)" },
  { label: "Natural England registered", value: "✓", highlight: true },
]

const DOCUMENTS = [
  {
    name: "S106 Agreement",
    detail: "Signed",
    format: "PDF",
    tag: "Required for planning",
    tagColor: "bg-red-50 border-red-200 text-red-700",
  },
  {
    name: "NE Credit Certificate",
    detail: "Issued",
    format: "PDF",
    tag: "Required for planning",
    tagColor: "bg-red-50 border-red-200 text-red-700",
  },
  {
    name: "Site Registration Certificate",
    detail: "BGS-SOL-2024-0847",
    format: "PDF",
    tag: null,
    tagColor: "",
  },
  {
    name: "Habitat Management Plan v1.0",
    detail: "Approved",
    format: "PDF",
    tag: null,
    tagColor: "",
  },
]

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function CertRow({ label, value, mono, highlight }: {
  label: string
  value: string
  mono?: boolean
  highlight?: boolean
}) {
  return (
    <tr className="border-b border-border/40 last:border-0">
      <td className="py-3 pr-6 text-xs text-muted-foreground whitespace-nowrap align-top w-48">{label}</td>
      <td className={`py-3 text-sm align-top ${mono ? "font-mono" : "font-medium"} ${highlight ? "text-emerald-700 font-semibold" : "text-foreground"}`}>
        {value}
      </td>
    </tr>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function DeveloperEvidencePortalPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-6 space-y-6">
      {/* Preview banner */}
      <div className="rounded-xl border border-amber-300 bg-amber-50 px-5 py-3.5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Eye className="w-4 h-4 text-amber-600 shrink-0" />
          <p className="text-sm font-medium text-amber-800">
            Preview mode — This is the Developer Evidence Portal
          </p>
          <p className="text-sm text-amber-700 hidden sm:block">
            Available from Q2 2026
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
        <span className="text-foreground font-medium">Developer Evidence Portal</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">
            BNG Compliance Certificate
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Deal D-0038</h1>
          <p className="text-sm text-muted-foreground mt-1">Taylor Wimpey plc · Eastleigh, Hampshire</p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-lg border bg-emerald-50 border-emerald-200 px-4 py-2 text-sm font-bold text-emerald-700 whitespace-nowrap shrink-0">
          <CheckCircle2 className="w-4 h-4" />
          Planning Evidence Ready
        </span>
      </div>

      {/* Certificate card */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {/* Certificate header strip */}
        <div className="bg-gradient-to-r from-emerald-700 to-emerald-600 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <Leaf className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xs font-semibold text-emerald-100 uppercase tracking-wider">
                Ironheart BNG Brokerage
              </p>
              <p className="text-base font-bold text-white">Nutrient Credit Certificate</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-emerald-200">Issued</p>
            <p className="text-sm font-semibold text-white">14 January 2026</p>
          </div>
        </div>

        {/* Certificate body */}
        <div className="px-6 py-4">
          <table className="w-full">
            <tbody>
              {CERTIFICATE_ROWS.map((row) => (
                <CertRow
                  key={row.label}
                  label={row.label}
                  value={row.value}
                  mono={row.mono}
                  highlight={row.highlight}
                />
              ))}
            </tbody>
          </table>
        </div>

        {/* Certificate footer */}
        <div className="px-6 py-3 border-t border-border/50 bg-muted/30 flex items-center justify-between text-xs text-muted-foreground">
          <span>This certificate confirms the allocation of nutrient credits under the Solent Nutrient Neutrality scheme.</span>
          <span className="font-mono whitespace-nowrap ml-4">NC-SOL-2026-D0038</span>
        </div>
      </div>

      {/* Unit allocation breakdown */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border/50">
          <h2 className="font-semibold text-foreground">Unit Allocation Breakdown</h2>
        </div>
        <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Nitrogen credits</span>
              <span className="font-semibold text-foreground">30 kg/yr</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Source site</span>
              <span className="font-medium text-foreground">Whiteley Farm</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Catchment</span>
              <span className="font-medium text-foreground">Solent</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Credit certificate</span>
              <span className="font-mono text-xs text-foreground bg-muted px-2 py-0.5 rounded">NC-SOL-2026-D0038</span>
            </div>
          </div>
          <div className="bg-muted/40 rounded-xl border border-border p-4 flex flex-col items-center justify-center gap-2 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-emerald-600" />
            </div>
            <p className="text-sm font-semibold text-foreground">Credits verified</p>
            <p className="text-xs text-muted-foreground">
              Natural England registered · Solent Catchment
            </p>
          </div>
        </div>
      </div>

      {/* Documents for planning submission */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border/50">
          <h2 className="font-semibold text-foreground">Documents for Planning Submission</h2>
          <p className="text-xs text-muted-foreground mt-0.5">All documents required for your planning application</p>
        </div>
        <div className="divide-y divide-border/50">
          {DOCUMENTS.map((doc) => (
            <div key={doc.name} className="px-5 py-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-foreground">{doc.name}</p>
                    {doc.tag && (
                      <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-semibold ${doc.tagColor}`}>
                        {doc.tag}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{doc.detail} · {doc.format}</p>
                </div>
              </div>
              <button className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 hover:text-emerald-800 transition-colors shrink-0">
                <Download className="w-4 h-4" />
                Download
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Action bar */}
      <div className="bg-card border border-border rounded-xl px-5 py-5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-center sm:text-left">
          <p className="text-sm font-semibold text-foreground">Ready to submit to your LPA?</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Eastleigh Borough Council planning portal integration — Coming Q2 2026
          </p>
        </div>
        <button
          disabled
          className="flex items-center gap-2 rounded-lg bg-emerald-600/40 text-white font-semibold px-6 py-2.5 text-sm cursor-not-allowed opacity-60 shrink-0"
        >
          Submit to Local Planning Authority
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
