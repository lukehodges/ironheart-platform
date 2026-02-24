"use client"

import { AvailabilityEditor } from "@/components/team/availability-editor"

interface AvailabilityTabProps {
  memberId: string
}

export function AvailabilityTab({ memberId }: AvailabilityTabProps) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium">Weekly Availability</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Set recurring weekly hours and date-specific overrides.
        </p>
      </div>
      <AvailabilityEditor memberId={memberId} />
    </div>
  )
}
