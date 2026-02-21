import { z } from "zod";
import { router, tenantProcedure, createModuleMiddleware } from "@/shared/trpc";

const moduleGate = createModuleMiddleware('scheduling');
const moduleProcedure = tenantProcedure.use(moduleGate);
import {
  slotCreateSchema,
  slotUpdateSchema,
  slotBulkCreateSchema,
  recurringSlotSchema,
  slotListSchema,
  availabilityCheckSchema,
  travelTimeSchema,
} from "./scheduling.schemas";
import { schedulingService } from "./scheduling.service";
import { calculateTravelTime } from "./lib/travel-time";

/**
 * Scheduling router.
 * Thin layer: validate → call service → return result.
 * No business logic here.
 *
 * NOTE: In Phase 0/1, tenantProcedure throws UNAUTHORIZED because the WorkOS
 * session is null. These procedures become functional in Phase 3.
 *
 * NOTE: ctx.user is null in Phase 0/1 (loaded in Phase 3 by tenantProcedure).
 * createdById is sourced from ctx.session.user.id, which is narrowed to
 * non-null by protectedProcedure (tenantProcedure extends protectedProcedure).
 */
export const schedulingRouter = router({
  // ---------------------------------------------------------------------------
  // Slot CRUD
  // ---------------------------------------------------------------------------

  createSlot: moduleProcedure
    .input(slotCreateSchema)
    .mutation(({ ctx, input }) =>
      schedulingService.createSlot(ctx.tenantId, input, ctx.session.user.id)
    ),

  bulkCreateSlots: moduleProcedure
    .input(slotBulkCreateSchema)
    .mutation(({ ctx, input }) =>
      schedulingService.bulkCreateSlots(
        ctx.tenantId,
        input.slots,
        ctx.session.user.id
      )
    ),

  generateRecurring: moduleProcedure
    .input(recurringSlotSchema)
    .mutation(({ ctx, input }) =>
      schedulingService.generateRecurringSlots(
        ctx.tenantId,
        input,
        ctx.session.user.id
      )
    ),

  updateSlot: moduleProcedure
    .input(slotUpdateSchema)
    .mutation(({ ctx, input }) =>
      schedulingService.updateSlot(ctx.tenantId, input.id, input)
    ),

  deleteSlot: moduleProcedure
    .input(z.object({ id: z.uuid() }))
    .mutation(({ ctx, input }) =>
      schedulingService.deleteSlot(ctx.tenantId, input.id)
    ),

  listSlots: moduleProcedure
    .input(slotListSchema)
    .query(({ ctx, input }) =>
      schedulingService.listSlots(ctx.tenantId, input)
    ),

  getSlotById: moduleProcedure
    .input(z.object({ id: z.uuid() }))
    .query(({ ctx, input }) =>
      schedulingService.getSlotById(ctx.tenantId, input.id)
    ),

  // ---------------------------------------------------------------------------
  // Availability & recommendations
  // ---------------------------------------------------------------------------

  checkAvailability: moduleProcedure
    .input(availabilityCheckSchema)
    .query(({ ctx, input }) =>
      schedulingService.checkStaffAvailability(
        ctx.tenantId,
        input.userId,
        input.date,
        input.startTime,
        input.durationMinutes
      )
    ),

  getStaffRecommendations: moduleProcedure
    .input(z.object({ bookingId: z.uuid() }))
    .query(({ ctx, input }) =>
      schedulingService.getStaffRecommendations(ctx.tenantId, input.bookingId)
    ),

  getAlerts: moduleProcedure
    .input(z.object({ date: z.date() }))
    .query(({ ctx, input }) =>
      schedulingService.getSchedulingAlerts(ctx.tenantId, input.date)
    ),

  // ---------------------------------------------------------------------------
  // Travel time (for /admin/routes page)
  // ---------------------------------------------------------------------------

  getTravelTime: moduleProcedure
    .input(travelTimeSchema)
    .query(({ input }) =>
      calculateTravelTime(input.fromPostcode, input.toPostcode)
    ),
});
