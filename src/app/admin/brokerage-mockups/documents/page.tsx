"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  FileText,
  Grid3X3,
  List,
  Plus,
  Search,
  Download,
  MoreHorizontal,
  Eye,
  Send,
  Archive,
  ExternalLink,
  ChevronRight,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { documents } from "../_mock-data"
import type { DocumentType, DocumentStatus } from "../_mock-data"

// ---------------------------------------------------------------------------
// Style maps
// ---------------------------------------------------------------------------

const TYPE_STYLES: Record<string, string> = {
  S106: "border-amber-200 bg-amber-50 text-amber-700",
  "Conservation Covenant": "border-green-200 bg-green-50 text-green-700",
  "Purchase Agreement": "border-blue-200 bg-blue-50 text-blue-700",
  "Heads of Terms": "border-blue-200 bg-blue-50 text-blue-700",
  HMMP: "border-teal-200 bg-teal-50 text-teal-700",
  "Reservation Agreement": "border-blue-200 bg-blue-50 text-blue-700",
  Invoice: "border-purple-200 bg-purple-50 text-purple-700",
  "Survey Report": "border-border bg-muted text-muted-foreground",
  "Metric Calculation": "border-border bg-muted text-muted-foreground",
  "Site Photos": "border-border bg-muted text-muted-foreground",
}

const TYPE_THUMBNAIL_COLORS: Record<string, string> = {
  S106: "bg-amber-100",
  "Conservation Covenant": "bg-green-100",
  "Purchase Agreement": "bg-blue-100",
  "Heads of Terms": "bg-blue-100",
  HMMP: "bg-teal-100",
  "Reservation Agreement": "bg-blue-100",
  Invoice: "bg-purple-100",
  "Survey Report": "bg-muted",
  "Metric Calculation": "bg-muted",
  "Site Photos": "bg-muted",
}

const STATUS_STYLES: Record<string, string> = {
  Draft: "border-border bg-muted text-muted-foreground",
  Sent: "border-blue-200 bg-blue-50 text-blue-700",
  Viewed: "border-cyan-200 bg-cyan-50 text-cyan-700",
  Signed: "border-green-200 bg-green-50 text-green-700",
  Completed: "border-emerald-200 bg-emerald-50 text-emerald-700",
  Expired: "border-red-200 bg-red-50 text-red-700",
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
}

function getEntityLink(entityType: "site" | "deal" | "contact", entityId: string): string {
  if (entityType === "site") return `/admin/brokerage-mockups/sites/${entityId}`
  if (entityType === "deal") return `/admin/brokerage-mockups/deals/${entityId}`
  return `/admin/brokerage-mockups/contacts/${entityId}`
}

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------

const totalDocuments = documents.length
const awaitingSignature = documents.filter(
  (d) => d.signatories?.some((s) => !s.signed) ?? false
).length
const completedDocs = documents.filter((d) => d.status === "Completed").length
const expiredDocs = documents.filter((d) => d.status === "Expired").length

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function DocumentLibraryPage() {
  const router = useRouter()
  const [viewMode, setViewMode] = useState<"table" | "grid">("table")
  const [typeFilter, setTypeFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")

  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      if (typeFilter !== "all" && doc.type !== typeFilter) return false
      if (statusFilter !== "all" && doc.status !== statusFilter) return false
      if (searchQuery && !doc.name.toLowerCase().includes(searchQuery.toLowerCase())) return false
      return true
    })
  }, [typeFilter, statusFilter, searchQuery])

  const uniqueTypes = [...new Set(documents.map((d) => d.type))]
  const uniqueStatuses: DocumentStatus[] = ["Draft", "Sent", "Viewed", "Signed", "Completed", "Expired"]

  const statCards = [
    { label: "Total Documents", value: totalDocuments, bg: "border-blue-200 bg-blue-50", text: "text-blue-700" },
    { label: "Awaiting Signature", value: awaitingSignature, bg: "border-amber-200 bg-amber-50", text: "text-amber-700" },
    { label: "Completed", value: completedDocs, bg: "border-emerald-200 bg-emerald-50", text: "text-emerald-700" },
    { label: "Expired", value: expiredDocs, bg: "border-red-200 bg-red-50", text: "text-red-700" },
  ]

  return (
    <div className="max-w-screen-xl mx-auto px-6 py-6 space-y-6">
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/admin/brokerage-mockups/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground font-medium">Documents</span>
      </div>

      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <FileText className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Document Library
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Manage S106 agreements, covenants, purchase agreements, and all site documentation.
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Upload Document
        </Button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map((card) => (
          <div key={card.label} className={`rounded-lg border px-4 py-3 ${card.bg}`}>
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              {card.label}
            </span>
            <p className={`text-2xl font-bold ${card.text}`}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="h-8 w-[180px] text-xs">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {uniqueTypes.map((t) => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-8 w-[140px] text-xs">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {uniqueStatuses.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 pl-8 text-xs"
          />
        </div>

        <div className="ml-auto flex items-center gap-1">
          <span className="text-xs text-muted-foreground mr-2">
            {filteredDocuments.length} of {documents.length}
          </span>
          <div className="inline-flex items-center rounded-lg border border-border bg-muted/50 p-0.5">
            <button
              onClick={() => setViewMode("table")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                viewMode === "table"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <List className="h-3.5 w-3.5" />
              Table
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                viewMode === "grid"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Grid3X3 className="h-3.5 w-3.5" />
              Grid
            </button>
          </div>
        </div>
      </div>

      {/* Table View */}
      {viewMode === "table" && (
        <div className="border border-border rounded-lg overflow-x-auto">
          {/* Table Header */}
          <div className="grid grid-cols-[1fr_130px_170px_110px_100px_90px_60px] gap-2 px-4 py-2.5 bg-muted/50 border-b border-border text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            <span>Name</span>
            <span>Type</span>
            <span>Linked Entity</span>
            <span>Uploaded By</span>
            <span>Date</span>
            <span>Status</span>
            <span>Actions</span>
          </div>

          {/* Rows */}
          <div className="divide-y divide-border">
            {filteredDocuments.map((doc) => (
              <div
                key={doc.id}
                onClick={() => router.push(`/admin/brokerage-mockups/documents/${doc.id}`)}
                className="grid grid-cols-[1fr_130px_170px_110px_100px_90px_60px] gap-2 px-4 py-3 items-center hover:bg-muted/50 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm font-medium text-foreground truncate">{doc.name}</span>
                </div>
                <span className={`inline-flex items-center rounded border px-2 py-0.5 text-[10px] font-semibold w-fit ${TYPE_STYLES[doc.type] ?? TYPE_STYLES["Survey Report"]}`}>
                  {doc.type}
                </span>
                <div className="text-xs text-muted-foreground truncate">
                  <span
                    onClick={(e) => e.stopPropagation()}
                    className="inline"
                  >
                    <Link
                      href={getEntityLink(doc.linkedEntityType, doc.linkedEntityId)}
                      className="text-primary hover:underline"
                    >
                      {doc.linkedEntityLabel}
                    </Link>
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">{doc.uploadedBy}</span>
                <span className="text-xs text-muted-foreground">{formatDate(doc.uploadedDate)}</span>
                <span className={`inline-flex items-center rounded border px-2 py-0.5 text-[10px] font-semibold w-fit ${STATUS_STYLES[doc.status]}`}>
                  {doc.status}
                </span>
                <div onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="p-1 rounded hover:bg-accent transition-colors">
                        <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Eye className="h-3.5 w-3.5 mr-2" />
                        View
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Download className="h-3.5 w-3.5 mr-2" />
                        Download
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Send className="h-3.5 w-3.5 mr-2" />
                        Send
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Archive className="h-3.5 w-3.5 mr-2" />
                        Archive
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>

          {filteredDocuments.length === 0 && (
            <div className="px-4 py-12 text-center text-sm text-muted-foreground">
              No documents match your filters.
            </div>
          )}
        </div>
      )}

      {/* Grid View */}
      {viewMode === "grid" && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredDocuments.map((doc) => (
            <Link
              key={doc.id}
              href={`/admin/brokerage-mockups/documents/${doc.id}`}
              className="group rounded-lg border border-border bg-card hover:border-primary/20 hover:shadow-md transition-all overflow-hidden"
            >
              {/* Mock thumbnail */}
              <div className={`h-32 flex items-center justify-center ${TYPE_THUMBNAIL_COLORS[doc.type] ?? "bg-muted"}`}>
                <FileText className="h-10 w-10 text-foreground/30" />
              </div>

              <div className="p-3 space-y-2">
                <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                  {doc.name}
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-semibold ${TYPE_STYLES[doc.type] ?? TYPE_STYLES["Survey Report"]}`}>
                    {doc.type}
                  </span>
                  <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-semibold ${STATUS_STYLES[doc.status]}`}>
                    {doc.status}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground truncate flex items-center gap-1">
                  <ExternalLink className="h-3 w-3 shrink-0" />
                  {doc.linkedEntityLabel}
                </p>
              </div>
            </Link>
          ))}

          {filteredDocuments.length === 0 && (
            <div className="col-span-full px-4 py-12 text-center text-sm text-muted-foreground">
              No documents match your filters.
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="border-t border-border pt-4 mt-8">
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>Ironheart Brokerage -- Document Library</span>
          <Link href="/admin/brokerage-mockups/documents/templates" className="text-primary hover:underline">
            View Document Templates
          </Link>
        </div>
      </div>
    </div>
  )
}
