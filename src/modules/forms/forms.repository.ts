import { db } from "@/shared/db";
import { logger } from "@/shared/logger";
import { NotFoundError } from "@/shared/errors";
import { formTemplates, completedForms } from "@/shared/db/schema";
import { eq, and, ilike, desc, sql } from "drizzle-orm";
import type {
  FormTemplateRecord,
  CompletedFormRecord,
  CreateTemplateInput,
  UpdateTemplateInput,
  FormStatus,
} from "./forms.types";

const log = logger.child({ module: "forms.repository" });

// ---------------------------------------------------------------------------
// Helper: map DB row → FormTemplateRecord
// The DB uses `active` (boolean) and `formSendTiming` enum which differs
// from the types interface that uses `isActive` and `FormSendTiming`.
// ---------------------------------------------------------------------------

type FormTemplateRow = typeof formTemplates.$inferSelect;
type CompletedFormRow = typeof completedForms.$inferSelect;

function toFormTemplateRecord(row: FormTemplateRow): FormTemplateRecord {
  return {
    id: row.id,
    tenantId: row.tenantId,
    name: row.name,
    description: row.description ?? null,
    fields: (row.fields as FormTemplateRecord["fields"]) ?? [],
    isActive: row.active,
    attachedServices: row.attachedServices ?? null,
    // Map DB enum values to type enum values (best-effort)
    sendTiming: mapSendTiming(row.sendTiming),
    sendOffsetHours: null,        // not in DB schema
    requiresSignature: false,     // not in DB schema
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: null,              // not in DB schema
  };
}

function mapSendTiming(dbValue: string): FormTemplateRecord["sendTiming"] {
  switch (dbValue) {
    case "ON_BOOKING":
      return "IMMEDIATE";
    case "HOURS_24_BEFORE":
    case "DAYS_1_BEFORE":
      return "BEFORE_APPOINTMENT";
    case "MANUAL":
      return "AFTER_APPOINTMENT";
    default:
      return "IMMEDIATE";
  }
}

function mapFormStatus(dbValue: string): FormStatus {
  switch (dbValue) {
    case "PENDING":
      return "PENDING";
    case "COMPLETED":
      return "COMPLETED";
    case "EXPIRED":
      return "EXPIRED";
    case "CANCELLED":
      return "SENT";  // map CANCELLED → SENT as closest approximation
    default:
      return "PENDING";
  }
}

function toCompletedFormRecord(row: CompletedFormRow): CompletedFormRecord {
  return {
    id: row.id,
    tenantId: row.tenantId,
    templateId: row.templateId,
    bookingId: row.jobId ?? null,
    customerId: row.customerId ?? null,
    sessionKey: row.sessionKey ?? "",
    status: mapFormStatus(row.status),
    responses: (row.responses as Record<string, unknown>) ?? null,
    signature: row.signature ?? null,
    completedAt: row.submittedAt ?? null,
    expiresAt: row.expiresAt ?? null,
    createdAt: row.createdAt,
    updatedAt: row.createdAt,   // completedForms has no updatedAt column; use createdAt
  };
}

// ===============================================================
// FORMS REPOSITORY
// ===============================================================

export const formsRepository = {

  // ---- TEMPLATES ----

  async findTemplateById(
    tenantId: string,
    templateId: string,
  ): Promise<FormTemplateRecord | null> {
    const result = await db
      .select()
      .from(formTemplates)
      .where(
        and(
          eq(formTemplates.id, templateId),
          eq(formTemplates.tenantId, tenantId),
        ),
      )
      .limit(1);

    return result[0] ? toFormTemplateRecord(result[0]) : null;
  },

  async listTemplates(
    tenantId: string,
    opts: {
      search?: string;
      isActive?: boolean;
      limit: number;
      cursor?: string;
    },
  ): Promise<{ rows: FormTemplateRecord[]; hasMore: boolean }> {
    const conditions = [eq(formTemplates.tenantId, tenantId)];

    if (opts.search) {
      conditions.push(ilike(formTemplates.name, `%${opts.search}%`));
    }

    if (opts.isActive !== undefined) {
      conditions.push(eq(formTemplates.active, opts.isActive));
    }

    if (opts.cursor) {
      conditions.push(
        sql`${formTemplates.createdAt} <= ${new Date(opts.cursor)}`,
      );
    }

    const rows = await db
      .select()
      .from(formTemplates)
      .where(and(...conditions))
      .orderBy(desc(formTemplates.createdAt))
      .limit(opts.limit + 1);

    const hasMore = rows.length > opts.limit;
    return {
      rows: (hasMore ? rows.slice(0, opts.limit) : rows).map(
        toFormTemplateRecord,
      ),
      hasMore,
    };
  },

  async createTemplate(
    tenantId: string,
    input: CreateTemplateInput,
  ): Promise<FormTemplateRecord> {
    const now = new Date();

    const [row] = await db
      .insert(formTemplates)
      .values({
        id: crypto.randomUUID(),
        tenantId,
        name: input.name,
        description: input.description ?? null,
        fields: input.fields as unknown as typeof formTemplates.$inferInsert["fields"],
        active: input.isActive ?? true,
        attachedServices: input.attachedServices ?? null,
        sendTiming: "ON_BOOKING",   // default; timing mapping from input omitted (no 1:1 enum match)
        completionRequired: false,
        allowGuestAccess: false,
        sortOrder: 0,
        isPublic: false,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    log.info({ tenantId, templateId: row!.id }, "Form template created");
    return toFormTemplateRecord(row!);
  },

  async updateTemplate(
    tenantId: string,
    templateId: string,
    input: Partial<UpdateTemplateInput>,
  ): Promise<FormTemplateRecord> {
    const updateData: Record<string, unknown> = { updatedAt: new Date() };

    if (input.name !== undefined) updateData.name = input.name;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.fields !== undefined) updateData.fields = input.fields;
    if (input.isActive !== undefined) updateData.active = input.isActive;
    if (input.attachedServices !== undefined) updateData.attachedServices = input.attachedServices;

    const [updated] = await db
      .update(formTemplates)
      .set(updateData as Partial<typeof formTemplates.$inferInsert>)
      .where(
        and(
          eq(formTemplates.id, templateId),
          eq(formTemplates.tenantId, tenantId),
        ),
      )
      .returning();

    if (!updated) throw new NotFoundError("FormTemplate", templateId);
    log.info({ tenantId, templateId }, "Form template updated");
    return toFormTemplateRecord(updated);
  },

  async deleteTemplate(tenantId: string, templateId: string): Promise<void> {
    // Hard delete - formTemplates has no deletedAt column
    await db
      .delete(formTemplates)
      .where(
        and(
          eq(formTemplates.id, templateId),
          eq(formTemplates.tenantId, tenantId),
        ),
      );

    log.info({ tenantId, templateId }, "Form template deleted");
  },

  // ---- COMPLETED FORMS (INSTANCES) ----

  async createInstance(
    input: Omit<CompletedFormRecord, "id" | "createdAt" | "updatedAt">,
  ): Promise<CompletedFormRecord> {
    const now = new Date();

    const [row] = await db
      .insert(completedForms)
      .values({
        id: crypto.randomUUID(),
        tenantId: input.tenantId,
        templateId: input.templateId,
        templateName: "",          // required by schema; populated by service if needed
        customerId: input.customerId ?? crypto.randomUUID(), // customerId is NOT NULL in schema
        customerName: "",          // required by schema; populated by service
        customerEmail: "",         // required by schema; populated by service
        jobId: input.bookingId ?? null,
        sessionKey: input.sessionKey,
        status: mapStatusToDb(input.status),
        responses: (input.responses ?? {}) as typeof completedForms.$inferInsert["responses"],
        signature: input.signature ?? null,
        submittedAt: input.completedAt ?? null,
        expiresAt: input.expiresAt ?? null,
        createdAt: now,
      })
      .returning();

    log.info(
      { tenantId: input.tenantId, instanceId: row!.id },
      "Completed form instance created",
    );
    return toCompletedFormRecord(row!);
  },

  async findByToken(token: string): Promise<CompletedFormRecord | null> {
    const result = await db
      .select()
      .from(completedForms)
      .where(eq(completedForms.sessionKey, token))
      .limit(1);

    return result[0] ? toCompletedFormRecord(result[0]) : null;
  },

  async findById(
    tenantId: string,
    instanceId: string,
  ): Promise<CompletedFormRecord | null> {
    const result = await db
      .select()
      .from(completedForms)
      .where(
        and(
          eq(completedForms.id, instanceId),
          eq(completedForms.tenantId, tenantId),
        ),
      )
      .limit(1);

    return result[0] ? toCompletedFormRecord(result[0]) : null;
  },

  async markCompleted(
    instanceId: string,
    responses: Record<string, unknown>,
    signature?: string,
  ): Promise<void> {
    const now = new Date();

    await db
      .update(completedForms)
      .set({
        status: "COMPLETED",
        responses: responses as typeof completedForms.$inferInsert["responses"],
        signature: signature ?? null,
        submittedAt: now,
      })
      .where(eq(completedForms.id, instanceId));

    log.info({ instanceId }, "Form instance marked completed");
  },

  async listResponses(
    tenantId: string,
    opts: {
      templateId?: string;
      bookingId?: string;
      customerId?: string;
      status?: FormStatus;
      limit: number;
      cursor?: string;
    },
  ): Promise<{ rows: CompletedFormRecord[]; hasMore: boolean }> {
    const conditions = [eq(completedForms.tenantId, tenantId)];

    if (opts.templateId) {
      conditions.push(eq(completedForms.templateId, opts.templateId));
    }

    if (opts.bookingId) {
      conditions.push(eq(completedForms.jobId, opts.bookingId));
    }

    if (opts.customerId) {
      conditions.push(eq(completedForms.customerId, opts.customerId));
    }

    if (opts.status) {
      conditions.push(eq(completedForms.status, mapStatusToDb(opts.status)));
    }

    if (opts.cursor) {
      conditions.push(
        sql`${completedForms.createdAt} <= ${new Date(opts.cursor)}`,
      );
    }

    const rows = await db
      .select()
      .from(completedForms)
      .where(and(...conditions))
      .orderBy(desc(completedForms.createdAt))
      .limit(opts.limit + 1);

    const hasMore = rows.length > opts.limit;
    return {
      rows: (hasMore ? rows.slice(0, opts.limit) : rows).map(
        toCompletedFormRecord,
      ),
      hasMore,
    };
  },
};

// ---------------------------------------------------------------------------
// Map FormStatus type → DB enum value
// ---------------------------------------------------------------------------

type DbFormStatus = "PENDING" | "COMPLETED" | "EXPIRED" | "CANCELLED";

function mapStatusToDb(status: FormStatus): DbFormStatus {
  switch (status) {
    case "PENDING":
      return "PENDING";
    case "COMPLETED":
      return "COMPLETED";
    case "EXPIRED":
      return "EXPIRED";
    case "SENT":
      return "CANCELLED"; // closest available mapping
    default:
      return "PENDING";
  }
}
