"use client"

import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import { cn } from "@/lib/utils"

const STATUS_OPTIONS = [
  { label: "All", value: undefined },
  { label: "Active", value: "ACTIVE" as const },
  { label: "Proposed", value: "PROPOSED" as const },
  { label: "Draft", value: "DRAFT" as const },
  { label: "Completed", value: "COMPLETED" as const },
]

interface EngagementFiltersProps {
  search: string
  onSearchChange: (value: string) => void
  status: string | undefined
  onStatusChange: (value: string | undefined) => void
}

export function EngagementFilters({
  search,
  onSearchChange,
  status,
  onStatusChange,
}: EngagementFiltersProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search clients or engagements..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 h-9"
        />
      </div>
      <div className="flex gap-1.5">
        {STATUS_OPTIONS.map((opt) => (
          <button
            key={opt.label}
            onClick={() => onStatusChange(opt.value)}
            className={cn(
              "inline-flex items-center rounded-md border px-3 h-9 text-xs font-semibold transition-colors",
              status === opt.value
                ? "bg-primary text-primary-foreground border-transparent shadow-sm"
                : "bg-background text-foreground border-input hover:bg-accent"
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}
