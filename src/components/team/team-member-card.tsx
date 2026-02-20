"use client"

import { Clock, CheckCircle2, MinusCircle } from "lucide-react"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import type { StaffMember, StaffStatus } from "@/modules/team/team.types"

interface TeamMemberCardProps {
  member: StaffMember
  onClick: () => void
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

function AvailabilityIndicator({ status }: { status: StaffStatus }) {
  if (status === "ACTIVE") {
    return (
      <div className="flex items-center gap-1.5 text-xs text-success">
        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
        <span>Available today</span>
      </div>
    )
  }
  if (status === "SUSPENDED") {
    return (
      <div className="flex items-center gap-1.5 text-xs text-warning">
        <Clock className="h-3.5 w-3.5" aria-hidden="true" />
        <span>On leave</span>
      </div>
    )
  }
  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <MinusCircle className="h-3.5 w-3.5" aria-hidden="true" />
      <span>Inactive</span>
    </div>
  )
}

export function TeamMemberCard({ member, onClick }: TeamMemberCardProps) {
  const statusInfo = statusConfig[member.status]

  return (
    <Card
      className={cn(
        "cursor-pointer transition-all duration-150",
        "hover:border-primary/50 hover:shadow-md",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      )}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onClick()
        }
      }}
      tabIndex={0}
      role="button"
      aria-label={`View ${member.name}'s profile`}
    >
      <CardContent className="p-5">
        <div className="flex flex-col items-center text-center gap-3">
          {/* Avatar */}
          <Avatar className="h-16 w-16 text-base">
            {member.avatarUrl && (
              <AvatarImage src={member.avatarUrl} alt={`${member.name} avatar`} />
            )}
            <AvatarFallback className="text-sm font-medium">
              {getInitials(member.name)}
            </AvatarFallback>
          </Avatar>

          {/* Name and role */}
          <div className="space-y-1 min-w-0 w-full">
            <p className="text-sm font-semibold text-foreground truncate">{member.name}</p>
            {member.employeeType && (
              <p className="text-xs text-muted-foreground capitalize">
                {member.employeeType.replace("_", " ").toLowerCase()}
              </p>
            )}
          </div>

          {/* Status badge */}
          <Badge variant={statusInfo.variant} className="text-[10px] px-2">
            {statusInfo.label}
          </Badge>
        </div>
      </CardContent>

      <CardFooter className="px-5 py-3 border-t border-border justify-center">
        <AvailabilityIndicator status={member.status} />
      </CardFooter>
    </Card>
  )
}
