"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Trash2 } from "lucide-react"

interface DeliverableItem {
  title: string
  description: string
}

interface DeliverableListBuilderProps {
  items: DeliverableItem[]
  onChange: (items: DeliverableItem[]) => void
}

export function DeliverableListBuilder({ items, onChange }: DeliverableListBuilderProps) {
  const addItem = () => {
    onChange([...items, { title: "", description: "" }])
  }

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index))
  }

  const updateItem = (index: number, field: keyof DeliverableItem, value: string) => {
    const updated = items.map((item, i) => i === index ? { ...item, [field]: value } : item)
    onChange(updated)
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Deliverables</p>
          <p className="text-xs text-muted-foreground">Items to be delivered as part of this proposal</p>
        </div>
        <Button variant="outline" size="sm" onClick={addItem}>
          <Plus className="h-3.5 w-3.5 mr-1.5" /> Add Deliverable
        </Button>
      </div>
      <div className="flex flex-col gap-3 mt-3">
        {items.map((item, i) => (
          <div key={i} className="flex gap-3 items-start p-3 rounded-lg border">
            <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-xs font-semibold text-muted-foreground shrink-0 mt-1">
              {i + 1}
            </div>
            <div className="flex-1 space-y-2">
              <Input
                value={item.title}
                onChange={(e) => updateItem(i, "title", e.target.value)}
                placeholder="Deliverable title"
                className="text-sm"
              />
              <Textarea
                value={item.description}
                onChange={(e) => updateItem(i, "description", e.target.value)}
                placeholder="Description (optional)"
                className="text-sm min-h-[48px]"
                rows={2}
              />
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0 mt-1"
              onClick={() => removeItem(i)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}
