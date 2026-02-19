import { z } from 'zod'

export const createWebhookEndpointSchema = z.object({
  url: z.string().url().startsWith('https://'),
  description: z.string().optional(),
  events: z.array(z.string()).min(1),
})

export const updateWebhookEndpointSchema = z.object({
  id: z.string(),
  url: z.string().url().startsWith('https://').optional(),
  description: z.string().optional().nullable(),
  events: z.array(z.string()).min(1).optional(),
  status: z.enum(['ACTIVE', 'DISABLED']).optional(),
})

export const createApiKeySchema = z.object({
  name: z.string().min(1),
  scopes: z.array(z.string()).min(1),
  expiresAt: z.string().optional().nullable(),
})

export const listWebhookDeliveriesSchema = z.object({
  endpointId: z.string(),
  limit: z.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(),
})
