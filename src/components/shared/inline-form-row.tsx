"use client"

import { useState } from "react"
import { Icon } from "@/components/shell"

export interface InlineFormField {
  key: string
  label: string
  type: "text" | "number" | "select" | "textarea"
  placeholder?: string
  options?: { label: string; value: string }[]
}

export interface InlineFormRowProps {
  fields: InlineFormField[]
  onSave: (values: Record<string, string>) => void
  onCancel: () => void
}

export function InlineFormRow({ fields, onSave, onCancel }: InlineFormRowProps) {
  const [values, setValues] = useState<Record<string, string>>(
    () => Object.fromEntries(fields.map(f => [f.key, ""]))
  )

  const update = (key: string, val: string) => setValues(prev => ({ ...prev, [key]: val }))

  const handleSave = () => {
    const hasValue = Object.values(values).some(v => v.trim())
    if (!hasValue) return
    onSave(values)
  }

  return (
    <div style={{
      padding: "10px 12px",
      background: "var(--ih-surface-2)",
      border: "1px solid var(--ih-accent-soft)",
      borderRadius: "var(--ih-r-md)",
      display: "flex",
      gap: 8,
      alignItems: "flex-end",
      flexWrap: "wrap",
      animation: "ih-slide-in 0.15s ease-out",
    }}>
      {fields.map(f => (
        <div key={f.key} style={{ flex: f.type === "textarea" ? "1 1 100%" : "1 1 120px", minWidth: 80 }}>
          <label style={{
            display: "block",
            fontSize: 9.5,
            fontFamily: "var(--ih-font-mono)",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: "var(--ih-ink-50)",
            marginBottom: 4,
          }}>
            {f.label}
          </label>
          {f.type === "select" ? (
            <select
              className="ih-input"
              value={values[f.key]}
              onChange={e => update(f.key, e.target.value)}
              style={{ fontSize: 12, height: 30, padding: "0 8px", width: "100%" }}
            >
              <option value="">Select...</option>
              {f.options?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          ) : f.type === "textarea" ? (
            <textarea
              className="ih-input"
              value={values[f.key]}
              onChange={e => update(f.key, e.target.value)}
              placeholder={f.placeholder}
              rows={2}
              style={{ fontSize: 12, padding: "6px 8px", width: "100%", resize: "none", fontFamily: "inherit" }}
            />
          ) : (
            <input
              className="ih-input"
              type={f.type}
              value={values[f.key]}
              onChange={e => update(f.key, e.target.value)}
              placeholder={f.placeholder}
              style={{ fontSize: 12, height: 30, padding: "0 8px", width: "100%" }}
            />
          )}
        </div>
      ))}
      <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
        <button className="ih-btn ih-btn-accent ih-btn-sm" style={{ height: 30 }} onClick={handleSave}>
          <Icon name="check" size={10} /> Save
        </button>
        <button className="ih-btn ih-btn-quiet ih-btn-sm" style={{ height: 30 }} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  )
}
