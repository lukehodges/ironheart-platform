# Phase 6: Platform Completeness & Mathematical Correctness

**Goal:** Transform Ironheart from an operational tool into a guaranteed-correct platform. Phase 6 delivers five formal pillars: financial completeness (money flows end-to-end with invariants enforced at the DB layer), analytics intelligence (operational data surfaces as actionable insight), a developer API platform (REST + webhooks), distributed correctness (saga, idempotency, optimistic concurrency, safe expressions), and observability (OTel traces, full-text search, expanded health checks).

**Architecture reference:** `.planning/PHASE6_ARCHITECTURE.md`

**Duration:** 4–6 days
**Depends on:** Phase 5 complete (224/224 tests, 0 tsc errors)
**Test target:** 250+ tests (from ~224 after Phase 5)

---

## Key Design Decisions

### KDD-1: Invoice & Booking State Machines Are Formally Specified
Every status transition for `invoices` and `bookings` is declared in an adjacency list (`VALID_INVOICE_TRANSITIONS`, `BOOKING_TRANSITIONS`). No code may update status without calling the corresponding `assertValid*Transition()` guard. Terminal states (`VOID`, `REFUNDED`, `COMPLETED`, `CANCELLED`, `NO_SHOW`, `REJECTED`) accept zero outgoing transitions. Violations throw `BadRequestError` immediately — they never reach the DB.

### KDD-2: Invariants Are Enforced at DB Layer, Not Application Layer
Application code lies; constraints do not. The 12 formal invariants (I1–I12) listed in the architecture document each have a specified enforcement layer (DB CHECK constraint, advisory lock, Redis idempotency, tRPC middleware, or Inngest step). Tests verify each invariant directly.

### KDD-3: Stripe Webhook → Inngest Bridge Pattern
Stripe webhooks are received at `/api/webhooks/stripe/route.ts`, validated with `stripe.webhooks.constructEvent()` (HMAC on raw body), then immediately re-emitted as `"stripe/webhook.received"` Inngest event. All payment business logic lives in the Inngest handler, never in the HTTP handler. This gives durability, retry semantics, and auditability.

### KDD-4: REST API Is tRPC Exposed via `trpc-openapi`
No separate REST server. The tRPC router is exposed as OpenAPI 3.0 via `trpc-openapi` at `/api/v1/[...path]`. This guarantees REST and the web app share 100% of the same validation, error handling, and business logic. OpenAPI spec is auto-generated and cached.

### KDD-5: Analytics Uses PostgreSQL + Redis, Not a Separate OLAP
`metric_snapshots` is an append-only Postgres table. Redis holds real-time counters for today (48h TTL). Dashboard reads Redis for live data, `metric_snapshots` for history. No ClickHouse, no BigQuery — the data volume does not warrant another database at this stage.

### KDD-6: Saga Compensation Failure Is a CRITICAL Alert
If a saga compensation step itself throws, the system logs at CRITICAL level, sets `saga_log.requires_manual_intervention = true`, and sends an ops alert. It does not retry compensation automatically (risk of infinite loop). Ops resolves manually via the admin dashboard.

### KDD-7: All Schema Migrations Use CONCURRENTLY
Every new index in Phase 6 uses `CREATE INDEX CONCURRENTLY`. Table changes (ADD COLUMN) are purely additive — no renames, no type changes, no dropping existing columns. This ensures zero-downtime migration on a live production database.

### KDD-8: `expr-eval` Replaces `Function()` Constructor
The `expressions.ts` `Function()` constructor is replaced with the `expr-eval` library (AST-based, zero dependencies, 8KB minified). `allowMemberAccess: false` blocks property traversal. Post-Phase 6, `grep -r "new Function" src/` must return zero results.

---

## New Modules & File Structure

```
src/modules/payment/
  payment.types.ts
  payment.schemas.ts
  payment.repository.ts
  payment.service.ts
  payment.router.ts
  payment.events.ts
  providers/
    stripe.provider.ts
    gocardless.provider.ts
    cash.provider.ts
    provider.factory.ts
  lib/
    invoice-pdf.ts
    pricing-engine.ts
    tax-engine.ts
    reconciliation.ts
    state-machine.ts
  index.ts
  __tests__/
    pricing-engine.test.ts
    tax-engine.test.ts
    state-machine.test.ts
    payment.service.test.ts

src/modules/analytics/
  analytics.types.ts
  analytics.schemas.ts
  analytics.repository.ts
  analytics.service.ts
  analytics.router.ts
  analytics.events.ts          # Inngest cron: computeMetricSnapshots
  lib/
    metrics-aggregator.ts
    customer-intelligence.ts   # LTV, churn RFM
    forecasting.ts
  index.ts
  __tests__/
    analytics.test.ts

src/modules/scheduling/
  scheduling.types.ts
  scheduling.service.ts        # smart assignment + waitlist
  scheduling.events.ts         # waitlist slot-available trigger
  lib/
    smart-assignment.ts
    waitlist.ts
  index.ts
  __tests__/
    smart-assignment.test.ts
    waitlist.test.ts

src/modules/developer/
  developer.types.ts
  developer.schemas.ts
  developer.repository.ts      # apiKeys + webhookEndpoints
  developer.service.ts
  developer.router.ts          # API key CRUD + webhook endpoint CRUD
  developer.events.ts          # dispatchWebhooks Inngest function
  lib/
    webhook-delivery.ts        # deliver(), HMAC, retry
  index.ts
  __tests__/
    webhook-delivery.test.ts

src/modules/search/
  search.types.ts
  search.repository.ts
  search.router.ts
  index.ts
  __tests__/
    search.test.ts

src/modules/booking/lib/
  booking-saga.ts              # BookingConfirmationSaga
  booking-state-machine.ts     # assertValidBookingTransition
  slot-lock.ts                 # withSlotLock (pg_advisory_xact_lock)

src/shared/
  idempotency.ts               # withIdempotency()
  optimistic-concurrency.ts    # updateWithVersion()
  telemetry.ts                 # OpenTelemetry SDK setup
  rate-limiter.ts              # Upstash ratelimit tiers

src/modules/workflow/engine/
  expressions.ts               # REPLACE Function() with expr-eval
  migrations/
    node-config.migrations.ts  # schema evolution migration registry

src/app/api/
  v1/[...path]/route.ts        # trpc-openapi REST adapter
  openapi.json/route.ts        # OpenAPI 3.0 spec endpoint
  webhooks/stripe/route.ts     # Stripe webhook bridge
  health/
    route.ts                   # expanded: /api/health/deep + /api/ready
```

---

## Phase 6 Tasks

---

### PHASE6-T01: Database Migrations — New Tables & Column Additions

**Files to create:**
```
src/shared/db/migrations/0006_phase6_schema.sql
```

**Migration content:**
```sql
-- ─── Optimistic concurrency ────────────────────────────────────────────────
ALTER TABLE bookings  ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE invoices  ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE workflows ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;

-- ─── Smart scheduling ──────────────────────────────────────────────────────
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_assigned_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS home_latitude    NUMERIC(9,6);
ALTER TABLE users ADD COLUMN IF NOT EXISTS home_longitude   NUMERIC(9,6);

-- ─── GDPR anonymisation ────────────────────────────────────────────────────
ALTER TABLE customers ADD COLUMN IF NOT EXISTS anonymised_at TIMESTAMPTZ;

-- ─── Payment linkage ───────────────────────────────────────────────────────
ALTER TABLE payments ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT UNIQUE;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS stripe_charge_id          TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS stripe_transfer_id        TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS platform_fee_amount       NUMERIC(10,2);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS idempotency_key           TEXT UNIQUE;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS gocardless_payment_id     TEXT;

-- ─── Stripe Connect accounts ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS stripe_connect_accounts (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  stripe_account_id TEXT        NOT NULL UNIQUE,
  status            TEXT        NOT NULL DEFAULT 'pending',
  charges_enabled   BOOLEAN     NOT NULL DEFAULT FALSE,
  payouts_enabled   BOOLEAN     NOT NULL DEFAULT FALSE,
  requirements      JSONB,
  capabilities      JSONB,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id)
);

-- ─── Pricing rules ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pricing_rules (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID          NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name            TEXT          NOT NULL,
  enabled         BOOLEAN       NOT NULL DEFAULT TRUE,
  sort_order      INTEGER       NOT NULL DEFAULT 0,
  conditions      JSONB         NOT NULL DEFAULT '{"logic":"AND","conditions":[]}',
  modifier_type   TEXT          NOT NULL,
  modifier_value  NUMERIC(10,4) NOT NULL,
  service_ids     UUID[],
  staff_ids       UUID[],
  valid_from      TIMESTAMPTZ,
  valid_until     TIMESTAMPTZ,
  max_uses        INTEGER,
  current_uses    INTEGER       NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ─── Discount codes ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS discount_codes (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  code            TEXT        NOT NULL,
  UNIQUE(tenant_id, code),
  pricing_rule_id UUID        REFERENCES pricing_rules(id) ON DELETE SET NULL,
  expires_at      TIMESTAMPTZ,
  max_uses        INTEGER,
  current_uses    INTEGER     NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Tax rules ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tax_rules (
  id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID         NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name              TEXT         NOT NULL,
  rate              NUMERIC(6,4) NOT NULL,
  country           TEXT         NOT NULL,
  tax_code          TEXT,
  applies_to        TEXT         NOT NULL DEFAULT 'ALL',
  is_default        BOOLEAN      NOT NULL DEFAULT FALSE,
  is_reverse_charge BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ─── Booking waitlist ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS booking_waitlist (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id          UUID        NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  service_id           UUID        NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  staff_id             UUID        REFERENCES users(id) ON DELETE SET NULL,
  preferred_date       DATE,
  preferred_time_start TIME,
  preferred_time_end   TIME,
  flexibility_days     INTEGER     NOT NULL DEFAULT 3,
  status               TEXT        NOT NULL DEFAULT 'WAITING',
  notified_at          TIMESTAMPTZ,
  expires_at           TIMESTAMPTZ NOT NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Webhook endpoints ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS webhook_endpoints (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  url                  TEXT        NOT NULL,
  secret               TEXT        NOT NULL,
  description          TEXT,
  events               TEXT[]      NOT NULL,
  status               TEXT        NOT NULL DEFAULT 'ACTIVE',
  failure_count        INTEGER     NOT NULL DEFAULT 0,
  last_success_at      TIMESTAMPTZ,
  last_failure_at      TIMESTAMPTZ,
  last_failure_reason  TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Webhook deliveries ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint_id     UUID        NOT NULL REFERENCES webhook_endpoints(id) ON DELETE CASCADE,
  event_type      TEXT        NOT NULL,
  event_id        TEXT        NOT NULL,
  payload         JSONB       NOT NULL,
  attempt         INTEGER     NOT NULL DEFAULT 1,
  status          TEXT        NOT NULL,
  response_status INTEGER,
  response_body   TEXT,
  duration_ms     INTEGER,
  delivered_at    TIMESTAMPTZ,
  next_retry_at   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Metric snapshots (append-only) ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS metric_snapshots (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  metric_key   TEXT        NOT NULL,
  dimensions   JSONB       NOT NULL DEFAULT '{}',
  period_type  TEXT        NOT NULL,
  period_start TIMESTAMPTZ NOT NULL,
  value        NUMERIC     NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Saga log ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS saga_log (
  id                           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                    UUID        NOT NULL,
  saga_type                    TEXT        NOT NULL,
  entity_id                    UUID        NOT NULL,
  status                       TEXT        NOT NULL,
  steps                        JSONB       NOT NULL DEFAULT '[]',
  started_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at                 TIMESTAMPTZ,
  error_message                TEXT,
  requires_manual_intervention BOOLEAN     NOT NULL DEFAULT FALSE
);

-- ─── Full-text search generated columns ───────────────────────────────────
ALTER TABLE customers ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector('english',
      coalesce(first_name, '') || ' ' ||
      coalesce(last_name,  '') || ' ' ||
      coalesce(email,      '') || ' ' ||
      coalesce(phone,      '') || ' ' ||
      coalesce(notes,      '')
    )
  ) STORED;

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector('english',
      coalesce(customer_notes,      '') || ' ' ||
      coalesce(admin_notes,         '') || ' ' ||
      coalesce(custom_service_name, '') || ' ' ||
      coalesce(booking_number,      '')
    )
  ) STORED;

-- ─── DB CHECK invariants (I1) ──────────────────────────────────────────────
ALTER TABLE invoices ADD CONSTRAINT IF NOT EXISTS payments_cannot_exceed_total
  CHECK (amount_paid <= total_amount);

-- ─── Indexes (all CONCURRENTLY — zero table lock) ─────────────────────────
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_tenant_status_date
  ON bookings(tenant_id, status, scheduled_date) WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_customer_status
  ON bookings(customer_id, status, scheduled_date DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_customers_search
  ON customers USING GIN(search_vector) WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_search
  ON bookings USING GIN(search_vector);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_metric_snapshots_lookup
  ON metric_snapshots(tenant_id, metric_key, period_type, period_start DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workflow_executions_workflow_status
  ON workflow_executions(workflow_id, status, started_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_webhook_deliveries_endpoint
  ON webhook_deliveries(endpoint_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_waitlist_service_date
  ON booking_waitlist(tenant_id, service_id, preferred_date, status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_saga_log_entity
  ON saga_log(tenant_id, entity_id, saga_type);
```

**Also update Drizzle schema** (`src/shared/db/schemas/`) — add Drizzle table definitions matching each SQL block above, plus column additions with proper Drizzle column types. Export from schema index.

**Verification:**
```bash
npx tsc --noEmit  # 0 errors after schema additions
```

---

### PHASE6-T02: Shared Utilities — Idempotency, Optimistic Concurrency, Rate Limiting

**Files to create:**
```
src/shared/idempotency.ts
src/shared/optimistic-concurrency.ts
src/shared/rate-limiter.ts
```

**`src/shared/idempotency.ts`:**
```typescript
import { redis }        from '@/shared/redis'
import { ConflictError } from '@/shared/errors'
import { logger }       from '@/shared/logger'

const log = logger.child({ module: 'shared.idempotency' })

export async function withIdempotency<T>(
  key: string,
  ttlSeconds: number,
  operation: () => Promise<T>
): Promise<T> {
  const cacheKey = `idempotency:${key}`
  const lockKey  = `idempotency:lock:${key}`

  const cached = await redis.get(cacheKey)
  if (cached) {
    log.info({ key }, 'Idempotency cache hit — returning cached result')
    return JSON.parse(cached as string) as T
  }

  const acquired = await redis.set(lockKey, '1', { nx: true, ex: 30 })
  if (!acquired) throw new ConflictError('Duplicate request in flight — retry in 30 seconds')

  try {
    const result = await operation()
    await redis.set(cacheKey, JSON.stringify(result), { ex: ttlSeconds })
    return result
  } finally {
    await redis.del(lockKey)
  }
}
```

**`src/shared/optimistic-concurrency.ts`:**
```typescript
import { db }           from '@/shared/db'
import { and, eq }      from 'drizzle-orm'
import { ConflictError } from '@/shared/errors'

export async function updateWithVersion<T>(
  table: any,
  id: string,
  tenantId: string,
  expectedVersion: number,
  values: Record<string, unknown>
): Promise<T> {
  const [updated] = await db
    .update(table)
    .set({ ...values, version: expectedVersion + 1, updatedAt: new Date() })
    .where(and(
      eq(table.id, id),
      eq(table.tenantId, tenantId),
      eq(table.version, expectedVersion)
    ))
    .returning()

  if (!updated) {
    throw new ConflictError('Concurrent modification detected — refresh and try again')
  }
  return updated as T
}
```

**`src/shared/rate-limiter.ts`:**
```typescript
import { Ratelimit } from '@upstash/ratelimit'
import { redis }     from '@/shared/redis'

// Sliding window — more accurate than token bucket for API rate limiting
export const apiRateLimits = {
  STARTER:      new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(100,    '1 m') }),
  PROFESSIONAL: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(500,    '1 m') }),
  BUSINESS:     new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(2_000,  '1 m') }),
  ENTERPRISE:   new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(10_000, '1 m') }),
} as const

export const tRPCRateLimits = {
  public:   new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(60,  '1 m') }),
  tenant:   new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(300, '1 m') }),
  mutation: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(60,  '1 m') }),
} as const
```

**Verification:**
```bash
npx tsc --noEmit
```

---

### PHASE6-T03: Booking State Machine & Slot Lock

**Files to create:**
```
src/modules/booking/lib/booking-state-machine.ts
src/modules/booking/lib/slot-lock.ts
```

**`src/modules/booking/lib/booking-state-machine.ts`:**
```typescript
import { BadRequestError } from '@/shared/errors'

export type BookingStatus =
  | 'PENDING' | 'RESERVED' | 'APPROVED' | 'CONFIRMED'
  | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW'
  | 'REJECTED' | 'RELEASED'

const BOOKING_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  PENDING:     ['RESERVED', 'REJECTED', 'CANCELLED'],
  RESERVED:    ['APPROVED', 'CONFIRMED', 'RELEASED', 'CANCELLED'],
  APPROVED:    ['CONFIRMED', 'CANCELLED'],
  CONFIRMED:   ['IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW'],
  IN_PROGRESS: ['COMPLETED', 'CANCELLED', 'NO_SHOW'],
  COMPLETED:   [],
  CANCELLED:   [],
  NO_SHOW:     [],
  REJECTED:    [],
  RELEASED:    ['PENDING'],
}

export function assertValidBookingTransition(from: BookingStatus, to: BookingStatus): void {
  const allowed = BOOKING_TRANSITIONS[from]
  if (!allowed.includes(to)) {
    throw new BadRequestError(
      `Invalid booking transition: ${from} → ${to}. ` +
      `Valid from ${from}: ${allowed.join(', ') || 'none (terminal state)'}`
    )
  }
}

export function isTerminalBookingStatus(status: BookingStatus): boolean {
  return BOOKING_TRANSITIONS[status].length === 0
}
```

**`src/modules/booking/lib/slot-lock.ts`:**
```typescript
import { db }  from '@/shared/db'
import { sql } from 'drizzle-orm'

// FNV-1a 32-bit — maps slot tuple to positive integer for pg_advisory_xact_lock
function hashSlot(tenantId: string, staffId: string, date: string, time: string): number {
  const input = `${tenantId}:${staffId}:${date}:${time}`
  let hash = 2_166_136_261
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i)
    hash = (hash * 16_777_619) >>> 0
  }
  return hash
}

export async function withSlotLock<T>(
  tenantId: string,
  staffId: string,
  date: string,
  time: string,
  operation: () => Promise<T>
): Promise<T> {
  // Canonical order: sort keys to prevent deadlocks between concurrent sagas
  const key = hashSlot(tenantId, staffId, date, time)
  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(${key})`)
    return operation()
  })
}
```

**Integration:** Update `booking.service.ts` to wrap `confirmBooking` in `withSlotLock`, and call `assertValidBookingTransition(booking.status, 'CONFIRMED')` before every status update.

**Verification:**
```bash
npx tsc --noEmit
```

---

### PHASE6-T04: Booking Confirmation Saga

**Files to create:**
```
src/modules/booking/lib/booking-saga.ts
```

```typescript
import { logger }          from '@/shared/logger'
import type { BookingRepository } from '../booking.repository'
import type { PaymentService }    from '@/modules/payment/payment.service'
import type { InngestClient }     from '@/shared/inngest'

const log = logger.child({ module: 'booking.saga' })

export interface SagaStep<T = unknown> {
  name: string
  execute: () => Promise<T>
  compensate: (result: T) => Promise<void>
}

export class Saga {
  private completed: Array<{ step: SagaStep; result: unknown }> = []

  constructor(
    private readonly sagaType: string,
    private readonly entityId: string,
    private readonly tenantId: string,
    private readonly steps: SagaStep[]
  ) {}

  async run(): Promise<void> {
    for (const step of this.steps) {
      try {
        const result = await step.execute()
        this.completed.push({ step, result })
        log.info({ sagaType: this.sagaType, stepName: step.name }, 'Saga step completed')
      } catch (err) {
        log.error({ sagaType: this.sagaType, stepName: step.name, err }, 'Saga step failed — compensating')
        await this.compensate()
        throw err
      }
    }
  }

  private async compensate(): Promise<void> {
    for (const { step, result } of [...this.completed].reverse()) {
      try {
        await step.compensate(result)
        log.info({ sagaType: this.sagaType, stepName: step.name }, 'Saga compensation completed')
      } catch (compensationErr) {
        // CRITICAL: log, flag for manual ops intervention — do NOT retry
        log.error(
          { sagaType: this.sagaType, stepName: step.name, compensationErr },
          'SAGA COMPENSATION FAILED — manual intervention required'
        )
      }
    }
  }
}

export function createBookingConfirmationSaga(deps: {
  bookingId: string
  tenantId: string
  staffId: string
  bookingRepository: Pick<BookingRepository, 'updateStatus'>
  paymentService: Pick<PaymentService, 'createInvoiceForBooking' | 'voidInvoice'>
  inngest: Pick<InngestClient, 'send'>
}): Saga {
  return new Saga('BOOKING_CONFIRMATION', deps.bookingId, deps.tenantId, [
    {
      name: 'update-booking-status',
      execute:    () => deps.bookingRepository.updateStatus(deps.bookingId, 'CONFIRMED'),
      compensate: () => deps.bookingRepository.updateStatus(deps.bookingId, 'PENDING'),
    },
    {
      name: 'create-invoice',
      execute:    () => deps.paymentService.createInvoiceForBooking(deps.bookingId),
      compensate: (invoice) => deps.paymentService.voidInvoice((invoice as { id: string }).id),
    },
    {
      name: 'send-notification',
      execute:    () => deps.inngest.send('booking/confirmed', { bookingId: deps.bookingId, tenantId: deps.tenantId }),
      compensate: () => Promise.resolve(), // not reversible — acceptable
    },
    {
      name: 'sync-calendar',
      execute:    () => deps.inngest.send('calendar/sync.push',   { bookingId: deps.bookingId, userId: deps.staffId, tenantId: deps.tenantId }),
      compensate: () => deps.inngest.send('calendar/sync.delete', { bookingId: deps.bookingId, userId: deps.staffId, tenantId: deps.tenantId }),
    },
  ])
}
```

**Verification:**
```bash
npx tsc --noEmit
```

---

### PHASE6-T05: Invoice State Machine & Payment Module Types

**Files to create:**
```
src/modules/payment/lib/state-machine.ts
src/modules/payment/payment.types.ts
src/modules/payment/payment.schemas.ts
```

**`src/modules/payment/lib/state-machine.ts`:**
```typescript
import { BadRequestError } from '@/shared/errors'

export type InvoiceStatus =
  | 'DRAFT' | 'SENT' | 'VIEWED' | 'PARTIALLY_PAID' | 'OVERDUE'
  | 'PAID' | 'VOID' | 'REFUNDED'

const VALID_INVOICE_TRANSITIONS: Record<InvoiceStatus, InvoiceStatus[]> = {
  DRAFT:          ['SENT'],
  SENT:           ['VIEWED', 'PAID', 'PARTIALLY_PAID', 'OVERDUE', 'VOID'],
  VIEWED:         ['PAID', 'PARTIALLY_PAID', 'OVERDUE', 'VOID'],
  PARTIALLY_PAID: ['PAID', 'OVERDUE'],
  OVERDUE:        ['PAID', 'PARTIALLY_PAID', 'VOID'],
  PAID:           ['REFUNDED'],
  VOID:           [],
  REFUNDED:       [],
}

export function assertValidInvoiceTransition(from: InvoiceStatus, to: InvoiceStatus): void {
  const allowed = VALID_INVOICE_TRANSITIONS[from]
  if (!allowed.includes(to)) {
    throw new BadRequestError(
      `Invalid invoice transition: ${from} → ${to}. ` +
      `Valid from ${from}: ${allowed.join(', ') || 'none (terminal state)'}`
    )
  }
}

export function isTerminalInvoiceStatus(status: InvoiceStatus): boolean {
  return VALID_INVOICE_TRANSITIONS[status].length === 0
}
```

**`payment.types.ts`** — Declare interfaces: `InvoiceRecord`, `PaymentRecord`, `PricingRule`, `TaxRule`, `StripeConnectAccount`, `CreateInvoiceInput`, `RecordPaymentInput`, `RefundInput`, `PricingConditionGroup`.

**`payment.schemas.ts`** — Zod schemas: `createInvoiceSchema`, `sendInvoiceSchema`, `recordPaymentSchema`, `refundPaymentSchema`, `voidInvoiceSchema`, `createPricingRuleSchema`, `updatePricingRuleSchema`, `applyDiscountCodeSchema`, `createTaxRuleSchema`.

**Verification:**
```bash
npx tsc --noEmit
```

---

### PHASE6-T06: Payment Repository & Service

**Files to create:**
```
src/modules/payment/payment.repository.ts
src/modules/payment/payment.service.ts
```

**`payment.repository.ts`** — Drizzle queries (no business logic):
- `createInvoice(input)` → insert into invoices; return created record
- `findInvoiceById(id, tenantId)` → `[0] ?? null`
- `listInvoices(tenantId, filters)` → paginated with `limit + 1` pattern
- `updateInvoiceStatus(id, tenantId, version, status)` → `updateWithVersion()`
- `recordPayment(input)` → insert into payments
- `findPaymentsByInvoice(invoiceId)` → sum for total-paid check
- `listPricingRules(tenantId)` → ordered by sortOrder ASC
- `createPricingRule(input)` → insert
- `findDiscountCode(tenantId, code)` → `[0] ?? null`
- `incrementDiscountCodeUse(id)` → atomic increment

**`payment.service.ts`** — Business logic, every status update calls state machine:
```typescript
async createInvoice(tenantId: string, input: CreateInvoiceInput): Promise<InvoiceRecord>
async sendInvoice(tenantId: string, invoiceId: string, version: number): Promise<InvoiceRecord>
  // assertValidInvoiceTransition(invoice.status, 'SENT')
  // generate PDF, send via Resend, updateInvoiceStatus
async recordPayment(tenantId: string, input: RecordPaymentInput, idempotencyKey: string): Promise<PaymentRecord>
  // withIdempotency(`payment:${idempotencyKey}`, 86_400, ...)
  // getPaymentProvider(input.method).processPayment(...)
  // assertValidInvoiceTransition(invoice.status, newStatus)
async processRefund(tenantId: string, input: RefundInput): Promise<PaymentRecord>
  // assertValidInvoiceTransition(invoice.status, 'REFUNDED')
async voidInvoice(id: string): Promise<void>
  // assertValidInvoiceTransition(invoice.status, 'VOID')
async createInvoiceForBooking(bookingId: string): Promise<{ id: string }>
  // called by booking confirmation saga
```

**Verification:**
```bash
npx tsc --noEmit
```

---

### PHASE6-T07: Pricing Engine & Tax Engine

**Files to create:**
```
src/modules/payment/lib/pricing-engine.ts
src/modules/payment/lib/tax-engine.ts
```

**`pricing-engine.ts`** — Evaluates rules in `sortOrder ASC`; first match wins:
```typescript
// Conditions reuse WorkflowConditionGroup evaluator
// Modifier types: FIXED_PRICE | FIXED_DISCOUNT | PERCENT_DISCOUNT | FIXED_SURCHARGE | PERCENT_SURCHARGE
// Context fields available to conditions:
//   booking.dayOfWeek (0–6), booking.timeOfDay (minutes), booking.advanceDays
//   booking.serviceId, customer.bookingCount
export function applyPricingRules(rules: PricingRule[], ctx: PricingContext): number
```

**`tax-engine.ts`** — Pure calculation, no DB access:
```typescript
// Invariant: taxAmount = round(subtotal * rate, 2) ALWAYS
// Invariant: totalAmount = subtotal + taxAmount ALWAYS (not derived from total)
// This prevents floating-point rounding drift on read-back
export function calculateTax(subtotal: number, rule: TaxRule): TaxCalculation
function round2(n: number): number { return Math.round((n + Number.EPSILON) * 100) / 100 }
```

**Verification:**
```bash
npx tsc --noEmit
```

---

### PHASE6-T08: Stripe & GoCardless Providers

**Files to create:**
```
src/modules/payment/providers/stripe.provider.ts
src/modules/payment/providers/gocardless.provider.ts
src/modules/payment/providers/cash.provider.ts
src/modules/payment/providers/provider.factory.ts
```

**Key patterns for all providers:**
- **Lazy init only** — never construct `new Stripe()` or `new GoCardlessClient()` at module load time
- Pattern: `let _client: T | null = null; export function getClient() { _client ??= new T(env.KEY); return _client }`
- All provider methods wrap external calls in try/catch; throw `BadRequestError` on provider-level errors
- Stripe Connect: every `paymentIntents.create` includes `transfer_data.destination` (tenant `stripeAccountId`) + `application_fee_amount`

**`provider.factory.ts`:**
```typescript
export function getPaymentProvider(method: PaymentMethod) {
  switch (method) {
    case 'CARD':          return stripeProvider
    case 'DIRECT_DEBIT':  return goCardlessProvider
    case 'CASH':          return cashProvider
    default:              throw new BadRequestError(`No provider for: ${method}`)
  }
}
```

**Verification:**
```bash
npx tsc --noEmit
```

---

### PHASE6-T09: Stripe Webhook Bridge

**Files to create:**
```
src/app/api/webhooks/stripe/route.ts
```

```typescript
import { type NextRequest, NextResponse } from 'next/server'
import { inngest } from '@/shared/inngest'
import { env }     from '@/env'

export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const sig     = req.headers.get('stripe-signature')
  if (!sig) return NextResponse.json({ error: 'Missing signature' }, { status: 400 })

  // Lazy import — never construct Stripe at module load time
  const { getStripe } = await import('@/modules/payment/providers/stripe.provider')
  let event: Stripe.Event
  try {
    event = getStripe().webhooks.constructEvent(rawBody, sig, env.STRIPE_WEBHOOK_SECRET)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  // Bridge to Inngest — all business logic lives in the durable handler
  await inngest.send({
    name: 'stripe/webhook.received',
    data: { eventType: event.type, stripeEventId: event.id, payload: event.data.object as Record<string, unknown> },
  })

  return NextResponse.json({ received: true })
}
```

**Verification:**
```bash
npx tsc --noEmit
```

---

### PHASE6-T10: Payment Router & Inngest Events

**Files to create:**
```
src/modules/payment/payment.router.ts
src/modules/payment/payment.events.ts
src/modules/payment/index.ts
```

**`payment.router.ts`** — tRPC procedures:
- `createInvoice` — `permissionProcedure('payments:write')`
- `listInvoices` — `permissionProcedure('payments:read')`
- `getInvoice` — `permissionProcedure('payments:read')`
- `sendInvoice` — `permissionProcedure('payments:write')`
- `voidInvoice` — `permissionProcedure('payments:write')`
- `recordPayment` — `permissionProcedure('payments:write')` (accepts `X-Idempotency-Key` header via ctx)
- `processRefund` — `permissionProcedure('payments:write')`
- `listPricingRules` — `tenantProcedure`
- `createPricingRule` — `permissionProcedure('payments:write')`
- `updatePricingRule` — `permissionProcedure('payments:write')`
- `deletePricingRule` — `permissionProcedure('payments:write')`
- `validateDiscountCode` — `publicProcedure` (for booking widget)
- `getStripeConnectOnboardingUrl` — `permissionProcedure('payments:write')`

**`payment.events.ts`** — Inngest functions:
- `handleStripeWebhook` — listens `stripe/webhook.received`; routes on `eventType`: `payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.dispute.created`, `account.updated`
- `overdueInvoiceCron` — `cron: '0 9 * * *'`; scans invoices with `dueDate < NOW()` in `SENT|VIEWED|PARTIALLY_PAID`; transitions to `OVERDUE`

**Verification:**
```bash
npx tsc --noEmit
```

---

### PHASE6-T11: Analytics Types, Repository & Service

**Files to create:**
```
src/modules/analytics/analytics.types.ts
src/modules/analytics/analytics.schemas.ts
src/modules/analytics/analytics.repository.ts
src/modules/analytics/analytics.service.ts
```

**`analytics.types.ts`:**
```typescript
export type MetricKey =
  | 'bookings.created' | 'bookings.confirmed' | 'bookings.cancelled'
  | 'bookings.completed' | 'bookings.no_show' | 'bookings.lead_time_avg'
  | 'revenue.gross' | 'revenue.net' | 'revenue.outstanding' | 'revenue.refunded'
  | 'customers.new' | 'customers.returning' | 'customers.ltv_avg'
  | 'reviews.rating_avg' | 'reviews.response_rate' | 'forms.completion_rate'
  | 'workflows.executions' | 'staff.utilisation'

export type PeriodType = 'HOUR' | 'DAY' | 'WEEK' | 'MONTH'

export interface CustomerInsights {
  customerId: string
  ltv: number
  avgBookingValue: number
  bookingFrequencyDays: number
  lastBookingDaysAgo: number
  noShowRate: number
  churnRiskScore: number          // 0–1 (RFM model)
  churnRiskLabel: 'LOW' | 'MEDIUM' | 'HIGH'
  nextPredictedBookingDate: Date | null
}

export interface RevenueForecast {
  date: string
  predictedRevenue: number
  lowerBound: number
  upperBound: number
  basisPoints: number             // # historical data points used
}
```

**`analytics.repository.ts`** — Drizzle queries:
- `getTimeSeriesMetric(tenantId, metricKey, periodType, from, to, dimensions?)` → MetricSnapshot[]
- `upsertSnapshot(snapshot)` → upsert on (tenantId, metricKey, periodType, periodStart, dimensions)
- `getRawBookingData(tenantId, from, to)` → for metric aggregation
- `getCustomerRawData(tenantId, customerId)` → bookings + payments for RFM scoring

**`analytics.service.ts`:**
- `computeHourlyMetrics(tenantId)` → computes and upserts all 18 metric keys for current hour
- `getCustomerInsights(tenantId, customerId)` → RFM churn score computation
- `getRevenueForecast(tenantId, weeks)` → time-series decomposition

**Verification:**
```bash
npx tsc --noEmit
```

---

### PHASE6-T12: Analytics Intelligence Libraries

**Files to create:**
```
src/modules/analytics/lib/metrics-aggregator.ts
src/modules/analytics/lib/customer-intelligence.ts
src/modules/analytics/lib/forecasting.ts
```

**`customer-intelligence.ts`** — RFM model:
```typescript
// R = days since last booking (lower = better recency)
// F = bookings per 90 days (higher = better frequency)
// M = avg booking value (higher = better monetary)
// churnRiskScore = normalize(R)*0.5 + (1-normalize(F))*0.3 + (1-normalize(M))*0.2
// normalize(x) maps x from [cohortMin, cohortMax] → [0, 1], clamped
// Label: HIGH if score > 0.7 AND lastBookingDaysAgo > 2 * avgFrequency
//        MEDIUM if score > 0.4, LOW otherwise

export function computeChurnScore(r: number, f: number, m: number, cohortStats: CohortStats): number
export function computeChurnLabel(score: number, r: number, avgFrequency: number): 'LOW' | 'MEDIUM' | 'HIGH'
```

**`forecasting.ts`** — Pure math time-series decomposition (no ML dependency):
1. Compute 4-week moving average (trend)
2. Compute 7 seasonal indices (day-of-week from 12-week history)
3. Forecast = trend * seasonal_index
4. Confidence interval = ±1 standard deviation of historical residuals

```typescript
export function forecastRevenue(history: DailyRevenue[], forecastDays: number): RevenueForecast[]
```

**Verification:**
```bash
npx tsc --noEmit
```

---

### PHASE6-T13: Analytics Router & Inngest Cron

**Files to create:**
```
src/modules/analytics/analytics.router.ts
src/modules/analytics/analytics.events.ts
src/modules/analytics/index.ts
```

**`analytics.router.ts`** — tRPC procedures:
```typescript
export const analyticsRouter = router({
  getSummary:          tenantProcedure.input(summarySchema).query(...)
  getTimeSeries:       tenantProcedure.input(timeSeriesSchema).query(...)
  getStaffPerformance: permissionProcedure('analytics:read').input(staffSchema).query(...)
  getRevenueBreakdown: permissionProcedure('analytics:read').input(revenueSchema).query(...)
  getCustomerInsights: permissionProcedure('analytics:read').input(z.object({ customerId: z.string() })).query(...)
  getBookingFunnel:    permissionProcedure('analytics:read').input(funnelSchema).query(...)
  getRevenueForecast:  permissionProcedure('analytics:read').input(z.object({ weeks: z.number().int().min(1).max(52).default(12) })).query(...)
})
```

**`analytics.events.ts`** — Hourly Inngest cron:
```typescript
export const computeMetricSnapshots = inngest.createFunction(
  { id: 'compute-metric-snapshots', retries: 2 },
  { cron: '0 * * * *' },
  async ({ step }) => {
    const active = await step.run('load-tenants', () =>
      db.select({ id: tenants.id }).from(tenants).where(eq(tenants.status, 'ACTIVE'))
    )
    await Promise.all(active.map(t =>
      step.run(`compute-${t.id}`, () => analyticsService.computeHourlyMetrics(t.id))
    ))
  }
)
```

**Redis real-time counters** — Update `booking.events.ts` to `incr` / `incrbyfloat` on `booking/created`, `booking/confirmed`, `booking/cancelled`, `booking/completed`:
```typescript
// Key pattern: metrics:{tenantId}:{metricKey}:{YYYY-MM-DD}  TTL: 48h
await redis.incr(`metrics:${tenantId}:bookings.created:${today}`)
await redis.incrbyfloat(`metrics:${tenantId}:revenue.gross:${today}`, amount)
```

**Verification:**
```bash
npx tsc --noEmit
```

---

### PHASE6-T14: Smart Scheduling & Waitlist

**Files to create:**
```
src/modules/scheduling/scheduling.types.ts
src/modules/scheduling/lib/smart-assignment.ts
src/modules/scheduling/lib/waitlist.ts
src/modules/scheduling/scheduling.service.ts
src/modules/scheduling/scheduling.events.ts
src/modules/scheduling/index.ts
```

**`smart-assignment.ts`** — Strategy implementations:
- `ROUND_ROBIN` — select available staff with earliest `lastAssignedAt`; update on assignment
- `LEAST_LOADED` — count confirmed bookings on that date; select minimum
- `SKILL_MATCH` — `users.metadata.skills ⊇ service.metadata.requiredSkills`
- `GEOGRAPHIC` — Haversine distance from `users.homeLatitude/Longitude` to `venues.latitude/longitude`
- `PREFERRED` — prefer `booking.preferredStaffId` if available; fall back to ROUND_ROBIN

**`waitlist.ts`:**
```typescript
export async function addToWaitlist(tenantId: string, input: WaitlistInput): Promise<WaitlistEntry>
export async function checkAndNotifyWaitlist(tenantId: string, serviceId: string, date: string): Promise<void>
  // Query WAITING entries for service+date ±flexibilityDays
  // Notify first match via inngest.send('waitlist/slot.available', ...)
  // Update status to NOTIFIED
```

**`scheduling.events.ts`:**
```typescript
// Listens for booking/cancelled → trigger waitlist check for freed slot
export const onBookingCancelled = inngest.createFunction(
  { id: 'waitlist-check-on-cancellation', retries: 2 },
  { event: 'booking/cancelled' },
  async ({ event, step }) => {
    const { serviceId, scheduledDate, tenantId } = event.data
    await step.run('check-waitlist', () =>
      waitlistService.checkAndNotifyWaitlist(tenantId, serviceId, scheduledDate)
    )
  }
)
```

**Verification:**
```bash
npx tsc --noEmit
```

---

### PHASE6-T15: Developer Module — API Keys & Webhook Platform

**Files to create:**
```
src/modules/developer/developer.types.ts
src/modules/developer/developer.schemas.ts
src/modules/developer/developer.repository.ts
src/modules/developer/developer.service.ts
src/modules/developer/developer.router.ts
src/modules/developer/developer.events.ts
src/modules/developer/lib/webhook-delivery.ts
src/modules/developer/index.ts
```

**`webhook-delivery.ts`** — Core delivery with HMAC + retry:
```typescript
import crypto from 'crypto'

export function createHmacSignature(body: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(body, 'utf8').digest('hex')
}

export function verifyHmacSignature(body: string, secret: string, received: string): boolean {
  const expected = Buffer.from(createHmacSignature(body, secret))
  const actual   = Buffer.from(received)
  if (expected.length !== actual.length) return false
  return crypto.timingSafeEqual(expected, actual)   // timing-safe (invariant I11)
}

// Retry schedule: 10s, 60s, 5m, 30m, 2h
const RETRY_DELAYS_MS = [10_000, 60_000, 300_000, 1_800_000, 7_200_000]

export async function deliverWebhook(
  endpoint: WebhookEndpoint,
  event: { name: string; id: string; data: unknown }
): Promise<DeliveryResult>
```

**`developer.events.ts`** — Inngest dispatch function (observes all business events):
```typescript
export const dispatchWebhooks = inngest.createFunction(
  { id: 'dispatch-webhooks', retries: 0 },   // retries handled in deliverWebhook
  [
    { event: 'booking/created' }, { event: 'booking/confirmed' },
    { event: 'booking/cancelled' }, { event: 'booking/completed' },
    { event: 'payment/intent.succeeded' },
    { event: 'review/submitted' }, { event: 'forms/submitted' },
  ],
  async ({ event, step }) => {
    const { tenantId } = event.data as { tenantId: string }
    const endpoints = await step.run('load-endpoints', () =>
      developerRepository.findActiveEndpoints(tenantId, event.name)
    )
    await Promise.all(endpoints.map(ep =>
      step.run(`deliver-${ep.id}`, () => deliverWebhook(ep, event))
    ))
  }
)
```

**`developer.router.ts`** — procedures:
- `listApiKeys`, `createApiKey`, `revokeApiKey`, `rotateApiKey`
- `listWebhookEndpoints`, `createWebhookEndpoint`, `updateWebhookEndpoint`, `deleteWebhookEndpoint`, `testWebhookEndpoint`
- `listWebhookDeliveries` — for debugging recent deliveries

All protected by `permissionProcedure('developer:write')` or `'developer:read'`.

**Verification:**
```bash
npx tsc --noEmit
```

---

### PHASE6-T16: REST API & OpenAPI Spec

**Files to create:**
```
src/app/api/v1/[...path]/route.ts
src/app/api/openapi.json/route.ts
src/shared/api-key-middleware.ts
```

**`src/shared/api-key-middleware.ts`:**
```typescript
// 1. Extract key from: Authorization: Bearer {key} OR X-API-Key: {key}
// 2. SHA-256 hash → lookup by keyHash in apiKeys table
// 3. Validate: not revoked, not expired, allowedIps ⊇ request IP, scopes ⊇ required scope
// 4. Apply per-key rate limit: apiRateLimits[tier].limit(apiKey.id)
//    → 429 Too Many Requests with Retry-After header if exceeded
// 5. Fire-and-forget: increment usageCount + update lastUsedAt (non-blocking)
// 6. Return tRPC context extension: { apiKeyId, tenantId, scopes }
```

**`src/app/api/v1/[...path]/route.ts`:**
```typescript
import { fetchRequestHandler } from '@trpc/server/adapters/fetch'
import { appRouter }           from '@/server/root'
import { apiKeyMiddleware }    from '@/shared/api-key-middleware'

export async function GET(req: Request) {
  const apiCtx = await apiKeyMiddleware(req)
  return fetchRequestHandler({
    endpoint: '/api/v1',
    req,
    router: appRouter,
    createContext: () => ({ ...baseContext, ...apiCtx }),
  })
}
export { GET as POST, GET as PUT, GET as PATCH, GET as DELETE }
```

**`src/app/api/openapi.json/route.ts`:**
```typescript
// Generates OpenAPI 3.0 spec from tRPC router
// Cached 1h in Redis (key: 'openapi:spec:v1')
// Includes: tenantProcedure + publicProcedure + permissionProcedure
// Excludes: platformAdminProcedure (internal)
export async function GET(): Promise<Response>
```

**Install dependency:**
```bash
npm install trpc-openapi
```

**Verification:**
```bash
npx tsc --noEmit
curl http://localhost:3000/api/openapi.json | jq '.info.version'   # "1.0.0"
```

---

### PHASE6-T17: Safe Expression Evaluator

**Files to modify:**
```
src/modules/workflow/engine/expressions.ts
```

**Install dependency:**
```bash
npm install expr-eval
```

**Replace entire file:**
```typescript
// ──────────────────────────────────────────────────────────────────────────────
// Expression evaluator — AST-based safe parser (invariant I9)
// No eval(), no Function() constructor — uses expr-eval library
// ──────────────────────────────────────────────────────────────────────────────

import { Parser } from 'expr-eval'
import type { WorkflowExecutionContext } from '../workflow.types'
import { substituteVariables } from './context'

const parser = new Parser({
  allowMemberAccess: false,  // blocks obj.prop traversal — security hardening
})

export function evaluateExpression(
  expression: string,
  ctx: WorkflowExecutionContext
): string | number | boolean {
  const substituted = substituteVariables(expression, ctx)

  try {
    const result = parser.evaluate(substituted)
    if (typeof result === 'number' && !isNaN(result) && isFinite(result)) return result
    if (typeof result === 'boolean') return result
  } catch {
    // Not a parseable expression — return as string literal
  }

  return substituted
}
```

**Verification:**
```bash
grep -rn "new Function\|Function(" src/   # must return 0 results
npx tsc --noEmit
```

---

### PHASE6-T18: Workflow Node Config Migrations

**Files to create:**
```
src/modules/workflow/engine/migrations/node-config.migrations.ts
```

```typescript
import type { WorkflowNodeType } from '../../workflow.types'

// Each array entry = migration from version N to N+1 (0-indexed)
const nodeConfigMigrations: Partial<Record<WorkflowNodeType, Array<(config: Record<string, unknown>) => Record<string, unknown>>>> = {
  IF: [
    // v1 → v2: wrap flat conditions array in ConditionGroup shape
    (config) => ({
      ...config,
      conditions: Array.isArray(config.conditions)
        ? { logic: 'AND', conditions: config.conditions, groups: [] }
        : config.conditions,
    }),
  ],
}

export function migrateNodeConfig(node: {
  type: WorkflowNodeType
  configVersion?: number
  config: unknown
}): { config: unknown; configVersion: number } {
  const migrations   = nodeConfigMigrations[node.type] ?? []
  const startVersion = (node.configVersion ?? 1) - 1   // 0-indexed into migrations array
  let config = node.config as Record<string, unknown>

  for (let i = startVersion; i < migrations.length; i++) {
    config = migrations[i](config)
  }

  return { config, configVersion: migrations.length + 1 }
}
```

**Integration:** Call `migrateNodeConfig(node)` in `GraphEngine.executeNode()` before processing each node's config.

**Verification:**
```bash
npx tsc --noEmit
```

---

### PHASE6-T19: OpenTelemetry & Expanded Health Checks

**Files to create:**
```
src/shared/telemetry.ts
```
**Files to modify:**
```
src/app/api/health/route.ts
```

**`src/shared/telemetry.ts`:**
```typescript
// Only init OTel in runtime — skip during Next.js build phase
if (
  process.env.NEXT_PHASE !== 'phase-production-build' &&
  process.env.OTEL_EXPORTER_OTLP_ENDPOINT
) {
  // Dynamic imports to avoid affecting cold-start in build context
  void (async () => {
    const { NodeSDK }                    = await import('@opentelemetry/sdk-node')
    const { getNodeAutoInstrumentations } = await import('@opentelemetry/auto-instrumentations-node')
    const { OTLPTraceExporter }          = await import('@opentelemetry/exporter-trace-otlp-http')
    new NodeSDK({
      traceExporter: new OTLPTraceExporter(),
      instrumentations: [getNodeAutoInstrumentations()],
    }).start()
  })()
}
```

**Install dependencies:**
```bash
npm install @opentelemetry/sdk-node @opentelemetry/auto-instrumentations-node @opentelemetry/exporter-trace-otlp-http
```

**Expand `src/app/api/health/route.ts`:**
```typescript
// GET /api/health        → lightweight (DB ping) — load balancer probe
// GET /api/health?deep   → full check (DB + Redis) — monitoring systems
// GET /api/ready         → startup readiness check

export async function GET(req: Request): Promise<Response> {
  const { searchParams } = new URL(req.url)
  const deep = searchParams.has('deep')

  const dbStart = Date.now()
  try { await db.execute(sql`SELECT 1`) } catch {
    return Response.json({ status: 'unhealthy', error: 'Database unreachable' }, { status: 503 })
  }
  const dbLatency = Date.now() - dbStart

  if (!deep) return Response.json({ status: 'healthy', db: { latencyMs: dbLatency } })

  const redisStart = Date.now()
  await redis.ping()
  const redisLatency = Date.now() - redisStart

  return Response.json({
    status: 'healthy',
    checks: {
      database: { status: 'ok', latencyMs: dbLatency },
      redis:    { status: 'ok', latencyMs: redisLatency },
    },
    version: process.env.npm_package_version ?? 'unknown',
    uptime:  process.uptime(),
  })
}
```

**Verification:**
```bash
npx tsc --noEmit
curl http://localhost:3000/api/health        # {"status":"healthy"}
curl http://localhost:3000/api/health?deep   # full check with latencies
```

---

### PHASE6-T20: Full-Text Search Module

**Files to create:**
```
src/modules/search/search.types.ts
src/modules/search/search.repository.ts
src/modules/search/search.router.ts
src/modules/search/index.ts
```

**`search.repository.ts`:**
```typescript
import { sql, and, eq } from 'drizzle-orm'
import { db }           from '@/shared/db'
import { customers, bookings } from '@/shared/db/schemas'

export async function fullTextSearchCustomers(tenantId: string, query: string, limit: number) {
  return db.select().from(customers)
    .where(and(
      eq(customers.tenantId, tenantId),
      sql`${customers.searchVector} @@ plainto_tsquery('english', ${query})`,
      sql`${customers.deletedAt} IS NULL`
    ))
    .orderBy(sql`ts_rank(${customers.searchVector}, plainto_tsquery('english', ${query})) DESC`)
    .limit(limit)
}

export async function fullTextSearchBookings(tenantId: string, query: string, limit: number) {
  return db.select().from(bookings)
    .where(and(
      eq(bookings.tenantId, tenantId),
      sql`${bookings.searchVector} @@ plainto_tsquery('english', ${query})`
    ))
    .orderBy(sql`ts_rank(${bookings.searchVector}, plainto_tsquery('english', ${query})) DESC`)
    .limit(limit)
}
```

**`search.router.ts`:**
```typescript
export const searchRouter = router({
  globalSearch: tenantProcedure.input(z.object({
    query: z.string().min(2).max(100),
    types: z.array(z.enum(['customers', 'bookings'])).optional(),
    limit: z.number().int().min(1).max(50).default(20),
  })).query(async ({ ctx, input }) => {
    const [customerResults, bookingResults] = await Promise.all([
      searchRepository.fullTextSearchCustomers(ctx.tenantId, input.query, 5),
      searchRepository.fullTextSearchBookings(ctx.tenantId, input.query, 5),
    ])
    return {
      results: [
        ...customerResults.map(c => ({ type: 'customer' as const, id: c.id, label: `${c.firstName} ${c.lastName}`, secondary: c.email })),
        ...bookingResults.map(b => ({ type: 'booking'  as const, id: b.id, label: b.bookingNumber ?? b.id, secondary: b.scheduledDate?.toISOString() ?? null })),
      ].slice(0, input.limit)
    }
  })
})
```

**Verification:**
```bash
npx tsc --noEmit
```

---

### PHASE6-T21: Wire All Modules into Root Router & Inngest

**Files to modify:**
```
src/server/root.ts
src/app/api/inngest/route.ts
src/shared/inngest.ts
```

**`src/server/root.ts`** — Append new routers:
```typescript
import { paymentRouter }   from '@/modules/payment'
import { analyticsRouter } from '@/modules/analytics'
import { developerRouter } from '@/modules/developer'
import { searchRouter }    from '@/modules/search'

export const appRouter = router({
  // Phase 1–4
  booking, notification, calendarSync,
  // Phase 5
  team, customer, forms, review, workflow, tenant, platform,
  // Phase 6
  payment: paymentRouter, analytics: analyticsRouter,
  developer: developerRouter, search: searchRouter,
})
```

**`src/shared/inngest.ts`** — Add new typed events:
```typescript
"payment/intent.created":       { paymentIntentId: string; bookingId: string; tenantId: string; amount: number; currency: string }
"payment/intent.succeeded":     { paymentIntentId: string; bookingId: string; tenantId: string; amount: number }
"payment/intent.failed":        { paymentIntentId: string; bookingId: string; tenantId: string; error: string }
"payment/refund.requested":     { paymentId: string; bookingId: string; tenantId: string; amount: number; reason: string }
"payment/refund.completed":     { refundId: string; paymentId: string; tenantId: string }
"payment/dispute.created":      { disputeId: string; paymentId: string; tenantId: string; amount: number }
"stripe/webhook.received":      { eventType: string; stripeEventId: string; payload: Record<string, unknown> }
"webhook/delivery.failed":      { endpointId: string; tenantId: string; eventType: string; reason: string; failureCount: number }
"waitlist/slot.available":      { waitlistEntryId: string; bookingId: string; tenantId: string; customerId: string }
"analytics/snapshot.compute":   { tenantId: string; periodType: string; periodStart: string }
"saga/compensation.required":   { sagaId: string; sagaType: string; entityId: string; tenantId: string }
"calendar/sync.delete":         { bookingId: string; userId: string; tenantId: string }
```

**`src/app/api/inngest/route.ts`** — Register all new Inngest functions:
```typescript
serve({
  client: inngest,
  functions: [
    // existing Phase 5 functions...
    // Phase 6 additions:
    handleStripeWebhook,
    overdueInvoiceCron,
    computeMetricSnapshots,
    onBookingCancelled,    // waitlist trigger
    dispatchWebhooks,      // developer webhook platform
  ]
})
```

**Verification:**
```bash
npx tsc --noEmit
npm run build
```

---

### PHASE6-T22: Update Booking Service — Saga, State Machine, Concurrency

**Files to modify:**
```
src/modules/booking/booking.service.ts
```

**Changes required:**
1. Import `assertValidBookingTransition` — call before EVERY status mutation
2. Wrap `confirmBooking` in `withSlotLock` — DB advisory lock prevents double-booking
3. Replace direct `db.update(bookings, { status })` with `updateWithVersion()` — optimistic concurrency
4. Replace chained `inngest.send()` calls in `confirmBooking` with `BookingConfirmationSaga.run()`

**Pattern for every status update (replicate for all mutations):**
```typescript
// Before (unsound):
await bookingRepository.updateStatus(bookingId, newStatus)

// After (sound):
const booking = await bookingRepository.findById(bookingId, tenantId)
if (!booking) throw new NotFoundError('Booking not found')
assertValidBookingTransition(booking.status as BookingStatus, newStatus)
await updateWithVersion(bookingsTable, bookingId, tenantId, booking.version, { status: newStatus })
```

**Verification:**
```bash
npx tsc --noEmit
npm test src/modules/booking   # all existing booking tests still pass
```

---

### PHASE6-T23: Tests — Financial Completeness

**Files to create:**
```
src/modules/payment/__tests__/state-machine.test.ts
src/modules/payment/__tests__/pricing-engine.test.ts
src/modules/payment/__tests__/tax-engine.test.ts
src/modules/payment/__tests__/payment.service.test.ts
```

**`state-machine.test.ts`** — All valid + invalid transitions:
- 14 valid invoice transitions all pass `assertValidInvoiceTransition`
- Invalid: `VOID → SENT` throws `BadRequestError`
- Invalid: `REFUNDED → DRAFT` throws `BadRequestError`
- Terminal: `VOID → []`, `REFUNDED → []` (no valid targets)
- Error message contains both states and valid alternatives

**`pricing-engine.test.ts`:**
- Rule ordering: two matching rules; verify sortOrder=0 wins over sortOrder=1
- All 5 modifier types: FIXED_PRICE, FIXED_DISCOUNT, PERCENT_DISCOUNT, FIXED_SURCHARGE, PERCENT_SURCHARGE
- `PERCENT_DISCOUNT 20% on $100 = $80.00` (not float drift)
- `serviceIds` filter: rule with `[serviceA]` does not apply to `serviceB`
- `maxUses` enforcement: `currentUses >= maxUses` → rule skipped
- `validUntil` past → rule skipped; `validFrom` future → rule skipped
- Empty rules array → returns basePrice unchanged

**`tax-engine.test.ts`:**
- UK 20% VAT: `calculateTax(100, { rate: 0.2 })` → `{ subtotal: 100, taxAmount: 20, totalAmount: 120 }`
- Rounding: `calculateTax(33.33, { rate: 0.2 })` → `taxAmount: 6.67` (not 6.666)
- Zero rate: `calculateTax(50, { rate: 0 })` → `taxAmount: 0, totalAmount: 50`
- Invariant: `totalAmount === subtotal + taxAmount` for every test case (no accumulation drift)

**`payment.service.test.ts`** — Mock providers; Stripe not called:
- `createInvoice` → status DRAFT
- `sendInvoice` on DRAFT → status SENT; on SENT → `BadRequestError`
- `voidInvoice` on SENT → VOID; on PAID → `BadRequestError` (terminal-adjacent)
- `recordPayment` calls idempotency layer (mock Redis); duplicate key → cached result

**Verification:**
```bash
npm test src/modules/payment/__tests__
```

---

### PHASE6-T24: Tests — Booking State Machine, Saga & Slot Lock

**Files to create:**
```
src/modules/booking/__tests__/booking-state-machine.test.ts
src/modules/booking/__tests__/booking-saga.test.ts
src/modules/booking/__tests__/slot-lock.test.ts
```

**`booking-state-machine.test.ts`:**
- All 14 valid transitions pass without throwing
- All terminal states (COMPLETED, CANCELLED, NO_SHOW, REJECTED) throw for any target
- `RELEASED → PENDING` (the only self-recovery path) succeeds
- Error message includes both from/to states and valid alternatives

**`booking-saga.test.ts`:**
- Success path: all 4 steps execute in order; all 4 mocks called once
- Failure at step 3 (send-notification): steps 1+2 compensate in reverse order; step 3 compensate not called (failed before completing)
- Failure at step 4 (sync-calendar): steps 1+2+3 compensate in reverse; notifications compensate is no-op
- Compensation step itself throws: error logged at CRITICAL; original step error still re-thrown

**`slot-lock.test.ts`:**
- Sequential calls with same slot key succeed; second runs after first commits
- Concurrent calls with DIFFERENT keys execute concurrently (no unnecessary blocking)

**Verification:**
```bash
npm test src/modules/booking/__tests__
```

---

### PHASE6-T25: Tests — Shared Correctness Utilities

**Files to create:**
```
src/shared/__tests__/idempotency.test.ts
src/shared/__tests__/optimistic-concurrency.test.ts
```

**`idempotency.test.ts`:**
- First call: operation executes, result cached
- Second call with same key: operation NOT called; cached result returned (mock Redis `get` returns value)
- Concurrent duplicate: second call gets `ConflictError` (lock already held)
- Different keys: both operations execute independently

**`optimistic-concurrency.test.ts`:**
- `expectedVersion` matches DB: update succeeds, version becomes N+1
- `expectedVersion` is stale (N-1): mock returns 0 rows → `ConflictError`
- Verify: DB update WHERE clause includes `version = $expectedVersion` (SQL inspection)

**Verification:**
```bash
npm test src/shared/__tests__
```

---

### PHASE6-T26: Tests — Expression Evaluator (Updated for expr-eval)

**Files to modify:**
```
src/modules/workflow/__tests__/workflow.test.ts
```

**Add expression evaluator tests:**
- Math: `evaluateExpression("{{price}} * 1.2", ctx)` with `price=100` → `120`
- Boolean: `evaluateExpression("{{count}} > 5", ctx)` with `count=6` → `true`
- String concat: `"{{first}} {{last}}"` → `"John Smith"`
- Safe injection: `"1; process.exit()"` → returns as string literal, does NOT exit
- No function calls: `"Math.random()"` → returns as string literal (not executed)
- grep check: `grep -rn "new Function" src/` → 0 results

**Verification:**
```bash
grep -rn "new Function\|Function(" src/modules/workflow/engine/expressions.ts   # 0 results
npm test src/modules/workflow/__tests__
```

---

### PHASE6-T27: Tests — Webhook Delivery & Analytics

**Files to create:**
```
src/modules/developer/__tests__/webhook-delivery.test.ts
src/modules/analytics/__tests__/analytics.test.ts
src/modules/search/__tests__/search.test.ts
```

**`webhook-delivery.test.ts`:**
- Success: `fetch` returns 200 → status `SUCCESS`, `deliveredAt` set
- Retry: first attempt returns 503, second returns 200 → status `SUCCESS` after retry
- HMAC: verify `X-Webhook-Signature` header = `sha256=${expected}`
- Timing-safe: `verifyHmacSignature` uses `timingSafeEqual` — passes for correct, fails for tampered
- Failure tracking: endpoint `failure_count` incremented; at 10 failures → status `DISABLED`

**`analytics.test.ts`:**
- RFM HIGH: `lastBookingDaysAgo=180, frequency=0.1, avgValue=20` → `churnRiskLabel='HIGH'`
- RFM LOW: `lastBookingDaysAgo=3, frequency=8, avgValue=200` → `churnRiskLabel='LOW'`
- Forecasting: 84 days of mock history → 7-day forecast; each point within ±50% of history mean
- Metric aggregation: `computeHourlyMetrics` upserts all 18 metric keys (count 18 upsert calls)

**`search.test.ts`:**
- Customer FTS: mock DB returns customer when `searchVector @@ plainto_tsquery('english', 'john')` matches
- Booking FTS: booking number search returns booking result
- Global search: combined results from both entities, limited to `input.limit`

**Verification:**
```bash
npm test src/modules/developer/__tests__ src/modules/analytics/__tests__ src/modules/search/__tests__
```

---

### PHASE6-T28: Tests — Scheduling & Invariant Verification

**Files to create:**
```
src/modules/scheduling/__tests__/smart-assignment.test.ts
src/modules/scheduling/__tests__/waitlist.test.ts
src/__tests__/invariants.test.ts
```

**`smart-assignment.test.ts`:**
- ROUND_ROBIN: 3 staff available, 6 bookings assigned → each staff assigned exactly twice
- LEAST_LOADED: staff A has 0 bookings, staff B has 3 → A selected
- SKILL_MATCH: service requires `['pediatrics']`; only staff with that skill returned
- GEOGRAPHIC: customer 1km from A, 10km from B → A selected (Haversine calculation verified)
- PREFERRED: `preferredStaffId` set and available → returned as first choice

**`waitlist.test.ts`:**
- `addToWaitlist` creates entry with `status='WAITING'`, `expiresAt` 30 days ahead
- `checkAndNotifyWaitlist` finds matching entry → sends `waitlist/slot.available` event → status `NOTIFIED`
- No matching entry → no error, no event sent

**`src/__tests__/invariants.test.ts`** — All 12 formal invariants:
```typescript
describe('Formal Invariants (I1–I12)', () => {
  it('I1: invoice total constraint enforced')
  it('I2: terminal booking states reject all transitions', () => {
    for (const s of ['COMPLETED', 'CANCELLED', 'NO_SHOW', 'REJECTED']) {
      expect(() => assertValidBookingTransition(s as BookingStatus, 'PENDING')).toThrow(BadRequestError)
    }
  })
  it('I5: idempotency key returns same result on duplicate call')
  it('I6: validateWorkflowGraph rejects graph with cycle')
  it('I6: validateWorkflowGraph rejects graph with 0 TRIGGER nodes')
  it('I6: validateWorkflowGraph rejects graph with 2 TRIGGER nodes')
  it('I9: expressions.ts contains no Function() constructor', () => {
    const src = fs.readFileSync('./src/modules/workflow/engine/expressions.ts', 'utf8')
    expect(src).not.toContain('new Function')
    expect(src).not.toContain('Function(')
  })
  it('I11: webhook delivery HMAC signature is timing-safe')
  it('I12: stale version update throws ConflictError and makes no DB change')
  // I3, I4, I7, I8, I10: verified via integration coverage in respective module tests
})
```

**Verification:**
```bash
npm test src/__tests__/invariants.test.ts
npm test src/modules/scheduling/__tests__
```

---

### PHASE6-T29: Final Verification

```bash
# 1. Type check — zero tolerance
npx tsc --noEmit
# Expected: 0 errors

# 2. Production build
npm run build
# Expected: Build succeeded (no warnings about missing env vars in modules)

# 3. Full test suite
npm test
# Expected: 250+ tests passing, 0 failing

# 4. Invariant I9 — no Function() constructor
grep -rn "new Function\|eval(" src/modules/workflow/engine/expressions.ts
# Expected: 0 results

# 5. No console.log in modules (all logging via pino)
grep -r "console\.log" src/modules/
# Expected: 0 results

# 6. Test count verification
npm test -- --reporter=verbose 2>&1 | grep "tests passed"
# Expected: 250 or higher
```

---

## New Inngest Events Summary

| Event | Data Shape | Producer |
|---|---|---|
| `payment/intent.created` | `{ paymentIntentId, bookingId, tenantId, amount, currency }` | `payment.service` |
| `payment/intent.succeeded` | `{ paymentIntentId, bookingId, tenantId, amount }` | Stripe webhook bridge |
| `payment/intent.failed` | `{ paymentIntentId, bookingId, tenantId, error }` | Stripe webhook bridge |
| `payment/refund.requested` | `{ paymentId, bookingId, tenantId, amount, reason }` | `payment.service` |
| `payment/refund.completed` | `{ refundId, paymentId, tenantId }` | Stripe webhook bridge |
| `payment/dispute.created` | `{ disputeId, paymentId, tenantId, amount }` | Stripe webhook bridge |
| `stripe/webhook.received` | `{ eventType, stripeEventId, payload }` | `/api/webhooks/stripe` |
| `webhook/delivery.failed` | `{ endpointId, tenantId, eventType, reason, failureCount }` | `webhook-delivery.ts` |
| `waitlist/slot.available` | `{ waitlistEntryId, bookingId, tenantId, customerId }` | `scheduling.events` |
| `analytics/snapshot.compute` | `{ tenantId, periodType, periodStart }` | `analytics.events` |
| `saga/compensation.required` | `{ sagaId, sagaType, entityId, tenantId }` | `booking.saga` |
| `calendar/sync.delete` | `{ bookingId, userId, tenantId }` | Saga compensation |

---

## Root Router Final State

```typescript
export const appRouter = router({
  // Phase 1–4
  booking, notification, calendarSync,
  // Phase 5
  team, customer, forms, review, workflow, tenant, platform,
  // Phase 6
  payment, analytics, developer, search,
})
```

---

## Formal Invariants Reference

| # | Invariant | Enforcement Layer |
|---|---|---|
| I1 | `sum(payments where invoiceId) ≤ invoice.totalAmount` | DB CHECK constraint |
| I2 | Terminal booking states (COMPLETED, CANCELLED, NO_SHOW, REJECTED) accept no outgoing transitions | `assertValidBookingTransition()` |
| I3 | Every confirmed booking has ≥1 notification attempt | Saga step 3 (send-notification) |
| I4 | Concurrent requests for same slot cannot both result in confirmed booking | `pg_advisory_xact_lock` in `withSlotLock()` |
| I5 | Same idempotency key → same result, exactly one charge | `withIdempotency()` Redis NX lock |
| I6 | Saved workflow graph (`isVisual=true`) is always a valid DAG with exactly one TRIGGER node | `validateWorkflowGraph()` on every save |
| I7 | Workflow execution depth never exceeds 3 | `__workflowDepth` check at execution entry |
| I8 | Customer merge is atomic across all 7 related tables | `db.transaction()` in merge service |
| I9 | No expression evaluator uses `eval()` or `Function()` with user input | `expr-eval` library + grep CI gate |
| I10 | API key rate limit applied before any business logic | Rate limiting middleware at `/api/v1` route |
| I11 | All webhook deliveries include valid HMAC-SHA256 signature | `createHmacSignature()` + `timingSafeEqual()` |
| I12 | Version mismatch on update raises `ConflictError`, no DB change | `updateWithVersion()` WHERE version check |

---

## Risk Register

| Risk | Severity | Mitigation |
|---|---|---|
| Saga compensation failure | CRITICAL | CRITICAL log + `requires_manual_intervention = true` + ops alert |
| Stripe webhook replay | HIGH | Stripe event ID as idempotency key; `constructEvent` HMAC + timestamp |
| `pg_advisory_xact_lock` deadlock | HIGH | Always acquire locks sorted by canonical key (tenantId:staffId:date) |
| GoCardless direct debit returned | HIGH | `payment/dispute.created` → notify admin + pause related bookings |
| Webhook HMAC timing attack | HIGH | `crypto.timingSafeEqual()` — never string `===` for HMAC comparison |
| Schema migration fails on live DB | HIGH | All changes additive; `CONCURRENTLY` indexes; rollback plan in migration |
| Analytics snapshot stale (cron fails) | MEDIUM | Health check alerts if last snapshot > 2 hours old |
| `expr-eval` library CVE | MEDIUM | Pin version + `allowMemberAccess: false` + quarterly audit |
| Rate limit bypass via key rotation | MEDIUM | Track by `apiKeys.id` (not key string); revoked keys rejected before rate check |
| FTS index lag after column add | MEDIUM | `CONCURRENTLY` + verify index size before enabling FTS endpoints |
| Forecast confidence widens (sparse data) | LOW | Return `basisPoints` in response; UI warns if < 30 data points |
| Optimistic concurrency version overflow | LOW | INTEGER max = 2.1B; at 1,000 updates/day → 5,753 years to overflow |

---

## Success Criteria

Phase 6 is complete when ALL of the following pass:

- [ ] `npx tsc --noEmit` → **0 errors**
- [ ] `npm run build` → **succeeds**
- [ ] `npm test` → **250+ tests passing, 0 failing**
- [ ] `grep -rn "new Function" src/` → **0 results** (invariant I9)
- [ ] `grep -r "console\.log" src/modules/` → **0 results**
- [ ] Booking → invoice → payment → refund flow verified by test end-to-end
- [ ] Analytics returns 12-month revenue time series (tested with mock data)
- [ ] Developer can create API key → make REST call (mocked) → receive webhook delivery
- [ ] `validateWorkflowGraph()` rejects non-DAG and multiple TRIGGER nodes
- [ ] Every invariant I1–I12 has at least one test verifying enforcement
- [ ] All 12 formal invariants covered in `src/__tests__/invariants.test.ts`
