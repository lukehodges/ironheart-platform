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
    return (
      <div
        style={{
          fontSize: 12,
          color: "var(--ih-ink-50)",
          fontFamily: "var(--ih-font-sans)",
          fontStyle: "italic",
        }}
      >
        No contacts in chart.
      </div>
    )
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {contacts.map((c) => {
        const id = c.contactUserId ?? c.id
        const hasNotes = callNotes.some(
          (n) => n.contactUserId === id && n.rawNotes && n.rawNotes.length > 0,
        )
        const isSelected = selectedId === id
        return (
          <button
            key={id}
            onClick={() => onSelect(id)}
            style={{
              width: "100%",
              textAlign: "left",
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 8px",
              borderRadius: "var(--ih-r-sm)",
              background: isSelected ? "var(--ih-surface)" : "transparent",
              border: isSelected
                ? "1px solid var(--ih-line)"
                : "1px solid transparent",
              cursor: "pointer",
              position: "relative",
              fontFamily: "var(--ih-font-sans)",
              transition: "background 0.12s",
            }}
          >
            {isSelected && (
              <span
                style={{
                  position: "absolute",
                  left: -8,
                  top: "50%",
                  transform: "translateY(-50%)",
                  width: 2,
                  height: 14,
                  background: "var(--ih-accent)",
                  borderRadius: 2,
                }}
              />
            )}
            {hasNotes ? (
              <CheckCircle2
                size={13}
                style={{ flexShrink: 0, color: "var(--ih-ok)" }}
              />
            ) : (
              <Circle
                size={13}
                style={{ flexShrink: 0, color: "var(--ih-ink-30)" }}
              />
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p
                style={{
                  fontSize: 12,
                  fontWeight: isSelected ? 500 : 400,
                  color: isSelected ? "var(--ih-ink)" : "var(--ih-ink-65)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  margin: 0,
                }}
              >
                {c.contactName ?? c.label}
              </p>
              <p
                className="ih-mono"
                style={{
                  fontSize: 9.5,
                  color: "var(--ih-ink-40)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  margin: 0,
                  marginTop: 1,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                {c.contactRole ?? c.contactEmail ?? "—"}
              </p>
            </div>
          </button>
        )
      })}
    </div>
  )
}
