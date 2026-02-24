# Core Foundation Hardening — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix 6 architectural gaps in the core foundation so vertical modules can be safely re-enabled.

**Architecture:** Bottom-up schema first. All DB changes in one pass (Phase 1), then infrastructure code built on clean schema (Phase 2), then integration wiring (Phase 3). Greenfield project with DB access — no data migration needed.

**Tech Stack:** Drizzle ORM, postgres.js, Zod v4, tRPC 11, Inngest, Vitest, Pino

**Design Doc:** `docs/plans/2026-02-24-core-hardening-design.md`

---

## Phase 1: Schema Changes

### Task 1: Create staffProfiles table and remove staff columns from users

**Files:**
- Modify: `src/shared/db/schemas/auth.schema.ts:33-93`
- Modify: `src/shared/db/schema.ts` (add export)

**Step 1: Add staffProfiles table to auth.schema.ts**

After the `users` table definition (after line 93), add:

```typescript
export const staffProfiles = pgTable("staff_profiles", {
	userId: uuid().primaryKey().notNull(),
	tenantId: uuid().notNull(),
	bio: text(),
	jobTitle: text(),
	employeeType: employeeType(),
	staffStatus: staffStatus().default('ACTIVE').notNull(),
	startDate: timestamp({ precision: 3, mode: 'date' }),
	dayRate: numeric({ precision: 10, scale: 2 }),
	hourlyRate: numeric({ precision: 10, scale: 2 }),
	mileageRate: numeric({ precision: 10, scale: 4 }),
	bankAccountName: text(),
	bankSortCode: text(),
	bankAccountNumber: text(),
	homeLatitude: numeric('home_latitude', { precision: 9, scale: 6 }),
	homeLongitude: numeric('home_longitude', { precision: 9, scale: 6 }),
	lastAssignedAt: timestamp('last_assigned_at', { withTimezone: true, mode: 'date' }),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
}, (table) => [
	index("staff_profiles_tenantId_idx").on(table.tenantId),
	index("staff_profiles_staffStatus_idx").on(table.staffStatus),
	foreignKey({
		columns: [table.userId],
		foreignColumns: [users.id],
		name: "staff_profiles_userId_fkey"
	}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
		columns: [table.tenantId],
		foreignColumns: [tenants.id],
		name: "staff_profiles_tenantId_fkey"
	}).onUpdate("cascade").onDelete("cascade"),
])

export type StaffProfile = typeof staffProfiles.$inferSelect;
```

**Step 2: Remove staff columns from users table**

Remove these lines from the `users` table definition (lines 61-77):
- `bio`, `dayRate`, `employeeType`, `hourlyRate`, `isTeamMember`, `jobTitle`, `mileageRate`, `staffStatus`, `startDate`
- `bankAccountName`, `bankSortCode`, `bankAccountNumber`
- `lastAssignedAt`, `homeLatitude`, `homeLongitude`

The `users` table should now end with `workosUserId` and `isPlatformAdmin`.

**Step 3: Verify schema barrel exports staffProfiles**

The barrel `src/shared/db/schema.ts` already exports `* from "./schemas/auth.schema"`, so `staffProfiles` will be available automatically.

**Step 4: Commit**

```bash
git add src/shared/db/schemas/auth.schema.ts
git commit -m "schema: extract staff columns from users into staffProfiles table"
```

---

### Task 2: Remove booking/scheduling columns from organizationSettings

**Files:**
- Modify: `src/shared/db/schemas/shared.schema.ts:235-290`

**Step 1: Remove booking/scheduling columns**

Remove these lines from `organizationSettings` (lines 260-264, 275-280):
- `bookingWindowDays`, `minNoticeHours`, `bufferMinutes`, `allowSameDayBook`, `slotDurationMins`
- `availabilityMode`, `capacityMode`, `defaultSlotCapacity`, `slotApprovalEnabled`, `slotApprovalHours`, `capacityEnforcement`

Also remove the imports that are only used by these columns:
- Line 19: remove `availabilityMode` from the tenant.schema import (if only used here)
- Line 23: remove `capacityMode` import from scheduling.schema
- Line 24: remove `capacityEnforcementMode` import from resource-pool.schema

Check if these enums are used elsewhere before removing the imports.

**Step 2: Commit**

```bash
git add src/shared/db/schemas/shared.schema.ts
git commit -m "schema: remove booking/scheduling columns from organizationSettings"
```

---

### Task 3: Replace notification pgEnums with text columns

**Files:**
- Modify: `src/shared/db/schemas/notifications.schema.ts`

**Step 1: Remove messageTrigger and notificationType enum definitions**

Delete lines 26-27 (the `messageTrigger` and `notificationType` pgEnum declarations).

**Step 2: Change columns from enum to text**

In `messageTemplates`:
```typescript
// Before:
trigger: messageTrigger().notNull(),
// After:
trigger: text().notNull(),
```

In `sentMessages`:
```typescript
// Before:
trigger: messageTrigger(),
// After:
trigger: text(),
```

In `notifications`:
```typescript
// Before:
type: notificationType().notNull(),
// After:
type: text().notNull(),
```

Keep `messageChannel` and `messageStatus` enums — those are genuinely fixed sets.

**Step 3: Commit**

```bash
git add src/shared/db/schemas/notifications.schema.ts
git commit -m "schema: replace messageTrigger/notificationType enums with text columns"
```

---

### Task 4: Push schema changes to database

**Step 1: Run drizzle-kit push**

```bash
npx drizzle-kit push
```

This will apply all schema changes to the database. Since it's greenfield, expect clean output.

**Step 2: Verify schema is clean**

```bash
npx drizzle-kit check
```

**Step 3: Commit any generated migration files if drizzle-kit produces them**

---

## Phase 2: Infrastructure Code

### Task 5: Add new manifest type fields

**Files:**
- Modify: `src/shared/module-system/types.ts`

**Step 1: Add new interfaces and fields**

Add before `ModuleManifest`:

```typescript
export interface ModuleSettingDefinition {
  key: string
  label: string
  type: 'boolean' | 'number' | 'text' | 'select' | 'json'
  defaultValue: unknown
  options?: { label: string; value: string }[]
  validation?: { min?: number; max?: number; pattern?: string }
  category?: string
  order?: number
}

export interface NotificationTriggerDefinition {
  key: string
  label: string
  description: string
  defaultChannels: ('EMAIL' | 'SMS' | 'PUSH')[]
  variables: string[]
}
```

Add to `ModuleManifest` interface (after `auditResources`):

```typescript
  settingsDefinitions?: ModuleSettingDefinition[]
  notificationTriggers?: NotificationTriggerDefinition[]
```

**Step 2: Commit**

```bash
git add src/shared/module-system/types.ts
git commit -m "feat: add settingsDefinitions and notificationTriggers to ModuleManifest"
```

---

### Task 6: Create permission seeder

**Files:**
- Create: `src/shared/module-system/permission-seeder.ts`
- Create: `src/shared/module-system/__tests__/permission-seeder.test.ts`

**Step 1: Write the failing test**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/shared/db', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    delete: vi.fn(),
  },
}))

vi.mock('@/shared/logger', () => ({
  logger: {
    child: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
  },
}))

import { syncPermissions } from '../permission-seeder'
import { db } from '@/shared/db'
import type { ModuleManifest } from '../types'

function makeManifest(overrides: Partial<ModuleManifest> = {}): ModuleManifest {
  return {
    slug: 'test',
    name: 'Test',
    description: '',
    icon: 'Box',
    category: 'operations',
    dependencies: [],
    routes: [],
    sidebarItems: [],
    analyticsWidgets: [],
    permissions: [],
    eventsProduced: [],
    eventsConsumed: [],
    isCore: true,
    availability: 'standard',
    ...overrides,
  }
}

describe('syncPermissions', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('parses "resource:action" format correctly', async () => {
    const manifests = [
      makeManifest({ slug: 'booking', permissions: ['bookings:read', 'bookings:write'] }),
    ]

    // Mock existing DB permissions as empty
    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockResolvedValue([]),
    } as any)
    vi.mocked(db.insert).mockReturnValue({
      values: vi.fn().mockReturnValue({
        onConflictDoNothing: vi.fn().mockResolvedValue(undefined),
      }),
    } as any)
    vi.mocked(db.delete).mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    } as any)

    await syncPermissions(manifests)

    expect(db.insert).toHaveBeenCalled()
  })

  it('does nothing when manifests declare no permissions', async () => {
    const manifests = [makeManifest({ permissions: [] })]

    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockResolvedValue([]),
    } as any)

    await syncPermissions(manifests)

    expect(db.insert).not.toHaveBeenCalled()
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npx vitest run src/shared/module-system/__tests__/permission-seeder.test.ts
```

Expected: FAIL — `syncPermissions` does not exist yet.

**Step 3: Write the implementation**

```typescript
import { db } from '@/shared/db'
import { permissions } from '@/shared/db/schema'
import { logger } from '@/shared/logger'
import { eq, and, notInArray } from 'drizzle-orm'
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
```

**Step 4: Run test to verify it passes**

```bash
npx vitest run src/shared/module-system/__tests__/permission-seeder.test.ts
```

**Step 5: Commit**

```bash
git add src/shared/module-system/permission-seeder.ts src/shared/module-system/__tests__/permission-seeder.test.ts
git commit -m "feat: add permission seeder that syncs manifest permissions to DB"
```

---

### Task 7: Create notification trigger registry

**Files:**
- Create: `src/shared/module-system/notification-trigger-registry.ts`
- Create: `src/shared/module-system/__tests__/notification-trigger-registry.test.ts`

**Step 1: Write the failing test**

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { NotificationTriggerRegistry } from '../notification-trigger-registry'
import type { NotificationTriggerDefinition } from '../types'

const bookingTriggers: NotificationTriggerDefinition[] = [
  {
    key: 'booking.created',
    label: 'Booking Created',
    description: 'When a new booking is created',
    defaultChannels: ['EMAIL'],
    variables: ['customerName', 'bookingDate', 'serviceName'],
  },
  {
    key: 'booking.confirmed',
    label: 'Booking Confirmed',
    description: 'When a booking is confirmed',
    defaultChannels: ['EMAIL', 'SMS'],
    variables: ['customerName', 'bookingDate'],
  },
]

describe('NotificationTriggerRegistry', () => {
  let registry: NotificationTriggerRegistry

  beforeEach(() => {
    registry = new NotificationTriggerRegistry()
  })

  it('registers triggers for a module', () => {
    registry.register('booking', bookingTriggers)
    expect(registry.getAllTriggers()).toHaveLength(2)
  })

  it('retrieves a trigger by key', () => {
    registry.register('booking', bookingTriggers)
    const trigger = registry.getTrigger('booking.created')
    expect(trigger).not.toBeNull()
    expect(trigger!.label).toBe('Booking Created')
  })

  it('returns null for unknown trigger key', () => {
    expect(registry.getTrigger('nonexistent')).toBeNull()
  })

  it('returns triggers for a specific module', () => {
    registry.register('booking', bookingTriggers)
    registry.register('review', [
      { key: 'review.submitted', label: 'Review Submitted', description: '', defaultChannels: ['EMAIL'], variables: [] },
    ])

    expect(registry.getTriggersForModule('booking')).toHaveLength(2)
    expect(registry.getTriggersForModule('review')).toHaveLength(1)
  })

  it('returns available variables for a trigger', () => {
    registry.register('booking', bookingTriggers)
    expect(registry.getAvailableVariables('booking.created')).toEqual([
      'customerName', 'bookingDate', 'serviceName',
    ])
  })

  it('throws on duplicate trigger key', () => {
    registry.register('booking', bookingTriggers)
    expect(() =>
      registry.register('other', [{ key: 'booking.created', label: 'Dupe', description: '', defaultChannels: [], variables: [] }])
    ).toThrow()
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npx vitest run src/shared/module-system/__tests__/notification-trigger-registry.test.ts
```

**Step 3: Write the implementation**

```typescript
import type { NotificationTriggerDefinition } from './types'

interface RegisteredTrigger extends NotificationTriggerDefinition {
  moduleSlug: string
}

export class NotificationTriggerRegistry {
  private triggers = new Map<string, RegisteredTrigger>()
  private moduleIndex = new Map<string, string[]>()

  register(moduleSlug: string, triggers: NotificationTriggerDefinition[]): void {
    for (const trigger of triggers) {
      if (this.triggers.has(trigger.key)) {
        throw new Error(
          `Notification trigger '${trigger.key}' is already registered`
        )
      }
      this.triggers.set(trigger.key, { ...trigger, moduleSlug })
    }
    const keys = triggers.map((t) => t.key)
    this.moduleIndex.set(moduleSlug, [
      ...(this.moduleIndex.get(moduleSlug) ?? []),
      ...keys,
    ])
  }

  getTrigger(key: string): NotificationTriggerDefinition | null {
    return this.triggers.get(key) ?? null
  }

  getAllTriggers(): NotificationTriggerDefinition[] {
    return Array.from(this.triggers.values())
  }

  getTriggersForModule(moduleSlug: string): NotificationTriggerDefinition[] {
    const keys = this.moduleIndex.get(moduleSlug) ?? []
    return keys.map((k) => this.triggers.get(k)!).filter(Boolean)
  }

  getAvailableVariables(triggerKey: string): string[] {
    return this.triggers.get(triggerKey)?.variables ?? []
  }
}

export const notificationTriggerRegistry = new NotificationTriggerRegistry()
```

**Step 4: Run test to verify it passes**

```bash
npx vitest run src/shared/module-system/__tests__/notification-trigger-registry.test.ts
```

**Step 5: Commit**

```bash
git add src/shared/module-system/notification-trigger-registry.ts src/shared/module-system/__tests__/notification-trigger-registry.test.ts
git commit -m "feat: add notification trigger registry for module-declared triggers"
```

---

### Task 8: Create module settings service

**Files:**
- Create: `src/modules/settings/module-settings.service.ts`
- Create: `src/modules/settings/__tests__/module-settings.service.test.ts`

**Step 1: Write the failing test**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/shared/db', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
  },
}))

vi.mock('@/shared/logger', () => ({
  logger: {
    child: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
  },
}))

vi.mock('@/shared/module-system/register-all', () => ({
  moduleRegistry: {
    getManifest: vi.fn(),
    getAllManifests: vi.fn().mockReturnValue([]),
  },
}))

import { moduleSettingsService } from '../module-settings.service'
import { moduleRegistry } from '@/shared/module-system/register-all'
import type { ModuleManifest } from '@/shared/module-system/types'

const TENANT_ID = '00000000-0000-0000-0000-000000000001'
const MODULE_ID = '00000000-0000-0000-0000-000000000099'

describe('moduleSettingsService.getModuleSettings', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns default values when no tenant overrides exist', async () => {
    vi.mocked(moduleRegistry.getManifest).mockReturnValue({
      slug: 'booking',
      settingsDefinitions: [
        { key: 'bookingWindowDays', label: 'Booking Window', type: 'number', defaultValue: 30 },
        { key: 'allowSameDayBook', label: 'Same Day', type: 'boolean', defaultValue: false },
      ],
    } as unknown as ModuleManifest)

    // Mock: module exists in DB but no tenant overrides
    const { db } = await import('@/shared/db')
    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ id: MODULE_ID }]),
      }),
    } as any)

    const settings = await moduleSettingsService.getModuleSettings(TENANT_ID, 'booking')

    expect(settings).toEqual({
      bookingWindowDays: 30,
      allowSameDayBook: false,
    })
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npx vitest run src/modules/settings/__tests__/module-settings.service.test.ts
```

**Step 3: Write the implementation**

```typescript
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
```

**Step 4: Run test to verify it passes**

```bash
npx vitest run src/modules/settings/__tests__/module-settings.service.test.ts
```

**Step 5: Commit**

```bash
git add src/modules/settings/module-settings.service.ts src/modules/settings/__tests__/module-settings.service.test.ts
git commit -m "feat: add module settings service with manifest-driven defaults"
```

---

### Task 9: Audit logger transactional support + retention cron

**Files:**
- Modify: `src/shared/audit/audit-logger.ts`
- Create: `src/modules/audit/audit.events.ts`
- Create: `src/shared/audit/__tests__/audit-logger.test.ts`

**Step 1: Write the failing test for transactional audit**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockInsert = vi.fn().mockReturnValue({
  values: vi.fn().mockResolvedValue(undefined),
})

vi.mock('@/shared/db', () => ({
  db: {
    insert: mockInsert,
  },
}))

vi.mock('@/shared/logger', () => ({
  logger: {
    child: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
  },
}))

import { auditLog } from '../audit-logger'

describe('auditLog', () => {
  beforeEach(() => { vi.clearAllMocks() })

  const input = {
    tenantId: '00000000-0000-0000-0000-000000000001',
    actorId: '00000000-0000-0000-0000-000000000002',
    action: 'created' as const,
    resourceType: 'booking',
    resourceId: '00000000-0000-0000-0000-000000000003',
    resourceName: 'Booking #1',
  }

  it('uses default db when no transaction provided', async () => {
    await auditLog(input)
    expect(mockInsert).toHaveBeenCalled()
  })

  it('uses transaction when tx is provided', async () => {
    const txInsert = vi.fn().mockReturnValue({
      values: vi.fn().mockResolvedValue(undefined),
    })
    const tx = { insert: txInsert } as any

    await auditLog(input, tx)
    expect(txInsert).toHaveBeenCalled()
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('does not throw when insert fails (fire-and-forget without tx)', async () => {
    mockInsert.mockReturnValue({
      values: vi.fn().mockRejectedValue(new Error('DB error')),
    })

    await expect(auditLog(input)).resolves.toBeUndefined()
  })

  it('throws when insert fails with tx (transactional mode)', async () => {
    const txInsert = vi.fn().mockReturnValue({
      values: vi.fn().mockRejectedValue(new Error('DB error')),
    })
    const tx = { insert: txInsert } as any

    await expect(auditLog(input, tx)).rejects.toThrow('DB error')
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npx vitest run src/shared/audit/__tests__/audit-logger.test.ts
```

**Step 3: Update audit-logger.ts**

```typescript
import { db } from '@/shared/db'
import { auditLogs } from '@/shared/db/schema'
import { logger } from '@/shared/logger'

const log = logger.child({ module: 'audit-logger' })

export interface AuditLogInput {
  tenantId: string
  actorId: string
  action: 'created' | 'updated' | 'deleted'
  resourceType: string
  resourceId: string
  resourceName: string
  changes?: { field: string; before: unknown; after: unknown }[]
  metadata?: Record<string, unknown>
}

/**
 * Write an audit log entry.
 *
 * @param input  - Audit entry data
 * @param tx     - Optional Drizzle transaction. When provided, the audit entry
 *                 commits/rolls back with the business operation and errors propagate.
 *                 When omitted, falls back to fire-and-forget (errors are swallowed).
 */
export async function auditLog(input: AuditLogInput, tx?: { insert: typeof db.insert }): Promise<void> {
  const conn = tx ?? db

  const oldValues = input.changes
    ? Object.fromEntries(input.changes.map((c) => [c.field, c.before]))
    : null
  const newValues = input.changes
    ? Object.fromEntries(input.changes.map((c) => [c.field, c.after]))
    : null

  const doInsert = () =>
    conn.insert(auditLogs).values({
      id: crypto.randomUUID(),
      tenantId: input.tenantId,
      userId: input.actorId,
      action: input.action,
      entityType: input.resourceType,
      entityId: input.resourceId,
      oldValues,
      newValues,
      metadata: {
        resourceName: input.resourceName,
        ...input.metadata,
      },
      createdAt: new Date(),
    })

  if (tx) {
    // Transactional mode — let errors propagate to roll back the transaction
    await doInsert()
    log.info(
      { action: input.action, resourceType: input.resourceType, resourceId: input.resourceId },
      'Audit log entry written (transactional)'
    )
  } else {
    // Fire-and-forget — never break business logic
    try {
      await doInsert()
      log.info(
        { action: input.action, resourceType: input.resourceType, resourceId: input.resourceId },
        'Audit log entry written'
      )
    } catch (error) {
      log.error({ error, input }, 'Failed to write audit log entry')
    }
  }
}
```

**Step 4: Create audit retention cron (audit.events.ts)**

```typescript
import { inngest } from '@/shared/inngest'
import { db } from '@/shared/db'
import { auditLogs } from '@/shared/db/schema'
import { lt } from 'drizzle-orm'
import { logger } from '@/shared/logger'

const log = logger.child({ module: 'audit.events' })

const RETENTION_DAYS = 365

export const auditRetentionCleanup = inngest.createFunction(
  { id: 'audit/retention-cleanup' },
  { cron: '0 2 * * *' },
  async ({ step }) => {
    const deleted = await step.run('delete-old-entries', async () => {
      const cutoff = new Date()
      cutoff.setDate(cutoff.getDate() - RETENTION_DAYS)

      const result = await db
        .delete(auditLogs)
        .where(lt(auditLogs.createdAt, cutoff))

      log.info({ cutoffDate: cutoff.toISOString() }, 'Audit retention cleanup complete')
      return { cutoffDate: cutoff.toISOString() }
    })

    return deleted
  }
)
```

**Step 5: Run tests**

```bash
npx vitest run src/shared/audit/__tests__/audit-logger.test.ts
```

**Step 6: Commit**

```bash
git add src/shared/audit/audit-logger.ts src/shared/audit/__tests__/audit-logger.test.ts src/modules/audit/audit.events.ts
git commit -m "feat: add transactional audit logging + retention cron"
```

---

## Phase 3: Integration Wiring

### Task 10: Move search provider registration to register-all.ts

**Files:**
- Modify: `src/modules/search/search.service.ts:1-11`
- Modify: `src/shared/module-system/register-all.ts`

**Step 1: Remove provider imports from search.service.ts**

Remove lines 3-4 and 10-11 from `search.service.ts`:

```typescript
// REMOVE these lines:
import { customerSearchProvider } from '@/modules/customer/customer.search-provider'
import { bookingSearchProvider } from '@/modules/booking/booking.search-provider'

// REMOVE these lines:
searchProviderRegistry.register(customerSearchProvider)
searchProviderRegistry.register(bookingSearchProvider)
```

Also add a manifest-check safety filter to `globalSearch`. In the providers filter step (around line 33), add:

```typescript
// Filter by server-level manifest registration
providers = providers.filter((p) => moduleRegistry.getManifest(p.moduleSlug) !== null)
```

This requires importing `moduleRegistry`:

```typescript
import { moduleRegistry } from '@/shared/module-system/register-all'
```

**Step 2: Add search provider registration to register-all.ts**

Update the commented-out feature module section to show the pattern:

```typescript
// --- Vertical / feature modules (DISABLED) ---
// When re-enabling a module, also register its search provider if it has one:
// moduleRegistry.register(customerManifest)
// searchProviderRegistry.register(customerSearchProvider)
// moduleRegistry.register(bookingManifest)
// searchProviderRegistry.register(bookingSearchProvider)
```

Add the import for `searchProviderRegistry` at the top:

```typescript
import { searchProviderRegistry } from './search-registry'
```

**Step 3: Update the search service test**

The mock in `search.service.test.ts` already mocks the `searchProviderRegistry` directly, so no test changes needed for the service. But the test needs to not import the provider registration side effects. Since we removed those from search.service.ts, the test should still work.

Run existing tests:

```bash
npx vitest run src/modules/search/__tests__/search.service.test.ts
```

**Step 4: Commit**

```bash
git add src/modules/search/search.service.ts src/shared/module-system/register-all.ts
git commit -m "refactor: move search provider registration to register-all.ts"
```

---

### Task 11: Wire up startup hooks

**Files:**
- Modify: `src/shared/module-system/register-all.ts`

**Step 1: Add startup hooks after moduleRegistry.validate()**

At the end of `register-all.ts`, after `moduleRegistry.validate()`, add the startup sync functions. These are async so they need to be wrapped in a startup function:

```typescript
import { syncPermissions } from './permission-seeder'
import { notificationTriggerRegistry } from './notification-trigger-registry'

// ... existing code ...

moduleRegistry.validate()

// --- Startup hooks ---
// Register notification triggers from manifests
for (const manifest of moduleRegistry.getAllManifests()) {
  if (manifest.notificationTriggers?.length) {
    notificationTriggerRegistry.register(manifest.slug, manifest.notificationTriggers)
  }
}

// Async startup tasks (permission sync, settings seed) run on first request
// or via an explicit init() call. They need DB access which isn't available
// at module load time in all environments.
let startupDone = false

export async function initStartupTasks(): Promise<void> {
  if (startupDone) return
  startupDone = true

  await syncPermissions(moduleRegistry.getAllManifests())

  // Module settings seeding requires the modules table to be populated.
  // Import lazily to avoid circular deps.
  const { moduleSettingsService } = await import('@/modules/settings/module-settings.service')
  await moduleSettingsService.seedModuleSettings(moduleRegistry.getAllManifests())
}
```

**Step 2: Call initStartupTasks from the tRPC context or API route**

Find where the app initializes (likely the tRPC context creation or the Inngest route handler) and call `initStartupTasks()` once. This is environment-specific — check the app's entry points.

A pragmatic approach: call it in the tRPC `createContext` with a guard:

```typescript
// In the context creation or a middleware:
import { initStartupTasks } from '@/shared/module-system/register-all'
// Call once on first request
await initStartupTasks()
```

**Step 3: Commit**

```bash
git add src/shared/module-system/register-all.ts
git commit -m "feat: wire up permission sync, notification triggers, and settings seed at startup"
```

---

### Task 12: Update code references to removed schema columns

This task handles all the files that reference the removed columns. The implementing agent should search for and update each reference.

**Files to update (staff columns):**

Backend:
- `src/modules/team/team.types.ts` — Update team member type to join users + staffProfiles
- `src/modules/team/team.repository.ts` — Update queries to join staffProfiles
- `src/modules/team/team.schemas.ts` — Update Zod schemas for staff fields
- `src/modules/team/team.service.ts` — Update any direct column references
- `src/modules/team/team.router.ts` — Update input/output shapes
- `src/modules/auth/router.ts:26` — Remove `isTeamMember` reference; check staffProfiles existence instead
- `src/shared/__tests__/permissions.test.ts` — Remove staff fields from mock User objects
- `src/shared/__tests__/auth.test.ts` — Remove staff fields from mock User objects
- `src/modules/auth/rbac.test.ts` — Remove staff fields from mock User objects

Frontend (update type references):
- `src/components/team/` — All team components read from the team member type which now comes from joined data
- `src/app/admin/team/page.tsx` — Uses `employeeType` filter

**Files to update (booking org settings columns):**

- `src/modules/tenant/tenant.types.ts` — Remove booking fields from OrganizationSettings type
- `src/modules/tenant/tenant.schemas.ts` — Remove booking fields from update schema
- `src/modules/tenant/tenant.repository.ts` — Remove booking fields from queries
- `src/modules/tenant/__tests__/tenant.service.test.ts` — Update test fixtures

**Files to update (notification enums):**

- `src/modules/notification/notification.types.ts` — If it references the enum types
- `src/modules/notification/notification.repository.ts` — If it uses enum values
- `src/modules/notification/notification.service.ts` — Update trigger type references

**Approach:** The implementing agent should:
1. Run `npx tsc --noEmit` to find all type errors
2. Fix each error by updating the reference to use the new schema/types
3. Repeat until tsc passes clean

**Commit after each logical group of fixes.**

---

### Task 13: Tests for new infrastructure

**Files:**
- Verify: `src/shared/module-system/__tests__/permission-seeder.test.ts`
- Verify: `src/shared/module-system/__tests__/notification-trigger-registry.test.ts`
- Verify: `src/modules/settings/__tests__/module-settings.service.test.ts`
- Verify: `src/shared/audit/__tests__/audit-logger.test.ts`
- Run all existing tests to confirm nothing is broken

**Step 1: Run the full test suite**

```bash
npx vitest run
```

**Step 2: Fix any failing tests**

Existing tests that reference removed columns will need their mock data updated (remove staff fields from User mocks, remove booking fields from settings mocks).

**Step 3: Commit**

```bash
git commit -m "test: fix all tests for core hardening schema changes"
```

---

### Task 14: Verification

**Step 1: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

**Step 2: Build**

```bash
NEXT_PHASE=phase-production-build npm run build
```

Expected: Build succeeds.

**Step 3: Full test suite**

```bash
npx vitest run
```

Expected: All tests pass (224+ tests).

**Step 4: Final commit if needed**

---

## Summary

| Phase | Tasks | What happens |
|-------|-------|-------------|
| 1 (Schema) | 1-4 | staffProfiles table, org settings cleanup, notification text columns, DB push |
| 2 (Infrastructure) | 5-9 | Manifest types, permission seeder, trigger registry, settings service, audit tx |
| 3 (Wiring) | 10-14 | Search provider co-location, startup hooks, reference updates, tests, verification |

**Total new files:** 6 (permission-seeder, notification-trigger-registry, module-settings-service, audit-events, + 3 test files)
**Modified files:** ~20 (schema files, manifest types, register-all, search service, audit logger, team module, tenant module, notification module, test fixtures)
