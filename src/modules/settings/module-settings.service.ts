import { eq, and } from 'drizzle-orm'
import { db } from '@/shared/db'
import { modules, moduleSettings, tenantModuleSettings } from '@/shared/db/schema'
import { logger } from '@/shared/logger'
import { NotFoundError, BadRequestError } from '@/shared/errors'
import { moduleRegistry } from '@/shared/module-system/register-all'

const log = logger.child({ module: 'module-settings.service' })

export const moduleSettingsService = {
  /**
   * Get effective settings for a module, merging tenant overrides with manifest defaults.
   */
  async getModuleSettings(
    tenantId: string,
    moduleSlug: string
  ): Promise<Record<string, unknown>> {
    const manifest = moduleRegistry.getManifest(moduleSlug)
    if (!manifest?.settingsDefinitions?.length) {
      return {}
    }

    // Build defaults from manifest
    const defaults: Record<string, unknown> = {}
    for (const def of manifest.settingsDefinitions) {
      defaults[def.key] = def.defaultValue
    }

    // Look up module ID
    const [mod] = await db
      .select({ id: modules.id })
      .from(modules)
      .where(eq(modules.slug, moduleSlug))
      .limit(1)

    if (!mod) return defaults

    // Get tenant overrides
    const overrides = await db
      .select({ settingKey: tenantModuleSettings.settingKey, value: tenantModuleSettings.value })
      .from(tenantModuleSettings)
      .where(
        and(
          eq(tenantModuleSettings.tenantId, tenantId),
          eq(tenantModuleSettings.moduleId, mod.id)
        )
      )

    // Merge: overrides win
    const result = { ...defaults }
    for (const override of overrides) {
      if (override.settingKey in defaults) {
        result[override.settingKey] = override.value
      }
    }

    return result
  },

  /**
   * Update a single module setting for a tenant.
   */
  async updateModuleSetting(
    tenantId: string,
    moduleSlug: string,
    key: string,
    value: unknown
  ): Promise<void> {
    log.info({ tenantId, moduleSlug, key }, 'updateModuleSetting')

    const manifest = moduleRegistry.getManifest(moduleSlug)
    const definition = manifest?.settingsDefinitions?.find((d) => d.key === key)
    if (!definition) {
      throw new BadRequestError(`Unknown setting key '${key}' for module '${moduleSlug}'`)
    }

    // Basic type validation
    if (definition.type === 'number' && typeof value !== 'number') {
      throw new BadRequestError(`Setting '${key}' must be a number`)
    }
    if (definition.type === 'boolean' && typeof value !== 'boolean') {
      throw new BadRequestError(`Setting '${key}' must be a boolean`)
    }
    if (definition.type === 'text' && typeof value !== 'string') {
      throw new BadRequestError(`Setting '${key}' must be a string`)
    }

    // Look up module ID
    const [mod] = await db
      .select({ id: modules.id })
      .from(modules)
      .where(eq(modules.slug, moduleSlug))
      .limit(1)

    if (!mod) {
      throw new NotFoundError('Module', moduleSlug)
    }

    // Upsert tenant module setting
    const [existing] = await db
      .select({ id: tenantModuleSettings.id })
      .from(tenantModuleSettings)
      .where(
        and(
          eq(tenantModuleSettings.tenantId, tenantId),
          eq(tenantModuleSettings.moduleId, mod.id),
          eq(tenantModuleSettings.settingKey, key)
        )
      )
      .limit(1)

    if (existing) {
      await db
        .update(tenantModuleSettings)
        .set({ value, updatedAt: new Date() })
        .where(eq(tenantModuleSettings.id, existing.id))
    } else {
      await db.insert(tenantModuleSettings).values({
        id: crypto.randomUUID(),
        tenantId,
        moduleId: mod.id,
        settingKey: key,
        value,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    }

    log.info({ tenantId, moduleSlug, key }, 'Module setting updated')
  },

  /**
   * Seed module settings definitions from manifests to the moduleSettings table.
   * Called at startup to keep DB in sync with manifest declarations.
   */
  async seedModuleSettings(manifests: import('@/shared/module-system/types').ModuleManifest[]): Promise<void> {
    for (const manifest of manifests) {
      if (!manifest.settingsDefinitions?.length) continue

      // Find module ID by slug
      const [mod] = await db
        .select({ id: modules.id })
        .from(modules)
        .where(eq(modules.slug, manifest.slug))
        .limit(1)

      if (!mod) {
        log.warn({ slug: manifest.slug }, 'Module not found in DB, skipping settings seed')
        continue
      }

      for (const def of manifest.settingsDefinitions) {
        await db
          .insert(moduleSettings)
          .values({
            id: crypto.randomUUID(),
            moduleId: mod.id,
            key: def.key,
            label: def.label,
            type: def.type.toUpperCase() as any,
            defaultValue: def.defaultValue,
            options: def.options ?? null,
            validation: def.validation ?? null,
            category: def.category ?? null,
            order: def.order ?? 0,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .onConflictDoNothing()
      }

      log.info({ slug: manifest.slug, count: manifest.settingsDefinitions.length }, 'Module settings seeded')
    }
  },
}
