import { z } from "zod";
import { inngest } from "@/shared/inngest";
import { bookingService } from "./booking.service";
import { logger } from "@/shared/logger";

const log = logger.child({ module: "booking.events" });

// ---------------------------------------------------------------------------
// Validation schemas for Inngest event payloads
// (Inngest delivers at-least-once; guards against malformed/replayed events)
// ---------------------------------------------------------------------------

const slotReservedSchema = z.object({
  slotId: z.string(),
  bookingId: z.string(),
  tenantId: z.string(),
  expiresAt: z.string().datetime(),
});

const bookingIdSchema = z.object({
  bookingId: z.string(),
  tenantId: z.string(),
});

/**
 * Release expired reservation — replaces /api/cron/release-slots.
 * Fires at exact expiry time (delayed Inngest event via slot/reserved).
 * Cancelled automatically when booking/confirmed or booking/cancelled fires.
 */
export const releaseExpiredReservation = inngest.createFunction(
  {
    id: "release-expired-reservation",
    cancelOn: [
      { event: "booking/confirmed", match: "data.bookingId" },
      { event: "booking/cancelled", match: "data.bookingId" },
    ],
  },
  { event: "slot/reserved" },
  async ({ event, step }) => {
    const payload = slotReservedSchema.parse(event.data);
    const { bookingId, tenantId, expiresAt } = payload;

    await step.sleepUntil("wait-for-expiry", new Date(expiresAt));

    await step.run("release-reservation", async () => {
      await bookingService.releaseExpiredReservation(bookingId, tenantId);
    });

    log.info({ bookingId, tenantId }, "Reservation released via Inngest");
  }
);

/**
 * Send booking confirmation email — Phase 4 will wire up Resend.
 * Stub: logs only.
 */
export const sendBookingConfirmationEmail = inngest.createFunction(
  { id: "send-booking-confirmation-email" },
  { event: "booking/confirmed" },
  async ({ event }) => {
    const { bookingId } = bookingIdSchema.parse(event.data);
    log.info({ bookingId }, "TODO Phase 4: send confirmation email");
  }
);

/**
 * Push booking to Google Calendar — Phase 4 will wire up the sync service.
 * Stub: logs only.
 */
export const pushBookingToCalendar = inngest.createFunction(
  { id: "push-booking-to-calendar" },
  { event: "calendar/sync.push" },
  async ({ event }) => {
    const payload = z.object({ bookingId: z.string(), userId: z.string() }).parse(event.data);
    log.info({ bookingId: payload.bookingId, userId: payload.userId }, "TODO Phase 4: push to calendar");
  }
);

/** All booking Inngest functions — register in src/app/api/inngest/route.ts */
export const bookingFunctions = [
  releaseExpiredReservation,
  sendBookingConfirmationEmail,
  pushBookingToCalendar,
];
