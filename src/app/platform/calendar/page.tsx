"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Icon, type IconName } from "@/components/shell"
import { NotificationToast, type ToastTone, Popover, PopoverHeader, PopoverItem } from "@/components/shared"
import {
  mockCalendar,
  TYPE_LABEL,
  TONE_COLOR,
  TONE_SOFT,
  TODAY_DAY_OFFSET,
  type BookingEvent,
  type CalendarEvent,
  type CalendarEventType,
  type CalendarLocationKind,
  type CalendarTone,
  type DeadlineEvent,
  type ReminderEvent,
  type PersonalEvent,
  type InternalEvent,
} from "@/lib/mock/calendar"

/* ── Constants (pure render — no Date.now) ───────────────────────────────── */

type ViewMode = "day" | "week" | "month"

const HOURS = Array.from({ length: 13 }, (_, i) => i + 8) /* 8 → 20 */
const HOUR_HEIGHT = 56                                    /* px per hour */
const DAY_MINUTES_START = 8 * 60                          /* 8am baseline for vertical positioning */

const TYPE_ICON: Record<CalendarEventType, IconName> = {
  booking:  "calendar",
  internal: "users",
  personal: "user",
  deadline: "flag",
  reminder: "bell",
}

const LOC_ICON: Record<CalendarLocationKind, IconName> = {
  google_meet: "chat",
  zoom:        "chat",
  in_person:   "building",
  phone:       "phone",
  none:        "link",
}

const STATUS_TONE: Record<CalendarEvent["status"], "ok" | "warn" | "danger"> = {
  CONFIRMED: "ok",
  TENTATIVE: "warn",
  CANCELLED: "danger",
}

/* ── Event chip (pure, gets positioned by parent) ────────────────────────── */

function EventChip({
  event, onClick, compact = false, selected,
}: { event: CalendarEvent; onClick: () => void; compact?: boolean; selected?: boolean }) {
  const bg = TONE_SOFT[event.tone]
  const border = TONE_COLOR[event.tone]
  return (
    <button onClick={(e) => { e.stopPropagation(); onClick() }} style={{
      display: "block", width: "100%", textAlign: "left",
      background: bg,
      borderLeft: `3px solid ${border}`,
      border: selected ? `1px solid ${border}` : "1px solid transparent",
      borderLeftWidth: 3,
      borderRadius: "var(--ih-r-sm)",
      padding: compact ? "1px 4px" : "4px 8px",
      cursor: "pointer",
      overflow: "hidden",
      boxShadow: selected ? `0 0 0 2px ${TONE_SOFT[event.tone]}` : undefined,
      transition: "transform 0.08s ease, box-shadow 0.12s ease",
    }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-1px)" }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)" }}
    >
      <div style={{
        fontSize: compact ? 10 : 11.5, fontWeight: 500,
        color: "var(--ih-ink)", lineHeight: 1.2,
        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
      }}>
        {event.title}
      </div>
      {!compact && (
        <div className="ih-mono" style={{ fontSize: 9.5, color: TONE_COLOR[event.tone], opacity: 0.85, marginTop: 2 }}>
          {event.allDay ? "All day" : event.timeLabel}
          {event.customer ? ` · ${event.customer.name}` : ""}
        </div>
      )}
    </button>
  )
}

/* ── Mini-month calendar (left rail) ─────────────────────────────────────── */

function MiniMonth({ weekOffset, onPickWeek }: { weekOffset: number; onPickWeek: (offset: number) => void }) {
  const { monthLabel, cells } = useMemo(() => mockCalendar.monthGrid(weekOffset), [weekOffset])
  const weekStart = mockCalendar.weekStartOffsetForWeek(weekOffset)
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 4px 6px" }}>
        <span className="ih-eyebrow" style={{ fontSize: 9 }}>{monthLabel}</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 0, fontSize: 10 }}>
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
          <div key={`h${i}`} className="ih-mono" style={{ textAlign: "center", color: "var(--ih-ink-40)", padding: "2px 0" }}>{d}</div>
        ))}
        {cells.map((c) => {
          const isCurrentWeek = c.dayOffset >= weekStart && c.dayOffset < weekStart + 7
          return (
            <button key={c.dayOffset}
              onClick={() => {
                /* Pick the week containing this day */
                const newWeekOff = Math.floor(c.dayOffset / 7)
                onPickWeek(newWeekOff)
              }}
              style={{
                aspectRatio: "1 / 1",
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                background: c.isToday ? "var(--ih-accent)" : isCurrentWeek ? "var(--ih-surface)" : "transparent",
                color: c.isToday ? "#fff" : c.inMonth ? "var(--ih-ink)" : "var(--ih-ink-30)",
                border: 0, cursor: "pointer", fontSize: 10.5, position: "relative",
                fontWeight: c.isToday ? 600 : 400,
                borderRadius: c.isToday ? "var(--ih-r-sm)" : 0,
              }}
            >
              {c.dateNum}
              {c.events > 0 && !c.isToday && (
                <span style={{ position: "absolute", bottom: 3, width: 3, height: 3, borderRadius: 999, background: "var(--ih-accent)" }} />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ── Layered events for one column — handle overlap ──────────────────────── */

interface PositionedEvent { event: CalendarEvent; top: number; height: number; lane: number; lanes: number }

function layoutDayColumn(events: CalendarEvent[]): { timed: PositionedEvent[]; allDay: CalendarEvent[] } {
  const allDay = events.filter(e => e.allDay)
  const timed = events.filter(e => !e.allDay).sort((a, b) => a.startMin - b.startMin)

  /* Sweep & assign lanes for overlap. */
  const positioned: PositionedEvent[] = []
  const activeLanes: Array<{ end: number; lane: number }> = []
  for (const e of timed) {
    /* drop lanes that ended before this start */
    for (let i = activeLanes.length - 1; i >= 0; i--) {
      if (activeLanes[i].end <= e.startMin) activeLanes.splice(i, 1)
    }
    const used = new Set(activeLanes.map(l => l.lane))
    let lane = 0
    while (used.has(lane)) lane++
    activeLanes.push({ end: e.endMin, lane })
    const top = ((e.startMin - DAY_MINUTES_START) / 60) * HOUR_HEIGHT
    const height = Math.max(22, ((e.endMin - e.startMin) / 60) * HOUR_HEIGHT - 2)
    positioned.push({ event: e, top, height, lane, lanes: 1 })
  }
  /* Second pass — compute concurrent lane count per event. */
  for (const p of positioned) {
    const overlapping = positioned.filter(q =>
      q.event.endMin > p.event.startMin && q.event.startMin < p.event.endMin
    )
    p.lanes = Math.max(...overlapping.map(q => q.lane), p.lane) + 1
  }
  return { timed: positioned, allDay }
}

/* ── Week view ───────────────────────────────────────────────────────────── */

function WeekView({
  weekStartOff, events, selectedId, onSelect,
}: {
  weekStartOff: number
  events: CalendarEvent[]
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  const days = Array.from({ length: 7 }, (_, i) => weekStartOff + i)
  const dayEvents = days.map(off => events.filter(e => e.dayOffset === off))
  const allDayRow = days.map((_, i) => dayEvents[i].filter(e => e.allDay))
  const hasAnyAllDay = allDayRow.some(arr => arr.length > 0)

  return (
    <div className="ih-card" style={{ overflow: "hidden", display: "flex", flexDirection: "column" }}>
      {/* Header: weekday columns */}
      <div style={{ display: "grid", gridTemplateColumns: "56px repeat(7, 1fr)", borderBottom: "1px solid var(--ih-line)" }}>
        <div style={{ padding: "10px 8px", borderRight: "1px solid var(--ih-line)" }} />
        {days.map((off, i) => {
          const meta = mockCalendar.dayMeta(off)
          return (
            <div key={off} style={{
              padding: "10px 8px",
              borderRight: i < 6 ? "1px solid var(--ih-line)" : undefined,
              textAlign: "center",
              background: meta.isToday ? "var(--ih-accent-soft-2)" : meta.isWeekend ? "var(--ih-surface-2)" : "transparent",
            }}>
              <div className="ih-mono" style={{ fontSize: 9.5, color: "var(--ih-ink-40)", textTransform: "uppercase", letterSpacing: "0.1em" }}>{meta.dayShort}</div>
              <div className="ih-serif" style={{ fontSize: 22, lineHeight: 1, marginTop: 2, color: meta.isToday ? "var(--ih-accent)" : "var(--ih-ink)", fontWeight: meta.isToday ? 600 : 400 }}>{meta.dateNum}</div>
            </div>
          )
        })}
      </div>

      {/* All-day row */}
      {hasAnyAllDay && (
        <div style={{ display: "grid", gridTemplateColumns: "56px repeat(7, 1fr)", borderBottom: "1px solid var(--ih-line)", background: "var(--ih-surface-2)" }}>
          <div style={{ padding: "6px 8px", borderRight: "1px solid var(--ih-line)" }}>
            <span className="ih-mono" style={{ fontSize: 9, color: "var(--ih-ink-40)" }}>ALL DAY</span>
          </div>
          {allDayRow.map((arr, i) => (
            <div key={i} style={{ padding: 4, borderRight: i < 6 ? "1px solid var(--ih-line)" : undefined, display: "flex", flexDirection: "column", gap: 3, minHeight: 32 }}>
              {arr.map(e => (
                <EventChip key={e.id} event={e} compact onClick={() => onSelect(e.id)} selected={e.id === selectedId} />
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Hour grid */}
      <div className="scrollbar-thin" style={{ flex: 1, overflowY: "auto", position: "relative" }}>
        <div style={{ display: "grid", gridTemplateColumns: "56px repeat(7, 1fr)", position: "relative" }}>
          {/* Hour rail */}
          <div style={{ borderRight: "1px solid var(--ih-line)" }}>
            {HOURS.map(h => (
              <div key={h} style={{ height: HOUR_HEIGHT, padding: "4px 8px 0", textAlign: "right" }}>
                <span className="ih-mono" style={{ fontSize: 9.5, color: "var(--ih-ink-40)" }}>{h.toString().padStart(2, "0")}:00</span>
              </div>
            ))}
          </div>
          {/* Day columns */}
          {days.map((off, di) => {
            const layout = layoutDayColumn(dayEvents[di].filter(e => !e.allDay))
            const meta = mockCalendar.dayMeta(off)
            return (
              <div key={off} style={{
                position: "relative",
                borderRight: di < 6 ? "1px solid var(--ih-line)" : undefined,
                background: meta.isToday ? "rgba(209,58,31,0.018)" : meta.isWeekend ? "var(--ih-surface-2)" : "transparent",
              }}>
                {/* hour grid lines */}
                {HOURS.map((_, hi) => (
                  <div key={hi} style={{ height: HOUR_HEIGHT, borderTop: hi === 0 ? 0 : "1px solid var(--ih-line)" }} />
                ))}
                {/* events positioned absolutely */}
                {layout.timed.map(pos => {
                  const widthPct = 100 / pos.lanes
                  return (
                    <div key={pos.event.id} style={{
                      position: "absolute",
                      top: pos.top + 1,
                      left: `calc(${pos.lane * widthPct}% + 2px)`,
                      width: `calc(${widthPct}% - 4px)`,
                      height: pos.height,
                    }}>
                      <div style={{ height: "100%" }}>
                        <EventChip event={pos.event} onClick={() => onSelect(pos.event.id)} selected={pos.event.id === selectedId} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/* ── Day view ────────────────────────────────────────────────────────────── */

function DayView({
  dayOffset, events, selectedId, onSelect,
}: {
  dayOffset: number; events: CalendarEvent[]; selectedId: string | null; onSelect: (id: string) => void
}) {
  const dayEvents = events.filter(e => e.dayOffset === dayOffset)
  const layout = layoutDayColumn(dayEvents.filter(e => !e.allDay))
  const allDay = dayEvents.filter(e => e.allDay)
  const meta = mockCalendar.dayMeta(dayOffset)
  /* Aggregate prep checklists from bookings + deadlines for this day */
  const prep = dayEvents
    .filter((e): e is BookingEvent | DeadlineEvent => e.type === "booking" || e.type === "deadline")
    .flatMap(e => (e.payload.preparation ?? []).map(p => ({ ...p, eventTitle: e.title, eventId: e.id })))

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 12, height: "100%" }}>
      <div className="ih-card" style={{ overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {/* Header */}
        <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--ih-line)", display: "flex", alignItems: "baseline", gap: 10, background: meta.isToday ? "var(--ih-accent-soft-2)" : "transparent" }}>
          <span className="ih-eyebrow">{meta.dayFull}</span>
          <span className="ih-serif" style={{ fontSize: 24, lineHeight: 1, color: meta.isToday ? "var(--ih-accent)" : "var(--ih-ink)" }}>{meta.dateLabel}</span>
          <span className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)", marginLeft: "auto" }}>{dayEvents.length} EVENTS</span>
        </div>

        {/* All-day */}
        {allDay.length > 0 && (
          <div style={{ padding: 8, borderBottom: "1px solid var(--ih-line)", background: "var(--ih-surface-2)", display: "flex", flexDirection: "column", gap: 4 }}>
            {allDay.map(e => (
              <EventChip key={e.id} event={e} compact onClick={() => onSelect(e.id)} selected={e.id === selectedId} />
            ))}
          </div>
        )}

        {/* Hours */}
        <div className="scrollbar-thin" style={{ flex: 1, overflowY: "auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "56px 1fr", position: "relative" }}>
            <div style={{ borderRight: "1px solid var(--ih-line)" }}>
              {HOURS.map(h => (
                <div key={h} style={{ height: HOUR_HEIGHT, padding: "4px 8px 0", textAlign: "right" }}>
                  <span className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)" }}>{h.toString().padStart(2, "0")}:00</span>
                </div>
              ))}
            </div>
            <div style={{ position: "relative" }}>
              {HOURS.map((_, hi) => (
                <div key={hi} style={{ height: HOUR_HEIGHT, borderTop: hi === 0 ? 0 : "1px solid var(--ih-line)" }} />
              ))}
              {layout.timed.map(pos => {
                const widthPct = 100 / pos.lanes
                return (
                  <div key={pos.event.id} style={{
                    position: "absolute",
                    top: pos.top + 1,
                    left: `calc(${pos.lane * widthPct}% + 4px)`,
                    width: `calc(${widthPct}% - 8px)`,
                    height: pos.height,
                  }}>
                    <div style={{ height: "100%" }}>
                      <EventChip event={pos.event} onClick={() => onSelect(pos.event.id)} selected={pos.event.id === selectedId} />
                    </div>
                  </div>
                )
              })}
              {dayEvents.length === 0 && (
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ih-ink-40)", fontSize: 12 }}>
                  Nothing scheduled — go do real work.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Prep checklist side panel */}
      <div className="ih-card" style={{ overflowY: "auto", padding: 14 }}>
        <div className="ih-eyebrow" style={{ marginBottom: 8 }}>Preparation</div>
        {prep.length === 0 ? (
          <div style={{ fontSize: 11.5, color: "var(--ih-ink-40)" }}>Nothing to prep today.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {Object.entries(prep.reduce<Record<string, typeof prep>>((acc, p) => {
              (acc[p.eventTitle] ??= []).push(p)
              return acc
            }, {})).map(([title, items]) => (
              <div key={title}>
                <div style={{ fontSize: 11, fontWeight: 500, marginBottom: 4 }}>{title}</div>
                {items.map(it => (
                  <div key={`${it.eventId}-${it.idx}`} style={{ display: "flex", gap: 8, alignItems: "center", padding: "4px 0", fontSize: 11.5, color: "var(--ih-ink-65)" }}>
                    <span style={{ width: 12, height: 12, borderRadius: 3, border: "1.5px solid var(--ih-line-2)", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {it.done && <Icon name="check" size={9} style={{ color: "var(--ih-accent)" }} />}
                    </span>
                    <span style={{ textDecoration: it.done ? "line-through" : undefined }}>{it.label}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Month view ──────────────────────────────────────────────────────────── */

function MonthView({
  weekOffset, events, selectedId, onSelect,
}: { weekOffset: number; events: CalendarEvent[]; selectedId: string | null; onSelect: (id: string) => void }) {
  const grid = useMemo(() => mockCalendar.monthGrid(weekOffset), [weekOffset])
  return (
    <div className="ih-card" style={{ overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", borderBottom: "1px solid var(--ih-line)" }}>
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d, i) => (
          <div key={d} style={{ padding: "8px 8px", textAlign: "center", borderRight: i < 6 ? "1px solid var(--ih-line)" : undefined }}>
            <span className="ih-mono" style={{ fontSize: 9.5, color: "var(--ih-ink-40)", textTransform: "uppercase", letterSpacing: "0.1em" }}>{d}</span>
          </div>
        ))}
      </div>
      <div className="scrollbar-thin" style={{ flex: 1, overflowY: "auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
          {grid.cells.map((c, idx) => {
            const cellEvents = events.filter(e => e.dayOffset === c.dayOffset)
            return (
              <div key={`${c.dayOffset}-${idx}`} style={{
                minHeight: 96,
                padding: "5px 6px",
                borderBottom: "1px solid var(--ih-line)",
                borderRight: idx % 7 !== 6 ? "1px solid var(--ih-line)" : undefined,
                background: c.isToday ? "var(--ih-accent-soft-2)" : c.inMonth ? "transparent" : "var(--ih-surface-2)",
                display: "flex", flexDirection: "column", gap: 2,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span className="ih-mono" style={{
                    fontSize: 11,
                    color: c.isToday ? "var(--ih-accent)" : c.inMonth ? "var(--ih-ink)" : "var(--ih-ink-30)",
                    fontWeight: c.isToday ? 600 : 400,
                  }}>{c.dateNum}</span>
                  {cellEvents.length > 0 && (
                    <span className="ih-mono" style={{ fontSize: 9, color: "var(--ih-ink-40)" }}>{cellEvents.length}</span>
                  )}
                </div>
                {cellEvents.slice(0, 3).map(e => (
                  <EventChip key={e.id} event={e} compact onClick={() => onSelect(e.id)} selected={e.id === selectedId} />
                ))}
                {cellEvents.length > 3 && (
                  <button onClick={() => onSelect(cellEvents[3].id)} className="ih-mono" style={{ fontSize: 9, color: "var(--ih-ink-40)", background: "transparent", border: 0, cursor: "pointer", textAlign: "left" }}>
                    +{cellEvents.length - 3} more
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/* ── Type-specific actions for the drawer ────────────────────────────────── */

function BookingActions({ event, onAction, onClose }: { event: BookingEvent; onAction: (msg: string, tone: ToastTone) => void; onClose: () => void }) {
  const [mode, setMode] = useState<"reschedule" | "email" | null>(null)
  const [rescheduleVal, setRescheduleVal] = useState("")
  const [emailBody, setEmailBody] = useState("")
  return (
    <>
      <Link href={`/platform/bookings/${event.payload.bookingId}`} className="ih-btn ih-btn-accent" style={{ height: 34, justifyContent: "center", textDecoration: "none" }}>
        <Icon name="calendar" size={12} /> Open booking
      </Link>
      <div style={{ display: "flex", gap: 6 }}>
        <button className="ih-btn ih-btn-ghost ih-btn-sm" style={{ flex: 1 }} onClick={() => setMode(m => m === "reschedule" ? null : "reschedule")}>
          <Icon name="refresh" size={11} /> Reschedule
        </button>
        <button className="ih-btn ih-btn-ghost ih-btn-sm" style={{ flex: 1 }} onClick={() => onAction(`Cancelled · ${event.title}`, "warn")}>
          <Icon name="x" size={11} /> Cancel
        </button>
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <button className="ih-btn ih-btn-quiet ih-btn-sm" style={{ flex: 1 }} onClick={() => onAction(`Zoom link added · ${event.title}`, "ok")}>
          <Icon name="chat" size={11} /> Add Zoom
        </button>
        <button className="ih-btn ih-btn-quiet ih-btn-sm" style={{ flex: 1 }} onClick={() => setMode(m => m === "email" ? null : "email")}>
          <Icon name="mail" size={11} /> Email attendees
        </button>
      </div>

      {mode === "reschedule" && (
        <div className="ih-card" style={{ padding: 10, background: "var(--ih-surface)", display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
          <span className="ih-eyebrow" style={{ fontSize: 9 }}>New start time</span>
          <input className="ih-input" type="datetime-local" value={rescheduleVal} onChange={e => setRescheduleVal(e.target.value)} style={{ fontSize: 12 }} />
          <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
            <button className="ih-btn ih-btn-quiet ih-btn-sm" onClick={() => setMode(null)}>Cancel</button>
            <button className="ih-btn ih-btn-accent ih-btn-sm" disabled={!rescheduleVal} onClick={() => { onAction(`Rescheduled to ${rescheduleVal}`, "info"); setMode(null) }}>
              <Icon name="check" size={10} /> Reschedule
            </button>
          </div>
        </div>
      )}

      {mode === "email" && (
        <div className="ih-card" style={{ padding: 10, background: "var(--ih-surface)", display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
          <span className="ih-eyebrow" style={{ fontSize: 9 }}>To: {event.attendees.map(a => a.name).join(", ")}</span>
          <textarea autoFocus className="ih-input" rows={4} placeholder="Quick note to attendees..."
            value={emailBody} onChange={e => setEmailBody(e.target.value)}
            style={{ fontSize: 12, padding: 8, resize: "vertical", fontFamily: "var(--ih-font-sans)" }} />
          <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
            <button className="ih-btn ih-btn-quiet ih-btn-sm" onClick={() => setMode(null)}>Cancel</button>
            <button className="ih-btn ih-btn-accent ih-btn-sm" disabled={!emailBody.trim()} onClick={() => { onAction(`Email sent to ${event.attendees.length} attendees`, "ok"); setMode(null); setEmailBody("") }}>
              <Icon name="mail" size={10} /> Send
            </button>
          </div>
        </div>
      )}
      <button className="ih-btn ih-btn-quiet ih-btn-sm" style={{ height: 28 }} onClick={() => { onAction("Closed preview", "muted"); onClose() }}>
        Close preview
      </button>
    </>
  )
}

function InternalActions({ event, onAction }: { event: InternalEvent; onAction: (msg: string, tone: ToastTone) => void }) {
  const [recurring, setRecurring] = useState(event.recurringRule !== null)
  return (
    <>
      <button className="ih-btn ih-btn-accent" style={{ height: 34, justifyContent: "center" }} onClick={() => onAction(`Reschedule flow opened for ${event.title}`, "info")}>
        <Icon name="refresh" size={12} /> Reschedule
      </button>
      <div style={{ display: "flex", gap: 6 }}>
        <button className="ih-btn ih-btn-ghost ih-btn-sm" style={{ flex: 1 }} onClick={() => onAction(`Cancelled · ${event.title}`, "warn")}>
          <Icon name="x" size={11} /> Cancel
        </button>
        <button className="ih-btn ih-btn-ghost ih-btn-sm" style={{ flex: 1 }}
          onClick={() => { setRecurring(r => !r); onAction(recurring ? "Recurring off" : "Recurring on", "info") }}>
          <Icon name="refresh" size={11} /> {recurring ? "Make one-off" : "Make recurring"}
        </button>
      </div>
    </>
  )
}

function PersonalActions({ event, onAction }: { event: PersonalEvent; onAction: (msg: string, tone: ToastTone) => void }) {
  return (
    <>
      <button className="ih-btn ih-btn-accent" style={{ height: 34, justifyContent: "center" }} onClick={() => onAction(`Edit flow opened for ${event.title}`, "info")}>
        <Icon name="user" size={12} /> Edit
      </button>
      <button className="ih-btn ih-btn-ghost ih-btn-sm" onClick={() => onAction(`Deleted · ${event.title}`, "warn")}>
        <Icon name="x" size={11} /> Delete
      </button>
    </>
  )
}

function DeadlineActions({ event, onAction, onClose }: { event: DeadlineEvent; onAction: (msg: string, tone: ToastTone) => void; onClose: () => void }) {
  const engagementHref = event.customer?.engagementId ? `/platform/clients/${event.customer.engagementId}` : null
  return (
    <>
      <button className="ih-btn ih-btn-accent" style={{ height: 34, justifyContent: "center" }}
        onClick={() => { onAction(`Marked complete · ${event.title}`, "ok"); onClose() }}>
        <Icon name="check" size={12} /> Mark complete
      </button>
      {engagementHref && (
        <Link href={engagementHref} className="ih-btn ih-btn-ghost ih-btn-sm" style={{ textDecoration: "none", justifyContent: "center" }}>
          <Icon name="arrowUpRight" size={11} /> Open related engagement
        </Link>
      )}
    </>
  )
}

function ReminderActions({ event, onAction, onClose }: { event: ReminderEvent; onAction: (msg: string, tone: ToastTone) => void; onClose: () => void }) {
  return (
    <>
      <div className="ih-card" style={{ padding: 10, background: "var(--ih-surface)" }}>
        <span className="ih-eyebrow" style={{ fontSize: 9, marginBottom: 6, display: "block" }}>Snooze</span>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
          <button className="ih-btn ih-btn-ghost ih-btn-sm" onClick={() => onAction(`Snoozed 1h · ${event.title}`, "info")}>1 hour</button>
          <button className="ih-btn ih-btn-ghost ih-btn-sm" onClick={() => onAction(`Snoozed 1d · ${event.title}`, "info")}>1 day</button>
          <button className="ih-btn ih-btn-ghost ih-btn-sm" onClick={() => onAction(`Snoozed 1w · ${event.title}`, "info")}>1 week</button>
        </div>
      </div>
      <button className="ih-btn ih-btn-accent" style={{ height: 34, justifyContent: "center" }}
        onClick={() => { onAction(`Reminder done · ${event.title}`, "ok"); onClose() }}>
        <Icon name="check" size={12} /> Mark done
      </button>
      <button className="ih-btn ih-btn-ghost ih-btn-sm" onClick={() => onAction(`Converted to booking · ${event.title}`, "info")}>
        <Icon name="calendar" size={11} /> Convert to booking
      </button>
    </>
  )
}

/* ── Drawer ──────────────────────────────────────────────────────────────── */

function EventDrawer({
  event, onClose, onAction, onTogglePrep, prepState,
}: {
  event: CalendarEvent
  onClose: () => void
  onAction: (msg: string, tone: ToastTone) => void
  onTogglePrep: (eventId: string, idx: number) => void
  prepState: Record<string, Set<number>>
}) {
  const titleHead = event.title.split(" ").slice(0, -1).join(" ")
  const titleTail = event.title.split(" ").slice(-1)[0]
  const statusTone = STATUS_TONE[event.status]

  return (
    <aside key={event.id} className="animate-slide-in-right" style={{
      width: 380, borderLeft: "1px solid var(--ih-line)", background: "var(--ih-surface-2)",
      display: "flex", flexDirection: "column", flexShrink: 0,
    }}>
      {/* Header */}
      <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--ih-line)", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          <span className="ih-pill" style={{
            fontSize: 9, padding: "2px 6px",
            background: TONE_SOFT[event.tone], color: TONE_COLOR[event.tone], borderColor: "transparent",
          }}>
            <Icon name={TYPE_ICON[event.type]} size={9} style={{ marginRight: 4 }} /> {TYPE_LABEL[event.type]}
          </span>
          <span className={`ih-pill ih-pill-${statusTone}`} style={{ fontSize: 9, padding: "2px 6px" }}>{event.status}</span>
          {event.recurringRule && (
            <span className="ih-pill" style={{ fontSize: 9, padding: "2px 6px" }}>
              <Icon name="refresh" size={9} style={{ marginRight: 4 }} /> recurring
            </span>
          )}
        </div>
        <button className="ih-btn ih-btn-quiet ih-btn-icon" style={{ height: 24, width: 24 }} onClick={onClose} title="Close">
          <Icon name="x" size={12} />
        </button>
      </div>

      <div className="scrollbar-thin" style={{ flex: 1, overflowY: "auto", padding: 16 }}>
        <div className="ih-serif" style={{ fontSize: 22, lineHeight: 1.15, marginBottom: 6 }}>
          {titleHead}{titleHead ? " " : ""}<span className="ih-italic-red">{titleTail}</span>
        </div>
        {event.customer && (
          <Link href={`/platform/customers/${event.customer.id}`} style={{
            display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--ih-ink-65)",
            textDecoration: "none", marginBottom: 12,
          }}>
            <div className="ih-avatar" style={{ width: 18, height: 18, fontSize: 8 }}>{event.customer.initials}</div>
            {event.customer.name}
            <Icon name="arrowUpRight" size={10} style={{ color: "var(--ih-ink-40)" }} />
          </Link>
        )}

        {/* Time block */}
        <div className="ih-card" style={{ padding: 12, marginBottom: 12, background: "var(--ih-surface)" }}>
          <div className="ih-eyebrow" style={{ fontSize: 9, marginBottom: 6 }}>When</div>
          <div style={{ fontSize: 13, fontWeight: 500 }}>{event.dayLabel} · {event.dateLabel}</div>
          <div className="ih-mono" style={{ fontSize: 11, color: "var(--ih-ink-65)", marginTop: 2 }}>
            {event.allDay ? "All day" : `${event.timeLabel} · ${Math.floor(event.durationMin / 60) ? `${Math.floor(event.durationMin / 60)}h ` : ""}${event.durationMin % 60 || (!Math.floor(event.durationMin / 60) ? event.durationMin : 0) ? `${event.durationMin % 60}m` : ""}`}
          </div>
          {event.recurringRule && (
            <div className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)", marginTop: 4 }}>↻ {event.recurringRule}</div>
          )}
        </div>

        {/* Location */}
        <div className="ih-card" style={{ padding: 12, marginBottom: 12, background: "var(--ih-surface)", display: "flex", alignItems: "center", gap: 10 }}>
          <Icon name={LOC_ICON[event.locationKind]} size={14} style={{ color: "var(--ih-ink-50)" }} />
          <div style={{ flex: 1 }}>
            <div className="ih-eyebrow" style={{ fontSize: 9, marginBottom: 2 }}>Where</div>
            <div style={{ fontSize: 12.5 }}>{event.location}</div>
          </div>
        </div>

        {/* Type-specific extras */}
        {event.type === "deadline" && (
          <div className="ih-card" style={{ padding: 12, marginBottom: 12, background: event.payload.daysRemaining < 0 ? "var(--ih-danger-soft)" : event.payload.daysRemaining <= 2 ? "var(--ih-warn-soft)" : "var(--ih-info-soft)" }}>
            <div className="ih-eyebrow" style={{ fontSize: 9, marginBottom: 4, color: event.payload.daysRemaining < 0 ? "var(--ih-danger)" : "var(--ih-ink-50)" }}>
              {event.payload.daysRemaining < 0 ? "Overdue" : "Time remaining"}
            </div>
            <div className="ih-serif ih-num" style={{ fontSize: 22, lineHeight: 1, color: event.payload.daysRemaining < 0 ? "var(--ih-danger)" : event.payload.daysRemaining <= 2 ? "var(--ih-warn)" : "var(--ih-info)" }}>
              {event.payload.daysRemaining === 0 ? "Due today" : event.payload.daysRemaining > 0 ? `${event.payload.daysRemaining} day${event.payload.daysRemaining === 1 ? "" : "s"}` : `${Math.abs(event.payload.daysRemaining)}d late`}
            </div>
            <div style={{ fontSize: 11.5, color: "var(--ih-ink-65)", marginTop: 6 }}>
              Deliverable · <strong>{event.payload.deliverable}</strong>
            </div>
          </div>
        )}

        {event.type === "reminder" && (
          <div className="ih-card" style={{ padding: 12, marginBottom: 12, background: TONE_SOFT[event.tone] }}>
            <div className="ih-eyebrow" style={{ fontSize: 9, marginBottom: 4, color: TONE_COLOR[event.tone] }}>Action</div>
            <div style={{ fontSize: 13, fontWeight: 500, color: TONE_COLOR[event.tone] }}>{event.payload.actionLabel}</div>
          </div>
        )}

        {/* Notes */}
        {event.notes && (
          <>
            <div className="ih-eyebrow" style={{ marginBottom: 6 }}>Notes</div>
            <p style={{ fontSize: 12, color: "var(--ih-ink-65)", lineHeight: 1.5, marginBottom: 14 }}>{event.notes}</p>
          </>
        )}

        {/* Attendees */}
        {event.attendees.length > 0 && (
          <>
            <div className="ih-eyebrow" style={{ marginBottom: 6 }}>Attendees · {event.attendees.length}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
              {event.attendees.map((a, i) => (
                <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12 }}>
                  <div className="ih-avatar" style={{ width: 22, height: 22, fontSize: 9 }}>{a.initials}</div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontWeight: 500 }}>{a.name}</div>
                    <div className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)" }}>{a.role}</div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Preparation (booking + deadline) */}
        {(event.type === "booking" || event.type === "deadline") && event.payload.preparation.length > 0 && (
          <>
            <div className="ih-eyebrow" style={{ marginBottom: 6 }}>Preparation</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 14 }}>
              {event.payload.preparation.map(p => {
                const done = prepState[event.id]?.has(p.idx) ?? p.done
                return (
                  <button key={p.idx} onClick={() => onTogglePrep(event.id, p.idx)} style={{
                    display: "flex", gap: 8, alignItems: "center",
                    padding: "6px 8px",
                    background: done ? "var(--ih-ok-soft)" : "var(--ih-surface)",
                    border: "1px solid var(--ih-line)",
                    borderRadius: "var(--ih-r-sm)",
                    cursor: "pointer", textAlign: "left",
                    fontSize: 11.5, color: "var(--ih-ink)",
                  }}>
                    <span style={{
                      width: 14, height: 14, borderRadius: 3,
                      border: `1.5px solid ${done ? "var(--ih-ok)" : "var(--ih-line-2)"}`,
                      background: done ? "var(--ih-ok)" : "transparent",
                      display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                    }}>
                      {done && <Icon name="check" size={9} style={{ color: "#fff" }} />}
                    </span>
                    <span style={{ textDecoration: done ? "line-through" : undefined, opacity: done ? 0.7 : 1 }}>{p.label}</span>
                  </button>
                )
              })}
            </div>
          </>
        )}

        {/* Related */}
        {event.related.length > 0 && (
          <>
            <div className="ih-eyebrow" style={{ marginBottom: 6 }}>Related</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 14 }}>
              {event.related.map((r, i) => (
                <Link key={i} href={r.href} style={{
                  display: "flex", alignItems: "center", gap: 8, padding: "6px 8px",
                  color: "var(--ih-ink)", textDecoration: "none",
                  borderRadius: "var(--ih-r-sm)", fontSize: 12,
                  border: "1px solid var(--ih-line)", background: "var(--ih-surface)",
                }}>
                  <Icon name={r.type === "customer" ? "user" : r.type === "engagement" ? "handshake" : r.type === "booking" ? "calendar" : r.type === "invoice" ? "invoice" : "file"} size={11} style={{ color: "var(--ih-ink-50)" }} />
                  <span style={{ flex: 1 }}>{r.label}</span>
                  <Icon name="arrowUpRight" size={10} style={{ color: "var(--ih-ink-40)" }} />
                </Link>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Footer actions */}
      <div style={{ borderTop: "1px solid var(--ih-line)", padding: 12, display: "flex", flexDirection: "column", gap: 6, background: "var(--ih-surface)" }}>
        {event.type === "booking"  && <BookingActions  event={event} onAction={onAction} onClose={onClose} />}
        {event.type === "internal" && <InternalActions event={event} onAction={onAction} />}
        {event.type === "personal" && <PersonalActions event={event} onAction={onAction} />}
        {event.type === "deadline" && <DeadlineActions event={event} onAction={onAction} onClose={onClose} />}
        {event.type === "reminder" && <ReminderActions event={event} onAction={onAction} onClose={onClose} />}
      </div>
    </aside>
  )
}

/* ── Left rail (mini month + filters) ────────────────────────────────────── */

function LeftRail({
  weekOffset, onPickWeek, typeFilter, onToggleType, typeCounts, onJumpToday,
}: {
  weekOffset: number
  onPickWeek: (off: number) => void
  typeFilter: Set<CalendarEventType>
  onToggleType: (t: CalendarEventType) => void
  typeCounts: Record<CalendarEventType, number>
  onJumpToday: () => void
}) {
  const TYPES: Array<{ key: CalendarEventType; tone: CalendarTone }> = [
    { key: "booking",  tone: "accent" },
    { key: "internal", tone: "info"   },
    { key: "personal", tone: "muted"  },
    { key: "deadline", tone: "warn"   },
    { key: "reminder", tone: "danger" },
  ]
  return (
    <aside style={{ width: 220, borderRight: "1px solid var(--ih-line)", padding: "14px 12px", overflowY: "auto", flexShrink: 0 }} className="scrollbar-thin">
      <button className="ih-btn ih-btn-ghost ih-btn-sm" style={{ width: "100%", justifyContent: "center", marginBottom: 12 }} onClick={onJumpToday}>
        <Icon name="calendar" size={11} /> Jump to today
      </button>

      <div style={{ marginBottom: 16 }}>
        <MiniMonth weekOffset={weekOffset} onPickWeek={onPickWeek} />
      </div>

      <div className="ih-eyebrow" style={{ padding: "0 4px 6px" }}>Show types</div>
      {TYPES.map(({ key, tone }) => {
        const on = typeFilter.has(key)
        return (
          <button key={key} onClick={() => onToggleType(key)} style={{
            display: "flex", alignItems: "center", gap: 8, width: "100%",
            padding: "5px 8px", borderRadius: "var(--ih-r-sm)",
            background: on ? "var(--ih-surface)" : "transparent",
            border: on ? "1px solid var(--ih-line)" : "1px solid transparent",
            fontSize: 12, color: "var(--ih-ink)", cursor: "pointer",
          }}>
            <span style={{ width: 8, height: 8, borderRadius: 999, background: TONE_COLOR[tone], opacity: on ? 1 : 0.35 }} />
            <Icon name={TYPE_ICON[key]} size={11} style={{ color: "var(--ih-ink-50)" }} />
            <span style={{ flex: 1, opacity: on ? 1 : 0.55 }}>{TYPE_LABEL[key]}</span>
            <span className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)" }}>{typeCounts[key]}</span>
          </button>
        )
      })}

      <div className="ih-eyebrow" style={{ padding: "16px 4px 6px" }}>My calendars</div>
      {["Work · primary", "Personal", "Team standups"].map(label => (
        <div key={label} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 8px", fontSize: 12, color: "var(--ih-ink-65)" }}>
          <span style={{ width: 8, height: 8, borderRadius: 999, background: label === "Work · primary" ? "var(--ih-accent)" : label === "Personal" ? "var(--ih-info)" : "var(--ih-ink-30)" }} />
          {label}
        </div>
      ))}
    </aside>
  )
}

/* ── New event inline form ───────────────────────────────────────────────── */

function NewEventForm({ onSave, onCancel }: { onSave: (v: { title: string; start: string; end: string; type: CalendarEventType }) => void; onCancel: () => void }) {
  const [title, setTitle] = useState("")
  const [start, setStart] = useState("")
  const [end, setEnd] = useState("")
  const [type, setType] = useState<CalendarEventType>("booking")
  const valid = title.trim().length > 0 && start && end
  return (
    <div className="animate-pop-in ih-card" style={{
      padding: 12, background: "var(--ih-surface)", marginBottom: 12,
      display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr auto", gap: 8, alignItems: "end",
    }}>
      <div>
        <label className="ih-eyebrow" style={{ fontSize: 9, marginBottom: 4, display: "block" }}>Title</label>
        <input className="ih-input" autoFocus value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Sprint review · Northwind" style={{ fontSize: 12, height: 30 }} />
      </div>
      <div>
        <label className="ih-eyebrow" style={{ fontSize: 9, marginBottom: 4, display: "block" }}>Start</label>
        <input className="ih-input" type="datetime-local" value={start} onChange={e => setStart(e.target.value)} style={{ fontSize: 12, height: 30 }} />
      </div>
      <div>
        <label className="ih-eyebrow" style={{ fontSize: 9, marginBottom: 4, display: "block" }}>End</label>
        <input className="ih-input" type="datetime-local" value={end} onChange={e => setEnd(e.target.value)} style={{ fontSize: 12, height: 30 }} />
      </div>
      <div>
        <label className="ih-eyebrow" style={{ fontSize: 9, marginBottom: 4, display: "block" }}>Type</label>
        <select className="ih-input" value={type} onChange={e => setType(e.target.value as CalendarEventType)} style={{ fontSize: 12, height: 30, padding: "0 8px" }}>
          {(Object.keys(TYPE_LABEL) as CalendarEventType[]).map(k => <option key={k} value={k}>{TYPE_LABEL[k]}</option>)}
        </select>
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <button className="ih-btn ih-btn-accent ih-btn-sm" style={{ height: 30 }} disabled={!valid} onClick={() => valid && onSave({ title, start, end, type })}>
          <Icon name="check" size={10} /> Save
        </button>
        <button className="ih-btn ih-btn-quiet ih-btn-sm" style={{ height: 30 }} onClick={onCancel}>Cancel</button>
      </div>
    </div>
  )
}

/* ── Page ────────────────────────────────────────────────────────────────── */

export default function CalendarPage() {
  const [view, setView] = useState<ViewMode>("week")
  const [weekOffset, setWeekOffset] = useState(0)        /* 0 = anchor week */
  const [dayOffset, setDayOffset] = useState(TODAY_DAY_OFFSET)
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState<Set<CalendarEventType>>(
    new Set(["booking", "internal", "personal", "deadline", "reminder"])
  )
  const [selectedId, setSelectedId] = useState<string | null>("ev-202")
  const [toast, setToast] = useState<{ msg: string; tone: ToastTone } | null>(null)
  const [showNewForm, setShowNewForm] = useState(false)
  const [prepState, setPrepState] = useState<Record<string, Set<number>>>({})

  /* Filter once. */
  const filtered = useMemo(
    () => mockCalendar.list({ search, types: Array.from(typeFilter) }),
    [search, typeFilter]
  )

  const weekStartOff = mockCalendar.weekStartOffsetForWeek(weekOffset)
  const weekLabel = useMemo(() => mockCalendar.weekLabel(weekOffset), [weekOffset])
  const weekEvents = useMemo(
    () => filtered.filter(e => e.dayOffset >= weekStartOff && e.dayOffset < weekStartOff + 7),
    [filtered, weekStartOff]
  )
  const stats = useMemo(() => mockCalendar.stats(weekEvents), [weekEvents])

  const selected = selectedId ? mockCalendar.getById(selectedId) : null
  /* Hide drawer if selected event is filtered out. */
  const drawerEvent = selected && typeFilter.has(selected.type) ? selected : null

  const typeCounts = useMemo(() => {
    const c: Record<CalendarEventType, number> = { booking: 0, internal: 0, personal: 0, deadline: 0, reminder: 0 }
    for (const e of mockCalendar.list({ search })) c[e.type]++
    return c
  }, [search])

  function fireAction(msg: string, tone: ToastTone = "ok") { setToast({ msg, tone }) }
  function toggleType(t: CalendarEventType) {
    setTypeFilter(prev => {
      const next = new Set(prev)
      if (next.has(t)) next.delete(t); else next.add(t)
      return next
    })
  }
  function togglePrep(eventId: string, idx: number) {
    setPrepState(prev => {
      const cur = new Set(prev[eventId] ?? [])
      if (cur.has(idx)) cur.delete(idx); else cur.add(idx)
      return { ...prev, [eventId]: cur }
    })
  }
  function jumpToday() {
    setWeekOffset(0)
    setDayOffset(TODAY_DAY_OFFSET)
    fireAction("Jumped to today", "info")
  }

  return (
    <div style={{ display: "flex", height: "calc(100vh - 120px)", margin: "-24px -24px" }}>
      <LeftRail
        weekOffset={weekOffset}
        onPickWeek={(off) => setWeekOffset(off)}
        typeFilter={typeFilter}
        onToggleType={toggleType}
        typeCounts={typeCounts}
        onJumpToday={jumpToday}
      />

      <section style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        {/* Toolbar */}
        <div style={{ padding: "16px 20px 12px", borderBottom: "1px solid var(--ih-line)" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <div className="ih-eyebrow" style={{ marginBottom: 6 }}>{weekLabel.range} <span style={{ color: "var(--ih-accent)", marginLeft: 8 }}>★</span></div>
              <h1 className="ih-serif" style={{ fontSize: 28, margin: 0, lineHeight: 1 }}>
                {weekLabel.monthYear.split(" ")[0]} <span className="ih-italic-red">{weekLabel.monthYear.split(" ")[1]}</span>
              </h1>
              <div style={{ fontSize: 12, color: "var(--ih-ink-50)", marginTop: 4 }}>
                {weekEvents.length} event{weekEvents.length !== 1 ? "s" : ""} this week · {stats.bookingsThisWeek} booking{stats.bookingsThisWeek !== 1 ? "s" : ""} · {stats.meetingHoursThisWeek}h meetings · {stats.freeHoursThisWeek}h free
              </div>
            </div>

            <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
              <button className="ih-btn ih-btn-quiet ih-btn-icon" style={{ height: 28, width: 28 }} onClick={() => setWeekOffset(w => w - 1)} title="Previous week">
                <Icon name="chevronLeft" size={12} />
              </button>
              <button className="ih-btn ih-btn-ghost ih-btn-sm" onClick={jumpToday}>Today</button>
              <button className="ih-btn ih-btn-quiet ih-btn-icon" style={{ height: 28, width: 28 }} onClick={() => setWeekOffset(w => w + 1)} title="Next week">
                <Icon name="chevronRight" size={12} />
              </button>

              <div style={{ width: 1, height: 18, background: "var(--ih-line)" }} />

              {/* View toggle pill group */}
              <div style={{ display: "flex", border: "1px solid var(--ih-line)", borderRadius: "var(--ih-r-md)", padding: 2, gap: 2 }}>
                {(["day", "week", "month"] as ViewMode[]).map(v => (
                  <button key={v} onClick={() => setView(v)} className="ih-btn ih-btn-sm"
                    style={{ height: 22, background: view === v ? "var(--ih-surface-2)" : "transparent", border: 0, color: view === v ? "var(--ih-ink)" : "var(--ih-ink-50)", textTransform: "capitalize" }}>
                    {v}
                  </button>
                ))}
              </div>

              <div style={{ width: 1, height: 18, background: "var(--ih-line)" }} />

              {/* Search */}
              <div style={{ position: "relative", width: 200 }}>
                <Icon name="search" size={12} style={{ position: "absolute", left: 8, top: 8, color: "var(--ih-ink-40)" }} />
                <input className="ih-input" placeholder="Search events…" value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{ paddingLeft: 26, height: 28, fontSize: 12 }} />
              </div>

              {/* Filter popover */}
              <Popover align="right" width={200} trigger={
                <button className="ih-btn ih-btn-quiet ih-btn-sm">
                  <Icon name="filter" size={11} /> {typeFilter.size < 5 ? `${typeFilter.size} type${typeFilter.size !== 1 ? "s" : ""}` : "All types"}
                </button>
              }>{() => (
                <>
                  <PopoverHeader>Event types</PopoverHeader>
                  {(Object.keys(TYPE_LABEL) as CalendarEventType[]).map(t => (
                    <PopoverItem key={t} active={typeFilter.has(t)} onClick={() => toggleType(t)}>{TYPE_LABEL[t]}</PopoverItem>
                  ))}
                </>
              )}</Popover>

              <button className="ih-btn ih-btn-primary ih-btn-sm" onClick={() => setShowNewForm(s => !s)}>
                <Icon name="plus" size={12} /> New event
              </button>
            </div>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, minHeight: 0, padding: 16, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          {showNewForm && (
            <NewEventForm
              onSave={(v) => { setShowNewForm(false); fireAction(`Created event · ${v.title}`, "ok") }}
              onCancel={() => setShowNewForm(false)}
            />
          )}

          <div style={{ flex: 1, minHeight: 0 }}>
            {view === "week"  && <WeekView  weekStartOff={weekStartOff} events={weekEvents} selectedId={selectedId} onSelect={setSelectedId} />}
            {view === "day"   && (
              <>
                {/* Day nav strip */}
                <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                  <button className="ih-btn ih-btn-quiet ih-btn-icon" style={{ height: 24, width: 24 }} onClick={() => setDayOffset(d => d - 1)} title="Previous day">
                    <Icon name="chevronLeft" size={11} />
                  </button>
                  <button className="ih-btn ih-btn-quiet ih-btn-icon" style={{ height: 24, width: 24 }} onClick={() => setDayOffset(d => d + 1)} title="Next day">
                    <Icon name="chevronRight" size={11} />
                  </button>
                  <span className="ih-mono" style={{ fontSize: 11, color: "var(--ih-ink-50)", alignSelf: "center", marginLeft: 8 }}>
                    Showing {mockCalendar.dayMeta(dayOffset).dayFull} · {mockCalendar.dayMeta(dayOffset).dateLabel}
                  </span>
                </div>
                <DayView dayOffset={dayOffset} events={filtered} selectedId={selectedId} onSelect={setSelectedId} />
              </>
            )}
            {view === "month" && <MonthView weekOffset={weekOffset} events={filtered} selectedId={selectedId} onSelect={setSelectedId} />}
          </div>
        </div>
      </section>

      {drawerEvent && (
        <EventDrawer
          event={drawerEvent}
          onClose={() => setSelectedId(null)}
          onAction={fireAction}
          onTogglePrep={togglePrep}
          prepState={prepState}
        />
      )}

      {toast && <NotificationToast message={toast.msg} tone={toast.tone} onDismiss={() => setToast(null)} />}
    </div>
  )
}
