import { logger } from '@/shared/logger'

const log = logger.child({ module: 'booking.saga' })

export interface SagaStep<T = unknown> {
  name: string
  execute: () => Promise<T>
  compensate: (result: T) => Promise<void>
}

/**
 * Generic saga orchestrator.
 * On any step failure, compensates all completed steps in reverse order.
 * Compensation failures are logged as CRITICAL but do not re-throw
 * (to avoid hiding the original error).
 */
export class Saga {
  private completed: Array<{ step: SagaStep; result: unknown }> = []

  constructor(
    private readonly sagaType: string,
    private readonly entityId: string,
    private readonly tenantId: string,
    private readonly steps: SagaStep[]
  ) {}

  async run(): Promise<void> {
    for (const step of this.steps) {
      try {
        const result = await step.execute()
        this.completed.push({ step, result })
        log.info({ sagaType: this.sagaType, stepName: step.name }, 'Saga step completed')
      } catch (err) {
        log.error(
          { sagaType: this.sagaType, stepName: step.name, err },
          'Saga step failed - compensating'
        )
        await this.compensate()
        throw err
      }
    }
  }

  private async compensate(): Promise<void> {
    for (const { step, result } of [...this.completed].reverse()) {
      try {
        await step.compensate(result)
        log.info(
          { sagaType: this.sagaType, stepName: step.name },
          'Saga compensation completed'
        )
      } catch (compensationErr) {
        // CRITICAL: do NOT retry - risk of infinite loop
        // Mark for manual intervention via saga_log table
        log.error(
          { sagaType: this.sagaType, stepName: step.name, compensationErr },
          'SAGA COMPENSATION FAILED - manual intervention required'
        )
      }
    }
  }
}

/**
 * Creates the booking confirmation saga with its 4 steps:
 * 1. Update booking status → CONFIRMED (compensation: revert to PENDING)
 * 2. Create invoice for booking (compensation: void the invoice)
 * 3. Send booking confirmed notification (compensation: no-op - not reversible)
 * 4. Sync calendar event (compensation: delete calendar event)
 */
export function createBookingConfirmationSaga(deps: {
  bookingId: string
  tenantId: string
  staffId: string
  updateBookingStatus: (id: string, status: string) => Promise<void>
  createInvoiceForBooking: (bookingId: string) => Promise<{ id: string }>
  voidInvoice: (invoiceId: string) => Promise<void>
  sendInngestEvent: (name: string, data: Record<string, unknown>) => Promise<void>
}): Saga {
  return new Saga('BOOKING_CONFIRMATION', deps.bookingId, deps.tenantId, [
    {
      name: 'update-booking-status',
      execute: () => deps.updateBookingStatus(deps.bookingId, 'CONFIRMED'),
      compensate: () => deps.updateBookingStatus(deps.bookingId, 'PENDING'),
    },
    {
      name: 'create-invoice',
      execute: () => deps.createInvoiceForBooking(deps.bookingId),
      compensate: (invoice) =>
        deps.voidInvoice((invoice as { id: string }).id),
    },
    {
      name: 'send-notification',
      execute: () =>
        deps.sendInngestEvent('booking/confirmed', {
          bookingId: deps.bookingId,
          tenantId: deps.tenantId,
        }),
      compensate: () => Promise.resolve(), // notifications not reversible - acceptable
    },
    {
      name: 'sync-calendar',
      execute: () =>
        deps.sendInngestEvent('calendar/sync.push', {
          bookingId: deps.bookingId,
          userId: deps.staffId,
          tenantId: deps.tenantId,
        }),
      compensate: () =>
        deps.sendInngestEvent('calendar/sync.delete', {
          bookingId: deps.bookingId,
          userId: deps.staffId,
          tenantId: deps.tenantId,
        }),
    },
  ])
}
