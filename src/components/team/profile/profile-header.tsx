"use client"

import { useState } from "react"
import { format } from "date-fns"
import { Mail, Phone, Calendar, ChevronDown, User, UserMinus } from "lucide-react"
import { toast } from "sonner"
import { api } from "@/lib/trpc/react"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
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
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import type { StaffMember, StaffStatus } from "@/modules/team/team.types"

interface ProfileHeaderProps {
  member: StaffMember
  onUpdate: () => void
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

const statusConfig: Record<
  StaffStatus,
  { label: string; variant: "success" | "warning" | "secondary" }
> = {
  ACTIVE: { label: "Active", variant: "success" },
  INACTIVE: { label: "Inactive", variant: "secondary" },
  SUSPENDED: { label: "Suspended", variant: "warning" },
}

function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "--"
  try {
    return format(new Date(date), "d MMM yyyy")
  } catch {
    return "--"
  }
}

function ReportsToLine({ reportsTo }: { reportsTo: string }) {
  const { data: manager } = api.team.getById.useQuery(
    { userId: reportsTo },
    { staleTime: 5 * 60 * 1000, retry: false }
  )
  if (!manager) return null

  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <User className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>Reports to {manager.name}</span>
    </div>
  )
}

// ─── Workload strip ──────────────────────────────────────────────────────────

function WorkloadStrip({ memberId }: { memberId: string }) {
  const today = new Date().toISOString().split("T")[0]!

  const { data: workload, isLoading } = api.team.getWorkload.useQuery(
    { userId: memberId, date: today },
    { enabled: !!memberId }
  )

  if (isLoading) {
    return (
      <div className="flex items-center gap-2">
        <Skeleton className="h-6 w-20 rounded-full" />
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
    )
  }

  if (!workload || workload.capacities.length === 0) {
    return (
      <span className="text-xs text-muted-foreground">No capacity data</span>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {workload.capacities.map((cap) => {
        const pct = cap.max != null && cap.max > 0 ? (cap.used / cap.max) * 100 : 0
        const isOver = cap.isOver
        const variant = isOver ? "destructive" : pct >= 80 ? "warning" : "info"

        return (
          <Badge
            key={cap.capacityType}
            variant={variant as "destructive" | "warning" | "info"}
            className="text-[10px] gap-1"
          >
            <span className="capitalize">{cap.capacityType}</span>
            <span>
              {cap.used}/{cap.max ?? "--"}
            </span>
          </Badge>
        )
      })}
    </div>
  )
}

// ─── Profile header ──────────────────────────────────────────────────────────

export function ProfileHeader({ member, onUpdate }: ProfileHeaderProps) {
  const utils = api.useUtils()
  const [deactivateOpen, setDeactivateOpen] = useState(false)

  const deactivateMutation = api.team.deactivate.useMutation({
    onSuccess: () => {
      toast.success("Staff member deactivated")
      void utils.team.getById.invalidate({ userId: member.id })
      void utils.team.list.invalidate()
      onUpdate()
    },
    onError: (err) => toast.error(err.message ?? "Failed to deactivate"),
  })

  const updateMutation = api.team.update.useMutation({
    onSuccess: () => {
      toast.success("Status updated")
      void utils.team.getById.invalidate({ userId: member.id })
      void utils.team.list.invalidate()
      onUpdate()
    },
    onError: (err) => {
      toast.error(err.message ?? "Failed to update status")
    },
  })

  function handleStatusChange(status: StaffStatus) {
    updateMutation.mutate({ id: member.id, status })
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
        {/* Avatar */}
        <Avatar className="h-20 w-20 text-xl shrink-0">
          {member.avatarUrl && (
            <AvatarImage src={member.avatarUrl} alt={`${member.name} avatar`} />
          )}
          <AvatarFallback className="text-base font-medium">
            {getInitials(member.name)}
          </AvatarFallback>
        </Avatar>

        {/* Info */}
        <div className="flex-1 min-w-0 space-y-3">
          <div>
            <h1 className="text-xl font-semibold text-foreground truncate">
              {member.name}
            </h1>
            {member.employeeType && (
              <p className="text-sm text-muted-foreground capitalize">
                {member.employeeType.replace("_", " ").toLowerCase()}
              </p>
            )}
            {member.jobTitle && (
              <p className="text-sm text-muted-foreground">{member.jobTitle}</p>
            )}
          </div>

          {/* Contact details */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            {member.email && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span className="truncate">{member.email}</span>
              </div>
            )}
            {member.phone && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Phone className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>{member.phone}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Calendar className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>Joined {formatDate(member.createdAt)}</span>
            </div>
          </div>

          {member.reportsTo && (
            <ReportsToLine reportsTo={member.reportsTo} />
          )}

          {/* Status row + workload */}
          <div className="flex flex-wrap items-center gap-3">
            <Badge
              variant={statusConfig[member.status].variant}
              className="text-xs"
            >
              {statusConfig[member.status].label}
            </Badge>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs gap-1"
                  aria-label="Change status"
                >
                  Change status
                  <ChevronDown className="h-3 w-3" aria-hidden="true" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuLabel>Set status</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => handleStatusChange("ACTIVE")}
                  className={cn(
                    member.status === "ACTIVE" && "bg-accent text-accent-foreground"
                  )}
                >
                  Active
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleStatusChange("INACTIVE")}
                  className={cn(
                    member.status === "INACTIVE" && "bg-accent text-accent-foreground"
                  )}
                >
                  Inactive
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleStatusChange("SUSPENDED")}
                  className={cn(
                    member.status === "SUSPENDED" && "bg-accent text-accent-foreground"
                  )}
                >
                  Suspended
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {member.status === "ACTIVE" && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1 text-destructive hover:text-destructive"
                onClick={() => setDeactivateOpen(true)}
              >
                <UserMinus className="h-3 w-3" aria-hidden="true" />
                Deactivate
              </Button>
            )}

            {/* Divider */}
            <div className="h-5 w-px bg-border hidden sm:block" aria-hidden="true" />

            {/* Workload strip */}
            <WorkloadStrip memberId={member.id} />

            {/* Departments */}
            {member.departments?.length > 0 && (
              <>
                <div className="h-5 w-px bg-border hidden sm:block" aria-hidden="true" />
                <div className="flex flex-wrap items-center gap-1.5">
                  {member.departments.map((dept) => (
                    <Badge
                      key={dept.departmentId}
                      variant={dept.isPrimary ? "default" : "outline"}
                      className="text-[10px]"
                    >
                      {dept.departmentName}
                    </Badge>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <AlertDialog open={deactivateOpen} onOpenChange={setDeactivateOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate staff member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate {member.name}? They will lose access and be removed from schedules.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deactivateMutation.mutate({ userId: member.id })}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
