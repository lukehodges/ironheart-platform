"use client"

import { useState } from "react"
import {
  ArrowRight,
  Building2,
  Cloud,
  FileSpreadsheet,
  RotateCcw,
  Sparkles,
  Upload,
  Users,
} from "lucide-react"
import type { CoverageStats } from "./types"

interface DemoSplashProps {
  companyName: string
  stats: CoverageStats
  onStart: () => void
  onOpenBulkImport: () => void
  onReset: () => void
  onSync: (source: "google" | "hris" | "csv") => void
}

export function DemoSplash({
  companyName,
  stats,
  onStart,
  onOpenBulkImport,
  onReset,
  onSync,
}: DemoSplashProps): React.ReactElement {
  const [syncing, setSyncing] = useState<null | "google" | "hris" | "csv">(null)
  const trigger = (s: "google" | "hris" | "csv") => {
    setSyncing(s)
    setTimeout(() => {
      setSyncing(null)
      onSync(s)
    }, 1100)
  }

  return (
    <div
      style={{
        flex: 1,
        overflowY: "auto",
        background: "var(--ih-bg)",
        padding: "40px 32px 48px",
        display: "flex",
        justifyContent: "center",
      }}
    >
      <div style={{ width: "100%", maxWidth: 880, display: "flex", flexDirection: "column", gap: 28 }}>
        {/* demo banner */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "6px 10px",
            borderRadius: 999,
            background: "color-mix(in srgb, var(--ih-accent) 8%, transparent)",
            border: "1px solid color-mix(in srgb, var(--ih-accent) 22%, transparent)",
            alignSelf: "flex-start",
          }}
        >
          <Sparkles size={12} style={{ color: "var(--ih-accent)" }} />
          <span
            className="ih-mono"
            style={{
              fontSize: 10,
              color: "var(--ih-accent)",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            Live demo · Northwind Analytics
          </span>
          <button
            type="button"
            onClick={onReset}
            aria-label="Reset demo"
            style={{
              width: 18,
              height: 18,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "none",
              background: "transparent",
              cursor: "pointer",
              borderRadius: 4,
            }}
          >
            <RotateCcw size={11} style={{ color: "var(--ih-accent)" }} />
          </button>
        </div>

        {/* hero */}
        <div>
          <p
            className="ih-mono"
            style={{
              fontSize: 10,
              textTransform: "uppercase",
              letterSpacing: "0.12em",
              color: "var(--ih-ink-50)",
              marginBottom: 8,
            }}
          >
            Onboarding · Step 1 of 3
          </p>
          <h1
            className="ih-serif"
            style={{
              fontSize: 44,
              margin: 0,
              color: "var(--ih-ink)",
              lineHeight: 1.05,
              letterSpacing: "-0.02em",
            }}
          >
            Map {companyName}'s organisation
          </h1>
          <p
            style={{
              fontSize: 15,
              color: "var(--ih-ink-65)",
              marginTop: 14,
              lineHeight: 1.55,
              maxWidth: 620,
            }}
          >
            In a few minutes you'll build a live picture of who reports to whom, surface the
            people we need to interview, and send the right questionnaires. Start with a quick
            import or skip straight to the canvas.
          </p>
        </div>

        {/* primary CTA + sync row */}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <button
            type="button"
            onClick={onStart}
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
              cursor: "pointer",
              boxShadow: "0 6px 18px -8px color-mix(in srgb, var(--ih-accent) 60%, transparent)",
            }}
          >
            Open the org chart
            <ArrowRight size={14} />
          </button>

          <span style={{ fontSize: 12, color: "var(--ih-ink-50)" }}>or jump-start with —</span>

          <SyncBtn icon={<Cloud size={12} />} label="Google Workspace" loading={syncing === "google"} onClick={() => trigger("google")} />
          <SyncBtn icon={<Building2 size={12} />} label="HRIS" loading={syncing === "hris"} onClick={() => trigger("hris")} muted />
          <SyncBtn icon={<FileSpreadsheet size={12} />} label="CSV" loading={syncing === "csv"} onClick={onOpenBulkImport} muted />
          <SyncBtn icon={<Upload size={12} />} label="Paste list" loading={false} onClick={onOpenBulkImport} muted />
        </div>

        {/* stat tiles */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 1,
            background: "var(--ih-line)",
            border: "1px solid var(--ih-line)",
            borderRadius: 10,
            overflow: "hidden",
          }}
        >
          <Tile label="Coverage" value={`${stats.coveragePct}%`} hint="Heuristic completeness score" tone="accent" />
          <Tile label="People mapped" value={`${stats.mapped}/${stats.totalPeople}`} hint="Including vacancies" />
          <Tile label="Interview targets" value={`${stats.interviewsCompleted}/${stats.interviewTargets}`} hint="Completed / planned" />
          <Tile label="Forms" value={`${stats.formsSent}`} hint={`${stats.formsCompleted} returned`} />
        </div>

        {/* 3-step preview */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 14,
          }}
        >
          <StepCard
            n={1}
            title="Lay out the org"
            body="Drop in departments, roles, vacancies, and contractors. Paste or sync from existing sources."
            icon={<Users size={14} />}
          />
          <StepCard
            n={2}
            title="Flag who matters"
            body="Mark decision-makers, data owners, fractionals. The shortlist updates live."
            icon={<Sparkles size={14} />}
          />
          <StepCard
            n={3}
            title="Send the questionnaires"
            body="Approve the plan and the right form lands in the right inbox."
            icon={<FileSpreadsheet size={14} />}
          />
        </div>
      </div>
    </div>
  )
}

function Tile({
  label,
  value,
  hint,
  tone,
}: {
  label: string
  value: string
  hint?: string
  tone?: "accent"
}) {
  return (
    <div
      style={{
        background: "var(--ih-surface)",
        padding: "14px 18px",
        display: "flex",
        flexDirection: "column",
        gap: 4,
      }}
    >
      <span className="ih-eyebrow">{label}</span>
      <span
        className="ih-serif"
        style={{
          fontSize: 26,
          lineHeight: 1,
          color: tone === "accent" ? "var(--ih-accent)" : "var(--ih-ink)",
        }}
      >
        {value}
      </span>
      {hint && (
        <span style={{ fontSize: 11, color: "var(--ih-ink-50)" }}>{hint}</span>
      )}
    </div>
  )
}

function StepCard({ n, title, body, icon }: { n: number; title: string; body: string; icon: React.ReactNode }) {
  return (
    <article
      style={{
        padding: 16,
        background: "var(--ih-surface)",
        border: "1px solid var(--ih-line)",
        borderRadius: 10,
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span
          style={{
            width: 22,
            height: 22,
            borderRadius: 999,
            background: "var(--ih-surface-2)",
            color: "var(--ih-ink-65)",
            fontSize: 11,
            fontFamily: "var(--ih-font-mono)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {n}
        </span>
        <span style={{ color: "var(--ih-ink-50)" }}>{icon}</span>
      </div>
      <h4 style={{ fontSize: 14, fontWeight: 600, margin: 0, color: "var(--ih-ink)" }}>{title}</h4>
      <p style={{ fontSize: 12.5, color: "var(--ih-ink-65)", margin: 0, lineHeight: 1.45 }}>{body}</p>
    </article>
  )
}

function SyncBtn({
  icon,
  label,
  loading,
  onClick,
  muted,
}: {
  icon: React.ReactNode
  label: string
  loading: boolean
  onClick: () => void
  muted?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "8px 12px",
        borderRadius: 8,
        background: muted ? "var(--ih-surface)" : "var(--ih-ink)",
        color: muted ? "var(--ih-ink)" : "#fff",
        border: muted ? "1px solid var(--ih-line)" : "1px solid var(--ih-ink)",
        cursor: loading ? "wait" : "pointer",
        opacity: loading ? 0.7 : 1,
        fontSize: 12,
        fontFamily: "var(--ih-font-sans)",
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ display: "inline-flex" }}>{icon}</span>
      {loading ? "Syncing…" : label}
    </button>
  )
}
