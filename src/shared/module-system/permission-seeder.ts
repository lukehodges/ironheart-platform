import { db } from '@/shared/db'
import { permissions } from '@/shared/db/schema'
import { logger } from '@/shared/logger'
import { eq } from 'drizzle-orm'
import type { ModuleManifest } from './types'

const log = logger.child({ module: 'permission-seeder' })

interface ParsedPermission {
  resource: string
  action: string
}

function parsePermission(perm: string): ParsedPermission | null {
  const [resource, action] = perm.split(':')
  if (!resource || !action) {
    log.warn({ perm }, 'Invalid permission format, expected "resource:action"')
    return null
  }
  return { resource, action }
}

export async function syncPermissions(manifests: ModuleManifest[]): Promise<void> {
  // 1. Collect all declared permissions from manifests
  const declared: ParsedPermission[] = []
  for (const manifest of manifests) {
    for (const perm of manifest.permissions) {
      const parsed = parsePermission(perm)
      if (parsed) declared.push(parsed)
    }
  }

  if (declared.length === 0) {
    log.info('No permissions declared in manifests, skipping sync')
    return
  }

  // 2. Fetch existing permissions from DB
  const existing = await db.select().from(permissions)

  // 3. Find permissions to insert (declared but not in DB)
  const existingSet = new Set(existing.map((p) => `${p.resource}:${p.action}`))
  const toInsert = declared.filter((p) => !existingSet.has(`${p.resource}:${p.action}`))

  // 4. Find orphaned permissions (in DB but not declared)
  const declaredSet = new Set(declared.map((p) => `${p.resource}:${p.action}`))
  const orphanIds = existing
    .filter((p) => !declaredSet.has(`${p.resource}:${p.action}`))
    .map((p) => p.id)

  // 5. Insert new permissions
  if (toInsert.length > 0) {
    await db.insert(permissions).values(
      toInsert.map((p) => ({
        id: crypto.randomUUID(),
        resource: p.resource,
        action: p.action,
        description: null,
      }))
    ).onConflictDoNothing()

    log.info({ count: toInsert.length }, 'Permissions seeded')
  }

  // 6. Delete orphaned permissions (cascade handles rolePermissions)
  if (orphanIds.length > 0) {
    for (const id of orphanIds) {
      await db.delete(permissions).where(eq(permissions.id, id))
    }
    log.info({ count: orphanIds.length }, 'Orphaned permissions removed')
  }
}
