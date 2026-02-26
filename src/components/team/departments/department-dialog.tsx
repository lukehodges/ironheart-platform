"use client"

import { useState, useEffect, useMemo } from "react"
import { toast } from "sonner"
import { api } from "@/lib/trpc/react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"
import type { Department } from "@/modules/team/team.types"

interface DepartmentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  department?: Department | null
  parentId?: string
}

interface FormState {
  name: string
  description: string
  color: string
  parentId: string
  managerId: string
}

const initialForm: FormState = {
  name: "",
  description: "",
  color: "",
  parentId: "",
  managerId: "",
}

/**
 * Collect all descendant IDs of a department (including itself).
 * Used to prevent selecting self or descendants as parent.
 */
function collectDescendantIds(dept: Department): string[] {
  const ids = [dept.id]
  for (const child of dept.children) {
    ids.push(...collectDescendantIds(child))
  }
  return ids
}

/**
 * Flatten a department tree into a list with depth info for the Select.
 */
function flattenDepartments(
  departments: Department[],
  depth = 0,
): Array<{ id: string; name: string; depth: number }> {
  const result: Array<{ id: string; name: string; depth: number }> = []
  for (const dept of departments) {
    result.push({ id: dept.id, name: dept.name, depth })
    result.push(...flattenDepartments(dept.children, depth + 1))
  }
  return result
}

export function DepartmentDialog({
  open,
  onOpenChange,
  department,
  parentId,
}: DepartmentDialogProps) {
  const isEdit = !!department
  const [form, setForm] = useState<FormState>(initialForm)
  const [nameError, setNameError] = useState<string | undefined>()

  const utils = api.useUtils()

  // Queries
  const { data: departments } = api.team.departments.list.useQuery(undefined, {
    enabled: open,
  })
  const { data: staffData } = api.team.list.useQuery(
    { status: "ACTIVE" as const, limit: 50 },
    { enabled: open },
  )

  const staffMembers = staffData?.rows ?? []

  // Exclude self and descendants from parent options
  const excludedIds = useMemo(() => {
    if (!department || !departments) return new Set<string>()
    return new Set(collectDescendantIds(department))
  }, [department, departments])

  const parentOptions = useMemo(() => {
    if (!departments) return []
    return flattenDepartments(departments).filter((d) => !excludedIds.has(d.id))
  }, [departments, excludedIds])

  // Reset form when dialog opens or department changes
  useEffect(() => {
    if (open) {
      if (department) {
        setForm({
          name: department.name,
          description: department.description ?? "",
          color: department.color ?? "",
          parentId: department.parentId ?? "",
          managerId: department.managerId ?? "",
        })
      } else {
        setForm({
          ...initialForm,
          parentId: parentId ?? "",
        })
      }
      setNameError(undefined)
    }
  }, [open, department, parentId])

  // Mutations
  const createMutation = api.team.departments.create.useMutation({
    onSuccess: () => {
      toast.success("Department created")
      void utils.team.departments.list.invalidate()
      onOpenChange(false)
    },
    onError: (err) => {
      toast.error(err.message ?? "Failed to create department")
    },
  })

  const updateMutation = api.team.departments.update.useMutation({
    onSuccess: () => {
      toast.success("Department updated")
      void utils.team.departments.list.invalidate()
      onOpenChange(false)
    },
    onError: (err) => {
      toast.error(err.message ?? "Failed to update department")
    },
  })

  const isPending = createMutation.isPending || updateMutation.isPending

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const trimmedName = form.name.trim()
    if (!trimmedName) {
      setNameError("Name is required")
      return
    }
    setNameError(undefined)

    if (isEdit && department) {
      updateMutation.mutate({
        id: department.id,
        name: trimmedName,
        description: form.description.trim() || null,
        color: form.color.trim() || null,
        parentId: form.parentId || null,
        managerId: form.managerId || null,
      })
    } else {
      createMutation.mutate({
        name: trimmedName,
        description: form.description.trim() || undefined,
        color: form.color.trim() || undefined,
        parentId: form.parentId || undefined,
        managerId: form.managerId || undefined,
      })
    }
  }

  function handleChange(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (field === "name" && nameError) {
      setNameError(value.trim() ? undefined : "Name is required")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit Department" : "Create Department"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update department details."
              : "Add a new department to organize your team."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} noValidate>
          <div className="space-y-4 py-2">
            {/* Name */}
            <div className="space-y-1.5">
              <Label htmlFor="dept-name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="dept-name"
                placeholder="e.g. Engineering"
                value={form.name}
                onChange={(e) => handleChange("name", e.target.value)}
                error={!!nameError}
                aria-describedby={nameError ? "dept-name-error" : undefined}
              />
              {nameError && (
                <p id="dept-name-error" className="text-xs text-destructive">
                  {nameError}
                </p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="dept-description">Description</Label>
              <Textarea
                id="dept-description"
                placeholder="Optional description..."
                value={form.description}
                onChange={(e) => handleChange("description", e.target.value)}
                rows={3}
              />
            </div>

            {/* Color */}
            <div className="space-y-1.5">
              <Label htmlFor="dept-color">Color</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="dept-color"
                  placeholder="#3B82F6"
                  value={form.color}
                  onChange={(e) => handleChange("color", e.target.value)}
                  className="flex-1"
                />
                {form.color && /^#[0-9a-fA-F]{6}$/.test(form.color) && (
                  <span
                    className="h-8 w-8 shrink-0 rounded-md border border-border"
                    style={{ backgroundColor: form.color }}
                    aria-label={`Color preview: ${form.color}`}
                  />
                )}
              </div>
            </div>

            {/* Parent department */}
            <div className="space-y-1.5">
              <Label htmlFor="dept-parent">Parent department</Label>
              <Select
                value={form.parentId}
                onValueChange={(val) =>
                  handleChange("parentId", val === "__none__" ? "" : val)
                }
              >
                <SelectTrigger id="dept-parent" aria-label="Parent department">
                  <SelectValue placeholder="None (top-level)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None (top-level)</SelectItem>
                  {parentOptions.map((opt) => (
                    <SelectItem key={opt.id} value={opt.id}>
                      {"  ".repeat(opt.depth) + opt.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Manager */}
            <div className="space-y-1.5">
              <Label htmlFor="dept-manager">Manager</Label>
              <Select
                value={form.managerId}
                onValueChange={(val) =>
                  handleChange("managerId", val === "__none__" ? "" : val)
                }
              >
                <SelectTrigger id="dept-manager" aria-label="Department manager">
                  <SelectValue placeholder="No manager" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No manager</SelectItem>
                  {staffMembers.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" loading={isPending}>
              {isEdit ? "Save changes" : "Create department"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
