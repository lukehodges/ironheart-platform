// src/shared/resource-pool/resource-pool.router.ts
import { router, tenantProcedure, permissionProcedure } from "@/shared/trpc"
import { resourcePoolService } from "./resource-pool.service"
import {
  listSkillDefinitionsSchema,
  getSkillDefinitionSchema,
  createSkillDefinitionSchema,
  updateSkillDefinitionSchema,
  deleteSkillDefinitionSchema,
  listCapacityTypesSchema,
  getCapacityTypeSchema,
  updateCapacityTypeSchema,
  findAvailableStaffSchema,
  assignSkillSchema,
  unassignSkillSchema,
  listUserSkillsSchema,
} from "./resource-pool.schemas"

const skillDefinitionsRouter = router({
  list: tenantProcedure
    .input(listSkillDefinitionsSchema)
    .query(({ ctx, input }) => resourcePoolService.listSkillDefinitions(ctx.tenantId, input)),

  getById: tenantProcedure
    .input(getSkillDefinitionSchema)
    .query(({ ctx, input }) => resourcePoolService.getSkillDefinitionById(ctx.tenantId, input.id)),

  create: permissionProcedure('resource-pool:manage')
    .input(createSkillDefinitionSchema)
    .mutation(({ ctx, input }) => resourcePoolService.createSkillDefinition(ctx.tenantId, input)),

  update: permissionProcedure('resource-pool:manage')
    .input(updateSkillDefinitionSchema)
    .mutation(({ ctx, input }) => {
      const { id, ...updates } = input
      return resourcePoolService.updateSkillDefinition(ctx.tenantId, id, updates)
    }),

  delete: permissionProcedure('resource-pool:manage')
    .input(deleteSkillDefinitionSchema)
    .mutation(({ ctx, input }) => resourcePoolService.softDeleteSkillDefinition(ctx.tenantId, input.id)),
})

const capacityTypesRouter = router({
  list: tenantProcedure
    .input(listCapacityTypesSchema)
    .query(({ ctx, input }) => resourcePoolService.listCapacityTypeDefinitions(ctx.tenantId, input.isActive)),

  getById: tenantProcedure
    .input(getCapacityTypeSchema)
    .query(({ ctx, input }) => resourcePoolService.getCapacityTypeDefinitionById(ctx.tenantId, input.id)),

  update: permissionProcedure('resource-pool:manage')
    .input(updateCapacityTypeSchema)
    .mutation(({ ctx, input }) => {
      const { id, ...updates } = input
      return resourcePoolService.updateCapacityTypeDefinition(ctx.tenantId, id, updates)
    }),
})

const matchingRouter = router({
  findAvailable: tenantProcedure
    .input(findAvailableStaffSchema)
    .query(({ ctx, input }) => resourcePoolService.findAvailableStaff(ctx.tenantId, input)),
})

const skillsRouter = router({
  assign: permissionProcedure('resource-pool:manage')
    .input(assignSkillSchema)
    .mutation(({ ctx, input }) => resourcePoolService.assignSkillFromCatalog(
      ctx.tenantId, input.userId, input.skillDefinitionId, {
        proficiency: input.proficiency,
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : undefined,
        verifiedBy: input.verifiedBy,
      }
    )),

  unassign: permissionProcedure('resource-pool:manage')
    .input(unassignSkillSchema)
    .mutation(({ ctx, input }) => resourcePoolService.unassignSkillFromCatalog(
      ctx.tenantId, input.userId, input.skillDefinitionId
    )),

  listForUser: tenantProcedure
    .input(listUserSkillsSchema)
    .query(({ ctx, input }) => resourcePoolService.listSkillsForUser(ctx.tenantId, input.userId)),
})

export const resourcePoolRouter = router({
  skillDefinitions: skillDefinitionsRouter,
  capacityTypes: capacityTypesRouter,
  matching: matchingRouter,
  skills: skillsRouter,
})
