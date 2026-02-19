import { z } from "zod";
import { router, publicProcedure, tenantProcedure, permissionProcedure } from "@/shared/trpc";
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
  list: tenantProcedure
    .input(listReviewsSchema)
    .query(({ ctx, input }) => reviewService.listReviews(ctx, input)),

  getById: tenantProcedure
    .input(z.object({ id: z.string() }))
    .query(({ ctx, input }) => reviewService.getReview(ctx, input.id)),

  // Admin — request management
  requestReview: permissionProcedure("reviews:write")
    .input(createReviewRequestSchema)
    .mutation(({ ctx, input }) => reviewService.requestReview(ctx, input)),

  resolveIssue: permissionProcedure("reviews:write")
    .input(resolveIssueSchema)
    .mutation(({ ctx, input }) => reviewService.resolveIssue(ctx, input)),

  // Automation settings
  getAutomation: tenantProcedure
    .query(({ ctx }) => reviewService.getAutomationSettings(ctx)),

  updateAutomation: permissionProcedure("reviews:write")
    .input(updateAutomationSchema)
    .mutation(({ ctx, input }) => reviewService.updateAutomationSettings(ctx, input)),

  // Public (token-based — no auth)
  submitReview: publicProcedure
    .input(submitReviewSchema)
    .mutation(({ input }) => reviewService.submitReview(input.token, input)),
});

export type ReviewRouter = typeof reviewRouter;
