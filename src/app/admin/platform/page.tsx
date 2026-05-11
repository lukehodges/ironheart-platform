"use client"

import { Icon } from "@/components/shell"

/* ── Platform Admin ──────────────────────────────────────────────────────── */

export default function PlatformPage() {
  return (
    <div style={{ margin: "-24px -24px 0" }}>
      {/* Header */}
      <div style={{ padding: "24px 28px 12px", borderBottom: "1px solid var(--ih-line)", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <div className="ih-eyebrow" style={{ marginBottom: 6 }}>Platform · all tenants</div>
          <h1 className="ih-serif" style={{ margin: 0, fontSize: 32 }}>47 tenants. <span className="ih-italic-red">$48.2k</span> MRR.</h1>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          <button className="ih-btn ih-btn-ghost ih-btn-sm">All plans</button>
          <button className="ih-btn ih-btn-ghost ih-btn-sm">All regions</button>
          <button className="ih-btn ih-btn-ghost ih-btn-sm">Health: any</button>
        </div>
      </div>

      {/* KPI row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", borderBottom: "1px solid var(--ih-line)" }}>
        {([
          ["MRR", "$48.2k", "+8.2%", "ok"],
          ["Tenants", "47", "+3 mo", "ok"],
          ["Active /7d", "42", "89%", "muted"],
          ["Churn /30d", "2", "4.2%", "warn"],
          ["LTV / CAC", "4.1\u00d7", "stable", "muted"],
          ["Trial \u2192 paid", "68%", "+4pts", "ok"],
        ] as const).map((s, i) => (
          <div key={s[0]} style={{ padding: "16px 20px", borderLeft: i === 0 ? "0" : "1px solid var(--ih-line)" }}>
            <span className="ih-eyebrow">{s[0]}</span>
            <div className="ih-serif" style={{ fontSize: 24, lineHeight: 1, marginTop: 6 }}>{s[1]}</div>
            <div className="ih-mono" style={{ fontSize: 10, color: s[3] === "warn" ? "var(--ih-warn)" : s[3] === "ok" ? "var(--ih-ok)" : "var(--ih-ink-40)", marginTop: 6 }}>{s[2]}</div>
          </div>
        ))}
      </div>

      {/* Tenant table area */}
      <div style={{ padding: "20px 28px" }}>
        {/* Filter tabs */}
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14, alignItems: "center" }}>
          <div style={{ display: "flex", gap: 6 }}>
            {["All 47", "Trialing 6", "At risk 4", "Paying 37"].map((t, i) => (
              <button key={t} className={`ih-btn ${i === 0 ? "ih-btn-ghost" : "ih-btn-quiet"} ih-btn-sm`}>{t}</button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button className="ih-btn ih-btn-quiet ih-btn-sm"><Icon name="filter" size={11}/> Filters</button>
            <button className="ih-btn ih-btn-quiet ih-btn-sm"><Icon name="sliders" size={11}/> Columns</button>
          </div>
        </div>

        {/* Table */}
        <div className="ih-card" style={{ overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: "var(--ih-surface-2)" }}>
                {["Tenant", "Plan", "Users", "MRR", "Activity", "Health", "Last seen", "Modules", ""].map(h => (
                  <th key={h} className="ih-mono" style={{ textAlign: "left", padding: "10px 14px", fontSize: 10, color: "var(--ih-ink-50)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.1em", borderBottom: "1px solid var(--ih-line)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {([
                ["Acme Studios",     "Pro \u00b7 $99",        18, "$99",  92, "A",  "12m ago",  "8 active",  "ok"],
                ["Northwind Co.",    "Pro \u00b7 $99",        12, "$99",  88, "A\u2212", "1h ago",   "9 active",  "ok"],
                ["Westfield",        "Starter \u00b7 $29",     4, "$29",  64, "B+",  "2h ago",   "5 active",  "muted"],
                ["Halcyon Group",    "Pro \u00b7 $99",        21, "$99",  41, "C",   "3d ago",   "3 active",  "warn"],
                ["Olsen Brands",     "Trial",                  7, "$0",   78, "\u2014", "32m ago",  "4 active",  "info"],
                ["Field Notes Co",   "Pro \u00b7 $99",         9, "$99",  55, "B",   "5h ago",   "6 active",  "muted"],
                ["Cardinal LLC",     "Enterprise \u00b7 $399",48, "$399", 96, "A+",  "8m ago",   "12 active", "ok"],
                ["Bramble",          "Starter \u00b7 $29",     3, "$29",  18, "D",   "12d ago",  "2 active",  "danger"],
              ] as [string, string, number, string, number, string, string, string, string][]).map((r, i) => (
                <tr key={i} style={{ borderTop: "1px solid var(--ih-line)" }}>
                  <td style={{ padding: "11px 14px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div className="ih-avatar" style={{ width: 22, height: 22, fontSize: 9 }}>{r[0].split(" ").map(w => w[0]).join("").slice(0, 2)}</div>
                      <strong style={{ fontSize: 12.5, fontWeight: 500 }}>{r[0]}</strong>
                    </div>
                  </td>
                  <td style={{ padding: "11px 14px", color: "var(--ih-ink-65)" }}><span className="ih-mono" style={{ fontSize: 11 }}>{r[1]}</span></td>
                  <td style={{ padding: "11px 14px" }}><span className="ih-num">{r[2]}</span></td>
                  <td style={{ padding: "11px 14px" }}><span className="ih-num" style={{ fontWeight: 500 }}>{r[3]}</span></td>
                  <td style={{ padding: "11px 14px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ width: 50, height: 4, background: "var(--ih-surface-2)", borderRadius: 2, overflow: "hidden" }}>
                        <div style={{ width: r[4] + "%", height: "100%", background: r[8] === "warn" ? "var(--ih-warn)" : r[8] === "danger" ? "var(--ih-danger)" : r[8] === "info" ? "var(--ih-info)" : "var(--ih-ok)" }}/>
                      </div>
                      <span className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-50)" }}>{r[4]}</span>
                    </div>
                  </td>
                  <td style={{ padding: "11px 14px" }}>
                    <span className="ih-pill" style={{
                      background: r[8] === "warn" ? "var(--ih-warn-soft)" : r[8] === "danger" ? "var(--ih-danger-soft)" : r[8] === "ok" ? "var(--ih-ok-soft)" : r[8] === "info" ? "var(--ih-info-soft)" : "var(--ih-surface-2)",
                      color: r[8] === "warn" ? "var(--ih-warn)" : r[8] === "danger" ? "var(--ih-danger)" : r[8] === "ok" ? "var(--ih-ok)" : r[8] === "info" ? "var(--ih-info)" : "var(--ih-ink-50)",
                      borderColor: "transparent", fontFamily: "var(--ih-font-mono)",
                    }}>{r[5]}</span>
                  </td>
                  <td style={{ padding: "11px 14px", color: "var(--ih-ink-50)" }}><span className="ih-mono" style={{ fontSize: 11 }}>{r[6]}</span></td>
                  <td style={{ padding: "11px 14px", color: "var(--ih-ink-65)" }}><span className="ih-mono" style={{ fontSize: 11 }}>{r[7]}</span></td>
                  <td style={{ padding: "11px 14px", textAlign: "right" }}><Icon name="chevronRight" size={11} style={{ color: "var(--ih-ink-30)" }}/></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Bottom: Module adoption + Health flags */}
        <div style={{ marginTop: 20, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          {/* Module adoption */}
          <div className="ih-card">
            <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--ih-line)" }}>
              <span className="ih-eyebrow">Module adoption · last 30d</span>
            </div>
            <div style={{ padding: 18 }}>
              {([
                ["Bookings",   91, "ok"],
                ["Workflows",  74, "ok"],
                ["Pipeline",   62, "info"],
                ["AI Copilot", 58, "accent"],
                ["Invoices",   88, "ok"],
                ["Portal",     44, "warn"],
                ["Audit",      38, "muted"],
              ] as [string, number, string][]).map(([m, p, t]) => (
                <div key={m} style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 4 }}>
                    <span>{m}</span><span className="ih-mono" style={{ color: "var(--ih-ink-40)" }}>{p}%</span>
                  </div>
                  <div style={{ height: 5, background: "var(--ih-surface-2)", borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ width: p + "%", height: "100%", background: t === "ok" ? "var(--ih-ok)" : t === "warn" ? "var(--ih-warn)" : t === "accent" ? "var(--ih-accent)" : t === "info" ? "var(--ih-info)" : "var(--ih-ink-30)" }}/>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Health flags */}
          <div className="ih-card">
            <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--ih-line)" }}>
              <span className="ih-eyebrow">Health flags · 4</span>
            </div>
            {([
              ["Bramble",       "12d since last login",           "danger"],
              ["Halcyon Group", "Login frequency \u221262% in 14d", "warn"],
              ["Westfield",     "Workflow failure rate up",       "warn"],
              ["Field Notes",   "MRR same, usage falling",       "muted"],
            ] as [string, string, string][]).map(([n, sub, t], i) => (
              <div key={n} style={{ padding: "12px 18px", borderTop: i === 0 ? "0" : "1px solid var(--ih-line)", display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 12, alignItems: "center" }}>
                <span className={`ih-dot ih-dot-${t}`}/>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 500 }}>{n}</div>
                  <div className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)" }}>{sub}</div>
                </div>
                <button className="ih-btn ih-btn-quiet ih-btn-sm">Open →</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
