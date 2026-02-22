"use client"

import { api } from "@/lib/trpc/react"
import { toast } from "sonner"

/**
 * Workflow mutations hook
 *
 * Provides mutations for managing workflows:
 * - create: Create a new workflow
 * - update: Update workflow definition and configuration
 * - activate: Enable workflow execution
 * - deactivate: Disable workflow execution
 * - deleteWorkflow: Remove a workflow permanently
 *
 * All mutations include:
 * - onSuccess: Toast notification + cache invalidation
 * - onError: Error toast notification
 *
 * @example
 * ```tsx
 * const mutations = useWorkflowMutations()
 *
 * // Create a new workflow
 * mutations.create.mutate({
 *   name: "New Booking Notification",
 *   triggerEvent: "booking/created",
 *   nodes: [...],
 *   edges: [...]
 * })
 *
 * // Activate workflow
 * mutations.activate.mutate({ id: workflowId })
 * ```
 */
export function useWorkflowMutations() {
  const utils = api.useUtils()

  const create = api.workflow.create.useMutation({
    onSuccess: () => {
      toast.success("Workflow created")
      utils.workflow.list.invalidate()
    },
    onError: (error) => {
      toast.error(`Failed to create workflow: ${error.message}`)
    },
  })

  const update = api.workflow.update.useMutation({
    onSuccess: () => {
      toast.success("Workflow updated")
      utils.workflow.list.invalidate()
    },
    onError: (error) => {
      toast.error(`Failed to update workflow: ${error.message}`)
    },
  })

  const activate = api.workflow.update.useMutation({
    onSuccess: () => {
      toast.success("Workflow activated")
      utils.workflow.list.invalidate()
      utils.workflow.getById.invalidate()
    },
    onError: (error) => {
      toast.error(`Failed to activate workflow: ${error.message}`)
    },
  })

  const deactivate = api.workflow.update.useMutation({
    onSuccess: () => {
      toast.success("Workflow deactivated")
      utils.workflow.list.invalidate()
      utils.workflow.getById.invalidate()
    },
    onError: (error) => {
      toast.error(`Failed to deactivate workflow: ${error.message}`)
    },
  })

  const deleteWorkflow = api.workflow.delete.useMutation({
    onSuccess: () => {
      toast.success("Workflow deleted")
      utils.workflow.list.invalidate()
    },
    onError: (error) => {
      toast.error(`Failed to delete workflow: ${error.message}`)
    },
  })

  return {
    create,
    update,
    activate: {
      ...activate,
      mutate: (input: { id: string }) =>
        activate.mutate({ id: input.id, isActive: true }),
      mutateAsync: (input: { id: string }) =>
        activate.mutateAsync({ id: input.id, isActive: true }),
    },
    deactivate: {
      ...deactivate,
      mutate: (input: { id: string }) =>
        deactivate.mutate({ id: input.id, isActive: false }),
      mutateAsync: (input: { id: string }) =>
        deactivate.mutateAsync({ id: input.id, isActive: false }),
    },
    deleteWorkflow,
  }
}
