# Ironheart Developer Guide

> Comprehensive reference for adding modules, modifying existing features, and maintaining the Ironheart SaaS platform.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Project Structure](#3-project-structure)
4. [Module Architecture](#4-module-architecture)
5. [Adding a New Module (Step-by-Step)](#5-adding-a-new-module-step-by-step)
6. [Backend Patterns](#6-backend-patterns)
7. [Frontend Patterns](#7-frontend-patterns)
8. [Database & ORM](#8-database--orm)
9. [Authentication & Authorization](#9-authentication--authorization)
10. [Event System (Inngest)](#10-event-system-inngest)
11. [Module System & Feature Flags](#11-module-system--feature-flags)
12. [Error Handling](#12-error-handling)
13. [Logging](#13-logging)
14. [Testing](#14-testing)
15. [Common Pitfalls](#15-common-pitfalls)
16. [Build & Deploy](#16-build--deploy)

---

## 1. Project Overview

Ironheart is a multi-tenant SaaS platform built as a **modular monolith**. It supports booking management, scheduling, workflow automation, customer management, reviews, forms, payments, analytics, and platform administration.

**Key principles:**
- Single deployable unit (no microservices)
- Modules communicate via typed events, not direct imports
- Tenant isolation via row-level filtering (`tenantId` on every query)
- Routers are thin; services contain business logic; repositories isolate DB access
- Side effects (email, SMS, calendar sync) happen asynchronously via Inngest

---

## 2. Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js (App Router) | 16 |
| API | tRPC | 11 |
| ORM | Drizzle ORM + drizzle-kit | latest |
| Database | PostgreSQL via postgres.js | — |
| Auth | WorkOS AuthKit | latest |
| Background Jobs | Inngest | v3 |
| Cache / Rate Limiting | Upstash Redis | latest |
| Email | Resend + React Email | latest |
| SMS | Twilio | latest |
| Monitoring | Sentry + Pino | latest |
| Frontend | React 19, Tailwind CSS 4 | — |
| UI Components | shadcn/ui + Radix UI | latest |
| Testing | Vitest + Testing Library | latest |

---

## 3. Project Structure

```
src/
├── app/                          # Next.js App Router pages
│   ├── admin/                    # Admin dashboard routes
│   │   ├── layout.tsx            # Auth guard + sidebar + topbar shell
│   │   ├── page.tsx              # Dashboard
│   │   ├── bookings/page.tsx
│   │   ├── calendar/page.tsx
│   │   ├── customers/page.tsx
│   │   ├── team/page.tsx
│   │   ├── workflows/page.tsx
│   │   ├── analytics/page.tsx
│   │   ├── settings/page.tsx
│   │   ├── audit/page.tsx
│   │   └── ...
│   ├── platform/                 # Platform admin routes (isPlatformAdmin only)
│   ├── book/[tenantSlug]/        # Public booking wizard
│   ├── forms/[sessionKey]/       # Public form submission
│   ├── review/[token]/           # Public review submission
│   └── api/
│       ├── trpc/[trpc]/route.ts  # tRPC HTTP handler
│       └── inngest/route.ts      # Inngest webhook handler
│
├── modules/                      # Business logic modules
│   ├── booking/
│   ├── scheduling/
│   ├── notification/
│   ├── calendar-sync/
│   ├── workflow/
│   ├── tenant/
│   ├── auth/
│   ├── customer/
│   ├── review/
│   ├── forms/
│   ├── team/
│   ├── payment/
│   ├── analytics/
│   ├── platform/
│   ├── developer/
│   ├── search/
│   ├── settings/
│   └── audit/
│
├── shared/                       # Cross-cutting infrastructure
│   ├── db.ts                     # Drizzle client (postgres.js)
│   ├── db/
│   │   ├── schema.ts             # Barrel export of all schemas
│   │   ├── relations.ts          # Drizzle relation definitions
│   │   └── schemas/              # Individual table schemas
│   ├── inngest.ts                # Inngest client + typed event catalog
│   ├── redis.ts                  # Upstash Redis client
│   ├── logger.ts                 # Pino structured logging
│   ├── errors.ts                 # Domain error classes
│   ├── trpc.ts                   # tRPC context + middleware + procedures
│   ├── optimistic-concurrency.ts # Version-based updates
│   ├── audit/audit-logger.ts     # Shared audit logging
│   └── module-system/            # Module registry, manifests, gates
│       ├── types.ts
│       ├── registry.ts
│       ├── register-all.ts
│       ├── module-gate.ts
│       └── widgets/
│
├── components/                   # React components
│   ├── ui/                       # shadcn/ui primitives (26 components)
│   ├── layout/                   # Sidebar, topbar, nav
│   ├── booking-flow/             # Public booking wizard components
│   ├── public-form/              # Public form renderer
│   ├── review/                   # Review submission components
│   ├── portal/                   # Tenant portal shell
│   └── providers/                # React context providers
│
├── hooks/                        # Custom React hooks
│   ├── use-debounce.ts
│   ├── use-local-storage.ts
│   ├── use-media-query.ts
│   └── ...
│
├── lib/
│   ├── trpc/react.tsx            # tRPC React client (`api` hook)
│   ├── utils.ts                  # cn() utility
│   └── calendar-links.ts         # ICS generation
│
├── server/
│   └── root.ts                   # Root tRPC router (merges all module routers)
│
└── types/                        # Shared TypeScript types for frontend
```

---

## 4. Module Architecture

Every module follows the same file structure. **This is mandatory** — do not deviate.

```
src/modules/{module}/
├── {module}.types.ts             # TypeScript interfaces only (NO Zod)
├── {module}.schemas.ts           # Zod schemas for tRPC input validation
├── {module}.repository.ts        # Drizzle queries; throws domain errors
├── {module}.service.ts           # Business logic; calls repo; emits events
├── {module}.router.ts            # tRPC procedures; thin layer; calls service
├── {module}.events.ts            # Inngest function definitions
├── {module}.manifest.ts          # Module manifest (nav, permissions, widgets)
├── index.ts                      # Barrel export
└── __tests__/
    └── {module}.test.ts          # or {module}.service.test.ts
```

### Layer responsibilities

| Layer | Does | Does NOT |
|-------|------|----------|
| **Router** | Validates input (Zod), calls service, returns result | Contain business logic, DB queries, or direct Inngest calls |
| **Service** | Business logic, orchestrates repos, emits Inngest events | Import `TRPCError`, access `db` directly |
| **Repository** | All Drizzle/DB queries, throws domain errors | Business logic, event emission |
| **Events** | Inngest function definitions, async side effects | Direct DB access (calls service/repo instead) |
| **Types** | TypeScript interfaces and type aliases | Zod schemas, runtime code |
| **Schemas** | Zod schemas for tRPC input validation | TypeScript-only types |

### Dependency direction

```
Router → Service → Repository → DB
   ↓         ↓
 Schemas   Inngest (events)
   ↓
 Types
```

**Cross-module communication:** Modules must NOT import other modules' services or repositories directly. Instead, emit an Inngest event and let the target module handle it in its `*.events.ts` file.

**Exception:** A service may import another module's service if it's a synchronous, critical-path dependency (e.g., `bookingService` imports `paymentService.createInvoiceForBooking`). Document these cross-module imports.

---

## 5. Adding a New Module (Step-by-Step)

This section walks you through creating a complete module from scratch. We'll use a hypothetical `loyalty` module as an example.

### Step 1: Create types (`loyalty.types.ts`)

```typescript
// src/modules/loyalty/loyalty.types.ts

export interface LoyaltyProgram {
  id: string
  tenantId: string
  name: string
  pointsPerBooking: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface LoyaltyBalance {
  id: string
  tenantId: string
  customerId: string
  points: number
  lifetimePoints: number
  updatedAt: Date
}
```

**Rules:**
- Only TypeScript interfaces and type aliases
- No Zod, no runtime code
- No imports from other modules (import shared types from `@/shared/` if needed)

### Step 2: Create schemas (`loyalty.schemas.ts`)

```typescript
// src/modules/loyalty/loyalty.schemas.ts
import { z } from 'zod'

export const createProgramSchema = z.object({
  name: z.string().min(1).max(100),
  pointsPerBooking: z.number().int().min(1),
})

export const updateProgramSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100).optional(),
  pointsPerBooking: z.number().int().min(1).optional(),
  isActive: z.boolean().optional(),
})

export const getBalanceSchema = z.object({
  customerId: z.string().uuid(),
})

export const awardPointsSchema = z.object({
  customerId: z.string().uuid(),
  points: z.number().int().min(1),
  reason: z.string().min(1),
})
```

**Rules:**
- Use `z.uuid()` (not `z.string().uuid()`) — Zod v4 pattern
- Use `z.record(z.string(), z.unknown())` for record types
- One schema per tRPC input; name them `{action}{Resource}Schema`

### Step 3: Create repository (`loyalty.repository.ts`)

```typescript
// src/modules/loyalty/loyalty.repository.ts
import { db } from '@/shared/db'
import { loyaltyPrograms, loyaltyBalances } from '@/shared/db/schema'
import { eq, and } from 'drizzle-orm'
import { NotFoundError, ConflictError } from '@/shared/errors'
import { logger } from '@/shared/logger'

const log = logger.child({ module: 'loyalty.repository' })

export const loyaltyRepository = {
  async findProgram(tenantId: string) {
    const result = await db
      .select()
      .from(loyaltyPrograms)
      .where(eq(loyaltyPrograms.tenantId, tenantId))
      .limit(1)
    return result[0] ?? null
  },

  async createProgram(tenantId: string, data: { name: string; pointsPerBooking: number }) {
    const existing = await this.findProgram(tenantId)
    if (existing) {
      throw new ConflictError('Loyalty program already exists for this tenant')
    }

    const [created] = await db
      .insert(loyaltyPrograms)
      .values({
        id: crypto.randomUUID(),
        tenantId,
        ...data,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning()

    return created!
  },

  async getBalance(tenantId: string, customerId: string) {
    const result = await db
      .select()
      .from(loyaltyBalances)
      .where(
        and(
          eq(loyaltyBalances.tenantId, tenantId),
          eq(loyaltyBalances.customerId, customerId)
        )
      )
      .limit(1)
    return result[0] ?? null
  },

  // Pagination pattern: fetch limit + 1 to determine hasMore
  async listBalances(tenantId: string, limit: number = 50) {
    const rows = await db
      .select()
      .from(loyaltyBalances)
      .where(eq(loyaltyBalances.tenantId, tenantId))
      .limit(limit + 1)

    const hasMore = rows.length > limit
    return {
      rows: hasMore ? rows.slice(0, limit) : rows,
      hasMore,
    }
  },
}
```

**Rules:**
- Always filter by `tenantId` in every query (tenant isolation)
- Return `result[0] ?? null` for single-row queries
- Throw `NotFoundError`, `ConflictError`, etc. — NEVER throw `TRPCError`
- Use `limit + 1` pattern for pagination with `hasMore`
- Create child logger: `logger.child({ module: 'loyalty.repository' })`

### Step 4: Create service (`loyalty.service.ts`)

```typescript
// src/modules/loyalty/loyalty.service.ts
import { inngest } from '@/shared/inngest'
import { logger } from '@/shared/logger'
import { NotFoundError } from '@/shared/errors'
import { auditLog } from '@/shared/audit'
import { loyaltyRepository } from './loyalty.repository'

const log = logger.child({ module: 'loyalty.service' })

export const loyaltyService = {
  async getProgram(tenantId: string) {
    return loyaltyRepository.findProgram(tenantId)
  },

  async createProgram(
    tenantId: string,
    actorId: string,
    data: { name: string; pointsPerBooking: number }
  ) {
    const program = await loyaltyRepository.createProgram(tenantId, data)

    log.info({ tenantId, programId: program.id }, 'Loyalty program created')

    // Audit log (fire-and-forget)
    await auditLog({
      tenantId,
      actorId,
      action: 'created',
      resourceType: 'loyalty_program',
      resourceId: program.id,
      resourceName: data.name,
    })

    return program
  },

  async awardPoints(
    tenantId: string,
    customerId: string,
    points: number,
    reason: string
  ) {
    const balance = await loyaltyRepository.getBalance(tenantId, customerId)
    if (!balance) {
      throw new NotFoundError('LoyaltyBalance', customerId)
    }

    const updated = await loyaltyRepository.addPoints(
      tenantId,
      customerId,
      points
    )

    // Emit event for other modules to react to
    await inngest.send({
      name: 'loyalty/points.awarded' as any, // Add to IronheartEvents first!
      data: { tenantId, customerId, points, reason },
    })

    log.info(
      { tenantId, customerId, points, newBalance: updated.points },
      'Loyalty points awarded'
    )

    return updated
  },
}
```

**Rules:**
- Services contain all business logic
- Services call repositories, never `db` directly
- Services emit Inngest events for async side effects
- Services throw domain errors (`NotFoundError`, `ForbiddenError`, etc.)
- Services NEVER throw `TRPCError`
- Pino logging: **object first, message second** — `log.info({ field }, 'message')`

### Step 5: Create router (`loyalty.router.ts`)

```typescript
// src/modules/loyalty/loyalty.router.ts
import {
  router,
  tenantProcedure,
  permissionProcedure,
  createModuleMiddleware,
} from '@/shared/trpc'
import { loyaltyService } from './loyalty.service'
import {
  createProgramSchema,
  updateProgramSchema,
  getBalanceSchema,
  awardPointsSchema,
} from './loyalty.schemas'

// Module gate — procedure fails if 'loyalty' module is not enabled for tenant
const moduleGate = createModuleMiddleware('loyalty')
const moduleProcedure = tenantProcedure.use(moduleGate)
const modulePermission = (perm: string) =>
  permissionProcedure(perm).use(moduleGate)

export const loyaltyRouter = router({
  getProgram: moduleProcedure.query(({ ctx }) =>
    loyaltyService.getProgram(ctx.tenantId)
  ),

  createProgram: modulePermission('loyalty:write')
    .input(createProgramSchema)
    .mutation(({ ctx, input }) =>
      loyaltyService.createProgram(ctx.tenantId, ctx.user!.id, input)
    ),

  getBalance: moduleProcedure
    .input(getBalanceSchema)
    .query(({ ctx, input }) =>
      loyaltyService.getBalance(ctx.tenantId, input.customerId)
    ),

  awardPoints: modulePermission('loyalty:write')
    .input(awardPointsSchema)
    .mutation(({ ctx, input }) =>
      loyaltyService.awardPoints(
        ctx.tenantId,
        input.customerId,
        input.points,
        input.reason
      )
    ),
})
```

**Rules:**
- Routers are thin — validate input, call service, return result
- Choose the right procedure tier (see [Section 9](#9-authentication--authorization))
- Always use `createModuleMiddleware()` for module-gated procedures
- Pattern: `const moduleGate = createModuleMiddleware('slug')`
- Pattern: `const moduleProcedure = tenantProcedure.use(moduleGate)`
- Pattern: `const modulePermission = (perm: string) => permissionProcedure(perm).use(moduleGate)`

### Step 6: Create events (`loyalty.events.ts`)

```typescript
// src/modules/loyalty/loyalty.events.ts
import { z } from 'zod'
import { inngest } from '@/shared/inngest'
import { loyaltyService } from './loyalty.service'
import { logger } from '@/shared/logger'

const log = logger.child({ module: 'loyalty.events' })

// Inngest Zod: use z.string() for UUIDs (not z.uuid())
const bookingCompletedSchema = z.object({
  bookingId: z.string(),
  tenantId: z.string(),
})

/**
 * Award loyalty points when a booking is completed.
 */
export const awardPointsOnCompletion = inngest.createFunction(
  { id: 'loyalty-award-on-completion' },
  { event: 'booking/completed' },
  async ({ event, step }) => {
    const payload = bookingCompletedSchema.parse(event.data)

    await step.run('award-points', async () => {
      // ... look up program, calculate points, call service
      log.info(
        { bookingId: payload.bookingId, tenantId: payload.tenantId },
        'Loyalty points awarded for completed booking'
      )
    })
  }
)

/** All Inngest functions for this module — register in inngest route */
export const loyaltyFunctions = [awardPointsOnCompletion]
```

**Rules:**
- Use `z.string()` in Inngest event schemas (not `z.uuid()`)
- Export all functions in an array: `export const {module}Functions = [...]`
- Always validate event payload with Zod (at-least-once delivery means replays)

### Step 7: Create barrel export (`index.ts`)

```typescript
// src/modules/loyalty/index.ts
export { loyaltyRouter } from './loyalty.router'
export { loyaltyFunctions } from './loyalty.events'
export * from './loyalty.types'
export * from './loyalty.schemas'
```

### Step 8: Register the module

**8a. Add router to `src/server/root.ts`:**

```typescript
import { loyaltyRouter } from '@/modules/loyalty'

export const appRouter = router({
  // ... existing routers
  loyalty: loyaltyRouter,
})
```

**8b. Add Inngest functions to `src/app/api/inngest/route.ts`:**

```typescript
import { loyaltyFunctions } from '@/modules/loyalty'

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    ...bookingFunctions,
    // ... existing functions
    ...loyaltyFunctions,
  ],
})
```

**8c. Add events to `src/shared/inngest.ts`** (if the module produces new events):

```typescript
type IronheartEvents = {
  // ... existing events
  'loyalty/points.awarded': {
    data: {
      tenantId: string
      customerId: string
      points: number
      reason: string
    }
  }
}
```

**8d. Create a module manifest** (`loyalty.manifest.ts`) and register in `register-all.ts`.

### Step 9: Create tests

See [Section 14: Testing](#14-testing) for the full pattern.

### Step 10: Create admin page

See [Section 7: Frontend Patterns](#7-frontend-patterns) for the full pattern.

---

## 6. Backend Patterns

### tRPC Procedure Tiers

| Procedure | Auth Required | Tenant Context | RBAC Check | Use For |
|-----------|:---:|:---:|:---:|---------|
| `publicProcedure` | No | No | No | Public form submission, review token, portal booking |
| `protectedProcedure` | Yes | No | No | Auth-only (rarely used directly) |
| `tenantProcedure` | Yes | Yes | No | Most reads, user-specific queries |
| `permissionProcedure(perm)` | Yes | Yes | Yes | Write operations, admin actions |
| `platformAdminProcedure` | Yes | Cross-tenant | isPlatformAdmin | Platform management only |

```typescript
// Usage in routers:
import {
  publicProcedure,
  tenantProcedure,
  permissionProcedure,
  platformAdminProcedure,
  createModuleMiddleware,
} from '@/shared/trpc'
```

### Context object

All procedures receive `ctx` with:

```typescript
type Context = {
  db: typeof db                    // Drizzle client
  session: WorkOSSession | null    // WorkOS auth session
  tenantId: string                 // Resolved tenant ID
  tenantSlug: string               // Tenant slug from request
  user: UserWithRoles | null       // Full user record (set by tenantProcedure)
  requestId: string                // Unique per-request (log correlation)
  req: Request                     // Raw Request object
  isImpersonating?: boolean        // Platform admin impersonation
}
```

### Optimistic concurrency

For records with a `version` column, use the shared helper:

```typescript
import { updateWithVersion } from '@/shared/optimistic-concurrency'

const updated = await updateWithVersion<MyRecord>(
  myTable,          // Drizzle table
  id,               // Record ID
  tenantId,         // Tenant ID
  expectedVersion,  // Current version (from read)
  { name: 'new' }  // Update values
)
// Throws ConflictError if version mismatch
```

### Saga pattern

For multi-step operations requiring compensation on failure:

```typescript
import { Saga, SagaStep } from '@/modules/booking/lib/booking-saga'

const saga = new Saga('MY_OPERATION', entityId, tenantId, [
  {
    name: 'step-1',
    execute: () => doThing(),
    compensate: (result) => undoThing(result),
  },
  {
    name: 'step-2',
    execute: () => doAnotherThing(),
    compensate: (result) => undoAnotherThing(result),
  },
])

await saga.run() // Auto-compensates on failure
```

### Distributed locking (Redis)

For concurrent access protection:

```typescript
import { redis } from '@/shared/redis'

const lockKey = `lock:resource:${tenantId}:${resourceId}`
const token = crypto.randomUUID()
const acquired = await redis.set(lockKey, token, { nx: true, px: 5000 })

if (!acquired) {
  throw new ConflictError('Resource is currently being modified')
}

try {
  // ... do work
} finally {
  const stored = await redis.get(lockKey)
  if (stored === token) await redis.del(lockKey)
}
```

### Slot locking (PostgreSQL advisory locks)

For slot-level concurrency in bookings:

```typescript
import { withSlotLock } from '@/modules/booking/lib/slot-lock'

const result = await withSlotLock(tenantId, staffId, date, time, async (tx) => {
  // tx is a Drizzle transaction — all queries here are serialized
  const slot = await tx.select()...
  // ...
  return booking
})
```

---

## 7. Frontend Patterns

### tRPC Client Usage

The tRPC React client is exported as `api` from `@/lib/trpc/react`:

```typescript
'use client'
import { api } from '@/lib/trpc/react'

// Query
const { data, isLoading, error } = api.loyalty.getProgram.useQuery()

// Query with input
const { data } = api.loyalty.getBalance.useQuery(
  { customerId: 'abc' },
  { enabled: !!customerId }  // Conditional fetching
)

// Mutation
const utils = api.useUtils()
const createMutation = api.loyalty.createProgram.useMutation({
  onSuccess: () => {
    toast.success('Program created')
    utils.loyalty.getProgram.invalidate()  // Refetch queries
  },
  onError: (error) => {
    toast.error(error.message)
  },
})

// Calling the mutation
createMutation.mutate({ name: 'Gold', pointsPerBooking: 10 })
```

**Import rule:** Always import from `@/lib/trpc/react`, never from `@/lib/trpc/client`.

### Admin page structure

```typescript
// src/app/admin/{module}/page.tsx
'use client'

import { useState } from 'react'
import { api } from '@/lib/trpc/react'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { toast } from 'sonner'

export default function LoyaltyPage() {
  const { data, isLoading } = api.loyalty.getProgram.useQuery()

  if (isLoading) return <LoyaltyPageSkeleton />

  if (!data) {
    return (
      <EmptyState
        icon={Gift}
        title="No loyalty program"
        description="Create a loyalty program to reward your customers."
        action={<Button>Create Program</Button>}
      />
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Loyalty"
        description="Manage your loyalty program"
        actions={<Button>Edit Program</Button>}
      />
      {/* Content */}
    </div>
  )
}
```

### Component conventions

- **Loading states:** Every async page has a matching `Skeleton` component
- **Empty states:** Every list/table uses the `EmptyState` component
- **Error handling:** All errors go through `sonner` toast — **never use `alert()`**
- **Optimistic updates:** Status changes, toggles — update UI before server confirms, revert on error
- **Dark mode:** All screens must work in both modes. Use design tokens, never hardcode colors
- **Mobile:** Admin screens must work at 390px minimum
- **Density:** Enterprise density — `text-sm` for body, `text-xs` for metadata
- **Accessibility:** WCAG 2.1 AA — keyboard navigation, aria attributes, visible focus rings

### Table pattern (data table)

Follow the shadcn data-table pattern with TanStack Table:

```typescript
// Server-side filtering
const { data, isLoading } = api.module.list.useQuery({
  status: filter.status,
  search: debouncedSearch,
  limit: 50,
  cursor: cursor,
})

// Pagination with cursor
const hasMore = data?.hasMore ?? false
```

### Dialog/Sheet pattern

```typescript
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'

<Sheet open={!!selected} onOpenChange={() => setSelected(null)}>
  <SheetContent side="right" className="w-[500px]">
    <SheetHeader>
      <SheetTitle>Detail View</SheetTitle>
    </SheetHeader>
    {/* Content */}
  </SheetContent>
</Sheet>
```

### Form pattern

Use `react-hook-form` with Zod resolver:

```typescript
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createProgramSchema } from '@/modules/loyalty/loyalty.schemas'

const form = useForm({
  resolver: zodResolver(createProgramSchema),
  defaultValues: { name: '', pointsPerBooking: 1 },
})
```

### Providers

The app wraps all pages with these providers (in `src/app/layout.tsx`):

```
ThemeProvider (next-themes)
  └── TRPCReactProvider
        └── Toaster (sonner)
              └── CommandPaletteProvider
```

### Styling

- **Tailwind CSS 4** with `@theme inline` for design tokens
- **`cn()` utility** from `@/lib/utils` for class merging (clsx + tailwind-merge)
- **CSS custom properties** for light/dark/sidebar themes
- **No CSS modules** — Tailwind only (exception: FullCalendar overrides in `calendar.css`)

---

## 8. Database & ORM

### Drizzle client setup

```typescript
// src/shared/db.ts
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './db/schema'
import * as relations from './db/relations'

// Build-time guard: skip DATABASE_URL check during next build
if (!process.env.DATABASE_URL && process.env.NEXT_PHASE !== 'phase-production-build') {
  throw new Error('DATABASE_URL environment variable is not set')
}

const client = postgres(connectionString, {
  max: process.env.NODE_ENV === 'production' ? 1 : 5,  // Serverless-safe
  idle_timeout: 20,
  connect_timeout: 10,
})

export const db = drizzle(client, { schema: { ...schema, ...relations } })
```

### Common query patterns

```typescript
// Single row lookup
const result = await db
  .select()
  .from(myTable)
  .where(and(eq(myTable.id, id), eq(myTable.tenantId, tenantId)))
  .limit(1)
return result[0] ?? null

// Insert with returning
const [created] = await db
  .insert(myTable)
  .values({ id: crypto.randomUUID(), ...data })
  .returning()

// Update
const [updated] = await db
  .update(myTable)
  .set({ ...data, updatedAt: new Date() })
  .where(and(eq(myTable.id, id), eq(myTable.tenantId, tenantId)))
  .returning()

// Soft delete
await db
  .update(myTable)
  .set({ active: false, updatedAt: new Date() })
  .where(and(eq(myTable.id, id), eq(myTable.tenantId, tenantId)))

// Transaction
await db.transaction(async (tx) => {
  await tx.insert(tableA).values(...)
  await tx.insert(tableB).values(...)
})

// Pagination (limit + 1)
const rows = await db
  .select()
  .from(myTable)
  .where(eq(myTable.tenantId, tenantId))
  .orderBy(desc(myTable.createdAt))
  .limit(limit + 1)

const hasMore = rows.length > limit
return { rows: hasMore ? rows.slice(0, limit) : rows, hasMore }

// Array column membership
import { sql } from 'drizzle-orm'
.where(sql`${id}::uuid = ANY(${myTable.staffIds})`)

// Relational queries (when relations are defined)
const result = await db.query.users.findFirst({
  where: eq(users.id, userId),
  with: {
    userRoles: {
      with: { role: { with: { rolePermissions: { with: { permission: true } } } } }
    }
  }
})
```

### Important: Always include `tenantId`

Every query in a repository MUST include `tenantId` filtering. This is the primary isolation mechanism. Forgetting this is a **security vulnerability**.

```typescript
// CORRECT
.where(and(eq(table.id, id), eq(table.tenantId, tenantId)))

// WRONG — leaks data across tenants
.where(eq(table.id, id))
```

---

## 9. Authentication & Authorization

### Auth flow

1. **WorkOS AuthKit** handles sign-in/sign-up
2. `withAuth()` retrieves the WorkOS session in server components and tRPC context
3. `tenantProcedure` middleware resolves the Drizzle user record (with roles/permissions)
4. `permissionProcedure(perm)` checks RBAC

### RBAC model

```
User → UserRoles → Role → RolePermissions → Permission
```

Permissions follow `resource:action` format:

```typescript
'bookings:read'
'bookings:write'
'customers:read'
'customers:write'
'loyalty:read'
'loyalty:write'
'audit:read'
```

Check in service/middleware:

```typescript
import { hasPermission } from '@/modules/auth/rbac'

if (!hasPermission(ctx.user, 'loyalty:write')) {
  throw new ForbiddenError('Permission denied: loyalty:write')
}
```

### Platform admin

```typescript
// users.isPlatformAdmin is the source of truth
// PLATFORM_ADMIN_EMAILS env var is bootstrap-only (first login promotion)
platformAdminProcedure  // Checks isPlatformAdmin flag
```

### Module gating

```typescript
// tRPC middleware (in router)
const moduleGate = createModuleMiddleware('loyalty')
const moduleProcedure = tenantProcedure.use(moduleGate)

// Page-level gating (in Next.js pages)
import { createModuleGate } from '@/shared/module-system/module-gate'
const gate = createModuleGate('loyalty')
await gate.check(tenantId)  // Throws if module disabled
```

---

## 10. Event System (Inngest)

### Adding a new event

1. Add the event type to `src/shared/inngest.ts`:

```typescript
type IronheartEvents = {
  // ... existing
  'loyalty/points.awarded': {
    data: {
      tenantId: string
      customerId: string
      points: number
      reason: string
    }
  }
}
```

2. Send from your service:

```typescript
await inngest.send({
  name: 'loyalty/points.awarded',
  data: { tenantId, customerId, points, reason },
})
```

3. Handle in any module's `*.events.ts`:

```typescript
export const handlePointsAwarded = inngest.createFunction(
  { id: 'notification-on-points-awarded' },
  { event: 'loyalty/points.awarded' },
  async ({ event, step }) => {
    const { tenantId, customerId, points } = event.data
    await step.run('send-notification', async () => {
      // ...
    })
  }
)
```

### Event naming convention

```
{module}/{noun}.{verb}     — e.g., booking/reservation.expired
{module}/{noun}            — e.g., booking/created
```

### Inngest function patterns

```typescript
// Delayed execution
await step.sleepUntil('wait-for-expiry', new Date(expiresAt))

// Cancel on competing event
inngest.createFunction(
  {
    id: 'release-reservation',
    cancelOn: [
      { event: 'booking/confirmed', match: 'data.bookingId' },
      { event: 'booking/cancelled', match: 'data.bookingId' },
    ],
  },
  { event: 'slot/reserved' },
  async ({ event, step }) => { ... }
)

// Cron schedule
inngest.createFunction(
  { id: 'daily-overdue-check' },
  { cron: '0 2 * * *' },  // 2 AM daily
  async ({ step }) => { ... }
)
```

### Registering functions

All Inngest functions must be registered in the route handler:

```typescript
// src/app/api/inngest/route.ts
import { serve } from 'inngest/next'
import { inngest } from '@/shared/inngest'
import { bookingFunctions } from '@/modules/booking'
import { loyaltyFunctions } from '@/modules/loyalty'

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [...bookingFunctions, ...loyaltyFunctions],
})
```

---

## 11. Module System & Feature Flags

### Module manifest

Every module declares a manifest for runtime registration:

```typescript
// src/modules/loyalty/loyalty.manifest.ts
import type { ModuleManifest } from '@/shared/module-system/types'

export const loyaltyManifest: ModuleManifest = {
  slug: 'loyalty',
  name: 'Loyalty Program',
  description: 'Customer loyalty points and rewards',
  icon: 'Gift',
  category: 'operations',
  dependencies: ['booking'],  // Requires booking module
  routes: [{ path: '/admin/loyalty', label: 'Loyalty', permission: 'loyalty:read' }],
  sidebarItems: [{
    title: 'Loyalty',
    href: '/admin/loyalty',
    icon: 'Gift',
    section: 'Operations',
    permission: 'loyalty:read',
  }],
  analyticsWidgets: [],
  permissions: ['loyalty:read', 'loyalty:write'],
  eventsProduced: ['loyalty/points.awarded'],
  eventsConsumed: ['booking/completed'],
  isCore: false,
  availability: 'addon',
  auditResources: ['loyalty_program', 'loyalty_balance'],
}
```

### Module gating checks

```typescript
// From tenantService (Redis-cached)
const enabled = await tenantService.isModuleEnabled(tenantId, 'loyalty')

// From module registry
import { moduleRegistry } from '@/shared/module-system/register-all'
const manifests = moduleRegistry.getEnabledManifests(enabledSlugs)
```

### tenantModules table

The `tenantModules` table has `moduleId` (UUID FK to `modules.id`) and `isEnabled` (boolean). There is NO `moduleKey` text column. To enable a module for a tenant, you must first query the `modules` table by slug to get the UUID:

```typescript
const [moduleRow] = await db
  .select({ id: modules.id })
  .from(modules)
  .where(eq(modules.slug, 'loyalty'))
  .limit(1)

await db.insert(tenantModules).values({
  id: crypto.randomUUID(),
  tenantId,
  moduleId: moduleRow.id,
  isEnabled: true,
})
```

---

## 12. Error Handling

### Domain errors (service/repository layer)

```typescript
import {
  NotFoundError,     // Resource not found → 404
  ForbiddenError,    // Permission denied → 403
  UnauthorizedError, // Not authenticated → 401
  ValidationError,   // Business rule violation → 400
  ConflictError,     // State conflict (e.g. duplicate, version mismatch) → 409
  BadRequestError,   // Invalid input → 400
} from '@/shared/errors'

// In repository/service:
throw new NotFoundError('Booking', bookingId)
throw new ConflictError('Slot is at full capacity')
throw new ValidationError('Cannot cancel a completed booking')
```

### Automatic conversion

The `errorConversionMiddleware` in `src/shared/trpc.ts` automatically converts `IronheartError` subclasses to `TRPCError` with the correct HTTP status code. You do **not** need to catch and re-throw.

### Sentry integration

- `INTERNAL_SERVER_ERROR` is automatically captured to Sentry via the tRPC error formatter
- Domain errors (4xx) are NOT sent to Sentry (they're expected)

### Frontend error handling

```typescript
// Mutations
const mutation = api.module.action.useMutation({
  onError: (error) => toast.error(error.message),
})

// Global: sonner toast for all user-facing errors
// NEVER use alert() or window.alert()
```

---

## 13. Logging

### Setup

```typescript
import { logger } from '@/shared/logger'

const log = logger.child({ module: 'loyalty.service' })
```

### Usage

```typescript
// CORRECT — object first, message second (Pino v8)
log.info({ tenantId, programId }, 'Loyalty program created')
log.error({ err, bookingId }, 'Failed to award points')
log.warn({ customerId }, 'Customer has no loyalty balance')
log.debug({ points, reason }, 'Points calculation complete')

// WRONG — message first
log.info('Created program', { programId })  // DON'T DO THIS
```

### Convention

- Always create a child logger per file: `logger.child({ module: 'module.layer' })`
- Include `tenantId` in all log entries for filtering
- Use `err` (not `error`) as the key for Error objects
- Log at appropriate levels:
  - `debug` — development diagnostics
  - `info` — business events (created, updated, deleted)
  - `warn` — unexpected but recoverable situations
  - `error` — failures requiring attention

---

## 14. Testing

### Configuration

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    pool: 'forks',  // Prevents cross-file mock contamination
    setupFiles: ['./vitest.setup.ts'],
  },
})
```

### Test structure

```typescript
// src/modules/loyalty/__tests__/loyalty.service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { loyaltyService } from '../loyalty.service'
import { loyaltyRepository } from '../loyalty.repository'
import { inngest } from '@/shared/inngest'
import { NotFoundError, ConflictError } from '@/shared/errors'

// ---- Mocks ----

// Always mock db to prevent DATABASE_URL errors
vi.mock('@/shared/db', () => ({
  db: {
    transaction: vi.fn((fn) => fn({
      execute: vi.fn().mockResolvedValue([]),
    })),
  },
}))

vi.mock('../loyalty.repository', () => ({
  loyaltyRepository: {
    findProgram: vi.fn(),
    createProgram: vi.fn(),
    getBalance: vi.fn(),
    addPoints: vi.fn(),
  },
}))

vi.mock('@/shared/inngest', () => ({
  inngest: { send: vi.fn().mockResolvedValue(undefined) },
}))

vi.mock('@/shared/redis', () => ({
  redis: {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue('OK'),
    del: vi.fn().mockResolvedValue(1),
  },
}))

// ---- Helpers ----

const TENANT_ID = '00000000-0000-0000-0000-000000000001'

function makeProgram(overrides = {}) {
  return {
    id: '00000000-0000-0000-0000-000000000002',
    tenantId: TENANT_ID,
    name: 'Gold',
    pointsPerBooking: 10,
    isActive: true,
    ...overrides,
  }
}

// ---- Tests ----

describe('loyaltyService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getProgram', () => {
    it('returns program when found', async () => {
      const program = makeProgram()
      vi.mocked(loyaltyRepository.findProgram).mockResolvedValue(program)

      const result = await loyaltyService.getProgram(TENANT_ID)
      expect(result).toEqual(program)
      expect(loyaltyRepository.findProgram).toHaveBeenCalledWith(TENANT_ID)
    })

    it('returns null when not found', async () => {
      vi.mocked(loyaltyRepository.findProgram).mockResolvedValue(null)

      const result = await loyaltyService.getProgram(TENANT_ID)
      expect(result).toBeNull()
    })
  })

  describe('awardPoints', () => {
    it('throws NotFoundError when balance does not exist', async () => {
      vi.mocked(loyaltyRepository.getBalance).mockResolvedValue(null)

      await expect(
        loyaltyService.awardPoints(TENANT_ID, 'customer-1', 10, 'test')
      ).rejects.toThrow(NotFoundError)
    })
  })
})
```

### Key testing rules

1. **Always mock `@/shared/db`** — prevents `DATABASE_URL` errors in CI
2. **Always mock `@/shared/redis`** — prevents Upstash connection errors
3. **Always mock `@/shared/inngest`** — prevents Inngest API calls
4. **Mock at the repository level** — test services by mocking their repository
5. **Use `vi.clearAllMocks()` in `beforeEach`**
6. **Use factory functions** (`makeProgram()`, `makeBooking()`) for test data
7. **Use `pool: "forks"`** in vitest config — prevents cross-file mock contamination
8. **Test error paths** — verify domain errors are thrown correctly

### Running tests

```bash
npm test           # Run all tests once
npm run test:watch # Watch mode
npm run test:coverage # With coverage report
```

---

## 15. Common Pitfalls

### Zod v4

```typescript
// CORRECT
z.uuid()
z.record(z.string(), z.unknown())

// WRONG
z.string().uuid()    // Pre-v4 syntax
```

### Inngest event schemas

```typescript
// CORRECT — use z.string() for UUIDs in event data
z.object({ bookingId: z.string(), tenantId: z.string() })

// WRONG — z.uuid() fails Inngest payload validation
z.object({ bookingId: z.uuid(), tenantId: z.uuid() })
```

### Pino arg order

```typescript
// CORRECT
log.info({ tenantId, programId }, 'Created program')

// WRONG
log.info('Created program', { tenantId, programId })
```

### Build guard

The `NEXT_PHASE` check in `db.ts` prevents `DATABASE_URL` errors during `next build`:

```typescript
if (!process.env.DATABASE_URL && process.env.NEXT_PHASE !== 'phase-production-build') {
  throw new Error('DATABASE_URL environment variable is not set')
}
```

**Never remove this check.**

### Resend/Twilio initialization

```typescript
// CORRECT — lazy init
async function getResendClient() {
  const { Resend } = await import('resend')
  return new Resend(process.env.RESEND_API_KEY)
}

// WRONG — module-level construction crashes if env vars missing
const resend = new Resend(process.env.RESEND_API_KEY) // Throws at import time!
```

### TRPCError in wrong layer

```typescript
// CORRECT — domain error in service
throw new NotFoundError('Booking', bookingId)

// WRONG — TRPCError in service
throw new TRPCError({ code: 'NOT_FOUND', message: '...' })
// The error conversion middleware handles this automatically
```

### Missing tenantId in queries

```typescript
// CORRECT
.where(and(eq(table.id, id), eq(table.tenantId, tenantId)))

// WRONG — security vulnerability (cross-tenant data leak)
.where(eq(table.id, id))
```

### Cross-module imports

```typescript
// PREFERRED — communicate via Inngest events
await inngest.send({ name: 'booking/completed', data: { ... } })

// ACCEPTABLE (documented exception) — sync critical-path dependency
import { paymentService } from '@/modules/payment/payment.service'

// WRONG — importing another module's repository
import { customerRepository } from '@/modules/customer/customer.repository'
// Repositories are private to their module
```

---

## 16. Build & Deploy

### Environment variables

Required in production:

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string |
| `WORKOS_API_KEY` | WorkOS auth |
| `WORKOS_CLIENT_ID` | WorkOS auth |
| `NEXT_PUBLIC_WORKOS_REDIRECT_URI` | WorkOS redirect |
| `UPSTASH_REDIS_REST_URL` | Redis cache |
| `UPSTASH_REDIS_REST_TOKEN` | Redis auth |
| `INNGEST_EVENT_KEY` | Inngest event publishing |
| `INNGEST_SIGNING_KEY` | Inngest webhook verification |
| `RESEND_API_KEY` | Email sending |
| `SENTRY_DSN` | Error tracking |
| `NEXT_PUBLIC_SENTRY_DSN` | Client-side error tracking |

Optional:

| Variable | Purpose |
|----------|---------|
| `DEFAULT_TENANT_SLUG` | Development default tenant |
| `PLATFORM_ADMIN_EMAILS` | Bootstrap platform admin (remove after setup) |
| `TWILIO_ACCOUNT_SID` | SMS |
| `TWILIO_AUTH_TOKEN` | SMS |
| `LOG_LEVEL` | Pino log level (default: `info`) |

### Build commands

```bash
npm run dev          # Start dev server (runs migrations first)
npm run build        # Production build (runs migrations first)
npm test             # Run test suite
npm run test:coverage # Tests with coverage
npm run lint         # ESLint
npm run db:seed      # Seed demo data
```

### Pre-commit checklist

Before committing any changes:

1. `npx tsc --noEmit` — zero type errors
2. `npm test` — all tests pass
3. `npm run build` — production build succeeds
4. No `alert()` calls
5. No hardcoded colors (use design tokens)
6. All queries include `tenantId` filtering
7. No `TRPCError` thrown outside routers
8. All new Inngest events added to `IronheartEvents` type
9. All new Inngest functions registered in route handler

---

*Last updated: 2026-02-22*
