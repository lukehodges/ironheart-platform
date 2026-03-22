"use client"

import { useState } from "react"
import { api } from "@/lib/trpc/react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Pencil, Copy, Trash2, FileText } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { TemplateEditor } from "./template-editor"
import type { OutreachTemplateRecord, OutreachTemplateCategory } from "@/modules/outreach/outreach.types"

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CATEGORIES: { value: OutreachTemplateCategory | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "intro", label: "Intro" },
  { value: "follow-up", label: "Follow-up" },
  { value: "break-up", label: "Break-up" },
  { value: "case-study", label: "Case Study" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "custom", label: "Custom" },
]

const CATEGORY_COLORS: Record<string, string> = {
  intro: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  "follow-up": "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  "break-up": "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  "case-study": "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  linkedin: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
  custom: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface TemplateCardsProps {
  showNew: boolean
  onShowNewChange: (show: boolean) => void
}

export function TemplateCards({ showNew, onShowNewChange }: TemplateCardsProps) {
  const [selectedCategory, setSelectedCategory] = useState<OutreachTemplateCategory | "all">("all")
  const [editingTemplate, setEditingTemplate] = useState<OutreachTemplateRecord | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const utils = api.useUtils()

  const templatesQuery = api.outreach.listTemplates.useQuery(
    selectedCategory === "all" ? {} : { category: selectedCategory }
  )
  const templates = templatesQuery.data ?? []

  const duplicateMutation = api.outreach.duplicateTemplate.useMutation({
    onSuccess: () => {
      void utils.outreach.listTemplates.invalidate()
      toast.success("Template duplicated")
    },
    onError: (err) => toast.error(err.message),
  })

  const deleteMutation = api.outreach.deleteTemplate.useMutation({
    onSuccess: () => {
      void utils.outreach.listTemplates.invalidate()
      setConfirmDeleteId(null)
      toast.success("Template deleted")
    },
    onError: (err) => toast.error(err.message),
  })

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <>
      {/* Category filter pills */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {CATEGORIES.map((cat) => (
          <Button
            key={cat.value}
            variant={selectedCategory === cat.value ? "default" : "outline"}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setSelectedCategory(cat.value)}
          >
            {cat.label}
          </Button>
        ))}
      </div>

      {/* Loading */}
      {templatesQuery.isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4 space-y-3">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!templatesQuery.isLoading && templates.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="h-10 w-10 text-muted-foreground/50 mb-3" aria-hidden="true" />
            <p className="text-sm font-medium text-muted-foreground">No templates found</p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Create your first template to get started
            </p>
          </CardContent>
        </Card>
      )}

      {/* Card grid */}
      {!templatesQuery.isLoading && templates.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((t) => (
            <Card key={t.id} className="group relative hover:shadow-md transition-shadow">
              <CardContent className="p-4 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-medium leading-tight line-clamp-1">{t.name}</h3>
                  <Badge
                    variant="secondary"
                    className={cn(
                      "shrink-0 text-[10px] px-1.5 py-0",
                      CATEGORY_COLORS[t.category] ?? CATEGORY_COLORS.custom
                    )}
                  >
                    {t.category}
                  </Badge>
                </div>

                {t.subject && (
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    Subject: {t.subject}
                  </p>
                )}

                <p className="text-xs text-muted-foreground/80 line-clamp-3">
                  {t.bodyMarkdown.length > 120
                    ? `${t.bodyMarkdown.slice(0, 120)}...`
                    : t.bodyMarkdown}
                </p>

                {t.tags && t.tags.length > 0 && (
                  <div className="flex items-center gap-1 flex-wrap">
                    {t.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-[10px] px-1.5 py-0">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Hover actions */}
                <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => setEditingTemplate(t)}
                  >
                    <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                    <span className="sr-only">Edit</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => duplicateMutation.mutate({ templateId: t.id })}
                    disabled={duplicateMutation.isPending}
                  >
                    <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                    <span className="sr-only">Duplicate</span>
                  </Button>
                  {confirmDeleteId === t.id ? (
                    <Button
                      variant="destructive"
                      size="sm"
                      className="h-7 text-xs px-2"
                      onClick={() => deleteMutation.mutate({ templateId: t.id })}
                      disabled={deleteMutation.isPending}
                    >
                      Confirm
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                      onClick={() => setConfirmDeleteId(t.id)}
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
      <TemplateEditor
        open={showNew}
        onOpenChange={onShowNewChange}
        template={null}
      />

      {/* Edit editor */}
      <TemplateEditor
        open={editingTemplate !== null}
        onOpenChange={(open) => {
          if (!open) setEditingTemplate(null)
        }}
        template={editingTemplate}
      />
    </>
  )
}
