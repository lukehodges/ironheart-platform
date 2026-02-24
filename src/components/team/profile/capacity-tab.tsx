"use client"

import { useState } from "react"
import { toast } from "sonner"
import { api } from "@/lib/trpc/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import type { CapacityUnit } from "@/shared/resource-pool/resource-pool.types"

const CAPACITY_UNITS: { value: CapacityUnit; label: string }[] = [
  { value: "COUNT", label: "Count" },
  { value: "HOURS", label: "Hours" },
  { value: "POINTS", label: "Points" },
]

export function CapacityTab({ memberId }: { memberId: string }) {
  const today = new Date().toISOString().split("T")[0]!
  const utils = api.useUtils()

  const { data: workload, isLoading } = api.team.getWorkload.useQuery({
    userId: memberId,
    date: today,
  })

  if (isLoading) {
    return (
      <div className="py-6 space-y-4">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    )
  }

  const capacities = workload?.capacities ?? []

  return (
    <div className="py-6 space-y-6">
      <h3 className="text-sm font-medium">Today&apos;s Workload</h3>

      {capacities.length === 0 ? (
        <p className="text-sm text-muted-foreground">No capacity rules configured.</p>
      ) : (
        <div className="space-y-3">
          {capacities.map((cap) => {
            const pct = cap.max != null && cap.max > 0
              ? Math.min(100, Math.round((cap.used / cap.max) * 100))
              : 0
            return (
              <div key={cap.capacityType} className="rounded-lg border border-border p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium capitalize">{cap.capacityType}</span>
                  <span className={cn(
                    "text-sm tabular-nums font-semibold",
                    cap.isOver ? "text-destructive" : "text-foreground"
                  )}>
                    {cap.used} / {cap.max ?? "\u221E"}
                  </span>
                </div>
                {cap.max != null && (
                  <Progress
                    value={pct}
                    className={cn("h-2", cap.isOver && "[&>div]:bg-destructive")}
                  />
                )}
                {cap.isOver && (
                  <p className="text-xs text-destructive">Over capacity</p>
                )}
              </div>
            )
          })}
        </div>
      )}

      <Separator />

      <SetCapacityForm memberId={memberId} onSuccess={() => {
        void utils.team.getWorkload.invalidate({ userId: memberId })
        void utils.team.getCapacity.invalidate()
      }} />
    </div>
  )
}

function SetCapacityForm({
  memberId,
  onSuccess,
}: {
  memberId: string
  onSuccess: () => void
}) {
  const [capacityType, setCapacityType] = useState("bookings")
  const [maxDaily, setMaxDaily] = useState("")
  const [maxConcurrent, setMaxConcurrent] = useState("")
  const [maxWeekly, setMaxWeekly] = useState("")
  const [unit, setUnit] = useState<CapacityUnit>("COUNT")
  const [effectiveFrom, setEffectiveFrom] = useState(
    new Date().toISOString().split("T")[0]!
  )
  const [effectiveUntil, setEffectiveUntil] = useState("")

  const setCapacityMutation = api.team.setCapacity.useMutation({
    onSuccess: () => {
      toast.success("Capacity updated")
      onSuccess()
    },
    onError: (err) => toast.error(err.message ?? "Failed to set capacity"),
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!capacityType.trim()) {
      toast.error("Capacity type is required")
      return
    }
    setCapacityMutation.mutate({
      userId: memberId,
      capacityType: capacityType.trim(),
      maxDaily: maxDaily ? parseInt(maxDaily, 10) : undefined,
      maxConcurrent: maxConcurrent ? parseInt(maxConcurrent, 10) : undefined,
      maxWeekly: maxWeekly ? parseInt(maxWeekly, 10) : undefined,
      unit,
      effectiveFrom,
      effectiveUntil: effectiveUntil || undefined,
    })
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium">Set Capacity</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="cap-type">Capacity type</Label>
            <Input id="cap-type" value={capacityType} onChange={(e) => setCapacityType(e.target.value)} placeholder="e.g. bookings" />
          </div>
          <div className="space-y-2">
            <Label>Unit</Label>
            <Select value={unit} onValueChange={(v) => setUnit(v as CapacityUnit)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CAPACITY_UNITS.map((u) => (
                  <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="cap-daily">Max daily</Label>
            <Input id="cap-daily" type="number" min={1} value={maxDaily} onChange={(e) => setMaxDaily(e.target.value)} placeholder="e.g. 8" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cap-concurrent">Max concurrent</Label>
            <Input id="cap-concurrent" type="number" min={1} value={maxConcurrent} onChange={(e) => setMaxConcurrent(e.target.value)} placeholder="e.g. 3" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cap-weekly">Max weekly</Label>
            <Input id="cap-weekly" type="number" min={1} value={maxWeekly} onChange={(e) => setMaxWeekly(e.target.value)} placeholder="e.g. 35" />
          </div>
          <div />
          <div className="space-y-2">
            <Label htmlFor="cap-from">Effective from</Label>
            <Input id="cap-from" type="date" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cap-until">Effective until (optional)</Label>
            <Input id="cap-until" type="date" value={effectiveUntil} onChange={(e) => setEffectiveUntil(e.target.value)} />
          </div>
        </div>

        <Button type="submit" size="sm" loading={setCapacityMutation.isPending}>
          Save Capacity
        </Button>
      </form>
    </div>
  )
}
