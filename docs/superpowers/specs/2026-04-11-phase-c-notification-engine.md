# Phase C — Notification Engine
**Date:** 2026-04-11
**Status:** Approved
**Depends on:** Phase A
**Unlocks:** Any client comms workflow without writing code

---

## Goal

Every notification trigger currently hardcoded in `src/lib/messaging/triggers.ts` becomes a row in the database. Every template variable is resolved by a single generic function. Adding a new notification for a new client is an admin UI action, not a deployment.

---

## New Tables

### `notificationTriggers`
One row = one send rule. The engine evaluates all active triggers for a tenant on every Inngest event.

```sql
notificationTriggers {
  id                  uuid PK
  tenantId            uuid FK → tenants
  name                text  -- human label for admin UI: 'Appointment Reminder - 24h'
  event               text  -- Inngest event name: 'job.confirmed', 'job.completed'
  condition           jsonb (nullable) -- only fire if true: { field: 'job.locationType', op: 'eq', value: 'VENUE' }
  templateId          uuid FK → notificationTemplates
  recipientExpression text  -- dot-path to recipient: 'customer.email', 'job.venue.email', 'job.assignments.*.resource.user.email'
  channel             enum: EMAIL | SMS | PUSH | WEBHOOK | IN_APP
  delayMinutes        int default 0  -- 0 = send immediately; 1440 = send after 24h; negative = send N minutes before scheduledStart
  isActive            bool default true
  createdAt
}
```

### `notificationTemplates` (extend existing)
Add columns to the existing templates table:

```sql
-- Add to notificationTemplates:
channel       enum: EMAIL | SMS | PUSH | WEBHOOK | IN_APP
preWrapped    bool default false  -- true = full HTML doc, skip tenant branding wrapper
replyToEmail  text (nullable)
smsBody       text (nullable)     -- for SMS channel (separate from HTML body)
```

---

## Variable Resolver

### Location
```
src/modules/notifications/lib/variable-resolver.ts
```

### Interface

```typescript
interface NotificationContext {
  job?: Job & { assignments: JobAssignment[]; locations: JobLocation[]; participants: JobParticipant[] }
  customer?: Customer & { contacts: CustomerContact[] }
  resource?: Resource & { user?: User }
  tenant?: Tenant & { settings: OrganizationSettings }
  contract?: ServiceContract
  project?: Project
  // extensible: any future module adds its context here
}

function resolveVariable(path: string, context: NotificationContext): string
```

### Resolution Rules

1. Split path on `.` — e.g. `job.scheduledStart` → `['job', 'scheduledStart']`
2. Walk the context object, resolve each segment
3. `*` segment: maps over array, joins results with `, `
4. Dates: auto-format as `DD MMM YYYY` unless path ends with `Raw`
5. Times: auto-format as `HH:mm` unless path ends with `Raw`
6. Currency: fields named `*Amount` or `*Cost` auto-format as `£X.XX`
7. Unknown path: return `''` (never throw — broken template must not block delivery)

### Template Rendering

```typescript
function renderTemplate(body: string, context: NotificationContext): string {
  return body.replace(/\{\{([^}]+)\}\}/g, (_, path) => resolveVariable(path.trim(), context))
}
```

Supports: `{{customer.firstName}}`, `{{job.scheduledStart}}`, `{{tenant.businessName}}`, `{{resource.name}}`, `{{job.assignments.*.resource.name}}`, `{{job.locations.1.address.postcode}}`

---

## Trigger Evaluation Engine

### Location
```
src/modules/notifications/lib/trigger-engine.ts
```

### Inngest Function

One Inngest function catches all job events and routes to trigger evaluation:

```typescript
// notifications.events.ts
export const evaluateNotificationTriggers = inngest.createFunction(
  { id: 'notifications/evaluate-triggers' },
  [
    { event: 'job/confirmed' },
    { event: 'job/completed' },
    { event: 'job/cancelled' },
    { event: 'job/created' },
    { event: 'job/reminder' },   // scheduled by confirmJob step
    // ... all job events
  ],
  async ({ event, step }) => {
    const triggers = await step.run('load-triggers', () =>
      notificationRepository.getActiveTriggers(event.data.tenantId, event.name)
    )

    for (const trigger of triggers) {
      await step.run(`evaluate-trigger-${trigger.id}`, async () => {
        const context = await buildContext(event.data)
        if (!evaluateCondition(trigger.condition, context)) return
        const recipients = resolveRecipients(trigger.recipientExpression, context)
        for (const recipient of recipients) {
          await dispatchNotification(trigger, recipient, context)
        }
      })
    }
  }
)
```

### Delay Handling

- `delayMinutes = 0` → send immediately in same Inngest step
- `delayMinutes > 0` → `inngest.send({ name: 'notifications/delayed', data: {...}, ts: now + delayMinutes * 60000 })`
- `delayMinutes < 0` → scheduled relative to `job.scheduledStart` (reminders): set absolute send time = `scheduledStart + delayMinutes * 60000`

---

## Migration: Hardcoded Triggers → DB Rows

The following triggers in `messaging/triggers.ts` become `notificationTriggers` rows:

| Old hardcoded trigger | New DB row |
|----------------------|------------|
| `triggerBookingCreated` (customer confirmation) | event: `job/created`, recipient: `customer.email`, delay: 0 |
| `triggerBookingConfirmed` (customer) | event: `job/confirmed`, recipient: `customer.email`, delay: 0 |
| `triggerBookingConfirmed` (staff) | event: `job/confirmed`, recipient: `job.assignments.*.resource.user.email`, delay: 0 |
| `triggerBookingCancelled` | event: `job/cancelled`, recipient: `customer.email`, delay: 0 |
| 24h reminder | event: `job/reminder`, recipient: `customer.email`, delay: -1440 |
| Venue notification | event: `job/confirmed`, recipient: `job.venue.email`, condition: `{locationType: VENUE}`, delay: 0 |
| Review request | event: `job/completed`, recipient: `customer.email`, delay: 1440 |

Email wrapping: the regex hack in `triggers.ts` (`if (/<!DOCTYPE|<html/).test(html)`) is deleted. Templates with `preWrapped = true` skip the wrapper. Templates with `preWrapped = false` get the tenant branding wrapper applied. This is a template metadata flag, not runtime detection.

---

## Module Structure

```
src/modules/notifications/
  notifications.types.ts      -- extend with Trigger, TriggerCondition
  notifications.schemas.ts    -- Zod schemas for trigger CRUD
  notifications.repository.ts -- trigger CRUD + getActiveTriggers query
  notifications.service.ts    -- dispatch logic (email/SMS/push/webhook)
  notifications.events.ts     -- updated: evaluateNotificationTriggers function
  notifications.router.ts     -- add trigger CRUD procedures
  lib/
    variable-resolver.ts      -- NEW
    trigger-engine.ts         -- NEW
    template-renderer.ts      -- NEW (extracted from service)
  __tests__/
    variable-resolver.test.ts -- NEW
    trigger-engine.test.ts    -- NEW
```

---

## Tests

`variable-resolver.test.ts`:
- Simple field: `customer.firstName` → `'Luke'`
- Nested field: `tenant.settings.businessName` → `'Ironheart'`
- Array wildcard: `job.assignments.*.resource.name` → `'Alice, Bob'`
- Date formatting: `job.scheduledStart` → `'15 Apr 2026'`
- Currency formatting: `invoice.totalAmount` → `'£150.00'`
- Unknown path returns `''` without throwing
- Negative index: `job.locations.1.address.postcode` → correct postcode

`trigger-engine.test.ts`:
- Trigger fires when event matches and no condition
- Trigger skipped when condition is false
- Trigger fires when condition is true
- Delay = 0: notification sent in same step
- Delay > 0: delayed Inngest event sent
- Delay < 0: reminder scheduled relative to scheduledStart
- Multiple recipients: all resolved correctly
- Trigger with recipient expression resolving to empty: no notification sent, no error

---

## Definition of Done

- [ ] `notificationTriggers` table created
- [ ] `notificationTemplates` extended with channel, preWrapped, replyToEmail, smsBody
- [ ] `variable-resolver.ts` implemented and tested
- [ ] `trigger-engine.ts` implemented and tested
- [ ] All existing hardcoded triggers migrated to DB rows (seeded per tenant)
- [ ] `messaging/triggers.ts` deleted
- [ ] Email wrapping regex hack deleted, replaced by `preWrapped` flag
- [ ] Venue notification template migrated from hardcoded HTML to DB template
- [ ] All existing notification tests updated and passing
- [ ] tsc passes, build passes
