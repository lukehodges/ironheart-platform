import { db } from "@/shared/db";
import { logger } from "@/shared/logger";
import { NotFoundError } from "@/shared/errors";
import { resources, jobs, jobAssignments } from "@/shared/db/schema";
import { eq, and, inArray, sql } from "drizzle-orm";
import type { CreateResourceInput, UpdateResourceInput, ListAvailableInput, ResourceType } from "./resources.types";

const log = logger.child({ module: "resources.repository" });

// --------------- Slug generator ---------------

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 100);
}

// ===============================================================
// RESOURCE REPOSITORY
// ===============================================================

export const resourceRepository = {

  async findById(tenantId: string, resourceId: string) {
    const result = await db
      .select()
      .from(resources)
      .where(and(eq(resources.id, resourceId), eq(resources.tenantId, tenantId)))
      .limit(1);
    return result[0] ?? null;
  },

  async findByUserId(tenantId: string, userId: string) {
    const result = await db
      .select()
      .from(resources)
      .where(and(eq(resources.userId, userId), eq(resources.tenantId, tenantId)))
      .limit(1);
    return result[0] ?? null;
  },

  async list(
    tenantId: string,
    filters: { type?: ResourceType; isActive?: boolean; limit?: number; cursor?: string }
  ) {
    const limit = filters.limit ?? 50;
    const conditions = [eq(resources.tenantId, tenantId)];

    if (filters.type !== undefined) {
      conditions.push(eq(resources.type, filters.type));
    }
    if (filters.isActive !== undefined) {
      conditions.push(eq(resources.isActive, filters.isActive));
    }

    const rows = await db
      .select()
      .from(resources)
      .where(and(...conditions))
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    return {
      rows: hasMore ? rows.slice(0, limit) : rows,
      hasMore,
    };
  },

  async create(tenantId: string, input: CreateResourceInput) {
    const now = new Date();
    const slug = input.slug ?? generateSlug(input.name);

    const [resource] = await db
      .insert(resources)
      .values({
        id: crypto.randomUUID(),
        tenantId,
        type: input.type,
        name: input.name,
        slug,
        capacity: input.capacity ?? 1,
        homeAddressId: null,
        travelEnabled: input.travelEnabled ?? false,
        skillTags: input.skillTags ?? null,
        userId: input.userId ?? null,
        isActive: true,
        metadata: input.metadata ?? null,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    log.info({ tenantId, resourceId: resource!.id }, "Resource created");
    return resource!;
  },

  async update(tenantId: string, resourceId: string, input: UpdateResourceInput) {
    const updateData: Record<string, unknown> = { updatedAt: new Date() };

    if (input.type !== undefined) updateData.type = input.type;
    if (input.name !== undefined) updateData.name = input.name;
    if (input.slug !== undefined) updateData.slug = input.slug;
    if (input.capacity !== undefined) updateData.capacity = input.capacity;
    if (input.travelEnabled !== undefined) updateData.travelEnabled = input.travelEnabled;
    if (input.skillTags !== undefined) updateData.skillTags = input.skillTags;
    if (input.userId !== undefined) updateData.userId = input.userId;
    if (input.isActive !== undefined) updateData.isActive = input.isActive;
    if (input.homeAddressId !== undefined) updateData.homeAddressId = input.homeAddressId;
    if (input.metadata !== undefined) updateData.metadata = input.metadata;

    const [updated] = await db
      .update(resources)
      .set(updateData as Partial<typeof resources.$inferInsert>)
      .where(and(eq(resources.id, resourceId), eq(resources.tenantId, tenantId)))
      .returning();

    if (!updated) throw new NotFoundError("Resource", resourceId);
    log.info({ tenantId, resourceId }, "Resource updated");
    return updated;
  },

  async delete(tenantId: string, resourceId: string) {
    await db
      .delete(resources)
      .where(and(eq(resources.id, resourceId), eq(resources.tenantId, tenantId)));
    log.info({ tenantId, resourceId }, "Resource deleted");
  },

  async listAvailable(tenantId: string, input: ListAvailableInput) {
    // Find resources that are NOT assigned to overlapping jobs on the specified date/time
    // First find busy resources: those with job assignments where the job overlaps the time window
    const busyAssignments = await db
      .select({ resourceId: jobAssignments.resourceId, userId: jobAssignments.userId })
      .from(jobAssignments)
      .innerJoin(jobs, eq(jobAssignments.jobId, jobs.id))
      .where(
        and(
          eq(jobs.tenantId, tenantId),
          eq(jobs.scheduledDate, input.date),
          // Check time overlap: job starts before endTime AND job ends after startTime
          sql`${jobs.scheduledTime} < ${input.endTime}`,
          sql`${jobs.endTime} > ${input.startTime}`,
          sql`${jobs.status} NOT IN ('CANCELLED', 'REJECTED', 'RELEASED')`
        )
      );

    const busyResourceIds = busyAssignments
      .map((a) => a.resourceId)
      .filter((id): id is string => id !== null);

    const busyUserIds = busyAssignments.map((a) => a.userId);

    // Query available resources (not busy, matching filters)
    const conditions = [
      eq(resources.tenantId, tenantId),
      eq(resources.isActive, true),
    ];

    if (input.type !== undefined) {
      conditions.push(eq(resources.type, input.type));
    }

    if (input.skillTags && input.skillTags.length > 0) {
      // Resource must have ALL specified skill tags
      for (const tag of input.skillTags) {
        conditions.push(sql`${tag} = ANY(${resources.skillTags})`);
      }
    }

    if (busyResourceIds.length > 0) {
      conditions.push(sql`${resources.id} NOT IN (${sql.join(busyResourceIds.map((id) => sql`${id}::uuid`), sql`, `)})`);
    }

    if (busyUserIds.length > 0) {
      conditions.push(sql`(${resources.userId} IS NULL OR ${resources.userId} NOT IN (${sql.join(busyUserIds.map((id) => sql`${id}::uuid`), sql`, `)}))`);
    }

    return db
      .select()
      .from(resources)
      .where(and(...conditions));
  },
};
