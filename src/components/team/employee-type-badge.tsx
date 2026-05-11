import type { EmployeeType } from "@/modules/team/team.types"

const labels: Record<EmployeeType, string> = {
  EMPLOYED: "FTE",
  SELF_EMPLOYED: "Self",
  CONTRACTOR: "Contract",
}

export function EmployeeTypeBadge({ type }: { type: EmployeeType }) {
  return (
    <span className="inline-flex items-center rounded border border-[var(--ih-line)] bg-[var(--ih-surface-2)] px-1.5 py-0.5 font-mono text-[10px] font-medium text-[var(--ih-ink-50)]">
      {labels[type]}
    </span>
  )
}
