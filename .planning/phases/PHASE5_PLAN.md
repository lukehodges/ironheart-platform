# Phase 5: Remaining Modules

**Goal:** Extract every remaining god router into `src/modules/`. After Phase 5, `src/server/routers/` is empty, all business logic lives in module services, and the platform is fully generic — zero client-specific code.

**Duration:** 2–3 days
**Depends on:** Phase 1 (booking patterns established), Phase 3 (WorkOS auth context available)

---

## Modules to Implement

| Module | Source in Legacy | Approx LOC | Notes |
|--------|-----------------|------------|-------|
| `team/` | `staff.ts` (1,317) | ~1,400 | User model (isTeamMember: true), availability, capacity |
| `customer/` | `customer.ts` (477) | ~500 | CRUD + notes + merge |
| `forms/` | `forms.ts` (686) | ~700 | Intake form builder + responses |
| `review/` | `review.ts` (737) | ~800 | Review automation + request flow |
| `workflow/` | `workflow.ts` (813) + `src/lib/workflow/` (~3,200) | ~1,200 new | Event-driven; replaces EventEmitter bus |
| `tenant/` | `settings.ts` (538), `venue.ts`, `dashboard.ts`, `features.ts`, `modules.ts` | ~1,600 | Multi-tenant config + modules |
| `platform/` | `platform.ts` (450) | ~500 | Super-admin: tenant CRUD, plan management |

**Also copy as stubs** (no split needed): `addon.ts` → `src/modules/addon/`, `service.ts` → `src/modules/service-catalog/`, `export.ts` → `src/modules/export/`, `communications.ts` → `src/modules/communications/`

---

## Key Design Decisions

### KDD-1: Generic Platform — No Client Code
All modules must be industry-agnostic. No hardcoded party/medical/salon logic. Business behaviour is driven by tenant configuration stored in the database. Portal templates are generic; content is configured via tenant settings.

### KDD-2: Follow Booking Module Patterns (Phase 1)
Each module uses:
- `{module}.schemas.ts` — Zod validation schemas
- `{module}.repository.ts` — all Drizzle queries isolated here
- `{module}.service.ts` — business logic; calls repository
- `{module}.router.ts` — thin: validate → call service → return
- `{module}.events.ts` — Inngest handlers (if async work needed)
- `index.ts` — barrel export of router

No business logic in routers. No DB calls in services. No side effects outside of Inngest events.

### KDD-3: Workflow Engine as Inngest Step Functions
The legacy `src/lib/workflow/event-bus.ts` (EventEmitter) is deleted. Each workflow action becomes an Inngest step function with:
- Retry semantics (3 attempts)
- Full observability in Inngest dashboard
- Cancel-on triggers where applicable

Workflow definitions are stored in the DB (`workflows` table). The engine reads the definition and dispatches Inngest events per action type.

### KDD-4: Team Module Uses `User` with `isTeamMember: true`
The `Staff` model was merged into `User` in a prior migration. Team module queries must always filter `isTeamMember: true`. Never query `users` without this filter when looking for team members.

### KDD-5: Tenant Module Owns Module Enable/Disable
The `TenantModule` table controls which features are active per tenant. The tenant service exposes `isModuleEnabled(tenantId, moduleKey)`. All feature-gated procedures should call this before executing.

### KDD-6: Platform Module is OWNER-only
All platform procedures are protected by `PLATFORM_ADMIN` DB flag (not an env variable). The tRPC middleware checks `user.isPlatformAdmin` before allowing access. This replaces the legacy `PLATFORM_ADMIN_EMAILS` env variable (see Phase 6 KDD).

---

## Phase 5 Tasks

### PHASE5-T1: Team Module (team/)

**Files to create:**
```
src/modules/team/
  team.schemas.ts
  team.repository.ts
  team.service.ts
  team.router.ts
  team.types.ts
  index.ts
```

**Schemas (`team.schemas.ts`):**
```typescript
import { z } from 'zod'

export const staffStatusSchema = z.enum(['ACTIVE', 'ON_LEAVE', 'UNAVAILABLE', 'TERMINATED'])
export const employeeTypeSchema = z.enum(['EMPLOYEE', 'CONTRACTOR', 'FREELANCER'])

export const createTeamMemberSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  jobTitle: z.string().optional(),
  employeeType: employeeTypeSchema.default('EMPLOYEE'),
  serviceIds: z.array(z.string().uuid()).optional(),
  hourlyRate: z.number().positive().optional(),
  dayRate: z.number().positive().optional(),
  mileageRate: z.number().positive().optional(),
  maxDailyBookings: z.number().int().positive().optional(),
  maxConcurrentBookings: z.number().int().positive().default(1),
  startDate: z.date().optional(),
  bio: z.string().optional(),
  sendInvite: z.boolean().default(true),
})

export const updateTeamMemberSchema = z.object({
  id: z.string().uuid(),
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  phone: z.string().optional().nullable(),
  jobTitle: z.string().optional().nullable(),
  employeeType: employeeTypeSchema.optional(),
  serviceIds: z.array(z.string().uuid()).optional(),
  hourlyRate: z.number().positive().optional().nullable(),
  dayRate: z.number().positive().optional().nullable(),
  mileageRate: z.number().positive().optional().nullable(),
  maxDailyBookings: z.number().int().positive().optional().nullable(),
  maxConcurrentBookings: z.number().int().positive().optional(),
  bio: z.string().optional().nullable(),
  staffStatus: staffStatusSchema.optional(),
})

export const listTeamMembersSchema = z.object({
  staffStatus: staffStatusSchema.optional(),
  serviceId: z.string().uuid().optional(),
  search: z.string().optional(),
  limit: z.number().min(1).max(100).default(50),
  cursor: z.string().uuid().optional(),
})

export const setAvailabilitySchema = z.object({
  userId: z.string().uuid(),
  slots: z.array(z.object({
    dayOfWeek: z.number().int().min(0).max(6),
    startTime: z.string().regex(/^\d{2}:\d{2}$/),
    endTime: z.string().regex(/^\d{2}:\d{2}$/),
  })),
})
```

**Repository (`team.repository.ts`):**
- `findById(tenantId, userId)` — `WHERE id = ? AND tenantId = ? AND isTeamMember = true`
- `list(tenantId, filters)` — paginated list with search, status filter
- `create(tenantId, input)` — `INSERT INTO users` with `isTeamMember: true`, `userType: 'MEMBER'`
- `update(tenantId, userId, input)` — `UPDATE users SET ...`
- `deactivate(tenantId, userId)` — set `staffStatus: 'TERMINATED'`, `status: 'SUSPENDED'`
- `getAvailability(tenantId, userId)` — query `userAvailability`
- `setAvailability(tenantId, userId, slots)` — delete + re-insert `userAvailability` rows
- `getCapacity(tenantId, userId, date)` — query `userCapacity`
- `getAssignedBookings(tenantId, userId, startDate, endDate)` — join `bookingAssignments`

**Service (`team.service.ts`):**
- `createTeamMember(tenantId, input, createdById)` — create user, send WorkOS invite if `sendInvite: true` (via `inngest.send("team/invite.send", ...)`)
- `updateTeamMember(tenantId, userId, input, updatedById)` — validate, update
- `deactivateTeamMember(tenantId, userId, deactivatedById)` — set terminated, emit `inngest.send("team/member.deactivated", ...)`
- `getTeamMemberWithAvailability(tenantId, userId)` — fetch user + availability + recent bookings
- `setAvailability(tenantId, userId, slots)` — validate no overlaps, upsert
- `listTeamMembers(tenantId, filters)` — delegate to repository

**Router (`team.router.ts`):**
```typescript
export const teamRouter = router({
  list: permissionProcedure('team:read').input(listTeamMembersSchema).query(...),
  getById: permissionProcedure('team:read').input(z.object({ id: z.string().uuid() })).query(...),
  create: permissionProcedure('team:create').input(createTeamMemberSchema).mutation(...),
  update: permissionProcedure('team:update').input(updateTeamMemberSchema).mutation(...),
  deactivate: permissionProcedure('team:delete').input(z.object({ id: z.string().uuid() })).mutation(...),
  getAvailability: permissionProcedure('team:read').input(z.object({ id: z.string().uuid() })).query(...),
  setAvailability: permissionProcedure('team:update').input(setAvailabilitySchema).mutation(...),
})
```

**Inngest events (`team.events.ts`):**
```typescript
// team/invite.send — stub: Phase 4 WorkOS org invite
export const sendTeamInvite = inngest.createFunction(
  { id: 'send-team-invite' },
  { event: 'team/invite.send' },
  async ({ event }) => {
    const { userId, email, tenantId } = z.object({
      userId: z.string().uuid(),
      email: z.string().email(),
      tenantId: z.string().uuid(),
    }).parse(event.data)
    log.info({ userId, email }, 'TODO Phase 4: send WorkOS org invite')
  }
)
```

**Verify:** Admin team list loads. Create/update/deactivate works. Availability sets correctly. RBAC: MEMBER users cannot manage team.

---

### PHASE5-T2: Customer Module (customer/)

**Files to create:**
```
src/modules/customer/
  customer.schemas.ts
  customer.repository.ts
  customer.service.ts
  customer.router.ts
  index.ts
```

**Schemas:**
```typescript
export const createCustomerSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: addressSchema.optional(),
  dateOfBirth: z.date().optional(),
  marketingConsent: z.boolean().default(false),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
})

export const updateCustomerSchema = createCustomerSchema.partial().extend({
  id: z.string().uuid(),
})

export const listCustomersSchema = z.object({
  search: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'BLOCKED']).optional(),
  tags: z.array(z.string()).optional(),
  limit: z.number().min(1).max(100).default(50),
  cursor: z.string().uuid().optional(),
})

export const mergeCustomersSchema = z.object({
  sourceId: z.string().uuid(),
  targetId: z.string().uuid(), // keep this record
})

export const addCustomerNoteSchema = z.object({
  customerId: z.string().uuid(),
  type: z.enum(['GENERAL', 'CLINICAL', 'ADMIN', 'FOLLOW_UP']),
  content: z.string().min(1),
  isPrivate: z.boolean().default(false),
})
```

**Repository:**
- `findById(tenantId, customerId)` — standard tenant-scoped find
- `findByEmail(tenantId, email)` — for dedup check on create
- `list(tenantId, filters)` — cursor-paginated with full-text search on name/email/phone
- `create(tenantId, input)` — insert customer
- `update(tenantId, customerId, input)` — update
- `merge(tenantId, sourceId, targetId)` — re-parent all bookings/forms/reviews to targetId, delete source
- `addNote(tenantId, customerId, input)` — insert `customerNote`
- `listNotes(tenantId, customerId)` — fetch notes ordered by createdAt desc
- `getWithBookings(tenantId, customerId)` — customer + recent bookings + stats
- `anonymise(tenantId, customerId)` — GDPR: set name/email/phone to hashed/null (Phase 6 full impl)

**Service:**
- `createCustomer(tenantId, input)` — dedup check by email, create
- `updateCustomer(tenantId, customerId, input)` — update, emit `inngest.send("customer/updated", ...)`
- `mergeCustomers(tenantId, sourceId, targetId)` — validate both exist, call repo.merge
- `blockCustomer(tenantId, customerId, reason)` — set status = BLOCKED
- `addNote(tenantId, customerId, input, addedById)` — create note
- `listCustomers(tenantId, filters)` — delegate
- `getCustomerProfile(tenantId, customerId)` — fetch with bookings, notes, form responses

**Router:**
```typescript
export const customerRouter = router({
  list: permissionProcedure('customers:read').input(listCustomersSchema).query(...),
  getById: permissionProcedure('customers:read').input(...).query(...),
  getProfile: permissionProcedure('customers:read').input(...).query(...),
  create: permissionProcedure('customers:create').input(createCustomerSchema).mutation(...),
  update: permissionProcedure('customers:update').input(updateCustomerSchema).mutation(...),
  block: permissionProcedure('customers:update').input(...).mutation(...),
  merge: permissionProcedure('customers:delete').input(mergeCustomersSchema).mutation(...),
  addNote: permissionProcedure('customers:update').input(addCustomerNoteSchema).mutation(...),
  listNotes: permissionProcedure('customers:read').input(...).query(...),
})
```

**Verify:** Customer list, create, update work. Merge re-parents bookings. Notes attach. RBAC enforced.

---

### PHASE5-T3: Forms Module (forms/)

**Files to create:**
```
src/modules/forms/
  forms.schemas.ts
  forms.repository.ts
  forms.service.ts
  forms.router.ts
  index.ts
```

**Schemas:**
```typescript
export const formFieldSchema = z.object({
  id: z.string(),
  type: z.enum(['TEXT', 'TEXTAREA', 'SELECT', 'CHECKBOX', 'DATE', 'PHONE', 'EMAIL', 'NUMBER']),
  label: z.string().min(1),
  placeholder: z.string().optional(),
  required: z.boolean().default(false),
  options: z.array(z.string()).optional(), // for SELECT
  validation: z.object({ min: z.number().optional(), max: z.number().optional() }).optional(),
  order: z.number().int(),
})

export const createFormSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  serviceIds: z.array(z.string().uuid()).optional(), // auto-send to these services
  sendTiming: z.enum(['ON_BOOKING', 'HOURS_24_BEFORE', 'DAYS_1_BEFORE', 'MANUAL']).default('ON_BOOKING'),
  fields: z.array(formFieldSchema).min(1),
  isActive: z.boolean().default(true),
})

export const submitFormResponseSchema = z.object({
  formInstanceId: z.string().uuid(),
  responses: z.record(z.string(), z.string()),
})
```

**Service:**
- `createForm(tenantId, input, createdById)` — create form + fields
- `updateForm(tenantId, formId, input)` — update form definition
- `deleteForm(tenantId, formId)` — soft delete (deactivate)
- `getFormWithFields(tenantId, formId)` — form + ordered fields
- `listForms(tenantId, filters)` — list with service associations
- `sendFormToBooking(tenantId, bookingId, formId)` — create `FormInstance` with status PENDING, emit `inngest.send("forms/send.email", ...)`
- `submitFormResponse(tenantId, formInstanceId, responses)` — validate against form definition, save `FormResponse` rows, update instance status to COMPLETED
- `getFormResponses(tenantId, bookingId)` — all form responses for a booking

**Router:**
```typescript
export const formsRouter = router({
  list: permissionProcedure('forms:read').query(...),
  getById: permissionProcedure('forms:read').input(...).query(...),
  create: permissionProcedure('forms:create').input(createFormSchema).mutation(...),
  update: permissionProcedure('forms:update').input(...).mutation(...),
  delete: permissionProcedure('forms:delete').input(...).mutation(...),
  sendToBooking: permissionProcedure('forms:create').input(...).mutation(...),
  // Public — customer submits form response via token
  getFormInstance: publicProcedure.input(z.object({ token: z.string() })).query(...),
  submitResponse: publicProcedure.input(submitFormResponseSchema).mutation(...),
  // Protected — view responses
  getResponsesForBooking: permissionProcedure('forms:read').input(...).query(...),
})
```

**Verify:** Create form with fields. Send to booking. Customer submits via public endpoint. Responses visible in admin.

---

### PHASE5-T4: Review Module (review/)

**Files to create:**
```
src/modules/review/
  review.schemas.ts
  review.repository.ts
  review.service.ts
  review.router.ts
  review.events.ts
  index.ts
```

**Schemas:**
```typescript
export const createReviewRequestSchema = z.object({
  bookingId: z.string().uuid(),
  customerId: z.string().uuid(),
  channel: z.enum(['EMAIL', 'SMS']).default('EMAIL'),
  timing: z.enum(['HOURS_2', 'HOURS_24', 'DAYS_3']).default('HOURS_24'),
})

export const submitReviewSchema = z.object({
  token: z.string().length(64), // confirmation token pattern
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(2000).optional(),
  isPublic: z.boolean().default(false),
})

export const resolveIssueSchema = z.object({
  reviewId: z.string().uuid(),
  resolution: z.enum(['CONTACTED', 'RESOLVED', 'DISMISSED']),
  notes: z.string().optional(),
})
```

**Service:**
- `requestReview(tenantId, input)` — create `ReviewRequest`, generate token, emit `inngest.send("review/request.send", { delay: timing })`
- `submitReview(token, input)` — verify token, create `Review`, update request status to COMPLETED, emit `inngest.send("review/submitted", ...)`
- `listReviews(tenantId, filters)` — list with rating/source filter
- `resolveIssue(tenantId, reviewId, input, resolvedById)` — update `ReviewIssue` resolution status
- `getStats(tenantId)` — avg rating, count by star, response rate

**Inngest events (`review.events.ts`):**
```typescript
// review/request.send — schedules the send at the correct delay
export const scheduleReviewRequest = inngest.createFunction(
  { id: 'schedule-review-request' },
  { event: 'review/request.send' },
  async ({ event, step }) => {
    const { bookingId, customerId, delay } = z.object({
      bookingId: z.string().uuid(),
      customerId: z.string().uuid(),
      delay: z.string().optional(),
    }).parse(event.data)

    if (delay) await step.sleep('wait-for-delay', delay)

    await step.run('send-review-request', async () => {
      // Phase 4: send via Resend/Twilio
      log.info({ bookingId, customerId }, 'TODO Phase 4: send review request')
    })
  }
)
```

**Router:**
```typescript
export const reviewRouter = router({
  list: permissionProcedure('reviews:read').input(listReviewsSchema).query(...),
  getStats: permissionProcedure('reviews:read').query(...),
  request: permissionProcedure('reviews:create').input(createReviewRequestSchema).mutation(...),
  resolveIssue: permissionProcedure('reviews:update').input(resolveIssueSchema).mutation(...),
  // Public — customer submits review via email link
  getReviewForm: publicProcedure.input(z.object({ token: z.string() })).query(...),
  submit: publicProcedure.input(submitReviewSchema).mutation(...),
})
```

**Verify:** Review request created on booking complete. Public submit works. Stats aggregate correctly. Issue resolution updates correctly.

---

### PHASE5-T5: Workflow Module (workflow/)

**Files to create:**
```
src/modules/workflow/
  workflow.schemas.ts
  workflow.repository.ts
  workflow.service.ts
  workflow.router.ts
  workflow.events.ts   ← replaces EventEmitter bus
  engine/
    workflow.engine.ts  ← reads DB definition, dispatches Inngest events
  index.ts
```

**Schemas:**
```typescript
export const workflowTriggerSchema = z.enum([
  'BOOKING_CREATED', 'BOOKING_CONFIRMED', 'BOOKING_CANCELLED',
  'BOOKING_COMPLETED', 'BOOKING_REMINDER_24H', 'PAYMENT_RECEIVED',
])

export const workflowActionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('SEND_EMAIL'), templateId: z.string(), delay: z.string().optional() }),
  z.object({ type: z.literal('SEND_SMS'), templateId: z.string(), delay: z.string().optional() }),
  z.object({ type: z.literal('CREATE_TASK'), title: z.string(), assigneeId: z.string().uuid().optional() }),
  z.object({ type: z.literal('UPDATE_BOOKING_STATUS'), status: z.string() }),
  z.object({ type: z.literal('WEBHOOK'), url: z.string().url(), method: z.enum(['POST', 'PUT']) }),
  z.object({ type: z.literal('SEND_NOTIFICATION'), message: z.string() }),
])

export const createWorkflowSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  trigger: workflowTriggerSchema,
  conditions: z.array(z.object({
    field: z.string(),
    operator: z.enum(['equals', 'not_equals', 'contains', 'greater_than', 'less_than']),
    value: z.string(),
  })).optional(),
  actions: z.array(workflowActionSchema).min(1),
  isActive: z.boolean().default(true),
})
```

**Engine (`workflow.engine.ts`):**
```typescript
import { db } from '@/shared/db'
import { workflows } from '@/shared/db/schema'
import { inngest } from '@/shared/inngest'
import { eq, and } from 'drizzle-orm'

export async function triggerWorkflows(
  tenantId: string,
  trigger: string,
  data: Record<string, unknown>
): Promise<void> {
  const activeWorkflows = await db
    .select()
    .from(workflows)
    .where(and(eq(workflows.tenantId, tenantId), eq(workflows.trigger, trigger), eq(workflows.isActive, true)))

  for (const workflow of activeWorkflows) {
    await inngest.send({
      name: 'workflow/trigger',
      data: { workflowId: workflow.id, trigger, tenantData: data, tenantId },
    })
  }
}
```

**Inngest events (`workflow.events.ts`):**
```typescript
// workflow/trigger — executes each action in sequence as Inngest steps
export const executeWorkflow = inngest.createFunction(
  { id: 'execute-workflow', retries: 3 },
  { event: 'workflow/trigger' },
  async ({ event, step }) => {
    const { workflowId, tenantId, tenantData } = workflowTriggerEventSchema.parse(event.data)

    const workflow = await step.run('load-workflow', () => workflowRepository.findById(workflowId))
    if (!workflow || !workflow.isActive) return

    for (const [index, action] of workflow.actions.entries()) {
      await step.run(`action-${index}-${action.type}`, async () => {
        await executeAction(tenantId, action, tenantData)
      })
    }

    await step.run('record-execution', () =>
      workflowRepository.recordExecution(workflowId, 'COMPLETED', tenantData)
    )
  }
)

async function executeAction(tenantId: string, action: WorkflowAction, data: Record<string, unknown>) {
  switch (action.type) {
    case 'SEND_EMAIL':
      await inngest.send({ name: 'notification/send.email', data: { to: '', templateId: action.templateId, variables: data as Record<string, string> } })
      break
    case 'SEND_SMS':
      await inngest.send({ name: 'notification/send.sms', data: { to: '', templateId: action.templateId, variables: data as Record<string, string> } })
      break
    case 'WEBHOOK':
      // Phase 6: add HMAC signing
      await fetch(action.url, { method: action.method, body: JSON.stringify(data) })
      break
    default:
      log.warn({ actionType: action.type }, 'Unimplemented workflow action type')
  }
}
```

**Service:**
- `createWorkflow(tenantId, input, createdById)` — create workflow + actions
- `updateWorkflow(tenantId, workflowId, input)` — update
- `toggleWorkflow(tenantId, workflowId, isActive)` — enable/disable
- `deleteWorkflow(tenantId, workflowId)` — soft delete
- `listWorkflows(tenantId)` — all workflows with execution stats
- `getExecutionHistory(tenantId, workflowId)` — last 50 executions

**Key integration point:** The booking service and other services call `triggerWorkflows(tenantId, trigger, data)` at key events (booking confirmed, completed, etc). This replaces the old EventEmitter `event-bus.ts` calls.

**Delete after verify:** `src/lib/workflow/event-bus.ts`

**Router:**
```typescript
export const workflowRouter = router({
  list: permissionProcedure('workflows:read').query(...),
  getById: permissionProcedure('workflows:read').input(...).query(...),
  create: permissionProcedure('workflows:create').input(createWorkflowSchema).mutation(...),
  update: permissionProcedure('workflows:update').input(...).mutation(...),
  toggle: permissionProcedure('workflows:update').input(z.object({ id: z.string().uuid(), isActive: z.boolean() })).mutation(...),
  delete: permissionProcedure('workflows:delete').input(z.object({ id: z.string().uuid() })).mutation(...),
  getExecutionHistory: permissionProcedure('workflows:read').input(z.object({ id: z.string().uuid() })).query(...),
})
```

**Verify:** Workflow triggers on booking completion. Each action fires as Inngest step. Execution history recorded. Toggle active/inactive works.

---

### PHASE5-T6: Tenant Module (tenant/)

**Files to create:**
```
src/modules/tenant/
  tenant.schemas.ts
  tenant.repository.ts
  tenant.service.ts
  tenant.router.ts
  index.ts
```

**Covers:** settings, venue management, dashboard stats, feature flags, module enable/disable

**Schemas:**
```typescript
export const updateTenantSettingsSchema = z.object({
  businessName: z.string().min(1).optional(),
  businessEmail: z.string().email().optional(),
  businessPhone: z.string().optional(),
  address: addressSchema.optional(),
  timezone: z.string().optional(),
  currency: z.string().length(3).optional(), // ISO 4217
  dateFormat: z.string().optional(),
  timeFormat: z.enum(['12h', '24h']).optional(),
  bookingLeadTimeMins: z.number().int().min(0).optional(),
  bookingWindowDays: z.number().int().min(1).optional(),
  requiresApproval: z.boolean().optional(),
  autoConfirmBookings: z.boolean().optional(),
  reminderEnabled: z.boolean().optional(),
  reminderHoursBefore: z.number().int().min(1).optional(),
})

export const createVenueSchema = z.object({
  name: z.string().min(1),
  address: addressSchema,
  phone: z.string().optional(),
  email: z.string().email().optional(),
  capacity: z.number().int().positive().optional(),
  isDefault: z.boolean().default(false),
})

export const toggleModuleSchema = z.object({
  moduleKey: z.string().min(1),
  enabled: z.boolean(),
})
```

**Repository:**
- `findTenantBySlug(slug)` — for portal slug resolution (with Redis cache in Phase 6)
- `findTenantById(id)` — tenant row
- `getSettings(tenantId)` — all settings as key/value map
- `updateSettings(tenantId, updates)` — upsert settings rows
- `listVenues(tenantId)` — all venues
- `createVenue(tenantId, input)` — insert venue
- `updateVenue(tenantId, venueId, input)` — update
- `deleteVenue(tenantId, venueId)` — soft delete
- `getEnabledModules(tenantId)` — list of enabled module keys
- `toggleModule(tenantId, moduleKey, enabled)` — upsert `TenantModule` row
- `getDashboardStats(tenantId)` — bookings today, revenue MTD, team utilisation (from real data)

**Service:**
- `getTenantSettings(tenantId)` — merge default settings with tenant overrides
- `updateSettings(tenantId, input, updatedById)` — validate, upsert, audit log
- `isModuleEnabled(tenantId, moduleKey)` — check enabled modules
- `getVenues(tenantId)` — list venues
- `createVenue(tenantId, input, createdById)` — create
- `getDashboardStats(tenantId)` — aggregate real stats (replaces mock analytics)

**Router:**
```typescript
export const tenantRouter = router({
  // Settings
  getSettings: tenantProcedure.query(...),
  updateSettings: permissionProcedure('settings:write').input(updateTenantSettingsSchema).mutation(...),

  // Venues
  listVenues: tenantProcedure.query(...),
  createVenue: permissionProcedure('settings:write').input(createVenueSchema).mutation(...),
  updateVenue: permissionProcedure('settings:write').input(...).mutation(...),
  deleteVenue: permissionProcedure('settings:write').input(...).mutation(...),

  // Modules
  getEnabledModules: tenantProcedure.query(...),
  toggleModule: permissionProcedure('settings:write').input(toggleModuleSchema).mutation(...),

  // Dashboard
  getDashboardStats: tenantProcedure.query(...),
})
```

**Verify:** Settings update persists. Venue CRUD works. Module toggle enables/disables correctly. Dashboard stats show real data.

---

### PHASE5-T7: Platform Module (platform/)

**Files to create:**
```
src/modules/platform/
  platform.schemas.ts
  platform.repository.ts
  platform.service.ts
  platform.router.ts
  index.ts
```

**Purpose:** Super-admin operations across all tenants. Accessible only to users with `isPlatformAdmin: true` in the `users` table.

**Schemas:**
```typescript
export const createTenantSchema = z.object({
  businessName: z.string().min(1),
  slug: z.string().regex(/^[a-z0-9-]+$/).min(2),
  ownerEmail: z.string().email(),
  ownerFirstName: z.string().min(1),
  ownerLastName: z.string().min(1),
  plan: z.enum(['STARTER', 'PROFESSIONAL', 'BUSINESS', 'ENTERPRISE', 'CUSTOM']).default('STARTER'),
  timezone: z.string().default('Europe/London'),
  trialDays: z.number().int().min(0).default(14),
})

export const updateTenantPlanSchema = z.object({
  tenantId: z.string().uuid(),
  plan: z.enum(['STARTER', 'PROFESSIONAL', 'BUSINESS', 'ENTERPRISE', 'CUSTOM']),
  notes: z.string().optional(),
})

export const suspendTenantSchema = z.object({
  tenantId: z.string().uuid(),
  reason: z.string().min(1),
})
```

**Middleware — platform admin guard:**
```typescript
// In src/shared/trpc.ts (add alongside existing procedures)
export const platformProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.user?.isPlatformAdmin) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Platform admin access required' })
  }
  return next()
})
```

**Repository:**
- `listTenants(filters)` — all tenants with status, plan, booking count
- `findTenantById(id)` — full tenant row
- `createTenant(input)` — create tenant + owner user + default modules in a transaction
- `updateTenantStatus(tenantId, status)` — ACTIVE/SUSPENDED/CANCELLED
- `updateTenantPlan(tenantId, plan)` — plan change
- `getTenantMetrics(tenantId)` — bookings count, revenue, team size
- `getPlatformMetrics()` — total tenants, MRR, active bookings

**Service:**
- `createTenant(input)` — create tenant, send owner WorkOS invite (via Inngest), enable default modules (booking-core)
- `suspendTenant(tenantId, reason, suspendedById)` — status = SUSPENDED, emit `inngest.send("platform/tenant.suspended", ...)`
- `reactivateTenant(tenantId, reactivatedById)` — status = ACTIVE
- `changePlan(tenantId, plan, changedById)` — update plan, audit log
- `listTenants(filters)` — paginated with search, status filter
- `getPlatformOverview()` — aggregate metrics

**Router:**
```typescript
export const platformRouter = router({
  listTenants: platformProcedure.input(listTenantsSchema).query(...),
  getTenant: platformProcedure.input(z.object({ id: z.string().uuid() })).query(...),
  createTenant: platformProcedure.input(createTenantSchema).mutation(...),
  suspendTenant: platformProcedure.input(suspendTenantSchema).mutation(...),
  reactivateTenant: platformProcedure.input(z.object({ tenantId: z.string().uuid() })).mutation(...),
  changePlan: platformProcedure.input(updateTenantPlanSchema).mutation(...),
  getPlatformOverview: platformProcedure.query(...),
})
```

**Verify:** Only `isPlatformAdmin: true` users can access. Create tenant provisions correctly. Suspend/reactivate works. Plan change audited.

---

### PHASE5-T8: Stub Modules (copy as-is)

These modules have straightforward logic that doesn't need architectural changes — just move and update imports.

**addon/ (src/modules/addon/)**
- Copy `src/server/routers/addon.ts` → `src/modules/addon/addon.router.ts`
- Extract DB calls to `addon.repository.ts`
- Thin service layer

**service-catalog/ (src/modules/service-catalog/)**
- Copy `src/server/routers/service.ts` → `src/modules/service-catalog/service.router.ts`
- Services define what the business offers (massage, cleaning, etc.)
- No Cotswold-specific services — tenant configures their own

**export/ (src/modules/export/)**
- Copy `src/server/routers/export.ts` → `src/modules/export/export.router.ts`
- CSV/JSON export for bookings, customers, revenue

**communications/ (src/modules/communications/)**
- Copy `src/server/routers/communications.ts` → `src/modules/communications/communications.router.ts`
- Phase 4 will wire up real Resend/Twilio — stub for now
- Generic template system (no hardcoded party/clinic templates)

---

### PHASE5-T9: Wire Up All Routers in server/root.ts

After all modules are created, update `src/server/root.ts` to import from modules:

```typescript
import { bookingRouter } from '@/modules/booking'
import { slotAvailabilityRouter } from '@/modules/booking/sub-routers/slot.router'
import { approvalRouter } from '@/modules/booking/sub-routers/approval.router'
import { completionRouter } from '@/modules/booking/sub-routers/completion.router'
import { portalRouter } from '@/modules/booking/sub-routers/portal.router'
import { schedulingRouter } from '@/modules/scheduling'
import { teamRouter } from '@/modules/team'
import { customerRouter } from '@/modules/customer'
import { formsRouter } from '@/modules/forms'
import { reviewRouter } from '@/modules/review'
import { workflowRouter } from '@/modules/workflow'
import { tenantRouter } from '@/modules/tenant'
import { platformRouter } from '@/modules/platform'
import { addonRouter } from '@/modules/addon'
import { serviceCatalogRouter } from '@/modules/service-catalog'
import { exportRouter } from '@/modules/export'
import { communicationsRouter } from '@/modules/communications'

export const appRouter = router({
  booking: bookingRouter,
  slot: slotAvailabilityRouter,
  approval: approvalRouter,
  completion: completionRouter,
  portal: portalRouter,
  scheduling: schedulingRouter,
  team: teamRouter,
  customer: customerRouter,
  forms: formsRouter,
  review: reviewRouter,
  workflow: workflowRouter,
  tenant: tenantRouter,
  platform: platformRouter,
  addon: addonRouter,
  serviceCatalog: serviceCatalogRouter,
  export: exportRouter,
  communications: communicationsRouter,
})

export type AppRouter = typeof appRouter
```

---

### PHASE5-T10: Delete Legacy Routers

After each module is wired up and verified:

```
src/server/routers/
  booking.ts          → deleted (Phase 1)
  slot-availability.ts → deleted (Phase 2)
  availability.ts      → deleted (Phase 2)
  slot-management.ts   → deleted (Phase 2)
  approval.ts          → deleted (Phase 1)
  completion.ts        → deleted (Phase 1)
  portal.ts            → deleted (Phase 1)
  staff.ts             ← delete after PHASE5-T1
  customer.ts          ← delete after PHASE5-T2
  forms.ts             ← delete after PHASE5-T3
  review.ts            ← delete after PHASE5-T4
  workflow.ts          ← delete after PHASE5-T5
  settings.ts          ← delete after PHASE5-T6
  venue.ts             ← delete after PHASE5-T6
  dashboard.ts         ← delete after PHASE5-T6
  features.ts          ← delete after PHASE5-T6
  modules.ts           ← delete after PHASE5-T6
  platform.ts          ← delete after PHASE5-T7
  addon.ts             ← delete after PHASE5-T8
  service.ts           ← delete after PHASE5-T8
  export.ts            ← delete after PHASE5-T8
  communications.ts    ← delete after PHASE5-T8
```

Also delete: `src/lib/workflow/event-bus.ts` (replaced by Inngest)

**Final state:** `src/server/routers/` is empty or deleted entirely.

---

### PHASE5-T11: Inngest Function Registration

Register all new module Inngest functions in `src/app/api/inngest/route.ts`:

```typescript
import { serve } from 'inngest/next'
import { inngest } from '@/shared/inngest'
import { bookingFunctions } from '@/modules/booking/booking.events'
import { schedulingFunctions } from '@/modules/scheduling/scheduling.events'
import { teamFunctions } from '@/modules/team/team.events'
import { reviewFunctions } from '@/modules/review/review.events'
import { workflowFunctions } from '@/modules/workflow/workflow.events'

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    ...bookingFunctions,
    ...schedulingFunctions,
    ...teamFunctions,
    ...reviewFunctions,
    ...workflowFunctions,
  ],
})
```

---

### PHASE5-T12: Integration Tests for New Services

Add test files:
- `src/modules/team/__tests__/team.service.test.ts` — createTeamMember, deactivate, setAvailability
- `src/modules/customer/__tests__/customer.service.test.ts` — create (with dedup), merge
- `src/modules/workflow/__tests__/workflow.engine.test.ts` — trigger dispatches correct Inngest events per action type

All tests follow the pattern from `booking.service.test.ts`: mock repository + Inngest + Redis, test business logic in isolation.

---

## Verify: End State

- `npm run build` — 0 TS errors, 0 non-test errors
- `npx vitest run` — all tests pass
- `src/server/routers/` — empty (all migrated)
- `src/lib/workflow/event-bus.ts` — deleted
- Admin pages: team list, customer list, forms, review dashboard, workflow builder all load
- Workflow trigger fires Inngest step on booking completion
- Platform admin page accessible only with `isPlatformAdmin: true`
- No client-specific code anywhere in the codebase

---

## Files Summary

### Create
| File | Description |
|------|-------------|
| `src/modules/team/{5 files}` | Team management |
| `src/modules/customer/{4 files}` | Customer CRUD + notes |
| `src/modules/forms/{4 files}` | Form builder + responses |
| `src/modules/review/{5 files}` | Review automation + Inngest |
| `src/modules/workflow/{5 files + engine/}` | Workflow engine + Inngest executor |
| `src/modules/tenant/{4 files}` | Settings + venues + modules |
| `src/modules/platform/{4 files}` | Platform admin |
| `src/modules/addon/{3 files}` | Addon stub |
| `src/modules/service-catalog/{3 files}` | Service catalog stub |
| `src/modules/export/{2 files}` | Export stub |
| `src/modules/communications/{2 files}` | Communications stub |
| `src/modules/team/__tests__/team.service.test.ts` | Team tests |
| `src/modules/customer/__tests__/customer.service.test.ts` | Customer tests |
| `src/modules/workflow/__tests__/workflow.engine.test.ts` | Workflow engine tests |

### Update
| File | Change |
|------|--------|
| `src/server/root.ts` | Import all new module routers |
| `src/app/api/inngest/route.ts` | Register new Inngest functions |
| `src/shared/trpc.ts` | Add `platformProcedure` |

### Delete
| File | Replaced By |
|------|------------|
| `src/server/routers/staff.ts` | `src/modules/team/` |
| `src/server/routers/customer.ts` | `src/modules/customer/` |
| `src/server/routers/forms.ts` | `src/modules/forms/` |
| `src/server/routers/review.ts` | `src/modules/review/` |
| `src/server/routers/workflow.ts` | `src/modules/workflow/` |
| `src/server/routers/settings.ts` | `src/modules/tenant/` |
| `src/server/routers/venue.ts` | `src/modules/tenant/` |
| `src/server/routers/dashboard.ts` | `src/modules/tenant/` |
| `src/server/routers/features.ts` | `src/modules/tenant/` |
| `src/server/routers/modules.ts` | `src/modules/tenant/` |
| `src/server/routers/platform.ts` | `src/modules/platform/` |
| `src/server/routers/addon.ts` | `src/modules/addon/` |
| `src/server/routers/service.ts` | `src/modules/service-catalog/` |
| `src/server/routers/export.ts` | `src/modules/export/` |
| `src/server/routers/communications.ts` | `src/modules/communications/` |
| `src/lib/workflow/event-bus.ts` | Inngest |
