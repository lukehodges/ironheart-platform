"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Plus, Trash2 } from "lucide-react"

interface Recommendation {
  id: string
  action: string
  estimatedEffort: string | null
  estimatedCost: number | null
  priority: number
}

interface RecommendationsTableProps {
  recommendations: Recommendation[]
  lensAnalysisId: string
  onCreateRecommendation: (data: {
    lensAnalysisId: string
    action: string
    estimatedEffort?: string | null
    estimatedCost?: number | null
    priority: number
  }) => void
  onUpdateRecommendation: (data: {
    id: string
    action?: string
    estimatedEffort?: string | null
    estimatedCost?: number | null
    priority?: number
  }) => void
  onDeleteRecommendation: (id: string) => void
  disabled?: boolean
}

export function RecommendationsTable({
  recommendations,
  lensAnalysisId,
  onCreateRecommendation,
  onUpdateRecommendation,
  onDeleteRecommendation,
  disabled,
}: RecommendationsTableProps) {
  const [newRow, setNewRow] = useState<{
    action: string
    estimatedEffort: string
    estimatedCost: string
    priority: string
  } | null>(null)

  const handleAdd = () => {
    setNewRow({
      action: "",
      estimatedEffort: "",
      estimatedCost: "",
      priority: String(recommendations.length + 1),
    })
  }

  const handleSaveNew = () => {
    if (!newRow || !newRow.action.trim()) return
    onCreateRecommendation({
      lensAnalysisId,
      action: newRow.action.trim(),
      estimatedEffort: newRow.estimatedEffort.trim() || null,
      estimatedCost: newRow.estimatedCost ? parseInt(newRow.estimatedCost) : null,
      priority: parseInt(newRow.priority) || recommendations.length + 1,
    })
    setNewRow(null)
  }

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-muted-foreground">Recommendations</h4>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40%]">Action</TableHead>
              <TableHead className="w-[20%]">Estimated Effort</TableHead>
              <TableHead className="w-[15%]">Estimated Cost</TableHead>
              <TableHead className="w-[10%]">Priority</TableHead>
              <TableHead className="w-[5%]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {recommendations.map((r) => (
              <RecommendationRow
                key={r.id}
                recommendation={r}
                onUpdate={onUpdateRecommendation}
                onDelete={onDeleteRecommendation}
                disabled={disabled}
              />
            ))}
            {newRow && (
              <TableRow>
                <TableCell>
                  <Textarea
                    value={newRow.action}
                    onChange={(e) => setNewRow({ ...newRow, action: e.target.value })}
                    placeholder="Recommended action..."
                    className="min-h-[60px] text-sm"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    value={newRow.estimatedEffort}
                    onChange={(e) => setNewRow({ ...newRow, estimatedEffort: e.target.value })}
                    placeholder="e.g. 2 weeks"
                    className="text-sm"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    value={newRow.estimatedCost}
                    onChange={(e) => setNewRow({ ...newRow, estimatedCost: e.target.value })}
                    placeholder="0"
                    className="text-sm"
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
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={handleSaveNew} disabled={!newRow.action.trim()}>
                      Save
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setNewRow(null)}>
                      Cancel
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )}
            {recommendations.length === 0 && !newRow && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-6">
                  No recommendations yet. Add one to get started.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {!newRow && (
        <Button variant="outline" size="sm" onClick={handleAdd} disabled={disabled}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Add Recommendation
        </Button>
      )}
    </div>
  )
}

function RecommendationRow({
  recommendation,
  onUpdate,
  onDelete,
  disabled,
}: {
  recommendation: Recommendation
  onUpdate: RecommendationsTableProps["onUpdateRecommendation"]
  onDelete: (id: string) => void
  disabled?: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(recommendation)

  const handleBlur = () => {
    if (
      draft.action !== recommendation.action ||
      draft.estimatedEffort !== recommendation.estimatedEffort ||
      draft.estimatedCost !== recommendation.estimatedCost ||
      draft.priority !== recommendation.priority
    ) {
      onUpdate({
        id: recommendation.id,
        action: draft.action,
        estimatedEffort: draft.estimatedEffort,
        estimatedCost: draft.estimatedCost,
        priority: draft.priority,
      })
    }
    setEditing(false)
  }

  if (!editing) {
    return (
      <TableRow className="cursor-pointer hover:bg-muted/50" onClick={() => setEditing(true)}>
        <TableCell className="text-sm">{recommendation.action}</TableCell>
        <TableCell className="text-sm text-muted-foreground">{recommendation.estimatedEffort || "--"}</TableCell>
        <TableCell className="text-sm">
          {recommendation.estimatedCost != null ? `\u00A3${recommendation.estimatedCost.toLocaleString()}` : "--"}
        </TableCell>
        <TableCell className="text-sm">{recommendation.priority}</TableCell>
        <TableCell>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation()
              onDelete(recommendation.id)
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
          value={draft.action}
          onChange={(e) => setDraft({ ...draft, action: e.target.value })}
          onBlur={handleBlur}
          className="min-h-[60px] text-sm"
          autoFocus
        />
      </TableCell>
      <TableCell>
        <Input
          value={draft.estimatedEffort ?? ""}
          onChange={(e) => setDraft({ ...draft, estimatedEffort: e.target.value || null })}
          onBlur={handleBlur}
          className="text-sm"
        />
      </TableCell>
      <TableCell>
        <Input
          type="number"
          value={draft.estimatedCost ?? ""}
          onChange={(e) => setDraft({ ...draft, estimatedCost: e.target.value ? parseInt(e.target.value) : null })}
          onBlur={handleBlur}
          className="text-sm"
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
        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
          onClick={() => onDelete(recommendation.id)}
          disabled={disabled}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </TableCell>
    </TableRow>
  )
}
