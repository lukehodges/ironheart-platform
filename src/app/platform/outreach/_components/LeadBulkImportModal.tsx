"use client"

import { useRef, useState } from "react"
import { api } from "@/lib/trpc/react"
import type { OutreachLeadOwner } from "@/modules/outreach/outreach.types"

interface LeadBulkImportModalProps {
  open: boolean
  onClose: () => void
  onCreated?: (leadId: string) => void
}

type FieldKey = "name" | "company" | "email" | "website" | "category" | "ignore" | "first_name" | "last_name"
interface ParsedCsv { filename: string; headers: string[]; rows: string[][] }
interface ImportSummary { created: number; skipped: number; skipReasons: string[] }

const FIELD_OPTIONS: { value: FieldKey; label: string }[] = [
  { value: "ignore", label: "— ignore —" },
  { value: "name", label: "Name" },
  { value: "first_name", label: "First name" },
  { value: "last_name", label: "Last name" },
  { value: "company", label: "Company" },
  { value: "email", label: "Email" },
  { value: "website", label: "Website" },
  { value: "category", label: "Category" },
]

const HEADER_HINTS: Record<string, FieldKey> = {
  name: "name", fullname: "name", contact: "name", contactname: "name", person: "name",
  firstname: "first_name", givenname: "first_name",
  lastname: "last_name", surname: "last_name", familyname: "last_name",
  company: "company", companyname: "company", organisation: "company", organization: "company", account: "company",
  email: "email", emailaddress: "email", "e-mail": "email",
  website: "website", domain: "website", url: "website", site: "website", web: "website",
  category: "category", industry: "category", sector: "category", vertical: "category",
}

const ERR_BOX: React.CSSProperties = { marginTop: 14, padding: "10px 12px", borderRadius: 7, background: "rgba(193,46,22,0.08)", color: "var(--obs-accent)", fontSize: 12, fontFamily: "var(--obs-mono)" }
const DROPZONE: React.CSSProperties = { border: "1px dashed var(--obs-line-2)", borderRadius: 9, padding: "40px 20px", textAlign: "center", cursor: "pointer", background: "var(--obs-surface-2)", color: "var(--obs-ink-65)", fontSize: 13 }
const TH: React.CSSProperties = { padding: "8px 10px", textAlign: "left", borderBottom: "1px solid var(--obs-line)", fontFamily: "var(--obs-mono)", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--obs-ink-50)", fontWeight: 500 }
const TD: React.CSSProperties = { padding: "6px 10px", borderBottom: "1px solid var(--obs-line)", color: "var(--obs-ink-65)", whiteSpace: "nowrap", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis" }
const MONO_HINT: React.CSSProperties = { marginTop: 6, fontSize: 11, color: "var(--obs-ink-50)", fontFamily: "var(--obs-mono)" }

function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  const out: string[][] = []
  let row: string[] = []
  let cell = ""
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++ } else { inQuotes = false }
      } else { cell += c }
      continue
    }
    if (c === '"') { inQuotes = true; continue }
    if (c === ",") { row.push(cell); cell = ""; continue }
    if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++
      row.push(cell); cell = ""
      if (row.some((x) => x.length > 0)) out.push(row)
      row = []
      continue
    }
    cell += c
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell)
    if (row.some((x) => x.length > 0)) out.push(row)
  }
  if (out.length === 0) return { headers: [], rows: [] }
  return { headers: out[0].map((h) => h.trim()), rows: out.slice(1) }
}

function autoMap(headers: string[]): FieldKey[] {
  return headers.map((raw) => {
    const h = raw.toLowerCase().trim().replace(/[_\s-]+/g, "")
    return HEADER_HINTS[h] ?? "ignore"
  })
}

export default function LeadBulkImportModal({ open, onClose, onCreated }: LeadBulkImportModalProps) {
  const [parsed, setParsed] = useState<ParsedCsv | null>(null)
  const [mapping, setMapping] = useState<FieldKey[]>([])
  const [owner, setOwner] = useState<OutreachLeadOwner>("luke")
  const [source, setSource] = useState("CSV import")
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [summary, setSummary] = useState<ImportSummary | null>(null)
  const [fileErr, setFileErr] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const utils = api.useUtils()
  const createLead = api.outreach.createLead.useMutation()

  if (!open) return null

  function reset() {
    setParsed(null); setMapping([]); setProgress(null); setSummary(null); setFileErr(null); setSource("CSV import")
  }

  const importing = progress !== null && summary === null && progress.done < progress.total

  function handleClose() {
    if (importing) return
    reset()
    onClose()
  }

  async function handleFile(file: File) {
    setFileErr(null)
    if (!/\.csv$/i.test(file.name) && file.type !== "text/csv") {
      setFileErr("Please drop a .csv file"); return
    }
    const text = await file.text()
    const { headers, rows } = parseCsv(text)
    if (headers.length === 0) { setFileErr("CSV looked empty"); return }
    setParsed({ filename: file.name, headers, rows })
    setMapping(autoMap(headers))
    setSource(`CSV import ${file.name}`)
  }

  function setMapAt(i: number, value: FieldKey) {
    setMapping((prev) => {
      const next = [...prev]
      if (value === "first_name" || value === "last_name") {
        for (let j = 0; j < next.length; j++) if (j !== i && next[j] === value) next[j] = "ignore"
      }
      next[i] = value
      return next
    })
  }

  function buildLead(row: string[]): { name: string; company: string; email: string | null; website: string | null; category: string | null } | null {
    const pick: Partial<Record<FieldKey, string>> = {}
    mapping.forEach((field, i) => {
      const val = (row[i] ?? "").trim()
      if (!val || field === "ignore") return
      pick[field] = val
    })
    let name = pick.name ?? ""
    if (!name) name = [pick.first_name, pick.last_name].filter(Boolean).join(" ").trim()
    const company = pick.company ?? ""
    if (!name || !company) return null
    return {
      name,
      company,
      email: pick.email ?? null,
      website: pick.website ?? null,
      category: pick.category ?? null,
    }
  }

  async function startImport() {
    if (!parsed) return
    setSummary(null)
    const rows = parsed.rows
    setProgress({ done: 0, total: rows.length })
    let created = 0, skipped = 0
    const skipReasons: string[] = []
    let lastCreatedId: string | null = null
    for (let i = 0; i < rows.length; i++) {
      const lead = buildLead(rows[i])
      if (!lead) {
        skipped++
        skipReasons.push(`Row ${i + 2}: missing name or company`)
      } else {
        try {
          const r = await createLead.mutateAsync({ owner, source: source.trim() || null, ...lead })
          created++
          lastCreatedId = r.id
        } catch (e) {
          skipped++
          skipReasons.push(`Row ${i + 2}: ${e instanceof Error ? e.message : "unknown error"}`)
        }
      }
      setProgress({ done: i + 1, total: rows.length })
    }
    void utils.outreach.listLeads.invalidate()
    void utils.outreach.countLeads.invalidate()
    void utils.outreach.tabCounts.invalidate()
    if (lastCreatedId) onCreated?.(lastCreatedId)
    setSummary({ created, skipped, skipReasons: skipReasons.slice(0, 8) })
  }

  const preview = parsed ? parsed.rows.slice(0, 10) : []

  return (
    <div className="obs">
      <div
        className="modal-bg"
        onClick={(e) => { if (e.target === e.currentTarget && !importing) handleClose() }}
      >
        <div className="modal" style={{ width: "min(820px,100%)" }}>
          <div className="mhead">
            <h3>Bulk import leads</h3>
            <button className="close" onClick={handleClose} disabled={importing}>×</button>
          </div>
          <div className="mbody">
            {!parsed && (
              <div
                onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) void handleFile(f) }}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => fileRef.current?.click()}
                style={DROPZONE}
              >
                <div style={{ fontFamily: "var(--obs-serif)", fontSize: 18, color: "var(--obs-ink)", marginBottom: 6 }}>Drop a CSV here</div>
                <div>or click to choose a file</div>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv,text/csv"
                  style={{ display: "none" }}
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFile(f) }}
                />
              </div>
            )}

            {fileErr && <div style={ERR_BOX}>{fileErr}</div>}

            {parsed && (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <div className="eyebrow">{parsed.filename} · {parsed.rows.length} rows</div>
                  <button className="btn btn-ghost" onClick={reset} disabled={importing}>Choose another file</button>
                </div>

                <div className="grid">
                  <div>
                    <label>Owner (applies to all)</label>
                    <select value={owner} onChange={(e) => setOwner(e.target.value as OutreachLeadOwner)}>
                      <option value="luke">Luke</option>
                      <option value="alex">Alex</option>
                    </select>
                  </div>
                  <div>
                    <label>Source</label>
                    <input type="text" value={source} onChange={(e) => setSource(e.target.value)} />
                  </div>
                </div>

                <label style={{ marginTop: 18 }}>Column mapping</label>
                <div style={{ overflowX: "auto", border: "1px solid var(--obs-line)", borderRadius: 8 }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead>
                      <tr style={{ background: "var(--obs-surface-2)" }}>
                        {parsed.headers.map((h, i) => (
                          <th key={i} style={TH}>
                            <div style={{ marginBottom: 4 }}>{h || `col ${i + 1}`}</div>
                            <select
                              value={mapping[i] ?? "ignore"}
                              onChange={(e) => setMapAt(i, e.target.value as FieldKey)}
                              style={{ width: "100%" }}
                            >
                              {FIELD_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                              ))}
                            </select>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.map((r, ri) => (
                        <tr key={ri}>
                          {parsed.headers.map((_, ci) => (
                            <td key={ci} style={TD}>{r[ci] ?? ""}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {parsed.rows.length > 10 && (
                  <div style={MONO_HINT}>showing first 10 of {parsed.rows.length}</div>
                )}

                {progress && (
                  <div style={{ marginTop: 18 }}>
                    <div className="eyebrow" style={{ marginBottom: 6 }}>Imported {progress.done}/{progress.total}</div>
                    <div style={{ height: 6, background: "var(--obs-surface-2)", borderRadius: 4, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${(progress.done / Math.max(1, progress.total)) * 100}%`, background: "var(--obs-accent)", transition: "width 0.2s" }} />
                    </div>
                  </div>
                )}

                {summary && (
                  <div style={{ marginTop: 18, padding: "12px 14px", borderRadius: 8, background: "var(--obs-surface-2)" }}>
                    <div style={{ fontFamily: "var(--obs-serif)", fontSize: 16, marginBottom: 4 }}>
                      {summary.created} created, {summary.skipped} skipped
                    </div>
                    {summary.skipReasons.length > 0 && (
                      <ul style={{ fontSize: 11, color: "var(--obs-ink-65)", fontFamily: "var(--obs-mono)", margin: "8px 0 0", paddingLeft: 18 }}>
                        {summary.skipReasons.map((r, i) => <li key={i}>{r}</li>)}
                      </ul>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
          <div className="mfoot">
            <button className="btn" onClick={handleClose} disabled={importing}>
              {summary ? "Done" : "Cancel"}
            </button>
            {parsed && !summary && (
              <button
                className="btn btn-primary"
                onClick={startImport}
                disabled={importing || parsed.rows.length === 0}
              >
                {importing ? `Importing ${progress?.done}/${progress?.total}…` : `Import ${parsed.rows.length} leads`}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
