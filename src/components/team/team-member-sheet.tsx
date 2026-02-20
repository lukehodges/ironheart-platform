"use client"

import { useState } from "react"
import { format } from "date-fns"
import { Mail, Phone, Calendar, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { api } from "@/lib/trpc/react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import { AvailabilityEditor } from "@/components/team/availability-editor"
import type { StaffStatus } from "@/modules/team/team.types"
import { cn } from "@/lib/utils"

interface TeamMemberSheetProps {
  memberId: string | null
  onClose: () => void
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

function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—"
  try {
    return format(new Date(date), "d MMM yyyy")
  } catch {
    return "—"
  }
}

// ─── Capacity tab ────────────────────────────────────────────────────────────

interface CapacityEntry {
  date: string
  maxBookings: number
}

function CapacityTab({ memberId }: { memberId: string }) {
  const utils = api.useUtils()
  const today = new Date().toISOString().split("T")[0]!

  const { data: capacityData, isLoading } = api.team.getCapacity.useQuery({
    userId: memberId,
    startDate: today,
  })

  const [defaultMax, setDefaultMax] = useState<string>("")
  const [overrides, setOverrides] = useState<CapacityEntry[]>([])
  const [newDate, setNewDate] = useState(today)
  const [newMax, setNewMax] = useState("8")

  const setCapacityMutation = api.team.setCapacity.useMutation({
    onSuccess: () => {
      toast.success("Capacity updated")
      void utils.team.getCapacity.invalidate({ userId: memberId })
    },
    onError: (err) => {
      toast.error(err.message ?? "Failed to update capacity")
    },
  })

  // TODO: team.update (permissionProcedure staff:write) handles defaultMaxDailyBookings
  // For now we call team.update mutation to persist the default max value
  const updateMutation = api.team.update.useMutation({
    onSuccess: () => {
      toast.success("Default capacity saved")
    },
    onError: (err) => {
      toast.error(err.message ?? "Failed to save default capacity")
    },
  })

  function saveDefaultMax() {
    const val = parseInt(defaultMax, 10)
    if (isNaN(val) || val < 1) {
      toast.error("Enter a valid number (minimum 1)")
      return
    }
    updateMutation.mutate({ id: memberId, defaultMaxDailyBookings: val })
  }

  function addOverride() {
    const val = parseInt(newMax, 10)
    if (!newDate || isNaN(val) || val < 1) {
      toast.error("Enter a valid date and booking count")
      return
    }
    const updated = [
      ...overrides.filter((o) => o.date !== newDate),
      { date: newDate, maxBookings: val },
    ].sort((a, b) => a.date.localeCompare(b.date))
    setOverrides(updated)
  }

  function removeOverride(date: string) {
    setOverrides((prev) => prev.filter((o) => o.date !== date))
  }

  function saveOverrides() {
    setCapacityMutation.mutate({
      userId: memberId,
      entries: overrides.map((o) => ({ date: o.date, maxBookings: o.maxBookings })),
    })
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Default max daily bookings */}
      <div className="space-y-2">
        <Label htmlFor="default-max-bookings" className="text-sm font-medium">
          Default max daily bookings
        </Label>
        <p className="text-xs text-muted-foreground">
          This applies on days without a specific override.
        </p>
        <div className="flex items-center gap-2">
          <Input
            id="default-max-bookings"
            type="number"
            min={1}
            max={100}
            className="w-24 h-8 text-sm"
            placeholder="e.g. 8"
            value={defaultMax}
            onChange={(e) => setDefaultMax(e.target.value)}
          />
          <Button
            size="sm"
            variant="outline"
            onClick={saveDefaultMax}
            loading={updateMutation.isPending}
          >
            Save
          </Button>
        </div>
      </div>

      <Separator />

      {/* Per-day overrides */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium">Per-day capacity overrides</h4>

        {/* Existing capacity entries from server */}
        {capacityData && capacityData.length > 0 && (
          <div className="space-y-1 mb-2">
            <p className="text-xs text-muted-foreground">Upcoming overrides from server:</p>
            {capacityData.map((entry) => (
              <div
                key={`${entry.userId}-${entry.date}`}
                className="flex items-center justify-between rounded-md border border-border px-3 py-1.5 text-sm"
              >
                <span className="text-xs">{entry.date}</span>
                <Badge variant="info" className="text-[10px]">
                  Max {entry.maxBookings}
                </Badge>
              </div>
            ))}
          </div>
        )}

        {/* Local overrides list */}
        {overrides.length > 0 && (
          <div className="space-y-1">
            {overrides.map((o) => (
              <div
                key={o.date}
                className="flex items-center justify-between rounded-md border border-border px-3 py-1.5"
              >
                <span className="text-xs">{o.date}</span>
                <div className="flex items-center gap-2">
                  <Badge variant="info" className="text-[10px]">
                    Max {o.maxBookings}
                  </Badge>
                  <button
                    type="button"
                    onClick={() => removeOverride(o.date)}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                    aria-label={`Remove override for ${o.date}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add override row */}
        <div className="flex items-end gap-2">
          <div className="space-y-1 flex-1">
            <Label className="text-xs">Date</Label>
            <Input
              type="date"
              className="h-8 text-xs"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
            />
          </div>
          <div className="space-y-1 w-24">
            <Label className="text-xs">Max bookings</Label>
            <Input
              type="number"
              min={1}
              className="h-8 text-xs"
              value={newMax}
              onChange={(e) => setNewMax(e.target.value)}
            />
          </div>
          <Button size="sm" variant="outline" onClick={addOverride}>
            <Plus className="h-3.5 w-3.5" />
            Add
          </Button>
        </div>

        {overrides.length > 0 && (
          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={saveOverrides}
              loading={setCapacityMutation.isPending}
            >
              Save overrides
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Bookings tab ─────────────────────────────────────────────────────────────

function BookingsTab({ memberId }: { memberId: string }) {
  const today = new Date().toISOString().split("T")[0]!

  const { data: schedule, isLoading } = api.team.getSchedule.useQuery({
    userId: memberId,
    date: today,
  })

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-8 w-16 rounded-md" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  const bookings = schedule?.assignedBookings ?? []
  const slots = schedule?.availableSlots ?? []

  if (!schedule || (bookings.length === 0 && slots.length === 0)) {
    return (
      <div className="py-8 text-center">
        <Calendar className="h-8 w-8 text-muted-foreground mx-auto mb-2" aria-hidden="true" />
        <p className="text-sm text-muted-foreground">No bookings today</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-muted-foreground">
          Today — {format(new Date(), "EEEE, d MMM")}
        </p>
        <Badge variant="info" className="text-[10px]">
          {bookings.length} booked / {schedule.capacity} capacity
        </Badge>
      </div>

      {/* Assigned bookings */}
      {bookings.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Bookings</p>
          {bookings.map((booking) => (
            <div
              key={booking.id}
              className="flex items-center gap-3 rounded-md border border-border px-3 py-2"
            >
              <div className="text-xs font-mono text-muted-foreground w-16 shrink-0">
                {booking.scheduledTime}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-foreground truncate capitalize">
                  {booking.status.toLowerCase().replace("_", " ")}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {booking.durationMinutes}min
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Available slots */}
      {slots.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Available slots</p>
          {slots.map((slot, i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-md border border-border bg-success/5 px-3 py-2"
            >
              <div className="text-xs font-mono text-muted-foreground w-16 shrink-0">
                {slot.startTime}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-success">Open</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main sheet component ─────────────────────────────────────────────────────

export function TeamMemberSheet({ memberId, onClose }: TeamMemberSheetProps) {
  const utils = api.useUtils()

  const { data: member, isLoading } = api.team.getById.useQuery(
    { userId: memberId! },
    { enabled: !!memberId }
  )

  const updateMutation = api.team.update.useMutation({
    onSuccess: () => {
      toast.success("Status updated")
      void utils.team.getById.invalidate({ userId: memberId! })
      void utils.team.list.invalidate()
    },
    onError: (err) => {
      toast.error(err.message ?? "Failed to update status")
    },
  })

  function handleStatusChange(status: StaffStatus) {
    if (!memberId) return
    updateMutation.mutate({ id: memberId, status })
  }

  const isOpen = !!memberId

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-xl flex flex-col gap-0 p-0 overflow-hidden"
        aria-label="Team member details"
      >
        {isLoading || !member ? (
          <div className="p-6 space-y-4">
            <SheetHeader>
              <SheetTitle className="sr-only">Loading member</SheetTitle>
              <SheetDescription className="sr-only">Loading team member details</SheetDescription>
            </SheetHeader>
            <div className="flex items-center gap-4">
              <Skeleton className="h-20 w-20 rounded-full" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-40" />
              </div>
            </div>
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : (
          <>
            {/* Profile header */}
            <div className="p-6 border-b border-border shrink-0">
              <SheetHeader className="mb-4">
                <SheetTitle className="sr-only">{member.name}</SheetTitle>
                <SheetDescription className="sr-only">
                  Staff profile for {member.name}
                </SheetDescription>
              </SheetHeader>

              <div className="flex items-start gap-4">
                <Avatar className="h-20 w-20 text-xl shrink-0">
                  {member.avatarUrl && (
                    <AvatarImage src={member.avatarUrl} alt={`${member.name} avatar`} />
                  )}
                  <AvatarFallback className="text-base font-medium">
                    {getInitials(member.name)}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0 space-y-2">
                  <div>
                    <h2 className="text-base font-semibold text-foreground truncate">
                      {member.name}
                    </h2>
                    {member.employeeType && (
                      <p className="text-xs text-muted-foreground capitalize">
                        {member.employeeType.replace("_", " ").toLowerCase()}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1">
                    {member.email && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        <span className="truncate">{member.email}</span>
                      </div>
                    )}
                    {member.phone && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Phone className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        <span>{member.phone}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      <span>Joined {formatDate(member.createdAt)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Status row */}
              <div className="flex items-center gap-3 mt-4">
                <Badge
                  variant={statusConfig[member.status].variant}
                  className="text-xs"
                >
                  {statusConfig[member.status].label}
                </Badge>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      aria-label="Change status"
                    >
                      Change status
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuLabel>Set status</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => handleStatusChange("ACTIVE")}
                      className={cn(
                        member.status === "ACTIVE" && "bg-accent text-accent-foreground"
                      )}
                    >
                      Active
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleStatusChange("INACTIVE")}
                      className={cn(
                        member.status === "INACTIVE" && "bg-accent text-accent-foreground"
                      )}
                    >
                      Inactive
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleStatusChange("SUSPENDED")}
                      className={cn(
                        member.status === "SUSPENDED" && "bg-accent text-accent-foreground"
                      )}
                    >
                      Suspended
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex-1 overflow-y-auto">
              <Tabs defaultValue="availability" className="h-full flex flex-col">
                <div className="px-6 pt-4 shrink-0">
                  <TabsList className="w-full">
                    <TabsTrigger value="availability" className="flex-1">
                      Availability
                    </TabsTrigger>
                    <TabsTrigger value="capacity" className="flex-1">
                      Capacity
                    </TabsTrigger>
                    <TabsTrigger value="bookings" className="flex-1">
                      Bookings
                    </TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="availability" className="flex-1 px-6 py-4">
                  <AvailabilityEditor memberId={member.id} />
                </TabsContent>

                <TabsContent value="capacity" className="flex-1 px-6 py-4">
                  <CapacityTab memberId={member.id} />
                </TabsContent>

                <TabsContent value="bookings" className="flex-1 px-6 py-4">
                  <BookingsTab memberId={member.id} />
                </TabsContent>
              </Tabs>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
