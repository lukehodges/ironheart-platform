import { cn } from "@/lib/utils"
import type { StaffStatus } from "@/modules/team/team.types"

const styles: Record<StaffStatus, string> = {
  ACTIVE: "bg-emerald-50 text-emerald-700 border-emerald-200",
  INACTIVE: "bg-zinc-100 text-zinc-500 border-zinc-200",
  SUSPENDED: "bg-amber-50 text-amber-700 border-amber-200",
}

const labels: Record<StaffStatus, string> = {
  ACTIVE: "Active",
  INACTIVE: "Inactive",
  SUSPENDED: "Suspended",
}

export function StatusBadge({ status }: { status: StaffStatus }) {
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium", styles[status])}>
      {labels[status]}
    </span>
  )
}
