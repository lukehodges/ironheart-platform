"use client"

import { useState, useCallback } from "react"
import { toast } from "sonner"
import {
  Plus,
  MoreHorizontal,
  RefreshCw,
  Copy,
  AlertTriangle,
  Trash2,
} from "lucide-react"
import { api } from "@/lib/trpc/react"
import { PageHeader } from "@/components/ui/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/ui/empty-state"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table"
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
} from "@/components/ui/dropdown-menu"

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const WEBHOOK_EVENT_TYPES = [
  "booking/created",
  "booking/updated",
  "booking/cancelled",
  "customer/created",
  "customer/updated",
  "payment/received",
  "review/submitted",
  "form/submitted",
] as const

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

function truncateUrl(url: string, maxLength = 40): string {
  if (url.length <= maxLength) return url
  return url.slice(0, maxLength) + "..."
}

// ---------------------------------------------------------------------------
// Table skeleton
// ---------------------------------------------------------------------------

function TableRowSkeleton() {
  return (
    <TableRow>
      <TableCell><Skeleton className="h-4 w-48" /></TableCell>
      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
      <TableCell><Skeleton className="h-5 w-14 rounded-md" /></TableCell>
      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
      <TableCell><Skeleton className="h-7 w-7 rounded-md" /></TableCell>
    </TableRow>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function DeveloperPage() {
  // Dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [secretDialogOpen, setSecretDialogOpen] = useState(false)
  const [revealedSecret, setRevealedSecret] = useState("")

  // Create form state
  const [newUrl, setNewUrl] = useState("")
  const [newDescription, setNewDescription] = useState("")
  const [selectedEvents, setSelectedEvents] = useState<string[]>([])

  // Query
  const {
    data: endpoints,
    isLoading,
    isError,
    refetch,
  } = api.developer.listWebhookEndpoints.useQuery()

  // Mutations
  const createMutation = api.developer.createWebhookEndpoint.useMutation({
    onSuccess: (data) => {
      setCreateDialogOpen(false)
      resetCreateForm()
      setRevealedSecret(data.secret)
      setSecretDialogOpen(true)
      void refetch()
      toast.success("Webhook endpoint created")
    },
    onError: (err) => {
      toast.error(err.message || "Failed to create webhook endpoint")
    },
  })

  const deleteMutation = api.developer.deleteWebhookEndpoint.useMutation({
    onSuccess: () => {
      void refetch()
      toast.success("Webhook endpoint deleted")
    },
    onError: (err) => {
      toast.error(err.message || "Failed to delete webhook endpoint")
    },
  })

  // Handlers
  const resetCreateForm = useCallback(() => {
    setNewUrl("")
    setNewDescription("")
    setSelectedEvents([])
  }, [])

  const handleCreateOpen = useCallback(() => {
    resetCreateForm()
    setCreateDialogOpen(true)
  }, [resetCreateForm])

  const handleCreate = useCallback(() => {
    if (!newUrl.trim()) {
      toast.error("URL is required")
      return
    }
    if (selectedEvents.length === 0) {
      toast.error("Select at least one event type")
      return
    }
    createMutation.mutate({
      url: newUrl.trim(),
      events: selectedEvents,
      description: newDescription.trim() || undefined,
    })
  }, [newUrl, newDescription, selectedEvents, createMutation])

  const handleToggleEvent = useCallback((event: string) => {
    setSelectedEvents((prev) =>
      prev.includes(event)
        ? prev.filter((e) => e !== event)
        : [...prev, event]
    )
  }, [])

  const handleDelete = useCallback(
    (id: string) => {
      toast("Are you sure you want to delete this webhook?", {
        action: {
          label: "Delete",
          onClick: () => deleteMutation.mutate({ id }),
        },
        cancel: {
          label: "Cancel",
          onClick: () => {},
        },
      })
    },
    [deleteMutation]
  )

  const handleCopySecret = useCallback(() => {
    navigator.clipboard.writeText(revealedSecret).then(() => {
      toast.success("Signing secret copied to clipboard")
    })
  }, [revealedSecret])

  const rows = endpoints ?? []

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page header */}
      <PageHeader
        title="Developer"
        description="Manage webhooks and API integrations."
      >
        <Button size="sm" onClick={handleCreateOpen} aria-label="Add webhook">
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add Webhook
        </Button>
      </PageHeader>

      {/* Content */}
      <div className="rounded-xl border border-border overflow-hidden">
        {isError ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <p className="text-sm text-destructive font-medium">
              Failed to load webhooks
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
                <TableHead className="w-[260px]">URL</TableHead>
                <TableHead>Events</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="w-[90px]">Status</TableHead>
                <TableHead className="w-[110px]">Created</TableHead>
                <TableHead className="w-[48px]">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRowSkeleton key={i} />
                ))
              ) : rows.length === 0 ? (
                <TableRow>
                  <td colSpan={6} className="p-0">
                    <EmptyState
                      variant="default"
                      title="No webhooks configured"
                      description="Add a webhook endpoint to receive real-time event notifications."
                      action={{
                        label: "Add Webhook",
                        onClick: handleCreateOpen,
                      }}
                    />
                  </td>
                </TableRow>
              ) : (
                rows.map((endpoint) => (
                  <TableRow key={endpoint.id}>
                    {/* URL */}
                    <TableCell>
                      <span
                        className="text-sm font-mono text-foreground truncate block max-w-[240px]"
                        title={endpoint.url}
                      >
                        {truncateUrl(endpoint.url)}
                      </span>
                    </TableCell>

                    {/* Events */}
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {endpoint.events.length <= 3 ? (
                          endpoint.events.map((event: string) => (
                            <Badge
                              key={event}
                              variant="secondary"
                              className="text-[10px]"
                            >
                              {event}
                            </Badge>
                          ))
                        ) : (
                          <Badge variant="secondary" className="text-[10px]">
                            {endpoint.events.length} events
                          </Badge>
                        )}
                      </div>
                    </TableCell>

                    {/* Description */}
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {endpoint.description || (
                          <span className="italic text-xs">{"\u2014"}</span>
                        )}
                      </span>
                    </TableCell>

                    {/* Status */}
                    <TableCell>
                      <Badge
                        variant={
                          endpoint.status === "ACTIVE"
                            ? "success"
                            : endpoint.status === "FAILING"
                              ? "destructive"
                              : "warning"
                        }
                        className="text-[10px]"
                      >
                        {endpoint.status === "ACTIVE"
                          ? "Active"
                          : endpoint.status === "FAILING"
                            ? "Failing"
                            : "Disabled"}
                      </Badge>
                    </TableCell>

                    {/* Created */}
                    <TableCell>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(endpoint.createdAt)}
                      </span>
                    </TableCell>

                    {/* Actions */}
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Actions for webhook ${endpoint.url}`}
                          >
                            <MoreHorizontal
                              className="h-4 w-4"
                              aria-hidden="true"
                            />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => handleDelete(endpoint.id)}
                          >
                            <Trash2
                              className="h-4 w-4 mr-2"
                              aria-hidden="true"
                            />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Create Webhook Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Webhook Endpoint</DialogTitle>
            <DialogDescription>
              Configure a URL to receive event notifications via HTTP POST.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* URL */}
            <div className="space-y-2">
              <Label htmlFor="webhook-url">Endpoint URL</Label>
              <Input
                id="webhook-url"
                type="url"
                placeholder="https://example.com/webhooks"
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                autoFocus
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="webhook-description">
                Description{" "}
                <span className="text-muted-foreground font-normal">
                  (optional)
                </span>
              </Label>
              <Input
                id="webhook-description"
                placeholder="e.g. Production CRM sync"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
              />
            </div>

            <Separator />

            {/* Event Types */}
            <div className="space-y-3">
              <Label>Event Types</Label>
              <div className="grid grid-cols-2 gap-2">
                {WEBHOOK_EVENT_TYPES.map((event) => (
                  <label
                    key={event}
                    className="flex items-center gap-2 cursor-pointer rounded-md border border-border px-3 py-2 text-sm hover:bg-accent transition-colors"
                  >
                    <Checkbox
                      checked={selectedEvents.includes(event)}
                      onCheckedChange={() => handleToggleEvent(event)}
                    />
                    <span className="font-mono text-xs">{event}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              loading={createMutation.isPending}
              disabled={!newUrl.trim() || selectedEvents.length === 0}
            >
              Create Webhook
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Signing Secret Dialog */}
      <Dialog open={secretDialogOpen} onOpenChange={setSecretDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Signing Secret</DialogTitle>
            <DialogDescription>
              Use this secret to verify webhook payloads. Copy it now — it will
              not be shown again.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={revealedSecret}
                className="font-mono text-xs"
                onFocus={(e) => e.target.select()}
              />
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopySecret}
                aria-label="Copy signing secret"
              >
                <Copy className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>

            <div className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning/5 px-3 py-2">
              <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
              <p className="text-xs text-warning">
                This secret will only be displayed once. Store it securely
                before closing this dialog.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setSecretDialogOpen(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
