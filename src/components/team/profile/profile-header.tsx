"use client"

import { format } from "date-fns"
import { Mail, Phone, Calendar, ChevronDown, User } from "lucide-react"
import { toast } from "sonner"
import { api } from "@/lib/trpc/react"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
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
    { staleTime: 5 * 60 * 1000 }
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
            {(member as any).jobTitle && (
              <p className="text-sm text-muted-foreground">{(member as any).jobTitle}</p>
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

          {(member as any).reportsTo && (
            <ReportsToLine reportsTo={(member as any).reportsTo} />
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

            {/* Divider */}
            <div className="h-5 w-px bg-border hidden sm:block" aria-hidden="true" />

            {/* Workload strip */}
            <WorkloadStrip memberId={member.id} />

            {/* Departments */}
            {(member as any).departments?.length > 0 && (
              <>
                <div className="h-5 w-px bg-border hidden sm:block" aria-hidden="true" />
                <div className="flex flex-wrap items-center gap-1.5">
                  {(member as any).departments.map((dept: any) => (
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
    </div>
  )
}
