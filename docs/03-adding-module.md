# Adding a New Module (Step-by-Step)

This section walks you through creating a complete module from scratch. We'll use a hypothetical `loyalty` module as an example.

## Step 1: Create types (`loyalty.types.ts`)

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

## Step 2: Create schemas (`loyalty.schemas.ts`)

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

## Step 3: Create repository (`loyalty.repository.ts`)

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

## Step 4: Create service (`loyalty.service.ts`)

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

## Step 5: Create router (`loyalty.router.ts`)

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
- Choose the right procedure tier (see auth.md)
- Always use `createModuleMiddleware()` for module-gated procedures
- Pattern: `const moduleGate = createModuleMiddleware('slug')`
- Pattern: `const moduleProcedure = tenantProcedure.use(moduleGate)`
- Pattern: `const modulePermission = (perm: string) => permissionProcedure(perm).use(moduleGate)`

## Step 6: Create events (`loyalty.events.ts`)

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

## Step 7: Create barrel export (`index.ts`)

```typescript
// src/modules/loyalty/index.ts
export { loyaltyRouter } from './loyalty.router'
export { loyaltyFunctions } from './loyalty.events'
export * from './loyalty.types'
export * from './loyalty.schemas'
```

## Step 8: Register the module

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

## Step 9: Add search provider (optional)

If your module has data that should appear in global search results, create a search provider. See [15-search-providers.md](./15-search-providers.md) for the full guide.

```typescript
// src/modules/loyalty/loyalty.search-provider.ts
export const loyaltySearchProvider: SearchProvider = {
  moduleSlug: 'loyalty',
  resultType: 'loyalty_program',
  label: 'Loyalty Programs',
  search: async (tenantId, query, limit) => { /* ... */ },
  mapResult: (hit) => ({ type: 'loyalty_program', id: hit.id, label: ..., secondary: ... }),
}
```

Then register it in `register-all.ts` alongside your module manifest.

## Step 10: Create tests

See testing.md for the full pattern.

## Step 11: Create admin page

See frontend-patterns.md for the full pattern.
