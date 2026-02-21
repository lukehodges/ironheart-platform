import { z } from 'zod'
import { router, tenantProcedure, permissionProcedure, createModuleMiddleware } from '@/shared/trpc'

const moduleGate = createModuleMiddleware('workflow')
const moduleProcedure = tenantProcedure.use(moduleGate)
const modulePermission = (perm: string) => permissionProcedure(perm).use(moduleGate)
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
  list: moduleProcedure
    .input(listWorkflowsSchema)
    .query(({ ctx, input }) => workflowService.listWorkflows(ctx, input)),

  getById: moduleProcedure
    .input(getWorkflowSchema)
    .query(({ ctx, input }) => workflowService.getWorkflow(ctx, input.id)),

  create: modulePermission('workflows:write')
    .input(createWorkflowSchema)
    .mutation(({ ctx, input }) => workflowService.createWorkflow(ctx, input)),

  update: modulePermission('workflows:write')
    .input(updateWorkflowSchema)
    .mutation(({ ctx, input }) => workflowService.updateWorkflow(ctx, input.id, input)),

  delete: modulePermission('workflows:write')
    .input(deleteWorkflowSchema)
    .mutation(({ ctx, input }) => workflowService.deleteWorkflow(ctx, input.id)),

  getExecutions: moduleProcedure
    .input(
      z.object({
        workflowId: z.string().optional(),
        limit: z.number().min(1).max(100).default(20),
        cursor: z.string().optional(),
      })
    )
    .query(({ ctx, input }) => workflowService.getExecutionHistory(ctx, input)),

  validateGraph: moduleProcedure
    .input(validateGraphSchema)
    .mutation(({ input }) =>
      workflowService.validateGraph(input.nodes as any, input.edges as any)
    ),
})

export type WorkflowRouter = typeof workflowRouter
