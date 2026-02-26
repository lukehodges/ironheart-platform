"use client"

import { useState } from "react"
import { Plus, Pencil, Trash2, Eye, CreditCard, X } from "lucide-react"
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

const FIELD_TYPES = [
  "TEXT",
  "NUMBER",
  "DATE",
  "SELECT",
  "MULTI_SELECT",
  "BOOLEAN",
  "URL",
  "EMAIL",
  "PHONE",
] as const

type CustomFieldType = (typeof FIELD_TYPES)[number]

interface OptionItem {
  value: string
  label: string
}

interface FormState {
  label: string
  fieldKey: string
  fieldType: CustomFieldType
  options: OptionItem[]
  isRequired: boolean
  showOnCard: boolean
  showOnProfile: boolean
  groupName: string
  sortOrder: number
}

const DEFAULT_FORM_STATE: FormState = {
  label: "",
  fieldKey: "",
  fieldType: "TEXT",
  options: [],
  isRequired: false,
  showOnCard: false,
  showOnProfile: true,
  groupName: "",
  sortOrder: 0,
}

function generateFieldKey(label: string): string {
  return label
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
}

export function StaffCustomFieldsTab() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(DEFAULT_FORM_STATE)

  const utils = api.useUtils()

  const { data: definitions, isLoading } =
    api.team.customFields.listDefinitions.useQuery()

  const createMutation = api.team.customFields.createDefinition.useMutation({
    onSuccess: () => {
      utils.team.customFields.listDefinitions.invalidate()
      toast.success("Custom field created")
      closeDialog()
    },
    onError: (err) => {
      toast.error(err.message || "Failed to create custom field")
    },
  })

  const updateMutation = api.team.customFields.updateDefinition.useMutation({
    onSuccess: () => {
      utils.team.customFields.listDefinitions.invalidate()
      toast.success("Custom field updated")
      closeDialog()
    },
    onError: (err) => {
      toast.error(err.message || "Failed to update custom field")
    },
  })

  const deleteMutation = api.team.customFields.deleteDefinition.useMutation({
    onSuccess: () => {
      utils.team.customFields.listDefinitions.invalidate()
      toast.success("Custom field deleted")
      setDeletingId(null)
    },
    onError: (err) => {
      toast.error(err.message || "Failed to delete custom field")
    },
  })

  function closeDialog() {
    setDialogOpen(false)
    setEditingId(null)
    setForm(DEFAULT_FORM_STATE)
  }

  function openCreate() {
    setEditingId(null)
    setForm(DEFAULT_FORM_STATE)
    setDialogOpen(true)
  }

  function openEdit(def: {
    id: string
    label: string
    fieldKey: string
    fieldType: string
    options: OptionItem[] | null
    isRequired: boolean
    showOnCard: boolean
    showOnProfile: boolean
    groupName: string | null
    sortOrder: number
  }) {
    setEditingId(def.id)
    setForm({
      label: def.label,
      fieldKey: def.fieldKey,
      fieldType: def.fieldType as CustomFieldType,
      options: def.options ?? [],
      isRequired: def.isRequired,
      showOnCard: def.showOnCard,
      showOnProfile: def.showOnProfile,
      groupName: def.groupName ?? "",
      sortOrder: def.sortOrder,
    })
    setDialogOpen(true)
  }

  function handleSubmit() {
    if (!form.label.trim()) {
      toast.error("Label is required")
      return
    }
    if (!form.fieldKey.trim()) {
      toast.error("Field key is required")
      return
    }

    const needsOptions =
      form.fieldType === "SELECT" || form.fieldType === "MULTI_SELECT"

    if (editingId) {
      updateMutation.mutate({
        id: editingId,
        label: form.label,
        options: needsOptions ? form.options : undefined,
        isRequired: form.isRequired,
        showOnCard: form.showOnCard,
        showOnProfile: form.showOnProfile,
        sortOrder: form.sortOrder,
        groupName: form.groupName || null,
      })
    } else {
      createMutation.mutate({
        fieldKey: form.fieldKey,
        label: form.label,
        fieldType: form.fieldType,
        options: needsOptions ? form.options : undefined,
        isRequired: form.isRequired,
        showOnCard: form.showOnCard,
        showOnProfile: form.showOnProfile,
        sortOrder: form.sortOrder,
        groupName: form.groupName || undefined,
      })
    }
  }

  function addOption() {
    setForm((prev) => ({
      ...prev,
      options: [...prev.options, { value: "", label: "" }],
    }))
  }

  function removeOption(index: number) {
    setForm((prev) => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== index),
    }))
  }

  function updateOption(
    index: number,
    field: "value" | "label",
    val: string
  ) {
    setForm((prev) => ({
      ...prev,
      options: prev.options.map((opt, i) =>
        i === index ? { ...opt, [field]: val } : opt
      ),
    }))
  }

  // Group definitions by groupName
  const grouped = new Map<string, typeof definitions>()
  if (definitions) {
    for (const def of definitions) {
      const group = def.groupName || "Other"
      const existing = grouped.get(group) ?? []
      existing.push(def)
      grouped.set(group, existing)
    }
  }

  const isMutating =
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-9 w-28" />
        </div>
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Custom Fields</h2>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Add Field
        </Button>
      </div>

      {/* Empty state */}
      {(!definitions || definitions.length === 0) && (
        <EmptyState
          title="No custom fields defined"
          description="Create custom fields to capture additional information about staff members."
          action={{ label: "Add Field", onClick: openCreate }}
        />
      )}

      {/* Grouped definitions */}
      {definitions && definitions.length > 0 && (
        <div className="space-y-6">
          {Array.from(grouped.entries()).map(([groupName, defs]) => (
            <div key={groupName}>
              <h3 className="text-sm font-medium text-muted-foreground mb-3">
                {groupName}
              </h3>
              <div className="space-y-2">
                {defs!.map((def) => (
                  <div
                    key={def.id}
                    className="flex items-center justify-between rounded-lg border border-border p-3"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium">
                            {def.label}
                          </span>
                          <span className="text-xs text-muted-foreground font-mono">
                            {def.fieldKey}
                          </span>
                          <Badge variant="secondary">{def.fieldType}</Badge>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          {def.showOnProfile && (
                            <span
                              className="text-muted-foreground"
                              title="Shown on profile"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </span>
                          )}
                          {def.showOnCard && (
                            <span
                              className="text-muted-foreground"
                              title="Shown on card"
                            >
                              <CreditCard className="h-3.5 w-3.5" />
                            </span>
                          )}
                          {def.isRequired && (
                            <span
                              className="text-xs text-destructive font-medium"
                              title="Required"
                            >
                              *
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => openEdit(def)}
                        aria-label={`Edit ${def.label}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setDeletingId(def.id)}
                        aria-label={`Delete ${def.label}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <Separator className="mt-4" />
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit Custom Field" : "Add Custom Field"}
            </DialogTitle>
            <DialogDescription>
              {editingId
                ? "Update the custom field definition. Field key and type cannot be changed."
                : "Define a new custom field for staff members."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Label */}
            <div className="space-y-2">
              <Label htmlFor="cf-label">Label *</Label>
              <Input
                id="cf-label"
                value={form.label}
                onChange={(e) => {
                  const label = e.target.value
                  setForm((prev) => ({
                    ...prev,
                    label,
                    // Auto-generate fieldKey only in create mode
                    ...(editingId ? {} : { fieldKey: generateFieldKey(label) }),
                  }))
                }}
                placeholder="e.g. Emergency Contact"
              />
            </div>

            {/* Field Key */}
            <div className="space-y-2">
              <Label htmlFor="cf-key">Field Key *</Label>
              <Input
                id="cf-key"
                value={form.fieldKey}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, fieldKey: e.target.value }))
                }
                disabled={!!editingId}
                placeholder="e.g. emergency-contact"
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Lowercase letters, numbers, and hyphens only.
              </p>
            </div>

            {/* Field Type */}
            <div className="space-y-2">
              <Label>Field Type</Label>
              <Select
                value={form.fieldType}
                onValueChange={(val) =>
                  setForm((prev) => ({
                    ...prev,
                    fieldType: val as CustomFieldType,
                  }))
                }
                disabled={!!editingId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {FIELD_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Options (for SELECT / MULTI_SELECT) */}
            {(form.fieldType === "SELECT" ||
              form.fieldType === "MULTI_SELECT") && (
              <div className="space-y-2">
                <Label>Options</Label>
                <div className="space-y-2">
                  {form.options.map((opt, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Input
                        value={opt.value}
                        onChange={(e) =>
                          updateOption(idx, "value", e.target.value)
                        }
                        placeholder="Value"
                        className="flex-1"
                      />
                      <Input
                        value={opt.label}
                        onChange={(e) =>
                          updateOption(idx, "label", e.target.value)
                        }
                        placeholder="Label"
                        className="flex-1"
                      />
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => removeOption(idx)}
                        aria-label="Remove option"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addOption}
                  type="button"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Option
                </Button>
              </div>
            )}

            <Separator />

            {/* Checkboxes */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="cf-required"
                  checked={form.isRequired}
                  onCheckedChange={(checked) =>
                    setForm((prev) => ({
                      ...prev,
                      isRequired: checked === true,
                    }))
                  }
                />
                <Label htmlFor="cf-required" className="text-sm font-normal">
                  Required
                </Label>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="cf-show-card"
                  checked={form.showOnCard}
                  onCheckedChange={(checked) =>
                    setForm((prev) => ({
                      ...prev,
                      showOnCard: checked === true,
                    }))
                  }
                />
                <Label htmlFor="cf-show-card" className="text-sm font-normal">
                  Show on card
                </Label>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="cf-show-profile"
                  checked={form.showOnProfile}
                  onCheckedChange={(checked) =>
                    setForm((prev) => ({
                      ...prev,
                      showOnProfile: checked === true,
                    }))
                  }
                />
                <Label
                  htmlFor="cf-show-profile"
                  className="text-sm font-normal"
                >
                  Show on profile
                </Label>
              </div>
            </div>

            {/* Group Name */}
            <div className="space-y-2">
              <Label htmlFor="cf-group">Group Name</Label>
              <Input
                id="cf-group"
                value={form.groupName}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, groupName: e.target.value }))
                }
                placeholder="e.g. Personal Info (optional)"
              />
            </div>

            {/* Sort Order */}
            <div className="space-y-2">
              <Label htmlFor="cf-sort">Sort Order</Label>
              <Input
                id="cf-sort"
                type="number"
                value={form.sortOrder}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10)
                  if (!isNaN(val)) {
                    setForm((prev) => ({ ...prev, sortOrder: val }))
                  }
                }}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              loading={isMutating}
              disabled={isMutating}
            >
              {editingId ? "Save Changes" : "Create Field"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deletingId}
        onOpenChange={(open) => !open && setDeletingId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Custom Field</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this custom field? All existing
              values for this field will be permanently removed. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deletingId) {
                  deleteMutation.mutate({ id: deletingId })
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
