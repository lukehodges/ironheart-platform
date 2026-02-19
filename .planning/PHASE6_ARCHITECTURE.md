# Phase 6 Architecture — Ironheart Refactor
# CTO Whitepaper: 10x Capability & Mathematical Completeness
# Date: 2026-02-19 | Author: CTO Analysis

---

## Preamble

This document is written at the intersection of systems architecture and correctness theory. Phase 5 delivered operational completeness — a system that *works*. Phase 6 delivers *guarantees* — a system that can be reasoned about formally, that handles money correctly, that surfaces intelligence from its data, and that is open to the world as a platform.

The standard we hold ourselves to: **every stated invariant must be enforced at the database or Inngest layer, not just the application layer.** Application code lies. Constraints do not.

---

## Executive Summary

### What Phase 5 Got Right

| Strength | Why It Matters |
|---|---|
| Inngest for async orchestration | Durable execution, exactly-once step semantics, serverless-compatible — best possible choice for this use case |
| tRPC 11 + Zod v4 end-to-end type safety | Eliminates an entire class of integration bugs; schema changes are compile-time errors |
| Graph workflow engine with dual-mode | n8n parity; the schema's `nodes`/`edges` JSONB was designed for this from day 1 |
| Properly normalized multi-tenancy | `tenantId` on every row; no bolted-on sharding; RBAC model is textbook correct |
| 42+ tables, schema complete | Nothing to migrate — the data model was built with foresight |
| Event-driven module boundaries | `booking.service` never calls `notification.service` directly — always via Inngest |
| `auditLogs` table with full old/new JSONB | The skeleton of event sourcing is already there |

### What Phase 5 Left Incomplete

| Gap | Severity | Root Cause |
|---|---|---|
| **Payments/billing: zero logic** | CRITICAL | `invoices` + `payments` tables are complete stubs |
| **Analytics: zero metrics** | HIGH | No aggregation layer, no time-series, no dashboard |
| **Developer API: schema exists, logic absent** | HIGH | `apiKeys` table has 12 columns; no middleware uses them |
| **No Saga pattern** | HIGH | Booking → Payment → Notification are independent, not compensatable |
| **Expression evaluator uses `Function()`** | HIGH | `/^[\d\s+\-*/().]+$/` regex guard is the only protection; not formally safe |
| **No optimistic concurrency** | MEDIUM | `bookings` has no `version` column; concurrent updates silently overwrite |
| **No outbound webhook platform** | MEDIUM | Workflow WEBHOOK node ≠ developer-configured webhooks |
| **No full-text search** | MEDIUM | No `tsvector` columns; customer search is ILIKE only |
| **Outlook/Apple calendar: stubs** | MEDIUM | `providers/outlook/index.ts` and `providers/apple/index.ts` exist but empty |
| **No OpenTelemetry traces** | MEDIUM | Sentry captures errors; no distributed tracing |
| **No schema evolution for workflows** | MEDIUM | Changing a node config breaks executing workflows |
| **No waitlists, round-robin, skill routing** | LOW | Scheduling engine is first-come-first-serve only |

### The 10x Opportunity

Phase 5 is a great **operational tool**. Phase 6 makes it a **platform** — one that:
1. Handles money end-to-end with formal correctness guarantees
2. Turns its own operational data into intelligence
3. Opens itself to the world via a developer API and webhook platform
4. Enforces invariants at the database layer, not just the application layer
5. Can be reasoned about formally: state machines, saga logs, idempotency proofs

**LOC estimate:** ~22,000 new LOC across 5 pillars
**Schema changes required:** 12 new tables, 8 column additions, 6 indexes
**Target test count:** 250+ (from 160+ after Phase 5)

---

## Five Pillars

```
PILLAR 1: Financial Completeness      — Stripe, GoCardless, invoicing, pricing, tax
PILLAR 2: Analytics & Intelligence    — Metrics engine, smart scheduling, LTV, forecasting
PILLAR 3: Developer Platform          — REST API, webhooks, rate limiting, OpenAPI, SDK
PILLAR 4: Distributed Correctness     — Saga, idempotency, concurrency, expression safety
PILLAR 5: Observability & Search      — OTel traces, FTS, query analysis, health
```

---

## Pillar 1: Financial Completeness

### 1.1 The Problem

The `invoices` table has 22 columns. The `payments` table has 20 columns. The `paymentMethod` enum includes `CARD`, `BANK_TRANSFER`, `DIRECT_DEBIT`, `CASH`. The `invoiceStatus` enum covers `DRAFT → SENT → VIEWED → PAID → OVERDUE → VOID → REFUNDED`.

None of this has any service logic. A business that can't collect money isn't a business.

### 1.2 Stripe Integration (Primary)

**Two Stripe modes:**

```
Mode A: Stripe Billing (platform subscriptions)
  → Ironheart SaaS billing: tenants pay Ironheart
  → Maps to: tenants.stripeCustomerId, tenants.subscriptionId

Mode B: Stripe Connect (marketplace)
  → Tenants collect from their customers
  → Each tenant has a Stripe Connect account
  → Ironheart takes platform fee on each transaction
```

**New schema:**
```sql
-- Stripe Connect accounts per tenant
CREATE TABLE stripe_connect_accounts (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  stripe_account_id TEXT NOT NULL UNIQUE,  -- acct_xxx
  status TEXT NOT NULL,                    -- 'pending' | 'active' | 'restricted' | 'deauthorized'
  charges_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  payouts_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  requirements JSONB,                      -- Stripe requirements object
  capabilities JSONB,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  UNIQUE(tenant_id)
);

-- Stripe Payment Intents (link to payments table)
ALTER TABLE payments ADD COLUMN stripe_payment_intent_id TEXT UNIQUE;
ALTER TABLE payments ADD COLUMN stripe_charge_id TEXT;
ALTER TABLE payments ADD COLUMN stripe_transfer_id TEXT;  -- for Connect
ALTER TABLE payments ADD COLUMN platform_fee_amount NUMERIC(10,2);
ALTER TABLE payments ADD COLUMN idempotency_key TEXT UNIQUE;  -- see Pillar 4
```

**New Inngest events:**
```typescript
"payment/intent.created":   { paymentIntentId, bookingId, tenantId, amount, currency }
"payment/intent.succeeded": { paymentIntentId, bookingId, tenantId, amount }
"payment/intent.failed":    { paymentIntentId, bookingId, tenantId, error }
"payment/refund.requested": { paymentId, bookingId, tenantId, amount, reason }
"payment/refund.completed": { refundId, paymentId, tenantId }
"payment/dispute.created":  { disputeId, paymentId, tenantId, amount }
"stripe/webhook.received":  { eventType, stripeEventId, data }
```

**Stripe webhook → Inngest bridge:**
```typescript
// src/app/api/webhooks/stripe/route.ts
// Validates Stripe-Signature header with stripe.webhooks.constructEvent()
// Then: inngest.send("stripe/webhook.received", { eventType, stripeEventId, data })
// Inngest handler routes to appropriate payment service function
// This is the correct pattern: webhook → Inngest → durable handler
```

**Payment service invariants (enforced at DB layer):**
```sql
-- Total payments cannot exceed invoice total (CHECK constraint)
ALTER TABLE invoices ADD CONSTRAINT payments_cannot_exceed_total
  CHECK (amount_paid <= total_amount);

-- Refund cannot exceed original payment
ALTER TABLE payments ADD CONSTRAINT refund_cannot_exceed_original
  CHECK (
    type != 'REFUND' OR
    amount <= (SELECT amount FROM payments p2 WHERE p2.id = payments.invoice_id LIMIT 1)
  );
```

### 1.3 GoCardless (Direct Debit)

UK-first. Direct debit is the dominant B2B payment method in the UK (90-day payment terms, recurring billing).

```typescript
// src/modules/payment/providers/gocardless.provider.ts
interface GoCardlessProvider {
  createMandate(customerId: string, bankAccount: BankAccountInput): Promise<Mandate>
  createPayment(mandateId: string, amount: number, reference: string): Promise<GCPayment>
  cancelMandate(mandateId: string): Promise<void>
  handleWebhook(payload: string, signature: string): Promise<GoCardlessEvent[]>
}

// New schema columns:
// customers: gocardless_customer_id TEXT, gocardless_mandate_id TEXT, mandate_status TEXT
// payments: gocardless_payment_id TEXT, gocardless_mandate_id TEXT
```

### 1.4 Invoice Engine

**PDF generation using React components (consistent with existing email templates):**
```typescript
// src/modules/payment/lib/invoice-pdf.ts
// Uses @react-pdf/renderer or similar
// Renders: tenant branding (logo, colors from organizationSettings), line items,
//   tax breakdown, payment terms, bank details, QR code for online payment

interface InvoicePdfContext {
  invoice: InvoiceRecord
  tenant: OrganizationSettings
  customer: CustomerRecord
  booking?: BookingRecord
  paymentLink?: string   // Stripe hosted payment link
}
```

**Invoice state machine (formally specified):**
```
DRAFT → SENT (on send)
SENT → VIEWED (on customer open, via tracking pixel)
SENT → OVERDUE (on cron, if dueDate passed)
SENT → PAID (on full payment)
SENT → PARTIALLY_PAID (on partial payment)
PARTIALLY_PAID → PAID (on remaining payment)
PARTIALLY_PAID → OVERDUE (on cron)
OVERDUE → PAID (on late payment)
SENT | OVERDUE → VOID (on manual void)
PAID → REFUNDED (on full refund)

Invalid transitions: VOID → any, REFUNDED → any
```

**Enforced in service:**
```typescript
const VALID_INVOICE_TRANSITIONS: Record<InvoiceStatus, InvoiceStatus[]> = {
  DRAFT:           ['SENT'],
  SENT:            ['VIEWED', 'PAID', 'PARTIALLY_PAID', 'OVERDUE', 'VOID'],
  VIEWED:          ['PAID', 'PARTIALLY_PAID', 'OVERDUE', 'VOID'],
  PARTIALLY_PAID:  ['PAID', 'OVERDUE'],
  OVERDUE:         ['PAID', 'PARTIALLY_PAID', 'VOID'],
  PAID:            ['REFUNDED'],
  VOID:            [],
  REFUNDED:        [],
}

function assertValidTransition(from: InvoiceStatus, to: InvoiceStatus): void {
  if (!VALID_INVOICE_TRANSITIONS[from].includes(to)) {
    throw new BadRequestError(`Invalid invoice transition: ${from} → ${to}`)
  }
}
```

### 1.5 Pricing Rules Engine

The current system has a flat `services.price`. Phase 6 introduces a rules engine:

```typescript
// New table: pricing_rules
// Evaluated in order (sortOrder ASC); first matching rule wins

interface PricingRule {
  id: string
  tenantId: string
  name: string
  enabled: boolean
  sortOrder: number
  // Trigger conditions
  conditions: PricingConditionGroup   // same condition group structure as workflow
  // Price modification
  modifierType: 'FIXED_PRICE' | 'FIXED_DISCOUNT' | 'PERCENT_DISCOUNT' | 'FIXED_SURCHARGE' | 'PERCENT_SURCHARGE'
  modifierValue: number               // amount or percentage
  // Scope
  serviceIds?: string[]               // null = all services
  staffIds?: string[]                 // null = all staff
  validFrom?: Date
  validUntil?: Date
  maxUses?: number
  currentUses: number
}

// Conditions can reference:
// - booking.dayOfWeek (for weekend surcharge)
// - booking.timeOfDay (for peak/off-peak)
// - customer.bookingCount (for loyalty discount)
// - booking.serviceId
// - booking.advanceDays (early bird discount)
```

**Discount codes:**
```sql
CREATE TABLE discount_codes (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  code TEXT NOT NULL,
  UNIQUE(tenant_id, code),
  pricing_rule_id UUID REFERENCES pricing_rules(id),
  expires_at TIMESTAMPTZ,
  max_uses INTEGER,
  current_uses INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL
);
```

### 1.6 Tax Engine

```typescript
interface TaxRule {
  id: string
  tenantId: string
  name: string                 // "UK Standard Rate", "Zero Rate"
  rate: number                 // 0.20 for 20% VAT
  country: string              // ISO 3166-1 alpha-2
  taxCode?: string             // for accounting integrations
  appliesTo: 'ALL' | 'SERVICE' | 'PRODUCT'
  isDefault: boolean
  isReverseCharge: boolean     // B2B EU reverse charge
}

// Tax calculation is always: amount * (1 + rate) for inclusive, amount * rate for exclusive
// Store: taxAmount separately on invoices + line items
// Rule: tax is NEVER calculated from stored totalAmount (prevents rounding drift)
//   Always: taxAmount = round(subtotal * rate, 2)
//   Always: totalAmount = subtotal + taxAmount (NOT taxAmount / rate)
```

### 1.7 Payment Module File Structure

```
src/modules/payment/
  payment.types.ts
  payment.schemas.ts
  payment.repository.ts
  payment.service.ts              # business logic: createInvoice, recordPayment, etc.
  payment.router.ts               # tRPC: invoices + payments CRUD + PDF endpoint
  payment.events.ts               # Inngest: stripe webhook handler, payment saga steps
  providers/
    stripe.provider.ts            # Stripe + Stripe Connect
    gocardless.provider.ts        # GoCardless mandates + payments
    cash.provider.ts              # manual cash recording
    provider.factory.ts
  lib/
    invoice-pdf.ts                # PDF generation
    pricing-engine.ts             # evaluates pricing_rules in order
    tax-engine.ts                 # tax calculation, reverse charge
    reconciliation.ts             # verify payments match invoices
    state-machine.ts              # enforces valid invoice transitions
  index.ts
  __tests__/
    pricing-engine.test.ts        # rule ordering, condition eval, modifier math
    tax-engine.test.ts            # VAT calculation, rounding correctness
    state-machine.test.ts         # all valid and invalid transitions
    payment.service.test.ts       # stripe integration mocked
```

---

## Pillar 2: Analytics & Intelligence

### 2.1 The Problem

The system generates rich operational data (bookings, payments, reviews, form responses, workflow executions) but surfaces zero intelligence. You cannot answer: "What is my busiest day?", "Which staff generates the most revenue?", "What is my average booking lead time?", "Which customers are about to churn?"

### 2.2 Metrics Architecture

**Decision: PostgreSQL materialized views + Redis for real-time, NOT a separate OLAP database.**

Rationale: the data volume for a multi-tenant booking SaaS does not warrant ClickHouse or BigQuery at this stage. PostgreSQL with proper indexes and materialized views handles millions of rows efficiently. Adding another database adds ops complexity with marginal benefit.

**New table: `metric_snapshots` (append-only)**
```sql
CREATE TABLE metric_snapshots (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  metric_key TEXT NOT NULL,       -- 'bookings.count', 'revenue.gross', 'customers.new'
  dimensions JSONB NOT NULL,      -- { staffId, serviceId, venueId } — nullable dimensions
  period_type TEXT NOT NULL,      -- 'HOUR' | 'DAY' | 'WEEK' | 'MONTH'
  period_start TIMESTAMPTZ NOT NULL,
  value NUMERIC NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  INDEX idx_metric_snapshots_lookup (tenant_id, metric_key, period_type, period_start DESC),
  INDEX idx_metric_snapshots_dims (tenant_id, metric_key, dimensions jsonb_path_ops)
);
```

**Metric catalog:**

| Metric Key | Description | Dimensions |
|---|---|---|
| `bookings.created` | New bookings in period | staffId, serviceId, venueId, source |
| `bookings.confirmed` | Confirmed bookings | staffId, serviceId |
| `bookings.cancelled` | Cancellations | staffId, serviceId, reason |
| `bookings.completed` | Completions | staffId, serviceId |
| `bookings.no_show` | No-shows | staffId |
| `bookings.lead_time_avg` | Avg days booked in advance | serviceId |
| `revenue.gross` | Gross revenue | staffId, serviceId |
| `revenue.net` | Net after fees/discounts | staffId, serviceId |
| `revenue.outstanding` | Unpaid invoices | — |
| `revenue.refunded` | Refund amount | — |
| `customers.new` | New customers added | source |
| `customers.returning` | Customers with >1 booking | — |
| `customers.ltv_avg` | Average lifetime value | — |
| `reviews.rating_avg` | Average rating | staffId, serviceId |
| `reviews.response_rate` | % who left review when asked | — |
| `forms.completion_rate` | % submitted forms | templateId |
| `workflows.executions` | Workflow runs | workflowId |
| `staff.utilisation` | Booked hours / available hours | staffId |

**Aggregation Inngest function (runs hourly):**
```typescript
const computeMetricSnapshots = inngest.createFunction(
  { id: 'compute-metric-snapshots', retries: 2 },
  { cron: '0 * * * *' },  // every hour
  async ({ step }) => {
    const tenants = await step.run('load-tenants', () =>
      db.select({ id: tenants.id }).from(tenants).where(eq(tenants.status, 'ACTIVE'))
    )

    await Promise.all(tenants.map(tenant =>
      step.run(`compute-${tenant.id}`, () =>
        analyticsService.computeHourlyMetrics(tenant.id)
      )
    ))
  }
)
```

**Redis real-time counters (for live dashboard):**
```typescript
// Incremented on every booking event — no delay
// Key: metrics:{tenantId}:{metricKey}:{YYYY-MM-DD}
// TTL: 48 hours (yesterday + today)
await redis.incr(`metrics:${tenantId}:bookings.created:${today}`)
await redis.incrbyfloat(`metrics:${tenantId}:revenue.gross:${today}`, amount)

// Dashboard API reads Redis for today, metric_snapshots for historical
```

### 2.3 Analytics Router

```typescript
export const analyticsRouter = router({
  // KPI summary (Redis + snapshots combined)
  getSummary: tenantProcedure.input(z.object({
    period: z.enum(['TODAY', 'WEEK', 'MONTH', 'QUARTER', 'YEAR']),
  })).query()

  // Time series for charting
  getTimeSeries: tenantProcedure.input(z.object({
    metric: z.string(),
    periodType: z.enum(['HOUR', 'DAY', 'WEEK', 'MONTH']),
    from: z.string(),
    to: z.string(),
    dimensions: z.record(z.string(), z.string()).optional(),
  })).query()

  // Staff performance
  getStaffPerformance: permissionProcedure('analytics:read').input(staffPerformanceSchema).query()

  // Revenue breakdown
  getRevenueBreakdown: permissionProcedure('analytics:read').input(revenueSchema).query()

  // Customer insights
  getCustomerInsights: permissionProcedure('analytics:read').query()

  // Booking funnel (created → confirmed → completed)
  getBookingFunnel: permissionProcedure('analytics:read').input(funnelSchema).query()

  // Scheduled report configuration
  listReports: tenantProcedure.query()
  createReport: permissionProcedure('analytics:write').input(createReportSchema).mutation()
  exportReport: permissionProcedure('analytics:read').input(exportSchema).mutation()
})
```

### 2.4 Customer Intelligence: LTV & Churn Signals

```typescript
// src/modules/analytics/lib/customer-intelligence.ts

interface CustomerInsights {
  customerId: string
  ltv: number                      // sum of completed payments
  avgBookingValue: number
  bookingFrequencyDays: number     // avg days between bookings
  lastBookingDaysAgo: number
  noShowRate: number
  reviewSentiment: 'positive' | 'neutral' | 'negative' | null
  churnRiskScore: number           // 0–1, computed from frequency + recency
  churnRiskLabel: 'LOW' | 'MEDIUM' | 'HIGH'
  nextPredictedBookingDate: Date | null  // based on frequency pattern
}

// Churn risk formula (RFM model):
// R = days since last booking (lower = better)
// F = bookings per 90 days (higher = better)
// M = avg booking value (higher = better)
// churnRiskScore = normalize(R) * 0.5 + (1 - normalize(F)) * 0.3 + (1 - normalize(M)) * 0.2
// churnRisk HIGH if score > 0.7 AND lastBookingDaysAgo > (2 * avgFrequency)
```

### 2.5 Smart Scheduling

Replaces first-come-first-serve with intelligent assignment:

```typescript
// src/modules/scheduling/lib/smart-assignment.ts

interface AssignmentStrategy {
  type: 'ROUND_ROBIN' | 'LEAST_LOADED' | 'SKILL_MATCH' | 'GEOGRAPHIC' | 'PREFERRED'
  tiebreaker: 'ROUND_ROBIN' | 'AVAILABILITY'
}

// Round robin: rotate through staff who are available, maintaining lastAssignedAt
//   New column: users.lastAssignedAt TIMESTAMPTZ
//   Select staff with earliest lastAssignedAt who is available

// Least loaded: select staff with fewest confirmed bookings on that day

// Skill match: services.metadata JSONB can include requiredSkills[]
//   users.metadata JSONB includes skills[]
//   Filter: staff.skills ⊇ service.requiredSkills

// Geographic: Haversine distance from customer location to staff home/base
//   Already have: customers.latitude/longitude, venues.latitude/longitude
//   New: users.homeLatitude, users.homeLongitude

// Preferred: if customer has preferredStaffId, prefer them (already in schema)
```

**Waitlists:**
```sql
CREATE TABLE booking_waitlist (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  customer_id UUID NOT NULL REFERENCES customers(id),
  service_id UUID NOT NULL REFERENCES services(id),
  staff_id UUID REFERENCES users(id),     -- null = any staff
  preferred_date DATE,
  preferred_time_start TIME,
  preferred_time_end TIME,
  flexibility_days INTEGER DEFAULT 3,
  status TEXT NOT NULL DEFAULT 'WAITING', -- 'WAITING' | 'NOTIFIED' | 'BOOKED' | 'EXPIRED'
  notified_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  INDEX idx_waitlist_service_date (tenant_id, service_id, preferred_date, status)
);
-- When a cancellation occurs: query waitlist for matching service+date, notify customer
-- Inngest event: "booking/cancelled" → triggerWaitlistCheck → notify top waitlist entry
```

### 2.6 Revenue Forecasting

```typescript
// src/modules/analytics/lib/forecasting.ts

// Simple time-series decomposition (no ML dependency, pure math):
// 1. Compute moving average (trend component)
// 2. Compute seasonal indices (day-of-week pattern from 12-week history)
// 3. Forecast = trend * seasonal_index
// 4. Confidence interval = ±1 standard deviation of residuals

interface RevenueForeccast {
  date: string
  predictedRevenue: number
  lowerBound: number
  upperBound: number
  basisPoints: number   // how many historical data points were used
}
```

---

## Pillar 3: Developer Platform

### 3.1 Public REST API

The schema has an `apiKeys` table with 12 columns (including `scopes[]`, `rateLimit`, `allowedIps[]`, `allowedOrigins[]`, `keyHash`). This is the foundation. Build the REST layer on it.

**Architecture decision:** do NOT create a separate REST API. Expose tRPC as REST via `@trpc/server/adapters/fetch` with OpenAPI generation via `trpc-openapi`. This guarantees the REST API and the web app share 100% of the same business logic, validation, and error handling.

```typescript
// src/app/api/v1/[...path]/route.ts
// Uses trpc-openapi to expose tRPC router as OpenAPI 3.0 compliant REST API
// Authentication: API key via Authorization: Bearer header or X-API-Key header

// API key middleware:
// 1. Extract key from header
// 2. Hash with SHA-256, lookup in apiKeys table by keyHash
// 3. Check: not revoked, not expired, allowedIps matches, scopes include required
// 4. Increment usageCount, update lastUsedAt (async, non-blocking)
// 5. Apply per-key rate limit via Upstash ratelimit (already imported)
// 6. Set ctx.apiKeyId for audit trail
```

**OpenAPI spec auto-generation:**
```typescript
// src/app/api/openapi.json/route.ts
// Generates OpenAPI 3.0 spec from tRPC router at request time
// Cached for 1 hour in Redis
// Includes: all tenant procedures + public procedures
// Excludes: platformAdminProcedure (internal only)
```

**Versioning strategy:**
```
/api/v1/   → current stable (Phase 6 onward)
/api/v2/   → future (add when breaking changes needed)
Deprecation: minimum 90-day notice, sunset date in response headers
X-API-Version: "1" header returned on all responses
```

**Scopes model:**
```typescript
// apiKeys.scopes is TEXT[] — scope strings follow resource:action pattern
// Examples:
'bookings:read'       // GET /api/v1/booking/*
'bookings:write'      // POST/PUT/PATCH /api/v1/booking/*
'customers:read'
'customers:write'
'workflows:read'
'webhooks:write'      // manage webhook subscriptions
'analytics:read'
'*'                   // full access (owner-level keys only)
```

### 3.2 Outbound Webhook Platform

This is distinct from the workflow WEBHOOK action node. This is a **developer-configured event subscription** system — similar to GitHub webhooks.

**New schema:**
```sql
CREATE TABLE webhook_endpoints (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  url TEXT NOT NULL,                           -- must be HTTPS
  secret TEXT NOT NULL,                        -- HMAC-SHA256 signing secret (never returned after creation)
  description TEXT,
  events TEXT[] NOT NULL,                      -- subscribed event types
  status TEXT NOT NULL DEFAULT 'ACTIVE',       -- 'ACTIVE' | 'DISABLED' | 'FAILING'
  failure_count INTEGER NOT NULL DEFAULT 0,
  last_success_at TIMESTAMPTZ,
  last_failure_at TIMESTAMPTZ,
  last_failure_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE webhook_deliveries (
  id UUID PRIMARY KEY,
  endpoint_id UUID NOT NULL REFERENCES webhook_endpoints(id),
  event_type TEXT NOT NULL,
  event_id TEXT NOT NULL,                      -- idempotency: Inngest event ID
  payload JSONB NOT NULL,
  attempt INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL,                        -- 'PENDING' | 'SUCCESS' | 'FAILED'
  response_status INTEGER,
  response_body TEXT,
  duration_ms INTEGER,
  delivered_at TIMESTAMPTZ,
  next_retry_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL,
  INDEX idx_webhook_deliveries_endpoint (endpoint_id, created_at DESC),
  INDEX idx_webhook_deliveries_event (event_id)
);
```

**Delivery mechanism:**
```typescript
// All Inngest events are observed by a single dispatch function
const dispatchWebhooks = inngest.createFunction(
  { id: 'dispatch-webhooks', retries: 0 },  // retries handled internally
  [
    { event: 'booking/created' },
    { event: 'booking/confirmed' },
    { event: 'booking/cancelled' },
    { event: 'booking/completed' },
    { event: 'payment/intent.succeeded' },
    { event: 'review/submitted' },
    { event: 'forms/submitted' },
  ],
  async ({ event, step }) => {
    const tenantId = event.data.tenantId

    // Find all active endpoints subscribed to this event type
    const endpoints = await step.run('load-endpoints', () =>
      webhookRepository.findActiveEndpoints(tenantId, event.name)
    )

    // Deliver to each endpoint concurrently with retry logic
    await Promise.all(endpoints.map(endpoint =>
      step.run(`deliver-${endpoint.id}`, () =>
        webhookService.deliver(endpoint, event)
      )
    ))
  }
)

// Delivery function:
async function deliver(endpoint: WebhookEndpoint, event: InngestEvent): Promise<void> {
  const payload = {
    id: crypto.randomUUID(),
    event: event.name,
    created: new Date().toISOString(),
    data: event.data,
  }

  const body = JSON.stringify(payload)
  const signature = createHmacSignature(body, endpoint.secret)

  // Retry with exponential backoff: 10s, 60s, 5m, 30m, 2h
  const result = await asyncRetry(
    async (attempt) => {
      const response = await fetch(endpoint.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': `sha256=${signature}`,
          'X-Webhook-Event': event.name,
          'X-Webhook-Delivery': payload.id,
        },
        body,
        signal: AbortSignal.timeout(10_000),
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      return response
    },
    { retries: 5, factor: 6, minTimeout: 10_000, maxTimeout: 7_200_000 }
  )

  // Record delivery
  await webhookRepository.recordDelivery({
    endpointId: endpoint.id,
    eventId: payload.id,
    status: 'SUCCESS',
    responseStatus: result.status,
    durationMs: /* measured */,
  })
}

// HMAC signature for verification (same as Stripe's pattern):
function createHmacSignature(body: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(body).digest('hex')
}
```

**Failure detection:**
```typescript
// If endpoint fails 3 consecutive attempts, status → 'FAILING'
// If endpoint fails 10 consecutive attempts, status → 'DISABLED'
// Email sent to tenant admin on first failure and on disable
// Tenant can re-enable from dashboard → resets failure_count
```

### 3.3 Rate Limiting (Formally Specified)

The `@upstash/ratelimit` package is imported. Here's the formal specification:

```typescript
// src/shared/rate-limiter.ts

// API Key rate limits (sliding window algorithm — more accurate than token bucket)
const apiKeyRateLimits = {
  STARTER:      { requests: 100,   window: '1 m' },
  PROFESSIONAL: { requests: 500,   window: '1 m' },
  BUSINESS:     { requests: 2_000, window: '1 m' },
  ENTERPRISE:   { requests: 10_000, window: '1 m' },
  CUSTOM:       { requests: 50_000, window: '1 m' },
}

// tRPC layer rate limits (by IP for unauthenticated, by userId for authenticated)
const procedureRateLimits = {
  publicProcedure:    { requests: 60,  window: '1 m' },  // public form submit, etc.
  tenantProcedure:    { requests: 300, window: '1 m' },  // normal use
  mutationProcedure:  { requests: 60,  window: '1 m' },  // stricter for writes
}

// Rate limit response: 429 Too Many Requests
// Headers: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset
// Retry-After: seconds until reset
```

### 3.4 OpenAPI & SDK Generation

```typescript
// Generated OpenAPI 3.0 spec covers:
// - All tRPC procedures exposed via trpc-openapi
// - Authentication: apiKey (header: X-API-Key OR Bearer)
// - All request/response schemas from Zod (via zod-to-json-schema)
// - Pagination: cursor-based (not offset) for consistency with tRPC
// - Error shapes: { code, message, details? }

// SDK generation: use openapi-generator-cli or speakeasy
// Target: TypeScript + Python SDKs
// Published: npm @ironheart/sdk + PyPI ironheart-sdk
// Versioned: SDK version = API version (1.x.y)
```

---

## Pillar 4: Distributed Correctness

*This is the "mathematically complete" pillar. Every sub-section defines a formal guarantee.*

### 4.1 The Saga Pattern

**Problem:** The current architecture has independent operations that should succeed or fail atomically. Example: `confirmBooking` calls:
1. `db.update(bookings, { status: 'CONFIRMED' })`
2. `inngest.send("booking/confirmed")` → notification
3. `inngest.send("calendar/sync.push")` → calendar event

If step 2 succeeds and step 3 fails, the booking is confirmed but has no calendar event. If step 1 succeeds but the Inngest send fails (network partition), the booking is confirmed but no notification is sent.

**Solution: Saga Orchestrator**

```typescript
// src/modules/booking/lib/booking-saga.ts

// A saga is a sequence of local transactions, each with a compensation step.
// If any step fails, compensation steps for all completed steps are executed in reverse.

interface SagaStep<T> {
  name: string
  execute: () => Promise<T>
  compensate: (result: T) => Promise<void>
}

class BookingConfirmationSaga {
  private steps: SagaStep<unknown>[]
  private completedSteps: Array<{ step: SagaStep<unknown>; result: unknown }> = []

  async run(): Promise<void> {
    for (const step of this.steps) {
      try {
        const result = await step.execute()
        this.completedSteps.push({ step, result })
      } catch (err) {
        // Compensate in reverse
        await this.compensate()
        throw err
      }
    }
  }

  private async compensate(): Promise<void> {
    for (const { step, result } of [...this.completedSteps].reverse()) {
      try {
        await step.compensate(result)
      } catch (compensationErr) {
        // Compensation failure: log as CRITICAL, alert ops, record in saga_log
        log.error({ stepName: step.name, compensationErr }, 'SAGA COMPENSATION FAILED — manual intervention required')
        await sagaRepository.recordCompensationFailure(step.name, compensationErr)
      }
    }
  }
}

// Booking confirmation saga steps:
const steps: SagaStep[] = [
  {
    name: 'update-booking-status',
    execute: () => bookingRepository.updateStatus(bookingId, 'CONFIRMED'),
    compensate: () => bookingRepository.updateStatus(bookingId, 'PENDING'),
  },
  {
    name: 'create-invoice',
    execute: () => paymentService.createInvoiceForBooking(bookingId),
    compensate: (invoice) => paymentService.voidInvoice(invoice.id),
  },
  {
    name: 'send-notification',
    execute: () => inngest.send('booking/confirmed', { bookingId, tenantId }),
    compensate: () => Promise.resolve(),  // notifications are not reversible — acceptable
  },
  {
    name: 'sync-calendar',
    execute: () => inngest.send('calendar/sync.push', { bookingId, userId: staffId, tenantId }),
    compensate: () => inngest.send('calendar/sync.delete', { bookingId, userId: staffId, tenantId }),
  },
]
```

**Saga log table:**
```sql
CREATE TABLE saga_log (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  saga_type TEXT NOT NULL,          -- 'BOOKING_CONFIRMATION', 'PAYMENT_CAPTURE', etc.
  entity_id UUID NOT NULL,          -- bookingId, paymentId, etc.
  status TEXT NOT NULL,             -- 'RUNNING' | 'COMPLETED' | 'COMPENSATING' | 'FAILED'
  steps JSONB NOT NULL,             -- [{name, status, startedAt, completedAt, error}]
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  requires_manual_intervention BOOLEAN DEFAULT FALSE,
  INDEX idx_saga_log_entity (tenant_id, entity_id, saga_type)
);
```

### 4.2 Idempotency Key Layer

**Formal guarantee:** For any mutation, calling it twice with the same idempotency key produces the same result and exactly one side effect.

```typescript
// src/shared/idempotency.ts

// All tRPC mutations accept an optional X-Idempotency-Key header
// Stored in Redis for 24 hours
// On second call with same key: return cached result without executing

async function withIdempotency<T>(
  key: string,
  ttlSeconds: number,
  operation: () => Promise<T>
): Promise<T> {
  const cached = await redis.get(`idempotency:${key}`)
  if (cached) {
    log.info({ key }, 'Idempotency cache hit — returning cached result')
    return JSON.parse(cached) as T
  }

  // Lock to prevent concurrent execution with same key (Redis SET NX)
  const acquired = await redis.set(`idempotency:lock:${key}`, '1', {
    nx: true,
    ex: 30,  // 30s lock timeout
  })
  if (!acquired) throw new ConflictError('Duplicate request in flight')

  try {
    const result = await operation()
    await redis.set(`idempotency:${key}`, JSON.stringify(result), { ex: ttlSeconds })
    return result
  } finally {
    await redis.del(`idempotency:lock:${key}`)
  }
}

// Usage in payment service:
async function capturePayment(input: CapturePaymentInput, idempotencyKey: string) {
  return withIdempotency(
    `payment:${idempotencyKey}`,
    86_400,  // 24h
    () => stripeProvider.capturePaymentIntent(input.paymentIntentId)
  )
}
```

### 4.3 Optimistic Concurrency Control

**Formal guarantee:** Two concurrent updates to the same entity never silently overwrite each other. One succeeds, one receives a `ConflictError`.

```sql
-- Add version column to all high-concurrency entities
ALTER TABLE bookings ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE invoices ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE customers ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE workflows ADD COLUMN version INTEGER NOT NULL DEFAULT 1;

-- Update pattern (must include version in WHERE):
UPDATE bookings
SET status = 'CONFIRMED', version = version + 1
WHERE id = $1 AND tenant_id = $2 AND version = $expectedVersion
RETURNING id;
-- If 0 rows returned: throw ConflictError('Concurrent modification detected — please refresh')
```

```typescript
// Repository pattern:
async function updateWithVersion<T>(
  table: PgTable,
  id: string,
  tenantId: string,
  expectedVersion: number,
  values: Partial<T>
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

  if (!updated) throw new ConflictError('Concurrent modification detected')
  return updated as T
}
```

### 4.4 Safe Expression Evaluator

**The `Function()` constructor in `expressions.ts` is unsafe.** The regex guard `/^[\d\s+\-*/().]+$/` is the only protection. If a future change allows string values through (e.g., a variable resolves to `1; process.exit()`), the guard may fail.

**Replacement: proper AST-based expression evaluator using `expr-eval` or hand-rolled:**

```typescript
// src/modules/workflow/engine/expressions.ts — REPLACEMENT
import { Parser } from 'expr-eval'  // Pure math expression parser, no eval(), no Function()

// expr-eval supports: + - * / ^ % == != < > <= >= && || ! ? :
// Does NOT support: function calls, property access, assignment, new, delete
// Safe for user-provided input

const parser = new Parser({
  allowMemberAccess: false,  // no obj.prop access
})

export function evaluateExpression(
  expression: string,
  ctx: WorkflowExecutionContext
): string | number | boolean {
  // Step 1: substitute {{field}} tokens
  const substituted = substituteVariables(expression, ctx)

  // Step 2: try to parse + evaluate as math expression
  try {
    const result = parser.evaluate(substituted)
    if (typeof result === 'number' && !isNaN(result) && isFinite(result)) return result
    if (typeof result === 'boolean') return result
  } catch {
    // Not a math expression — treat as string
  }

  return substituted
}
// NOTE: add 'expr-eval' to package.json dependencies
// It has zero runtime dependencies and is 8KB minified
```

### 4.5 Workflow Schema Evolution

**Problem:** If `IfNodeConfig` gains a required field in a future phase, existing stored workflows in the `nodes` JSONB will be missing that field. Runtime execution will fail or produce incorrect results.

**Solution: version-stamped node configs with migration functions**

```typescript
// Each node config includes a schema version:
interface WorkflowNode {
  id: string
  type: WorkflowNodeType
  configVersion: number            // NEW: default 1, increment on breaking changes
  config: NodeConfig
  // ...
}

// Migration registry:
// src/modules/workflow/engine/migrations/
//   node-config.migrations.ts

const nodeConfigMigrations: Record<
  WorkflowNodeType,
  Array<(config: Record<string, unknown>) => Record<string, unknown>>
> = {
  IF: [
    // Migration v1 → v2: wrap flat conditions array in a condition group
    (config) => ({
      ...config,
      conditions: Array.isArray(config.conditions)
        ? { logic: 'AND', conditions: config.conditions }
        : config.conditions,
    }),
  ],
  // ... other node types
}

// Applied before execution:
function migrateNodeConfig(node: WorkflowNode): WorkflowNode {
  const migrations = nodeConfigMigrations[node.type] ?? []
  const currentVersion = node.configVersion ?? 1
  let config = node.config as Record<string, unknown>

  for (let v = currentVersion; v <= migrations.length; v++) {
    config = migrations[v - 1](config)
  }

  return { ...node, config, configVersion: migrations.length + 1 }
}
```

### 4.6 Double-Booking Prevention (Database Advisory Locks)

**Formal guarantee:** Two concurrent requests for the same slot on the same date never both succeed.

```typescript
// src/modules/booking/lib/slot-lock.ts

// PostgreSQL advisory locks are per-session, lightweight, and not in a table
// Lock key = deterministic hash of (tenantId, staffId, date, time)

async function withSlotLock<T>(
  tenantId: string,
  staffId: string,
  date: string,
  time: string,
  operation: () => Promise<T>
): Promise<T> {
  // Hash to 64-bit integer for pg_advisory_xact_lock
  const key = hashSlot(tenantId, staffId, date, time)

  return db.transaction(async (tx) => {
    // Acquire advisory lock — blocks other transactions trying the same key
    // Released automatically when transaction commits/rolls back
    await tx.execute(sql`SELECT pg_advisory_xact_lock(${key})`)

    // Now safe to check availability and create booking
    return operation()
  })
}

function hashSlot(tenantId: string, staffId: string, date: string, time: string): bigint {
  const input = `${tenantId}:${staffId}:${date}:${time}`
  // FNV-1a 64-bit hash — maps to bigint for pg advisory lock
  return fnv1a64(input)
}
```

### 4.7 Formal Booking State Machine

The booking status transitions are currently implicit in service code. Formalize them:

```typescript
// src/modules/booking/lib/booking-state-machine.ts

type BookingStatus = 'PENDING' | 'RESERVED' | 'APPROVED' | 'CONFIRMED' |
                     'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW' |
                     'REJECTED' | 'RELEASED'

// Adjacency list: valid transitions
const BOOKING_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  PENDING:     ['RESERVED', 'REJECTED', 'CANCELLED'],
  RESERVED:    ['APPROVED', 'CONFIRMED', 'RELEASED', 'CANCELLED'],
  APPROVED:    ['CONFIRMED', 'CANCELLED'],
  CONFIRMED:   ['IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW'],
  IN_PROGRESS: ['COMPLETED', 'CANCELLED', 'NO_SHOW'],
  COMPLETED:   [],           // terminal
  CANCELLED:   [],           // terminal
  NO_SHOW:     [],           // terminal
  REJECTED:    [],           // terminal
  RELEASED:    ['PENDING'],  // slot released, booking reverts to pending
}

export function assertValidBookingTransition(from: BookingStatus, to: BookingStatus): void {
  const allowed = BOOKING_TRANSITIONS[from]
  if (!allowed.includes(to)) {
    throw new BadRequestError(
      `Invalid booking transition: ${from} → ${to}. ` +
      `Valid transitions from ${from}: ${allowed.join(', ') || 'none (terminal state)'}`
    )
  }
}

// Used in every booking status update:
await assertValidBookingTransition(booking.status, newStatus)
await bookingRepository.updateWithVersion(booking.id, tenantId, booking.version, { status: newStatus })
```

---

## Pillar 5: Observability & Search

### 5.1 OpenTelemetry Traces

Sentry captures errors but not traces. Distributed traces let you answer: "Why was this booking confirmation slow?", "Which tRPC procedure times out under load?"

```typescript
// src/shared/telemetry.ts

import { NodeSDK } from '@opentelemetry/sdk-node'
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'

// Export to: OTLP compatible backend (Jaeger, Honeycomb, Datadog, Sentry)
// OTEL_EXPORTER_OTLP_ENDPOINT env var controls destination

// Auto-instrumented: http, dns, pg (postgres.js), Redis
// Manual instrumentation for:
//   - tRPC procedures (via middleware)
//   - Inngest function start/complete
//   - Stripe API calls
//   - External HTTP calls (Resend, Twilio)

// tRPC tracing middleware:
const tracingMiddleware = t.middleware(async ({ path, type, next }) => {
  const span = tracer.startSpan(`trpc.${type}.${path}`, {
    attributes: { 'trpc.path': path, 'trpc.type': type },
  })
  const result = await next()
  span.setStatus(result.ok ? SpanStatusCode.OK : SpanStatusCode.ERROR)
  span.end()
  return result
})
```

**Correlation:** Every Inngest function receives the trace context from the triggering HTTP request via `traceparent` header, so traces span across HTTP → Inngest → DB.

### 5.2 Full-Text Search

```sql
-- Add tsvector columns for full-text search
ALTER TABLE customers ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector('english',
      coalesce(first_name, '') || ' ' ||
      coalesce(last_name, '') || ' ' ||
      coalesce(email, '') || ' ' ||
      coalesce(phone, '') || ' ' ||
      coalesce(notes, '')
    )
  ) STORED;
CREATE INDEX idx_customers_search ON customers USING GIN(search_vector);

ALTER TABLE bookings ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector('english',
      coalesce(customer_notes, '') || ' ' ||
      coalesce(admin_notes, '') || ' ' ||
      coalesce(custom_service_name, '') || ' ' ||
      coalesce(booking_number, '')
    )
  ) STORED;
CREATE INDEX idx_bookings_search ON bookings USING GIN(search_vector);

-- Drizzle query:
-- db.select().from(customers)
--   .where(and(
--     eq(customers.tenantId, tenantId),
--     sql`${customers.searchVector} @@ plainto_tsquery('english', ${query})`
--   ))
--   .orderBy(sql`ts_rank(${customers.searchVector}, plainto_tsquery('english', ${query})) DESC`)
```

**Global search endpoint:**
```typescript
// search.router.ts
globalSearch: tenantProcedure.input(z.object({
  query: z.string().min(2).max(100),
  types: z.array(z.enum(['customers', 'bookings', 'invoices', 'tasks'])).optional(),
  limit: z.number().int().min(1).max(50).default(20),
})).query(async ({ ctx, input }) => {
  // Fan out to all entity types in parallel
  const [customers, bookings, invoices] = await Promise.all([
    input.types?.includes('customers') !== false
      ? customerRepository.fullTextSearch(ctx.tenantId, input.query, 5)
      : [],
    // ...
  ])

  // Merge and rank results
  return {
    results: [
      ...customers.map(c => ({ type: 'customer', id: c.id, label: `${c.firstName} ${c.lastName}`, secondary: c.email })),
      ...bookings.map(b => ({ type: 'booking', id: b.id, label: b.bookingNumber, secondary: b.scheduledDate })),
    ].slice(0, input.limit)
  }
})
```

### 5.3 Database Query Analysis

```typescript
// src/shared/db-monitor.ts

// Log slow queries (> 500ms) automatically
// Uses postgres.js onquery hook:
const db = postgres(DATABASE_URL, {
  onquery(query) {
    const start = Date.now()
    return () => {
      const duration = Date.now() - start
      if (duration > 500) {
        log.warn({ query: query.string, duration }, 'Slow database query')
        // Also send to Sentry as a performance transaction
      }
    }
  }
})

// pg_stat_statements integration (read-only):
// GET /api/health/db-stats → returns top 10 slowest queries (platform admin only)
```

### 5.4 Improved Health Checks

```typescript
// src/app/api/health/route.ts — expanded deep health check

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy'
  checks: {
    database: { status: string; latencyMs: number }
    redis: { status: string; latencyMs: number }
    inngest: { status: string }     // ping Inngest API
    stripe: { status: string }      // ping Stripe API (platform admin only)
  }
  version: string
  uptime: number
}

// /api/health → lightweight (DB ping only) — used by load balancers
// /api/health/deep → full check — used by monitoring systems
// /api/ready → startup check — used by Kubernetes readiness probe
```

### 5.5 Search Module File Structure

```
src/modules/search/
  search.types.ts
  search.repository.ts          # fullTextSearch across all entities
  search.router.ts              # globalSearch tRPC procedure
  index.ts
```

---

## Phase 6 Schema Changes Summary

### New Tables (12)

```
pricing_rules            — tiered pricing rules with condition groups
discount_codes           — promo codes linking to pricing_rules
booking_waitlist         — waitlist entries with slot preferences
stripe_connect_accounts  — Stripe Connect account per tenant
webhook_endpoints        — developer-configured outbound webhook subscriptions
webhook_deliveries       — delivery log with retry state
metric_snapshots         — append-only time-series metrics
saga_log                 — distributed transaction audit trail
```

### Column Additions (core entities)

```sql
-- Optimistic concurrency
ALTER TABLE bookings   ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE invoices   ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE customers  ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE workflows  ADD COLUMN version INTEGER NOT NULL DEFAULT 1;

-- Full-text search
ALTER TABLE customers  ADD COLUMN search_vector tsvector GENERATED ALWAYS AS (...) STORED;
ALTER TABLE bookings   ADD COLUMN search_vector tsvector GENERATED ALWAYS AS (...) STORED;

-- Payment linkage
ALTER TABLE payments   ADD COLUMN stripe_payment_intent_id TEXT UNIQUE;
ALTER TABLE payments   ADD COLUMN stripe_charge_id TEXT;
ALTER TABLE payments   ADD COLUMN stripe_transfer_id TEXT;
ALTER TABLE payments   ADD COLUMN platform_fee_amount NUMERIC(10,2);
ALTER TABLE payments   ADD COLUMN idempotency_key TEXT UNIQUE;
ALTER TABLE payments   ADD COLUMN gocardless_payment_id TEXT;

-- Smart scheduling
ALTER TABLE users      ADD COLUMN last_assigned_at TIMESTAMPTZ;
ALTER TABLE users      ADD COLUMN home_latitude NUMERIC(9,6);
ALTER TABLE users      ADD COLUMN home_longitude NUMERIC(9,6);

-- Customer merge tracking (exists: mergedIntoId)
ALTER TABLE customers  ADD COLUMN anonymised_at TIMESTAMPTZ;
```

### New Indexes (6 critical)

```sql
CREATE INDEX CONCURRENTLY idx_bookings_tenant_status_date
  ON bookings(tenant_id, status, scheduled_date) WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY idx_bookings_customer_status
  ON bookings(customer_id, status, scheduled_date DESC);

CREATE INDEX CONCURRENTLY idx_customers_search
  ON customers USING GIN(search_vector) WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY idx_bookings_search
  ON bookings USING GIN(search_vector);

CREATE INDEX CONCURRENTLY idx_metric_snapshots_lookup
  ON metric_snapshots(tenant_id, metric_key, period_type, period_start DESC);

CREATE INDEX CONCURRENTLY idx_workflow_executions_workflow_status
  ON workflow_executions(workflow_id, status, started_at DESC);
```

All indexes use `CONCURRENTLY` — no table lock, safe on live production database.

---

## New Inngest Events (Phase 6 Additions)

```typescript
// Payment lifecycle
"payment/intent.created":   { paymentIntentId, bookingId, tenantId, amount, currency }
"payment/intent.succeeded": { paymentIntentId, bookingId, tenantId, amount }
"payment/intent.failed":    { paymentIntentId, bookingId, tenantId, error }
"payment/refund.requested": { paymentId, bookingId, tenantId, amount, reason }
"payment/refund.completed": { refundId, paymentId, tenantId }
"payment/dispute.created":  { disputeId, paymentId, tenantId, amount }

// Stripe webhooks (bridge)
"stripe/webhook.received":  { eventType, stripeEventId, payload }

// Developer webhooks
"webhook/delivery.failed":  { endpointId, tenantId, eventType, reason, failureCount }

// Waitlist
"waitlist/slot.available":  { waitlistEntryId, bookingId, tenantId, customerId }

// Analytics
"analytics/snapshot.compute": { tenantId, periodType, periodStart }

// Saga
"saga/compensation.required": { sagaId, sagaType, entityId, tenantId }

// Calendar (missing)
"calendar/sync.delete":     { bookingId, userId, tenantId }
```

---

## Implementation Waves

### Wave 1 — Schema & Foundation (2 parallel agents)

**Agent 1A:** DB migrations
- Write Drizzle migration for all 8 new tables + column additions + indexes
- `CONCURRENTLY` for all new indexes

**Agent 1B:** Types & schemas for all 5 new modules
- `payment.types.ts`, `payment.schemas.ts`
- `analytics.types.ts`, `analytics.schemas.ts`
- `developer.types.ts`, `developer.schemas.ts` (API keys + webhooks)
- `search.types.ts`

### Wave 2 — Financial Core (3 parallel agents)

**Agent 2A:** Stripe + GoCardless providers
- `payment/providers/stripe.provider.ts` (Stripe + Connect)
- `payment/providers/gocardless.provider.ts`
- `payment/providers/provider.factory.ts`

**Agent 2B:** Payment service + state machine + saga
- `payment/lib/state-machine.ts` (invoice + booking)
- `booking/lib/booking-saga.ts`
- `booking/lib/slot-lock.ts`
- `payment/lib/reconciliation.ts`

**Agent 2C:** Pricing + tax engine
- `payment/lib/pricing-engine.ts`
- `payment/lib/tax-engine.ts`
- `payment/lib/invoice-pdf.ts`

### Wave 3 — Analytics & Developer Platform (4 parallel agents)

**Agent 3A:** Analytics engine
- `analytics/lib/metrics-aggregator.ts`
- `analytics/lib/customer-intelligence.ts` (LTV, churn)
- `analytics/lib/forecasting.ts`
- Inngest cron: `computeMetricSnapshots`

**Agent 3B:** Smart scheduling
- `scheduling/lib/smart-assignment.ts` (round-robin, least-loaded, skill, geo)
- `scheduling/lib/waitlist.ts`

**Agent 3C:** Developer API (REST layer)
- `src/app/api/v1/[...path]/route.ts` (trpc-openapi adapter)
- `src/app/api/openapi.json/route.ts`
- API key middleware
- Rate limiting layer

**Agent 3D:** Webhook platform
- `developer/webhook.repository.ts`
- `developer/webhook.service.ts` (deliver, retry, failure tracking)
- `developer/webhook.events.ts` (Inngest dispatch function)

### Wave 4 — Correctness & Observability (3 parallel agents)

**Agent 4A:** Distributed correctness
- `src/shared/idempotency.ts`
- `src/shared/optimistic-concurrency.ts`
- Replace `expressions.ts` `Function()` with `expr-eval`
- `workflow/engine/migrations/node-config.migrations.ts`
- `saga_log` repository

**Agent 4B:** Observability
- `src/shared/telemetry.ts` (OpenTelemetry SDK setup)
- tRPC tracing middleware
- Slow query monitor
- Expanded health checks

**Agent 4C:** Full-text search
- DB migration: `search_vector` generated columns + GIN indexes
- `search/search.repository.ts`
- `search/search.router.ts`

### Wave 5 — Routers, Events, Wiring (2 parallel agents)

**Agent 5A:** New routers + Inngest registration
- `payment.router.ts`, `analytics.router.ts`, `developer.router.ts`, `search.router.ts`
- Update `src/server/root.ts`
- Update `src/app/api/inngest/route.ts`
- Update `src/shared/inngest.ts`

**Agent 5B:** Integration wiring
- Update `booking.service.ts` to use BookingConfirmationSaga
- Update `booking.service.ts` to use formal state machine
- Update all status mutation services to use `updateWithVersion`
- Add rate limiting middleware to tRPC

### Wave 6 — Tests (1 agent)

- `pricing-engine.test.ts` — rule ordering, modifiers, edge cases
- `tax-engine.test.ts` — VAT calculation precision (test to 4 decimal places), reverse charge
- `booking-saga.test.ts` — success path, compensation paths, partial failure
- `booking-state-machine.test.ts` — all valid transitions, all invalid transitions
- `slot-lock.test.ts` — concurrent booking prevention
- `idempotency.test.ts` — duplicate request, concurrent duplicate request
- `optimistic-concurrency.test.ts` — stale version rejection
- `expressions.test.ts` — updated to verify no Function() usage
- `smart-assignment.test.ts` — round-robin ordering, skill matching
- `waitlist.test.ts` — slot availability notification
- `webhook-delivery.test.ts` — success, retry, HMAC signature
- `analytics.test.ts` — metric aggregation correctness
- `search.test.ts` — FTS result ranking

### Wave 7 — Verification

- `npx tsc --noEmit` → 0 errors
- `npm run build` → succeeds
- `npm test` → 250+ tests passing

---

## Invariants (Formally Stated)

These are the mathematical guarantees Phase 6 provides. Each one is enforced at a specific layer.

| # | Invariant | Enforcement Layer |
|---|---|---|
| I1 | `payments.sum(where bookingId=X) ≤ invoices.totalAmount(where bookingId=X)` | DB CHECK constraint |
| I2 | A booking in a terminal state (COMPLETED, CANCELLED, NO_SHOW, REJECTED) cannot be transitioned to any other state | Application state machine + DB trigger |
| I3 | For any confirmed booking, there exists at least one corresponding entry in `sentMessages` (notification attempt) | Saga log completeness |
| I4 | Two concurrent requests for the same slot on the same date-time-staff triple cannot both create a confirmed booking | DB advisory lock |
| I5 | Calling any payment mutation twice with the same idempotency key produces the same response and exactly one charge | Redis idempotency layer |
| I6 | A workflow graph saved with `isVisual=true` is always a valid DAG with exactly one TRIGGER node | `validateWorkflowGraph()` called on every save |
| I7 | Workflow execution depth never exceeds 3 (prevents infinite event loops) | `__workflowDepth` check at execution entry |
| I8 | A customer merge sets `deletedAt` and `mergedIntoId` on the source in the same transaction that re-parents all 7 related tables | `db.transaction()` in merge service |
| I9 | No expression evaluator uses `eval()` or `Function()` constructor with user-provided input | `expr-eval` library + code review |
| I10 | API key rate limit is applied before any business logic executes | Rate limiting middleware at route boundary |
| I11 | All outbound webhook deliveries include a valid HMAC-SHA256 signature | `createHmacSignature()` called in delivery function before HTTP send |
| I12 | A `version` mismatch on any update to `bookings`, `invoices`, `customers`, or `workflows` raises `ConflictError` and makes no DB change | `updateWithVersion()` checks `WHERE version = $expected` |

---

## Risk Register

| Risk | Severity | Mitigation |
|---|---|---|
| Saga compensation failure (compensation step itself throws) | CRITICAL | Log as CRITICAL + alert ops + `requires_manual_intervention` flag + admin dashboard |
| Stripe webhook replay (duplicate payment processing) | HIGH | Stripe event ID as idempotency key in `webhook_deliveries`; `stripe.webhooks.constructEvent` timestamp validation |
| GoCardless mandate failure mid-series (direct debit returned) | HIGH | `payment/dispute.created` event → notify admin + pause related bookings |
| `pg_advisory_xact_lock` deadlock (two sagas acquire locks in opposite order) | HIGH | Always acquire locks in canonical order (sorted by tenantId + staffId + date) |
| Analytics snapshot stale (cron fails) | MEDIUM | Health check monitors last snapshot age; alert if > 2 hours old |
| FTS index lag after `customers.search_vector` column add | MEDIUM | Use `CONCURRENTLY` + verify index size before enabling FTS endpoints |
| `expr-eval` library vulnerability | MEDIUM | Pin version, audit quarterly; `allowMemberAccess: false` blocks property traversal |
| Webhook endpoint timing attack (comparing signatures with `===`) | HIGH | Use `crypto.timingSafeEqual()` for HMAC comparison — not string equality |
| Rate limit bypass via key rotation | MEDIUM | Per-key rate limit tracks by `apiKeys.id`, not the key string |
| Schema migration fails on live DB | HIGH | Use `CONCURRENTLY` for indexes; all table adds are purely additive; rollback plan in migration file |
| Forecast confidence interval widens (not enough historical data) | LOW | Return `basisPoints` in forecast response; UI warns if < 30 data points |
| Optimistic concurrency version integer overflow | LOW | INTEGER max is 2.1B; at 1000 updates/day, wraps in 5,753 years |

---

## Success Metrics

Phase 6 is complete when:

1. A tenant can: create a booking → send invoice → capture payment → refund — all via tRPC and verified by tests
2. The analytics dashboard can return a 12-month revenue time series for any tenant in < 200ms
3. A developer can: create an API key → make a REST API call → receive a webhook delivery — all documented in the OpenAPI spec
4. No two concurrent booking requests for the same slot succeed (load-tested with 50 concurrent requests)
5. The `expressions.ts` file contains zero references to `eval` or `Function`
6. 250+ tests passing, 0 tsc errors, build succeeds
7. Every invariant in the formal list (I1–I12) has at least one test that verifies it is enforced

---

*This document is the authoritative Phase 6 design reference.*
*The standard: every stated guarantee is enforced at the database or infrastructure layer, not just application code.*
