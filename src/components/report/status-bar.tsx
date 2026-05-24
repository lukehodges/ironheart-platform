"use client"

import { Sparkles, Send, RotateCw, Download } from "lucide-react"
import type { AuditReportRecord } from "@/modules/report-generator/report-generator.types"

const STATUS_DISPLAY: Record<
  string,
  { label: string; bg: string; color: string; border: string }
> = {
  GENERATING: {
    label: "Generating",
    bg: "rgba(184,134,11,0.08)",
    color: "var(--ih-warn)",
    border: "rgba(184,134,11,0.3)",
  },
  DRAFT: {
    label: "Draft",
    bg: "rgba(42,93,191,0.08)",
    color: "var(--ih-info)",
    border: "rgba(42,93,191,0.3)",
  },
  IN_REVIEW: {
    label: "In review",
    bg: "rgba(140,80,180,0.08)",
    color: "#8C50B4",
    border: "rgba(140,80,180,0.3)",
  },
  PUBLISHED: {
    label: "Published",
    bg: "rgba(47,111,92,0.08)",
    color: "var(--ih-ok)",
    border: "rgba(47,111,92,0.3)",
  },
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

  const status = STATUS_DISPLAY[report.status] ?? {
    label: report.status,
    bg: "rgba(14,16,19,0.05)",
    color: "var(--ih-ink-65)",
    border: "rgba(14,16,19,0.15)",
  }

  return (
    <div
      style={{
        borderBottom: "1px solid var(--ih-line)",
        padding: "6px 32px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: "var(--ih-surface-2)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        {/* Status pill */}
        <span
          className="ih-mono"
          style={{
            padding: "2px 8px",
            borderRadius: "var(--ih-r-pill)",
            fontSize: 9,
            fontWeight: 600,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            background: status.bg,
            color: status.color,
            border: `1px solid ${status.border}`,
          }}
        >
          {status.label}
        </span>

        {report.generatedBy === "ai" && (
          <span
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              fontSize: 11,
              color: "var(--ih-ink-40)",
              fontFamily: "var(--ih-font-sans)",
            }}
          >
            <Sparkles size={11} /> AI-generated
          </span>
        )}

        {report.publishedAt && (
          <span
            className="ih-mono"
            style={{
              fontSize: 9.5,
              color: "var(--ih-ink-40)",
              letterSpacing: "0.04em",
            }}
          >
            Published {new Date(report.publishedAt).toLocaleString()}
          </span>
        )}

        {isUpdating && (
          <span
            className="ih-mono"
            style={{ fontSize: 9.5, color: "var(--ih-ink-40)", letterSpacing: "0.06em" }}
          >
            Saving…
          </span>
        )}

        {!isUpdating && savedAt && (
          <span
            className="ih-mono"
            style={{ fontSize: 9.5, color: "var(--ih-ink-40)", letterSpacing: "0.06em" }}
          >
            Saved {savedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        )}
      </div>

      <div style={{ display: "flex", gap: 6 }}>
        {/* Regenerate */}
        <button
          onClick={onGenerate}
          disabled={isGenerating || isLocked}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            padding: "5px 12px",
            fontSize: 11,
            fontFamily: "var(--ih-font-sans)",
            borderRadius: "var(--ih-r-sm)",
            border: "1px solid var(--ih-line)",
            background: "var(--ih-surface)",
            color: "var(--ih-ink-65)",
            cursor: isGenerating || isLocked ? "not-allowed" : "pointer",
            opacity: isGenerating || isLocked ? 0.5 : 1,
          }}
          title="Re-generate draft from audit data (overwrites current)"
        >
          <RotateCw size={11} />
          {isGenerating ? "Generating…" : "Regenerate"}
        </button>

        {/* Download PDF */}
        {report.status !== "GENERATING" && (
          <a
            href={`/api/reports/${report.id}/pdf`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              padding: "5px 12px",
              fontSize: 11,
              fontFamily: "var(--ih-font-sans)",
              borderRadius: "var(--ih-r-sm)",
              border: "1px solid var(--ih-line)",
              background: "var(--ih-surface)",
              color: "var(--ih-ink-65)",
              textDecoration: "none",
            }}
            title="Download branded PDF"
          >
            <Download size={11} /> Download PDF
          </a>
        )}

        {/* Publish */}
        {canPublish && (
          <button
            onClick={onPublish}
            disabled={isPublishing}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              padding: "5px 14px",
              fontSize: 11,
              fontFamily: "var(--ih-font-sans)",
              fontWeight: 500,
              borderRadius: "var(--ih-r-sm)",
              border: "none",
              background: "var(--ih-ok)",
              color: "white",
              cursor: isPublishing ? "not-allowed" : "pointer",
              opacity: isPublishing ? 0.6 : 1,
            }}
          >
            <Send size={11} />
            {isPublishing ? "Publishing…" : "Publish to client"}
          </button>
        )}
      </div>
    </div>
  )
}
