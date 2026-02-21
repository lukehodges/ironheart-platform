import { z } from 'zod'

// Filters
export const tenantFiltersSchema = z.object({
  search: z.string().optional(),
  plan: z.enum(['TRIAL', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE']).optional(),
  status: z.enum(['ACTIVE', 'SUSPENDED', 'CANCELLED', 'PENDING']).optional(),
  limit: z.number().int().min(1).max(100).default(50),
  cursor: z.string().optional(),
})

// Create tenant wizard - Step 1
export const businessDetailsSchema = z.object({
  businessName: z.string().min(1, 'Business name required').max(255),
  domain: z
    .string()
    .min(2)
    .max(63)
    .regex(/^[a-z0-9-]+$/, 'Lowercase letters, numbers, hyphens only'),
  industry: z.string().min(1, 'Industry required'),
})

// Create tenant wizard - Step 2
export const selectPlanSchema = z.object({
  plan: z.enum(['TRIAL', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE']),
})

// Create tenant wizard - Step 3
export const adminUserSchema = z.object({
  email: z.string().email('Valid email required'),
  firstName: z.string().min(1, 'First name required').max(100),
  lastName: z.string().min(1, 'Last name required').max(100),
})

// Create tenant wizard - Step 4
export const selectModulesSchema = z.object({
  modules: z.array(z.string()).min(1, 'Select at least one module'),
})

// Complete tenant creation (combines all steps)
export const createTenantCompleteSchema = z.object({
  businessName: z.string().min(1).max(255),
  domain: z.string().min(2).max(63).regex(/^[a-z0-9-]+$/),
  industry: z.string(),
  plan: z.enum(['TRIAL', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE']),
  email: z.string().email(),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  modules: z.array(z.string()),
})

// Tenant actions
export const suspendTenantSchema = z.object({
  tenantId: z.string(),
  reason: z.string().min(1, 'Reason required for suspension'),
})

export const changeTenantPlanSchema = z.object({
  tenantId: z.string(),
  plan: z.enum(['TRIAL', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE']),
  reason: z.string().max(500).optional(),
})

export const toggleTenantModuleSchema = z.object({
  tenantId: z.string(),
  moduleId: z.string(),
  isEnabled: z.boolean(),
})

export const impersonateTenantSchema = z.object({
  tenantId: z.string(),
})

// Platform analytics
export const platformAnalyticsFiltersSchema = z.object({
  from: z.date().optional(),
  to: z.date().optional(),
  preset: z.enum(['7d', '30d', '90d', '12m']).optional(),
})

// Type exports
export type TenantFilters = z.infer<typeof tenantFiltersSchema>
export type BusinessDetailsInput = z.infer<typeof businessDetailsSchema>
export type SelectPlanInput = z.infer<typeof selectPlanSchema>
export type AdminUserInput = z.infer<typeof adminUserSchema>
export type SelectModulesInput = z.infer<typeof selectModulesSchema>
export type CreateTenantCompleteInput = z.infer<typeof createTenantCompleteSchema>
export type SuspendTenantInput = z.infer<typeof suspendTenantSchema>
export type ChangeTenantPlanInput = z.infer<typeof changeTenantPlanSchema>
export type ToggleTenantModuleInput = z.infer<typeof toggleTenantModuleSchema>
export type ImpersonateTenantInput = z.infer<typeof impersonateTenantSchema>
export type PlatformAnalyticsFilters = z.infer<typeof platformAnalyticsFiltersSchema>
