"use client"

import { api } from "@/lib/trpc/react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import {
  Mail, Linkedin, Phone, Send, SkipForward,
  MessageSquare, Pause, ArrowRightCircle, Clock,
  CheckCircle2,
} from "lucide-react"
import type { DashboardContact, OutreachChannel } from "@/modules/outreach/outreach.types"

interface ContactDetailProps {
  contact: DashboardContact | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

const CHANNEL_ICONS: Record<OutreachChannel, React.ElementType> = {
  EMAIL: Mail,
  LINKEDIN_REQUEST: Linkedin,
  LINKEDIN_MESSAGE: Linkedin,
  CALL: Phone,
}

export function ContactDetail({ contact, open, onOpenChange }: ContactDetailProps) {
  if (!contact) return null

  const utils = api.useUtils()
  const activitiesQuery = api.outreach.getContactActivities.useQuery(
    { contactId: contact.id, limit: 20 },
    { enabled: open },
  )

  const logActivity = api.outreach.logActivity.useMutation({
    onSuccess: () => {
      void utils.outreach.getDashboard.invalidate()
      void activitiesQuery.refetch()
      toast.success("Activity logged")
    },
    onError: (err) => toast.error(err.message),
  })

  const pauseContact = api.outreach.pauseContact.useMutation({
    onSuccess: () => {
      void utils.outreach.getDashboard.invalidate()
      toast.success("Contact paused")
      onOpenChange(false)
    },
    onError: (err) => toast.error(err.message),
  })

  const activities = activitiesQuery.data?.activities ?? []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>{contact.customerName}</span>
            <Badge variant="outline">{contact.sector}</Badge>
          </DialogTitle>
          <div className="text-sm text-muted-foreground">
            {contact.company && <span>{contact.company} · </span>}
            {contact.customerEmail}
          </div>
        </DialogHeader>

        {/* Sequence Progress */}
        <div className="flex items-center gap-1 py-2">
          {Array.from({ length: contact.totalSteps }, (_, i) => {
            const stepNum = i + 1
            const isCompleted = stepNum < contact.currentStep
            const isCurrent = stepNum === contact.currentStep

            return (
              <div key={stepNum} className="flex items-center gap-1">
                {i > 0 && <div className="w-4 h-px bg-border" />}
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs border ${
                    isCompleted
                      ? "bg-emerald-100 border-emerald-300 text-emerald-700"
                      : isCurrent
                        ? "bg-indigo-100 border-indigo-400 text-indigo-700 ring-2 ring-indigo-200"
                        : "bg-muted border-border text-muted-foreground"
                  }`}
                >
                  {isCompleted ? <CheckCircle2 className="h-3.5 w-3.5" /> : stepNum}
                </div>
              </div>
            )
          })}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-3 gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => logActivity.mutate({ contactId: contact.id, activityType: "SENT" })}
            disabled={logActivity.isPending}
          >
            <Send className="h-3.5 w-3.5 mr-1" /> Mark Sent
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => logActivity.mutate({ contactId: contact.id, activityType: "SKIPPED" })}
            disabled={logActivity.isPending}
          >
            <SkipForward className="h-3.5 w-3.5 mr-1" /> Skip
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => logActivity.mutate({ contactId: contact.id, activityType: "REPLIED" })}
            disabled={logActivity.isPending}
          >
            <MessageSquare className="h-3.5 w-3.5 mr-1" /> Log Reply
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => pauseContact.mutate({ contactId: contact.id })}
            disabled={pauseContact.isPending}
          >
            <Pause className="h-3.5 w-3.5 mr-1" /> Pause
          </Button>
          <Button size="sm" variant="outline" disabled>
            <ArrowRightCircle className="h-3.5 w-3.5 mr-1" /> Convert
          </Button>
          <Button size="sm" variant="outline" disabled>
            <Clock className="h-3.5 w-3.5 mr-1" /> Snooze
          </Button>
        </div>

        {/* Activity Timeline */}
        <div>
          <p className="text-sm font-semibold mb-2">Activity Timeline</p>
          {activitiesQuery.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }, (_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : activities.length === 0 ? (
            <p className="text-sm text-muted-foreground">No activities yet</p>
          ) : (
            <div className="space-y-0 relative">
              <div className="absolute left-3 top-2 bottom-2 w-px bg-border" />
              {activities.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3 py-2 relative">
                  <div className="w-6 h-6 rounded-full bg-muted border flex items-center justify-center z-10">
                    <div className="w-2 h-2 rounded-full bg-foreground/40" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {activity.activityType}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        Step {activity.stepPosition} · {activity.channel}
                      </span>
                    </div>
                    {activity.notes && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {activity.notes}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {new Date(activity.occurredAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Notes */}
        <div>
          <p className="text-sm font-semibold mb-1">Notes</p>
          <p className="text-sm text-muted-foreground">
            {contact.notes || "No notes"}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
