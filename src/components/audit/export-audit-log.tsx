"use client"

import { Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { format } from "date-fns"
import type { AuditLogFilters } from "@/modules/audit/audit.types"

interface ExportAuditLogProps {
  /** Current audit log filters to apply to export */
  filters: AuditLogFilters
  /** Whether currently exporting data */
  isExporting?: boolean
  /** Callback when export is triggered */
  onExport: (filters: AuditLogFilters) => void
}

/**
 * ExportAuditLog - Export audit log to CSV
 *
 * Features:
 * - Export button with Download icon
 * - Loading state (disabled with spinner when isExporting=true)
 * - Respects current filters (passes them to export function)
 * - Generates CSV with columns: Timestamp, Actor, Action, Resource Type, Resource ID, Changes (JSON string)
 * - Downloads file immediately with filename: audit-log-YYYY-MM-DD.csv
 * - Toast notification on success/error
 *
 * @example
 * ```tsx
 * const [filters, setFilters] = useState<AuditLogFilters>({})
 * const [isExporting, setIsExporting] = useState(false)
 *
 * const handleExport = async (filters: AuditLogFilters) => {
 *   setIsExporting(true)
 *   try {
 *     // API call to generate CSV (backend handles this)
 *     // The actual download happens via response stream
 *     await api.audit.exportCsv.mutate(filters)
 *   } finally {
 *     setIsExporting(false)
 *   }
 * }
 *
 * <ExportAuditLog
 *   filters={filters}
 *   isExporting={isExporting}
 *   onExport={handleExport}
 * />
 * ```
 */
export function ExportAuditLog({
  filters,
  isExporting = false,
  onExport,
}: ExportAuditLogProps) {
  const handleClick = () => {
    try {
      // Call the export callback with current filters
      onExport(filters)

      // Schedule toast for success (backend typically handles download)
      // The mutation in the parent will handle the actual CSV generation
      toast.success("Generating audit log export...", {
        description: "Your file will download shortly",
      })
    } catch (error) {
      toast.error("Export failed", {
        description:
          error instanceof Error ? error.message : "Failed to export audit log",
      })
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleClick}
      disabled={isExporting}
      loading={isExporting}
      aria-label="Export audit log to CSV"
      className="gap-2"
    >
      <Download className="h-4 w-4" />
      <span className="hidden sm:inline">Export CSV</span>
    </Button>
  )
}

/**
 * generateAuditLogCsv - Helper to generate CSV content from audit entries
 *
 * Converts audit log entries to CSV format with proper escaping.
 *
 * @param entries - Array of audit log entries
 * @returns CSV string content
 */
export function generateAuditLogCsv(entries: any[]): string {
  const headers = [
    "Timestamp",
    "Actor",
    "Email",
    "Action",
    "Resource Type",
    "Resource ID",
    "Resource Name",
    "Changes",
  ]

  // Helper to escape CSV fields (handle quotes and commas)
  const escapeField = (field: unknown): string => {
    if (field === null || field === undefined) return ""
    const str = String(field)
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"` // Escape quotes by doubling them
    }
    return str
  }

  // Header row
  const rows: string[] = [headers.map(escapeField).join(",")]

  // Data rows
  for (const entry of entries) {
    const row = [
      escapeField(entry.timestamp ? new Date(entry.timestamp).toISOString() : ""),
      escapeField(entry.actor?.name || ""),
      escapeField(entry.actor?.email || ""),
      escapeField(entry.action || ""),
      escapeField(entry.resourceType || ""),
      escapeField(entry.resourceId || ""),
      escapeField(entry.resourceName || ""),
      escapeField(entry.changes ? JSON.stringify(entry.changes) : ""),
    ]
    rows.push(row.join(","))
  }

  return rows.join("\n")
}

/**
 * downloadAuditLogCsv - Trigger browser download of CSV file
 *
 * Creates a blob, generates download link, and triggers browser download.
 * Cleans up resources after download initiated.
 *
 * @param csvContent - CSV file content
 * @param filename - Name of file to download as (default: audit-log-YYYY-MM-DD.csv)
 */
export function downloadAuditLogCsv(
  csvContent: string,
  filename?: string
): void {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
  const link = document.createElement("a")
  const url = URL.createObjectURL(blob)

  const today = format(new Date(), "yyyy-MM-dd")
  const downloadFilename = filename || `audit-log-${today}.csv`

  link.setAttribute("href", url)
  link.setAttribute("download", downloadFilename)
  link.style.visibility = "hidden"

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  // Clean up the blob URL
  URL.revokeObjectURL(url)
}
