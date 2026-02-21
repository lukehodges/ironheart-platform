import { router, tenantProcedure, publicProcedure, permissionProcedure, createModuleMiddleware } from "@/shared/trpc";

const moduleGate = createModuleMiddleware('booking');
const moduleProcedure = tenantProcedure.use(moduleGate);
const modulePermission = (perm: string) => permissionProcedure(perm).use(moduleGate);
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
  list: modulePermission("bookings:read")
    .input(listBookingsSchema)
    .query(({ ctx, input }) =>
      bookingService.list(ctx.tenantId, input)
    ),

  getById: moduleProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(({ ctx, input }) => bookingService.getById(ctx.tenantId, input.id)),

  getPublicById: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(({ input }) => bookingService.getByIdPublic(input.id)),

  create: moduleProcedure
    .input(createBookingSchema)
    .mutation(async ({ ctx, input }) => {
      const { booking } = await bookingService.createBooking(ctx.tenantId, input);
      return booking;
    }),

  update: moduleProcedure
    .input(updateBookingSchema)
    .mutation(({ ctx, input }) =>
      bookingService.updateBooking(ctx.tenantId, input.id, input)
    ),

  cancel: moduleProcedure
    .input(cancelBookingSchema)
    .mutation(({ ctx, input }) =>
      bookingService.cancelBooking(ctx.tenantId, input.id, input.reason)
    ),

  confirmReservation: publicProcedure
    .input(confirmReservationSchema)
    .mutation(({ input }) => bookingService.confirmReservation(input.bookingId, input.customerEmail, input.token)),

  getStats: moduleProcedure.query(({ ctx }) => bookingService.getStats(ctx.tenantId)),

  listForCalendar: moduleProcedure
    .input(calendarBookingsSchema)
    .query(({ ctx, input }) =>
      bookingService.listForCalendar(ctx.tenantId, input.startDate, input.endDate, input.staffId)
    ),
});
