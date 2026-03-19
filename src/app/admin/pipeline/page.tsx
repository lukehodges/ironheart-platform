"use client"

import { useState, useCallback } from "react"
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
import type { PipelineStage, CustomerRecord } from "@/modules/customer/customer.types"

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PIPELINE_STAGES: PipelineStage[] = [
  "PROSPECT",
  "OUTREACH",
  "DISCOVERY",
  "AUDIT",
  "PROPOSAL",
  "NEGOTIATION",
  "WON",
  "DELIVERING",
  "COMPLETE",
]

const STAGE_LABELS: Record<PipelineStage, string> = {
  PROSPECT: "Prospect",
  OUTREACH: "Outreach",
  DISCOVERY: "Discovery",
  AUDIT: "Audit",
  PROPOSAL: "Proposal",
  NEGOTIATION: "Negotiation",
  WON: "Won",
  DELIVERING: "Delivering",
  COMPLETE: "Complete",
  LOST: "Lost",
}

const STAGE_COLORS: Record<PipelineStage, { bg: string; text: string; border: string }> = {
  PROSPECT: { bg: "bg-slate-500/10", text: "text-slate-600", border: "border-slate-300" },
  OUTREACH: { bg: "bg-sky-500/10", text: "text-sky-600", border: "border-sky-300" },
  DISCOVERY: { bg: "bg-cyan-500/10", text: "text-cyan-600", border: "border-cyan-300" },
  AUDIT: { bg: "bg-indigo-500/10", text: "text-indigo-600", border: "border-indigo-300" },
  PROPOSAL: { bg: "bg-violet-500/10", text: "text-violet-600", border: "border-violet-300" },
  NEGOTIATION: { bg: "bg-amber-500/10", text: "text-amber-600", border: "border-amber-300" },
  WON: { bg: "bg-emerald-500/10", text: "text-emerald-600", border: "border-emerald-300" },
  DELIVERING: { bg: "bg-blue-500/10", text: "text-blue-600", border: "border-blue-300" },
  COMPLETE: { bg: "bg-green-500/10", text: "text-green-700", border: "border-green-300" },
  LOST: { bg: "bg-red-500/10", text: "text-red-600", border: "border-red-300" },
}

/** For each stage, the next logical stages a customer can move to */
const STAGE_TRANSITIONS: Record<string, PipelineStage[]> = {
  PROSPECT: ["OUTREACH", "LOST"],
  OUTREACH: ["DISCOVERY", "LOST"],
  DISCOVERY: ["AUDIT", "LOST"],
  AUDIT: ["PROPOSAL", "LOST"],
  PROPOSAL: ["NEGOTIATION", "LOST"],
  NEGOTIATION: ["WON", "LOST"],
  WON: ["DELIVERING"],
  DELIVERING: ["COMPLETE"],
  COMPLETE: [],
}

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

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("")
}

// ---------------------------------------------------------------------------
// Add Prospect Dialog
// ---------------------------------------------------------------------------

function AddProspectDialog({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}) {
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [referralSource, setReferralSource] = useState("")
  const [dealValue, setDealValue] = useState("")

  const createCustomer = api.customer.create.useMutation({
    onSuccess: () => {
      toast.success("Prospect added to pipeline")
      onOpenChange(false)
      resetForm()
      onSuccess()
    },
    onError: (err) => {
      toast.error(err.message || "Failed to create prospect")
    },
  })

  function resetForm() {
    setFirstName("")
    setLastName("")
    setEmail("")
    setReferralSource("")
    setDealValue("")
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const name = `${firstName.trim()} ${lastName.trim()}`.trim()
    if (!name) return

    createCustomer.mutate({
      name,
      email: email.trim() || null,
      referralSource: referralSource.trim() || null,
      dealValue: dealValue ? Number(dealValue) : null,
      pipelineStage: "PROSPECT",
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Prospect</DialogTitle>
          <DialogDescription>
            Add a new prospect to the pipeline. They will start in the Prospect stage.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                placeholder="First name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                placeholder="Last name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="email@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="referralSource">Referral Source</Label>
            <Input
              id="referralSource"
              placeholder="e.g. LinkedIn, referral, website"
              value={referralSource}
              onChange={(e) => setReferralSource(e.target.value)}
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
            <Button type="submit" disabled={createCustomer.isPending}>
              {createCustomer.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              Add Prospect
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Move Stage Dialog (for LOST reason / WON deal value)
// ---------------------------------------------------------------------------

function MoveStageDialog({
  open,
  onOpenChange,
  customer,
  targetStage,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  customer: CustomerRecord | null
  targetStage: PipelineStage | null
  onSuccess: () => void
}) {
  const [lostReason, setLostReason] = useState("")
  const [dealValue, setDealValue] = useState("")

  const updateStage = api.customer.updatePipelineStage.useMutation({
    onSuccess: () => {
      toast.success(
        targetStage === "LOST"
          ? "Marked as lost"
          : `Moved to ${STAGE_LABELS[targetStage!]}`
      )
      onOpenChange(false)
      setLostReason("")
      setDealValue("")
      onSuccess()
    },
    onError: (err) => {
      toast.error(err.message || "Failed to update stage")
    },
  })

  if (!customer || !targetStage) return null

  const isLost = targetStage === "LOST"
  const isWon = targetStage === "WON"

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!customer || !targetStage) return

    updateStage.mutate({
      customerId: customer.id,
      stage: targetStage,
      lostReason: isLost ? lostReason.trim() || undefined : undefined,
      dealValue: dealValue ? Number(dealValue) : undefined,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isLost ? "Mark as Lost" : `Move to ${STAGE_LABELS[targetStage]}`}
          </DialogTitle>
          <DialogDescription>
            {isLost
              ? `Mark ${customer.name} as lost. Optionally provide a reason.`
              : `Move ${customer.name} to the ${STAGE_LABELS[targetStage]} stage.`}
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
                  customer.dealValue
                    ? String(customer.dealValue)
                    : "0"
                }
                min="0"
                step="1"
                value={dealValue}
                onChange={(e) => setDealValue(e.target.value)}
              />
            </div>
          )}
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
              disabled={updateStage.isPending}
              variant={isLost ? "destructive" : "default"}
            >
              {updateStage.isPending && (
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
// Customer Card
// ---------------------------------------------------------------------------

function CustomerCard({
  customer,
  onMove,
}: {
  customer: CustomerRecord
  onMove: (customer: CustomerRecord, targetStage: PipelineStage) => void
}) {
  const router = useRouter()
  const currentStage = (customer.pipelineStage as PipelineStage) ?? "PROSPECT"
  const transitions = STAGE_TRANSITIONS[currentStage] ?? []

  return (
    <div
      className="rounded-lg border border-border bg-card p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
      onClick={() => router.push(`/admin/customers?view=${customer.id}`)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter") router.push(`/admin/customers?view=${customer.id}`)
      }}
      aria-label={`View ${customer.name}`}
    >
      {/* Name and actions */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground truncate">
            {customer.name}
          </p>
          {customer.email && (
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {customer.email}
            </p>
          )}
        </div>
        <div onClick={(e) => e.stopPropagation()}>
          {transitions.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label={`Actions for ${customer.name}`}
                >
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {transitions.map((stage) => {
                  if (stage === "LOST") return null
                  return (
                    <DropdownMenuItem
                      key={stage}
                      onClick={() => onMove(customer, stage)}
                    >
                      <ArrowRight className="h-3.5 w-3.5 mr-2" />
                      Move to {STAGE_LABELS[stage]}
                    </DropdownMenuItem>
                  )
                })}
                {transitions.includes("LOST") && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => onMove(customer, "LOST")}
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

      {/* Deal value */}
      {customer.dealValue != null && customer.dealValue > 0 && (
        <p className="text-xs font-semibold text-emerald-600 mt-2">
          {formatCurrency(customer.dealValue)}
        </p>
      )}

      {/* Meta row */}
      <div className="flex items-center gap-2 mt-2 flex-wrap">
        {customer.pipelineStageChangedAt && (
          <span className="text-[10px] text-muted-foreground">
            {formatTimeAgo(customer.pipelineStageChangedAt)}
          </span>
        )}
        {customer.referralSource && (
          <span className="text-[10px] text-muted-foreground">
            via {customer.referralSource}
          </span>
        )}
      </div>

      {/* Tags */}
      {customer.tags && customer.tags.length > 0 && (
        <div className="flex gap-1 mt-2 flex-wrap">
          {customer.tags.slice(0, 3).map((tag) => (
            <Badge
              key={tag}
              variant="secondary"
              className="text-[9px] px-1.5 py-0"
            >
              {tag}
            </Badge>
          ))}
          {customer.tags.length > 3 && (
            <span className="text-[9px] text-muted-foreground">
              +{customer.tags.length - 3}
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
  customers,
  summary,
  isLoading,
  onMove,
}: {
  stage: PipelineStage
  customers: CustomerRecord[]
  summary: { count: number; totalDealValue: number } | null
  isLoading: boolean
  onMove: (customer: CustomerRecord, targetStage: PipelineStage) => void
}) {
  const colors = STAGE_COLORS[stage]
  const count = summary?.count ?? customers.length
  const totalDealValue = summary?.totalDealValue ?? 0

  return (
    <div className="flex flex-col min-w-[280px] max-w-[280px] shrink-0">
      {/* Column header */}
      <div className={`rounded-t-lg border-t-2 ${colors.border} px-3 py-2.5 bg-muted/50`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">
              {STAGE_LABELS[stage]}
            </span>
            <span className={`text-[10px] font-semibold rounded-full px-1.5 py-0.5 ${colors.bg} ${colors.text}`}>
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

      {/* Column body */}
      <div className="flex-1 overflow-y-auto rounded-b-lg border border-t-0 border-border bg-muted/20 p-2 space-y-2 min-h-[200px] max-h-[calc(100vh-320px)] scrollbar-thin">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-lg border border-border bg-card p-3 space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-3 w-16" />
            </div>
          ))
        ) : customers.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <p className="text-xs text-muted-foreground">No customers</p>
          </div>
        ) : (
          customers.map((customer) => (
            <CustomerCard
              key={customer.id}
              customer={customer}
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

  // Dialog state
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [moveDialog, setMoveDialog] = useState<{
    open: boolean
    customer: CustomerRecord | null
    targetStage: PipelineStage | null
  }>({ open: false, customer: null, targetStage: null })

  // Data queries
  const summaryQuery = api.customer.getPipelineSummary.useQuery()
  const allCustomersQuery = api.customer.listByPipelineStage.useQuery({
    includeAll: true,
  })

  const isLoading = summaryQuery.isLoading || allCustomersQuery.isLoading
  const allCustomers = (allCustomersQuery.data ?? []) as CustomerRecord[]

  // Quick move (no dialog needed for non-LOST, non-WON stages)
  const quickMoveStage = api.customer.updatePipelineStage.useMutation({
    onSuccess: () => {
      toast.success("Customer moved")
      invalidateAll()
    },
    onError: (err) => {
      toast.error(err.message || "Failed to move customer")
    },
  })

  function invalidateAll() {
    void utils.customer.getPipelineSummary.invalidate()
    void utils.customer.listByPipelineStage.invalidate()
  }

  const handleMove = useCallback(
    (customer: CustomerRecord, targetStage: PipelineStage) => {
      // LOST and WON need a dialog for extra info
      if (targetStage === "LOST" || targetStage === "WON") {
        setMoveDialog({ open: true, customer, targetStage })
        return
      }
      // Quick move for other stages
      quickMoveStage.mutate({
        customerId: customer.id,
        stage: targetStage,
      })
    },
    [quickMoveStage],
  )

  // Build summary lookup
  const summaryMap = new Map<string, { count: number; totalDealValue: number }>()
  if (summaryQuery.data) {
    for (const row of summaryQuery.data) {
      summaryMap.set(row.stage, { count: row.count, totalDealValue: row.totalDealValue })
    }
  }

  // Group customers by stage
  const customersByStage = new Map<string, CustomerRecord[]>()
  for (const stage of PIPELINE_STAGES) {
    customersByStage.set(stage, [])
  }
  for (const customer of allCustomers) {
    const stage = customer.pipelineStage
    if (stage && customersByStage.has(stage)) {
      customersByStage.get(stage)!.push(customer)
    }
  }

  // Calculate totals
  const totalProspects = allCustomers.length
  const totalDealValue = allCustomers.reduce(
    (sum, c) => sum + (c.dealValue ?? 0),
    0,
  )
  const lostSummary = summaryMap.get("LOST")
  const lostCount = lostSummary?.count ?? 0

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <PageHeader
        title="Pipeline"
        description="Track consulting leads through pipeline stages."
      >
        <Button
          size="sm"
          onClick={() => setAddDialogOpen(true)}
          aria-label="Add new prospect"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add Prospect
        </Button>
      </PageHeader>

      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="space-y-0.5">
                <p className="text-xs text-muted-foreground">Total Prospects</p>
                <p className="text-xl font-semibold tracking-tight">
                  {isLoading ? "--" : totalProspects}
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
                  {isLoading ? "--" : summaryMap.get("WON")?.count ?? 0}
                </p>
              </div>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10">
                <ChevronRight className="h-4 w-4 text-emerald-500" aria-hidden="true" />
              </div>
            </div>
            {!isLoading && (summaryMap.get("WON")?.totalDealValue ?? 0) > 0 && (
              <p className="mt-1 text-[10px] text-muted-foreground">
                {formatCurrency(summaryMap.get("WON")!.totalDealValue)}
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
            {!isLoading && (lostSummary?.totalDealValue ?? 0) > 0 && (
              <p className="mt-1 text-[10px] text-muted-foreground">
                {formatCurrency(lostSummary!.totalDealValue)} lost value
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Kanban board */}
      <div className="overflow-x-auto pb-4 -mx-6 px-6 scrollbar-thin">
        <div className="flex gap-3 min-w-max">
          {PIPELINE_STAGES.map((stage) => (
            <PipelineColumn
              key={stage}
              stage={stage}
              customers={customersByStage.get(stage) ?? []}
              summary={summaryMap.get(stage) ?? null}
              isLoading={isLoading}
              onMove={handleMove}
            />
          ))}
        </div>
      </div>

      {/* Dialogs */}
      <AddProspectDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSuccess={invalidateAll}
      />

      <MoveStageDialog
        open={moveDialog.open}
        onOpenChange={(open) =>
          setMoveDialog((prev) => ({ ...prev, open }))
        }
        customer={moveDialog.customer}
        targetStage={moveDialog.targetStage}
        onSuccess={invalidateAll}
      />
    </div>
  )
}
