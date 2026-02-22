import { z } from "zod";
import { redis } from "@/shared/redis";
import { logger } from "@/shared/logger";
import { NotFoundError } from "@/shared/errors";
import type { Context } from "@/shared/trpc";
import { tenantRepository } from "./tenant.repository";
import { platformRepository } from "@/modules/platform/platform.repository";
import type {
  OrganizationSettings,
  TenantModule,
  VenueRecord,
} from "./tenant.types";
import type {
  updateOrganizationSettingsSchema,
  updateModuleConfigSchema,
  createVenueSchema,
  updateVenueSchema,
} from "./tenant.schemas";

const log = logger.child({ module: "tenant.service" });

export const tenantService = {

  // ---------------------------------------------------------------------------
  // Organization Settings
  // ---------------------------------------------------------------------------

  async getSettings(ctx: Context): Promise<OrganizationSettings | null> {
    log.info({ tenantId: ctx.tenantId }, "getSettings");
    return tenantRepository.getSettings(ctx.tenantId);
  },

  async getPublicSettings(slug: string): Promise<OrganizationSettings | null> {
    log.info({ slug }, "getPublicSettings");
    // Get tenant ID from slug first
    const tenant = await platformRepository.getTenantBySlug(slug);
    if (!tenant) {
      throw new NotFoundError("Tenant", slug);
    }
    return tenantRepository.getSettings(tenant.id);
  },

  async updateSettings(
    ctx: Context,
    input: z.infer<typeof updateOrganizationSettingsSchema>
  ): Promise<OrganizationSettings> {
    log.info({ tenantId: ctx.tenantId }, "updateSettings");

    const result = await tenantRepository.upsertSettings(ctx.tenantId, input);

    // Invalidate Redis cache after update
    await redis.del(`tenant:settings:${ctx.tenantId}`);

    log.info({ tenantId: ctx.tenantId }, "Tenant settings updated");
    return result;
  },

  // ---------------------------------------------------------------------------
  // Module gating
  // ---------------------------------------------------------------------------

  async isModuleEnabled(
    tenantId: string,
    moduleSlug: string
  ): Promise<boolean> {
    const cacheKey = `tenant:modules:${tenantId}`;
    const cached = await redis.get<Record<string, boolean>>(cacheKey);

    if (cached) {
      return cached[moduleSlug] ?? false;
    }

    // Fall back to DB
    const result = await tenantRepository.isModuleEnabled(tenantId, moduleSlug);

    // Cache the full module map for this tenant
    const modules = await tenantRepository.listModules(tenantId);
    const moduleMap = Object.fromEntries(
      modules.map((m) => [m.moduleSlug, m.isEnabled])
    );
    await redis.set(cacheKey, moduleMap, { ex: 300 });

    return result;
  },

  // ---------------------------------------------------------------------------
  // Modules
  // ---------------------------------------------------------------------------

  async listModules(ctx: Context): Promise<TenantModule[]> {
    log.info({ tenantId: ctx.tenantId }, "listModules");
    return tenantRepository.listModules(ctx.tenantId);
  },

  async toggleModule(
    ctx: Context,
    moduleSlug: string,
    isEnabled: boolean
  ): Promise<void> {
    log.info({ tenantId: ctx.tenantId, moduleSlug, isEnabled }, "toggleModule");

    await tenantRepository.toggleModule(ctx.tenantId, moduleSlug, isEnabled);

    // Invalidate Redis module cache
    await redis.del(`tenant:modules:${ctx.tenantId}`);

    log.info(
      { tenantId: ctx.tenantId, moduleSlug, isEnabled },
      "Module toggled"
    );
  },

  async updateModuleConfig(
    ctx: Context,
    input: z.infer<typeof updateModuleConfigSchema>
  ): Promise<void> {
    log.info(
      { tenantId: ctx.tenantId, moduleKey: input.moduleKey },
      "updateModuleConfig"
    );

    await tenantRepository.updateModuleConfig(
      ctx.tenantId,
      input.moduleKey,
      input.config
    );

    log.info(
      { tenantId: ctx.tenantId, moduleKey: input.moduleKey },
      "Module config updated"
    );
  },

  // ---------------------------------------------------------------------------
  // Venues
  // ---------------------------------------------------------------------------

  async listVenues(ctx: Context): Promise<VenueRecord[]> {
    log.info({ tenantId: ctx.tenantId }, "listVenues");
    return tenantRepository.listVenues(ctx.tenantId);
  },

  async createVenue(
    ctx: Context,
    input: z.infer<typeof createVenueSchema>
  ): Promise<VenueRecord> {
    log.info({ tenantId: ctx.tenantId, name: input.name }, "createVenue");
    return tenantRepository.createVenue(ctx.tenantId, {
      name: input.name,
      address: input.address ?? null,
      phone: input.phone ?? null,
      email: input.email ?? null,
      isActive: input.isActive,
    });
  },

  async updateVenue(
    ctx: Context,
    venueId: string,
    input: z.infer<typeof updateVenueSchema>
  ): Promise<VenueRecord> {
    log.info({ tenantId: ctx.tenantId, venueId }, "updateVenue");
    return tenantRepository.updateVenue(ctx.tenantId, venueId, {
      name: input.name,
      address: input.address,
      phone: input.phone,
      email: input.email,
      isActive: input.isActive,
    });
  },

  async deleteVenue(ctx: Context, venueId: string): Promise<void> {
    log.info({ tenantId: ctx.tenantId, venueId }, "deleteVenue");
    await tenantRepository.deleteVenue(ctx.tenantId, venueId);
  },

  // ---------------------------------------------------------------------------
  // Billing / Plan
  // ---------------------------------------------------------------------------

  async getPlan(
    ctx: Context
  ): Promise<{ plan: string; status: string; trialEndsAt?: Date }> {
    log.info({ tenantId: ctx.tenantId }, "getPlan");

    const tenant = await platformRepository.getTenant(ctx.tenantId);
    if (!tenant) {
      throw new NotFoundError("Tenant", ctx.tenantId);
    }

    return {
      plan: tenant.plan,
      status: tenant.status,
      trialEndsAt: tenant.trialEndsAt ?? undefined,
    };
  },

  async getUsage(
    ctx: Context
  ): Promise<{ bookingCount: number; staffCount: number }> {
    log.info({ tenantId: ctx.tenantId }, "getUsage");

    return tenantRepository.getUsageCounts(ctx.tenantId);
  },
};
