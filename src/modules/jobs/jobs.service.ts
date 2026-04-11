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
import { jobRepository } from "./jobs.repository";
import { createInvoiceForBooking as paymentCreateInvoice, voidInvoice as paymentVoidInvoice } from "@/modules/payment/payment.service";
import { assertValidBookingTransition } from "./lib/booking-state-machine";
import type { BookingStatus as StateMachineBookingStatus } from "./lib/booking-state-machine";
import { withSlotLock } from "./lib/slot-lock";
import { createBookingConfirmationSaga } from "./lib/booking-saga";
import { updateWithVersion } from "@/shared/optimistic-concurrency";
import { jobs } from "@/shared/db/schemas/booking.schema";
import type {
  CreateJobInput,
  UpdateJobInput,
  JobStatus,
} from "./jobs.types";

const log = logger.child({ module: "jobs.service" });

// Reservation window in minutes
const RESERVATION_MINUTES = 15;

// Distributed lock TTL in ms
const SLOT_LOCK_TTL_MS = 5_000;

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

async function acquireSlotLock(tenantId: string, slotId: string): Promise<{ lockKey: string; token: string } | null> {
  const lockKey = `lock:slot:${tenantId}:${slotId}`;
  const token = randomUUID();
  const acquired = await redis.set(lockKey, token, { nx: true, px: SLOT_LOCK_TTL_MS });
  return acquired ? { lockKey, token } : null;
}

async function releaseSlotLock(lockKey: string, token: string): Promise<void> {
  const stored = await redis.get(lockKey);
  if (stored === token) {
    await redis.del(lockKey);
  }
}

// ---------------------------------------------------------------------------
// SERVICE
// ---------------------------------------------------------------------------

export const jobService = {

  // ---------------------------------------------------------------------------
  // CREATE
  // ---------------------------------------------------------------------------

  async createJob(tenantId: string, input: CreateJobInput, createdById?: string) {
    let lock: { lockKey: string; token: string } | null = null;

    if (input.slotId) {
      lock = await acquireSlotLock(tenantId, input.slotId);
      if (!lock) {
        throw new ConflictError("Slot is currently being reserved - please try again");
      }
    }

    try {
      if (input.slotId) {
        const slot = await jobRepository.findSlotById(tenantId, input.slotId);
        if (!slot) throw new NotFoundError("Slot", input.slotId);
        if (!slot.available) throw new ConflictError("Slot is no longer available");
        if (slot.bookedCount >= slot.capacity) throw new ConflictError("Slot is at full capacity");
      }

      const isReserved = !input.skipReservation && !!input.slotId;
      let plainToken: string | undefined;
      if (isReserved) {
        plainToken = randomBytes(32).toString("hex");
        input = { ...input, confirmationTokenHash: hashToken(plainToken) };
      }

      const job = await jobRepository.create(tenantId, input, createdById);

      if (input.slotId) {
        try {
          await jobRepository.decrementSlotCapacity(tenantId, input.slotId);
        } catch {
          log.warn({ jobId: job.id, slotId: input.slotId }, "Slot full after job creation - possible race condition");
          throw new ConflictError("Slot is at full capacity");
        }
      }

      await jobRepository.recordStatusChange(job.id, null, job.status as JobStatus, "Job created", createdById);

      if (input.staffIds && input.staffIds.length > 0) {
        await jobRepository.upsertAssignments(tenantId, job.id, input.staffIds);
      }

      if (job.status === "RESERVED" && job.reservationExpiresAt) {
        await inngest.send({
          name: "slot/reserved",
          data: {
            slotId: input.slotId ?? "",
            jobId: job.id,
            tenantId,
            expiresAt: job.reservationExpiresAt.toISOString(),
          },
        });
      }

      await inngest.send({ name: "job/created", data: { jobId: job.id, tenantId } });

      log.info({ jobId: job.id, status: job.status, tenantId }, "Job created");

      return { booking: job, job, confirmationToken: plainToken ?? null };

    } finally {
      if (lock) await releaseSlotLock(lock.lockKey, lock.token);
    }
  },

  // Backward-compat
  async createBooking(tenantId: string, input: CreateJobInput, createdById?: string) {
    return jobService.createJob(tenantId, input, createdById);
  },

  // ---------------------------------------------------------------------------
  // CONFIRM RESERVATION
  // ---------------------------------------------------------------------------

  async confirmReservation(bookingId: string, customerEmail: string, token?: string) {
    const job = await jobRepository.findByIdPublic(bookingId);
    if (!job) throw new NotFoundError("Job", bookingId);

    const targetStatus: JobStatus = job.requiresApproval ? "PENDING" : "CONFIRMED";
    assertValidBookingTransition(job.status as StateMachineBookingStatus, targetStatus as StateMachineBookingStatus);

    if (job.reservationExpiresAt && new Date() > job.reservationExpiresAt) {
      throw new ValidationError("Reservation has expired");
    }

    const storedEmail = await jobRepository.findCustomerEmailForBooking(bookingId);
    if (!storedEmail || storedEmail.toLowerCase() !== customerEmail.toLowerCase()) {
      throw new ForbiddenError("Email address does not match booking record");
    }

    const expectedHash = (job as { confirmationTokenHash?: string | null }).confirmationTokenHash;
    if (expectedHash) {
      if (!token) {
        throw new ValidationError("Booking requires a confirmation token");
      }
      if (hashToken(token) !== expectedHash) {
        throw new ValidationError("Invalid confirmation token");
      }
    }

    if (targetStatus === "CONFIRMED") {
      const staffId = job.staffId ?? "";
      const scheduledDate = job.scheduledDate instanceof Date
        ? job.scheduledDate.toISOString().split("T")[0]!
        : String(job.scheduledDate);
      const scheduledTime = job.scheduledTime;

      return withSlotLock(
        job.tenantId,
        staffId,
        scheduledDate,
        scheduledTime,
        async (_tx) => {
          const locked = await jobRepository.findByIdPublic(bookingId);
          if (!locked) throw new NotFoundError("Job", bookingId);

          assertValidBookingTransition(locked.status as StateMachineBookingStatus, "CONFIRMED");

          const saga = createBookingConfirmationSaga({
            bookingId,
            tenantId: locked.tenantId,
            staffId,
            updateBookingStatus: async (id, status) => {
              await updateWithVersion(
                jobs,
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
              // Map old booking/* events to job/* events
              const mappedName = name.startsWith("booking/") ? name.replace("booking/", "job/") : name;
              await (inngest.send as unknown as (event: { name: string; data: Record<string, unknown> }) => Promise<void>)(
                { name: mappedName, data }
              );
            },
          });

          await saga.run();

          await jobRepository.recordStatusChange(
            bookingId,
            "RESERVED",
            "CONFIRMED",
            "Customer confirmed reservation"
          );

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
              jobId: bookingId,
              trigger: "BOOKING_CONFIRMED",
            },
          });

          log.info({ bookingId, status: "CONFIRMED" }, "Reservation confirmed via saga");
          return jobRepository.findByIdPublic(bookingId);
        }
      );
    }

    const updated = await jobRepository.updateStatus(
      job.tenantId,
      bookingId,
      targetStatus,
      { reason: "Customer confirmed reservation" }
    );
    if (!updated) throw new NotFoundError("Job", bookingId);

    await jobRepository.recordStatusChange(
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

  async updateJob(tenantId: string, jobId: string, input: UpdateJobInput, updatedById?: string) {
    const existing = await jobRepository.findById(tenantId, jobId);
    if (!existing) throw new NotFoundError("Job", jobId);

    if (input.slotId && input.slotId !== existing.slotId) {
      if (existing.slotId) {
        await jobRepository.incrementSlotCapacity(tenantId, existing.slotId);
      }
      await jobRepository.decrementSlotCapacity(tenantId, input.slotId);
    }

    if (input.staffIds !== undefined && existing.staffId) {
      await inngest.send({ name: "calendar/sync.push", data: { jobId, userId: existing.staffId, tenantId } });
    }

    const updated = await jobRepository.update(tenantId, jobId, input);
    if (!updated) throw new NotFoundError("Job", jobId);

    if (input.staffIds !== undefined) {
      await jobRepository.upsertAssignments(tenantId, jobId, input.staffIds);
    }

    if (updated.staffId) {
      await inngest.send({ name: "calendar/sync.push", data: { jobId, userId: updated.staffId, tenantId } });
    }

    log.info({ jobId, tenantId }, "Job updated");
    return updated;
  },

  // Backward-compat
  async updateBooking(tenantId: string, bookingId: string, input: UpdateJobInput, updatedById?: string) {
    return jobService.updateJob(tenantId, bookingId, input, updatedById);
  },

  // ---------------------------------------------------------------------------
  // CANCEL
  // ---------------------------------------------------------------------------

  async cancelJob(tenantId: string, jobId: string, reason?: string, cancelledById?: string) {
    const job = await jobRepository.findById(tenantId, jobId);
    if (!job) throw new NotFoundError("Job", jobId);

    assertValidBookingTransition(job.status as StateMachineBookingStatus, "CANCELLED");

    if (job.slotId && ["RESERVED", "CONFIRMED", "PENDING", "APPROVED"].includes(job.status)) {
      await jobRepository.incrementSlotCapacity(tenantId, job.slotId);
    }

    await updateWithVersion(jobs, jobId, tenantId, job.version ?? 1, {
      status: "CANCELLED",
      statusChangedAt: new Date(),
      cancelledAt: new Date(),
      cancelledBy: cancelledById ?? null,
      cancellationReason: reason ?? null,
    });

    await jobRepository.recordStatusChange(jobId, job.status as JobStatus, "CANCELLED", reason, cancelledById);

    await jobRepository.upsertAssignments(tenantId, jobId, []);

    await inngest.send({ name: "job/cancelled", data: { jobId, tenantId, reason } });
    const cancelledEmailTo = await jobRepository.findCustomerEmailForBooking(jobId);
    if (!cancelledEmailTo) {
      log.warn({ jobId }, "No customer email found for notification, email will be skipped");
    }
    await inngest.send({
      name: "notification/send.email",
      data: {
        to: cancelledEmailTo ?? "",
        subject: "Your booking has been cancelled",
        html: "",
        tenantId,
        templateId: "booking_cancelled",
        jobId: jobId,
        trigger: "BOOKING_CANCELLED",
      },
    });

    log.info({ jobId, tenantId, reason }, "Job cancelled");
    return jobRepository.findById(tenantId, jobId);
  },

  // Backward-compat
  async cancelBooking(tenantId: string, bookingId: string, reason?: string, cancelledById?: string) {
    return jobService.cancelJob(tenantId, bookingId, reason, cancelledById);
  },

  // ---------------------------------------------------------------------------
  // APPROVE
  // ---------------------------------------------------------------------------

  async approveBooking(tenantId: string, bookingId: string, approvedById: string, notes?: string) {
    const job = await jobRepository.findById(tenantId, bookingId);
    if (!job) throw new NotFoundError("Job", bookingId);

    assertValidBookingTransition(job.status as StateMachineBookingStatus, "CONFIRMED");

    const staffId = job.staffId ?? "";
    const scheduledDate = job.scheduledDate instanceof Date
      ? job.scheduledDate.toISOString().split("T")[0]!
      : String(job.scheduledDate);
    const scheduledTime = job.scheduledTime;

    return withSlotLock(
      tenantId,
      staffId,
      scheduledDate,
      scheduledTime,
      async (_tx) => {
        const locked = await jobRepository.findById(tenantId, bookingId);
        if (!locked) throw new NotFoundError("Job", bookingId);

        assertValidBookingTransition(locked.status as StateMachineBookingStatus, "CONFIRMED");

        const saga = createBookingConfirmationSaga({
          bookingId,
          tenantId,
          staffId,
          updateBookingStatus: async (id, status) => {
            await updateWithVersion(
              jobs,
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
            const mappedName = name.startsWith("booking/") ? name.replace("booking/", "job/") : name;
            await (inngest.send as unknown as (event: { name: string; data: Record<string, unknown> }) => Promise<void>)(
              { name: mappedName, data }
            );
          },
        });

        await saga.run();

        await jobRepository.recordStatusChange(bookingId, "PENDING", "CONFIRMED", notes ?? "Job approved", approvedById);

        const approvedEmailTo = await jobRepository.findCustomerEmailForBooking(bookingId);
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
            jobId: bookingId,
            trigger: "BOOKING_APPROVED",
          },
        });

        log.info({ bookingId, tenantId, approvedById }, "Job approved via saga");
        return jobRepository.findById(tenantId, bookingId);
      }
    );
  },

  // ---------------------------------------------------------------------------
  // REJECT
  // ---------------------------------------------------------------------------

  async rejectBooking(tenantId: string, bookingId: string, rejectedById: string, reason: string) {
    const job = await jobRepository.findById(tenantId, bookingId);
    if (!job) throw new NotFoundError("Job", bookingId);

    assertValidBookingTransition(job.status as StateMachineBookingStatus, "REJECTED");

    if (job.slotId) {
      await jobRepository.incrementSlotCapacity(tenantId, job.slotId);
    }

    await updateWithVersion(jobs, bookingId, tenantId, job.version ?? 1, {
      status: "REJECTED",
      statusChangedAt: new Date(),
      rejectionReason: reason,
    });

    await jobRepository.recordStatusChange(bookingId, job.status as JobStatus, "REJECTED", reason, rejectedById);

    const rejectedEmailTo = await jobRepository.findCustomerEmailForBooking(bookingId);
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
        jobId: bookingId,
        trigger: "BOOKING_REJECTED",
      },
    });

    log.info({ bookingId, tenantId, reason }, "Job rejected");
    return jobRepository.findById(tenantId, bookingId);
  },

  // ---------------------------------------------------------------------------
  // RELEASE EXPIRED RESERVATION
  // ---------------------------------------------------------------------------

  async releaseExpiredReservation(bookingId: string, tenantId?: string) {
    const job = await jobRepository.findByIdPublic(bookingId);
    if (!job || job.status !== "RESERVED") {
      return;
    }

    if (tenantId && job.tenantId !== tenantId) {
      log.error(
        { bookingId, expectedTenantId: tenantId, actualTenantId: job.tenantId },
        "Tenant mismatch in releaseExpiredReservation - aborting"
      );
      return;
    }

    assertValidBookingTransition(job.status as StateMachineBookingStatus, "RELEASED");

    if (job.slotId) {
      await jobRepository.incrementSlotCapacity(job.tenantId, job.slotId);
    }

    await updateWithVersion(jobs, bookingId, job.tenantId, job.version ?? 1, {
      status: "RELEASED",
      statusChangedAt: new Date(),
    });

    await jobRepository.recordStatusChange(bookingId, "RESERVED", "RELEASED", "Reservation expired - 15-minute timeout reached");

    log.info({ bookingId, tenantId: job.tenantId }, "Reservation released by Inngest");
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
    const job = await jobRepository.findById(tenantId, input.bookingId);
    if (!job) throw new NotFoundError("Job", input.bookingId);

    assertValidBookingTransition(job.status as StateMachineBookingStatus, "COMPLETED");

    await updateWithVersion(jobs, input.bookingId, tenantId, job.version ?? 1, {
      status: "COMPLETED",
      statusChangedAt: new Date(),
      completedAt: new Date(),
    });

    await jobRepository.recordStatusChange(input.bookingId, job.status as JobStatus, "COMPLETED", input.notes);

    await inngest.send({ name: "job/completed", data: { jobId: input.bookingId, tenantId } });
    await inngest.send({
      name: "review/request.send",
      data: { jobId: input.bookingId, customerId: input.customerId, delay: "24h" },
    });

    log.info({ jobId: input.bookingId, tenantId }, "Job completed");
    return jobRepository.findById(tenantId, input.bookingId);
  },

  // ---------------------------------------------------------------------------
  // READ-ONLY DELEGATIONS
  // ---------------------------------------------------------------------------

  list: (tenantId: string, filters: Parameters<typeof jobRepository.list>[1], userId?: string) =>
    jobRepository.list(tenantId, filters, userId),

  getById: (tenantId: string, jobId: string) =>
    jobRepository.findById(tenantId, jobId),

  getByIdPublic: (jobId: string) =>
    jobRepository.findByIdPublic(jobId),

  getStats: (tenantId: string) =>
    jobRepository.getStats(tenantId),

  listForCalendar: (tenantId: string, startDate: Date, endDate: Date, staffId?: string) =>
    jobRepository.listForCalendar(tenantId, startDate, endDate, staffId),

  getSlotsForDate: (tenantId: string, date: Date, serviceId?: string, staffId?: string) =>
    jobRepository.findSlotsByDate(tenantId, date, serviceId, staffId),

  getSlotsForDateRange: (tenantId: string, startDate: Date, endDate: Date) =>
    jobRepository.findSlotsByDateRange(tenantId, startDate, endDate),

  getSlotById: (tenantId: string, slotId: string) =>
    jobRepository.findSlotById(tenantId, slotId),
};

// Backward-compat alias
export const bookingService = jobService;
