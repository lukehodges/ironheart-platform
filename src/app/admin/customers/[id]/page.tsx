"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { NotificationToast, ConfirmDialog } from "@/components/shared"
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
/*  Tab content                                                        */
/* ------------------------------------------------------------------ */

function OverviewTab() {
  const engagements = [
    { id: "eng_0481", title: "Q2 Retainer", type: "RETAINER", stage: "AUDITING", value: "\u00A324,500", dates: "1 Mar \u2192 31 Aug 2025", tone: "accent" },
    { id: "eng_0312", title: "Initial Discovery", type: "PROJECT", stage: "COMPLETED", value: "\u00A38,400", dates: "14 Jan \u2192 28 Feb 2025", tone: "ok" },
  ]

  /* Simple booking frequency (CSS bars) */
  const bookingMonths = [
    { month: "Jan", count: 2 }, { month: "Feb", count: 4 }, { month: "Mar", count: 3 },
    { month: "Apr", count: 3 }, { month: "May", count: 2 },
  ]
  const maxBookings = Math.max(...bookingMonths.map(m => m.count))

  /* Simple spend chart */
  const spendMonths = [
    { month: "Jan", amount: 0 }, { month: "Feb", amount: 8400 }, { month: "Mar", amount: 14200 },
    { month: "Apr", amount: 6125 }, { month: "May", amount: 0 },
  ]
  const maxSpend = Math.max(...spendMonths.map(m => m.amount))

  return (
    <>
      {/* Engagement history */}
      <SectionHead eyebrow="engagements" title="Engagement history" />
      <div style={{ display: "grid", gap: 10, marginBottom: 24 }}>
        {engagements.map((eng) => (
          <div key={eng.id} className="ih-card" style={{ padding: "14px 18px", cursor: "pointer" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                  <span className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)" }}>/{eng.id}</span>
                  <span className={`ih-pill ih-pill-${eng.tone}`} style={{ fontSize: 9 }}>{eng.stage}</span>
                  <span className="ih-pill" style={{ fontSize: 9 }}>{eng.type}</span>
                </div>
                <div style={{ fontSize: 15, fontFamily: "var(--ih-font-serif)", fontWeight: 500 }}>{eng.title}</div>
                <div className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-50)", marginTop: 4 }}>{eng.dates} {"·"} {eng.value}</div>
              </div>
              <Icon name="chevronRight" size={13} style={{ color: "var(--ih-ink-30)" }} />
            </div>
          </div>
        ))}
      </div>

      {/* Charts side-by-side */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 24 }}>
        {/* Booking frequency */}
        <div className="ih-card" style={{ padding: 16 }}>
          <div className="ih-eyebrow" style={{ marginBottom: 14 }}>Booking frequency</div>
          <div style={{ display: "flex", gap: 8, alignItems: "flex-end", height: 80 }}>
            {bookingMonths.map((m) => (
              <div key={m.month} style={{ flex: 1, textAlign: "center" }}>
                <div style={{ height: maxBookings > 0 ? (m.count / maxBookings) * 60 : 0, background: "var(--ih-accent)", borderRadius: 3, minHeight: m.count > 0 ? 4 : 0, marginBottom: 6 }} />
                <div className="ih-mono" style={{ fontSize: 9, color: "var(--ih-ink-40)" }}>{m.month}</div>
                <div className="ih-mono" style={{ fontSize: 10, fontWeight: 600 }}>{m.count}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Spend over time */}
        <div className="ih-card" style={{ padding: 16 }}>
          <div className="ih-eyebrow" style={{ marginBottom: 14 }}>Spend over time</div>
          <div style={{ display: "flex", gap: 8, alignItems: "flex-end", height: 80 }}>
            {spendMonths.map((m) => (
              <div key={m.month} style={{ flex: 1, textAlign: "center" }}>
                <div style={{ height: maxSpend > 0 ? (m.amount / maxSpend) * 60 : 0, background: "var(--ih-ok)", borderRadius: 3, minHeight: m.amount > 0 ? 4 : 0, marginBottom: 6 }} />
                <div className="ih-mono" style={{ fontSize: 9, color: "var(--ih-ink-40)" }}>{m.month}</div>
                <div className="ih-mono" style={{ fontSize: 10, fontWeight: 600 }}>{m.amount > 0 ? `\u00A3${(m.amount / 1000).toFixed(1)}k` : "\u2014"}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Form submissions */}
      <SectionHead eyebrow="forms" title="Form submissions" />
      <div className="ih-card" style={{ padding: 0, marginBottom: 24 }}>
        {([
          { name: "Onboarding questionnaire", date: "16 Jan 2025", status: "Completed", tone: "ok" },
          { name: "Sprint 3 feedback", date: "9 May 2025", status: "Completed", tone: "ok" },
        ]).map((f, i) => (
          <div key={f.name} style={{ display: "grid", gridTemplateColumns: "1fr 100px 90px", gap: 12, padding: "10px 16px", borderTop: i === 0 ? "0" : "1px solid var(--ih-line)", fontSize: 12.5, cursor: "pointer", alignItems: "center" }}>
            <span style={{ fontWeight: 500 }}>{f.name}</span>
            <span className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-50)" }}>{f.date}</span>
            <span className={`ih-pill ih-pill-${f.tone}`} style={{ fontSize: 9, justifySelf: "start" }}>{f.status}</span>
          </div>
        ))}
      </div>
    </>
  )
}

function EngagementsTab() {
  return (
    <div>
      <SectionHead eyebrow="engagements" title="All engagements for Mira Sato" />
      <div className="ih-card" style={{ padding: 0 }}>
        {([
          { id: "eng_0481", title: "Q2 Retainer", type: "RETAINER", stage: "AUDITING", value: "\u00A324,500", dates: "1 Mar \u2192 31 Aug 2025" },
          { id: "eng_0312", title: "Initial Discovery", type: "PROJECT", stage: "COMPLETED", value: "\u00A38,400", dates: "14 Jan \u2192 28 Feb 2025" },
        ]).map((eng, i) => (
          <div key={eng.id} style={{ display: "grid", gridTemplateColumns: "auto 1fr auto auto auto", gap: 12, padding: "12px 16px", borderTop: i === 0 ? "0" : "1px solid var(--ih-line)", alignItems: "center", cursor: "pointer" }}>
            <span className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)" }}>/{eng.id}</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{eng.title}</div>
              <div className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-50)", marginTop: 2 }}>{eng.dates}</div>
            </div>
            <span className="ih-pill" style={{ fontSize: 9 }}>{eng.type}</span>
            <span className={`ih-pill ${eng.stage === "COMPLETED" ? "ih-pill-ok" : "ih-pill-accent"}`} style={{ fontSize: 9 }}>{eng.stage}</span>
            <span className="ih-mono" style={{ fontSize: 12, fontWeight: 600 }}>{eng.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function BookingsTab() {
  const bookings = [
    { date: "Tue 13 May", time: "11:30", title: "Sprint review", duration: "45m", type: "Review" },
    { date: "Fri 16 May", time: "15:00", title: "Stakeholder demo", duration: "45m", type: "Demo" },
    { date: "Tue 20 May", time: "11:30", title: "Sprint 5 kickoff", duration: "30m", type: "Planning" },
  ]
  return (
    <div>
      <SectionHead eyebrow="bookings" title="All bookings for Mira Sato" action={<Btn sm accent onClick={() => { window.location.href = "/admin/bookings/new" }}><Icon name="plus" size={11} /> Book session</Btn>} />
      <div className="ih-card" style={{ padding: 0 }}>
        <div style={{ display: "grid", gridTemplateColumns: "100px 60px 1fr 60px 80px", gap: 12, padding: "10px 16px", borderBottom: "1px solid var(--ih-line)" }}>
          {["Date", "Time", "Title", "Dur.", "Type"].map(h => (
            <div key={h} className="ih-mono" style={{ fontSize: 9, color: "var(--ih-ink-40)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{h}</div>
          ))}
        </div>
        {bookings.map((b, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "100px 60px 1fr 60px 80px", gap: 12, padding: "10px 16px", borderTop: i === 0 ? "0" : "1px solid var(--ih-line)", cursor: "pointer", fontSize: 12.5 }}>
            <span style={{ fontWeight: 500 }}>{b.date}</span>
            <span className="ih-mono" style={{ fontSize: 11, color: "var(--ih-ink-65)" }}>{b.time}</span>
            <span style={{ fontWeight: 500 }}>{b.title}</span>
            <span className="ih-mono" style={{ fontSize: 11, color: "var(--ih-ink-40)" }}>{b.duration}</span>
            <span className="ih-pill" style={{ fontSize: 9, justifySelf: "start" }}>{b.type}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function InvoicesTab() {
  return (
    <div>
      <SectionHead eyebrow="invoices" title="Invoices for Mira Sato" />
      <div className="ih-card" style={{ padding: 0 }}>
        <div style={{ display: "grid", gridTemplateColumns: "70px 1fr 80px 80px 60px", gap: 10, padding: "10px 16px", borderBottom: "1px solid var(--ih-line)" }}>
          {["Number", "Description", "Amount", "Date", "Status"].map(h => (
            <div key={h} className="ih-mono" style={{ fontSize: 9, color: "var(--ih-ink-40)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{h}</div>
          ))}
        </div>
        {([
          { number: "NW-001", desc: "Deposit", amount: "\u00A312,250", date: "20 Mar", status: "PAID", tone: "ok" },
          { number: "NW-002", desc: "Audit findings (50%)", amount: "\u00A36,125", date: "4 Apr", status: "SENT", tone: "warn" },
          { number: "NW-003", desc: "Handover", amount: "\u00A36,125", date: "\u2014", status: "DRAFT", tone: "muted" },
        ]).map((inv, i) => (
          <div key={inv.number} style={{ display: "grid", gridTemplateColumns: "70px 1fr 80px 80px 60px", gap: 10, padding: "10px 16px", borderTop: i === 0 ? "0" : "1px solid var(--ih-line)", cursor: "pointer", fontSize: 12.5 }}>
            <span className="ih-mono" style={{ fontSize: 11, fontWeight: 600 }}>{inv.number}</span>
            <span style={{ fontWeight: 500 }}>{inv.desc}</span>
            <span className="ih-mono" style={{ fontWeight: 600 }}>{inv.amount}</span>
            <span className="ih-mono" style={{ fontSize: 11, color: "var(--ih-ink-65)" }}>{inv.date}</span>
            <span className={`ih-pill ih-pill-${inv.tone}`} style={{ fontSize: 9, justifySelf: "start" }}>{inv.status}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function FormsTab() {
  return (
    <div>
      <SectionHead eyebrow="forms" title="Submitted forms" />
      <div className="ih-card" style={{ padding: 0 }}>
        {([
          { name: "Onboarding questionnaire", date: "16 Jan 2025", fields: 12, status: "Completed" },
          { name: "Sprint 3 feedback", date: "9 May 2025", fields: 6, status: "Completed" },
        ]).map((f, i) => (
          <div key={f.name} style={{ display: "grid", gridTemplateColumns: "1fr 100px 80px 90px", gap: 10, padding: "12px 16px", borderTop: i === 0 ? "0" : "1px solid var(--ih-line)", fontSize: 12.5, cursor: "pointer", alignItems: "center" }}>
            <span style={{ fontWeight: 500 }}>{f.name}</span>
            <span className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-50)" }}>{f.date}</span>
            <span className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)" }}>{f.fields} fields</span>
            <span className="ih-pill ih-pill-ok" style={{ fontSize: 9, justifySelf: "start" }}>{f.status}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function NotesTab() {
  const [newNote, setNewNote] = useState("")
  const [noteType, setNoteType] = useState<"GENERAL" | "PREFERENCE" | "FOLLOWUP">("GENERAL")
  const notes = [
    { type: "PREFERENCE", text: "Prefers async. Don\u2019t book past 16:00 UK. Lara approves all spend > \u00A3500.", by: "luke", when: "4 weeks ago" },
    { type: "FOLLOWUP", text: "Renewal conversation slot: last week of June. Q3 brief drafted in /docs.", by: "luke", when: "6 days ago" },
    { type: "GENERAL", text: "Mira mentioned wanting to explore a second product line audit. Discuss in Q3 renewal.", by: "luke", when: "2 days ago" },
    { type: "GENERAL", text: "Great NPS score (9) after sprint 3 retro. Strong renewal signal.", by: "system", when: "1 week ago" },
  ]

  const toneLookup: Record<string, string> = { PREFERENCE: "info", FOLLOWUP: "accent", GENERAL: "" }

  return (
    <div>
      <SectionHead eyebrow="notes" title={`Notes (${notes.length})`} />
      {/* Add note form */}
      <div className="ih-card" style={{ padding: 14, marginBottom: 16 }}>
        <textarea
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="Add a note..."
          style={{ width: "100%", minHeight: 60, padding: 10, border: "1px solid var(--ih-line)", borderRadius: 8, fontSize: 13, lineHeight: 1.5, color: "var(--ih-ink)", fontFamily: "inherit", resize: "vertical", outline: "none", background: "var(--ih-surface)" }}
        />
        <div style={{ display: "flex", gap: 6, marginTop: 10, justifyContent: "flex-end" }}>
          {(["GENERAL", "PREFERENCE", "FOLLOWUP"] as const).map(t => (
            <Btn key={t} sm ghost={noteType !== t} accent={noteType === t} onClick={() => setNoteType(t)} style={noteType === t ? {} : undefined}>{t}</Btn>
          ))}
          <Btn sm accent onClick={() => alert("Note saved")}><Icon name="plus" size={11} /> Save note</Btn>
        </div>
      </div>

      {/* Notes list */}
      <div style={{ display: "grid", gap: 8 }}>
        {notes.map((n, i) => (
          <div key={i} className="ih-card" style={{ padding: "12px 16px" }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
              <span className={`ih-pill ih-pill-${toneLookup[n.type] || ""}`} style={{ fontSize: 9 }}>{n.type}</span>
              <span className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)" }}>{n.by} {"·"} {n.when}</span>
            </div>
            <div style={{ fontSize: 12.5, lineHeight: 1.55 }}>{n.text}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Main page                                                          */
/* ------------------------------------------------------------------ */

export default function CustomerDetailPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState(0)
  const [toast, setToast] = useState<{message: string; tone?: string} | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmAction, setConfirmAction] = useState<{title: string; desc: string; label: string; action: () => void}>({title:"",desc:"",label:"",action:()=>{}})
  const tabs = ["Overview", "Engagements", "Bookings", "Invoices", "Forms", "Notes"]

  const customer = {
    name: "Mira Sato",
    company: "Northwind Co.",
    email: "mira@northwind.co",
    phone: "+44 7700 900482",
    since: "Mar 2025",
    initials: "MS",
    tags: ["Founder", "Primary contact", "High NPS"],
  }

  const connections = [
    { label: "Engagements", value: "1 active", icon: "handshake" as const, tone: "accent" },
    { label: "Bookings", value: "14 total", icon: "calendar" as const, tone: "info" },
    { label: "Invoices", value: "3 issued", icon: "invoice" as const, tone: "muted" },
    { label: "Forms", value: "2 submitted", icon: "file" as const, tone: "ok" },
    { label: "Reviews", value: "1 review", icon: "star" as const, tone: "ok" },
    { label: "Notes", value: "4 notes", icon: "chat" as const, tone: "muted" },
  ]

  const tabContent = [
    <OverviewTab key="overview" />,
    <EngagementsTab key="engagements" />,
    <BookingsTab key="bookings" />,
    <InvoicesTab key="invoices" />,
    <FormsTab key="forms" />,
    <NotesTab key="notes" />,
  ]

  return (
    <div style={{ margin: "-24px -24px" }}>
      {/* ---- Entity header ---- */}
      <div style={{ padding: "24px 28px 18px", borderBottom: "1px solid var(--ih-line)", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ display: "flex", gap: 18, alignItems: "flex-end" }}>
          <div className="ih-avatar" style={{ width: 72, height: 72, borderRadius: 14, fontSize: 28, display: "flex", alignItems: "center", justifyContent: "center" }}>{customer.initials}</div>
          <div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
              <Link href="/admin/customers" className="ih-btn ih-btn-quiet ih-btn-sm" style={{ padding: "2px 6px", textDecoration: "none" }}>
                <Icon name="chevronLeft" size={12} /> Customers
              </Link>
              <span className="ih-eyebrow">/cst_204 {"·"} customer</span>
            </div>
            <h1 className="ih-serif" style={{ margin: 0, fontSize: 36, lineHeight: 1 }}>{customer.name}</h1>
            <div style={{ marginTop: 4, fontSize: 14, color: "var(--ih-ink-65)" }}>{customer.company}</div>
            <div style={{ marginTop: 10, display: "flex", gap: 16, fontSize: 11.5, color: "var(--ih-ink-50)" }}>
              <span><Icon name="mail" size={10} /> {customer.email}</span>
              <span><Icon name="phone" size={10} /> {customer.phone}</span>
              <span><Icon name="clock" size={10} /> Client since {customer.since}</span>
            </div>
            <div style={{ marginTop: 8, display: "flex", gap: 6 }}>
              {customer.tags.map(t => (
                <span key={t} className="ih-pill" style={{ fontSize: 9 }}>{t}</span>
              ))}
            </div>
          </div>
        </div>
        {/* Actions */}
        <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
          <Btn sm ghost onClick={() => setToast({message: "Edit mode coming soon", tone: "info"})}><Icon name="user" size={11} /> Edit</Btn>
          <Btn sm ghost onClick={() => setActiveTab(5)}>Add Note</Btn>
          <Btn sm ghost onClick={() => { setConfirmAction({title:"Merge customer?",desc:"This will merge this customer record into another. This action cannot be undone.",label:"Merge",action:() => { setConfirmOpen(false); setToast({message:"Customer merge initiated",tone:"ok"}) }}); setConfirmOpen(true) }}>Merge</Btn>
          <Btn sm ghost style={{ color: "var(--ih-warn)" }} onClick={() => { setConfirmAction({title:"Anonymise customer?",desc:"This will permanently remove all personal data for this customer. This action cannot be undone.",label:"Anonymise",action:() => { setConfirmOpen(false); setToast({message:"Customer data anonymised",tone:"warn"}) }}); setConfirmOpen(true) }}>Anonymise</Btn>
        </div>
      </div>

      {/* Connection map */}
      <div style={{ padding: "14px 28px", borderBottom: "1px solid var(--ih-line)", background: "var(--ih-surface-2)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 10 }}>
          {connections.map((c) => (
            <div key={c.label} style={{ display: "flex", gap: 8, alignItems: "center", padding: "8px 12px", border: "1px solid var(--ih-line)", borderRadius: 8, background: "var(--ih-surface)", cursor: "pointer" }}>
              <Icon name={c.icon} size={12} style={{ color: c.tone === "accent" ? "var(--ih-accent)" : c.tone === "info" ? "var(--ih-info)" : c.tone === "ok" ? "var(--ih-ok)" : "var(--ih-ink-40)" }} />
              <div>
                <div className="ih-eyebrow" style={{ fontSize: 9 }}>{c.label}</div>
                <div style={{ fontSize: 11.5, fontWeight: 500 }}>{c.value}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ padding: "0 28px", display: "flex", gap: 0, borderBottom: "1px solid var(--ih-line)", background: "var(--ih-bg)" }}>
        {tabs.map((t, i) => (
          <button key={t} onClick={() => setActiveTab(i)} style={{ background: "transparent", border: 0, padding: "12px 14px", fontSize: 12.5, color: activeTab === i ? "var(--ih-ink)" : "var(--ih-ink-50)", fontWeight: activeTab === i ? 500 : 400, cursor: "pointer", borderBottom: activeTab === i ? "2px solid var(--ih-accent)" : "2px solid transparent", marginBottom: "-1px" }}>{t}</button>
        ))}
      </div>

      {/* Body: two-column on Overview, full-width on other tabs */}
      <div style={{ display: "grid", gridTemplateColumns: activeTab === 0 ? "1fr 320px" : "1fr", gap: 0 }}>
        <div style={{ padding: "20px 28px 48px", borderRight: activeTab === 0 ? "1px solid var(--ih-line)" : "none" }}>
          {tabContent[activeTab]}
        </div>

        {/* Right rail on Overview */}
        {activeTab === 0 && (
          <div style={{ padding: "20px 20px 48px", background: "var(--ih-surface-2)" }}>
            <div className="ih-eyebrow" style={{ marginBottom: 14 }}>Right rail {"·"} contextual</div>

            {/* AI summary */}
            <div className="ih-card ih-card-pad" style={{ marginBottom: 12, background: "var(--ih-ink)", color: "#fff", padding: 16, borderColor: "transparent" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                <Icon name="sparkles" size={13} style={{ color: "#fff" }} />
                <span className="ih-eyebrow" style={{ color: "rgba(255,255,255,0.6)" }}>Copilot {"·"} this customer</span>
              </div>
              <p style={{ margin: 0, fontSize: 12, lineHeight: 1.55, color: "rgba(255,255,255,0.85)" }}>
                Mira is the <strong style={{ color: "#fff" }}>primary decision maker</strong> at Northwind. NPS 9 after last retro &mdash; strong renewal signal. Prefers async communication, no meetings after 16:00 UK. Budget decisions go through Lara Kim for amounts &gt; {"\u00A3"}500.
              </p>
            </div>

            {/* Pinned notes */}
            <div className="ih-card" style={{ marginBottom: 12, background: "var(--ih-surface)" }}>
              <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--ih-line)" }}>
                <span className="ih-eyebrow">Pinned notes {"·"} 2</span>
              </div>
              <div style={{ padding: "12px 14px" }}>
                <div style={{ fontSize: 12, lineHeight: 1.5, paddingBottom: 10, marginBottom: 10, borderBottom: "1px solid var(--ih-line)" }}>
                  <strong>Prefers async.</strong> Don&apos;t book past 16:00 UK. Lara approves all spend &gt; {"\u00A3"}500.
                  <div className="ih-mono" style={{ fontSize: 9.5, color: "var(--ih-ink-40)", marginTop: 6 }}>luke {"·"} 4 weeks ago</div>
                </div>
                <div style={{ fontSize: 12, lineHeight: 1.5 }}>
                  Renewal conversation slot: <strong>last week of June</strong>. Q3 brief drafted in /docs.
                  <div className="ih-mono" style={{ fontSize: 9.5, color: "var(--ih-ink-40)", marginTop: 6 }}>luke {"·"} 6 days ago</div>
                </div>
              </div>
            </div>

            {/* Tags */}
            <div className="ih-card" style={{ background: "var(--ih-surface)" }}>
              <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--ih-line)", display: "flex", justifyContent: "space-between" }}>
                <span className="ih-eyebrow">Tags</span>
                <button className="ih-btn ih-btn-quiet ih-btn-sm" style={{ height: 22, padding: "0 6px" }} onClick={() => setToast({message: "Add tag coming soon", tone: "info"})}><Icon name="plus" size={11} /></button>
              </div>
              <div style={{ padding: "12px 14px", display: "flex", gap: 6, flexWrap: "wrap" }}>
                {["Founder", "Primary contact", "High NPS", "Northwind"].map(t => (
                  <span key={t} className="ih-pill" style={{ fontSize: 10 }}>{t}</span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
      {toast && <NotificationToast message={toast.message} tone={toast.tone as any} onDismiss={() => setToast(null)} />}
      <ConfirmDialog open={confirmOpen} title={confirmAction.title} description={confirmAction.desc} confirmLabel={confirmAction.label} onConfirm={confirmAction.action} onCancel={() => setConfirmOpen(false)} />
    </div>
  )
}
