"use client"

import { useState, useCallback, useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import { formatDistanceToNow, format } from "date-fns"
import { ArrowLeft, Filter, Clock, CheckCircle2, XCircle, Loader2 } from "lucide-react"
import { PageHeader } from "@/components/ui/page-header"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/ui/empty-state"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { api } from "@/lib/trpc/react"
import type { WorkflowExecutionRecord, NodeExecutionResult } from "@/modules/workflow/workflow.types"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ExecutionStatus = "pending" | "running" | "completed" | "failed" | "cancelled"

interface ExecutionFilters {
  status?: ExecutionStatus
  dateFrom?: string
  dateTo?: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDuration(startedAt: Date, completedAt: Date | null): string {
  if (!completedAt) return "-"
  const ms = new Date(completedAt).getTime() - new Date(startedAt).getTime()
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  const minutes = Math.floor(ms / 60000)
  const seconds = Math.floor((ms % 60000) / 1000)
  return `${minutes}m ${seconds}s`
}

function getStatusColor(status: ExecutionStatus): "default" | "success" | "destructive" | "warning" | "info" {
  switch (status) {
    case "completed":
      return "success"
    case "failed":
      return "destructive"
    case "running":
      return "info"
    case "pending":
      return "warning"
    case "cancelled":
      return "default"
    default:
      return "default"
  }
}

// ---------------------------------------------------------------------------
// Status Badge Component
// ---------------------------------------------------------------------------

function ExecutionStatusBadge({ status }: { status: ExecutionStatus }) {
  const variant = getStatusColor(status)
  const isPulse = status === "running"

  return (
    <Badge variant={variant} className="relative">
      {isPulse && (
        <span className="absolute inset-0 rounded-md animate-pulse bg-primary/20" />
      )}
      <span className="relative flex items-center gap-1.5">
        {status === "running" && <Loader2 className="h-3 w-3 animate-spin" />}
        {status === "completed" && <CheckCircle2 className="h-3 w-3" />}
        {status === "failed" && <XCircle className="h-3 w-3" />}
        {status === "pending" && <Clock className="h-3 w-3" />}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    </Badge>
  )
}

// ---------------------------------------------------------------------------
// Execution Detail Sheet
// ---------------------------------------------------------------------------

interface ExecutionDetailSheetProps {
  executionId: string | null
  onClose: () => void
}

function ExecutionDetailSheet({ executionId, onClose }: ExecutionDetailSheetProps) {
  const { data: execution, isLoading } = api.workflow.getExecutions.useQuery(
    { workflowId: undefined, limit: 100 },
    {
      enabled: !!executionId,
      select: (data) => data.rows.find((e) => e.id === executionId),
    }
  )

  const steps = useMemo(() => {
    if (!execution?.actionResults) return []
    return execution.actionResults as NodeExecutionResult[]
  }, [execution])

  return (
    <Sheet open={!!executionId} onOpenChange={(open) => { if (!open) onClose() }}>
      <SheetContent
        side="right"
        className="flex w-full max-w-2xl flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl"
      >
        {/* Header */}
        <SheetHeader className="border-b border-border px-6 py-4">
          <div className="flex items-center gap-3">
            {execution ? (
              <ExecutionStatusBadge status={execution.status} />
            ) : (
              <Skeleton className="h-5 w-20 rounded-md" />
            )}
            <SheetTitle className="text-base font-semibold">
              {execution ? (
                `Execution ${execution.id.slice(0, 8)}`
              ) : (
                <Skeleton className="h-5 w-28 inline-block" />
              )}
            </SheetTitle>
          </div>
          <SheetDescription className="text-xs text-muted-foreground">
            {execution ? (
              <>
                Started {formatDistanceToNow(new Date(execution.startedAt), { addSuffix: true })}
                {execution.completedAt && ` · Duration: ${formatDuration(execution.startedAt, execution.completedAt)}`}
              </>
            ) : null}
          </SheetDescription>
        </SheetHeader>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-start gap-3">
                  <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : execution ? (
            <div className="space-y-6">
              {/* Execution metadata */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Trigger Event:</span>
                  <span className="font-mono text-xs">{execution.triggerEvent}</span>
                </div>
                {execution.error && (
                  <div className="rounded-md bg-destructive/10 p-3 text-destructive">
                    <p className="text-xs font-medium">Error</p>
                    <p className="mt-1 text-xs font-mono">{execution.error}</p>
                  </div>
                )}
              </div>

              <Separator />

              {/* Step timeline */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold">Execution Steps</h3>
                <div className="relative space-y-4 pl-6 before:absolute before:left-[11px] before:top-3 before:h-[calc(100%-1.5rem)] before:w-px before:bg-border">
                  {steps.map((step, index) => (
                    <StepItem key={step.nodeId || index} step={step} />
                  ))}
                  {steps.length === 0 && (
                    <p className="text-sm text-muted-foreground">No steps recorded</p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <EmptyState
              icon={XCircle}
              title="Execution not found"
              description="The execution you're looking for doesn't exist."
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ---------------------------------------------------------------------------
// Step Item Component
// ---------------------------------------------------------------------------

interface StepItemProps {
  step: NodeExecutionResult
}

function StepItem({ step }: StepItemProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const statusColor = step.success
    ? "text-success"
    : step.skipped
      ? "text-muted-foreground"
      : "text-destructive"

  const statusIcon = step.success
    ? CheckCircle2
    : step.skipped
      ? Clock
      : XCircle

  const Icon = statusIcon

  return (
    <div className="relative">
      {/* Status indicator dot */}
      <div className={cn(
        "absolute -left-6 top-1 h-2 w-2 rounded-full border-2 border-background",
        step.success ? "bg-success" : step.skipped ? "bg-muted-foreground" : "bg-destructive"
      )} />

      {/* Step content */}
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Icon className={cn("h-4 w-4", statusColor)} />
              <span className="text-sm font-medium">
                {step.label || step.nodeType}
              </span>
            </div>
            <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
              <span>Duration: {step.durationMs}ms</span>
              {step.skipped && step.skipReason && (
                <span>Skipped: {step.skipReason}</span>
              )}
            </div>
          </div>
          {(step.output || step.error) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-auto py-1 px-2 text-xs"
            >
              {isExpanded ? "Hide" : "View"} {step.error ? "Error" : "Output"}
            </Button>
          )}
        </div>

        {/* Expanded output/error */}
        {isExpanded && (
          <div className="rounded-md bg-muted p-3 text-xs">
            {step.error ? (
              <div className="text-destructive">
                <p className="font-semibold">Error:</p>
                <pre className="mt-1 whitespace-pre-wrap font-mono">{step.error}</pre>
              </div>
            ) : step.output ? (
              <>
                <p className="font-semibold mb-1">Output:</p>
                <pre className="whitespace-pre-wrap font-mono overflow-x-auto">
                  {JSON.stringify(step.output, null, 2)}
                </pre>
              </>
            ) : null}
          </div>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Loading Skeleton
// ---------------------------------------------------------------------------

function ExecutionsTableSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 border border-border rounded-md">
          <Skeleton className="h-5 w-20 rounded-md" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-32 ml-auto" />
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Page Component
// ---------------------------------------------------------------------------

export default function WorkflowExecutionsPage() {
  const params = useParams()
  const router = useRouter()
  const workflowId = params.id as string

  // State
  const [selectedExecutionId, setSelectedExecutionId] = useState<string | null>(null)
  const [filters, setFilters] = useState<ExecutionFilters>({})

  // Fetch workflow details
  const { data: workflow, isLoading: isLoadingWorkflow } = api.workflow.getById.useQuery(
    { id: workflowId },
    { enabled: !!workflowId }
  )

  // Fetch executions with auto-refresh for running executions
  const {
    data: executionsData,
    isLoading: isLoadingExecutions,
    error,
  } = api.workflow.getExecutions.useQuery(
    {
      workflowId,
      limit: 50,
    },
    {
      enabled: !!workflowId,
      refetchInterval: (query) => {
        // Auto-refresh every 30s if there are running executions
        const hasRunning = query.state.data?.rows?.some((exec) => exec.status === "running")
        return hasRunning ? 30000 : false
      },
    }
  )

  const executions = useMemo(() => {
    if (!executionsData?.rows) return []
    let filtered = executionsData.rows

    // Filter by status
    if (filters.status) {
      filtered = filtered.filter((e) => e.status === filters.status)
    }

    // Filter by date range
    if (filters.dateFrom) {
      const from = new Date(filters.dateFrom)
      filtered = filtered.filter((e) => new Date(e.startedAt) >= from)
    }
    if (filters.dateTo) {
      const to = new Date(filters.dateTo)
      filtered = filtered.filter((e) => new Date(e.startedAt) <= to)
    }

    return filtered
  }, [executionsData, filters])

  // Handlers
  const handleRowClick = useCallback((executionId: string) => {
    setSelectedExecutionId(executionId)
  }, [])

  const handleSheetClose = useCallback(() => {
    setSelectedExecutionId(null)
  }, [])

  const handleBackClick = useCallback(() => {
    router.push(`/admin/workflows/${workflowId}`)
  }, [router, workflowId])

  const isLoading = isLoadingWorkflow || isLoadingExecutions

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <PageHeader
        title={workflow?.name ? `${workflow.name} - Executions` : "Workflow Executions"}
        description="View execution history and details for this workflow."
      >
        <Button
          variant="outline"
          size="sm"
          onClick={handleBackClick}
          aria-label="Back to workflow editor"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Workflow
        </Button>
      </PageHeader>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Filter className="h-4 w-4" />
          <span>Filter:</span>
        </div>
        <Select
          value={filters.status || "all"}
          onValueChange={(value) =>
            setFilters((prev) => ({
              ...prev,
              status: value === "all" ? undefined : (value as ExecutionStatus),
            }))
          }
        >
          <SelectTrigger className="h-8 w-[140px] text-xs">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="running">Running</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        {/* TODO: Add date range picker when available */}
      </div>

      {/* Data Table */}
      <div className="rounded-md border border-border">
        {isLoading ? (
          <div className="p-4">
            <ExecutionsTableSkeleton />
          </div>
        ) : error ? (
          <div className="p-8">
            <EmptyState
              icon={XCircle}
              title="Failed to load executions"
              description={error.message}
            />
          </div>
        ) : executions.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={Clock}
              title="No executions yet"
              description="This workflow hasn't been executed yet. Executions will appear here once triggered."
            />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Execution ID</TableHead>
                <TableHead>Started At</TableHead>
                <TableHead>Completed At</TableHead>
                <TableHead className="text-right">Duration</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {executions.map((execution) => (
                <TableRow
                  key={execution.id}
                  onClick={() => handleRowClick(execution.id)}
                  className="cursor-pointer hover:bg-muted/50"
                >
                  <TableCell>
                    <ExecutionStatusBadge status={execution.status} />
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {execution.id.slice(0, 8)}...
                  </TableCell>
                  <TableCell className="text-sm">
                    {format(new Date(execution.startedAt), "MMM d, yyyy h:mm a")}
                    <span className="ml-2 text-xs text-muted-foreground">
                      ({formatDistanceToNow(new Date(execution.startedAt), { addSuffix: true })})
                    </span>
                  </TableCell>
                  <TableCell className="text-sm">
                    {execution.completedAt
                      ? format(new Date(execution.completedAt), "MMM d, yyyy h:mm a")
                      : "-"}
                  </TableCell>
                  <TableCell className="text-right text-sm font-medium">
                    {formatDuration(execution.startedAt, execution.completedAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Execution Detail Sheet */}
      <ExecutionDetailSheet
        executionId={selectedExecutionId}
        onClose={handleSheetClose}
      />
    </div>
  )
}
