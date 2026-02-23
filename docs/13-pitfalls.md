# Common Pitfalls

## Zod v4

```typescript
// CORRECT
z.uuid()
z.record(z.string(), z.unknown())

// WRONG
z.string().uuid()    // Pre-v4 syntax
```

## Inngest event schemas

```typescript
// CORRECT — use z.string() for UUIDs in event data
z.object({ bookingId: z.string(), tenantId: z.string() })

// WRONG — z.uuid() fails Inngest payload validation
z.object({ bookingId: z.uuid(), tenantId: z.uuid() })
```

## Pino arg order

```typescript
// CORRECT
log.info({ tenantId, programId }, 'Created program')

// WRONG
log.info('Created program', { tenantId, programId })
```

## Build guard

The `NEXT_PHASE` check in `db.ts` prevents `DATABASE_URL` errors during `next build`:

```typescript
if (!process.env.DATABASE_URL && process.env.NEXT_PHASE !== 'phase-production-build') {
  throw new Error('DATABASE_URL environment variable is not set')
}
```

**Never remove this check.**

## Resend/Twilio initialization

```typescript
// CORRECT — lazy init
async function getResendClient() {
  const { Resend } = await import('resend')
  return new Resend(process.env.RESEND_API_KEY)
}

// WRONG — module-level construction crashes if env vars missing
const resend = new Resend(process.env.RESEND_API_KEY) // Throws at import time!
```

## TRPCError in wrong layer

```typescript
// CORRECT — domain error in service
throw new NotFoundError('Booking', bookingId)

// WRONG — TRPCError in service
throw new TRPCError({ code: 'NOT_FOUND', message: '...' })
// The error conversion middleware handles this automatically
```

## Missing tenantId in queries

```typescript
// CORRECT
.where(and(eq(table.id, id), eq(table.tenantId, tenantId)))

// WRONG — security vulnerability (cross-tenant data leak)
.where(eq(table.id, id))
```

## Cross-module imports

```typescript
// PREFERRED — communicate via Inngest events
await inngest.send({ name: 'booking/completed', data: { ... } })

// ACCEPTABLE (documented exception) — sync critical-path dependency
import { paymentService } from '@/modules/payment/payment.service'

// WRONG — importing another module's repository
import { customerRepository } from '@/modules/customer/customer.repository'
// Repositories are private to their module
```
