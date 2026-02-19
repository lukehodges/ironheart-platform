import { router, publicProcedure } from "@/shared/trpc";
import { bookingService } from "../booking.service";
import {
  getSlotsForDateSchema,
  getSlotsForDateRangeSchema,
  createPortalBookingSchema,
  confirmReservationSchema,
} from "../booking.schemas";
import { z } from "zod";

/**
 * Slot availability sub-router — all public endpoints for the customer portal.
 *
 * createBookingFromSlot: creates a RESERVED booking (portal entry point).
 * getSlotsForDate / getSlotsForDateRange: query available slots.
 */
export const slotAvailabilityRouter = router({
  getSlotsForDate: publicProcedure
    .input(getSlotsForDateSchema)
    .query(({ input }) => {
      // Phase 2: resolve tenantId from slug, query slots
      // Phase 1: stub — returns empty array
      return [];
    }),

  getSlotsForDateRange: publicProcedure
    .input(getSlotsForDateRangeSchema)
    .query(() => []),

  getSlotDetails: publicProcedure
    .input(z.object({ slotId: z.string().uuid() }))
    .query(() => null),

  isSlotAvailable: publicProcedure
    .input(z.object({ slotId: z.string().uuid(), serviceId: z.string().uuid().optional() }))
    .query(() => ({ available: false, reason: "Phase 2 not yet implemented" })),

  getBookingsForSlot: publicProcedure
    .input(z.object({ slotId: z.string().uuid() }))
    .query(() => []),

  createBookingFromSlot: publicProcedure
    .input(createPortalBookingSchema)
    .mutation(() => {
      // Phase 2: resolve tenant from slug, find-or-create customer, call bookingService.createBooking
      return null;
    }),
});
