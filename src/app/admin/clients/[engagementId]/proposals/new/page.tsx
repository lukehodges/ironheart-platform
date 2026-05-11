"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Icon } from "@/components/shell"

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface SectionItem {
  id: string
  title: string
  description: string
  criteria: string
}

interface Section {
  id: string
  title: string
  type: "Phase" | "Recurring" | "Ad-hoc"
  duration: string
  description: string
  items: SectionItem[]
}

interface PaymentMilestone {
  id: string
  trigger: "On approval" | "Milestone complete" | "Fixed date" | "Recurring"
  label: string
  amount: string
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

let _counter = 0
function uid() { return `_${++_counter}_${Date.now()}` }

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  fontSize: 13,
  border: "1px solid var(--ih-line)",
  borderRadius: 8,
  background: "var(--ih-surface)",
  color: "var(--ih-ink)",
  outline: "none",
  fontFamily: "inherit",
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  fontWeight: 500,
  color: "var(--ih-ink-65)",
  marginBottom: 6,
  textTransform: "uppercase" as const,
  letterSpacing: "0.06em",
}

const DEFAULT_TERMS = `1. This proposal is valid for 30 days from the date of issue.
2. Payment terms are as outlined in the payment schedule above.
3. Late payments will incur interest at 4% above the Bank of England base rate.
4. Either party may terminate with 14 days written notice. Work completed to date will be invoiced.
5. All intellectual property created during this engagement transfers to the client upon final payment.
6. Luke Hodges trading as Ironheart Consulting. Company registration pending.`

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function NewProposalPage() {
  const router = useRouter()

  const [problemStatement, setProblemStatement] = useState("")
  const [sections, setSections] = useState<Section[]>([])
  const [exclusions, setExclusions] = useState<string[]>([""])
  const [requirements, setRequirements] = useState<string[]>([""])
  const [milestones, setMilestones] = useState<PaymentMilestone[]>([])
  const [roiHours, setRoiHours] = useState("")
  const [roiPct, setRoiPct] = useState("80")
  const [roiRate, setRoiRate] = useState("")
  const [terms, setTerms] = useState(DEFAULT_TERMS)

  /* Section management */
  const addSection = () => {
    setSections([...sections, { id: uid(), title: "", type: "Phase", duration: "", description: "", items: [] }])
  }
  const updateSection = (id: string, patch: Partial<Section>) => {
    setSections(sections.map(s => s.id === id ? { ...s, ...patch } : s))
  }
  const removeSection = (id: string) => {
    setSections(sections.filter(s => s.id !== id))
  }
  const addItem = (sectionId: string) => {
    setSections(sections.map(s => s.id === sectionId ? { ...s, items: [...s.items, { id: uid(), title: "", description: "", criteria: "" }] } : s))
  }
  const updateItem = (sectionId: string, itemId: string, patch: Partial<SectionItem>) => {
    setSections(sections.map(s => s.id === sectionId ? { ...s, items: s.items.map(it => it.id === itemId ? { ...it, ...patch } : it) } : s))
  }
  const removeItem = (sectionId: string, itemId: string) => {
    setSections(sections.map(s => s.id === sectionId ? { ...s, items: s.items.filter(it => it.id !== itemId) } : s))
  }

  /* Milestone management */
  const addMilestone = () => {
    setMilestones([...milestones, { id: uid(), trigger: "Milestone complete", label: "", amount: "" }])
  }
  const updateMilestone = (id: string, patch: Partial<PaymentMilestone>) => {
    setMilestones(milestones.map(m => m.id === id ? { ...m, ...patch } : m))
  }
  const removeMilestone = (id: string) => {
    setMilestones(milestones.filter(m => m.id !== id))
  }

  /* ROI calc */
  const h = parseFloat(roiHours) || 0
  const pct = parseFloat(roiPct) || 0
  const rate = parseFloat(roiRate) || 0
  const roiAnnual = h > 0 && rate > 0 ? Math.round(h * rate * 52 * (pct / 100)) : null

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "0 0 80px" }}>
      {/* Back link */}
      <button
        onClick={() => router.back()}
        style={{ background: "none", border: "none", padding: 0, display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--ih-ink-50)", cursor: "pointer", marginBottom: 16 }}
      >
        <Icon name="chevronLeft" size={11} /> Back to engagement
      </button>

      <h1 className="ih-serif" style={{ margin: "0 0 6px", fontSize: 28 }}>Create Proposal</h1>
      <p style={{ margin: "0 0 28px", fontSize: 13, color: "var(--ih-ink-50)" }}>
        Build a branded proposal with scope, payment schedule, and ROI.
      </p>

      {/* Problem statement */}
      <div className="ih-card" style={{ padding: 20, marginBottom: 16 }}>
        <div className="ih-eyebrow" style={{ marginBottom: 12 }}>Problem statement</div>
        <p style={{ margin: "0 0 10px", fontSize: 12, color: "var(--ih-ink-50)" }}>
          The client&apos;s problem in their own words — appears as a pull quote at the top of the proposal.
        </p>
        <textarea
          value={problemStatement}
          onChange={(e) => setProblemStatement(e.target.value)}
          placeholder={'"Every time we take on a new tenant, someone here spends the best part of a morning chasing references\u2026"'}
          rows={3}
          style={{ ...inputStyle, resize: "vertical", minHeight: 70 }}
        />
      </div>

      {/* Scope sections */}
      <div className="ih-card" style={{ padding: 20, marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div>
            <div className="ih-eyebrow" style={{ marginBottom: 4 }}>Scope sections</div>
            <p style={{ margin: 0, fontSize: 12, color: "var(--ih-ink-50)" }}>Add phases with line items and acceptance criteria.</p>
          </div>
          <button className="ih-btn ih-btn-accent ih-btn-sm" onClick={addSection}>
            <Icon name="plus" size={11} /> Add section
          </button>
        </div>

        {sections.length === 0 && (
          <div style={{ padding: "24px 0", textAlign: "center", color: "var(--ih-ink-40)", fontSize: 13 }}>
            No sections yet. Click &ldquo;Add section&rdquo; to start building scope.
          </div>
        )}

        {sections.map((section, si) => (
          <div key={section.id} style={{ border: "1px solid var(--ih-line)", borderRadius: 10, padding: 16, marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
              <div className="ih-eyebrow">Section {si + 1}</div>
              <button
                onClick={() => removeSection(section.id)}
                style={{ background: "none", border: "none", fontSize: 11, color: "var(--ih-ink-40)", cursor: "pointer" }}
              >
                <Icon name="x" size={12} />
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 120px 120px", gap: 10, marginBottom: 12 }}>
              <div>
                <label style={labelStyle}>Title</label>
                <input type="text" value={section.title} onChange={(e) => updateSection(section.id, { title: e.target.value })} placeholder="e.g. Phase 1: Quick Wins" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Type</label>
                <select value={section.type} onChange={(e) => updateSection(section.id, { type: e.target.value as Section["type"] })} style={{ ...inputStyle, cursor: "pointer" }}>
                  <option value="Phase">Phase</option>
                  <option value="Recurring">Recurring</option>
                  <option value="Ad-hoc">Ad-hoc</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Duration</label>
                <input type="text" value={section.duration} onChange={(e) => updateSection(section.id, { duration: e.target.value })} placeholder="e.g. 2 weeks" style={inputStyle} />
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Description</label>
              <textarea value={section.description} onChange={(e) => updateSection(section.id, { description: e.target.value })} placeholder="Overview of this section\u2019s scope" rows={2} style={{ ...inputStyle, resize: "vertical" }} />
            </div>

            {/* Line items */}
            <div style={{ marginBottom: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 500, color: "var(--ih-ink-65)" }}>Line items {"·"} {section.items.length}</span>
                <button className="ih-btn ih-btn-quiet ih-btn-sm" onClick={() => addItem(section.id)}>
                  <Icon name="plus" size={10} /> Add item
                </button>
              </div>
              {section.items.map((item) => (
                <div key={item.id} style={{ border: "1px solid var(--ih-line)", borderRadius: 8, padding: 12, marginBottom: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <input type="text" value={item.title} onChange={(e) => updateItem(section.id, item.id, { title: e.target.value })} placeholder="Deliverable title" style={{ ...inputStyle, fontWeight: 500 }} />
                    <button onClick={() => removeItem(section.id, item.id)} style={{ background: "none", border: "none", color: "var(--ih-ink-40)", cursor: "pointer", marginLeft: 8, flexShrink: 0 }}>
                      <Icon name="x" size={11} />
                    </button>
                  </div>
                  <textarea value={item.description} onChange={(e) => updateItem(section.id, item.id, { description: e.target.value })} placeholder="Description" rows={2} style={{ ...inputStyle, resize: "vertical", marginBottom: 8 }} />
                  <input type="text" value={item.criteria} onChange={(e) => updateItem(section.id, item.id, { criteria: e.target.value })} placeholder="Acceptance criteria" style={{ ...inputStyle, fontSize: 12, color: "var(--ih-ink-65)" }} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Exclusions */}
      <div className="ih-card" style={{ padding: 20, marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div>
            <div className="ih-eyebrow" style={{ marginBottom: 4 }}>What&apos;s not included</div>
            <p style={{ margin: 0, fontSize: 12, color: "var(--ih-ink-50)" }}>Explicit exclusions protect against scope creep.</p>
          </div>
          <button className="ih-btn ih-btn-quiet ih-btn-sm" onClick={() => setExclusions([...exclusions, ""])}>
            <Icon name="plus" size={10} /> Add
          </button>
        </div>
        {exclusions.map((ex, i) => (
          <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
            <span style={{ color: "var(--ih-ink-40)", fontSize: 13 }}>&mdash;</span>
            <input
              type="text"
              value={ex}
              onChange={(e) => setExclusions(exclusions.map((v, j) => j === i ? e.target.value : v))}
              placeholder="e.g. Changes to existing CRM setup"
              style={{ ...inputStyle, flex: 1 }}
            />
            <button onClick={() => setExclusions(exclusions.filter((_, j) => j !== i))} style={{ background: "none", border: "none", color: "var(--ih-ink-40)", cursor: "pointer" }}>
              <Icon name="x" size={11} />
            </button>
          </div>
        ))}
      </div>

      {/* Requirements */}
      <div className="ih-card" style={{ padding: 20, marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div>
            <div className="ih-eyebrow" style={{ marginBottom: 4 }}>What we need from you</div>
            <p style={{ margin: 0, fontSize: 12, color: "var(--ih-ink-50)" }}>Client responsibilities: access, data, response times.</p>
          </div>
          <button className="ih-btn ih-btn-quiet ih-btn-sm" onClick={() => setRequirements([...requirements, ""])}>
            <Icon name="plus" size={10} /> Add
          </button>
        </div>
        {requirements.map((req, i) => (
          <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
            <div style={{ width: 20, height: 20, borderRadius: "50%", border: "1px solid var(--ih-line)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 600, color: "var(--ih-ink-40)", flexShrink: 0 }}>{i + 1}</div>
            <input
              type="text"
              value={req}
              onChange={(e) => setRequirements(requirements.map((v, j) => j === i ? e.target.value : v))}
              placeholder="e.g. Admin access to Airtable base within 2 business days"
              style={{ ...inputStyle, flex: 1 }}
            />
            <button onClick={() => setRequirements(requirements.filter((_, j) => j !== i))} style={{ background: "none", border: "none", color: "var(--ih-ink-40)", cursor: "pointer" }}>
              <Icon name="x" size={11} />
            </button>
          </div>
        ))}
      </div>

      {/* Payment schedule */}
      <div className="ih-card" style={{ padding: 20, marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div>
            <div className="ih-eyebrow" style={{ marginBottom: 4 }}>Payment schedule</div>
            <p style={{ margin: 0, fontSize: 12, color: "var(--ih-ink-50)" }}>Define milestone payments with trigger types.</p>
          </div>
          <button className="ih-btn ih-btn-accent ih-btn-sm" onClick={addMilestone}>
            <Icon name="plus" size={11} /> Add milestone
          </button>
        </div>

        {milestones.length === 0 && (
          <div style={{ padding: "16px 0", textAlign: "center", color: "var(--ih-ink-40)", fontSize: 13 }}>
            No milestones yet.
          </div>
        )}

        {milestones.map((m, i) => (
          <div key={m.id} style={{ display: "grid", gridTemplateColumns: "140px 1fr 120px auto", gap: 8, marginBottom: 8, alignItems: "end" }}>
            <div>
              {i === 0 && <label style={labelStyle}>Trigger</label>}
              <select value={m.trigger} onChange={(e) => updateMilestone(m.id, { trigger: e.target.value as PaymentMilestone["trigger"] })} style={{ ...inputStyle, cursor: "pointer" }}>
                <option>On approval</option>
                <option>Milestone complete</option>
                <option>Fixed date</option>
                <option>Recurring</option>
              </select>
            </div>
            <div>
              {i === 0 && <label style={labelStyle}>Label</label>}
              <input type="text" value={m.label} onChange={(e) => updateMilestone(m.id, { label: e.target.value })} placeholder="e.g. Deposit on signature" style={inputStyle} />
            </div>
            <div>
              {i === 0 && <label style={labelStyle}>Amount</label>}
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: "var(--ih-ink-40)" }}>&pound;</span>
                <input type="text" value={m.amount} onChange={(e) => updateMilestone(m.id, { amount: e.target.value })} placeholder="0" style={{ ...inputStyle, paddingLeft: 24 }} />
              </div>
            </div>
            <button onClick={() => removeMilestone(m.id)} style={{ background: "none", border: "none", color: "var(--ih-ink-40)", cursor: "pointer", padding: "9px 4px" }}>
              <Icon name="x" size={11} />
            </button>
          </div>
        ))}
      </div>

      {/* ROI calculator */}
      <div className="ih-card" style={{ padding: 20, marginBottom: 16 }}>
        <div className="ih-eyebrow" style={{ marginBottom: 4 }}>ROI calculator</div>
        <p style={{ margin: "0 0 14px", fontSize: 12, color: "var(--ih-ink-50)" }}>Shown in the proposal to justify the fee. All optional.</p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <div>
            <label style={labelStyle}>Hours / week</label>
            <input type="number" value={roiHours} onChange={(e) => setRoiHours(e.target.value)} placeholder="e.g. 8" min="0" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Automation %</label>
            <input type="number" value={roiPct} onChange={(e) => setRoiPct(e.target.value)} placeholder="80" min="0" max="100" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Hourly rate</label>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: "var(--ih-ink-40)" }}>&pound;</span>
              <input type="text" value={roiRate} onChange={(e) => setRoiRate(e.target.value)} placeholder="0" style={{ ...inputStyle, paddingLeft: 24 }} />
            </div>
          </div>
        </div>

        {roiAnnual !== null && (
          <div style={{ marginTop: 14, padding: "12px 14px", border: "1px solid var(--ih-line)", borderRadius: 8, background: "var(--ih-surface-2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 4 }}>
              <span style={{ color: "var(--ih-ink-65)" }}>Time recovered annually</span>
              <span className="ih-mono">&pound;{roiAnnual.toLocaleString()}</span>
            </div>
          </div>
        )}
      </div>

      {/* Terms */}
      <div className="ih-card" style={{ padding: 20, marginBottom: 28 }}>
        <div className="ih-eyebrow" style={{ marginBottom: 12 }}>Terms &amp; conditions</div>
        <textarea
          value={terms}
          onChange={(e) => setTerms(e.target.value)}
          rows={6}
          style={{ ...inputStyle, resize: "vertical", minHeight: 100 }}
        />
      </div>

      {/* Actions */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 16, borderTop: "1px solid var(--ih-line)" }}>
        <button
          onClick={() => router.back()}
          style={{ background: "none", border: "none", fontSize: 13, color: "var(--ih-ink-50)", cursor: "pointer" }}
        >
          Cancel
        </button>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="ih-btn ih-btn-ghost">
            Save Draft
          </button>
          <button className="ih-btn ih-btn-ghost">
            <Icon name="eye" size={12} /> Preview
          </button>
          <button className="ih-btn ih-btn-accent" style={{ padding: "10px 20px" }}>
            <Icon name="mail" size={12} /> Send to Client
          </button>
        </div>
      </div>
    </div>
  )
}
