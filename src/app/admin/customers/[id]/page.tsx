"use client"

import { useState, useMemo, useRef, useEffect, use } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Icon, type IconName } from "@/components/shell"
import {
  NotificationToast, type ToastTone,
  ConfirmDialog, EmailDraftDialog,
} from "@/components/shared"
import {
  mockCustomers,
  STATUS_META,
  type Customer,
} from "@/lib/mock/customers"

/* ── Tabs ────────────────────────────────────────────────────────────────── */

type Tab = "overview" | "engagements" | "activity" | "contacts" | "invoices" | "notes"

interface PageProps { params: Promise<{ id: string }> }

/* ── Small primitives ────────────────────────────────────────────────────── */

function Popover({ trigger, children, align = "left", width = 220 }: { trigger: React.ReactNode; children: (close: () => void) => React.ReactNode; align?: "left" | "right"; width?: number }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener("mousedown", h)
    return () => document.removeEventListener("mousedown", h)
  }, [open])
  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block" }}>
      <div onClick={() => setOpen(o => !o)}>{trigger}</div>
      {open && (
        <div className="animate-pop-in" style={{
          position: "absolute", top: "calc(100% + 6px)", [align === "right" ? "right" : "left"]: 0,
          zIndex: 100, width, background: "var(--ih-surface)", border: "1px solid var(--ih-line)",
          borderRadius: "var(--ih-r-md)", boxShadow: "0 8px 24px rgba(0,0,0,0.08)", padding: 4,
          maxHeight: 380, overflowY: "auto",
        }}>
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  )
}

function PopoverHeader({ children }: { children: React.ReactNode }) {
  return <div className="ih-eyebrow" style={{ padding: "8px 10px 4px", fontSize: 9 }}>{children}</div>
}
function PopoverItem({ onClick, children, danger }: { onClick: () => void; children: React.ReactNode; danger?: boolean }) {
  return (
    <button onClick={onClick}
      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "var(--ih-surface-2)" }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "transparent" }}
      style={{
        display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "6px 10px",
        border: 0, background: "transparent",
        fontSize: 12, color: danger ? "var(--ih-danger)" : "var(--ih-ink)", cursor: "pointer",
        textAlign: "left", borderRadius: "var(--ih-r-sm)",
      }}>
      {children}
    </button>
  )
}

/* ── Tab bodies ──────────────────────────────────────────────────────────── */

function OverviewTab({ customer }: { customer: Customer }) {
  const totalEng = customer.engagementSummary.active + customer.engagementSummary.proposed + customer.engagementSummary.closed

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 28 }}>
      <div>
        <SectionHead eyebrow="snapshot" title="Customer snapshot" />
        <div className="ih-card" style={{ padding: 18, marginBottom: 22 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 18 }}>
            {[
              { label: "Lifetime value", value: customer.lifetimeValue > 0 ? `£${customer.lifetimeValue.toLocaleString()}` : "—", tone: "var(--ih-ink)" },
              { label: "Engagements",    value: String(totalEng),                                                                tone: "var(--ih-ink)" },
              { label: "Open invoices",  value: String(customer.openInvoices),                                                   tone: customer.openInvoices > 0 ? "var(--ih-danger)" : "var(--ih-ink)" },
              { label: "Last activity",  value: customer.lastActivity,                                                           tone: "var(--ih-ink)" },
            ].map(s => (
              <div key={s.label}>
                <div className="ih-eyebrow" style={{ marginBottom: 4 }}>{s.label}</div>
                <div className="ih-serif ih-num" style={{ fontSize: 26, lineHeight: 1, color: s.tone }}>{s.value}</div>
              </div>
            ))}
          </div>
        </div>

        <SectionHead eyebrow="engagement breakdown" title="Engagement breakdown" />
        <div className="ih-card" style={{ padding: 16, marginBottom: 22 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
            {[
              { label: "Active",   value: customer.engagementSummary.active,   tone: "var(--ih-ok)"   },
              { label: "Proposed", value: customer.engagementSummary.proposed, tone: "var(--ih-info)" },
              { label: "Closed",   value: customer.engagementSummary.closed,   tone: "var(--ih-ink-50)" },
            ].map(b => (
              <div key={b.label}>
                <div className="ih-eyebrow" style={{ marginBottom: 4 }}>{b.label}</div>
                <div className="ih-num" style={{ fontSize: 22, fontWeight: 500, color: b.tone }}>{b.value}</div>
              </div>
            ))}
          </div>
        </div>

        <SectionHead eyebrow="notes" title="Customer notes" />
        <div className="ih-card" style={{ padding: 16, marginBottom: 22 }}>
          <div style={{ fontSize: 13, lineHeight: 1.6, color: "var(--ih-ink-65)" }}>{customer.notes}</div>
        </div>
      </div>

      {/* Right column: meta */}
      <aside style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div className="ih-card" style={{ padding: 14 }}>
          <div className="ih-eyebrow" style={{ marginBottom: 10 }}>Details</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 12 }}>
            {[
              ["Industry",   customer.industry],
              ["Employees",  customer.employees],
              ["Address",    customer.address],
              ["Source",     customer.source],
              ["Owner",      customer.owner.name],
              ["Customer since", customer.since],
            ].map(([k, v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <span style={{ color: "var(--ih-ink-50)" }}>{k}</span>
                <span style={{ color: "var(--ih-ink)", textAlign: "right" }}>{v}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="ih-card" style={{ padding: 14 }}>
          <div className="ih-eyebrow" style={{ marginBottom: 10 }}>Tags</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {customer.tags.length === 0 && <span style={{ fontSize: 12, color: "var(--ih-ink-40)" }}>No tags yet.</span>}
            {customer.tags.map(t => <span key={t} className="ih-pill" style={{ fontSize: 10, textTransform: "lowercase" }}>#{t}</span>)}
          </div>
        </div>

        <div className="ih-card" style={{ padding: 14 }}>
          <div className="ih-eyebrow" style={{ marginBottom: 10 }}>Primary contact</div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
            <div className="ih-avatar" style={{ width: 28, height: 28, fontSize: 11 }}>
              {customer.primaryContact.name.split(" ").map(s => s[0]).slice(0, 2).join("")}
            </div>
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 500 }}>{customer.primaryContact.name}</div>
              <div className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-50)" }}>{customer.primaryContact.role}</div>
            </div>
          </div>
          <div style={{ fontSize: 11.5, color: "var(--ih-ink-65)", display: "flex", flexDirection: "column", gap: 2 }}>
            <span><Icon name="mail" size={10} /> {customer.primaryContact.email}</span>
            <span className="ih-mono"><Icon name="phone" size={10} /> {customer.primaryContact.phone}</span>
          </div>
        </div>
      </aside>
    </div>
  )
}

function EngagementsTab({ customer }: { customer: Customer }) {
  return (
    <div>
      <SectionHead eyebrow="engagements" title={`Engagements for ${customer.name}`} action={
        <Link href="/admin/clients/new" className="ih-btn ih-btn-accent ih-btn-sm" style={{ textDecoration: "none" }}>
          <Icon name="plus" size={11} /> New engagement
        </Link>
      } />
      {customer.engagementIds.length === 0 ? (
        <EmptyState icon="handshake" title="No engagements yet" description="Spin one up to start tracking proposals, retainers, or audits." />
      ) : (
        <div className="ih-card" style={{ padding: 0 }}>
          {customer.engagementIds.map((id, i) => (
            <Link key={id} href={`/admin/clients/${id}`} style={{
              display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 14, padding: "14px 18px",
              borderTop: i === 0 ? "0" : "1px solid var(--ih-line)", alignItems: "center",
              textDecoration: "none", color: "var(--ih-ink)",
            }}>
              <span className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)" }}>/{id}</span>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 500 }}>Engagement {id.replace("c-", "").replace(/-/g, " ")}</div>
                <div className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-50)", marginTop: 2 }}>open in engagement hub</div>
              </div>
              <Icon name="arrowUpRight" size={13} style={{ color: "var(--ih-ink-40)" }} />
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

function ActivityTab({ customer }: { customer: Customer }) {
  return (
    <div>
      <SectionHead eyebrow="timeline" title={`Activity for ${customer.name}`} />
      <div style={{ position: "relative", paddingLeft: 22 }}>
        <div style={{ position: "absolute", left: 7, top: 6, bottom: 6, width: 1, background: "var(--ih-line-2)" }} />
        {customer.recentActivity.map((it, i) => {
          const node = (
            <div style={{ position: "relative", paddingBottom: 16 }}>
              <span className={`ih-dot ih-dot-${it.tone}`} style={{ position: "absolute", left: -22, top: 5, width: 8, height: 8, borderRadius: 4, boxShadow: "0 0 0 3px var(--ih-bg)" }} />
              <div className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)", marginBottom: 4 }}>{it.date}</div>
              <div style={{ fontSize: 13, color: "var(--ih-ink)", lineHeight: 1.5 }}>{it.text}</div>
            </div>
          )
          return it.href
            ? <Link key={i} href={it.href} style={{ display: "block", textDecoration: "none", color: "inherit" }}>{node}</Link>
            : <div key={i}>{node}</div>
        })}
      </div>
    </div>
  )
}

function ContactsTab({ customer, onEmail }: { customer: Customer; onEmail: (contactEmail: string, contactName: string) => void }) {
  return (
    <div>
      <SectionHead eyebrow="contacts" title={`Contacts at ${customer.name} (${customer.contacts.length})`} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
        {customer.contacts.map(c => (
          <div key={c.id} className="ih-card" style={{ padding: 14 }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
              <div className="ih-avatar ih-avatar-lg" style={{ background: "var(--ih-surface-2)", color: "var(--ih-ink)", fontFamily: "var(--ih-font-serif)", fontStyle: "italic" }}>
                {c.name.split(" ").map(s => s[0]).slice(0, 2).join("")}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 13.5, fontWeight: 500 }}>{c.name}</span>
                  {c.isPrimary && <span className="ih-pill ih-pill-accent" style={{ fontSize: 8, padding: "1px 5px" }}>PRIMARY</span>}
                </div>
                <span className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-50)" }}>{c.role}</span>
              </div>
            </div>
            <div style={{ fontSize: 12, color: "var(--ih-ink-65)", display: "flex", flexDirection: "column", gap: 4, marginBottom: 12 }}>
              <span><Icon name="mail" size={11} /> {c.email}</span>
              <span className="ih-mono"><Icon name="phone" size={11} /> {c.phone}</span>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button className="ih-btn ih-btn-ghost ih-btn-sm" style={{ flex: 1 }} onClick={() => onEmail(c.email, c.name)}>
                <Icon name="mail" size={11} /> Email
              </button>
              <a href={`tel:${c.phone}`} className="ih-btn ih-btn-quiet ih-btn-sm" style={{ flex: 1, textDecoration: "none", justifyContent: "center" }}>
                <Icon name="phone" size={11} /> Call
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function InvoicesTab({ customer }: { customer: Customer }) {
  return (
    <div>
      <SectionHead eyebrow="invoices" title={`Invoices for ${customer.name}`} />
      {customer.invoiceIds.length === 0 ? (
        <EmptyState icon="invoice" title="No invoices yet" description="Invoices issued against this customer will appear here." />
      ) : (
        <div className="ih-card" style={{ padding: 0 }}>
          <div style={{ display: "grid", gridTemplateColumns: "120px 1fr 80px", gap: 10, padding: "10px 16px", borderBottom: "1px solid var(--ih-line)" }}>
            {["Number", "Reference", "Status"].map(h => (
              <div key={h} className="ih-mono" style={{ fontSize: 9, color: "var(--ih-ink-40)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{h}</div>
            ))}
          </div>
          {customer.invoiceIds.map((id, i) => (
            <Link key={id} href={`/admin/payments/${id}`} style={{
              display: "grid", gridTemplateColumns: "120px 1fr 80px", gap: 10, padding: "12px 16px",
              borderTop: i === 0 ? "0" : "1px solid var(--ih-line)", textDecoration: "none",
              color: "var(--ih-ink)", alignItems: "center",
            }}>
              <span className="ih-mono" style={{ fontSize: 11, fontWeight: 600 }}>{id}</span>
              <span style={{ fontSize: 12.5 }}>Invoice {id}</span>
              <span className="ih-pill" style={{ fontSize: 9, justifySelf: "start" }}>OPEN</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

function NotesTab({ customer }: { customer: Customer }) {
  const [draft, setDraft] = useState("")
  const [notes, setNotes] = useState<Array<{ id: string; text: string; when: string; by: string }>>([
    { id: "n-base", text: customer.notes, when: "pinned", by: "luke" },
  ])
  function save() {
    if (!draft.trim()) return
    setNotes(prev => [{ id: `n-${prev.length}`, text: draft, when: "just now", by: "luke" }, ...prev])
    setDraft("")
  }
  return (
    <div>
      <SectionHead eyebrow="notes" title={`Notes (${notes.length})`} />
      <div className="ih-card" style={{ padding: 14, marginBottom: 14 }}>
        <textarea
          value={draft}
          onChange={e => setDraft(e.target.value)}
          placeholder="Add a note…"
          className="ih-input"
          rows={3}
          style={{ width: "100%", fontSize: 13, resize: "vertical", padding: 10, lineHeight: 1.55 }}
        />
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
          <button className="ih-btn ih-btn-accent ih-btn-sm" disabled={!draft.trim()} onClick={save}>
            <Icon name="plus" size={11} /> Save note
          </button>
        </div>
      </div>
      <div style={{ display: "grid", gap: 10 }}>
        {notes.map(n => (
          <div key={n.id} className="ih-card" style={{ padding: 14 }}>
            <div className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)", marginBottom: 6 }}>{n.by} · {n.when}</div>
            <div style={{ fontSize: 13, lineHeight: 1.55 }}>{n.text}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Shared bits ─────────────────────────────────────────────────────────── */

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

function EmptyState({ icon, title, description }: { icon: IconName; title: string; description: string }) {
  return (
    <div className="ih-card" style={{ padding: 40, textAlign: "center" }}>
      <Icon name={icon} size={28} style={{ color: "var(--ih-ink-30)", marginBottom: 10 }} />
      <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 12, color: "var(--ih-ink-50)" }}>{description}</div>
    </div>
  )
}

/* ── Page ────────────────────────────────────────────────────────────────── */

export default function CustomerDetailPage({ params }: PageProps) {
  const { id } = use(params)
  const router = useRouter()
  const customer = useMemo(() => mockCustomers.getById(id), [id])
  const [tab, setTab] = useState<Tab>("overview")

  const [toast, setToast] = useState<{ message: string; tone?: ToastTone } | null>(null)
  const [emailDraft, setEmailDraft] = useState<{ to: string; subject: string; body: string } | null>(null)
  const [archiveOpen, setArchiveOpen] = useState(false)
  const [mergeOpen, setMergeOpen] = useState(false)
  const [mergeTarget, setMergeTarget] = useState<Customer | null>(null)

  if (!customer) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <div style={{ fontSize: 14, marginBottom: 10 }}>Customer not found.</div>
        <Link href="/admin/customers" className="ih-btn ih-btn-accent ih-btn-sm" style={{ textDecoration: "none" }}>
          <Icon name="chevronLeft" size={11} /> Back to customers
        </Link>
      </div>
    )
  }

  const atRisk = customer.openInvoices > 0 && customer.status !== "ACTIVE"
  const titleWords = customer.name.split(" ")
  const titleLast = titleWords[titleWords.length - 1]
  const titleRest = titleWords.slice(0, -1).join(" ")

  function openEmail(to: string, name: string) {
    setEmailDraft({
      to,
      subject: `Re: ${customer!.recentActivity[0]?.text ?? "Catching up"}`,
      body: `Hi ${name.split(" ")[0]},\n\n`,
    })
  }

  const TABS: Array<{ id: Tab; label: string }> = [
    { id: "overview",    label: "Overview" },
    { id: "engagements", label: `Engagements (${customer.engagementIds.length})` },
    { id: "activity",    label: "Activity" },
    { id: "contacts",    label: `Contacts (${customer.contacts.length})` },
    { id: "invoices",    label: `Invoices (${customer.invoiceIds.length})` },
    { id: "notes",       label: "Notes" },
  ]

  return (
    <div style={{ margin: "-24px -24px" }}>
      {/* Full-bleed header */}
      <div style={{ padding: "22px 28px 18px", borderBottom: "1px solid var(--ih-line)", background: atRisk ? "rgba(192,57,43,0.025)" : "var(--ih-bg)" }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
          <Link href="/admin/customers" className="ih-btn ih-btn-quiet ih-btn-sm" style={{ padding: "2px 6px", textDecoration: "none" }}>
            <Icon name="chevronLeft" size={12} /> Customers
          </Link>
          <span className="ih-eyebrow">/{customer.id} · customer</span>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 24 }}>
          <div style={{ display: "flex", gap: 18, alignItems: "flex-end" }}>
            <div className="ih-avatar" style={{ width: 72, height: 72, borderRadius: 14, fontSize: 26, background: atRisk ? "var(--ih-danger-soft)" : "var(--ih-surface-2)", color: atRisk ? "var(--ih-danger)" : "var(--ih-ink)", fontFamily: "var(--ih-font-serif)", fontStyle: "italic" }}>
              {customer.initials}
            </div>
            <div>
              <h1 className="ih-serif" style={{ margin: 0, fontSize: 36, lineHeight: 1 }}>
                {titleRest}{titleRest && " "}
                <span className="ih-italic-red">{titleLast}</span>
              </h1>
              <div style={{ marginTop: 8, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <span className={`ih-pill ${STATUS_META[customer.status].tone !== "muted" ? `ih-pill-${STATUS_META[customer.status].tone}` : ""}`} style={{ fontSize: 9 }}>
                  {STATUS_META[customer.status].label}
                </span>
                <span className="ih-pill" style={{ fontSize: 9 }}>{customer.industry}</span>
                {atRisk && <span className="ih-pill ih-pill-danger" style={{ fontSize: 9 }}>AT RISK · {customer.openInvoices} open</span>}
                {customer.tags.map(t => <span key={t} className="ih-pill" style={{ fontSize: 9, textTransform: "lowercase" }}>#{t}</span>)}
              </div>
              <div style={{ marginTop: 10, display: "flex", gap: 16, fontSize: 11.5, color: "var(--ih-ink-50)" }}>
                <span><Icon name="user" size={10} /> {customer.primaryContact.name}</span>
                <span><Icon name="mail" size={10} /> {customer.primaryContact.email}</span>
                <span className="ih-mono"><Icon name="phone" size={10} /> {customer.primaryContact.phone}</span>
                <span><Icon name="clock" size={10} /> Customer since {customer.since}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <button className="ih-btn ih-btn-ghost ih-btn-sm" onClick={() => openEmail(customer.primaryContact.email, customer.primaryContact.name)}>
              <Icon name="mail" size={11} /> Email
            </button>
            <button className="ih-btn ih-btn-ghost ih-btn-sm" onClick={() => setToast({ message: `Schedule call with ${customer.primaryContact.name}`, tone: "info" })}>
              <Icon name="calendar" size={11} /> Schedule
            </button>
            <button className="ih-btn ih-btn-accent ih-btn-sm" onClick={() => { setToast({ message: "Engagement draft created", tone: "ok" }); router.push("/admin/clients/new") }}>
              <Icon name="plus" size={11} /> New engagement
            </button>
            <Popover align="right" width={200} trigger={
              <button className="ih-btn ih-btn-quiet ih-btn-icon" style={{ height: 30, width: 30 }}>
                <Icon name="moreH" size={12} />
              </button>
            }>{(close) => (
              <>
                <PopoverHeader>More</PopoverHeader>
                <PopoverItem onClick={() => { setToast({ message: "Edit mode (coming via form)", tone: "info" }); close() }}>Edit details</PopoverItem>
                <PopoverItem onClick={() => { setMergeOpen(true); close() }}>Merge with…</PopoverItem>
                <PopoverItem onClick={() => { setToast({ message: `Owner change panel for ${customer.name}`, tone: "info" }); close() }}>Reassign owner</PopoverItem>
                <div style={{ height: 1, background: "var(--ih-line)", margin: "4px 0" }} />
                <PopoverItem danger onClick={() => { setArchiveOpen(true); close() }}>Archive customer</PopoverItem>
              </>
            )}</Popover>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ padding: "0 28px", display: "flex", gap: 0, borderBottom: "1px solid var(--ih-line)", background: "var(--ih-bg)", position: "sticky", top: 0, zIndex: 2 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            background: "transparent", border: 0, padding: "12px 14px", fontSize: 12.5,
            color: tab === t.id ? "var(--ih-ink)" : "var(--ih-ink-50)",
            fontWeight: tab === t.id ? 500 : 400, cursor: "pointer",
            borderBottom: tab === t.id ? "2px solid var(--ih-accent)" : "2px solid transparent",
            marginBottom: -1,
          }}>{t.label}</button>
        ))}
      </div>

      {/* Body — lazy render the active tab only */}
      <div style={{ padding: "24px 28px 48px" }}>
        {tab === "overview"    && <OverviewTab    customer={customer} />}
        {tab === "engagements" && <EngagementsTab customer={customer} />}
        {tab === "activity"    && <ActivityTab    customer={customer} />}
        {tab === "contacts"    && <ContactsTab    customer={customer} onEmail={openEmail} />}
        {tab === "invoices"    && <InvoicesTab    customer={customer} />}
        {tab === "notes"       && <NotesTab       customer={customer} />}
      </div>

      {/* Email dialog */}
      {emailDraft && (
        <EmailDraftDialog
          open
          onClose={() => setEmailDraft(null)}
          to={emailDraft.to}
          subject={emailDraft.subject}
          body={emailDraft.body}
          onSend={() => { setToast({ message: `Email sent to ${emailDraft.to}`, tone: "ok" }); setEmailDraft(null) }}
        />
      )}

      {/* Archive confirm */}
      <ConfirmDialog
        open={archiveOpen}
        title={`Archive ${customer.name}?`}
        description="The customer will be hidden from lists but retained for audit. You can restore later from settings."
        confirmLabel="Archive"
        onConfirm={() => { setToast({ message: `Archived ${customer.name}`, tone: "warn" }); setArchiveOpen(false) }}
        onCancel={() => setArchiveOpen(false)}
      />

      {/* Merge picker dialog */}
      {mergeOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9990, background: "rgba(14,16,19,0.3)" }} onClick={() => setMergeOpen(false)}>
          <div className="animate-pop-in" onClick={e => e.stopPropagation()} style={{
            position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", zIndex: 9991,
            width: 360, background: "var(--ih-surface)", border: "1px solid var(--ih-line)",
            borderRadius: "var(--ih-r-md)", boxShadow: "0 16px 48px rgba(0,0,0,0.12)",
          }}>
            <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--ih-line)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>Merge {customer.name} into…</span>
              <button className="ih-btn ih-btn-quiet ih-btn-icon" style={{ height: 22, width: 22 }} onClick={() => setMergeOpen(false)}><Icon name="x" size={11} /></button>
            </div>
            <div style={{ padding: 6, maxHeight: 360, overflowY: "auto" }}>
              {mockCustomers.list().filter(c => c.id !== customer.id).map(o => (
                <PopoverItem key={o.id} onClick={() => { setMergeTarget(o); setMergeOpen(false) }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div className="ih-avatar" style={{ width: 20, height: 20, fontSize: 9 }}>{o.initials}</div>
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <span>{o.name}</span>
                      <span className="ih-mono" style={{ fontSize: 9, color: "var(--ih-ink-40)" }}>{o.primaryContact.email}</span>
                    </div>
                  </div>
                </PopoverItem>
              ))}
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!mergeTarget}
        title={mergeTarget ? `Merge ${customer.name} into ${mergeTarget.name}?` : ""}
        description="All engagements, bookings, invoices, and notes will move to the target customer. The source record will be archived."
        confirmLabel="Merge"
        onConfirm={() => {
          if (!mergeTarget) return
          setToast({ message: `Merged ${customer.name} → ${mergeTarget.name}`, tone: "ok" })
          setMergeTarget(null)
          router.push(`/admin/customers/${mergeTarget.id}`)
        }}
        onCancel={() => setMergeTarget(null)}
      />

      {toast && <NotificationToast message={toast.message} tone={toast.tone} onDismiss={() => setToast(null)} />}
    </div>
  )
}
