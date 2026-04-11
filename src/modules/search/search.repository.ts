import { db } from '@/shared/db'
import { and, eq, sql, isNull } from 'drizzle-orm'
import { customers } from '@/shared/db/schemas/customer.schema'
import { jobs } from '@/shared/db/schemas/booking.schema'
import { users, staffProfiles } from '@/shared/db/schemas/auth.schema'

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
          isNull(customers.deletedAt)
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
          isNull(customers.deletedAt)
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
        id:            jobs.id,
        bookingNumber: jobs.bookingNumber,
        scheduledDate: jobs.scheduledDate,
      })
      .from(jobs)
      .where(
        and(
          eq(jobs.tenantId, tenantId),
          sql`jobs.search_vector @@ plainto_tsquery('english', ${query})`
        )
      )
      .orderBy(sql`ts_rank(jobs.search_vector, plainto_tsquery('english', ${query})) DESC`)
      .limit(limit)
  } catch {
    // Fallback to ILIKE on booking number
    return db
      .select({
        id:            jobs.id,
        bookingNumber: jobs.bookingNumber,
        scheduledDate: jobs.scheduledDate,
      })
      .from(jobs)
      .where(
        and(
          eq(jobs.tenantId, tenantId),
          sql`COALESCE(${jobs.bookingNumber}, '') ILIKE ${'%' + query + '%'}`
        )
      )
      .limit(limit)
  }
}

export async function fullTextSearchStaff(
  tenantId: string,
  query: string,
  limit: number
) {
  const pattern = `%${query}%`
  return db
    .select({
      id:        users.id,
      firstName: users.firstName,
      lastName:  users.lastName,
      email:     users.email,
      jobTitle:  staffProfiles.jobTitle,
    })
    .from(users)
    .innerJoin(staffProfiles, eq(staffProfiles.userId, users.id))
    .where(
      and(
        eq(users.tenantId, tenantId),
        isNull(users.deletedAt),
        sql`(${users.firstName} || ' ' || ${users.lastName} || ' ' || COALESCE(${users.email}, '')) ILIKE ${pattern}`
      )
    )
    .limit(limit)
}
