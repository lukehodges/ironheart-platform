"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CreditCard, CloudDownload, CheckCircle, Plus, ChevronRight } from "lucide-react"
import { formatCurrency } from "@/lib/format-currency"
import type {
  EngagementRecord,
  ProposalRecord,
  MilestoneRecord,
  DeliverableRecord,
  PortalInvoiceRecord,
  ActivityItem,
} from "@/modules/client-portal/client-portal.types"

const ACTIVITY_DOT_COLOR: Record<string, string> = {
  proposal_sent: "bg-primary",
  proposal_approved: "bg-green-500",
  proposal_declined: "bg-red-500",
  milestone_started: "bg-primary",
  milestone_completed: "bg-green-500",
  deliverable_shared: "bg-primary",
  deliverable_accepted: "bg-green-500",
  approval_requested: "bg-orange-500",
  approval_responded: "bg-green-500",
  invoice_sent: "bg-orange-500",
  invoice_paid: "bg-green-500",
}

function formatDate(date: Date | null): string {
  if (!date) return "\u2014"
  return new Date(date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
}

function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diff = now.getTime() - new Date(date).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days === 1) return "Yesterday"
  if (days < 7) return `${days} days ago`
  const weeks = Math.floor(days / 7)
  return weeks === 1 ? "1 week ago" : `${weeks} weeks ago`
}

interface OverviewTabProps {
  engagement: EngagementRecord
  proposals: ProposalRecord[]
  milestones: MilestoneRecord[]
  deliverables: DeliverableRecord[]
  invoices: PortalInvoiceRecord[]
  activity: ActivityItem[]
  onOpenDialog: (dialog: string) => void
}

export function OverviewTab({
  engagement,
  proposals,
  invoices,
  activity,
  onOpenDialog,
}: OverviewTabProps) {
  const currentProposal = proposals.find((p) => p.status === "APPROVED") ?? proposals[0]
  const totalPaid = invoices.filter((i) => i.status === "PAID").reduce((sum, i) => sum + i.amount, 0)
  const totalValue = currentProposal?.price ?? 0
  const outstanding = totalValue - totalPaid

  return (
    <div className="grid grid-cols-2 gap-4 mt-6">
      {/* Engagement Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Engagement Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-0">
          {[
            ["Type", engagement.type === "PROJECT" ? "Project (Fixed Price)" : engagement.type === "HYBRID" ? "Hybrid" : "Retainer (Monthly)"],
            ["Start Date", formatDate(engagement.startDate)],
            ["Target Completion", formatDate(engagement.endDate)],
            ["Total Value", totalValue ? formatCurrency(totalValue) : "\u2014"],
            ["Amount Paid", formatCurrency(totalPaid)],
            ["Outstanding", formatCurrency(outstanding)],
          ].map(([label, value], i) => (
            <div key={label} className="flex items-center justify-between py-2.5 border-b last:border-0">
              <span className="text-sm text-muted-foreground">{label}</span>
              <span className="text-sm font-medium tabular-nums">{value}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Quick Actions + Current Proposal */}
      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => onOpenDialog("createInvoice")}>
                <CreditCard className="h-3.5 w-3.5 mr-1.5" /> Send Invoice
              </Button>
              <Button variant="outline" size="sm" onClick={() => onOpenDialog("shareDeliverable")}>
                <CloudDownload className="h-3.5 w-3.5 mr-1.5" /> Share Deliverable
              </Button>
              <Button variant="outline" size="sm" onClick={() => onOpenDialog("requestApproval")}>
                <CheckCircle className="h-3.5 w-3.5 mr-1.5" /> Request Approval
              </Button>
              <Button variant="outline" size="sm" onClick={() => onOpenDialog("addMilestone")}>
                <Plus className="h-3.5 w-3.5 mr-1.5" /> Add Milestone
              </Button>
            </div>
          </CardContent>
        </Card>

        {currentProposal && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Current Proposal</CardTitle>
              {currentProposal.approvedAt && (
                <CardDescription>Accepted {formatDate(currentProposal.approvedAt)}</CardDescription>
              )}
            </CardHeader>
            <CardContent className="space-y-0">
              <div className="flex items-center justify-between py-2.5 border-b">
                <span className="text-sm text-muted-foreground">Scope</span>
                <span className="text-sm font-medium text-right max-w-[260px] truncate">{currentProposal.scope}</span>
              </div>
              <div className="flex items-center justify-between py-2.5 border-b">
                <span className="text-sm text-muted-foreground">Deliverables</span>
                <span className="text-sm font-medium">{currentProposal.deliverables.length} items</span>
              </div>
              <div className="flex items-center justify-between py-2.5">
                <span className="text-sm text-muted-foreground">Payment Schedule</span>
                <span className="text-sm font-medium">{currentProposal.paymentSchedule.length} milestones</span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Activity Feed */}
      <Card className="col-span-2">
        <CardHeader>
          <CardTitle className="text-sm">Recent Activity</CardTitle>
          <CardDescription>Latest updates on this engagement</CardDescription>
        </CardHeader>
        <CardContent>
          {activity.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No activity yet</p>
          ) : (
            <div className="space-y-0">
              {activity.slice(0, 10).map((item, i) => (
                <div key={i} className="flex items-start gap-3 py-3 border-b last:border-0">
                  <div className={`h-2 w-2 rounded-full mt-1.5 shrink-0 ${ACTIVITY_DOT_COLOR[item.type] ?? "bg-muted-foreground"}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">{item.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{formatRelativeTime(item.timestamp)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
