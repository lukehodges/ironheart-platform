"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { ChevronDown, ChevronUp, Pencil, Trash2 } from "lucide-react"

interface PlanCardProps {
  plan: {
    id: string
    slug: string
    name: string
    priceMonthly: number
    priceYearly: number | null
    trialDays: number
    stripePriceId: string
    features: string[]
    isDefault: boolean
  }
  onUpdate: (id: string, data: Record<string, unknown>) => void
  onDelete: (id: string) => void
  onMoveUp?: () => void
  onMoveDown?: () => void
  canDelete: boolean
}

export function PlanCard({ plan, onUpdate, onDelete, onMoveUp, onMoveDown, canDelete }: PlanCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [name, setName] = useState(plan.name)
  const [priceMonthly, setPriceMonthly] = useState(plan.priceMonthly)
  const [priceYearly, setPriceYearly] = useState(plan.priceYearly)
  const [trialDays, setTrialDays] = useState(plan.trialDays)
  const [stripePriceId, setStripePriceId] = useState(plan.stripePriceId)

  const save = () => {
    onUpdate(plan.id, { name, priceMonthly, priceYearly, trialDays, stripePriceId })
    setIsEditing(false)
  }

  const cancel = () => {
    setName(plan.name)
    setPriceMonthly(plan.priceMonthly)
    setPriceYearly(plan.priceYearly)
    setTrialDays(plan.trialDays)
    setStripePriceId(plan.stripePriceId)
    setIsEditing(false)
  }

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {isEditing ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Name</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} className="h-8 mt-1" />
                </div>
                <div>
                  <Label className="text-xs">Stripe Price ID</Label>
                  <Input value={stripePriceId} onChange={(e) => setStripePriceId(e.target.value)} className="h-8 mt-1 font-mono text-xs" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">Monthly (pence)</Label>
                  <Input type="number" value={priceMonthly} onChange={(e) => setPriceMonthly(Number(e.target.value))} className="h-8 mt-1" />
                </div>
                <div>
                  <Label className="text-xs">Yearly (pence)</Label>
                  <Input type="number" value={priceYearly ?? ""} onChange={(e) => setPriceYearly(e.target.value ? Number(e.target.value) : null)} className="h-8 mt-1" placeholder="Optional" />
                </div>
                <div>
                  <Label className="text-xs">Trial Days</Label>
                  <Input type="number" value={trialDays} onChange={(e) => setTrialDays(Number(e.target.value))} className="h-8 mt-1" />
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={save}>Save</Button>
                <Button size="sm" variant="outline" onClick={cancel}>Cancel</Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{plan.name}</span>
                  <span className="text-xs text-muted-foreground font-mono">{plan.slug}</span>
                  {plan.isDefault && <Badge variant="info" className="text-[10px]">Default</Badge>}
                </div>
                <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                  <span>£{(plan.priceMonthly / 100).toFixed(2)}/mo</span>
                  {plan.priceYearly && <span>£{(plan.priceYearly / 100).toFixed(2)}/yr</span>}
                  <span>{plan.trialDays}d trial</span>
                  <span className="font-mono text-xs">{plan.stripePriceId}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {!isEditing && (
          <div className="flex items-center gap-1">
            {onMoveUp && (
              <Button variant="ghost" size="sm" onClick={onMoveUp} className="h-7 w-7 p-0">
                <ChevronUp className="h-4 w-4" />
              </Button>
            )}
            {onMoveDown && (
              <Button variant="ghost" size="sm" onClick={onMoveDown} className="h-7 w-7 p-0">
                <ChevronDown className="h-4 w-4" />
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)} className="h-7 w-7 p-0">
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(plan.id)}
              disabled={!canDelete}
              className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>
    </Card>
  )
}
