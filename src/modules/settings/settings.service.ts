import { createHash, randomBytes } from "crypto";
import { logger } from "@/shared/logger";
import { NotFoundError } from "@/shared/errors";
import { auditLog } from "@/shared/audit";
import { moduleRegistry } from "@/shared/module-system/register-all";
import type { Context } from "@/shared/trpc";
import { settingsRepository } from "./settings.repository";
import type { ApiKey, ApiKeyWithSecret, ModuleTab } from "./settings.types";

const log = logger.child({ module: "settings.service" });

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Generate a new API key string with a recognizable prefix.
 * Format: `ih_live_<32 random hex bytes>` (72 chars total).
 */
function generateApiKey(): string {
  const raw = randomBytes(32).toString("hex");
  return `ih_live_${raw}`;
}

/**
 * SHA-256 hash of the raw API key - this is what gets stored in the DB.
 */
function hashApiKey(rawKey: string): string {
  return createHash("sha256").update(rawKey).digest("hex");
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export const settingsService = {
  // -------------------------------------------------------------------------
  // API Key lifecycle
  // -------------------------------------------------------------------------

  /**
   * Create a new API key. Returns the raw key exactly once - it is never
   * stored or retrievable after this call.
   */
  async createApiKey(
    ctx: Context,
    input: { name: string; scopes?: string[]; expiresAt?: Date }
  ): Promise<ApiKeyWithSecret> {
    const actorId = ctx.user?.id ?? "system";
    log.info({ tenantId: ctx.tenantId, name: input.name }, "createApiKey");

    const rawKey = generateApiKey();
    const keyHash = hashApiKey(rawKey);
    const keyPrefix = rawKey.slice(0, 12); // "ih_live_XXXX"

    const apiKey = await settingsRepository.createApiKey(
      ctx.tenantId,
      input.name,
      keyHash,
      keyPrefix,
      {
        scopes: input.scopes ?? null,
        expiresAt: input.expiresAt ?? null,
        createdBy: actorId,
      }
    );

    await auditLog({
      tenantId: ctx.tenantId,
      actorId,
      action: "created",
      resourceType: "ApiKey",
      resourceId: apiKey.id,
      resourceName: input.name,
    });

    log.info(
      { tenantId: ctx.tenantId, apiKeyId: apiKey.id },
      "API key created"
    );

    return { ...apiKey, rawKey };
  },

  /**
   * List all active (non-revoked) API keys for the tenant.
   * Never exposes the hash or the raw key.
   */
  async listApiKeys(ctx: Context): Promise<ApiKey[]> {
    log.info({ tenantId: ctx.tenantId }, "listApiKeys");
    return settingsRepository.listApiKeys(ctx.tenantId);
  },

  /**
   * Revoke (soft-delete) an API key.
   */
  async revokeApiKey(ctx: Context, id: string): Promise<void> {
    const actorId = ctx.user?.id ?? "system";
    log.info({ tenantId: ctx.tenantId, apiKeyId: id }, "revokeApiKey");

    // Verify the key exists and belongs to the tenant
    const existing = await settingsRepository.findById(ctx.tenantId, id);
    if (!existing) {
      throw new NotFoundError("ApiKey", id);
    }

    await settingsRepository.revokeApiKey(ctx.tenantId, id);

    await auditLog({
      tenantId: ctx.tenantId,
      actorId,
      action: "deleted",
      resourceType: "ApiKey",
      resourceId: id,
      resourceName: existing.name,
    });

    log.info(
      { tenantId: ctx.tenantId, apiKeyId: id },
      "API key revoked"
    );
  },

  // -------------------------------------------------------------------------
  // Module tabs - registry-driven discovery
  // -------------------------------------------------------------------------

  /**
   * Return the settings tabs for all modules that are enabled for this tenant
   * and have a `settingsTab` defined in their manifest.
   */
  getModuleTabs(enabledSlugs: string[]): ModuleTab[] {
    const manifests = moduleRegistry.getEnabledManifests(enabledSlugs);

    return manifests
      .filter((m) => m.settingsTab != null)
      .map((m) => ({
        slug: m.settingsTab!.slug,
        label: m.settingsTab!.label,
        icon: m.settingsTab!.icon,
        section: m.settingsTab!.section,
      }));
  },
};
