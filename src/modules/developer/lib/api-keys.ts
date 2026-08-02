/**
 * API-key minting + validation for the platform's HTTP MCP server (`/api/mcp`).
 *
 * Keys look like `ihk_<48 hex>`. Only the SHA-256 hash is stored (`keyHash`,
 * unique); the raw token is shown exactly once at mint time. `scopes` are the
 * module names the key may call (e.g. ["outreach"]); a scope of "*" = all.
 */
import crypto from "node:crypto"
import { db } from "@/shared/db"
import { apiKeys } from "@/shared/db/schemas/auth.schema"
import { and, eq, isNull, sql } from "drizzle-orm"
import { logger } from "@/shared/logger"

const log = logger.child({ module: "developer.api-keys" })

export function hashKey(raw: string): string {
  return crypto.createHash("sha256").update(raw, "utf8").digest("hex")
}

export interface MintApiKeyInput {
  tenantId: string
  name: string
  scopes: string[]
  rateLimit?: number
  /** ISO string or Date; null/undefined = never expires. */
  expiresAt?: string | Date | null
  createdBy?: string | null
}

/** Create a key and return the RAW token once (never recoverable afterwards). */
export async function mintApiKey(input: MintApiKeyInput): Promise<{ id: string; token: string; keyPrefix: string }> {
  const token = "ihk_" + crypto.randomBytes(24).toString("hex")
  const keyPrefix = token.slice(0, 12) // "ihk_" + 8 hex — safe to display/log
  const expiresAt = input.expiresAt ? new Date(input.expiresAt) : null

  const [row] = await db
    .insert(apiKeys)
    .values({
      id: crypto.randomUUID(),
      tenantId: input.tenantId,
      name: input.name,
      keyHash: hashKey(token),
      keyPrefix,
      scopes: input.scopes,
      rateLimit: input.rateLimit ?? 600,
      expiresAt,
      createdBy: input.createdBy ?? null,
    })
    .returning({ id: apiKeys.id })

  log.info({ tenantId: input.tenantId, keyPrefix, scopes: input.scopes }, "API key minted")
  return { id: row!.id, token, keyPrefix }
}

export interface ValidatedApiKey {
  id: string
  tenantId: string
  scopes: string[]
  rateLimit: number
}

/** Resolve a raw token to a live key, or null if unknown/revoked/expired. */
export async function validateApiKey(raw: string): Promise<ValidatedApiKey | null> {
  if (!raw || !raw.startsWith("ihk_")) return null
  const [row] = await db
    .select()
    .from(apiKeys)
    .where(and(eq(apiKeys.keyHash, hashKey(raw)), isNull(apiKeys.revokedAt)))
    .limit(1)
  if (!row) return null
  if (row.expiresAt && row.expiresAt.getTime() < Date.now()) return null

  // Touch usage — fire-and-forget, never block the request.
  void db
    .update(apiKeys)
    .set({ lastUsedAt: new Date(), usageCount: sql`${apiKeys.usageCount} + 1` })
    .where(eq(apiKeys.id, row.id))
    .catch((e) => log.warn({ err: e, keyPrefix: row.keyPrefix }, "usage touch failed"))

  return { id: row.id, tenantId: row.tenantId, scopes: row.scopes ?? [], rateLimit: row.rateLimit }
}
