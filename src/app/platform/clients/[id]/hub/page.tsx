"use client"

import { useState } from "react"
import { Icon } from "@/components/shell"

function SectionHead({ eyebrow, title, action }: { eyebrow: string; title: string; action?: React.ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
      <div>
        <span className="ih-eyebrow">{eyebrow}</span>
        <h3 style={{ margin: "2px 0 0", fontSize: 15, fontWeight: 600 }}>{title}</h3>
      </div>
      {action}
    </div>
  )
}

export default function ClientHubPage({ params }: { params: { id: string } }) {
  const [activeTab, setActiveTab] = useState(0)
  const tabs = ["Overview", "Engagements · 1", "Bookings · 14", "Deals · 2", "Invoices · 8", "Workflows · 3", "Documents", "Activity", "Team"]

  return (
    <div style={{ margin: "-24px -24px" }}>
      {/* Hero header — ★ Demo data */}
      <div style={{ padding: "24px 28px 18px", borderBottom: "1px solid var(--ih-line)", display: "grid", gridTemplateColumns: "1fr auto", gap: 24, alignItems: "flex-end" }}>
        <div style={{ display: "flex", gap: 18, alignItems: "flex-end" }}>
          <div className="ih-avatar ih-hatch" style={{ width: 84, height: 84, borderRadius: 16, fontSize: 36, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--ih-surface-2)", border: "1px solid var(--ih-line)" }}>
            <span style={{ fontStyle: "italic", fontFamily: "var(--ih-font-serif)", color: "var(--ih-ink)" }}>N</span>
          </div>
          <div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
              <span className="ih-eyebrow">/cli_204 {"·"} client</span>
              <span className="ih-pill ih-pill-ok"><span className="ih-dot ih-dot-ok"/> Active</span>
              <span className="ih-pill">Q2 retainer</span>
              <span style={{ color: "var(--ih-warn)", fontStyle: "italic", fontSize: 10, fontFamily: "var(--ih-font-sans)" }}>★ Demo data</span>
            </div>
            <h1 className="ih-serif" style={{ margin: 0, fontSize: 44, lineHeight: 0.98 }}>Northwind <span className="ih-italic-red">Co.</span></h1>
            <div style={{ marginTop: 10, display: "flex", gap: 18, fontSize: 11.5, color: "var(--ih-ink-50)" }}>
              <span><Icon name="building" size={11}/> &nbsp;Founder {"·"} Mira Sato</span>
              <span><Icon name="mail" size={11}/> &nbsp;mira@northwind.co</span>
              <span><Icon name="phone" size={11}/> &nbsp;+44 7700 900482</span>
              <span><Icon name="clock" size={11}/> &nbsp;Client since Mar 2025</span>
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 22 }}>
          {([
            ["Lifetime", "£48.2k", "ok"],
            ["This sprint", "32/40h", "accent"],
            ["Open inv.", "£4.2k", "warn"],
            ["Health", "A−", "ok"],
          ] as [string, string, string][]).map(([l, v, t]) => (
            <div key={l}>
              <div className="ih-eyebrow" style={{ marginBottom: 4 }}>{l}</div>
              <div className="ih-serif" style={{ fontSize: 26, lineHeight: 1, color: t === "warn" ? "var(--ih-warn)" : t === "accent" ? "var(--ih-accent)" : "var(--ih-ink)" }}>{v}</div>
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

      {/* Body grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 0 }}>
        <div style={{ padding: "20px 28px 48px", borderRight: "1px solid var(--ih-line)" }}>
          {/* Connection map */}
          <div style={{ marginBottom: 24 }}>
            <SectionHead eyebrow="Connection map" title="Everything tied to this client" action={<button className="ih-btn ih-btn-quiet ih-btn-sm">Expand {"→"}</button>} />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 10 }}>
              {[
                { l: "Engagement", v: "Q2 retainer · sprint 4", icon: "handshake" as const, count: "1 active", tone: "accent" },
                { l: "Bookings", v: "14 total · 2 upcoming", icon: "calendar" as const, count: "next Tue 11:30", tone: "info" },
                { l: "Pipeline", v: "2 open deals", icon: "pipeline" as const, count: "£32k weighted", tone: "muted" },
                { l: "Invoices", v: "8 issued · 1 open", icon: "invoice" as const, count: "£4.2k due", tone: "warn" },
                { l: "Workflows", v: "3 attached · 12 runs", icon: "workflow" as const, count: "all healthy", tone: "ok" },
                { l: "Team", v: "Mira, Sam, you", icon: "users" as const, count: "3 assigned", tone: "muted" },
              ].map((c) => (
                <div key={c.l} className="ih-card" style={{ padding: 12, cursor: "pointer" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <Icon name={c.icon} size={13} style={{ color: c.tone === "accent" ? "var(--ih-accent)" : c.tone === "warn" ? "var(--ih-warn)" : c.tone === "ok" ? "var(--ih-ok)" : c.tone === "info" ? "var(--ih-info)" : "var(--ih-ink-40)" }} />
                    <Icon name="arrowUpRight" size={10} style={{ color: "var(--ih-ink-30)" }} />
                  </div>
                  <div className="ih-eyebrow" style={{ marginBottom: 4 }}>{c.l}</div>
                  <div style={{ fontSize: 12, fontWeight: 500, lineHeight: 1.3, marginBottom: 4 }}>{c.v}</div>
                  <div className="ih-mono" style={{ fontSize: 9.5, color: "var(--ih-ink-40)" }}>{c.count}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Engagement detail card */}
          <div className="ih-card" style={{ marginBottom: 20 }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--ih-line)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <span className="ih-eyebrow">/eng_0481 {"·"} current engagement</span>
                <h3 style={{ margin: "4px 0 0", fontSize: 18, fontFamily: "var(--ih-font-serif)", letterSpacing: "-0.01em" }}>Q2 retainer {"·"} sprint 4 of 6</h3>
              </div>
              <button className="ih-btn ih-btn-ghost ih-btn-sm">Open workspace <Icon name="arrowUpRight" size={11} /></button>
            </div>
            <div style={{ padding: 20 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 6, marginBottom: 18 }}>
                {[1, 2, 3, 4, 5, 6].map(n => (
                  <div key={n} style={{ height: 56, borderRadius: 8, border: "1px solid var(--ih-line)", padding: 10, background: n < 4 ? "var(--ih-surface-2)" : n === 4 ? "var(--ih-accent-soft)" : "transparent", position: "relative" }}>
                    <div className="ih-mono" style={{ fontSize: 9, color: n === 4 ? "var(--ih-accent)" : "var(--ih-ink-40)", textTransform: "uppercase", letterSpacing: "0.1em" }}>SPRINT {n}</div>
                    <div style={{ fontSize: 13, fontWeight: 500, marginTop: 4, color: n > 4 ? "var(--ih-ink-40)" : "var(--ih-ink)" }}>
                      {n < 4 ? "✓ shipped" : n === 4 ? "in progress" : "queued"}
                    </div>
                    {n === 4 && <div style={{ position: "absolute", bottom: 6, left: 10, right: 10, height: 3, background: "rgba(209,58,31,0.2)", borderRadius: 2, overflow: "hidden" }}><div style={{ width: "78%", height: "100%", background: "var(--ih-accent)" }} /></div>}
                  </div>
                ))}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
                <div>
                  <div className="ih-eyebrow" style={{ marginBottom: 8 }}>Deliverables {"·"} 4</div>
                  {([["Stripe → Airtable sync", "ok"], ["Approval workflow", "ok"], ["Client portal v2", "accent"], ["Monthly digest email", "muted"]] as [string, string][]).map(([t, s]) => (
                    <div key={t} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 0", fontSize: 12 }}>
                      <span className={`ih-dot ih-dot-${s}`} /> {t}
                    </div>
                  ))}
                </div>
                <div>
                  <div className="ih-eyebrow" style={{ marginBottom: 8 }}>Recent decisions {"·"} 3</div>
                  <div style={{ fontSize: 11.5, color: "var(--ih-ink-65)", lineHeight: 1.6 }}>
                    <p style={{ margin: "0 0 6px" }}>{"·"} <span className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)" }}>Fri</span> Move portal launch to sprint 5.</p>
                    <p style={{ margin: "0 0 6px" }}>{"·"} <span className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)" }}>Wed</span> Approved scope creep {"·"} +6h budget.</p>
                    <p style={{ margin: "0" }}>{"·"} <span className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)" }}>Mon</span> Sam takes over Stripe sync ownership.</p>
                  </div>
                </div>
                <div>
                  <div className="ih-eyebrow" style={{ marginBottom: 8 }}>Risk {"·"} radar</div>
                  <div style={{ display: "grid", gap: 6 }}>
                    <div style={{ display: "flex", gap: 8, padding: "6px 8px", border: "1px solid var(--ih-line)", borderRadius: 6, fontSize: 11.5 }}>
                      <span className="ih-dot ih-dot-warn" style={{ marginTop: 4 }} />
                      <span><strong>Portal v2 scope</strong> {"·"} 6h over forecast</span>
                    </div>
                    <div style={{ display: "flex", gap: 8, padding: "6px 8px", border: "1px solid var(--ih-line)", borderRadius: 6, fontSize: 11.5 }}>
                      <span className="ih-dot ih-dot-ok" style={{ marginTop: 4 }} />
                      <span><strong>Renewal signal</strong> {"·"} NPS 9 last touch</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bookings + Invoices */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
            <div className="ih-card">
              <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--ih-line)", display: "flex", justifyContent: "space-between" }}>
                <span className="ih-eyebrow">Upcoming bookings</span>
                <button className="ih-btn ih-btn-quiet ih-btn-sm">All 14 {"→"}</button>
              </div>
              {([
                ["Tue 13", "11:30", "Sprint review", "30m · Zoom", "info"],
                ["Wed 14", "09:00", "Stand‑up · Sam", "15m · internal", "muted"],
                ["Fri 16", "15:00", "Stakeholder demo", "45m · Northwind HQ", "accent"],
              ] as [string, string, string, string, string][]).map(([d, t, title, sub, tone], i) => (
                <div key={i} style={{ padding: "10px 16px", borderTop: i === 0 ? "0" : "1px solid var(--ih-line)", display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 12, alignItems: "center" }}>
                  <div style={{ width: 44, textAlign: "center", padding: "4px 0", border: "1px solid var(--ih-line)", borderRadius: 6 }}>
                    <div className="ih-mono" style={{ fontSize: 9, color: "var(--ih-ink-40)", textTransform: "uppercase" }}>{d.split(" ")[0]}</div>
                    <div className="ih-serif" style={{ fontSize: 18, lineHeight: 1 }}>{d.split(" ")[1]}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12.5, fontWeight: 500 }}>{title} <span className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)", marginLeft: 4 }}>{"·"} {t}</span></div>
                    <div className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)", marginTop: 2 }}>{sub}</div>
                  </div>
                  <Icon name="chevronRight" size={11} style={{ color: "var(--ih-ink-30)" }} />
                </div>
              ))}
            </div>
            <div className="ih-card">
              <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--ih-line)", display: "flex", justifyContent: "space-between" }}>
                <span className="ih-eyebrow">Recent invoices</span>
                <button className="ih-btn ih-btn-quiet ih-btn-sm">All 8 {"→"}</button>
              </div>
              {([
                ["/inv_2041", "Q2 · M2 retainer", "£14,200", "Apr 28", "warn", "sent"],
                ["/inv_2027", "Q2 · M1 retainer", "£14,200", "Mar 28", "ok", "paid"],
                ["/inv_2013", "Discovery sprint", "£ 8,400", "Mar 03", "ok", "paid"],
                ["/inv_1991", "Onboarding setup", "£ 2,400", "Feb 14", "ok", "paid"],
              ] as [string, string, string, string, string, string][]).map(([id, label, amt, when, tone, status], i) => (
                <div key={id} style={{ padding: "10px 16px", borderTop: i === 0 ? "0" : "1px solid var(--ih-line)", display: "grid", gridTemplateColumns: "auto 1fr auto auto", gap: 10, alignItems: "center" }}>
                  <span className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)" }}>{id}</span>
                  <div>
                    <div style={{ fontSize: 12.5, fontWeight: 500 }}>{label}</div>
                    <div className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)", marginTop: 2 }}>{when}</div>
                  </div>
                  <span className={`ih-pill ih-pill-${tone === "warn" ? "warn" : "ok"}`} style={{ fontSize: 9 }}>{status}</span>
                  <span className="ih-mono" style={{ fontSize: 12, fontWeight: 500 }}>{amt}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Workflows */}
          <div className="ih-card">
            <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--ih-line)", display: "flex", justifyContent: "space-between" }}>
              <span className="ih-eyebrow">Workflows attached {"·"} this client</span>
              <button className="ih-btn ih-btn-quiet ih-btn-sm">Attach more {"→"}</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 0 }}>
              {([
                ["Onboarding · Northwind", "Triggered on new booking", "12 runs · 100% ok", "ok", "/wf_204"],
                ["Invoice → Stripe sync", "Hourly · paid sync", "186 runs · 1 paused", "warn", "/wf_887"],
                ["Monthly digest", "1st of month · 09:00", "3 runs · all sent", "ok", "/wf_310"],
              ] as [string, string, string, string, string][]).map(([t, sub, runs, tone, id], i) => (
                <div key={id} style={{ padding: 16, borderLeft: i === 0 ? "0" : "1px solid var(--ih-line)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)" }}>{id}</span>
                    <span className={`ih-dot ih-dot-${tone}`} />
                  </div>
                  <div style={{ fontSize: 12.5, fontWeight: 500 }}>{t}</div>
                  <div style={{ fontSize: 11, color: "var(--ih-ink-65)", marginTop: 4 }}>{sub}</div>
                  <div className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)", marginTop: 8 }}>{runs}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right rail */}
        <div style={{ padding: "20px 20px 48px", background: "var(--ih-surface-2)" }}>
          <div className="ih-eyebrow" style={{ marginBottom: 14 }}>Right rail {"·"} contextual</div>

          {/* Contacts */}
          <div className="ih-card" style={{ marginBottom: 12, background: "var(--ih-surface)" }}>
            <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--ih-line)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span className="ih-eyebrow">Contacts {"·"} 4</span>
              <button className="ih-btn ih-btn-quiet ih-btn-sm" style={{ height: 22, padding: "0 6px" }}><Icon name="plus" size={11} /></button>
            </div>
            {([
              ["Mira Sato", "Founder · primary", "green"],
              ["Sam Park", "Ops lead", "muted"],
              ["Lara Kim", "Finance", "muted"],
              ["Jamie F.", "Engineering", "muted"],
            ] as [string, string, string][]).map(([n, r, t]) => (
              <div key={n} style={{ padding: "8px 14px", display: "flex", gap: 10, alignItems: "center", borderTop: "1px solid var(--ih-line)" }}>
                <div className="ih-avatar" style={{ width: 24, height: 24, fontSize: 9 }}>{n.split(" ").map(w => w[0]).join("")}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 500 }}>{n}</div>
                  <div className="ih-mono" style={{ fontSize: 9.5, color: "var(--ih-ink-40)" }}>{r}</div>
                </div>
                {t === "green" && <span className="ih-dot ih-dot-ok" />}
              </div>
            ))}
          </div>

          {/* AI summary */}
          <div className="ih-card ih-card-pad" style={{ marginBottom: 12, background: "var(--ih-ink)", color: "#fff", padding: 16, borderColor: "transparent" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
              <Icon name="sparkles" size={13} style={{ color: "#fff" }} />
              <span className="ih-eyebrow" style={{ color: "rgba(255,255,255,0.6)" }}>Copilot {"·"} this client</span>
            </div>
            <p style={{ margin: 0, fontSize: 12, lineHeight: 1.55, color: "rgba(255,255,255,0.85)" }}>
              Sprint 4 is <strong style={{ color: "#fff" }}>78% complete</strong> and 6h over forecast. Mira&apos;s last touch was a NPS 9 &mdash; good renewal window. Outstanding invoice is 14 days old; I drafted a friendly chase ready to send.
            </p>
            <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
              <button className="ih-btn ih-btn-sm" style={{ background: "rgba(255,255,255,0.15)", color: "#fff" }}>Send chase</button>
              <button className="ih-btn ih-btn-sm" style={{ background: "transparent", color: "rgba(255,255,255,0.7)", borderColor: "rgba(255,255,255,0.2)" }}>Draft renewal</button>
            </div>
          </div>

          {/* Pinned notes */}
          <div className="ih-card" style={{ marginBottom: 12, background: "var(--ih-surface)" }}>
            <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--ih-line)" }}>
              <span className="ih-eyebrow">Pinned {"·"} 2</span>
            </div>
            <div style={{ padding: "12px 14px" }}>
              <div style={{ fontSize: 12, lineHeight: 1.5, paddingBottom: 10, marginBottom: 10, borderBottom: "1px solid var(--ih-line)" }}>
                <strong>Prefers async.</strong> Don&apos;t book past 16:00 UK. Lara approves all spend &gt; £500.
                <div className="ih-mono" style={{ fontSize: 9.5, color: "var(--ih-ink-40)", marginTop: 6 }}>luke {"·"} 4 weeks ago</div>
              </div>
              <div style={{ fontSize: 12, lineHeight: 1.5 }}>
                Renewal conversation slot: <strong>last week of June</strong>. Q3 brief drafted in /docs.
                <div className="ih-mono" style={{ fontSize: 9.5, color: "var(--ih-ink-40)", marginTop: 6 }}>luke {"·"} 6 days ago</div>
              </div>
            </div>
          </div>

          {/* Recent activity */}
          <div className="ih-card" style={{ background: "var(--ih-surface)" }}>
            <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--ih-line)" }}>
              <span className="ih-eyebrow">Recent {"·"} 5</span>
            </div>
            {([
              ["09:42", "Stripe", "paid /inv_2039", "ok"],
              ["08:51", "Mira", "approved Q2 brief", "ok"],
              ["Mon", "Portal", "new comment from Jamie", "muted"],
              ["Sun", "Workflow", "monthly digest sent", "ok"],
              ["Fri", "You", "logged 4.5h to sprint 4", "muted"],
            ] as [string, string, string, string][]).map((r, i) => (
              <div key={i} style={{ padding: "8px 14px", display: "grid", gridTemplateColumns: "36px 1fr auto", gap: 8, alignItems: "center", borderTop: "1px solid var(--ih-line)", fontSize: 11.5 }}>
                <span className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)" }}>{r[0]}</span>
                <span><strong style={{ fontWeight: 500 }}>{r[1]}</strong> <span style={{ color: "var(--ih-ink-65)" }}>{r[2]}</span></span>
                <span className={`ih-dot ih-dot-${r[3]}`} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
