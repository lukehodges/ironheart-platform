"use client"

import { Icon } from "@/components/shell"

/* ── Data ───────────────────────────────────────────────────────────────── */

type RagScore = "RED" | "AMBER" | "GREEN"

const RAG_TONE: Record<RagScore, { bg: string; color: string; border: string }> = {
  RED:   { bg: "rgba(192,57,43,0.08)", color: "#C0392B", border: "rgba(192,57,43,0.25)" },
  AMBER: { bg: "rgba(214,154,67,0.08)", color: "#B8821F", border: "rgba(214,154,67,0.25)" },
  GREEN: { bg: "rgba(47,111,92,0.08)", color: "#2F6F5C", border: "rgba(47,111,92,0.25)" },
}

const fmtGBP = (n: number) => "\u00a3" + (n >= 1000 ? (n / 1000).toFixed(n >= 10000 ? 0 : 1) + "K" : String(n))

function RagBadge({ score, size = "md" }: { score: RagScore; size?: "sm" | "md" }) {
  const t = RAG_TONE[score]
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: size === "sm" ? "2px 7px" : "3px 9px",
      background: t.bg, color: t.color,
      border: `1px solid ${t.border}`, borderRadius: "var(--ih-r-pill)",
      fontFamily: "var(--ih-font-mono)", fontSize: size === "sm" ? 9 : 10,
      fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase",
    }}>
      <span style={{ width: 6, height: 6, borderRadius: 999, background: t.color }} />
      {score}
    </span>
  )
}

interface LensRow { id: string; name: string; rag: RagScore; waste: number; justification: string; findingCount: number }

const LENS_ROWS: LensRow[] = [
  { id: "REVENUE",    name: "Revenue",    rag: "AMBER", waste: 84000,  justification: "Pipeline visibility is broken but conversion rate is healthy. Mostly process, not strategy.", findingCount: 4 },
  { id: "OPERATIONS", name: "Operations", rag: "RED",   waste: 168000, justification: "Every operational process is manual and undocumented. This is the load-bearing problem.", findingCount: 6 },
  { id: "FINANCE",    name: "Finance",    rag: "AMBER", waste: 46000,  justification: "Books are accurate, but reporting cadence is too slow to catch issues.", findingCount: 3 },
  { id: "TECHNOLOGY", name: "Technology", rag: "AMBER", waste: 38000,  justification: "Tools are right; the glue is missing.", findingCount: 2 },
  { id: "TEAM",       name: "Team",       rag: "GREEN", waste: 12000,  justification: "No structural team issues. Minor onboarding gap.", findingCount: 1 },
]

const TOTAL_WASTE = LENS_ROWS.reduce((s, l) => s + l.waste, 0)
const TOTAL_FINDINGS = LENS_ROWS.reduce((s, l) => s + l.findingCount, 0)
const TOTAL_INVEST = 61700

interface PhaseRec { lens: string; t: string; cost: number; effort: string }

const PHASES: { n: number; name: string; dur: string; desc: string; recs: PhaseRec[] }[] = [
  {
    n: 1, name: "Stop the bleed", dur: "Month 1",
    desc: "Quick wins that recover the most \u00a3 for the least build. Targeted at AMBER/RED items with short effort.",
    recs: [
      { lens: "REVENUE",    t: "CRM hygiene workflow \u2014 required fields gating",        cost: 1200, effort: "S \u00b7 3 day" },
      { lens: "OPERATIONS", t: "Replace WhatsApp handoffs with shift-log app",         cost: 2000, effort: "S \u00b7 1 wk" },
      { lens: "FINANCE",    t: "Build live cashflow dashboard (Metabase)",             cost: 2500, effort: "S \u00b7 1 wk" },
      { lens: "TECHNOLOGY", t: "Notion doc-staleness alerts via workflow",             cost: 800,  effort: "S \u00b7 2 day" },
      { lens: "TEAM",       t: "Codified ops onboarding playbook + checklist",         cost: 1500, effort: "S \u00b7 1 wk" },
    ],
  },
  {
    n: 2, name: "Build the spine", dur: "Month 2 \u2013 3",
    desc: "The load-bearing automations that replace manual reconciliation work. This is where the studio earns its retainer.",
    recs: [
      { lens: "OPERATIONS", t: "Build Order \u2192 Fulfillment automation in Plane",        cost: 12000, effort: "L \u00b7 4 wk" },
      { lens: "OPERATIONS", t: "Inventory sync workflow (3 sources \u2192 SoT)",            cost: 9500,  effort: "L \u00b7 4 wk" },
      { lens: "TECHNOLOGY", t: "Install n8n + build 6 core automations",               cost: 8500,  effort: "L \u00b7 4 wk" },
      { lens: "FINANCE",    t: "Automate bank rec via Xero rules + matching",          cost: 4500,  effort: "M \u00b7 2 wk" },
    ],
  },
  {
    n: 3, name: "Scale & retain", dur: "Month 4 \u2013 6",
    desc: "Once the spine is in place, scale up new workflows and bring suppliers/partners into the same system.",
    recs: [
      { lens: "OPERATIONS", t: "Single-SKU registry + change events",                  cost: 5000, effort: "M \u00b7 2 wk" },
      { lens: "OPERATIONS", t: "Supplier onboarding portal (forms + approvals)",       cost: 6500, effort: "M \u00b7 3 wk" },
      { lens: "REVENUE",    t: "Build ICP scoring model + tag in HubSpot",             cost: 3500, effort: "M \u00b7 2 wk" },
      { lens: "REVENUE",    t: "Adopt lead-routing automation with weekend rotation",  cost: 4200, effort: "M \u00b7 2 wk" },
    ],
  },
]

const LENS_RAG_MAP: Record<string, RagScore> = Object.fromEntries(LENS_ROWS.map(l => [l.id, l.rag]))

/* ── Page ───────────────────────────────────────────────────────────────── */

export default function AuditReportPage() {
  return (
    <div style={{ maxWidth: 1180, margin: "0 auto" }}>
      {/* Status strip */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "10px 14px", marginBottom: 22, background: "var(--ih-surface-2)",
        border: "1px solid var(--ih-line)", borderRadius: "var(--ih-r-md)",
      }}>
        <span className="ih-pill ih-pill-warn" style={{ fontSize: 9.5 }}>\u25cf DRAFT</span>
        <span className="ih-mono" style={{ fontSize: 10.5, color: "var(--ih-ink-50)" }}>AR-0027 \u00b7 generated Apr 04 09:42 \u00b7 revision 2</span>
        <div style={{ flex: 1 }} />
        <span className="ih-mono" style={{ fontSize: 10.5, color: "var(--ih-ink-50)" }}>\u2193 Driven by session AS-0027 \u2014 re-runs on any lens change</span>
      </div>

      {/* Cover */}
      <div style={{ border: "1px solid var(--ih-line)", borderRadius: "var(--ih-r-xl)", padding: "48px 56px", background: "var(--ih-surface)", marginBottom: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32 }}>
          <div>
            <div className="ih-eyebrow" style={{ marginBottom: 12 }}>Q1 Operations Audit \u00b7 for Northwind Logistics</div>
            <h1 className="ih-serif" style={{ fontSize: 64, lineHeight: 0.95, margin: 0, maxWidth: 720 }}>
              Five lenses on Northwind, and one <span className="ih-italic-red">very large</span> number.
            </h1>
          </div>
          <div style={{ textAlign: "right" }}>
            <div className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)", letterSpacing: "0.14em" }}>PREPARED BY</div>
            <div className="ih-serif" style={{ fontSize: 22, marginTop: 2 }}>Ironheart</div>
            <div className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-50)", marginTop: 12 }}>April 2024</div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "stretch", marginTop: 40, padding: "24px 0", borderTop: "1px solid var(--ih-line)", borderBottom: "1px solid var(--ih-line)" }}>
          <div style={{ flex: 1.4 }}>
            <div className="ih-eyebrow" style={{ marginBottom: 8 }}>The headline</div>
            <div className="ih-serif" style={{ fontSize: 88, lineHeight: 0.9, color: "var(--ih-accent)" }}>{fmtGBP(TOTAL_WASTE)}</div>
            <div style={{ fontSize: 14, color: "var(--ih-ink-65)", marginTop: 6 }}>annual waste recoverable across operations</div>
          </div>
          <div style={{ width: 1, background: "var(--ih-line)" }} />
          <div style={{ flex: 1, padding: "0 32px" }}>
            <div className="ih-eyebrow" style={{ marginBottom: 8 }}>Investment</div>
            <div className="ih-serif ih-num" style={{ fontSize: 38, lineHeight: 1 }}>{fmtGBP(TOTAL_INVEST)}</div>
            <div style={{ fontSize: 12, color: "var(--ih-ink-50)", marginTop: 4 }}>one-time build cost, paid against milestones</div>

            <div className="ih-eyebrow" style={{ marginBottom: 8, marginTop: 18 }}>Return</div>
            <div className="ih-serif ih-num" style={{ fontSize: 38, lineHeight: 1, color: "var(--ih-ok)" }}>{(TOTAL_WASTE / TOTAL_INVEST).toFixed(1)}\u00d7</div>
            <div style={{ fontSize: 12, color: "var(--ih-ink-50)", marginTop: 4 }}>payback in ~62 days</div>
          </div>
        </div>

        <div style={{ marginTop: 28, maxWidth: 820, fontSize: 14, lineHeight: 1.7, color: "var(--ih-ink-90)" }}>
          <span className="ih-eyebrow" style={{ display: "block", marginBottom: 10 }}>Executive summary</span>
          Northwind is operationally <span className="ih-italic-red">healthy on the surface</span> but quietly leaking margin
          across every workflow that touches inventory, fulfillment, and reconciliation. We mapped 12 weeks of
          ops activity, scored five lenses, and identified {TOTAL_FINDINGS} specific findings totalling <strong>{fmtGBP(TOTAL_WASTE)}</strong>
          {" "}in annual waste. The fix is not new tools &mdash; it is automation glue between the five tools you already pay
          for. A 6-month implementation engagement at <strong>{fmtGBP(TOTAL_INVEST)}</strong> closes the gaps in three phases
          and pays itself back inside two months.
        </div>
      </div>

      {/* RAG matrix */}
      <div className="ih-card" style={{ padding: 20, marginBottom: 18 }}>
        <div className="ih-eyebrow" style={{ marginBottom: 14 }}>The five lenses \u00b7 at a glance</div>
        <div style={{ display: "grid", gridTemplateColumns: "120px 90px 1fr 110px 110px", gap: 0, fontSize: 12 }}>
          {["LENS", "SCORE", "JUSTIFICATION", "FINDINGS", "WASTE / YR"].map((h, i) => (
            <div key={h} className="ih-mono" style={{ fontSize: 9, color: "var(--ih-ink-40)", letterSpacing: "0.12em", padding: "8px 0", borderBottom: "1px solid var(--ih-line)", textAlign: i >= 3 ? "right" : "left" }}>{h}</div>
          ))}
          {LENS_ROWS.map((l) => (
            <div key={l.id} style={{ display: "contents" }}>
              <div style={{ padding: "14px 0", borderBottom: "1px dashed var(--ih-line)", fontWeight: 500 }}>{l.name}</div>
              <div style={{ padding: "14px 0", borderBottom: "1px dashed var(--ih-line)" }}><RagBadge score={l.rag} size="sm" /></div>
              <div style={{ padding: "14px 16px 14px 0", borderBottom: "1px dashed var(--ih-line)", color: "var(--ih-ink-65)", fontSize: 11.5, lineHeight: 1.4 }}>{l.justification}</div>
              <div className="ih-mono" style={{ padding: "14px 0", borderBottom: "1px dashed var(--ih-line)", textAlign: "right" }}>{l.findingCount}</div>
              <div className="ih-num" style={{ padding: "14px 0", borderBottom: "1px dashed var(--ih-line)", textAlign: "right", fontWeight: 600, color: RAG_TONE[l.rag].color }}>{fmtGBP(l.waste)}</div>
            </div>
          ))}
          <div style={{ padding: "14px 0", fontWeight: 600 }}>Total</div>
          <div style={{ padding: "14px 0" }} />
          <div style={{ padding: "14px 0" }} />
          <div className="ih-mono" style={{ padding: "14px 0", textAlign: "right", fontWeight: 600 }}>{TOTAL_FINDINGS}</div>
          <div className="ih-num" style={{ padding: "14px 0", textAlign: "right", fontWeight: 700, fontSize: 14, color: "var(--ih-accent)" }}>{fmtGBP(TOTAL_WASTE)}</div>
        </div>
      </div>

      {/* Roadmap */}
      <div style={{ marginBottom: 14, display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <h2 className="ih-serif" style={{ fontSize: 28, margin: 0 }}>The <span className="ih-italic-red">six-month</span> roadmap</h2>
        <div style={{ fontSize: 11, color: "var(--ih-ink-50)" }}>auto-built from recommendations \u00b7 grouped by priority</div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 22 }}>
        {PHASES.map((p) => {
          const subtotal = p.recs.reduce((s, r) => s + r.cost, 0)
          return (
            <div key={p.n} className="ih-card" style={{ padding: 20 }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 18, marginBottom: 14 }}>
                <div style={{
                  width: 56, height: 56, borderRadius: "var(--ih-r-md)",
                  background: p.n === 2 ? "var(--ih-accent-soft-2)" : "var(--ih-surface-2)",
                  border: p.n === 2 ? "1px solid var(--ih-accent-soft)" : "1px solid var(--ih-line)",
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                }}>
                  <div className="ih-mono" style={{ fontSize: 9, color: "var(--ih-ink-40)", letterSpacing: "0.12em" }}>PHASE</div>
                  <div className="ih-serif" style={{ fontSize: 26, lineHeight: 1, color: p.n === 2 ? "var(--ih-accent)" : "var(--ih-ink)" }}>{p.n}</div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
                    <h3 className="ih-serif" style={{ fontSize: 22, margin: 0 }}>{p.name}</h3>
                    <span className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-50)", letterSpacing: "0.1em" }}>{p.dur}</span>
                  </div>
                  <div style={{ fontSize: 12.5, color: "var(--ih-ink-65)", marginTop: 6, lineHeight: 1.5, maxWidth: 720 }}>{p.desc}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div className="ih-eyebrow" style={{ fontSize: 9, marginBottom: 4 }}>Phase cost</div>
                  <div className="ih-serif ih-num" style={{ fontSize: 22, lineHeight: 1 }}>{fmtGBP(subtotal)}</div>
                  <div className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-50)", marginTop: 4 }}>{p.recs.length} milestones</div>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingLeft: 74 }}>
                {p.recs.map((r, i) => {
                  const toneColor = RAG_TONE[LENS_RAG_MAP[r.lens] ?? "AMBER"].color
                  return (
                    <div key={i} style={{ display: "grid", gridTemplateColumns: "32px 120px 1fr 100px 90px", gap: 10, padding: "8px 0", borderBottom: "1px dashed var(--ih-line)", alignItems: "center" }}>
                      <span className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)" }}>M-{p.n}.{i + 1}</span>
                      <span className="ih-mono" style={{ fontSize: 9.5, color: toneColor, textTransform: "uppercase", letterSpacing: "0.06em" }}>\u25cf {r.lens}</span>
                      <span style={{ fontSize: 12.5 }}>{r.t}</span>
                      <span className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-50)", textTransform: "uppercase" }}>{r.effort}</span>
                      <span className="ih-num" style={{ fontSize: 12, fontWeight: 600, textAlign: "right" }}>{fmtGBP(r.cost)}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer: promote to retainer */}
      <div style={{
        border: "1px solid var(--ih-accent-soft)", background: "var(--ih-accent-soft-2)",
        borderRadius: "var(--ih-r-xl)", padding: 24, display: "flex", alignItems: "center", gap: 20,
      }}>
        <Icon name="bolt" size={20} style={{ color: "var(--ih-accent)" }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>Promote this roadmap into a retainer engagement</div>
          <div style={{ fontSize: 12, color: "var(--ih-ink-65)", marginTop: 4 }}>
            Creates a new 6-month engagement on a \u00a34,200/mo retainer. Each of the 13 recommendations becomes a milestone with its build cost and effort pre-filled. Invoice schedule auto-built.
          </div>
        </div>
        <button className="ih-btn ih-btn-accent ih-btn-sm">Promote to retainer \u2192</button>
      </div>
    </div>
  )
}
