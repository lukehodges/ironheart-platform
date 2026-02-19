import { z } from 'zod'
import { router, tenantProcedure, permissionProcedure } from '@/shared/trpc'
import { workflowService } from './workflow.service'
import {
  listWorkflowsSchema,
  getWorkflowSchema,
  createWorkflowSchema,
  updateWorkflowSchema,
  deleteWorkflowSchema,
  validateGraphSchema,
} from './workflow.schemas'

/**
 * Workflow router.
 * Thin layer: validate → call service → return result.
 * No business logic here.
 *
 * Read operations: tenantProcedure (auth + tenant context required)
 * Write operations: permissionProcedure('workflows:write') (RBAC gated)
 */
export const workflowRouter = router({
  list: tenantProcedure
    .input(listWorkflowsSchema)
    .query(({ ctx, input }) => workflowService.listWorkflows(ctx, input)),

  getById: tenantProcedure
    .input(getWorkflowSchema)
    .query(({ ctx, input }) => workflowService.getWorkflow(ctx, input.id)),

  create: permissionProcedure('workflows:write')
    .input(createWorkflowSchema)
    .mutation(({ ctx, input }) => workflowService.createWorkflow(ctx, input)),

  update: permissionProcedure('workflows:write')
    .input(updateWorkflowSchema)
    .mutation(({ ctx, input }) => workflowService.updateWorkflow(ctx, input.id, input)),

  delete: permissionProcedure('workflows:write')
    .input(deleteWorkflowSchema)
    .mutation(({ ctx, input }) => workflowService.deleteWorkflow(ctx, input.id)),

  getExecutions: tenantProcedure
    .input(
      z.object({
        workflowId: z.string().optional(),
        limit: z.number().min(1).max(100).default(20),
        cursor: z.string().optional(),
      })
    )
    .query(({ ctx, input }) => workflowService.getExecutionHistory(ctx, input)),

  validateGraph: tenantProcedure
    .input(validateGraphSchema)
    .mutation(({ input }) =>
      workflowService.validateGraph(input.nodes as any, input.edges as any)
    ),
})

export type WorkflowRouter = typeof workflowRouter
