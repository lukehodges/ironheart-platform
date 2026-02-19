export type InvoiceStatus =
  | 'DRAFT'
  | 'SENT'
  | 'VIEWED'
  | 'PARTIALLY_PAID'
  | 'OVERDUE'
  | 'PAID'
  | 'VOID'
  | 'REFUNDED'

export type PaymentMethod = 'CARD' | 'BANK_TRANSFER' | 'DIRECT_DEBIT' | 'CASH'

export type ModifierType =
  | 'FIXED_PRICE'
  | 'FIXED_DISCOUNT'
  | 'PERCENT_DISCOUNT'
  | 'FIXED_SURCHARGE'
  | 'PERCENT_SURCHARGE'

export interface InvoiceRecord {
  id: string
  tenantId: string
  bookingId: string | null
  customerId: string
  status: InvoiceStatus
  subtotal: number
  taxAmount: number
  totalAmount: number
  amountPaid: number
  currency: string
  dueDate: Date | null
  sentAt: Date | null
  paidAt: Date | null
  notes: string | null
  version: number
  createdAt: Date
  updatedAt: Date
}

export interface PaymentRecord {
  id: string
  tenantId: string
  invoiceId: string
  bookingId: string | null
  amount: number
  method: PaymentMethod
  status: string
  stripePaymentIntentId: string | null
  stripeChargeId: string | null
  idempotencyKey: string | null
  gocardlessPaymentId: string | null
  notes: string | null
  createdAt: Date
}

export interface PricingConditionGroup {
  logic: 'AND' | 'OR'
  conditions: Array<{
    field: string
    operator: string
    value: unknown
  }>
  groups?: PricingConditionGroup[]
}

export interface PricingRule {
  id: string
  tenantId: string
  name: string
  enabled: boolean
  sortOrder: number
  conditions: PricingConditionGroup
  modifierType: ModifierType
  modifierValue: number
  serviceIds: string[] | null
  staffIds: string[] | null
  validFrom: Date | null
  validUntil: Date | null
  maxUses: number | null
  currentUses: number
}

export interface TaxRule {
  id: string
  tenantId: string
  name: string
  rate: number
  country: string
  taxCode: string | null
  appliesTo: 'ALL' | 'SERVICE' | 'PRODUCT'
  isDefault: boolean
  isReverseCharge: boolean
}

export interface TaxCalculation {
  subtotal: number
  taxAmount: number
  totalAmount: number
  taxRate: number
  taxName: string
  isReverseCharge: boolean
}

export interface PricingContext {
  booking: {
    serviceId: string
    dayOfWeek: number      // 0=Sun...6=Sat
    timeOfDay: number      // minutes since midnight
    advanceDays: number    // days between now and scheduled date
  }
  customer: {
    bookingCount: number
  }
  basePrice: number
}

export interface CreateInvoiceInput {
  bookingId: string | null
  customerId: string
  subtotal: number
  taxAmount: number
  totalAmount: number
  currency?: string
  dueDate?: Date
  notes?: string
}

export interface RecordPaymentInput {
  invoiceId: string
  bookingId: string | null
  amount: number
  method: PaymentMethod
  stripePaymentIntentId?: string
  gocardlessPaymentId?: string
  notes?: string
}

export interface RefundInput {
  paymentId: string
  amount: number
  reason: string
}

export interface StripeConnectAccount {
  id: string
  tenantId: string
  stripeAccountId: string
  status: string
  chargesEnabled: boolean
  payoutsEnabled: boolean
}
