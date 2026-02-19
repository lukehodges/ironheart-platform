import { z } from "zod";
import { router, tenantProcedure, permissionProcedure } from "@/shared/trpc";
import { teamService } from "./team.service";
import {
  listStaffSchema,
  createStaffSchema,
  updateStaffSchema,
  setAvailabilitySchema,
  blockDatesSchema,
  getAvailabilitySchema,
  getCapacitySchema,
  setCapacitySchema,
  getScheduleSchema,
} from "./team.schemas";

/**
 * Team router.
 * Thin layer: validate → call service → return result.
 * No business logic here.
 */
export const teamRouter = router({
  // Staff management
  list: tenantProcedure
    .input(listStaffSchema)
    .query(({ ctx, input }) => teamService.listStaff(ctx, input)),

  getById: tenantProcedure
    .input(z.object({ userId: z.string() }))
    .query(({ ctx, input }) => teamService.getStaffMember(ctx, input.userId)),

  create: permissionProcedure("staff:write")
    .input(createStaffSchema)
    .mutation(({ ctx, input }) => teamService.createStaff(ctx, input)),

  update: permissionProcedure("staff:write")
    .input(updateStaffSchema)
    .mutation(({ ctx, input }) => teamService.updateStaff(ctx, input.id, input)),

  deactivate: permissionProcedure("staff:write")
    .input(z.object({ userId: z.string() }))
    .mutation(({ ctx, input }) => teamService.deactivateStaff(ctx, input.userId)),

  // Availability
  getAvailability: tenantProcedure
    .input(getAvailabilitySchema)
    .query(({ ctx, input }) => teamService.getAvailability(ctx, input)),

  setAvailability: permissionProcedure("staff:write")
    .input(setAvailabilitySchema)
    .mutation(({ ctx, input }) => teamService.setAvailability(ctx, input)),

  blockDates: permissionProcedure("staff:write")
    .input(blockDatesSchema)
    .mutation(({ ctx, input }) => teamService.blockDates(ctx, input)),

  // Capacity
  getCapacity: tenantProcedure
    .input(getCapacitySchema)
    .query(({ ctx, input }) => teamService.getCapacity(ctx, input)),

  setCapacity: permissionProcedure("staff:write")
    .input(setCapacitySchema)
    .mutation(({ ctx, input }) => teamService.setCapacity(ctx, input)),

  // Schedule
  getSchedule: tenantProcedure
    .input(getScheduleSchema)
    .query(({ ctx, input }) => teamService.getSchedule(ctx, input)),
});

export type TeamRouter = typeof teamRouter;
