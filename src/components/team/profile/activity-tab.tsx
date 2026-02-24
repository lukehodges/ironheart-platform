"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Activity } from "lucide-react"

interface ActivityTabProps {
  memberId: string
}

export function ActivityTab({ memberId }: ActivityTabProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Activity Log</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="py-8 text-center">
          <Activity className="h-8 w-8 text-muted-foreground mx-auto mb-2" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">
            Activity log coming soon for member {memberId.slice(0, 8)}...
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
