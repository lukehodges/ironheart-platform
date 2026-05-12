"use client"

import { useState, useMemo } from "react"
import { Icon, type IconName } from "@/components/shell"

/* ── Data ───────────────────────────────────────────────────────────────── */

type RagScore = "RED" | "AMBER" | "GREEN"
type Impact = "HIGH" | "MEDIUM" | "LOW"

interface Finding { t: string; impact: Impact; waste: number; ev: string }
interface Rec { t: string; effort: string; cost: number }
interface Lens {
  id: string; name: string; icon: IconName
  rag: RagScore; waste: number; current: string; justification: string
  current_focus?: boolean
  findings: Finding[]; recs: Rec[]
}

const LENSES: Lens[] = [
  {
    id: "REVENUE", name: "Revenue", icon: "chart",
    rag: "AMBER", waste: 84000,
    current: "Lead-to-close is 38d. CRM hygiene poor — 22% of deals missing close date. No clear ICP segmentation in pipeline.",
    justification: "Pipeline visibility is broken but conversion rate is healthy. Mostly process, not strategy.",
    findings: [
      { t: "No qualified-lead → demo handoff SLA",   impact: "HIGH",   waste: 42000, ev: "Discovery call · Mar 18" },
      { t: "CRM data 22% incomplete on key fields",  impact: "MEDIUM", waste: 18000, ev: "HubSpot export · 412 deals" },
      { t: "Inbound leads dropped in two-day gap on weekends", impact: "MEDIUM", waste: 14000, ev: "Lead audit spreadsheet" },
      { t: "No ICP segmentation — all leads treated equally", impact: "LOW", waste: 10000, ev: "Sales playbook review" },
    ],
    recs: [
      { t: "Adopt lead-routing automation with weekend rotation", effort: "M · 2 wk", cost: 4200 },
      { t: "CRM hygiene workflow — required fields gating",       effort: "S · 3 day", cost: 1200 },
      { t: "Build ICP scoring model + tag in HubSpot",            effort: "M · 2 wk", cost: 3500 },
    ],
  },
  {
    id: "OPERATIONS", name: "Operations", icon: "workflow",
    rag: "RED", waste: 168000, current_focus: true,
    current: "12 spreadsheets + 4 SaaS tools held together by tribal knowledge. 4-person ops team spends 60% of week on manual reconciliations.",
    justification: "Every operational process is manual and undocumented. This is the load-bearing problem.",
    findings: [
      { t: "Order → fulfillment reconciliation manual",   impact: "HIGH",   waste: 62000, ev: "12 interviews + screen recordings" },
      { t: "Inventory levels updated from 3 sources daily", impact: "HIGH",   waste: 38000, ev: "Ops review · Mar 26" },
      { t: "No single source of truth for active SKUs",   impact: "HIGH",   waste: 28000, ev: "Inventory audit" },
      { t: "Supplier onboarding takes 11 days avg",       impact: "MEDIUM", waste: 18000, ev: "Process map" },
      { t: "Customer support tickets reopened 24% of time", impact: "MEDIUM", waste: 14000, ev: "Zendesk export" },
      { t: "Shift handoff via WhatsApp screenshots",      impact: "LOW",    waste: 8000,  ev: "Interview · Tom" },
    ],
    recs: [
      { t: "Build Order → Fulfillment automation in Plane",       effort: "L · 4 wk",  cost: 12000 },
      { t: "Inventory sync workflow (3 sources → SoT)",           effort: "L · 4 wk",  cost: 9500 },
      { t: "Single-SKU registry + change events",                 effort: "M · 2 wk",  cost: 5000 },
      { t: "Supplier onboarding portal (forms + approvals)",      effort: "M · 3 wk",  cost: 6500 },
      { t: "Replace WhatsApp handoffs with shift-log app",        effort: "S · 1 wk",  cost: 2000 },
    ],
  },
  {
    id: "FINANCE", name: "Finance", icon: "invoice",
    rag: "AMBER", waste: 46000,
    current: "Monthly close takes 9 days. Bank reconciliation by hand. No dashboard for CFO — sees actuals 3 weeks late.",
    justification: "Books are accurate, but reporting cadence is too slow to catch issues.",
    findings: [
      { t: "Monthly close 9d — should be 3d",             impact: "HIGH",   waste: 24000, ev: "CFO interview" },
      { t: "Bank rec entirely manual",                    impact: "MEDIUM", waste: 14000, ev: "Process recording" },
      { t: "No live cashflow dashboard",                  impact: "LOW",    waste: 8000,  ev: "Discovery call" },
    ],
    recs: [
      { t: "Automate bank rec via Xero rules + matching", effort: "M · 2 wk", cost: 4500 },
      { t: "Build live cashflow dashboard (Metabase)",    effort: "S · 1 wk", cost: 2500 },
    ],
  },
  {
    id: "TECHNOLOGY", name: "Technology", icon: "code",
    rag: "AMBER", waste: 38000,
    current: "Stack is fine — Shopify, Stripe, Xero, HubSpot, Notion. No automation layer between them. APIs unused.",
    justification: "Tools are right; the glue is missing.",
    findings: [
      { t: "Zero workflow automation across 5 SaaS tools", impact: "HIGH", waste: 28000, ev: "Stack audit" },
      { t: "Notion docs out of date — last edit > 90 days on 60% of pages", impact: "LOW", waste: 10000, ev: "Notion analytics" },
    ],
    recs: [
      { t: "Install n8n + build 6 core automations",      effort: "L · 4 wk", cost: 8500 },
      { t: "Notion doc-staleness alerts via workflow",    effort: "S · 2 day", cost: 800 },
    ],
  },
  {
    id: "TEAM", name: "Team", icon: "users",
    rag: "GREEN", waste: 12000,
    current: "Team is engaged and capable. Low turnover. Roles are clear. Onboarding for ops staff is the only weak point.",
    justification: "No structural team issues. Minor onboarding gap.",
    findings: [
      { t: "Ops staff onboarding informal — 4-week ramp", impact: "LOW", waste: 12000, ev: "HR interview" },
    ],
    recs: [
      { t: "Codified ops onboarding playbook + checklist", effort: "S · 1 wk", cost: 1500 },
    ],
  },
]

const TOTAL_WASTE = LENSES.reduce((s, l) => s + l.waste, 0)
const TOTAL_INVEST = LENSES.flatMap(l => l.recs).reduce((s, r) => s + r.cost, 0)

const RAG_TONE: Record<RagScore, { bg: string; color: string; border: string }> = {
  RED:   { bg: "rgba(192,57,43,0.08)", color: "#C0392B", border: "rgba(192,57,43,0.25)" },
  AMBER: { bg: "rgba(214,154,67,0.08)", color: "#B8821F", border: "rgba(214,154,67,0.25)" },
  GREEN: { bg: "rgba(47,111,92,0.08)", color: "#2F6F5C", border: "rgba(47,111,92,0.25)" },
}

const fmtGBP = (n: number) => "£" + (n >= 1000 ? (n / 1000).toFixed(n >= 10000 ? 0 : 1) + "K" : String(n))

/* ── Atoms ──────────────────────────────────────────────────────────────── */

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

function ImpactBadge({ impact }: { impact: Impact }) {
  const m: Record<Impact, { c: string }> = { HIGH: { c: "#C0392B" }, MEDIUM: { c: "#B8821F" }, LOW: { c: "var(--ih-ink-50)" } }
  return <span className="ih-mono" style={{ fontSize: 9.5, color: m[impact].c, letterSpacing: "0.08em", textTransform: "uppercase" }}>● {impact}</span>
}

/* ── Lens card ──────────────────────────────────────────────────────────── */

function LensCard({ lens }: { lens: Lens }) {
  const t = RAG_TONE[lens.rag]
  return (
    <div className="ih-card" style={{
      padding: 16, cursor: "pointer", position: "relative",
      borderColor: lens.current_focus ? "var(--ih-accent)" : undefined,
      boxShadow: lens.current_focus ? "0 0 0 1px var(--ih-accent)" : "none",
    }}>
      {lens.current_focus && (
        <span className="ih-mono" style={{ position: "absolute", top: -7, right: 16, background: "var(--ih-accent)", color: "#fff", fontSize: 8.5, padding: "1px 7px", borderRadius: "var(--ih-r-pill)", letterSpacing: "0.1em" }}>FOCUS</span>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
        <div style={{
          width: 32, height: 32, borderRadius: "var(--ih-r-md)",
          background: t.bg, color: t.color, border: `1px solid ${t.border}`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Icon name={lens.icon} size={15} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 600 }}>{lens.name}</div>
          <div className="ih-mono" style={{ fontSize: 9.5, color: "var(--ih-ink-40)", letterSpacing: "0.1em", textTransform: "uppercase" }}>Lens · {lens.id}</div>
        </div>
        <RagBadge score={lens.rag} size="sm" />
      </div>

      <div style={{ fontSize: 11.5, color: "var(--ih-ink-65)", lineHeight: 1.5, marginBottom: 12, minHeight: 48 }}>
        {lens.current}
      </div>

      <div className="ih-hr" />

      <div style={{ display: "flex", gap: 0, alignItems: "stretch", marginTop: 10 }}>
        <div style={{ flex: 1, paddingRight: 10, borderRight: "1px solid var(--ih-line)" }}>
          <div className="ih-eyebrow" style={{ fontSize: 9, marginBottom: 3 }}>Annual waste</div>
          <div className="ih-num ih-serif" style={{ fontSize: 22, color: t.color, lineHeight: 1 }}>{fmtGBP(lens.waste)}</div>
        </div>
        <div style={{ flex: 1, padding: "0 10px", borderRight: "1px solid var(--ih-line)" }}>
          <div className="ih-eyebrow" style={{ fontSize: 9, marginBottom: 3 }}>Findings</div>
          <div className="ih-num" style={{ fontSize: 18, lineHeight: 1 }}>{lens.findings.length}</div>
        </div>
        <div style={{ flex: 1, paddingLeft: 10 }}>
          <div className="ih-eyebrow" style={{ fontSize: 9, marginBottom: 3 }}>Recs</div>
          <div className="ih-num" style={{ fontSize: 18, lineHeight: 1 }}>{lens.recs.length}</div>
        </div>
      </div>

      <button className="ih-btn ih-btn-quiet ih-btn-sm" style={{ marginTop: 12, width: "100%", justifyContent: "space-between" }}>
        Open lens <Icon name="arrowRight" size={11} />
      </button>
    </div>
  )
}

/* ── Lens detail panel ─────────────────────────────────────────────────── */

function LensDetail({ lens, selectedRag, onRagChange }: { lens: Lens; selectedRag: RagScore; onRagChange: (r: RagScore) => void }) {
  const tone = RAG_TONE[selectedRag]
  return (
    <>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 22 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <Icon name={lens.icon} size={16} style={{ color: tone.color }} />
            <div className="ih-eyebrow">Lens · {lens.name}</div>
          </div>
          <h2 className="ih-serif" style={{ fontSize: 36, lineHeight: 1, margin: 0 }}>
            The <span className="ih-italic-red">load-bearing</span> problem.
          </h2>
          <div style={{ fontSize: 13, color: "var(--ih-ink-65)", marginTop: 10, maxWidth: 640, lineHeight: 1.5 }}>
            {lens.justification}
          </div>
        </div>
        <RagBadge score={selectedRag} />
      </div>

      {/* RAG editor */}
      <div className="ih-card" style={{ padding: 16, marginBottom: 20 }}>
        <div className="ih-eyebrow" style={{ marginBottom: 10 }}>RAG score · click to change</div>
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          {(["RED", "AMBER", "GREEN"] as RagScore[]).map((r) => {
            const t = RAG_TONE[r]
            const active = r === selectedRag
            return (
              <button key={r} onClick={() => onRagChange(r)} style={{
                flex: 1, padding: "12px 14px", textAlign: "left",
                border: `1px solid ${active ? t.color : "var(--ih-line)"}`,
                background: active ? t.bg : "var(--ih-surface)",
                borderRadius: "var(--ih-r-md)", cursor: "pointer",
              }}>
                <div className="ih-mono" style={{ fontSize: 10, color: t.color, fontWeight: 600, letterSpacing: "0.1em" }}>● {r}</div>
                <div style={{ fontSize: 11, color: "var(--ih-ink-65)", marginTop: 4 }}>
                  {r === "RED" ? "Material risk to operations — needs urgent work." : r === "AMBER" ? "Working but with significant gaps." : "Performing well. No structural issues."}
                </div>
              </button>
            )
          })}
        </div>
        <div className="ih-eyebrow" style={{ marginBottom: 6 }}>Justification</div>
        <div style={{ padding: "10px 12px", border: "1px solid var(--ih-line)", borderRadius: "var(--ih-r-md)", fontSize: 12.5, lineHeight: 1.5, background: "var(--ih-surface-2)" }}>
          {lens.justification}
        </div>
      </div>

      {/* Current state */}
      <div className="ih-card" style={{ padding: 16, marginBottom: 20 }}>
        <div className="ih-eyebrow" style={{ marginBottom: 8 }}>Current state · what we observed</div>
        <div style={{ fontSize: 13, lineHeight: 1.6 }}>{lens.current}</div>
        <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
          <span className="ih-pill" style={{ fontSize: 10 }}><Icon name="file" size={10} /> 12 interview notes</span>
          <span className="ih-pill" style={{ fontSize: 10 }}><Icon name="file" size={10} /> Time-on-task spreadsheet</span>
          <span className="ih-pill" style={{ fontSize: 10 }}><Icon name="file" size={10} /> Inventory audit · 412 rows</span>
        </div>
      </div>

      {/* Findings table */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div className="ih-eyebrow">Findings · {lens.findings.length} · total {fmtGBP(lens.waste)} / yr</div>
        <button className="ih-btn ih-btn-quiet ih-btn-sm"><Icon name="plus" size={11} /> Add finding</button>
      </div>
      <div className="ih-card" style={{ marginBottom: 22, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ background: "var(--ih-surface-2)", borderBottom: "1px solid var(--ih-line)" }}>
              {["#", "Finding", "Impact", "Evidence", "£ / yr"].map((h, i) => (
                <th key={h} style={{ textAlign: i === 4 ? "right" : "left", padding: "8px 12px", fontFamily: "var(--ih-font-mono)", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--ih-ink-40)", fontWeight: 500 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lens.findings.map((f, i) => (
              <tr key={i} style={{ borderBottom: "1px solid var(--ih-line)" }}>
                <td style={{ padding: "10px 12px", fontFamily: "var(--ih-font-mono)", color: "var(--ih-ink-40)" }}>{i + 1}</td>
                <td style={{ padding: "10px 12px" }}>{f.t}</td>
                <td style={{ padding: "10px 12px" }}><ImpactBadge impact={f.impact} /></td>
                <td style={{ padding: "10px 12px", color: "var(--ih-ink-50)", fontSize: 11 }}>{f.ev}</td>
                <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 600, fontFamily: "var(--ih-font-mono)" }}>{fmtGBP(f.waste)}</td>
              </tr>
            ))}
            <tr style={{ background: "var(--ih-surface-2)" }}>
              <td colSpan={4} style={{ padding: "10px 12px", textAlign: "right", fontFamily: "var(--ih-font-mono)", color: "var(--ih-ink-50)", textTransform: "uppercase", letterSpacing: "0.1em", fontSize: 10 }}>Total annual waste</td>
              <td style={{ padding: "10px 12px", textAlign: "right", fontFamily: "var(--ih-font-mono)", fontWeight: 700, color: tone.color, fontSize: 13 }}>{fmtGBP(lens.waste)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Recommendations */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div className="ih-eyebrow">Recommendations · {lens.recs.length}</div>
        <button className="ih-btn ih-btn-quiet ih-btn-sm"><Icon name="plus" size={11} /> Add rec</button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {lens.recs.map((r, i) => (
          <div key={i} className="ih-card" style={{ padding: 14, display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 28, height: 28, borderRadius: "var(--ih-r-md)",
              background: "var(--ih-accent-soft-2)", color: "var(--ih-accent)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: "var(--ih-font-mono)", fontSize: 11, fontWeight: 600,
            }}>{i + 1}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{r.t}</div>
              <div className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-50)", marginTop: 3, letterSpacing: "0.06em" }}>EFFORT {r.effort} · INVEST {fmtGBP(r.cost)}</div>
            </div>
            <button className="ih-btn ih-btn-quiet ih-btn-sm"><Icon name="arrowRight" size={11} /> Promote to milestone</button>
          </div>
        ))}
      </div>
    </>
  )
}

/* ── Page ───────────────────────────────────────────────────────────────── */

export default function AuditWorkspacePage() {
  const [activeLens, setActiveLens] = useState<string | null>(null)
  const [ragOverrides, setRagOverrides] = useState<Record<string, RagScore>>({})
  const selectedLens = LENSES.find(l => l.id === activeLens)

  const handleRagChange = (lensId: string, rag: RagScore) => {
    setRagOverrides(prev => ({ ...prev, [lensId]: rag }))
  }

  const getRag = (lens: Lens): RagScore => ragOverrides[lens.id] ?? lens.rag

  if (selectedLens) {
    return (
      <div style={{ display: "flex", height: "calc(100vh - 120px)", margin: "-24px -24px 0" }}>
        {/* Lens nav rail */}
        <aside style={{ width: 220, borderRight: "1px solid var(--ih-line)", padding: "16px 12px", flexShrink: 0, overflowY: "auto" }}>
          <div className="ih-eyebrow" style={{ marginBottom: 10 }}>Lenses · AS-0027</div>
          {LENSES.map((l) => {
            const active = l.id === selectedLens.id
            const lRag = getRag(l)
            const t = RAG_TONE[lRag]
            return (
              <div key={l.id} onClick={() => setActiveLens(l.id)} style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "10px 10px", borderRadius: "var(--ih-r-md)", marginBottom: 4,
                background: active ? "var(--ih-accent-soft-2)" : "transparent",
                border: active ? "1px solid var(--ih-accent-soft)" : "1px solid transparent",
                cursor: "pointer",
              }}>
                <Icon name={l.icon} size={13} style={{ color: active ? "var(--ih-accent)" : "var(--ih-ink-50)" }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: active ? 600 : 500 }}>{l.name}</div>
                  <div className="ih-mono" style={{ fontSize: 9.5, color: t.color }}>● {lRag} · {fmtGBP(l.waste)}</div>
                </div>
              </div>
            )
          })}

          <div className="ih-hr" style={{ margin: "14px 0" }} />
          <div className="ih-eyebrow" style={{ marginBottom: 6 }}>Lens summary</div>
          <div className="ih-num ih-serif" style={{ fontSize: 20, color: RAG_TONE[getRag(selectedLens)].color, lineHeight: 1 }}>{fmtGBP(selectedLens.waste)}</div>
          <div style={{ fontSize: 10.5, color: "var(--ih-ink-50)", marginTop: 4 }}>annual waste · {selectedLens.findings.length} findings</div>
          <button className="ih-btn ih-btn-quiet ih-btn-sm" onClick={() => setActiveLens(null)} style={{ marginTop: 14, width: "100%" }}>
            <Icon name="chevronLeft" size={11} /> Back to overview
          </button>
        </aside>

        <section className="scrollbar-thin" style={{ flex: 1, overflowY: "auto", padding: "24px 28px" }}>
          <LensDetail lens={selectedLens} selectedRag={getRag(selectedLens)} onRagChange={(r) => handleRagChange(selectedLens.id, r)} />
        </section>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 20 }}>
        <div>
          <div className="ih-eyebrow" style={{ marginBottom: 6 }}>Audit workspace · session AS-0027</div>
          <h1 className="ih-serif" style={{ fontSize: 30, margin: 0 }}>
            Northwind · <span className="ih-italic-red">five-lens</span> audit
          </h1>
          <div style={{ display: "flex", gap: 14, alignItems: "center", marginTop: 8, fontSize: 12, color: "var(--ih-ink-50)" }}>
            <span className="ih-pill ih-pill-warn" style={{ fontSize: 9 }}>● IN_PROGRESS</span>
            <span className="ih-mono">day 14 / 21</span>
            <span>·</span>
            <span>12 interviews logged</span>
            <span>·</span>
            <span>4 of 5 lenses scored</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 18, fontSize: 11 }}>
          {[
            { l: "Total annual waste", v: fmtGBP(TOTAL_WASTE), tone: "var(--ih-accent)" },
            { l: "Implementation cost", v: fmtGBP(TOTAL_INVEST), tone: "var(--ih-ink)" },
            { l: "ROI multiple", v: (TOTAL_WASTE / TOTAL_INVEST).toFixed(1) + "×", tone: "var(--ih-ok)" },
            { l: "Payback", v: "~62 days", tone: "var(--ih-ink)" },
          ].map((s) => (
            <div key={s.l} style={{ textAlign: "right" }}>
              <div className="ih-eyebrow" style={{ fontSize: 9, marginBottom: 4 }}>{s.l}</div>
              <div className="ih-serif ih-num" style={{ fontSize: 26, color: s.tone, lineHeight: 1 }}>{s.v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Validation strip */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "10px 14px", marginBottom: 18,
        background: "var(--ih-surface-2)", border: "1px solid var(--ih-line)", borderRadius: "var(--ih-r-md)",
      }}>
        <Icon name="sparkles" size={12} style={{ color: "var(--ih-accent)" }} />
        <span className="ih-eyebrow" style={{ color: "var(--ih-accent)" }}>Readiness · session validator</span>
        <div style={{ display: "flex", gap: 6, alignItems: "center", flex: 1, paddingLeft: 10, borderLeft: "1px solid var(--ih-line)" }}>
          {[
            { l: "All 5 lenses scored",        ok: true },
            { l: "Each lens has ≥ 1 finding",  ok: true },
            { l: "Each lens has ≥ 1 rec",      ok: true },
            { l: "RAG justifications filled",  ok: false },
            { l: "Call notes attached",        ok: true },
          ].map((c) => (
            <span key={c.l} style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: c.ok ? "var(--ih-ok)" : "var(--ih-warn)" }}>
              <Icon name={c.ok ? "check" : "x"} size={10} stroke={2.5} /> {c.l}
            </span>
          ))}
        </div>
        <button className="ih-btn ih-btn-quiet ih-btn-sm">Fix 1 issue →</button>
      </div>

      {/* Lens grid */}
      <div className="ih-eyebrow" style={{ marginBottom: 10 }}>Five lenses · click to open</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, marginBottom: 24 }}>
        {LENSES.map((l) => (
          <div key={l.id} onClick={() => setActiveLens(l.id)}>
            <LensCard lens={l} />
          </div>
        ))}
      </div>

      {/* Bottom panels */}
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 16 }}>
        <div className="ih-card" style={{ padding: 16 }}>
          <div className="ih-eyebrow" style={{ marginBottom: 12 }}>Top findings · sorted by £ waste</div>
          {LENSES.flatMap(l => l.findings.map(f => ({ ...f, lens: l.name, lensId: l.id, rag: l.rag })))
            .sort((a, b) => b.waste - a.waste).slice(0, 6).map((f, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "28px 100px 1fr 80px 70px", gap: 10, padding: "9px 0", borderBottom: "1px dashed var(--ih-line)", alignItems: "center" }}>
              <span className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)" }}>/0{i + 1}</span>
              <span className="ih-mono" style={{ fontSize: 9.5, color: RAG_TONE[f.rag].color, textTransform: "uppercase", letterSpacing: "0.06em" }}>● {f.lens}</span>
              <span style={{ fontSize: 12 }}>{f.t}</span>
              <ImpactBadge impact={f.impact} />
              <span className="ih-num" style={{ fontSize: 12, fontWeight: 600, textAlign: "right" }}>{fmtGBP(f.waste)}</span>
            </div>
          ))}
        </div>
        <div className="ih-card" style={{ padding: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div className="ih-eyebrow">Call notes · 4</div>
            <button className="ih-btn ih-btn-quiet ih-btn-sm"><Icon name="plus" size={11} /> Add</button>
          </div>
          {[
            { who: "Sarah Chen",   role: "Head of Ops",  date: "Mar 26", min: 62, tag: "OPERATIONS" },
            { who: "Tom Hardy",    role: "COO",          date: "Mar 27", min: 48, tag: "FINANCE" },
            { who: "Priya Patel",  role: "CFO",          date: "Mar 28", min: 55, tag: "FINANCE" },
            { who: "Alex Wong",    role: "Eng lead",     date: "Mar 29", min: 71, tag: "TECHNOLOGY" },
          ].map((n) => (
            <div key={n.who} style={{ display: "flex", gap: 10, padding: "8px 0", borderBottom: "1px dashed var(--ih-line)" }}>
              <div className="ih-avatar" style={{ background: "var(--ih-surface-2)", color: "var(--ih-accent)" }}>{n.who.split(" ").map(s => s[0]).join("")}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 500 }}>{n.who} <span style={{ color: "var(--ih-ink-50)", fontWeight: 400 }}>· {n.role}</span></div>
                <div className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)" }}>{n.date} · {n.min}min · feeds {n.tag}</div>
              </div>
              <Icon name="arrowUpRight" size={11} style={{ color: "var(--ih-ink-40)" }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
