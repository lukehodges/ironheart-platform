"use client"

import { useState, useCallback, useEffect } from "react"
import { Plus, Trash2, Save } from "lucide-react"
import { toast } from "sonner"
import { api } from "@/lib/trpc/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import type { AvailabilityEntry } from "@/modules/team/team.types"

interface AvailabilityEditorProps {
  memberId: string
  onSave?: () => void
}

// Days of week: 0=Sunday, 1=Monday ... 6=Saturday
// Display order: Mon=1, Tue=2, Wed=3, Thu=4, Fri=5, Sat=6, Sun=0
const DAYS = [
  { label: "Mon", dayOfWeek: 1 },
  { label: "Tue", dayOfWeek: 2 },
  { label: "Wed", dayOfWeek: 3 },
  { label: "Thu", dayOfWeek: 4 },
  { label: "Fri", dayOfWeek: 5 },
  { label: "Sat", dayOfWeek: 6 },
  { label: "Sun", dayOfWeek: 0 },
]

const HOURS = Array.from({ length: 12 }, (_, i) => {
  const h = i + 8 // 8am to 7pm
  return { label: `${h > 12 ? h - 12 : h}${h >= 12 ? "pm" : "am"}`, value: `${h.toString().padStart(2, "0")}:00` }
})

type SpecificOverride = {
  id: string
  specificDate: string
  status: "AVAILABLE" | "BLOCKED"
  startTime?: string
  endTime?: string
  isAllDay: boolean
  reason?: string
}

function getCellKey(dayOfWeek: number, startTime: string) {
  return `${dayOfWeek}-${startTime}`
}

function todayDateString() {
  return new Date().toISOString().split("T")[0]!
}

export function AvailabilityEditor({ memberId, onSave }: AvailabilityEditorProps) {
  const utils = api.useUtils()

  // Fetch current availability
  const today = todayDateString()
  const { data: availabilityData, isLoading } = api.team.getAvailability.useQuery(
    {
      userId: memberId,
      startDate: today,
    },
    { enabled: !!memberId }
  )

  // Grid state: map from "dayOfWeek-startTime" → enabled
  const [grid, setGrid] = useState<Map<string, boolean>>(new Map())

  // Sync grid state when availability data loads or changes
  useEffect(() => {
    if (!availabilityData) return
    const m = new Map<string, boolean>()
    for (const entry of availabilityData) {
      if (entry.type === "RECURRING") {
        m.set(getCellKey(entry.dayOfWeek, entry.startTime), true)
      }
    }
    setGrid(m)
  }, [availabilityData])

  // Specific date overrides
  const [overrides, setOverrides] = useState<SpecificOverride[]>([])

  // Sync overrides from loaded availability data
  useEffect(() => {
    if (!availabilityData) return
    const loaded: SpecificOverride[] = []
    for (const entry of availabilityData) {
      if (entry.type === "SPECIFIC") {
        loaded.push({
          id: crypto.randomUUID(),
          specificDate: entry.specificDate,
          status: "AVAILABLE",
          startTime: entry.startTime,
          endTime: entry.endTime,
          isAllDay: false,
        })
      } else if (entry.type === "BLOCKED") {
        loaded.push({
          id: crypto.randomUUID(),
          specificDate: entry.specificDate,
          status: "BLOCKED",
          isAllDay: entry.isAllDay,
          reason: entry.reason,
        })
      }
    }
    if (loaded.length > 0) setOverrides(loaded)
  }, [availabilityData])

  const setAvailabilityMutation = api.team.setAvailability.useMutation({
    onSuccess: () => {
      toast.success("Availability saved")
      void utils.team.getAvailability.invalidate({ userId: memberId })
      onSave?.()
    },
    onError: (err) => {
      toast.error(err.message ?? "Failed to save availability")
    },
  })

  const toggleCell = useCallback((dayOfWeek: number, startTime: string) => {
    const key = getCellKey(dayOfWeek, startTime)
    setGrid((prev) => {
      const next = new Map(prev)
      next.set(key, !prev.get(key))
      return next
    })
  }, [])

  const toggleAllDay = useCallback((dayOfWeek: number, checked: boolean) => {
    setGrid((prev) => {
      const next = new Map(prev)
      for (const hour of HOURS) {
        next.set(getCellKey(dayOfWeek, hour.value), checked)
      }
      return next
    })
  }, [])

  const setStandardHours = useCallback(() => {
    setGrid((prev) => {
      const next = new Map(prev)
      // Clear all first
      for (const day of DAYS) {
        for (const hour of HOURS) {
          next.set(getCellKey(day.dayOfWeek, hour.value), false)
        }
      }
      // 9am-5pm weekdays (Mon-Fri = dayOfWeek 1-5)
      const weekdays = DAYS.filter((d) => d.dayOfWeek >= 1 && d.dayOfWeek <= 5)
      const workHours = HOURS.filter((h) => {
        const hNum = parseInt(h.value.split(":")[0]!, 10)
        return hNum >= 9 && hNum < 17
      })
      for (const day of weekdays) {
        for (const hour of workHours) {
          next.set(getCellKey(day.dayOfWeek, hour.value), true)
        }
      }
      return next
    })
  }, [])

  const clearAll = useCallback(() => {
    setGrid(new Map())
  }, [])

  const addOverride = useCallback(() => {
    setOverrides((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        specificDate: todayDateString(),
        status: "BLOCKED",
        isAllDay: true,
      },
    ])
  }, [])

  const removeOverride = useCallback((id: string) => {
    setOverrides((prev) => prev.filter((o) => o.id !== id))
  }, [])

  const updateOverride = useCallback((id: string, patch: Partial<SpecificOverride>) => {
    setOverrides((prev) => prev.map((o) => (o.id === id ? { ...o, ...patch } : o)))
  }, [])

  function handleSave() {
    const entries: AvailabilityEntry[] = []

    // Build recurring entries from grid
    for (const day of DAYS) {
      for (const hour of HOURS) {
        const key = getCellKey(day.dayOfWeek, hour.value)
        if (grid.get(key)) {
          const hourIdx = HOURS.indexOf(hour)
          const nextHour = HOURS[hourIdx + 1]?.value ?? "20:00"
          entries.push({
            type: "RECURRING",
            dayOfWeek: day.dayOfWeek,
            startTime: hour.value,
            endTime: nextHour,
          })
        }
      }
    }

    // Build override entries
    for (const override of overrides) {
      if (override.status === "BLOCKED") {
        entries.push({
          type: "BLOCKED",
          specificDate: override.specificDate,
          isAllDay: override.isAllDay,
          ...(override.reason ? { reason: override.reason } : {}),
        })
      } else {
        if (override.startTime && override.endTime) {
          entries.push({
            type: "SPECIFIC",
            specificDate: override.specificDate,
            startTime: override.startTime,
            endTime: override.endTime,
          })
        }
      }
    }

    setAvailabilityMutation.mutate({
      userId: memberId,
      entries,
      replaceAll: true,
    })
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Bulk actions */}
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" onClick={setStandardHours}>
          Set standard hours (9–5, Mon–Fri)
        </Button>
        <Button size="sm" variant="ghost" onClick={clearAll}>
          Clear all
        </Button>
      </div>

      {/* Weekly grid */}
      <div
        className="overflow-x-auto"
        role="grid"
        aria-label="Weekly availability grid"
      >
        <div className="min-w-[480px]">
          {/* Day headers */}
          <div className="grid grid-cols-[auto_repeat(7,1fr)] gap-1 mb-1">
            <div className="w-14" />
            {DAYS.map((day) => {
              const allEnabled = HOURS.every((h) => grid.get(getCellKey(day.dayOfWeek, h.value)))
              return (
                <div key={day.dayOfWeek} className="flex flex-col items-center gap-1">
                  <span className="text-xs font-medium text-muted-foreground">
                    {day.label}
                  </span>
                  <Checkbox
                    checked={allEnabled}
                    onCheckedChange={(checked) =>
                      toggleAllDay(day.dayOfWeek, !!checked)
                    }
                    aria-label={`Toggle all day ${day.label}`}
                  />
                </div>
              )
            })}
          </div>

          {/* Hour rows */}
          {HOURS.map((hour) => (
            <div
              key={hour.value}
              className="grid grid-cols-[auto_repeat(7,1fr)] gap-1 mb-0.5"
              role="row"
            >
              <div className="w-14 text-[10px] text-muted-foreground text-right pr-2 leading-6">
                {hour.label}
              </div>
              {DAYS.map((day) => {
                const key = getCellKey(day.dayOfWeek, hour.value)
                const enabled = !!grid.get(key)
                return (
                  <button
                    key={day.dayOfWeek}
                    role="gridcell"
                    aria-pressed={enabled}
                    aria-label={`${day.label} ${hour.label} — ${enabled ? "available" : "unavailable"}`}
                    className={cn(
                      "h-6 w-full rounded-sm border transition-colors duration-100 cursor-pointer",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      enabled
                        ? "bg-success/20 border-success/30 hover:bg-success/30"
                        : "bg-muted border-border hover:bg-muted/70"
                    )}
                    onClick={() => toggleCell(day.dayOfWeek, hour.value)}
                  />
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-5 rounded-sm bg-success/20 border border-success/30" />
          <span>Available</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-5 rounded-sm bg-muted border border-border" />
          <span>Unavailable</span>
        </div>
      </div>

      <Separator />

      {/* Specific date overrides */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium">Specific Date Overrides</h4>
          <Button size="sm" variant="outline" onClick={addOverride}>
            <Plus className="h-3.5 w-3.5" />
            Add override
          </Button>
        </div>

        {overrides.length === 0 && (
          <p className="text-xs text-muted-foreground py-2">
            No date overrides. Use these to block holidays or add one-off availability.
          </p>
        )}

        <div className="space-y-2">
          {overrides.map((override) => (
            <div
              key={override.id}
              className="flex items-start gap-2 rounded-lg border border-border p-3"
            >
              <div className="grid grid-cols-1 gap-2 flex-1 sm:grid-cols-2">
                {/* Date */}
                <div className="space-y-1">
                  <Label className="text-xs">Date</Label>
                  <Input
                    type="date"
                    className="h-8 text-xs"
                    value={override.specificDate}
                    onChange={(e) =>
                      updateOverride(override.id, { specificDate: e.target.value })
                    }
                    aria-label="Override date"
                  />
                </div>

                {/* Status */}
                <div className="space-y-1">
                  <Label className="text-xs">Type</Label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        updateOverride(override.id, { status: "BLOCKED" })
                      }
                      className={cn(
                        "flex-1 rounded-md border px-2 py-1 text-xs transition-colors",
                        override.status === "BLOCKED"
                          ? "border-destructive/50 bg-destructive/10 text-destructive"
                          : "border-border bg-transparent text-muted-foreground hover:bg-muted"
                      )}
                      aria-pressed={override.status === "BLOCKED"}
                    >
                      Blocked
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        updateOverride(override.id, { status: "AVAILABLE" })
                      }
                      className={cn(
                        "flex-1 rounded-md border px-2 py-1 text-xs transition-colors",
                        override.status === "AVAILABLE"
                          ? "border-success/50 bg-success/10 text-success"
                          : "border-border bg-transparent text-muted-foreground hover:bg-muted"
                      )}
                      aria-pressed={override.status === "AVAILABLE"}
                    >
                      Available
                    </button>
                  </div>
                </div>

                {/* Time range (only for AVAILABLE non-all-day or BLOCKED non-all-day) */}
                {override.status === "BLOCKED" && (
                  <div className="sm:col-span-2 flex items-center gap-2">
                    <Checkbox
                      id={`allday-${override.id}`}
                      checked={override.isAllDay}
                      onCheckedChange={(c) =>
                        updateOverride(override.id, { isAllDay: !!c })
                      }
                    />
                    <Label htmlFor={`allday-${override.id}`} className="text-xs cursor-pointer">
                      All day
                    </Label>
                  </div>
                )}

                {override.status === "AVAILABLE" && (
                  <div className="sm:col-span-2 grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Start time</Label>
                      <Input
                        type="time"
                        className="h-8 text-xs"
                        value={override.startTime ?? "09:00"}
                        onChange={(e) =>
                          updateOverride(override.id, { startTime: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">End time</Label>
                      <Input
                        type="time"
                        className="h-8 text-xs"
                        value={override.endTime ?? "17:00"}
                        onChange={(e) =>
                          updateOverride(override.id, { endTime: e.target.value })
                        }
                      />
                    </div>
                  </div>
                )}

                {/* Reason (for BLOCKED) */}
                {override.status === "BLOCKED" && (
                  <div className="sm:col-span-2 space-y-1">
                    <Label className="text-xs">Reason (optional)</Label>
                    <Input
                      className="h-8 text-xs"
                      placeholder="e.g. Public holiday"
                      value={override.reason ?? ""}
                      onChange={(e) =>
                        updateOverride(override.id, { reason: e.target.value })
                      }
                    />
                  </div>
                )}
              </div>

              {/* Delete */}
              <button
                type="button"
                className="shrink-0 mt-1 text-muted-foreground hover:text-destructive transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                onClick={() => removeOverride(override.id)}
                aria-label="Remove override"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Save */}
      <div className="flex justify-end pt-2">
        <Button
          size="sm"
          onClick={handleSave}
          loading={setAvailabilityMutation.isPending}
          aria-label="Save availability"
        >
          <Save className="h-4 w-4" />
          Save availability
        </Button>
      </div>
    </div>
  )
}
