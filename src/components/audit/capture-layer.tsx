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
    <div className="flex h-full">
      {/* Sidebar */}
      <div className="w-72 border-r border-border overflow-y-auto p-4">
        <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Contacts</p>
        {chartQuery.isLoading ? (
          <p className="text-xs text-muted-foreground">Loading contacts…</p>
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
      <div className="flex-1 overflow-y-auto">
        {selectedContact && effectiveSelectedId ? (
          <CallNotesPane
            engagementId={engagementId}
            contactId={effectiveSelectedId}
            contact={selectedContact}
            callNotes={session.callNotes}
            disabled={disabled}
          />
        ) : (
          <div className="p-8 text-sm text-muted-foreground">
            {contacts.length === 0
              ? "No contacts yet — build the org chart first."
              : "Select a contact to take notes."}
          </div>
        )}
      </div>
    </div>
  )
}
