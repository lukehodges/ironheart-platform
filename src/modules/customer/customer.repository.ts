import { db } from "@/shared/db";
import { logger } from "@/shared/logger";
import { NotFoundError } from "@/shared/errors";
import {
  customers,
  customerNotes,
  bookings,
  reviews,
  reviewRequests,
  invoices,
  payments,
  completedForms,
} from "@/shared/db/schema";
import {
  eq,
  and,
  or,
  ilike,
  isNull,
  isNotNull,
  desc,
  sql,
  count,
  sum,
} from "drizzle-orm";
import type {
  CustomerRecord,
  CustomerNoteRecord,
  CreateCustomerInput,
  UpdateCustomerInput,
  AddNoteInput,
  PipelineStage,
} from "./customer.types";

const log = logger.child({ module: "customer.repository" });

// ---------------------------------------------------------------------------
// Helper: map DB row → CustomerRecord
// The DB stores firstName/lastName separately and uses a status enum,
// while CustomerRecord uses `name` (combined) and `isActive` boolean.
// ---------------------------------------------------------------------------

type CustomerRow = typeof customers.$inferSelect;
type CustomerNoteRow = typeof customerNotes.$inferSelect;

function toCustomerRecord(row: CustomerRow): CustomerRecord {
  return {
    id: row.id,
    tenantId: row.tenantId,
    name: `${row.firstName} ${row.lastName}`.trim(),
    email: row.email ?? null,
    phone: row.phone ?? null,
    dateOfBirth: null,
    gender: null,
    avatarUrl: null,
    address:
      row.addressLine1 || row.city || row.postcode
        ? {
            line1: row.addressLine1 ?? undefined,
            line2: row.addressLine2 ?? undefined,
            city: row.city ?? undefined,
            county: row.county ?? undefined,
            postcode: row.postcode ?? undefined,
            country: row.country ?? undefined,
          }
        : null,
    tags: row.tags ?? [],
    notes: row.notes ?? null,
    referralSource: row.referralSource ?? null,
    isActive: row.status === "ACTIVE",
    anonymisedAt: null,
    mergedIntoId: null,
    deletedAt: row.deletedAt ?? null,
    pipelineStage: row.pipelineStage ?? null,
    pipelineStageChangedAt: row.pipelineStageChangedAt ?? null,
    lostReason: row.lostReason ?? null,
    dealValue: row.dealValue != null ? Number(row.dealValue) : null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toCustomerNoteRecord(row: CustomerNoteRow): CustomerNoteRecord {
  return {
    id: row.id,
    tenantId: "",           // customerNotes table has no tenantId column
    customerId: row.customerId,
    userId: row.createdBy ?? "",
    content: row.content,
    noteType: (row.type as CustomerNoteRecord["noteType"]) ?? "GENERAL",
    isPrivate: false,       // customerNotes table has no isPrivate column
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

// ---------------------------------------------------------------------------
// Drizzle transaction type helper
// ---------------------------------------------------------------------------
type DrizzleTx = Parameters<Parameters<typeof db.transaction>[0]>[0];

// ===============================================================
// CUSTOMER REPOSITORY
// ===============================================================

export const customerRepository = {

  // ---- READ ----

  async findById(tenantId: string, customerId: string): Promise<CustomerRecord | null> {
    const result = await db
      .select()
      .from(customers)
      .where(
        and(
          eq(customers.id, customerId),
          eq(customers.tenantId, tenantId),
          isNull(customers.deletedAt),
        ),
      )
      .limit(1);

    return result[0] ? toCustomerRecord(result[0]) : null;
  },

  async list(
    tenantId: string,
    opts: {
      search?: string;
      tags?: string[];
      isActive?: boolean;
      limit: number;
      cursor?: string;
    },
  ): Promise<{ rows: CustomerRecord[]; hasMore: boolean }> {
    const conditions = [
      eq(customers.tenantId, tenantId),
      isNull(customers.deletedAt),
    ];

    if (opts.search) {
      const searchTerm = `%${opts.search}%`;
      conditions.push(
        or(
          ilike(customers.firstName, searchTerm),
          ilike(customers.lastName, searchTerm),
          ilike(customers.email, searchTerm),
        )!,
      );
    }

    if (opts.isActive !== undefined) {
      conditions.push(
        eq(customers.status, opts.isActive ? "ACTIVE" : "INACTIVE"),
      );
    }

    if (opts.tags && opts.tags.length > 0) {
      // Filter: customer must have ALL specified tags using array overlap / contains
      for (const tag of opts.tags) {
        conditions.push(sql`${tag} = ANY(${customers.tags})`);
      }
    }

    if (opts.cursor) {
      conditions.push(sql`${customers.createdAt} <= ${new Date(opts.cursor)}`);
    }

    const rows = await db
      .select()
      .from(customers)
      .where(and(...conditions))
      .orderBy(desc(customers.createdAt))
      .limit(opts.limit + 1);

    const hasMore = rows.length > opts.limit;
    return {
      rows: (hasMore ? rows.slice(0, opts.limit) : rows).map(toCustomerRecord),
      hasMore,
    };
  },

  // ---- WRITE ----

  async create(
    tenantId: string,
    input: CreateCustomerInput,
  ): Promise<CustomerRecord> {
    // Split `name` into firstName / lastName for the DB schema
    const nameParts = (input.name ?? "").trim().split(/\s+/);
    const firstName = nameParts[0] ?? input.name ?? "";
    const lastName = nameParts.slice(1).join(" ") || "";

    const now = new Date();

    const [row] = await db
      .insert(customers)
      .values({
        id: crypto.randomUUID(),
        tenantId,
        firstName,
        lastName,
        email: input.email ?? null,
        phone: input.phone ?? null,
        addressLine1: input.address?.line1 ?? null,
        addressLine2: input.address?.line2 ?? null,
        city: input.address?.city ?? null,
        county: input.address?.county ?? null,
        postcode: input.address?.postcode ?? null,
        country: input.address?.country ?? "GB",
        tags: input.tags ?? [],
        notes: input.notes ?? null,
        referralSource: input.referralSource ?? null,
        status: "ACTIVE",
        marketingOptIn: false,
        pipelineStage: input.pipelineStage as typeof customers.$inferInsert["pipelineStage"] ?? undefined,
        pipelineStageChangedAt: input.pipelineStage ? now : undefined,
        dealValue: input.dealValue != null ? String(input.dealValue) : undefined,
        lostReason: input.lostReason ?? undefined,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    log.info({ tenantId, customerId: row!.id }, "Customer created");
    return toCustomerRecord(row!);
  },

  async update(
    tenantId: string,
    customerId: string,
    input: Partial<UpdateCustomerInput>,
  ): Promise<CustomerRecord> {
    const updateData: Record<string, unknown> = { updatedAt: new Date() };

    if (input.name !== undefined) {
      const nameParts = (input.name ?? "").trim().split(/\s+/);
      updateData.firstName = nameParts[0] ?? "";
      updateData.lastName = nameParts.slice(1).join(" ") || "";
    }

    if (input.email !== undefined) updateData.email = input.email;
    if (input.phone !== undefined) updateData.phone = input.phone;
    if (input.tags !== undefined) updateData.tags = input.tags;
    if (input.notes !== undefined) updateData.notes = input.notes;
    if (input.referralSource !== undefined) updateData.referralSource = input.referralSource;

    if (input.address !== undefined) {
      updateData.addressLine1 = input.address?.line1 ?? null;
      updateData.addressLine2 = input.address?.line2 ?? null;
      updateData.city = input.address?.city ?? null;
      updateData.county = input.address?.county ?? null;
      updateData.postcode = input.address?.postcode ?? null;
      updateData.country = input.address?.country ?? "GB";
    }

    if (input.pipelineStage !== undefined) {
      updateData.pipelineStage = input.pipelineStage;
      updateData.pipelineStageChangedAt = new Date();
    }
    if (input.dealValue !== undefined) updateData.dealValue = input.dealValue != null ? String(input.dealValue) : null;
    if (input.lostReason !== undefined) updateData.lostReason = input.lostReason;

    const [updated] = await db
      .update(customers)
      .set(updateData as Partial<typeof customers.$inferInsert>)
      .where(
        and(
          eq(customers.id, customerId),
          eq(customers.tenantId, tenantId),
          isNull(customers.deletedAt),
        ),
      )
      .returning();

    if (!updated) throw new NotFoundError("Customer", customerId);
    log.info({ tenantId, customerId }, "Customer updated");
    return toCustomerRecord(updated);
  },

  async softDelete(tenantId: string, customerId: string): Promise<void> {
    await db
      .update(customers)
      .set({ deletedAt: new Date() })
      .where(
        and(eq(customers.id, customerId), eq(customers.tenantId, tenantId)),
      );
    log.info({ tenantId, customerId }, "Customer soft-deleted");
  },

  // ---- MERGE ----
  // Called inside a db.transaction() from the service layer; accepts tx object.

  async merge(
    tx: DrizzleTx,
    sourceId: string,
    targetId: string,
  ): Promise<void> {
    // Re-parent all related tables
    await tx
      .update(bookings)
      .set({ customerId: targetId })
      .where(eq(bookings.customerId, sourceId));

    await tx
      .update(customerNotes)
      .set({ customerId: targetId })
      .where(eq(customerNotes.customerId, sourceId));

    await tx
      .update(completedForms)
      .set({ customerId: targetId })
      .where(eq(completedForms.customerId, sourceId));

    await tx
      .update(reviews)
      .set({ customerId: targetId })
      .where(eq(reviews.customerId, sourceId));

    await tx
      .update(reviewRequests)
      .set({ customerId: targetId })
      .where(eq(reviewRequests.customerId, sourceId));

    await tx
      .update(invoices)
      .set({ customerId: targetId })
      .where(eq(invoices.customerId, sourceId));

    await tx
      .update(payments)
      .set({ customerId: targetId })
      .where(eq(payments.customerId, sourceId));

    // Soft-delete source customer
    await tx
      .update(customers)
      .set({ deletedAt: new Date() })
      .where(eq(customers.id, sourceId));

    log.info({ sourceId, targetId }, "Customer merge cascade complete");
  },

  // ---- ANONYMISE ----

  async anonymise(
    tenantId: string,
    customerId: string,
    hash: string,
  ): Promise<void> {
    await db
      .update(customers)
      .set({
        firstName: `[Anonymised ${hash}]`,
        lastName: "",
        email: `anonymised-${hash}@deleted.invalid`,
        phone: null,
        notes: null,
        tags: [],
        updatedAt: new Date(),
      })
      .where(
        and(eq(customers.id, customerId), eq(customers.tenantId, tenantId)),
      );

    log.info({ tenantId, customerId, hash }, "Customer anonymised");
  },

  // ---- NOTES ----

  async listNotes(
    tenantId: string,
    customerId: string,
  ): Promise<CustomerNoteRecord[]> {
    // customerNotes table has no tenantId; we validate via customerId + tenant-scoped customer lookup
    const rows = await db
      .select()
      .from(customerNotes)
      .where(eq(customerNotes.customerId, customerId))
      .orderBy(desc(customerNotes.createdAt));

    return rows.map((r) => ({ ...toCustomerNoteRecord(r), tenantId }));
  },

  async addNote(
    tenantId: string,
    input: AddNoteInput & { userId: string },
  ): Promise<CustomerNoteRecord> {
    const now = new Date();

    const [row] = await db
      .insert(customerNotes)
      .values({
        id: crypto.randomUUID(),
        customerId: input.customerId,
        content: input.content,
        type: (input.noteType as typeof customerNotes.$inferInsert["type"]) ?? "GENERAL",
        isPinned: false,
        createdBy: input.userId,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    log.info({ tenantId, noteId: row!.id, customerId: input.customerId }, "Customer note added");
    return { ...toCustomerNoteRecord(row!), tenantId };
  },

  async deleteNote(tenantId: string, noteId: string): Promise<void> {
    await db.delete(customerNotes).where(eq(customerNotes.id, noteId));
    log.info({ tenantId, noteId }, "Customer note deleted");
  },

  // ---- PIPELINE ----

  async updatePipelineStage(
    tenantId: string,
    customerId: string,
    stage: PipelineStage,
    lostReason?: string,
  ): Promise<CustomerRecord> {
    const updateData: Record<string, unknown> = {
      pipelineStage: stage,
      pipelineStageChangedAt: new Date(),
      updatedAt: new Date(),
    };

    if (stage === "LOST" && lostReason) {
      updateData.lostReason = lostReason;
    } else if (stage !== "LOST") {
      updateData.lostReason = null;
    }

    const [updated] = await db
      .update(customers)
      .set(updateData as Partial<typeof customers.$inferInsert>)
      .where(
        and(
          eq(customers.id, customerId),
          eq(customers.tenantId, tenantId),
          isNull(customers.deletedAt),
        ),
      )
      .returning();

    if (!updated) throw new NotFoundError("Customer", customerId);
    log.info({ tenantId, customerId, stage }, "Customer pipeline stage updated");
    return toCustomerRecord(updated);
  },

  async listByPipelineStage(
    tenantId: string,
    stage?: PipelineStage,
  ): Promise<CustomerRecord[]> {
    const conditions = [
      eq(customers.tenantId, tenantId),
      isNull(customers.deletedAt),
    ];

    if (stage) {
      conditions.push(eq(customers.pipelineStage, stage));
    } else {
      conditions.push(isNotNull(customers.pipelineStage));
    }

    const rows = await db
      .select()
      .from(customers)
      .where(and(...conditions))
      .orderBy(desc(customers.pipelineStageChangedAt));

    return rows.map(toCustomerRecord);
  },

  async getPipelineSummary(
    tenantId: string,
  ): Promise<Array<{ stage: string; count: number; totalDealValue: number }>> {
    const rows = await db
      .select({
        stage: customers.pipelineStage,
        count: count(),
        totalDealValue: sum(customers.dealValue),
      })
      .from(customers)
      .where(
        and(
          eq(customers.tenantId, tenantId),
          isNull(customers.deletedAt),
          isNotNull(customers.pipelineStage),
        ),
      )
      .groupBy(customers.pipelineStage);

    return rows.map((r) => ({
      stage: r.stage!,
      count: Number(r.count),
      totalDealValue: r.totalDealValue != null ? Number(r.totalDealValue) : 0,
    }));
  },

  // ---- HISTORY ----

  async getBookingHistory(
    tenantId: string,
    customerId: string,
  ): Promise<
    Array<{
      id: string;
      scheduledDate: Date;
      status: string;
      totalAmount: number | null;
    }>
  > {
    const rows = await db
      .select({
        id: bookings.id,
        scheduledDate: bookings.scheduledDate,
        status: bookings.status,
        totalAmount: bookings.totalAmount,
      })
      .from(bookings)
      .where(
        and(
          eq(bookings.tenantId, tenantId),
          eq(bookings.customerId, customerId),
        ),
      )
      .orderBy(desc(bookings.scheduledDate));

    return rows.map((r) => ({
      id: r.id,
      scheduledDate: r.scheduledDate,
      status: r.status,
      totalAmount: r.totalAmount != null ? Number(r.totalAmount) : null,
    }));
  },
};
