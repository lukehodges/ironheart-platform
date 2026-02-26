"use client"

import * as React from "react"
import { useState } from "react"
import { api } from "@/lib/trpc/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { RoleFormDialog } from "./role-form-dialog"
import { Loader2, Plus, Pencil, Trash2, Shield } from "lucide-react"
import { toast } from "sonner"

/**
 * RoleList - Table of roles with create, edit, delete actions.
 */
export function RoleList() {
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editRoleId, setEditRoleId] = useState<string | null>(null)
  const [deleteRoleId, setDeleteRoleId] = useState<string | null>(null)

  const utils = api.useUtils()

  const { data: roles, isLoading } = api.rbac.listRoles.useQuery()

  const deleteMutation = api.rbac.deleteRole.useMutation({
    onSuccess: () => {
      toast.success("Role deleted")
      setDeleteRoleId(null)
      utils.rbac.invalidate()
    },
    onError: (error) => {
      toast.error("Failed to delete role", { description: error.message })
    },
  })

  const roleToDelete = roles?.find((r) => r.id === deleteRoleId)
  const roleToEdit = roles?.find((r) => r.id === editRoleId)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Create Button */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Roles</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Define roles and assign permissions to control access.
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Create Role
        </Button>
      </div>

      {/* Role Table */}
      {roles && roles.length > 0 ? (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Permissions</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {roles.map((role) => (
                <TableRow key={role.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {role.color && (
                        <div
                          className="h-3 w-3 rounded-full shrink-0"
                          style={{ backgroundColor: role.color }}
                        />
                      )}
                      <span className="font-medium">{role.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[240px] truncate">
                    {role.description || "-"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{role.permissionCount}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1.5">
                      {role.isSystem && (
                        <Badge variant="outline">System</Badge>
                      )}
                      {role.isDefault && (
                        <Badge>Default</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditRoleId(role.id)}
                        disabled={role.isSystem}
                        title={role.isSystem ? "System roles cannot be edited" : "Edit role"}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setDeleteRoleId(role.id)}
                        disabled={role.isSystem}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        title={role.isSystem ? "System roles cannot be deleted" : "Delete role"}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Shield className="h-12 w-12 text-muted-foreground mb-3 opacity-50" />
            <p className="text-sm font-medium text-muted-foreground">No custom roles yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Create a role to define custom permission sets for your team.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Create Dialog */}
      <RoleFormDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        mode="create"
      />

      {/* Edit Dialog */}
      {editRoleId && roleToEdit && (
        <RoleFormDialog
          open={!!editRoleId}
          onOpenChange={(open) => {
            if (!open) setEditRoleId(null)
          }}
          mode="edit"
          role={roleToEdit}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteRoleId}
        onOpenChange={(open) => {
          if (!open) setDeleteRoleId(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Role?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the role &quot;{roleToDelete?.name}&quot; and remove it
              from all users. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-2 justify-end">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteRoleId) {
                  deleteMutation.mutate({ roleId: deleteRoleId })
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
