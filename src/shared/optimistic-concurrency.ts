import { db } from '@/shared/db'
import { and, eq } from 'drizzle-orm'
import type { PgTable } from 'drizzle-orm/pg-core'
import { ConflictError } from '@/shared/errors'

/**
 * Updates a record only if its version matches the expected version.
 * Formal guarantee (I12): version mismatch raises ConflictError and makes no DB change.
 */
export async function updateWithVersion<T>(
  table: PgTable & Record<string, any>,
  id: string,
  tenantId: string,
  expectedVersion: number,
  values: Record<string, unknown>
): Promise<T> {
  const [updated] = await db
    .update(table)
    .set({ ...values, version: expectedVersion + 1, updatedAt: new Date() })
    .where(
      and(
        eq(table['id'], id),
        eq(table['tenantId'], tenantId),
        eq(table['version'], expectedVersion)
      )
    )
    .returning()

  if (!updated) {
    throw new ConflictError('Concurrent modification detected — refresh and try again')
  }
  return updated as T
}
