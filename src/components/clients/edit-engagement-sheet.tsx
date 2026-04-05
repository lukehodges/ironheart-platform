"use client"

import { useState, useEffect } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { api } from "@/lib/trpc/react"
import { toast } from "sonner"
import type { EngagementRecord } from "@/modules/client-portal/client-portal.types"

interface EditEngagementSheetProps {
  engagement: EngagementRecord
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function EditEngagementSheet({ engagement, open, onOpenChange, onSuccess }: EditEngagementSheetProps) {
  const [title, setTitle] = useState(engagement.title)
  const [type, setType] = useState(engagement.type)
  const [status, setStatus] = useState(engagement.status)
  const [description, setDescription] = useState(engagement.description ?? "")
  const [startDate, setStartDate] = useState(engagement.startDate ? new Date(engagement.startDate).toISOString().split("T")[0]! : "")
  const [endDate, setEndDate] = useState(engagement.endDate ? new Date(engagement.endDate).toISOString().split("T")[0]! : "")

  useEffect(() => {
    setTitle(engagement.title)
    setType(engagement.type)
    setStatus(engagement.status)
    setDescription(engagement.description ?? "")
    setStartDate(engagement.startDate ? new Date(engagement.startDate).toISOString().split("T")[0]! : "")
    setEndDate(engagement.endDate ? new Date(engagement.endDate).toISOString().split("T")[0]! : "")
  }, [engagement])

  const mutation = api.clientPortal.admin.updateEngagement.useMutation({
    onSuccess: () => {
      toast.success("Engagement updated")
      onOpenChange(false)
      onSuccess()
    },
    onError: (err) => toast.error(err.message),
  })

  const handleSubmit = () => {
    mutation.mutate({
      id: engagement.id,
      title: title.trim() || undefined,
      type,
      status,
      description: description.trim() || null,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
    })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Edit Engagement</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 mt-6">
          <div>
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1.5" />
          </div>
          <div>
            <Label>Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as any)}>
              <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="PROJECT">Project</SelectItem>
                <SelectItem value="RETAINER">Retainer</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as any)}>
              <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="PROPOSED">Proposed</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1.5" rows={4} />
          </div>
          <div>
            <Label>Start Date</Label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="mt-1.5 w-[200px]" />
          </div>
          <div>
            <Label>End Date</Label>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="mt-1.5 w-[200px]" />
          </div>
        </div>
        <SheetFooter className="mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={mutation.isPending}>Save Changes</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
