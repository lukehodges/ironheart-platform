import { ValidationError } from '@/shared/errors'

export type BookingStatus =
  | 'PENDING'
  | 'RESERVED'
  | 'APPROVED'
  | 'CONFIRMED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_SHOW'
  | 'REJECTED'
  | 'RELEASED'

/**
 * Formally specified booking state machine (Invariant I2).
 * Terminal states (COMPLETED, CANCELLED, NO_SHOW, REJECTED) accept no outgoing transitions.
 */
const BOOKING_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  PENDING:     ['RESERVED', 'REJECTED', 'CANCELLED'],
  RESERVED:    ['APPROVED', 'CONFIRMED', 'RELEASED', 'CANCELLED'],
  APPROVED:    ['CONFIRMED', 'CANCELLED'],
  CONFIRMED:   ['IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW'],
  IN_PROGRESS: ['COMPLETED', 'CANCELLED', 'NO_SHOW'],
  COMPLETED:   [],
  CANCELLED:   [],
  NO_SHOW:     [],
  REJECTED:    [],
  RELEASED:    ['PENDING'],
}

export function assertValidBookingTransition(from: BookingStatus, to: BookingStatus): void {
  const allowed = BOOKING_TRANSITIONS[from]
  if (!allowed.includes(to)) {
    throw new ValidationError(
      `Invalid booking transition: ${from} → ${to}. ` +
        `Valid from ${from}: ${allowed.join(', ') || 'none (terminal state)'}`
    )
  }
}

export function isTerminalBookingStatus(status: BookingStatus): boolean {
  return BOOKING_TRANSITIONS[status].length === 0
}

export function getValidTransitions(status: BookingStatus): BookingStatus[] {
  return BOOKING_TRANSITIONS[status]
}
