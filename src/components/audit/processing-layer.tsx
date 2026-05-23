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

export function ProcessingLayer({ engagementId, session, disabled }: Props) {
  const [activeLens, setActiveLens] = useState<AuditLens>("REVENUE")

  const lenses = session.lenses as LensData[]

  return (
    <div className="flex h-full flex-col">
      {/* Lens tabs */}
      <div className="border-b border-border px-6 flex gap-1">
        {LENS_ORDER.map((lens) => {
          const lensData = lenses.find((l) => l.lens === lens)
          return (
            <button
              key={lens}
              onClick={() => setActiveLens(lens)}
              className={`px-4 py-2 text-sm border-b-2 -mb-px flex items-center gap-1.5 transition-colors ${
                activeLens === lens
                  ? "border-primary text-foreground font-medium"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {lens}
              {lensData?.ragScore && (
                <span
                  className={`inline-block w-2 h-2 rounded-full ${
                    lensData.ragScore === "RED"
                      ? "bg-red-500"
                      : lensData.ragScore === "AMBER"
                        ? "bg-amber-500"
                        : "bg-emerald-500"
                  }`}
                />
              )}
            </button>
          )
        })}
      </div>

      {/* Active lens content */}
      <div className="flex-1 overflow-y-auto p-6">
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
