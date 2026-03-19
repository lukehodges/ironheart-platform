import type { EmployeeType } from "@/modules/team/team.types"

const labels: Record<EmployeeType, string> = {
  EMPLOYED: "FTE",
  SELF_EMPLOYED: "Self",
  CONTRACTOR: "Contract",
}

export function EmployeeTypeBadge({ type }: { type: EmployeeType }) {
  return (
    <span className="inline-flex items-center rounded border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 font-mono text-[10px] font-medium text-zinc-500">
      {labels[type]}
    </span>
  )
}
