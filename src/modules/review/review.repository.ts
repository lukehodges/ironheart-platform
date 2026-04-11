import { db } from "@/shared/db";
import { logger } from "@/shared/logger";
import { NotFoundError } from "@/shared/errors";
import {
  reviews,
  reviewRequests,
  reviewAutomationSettings,
} from "@/shared/db/schema";
import { eq, and, lte, gte, isNull, sql, desc } from "drizzle-orm";
import type {
  ReviewRecord,
  ReviewRequestRecord,
  ReviewAutomationSettings,
  ReviewRequestStatus,
  ReviewResolutionStatus,
} from "./review.types";

const log = logger.child({ module: "review.repository" });

// ---------------------------------------------------------------------------
// Mappers - bridge schema shape to domain types
// ---------------------------------------------------------------------------

function mapReview(row: typeof reviews.$inferSelect): ReviewRecord {
  return {
    id: row.id,
    tenantId: row.tenantId,
    bookingId: row.jobId ?? "",
    customerId: row.customerId ?? null,
    staffId: row.staffId ?? null,
    rating: row.rating ?? null,
    comment: row.text ?? null,
    isPublic: row.isPublic,
    platform: row.source ?? null,
    issueCategory: (row.issueCategory as ReviewRecord["issueCategory"]) ?? null,
    resolutionStatus:
      (row.resolutionStatus as ReviewResolutionStatus) ?? null,
    resolutionNotes: row.resolutionNotes ?? null,
    resolvedBy: row.resolvedBy ?? null,
    resolvedAt: row.resolvedAt ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapReviewRequest(
  row: typeof reviewRequests.$inferSelect
): ReviewRequestRecord {
  return {
    id: row.id,
    tenantId: row.tenantId,
    bookingId: row.jobId,
    customerId: row.customerId ?? null,
    status: row.status as ReviewRequestStatus,
    channel: null,
    sentAt: row.sentAt ?? null,
    completedAt: row.respondedAt ?? null,
    createdAt: row.createdAt,
    updatedAt: row.createdAt, // schema has no updatedAt on reviewRequests
  };
}

function mapAutomationSettings(
  row: typeof reviewAutomationSettings.$inferSelect
): ReviewAutomationSettings {
  return {
    id: row.id,
    tenantId: row.tenantId,
    enabled: row.enabled,
    preScreenEnabled: row.preScreenEnabled,
    autoPublicMinRating: row.autoPublicMinRating ?? null,
    delay: null,
    googleEnabled: row.googleEnabled,
    googleUrl: null,
    privateEnabled: row.privateEnabled,
    facebookEnabled: row.facebookEnabled,
    facebookUrl: null,
    channels: [],
    messageTemplate: row.messageTemplate ?? null,
    smsTemplate: null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

// ===============================================================
// REVIEW REPOSITORY
// ===============================================================

export const reviewRepository = {

  // ---- Review Requests ----

  async createRequest(input: {
    tenantId: string;
    bookingId: string;
    customerId: string;
    customerName?: string;
    customerEmail?: string;
    status: "PENDING";
  }): Promise<ReviewRequestRecord> {
    log.info(
      { tenantId: input.tenantId, bookingId: input.bookingId },
      "createRequest"
    );

    // Need customer name/email - use placeholder values since they're required by schema
    // In practice the service layer should look these up before calling
    const [row] = await db
      .insert(reviewRequests)
      .values({
        id: crypto.randomUUID(),
        tenantId: input.tenantId,
        jobId: input.bookingId,
        customerId: input.customerId,
        customerName: input.customerName ?? "",
        customerEmail: input.customerEmail ?? "",
        status: input.status,
        sentAt: new Date(),
        createdAt: new Date(),
      })
      .returning();

    return mapReviewRequest(row!);
  },

  async updateRequestStatus(
    requestId: string,
    status: ReviewRequestStatus,
    extras?: { sentAt?: Date; completedAt?: Date }
  ): Promise<void> {
    log.info({ requestId, status }, "updateRequestStatus");

    const updateData: Record<string, unknown> = { status };
    if (extras?.sentAt) updateData.sentAt = extras.sentAt;
    if (extras?.completedAt) updateData.respondedAt = extras.completedAt;

    await db
      .update(reviewRequests)
      .set(updateData as Parameters<typeof db.update>[0] extends infer T
        ? Record<string, unknown>
        : never)
      .where(eq(reviewRequests.id, requestId));
  },

  async findRequestByToken(token: string): Promise<ReviewRequestRecord | null> {
    log.info({ token }, "findRequestByToken");

    const result = await db
      .select()
      .from(reviewRequests)
      .where(eq(reviewRequests.id, token))
      .limit(1);

    return result[0] ? mapReviewRequest(result[0]) : null;
  },

  async listRequests(
    tenantId: string,
    opts: {
      bookingId?: string;
      status?: ReviewRequestStatus;
      limit: number;
      cursor?: string;
    }
  ): Promise<{ rows: ReviewRequestRecord[]; hasMore: boolean }> {
    log.info({ tenantId, opts }, "listRequests");

    const conditions = [eq(reviewRequests.tenantId, tenantId)];
    if (opts.bookingId) conditions.push(eq(reviewRequests.jobId, opts.bookingId));
    if (opts.status) conditions.push(eq(reviewRequests.status, opts.status));
    if (opts.cursor)
      conditions.push(lte(reviewRequests.createdAt, new Date(opts.cursor)));

    const rows = await db
      .select()
      .from(reviewRequests)
      .where(and(...conditions))
      .orderBy(desc(reviewRequests.createdAt))
      .limit(opts.limit + 1);

    const hasMore = rows.length > opts.limit;
    return {
      rows: (hasMore ? rows.slice(0, opts.limit) : rows).map(mapReviewRequest),
      hasMore,
    };
  },

  async markRequestIgnored(tenantId: string, olderThanDays: number): Promise<number> {
    log.info({ tenantId, olderThanDays }, "markRequestIgnored");

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - olderThanDays);

    const result = await db
      .update(reviewRequests)
      .set({ status: "IGNORED" })
      .where(
        and(
          eq(reviewRequests.tenantId, tenantId),
          eq(reviewRequests.status, "SENT"),
          lte(reviewRequests.sentAt, cutoff)
        )
      )
      .returning({ id: reviewRequests.id });

    return result.length;
  },

  // ---- Reviews ----

  async createReview(
    input: Omit<ReviewRecord, "id" | "createdAt" | "updatedAt">
  ): Promise<ReviewRecord> {
    log.info({ tenantId: input.tenantId, bookingId: input.bookingId }, "createReview");

    const now = new Date();
    const [row] = await db
      .insert(reviews)
      .values({
        id: crypto.randomUUID(),
        tenantId: input.tenantId,
        customerId: input.customerId ?? "",
        customerName: "",
        customerEmail: "",
        jobId: input.bookingId || null,
        staffId: input.staffId ?? null,
        rating: input.rating ?? 5,
        text: input.comment ?? null,
        isPublic: input.isPublic,
        source: (input.platform as typeof reviews.$inferInsert["source"]) ?? "PRIVATE",
        issueCategory:
          (input.issueCategory as typeof reviews.$inferInsert["issueCategory"]) ??
          null,
        resolutionStatus:
          (input.resolutionStatus as typeof reviews.$inferInsert["resolutionStatus"]) ??
          null,
        resolutionNotes: input.resolutionNotes ?? null,
        resolvedBy: input.resolvedBy ?? null,
        resolvedAt: input.resolvedAt ?? null,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return mapReview(row!);
  },

  async findReviewById(
    tenantId: string,
    reviewId: string
  ): Promise<ReviewRecord | null> {
    log.info({ tenantId, reviewId }, "findReviewById");

    const result = await db
      .select()
      .from(reviews)
      .where(and(eq(reviews.id, reviewId), eq(reviews.tenantId, tenantId)))
      .limit(1);

    return result[0] ? mapReview(result[0]) : null;
  },

  async findByCustomer(
    tenantId: string,
    customerId: string,
    opts: { limit: number }
  ): Promise<ReviewRecord[]> {
    log.info({ tenantId, customerId }, "findByCustomer");

    const rows = await db
      .select()
      .from(reviews)
      .where(
        and(
          eq(reviews.tenantId, tenantId),
          eq(reviews.customerId, customerId),
          isNull(reviews.deletedAt)
        )
      )
      .orderBy(desc(reviews.createdAt))
      .limit(opts.limit);

    return rows.map(mapReview);
  },

  async listReviews(
    tenantId: string,
    opts: {
      isPublic?: boolean;
      staffId?: string;
      minRating?: number;
      maxRating?: number;
      hasIssue?: boolean;
      limit: number;
      cursor?: string;
    }
  ): Promise<{ rows: ReviewRecord[]; hasMore: boolean }> {
    log.info({ tenantId, opts }, "listReviews");

    const conditions = [
      eq(reviews.tenantId, tenantId),
      isNull(reviews.deletedAt),
    ];

    if (opts.isPublic !== undefined) conditions.push(eq(reviews.isPublic, opts.isPublic));
    if (opts.staffId) conditions.push(eq(reviews.staffId, opts.staffId));
    if (opts.minRating !== undefined) conditions.push(gte(reviews.rating, opts.minRating));
    if (opts.maxRating !== undefined) conditions.push(lte(reviews.rating, opts.maxRating));
    if (opts.hasIssue !== undefined) {
      if (opts.hasIssue) {
        conditions.push(sql`${reviews.issueCategory} IS NOT NULL`);
      } else {
        conditions.push(isNull(reviews.issueCategory));
      }
    }
    if (opts.cursor) conditions.push(lte(reviews.createdAt, new Date(opts.cursor)));

    const rows = await db
      .select()
      .from(reviews)
      .where(and(...conditions))
      .orderBy(desc(reviews.createdAt))
      .limit(opts.limit + 1);

    const hasMore = rows.length > opts.limit;
    return {
      rows: (hasMore ? rows.slice(0, opts.limit) : rows).map(mapReview),
      hasMore,
    };
  },

  async updateResolution(
    tenantId: string,
    reviewId: string,
    updates: {
      resolutionStatus: ReviewResolutionStatus;
      resolutionNotes?: string;
      resolvedBy: string;
      resolvedAt: Date;
    }
  ): Promise<void> {
    log.info({ tenantId, reviewId, updates }, "updateResolution");

    await db
      .update(reviews)
      .set({
        resolutionStatus: updates.resolutionStatus as typeof reviews.$inferInsert["resolutionStatus"],
        resolutionNotes: updates.resolutionNotes ?? null,
        resolvedBy: updates.resolvedBy,
        resolvedAt: updates.resolvedAt,
        updatedAt: new Date(),
      })
      .where(and(eq(reviews.id, reviewId), eq(reviews.tenantId, tenantId)));
  },

  // ---- Automation Settings ----

  async getAutomationSettings(
    tenantId: string
  ): Promise<ReviewAutomationSettings | null> {
    log.info({ tenantId }, "getAutomationSettings");

    const result = await db
      .select()
      .from(reviewAutomationSettings)
      .where(eq(reviewAutomationSettings.tenantId, tenantId))
      .limit(1);

    return result[0] ? mapAutomationSettings(result[0]) : null;
  },

  async upsertAutomationSettings(
    tenantId: string,
    updates: Partial<ReviewAutomationSettings>
  ): Promise<ReviewAutomationSettings> {
    log.info({ tenantId }, "upsertAutomationSettings");

    const now = new Date();

    const existing = await db
      .select()
      .from(reviewAutomationSettings)
      .where(eq(reviewAutomationSettings.tenantId, tenantId))
      .limit(1);

    if (existing[0]) {
      const updateData: Record<string, unknown> = { updatedAt: now };
      if (updates.enabled !== undefined) updateData.enabled = updates.enabled;
      if (updates.preScreenEnabled !== undefined) updateData.preScreenEnabled = updates.preScreenEnabled;
      if (updates.autoPublicMinRating !== undefined) updateData.autoPublicMinRating = updates.autoPublicMinRating;
      if (updates.googleEnabled !== undefined) updateData.googleEnabled = updates.googleEnabled;
      if (updates.privateEnabled !== undefined) updateData.privateEnabled = updates.privateEnabled;
      if (updates.facebookEnabled !== undefined) updateData.facebookEnabled = updates.facebookEnabled;
      if (updates.messageTemplate !== undefined) updateData.messageTemplate = updates.messageTemplate;

      const [row] = await db
        .update(reviewAutomationSettings)
        .set(updateData as Parameters<typeof db.update>[0] extends infer T
          ? Record<string, unknown>
          : never)
        .where(eq(reviewAutomationSettings.tenantId, tenantId))
        .returning();

      return mapAutomationSettings(row!);
    }

    // Insert new row
    const [row] = await db
      .insert(reviewAutomationSettings)
      .values({
        id: crypto.randomUUID(),
        tenantId,
        enabled: updates.enabled ?? true,
        preScreenEnabled: updates.preScreenEnabled ?? true,
        autoPublicMinRating: updates.autoPublicMinRating ?? 4,
        googleEnabled: updates.googleEnabled ?? false,
        privateEnabled: updates.privateEnabled ?? true,
        facebookEnabled: updates.facebookEnabled ?? false,
        messageTemplate: updates.messageTemplate ?? "We'd love to hear your feedback!",
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return mapAutomationSettings(row!);
  },
};
