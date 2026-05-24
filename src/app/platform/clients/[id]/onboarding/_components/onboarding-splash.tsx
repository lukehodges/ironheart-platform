"use client"

/**
 * Empty-chart splash for /platform/clients/[id]/onboarding. Live-data port of
 * the demo splash (../demo/_components/demo-splash.tsx) — same hero copy and
 * stat tiles but with two real CTAs (Seed from tier · Approve plan) and the
 * Google/HRIS/CSV/Paste buttons rendered as disabled "★ pending" placeholders.
 */

import { useState } from "react"
import {
  ArrowRight,
  Building2,
  Cloud,
  FileSpreadsheet,
  Sparkles,
  Upload,
  Users,
} from "lucide-react"

interface OnboardingSplashProps {
  companyName: string
  isProvisioned: boolean
  isSeeding: boolean
  onSeed: () => void
  onComingSoon: (label: string) => void
}

export function OnboardingSplash({
  companyName,
  isProvisioned,
  isSeeding,
  onSeed,
  onComingSoon,
}: OnboardingSplashProps): React.ReactElement {
  const [hint, setHint] = useState<string | null>(null)

  const flashHint = (label: string) => {
    setHint(`${label} — coming soon`)
    onComingSoon(label)
    setTimeout(() => setHint(null), 2400)
  }

  return (
    <div style={{ flex: 1, overflowY: "auto", background: "var(--ih-bg)", padding: "40px 32px 48px", display: "flex", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: 880, display: "flex", flexDirection: "column", gap: 28 }}>
        {/* live banner */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 10px", borderRadius: 999, background: "color-mix(in srgb, var(--ih-accent) 8%, transparent)", border: "1px solid color-mix(in srgb, var(--ih-accent) 22%, transparent)", alignSelf: "flex-start" }}>
          <Sparkles size={12} style={{ color: "var(--ih-accent)" }} />
          <span className="ih-mono" style={{ fontSize: 10, color: "var(--ih-accent)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
            Org chart · live
          </span>
        </div>

        {/* hero */}
        <div>
          <p className="ih-mono" style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--ih-ink-50)", marginBottom: 8 }}>
            Onboarding · Step 1 of 3
          </p>
          <h1 className="ih-serif" style={{ fontSize: 44, margin: 0, color: "var(--ih-ink)", lineHeight: 1.05, letterSpacing: "-0.02em" }}>
            Map {companyName}&apos;s organisation
          </h1>
          <p style={{ fontSize: 15, color: "var(--ih-ink-65)", marginTop: 14, lineHeight: 1.55, maxWidth: 620 }}>
            Start from a tier-based template, then layer in the people, vacancies, and audit-critical
            roles unique to {companyName}. Once the chart looks right, approve the form plan to send
            questionnaires.
          </p>
        </div>

        {/* CTAs */}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <button
            type="button"
            onClick={onSeed}
            disabled={!isProvisioned || isSeeding}
            title={!isProvisioned ? "Engagement must be at CONTRACTED stage with a provisioned tenant first" : undefined}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "12px 20px",
              borderRadius: 8,
              background: "var(--ih-accent)",
              border: "1px solid var(--ih-accent)",
              color: "#fff",
              fontSize: 14,
              fontFamily: "var(--ih-font-sans)",
              fontWeight: 600,
              cursor: !isProvisioned || isSeeding ? "not-allowed" : "pointer",
              opacity: !isProvisioned || isSeeding ? 0.6 : 1,
              boxShadow: "0 6px 18px -8px color-mix(in srgb, var(--ih-accent) 60%, transparent)",
            }}
          >
            {isSeeding ? "Seeding…" : "Seed from tier"}
            <ArrowRight size={14} />
          </button>

          <span style={{ fontSize: 12, color: "var(--ih-ink-50)" }}>or jump-start with —</span>

          <StarPlaceholder icon={<Cloud size={12} />} label="Google Workspace" onClick={() => flashHint("Google sync")} />
          <StarPlaceholder icon={<Building2 size={12} />} label="HRIS" onClick={() => flashHint("HRIS sync")} />
          <StarPlaceholder icon={<FileSpreadsheet size={12} />} label="CSV" onClick={() => flashHint("Bulk import")} />
          <StarPlaceholder icon={<Upload size={12} />} label="Paste list" onClick={() => flashHint("Bulk import")} />
        </div>

        {!isProvisioned && (
          <p style={{ fontSize: 12, color: "var(--ih-warn)" }}>
            ★ Tenant not yet provisioned. Move the engagement to CONTRACTED to unlock seeding.
          </p>
        )}

        {hint && (
          <p className="ih-mono" style={{ fontSize: 11, color: "var(--ih-ink-50)", letterSpacing: "0.04em" }}>
            {hint}
          </p>
        )}

        {/* 3-step preview */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
          <StepCard n={1} title="Lay out the org" body="Drop in departments, roles, vacancies, and contractors." icon={<Users size={14} />} />
          <StepCard n={2} title="Flag who matters" body="Mark decision-makers, data owners, fractionals — the shortlist updates live." icon={<Sparkles size={14} />} />
          <StepCard n={3} title="Send the questionnaires" body="Approve the plan and the right form lands in the right inbox." icon={<FileSpreadsheet size={14} />} />
        </div>
      </div>
    </div>
  )
}

function StarPlaceholder({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="Coming soon"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "8px 12px",
        borderRadius: 8,
        background: "var(--ih-surface)",
        color: "var(--ih-ink-50)",
        border: "1px dashed var(--ih-line-2)",
        cursor: "pointer",
        fontSize: 12,
        fontFamily: "var(--ih-font-sans)",
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ display: "inline-flex" }}>{icon}</span>
      {label}
      <span className="ih-mono" style={{ fontSize: 9, color: "var(--ih-ink-40)", marginLeft: 4 }}>★</span>
    </button>
  )
}

function StepCard({ n, title, body, icon }: { n: number; title: string; body: string; icon: React.ReactNode }) {
  return (
    <article style={{ padding: 16, background: "var(--ih-surface)", border: "1px solid var(--ih-line)", borderRadius: 10, display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ width: 22, height: 22, borderRadius: 999, background: "var(--ih-surface-2)", color: "var(--ih-ink-65)", fontSize: 11, fontFamily: "var(--ih-font-mono)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {n}
        </span>
        <span style={{ color: "var(--ih-ink-50)" }}>{icon}</span>
      </div>
      <h4 style={{ fontSize: 14, fontWeight: 600, margin: 0, color: "var(--ih-ink)" }}>{title}</h4>
      <p style={{ fontSize: 12.5, color: "var(--ih-ink-65)", margin: 0, lineHeight: 1.45 }}>{body}</p>
    </article>
  )
}
