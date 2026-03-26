# Outreach Module Design Spec

## Overview

A tracking and intelligence layer for manual cold outreach. The system tells you who to contact today, records what happened, tracks A/B performance by sector, and converts replied prospects into pipeline deals. No automated sending — you send manually from your inbox.

## Architecture Decision

**Approach B (Lean):** 3 tables, no pre-aggregated stats. Analytics computed on-the-fly from the activities table. At <5000 activities per tenant this is fast. Pre-aggregation can be added later as a materialised view if volume demands it.

## Data Model

### Enums

```sql
outreach_contact_status: ACTIVE | REPLIED | BOUNCED | OPTED_OUT | CONVERTED | PAUSED | COMPLETED
outreach_activity_type: SENT | REPLIED | BOUNCED | OPTED_OUT | SKIPPED | CALL_COMPLETED | MEETING_BOOKED | CONVERTED
outreach_channel: EMAIL | LINKEDIN_REQUEST | LINKEDIN_MESSAGE | CALL
```

### Table: `outreach_sequences`

A named playbook per sector/variant. Steps stored as JSONB.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | gen_random_uuid() |
| tenantId | uuid FK → tenants | NOT NULL |
| name | text | NOT NULL, e.g. "Recruitment - Variant A" |
| description | text | nullable |
| sector | text | NOT NULL, e.g. "recruitment", "commercial-cleaning" |
| targetIcp | text | nullable, free text ICP description |
| isActive | boolean | DEFAULT true |
| abVariant | text | nullable, 'A' or 'B' |
| pairedSequenceId | uuid FK → self | nullable, the other variant |
| steps | jsonb | NOT NULL, OutreachStep[] |
| archivedAt | timestamp | nullable, set when deactivated |
| createdAt | timestamp | |
| updatedAt | timestamp | |

CHECK constraint: `(abVariant IS NULL) OR (pairedSequenceId IS NOT NULL)`

Steps JSONB shape:
```ts
interface OutreachStep {
  position: number        // 1-based
  channel: 'EMAIL' | 'LINKEDIN_REQUEST' | 'LINKEDIN_MESSAGE' | 'CALL'
  delayDays: number       // days after previous step (0 = immediately)
  subject?: string        // email only
  bodyMarkdown: string    // template with {{firstName}}, {{company}}, {{sector}}
  notes?: string          // internal notes for the sender
}
```

Indexes: `(tenantId)`, `(tenantId, sector)`

### Table: `outreach_contacts`

A prospect enrolled in a sequence.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | gen_random_uuid() |
| tenantId | uuid FK → tenants | NOT NULL |
| customerId | uuid FK → customers | NOT NULL |
| sequenceId | uuid FK → outreach_sequences | NOT NULL |
| assignedUserId | uuid FK → users | nullable, who works this contact |
| status | outreach_contact_status enum | NOT NULL, DEFAULT 'ACTIVE' |
| currentStep | integer | DEFAULT 1, which step is next |
| nextDueAt | timestamp | nullable, when next step is due |
| enrolledAt | timestamp | NOT NULL |
| completedAt | timestamp | nullable |
| lastActivityAt | timestamp | nullable |
| pipelineMemberId | uuid FK → pipeline_members | nullable, set on CONVERTED |
| notes | text | nullable, freeform per-contact |
| createdAt | timestamp | |
| updatedAt | timestamp | |

Unique: `(tenantId, customerId, sequenceId)`
Indexes: `(tenantId, status, nextDueAt)`, `(sequenceId)`, `(customerId)`, `(assignedUserId)`

### Table: `outreach_activities`

Append-only event log. Never updated.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | gen_random_uuid() |
| tenantId | uuid FK → tenants | NOT NULL |
| contactId | uuid FK → outreach_contacts | NOT NULL |
| sequenceId | uuid | NOT NULL, denormalised |
| customerId | uuid | NOT NULL, denormalised |
| stepPosition | integer | which step this was |
| channel | text | NOT NULL |
| activityType | outreach_activity_type enum | NOT NULL |
| deliveredTo | text | nullable, email/LinkedIn URL used |
| notes | text | nullable |
| occurredAt | timestamp | DEFAULT now() |
| createdAt | timestamp | |

Indexes: `(tenantId, sequenceId, activityType, occurredAt DESC)`, `(contactId)`, `(tenantId, occurredAt)`

## State Machine

```
ACTIVE → REPLIED        (logActivity REPLIED)
ACTIVE → BOUNCED        (logActivity BOUNCED)
ACTIVE → OPTED_OUT      (logActivity OPTED_OUT)
ACTIVE → PAUSED         (explicit pause mutation)
ACTIVE → COMPLETED      (all steps exhausted, no reply)
COMPLETED → REPLIED     (late reply after sequence finished)
REPLIED → CONVERTED     (convert to pipeline deal)
PAUSED → ACTIVE         (resume, recomputes nextDueAt from now())
```

### Sequence Deactivation Behaviour

When `isActive` is set to false on a sequence:
- All ACTIVE contacts in that sequence are set to PAUSED
- `archivedAt` is set to now()
- Reactivating sets `isActive = true`, clears `archivedAt`, but does NOT auto-resume contacts (manual resume required)

## Template Variable Resolution

Variables resolved at render time via `outreach.contact.getBody`:
- `{{firstName}}` — from customers.firstName
- `{{lastName}}` — from customers.lastName
- `{{company}}` — from customer tags matching prefix `company:`
- `{{sector}}` — from outreach_sequences.sector (NOT from customer)

### Security: Template Injection Prevention

Before substitution, all resolved values are sanitised:
- Replace `{{` with `{ {` and `}}` with `} }` in values
- This prevents customer data containing template markers from being interpreted

## Router (tRPC)

All procedures gated by `createModuleMiddleware("outreach")`.

### Sequences
- `outreach.sequence.list` — tenantProcedure, query
- `outreach.sequence.getById` — tenantProcedure, query
- `outreach.sequence.create` — permissionProcedure("outreach:write"), mutation
- `outreach.sequence.update` — permissionProcedure("outreach:write"), mutation
- `outreach.sequence.archive` — permissionProcedure("outreach:write"), mutation (sets isActive=false, pauses contacts)

### Contacts
- `outreach.contact.enroll` — permissionProcedure("outreach:write"), mutation
- `outreach.contact.list` — tenantProcedure, query (filters: status, sequenceId, assignedUserId, search, cursor, limit)
- `outreach.contact.getById` — tenantProcedure, query
- `outreach.contact.getBody` — tenantProcedure, query (contactId, stepPosition?) → rendered subject + body
- `outreach.contact.logActivity` — permissionProcedure("outreach:write"), mutation (contactId, activityType, notes?, deliveredTo?)
- `outreach.contact.convert` — permissionProcedure("outreach:write"), mutation (contactId, pipelineId, stageId, dealValue?)
- `outreach.contact.pause` — permissionProcedure("outreach:write"), mutation
- `outreach.contact.resume` — permissionProcedure("outreach:write"), mutation

### Dashboard & Analytics
- `outreach.dashboard.get` — tenantProcedure, query (single call for morning cockpit)
- `outreach.analytics.sequences` — tenantProcedure, query (dateFrom?, dateTo?, sector?)
- `outreach.analytics.sectors` — tenantProcedure, query (dateFrom?, dateTo?)

### LogActivity Input (minimal for speed)

```ts
{
  contactId: z.uuid(),
  activityType: z.enum([...]),
  notes: z.string().max(500).optional(),
  deliveredTo: z.string().max(200).optional(),
}
```

The service resolves sequenceId, stepPosition, channel, customerId from the contact record. The caller does not pass them.

## Service Layer Key Flows

### enrollContact(ctx, { customerId, sequenceId, assignedUserId?, notes? })
1. Validate customer exists
2. Get sequence, validate isActive
3. Compute nextDueAt = now() + steps[0].delayDays * 86400s (if delayDays=0, due immediately)
4. Insert outreach_contacts with status ACTIVE
5. Emit `outreach/contact.enrolled`

### logActivity(ctx, { contactId, activityType, notes?, deliveredTo? })
1. Get contact, validate tenant, validate not BOUNCED/OPTED_OUT
2. Insert activity record (service populates sequenceId, customerId, stepPosition, channel from contact+sequence)
3. State transitions:
   - SENT → advance currentStep, compute nextDueAt from next step; if no next step, status → COMPLETED
   - REPLIED → status → REPLIED (works from ACTIVE or COMPLETED), clear nextDueAt
   - BOUNCED → status → BOUNCED, clear nextDueAt, set completedAt
   - OPTED_OUT → status → OPTED_OUT, clear nextDueAt, set completedAt
   - SKIPPED → advance to next step (same as SENT but no email was sent)
   - CALL_COMPLETED → same as SENT (advances step)
   - MEETING_BOOKED → status → REPLIED (implies positive engagement)
4. Emit `outreach/activity.logged`

### convertContact(ctx, { contactId, pipelineId, stageId, dealValue? })
1. Validate contact status is REPLIED
2. Call pipelineService.addMember(ctx, { pipelineId, customerId, stageId, metadata: { source: 'outreach', sequenceId } })
3. Update contact: status → CONVERTED, pipelineMemberId, completedAt
4. Log CONVERTED activity
5. Emit `outreach/contact.converted`

### getDashboard(ctx)
1. Due contacts: status=ACTIVE AND nextDueAt <= now(), JOIN customers for name/email, JOIN sequences for step template. Ordered by nextDueAt ASC, limit 50.
2. Overdue: same but nextDueAt < startOfToday
3. Recent replies: status=REPLIED, ordered by lastActivityAt DESC, limit 10
4. Today's stats: COUNT from activities WHERE occurredAt >= startOfToday, GROUP BY activityType

### getBodyForStep(ctx, { contactId, stepPosition? })
1. Load contact + sequence
2. Use stepPosition or contact.currentStep
3. Load customer record
4. Sanitise values (escape `{{`/`}}` in resolved data)
5. Replace {{firstName}}, {{company}}, {{sector}} in step.bodyMarkdown and step.subject
6. Return { subject, body, channel, notes }

### archiveSequence(ctx, { sequenceId })
1. Set isActive = false, archivedAt = now()
2. UPDATE all outreach_contacts WHERE sequenceId AND status = 'ACTIVE' SET status = 'PAUSED'

## Inngest Events

Add to src/shared/inngest.ts:

```ts
"outreach/contact.enrolled": {
  data: { contactId: string; customerId: string; sequenceId: string; tenantId: string }
}
"outreach/activity.logged": {
  data: { activityId: string; contactId: string; sequenceId: string; customerId: string; activityType: string; sector: string; tenantId: string }
}
"outreach/contact.converted": {
  data: { contactId: string; customerId: string; sequenceId: string; pipelineMemberId: string; tenantId: string }
}
```

### Inngest Functions

1. `onActivityLogged` — fan-out to workflow engine: sends `workflow/trigger` so users can build automations on outreach events
2. `onContactConverted` — log event, future hook for post-conversion workflows

No cron jobs.

## Integration Points

- **Customer module**: prospects are customers. Outreach references customerId. No schema changes to customer.
- **Pipeline module**: convert calls pipelineService.addMember() synchronously for atomicity, then emits async event.
- **Workflow engine**: outreach events fire workflow triggers. No changes to workflow module.
- **No schema changes needed to existing tables.**

## Module Manifest

```ts
slug: "outreach"
name: "Outreach"
category: "operations"
dependencies: ["customer", "pipeline"]
isCore: false
availability: "addon"
permissions: ["outreach:read", "outreach:write"]
eventsProduced: ["outreach/contact.enrolled", "outreach/activity.logged", "outreach/contact.converted"]
eventsConsumed: []
```

## Files to Create

```
src/shared/db/schemas/outreach.schema.ts
src/modules/outreach/outreach.types.ts
src/modules/outreach/outreach.schemas.ts
src/modules/outreach/outreach.repository.ts
src/modules/outreach/outreach.service.ts
src/modules/outreach/outreach.router.ts
src/modules/outreach/outreach.events.ts
src/modules/outreach/outreach.manifest.ts
src/modules/outreach/index.ts
src/modules/outreach/__tests__/outreach.test.ts
```

## Files to Modify

```
src/shared/db/schema.ts — add outreach schema exports
src/shared/inngest.ts — add 3 outreach events
src/server/root.ts — add outreach: outreachRouter
src/shared/module-system/register-all.ts — register outreach manifest
```

## Build Phases

Phase 1: Schema + Types + Schemas (Zod)
Phase 2: Repository + Service
Phase 3: Router + Events + Manifest + Index
Phase 4: Wiring (root router, inngest, module registry, schema barrel)
Phase 5: Tests
