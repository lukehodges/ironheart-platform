# Phase 7D Backend Implementation Plan — Ironheart Refactor
# Advanced Admin Features Backend Support
# Generated: 2026-02-20 | For: Analytics, Settings, Audit, Workflow History

---

## Executive Summary

### What Phase 7D Frontend Delivers

Phase 7D adds four critical enterprise features to the admin interface:

1. **Analytics Dashboard** (`/admin/analytics`) — KPI cards, revenue charts, booking breakdowns, staff utilization heatmaps, churn risk analysis
2. **Workflow Builder** (`/admin/workflows`) — Visual canvas with React Flow, execution history table, node configuration panels
3. **Settings** (`/admin/settings`) — 7 tabs covering general settings, notifications, integrations, billing, modules, security (API keys), danger zone
4. **Audit Log** (`/admin/audit`) — Complete activity timeline with filters and CSV export

### What Backend Work Is Needed

The frontend is **70% ready**. The missing 30% is backend procedures:

| Module | Frontend Status | Backend Status | Gap |
|--------|----------------|----------------|-----|
| **Analytics** | Complete (charts, KPIs, filters) | Partial (4/10 procedures) | Missing: KPI aggregation, booking/revenue breakdowns, staff utilization, churn risk |
| **Workflow** | Complete (canvas, history table) | Complete (Phase 5/6) | ✓ No gaps — verify execution history query performance |
| **Settings** | Complete (7 tabs, forms) | Partial (2/12 procedures) | Missing: Notifications, Integrations, API keys CRUD, Billing details, Danger zone exports |
| **Audit** | Complete (timeline, filters) | Stub only (0/2 procedures) | Missing: List with filters, CSV export |

**Estimated Scope:**
- **15 new procedures** across 3 routers (Analytics, Settings, Audit)
- **~3,200 LOC** total (repository + service + router + tests)
- **40+ unit tests** (at least 3 per procedure)
- **0 schema changes** — all tables exist from Phase 5/6

**Timeline Estimate:**
- **Phase 1-2:** 1 day (Settings General + Audit)
- **Phase 3:** 0.5 days (Workflow verification)
- **Phase 4:** 2 days (Analytics — most complex)
- **Phase 5:** 1 day (Settings Advanced)
- **Total:** 4.5 days for 1 senior backend developer

---

## 1. Analytics Router — Full Specification

**File:** `src/modules/analytics/analytics.router.ts`

### Current State
```typescript
// EXISTING (from Phase 6)
getSummary(period)        // ✓ Returns stub data
getTimeSeries(...)        // ✓ Queries metric_snapshots table
getCustomerInsights(...)  // ✓ RFM analysis
getRevenueForecast(...)   // ✓ Linear regression
```

### Required Additions

#### 1.1 `getKPIs` — KPI Cards with Comparisons

**Purpose:** Power the 4 KPI cards at the top of the analytics dashboard.

**Input Schema:**
```typescript
z.object({
  period: z.enum(['TODAY', 'WEEK', 'MONTH', 'QUARTER', 'YEAR']),
})
```

**Output Type:**
```typescript
interface KPIResponse {
  bookings: {
    current: number;
    previous: number;
    percentChange: number; // positive = growth, negative = decline
  };
  revenue: {
    current: number;
    previous: number;
    percentChange: number;
  };
  avgRating: {
    current: number;
    previous: number;
    change: number; // absolute difference
  };
  newCustomers: {
    current: number;
    previous: number;
    percentChange: number;
  };
}
```

**Database Queries:**
- `bookings` table: `COUNT(*)` where `status IN ('CONFIRMED', 'COMPLETED')` + date range filter
- `payments` table: `SUM(amount)` where `status = 'COMPLETED'` + date range
- `reviews` table: `AVG(rating)` where `isPublic = true` + date range
- `customers` table: `COUNT(*)` where `createdAt` in date range

**Business Logic:**
- For each KPI, run the query twice: current period + previous period (same duration, shifted back)
- Example: WEEK = last 7 days vs. 7 days before that
- Compute `percentChange = ((current - previous) / previous) * 100`
- Handle division by zero (previous = 0): return `null` or set percentChange to 100 if current > 0

**Permission:** `tenantProcedure` (read access for all authenticated users)

**Implementation Notes:**
- Use Drizzle `count()` aggregation: `db.select({ count: sql<number>`count(*)::int` }).from(bookings)`
- Date range filtering: `and(gte(bookings.createdAt, fromDate), lte(bookings.createdAt, toDate))`
- Cache in Redis (5 min TTL): `kpis:{tenantId}:{period}` to avoid expensive aggregations on every page load

---

#### 1.2 `getRevenueChart` — Time Series Revenue Data

**Purpose:** Line chart showing revenue over time (daily/weekly/monthly buckets).

**Input Schema:**
```typescript
z.object({
  from: z.string(), // ISO 8601 date
  to: z.string(),
  granularity: z.enum(['DAY', 'WEEK', 'MONTH']),
})
```

**Output Type:**
```typescript
interface RevenueChartResponse {
  data: Array<{
    date: string; // ISO 8601
    revenue: number;
    bookingCount: number;
  }>;
}
```

**Database Queries:**
- Query `metric_snapshots` table:
  - `metricKey = 'revenue.gross'`
  - `periodType = input.granularity`
  - `periodStart BETWEEN from AND to`
  - `ORDER BY periodStart ASC`
- Join with `bookings.created` metric for booking counts
- If metric_snapshots is empty (cron hasn't run yet), fall back to raw aggregation from `payments` table grouped by date

**Business Logic:**
- Phase 6 introduced `metric_snapshots` table with hourly cron aggregation
- This procedure should prioritize snapshots (fast) over raw queries (slow)
- If latest snapshot is >2 hours old, supplement with real-time Redis counters (see Phase 6 architecture)

**Permission:** `permissionProcedure('analytics:read')`

**Implementation Notes:**
- Reuse existing `analyticsRepository.getTimeSeriesMetric()` (already implemented in Phase 6)
- Add second call for booking count metric
- Combine results into single response

---

#### 1.3 `getBookingsByStatus` — Donut Chart Data

**Purpose:** Breakdown of bookings by status (PENDING, CONFIRMED, CANCELLED, COMPLETED, NO_SHOW).

**Input Schema:**
```typescript
z.object({
  from: z.string(),
  to: z.string(),
})
```

**Output Type:**
```typescript
interface BookingsByStatusResponse {
  data: Array<{
    status: BookingStatus;
    count: number;
    percentage: number; // of total
  }>;
  total: number;
}
```

**Database Queries:**
```sql
SELECT status, COUNT(*) as count
FROM bookings
WHERE tenant_id = ? AND created_at BETWEEN ? AND ?
GROUP BY status
ORDER BY count DESC
```

**Business Logic:**
- Calculate percentage: `(count / total) * 100`
- Return all statuses, even if count = 0 (frontend expects consistent shape)

**Permission:** `tenantProcedure`

**Implementation Notes:**
- Use Drizzle grouped aggregation:
  ```typescript
  const rows = await db
    .select({
      status: bookings.status,
      count: sql<number>`count(*)::int`,
    })
    .from(bookings)
    .where(and(
      eq(bookings.tenantId, ctx.tenantId),
      gte(bookings.createdAt, new Date(input.from)),
      lte(bookings.createdAt, new Date(input.to))
    ))
    .groupBy(bookings.status)
  ```

---

#### 1.4 `getTopServices` — Horizontal Bar Chart

**Purpose:** Services ranked by revenue (top 10).

**Input Schema:**
```typescript
z.object({
  from: z.string(),
  to: z.string(),
  limit: z.number().min(1).max(50).default(10),
})
```

**Output Type:**
```typescript
interface TopServicesResponse {
  data: Array<{
    serviceId: string;
    serviceName: string;
    revenue: number;
    bookingCount: number;
  }>;
}
```

**Database Queries:**
```sql
SELECT
  s.id as service_id,
  s.name as service_name,
  SUM(b.final_price) as revenue,
  COUNT(b.id) as booking_count
FROM bookings b
JOIN services s ON b.service_id = s.id
WHERE b.tenant_id = ? AND b.created_at BETWEEN ? AND ? AND b.status IN ('CONFIRMED', 'COMPLETED')
GROUP BY s.id, s.name
ORDER BY revenue DESC
LIMIT ?
```

**Business Logic:**
- Only count confirmed/completed bookings (ignore cancelled/pending)
- Use `finalPrice` field from bookings (after discounts, not base service price)

**Permission:** `permissionProcedure('analytics:read')`

**Implementation Notes:**
- Drizzle join + aggregation:
  ```typescript
  const rows = await db
    .select({
      serviceId: services.id,
      serviceName: services.name,
      revenue: sql<number>`sum(${bookings.finalPrice})::numeric`,
      bookingCount: sql<number>`count(*)::int`,
    })
    .from(bookings)
    .innerJoin(services, eq(bookings.serviceId, services.id))
    .where(...)
    .groupBy(services.id, services.name)
    .orderBy(sql`revenue DESC`)
    .limit(input.limit)
  ```

---

#### 1.5 `getStaffUtilization` — Heatmap Grid

**Purpose:** Staff utilization by hour of day (7 days × 24 hours matrix).

**Input Schema:**
```typescript
z.object({
  from: z.string(),
  to: z.string(),
  staffIds: z.array(z.string()).optional(), // filter by specific staff
})
```

**Output Type:**
```typescript
interface StaffUtilizationResponse {
  staff: Array<{
    staffId: string;
    staffName: string;
    hours: Array<{
      hour: number; // 0-23
      dayOfWeek: number; // 1=Monday, 7=Sunday
      bookedMinutes: number;
      availableMinutes: number;
      utilization: number; // 0-100 percentage
    }>;
  }>;
}
```

**Database Queries:**
1. **Available hours:** Query `userAvailability` table for staff recurring windows
2. **Booked hours:** Query `bookings` table grouped by `EXTRACT(HOUR FROM start_time)` and `EXTRACT(DOW FROM start_time)`
3. Calculate utilization: `(bookedMinutes / availableMinutes) * 100`

**Business Logic:**
- Utilization > 100% means overbooking
- If no availability defined for a slot, don't include it (avoid division by zero)
- Only include confirmed/completed bookings

**Permission:** `permissionProcedure('analytics:read')`

**Implementation Notes:**
- Complex query — consider caching result for 1 hour (Redis)
- Use PostgreSQL `EXTRACT(HOUR FROM ...)` and `EXTRACT(DOW FROM ...)`
- Phase 5 pattern: Join `bookings → users` for staff names

---

#### 1.6 `getChurnRisk` — At-Risk Customers Table

**Purpose:** Customers flagged by RFM (Recency, Frequency, Monetary) model as high/medium churn risk.

**Input Schema:**
```typescript
z.object({
  riskLevel: z.enum(['HIGH', 'MEDIUM', 'LOW']).optional(),
  limit: z.number().min(1).max(100).default(20),
})
```

**Output Type:**
```typescript
interface ChurnRiskResponse {
  customers: Array<{
    customerId: string;
    customerName: string;
    email: string;
    lastBookingDate: Date;
    daysSinceLastBooking: number;
    totalBookings: number;
    totalSpend: number;
    avgBookingValue: number;
    churnRiskScore: number; // 0-1
    churnRiskLabel: 'LOW' | 'MEDIUM' | 'HIGH';
  }>;
}
```

**Database Queries:**
- Subquery per customer:
  ```sql
  SELECT
    c.id,
    c.name,
    c.email,
    MAX(b.start_time) as last_booking_date,
    COUNT(b.id) as total_bookings,
    SUM(b.final_price) as total_spend
  FROM customers c
  LEFT JOIN bookings b ON c.id = b.customer_id AND b.status IN ('CONFIRMED', 'COMPLETED')
  WHERE c.tenant_id = ?
  GROUP BY c.id
  ```
- Then compute RFM score in application code

**Business Logic (RFM Model):**
```typescript
// R = Recency (days since last booking)
// F = Frequency (bookings per 90 days)
// M = Monetary (avg booking value)

const daysSince = daysBetween(lastBookingDate, now)
const frequency = totalBookings / (accountAgeDays / 90)
const avgValue = totalSpend / totalBookings

// Normalize to 0-1 scale (percentile ranking)
const recencyScore = normalize(daysSince, [...allDaysSince]) // higher = worse
const frequencyScore = normalize(frequency, [...allFrequencies]) // higher = better
const monetaryScore = normalize(avgValue, [...allAvgValues]) // higher = better

// Weighted churn risk (recency most important)
churnRiskScore = (recencyScore * 0.5) + ((1 - frequencyScore) * 0.3) + ((1 - monetaryScore) * 0.2)

// Label thresholds
if (churnRiskScore > 0.7) label = 'HIGH'
else if (churnRiskScore > 0.4) label = 'MEDIUM'
else label = 'LOW'
```

**Permission:** `permissionProcedure('analytics:read')`

**Implementation Notes:**
- **Reuse existing:** Phase 6 added `analyticsService.getCustomerInsights(customerId)` with RFM logic
- This procedure extends it to batch-compute for ALL customers
- Filter by risk level after scoring
- Consider caching customer list snapshot (runs once per hour via cron, stored in Redis)

---

### Analytics Router — Summary

```typescript
export const analyticsRouter = router({
  // EXISTING (Phase 6)
  getSummary: tenantProcedure.input(summarySchema).query(...),
  getTimeSeries: tenantProcedure.input(timeSeriesSchema).query(...),
  getCustomerInsights: permissionProcedure('analytics:read').input(...).query(...),
  getRevenueForecast: permissionProcedure('analytics:read').input(...).query(...),

  // NEW (Phase 7D)
  getKPIs: tenantProcedure
    .input(z.object({ period: z.enum(['TODAY', 'WEEK', 'MONTH', 'QUARTER', 'YEAR']) }))
    .query(async ({ ctx, input }) => analyticsService.getKPIs(ctx, input)),

  getRevenueChart: permissionProcedure('analytics:read')
    .input(z.object({ from: z.string(), to: z.string(), granularity: z.enum(['DAY', 'WEEK', 'MONTH']) }))
    .query(async ({ ctx, input }) => analyticsService.getRevenueChart(ctx, input)),

  getBookingsByStatus: tenantProcedure
    .input(z.object({ from: z.string(), to: z.string() }))
    .query(async ({ ctx, input }) => analyticsService.getBookingsByStatus(ctx, input)),

  getTopServices: permissionProcedure('analytics:read')
    .input(z.object({ from: z.string(), to: z.string(), limit: z.number().default(10) }))
    .query(async ({ ctx, input }) => analyticsService.getTopServices(ctx, input)),

  getStaffUtilization: permissionProcedure('analytics:read')
    .input(z.object({ from: z.string(), to: z.string(), staffIds: z.array(z.string()).optional() }))
    .query(async ({ ctx, input }) => analyticsService.getStaffUtilization(ctx, input)),

  getChurnRisk: permissionProcedure('analytics:read')
    .input(z.object({ riskLevel: z.enum(['HIGH', 'MEDIUM', 'LOW']).optional(), limit: z.number().default(20) }))
    .query(async ({ ctx, input }) => analyticsService.getChurnRisk(ctx, input)),
})
```

**Test Coverage:**
- 6 new procedures × 3 tests each = 18 tests minimum
- Test cases:
  - Empty data (no bookings/customers) — should return zeros, not crash
  - Date range validation (from > to should error)
  - Tenant isolation (should not see other tenant's data)
  - Permission enforcement (analytics:read required for restricted procedures)

---

## 2. Settings Router — Full Specification

**File:** Create new router at `src/modules/settings/settings.router.ts`

### Current State
Settings logic is split across multiple modules:
- `tenant.router.ts`: General settings (getSettings, updateSettings)
- `tenant.router.ts`: Modules (listModules, enableModule, disableModule)
- `developer.router.ts`: Webhooks (partial)
- **Missing:** Notifications, Integrations, API keys, Billing, Danger zone

### Architecture Decision: Consolidate vs. Extend

**Recommendation:** Create a **new `settings` router** that re-exports procedures from existing modules + adds missing ones. This keeps the frontend's single `/admin/settings` page interface clean.

```typescript
// src/modules/settings/settings.router.ts
export const settingsRouter = router({
  // General — delegate to tenant module
  getGeneral: tenantProcedure.query(({ ctx }) => tenantService.getSettings(ctx)),
  updateGeneral: permissionProcedure('tenant:write').input(updateGeneralSchema).mutation(...),

  // Notifications — NEW
  getNotifications: tenantProcedure.query(...),
  updateNotifications: permissionProcedure('tenant:write').input(...).mutation(...),

  // Integrations — NEW
  getIntegrations: tenantProcedure.query(...),
  connectGoogle: permissionProcedure('integrations:write').mutation(...),
  disconnectGoogle: permissionProcedure('integrations:write').mutation(...),
  connectOutlook: permissionProcedure('integrations:write').mutation(...),
  disconnectOutlook: permissionProcedure('integrations:write').mutation(...),

  // Billing — delegate to tenant + payment modules
  getBilling: tenantProcedure.query(...),

  // Modules — delegate to tenant module
  getModules: tenantProcedure.query(({ ctx }) => tenantService.listModules(ctx)),
  toggleModule: permissionProcedure('tenant:write').input(...).mutation(...),

  // API Keys — NEW
  listApiKeys: tenantProcedure.query(...),
  createApiKey: permissionProcedure('developer:write').input(...).mutation(...),
  revokeApiKey: permissionProcedure('developer:write').input(...).mutation(...),

  // Danger Zone — NEW
  exportData: permissionProcedure('tenant:admin').mutation(...),
  deleteAllData: permissionProcedure('tenant:admin').input(...).mutation(...),
})
```

---

### 2.1 Notifications Tab

#### `getNotifications`

**Purpose:** Retrieve current email/SMS notification settings.

**Input:** None (uses ctx.tenantId)

**Output Type:**
```typescript
interface NotificationSettings {
  emailEnabled: boolean;
  smsEnabled: boolean;
  reminderTiming: number; // hours before appointment
  confirmationTemplate: string; // template ID or content
  reminderTemplate: string;
  cancellationTemplate: string;
  optOutSettings: {
    allowEmailOptOut: boolean;
    allowSmsOptOut: boolean;
  };
}
```

**Database Queries:**
- Query `organizationSettings` table (Phase 5 has 27 typed columns including notification fields)
- Columns used: `senderName`, `senderEmail`, `smsFrom` (from shared.schema.ts line 258+)
- For templates: query `emailTemplates` / `smsTemplates` tables (Phase 4)

**Business Logic:**
- Load default templates if tenant hasn't customized
- Check if Resend/Twilio are configured (API keys in env) — if not, return `emailEnabled: false`

**Permission:** `tenantProcedure`

---

#### `updateNotifications`

**Purpose:** Update notification preferences.

**Input Schema:**
```typescript
z.object({
  emailEnabled: z.boolean().optional(),
  smsEnabled: z.boolean().optional(),
  reminderTiming: z.number().min(1).max(168).optional(), // 1-168 hours
  confirmationTemplateId: z.string().optional(),
  reminderTemplateId: z.string().optional(),
  cancellationTemplateId: z.string().optional(),
})
```

**Output:** Updated `NotificationSettings`

**Database Queries:**
- UPDATE `organizationSettings` table (partial update — only changed fields)
- Pattern from Phase 5: `tenantRepository.upsertSettings(tenantId, input)`

**Business Logic:**
- Validate template IDs exist before saving
- Invalidate Redis cache: `del tenant:settings:{tenantId}`

**Permission:** `permissionProcedure('tenant:write')`

---

### 2.2 Integrations Tab

#### `getIntegrations`

**Purpose:** Show connected integrations (Google Calendar, Outlook).

**Output Type:**
```typescript
interface IntegrationsResponse {
  google: {
    connected: boolean;
    email?: string;
    connectedAt?: Date;
    scopes?: string[];
  };
  outlook: {
    connected: boolean;
    email?: string;
    connectedAt?: Date;
  };
}
```

**Database Queries:**
- Query `calendarConnections` table (Phase 4):
  ```sql
  SELECT provider, external_calendar_id, connected_at, is_active
  FROM calendar_connections
  WHERE tenant_id = ? AND is_active = true
  ```

**Business Logic:**
- Return `connected: false` if no row found for provider
- Extract email from `externalCalendarId` (Google format: `user@gmail.com`)

**Permission:** `tenantProcedure`

---

#### `connectGoogle` / `connectOutlook`

**Purpose:** Initiate OAuth flow for calendar integration.

**Input Schema:**
```typescript
z.object({
  redirectUrl: z.string().url(), // where to send user back after OAuth
})
```

**Output Type:**
```typescript
interface OAuthInitResponse {
  authUrl: string; // Google/Microsoft OAuth consent URL
  state: string; // CSRF token
}
```

**Business Logic:**
- Generate OAuth URL using `@google-cloud/oauth2` or `@azure/msal-node`
- Store state token in Redis (5 min TTL): `oauth:state:{state}` → `{tenantId, provider, redirectUrl}`
- Return auth URL for frontend to open in new window

**Permission:** `permissionProcedure('integrations:write')`

**Implementation Notes:**
- OAuth callback handler is separate: `src/app/api/oauth/calendar/callback/route.ts`
- Callback validates state, exchanges code for tokens, stores in `calendarConnections` table
- Frontend polls `getIntegrations` to detect successful connection

---

#### `disconnectGoogle` / `disconnectOutlook`

**Purpose:** Revoke calendar connection.

**Input:** None

**Output:** `{ success: true }`

**Database Queries:**
- UPDATE `calendarConnections` SET `is_active = false`, `disconnected_at = NOW()` WHERE `tenant_id = ? AND provider = ?`

**Business Logic:**
- Optionally revoke OAuth token with provider (Google/Microsoft API call)
- Emit Inngest event: `calendar/disconnected` to clean up synced events

**Permission:** `permissionProcedure('integrations:write')`

---

### 2.3 Billing Tab

#### `getBilling`

**Purpose:** Show current plan, usage, and upgrade CTA.

**Output Type:**
```typescript
interface BillingResponse {
  plan: {
    name: 'STARTER' | 'PROFESSIONAL' | 'BUSINESS' | 'ENTERPRISE';
    price: number;
    billingCycle: 'monthly' | 'annual';
    features: string[];
  };
  usage: {
    users: { current: number; limit: number };
    staff: { current: number; limit: number };
    bookingsThisMonth: { current: number; limit: number };
    storage: { current: number; limit: number }; // bytes
  };
  subscription: {
    status: 'active' | 'trial' | 'past_due' | 'cancelled';
    currentPeriodEnd: Date;
    cancelAtPeriodEnd: boolean;
  };
  paymentMethod?: {
    brand: string; // 'visa', 'mastercard'
    last4: string;
    expiresAt: string; // MM/YY
  };
}
```

**Database Queries:**
- Query `tenants` table: `plan`, `maxUsers`, `maxStaff`, `maxBookingsMonth`, `storageUsedBytes`, `storageLimitBytes`, `tripeCustomerId`, `subscriptionId`
- Count actual usage:
  - Users: `COUNT(*) FROM users WHERE tenant_id = ? AND is_team_member = true`
  - Bookings this month: `COUNT(*) FROM bookings WHERE tenant_id = ? AND created_at >= CURRENT_MONTH`
- If Stripe customer exists, fetch subscription + payment method from Stripe API (cached 5 min)

**Business Logic:**
- Phase 6 introduced Stripe integration — use `stripeProvider.getSubscription(stripeCustomerId)`
- If trial tenant: show trial end date and days remaining
- Upgrade CTA: link to Stripe customer portal (or internal upgrade flow)

**Permission:** `tenantProcedure`

---

### 2.4 Security Tab (API Keys)

#### `listApiKeys`

**Purpose:** Show all API keys for tenant (masked).

**Output Type:**
```typescript
interface ApiKeyListResponse {
  keys: Array<{
    id: string;
    name: string;
    keyPreview: string; // e.g., "sk_live_1234...abcd"
    scopes: string[];
    createdAt: Date;
    lastUsedAt?: Date;
    expiresAt?: Date;
    isRevoked: boolean;
  }>;
}
```

**Database Queries:**
- SELECT from `apiKeys` table (Phase 5 schema at auth.schema.ts line 192):
  ```sql
  SELECT id, name, key_prefix, scopes, created_at, last_used_at, expires_at, revoked_at
  FROM api_keys
  WHERE tenant_id = ? AND revoked_at IS NULL
  ORDER BY created_at DESC
  ```

**Business Logic:**
- Never return `keyHash` in response (security risk)
- Return only `keyPrefix` (first 12 chars: `sk_live_1234`)
- Full key is only shown once at creation time

**Permission:** `tenantProcedure`

---

#### `createApiKey`

**Purpose:** Generate new API key.

**Input Schema:**
```typescript
z.object({
  name: z.string().min(1).max(100),
  scopes: z.array(z.enum(['read', 'write', 'admin'])).optional(),
  expiresAt: z.string().optional(), // ISO 8601 date
})
```

**Output Type:**
```typescript
interface CreateApiKeyResponse {
  id: string;
  name: string;
  key: string; // ONLY TIME THIS IS RETURNED IN FULL
  scopes: string[];
  createdAt: Date;
  expiresAt?: Date;
}
```

**Business Logic:**
1. Generate secure key: `sk_live_${randomBytes(32).toString('hex')}` (total 70 chars)
2. Hash key: `keyHash = sha256(key)`
3. Store in DB:
   ```typescript
   await db.insert(apiKeys).values({
     tenantId: ctx.tenantId,
     name: input.name,
     keyHash: hash,
     keyPrefix: key.slice(0, 12),
     scopes: input.scopes ?? ['read'],
     expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
     createdBy: ctx.userId,
   })
   ```
4. Return full key to frontend (display once in dialog)
5. Emit audit log: `api_key.created`

**Permission:** `permissionProcedure('developer:write')`

**Security Notes:**
- Use `crypto.randomBytes(32)` for key generation (not Math.random)
- Hash with SHA-256 before storage (prevents leakage if DB compromised)
- Prefix `sk_live_` distinguishes from test keys (future: `sk_test_` for sandbox)

---

#### `revokeApiKey`

**Purpose:** Permanently disable an API key.

**Input Schema:**
```typescript
z.object({
  id: z.string(),
})
```

**Output:** `{ success: true }`

**Database Queries:**
- UPDATE `api_keys` SET `revoked_at = NOW()` WHERE `id = ? AND tenant_id = ?`

**Business Logic:**
- Soft delete (set revoked timestamp, don't physically delete)
- Emit audit log: `api_key.revoked`
- Invalidate Redis cache if API key middleware caches keys

**Permission:** `permissionProcedure('developer:write')`

---

### 2.5 Danger Zone

#### `exportData`

**Purpose:** Generate GDPR-compliant data export (all tenant data as JSON).

**Input:** None

**Output Type:**
```typescript
interface ExportDataResponse {
  downloadUrl: string; // signed S3 URL or data URI
  expiresAt: Date;
  sizeBytes: number;
}
```

**Business Logic:**
1. Query all tenant data:
   - Bookings + related entities (customers, payments, reviews, forms, workflows, etc.)
   - Use Drizzle batch queries or `db.transaction` to ensure consistency
2. Serialize to JSON:
   ```typescript
   const export = {
     tenant: { id, name, createdAt, ... },
     bookings: [...],
     customers: [...],
     payments: [...],
     // ... all tables
   }
   ```
3. Compress: `gzip(JSON.stringify(export))`
4. Store temporarily:
   - Option A: Upload to S3, return signed URL (7-day expiry)
   - Option B: Store in Redis (24h TTL), return data URI
5. Emit audit log: `tenant.data_exported`

**Permission:** `permissionProcedure('tenant:admin')` — highest permission tier

**Implementation Notes:**
- Large tenants (>10k bookings) may exceed Lambda timeout (10 min)
- Solution: Trigger Inngest function for async export, return job ID, poll for completion
- Frontend shows "Generating export..." spinner, then download link when ready

---

#### `deleteAllData`

**Purpose:** Soft-delete all tenant data (GDPR "right to be forgotten").

**Input Schema:**
```typescript
z.object({
  confirmation: z.literal('DELETE'), // force user to type "DELETE"
})
```

**Output:** `{ success: true }`

**Database Queries:**
- Option 1: SET `tenants.deleted_at = NOW()` (soft delete entire tenant)
- Option 2: Cascade soft-delete all related rows (UPDATE each table SET deleted_at)

**Business Logic:**
1. Validate confirmation string matches exactly
2. Verify user has `tenant:admin` permission
3. Start transaction:
   ```sql
   BEGIN;
   UPDATE tenants SET deleted_at = NOW(), status = 'DELETED' WHERE id = ?;
   -- Optionally cascade to all child tables
   COMMIT;
   ```
4. Emit Inngest event: `tenant/deleted` — triggers cleanup (cancel subscriptions, revoke API keys, delete S3 files)
5. Emit audit log: `tenant.deleted`
6. Invalidate all Redis cache keys for tenant

**Permission:** `permissionProcedure('tenant:admin')`

**Safety Rails:**
- Require 2FA confirmation (if tenant has 2FA enabled)
- Grace period: mark as `DELETED` but keep data for 30 days before physical deletion
- Email platform admins when any tenant is deleted (fraud detection)

---

### Settings Router — Full Code

```typescript
// src/modules/settings/settings.router.ts
import { z } from 'zod'
import { router, tenantProcedure, permissionProcedure } from '@/shared/trpc'
import * as settingsService from './settings.service'
import {
  updateGeneralSchema,
  updateNotificationsSchema,
  createApiKeySchema,
} from './settings.schemas'

export const settingsRouter = router({
  // General
  getGeneral: tenantProcedure.query(({ ctx }) => settingsService.getGeneral(ctx)),
  updateGeneral: permissionProcedure('tenant:write')
    .input(updateGeneralSchema)
    .mutation(({ ctx, input }) => settingsService.updateGeneral(ctx, input)),

  // Notifications
  getNotifications: tenantProcedure.query(({ ctx }) => settingsService.getNotifications(ctx)),
  updateNotifications: permissionProcedure('tenant:write')
    .input(updateNotificationsSchema)
    .mutation(({ ctx, input }) => settingsService.updateNotifications(ctx, input)),

  // Integrations
  getIntegrations: tenantProcedure.query(({ ctx }) => settingsService.getIntegrations(ctx)),
  connectGoogle: permissionProcedure('integrations:write')
    .input(z.object({ redirectUrl: z.string().url() }))
    .mutation(({ ctx, input }) => settingsService.connectGoogle(ctx, input)),
  disconnectGoogle: permissionProcedure('integrations:write')
    .mutation(({ ctx }) => settingsService.disconnectGoogle(ctx, 'GOOGLE')),
  connectOutlook: permissionProcedure('integrations:write')
    .input(z.object({ redirectUrl: z.string().url() }))
    .mutation(({ ctx, input }) => settingsService.connectOutlook(ctx, input)),
  disconnectOutlook: permissionProcedure('integrations:write')
    .mutation(({ ctx }) => settingsService.disconnectIntegration(ctx, 'OUTLOOK')),

  // Billing
  getBilling: tenantProcedure.query(({ ctx }) => settingsService.getBilling(ctx)),

  // Modules (delegate to tenant service)
  getModules: tenantProcedure.query(({ ctx }) => tenantService.listModules(ctx)),
  toggleModule: permissionProcedure('tenant:write')
    .input(z.object({ moduleSlug: z.string(), enabled: z.boolean() }))
    .mutation(({ ctx, input }) => tenantService.toggleModule(ctx, input.moduleSlug, input.enabled)),

  // API Keys
  listApiKeys: tenantProcedure.query(({ ctx }) => settingsService.listApiKeys(ctx)),
  createApiKey: permissionProcedure('developer:write')
    .input(createApiKeySchema)
    .mutation(({ ctx, input }) => settingsService.createApiKey(ctx, input)),
  revokeApiKey: permissionProcedure('developer:write')
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) => settingsService.revokeApiKey(ctx, input.id)),

  // Danger Zone
  exportData: permissionProcedure('tenant:admin')
    .mutation(({ ctx }) => settingsService.exportData(ctx)),
  deleteAllData: permissionProcedure('tenant:admin')
    .input(z.object({ confirmation: z.literal('DELETE') }))
    .mutation(({ ctx, input }) => settingsService.deleteAllData(ctx, input)),
})
```

**Test Coverage:** 12 procedures × 3 tests = 36 tests minimum

---

## 3. Audit Router — Full Specification

**File:** Create new router at `src/modules/audit/audit.router.ts`

### 3.1 `list` — Paginated Audit Entries with Filters

**Purpose:** Display audit log timeline with server-side filtering.

**Input Schema:**
```typescript
z.object({
  resourceType: z.enum(['booking', 'customer', 'staff', 'service', 'workflow', 'settings']).optional(),
  actorId: z.string().optional(), // userId filter
  action: z.enum(['created', 'updated', 'deleted']).optional(),
  from: z.string().optional(), // ISO 8601 date
  to: z.string().optional(),
  limit: z.number().min(1).max(100).default(20),
  cursor: z.string().optional(), // for pagination
})
```

**Output Type:**
```typescript
interface AuditLogListResponse {
  entries: Array<{
    id: string;
    timestamp: Date;
    actor: {
      id: string;
      name: string;
      email: string;
    };
    action: string;
    resourceType: string;
    resourceId: string;
    resourceName: string;
    changes?: Array<{
      field: string;
      before: unknown;
      after: unknown;
    }>;
    metadata?: Record<string, unknown>;
  }>;
  nextCursor?: string;
  hasMore: boolean;
}
```

**Database Queries:**
- Query `auditLogs` table (Phase 5 schema at shared.schema.ts line 104):
  ```sql
  SELECT
    al.id,
    al.created_at as timestamp,
    al.action,
    al.entity_type as resource_type,
    al.entity_id as resource_id,
    al.old_values,
    al.new_values,
    al.metadata,
    u.id as actor_id,
    u.name as actor_name,
    u.email as actor_email
  FROM audit_logs al
  LEFT JOIN users u ON al.user_id = u.id
  WHERE al.tenant_id = ?
    AND (al.entity_type = ? OR ? IS NULL)
    AND (al.user_id = ? OR ? IS NULL)
    AND (al.action = ? OR ? IS NULL)
    AND (al.created_at >= ? OR ? IS NULL)
    AND (al.created_at <= ? OR ? IS NULL)
  ORDER BY al.created_at DESC
  LIMIT ? + 1
  OFFSET ?
  ```

**Business Logic:**
- Pagination: fetch `limit + 1` rows, if count > limit then `hasMore = true` and return cursor
- Cursor = base64 encode of `createdAt + id` (for stable ordering)
- Compute `changes` array by diffing `oldValues` vs `newValues` JSONB columns
- Extract `resourceName` from `newValues.name` or fetch from related table

**Permission:** `permissionProcedure('audit:read')`

**Implementation Notes:**
- Index exists: `audit_logs_tenantId_createdAt_idx` (fast filtering)
- JSONB diff library: `json-diff` or manual key comparison
- Large tenants (millions of audit logs): consider time-based partitioning (future optimization)

---

### 3.2 `exportCsv` — CSV Export

**Purpose:** Download audit log as CSV file.

**Input Schema:**
```typescript
z.object({
  resourceType: z.string().optional(),
  actorId: z.string().optional(),
  action: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
})
```

**Output Type:**
```typescript
interface ExportCsvResponse {
  csv: string; // CSV content as string
  filename: string; // e.g., "audit-log-2026-02-20.csv"
}
```

**Business Logic:**
1. Query audit logs with same filters as `list` (no pagination — return all matching)
2. Limit to 10,000 rows (prevent memory issues)
3. Convert to CSV:
   ```csv
   Timestamp,Actor,Action,Resource Type,Resource ID,Resource Name,Changes
   2026-02-20T10:30:00Z,john@example.com,updated,booking,abc123,Booking #1234,"status: PENDING → CONFIRMED"
   ```
4. Use CSV library: `papaparse` or `csv-stringify`
5. Return as string (frontend triggers download via Blob + `a.download`)

**Permission:** `permissionProcedure('audit:read')`

**Implementation Notes:**
- Flatten `changes` array to single string: `changes.map(c => `${c.field}: ${c.before} → ${c.after}`).join('; ')`
- CSV escaping: quote fields containing commas/newlines

---

### Audit Router — Full Code

```typescript
// src/modules/audit/audit.router.ts
import { z } from 'zod'
import { router, permissionProcedure } from '@/shared/trpc'
import * as auditService from './audit.service'
import { listAuditLogsSchema, exportCsvSchema } from './audit.schemas'

export const auditRouter = router({
  list: permissionProcedure('audit:read')
    .input(listAuditLogsSchema)
    .query(({ ctx, input }) => auditService.listAuditLogs(ctx, input)),

  exportCsv: permissionProcedure('audit:read')
    .input(exportCsvSchema)
    .mutation(({ ctx, input }) => auditService.exportCsv(ctx, input)),
})
```

**Test Coverage:** 2 procedures × 5 tests = 10 tests
- Test filtering by each dimension (resourceType, actorId, action, date range)
- Test pagination (cursor-based)
- Test CSV export formatting
- Test empty results
- Test permission enforcement

---

## 4. Workflow Router — Verification

**File:** `src/modules/workflow/workflow.router.ts` (already exists from Phase 5)

### Current Procedures (Phase 5)
```typescript
list(filters)           // ✓ Lists workflows with pagination
getById(id)             // ✓ Fetch single workflow
create(input)           // ✓ Create new workflow
update(id, input)       // ✓ Update existing workflow
delete(id)              // ✓ Soft-delete workflow
getExecutions(filters)  // ✓ Execution history with pagination
validateGraph(nodes, edges) // ✓ Graph validation
```

### Phase 7D Requirements

Frontend needs:
1. **Execution history table** — ✓ Covered by `getExecutions` procedure
2. **Per-step status** — Verify that `workflowExecutions.actionResults` JSONB contains step-level data

### Verification Steps

1. **Check execution history query performance:**
   - `getExecutions` must return results in <500ms for tenants with 10k+ executions
   - Verify index exists: `workflow_executions_workflowId_createdAt_idx`
   - If missing, add to schema:
     ```typescript
     index("workflow_executions_workflowId_createdAt_idx").using("btree",
       table.workflowId.asc().nullsLast(),
       table.createdAt.desc().nullsLast()
     )
     ```

2. **Verify actionResults JSONB structure:**
   - Each step should have: `{ stepId, status: 'success' | 'error', output: {...}, duration: number }`
   - Frontend expects array of step results to render execution timeline
   - If missing, update `workflow.engine.ts` to store structured results

3. **Add optional enhancement: `getExecutionDetail(executionId)`**
   - Frontend may need full execution trace for debugging
   - Input: `{ executionId: string }`
   - Output: Full execution record with expanded step details
   - Permission: `tenantProcedure`

### Recommended Addition

```typescript
// Add to workflow.router.ts
getExecutionDetail: tenantProcedure
  .input(z.object({ executionId: z.string() }))
  .query(({ ctx, input }) => workflowService.getExecutionDetail(ctx, input.executionId))
```

**Implementation:**
```typescript
// workflow.service.ts
async getExecutionDetail(ctx: Context, executionId: string) {
  const execution = await workflowRepository.getExecutionById(ctx.tenantId, executionId)
  if (!execution) throw new NotFoundError('Execution not found')

  // Enrich with workflow metadata
  const workflow = await workflowRepository.findById(ctx.tenantId, execution.workflowId)

  return {
    ...execution,
    workflow: { id: workflow.id, name: workflow.name },
    steps: execution.actionResults, // JSONB array
    duration: execution.finishedAt
      ? execution.finishedAt.getTime() - execution.startedAt.getTime()
      : null,
  }
}
```

**Test Coverage:** 1 new procedure × 3 tests = 3 tests

---

## 5. Database Schema Requirements

### Phase 7D Schema Status: ✅ COMPLETE

All required tables exist from Phase 5/6:

| Table | Usage in Phase 7D | Status |
|-------|-------------------|--------|
| `auditLogs` | Audit log timeline | ✓ Complete (12 columns, 4 indexes) |
| `apiKeys` | API key management | ✓ Complete (12 columns, keyHash, scopes) |
| `organizationSettings` | General settings | ✓ Complete (27 typed columns) |
| `metricSnapshots` | Analytics aggregation | ✓ Complete (Phase 6) |
| `workflowExecutions` | Workflow history | ✓ Complete (actionResults JSONB) |
| `calendarConnections` | Integrations | ✓ Complete (Phase 4) |
| `tenants` | Billing info | ✓ Complete (plan, limits, Stripe IDs) |
| `bookings` | Analytics data source | ✓ Complete |
| `payments` | Revenue analytics | ✓ Complete |
| `reviews` | Rating analytics | ✓ Complete |
| `customers` | Churn risk analysis | ✓ Complete |

### Performance Indexes — Verification Checklist

Run these queries to verify indexes exist:

```sql
-- Audit logs (critical for /admin/audit performance)
SELECT indexname FROM pg_indexes
WHERE tablename = 'audit_logs'
AND indexname IN (
  'audit_logs_tenantId_createdAt_idx',
  'audit_logs_tenantId_entityType_entityId_idx',
  'audit_logs_userId_idx'
);

-- Analytics (critical for dashboard load time)
SELECT indexname FROM pg_indexes
WHERE tablename = 'metric_snapshots'
AND indexname = 'idx_metric_snapshots_lookup';

-- Workflow executions
SELECT indexname FROM pg_indexes
WHERE tablename = 'workflow_executions'
AND indexname LIKE 'workflow_executions_%';
```

**If any indexes missing:** Add to migration file or create manually:

```sql
-- Example: Add workflow execution index if missing
CREATE INDEX CONCURRENTLY workflow_executions_workflowId_createdAt_idx
ON workflow_executions (workflow_id, created_at DESC)
WHERE tenant_id IS NOT NULL;
```

### No Schema Changes Required

Phase 7D is **read-heavy** — no new tables, no new columns. All data structures already exist.

---

## 6. Implementation Phases

### Phase 1: Basic Settings (1 day)

**Files to create:**
- `src/modules/settings/settings.types.ts` (interfaces)
- `src/modules/settings/settings.schemas.ts` (Zod schemas)
- `src/modules/settings/settings.repository.ts` (DB queries)
- `src/modules/settings/settings.service.ts` (business logic)
- `src/modules/settings/settings.router.ts` (tRPC procedures)
- `src/modules/settings/index.ts` (barrel export)

**Procedures to implement:**
- `getGeneral` (delegate to tenant service)
- `updateGeneral` (delegate to tenant service)
- `getNotifications` (new)
- `updateNotifications` (new)
- `getModules` (delegate to tenant service)
- `toggleModule` (delegate to tenant service)

**Tests:** 6 procedures × 3 tests = 18 tests

**Deliverable:** `/admin/settings` General, Notifications, and Modules tabs fully functional

---

### Phase 2: Audit Logging (0.5 days)

**Files to create:**
- `src/modules/audit/audit.types.ts`
- `src/modules/audit/audit.schemas.ts`
- `src/modules/audit/audit.repository.ts`
- `src/modules/audit/audit.service.ts`
- `src/modules/audit/audit.router.ts`
- `src/modules/audit/index.ts`

**Procedures to implement:**
- `list` (with filters + pagination)
- `exportCsv`

**Tests:** 2 procedures × 5 tests = 10 tests

**Deliverable:** `/admin/audit` page fully functional with filtering and export

---

### Phase 3: Workflow Verification (0.5 days)

**Tasks:**
1. Performance test `workflow.getExecutions` with 10k+ rows
2. Verify `actionResults` JSONB structure matches frontend expectations
3. Add index if missing
4. Implement optional `getExecutionDetail` procedure
5. Write 3 tests

**Deliverable:** `/admin/workflows` execution history tab loads in <500ms

---

### Phase 4: Analytics (2 days)

**Files to modify:**
- `src/modules/analytics/analytics.service.ts` (add 6 new methods)
- `src/modules/analytics/analytics.repository.ts` (add aggregation queries)
- `src/modules/analytics/analytics.router.ts` (add 6 procedures)

**Procedures to implement:**
- `getKPIs` (4 KPI cards with comparisons)
- `getRevenueChart` (time series)
- `getBookingsByStatus` (donut chart)
- `getTopServices` (horizontal bar)
- `getStaffUtilization` (heatmap — most complex)
- `getChurnRisk` (RFM model)

**Tests:** 6 procedures × 3 tests = 18 tests

**Deliverable:** `/admin/analytics` fully functional with all charts

---

### Phase 5: Settings Advanced Features (1 day)

**Procedures to implement:**
- `getIntegrations`
- `connectGoogle` / `disconnectGoogle`
- `connectOutlook` / `disconnectOutlook`
- `getBilling`
- `listApiKeys`
- `createApiKey`
- `revokeApiKey`
- `exportData`
- `deleteAllData`

**Tests:** 9 procedures × 3 tests = 27 tests

**Deliverable:** `/admin/settings` fully complete (all 7 tabs functional)

---

## 7. Testing Requirements

### Unit Tests Per Procedure (Minimum 3 Each)

**Test Pattern (using Vitest + vi.mock):**

```typescript
// Example: analytics.service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as analyticsService from './analytics.service'
import * as analyticsRepository from './analytics.repository'

vi.mock('./analytics.repository')

describe('analyticsService.getKPIs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return KPIs with percent changes', async () => {
    vi.mocked(analyticsRepository.getBookingCount).mockResolvedValueOnce(100) // current
    vi.mocked(analyticsRepository.getBookingCount).mockResolvedValueOnce(80)  // previous

    const result = await analyticsService.getKPIs({ tenantId: 'test' }, { period: 'WEEK' })

    expect(result.bookings.current).toBe(100)
    expect(result.bookings.previous).toBe(80)
    expect(result.bookings.percentChange).toBe(25) // (100-80)/80 * 100
  })

  it('should handle zero previous value', async () => {
    vi.mocked(analyticsRepository.getBookingCount).mockResolvedValueOnce(10)
    vi.mocked(analyticsRepository.getBookingCount).mockResolvedValueOnce(0)

    const result = await analyticsService.getKPIs({ tenantId: 'test' }, { period: 'WEEK' })

    expect(result.bookings.percentChange).toBe(null) // or 100, depending on spec
  })

  it('should enforce tenant isolation', async () => {
    await analyticsService.getKPIs({ tenantId: 'tenant-a' }, { period: 'WEEK' })

    expect(analyticsRepository.getBookingCount).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: 'tenant-a' })
    )
  })
})
```

### Integration Tests for Routers

**Test tRPC procedures end-to-end:**

```typescript
// Example: settings.router.test.ts
import { describe, it, expect } from 'vitest'
import { appRouter } from '@/server/root'
import { createTestContext } from '@/test/helpers'

describe('settingsRouter.createApiKey', () => {
  it('should generate and return API key', async () => {
    const ctx = createTestContext({ userId: 'user-1', tenantId: 'tenant-1' })
    const caller = appRouter.createCaller(ctx)

    const result = await caller.settings.createApiKey({
      name: 'Test Key',
      scopes: ['read', 'write'],
    })

    expect(result.key).toMatch(/^sk_live_[a-f0-9]{64}$/)
    expect(result.name).toBe('Test Key')
  })

  it('should require developer:write permission', async () => {
    const ctx = createTestContext({ userId: 'user-1', tenantId: 'tenant-1', permissions: [] })
    const caller = appRouter.createCaller(ctx)

    await expect(
      caller.settings.createApiKey({ name: 'Test Key' })
    ).rejects.toThrow('FORBIDDEN')
  })
})
```

### Permission Testing

**Verify RBAC enforcement for every protected procedure:**

```typescript
describe('Permission enforcement', () => {
  const testCases = [
    { procedure: 'analytics.getStaffUtilization', permission: 'analytics:read' },
    { procedure: 'settings.createApiKey', permission: 'developer:write' },
    { procedure: 'settings.deleteAllData', permission: 'tenant:admin' },
  ]

  testCases.forEach(({ procedure, permission }) => {
    it(`${procedure} should require ${permission}`, async () => {
      const ctx = createTestContext({ permissions: [] })
      const caller = appRouter.createCaller(ctx)

      await expect(
        caller[procedure]({ /* inputs */ })
      ).rejects.toThrow('FORBIDDEN')
    })
  })
})
```

### Performance Testing for Analytics

**Test queries with realistic data volumes:**

```typescript
describe('Analytics performance', () => {
  beforeAll(async () => {
    // Seed 10,000 bookings
    await seedBookings(10000)
  })

  it('getKPIs should return in <500ms', async () => {
    const start = Date.now()
    await analyticsService.getKPIs(ctx, { period: 'MONTH' })
    const duration = Date.now() - start

    expect(duration).toBeLessThan(500)
  })

  it('getStaffUtilization should return in <1s', async () => {
    const start = Date.now()
    await analyticsService.getStaffUtilization(ctx, { from: '2026-01-01', to: '2026-02-20' })
    const duration = Date.now() - start

    expect(duration).toBeLessThan(1000)
  })
})
```

### Test Coverage Target

**Minimum 85% line coverage** for new code:

```bash
vitest run --coverage
# Lines: 85% (340/400)
# Functions: 90% (45/50)
# Branches: 80% (32/40)
```

---

## 8. Root Router Integration

**File:** `src/server/root.ts`

### Current State (Phase 5-6)
```typescript
export const appRouter = router({
  booking,
  scheduling,
  notification,
  calendarSync,
  workflow,
  team,
  customer,
  forms,
  review,
  tenant,
  platform,
  analytics, // ← Partial (Phase 6)
  developer, // ← Partial (Phase 6)
  search,
  payment,
})
```

### Required Changes

**Add new routers:**

```typescript
import { settingsRouter } from '@/modules/settings'
import { auditRouter } from '@/modules/audit'

export const appRouter = router({
  // ... existing routers
  settings: settingsRouter,  // NEW
  audit: auditRouter,        // NEW
})

export type AppRouter = typeof appRouter
```

**Export updates needed:**

```typescript
// src/modules/settings/index.ts
export { settingsRouter } from './settings.router'
export type { SettingsRouter } from './settings.router'

// src/modules/audit/index.ts
export { auditRouter } from './audit.router'
export type { AuditRouter } from './audit.router'
```

**tRPC client usage (frontend):**

```typescript
// Frontend: src/lib/trpc.ts
const kpis = api.analytics.getKPIs.useQuery({ period: 'WEEK' })
const apiKeys = api.settings.listApiKeys.useQuery()
const auditLog = api.audit.list.useQuery({ limit: 20 })
```

---

## 9. Error Handling Patterns

### Repository Layer

**Always throw domain errors, never TRPCError:**

```typescript
// ❌ WRONG
import { TRPCError } from '@trpc/server'
throw new TRPCError({ code: 'NOT_FOUND', message: 'API key not found' })

// ✅ CORRECT
import { NotFoundError } from '@/shared/errors'
throw new NotFoundError('API key', keyId)
```

### Service Layer

**Domain error types from Phase 1:**

```typescript
import {
  NotFoundError,      // Maps to tRPC NOT_FOUND
  ForbiddenError,     // Maps to tRPC FORBIDDEN
  BadRequestError,    // Maps to tRPC BAD_REQUEST
  ConflictError,      // Maps to tRPC CONFLICT
} from '@/shared/errors'
```

**Example:**

```typescript
async createApiKey(ctx: Context, input: CreateApiKeyInput) {
  // Validate tenant plan allows API keys
  const tenant = await tenantRepository.getById(ctx.tenantId)
  if (tenant.plan === 'STARTER') {
    throw new ForbiddenError('API keys require Professional plan or higher')
  }

  // Check rate limit (max 10 keys per tenant)
  const existingCount = await apiKeyRepository.countByTenant(ctx.tenantId)
  if (existingCount >= 10) {
    throw new ConflictError('Maximum 10 API keys per tenant')
  }

  // ... proceed with creation
}
```

### Router Layer

**Thin layer — no try/catch needed (tRPC error formatter handles it):**

```typescript
// ❌ WRONG — don't catch errors in router
createApiKey: permissionProcedure('developer:write')
  .input(createApiKeySchema)
  .mutation(async ({ ctx, input }) => {
    try {
      return await settingsService.createApiKey(ctx, input)
    } catch (error) {
      // Don't do this — tRPC error formatter already handles it
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
    }
  })

// ✅ CORRECT — let errors bubble up
createApiKey: permissionProcedure('developer:write')
  .input(createApiKeySchema)
  .mutation(({ ctx, input }) => settingsService.createApiKey(ctx, input))
```

---

## 10. Logging Strategy

### Pattern from Phase 1-5

**Pino v8 argument order: object first, message second:**

```typescript
import { logger } from '@/shared/logger'
const log = logger.child({ module: 'settings.service' })

// ❌ WRONG
log.info('API key created', { keyId, tenantId })

// ✅ CORRECT
log.info({ keyId, tenantId, userId: ctx.userId }, 'API key created')
```

### Log Levels

| Level | Use Case | Example |
|-------|----------|---------|
| `debug` | Development only | `log.debug({ query }, 'Executing SQL query')` |
| `info` | Business events | `log.info({ tenantId, period }, 'Generated analytics KPIs')` |
| `warn` | Recoverable errors | `log.warn({ tenantId }, 'Metrics stale, using cached data')` |
| `error` | Exceptions | `log.error({ err, tenantId }, 'Failed to export data')` |

### Sentry Integration

**INTERNAL_SERVER_ERROR auto-captured:**

```typescript
// No manual Sentry.captureException needed
// tRPC error formatter in src/shared/trpc.ts handles it
throw new BadRequestError('Invalid date range')
// → Automatically logged to Sentry if it becomes INTERNAL_SERVER_ERROR
```

**Manual capture for critical operations:**

```typescript
import * as Sentry from '@sentry/nextjs'

async deleteAllData(ctx: Context) {
  Sentry.addBreadcrumb({
    category: 'tenant',
    message: 'Initiating tenant data deletion',
    level: 'warning',
    data: { tenantId: ctx.tenantId, userId: ctx.userId },
  })

  // ... proceed with deletion
}
```

---

## 11. Caching Strategy

### Redis Cache Patterns

**Key naming convention:**

```
{module}:{entity}:{id}:{optional-suffix}

Examples:
- analytics:kpis:tenant-123:WEEK
- settings:integrations:tenant-123
- settings:api-keys:tenant-123
- audit:export:job-456
```

**TTL by data type:**

| Data Type | TTL | Rationale |
|-----------|-----|-----------|
| KPIs | 5 min | Balance freshness vs. DB load |
| Settings | 1 hour | Rarely change, read-heavy |
| API keys list | 5 min | Security: invalidate quickly after revocation |
| Integration status | 10 min | OAuth tokens change infrequently |
| Churn risk | 1 hour | Expensive computation, acceptable lag |

**Example:**

```typescript
async getKPIs(ctx: Context, input: { period: string }) {
  const cacheKey = `analytics:kpis:${ctx.tenantId}:${input.period}`

  // Try cache first
  const cached = await redis.get(cacheKey)
  if (cached) {
    log.debug({ tenantId: ctx.tenantId }, 'KPIs cache hit')
    return JSON.parse(cached)
  }

  // Compute from DB
  const kpis = await computeKPIs(ctx.tenantId, input.period)

  // Store in cache (5 min TTL)
  await redis.setex(cacheKey, 300, JSON.stringify(kpis))

  return kpis
}
```

### Cache Invalidation

**Invalidate on write operations:**

```typescript
async updateNotifications(ctx: Context, input: UpdateNotificationsInput) {
  await tenantRepository.updateSettings(ctx.tenantId, input)

  // Invalidate settings cache
  await redis.del(`settings:notifications:${ctx.tenantId}`)
  await redis.del(`tenant:settings:${ctx.tenantId}`) // also invalidate general settings

  log.info({ tenantId: ctx.tenantId }, 'Notification settings updated, cache invalidated')
}
```

---

## 12. Security Considerations

### API Key Generation

**Cryptographically secure random:**

```typescript
import crypto from 'crypto'

function generateApiKey(): string {
  const prefix = 'sk_live_'
  const randomBytes = crypto.randomBytes(32) // 256 bits
  const key = prefix + randomBytes.toString('hex') // 70 chars total
  return key
}

function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex')
}
```

**Storage:**
- Store only `keyHash` in database (SHA-256 hash)
- Store `keyPrefix` for display (first 12 chars: `sk_live_1234`)
- Return full key **only once** at creation time
- Never log full keys

### Data Export Security

**Prevent data leaks:**

```typescript
async exportData(ctx: Context): Promise<ExportDataResponse> {
  // Verify user has admin permission
  if (!ctx.permissions.includes('tenant:admin')) {
    throw new ForbiddenError('Admin permission required for data export')
  }

  // Rate limit: max 1 export per hour per tenant
  const rateLimitKey = `export:ratelimit:${ctx.tenantId}`
  const existing = await redis.get(rateLimitKey)
  if (existing) {
    throw new BadRequestError('Export in progress or rate limit exceeded')
  }
  await redis.setex(rateLimitKey, 3600, '1')

  // Generate export asynchronously (Inngest)
  const jobId = await inngest.send({
    name: 'tenant/export.requested',
    data: { tenantId: ctx.tenantId, requestedBy: ctx.userId },
  })

  return { jobId, status: 'pending' }
}
```

### Audit Logging for Sensitive Operations

**Log all admin actions:**

```typescript
import { auditLog } from '@/shared/audit'

async deleteAllData(ctx: Context, input: { confirmation: string }) {
  if (input.confirmation !== 'DELETE') {
    throw new BadRequestError('Confirmation does not match')
  }

  // Log BEFORE deletion (in case DB transaction fails)
  await auditLog.create({
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    action: 'deleted',
    entityType: 'tenant',
    entityId: ctx.tenantId,
    severity: 'CRITICAL',
    metadata: { confirmation: input.confirmation },
  })

  // ... proceed with deletion
}
```

---

## 13. Performance Optimization

### Analytics Query Optimization

**Use metric_snapshots instead of raw aggregation:**

```typescript
async getRevenueChart(ctx: Context, input: { from: string; to: string; granularity: string }) {
  // Priority 1: Pre-aggregated snapshots (fast)
  const snapshots = await analyticsRepository.getTimeSeriesMetric({
    tenantId: ctx.tenantId,
    metricKey: 'revenue.gross',
    periodType: input.granularity,
    from: new Date(input.from),
    to: new Date(input.to),
  })

  if (snapshots.length > 0) {
    return { data: snapshots, source: 'snapshots' }
  }

  // Priority 2: Redis real-time counters (medium)
  const redisData = await getRealTimeRevenueFromRedis(ctx.tenantId, input)
  if (redisData.length > 0) {
    return { data: redisData, source: 'redis' }
  }

  // Priority 3: Raw DB aggregation (slow, last resort)
  log.warn({ tenantId: ctx.tenantId }, 'Falling back to raw revenue aggregation')
  const rawData = await aggregateRevenueFromPayments(ctx.tenantId, input)
  return { data: rawData, source: 'raw' }
}
```

### Pagination Best Practices

**Cursor-based for large datasets:**

```typescript
// ❌ WRONG — offset pagination (slow for large offsets)
SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 20 OFFSET 10000

// ✅ CORRECT — cursor-based (always fast)
SELECT * FROM audit_logs
WHERE created_at < ? AND id < ?
ORDER BY created_at DESC, id DESC
LIMIT 21
```

**Implementation:**

```typescript
async listAuditLogs(ctx: Context, input: { cursor?: string; limit: number }) {
  let whereClause = eq(auditLogs.tenantId, ctx.tenantId)

  if (input.cursor) {
    const { createdAt, id } = decodeCursor(input.cursor)
    whereClause = and(
      whereClause,
      or(
        lt(auditLogs.createdAt, createdAt),
        and(eq(auditLogs.createdAt, createdAt), lt(auditLogs.id, id))
      )
    )
  }

  const rows = await db
    .select()
    .from(auditLogs)
    .where(whereClause)
    .orderBy(desc(auditLogs.createdAt), desc(auditLogs.id))
    .limit(input.limit + 1)

  const hasMore = rows.length > input.limit
  const entries = hasMore ? rows.slice(0, -1) : rows
  const nextCursor = hasMore ? encodeCursor(rows[rows.length - 2]) : undefined

  return { entries, nextCursor, hasMore }
}

function encodeCursor(entry: AuditLog): string {
  return Buffer.from(JSON.stringify({
    createdAt: entry.createdAt.toISOString(),
    id: entry.id,
  })).toString('base64')
}
```

### Connection Pooling

**Verify Drizzle pool size:**

```typescript
// src/shared/db/index.ts
import postgres from 'postgres'

const sql = postgres(process.env.DATABASE_URL!, {
  max: 20,              // Max connections (adjust based on Vercel/Lambda concurrency)
  idle_timeout: 20,     // Close idle connections after 20s
  connect_timeout: 10,  // Fail fast on connection issues
})
```

---

## 14. Deployment Checklist

### Pre-Deployment Verification

- [ ] All tests pass: `pnpm test`
- [ ] No TypeScript errors: `pnpm tsc --noEmit`
- [ ] Build succeeds: `pnpm build`
- [ ] No Drizzle schema drift: `pnpm drizzle-kit check`
- [ ] Database indexes verified (see section 5)
- [ ] Redis keys follow naming convention
- [ ] Environment variables documented in `.env.example`

### Environment Variables

**Required for Phase 7D:**

```bash
# Analytics
REDIS_URL=redis://...                    # For KPI caching

# Settings - Integrations
GOOGLE_OAUTH_CLIENT_ID=...
GOOGLE_OAUTH_CLIENT_SECRET=...
MICROSOFT_OAUTH_CLIENT_ID=...
MICROSOFT_OAUTH_CLIENT_SECRET=...

# Settings - API Keys
API_KEY_ENCRYPTION_KEY=...               # For key hashing (optional, use SHA-256)

# Settings - Data Export
AWS_S3_BUCKET=...                        # For export file storage (optional)
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
```

### Post-Deployment Monitoring

**Sentry alerts for:**
- API key creation failures
- Data export timeouts
- Analytics query slow warnings (>1s)
- Audit log pagination errors

**Grafana dashboards (if using OTel):**
- Analytics endpoint latency (p50, p95, p99)
- Redis cache hit rate for KPIs
- Audit log query volume

---

## 15. File Checklist

### New Files to Create (15 total)

**Settings Module (6 files):**
- `src/modules/settings/settings.types.ts` (~100 LOC)
- `src/modules/settings/settings.schemas.ts` (~150 LOC)
- `src/modules/settings/settings.repository.ts` (~400 LOC)
- `src/modules/settings/settings.service.ts` (~800 LOC)
- `src/modules/settings/settings.router.ts` (~150 LOC)
- `src/modules/settings/index.ts` (~10 LOC)

**Audit Module (6 files):**
- `src/modules/audit/audit.types.ts` (~50 LOC)
- `src/modules/audit/audit.schemas.ts` (~80 LOC)
- `src/modules/audit/audit.repository.ts` (~200 LOC)
- `src/modules/audit/audit.service.ts` (~300 LOC)
- `src/modules/audit/audit.router.ts` (~50 LOC)
- `src/modules/audit/index.ts` (~10 LOC)

**Test Files (3 files):**
- `src/modules/settings/__tests__/settings.service.test.ts` (~600 LOC)
- `src/modules/audit/__tests__/audit.service.test.ts` (~300 LOC)
- `src/modules/analytics/__tests__/analytics-kpis.test.ts` (~400 LOC)

### Files to Modify (4 files)

**Analytics Module:**
- `src/modules/analytics/analytics.service.ts` (+500 LOC)
- `src/modules/analytics/analytics.repository.ts` (+300 LOC)
- `src/modules/analytics/analytics.router.ts` (+100 LOC)

**Root Router:**
- `src/server/root.ts` (+3 LOC — add settings + audit routers)

### Total LOC Estimate

| Module | LOC |
|--------|-----|
| Settings | 1,610 |
| Audit | 690 |
| Analytics (additions) | 900 |
| Tests | 1,300 |
| **Total** | **4,500** |

(Revised from 3,200 — tests add significant LOC)

---

## 16. Success Criteria

### Phase 7D is complete when:

1. **All 15 procedures implemented** and tested (85%+ coverage)
2. **All 4 admin pages functional:**
   - `/admin/analytics` — All 6 charts load in <1s
   - `/admin/workflows` — Execution history loads in <500ms
   - `/admin/settings` — All 7 tabs functional (no stubs)
   - `/admin/audit` — Timeline loads in <500ms, CSV export works
3. **No regressions:** All 548 existing tests still pass
4. **tsc + build pass** with 0 errors
5. **Performance benchmarks met:**
   - KPI aggregation: <500ms
   - Churn risk analysis: <1s
   - Audit log pagination: <500ms
6. **Security audit passed:**
   - API key generation uses crypto.randomBytes
   - Keys hashed with SHA-256 before storage
   - Data export requires tenant:admin permission
   - All sensitive operations audit-logged

---

**End of Phase 7D Backend Plan**

*Generated: 2026-02-20*
*Author: AI Architecture Assistant*
*Based on: Phase 5/6 Architecture + Frontend Plan + Established Patterns*
