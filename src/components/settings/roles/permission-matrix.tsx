"use client"

import * as React from "react"
import { api } from "@/lib/trpc/react"
import { Card } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

/**
 * PermissionMatrix - Grid view of roles x permissions.
 *
 * Columns = roles, Rows = permissions grouped by module.
 * System roles have disabled (read-only) checkboxes.
 * Toggling a checkbox calls updateRole with the new permission set.
 */
export function PermissionMatrix() {
  const utils = api.useUtils()

  const { data: roles, isLoading: loadingRoles } = api.rbac.listRoles.useQuery()
  const { data: permissionGroups, isLoading: loadingPerms } =
    api.rbac.getPermissionsGroupedByModule.useQuery()

  const updateMutation = api.rbac.updateRole.useMutation({
    onSuccess: () => {
      utils.rbac.invalidate()
    },
    onError: (error) => {
      toast.error("Failed to update role", { description: error.message })
    },
  })

  function handleToggle(
    roleId: string,
    permissionId: string,
    isCurrentlyChecked: boolean,
    isSystem: boolean
  ) {
    if (isSystem) return

    const role = roles?.find((r) => r.id === roleId)
    if (!role) return

    const currentIds = role.permissions.map((p) => p.id)
    const newIds = isCurrentlyChecked
      ? currentIds.filter((id) => id !== permissionId)
      : [...currentIds, permissionId]

    updateMutation.mutate({ roleId, permissionIds: newIds })
  }

  if (loadingRoles || loadingPerms) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!roles?.length) {
    return (
      <Card className="p-8 text-center">
        <p className="text-sm text-muted-foreground">
          No roles found. Create a role first to see the permission matrix.
        </p>
      </Card>
    )
  }

  if (!permissionGroups?.length) {
    return (
      <Card className="p-8 text-center">
        <p className="text-sm text-muted-foreground">
          No permissions found. Permissions are registered when modules are enabled.
        </p>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Permission Matrix</h3>
        <p className="text-sm text-muted-foreground mt-1">
          View and edit permissions across all roles. System roles are read-only.
        </p>
      </div>

      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left p-3 font-medium sticky left-0 bg-background min-w-[200px]">
                Permission
              </th>
              {roles.map((role) => (
                <th
                  key={role.id}
                  className="p-3 text-center font-medium min-w-[100px]"
                >
                  <div className="flex flex-col items-center gap-1">
                    {role.color && (
                      <div
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: role.color }}
                      />
                    )}
                    <span className="text-xs">{role.name}</span>
                    {role.isSystem && (
                      <span className="text-[10px] text-muted-foreground">(system)</span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {permissionGroups.map((group) => (
              <React.Fragment key={group.moduleSlug}>
                {/* Module group header */}
                <tr className="bg-muted/50">
                  <td
                    colSpan={roles.length + 1}
                    className="p-2 px-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground sticky left-0 bg-muted/50"
                  >
                    {group.moduleName}
                  </td>
                </tr>

                {/* Permission rows */}
                {group.permissions.map((perm) => (
                  <tr key={perm.id} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="p-3 sticky left-0 bg-background">
                      <div>
                        <span className="font-mono text-xs">
                          {perm.resource}:{perm.action}
                        </span>
                        {perm.description && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {perm.description}
                          </p>
                        )}
                      </div>
                    </td>
                    {roles.map((role) => {
                      const hasPermission = role.permissions.some((p) => p.id === perm.id)
                      return (
                        <td key={role.id} className="p-3 text-center">
                          <Checkbox
                            checked={hasPermission}
                            onCheckedChange={() =>
                              handleToggle(role.id, perm.id, hasPermission, role.isSystem)
                            }
                            disabled={role.isSystem || updateMutation.isPending}
                            className="mx-auto"
                          />
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
