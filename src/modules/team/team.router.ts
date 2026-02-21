import { z } from "zod";
import { router, tenantProcedure, permissionProcedure, createModuleMiddleware } from "@/shared/trpc";

const moduleGate = createModuleMiddleware('team');
const moduleProcedure = tenantProcedure.use(moduleGate);
const modulePermission = (perm: string) => permissionProcedure(perm).use(moduleGate);
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
  list: moduleProcedure
    .input(listStaffSchema)
    .query(({ ctx, input }) => teamService.listStaff(ctx, input)),

  getById: moduleProcedure
    .input(z.object({ userId: z.string() }))
    .query(({ ctx, input }) => teamService.getStaffMember(ctx, input.userId)),

  create: modulePermission("staff:write")
    .input(createStaffSchema)
    .mutation(({ ctx, input }) => teamService.createStaff(ctx, input)),

  update: modulePermission("staff:write")
    .input(updateStaffSchema)
    .mutation(({ ctx, input }) => teamService.updateStaff(ctx, input.id, input)),

  deactivate: modulePermission("staff:write")
    .input(z.object({ userId: z.string() }))
    .mutation(({ ctx, input }) => teamService.deactivateStaff(ctx, input.userId)),

  // Availability
  getAvailability: moduleProcedure
    .input(getAvailabilitySchema)
    .query(({ ctx, input }) => teamService.getAvailability(ctx, input)),

  setAvailability: modulePermission("staff:write")
    .input(setAvailabilitySchema)
    .mutation(({ ctx, input }) => teamService.setAvailability(ctx, input)),

  blockDates: modulePermission("staff:write")
    .input(blockDatesSchema)
    .mutation(({ ctx, input }) => teamService.blockDates(ctx, input)),

  // Capacity
  getCapacity: moduleProcedure
    .input(getCapacitySchema)
    .query(({ ctx, input }) => teamService.getCapacity(ctx, input)),

  setCapacity: modulePermission("staff:write")
    .input(setCapacitySchema)
    .mutation(({ ctx, input }) => teamService.setCapacity(ctx, input)),

  // Schedule
  getSchedule: moduleProcedure
    .input(getScheduleSchema)
    .query(({ ctx, input }) => teamService.getSchedule(ctx, input)),
});

export type TeamRouter = typeof teamRouter;
