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
    <div className="space-y-2">
      <div className="rounded border border-border divide-y divide-border">
        {recommendations.length === 0 ? (
          <p className="text-sm text-muted-foreground p-4 italic">No recommendations yet.</p>
        ) : (
          recommendations.map((r) => (
            <RecommendationRow
              key={r.id}
              recommendation={r}
              disabled={disabled}
              engagementId={engagementId}
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
          className="flex items-center gap-1 text-sm text-primary hover:underline disabled:opacity-50"
        >
          <Plus size={14} /> Add recommendation
        </button>
      )}
    </div>
  )
}

interface RecommendationRowProps {
  recommendation: AuditRecommendationRecord
  disabled?: boolean
  engagementId: string
  onDelete: () => void
}

function RecommendationRow({ recommendation, disabled, engagementId, onDelete }: RecommendationRowProps) {
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

  return (
    <div className="p-3 space-y-2">
      <div className="flex items-start gap-2">
        <input
          value={action}
          onChange={(e) => {
            setAction(e.target.value)
            scheduleSave({ action: e.target.value })
          }}
          disabled={disabled}
          className="flex-1 rounded border border-border px-2 py-1 text-sm font-medium disabled:opacity-50 bg-background"
        />
        {!disabled && (
          <button
            onClick={onDelete}
            className="p-1 rounded hover:bg-muted transition-colors"
            title="Delete recommendation"
          >
            <Trash2 size={14} className="text-red-600" />
          </button>
        )}
      </div>
      <div className="flex gap-2">
        <input
          value={effort}
          onChange={(e) => {
            setEffort(e.target.value)
            scheduleSave({ effort: e.target.value })
          }}
          disabled={disabled}
          placeholder="Estimated effort (e.g. 2 weeks)"
          className="flex-1 rounded border border-border px-2 py-1 text-xs disabled:opacity-50 bg-background"
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
          className="w-36 rounded border border-border px-2 py-1 text-xs disabled:opacity-50 bg-background"
        />
      </div>
    </div>
  )
}
