"use client"

import { useState, useRef } from "react"
import { api } from "@/lib/trpc/react"
import { Plus, Trash2 } from "lucide-react"
import type { AuditFindingRecord, FindingImpact } from "@/modules/audit-workspace/audit-workspace.types"

const IMPACT_OPTIONS: FindingImpact[] = ["HIGH", "MEDIUM", "LOW"]

const IMPACT_COLORS: Record<FindingImpact, string> = {
  HIGH: "var(--ih-danger)",
  MEDIUM: "var(--ih-warn)",
  LOW: "var(--ih-ink-40)",
}

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
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div
        style={{
          borderRadius: "var(--ih-r-md)",
          border: "1px solid var(--ih-line)",
          overflow: "hidden",
        }}
      >
        {findings.length === 0 ? (
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
            No findings yet.
          </p>
        ) : (
          findings.map((f, idx) => (
            <FindingRow
              key={f.id}
              finding={f}
              disabled={disabled}
              engagementId={engagementId}
              isLast={idx === findings.length - 1}
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
          <Plus size={13} /> Add finding
        </button>
      )}
    </div>
  )
}

interface FindingRowProps {
  finding: AuditFindingRecord
  disabled?: boolean
  engagementId: string
  isLast: boolean
  onDelete: () => void
}

function FindingRow({ finding, disabled, engagementId, isLast, onDelete }: FindingRowProps) {
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
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            scheduleSave({ finding: e.target.value })
          }}
          disabled={disabled}
          style={{ ...inputStyle, flex: 1, fontWeight: 500 }}
        />
        <select
          value={impact}
          onChange={(e) => {
            const val = e.target.value as FindingImpact
            setImpact(val)
            scheduleSave({ impact: val })
          }}
          disabled={disabled}
          style={{
            ...inputStyle,
            color: IMPACT_COLORS[impact],
            fontFamily: "var(--ih-font-mono)",
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: "0.08em",
          }}
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
            title="Delete finding"
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          value={evidence}
          onChange={(e) => {
            setEvidence(e.target.value)
            scheduleSave({ evidence: e.target.value })
          }}
          disabled={disabled}
          placeholder="Evidence"
          style={{ ...inputStyle, flex: 1 }}
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
          style={{ ...inputStyle, width: 160 }}
        />
      </div>
    </div>
  )
}
