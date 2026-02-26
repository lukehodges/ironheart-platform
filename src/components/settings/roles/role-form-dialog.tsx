"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { api } from "@/lib/trpc/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import type { RoleWithPermissions } from "@/modules/rbac/rbac.types"

interface RoleFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: "create" | "edit"
  role?: RoleWithPermissions
}

/**
 * RoleFormDialog - Dialog for creating or editing a role.
 *
 * Shows form fields + grouped permission checkboxes.
 */
export function RoleFormDialog({
  open,
  onOpenChange,
  mode,
  role,
}: RoleFormDialogProps) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [color, setColor] = useState("#3B82F6")
  const [isDefault, setIsDefault] = useState(false)
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<Set<string>>(new Set())

  const utils = api.useUtils()

  const { data: permissionGroups, isLoading: loadingPerms } =
    api.rbac.getPermissionsGroupedByModule.useQuery(undefined, {
      enabled: open,
    })

  const createMutation = api.rbac.createRole.useMutation({
    onSuccess: () => {
      toast.success("Role created")
      onOpenChange(false)
      resetForm()
      utils.rbac.invalidate()
    },
    onError: (error) => {
      toast.error("Failed to create role", { description: error.message })
    },
  })

  const updateMutation = api.rbac.updateRole.useMutation({
    onSuccess: () => {
      toast.success("Role updated")
      onOpenChange(false)
      resetForm()
      utils.rbac.invalidate()
    },
    onError: (error) => {
      toast.error("Failed to update role", { description: error.message })
    },
  })

  // Pre-fill form when editing
  useEffect(() => {
    if (mode === "edit" && role) {
      setName(role.name)
      setDescription(role.description ?? "")
      setColor(role.color ?? "#3B82F6")
      setIsDefault(role.isDefault)
      setSelectedPermissionIds(new Set(role.permissions.map((p) => p.id)))
    } else {
      resetForm()
    }
  }, [mode, role, open])

  function resetForm() {
    setName("")
    setDescription("")
    setColor("#3B82F6")
    setIsDefault(false)
    setSelectedPermissionIds(new Set())
  }

  function togglePermission(permId: string) {
    setSelectedPermissionIds((prev) => {
      const next = new Set(prev)
      if (next.has(permId)) {
        next.delete(permId)
      } else {
        next.add(permId)
      }
      return next
    })
  }

  function toggleGroup(groupPermissionIds: string[]) {
    const allSelected = groupPermissionIds.every((id) => selectedPermissionIds.has(id))
    setSelectedPermissionIds((prev) => {
      const next = new Set(prev)
      if (allSelected) {
        groupPermissionIds.forEach((id) => next.delete(id))
      } else {
        groupPermissionIds.forEach((id) => next.add(id))
      }
      return next
    })
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const permissionIds = Array.from(selectedPermissionIds)

    if (mode === "create") {
      createMutation.mutate({
        name,
        description: description || undefined,
        color: color || undefined,
        permissionIds,
        isDefault,
      })
    } else if (role) {
      updateMutation.mutate({
        roleId: role.id,
        name,
        description: description || undefined,
        color: color || undefined,
        permissionIds,
        isDefault,
      })
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Create Role" : `Edit Role: ${role?.name}`}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Define a new role with specific permissions."
              : "Update the role name, description, and permissions."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="roleName">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="roleName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Manager, Receptionist"
              required
              maxLength={50}
              disabled={isPending}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="roleDescription">Description</Label>
            <Textarea
              id="roleDescription"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this role..."
              maxLength={255}
              disabled={isPending}
              rows={2}
            />
          </div>

          {/* Color + Default */}
          <div className="flex items-end gap-4">
            <div className="space-y-2">
              <Label htmlFor="roleColor">Color</Label>
              <div className="flex items-center gap-2">
                <input
                  id="roleColor"
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="h-9 w-12 rounded border border-input cursor-pointer"
                  disabled={isPending}
                />
                <Input
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  placeholder="#3B82F6"
                  className="w-28 font-mono text-sm"
                  disabled={isPending}
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pb-1">
              <Checkbox
                id="roleDefault"
                checked={isDefault}
                onCheckedChange={(checked) => setIsDefault(checked === true)}
                disabled={isPending}
              />
              <Label htmlFor="roleDefault" className="text-sm font-normal cursor-pointer">
                Default role for new users
              </Label>
            </div>
          </div>

          {/* Permission Groups */}
          <div className="space-y-4">
            <Label>Permissions</Label>
            {loadingPerms ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : permissionGroups && permissionGroups.length > 0 ? (
              <div className="space-y-4 rounded-lg border border-border p-4 max-h-[320px] overflow-y-auto">
                {permissionGroups.map((group) => {
                  const groupPermIds = group.permissions.map((p) => p.id)
                  const allSelected = groupPermIds.every((id) =>
                    selectedPermissionIds.has(id)
                  )
                  const someSelected =
                    !allSelected &&
                    groupPermIds.some((id) => selectedPermissionIds.has(id))

                  return (
                    <div key={group.moduleSlug} className="space-y-2">
                      {/* Group header with Select All */}
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id={`group-${group.moduleSlug}`}
                          checked={allSelected}
                          // Use indeterminate state when partial
                          {...(someSelected && !allSelected
                            ? { "data-state": "indeterminate" }
                            : {})}
                          onCheckedChange={() => toggleGroup(groupPermIds)}
                          disabled={isPending}
                        />
                        <Label
                          htmlFor={`group-${group.moduleSlug}`}
                          className="text-sm font-semibold cursor-pointer"
                        >
                          {group.moduleName}
                        </Label>
                        <span className="text-xs text-muted-foreground">
                          ({groupPermIds.filter((id) => selectedPermissionIds.has(id)).length}/
                          {groupPermIds.length})
                        </span>
                      </div>

                      {/* Individual permissions */}
                      <div className="ml-6 grid gap-2 sm:grid-cols-2">
                        {group.permissions.map((perm) => (
                          <div key={perm.id} className="flex items-start gap-2">
                            <Checkbox
                              id={`perm-${perm.id}`}
                              checked={selectedPermissionIds.has(perm.id)}
                              onCheckedChange={() => togglePermission(perm.id)}
                              disabled={isPending}
                            />
                            <div>
                              <Label
                                htmlFor={`perm-${perm.id}`}
                                className="text-sm font-normal cursor-pointer"
                              >
                                {perm.resource}:{perm.action}
                              </Label>
                              {perm.description && (
                                <p className="text-xs text-muted-foreground">
                                  {perm.description}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-4">
                No permissions found. Permissions are registered when modules are enabled.
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-end pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending || !name.trim()}
              className="active:scale-[0.98]"
            >
              {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {mode === "create" ? "Create Role" : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
