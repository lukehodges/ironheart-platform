"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { api } from "@/lib/trpc/react"
import { ReportStatusBar } from "@/components/consulting/report/report-status-bar"
import { BrandedReport } from "@/components/consulting/report/branded-report"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Eye,
  FileText,
  Loader2,
  Save,
  Sparkles,
  AlertCircle,
  Check,
} from "lucide-react"
import { toast } from "sonner"
import type { AuditReportStatus, ReportContentJson, ReportLensSection } from "@/modules/report-generator/report-generator.types"

const LENS_ORDER = ["REVENUE", "OPERATIONS", "FINANCE", "TECHNOLOGY", "TEAM"]

const RAG_BADGE_STYLES: Record<string, string> = {
  RED: "bg-[#D13A1F] text-white",
  AMBER: "bg-[#B8860B] text-white",
  GREEN: "bg-[#2F6F5C] text-white",
}

function formatCurrency(value: number | null | undefined): string {
  if (value == null) return "--"
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(value)
}

export default function ReportEditorPage() {
  const params = useParams()
  const router = useRouter()
  const engagementId = params.id as string

  // ── Queries ────────────────────────────────────────────────────────
  const {
    data: report,
    isLoading,
    error,
    refetch,
  } = api.reportGenerator.getByEngagement.useQuery(
    { engagementId },
    { enabled: !!engagementId },
  )

  // ── Mutations ──────────────────────────────────────────────────────
  const generateMutation = api.reportGenerator.generate.useMutation({
    onSuccess: () => {
      toast.success("Report generation started")
      refetch()
    },
    onError: (err) => toast.error(err.message),
  })

  const updateMutation = api.reportGenerator.updateContent.useMutation({
    onError: (err) => toast.error(`Failed to save: ${err.message}`),
  })

  const transitionMutation = api.reportGenerator.transitionStatus.useMutation({
    onSuccess: () => {
      toast.success("Status updated")
      refetch()
    },
    onError: (err) => toast.error(err.message),
  })

  // ── Local editable state ───────────────────────────────────────────
  const contentJson = report?.contentJson as ReportContentJson | null
  const [editedSummary, setEditedSummary] = useState("")
  const [editedLenses, setEditedLenses] = useState<Record<string, { currentState: string; ragJustification: string }>>({})
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle")
  const [showPreview, setShowPreview] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fadeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Sync from server data
  useEffect(() => {
    if (contentJson) {
      setEditedSummary(contentJson.executiveSummary ?? "")
      const lensEdits: Record<string, { currentState: string; ragJustification: string }> = {}
      for (const lens of contentJson.lenses) {
        lensEdits[lens.lens] = {
          currentState: lens.currentState ?? "",
          ragJustification: lens.ragJustification ?? "",
        }
      }
      setEditedLenses(lensEdits)
    }
  }, [contentJson])

  // ── Auto-save with debounce ────────────────────────────────────────
  const debouncedSave = useCallback(
    (updatedSummary: string, updatedLenses: Record<string, { currentState: string; ragJustification: string }>) => {
      if (!report?.id || !contentJson) return
      if (report.status === "PUBLISHED") return

      if (saveTimer.current) clearTimeout(saveTimer.current)
      if (fadeTimer.current) clearTimeout(fadeTimer.current)

      saveTimer.current = setTimeout(() => {
        setSaveState("saving")

        const updatedContentJson: ReportContentJson = {
          ...contentJson,
          executiveSummary: updatedSummary,
          lenses: contentJson.lenses.map((l) => ({
            ...l,
            currentState: updatedLenses[l.lens]?.currentState ?? l.currentState,
            ragJustification: updatedLenses[l.lens]?.ragJustification ?? l.ragJustification,
          })),
        }

        updateMutation.mutate(
          {
            reportId: report.id,
            executiveSummary: updatedSummary,
            contentJson: updatedContentJson as unknown as Record<string, unknown>,
          },
          {
            onSuccess: () => {
              setSaveState("saved")
              fadeTimer.current = setTimeout(() => setSaveState("idle"), 2000)
            },
            onError: () => {
              setSaveState("idle")
            },
          },
        )
      }, 500)
    },
    [report?.id, report?.status, contentJson, updateMutation],
  )

  const handleSummaryChange = (value: string) => {
    setEditedSummary(value)
    debouncedSave(value, editedLenses)
  }

  const handleLensFieldChange = (
    lens: string,
    field: "currentState" | "ragJustification",
    value: string,
  ) => {
    const updated = {
      ...editedLenses,
      [lens]: { ...editedLenses[lens], [field]: value },
    }
    setEditedLenses(updated)
    debouncedSave(editedSummary, updated)
  }

  const handleTransition = (targetStatus: "DRAFT" | "IN_REVIEW" | "PUBLISHED") => {
    if (!report?.id) return
    transitionMutation.mutate({ reportId: report.id, targetStatus })
  }

  const handleGenerate = () => {
    generateMutation.mutate({ auditSessionId: engagementId, engagementId })
  }

  const isLocked = report?.status === "PUBLISHED"

  // ── Build preview content ──────────────────────────────────────────
  const previewContent: ReportContentJson | null = contentJson
    ? {
        ...contentJson,
        executiveSummary: editedSummary,
        lenses: contentJson.lenses.map((l) => ({
          ...l,
          currentState: editedLenses[l.lens]?.currentState ?? l.currentState,
          ragJustification: editedLenses[l.lens]?.ragJustification ?? l.ragJustification,
        })),
      }
    : null

  // ── Loading state ──────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-shrink-0 border-b border-border bg-background px-6 py-4">
          <div className="flex items-center gap-4">
            <Skeleton className="h-8 w-8 rounded" />
            <Skeleton className="h-6 w-48" />
            <div className="ml-auto flex gap-2">
              <Skeleton className="h-9 w-24 rounded" />
              <Skeleton className="h-9 w-24 rounded" />
            </div>
          </div>
        </div>
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-0">
          <div className="p-6 space-y-4 border-r border-border">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-32 w-full rounded" />
            <Skeleton className="h-32 w-full rounded" />
          </div>
          <div className="p-6 space-y-4">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-48 w-full rounded" />
            <Skeleton className="h-32 w-full rounded" />
          </div>
        </div>
      </div>
    )
  }

  // ── Error state ────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="flex flex-col h-full">
        <TopBar engagementId={engagementId} router={router} />
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center space-y-4 max-w-md">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
            <h2 className="text-lg font-semibold">Failed to load report</h2>
            <p className="text-sm text-muted-foreground">
              {error.message || "An unexpected error occurred."}
            </p>
            <Button variant="outline" onClick={() => refetch()} className="min-h-[44px]">
              Retry
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // ── No report yet ──────────────────────────────────────────────────
  if (!report || !contentJson) {
    return (
      <div className="flex flex-col h-full">
        <TopBar engagementId={engagementId} router={router} />
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center space-y-4 max-w-md">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto" />
            <h2 className="text-lg font-semibold">No report generated yet</h2>
            <p className="text-sm text-muted-foreground">
              Generate an AI-powered audit report from the engagement data.
            </p>
            <Button
              onClick={handleGenerate}
              disabled={generateMutation.isPending}
              className="min-h-[44px]"
            >
              {generateMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              Generate Report
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // ── Generating state ───────────────────────────────────────────────
  if (report.status === "GENERATING") {
    return (
      <div className="flex flex-col h-full">
        <TopBar engagementId={engagementId} router={router} />
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center space-y-4 max-w-md">
            <Loader2 className="h-12 w-12 text-primary mx-auto animate-spin" />
            <h2 className="text-lg font-semibold">Generating report...</h2>
            <p className="text-sm text-muted-foreground">
              The AI is analysing the audit data and creating your report. This
              may take a minute.
            </p>
            <Button variant="outline" onClick={() => refetch()} className="min-h-[44px]">
              Refresh
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // ── Sort lenses ────────────────────────────────────────────────────
  const sortedLenses = [...contentJson.lenses].sort(
    (a, b) =>
      LENS_ORDER.indexOf(a.lens.toUpperCase()) -
      LENS_ORDER.indexOf(b.lens.toUpperCase()),
  )

  // ── Main editor ────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="flex-shrink-0 border-b border-border bg-background px-6 py-3">
        <div className="flex items-center gap-4 flex-wrap">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/admin/engagements/${engagementId}`)}
            className="min-h-[44px] -ml-2"
          >
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Back
          </Button>

          <Separator orientation="vertical" className="h-6" />

          <ReportStatusBar
            status={report.status as AuditReportStatus}
            publishedAt={report.publishedAt}
            onTransition={handleTransition}
            isPending={transitionMutation.isPending}
          />

          <div className="ml-auto flex items-center gap-2">
            {/* Save indicator */}
            {saveState === "saving" && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                Saving...
              </span>
            )}
            {saveState === "saved" && (
              <span className="text-xs text-emerald-600 flex items-center gap-1">
                <Check className="h-3 w-3" />
                Saved
              </span>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPreview(true)}
              className="min-h-[44px]"
            >
              <Eye className="h-4 w-4 mr-1.5" />
              Preview
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                window.open(
                  `/admin/engagements/${engagementId}/report/preview`,
                  "_blank",
                )
              }
              className="min-h-[44px]"
            >
              <FileText className="h-4 w-4 mr-1.5" />
              Full Preview
            </Button>
          </div>
        </div>
      </div>

      {/* Two-panel layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-0 overflow-hidden">
        {/* Left panel — Source data (read-only) */}
        <div className="border-r border-border overflow-y-auto p-6 space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Audit Source Data
          </h2>

          {sortedLenses.map((lens) => (
            <CollapsibleLensSource key={lens.lens} lens={lens} />
          ))}

          {/* Top findings */}
          {contentJson.topFindings.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Top Findings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {contentJson.topFindings.map((f, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 text-sm border-b border-border pb-2 last:border-0 last:pb-0"
                  >
                    <span className="text-muted-foreground font-mono text-xs mt-0.5">
                      {i + 1}.
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{f.finding}</p>
                      <p className="text-muted-foreground text-xs mt-0.5">
                        {f.impact}
                      </p>
                    </div>
                    {f.estimatedAnnualWaste != null && (
                      <span className="text-xs font-semibold text-destructive flex-shrink-0">
                        {formatCurrency(f.estimatedAnnualWaste)}/yr
                      </span>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Total waste */}
          {contentJson.totalEstimatedWaste > 0 && (
            <Card className="bg-destructive/5 border-destructive/20">
              <CardContent className="pt-4 text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                  Total Estimated Annual Waste
                </p>
                <p className="text-2xl font-bold text-destructive">
                  {formatCurrency(contentJson.totalEstimatedWaste)}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right panel — Editable report content */}
        <div className="overflow-y-auto p-6 space-y-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Report Content
          </h2>

          {/* Executive summary */}
          <div className="space-y-2">
            <Label htmlFor="executive-summary" className="text-sm font-medium">
              Executive Summary
            </Label>
            <Textarea
              id="executive-summary"
              value={editedSummary}
              onChange={(e) => handleSummaryChange(e.target.value)}
              rows={8}
              className="text-sm"
              disabled={isLocked}
              placeholder="Write an executive summary of the audit findings..."
            />
          </div>

          <Separator />

          {/* Per-lens editable sections */}
          {sortedLenses.map((lens) => (
            <EditableLensSection
              key={lens.lens}
              lens={lens}
              editedCurrentState={editedLenses[lens.lens]?.currentState ?? ""}
              editedRagJustification={editedLenses[lens.lens]?.ragJustification ?? ""}
              onCurrentStateChange={(v) =>
                handleLensFieldChange(lens.lens, "currentState", v)
              }
              onRagJustificationChange={(v) =>
                handleLensFieldChange(lens.lens, "ragJustification", v)
              }
              disabled={isLocked}
            />
          ))}

          <Separator />

          {/* Implementation roadmap (read-only display) */}
          {contentJson.implementationRoadmap.length > 0 && (
            <div className="space-y-3">
              <Label className="text-sm font-medium">Implementation Roadmap</Label>
              {contentJson.implementationRoadmap.map((phase) => (
                <Card key={phase.phase}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                        {phase.phase}
                      </span>
                      {phase.name}
                      {phase.estimatedDuration && (
                        <Badge variant="outline" className="ml-auto text-xs">
                          {phase.estimatedDuration}
                        </Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    {phase.description && <p className="mb-2">{phase.description}</p>}
                    {phase.recommendations.length > 0 && (
                      <ul className="space-y-1">
                        {phase.recommendations.map((r, i) => (
                          <li key={i} className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground flex-shrink-0" />
                            <span className="flex-1">{r.action}</span>
                            <span className="text-xs">{r.estimatedEffort}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Preview dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto p-0">
          <DialogHeader className="px-6 pt-6 pb-0">
            <DialogTitle>Report Preview</DialogTitle>
          </DialogHeader>
          <div className="px-2 pb-2">
            {previewContent && <BrandedReport content={previewContent} />}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/* ─── Sub-components ───────────────────────────────────────────────── */

function TopBar({
  engagementId,
  router,
}: {
  engagementId: string
  router: ReturnType<typeof useRouter>
}) {
  return (
    <div className="flex-shrink-0 border-b border-border bg-background px-6 py-3">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.push(`/admin/engagements/${engagementId}`)}
        className="min-h-[44px] -ml-2"
      >
        <ArrowLeft className="h-4 w-4 mr-1.5" />
        Back to Engagement
      </Button>
    </div>
  )
}

function CollapsibleLensSource({ lens }: { lens: ReportLensSection }) {
  const [open, setOpen] = useState(false)
  const ragStyle = RAG_BADGE_STYLES[lens.ragScore?.toUpperCase()] ?? ""

  return (
    <Card>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/50 transition-colors min-h-[44px]"
      >
        {open ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        )}
        <span className="font-medium text-sm flex-1">{lens.lens}</span>
        {lens.ragScore && (
          <Badge className={ragStyle}>{lens.ragScore}</Badge>
        )}
      </button>

      {open && (
        <CardContent className="pt-0 space-y-4">
          {lens.ragJustification && (
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                RAG Justification
              </p>
              <p className="text-sm">{lens.ragJustification}</p>
            </div>
          )}
          {lens.currentState && (
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                Current State
              </p>
              <p className="text-sm whitespace-pre-line">{lens.currentState}</p>
            </div>
          )}
          {lens.findings.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
                Findings ({lens.findings.length})
              </p>
              {lens.findings.map((f, i) => (
                <div
                  key={i}
                  className="text-sm border-b border-border pb-2 mb-2 last:border-0 last:pb-0 last:mb-0"
                >
                  <p className="font-medium">{f.finding}</p>
                  <p className="text-xs text-muted-foreground">{f.impact}</p>
                </div>
              ))}
            </div>
          )}
          {lens.recommendations.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
                Recommendations ({lens.recommendations.length})
              </p>
              {lens.recommendations.map((r, i) => (
                <div
                  key={i}
                  className="text-sm border-b border-border pb-2 mb-2 last:border-0 last:pb-0 last:mb-0"
                >
                  <p className="font-medium">{r.action}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.estimatedEffort}
                    {r.estimatedCost != null && ` | ${formatCurrency(r.estimatedCost)}`}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}

function EditableLensSection({
  lens,
  editedCurrentState,
  editedRagJustification,
  onCurrentStateChange,
  onRagJustificationChange,
  disabled,
}: {
  lens: ReportLensSection
  editedCurrentState: string
  editedRagJustification: string
  onCurrentStateChange: (v: string) => void
  onRagJustificationChange: (v: string) => void
  disabled: boolean
}) {
  const ragStyle = RAG_BADGE_STYLES[lens.ragScore?.toUpperCase()] ?? ""

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold">{lens.lens}</h3>
        {lens.ragScore && (
          <Badge className={ragStyle}>{lens.ragScore}</Badge>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`${lens.lens}-state`} className="text-xs text-muted-foreground">
          Current State
        </Label>
        <Textarea
          id={`${lens.lens}-state`}
          value={editedCurrentState}
          onChange={(e) => onCurrentStateChange(e.target.value)}
          rows={4}
          className="text-sm"
          disabled={disabled}
          placeholder="Describe the current state..."
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`${lens.lens}-rag`} className="text-xs text-muted-foreground">
          RAG Justification
        </Label>
        <Textarea
          id={`${lens.lens}-rag`}
          value={editedRagJustification}
          onChange={(e) => onRagJustificationChange(e.target.value)}
          rows={2}
          className="text-sm"
          disabled={disabled}
          placeholder="Justify the RAG score..."
        />
      </div>
    </div>
  )
}
