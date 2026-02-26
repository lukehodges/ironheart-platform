"use client"

import { useState } from "react"
import { api } from "@/lib/trpc/react"
import { toast } from "sonner"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { TemplateEditorDialog } from "@/components/settings/template-editor-dialog"
import { Plus, Trash2 } from "lucide-react"
import type { NotificationTriggerWithModule, TemplateListItem } from "@/modules/notification/notification.types"

// Channel badge color mapping
const channelVariant: Record<string, "default" | "secondary" | "info"> = {
  EMAIL: "info",
  SMS: "secondary",
  PUSH: "default",
}

export function NotificationsTab() {
  // ─── State ──────────────────────────────────────────────────────────────────

  const [editorOpen, setEditorOpen] = useState(false)
  const [editorTrigger, setEditorTrigger] = useState<NotificationTriggerWithModule | null>(null)
  const [editorTemplate, setEditorTemplate] = useState<TemplateListItem | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<TemplateListItem | null>(null)

  // ─── Queries ────────────────────────────────────────────────────────────────

  const {
    data: triggers,
    isLoading: triggersLoading,
  } = api.notification.listTriggers.useQuery(undefined, { staleTime: 60_000 })

  const {
    data: templates,
    isLoading: templatesLoading,
  } = api.notification.listTemplates.useQuery({}, { staleTime: 30_000 })

  const utils = api.useUtils()

  // ─── Mutations ──────────────────────────────────────────────────────────────

  const updateMutation = api.notification.updateTemplate.useMutation({
    onSuccess: () => {
      utils.notification.listTemplates.invalidate()
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const deleteMutation = api.notification.deleteTemplate.useMutation({
    onSuccess: () => {
      toast.success("Template deleted")
      utils.notification.listTemplates.invalidate()
      setDeleteTarget(null)
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  // ─── Handlers ───────────────────────────────────────────────────────────────

  const handleAddTemplate = (trigger: NotificationTriggerWithModule) => {
    setEditorTrigger(trigger)
    setEditorTemplate(null)
    setEditorOpen(true)
  }

  const handleEditTemplate = (
    trigger: NotificationTriggerWithModule,
    template: TemplateListItem
  ) => {
    setEditorTrigger(trigger)
    setEditorTemplate(template)
    setEditorOpen(true)
  }

  const handleToggleActive = (template: TemplateListItem) => {
    updateMutation.mutate({
      id: template.id,
      active: !template.active,
    })
  }

  const handleConfirmDelete = () => {
    if (deleteTarget) {
      deleteMutation.mutate({ id: deleteTarget.id })
    }
  }

  // ─── Loading State ──────────────────────────────────────────────────────────

  const isLoading = triggersLoading || templatesLoading

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    )
  }

  // ─── Empty State ────────────────────────────────────────────────────────────

  if (!triggers || triggers.length === 0) {
    return (
      <div className="animate-fade-in">
        <div className="border-2 border-dashed border-border rounded-xl p-12 text-center">
          <p className="text-muted-foreground text-sm">
            No notification triggers registered. Module manifests must declare
            notification triggers to appear here.
          </p>
        </div>
      </div>
    )
  }

  // ─── Group triggers by module ───────────────────────────────────────────────

  const moduleGroups = new Map<string, {
    moduleName: string
    moduleSlug: string
    moduleEnabled: boolean
    triggers: NotificationTriggerWithModule[]
  }>()

  for (const trigger of triggers) {
    const existing = moduleGroups.get(trigger.moduleSlug)
    if (existing) {
      existing.triggers.push(trigger)
    } else {
      moduleGroups.set(trigger.moduleSlug, {
        moduleName: trigger.moduleName,
        moduleSlug: trigger.moduleSlug,
        moduleEnabled: trigger.moduleEnabled,
        triggers: [trigger],
      })
    }
  }

  // Build a lookup map: trigger key -> templates
  const templatesByTrigger = new Map<string, TemplateListItem[]>()
  if (templates) {
    for (const t of templates) {
      const existing = templatesByTrigger.get(t.trigger) ?? []
      existing.push(t)
      templatesByTrigger.set(t.trigger, existing)
    }
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 animate-fade-in">
      {Array.from(moduleGroups.values()).map((group) => (
        <Card
          key={group.moduleSlug}
          className={group.moduleEnabled ? "" : "opacity-50"}
        >
          <CardHeader>
            <div className="flex items-center gap-3">
              <CardTitle>{group.moduleName}</CardTitle>
              {!group.moduleEnabled && (
                <Badge variant="secondary">Module Disabled</Badge>
              )}
            </div>
            <CardDescription>
              {group.moduleEnabled
                ? `Notification triggers for the ${group.moduleName} module`
                : `Enable the ${group.moduleName} module to use these triggers`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {group.triggers.map((trigger) => {
              const triggerTemplates = templatesByTrigger.get(trigger.key) ?? []

              return (
                <div
                  key={trigger.key}
                  className="border border-border rounded-lg p-4 space-y-3"
                >
                  {/* Trigger Header */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold">{trigger.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {trigger.description}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddTemplate(trigger)}
                      disabled={!group.moduleEnabled}
                      className="shrink-0"
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Add Template
                    </Button>
                  </div>

                  {/* Existing Templates */}
                  {triggerTemplates.length > 0 ? (
                    <div className="space-y-2">
                      {triggerTemplates.map((tpl) => (
                        <div
                          key={tpl.id}
                          className="flex items-center justify-between gap-3 bg-muted/50 rounded-md px-3 py-2"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <Badge
                              variant={channelVariant[tpl.channel] ?? "secondary"}
                              className="cursor-pointer shrink-0"
                              onClick={() => handleEditTemplate(trigger, tpl)}
                            >
                              {tpl.channel}
                            </Badge>
                            <button
                              type="button"
                              className="text-sm truncate hover:underline text-left"
                              onClick={() => handleEditTemplate(trigger, tpl)}
                            >
                              {tpl.name}
                            </button>
                            {tpl.isSystem && (
                              <Badge variant="outline" className="text-xs shrink-0">
                                System
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Switch
                              checked={tpl.active}
                              onCheckedChange={() => handleToggleActive(tpl)}
                              aria-label={`Toggle ${tpl.name} active`}
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                              onClick={() => setDeleteTarget(tpl)}
                              aria-label={`Delete ${tpl.name}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="border border-dashed border-border rounded-md p-3 text-center">
                      <p className="text-xs text-muted-foreground">
                        No templates configured. Click "Add Template" to create one.
                      </p>
                    </div>
                  )}
                </div>
              )
            })}
          </CardContent>
        </Card>
      ))}

      {/* Template Editor Dialog */}
      {editorTrigger && (
        <TemplateEditorDialog
          open={editorOpen}
          onOpenChange={setEditorOpen}
          trigger={editorTrigger}
          template={editorTemplate}
          onSuccess={() => {
            utils.notification.listTemplates.invalidate()
          }}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &ldquo;{deleteTarget?.name}&rdquo;?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
