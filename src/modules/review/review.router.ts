import { z } from "zod";
import { router, publicProcedure, tenantProcedure, permissionProcedure, createModuleMiddleware } from "@/shared/trpc";

const moduleGate = createModuleMiddleware('review');
const moduleProcedure = tenantProcedure.use(moduleGate);
const modulePermission = (perm: string) => permissionProcedure(perm).use(moduleGate);
import { reviewService } from "./review.service";
import {
  submitReviewSchema,
  createReviewRequestSchema,
  updateAutomationSchema,
  resolveIssueSchema,
  listReviewsSchema,
} from "./review.schemas";

export const reviewRouter = router({
  // Admin — read
  list: moduleProcedure
    .input(listReviewsSchema)
    .query(({ ctx, input }) => reviewService.listReviews(ctx, input)),

  getById: moduleProcedure
    .input(z.object({ id: z.string() }))
    .query(({ ctx, input }) => reviewService.getReview(ctx, input.id)),

  // Admin — request management
  requestReview: modulePermission("reviews:write")
    .input(createReviewRequestSchema)
    .mutation(({ ctx, input }) => reviewService.requestReview(ctx, input)),

  resolveIssue: modulePermission("reviews:write")
    .input(resolveIssueSchema)
    .mutation(({ ctx, input }) => reviewService.resolveIssue(ctx, input)),

  // Automation settings
  getAutomation: moduleProcedure
    .query(({ ctx }) => reviewService.getAutomationSettings(ctx)),

  updateAutomation: modulePermission("reviews:write")
    .input(updateAutomationSchema)
    .mutation(({ ctx, input }) => reviewService.updateAutomationSettings(ctx, input)),

  // Public (token-based — no auth)
  submitReview: publicProcedure
    .input(submitReviewSchema)
    .mutation(({ input }) => reviewService.submitReview(input.token, input)),
});

export type ReviewRouter = typeof reviewRouter;
