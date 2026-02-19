export type BookingStatus =
  | 'PENDING' | 'APPROVED' | 'REJECTED' | 'RESERVED' | 'RELEASED'
  | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW'

export type BookingSource = 'ADMIN' | 'PORTAL' | 'PHONE' | 'WALK_IN' | 'API'

export type LocationType = 'VENUE' | 'CUSTOMER_HOME' | 'CUSTOMER_WORK' | 'OTHER'

export interface LocationAddress {
  line1?: string
  line2?: string
  city?: string
  county?: string
  postcode?: string
  country?: string
}

export interface BookingRecord {
  id: string
  tenantId: string
  bookingNumber: string
  customerId: string
  serviceId: string
  staffId: string | null
  venueId: string | null
  scheduledDate: Date
  scheduledTime: string       // "HH:MM"
  durationMinutes: number
  endTime: string | null
  locationType: LocationType
  locationAddress: LocationAddress | null
  travelMinutes: number | null
  travelMiles: number | null
  mileageCost: number | null
  additionalCharges: number | null
  status: BookingStatus
  statusChangedAt: Date
  reservedAt: Date | null
  reservationExpiresAt: Date | null
  price: number | null
  taxAmount: number | null
  totalAmount: number | null
  depositRequired: number | null
  depositPaid: number
  depositPaidAt: Date | null
  customerNotes: string | null
  adminNotes: string | null
  customServiceName: string | null
  source: BookingSource
  requiresApproval: boolean
  slotId: string | null
  cancelledAt: Date | null
  cancelledBy: string | null
  cancellationReason: string | null
  completedAt: Date | null
  createdAt: Date
  createdById: string | null
  updatedAt: Date
}

export interface CreateBookingInput {
  customerId: string
  serviceId: string
  staffId?: string | null
  venueId?: string | null
  scheduledDate: Date
  scheduledTime: string
  durationMinutes: number
  locationType?: LocationType
  locationAddress?: LocationAddress | null
  price?: number | null
  customServiceName?: string | null
  customerNotes?: string | null
  adminNotes?: string | null
  source?: BookingSource
  slotId?: string
  staffIds?: string[]
  skipReservation?: boolean
  confirmationTokenHash?: string | null
}

export interface UpdateBookingInput {
  staffId?: string | null
  venueId?: string | null
  scheduledDate?: Date
  scheduledTime?: string
  durationMinutes?: number
  locationType?: LocationType
  locationAddress?: LocationAddress | null
  price?: number | null
  customerNotes?: string | null
  adminNotes?: string | null
  slotId?: string
  staffIds?: string[]
}

export interface SlotRecord {
  id: string
  tenantId: string
  date: Date
  time: string
  endTime: string | null
  available: boolean
  staffIds: string[]
  serviceIds: string[]
  venueId: string | null
  capacity: number
  bookedCount: number
  requiresApproval: boolean
  estimatedLocation: string | null
  previousSlotId: string | null
  travelTimeFromPrev: number | null
  metadata: Record<string, unknown> | null
  sortOrder: number
  createdAt: Date
  updatedAt: Date
}
