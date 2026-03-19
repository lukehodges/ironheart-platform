import { cn } from "@/lib/utils"
import type { LucideIcon } from "lucide-react"

interface KpiCardProps {
  label: string
  value: string
  sub?: string
  icon: LucideIcon
  trend?: { label: string; positive: boolean }
}

export function KpiCard({ label, value, sub, icon: Icon, trend }: KpiCardProps) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400">{label}</span>
        <div className="h-7 w-7 rounded-lg bg-zinc-100 flex items-center justify-center">
          <Icon className="h-3.5 w-3.5 text-zinc-400" />
        </div>
      </div>
      <div className="flex items-end gap-2">
        <span className="text-3xl font-bold font-mono tabular-nums leading-none text-zinc-900">{value}</span>
        {trend && (
          <span className={cn("text-xs font-medium mb-0.5", trend.positive ? "text-emerald-600" : "text-red-500")}>
            {trend.positive ? "\u2191" : "\u2193"} {trend.label}
          </span>
        )}
      </div>
      {sub && <p className="text-xs text-zinc-400">{sub}</p>}
    </div>
  )
}
