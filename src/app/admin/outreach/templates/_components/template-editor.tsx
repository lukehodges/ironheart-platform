"use client"

import { useEffect, useState } from "react"
import { api } from "@/lib/trpc/react"
import type { OutreachTemplateCategory, OutreachChannel } from "@/modules/outreach/outreach.types"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { X } from "lucide-react"
import { toast } from "sonner"
import type { OutreachTemplateRecord } from "@/modules/outreach/outreach.types"

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CATEGORY_OPTIONS = [
  { value: "intro", label: "Intro" },
  { value: "follow-up", label: "Follow-up" },
  { value: "break-up", label: "Break-up" },
  { value: "case-study", label: "Case Study" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "custom", label: "Custom" },
]

const CHANNEL_OPTIONS = [
  { value: "EMAIL", label: "Email" },
  { value: "LINKEDIN_REQUEST", label: "LinkedIn Request" },
  { value: "LINKEDIN_MESSAGE", label: "LinkedIn Message" },
  { value: "CALL", label: "Call" },
]

const VARIABLE_PILLS = [
  "{{firstName}}",
  "{{lastName}}",
  "{{company}}",
  "{{sector}}",
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface TemplateEditorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  template: OutreachTemplateRecord | null
}

export function TemplateEditor({ open, onOpenChange, template }: TemplateEditorProps) {
  const isEdit = template !== null

  const [name, setName] = useState("")
  const [category, setCategory] = useState<OutreachTemplateCategory>("intro")
  const [channel, setChannel] = useState<OutreachChannel>("EMAIL")
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")
  const [tagInput, setTagInput] = useState("")
  const [tags, setTags] = useState<string[]>([])

  const utils = api.useUtils()

  // Populate form from template prop (or reset for create)
  useEffect(() => {
    if (template) {
      setName(template.name)
      setCategory(template.category as OutreachTemplateCategory)
      setChannel(template.channel as OutreachChannel)
      setSubject(template.subject ?? "")
      setBody(template.bodyMarkdown)
      setTags(template.tags ?? [])
    } else {
      setName("")
      setCategory("intro")
      setChannel("EMAIL")
      setSubject("")
      setBody("")
      setTags([])
    }
    setTagInput("")
  }, [template, open])

  const createMutation = api.outreach.createTemplate.useMutation({
    onSuccess: () => {
      void utils.outreach.listTemplates.invalidate()
      onOpenChange(false)
      toast.success("Template created")
    },
    onError: (err) => toast.error(err.message),
  })

  const updateMutation = api.outreach.updateTemplate.useMutation({
    onSuccess: () => {
      void utils.outreach.listTemplates.invalidate()
      onOpenChange(false)
      toast.success("Template updated")
    },
    onError: (err) => toast.error(err.message),
  })

  const isPending = createMutation.isPending || updateMutation.isPending

  function handleSubmit() {
    if (!name.trim() || !body.trim()) {
      toast.error("Name and body are required")
      return
    }

    if (isEdit) {
      updateMutation.mutate({
        templateId: template.id,
        name: name.trim(),
        category,
        channel,
        subject: channel === "EMAIL" ? subject.trim() || undefined : undefined,
        bodyMarkdown: body,
        tags: tags.length > 0 ? tags : undefined,
      })
    } else {
      createMutation.mutate({
        name: name.trim(),
        category,
        channel,
        subject: channel === "EMAIL" ? subject.trim() || undefined : undefined,
        bodyMarkdown: body,
        tags: tags.length > 0 ? tags : undefined,
      })
    }
  }

  function addTag() {
    const trimmed = tagInput.trim().toLowerCase()
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed])
    }
    setTagInput("")
  }

  function removeTag(tag: string) {
    setTags(tags.filter((t) => t !== tag))
  }

  function insertVariable(variable: string) {
    setBody((prev) => prev + variable)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Template" : "New Template"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update this outreach template"
              : "Create a new reusable outreach template"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Name */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Cold intro - tech sector"
            />
          </div>

          {/* Category + Channel */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Category</label>
              <Select value={category} onValueChange={(v) => setCategory(v as OutreachTemplateCategory)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Channel</label>
              <Select value={channel} onValueChange={(v) => setChannel(v as OutreachChannel)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CHANNEL_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Subject (email only) */}
          {channel === "EMAIL" && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Subject</label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Email subject line"
              />
            </div>
          )}

          {/* Variable pills */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Variables</label>
            <div className="flex items-center gap-1.5 flex-wrap">
              {VARIABLE_PILLS.map((v) => (
                <Button
                  key={v}
                  variant="outline"
                  size="sm"
                  className="h-6 text-xs px-2"
                  onClick={() => insertVariable(v)}
                  type="button"
                >
                  {v}
                </Button>
              ))}
            </div>
          </div>

          {/* Body */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Body</label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your template content..."
              className="min-h-[160px] font-mono text-sm"
            />
          </div>

          {/* Tags */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Tags</label>
            <div className="flex items-center gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder="Add a tag"
                className="flex-1"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    addTag()
                  }
                }}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={addTag}
                type="button"
              >
                Add
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs gap-1">
                    {tag}
                    <button
                      onClick={() => removeTag(tag)}
                      className="ml-0.5 hover:text-destructive"
                    >
                      <X className="h-3 w-3" aria-hidden="true" />
                      <span className="sr-only">Remove {tag}</span>
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? "Saving..." : isEdit ? "Update" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
