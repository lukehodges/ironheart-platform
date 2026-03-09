import { z } from 'zod'

// ---------------------------------------------------------------------------
// Audit Module - Zod Schemas for tRPC Input Validation
// ---------------------------------------------------------------------------

/** Schema for paginated audit log listing with optional filters. */
export const listAuditLogsSchema = z.object({
  action: z.string().optional(),
  resourceType: z.string().optional(),
  userId: z.string().optional(),
  dateFrom: z.date().optional(),
  dateTo: z.date().optional(),
  limit: z.number().int().min(1).max(200).default(50),
  cursor: z.string().optional(),
})

/** Schema for CSV export - same filters as listing but no pagination. */
export const exportCsvSchema = z.object({
  action: z.string().optional(),
  resourceType: z.string().optional(),
  userId: z.string().optional(),
  dateFrom: z.date().optional(),
  dateTo: z.date().optional(),
})
