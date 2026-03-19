"use client"

import { MoreHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { StatusBadge } from "./status-badge"
import { EmployeeTypeBadge } from "./employee-type-badge"
import { AvailabilityLabel } from "./availability-dot"
import { CapacityBar } from "./capacity-bar"
import type { StaffMember } from "@/modules/team/team.types"

function getInitials(name: string): string {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
}

interface TeamGridCardProps {
  member: StaffMember
  deptColor: string
  onNavigate: (id: string) => void
  onQuickView: (id: string) => void
}

export function TeamGridCard({ member, deptColor, onNavigate, onQuickView }: TeamGridCardProps) {
  const deptName = member.departments?.find((d) => d.isPrimary)?.departmentName
    ?? member.departments?.[0]?.departmentName ?? null

  return (
    <div
      className="relative rounded-xl border border-zinc-200 bg-white p-4 space-y-3 hover:-translate-y-px hover:shadow-md transition-all duration-200 cursor-pointer overflow-hidden"
      style={{ borderLeft: `3px solid ${deptColor}` }}
      onClick={() => onNavigate(member.id)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar className="h-9 w-9 shrink-0 text-xs ring-2 ring-white">
            {member.avatarUrl && <AvatarImage src={member.avatarUrl} alt={member.name} />}
            <AvatarFallback className="text-xs font-semibold">{getInitials(member.name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-zinc-900 truncate leading-tight">{member.name}</p>
            <p className="text-xs text-zinc-500 truncate leading-tight">{member.jobTitle ?? "No title"}</p>
          </div>
        </div>
        <StatusBadge status={member.status} />
      </div>

      <div className="flex items-center gap-2">
        {deptName && (
          <>
            <span className="inline-flex h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: deptColor }} />
            <span className="text-xs text-zinc-600 truncate">{deptName}</span>
          </>
        )}
        {member.employeeType && <EmployeeTypeBadge type={member.employeeType} />}
      </div>

      {(member.skills ?? []).length > 0 && (
        <div className="flex flex-wrap gap-1">
          {(member.skills ?? []).slice(0, 3).map((s) => (
            <span
              key={s.skillName}
              className="inline-flex items-center rounded-md border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 text-[10px] font-medium text-zinc-600"
            >
              {s.skillName}
            </span>
          ))}
          {(member.skills ?? []).length > 3 && (
            <span className="inline-flex items-center rounded-md border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 text-[10px] font-medium text-zinc-400">
              +{(member.skills ?? []).length - 3}
            </span>
          )}
        </div>
      )}

      <Separator className="bg-zinc-100" />

      <div className="flex items-center justify-between gap-3">
        <AvailabilityLabel availability={member.availability ?? "unavailable"} />
        {member.capacityMax != null && (
          <CapacityBar used={member.capacityUsed ?? 0} max={member.capacityMax} />
        )}
      </div>

      <div className="flex items-center justify-between pt-0.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="text-[11px] font-medium text-zinc-500 hover:text-zinc-900 transition-colors"
              onClick={(e) => { e.stopPropagation(); onQuickView(member.id) }}
            >
              Quick View
            </button>
          </TooltipTrigger>
          <TooltipContent className="text-xs">Open side panel</TooltipContent>
        </Tooltip>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={() => onNavigate(member.id)}>View Profile</DropdownMenuItem>
            <DropdownMenuItem>Edit Details</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-amber-600">Change Status</DropdownMenuItem>
            <DropdownMenuItem className="text-red-600">Remove</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
