import { cn } from "@/lib/utils"

const STAGE_STYLES: Record<string, string> = {
  DISCOVERY: "ih-pill ih-pill-accent",
  PROPOSAL: "ih-pill ih-pill-warn",
  CONTRACTED: "ih-pill ih-pill-ok",
  ONBOARDING: "ih-pill ih-pill-ok",
  AUDITING: "ih-pill ih-pill-ok",
  REPORTING: "ih-pill ih-pill-ok",
  IMPLEMENTING: "ih-pill ih-pill-ok",
  RETAINER: "ih-pill ih-pill-ink",
  CLOSED_WON: "ih-pill ih-pill-ok",
  CLOSED_LOST: "ih-pill",
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
    <span className={cn("ih-pill", className)}>
      {type}
    </span>
  )
}
