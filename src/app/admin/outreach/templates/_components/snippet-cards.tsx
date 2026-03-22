"use client"

import { useState } from "react"
import { api } from "@/lib/trpc/react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Pencil, ClipboardCopy, Trash2, Scissors } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { SnippetEditor } from "./snippet-editor"
import type { OutreachSnippetRecord } from "@/modules/outreach/outreach.types"

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CATEGORY_COLORS: Record<string, string> = {
  "case-study": "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  cta: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  "social-proof": "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  "break-up-closer": "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  "objection-handler": "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  "intro-hook": "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
  custom: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface SnippetCardsProps {
  showNew: boolean
  onShowNewChange: (show: boolean) => void
}

export function SnippetCards({ showNew, onShowNewChange }: SnippetCardsProps) {
  const [editingSnippet, setEditingSnippet] = useState<OutreachSnippetRecord | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const utils = api.useUtils()

  const snippetsQuery = api.outreach.listSnippets.useQuery({})
  const snippets = snippetsQuery.data ?? []

  const deleteMutation = api.outreach.deleteSnippet.useMutation({
    onSuccess: () => {
      void utils.outreach.listSnippets.invalidate()
      setConfirmDeleteId(null)
      toast.success("Snippet deleted")
    },
    onError: (err) => toast.error(err.message),
  })

  async function copySnippet(body: string) {
    try {
      await navigator.clipboard.writeText(body)
      toast.success("Copied to clipboard")
    } catch {
      toast.error("Failed to copy")
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <>
      {/* Loading */}
      {snippetsQuery.isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4 space-y-3">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-12 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!snippetsQuery.isLoading && snippets.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Scissors className="h-10 w-10 text-muted-foreground/50 mb-3" aria-hidden="true" />
            <p className="text-sm font-medium text-muted-foreground">No snippets found</p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Create your first snippet to get started
            </p>
          </CardContent>
        </Card>
      )}

      {/* Card grid */}
      {!snippetsQuery.isLoading && snippets.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {snippets.map((s) => (
            <Card key={s.id} className="group relative hover:shadow-md transition-shadow">
              <CardContent className="p-4 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-medium leading-tight line-clamp-1">{s.name}</h3>
                  <Badge
                    variant="secondary"
                    className={cn(
                      "shrink-0 text-[10px] px-1.5 py-0",
                      CATEGORY_COLORS[s.category] ?? CATEGORY_COLORS.custom
                    )}
                  >
                    {s.category}
                  </Badge>
                </div>

                <p className="text-xs text-muted-foreground/80 line-clamp-3">
                  {s.bodyMarkdown.length > 120
                    ? `${s.bodyMarkdown.slice(0, 120)}...`
                    : s.bodyMarkdown}
                </p>

                {/* Hover actions */}
                <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => setEditingSnippet(s)}
                  >
                    <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                    <span className="sr-only">Edit</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => void copySnippet(s.bodyMarkdown)}
                  >
                    <ClipboardCopy className="h-3.5 w-3.5" aria-hidden="true" />
                    <span className="sr-only">Copy</span>
                  </Button>
                  {confirmDeleteId === s.id ? (
                    <Button
                      variant="destructive"
                      size="sm"
                      className="h-7 text-xs px-2"
                      onClick={() => deleteMutation.mutate({ snippetId: s.id })}
                      disabled={deleteMutation.isPending}
                    >
                      Confirm
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                      onClick={() => setConfirmDeleteId(s.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      <span className="sr-only">Delete</span>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create editor */}
      <SnippetEditor
        open={showNew}
        onOpenChange={onShowNewChange}
        snippet={null}
      />

      {/* Edit editor */}
      <SnippetEditor
        open={editingSnippet !== null}
        onOpenChange={(open) => {
          if (!open) setEditingSnippet(null)
        }}
        snippet={editingSnippet}
      />
    </>
  )
}
