import { z } from "zod";
import { inngest } from "@/shared/inngest";
import { schedulingRepository } from "./scheduling.repository";
import { logger } from "@/shared/logger";

const log = logger.child({ module: "scheduling.events" });

// ─── 1: Schedule Booking Reminders (event-driven) ────────────────────────────
// Replaces: /api/cron/send-reminders (every 15 min)
// New strategy: fires on booking/confirmed event, uses step.sleepUntil() for exact timing.

const bookingConfirmedSchema = z.object({
  bookingId: z.string(),
  tenantId: z.string(),
});

export const scheduleBookingReminders = inngest.createFunction(
  { id: "schedule-booking-reminders" },
  { event: "booking/confirmed" },
  async ({ event, step }) => {
    const { bookingId, tenantId } = bookingConfirmedSchema.parse(event.data);

    const booking = await step.run("load-booking", async () => {
      // Load from bookings table — use db directly since repository doesn't have a single-booking method
      // Return minimal shape: { scheduledDate, scheduledTime, status, customer: { email, phone } }
      // For now stub as null since calendar details need joins — will be wired in Phase 4
      log.info({ bookingId, tenantId }, "Scheduling reminders for booking");
      return null; // TODO Phase 4: load booking with customer details
    });

    if (!booking) return { skipped: true };

    return { scheduled: true, bookingId };
  }
);

// ─── 2: Safety-net Reminder Cron (every 6 hours) ─────────────────────────────

export const sendRemindersCron = inngest.createFunction(
  { id: "send-reminders-cron", concurrency: { limit: 1 } },
  { cron: "0 */6 * * *" },
  async ({ step }) => {
    const result = await step.run("check-upcoming-reminders", async () => {
      // Find CONFIRMED bookings in the 24h ± 30min window not yet reminded
      const bookings24h = await schedulingRepository.findBookingsNeedingReminders(24, 30);
      const bookings2h = await schedulingRepository.findBookingsNeedingReminders(2, 30);

      log.info(
        { count24h: bookings24h.length, count2h: bookings2h.length },
        "Reminder safety-net cron ran"
      );

      // TODO Phase 4: emit notification/send.email and notification/send.sms events
      return { processed24h: bookings24h.length, processed2h: bookings2h.length };
    });

    return result;
  }
);

// ─── 3: Sync Calendars (every 5 min) ─────────────────────────────────────────
// Replaces: /api/cron/sync-calendars (every 5 min)

export const syncCalendarsCron = inngest.createFunction(
  {
    id: "sync-calendars-cron",
    concurrency: { limit: 3 },
  },
  { cron: "*/5 * * * *" },
  async ({ step }) => {
    const users = await step.run("get-users-with-calendar", async () => {
      return schedulingRepository.findUsersWithActiveCalendarIntegration();
    });

    await step.run("emit-sync-events", async () => {
      // Fan out: one event per user — actual sync handled in Phase 4 calendar-sync module
      for (const user of users) {
        await inngest.send({ name: "calendar/sync.pull", data: { userId: user.id } });
      }
      log.info({ count: users.length }, "Calendar sync events emitted");
    });

    return { emitted: users.length };
  }
);

export const schedulingFunctions = [
  scheduleBookingReminders,
  sendRemindersCron,
  syncCalendarsCron,
];
