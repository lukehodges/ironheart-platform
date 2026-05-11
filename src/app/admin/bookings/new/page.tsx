"use client"

import { useState } from "react"
import { Icon } from "@/components/shell"

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type BookingType = "discovery" | "audit_short" | "audit_long" | "sprint_review" | "checkpoint" | "custom"

const BOOKING_TYPES: { value: BookingType; label: string; duration: string }[] = [
  { value: "discovery", label: "Discovery", duration: "15" },
  { value: "audit_short", label: "Audit call (20m)", duration: "20" },
  { value: "audit_long", label: "Audit call (90m)", duration: "90" },
  { value: "sprint_review", label: "Sprint review", duration: "30" },
  { value: "checkpoint", label: "Checkpoint", duration: "30" },
  { value: "custom", label: "Custom", duration: "" },
]

const CLIENTS = [
  { name: "Northwind Co.", contact: "Mira Sato", initials: "MS" },
  { name: "Olsen Brands", contact: "Tomas Olsen", initials: "TO" },
  { name: "Meridian Health", contact: "Dr. Priya Kapoor", initials: "PK" },
]

const LOCATIONS = ["Zoom", "Phone", "On-site"]

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="ih-eyebrow" style={{ display: "block", marginBottom: 6, fontSize: 10 }}>{children}</label>
}

function Btn({ children, accent, ghost, sm, onClick, style }: { children: React.ReactNode; accent?: boolean; ghost?: boolean; sm?: boolean; onClick?: () => void; style?: React.CSSProperties }) {
  const cls = ["ih-btn", sm && "ih-btn-sm", ghost && "ih-btn-ghost", accent && "ih-btn-accent"].filter(Boolean).join(" ")
  return <button className={cls} onClick={onClick} style={style}>{children}</button>
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function NewBookingPage() {
  const [selectedClient, setSelectedClient] = useState("")
  const [clientSearch, setClientSearch] = useState("")
  const [bookingType, setBookingType] = useState<BookingType>("sprint_review")
  const [date, setDate] = useState("2025-05-13")
  const [time, setTime] = useState("11:30")
  const [duration, setDuration] = useState("30")
  const [location, setLocation] = useState("Zoom")
  const [locationAddress, setLocationAddress] = useState("")
  const [attendees, setAttendees] = useState<string[]>(["Mira Sato"])
  const [newAttendee, setNewAttendee] = useState("")
  const [notes, setNotes] = useState("")

  const handleTypeChange = (type: BookingType) => {
    setBookingType(type)
    const found = BOOKING_TYPES.find(t => t.value === type)
    if (found && found.duration) setDuration(found.duration)
  }

  const addAttendee = () => {
    if (newAttendee.trim() && !attendees.includes(newAttendee.trim())) {
      setAttendees([...attendees, newAttendee.trim()])
      setNewAttendee("")
    }
  }

  const removeAttendee = (name: string) => {
    setAttendees(attendees.filter(a => a !== name))
  }

  const filteredClients = CLIENTS.filter(c =>
    c.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
    c.contact.toLowerCase().includes(clientSearch.toLowerCase())
  )

  return (
    <div style={{ margin: "-24px -24px" }}>
      {/* Header */}
      <div style={{ padding: "24px 28px 18px", borderBottom: "1px solid var(--ih-line)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
            <button className="ih-btn ih-btn-quiet ih-btn-sm" style={{ padding: "2px 6px" }}>
              <Icon name="chevronLeft" size={12} /> Back
            </button>
            <span className="ih-eyebrow">new booking</span>
          </div>
          <h1 className="ih-serif" style={{ margin: 0, fontSize: 32, lineHeight: 1 }}>Book a session</h1>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn sm ghost>Cancel</Btn>
          <Btn sm accent><Icon name="calendar" size={11} /> Book</Btn>
        </div>
      </div>

      {/* Form body */}
      <div style={{ maxWidth: 680, padding: "28px 28px 48px" }}>
        {/* Client selector */}
        <div style={{ marginBottom: 24 }}>
          <FieldLabel>Client</FieldLabel>
          <div style={{ position: "relative" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", border: "1px solid var(--ih-line)", borderRadius: 8, background: "var(--ih-surface)" }}>
              <Icon name="search" size={13} style={{ color: "var(--ih-ink-40)" }} />
              <input
                type="text"
                placeholder="Search clients..."
                value={selectedClient || clientSearch}
                onChange={(e) => { setClientSearch(e.target.value); setSelectedClient("") }}
                style={{ flex: 1, border: 0, background: "transparent", fontSize: 13, color: "var(--ih-ink)", outline: "none" }}
              />
            </div>
            {clientSearch && !selectedClient && (
              <div style={{ position: "absolute", top: "100%", left: 0, right: 0, marginTop: 4, border: "1px solid var(--ih-line)", borderRadius: 8, background: "var(--ih-surface)", zIndex: 10, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}>
                {filteredClients.map((c) => (
                  <div
                    key={c.name}
                    onClick={() => { setSelectedClient(c.name); setClientSearch("") }}
                    style={{ display: "flex", gap: 10, padding: "10px 14px", cursor: "pointer", alignItems: "center", borderTop: "1px solid var(--ih-line)" }}
                  >
                    <div className="ih-avatar" style={{ width: 28, height: 28, fontSize: 10 }}>{c.initials}</div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{c.name}</div>
                      <div className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-50)" }}>{c.contact}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Booking type */}
        <div style={{ marginBottom: 24 }}>
          <FieldLabel>Booking type</FieldLabel>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {BOOKING_TYPES.map((t) => (
              <button
                key={t.value}
                onClick={() => handleTypeChange(t.value)}
                className={`ih-btn ih-btn-sm ${bookingType === t.value ? "ih-btn-accent" : "ih-btn-ghost"}`}
              >
                {t.label}{t.duration ? ` (${t.duration}m)` : ""}
              </button>
            ))}
          </div>
        </div>

        {/* Date + Time + Duration row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 24 }}>
          <div>
            <FieldLabel>Date</FieldLabel>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              style={{ width: "100%", padding: "8px 12px", border: "1px solid var(--ih-line)", borderRadius: 8, background: "var(--ih-surface)", fontSize: 13, color: "var(--ih-ink)" }}
            />
          </div>
          <div>
            <FieldLabel>Time</FieldLabel>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              style={{ width: "100%", padding: "8px 12px", border: "1px solid var(--ih-line)", borderRadius: 8, background: "var(--ih-surface)", fontSize: 13, color: "var(--ih-ink)" }}
            />
          </div>
          <div>
            <FieldLabel>Duration (minutes)</FieldLabel>
            <input
              type="number"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              style={{ width: "100%", padding: "8px 12px", border: "1px solid var(--ih-line)", borderRadius: 8, background: "var(--ih-surface)", fontSize: 13, color: "var(--ih-ink)" }}
            />
          </div>
        </div>

        {/* Attendees */}
        <div style={{ marginBottom: 24 }}>
          <FieldLabel>Attendees</FieldLabel>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
            {attendees.map((a) => (
              <span key={a} className="ih-pill" style={{ fontSize: 11, display: "inline-flex", alignItems: "center", gap: 4 }}>
                {a}
                <button onClick={() => removeAttendee(a)} style={{ background: "none", border: 0, cursor: "pointer", padding: 0, color: "var(--ih-ink-40)", lineHeight: 1 }}>
                  <Icon name="x" size={10} />
                </button>
              </span>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              type="text"
              placeholder="Add attendee..."
              value={newAttendee}
              onChange={(e) => setNewAttendee(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addAttendee()}
              style={{ flex: 1, padding: "8px 12px", border: "1px solid var(--ih-line)", borderRadius: 8, background: "var(--ih-surface)", fontSize: 13, color: "var(--ih-ink)", outline: "none" }}
            />
            <Btn sm ghost onClick={addAttendee}><Icon name="plus" size={11} /> Add</Btn>
          </div>
        </div>

        {/* Location */}
        <div style={{ marginBottom: 24 }}>
          <FieldLabel>Location</FieldLabel>
          <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
            {LOCATIONS.map((l) => (
              <button
                key={l}
                onClick={() => setLocation(l)}
                className={`ih-btn ih-btn-sm ${location === l ? "ih-btn-accent" : "ih-btn-ghost"}`}
              >
                {l}
              </button>
            ))}
          </div>
          {location === "On-site" && (
            <input
              type="text"
              placeholder="Enter address..."
              value={locationAddress}
              onChange={(e) => setLocationAddress(e.target.value)}
              style={{ width: "100%", padding: "8px 12px", border: "1px solid var(--ih-line)", borderRadius: 8, background: "var(--ih-surface)", fontSize: 13, color: "var(--ih-ink)", outline: "none" }}
            />
          )}
        </div>

        {/* Notes */}
        <div style={{ marginBottom: 32 }}>
          <FieldLabel>Notes</FieldLabel>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any prep notes or agenda items..."
            style={{
              width: "100%",
              minHeight: 120,
              padding: 12,
              border: "1px solid var(--ih-line)",
              borderRadius: 8,
              background: "var(--ih-surface)",
              fontSize: 13,
              lineHeight: 1.6,
              color: "var(--ih-ink)",
              fontFamily: "inherit",
              resize: "vertical",
              outline: "none",
            }}
          />
        </div>

        {/* Submit */}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <Btn sm ghost>Cancel</Btn>
          <Btn sm accent><Icon name="calendar" size={11} /> Book session</Btn>
        </div>
      </div>
    </div>
  )
}
