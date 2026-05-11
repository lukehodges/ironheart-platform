"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { Icon } from "@/components/shell"

/* ── Data ────────────────────────────────────────────────────────────────── */

type Template = {
  id: string; name: string; description: string; fields: number;
  submissions: number; lastUsed: string; status: "active" | "draft" | "archived";
}

const TEMPLATES: Template[] = [
  { id: "tpl-1", name: "Owner / Director", description: "Strategic leadership assessment covering vision, governance, and growth planning", fields: 24, submissions: 31, lastUsed: "3d ago", status: "active" },
  { id: "tpl-2", name: "Operations", description: "Operational efficiency audit across processes, systems, and team workflows", fields: 28, submissions: 26, lastUsed: "1w ago", status: "active" },
  { id: "tpl-3", name: "Finance", description: "Financial health check covering cash flow, margins, forecasting, and controls", fields: 22, submissions: 18, lastUsed: "2w ago", status: "active" },
  { id: "tpl-4", name: "Sales & Revenue", description: "Pipeline, conversion metrics, pricing strategy, and revenue growth levers", fields: 20, submissions: 24, lastUsed: "4d ago", status: "active" },
  { id: "tpl-5", name: "Team Member", description: "Individual contributor pulse on culture, workload, tools, and growth", fields: 16, submissions: 28, lastUsed: "2d ago", status: "active" },
  { id: "tpl-6", name: "Quick Pulse", description: "5-minute check-in for ongoing engagements. Satisfaction, blockers, priorities", fields: 8, submissions: 12, lastUsed: "1d ago", status: "active" },
  { id: "tpl-7", name: "General Intake", description: "New client discovery form. Background, goals, budget, timeline, constraints", fields: 18, submissions: 3, lastUsed: "5d ago", status: "draft" },
]

type Submission = {
  id: string; form: string; submittedBy: string; client: string;
  date: string; status: "complete" | "partial" | "expired";
}

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
  return (
    <div style={{ padding: "24px 28px 48px", maxWidth: 1400, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24, gap: 24, flexWrap: "wrap" }}>
        <div>
          <div className="ih-eyebrow" style={{ marginBottom: 8 }}>Forms &middot; templates & submissions</div>
          <h1 className="ih-serif" style={{ margin: 0, fontSize: 38, lineHeight: 0.98 }}>
            7 templates. <span className="ih-italic-red">142</span> submissions.
          </h1>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button className="ih-btn ih-btn-ghost ih-btn-sm"><Icon name="download" size={12}/> Export</button>
          <button className="ih-btn ih-btn-primary ih-btn-sm"><Icon name="plus" size={12}/> New template</button>
        </div>
      </div>

      {/* Stats strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 24 }}>
        {[
          { l: "Total submissions", v: "142", d: "+18", h: "this month", icon: "file" as const },
          { l: "Completion rate", v: "89%", d: "+2.4%", h: "vs last month", icon: "check" as const },
          { l: "Avg time to complete", v: "12m", d: "\u22121m", h: "improving", icon: "clock" as const },
          { l: "Active templates", v: "6", d: "+1 draft", h: "7 total", icon: "grid" as const },
        ].map((s) => (
          <div key={s.l} className="ih-card" style={{ padding: "14px 14px", cursor: "pointer" }}>
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
          <button className="ih-btn ih-btn-quiet ih-btn-sm"><Icon name="filter" size={11}/> Filter</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
          {TEMPLATES.map((t) => (
            <div key={t.id} className="ih-card" style={{ padding: 18, display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                <div>
                  <div className="ih-serif" style={{ fontSize: 17, lineHeight: 1.1 }}>{t.name}</div>
                </div>
                <span className={`ih-pill ih-pill-${STATUS_TONE[t.status]}`} style={{ fontSize: 9, padding: "2px 6px", flexShrink: 0 }}>{t.status}</span>
              </div>
              <p style={{ margin: "0 0 12px", fontSize: 12, color: "var(--ih-ink-65)", lineHeight: 1.5, flex: 1 }}>{t.description}</p>
              <div style={{ display: "flex", gap: 16, marginBottom: 12, fontSize: 11 }}>
                <span style={{ color: "var(--ih-ink-50)" }}><span className="ih-mono" style={{ fontWeight: 500, color: "var(--ih-ink)" }}>{t.fields}</span> fields</span>
                <span style={{ color: "var(--ih-ink-50)" }}><span className="ih-mono" style={{ fontWeight: 500, color: "var(--ih-ink)" }}>{t.submissions}</span> submissions</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 12, borderTop: "1px solid var(--ih-line)" }}>
                <span className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)" }}>Last used {t.lastUsed}</span>
                <Link href={`/admin/forms/${t.id}`} className="ih-btn ih-btn-ghost ih-btn-sm" style={{ textDecoration: "none" }}>Edit <Icon name="arrowRight" size={11}/></Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent submissions table */}
      <div className="ih-card" style={{ overflow: "hidden" }}>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--ih-line)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <span className="ih-eyebrow">Recent submissions</span>
            <h3 style={{ margin: "2px 0 0", fontSize: 15, fontWeight: 600 }}>Incoming responses</h3>
          </div>
          <button className="ih-btn ih-btn-quiet ih-btn-sm">View all 142 &rarr;</button>
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
              <tr key={s.id} style={{ borderTop: "1px solid var(--ih-line)", cursor: "pointer" }} onClick={() => router.push(`/admin/forms/submissions/${s.id}`)}>
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
    </div>
  )
}
