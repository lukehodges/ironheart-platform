"use client"

import { useState } from "react"
import { LensPanel } from "./lens-panel"
import type {
  AuditLens,
  AuditSessionWithLenses,
  AuditFindingRecord,
  AuditLensAnalysisRecord,
  AuditRecommendationRecord,
} from "@/modules/audit-workspace/audit-workspace.types"

const LENS_ORDER: AuditLens[] = ["REVENUE", "OPERATIONS", "FINANCE", "TECHNOLOGY", "TEAM"]

type LensData = AuditLensAnalysisRecord & {
  findings: AuditFindingRecord[]
  recommendations: AuditRecommendationRecord[]
}

interface Props {
  engagementId: string
  session: AuditSessionWithLenses
  disabled?: boolean
}

const RAG_COLORS: Record<string, string> = {
  RED: "var(--ih-danger)",
  AMBER: "var(--ih-warn)",
  GREEN: "var(--ih-ok)",
}

export function ProcessingLayer({ engagementId, session, disabled }: Props) {
  const [activeLens, setActiveLens] = useState<AuditLens>("REVENUE")

  const lenses = session.lenses as LensData[]

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: "var(--ih-bg)",
      }}
    >
      {/* Lens tabs */}
      <div
        style={{
          borderBottom: "1px solid var(--ih-line)",
          padding: "10px 24px 0",
          background: "var(--ih-surface)",
          display: "flex",
          gap: 2,
        }}
      >
        {LENS_ORDER.map((lens) => {
          const lensData = lenses.find((l) => l.lens === lens)
          const isActive = activeLens === lens
          return (
            <button
              key={lens}
              onClick={() => setActiveLens(lens)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 16px",
                fontSize: 12,
                fontFamily: "var(--ih-font-sans)",
                background: "transparent",
                border: "none",
                borderBottom: isActive
                  ? "2px solid var(--ih-accent)"
                  : "2px solid transparent",
                color: isActive ? "var(--ih-ink)" : "var(--ih-ink-50)",
                fontWeight: isActive ? 500 : 400,
                cursor: "pointer",
                transition: "color 0.15s",
                marginBottom: -1,
              }}
            >
              {lens}
              {lensData?.ragScore && (
                <span
                  style={{
                    display: "inline-block",
                    width: 7,
                    height: 7,
                    borderRadius: 999,
                    background: RAG_COLORS[lensData.ragScore] ?? "var(--ih-ink-30)",
                    flexShrink: 0,
                  }}
                />
              )}
            </button>
          )
        })}
      </div>

      {/* Active lens content */}
      <div style={{ flex: 1, overflowY: "auto", padding: 24 }} className="scrollbar-thin">
        <LensPanel
          engagementId={engagementId}
          lens={activeLens}
          lensData={lenses.find((l) => l.lens === activeLens)}
          disabled={disabled}
        />
      </div>
    </div>
  )
}
