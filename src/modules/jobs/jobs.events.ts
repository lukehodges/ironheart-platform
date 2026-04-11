import { z } from "zod";
import { inngest } from "@/shared/inngest";
import { jobService } from "./jobs.service";
import { logger } from "@/shared/logger";

const log = logger.child({ module: "jobs.events" });

// ---------------------------------------------------------------------------
// Validation schemas for Inngest event payloads
// ---------------------------------------------------------------------------

const slotReservedSchema = z.object({
  slotId: z.string(),
  jobId: z.string(),
  tenantId: z.string(),
  expiresAt: z.string().datetime(),
});

/**
 * Release expired reservation.
 * Fires at exact expiry time (delayed Inngest event via slot/reserved).
 * Cancelled automatically when job/confirmed or job/cancelled fires.
 */
export const releaseExpiredReservation = inngest.createFunction(
  {
    id: "release-expired-reservation",
    cancelOn: [
      { event: "job/confirmed", match: "data.jobId" },
      { event: "job/cancelled", match: "data.jobId" },
    ],
  },
  { event: "slot/reserved" },
  async ({ event, step }) => {
    const payload = slotReservedSchema.parse(event.data);
    const { jobId, tenantId, expiresAt } = payload;
    const bookingId = jobId;

    await step.sleepUntil("wait-for-expiry", new Date(expiresAt));

    await step.run("release-reservation", async () => {
      await jobService.releaseExpiredReservation(bookingId, tenantId);
    });

    log.info({ bookingId, tenantId }, "Reservation released via Inngest");
  }
);

/** All jobs Inngest functions - register in src/app/api/inngest/route.ts */
export const jobsFunctions = [
  releaseExpiredReservation,
];

// Backward-compat alias
export const bookingFunctions = jobsFunctions;
