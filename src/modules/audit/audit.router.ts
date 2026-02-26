import {
  router,
  tenantProcedure,
  permissionProcedure,
} from '@/shared/trpc'
import { auditService } from './audit.service'
import { tenantService } from '@/modules/tenant/tenant.service'
import { listAuditLogsSchema, exportCsvSchema } from './audit.schemas'

export const auditRouter = router({
  /**
   * Paginated list of audit log entries with optional filters.
   * Requires `audit:read` permission.
   */
  list: permissionProcedure('audit:read')
    .input(listAuditLogsSchema)
    .query(({ ctx, input }) =>
      auditService.list(ctx.tenantId, input)
    ),

  /**
   * Export audit logs as a CSV string.
   * Requires `audit:read` permission.
   */
  exportCsv: permissionProcedure('audit:read')
    .input(exportCsvSchema)
    .mutation(({ ctx, input }) =>
      auditService.exportCsv(ctx.tenantId, input)
    ),

  /**
   * Get available filter options for the audit log UI.
   * Uses the module registry to derive resource types from enabled modules.
   * Requires tenant auth only (no special permission).
   */
  getFilterOptions: tenantProcedure.query(async ({ ctx }) => {
    const modules = await tenantService.listModules(ctx)
    const enabledSlugs = modules
      .filter((m) => m.isEnabled)
      .map((m) => m.moduleSlug)

    return auditService.getFilterOptions(enabledSlugs)
  }),
})

export type AuditRouter = typeof auditRouter
