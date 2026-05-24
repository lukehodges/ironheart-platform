"use client"

import { Sparkles, Send, RotateCw } from "lucide-react"
import type { AuditReportRecord } from "@/modules/report-generator/report-generator.types"

const STATUS_DISPLAY: Record<string, { label: string; className: string }> = {
  GENERATING: { label: "Generating", className: "bg-amber-100 text-amber-800 border-amber-300" },
  DRAFT: { label: "Draft", className: "bg-blue-100 text-blue-800 border-blue-300" },
  IN_REVIEW: { label: "In review", className: "bg-purple-100 text-purple-800 border-purple-300" },
  PUBLISHED: { label: "Published", className: "bg-emerald-100 text-emerald-800 border-emerald-300" },
}

interface StatusBarProps {
  report: AuditReportRecord | null | undefined
  isLocked: boolean
  canPublish: boolean
  savedAt: Date | null
  isUpdating: boolean
  isGenerating: boolean
  isPublishing: boolean
  onGenerate: () => void
  onPublish: () => void
}

export function StatusBar({
  report,
  isLocked,
  canPublish,
  savedAt,
  isUpdating,
  isGenerating,
  isPublishing,
  onGenerate,
  onPublish,
}: StatusBarProps) {
  if (!report) return null

  const status = STATUS_DISPLAY[report.status] ?? { label: report.status, className: "bg-gray-100 text-gray-800 border-gray-300" }

  return (
    <div className="border-b border-border px-8 py-2 flex items-center justify-between bg-muted/30">
      <div className="flex items-center gap-4">
        <span
          className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wide border ${status.className}`}
        >
          {status.label}
        </span>

        {report.generatedBy === "ai" && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Sparkles size={12} /> AI-generated
          </span>
        )}

        {report.publishedAt && (
          <span className="text-xs text-muted-foreground">
            Published {new Date(report.publishedAt).toLocaleString()}
          </span>
        )}

        {isUpdating && (
          <span className="text-xs text-muted-foreground">Saving…</span>
        )}

        {!isUpdating && savedAt && (
          <span className="text-xs text-muted-foreground">
            Saved {savedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        )}
      </div>

      <div className="flex gap-2">
        <button
          onClick={onGenerate}
          disabled={isGenerating || isLocked}
          className="flex items-center gap-1 px-3 py-1.5 text-xs rounded border border-border hover:bg-muted disabled:opacity-50"
          title="Re-generate draft from audit data (overwrites current)"
        >
          <RotateCw size={12} />
          {isGenerating ? "Generating…" : "Regenerate"}
        </button>

        {canPublish && (
          <button
            onClick={onPublish}
            disabled={isPublishing}
            className="flex items-center gap-1 px-3 py-1.5 text-xs rounded bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            <Send size={12} />
            {isPublishing ? "Publishing…" : "Publish to client"}
          </button>
        )}
      </div>
    </div>
  )
}
