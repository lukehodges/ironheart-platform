"use client"

import { useState } from "react"
import { Plus, Pencil, X } from "lucide-react"
import { toast } from "sonner"
import { api } from "@/lib/trpc/react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/ui/empty-state"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"

type ChecklistTemplateType = "ONBOARDING" | "OFFBOARDING"

interface ChecklistItem {
  key: string
  label: string
  description: string
  isRequired: boolean
  order: number
}

interface ChecklistTemplate {
  id: string
  tenantId: string
  name: string
  type: ChecklistTemplateType
  employeeType: string | null
  items: ChecklistItem[]
  isDefault: boolean
}

interface ItemDraft {
  label: string
  description: string
  isRequired: boolean
}

const EMPLOYEE_TYPE_OPTIONS = [
  { value: "", label: "All types" },
  { value: "EMPLOYED", label: "Employed" },
  { value: "SELF_EMPLOYED", label: "Self-employed" },
  { value: "CONTRACTOR", label: "Contractor" },
]

function labelToKey(label: string): string {
  return label
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
}

function employeeTypeLabel(type: string | null): string {
  if (!type) return "All types"
  const found = EMPLOYEE_TYPE_OPTIONS.find((o) => o.value === type)
  return found?.label ?? type
}

export function StaffOnboardingTemplatesTab() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] =
    useState<ChecklistTemplate | null>(null)

  const { data: templates, isLoading } =
    api.team.onboarding.templates.list.useQuery()

  const utils = api.useUtils()

  const createMutation = api.team.onboarding.templates.create.useMutation({
    onSuccess: () => {
      toast.success("Template created")
      void utils.team.onboarding.templates.list.invalidate()
      closeDialog()
    },
    onError: (err) => toast.error(err.message ?? "Failed to create template"),
  })

  const updateMutation = api.team.onboarding.templates.update.useMutation({
    onSuccess: () => {
      toast.success("Template updated")
      void utils.team.onboarding.templates.list.invalidate()
      closeDialog()
    },
    onError: (err) => toast.error(err.message ?? "Failed to update template"),
  })

  function openCreate() {
    setEditingTemplate(null)
    setDialogOpen(true)
  }

  function openEdit(template: ChecklistTemplate) {
    setEditingTemplate(template)
    setDialogOpen(true)
  }

  function closeDialog() {
    setDialogOpen(false)
    setEditingTemplate(null)
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  const allTemplates = templates ?? []
  const onboardingTemplates = allTemplates.filter(
    (t) => t.type === "ONBOARDING"
  )
  const offboardingTemplates = allTemplates.filter(
    (t) => t.type === "OFFBOARDING"
  )

  return (
    <div className="space-y-8">
      {/* Onboarding Templates Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Onboarding Templates</h3>
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-3.5 w-3.5" />
            Create Template
          </Button>
        </div>

        {onboardingTemplates.length === 0 ? (
          <EmptyState
            variant="documents"
            title="No onboarding templates"
            description="Create a checklist template for onboarding new staff members."
            action={{ label: "Create Template", onClick: openCreate }}
          />
        ) : (
          <div className="space-y-2">
            {onboardingTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onEdit={() => openEdit(template)}
              />
            ))}
          </div>
        )}
      </section>

      <Separator />

      {/* Offboarding Templates Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Offboarding Templates</h3>
        </div>

        {offboardingTemplates.length === 0 ? (
          <EmptyState
            variant="documents"
            title="No offboarding templates"
            description="Create a checklist template for offboarding staff members."
            action={{ label: "Create Template", onClick: openCreate }}
          />
        ) : (
          <div className="space-y-2">
            {offboardingTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onEdit={() => openEdit(template)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Create / Edit Dialog */}
      <TemplateDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!open) closeDialog()
        }}
        template={editingTemplate}
        onSubmit={(data) => {
          if (editingTemplate) {
            updateMutation.mutate({
              id: editingTemplate.id,
              name: data.name,
              items: data.items,
              isDefault: data.isDefault,
            })
          } else {
            createMutation.mutate({
              name: data.name,
              type: data.type,
              employeeType: data.employeeType || undefined,
              items: data.items,
              isDefault: data.isDefault,
            })
          }
        }}
        isPending={createMutation.isPending || updateMutation.isPending}
      />
    </div>
  )
}

function TemplateCard({
  template,
  onEdit,
}: {
  template: ChecklistTemplate
  onEdit: () => void
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-sm font-medium truncate">{template.name}</span>
        <Badge variant="secondary" className="text-[10px]">
          {template.items.length} item{template.items.length !== 1 ? "s" : ""}
        </Badge>
        <Badge variant="outline" className="text-[10px]">
          {employeeTypeLabel(template.employeeType)}
        </Badge>
        {template.isDefault && (
          <Badge variant="info" className="text-[10px]">
            Default
          </Badge>
        )}
      </div>
      <Button
        size="icon-sm"
        variant="ghost"
        onClick={onEdit}
        aria-label={`Edit ${template.name}`}
      >
        <Pencil className="h-4 w-4" />
      </Button>
    </div>
  )
}

function TemplateDialog({
  open,
  onOpenChange,
  template,
  onSubmit,
  isPending,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  template: ChecklistTemplate | null
  onSubmit: (data: {
    name: string
    type: ChecklistTemplateType
    employeeType: string
    items: ChecklistItem[]
    isDefault: boolean
  }) => void
  isPending: boolean
}) {
  const isEditing = template !== null

  const [name, setName] = useState("")
  const [type, setType] = useState<ChecklistTemplateType>("ONBOARDING")
  const [employeeType, setEmployeeType] = useState("")
  const [isDefault, setIsDefault] = useState(false)
  const [items, setItems] = useState<ItemDraft[]>([])

  // Reset form when dialog opens
  const [lastOpen, setLastOpen] = useState(false)
  if (open && !lastOpen) {
    if (template) {
      setName(template.name)
      setType(template.type)
      setEmployeeType(template.employeeType ?? "")
      setIsDefault(template.isDefault)
      setItems(
        template.items.map((item) => ({
          label: item.label,
          description: item.description,
          isRequired: item.isRequired,
        }))
      )
    } else {
      setName("")
      setType("ONBOARDING")
      setEmployeeType("")
      setIsDefault(false)
      setItems([])
    }
  }
  if (open !== lastOpen) {
    setLastOpen(open)
  }

  function addItem() {
    setItems((prev) => [
      ...prev,
      { label: "", description: "", isRequired: false },
    ])
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  function updateItem(index: number, updates: Partial<ItemDraft>) {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...updates } : item))
    )
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      toast.error("Template name is required")
      return
    }

    const checklistItems: ChecklistItem[] = items
      .filter((item) => item.label.trim())
      .map((item, index) => ({
        key: labelToKey(item.label) || `item-${index}`,
        label: item.label.trim(),
        description: item.description.trim(),
        isRequired: item.isRequired,
        order: index,
      }))

    onSubmit({
      name: name.trim(),
      type,
      employeeType,
      items: checklistItems,
      isDefault,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Template" : "Create Template"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the checklist template configuration."
              : "Create a new onboarding or offboarding checklist template."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="template-name">Name</Label>
            <Input
              id="template-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Standard Onboarding"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Type</Label>
            <Select
              value={type}
              onValueChange={(v) => setType(v as ChecklistTemplateType)}
              disabled={isEditing}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ONBOARDING">Onboarding</SelectItem>
                <SelectItem value="OFFBOARDING">Offboarding</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Employee Type</Label>
            <Select
              value={employeeType || "__all__"}
              onValueChange={(v) =>
                setEmployeeType(v === "__all__" ? "" : v)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All types</SelectItem>
                <SelectItem value="EMPLOYED">Employed</SelectItem>
                <SelectItem value="SELF_EMPLOYED">Self-employed</SelectItem>
                <SelectItem value="CONTRACTOR">Contractor</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="template-default"
              checked={isDefault}
              onCheckedChange={(checked) =>
                setIsDefault(checked === true)
              }
            />
            <Label htmlFor="template-default" className="text-sm">
              Set as default template
            </Label>
          </div>

          <Separator />

          {/* Items Editor */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Checklist Items</Label>

            {items.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No items yet. Add items to build the checklist.
              </p>
            )}

            {items.map((item, index) => (
              <div
                key={index}
                className="rounded-lg border border-border px-4 py-3 space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 space-y-3">
                    <div className="space-y-1">
                      <Label
                        htmlFor={`item-label-${index}`}
                        className="text-xs text-muted-foreground"
                      >
                        Label
                      </Label>
                      <Input
                        id={`item-label-${index}`}
                        value={item.label}
                        onChange={(e) =>
                          updateItem(index, { label: e.target.value })
                        }
                        placeholder="e.g. Complete tax forms"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label
                        htmlFor={`item-desc-${index}`}
                        className="text-xs text-muted-foreground"
                      >
                        Description
                      </Label>
                      <Input
                        id={`item-desc-${index}`}
                        value={item.description}
                        onChange={(e) =>
                          updateItem(index, { description: e.target.value })
                        }
                        placeholder="Optional description"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={`item-required-${index}`}
                        checked={item.isRequired}
                        onCheckedChange={(checked) =>
                          updateItem(index, { isRequired: checked === true })
                        }
                      />
                      <Label
                        htmlFor={`item-required-${index}`}
                        className="text-xs"
                      >
                        Required
                      </Label>
                    </div>
                  </div>
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    className="text-muted-foreground hover:text-destructive shrink-0"
                    onClick={() => removeItem(index)}
                    aria-label={`Remove item ${index + 1}`}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addItem}
            >
              <Plus className="h-3.5 w-3.5" />
              Add Item
            </Button>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" loading={isPending}>
              {isEditing ? "Update Template" : "Create Template"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
