# Stripe Connect Revenue Engine — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement Stripe Connect so tenants collect payments from their customers, with platform fees. Plus invoice state machine and payment service logic.

**Architecture:** Stripe Connect (Standard accounts) for marketplace payments. Stripe Billing for tenant subscriptions. Webhook to Inngest bridge for durable event processing.

**Tech Stack:** Stripe SDK, tRPC 11, Drizzle ORM, Inngest, Zod v4

---

## Current State Assessment

### What Already Exists

The payment module is partially built. The schema is complete but the service layer has gaps, and Stripe Connect onboarding is absent. Here is a precise inventory:

**Schema (fully migrated, zero changes needed for core tables):**
- `invoices` table (22 columns) in `src/shared/db/schemas/shared.schema.ts` — includes `version` for OCC, `lineItems` JSONB, `amountPaid`/`amountDue`, all status enums
- `payments` table (20 columns) in `src/shared/db/schemas/shared.schema.ts` — includes `stripePaymentIntentId`, `stripeChargeId`, `stripeTransferId`, `platformFeeAmount`, `idempotencyKey`, `gocardlessPaymentId`
- `stripeConnectAccounts` table in `src/shared/db/schemas/phase6.schema.ts` — includes `stripeAccountId`, `status`, `chargesEnabled`, `payoutsEnabled`, `requirements` JSONB, `capabilities` JSONB
- `pricingRules`, `discountCodes`, `taxRules` tables in `src/shared/db/schemas/phase6.schema.ts`
- `tenants` table has `stripeCustomerId`, `subscriptionId`, `billingEmail`, `plan` (PlanType enum: STARTER/PROFESSIONAL/BUSINESS/ENTERPRISE/CUSTOM)
- `invoiceStatus` enum: DRAFT, SENT, VIEWED, PAID, PARTIALLY_PAID, OVERDUE, VOID, REFUNDED
- `paymentStatus` enum: PENDING, PROCESSING, COMPLETED, FAILED, REFUNDED, CANCELLED
- `paymentMethod` enum: CARD, BANK_TRANSFER, DIRECT_DEBIT, CASH, CHEQUE, OTHER

**Module files that exist:**
- `payment.types.ts` — InvoiceRecord, PaymentRecord, PricingRule, TaxRule, StripeConnectAccount, all input types
- `payment.schemas.ts` — Zod schemas for createInvoice, sendInvoice, voidInvoice, recordPayment, refundPayment, pricingRules, taxRules, discountCodes
- `payment.repository.ts` — createInvoice, findInvoiceById, listInvoices, findOverdueInvoices, updateInvoiceStatus (with OCC), createPayment, findPaymentByStripePaymentIntentId, updatePaymentStatus, listPricingRules, findDiscountCode, listTaxRules
- `payment.service.ts` — createInvoice, createInvoiceForBooking, findInvoice, sendInvoice, voidInvoice, recordPayment, listInvoices, listPricingRules
- `payment.router.ts` — listInvoices, getInvoice, createInvoice, sendInvoice, voidInvoice, recordPayment, listPricingRules (all with module gate + permissions)
- `payment.events.ts` — handleStripeWebhook (routes payment_intent.succeeded, payment_intent.payment_failed, charge.dispute.created), overdueInvoiceCron (daily 9am)
- `payment.manifest.ts` — full manifest with routes, sidebar, analytics widgets, permissions
- `lib/state-machine.ts` — assertValidInvoiceTransition, isTerminalInvoiceStatus, getValidInvoiceTransitions
- `lib/pricing-engine.ts` — applyPricingRules with condition matching, modifier application, first-match-wins
- `lib/tax-engine.ts` — calculateTax, calculateTaxFromRate with rounding invariants
- `providers/stripe.provider.ts` — getStripe (lazy init), createPaymentIntent (with Connect support via transfer_data), constructStripeEvent
- `providers/gocardless.provider.ts` — stub (throws BadRequestError)
- `providers/cash.provider.ts` — recordCashPayment (no-op success)
- `providers/provider.factory.ts` — getPaymentProviderName
- `__tests__/payment-state-machine.test.ts` — 55+ tests covering state machine, pricing engine, tax engine
- `__tests__/payment.service.test.ts` — 12+ tests covering service operations

**Webhook route:**
- `src/app/api/webhooks/stripe/route.ts` — validates Stripe-Signature, forwards to Inngest `stripe/webhook.received`

**Inngest events already registered** (in `src/shared/inngest.ts`):
- `stripe/webhook.received` — { eventType, stripeEventId, payload }
- `payment/intent.succeeded` — { paymentIntentId, bookingId, tenantId, amount }
- `payment/intent.failed` — { paymentIntentId, bookingId, tenantId, error }
- `payment/dispute.created` — { disputeId, paymentId, tenantId, amount }

### What Is Missing

1. **Stripe Connect onboarding flow** — no service method to create/link Connect accounts, no OAuth or hosted onboarding, no account status sync
2. **Refund flow** — schema exists (`refundPaymentSchema`), but no service method, no Stripe refund call, no `payment/refund.*` Inngest events
3. **Platform fee calculation** — `platformFeeAmount` column exists on `payments` but nothing computes or stores it
4. **Stripe Billing for tenant subscriptions** — `stripeCustomerId`/`subscriptionId` columns exist on `tenants`, zero logic to create customers, manage subscriptions, handle subscription webhooks
5. **Additional webhook event handling** — only 3 Stripe events handled (payment_intent.succeeded, payment_intent.payment_failed, charge.dispute.created); missing account.updated, charge.refunded, checkout.session.completed, customer.subscription.*, invoice.* (Stripe's own invoices for subscriptions)
6. **Connect account status sync** — no handler for `account.updated` webhook to keep `stripeConnectAccounts.status`/`chargesEnabled`/`payoutsEnabled` current
7. **Payment link generation** — no Stripe Checkout Session or Payment Link creation for customer-facing payment
8. **Payout tracking** — no tracking of when Stripe pays out to tenant bank accounts

---

## 1. Stripe Connect Account Setup

### 1.1 Account Type Decision

**Standard accounts** — the tenant has their own Stripe dashboard, handles disputes directly, and has full control over their Stripe settings. The platform takes a fee via `application_fee_amount` on each PaymentIntent.

Why Standard over Express/Custom:
- Tenants keep full control of their Stripe account
- Stripe handles all KYC/compliance
- Less platform liability
- Tenants can use their existing Stripe account

### 1.2 Onboarding Flow

```
Tenant clicks "Connect Stripe" in Payment Settings
  -> Backend creates a Stripe Account Link (hosted onboarding)
  -> Tenant redirected to Stripe-hosted KYC flow
  -> On completion, Stripe redirects to return_url
  -> Backend verifies account status via account.updated webhook
  -> stripeConnectAccounts row created/updated
```

### 1.3 Schema (Already Exists)

The `stripeConnectAccounts` table in `phase6.schema.ts` already has everything needed:

```
stripe_connect_accounts
  id              UUID PK (gen_random_uuid)
  tenant_id       UUID NOT NULL FK -> tenants(id), UNIQUE
  stripe_account_id TEXT NOT NULL, UNIQUE
  status          TEXT NOT NULL DEFAULT 'pending'
  charges_enabled BOOLEAN NOT NULL DEFAULT false
  payouts_enabled BOOLEAN NOT NULL DEFAULT false
  requirements    JSONB (Stripe requirements object)
  capabilities    JSONB
  created_at      TIMESTAMPTZ
  updated_at      TIMESTAMPTZ
```

### 1.4 Account Status Values

| Status | Meaning | Can Accept Payments? |
|--------|---------|---------------------|
| `pending` | Onboarding not yet completed | No |
| `active` | Fully onboarded, charges + payouts enabled | Yes |
| `restricted` | Stripe requires additional info (past-due requirements) | Maybe (charges_enabled may still be true) |
| `deauthorized` | Tenant disconnected the platform from their Stripe account | No |

### 1.5 Service Methods

```typescript
// New methods in payment.service.ts or a dedicated connect.service.ts

createConnectAccount(tenantId: string): Promise<{ accountId: string }>
  // stripe.accounts.create({ type: 'standard' })
  // Insert stripeConnectAccounts row with status='pending'

createAccountLink(tenantId: string): Promise<{ url: string }>
  // stripe.accountLinks.create({ account, refresh_url, return_url, type: 'account_onboarding' })
  // Return the Stripe-hosted onboarding URL

createLoginLink(tenantId: string): Promise<{ url: string }>
  // stripe.accounts.createLoginLink(stripeAccountId)
  // Let tenant access their Stripe Express dashboard

syncAccountStatus(stripeAccountId: string): Promise<void>
  // stripe.accounts.retrieve(stripeAccountId)
  // Update stripeConnectAccounts: status, chargesEnabled, payoutsEnabled, requirements, capabilities

getConnectAccount(tenantId: string): Promise<StripeConnectAccount | null>
  // Simple repo lookup

deauthorizeAccount(tenantId: string): Promise<void>
  // Called when account.application.deauthorized webhook fires
  // Update status to 'deauthorized', chargesEnabled=false, payoutsEnabled=false
```

### 1.6 Repository Methods

```typescript
// New methods in payment.repository.ts

createStripeConnectAccount(tenantId: string, stripeAccountId: string): Promise<StripeConnectAccount>

findStripeConnectAccountByTenantId(tenantId: string): Promise<StripeConnectAccount | null>

findStripeConnectAccountByStripeId(stripeAccountId: string): Promise<StripeConnectAccount | null>

updateStripeConnectAccount(tenantId: string, updates: Partial<StripeConnectAccount>): Promise<StripeConnectAccount>
```

### 1.7 Router Endpoints

```typescript
// In payment.router.ts (or a dedicated connect router)

getConnectStatus: modulePermission('payments:read')
  .query()  // Returns { connected: boolean, status, chargesEnabled, payoutsEnabled }

createConnectAccount: modulePermission('payments:write')
  .mutation()  // Creates Stripe account + DB row, returns account link URL

getOnboardingLink: modulePermission('payments:write')
  .mutation()  // Returns fresh account link URL for resuming onboarding

getDashboardLink: modulePermission('payments:write')
  .mutation()  // Returns Stripe login link so tenant can access their dashboard

disconnectAccount: modulePermission('payments:write')
  .mutation()  // Deauthorizes the connection
```

---

## 2. Payment Service

### 2.1 Creating PaymentIntents via Stripe Connect

The existing `stripe.provider.ts` already supports Connect via `transfer_data.destination`. The flow needs to be wired into the service layer:

```
Tenant creates invoice for customer
  -> Invoice status: DRAFT
  -> Tenant sends invoice
  -> Invoice status: SENT
  -> Customer clicks "Pay Now" link
  -> Backend creates PaymentIntent via Stripe Connect:
       stripe.paymentIntents.create({
         amount: amountInMinorUnits,
         currency: invoice.currency,
         transfer_data: { destination: tenant's stripeAccountId },
         application_fee_amount: calculatePlatformFee(amount, tenantPlan),
         metadata: { invoiceId, tenantId, bookingId, customerId },
         idempotency_key: `pi_${invoiceId}_${Date.now()}`,
       })
  -> Return client_secret to frontend for Stripe Elements
```

### 2.2 Platform Fee Calculation

```typescript
// src/modules/payment/lib/fee-calculator.ts

interface PlatformFeeConfig {
  plan: PlanType
  overridePercent?: number  // tenant-level override from organization_settings or vertical config
}

const DEFAULT_FEE_PERCENT: Record<PlanType, number> = {
  STARTER:       3.0,   // highest fee for lowest plan
  PROFESSIONAL:  2.5,
  BUSINESS:      2.0,
  ENTERPRISE:    1.5,
  CUSTOM:        1.0,   // negotiated
}

export function calculatePlatformFee(
  amountInMajorUnits: number,
  config: PlatformFeeConfig
): number {
  const percent = config.overridePercent ?? DEFAULT_FEE_PERCENT[config.plan]
  return round2(amountInMajorUnits * (percent / 100))
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}
```

### 2.3 Payment Lifecycle

```
PaymentIntent.created
  -> payment row inserted: status=PENDING, stripePaymentIntentId set

PaymentIntent.succeeded (webhook)
  -> payment status -> COMPLETED
  -> invoice amountPaid updated
  -> invoice status -> PAID or PARTIALLY_PAID
  -> Emit payment/intent.succeeded

PaymentIntent.payment_failed (webhook)
  -> payment status -> FAILED
  -> Emit payment/intent.failed

charge.refunded (webhook)
  -> New payment row: type=REFUND, amount=refundAmount
  -> Original payment status -> REFUNDED
  -> Invoice status -> REFUNDED (if full) or amountPaid adjusted
  -> Emit payment/refund.completed
```

### 2.4 Refund Flow

Currently missing. Needs implementation:

```typescript
// payment.service.ts

async function requestRefund(
  tenantId: string,
  paymentId: string,
  amount: number,
  reason: string
): Promise<{ refundId: string }> {
  const payment = await paymentRepository.findPaymentById(paymentId, tenantId)
  if (!payment) throw new NotFoundError('Payment', paymentId)
  if (payment.status !== 'COMPLETED') throw new BadRequestError('Can only refund completed payments')
  if (amount > parseFloat(payment.amount as string)) throw new BadRequestError('Refund amount exceeds payment')

  const connectAccount = await paymentRepository.findStripeConnectAccountByTenantId(tenantId)

  // Issue refund via Stripe
  const stripe = getStripe()
  const refund = await stripe.refunds.create(
    {
      payment_intent: payment.stripePaymentIntentId!,
      amount: Math.round(amount * 100),
      reason: mapReasonToStripe(reason),
      refund_application_fee: true,  // refund the platform fee proportionally
    },
    { idempotencyKey: `refund_${paymentId}_${Date.now()}` }
  )

  // Record refund in DB
  const refundPayment = await paymentRepository.createPayment(tenantId, {
    invoiceId: payment.invoiceId!,
    bookingId: payment.bookingId ?? null,
    amount: -amount,  // negative to indicate refund
    method: payment.method,
    customerId: payment.customerId,
    type: 'REFUND',
    stripePaymentIntentId: refund.payment_intent as string,
    notes: `Refund: ${reason}`,
  })

  // Update invoice
  const invoice = await paymentRepository.findInvoiceById(payment.invoiceId!, tenantId)
  if (invoice) {
    const newAmountPaid = parseFloat(invoice.amountPaid as string) - amount
    const isFullRefund = newAmountPaid <= 0
    if (isFullRefund) {
      assertValidInvoiceTransition(invoice.status as InvoiceStatus, 'REFUNDED')
      await paymentRepository.updateInvoiceStatus(invoice.id, tenantId, invoice.version, 'REFUNDED', {
        amountPaid: String(newAmountPaid),
      })
    } else {
      await paymentRepository.updateInvoiceStatus(invoice.id, tenantId, invoice.version, invoice.status, {
        amountPaid: String(newAmountPaid),
      })
    }
  }

  await inngest.send({
    name: 'payment/refund.completed',
    data: { refundId: refundPayment.id, paymentId, tenantId },
  })

  return { refundId: refundPayment.id }
}
```

### 2.5 Idempotency Keys

Stripe natively supports idempotency keys on API calls. The codebase already has `idempotencyKey` on the `payments` table and accepts it in `recordPaymentSchema`. The strategy:

- PaymentIntent creation: `pi_{invoiceId}_{timestamp}` (prevents double-charge on retry)
- Refund creation: `refund_{paymentId}_{timestamp}`
- The `payments.idempotencyKey` column (UNIQUE constraint) prevents duplicate DB rows even if Stripe calls succeed but DB write fails and retries
- Inngest provides exactly-once step semantics for webhook handlers, preventing duplicate processing of the same Stripe event

### 2.6 Checkout Session (Customer-Facing Payment)

For the "Pay Now" link on invoices, use Stripe Checkout Sessions instead of raw PaymentIntents. Checkout provides a hosted payment page:

```typescript
// stripe.provider.ts

async function createCheckoutSession(input: {
  invoiceId: string
  tenantId: string
  amount: number
  currency: string
  customerEmail: string
  stripeConnectAccountId: string
  platformFeeAmount: number
  successUrl: string
  cancelUrl: string
}): Promise<{ url: string; sessionId: string }> {
  const stripe = getStripe()

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [{
      price_data: {
        currency: input.currency.toLowerCase(),
        product_data: { name: `Invoice ${input.invoiceId}` },
        unit_amount: Math.round(input.amount * 100),
      },
      quantity: 1,
    }],
    payment_intent_data: {
      application_fee_amount: Math.round(input.platformFeeAmount * 100),
      transfer_data: { destination: input.stripeConnectAccountId },
      metadata: { invoiceId: input.invoiceId, tenantId: input.tenantId },
    },
    customer_email: input.customerEmail,
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    metadata: { invoiceId: input.invoiceId, tenantId: input.tenantId },
  })

  return { url: session.url!, sessionId: session.id }
}
```

---

## 3. Invoice State Machine

### 3.1 Existing Implementation

The state machine is fully implemented in `src/modules/payment/lib/state-machine.ts` and thoroughly tested (55+ tests). The transition table:

```
DRAFT          -> [SENT]
SENT           -> [VIEWED, PAID, PARTIALLY_PAID, OVERDUE, VOID]
VIEWED         -> [PAID, PARTIALLY_PAID, OVERDUE, VOID]
PARTIALLY_PAID -> [PAID, OVERDUE]
OVERDUE        -> [PAID, PARTIALLY_PAID, VOID]
PAID           -> [REFUNDED]
VOID           -> [] (terminal)
REFUNDED       -> [] (terminal)
```

### 3.2 Service Methods for Each Transition

| Transition | Trigger | Service Method | Status |
|-----------|---------|---------------|--------|
| DRAFT -> SENT | Tenant clicks "Send" | `sendInvoice()` | EXISTS |
| SENT -> VIEWED | Customer opens invoice (tracking pixel) | `markInvoiceViewed()` | NEEDS IMPLEMENTATION |
| SENT/VIEWED -> PAID | Full payment received | `recordPayment()` (auto-transitions) | EXISTS |
| SENT/VIEWED -> PARTIALLY_PAID | Partial payment received | `recordPayment()` (auto-transitions) | EXISTS |
| SENT/VIEWED/PARTIALLY_PAID -> OVERDUE | Cron job at 9am daily | `overdueInvoiceCron` Inngest function | EXISTS |
| SENT/OVERDUE -> VOID | Tenant manually voids | `voidInvoice()` | EXISTS |
| PAID -> REFUNDED | Refund processed | `requestRefund()` | NEEDS IMPLEMENTATION |

### 3.3 Missing: markInvoiceViewed

```typescript
// payment.service.ts

async function markInvoiceViewed(tenantId: string, invoiceId: string): Promise<void> {
  const invoice = await paymentRepository.findInvoiceById(invoiceId, tenantId)
  if (!invoice) return  // idempotent
  if (invoice.status !== 'SENT') return  // only transition from SENT

  await paymentRepository.updateInvoiceStatus(invoiceId, tenantId, invoice.version, 'VIEWED')
  log.info({ tenantId, invoiceId }, 'Invoice viewed by customer')
}
```

This requires a public endpoint (no auth) that the customer's email client or browser hits. Typically implemented as a tracking pixel or an explicit "View Invoice" link.

### 3.4 DB Constraints

The existing schema uses optimistic concurrency control (OCC) via the `version` column on `invoices`. The `updateInvoiceStatus` repository method already includes `eq(invoices.version, expectedVersion)` in the WHERE clause.

Additional DB-level constraints to add (from Phase 6 spec):

```sql
-- Enforce: amountPaid cannot exceed totalAmount
ALTER TABLE invoices ADD CONSTRAINT invoices_amount_paid_check
  CHECK (CAST(amount_paid AS NUMERIC) <= CAST(total_amount AS NUMERIC));

-- Enforce: amountDue = totalAmount - amountPaid (application code does this, DB constraint as safety net)
-- Note: discount_amount is already accounted for in total_amount calculation
```

These constraints should be added via a Drizzle migration.

---

## 4. Webhook to Inngest Bridge

### 4.1 Existing Route

The webhook route at `src/app/api/webhooks/stripe/route.ts` already exists and works correctly:

1. Reads raw body as text (required for signature verification)
2. Extracts `stripe-signature` header
3. Validates with `stripe.webhooks.constructEvent(rawBody, sig, secret)`
4. Forwards entire event to Inngest as `stripe/webhook.received`
5. Returns `{ received: true }` immediately (200 OK)

### 4.2 Existing Handler

The `handleStripeWebhook` Inngest function in `payment.events.ts` currently handles:

- `payment_intent.succeeded` -> Records payment, updates invoice, emits `payment/intent.succeeded`
- `payment_intent.payment_failed` -> Marks payment as FAILED, emits `payment/intent.failed`
- `charge.dispute.created` -> Marks payment as disputed, emits `payment/dispute.created`

### 4.3 New Stripe Webhook Events to Handle

The following events need to be added to the `handleStripeWebhook` switch statement:

**Connect Account Events:**

| Stripe Event | Action | New Inngest Event |
|-------------|--------|-------------------|
| `account.updated` | Sync Connect account status (chargesEnabled, payoutsEnabled, requirements) | `connect/account.updated` |
| `account.application.deauthorized` | Mark account as deauthorized | `connect/account.deauthorized` |

**Refund Events:**

| Stripe Event | Action | New Inngest Event |
|-------------|--------|-------------------|
| `charge.refunded` | Create refund payment record, update invoice status | `payment/refund.completed` |
| `charge.refund.updated` | Update refund status if async refund | (none, log only) |

**Checkout Events:**

| Stripe Event | Action | New Inngest Event |
|-------------|--------|-------------------|
| `checkout.session.completed` | Mark invoice as viewed/paid (depending on payment_status) | (triggers payment_intent.succeeded separately) |
| `checkout.session.expired` | Log expiry | (none, log only) |

**Subscription Events (for Platform Billing):**

| Stripe Event | Action | New Inngest Event |
|-------------|--------|-------------------|
| `customer.subscription.created` | Record subscription on tenant | `billing/subscription.created` |
| `customer.subscription.updated` | Update tenant plan if changed | `billing/subscription.updated` |
| `customer.subscription.deleted` | Handle cancellation/downgrade | `billing/subscription.cancelled` |
| `customer.subscription.trial_will_end` | Send warning notification | `billing/trial.ending` |
| `invoice.paid` (Stripe invoice, not ours) | Confirm subscription payment | `billing/invoice.paid` |
| `invoice.payment_failed` (Stripe invoice) | Handle failed subscription payment | `billing/payment.failed` |

**Payout Events:**

| Stripe Event | Action | New Inngest Event |
|-------------|--------|-------------------|
| `payout.paid` | Log payout to tenant bank account | `connect/payout.completed` |
| `payout.failed` | Alert tenant | `connect/payout.failed` |

### 4.4 Stripe Webhook Configuration

The Stripe dashboard webhook endpoint should be configured to receive these events:

```
account.updated
account.application.deauthorized
charge.dispute.created
charge.refunded
checkout.session.completed
checkout.session.expired
customer.subscription.created
customer.subscription.updated
customer.subscription.deleted
customer.subscription.trial_will_end
invoice.paid
invoice.payment_failed
payment_intent.succeeded
payment_intent.payment_failed
payout.paid
payout.failed
```

For Connect events (`account.updated`, `payout.*`), a separate Connect webhook endpoint is needed in Stripe, as these fire on the connected account rather than the platform account. The same route can handle both with a different webhook secret:

```typescript
// Environment variables needed:
// STRIPE_WEBHOOK_SECRET — for platform events
// STRIPE_CONNECT_WEBHOOK_SECRET — for connect events
```

---

## 5. Platform Billing

### 5.1 Tenant Subscription Plans

The `tenants` table already has `plan` (PlanType enum), `stripeCustomerId`, `subscriptionId`, `billingEmail`, and `trialEndsAt` columns.

**Plan tiers and limits (already in tenant schema):**

| Plan | maxUsers | maxStaff | maxBookingsMonth | Platform Fee |
|------|----------|----------|-----------------|-------------|
| STARTER | 5 | 10 | 500 | 3.0% |
| PROFESSIONAL | 10 | 25 | 2,000 | 2.5% |
| BUSINESS | 25 | 100 | 10,000 | 2.0% |
| ENTERPRISE | unlimited | unlimited | unlimited | 1.5% |
| CUSTOM | negotiated | negotiated | negotiated | negotiated |

### 5.2 Subscription Lifecycle

```
Tenant signs up
  -> Create Stripe Customer (stripe.customers.create)
  -> Store stripeCustomerId on tenants row
  -> If trial: set trialEndsAt, status='TRIAL'
  -> If paid: create Stripe Subscription
  -> Store subscriptionId on tenants row

Plan change
  -> Update Stripe Subscription (proration)
  -> Update tenants.plan on subscription.updated webhook

Cancellation
  -> Cancel Stripe Subscription at period end
  -> On subscription.deleted webhook: tenant.status='CANCELLED'

Trial ending (3 days before)
  -> customer.subscription.trial_will_end webhook
  -> Send notification to tenant admin
```

### 5.3 Service Methods for Billing

```typescript
// src/modules/payment/billing.service.ts (new file)

createStripeCustomer(tenantId: string, email: string, name: string): Promise<string>
  // stripe.customers.create({ email, name, metadata: { tenantId } })
  // Update tenants.stripeCustomerId

createSubscription(tenantId: string, priceId: string, trialDays?: number): Promise<{ subscriptionId: string }>
  // stripe.subscriptions.create({ customer, items: [{ price: priceId }], trial_period_days })
  // Update tenants.subscriptionId

changeSubscription(tenantId: string, newPriceId: string): Promise<void>
  // stripe.subscriptions.update(subscriptionId, { items: [...], proration_behavior: 'create_prorations' })
  // Plan update happens on webhook

cancelSubscription(tenantId: string, atPeriodEnd?: boolean): Promise<void>
  // stripe.subscriptions.update(subscriptionId, { cancel_at_period_end: true })
  // Or stripe.subscriptions.cancel(subscriptionId) for immediate

getSubscriptionStatus(tenantId: string): Promise<SubscriptionStatus>
  // stripe.subscriptions.retrieve(subscriptionId)

createBillingPortalSession(tenantId: string, returnUrl: string): Promise<{ url: string }>
  // stripe.billingPortal.sessions.create({ customer, return_url })
  // Let tenant manage their own billing (update card, view invoices, cancel)
```

### 5.4 Usage-Based Metering (Future, for AI Features)

When AI features are introduced, usage will be tracked and billed via Stripe metering:

```typescript
// Future — not in scope for this implementation
// stripe.billing.meters.create({ ... })
// stripe.billing.meterEvents.create({ event_name: 'ai_tokens', payload: { value: tokenCount } })
```

This is deferred until the AI module (Platform Factory Section 4) is built. The billing service should be structured to accommodate this later.

### 5.5 Trial Periods

- Default trial: 14 days (configurable per vertical via `vertical.config.ts`)
- `tenants.trialEndsAt` stores the trial end date
- `tenants.status` = 'TRIAL' during trial
- Stripe `trial_period_days` on subscription creation
- `customer.subscription.trial_will_end` webhook triggers notification 3 days before
- On trial end without payment method: subscription becomes `past_due`, tenant status stays TRIAL until grace period expires

---

## 6. New Schema Changes

### 6.1 Tables Already Exist (No Migration Needed)

- `stripe_connect_accounts` — exists in `phase6.schema.ts`
- `invoices` with all needed columns — exists in `shared.schema.ts`
- `payments` with Stripe columns — exists in `shared.schema.ts`
- `pricing_rules`, `discount_codes`, `tax_rules` — exist in `phase6.schema.ts`
- `tenants` with `stripeCustomerId`, `subscriptionId` — exists in `tenant.schema.ts`

### 6.2 New Columns Needed

None. All required columns already exist in the schema. The `payments` table already has `stripePaymentIntentId`, `stripeChargeId`, `stripeTransferId`, `platformFeeAmount`, and `idempotencyKey`. The `tenants` table already has `stripeCustomerId` and `subscriptionId`.

### 6.3 New Indexes to Consider

```sql
-- For webhook deduplication (prevent processing same Stripe event twice)
-- Option A: Use Inngest's built-in idempotency (event ID = stripeEventId)
-- Option B: Add a processed_stripe_events table (belt and suspenders)

-- For Connect account lookups by Stripe ID (already has unique index)
-- stripe_connect_accounts_stripeAccountId_key — EXISTS

-- For payment lookups by PaymentIntent ID (already has unique index)
-- payments.stripe_payment_intent_id — EXISTS (UNIQUE)
```

### 6.4 Optional: Stripe Event Log Table

For debugging and auditability, consider a dedicated table to log all received Stripe webhook events. This is optional but useful:

```typescript
// In phase6.schema.ts (optional addition)

export const stripeWebhookEvents = pgTable("stripe_webhook_events", {
  id: uuid().primaryKey().notNull().default(sql`gen_random_uuid()`),
  stripeEventId: text().notNull(),
  eventType: text().notNull(),
  stripeAccountId: text(),  // null for platform events, account ID for Connect events
  processed: boolean().notNull().default(false),
  processedAt: timestamp({ withTimezone: true, mode: 'date' }),
  error: text(),
  createdAt: timestamp({ withTimezone: true, mode: 'date' }).notNull().default(sql`now()`),
}, (table) => [
  uniqueIndex("stripe_webhook_events_stripeEventId_key").on(table.stripeEventId),
  index("stripe_webhook_events_eventType_idx").on(table.eventType),
])
```

This provides a reliable deduplication layer on top of Inngest's own idempotency. The webhook route would INSERT before forwarding to Inngest, and ON CONFLICT DO NOTHING to skip duplicates.

---

## 7. New Inngest Events

### 7.1 Events to Add to `src/shared/inngest.ts`

```typescript
// Payment/refund events
"payment/refund.requested": {
  data: {
    paymentId: string;
    bookingId: string;
    tenantId: string;
    amount: number;
    reason: string;
  };
};
"payment/refund.completed": {
  data: {
    refundId: string;
    paymentId: string;
    tenantId: string;
  };
};
"payment/checkout.created": {
  data: {
    sessionId: string;
    invoiceId: string;
    tenantId: string;
    amount: number;
  };
};

// Connect events
"connect/account.updated": {
  data: {
    stripeAccountId: string;
    tenantId: string;
    chargesEnabled: boolean;
    payoutsEnabled: boolean;
    status: string;
  };
};
"connect/account.deauthorized": {
  data: {
    stripeAccountId: string;
    tenantId: string;
  };
};
"connect/payout.completed": {
  data: {
    payoutId: string;
    stripeAccountId: string;
    amount: number;
    currency: string;
  };
};
"connect/payout.failed": {
  data: {
    payoutId: string;
    stripeAccountId: string;
    amount: number;
    failureMessage: string;
  };
};

// Billing/subscription events
"billing/subscription.created": {
  data: {
    tenantId: string;
    subscriptionId: string;
    plan: string;
  };
};
"billing/subscription.updated": {
  data: {
    tenantId: string;
    subscriptionId: string;
    plan: string;
    status: string;
  };
};
"billing/subscription.cancelled": {
  data: {
    tenantId: string;
    subscriptionId: string;
    cancelledAt: string;
  };
};
"billing/trial.ending": {
  data: {
    tenantId: string;
    trialEndsAt: string;
    daysRemaining: number;
  };
};
"billing/invoice.paid": {
  data: {
    tenantId: string;
    stripeInvoiceId: string;
    amount: number;
  };
};
"billing/payment.failed": {
  data: {
    tenantId: string;
    stripeInvoiceId: string;
    amount: number;
    attemptCount: number;
  };
};
```

### 7.2 Event Naming Convention

All events follow the existing `domain/action` pattern:
- `payment/*` — customer payments through tenants
- `connect/*` — Stripe Connect account events
- `billing/*` — platform subscription billing events
- `stripe/*` — raw Stripe webhook bridge (already exists)

---

## 8. Implementation Tasks

### Wave 1: Types, Schemas, Fee Calculator (no dependencies)

**Task 1.1** — Add StripeConnectAccount types and billing types to `payment.types.ts`
```
File: src/modules/payment/payment.types.ts
Add: ConnectAccountStatus type, BillingSubscriptionStatus, CreateCheckoutInput, RefundInput updates,
     PlatformFeeConfig, SubscriptionStatus
```

**Task 1.2** — Add Zod schemas for Connect and billing endpoints to `payment.schemas.ts`
```
File: src/modules/payment/payment.schemas.ts
Add: createConnectAccountSchema, getOnboardingLinkSchema, createCheckoutSessionSchema,
     createSubscriptionSchema, changeSubscriptionSchema, cancelSubscriptionSchema,
     markInvoiceViewedSchema
```

**Task 1.3** — Create fee calculator
```
File: src/modules/payment/lib/fee-calculator.ts (NEW)
Add: calculatePlatformFee(), DEFAULT_FEE_PERCENT config
```

**Task 1.4** — Add new Inngest events to event catalog
```
File: src/shared/inngest.ts
Add: All events from Section 7.1 (payment/refund.*, connect/*, billing/*)
```

### Wave 2: Repository Layer (depends on Wave 1)

**Task 2.1** — Add Connect account repository methods
```
File: src/modules/payment/payment.repository.ts
Add: createStripeConnectAccount, findStripeConnectAccountByTenantId,
     findStripeConnectAccountByStripeId, updateStripeConnectAccount
```

**Task 2.2** — Add refund-related repository methods
```
File: src/modules/payment/payment.repository.ts
Add: findPaymentById (with tenantId), createRefundPayment
```

### Wave 3: Stripe Provider Extensions (depends on Wave 1)

**Task 3.1** — Add Connect account methods to stripe provider
```
File: src/modules/payment/providers/stripe.provider.ts
Add: createConnectAccount, createAccountLink, createLoginLink,
     retrieveAccount, deauthorizeAccount, createCheckoutSession,
     createRefund
```

### Wave 4: Service Layer (depends on Waves 2, 3)

**Task 4.1** — Add Connect service methods
```
File: src/modules/payment/payment.service.ts
Add: createConnectAccount, createAccountLink, createLoginLink,
     syncAccountStatus, getConnectAccount, deauthorizeAccount
```

**Task 4.2** — Add refund service method
```
File: src/modules/payment/payment.service.ts
Add: requestRefund (creates Stripe refund, records in DB, updates invoice)
```

**Task 4.3** — Add checkout session service method
```
File: src/modules/payment/payment.service.ts
Add: createCheckoutSession (creates Stripe Checkout, records pending payment)
```

**Task 4.4** — Add markInvoiceViewed service method
```
File: src/modules/payment/payment.service.ts
Add: markInvoiceViewed (public, no auth — tracking pixel or link click)
```

**Task 4.5** — Create billing service
```
File: src/modules/payment/billing.service.ts (NEW)
Add: createStripeCustomer, createSubscription, changeSubscription,
     cancelSubscription, getSubscriptionStatus, createBillingPortalSession,
     handleSubscriptionWebhook, handleTrialEnding
```

### Wave 5: Event Handlers (depends on Wave 4)

**Task 5.1** — Extend webhook handler with new event types
```
File: src/modules/payment/payment.events.ts
Add: account.updated, account.application.deauthorized, charge.refunded,
     checkout.session.completed, customer.subscription.*, invoice.paid,
     invoice.payment_failed, payout.paid, payout.failed
```

**Task 5.2** — Add billing event handlers
```
File: src/modules/payment/payment.events.ts (or billing.events.ts)
Add: handleSubscriptionCreated, handleSubscriptionUpdated,
     handleSubscriptionCancelled, handleTrialEnding,
     handleBillingInvoicePaid, handleBillingPaymentFailed
```

### Wave 6: Router Layer (depends on Wave 4)

**Task 6.1** — Add Connect endpoints to router
```
File: src/modules/payment/payment.router.ts
Add: getConnectStatus, createConnectAccount, getOnboardingLink,
     getDashboardLink, disconnectAccount
```

**Task 6.2** — Add refund endpoint to router
```
File: src/modules/payment/payment.router.ts
Add: refundPayment (uses existing refundPaymentSchema)
```

**Task 6.3** — Add checkout session endpoint
```
File: src/modules/payment/payment.router.ts
Add: createCheckoutSession (creates payment link for customer)
```

**Task 6.4** — Add invoice viewed endpoint (public)
```
File: src/modules/payment/payment.router.ts
Add: markInvoiceViewed (publicProcedure — no auth, called by tracking pixel/link)
```

**Task 6.5** — Add billing portal endpoint
```
File: src/modules/payment/payment.router.ts
Add: getBillingPortalUrl (tenantProcedure — returns Stripe billing portal URL)
```

### Wave 7: Webhook Route Enhancement (depends on Wave 5)

**Task 7.1** — Support Connect webhook verification
```
File: src/app/api/webhooks/stripe/route.ts
Update: Support both platform and Connect webhook secrets.
        Connect events use a different signing secret.
        Add logic to determine which secret to use based on the event.
```

### Wave 8: Tests (depends on all waves)

**Task 8.1** — Fee calculator tests
```
File: src/modules/payment/__tests__/fee-calculator.test.ts (NEW)
Add: Tests for calculatePlatformFee across all plan tiers, override percent,
     rounding edge cases
```

**Task 8.2** — Connect service tests
```
File: src/modules/payment/__tests__/payment.service.test.ts
Add: Tests for createConnectAccount, createAccountLink, syncAccountStatus,
     deauthorizeAccount (all Stripe calls mocked)
```

**Task 8.3** — Refund flow tests
```
File: src/modules/payment/__tests__/payment.service.test.ts
Add: Tests for requestRefund — full refund, partial refund, validation errors,
     invoice status transition
```

**Task 8.4** — Billing service tests
```
File: src/modules/payment/__tests__/billing.service.test.ts (NEW)
Add: Tests for subscription lifecycle — create, change, cancel, webhook handlers
```

**Task 8.5** — Webhook handler tests
```
File: src/modules/payment/__tests__/payment.events.test.ts (NEW)
Add: Tests for each new webhook event type, verifying correct service calls
```

### Wave 9: Wiring and Manifest Update

**Task 9.1** — Update payment manifest with new routes
```
File: src/modules/payment/payment.manifest.ts
Add: Connect settings route, billing route in sidebarItems
Add: 'payments:refund' permission (already listed but confirm)
```

**Task 9.2** — Update barrel export
```
File: src/modules/payment/index.ts
Add: Export billing service, new event handlers
```

**Task 9.3** — Register new Inngest functions
```
File: Wherever Inngest functions are collected (check existing wiring)
Add: New billing event handlers to the function list
```

---

## Environment Variables Required

```env
# Already exist (likely):
STRIPE_SECRET_KEY=sk_live_xxx          # Platform Stripe secret key
STRIPE_WEBHOOK_SECRET=whsec_xxx        # Webhook signing secret (platform events)

# New:
STRIPE_CONNECT_WEBHOOK_SECRET=whsec_xxx  # Webhook signing secret (Connect events)
STRIPE_PUBLISHABLE_KEY=pk_live_xxx       # For frontend Stripe.js / Elements
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxx  # Exposed to client

# For subscription pricing:
STRIPE_STARTER_PRICE_ID=price_xxx
STRIPE_PROFESSIONAL_PRICE_ID=price_xxx
STRIPE_BUSINESS_PRICE_ID=price_xxx
STRIPE_ENTERPRISE_PRICE_ID=price_xxx
```

---

## Critical Design Decisions

1. **Standard Connect accounts** over Express/Custom — tenants own their Stripe account, less platform liability, simpler onboarding.

2. **application_fee_amount on PaymentIntent** (not separate transfers) — Stripe automatically collects the platform fee. Simpler, atomic, and handles refund fee reversal automatically when `refund_application_fee: true`.

3. **Stripe Checkout Sessions** for customer-facing payments (not raw PaymentIntents + Elements) — Stripe hosts the payment page, handles 3D Secure, remembers payment methods, handles localization. Massively reduces frontend work.

4. **Stripe Billing Portal** for tenant subscription management — Stripe hosts the billing management UI (update card, view invoices, cancel). No need to build a billing settings page.

5. **Webhook to Inngest bridge** (already built) — all Stripe webhook processing is durable with automatic retries. No risk of lost webhooks.

6. **Fee calculator as pure function** — easy to test, easy to override per tenant or vertical, no side effects.

7. **Refund includes application fee reversal** — when a customer gets refunded, the platform fee is also refunded proportionally. This is the fairest model and avoids disputes.

8. **No separate refunds table** — refunds are stored as `payments` rows with `type='REFUND'` and negative amount. The `payments` table already supports this via the `paymentType` enum (DEPOSIT, PAYMENT, REFUND, CREDIT).

---

## Dependencies and Risks

| Risk | Mitigation |
|------|-----------|
| Stripe API version mismatch | Pin to `2026-01-28.clover` (already in stripe.provider.ts) |
| Connect account KYC delays | Show clear status in UI, allow test mode for development |
| Webhook delivery failures | Inngest retries (3x configured), Stripe retries for 3 days |
| Duplicate webhook processing | Inngest step idempotency + unique constraint on stripePaymentIntentId |
| Currency rounding | All amounts stored as NUMERIC(10,2), all calculations use round2() |
| Stripe rate limits | Lazy Stripe client init (already done), idempotency keys prevent retried calls from counting double |
