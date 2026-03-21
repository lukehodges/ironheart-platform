"use client"

import { useState, useRef, useEffect } from "react"
import { MoreVertical, Pause, Play, ArrowRightCircle } from "lucide-react"
import { toast } from "sonner"
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { api } from "@/lib/trpc/react"
import type {
  OutreachContactWithDetails,
  OutreachContactStatus,
} from "@/modules/outreach/outreach.types"

// ---------------------------------------------------------------------------
// Status badge color map
// ---------------------------------------------------------------------------

const STATUS_COLORS: Record<OutreachContactStatus, string> = {
  ACTIVE: "bg-blue-100 text-blue-700",
  REPLIED: "bg-emerald-100 text-emerald-700",
  PAUSED: "bg-amber-100 text-amber-700",
  COMPLETED: "bg-gray-100 text-gray-700",
  BOUNCED: "bg-red-100 text-red-700",
  OPTED_OUT: "bg-gray-200 text-gray-700",
  CONVERTED: "bg-purple-100 text-purple-700",
}

const STATUS_LABELS: Record<OutreachContactStatus, string> = {
  ACTIVE: "Active",
  REPLIED: "Replied",
  PAUSED: "Paused",
  COMPLETED: "Completed",
  BOUNCED: "Bounced",
  OPTED_OUT: "Opted Out",
  CONVERTED: "Converted",
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatRelativeDate(date: Date | string | null): string {
  if (!date) return "—"
  const d = new Date(date)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return "Today"
  if (diffDays === 1) return "Yesterday"
  if (diffDays < 7) return `${diffDays}d ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`
  return d.toLocaleDateString()
}

function formatDueDate(date: Date | string | null): string {
  if (!date) return "—"
  const d = new Date(date)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const due = new Date(d)
  due.setHours(0, 0, 0, 0)

  const diffMs = due.getTime() - now.getTime()
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays < 0) return `Overdue ${Math.abs(diffDays)}d`
  if (diffDays === 0) return "Today"
  if (diffDays === 1) return "Tomorrow"
  if (diffDays < 14) return `In ${diffDays}d`
  return d.toLocaleDateString()
}

function isDueDateOverdue(date: Date | string | null): boolean {
  if (!date) return false
  return new Date(date) < new Date()
}

// ---------------------------------------------------------------------------
// StepDots
// ---------------------------------------------------------------------------

function StepDots({
  currentStep,
  totalSteps,
}: {
  currentStep: number
  totalSteps: number
}) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: totalSteps }).map((_, i) => {
        const position = i + 1
        let colorClass = "bg-muted-foreground/30"
        if (position < currentStep) colorClass = "bg-emerald-500"
        else if (position === currentStep) colorClass = "bg-indigo-500"
        return (
          <div
            key={i}
            className={cn("w-1.5 h-1.5 rounded-full", colorClass)}
          />
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Kebab Menu
// ---------------------------------------------------------------------------

function KebabMenu({
  contact,
  openMenuId,
  onToggleMenu,
  onPause,
  onResume,
}: {
  contact: OutreachContactWithDetails
  openMenuId: string | null
  onToggleMenu: (id: string | null) => void
  onPause: (contactId: string) => void
  onResume: (contactId: string) => void
}) {
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (openMenuId !== contact.id) return
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onToggleMenu(null)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [openMenuId, contact.id, onToggleMenu])

  const isOpen = openMenuId === contact.id

  return (
    <div className="relative" ref={menuRef}>
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0"
        onClick={() => onToggleMenu(isOpen ? null : contact.id)}
      >
        <MoreVertical className="h-4 w-4" />
        <span className="sr-only">Actions</span>
      </Button>

      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-1 w-40 rounded-md border border-border bg-popover p-1 shadow-md">
          {contact.status === "ACTIVE" && (
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-muted"
              onClick={() => {
                onPause(contact.id)
                onToggleMenu(null)
              }}
            >
              <Pause className="h-3.5 w-3.5" />
              Pause
            </button>
          )}
          {contact.status === "PAUSED" && (
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-muted"
              onClick={() => {
                onResume(contact.id)
                onToggleMenu(null)
              }}
            >
              <Play className="h-3.5 w-3.5" />
              Resume
            </button>
          )}
          <button
            type="button"
            disabled
            className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-muted-foreground opacity-50 cursor-not-allowed"
          >
            <ArrowRightCircle className="h-3.5 w-3.5" />
            Convert
          </button>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// ContactsTable
// ---------------------------------------------------------------------------

interface ContactsTableProps {
  contacts: OutreachContactWithDetails[]
  isLoading: boolean
  hasMore: boolean
  onLoadMore: () => void
  onSelectContact: (contact: OutreachContactWithDetails) => void
}

export function ContactsTable({
  contacts,
  isLoading,
  hasMore,
  onLoadMore,
  onSelectContact,
}: ContactsTableProps) {
  const utils = api.useUtils()
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)

  // Mutations
  const pauseContact = api.outreach.pauseContact.useMutation({
    onSuccess: () => {
      void utils.outreach.listContacts.invalidate()
      toast.success("Contact paused")
    },
    onError: () => {
      toast.error("Failed to pause contact")
    },
  })

  const resumeContact = api.outreach.resumeContact.useMutation({
    onSuccess: () => {
      void utils.outreach.listContacts.invalidate()
      toast.success("Contact resumed")
    },
    onError: () => {
      toast.error("Failed to resume contact")
    },
  })

  // Selection
  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    if (selectedIds.size === contacts.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(contacts.map((c) => c.id)))
    }
  }

  const allSelected = contacts.length > 0 && selectedIds.size === contacts.length
  const someSelected = selectedIds.size > 0 && selectedIds.size < contacts.length

  // Derive totalSteps from currentStepTemplate position data
  function getTotalSteps(contact: OutreachContactWithDetails): number {
    // Best effort: use currentStep as a floor, template position if available
    if (contact.currentStepTemplate) {
      return Math.max(contact.currentStep, contact.currentStepTemplate.position)
    }
    return contact.currentStep
  }

  // Loading state
  if (isLoading && contacts.length === 0) {
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10" />
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Sequence</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Next Due</TableHead>
            <TableHead>Last Activity</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 8 }).map((_, i) => (
            <TableRow key={i}>
              <TableCell><Skeleton className="h-4 w-4" /></TableCell>
              <TableCell><Skeleton className="h-4 w-32" /></TableCell>
              <TableCell><Skeleton className="h-4 w-40" /></TableCell>
              <TableCell><Skeleton className="h-4 w-28" /></TableCell>
              <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
              <TableCell><Skeleton className="h-4 w-20" /></TableCell>
              <TableCell><Skeleton className="h-4 w-20" /></TableCell>
              <TableCell><Skeleton className="h-4 w-4" /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    )
  }

  // Empty state
  if (!isLoading && contacts.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm text-muted-foreground">No contacts found.</p>
      </div>
    )
  }

  return (
    <div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">
              <Checkbox
                checked={allSelected}
                ref={(el) => {
                  if (el) {
                    // Set indeterminate state for partial selection
                    (el as unknown as HTMLInputElement).indeterminate = someSelected
                  }
                }}
                onCheckedChange={toggleSelectAll}
              />
            </TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Sequence</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Next Due</TableHead>
            <TableHead>Last Activity</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {contacts.map((contact) => {
            const overdue = isDueDateOverdue(contact.nextDueAt)
            const totalSteps = getTotalSteps(contact)

            return (
              <TableRow
                key={contact.id}
                data-state={selectedIds.has(contact.id) ? "selected" : undefined}
              >
                {/* Checkbox */}
                <TableCell>
                  <Checkbox
                    checked={selectedIds.has(contact.id)}
                    onCheckedChange={() => toggleSelect(contact.id)}
                  />
                </TableCell>

                {/* Name + sector */}
                <TableCell>
                  <button
                    type="button"
                    className="text-sm font-medium text-foreground hover:underline text-left"
                    onClick={() => onSelectContact(contact)}
                  >
                    {contact.customerFirstName} {contact.customerLastName}
                  </button>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {contact.sector}
                  </p>
                </TableCell>

                {/* Email */}
                <TableCell className="text-sm text-muted-foreground">
                  {contact.customerEmail ?? "—"}
                </TableCell>

                {/* Sequence + StepDots */}
                <TableCell>
                  <p className="text-sm text-foreground">{contact.sequenceName}</p>
                  <div className="mt-1">
                    <StepDots
                      currentStep={contact.currentStep}
                      totalSteps={totalSteps}
                    />
                  </div>
                </TableCell>

                {/* Status badge */}
                <TableCell>
                  <Badge
                    variant="secondary"
                    className={cn(
                      "text-[11px] font-medium",
                      STATUS_COLORS[contact.status],
                    )}
                  >
                    {STATUS_LABELS[contact.status]}
                  </Badge>
                </TableCell>

                {/* Next Due */}
                <TableCell>
                  <span
                    className={cn(
                      "text-sm",
                      overdue
                        ? "text-red-600 font-medium"
                        : "text-muted-foreground",
                    )}
                  >
                    {formatDueDate(contact.nextDueAt)}
                  </span>
                </TableCell>

                {/* Last Activity */}
                <TableCell className="text-sm text-muted-foreground">
                  {formatRelativeDate(contact.lastActivityAt)}
                </TableCell>

                {/* Actions kebab */}
                <TableCell>
                  <KebabMenu
                    contact={contact}
                    openMenuId={openMenuId}
                    onToggleMenu={setOpenMenuId}
                    onPause={(id) => pauseContact.mutate({ contactId: id })}
                    onResume={(id) => resumeContact.mutate({ contactId: id })}
                  />
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>

      {/* Load more */}
      {hasMore && (
        <div className="flex justify-center py-4">
          <Button
            variant="outline"
            size="sm"
            onClick={onLoadMore}
            disabled={isLoading}
          >
            {isLoading ? "Loading..." : "Load More"}
          </Button>
        </div>
      )}
    </div>
  )
}
