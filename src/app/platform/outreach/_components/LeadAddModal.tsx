"use client"

import { useState } from "react"
import { api } from "@/lib/trpc/react"
import type { OutreachLeadOwner } from "@/modules/outreach/outreach.types"

interface LeadAddModalProps {
  open: boolean
  onClose: () => void
  onCreated?: (leadId: string) => void
}

interface FormState {
  owner: OutreachLeadOwner
  name: string
  company: string
  email: string
  website: string
  category: string
  source: string
  researched: boolean
  notes: string
  researchNotes: string
}

const INITIAL: FormState = {
  owner: "luke",
  name: "",
  company: "",
  email: "",
  website: "",
  category: "",
  source: "Manual",
  researched: false,
  notes: "",
  researchNotes: "",
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function LeadAddModal({ open, onClose, onCreated }: LeadAddModalProps) {
  const [form, setForm] = useState<FormState>(INITIAL)
  const [err, setErr] = useState<string | null>(null)

  const utils = api.useUtils()
  const createLead = api.outreach.createLead.useMutation({
    onSuccess: (lead) => {
      void utils.outreach.listLeads.invalidate()
      void utils.outreach.countLeads.invalidate()
      void utils.outreach.tabCounts.invalidate()
      onCreated?.(lead.id)
      setForm(INITIAL)
      setErr(null)
      onClose()
    },
    onError: (e) => setErr(e.message),
  })

  if (!open) return null

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function submit() {
    setErr(null)
    if (!form.name.trim()) return setErr("Name is required")
    if (!form.company.trim()) return setErr("Company is required")
    if (form.email.trim() && !EMAIL_RE.test(form.email.trim())) {
      return setErr("Email format looks wrong")
    }
    createLead.mutate({
      owner: form.owner,
      name: form.name.trim(),
      company: form.company.trim(),
      email: form.email.trim() || null,
      website: form.website.trim() || null,
      category: form.category.trim() || null,
      source: form.source.trim() || null,
      researched: form.researched,
      notes: form.notes.trim() || null,
      researchNotes: form.researched ? form.researchNotes.trim() || null : null,
    })
  }

  const isPending = createLead.isPending

  return (
    <div className="obs">
      <div
        className="modal-bg"
        onClick={(e) => {
          if (e.target === e.currentTarget && !isPending) onClose()
        }}
      >
        <div className="modal">
          <div className="mhead">
            <h3>Add lead</h3>
            <button className="close" onClick={onClose} disabled={isPending}>×</button>
          </div>
          <div className="mbody">
            <label>Owner</label>
            <div style={{ display: "flex", gap: 16, paddingTop: 4 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 6, margin: 0, textTransform: "none", letterSpacing: 0, fontFamily: "inherit", fontSize: 13, color: "var(--obs-ink)" }}>
                <input
                  type="radio"
                  name="lead-owner"
                  checked={form.owner === "luke"}
                  onChange={() => set("owner", "luke")}
                  style={{ width: "auto" }}
                />
                Luke
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 6, margin: 0, textTransform: "none", letterSpacing: 0, fontFamily: "inherit", fontSize: 13, color: "var(--obs-ink)" }}>
                <input
                  type="radio"
                  name="lead-owner"
                  checked={form.owner === "alex"}
                  onChange={() => set("owner", "alex")}
                  style={{ width: "auto" }}
                />
                Alex
              </label>
            </div>

            <div className="grid">
              <div>
                <label>Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="Person"
                />
              </div>
              <div>
                <label>Company</label>
                <input
                  type="text"
                  value={form.company}
                  onChange={(e) => set("company", e.target.value)}
                  placeholder="Company"
                />
              </div>
            </div>

            <div className="grid">
              <div>
                <label>Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  placeholder="name@company.com"
                />
              </div>
              <div>
                <label>Website</label>
                <input
                  type="text"
                  value={form.website}
                  onChange={(e) => set("website", e.target.value)}
                  placeholder="company.com"
                />
              </div>
            </div>

            <div className="grid">
              <div>
                <label>Category</label>
                <input
                  type="text"
                  value={form.category}
                  onChange={(e) => set("category", e.target.value)}
                  placeholder="e.g. Clinic, Trades"
                />
              </div>
              <div>
                <label>Source</label>
                <input
                  type="text"
                  value={form.source}
                  onChange={(e) => set("source", e.target.value)}
                />
              </div>
            </div>

            <label style={{ display: "flex", alignItems: "center", gap: 8, textTransform: "none", letterSpacing: 0, fontFamily: "inherit", fontSize: 13, color: "var(--obs-ink)", marginTop: 14 }}>
              <input
                type="checkbox"
                checked={form.researched}
                onChange={(e) => set("researched", e.target.checked)}
                style={{ width: "auto" }}
              />
              Researched
            </label>

            <label>Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="General notes"
            />

            {form.researched && (
              <>
                <label>Research notes</label>
                <textarea
                  value={form.researchNotes}
                  onChange={(e) => set("researchNotes", e.target.value)}
                  placeholder="What you found — operational hook"
                />
              </>
            )}

            {err && (
              <div style={{ marginTop: 14, padding: "10px 12px", borderRadius: 7, background: "rgba(193,46,22,0.08)", color: "var(--obs-accent)", fontSize: 12, fontFamily: "var(--obs-mono)" }}>
                {err}
              </div>
            )}
          </div>
          <div className="mfoot">
            <button className="btn" onClick={onClose} disabled={isPending}>Cancel</button>
            <button
              className="btn btn-primary"
              onClick={submit}
              disabled={isPending || !form.name.trim() || !form.company.trim()}
            >
              {isPending ? "Creating…" : "Create lead"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
