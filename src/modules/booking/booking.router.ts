import { router, tenantProcedure, publicProcedure, permissionProcedure } from "@/shared/trpc";
import { bookingService } from "./booking.service";
import {
  listBookingsSchema,
  createBookingSchema,
  updateBookingSchema,
  cancelBookingSchema,
  calendarBookingsSchema,
  confirmReservationSchema,
} from "./booking.schemas";
import { z } from "zod";

/**
 * Main booking router.
 * Thin layer: validate → call service → return result.
 * No business logic here.
 *
 * NOTE: In Phase 0, tenantProcedure/protectedProcedure throw UNAUTHORIZED because
 * the WorkOS session is null. These procedures become functional in Phase 3.
 */
export const bookingRouter = router({
  list: permissionProcedure("bookings:read")
    .input(listBookingsSchema)
    .query(({ ctx, input }) =>
      bookingService.list(ctx.tenantId, input)
    ),

  getById: tenantProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(({ ctx, input }) => bookingService.getById(ctx.tenantId, input.id)),

  getPublicById: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(({ input }) => bookingService.getByIdPublic(input.id)),

  create: tenantProcedure
    .input(createBookingSchema)
    .mutation(async ({ ctx, input }) => {
      const { booking } = await bookingService.createBooking(ctx.tenantId, input);
      return booking;
    }),

  update: tenantProcedure
    .input(updateBookingSchema)
    .mutation(({ ctx, input }) =>
      bookingService.updateBooking(ctx.tenantId, input.id, input)
    ),

  cancel: tenantProcedure
    .input(cancelBookingSchema)
    .mutation(({ ctx, input }) =>
      bookingService.cancelBooking(ctx.tenantId, input.id, input.reason)
    ),

  confirmReservation: publicProcedure
    .input(confirmReservationSchema)
    .mutation(({ input }) => bookingService.confirmReservation(input.bookingId, input.customerEmail, input.token)),

  getStats: tenantProcedure.query(({ ctx }) => bookingService.getStats(ctx.tenantId)),

  listForCalendar: tenantProcedure
    .input(calendarBookingsSchema)
    .query(({ ctx, input }) =>
      bookingService.listForCalendar(ctx.tenantId, input.startDate, input.endDate, input.staffId)
    ),
});
