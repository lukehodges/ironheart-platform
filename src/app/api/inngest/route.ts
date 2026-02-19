import { serve } from "inngest/next";
import { inngest } from "@/shared/inngest";
import { bookingFunctions } from "@/modules/booking/booking.events";
import { schedulingFunctions } from "@/modules/scheduling";
import { notificationFunctions } from "@/modules/notification";
import { calendarSyncFunctions } from "@/modules/calendar-sync";
import { workflowFunctions } from "@/modules/workflow";
import { reviewFunctions } from "@/modules/review";
import { teamFunctions } from "@/modules/team";
import { formsFunctions } from "@/modules/forms";
import { handleStripeWebhook, overdueInvoiceCron } from "@/modules/payment/payment.events";
import { computeMetricSnapshots } from "@/modules/analytics/analytics.events";
import { dispatchWebhooks } from "@/modules/developer/developer.events";

/**
 * Inngest serve endpoint.
 *
 * - GET:  Returns function metadata (used by Inngest dashboard and dev server)
 * - POST: Invokes a specific function (called by Inngest when an event triggers it)
 * - PUT:  Registers/syncs functions with the Inngest platform
 *
 * All three methods are required. Missing any one will break Inngest integration.
 *
 * To add a new Inngest function:
 * 1. Define it in the relevant module's *.events.ts file
 * 2. Export it from bookingFunctions (or the module's equivalent array)
 * 3. Add it to the functions array below
 *
 * In development: Run `npx inngest-cli@latest dev` in a separate terminal.
 * The dev server at http://localhost:8288 shows registered functions and event history.
 */
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    // Phase 1-4 functions
    ...bookingFunctions,
    ...schedulingFunctions,
    ...notificationFunctions,
    ...calendarSyncFunctions,
    // Phase 5 functions
    ...workflowFunctions,
    ...reviewFunctions,
    ...teamFunctions,
    ...formsFunctions,
    // Phase 6 functions
    handleStripeWebhook,
    overdueInvoiceCron,
    computeMetricSnapshots,
    dispatchWebhooks,
  ],
});
