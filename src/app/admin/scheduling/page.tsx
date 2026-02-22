"use client"

import { useState, useCallback, useMemo } from "react"
import { toast } from "sonner"
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  Clock,
  Trash2,
  AlertTriangle,
  RefreshCw,
} from "lucide-react"
import { api } from "@/lib/trpc/react"
import { PageHeader } from "@/components/ui/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/ui/empty-state"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Get Monday of the week containing `date`. */
function getMonday(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  // Sunday = 0, Monday = 1, etc.
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

/** Return array of 7 dates starting from `monday`. */
function getWeekDays(monday: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

/** Format a Date as YYYY-MM-DD (local). */
function toDateString(d: Date): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

/** Check if two dates represent the same calendar day. */
function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

const dayFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
})

const weekRangeFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
})

const STATUS_VARIANT_MAP: Record<string, "default" | "secondary" | "success" | "destructive" | "outline" | "warning"> = {
  AVAILABLE: "success",
  BOOKED: "default",
  BLOCKED: "secondary",
  CANCELLED: "destructive",
  PENDING: "warning",
}

function getStatusVariant(status: string) {
  return STATUS_VARIANT_MAP[status] ?? "outline"
}

// ---------------------------------------------------------------------------
// Slot type
// ---------------------------------------------------------------------------

interface Slot {
  id: string
  staffIds: string[] | null
  date: string | Date
  time: string
  endTime: string | null
  available: boolean
  venueId?: string | null
  serviceIds?: string[] | null
  capacity: number
  bookedCount: number
  metadata?: unknown
}

interface SchedulingAlert {
  id?: string
  type: string
  message: string
  date?: string | Date
  severity?: string
}

// ---------------------------------------------------------------------------
// Loading skeleton for the week grid
// ---------------------------------------------------------------------------

function WeekGridSkeleton() {
  return (
    <div className="grid grid-cols-7 gap-2">
      {Array.from({ length: 7 }).map((_, dayIdx) => (
        <div key={dayIdx} className="space-y-2">
          <Skeleton className="h-8 w-full rounded-md" />
          {Array.from({ length: 3 }).map((_, slotIdx) => (
            <Skeleton key={slotIdx} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Slot card
// ---------------------------------------------------------------------------

interface SlotCardProps {
  slot: Slot
  onDelete: (id: string) => void
  isDeleting: boolean
}

function SlotCard({ slot, onDelete, isDeleting }: SlotCardProps) {
  const status = slot.available ? (slot.bookedCount > 0 ? "BOOKED" : "AVAILABLE") : "BLOCKED"

  return (
    <div className="rounded-lg border border-border bg-card p-2.5 space-y-1.5 group relative">
      {/* Time */}
      <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
        <Clock className="h-3 w-3 text-muted-foreground shrink-0" aria-hidden="true" />
        <span className="tabular-nums">
          {slot.time} &ndash; {slot.endTime ?? "—"}
        </span>
      </div>

      {/* Staff count */}
      {slot.staffIds && slot.staffIds.length > 0 && (
        <p className="text-xs text-muted-foreground truncate">
          {slot.staffIds.length} staff assigned
        </p>
      )}

      {/* Status badge */}
      <Badge variant={getStatusVariant(status)} className="text-[10px]">
        {status}
      </Badge>

      {/* Delete button — visible on hover */}
      <button
        type="button"
        onClick={() => onDelete(slot.id)}
        disabled={isDeleting}
        className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive disabled:opacity-50"
        aria-label={`Delete slot at ${slot.time}`}
      >
        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Alerts panel
// ---------------------------------------------------------------------------

function AlertsPanel({ alerts }: { alerts: SchedulingAlert[] }) {
  if (alerts.length === 0) return null

  return (
    <div className="rounded-lg border border-warning/30 bg-warning/5 p-3 space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium text-warning">
        <AlertTriangle className="h-4 w-4" aria-hidden="true" />
        Scheduling Alerts
      </div>
      <ul className="space-y-1">
        {alerts.map((alert, idx) => (
          <li
            key={alert.id ?? idx}
            className="text-xs text-muted-foreground flex items-start gap-1.5"
          >
            <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-warning shrink-0" />
            {alert.message}
          </li>
        ))}
      </ul>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Create slot dialog
// ---------------------------------------------------------------------------

interface CreateSlotDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultDate: string
  staffMembers: Array<{ id: string; name: string }>
  onSuccess: () => void
}

function CreateSlotDialog({
  open,
  onOpenChange,
  defaultDate,
  staffMembers,
  onSuccess,
}: CreateSlotDialogProps) {
  const [userId, setUserId] = useState("")
  const [date, setDate] = useState(defaultDate)
  const [startTime, setStartTime] = useState("09:00")
  const [endTime, setEndTime] = useState("17:00")
  const [notes, setNotes] = useState("")

  const createSlot = api.scheduling.createSlot.useMutation({
    onSuccess: () => {
      toast.success("Slot created successfully")
      onSuccess()
      resetForm()
      onOpenChange(false)
    },
    onError: (err) => {
      toast.error(err.message ?? "Failed to create slot")
    },
  })

  function resetForm() {
    setUserId("")
    setDate(defaultDate)
    setStartTime("09:00")
    setEndTime("17:00")
    setNotes("")
  }

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      if (!userId) {
        toast.error("Please select a staff member")
        return
      }
      if (!date) {
        toast.error("Please select a date")
        return
      }
      if (!startTime || !endTime) {
        toast.error("Please enter start and end times")
        return
      }
      createSlot.mutate({
        staffIds: [userId],
        serviceIds: [],
        date: new Date(date),
        time: startTime,
        endTime,
      })
    },
    [userId, date, startTime, endTime, notes, createSlot],
  )

  // Sync default date when dialog opens
  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (nextOpen) {
        setDate(defaultDate)
      }
      onOpenChange(nextOpen)
    },
    [defaultDate, onOpenChange],
  )

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Slot</DialogTitle>
          <DialogDescription>
            Create a new schedule slot for a staff member.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Staff select */}
          <div className="space-y-2">
            <Label htmlFor="slot-staff">Staff Member</Label>
            <Select value={userId} onValueChange={setUserId}>
              <SelectTrigger id="slot-staff" aria-label="Select staff member">
                <SelectValue placeholder="Select staff..." />
              </SelectTrigger>
              <SelectContent>
                {staffMembers.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label htmlFor="slot-date">Date</Label>
            <Input
              id="slot-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          {/* Time range */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="slot-start">Start Time</Label>
              <Input
                id="slot-start"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slot-end">End Time</Label>
              <Input
                id="slot-end"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="slot-notes">Notes (optional)</Label>
            <Input
              id="slot-notes"
              type="text"
              placeholder="e.g. Morning shift"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createSlot.isPending}>
              {createSlot.isPending ? "Creating..." : "Create Slot"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function SchedulingPage() {
  const utils = api.useUtils()

  // Week navigation — start from Monday of current week
  const [weekStart, setWeekStart] = useState<Date>(() => getMonday(new Date()))

  // Staff filter
  const [staffFilter, setStaffFilter] = useState<string>("ALL")

  // Create dialog
  const [createDialogOpen, setCreateDialogOpen] = useState(false)

  // Derived week data
  const weekDays = useMemo(() => getWeekDays(weekStart), [weekStart])
  const weekEnd = weekDays[6]!

  // Navigation handlers
  const goToPrevWeek = useCallback(() => {
    setWeekStart((prev) => {
      const d = new Date(prev)
      d.setDate(d.getDate() - 7)
      return d
    })
  }, [])

  const goToNextWeek = useCallback(() => {
    setWeekStart((prev) => {
      const d = new Date(prev)
      d.setDate(d.getDate() + 7)
      return d
    })
  }, [])

  const goToThisWeek = useCallback(() => {
    setWeekStart(getMonday(new Date()))
  }, [])

  // Fetch staff list for filter + create dialog
  const { data: teamData } = api.team.list.useQuery({ limit: 100 })
  const staffMembers = useMemo(() => {
    const rows = teamData?.rows ?? []
    return rows.map((m: { id: string; name: string }) => ({
      id: m.id,
      name: m.name,
    }))
  }, [teamData])

  // Fetch slots for the selected week
  const {
    data: slotsData,
    isLoading: slotsLoading,
    isError: slotsError,
    refetch: refetchSlots,
  } = api.scheduling.listSlots.useQuery({
    startDate: weekStart,
    endDate: weekEnd,
    staffId: staffFilter === "ALL" ? undefined : staffFilter,
  })

  const allSlots = (slotsData ?? []) as Slot[]

  // Fetch alerts for the week
  const { data: alertsData } = api.scheduling.getAlerts.useQuery({
    date: weekStart,
  })

  const alerts = (alertsData ?? []) as SchedulingAlert[]

  // Group slots by day
  const slotsByDay = useMemo(() => {
    const map = new Map<string, Slot[]>()
    for (const day of weekDays) {
      map.set(toDateString(day), [])
    }
    for (const slot of allSlots) {
      const slotDate =
        typeof slot.date === "string" ? slot.date.slice(0, 10) : toDateString(new Date(slot.date))
      const existing = map.get(slotDate)
      if (existing) {
        existing.push(slot)
      }
    }
    // Sort each day by startTime
    for (const [, daySlots] of map) {
      daySlots.sort((a, b) => a.time.localeCompare(b.time))
    }
    return map
  }, [allSlots, weekDays])

  // Total slot count for the week
  const totalSlots = allSlots.length

  // Delete mutation
  const deleteSlot = api.scheduling.deleteSlot.useMutation({
    onSuccess: () => {
      toast.success("Slot deleted")
      void utils.scheduling.listSlots.invalidate()
    },
    onError: (err) => {
      toast.error(err.message ?? "Failed to delete slot")
    },
  })

  const handleDeleteSlot = useCallback(
    (id: string) => {
      deleteSlot.mutate({ id })
    },
    [deleteSlot],
  )

  const handleCreateSuccess = useCallback(() => {
    void utils.scheduling.listSlots.invalidate()
  }, [utils])

  // Check if the current week contains today
  const today = new Date()
  const isCurrentWeek = weekDays.some((d) => isSameDay(d, today))

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page header */}
      <PageHeader
        title="Scheduling"
        description="Manage staff schedules and availability."
      >
        <Button
          size="sm"
          onClick={() => setCreateDialogOpen(true)}
          aria-label="Create a new slot"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          New Slot
        </Button>
      </PageHeader>

      {/* Week navigation + staff filter */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Week nav */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon-sm"
            onClick={goToPrevWeek}
            aria-label="Previous week"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </Button>

          <span className="text-sm font-medium text-foreground min-w-[200px] text-center">
            {weekRangeFormat.format(weekStart)} &ndash;{" "}
            {weekRangeFormat.format(weekEnd)}
          </span>

          <Button
            variant="outline"
            size="icon-sm"
            onClick={goToNextWeek}
            aria-label="Next week"
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Button>

          {!isCurrentWeek && (
            <Button
              variant="outline"
              size="sm"
              onClick={goToThisWeek}
              className="text-xs"
            >
              Today
            </Button>
          )}
        </div>

        {/* Staff filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Staff:</span>
          <Select value={staffFilter} onValueChange={setStaffFilter}>
            <SelectTrigger
              className="h-8 w-[180px] text-xs"
              aria-label="Filter by staff member"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Staff</SelectItem>
              {staffMembers.map((member: { id: string; name: string }) => (
                <SelectItem key={member.id} value={member.id}>
                  {member.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Alerts panel */}
      <AlertsPanel alerts={alerts} />

      {/* Week summary */}
      {!slotsLoading && !slotsError && (
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            {totalSlots} slot{totalSlots !== 1 ? "s" : ""} this week
          </Badge>
        </div>
      )}

      {/* Week grid */}
      {slotsError ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 rounded-xl border border-border">
          <p className="text-sm text-destructive font-medium">
            Failed to load schedule
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => void refetchSlots()}
            className="gap-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            Retry
          </Button>
        </div>
      ) : slotsLoading ? (
        <WeekGridSkeleton />
      ) : totalSlots === 0 ? (
        <EmptyState
          variant="calendar"
          title="No slots this week"
          description="There are no schedule slots for this week. Create one to get started."
          action={{
            label: "New Slot",
            onClick: () => setCreateDialogOpen(true),
          }}
        />
      ) : (
        <div className="grid grid-cols-7 gap-2" role="grid" aria-label="Weekly schedule">
          {weekDays.map((day, idx) => {
            const dateKey = toDateString(day)
            const daySlots = slotsByDay.get(dateKey) ?? []
            const isToday = isSameDay(day, today)

            return (
              <div key={dateKey} role="gridcell" className="min-w-0">
                {/* Day header */}
                <div
                  className={[
                    "rounded-md px-2 py-1.5 mb-2 text-center border",
                    isToday
                      ? "bg-primary/10 border-primary/30 text-primary"
                      : "bg-muted/50 border-border text-muted-foreground",
                  ].join(" ")}
                >
                  <div className="text-[11px] font-semibold uppercase tracking-wide">
                    {DAY_NAMES[idx]}
                  </div>
                  <div className={[
                    "text-xs",
                    isToday ? "font-bold" : "font-medium",
                  ].join(" ")}>
                    {dayFormat.format(day)}
                  </div>
                </div>

                {/* Slots */}
                {daySlots.length === 0 ? (
                  <div className="flex items-center justify-center py-6 text-[11px] text-muted-foreground">
                    No slots
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {daySlots.map((slot) => (
                      <SlotCard
                        key={slot.id}
                        slot={slot}
                        onDelete={handleDeleteSlot}
                        isDeleting={deleteSlot.isPending}
                      />
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Create slot dialog */}
      <CreateSlotDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        defaultDate={toDateString(weekStart)}
        staffMembers={staffMembers}
        onSuccess={handleCreateSuccess}
      />
    </div>
  )
}
