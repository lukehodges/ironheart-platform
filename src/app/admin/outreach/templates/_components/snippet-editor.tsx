"use client"

import { useEffect, useState } from "react"
import { api } from "@/lib/trpc/react"
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
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import type { OutreachSnippetRecord } from "@/modules/outreach/outreach.types"

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SNIPPET_CATEGORIES = [
  { value: "case-study", label: "Case Study" },
  { value: "cta", label: "CTA" },
  { value: "social-proof", label: "Social Proof" },
  { value: "break-up-closer", label: "Break-up Closer" },
  { value: "objection-handler", label: "Objection Handler" },
  { value: "intro-hook", label: "Intro Hook" },
  { value: "custom", label: "Custom" },
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface SnippetEditorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  snippet: OutreachSnippetRecord | null
}

export function SnippetEditor({ open, onOpenChange, snippet }: SnippetEditorProps) {
  const isEdit = snippet !== null

  const [name, setName] = useState("")
  const [category, setCategory] = useState("custom")
  const [body, setBody] = useState("")

  const utils = api.useUtils()

  // Populate form from snippet prop (or reset for create)
  useEffect(() => {
    if (snippet) {
      setName(snippet.name)
      setCategory(snippet.category)
      setBody(snippet.bodyMarkdown)
    } else {
      setName("")
      setCategory("custom")
      setBody("")
    }
  }, [snippet, open])

  const createMutation = api.outreach.createSnippet.useMutation({
    onSuccess: () => {
      void utils.outreach.listSnippets.invalidate()
      onOpenChange(false)
      toast.success("Snippet created")
    },
    onError: (err) => toast.error(err.message),
  })

  const updateMutation = api.outreach.updateSnippet.useMutation({
    onSuccess: () => {
      void utils.outreach.listSnippets.invalidate()
      onOpenChange(false)
      toast.success("Snippet updated")
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
        snippetId: snippet.id,
        name: name.trim(),
        category,
        bodyMarkdown: body,
      })
    } else {
      createMutation.mutate({
        name: name.trim(),
        category,
        bodyMarkdown: body,
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Snippet" : "New Snippet"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update this content snippet"
              : "Create a new reusable content snippet"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Name */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. ROI case study - fintech"
            />
          </div>

          {/* Category pills */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Category</label>
            <div className="flex items-center gap-1.5 flex-wrap">
              {SNIPPET_CATEGORIES.map((cat) => (
                <Button
                  key={cat.value}
                  variant={category === cat.value ? "default" : "outline"}
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setCategory(cat.value)}
                  type="button"
                >
                  {cat.label}
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
              placeholder="Write your snippet content..."
              className="min-h-[120px] font-mono text-sm"
            />
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
