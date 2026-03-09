import { z } from "zod";
import { logger } from "@/shared/logger";
import { NotFoundError, ValidationError } from "@/shared/errors";
import { inngest } from "@/shared/inngest";
import type { Context } from "@/shared/trpc";
import { reviewRepository } from "./review.repository";
import { bookingRepository } from "@/modules/booking/booking.repository";
import type {
  ReviewRecord,
  ReviewRequestRecord,
  ReviewAutomationSettings,
} from "./review.types";
import type {
  createReviewRequestSchema,
  listReviewsSchema,
  resolveIssueSchema,
  updateAutomationSchema,
} from "./review.schemas";

const log = logger.child({ module: "review.service" });

export const reviewService = {

  // ---------------------------------------------------------------------------
  // Pre-screening logic
  // ---------------------------------------------------------------------------

  async shouldRequestReview(
    tenantId: string,
    bookingId: string,
    settings: ReviewAutomationSettings
  ): Promise<{ proceed: boolean; reason?: string }> {
    if (!settings.enabled) {
      return { proceed: false, reason: "automation-disabled" };
    }
    if (!settings.preScreenEnabled) {
      return { proceed: true };
    }

    // Load booking to get customerId
    const booking = await bookingRepository.findById(tenantId, bookingId);
    if (!booking?.customerId) {
      // Fail open - cannot determine customer history
      return { proceed: true };
    }

    const recentReviews = await reviewRepository.findByCustomer(
      tenantId,
      booking.customerId,
      { limit: 5 }
    );

    // New customer - always proceed
    if (recentReviews.length === 0) {
      return { proceed: true };
    }

    const avgRating =
      recentReviews.reduce((sum, r) => sum + (r.rating ?? 0), 0) /
      recentReviews.length;
    const threshold = settings.autoPublicMinRating ?? 4;

    if (avgRating < threshold) {
      return {
        proceed: false,
        reason: `pre-screen: avg rating ${avgRating} < threshold ${threshold}`,
      };
    }

    return { proceed: true };
  },

  // ---------------------------------------------------------------------------
  // Request a review
  // ---------------------------------------------------------------------------

  async requestReview(
    ctx: Context,
    input: z.infer<typeof createReviewRequestSchema>
  ): Promise<ReviewRequestRecord> {
    log.info(
      { tenantId: ctx.tenantId, bookingId: input.bookingId },
      "requestReview"
    );

    // Load automation settings
    const settings = await reviewRepository.getAutomationSettings(
      ctx.tenantId
    );

    if (settings) {
      const { proceed, reason } = await reviewService.shouldRequestReview(
        ctx.tenantId,
        input.bookingId,
        settings
      );

      if (!proceed) {
        log.info(
          { tenantId: ctx.tenantId, bookingId: input.bookingId, reason },
          "Review request blocked by pre-screening"
        );
        throw new ValidationError(
          `Review request blocked by pre-screening: ${reason ?? "unknown reason"}`
        );
      }
    }

    const reviewRequest = await reviewRepository.createRequest({
      tenantId: ctx.tenantId,
      bookingId: input.bookingId,
      customerId: input.customerId ?? "",
      status: "PENDING",
    });

    // Emit event with optional delay
    await inngest.send({
      name: "review/request.send",
      data: {
        bookingId: input.bookingId,
        customerId: input.customerId ?? "",
        delay: input.delay,
      },
    });

    log.info(
      { tenantId: ctx.tenantId, requestId: reviewRequest.id },
      "Review request created"
    );
    return reviewRequest;
  },

  // ---------------------------------------------------------------------------
  // Submit a review via token
  // ---------------------------------------------------------------------------

  async submitReview(
    token: string,
    input: { rating: number; isPublic?: boolean; comment?: string }
  ): Promise<ReviewRecord> {
    log.info({ token }, "submitReview");

    const reviewRequest = await reviewRepository.findRequestByToken(token);
    if (!reviewRequest) {
      throw new NotFoundError("ReviewRequest", token);
    }

    if (reviewRequest.status === "COMPLETED") {
      throw new ValidationError("This review request has already been completed");
    }

    // Create the review record
    const review = await reviewRepository.createReview({
      tenantId: reviewRequest.tenantId,
      bookingId: reviewRequest.bookingId,
      customerId: reviewRequest.customerId ?? null,
      staffId: null,
      rating: input.rating,
      comment: input.comment ?? null,
      isPublic: input.isPublic ?? false,
      platform: null,
      issueCategory: null,
      resolutionStatus: null,
      resolutionNotes: null,
      resolvedBy: null,
      resolvedAt: null,
    });

    // Mark request as completed
    await reviewRepository.updateRequestStatus(reviewRequest.id, "COMPLETED", {
      completedAt: new Date(),
    });

    // Emit review/submitted event
    await inngest.send({
      name: "review/submitted",
      data: {
        reviewId: review.id,
        bookingId: reviewRequest.bookingId,
        tenantId: reviewRequest.tenantId,
        customerId: reviewRequest.customerId ?? "",
        rating: input.rating,
      },
    });

    log.info(
      { reviewId: review.id, tenantId: reviewRequest.tenantId, rating: input.rating },
      "Review submitted"
    );
    return review;
  },

  // ---------------------------------------------------------------------------
  // Get a single review
  // ---------------------------------------------------------------------------

  async getReview(ctx: Context, reviewId: string): Promise<ReviewRecord> {
    log.info({ tenantId: ctx.tenantId, reviewId }, "getReview");

    const review = await reviewRepository.findReviewById(
      ctx.tenantId,
      reviewId
    );
    if (!review) {
      throw new NotFoundError("Review", reviewId);
    }
    return review;
  },

  // ---------------------------------------------------------------------------
  // List reviews
  // ---------------------------------------------------------------------------

  async listReviews(
    ctx: Context,
    input: z.infer<typeof listReviewsSchema>
  ): Promise<{ rows: ReviewRecord[]; hasMore: boolean }> {
    log.info({ tenantId: ctx.tenantId }, "listReviews");

    return reviewRepository.listReviews(ctx.tenantId, {
      isPublic: input.isPublic,
      staffId: input.staffId,
      minRating: input.minRating,
      maxRating: input.maxRating,
      hasIssue: input.hasIssue,
      limit: input.limit,
      cursor: input.cursor,
    });
  },

  // ---------------------------------------------------------------------------
  // Resolve an issue
  // ---------------------------------------------------------------------------

  async resolveIssue(
    ctx: Context,
    input: z.infer<typeof resolveIssueSchema>
  ): Promise<void> {
    log.info(
      { tenantId: ctx.tenantId, reviewId: input.reviewId },
      "resolveIssue"
    );

    const review = await reviewRepository.findReviewById(
      ctx.tenantId,
      input.reviewId
    );
    if (!review) {
      throw new NotFoundError("Review", input.reviewId);
    }

    await reviewRepository.updateResolution(ctx.tenantId, input.reviewId, {
      resolutionStatus: input.resolutionStatus,
      resolutionNotes: input.resolutionNotes,
      resolvedBy: ctx.user?.id ?? "system",
      resolvedAt: new Date(),
    });

    log.info(
      {
        tenantId: ctx.tenantId,
        reviewId: input.reviewId,
        resolutionStatus: input.resolutionStatus,
      },
      "Review issue resolved"
    );
  },

  // ---------------------------------------------------------------------------
  // Automation settings
  // ---------------------------------------------------------------------------

  async getAutomationSettings(
    ctx: Context
  ): Promise<ReviewAutomationSettings | null> {
    log.info({ tenantId: ctx.tenantId }, "getAutomationSettings");
    return reviewRepository.getAutomationSettings(ctx.tenantId);
  },

  async updateAutomationSettings(
    ctx: Context,
    input: z.infer<typeof updateAutomationSchema>
  ): Promise<ReviewAutomationSettings> {
    log.info({ tenantId: ctx.tenantId }, "updateAutomationSettings");
    return reviewRepository.upsertAutomationSettings(ctx.tenantId, input);
  },
};
