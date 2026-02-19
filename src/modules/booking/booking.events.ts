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

/** All booking Inngest functions — register in src/app/api/inngest/route.ts */
export const bookingFunctions = [
  releaseExpiredReservation,
];
