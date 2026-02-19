import { router } from "@/shared/trpc";
import { bookingRouter } from "@/modules/booking/booking.router";
import { approvalRouter } from "@/modules/booking/sub-routers/approval.router";
import { completionRouter } from "@/modules/booking/sub-routers/completion.router";
import { portalRouter } from "@/modules/booking/sub-routers/portal.router";
import { slotAvailabilityRouter } from "@/modules/booking/sub-routers/slot.router";
import { schedulingRouter } from "@/modules/scheduling";
import { authRouter } from "@/modules/auth";
import { notificationRouter } from "@/modules/notification";
import { calendarSyncRouter } from "@/modules/calendar-sync";

/**
 * Root tRPC router.
 *
 * Modules merge their routers here as phases are completed:
 *   Phase 1: booking, approval, completion, portal, slotAvailability ✓
 *   Phase 2: scheduling
 *   Phase 3: auth
 *   Phase 4: notification, calendarSync
 *   Phase 5: remaining module routers
 */
export const appRouter = router({
  auth: authRouter,
  booking: bookingRouter,
  approval: approvalRouter,
  completion: completionRouter,
  portal: portalRouter,
  slotAvailability: slotAvailabilityRouter,
  scheduling: schedulingRouter,
  notification: notificationRouter,
  calendarSync: calendarSyncRouter,
});

export type AppRouter = typeof appRouter;
