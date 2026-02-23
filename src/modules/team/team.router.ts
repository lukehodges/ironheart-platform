import { z } from "zod";
import { router, tenantProcedure, permissionProcedure, createModuleMiddleware } from "@/shared/trpc";

const moduleGate = createModuleMiddleware('team');
const moduleProcedure = tenantProcedure.use(moduleGate);
const modulePermission = (perm: string) => permissionProcedure(perm).use(moduleGate);
import { teamService } from "./team.service";
import { resourcePoolService } from "@/shared/resource-pool";
import {
  listStaffSchema,
  createStaffSchema,
  updateStaffSchema,
  setAvailabilitySchema,
  blockDatesSchema,
  getAvailabilitySchema,
  getScheduleSchema,
} from "./team.schemas";
import {
  addSkillSchema,
  removeSkillSchema,
  listSkillsSchema,
  setCapacitySchema as rpSetCapacitySchema,
  getCapacitySchema as rpGetCapacitySchema,
  getWorkloadSchema,
  listAssignmentsSchema,
} from "@/shared/resource-pool/resource-pool.schemas";

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

  // Skills (resource pool)
  listSkills: moduleProcedure
    .input(listSkillsSchema)
    .query(({ ctx, input }) => resourcePoolService.listSkills(ctx.tenantId, input.userId, input.skillType)),

  addSkill: modulePermission("staff:write")
    .input(addSkillSchema)
    .mutation(({ ctx, input }) => resourcePoolService.addSkill(ctx.tenantId, input.userId, {
      skillType: input.skillType,
      skillId: input.skillId,
      skillName: input.skillName,
      proficiency: input.proficiency,
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : undefined,
      metadata: input.metadata,
    })),

  removeSkill: modulePermission("staff:write")
    .input(removeSkillSchema)
    .mutation(({ ctx, input }) => resourcePoolService.removeSkill(ctx.tenantId, input.userId, input.skillType, input.skillId)),

  // Capacity (resource pool)
  getCapacity: moduleProcedure
    .input(rpGetCapacitySchema)
    .query(({ ctx, input }) => resourcePoolService.getCapacity(ctx.tenantId, input.userId, input.capacityType, input.date)),

  setCapacity: modulePermission("staff:write")
    .input(rpSetCapacitySchema)
    .mutation(({ ctx, input }) => resourcePoolService.setCapacity(ctx.tenantId, input.userId, {
      capacityType: input.capacityType,
      maxConcurrent: input.maxConcurrent,
      maxDaily: input.maxDaily,
      maxWeekly: input.maxWeekly,
      unit: input.unit,
      effectiveFrom: input.effectiveFrom,
      effectiveUntil: input.effectiveUntil,
    })),

  // Workload (resource pool)
  getWorkload: moduleProcedure
    .input(getWorkloadSchema)
    .query(({ ctx, input }) => resourcePoolService.getStaffWorkload(ctx.tenantId, input.userId, input.date)),

  // Assignments (resource pool)
  listAssignments: moduleProcedure
    .input(listAssignmentsSchema)
    .query(({ ctx, input }) => resourcePoolService.listAssignments(ctx.tenantId, input.userId, {
      moduleSlug: input.moduleSlug,
      status: input.status,
      startDate: input.startDate,
      endDate: input.endDate,
      limit: input.limit,
    })),

  // Schedule
  getSchedule: moduleProcedure
    .input(getScheduleSchema)
    .query(({ ctx, input }) => teamService.getSchedule(ctx, input)),
});

export type TeamRouter = typeof teamRouter;
