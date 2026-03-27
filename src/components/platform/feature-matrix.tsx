"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Plus, Trash2 } from "lucide-react"

interface Plan {
  id: string
  name: string
  features: string[]
}

interface FeatureMatrixProps {
  plans: Plan[]
  onUpdate: (planId: string, features: string[]) => void
}

export function FeatureMatrix({ plans, onUpdate }: FeatureMatrixProps) {
  const allFeatures = Array.from(new Set(plans.flatMap((p) => p.features)))
  const [features, setFeatures] = useState<string[]>(allFeatures)
  const [newFeature, setNewFeature] = useState("")
  const [editingIdx, setEditingIdx] = useState<number | null>(null)
  const [editValue, setEditValue] = useState("")

  const addFeature = () => {
    const trimmed = newFeature.trim()
    if (!trimmed || features.includes(trimmed)) return
    setFeatures([...features, trimmed])
    setNewFeature("")
  }

  const removeFeature = (idx: number) => {
    const feature = features[idx]
    const next = features.filter((_, i) => i !== idx)
    setFeatures(next)
    for (const plan of plans) {
      if (plan.features.includes(feature)) {
        onUpdate(plan.id, plan.features.filter((f) => f !== feature))
      }
    }
  }

  const startEdit = (idx: number) => {
    setEditingIdx(idx)
    setEditValue(features[idx])
  }

  const finishEdit = (idx: number) => {
    const trimmed = editValue.trim()
    if (!trimmed) {
      setEditingIdx(null)
      return
    }
    const oldFeature = features[idx]
    const next = [...features]
    next[idx] = trimmed
    setFeatures(next)
    setEditingIdx(null)
    for (const plan of plans) {
      if (plan.features.includes(oldFeature)) {
        onUpdate(plan.id, plan.features.map((f) => (f === oldFeature ? trimmed : f)))
      }
    }
  }

  const toggleFeature = (planId: string, feature: string) => {
    const plan = plans.find((p) => p.id === planId)
    if (!plan) return
    const has = plan.features.includes(feature)
    const next = has
      ? plan.features.filter((f) => f !== feature)
      : [...plan.features, feature]
    onUpdate(planId, next)
  }

  if (plans.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Add at least one plan to configure the feature matrix.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left px-4 py-2 font-medium min-w-[200px]">Feature</th>
              {plans.map((plan) => (
                <th key={plan.id} className="text-center px-4 py-2 font-medium min-w-[120px]">
                  {plan.name}
                </th>
              ))}
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {features.map((feature, idx) => (
              <tr key={idx} className="border-b last:border-0">
                <td className="px-4 py-2">
                  {editingIdx === idx ? (
                    <Input
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={() => finishEdit(idx)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") finishEdit(idx)
                        if (e.key === "Escape") setEditingIdx(null)
                      }}
                      className="h-7 text-sm"
                      autoFocus
                    />
                  ) : (
                    <button
                      onClick={() => startEdit(idx)}
                      className="text-left hover:text-primary transition-colors"
                    >
                      {feature}
                    </button>
                  )}
                </td>
                {plans.map((plan) => (
                  <td key={plan.id} className="text-center px-4 py-2">
                    <Checkbox
                      checked={plan.features.includes(feature)}
                      onCheckedChange={() => toggleFeature(plan.id, feature)}
                    />
                  </td>
                ))}
                <td className="px-2">
                  <button
                    onClick={() => removeFeature(idx)}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex gap-2">
        <Input
          value={newFeature}
          onChange={(e) => setNewFeature(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault()
              addFeature()
            }
          }}
          placeholder="Add a feature..."
          className="max-w-xs"
        />
        <Button type="button" variant="outline" size="sm" onClick={addFeature} disabled={!newFeature.trim()}>
          <Plus className="h-4 w-4 mr-1" />
          Add
        </Button>
      </div>
    </div>
  )
}
