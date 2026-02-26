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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Loader2, Users, X } from "lucide-react"
import { toast } from "sonner"

interface RemoveTarget {
  userId: string
  roleId: string
  roleName: string
  userName: string
}

/**
 * UserRoleAssignment - Assign and remove roles from users.
 *
 * Shows a table of all users with their assigned roles.
 * Each role badge has a remove button; a dropdown adds new roles.
 */
export function UserRoleAssignment() {
  const [removeTarget, setRemoveTarget] = useState<RemoveTarget | null>(null)
  const [selectedUser, setSelectedUser] = useState<string | null>(null)
  const [selectedRole, setSelectedRole] = useState<string>("")

  const utils = api.useUtils()

  const { data: assignments, isLoading: loadingAssignments } =
    api.rbac.listUserAssignments.useQuery()

  const { data: roles } = api.rbac.listRoles.useQuery()

  const { data: teamMembers, isLoading: loadingTeam } =
    api.team.list.useQuery({ limit: 100 })

  const assignMutation = api.rbac.assignRole.useMutation({
    onSuccess: () => {
      toast.success("Role assigned")
      setSelectedUser(null)
      setSelectedRole("")
      utils.rbac.invalidate()
    },
    onError: (error) => {
      toast.error("Failed to assign role", { description: error.message })
    },
  })

  const removeMutation = api.rbac.removeRole.useMutation({
    onSuccess: () => {
      toast.success("Role removed")
      setRemoveTarget(null)
      utils.rbac.invalidate()
    },
    onError: (error) => {
      toast.error("Failed to remove role", { description: error.message })
    },
  })

  // Group assignments by userId
  const userAssignmentMap = React.useMemo(() => {
    if (!assignments) return new Map<string, typeof assignments>()
    const map = new Map<string, typeof assignments>()
    for (const a of assignments) {
      if (!map.has(a.userId)) {
        map.set(a.userId, [])
      }
      map.get(a.userId)!.push(a)
    }
    return map
  }, [assignments])

  // Build list of users (from team members or from assignments)
  const userList = React.useMemo(() => {
    const users = new Map<string, { id: string; name: string; email: string }>()

    // Add all team members
    if (teamMembers?.rows) {
      for (const m of teamMembers.rows) {
        users.set(m.id, {
          id: m.id,
          name: m.name,
          email: m.email,
        })
      }
    }

    // Fill in from assignments (in case team query didn't include some)
    if (assignments) {
      for (const a of assignments) {
        if (!users.has(a.userId)) {
          users.set(a.userId, {
            id: a.userId,
            name: a.userName,
            email: a.userEmail,
          })
        }
      }
    }

    return Array.from(users.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    )
  }, [teamMembers, assignments])

  function handleAssignRole() {
    if (!selectedUser || !selectedRole) return
    assignMutation.mutate({ userId: selectedUser, roleId: selectedRole })
  }

  if (loadingAssignments || loadingTeam) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">User Role Assignments</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Assign roles to team members to control their permissions.
        </p>
      </div>

      {/* Quick assign bar */}
      {roles && roles.length > 0 && userList.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1 flex-1 min-w-[180px]">
                <label className="text-sm font-medium">User</label>
                <Select
                  value={selectedUser ?? ""}
                  onValueChange={setSelectedUser}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select user..." />
                  </SelectTrigger>
                  <SelectContent>
                    {userList.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name} ({u.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1 flex-1 min-w-[180px]">
                <label className="text-sm font-medium">Role</label>
                <Select
                  value={selectedRole}
                  onValueChange={setSelectedRole}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select role..." />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={handleAssignRole}
                disabled={!selectedUser || !selectedRole || assignMutation.isPending}
                className="active:scale-[0.98]"
              >
                {assignMutation.isPending && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Assign Role
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* User assignment table */}
      {userList.length > 0 ? (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Roles</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {userList.map((user) => {
                const userAssignments = userAssignmentMap.get(user.id) ?? []
                return (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {user.email}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1.5">
                        {userAssignments.length > 0 ? (
                          userAssignments.map((a) => (
                            <Badge
                              key={a.roleId}
                              variant="secondary"
                              className="gap-1 pr-1"
                            >
                              {a.roleName}
                              <button
                                onClick={() =>
                                  setRemoveTarget({
                                    userId: a.userId,
                                    roleId: a.roleId,
                                    roleName: a.roleName,
                                    userName: user.name,
                                  })
                                }
                                className="ml-0.5 rounded-full hover:bg-muted p-0.5"
                                title={`Remove ${a.roleName} role`}
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))
                        ) : (
                          <span className="text-xs text-muted-foreground italic">
                            No roles assigned
                          </span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Users className="h-12 w-12 text-muted-foreground mb-3 opacity-50" />
            <p className="text-sm font-medium text-muted-foreground">No team members found</p>
            <p className="text-xs text-muted-foreground mt-1">
              Add team members first to assign roles.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Remove role confirmation */}
      <AlertDialog
        open={!!removeTarget}
        onOpenChange={(open) => {
          if (!open) setRemoveTarget(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Role?</AlertDialogTitle>
            <AlertDialogDescription>
              Remove the &quot;{removeTarget?.roleName}&quot; role from{" "}
              {removeTarget?.userName}? They will lose all permissions associated
              with this role.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-2 justify-end">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (removeTarget) {
                  removeMutation.mutate({
                    userId: removeTarget.userId,
                    roleId: removeTarget.roleId,
                  })
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={removeMutation.isPending}
            >
              {removeMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Removing...
                </>
              ) : (
                "Remove"
              )}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
