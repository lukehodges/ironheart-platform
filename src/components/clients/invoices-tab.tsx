"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Eye, CheckCircle, Send } from "lucide-react"
import { formatCurrency } from "@/lib/format-currency"
import { api } from "@/lib/trpc/react"
import { toast } from "sonner"
import { PaymentTimeline } from "./payment-timeline"
import type { PortalInvoiceRecord, ProposalRecord } from "@/modules/client-portal/client-portal.types"

function formatDate(date: Date | null): string {
  if (!date) return "—"
  return new Date(date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
}

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  DRAFT: "outline",
  SENT: "default",
  PAID: "default",
  OVERDUE: "destructive",
}

interface InvoicesTabProps {
  engagementId: string
  invoices: PortalInvoiceRecord[]
  proposals: ProposalRecord[]
  onCreateInvoice: () => void
  onMarkPaid: (invoiceId: string) => void
  onInvalidate: () => void
}

export function InvoicesTab({
  engagementId,
  invoices,
  proposals,
  onCreateInvoice,
  onMarkPaid,
  onInvalidate,
}: InvoicesTabProps) {
  const currentProposal = proposals.find((p) => p.status === "APPROVED") ?? proposals[0]
  const schedule = currentProposal?.paymentSchedule ?? []
  const totalValue = currentProposal?.price ?? 0

  const totalInvoiced = invoices.reduce((sum, i) => sum + i.amount, 0)
  const totalPaid = invoices.filter((i) => i.status === "PAID").reduce((sum, i) => sum + i.amount, 0)
  const outstanding = totalInvoiced - totalPaid

  const invoicedPercent = totalValue > 0 ? Math.round((totalInvoiced / totalValue) * 100) : 0
  const paidPercent = totalInvoiced > 0 ? Math.round((totalPaid / totalInvoiced) * 100) : 0

  const sendMutation = api.clientPortal.admin.sendInvoice.useMutation({
    onSuccess: () => { toast.success("Invoice sent"); onInvalidate() },
    onError: (err) => toast.error(err.message),
  })

  return (
    <div className="mt-6 space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-5">
            <span className="text-xs font-medium text-muted-foreground">Total Invoiced</span>
            <p className="text-2xl font-semibold tracking-tight tabular-nums mt-1">{formatCurrency(totalInvoiced)}</p>
            <div className="flex items-center gap-2 mt-2">
              <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full bg-primary" style={{ width: `${invoicedPercent}%` }} />
              </div>
              <span className="text-xs text-muted-foreground">{invoicedPercent}% of {formatCurrency(totalValue)}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <span className="text-xs font-medium text-muted-foreground">Paid</span>
            <p className="text-2xl font-semibold tracking-tight tabular-nums mt-1 text-green-600">{formatCurrency(totalPaid)}</p>
            <div className="flex items-center gap-2 mt-2">
              <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full bg-green-500" style={{ width: `${paidPercent}%` }} />
              </div>
              <span className="text-xs text-muted-foreground">{paidPercent}% of invoiced</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <span className="text-xs font-medium text-muted-foreground">Outstanding</span>
            <p className="text-2xl font-semibold tracking-tight tabular-nums mt-1 text-orange-500">{formatCurrency(outstanding)}</p>
            <div className="flex items-center gap-2 mt-2">
              <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full bg-orange-500" style={{ width: `${totalInvoiced > 0 ? Math.round((outstanding / totalInvoiced) * 100) : 0}%` }} />
              </div>
              <span className="text-xs text-muted-foreground">{formatCurrency(totalValue - totalInvoiced)} remaining to invoice</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invoice table */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{invoices.length} invoice{invoices.length !== 1 ? "s" : ""}</p>
        <Button size="sm" onClick={onCreateInvoice}>
          <Plus className="h-3.5 w-3.5 mr-1.5" /> Create Invoice
        </Button>
      </div>

      <div className="rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[120px]">Invoice</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="w-[110px]">Amount</TableHead>
              <TableHead className="w-[100px]">Status</TableHead>
              <TableHead className="w-[120px]">Due Date</TableHead>
              <TableHead className="w-[120px]">Sent</TableHead>
              <TableHead className="w-[140px]"><span className="sr-only">Actions</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.map((inv, i) => (
              <TableRow key={inv.id}>
                <TableCell>
                  <span className="font-mono text-sm font-medium">INV-{String(i + 1).padStart(3, "0")}</span>
                </TableCell>
                <TableCell className="text-muted-foreground">{inv.description}</TableCell>
                <TableCell className="font-mono text-sm font-medium tabular-nums">{formatCurrency(inv.amount)}</TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANT[inv.status] ?? "secondary"}>
                    {inv.status.charAt(0) + inv.status.slice(1).toLowerCase()}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground text-xs">{formatDate(inv.dueDate)}</TableCell>
                <TableCell className="text-muted-foreground text-xs">{formatDate(inv.sentAt)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex gap-1 justify-end">
                    {inv.status === "PAID" && (
                      <Button variant="ghost" size="sm" className="h-6 text-xs text-muted-foreground">
                        <Eye className="h-3 w-3 mr-1" /> View
                      </Button>
                    )}
                    {inv.status === "SENT" && (
                      <Button variant="outline" size="sm" className="h-6 text-xs" onClick={() => onMarkPaid(inv.id)}>
                        <CheckCircle className="h-3 w-3 mr-1" /> Mark Paid
                      </Button>
                    )}
                    {inv.status === "DRAFT" && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-6 text-xs"
                        disabled={sendMutation.isPending}
                        onClick={() => sendMutation.mutate({ invoiceId: inv.id })}
                      >
                        <Send className="h-3 w-3 mr-1" /> Send
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {invoices.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No invoices yet
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Payment Timeline */}
      <PaymentTimeline schedule={schedule} invoices={invoices} />
    </div>
  )
}
