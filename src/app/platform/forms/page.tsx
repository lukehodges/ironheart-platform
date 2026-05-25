"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { NotificationToast } from "@/components/shared"
import { Icon } from "@/components/shell"
import { api } from "@/lib/trpc/react"

/* ── Types from the live API ─────────────────────────────────────────────── */

type Submission = {
  id: string; form: string; submittedBy: string; client: string;
  date: string; status: "complete" | "partial" | "expired";
}

// ★ Mock — pending forms.listResponses cross-tenant aggregation (Wave K).
const SUBMISSIONS: Submission[] = [
  { id: "sub-1", form: "Quick Pulse", submittedBy: "Mira Sato", client: "Northwind", date: "May 10", status: "complete" },
  { id: "sub-2", form: "Team Member", submittedBy: "Sam Park", client: "Northwind", date: "May 9", status: "complete" },
  { id: "sub-3", form: "Owner / Director", submittedBy: "Jonas Hale", client: "Bowery Mills", date: "May 8", status: "complete" },
  { id: "sub-4", form: "Operations", submittedBy: "Yuki Sato", client: "Castor Foods", date: "May 7", status: "complete" },
  { id: "sub-5", form: "General Intake", submittedBy: "Liam Walker", client: "Greystone Digital", date: "May 6", status: "partial" },
  { id: "sub-6", form: "Finance", submittedBy: "Eleanor Brigham", client: "Brigham Architects", date: "Apr 28", status: "expired" },
  { id: "sub-7", form: "Sales & Revenue", submittedBy: "Tom Reeves", client: "Vellum & Co.", date: "May 5", status: "complete" },
]

const STATUS_TONE: Record<string, string> = { complete: "ok", partial: "warn", expired: "danger", active: "ok", draft: "info", archived: "muted" }

const TH: React.CSSProperties = { textAlign: "left", padding: "10px 12px", fontWeight: 500, fontSize: 10, color: "var(--ih-ink-40)", textTransform: "uppercase", letterSpacing: "0.12em", fontFamily: "var(--ih-font-mono)" }

/* ── Page ─────────────────────────────────────────────────────────────────── */

export default function FormsPage() {
  const router = useRouter()
  const [toast, setToast] = useState<{message: string; tone?: string} | null>(null)
  const [duplicateFor, setDuplicateFor] = useState<{ id: string; name: string } | null>(null)

  // Live template list — pulls the Ironheart master library + every engagement-scoped clone.
  const templatesQuery = api.forms.listTemplates.useQuery({ limit: 100 })
  // Live engagements (used to populate the "Duplicate as ClientName" dropdown).
  const engagementsQuery = api.consulting.listForPlatform.useQuery({ limit: 100 })

  const templates = templatesQuery.data?.rows ?? []
  const engagements = useMemo(() => engagementsQuery.data?.rows ?? [], [engagementsQuery.data])

  /** Map engagementId → "{Company} — {Title}" for the popover. */
  const engagementLabelById = useMemo(() => {
    const m = new Map<string, string>()
    for (const r of engagements) {
      const company = (r.customer.notes ?? "").trim() ||
        `${r.customer.firstName ?? ""} ${r.customer.lastName ?? ""}`.trim() ||
        "Unknown"
      m.set(r.engagement.id, `${company} — ${r.engagement.title}`)
    }
    return m
  }, [engagements])

  const totalSubmissions = SUBMISSIONS.length // ★ Mock until forms.listResponses across tenants

  return (
    <div style={{ padding: "24px 28px 48px", maxWidth: 1400, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24, gap: 24, flexWrap: "wrap" }}>
        <div>
          <div className="ih-eyebrow" style={{ marginBottom: 8 }}>Forms &middot; templates & submissions</div>
          <h1 className="ih-serif" style={{ margin: 0, fontSize: 38, lineHeight: 0.98 }}>
            {templatesQuery.isLoading ? "…" : templates.length} templates. <span className="ih-italic-red">{totalSubmissions}</span> submissions <span style={{ color: "var(--ih-accent)" }}>★</span>.
          </h1>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button className="ih-btn ih-btn-ghost ih-btn-sm" onClick={() => setToast({message: "Export started — check your downloads", tone: "ok"})}><Icon name="download" size={12}/> Export</button>
          <button className="ih-btn ih-btn-primary ih-btn-sm" onClick={() => setToast({message: "Template editor opened", tone: "ok"})}><Icon name="plus" size={12}/> New template</button>
        </div>
      </div>

      {/* Stats strip — ★ Mock for completion + avg time + submissions count */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 24 }}>
        {[
          { l: "Total submissions ★", v: String(totalSubmissions), d: "+18", h: "this month", icon: "file" as const },
          { l: "Completion rate ★", v: "89%", d: "+2.4%", h: "vs last month", icon: "check" as const },
          { l: "Avg time to complete ★", v: "12m", d: "−1m", h: "improving", icon: "clock" as const },
          { l: "Templates", v: String(templates.length), d: `${templates.filter(t => t.engagementId).length} client-scoped`, h: "live count", icon: "grid" as const },
        ].map((s) => (
          <div key={s.l} className="ih-card" style={{ padding: "14px 14px" }}>
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

      {/* Templates grid */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div>
            <span className="ih-eyebrow">Templates</span>
            <h3 style={{ margin: "2px 0 0", fontSize: 15, fontWeight: 600 }}>Questionnaire library</h3>
          </div>
          <button className="ih-btn ih-btn-quiet ih-btn-sm" onClick={() => setToast({message: "Filter applied — ★ pending backend", tone: "ok"})}><Icon name="filter" size={11}/> Filter <span style={{ color: "var(--ih-accent)" }}>★</span></button>
        </div>
        {templatesQuery.isLoading ? (
          <div style={{ padding: 24, color: "var(--ih-ink-50)", fontSize: 13 }}>Loading templates…</div>
        ) : templates.length === 0 ? (
          <div style={{ padding: 24, color: "var(--ih-ink-50)", fontSize: 13 }}>No templates yet.</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            {templates.map((t) => {
              const fieldCount = t.fields?.length ?? 0
              const scopedLabel = t.engagementId ? engagementLabelById.get(t.engagementId) : null
              const statusKey: "active" | "draft" = t.isActive ? "active" : "draft"
              return (
                <div key={t.id} className="ih-card" style={{ padding: 18, display: "flex", flexDirection: "column" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                    <div style={{ minWidth: 0 }}>
                      <div className="ih-serif" style={{ fontSize: 17, lineHeight: 1.1 }}>{t.name}</div>
                      {scopedLabel && (
                        <div style={{ marginTop: 4, fontSize: 10.5, color: "var(--ih-accent)", textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: "var(--ih-font-mono)" }}>
                          Scoped · {scopedLabel}
                        </div>
                      )}
                      {!scopedLabel && t.slug && (
                        <div style={{ marginTop: 4, fontSize: 10.5, color: "var(--ih-ink-40)", fontFamily: "var(--ih-font-mono)" }}>
                          Master · {t.slug}
                        </div>
                      )}
                    </div>
                    <span className={`ih-pill ih-pill-${STATUS_TONE[statusKey]}`} style={{ fontSize: 9, padding: "2px 6px", flexShrink: 0 }}>{statusKey}</span>
                  </div>
                  <p style={{ margin: "0 0 12px", fontSize: 12, color: "var(--ih-ink-65)", lineHeight: 1.5, flex: 1 }}>{t.description ?? "—"}</p>
                  <div style={{ display: "flex", gap: 16, marginBottom: 12, fontSize: 11 }}>
                    <span style={{ color: "var(--ih-ink-50)" }}><span className="ih-mono" style={{ fontWeight: 500, color: "var(--ih-ink)" }}>{fieldCount}</span> fields</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 12, borderTop: "1px solid var(--ih-line)", gap: 6 }}>
                    <button
                      className="ih-btn ih-btn-quiet ih-btn-sm"
                      onClick={() => setDuplicateFor({ id: t.id, name: t.name })}
                      style={{ fontSize: 11 }}
                    >
                      <Icon name="plus" size={11}/> Duplicate as client
                    </button>
                    <Link href={`/platform/forms/${t.id}`} className="ih-btn ih-btn-ghost ih-btn-sm" style={{ textDecoration: "none" }}>Edit <Icon name="arrowRight" size={11}/></Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Recent submissions table — ★ Mock for cross-tenant aggregation */}
      <div className="ih-card" style={{ overflow: "hidden" }}>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--ih-line)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <span className="ih-eyebrow">Recent submissions <span style={{ color: "var(--ih-accent)" }}>★</span></span>
            <h3 style={{ margin: "2px 0 0", fontSize: 15, fontWeight: 600 }}>Incoming responses</h3>
          </div>
          <button className="ih-btn ih-btn-quiet ih-btn-sm" onClick={() => setToast({message: "Showing all submissions — ★ pending backend", tone: "ok"})}>View all &rarr;</button>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ background: "var(--ih-surface-2)" }}>
              <th style={{ ...TH, paddingLeft: 18 }}>Form</th>
              <th style={TH}>Submitted by</th>
              <th style={TH}>Client</th>
              <th style={TH}>Date</th>
              <th style={TH}>Status</th>
              <th style={{ width: 36 }}></th>
            </tr>
          </thead>
          <tbody>
            {SUBMISSIONS.map((s) => (
              <tr key={s.id} style={{ borderTop: "1px solid var(--ih-line)", cursor: "pointer" }} onClick={() => router.push(`/platform/forms/submissions/${s.id}`)}>
                <td style={{ padding: "10px 12px 10px 18px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Icon name="file" size={13} style={{ color: "var(--ih-ink-40)" }} />
                    <span style={{ fontWeight: 500 }}>{s.form}</span>
                  </div>
                </td>
                <td style={{ padding: "10px 12px", color: "var(--ih-ink-65)" }}>{s.submittedBy}</td>
                <td style={{ padding: "10px 12px", color: "var(--ih-ink-65)" }}>{s.client}</td>
                <td style={{ padding: "10px 12px" }}><span className="ih-mono" style={{ fontSize: 11, color: "var(--ih-ink-50)" }}>{s.date}</span></td>
                <td style={{ padding: "10px 12px" }}>
                  <span className={`ih-pill ih-pill-${STATUS_TONE[s.status]}`} style={{ fontSize: 9, padding: "2px 6px" }}>{s.status}</span>
                </td>
                <td style={{ padding: "10px 12px" }}>
                  <Icon name="chevronRight" size={11} style={{ color: "var(--ih-ink-30)" }} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {duplicateFor && (
        <DuplicateDialog
          sourceTemplateId={duplicateFor.id}
          sourceName={duplicateFor.name}
          engagementOptions={engagements.map((r) => ({
            id: r.engagement.id,
            label: engagementLabelById.get(r.engagement.id) ?? r.engagement.title,
            company: (r.customer.notes ?? "").trim() ||
              `${r.customer.firstName ?? ""} ${r.customer.lastName ?? ""}`.trim() ||
              "Client",
          }))}
          onClose={() => setDuplicateFor(null)}
          onDone={() => {
            setToast({ message: "Template duplicated", tone: "ok" })
            setDuplicateFor(null)
            templatesQuery.refetch()
          }}
        />
      )}

      {toast && <NotificationToast message={toast.message} tone={toast.tone as any} onDismiss={() => setToast(null)} />}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Duplicate dialog — pick engagement + override name
// ---------------------------------------------------------------------------

function DuplicateDialog({
  sourceTemplateId,
  sourceName,
  engagementOptions,
  onClose,
  onDone,
}: {
  sourceTemplateId: string
  sourceName: string
  engagementOptions: Array<{ id: string; label: string; company: string }>
  onClose: () => void
  onDone: () => void
}) {
  const [engagementId, setEngagementId] = useState<string>(engagementOptions[0]?.id ?? "")
  const company = engagementOptions.find((o) => o.id === engagementId)?.company ?? "Client"
  const [name, setName] = useState<string>(`${company} — ${sourceName}`)

  const dup = api.forms.duplicateTemplate.useMutation({
    onSuccess: onDone,
    onError: (e) => alert(`Duplicate failed: ${e.message}`),
  })

  // When engagement changes, refresh the name prefix to match the new company.
  function handleEngagementChange(newId: string) {
    setEngagementId(newId)
    const newCompany = engagementOptions.find((o) => o.id === newId)?.company ?? "Client"
    setName(`${newCompany} — ${sourceName}`)
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
      }}
      onClick={onClose}
    >
      <div
        className="ih-card"
        style={{ width: 460, padding: 22, background: "var(--ih-surface)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="ih-eyebrow" style={{ marginBottom: 4 }}>Duplicate template</div>
        <h3 style={{ margin: "0 0 14px", fontSize: 17 }} className="ih-serif">Clone “{sourceName}” as a client-scoped template</h3>

        <label style={{ display: "block", marginBottom: 12 }}>
          <span className="ih-eyebrow" style={{ marginBottom: 4, display: "block" }}>Engagement</span>
          <select
            value={engagementId}
            onChange={(e) => handleEngagementChange(e.target.value)}
            style={{ width: "100%", padding: "6px 10px", borderRadius: 6, border: "1px solid var(--ih-line)", background: "var(--ih-surface-2)", fontSize: 13 }}
          >
            {engagementOptions.length === 0 && <option value="">No engagements found</option>}
            {engagementOptions.map((o) => (
              <option key={o.id} value={o.id}>{o.label}</option>
            ))}
          </select>
        </label>

        <label style={{ display: "block", marginBottom: 16 }}>
          <span className="ih-eyebrow" style={{ marginBottom: 4, display: "block" }}>Template name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ width: "100%", padding: "6px 10px", borderRadius: 6, border: "1px solid var(--ih-line)", background: "var(--ih-surface-2)", fontSize: 13 }}
          />
        </label>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button className="ih-btn ih-btn-quiet ih-btn-sm" onClick={onClose}>Cancel</button>
          <button
            className="ih-btn ih-btn-primary ih-btn-sm"
            disabled={!engagementId || !name.trim() || dup.isPending}
            onClick={() => dup.mutate({ sourceTemplateId, engagementId, name: name.trim() })}
          >
            {dup.isPending ? "Duplicating…" : "Duplicate"}
          </button>
        </div>
      </div>
    </div>
  )
}
