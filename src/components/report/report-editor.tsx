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
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-border px-8 py-4">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          Platform / Clients / {engagementTitle} / Report
        </p>
        <div className="flex items-center justify-between mt-1">
          <h1 className="font-serif text-2xl">{companyLabel} — Audit report</h1>
        </div>
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
        <div className="p-8 text-sm text-muted-foreground">Loading report…</div>
      )}

      {/* No report yet */}
      {!reportQuery.isLoading && !report && (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="max-w-md text-center">
            <h2 className="font-serif text-2xl mb-2">No report yet</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Generate an initial draft from the audit data. Claude reads the lens analyses, findings,
              and call notes to produce a starting point you can edit.
            </p>
            <button
              onClick={handleGenerate}
              disabled={triggerMutation.isPending}
              className="px-6 py-2 rounded-md bg-primary text-primary-foreground text-sm hover:bg-primary/90 disabled:opacity-50"
            >
              {triggerMutation.isPending ? "Starting…" : "Generate draft from audit"}
            </button>
          </div>
        </div>
      )}

      {/* Side-by-side editor */}
      {report && (
        <div className="flex flex-1 overflow-hidden">
          {/* Left: audit summary (read-only) */}
          <div className="w-96 border-r border-border overflow-y-auto p-6">
            <AuditSummaryPane session={session} />
          </div>

          {/* Right: editor */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {report.status === "GENERATING" && (
              <div className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
                Claude is drafting your report… this usually takes 20–60 seconds. The page will
                refresh automatically when ready.
              </div>
            )}

            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground mb-2 block">
                Executive summary
              </label>
              <textarea
                value={execSummary}
                onChange={(e) => handleSummaryChange(e.target.value)}
                disabled={isLocked}
                rows={5}
                placeholder="Brief client-facing summary (3–4 sentences)…"
                className="w-full rounded border border-border p-3 text-sm disabled:opacity-50 focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground mb-2 block">
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
