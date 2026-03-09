"use client"

import { useEffect, useRef, useState } from "react"
import { api } from "@/lib/trpc/react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { NotificationTriggerWithModule, TemplateListItem } from "@/modules/notification/notification.types"

interface TemplateEditorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  trigger: NotificationTriggerWithModule
  template?: TemplateListItem | null
  onSuccess: () => void
}

export function TemplateEditorDialog({
  open,
  onOpenChange,
  trigger,
  template,
  onSuccess,
}: TemplateEditorDialogProps) {
  const isEditMode = !!template
  const bodyRef = useRef<HTMLTextAreaElement>(null)

  const [name, setName] = useState("")
  const [channel, setChannel] = useState("EMAIL")
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")
  const [active, setActive] = useState(true)

  // Reset form when dialog opens or template changes
  useEffect(() => {
    if (open) {
      if (template) {
        setName(template.name)
        setChannel(template.channel)
        setSubject(template.subject ?? "")
        setBody(template.body)
        setActive(template.active)
      } else {
        setName("")
        setChannel("EMAIL")
        setSubject("")
        setBody("")
        setActive(true)
      }
    }
  }, [open, template])

  const utils = api.useUtils()

  const createMutation = api.notification.createTemplate.useMutation({
    onSuccess: () => {
      toast.success("Template created successfully")
      utils.notification.listTemplates.invalidate()
      onSuccess()
      onOpenChange(false)
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const updateMutation = api.notification.updateTemplate.useMutation({
    onSuccess: () => {
      toast.success("Template updated successfully")
      utils.notification.listTemplates.invalidate()
      onSuccess()
      onOpenChange(false)
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const isPending = createMutation.isPending || updateMutation.isPending

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (isEditMode && template) {
      // Only send changed fields
      const changes: Record<string, unknown> = { id: template.id }
      if (name !== template.name) changes.name = name
      if (subject !== (template.subject ?? "")) changes.subject = subject
      if (body !== template.body) changes.body = body
      if (active !== template.active) changes.active = active

      updateMutation.mutate(changes as {
        id: string
        name?: string
        subject?: string
        body?: string
        active?: boolean
      })
    } else {
      createMutation.mutate({
        name,
        trigger: trigger.key,
        channel,
        subject: channel === "EMAIL" ? subject : undefined,
        body,
        active,
      })
    }
  }

  const insertVariable = (variableName: string) => {
    const insertion = `{{${variableName}}}`
    const textarea = bodyRef.current

    if (textarea) {
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const newBody = body.slice(0, start) + insertion + body.slice(end)
      setBody(newBody)
      // Restore cursor position after variable insertion
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + insertion.length
        textarea.focus()
      }, 0)
    } else {
      setBody((prev) => prev + insertion)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? "Edit Template" : "Create Template"}
          </DialogTitle>
          <DialogDescription>
            {trigger.label} - {trigger.description}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="template-name">Name</Label>
            <Input
              id="template-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Booking confirmation email"
              required
            />
          </div>

          {/* Channel (only for create mode) */}
          {!isEditMode && (
            <div className="space-y-2">
              <Label htmlFor="template-channel">Channel</Label>
              <Select value={channel} onValueChange={setChannel}>
                <SelectTrigger id="template-channel">
                  <SelectValue placeholder="Select channel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EMAIL">Email</SelectItem>
                  <SelectItem value="SMS">SMS</SelectItem>
                  <SelectItem value="PUSH">Push</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Subject (only for EMAIL) */}
          {(isEditMode ? template?.channel === "EMAIL" : channel === "EMAIL") && (
            <div className="space-y-2">
              <Label htmlFor="template-subject">Subject</Label>
              <Input
                id="template-subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Your booking has been confirmed"
              />
            </div>
          )}

          {/* Variable Badges */}
          {trigger.variables.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">
                Available Variables (click to insert)
              </Label>
              <div className="flex flex-wrap gap-1.5">
                {trigger.variables.map((variable) => (
                  <Badge
                    key={variable}
                    variant="secondary"
                    className="cursor-pointer hover:bg-secondary/60 transition-colors"
                    onClick={() => insertVariable(variable)}
                  >
                    {`{{${variable}}}`}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Body */}
          <div className="space-y-2">
            <Label htmlFor="template-body">Body</Label>
            <Textarea
              ref={bodyRef}
              id="template-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Enter template body..."
              className="min-h-[200px] font-mono text-xs"
              required
            />
          </div>

          {/* Active Switch */}
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Active</Label>
              <p className="text-xs text-muted-foreground">
                Inactive templates will not be used for sending
              </p>
            </div>
            <Switch checked={active} onCheckedChange={setActive} />
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={isPending}
              disabled={isPending || !name.trim() || !body.trim()}
            >
              {isEditMode ? "Save Changes" : "Create Template"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
