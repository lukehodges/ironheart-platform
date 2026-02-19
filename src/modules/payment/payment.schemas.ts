import { z } from 'zod'

export const createInvoiceSchema = z.object({
  bookingId: z.string().optional().nullable(),
  customerId: z.string(),
  subtotal: z.number().positive(),
  taxAmount: z.number().min(0),
  totalAmount: z.number().positive(),
  currency: z.string().default('GBP'),
  dueDate: z.string().optional(),
  notes: z.string().optional(),
})

export const sendInvoiceSchema = z.object({
  invoiceId: z.string(),
  version: z.number().int(),
})

export const voidInvoiceSchema = z.object({
  invoiceId: z.string(),
  version: z.number().int(),
})

export const recordPaymentSchema = z.object({
  invoiceId: z.string(),
  bookingId: z.string().optional().nullable(),
  amount: z.number().positive(),
  method: z.enum(['CARD', 'BANK_TRANSFER', 'DIRECT_DEBIT', 'CASH']),
  stripePaymentIntentId: z.string().optional(),
  gocardlessPaymentId: z.string().optional(),
  notes: z.string().optional(),
  idempotencyKey: z.string().optional(),
})

export const refundPaymentSchema = z.object({
  paymentId: z.string(),
  amount: z.number().positive(),
  reason: z.string().min(1),
})

const conditionSchema = z.object({
  field: z.string(),
  operator: z.string(),
  value: z.unknown(),
})

type ConditionGroupInput = {
  logic: 'AND' | 'OR'
  conditions: Array<{ field: string; operator: string; value: unknown }>
  groups?: ConditionGroupInput[]
}

const conditionGroupSchema: z.ZodType<ConditionGroupInput> = z.lazy(() =>
  z.object({
    logic: z.enum(['AND', 'OR']),
    conditions: z.array(conditionSchema),
    groups: z.array(conditionGroupSchema).optional(),
  })
)

export const createPricingRuleSchema = z.object({
  name: z.string().min(1),
  enabled: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
  conditions: conditionGroupSchema,
  modifierType: z.enum(['FIXED_PRICE', 'FIXED_DISCOUNT', 'PERCENT_DISCOUNT', 'FIXED_SURCHARGE', 'PERCENT_SURCHARGE']),
  modifierValue: z.number(),
  serviceIds: z.array(z.string()).optional().nullable(),
  staffIds: z.array(z.string()).optional().nullable(),
  validFrom: z.string().optional().nullable(),
  validUntil: z.string().optional().nullable(),
  maxUses: z.number().int().optional().nullable(),
})

export const updatePricingRuleSchema = createPricingRuleSchema.partial().extend({
  id: z.string(),
})

export const applyDiscountCodeSchema = z.object({
  code: z.string().min(1),
  bookingId: z.string().optional(),
  serviceId: z.string().optional(),
})

export const createTaxRuleSchema = z.object({
  name: z.string().min(1),
  rate: z.number().min(0).max(1),
  country: z.string().length(2),
  taxCode: z.string().optional(),
  appliesTo: z.enum(['ALL', 'SERVICE', 'PRODUCT']).default('ALL'),
  isDefault: z.boolean().default(false),
  isReverseCharge: z.boolean().default(false),
})

export const listInvoicesSchema = z.object({
  status: z.enum(['DRAFT', 'SENT', 'VIEWED', 'PARTIALLY_PAID', 'OVERDUE', 'PAID', 'VOID', 'REFUNDED']).optional(),
  customerId: z.string().optional(),
  bookingId: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(),
})
