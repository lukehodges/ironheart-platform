import { createHash } from "node:crypto";
import { db } from "@/shared/db";
import { logger } from "@/shared/logger";
import { auditLog } from "@/shared/audit";
import { NotFoundError, ForbiddenError } from "@/shared/errors";
import type { Context } from "@/shared/trpc";
import { customerRepository } from "./customer.repository";
import type {
  CustomerRecord,
  CustomerNoteRecord,
} from "./customer.types";
import type { z } from "zod";
import type {
  listCustomersSchema,
  createCustomerSchema,
  updateCustomerSchema,
  addNoteSchema,
} from "./customer.schemas";

const log = logger.child({ module: "customer.service" });

export const customerService = {

  // ---------------------------------------------------------------------------
  // GET SINGLE CUSTOMER
  // ---------------------------------------------------------------------------

  async getCustomer(ctx: Context, customerId: string): Promise<CustomerRecord> {
    const customer = await customerRepository.findById(ctx.tenantId, customerId);
    if (!customer) throw new NotFoundError("Customer", customerId);
    return customer;
  },

  // ---------------------------------------------------------------------------
  // LIST CUSTOMERS
  // ---------------------------------------------------------------------------

  async listCustomers(
    ctx: Context,
    input: z.infer<typeof listCustomersSchema>,
  ): Promise<{ rows: CustomerRecord[]; hasMore: boolean }> {
    return customerRepository.list(ctx.tenantId, {
      search: input.search,
      tags: input.tags,
      isActive: input.isActive,
      limit: input.limit,
      cursor: input.cursor,
    });
  },

  // ---------------------------------------------------------------------------
  // CREATE CUSTOMER
  // ---------------------------------------------------------------------------

  async createCustomer(
    ctx: Context,
    input: z.infer<typeof createCustomerSchema>,
  ): Promise<CustomerRecord> {
    const customer = await customerRepository.create(ctx.tenantId, {
      name: input.name,
      email: input.email ?? null,
      phone: input.phone ?? null,
      dateOfBirth: input.dateOfBirth ?? null,
      gender: input.gender ?? null,
      tags: input.tags,
      notes: input.notes ?? null,
      referralSource: input.referralSource ?? null,
      address: input.address ?? null,
    });

    log.info(
      { tenantId: ctx.tenantId, customerId: customer.id },
      "Customer created via service",
    );

    return customer;
  },

  // ---------------------------------------------------------------------------
  // UPDATE CUSTOMER
  // ---------------------------------------------------------------------------

  async updateCustomer(
    ctx: Context,
    customerId: string,
    input: z.infer<typeof updateCustomerSchema>,
  ): Promise<CustomerRecord> {
    const updated = await customerRepository.update(ctx.tenantId, customerId, {
      name: input.name,
      email: input.email,
      phone: input.phone,
      dateOfBirth: input.dateOfBirth,
      gender: input.gender,
      tags: input.tags,
      notes: input.notes,
      referralSource: input.referralSource,
      address: input.address ?? undefined,
    });

    log.info(
      { tenantId: ctx.tenantId, customerId },
      "Customer updated via service",
    );

    return updated;
  },

  // ---------------------------------------------------------------------------
  // DELETE CUSTOMER (soft delete)
  // ---------------------------------------------------------------------------

  async deleteCustomer(ctx: Context, customerId: string): Promise<void> {
    // Verify customer exists and belongs to tenant before deleting
    const customer = await customerRepository.findById(ctx.tenantId, customerId);
    if (!customer) throw new NotFoundError("Customer", customerId);

    await customerRepository.softDelete(ctx.tenantId, customerId);

    log.info(
      { tenantId: ctx.tenantId, customerId },
      "Customer soft-deleted via service",
    );
  },

  // ---------------------------------------------------------------------------
  // MERGE CUSTOMERS
  // ---------------------------------------------------------------------------

  async mergeCustomers(
    ctx: Context,
    sourceId: string,
    targetId: string,
  ): Promise<void> {
    // Load both customers to verify they exist and belong to the tenant
    const [source, target] = await Promise.all([
      customerRepository.findById(ctx.tenantId, sourceId),
      customerRepository.findById(ctx.tenantId, targetId),
    ]);

    if (!source) throw new NotFoundError("Customer", sourceId);
    if (!target) throw new NotFoundError("Customer", targetId);

    // Verify both belong to the current tenant (repository already scopes by tenantId,
    // but we double-check here for explicit ForbiddenError semantics)
    if (source.tenantId !== ctx.tenantId) {
      throw new ForbiddenError("Source customer does not belong to your tenant");
    }
    if (target.tenantId !== ctx.tenantId) {
      throw new ForbiddenError("Target customer does not belong to your tenant");
    }

    await db.transaction(async (tx) => {
      // Execute the 7-table cascade merge
      await customerRepository.merge(tx, sourceId, targetId);
    });

    log.info(
      { tenantId: ctx.tenantId, sourceId, targetId },
      "Customer merge complete",
    );

    // Fire-and-forget audit log entry for the merge operation
    await auditLog({
      tenantId: ctx.tenantId,
      actorId: ctx.user?.id ?? "system",
      action: "updated",
      resourceType: "customer",
      resourceId: sourceId,
      resourceName: `Customer merge: ${sourceId} -> ${targetId}`,
      changes: [{ field: "mergedIntoId", before: null, after: targetId }],
    });
  },

  // ---------------------------------------------------------------------------
  // ANONYMISE CUSTOMER (GDPR)
  // ---------------------------------------------------------------------------

  async anonymiseCustomer(ctx: Context, customerId: string): Promise<void> {
    // Verify customer exists and belongs to tenant
    const customer = await customerRepository.findById(ctx.tenantId, customerId);
    if (!customer) throw new NotFoundError("Customer", customerId);

    // Build 8-char hash from customerId + tenantId for deterministic anonymisation
    const hash = createHash("sha256")
      .update(`${customerId}-${ctx.tenantId}`)
      .digest("hex")
      .slice(0, 8);

    await customerRepository.anonymise(ctx.tenantId, customerId, hash);

    log.info(
      { tenantId: ctx.tenantId, customerId },
      "Customer anonymised via service",
    );
  },

  // ---------------------------------------------------------------------------
  // NOTES
  // ---------------------------------------------------------------------------

  async listNotes(
    ctx: Context,
    customerId: string,
  ): Promise<CustomerNoteRecord[]> {
    // Verify the customer belongs to this tenant before listing notes
    const customer = await customerRepository.findById(ctx.tenantId, customerId);
    if (!customer) throw new NotFoundError("Customer", customerId);

    return customerRepository.listNotes(ctx.tenantId, customerId);
  },

  async addNote(
    ctx: Context,
    input: z.infer<typeof addNoteSchema>,
  ): Promise<CustomerNoteRecord> {
    // Verify the customer belongs to this tenant before adding a note
    const customer = await customerRepository.findById(ctx.tenantId, input.customerId);
    if (!customer) throw new NotFoundError("Customer", input.customerId);

    const note = await customerRepository.addNote(ctx.tenantId, {
      customerId: input.customerId,
      content: input.content,
      noteType: input.noteType,
      isPrivate: input.isPrivate,
      userId: ctx.user?.id ?? "",
    });

    log.info(
      { tenantId: ctx.tenantId, customerId: input.customerId, noteId: note.id },
      "Customer note added via service",
    );

    return note;
  },

  async deleteNote(ctx: Context, noteId: string): Promise<void> {
    await customerRepository.deleteNote(ctx.tenantId, noteId);

    log.info(
      { tenantId: ctx.tenantId, noteId },
      "Customer note deleted via service",
    );
  },

  // ---------------------------------------------------------------------------
  // BOOKING HISTORY
  // ---------------------------------------------------------------------------

  async getBookingHistory(
    ctx: Context,
    customerId: string,
  ): Promise<
    Array<{
      id: string;
      scheduledDate: Date;
      status: string;
      totalAmount: number | null;
    }>
  > {
    // Verify the customer belongs to this tenant
    const customer = await customerRepository.findById(ctx.tenantId, customerId);
    if (!customer) throw new NotFoundError("Customer", customerId);

    return customerRepository.getBookingHistory(ctx.tenantId, customerId);
  },
};
