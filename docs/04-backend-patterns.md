# Backend Patterns

## tRPC Procedure Tiers

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

## Context object

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

## Optimistic concurrency

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

## Saga pattern

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

## Distributed locking (Redis)

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

## Slot locking (PostgreSQL advisory locks)

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
