"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { format } from "date-fns"
import { Mail, Phone, Calendar, Briefcase, DollarSign } from "lucide-react"
import type { StaffMember } from "@/modules/team/team.types"

interface OverviewTabProps {
  member: StaffMember
  onUpdate: () => void
}

function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "--"
  try {
    return format(new Date(date), "d MMM yyyy")
  } catch {
    return "--"
  }
}

export function OverviewTab({ member }: OverviewTabProps) {
  return (
    <div className="space-y-6">
      {/* Contact info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Contact Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <Mail className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
            <span>{member.email}</span>
          </div>
          {member.phone && (
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
              <span>{member.phone}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
            <span>Joined {formatDate(member.createdAt)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Employment details */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Employment Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Briefcase className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>Employee type</span>
            </div>
            {member.employeeType ? (
              <Badge variant="secondary" className="text-xs capitalize">
                {member.employeeType.replace("_", " ").toLowerCase()}
              </Badge>
            ) : (
              <span className="text-xs text-muted-foreground">Not set</span>
            )}
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <DollarSign className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>Hourly rate</span>
            </div>
            {member.hourlyRate != null ? (
              <span className="text-sm font-medium">${member.hourlyRate}/hr</span>
            ) : (
              <span className="text-xs text-muted-foreground">Not set</span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
