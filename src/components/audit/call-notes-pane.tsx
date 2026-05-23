"use client"

import { useEffect, useState, useRef } from "react"
import { api } from "@/lib/trpc/react"
import type { OrgChartTree } from "@/modules/onboarding/onboarding.types"
import type { AuditCallNoteRecord } from "@/modules/audit-workspace/audit-workspace.types"

interface Props {
  engagementId: string
  contactId: string
  contact: OrgChartTree
  callNotes: AuditCallNoteRecord[]
  disabled?: boolean
}

export function CallNotesPane({ engagementId, contactId, contact, callNotes, disabled }: Props) {
  const existingNote = callNotes.find((n) => n.contactUserId === contactId)
  const [notes, setNotes] = useState(existingNote?.rawNotes ?? "")
  const [savedAt, setSavedAt] = useState<Date | null>(
    existingNote?.updatedAt ? new Date(existingNote.updatedAt) : null,
  )
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const utils = api.useUtils()
  const upsertMutation = api.auditWorkspace.upsertCallNoteByEngagement.useMutation({
    onSuccess: () => {
      setSavedAt(new Date())
      void utils.auditWorkspace.getOrCreate.invalidate({ engagementId })
    },
  })

  // Reset when contact changes
  useEffect(() => {
    const note = callNotes.find((n) => n.contactUserId === contactId)
    setNotes(note?.rawNotes ?? "")
    setSavedAt(note?.updatedAt ? new Date(note.updatedAt) : null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contactId])

  const handleChange = (value: string) => {
    setNotes(value)
    if (disabled) return
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      upsertMutation.mutate({
        engagementId,
        contactUserId: contactId,
        rawNotes: value,
      })
    }, 500)
  }

  return (
    <div className="p-6 h-full flex flex-col">
      {/* Contact header */}
      <div className="mb-4">
        <h2 className="font-serif text-xl">{contact.contactName ?? contact.label}</h2>
        <p className="text-sm text-muted-foreground">
          {contact.contactRole ?? "—"} · {contact.contactEmail ?? "No email"}
        </p>
      </div>

      {/* Form responses placeholder */}
      {contact.formSendId && (
        <div className="mb-4 rounded-md border border-border bg-muted/30 p-3">
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
            Form responses
          </p>
          <p className="text-sm text-muted-foreground italic">
            Form sent — responses surface here once completed (in-workspace summary coming in 0.4+).
          </p>
        </div>
      )}

      {/* Notes textarea */}
      <textarea
        value={notes}
        onChange={(e) => handleChange(e.target.value)}
        disabled={disabled}
        placeholder="Call notes — what did they tell you?"
        className="flex-1 w-full rounded-md border border-border bg-background p-4 text-sm font-mono leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
      />

      {/* Save status */}
      <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {upsertMutation.isPending && "Saving…"}
          {!upsertMutation.isPending &&
            savedAt &&
            `Saved ${savedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
        </span>
        <span>{notes.length} chars</span>
      </div>
    </div>
  )
}
