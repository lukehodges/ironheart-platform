"use client"

import { useState } from "react"
import { api } from "@/lib/trpc/react"
import { ContactList } from "./contact-list"
import { CallNotesPane } from "./call-notes-pane"
import type { AuditSessionWithLenses } from "@/modules/audit-workspace/audit-workspace.types"
import type { OrgChartTree } from "@/modules/onboarding/onboarding.types"

interface Props {
  engagementId: string
  session: AuditSessionWithLenses
  disabled?: boolean
}

function flattenPersons(tree: OrgChartTree[]): OrgChartTree[] {
  const out: OrgChartTree[] = []
  const walk = (n: OrgChartTree) => {
    if (n.type === "PERSON" && n.contactEmail) out.push(n)
    for (const c of n.children ?? []) walk(c)
  }
  for (const r of tree) walk(r)
  return out
}

export function CaptureLayer({ engagementId, session, disabled }: Props) {
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null)

  const chartQuery = api.onboarding.getChart.useQuery({ engagementId })
  const contacts = flattenPersons(chartQuery.data ?? [])

  // Default-select first contact when list becomes available
  const effectiveSelectedId =
    selectedContactId ?? (contacts.length > 0 ? (contacts[0].contactUserId ?? contacts[0].id) : null)

  const selectedContact = contacts.find(
    (c) => (c.contactUserId ?? c.id) === effectiveSelectedId,
  )

  const handleSelect = (id: string) => setSelectedContactId(id)

  return (
    <div style={{ display: "flex", height: "100%" }}>
      {/* Sidebar */}
      <div
        style={{
          width: 288,
          borderRight: "1px solid var(--ih-line)",
          overflowY: "auto",
          padding: 16,
          background: "var(--ih-surface-2)",
          flexShrink: 0,
        }}
        className="scrollbar-thin"
      >
        <p
          className="ih-mono"
          style={{
            fontSize: 9,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            color: "var(--ih-ink-40)",
            marginBottom: 10,
          }}
        >
          Contacts
        </p>
        {chartQuery.isLoading ? (
          <p style={{ fontSize: 12, color: "var(--ih-ink-50)", fontFamily: "var(--ih-font-sans)" }}>
            Loading contacts…
          </p>
        ) : (
          <ContactList
            contacts={contacts}
            callNotes={session.callNotes}
            selectedId={effectiveSelectedId}
            onSelect={handleSelect}
          />
        )}
      </div>

      {/* Notes pane */}
      <div style={{ flex: 1, overflowY: "auto", background: "var(--ih-bg)" }}>
        {selectedContact && effectiveSelectedId ? (
          <CallNotesPane
            engagementId={engagementId}
            contactId={effectiveSelectedId}
            contact={selectedContact}
            callNotes={session.callNotes}
            disabled={disabled}
          />
        ) : (
          <div
            style={{
              padding: 32,
              fontSize: 13,
              color: "var(--ih-ink-50)",
              fontFamily: "var(--ih-font-sans)",
              fontStyle: "italic",
            }}
          >
            {contacts.length === 0
              ? "No contacts yet — build the org chart first."
              : "Select a contact to take notes."}
          </div>
        )}
      </div>
    </div>
  )
}
