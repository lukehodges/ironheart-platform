import { z } from 'zod'

export const updateOrganizationSettingsSchema = z.object({
  // Business identity
  businessName:     z.string().max(255).optional(),
  legalName:        z.string().max(255).optional(),
  registrationNo:   z.string().max(50).optional(),
  vatNumber:        z.string().max(50).optional(),
  email:            z.string().email().optional(),
  phone:            z.string().max(30).optional(),
  website:          z.string().url().optional(),

  // Address
  addressLine1:     z.string().max(255).optional(),
  addressLine2:     z.string().max(255).optional(),
  city:             z.string().max(100).optional(),
  county:           z.string().max(100).optional(),
  postcode:         z.string().max(20).optional(),
  country:          z.string().max(2).optional(),   // ISO 3166-1 alpha-2

  // Locale
  timezone:         z.string().max(64).optional(),  // IANA tz: "Europe/London"
  currency:         z.string().length(3).optional(), // ISO 4217: "GBP"
  dateFormat:       z.enum(['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD']).optional(),
  timeFormat:       z.enum(['12h', '24h']).optional(),
  weekStartsOn:     z.number().int().min(0).max(6).optional(),

  // Branding
  logoUrl:          z.string().url().optional(),
  faviconUrl:       z.string().url().optional(),
  primaryColor:     z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  secondaryColor:   z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  accentColor:      z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  fontFamily:       z.string().max(100).optional(),
  customCss:        z.string().max(10000).optional(),

  // Booking config
  bookingWindowDays:    z.number().int().min(1).max(365).optional(),
  minNoticeHours:       z.number().int().min(0).max(168).optional(),
  bufferMinutes:        z.number().int().min(0).max(120).optional(),
  allowSameDayBook:     z.boolean().optional(),
  slotDurationMins:     z.number().int().min(5).max(480).optional(),
  slotApprovalEnabled:  z.boolean().optional(),
  slotApprovalHours:    z.number().int().min(1).optional(),
  defaultSlotCapacity:  z.number().int().min(1).optional(),

  // Communication
  senderName:   z.string().max(100).optional(),
  senderEmail:  z.string().email().optional(),
  replyToEmail: z.string().email().optional(),
  emailFooter:  z.string().max(2000).optional(),
  smsSignature: z.string().max(160).optional(),

  // Labels
  customerLabel: z.string().max(50).optional(),
  bookingLabel:  z.string().max(50).optional(),
  staffLabel:    z.string().max(50).optional(),

  // Operational modes
  availabilityMode: z.enum(['CALENDAR_BASED', 'SLOT_BASED', 'HYBRID']).optional(),
  capacityMode:     z.enum(['TENANT_LEVEL', 'CALENDAR_LEVEL', 'STAFF_LEVEL']).optional(),
})

export const updateModuleConfigSchema = z.object({
  moduleKey: z.string(),
  config: z.record(z.string(), z.unknown()),
})

export const createVenueSchema = z.object({
  name: z.string().min(1).max(255),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  isActive: z.boolean().default(true),
})

export const updateVenueSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(255).optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  isActive: z.boolean().optional(),
})

export const listTenantsForTenantSchema = z.object({
  limit: z.number().min(1).max(100).default(50),
  cursor: z.string().optional(),
})
