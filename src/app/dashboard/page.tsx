"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { NotificationToast, ConfirmDialog } from "@/components/shared"
import { Icon } from "@/components/shell"

/* ── Client Portal ───────────────────────────────────────────────────────── */

export default function PortalPage() {
  const router = useRouter()
  const [toast, setToast] = useState<{message: string; tone?: string} | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmAction, setConfirmAction] = useState<{title: string; desc: string; label: string; action: () => void}>({title:"",desc:"",label:"",action:()=>{}})
  return (
    <div style={{ padding: "32px 40px 48px", maxWidth: 1200, margin: "0 auto" }}>
      {/* Welcome greeting */}
      <div className="ih-eyebrow" style={{ marginBottom: 8 }}>Welcome back · Mira at Northwind</div>
      <h1 className="ih-serif" style={{ margin: 0, fontSize: 48, lineHeight: 0.95 }}>You&apos;re <span className="ih-italic-red">78%</span> through sprint 4.</h1>
      <p style={{ marginTop: 14, fontSize: 14, color: "var(--ih-ink-65)", maxWidth: 580, lineHeight: 1.55 }}>Two deliverables shipped this sprint. Portal v2 is in review — leave notes below and I&apos;ll fold them into Friday&apos;s demo.</p>

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, margin: "32px 0" }}>
        {([
          ["This sprint", "78%", "sprint 4 of 6", "ok"],
          ["Hours used", "32 / 40h", "8h remaining", "muted"],
          ["Approvals", "2", "need your sign\u2011off", "accent"],
          ["Next session", "Tue 11:30", "sprint review", "info"],
        ] as const).map(([l, v, h, t]) => (
          <div key={l} className="ih-card ih-card-pad" style={{ padding: 16 }}>
            <span className="ih-eyebrow">{l}</span>
            <div className="ih-serif" style={{ fontSize: 28, lineHeight: 1, marginTop: 6, color: t === "accent" ? "var(--ih-accent)" : "var(--ih-ink)" }}>{v}</div>
            <div className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)", marginTop: 6 }}>{h}</div>
          </div>
        ))}
      </div>

      {/* Two-column: Deliverables + Studio note / Approvals */}
      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 16 }}>
        {/* Deliverables list */}
        <div className="ih-card">
          <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--ih-line)" }}>
            <span className="ih-eyebrow">Deliverables · 4</span>
            <h3 style={{ margin: "4px 0 0", fontSize: 16 }}>What we&apos;ve shipped</h3>
          </div>
          {([
            ["Stripe \u2192 Airtable sync", "Live \u00b7 running daily", "ok", "Apr 22"],
            ["Approval workflow", "Live \u00b7 live since Tue", "ok", "May 06"],
            ["Portal v2", "In review \u00b7 2 actions", "accent", "Open"],
            ["Monthly digest email", "Queued \u00b7 sprint 5", "muted", "\u2014"],
          ] as [string, string, string, string][]).map(([t, sub, tone, when], i) => (
            <div key={t} style={{ padding: "14px 20px", borderTop: i === 0 ? "0" : "1px solid var(--ih-line)", display: "grid", gridTemplateColumns: "auto 1fr auto auto", gap: 14, alignItems: "center" }}>
              <span className={`ih-dot ih-dot-${tone}`}/>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{t}</div>
                <div className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)", marginTop: 2 }}>{sub}</div>
              </div>
              <span className="ih-mono" style={{ fontSize: 11, color: "var(--ih-ink-50)" }}>{when}</span>
              <button className="ih-btn ih-btn-ghost ih-btn-sm" onClick={() => router.push("/dashboard/deliverables")}>{tone === "accent" ? "Review \u2192" : "Open"}</button>
            </div>
          ))}
        </div>

        {/* Right column: Studio note + Approvals */}
        <div style={{ display: "grid", gap: 16 }}>
          {/* Studio note */}
          <div className="ih-card ih-card-pad" style={{ background: "var(--ih-ink)", color: "#fff", padding: 18, borderColor: "transparent" }}>
            <span className="ih-eyebrow" style={{ color: "rgba(255,255,255,0.5)" }}>Studio note · Luke</span>
            <p style={{ fontFamily: "var(--ih-font-serif)", fontSize: 19, lineHeight: 1.35, margin: "8px 0 0" }}>
              &ldquo;Portal v2 went a touch over — six extra hours on the comments view. Friday&apos;s demo will show why I think it&apos;s the right trade.&rdquo;
            </p>
            <div style={{ marginTop: 14, fontFamily: "var(--ih-font-mono)", fontSize: 10, color: "rgba(255,255,255,0.4)" }}>posted 2 days ago</div>
          </div>

          {/* Approvals */}
          <div className="ih-card">
            <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--ih-line)" }}>
              <span className="ih-eyebrow">Approvals · 2</span>
            </div>
            {([
              ["Q2 final invoice", "$14,200 \u00b7 due Apr 28", "accent"],
              ["Portal v2 copy review", "3 strings need confirmation", "warn"],
            ] as [string, string, string][]).map(([t, sub, tone], i) => (
              <div key={t} style={{ padding: "12px 18px", borderTop: i === 0 ? "0" : "1px solid var(--ih-line)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <strong style={{ fontSize: 12.5 }}>{t}</strong>
                  <span className={`ih-pill ih-pill-${tone}`} style={{ fontSize: 9 }}>{tone === "accent" ? "action" : "review"}</span>
                </div>
                <div className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)" }}>{sub}</div>
                <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                  <button className="ih-btn ih-btn-accent ih-btn-sm" onClick={() => { setConfirmAction({title:"Approve this item?",desc:"This will mark the item as approved.",label:"Approve",action:() => { setConfirmOpen(false); setToast({message:"Approved successfully",tone:"ok"}) }}); setConfirmOpen(true) }}>Approve</button>
                  <button className="ih-btn ih-btn-quiet ih-btn-sm" onClick={() => { const comment = prompt("Add your comment:"); if (comment) setToast({message: "Comment posted", tone: "ok"}) }}>Comment</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      {toast && <NotificationToast message={toast.message} tone={toast.tone as any} onDismiss={() => setToast(null)} />}
      <ConfirmDialog open={confirmOpen} title={confirmAction.title} description={confirmAction.desc} confirmLabel={confirmAction.label} onConfirm={confirmAction.action} onCancel={() => setConfirmOpen(false)} />
    </div>
  )
}
