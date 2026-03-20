"use client"

import { useState, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  Plus,
  ChevronRight,
  X,
  Users,
  PoundSterling,
  ArrowRight,
  MoreHorizontal,
  Loader2,
} from "lucide-react"
import { api } from "@/lib/trpc/react"
import { PageHeader } from "@/components/ui/page-header"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import type {
  PipelineStageRecord,
  PipelineMemberWithCustomer,
  PipelineStageSummary,
} from "@/modules/pipeline/pipeline.types"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatTimeAgo(date: Date | string | null | undefined): string {
  if (!date) return ""
  const d = typeof date === "string" ? new Date(date) : date
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffDays = Math.floor(Math.abs(diffMs) / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return "today"
  if (diffDays === 1) return "1d ago"
  if (diffDays < 7) return `${diffDays}d ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`
  return `${Math.floor(diffDays / 365)}y ago`
}

function hexToBgStyle(hex: string | null): React.CSSProperties {
  if (!hex) return {}
  return { backgroundColor: `${hex}15` }
}

function hexToTextStyle(hex: string | null): React.CSSProperties {
  if (!hex) return {}
  return { color: hex }
}

// ---------------------------------------------------------------------------
// Add to Pipeline Dialog
// ---------------------------------------------------------------------------

function AddToPipelineDialog({
  open,
  onOpenChange,
  pipelineId,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  pipelineId: string
  onSuccess: () => void
}) {
  const [customerId, setCustomerId] = useState("")
  const [dealValue, setDealValue] = useState("")

  const addMember = api.pipeline.addMember.useMutation({
    onSuccess: () => {
      toast.success("Added to pipeline")
      onOpenChange(false)
      resetForm()
      onSuccess()
    },
    onError: (err) => {
      toast.error(err.message || "Failed to add to pipeline")
    },
  })

  function resetForm() {
    setCustomerId("")
    setDealValue("")
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!customerId.trim()) return

    addMember.mutate({
      pipelineId,
      customerId: customerId.trim(),
      dealValue: dealValue ? Number(dealValue) : undefined,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add to Pipeline</DialogTitle>
          <DialogDescription>
            Add a customer to the pipeline. They will start in the first open stage.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="customerId">Customer ID</Label>
            <Input
              id="customerId"
              placeholder="Customer UUID"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dealValue">Deal Value</Label>
            <Input
              id="dealValue"
              type="number"
              placeholder="0"
              min="0"
              step="1"
              value={dealValue}
              onChange={(e) => setDealValue(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={addMember.isPending}>
              {addMember.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              Add to Pipeline
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Move Member Dialog
// ---------------------------------------------------------------------------

function MoveMemberDialog({
  open,
  onOpenChange,
  member,
  targetStage,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  member: PipelineMemberWithCustomer | null
  targetStage: PipelineStageRecord | null
  onSuccess: () => void
}) {
  const [lostReason, setLostReason] = useState("")
  const [dealValue, setDealValue] = useState("")
  const [notes, setNotes] = useState("")

  const moveMember = api.pipeline.moveMember.useMutation({
    onSuccess: () => {
      toast.success(
        targetStage?.type === "LOST"
          ? "Marked as lost"
          : `Moved to ${targetStage?.name}`
      )
      onOpenChange(false)
      setLostReason("")
      setDealValue("")
      setNotes("")
      onSuccess()
    },
    onError: (err) => {
      toast.error(err.message || "Failed to move member")
    },
  })

  if (!member || !targetStage) return null

  const isLost = targetStage.type === "LOST"
  const isWon = targetStage.type === "WON"

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!member || !targetStage) return

    moveMember.mutate({
      memberId: member.id,
      toStageId: targetStage.id,
      lostReason: isLost ? lostReason.trim() || undefined : undefined,
      dealValue: dealValue ? Number(dealValue) : undefined,
      notes: notes.trim() || undefined,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isLost ? "Mark as Lost" : `Move to ${targetStage.name}`}
          </DialogTitle>
          <DialogDescription>
            {isLost
              ? `Mark ${member.customerName} as lost. Optionally provide a reason.`
              : `Move ${member.customerName} to the ${targetStage.name} stage.`}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {isLost && (
            <div className="space-y-1.5">
              <Label htmlFor="lostReason">Reason (optional)</Label>
              <Input
                id="lostReason"
                placeholder="e.g. budget constraints, chose competitor"
                value={lostReason}
                onChange={(e) => setLostReason(e.target.value)}
              />
            </div>
          )}
          {(isWon || isLost) && (
            <div className="space-y-1.5">
              <Label htmlFor="moveDialogDealValue">
                Deal Value {isWon ? "" : "(optional)"}
              </Label>
              <Input
                id="moveDialogDealValue"
                type="number"
                placeholder={
                  member.dealValue
                    ? String(member.dealValue)
                    : "0"
                }
                min="0"
                step="1"
                value={dealValue}
                onChange={(e) => setDealValue(e.target.value)}
              />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Input
              id="notes"
              placeholder="Add a note about this move"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={moveMember.isPending}
              variant={isLost ? "destructive" : "default"}
            >
              {moveMember.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              {isLost ? "Mark as Lost" : "Move"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Member Card
// ---------------------------------------------------------------------------

function MemberCard({
  member,
  stages,
  currentStage,
  onMove,
}: {
  member: PipelineMemberWithCustomer
  stages: PipelineStageRecord[]
  currentStage: PipelineStageRecord
  onMove: (member: PipelineMemberWithCustomer, targetStage: PipelineStageRecord) => void
}) {
  const router = useRouter()

  const transitionStages = useMemo(() => {
    const stageMap = new Map(stages.map((s) => [s.id, s]))
    return currentStage.allowedTransitions
      .map((id) => stageMap.get(id))
      .filter((s): s is PipelineStageRecord => !!s)
  }, [stages, currentStage])

  const nonLostTransitions = transitionStages.filter((s) => s.type !== "LOST")
  const lostTransition = transitionStages.find((s) => s.type === "LOST")

  return (
    <div
      className="rounded-lg border border-border bg-card p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
      onClick={() => router.push(`/admin/customers?view=${member.customerId}`)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter") router.push(`/admin/customers?view=${member.customerId}`)
      }}
      aria-label={`View ${member.customerName}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground truncate">
            {member.customerName}
          </p>
          {member.customerEmail && (
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {member.customerEmail}
            </p>
          )}
        </div>
        <div onClick={(e) => e.stopPropagation()}>
          {transitionStages.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label={`Actions for ${member.customerName}`}
                >
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {nonLostTransitions.map((stage) => (
                  <DropdownMenuItem
                    key={stage.id}
                    onClick={() => onMove(member, stage)}
                  >
                    <ArrowRight className="h-3.5 w-3.5 mr-2" />
                    Move to {stage.name}
                  </DropdownMenuItem>
                ))}
                {lostTransition && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => onMove(member, lostTransition)}
                      className="text-destructive focus:text-destructive"
                    >
                      <X className="h-3.5 w-3.5 mr-2" />
                      Mark as Lost
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {member.dealValue != null && member.dealValue > 0 && (
        <p className="text-xs font-semibold text-emerald-600 mt-2">
          {formatCurrency(member.dealValue)}
        </p>
      )}

      <div className="flex items-center gap-2 mt-2 flex-wrap">
        {member.enteredStageAt && (
          <span className="text-[10px] text-muted-foreground">
            {formatTimeAgo(member.enteredStageAt)}
          </span>
        )}
      </div>

      {member.customerTags && member.customerTags.length > 0 && (
        <div className="flex gap-1 mt-2 flex-wrap">
          {member.customerTags.slice(0, 3).map((tag) => (
            <Badge
              key={tag}
              variant="secondary"
              className="text-[9px] px-1.5 py-0"
            >
              {tag}
            </Badge>
          ))}
          {member.customerTags.length > 3 && (
            <span className="text-[9px] text-muted-foreground">
              +{member.customerTags.length - 3}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Pipeline Column
// ---------------------------------------------------------------------------

function PipelineColumn({
  stage,
  members,
  stages,
  summary,
  isLoading,
  onMove,
}: {
  stage: PipelineStageRecord
  members: PipelineMemberWithCustomer[]
  stages: PipelineStageRecord[]
  summary: PipelineStageSummary | null
  isLoading: boolean
  onMove: (member: PipelineMemberWithCustomer, targetStage: PipelineStageRecord) => void
}) {
  const count = summary?.count ?? members.length
  const totalDealValue = summary?.totalDealValue ?? 0

  return (
    <div className="flex flex-col min-w-[280px] max-w-[280px] shrink-0">
      <div
        className="rounded-t-lg px-3 py-2.5 bg-muted/50"
        style={{ borderTop: `2px solid ${stage.color ?? "#94a3b8"}` }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">
              {stage.name}
            </span>
            <span
              className="text-[10px] font-semibold rounded-full px-1.5 py-0.5"
              style={{ ...hexToBgStyle(stage.color), ...hexToTextStyle(stage.color) }}
            >
              {count}
            </span>
          </div>
        </div>
        {totalDealValue > 0 && (
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {formatCurrency(totalDealValue)}
          </p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto rounded-b-lg border border-t-0 border-border bg-muted/20 p-2 space-y-2 min-h-[200px] max-h-[calc(100vh-320px)] scrollbar-thin">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-lg border border-border bg-card p-3 space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-3 w-16" />
            </div>
          ))
        ) : members.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <p className="text-xs text-muted-foreground">No members</p>
          </div>
        ) : (
          members.map((member) => (
            <MemberCard
              key={member.id}
              member={member}
              stages={stages}
              currentStage={stage}
              onMove={onMove}
            />
          ))
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function PipelinePage() {
  const utils = api.useUtils()

  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [moveDialog, setMoveDialog] = useState<{
    open: boolean
    member: PipelineMemberWithCustomer | null
    targetStage: PipelineStageRecord | null
  }>({ open: false, member: null, targetStage: null })

  // Fetch default pipeline with stages
  const pipelineQuery = api.pipeline.getDefault.useQuery()
  const pipeline = pipelineQuery.data
  const stages = useMemo(
    () => (pipeline?.stages ?? []).sort((a, b) => a.position - b.position),
    [pipeline],
  )

  // Fetch members and summary
  const membersQuery = api.pipeline.listMembers.useQuery(
    { pipelineId: pipeline?.id ?? "" },
    { enabled: !!pipeline?.id },
  )
  const summaryQuery = api.pipeline.getSummary.useQuery(
    { pipelineId: pipeline?.id ?? "" },
    { enabled: !!pipeline?.id },
  )

  const isLoading = pipelineQuery.isLoading || membersQuery.isLoading || summaryQuery.isLoading
  const allMembers = (membersQuery.data ?? []) as PipelineMemberWithCustomer[]

  // Quick move for non-terminal stages
  const quickMove = api.pipeline.moveMember.useMutation({
    onSuccess: () => {
      toast.success("Member moved")
      invalidateAll()
    },
    onError: (err) => {
      toast.error(err.message || "Failed to move member")
    },
  })

  function invalidateAll() {
    void utils.pipeline.getDefault.invalidate()
    void utils.pipeline.listMembers.invalidate()
    void utils.pipeline.getSummary.invalidate()
  }

  const handleMove = useCallback(
    (member: PipelineMemberWithCustomer, targetStage: PipelineStageRecord) => {
      if (targetStage.type === "LOST" || targetStage.type === "WON") {
        setMoveDialog({ open: true, member, targetStage })
        return
      }
      quickMove.mutate({
        memberId: member.id,
        toStageId: targetStage.id,
      })
    },
    [quickMove],
  )

  // Build summary lookup
  const summaryMap = useMemo(() => {
    const map = new Map<string, PipelineStageSummary>()
    if (summaryQuery.data) {
      for (const row of summaryQuery.data) {
        map.set(row.stageId, row)
      }
    }
    return map
  }, [summaryQuery.data])

  // Group members by stage
  const membersByStage = useMemo(() => {
    const map = new Map<string, PipelineMemberWithCustomer[]>()
    for (const stage of stages) {
      map.set(stage.id, [])
    }
    for (const member of allMembers) {
      const arr = map.get(member.stageId)
      if (arr) arr.push(member)
    }
    return map
  }, [stages, allMembers])

  // Calculate totals
  const totalMembers = allMembers.length
  const totalDealValue = allMembers.reduce(
    (sum, m) => sum + (m.dealValue ?? 0),
    0,
  )

  const wonStages = stages.filter((s) => s.type === "WON")
  const lostStages = stages.filter((s) => s.type === "LOST")

  const wonCount = wonStages.reduce((sum, s) => sum + (summaryMap.get(s.id)?.count ?? 0), 0)
  const wonValue = wonStages.reduce((sum, s) => sum + (summaryMap.get(s.id)?.totalDealValue ?? 0), 0)
  const lostCount = lostStages.reduce((sum, s) => sum + (summaryMap.get(s.id)?.count ?? 0), 0)
  const lostValue = lostStages.reduce((sum, s) => sum + (summaryMap.get(s.id)?.totalDealValue ?? 0), 0)

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={pipeline?.name ?? "Pipeline"}
        description="Track consulting leads through pipeline stages."
      >
        <Button
          size="sm"
          onClick={() => setAddDialogOpen(true)}
          aria-label="Add to pipeline"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add to Pipeline
        </Button>
      </PageHeader>

      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="space-y-0.5">
                <p className="text-xs text-muted-foreground">Total Members</p>
                <p className="text-xl font-semibold tracking-tight">
                  {isLoading ? "--" : totalMembers}
                </p>
              </div>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10">
                <Users className="h-4 w-4 text-violet-500" aria-hidden="true" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="space-y-0.5">
                <p className="text-xs text-muted-foreground">Total Deal Value</p>
                <p className="text-xl font-semibold tracking-tight">
                  {isLoading ? "--" : formatCurrency(totalDealValue)}
                </p>
              </div>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10">
                <PoundSterling className="h-4 w-4 text-emerald-500" aria-hidden="true" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="space-y-0.5">
                <p className="text-xs text-muted-foreground">Won</p>
                <p className="text-xl font-semibold tracking-tight">
                  {isLoading ? "--" : wonCount}
                </p>
              </div>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10">
                <ChevronRight className="h-4 w-4 text-emerald-500" aria-hidden="true" />
              </div>
            </div>
            {!isLoading && wonValue > 0 && (
              <p className="mt-1 text-[10px] text-muted-foreground">
                {formatCurrency(wonValue)}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="space-y-0.5">
                <p className="text-xs text-muted-foreground">Lost</p>
                <p className="text-xl font-semibold tracking-tight">
                  {isLoading ? "--" : lostCount}
                </p>
              </div>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/10">
                <X className="h-4 w-4 text-red-500" aria-hidden="true" />
              </div>
            </div>
            {!isLoading && lostValue > 0 && (
              <p className="mt-1 text-[10px] text-muted-foreground">
                {formatCurrency(lostValue)} lost value
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Kanban board */}
      <div className="overflow-x-auto pb-4 -mx-6 px-6 scrollbar-thin">
        <div className="flex gap-3 min-w-max">
          {stages.map((stage) => (
            <PipelineColumn
              key={stage.id}
              stage={stage}
              members={membersByStage.get(stage.id) ?? []}
              stages={stages}
              summary={summaryMap.get(stage.id) ?? null}
              isLoading={isLoading}
              onMove={handleMove}
            />
          ))}
        </div>
      </div>

      {/* Dialogs */}
      {pipeline && (
        <AddToPipelineDialog
          open={addDialogOpen}
          onOpenChange={setAddDialogOpen}
          pipelineId={pipeline.id}
          onSuccess={invalidateAll}
        />
      )}

      <MoveMemberDialog
        open={moveDialog.open}
        onOpenChange={(open) =>
          setMoveDialog((prev) => ({ ...prev, open }))
        }
        member={moveDialog.member}
        targetStage={moveDialog.targetStage}
        onSuccess={invalidateAll}
      />
    </div>
  )
}
