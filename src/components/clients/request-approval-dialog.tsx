"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { api } from "@/lib/trpc/react"
import { toast } from "sonner"
import type { DeliverableRecord, MilestoneRecord } from "@/modules/client-portal/client-portal.types"

interface RequestApprovalDialogProps {
  engagementId: string
  deliverables: DeliverableRecord[]
  milestones: MilestoneRecord[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function RequestApprovalDialog({ engagementId, deliverables, milestones, open, onOpenChange, onSuccess }: RequestApprovalDialogProps) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [deliverableId, setDeliverableId] = useState<string>("")
  const [milestoneId, setMilestoneId] = useState<string>("")

  const mutation = api.clientPortal.admin.createApproval.useMutation({
    onSuccess: () => {
      toast.success("Approval request sent")
      setTitle("")
      setDescription("")
      setDeliverableId("")
      setMilestoneId("")
      onOpenChange(false)
      onSuccess()
    },
    onError: (err) => toast.error(err.message),
  })

  const handleSubmit = () => {
    if (!title.trim() || !description.trim()) {
      toast.error("Title and description are required")
      return
    }
    mutation.mutate({
      engagementId,
      title: title.trim(),
      description: description.trim(),
      deliverableId: deliverableId || undefined,
      milestoneId: milestoneId || undefined,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request Approval</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1.5" placeholder="e.g. Architecture sign-off" />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1.5" placeholder="What are you asking the client to approve?" rows={3} />
          </div>
          <div>
            <Label>Link to Deliverable (optional)</Label>
            <Select value={deliverableId} onValueChange={setDeliverableId}>
              <SelectTrigger className="mt-1.5"><SelectValue placeholder="None" /></SelectTrigger>
              <SelectContent>
                {deliverables.map((d) => (
                  <SelectItem key={d.id} value={d.id}>{d.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Link to Milestone (optional)</Label>
            <Select value={milestoneId} onValueChange={setMilestoneId}>
              <SelectTrigger className="mt-1.5"><SelectValue placeholder="None" /></SelectTrigger>
              <SelectContent>
                {milestones.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={mutation.isPending}>Send Request</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
