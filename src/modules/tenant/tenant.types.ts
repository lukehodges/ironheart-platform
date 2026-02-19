export type AvailabilityMode =
  | 'CALENDAR_BASED'
  | 'SLOT_BASED'
  | 'HYBRID'

export type CapacityMode =
  | 'TENANT_LEVEL'
  | 'CALENDAR_LEVEL'
  | 'STAFF_LEVEL'

export interface OrganizationSettings {
  id: string
  tenantId: string

  // Business identity
  businessName?: string | null
  legalName?: string | null
  registrationNo?: string | null
  vatNumber?: string | null
  email?: string | null
  phone?: string | null
  website?: string | null

  // Address
  addressLine1?: string | null
  addressLine2?: string | null
  city?: string | null
  county?: string | null
  postcode?: string | null
  country?: string | null

  // Locale
  timezone?: string | null
  currency?: string | null
  dateFormat?: string | null
  timeFormat?: string | null
  weekStartsOn?: number | null

  // Branding
  logoUrl?: string | null
  faviconUrl?: string | null
  primaryColor?: string | null
  secondaryColor?: string | null
  accentColor?: string | null
  fontFamily?: string | null
  customCss?: string | null

  // Booking config
  bookingWindowDays?: number | null
  minNoticeHours?: number | null
  bufferMinutes?: number | null
  allowSameDayBook?: boolean | null
  slotDurationMins?: number | null
  slotApprovalEnabled?: boolean | null
  slotApprovalHours?: number | null
  defaultSlotCapacity?: number | null

  // Communication
  senderName?: string | null
  senderEmail?: string | null
  replyToEmail?: string | null
  emailFooter?: string | null
  smsSignature?: string | null

  // Labels
  customerLabel?: string | null
  bookingLabel?: string | null
  staffLabel?: string | null

  // Operational modes
  availabilityMode?: AvailabilityMode | null
  capacityMode?: CapacityMode | null

  createdAt: Date
  updatedAt: Date
}

export interface TenantModule {
  id: string
  tenantId: string
  moduleId: string
  moduleSlug: string
  moduleName: string
  isEnabled: boolean
  config?: Record<string, unknown> | null
  createdAt: Date
  updatedAt: Date
}

export interface VenueRecord {
  id: string
  tenantId: string
  name: string
  address?: string | null
  phone?: string | null
  email?: string | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export type UpdateSettingsInput = Partial<
  Omit<OrganizationSettings, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>
>
