"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { NotificationToast, ConfirmDialog } from "@/components/shared"
import Link from "next/link"
import { Icon } from "@/components/shell"

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function SectionHead({ eyebrow, title, action }: { eyebrow: string; title: string; action?: React.ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 14 }}>
      <div>
        <div className="ih-eyebrow">{eyebrow}</div>
        <h3 style={{ margin: "2px 0 0", fontSize: 15, fontWeight: 600 }}>{title}</h3>
      </div>
      {action}
    </div>
  )
}

function Btn({ children, accent, ghost, sm, onClick, style }: { children: React.ReactNode; accent?: boolean; ghost?: boolean; sm?: boolean; onClick?: () => void; style?: React.CSSProperties }) {
  const cls = ["ih-btn", sm && "ih-btn-sm", ghost && "ih-btn-ghost", accent && "ih-btn-accent"].filter(Boolean).join(" ")
  return <button className={cls} onClick={onClick} style={style}>{children}</button>
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function BookingDetailPage() {
  const router = useRouter()
  const [toast, setToast] = useState<{message: string; tone?: string} | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmAction, setConfirmAction] = useState<{title: string; desc: string; label: string; action: () => void}>({title:"",desc:"",label:"",action:()=>{}})
  const [notes, setNotes] = useState("Mira mentioned wanting to demo the new Stripe integration to the wider team. Prepare 3-slide deck covering sync reliability metrics.")

  /* Demo data */
  const booking = {
    title: "Northwind sprint review",
    date: "Tue 13 May 2025",
    time: "11:30",
    duration: "45m",
    location: "Zoom",
    type: "Sprint review",
    status: "Confirmed",
    attendees: [
      { name: "Mira Sato", role: "Founder", initials: "MS" },
      { name: "Luke Hodges", role: "Lead consultant", initials: "LH" },
    ],
  }

  return (
    <div style={{ margin: "-24px -24px" }}>
      {/* ---- Entity header ---- */}
      <div style={{ padding: "24px 28px 18px", borderBottom: "1px solid var(--ih-line)", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
            <Link href="/admin/bookings" className="ih-btn ih-btn-quiet ih-btn-sm" style={{ padding: "2px 6px", textDecoration: "none" }}>
              <Icon name="chevronLeft" size={12} /> Bookings
            </Link>
            <span className="ih-eyebrow">/bk_0913 {"·"} booking</span>
          </div>
          <h1 className="ih-serif" style={{ margin: 0, fontSize: 36, lineHeight: 1 }}>{booking.title}</h1>
          <div style={{ marginTop: 10, display: "flex", gap: 12, alignItems: "center" }}>
            <span className="ih-pill ih-pill-accent" style={{ fontSize: 10 }}>
              <Icon name="calendar" size={10} /> {booking.date} {"·"} {booking.time}
            </span>
            <span className="ih-pill" style={{ fontSize: 10 }}>
              <Icon name="clock" size={10} /> {booking.duration}
            </span>
            <span className="ih-pill ih-pill-info" style={{ fontSize: 10 }}>{booking.type}</span>
            <span className="ih-pill ih-pill-ok">
              <span className="ih-dot ih-dot-ok" /> {booking.status}
            </span>
          </div>
        </div>
        {/* Actions */}
        <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
          <Btn sm ghost onClick={() => setToast({message: "Opening reschedule picker...", tone: "info"})}>Reschedule</Btn>
          <Btn sm ghost onClick={() => { setConfirmAction({title:"Cancel booking?",desc:"This will notify all attendees.",label:"Cancel booking",action:() => { setConfirmOpen(false); setToast({message:"Booking cancelled",tone:"warn"}) }}); setConfirmOpen(true) }}>Cancel</Btn>
          <Btn sm accent onClick={() => { setConfirmAction({title:"Mark complete?",desc:"This will mark the booking as completed.",label:"Mark Complete",action:() => { setConfirmOpen(false); setToast({message:"Booking marked complete",tone:"ok"}) }}); setConfirmOpen(true) }}>Mark Complete</Btn>
        </div>
      </div>

      {/* ---- Body: two-column ---- */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 0 }}>
        {/* Left column */}
        <div style={{ padding: "20px 28px 48px", borderRight: "1px solid var(--ih-line)" }}>
          {/* Details card */}
          <SectionHead eyebrow="details" title="Booking information" />
          <div className="ih-card" style={{ marginBottom: 24 }}>
            <div style={{ padding: 20 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20 }}>
                {([
                  ["Date", booking.date, "calendar"],
                  ["Time", booking.time, "clock"],
                  ["Duration", booking.duration, "clock"],
                  ["Location", booking.location, "pin"],
                  ["Type", booking.type, "flag"],
                  ["Status", booking.status, "check"],
                ] as [string, string, string][]).map(([label, value, icon]) => (
                  <div key={label}>
                    <div className="ih-eyebrow" style={{ marginBottom: 4 }}>
                      <Icon name={icon as "calendar"} size={10} style={{ marginRight: 4 }} />{label}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Attendees */}
          <SectionHead eyebrow="attendees" title={`People attending (${booking.attendees.length})`} action={<Btn sm ghost onClick={() => setToast({message: "Attendee added", tone: "ok"})}><Icon name="plus" size={11} /> Add</Btn>} />
          <div className="ih-card" style={{ padding: 0, marginBottom: 24 }}>
            {booking.attendees.map((a, i) => (
              <div key={a.name} style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 14, padding: "12px 16px", borderTop: i === 0 ? "0" : "1px solid var(--ih-line)", alignItems: "center" }}>
                <div className="ih-avatar" style={{ width: 32, height: 32, fontSize: 11, background: i === 1 ? "var(--ih-accent-soft)" : undefined, color: i === 1 ? "var(--ih-accent)" : undefined }}>{a.initials}</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{a.name}</div>
                  <div className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-50)" }}>{a.role}</div>
                </div>
                <Icon name="chevronRight" size={11} style={{ color: "var(--ih-ink-30)" }} />
              </div>
            ))}
          </div>

          {/* Notes */}
          <SectionHead eyebrow="notes" title="Meeting notes" action={<span className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)" }}>auto-saves</span>} />
          <div className="ih-card" style={{ padding: 0 }}>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={{
                width: "100%",
                minHeight: 140,
                padding: 16,
                border: 0,
                background: "transparent",
                fontSize: 13,
                lineHeight: 1.6,
                color: "var(--ih-ink)",
                fontFamily: "inherit",
                resize: "vertical",
                outline: "none",
              }}
            />
          </div>
        </div>

        {/* Right rail */}
        <div style={{ padding: "20px 20px 48px", background: "var(--ih-surface-2)" }}>
          <div className="ih-eyebrow" style={{ marginBottom: 14 }}>Right rail {"·"} context</div>

          {/* Client context mini-card */}
          <Link href="/admin/clients/c-northwind" style={{ textDecoration: "none", color: "inherit" }}>
            <div className="ih-card" style={{ marginBottom: 12, background: "var(--ih-surface)", cursor: "pointer" }}>
              <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--ih-line)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span className="ih-eyebrow">Client</span>
                <Icon name="arrowUpRight" size={10} style={{ color: "var(--ih-ink-30)" }} />
              </div>
              <div style={{ padding: "12px 14px", display: "flex", gap: 12, alignItems: "center" }}>
                <div className="ih-avatar" style={{ width: 36, height: 36, fontSize: 14, background: "var(--ih-surface-2)", border: "1px solid var(--ih-line)" }}>
                  <span style={{ fontStyle: "italic", fontFamily: "var(--ih-font-serif)" }}>N</span>
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>Northwind Co.</div>
                  <div className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-50)" }}>Mira Sato {"·"} Founder</div>
                </div>
              </div>
            </div>
          </Link>

          {/* Related engagement */}
          <Link href="/admin/clients/c-northwind" style={{ textDecoration: "none", color: "inherit" }}>
            <div className="ih-card" style={{ marginBottom: 12, background: "var(--ih-surface)", cursor: "pointer" }}>
              <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--ih-line)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span className="ih-eyebrow">Linked engagement</span>
                <Icon name="arrowUpRight" size={10} style={{ color: "var(--ih-ink-30)" }} />
              </div>
              <div style={{ padding: "12px 14px" }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>Q2 Retainer {"·"} Sprint 4</div>
                <div className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-50)", marginTop: 4 }}>/eng_0481 {"·"} AUDITING</div>
                <div style={{ display: "flex", gap: 4, marginTop: 10 }}>
                  {[1, 2, 3, 4, 5, 6].map(n => (
                    <div key={n} style={{ flex: 1, height: 3, borderRadius: 2, background: n < 4 ? "var(--ih-ok)" : n === 4 ? "var(--ih-accent)" : "var(--ih-line)" }} />
                  ))}
                </div>
              </div>
            </div>
          </Link>

          {/* AI prep card */}
          <div className="ih-card ih-card-pad" style={{ marginBottom: 12, background: "var(--ih-ink)", color: "#fff", padding: 16, borderColor: "transparent" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
              <Icon name="sparkles" size={13} style={{ color: "#fff" }} />
              <span className="ih-eyebrow" style={{ color: "rgba(255,255,255,0.6)" }}>Copilot {"·"} prep</span>
            </div>
            <p style={{ margin: 0, fontSize: 12, lineHeight: 1.55, color: "rgba(255,255,255,0.85)" }}>
              I drafted a <strong style={{ color: "#fff" }}>discovery script</strong> based on last sprint&apos;s retro notes. Mira flagged scope creep on Portal v2 &mdash; suggest addressing budget impact early. Sprint 4 is 78% done; Stripe sync shipped clean.
            </p>
            <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
              <button className="ih-btn ih-btn-sm" style={{ background: "rgba(255,255,255,0.15)", color: "#fff" }} onClick={() => setToast({message: "Opening discovery script...", tone: "info"})}>View script</button>
              <button className="ih-btn ih-btn-sm" style={{ background: "transparent", color: "rgba(255,255,255,0.7)", borderColor: "rgba(255,255,255,0.2)" }} onClick={() => setToast({message: "AI is generating talking points...", tone: "info"})}>Talking points</button>
            </div>
          </div>

          {/* Related invoice */}
          <Link href="/admin/payments/inv-1" style={{ textDecoration: "none", color: "inherit" }}>
            <div className="ih-card" style={{ background: "var(--ih-surface)", cursor: "pointer" }}>
              <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--ih-line)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span className="ih-eyebrow">Linked invoice</span>
                <Icon name="arrowUpRight" size={10} style={{ color: "var(--ih-ink-30)" }} />
              </div>
              <div style={{ padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>NW-002 {"·"} Audit findings</div>
                  <div className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-50)", marginTop: 4 }}>Due 18 Apr {"·"} 14 days overdue</div>
                </div>
                <div>
                  <span className="ih-pill ih-pill-warn" style={{ fontSize: 9 }}>SENT</span>
                  <div className="ih-serif" style={{ fontSize: 18, marginTop: 4, textAlign: "right" }}>{"\u00A3"}6,125</div>
                </div>
              </div>
            </div>
          </Link>
        </div>
      </div>
      {toast && <NotificationToast message={toast.message} tone={toast.tone as any} onDismiss={() => setToast(null)} />}
      <ConfirmDialog open={confirmOpen} title={confirmAction.title} description={confirmAction.desc} confirmLabel={confirmAction.label} onConfirm={confirmAction.action} onCancel={() => setConfirmOpen(false)} />
    </div>
  )
}
