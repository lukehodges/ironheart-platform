"use client"

import { ChevronLeft, ChevronRight, Shield, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import type { EmployeeType } from "@/modules/team/team.types"

interface DepartmentItem {
  id: string
  name: string
  color: string | null
  memberCount: number
}

interface TeamSidebarProps {
  departments: DepartmentItem[]
  totalMembers: number
  deptFilter: string | null
  onDeptFilter: (id: string | null) => void
  employeeTypeFilter: EmployeeType | null
  onEmployeeTypeFilter: (type: EmployeeType | null) => void
  isOpen: boolean
  onToggle: () => void
}

const EMPLOYEE_TYPE_OPTIONS: Array<{ value: EmployeeType | null; label: string }> = [
  { value: null, label: "All types" },
  { value: "EMPLOYED", label: "FTE" },
  { value: "SELF_EMPLOYED", label: "Self-employed" },
  { value: "CONTRACTOR", label: "Contractor" },
]

export function TeamSidebar({
  departments,
  totalMembers,
  deptFilter,
  onDeptFilter,
  employeeTypeFilter,
  onEmployeeTypeFilter,
  isOpen,
  onToggle,
}: TeamSidebarProps) {
  if (!isOpen) {
    return (
      <div className="shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onToggle}
          aria-label="Open sidebar"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    )
  }

  return (
    <aside className="w-52 shrink-0 space-y-4">
      <div className="flex justify-end">
        <Button
          variant="ghost"
          size="sm"
          className="h-6 text-xs text-zinc-400 hover:text-zinc-700 gap-1"
          onClick={onToggle}
        >
          <ChevronLeft className="h-3 w-3" />
          Hide
        </Button>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-zinc-100">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400">
            Departments
          </span>
        </div>
        <div className="p-1.5 space-y-0.5">
          <button
            type="button"
            onClick={() => onDeptFilter(null)}
            className={cn(
              "flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition-colors",
              deptFilter === null
                ? "bg-zinc-900 text-white font-semibold"
                : "text-zinc-600 hover:bg-zinc-50 font-medium"
            )}
          >
            <span>All members</span>
            <span className={cn("font-mono text-[11px]", deptFilter === null ? "text-white/70" : "text-zinc-400")}>
              {totalMembers}
            </span>
          </button>

          <Separator className="bg-zinc-100 my-1" />

          {departments.map((dept) => (
            <button
              key={dept.id}
              type="button"
              onClick={() => onDeptFilter(dept.id === deptFilter ? null : dept.id)}
              className={cn(
                "flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition-colors",
                deptFilter === dept.id
                  ? "bg-zinc-100 font-semibold text-zinc-900"
                  : "text-zinc-600 hover:bg-zinc-50 font-medium"
              )}
            >
              <span className="flex items-center gap-2 min-w-0">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: dept.color ?? "#a1a1aa" }}
                />
                <span className="truncate">{dept.name}</span>
              </span>
              <span className="font-mono text-[11px] text-zinc-400 shrink-0">{dept.memberCount}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-zinc-100">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400">
            Type
          </span>
        </div>
        <div className="p-1.5 space-y-0.5">
          {EMPLOYEE_TYPE_OPTIONS.map((opt) => (
            <button
              key={opt.value ?? "all"}
              type="button"
              onClick={() => onEmployeeTypeFilter(opt.value)}
              className={cn(
                "flex w-full items-center rounded-lg px-2.5 py-1.5 text-xs transition-colors",
                employeeTypeFilter === opt.value
                  ? "bg-zinc-100 font-semibold text-zinc-900"
                  : "text-zinc-600 hover:bg-zinc-50 font-medium"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Shield className="h-3.5 w-3.5 text-blue-500 shrink-0" />
          <span className="text-xs font-semibold text-blue-700">WorkOS Access</span>
        </div>
        <p className="text-[11px] leading-relaxed text-blue-600">
          Invite flows, SSO &amp; SCIM provisioning via WorkOS AuthKit.
        </p>
        <button
          type="button"
          className="flex w-full items-center gap-1.5 text-[11px] font-medium text-blue-600 hover:text-blue-800 transition-colors"
        >
          <ExternalLink className="h-3 w-3 shrink-0" />
          Manage Access
        </button>
      </div>
    </aside>
  )
}
