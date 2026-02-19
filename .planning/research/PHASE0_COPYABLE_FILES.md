# Phase 0 — Copyable Files Analysis

**Analysis Date:** 2026-02-19
**Source codebase:** `/Users/lukehodges/Documents/ironheart`
**Target project:** `/Users/lukehodges/Documents/ironheart-refactor`

---

## Summary

Phase 0 needs to establish the project scaffold and shared infrastructure layer. The legacy codebase provides several files that can be reused with minimal or no changes. The auth layer (NextAuth + custom JWT) and the event bus (cron jobs) are the two systems that must be written fresh.

---

## Copy As-Is

These files can be copied with no changes to logic, only import paths may need updating (all `@/lib/` → `@/shared/` where applicable).

### `src/lib/db.ts` → `src/shared/db.ts`

**Source:** `/Users/lukehodges/Documents/ironheart/src/lib/db.ts`

Uses `@prisma/adapter-pg` with a `pg` connection pool (pool size 2 for serverless). Pattern is correct for Vercel — global singleton cached on `globalThis`. No auth or module-specific logic.

**Import path changes needed:** None — no internal imports.

**Copy as-is.** The pool config (`max: 2`, `idleTimeoutMillis: 30000`) is already tuned for Vercel serverless. Keep it.

```typescript
// What it does (31 lines total):
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
// Singleton with createPrismaClient() → PrismaPg adapter → Pool(connectionString, max:2)
export const db = globalForPrisma.prisma ?? createPrismaClient()
```

---

### `src/lib/logger.ts` → `src/shared/logger.ts`

**Source:** `/Users/lukehodges/Documents/ironheart/src/lib/logger.ts`

Pino logger with `pino-pretty` in development. Exports both `logger` (raw Pino instance) and a `log` convenience wrapper.

**Import path changes needed:** None — no internal imports.

**Copy as-is.** (26 lines)

```typescript
// Exports:
export const logger = pino({ level: process.env.LOG_LEVEL || 'info', ... })
export const log = { info, warn, error, debug }
```

---

### `src/lib/utils.ts` → `src/shared/utils.ts`

**Source:** `/Users/lukehodges/Documents/ironheart/src/lib/utils.ts`

Single `cn()` function using `clsx` + `tailwind-merge`. Universal utility needed everywhere.

**Import path changes needed:** None — no internal imports.

**Copy as-is.** (5 lines)

---

### `next.config.ts`

**Source:** `/Users/lukehodges/Documents/ironheart/next.config.ts`

Contains:
- `reactStrictMode: true`
- Custom security headers (HSTS, X-Frame-Options, CSP, etc.) applied to `/:path*`
- `images.formats: ['image/avif', 'image/webp']`
- Suppressed default fetch logging

**Copy as-is.** Security headers are correct and should be kept. No Next.js-version-specific APIs.

---

### `tsconfig.json`

**Source:** `/Users/lukehodges/Documents/ironheart/tsconfig.json`

Key settings:
- `"paths": { "@/*": ["./src/*"] }` — single alias, maps to `./src/`
- `"strict": true`, `"moduleResolution": "bundler"`, `"target": "ES2017"`
- `"jsx": "react-jsx"`, `"incremental": true`
- Excludes: old test files + seed files (update these for refactor project)

**Copy and update** the `exclude` array to remove legacy-specific files. The `@/*` path alias is the correct mapping and should be kept unchanged — all new module paths will be `@/modules/...` and `@/shared/...`.

---

### `postcss.config.mjs`

**Source:** `/Users/lukehodges/Documents/ironheart/postcss.config.mjs`

Single plugin: `@tailwindcss/postcss`. This is Tailwind CSS 4's postcss plugin pattern.

**Copy as-is.** Tailwind CSS 4 requires no `tailwind.config.ts` — configuration lives in CSS. There is no `tailwind.config.ts` in the legacy codebase.

---

### `eslint.config.mjs`

**Source:** `/Users/lukehodges/Documents/ironheart/eslint.config.mjs`

Uses flat config format with `eslint-config-next` (core-web-vitals + typescript presets).

**Copy as-is.** Standard Next.js ESLint setup.

---

### `prisma.config.ts`

**Source:** `/Users/lukehodges/Documents/ironheart/prisma.config.ts`

Points to `prisma/schema.prisma` (single file) and `prisma/migrations`. Uses `dotenv/config` import.

**Copy as-is.** The new project uses the same DB so the same schema path and migration path are correct.

---

### `prisma/schema.prisma`

**Source:** `/Users/lukehodges/Documents/ironheart/prisma/schema.prisma`

42 models. First 80 lines confirmed. Key models visible:
- `Tenant` — full multi-tenant model with plan, billing, limits
- `User` — merged Staff+User model with `isTeamMember` boolean, `staffStatus`, employment fields
- All join tables and feature models present

**Copy as-is.** The new project connects to the same PostgreSQL database. No schema changes for Phase 0.

---

### `src/lib/slot-utils.ts` → `src/shared/slot-utils.ts`

**Source:** `/Users/lukehodges/Documents/ironheart/src/lib/slot-utils.ts`

Pure utility functions for slot-based booking display — no imports from internal modules, no auth dependencies.

Functions: `formatSlotTime`, `formatSlotTimeRange`, `getSlotStatus`, `getSlotStatusColor`, `generateTimeOptions`, `getCapacityLabel`, `parseSlotDate`, `formatSlotDate`, `calculateEndTime`, `DAYS_OF_WEEK` constant, `SlotStatus` type.

**Import path changes needed:** None — no internal imports.

**Copy as-is.** (199 lines, pure functions)

---

## Copy and Modify

These files contain the right logic but need changes to remove legacy auth dependencies or adapt to the new structure.

### `src/server/trpc.ts` → `src/shared/trpc.ts`

**Source:** `/Users/lukehodges/Documents/ironheart/src/server/trpc.ts` (275 lines)

**What to keep:**
- `Context` type definition (adapt session type for Better Auth)
- `createContext()` function — tenant detection logic (subdomain → header → session → default) is correct and valuable
- `router`, `publicProcedure`, `middleware` exports
- `protectedProcedure` — pattern is correct, update to use Better Auth session
- `tenantProcedure` — logic is correct, keep platform admin override behavior
- `permissionProcedure` — RBAC DB lookup pattern is correct, keep
- `platformAdminProcedure` — keep

**What to remove:**
- Module-specific procedures at the bottom: `patientProcedure`, `reviewProcedure`, `formsProcedure`, `waitlistProcedure`, `staffProcedure`. These belong in their respective modules (e.g., `src/modules/review/review.router.ts` will use `tenantProcedure.use(createModuleMiddleware('review-automation'))`).
- `createModuleMiddleware` factory can stay in `src/shared/trpc.ts` as a shared utility since any module may use it.

**Imports to change:**
- Remove: `import { getServerSession } from 'next-auth/next'` and `import { authConfig } from '@/lib/auth'`
- Remove: `import type { Session } from 'next-auth'`
- Add: Better Auth session retrieval (Phase 3 — for Phase 0, stub `createContext` to return null session)
- Change: `import { db } from '@/lib/db'` → `import { db } from '@/shared/db'`
- Change: `import { hasModuleAccess } from '@/lib/module-access'` → implement inline or move to `src/shared/module-access.ts`
- Change: `import { requirePermission, type UserWithRoles } from '@/server/middleware/permissions'` → `import { requirePermission, type UserWithRoles } from '@/shared/permissions'`

**Specific changes for Phase 0 stub:**
```typescript
// Replace NextAuth session lookup with Better Auth stub:
export async function createContext({ req }: { req?: Request }): Promise<Context> {
  // TODO Phase 3: Replace with Better Auth session lookup
  const session = null // stub until Better Auth is wired in Phase 3
  // ... rest of tenant detection logic stays identical
}
```

---

### `src/server/middleware/permissions.ts` → `src/shared/permissions.ts`

**Source:** `/Users/lukehodges/Documents/ironheart/src/server/middleware/permissions.ts` (277 lines)

Pure RBAC logic. Exports: `UserWithRoles` type, `hasPermission`, `requirePermission`, `hasAnyPermission`, `hasAllPermissions`, `getUserPermissions`, `canAccessResource`, `applyPermissionFilter`.

**Only depends on:** `@trpc/server` (for `TRPCError`) and `@prisma/client` (for type imports).

**Import path changes needed:** None — no internal `@/lib/` imports.

**Copy and update imports:** Change `@prisma/client` types if needed (same package in refactor), `@trpc/server` stays the same. This is effectively a copy-as-is.

**Note:** The `UserWithRoles` type depends on Prisma-generated `User`, `Role`, `Permission` types which will be available once `prisma generate` runs against the copied schema.

---

### `src/lib/datetime.ts` → `src/shared/datetime.ts`

**Source:** `/Users/lukehodges/Documents/ironheart/src/lib/datetime.ts` (257 lines)

Date utility functions. Depends on:
- `import { Booking } from '@/lib/types'` — references the legacy `Booking` interface
- `date-fns` (external, fine)
- `import { WORKING_HOURS, SLOT_DURATION, BLOCKED_SLOTS } from './constants'` — references demo constants

**Import path changes needed:**
- Change `@/lib/types` → `@/shared/types` (or define the `Booking` type locally in a `src/shared/types/` file)
- The `WORKING_HOURS`, `SLOT_DURATION`, `BLOCKED_SLOTS` constants are demo data from `src/lib/constants.ts` — extract only what's needed or inline the values

**Note:** The `Booking` type imported from `src/lib/types.ts` is a legacy display type, not the Prisma DB type. The new project should define proper domain types. However, the utility functions (`isToday`, `isSameDay`, `normalizeDate`, `formatDate`, etc.) are pure and very reusable.

**Recommendation:** Copy the pure date utility functions (everything not referencing `Booking` or legacy constants). Extract `parseBookingDateTime` into the booking module later.

---

### `src/lib/scheduling/travel-time.ts` → `src/modules/scheduling/travel-time.ts`

**Source:** `/Users/lukehodges/Documents/ironheart/src/lib/scheduling/travel-time.ts` (125 lines)

**Depends on:**
- `import { Booking, Location } from '@/lib/types'` — legacy display types
- `import { getMapboxTravelTime } from '@/lib/integrations/mapbox-directions'` — Mapbox integration

**Logic is correct and valuable** — postcode-based estimation, Mapbox async lookup with fallback, color-coded status.

**Import path changes:**
- `@/lib/types` → `@/modules/scheduling/scheduling.types.ts` (define `Location` interface there)
- `@/lib/integrations/mapbox-directions` → `@/modules/scheduling/mapbox-directions.ts` (copy the integration)

**Copy into scheduling module** during Phase 2, not Phase 0. Note for Phase 0 planning only.

---

### `src/lib/scheduling/availability.ts` → `src/modules/scheduling/availability.ts`

**Source:** `/Users/lukehodges/Documents/ironheart/src/lib/scheduling/availability.ts` (319 lines)

**Depends on:**
- `@/lib/types` (Booking, StaffMember)
- `@prisma/client` (PrismaClient — for `getStaffExternalEvents`)
- `date-fns`

Contains both pure logic (`isStaffAvailable`, `getAvailableStaff`, `getStaffTimeSlots`) and one DB-accessing function (`getStaffExternalEvents`). In the refactor, `getStaffExternalEvents` belongs in a scheduling repository.

**Copy into scheduling module** during Phase 2.

---

### `src/lib/scheduling/assignment-health.ts` → `src/modules/scheduling/assignment-health.ts`

**Source:** `/Users/lukehodges/Documents/ironheart/src/lib/scheduling/assignment-health.ts` (266 lines)

**Depends on:**
- `@/lib/types` (Booking)
- `./travel-time` (internal scheduling dep)

Pure calculation functions. No DB access. Exports: `AssignmentStatus`, `AssignmentHealth`, `calculateAssignmentHealth`, `calculateMultipleAssignmentHealth`, `getAssignmentHealthStats`.

**Copy into scheduling module** during Phase 2.

---

### `src/lib/scheduling/alerts.ts` → `src/modules/scheduling/alerts.ts`

**Source:** `/Users/lukehodges/Documents/ironheart/src/lib/scheduling/alerts.ts` (260 lines)

**Depends on:**
- `@/lib/types` (Booking)
- `./assignment-health` and `./travel-time` (internal)

Pure alert generation logic. No DB access.

**Copy into scheduling module** during Phase 2.

---

### `src/lib/scheduling/recommendations.ts` → `src/modules/scheduling/recommendations.ts`

**Source:** `/Users/lukehodges/Documents/ironheart/src/lib/scheduling/recommendations.ts` (247 lines)

**Depends on:**
- `@/lib/types`
- `./availability`, `./assignment-health`, `./travel-time`

Pure recommendation scoring. No DB access.

**Copy into scheduling module** during Phase 2.

---

### `src/lib/booking-transformers.ts` → `src/modules/booking/booking.transformers.ts`

**Source:** `/Users/lukehodges/Documents/ironheart/src/lib/booking-transformers.ts` (197 lines)

Transform functions between DB format and display format. Exports: `DbBooking`, `DbCustomer`, `DbService`, `DbStaff`, `DbVenue`, `CalendarBooking`, `CustomerDisplay`, `ServiceDisplay`, `StaffDisplay`, `LocationDisplay`, `transformBookingForCalendar`, `transformCustomer`, `transformService`, `transformStaff`, `transformLocation`.

**Depends on:** `@/lib/types` (legacy display types).

**Import path changes:** Update `@/lib/types` → use booking module's own types.

**Copy into booking module** during Phase 1.

---

## Write Fresh

These files are incompatible with the new stack and must be written from scratch.

### `src/shared/inngest.ts` — Inngest Client + Event Catalog

**Does not exist in legacy.** The legacy codebase uses 6 Vercel cron routes:
- `/api/cron/release-slots` (every 1 min) → `booking/reservation.expired` event
- `/api/cron/send-reminders` (every 15 min) → notification events
- `/api/cron/sync-calendars` (every 5 min) → `calendar/sync.push` event
- `/api/cron/pull-calendar-events` (every 15 min) → `calendar/sync.pull` event
- `/api/cron/refresh-calendar-tokens` (every 30 min) → inline cron
- `/api/cron/renew-watch-channels` (daily 2am) → inline cron

**Write fresh** using the event catalog from `PROJECT.md`. See the `IronheartEvents` type in PROJECT.md for the full typed event map.

---

### `src/shared/redis.ts` — Upstash Redis Client

**Does not exist in legacy.** The legacy codebase has no Redis layer. Write fresh using `@upstash/redis`:

```typescript
import { Redis } from '@upstash/redis'
export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})
```

---

### `src/shared/errors.ts` — Custom Error Types

**Does not exist in legacy.** No `src/lib/errors.ts` found. The legacy codebase throws `TRPCError` directly. Write a custom error hierarchy for the refactor:

```typescript
// Suggested shape:
export class IronheartError extends Error { constructor(message: string, public code: string) }
export class NotFoundError extends IronheartError {}
export class ForbiddenError extends IronheartError {}
export class ValidationError extends IronheartError {}
export class ConflictError extends IronheartError {}
// Map to TRPCError codes in the router layer
```

---

### `src/modules/auth/auth.config.ts` — Better Auth Configuration

**Source auth system:** `/Users/lukehodges/Documents/ironheart/src/lib/auth.ts`

The legacy file uses `NextAuth` + `CredentialsProvider` with bcrypt password validation. It:
1. Looks up user by email across tenants
2. Validates password with `bcryptjs`
3. Detects tenant from credentials or request
4. Sets `tenantId`, `tenantSlug`, `isPlatformAdmin`, `permissions`, `roles` on the JWT token

**This entire system must be replaced with Better Auth.** The business logic (tenant detection by email lookup, permission flattening into session) must be reimplemented using Better Auth's plugin system.

**Do not copy.** Write fresh for Phase 3.

---

### `middleware.ts` — Root Next.js Middleware

**Source:** `/Users/lukehodges/Documents/ironheart/middleware.ts`

The legacy middleware:
1. Skips `/platform` routes
2. Logs API requests
3. Handles `platform_tenant_slug` cookie override
4. Calls `simpleTenantMiddleware` for tenant detection

The tenant detection logic in `src/middleware/simple-tenant.ts` is good (subdomain → X-Tenant-Slug header → query param → first active tenant DB lookup). However:

- The DB call in middleware (via `simpleTenantMiddleware`) runs on every request. In the refactor, consider caching the tenant lookup in Redis.
- Better Auth will handle the auth portion of middleware.
- The `platform_tenant_slug` cookie override pattern is worth keeping for platform admin.

**Write fresh** for Phase 0 as a minimal stub (just pass-through + tenant header injection). Full middleware with Better Auth session validation comes in Phase 3.

---

### `src/lib/jwt.ts`, `src/lib/jwt-client.ts`, `src/lib/session-manager.ts`, `src/lib/session-utils.ts`

**Not copyable.** These implement the custom JWT session system (15min access token, 7-day refresh token). Better Auth replaces all of this.

---

### `src/lib/auth.ts` (NextAuth config)

**Not copyable.** Replaced by Better Auth. The _logic_ (tenant detection, permission loading) must be reimplemented but the NextAuth API is incompatible.

---

## Shared Types to Preserve

The new project should create `src/shared/types/` with these type definitions extracted from the legacy codebase.

### Core Domain Types (from `src/lib/types.ts`)

**Source:** `/Users/lukehodges/Documents/ironheart/src/lib/types.ts`

Preserve these interfaces in `src/shared/types/domain.ts`:
- `Location` — `{ type: 'home' | 'venue' | 'customer_home' | 'customer_work' | 'other', address?, postcode?, venueId?, name? }` — used across booking, scheduling, travel-time
- `StaffAvailabilityBlock` — `{ id, staffId, type: 'blocked' | 'recurring' | 'time_off', start, end, reason, notes? }`

**Do not preserve** `Service`, `StaffMember`, `Venue`, `Customer`, `Booking`, `BookingFormData`, `BookingStep` — these are legacy display types with mixed DB/UI concerns. Each module will define its own proper types.

### Booking Status Enum

The `status` field in `src/lib/types.ts` and `src/lib/booking-transformers.ts` defines the full status list. The canonical source is the Prisma schema. Define once in `src/modules/booking/booking.schemas.ts`:

```typescript
// All valid booking statuses (matches Prisma enum BookingStatus)
export const BOOKING_STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'RESERVED', 'RELEASED',
  'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW'] as const
export type BookingStatus = typeof BOOKING_STATUSES[number]
```

### Scheduling Types (from `src/lib/scheduling/`)

Preserve in `src/modules/scheduling/scheduling.types.ts`:
- `StaffAvailability` — `{ staffId, staffName, status: 'available' | 'travel_time' | 'unavailable', travelMinutes?, nextBooking?, reason? }` (from `availability.ts`)
- `ExternalEventBlock` — `{ id, summary, startTime: Date, endTime: Date, isAllDay: boolean }` (from `availability.ts`)
- `TimeSlot` — `{ start: Date, end: Date, available: boolean, reason? }` (from `availability.ts`)
- `AssignmentStatus`, `AssignmentHealth` — from `assignment-health.ts`
- `SchedulingAlert` — from `alerts.ts`
- `StaffRecommendation` — from `recommendations.ts`

### RBAC Types (from `src/server/middleware/permissions.ts`)

Preserve in `src/shared/permissions.ts` (as part of the copy-and-modify of that file):
- `UserWithRoles` — critical type used throughout tRPC procedures

### DB Display Types (from `src/lib/booking-transformers.ts`)

Preserve in `src/modules/booking/booking.types.ts`:
- `DbBooking`, `DbCustomer`, `DbService`, `DbStaff`, `DbVenue` — typed wrappers around Prisma responses
- `CalendarBooking`, `CustomerDisplay`, `ServiceDisplay`, `StaffDisplay`, `LocationDisplay` — display types

---

## Dependency Notes for `package.json`

The refactor `package.json` must include these from the legacy codebase (and add new ones):

**Keep from legacy:**
- `@prisma/adapter-pg` + `pg` — same DB adapter pattern
- `@trpc/server`, `@trpc/client`, `@trpc/react-query` — same tRPC 11
- `superjson` — tRPC transformer
- `pino`, `pino-pretty` — logging
- `date-fns` — date utilities
- `zod` — validation (note: legacy uses zod v4 `^4.3.5`)
- `clsx`, `tailwind-merge` — UI utilities
- `lucide-react` — icons
- `react`, `react-dom` — React 19
- `next` — Next.js 16

**Replace:**
- `next-auth` → `better-auth` (Phase 3)
- `jsonwebtoken`, `bcryptjs` → managed by Better Auth
- Vercel cron API routes → `inngest`

**Add new:**
- `inngest` — background jobs
- `@upstash/redis` — caching + rate limiting
- `resend` + `@react-email/...` — email (already have `resend` in legacy)
- `@sentry/nextjs` — error monitoring

**Remove from legacy (not needed in refactor):**
- `googleapis` — Google Calendar integration will use Inngest events (Phase 4)
- `@auth/prisma-adapter` — Not needed with Better Auth
- `leaflet`, `react-leaflet`, `leaflet-routing-machine` — evaluate if Mapbox-only
- `nodemailer`, `@sendgrid/mail` — replaced by Resend
- `handlebars` — template rendering (re-evaluate)
- `opossum` — circuit breaker (re-evaluate with Inngest retry)
- `elkjs`, `@xyflow/react` — workflow visualizer (carry forward if needed)

---

## Phase 0 File Checklist

Files to have ready before first `npm run dev`:

| File | Source | Action |
|------|--------|--------|
| `package.json` | Legacy reference | Write fresh with updated deps |
| `tsconfig.json` | Legacy | Copy, update `exclude` array |
| `next.config.ts` | Legacy | Copy as-is |
| `postcss.config.mjs` | Legacy | Copy as-is |
| `eslint.config.mjs` | Legacy | Copy as-is |
| `prisma.config.ts` | Legacy | Copy as-is |
| `prisma/schema.prisma` | Legacy | Copy as-is |
| `src/shared/db.ts` | `src/lib/db.ts` | Copy, update export path only |
| `src/shared/logger.ts` | `src/lib/logger.ts` | Copy as-is |
| `src/shared/utils.ts` | `src/lib/utils.ts` | Copy as-is |
| `src/shared/trpc.ts` | `src/server/trpc.ts` | Copy, strip module procedures, stub auth |
| `src/shared/permissions.ts` | `src/server/middleware/permissions.ts` | Copy as-is (no internal deps) |
| `src/shared/errors.ts` | None | Write fresh |
| `src/shared/inngest.ts` | None | Write fresh |
| `src/shared/redis.ts` | None | Write fresh |
| `src/shared/slot-utils.ts` | `src/lib/slot-utils.ts` | Copy as-is |
| `middleware.ts` | Legacy | Write fresh stub |
| `src/modules/auth/auth.config.ts` | None | Write fresh (Phase 3) |
| `src/modules/*/index.ts` | None | Empty barrel files |

---

*File analysis completed: 2026-02-19*
