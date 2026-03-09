import { describe, it, expect, vi } from 'vitest'
import {
  assertValidBookingTransition,
  isTerminalBookingStatus,
  getValidTransitions,
  type BookingStatus,
} from '../lib/booking-state-machine'
import { Saga, createBookingConfirmationSaga } from '../lib/booking-saga'
import { ValidationError } from '@/shared/errors'

// ---------------------------------------------------------------------------
// assertValidBookingTransition - valid transitions
// ---------------------------------------------------------------------------

describe('assertValidBookingTransition - valid transitions', () => {
  it('allows PENDING → RESERVED', () => {
    expect(() => assertValidBookingTransition('PENDING', 'RESERVED')).not.toThrow()
  })

  it('allows PENDING → REJECTED', () => {
    expect(() => assertValidBookingTransition('PENDING', 'REJECTED')).not.toThrow()
  })

  it('allows PENDING → CANCELLED', () => {
    expect(() => assertValidBookingTransition('PENDING', 'CANCELLED')).not.toThrow()
  })

  it('allows RESERVED → APPROVED', () => {
    expect(() => assertValidBookingTransition('RESERVED', 'APPROVED')).not.toThrow()
  })

  it('allows RESERVED → CONFIRMED (approval skipped)', () => {
    expect(() => assertValidBookingTransition('RESERVED', 'CONFIRMED')).not.toThrow()
  })

  it('allows RESERVED → RELEASED', () => {
    expect(() => assertValidBookingTransition('RESERVED', 'RELEASED')).not.toThrow()
  })

  it('allows RESERVED → CANCELLED', () => {
    expect(() => assertValidBookingTransition('RESERVED', 'CANCELLED')).not.toThrow()
  })

  it('allows APPROVED → CONFIRMED', () => {
    expect(() => assertValidBookingTransition('APPROVED', 'CONFIRMED')).not.toThrow()
  })

  it('allows APPROVED → CANCELLED', () => {
    expect(() => assertValidBookingTransition('APPROVED', 'CANCELLED')).not.toThrow()
  })

  it('allows CONFIRMED → IN_PROGRESS', () => {
    expect(() => assertValidBookingTransition('CONFIRMED', 'IN_PROGRESS')).not.toThrow()
  })

  it('allows CONFIRMED → COMPLETED', () => {
    expect(() => assertValidBookingTransition('CONFIRMED', 'COMPLETED')).not.toThrow()
  })

  it('allows CONFIRMED → CANCELLED', () => {
    expect(() => assertValidBookingTransition('CONFIRMED', 'CANCELLED')).not.toThrow()
  })

  it('allows CONFIRMED → NO_SHOW', () => {
    expect(() => assertValidBookingTransition('CONFIRMED', 'NO_SHOW')).not.toThrow()
  })

  it('allows IN_PROGRESS → COMPLETED', () => {
    expect(() => assertValidBookingTransition('IN_PROGRESS', 'COMPLETED')).not.toThrow()
  })

  it('allows IN_PROGRESS → CANCELLED', () => {
    expect(() => assertValidBookingTransition('IN_PROGRESS', 'CANCELLED')).not.toThrow()
  })

  it('allows IN_PROGRESS → NO_SHOW', () => {
    expect(() => assertValidBookingTransition('IN_PROGRESS', 'NO_SHOW')).not.toThrow()
  })

  it('allows RELEASED → PENDING (re-queue)', () => {
    expect(() => assertValidBookingTransition('RELEASED', 'PENDING')).not.toThrow()
  })
})

// ---------------------------------------------------------------------------
// assertValidBookingTransition - invalid transitions
// ---------------------------------------------------------------------------

describe('assertValidBookingTransition - invalid transitions', () => {
  it('throws ValidationError for COMPLETED → PENDING (terminal state)', () => {
    expect(() => assertValidBookingTransition('COMPLETED', 'PENDING')).toThrow(ValidationError)
  })

  it('throws ValidationError for COMPLETED → CONFIRMED (terminal state)', () => {
    expect(() => assertValidBookingTransition('COMPLETED', 'CONFIRMED')).toThrow(ValidationError)
  })

  it('throws ValidationError for COMPLETED → CANCELLED (terminal state)', () => {
    expect(() => assertValidBookingTransition('COMPLETED', 'CANCELLED')).toThrow(ValidationError)
  })

  it('throws ValidationError for COMPLETED → IN_PROGRESS (terminal state)', () => {
    expect(() => assertValidBookingTransition('COMPLETED', 'IN_PROGRESS')).toThrow(ValidationError)
  })

  it('throws ValidationError for CANCELLED → PENDING (terminal state)', () => {
    expect(() => assertValidBookingTransition('CANCELLED', 'PENDING')).toThrow(ValidationError)
  })

  it('throws ValidationError for CANCELLED → CONFIRMED (terminal state)', () => {
    expect(() => assertValidBookingTransition('CANCELLED', 'CONFIRMED')).toThrow(ValidationError)
  })

  it('throws ValidationError for CANCELLED → COMPLETED (terminal state)', () => {
    expect(() => assertValidBookingTransition('CANCELLED', 'COMPLETED')).toThrow(ValidationError)
  })

  it('throws ValidationError for NO_SHOW → PENDING (terminal state)', () => {
    expect(() => assertValidBookingTransition('NO_SHOW', 'PENDING')).toThrow(ValidationError)
  })

  it('throws ValidationError for NO_SHOW → CONFIRMED (terminal state)', () => {
    expect(() => assertValidBookingTransition('NO_SHOW', 'CONFIRMED')).toThrow(ValidationError)
  })

  it('throws ValidationError for NO_SHOW → COMPLETED (terminal state)', () => {
    expect(() => assertValidBookingTransition('NO_SHOW', 'COMPLETED')).toThrow(ValidationError)
  })

  it('throws ValidationError for REJECTED → PENDING (terminal state)', () => {
    expect(() => assertValidBookingTransition('REJECTED', 'PENDING')).toThrow(ValidationError)
  })

  it('throws ValidationError for REJECTED → CONFIRMED (terminal state)', () => {
    expect(() => assertValidBookingTransition('REJECTED', 'CONFIRMED')).toThrow(ValidationError)
  })

  it('throws ValidationError for REJECTED → APPROVED (terminal state)', () => {
    expect(() => assertValidBookingTransition('REJECTED', 'APPROVED')).toThrow(ValidationError)
  })

  it('throws ValidationError for PENDING → CONFIRMED (skips RESERVED/APPROVED path)', () => {
    expect(() => assertValidBookingTransition('PENDING', 'CONFIRMED')).toThrow(ValidationError)
  })

  it('throws ValidationError for PENDING → COMPLETED (not a valid jump)', () => {
    expect(() => assertValidBookingTransition('PENDING', 'COMPLETED')).toThrow(ValidationError)
  })

  it('error message includes transition details', () => {
    let caughtMessage = ''
    try {
      assertValidBookingTransition('COMPLETED', 'PENDING')
    } catch (e) {
      if (e instanceof ValidationError) caughtMessage = e.message
    }
    expect(caughtMessage).toContain('COMPLETED')
    expect(caughtMessage).toContain('PENDING')
  })

  it('error message mentions terminal state when from a terminal status', () => {
    let caughtMessage = ''
    try {
      assertValidBookingTransition('CANCELLED', 'PENDING')
    } catch (e) {
      if (e instanceof ValidationError) caughtMessage = e.message
    }
    expect(caughtMessage).toContain('terminal state')
  })
})

// ---------------------------------------------------------------------------
// isTerminalBookingStatus
// ---------------------------------------------------------------------------

describe('isTerminalBookingStatus', () => {
  it('returns true for COMPLETED (terminal)', () => {
    expect(isTerminalBookingStatus('COMPLETED')).toBe(true)
  })

  it('returns true for CANCELLED (terminal)', () => {
    expect(isTerminalBookingStatus('CANCELLED')).toBe(true)
  })

  it('returns true for NO_SHOW (terminal)', () => {
    expect(isTerminalBookingStatus('NO_SHOW')).toBe(true)
  })

  it('returns true for REJECTED (terminal)', () => {
    expect(isTerminalBookingStatus('REJECTED')).toBe(true)
  })

  it('returns false for PENDING (not terminal)', () => {
    expect(isTerminalBookingStatus('PENDING')).toBe(false)
  })

  it('returns false for RESERVED (not terminal)', () => {
    expect(isTerminalBookingStatus('RESERVED')).toBe(false)
  })

  it('returns false for APPROVED (not terminal)', () => {
    expect(isTerminalBookingStatus('APPROVED')).toBe(false)
  })

  it('returns false for CONFIRMED (not terminal)', () => {
    expect(isTerminalBookingStatus('CONFIRMED')).toBe(false)
  })

  it('returns false for IN_PROGRESS (not terminal)', () => {
    expect(isTerminalBookingStatus('IN_PROGRESS')).toBe(false)
  })

  it('returns false for RELEASED (not terminal)', () => {
    expect(isTerminalBookingStatus('RELEASED')).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// getValidTransitions
// ---------------------------------------------------------------------------

describe('getValidTransitions', () => {
  it('returns empty array for COMPLETED (terminal)', () => {
    expect(getValidTransitions('COMPLETED')).toEqual([])
  })

  it('returns empty array for CANCELLED (terminal)', () => {
    expect(getValidTransitions('CANCELLED')).toEqual([])
  })

  it('returns empty array for NO_SHOW (terminal)', () => {
    expect(getValidTransitions('NO_SHOW')).toEqual([])
  })

  it('returns empty array for REJECTED (terminal)', () => {
    expect(getValidTransitions('REJECTED')).toEqual([])
  })

  it('PENDING can transition to RESERVED, REJECTED, CANCELLED', () => {
    const transitions = getValidTransitions('PENDING')
    expect(transitions).toContain('RESERVED')
    expect(transitions).toContain('REJECTED')
    expect(transitions).toContain('CANCELLED')
  })

  it('CONFIRMED can transition to IN_PROGRESS, COMPLETED, CANCELLED, NO_SHOW', () => {
    const transitions = getValidTransitions('CONFIRMED')
    expect(transitions).toContain('IN_PROGRESS')
    expect(transitions).toContain('COMPLETED')
    expect(transitions).toContain('CANCELLED')
    expect(transitions).toContain('NO_SHOW')
  })

  it('RELEASED can only go back to PENDING', () => {
    expect(getValidTransitions('RELEASED')).toEqual(['PENDING'])
  })
})

// ---------------------------------------------------------------------------
// Saga - generic orchestrator
// ---------------------------------------------------------------------------

describe('Saga - successful execution', () => {
  it('executes all steps in order', async () => {
    const order: string[] = []
    const saga = new Saga('TEST', 'entity-1', 'tenant-1', [
      {
        name: 'step-a',
        execute: async () => { order.push('a'); return 'result-a' },
        compensate: async () => { order.push('compensate-a') },
      },
      {
        name: 'step-b',
        execute: async () => { order.push('b'); return 'result-b' },
        compensate: async () => { order.push('compensate-b') },
      },
    ])

    await saga.run()
    expect(order).toEqual(['a', 'b'])
  })

  it('resolves without throwing when all steps succeed', async () => {
    const saga = new Saga('TEST', 'entity-1', 'tenant-1', [
      {
        name: 'step-1',
        execute: async () => 'ok',
        compensate: async () => {},
      },
    ])
    await expect(saga.run()).resolves.toBeUndefined()
  })
})

describe('Saga - failure and compensation', () => {
  it('compensates completed steps in reverse order when a step fails', async () => {
    const order: string[] = []
    const saga = new Saga('TEST', 'entity-1', 'tenant-1', [
      {
        name: 'step-a',
        execute: async () => { order.push('execute-a'); return 'result-a' },
        compensate: async () => { order.push('compensate-a') },
      },
      {
        name: 'step-b',
        execute: async () => { order.push('execute-b'); return 'result-b' },
        compensate: async () => { order.push('compensate-b') },
      },
      {
        name: 'step-c',
        execute: async () => { throw new Error('step-c failed') },
        compensate: async () => { order.push('compensate-c') },
      },
    ])

    await expect(saga.run()).rejects.toThrow('step-c failed')

    // step-c never completed, so it should NOT be compensated
    // step-b completed, compensated first (reverse order)
    // step-a completed, compensated second
    expect(order).toEqual(['execute-a', 'execute-b', 'compensate-b', 'compensate-a'])
  })

  it('re-throws the original error after compensation', async () => {
    const originalError = new Error('original failure')
    const saga = new Saga('TEST', 'entity-1', 'tenant-1', [
      {
        name: 'step-1',
        execute: async () => {},
        compensate: async () => {},
      },
      {
        name: 'step-2',
        execute: async () => { throw originalError },
        compensate: async () => {},
      },
    ])

    await expect(saga.run()).rejects.toBe(originalError)
  })

  it('does not throw when compensation itself fails (logs but continues)', async () => {
    // Compensation failure must not hide the original error
    const saga = new Saga('TEST', 'entity-1', 'tenant-1', [
      {
        name: 'step-1',
        execute: async () => 'result',
        compensate: async () => { throw new Error('compensation failed') },
      },
      {
        name: 'step-2',
        execute: async () => { throw new Error('original error') },
        compensate: async () => {},
      },
    ])

    // Should throw the original error, not the compensation error
    await expect(saga.run()).rejects.toThrow('original error')
  })

  it('passes step result to its own compensate function', async () => {
    const compensateArg: unknown[] = []
    const saga = new Saga('TEST', 'entity-1', 'tenant-1', [
      {
        name: 'step-with-result',
        execute: async () => ({ id: 'invoice-123' }),
        compensate: async (result) => { compensateArg.push(result) },
      },
      {
        name: 'failing-step',
        execute: async () => { throw new Error('fail') },
        compensate: async () => {},
      },
    ])

    await expect(saga.run()).rejects.toThrow()
    expect(compensateArg).toEqual([{ id: 'invoice-123' }])
  })
})

// ---------------------------------------------------------------------------
// createBookingConfirmationSaga
// ---------------------------------------------------------------------------

describe('createBookingConfirmationSaga', () => {
  function makeDeps(overrides: Partial<Parameters<typeof createBookingConfirmationSaga>[0]> = {}) {
    return {
      bookingId: 'booking-1',
      tenantId: 'tenant-1',
      staffId: 'staff-1',
      updateBookingStatus: vi.fn().mockResolvedValue(undefined),
      createInvoiceForBooking: vi.fn().mockResolvedValue({ id: 'invoice-1' }),
      voidInvoice: vi.fn().mockResolvedValue(undefined),
      sendInngestEvent: vi.fn().mockResolvedValue(undefined),
      ...overrides,
    }
  }

  it('creates a Saga instance', () => {
    const deps = makeDeps()
    const saga = createBookingConfirmationSaga(deps)
    expect(saga).toBeInstanceOf(Saga)
  })

  it('updates booking status to CONFIRMED on successful run', async () => {
    const deps = makeDeps()
    await createBookingConfirmationSaga(deps).run()
    expect(deps.updateBookingStatus).toHaveBeenCalledWith('booking-1', 'CONFIRMED')
  })

  it('creates an invoice for the booking on successful run', async () => {
    const deps = makeDeps()
    await createBookingConfirmationSaga(deps).run()
    expect(deps.createInvoiceForBooking).toHaveBeenCalledWith('booking-1')
  })

  it('sends booking/confirmed Inngest event on successful run', async () => {
    const deps = makeDeps()
    await createBookingConfirmationSaga(deps).run()
    expect(deps.sendInngestEvent).toHaveBeenCalledWith(
      'booking/confirmed',
      expect.objectContaining({ bookingId: 'booking-1', tenantId: 'tenant-1' })
    )
  })

  it('sends calendar/sync.push Inngest event on successful run', async () => {
    const deps = makeDeps()
    await createBookingConfirmationSaga(deps).run()
    expect(deps.sendInngestEvent).toHaveBeenCalledWith(
      'calendar/sync.push',
      expect.objectContaining({ bookingId: 'booking-1', userId: 'staff-1', tenantId: 'tenant-1' })
    )
  })

  it('reverts booking status to PENDING when invoice creation fails', async () => {
    const deps = makeDeps({
      createInvoiceForBooking: vi.fn().mockRejectedValue(new Error('invoice failed')),
    })

    await expect(createBookingConfirmationSaga(deps).run()).rejects.toThrow('invoice failed')

    // Compensation: revert booking status to PENDING
    expect(deps.updateBookingStatus).toHaveBeenCalledWith('booking-1', 'PENDING')
  })

  it('voids invoice when notification send fails', async () => {
    const deps = makeDeps({
      sendInngestEvent: vi.fn()
        .mockResolvedValueOnce(undefined) // booking/confirmed succeeds
        .mockRejectedValueOnce(new Error('notification failed')) // calendar/sync.push fails
        // But wait - notification is step 3 (send-notification) and calendar is step 4.
        // Let's set it up so the third sendInngestEvent call fails.
    })

    // Actually, sendInngestEvent is called for both notification and calendar events.
    // Step 3 (send-notification) calls sendInngestEvent('booking/confirmed', ...) and step 4
    // (sync-calendar) calls sendInngestEvent('calendar/sync.push', ...).
    // If step 4 fails, step 3's compensation is a no-op and step 2 (invoice) should be voided.
    const deps2 = makeDeps({
      sendInngestEvent: vi.fn()
        .mockResolvedValueOnce(undefined)               // step 3 send-notification succeeds
        .mockRejectedValueOnce(new Error('sync fail')), // step 4 sync-calendar fails
    })

    await expect(createBookingConfirmationSaga(deps2).run()).rejects.toThrow('sync fail')

    // invoice created in step 2 must be voided as compensation
    expect(deps2.voidInvoice).toHaveBeenCalledWith('invoice-1')
  })

  it('reverts booking status when all subsequent steps fail', async () => {
    const deps = makeDeps({
      createInvoiceForBooking: vi.fn().mockRejectedValue(new Error('db error')),
    })

    await expect(createBookingConfirmationSaga(deps).run()).rejects.toThrow('db error')

    // Step 1 (update-booking-status) must be compensated → revert to PENDING
    expect(deps.updateBookingStatus).toHaveBeenCalledWith('booking-1', 'PENDING')
  })
})
