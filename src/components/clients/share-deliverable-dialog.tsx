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
import type { MilestoneRecord } from "@/modules/client-portal/client-portal.types"

interface ShareDeliverableDialogProps {
  engagementId: string
  milestones: MilestoneRecord[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function ShareDeliverableDialog({ engagementId, milestones, open, onOpenChange, onSuccess }: ShareDeliverableDialogProps) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [milestoneId, setMilestoneId] = useState<string>("")
  const [fileUrl, setFileUrl] = useState("")

  const createMutation = api.clientPortal.admin.createDeliverable.useMutation({
    onSuccess: (deliverable) => {
      deliverMutation.mutate({ id: deliverable.id })
    },
    onError: (err) => toast.error(err.message),
  })

  const deliverMutation = api.clientPortal.admin.deliverDeliverable.useMutation({
    onSuccess: () => {
      toast.success("Deliverable shared with client")
      resetAndClose()
      onSuccess()
    },
    onError: (err) => toast.error(err.message),
  })

  const resetAndClose = () => {
    setTitle("")
    setDescription("")
    setMilestoneId("")
    setFileUrl("")
    onOpenChange(false)
  }

  const handleSubmit = () => {
    if (!title.trim()) {
      toast.error("Title is required")
      return
    }
    createMutation.mutate({
      engagementId,
      title: title.trim(),
      description: description.trim() || undefined,
      milestoneId: milestoneId || undefined,
      fileUrl: fileUrl.trim() || undefined,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share Deliverable</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1.5" placeholder="e.g. Architecture Document v2" />
          </div>
          <div>
            <Label>Description (optional)</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1.5" placeholder="Brief description..." rows={3} />
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
          <div>
            <Label>File URL (optional)</Label>
            <Input value={fileUrl} onChange={(e) => setFileUrl(e.target.value)} className="mt-1.5" placeholder="https://..." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={resetAndClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={createMutation.isPending || deliverMutation.isPending}>
            Share with Client
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
