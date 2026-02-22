"use client"

import { useState } from "react"
import { Trash2, AlertCircle } from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { TriggerConfig } from "./config/trigger-config"
import { EmailConfig } from "./config/email-config"
import { IfConfig } from "./config/if-config"
import { WebhookConfig } from "./config/webhook-config"
import { VariableConfig } from "./config/variable-config"

export interface NodeConfigPanelProps {
  nodeId: string
  nodeType: string
  config: Record<string, unknown>
  onSave: (config: Record<string, unknown>) => void
  onDelete: (nodeId: string) => void
  onClose: () => void
}

/**
 * Node configuration panel rendered as a right-side sheet.
 * Dynamically renders type-specific config components.
 * Includes save/cancel buttons and delete action with confirmation.
 */
export function NodeConfigPanel({
  nodeId,
  nodeType,
  config,
  onSave,
  onDelete,
  onClose,
}: NodeConfigPanelProps) {
  const [localConfig, setLocalConfig] = useState<Record<string, unknown>>(config)
  const [isDirty, setIsDirty] = useState(false)

  const handleConfigChange = (updatedConfig: Record<string, unknown>) => {
    setLocalConfig(updatedConfig)
    setIsDirty(true)
  }

  const handleSave = () => {
    onSave(localConfig)
    setIsDirty(false)
    onClose()
  }

  const handleCancel = () => {
    setLocalConfig(config)
    setIsDirty(false)
    onClose()
  }

  const handleDelete = () => {
    onDelete(nodeId)
    onClose()
  }

  /**
   * Renders type-specific config component based on nodeType.
   * Add new node types and their config components here.
   */
  const renderConfigComponent = () => {
    switch (nodeType) {
      // Trigger node
      case "TRIGGER":
        return (
          <TriggerConfig
            config={localConfig as any}
            onChange={(cfg) => handleConfigChange(cfg as unknown as Record<string, unknown>)}
          />
        )

      // Action nodes - Email
      case "SEND_EMAIL":
      case "EMAIL":
        return (
          <EmailConfig
            config={localConfig as any}
            onChange={(cfg) => handleConfigChange(cfg as unknown as Record<string, unknown>)}
          />
        )

      // Action nodes - SMS
      case "SEND_SMS":
      case "SMS":
        return (
          <div className="p-4 rounded-lg bg-muted/50 text-sm text-muted-foreground">
            SMS configuration coming soon
          </div>
        )

      // Action nodes - Webhook
      case "WEBHOOK":
        return (
          <WebhookConfig
            config={localConfig as any}
            onChange={(cfg) => handleConfigChange(cfg as unknown as Record<string, unknown>)}
          />
        )

      // Action nodes - Booking operations
      case "CREATE_BOOKING":
        return (
          <div className="p-4 rounded-lg bg-muted/50 text-sm text-muted-foreground">
            Create booking configuration coming soon
          </div>
        )

      case "UPDATE_BOOKING":
        return (
          <div className="p-4 rounded-lg bg-muted/50 text-sm text-muted-foreground">
            Update booking configuration coming soon
          </div>
        )

      // Action nodes - Notifications
      case "SEND_NOTIFICATION":
        return (
          <div className="p-4 rounded-lg bg-muted/50 text-sm text-muted-foreground">
            Send notification configuration coming soon
          </div>
        )

      // Action nodes - Logging
      case "LOG_MESSAGE":
        return (
          <div className="p-4 rounded-lg bg-muted/50 text-sm text-muted-foreground">
            Log message configuration coming soon
          </div>
        )

      // Control flow - If/Switch
      case "IF":
        return (
          <IfConfig
            config={localConfig as any}
            onChange={(cfg) => handleConfigChange(cfg as unknown as Record<string, unknown>)}
          />
        )

      case "SWITCH":
        return (
          <div className="p-4 rounded-lg bg-muted/50 text-sm text-muted-foreground">
            Switch configuration coming soon
          </div>
        )

      // Control flow - Loop
      case "LOOP":
      case "LOOP_END":
        return (
          <div className="p-4 rounded-lg bg-muted/50 text-sm text-muted-foreground">
            Loop configuration coming soon
          </div>
        )

      // Control flow - Wait operations
      case "WAIT_UNTIL":
        return (
          <div className="p-4 rounded-lg bg-muted/50 text-sm text-muted-foreground">
            Wait until configuration coming soon
          </div>
        )

      case "WAIT_FOR_EVENT":
        return (
          <div className="p-4 rounded-lg bg-muted/50 text-sm text-muted-foreground">
            Wait for event configuration coming soon
          </div>
        )

      // Control flow - Merge/Stop/Error
      case "MERGE":
        return (
          <div className="p-4 rounded-lg bg-muted/50 text-sm text-muted-foreground">
            Merge configuration coming soon
          </div>
        )

      case "STOP":
        return (
          <div className="p-4 rounded-lg bg-muted/50 text-sm text-muted-foreground">
            Stop configuration coming soon
          </div>
        )

      case "ERROR":
        return (
          <div className="p-4 rounded-lg bg-muted/50 text-sm text-muted-foreground">
            Error handler configuration coming soon
          </div>
        )

      // Transform operations
      case "SET_VARIABLE":
        return (
          <VariableConfig
            config={localConfig as any}
            onChange={(cfg) => handleConfigChange(cfg as unknown as Record<string, unknown>)}
          />
        )

      case "FILTER":
        return (
          <div className="p-4 rounded-lg bg-muted/50 text-sm text-muted-foreground">
            Filter configuration coming soon
          </div>
        )

      case "TRANSFORM":
        return (
          <div className="p-4 rounded-lg bg-muted/50 text-sm text-muted-foreground">
            Transform configuration coming soon
          </div>
        )

      case "EXECUTE_WORKFLOW":
        return (
          <div className="p-4 rounded-lg bg-muted/50 text-sm text-muted-foreground">
            Execute workflow configuration coming soon
          </div>
        )

      default:
        return (
          <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 flex items-start gap-3">
            <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800 dark:text-amber-200">
              <p className="font-medium">Unknown node type</p>
              <p className="mt-0.5">No configuration available for "{nodeType}"</p>
            </div>
          </div>
        )
    }
  }

  return (
    <Sheet open onOpenChange={(open) => { if (!open) handleCancel() }}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md flex flex-col p-0"
        aria-label={`Configure ${nodeType} node`}
      >
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border shrink-0">
          <SheetTitle className="text-lg font-semibold">
            Node Configuration
          </SheetTitle>
          <SheetDescription className="text-sm text-muted-foreground">
            {nodeType} • ID: {nodeId}
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="px-6 py-4 space-y-6">
            {renderConfigComponent()}
          </div>
        </ScrollArea>

        <div className="border-t border-border shrink-0">
          {/* Delete button section */}
          <div className="px-6 py-4 border-b border-border">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="w-full gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  Delete Node
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete node?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently remove this {nodeType} node from the workflow.
                    Any connected edges will also be removed. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={handleDelete}
                  >
                    Delete Node
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          {/* Save/Cancel buttons */}
          <SheetFooter className="px-6 py-4 flex-row justify-between gap-2">
            <Button
              variant="outline"
              onClick={handleCancel}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!isDirty}
              className="flex-1"
            >
              Save Changes
            </Button>
          </SheetFooter>
        </div>
      </SheetContent>
    </Sheet>
  )
}
