"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { api } from "@/lib/trpc/react"
import { toast } from "sonner"

interface MarkPaidDialogProps {
  invoiceId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function MarkPaidDialog({ invoiceId, open, onOpenChange, onSuccess }: MarkPaidDialogProps) {
  const [paymentMethod, setPaymentMethod] = useState<"STRIPE" | "BANK_TRANSFER">("BANK_TRANSFER")
  const [paymentReference, setPaymentReference] = useState("")

  const mutation = api.clientPortal.admin.markInvoicePaid.useMutation({
    onSuccess: () => {
      toast.success("Invoice marked as paid")
      setPaymentMethod("BANK_TRANSFER")
      setPaymentReference("")
      onOpenChange(false)
      onSuccess()
    },
    onError: (err) => toast.error(err.message),
  })

  const handleSubmit = () => {
    if (!invoiceId) return
    mutation.mutate({
      invoiceId,
      paymentMethod,
      paymentReference: paymentReference.trim() || undefined,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mark as Paid</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Payment Method</Label>
            <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as "STRIPE" | "BANK_TRANSFER")}>
              <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                <SelectItem value="STRIPE">Stripe</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Payment Reference (optional)</Label>
            <Input value={paymentReference} onChange={(e) => setPaymentReference(e.target.value)} className="mt-1.5" placeholder="e.g. TXN-12345" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={mutation.isPending}>Confirm Payment</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
