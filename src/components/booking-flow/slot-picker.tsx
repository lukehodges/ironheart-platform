"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Calendar as CalendarIcon, Clock, Loader2, User } from "lucide-react"
import { format, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval, isBefore, startOfDay } from "date-fns"
import type { AvailableSlot } from "@/types/booking-flow"

interface SlotPickerProps {
  serviceId: string
  onSelect: (slot: AvailableSlot) => void
  getAvailableSlots: (serviceId: string, date: Date) => Promise<AvailableSlot[]>
  getAvailableDates?: (serviceId: string, month: Date) => Promise<Date[]>
  className?: string
}

export default function SlotPicker({
  serviceId,
  onSelect,
  getAvailableSlots,
  getAvailableDates,
  className,
}: SlotPickerProps) {
  const [currentMonth, setCurrentMonth] = React.useState(new Date())
  const [selectedDate, setSelectedDate] = React.useState<Date | null>(null)
  const [selectedSlot, setSelectedSlot] = React.useState<AvailableSlot | null>(null)
  const [availableSlots, setAvailableSlots] = React.useState<AvailableSlot[]>([])
  const [availableDates, setAvailableDates] = React.useState<Date[]>([])
  const [selectedStaffId, setSelectedStaffId] = React.useState<string | null>(null)
  const [isLoadingSlots, setIsLoadingSlots] = React.useState(false)
  const [isLoadingDates, setIsLoadingDates] = React.useState(false)

  // Auto-refresh slots every 30 seconds
  React.useEffect(() => {
    if (!selectedDate) return

    const interval = setInterval(() => {
      void loadSlotsForDate(selectedDate)
    }, 30000)

    return () => clearInterval(interval)
  }, [selectedDate, serviceId])

  // Load available dates for current month
  React.useEffect(() => {
    void loadAvailableDates()
  }, [currentMonth, serviceId])

  const loadAvailableDates = async () => {
    if (!getAvailableDates) {
      // Fallback: show all dates in month
      const days = eachDayOfInterval({
        start: startOfMonth(currentMonth),
        end: endOfMonth(currentMonth),
      })
      setAvailableDates(days.filter((d) => !isBefore(d, startOfDay(new Date()))))
      return
    }

    setIsLoadingDates(true)
    try {
      const dates = await getAvailableDates(serviceId, currentMonth)
      setAvailableDates(dates)
    } catch (error) {
      console.error('Failed to load available dates:', error)
      setAvailableDates([])
    } finally {
      setIsLoadingDates(false)
    }
  }

  const loadSlotsForDate = async (date: Date) => {
    setIsLoadingSlots(true)
    try {
      const slots = await getAvailableSlots(serviceId, date)
      setAvailableSlots(slots)
    } catch (error) {
      console.error('Failed to load slots:', error)
      setAvailableSlots([])
    } finally {
      setIsLoadingSlots(false)
    }
  }

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date)
    setSelectedSlot(null)
    setSelectedStaffId(null)
    void loadSlotsForDate(date)
  }

  const handleSlotSelect = (slot: AvailableSlot) => {
    setSelectedSlot(slot)
    onSelect(slot)
  }

  const handlePrevMonth = () => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
  }

  const handleNextMonth = () => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
  }

  // Filter slots by selected staff
  const filteredSlots = selectedStaffId
    ? availableSlots.filter((s) => s.userId === selectedStaffId)
    : availableSlots

  // Get unique staff from slots
  const uniqueStaff = React.useMemo(() => {
    const staffMap = new Map<string, string>()
    availableSlots.forEach((slot) => {
      if (slot.userId && slot.userDisplayName) {
        staffMap.set(slot.userId, slot.userDisplayName)
      }
    })
    return Array.from(staffMap.entries()).map(([id, name]) => ({ id, name }))
  }, [availableSlots])

  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  })

  const today = startOfDay(new Date())

  return (
    <div className={cn("space-y-6", className)}>
      {/* Month selector */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              {format(currentMonth, "MMMM yyyy")}
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrevMonth}
                aria-label="Previous month"
              >
                &larr;
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNextMonth}
                aria-label="Next month"
              >
                &rarr;
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingDates ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-2">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div
                  key={day}
                  className="text-center text-xs font-semibold text-muted-foreground py-2"
                >
                  {day}
                </div>
              ))}
              {daysInMonth.map((date) => {
                const isPast = isBefore(date, today)
                const hasAvailability = availableDates.some((d) => isSameDay(d, date))
                const isSelected = selectedDate && isSameDay(date, selectedDate)

                return (
                  <button
                    key={date.toISOString()}
                    onClick={() => !isPast && hasAvailability && handleDateSelect(date)}
                    disabled={isPast || !hasAvailability}
                    className={cn(
                      "aspect-square rounded-md text-sm transition-colors",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      "disabled:opacity-30 disabled:cursor-not-allowed",
                      hasAvailability && !isPast && "bg-primary/10 text-primary hover:bg-primary/20 cursor-pointer",
                      isSelected && "bg-primary text-primary-foreground hover:bg-primary/90",
                      !hasAvailability && !isPast && "text-muted-foreground"
                    )}
                    aria-label={`${format(date, "MMMM d, yyyy")}${hasAvailability ? " - Available" : " - Not available"}`}
                    aria-pressed={isSelected ? "true" : "false"}
                  >
                    {format(date, "d")}
                  </button>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Time slots */}
      {selectedDate && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5" />
                {format(selectedDate, "EEEE, MMMM d")}
              </CardTitle>
              <Badge variant="secondary" className="shrink-0">
                {filteredSlots.length} {filteredSlots.length === 1 ? "slot" : "slots"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {uniqueStaff.length > 1 && (
              <div>
                <label className="text-sm font-medium mb-2 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Staff Preference (Optional)
                </label>
                <Select
                  value={selectedStaffId ?? "any"}
                  onValueChange={(value) => setSelectedStaffId(value === "any" ? null : value)}
                >
                  <SelectTrigger aria-label="Select staff preference">
                    <SelectValue placeholder="No preference" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">No preference</SelectItem>
                    {uniqueStaff.map((staff) => (
                      <SelectItem key={staff.id} value={staff.id}>
                        {staff.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {isLoadingSlots ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredSlots.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No available time slots for this date.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {filteredSlots.map((slot, index) => {
                  const isSelected = selectedSlot === slot
                  const timeLabel = format(slot.startTime, "h:mm a")

                  return (
                    <Button
                      key={`${slot.startTime.toISOString()}-${index}`}
                      variant={isSelected ? "default" : "outline"}
                      onClick={() => handleSlotSelect(slot)}
                      className="flex flex-col h-auto py-3 gap-1"
                      aria-pressed={isSelected}
                      aria-label={`${timeLabel}${slot.userDisplayName ? ` with ${slot.userDisplayName}` : ""}`}
                    >
                      <span className="font-semibold">{timeLabel}</span>
                      {slot.userDisplayName && (
                        <span className="text-xs opacity-80">{slot.userDisplayName}</span>
                      )}
                    </Button>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export { SlotPicker }
export type { SlotPickerProps }
