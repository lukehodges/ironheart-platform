"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ClipboardList } from "lucide-react"

interface AssignmentsTabProps {
  memberId: string
}

export function AssignmentsTab({ memberId }: AssignmentsTabProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Assignments</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="py-8 text-center">
          <ClipboardList className="h-8 w-8 text-muted-foreground mx-auto mb-2" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">
            Assignment tracking coming soon for member {memberId.slice(0, 8)}...
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
