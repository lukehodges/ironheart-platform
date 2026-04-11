"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Plus, Trash2 } from "lucide-react"
import { formatCurrency, parseCurrencyInput } from "@/lib/format-currency"
import type { LocalSection } from "./proposal-sections-builder"

export interface LocalPaymentRule {
  _id: string
  label: string
  amount: string
  trigger: "ON_APPROVAL" | "RELATIVE_DATE" | "FIXED_DATE" | "RECURRING" | "MILESTONE_COMPLETE"
  relativeDays: string
  fixedDate: string
  recurringInterval: "MONTHLY" | "QUARTERLY" | ""
  sectionId: string
  autoSend: boolean
}

function newRule(): LocalPaymentRule {
  return {
    _id: crypto.randomUUID(),
    label: "",
    amount: "",
    trigger: "ON_APPROVAL",
    relativeDays: "14",
    fixedDate: "",
    recurringInterval: "",
    sectionId: "",
    autoSend: false,
  }
}

const TRIGGER_LABEL: Record<LocalPaymentRule["trigger"], string> = {
  ON_APPROVAL: "On approval",
  RELATIVE_DATE: "Days after approval",
  FIXED_DATE: "Fixed date",
  RECURRING: "Recurring",
  MILESTONE_COMPLETE: "On phase complete",
}

interface ProposalPaymentRulesBuilderProps {
  rules: LocalPaymentRule[]
  sections: LocalSection[]
  totalPrice: number
  onChange: (rules: LocalPaymentRule[]) => void
}

export function ProposalPaymentRulesBuilder({
  rules,
  sections,
  totalPrice,
  onChange,
}: ProposalPaymentRulesBuilderProps) {
  const phases = sections.filter((s) => s.type === "PHASE")

  const updateRule = (id: string, patch: Partial<LocalPaymentRule>) =>
    onChange(rules.map((r) => (r._id === id ? { ...r, ...patch } : r)))

  const removeRule = (id: string) => onChange(rules.filter((r) => r._id !== id))

  const total = rules.reduce((sum, r) => sum + (parseCurrencyInput(r.amount) || 0), 0)
  const remaining = totalPrice - total

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Payment Schedule</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Define when and how the client is invoiced.
          </p>
        </div>
        {totalPrice > 0 && (
          <div className="text-right text-xs text-muted-foreground">
            <div>
              Scheduled: <span className="font-medium text-foreground">{formatCurrency(total)}</span>
            </div>
            {remaining !== 0 && (
              <div className={remaining > 0 ? "text-amber-600" : "text-destructive"}>
                {remaining > 0 ? `${formatCurrency(remaining)} unscheduled` : `${formatCurrency(Math.abs(remaining))} over`}
              </div>
            )}
          </div>
        )}
      </div>

      {rules.length === 0 && (
        <p className="text-sm text-muted-foreground py-6 text-center border rounded-lg border-dashed">
          No payment rules — add one to define the invoice schedule.
        </p>
      )}

      {rules.map((rule) => (
        <div key={rule._id} className="border rounded-lg p-4 space-y-3">
          <div className="flex gap-2 items-start">
            <div className="flex-1 space-y-2">
              <div className="grid grid-cols-[1fr_160px] gap-2">
                <Input
                  value={rule.label}
                  onChange={(e) => updateRule(rule._id, { label: e.target.value })}
                  placeholder="e.g. Deposit, Final payment"
                  className="text-sm"
                />
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    £
                  </span>
                  <Input
                    value={rule.amount}
                    onChange={(e) => updateRule(rule._id, { amount: e.target.value })}
                    placeholder="0"
                    className="pl-7 text-sm tabular-nums"
                  />
                </div>
              </div>

              <div className="flex gap-2 items-center flex-wrap">
                <Select
                  value={rule.trigger}
                  onValueChange={(v) =>
                    updateRule(rule._id, {
                      trigger: v as LocalPaymentRule["trigger"],
                      sectionId: "",
                      recurringInterval: "",
                    })
                  }
                >
                  <SelectTrigger className="w-[180px] text-sm h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ON_APPROVAL">On approval</SelectItem>
                    <SelectItem value="RELATIVE_DATE">Days after approval</SelectItem>
                    <SelectItem value="FIXED_DATE">Fixed date</SelectItem>
                    <SelectItem value="RECURRING">Recurring</SelectItem>
                    <SelectItem value="MILESTONE_COMPLETE" disabled={phases.length === 0}>
                      On phase complete
                    </SelectItem>
                  </SelectContent>
                </Select>

                {rule.trigger === "RELATIVE_DATE" && (
                  <div className="flex items-center gap-1.5">
                    <Input
                      type="number"
                      min="1"
                      value={rule.relativeDays}
                      onChange={(e) => updateRule(rule._id, { relativeDays: e.target.value })}
                      className="w-20 text-sm h-8"
                    />
                    <span className="text-xs text-muted-foreground">days after</span>
                  </div>
                )}

                {rule.trigger === "FIXED_DATE" && (
                  <Input
                    type="date"
                    value={rule.fixedDate}
                    onChange={(e) => updateRule(rule._id, { fixedDate: e.target.value })}
                    className="w-[160px] text-sm h-8"
                  />
                )}

                {rule.trigger === "RECURRING" && (
                  <Select
                    value={rule.recurringInterval}
                    onValueChange={(v) =>
                      updateRule(rule._id, {
                        recurringInterval: v as "MONTHLY" | "QUARTERLY",
                      })
                    }
                  >
                    <SelectTrigger className="w-[140px] text-sm h-8">
                      <SelectValue placeholder="Interval" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MONTHLY">Monthly</SelectItem>
                      <SelectItem value="QUARTERLY">Quarterly</SelectItem>
                    </SelectContent>
                  </Select>
                )}

                {rule.trigger === "MILESTONE_COMPLETE" && phases.length > 0 && (
                  <Select
                    value={rule.sectionId}
                    onValueChange={(v) => updateRule(rule._id, { sectionId: v })}
                  >
                    <SelectTrigger className="w-[200px] text-sm h-8">
                      <SelectValue placeholder="Select phase" />
                    </SelectTrigger>
                    <SelectContent>
                      {phases.map((p) => (
                        <SelectItem key={p._id} value={p._id}>
                          {p.title || "(untitled phase)"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                <button
                  type="button"
                  onClick={() => updateRule(rule._id, { autoSend: !rule.autoSend })}
                  className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                    rule.autoSend
                      ? "bg-primary text-primary-foreground border-primary"
                      : "text-muted-foreground border-border hover:border-foreground"
                  }`}
                >
                  Auto-send
                </button>
              </div>
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
              onClick={() => removeRule(rule._id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      ))}

      <Button variant="outline" size="sm" onClick={() => onChange([...rules, newRule()])}>
        <Plus className="h-3.5 w-3.5 mr-1.5" /> Add Payment Rule
      </Button>
    </div>
  )
}
