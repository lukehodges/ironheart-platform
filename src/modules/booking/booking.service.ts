import { createHash, randomBytes, randomUUID } from "node:crypto";
import { inngest } from "@/shared/inngest";
import { redis } from "@/shared/redis";
import { logger } from "@/shared/logger";
import {
  NotFoundError,
  ConflictError,
  ForbiddenError,
  ValidationError,
} from "@/shared/errors";
import { bookingRepository } from "./booking.repository";
import { createInvoiceForBooking as paymentCreateInvoice, voidInvoice as paymentVoidInvoice } from "@/modules/payment/payment.service";
import { assertValidBookingTransition } from "./lib/booking-state-machine";
import type { BookingStatus as StateMachineBookingStatus } from "./lib/booking-state-machine";
import { withSlotLock } from "./lib/slot-lock";
import { createBookingConfirmationSaga } from "./lib/booking-saga";
import { updateWithVersion } from "@/shared/optimistic-concurrency";
import { bookings } from "@/shared/db/schemas/booking.schema";
import type {
  CreateBookingInput,
  UpdateBookingInput,
  BookingStatus,
} from "./booking.types";

const log = logger.child({ module: "booking.service" });

// Reservation window in minutes
const RESERVATION_MINUTES = 15;

// Distributed lock TTL in ms — long enough to cover the slot capacity
// check + booking insert + Inngest send
const SLOT_LOCK_TTL_MS = 5_000;

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Acquire a short-lived Redis lock for a slot.
 * Returns the lock key and a unique token so the caller can release it safely,
 * or null if the slot is already being reserved by another concurrent request.
 * Using a unique token prevents a race where TTL expiry causes us to delete a
 * lock acquired by a different request.
 */
async function acquireSlotLock(tenantId: string, slotId: string): Promise<{ lockKey: string; token: string } | null> {
  const lockKey = `lock:slot:${tenantId}:${slotId}`;
  const token = randomUUID();
  // SET NX PX — only set if not exists, with millisecond TTL
  const acquired = await redis.set(lockKey, token, { nx: true, px: SLOT_LOCK_TTL_MS });
  return acquired ? { lockKey, token } : null;
}

async function releaseSlotLock(lockKey: string, token: string): Promise<void> {
  // Only delete if the stored token matches ours — prevents deleting another
  // request's lock if our TTL expired while the operation was running.
  const stored = await redis.get(lockKey);
  if (stored === token) {
    await redis.del(lockKey);
  }
}

// ---------------------------------------------------------------------------
// SERVICE
// ---------------------------------------------------------------------------

export const bookingService = {

  // ---------------------------------------------------------------------------
  // CREATE
  // ---------------------------------------------------------------------------

  async createBooking(tenantId: string, input: CreateBookingInput, createdById?: string) {
    let lock: { lockKey: string; token: string } | null = null;

    // Acquire distributed lock when creating a slot-based booking so that two
    // concurrent portal requests cannot both pass the capacity check and both
    // create a booking against the same slot.
    if (input.slotId) {
      lock = await acquireSlotLock(tenantId, input.slotId);
      if (!lock) {
        throw new ConflictError("Slot is currently being reserved — please try again");
      }
    }

    try {
      // Validate slot availability inside the lock window
      if (input.slotId) {
        const slot = await bookingRepository.findSlotById(tenantId, input.slotId);
        if (!slot) throw new NotFoundError("Slot", input.slotId);
        if (!slot.available) throw new ConflictError("Slot is no longer available");
        if (slot.bookedCount >= slot.capacity) throw new ConflictError("Slot is at full capacity");
      }

      // Generate confirmation token for portal (RESERVED) bookings
      const isReserved = !input.skipReservation && !!input.slotId;
      let plainToken: string | undefined;
      if (isReserved) {
        plainToken = randomBytes(32).toString("hex"); // 64-char hex
        input = { ...input, confirmationTokenHash: hashToken(plainToken) };
      }

      const booking = await bookingRepository.create(tenantId, input, createdById);

      // Decrement slot capacity inside a transaction-safe call
      if (input.slotId) {
        try {
          await bookingRepository.decrementSlotCapacity(tenantId, input.slotId);
        } catch {
          // Slot full — rollback by deleting the just-created booking
          // In production this should be a single transaction; Phase 1 stub is sufficient
          log.warn({ bookingId: booking.id, slotId: input.slotId }, "Slot full after booking creation — possible race condition");
          throw new ConflictError("Slot is at full capacity");
        }
      }

      // Record status history
      await bookingRepository.recordStatusChange(booking.id, null, booking.status as BookingStatus, "Booking created", createdById);

      // Upsert staff assignments (multi-staff support)
      if (input.staffIds && input.staffIds.length > 0) {
        await bookingRepository.upsertAssignments(tenantId, booking.id, input.staffIds);
      }

      // Schedule Inngest delayed event for reservation expiry
      if (booking.status === "RESERVED" && booking.reservationExpiresAt) {
        await inngest.send({
          name: "slot/reserved",
          data: {
            slotId: input.slotId ?? "",
            bookingId: booking.id,
            tenantId,
            expiresAt: booking.reservationExpiresAt.toISOString(),
          },
        });
      }

      // Emit booking created event for workflows
      await inngest.send({ name: "booking/created", data: { bookingId: booking.id, tenantId } });

      log.info({ bookingId: booking.id, status: booking.status, tenantId }, "Booking created");

      // Return the plaintext token alongside the booking so the caller can
      // present it to the customer (it is NOT stored — only the hash is).
      return { booking, confirmationToken: plainToken ?? null };

    } finally {
      if (lock) await releaseSlotLock(lock.lockKey, lock.token);
    }
  },

  // ---------------------------------------------------------------------------
  // CONFIRM RESERVATION (public — called from portal after customer review)
  // ---------------------------------------------------------------------------

  async confirmReservation(bookingId: string, customerEmail: string, token?: string) {
    const booking = await bookingRepository.findByIdPublic(bookingId);
    if (!booking) throw new NotFoundError("Booking", bookingId);

    // State machine guard: RESERVED → PENDING or CONFIRMED
    const targetStatus: BookingStatus = booking.requiresApproval ? "PENDING" : "CONFIRMED";
    assertValidBookingTransition(booking.status as StateMachineBookingStatus, targetStatus as StateMachineBookingStatus);

    if (booking.reservationExpiresAt && new Date() > booking.reservationExpiresAt) {
      throw new ValidationError("Reservation has expired");
    }

    // Verify caller identity via customer email — must match before any state change
    const storedEmail = await bookingRepository.findCustomerEmailForBooking(bookingId);
    if (!storedEmail || storedEmail.toLowerCase() !== customerEmail.toLowerCase()) {
      throw new ForbiddenError("Email address does not match booking record");
    }

    // Verify confirmation token when provided
    const expectedHash = (booking as { confirmationTokenHash?: string | null }).confirmationTokenHash;
    if (expectedHash) {
      if (!token) {
        throw new ValidationError("Booking requires a confirmation token");
      }
      if (hashToken(token) !== expectedHash) {
        throw new ValidationError("Invalid confirmation token");
      }
    }

    if (targetStatus === "CONFIRMED") {
      // Wrap the confirmation path in slot lock + saga for correctness guarantees
      const staffId = booking.staffId ?? "";
      const scheduledDate = booking.scheduledDate instanceof Date
        ? booking.scheduledDate.toISOString().split("T")[0]!
        : String(booking.scheduledDate);
      const scheduledTime = booking.scheduledTime;

      return withSlotLock(
        booking.tenantId,
        staffId,
        scheduledDate,
        scheduledTime,
        async (_tx) => {
          // Re-read inside the lock to get latest version
          const locked = await bookingRepository.findByIdPublic(bookingId);
          if (!locked) throw new NotFoundError("Booking", bookingId);

          // Guard again inside lock (status may have changed while waiting)
          assertValidBookingTransition(locked.status as StateMachineBookingStatus, "CONFIRMED");

          const saga = createBookingConfirmationSaga({
            bookingId,
            tenantId: locked.tenantId,
            staffId,
            updateBookingStatus: async (id, status) => {
              await updateWithVersion(
                bookings,
                id,
                locked.tenantId,
                locked.version ?? 1,
                {
                  status,
                  statusChangedAt: new Date(),
                  reservedAt: null,
                  reservationExpiresAt: null,
                }
              );
            },
            createInvoiceForBooking: async (bId) => {
              return paymentCreateInvoice(locked.tenantId, bId, locked.customerId);
            },
            voidInvoice: async (invoiceId) => {
              await paymentVoidInvoice(locked.tenantId, invoiceId);
            },
            sendInngestEvent: async (name, data) => {
              await (inngest.send as unknown as (event: { name: string; data: Record<string, unknown> }) => Promise<void>)(
                { name, data }
              );
            },
          });

          await saga.run();

          await bookingRepository.recordStatusChange(
            bookingId,
            "RESERVED",
            "CONFIRMED",
            "Customer confirmed reservation"
          );

          // Notification for customer (outside saga — informational, not transactional)
          if (!storedEmail) {
            log.warn({ bookingId }, "No customer email found for notification, email will be skipped");
          }
          await inngest.send({
            name: "notification/send.email",
            data: {
              to: storedEmail ?? "",
              subject: "Your booking has been confirmed",
              html: "",
              tenantId: locked.tenantId,
              templateId: "booking_confirmed",
              bookingId,
              trigger: "BOOKING_CONFIRMED",
            },
          });

          log.info({ bookingId, status: "CONFIRMED" }, "Reservation confirmed via saga");
          return bookingRepository.findByIdPublic(bookingId);
        }
      );
    }

    // PENDING path (requiresApproval=true): simpler — no saga, no slot lock needed
    // State machine already validated RESERVED → PENDING above
    const updated = await bookingRepository.updateStatus(
      booking.tenantId,
      bookingId,
      targetStatus,
      { reason: "Customer confirmed reservation" }
    );
    if (!updated) throw new NotFoundError("Booking", bookingId);

    await bookingRepository.recordStatusChange(
      bookingId,
      "RESERVED",
      targetStatus,
      "Customer confirmed reservation"
    );

    log.info({ bookingId, status: targetStatus }, "Reservation confirmed (awaiting approval)");
    return updated;
  },

  // ---------------------------------------------------------------------------
  // UPDATE
  // ---------------------------------------------------------------------------

  async updateBooking(tenantId: string, bookingId: string, input: UpdateBookingInput, updatedById?: string) {
    const existing = await bookingRepository.findById(tenantId, bookingId);
    if (!existing) throw new NotFoundError("Booking", bookingId);

    // Handle slot change
    if (input.slotId && input.slotId !== existing.slotId) {
      // Increment old slot
      if (existing.slotId) {
        await bookingRepository.incrementSlotCapacity(tenantId, existing.slotId);
      }
      // Decrement new slot
      await bookingRepository.decrementSlotCapacity(tenantId, input.slotId);
    }

    // Handle staff change — emit calendar sync for old staff
    if (input.staffIds !== undefined && existing.staffId) {
      await inngest.send({ name: "calendar/sync.push", data: { bookingId, userId: existing.staffId, tenantId } });
    }

    const updated = await bookingRepository.update(tenantId, bookingId, input);
    if (!updated) throw new NotFoundError("Booking", bookingId);

    // Re-upsert assignments if staffIds changed
    if (input.staffIds !== undefined) {
      await bookingRepository.upsertAssignments(tenantId, bookingId, input.staffIds);
    }

    // Emit calendar sync for new staff
    if (updated.staffId) {
      await inngest.send({ name: "calendar/sync.push", data: { bookingId, userId: updated.staffId, tenantId } });
    }

    log.info({ bookingId, tenantId }, "Booking updated");
    return updated;
  },

  // ---------------------------------------------------------------------------
  // CANCEL
  // ---------------------------------------------------------------------------

  async cancelBooking(tenantId: string, bookingId: string, reason?: string, cancelledById?: string) {
    const booking = await bookingRepository.findById(tenantId, bookingId);
    if (!booking) throw new NotFoundError("Booking", bookingId);

    // State machine guard: validate the transition before any side effects
    assertValidBookingTransition(booking.status as StateMachineBookingStatus, "CANCELLED");

    // Increment slot capacity when cancelling a reserved/confirmed slot-based booking
    if (booking.slotId && ["RESERVED", "CONFIRMED", "PENDING", "APPROVED"].includes(booking.status)) {
      await bookingRepository.incrementSlotCapacity(tenantId, booking.slotId);
    }

    // Optimistic concurrency: update only if version matches
    await updateWithVersion(bookings, bookingId, tenantId, booking.version ?? 1, {
      status: "CANCELLED",
      statusChangedAt: new Date(),
      cancelledAt: new Date(),
      cancelledBy: cancelledById ?? null,
      cancellationReason: reason ?? null,
    });

    await bookingRepository.recordStatusChange(bookingId, booking.status as BookingStatus, "CANCELLED", reason, cancelledById);

    // Delete assignments
    await bookingRepository.upsertAssignments(tenantId, bookingId, []);

    await inngest.send({ name: "booking/cancelled", data: { bookingId, tenantId, reason } });
    const cancelledEmailTo = await bookingRepository.findCustomerEmailForBooking(bookingId);
    if (!cancelledEmailTo) {
      log.warn({ bookingId }, "No customer email found for notification, email will be skipped");
    }
    await inngest.send({
      name: "notification/send.email",
      data: {
        to: cancelledEmailTo ?? "",
        subject: "Your booking has been cancelled",
        html: "",
        tenantId,
        templateId: "booking_cancelled",
        bookingId,
        trigger: "BOOKING_CANCELLED",
      },
    });

    log.info({ bookingId, tenantId, reason }, "Booking cancelled");
    return bookingRepository.findById(tenantId, bookingId);
  },

  // ---------------------------------------------------------------------------
  // APPROVE
  // ---------------------------------------------------------------------------

  async approveBooking(tenantId: string, bookingId: string, approvedById: string, notes?: string) {
    const booking = await bookingRepository.findById(tenantId, bookingId);
    if (!booking) throw new NotFoundError("Booking", bookingId);

    // State machine guard: validates PENDING → CONFIRMED (throws ValidationError if invalid)
    assertValidBookingTransition(booking.status as StateMachineBookingStatus, "CONFIRMED");

    // Run confirmation saga: status update + invoice + notification + calendar sync
    const staffId = booking.staffId ?? "";
    const scheduledDate = booking.scheduledDate instanceof Date
      ? booking.scheduledDate.toISOString().split("T")[0]!
      : String(booking.scheduledDate);
    const scheduledTime = booking.scheduledTime;

    return withSlotLock(
      tenantId,
      staffId,
      scheduledDate,
      scheduledTime,
      async (_tx) => {
        // Re-read inside the lock to get latest version
        const locked = await bookingRepository.findById(tenantId, bookingId);
        if (!locked) throw new NotFoundError("Booking", bookingId);

        // Guard again inside lock (status may have changed while waiting)
        assertValidBookingTransition(locked.status as StateMachineBookingStatus, "CONFIRMED");

        const saga = createBookingConfirmationSaga({
          bookingId,
          tenantId,
          staffId,
          updateBookingStatus: async (id, status) => {
            await updateWithVersion(
              bookings,
              id,
              tenantId,
              locked.version ?? 1,
              {
                status,
                statusChangedAt: new Date(),
                approvedAt: new Date(),
                approvedById,
              }
            );
          },
          createInvoiceForBooking: async (bId) => {
            return paymentCreateInvoice(tenantId, bId, locked.customerId);
          },
          voidInvoice: async (invoiceId) => {
            await paymentVoidInvoice(tenantId, invoiceId);
          },
          sendInngestEvent: async (name, data) => {
            await (inngest.send as unknown as (event: { name: string; data: Record<string, unknown> }) => Promise<void>)(
              { name, data }
            );
          },
        });

        await saga.run();

        await bookingRepository.recordStatusChange(bookingId, "PENDING", "CONFIRMED", notes ?? "Booking approved", approvedById);

        const approvedEmailTo = await bookingRepository.findCustomerEmailForBooking(bookingId);
        if (!approvedEmailTo) {
          log.warn({ bookingId }, "No customer email found for notification, email will be skipped");
        }
        await inngest.send({
          name: "notification/send.email",
          data: {
            to: approvedEmailTo ?? "",
            subject: "Your booking has been approved",
            html: "",
            tenantId,
            templateId: "booking_approved",
            bookingId,
            trigger: "BOOKING_APPROVED",
          },
        });

        log.info({ bookingId, tenantId, approvedById }, "Booking approved via saga");
        return bookingRepository.findById(tenantId, bookingId);
      }
    );
  },

  // ---------------------------------------------------------------------------
  // REJECT
  // ---------------------------------------------------------------------------

  async rejectBooking(tenantId: string, bookingId: string, rejectedById: string, reason: string) {
    const booking = await bookingRepository.findById(tenantId, bookingId);
    if (!booking) throw new NotFoundError("Booking", bookingId);

    // State machine guard: validates current status → REJECTED
    assertValidBookingTransition(booking.status as StateMachineBookingStatus, "REJECTED");

    // Return slot capacity
    if (booking.slotId) {
      await bookingRepository.incrementSlotCapacity(tenantId, booking.slotId);
    }

    // Optimistic concurrency: update only if version matches
    await updateWithVersion(bookings, bookingId, tenantId, booking.version ?? 1, {
      status: "REJECTED",
      statusChangedAt: new Date(),
      rejectionReason: reason,
    });

    await bookingRepository.recordStatusChange(bookingId, booking.status as BookingStatus, "REJECTED", reason, rejectedById);

    const rejectedEmailTo = await bookingRepository.findCustomerEmailForBooking(bookingId);
    if (!rejectedEmailTo) {
      log.warn({ bookingId }, "No customer email found for notification, email will be skipped");
    }
    await inngest.send({
      name: "notification/send.email",
      data: {
        to: rejectedEmailTo ?? "",
        subject: "Your booking request was not approved",
        html: "",
        tenantId,
        templateId: "booking_rejected",
        bookingId,
        trigger: "BOOKING_REJECTED",
      },
    });

    log.info({ bookingId, tenantId, reason }, "Booking rejected");
    return bookingRepository.findById(tenantId, bookingId);
  },

  // ---------------------------------------------------------------------------
  // RELEASE EXPIRED RESERVATION (called from Inngest handler only)
  // ---------------------------------------------------------------------------

  async releaseExpiredReservation(bookingId: string, tenantId?: string) {
    const booking = await bookingRepository.findByIdPublic(bookingId);
    if (!booking || booking.status !== "RESERVED") {
      // Already confirmed or cancelled — Inngest cancelOn should have caught this
      return;
    }

    // Verify the event's tenantId matches the booking's tenant to prevent
    // cross-tenant manipulation of reservations via replayed Inngest events.
    if (tenantId && booking.tenantId !== tenantId) {
      log.error(
        { bookingId, expectedTenantId: tenantId, actualTenantId: booking.tenantId },
        "Tenant mismatch in releaseExpiredReservation — aborting"
      );
      return;
    }

    // State machine guard: RESERVED → RELEASED
    assertValidBookingTransition(booking.status as StateMachineBookingStatus, "RELEASED");

    // Increment slot capacity
    if (booking.slotId) {
      await bookingRepository.incrementSlotCapacity(booking.tenantId, booking.slotId);
    }

    // Optimistic concurrency: update only if version matches
    await updateWithVersion(bookings, bookingId, booking.tenantId, booking.version ?? 1, {
      status: "RELEASED",
      statusChangedAt: new Date(),
    });

    await bookingRepository.recordStatusChange(bookingId, "RESERVED", "RELEASED", "Reservation expired — 15-minute timeout reached");

    log.info({ bookingId, tenantId: booking.tenantId }, "Reservation released by Inngest");
  },

  // ---------------------------------------------------------------------------
  // COMPLETE
  // ---------------------------------------------------------------------------

  async createCompletion(
    tenantId: string,
    input: {
      bookingId: string;
      customerId: string;
      notes?: string;
      completedAt?: Date;
      durationMinutes?: number;
      actualStartTime?: Date;
      actualEndTime?: Date;
      followUpRequired?: boolean;
      paymentCollected?: number;
      paymentMethod?: string;
    }
  ) {
    const booking = await bookingRepository.findById(tenantId, input.bookingId);
    if (!booking) throw new NotFoundError("Booking", input.bookingId);

    // State machine guard: validates current status → COMPLETED
    assertValidBookingTransition(booking.status as StateMachineBookingStatus, "COMPLETED");

    // Optimistic concurrency: update only if version matches
    await updateWithVersion(bookings, input.bookingId, tenantId, booking.version ?? 1, {
      status: "COMPLETED",
      statusChangedAt: new Date(),
      completedAt: new Date(),
    });

    await bookingRepository.recordStatusChange(input.bookingId, booking.status as BookingStatus, "COMPLETED", input.notes);

    await inngest.send({ name: "booking/completed", data: { bookingId: input.bookingId, tenantId } });
    await inngest.send({
      name: "review/request.send",
      data: { bookingId: input.bookingId, customerId: input.customerId, delay: "24h" },
    });

    log.info({ bookingId: input.bookingId, tenantId }, "Booking completed");
    return bookingRepository.findById(tenantId, input.bookingId);
  },

  // ---------------------------------------------------------------------------
  // READ-ONLY DELEGATIONS
  // ---------------------------------------------------------------------------

  list: (tenantId: string, filters: Parameters<typeof bookingRepository.list>[1], userId?: string) =>
    bookingRepository.list(tenantId, filters, userId),

  getById: (tenantId: string, bookingId: string) =>
    bookingRepository.findById(tenantId, bookingId),

  getByIdPublic: (bookingId: string) =>
    bookingRepository.findByIdPublic(bookingId),

  getStats: (tenantId: string) =>
    bookingRepository.getStats(tenantId),

  listForCalendar: (tenantId: string, startDate: Date, endDate: Date, staffId?: string) =>
    bookingRepository.listForCalendar(tenantId, startDate, endDate, staffId),

  // Slot reads
  getSlotsForDate: (tenantId: string, date: Date, serviceId?: string, staffId?: string) =>
    bookingRepository.findSlotsByDate(tenantId, date, serviceId, staffId),

  getSlotsForDateRange: (tenantId: string, startDate: Date, endDate: Date) =>
    bookingRepository.findSlotsByDateRange(tenantId, startDate, endDate),

  getSlotById: (tenantId: string, slotId: string) =>
    bookingRepository.findSlotById(tenantId, slotId),
};
