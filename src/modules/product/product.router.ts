import { router, platformAdminProcedure, publicProcedure } from "@/shared/trpc";
import { productService } from "./product.service";
import {
  createProductSchema, updateProductSchema, createPlanSchema, productSlugSchema,
} from "./product.schemas";
import { z } from "zod";

export const productRouter = router({
  list: platformAdminProcedure.query(() => productService.listProducts()),

  getById: platformAdminProcedure
    .input(z.object({ id: z.uuid() }))
    .query(({ input }) => productService.getProduct(input.id)),

  create: platformAdminProcedure
    .input(createProductSchema)
    .mutation(({ input }) => productService.createProduct(input)),

  update: platformAdminProcedure
    .input(updateProductSchema)
    .mutation(({ input }) => productService.updateProduct(input.id, input)),

  delete: platformAdminProcedure
    .input(z.object({ id: z.uuid() }))
    .mutation(({ input }) => productService.deleteProduct(input.id)),

  createPlan: platformAdminProcedure
    .input(createPlanSchema)
    .mutation(({ input }) => productService.createPlan(input)),

  deletePlan: platformAdminProcedure
    .input(z.object({ id: z.uuid() }))
    .mutation(({ input }) => productService.deletePlan(input.id)),

  getPublished: publicProcedure
    .input(productSlugSchema)
    .query(({ input }) => productService.getPublishedProduct(input.slug)),
});
