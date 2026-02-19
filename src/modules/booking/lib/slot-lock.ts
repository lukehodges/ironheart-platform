import { db } from '@/shared/db'
import { sql } from 'drizzle-orm'

/**
 * Acquires a PostgreSQL advisory lock for a slot before checking availability.
 * Formal guarantee (I4): two concurrent requests for the same slot cannot both succeed.
 *
 * Locks are acquired in canonical order (deterministic hash) to prevent deadlocks.
 * Lock is released automatically when the transaction commits or rolls back.
 */
export async function withSlotLock<T>(
  tenantId: string,
  staffId: string,
  date: string,
  time: string,
  operation: (tx: Parameters<Parameters<typeof db.transaction>[0]>[0]) => Promise<T>
): Promise<T> {
  const key = hashSlot(tenantId, staffId, date, time)
  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(${key})`)
    return operation(tx)
  })
}

/** FNV-1a 32-bit hash — maps slot tuple to positive integer for pg_advisory_xact_lock */
function hashSlot(tenantId: string, staffId: string, date: string, time: string): number {
  const input = `${tenantId}:${staffId}:${date}:${time}`
  let hash = 2_166_136_261
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 16_777_619) >>> 0
  }
  return hash
}
