"use client"

import { Clock, CheckCircle2, MinusCircle } from "lucide-react"
import { api } from "@/lib/trpc/react"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
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

function AvailabilityIndicator({ memberId, status }: { memberId: string; status: StaffStatus }) {
  const today = new Date().toISOString().split("T")[0]!
  const { data: availability } = api.team.getAvailability.useQuery(
    { userId: memberId, startDate: today },
    { enabled: status === "ACTIVE", staleTime: 5 * 60 * 1000 }
  )

  if (status === "SUSPENDED") {
    return (
      <div className="flex items-center gap-1.5 text-xs text-warning">
        <Clock className="h-3.5 w-3.5" aria-hidden="true" />
        <span>On leave</span>
      </div>
    )
  }

  if (status !== "ACTIVE") {
    return (
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <MinusCircle className="h-3.5 w-3.5" aria-hidden="true" />
        <span>Inactive</span>
      </div>
    )
  }

  // Check if today has any RECURRING or SPECIFIC availability entries
  const dayOfWeek = new Date().getDay()
  const hasAvailability = availability?.some((entry) => {
    if (entry.type === "RECURRING" && entry.dayOfWeek === dayOfWeek) return true
    if (entry.type === "SPECIFIC" && entry.specificDate === today) return true
    return false
  })

  // Check if today is blocked
  const isBlocked = availability?.some((entry) => {
    if (entry.type === "BLOCKED" && entry.specificDate === today) return true
    return false
  })

  if (isBlocked) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-warning">
        <Clock className="h-3.5 w-3.5" aria-hidden="true" />
        <span>Blocked today</span>
      </div>
    )
  }

  if (hasAvailability) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-success">
        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
        <span>Available today</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <MinusCircle className="h-3.5 w-3.5" aria-hidden="true" />
      <span>No schedule today</span>
    </div>
  )
}

function WorkloadBadge({ memberId }: { memberId: string }) {
  const today = new Date().toISOString().split("T")[0]!
  const { data, isLoading } = api.team.getWorkload.useQuery(
    { userId: memberId, date: today },
    { staleTime: 60 * 1000 }
  )

  if (isLoading) return <Skeleton className="h-4 w-10 inline-block" />
  if (!data || data.capacities.length === 0) return null

  const primary = data.capacities[0]!
  return (
    <span className={cn(
      "text-xs tabular-nums font-semibold",
      primary.isOver ? "text-destructive" : "text-muted-foreground"
    )}>
      {primary.used}/{primary.max ?? "∞"}
    </span>
  )
}

function SkillChips({ memberId }: { memberId: string }) {
  const { data, isLoading } = api.team.listSkills.useQuery(
    { userId: memberId },
    { staleTime: 60 * 1000 }
  )

  if (isLoading || !data || data.length === 0) return null

  const visible = data.slice(0, 3)
  const overflow = data.length - visible.length

  return (
    <div className="flex flex-wrap items-center justify-center gap-1 mt-1">
      {visible.map((skill) => (
        <span
          key={skill.id}
          className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground"
        >
          {skill.skillName}
        </span>
      ))}
      {overflow > 0 && (
        <span className="text-[10px] text-muted-foreground">+{overflow}</span>
      )}
    </div>
  )
}

function CustomFieldChips({ memberId }: { memberId: string }) {
  const { data: definitions } = api.team.customFields.listDefinitions.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
  })
  const { data: values } = api.team.customFields.getValues.useQuery(
    { userId: memberId },
    { staleTime: 60_000 }
  )

  if (!definitions || !values) return null

  const cardFields = definitions.filter((d) => d.showOnCard)
  if (cardFields.length === 0) return null

  const valueMap = new Map(values.map((v) => [v.fieldDefinitionId, v.value]))

  return (
    <div className="flex flex-wrap items-center justify-center gap-1 mt-1">
      {cardFields.map((def) => {
        const val = valueMap.get(def.id)
        if (val == null) return null
        return (
          <span
            key={def.id}
            className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground"
          >
            {def.label}: {String(val)}
          </span>
        )
      })}
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
          <Avatar className="h-16 w-16 text-base">
            {member.avatarUrl && (
              <AvatarImage src={member.avatarUrl} alt={`${member.name} avatar`} />
            )}
            <AvatarFallback className="text-sm font-medium">
              {getInitials(member.name)}
            </AvatarFallback>
          </Avatar>

          <div className="space-y-1 min-w-0 w-full">
            <p className="text-sm font-semibold text-foreground truncate">{member.name}</p>
            {member.employeeType && (
              <p className="text-xs text-muted-foreground capitalize">
                {member.employeeType.replace("_", " ").toLowerCase()}
              </p>
            )}
          </div>

          <Badge variant={statusInfo.variant} className="text-[10px] px-2">
            {statusInfo.label}
          </Badge>

          <SkillChips memberId={member.id} />
          <CustomFieldChips memberId={member.id} />
        </div>
      </CardContent>

      <CardFooter className="px-5 py-3 border-t border-border justify-between">
        <AvailabilityIndicator memberId={member.id} status={member.status} />
        <WorkloadBadge memberId={member.id} />
      </CardFooter>
    </Card>
  )
}
