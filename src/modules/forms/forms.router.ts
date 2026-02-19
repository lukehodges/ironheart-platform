import { z } from "zod";
import { router, publicProcedure, tenantProcedure, permissionProcedure } from "@/shared/trpc";
import { formsService } from "./forms.service";
import {
  listTemplatesSchema,
  createTemplateSchema,
  updateTemplateSchema,
  sendFormSchema,
  submitFormSchema,
  listResponsesSchema,
} from "./forms.schemas";

/**
 * Forms router.
 * Thin layer: validate → call service → return result.
 * No business logic here.
 *
 * Public procedures (getFormByToken, submitForm) use token-based auth —
 * no user session required.
 */
export const formsRouter = router({
  // Admin — template management
  listTemplates: tenantProcedure
    .input(listTemplatesSchema)
    .query(async ({ ctx, input }) => formsService.listTemplates(ctx, input)),

  getTemplate: tenantProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => formsService.getTemplate(ctx, input.id)),

  createTemplate: permissionProcedure("forms:write")
    .input(createTemplateSchema)
    .mutation(async ({ ctx, input }) => formsService.createTemplate(ctx, input)),

  updateTemplate: permissionProcedure("forms:write")
    .input(updateTemplateSchema)
    .mutation(async ({ ctx, input }) => formsService.updateTemplate(ctx, input.id, input)),

  deleteTemplate: permissionProcedure("forms:write")
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => formsService.deleteTemplate(ctx, input.id)),

  sendForm: permissionProcedure("forms:write")
    .input(sendFormSchema)
    .mutation(async ({ ctx, input }) => formsService.sendForm(ctx, input)),

  // Admin — responses
  listResponses: tenantProcedure
    .input(listResponsesSchema)
    .query(async ({ ctx, input }) => formsService.listResponses(ctx, input)),

  getResponse: tenantProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => formsService.getResponse(ctx, input.id)),

  // Public (token-based, no auth required)
  getFormByToken: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => formsService.getFormByToken(input.token)),

  submitForm: publicProcedure
    .input(submitFormSchema)
    .mutation(async ({ input }) => formsService.submitFormResponse(input.token, input.responses)),
});

export type FormsRouter = typeof formsRouter;
