# Ironheart Refactor — Project Brief

## What This Is

A fresh, clean implementation of the Ironheart SaaS platform using a modular monolith architecture. The legacy codebase (`/Users/lukehodges/Documents/ironheart`) remains in production for existing clients. This new codebase will become the platform that scales to multiple industry verticals (booking, carbon credits, cricket stadium ERP, etc.).

## Reference Codebase

The legacy codebase at `/Users/lukehodges/Documents/ironheart` contains:
- 112k LOC, 42 Prisma models, 27 tRPC routers
- Correct business logic — booking flows, slot locking, RBAC, Google Calendar two-way sync, multi-tenant isolation
- Everything can be read for reference and copied where it saves time
- **Do not modify the legacy codebase**

## Target Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| API | tRPC 11 |
| ORM | Drizzle ORM + drizzle-kit |
| Database | PostgreSQL (same DB as legacy) |
| Auth | WorkOS AuthKit (replaces NextAuth + custom JWT) |
| Background Jobs | Inngest (replaces 6 Vercel crons) |
| Cache / Rate Limiting | Upstash Redis |
| Email | Resend + React Email |
| SMS | Twilio |
| Monitoring | Sentry + Pino structured logging |
| Frontend | React 19, Tailwind CSS 4 |
| Hosting | Vercel |

## Module Structure (target)

```
src/
  modules/
    booking/
      booking.router.ts         ← thin: validate → call service → return
      booking.service.ts         ← business logic
      booking.repository.ts      ← all Prisma calls
      booking.events.ts          ← Inngest event handlers
      booking.schemas.ts         ← Zod schemas
    scheduling/
    notification/
    calendar-sync/
    workflow/
    tenant/
    auth/
    customer/
    review/
    forms/
    staff/
    portal/
  shared/
    db.ts                        ← Prisma client
    inngest.ts                   ← Inngest client + typed event catalog
    redis.ts                     ← Upstash Redis client
    logger.ts                    ← Pino structured logging
    errors.ts                    ← Custom error types
    trpc.ts                      ← tRPC context + middleware
```

## Architectural Rules

1. **Routers are thin** — validate input, call service, return result. No business logic, no DB calls.
2. **Services contain business logic** — orchestrate repository calls, emit Inngest events.
3. **Repositories isolate DB access** — only place Prisma is called. Testable in isolation.
4. **Side effects are async** — email, SMS, calendar sync, analytics all happen via Inngest handlers, not in the request path.
5. **Modules communicate via events** — booking module emits `booking/created`, notification module listens. No direct cross-module imports.
6. **Tenant isolation via row-level filtering** — tenantId on every query (same as legacy, no schema-per-tenant).

## Event Catalog (Inngest)

```typescript
type IronheartEvents = {
  "booking/created":             { bookingId: string; tenantId: string }
  "booking/confirmed":           { bookingId: string; tenantId: string }
  "booking/cancelled":           { bookingId: string; tenantId: string; reason?: string }
  "booking/completed":           { bookingId: string; tenantId: string }
  "booking/reservation.expired": { bookingId: string; tenantId: string }
  "slot/reserved":               { slotId: string; tenantId: string; expiresAt: string }
  "slot/released":               { slotId: string; tenantId: string }
  "notification/send.email":     { to: string; templateId: string; variables: Record<string, string> }
  "notification/send.sms":       { to: string; templateId: string; variables: Record<string, string> }
  "calendar/sync.push":          { bookingId: string; userId: string }
  "calendar/sync.pull":          { userId: string }
  "calendar/webhook.received":   { channelId: string; resourceId: string }
  "workflow/trigger":            { workflowId: string; event: string; data: Record<string, unknown> }
  "review/request.send":         { bookingId: string; customerId: string; delay?: string }
}
```

## Cron → Inngest Migration

| Legacy Vercel Cron | Inngest Replacement |
|-------------------|---------------------|
| release-slots (every 1min) | Delayed event at exact expiry time |
| send-reminders (every 15min) | Scheduled on booking confirm |
| sync-calendars (every 5min) | Inngest cron with per-user concurrency |
| pull-calendar-events (every 15min) | Inngest cron with pagination + retry |
| refresh-calendar-tokens (every 30min) | Inngest cron |
| renew-watch-channels (daily 2am) | Inngest cron |

## What NOT to Do

- No microservices — single deployable unit
- No Convex — wrong data model for 42 relational entities
- No schema-per-tenant — row-level isolation is correct
- No GraphQL — tRPC already gives type safety
- No BullMQ — requires separate worker process outside Vercel
- No rewriting business logic that already works — copy from legacy codebase

## Phase Plan

- **Phase 0**: Scaffolding + Foundation (current focus)
- **Phase 1**: Booking module
- **Phase 2**: Scheduling module + remaining crons
- **Phase 3**: Auth migration (WorkOS AuthKit)
- **Phase 4**: Notification + Calendar-sync modules
- **Phase 5**: Remaining modules
- **Phase 6**: Hardening
