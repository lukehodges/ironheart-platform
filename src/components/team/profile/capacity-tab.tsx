"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart3 } from "lucide-react"

interface CapacityTabProps {
  memberId: string
}

export function CapacityTab({ memberId }: CapacityTabProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Capacity Settings</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="py-8 text-center">
          <BarChart3 className="h-8 w-8 text-muted-foreground mx-auto mb-2" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">
            Capacity management coming soon for member {memberId.slice(0, 8)}...
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
