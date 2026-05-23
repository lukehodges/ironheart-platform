"use client"

import { useState, useRef } from "react"
import { api } from "@/lib/trpc/react"
import { Plus, Trash2 } from "lucide-react"
import type { AuditFindingRecord, FindingImpact } from "@/modules/audit-workspace/audit-workspace.types"

const IMPACT_OPTIONS: FindingImpact[] = ["HIGH", "MEDIUM", "LOW"]

interface Props {
  lensAnalysisId: string
  findings: AuditFindingRecord[]
  engagementId: string
  disabled?: boolean
}

export function FindingsTable({ lensAnalysisId, findings, engagementId, disabled }: Props) {
  const utils = api.useUtils()

  const create = api.auditWorkspace.createFinding.useMutation({
    onSuccess: () => void utils.auditWorkspace.getOrCreate.invalidate({ engagementId }),
  })
  const del = api.auditWorkspace.deleteFinding.useMutation({
    onSuccess: () => void utils.auditWorkspace.getOrCreate.invalidate({ engagementId }),
  })

  const handleAdd = () => {
    create.mutate({
      lensAnalysisId,
      finding: "New finding",
      impact: "MEDIUM",
      priority: findings.length + 1,
    })
  }

  return (
    <div className="space-y-2">
      <div className="rounded border border-border divide-y divide-border">
        {findings.length === 0 ? (
          <p className="text-sm text-muted-foreground p-4 italic">No findings yet.</p>
        ) : (
          findings.map((f) => (
            <FindingRow
              key={f.id}
              finding={f}
              disabled={disabled}
              engagementId={engagementId}
              onDelete={() => {
                if (confirm("Delete this finding?")) del.mutate({ id: f.id })
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
          <Plus size={14} /> Add finding
        </button>
      )}
    </div>
  )
}

interface FindingRowProps {
  finding: AuditFindingRecord
  disabled?: boolean
  engagementId: string
  onDelete: () => void
}

function FindingRow({ finding, disabled, engagementId, onDelete }: FindingRowProps) {
  const [text, setText] = useState(finding.finding)
  const [impact, setImpact] = useState<FindingImpact>(finding.impact)
  const [evidence, setEvidence] = useState(finding.evidence ?? "")
  const [waste, setWaste] = useState(finding.estimatedAnnualWaste?.toString() ?? "")

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const utils = api.useUtils()

  const update = api.auditWorkspace.updateFinding.useMutation({
    onSuccess: () => void utils.auditWorkspace.getOrCreate.invalidate({ engagementId }),
  })

  const scheduleSave = (overrides?: Partial<{
    finding: string
    impact: FindingImpact
    evidence: string
    waste: string
  }>) => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      const resolvedText = overrides?.finding ?? text
      const resolvedImpact = overrides?.impact ?? impact
      const resolvedEvidence = overrides?.evidence ?? evidence
      const resolvedWaste = overrides?.waste ?? waste

      update.mutate({
        id: finding.id,
        finding: resolvedText,
        impact: resolvedImpact,
        evidence: resolvedEvidence || null,
        estimatedAnnualWaste: resolvedWaste ? parseInt(resolvedWaste, 10) : null,
      })
    }, 500)
  }

  return (
    <div className="p-3 space-y-2">
      <div className="flex items-start gap-2">
        <input
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            scheduleSave({ finding: e.target.value })
          }}
          disabled={disabled}
          className="flex-1 rounded border border-border px-2 py-1 text-sm font-medium disabled:opacity-50 bg-background"
        />
        <select
          value={impact}
          onChange={(e) => {
            const val = e.target.value as FindingImpact
            setImpact(val)
            scheduleSave({ impact: val })
          }}
          disabled={disabled}
          className="rounded border border-border px-2 py-1 text-xs disabled:opacity-50 bg-background"
        >
          {IMPACT_OPTIONS.map((i) => (
            <option key={i} value={i}>
              {i}
            </option>
          ))}
        </select>
        {!disabled && (
          <button
            onClick={onDelete}
            className="p-1 rounded hover:bg-muted transition-colors"
            title="Delete finding"
          >
            <Trash2 size={14} className="text-red-600" />
          </button>
        )}
      </div>
      <div className="flex gap-2">
        <input
          value={evidence}
          onChange={(e) => {
            setEvidence(e.target.value)
            scheduleSave({ evidence: e.target.value })
          }}
          disabled={disabled}
          placeholder="Evidence"
          className="flex-1 rounded border border-border px-2 py-1 text-xs disabled:opacity-50 bg-background"
        />
        <input
          type="number"
          value={waste}
          onChange={(e) => {
            setWaste(e.target.value)
            scheduleSave({ waste: e.target.value })
          }}
          disabled={disabled}
          placeholder="£ waste/year (pence)"
          className="w-44 rounded border border-border px-2 py-1 text-xs disabled:opacity-50 bg-background"
        />
      </div>
    </div>
  )
}
