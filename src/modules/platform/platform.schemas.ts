import { z } from 'zod'

const tenantPlanSchema = z.enum(['TRIAL', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE'])

const tenantStatusSchema = z.enum(['ACTIVE', 'SUSPENDED', 'CANCELLED', 'PENDING'])

export const createTenantSchema = z.object({
  businessName: z.string().min(1).max(255),
  email: z.string().email(),
  plan: tenantPlanSchema.default('TRIAL'),
  slug: z.string().min(2).max(63).regex(/^[a-z0-9-]+$/).optional(),
})

export const updateTenantSchema = z.object({
  id: z.string(),
  businessName: z.string().min(1).max(255).optional(),
  email: z.string().email().optional(),
  status: tenantStatusSchema.optional(),
})

export const changePlanSchema = z.object({
  tenantId: z.string(),
  plan: tenantPlanSchema,
  reason: z.string().max(500).optional(),
})

export const listTenantsSchema = z.object({
  search: z.string().optional(),
  plan: tenantPlanSchema.optional(),
  status: tenantStatusSchema.optional(),
  limit: z.number().default(50),
  cursor: z.string().optional(),
})

export const setFlagSchema = z.object({
  flagSlug: z.string(),
  defaultEnabled: z.boolean(),
})

export const setTenantFlagSchema = z.object({
  tenantId: z.string(),
  flagSlug: z.string(),
  isEnabled: z.boolean(),
})

export const auditLogQuerySchema = z.object({
  tenantId: z.string().optional(),
  action: z.string().optional(),
  entityType: z.string().optional(),
  severity: z.enum(['INFO', 'WARNING', 'CRITICAL']).optional(),
  limit: z.number().default(50),
  cursor: z.string().optional(),
})

export const approveSignupSchema = z.object({
  id: z.string(),
})

export const rejectSignupSchema = z.object({
  id: z.string(),
  reason: z.string().min(1),
})

export const suspendTenantSchema = z.object({
  id: z.string(),
  reason: z.string().min(1),
})

export const listTenantFlagsSchema = z.object({
  tenantId: z.string(),
})

export const setTenantModuleSchema = z.object({
  tenantId: z.string(),
  moduleId: z.string(),
  isEnabled: z.boolean(),
  monthlyRate: z.number().min(0).optional(),
})

export const startImpersonationSchema = z.object({
  tenantId: z.string(),
})
