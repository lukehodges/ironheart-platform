import { z } from 'zod'

const dateRegex = /^\d{4}-\d{2}-\d{2}$/
const timeRegex = /^\d{2}:\d{2}$/

export const availabilityEntrySchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('RECURRING'),
    dayOfWeek: z.number().int().min(0).max(6),
    startTime: z.string().regex(timeRegex),
    endTime: z.string().regex(timeRegex),
  }),
  z.object({
    type: z.literal('SPECIFIC'),
    specificDate: z.string().regex(dateRegex),
    startTime: z.string().regex(timeRegex),
    endTime: z.string().regex(timeRegex),
  }),
  z.object({
    type: z.literal('BLOCKED'),
    specificDate: z.string().regex(dateRegex),
    endDate: z.string().regex(dateRegex).optional(),
    reason: z.string().max(255).optional(),
    isAllDay: z.boolean().default(true),
  }),
])

export const setAvailabilitySchema = z.object({
  userId: z.string(),
  entries: z.array(availabilityEntrySchema),
  replaceAll: z.boolean().default(false),
})

export const blockDatesSchema = z.object({
  userId: z.string(),
  startDate: z.string().regex(dateRegex),
  endDate: z.string().regex(dateRegex).optional(),
  reason: z.string().optional(),
})

export const getAvailabilitySchema = z.object({
  userId: z.string(),
  startDate: z.string().regex(dateRegex),
  endDate: z.string().regex(dateRegex).optional(),
  timezone: z.string().optional(),
})

export const getCapacitySchema = z.object({
  userId: z.string(),
  startDate: z.string().regex(dateRegex),
  endDate: z.string().regex(dateRegex).optional(),
})

export const setCapacitySchema = z.object({
  userId: z.string(),
  entries: z.array(
    z.object({
      date: z.string().regex(dateRegex),
      maxBookings: z.number().int().min(1),
    })
  ),
})

export const getScheduleSchema = z.object({
  userId: z.string(),
  date: z.string().regex(dateRegex),
  timezone: z.string().optional(),
})

export const createStaffSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  phone: z.string().optional(),
  employeeType: z.enum(['EMPLOYED', 'SELF_EMPLOYED', 'CONTRACTOR']).optional(),
  hourlyRate: z.number().optional(),
  defaultMaxDailyBookings: z.number().int().optional(),
})

export const updateStaffSchema = z.object({
  id: z.string(),
  email: z.string().email().optional(),
  name: z.string().min(1).optional(),
  phone: z.string().optional(),
  employeeType: z.enum(['EMPLOYED', 'SELF_EMPLOYED', 'CONTRACTOR']).optional(),
  hourlyRate: z.number().optional(),
  defaultMaxDailyBookings: z.number().int().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).optional(),
})

export const listStaffSchema = z.object({
  search: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).optional(),
  limit: z.number().int().max(100).default(50),
  cursor: z.string().optional(),
})
