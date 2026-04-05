"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { api } from "@/lib/trpc/react"
import { toast } from "sonner"
import { parseCurrencyInput } from "@/lib/format-currency"
import type { MilestoneRecord } from "@/modules/client-portal/client-portal.types"

interface CreateInvoiceDialogProps {
  engagementId: string
  milestones: MilestoneRecord[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function CreateInvoiceDialog({ engagementId, milestones, open, onOpenChange, onSuccess }: CreateInvoiceDialogProps) {
  const [amount, setAmount] = useState("")
  const [description, setDescription] = useState("")
  const [dueDate, setDueDate] = useState("")
  const [milestoneId, setMilestoneId] = useState<string>("")
  const [sendAfterCreate, setSendAfterCreate] = useState(false)

  const createMutation = api.clientPortal.admin.createInvoice.useMutation({
    onSuccess: (invoice) => {
      if (sendAfterCreate) {
        sendMutation.mutate({ invoiceId: invoice.id })
      } else {
        toast.success("Invoice created")
        resetAndClose()
        onSuccess()
      }
    },
    onError: (err) => toast.error(err.message),
  })

  const sendMutation = api.clientPortal.admin.sendInvoice.useMutation({
    onSuccess: () => {
      toast.success("Invoice created and sent")
      resetAndClose()
      onSuccess()
    },
    onError: (err) => toast.error(err.message),
  })

  const resetAndClose = () => {
    setAmount("")
    setDescription("")
    setDueDate("")
    setMilestoneId("")
    setSendAfterCreate(false)
    onOpenChange(false)
  }

  const handleSubmit = (send: boolean) => {
    const cents = parseCurrencyInput(amount)
    if (!cents || !description.trim() || !dueDate) {
      toast.error("Please fill in all required fields")
      return
    }
    setSendAfterCreate(send)
    createMutation.mutate({
      engagementId,
      amount: cents,
      description: description.trim(),
      dueDate: new Date(dueDate),
      milestoneId: milestoneId || undefined,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Invoice</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Amount</Label>
            <div className="relative mt-1.5">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">&pound;</span>
              <Input value={amount} onChange={(e) => setAmount(e.target.value)} className="pl-7 tabular-nums" placeholder="0.00" />
            </div>
          </div>
          <div>
            <Label>Description</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1.5" placeholder="e.g. Deposit on signing" />
          </div>
          <div>
            <Label>Due Date</Label>
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="mt-1.5 w-[200px]" />
          </div>
          <div>
            <Label>Milestone (optional)</Label>
            <Select value={milestoneId} onValueChange={setMilestoneId}>
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                {milestones.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleSubmit(false)} disabled={createMutation.isPending || sendMutation.isPending}>
            Create Draft
          </Button>
          <Button onClick={() => handleSubmit(true)} disabled={createMutation.isPending || sendMutation.isPending}>
            Create & Send
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
