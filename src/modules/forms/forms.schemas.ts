import { z } from 'zod'

export const formFieldValidationSchema = z.object({
  minLength: z.number().optional(),
  maxLength: z.number().optional(),
  pattern: z.string().optional(),
  min: z.string().optional(),
  max: z.string().optional(),
})

export const formFieldSchema = z.object({
  id: z.string(),
  type: z.enum(['TEXT', 'TEXTAREA', 'SELECT', 'MULTISELECT', 'DATE', 'BOOLEAN', 'EMAIL', 'PHONE']),
  label: z.string().min(1),
  required: z.boolean(),
  placeholder: z.string().optional(),
  options: z.array(z.string()).optional(),
  validation: formFieldValidationSchema.optional(),
})

export const createTemplateSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  fields: z.array(formFieldSchema).min(1),
  isActive: z.boolean().optional(),
  attachedServices: z.array(z.string()).optional().nullable(),
  sendTiming: z.enum(['IMMEDIATE', 'BEFORE_APPOINTMENT', 'AFTER_APPOINTMENT']).default('IMMEDIATE'),
  sendOffsetHours: z.number().optional().nullable(),
  requiresSignature: z.boolean().default(false),
  // Scope this template to a single engagement (per-client clone). NULL/undefined = master library.
  engagementId: z.string().uuid().optional().nullable(),
  slug: z.string().optional().nullable(),
})

export const updateTemplateSchema = z.object({
  id: z.string(),
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  fields: z.array(formFieldSchema).min(1).optional(),
  isActive: z.boolean().optional(),
  attachedServices: z.array(z.string()).optional().nullable(),
  sendTiming: z.enum(['IMMEDIATE', 'BEFORE_APPOINTMENT', 'AFTER_APPOINTMENT']).optional(),
  sendOffsetHours: z.number().optional().nullable(),
  requiresSignature: z.boolean().optional(),
})

export const listTemplatesSchema = z.object({
  search: z.string().optional(),
  isActive: z.boolean().optional(),
  limit: z.number().default(50),
  cursor: z.string().optional(),
  /**
   * When set, returns engagement-scoped templates for that engagement PLUS master
   * library templates (engagementId IS NULL) on the Ironheart tenant. The consultant
   * /platform/forms list passes no engagementId — they get the master library
   * + all engagement-scoped clones across all engagements on the Ironheart tenant.
   */
  engagementId: z.string().uuid().optional(),
  // When true (default), templates are scoped to the Ironheart tenant regardless of caller's ctx.tenantId.
  // Set false to fetch only the caller's own tenant templates.
  includeIronheartLibrary: z.boolean().optional(),
})

export const duplicateTemplateSchema = z.object({
  sourceTemplateId: z.string().uuid(),
  engagementId: z.string().uuid(),
  name: z.string().min(1),
})

export const sendFormSchema = z.object({
  templateId: z.string(),
  bookingId: z.string().optional(),
  customerId: z.string().optional(),
})

export const submitFormSchema = z.object({
  token: z.string(),
  responses: z.record(z.string(), z.unknown()),
})

export const listResponsesSchema = z.object({
  templateId: z.string().optional(),
  bookingId: z.string().optional(),
  customerId: z.string().optional(),
  status: z.enum(['PENDING', 'SENT', 'COMPLETED', 'EXPIRED']).optional(),
  limit: z.number().default(50),
  cursor: z.string().optional(),
  /**
   * Scope responses to a single engagement. Matches via two paths (UNIONed):
   *   1. completed_forms.templateId → form_templates where engagementId = ?
   *      (engagement-scoped clones — per-client templates)
   *   2. engagement_org_chart.formSendId → completed_forms.id where
   *      engagement_org_chart.engagementId = ?
   *      (forms sent from the master library where no per-node extras existed)
   * Both paths are needed because handleOnboardingPlanApproved only CLONES the
   * template when bespoke extras exist; otherwise the master template is used
   * and the engagement link lives only on org_chart_node.formSendId.
   */
  engagementId: z.string().uuid().optional(),
})
