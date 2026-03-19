"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import {
  UserPlus,
  Network,
  Search,
  List,
  LayoutGrid,
  Users,
  TrendingUp,
  Building2,
  Activity,
  ChevronRight,
} from "lucide-react"
import { api } from "@/lib/trpc/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { TeamMemberSheet } from "@/components/team/team-member-sheet"
import { AddMemberDialog } from "@/components/team/add-member-dialog"
import { KpiCard } from "@/components/team/kpi-card"
import { TeamSidebar } from "@/components/team/team-sidebar"
import { TeamTable } from "@/components/team/team-table"
import { TeamGridCard } from "@/components/team/team-grid-card"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import type { StaffStatus, EmployeeType } from "@/modules/team/team.types"

// ─── Types ───────────────────────────────────────────────────────────────────

type StatusFilter = "ALL" | StaffStatus
type ViewMode = "table" | "grid"

const STATUS_FILTERS: Array<{ value: StatusFilter; label: string }> = [
  { value: "ALL", label: "All" },
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
  { value: "SUSPENDED", label: "Suspended" },
]

// ─── localStorage helpers ────────────────────────────────────────────────────

function getStoredView(): ViewMode {
  if (typeof window === "undefined") return "table"
  return (localStorage.getItem("team-view-mode") as ViewMode) ?? "table"
}

function getStoredSidebar(): boolean {
  if (typeof window === "undefined") return true
  const stored = localStorage.getItem("team-sidebar-open")
  return stored === null ? true : stored === "true"
}

// ─── Loading skeleton ────────────────────────────────────────────────────────

function KpiSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-zinc-200 p-5 space-y-3">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-3 w-28" />
        </div>
      ))}
    </div>
  )
}

function TableSkeleton() {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
      <div className="p-4 space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="space-y-1.5 flex-1">
              <Skeleton className="h-3.5 w-32" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-3 w-20" />
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function TeamPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // ─── Filter state from URL params ──────────────────────────────────────────
  const statusFilter = (searchParams.get("status")?.toUpperCase() as StatusFilter) ?? "ALL"
  const deptFilter = searchParams.get("dept") ?? null
  const employeeTypeFilter = (searchParams.get("type")?.toUpperCase() as EmployeeType) ?? null
  const searchParam = searchParams.get("search") ?? ""

  const [search, setSearch] = useState(searchParam)
  const [debouncedSearch, setDebouncedSearch] = useState(searchParam)

  // ─── UI state (localStorage) ───────────────────────────────────────────────
  const [viewMode, setViewMode] = useState<ViewMode>(getStoredView)
  const [sidebarOpen, setSidebarOpen] = useState(getStoredSidebar)

  // ─── Other state ───────────────────────────────────────────────────────────
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkMode, setBulkMode] = useState(false)
  const [bulkUpdating, setBulkUpdating] = useState(false)
  const [cursor, setCursor] = useState<string | undefined>(undefined)

  // ─── URL param helpers ─────────────────────────────────────────────────────
  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString())
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "" || value === "ALL") {
          params.delete(key)
        } else {
          params.set(key, value.toLowerCase())
        }
      }
      const qs = params.toString()
      router.replace(qs ? `?${qs}` : "/admin/team", { scroll: false })
      setCursor(undefined)
    },
    [searchParams, router]
  )

  // ─── Debounced search → URL sync ──────────────────────────────────────────
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      if (search !== searchParam) {
        updateParams({ search: search || null })
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [search, searchParam, updateParams])

  // ─── Persist view/sidebar prefs ────────────────────────────────────────────
  useEffect(() => { localStorage.setItem("team-view-mode", viewMode) }, [viewMode])
  useEffect(() => { localStorage.setItem("team-sidebar-open", String(sidebarOpen)) }, [sidebarOpen])

  // ─── Data fetching ─────────────────────────────────────────────────────────
  const { data: stats, isLoading: statsLoading } = api.team.stats.useQuery(undefined, {
    staleTime: 60_000,
  })

  const { data, isLoading } = api.team.list.useQuery({
    limit: 25,
    search: debouncedSearch || undefined,
    departmentId: deptFilter ?? undefined,
    status: statusFilter === "ALL" ? undefined : statusFilter,
    employeeType: employeeTypeFilter ?? undefined,
    cursor,
  })

  const members = data?.rows ?? []

  const { data: departments } = api.team.departments.list.useQuery(undefined, {
    staleTime: 60_000,
  })

  const utils = api.useUtils()

  // ─── Build department color map ────────────────────────────────────────────
  const deptColorMap = useMemo(() => {
    const map = new Map<string, string>()
    if (!departments) return map
    function walk(list: typeof departments) {
      for (const d of list!) {
        if (d.color) map.set(d.name, d.color)
        if (d.children?.length) walk(d.children)
      }
    }
    walk(departments)
    return map
  }, [departments])

  // Flatten departments for sidebar
  const sidebarDepts = useMemo(() => {
    if (!departments) return []
    const result: Array<{ id: string; name: string; color: string | null; memberCount: number }> = []
    function walk(list: typeof departments) {
      for (const d of list!) {
        result.push({ id: d.id, name: d.name, color: d.color ?? null, memberCount: d.memberCount ?? 0 })
        if (d.children?.length) walk(d.children)
      }
    }
    walk(departments)
    return result
  }, [departments])

  // ─── Bulk actions ──────────────────────────────────────────────────────────
  const bulkUpdateMutation = api.team.update.useMutation({
    onError: (err) => toast.error(err.message ?? "Failed to update"),
  })

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
      void utils.team.stats.invalidate()
    } catch {
      // onError handler shows toast
    } finally {
      setBulkUpdating(false)
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────
  const hasFilters = statusFilter !== "ALL" || deptFilter !== null || employeeTypeFilter !== null || search !== ""

  function clearFilters() {
    setSearch("")
    router.replace("/admin/team", { scroll: false })
    setCursor(undefined)
  }

  function getDeptColor(memberName: string): string {
    return deptColorMap.get(memberName) ?? "#a1a1aa"
  }

  function getMemberDeptColor(member: typeof members[0]): string {
    const deptName = member.departments?.find((d) => d.isPrimary)?.departmentName
      ?? member.departments?.[0]?.departmentName
    return deptName ? getDeptColor(deptName) : "#a1a1aa"
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <TooltipProvider>
      <div className="space-y-6 animate-fade-in">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-xs text-zinc-400">
          <span>Admin</span>
          <ChevronRight className="h-3 w-3" />
          <span className="text-zinc-600 font-medium">People</span>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900">People</h1>
            <p className="mt-0.5 text-sm text-zinc-500">
              Manage staff capacity, availability, and department structure.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin/team/departments">
                <Network className="h-4 w-4" />
                Departments
              </Link>
            </Button>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  className="gap-2 bg-zinc-900 text-white hover:bg-zinc-700"
                  onClick={() => setAddDialogOpen(true)}
                >
                  <UserPlus className="h-4 w-4" />
                  Invite Member
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                Add a new team member
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* KPI cards */}
        {statsLoading ? (
          <KpiSkeleton />
        ) : stats ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <KpiCard
              label="Total Members"
              value={String(stats.total)}
              sub={`Across ${stats.departmentCount} departments`}
              icon={Users}
            />
            <KpiCard
              label="Active Rate"
              value={stats.total > 0 ? `${Math.round((stats.activeCount / stats.total) * 100)}%` : "0%"}
              sub={`${stats.activeCount} active`}
              icon={TrendingUp}
            />
            <KpiCard
              label="Departments"
              value={String(stats.departmentCount)}
              icon={Building2}
            />
            <KpiCard
              label="Avg Capacity"
              value={stats.avgCapacityMax > 0 ? String(stats.avgCapacityUsed) : "\u2014"}
              sub={stats.avgCapacityMax > 0 ? `Out of ${stats.avgCapacityMax} max` : "No capacity data"}
              icon={Activity}
            />
          </div>
        ) : null}

        {/* Body: sidebar + main */}
        <div className="flex items-start gap-5">
          {/* Sidebar */}
          <TeamSidebar
            departments={sidebarDepts}
            totalMembers={stats?.total ?? 0}
            deptFilter={deptFilter}
            onDeptFilter={(id) => updateParams({ dept: id })}
            employeeTypeFilter={employeeTypeFilter}
            onEmployeeTypeFilter={(type) => updateParams({ type: type })}
            isOpen={sidebarOpen}
            onToggle={() => setSidebarOpen(!sidebarOpen)}
          />

          {/* Main content */}
          <div className="flex-1 min-w-0 space-y-3">
            {/* Search + view toggle */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
                <Input
                  placeholder="Search by name, title, skill..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-9 text-sm border-zinc-200 bg-white placeholder:text-zinc-400"
                />
              </div>
              {/* View toggle */}
              <div className="flex items-center rounded-lg border border-zinc-200 bg-white p-0.5 gap-0.5">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => setViewMode("table")}
                      className={cn(
                        "h-7 w-7 flex items-center justify-center rounded-md transition-colors",
                        viewMode === "table" ? "bg-zinc-900 text-white" : "text-zinc-400 hover:text-zinc-700"
                      )}
                    >
                      <List className="h-3.5 w-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">Table view</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => setViewMode("grid")}
                      className={cn(
                        "h-7 w-7 flex items-center justify-center rounded-md transition-colors",
                        viewMode === "grid" ? "bg-zinc-900 text-white" : "text-zinc-400 hover:text-zinc-700"
                      )}
                    >
                      <LayoutGrid className="h-3.5 w-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">Grid view</TooltipContent>
                </Tooltip>
              </div>
              {/* Bulk select toggle */}
              <Button
                size="sm"
                variant={bulkMode ? "secondary" : "outline"}
                className="text-xs h-9"
                onClick={() => { setBulkMode(!bulkMode); setSelectedIds(new Set()) }}
              >
                {bulkMode ? "Cancel" : "Select"}
              </Button>
            </div>

            {/* Status filter chips */}
            <div className="flex items-center gap-1.5">
              {STATUS_FILTERS.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => updateParams({ status: f.value })}
                  className={cn(
                    "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                    statusFilter === f.value
                      ? "border-zinc-900 bg-zinc-900 text-white"
                      : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
                  )}
                >
                  {f.label}
                </button>
              ))}
              {hasFilters && (
                <>
                  <Separator orientation="vertical" className="h-4 mx-1" />
                  <button
                    type="button"
                    className="text-xs text-zinc-400 hover:text-zinc-700 transition-colors"
                    onClick={clearFilters}
                  >
                    Clear filters
                  </button>
                </>
              )}
              <span className="ml-auto font-mono text-xs text-zinc-400 tabular-nums">
                {members.length} member{members.length !== 1 ? "s" : ""}
                {data?.hasMore ? "+" : ""}
              </span>
            </div>

            {/* Content */}
            {isLoading ? (
              <TableSkeleton />
            ) : viewMode === "table" ? (
              <TeamTable
                members={members}
                departmentColors={deptColorMap}
                onNavigate={(id) => router.push(`/admin/team/${id}`)}
                onQuickView={(id) => setSelectedMemberId(id)}
                bulkMode={bulkMode}
                selectedIds={selectedIds}
                onToggleSelect={toggleSelect}
              />
            ) : (
              members.length === 0 ? (
                <div className="flex h-24 items-center justify-center rounded-xl border border-zinc-200 bg-white">
                  <p className="text-sm text-zinc-400">No members match your filters.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {members.map((member) => (
                    <div key={member.id} className="relative">
                      {bulkMode && (
                        <div className="absolute top-2 left-2 z-10">
                          <Checkbox
                            checked={selectedIds.has(member.id)}
                            onCheckedChange={() => toggleSelect(member.id)}
                            aria-label={`Select ${member.name}`}
                          />
                        </div>
                      )}
                      <TeamGridCard
                        member={member}
                        deptColor={getMemberDeptColor(member)}
                        onNavigate={(id) => bulkMode ? toggleSelect(id) : router.push(`/admin/team/${id}`)}
                        onQuickView={(id) => setSelectedMemberId(id)}
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
          </div>
        </div>

        {/* Bulk actions toolbar */}
        {selectedIds.size > 0 && (
          <div className="sticky bottom-4 z-10 mx-auto w-fit rounded-lg border border-zinc-200 bg-white shadow-lg px-4 py-2 flex items-center gap-3">
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
          onSuccess={() => { void utils.team.list.invalidate(); void utils.team.stats.invalidate() }}
        />
      </div>
    </TooltipProvider>
  )
}
