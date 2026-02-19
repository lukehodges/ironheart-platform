import { router, tenantProcedure } from "@/shared/trpc";
import { bookingService } from "../booking.service";
import { createCompletionSchema } from "../booking.schemas";
import { z } from "zod";

/**
 * Completion sub-router — handles appointment completion workflow.
 *
 * NOTE Phase 0: All procedures throw UNAUTHORIZED until Phase 3.
 */
export const completionRouter = router({
  list: tenantProcedure
    .input(
      z.object({
        customerId: z.string().uuid().optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        limit: z.number().min(1).max(100).default(50),
        cursor: z.string().uuid().optional(),
      })
    )
    .query(({ ctx, input }) =>
      bookingService.list(ctx.tenantId, { customerId: input.customerId, startDate: input.startDate, endDate: input.endDate, limit: input.limit, cursor: input.cursor, status: "COMPLETED" })
    ),

  getByBookingId: tenantProcedure
    .input(z.object({ bookingId: z.string().uuid() }))
    .query(({ ctx, input }) => bookingService.getById(ctx.tenantId, input.bookingId)),

  create: tenantProcedure
    .input(createCompletionSchema)
    .mutation(({ ctx, input }) =>
      bookingService.createCompletion(ctx.tenantId, {
        bookingId: input.bookingId,
        customerId: "",  // Phase 3: ctx.user.id or fetched from booking
        notes: input.notes,
        completedAt: input.completedAt,
        durationMinutes: undefined,
        followUpRequired: input.followUpRequired,
      })
    ),

  getStats: tenantProcedure.query(({ ctx }) => bookingService.getStats(ctx.tenantId)),
});
