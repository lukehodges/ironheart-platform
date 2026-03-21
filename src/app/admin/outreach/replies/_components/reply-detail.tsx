"use client"

import { useState } from "react"
import {
  Check,
  Clock,
  ArrowRightLeft,
  Bot,
  ThumbsDown,
  ThumbsUp,
  CalendarClock,
  Mail,
  Linkedin,
  Phone,
  MessageSquare,
  StickyNote,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { api } from "@/lib/trpc/react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import type {
  OutreachContactWithDetails,
  OutreachReplyCategory,
  OutreachActivityRecord,
  OutreachChannel,
} from "@/modules/outreach/outreach.types"

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ReplyDetailProps {
  contact: OutreachContactWithDetails
  onContactUpdated: () => void
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

function nextQuarter(): Date {
  const now = new Date()
  const currentQuarter = Math.floor(now.getMonth() / 3)
  const nextQ = currentQuarter + 1
  if (nextQ >= 4) {
    return new Date(now.getFullYear() + 1, 0, 1)
  }
  return new Date(now.getFullYear(), nextQ * 3, 1)
}

function formatDate(date: Date | string | null): string {
  if (!date) return "N/A"
  const d = typeof date === "string" ? new Date(date) : date
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

function formatTimestamp(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

const CHANNEL_LABEL: Record<OutreachChannel, string> = {
  EMAIL: "Email",
  LINKEDIN_REQUEST: "LinkedIn Request",
  LINKEDIN_MESSAGE: "LinkedIn Message",
  CALL: "Call",
}

function channelIcon(channel: string) {
  switch (channel) {
    case "EMAIL":
      return <Mail className="h-3.5 w-3.5" />
    case "LINKEDIN_REQUEST":
    case "LINKEDIN_MESSAGE":
      return <Linkedin className="h-3.5 w-3.5" />
    case "CALL":
      return <Phone className="h-3.5 w-3.5" />
    default:
      return <MessageSquare className="h-3.5 w-3.5" />
  }
}

// ---------------------------------------------------------------------------
// Category config
// ---------------------------------------------------------------------------

const CATEGORIES: {
  value: OutreachReplyCategory
  label: string
  activeClass: string
  icon: React.ReactNode
}[] = [
  {
    value: "INTERESTED",
    label: "Interested",
    activeClass: "bg-emerald-100 text-emerald-800 border-emerald-300",
    icon: <ThumbsUp className="h-3.5 w-3.5" />,
  },
  {
    value: "NOT_NOW",
    label: "Not Now",
    activeClass: "bg-amber-100 text-amber-800 border-amber-300",
    icon: <Clock className="h-3.5 w-3.5" />,
  },
  {
    value: "NOT_INTERESTED",
    label: "Not Interested",
    activeClass: "bg-red-100 text-red-800 border-red-300",
    icon: <ThumbsDown className="h-3.5 w-3.5" />,
  },
  {
    value: "WRONG_PERSON",
    label: "Wrong Person",
    activeClass: "bg-gray-200 text-gray-700 border-gray-400",
    icon: <ArrowRightLeft className="h-3.5 w-3.5" />,
  },
  {
    value: "AUTO_REPLY",
    label: "Auto Reply",
    activeClass: "bg-gray-100 text-gray-600 border-gray-300",
    icon: <Bot className="h-3.5 w-3.5" />,
  },
]

const ACTIVITY_TYPE_LABEL: Record<string, string> = {
  SENT: "Sent",
  REPLIED: "Replied",
  BOUNCED: "Bounced",
  OPTED_OUT: "Opted Out",
  SKIPPED: "Skipped",
  CALL_COMPLETED: "Call Completed",
  MEETING_BOOKED: "Meeting Booked",
  CONVERTED: "Converted",
  UNDONE: "Undone",
}

const ACTIVITY_TYPE_VARIANT: Record<string, "default" | "success" | "warning" | "destructive" | "info" | "secondary"> = {
  SENT: "default",
  REPLIED: "success",
  BOUNCED: "destructive",
  OPTED_OUT: "warning",
  SKIPPED: "secondary",
  CALL_COMPLETED: "info",
  MEETING_BOOKED: "success",
  CONVERTED: "success",
  UNDONE: "secondary",
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ReplyDetail({ contact, onContactUpdated }: ReplyDetailProps) {
  const [showSnooze, setShowSnooze] = useState(false)
  const [customDate, setCustomDate] = useState("")

  const utils = api.useUtils()

  const categorize = api.outreach.categorizeContact.useMutation({
    onSuccess: () => {
      toast.success("Category updated")
      void utils.outreach.listContacts.invalidate()
      onContactUpdated()
    },
    onError: (err) => {
      toast.error(err.message)
    },
  })

  const snooze = api.outreach.snoozeContact.useMutation({
    onSuccess: () => {
      toast.success("Contact snoozed")
      setShowSnooze(false)
      void utils.outreach.listContacts.invalidate()
      onContactUpdated()
    },
    onError: (err) => {
      toast.error(err.message)
    },
  })

  const activitiesQuery = api.outreach.getContactActivities.useQuery({
    contactId: contact.id,
    limit: 50,
  })

  const name = `${contact.customerFirstName} ${contact.customerLastName}`

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* ----------------------------------------------------------------- */}
      {/* 1. Contact Header                                                  */}
      {/* ----------------------------------------------------------------- */}
      <div>
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold">{name}</h2>
          <Badge variant="secondary">{contact.sector}</Badge>
          <Badge variant="outline">{contact.status}</Badge>
        </div>
        {contact.customerEmail && (
          <p className="mt-1 text-sm text-muted-foreground">
            {contact.customerEmail}
          </p>
        )}
        <p className="mt-1 text-sm text-muted-foreground">
          Replied at Step {contact.currentStep} of {contact.sequenceName}
        </p>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* 2. One-Click Categorization                                        */}
      {/* ----------------------------------------------------------------- */}
      <div>
        <p className="mb-2 text-sm font-medium text-muted-foreground">
          Categorize Reply
        </p>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => {
            const isActive = contact.replyCategory === cat.value
            return (
              <button
                key={cat.value}
                type="button"
                disabled={categorize.isPending}
                onClick={() =>
                  categorize.mutate({
                    contactId: contact.id,
                    replyCategory: cat.value,
                  })
                }
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors",
                  isActive
                    ? cat.activeClass
                    : "border-border bg-background text-foreground hover:bg-accent",
                  categorize.isPending && "opacity-50 cursor-not-allowed"
                )}
              >
                {isActive ? <Check className="h-3.5 w-3.5" /> : cat.icon}
                {cat.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* 3. Action Bar                                                      */}
      {/* ----------------------------------------------------------------- */}
      <div className="flex items-center gap-2">
        <Button variant="outline" disabled title="Coming soon">
          Convert to Deal
        </Button>
        <Button
          variant={showSnooze ? "secondary" : "outline"}
          onClick={() => setShowSnooze(!showSnooze)}
        >
          <CalendarClock className="h-4 w-4" />
          Snooze
        </Button>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* 4. Snooze Scheduler                                                */}
      {/* ----------------------------------------------------------------- */}
      {showSnooze && (
        <Card>
          <CardContent className="pt-4">
            <p className="mb-3 text-sm font-medium">Snooze until</p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                loading={snooze.isPending}
                onClick={() =>
                  snooze.mutate({
                    contactId: contact.id,
                    snoozedUntil: addDays(new Date(), 7),
                  })
                }
              >
                1 week
              </Button>
              <Button
                variant="outline"
                size="sm"
                loading={snooze.isPending}
                onClick={() =>
                  snooze.mutate({
                    contactId: contact.id,
                    snoozedUntil: addDays(new Date(), 14),
                  })
                }
              >
                2 weeks
              </Button>
              <Button
                variant="outline"
                size="sm"
                loading={snooze.isPending}
                onClick={() =>
                  snooze.mutate({
                    contactId: contact.id,
                    snoozedUntil: addDays(new Date(), 30),
                  })
                }
              >
                1 month
              </Button>
              <Button
                variant="outline"
                size="sm"
                loading={snooze.isPending}
                onClick={() =>
                  snooze.mutate({
                    contactId: contact.id,
                    snoozedUntil: nextQuarter(),
                  })
                }
              >
                Next quarter
              </Button>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <Input
                type="date"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                className="w-auto"
              />
              <Button
                size="sm"
                disabled={!customDate || snooze.isPending}
                loading={snooze.isPending}
                onClick={() => {
                  if (!customDate) return
                  snooze.mutate({
                    contactId: contact.id,
                    snoozedUntil: new Date(customDate),
                  })
                }}
              >
                Set
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* 5. Sequence Context                                                */}
      {/* ----------------------------------------------------------------- */}
      <Card>
        <CardContent className="pt-4">
          <p className="mb-3 text-sm font-medium">Sequence Context</p>
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div>
              <span className="text-muted-foreground">Sequence</span>
              <p className="font-medium">{contact.sequenceName}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Sector</span>
              <p className="font-medium">{contact.sector}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Current Step</span>
              <p className="font-medium">
                Step {contact.currentStep}
                {contact.currentStepTemplate && (
                  <span className="ml-1.5 text-muted-foreground">
                    ({CHANNEL_LABEL[contact.currentStepTemplate.channel]})
                  </span>
                )}
              </p>
            </div>
            {contact.snoozedUntil && (
              <div>
                <span className="text-muted-foreground">Snoozed Until</span>
                <p className="font-medium text-amber-600">
                  {formatDate(contact.snoozedUntil)}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ----------------------------------------------------------------- */}
      {/* 6. Activity Timeline                                               */}
      {/* ----------------------------------------------------------------- */}
      <div>
        <p className="mb-3 text-sm font-medium">Activity Timeline</p>
        {activitiesQuery.isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="h-4 w-4 rounded-full" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : activitiesQuery.data?.activities.length === 0 ? (
          <p className="text-sm text-muted-foreground">No activity recorded.</p>
        ) : (
          <div className="relative ml-2 border-l border-border pl-6">
            {activitiesQuery.data?.activities.map(
              (activity: OutreachActivityRecord) => (
                <div key={activity.id} className="relative pb-5 last:pb-0">
                  {/* Timeline dot */}
                  <div className="absolute -left-[31px] top-1 h-3 w-3 rounded-full border-2 border-background bg-muted-foreground" />

                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant={
                        ACTIVITY_TYPE_VARIANT[activity.activityType] ?? "default"
                      }
                    >
                      {ACTIVITY_TYPE_LABEL[activity.activityType] ??
                        activity.activityType}
                    </Badge>
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      {channelIcon(activity.channel)}
                      Step {activity.stepPosition}
                    </span>
                  </div>

                  {activity.notes && (
                    <p className="mt-1 text-sm text-foreground">
                      {activity.notes}
                    </p>
                  )}

                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {formatTimestamp(activity.occurredAt)}
                  </p>
                </div>
              )
            )}
          </div>
        )}
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* 7. Notes                                                           */}
      {/* ----------------------------------------------------------------- */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <StickyNote className="h-4 w-4 text-muted-foreground" />
          <p className="text-sm font-medium">Notes</p>
        </div>
        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
          {contact.notes || "No notes"}
        </p>
      </div>
    </div>
  )
}
