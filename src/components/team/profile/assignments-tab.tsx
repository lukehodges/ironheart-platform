"use client"

import { useState } from "react"
import { format } from "date-fns"
import { api } from "@/lib/trpc/react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/ui/empty-state"
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"
import type { AssignmentStatus } from "@/shared/resource-pool/resource-pool.types"

const STATUS_OPTIONS: { value: AssignmentStatus | "ALL"; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "ASSIGNED", label: "Assigned" },
  { value: "ACTIVE", label: "Active" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
]

const statusVariant: Record<AssignmentStatus, "info" | "success" | "secondary" | "warning"> = {
  ASSIGNED: "info",
  ACTIVE: "success",
  COMPLETED: "secondary",
  CANCELLED: "warning",
}

const PAGE_SIZE = 20

export function AssignmentsTab({ memberId }: { memberId: string }) {
  const [statusFilter, setStatusFilter] = useState<AssignmentStatus | "ALL">("ALL")
  const [moduleFilter, setModuleFilter] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [cursor, setCursor] = useState<string | undefined>(undefined)

  const { data, isLoading } = api.team.listAssignments.useQuery({
    userId: memberId,
    status: statusFilter === "ALL" ? undefined : statusFilter,
    moduleSlug: moduleFilter || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    limit: PAGE_SIZE,
    cursor,
  })

  const assignments = data?.rows ?? []
  const hasMore = data?.hasMore ?? false

  function formatDate(date: Date | string | null): string {
    if (!date) return "—"
    try {
      return format(new Date(date), "d MMM yyyy")
    } catch {
      return "—"
    }
  }

  return (
    <div className="py-6 space-y-4">
      <h3 className="text-sm font-medium">Assignments</h3>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Status</Label>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v as AssignmentStatus | "ALL"); setCursor(undefined) }}>
            <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Module</Label>
          <Input className="h-8 w-32 text-xs" placeholder="e.g. bookings" value={moduleFilter} onChange={(e) => { setModuleFilter(e.target.value); setCursor(undefined) }} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">From</Label>
          <Input type="date" className="h-8 text-xs" value={startDate} onChange={(e) => { setStartDate(e.target.value); setCursor(undefined) }} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">To</Label>
          <Input type="date" className="h-8 text-xs" value={endDate} onChange={(e) => { setEndDate(e.target.value); setCursor(undefined) }} />
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : assignments.length === 0 ? (
        <EmptyState
          variant="documents"
          title="No assignments"
          description="No assignments match the current filters."
        />
      ) : (
        <>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Module</TableHead>
                  <TableHead className="text-xs">Type</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs">Date</TableHead>
                  <TableHead className="text-xs text-right">Weight</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignments.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="text-xs capitalize">{a.moduleSlug}</TableCell>
                    <TableCell className="text-xs capitalize">{a.resourceType}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[a.status as AssignmentStatus]} className="text-[10px]">
                        {a.status.toLowerCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs tabular-nums">{formatDate(a.scheduledDate)}</TableCell>
                    <TableCell className="text-xs text-right tabular-nums">{a.weight}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {assignments.length} result{assignments.length !== 1 ? "s" : ""}
              {hasMore ? "+" : ""}
            </span>
            {hasMore && (
              <Button
                size="sm"
                variant="outline"
                className="text-xs"
                onClick={() => {
                  const last = assignments[assignments.length - 1]
                  if (last) setCursor(last.id)
                }}
              >
                Load more
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  )
}
