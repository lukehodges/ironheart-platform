import { cn } from "@/lib/utils"

const STAGE_STYLES: Record<string, string> = {
  DISCOVERY: "bg-[#D13A1F]/10 text-[#D13A1F] border-[#D13A1F]/20",
  PROPOSAL: "bg-[#B8860B]/10 text-[#B8860B] border-[#B8860B]/20",
  CONTRACTED: "bg-[#2F6F5C]/10 text-[#2F6F5C] border-[#2F6F5C]/20",
  ONBOARDING: "bg-[#2F6F5C]/10 text-[#2F6F5C] border-[#2F6F5C]/20",
  AUDITING: "bg-[#2F6F5C]/10 text-[#2F6F5C] border-[#2F6F5C]/20",
  REPORTING: "bg-[#2F6F5C]/10 text-[#2F6F5C] border-[#2F6F5C]/20",
  IMPLEMENTING: "bg-[#2F6F5C]/10 text-[#2F6F5C] border-[#2F6F5C]/20",
  RETAINER: "bg-[#0E1013]/10 text-[#0E1013] border-[#0E1013]/20",
  CLOSED_WON: "bg-[#2F6F5C]/10 text-[#2F6F5C] border-[#2F6F5C]/20",
  CLOSED_LOST: "bg-[#0E1013]/5 text-[#0E1013]/40",
}

const STAGE_LABELS: Record<string, string> = {
  DISCOVERY: "Discovery",
  PROPOSAL: "Proposal",
  CONTRACTED: "Contracted",
  ONBOARDING: "Onboarding",
  AUDITING: "Auditing",
  REPORTING: "Reporting",
  IMPLEMENTING: "Implementing",
  RETAINER: "Retainer",
  CLOSED_WON: "Closed Won",
  CLOSED_LOST: "Closed Lost",
}

interface StageBadgeProps {
  stage: string | null
  className?: string
}

export function StageBadge({ stage, className }: StageBadgeProps) {
  const key = stage ?? "DISCOVERY"
  return (
    <span
      className={cn(
        "inline-flex items-center font-mono text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full border",
        STAGE_STYLES[key] ?? STAGE_STYLES.DISCOVERY,
        className
      )}
    >
      {STAGE_LABELS[key] ?? key}
    </span>
  )
}

interface TypeBadgeProps {
  type: string
  className?: string
}

export function TypeBadge({ type, className }: TypeBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center font-mono text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full border",
        "bg-[#0E1013]/5 text-[#0E1013]/65 border-[#0E1013]/10",
        className
      )}
    >
      {type}
    </span>
  )
}
