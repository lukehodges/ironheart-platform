"use client"

import { useEffect, useState, useRef } from "react"
import { api } from "@/lib/trpc/react"
import { StatusBar } from "./status-bar"
import { AuditSummaryPane } from "./audit-summary-pane"
import { MarkdownEditor } from "./markdown-editor"

interface Props {
  engagementId: string
  engagementTitle: string
  companyLabel: string
  currentStage: string
}

export function ReportEditor({ engagementId, engagementTitle, companyLabel, currentStage: _currentStage }: Props) {
  const utils = api.useUtils()

  const reportQuery = api.reportGenerator.getByEngagement.useQuery(
    { engagementId },
    {
      refetchInterval: (q) => (q.state.data?.status === "GENERATING" ? 2000 : false),
    },
  )

  const auditQuery = api.auditWorkspace.getOrCreate.useQuery({ engagementId })

  const triggerMutation = api.reportGenerator.triggerGenerate.useMutation({
    onSuccess: () => utils.reportGenerator.getByEngagement.invalidate({ engagementId }),
    onError: (err) => alert(`Generate failed: ${err.message}`),
  })

  const updateMutation = api.reportGenerator.updateContent.useMutation({
    onSuccess: () => utils.reportGenerator.getByEngagement.invalidate({ engagementId }),
  })

  const transitionMutation = api.reportGenerator.transitionStatus.useMutation({
    onSuccess: () => utils.reportGenerator.getByEngagement.invalidate({ engagementId }),
  })

  const report = reportQuery.data
  const session = auditQuery.data

  // Editor state — driven by report.contentHtml (treated as markdown for 0.4)
  const [draft, setDraft] = useState(report?.contentHtml ?? "")
  const [execSummary, setExecSummary] = useState(report?.executiveSummary ?? "")
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Sync local state when report loads or transitions out of GENERATING
  useEffect(() => {
    if (report) {
      setDraft(report.contentHtml ?? "")
      setExecSummary(report.executiveSummary ?? "")
    }
  }, [report?.id, report?.status])

  const isLocked = report?.status === "PUBLISHED" || report?.status === "GENERATING"
  const canPublish = report?.status === "DRAFT" || report?.status === "IN_REVIEW"

  const scheduleSave = (contentHtml: string, executiveSummary: string) => {
    if (!report || isLocked) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      updateMutation.mutate(
        { reportId: report.id, contentHtml, executiveSummary },
        { onSuccess: () => setSavedAt(new Date()) },
      )
    }, 700)
  }

  const handleDraftChange = (value: string) => {
    setDraft(value)
    scheduleSave(value, execSummary)
  }

  const handleSummaryChange = (value: string) => {
    setExecSummary(value)
    scheduleSave(draft, value)
  }

  const handleGenerate = () => {
    if (!confirm("Generate a fresh draft? This will overwrite the current report content.")) return
    triggerMutation.mutate({ engagementId })
  }

  const handlePublish = () => {
    if (!report) return
    if (!confirm("Publish this report to the client? They will be able to view it on their portal.")) return
    transitionMutation.mutate({ reportId: report.id, targetStatus: "PUBLISHED" })
  }

  const isPublishing = transitionMutation.isPending

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: "var(--ih-bg)",
      }}
    >
      {/* Header */}
      <div
        style={{
          borderBottom: "1px solid var(--ih-line)",
          padding: "16px 32px 14px",
          background: "var(--ih-surface)",
        }}
      >
        <p
          className="ih-mono"
          style={{
            fontSize: 9,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            color: "var(--ih-ink-40)",
            marginBottom: 4,
          }}
        >
          Platform / Clients / {engagementTitle} / Report
        </p>
        <h1
          className="ih-serif"
          style={{ margin: 0, fontSize: 28, color: "var(--ih-ink)" }}
        >
          {companyLabel} — Audit report
        </h1>
      </div>

      <StatusBar
        report={report}
        isLocked={isLocked}
        canPublish={canPublish}
        savedAt={savedAt}
        isUpdating={updateMutation.isPending}
        isGenerating={triggerMutation.isPending || report?.status === "GENERATING"}
        isPublishing={isPublishing}
        onGenerate={handleGenerate}
        onPublish={handlePublish}
      />

      {/* Loading state */}
      {reportQuery.isLoading && (
        <div
          style={{
            padding: 32,
            fontSize: 13,
            color: "var(--ih-ink-50)",
            fontFamily: "var(--ih-font-sans)",
          }}
        >
          Loading report…
        </div>
      )}

      {/* No report yet */}
      {!reportQuery.isLoading && !report && (
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 32,
          }}
        >
          <div style={{ maxWidth: 400, textAlign: "center" }}>
            <h2
              className="ih-serif"
              style={{ margin: 0, marginBottom: 10, fontSize: 26, color: "var(--ih-ink)" }}
            >
              No report yet
            </h2>
            <p
              style={{
                fontSize: 13,
                color: "var(--ih-ink-50)",
                fontFamily: "var(--ih-font-sans)",
                marginBottom: 20,
                lineHeight: 1.6,
              }}
            >
              Generate an initial draft from the audit data. Claude reads the lens analyses,
              findings, and call notes to produce a starting point you can edit.
            </p>
            <button
              onClick={handleGenerate}
              disabled={triggerMutation.isPending}
              style={{
                padding: "10px 28px",
                borderRadius: "var(--ih-r-md)",
                background: "var(--ih-accent)",
                color: "white",
                border: "none",
                fontSize: 13,
                fontFamily: "var(--ih-font-sans)",
                fontWeight: 500,
                cursor: triggerMutation.isPending ? "not-allowed" : "pointer",
                opacity: triggerMutation.isPending ? 0.6 : 1,
                transition: "opacity 0.15s",
              }}
            >
              {triggerMutation.isPending ? "Starting…" : "Generate draft from audit"}
            </button>
          </div>
        </div>
      )}

      {/* Side-by-side editor */}
      {report && (
        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
          {/* Left: audit summary (read-only) */}
          <div
            style={{
              width: 380,
              borderRight: "1px solid var(--ih-line)",
              overflowY: "auto",
              padding: 20,
              background: "var(--ih-surface-2)",
              flexShrink: 0,
            }}
            className="scrollbar-thin"
          >
            <AuditSummaryPane session={session} />
          </div>

          {/* Right: editor */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: 24,
              display: "flex",
              flexDirection: "column",
              gap: 20,
            }}
            className="scrollbar-thin"
          >
            {report.status === "GENERATING" && (
              <div
                style={{
                  borderRadius: "var(--ih-r-md)",
                  border: "1px solid rgba(184,134,11,0.3)",
                  background: "rgba(184,134,11,0.07)",
                  padding: 14,
                  fontSize: 13,
                  color: "var(--ih-warn)",
                  fontFamily: "var(--ih-font-sans)",
                }}
              >
                Claude is drafting your report… this usually takes 20–60 seconds. The page will
                refresh automatically when ready.
              </div>
            )}

            <div>
              <label
                className="ih-mono"
                style={{
                  fontSize: 9,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  color: "var(--ih-ink-40)",
                  display: "block",
                  marginBottom: 8,
                }}
              >
                Executive summary
              </label>
              <textarea
                value={execSummary}
                onChange={(e) => handleSummaryChange(e.target.value)}
                disabled={isLocked}
                rows={5}
                placeholder="Brief client-facing summary (3–4 sentences)…"
                style={{
                  width: "100%",
                  borderRadius: "var(--ih-r-md)",
                  border: "1px solid var(--ih-line)",
                  background: "var(--ih-surface)",
                  padding: "10px 12px",
                  fontSize: 13,
                  fontFamily: "var(--ih-font-sans)",
                  color: "var(--ih-ink)",
                  resize: "vertical",
                  opacity: isLocked ? 0.5 : 1,
                  outline: "none",
                  boxSizing: "border-box",
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = "var(--ih-accent)" }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "var(--ih-line)" }}
              />
            </div>

            <div>
              <label
                className="ih-mono"
                style={{
                  fontSize: 9,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  color: "var(--ih-ink-40)",
                  display: "block",
                  marginBottom: 8,
                }}
              >
                Report content (Markdown)
              </label>
              <MarkdownEditor value={draft} onChange={handleDraftChange} disabled={isLocked} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
