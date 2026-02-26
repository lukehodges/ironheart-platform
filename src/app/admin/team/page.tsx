"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { UserPlus, Building2, Network, Search } from "lucide-react"
import { api } from "@/lib/trpc/react"
import { PageHeader } from "@/components/ui/page-header"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/ui/empty-state"
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible"
import { Separator } from "@/components/ui/separator"
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { TeamMemberCard } from "@/components/team/team-member-card"
import { TeamMemberSheet } from "@/components/team/team-member-sheet"
import { AddMemberDialog } from "@/components/team/add-member-dialog"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import type { StaffStatus, StaffMember } from "@/modules/team/team.types"

// ─── Filter types ────────────────────────────────────────────────────────────

type StatusFilter = "ALL" | StaffStatus
type EmployeeTypeFilter = "ALL" | "EMPLOYED" | "SELF_EMPLOYED" | "CONTRACTOR"

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "ALL", label: "All statuses" },
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
  { value: "SUSPENDED", label: "Suspended" },
]

const EMPLOYEE_TYPE_OPTIONS: { value: EmployeeTypeFilter; label: string }[] = [
  { value: "ALL", label: "All types" },
  { value: "EMPLOYED", label: "Employed" },
  { value: "SELF_EMPLOYED", label: "Self-employed" },
  { value: "CONTRACTOR", label: "Contractor" },
]

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-background text-foreground hover:bg-muted"
      )}
      aria-pressed={active}
    >
      {children}
    </button>
  )
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

// ─── Loading skeleton grid ────────────────────────────────────────────────────

function TeamGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-border p-5 space-y-4"
        >
          <div className="flex flex-col items-center gap-3">
            <Skeleton className="h-16 w-16 rounded-full" />
            <div className="space-y-2 w-full text-center">
              <Skeleton className="h-4 w-24 mx-auto" />
              <Skeleton className="h-3 w-16 mx-auto" />
            </div>
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <div className="border-t border-border pt-3 flex justify-center">
            <Skeleton className="h-4 w-28" />
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── "Who's available now" indicator bar ─────────────────────────────────────

function AvailabilityBar({
  activeCount,
  activeMembers,
}: {
  activeCount: number
  activeMembers: Array<{ id: string; name: string; avatarUrl: string | null }>
}) {
  if (activeCount === 0) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-4 py-2.5">
        <div className="h-2 w-2 rounded-full bg-muted-foreground" />
        <span className="text-xs text-muted-foreground">No staff available right now</span>
      </div>
    )
  }

  const visible = activeMembers.slice(0, 6)
  const overflow = activeCount - visible.length

  return (
    <div className="flex items-center gap-3 rounded-lg border border-success/20 bg-success/5 px-4 py-2.5">
      <div className="h-2 w-2 rounded-full bg-success animate-pulse" aria-hidden="true" />
      <span className="text-xs font-medium text-success">
        {activeCount} available now
      </span>
      <div className="flex -space-x-1.5 ml-1" aria-label={`${activeCount} available staff members`}>
        {visible.map((m) => (
          <Avatar key={m.id} className="h-6 w-6 ring-2 ring-background text-[10px]">
            {m.avatarUrl && <AvatarImage src={m.avatarUrl} alt={m.name} />}
            <AvatarFallback>{getInitials(m.name)}</AvatarFallback>
          </Avatar>
        ))}
        {overflow > 0 && (
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-[10px] font-medium text-muted-foreground ring-2 ring-background">
            +{overflow}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Department grouped view ─────────────────────────────────────────────────

function DepartmentGroupedView({
  members,
  departments,
  onSelectMember,
  bulkMode,
  selectedIds,
  onToggleSelect,
}: {
  members: StaffMember[]
  departments: any[]
  onSelectMember: (id: string) => void
  bulkMode: boolean
  selectedIds: Set<string>
  onToggleSelect: (id: string) => void
}) {
  // Group members by primary department
  const grouped = new Map<string, StaffMember[]>()
  const unassigned: StaffMember[] = []

  for (const member of members) {
    const depts = member.departments ?? []
    const primary = depts.find((d) => d.isPrimary)
    if (primary) {
      const arr = grouped.get(primary.departmentName) ?? []
      arr.push(member)
      grouped.set(primary.departmentName, arr)
    } else if (depts.length > 0) {
      const arr = grouped.get(depts[0].departmentName) ?? []
      arr.push(member)
      grouped.set(depts[0].departmentName, arr)
    } else {
      unassigned.push(member)
    }
  }

  const sections = [...Array.from(grouped.entries()), ...(unassigned.length > 0 ? [["Unassigned", unassigned] as const] : [])]

  return (
    <div className="space-y-4">
      {sections.map(([name, groupMembers]) => (
        <Collapsible key={name} defaultOpen>
          <CollapsibleTrigger className="flex items-center gap-2 w-full text-left py-2 hover:bg-muted/50 rounded-md px-2 transition-colors">
            <span className="text-sm font-medium">{name}</span>
            <Badge variant="secondary" className="text-[10px]">{groupMembers.length}</Badge>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 mt-2" role="list">
              {groupMembers.map((member) => (
                <div key={member.id} role="listitem" className="relative">
                  {bulkMode && (
                    <div className="absolute top-2 left-2 z-10">
                      <Checkbox
                        checked={selectedIds.has(member.id)}
                        onCheckedChange={() => onToggleSelect(member.id)}
                        aria-label={`Select ${member.name}`}
                      />
                    </div>
                  )}
                  <TeamMemberCard
                    member={member}
                    onClick={() => bulkMode ? onToggleSelect(member.id) : onSelectMember(member.id)}
                  />
                </div>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      ))}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function TeamPage() {
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL")
  const [employeeTypeFilter, setEmployeeTypeFilter] = useState<EmployeeTypeFilter>("ALL")
  const [groupByDepartment, setGroupByDepartment] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkMode, setBulkMode] = useState(false)
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [departmentId, setDepartmentId] = useState<string | undefined>(undefined)
  const [cursor, setCursor] = useState<string | undefined>(undefined)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setCursor(undefined) // reset pagination on search change
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => {
    setCursor(undefined)
  }, [statusFilter, employeeTypeFilter, departmentId])

  const { data, isLoading } = api.team.list.useQuery({
    limit: 25,
    search: debouncedSearch || undefined,
    departmentId,
    status: statusFilter === "ALL" ? undefined : statusFilter,
    employeeType: employeeTypeFilter === "ALL" ? undefined : employeeTypeFilter,
    cursor,
  })

  const members = data?.rows ?? []

  const { data: departments } = api.team.departments.list.useQuery(undefined, {
    staleTime: 60_000,
  })

  const utils = api.useUtils()

  const bulkUpdateMutation = api.team.update.useMutation({
    onError: (err) => toast.error(err.message ?? "Failed to update"),
  })

  const [bulkUpdating, setBulkUpdating] = useState(false)

  async function handleBulkStatusChange(status: StaffStatus) {
    const ids = Array.from(selectedIds)
    setBulkUpdating(true)
    try {
      for (const id of ids) {
        await bulkUpdateMutation.mutateAsync({ id, status })
      }
      toast.success(`Updated ${ids.length} member${ids.length !== 1 ? "s" : ""}`)
      setSelectedIds(new Set())
      setBulkMode(false)
      void utils.team.list.invalidate()
    } catch {
      // onError handler already shows toast
    } finally {
      setBulkUpdating(false)
    }
  }

  // Active members for the availability bar
  const activeMembers = members.filter((m) => m.status === "ACTIVE")

  function flattenDepts(depts: typeof departments): Array<{ id: string; name: string }> {
    if (!depts) return []
    const result: Array<{ id: string; name: string }> = []
    function walk(list: typeof depts, prefix = "") {
      for (const d of list!) {
        result.push({ id: d.id, name: prefix ? `${prefix} / ${d.name}` : d.name })
        if (d.children?.length) walk(d.children, prefix ? `${prefix} / ${d.name}` : d.name)
      }
    }
    walk(depts)
    return result
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page header */}
      <PageHeader
        title="Team"
        description="Manage staff, availability, and capacity."
      >
        <Button
          size="sm"
          onClick={() => setAddDialogOpen(true)}
          aria-label="Add team member"
        >
          <UserPlus className="h-4 w-4" />
          Add Member
        </Button>
      </PageHeader>

      {/* Availability bar */}
      {!isLoading && (
        <AvailabilityBar
          activeCount={activeMembers.length}
          activeMembers={activeMembers}
        />
      )}

      {/* Filter row */}
      <div className="space-y-2">
        {/* Search input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search staff by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Status filters */}
        <div
          className="flex flex-wrap items-center gap-2"
          role="group"
          aria-label="Filter by status"
        >
          <span className="text-xs text-muted-foreground mr-1">Status:</span>
          {STATUS_OPTIONS.map((opt) => (
            <FilterChip
              key={opt.value}
              active={statusFilter === opt.value}
              onClick={() => setStatusFilter(opt.value)}
            >
              {opt.label}
            </FilterChip>
          ))}
        </div>

        {/* Employee type filters */}
        <div
          className="flex flex-wrap items-center gap-2"
          role="group"
          aria-label="Filter by employment type"
        >
          <span className="text-xs text-muted-foreground mr-1">Type:</span>
          {EMPLOYEE_TYPE_OPTIONS.map((opt) => (
            <FilterChip
              key={opt.value}
              active={employeeTypeFilter === opt.value}
              onClick={() => setEmployeeTypeFilter(opt.value)}
            >
              {opt.label}
            </FilterChip>
          ))}
        </div>

        {/* Action row */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="text-xs h-7" asChild>
            <Link href="/admin/team/departments">
              <Network className="h-3.5 w-3.5" />
              Departments
            </Link>
          </Button>
          <Button
            size="sm"
            variant={groupByDepartment ? "default" : "outline"}
            className="text-xs h-7"
            onClick={() => setGroupByDepartment(!groupByDepartment)}
          >
            <Building2 className="h-3.5 w-3.5" />
            Group by department
          </Button>
          <Select
            value={departmentId ?? "ALL"}
            onValueChange={(v) => setDepartmentId(v === "ALL" ? undefined : v)}
          >
            <SelectTrigger className="h-7 w-[180px] text-xs">
              <SelectValue placeholder="All departments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All departments</SelectItem>
              {flattenDepts(departments).map((dept) => (
                <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            variant={bulkMode ? "secondary" : "outline"}
            className="text-xs h-7"
            onClick={() => {
              setBulkMode(!bulkMode)
              setSelectedIds(new Set())
            }}
          >
            {bulkMode ? "Cancel selection" : "Select"}
          </Button>
        </div>
      </div>

      {/* Results count */}
      {!isLoading && (
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            {members.length} member{members.length !== 1 ? "s" : ""}
          </Badge>
          {(statusFilter !== "ALL" || employeeTypeFilter !== "ALL" || departmentId !== undefined || search !== "") && (
            <button
              type="button"
              className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline transition-colors"
              onClick={() => {
                setStatusFilter("ALL")
                setEmployeeTypeFilter("ALL")
                setDepartmentId(undefined)
                setSearch("")
              }}
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <TeamGridSkeleton />
      ) : members.length === 0 ? (
        <EmptyState
          variant="users"
          title={
            statusFilter !== "ALL" || employeeTypeFilter !== "ALL" || departmentId !== undefined || search !== ""
              ? "No members match your filters"
              : "No team members yet"
          }
          description={
            statusFilter !== "ALL" || employeeTypeFilter !== "ALL" || departmentId !== undefined || search !== ""
              ? "Try adjusting the filters above."
              : "Add your first team member to get started."
          }
          action={
            statusFilter === "ALL" && employeeTypeFilter === "ALL" && departmentId === undefined && search === ""
              ? { label: "Add Member", onClick: () => setAddDialogOpen(true) }
              : undefined
          }
          secondaryAction={
            statusFilter !== "ALL" || employeeTypeFilter !== "ALL" || departmentId !== undefined || search !== ""
              ? {
                  label: "Clear filters",
                  onClick: () => {
                    setStatusFilter("ALL")
                    setEmployeeTypeFilter("ALL")
                    setDepartmentId(undefined)
                    setSearch("")
                  },
                }
              : undefined
          }
        />
      ) : (
        groupByDepartment ? (
          <DepartmentGroupedView
            members={members}
            departments={departments ?? []}
            onSelectMember={(id) => setSelectedMemberId(id)}
            bulkMode={bulkMode}
            selectedIds={selectedIds}
            onToggleSelect={(id) => {
              setSelectedIds((prev) => {
                const next = new Set(prev)
                if (next.has(id)) next.delete(id)
                else next.add(id)
                return next
              })
            }}
          />
        ) : (
          <div
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4"
            role="list"
            aria-label="Team members"
          >
            {members.map((member) => (
              <div key={member.id} role="listitem" className="relative">
                {bulkMode && (
                  <div className="absolute top-2 left-2 z-10">
                    <Checkbox
                      checked={selectedIds.has(member.id)}
                      onCheckedChange={() => {
                        setSelectedIds((prev) => {
                          const next = new Set(prev)
                          if (next.has(member.id)) next.delete(member.id)
                          else next.add(member.id)
                          return next
                        })
                      }}
                      aria-label={`Select ${member.name}`}
                    />
                  </div>
                )}
                <TeamMemberCard
                  member={member}
                  onClick={() => bulkMode
                    ? setSelectedIds((prev) => {
                        const next = new Set(prev)
                        if (next.has(member.id)) next.delete(member.id)
                        else next.add(member.id)
                        return next
                      })
                    : setSelectedMemberId(member.id)
                  }
                />
              </div>
            ))}
          </div>
        )
      )}

      {/* Load more */}
      {data?.hasMore && (
        <div className="flex justify-center pt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const lastMember = members[members.length - 1]
              if (lastMember) setCursor(lastMember.id)
            }}
          >
            Load more
          </Button>
        </div>
      )}

      {/* Bulk actions toolbar */}
      {selectedIds.size > 0 && (
        <div className="sticky bottom-4 z-10 mx-auto w-fit rounded-lg border border-border bg-card shadow-lg px-4 py-2 flex items-center gap-3">
          <span className="text-xs font-medium">{selectedIds.size} selected</span>
          <Separator orientation="vertical" className="h-5" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" className="text-xs h-7" disabled={bulkUpdating}>
                {bulkUpdating ? "Updating..." : "Change status"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {(["ACTIVE", "INACTIVE", "SUSPENDED"] as const).map((s) => (
                <DropdownMenuItem
                  key={s}
                  onClick={() => void handleBulkStatusChange(s)}
                >
                  {s.charAt(0) + s.slice(1).toLowerCase()}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            size="sm"
            variant="ghost"
            className="text-xs h-7"
            onClick={() => { setSelectedIds(new Set()); setBulkMode(false) }}
          >
            Cancel
          </Button>
        </div>
      )}

      {/* Sheet */}
      <TeamMemberSheet
        memberId={selectedMemberId}
        onClose={() => setSelectedMemberId(null)}
      />

      {/* Add member dialog */}
      <AddMemberDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSuccess={() => void utils.team.list.invalidate()}
      />
    </div>
  )
}
