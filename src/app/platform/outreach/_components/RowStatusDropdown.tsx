"use client"

import { useEffect, useRef, useState } from "react"
import { api } from "@/lib/trpc/react"
import type { OutreachLeadStatus } from "@/modules/outreach/outreach.types"

interface RowStatusDropdownProps {
  leadId: string
  currentStatus: OutreachLeadStatus
  onChanged?: (newStatus: OutreachLeadStatus) => void
  onRequestDnc?: () => void
}

const ALL_STATUSES: OutreachLeadStatus[] = [
  "ready",
  "draft",
  "sent",
  "skipped",
  "dnc",
]

export default function RowStatusDropdown({
  leadId,
  currentStatus,
  onChanged,
  onRequestDnc,
}: RowStatusDropdownProps) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLSpanElement | null>(null)

  const utils = api.useUtils()
  const updateLead = api.outreach.updateLead.useMutation({
    onSuccess: (lead) => {
      void utils.outreach.listLeads.invalidate()
      void utils.outreach.tabCounts.invalidate()
      setOpen(false)
      onChanged?.(lead.status as OutreachLeadStatus)
    },
  })

  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [open])

  function handleSelect(next: OutreachLeadStatus, e: React.MouseEvent) {
    e.stopPropagation()
    if (next === currentStatus) {
      setOpen(false)
      return
    }
    if (next === "dnc") {
      setOpen(false)
      onRequestDnc?.()
      return
    }
    updateLead.mutate({ id: leadId, status: next })
  }

  const isPending = updateLead.isPending

  return (
    <span
      ref={wrapRef}
      style={{ position: "relative", display: "inline-block" }}
      onClick={(e) => e.stopPropagation()}
    >
      <span
        className={`status-pill ${currentStatus}`}
        style={{ cursor: "pointer", opacity: isPending ? 0.55 : 1 }}
        onClick={(e) => {
          e.stopPropagation()
          setOpen((v) => !v)
        }}
      >
        <span className="dot" />
        {currentStatus}
        {isPending ? <span style={{ marginLeft: 4 }}>…</span> : null}
      </span>
      {open ? (
        <div className="pill-menu" onClick={(e) => e.stopPropagation()}>
          {ALL_STATUSES.filter((s) => s !== currentStatus).map((s) => (
            <button
              key={s}
              type="button"
              onClick={(e) => handleSelect(s, e)}
              disabled={isPending}
            >
              <span
                className={`status-pill ${s}`}
                style={{ pointerEvents: "none" }}
              >
                <span className="dot" />
                {s === "dnc" ? "Move to DNC…" : s}
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </span>
  )
}
