import { z } from 'zod'

export const resourceTypeEnum = z.enum(['PERSON', 'VEHICLE', 'ROOM', 'EQUIPMENT', 'VIRTUAL'])

export const createResourceSchema = z.object({
  type: resourceTypeEnum,
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(100).optional(),
  capacity: z.number().int().min(1).max(1000).default(1),
  travelEnabled: z.boolean().optional().default(false),
  skillTags: z.array(z.string()).optional(),
  userId: z.string().uuid().optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export const updateResourceSchema = createResourceSchema
  .partial()
  .extend({
    isActive: z.boolean().optional(),
    homeAddressId: z.string().uuid().optional().nullable(),
  })

export const listResourcesSchema = z.object({
  type: resourceTypeEnum.optional(),
  isActive: z.boolean().optional(),
  limit: z.number().int().max(100).default(50),
  cursor: z.string().optional(),
})

export const listAvailableSchema = z.object({
  date: z.string(),          // ISO date string
  startTime: z.string(),     // "HH:MM"
  endTime: z.string(),       // "HH:MM"
  skillTags: z.array(z.string()).optional(),
  type: resourceTypeEnum.optional(),
})
