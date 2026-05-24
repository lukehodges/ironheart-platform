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
    return (
      <div style={{ fontSize: 13, color: "var(--ih-ink-50)", fontFamily: "var(--ih-font-sans)" }}>
        Lens not initialised yet.
      </div>
    )
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 800 }}>
      {/* RAG */}
      <section>
        <h3
          className="ih-serif"
          style={{ fontSize: 20, margin: 0, marginBottom: 12, color: "var(--ih-ink)" }}
        >
          RAG score
        </h3>
        <RagSelector value={lensData.ragScore} onChange={handleRagChange} disabled={disabled} />

        {lensData.ragScore && (
          <div style={{ marginTop: 12 }}>
            <label
              className="ih-mono"
              style={{
                fontSize: 9,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                color: "var(--ih-ink-40)",
                display: "block",
                marginBottom: 6,
              }}
            >
              RAG justification
            </label>
            <textarea
              value={ragJustification}
              onChange={(e) => handleJustChange(e.target.value)}
              disabled={disabled}
              rows={3}
              style={{
                width: "100%",
                borderRadius: "var(--ih-r-md)",
                border: "1px solid var(--ih-line)",
                background: "var(--ih-surface)",
                padding: "8px 12px",
                fontSize: 13,
                fontFamily: "var(--ih-font-sans)",
                color: "var(--ih-ink)",
                resize: "vertical",
                opacity: disabled ? 0.5 : 1,
                outline: "none",
                boxSizing: "border-box",
              }}
              placeholder="Why this score?"
              onFocus={(e) => { e.currentTarget.style.borderColor = "var(--ih-accent)" }}
              onBlur={(e) => { e.currentTarget.style.borderColor = "var(--ih-line)" }}
            />
          </div>
        )}
      </section>

      {/* Current state */}
      <section>
        <h3
          className="ih-serif"
          style={{ fontSize: 20, margin: 0, marginBottom: 12, color: "var(--ih-ink)" }}
        >
          Current state
        </h3>
        <textarea
          value={currentState}
          onChange={(e) => handleStateChange(e.target.value)}
          disabled={disabled}
          rows={6}
          style={{
            width: "100%",
            borderRadius: "var(--ih-r-md)",
            border: "1px solid var(--ih-line)",
            background: "var(--ih-surface)",
            padding: "10px 12px",
            fontSize: 13,
            fontFamily: "var(--ih-font-sans)",
            color: "var(--ih-ink)",
            resize: "vertical",
            opacity: disabled ? 0.5 : 1,
            outline: "none",
            boxSizing: "border-box",
          }}
          placeholder="Describe the current state of this lens."
          onFocus={(e) => { e.currentTarget.style.borderColor = "var(--ih-accent)" }}
          onBlur={(e) => { e.currentTarget.style.borderColor = "var(--ih-line)" }}
        />
      </section>

      {/* Findings */}
      <section>
        <h3
          className="ih-serif"
          style={{ fontSize: 20, margin: 0, marginBottom: 12, color: "var(--ih-ink)" }}
        >
          Findings
        </h3>
        <FindingsTable
          lensAnalysisId={lensData.id}
          findings={lensData.findings}
          engagementId={engagementId}
          disabled={disabled}
        />
      </section>

      {/* Recommendations */}
      <section>
        <h3
          className="ih-serif"
          style={{ fontSize: 20, margin: 0, marginBottom: 12, color: "var(--ih-ink)" }}
        >
          Recommendations
        </h3>
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
