"use client"

import { useState, useEffect } from "react"
import { api } from "@/lib/trpc/react"
import type { OutreachLeadOwner, DailyActivityRecord } from "@/modules/outreach"

interface Props {
  open: boolean
  row: DailyActivityRecord | null
  defaultOwner?: OutreachLeadOwner
  onClose: () => void
}

export default function DailyActivityEditModal({ open, row, defaultOwner, onClose }: Props) {
  const utils = api.useUtils()
  const upsert = api.outreach.upsertDailyActivity.useMutation({
    onSuccess: () => {
      utils.outreach.listDailyActivity.invalidate()
      onClose()
    },
  })

  const today = new Date().toISOString().slice(0, 10)
  const [date, setDate] = useState(row?.date ?? today)
  const [owner, setOwner] = useState<OutreachLeadOwner>(row?.owner ?? defaultOwner ?? "luke")
  const [sent, setSent] = useState(row?.sent ?? 0)
  const [replies, setReplies] = useState(row?.replies ?? 0)
  const [positive, setPositive] = useState(row?.positive ?? 0)
  const [meetingsBooked, setMeetingsBooked] = useState(row?.meetingsBooked ?? 0)
  const [meetingsTaken, setMeetingsTaken] = useState(row?.meetingsTaken ?? 0)
  const [interested, setInterested] = useState(row?.interested ?? 0)
  const [closed, setClosed] = useState(row?.closed ?? 0)
  const [newUpfront, setNewUpfront] = useState(Number(row?.newUpfront ?? 0))
  const [newRetainer, setNewRetainer] = useState(Number(row?.newRetainer ?? 0))
  const [notes, setNotes] = useState(row?.notes ?? "")

  useEffect(() => {
    if (!row) return
    setDate(row.date)
    setOwner(row.owner)
    setSent(row.sent)
    setReplies(row.replies)
    setPositive(row.positive)
    setMeetingsBooked(row.meetingsBooked)
    setMeetingsTaken(row.meetingsTaken)
    setInterested(row.interested)
    setClosed(row.closed)
    setNewUpfront(Number(row.newUpfront))
    setNewRetainer(Number(row.newRetainer))
    setNotes(row.notes ?? "")
  }, [row])

  if (!open) return null

  return (
    <div className="obs">
      <div className="modal-bg" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
        <div className="modal" style={{ width: "min(720px,100%)" }}>
          <div className="mhead">
            <h3>{row ? "Edit" : "Add"} daily activity</h3>
            <button className="close" onClick={onClose}>×</button>
          </div>
          <div className="mbody">
            <p style={{ color: "var(--obs-ink-65)", marginBottom: 14, fontSize: 12.5 }}>
              One row per (date, owner). Sent/Reply/Positive update automatically when you mark leads sent, but you can override here if needed (e.g. you sent from your phone, or you're backfilling).
              Booked/Taken/Interested/Closed/£ live here until Cal + Twenty MCP sync lands.
            </p>
            <div className="grid">
              <div>
                <label>Date</label>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} disabled={!!row} />
              </div>
              <div>
                <label>Owner</label>
                <select value={owner} onChange={(e) => setOwner(e.target.value as OutreachLeadOwner)} disabled={!!row}>
                  <option value="luke">Luke</option>
                  <option value="alex">Alex</option>
                </select>
              </div>
            </div>

            <label style={{ marginTop: 18 }}>Top of funnel (auto-updates when you mark sent)</label>
            <div className="grid" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
              <div><label>Sent</label><input type="number" min={0} value={sent} onChange={(e) => setSent(+e.target.value || 0)} /></div>
              <div><label>Replies</label><input type="number" min={0} value={replies} onChange={(e) => setReplies(+e.target.value || 0)} /></div>
              <div><label>Positive</label><input type="number" min={0} value={positive} onChange={(e) => setPositive(+e.target.value || 0)} /></div>
            </div>

            <label style={{ marginTop: 14 }}>Meetings (will auto-fill from Cal MCP eventually)</label>
            <div className="grid">
              <div><label>Meetings booked</label><input type="number" min={0} value={meetingsBooked} onChange={(e) => setMeetingsBooked(+e.target.value || 0)} /></div>
              <div><label>Meetings attended</label><input type="number" min={0} value={meetingsTaken} onChange={(e) => setMeetingsTaken(+e.target.value || 0)} /></div>
            </div>

            <label style={{ marginTop: 14 }}>Deal stages (will auto-fill from Twenty MCP eventually)</label>
            <div className="grid" style={{ gridTemplateColumns: "repeat(2,1fr)" }}>
              <div><label>Interested</label><input type="number" min={0} value={interested} onChange={(e) => setInterested(+e.target.value || 0)} /></div>
              <div><label>Clients closed</label><input type="number" min={0} value={closed} onChange={(e) => setClosed(+e.target.value || 0)} /></div>
            </div>
            <div className="grid">
              <div><label>£ Upfront</label><input type="number" min={0} step="0.01" value={newUpfront} onChange={(e) => setNewUpfront(+e.target.value || 0)} /></div>
              <div><label>£ Retainer</label><input type="number" min={0} step="0.01" value={newRetainer} onChange={(e) => setNewRetainer(+e.target.value || 0)} /></div>
            </div>

            <label style={{ marginTop: 14 }}>Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What happened this day?" />
          </div>
          <div className="mfoot">
            <button className="btn" onClick={onClose}>Cancel</button>
            <button
              className="btn btn-primary"
              disabled={upsert.isPending}
              onClick={() => upsert.mutate({
                date,
                owner,
                sent,
                replies,
                positive,
                meetingsBooked,
                meetingsTaken,
                interested,
                closed,
                newUpfront,
                newRetainer,
                notes: notes || undefined,
              })}
            >
              {upsert.isPending ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
