import { db } from '@/shared/db'
import { and, eq, desc, sql } from 'drizzle-orm'
import { invoices, payments } from '@/shared/db/schemas/shared.schema'
import { pricingRules, discountCodes, taxRules } from '@/shared/db/schemas/phase6.schema'
import type { CreateInvoiceInput, RecordPaymentInput } from './payment.types'

// ---------------------------------------------------------------------------
// Invoice number generation
// ---------------------------------------------------------------------------

function generateInvoiceNumber(): string {
  const now = new Date()
  const year = now.getFullYear()
  const seq = Math.floor(Math.random() * 900000) + 100000
  return `INV-${year}-${seq}`
}

// ---------------------------------------------------------------------------
// Invoice queries
// ---------------------------------------------------------------------------

export async function createInvoice(tenantId: string, input: CreateInvoiceInput) {
  const dueDate = input.dueDate ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days default

  const [invoice] = await db.insert(invoices).values({
    id:             sql`gen_random_uuid()`,
    tenantId,
    invoiceNumber:  generateInvoiceNumber(),
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
