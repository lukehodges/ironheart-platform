"use client"

import { useState, useMemo, useEffect } from "react"
import { toast } from "sonner"
import { Mail, Linkedin, Phone, ArrowRightCircle, Copy, Check } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { api } from "@/lib/trpc/react"
import type { DashboardContact, OutreachChannel } from "@/modules/outreach/outreach.types"
import { ContactDetail } from "./contact-detail"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const channelIcons: Record<OutreachChannel, typeof Mail> = {
  EMAIL: Mail,
  LINKEDIN_REQUEST: Linkedin,
  LINKEDIN_MESSAGE: Linkedin,
  CALL: Phone,
}

const channelLabels: Record<OutreachChannel, string> = {
  EMAIL: "Email",
  LINKEDIN_REQUEST: "LI Request",
  LINKEDIN_MESSAGE: "LI Message",
  CALL: "Call",
}

function isOverdue(contact: DashboardContact): boolean {
  if (!contact.nextDueAt) return false
  return new Date(contact.nextDueAt) < new Date()
}

function formatDueAt(contact: DashboardContact): string {
  if (!contact.nextDueAt) return ""
  const due = new Date(contact.nextDueAt)
  const now = new Date()
  if (due < now) {
    const diffMs = now.getTime() - due.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    if (diffDays >= 1) return `Overdue — ${diffDays}d`
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    if (diffHours >= 1) return `Overdue — ${diffHours}h`
    return "Overdue"
  }
  return due.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
}

function ChannelBadge({ channel }: { channel: OutreachChannel }) {
  const Icon = channelIcons[channel]
  return (
    <Badge variant="secondary" className="text-[10px] gap-1 px-1.5 py-0">
      <Icon className="h-3 w-3" aria-hidden="true" />
      {channelLabels[channel]}
    </Badge>
  )
}

// ---------------------------------------------------------------------------
// Progress Ring
// ---------------------------------------------------------------------------

function ProgressRing({ sent, total }: { sent: number; total: number }) {
  const radius = 40
  const circumference = 2 * Math.PI * radius
  const progress = total > 0 ? sent / total : 0
  const offset = circumference - progress * circumference

  return (
    <div className="flex items-center justify-center py-4">
      <div className="relative">
        <svg width="100" height="100" className="transform -rotate-90">
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="6"
            className="text-muted/30"
          />
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="text-indigo-500 transition-all duration-500"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-semibold font-mono">{sent}</span>
          <span className="text-[10px] text-muted-foreground">of {total}</span>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Contact Card
// ---------------------------------------------------------------------------

function ContactCard({
  contact,
  selected,
  isFocused,
  onToggleSelect,
  onMarkSent,
  onCopyBody,
  onClickName,
}: {
  contact: DashboardContact
  selected: boolean
  isFocused: boolean
  onToggleSelect: (id: string) => void
  onMarkSent: (id: string) => void
  onCopyBody: (contactId: string, contactName: string) => void
  onClickName: (contact: DashboardContact) => void
}) {
  const overdue = isOverdue(contact)

  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card p-3 shadow-sm hover:shadow-md transition-shadow",
        overdue && "bg-amber-50 dark:bg-amber-950/20",
        isFocused && "ring-2 ring-indigo-500 ring-offset-1",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 min-w-0 flex-1">
          <Checkbox
            checked={selected}
            onCheckedChange={() => onToggleSelect(contact.id)}
            className="mt-0.5 shrink-0"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <button
                className="text-sm font-medium text-foreground truncate hover:underline text-left"
                onClick={() => onClickName(contact)}
              >
                {contact.company ?? contact.customerName}
              </button>
              {overdue && (
                <Badge variant="destructive" className="text-[9px] px-1.5 py-0 shrink-0">
                  OVERDUE
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {contact.customerName}
            </p>
          </div>
        </div>
        <span className={cn(
          "text-xs shrink-0 font-mono",
          overdue ? "text-red-600 font-medium" : "text-muted-foreground",
        )}>
          {formatDueAt(contact)}
        </span>
      </div>

      <div className="flex items-center gap-2 mt-2 ml-8">
        <span className="text-[11px] text-muted-foreground">
          {contact.sequenceName}
        </span>
        <span className="text-[10px] text-muted-foreground">
          Step {contact.currentStep} of {contact.totalSteps}
        </span>
      </div>

      <div className="flex items-center justify-between mt-2.5 ml-8">
        <ChannelBadge channel={contact.channel} />
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => onCopyBody(contact.id, contact.customerName)}
          >
            <Copy className="h-3 w-3 mr-1" aria-hidden="true" />
            Copy
          </Button>
          <Button
            size="sm"
            className="h-7 text-xs"
            onClick={() => onMarkSent(contact.id)}
          >
            <Check className="h-3 w-3 mr-1" aria-hidden="true" />
            Mark Sent
          </Button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sequence Mini Table
// ---------------------------------------------------------------------------

function SequenceMiniTable() {
  const sequencesQuery = api.outreach.listSequences.useQuery()
  const sequences = sequencesQuery.data

  if (sequencesQuery.isLoading) {
    return (
      <Card>
        <CardContent className="p-4">
          <p className="text-sm font-medium text-foreground mb-3">Sequences</p>
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-6 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  const activeSequences = (sequences ?? []).filter((s) => s.isActive && !s.archivedAt)

  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-sm font-medium text-foreground mb-3">Sequences</p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left pb-2 text-muted-foreground font-medium">Sequence</th>
                <th className="text-right pb-2 text-muted-foreground font-medium">Sector</th>
                <th className="text-right pb-2 text-muted-foreground font-medium">Steps</th>
              </tr>
            </thead>
            <tbody>
              {activeSequences.map((seq) => (
                <tr key={seq.id} className="border-b border-border last:border-0">
                  <td className="py-1.5 text-foreground truncate max-w-[120px]">{seq.name}</td>
                  <td className="py-1.5 text-right text-muted-foreground">{seq.sector}</td>
                  <td className="py-1.5 text-right font-mono">{seq.steps.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Outreach Today — Main Component
// ---------------------------------------------------------------------------

interface OutreachTodayProps {
  dueContacts: DashboardContact[]
  recentReplies: DashboardContact[]
  todayStats?: {
    sent: number
    replied: number
    bounced: number
    optedOut: number
    converted: number
    callsCompleted: number
    meetingsBooked: number
  }
  isLoading?: boolean
}

export function OutreachToday({ dueContacts, recentReplies, todayStats, isLoading }: OutreachTodayProps) {
  const utils = api.useUtils()

  // Mutations
  const logActivity = api.outreach.logActivity.useMutation({
    onSuccess: () => { void utils.outreach.getDashboard.invalidate() },
  })

  const batchLogActivity = api.outreach.batchLogActivity.useMutation({
    onSuccess: () => {
      void utils.outreach.getDashboard.invalidate()
      setSelectedIds(new Set())
    },
  })

  // Contact detail slide-over
  const [selectedContact, setSelectedContact] = useState<DashboardContact | null>(null)

  // Batch selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  function toggleSelect(contactId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(contactId)) next.delete(contactId)
      else next.add(contactId)
      return next
    })
  }

  // Sector filter
  const sectors = useMemo(() => {
    const set = new Set(dueContacts.map((c) => c.sector))
    return Array.from(set).sort()
  }, [dueContacts])

  const [sectorFilter, setSectorFilter] = useState<string | null>(null)

  const filteredContacts = sectorFilter
    ? dueContacts.filter((c) => c.sector === sectorFilter)
    : dueContacts

  const overdueContacts = filteredContacts.filter((c) => isOverdue(c))
  const todayContacts = filteredContacts.filter((c) => !isOverdue(c))
  const allContacts = [...overdueContacts, ...todayContacts]

  // Keyboard navigation
  const [focusedIndex, setFocusedIndex] = useState(0)
  const [showShortcuts, setShowShortcuts] = useState(false)

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      const contact = allContacts[focusedIndex]
      if (!contact && e.key !== "?") return

      switch (e.key) {
        case "j":
          e.preventDefault()
          setFocusedIndex(i => Math.min(i + 1, allContacts.length - 1))
          break
        case "k":
          e.preventDefault()
          setFocusedIndex(i => Math.max(i - 1, 0))
          break
        case "s":
          e.preventDefault()
          if (contact) handleMarkSent(contact.id)
          break
        case "c":
          e.preventDefault()
          if (contact) handleCopyBody(contact.id, contact.customerName)
          break
        case "o": {
          e.preventDefault()
          if (contact) {
            const mailto = `mailto:${contact.customerEmail ?? ""}?subject=${encodeURIComponent(contact.subject ?? "")}`
            window.open(mailto, "_blank")
          }
          break
        }
        case "x":
          e.preventDefault()
          if (contact) toggleSelect(contact.id)
          break
        case "?":
          e.preventDefault()
          setShowShortcuts(v => !v)
          break
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [focusedIndex, allContacts])

  function selectAll() {
    if (selectedIds.size === filteredContacts.length) setSelectedIds(new Set())
    else setSelectedIds(new Set(filteredContacts.map((c) => c.id)))
  }

  // Mark sent
  async function handleMarkSent(contactId: string) {
    await logActivity.mutateAsync({ contactId, activityType: "SENT" })
    toast.success("Marked as sent", { duration: 5000 })
  }

  // Batch actions
  async function handleBatchMarkSent() {
    const ids = Array.from(selectedIds)
    await batchLogActivity.mutateAsync({ contactIds: ids, activityType: "SENT" })
    toast.success(`Marked ${ids.length} as sent`)
  }

  async function handleBatchSkip() {
    const ids = Array.from(selectedIds)
    await batchLogActivity.mutateAsync({ contactIds: ids, activityType: "SKIPPED" })
    toast.success(`Skipped ${ids.length} contacts`)
  }

  // Copy to clipboard
  async function handleCopyBody(contactId: string, contactName: string) {
    try {
      const rendered = await utils.outreach.getBody.fetch({ contactId })
      const text = rendered.subject
        ? `Subject: ${rendered.subject}\n\n${rendered.body}`
        : rendered.body
      await navigator.clipboard.writeText(text)
      toast.success(`Copied email for ${contactName}`)
    } catch {
      toast.error("Failed to copy — template may not be available")
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 space-y-3">
          <Skeleton className="h-5 w-24" />
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-lg" />
          ))}
        </div>
        <div className="lg:col-span-2 space-y-4">
          <Skeleton className="h-48 w-full rounded-lg" />
          <Skeleton className="h-40 w-full rounded-lg" />
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      {/* Left column — Due Contacts Queue (60%) */}
      <div className="lg:col-span-3 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-foreground">Due Today</h2>
            <Badge variant="secondary" className="font-mono text-[10px]">
              {filteredContacts.length}
            </Badge>
          </div>
          {filteredContacts.length > 0 && (
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={selectAll}>
              {selectedIds.size === filteredContacts.length ? "Deselect All" : "Select All"}
            </Button>
          )}
        </div>

        {/* Sector filter chips */}
        {sectors.length > 1 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <Button
              variant={sectorFilter === null ? "default" : "outline"}
              size="sm"
              className="h-6 text-[10px] px-2"
              onClick={() => setSectorFilter(null)}
            >
              All
            </Button>
            {sectors.map((sector) => (
              <Button
                key={sector}
                variant={sectorFilter === sector ? "default" : "outline"}
                size="sm"
                className="h-6 text-[10px] px-2"
                onClick={() => setSectorFilter(sectorFilter === sector ? null : sector)}
              >
                {sector}
              </Button>
            ))}
          </div>
        )}

        {/* Batch actions bar */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50/50 dark:border-indigo-800 dark:bg-indigo-950/20 p-2">
            <span className="text-xs text-muted-foreground">
              {selectedIds.size} selected
            </span>
            <div className="flex-1" />
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={handleBatchSkip}
              disabled={batchLogActivity.isPending}
            >
              Skip ({selectedIds.size})
            </Button>
            <Button
              size="sm"
              className="h-7 text-xs"
              onClick={handleBatchMarkSent}
              disabled={batchLogActivity.isPending}
            >
              Mark Sent ({selectedIds.size})
            </Button>
          </div>
        )}

        {/* Keyboard shortcuts help */}
        {showShortcuts && (
          <Card className="p-4">
            <p className="text-sm font-semibold mb-2">Keyboard Shortcuts</p>
            <div className="grid grid-cols-2 gap-1 text-sm text-muted-foreground">
              <span><kbd className="px-1 bg-muted rounded text-xs">j/k</kbd> Navigate</span>
              <span><kbd className="px-1 bg-muted rounded text-xs">s</kbd> Mark sent</span>
              <span><kbd className="px-1 bg-muted rounded text-xs">c</kbd> Copy body</span>
              <span><kbd className="px-1 bg-muted rounded text-xs">o</kbd> Open in Gmail</span>
              <span><kbd className="px-1 bg-muted rounded text-xs">x</kbd> Toggle select</span>
              <span><kbd className="px-1 bg-muted rounded text-xs">?</kbd> Toggle shortcuts</span>
            </div>
          </Card>
        )}

        {/* Contact list (overdue first, then today) */}
        {allContacts.length > 0 && (
          <div className="space-y-2">
            {allContacts.map((contact, index) => (
              <ContactCard
                key={contact.id}
                contact={contact}
                selected={selectedIds.has(contact.id)}
                isFocused={index === focusedIndex}
                onToggleSelect={toggleSelect}
                onMarkSent={handleMarkSent}
                onCopyBody={handleCopyBody}
                onClickName={setSelectedContact}
              />
            ))}
          </div>
        )}

        {filteredContacts.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-sm text-muted-foreground">
                {sectorFilter
                  ? `No contacts due for ${sectorFilter}.`
                  : "All caught up! No more contacts due today."}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Right column (40%) */}
      <div className="lg:col-span-2 space-y-4">
        {/* Recent Replies */}
        <Card>
          <CardContent className="p-4">
            <p className="text-sm font-medium text-foreground mb-3">Recent Replies</p>
            <div className="space-y-3">
              {recentReplies.length === 0 && (
                <p className="text-xs text-muted-foreground">No recent replies.</p>
              )}
              {recentReplies.map((reply) => (
                <div key={reply.id} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-foreground truncate">
                      {reply.company ?? reply.customerName}
                    </p>
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {reply.customerName} — {reply.sequenceName}
                  </p>
                  <Button variant="outline" size="sm" className="h-6 text-[10px] mt-1">
                    <ArrowRightCircle className="h-3 w-3 mr-1" aria-hidden="true" />
                    Convert to Deal
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Today's Progress */}
        <Card>
          <CardContent className="p-4">
            <p className="text-sm font-medium text-foreground mb-1">Today&apos;s Progress</p>
            <ProgressRing
              sent={todayStats?.sent ?? 0}
              total={(todayStats?.sent ?? 0) + dueContacts.length}
            />
          </CardContent>
        </Card>

        {/* Sequence Performance */}
        <SequenceMiniTable />
      </div>

      <ContactDetail
        contact={selectedContact}
        open={selectedContact !== null}
        onOpenChange={(open) => { if (!open) setSelectedContact(null) }}
      />
    </div>
  )
}
