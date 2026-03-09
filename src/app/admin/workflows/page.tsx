"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  Search,
  Plus,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Trash2,
} from "lucide-react"
import { api } from "@/lib/trpc/react"
import { useDebounce } from "@/hooks/use-debounce"
import { useWorkflowMutations } from "@/hooks/use-workflow-mutations"
import { PageHeader } from "@/components/ui/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/ui/empty-state"
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import type { WorkflowRecord } from "@/modules/workflow/workflow.types"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PAGE_SIZE = 25

function formatRelativeDate(date: Date | string | null | undefined): string {
  if (!date) return "-"
  const d = typeof date === "string" ? new Date(date) : date
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffDays = Math.floor(Math.abs(diffMs) / (1000 * 60 * 60 * 24))
  const isFuture = diffMs < 0

  if (diffDays === 0) return "Today"

  if (isFuture) {
    if (diffDays === 1) return "Tomorrow"
    if (diffDays < 7) return `in ${diffDays} days`
    if (diffDays < 30) return `in ${Math.floor(diffDays / 7)}w`
    if (diffDays < 365) return `in ${Math.floor(diffDays / 30)}mo`
    return `in ${Math.floor(diffDays / 365)}y`
  }

  if (diffDays === 1) return "Yesterday"
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`
  return `${Math.floor(diffDays / 365)}y ago`
}

/**
 * Extract trigger events from a workflow's nodes array
 */
function getTriggerEvents(workflow: WorkflowRecord): string[] {
  if (!workflow.nodes || !Array.isArray(workflow.nodes)) return []

  return workflow.nodes
    .filter((node: any) => node.type === 'TRIGGER')
    .map((node: any) => node.config?.eventType as string)
    .filter(Boolean)
}

type StatusFilter = "ALL" | "ACTIVE" | "INACTIVE"

// ---------------------------------------------------------------------------
// Table skeleton
// ---------------------------------------------------------------------------

function TableRowSkeleton() {
  return (
    <TableRow>
      <TableCell><Skeleton className="h-4 w-48" /></TableCell>
      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
      <TableCell><Skeleton className="h-5 w-16 rounded-md" /></TableCell>
      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-9 rounded-full" />
          <Skeleton className="h-7 w-7 rounded-md" />
        </div>
      </TableCell>
    </TableRow>
  )
}

// ---------------------------------------------------------------------------
// Workflow row
// ---------------------------------------------------------------------------

interface WorkflowRowProps {
  workflow: WorkflowRecord
  onView: (id: string) => void
  onToggleActive: (id: string, isActive: boolean) => void
  onDelete: (id: string) => void
}

function WorkflowRow({ workflow, onView, onToggleActive, onDelete }: WorkflowRowProps) {
  return (
    <TableRow
      className="cursor-pointer"
      onClick={() => onView(workflow.id)}
      aria-label={`View workflow ${workflow.name}`}
    >
      {/* Name */}
      <TableCell>
        <div className="flex flex-col gap-0.5">
          <span className="font-medium text-sm text-foreground truncate max-w-[280px]">
            {workflow.name}
          </span>
          {workflow.description && (
            <span className="text-xs text-muted-foreground truncate max-w-[280px]">
              {workflow.description}
            </span>
          )}
        </div>
      </TableCell>

      {/* Trigger Events */}
      <TableCell>
        <div className="flex flex-wrap gap-1">
          {getTriggerEvents(workflow).length > 0 ? (
            getTriggerEvents(workflow).map((event, idx) => (
              <code key={idx} className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground font-mono">
                {event}
              </code>
            ))
          ) : (
            <span className="text-xs text-muted-foreground">-</span>
          )}
        </div>
      </TableCell>

      {/* Status */}
      <TableCell>
        <Badge
          variant={workflow.isActive ? "success" : "secondary"}
          className="text-[10px]"
        >
          {workflow.isActive ? "Active" : "Inactive"}
        </Badge>
      </TableCell>

      {/* Last Run - not available in WorkflowRecord, show dash for now */}
      <TableCell>
        <span className="text-xs text-muted-foreground">
          {formatRelativeDate(null)}
        </span>
      </TableCell>

      {/* Actions */}
      <TableCell onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2">
          {/* Active toggle */}
          <Switch
            checked={workflow.isActive}
            onCheckedChange={(checked) => onToggleActive(workflow.id, checked)}
            aria-label={workflow.isActive ? "Deactivate workflow" : "Activate workflow"}
          />

          {/* Actions menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Actions for ${workflow.name}`}
              >
                <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onView(workflow.id)}>
                View
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete(workflow.id)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" aria-hidden="true" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </TableCell>
    </TableRow>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function WorkflowsPage() {
  const router = useRouter()
  const [searchInput, setSearchInput] = useState("")
  const debouncedSearch = useDebounce(searchInput, 300)

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL")
  const [triggerEventFilter, setTriggerEventFilter] = useState<string>("")
  const [cursor, setCursor] = useState<string | undefined>(undefined)
  const [cursorStack, setCursorStack] = useState<string[]>([])

  // Delete confirmation dialog
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean
    workflowId: string
    workflowName: string
  }>({ open: false, workflowId: "", workflowName: "" })

  const { activate, deactivate, deleteWorkflow } = useWorkflowMutations()

  // Derive isActive filter
  const isActiveFilter =
    statusFilter === "ACTIVE" ? true : statusFilter === "INACTIVE" ? false : undefined

  const { data, isLoading, isError, refetch } = api.workflow.list.useQuery({
    isActive: isActiveFilter,
    triggerEvent: triggerEventFilter || undefined,
    limit: PAGE_SIZE,
    cursor,
  })

  // Client-side filtering for search (backend doesn't support search yet)
  const allRows = (data?.rows ?? []) as WorkflowRecord[]
  const rows = debouncedSearch
    ? allRows.filter((workflow) =>
        workflow.name.toLowerCase().includes(debouncedSearch.toLowerCase())
      )
    : allRows
  const hasMore = data?.hasMore ?? false

  // Pagination helpers
  function goToNextPage() {
    if (!hasMore || rows.length === 0) return
    const nextCursor = rows[rows.length - 1]!.id
    setCursorStack((prev) => [...prev, cursor ?? ""])
    setCursor(nextCursor)
  }

  function goToPrevPage() {
    if (cursorStack.length === 0) return
    const prevCursor = cursorStack[cursorStack.length - 1]
    setCursorStack((prev) => prev.slice(0, -1))
    setCursor(prevCursor === "" ? undefined : prevCursor)
  }

  const isFirstPage = cursorStack.length === 0

  // Reset pagination when filters change
  function handleSearchChange(value: string) {
    setSearchInput(value)
    setCursor(undefined)
    setCursorStack([])
  }

  function handleStatusFilter(status: StatusFilter) {
    setStatusFilter(status)
    setCursor(undefined)
    setCursorStack([])
  }

  function handleTriggerEventFilter(event: string) {
    setTriggerEventFilter(event)
    setCursor(undefined)
    setCursorStack([])
  }

  const handleView = useCallback(
    (id: string) => {
      router.push(`/admin/workflows/${id}`)
    },
    [router]
  )

  const handleToggleActive = useCallback(
    (id: string, isActive: boolean) => {
      if (isActive) {
        activate.mutate({ id })
      } else {
        deactivate.mutate({ id })
      }
    },
    [activate, deactivate]
  )

  const handleDeleteClick = useCallback((id: string, name: string) => {
    setDeleteDialog({ open: true, workflowId: id, workflowName: name })
  }, [])

  const handleDeleteConfirm = useCallback(() => {
    if (!deleteDialog.workflowId) return
    deleteWorkflow.mutate(
      { id: deleteDialog.workflowId },
      {
        onSuccess: () => {
          setDeleteDialog({ open: false, workflowId: "", workflowName: "" })
        },
      }
    )
  }, [deleteDialog.workflowId, deleteWorkflow])

  const handleCreateNew = useCallback(() => {
    router.push("/admin/workflows/new")
  }, [router])

  // Extract unique trigger events from all workflows
  const triggerEvents = Array.from(
    new Set(
      rows.flatMap((w) => getTriggerEvents(w))
    )
  ).sort()

  const statusOptions: { label: string; value: StatusFilter }[] = [
    { label: "All", value: "ALL" },
    { label: "Active", value: "ACTIVE" },
    { label: "Inactive", value: "INACTIVE" },
  ]

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page header */}
      <PageHeader
        title="Workflows"
        description="Automate actions based on events in your business."
      >
        <Button
          size="sm"
          onClick={handleCreateNew}
          aria-label="Create new workflow"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Create Workflow
        </Button>
      </PageHeader>

      {/* Search + filters */}
      <div className="space-y-3">
        {/* Search bar */}
        <div className="relative max-w-sm">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none"
            aria-hidden="true"
          />
          <Input
            type="search"
            placeholder="Search workflows..."
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9"
            aria-label="Search workflows"
          />
        </div>

        {/* Filter row */}
        <div className="flex items-center gap-4 flex-wrap">
          {/* Status filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-medium">Status:</span>
            {statusOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleStatusFilter(opt.value)}
                className={[
                  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  statusFilter === opt.value
                    ? "bg-primary text-primary-foreground border-transparent shadow"
                    : "border-input bg-background text-foreground hover:bg-accent",
                ].join(" ")}
                aria-pressed={statusFilter === opt.value}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Trigger event filter */}
          {triggerEvents.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground font-medium">Event:</span>
              <button
                type="button"
                onClick={() => handleTriggerEventFilter("")}
                className={[
                  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  triggerEventFilter === ""
                    ? "bg-primary text-primary-foreground border-transparent shadow"
                    : "border-input bg-background text-foreground hover:bg-accent",
                ].join(" ")}
                aria-pressed={triggerEventFilter === ""}
              >
                All
              </button>
              {triggerEvents.slice(0, 5).map((event) => (
                <button
                  key={event}
                  type="button"
                  onClick={() => handleTriggerEventFilter(event)}
                  className={[
                    "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-mono transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    triggerEventFilter === event
                      ? "bg-primary text-primary-foreground border-transparent shadow"
                      : "border-input bg-background text-foreground hover:bg-accent",
                  ].join(" ")}
                  aria-pressed={triggerEventFilter === event}
                >
                  {event}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="rounded-xl border border-border overflow-hidden">
        {isError ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <p className="text-sm text-destructive font-medium">
              Failed to load workflows
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => void refetch()}
              className="gap-1.5"
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              Retry
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[320px]">Name</TableHead>
                <TableHead className="w-[200px]">Trigger Events</TableHead>
                <TableHead className="w-[100px]">Status</TableHead>
                <TableHead className="w-[120px]">Last Run</TableHead>
                <TableHead className="w-[120px]">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRowSkeleton key={i} />
                ))
              ) : rows.length === 0 ? (
                <TableRow>
                  <td colSpan={5} className="p-0">
                    <EmptyState
                      variant={debouncedSearch ? "search" : "default"}
                      title={
                        debouncedSearch
                          ? "No workflows found"
                          : "No workflows yet"
                      }
                      description={
                        debouncedSearch
                          ? `No workflows match "${debouncedSearch}". Try adjusting your search.`
                          : "Create your first workflow to automate your business processes."
                      }
                      action={
                        !debouncedSearch
                          ? {
                              label: "Create Workflow",
                              onClick: handleCreateNew,
                            }
                          : undefined
                      }
                    />
                  </td>
                </TableRow>
              ) : (
                rows.map((workflow) => (
                  <WorkflowRow
                    key={workflow.id}
                    workflow={workflow}
                    onView={handleView}
                    onToggleActive={handleToggleActive}
                    onDelete={(id) => handleDeleteClick(id, workflow.name)}
                  />
                ))
              )}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Pagination */}
      {!isLoading && !isError && rows.length > 0 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Showing {rows.length} workflow{rows.length !== 1 ? "s" : ""}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon-sm"
              onClick={goToPrevPage}
              disabled={isFirstPage}
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={goToNextPage}
              disabled={!hasMore}
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      )}

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog((prev) => ({ ...prev, open }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Workflow</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-semibold text-foreground">
                {deleteDialog.workflowName}
              </span>
              ? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
