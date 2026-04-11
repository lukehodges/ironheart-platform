"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Copy, ExternalLink, Plus, Send } from "lucide-react"
import { formatCurrency } from "@/lib/format-currency"
import { toast } from "sonner"
import { api } from "@/lib/trpc/react"
import type { ProposalRecord } from "@/modules/client-portal/client-portal.types"

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  DRAFT: "outline",
  SENT: "default",
  APPROVED: "default",
  DECLINED: "destructive",
  SUPERSEDED: "secondary",
}

function formatDate(date: Date | null): string {
  if (!date) return "\u2014"
  return new Date(date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
}

interface ProposalsTabProps {
  engagementId: string
  proposals: ProposalRecord[]
  onInvalidate: () => void
}

export function ProposalsTab({ engagementId, proposals, onInvalidate }: ProposalsTabProps) {
  const router = useRouter()

  const sendMutation = api.clientPortal.admin.sendProposal.useMutation({
    onSuccess: () => {
      toast.success("Proposal sent to client")
      onInvalidate()
    },
    onError: (err) => toast.error(err.message),
  })

  return (
    <div className="mt-6 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {proposals.length} proposal{proposals.length !== 1 ? "s" : ""}
        </p>
        <Button size="sm" onClick={() => router.push(`/admin/clients/${engagementId}/proposals/new`)}>
          <Plus className="h-3.5 w-3.5 mr-1.5" /> New Proposal
        </Button>
      </div>

      {proposals.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No proposals yet. Create one to get started.
          </CardContent>
        </Card>
      ) : (
        proposals.map((proposal) => (
          <Card key={proposal.id}>
            <CardContent className="py-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant={STATUS_VARIANT[proposal.status] ?? "secondary"}>
                      {proposal.status.charAt(0) + proposal.status.slice(1).toLowerCase()}
                    </Badge>
                    <span className="text-sm font-medium">{formatCurrency(proposal.price)}</span>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">{proposal.scope}</p>
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <span>{proposal.deliverables.length} deliverable{proposal.deliverables.length !== 1 ? "s" : ""}</span>
                    <span>{proposal.paymentSchedule.length} payment{proposal.paymentSchedule.length !== 1 ? "s" : ""}</span>
                    {proposal.sentAt && <span>Sent {formatDate(proposal.sentAt)}</span>}
                  </div>
                </div>
                <div className="flex gap-2">
                  {proposal.status === "DRAFT" && (
                    <Button
                      variant="default"
                      size="sm"
                      disabled={sendMutation.isPending}
                      onClick={() => sendMutation.mutate({ proposalId: proposal.id })}
                    >
                      <Send className="h-3.5 w-3.5 mr-1.5" /> Send
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const url = `${window.location.origin}/portal/${proposal.token}`
                      void navigator.clipboard.writeText(url)
                      toast.success("Link copied")
                    }}
                  >
                    <Copy className="h-3.5 w-3.5 mr-1.5" /> Copy Link
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(`/portal/${proposal.token}`, "_blank")}
                  >
                    <ExternalLink className="h-3.5 w-3.5 mr-1.5" /> View
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  )
}
