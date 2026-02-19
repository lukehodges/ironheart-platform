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
})
