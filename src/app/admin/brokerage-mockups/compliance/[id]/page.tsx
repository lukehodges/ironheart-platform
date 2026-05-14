"use client"

import { useParams } from "next/navigation"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Checkbox } from "@/components/ui/checkbox"
import {
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  MapPin,
  Calendar,
  RefreshCw,
  Upload,
  FileText,
  User,
  ExternalLink,
  Flag,
  UserPlus,
} from "lucide-react"
import { complianceItems, sites } from "../../_mock-data"

// ---------------------------------------------------------------------------
// Style maps
// ---------------------------------------------------------------------------

const STATUS_STYLES: Record<string, { badge: string; icon: React.ElementType }> = {
  Overdue: {
    badge: "bg-red-100 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800",
    icon: AlertTriangle,
  },
  "Due Soon": {
    badge: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800",
    icon: Clock,
  },
  Upcoming: {
    badge: "bg-green-100 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-800",
    icon: Calendar,
  },
  Completed: {
    badge: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800",
    icon: CheckCircle2,
  },
}

const CATEGORY_STYLES: Record<string, string> = {
  Monitoring: "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-400 dark:border-purple-800",
  Legal: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800",
  Registration: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800",
  Financial: "bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-400 dark:border-indigo-800",
}

// ---------------------------------------------------------------------------
// Mock checklist + evidence + submission history
// ---------------------------------------------------------------------------

interface ChecklistItem {
  label: string
  checked: boolean
}

const checklist: ChecklistItem[] = [
  { label: "Site visit completed", checked: true },
  { label: "Habitat condition photos taken", checked: true },
  { label: "Water quality samples collected", checked: false },
  { label: "Monitoring report written", checked: false },
  { label: "Report submitted to LPA", checked: false },
]

const uploadedFiles = [
  { name: "site_photos_jan_2026.zip", size: "12.4 MB", date: "28 Jan 2026" },
  { name: "field_notes_q4_2025.pdf", size: "890 KB", date: "15 Dec 2025" },
]

const submissionHistory = [
  { period: "2025", submittedDate: "27 Feb 2025", status: "Approved", reviewer: "Eastleigh LPA" },
  { period: "2024", submittedDate: "25 Feb 2024", status: "Approved", reviewer: "Eastleigh LPA" },
]

const linkedDocuments = [
  { id: "DOC-001", name: "S106 Agreement -- Whiteley Farm", type: "S106" },
  { id: "DOC-009", name: "Survey Report -- Whiteley Farm NN Baseline", type: "Survey Report" },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ComplianceDetailPage() {
  const params = useParams()
  const itemId = (params?.id as string) ?? "CMP-001"

  const item = complianceItems.find((c) => c.id === itemId) ?? complianceItems[0]

  const linkedSite = item.siteRef
    ? sites.find((s) => s.ref === item.siteRef)
    : null

  const statusStyle = STATUS_STYLES[item.status] ?? STATUS_STYLES["Upcoming"]
  const StatusIcon = statusStyle.icon

  // Calculate next due and previous completion for sidebar
  const previousCompletion = submissionHistory.length > 0
    ? submissionHistory[0].submittedDate
    : "N/A"

  return (
    <div className="max-w-screen-xl mx-auto px-6 py-6 space-y-6">
      {/* Breadcrumb + Header */}
      <div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
          <Link href="/admin/brokerage-mockups/compliance" className="hover:text-primary transition-colors">
            Compliance
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-foreground font-medium">{item.title}</span>
        </div>

        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/admin/brokerage-mockups/compliance"
              className="p-1.5 rounded-md border border-border hover:bg-accent transition-colors"
            >
              <ChevronLeft className="h-4 w-4 text-muted-foreground" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                <h1 className="text-xl font-bold tracking-tight text-foreground">{item.title}</h1>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className={`inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-[10px] font-semibold ${statusStyle.badge}`}>
                  <StatusIcon className="h-3 w-3" />
                  {item.status}
                </span>
                <span className={`inline-flex items-center rounded border px-2 py-0.5 text-[10px] font-semibold ${CATEGORY_STYLES[item.category]}`}>
                  {item.category}
                </span>
                <span className="text-xs text-muted-foreground">
                  Due: {formatDate(item.dueDate)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Linked Site */}
          {linkedSite && (
            <div className="rounded-lg border border-border bg-card overflow-hidden">
              <div className="px-4 py-3 bg-muted/50 border-b border-border">
                <span className="text-xs font-semibold text-foreground">Linked Site</span>
              </div>
              <Link
                href={`/admin/brokerage-mockups/sites/${linkedSite.ref}`}
                className="flex items-center gap-4 p-4 hover:bg-accent/30 transition-colors"
              >
                <div className="rounded-lg bg-emerald-100 dark:bg-emerald-950 p-3">
                  <MapPin className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{linkedSite.ref} {linkedSite.name}</p>
                  <p className="text-xs text-muted-foreground">{linkedSite.address}</p>
                  <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground">
                    <span>{linkedSite.unitType} -- {linkedSite.totalLabel}</span>
                    <span>{linkedSite.status}</span>
                    <span>{linkedSite.lpa}</span>
                  </div>
                </div>
                <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0" />
              </Link>
            </div>
          )}

          {/* Deal link if applicable */}
          {item.dealRef && (
            <div className="rounded-lg border border-border bg-card overflow-hidden">
              <div className="px-4 py-3 bg-muted/50 border-b border-border">
                <span className="text-xs font-semibold text-foreground">Linked Deal</span>
              </div>
              <Link
                href={`/admin/brokerage-mockups/deals/${item.dealRef}`}
                className="flex items-center gap-4 p-4 hover:bg-accent/30 transition-colors"
              >
                <div className="rounded-lg bg-blue-100 dark:bg-blue-950 p-3">
                  <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{item.dealRef} {item.dealTitle}</p>
                </div>
                <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0" />
              </Link>
            </div>
          )}

          {/* Requirements Checklist */}
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <div className="px-4 py-3 bg-muted/50 border-b border-border flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground">Requirements Checklist</span>
              <span className="text-[11px] text-muted-foreground">
                {checklist.filter((c) => c.checked).length} / {checklist.length} complete
              </span>
            </div>
            <div className="p-4 space-y-3">
              {checklist.map((item, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <Checkbox checked={item.checked} disabled className="shrink-0" />
                  <span className={`text-sm ${item.checked ? "text-muted-foreground line-through" : "text-foreground"}`}>
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
            {/* Progress bar */}
            <div className="px-4 pb-4">
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all"
                  style={{ width: `${(checklist.filter((c) => c.checked).length / checklist.length) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* Evidence Upload */}
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <div className="px-4 py-3 bg-muted/50 border-b border-border">
              <span className="text-xs font-semibold text-foreground">Evidence & Uploads</span>
            </div>
            <div className="p-4 space-y-4">
              {/* Drag-and-drop zone */}
              <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors cursor-pointer">
                <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm font-medium text-foreground">Drag and drop files here</p>
                <p className="text-xs text-muted-foreground mt-1">or click to browse. PDF, images, ZIP up to 50MB.</p>
              </div>

              {/* Previously uploaded files */}
              {uploadedFiles.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Previously Uploaded
                  </p>
                  {uploadedFiles.map((file, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-3 p-3 rounded-md border border-border bg-muted/30"
                    >
                      <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">{file.name}</p>
                        <p className="text-[11px] text-muted-foreground">{file.size} -- {file.date}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Submission History */}
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <div className="px-4 py-3 bg-muted/50 border-b border-border">
              <span className="text-xs font-semibold text-foreground">Submission History</span>
            </div>
            {submissionHistory.length > 0 ? (
              <div className="divide-y divide-border">
                {submissionHistory.map((sub, idx) => (
                  <div key={idx} className="flex items-center gap-4 px-4 py-3">
                    <div className="rounded-full bg-muted h-8 w-8 flex items-center justify-center text-xs font-bold text-muted-foreground">
                      {sub.period}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        {sub.period} Submission
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Submitted {sub.submittedDate} -- Reviewed by {sub.reviewer}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800">
                      {sub.status}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No previous submissions.
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Responsible Person */}
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <div className="px-4 py-3 bg-muted/50 border-b border-border">
              <span className="text-xs font-semibold text-foreground">Responsible Person</span>
            </div>
            <div className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-teal-500/15 text-teal-700 dark:text-teal-300 flex items-center justify-center text-sm font-bold">
                  {item.assignedInitials}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{item.assigned}</p>
                  <p className="text-xs text-muted-foreground">Compliance Officer</p>
                </div>
              </div>
            </div>
          </div>

          {/* Schedule */}
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <div className="px-4 py-3 bg-muted/50 border-b border-border">
              <span className="text-xs font-semibold text-foreground">Schedule</span>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <RefreshCw className="h-3 w-3" />
                  Frequency
                </span>
                <span className="text-xs font-medium text-foreground">{item.frequency}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Calendar className="h-3 w-3" />
                  Due Date
                </span>
                <span className="text-xs font-medium text-foreground">{formatDate(item.dueDate)}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <CheckCircle2 className="h-3 w-3" />
                  Previous Completion
                </span>
                <span className="text-xs font-medium text-foreground">{previousCompletion}</span>
              </div>
            </div>
          </div>

          {/* Linked Documents */}
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <div className="px-4 py-3 bg-muted/50 border-b border-border">
              <span className="text-xs font-semibold text-foreground">Linked Documents</span>
            </div>
            <div className="p-4 space-y-2">
              {linkedDocuments.map((doc) => (
                <Link
                  key={doc.id}
                  href={`/admin/brokerage-mockups/documents/${doc.id}`}
                  className="flex items-center gap-3 p-3 rounded-md border border-border hover:bg-accent/30 transition-colors"
                >
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{doc.name}</p>
                    <p className="text-[11px] text-muted-foreground">{doc.type}</p>
                  </div>
                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                </Link>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <div className="px-4 py-3 bg-muted/50 border-b border-border">
              <span className="text-xs font-semibold text-foreground">Actions</span>
            </div>
            <div className="p-4 space-y-2">
              <Button className="w-full justify-start gap-2 text-xs h-9 bg-emerald-600 hover:bg-emerald-700 text-white">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Mark Complete
              </Button>
              <Button variant="outline" className="w-full justify-start gap-2 text-xs h-9 border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-400 dark:hover:bg-amber-950/50">
                <Clock className="h-3.5 w-3.5" />
                Request Extension
              </Button>
              <Button variant="outline" className="w-full justify-start gap-2 text-xs h-9 border-red-300 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/50">
                <Flag className="h-3.5 w-3.5" />
                Flag Issue
              </Button>
              <Button variant="outline" className="w-full justify-start gap-2 text-xs h-9">
                <UserPlus className="h-3.5 w-3.5" />
                Reassign
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
