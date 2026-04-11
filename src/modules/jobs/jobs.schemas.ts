import { z } from 'zod'

export const locationAddressSchema = z.object({
  line1: z.string().optional(),
  line2: z.string().optional(),
  city: z.string().optional(),
  county: z.string().optional(),
  postcode: z.string().optional(),
  country: z.string().optional(),
})

export const jobStatusSchema = z.enum([
  'PENDING', 'APPROVED', 'REJECTED', 'RESERVED', 'RELEASED',
  'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW'
])

// Backward-compat alias
export const bookingStatusSchema = jobStatusSchema

export const bookingSourceSchema = z.enum(['ADMIN', 'PORTAL', 'PHONE', 'WALK_IN', 'API'])

export const locationTypeSchema = z.enum(['VENUE', 'CUSTOMER_HOME', 'CUSTOMER_WORK', 'OTHER'])

export const jobTypeSchema = z.enum(['APPOINTMENT', 'CLASS', 'TEAM_JOB', 'ROUTE_JOB', 'RECURRING_INSTANCE', 'PROJECT_TASK'])

export const pricingStrategySchema = z.enum(['FIXED', 'TIERED', 'QUOTED', 'FORMULA', 'TIME_AND_MATERIALS', 'RETAINER'])

export const createJobSchema = z.object({
  customerId: z.string().uuid(),
  serviceId: z.string().uuid(),
  staffId: z.string().uuid().optional().nullable(),
  venueId: z.string().uuid().optional().nullable(),
  scheduledDate: z.date(),
  scheduledTime: z.string().regex(/^\d{2}:\d{2}$/),
  durationMinutes: z.number().min(5),
  locationType: locationTypeSchema.default('VENUE'),
  locationAddress: locationAddressSchema.optional().nullable(),
  price: z.number().optional().nullable(),
  customServiceName: z.string().optional().nullable(),
  customerNotes: z.string().optional().nullable(),
  adminNotes: z.string().optional().nullable(),
  source: bookingSourceSchema.default('ADMIN'),
  slotId: z.string().uuid().optional(),
  staffIds: z.array(z.string().uuid()).optional(),
  skipReservation: z.boolean().optional().default(false),
  type: jobTypeSchema.optional(),
  pricingStrategy: pricingStrategySchema.optional(),
})

// Backward-compat alias
export const createBookingSchema = createJobSchema

export const updateJobSchema = z.object({
  id: z.string().uuid(),
  staffId: z.string().uuid().optional().nullable(),
  venueId: z.string().uuid().optional().nullable(),
  scheduledDate: z.date().optional(),
  scheduledTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  durationMinutes: z.number().min(5).optional(),
  locationType: locationTypeSchema.optional(),
  locationAddress: locationAddressSchema.optional().nullable(),
  price: z.number().optional().nullable(),
  customerNotes: z.string().optional().nullable(),
  adminNotes: z.string().optional().nullable(),
  slotId: z.string().uuid().optional(),
  staffIds: z.array(z.string().uuid()).optional(),
  resourceId: z.string().uuid().optional().nullable(),
})

// Backward-compat alias
export const updateBookingSchema = updateJobSchema

export const cancelJobSchema = z.object({
  id: z.string().uuid(),
  reason: z.string().optional(),
})

// Backward-compat alias
export const cancelBookingSchema = cancelJobSchema

export const listJobsSchema = z.object({
  status: jobStatusSchema.optional(),
  staffId: z.string().uuid().optional(),
  resourceId: z.string().uuid().optional(),
  customerId: z.string().uuid().optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  search: z.string().optional(),
  limit: z.number().min(1).max(100).default(50),
  cursor: z.string().uuid().optional(),
})

// Backward-compat alias
export const listBookingsSchema = listJobsSchema

export const calendarJobsSchema = z.object({
  startDate: z.date(),
  endDate: z.date(),
  staffId: z.string().uuid().optional(),
})

// Backward-compat alias
export const calendarBookingsSchema = calendarJobsSchema

// Portal booking schemas
export const createPortalBookingSchema = z.object({
  slug: z.string(),
  serviceId: z.string().uuid(),
  staffId: z.string().uuid().optional(),
  scheduledDate: z.string(), // ISO date string from portal
  scheduledTime: z.string().regex(/^\d{2}:\d{2}$/),
  slotId: z.string().uuid(),
  locationType: z.enum(['VENUE', 'CUSTOMER_HOME']).default('VENUE'),
  locationAddress: locationAddressSchema.optional(),
  customer: z.object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    email: z.string().email(),
    phone: z.string().optional(),
  }),
  formResponses: z.record(z.string(), z.string()).optional(),
  skipReservation: z.boolean().optional().default(false),
})

export const confirmReservationSchema = z.object({
  bookingId: z.string().uuid(),
  customerEmail: z.string().email(),
  token: z.string().length(64).optional(), // optional 64-char hex token - sha256 of server-generated secret
})

// Slot availability schemas
export const getSlotsForDateSchema = z.object({
  slug: z.string(),
  date: z.string(), // ISO date string
  serviceId: z.string().uuid().optional(),
  staffId: z.string().uuid().optional(),
})

export const getSlotsForDateRangeSchema = z.object({
  slug: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  serviceId: z.string().uuid().optional(),
})

// Approval schemas
export const approveBookingSchema = z.object({
  bookingId: z.string().uuid(),
  notes: z.string().optional(),
})

export const rejectBookingSchema = z.object({
  bookingId: z.string().uuid(),
  reason: z.string().min(1),
})

export const bulkApproveSchema = z.object({
  bookingIds: z.array(z.string().uuid()).min(1),
  notes: z.string().optional(),
})

// Completion schemas
export const createCompletionSchema = z.object({
  bookingId: z.string().uuid(),
  completedAt: z.date().optional(),
  notes: z.string().optional(),
  rating: z.number().min(1).max(5).optional(),
  followUpRequired: z.boolean().optional().default(false),
  followUpNotes: z.string().optional(),
  productsUsed: z.array(z.string()).optional(),
  nextAppointmentDate: z.date().optional(),
})
