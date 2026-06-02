// src/modules/integrations/integration-connections.repository.ts
/**
 * Repository for the NEW `integration_connections` table — DB-backed config +
 * per-connection sync cursor state. Supersedes the legacy `user_integrations`
 * table for pull-style integrations (Gmail IMAP, Stripe sync, etc).
 *
 * All ops are tenant-scoped. Never mutate the legacy table from here.
 */
import { db } from "@/shared/db"
import { integrationConnections } from "@/shared/db/schema"
import type { IntegrationConnectionRow } from "@/shared/db/schemas/event-framework.schema"
import { and, eq } from "drizzle-orm"
import { logger } from "@/shared/logger"

const log = logger.child({ module: "integration-connections.repository" })

export interface CreateConnectionInput {
  tenantId: string
  userId?: string | null
  providerSlug: string
  name: string
  config?: Record<string, unknown>
  secretsRef?: string | null
}

export interface ListConnectionsFilter {
  tenantId: string
  providerSlug?: string
}

export const integrationConnectionsRepository = {
  async createConnection(
    input: CreateConnectionInput,
  ): Promise<IntegrationConnectionRow> {
    const [row] = await db
      .insert(integrationConnections)
      .values({
        tenantId: input.tenantId,
        userId: input.userId ?? null,
        providerSlug: input.providerSlug,
        name: input.name,
        config: input.config ?? {},
        secretsRef: input.secretsRef ?? null,
      })
      .returning()

    if (!row) {
      throw new Error("createConnection: insert returned no row")
    }
    log.info(
      {
        connectionId: row.id,
        providerSlug: row.providerSlug,
        tenantId: row.tenantId,
      },
      "Integration connection created",
    )
    return row
  },

  async listConnections(
    filter: ListConnectionsFilter,
  ): Promise<IntegrationConnectionRow[]> {
    const conditions = [eq(integrationConnections.tenantId, filter.tenantId)]
    if (filter.providerSlug) {
      conditions.push(
        eq(integrationConnections.providerSlug, filter.providerSlug),
      )
    }
    return db
      .select()
      .from(integrationConnections)
      .where(and(...conditions))
  },

  /**
   * Tenant-scoped lookup. Returns null if the connection does not exist
   * within the given tenant.
   */
  async getConnection(
    connectionId: string,
    tenantId: string,
  ): Promise<IntegrationConnectionRow | null> {
    const [row] = await db
      .select()
      .from(integrationConnections)
      .where(
        and(
          eq(integrationConnections.id, connectionId),
          eq(integrationConnections.tenantId, tenantId),
        ),
      )
      .limit(1)
    return row ?? null
  },

  /**
   * Cross-tenant lookup — only intended for the pull runner where the
   * tenantId is unknown until after the row is loaded. CRUD callers should
   * prefer `getConnection(id, tenantId)`.
   */
  async getConnectionUnscoped(
    connectionId: string,
  ): Promise<IntegrationConnectionRow | null> {
    const [row] = await db
      .select()
      .from(integrationConnections)
      .where(eq(integrationConnections.id, connectionId))
      .limit(1)
    return row ?? null
  },

  async updateCursor(
    connectionId: string,
    cursor: Record<string, unknown>,
  ): Promise<void> {
    await db
      .update(integrationConnections)
      .set({
        syncCursor: cursor,
        lastSyncAt: new Date(),
        lastSyncError: null,
        updatedAt: new Date(),
      })
      .where(eq(integrationConnections.id, connectionId))
  },

  async recordSyncError(
    connectionId: string,
    error: string,
  ): Promise<void> {
    await db
      .update(integrationConnections)
      .set({
        lastSyncError: error,
        lastSyncAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(integrationConnections.id, connectionId))
  },

  async enable(connectionId: string, tenantId: string): Promise<void> {
    await db
      .update(integrationConnections)
      .set({ enabled: true, updatedAt: new Date() })
      .where(
        and(
          eq(integrationConnections.id, connectionId),
          eq(integrationConnections.tenantId, tenantId),
        ),
      )
  },

  async disable(connectionId: string, tenantId: string): Promise<void> {
    await db
      .update(integrationConnections)
      .set({ enabled: false, updatedAt: new Date() })
      .where(
        and(
          eq(integrationConnections.id, connectionId),
          eq(integrationConnections.tenantId, tenantId),
        ),
      )
  },
}
