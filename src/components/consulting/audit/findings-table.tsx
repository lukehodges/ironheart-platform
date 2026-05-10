"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Plus, Trash2 } from "lucide-react"

type FindingImpact = "HIGH" | "MEDIUM" | "LOW"

interface Finding {
  id: string
  finding: string
  impact: FindingImpact
  evidence: string | null
  priority: number
  estimatedAnnualWaste: number | null
}

interface FindingsTableProps {
  findings: Finding[]
  lensAnalysisId: string
  onCreateFinding: (data: {
    lensAnalysisId: string
    finding: string
    impact: FindingImpact
    evidence?: string | null
    priority: number
    estimatedAnnualWaste?: number | null
  }) => void
  onUpdateFinding: (data: {
    id: string
    finding?: string
    impact?: FindingImpact
    evidence?: string | null
    priority?: number
    estimatedAnnualWaste?: number | null
  }) => void
  onDeleteFinding: (id: string) => void
  disabled?: boolean
}

export function FindingsTable({
  findings,
  lensAnalysisId,
  onCreateFinding,
  onUpdateFinding,
  onDeleteFinding,
  disabled,
}: FindingsTableProps) {
  const [newRow, setNewRow] = useState<{
    finding: string
    impact: FindingImpact
    evidence: string
    priority: string
    estimatedAnnualWaste: string
  } | null>(null)

  const handleAdd = () => {
    setNewRow({ finding: "", impact: "MEDIUM", evidence: "", priority: String(findings.length + 1), estimatedAnnualWaste: "" })
  }

  const handleSaveNew = () => {
    if (!newRow || !newRow.finding.trim()) return
    onCreateFinding({
      lensAnalysisId,
      finding: newRow.finding.trim(),
      impact: newRow.impact,
      evidence: newRow.evidence.trim() || null,
      priority: parseInt(newRow.priority) || findings.length + 1,
      estimatedAnnualWaste: newRow.estimatedAnnualWaste ? parseInt(newRow.estimatedAnnualWaste) : null,
    })
    setNewRow(null)
  }

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-muted-foreground">Findings</h4>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[30%]">Finding</TableHead>
              <TableHead className="w-[10%]">Impact</TableHead>
              <TableHead className="w-[25%]">Evidence</TableHead>
              <TableHead className="w-[8%]">Priority</TableHead>
              <TableHead className="w-[15%]">Est. Annual Waste</TableHead>
              <TableHead className="w-[5%]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {findings.map((f) => (
              <FindingRow
                key={f.id}
                finding={f}
                onUpdate={onUpdateFinding}
                onDelete={onDeleteFinding}
                disabled={disabled}
              />
            ))}
            {newRow && (
              <TableRow>
                <TableCell>
                  <Textarea
                    value={newRow.finding}
                    onChange={(e) => setNewRow({ ...newRow, finding: e.target.value })}
                    placeholder="Describe finding..."
                    className="min-h-[60px] text-sm"
                  />
                </TableCell>
                <TableCell>
                  <Select
                    value={newRow.impact}
                    onValueChange={(v) => setNewRow({ ...newRow, impact: v as FindingImpact })}
                  >
                    <SelectTrigger className="text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="HIGH">High</SelectItem>
                      <SelectItem value="MEDIUM">Medium</SelectItem>
                      <SelectItem value="LOW">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Textarea
                    value={newRow.evidence}
                    onChange={(e) => setNewRow({ ...newRow, evidence: e.target.value })}
                    placeholder="Evidence..."
                    className="min-h-[60px] text-sm"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    value={newRow.priority}
                    onChange={(e) => setNewRow({ ...newRow, priority: e.target.value })}
                    className="text-sm"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    value={newRow.estimatedAnnualWaste}
                    onChange={(e) => setNewRow({ ...newRow, estimatedAnnualWaste: e.target.value })}
                    placeholder="0"
                    className="text-sm"
                  />
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={handleSaveNew} disabled={!newRow.finding.trim()}>
                      Save
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setNewRow(null)}>
                      Cancel
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )}
            {findings.length === 0 && !newRow && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-6">
                  No findings yet. Add one to get started.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {!newRow && (
        <Button variant="outline" size="sm" onClick={handleAdd} disabled={disabled}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Add Finding
        </Button>
      )}
    </div>
  )
}

function FindingRow({
  finding,
  onUpdate,
  onDelete,
  disabled,
}: {
  finding: Finding
  onUpdate: FindingsTableProps["onUpdateFinding"]
  onDelete: (id: string) => void
  disabled?: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(finding)

  const handleBlur = () => {
    if (
      draft.finding !== finding.finding ||
      draft.impact !== finding.impact ||
      draft.evidence !== finding.evidence ||
      draft.priority !== finding.priority ||
      draft.estimatedAnnualWaste !== finding.estimatedAnnualWaste
    ) {
      onUpdate({
        id: finding.id,
        finding: draft.finding,
        impact: draft.impact,
        evidence: draft.evidence,
        priority: draft.priority,
        estimatedAnnualWaste: draft.estimatedAnnualWaste,
      })
    }
    setEditing(false)
  }

  if (!editing) {
    return (
      <TableRow className="cursor-pointer hover:bg-muted/50" onClick={() => setEditing(true)}>
        <TableCell className="text-sm">{finding.finding}</TableCell>
        <TableCell>
          <ImpactBadge impact={finding.impact} />
        </TableCell>
        <TableCell className="text-sm text-muted-foreground">{finding.evidence || "--"}</TableCell>
        <TableCell className="text-sm">{finding.priority}</TableCell>
        <TableCell className="text-sm">
          {finding.estimatedAnnualWaste != null ? `\u00A3${finding.estimatedAnnualWaste.toLocaleString()}` : "--"}
        </TableCell>
        <TableCell>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation()
              onDelete(finding.id)
            }}
            disabled={disabled}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </TableCell>
      </TableRow>
    )
  }

  return (
    <TableRow>
      <TableCell>
        <Textarea
          value={draft.finding}
          onChange={(e) => setDraft({ ...draft, finding: e.target.value })}
          onBlur={handleBlur}
          className="min-h-[60px] text-sm"
          autoFocus
        />
      </TableCell>
      <TableCell>
        <Select
          value={draft.impact}
          onValueChange={(v) => {
            const updated = { ...draft, impact: v as FindingImpact }
            setDraft(updated)
            onUpdate({ id: finding.id, impact: v as FindingImpact })
          }}
        >
          <SelectTrigger className="text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="HIGH">High</SelectItem>
            <SelectItem value="MEDIUM">Medium</SelectItem>
            <SelectItem value="LOW">Low</SelectItem>
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell>
        <Textarea
          value={draft.evidence ?? ""}
          onChange={(e) => setDraft({ ...draft, evidence: e.target.value || null })}
          onBlur={handleBlur}
          className="min-h-[60px] text-sm"
        />
      </TableCell>
      <TableCell>
        <Input
          type="number"
          value={draft.priority}
          onChange={(e) => setDraft({ ...draft, priority: parseInt(e.target.value) || 0 })}
          onBlur={handleBlur}
          className="text-sm"
        />
      </TableCell>
      <TableCell>
        <Input
          type="number"
          value={draft.estimatedAnnualWaste ?? ""}
          onChange={(e) => setDraft({ ...draft, estimatedAnnualWaste: e.target.value ? parseInt(e.target.value) : null })}
          onBlur={handleBlur}
          className="text-sm"
        />
      </TableCell>
      <TableCell>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
          onClick={() => onDelete(finding.id)}
          disabled={disabled}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </TableCell>
    </TableRow>
  )
}

function ImpactBadge({ impact }: { impact: FindingImpact }) {
  const styles: Record<FindingImpact, string> = {
    HIGH: "bg-red-100 text-red-700",
    MEDIUM: "bg-amber-100 text-amber-700",
    LOW: "bg-emerald-100 text-emerald-700",
  }
  return (
    <span className={`inline-block rounded px-1.5 py-0.5 text-xs font-medium ${styles[impact]}`}>
      {impact}
    </span>
  )
}
