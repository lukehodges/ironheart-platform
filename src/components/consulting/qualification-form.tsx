"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Save } from "lucide-react"

export interface QualificationData {
  revenue: string | null
  teamSize: number | null
  painPoints: string[]
  industry: string | null
  decisionMaker: boolean
}

interface QualificationFormProps {
  data?: QualificationData | null
  onSave: (data: QualificationData) => void
  isLoading?: boolean
}

const DEFAULT_DATA: QualificationData = {
  revenue: null,
  teamSize: null,
  painPoints: [],
  industry: null,
  decisionMaker: false,
}

export function QualificationForm({ data, onSave, isLoading }: QualificationFormProps) {
  const [form, setForm] = useState<QualificationData>(data ?? DEFAULT_DATA)
  const [painPointInput, setPainPointInput] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(form)
  }

  const addPainPoint = () => {
    const trimmed = painPointInput.trim()
    if (!trimmed) return
    setForm((prev) => ({
      ...prev,
      painPoints: [...prev.painPoints, trimmed],
    }))
    setPainPointInput("")
  }

  const removePainPoint = (index: number) => {
    setForm((prev) => ({
      ...prev,
      painPoints: prev.painPoints.filter((_, i) => i !== index),
    }))
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Qualification Data</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="revenue">Revenue</Label>
              <Input
                id="revenue"
                value={form.revenue ?? ""}
                onChange={(e) => setForm((p) => ({ ...p, revenue: e.target.value || null }))}
                placeholder="e.g. 2M ARR"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="teamSize">Team Size</Label>
              <Input
                id="teamSize"
                type="number"
                value={form.teamSize ?? ""}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    teamSize: e.target.value ? parseInt(e.target.value, 10) : null,
                  }))
                }
                placeholder="e.g. 25"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="industry">Industry</Label>
            <Input
              id="industry"
              value={form.industry ?? ""}
              onChange={(e) => setForm((p) => ({ ...p, industry: e.target.value || null }))}
              placeholder="e.g. Professional Services"
            />
          </div>

          <div className="space-y-2">
            <Label>Pain Points</Label>
            <div className="flex gap-2">
              <Input
                value={painPointInput}
                onChange={(e) => setPainPointInput(e.target.value)}
                placeholder="Add a pain point"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    addPainPoint()
                  }
                }}
              />
              <Button type="button" variant="outline" size="sm" onClick={addPainPoint}>
                Add
              </Button>
            </div>
            {form.painPoints.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {form.painPoints.map((point, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs"
                  >
                    {point}
                    <button
                      type="button"
                      onClick={() => removePainPoint(i)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      x
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="decisionMaker"
              checked={form.decisionMaker}
              onCheckedChange={(checked) =>
                setForm((p) => ({ ...p, decisionMaker: checked === true }))
              }
            />
            <Label htmlFor="decisionMaker" className="text-sm font-normal">
              Speaking with decision maker
            </Label>
          </div>

          <Button type="submit" size="sm" disabled={isLoading}>
            <Save className="mr-1.5 h-3.5 w-3.5" />
            Save Qualification Data
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
