import { router, tenantProcedure, permissionProcedure } from "@/shared/trpc";
import { jobService } from "../jobs.service";
import { approveBookingSchema, rejectBookingSchema, bulkApproveSchema } from "../jobs.schemas";
import { z } from "zod";

export const approvalRouter = router({
  getPendingBookings: tenantProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(50),
        cursor: z.string().uuid().optional(),
        viewMode: z.enum(["pending", "historical"]).default("pending"),
      })
    )
    .query(({ ctx, input }) =>
      jobService.list(ctx.tenantId, {
        status: input.viewMode === "pending" ? "PENDING" : undefined,
        limit: input.limit,
        cursor: input.cursor,
      })
    ),

  approveBooking: permissionProcedure("bookings:approve")
    .input(approveBookingSchema)
    .mutation(({ ctx, input }) =>
      jobService.approveBooking(ctx.tenantId, input.bookingId, "system", input.notes)
    ),

  rejectBooking: permissionProcedure("bookings:approve")
    .input(rejectBookingSchema)
    .mutation(({ ctx, input }) =>
      jobService.rejectBooking(ctx.tenantId, input.bookingId, "system", input.reason)
    ),

  bulkApprove: tenantProcedure
    .input(bulkApproveSchema)
    .mutation(async ({ ctx, input }) => {
      const results = await Promise.allSettled(
        input.bookingIds.map((id) =>
          jobService.approveBooking(ctx.tenantId, id, "system", input.notes)
        )
      );
      const approved = results.filter((r) => r.status === "fulfilled").length;
      return { total: input.bookingIds.length, approved, failed: input.bookingIds.length - approved };
    }),

  bulkReject: tenantProcedure
    .input(z.object({ bookingIds: z.array(z.string().uuid()).min(1), reason: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const results = await Promise.allSettled(
        input.bookingIds.map((id) =>
          jobService.rejectBooking(ctx.tenantId, id, "system", input.reason)
        )
      );
      const rejected = results.filter((r) => r.status === "fulfilled").length;
      return { total: input.bookingIds.length, rejected, failed: input.bookingIds.length - rejected };
    }),

  updateSlotApprovalSettings: tenantProcedure
    .input(z.object({ slotIds: z.array(z.string().uuid()).min(1), requiresApproval: z.boolean() }))
    .mutation(() => {
      return { count: 0, requiresApproval: false };
    }),
});
