"use client"

import { useState, useRef } from "react"
import { api } from "@/lib/trpc/react"
import { Plus, Trash2 } from "lucide-react"
import type { AuditRecommendationRecord } from "@/modules/audit-workspace/audit-workspace.types"

interface Props {
  lensAnalysisId: string
  recommendations: AuditRecommendationRecord[]
  engagementId: string
  disabled?: boolean
}

export function RecommendationsList({ lensAnalysisId, recommendations, engagementId, disabled }: Props) {
  const utils = api.useUtils()

  const create = api.auditWorkspace.createRecommendation.useMutation({
    onSuccess: () => void utils.auditWorkspace.getOrCreate.invalidate({ engagementId }),
  })
  const del = api.auditWorkspace.deleteRecommendation.useMutation({
    onSuccess: () => void utils.auditWorkspace.getOrCreate.invalidate({ engagementId }),
  })

  const handleAdd = () => {
    create.mutate({
      lensAnalysisId,
      action: "New recommendation",
      priority: recommendations.length + 1,
    })
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div
        style={{
          borderRadius: "var(--ih-r-md)",
          border: "1px solid var(--ih-line)",
          overflow: "hidden",
        }}
      >
        {recommendations.length === 0 ? (
          <p
            style={{
              fontSize: 13,
              color: "var(--ih-ink-50)",
              padding: 16,
              fontStyle: "italic",
              fontFamily: "var(--ih-font-sans)",
              margin: 0,
            }}
          >
            No recommendations yet.
          </p>
        ) : (
          recommendations.map((r, idx) => (
            <RecommendationRow
              key={r.id}
              recommendation={r}
              disabled={disabled}
              engagementId={engagementId}
              isLast={idx === recommendations.length - 1}
              onDelete={() => {
                if (confirm("Delete this recommendation?")) del.mutate({ id: r.id })
              }}
            />
          ))
        )}
      </div>
      {!disabled && (
        <button
          onClick={handleAdd}
          disabled={create.isPending}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            fontSize: 12,
            color: "var(--ih-accent)",
            background: "none",
            border: "none",
            cursor: create.isPending ? "not-allowed" : "pointer",
            opacity: create.isPending ? 0.5 : 1,
            fontFamily: "var(--ih-font-sans)",
            padding: "2px 0",
          }}
        >
          <Plus size={13} /> Add recommendation
        </button>
      )}
    </div>
  )
}

interface RecommendationRowProps {
  recommendation: AuditRecommendationRecord
  disabled?: boolean
  engagementId: string
  isLast: boolean
  onDelete: () => void
}

function RecommendationRow({ recommendation, disabled, engagementId, isLast, onDelete }: RecommendationRowProps) {
  const [action, setAction] = useState(recommendation.action)
  const [effort, setEffort] = useState(recommendation.estimatedEffort ?? "")
  const [cost, setCost] = useState(recommendation.estimatedCost?.toString() ?? "")

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const utils = api.useUtils()

  const update = api.auditWorkspace.updateRecommendation.useMutation({
    onSuccess: () => void utils.auditWorkspace.getOrCreate.invalidate({ engagementId }),
  })

  const scheduleSave = (overrides?: Partial<{
    action: string
    effort: string
    cost: string
  }>) => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      const resolvedAction = overrides?.action ?? action
      const resolvedEffort = overrides?.effort ?? effort
      const resolvedCost = overrides?.cost ?? cost

      update.mutate({
        id: recommendation.id,
        action: resolvedAction,
        estimatedEffort: resolvedEffort || null,
        estimatedCost: resolvedCost ? parseInt(resolvedCost, 10) : null,
      })
    }, 500)
  }

  const inputStyle: React.CSSProperties = {
    borderRadius: "var(--ih-r-sm)",
    border: "1px solid var(--ih-line)",
    background: "var(--ih-surface-2)",
    color: "var(--ih-ink)",
    fontFamily: "var(--ih-font-sans)",
    padding: "4px 8px",
    fontSize: 12,
    outline: "none",
    opacity: disabled ? 0.5 : 1,
  }

  return (
    <div
      style={{
        padding: "10px 12px",
        display: "flex",
        flexDirection: "column",
        gap: 6,
        borderBottom: isLast ? "none" : "1px solid var(--ih-line)",
        background: "var(--ih-surface)",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
        <input
          value={action}
          onChange={(e) => {
            setAction(e.target.value)
            scheduleSave({ action: e.target.value })
          }}
          disabled={disabled}
          style={{ ...inputStyle, flex: 1, fontWeight: 500 }}
        />
        {!disabled && (
          <button
            onClick={onDelete}
            style={{
              padding: 4,
              borderRadius: "var(--ih-r-sm)",
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--ih-danger)",
              display: "flex",
              alignItems: "center",
            }}
            title="Delete recommendation"
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          value={effort}
          onChange={(e) => {
            setEffort(e.target.value)
            scheduleSave({ effort: e.target.value })
          }}
          disabled={disabled}
          placeholder="Estimated effort (e.g. 2 weeks)"
          style={{ ...inputStyle, flex: 1 }}
        />
        <input
          type="number"
          value={cost}
          onChange={(e) => {
            setCost(e.target.value)
            scheduleSave({ cost: e.target.value })
          }}
          disabled={disabled}
          placeholder="£ cost (pence)"
          style={{ ...inputStyle, width: 130 }}
        />
      </div>
    </div>
  )
}
