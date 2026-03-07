"use client"

import { useState } from "react"
import { X, UserPlus } from "lucide-react"
import { toast } from "sonner"
import { api } from "@/lib/trpc/react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"

interface DepartmentMembersDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  department: { id: string; name: string }
}

export function DepartmentMembersDialog({
  open,
  onOpenChange,
  department,
}: DepartmentMembersDialogProps) {
  const [selectedUserId, setSelectedUserId] = useState<string>("")
  const utils = api.useUtils()

  // Fetch all staff to populate the "add" dropdown
  const { data: staffData } = api.team.list.useQuery(
    { limit: 100, status: "ACTIVE" },
    { enabled: open, staleTime: 30_000 }
  )

  // Fetch departments to get current members
  const { data: departments, isLoading } = api.team.departments.list.useQuery(undefined, {
    enabled: open,
  })

  const addMutation = api.team.departments.addMember.useMutation({
    onSuccess: () => {
      toast.success("Member added to department")
      setSelectedUserId("")
      void utils.team.departments.list.invalidate()
      void utils.team.list.invalidate()
    },
    onError: (err) => toast.error(err.message ?? "Failed to add member"),
  })

  const removeMutation = api.team.departments.removeMember.useMutation({
    onSuccess: () => {
      toast.success("Member removed from department")
      void utils.team.departments.list.invalidate()
      void utils.team.list.invalidate()
    },
    onError: (err) => toast.error(err.message ?? "Failed to remove member"),
  })

  // Find current department's members from staff list by checking their departments array
  const allStaff = staffData?.rows ?? []
  const currentMembers = allStaff.filter((m) =>
    m.departments?.some((d) => d.departmentId === department.id)
  )
  const availableStaff = allStaff.filter(
    (m) => !m.departments?.some((d) => d.departmentId === department.id)
  )

  function handleAdd() {
    if (!selectedUserId) return
    addMutation.mutate({
      userId: selectedUserId,
      departmentId: department.id,
      isPrimary: false,
    })
  }

  function handleRemove(userId: string) {
    removeMutation.mutate({ userId, departmentId: department.id })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{department.name} — Members</DialogTitle>
          <DialogDescription>
            Add or remove staff members from this department.
          </DialogDescription>
        </DialogHeader>

        {/* Add member section */}
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a staff member..." />
              </SelectTrigger>
              <SelectContent>
                {availableStaff.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            size="sm"
            onClick={handleAdd}
            disabled={!selectedUserId || addMutation.isPending}
          >
            <UserPlus className="h-3.5 w-3.5" />
            Add
          </Button>
        </div>

        {/* Current members list */}
        <div className="space-y-1 max-h-[300px] overflow-y-auto">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : currentMembers.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No members in this department yet.
            </p>
          ) : (
            currentMembers.map((member) => {
              const deptInfo = member.departments?.find(
                (d) => d.departmentId === department.id
              )
              return (
                <div
                  key={member.id}
                  className="flex items-center justify-between rounded-md border border-border px-3 py-2"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm font-medium truncate">
                      {member.name}
                    </span>
                    {deptInfo?.isPrimary && (
                      <Badge variant="secondary" className="text-[10px]">
                        Primary
                      </Badge>
                    )}
                  </div>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => handleRemove(member.id)}
                    disabled={removeMutation.isPending}
                    aria-label={`Remove ${member.name}`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
