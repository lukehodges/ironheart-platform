"use client"

import { cn } from "@/lib/utils"

export type StatusPillSize = "sm" | "md"

export interface StatusPillProps {
  status: string
  size?: StatusPillSize
}

const STATUS_TONE_MAP: Record<string, string> = {
  // ok
  ACTIVE: "ih-pill-ok",
  PAID: "ih-pill-ok",
  COMPLETED: "ih-pill-ok",
  WON: "ih-pill-ok",
  HEALTHY: "ih-pill-ok",
  PUBLISHED: "ih-pill-ok",
  RESOLVED: "ih-pill-ok",
  APPROVED: "ih-pill-ok",
  // muted
  DRAFT: "",
  PENDING: "",
  QUEUED: "",
  ARCHIVED: "",
  CLOSED: "",
  INACTIVE: "",
  // warn
  SENT: "ih-pill-warn",
  IN_PROGRESS: "ih-pill-warn",
  REVIEW: "ih-pill-warn",
  PAUSED: "ih-pill-warn",
  EXPIRING: "ih-pill-warn",
  // danger
  OVERDUE: "ih-pill-danger",
  FAILED: "ih-pill-danger",
  AT_RISK: "ih-pill-danger",
  CANCELLED: "ih-pill-danger",
  REJECTED: "ih-pill-danger",
  LOST: "ih-pill-danger",
  // accent
  NEW: "ih-pill-accent",
  FEATURED: "ih-pill-accent",
  // info
  SCHEDULED: "ih-pill-info",
  RUNNING: "ih-pill-info",
  OPEN: "ih-pill-info",
  DISCOVERY: "ih-pill-info",
}

function getToneClass(status: string): string {
  const key = status.toUpperCase().replace(/[\s-]+/g, "_")
  return STATUS_TONE_MAP[key] ?? ""
}

export function StatusPill({ status, size = "md" }: StatusPillProps) {
  const toneClass = getToneClass(status)
  const sizeStyles: React.CSSProperties =
    size === "sm"
      ? { fontSize: 8, padding: "1px 5px" }
      : { fontSize: 9, padding: "2px 6px" }

  return (
    <span className={cn("ih-pill", toneClass)} style={sizeStyles}>
      {status.replace(/_/g, " ")}
    </span>
  )
}
