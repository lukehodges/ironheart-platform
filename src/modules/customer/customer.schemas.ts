import { z } from 'zod'

export const addressSchema = z.object({
  line1: z.string().optional(),
  line2: z.string().optional(),
  city: z.string().optional(),
  county: z.string().optional(),
  postcode: z.string().optional(),
  country: z.string().optional(),
})

export const createCustomerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  dateOfBirth: z.date().optional().nullable(),
  gender: z.string().optional().nullable(),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional().nullable(),
  referralSource: z.string().optional().nullable(),
  address: addressSchema.optional().nullable(),
})

export const updateCustomerSchema = z.object({
  id: z.string(),
  name: z.string().min(1).optional(),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  dateOfBirth: z.date().optional().nullable(),
  gender: z.string().optional().nullable(),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional().nullable(),
  referralSource: z.string().optional().nullable(),
  address: addressSchema.optional().nullable(),
})

export const mergeCustomersSchema = z.object({
  sourceId: z.string(),
  targetId: z.string(),
}).refine(data => data.sourceId !== data.targetId, 'Cannot merge a customer into itself')

export const addNoteSchema = z.object({
  customerId: z.string(),
  content: z.string().min(1).max(5000),
  noteType: z.enum(['GENERAL', 'MEDICAL', 'PREFERENCE', 'COMPLAINT', 'FOLLOWUP']).default('GENERAL'),
  isPrivate: z.boolean().default(false),
})

export const listCustomersSchema = z.object({
  search: z.string().optional(),
  tags: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
  limit: z.number().int().max(100).default(50),
  cursor: z.string().optional(),
})

export const contactRoleEnum = z.enum(['PRIMARY', 'BILLING', 'SITE_CONTACT', 'GUARDIAN', 'EMERGENCY'])

export const createContactSchema = z.object({
  customerId: z.string().uuid(),
  name: z.string().min(1).max(200),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  role: contactRoleEnum,
  receivesNotifications: z.boolean().optional().default(false),
})

export const updateContactSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  role: contactRoleEnum.optional(),
  receivesNotifications: z.boolean().optional(),
})

