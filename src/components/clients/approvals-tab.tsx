"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { CheckCircle } from "lucide-react"
import type { ApprovalRequestRecord } from "@/modules/client-portal/client-portal.types"

function formatDate(date: Date | null): string {
  if (!date) return "—"
  return new Date(date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
}

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  PENDING: "outline",
  APPROVED: "default",
  REJECTED: "destructive",
}

interface ApprovalsTabProps {
  approvals: ApprovalRequestRecord[]
  onRequestApproval: () => void
}

export function ApprovalsTab({ approvals, onRequestApproval }: ApprovalsTabProps) {
  return (
    <div className="mt-6 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {approvals.length} approval request{approvals.length !== 1 ? "s" : ""}
        </p>
        <Button size="sm" onClick={onRequestApproval}>
          <CheckCircle className="h-3.5 w-3.5 mr-1.5" /> Request Approval
        </Button>
      </div>

      {approvals.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No approval requests yet
          </CardContent>
        </Card>
      ) : (
        approvals.map((approval) => (
          <Card key={approval.id}>
            <CardContent className="py-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{approval.title}</span>
                    <Badge variant={STATUS_VARIANT[approval.status] ?? "secondary"}>
                      {approval.status.charAt(0) + approval.status.slice(1).toLowerCase()}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{approval.description}</p>
                  {approval.clientComment && (
                    <p className="text-sm italic text-muted-foreground mt-2">
                      Client: &quot;{approval.clientComment}&quot;
                    </p>
                  )}
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <span>Created {formatDate(approval.createdAt)}</span>
                    {approval.respondedAt && <span>Responded {formatDate(approval.respondedAt)}</span>}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  )
}
