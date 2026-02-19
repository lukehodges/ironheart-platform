import { db } from '@/shared/db'
import { and, eq, sql } from 'drizzle-orm'
import { customers } from '@/shared/db/schemas/customer.schema'
import { bookings } from '@/shared/db/schemas/booking.schema'

export async function fullTextSearchCustomers(
  tenantId: string,
  query: string,
  limit: number
) {
  // Attempt FTS with tsvector search_vector column; fall back to ILIKE if not available
  try {
    return await db
      .select({
        id:        customers.id,
        firstName: customers.firstName,
        lastName:  customers.lastName,
        email:     customers.email,
      })
      .from(customers)
      .where(
        and(
          eq(customers.tenantId, tenantId),
          sql`customers.search_vector @@ plainto_tsquery('english', ${query})`,
          sql`customers.deleted_at IS NULL`
        )
      )
      .orderBy(sql`ts_rank(customers.search_vector, plainto_tsquery('english', ${query})) DESC`)
      .limit(limit)
  } catch {
    // Fallback to ILIKE when FTS index/column not yet available
    return db
      .select({
        id:        customers.id,
        firstName: customers.firstName,
        lastName:  customers.lastName,
        email:     customers.email,
      })
      .from(customers)
      .where(
        and(
          eq(customers.tenantId, tenantId),
          sql`(${customers.firstName} || ' ' || ${customers.lastName} || ' ' || COALESCE(${customers.email}, '')) ILIKE ${'%' + query + '%'}`,
          sql`customers.deleted_at IS NULL`
        )
      )
      .limit(limit)
  }
}

export async function fullTextSearchBookings(
  tenantId: string,
  query: string,
  limit: number
) {
  // Attempt FTS with tsvector search_vector column; fall back to ILIKE if not available
  try {
    return await db
      .select({
        id:            bookings.id,
        bookingNumber: bookings.bookingNumber,
        scheduledDate: bookings.scheduledDate,
      })
      .from(bookings)
      .where(
        and(
          eq(bookings.tenantId, tenantId),
          sql`bookings.search_vector @@ plainto_tsquery('english', ${query})`
        )
      )
      .orderBy(sql`ts_rank(bookings.search_vector, plainto_tsquery('english', ${query})) DESC`)
      .limit(limit)
  } catch {
    // Fallback to ILIKE on booking number
    return db
      .select({
        id:            bookings.id,
        bookingNumber: bookings.bookingNumber,
        scheduledDate: bookings.scheduledDate,
      })
      .from(bookings)
      .where(
        and(
          eq(bookings.tenantId, tenantId),
          sql`COALESCE(${bookings.bookingNumber}, '') ILIKE ${'%' + query + '%'}`
        )
      )
      .limit(limit)
  }
}
