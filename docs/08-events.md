# Event System (Inngest)

## Adding a new event

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

## Event naming convention

```
{module}/{noun}.{verb}     — e.g., booking/reservation.expired
{module}/{noun}            — e.g., booking/created
```

## Inngest function patterns

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

## Registering functions

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
