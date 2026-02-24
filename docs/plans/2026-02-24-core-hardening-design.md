# Core Foundation Hardening — Design

**Date:** 2026-02-24
**Approach:** Bottom-up schema first (Approach A)
**Scope:** All 6 gaps from the core foundation audit
**Constraints:** Greenfield, no users, full DB access, breaking schema changes are free

## Overview

Six architectural gaps identified in the core foundation audit. This design addresses all of them in a single hardening effort, starting with schema changes and building infrastructure code on clean foundations.

## Gap 1: Users Table Normalization

### Problem
The `users` table has ~15 team/staff-specific columns mixed in: `dayRate`, `hourlyRate`, `mileageRate`, `employeeType`, `staffStatus`, `jobTitle`, `startDate`, `bankAccountName`, `bankSortCode`, `bankAccountNumber`, `homeLatitude`, `homeLongitude`, `lastAssignedAt`, `bio`, `isTeamMember`.

### Design
Extract staff columns to a new `staffProfiles` table (1:1 with users, owned by the team module):

```
staffProfiles
  userId            uuid PK, FK -> users.id
  tenantId          uuid FK -> tenants.id
  bio               text
  jobTitle          text
  employeeType      employeeType enum
  staffStatus       staffStatus enum
  startDate         timestamp
  dayRate           numeric
  hourlyRate        numeric
  mileageRate       numeric
  bankAccountName   text
  bankSortCode      text
  bankAccountNumber text
  homeLatitude      numeric
  homeLongitude     numeric
  lastAssignedAt    timestamp
  createdAt         timestamp
  updatedAt         timestamp
```

The `users` table retains: identity, auth, contact, localization, user type/status, platform admin flag.

### Impact
- Team module queries join `users` + `staffProfiles`
- Auth module stays clean — no staff concepts
- `isTeamMember` becomes implicit: user has a `staffProfiles` row = is team member

## Gap 2: Organization Settings Extraction

### Problem
`organizationSettings` has 8+ booking/scheduling-specific columns: `bookingWindowDays`, `minNoticeHours`, `bufferMinutes`, `allowSameDayBook`, `slotDurationMins`, `availabilityMode`, `capacityMode`, `defaultSlotCapacity`, `slotApprovalEnabled`, `slotApprovalHours`, `capacityEnforcement`.

### Design
Remove booking/scheduling columns from `organizationSettings`. These become module settings owned by booking/scheduling modules via the existing `moduleSettings` + `tenantModuleSettings` tables.

**Stays in `organizationSettings`:** Business identity, contact, localization, branding, notification sender config, custom labels. All genuinely tenant-wide, module-agnostic.

## Gap 3: Notification Trigger Decoupling

### Problem
`messageTrigger` is a hardcoded pgEnum with 12 booking/payment values. New modules can't add triggers without a DB migration.

### Design
- Replace `messageTrigger` pgEnum with `text` column on `messageTemplates` and `sentMessages`
- Replace `notificationType` pgEnum with `text` column on `notifications`
- Keep `MessageChannel` enum (EMAIL/SMS/PUSH) — genuinely fixed set
- Drop the `MessageTrigger` and `NotificationType` pgEnums entirely

Modules declare triggers in manifests via new `notificationTriggers` field:

```typescript
interface NotificationTriggerDefinition {
  key: string                              // "booking.created"
  label: string                            // "Booking Created"
  description: string                      // Human-readable
  defaultChannels: ('EMAIL' | 'SMS' | 'PUSH')[]
  variables: string[]                      // Template variables: ["customerName", "bookingDate"]
}
```

A `NotificationTriggerRegistry` validates trigger keys at runtime. Template editor UI queries available triggers from the registry.

## Gap 4: Permission Auto-Seeding

### Problem
Manifests declare permissions but nothing writes them to the `permissions` table. MEMBER users can never be assigned permissions that don't exist in the DB.

### Design
A `syncPermissions()` function in `src/shared/module-system/permission-seeder.ts`:

1. Reads all registered manifests
2. Parses permission strings (e.g. `"bookings:read"` -> `{ resource: "bookings", action: "read" }`)
3. Upserts into `permissions` table (`ON CONFLICT DO NOTHING`)
4. Deletes orphaned permissions (DB permissions not declared by any manifest)

**Runs at:** Application startup, after `moduleRegistry.validate()`
**Idempotent:** Safe on every cold start
**Orphan cleanup:** Aggressive (greenfield) — deletes orphans + cascades `rolePermissions`

**Files:**
- New: `src/shared/module-system/permission-seeder.ts`
- Modified: `src/shared/module-system/register-all.ts`

## Gap 5: Search Auto-Discovery

### Problem
Search providers are manually imported in `search.service.ts`. Adding a new searchable module requires editing a shared file.

### Design
Co-locate search provider registration with manifest registration in `register-all.ts`:

```typescript
// register-all.ts (server-only)
moduleRegistry.register(customerManifest)
searchProviderRegistry.register(customerSearchProvider)
```

Each module that supports search exports a `searchProvider` from its barrel `index.ts`. `search.service.ts` no longer imports or registers any providers — it just queries the registry.

**Two-level gating preserved:**
1. **Server-level:** If manifest isn't registered, search provider isn't either (co-located)
2. **Tenant-level:** `globalSearch()` already filters by `isModuleEnabled()` per tenant

**Safety check added:** If a provider's `moduleSlug` doesn't match a registered manifest, the search service skips it.

**Files:**
- Modified: `search.service.ts` — remove manual provider imports
- Modified: `register-all.ts` — add search provider imports alongside manifests
- Each module's `index.ts` — export search provider

## Gap 6: Audit Improvements

### Problem
Audit logging is fire-and-forget (non-transactional). Entries can silently fail. No immutability enforcement. No retention policy.

### Design

**Transactional support** — add optional `tx` parameter to `auditLog()`:

```typescript
export async function auditLog(input: AuditLogInput, tx?: Transaction): Promise<void> {
  const conn = tx ?? db
  await conn.insert(auditLogs).values({ ... })
}
```

When `tx` is provided, audit entry commits/rolls back with the business operation. Without `tx`, falls back to current fire-and-forget behavior. Backward-compatible.

**Immutability** — enforced at application level. `auditLog()` is the only write path. No update/delete functions exposed. DB-level triggers deferred to later.

**Retention policy** — Inngest cron job:

```typescript
// Daily at 2am, deletes entries older than 365 days
{ cron: '0 2 * * *' }
```

**Not in scope:** Append-only log shipping, cryptographic verification, separate audit DB.

## Implementation Order (Approach A)

**Phase 1 — Schema changes (one pass):**
1. Create `staffProfiles` table, remove staff columns from `users`
2. Remove booking/scheduling columns from `organizationSettings`
3. Replace `messageTrigger`/`notificationType` pgEnums with text columns
4. Drop unused enums

**Phase 2 — Infrastructure code:**
1. Permission seeder (`syncPermissions()`)
2. Module settings service (`getModuleSettings`, `updateModuleSetting`, `seedModuleSettings`)
3. Notification trigger registry + manifest field
4. Audit logger transactional overload + retention cron

**Phase 3 — Integration wiring:**
1. Search provider co-location in `register-all.ts`
2. Startup hooks (permission sync, module settings seed, trigger registration)
3. Update all existing module code that references removed columns/enums
4. Update tests

## Manifest Type Changes

New fields added to `ModuleManifest`:

```typescript
// Settings definitions (optional)
settingsDefinitions?: ModuleSettingDefinition[]

// Notification triggers (optional)
notificationTriggers?: NotificationTriggerDefinition[]
```

Search providers remain outside the manifest (server-only, registered alongside).
