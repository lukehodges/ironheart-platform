"use client"

import { useState, useMemo } from "react"
import { Icon } from "@/components/shell"

/* ── Data ────────────────────────────────────────────────────────────────── */

type Customer = {
  id: string; initials: string; name: string; company: string; email: string;
  tags: { label: string; tone: string }[]; engagements: number; totalSpend: number;
  lastContact: string; health: "ok" | "warn" | "danger" | "muted";
}

const CUSTOMERS: Customer[] = [
  { id: "cu-1", initials: "SC", name: "Sarah Chen", company: "Northwind Logistics", email: "sarah@northwind.co", tags: [{ label: "fintech", tone: "info" }, { label: "repeat", tone: "ok" }], engagements: 3, totalSpend: 48200, lastContact: "2h ago", health: "ok" },
  { id: "cu-2", initials: "TR", name: "Tom Reeves", company: "Vellum & Co.", email: "tom@vellum.co", tags: [{ label: "saas", tone: "info" }], engagements: 2, totalSpend: 64000, lastContact: "1d ago", health: "ok" },
  { id: "cu-3", initials: "MP", name: "Mira Patel", company: "Sea Glass Studio", email: "mira@seaglass.io", tags: [{ label: "ecommerce", tone: "accent" }], engagements: 1, totalSpend: 18000, lastContact: "3d ago", health: "warn" },
  { id: "cu-4", initials: "JH", name: "Jonas Hale", company: "Bowery Mills", email: "jonas@bowery.co.uk", tags: [{ label: "manufacturing", tone: "info" }, { label: "retainer", tone: "ok" }], engagements: 2, totalSpend: 42000, lastContact: "2d ago", health: "ok" },
  { id: "cu-5", initials: "EB", name: "Eleanor Brigham", company: "Brigham Architects", email: "eleanor@brigham-arch.co", tags: [{ label: "at-risk", tone: "danger" }], engagements: 1, totalSpend: 12000, lastContact: "18d ago", health: "danger" },
  { id: "cu-6", initials: "AK", name: "Asha Kapoor", company: "Pebble & Pine", email: "asha@pebbleandpine.com", tags: [{ label: "wellness", tone: "info" }], engagements: 0, totalSpend: 0, lastContact: "1d ago", health: "muted" },
  { id: "cu-7", initials: "DF", name: "Daniel Foss", company: "Mid-Atlantic Co.", email: "daniel@midatlantic.com", tags: [{ label: "legal", tone: "info" }, { label: "repeat", tone: "ok" }], engagements: 2, totalSpend: 31500, lastContact: "6h ago", health: "ok" },
  { id: "cu-8", initials: "YS", name: "Yuki Sato", company: "Castor Foods", email: "yuki@castorfoods.co.uk", tags: [{ label: "manufacturing", tone: "info" }], engagements: 1, totalSpend: 22000, lastContact: "5h ago", health: "ok" },
  { id: "cu-9", initials: "PV", name: "Priya Vance", company: "Arden Health", email: "priya@ardenhealth.co", tags: [{ label: "wellness", tone: "info" }, { label: "hybrid", tone: "accent" }], engagements: 1, totalSpend: 38000, lastContact: "1d ago", health: "ok" },
  { id: "cu-10", initials: "LW", name: "Liam Walker", company: "Greystone Digital", email: "liam@greystone.io", tags: [{ label: "saas", tone: "info" }], engagements: 0, totalSpend: 0, lastContact: "8d ago", health: "warn" },
]

const TABS = ["All", "Active", "Inactive", "At Risk", "New (30d)"]

const TH: React.CSSProperties = { textAlign: "left", padding: "10px 12px", fontWeight: 500, fontSize: 10, color: "var(--ih-ink-40)", textTransform: "uppercase", letterSpacing: "0.12em", fontFamily: "var(--ih-font-mono)" }

/* ── Page ─────────────────────────────────────────────────────────────────── */

export default function CustomersPage() {
  const [tab, setTab] = useState(0)
  const [search, setSearch] = useState("")

  const filteredCustomers = useMemo(() => {
    let list = CUSTOMERS
    // Tab filtering
    switch (tab) {
      case 1: list = list.filter(c => c.health === "ok" && c.engagements > 0); break // Active
      case 2: list = list.filter(c => c.engagements === 0 || c.health === "muted"); break // Inactive
      case 3: list = list.filter(c => c.health === "danger" || c.health === "warn"); break // At Risk
      case 4: list = list.filter(c => c.lastContact.includes("d ago") && parseInt(c.lastContact) <= 30 || c.lastContact.includes("h ago")); break // New (30d) — approximate by recent contact
    }
    // Search filtering
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(c => c.name.toLowerCase().includes(q) || c.company.toLowerCase().includes(q) || c.email.toLowerCase().includes(q))
    }
    return list
  }, [tab, search])

  return (
    <div style={{ padding: "24px 28px 48px", maxWidth: 1400, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24, gap: 24, flexWrap: "wrap" }}>
        <div>
          <div className="ih-eyebrow" style={{ marginBottom: 8 }}>Customers &middot; CRM</div>
          <h1 className="ih-serif" style={{ margin: 0, fontSize: 38, lineHeight: 0.98 }}>
            47 customers. <span className="ih-italic-red">12</span> active engagements.
          </h1>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button className="ih-btn ih-btn-ghost ih-btn-sm"><Icon name="download" size={12}/> Export</button>
          <button className="ih-btn ih-btn-primary ih-btn-sm"><Icon name="plus" size={12}/> Add customer</button>
        </div>
      </div>

      {/* Stats strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 20 }}>
        {[
          { l: "Total customers", v: "47", d: "+3", h: "this quarter", icon: "users" as const },
          { l: "Active", v: "34", d: "+2", h: "with engagements", icon: "check" as const },
          { l: "Avg lifetime value", v: "\u00a328.4k", d: "+8.2%", h: "vs last quarter", icon: "money" as const },
          { l: "Retention rate", v: "92%", d: "+1.4%", h: "12-month rolling", icon: "target" as const },
        ].map((s) => (
          <div key={s.l} className="ih-card" style={{ padding: "14px 14px", cursor: "pointer" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <span className="ih-eyebrow">{s.l}</span>
              <Icon name={s.icon} size={12} style={{ color: "var(--ih-ink-30)" }} />
            </div>
            <div className="ih-serif" style={{ fontSize: 30, lineHeight: 1 }}>{s.v}</div>
            <div style={{ marginTop: 6, fontSize: 10.5, color: "var(--ih-ink-50)", display: "flex", gap: 5, alignItems: "center" }}>
              <span style={{ color: "var(--ih-ok)", fontWeight: 500 }} className="ih-mono">{s.d}</span>
              <span>{s.h}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Filter tabs + search */}
      <div className="ih-card" style={{ overflow: "hidden" }}>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--ih-line)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", gap: 0 }}>
            {TABS.map((t, i) => (
              <button key={t} onClick={() => setTab(i)} style={{ background: "transparent", border: 0, padding: "8px 14px", fontSize: 12, color: tab === i ? "var(--ih-ink)" : "var(--ih-ink-50)", fontWeight: tab === i ? 500 : 400, cursor: "pointer", borderBottom: tab === i ? "2px solid var(--ih-accent)" : "2px solid transparent", marginBottom: -1 }}>{t}</button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div style={{ position: "relative" }}>
              <Icon name="search" size={13} style={{ position: "absolute", left: 10, top: 8, color: "var(--ih-ink-40)" }} />
              <input className="ih-input" placeholder="Search customers\u2026" style={{ paddingLeft: 30, width: 240 }} value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <button className="ih-btn ih-btn-quiet ih-btn-sm"><Icon name="filter" size={11}/> Filter</button>
          </div>
        </div>

        {/* Table */}
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ background: "var(--ih-surface-2)" }}>
              <th style={{ ...TH, paddingLeft: 16 }}>Customer</th>
              <th style={TH}>Company</th>
              <th style={TH}>Email</th>
              <th style={TH}>Tags</th>
              <th style={TH}>Engagements</th>
              <th style={TH}>Total spend</th>
              <th style={TH}>Last contact</th>
              <th style={TH}>Health</th>
              <th style={{ width: 36 }}></th>
            </tr>
          </thead>
          <tbody>
            {filteredCustomers.map((c) => (
              <tr key={c.id} style={{ borderTop: "1px solid var(--ih-line)", cursor: "pointer" }}>
                <td style={{ padding: "10px 12px 10px 16px" }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <div className="ih-avatar" style={{ background: c.health === "danger" ? "var(--ih-danger-soft)" : "var(--ih-surface-2)", color: c.health === "danger" ? "var(--ih-danger)" : "var(--ih-ink-65)" }}>{c.initials}</div>
                    <span style={{ fontWeight: 500, fontSize: 12.5 }}>{c.name}</span>
                  </div>
                </td>
                <td style={{ padding: "10px 12px", color: "var(--ih-ink-65)" }}>{c.company}</td>
                <td style={{ padding: "10px 12px" }}>
                  <span className="ih-mono" style={{ fontSize: 11, color: "var(--ih-ink-50)" }}>{c.email}</span>
                </td>
                <td style={{ padding: "10px 12px" }}>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {c.tags.map((t) => (
                      <span key={t.label} className={`ih-pill ih-pill-${t.tone}`} style={{ fontSize: 9, padding: "2px 6px" }}>{t.label}</span>
                    ))}
                  </div>
                </td>
                <td style={{ padding: "10px 12px", textAlign: "center" }}>
                  <span className="ih-mono" style={{ fontSize: 12 }}>{c.engagements || "\u2014"}</span>
                </td>
                <td style={{ padding: "10px 12px" }}>
                  <span className="ih-mono" style={{ fontSize: 12 }}>{c.totalSpend > 0 ? `\u00a3${c.totalSpend.toLocaleString()}` : "\u2014"}</span>
                </td>
                <td style={{ padding: "10px 12px" }}>
                  <span className="ih-mono" style={{ fontSize: 11, color: "var(--ih-ink-50)" }}>{c.lastContact}</span>
                </td>
                <td style={{ padding: "10px 12px" }}>
                  <span className={`ih-dot ih-dot-${c.health}`} />
                </td>
                <td style={{ padding: "10px 12px" }}>
                  <button className="ih-btn ih-btn-quiet ih-btn-icon" style={{ height: 22, width: 22 }}><Icon name="moreH" size={12}/></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Footer */}
        <div style={{ padding: "10px 16px", borderTop: "1px solid var(--ih-line)", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11, color: "var(--ih-ink-50)" }}>
          <span>Showing {filteredCustomers.length} of {CUSTOMERS.length} customers</span>
          <div style={{ display: "flex", gap: 4 }}>
            <button className="ih-btn ih-btn-quiet ih-btn-icon" style={{ height: 22, width: 22 }}><Icon name="chevronLeft" size={11}/></button>
            <button className="ih-btn ih-btn-quiet ih-btn-icon" style={{ height: 22, width: 22 }}><Icon name="chevronRight" size={11}/></button>
          </div>
        </div>
      </div>
    </div>
  )
}
