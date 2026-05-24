"use client"

import { useState } from "react"
import {
  Building2,
  Cloud,
  FileSpreadsheet,
  Plus,
  RotateCcw,
  Sparkles,
  Upload,
} from "lucide-react"
import type { CoverageStats } from "./types"

interface DemoHeaderProps {
  companyName: string
  stats: CoverageStats
  onOpenCommandPalette: () => void
  onOpenBulkImport: () => void
  onReset: () => void
  /** Mock sync — animates a fake spinner then surfaces a toast (parent handles). */
  onSync: (source: "google" | "hris" | "csv") => void
}

export function DemoHeader({
  companyName,
  stats,
  onOpenCommandPalette,
  onOpenBulkImport,
  onReset,
  onSync,
}: DemoHeaderProps) {
  const [syncing, setSyncing] = useState<null | "google" | "hris" | "csv">(null)

  const triggerSync = (s: "google" | "hris" | "csv") => {
    setSyncing(s)
    setTimeout(() => {
      setSyncing(null)
      onSync(s)
    }, 1200)
  }

  return (
    <header
      style={{
        borderBottom: "1px solid var(--ih-line)",
        padding: "18px 28px 16px",
        background: "var(--ih-surface)",
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
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
          style={iconBtn()}
        >
          <RotateCcw size={11} style={{ color: "var(--ih-accent)" }} />
        </button>
      </div>

      <div style={{ display: "flex", alignItems: "flex-end", gap: 24, flexWrap: "wrap" }}>
        {/* title block */}
        <div style={{ flex: "1 1 320px", minWidth: 0 }}>
          <p
            className="ih-mono"
            style={{
              fontSize: 9,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              color: "var(--ih-ink-40)",
              marginBottom: 4,
            }}
          >
            Onboarding · Org chart
          </p>
          <h1
            className="ih-serif"
            style={{ fontSize: 28, margin: 0, color: "var(--ih-ink)", lineHeight: 1.05 }}
          >
            {companyName}
          </h1>
          <p
            style={{
              fontSize: 13,
              color: "var(--ih-ink-65)",
              marginTop: 6,
              lineHeight: 1.45,
              maxWidth: 580,
            }}
          >
            Map their organisation, surface the people we need to interview, send the
            questionnaires — all from one canvas.
          </p>
        </div>

        {/* coverage stats */}
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
          <StatTile label="Coverage" value={`${stats.coveragePct}%`} tone="accent" />
          <StatTile label="People mapped" value={`${stats.mapped}/${stats.totalPeople}`} />
          <StatTile label="Interview targets" value={`${stats.interviewsCompleted}/${stats.interviewTargets}`} />
          <StatTile label="Forms sent" value={`${stats.formsSent}`} />
        </div>

        {/* actions */}
        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          <SyncButton
            icon={<Cloud size={12} />}
            label="Sync Google Workspace"
            loading={syncing === "google"}
            onClick={() => triggerSync("google")}
          />
          <SyncButton
            icon={<Building2 size={12} />}
            label="Connect HRIS"
            loading={syncing === "hris"}
            onClick={() => triggerSync("hris")}
            muted
          />
          <SyncButton
            icon={<FileSpreadsheet size={12} />}
            label="Import CSV"
            loading={syncing === "csv"}
            onClick={onOpenBulkImport}
            muted
          />
        </div>
      </div>

      {/* quick-actions strip */}
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <button
          type="button"
          onClick={onOpenCommandPalette}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 10px",
            borderRadius: 6,
            background: "var(--ih-surface-2)",
            border: "1px solid var(--ih-line)",
            cursor: "pointer",
            color: "var(--ih-ink-65)",
            fontSize: 12,
            fontFamily: "var(--ih-font-sans)",
          }}
        >
          <Plus size={12} />
          Add person, vacancy, contractor…
          <span
            className="ih-mono"
            style={{
              marginLeft: 12,
              padding: "1px 6px",
              borderRadius: 4,
              background: "var(--ih-surface)",
              border: "1px solid var(--ih-line)",
              fontSize: 10,
              color: "var(--ih-ink-50)",
            }}
          >
            ⌘K
          </span>
        </button>
        <button
          type="button"
          onClick={onOpenBulkImport}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 10px",
            borderRadius: 6,
            background: "transparent",
            border: "1px solid var(--ih-line)",
            cursor: "pointer",
            color: "var(--ih-ink-65)",
            fontSize: 12,
            fontFamily: "var(--ih-font-sans)",
          }}
        >
          <Upload size={12} />
          Paste-to-populate
        </button>
      </div>
    </header>
  )
}

function StatTile({ label, value, tone }: { label: string; value: string; tone?: "accent" }) {
  return (
    <div
      style={{
        background: "var(--ih-surface)",
        padding: "10px 16px",
        minWidth: 110,
      }}
    >
      <p className="ih-eyebrow" style={{ marginBottom: 4 }}>{label}</p>
      <p
        className="ih-serif"
        style={{
          margin: 0,
          fontSize: 22,
          lineHeight: 1,
          color: tone === "accent" ? "var(--ih-accent)" : "var(--ih-ink)",
        }}
      >
        {value}
      </p>
    </div>
  )
}

function SyncButton({
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
        padding: "7px 11px",
        borderRadius: 6,
        background: muted ? "transparent" : "var(--ih-ink)",
        color: muted ? "var(--ih-ink)" : "#fff",
        border: muted ? "1px solid var(--ih-line)" : "1px solid var(--ih-ink)",
        cursor: loading ? "wait" : "pointer",
        opacity: loading ? 0.7 : 1,
        fontSize: 11.5,
        fontFamily: "var(--ih-font-sans)",
        whiteSpace: "nowrap",
        transition: "opacity 0.12s",
      }}
    >
      <span style={{ display: "inline-flex", animation: loading ? "ih-spin 0.9s linear infinite" : "none" }}>
        {icon}
      </span>
      {loading ? "Syncing…" : label}
      <style jsx global>{`
        @keyframes ih-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </button>
  )
}

function iconBtn(): React.CSSProperties {
  return {
    width: 18,
    height: 18,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: "none",
    background: "transparent",
    cursor: "pointer",
    borderRadius: 4,
  }
}
