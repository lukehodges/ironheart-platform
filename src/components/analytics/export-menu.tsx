"use client"

import { Download, FileJson, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

interface ExportMenuProps {
  /** Callback when export is triggered with format type */
  onExport: (format: "csv" | "pdf") => void
  /** Whether to disable the menu (no data to export) */
  disabled?: boolean
  /** Whether currently exporting data */
  isExporting?: boolean
}

export function ExportMenu({
  onExport,
  disabled = false,
  isExporting = false,
}: ExportMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled || isExporting}
          loading={isExporting}
          aria-label="Export analytics data"
          className={cn(
            isExporting && "opacity-70"
          )}
        >
          <Download className="h-4 w-4" />
          <span className="hidden sm:inline">Export</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem
          onClick={() => onExport("csv")}
          disabled={isExporting}
          className="gap-2"
        >
          <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <span>Export as CSV</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => onExport("pdf")}
          disabled={isExporting}
          className="gap-2"
        >
          <FileJson className="h-4 w-4 text-red-600 dark:text-red-400" />
          <span>Export as PDF</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
