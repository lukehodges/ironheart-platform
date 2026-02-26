"use client"

import { useState } from "react"
import { UserPlus } from "lucide-react"
import { api } from "@/lib/trpc/react"
import { PageHeader } from "@/components/ui/page-header"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/ui/empty-state"
import { TeamMemberCard } from "@/components/team/team-member-card"
import { TeamMemberSheet } from "@/components/team/team-member-sheet"
import { AddMemberDialog } from "@/components/team/add-member-dialog"
import { cn } from "@/lib/utils"
import type { StaffStatus } from "@/modules/team/team.types"

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

// ─── Main page ────────────────────────────────────────────────────────────────

export default function TeamPage() {
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL")
  const [employeeTypeFilter, setEmployeeTypeFilter] = useState<EmployeeTypeFilter>("ALL")

  const { data, isLoading, refetch } = api.team.list.useQuery({
    limit: 100,
    status: statusFilter === "ALL" ? undefined : statusFilter,
    employeeType: employeeTypeFilter === "ALL" ? undefined : employeeTypeFilter,
  })

  const members = data?.rows ?? []

  // Active members for the availability bar
  const activeMembers = members.filter((m) => m.status === "ACTIVE")

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
      </div>

      {/* Results count */}
      {!isLoading && (
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            {members.length} member{members.length !== 1 ? "s" : ""}
          </Badge>
          {(statusFilter !== "ALL" || employeeTypeFilter !== "ALL") && (
            <button
              type="button"
              className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline transition-colors"
              onClick={() => {
                setStatusFilter("ALL")
                setEmployeeTypeFilter("ALL")
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
            statusFilter !== "ALL" || employeeTypeFilter !== "ALL"
              ? "No members match your filters"
              : "No team members yet"
          }
          description={
            statusFilter !== "ALL" || employeeTypeFilter !== "ALL"
              ? "Try adjusting the filters above."
              : "Add your first team member to get started."
          }
          action={
            statusFilter === "ALL" && employeeTypeFilter === "ALL"
              ? { label: "Add Member", onClick: () => setAddDialogOpen(true) }
              : undefined
          }
          secondaryAction={
            statusFilter !== "ALL" || employeeTypeFilter !== "ALL"
              ? {
                  label: "Clear filters",
                  onClick: () => {
                    setStatusFilter("ALL")
                    setEmployeeTypeFilter("ALL")
                  },
                }
              : undefined
          }
        />
      ) : (
        <div
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4"
          role="list"
          aria-label="Team members"
        >
          {members.map((member) => (
            <div key={member.id} role="listitem">
              <TeamMemberCard
                member={member}
                onClick={() => setSelectedMemberId(member.id)}
              />
            </div>
          ))}
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
        onSuccess={() => void refetch()}
      />
    </div>
  )
}
