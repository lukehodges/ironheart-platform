import { db } from '@/shared/db'
import { and, eq, desc, lt, inArray, sql } from 'drizzle-orm'
import { invoices, payments } from '@/shared/db/schemas/shared.schema'
import { pricingRules, discountCodes, taxRules } from '@/shared/db/schemas/phase6.schema'
import { redis } from '@/shared/redis'
import type { CreateInvoiceInput, RecordPaymentInput } from './payment.types'

// ---------------------------------------------------------------------------
// Invoice number generation
// ---------------------------------------------------------------------------

async function generateInvoiceNumber(tenantId: string): Promise<string> {
  const year = new Date().getFullYear()
  const key = `invoice:counter:${tenantId}:${year}`
  const seq = await redis.incr(key)
  // Set TTL on first creation (expire after 2 years to clean up old counters)
  if (seq === 1) {
    await redis.expire(key, 63072000) // 2 years in seconds
  }
  return `INV-${year}-${String(seq).padStart(5, '0')}`
}

// ---------------------------------------------------------------------------
// Invoice queries
// ---------------------------------------------------------------------------

export async function createInvoice(tenantId: string, input: CreateInvoiceInput) {
  const dueDate = input.dueDate ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days default
  const invoiceNumber = await generateInvoiceNumber(tenantId)

  const [invoice] = await db.insert(invoices).values({
    id:             sql`gen_random_uuid()`,
    tenantId,
    invoiceNumber,
    bookingId:      input.bookingId ?? null,
    customerId:     input.customerId,
    status:         'DRAFT',
    subtotal:       String(input.subtotal),
    taxAmount:      String(input.taxAmount),
    discountAmount: '0',
    totalAmount:    String(input.totalAmount),
    amountPaid:     '0',
    amountDue:      String(input.totalAmount),
    lineItems:      [],
    dueDate,
    notes:          input.notes ?? null,
    version:        1,
    updatedAt:      new Date(),
  }).returning()
  return invoice!
}

export async function findInvoiceById(id: string, tenantId: string) {
  const [row] = await db.select().from(invoices)
    .where(and(eq(invoices.id, id), eq(invoices.tenantId, tenantId)))
    .limit(1)
  return row ?? null
}

export async function listInvoices(tenantId: string, filters: {
  status?: string
  customerId?: string
  limit: number
  cursor?: string
}) {
  const conditions = [eq(invoices.tenantId, tenantId)]
  if (filters.status) conditions.push(eq(invoices.status, filters.status as typeof invoices.status._.data))
  if (filters.customerId) conditions.push(eq(invoices.customerId, filters.customerId))

  const rows = await db.select().from(invoices)
    .where(and(...conditions))
    .orderBy(desc(invoices.createdAt))
    .limit(filters.limit + 1)

  const hasMore = rows.length > filters.limit
  return { rows: rows.slice(0, filters.limit), hasMore }
}

/**
 * Find all invoices that are past their due date and still in a payable status.
 * Returns invoices in SENT, VIEWED, or PARTIALLY_PAID status with dueDate before now.
 */
export async function findOverdueInvoices() {
  const now = new Date()
  return db.select().from(invoices)
    .where(and(
      lt(invoices.dueDate, now),
      inArray(invoices.status, ['SENT', 'VIEWED', 'PARTIALLY_PAID'])
    ))
}

export async function updateInvoiceStatus(
  id: string,
  tenantId: string,
  expectedVersion: number,
  status: string,
  extraFields?: Record<string, unknown>
) {
  const [updated] = await db.update(invoices)
    .set({
      status: status as typeof invoices.status._.data,
      version: expectedVersion + 1,
      updatedAt: new Date(),
      ...extraFields,
    })
    .where(and(
      eq(invoices.id, id),
      eq(invoices.tenantId, tenantId),
      eq(invoices.version, expectedVersion)
    ))
    .returning()

  return updated ?? null
}

// ---------------------------------------------------------------------------
// Payment queries
// ---------------------------------------------------------------------------

export async function createPayment(tenantId: string, input: RecordPaymentInput & { customerId: string }) {
  const [payment] = await db.insert(payments).values({
    id:                     sql`gen_random_uuid()`,
    tenantId,
    customerId:             input.customerId,
    invoiceId:              input.invoiceId,
    bookingId:              input.bookingId ?? null,
    amount:                 String(input.amount),
    method:                 input.method as typeof payments.method._.data,
    status:                 'COMPLETED',
    type:                   'PAYMENT',
    stripePaymentIntentId:  input.stripePaymentIntentId ?? null,
    gocardlessPaymentId:    input.gocardlessPaymentId ?? null,
    notes:                  input.notes ?? null,
    paidAt:                 new Date(),
    updatedAt:              new Date(),
  }).returning()
  return payment!
}

export async function findPaymentByStripePaymentIntentId(stripePaymentIntentId: string) {
  const [row] = await db.select().from(payments)
    .where(eq(payments.stripePaymentIntentId, stripePaymentIntentId))
    .limit(1)
  return row ?? null
}

export async function updatePaymentStatus(
  id: string,
  status: typeof payments.status._.data,
  extraFields?: Partial<typeof payments.$inferInsert>
) {
  const [updated] = await db.update(payments)
    .set({
      status,
      updatedAt: new Date(),
      ...extraFields,
    })
    .where(eq(payments.id, id))
    .returning()
  return updated ?? null
}

// ---------------------------------------------------------------------------
// Pricing / discount / tax queries
// ---------------------------------------------------------------------------

export async function listPricingRules(tenantId: string) {
  return db.select().from(pricingRules)
    .where(eq(pricingRules.tenantId, tenantId))
    .orderBy(pricingRules.sortOrder)
}

export async function findDiscountCode(tenantId: string, code: string) {
  const [row] = await db.select().from(discountCodes)
    .where(and(
      eq(discountCodes.tenantId, tenantId),
      eq(discountCodes.code, code)
    ))
    .limit(1)
  return row ?? null
}

export async function listTaxRules(tenantId: string) {
  return db.select().from(taxRules).where(eq(taxRules.tenantId, tenantId))
}
