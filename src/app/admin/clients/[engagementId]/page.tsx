"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { ChevronLeft, Pencil, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { api } from "@/lib/trpc/react"
import { OverviewTab } from "@/components/clients/overview-tab"
import { ProposalsTab } from "@/components/clients/proposals-tab"
import { MilestonesTab } from "@/components/clients/milestones-tab"
import { DeliverablesTab } from "@/components/clients/deliverables-tab"
import { InvoicesTab } from "@/components/clients/invoices-tab"
import { ApprovalsTab } from "@/components/clients/approvals-tab"
import { EditEngagementSheet } from "@/components/clients/edit-engagement-sheet"
import { CreateInvoiceDialog } from "@/components/clients/create-invoice-dialog"
import { ShareDeliverableDialog } from "@/components/clients/share-deliverable-dialog"
import { RequestApprovalDialog } from "@/components/clients/request-approval-dialog"
import { MarkPaidDialog } from "@/components/clients/mark-paid-dialog"
import { AddMilestoneDialog } from "@/components/clients/add-milestone-dialog"

const TABS = ["Overview", "Proposals", "Milestones", "Deliverables", "Invoices", "Approvals"] as const
type Tab = (typeof TABS)[number]

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  ACTIVE: "default",
  PROPOSED: "secondary",
  DRAFT: "outline",
  PAUSED: "outline",
  COMPLETED: "secondary",
  CANCELLED: "destructive",
}

export default function EngagementDetailPage() {
  const params = useParams<{ engagementId: string }>()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<Tab>("Overview")
  const [openDialog, setOpenDialog] = useState<string | null>(null)
  const [markPaidInvoiceId, setMarkPaidInvoiceId] = useState<string | null>(null)

  const utils = api.useUtils()

  const { data, isLoading } = api.clientPortal.admin.getEngagement.useQuery({
    id: params.engagementId,
  })

  const invalidate = () => {
    void utils.clientPortal.admin.getEngagement.invalidate({ id: params.engagementId })
  }

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-[400px] w-full rounded-xl" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="space-y-4 animate-fade-in">
        <Link href="/admin/clients" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-3.5 w-3.5" /> Back to Clients
        </Link>
        <p className="text-muted-foreground">Engagement not found.</p>
      </div>
    )
  }

  const engagement = data
  const activity = (engagement as any).activity ?? []

  return (
    <div className="space-y-0 animate-fade-in">
      {/* Back link */}
      <Link href="/admin/clients" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-3.5 w-3.5" /> Back to Clients
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mt-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{engagement.title}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm text-muted-foreground">{(engagement as any).customerName ?? "Client"}</span>
            <span className="text-border">|</span>
            <Badge variant={engagement.type === "PROJECT" ? "default" : engagement.type === "HYBRID" ? "default" : "outline"}>
              {engagement.type === "PROJECT" ? "Project" : engagement.type === "HYBRID" ? "Hybrid" : "Retainer"}
            </Badge>
            <Badge variant={STATUS_VARIANT[engagement.status] ?? "secondary"}>
              {engagement.status.charAt(0) + engagement.status.slice(1).toLowerCase()}
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <a href={`/portal/preview/${params.engagementId}`} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3.5 w-3.5 mr-1.5" /> Client View
            </a>
          </Button>
          <Button variant="outline" size="sm" onClick={() => setOpenDialog("editEngagement")}>
            <Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b mt-6">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-4 py-2.5 text-sm font-medium border-b-2 transition-colors",
              activeTab === tab
                ? "text-foreground border-primary"
                : "text-muted-foreground border-transparent hover:text-foreground"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "Overview" && (
        <OverviewTab
          engagement={engagement}
          proposals={engagement.proposals ?? []}
          milestones={engagement.milestones ?? []}
          deliverables={engagement.deliverables ?? []}
          invoices={engagement.invoices ?? []}
          activity={activity}
          onOpenDialog={setOpenDialog}
        />
      )}
      {activeTab === "Proposals" && (
        <ProposalsTab
          engagementId={engagement.id}
          proposals={engagement.proposals ?? []}
          onInvalidate={invalidate}
        />
      )}
      {activeTab === "Milestones" && (
        <MilestonesTab
          engagementId={engagement.id}
          milestones={engagement.milestones ?? []}
          deliverables={engagement.deliverables ?? []}
          onInvalidate={invalidate}
          onAddMilestone={() => setOpenDialog("addMilestone")}
        />
      )}
      {activeTab === "Deliverables" && (
        <DeliverablesTab
          deliverables={engagement.deliverables ?? []}
          milestones={engagement.milestones ?? []}
          onShareDeliverable={() => setOpenDialog("shareDeliverable")}
        />
      )}
      {activeTab === "Invoices" && (
        <InvoicesTab
          engagementId={engagement.id}
          invoices={engagement.invoices ?? []}
          proposals={engagement.proposals ?? []}
          onCreateInvoice={() => setOpenDialog("createInvoice")}
          onMarkPaid={(id) => { setMarkPaidInvoiceId(id); setOpenDialog("markPaid"); }}
          onInvalidate={invalidate}
        />
      )}
      {activeTab === "Approvals" && (
        <ApprovalsTab
          approvals={engagement.approvals ?? []}
          onRequestApproval={() => setOpenDialog("requestApproval")}
        />
      )}

      {/* Dialogs */}
      <EditEngagementSheet
        engagement={engagement}
        open={openDialog === "editEngagement"}
        onOpenChange={(open) => !open && setOpenDialog(null)}
        onSuccess={invalidate}
      />
      <CreateInvoiceDialog
        engagementId={engagement.id}
        milestones={engagement.milestones ?? []}
        open={openDialog === "createInvoice"}
        onOpenChange={(open) => !open && setOpenDialog(null)}
        onSuccess={invalidate}
      />
      <ShareDeliverableDialog
        engagementId={engagement.id}
        milestones={engagement.milestones ?? []}
        open={openDialog === "shareDeliverable"}
        onOpenChange={(open) => !open && setOpenDialog(null)}
        onSuccess={invalidate}
      />
      <RequestApprovalDialog
        engagementId={engagement.id}
        deliverables={engagement.deliverables ?? []}
        milestones={engagement.milestones ?? []}
        open={openDialog === "requestApproval"}
        onOpenChange={(open) => !open && setOpenDialog(null)}
        onSuccess={invalidate}
      />
      <MarkPaidDialog
        invoiceId={markPaidInvoiceId}
        open={openDialog === "markPaid"}
        onOpenChange={(open) => { if (!open) { setOpenDialog(null); setMarkPaidInvoiceId(null); } }}
        onSuccess={invalidate}
      />
      <AddMilestoneDialog
        engagementId={engagement.id}
        milestoneCount={engagement.milestones?.length ?? 0}
        open={openDialog === "addMilestone"}
        onOpenChange={(open) => !open && setOpenDialog(null)}
        onSuccess={invalidate}
      />
    </div>
  )
}
