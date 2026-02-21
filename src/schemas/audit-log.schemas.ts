import { z } from 'zod';

export const auditLogFiltersSchema = z.object({
  resourceType: z.string().optional(),
  actorId: z.uuid().optional(),
  action: z.enum(['created', 'updated', 'deleted']).optional(),
  from: z.date().optional(),
  to: z.date().optional(),
  limit: z.number().int().min(1).max(100).default(50),
  cursor: z.string().optional(),
});

export type AuditLogFiltersInput = z.infer<typeof auditLogFiltersSchema>;
