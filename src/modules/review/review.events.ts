import { inngest } from "@/shared/inngest";
import { logger } from "@/shared/logger";

const log = logger.child({ module: "review.events" });

/**
 * Inngest function that handles review request sending with optional delay.
 * Handles the 'review/request.send' event - timing/scheduling only.
 * Email dispatch is handled by the notification module.
 */
const scheduleReviewRequest = inngest.createFunction(
  { id: "review-schedule-request", retries: 3 },
  { event: "review/request.send" },
  async ({ event, step }) => {
    const { bookingId, customerId, delay } = event.data;

    if (delay) {
      await step.sleep("wait-for-timing", delay);
    }

    log.info(
      { bookingId, customerId },
      "Review request scheduled - email dispatch via notification module"
    );
  }
);

/** All review Inngest functions - register in src/app/api/inngest/route.ts */
export const reviewFunctions = [scheduleReviewRequest];
