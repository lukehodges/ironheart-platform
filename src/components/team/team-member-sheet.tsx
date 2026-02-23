"use client"

import { useState } from "react"
import { format } from "date-fns"
import { Mail, Phone, Calendar } from "lucide-react"
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

function CapacityTab({ memberId }: { memberId: string }) {
  const utils = api.useUtils()
  const today = new Date().toISOString().split("T")[0]!

  const { data: capacityData, isLoading } = api.team.getCapacity.useQuery({
    userId: memberId,
    capacityType: "bookings",
    date: today,
  })

  const [maxDaily, setMaxDaily] = useState<string>("")
  const [effectiveFrom, setEffectiveFrom] = useState(today)

  const setCapacityMutation = api.team.setCapacity.useMutation({
    onSuccess: () => {
      toast.success("Capacity updated")
      void utils.team.getCapacity.invalidate({ userId: memberId, capacityType: "bookings" })
    },
    onError: (err) => {
      toast.error(err.message ?? "Failed to update capacity")
    },
  })

  function saveCapacity() {
    const val = parseInt(maxDaily, 10)
    if (isNaN(val) || val < 1) {
      toast.error("Enter a valid number (minimum 1)")
      return
    }
    setCapacityMutation.mutate({
      userId: memberId,
      capacityType: "bookings",
      maxDaily: val,
      effectiveFrom,
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
      {/* Current capacity */}
      {capacityData && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Current capacity</h4>
          <div className="rounded-md border border-border px-3 py-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Type</span>
              <span className="text-xs">{capacityData.capacityType}</span>
            </div>
            {capacityData.maxDaily != null && (
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs text-muted-foreground">Max daily</span>
                <Badge variant="info" className="text-[10px]">
                  {capacityData.maxDaily}
                </Badge>
              </div>
            )}
          </div>
        </div>
      )}

      <Separator />

      {/* Set capacity */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium">Set capacity</h4>
        <div className="flex items-end gap-2">
          <div className="space-y-1 flex-1">
            <Label className="text-xs">Effective from</Label>
            <Input
              type="date"
              className="h-8 text-xs"
              value={effectiveFrom}
              onChange={(e) => setEffectiveFrom(e.target.value)}
            />
          </div>
          <div className="space-y-1 w-24">
            <Label className="text-xs">Max daily</Label>
            <Input
              type="number"
              min={1}
              className="h-8 text-xs"
              value={maxDaily}
              placeholder="e.g. 8"
              onChange={(e) => setMaxDaily(e.target.value)}
            />
          </div>
          <Button
            size="sm"
            onClick={saveCapacity}
            loading={setCapacityMutation.isPending}
          >
            Save
          </Button>
        </div>
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
          {bookings.length} booked
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
