import { inngest } from "@/shared/inngest";
import { logger } from "@/shared/logger";

const log = logger.child({ module: "forms.events" });

/**
 * Handles the forms/submitted event.
 *
 * 'forms/submitted' fires AFTER completion (not on send).
 * Submission notifications are handled by workflow triggers — this function
 * acts as a logging hook and extension point for future notification logic.
 */
const sendFormLink = inngest.createFunction(
  { id: "forms-send-link", retries: 3 },
  { event: "forms/submitted" },
  async ({ event }) => {
    log.info(
      { formId: event.data.formId, tenantId: event.data.tenantId },
      "Form submitted event received",
    );
  },
);

/** All forms Inngest functions — register in src/app/api/inngest/route.ts */
export const formsFunctions = [sendFormLink];
