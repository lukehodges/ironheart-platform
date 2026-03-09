"use client"

import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { api } from "@/lib/trpc/react"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface StaffFilterChipsProps {
  /** Currently selected staff IDs. Empty array means "All Staff" is active. */
  selectedIds: string[]
  /** Called when selection changes */
  onChange: (ids: string[]) => void
}

// ---------------------------------------------------------------------------
// Loading skeleton - 4 chips
// ---------------------------------------------------------------------------

function StaffFilterChipsSkeleton() {
  return (
    <div
      className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin"
      aria-busy="true"
      aria-label="Loading staff filters"
    >
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton
          key={i}
          className="h-7 shrink-0 rounded-full"
          style={{ width: i === 0 ? "5.5rem" : `${6 + i * 0.5}rem` }}
        />
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Individual chip
// ---------------------------------------------------------------------------

interface ChipProps {
  active: boolean
  onClick: () => void
  children: React.ReactNode
  "aria-label"?: string
}

function Chip({ active, onClick, children, "aria-label": ariaLabel }: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={ariaLabel}
      onClick={onClick}
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
        active
          ? "border-primary bg-primary text-primary-foreground shadow-sm"
          : "border-border bg-background text-foreground hover:bg-accent hover:text-accent-foreground"
      )}
    >
      {children}
    </button>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function StaffFilterChips({ selectedIds, onChange }: StaffFilterChipsProps) {
  const { data: staffData, isLoading } = api.team.list.useQuery(
    { status: "ACTIVE", limit: 50 },
    { staleTime: 60_000 }
  )

  const staffMembers = staffData?.rows ?? []

  if (isLoading) return <StaffFilterChipsSkeleton />

  const allActive = selectedIds.length === 0

  const handleToggleAll = () => {
    onChange([])
  }

  const handleToggleStaff = (id: string) => {
    if (selectedIds.includes(id)) {
      // Deselect: remove from list; if list becomes empty → revert to "All"
      const next = selectedIds.filter((s) => s !== id)
      onChange(next)
    } else {
      // Select: add to list, clear "All Staff" implicit state
      onChange([...selectedIds, id])
    }
  }

  return (
    <div
      className="flex items-center gap-2 overflow-x-auto pb-1"
      style={{
        scrollbarWidth: "thin",
        scrollbarColor: "var(--color-border) transparent",
      }}
      role="group"
      aria-label="Filter by staff member"
    >
      {/* "All Staff" chip */}
      <Chip
        active={allActive}
        onClick={handleToggleAll}
        aria-label="Show all staff"
      >
        All Staff
      </Chip>

      {/* Individual staff chips */}
      {staffMembers.map((member) => {
        const isActive = selectedIds.includes(member.id)
        return (
          <Chip
            key={member.id}
            active={isActive}
            onClick={() => handleToggleStaff(member.id)}
            aria-label={`${isActive ? "Deselect" : "Select"} ${member.name}`}
          >
            <Avatar
              className="h-4 w-4 shrink-0"
              aria-hidden="true"
            >
              <AvatarImage
                src={member.avatarUrl ?? undefined}
                alt={member.name}
                className="object-cover"
              />
              <AvatarFallback
                className={cn(
                  "text-[8px] font-semibold",
                  isActive
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {getInitials(member.name)}
              </AvatarFallback>
            </Avatar>
            <span className="max-w-[7rem] truncate">{member.name}</span>
          </Chip>
        )
      })}
    </div>
  )
}

export { StaffFilterChips }
export type { StaffFilterChipsProps }
