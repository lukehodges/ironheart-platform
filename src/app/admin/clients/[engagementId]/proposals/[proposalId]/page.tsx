"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Icon } from "@/components/shell"

/* ------------------------------------------------------------------ */
/*  Demo data — Northwind Q2 Retainer proposal                        */
/* ------------------------------------------------------------------ */

const PROPOSAL = {
  id: "prop_0481_v2",
  version: 2,
  status: "DRAFT" as "DRAFT" | "SENT" | "APPROVED",
  client: "Northwind Co.",
  engagement: "Q2 Retainer",
  date: "28 February 2025",
  totalValue: "£24,500",
  problemStatement:
    "Every time we take on a new tenant, someone here spends the best part of a morning chasing references, copying data between spreadsheets, and emailing PDFs back and forth. We know we should automate it but we don\u2019t have the in-house skill to do it properly.",
  sections: [
    {
      title: "Phase 1: Quick Wins",
      type: "Phase",
      duration: "2 weeks",
      items: [
        { title: "Stripe \u2192 Airtable sync", description: "Automate payment data flow from Stripe webhooks into the operations Airtable base.", criteria: "Zero manual data entry for new payments within 24h of go-live." },
        { title: "Approval workflow", description: "Replace email-based approval chains with a structured digital workflow.", criteria: "Approvals completed in < 2 business days on average." },
      ],
    },
    {
      title: "Phase 2: Core Fixes",
      type: "Phase",
      duration: "4 weeks",
      items: [
        { title: "Client portal v2", description: "Rebuild the client-facing portal with real-time status, document access, and session booking.", criteria: "Client NPS \u2265 8 within 30 days of launch." },
        { title: "Monthly digest email", description: "Automated monthly summary email to all active clients with engagement metrics.", criteria: "100% delivery rate, < 2% unsubscribe." },
      ],
    },
    {
      title: "Phase 3: Strategic",
      type: "Phase",
      duration: "6 weeks",
      items: [
        { title: "Predictive workload model", description: "ML-assisted forecasting of team capacity based on historical booking and delivery data.", criteria: "Forecast accuracy within 15% of actual." },
        { title: "Renewal automation", description: "Automated renewal pipeline triggered 60 days before contract end.", criteria: "90% of renewals initiated automatically." },
      ],
    },
  ],
  exclusions: [
    "Changes to existing CRM or ERP systems not covered in scope",
    "Third-party API licensing costs (Stripe, Airtable, etc.)",
    "Ongoing hosting or infrastructure beyond the engagement period",
    "Staff training beyond two 60-minute handover sessions",
  ],
  requirements: [
    "Admin access to Airtable base within 2 business days of kickoff",
    "Stripe API keys (test + live) provided before sprint 1",
    "Nominated point of contact available for 30-min weekly check-ins",
    "Feedback on deliverables within 3 business days of delivery",
  ],
  paymentSchedule: [
    { label: "Deposit on signature", pct: "30%", amount: "£7,350", trigger: "On approval" },
    { label: "Phase 2 completion", pct: "40%", amount: "£9,800", trigger: "Milestone complete" },
    { label: "Final handover", pct: "30%", amount: "£7,350", trigger: "Milestone complete" },
  ],
  roi: {
    hoursPerWeek: 8,
    automationPct: 80,
    hourlyRate: 45,
    annualValue: 14976,
    additionalLabel: "Error reduction savings",
    additionalValue: 6000,
    totalAnnual: 20976,
    feeAsPct: "117%",
  },
  terms: `1. This proposal is valid for 30 days from the date of issue.
2. Payment terms are as outlined in the payment schedule above.
3. Late payments will incur interest at 4% above the Bank of England base rate.
4. Either party may terminate with 14 days written notice. Work completed to date will be invoiced.
5. All intellectual property created during this engagement transfers to the client upon final payment.
6. Luke Hodges trading as Ironheart Consulting. Company registration pending.`,
  versions: [
    { version: 2, date: "28 Feb 2025", note: "Added Phase 3 strategic scope", author: "Luke" },
    { version: 1, date: "20 Feb 2025", note: "Initial proposal", author: "Luke" },
  ],
  clientActivity: [
    { event: "Opened", time: "1 Mar 2025 · 09:14", detail: "Mira Sato" },
    { event: "Viewed Phase 1", time: "1 Mar 2025 · 09:16", detail: "2m 30s" },
    { event: "Viewed Payment schedule", time: "1 Mar 2025 · 09:19", detail: "1m 45s" },
    { event: "Re-opened", time: "3 Mar 2025 · 14:22", detail: "Mira Sato" },
    { event: "Forwarded", time: "3 Mar 2025 · 14:30", detail: "to lara@northwind.co" },
  ],
}

/* ------------------------------------------------------------------ */
/*  Status pill helper                                                 */
/* ------------------------------------------------------------------ */

function ProposalStatusPill({ status }: { status: string }) {
  const tone = status === "APPROVED" ? "ok" : status === "SENT" ? "warn" : "muted"
  return (
    <span className={`ih-pill ih-pill-${tone}`} style={{ fontSize: 10 }}>
      <span className={`ih-dot ih-dot-${tone}`} /> {status}
    </span>
  )
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function ProposalDetailPage() {
  const router = useRouter()
  const [status] = useState(PROPOSAL.status)
  const p = PROPOSAL

  const statusStages = ["DRAFT", "SENT", "APPROVED"]
  const currentIdx = statusStages.indexOf(status)

  return (
    <div style={{ margin: "-24px -24px" }}>
      {/* Header bar */}
      <div style={{ padding: "20px 28px 16px", borderBottom: "1px solid var(--ih-line)", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <button
            onClick={() => router.back()}
            style={{ background: "none", border: "none", padding: 0, display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--ih-ink-50)", cursor: "pointer", marginBottom: 10 }}
          >
            <Icon name="chevronLeft" size={11} /> Back to {p.client}
          </button>
          <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 6 }}>
            <h1 className="ih-serif" style={{ margin: 0, fontSize: 28 }}>Proposal v{p.version}</h1>
            <ProposalStatusPill status={status} />
          </div>
          <div style={{ display: "flex", gap: 14, fontSize: 12, color: "var(--ih-ink-50)" }}>
            <span>{p.client}</span>
            <span>{"·"}</span>
            <span>{p.engagement}</span>
            <span>{"·"}</span>
            <span>{p.date}</span>
            <span>{"·"}</span>
            <span className="ih-mono" style={{ fontWeight: 600, color: "var(--ih-ink)" }}>{p.totalValue}</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, marginTop: 24 }}>
          <button className="ih-btn ih-btn-ghost ih-btn-sm"><Icon name="sliders" size={11} /> Edit</button>
          <button className="ih-btn ih-btn-ghost ih-btn-sm"><Icon name="mail" size={11} /> Send to Client</button>
          <button className="ih-btn ih-btn-ghost ih-btn-sm"><Icon name="download" size={11} /> PDF</button>
          <button className="ih-btn ih-btn-ghost ih-btn-sm"><Icon name="code" size={11} /> Clone</button>
        </div>
      </div>

      {/* Status pipeline */}
      <div style={{ padding: "12px 28px", borderBottom: "1px solid var(--ih-line)", display: "flex", gap: 4 }}>
        {statusStages.map((s, i) => (
          <div key={s} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= currentIdx ? (i === currentIdx ? "var(--ih-accent)" : "var(--ih-ok)") : "var(--ih-line)" }} title={s} />
        ))}
      </div>

      {/* Body: two columns */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 0 }}>
        {/* Main content */}
        <div style={{ padding: "24px 28px 60px", borderRight: "1px solid var(--ih-line)" }}>
          {/* Problem statement */}
          <div style={{ marginBottom: 32 }}>
            <div className="ih-eyebrow" style={{ marginBottom: 10 }}>Problem statement</div>
            <div style={{ padding: "16px 20px", borderLeft: "3px solid var(--ih-accent)", background: "var(--ih-surface-2)", borderRadius: "0 8px 8px 0", fontSize: 14, lineHeight: 1.65, fontStyle: "italic", color: "var(--ih-ink-65)" }}>
              &ldquo;{p.problemStatement}&rdquo;
            </div>
          </div>

          {/* Scope sections */}
          {p.sections.map((section, si) => (
            <div key={si} style={{ marginBottom: 28 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div>
                  <div className="ih-eyebrow" style={{ marginBottom: 4 }}>{section.type} {"·"} {section.duration}</div>
                  <h3 style={{ margin: 0, fontSize: 16, fontFamily: "var(--ih-font-serif)" }}>{section.title}</h3>
                </div>
              </div>
              <div className="ih-card" style={{ padding: 0 }}>
                {section.items.map((item, ii) => (
                  <div key={ii} style={{ padding: "14px 18px", borderTop: ii === 0 ? "0" : "1px solid var(--ih-line)" }}>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{item.title}</div>
                    <div style={{ fontSize: 12.5, color: "var(--ih-ink-65)", lineHeight: 1.55, marginBottom: 8 }}>{item.description}</div>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 6, fontSize: 11.5, color: "var(--ih-ink-50)" }}>
                      <Icon name="check" size={11} style={{ color: "var(--ih-ok)", marginTop: 2, flexShrink: 0 }} />
                      <span>{item.criteria}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Exclusions */}
          <div style={{ marginBottom: 28 }}>
            <div className="ih-eyebrow" style={{ marginBottom: 10 }}>What&apos;s not included</div>
            <div className="ih-card" style={{ padding: "14px 18px" }}>
              {p.exclusions.map((ex, i) => (
                <div key={i} style={{ display: "flex", gap: 8, padding: "4px 0", fontSize: 12.5, color: "var(--ih-ink-65)" }}>
                  <span style={{ color: "var(--ih-ink-40)" }}>&mdash;</span>
                  <span>{ex}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Requirements */}
          <div style={{ marginBottom: 28 }}>
            <div className="ih-eyebrow" style={{ marginBottom: 10 }}>What we need from you</div>
            <div className="ih-card" style={{ padding: "14px 18px" }}>
              {p.requirements.map((req, i) => (
                <div key={i} style={{ display: "flex", gap: 10, padding: "5px 0", fontSize: 12.5, alignItems: "flex-start" }}>
                  <div style={{ width: 20, height: 20, borderRadius: "50%", border: "1px solid var(--ih-line)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 600, color: "var(--ih-ink-40)", flexShrink: 0 }}>{i + 1}</div>
                  <span style={{ color: "var(--ih-ink-65)" }}>{req}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Payment schedule */}
          <div style={{ marginBottom: 28 }}>
            <div className="ih-eyebrow" style={{ marginBottom: 10 }}>Payment schedule</div>
            <div className="ih-card" style={{ padding: 0 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 60px 90px 140px", gap: 10, padding: "10px 18px", borderBottom: "1px solid var(--ih-line)" }}>
                {["Milestone", "%", "Amount", "Trigger"].map(h => (
                  <div key={h} className="ih-mono" style={{ fontSize: 9, color: "var(--ih-ink-40)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{h}</div>
                ))}
              </div>
              {p.paymentSchedule.map((pm, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 60px 90px 140px", gap: 10, padding: "10px 18px", borderTop: i === 0 ? "0" : "1px solid var(--ih-line)", fontSize: 12.5 }}>
                  <span style={{ fontWeight: 500 }}>{pm.label}</span>
                  <span className="ih-mono" style={{ color: "var(--ih-ink-50)" }}>{pm.pct}</span>
                  <span className="ih-mono" style={{ fontWeight: 600 }}>{pm.amount}</span>
                  <span style={{ color: "var(--ih-ink-50)", fontSize: 11.5 }}>{pm.trigger}</span>
                </div>
              ))}
              <div style={{ padding: "10px 18px", borderTop: "1px solid var(--ih-line)", display: "flex", justifyContent: "space-between", background: "var(--ih-surface-2)" }}>
                <span style={{ fontWeight: 600, fontSize: 12.5 }}>Total</span>
                <span className="ih-mono" style={{ fontWeight: 700, fontSize: 13 }}>{p.totalValue}</span>
              </div>
            </div>
          </div>

          {/* ROI calculator */}
          <div style={{ marginBottom: 28 }}>
            <div className="ih-eyebrow" style={{ marginBottom: 10 }}>ROI calculator</div>
            <div className="ih-card" style={{ padding: "16px 18px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 16 }}>
                {([
                  ["Hours saved / week", `${p.roi.hoursPerWeek}h`],
                  ["Automation potential", `${p.roi.automationPct}%`],
                  ["Internal hourly rate", `£${p.roi.hourlyRate}`],
                ] as [string, string][]).map(([label, val]) => (
                  <div key={label}>
                    <div className="ih-eyebrow" style={{ marginBottom: 4 }}>{label}</div>
                    <div className="ih-serif" style={{ fontSize: 20, lineHeight: 1 }}>{val}</div>
                  </div>
                ))}
              </div>
              <div style={{ borderTop: "1px solid var(--ih-line)", paddingTop: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 6 }}>
                  <span style={{ color: "var(--ih-ink-65)" }}>Time recovered annually</span>
                  <span className="ih-mono">£{p.roi.annualValue.toLocaleString()}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 6 }}>
                  <span style={{ color: "var(--ih-ink-65)" }}>{p.roi.additionalLabel}</span>
                  <span className="ih-mono">£{p.roi.additionalValue.toLocaleString()}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 600, paddingTop: 8, borderTop: "1px solid var(--ih-line)" }}>
                  <span>Total annual value</span>
                  <span className="ih-mono">£{p.roi.totalAnnual.toLocaleString()}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, color: "var(--ih-ink-50)", marginTop: 4 }}>
                  <span>Fee as % of year-one value</span>
                  <span className="ih-mono">{p.roi.feeAsPct}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Terms */}
          <div>
            <div className="ih-eyebrow" style={{ marginBottom: 10 }}>Terms &amp; conditions</div>
            <div className="ih-card" style={{ padding: "14px 18px" }}>
              <pre style={{ margin: 0, fontFamily: "inherit", fontSize: 12, lineHeight: 1.7, color: "var(--ih-ink-65)", whiteSpace: "pre-wrap" }}>{p.terms}</pre>
            </div>
          </div>
        </div>

        {/* Right panel */}
        <div style={{ padding: "24px 20px 60px", background: "var(--ih-surface-2)" }}>
          {/* Version history */}
          <div className="ih-card" style={{ marginBottom: 14, background: "var(--ih-surface)" }}>
            <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--ih-line)" }}>
              <span className="ih-eyebrow">Version history {"·"} {p.versions.length}</span>
            </div>
            <div>
              {p.versions.map((v, i) => (
                <div key={v.version} style={{ padding: "10px 14px", borderTop: i === 0 ? "0" : "1px solid var(--ih-line)", cursor: "pointer" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 12.5, fontWeight: i === 0 ? 600 : 400 }}>v{v.version}</span>
                    {i === 0 && <span className="ih-pill ih-pill-accent" style={{ fontSize: 8 }}>current</span>}
                  </div>
                  <div style={{ fontSize: 11.5, color: "var(--ih-ink-65)" }}>{v.note}</div>
                  <div className="ih-mono" style={{ fontSize: 9.5, color: "var(--ih-ink-40)", marginTop: 4 }}>{v.author} {"·"} {v.date}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Client view activity */}
          <div className="ih-card" style={{ background: "var(--ih-surface)" }}>
            <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--ih-line)" }}>
              <span className="ih-eyebrow">Client activity</span>
            </div>
            <div>
              {p.clientActivity.map((a, i) => (
                <div key={i} style={{ padding: "8px 14px", borderTop: i === 0 ? "0" : "1px solid var(--ih-line)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 2 }}>
                    <span style={{ fontWeight: 500 }}>{a.event}</span>
                    <span style={{ fontSize: 11, color: "var(--ih-ink-50)" }}>{a.detail}</span>
                  </div>
                  <div className="ih-mono" style={{ fontSize: 9.5, color: "var(--ih-ink-40)" }}>{a.time}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
