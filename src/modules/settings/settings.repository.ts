import { db } from "@/shared/db";
import { apiKeys } from "@/shared/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { logger } from "@/shared/logger";
import { NotFoundError } from "@/shared/errors";
import type { ApiKey } from "./settings.types";

const log = logger.child({ module: "settings.repository" });

// ---------------------------------------------------------------------------
// Mappers
// ---------------------------------------------------------------------------

function mapApiKey(
  row: typeof apiKeys.$inferSelect
): ApiKey {
  return {
    id: row.id,
    tenantId: row.tenantId,
    name: row.name,
    keyPrefix: row.keyPrefix,
    scopes: row.scopes,
    rateLimit: row.rateLimit,
    lastUsedAt: row.lastUsedAt,
    usageCount: row.usageCount,
    expiresAt: row.expiresAt,
    revokedAt: row.revokedAt,
    createdAt: row.createdAt,
    createdBy: row.createdBy,
  };
}

// ---------------------------------------------------------------------------
// Repository
// ---------------------------------------------------------------------------

export const settingsRepository = {
  /**
   * Insert a new API key record. The hash is stored, never the raw key.
   */
  async createApiKey(
    tenantId: string,
    name: string,
    keyHash: string,
    keyPrefix: string,
    opts?: { scopes?: string[] | null; expiresAt?: Date | null; createdBy?: string | null }
  ): Promise<ApiKey> {
    log.info({ tenantId, name }, "createApiKey");

    const id = crypto.randomUUID();
    const now = new Date();

    const [row] = await db
      .insert(apiKeys)
      .values({
        id,
        tenantId,
        name,
        keyHash,
        keyPrefix,
        scopes: opts?.scopes ?? null,
        expiresAt: opts?.expiresAt ?? null,
        createdBy: opts?.createdBy ?? null,
        createdAt: now,
      })
      .returning();

    return mapApiKey(row);
  },

  /**
   * List all non-revoked API keys for a tenant.
   * Never returns the keyHash field.
   */
  async listApiKeys(tenantId: string): Promise<ApiKey[]> {
    log.info({ tenantId }, "listApiKeys");

    const rows = await db
      .select()
      .from(apiKeys)
      .where(
        and(
          eq(apiKeys.tenantId, tenantId),
          isNull(apiKeys.revokedAt)
        )
      );

    return rows.map(mapApiKey);
  },

  /**
   * Find a single API key by its SHA-256 hash.
   * Used for authentication of incoming API requests.
   */
  async findApiKeyByHash(keyHash: string): Promise<ApiKey | null> {
    log.info({}, "findApiKeyByHash");

    const rows = await db
      .select()
      .from(apiKeys)
      .where(
        and(
          eq(apiKeys.keyHash, keyHash),
          isNull(apiKeys.revokedAt)
        )
      )
      .limit(1);

    return rows[0] ? mapApiKey(rows[0]) : null;
  },

  /**
   * Find a single API key by id and tenantId.
   */
  async findById(tenantId: string, id: string): Promise<ApiKey | null> {
    log.info({ tenantId, id }, "findById");

    const rows = await db
      .select()
      .from(apiKeys)
      .where(
        and(
          eq(apiKeys.id, id),
          eq(apiKeys.tenantId, tenantId)
        )
      )
      .limit(1);

    return rows[0] ? mapApiKey(rows[0]) : null;
  },

  /**
   * Soft-delete an API key by setting revokedAt.
   */
  async revokeApiKey(tenantId: string, id: string): Promise<void> {
    log.info({ tenantId, id }, "revokeApiKey");

    const rows = await db
      .update(apiKeys)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(apiKeys.id, id),
          eq(apiKeys.tenantId, tenantId)
        )
      )
      .returning({ id: apiKeys.id });

    if (rows.length === 0) {
      throw new NotFoundError("ApiKey", id);
    }
  },

  /**
   * Bump the lastUsedAt + usageCount for an API key.
   */
  async updateLastUsed(id: string): Promise<void> {
    log.info({ id }, "updateLastUsed");

    await db
      .update(apiKeys)
      .set({
        lastUsedAt: new Date(),
        usageCount: (await db
          .select({ usageCount: apiKeys.usageCount })
          .from(apiKeys)
          .where(eq(apiKeys.id, id))
          .limit(1)
          .then((r) => (r[0]?.usageCount ?? 0) + 1)),
      })
      .where(eq(apiKeys.id, id));
  },
};
