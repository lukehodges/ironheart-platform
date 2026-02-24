"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Wrench } from "lucide-react"

interface SkillsTabProps {
  memberId: string
}

export function SkillsTab({ memberId }: SkillsTabProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Skills & Certifications</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="py-8 text-center">
          <Wrench className="h-8 w-8 text-muted-foreground mx-auto mb-2" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">
            Skills management coming soon for member {memberId.slice(0, 8)}...
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
