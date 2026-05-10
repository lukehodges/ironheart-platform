"use client"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export type EngagementStage =
  | "DISCOVERY"
  | "PROPOSAL"
  | "CONTRACTED"
  | "ONBOARDING"
  | "AUDITING"
  | "REPORTING"
  | "IMPLEMENTING"
  | "RETAINER"
  | "CLOSED_WON"
  | "CLOSED_LOST"

const STAGE_STYLES: Record<EngagementStage, string> = {
  DISCOVERY: "bg-red-100 text-red-700 border-red-200",
  PROPOSAL: "bg-amber-100 text-amber-700 border-amber-200",
  CONTRACTED: "bg-emerald-100 text-emerald-700 border-emerald-200",
  ONBOARDING: "bg-emerald-100 text-emerald-700 border-emerald-200",
  AUDITING: "bg-emerald-100 text-emerald-700 border-emerald-200",
  REPORTING: "bg-emerald-100 text-emerald-700 border-emerald-200",
  IMPLEMENTING: "bg-emerald-100 text-emerald-700 border-emerald-200",
  RETAINER: "bg-zinc-900 text-white border-zinc-800",
  CLOSED_WON: "bg-green-100 text-green-700 border-green-200",
  CLOSED_LOST: "bg-zinc-100 text-zinc-500 border-zinc-200",
}

const STAGE_LABELS: Record<EngagementStage, string> = {
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
  stage: EngagementStage | string | null
  className?: string
}

export function StageBadge({ stage, className }: StageBadgeProps) {
  const key = (stage ?? "DISCOVERY") as EngagementStage
  const styles = STAGE_STYLES[key] ?? STAGE_STYLES.DISCOVERY
  const label = STAGE_LABELS[key] ?? key

  return (
    <Badge className={cn(styles, "font-medium", className)}>
      {label}
    </Badge>
  )
}
