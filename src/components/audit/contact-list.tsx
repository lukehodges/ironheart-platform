"use client"

import { CheckCircle2, Circle } from "lucide-react"
import type { OrgChartTree } from "@/modules/onboarding/onboarding.types"
import type { AuditCallNoteRecord } from "@/modules/audit-workspace/audit-workspace.types"

interface Props {
  contacts: OrgChartTree[]
  callNotes: AuditCallNoteRecord[]
  selectedId: string | null
  onSelect: (id: string) => void
}

export function ContactList({ contacts, callNotes, selectedId, onSelect }: Props) {
  if (contacts.length === 0) {
    return <div className="text-xs text-muted-foreground italic">No contacts in chart.</div>
  }

  return (
    <div className="space-y-1">
      {contacts.map((c) => {
        const id = c.contactUserId ?? c.id
        const hasNotes = callNotes.some(
          (n) => n.contactUserId === id && n.rawNotes && n.rawNotes.length > 0,
        )
        return (
          <button
            key={id}
            onClick={() => onSelect(id)}
            className={`w-full text-left flex items-center gap-2 p-2 rounded text-sm hover:bg-muted/50 transition-colors ${
              selectedId === id ? "bg-muted ring-1 ring-primary" : ""
            }`}
          >
            {hasNotes ? (
              <CheckCircle2 size={14} className="shrink-0 text-emerald-600" />
            ) : (
              <Circle size={14} className="shrink-0 text-muted-foreground" />
            )}
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{c.contactName ?? c.label}</p>
              <p className="text-xs text-muted-foreground truncate">
                {c.contactRole ?? c.contactEmail ?? "—"}
              </p>
            </div>
          </button>
        )
      })}
    </div>
  )
}
