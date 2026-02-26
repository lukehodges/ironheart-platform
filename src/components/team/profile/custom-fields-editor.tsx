"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import { api } from "@/lib/trpc/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"

interface CustomFieldsEditorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  memberId: string
}

export function CustomFieldsEditor({
  open,
  onOpenChange,
  memberId,
}: CustomFieldsEditorProps) {
  const utils = api.useUtils()

  const { data: definitions, isLoading: defsLoading } =
    api.team.customFields.listDefinitions.useQuery(undefined, { enabled: open })
  const { data: currentValues, isLoading: valsLoading } =
    api.team.customFields.getValues.useQuery({ userId: memberId }, { enabled: open })

  const [formValues, setFormValues] = useState<Record<string, unknown>>({})

  // Initialize form values from current values
  useEffect(() => {
    if (currentValues) {
      const initial: Record<string, unknown> = {}
      for (const v of currentValues) {
        initial[v.fieldDefinitionId] = v.value
      }
      setFormValues(initial)
    }
  }, [currentValues])

  const setMutation = api.team.customFields.setValues.useMutation({
    onSuccess: () => {
      toast.success("Custom fields updated")
      onOpenChange(false)
      void utils.team.customFields.getValues.invalidate({ userId: memberId })
    },
    onError: (err) => toast.error(err.message ?? "Failed to update fields"),
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!definitions) return

    const values = definitions.map((def) => ({
      fieldDefinitionId: def.id,
      value: formValues[def.id] ?? null,
    }))

    setMutation.mutate({ userId: memberId, values })
  }

  function updateValue(defId: string, value: unknown) {
    setFormValues((prev) => ({ ...prev, [defId]: value }))
  }

  const isLoading = defsLoading || valsLoading

  // Group definitions by groupName
  const grouped = new Map<string, NonNullable<typeof definitions>>()
  if (definitions) {
    for (const def of definitions) {
      const group = def.groupName ?? "General"
      const arr = grouped.get(group) ?? []
      arr.push(def)
      grouped.set(group, arr)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Custom Fields</DialogTitle>
          <DialogDescription>
            Update custom field values for this staff member.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : !definitions || definitions.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No custom fields have been defined yet.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {Array.from(grouped.entries()).map(([group, fields]) => (
              <div key={group} className="space-y-4">
                <h4 className="text-sm font-medium text-muted-foreground">{group}</h4>
                {fields.map((def) => (
                  <FieldInput
                    key={def.id}
                    definition={def}
                    value={formValues[def.id]}
                    onChange={(v) => updateValue(def.id, v)}
                  />
                ))}
              </div>
            ))}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={setMutation.isPending}>
                {setMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}

function FieldInput({
  definition,
  value,
  onChange,
}: {
  definition: {
    id: string
    label: string
    fieldType: string
    options: Array<{ value: string; label: string }> | null
    isRequired: boolean
  }
  value: unknown
  onChange: (value: unknown) => void
}) {
  const { fieldType, label, options, isRequired } = definition

  switch (fieldType) {
    case "TEXT":
    case "EMAIL":
    case "URL":
    case "PHONE":
      return (
        <div className="space-y-2">
          <Label>
            {label}
            {isRequired && <span className="text-destructive ml-0.5">*</span>}
          </Label>
          <Input
            type={fieldType === "EMAIL" ? "email" : fieldType === "URL" ? "url" : "text"}
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value || null)}
            placeholder={fieldType === "EMAIL" ? "email@example.com" : fieldType === "URL" ? "https://..." : fieldType === "PHONE" ? "+44..." : ""}
          />
        </div>
      )

    case "NUMBER":
      return (
        <div className="space-y-2">
          <Label>
            {label}
            {isRequired && <span className="text-destructive ml-0.5">*</span>}
          </Label>
          <Input
            type="number"
            value={value != null ? String(value) : ""}
            onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
          />
        </div>
      )

    case "DATE":
      return (
        <div className="space-y-2">
          <Label>
            {label}
            {isRequired && <span className="text-destructive ml-0.5">*</span>}
          </Label>
          <Input
            type="date"
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value || null)}
          />
        </div>
      )

    case "BOOLEAN":
      return (
        <div className="flex items-center gap-2 py-1">
          <Checkbox
            checked={!!value}
            onCheckedChange={(checked) => onChange(checked === true)}
            id={`cf-${definition.id}`}
          />
          <Label htmlFor={`cf-${definition.id}`} className="cursor-pointer">
            {label}
            {isRequired && <span className="text-destructive ml-0.5">*</span>}
          </Label>
        </div>
      )

    case "SELECT":
      return (
        <div className="space-y-2">
          <Label>
            {label}
            {isRequired && <span className="text-destructive ml-0.5">*</span>}
          </Label>
          <Select
            value={(value as string) ?? ""}
            onValueChange={(v) => onChange(v || null)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent>
              {(options ?? []).map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )

    case "MULTI_SELECT": {
      const selected = Array.isArray(value) ? (value as string[]) : []
      return (
        <div className="space-y-2">
          <Label>
            {label}
            {isRequired && <span className="text-destructive ml-0.5">*</span>}
          </Label>
          <div className="space-y-1.5">
            {(options ?? []).map((opt) => (
              <div key={opt.value} className="flex items-center gap-2">
                <Checkbox
                  checked={selected.includes(opt.value)}
                  onCheckedChange={(checked) => {
                    const next = checked
                      ? [...selected, opt.value]
                      : selected.filter((v) => v !== opt.value)
                    onChange(next.length > 0 ? next : null)
                  }}
                  id={`cf-${definition.id}-${opt.value}`}
                />
                <Label htmlFor={`cf-${definition.id}-${opt.value}`} className="cursor-pointer text-sm">
                  {opt.label}
                </Label>
              </div>
            ))}
          </div>
        </div>
      )
    }

    default:
      return (
        <div className="space-y-2">
          <Label>{label}</Label>
          <Input
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value || null)}
          />
        </div>
      )
  }
}
