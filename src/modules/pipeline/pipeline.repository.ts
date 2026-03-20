import { db } from "@/shared/db";
import { logger } from "@/shared/logger";
import { NotFoundError } from "@/shared/errors";
import {
  pipelines,
  pipelineStages,
  pipelineMembers,
  pipelineStageHistory,
  customers,
} from "@/shared/db/schema";
import {
  eq,
  and,
  desc,
  asc,
  sql,
  count,
  sum,
} from "drizzle-orm";
import type {
  PipelineRecord,
  PipelineStageRecord,
  PipelineMemberRecord,
  PipelineMemberWithCustomer,
  PipelineWithStages,
  PipelineStageHistoryRecord,
  PipelineStageSummary,
} from "./pipeline.types";

const log = logger.child({ module: "pipeline.repository" });

// ---------------------------------------------------------------------------
// Row types
// ---------------------------------------------------------------------------

type PipelineRow = typeof pipelines.$inferSelect;
type PipelineStageRow = typeof pipelineStages.$inferSelect;
type PipelineMemberRow = typeof pipelineMembers.$inferSelect;
type PipelineStageHistoryRow = typeof pipelineStageHistory.$inferSelect;

// ---------------------------------------------------------------------------
// Row mappers
// ---------------------------------------------------------------------------

function toPipelineRecord(row: PipelineRow): PipelineRecord {
  return {
    id: row.id,
    tenantId: row.tenantId,
    name: row.name,
    description: row.description ?? null,
    isDefault: row.isDefault,
    isArchived: row.isArchived,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toStageRecord(row: PipelineStageRow): PipelineStageRecord {
  return {
    id: row.id,
    tenantId: row.tenantId,
    pipelineId: row.pipelineId,
    name: row.name,
    slug: row.slug,
    position: row.position,
    color: row.color ?? null,
    type: row.type,
    allowedTransitions: row.allowedTransitions ?? [],
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toMemberRecord(row: PipelineMemberRow): PipelineMemberRecord {
  return {
    id: row.id,
    tenantId: row.tenantId,
    pipelineId: row.pipelineId,
    customerId: row.customerId,
    stageId: row.stageId,
    dealValue: row.dealValue != null ? Number(row.dealValue) : null,
    lostReason: row.lostReason ?? null,
    enteredStageAt: row.enteredStageAt,
    addedAt: row.addedAt,
    closedAt: row.closedAt ?? null,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toHistoryRecord(row: PipelineStageHistoryRow): PipelineStageHistoryRecord {
  return {
    id: row.id,
    tenantId: row.tenantId,
    memberId: row.memberId,
    fromStageId: row.fromStageId ?? null,
    toStageId: row.toStageId,
    changedAt: row.changedAt,
    changedById: row.changedById ?? null,
    dealValue: row.dealValue != null ? Number(row.dealValue) : null,
    lostReason: row.lostReason ?? null,
    notes: row.notes ?? null,
  };
}

// ===============================================================
// PIPELINE REPOSITORY
// ===============================================================

export const pipelineRepository = {
  // -------------------------------------------------------------------
  // PIPELINE CRUD
  // -------------------------------------------------------------------

  async list(tenantId: string): Promise<PipelineRecord[]> {
    const rows = await db
      .select()
      .from(pipelines)
      .where(eq(pipelines.tenantId, tenantId))
      .orderBy(desc(pipelines.isDefault), asc(pipelines.name));

    return rows.map(toPipelineRecord);
  },

  async findById(tenantId: string, pipelineId: string): Promise<PipelineWithStages> {
    const [row] = await db
      .select()
      .from(pipelines)
      .where(
        and(
          eq(pipelines.id, pipelineId),
          eq(pipelines.tenantId, tenantId),
        ),
      )
      .limit(1);

    if (!row) throw new NotFoundError("Pipeline", pipelineId);

    const stageRows = await db
      .select()
      .from(pipelineStages)
      .where(
        and(
          eq(pipelineStages.pipelineId, pipelineId),
          eq(pipelineStages.tenantId, tenantId),
        ),
      )
      .orderBy(asc(pipelineStages.position));

    return {
      ...toPipelineRecord(row),
      stages: stageRows.map(toStageRecord),
    };
  },

  async findDefault(tenantId: string): Promise<PipelineWithStages | null> {
    const [row] = await db
      .select()
      .from(pipelines)
      .where(
        and(
          eq(pipelines.tenantId, tenantId),
          eq(pipelines.isDefault, true),
        ),
      )
      .limit(1);

    if (!row) return null;

    const stageRows = await db
      .select()
      .from(pipelineStages)
      .where(
        and(
          eq(pipelineStages.pipelineId, row.id),
          eq(pipelineStages.tenantId, tenantId),
        ),
      )
      .orderBy(asc(pipelineStages.position));

    return {
      ...toPipelineRecord(row),
      stages: stageRows.map(toStageRecord),
    };
  },

  async create(
    tenantId: string,
    input: {
      name: string;
      description?: string | null;
      isDefault?: boolean;
      stages?: Array<{
        name: string;
        slug: string;
        position: number;
        color?: string | null;
        type?: "OPEN" | "WON" | "LOST";
        allowedTransitions?: string[];
      }>;
    },
  ): Promise<PipelineWithStages> {
    const now = new Date();

    return db.transaction(async (tx) => {
      // If marking as default, unset other defaults first
      if (input.isDefault) {
        await tx
          .update(pipelines)
          .set({ isDefault: false, updatedAt: now })
          .where(
            and(
              eq(pipelines.tenantId, tenantId),
              eq(pipelines.isDefault, true),
            ),
          );
      }

      const [pipelineRow] = await tx
        .insert(pipelines)
        .values({
          tenantId,
          name: input.name,
          description: input.description ?? null,
          isDefault: input.isDefault ?? false,
          isArchived: false,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      const pipelineId = pipelineRow!.id;

      let stageRows: PipelineStageRow[] = [];
      if (input.stages && input.stages.length > 0) {
        stageRows = await tx
          .insert(pipelineStages)
          .values(
            input.stages.map((s) => ({
              tenantId,
              pipelineId,
              name: s.name,
              slug: s.slug,
              position: s.position,
              color: s.color ?? null,
              type: s.type ?? ("OPEN" as const),
              allowedTransitions: s.allowedTransitions ?? [],
              createdAt: now,
              updatedAt: now,
            })),
          )
          .returning();
      }

      log.info({ tenantId, pipelineId, stageCount: stageRows.length }, "Pipeline created");

      return {
        ...toPipelineRecord(pipelineRow!),
        stages: stageRows.map(toStageRecord).sort((a, b) => a.position - b.position),
      };
    });
  },

  async update(
    tenantId: string,
    pipelineId: string,
    input: Partial<{
      name: string;
      description: string | null;
      isDefault: boolean;
    }>,
  ): Promise<PipelineRecord> {
    const now = new Date();

    return db.transaction(async (tx) => {
      // If marking as default, unset other defaults first
      if (input.isDefault) {
        await tx
          .update(pipelines)
          .set({ isDefault: false, updatedAt: now })
          .where(
            and(
              eq(pipelines.tenantId, tenantId),
              eq(pipelines.isDefault, true),
            ),
          );
      }

      const updateData: Record<string, unknown> = { updatedAt: now };
      if (input.name !== undefined) updateData.name = input.name;
      if (input.description !== undefined) updateData.description = input.description;
      if (input.isDefault !== undefined) updateData.isDefault = input.isDefault;

      const [updated] = await tx
        .update(pipelines)
        .set(updateData as Partial<typeof pipelines.$inferInsert>)
        .where(
          and(
            eq(pipelines.id, pipelineId),
            eq(pipelines.tenantId, tenantId),
          ),
        )
        .returning();

      if (!updated) throw new NotFoundError("Pipeline", pipelineId);

      log.info({ tenantId, pipelineId }, "Pipeline updated");
      return toPipelineRecord(updated);
    });
  },

  async archive(tenantId: string, pipelineId: string): Promise<void> {
    const [updated] = await db
      .update(pipelines)
      .set({ isArchived: true, updatedAt: new Date() })
      .where(
        and(
          eq(pipelines.id, pipelineId),
          eq(pipelines.tenantId, tenantId),
        ),
      )
      .returning();

    if (!updated) throw new NotFoundError("Pipeline", pipelineId);
    log.info({ tenantId, pipelineId }, "Pipeline archived");
  },

  // -------------------------------------------------------------------
  // STAGE CONFIGURATION
  // -------------------------------------------------------------------

  async findStageById(tenantId: string, stageId: string): Promise<PipelineStageRecord> {
    const [row] = await db
      .select()
      .from(pipelineStages)
      .where(
        and(
          eq(pipelineStages.id, stageId),
          eq(pipelineStages.tenantId, tenantId),
        ),
      )
      .limit(1);

    if (!row) throw new NotFoundError("PipelineStage", stageId);
    return toStageRecord(row);
  },

  async addStage(
    tenantId: string,
    input: {
      pipelineId: string;
      name: string;
      slug: string;
      position: number;
      color?: string | null;
      type?: "OPEN" | "WON" | "LOST";
      allowedTransitions?: string[];
    },
  ): Promise<PipelineStageRecord> {
    const now = new Date();

    const [row] = await db
      .insert(pipelineStages)
      .values({
        tenantId,
        pipelineId: input.pipelineId,
        name: input.name,
        slug: input.slug,
        position: input.position,
        color: input.color ?? null,
        type: input.type ?? "OPEN",
        allowedTransitions: input.allowedTransitions ?? [],
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    log.info({ tenantId, stageId: row!.id, pipelineId: input.pipelineId }, "Pipeline stage added");
    return toStageRecord(row!);
  },

  async updateStage(
    tenantId: string,
    stageId: string,
    input: Partial<{
      name: string;
      color: string | null;
      type: "OPEN" | "WON" | "LOST";
      allowedTransitions: string[];
    }>,
  ): Promise<PipelineStageRecord> {
    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (input.name !== undefined) updateData.name = input.name;
    if (input.color !== undefined) updateData.color = input.color;
    if (input.type !== undefined) updateData.type = input.type;
    if (input.allowedTransitions !== undefined) updateData.allowedTransitions = input.allowedTransitions;

    const [updated] = await db
      .update(pipelineStages)
      .set(updateData as Partial<typeof pipelineStages.$inferInsert>)
      .where(
        and(
          eq(pipelineStages.id, stageId),
          eq(pipelineStages.tenantId, tenantId),
        ),
      )
      .returning();

    if (!updated) throw new NotFoundError("PipelineStage", stageId);
    log.info({ tenantId, stageId }, "Pipeline stage updated");
    return toStageRecord(updated);
  },

  async removeStage(
    tenantId: string,
    stageId: string,
    reassignToStageId: string,
  ): Promise<void> {
    await db.transaction(async (tx) => {
      // Reassign members from the removed stage to the target stage
      await tx
        .update(pipelineMembers)
        .set({
          stageId: reassignToStageId,
          enteredStageAt: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(pipelineMembers.stageId, stageId),
            eq(pipelineMembers.tenantId, tenantId),
          ),
        );

      // Strip the removed stage from sibling allowedTransitions arrays
      // Find all stages in the same pipeline that reference this stageId
      const siblingStages = await tx
        .select()
        .from(pipelineStages)
        .where(eq(pipelineStages.tenantId, tenantId));

      for (const sibling of siblingStages) {
        if (sibling.allowedTransitions && sibling.allowedTransitions.includes(stageId)) {
          const filtered = sibling.allowedTransitions.filter((id) => id !== stageId);
          await tx
            .update(pipelineStages)
            .set({ allowedTransitions: filtered, updatedAt: new Date() })
            .where(eq(pipelineStages.id, sibling.id));
        }
      }

      // Delete the stage
      await tx
        .delete(pipelineStages)
        .where(
          and(
            eq(pipelineStages.id, stageId),
            eq(pipelineStages.tenantId, tenantId),
          ),
        );

      log.info({ tenantId, stageId, reassignToStageId }, "Pipeline stage removed");
    });
  },

  async reorderStages(
    tenantId: string,
    pipelineId: string,
    stageIds: string[],
  ): Promise<void> {
    const now = new Date();

    await db.transaction(async (tx) => {
      for (let i = 0; i < stageIds.length; i++) {
        await tx
          .update(pipelineStages)
          .set({ position: i, updatedAt: now })
          .where(
            and(
              eq(pipelineStages.id, stageIds[i]!),
              eq(pipelineStages.pipelineId, pipelineId),
              eq(pipelineStages.tenantId, tenantId),
            ),
          );
      }

      log.info({ tenantId, pipelineId, stageCount: stageIds.length }, "Pipeline stages reordered");
    });
  },

  // -------------------------------------------------------------------
  // MEMBER OPERATIONS
  // -------------------------------------------------------------------

  async findMemberById(tenantId: string, memberId: string): Promise<PipelineMemberRecord> {
    const [row] = await db
      .select()
      .from(pipelineMembers)
      .where(
        and(
          eq(pipelineMembers.id, memberId),
          eq(pipelineMembers.tenantId, tenantId),
        ),
      )
      .limit(1);

    if (!row) throw new NotFoundError("PipelineMember", memberId);
    return toMemberRecord(row);
  },

  async addMember(
    tenantId: string,
    input: {
      pipelineId: string;
      customerId: string;
      stageId: string;
      dealValue?: number | null;
      metadata?: Record<string, unknown>;
    },
  ): Promise<PipelineMemberRecord> {
    const now = new Date();

    const [row] = await db
      .insert(pipelineMembers)
      .values({
        tenantId,
        pipelineId: input.pipelineId,
        customerId: input.customerId,
        stageId: input.stageId,
        dealValue: input.dealValue != null ? input.dealValue.toString() : null,
        metadata: input.metadata ?? {},
        enteredStageAt: now,
        addedAt: now,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    log.info({ tenantId, memberId: row!.id, pipelineId: input.pipelineId }, "Pipeline member added");
    return toMemberRecord(row!);
  },

  async updateMemberStage(
    tenantId: string,
    memberId: string,
    input: {
      stageId: string;
      enteredStageAt?: Date;
      dealValue?: number | null;
      lostReason?: string | null;
      closedAt?: Date | null;
    },
  ): Promise<PipelineMemberRecord> {
    const updateData: Record<string, unknown> = {
      stageId: input.stageId,
      enteredStageAt: input.enteredStageAt ?? new Date(),
      updatedAt: new Date(),
    };

    if (input.dealValue !== undefined) {
      updateData.dealValue = input.dealValue != null ? input.dealValue.toString() : null;
    }
    if (input.lostReason !== undefined) updateData.lostReason = input.lostReason;
    if (input.closedAt !== undefined) updateData.closedAt = input.closedAt;

    const [updated] = await db
      .update(pipelineMembers)
      .set(updateData as Partial<typeof pipelineMembers.$inferInsert>)
      .where(
        and(
          eq(pipelineMembers.id, memberId),
          eq(pipelineMembers.tenantId, tenantId),
        ),
      )
      .returning();

    if (!updated) throw new NotFoundError("PipelineMember", memberId);
    log.info({ tenantId, memberId, stageId: input.stageId }, "Pipeline member stage updated");
    return toMemberRecord(updated);
  },

  async removeMember(tenantId: string, memberId: string): Promise<void> {
    const result = await db
      .delete(pipelineMembers)
      .where(
        and(
          eq(pipelineMembers.id, memberId),
          eq(pipelineMembers.tenantId, tenantId),
        ),
      )
      .returning();

    if (result.length === 0) throw new NotFoundError("PipelineMember", memberId);
    log.info({ tenantId, memberId }, "Pipeline member removed");
  },

  async updateMember(
    tenantId: string,
    memberId: string,
    input: Partial<{
      dealValue: number | null;
      metadata: Record<string, unknown>;
    }>,
  ): Promise<PipelineMemberRecord> {
    const updateData: Record<string, unknown> = { updatedAt: new Date() };

    if (input.dealValue !== undefined) {
      updateData.dealValue = input.dealValue != null ? input.dealValue.toString() : null;
    }
    if (input.metadata !== undefined) updateData.metadata = input.metadata;

    const [updated] = await db
      .update(pipelineMembers)
      .set(updateData as Partial<typeof pipelineMembers.$inferInsert>)
      .where(
        and(
          eq(pipelineMembers.id, memberId),
          eq(pipelineMembers.tenantId, tenantId),
        ),
      )
      .returning();

    if (!updated) throw new NotFoundError("PipelineMember", memberId);
    log.info({ tenantId, memberId }, "Pipeline member updated");
    return toMemberRecord(updated);
  },

  async listMembers(
    tenantId: string,
    pipelineId: string,
  ): Promise<PipelineMemberWithCustomer[]> {
    const rows = await db
      .select({
        member: pipelineMembers,
        customerFirstName: customers.firstName,
        customerLastName: customers.lastName,
        customerEmail: customers.email,
        customerTags: customers.tags,
      })
      .from(pipelineMembers)
      .innerJoin(customers, eq(pipelineMembers.customerId, customers.id))
      .where(
        and(
          eq(pipelineMembers.pipelineId, pipelineId),
          eq(pipelineMembers.tenantId, tenantId),
        ),
      )
      .orderBy(asc(pipelineMembers.enteredStageAt));

    return rows.map((r) => ({
      ...toMemberRecord(r.member),
      customerName: `${r.customerFirstName} ${r.customerLastName}`.trim(),
      customerEmail: r.customerEmail ?? null,
      customerTags: r.customerTags ?? [],
    }));
  },

  async getSummary(
    tenantId: string,
    pipelineId: string,
  ): Promise<PipelineStageSummary[]> {
    const rows = await db
      .select({
        stageId: pipelineMembers.stageId,
        count: count(),
        totalDealValue: sum(pipelineMembers.dealValue),
      })
      .from(pipelineMembers)
      .where(
        and(
          eq(pipelineMembers.pipelineId, pipelineId),
          eq(pipelineMembers.tenantId, tenantId),
        ),
      )
      .groupBy(pipelineMembers.stageId);

    return rows.map((r) => ({
      stageId: r.stageId,
      count: Number(r.count),
      totalDealValue: r.totalDealValue != null ? Number(r.totalDealValue) : 0,
    }));
  },

  async countActiveMembers(
    tenantId: string,
    pipelineId: string,
  ): Promise<number> {
    const [result] = await db
      .select({ count: count() })
      .from(pipelineMembers)
      .innerJoin(
        pipelineStages,
        eq(pipelineMembers.stageId, pipelineStages.id),
      )
      .where(
        and(
          eq(pipelineMembers.pipelineId, pipelineId),
          eq(pipelineMembers.tenantId, tenantId),
          eq(pipelineStages.type, "OPEN"),
        ),
      );

    return Number(result?.count ?? 0);
  },

  // -------------------------------------------------------------------
  // HISTORY
  // -------------------------------------------------------------------

  async createHistoryEntry(
    tenantId: string,
    input: {
      memberId: string;
      fromStageId: string | null;
      toStageId: string;
      changedById?: string | null;
      dealValue?: number | null;
      lostReason?: string | null;
      notes?: string | null;
    },
  ): Promise<PipelineStageHistoryRecord> {
    const [row] = await db
      .insert(pipelineStageHistory)
      .values({
        tenantId,
        memberId: input.memberId,
        fromStageId: input.fromStageId ?? null,
        toStageId: input.toStageId,
        changedAt: new Date(),
        changedById: input.changedById ?? null,
        dealValue: input.dealValue != null ? input.dealValue.toString() : null,
        lostReason: input.lostReason ?? null,
        notes: input.notes ?? null,
      })
      .returning();

    log.info(
      { tenantId, memberId: input.memberId, fromStageId: input.fromStageId, toStageId: input.toStageId },
      "Pipeline stage history entry created",
    );

    return toHistoryRecord(row!);
  },

  async getMemberHistory(
    tenantId: string,
    memberId: string,
  ): Promise<PipelineStageHistoryRecord[]> {
    const rows = await db
      .select()
      .from(pipelineStageHistory)
      .where(
        and(
          eq(pipelineStageHistory.tenantId, tenantId),
          eq(pipelineStageHistory.memberId, memberId),
        ),
      )
      .orderBy(desc(pipelineStageHistory.changedAt));

    return rows.map(toHistoryRecord);
  },
};
