"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, X } from "lucide-react"
import { formatCurrency, parseCurrencyInput } from "@/lib/format-currency"

interface ScheduleItem {
  label: string
  amount: string
  dueType: string
}

interface PaymentScheduleBuilderProps {
  items: ScheduleItem[]
  onChange: (items: ScheduleItem[]) => void
}

const DUE_TYPES = [
  { label: "On proposal acceptance", value: "ON_APPROVAL" },
  { label: "On milestone completion", value: "ON_MILESTONE" },
  { label: "On completion", value: "ON_COMPLETION" },
  { label: "Specific date", value: "ON_DATE" },
]

export function PaymentScheduleBuilder({ items, onChange }: PaymentScheduleBuilderProps) {
  const addItem = () => {
    onChange([...items, { label: "", amount: "", dueType: "ON_MILESTONE" }])
  }

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index))
  }

  const updateItem = (index: number, field: keyof ScheduleItem, value: string) => {
    const updated = items.map((item, i) => i === index ? { ...item, [field]: value } : item)
    onChange(updated)
  }

  const total = items.reduce((sum, item) => sum + parseCurrencyInput(item.amount), 0)

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Payment Schedule</p>
          <p className="text-xs text-muted-foreground">Define when payments are due</p>
        </div>
        <Button variant="outline" size="sm" onClick={addItem}>
          <Plus className="h-3.5 w-3.5 mr-1.5" /> Add Line
        </Button>
      </div>

      <div className="mt-3">
        <div className="grid grid-cols-[1fr_120px_180px_40px] gap-2 text-xs font-medium text-muted-foreground pb-1">
          <span>Description</span>
          <span>Amount</span>
          <span>Due</span>
          <span></span>
        </div>
        <div className="space-y-2">
          {items.map((item, i) => (
            <div key={i} className="grid grid-cols-[1fr_120px_180px_40px] gap-2 items-center">
              <Input
                value={item.label}
                onChange={(e) => updateItem(i, "label", e.target.value)}
                className="text-sm h-[34px]"
                placeholder="Description"
              />
              <Input
                value={item.amount}
                onChange={(e) => updateItem(i, "amount", e.target.value)}
                className="text-sm h-[34px] tabular-nums"
                placeholder="0"
              />
              <Select value={item.dueType} onValueChange={(v) => updateItem(i, "dueType", v)}>
                <SelectTrigger className="text-sm h-[34px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DUE_TYPES.map((dt) => (
                    <SelectItem key={dt.value} value={dt.value}>{dt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="icon"
                className="h-[34px] w-[34px] text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => removeItem(i)}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
        {items.length > 0 && (
          <div className="text-right text-xs text-muted-foreground mt-2">
            Total: <strong className="text-foreground">{formatCurrency(total)}</strong>
          </div>
        )}
      </div>
    </div>
  )
}
