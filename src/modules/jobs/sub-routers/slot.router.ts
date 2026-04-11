import { router, publicProcedure } from "@/shared/trpc";
import {
  getSlotsForDateSchema,
  getSlotsForDateRangeSchema,
  createPortalBookingSchema,
} from "../jobs.schemas";
import { z } from "zod";

export const slotAvailabilityRouter = router({
  getSlotsForDate: publicProcedure
    .input(getSlotsForDateSchema)
    .query(() => []),

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
      return null;
    }),
});
