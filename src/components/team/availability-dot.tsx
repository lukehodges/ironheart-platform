export type AvailabilityStatus = "available" | "blocked" | "unavailable"

export function AvailabilityDot({ availability }: { availability: AvailabilityStatus }) {
  if (availability === "available") {
    return (
      <span className="relative inline-flex h-2.5 w-2.5 shrink-0">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
      </span>
    )
  }
  if (availability === "blocked") {
    return <span className="inline-flex h-2.5 w-2.5 shrink-0 rounded-full bg-amber-400" />
  }
  return <span className="inline-flex h-2.5 w-2.5 shrink-0 rounded-full bg-zinc-300" />
}

const labels: Record<AvailabilityStatus, string> = {
  available: "Available",
  blocked: "Blocked",
  unavailable: "Unavailable",
}

export function AvailabilityLabel({ availability }: { availability: AvailabilityStatus }) {
  return (
    <div className="flex items-center gap-1.5">
      <AvailabilityDot availability={availability} />
      <span className="text-[11px] text-zinc-500">{labels[availability]}</span>
    </div>
  )
}
