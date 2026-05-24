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
    <div
      style={{
        padding: 24,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "var(--ih-bg)",
      }}
    >
      {/* Contact header */}
      <div style={{ marginBottom: 16, paddingBottom: 14, borderBottom: "1px solid var(--ih-line)" }}>
        <h2
          className="ih-serif"
          style={{ margin: 0, fontSize: 22, color: "var(--ih-ink)" }}
        >
          {contact.contactName ?? contact.label}
        </h2>
        <p
          className="ih-mono"
          style={{
            margin: 0,
            marginTop: 4,
            fontSize: 10,
            color: "var(--ih-ink-40)",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}
        >
          {contact.contactRole ?? "—"} · {contact.contactEmail ?? "No email"}
        </p>
      </div>

      {/* Form responses placeholder */}
      {contact.formSendId && (
        <div
          style={{
            marginBottom: 14,
            borderRadius: "var(--ih-r-md)",
            border: "1px solid var(--ih-line)",
            background: "var(--ih-surface-2)",
            padding: 12,
          }}
        >
          <p
            className="ih-mono"
            style={{
              fontSize: 9,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              color: "var(--ih-ink-40)",
              marginBottom: 4,
              margin: 0,
            }}
          >
            Form responses
          </p>
          <p
            style={{
              fontSize: 12,
              color: "var(--ih-ink-50)",
              fontStyle: "italic",
              fontFamily: "var(--ih-font-sans)",
              marginTop: 6,
              margin: 0,
            }}
          >
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
        style={{
          flex: 1,
          width: "100%",
          borderRadius: "var(--ih-r-md)",
          border: "1px solid var(--ih-line)",
          background: "var(--ih-surface)",
          padding: 16,
          fontSize: 13,
          fontFamily: "var(--ih-font-mono)",
          lineHeight: 1.65,
          resize: "none",
          color: "var(--ih-ink)",
          outline: "none",
          opacity: disabled ? 0.5 : 1,
          boxSizing: "border-box",
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = "var(--ih-accent)"
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = "var(--ih-line)"
        }}
      />

      {/* Save status */}
      <div
        style={{
          marginTop: 8,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span
          className="ih-mono"
          style={{
            fontSize: 9.5,
            color: "var(--ih-ink-40)",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}
        >
          {upsertMutation.isPending && "Saving…"}
          {!upsertMutation.isPending &&
            savedAt &&
            `Saved ${savedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
        </span>
        <span
          className="ih-mono"
          style={{ fontSize: 9.5, color: "var(--ih-ink-30)" }}
        >
          {notes.length} chars
        </span>
      </div>
    </div>
  )
}
