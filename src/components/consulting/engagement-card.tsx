"use client"

import { useRouter } from "next/navigation"
import { Calendar } from "lucide-react"
import { cn } from "@/lib/utils"
import { StageBadge, TypeBadge } from "./stage-badge"

interface EngagementCardProps {
  engagement: {
    id: string
    title: string
    stage: string | null
    type: string
    discoveryNotes: string | null
    createdAt: Date | string
    updatedAt: Date | string
    customerName?: string
  }
}

function formatDate(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
}

export function EngagementCard({ engagement }: EngagementCardProps) {
  const router = useRouter()

  const preview = engagement.discoveryNotes
    ? engagement.discoveryNotes.length > 100
      ? engagement.discoveryNotes.slice(0, 100) + "..."
      : engagement.discoveryNotes
    : null

  return (
    <button
      type="button"
      onClick={() => router.push(`/admin/engagements/${engagement.id}`)}
      className={cn(
        "ih-card w-full text-left rounded-xl p-5",
        "transition-all duration-200 hover:shadow-md hover:-translate-y-0.5",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ih-accent-soft)] focus-visible:ring-offset-2"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="font-medium truncate" style={{ color: "var(--ih-ink)" }}>{engagement.title}</h3>
          {engagement.customerName && (
            <p className="text-sm mt-0.5" style={{ color: "var(--ih-ink-65)" }}>{engagement.customerName}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <TypeBadge type={engagement.type} />
          <StageBadge stage={engagement.stage} />
        </div>
      </div>

      {preview && (
        <p className="text-sm mt-3 line-clamp-2" style={{ color: "var(--ih-ink-50)" }}>{preview}</p>
      )}

      <div className="flex items-center gap-1.5 mt-3 text-[11px]" style={{ color: "var(--ih-ink-40)" }}>
        <Calendar className="h-3 w-3" />
        <span>Created {formatDate(engagement.createdAt)}</span>
        <span className="mx-1">&middot;</span>
        <span>Updated {formatDate(engagement.updatedAt)}</span>
      </div>
    </button>
  )
}

export function EngagementCardSkeleton() {
  return (
    <div className="ih-card rounded-xl p-5 animate-pulse">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-2">
          <div className="h-5 rounded w-2/3" style={{ background: "var(--ih-line)" }} />
          <div className="h-4 rounded w-1/3" style={{ background: "var(--ih-line)" }} />
        </div>
        <div className="flex gap-2">
          <div className="h-6 rounded-full w-16" style={{ background: "var(--ih-line)" }} />
          <div className="h-6 rounded-full w-20" style={{ background: "var(--ih-line)" }} />
        </div>
      </div>
      <div className="h-4 rounded w-4/5 mt-3" style={{ background: "var(--ih-line)" }} />
      <div className="h-3 rounded w-1/2 mt-3" style={{ background: "var(--ih-line)" }} />
    </div>
  )
}
