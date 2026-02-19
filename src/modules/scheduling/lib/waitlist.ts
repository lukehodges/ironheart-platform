import { db } from '@/shared/db'
import { eq, and, gte } from 'drizzle-orm'
import { bookingWaitlist } from '@/shared/db/schemas/phase6.schema'
import { logger } from '@/shared/logger'
import type { WaitlistEntry } from '../scheduling.types'

const log = logger.child({ module: 'scheduling.waitlist' })

export async function addToWaitlist(
  tenantId: string,
  input: {
    customerId: string
    serviceId: string
    staffId?: string
    preferredDate?: Date
    preferredTimeStart?: string
    preferredTimeEnd?: string
    flexibilityDays?: number
  }
): Promise<WaitlistEntry> {
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 30) // 30-day expiry

  const [entry] = await db
    .insert(bookingWaitlist)
    .values({
      tenantId,
      customerId:        input.customerId,
      serviceId:         input.serviceId,
      staffId:           input.staffId ?? null,
      preferredDate:     input.preferredDate ?? null,
      preferredTimeStart: input.preferredTimeStart ?? null,
      preferredTimeEnd:  input.preferredTimeEnd ?? null,
      flexibilityDays:   input.flexibilityDays ?? 3,
      status:            'WAITING',
      expiresAt,
    })
    .returning()

  log.info({ tenantId, customerId: input.customerId, serviceId: input.serviceId }, 'Added to waitlist')
  return entry as WaitlistEntry
}

export async function checkAndNotifyWaitlist(
  tenantId: string,
  serviceId: string,
  _date: string,
  sendInngestEvent: (name: string, data: Record<string, unknown>) => Promise<void>
): Promise<void> {
  // Find the earliest WAITING entry for this service that has not yet expired
  const entries = await db
    .select()
    .from(bookingWaitlist)
    .where(
      and(
        eq(bookingWaitlist.tenantId, tenantId),
        eq(bookingWaitlist.serviceId, serviceId),
        eq(bookingWaitlist.status, 'WAITING'),
        gte(bookingWaitlist.expiresAt, new Date())
      )
    )
    .orderBy(bookingWaitlist.createdAt)
    .limit(1)

  if (entries.length === 0) {
    log.info({ tenantId, serviceId }, 'No waitlist entries for slot')
    return
  }

  const entry = entries[0]!

  // Update status to NOTIFIED
  await db
    .update(bookingWaitlist)
    .set({ status: 'NOTIFIED', notifiedAt: new Date() })
    .where(eq(bookingWaitlist.id, entry.id))

  await sendInngestEvent('waitlist/slot.available', {
    waitlistEntryId: entry.id,
    tenantId,
    customerId: entry.customerId,
    serviceId,
    date: _date,
  })

  log.info({ tenantId, waitlistEntryId: entry.id }, 'Waitlist notification sent')
}
