import { z } from "zod";
import { router, tenantProcedure, permissionProcedure } from "@/shared/trpc";
import { resourceService } from "./resources.service";
import {
  createResourceSchema,
  updateResourceSchema,
  listResourcesSchema,
  listAvailableSchema,
} from "./resources.schemas";

export const resourcesRouter = router({
  create: permissionProcedure("resources:create")
    .input(createResourceSchema)
    .mutation(({ ctx, input }) => resourceService.create(ctx.tenantId, input)),

  update: permissionProcedure("resources:update")
    .input(z.object({ id: z.string().uuid(), data: updateResourceSchema }))
    .mutation(({ ctx, input }) => resourceService.update(ctx.tenantId, input.id, input.data)),

  getById: tenantProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(({ ctx, input }) => resourceService.getById(ctx.tenantId, input.id)),

  list: tenantProcedure
    .input(listResourcesSchema)
    .query(({ ctx, input }) => resourceService.list(ctx.tenantId, input)),

  delete: permissionProcedure("resources:delete")
    .input(z.object({ id: z.string().uuid() }))
    .mutation(({ ctx, input }) => resourceService.delete(ctx.tenantId, input.id)),

  listAvailable: tenantProcedure
    .input(listAvailableSchema)
    .query(({ ctx, input }) =>
      resourceService.listAvailable(ctx.tenantId, {
        date: new Date(input.date),
        startTime: input.startTime,
        endTime: input.endTime,
        skillTags: input.skillTags,
        type: input.type,
      })
    ),
});
