"use client"

import { useState, useEffect, useRef } from "react"
import { api } from "@/lib/trpc/react"
import { RagSelector } from "./rag-selector"
import { FindingsTable } from "./findings-table"
import { RecommendationsList } from "./recommendations-list"
import type {
  AuditLens,
  AuditLensAnalysisRecord,
  AuditFindingRecord,
  AuditRecommendationRecord,
  RagScore,
} from "@/modules/audit-workspace/audit-workspace.types"

type LensData = AuditLensAnalysisRecord & {
  findings: AuditFindingRecord[]
  recommendations: AuditRecommendationRecord[]
}

interface Props {
  engagementId: string
  lens: AuditLens
  lensData: LensData | undefined
  disabled?: boolean
}

export function LensPanel({ engagementId, lens, lensData, disabled }: Props) {
  const utils = api.useUtils()

  const [currentState, setCurrentState] = useState(lensData?.currentState ?? "")
  const [ragJustification, setRagJustification] = useState(lensData?.ragJustification ?? "")
  const stateTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const justTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Reset on lens change
  useEffect(() => {
    setCurrentState(lensData?.currentState ?? "")
    setRagJustification(lensData?.ragJustification ?? "")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lens, lensData?.id])

  const upsertMutation = api.auditWorkspace.upsertLensByEngagement.useMutation({
    onSuccess: () => void utils.auditWorkspace.getOrCreate.invalidate({ engagementId }),
  })

  const handleRagChange = (ragScore: RagScore) => {
    upsertMutation.mutate({ engagementId, lens, ragScore })
  }

  const handleStateChange = (value: string) => {
    setCurrentState(value)
    if (stateTimer.current) clearTimeout(stateTimer.current)
    stateTimer.current = setTimeout(
      () => upsertMutation.mutate({ engagementId, lens, currentState: value }),
      500,
    )
  }

  const handleJustChange = (value: string) => {
    setRagJustification(value)
    if (justTimer.current) clearTimeout(justTimer.current)
    justTimer.current = setTimeout(
      () => upsertMutation.mutate({ engagementId, lens, ragJustification: value }),
      500,
    )
  }

  if (!lensData) {
    return <div className="text-sm text-muted-foreground">Lens not initialised yet.</div>
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* RAG */}
      <section>
        <h3 className="font-serif text-lg mb-3">RAG score</h3>
        <RagSelector value={lensData.ragScore} onChange={handleRagChange} disabled={disabled} />

        {lensData.ragScore && (
          <div className="mt-3">
            <label className="text-xs uppercase tracking-wider text-muted-foreground mb-1 block">
              RAG justification
            </label>
            <textarea
              value={ragJustification}
              onChange={(e) => handleJustChange(e.target.value)}
              disabled={disabled}
              rows={3}
              className="w-full rounded border border-border p-2 text-sm disabled:opacity-50 bg-background"
              placeholder="Why this score?"
            />
          </div>
        )}
      </section>

      {/* Current state */}
      <section>
        <h3 className="font-serif text-lg mb-3">Current state</h3>
        <textarea
          value={currentState}
          onChange={(e) => handleStateChange(e.target.value)}
          disabled={disabled}
          rows={6}
          className="w-full rounded border border-border p-3 text-sm disabled:opacity-50 bg-background"
          placeholder="Describe the current state of this lens."
        />
      </section>

      {/* Findings */}
      <section>
        <h3 className="font-serif text-lg mb-3">Findings</h3>
        <FindingsTable
          lensAnalysisId={lensData.id}
          findings={lensData.findings}
          engagementId={engagementId}
          disabled={disabled}
        />
      </section>

      {/* Recommendations */}
      <section>
        <h3 className="font-serif text-lg mb-3">Recommendations</h3>
        <RecommendationsList
          lensAnalysisId={lensData.id}
          recommendations={lensData.recommendations}
          engagementId={engagementId}
          disabled={disabled}
        />
      </section>
    </div>
  )
}
