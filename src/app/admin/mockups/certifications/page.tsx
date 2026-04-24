"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import {
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  Clock,
  XCircle,
  FileText,
  Upload,
  Plus,
  RefreshCw,
  CalendarDays,
  ShieldCheck,
  ShieldAlert,
  ChevronDown,
  CircleDashed,
  AlertCircle,
  Briefcase,
} from "lucide-react"

// ---------------------------------------------------------------------------
// Types & Data
// ---------------------------------------------------------------------------

type CertStatus = "VALID" | "EXPIRING_SOON" | "EXPIRED" | "PENDING"

interface Cert {
  id: number
  name: string
  number?: string
  issued?: string
  expires?: string
  status: CertStatus
  daysNote?: string // e.g. "65 days remaining" or "Expired 182 days ago"
  blocksJobType?: string
  pendingNote?: string
}

const CERTS: Cert[] = [
  {
    id: 1,
    name: "Gas Safe Registration",
    number: "#123456789",
    issued: "1 Apr 2025",
    expires: "31 Mar 2026",
    status: "EXPIRED",
    daysNote: "Expired 12 days ago",
    blocksJobType: "gas jobs",
  },
  {
    id: 2,
    name: "Gas Safe Registration (Renewal)",
    status: "PENDING",
    pendingNote: "Uploaded 5 Apr 2026 — awaiting verification",
  },
  {
    id: 3,
    name: "First Aid at Work",
    issued: "15 Jun 2023",
    expires: "15 Jun 2026",
    status: "EXPIRING_SOON",
    daysNote: "65 days remaining",
  },
  {
    id: 4,
    name: "Legionella Risk Assessment",
    issued: "1 Jan 2024",
    expires: "1 Jan 2027",
    status: "VALID",
    daysNote: "265 days remaining",
  },
  {
    id: 5,
    name: "OFTEC Oil Boiler",
    issued: "1 Mar 2022",
    expires: "1 Mar 2027",
    status: "VALID",
    daysNote: "324 days remaining",
  },
  {
    id: 6,
    name: "Working at Height",
    issued: "10 Oct 2024",
    expires: "10 Oct 2025",
    status: "EXPIRED",
    daysNote: "Expired 182 days ago",
  },
]

const BLOCKED_JOBS = [
  { ref: "J-0903", title: "Gas Boiler Annual Service — Mrs Patel", date: "14 Apr 2026" },
  { ref: "J-0905", title: "Combi Boiler Replacement — Mr Davies", date: "17 Apr 2026" },
  { ref: "J-0911", title: "Gas Safety Certificate — Mrs O'Brien", date: "22 Apr 2026" },
]

const CERT_TYPES = [
  "Gas Safe Registration",
  "First Aid at Work",
  "Legionella Risk Assessment",
  "OFTEC Oil Boiler",
  "Working at Height",
  "CSCS Card",
  "IPAF (Powered Access)",
  "Asbestos Awareness",
  "PASMA (Scaffolding)",
  "DBS Check",
  "Other",
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function statusConfig(status: CertStatus) {
  switch (status) {
    case "VALID":
      return {
        label: "Valid",
        badgeClass: "bg-emerald-100 text-emerald-700 border-emerald-200",
        cardClass: "border-zinc-200",
        iconClass: "text-emerald-500",
        bgClass: "bg-emerald-50",
        Icon: CheckCircle2,
      }
    case "EXPIRING_SOON":
      return {
        label: "Expiring Soon",
        badgeClass: "bg-amber-100 text-amber-700 border-amber-200",
        cardClass: "border-amber-300 bg-amber-50/30",
        iconClass: "text-amber-500",
        bgClass: "bg-amber-50",
        Icon: Clock,
      }
    case "EXPIRED":
      return {
        label: "Expired",
        badgeClass: "bg-red-100 text-red-700 border-red-200",
        cardClass: "border-red-300 bg-red-50/30",
        iconClass: "text-red-500",
        bgClass: "bg-red-50",
        Icon: XCircle,
      }
    case "PENDING":
      return {
        label: "Under Review",
        badgeClass: "bg-blue-100 text-blue-700 border-blue-200",
        cardClass: "border-blue-300 bg-blue-50/30",
        iconClass: "text-blue-500",
        bgClass: "bg-blue-50",
        Icon: CircleDashed,
      }
  }
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function Breadcrumb() {
  return (
    <nav className="flex items-center gap-1.5 text-xs text-zinc-400 mb-1">
      <span className="hover:text-zinc-600 cursor-pointer transition-colors">Admin</span>
      <ChevronRight className="h-3 w-3" />
      <span className="hover:text-zinc-600 cursor-pointer transition-colors">Resources</span>
      <ChevronRight className="h-3 w-3" />
      <span className="hover:text-zinc-600 cursor-pointer transition-colors">Sarah Chen</span>
      <ChevronRight className="h-3 w-3" />
      <span className="text-zinc-700 font-medium">Certifications</span>
    </nav>
  )
}

function WarningBanner() {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3.5 flex items-start gap-3">
      <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
      <div className="text-sm">
        <p className="font-semibold text-amber-800">
          1 certification expired — Sarah Chen cannot be assigned to gas jobs until Gas Safe is renewed
        </p>
        <p className="text-amber-700 mt-0.5 text-xs">
          A renewal is pending review. 3 upcoming gas jobs are currently blocked.
        </p>
      </div>
    </div>
  )
}

function KpiRow() {
  const kpis = [
    { label: "Valid", value: 3, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200" },
    { label: "Expired", value: 2, color: "text-red-600", bg: "bg-red-50", border: "border-red-200" },
    { label: "Expiring <90d", value: 1, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200" },
    { label: "Pending", value: 1, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200" },
  ]

  return (
    <div className="grid grid-cols-4 gap-3">
      {kpis.map((k) => (
        <div
          key={k.label}
          className={cn(
            "rounded-xl border p-4 text-center",
            k.bg,
            k.border,
          )}
        >
          <div className={cn("text-2xl font-bold tabular-nums", k.color)}>{k.value}</div>
          <div className="text-[11px] text-zinc-500 font-medium mt-0.5 leading-tight">{k.label}</div>
        </div>
      ))}
    </div>
  )
}

function CertCard({ cert }: { cert: Cert }) {
  const cfg = statusConfig(cert.status)
  const { Icon } = cfg

  return (
    <div className={cn("rounded-xl border bg-white p-5 transition-all", cfg.cardClass)}>
      <div className="flex items-start justify-between gap-4">
        {/* Left content */}
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div
            className={cn(
              "mt-0.5 h-9 w-9 rounded-xl flex items-center justify-center shrink-0",
              cfg.bgClass,
            )}
          >
            <Icon className={cn("h-4 w-4", cfg.iconClass)} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-semibold text-zinc-900 leading-tight">{cert.name}</h3>
              <Badge
                className={cn(
                  "text-[10px] font-bold border px-2 py-0 rounded-full",
                  cfg.badgeClass,
                )}
              >
                {cfg.label}
              </Badge>
            </div>

            {cert.number && (
              <p className="text-xs text-zinc-400 mt-0.5 font-mono">{cert.number}</p>
            )}

            {cert.pendingNote && (
              <p className="text-xs text-blue-600 mt-1 font-medium">{cert.pendingNote}</p>
            )}

            {(cert.issued || cert.expires) && (
              <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1">
                {cert.issued && (
                  <div>
                    <p className="text-[10px] text-zinc-400 uppercase tracking-wide font-medium">Issued</p>
                    <p className="text-xs text-zinc-700 font-medium">{cert.issued}</p>
                  </div>
                )}
                {cert.expires && (
                  <div>
                    <p className="text-[10px] text-zinc-400 uppercase tracking-wide font-medium">Expires</p>
                    <p
                      className={cn(
                        "text-xs font-medium",
                        cert.status === "EXPIRED"
                          ? "text-red-600"
                          : cert.status === "EXPIRING_SOON"
                            ? "text-amber-600"
                            : "text-zinc-700",
                      )}
                    >
                      {cert.expires}
                    </p>
                  </div>
                )}
              </div>
            )}

            {cert.daysNote && (
              <p
                className={cn(
                  "mt-2 text-xs font-semibold",
                  cert.status === "EXPIRED"
                    ? "text-red-600"
                    : cert.status === "EXPIRING_SOON"
                      ? "text-amber-600"
                      : "text-zinc-500",
                )}
              >
                {cert.daysNote}
              </p>
            )}

            {cert.blocksJobType && cert.status === "EXPIRED" && (
              <p className="mt-1 text-[11px] text-red-500 flex items-center gap-1 italic">
                <AlertCircle className="h-3 w-3 shrink-0" />
                Blocks assignment to {cert.blocksJobType}
              </p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-1.5 shrink-0">
          {cert.status !== "PENDING" && (
            <button className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-zinc-200 text-xs text-zinc-600 hover:bg-zinc-50 transition-colors font-medium whitespace-nowrap">
              <FileText className="h-3.5 w-3.5" />
              View Doc
            </button>
          )}
          {(cert.status === "EXPIRED" || cert.status === "EXPIRING_SOON") && (
            <button className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-amber-300 bg-amber-50 text-xs text-amber-700 hover:bg-amber-100 transition-colors font-medium whitespace-nowrap">
              <RefreshCw className="h-3.5 w-3.5" />
              Upload Renewal
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function UploadCertPanel() {
  const [certType, setCertType] = useState("")
  const [showDropdown, setShowDropdown] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 space-y-5 sticky top-6">
      <div className="flex items-center gap-2">
        <div className="h-7 w-7 rounded-lg bg-zinc-900 flex items-center justify-center">
          <Upload className="h-4 w-4 text-white" />
        </div>
        <h3 className="text-sm font-bold text-zinc-900">Upload Certificate</h3>
      </div>

      <Separator />

      {/* Cert type */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-zinc-600">Certificate Type</label>
        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="w-full flex items-center justify-between h-10 px-3 rounded-lg border border-zinc-200 bg-white text-sm text-zinc-700 hover:border-zinc-300 transition-colors"
          >
            <span className={certType ? "text-zinc-900" : "text-zinc-400"}>
              {certType || "Select type..."}
            </span>
            <ChevronDown className="h-4 w-4 text-zinc-400" />
          </button>
          {showDropdown && (
            <div className="absolute z-10 top-full left-0 right-0 mt-1 rounded-lg border border-zinc-200 bg-white shadow-lg overflow-hidden max-h-48 overflow-y-auto">
              {CERT_TYPES.map((t) => (
                <button
                  key={t}
                  onClick={() => {
                    setCertType(t)
                    setShowDropdown(false)
                  }}
                  className="w-full text-left px-3 py-2 text-xs text-zinc-700 hover:bg-zinc-50 transition-colors border-b border-zinc-100 last:border-0"
                >
                  {t}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Issuer / reg number */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-zinc-600">Registration / Certificate Number</label>
        <Input placeholder="e.g. #123456789" className="h-10 text-sm" />
      </div>

      {/* Dates */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-600 flex items-center gap-1">
            <CalendarDays className="h-3 w-3" />
            Issue Date
          </label>
          <Input type="date" className="h-10 text-sm" />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-600 flex items-center gap-1">
            <CalendarDays className="h-3 w-3" />
            Expiry Date
          </label>
          <Input type="date" className="h-10 text-sm" />
        </div>
      </div>

      {/* File upload */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-zinc-600">Certificate File</label>
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault()
            setIsDragging(false)
            const file = e.dataTransfer.files[0]
            if (file) setFileName(file.name)
          }}
          className={cn(
            "rounded-xl border-2 border-dashed p-5 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors",
            isDragging
              ? "border-zinc-900 bg-zinc-50"
              : "border-zinc-300 hover:border-zinc-400 hover:bg-zinc-50",
          )}
        >
          <Upload className={cn("h-6 w-6", isDragging ? "text-zinc-700" : "text-zinc-400")} />
          {fileName ? (
            <div className="text-center">
              <p className="text-xs font-semibold text-zinc-700">{fileName}</p>
              <p className="text-[10px] text-zinc-400 mt-0.5">Click to replace</p>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-xs font-semibold text-zinc-600">Drag & drop PDF or image</p>
              <p className="text-[10px] text-zinc-400 mt-0.5">or click to browse — max 10MB</p>
            </div>
          )}
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-zinc-600">Notes (optional)</label>
        <textarea
          rows={2}
          placeholder="Any notes about this certification..."
          className="w-full rounded-lg border border-zinc-200 bg-white p-2.5 text-xs text-zinc-700 placeholder:text-zinc-400 resize-none focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
        />
      </div>

      <Button className="w-full h-10 bg-zinc-900 hover:bg-zinc-700 text-white text-sm font-semibold rounded-lg">
        Save Certificate
      </Button>
    </div>
  )
}

function AssignmentImpact() {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-5 space-y-4">
      <div className="flex items-center gap-2">
        <ShieldAlert className="h-4 w-4 text-red-600" />
        <h3 className="text-sm font-bold text-red-800">Assignment Impact</h3>
      </div>
      <p className="text-xs text-red-700">
        <span className="font-semibold">3 upcoming gas jobs blocked</span> — assign another resource or renew Gas Safe cert first.
      </p>
      <div className="space-y-2">
        {BLOCKED_JOBS.map((job) => (
          <div
            key={job.ref}
            className="flex items-center justify-between rounded-lg border border-red-200 bg-white px-3 py-2.5"
          >
            <div className="flex items-center gap-2.5">
              <Briefcase className="h-3.5 w-3.5 text-red-400 shrink-0" />
              <div>
                <span className="text-xs font-mono font-bold text-red-700">{job.ref}</span>
                <span className="text-xs text-zinc-600 ml-2">{job.title}</span>
              </div>
            </div>
            <span className="text-[11px] text-zinc-400 shrink-0 ml-2">{job.date}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function CertificationsPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <Breadcrumb />

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-full bg-zinc-900 flex items-center justify-center text-white text-sm font-bold shrink-0">
            SC
          </div>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 tracking-tight leading-tight">
              Sarah Chen
            </h1>
            <p className="text-sm text-zinc-500 flex items-center gap-1.5 mt-0.5">
              <ShieldCheck className="h-3.5 w-3.5" />
              Gas Safe Engineer &nbsp;·&nbsp; RES-001 &nbsp;·&nbsp; Certifications
            </p>
          </div>
        </div>
        <Button className="h-9 px-4 bg-zinc-900 hover:bg-zinc-700 text-white text-sm font-semibold rounded-lg flex items-center gap-1.5 shrink-0">
          <Plus className="h-4 w-4" />
          Upload Certificate
        </Button>
      </div>

      {/* Warning banner */}
      <WarningBanner />

      {/* KPI row */}
      <KpiRow />

      {/* Two-column layout */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Certs list */}
        <div className="xl:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              All Certifications ({CERTS.length})
            </span>
          </div>
          {CERTS.map((cert) => (
            <CertCard key={cert.id} cert={cert} />
          ))}

          <div className="mt-6">
            <AssignmentImpact />
          </div>
        </div>

        {/* Upload panel */}
        <div className="xl:col-span-1">
          <UploadCertPanel />
        </div>
      </div>

      <Separator />
      <div className="flex items-center justify-between text-[11px] text-zinc-400 pb-2">
        <span>Ironheart Platform — Resources Module</span>
        <span>All data hardcoded for mockup purposes</span>
      </div>
    </div>
  )
}
