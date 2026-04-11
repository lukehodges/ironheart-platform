export type NoteType = 'GENERAL' | 'MEDICAL' | 'PREFERENCE' | 'COMPLAINT' | 'FOLLOWUP'

export type CustomerType = 'INDIVIDUAL' | 'COMPANY'

export type CrmStage = 'PROSPECT' | 'ACTIVE' | 'CHURNED'

export type ContactRole = 'PRIMARY' | 'BILLING' | 'SITE_CONTACT' | 'GUARDIAN' | 'EMERGENCY'

export interface CustomerContact {
  id: string
  customerId: string
  tenantId: string
  name: string
  email: string | null
  phone: string | null
  role: ContactRole
  receivesNotifications: boolean
  createdAt: Date
}

export interface CustomerAddress {
  line1?: string
  line2?: string
  city?: string
  county?: string
  postcode?: string
  country?: string
}

export interface CustomerRecord {
  id: string
  tenantId: string
  name: string
  email?: string | null
  phone?: string | null
  dateOfBirth?: Date | null
  gender?: string | null
  avatarUrl?: string | null
  address?: CustomerAddress | null
  tags: string[]
  notes?: string | null
  referralSource?: string | null
  isActive: boolean
  anonymisedAt?: Date | null
  mergedIntoId?: string | null
  deletedAt?: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface CustomerNoteRecord {
  id: string
  tenantId: string
  customerId: string
  userId: string
  content: string
  noteType: NoteType
  isPrivate: boolean
  createdAt: Date
  updatedAt: Date
}

export interface CustomerWithHistory extends CustomerRecord {
  bookingCount: number
  totalSpend: number
  lastBookingDate?: Date | null
}

export interface CreateCustomerInput {
  name: string
  email?: string | null
  phone?: string | null
  dateOfBirth?: Date | null
  gender?: string | null
  tags?: string[]
  notes?: string | null
  referralSource?: string | null
  address?: CustomerAddress | null
}

export interface UpdateCustomerInput {
  id: string
  name?: string
  email?: string | null
  phone?: string | null
  dateOfBirth?: Date | null
  gender?: string | null
  tags?: string[]
  notes?: string | null
  referralSource?: string | null
  address?: CustomerAddress | null
}

export interface MergeCustomersInput {
  sourceId: string
  targetId: string
}

export interface AddNoteInput {
  customerId: string
  content: string
  noteType?: NoteType
  isPrivate?: boolean
}

export interface ListCustomersInput {
  search?: string
  tags?: string[]
  isActive?: boolean
  limit: number
  cursor?: string
}
