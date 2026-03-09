import { router, tenantProcedure, permissionProcedure } from "@/shared/trpc";
import { bookingService } from "../booking.service";
import { approveBookingSchema, rejectBookingSchema, bulkApproveSchema } from "../booking.schemas";
import { z } from "zod";

/**
 * Approval sub-router - handles PENDING → APPROVED / REJECTED transitions.
 *
 * NOTE Phase 0: All procedures throw UNAUTHORIZED until Phase 3 wires up WorkOS session.
 */
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
      bookingService.list(ctx.tenantId, {
        status: input.viewMode === "pending" ? "PENDING" : undefined,
        limit: input.limit,
        cursor: input.cursor,
      })
    ),

  approveBooking: permissionProcedure("bookings:approve")
    .input(approveBookingSchema)
    .mutation(({ ctx, input }) =>
      // Phase 3: pass ctx.user.id as approvedById
      bookingService.approveBooking(ctx.tenantId, input.bookingId, "system", input.notes)
    ),

  rejectBooking: permissionProcedure("bookings:approve")
    .input(rejectBookingSchema)
    .mutation(({ ctx, input }) =>
      bookingService.rejectBooking(ctx.tenantId, input.bookingId, "system", input.reason)
    ),

  bulkApprove: tenantProcedure
    .input(bulkApproveSchema)
    .mutation(async ({ ctx, input }) => {
      const results = await Promise.allSettled(
        input.bookingIds.map((id) =>
          bookingService.approveBooking(ctx.tenantId, id, "system", input.notes)
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
          bookingService.rejectBooking(ctx.tenantId, id, "system", input.reason)
        )
      );
      const rejected = results.filter((r) => r.status === "fulfilled").length;
      return { total: input.bookingIds.length, rejected, failed: input.bookingIds.length - rejected };
    }),

  updateSlotApprovalSettings: tenantProcedure
    .input(z.object({ slotIds: z.array(z.string().uuid()).min(1), requiresApproval: z.boolean() }))
    .mutation(() => {
      // Phase 2 will implement slot management
      return { count: 0, requiresApproval: false };
    }),
});
