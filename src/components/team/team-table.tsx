"use client"

import { MoreHorizontal, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { StatusBadge } from "./status-badge"
import { EmployeeTypeBadge } from "./employee-type-badge"
import { AvailabilityLabel } from "./availability-dot"
import { CapacityBar } from "./capacity-bar"
import type { StaffMember } from "@/modules/team/team.types"

function getInitials(name: string): string {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
}

function getDeptName(member: StaffMember): string | null {
  const primary = member.departments?.find((d) => d.isPrimary)
  return primary?.departmentName ?? member.departments?.[0]?.departmentName ?? null
}

interface TeamTableProps {
  members: StaffMember[]
  departmentColors: Map<string, string>
  onNavigate: (id: string) => void
  onQuickView: (id: string) => void
  bulkMode: boolean
  selectedIds: Set<string>
  onToggleSelect: (id: string) => void
}

export function TeamTable({
  members,
  departmentColors,
  onNavigate,
  onQuickView,
  bulkMode,
  selectedIds,
  onToggleSelect,
}: TeamTableProps) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent border-zinc-200">
            {bulkMode && <TableHead className="w-10 pl-4" />}
            <TableHead className="pl-5 text-[11px] font-semibold uppercase tracking-widest text-zinc-400 w-[220px]">
              Member
            </TableHead>
            <TableHead className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400 w-[140px]">
              Department
            </TableHead>
            <TableHead className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400 w-[80px]">
              Status
            </TableHead>
            <TableHead className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400 w-[100px]">
              Availability
            </TableHead>
            <TableHead className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400 w-[110px]">
              Capacity
            </TableHead>
            <TableHead className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400">
              Skills
            </TableHead>
            <TableHead className="w-16" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.length === 0 ? (
            <TableRow>
              <TableCell colSpan={bulkMode ? 8 : 7} className="h-24 text-center text-sm text-zinc-400">
                No members match your filters.
              </TableCell>
            </TableRow>
          ) : (
            members.map((member) => {
              const deptName = getDeptName(member)
              const deptColor = deptName ? departmentColors.get(deptName) ?? "#a1a1aa" : "transparent"

              return (
                <TableRow
                  key={member.id}
                  className="group hover:bg-zinc-50/80 cursor-pointer border-zinc-100 transition-colors"
                  style={{ borderLeft: `3px solid ${deptColor}` }}
                  onClick={() => bulkMode ? onToggleSelect(member.id) : onNavigate(member.id)}
                >
                  {bulkMode && (
                    <TableCell className="pl-4">
                      <Checkbox
                        checked={selectedIds.has(member.id)}
                        onCheckedChange={() => onToggleSelect(member.id)}
                        onClick={(e) => e.stopPropagation()}
                        aria-label={`Select ${member.name}`}
                      />
                    </TableCell>
                  )}

                  <TableCell className="py-3 pl-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8 shrink-0 text-xs">
                        {member.avatarUrl && <AvatarImage src={member.avatarUrl} alt={member.name} />}
                        <AvatarFallback className="text-[11px] font-semibold">
                          {getInitials(member.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-zinc-900 truncate leading-tight">
                          {member.name}
                        </p>
                        <p className="text-xs text-zinc-400 truncate leading-tight flex items-center gap-1.5">
                          {member.jobTitle ?? "No title"}
                          {member.employeeType && <EmployeeTypeBadge type={member.employeeType} />}
                        </p>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell className="py-3">
                    {deptName ? (
                      <div className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: deptColor }} />
                        <span className="text-xs text-zinc-600 truncate">{deptName}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-zinc-400">—</span>
                    )}
                  </TableCell>

                  <TableCell className="py-3">
                    <StatusBadge status={member.status} />
                  </TableCell>

                  <TableCell className="py-3">
                    <AvailabilityLabel availability={member.availability ?? "unavailable"} />
                  </TableCell>

                  <TableCell className="py-3">
                    {member.capacityMax != null ? (
                      <CapacityBar used={member.capacityUsed ?? 0} max={member.capacityMax} />
                    ) : (
                      <span className="text-xs text-zinc-400">—</span>
                    )}
                  </TableCell>

                  <TableCell className="py-3">
                    <div className="flex items-center gap-1 flex-wrap">
                      {(member.skills ?? []).slice(0, 2).map((s) => (
                        <span
                          key={s.skillName}
                          className="inline-flex items-center rounded border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 text-[10px] font-medium text-zinc-600"
                        >
                          {s.skillName}
                        </span>
                      ))}
                      {(member.skills ?? []).length > 2 && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="inline-flex items-center rounded border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 text-[10px] font-medium text-zinc-400 cursor-default">
                              +{(member.skills ?? []).length - 2}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent className="text-xs">
                            {(member.skills ?? []).slice(2).map((s) => s.skillName).join(", ")}
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </TableCell>

                  <TableCell className="py-3 pr-3">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={(e) => { e.stopPropagation(); onQuickView(member.id) }}
                          >
                            <Zap className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent className="text-xs">Quick View</TooltipContent>
                      </Tooltip>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreHorizontal className="h-4 w-4" />
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
                  </TableCell>
                </TableRow>
              )
            })
          )}
        </TableBody>
      </Table>
    </div>
  )
}
