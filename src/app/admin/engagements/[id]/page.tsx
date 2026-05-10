"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { api } from "@/lib/trpc/react"
import { StageBadge } from "@/components/consulting/stage-badge"
import { StageTransitionButtons } from "@/components/consulting/stage-transition-buttons"
import { QualificationForm } from "@/components/consulting/qualification-form"
import type { QualificationData } from "@/components/consulting/qualification-form"
import type { EngagementStage } from "@/components/consulting/stage-badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import {
  ArrowLeft,
  Calendar,
  ExternalLink,
  FolderOpen,
  LayoutGrid,
  Save,
} from "lucide-react"

function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "--"
  const d = typeof date === "string" ? new Date(date) : date
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
}

function toInputDate(date: Date | string | null | undefined): string {
  if (!date) return ""
  const d = typeof date === "string" ? new Date(date) : date
  return d.toISOString().split("T")[0]
}

export default function EngagementDetailPage() {
  const params = useParams()
  const router = useRouter()
  const engagementId = params.id as string
  const utils = api.useUtils()

  // ── Queries ──────────────────────────────────────────────────────────
  const { data: listData, isLoading } = api.consulting.list.useQuery(
    { limit: 100 },
    { enabled: !!engagementId }
  )

  // Find this engagement from the list
  const engagement = listData?.rows.find((e) => e.id === engagementId) ?? null

  const { data: integrationStatus } = api.consulting.integrationStatus.useQuery(
    { engagementId },
    { enabled: !!engagementId }
  )

  // ── Mutations ────────────────────────────────────────────────────────
  const transitionMutation = api.consulting.transitionStage.useMutation({
    onSuccess: () => utils.consulting.list.invalidate(),
  })

  const updateNotesMutation = api.consulting.updateDiscoveryNotes.useMutation({
    onSuccess: () => utils.consulting.list.invalidate(),
  })

  const setAuditWindowMutation = api.consulting.setAuditWindow.useMutation({
    onSuccess: () => utils.consulting.list.invalidate(),
  })

  const createPlaneMutation = api.consulting.createPlaneProject.useMutation({
    onSuccess: () => utils.consulting.integrationStatus.invalidate(),
  })

  const createDriveMutation = api.consulting.createDriveFolder.useMutation({
    onSuccess: () => utils.consulting.integrationStatus.invalidate(),
  })

  // ── Local state ──────────────────────────────────────────────────────
  const [discoveryNotes, setDiscoveryNotes] = useState<string | null>(null)
  const [auditStart, setAuditStart] = useState("")
  const [auditEnd, setAuditEnd] = useState("")
  const [auditDirty, setAuditDirty] = useState(false)

  // Initialize local state from engagement data
  const notes = discoveryNotes ?? (engagement?.discoveryNotes as string | null) ?? ""
  const qualData = engagement?.qualificationData as QualificationData | null

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!engagement) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => router.push("/admin/engagements")}>
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Back
        </Button>
        <p className="text-muted-foreground">Engagement not found.</p>
      </div>
    )
  }

  const handleTransition = (targetStage: EngagementStage, transitionNotes?: string) => {
    transitionMutation.mutate({
      engagementId,
      targetStage,
      notes: transitionNotes,
    })
  }

  const handleSaveNotes = () => {
    updateNotesMutation.mutate({
      engagementId,
      notes,
    })
  }

  const handleSaveNotesWithQual = (qual: QualificationData) => {
    updateNotesMutation.mutate({
      engagementId,
      notes,
      qualificationData: qual,
    })
  }

  const handleSaveAuditWindow = () => {
    if (!auditStart || !auditEnd) return
    setAuditWindowMutation.mutate({
      engagementId,
      startDate: auditStart,
      endDate: auditEnd,
    })
    setAuditDirty(false)
  }

  const currentAuditStart = auditDirty ? auditStart : toInputDate(engagement.auditWindowStart)
  const currentAuditEnd = auditDirty ? auditEnd : toInputDate(engagement.auditWindowEnd)

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Button variant="ghost" size="sm" onClick={() => router.push("/admin/engagements")}>
        <ArrowLeft className="mr-1.5 h-4 w-4" />
        Back to Engagements
      </Button>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">{engagement.title}</h1>
            <StageBadge stage={engagement.stage} />
          </div>
          {engagement.description && (
            <p className="text-sm text-muted-foreground">{engagement.description}</p>
          )}
        </div>
      </div>

      {/* Stage transition */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground mr-1">Move to:</span>
        <StageTransitionButtons
          currentStage={engagement.stage}
          onTransition={handleTransition}
          isLoading={transitionMutation.isPending}
        />
      </div>

      <Separator />

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="discovery">Discovery Notes</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
        </TabsList>

        {/* ── Overview Tab ──────────────────────────────────────────── */}
        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Qualification summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Qualification Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {qualData ? (
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <dt className="text-muted-foreground">Revenue</dt>
                    <dd>{qualData.revenue ?? "--"}</dd>
                    <dt className="text-muted-foreground">Team Size</dt>
                    <dd>{qualData.teamSize ?? "--"}</dd>
                    <dt className="text-muted-foreground">Industry</dt>
                    <dd>{qualData.industry ?? "--"}</dd>
                    <dt className="text-muted-foreground">Decision Maker</dt>
                    <dd>{qualData.decisionMaker ? "Yes" : "No"}</dd>
                    <dt className="text-muted-foreground">Pain Points</dt>
                    <dd>
                      {qualData.painPoints.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {qualData.painPoints.map((p, i) => (
                            <span
                              key={i}
                              className="inline-block rounded bg-muted px-1.5 py-0.5 text-xs"
                            >
                              {p}
                            </span>
                          ))}
                        </div>
                      ) : (
                        "--"
                      )}
                    </dd>
                  </dl>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No qualification data yet. Add it in the Discovery Notes tab.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Audit window */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Audit Window
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {engagement.auditWindowStart && engagement.auditWindowEnd && !auditDirty ? (
                  <div className="space-y-2">
                    <p className="text-sm">
                      {formatDate(engagement.auditWindowStart)} &mdash;{" "}
                      {formatDate(engagement.auditWindowEnd)}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setAuditStart(toInputDate(engagement.auditWindowStart))
                        setAuditEnd(toInputDate(engagement.auditWindowEnd))
                        setAuditDirty(true)
                      }}
                    >
                      Edit
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Start</Label>
                        <Input
                          type="date"
                          value={currentAuditStart}
                          onChange={(e) => {
                            setAuditStart(e.target.value)
                            setAuditDirty(true)
                          }}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">End</Label>
                        <Input
                          type="date"
                          value={currentAuditEnd}
                          onChange={(e) => {
                            setAuditEnd(e.target.value)
                            setAuditDirty(true)
                          }}
                        />
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={handleSaveAuditWindow}
                      disabled={!currentAuditStart || !currentAuditEnd || setAuditWindowMutation.isPending}
                    >
                      <Save className="mr-1.5 h-3.5 w-3.5" />
                      Save Audit Window
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Engagement details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Details</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2 text-sm">
                <dt className="text-muted-foreground">Type</dt>
                <dd className="capitalize">{engagement.type?.toLowerCase() ?? "--"}</dd>
                <dt className="text-muted-foreground">Status</dt>
                <dd className="capitalize">{engagement.status?.toLowerCase() ?? "--"}</dd>
                <dt className="text-muted-foreground">Created</dt>
                <dd>{formatDate(engagement.createdAt)}</dd>
                <dt className="text-muted-foreground">Updated</dt>
                <dd>{formatDate(engagement.updatedAt)}</dd>
              </dl>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Discovery Notes Tab ───────────────────────────────────── */}
        <TabsContent value="discovery" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Discovery Notes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                value={notes}
                onChange={(e) => setDiscoveryNotes(e.target.value)}
                placeholder="Notes from discovery calls, research, observations..."
                rows={8}
                className="font-mono text-sm"
              />
              <Button
                size="sm"
                onClick={handleSaveNotes}
                disabled={updateNotesMutation.isPending}
              >
                <Save className="mr-1.5 h-3.5 w-3.5" />
                Save Notes
              </Button>
            </CardContent>
          </Card>

          <QualificationForm
            data={qualData}
            onSave={handleSaveNotesWithQual}
            isLoading={updateNotesMutation.isPending}
          />
        </TabsContent>

        {/* ── Integrations Tab ──────────────────────────────────────── */}
        <TabsContent value="integrations" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Plane.so */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <LayoutGrid className="h-4 w-4" />
                  Plane.so Project
                </CardTitle>
              </CardHeader>
              <CardContent>
                {integrationStatus?.plane.connected ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
                      <span className="text-sm font-medium">Connected</span>
                    </div>
                    {integrationStatus.plane.projectUrl && (
                      <a
                        href={integrationStatus.plane.projectUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                      >
                        Open in Plane
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">No Plane project linked.</p>
                    <p className="text-xs text-muted-foreground">
                      Create a project from an audit session to track implementation tasks.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Google Drive */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FolderOpen className="h-4 w-4" />
                  Google Drive
                </CardTitle>
              </CardHeader>
              <CardContent>
                {integrationStatus?.drive.connected ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
                      <span className="text-sm font-medium">Connected</span>
                    </div>
                    {integrationStatus.drive.folderUrl && (
                      <a
                        href={integrationStatus.drive.folderUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                      >
                        Open in Drive
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">No Drive folder linked.</p>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={createDriveMutation.isPending}
                      onClick={() =>
                        createDriveMutation.mutate({
                          engagementId,
                          companyName: engagement.title,
                        })
                      }
                    >
                      <FolderOpen className="mr-1.5 h-3.5 w-3.5" />
                      Create Drive Folder
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
