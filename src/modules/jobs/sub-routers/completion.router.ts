import { router, tenantProcedure } from "@/shared/trpc";
import { jobService } from "../jobs.service";
import { createCompletionSchema } from "../jobs.schemas";
import { z } from "zod";

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
      jobService.list(ctx.tenantId, { customerId: input.customerId, startDate: input.startDate, endDate: input.endDate, limit: input.limit, cursor: input.cursor, status: "COMPLETED" })
    ),

  getByBookingId: tenantProcedure
    .input(z.object({ bookingId: z.string().uuid() }))
    .query(({ ctx, input }) => jobService.getById(ctx.tenantId, input.bookingId)),

  create: tenantProcedure
    .input(createCompletionSchema)
    .mutation(({ ctx, input }) =>
      jobService.createCompletion(ctx.tenantId, {
        bookingId: input.bookingId,
        customerId: "",
        notes: input.notes,
        completedAt: input.completedAt,
        durationMinutes: undefined,
        followUpRequired: input.followUpRequired,
      })
    ),

  getStats: tenantProcedure.query(({ ctx }) => jobService.getStats(ctx.tenantId)),
});
