"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { api } from "@/lib/trpc/react"
import { CallNotesPanel } from "@/components/consulting/audit/call-notes-panel"
import { LensAnalysisPanel } from "@/components/consulting/audit/lens-analysis-panel"
import { ReadinessPanel } from "@/components/consulting/audit/readiness-panel"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { ArrowLeft, FileText, AlertCircle } from "lucide-react"

type WorkspaceMode = "capture" | "processing" | "readiness"

const MODES: { value: WorkspaceMode; label: string }[] = [
  { value: "capture", label: "Capture" },
  { value: "processing", label: "Processing" },
  { value: "readiness", label: "Report Ready" },
]

export default function AuditWorkspacePage() {
  const params = useParams()
  const router = useRouter()
  const engagementId = params.id as string
  const utils = api.useUtils()

  const [mode, setMode] = useState<WorkspaceMode>("capture")

  // ── Get or create session ───────────────────────────────────────────
  const {
    data: session,
    isLoading: sessionLoading,
    error: sessionError,
  } = api.auditWorkspace.getByEngagement.useQuery(
    { engagementId },
    { retry: false }
  )

  const createSessionMutation = api.auditWorkspace.createSession.useMutation({
    onSuccess: () => {
      utils.auditWorkspace.getByEngagement.invalidate({ engagementId })
    },
  })

  // ── Full session data ───────────────────────────────────────────────
  const {
    data: fullSession,
    isLoading: fullLoading,
  } = api.auditWorkspace.getFull.useQuery(
    { auditSessionId: session?.id ?? "" },
    { enabled: !!session?.id }
  )

  // ── Validation ──────────────────────────────────────────────────────
  const {
    data: validation,
    isLoading: validationLoading,
  } = api.auditWorkspace.validateReadiness.useQuery(
    { auditSessionId: session?.id ?? "" },
    { enabled: !!session?.id }
  )

  // ── Mutations ───────────────────────────────────────────────────────
  const invalidateFull = () => {
    if (session?.id) {
      utils.auditWorkspace.getFull.invalidate({ auditSessionId: session.id })
      utils.auditWorkspace.validateReadiness.invalidate({ auditSessionId: session.id })
    }
  }

  const updateCallNotesMutation = api.auditWorkspace.updateCallNotes.useMutation({
    onSuccess: invalidateFull,
  })

  const upsertLensMutation = api.auditWorkspace.upsertLens.useMutation({
    onSuccess: invalidateFull,
  })

  const createFindingMutation = api.auditWorkspace.createFinding.useMutation({
    onSuccess: invalidateFull,
  })

  const updateFindingMutation = api.auditWorkspace.updateFinding.useMutation({
    onSuccess: invalidateFull,
  })

  const deleteFindingMutation = api.auditWorkspace.deleteFinding.useMutation({
    onSuccess: invalidateFull,
  })

  const createRecommendationMutation = api.auditWorkspace.createRecommendation.useMutation({
    onSuccess: invalidateFull,
  })

  const updateRecommendationMutation = api.auditWorkspace.updateRecommendation.useMutation({
    onSuccess: invalidateFull,
  })

  const deleteRecommendationMutation = api.auditWorkspace.deleteRecommendation.useMutation({
    onSuccess: invalidateFull,
  })

  const markReadyMutation = api.auditWorkspace.markReadyForReport.useMutation({
    onSuccess: () => {
      invalidateFull()
      utils.auditWorkspace.getByEngagement.invalidate({ engagementId })
    },
  })

  // ── Loading state ───────────────────────────────────────────────────
  if (sessionLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  // ── No session — offer to create ───────────────────────────────────
  if (sessionError || !session) {
    return (
      <div className="space-y-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/admin/engagements/${engagementId}`)}
        >
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Back to Engagement
        </Button>

        <div className="flex flex-col items-center justify-center py-16 space-y-4">
          <FileText className="h-12 w-12 text-muted-foreground opacity-40" />
          <h2 className="text-lg font-semibold">No Audit Session</h2>
          <p className="text-sm text-muted-foreground max-w-md text-center">
            Create an audit session to start capturing call notes, analyzing lenses, and building the report.
          </p>
          <Button
            onClick={() => createSessionMutation.mutate({ engagementId })}
            disabled={createSessionMutation.isPending}
          >
            <FileText className="mr-1.5 h-4 w-4" />
            {createSessionMutation.isPending ? "Creating..." : "Create Audit Session"}
          </Button>
          {createSessionMutation.error && (
            <div className="flex items-center gap-2 text-sm text-red-600">
              <AlertCircle className="h-4 w-4" />
              {createSessionMutation.error.message}
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── Main workspace ─────────────────────────────────────────────────
  const isLoading = fullLoading

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/admin/engagements/${engagementId}`)}
        >
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Back to Engagement
        </Button>
        <div className="text-xs text-muted-foreground">
          Session: {session.status.replace(/_/g, " ").toLowerCase()}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <h1 className="text-xl font-semibold tracking-tight">Audit Workspace</h1>
      </div>

      <Separator />

      {/* Mode switcher */}
      <div className="flex gap-1 bg-muted rounded-lg p-1 w-fit">
        {MODES.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            onClick={() => setMode(value)}
            className={cn(
              "rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
              mode === value
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : (
        <>
          {mode === "capture" && fullSession && (
            <CallNotesPanel
              callNotes={fullSession.callNotes}
              auditSessionId={session.id}
              onSaveNotes={(data) => updateCallNotesMutation.mutate(data)}
            />
          )}

          {mode === "processing" && fullSession && (
            <LensAnalysisPanel
              lenses={fullSession.lenses}
              auditSessionId={session.id}
              onUpsertLens={(data) => upsertLensMutation.mutate(data)}
              onCreateFinding={(data) => createFindingMutation.mutate(data)}
              onUpdateFinding={(data) => updateFindingMutation.mutate(data)}
              onDeleteFinding={(id) => deleteFindingMutation.mutate({ id })}
              onCreateRecommendation={(data) => createRecommendationMutation.mutate(data)}
              onUpdateRecommendation={(data) => updateRecommendationMutation.mutate(data)}
              onDeleteRecommendation={(id) => deleteRecommendationMutation.mutate({ id })}
            />
          )}

          {mode === "readiness" && (
            <ReadinessPanel
              validation={validation}
              isValidating={validationLoading}
              onMarkReady={() => markReadyMutation.mutate({ auditSessionId: session.id })}
              isMarking={markReadyMutation.isPending}
              sessionStatus={session.status}
            />
          )}
        </>
      )}
    </div>
  )
}
