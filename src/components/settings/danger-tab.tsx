"use client"

import * as React from "react"
import { Download, AlertTriangle, Trash2 } from "lucide-react"
import { api } from "@/lib/trpc/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * DangerTab - Destructive actions for settings
 *
 * Displays dangerous operations that require confirmation:
 * - Export all data button (GDPR compliance) - Coming soon
 * - Delete all bookings button - Coming soon
 * - Delete organization button - Coming soon
 *
 * All destructive actions are disabled with "Coming soon" badges
 * until backend procedures are implemented.
 *
 * @example
 * ```tsx
 * <DangerTab />
 * ```
 */
export function DangerTab() {
  // Wire to real tenant settings to get organization name
  const { data: settings, isLoading } = api.tenant.getSettings.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
  })

  const orgName = settings?.businessName ?? "Your Organization"

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Warning Header */}
      <div className="flex gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
        <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" aria-hidden="true" />
        <div>
          <p className="font-medium text-destructive">Danger Zone</p>
          <p className="text-sm text-muted-foreground mt-1">
            The actions below are permanent and cannot be easily undone. Please proceed with caution.
          </p>
        </div>
      </div>

      {/* Export Data Card */}
      <Card className={cn("border-amber-200 bg-amber-50/50 dark:border-amber-900/30 dark:bg-amber-950/20")}>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export All Data
            <Badge variant="secondary" className="text-[10px] ml-2">
              Coming soon
            </Badge>
          </CardTitle>
          <CardDescription>
            Download a JSON file containing all your data (GDPR compliance). No data will be deleted.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            disabled
            className="gap-2"
          >
            Export Data
          </Button>
          <p className="text-xs text-muted-foreground mt-2">
            Download includes: bookings, customers, services, staff, and all settings.
          </p>
        </CardContent>
      </Card>

      {/* Delete All Bookings Card */}
      <Card className={cn("border-destructive/20 bg-destructive/5")}>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Trash2 className="h-4 w-4" />
            Delete All Bookings
            <Badge variant="secondary" className="text-[10px] ml-2">
              Coming soon
            </Badge>
          </CardTitle>
          <CardDescription>
            Permanently delete all booking records. This action cannot be undone.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" disabled>
            Delete All Bookings
          </Button>
        </CardContent>
      </Card>

      {/* Delete Organization Card */}
      <Card className={cn("border-destructive/30 bg-destructive/10")}>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Trash2 className="h-4 w-4" />
            Delete Organization
            <Badge variant="secondary" className="text-[10px] ml-2">
              Coming soon
            </Badge>
          </CardTitle>
          <CardDescription>
            Permanently delete <span className="font-semibold">{orgName}</span> and all associated data.
            Only the organization owner can perform this action.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" disabled>
            Delete Organization
          </Button>
          <p className="text-xs text-muted-foreground mt-2">
            This will permanently delete all data including bookings, customers, staff members,
            services, and settings.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
