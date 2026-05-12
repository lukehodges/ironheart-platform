"use client"

import Link from "next/link"
import { Icon } from "@/components/shell"
import { NotificationToast } from "@/components/shared"
import { useState, useRef } from "react"

/* ── Demo Data ─────────────────────────────────────────────────────────── */

type FieldType = "text" | "textarea" | "select" | "number" | "rating" | "boolean" | "date" | "signature"

type FormField = {
  id: string; label: string; type: FieldType; required: boolean;
  placeholder?: string; options?: string[]; helpText?: string; value?: string;
}

const FIELD_TYPES: { type: FieldType; label: string; icon: "file" | "list" | "check" | "star" | "calendar" | "code" }[] = [
  { type: "text", label: "Short text", icon: "file" },
  { type: "textarea", label: "Long text", icon: "file" },
  { type: "select", label: "Dropdown", icon: "list" },
  { type: "number", label: "Number", icon: "code" },
  { type: "rating", label: "Rating", icon: "star" },
  { type: "boolean", label: "Yes / No", icon: "check" },
  { type: "date", label: "Date", icon: "calendar" },
  { type: "signature", label: "Signature", icon: "code" },
]

const INITIAL_FIELDS: FormField[] = [
  { id: "f1", label: "Full name", type: "text", required: true, placeholder: "Enter your full name", value: "Sarah Chen" },
  { id: "f2", label: "Role / Title", type: "text", required: true, placeholder: "e.g. Managing Director", value: "CEO" },
  { id: "f3", label: "Years in current role", type: "number", required: true, placeholder: "e.g. 5", value: "8" },
  { id: "f4", label: "What is your primary business goal for the next 12 months?", type: "textarea", required: true, placeholder: "Describe your main strategic objective...", value: "Scale revenue from $2.4M to $4M while maintaining current margins and team culture." },
  { id: "f5", label: "How would you rate your current operational efficiency?", type: "rating", required: true, value: "4" },
  { id: "f6", label: "Biggest challenge facing the business right now", type: "select", required: true, options: ["Revenue growth", "Talent retention", "Cash flow", "Operations", "Market competition", "Other"], value: "Talent retention" },
  { id: "f7", label: "Do you have a documented strategic plan?", type: "boolean", required: false, value: "Yes" },
  { id: "f8", label: "What keeps you up at night about the business?", type: "textarea", required: false, placeholder: "Open-ended — share whatever is top of mind", value: "Worried about losing key team members to competitors offering remote-first policies. Also concerned about cash conversion cycle lengthening." },
  { id: "f9", label: "Preferred engagement start date", type: "date", required: false, value: "2026-06-01" },
  { id: "f10", label: "Signature", type: "signature", required: true },
]

/* ── Page ──────────────────────────────────────────────────────────────── */

export default function FormEditorPage() {
  const [fields, setFields] = useState(INITIAL_FIELDS)
  const [selectedId, setSelectedId] = useState<string | null>("f4")
  const [toast, setToast] = useState<{ message: string; tone?: string } | null>(null)
  const fieldIdCounter = useRef(INITIAL_FIELDS.length + 1)

  // Refs for inspector controlled inputs
  const labelRef = useRef<HTMLInputElement>(null)
  const typeRef = useRef<HTMLSelectElement>(null)
  const requiredRef = useRef<HTMLInputElement>(null)
  const placeholderRef = useRef<HTMLInputElement>(null)
  const optionsRef = useRef<HTMLTextAreaElement>(null)
  const helpRef = useRef<HTMLInputElement>(null)

  const addField = (type: FieldType = "text") => {
    const id = `f${fieldIdCounter.current++}`
    const ft = FIELD_TYPES.find(f => f.type === type)
    setFields(prev => [...prev, { id, label: `New ${ft?.label || type} field`, type, required: false }])
    setSelectedId(id)
  }

  const removeField = (id: string) => {
    setFields(prev => prev.filter(f => f.id !== id))
    if (selectedId === id) setSelectedId(null)
  }

  const applyFieldChanges = () => {
    if (!selectedId) return
    setFields(prev => prev.map(f => {
      if (f.id !== selectedId) return f
      return {
        ...f,
        label: labelRef.current?.value ?? f.label,
        type: (typeRef.current?.value as FieldType) ?? f.type,
        required: requiredRef.current?.checked ?? f.required,
        placeholder: placeholderRef.current?.value ?? f.placeholder,
        options: optionsRef.current ? optionsRef.current.value.split("\n").filter(Boolean) : f.options,
        helpText: helpRef.current?.value ?? f.helpText,
      }
    }))
    setToast({ message: "Field updated", tone: "ok" })
  }

  const selected = fields.find((f) => f.id === selectedId)

  return (
    <div style={{ margin: "-24px -24px 0", height: "calc(100vh - 64px)", display: "flex", flexDirection: "column" }}>
      {/* ── Top bar ─────────────────────────────────────────────── */}
      <div style={{ padding: "10px 18px", borderBottom: "1px solid var(--ih-line)", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Link href="/admin/forms" style={{ display: "flex", alignItems: "center", gap: 4, textDecoration: "none", color: "var(--ih-ink-50)" }}>
            <Icon name="chevronLeft" size={12}/>
            <span className="ih-eyebrow">Forms</span>
          </Link>
          <Icon name="chevronRight" size={10} style={{ color: "var(--ih-ink-30)" }}/>
          <span style={{ fontSize: 13, fontWeight: 500 }}>Owner / Director Questionnaire</span>
          <span className="ih-pill ih-pill-ok" style={{ marginLeft: 6 }}><span className="ih-dot ih-dot-ok"/> Active</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button className="ih-btn ih-btn-quiet ih-btn-sm" onClick={() => setToast({ message: "Preview mode opened", tone: "info" })}><Icon name="eye" size={11}/> Preview</button>
          <button className="ih-btn ih-btn-quiet ih-btn-sm" onClick={() => setToast({ message: "Link copied to clipboard", tone: "ok" })}><Icon name="link" size={11}/> Copy link</button>
          <button className="ih-btn ih-btn-quiet ih-btn-sm" style={{ color: "var(--ih-danger)" }} onClick={() => setToast({ message: "Template deleted", tone: "danger" })}><Icon name="x" size={11}/> Delete</button>
          <div style={{ width: 1, height: 20, background: "var(--ih-line)", margin: "0 4px" }}/>
          <button className="ih-btn ih-btn-primary ih-btn-sm" onClick={() => setToast({ message: "Template saved", tone: "ok" })}><Icon name="check" size={11}/> Save template</button>
        </div>
      </div>

      {/* ── Template settings bar ───────────────────────────────── */}
      <div style={{ padding: "10px 18px", borderBottom: "1px solid var(--ih-line)", display: "flex", gap: 20, alignItems: "center", background: "var(--ih-surface)", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)" }}>NAME</span>
          <input className="ih-input" defaultValue="Owner / Director" style={{ width: 180, fontSize: 12 }}/>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)" }}>DESCRIPTION</span>
          <input className="ih-input" defaultValue="Strategic leadership assessment" style={{ width: 240, fontSize: 12 }}/>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)" }}>SEND TIMING</span>
          <select className="ih-input" defaultValue="after_booking" style={{ fontSize: 12 }}>
            <option value="after_booking">After booking confirmed</option>
            <option value="before_session">24h before session</option>
            <option value="manual">Manual send only</option>
          </select>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)" }}>SIGNATURE</span>
          <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, cursor: "pointer" }}>
            <input type="checkbox" defaultChecked style={{ accentColor: "var(--ih-accent)" }}/> Required
          </label>
        </div>
        <div style={{ marginLeft: "auto" }}>
          <span className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)" }}>{fields.length} fields &middot; 31 submissions</span>
        </div>
      </div>

      {/* ── Body: preview + editor ──────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 420px", flex: 1, overflow: "hidden" }}>
        {/* ── Left: Live form preview (60%) ──────────────────── */}
        <div style={{ padding: "24px 32px", overflowY: "auto", background: "var(--ih-surface-2)" }}>
          <div style={{ maxWidth: 640, margin: "0 auto" }}>
            <div style={{ marginBottom: 24 }}>
              <span className="ih-eyebrow" style={{ marginBottom: 6 }}>Live preview</span>
              <h2 className="ih-serif" style={{ margin: "4px 0 0", fontSize: 26, lineHeight: 1.1 }}>Owner / Director Questionnaire</h2>
              <p style={{ margin: "6px 0 0", fontSize: 12, color: "var(--ih-ink-65)" }}>Strategic leadership assessment covering vision, governance, and growth planning</p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {fields.map((f, i) => (
                <div
                  key={f.id}
                  onClick={() => setSelectedId(f.id)}
                  className="ih-card"
                  style={{
                    padding: 16, cursor: "pointer",
                    border: selectedId === f.id ? "1.5px solid var(--ih-accent)" : undefined,
                    boxShadow: selectedId === f.id ? "0 0 0 3px var(--ih-accent-soft)" : undefined,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                    <label style={{ fontSize: 12, fontWeight: 500, lineHeight: 1.3 }}>
                      <span className="ih-mono" style={{ fontSize: 9, color: "var(--ih-ink-30)", marginRight: 6 }}>{i + 1}</span>
                      {f.label}
                      {f.required && <span style={{ color: "var(--ih-danger)", marginLeft: 3 }}>*</span>}
                    </label>
                    <span className="ih-mono" style={{ fontSize: 9, color: "var(--ih-ink-40)", textTransform: "uppercase" }}>{f.type}</span>
                  </div>

                  {/* Render preview based on type */}
                  {f.type === "text" && (
                    <input className="ih-input" readOnly value={f.value || ""} placeholder={f.placeholder} style={{ fontSize: 12 }}/>
                  )}
                  {f.type === "textarea" && (
                    <textarea className="ih-input" readOnly value={f.value || ""} placeholder={f.placeholder} rows={3} style={{ fontSize: 12, resize: "none" }}/>
                  )}
                  {f.type === "number" && (
                    <input className="ih-input" readOnly type="number" value={f.value || ""} placeholder={f.placeholder} style={{ fontSize: 12, width: 120 }}/>
                  )}
                  {f.type === "select" && (
                    <select className="ih-input" defaultValue={f.value || ""} style={{ fontSize: 12 }}>
                      <option value="">Select...</option>
                      {f.options?.map((o) => <option key={o}>{o}</option>)}
                    </select>
                  )}
                  {f.type === "rating" && (
                    <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Icon key={n} name="star" size={18} style={{ color: n <= Number(f.value || 0) ? "var(--ih-warn)" : "var(--ih-ink-30)" }}/>
                      ))}
                    </div>
                  )}
                  {f.type === "boolean" && (
                    <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                      {["Yes", "No"].map((v) => (
                        <button key={v} className={`ih-btn ih-btn-sm ${f.value === v ? "ih-btn-ghost" : "ih-btn-quiet"}`} style={{ fontWeight: f.value === v ? 500 : 400 }}>{v}</button>
                      ))}
                    </div>
                  )}
                  {f.type === "date" && (
                    <input className="ih-input" readOnly type="date" value={f.value || ""} style={{ fontSize: 12, width: 180 }}/>
                  )}
                  {f.type === "signature" && (
                    <div style={{ height: 60, border: "1px dashed var(--ih-line-2)", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", marginTop: 4 }}>
                      <span className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)" }}>Signature pad &middot; draw or type</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Right: Field editor (40%) ──────────────────────── */}
        <div style={{ borderLeft: "1px solid var(--ih-line)", background: "var(--ih-surface-2)", overflowY: "auto", display: "flex", flexDirection: "column" }}>
          {/* Field list */}
          <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--ih-line)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <span className="ih-eyebrow">Fields &middot; {fields.length}</span>
              <button className="ih-btn ih-btn-primary ih-btn-sm" style={{ height: 24, fontSize: 11 }} onClick={() => addField("text")}><Icon name="plus" size={10}/> Add field</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {fields.map((f, i) => (
                <div
                  key={f.id}
                  onClick={() => setSelectedId(f.id)}
                  style={{
                    display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", borderRadius: 6, cursor: "pointer",
                    background: selectedId === f.id ? "var(--ih-surface)" : "transparent",
                    border: selectedId === f.id ? "1px solid var(--ih-line-2)" : "1px solid transparent",
                  }}
                >
                  <Icon name="list" size={10} style={{ color: "var(--ih-ink-30)", cursor: "grab" }}/>
                  <span className="ih-mono" style={{ fontSize: 9, color: "var(--ih-ink-30)", width: 14 }}>{i + 1}</span>
                  <span style={{ fontSize: 11.5, fontWeight: selectedId === f.id ? 500 : 400, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.label}</span>
                  <span className="ih-mono" style={{ fontSize: 9, color: "var(--ih-ink-40)" }}>{f.type}</span>
                  {f.required && <span style={{ fontSize: 9, color: "var(--ih-danger)" }}>*</span>}
                </div>
              ))}
            </div>
          </div>

          {/* Selected field config */}
          {selected ? (
            <div style={{ padding: 16, flex: 1 }}>
              <div style={{ marginBottom: 14 }}>
                <span className="ih-eyebrow">Editing field &middot; #{fields.indexOf(selected) + 1}</span>
                <h3 style={{ margin: "4px 0 0", fontSize: 15, fontWeight: 600, lineHeight: 1.2 }}>{selected.label}</h3>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {/* Label */}
                <div>
                  <div className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-50)", marginBottom: 4 }}>Label</div>
                  <input key={selected.id + "-label"} ref={labelRef} className="ih-input" defaultValue={selected.label} style={{ fontSize: 12 }}/>
                </div>

                {/* Type */}
                <div>
                  <div className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-50)", marginBottom: 4 }}>Field type</div>
                  <select key={selected.id + "-type"} ref={typeRef} className="ih-input" defaultValue={selected.type} style={{ fontSize: 12 }}>
                    {FIELD_TYPES.map((ft) => <option key={ft.type} value={ft.type}>{ft.label}</option>)}
                  </select>
                </div>

                {/* Required */}
                <div>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, cursor: "pointer" }}>
                    <input key={selected.id + "-req"} ref={requiredRef} type="checkbox" defaultChecked={selected.required} style={{ accentColor: "var(--ih-accent)" }}/>
                    Required field
                  </label>
                </div>

                {/* Placeholder */}
                {(selected.type === "text" || selected.type === "textarea" || selected.type === "number") && (
                  <div>
                    <div className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-50)", marginBottom: 4 }}>Placeholder</div>
                    <input key={selected.id + "-ph"} ref={placeholderRef} className="ih-input" defaultValue={selected.placeholder || ""} style={{ fontSize: 12 }}/>
                  </div>
                )}

                {/* Options (for select) */}
                {selected.type === "select" && selected.options && (
                  <div>
                    <div className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-50)", marginBottom: 4 }}>Options (one per line)</div>
                    <textarea key={selected.id + "-opts"} ref={optionsRef} className="ih-input" defaultValue={selected.options.join("\n")} rows={5} style={{ fontSize: 12, resize: "vertical" }}/>
                  </div>
                )}

                {/* Help text */}
                <div>
                  <div className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-50)", marginBottom: 4 }}>Help text (optional)</div>
                  <input key={selected.id + "-help"} ref={helpRef} className="ih-input" defaultValue={selected.helpText || ""} placeholder="Shown below the field" style={{ fontSize: 12 }}/>
                </div>
              </div>

              {/* Actions */}
              <div style={{ marginTop: 20, display: "flex", gap: 6 }}>
                <button className="ih-btn ih-btn-ghost ih-btn-sm" style={{ flex: 1 }} onClick={applyFieldChanges}><Icon name="check" size={11}/> Apply</button>
                <button className="ih-btn ih-btn-quiet ih-btn-sm" style={{ color: "var(--ih-danger)" }} onClick={() => removeField(selected.id)}><Icon name="x" size={11}/> Remove</button>
              </div>
            </div>
          ) : (
            <div style={{ padding: 24, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1, textAlign: "center" }}>
              <Icon name="sliders" size={28} style={{ color: "var(--ih-ink-30)", marginBottom: 10 }}/>
              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>No field selected</div>
              <div style={{ fontSize: 11.5, color: "var(--ih-ink-50)" }}>Click a field in the preview or the list above to edit its configuration.</div>
            </div>
          )}

          {/* Add field types */}
          <div style={{ padding: 16, borderTop: "1px solid var(--ih-line)" }}>
            <div className="ih-eyebrow" style={{ marginBottom: 8 }}>Quick add</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 4 }}>
              {FIELD_TYPES.map((ft) => (
                <button key={ft.type} className="ih-btn ih-btn-quiet ih-btn-sm" style={{ justifyContent: "flex-start", fontSize: 11 }} onClick={() => addField(ft.type)}>
                  <Icon name={ft.icon} size={10}/> {ft.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {toast && <NotificationToast message={toast.message} tone={toast.tone as "ok"} onDismiss={() => setToast(null)} />}
    </div>
  )
}
