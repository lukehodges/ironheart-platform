import { db } from "@/shared/db";
import { logger } from "@/shared/logger";
import { OptimisticConcurrencyError, NotFoundError, BadRequestError } from "@/shared/errors";
import { engagementOrgChart, engagementOrgChartActivity } from "@/shared/db/schemas/onboarding-chart.schema";
import { eq, and, desc, lt, sql, inArray, max } from "drizzle-orm";
import type {
  OrgChartNodeRecord,
  OrgChartTree,
  ChartActivityRecord,
  CreateNodeInput,
  UpdateNodeInput,
  ReparentNodeInput,
  LogActivityInput,
  ListActivityInput,
  AuditFlag,
  NodeInterviewStatus,
  NodeFormStatus,
} from "./onboarding.types";

const log = logger.child({ module: "onboarding.repository" });

// ── helpers ───────────────────────────────────────────────────────────────────

function buildTree(nodes: OrgChartNodeRecord[]): OrgChartTree[] {
  const byId = new Map<string, OrgChartTree>();
  const roots: OrgChartTree[] = [];

  // First pass: hydrate all nodes with empty children arrays
  for (const node of nodes) {
    byId.set(node.id, { ...node, children: [] });
  }

  // Second pass: wire children to parents; orphans become roots
  for (const node of nodes) {
    const treeNode = byId.get(node.id)!;
    if (node.parentId === null || !byId.has(node.parentId)) {
      roots.push(treeNode);
    } else {
      byId.get(node.parentId)!.children.push(treeNode);
    }
  }

  return roots;
}

// postgres-js returns the result directly as an iterable array (RowList extends T[]).
// There is no .rows property — cast to unknown[] to iterate safely.
function toRows(result: unknown): Array<Record<string, unknown>> {
  return result as Array<Record<string, unknown>>;
}

// ── repository ────────────────────────────────────────────────────────────────

export const onboardingRepository = {
  /**
   * Returns all org chart nodes for the given engagement, scoped by tenantId,
   * ordered for consistent tree reconstruction (parentId nulls first, then sortOrder).
   */
  async getChartByEngagement(
    tenantId: string,
    engagementId: string
  ): Promise<OrgChartNodeRecord[]> {
    const rows = await db
      .select()
      .from(engagementOrgChart)
      .where(
        and(
          eq(engagementOrgChart.tenantId, tenantId),
          eq(engagementOrgChart.engagementId, engagementId)
        )
      )
      .orderBy(engagementOrgChart.parentId, engagementOrgChart.sortOrder);
    return rows as OrgChartNodeRecord[];
  },

  /**
   * Returns the tree rooted at top-level nodes (parentId = null or orphaned).
   * Children are nested inside each node's `children` array.
   */
  async getChartTree(tenantId: string, engagementId: string): Promise<OrgChartTree[]> {
    const rows = await onboardingRepository.getChartByEngagement(tenantId, engagementId);
    return buildTree(rows);
  },

  /**
   * Returns a single node by id, scoped by tenantId. Returns null if not found.
   */
  async getNodeById(tenantId: string, nodeId: string): Promise<OrgChartNodeRecord | null> {
    const rows = await db
      .select()
      .from(engagementOrgChart)
      .where(
        and(
          eq(engagementOrgChart.tenantId, tenantId),
          eq(engagementOrgChart.id, nodeId)
        )
      )
      .limit(1);
    return (rows[0] as OrgChartNodeRecord) ?? null;
  },

  /**
   * Inserts a new node. sortOrder defaults to max(sortOrder)+1 within the
   * same parent scope. version starts at 1.
   */
  async createNode(input: CreateNodeInput): Promise<OrgChartNodeRecord> {
    const now = new Date();

    let sortOrder = input.sortOrder;
    if (sortOrder === undefined) {
      // Determine the next sort order among siblings
      const [maxRow] = await db
        .select({ maxOrder: max(engagementOrgChart.sortOrder) })
        .from(engagementOrgChart)
        .where(
          input.parentId === null
            ? and(
                eq(engagementOrgChart.tenantId, input.tenantId),
                eq(engagementOrgChart.engagementId, input.engagementId),
                sql`${engagementOrgChart.parentId} IS NULL`
              )
            : and(
                eq(engagementOrgChart.tenantId, input.tenantId),
                eq(engagementOrgChart.engagementId, input.engagementId),
                eq(engagementOrgChart.parentId, input.parentId)
              )
        );
      sortOrder = (maxRow?.maxOrder ?? 0) + 1;
    }

    const [row] = await db
      .insert(engagementOrgChart)
      .values({
        tenantId: input.tenantId,
        engagementId: input.engagementId,
        parentId: input.parentId,
        label: input.label,
        type: input.type,
        headcount: input.headcount ?? null,
        contactUserId: input.contactUserId ?? null,
        contactEmail: input.contactEmail ?? null,
        contactName: input.contactName ?? null,
        contactRole: input.contactRole ?? null,
        interviewMode: input.interviewMode ?? "OWNER_ONLY",
        sampleSize: input.sampleSize ?? null,
        templateSlugOverride: input.templateSlugOverride ?? null,
        sortOrder,
        version: 1,
        lastEditedBy: input.editedBy,
        lastEditedAt: now,
        // Chart depth (Phase 1.0) — defaults mirror the DB defaults.
        kind: input.kind ?? "PERSON",
        auditFlags: input.auditFlags ?? [],
        interviewStatus: input.interviewStatus ?? "NONE",
        formStatus: input.formStatus ?? "NONE",
        tenureYears: input.tenureYears ?? null,
        email: input.email ?? null,
        isFounder: input.isFounder ?? false,
        isFractional: input.isFractional ?? false,
        avatarColor: input.avatarColor ?? null,
        edgeStyle: input.edgeStyle ?? "SOLID",
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    log.info({ nodeId: row.id, engagementId: input.engagementId }, "org chart node created");
    return row as OrgChartNodeRecord;
  },

  /**
   * Inserts multiple nodes in a single transaction. Each node gets version=1.
   */
  async bulkCreateNodes(inputs: CreateNodeInput[]): Promise<OrgChartNodeRecord[]> {
    if (inputs.length === 0) return [];

    const now = new Date();
    const values = inputs.map((input) => ({
      tenantId: input.tenantId,
      engagementId: input.engagementId,
      parentId: input.parentId,
      label: input.label,
      type: input.type,
      headcount: input.headcount ?? null,
      contactUserId: input.contactUserId ?? null,
      contactEmail: input.contactEmail ?? null,
      contactName: input.contactName ?? null,
      contactRole: input.contactRole ?? null,
      interviewMode: input.interviewMode ?? ("OWNER_ONLY" as const),
      sampleSize: input.sampleSize ?? null,
      templateSlugOverride: input.templateSlugOverride ?? null,
      sortOrder: input.sortOrder ?? 0,
      version: 1,
      lastEditedBy: input.editedBy,
      lastEditedAt: now,
      // Chart depth (Phase 1.0) — defaults mirror the DB defaults.
      kind: input.kind ?? ("PERSON" as const),
      auditFlags: input.auditFlags ?? [],
      interviewStatus: input.interviewStatus ?? ("NONE" as const),
      formStatus: input.formStatus ?? ("NONE" as const),
      tenureYears: input.tenureYears ?? null,
      email: input.email ?? null,
      isFounder: input.isFounder ?? false,
      isFractional: input.isFractional ?? false,
      avatarColor: input.avatarColor ?? null,
      edgeStyle: input.edgeStyle ?? ("SOLID" as const),
      createdAt: now,
      updatedAt: now,
    }));

    const rows = await db.insert(engagementOrgChart).values(values).returning();
    log.info({ count: rows.length }, "bulk org chart nodes created");
    return rows as OrgChartNodeRecord[];
  },

  /**
   * Updates a node's fields, incrementing version. Throws OptimisticConcurrencyError on
   * version mismatch. All ops scoped by tenantId.
   */
  async updateNode(params: {
    id: string;
    tenantId: string;
    expectedVersion: number;
    patch: UpdateNodeInput["patch"];
    editedBy: "CONSULTANT" | "CLIENT";
  }): Promise<OrgChartNodeRecord> {
    const now = new Date();

    const [updated] = await db
      .update(engagementOrgChart)
      .set({
        ...params.patch,
        version: params.expectedVersion + 1,
        lastEditedBy: params.editedBy,
        lastEditedAt: now,
        updatedAt: now,
      })
      .where(
        and(
          eq(engagementOrgChart.id, params.id),
          eq(engagementOrgChart.tenantId, params.tenantId),
          eq(engagementOrgChart.version, params.expectedVersion)
        )
      )
      .returning();

    if (!updated) {
      throw new OptimisticConcurrencyError("OrgChartNode");
    }

    log.info({ nodeId: params.id, version: updated.version }, "org chart node updated");
    return updated as OrgChartNodeRecord;
  },

  /**
   * Deletes the node and its entire subtree via a recursive CTE.
   * All ops scoped by tenantId. Throws OptimisticConcurrencyError on version mismatch.
   */
  async deleteNode(params: {
    id: string;
    tenantId: string;
    expectedVersion: number;
  }): Promise<{ deletedCount: number }> {
    const { id, tenantId, expectedVersion } = params;

    return await db.transaction(async (tx) => {
      // Verify root node exists and version matches (tenantId scoped)
      const [root] = await tx
        .select({ version: engagementOrgChart.version })
        .from(engagementOrgChart)
        .where(
          and(
            eq(engagementOrgChart.id, id),
            eq(engagementOrgChart.tenantId, tenantId)
          )
        )
        .limit(1);

      if (!root) {
        throw new NotFoundError("OrgChartNode", id);
      }
      if (root.version !== expectedVersion) {
        throw new OptimisticConcurrencyError("OrgChartNode");
      }

      // Find all descendants (including root) via recursive CTE (tenantId scoped)
      const subtreeResult = await tx.execute(sql`
        WITH RECURSIVE descendants AS (
          SELECT id FROM engagement_org_chart
          WHERE id = ${id} AND "tenantId" = ${tenantId}
          UNION ALL
          SELECT c.id FROM engagement_org_chart c
          INNER JOIN descendants d ON c."parentId" = d.id
          WHERE c."tenantId" = ${tenantId}
        )
        SELECT id FROM descendants
      `);

      const subtreeIds: string[] = toRows(subtreeResult).map((r) => r.id as string);

      if (subtreeIds.length > 0) {
        await tx
          .delete(engagementOrgChart)
          .where(
            and(
              inArray(engagementOrgChart.id, subtreeIds),
              eq(engagementOrgChart.tenantId, tenantId)
            )
          );
      }

      log.info({ nodeId: id, deletedCount: subtreeIds.length }, "org chart node + subtree deleted");
      return { deletedCount: subtreeIds.length };
    });
  },

  /**
   * Moves a node to a new parent, updating sortOrder. Prevents cycles by
   * checking that newParentId is not a descendant of the node being moved.
   * All ops scoped by tenantId.
   */
  async reparentNode(params: {
    id: string;
    tenantId: string;
    newParentId: string | null;
    newSortOrder: number;
    expectedVersion: number;
    editedBy: "CONSULTANT" | "CLIENT";
  }): Promise<OrgChartNodeRecord> {
    const { id, tenantId, newParentId, newSortOrder, expectedVersion, editedBy } = params;

    if (newParentId !== null) {
      // Cycle prevention: get all descendants of `id` (tenantId scoped)
      const descendantResult = await db.execute(sql`
        WITH RECURSIVE descendants AS (
          SELECT id FROM engagement_org_chart
          WHERE "parentId" = ${id} AND "tenantId" = ${tenantId}
          UNION ALL
          SELECT c.id FROM engagement_org_chart c
          INNER JOIN descendants d ON c."parentId" = d.id
          WHERE c."tenantId" = ${tenantId}
        )
        SELECT id FROM descendants
      `);

      const descendantIds = new Set(toRows(descendantResult).map((r) => r.id as string));

      if (descendantIds.has(newParentId)) {
        throw new BadRequestError("Cannot reparent — would create cycle");
      }
    }

    const now = new Date();

    const [updated] = await db
      .update(engagementOrgChart)
      .set({
        parentId: newParentId,
        sortOrder: newSortOrder,
        version: expectedVersion + 1,
        lastEditedBy: editedBy,
        lastEditedAt: now,
        updatedAt: now,
      })
      .where(
        and(
          eq(engagementOrgChart.id, id),
          eq(engagementOrgChart.tenantId, tenantId),
          eq(engagementOrgChart.version, expectedVersion)
        )
      )
      .returning();

    if (!updated) {
      throw new OptimisticConcurrencyError("OrgChartNode");
    }

    log.info({ nodeId: id, newParentId }, "org chart node reparented");
    return updated as OrgChartNodeRecord;
  },

  /**
   * Replaces the full auditFlags array for a node. Caller passes the desired
   * final array — append/remove pattern is up to the caller. Bumps version +
   * touches lastEditedBy/lastEditedAt so optimistic-concurrency siblings see
   * the change. Scoped by tenantId.
   */
  async updateNodeAuditFlags(params: {
    id: string;
    tenantId: string;
    flags: AuditFlag[];
    editedBy: "CONSULTANT" | "CLIENT";
  }): Promise<OrgChartNodeRecord> {
    const now = new Date();
    const [updated] = await db
      .update(engagementOrgChart)
      .set({
        auditFlags: params.flags,
        version: sql`${engagementOrgChart.version} + 1`,
        lastEditedBy: params.editedBy,
        lastEditedAt: now,
        updatedAt: now,
      })
      .where(
        and(
          eq(engagementOrgChart.id, params.id),
          eq(engagementOrgChart.tenantId, params.tenantId)
        )
      )
      .returning();
    if (!updated) throw new NotFoundError("OrgChartNode", params.id);
    return updated as OrgChartNodeRecord;
  },

  async updateNodeInterviewStatus(params: {
    id: string;
    tenantId: string;
    status: NodeInterviewStatus;
    editedBy: "CONSULTANT" | "CLIENT";
  }): Promise<OrgChartNodeRecord> {
    const now = new Date();
    const [updated] = await db
      .update(engagementOrgChart)
      .set({
        interviewStatus: params.status,
        version: sql`${engagementOrgChart.version} + 1`,
        lastEditedBy: params.editedBy,
        lastEditedAt: now,
        updatedAt: now,
      })
      .where(
        and(
          eq(engagementOrgChart.id, params.id),
          eq(engagementOrgChart.tenantId, params.tenantId)
        )
      )
      .returning();
    if (!updated) throw new NotFoundError("OrgChartNode", params.id);
    return updated as OrgChartNodeRecord;
  },

  async updateNodeFormStatus(params: {
    id: string;
    tenantId: string;
    status: NodeFormStatus;
    editedBy: "CONSULTANT" | "CLIENT";
  }): Promise<OrgChartNodeRecord> {
    const now = new Date();
    const [updated] = await db
      .update(engagementOrgChart)
      .set({
        formStatus: params.status,
        version: sql`${engagementOrgChart.version} + 1`,
        lastEditedBy: params.editedBy,
        lastEditedAt: now,
        updatedAt: now,
      })
      .where(
        and(
          eq(engagementOrgChart.id, params.id),
          eq(engagementOrgChart.tenantId, params.tenantId)
        )
      )
      .returning();
    if (!updated) throw new NotFoundError("OrgChartNode", params.id);
    return updated as OrgChartNodeRecord;
  },

  /**
   * Returns activity records for an engagement, descending by createdAt.
   * Supports cursor-based pagination using ISO timestamp as cursor.
   * hasMore uses the limit+1 trick.
   */
  async getActivity(
    tenantId: string,
    engagementId: string,
    opts: { limit: number; cursor?: string }
  ): Promise<{ rows: ChartActivityRecord[]; hasMore: boolean; nextCursor: string | null }> {
    const limit = opts.limit ?? 50;

    // Activity table has no tenantId column (D-08: local to chart, not yet unified).
    // Scoped via engagementId which is always tenant-bound via the engagement FK.
    const conditions = opts.cursor
      ? and(
          eq(engagementOrgChartActivity.engagementId, engagementId),
          lt(engagementOrgChartActivity.createdAt, new Date(opts.cursor))
        )
      : eq(engagementOrgChartActivity.engagementId, engagementId);

    const rows = await db
      .select()
      .from(engagementOrgChartActivity)
      .where(conditions)
      .orderBy(desc(engagementOrgChartActivity.createdAt))
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    if (hasMore) rows.pop();

    const nextCursor =
      hasMore && rows.length > 0
        ? rows[rows.length - 1].createdAt.toISOString()
        : null;

    return { rows: rows as ChartActivityRecord[], hasMore, nextCursor };
  },

  /**
   * Appends an activity record to the log. Append-only; never updates existing rows.
   */
  async logActivity(input: LogActivityInput): Promise<ChartActivityRecord> {
    const now = new Date();

    const [row] = await db
      .insert(engagementOrgChartActivity)
      .values({
        engagementId: input.engagementId,
        nodeId: input.nodeId,
        actorType: input.actorType,
        actorId: input.actorId,
        actorName: input.actorName,
        action: input.action,
        fromValue: input.fromValue ?? null,
        toValue: input.toValue ?? null,
        message: input.message,
        createdAt: now,
      })
      .returning();

    return row as ChartActivityRecord;
  },
};
