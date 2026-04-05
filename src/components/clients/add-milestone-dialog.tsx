"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { api } from "@/lib/trpc/react"
import { toast } from "sonner"

interface AddMilestoneDialogProps {
  engagementId: string
  milestoneCount: number
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function AddMilestoneDialog({ engagementId, milestoneCount, open, onOpenChange, onSuccess }: AddMilestoneDialogProps) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [dueDate, setDueDate] = useState("")

  const mutation = api.clientPortal.admin.createMilestone.useMutation({
    onSuccess: () => {
      toast.success("Milestone added")
      setTitle("")
      setDescription("")
      setDueDate("")
      onOpenChange(false)
      onSuccess()
    },
    onError: (err) => toast.error(err.message),
  })

  const handleSubmit = () => {
    if (!title.trim()) {
      toast.error("Title is required")
      return
    }
    mutation.mutate({
      engagementId,
      title: title.trim(),
      description: description.trim() || undefined,
      dueDate: dueDate ? new Date(dueDate) : undefined,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Milestone</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1.5" placeholder="e.g. Phase 2: Development" />
          </div>
          <div>
            <Label>Description (optional)</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1.5" placeholder="Brief description..." rows={3} />
          </div>
          <div>
            <Label>Due Date (optional)</Label>
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="mt-1.5 w-[200px]" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={mutation.isPending}>Add Milestone</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
