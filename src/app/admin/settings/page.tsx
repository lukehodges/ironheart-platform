"use client"

import { useState } from "react"
import { Icon, type IconName } from "@/components/shell"
import { NotificationToast, InlineFormRow, DropdownMenu, ConfirmDialog } from "@/components/shared"

/* ── Data ────────────────────────────────────────────────────────────────── */

const TABS = ["General", "Team", "Integrations", "Billing", "Modules"]

type TeamMember = { initials: string; name: string; email: string; role: string; roleTone: string }
const TEAM: TeamMember[] = [
  { initials: "LH", name: "Luke Hodges", email: "luke@ironheart.co", role: "Owner", roleTone: "accent" },
  { initials: "SP", name: "Sarah Palmer", email: "sarah@ironheart.co", role: "Admin", roleTone: "info" },
  { initials: "JR", name: "James Reid", email: "james@ironheart.co", role: "Member", roleTone: "muted" },
]

type Integration = { name: string; icon: IconName; connected: boolean; description: string }
const INTEGRATIONS: Integration[] = [
  { name: "Stripe", icon: "money", connected: true, description: "Payment processing and invoicing" },
  { name: "WorkOS", icon: "shield", connected: true, description: "Authentication and SSO" },
  { name: "Google Calendar", icon: "calendar", connected: true, description: "Booking sync and scheduling" },
  { name: "Plane.so", icon: "target", connected: true, description: "Project management and issues" },
  { name: "Google Drive", icon: "folder", connected: true, description: "Document storage and sharing" },
  { name: "Zoho Books", icon: "invoice", connected: false, description: "Accounting and bookkeeping" },
]

type Module = { name: string; slug: string; description: string; enabled: boolean }
const MODULES: Module[] = [
  { name: "Bookings", slug: "bookings", description: "Scheduling and appointment management", enabled: true },
  { name: "Pipeline", slug: "pipeline", description: "Deal tracking and sales funnel", enabled: true },
  { name: "Workflows", slug: "workflows", description: "Automation engine and triggers", enabled: true },
  { name: "Forms", slug: "forms", description: "Questionnaires and intake forms", enabled: true },
  { name: "Reviews", slug: "reviews", description: "Client feedback and NPS tracking", enabled: true },
  { name: "Invoicing", slug: "invoicing", description: "Invoice generation and payments", enabled: true },
  { name: "Analytics", slug: "analytics", description: "Business intelligence dashboards", enabled: true },
  { name: "Audit", slug: "audit", description: "Activity logging and compliance", enabled: false },
]

/* ── Sub-components ──────────────────────────────────────────────────────── */

function FormField({ label, value, type = "text" }: { label: string; value: string; type?: string }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: "block", fontSize: 11, fontWeight: 500, color: "var(--ih-ink-65)", marginBottom: 6, fontFamily: "var(--ih-font-mono)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</label>
      {type === "select" ? (
        <select className="ih-input" defaultValue={value} style={{ appearance: "none", cursor: "pointer" }}>
          <option>{value}</option>
        </select>
      ) : (
        <input className="ih-input" defaultValue={value} type={type} />
      )}
    </div>
  )
}

function GeneralTab() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
      <div className="ih-card ih-card-pad">
        <div className="ih-eyebrow" style={{ marginBottom: 14 }}>Business details</div>
        <FormField label="Business name" value="The Ironheart Ltd" />
        <FormField label="Primary email" value="hello@ironheart.co" type="email" />
        <FormField label="Phone" value="+44 7700 900123" type="tel" />
        <FormField label="Website" value="https://ironheart.co" type="url" />
      </div>
      <div className="ih-card ih-card-pad">
        <div className="ih-eyebrow" style={{ marginBottom: 14 }}>Preferences</div>
        <FormField label="Timezone" value="Europe/London (GMT+1)" type="select" />
        <FormField label="Currency" value="GBP (\u00a3)" type="select" />
        <FormField label="Date format" value="DD/MM/YYYY" type="select" />
        <FormField label="Week starts on" value="Monday" type="select" />
      </div>
    </div>
  )
}

function TeamTab() {
  const [showInvite, setShowInvite] = useState(false)
  const [teamList, setTeamList] = useState(TEAM)
  const [toast, setToast] = useState<{message: string; tone?: string} | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmTarget, setConfirmTarget] = useState<TeamMember | null>(null)

  return (
    <div className="ih-card" style={{ overflow: "hidden" }}>
      <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--ih-line)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <span className="ih-eyebrow">Team members</span>
          <h3 style={{ margin: "2px 0 0", fontSize: 15, fontWeight: 600 }}>{teamList.length} people</h3>
        </div>
        <button className="ih-btn ih-btn-primary ih-btn-sm" onClick={() => setShowInvite(true)}><Icon name="plus" size={12}/> Invite</button>
      </div>
      {showInvite && (
        <div style={{ padding: "12px 18px", borderBottom: "1px solid var(--ih-line)" }}>
          <InlineFormRow
            fields={[
              { key: "name", label: "Name", type: "text", placeholder: "Full name" },
              { key: "email", label: "Email", type: "text", placeholder: "email@company.co" },
              { key: "role", label: "Role", type: "select", options: [{ label: "Admin", value: "Admin" }, { label: "Member", value: "Member" }, { label: "Viewer", value: "Viewer" }] },
            ]}
            onSave={(vals) => {
              setTeamList(prev => [...prev, { initials: vals.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase(), name: vals.name, email: vals.email, role: vals.role || "Member", roleTone: "muted" }])
              setShowInvite(false)
              setToast({ message: `Invite sent to ${vals.email}`, tone: "ok" })
            }}
            onCancel={() => setShowInvite(false)}
          />
        </div>
      )}
      {teamList.map((m, i) => (
        <div key={m.email} style={{ padding: "12px 18px", borderTop: i === 0 && !showInvite ? "0" : "1px solid var(--ih-line)", display: "flex", alignItems: "center", gap: 12 }}>
          <div className="ih-avatar" style={{ width: 32, height: 32, fontSize: 11 }}>{m.initials}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 500 }}>{m.name}</div>
            <div className="ih-mono" style={{ fontSize: 11, color: "var(--ih-ink-40)" }}>{m.email}</div>
          </div>
          <span className={`ih-pill ih-pill-${m.roleTone}`} style={{ fontSize: 9, padding: "2px 6px" }}>{m.role}</span>
          <DropdownMenu
            trigger={<button className="ih-btn ih-btn-quiet ih-btn-icon" style={{ height: 24, width: 24 }}><Icon name="moreH" size={12}/></button>}
            items={[
              { label: "Edit role", onClick: () => setToast({ message: `Role editor opened for ${m.name}`, tone: "info" }) },
              { label: "Remove", danger: true, onClick: () => { setConfirmTarget(m); setConfirmOpen(true) } },
            ]}
          />
        </div>
      ))}
      {toast && <NotificationToast message={toast.message} tone={toast.tone as "ok" | "info"} onDismiss={() => setToast(null)} />}
      <ConfirmDialog
        open={confirmOpen}
        title={`Remove ${confirmTarget?.name}?`}
        description="This will revoke their access to the workspace."
        confirmLabel="Remove"
        onConfirm={() => { setTeamList(prev => prev.filter(m => m.email !== confirmTarget?.email)); setConfirmOpen(false); setToast({ message: `${confirmTarget?.name} removed`, tone: "warn" }) }}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  )
}

function IntegrationsTab() {
  const [connections, setConnections] = useState<Record<string, boolean>>(
    () => Object.fromEntries(INTEGRATIONS.map(i => [i.name, i.connected]))
  )
  const [configOpen, setConfigOpen] = useState<string | null>(null)
  const [apiKeyInput, setApiKeyInput] = useState("")
  const [toast, setToast] = useState<{message: string; tone?: string} | null>(null)

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
        {INTEGRATIONS.map((int) => {
          const isConnected = connections[int.name] ?? int.connected
          return (
            <div key={int.name} className="ih-card" style={{ padding: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: "var(--ih-r-md)", background: isConnected ? "var(--ih-ok-soft)" : "var(--ih-surface-2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Icon name={int.icon} size={15} style={{ color: isConnected ? "var(--ih-ok)" : "var(--ih-ink-40)" }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{int.name}</div>
                  </div>
                </div>
                {isConnected ? (
                  <span className="ih-pill ih-pill-ok" style={{ fontSize: 9, padding: "2px 6px" }}><Icon name="check" size={8}/> Connected</span>
                ) : (
                  <span className="ih-pill" style={{ fontSize: 9, padding: "2px 6px" }}>Not connected</span>
                )}
              </div>
              <p style={{ margin: "0 0 12px", fontSize: 12, color: "var(--ih-ink-65)", lineHeight: 1.5 }}>{int.description}</p>
              <button className={`ih-btn ${isConnected ? "ih-btn-ghost" : "ih-btn-primary"} ih-btn-sm`} style={{ width: "100%" }} onClick={() => { setConfigOpen(int.name); setApiKeyInput("") }}>
                {isConnected ? "Configure" : "Connect"}
              </button>
            </div>
          )
        })}
      </div>
      {/* Integration config dialog */}
      {configOpen && (() => {
        const isConnected = connections[configOpen] ?? false
        return (
          <>
            <div style={{ position: "fixed", inset: 0, zIndex: 9990, background: "rgba(14,16,19,0.3)" }} onClick={() => setConfigOpen(null)} />
            <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", zIndex: 9991, width: "100%", maxWidth: 420, background: "var(--ih-surface)", border: "1px solid var(--ih-line)", borderRadius: 12, boxShadow: "0 16px 48px rgba(0,0,0,0.12)", overflow: "hidden" }}>
              <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--ih-line)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 14, fontWeight: 600 }}>{configOpen} {isConnected ? "Configuration" : "Setup"}</span>
                <button className="ih-btn ih-btn-quiet ih-btn-sm" onClick={() => setConfigOpen(null)}><Icon name="x" size={12} /></button>
              </div>
              <div style={{ padding: "16px 18px" }}>
                {isConnected ? (
                  <>
                    <div style={{ marginBottom: 14 }}>
                      <label style={{ display: "block", fontSize: 10, fontFamily: "var(--ih-font-mono)", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--ih-ink-50)", marginBottom: 4 }}>API Key</label>
                      <input className="ih-input" readOnly value="sk_live_****...****7f2a" style={{ width: "100%", fontSize: 13 }} />
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button className="ih-btn ih-btn-ghost ih-btn-sm" onClick={() => setToast({ message: `${configOpen} settings saved`, tone: "ok" })}>Save</button>
                      <button className="ih-btn ih-btn-quiet ih-btn-sm" style={{ color: "var(--ih-warn)" }} onClick={() => { setConnections(prev => ({ ...prev, [configOpen]: false })); setConfigOpen(null); setToast({ message: `${configOpen} disconnected`, tone: "warn" }) }}>Disconnect</button>
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ marginBottom: 14 }}>
                      <label style={{ display: "block", fontSize: 10, fontFamily: "var(--ih-font-mono)", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--ih-ink-50)", marginBottom: 4 }}>API Key</label>
                      <input className="ih-input" value={apiKeyInput} onChange={e => setApiKeyInput(e.target.value)} placeholder="Enter your API key..." style={{ width: "100%", fontSize: 13 }} />
                    </div>
                    <button className="ih-btn ih-btn-accent ih-btn-sm" onClick={() => { setConnections(prev => ({ ...prev, [configOpen]: true })); setConfigOpen(null); setToast({ message: `${configOpen} connected successfully`, tone: "ok" }) }}>Connect</button>
                  </>
                )}
              </div>
            </div>
          </>
        )
      })()}
      {toast && <NotificationToast message={toast.message} tone={toast.tone as "ok" | "warn"} onDismiss={() => setToast(null)} />}
    </>
  )
}

function ModulesTab() {
  const [enabledModules, setEnabledModules] = useState<Set<string>>(
    () => new Set(MODULES.filter(m => m.enabled).map(m => m.slug))
  )

  const toggleModule = (slug: string) => {
    setEnabledModules(prev => {
      const next = new Set(prev)
      if (next.has(slug)) next.delete(slug)
      else next.add(slug)
      return next
    })
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
      {MODULES.map((mod) => {
        const isEnabled = enabledModules.has(mod.slug)
        return (
          <div key={mod.slug} className="ih-card" style={{ padding: "14px 18px", display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{mod.name}</div>
              <div style={{ fontSize: 11.5, color: "var(--ih-ink-50)", marginTop: 2 }}>{mod.description}</div>
            </div>
            {/* Toggle */}
            <div onClick={() => toggleModule(mod.slug)} style={{
              width: 36, height: 20, borderRadius: 10, cursor: "pointer",
              background: isEnabled ? "var(--ih-ok)" : "var(--ih-surface-3)",
              padding: 2, transition: "background 0.2s",
            }}>
              <div style={{
                width: 16, height: 16, borderRadius: 8,
                background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
                transform: isEnabled ? "translateX(16px)" : "translateX(0)",
                transition: "transform 0.2s",
              }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ── Page ─────────────────────────────────────────────────────────────────── */

export default function SettingsPage() {
  const [tab, setTab] = useState(0)

  const TAB_CONTENT = [GeneralTab, TeamTab, IntegrationsTab, () => (
    <div className="ih-card ih-card-pad" style={{ textAlign: "center", padding: 48 }}>
      <Icon name="money" size={24} style={{ color: "var(--ih-ink-30)", marginBottom: 12 }} />
      <div className="ih-serif" style={{ fontSize: 20, marginBottom: 8 }}>Billing & subscription</div>
      <p style={{ margin: 0, fontSize: 12, color: "var(--ih-ink-50)" }}>Manage your plan, payment methods, and billing history.</p>
      <button className="ih-btn ih-btn-ghost ih-btn-sm" style={{ marginTop: 16 }} onClick={() => window.open("https://billing.stripe.com/demo", "_blank")}>Open billing portal <Icon name="arrowUpRight" size={11}/></button>
    </div>
  ), ModulesTab]

  const ActiveTab = TAB_CONTENT[tab]

  return (
    <div style={{ padding: "24px 28px 48px", maxWidth: 1200, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div className="ih-eyebrow" style={{ marginBottom: 8 }}>Settings &middot; workspace</div>
        <h1 className="ih-serif" style={{ margin: 0, fontSize: 38, lineHeight: 0.98 }}>
          The Ironheart <span className="ih-italic-red">Ltd</span>
        </h1>
        <div style={{ fontSize: 12, color: "var(--ih-ink-50)", marginTop: 8 }}>Manage your workspace, team, integrations, and modules.</div>
      </div>

      {/* Tab bar */}
      <div style={{ display: "flex", gap: 0, borderBottom: "1px solid var(--ih-line)", marginBottom: 24 }}>
        {TABS.map((t, i) => (
          <button key={t} onClick={() => setTab(i)} style={{
            background: "transparent", border: 0, padding: "12px 16px", fontSize: 13,
            color: tab === i ? "var(--ih-ink)" : "var(--ih-ink-50)",
            fontWeight: tab === i ? 500 : 400, cursor: "pointer",
            borderBottom: tab === i ? "2px solid var(--ih-accent)" : "2px solid transparent",
            marginBottom: -1,
          }}>{t}</button>
        ))}
      </div>

      {/* Tab content */}
      <ActiveTab />
    </div>
  )
}
