import { cn } from "@/lib/utils"

function capacityColor(used: number, max: number): string {
  const pct = max > 0 ? (used / max) * 100 : 0
  if (pct > 80) return "#ef4444"
  if (pct > 60) return "#f59e0b"
  return "#10b981"
}

function capacityTextClass(used: number, max: number): string {
  const pct = max > 0 ? (used / max) * 100 : 0
  if (pct > 80) return "text-red-600"
  if (pct > 60) return "text-amber-600"
  return "text-emerald-600"
}

export function CapacityBar({ used, max }: { used: number; max: number }) {
  const pct = max > 0 ? (used / max) * 100 : 0
  const color = capacityColor(used, max)
  const textClass = capacityTextClass(used, max)
  return (
    <div className="space-y-1 w-20">
      <div className="flex items-center justify-between">
        <span className={cn("font-mono text-[11px] font-semibold tabular-nums", textClass)}>
          {used}
          <span className="text-zinc-400 font-normal">/{max}</span>
        </span>
      </div>
      <div className="h-1 w-full rounded-full bg-zinc-100 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: color }}
        />
      </div>
    </div>
  )
}
