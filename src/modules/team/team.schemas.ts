import { z } from 'zod'

const dateRegex = /^\d{4}-\d{2}-\d{2}$/
const timeRegex = /^\d{2}:\d{2}$/

// ---------------------------------------------------------------------------
// Availability
// ---------------------------------------------------------------------------

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

export const getScheduleSchema = z.object({
  userId: z.string(),
  date: z.string().regex(dateRegex),
  timezone: z.string().optional(),
})

// ---------------------------------------------------------------------------
// Staff CRUD
// ---------------------------------------------------------------------------

export const createStaffSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  phone: z.string().optional(),
  employeeType: z.enum(['EMPLOYED', 'SELF_EMPLOYED', 'CONTRACTOR']).optional(),
  hourlyRate: z.number().optional(),
  jobTitle: z.string().optional(),
  departmentId: z.string().optional(),
})

export const updateStaffSchema = z.object({
  id: z.string(),
  email: z.string().email().optional(),
  name: z.string().min(1).optional(),
  phone: z.string().optional(),
  employeeType: z.enum(['EMPLOYED', 'SELF_EMPLOYED', 'CONTRACTOR']).optional(),
  hourlyRate: z.number().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).optional(),
  jobTitle: z.string().optional(),
  bio: z.string().max(2000).optional(),
  reportsTo: z.string().nullable().optional(),
  emergencyContactName: z.string().nullable().optional(),
  emergencyContactPhone: z.string().nullable().optional(),
  emergencyContactRelation: z.string().nullable().optional(),
  addressLine1: z.string().nullable().optional(),
  addressLine2: z.string().nullable().optional(),
  addressCity: z.string().nullable().optional(),
  addressPostcode: z.string().nullable().optional(),
  addressCountry: z.string().nullable().optional(),
})

export const listStaffSchema = z.object({
  search: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).optional(),
  employeeType: z.enum(['EMPLOYED', 'SELF_EMPLOYED', 'CONTRACTOR']).optional(),
  departmentId: z.string().optional(),
  limit: z.number().int().max(100).default(50),
  cursor: z.string().optional(),
})

// ---------------------------------------------------------------------------
// Departments
// ---------------------------------------------------------------------------

export const createDepartmentSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  parentId: z.string().optional(),
  managerId: z.string().optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
})

export const updateDepartmentSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
  parentId: z.string().nullable().optional(),
  managerId: z.string().nullable().optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable().optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
})

export const departmentMemberSchema = z.object({
  userId: z.string(),
  departmentId: z.string(),
  isPrimary: z.boolean().default(false),
})

// ---------------------------------------------------------------------------
// Notes
// ---------------------------------------------------------------------------

export const createNoteSchema = z.object({
  userId: z.string(),
  content: z.string().min(1).max(5000),
})

export const updateNoteSchema = z.object({
  noteId: z.string(),
  content: z.string().min(1).max(5000).optional(),
  isPinned: z.boolean().optional(),
})

export const listNotesSchema = z.object({
  userId: z.string(),
  limit: z.number().int().max(100).default(50),
  cursor: z.string().optional(),
})

// ---------------------------------------------------------------------------
// Pay Rates
// ---------------------------------------------------------------------------

export const createPayRateSchema = z.object({
  userId: z.string(),
  rateType: z.enum(['HOURLY', 'DAILY', 'SALARY', 'COMMISSION', 'PIECE_RATE']),
  amount: z.number().positive(),
  currency: z.string().default('GBP'),
  effectiveFrom: z.string().regex(dateRegex),
  reason: z.string().max(255).optional(),
})

export const listPayRatesSchema = z.object({
  userId: z.string(),
})

// ---------------------------------------------------------------------------
// Onboarding / Offboarding Checklists
// ---------------------------------------------------------------------------

export const checklistItemSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  description: z.string().default(''),
  isRequired: z.boolean().default(false),
  order: z.number().int(),
})

export const createChecklistTemplateSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(['ONBOARDING', 'OFFBOARDING']),
  employeeType: z.enum(['EMPLOYED', 'SELF_EMPLOYED', 'CONTRACTOR']).optional(),
  items: z.array(checklistItemSchema).min(1),
  isDefault: z.boolean().default(false),
})

export const updateChecklistTemplateSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(100).optional(),
  items: z.array(checklistItemSchema).min(1).optional(),
  isDefault: z.boolean().optional(),
})

export const completeChecklistItemSchema = z.object({
  progressId: z.string(),
  itemKey: z.string(),
})

export const getChecklistProgressSchema = z.object({
  userId: z.string(),
  type: z.enum(['ONBOARDING', 'OFFBOARDING']).optional(),
})

// ---------------------------------------------------------------------------
// Custom Fields
// ---------------------------------------------------------------------------

export const createCustomFieldDefSchema = z.object({
  fieldKey: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/),
  label: z.string().min(1).max(100),
  fieldType: z.enum(['TEXT', 'NUMBER', 'DATE', 'SELECT', 'MULTI_SELECT', 'BOOLEAN', 'URL', 'EMAIL', 'PHONE']),
  options: z.array(z.object({ value: z.string(), label: z.string() })).optional(),
  isRequired: z.boolean().default(false),
  showOnCard: z.boolean().default(false),
  showOnProfile: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
  groupName: z.string().max(50).optional(),
})

export const updateCustomFieldDefSchema = z.object({
  id: z.string(),
  label: z.string().min(1).max(100).optional(),
  options: z.array(z.object({ value: z.string(), label: z.string() })).optional(),
  isRequired: z.boolean().optional(),
  showOnCard: z.boolean().optional(),
  showOnProfile: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
  groupName: z.string().max(50).nullable().optional(),
})

export const setCustomFieldValuesSchema = z.object({
  userId: z.string(),
  values: z.array(z.object({
    fieldDefinitionId: z.string(),
    value: z.unknown(),
  })),
})

export const getCustomFieldValuesSchema = z.object({
  userId: z.string(),
})
