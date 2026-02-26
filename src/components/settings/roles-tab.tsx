"use client"

import { Shield } from "lucide-react"
import { EmptyState } from "@/components/ui/empty-state"

export function RolesTab() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Roles & Permissions</h3>
        <p className="text-sm text-muted-foreground">
          Manage team roles and their associated permissions.
        </p>
      </div>

      <EmptyState
        title="Roles management coming soon"
        description="Role and permission management will be available in an upcoming release. Currently, roles are managed through the platform admin."
      />
    </div>
  )
}
