# Platform Factory — Design Document

**Date:** 2026-02-28
**Status:** Approved
**Goal:** Transform Ironheart from a booking SaaS into a modular platform factory capable of launching 10+ verticals in 12 months, solo with AI.

---

## Executive Summary

Four interconnected systems that, together, make launching a new vertical a matter of days rather than weeks:

1. **Design-First Vertical Scaffolder** — Frontend mockups first, then backend generation
2. **Component Library + Theming** — Higher-level components + per-vertical visual identity
3. **Stripe Connect Revenue Engine** — Platform fees on every transaction across every vertical
4. **AI-Native Product Layer** — Module-as-tool architecture giving every vertical an intelligent agent

The throughline: the module manifest becomes the single contract between backend, frontend, AI, and billing. The more modules you build, the more capable every layer becomes.

---

## 1. Design-First Vertical Scaffolder

### The Sequence

```
Domain spec
  → Frontend mockup (static, fake data, high design quality)
  → Iterate until it looks like a product worth paying for
  → Scaffold the backend module to serve that frontend
  → Wire live data in
```

### Phase 1 — Visual Foundation

Describe the domain. The scaffolder generates frontend pages with realistic fake data:

- Dashboard view (the "home" of this vertical)
- Primary list view (e.g. grounds, venues, matches)
- Detail/edit view
- Any domain-specific views (e.g. a pitch calendar, a season fixture grid)

Real React components using the higher-level component library (Section 2) and the vertical's theme. Hardcoded mock data. No tRPC calls, no backend dependency. The product is visible immediately.

### Phase 2 — Design Iteration

Review the mockups, refine them. Change layouts, adjust information hierarchy, add/remove views. This is cheap because there's no backend to refactor.

### Phase 3 — Backend Scaffolding

Once the frontend is locked, the scaffolder generates the full module stack shaped by what the frontend needs:

```
src/modules/{module}/
  {module}.types.ts           — domain interfaces
  {module}.schemas.ts         — Zod input schemas
  {module}.repository.ts      — Drizzle queries with pagination, tenant filtering
  {module}.service.ts         — business logic, Inngest event emission
  {module}.router.ts          — tRPC procedures using correct procedure tiers
  {module}.events.ts          — Inngest event handlers
  {module}.manifest.ts        — module manifest with routes, sidebar, permissions,
                                 analytics widgets, AND toolDefinitions for AI
  {module}.tools.ts           — AI tool wrappers
  index.ts                    — barrel export
  __tests__/{module}.test.ts  — vitest tests
```

Plus:
- Drizzle schema additions (new tables/columns)
- Wiring into `register-all.ts`, `root.ts`, and `inngest.ts`

### Phase 4 — Wiring

Replace mock data with real tRPC calls. Data shapes already match because the backend was generated from the frontend's data needs.

### Why This Order

- Bad UX decisions are caught before writing any backend code
- The backend only builds what the frontend actually uses
- Every vertical looks like a finished product from day one
- The scaffolder applies known patterns (error handling, pagination, logging, procedure tiers) — you focus on domain logic

---

## 2. Component Library + Theming

Two layers, distinct purposes.

### Layer 1: Higher-Level Component Library

These sit between shadcn primitives and page layouts. The scaffolder composes pages from these, not from raw `<Card>` and `<Table>`.

| Component | Purpose | Replaces |
|-----------|---------|----------|
| `DataGrid` | Filterable, sortable, paginated list with column config, bulk actions, empty state | Hand-wiring Table + filters + pagination per module |
| `StatCard` | KPI display with value, trend, sparkline, comparison period | Manually laying out number cards |
| `EntityDetail` | Header + tabbed detail view for any entity | Rebuilding the same layout per entity |
| `EntityForm` | Auto-generated create/edit form from Zod schema with field type inference | Writing form fields by hand for every entity |
| `Timeline` | Activity/event feed (audit log, booking history, workflow steps) | Custom timeline per module |
| `StatusPipeline` | Visual status flow (e.g. Draft → Sent → Paid) with current state highlighted | Rebuilding status badges per domain |
| `MetricsDashboard` | Grid layout that reads analytics widget definitions from the module manifest | Manually placing chart components |
| `AIChatPanel` | Conversational agent interface, slides in from side, persistent across navigation | N/A — new capability |
| `AIInsightCard` | AI-generated insight card for dashboards alongside StatCards | N/A — new capability |
| `AISuggestionBanner` | Dismissable proactive suggestion banner at top of relevant pages | N/A — new capability |
| `AIFillButton` | Button on any EntityForm field — click to get AI-suggested value from context | N/A — new capability |
| `NaturalLanguageFilter` | Plain English filter input above any DataGrid | N/A — new capability |

Key insight: these components are **manifest-aware**. `MetricsDashboard` reads `analyticsWidgets` from the manifest. `CommandBar` reads `quickActions`. The module manifest is the contract between backend and frontend.

### Layer 2: Vertical Theming

A theme config per vertical that feeds CSS variables, so all components automatically pick up the vertical's visual identity:

```typescript
// verticals/cricket-stadium/theme.ts
export const theme = {
  name: 'Cricket Stadium ERP',
  colors: {
    primary: 'emerald',
    accent: 'amber',
    surface: 'slate',
  },
  typography: {
    headingFont: 'Inter',
    bodyFont: 'Inter',
  },
  branding: {
    logo: '/verticals/cricket/logo.svg',
    favicon: '/verticals/cricket/favicon.ico',
  },
  density: 'comfortable',   // 'compact' | 'comfortable' | 'spacious'
  borderRadius: 'md',       // 'none' | 'sm' | 'md' | 'lg' | 'full'
}
```

Same structure, different personality. The scaffolder applies the theme when generating frontend mockups.

---

## 3. Stripe Connect Revenue Engine

### The Model

```
Tenant's Customer → pays £100 → Tenant's Stripe Connect Account
                                        ↓
                                  Platform fee (e.g. 2.5%) → Your Stripe Account
```

Two revenue streams per vertical:
1. **Subscription fees** — tenants pay you monthly (Stripe Billing)
2. **Platform fees** — you take a percentage of every transaction (Stripe Connect)

### What Gets Built

1. **Stripe Connect onboarding flow** — Tenant signs up → Stripe-hosted KYC/bank details → store `stripe_account_id` and track onboarding status.

2. **Payment service** — Creates PaymentIntents via Stripe Connect with `application_fee_amount`. Invoice state machine: Draft → Sent → Viewed → Paid → Refunded. Already specced in Phase 6 Pillar 1.

3. **Stripe webhook → Inngest bridge** — Single webhook endpoint validates Stripe signature, forwards to Inngest for durable processing with retries and idempotency.

4. **Platform billing** — Stripe Billing for tenant subscriptions. Plans, usage metering (including AI token usage), trial periods.

### Configuration

Platform fee percentage is configurable per vertical and per tenant tier. Different verticals have different economics.

---

## 4. AI-Native Product Layer

### Core Architecture: Module-as-Tool

Every module's manifest is extended with `toolDefinitions` — structured descriptions of what the module can do, what parameters it takes, what it returns. The AI agent reads these at runtime, exactly like Claude Code reads MCP server capabilities.

```typescript
// Added to ModuleManifest
toolDefinitions?: {
  name: string           // 'booking.list', 'booking.cancel'
  description: string    // 'List bookings with optional filters'
  parameters: z.ZodType  // reuse existing Zod schemas
  handler: string        // reference to service method
  readOnly: boolean      // safe to call without confirmation
}[]
```

The agent uses the same RBAC permission model as tRPC procedures. Tenants can only invoke tools they have permissions for.

### Module Structure

```
src/modules/ai/
  ai.types.ts              — AIFeature, AIPromptTemplate, AIUsageRecord
  ai.schemas.ts            — input validation for AI endpoints
  ai.repository.ts         — prompt templates, usage tracking, tenant AI config
  ai.service.ts            — LLM orchestration, prompt assembly, response parsing
  ai.router.ts             — tRPC procedures
  ai.events.ts             — Inngest functions for async AI tasks
  ai.manifest.ts           — module manifest
  providers/
    anthropic.ts           — Claude API client (primary)
  prompts/
    notification-copy.ts
    review-response.ts
    form-generator.ts
    search-query.ts
    scheduling-insights.ts
```

### Tier 1: Single-Call AI (wire into existing flows)

One LLM call at the right moment. No new infrastructure beyond the ai module.

| Feature | How it works |
|---------|-------------|
| **Smart notification copy** | Inngest step before send generates personalised copy from booking/customer context |
| **Review response drafting** | On review submission, draft a response matching tenant's tone from previous responses |
| **Form generation** | Tenant describes what info they need → AI generates form schema |
| **Natural language search** | Plain English → structured query against search module |
| **Workflow suggestion** | Detect repeated manual actions → suggest automation |
| **Data entry from unstructured input** | Paste email/text → AI extracts structured data into entity form |
| **Smart defaults** | When creating any entity, suggest field values from tenant's historical patterns |
| **Automated tagging** | Auto-tag customers, bookings, notes based on content analysis |

### Tier 2: Intelligence Layer (needs historical data aggregation)

Requires the analytics module collecting metrics over time. AI interprets patterns.

| Feature | How it works |
|---------|-------------|
| **Scheduling optimisation** | Analyse booking density → recommend schedule changes |
| **No-show prediction** | Score upcoming bookings by historical no-show likelihood |
| **Customer health scoring** | Frequency, recency, spend, sentiment → segments (Champions, At Risk, New Potential) |
| **Revenue forecasting** | Project 30/60/90 day revenue from pipeline + historical completion rates |
| **Demand prediction** | Historical patterns + external signals → predict busy periods |
| **Staff performance insights** | Compare staff metrics with contextual explanation |
| **Anomaly detection** | Flag unusual patterns in tenant operations |
| **Optimal pricing suggestions** | Analyse demand curves → suggest price adjustments, link to pricing rules engine |

### Tier 3: Conversational Agent (biggest differentiator)

The MCP-style chatbot. An embedded AI agent that reads and acts across all modules.

| Feature | How it works |
|---------|-------------|
| **Cross-module Q&A** | "How's the business doing?" → pulls from booking, payment, review, customer, analytics simultaneously |
| **Multi-step actions** | "Cancel John's appointment and refund him, then rebook for next Tuesday" → six module operations from one sentence |
| **Report generation** | "Monthly report for my business partner" → pulls from every module, generates formatted summary |
| **Onboarding assistant** | New tenant describes their business → AI creates staff, services, schedule, templates |
| **Customer-facing booking agent** | Embeddable chat widget on tenant's website, handles full booking flow conversationally |
| **Delegation / task queue** | "Remind me to follow up with the Johnsons next Monday" → creates workflow trigger |
| **Natural language analytics** | "Compare Q4 last year with Q4 this year" → historical aggregates with plain English explanation |
| **Bulk operations with judgement** | "Update prices for premium services by 10%, but skip anything under £20" → preview, then execute on confirmation |

### Tier 4: Learning Layer (long-term, highest moat)

The platform gets smarter across all tenants and verticals over time.

| Feature | How it works |
|---------|-------------|
| **Cross-vertical insights** | Anonymised patterns: "Tenants who automate review requests in week 1 have 3x retention" |
| **Benchmark comparisons** | "Your rebooking rate is 78th percentile for businesses your size" |
| **Template marketplace** | AI-generated workflow/form/notification templates based on what works across the platform |
| **Vertical-specific model tuning** | Domain-specific models as data accumulates per vertical |

### AI Design Decisions

- **Tenant-configurable** — AI features gated by plan tier (Free: none, Pro: Tier 1, Enterprise: Tier 1-3)
- **Usage metering** — Token usage tracked per tenant, feeds into Stripe billing
- **Prompt templates in DB** — Iterable without redeployment. Enterprise tenants can customise tone/style
- **Provider-agnostic** — Claude primary, abstracted at service layer for flexibility

---

## 5. How Everything Connects

### Scaffolder → AI

When the scaffolder generates a new module, it also generates `toolDefinitions` in the manifest and `{module}.tools.ts` wrappers. Every new module is immediately accessible to the AI agent. Zero extra work per vertical.

**Flywheel:** more modules → more tools → more capable agent → more valuable every vertical.

### Design System → AI

AI-aware components (`AIChatPanel`, `AIInsightCard`, `AISuggestionBanner`, `AIFillButton`, `NaturalLanguageFilter`) are part of the component library. The scaffolder uses them when generating frontend pages. Every vertical gets AI-enhanced UI automatically.

### Stripe → AI

- AI features are a pricing lever — usage-based billing for AI tokens
- The conversational agent has access to payment module tools
- AI pricing suggestions link directly to the pricing rules engine: "Apply this suggestion" → creates a rule

### Vertical Template

The single config that ties all four layers together:

```typescript
// verticals/cricket-stadium/vertical.config.ts
export const vertical = {
  // Section 1: Which modules
  modules: ['booking', 'team', 'venue', 'payment', 'analytics', 'forms', 'notification'],

  // Section 2: How it looks
  theme: {
    colors: { primary: 'emerald', accent: 'amber' },
    density: 'comfortable',
    borderRadius: 'md',
  },

  // Section 3: How it makes money
  billing: {
    plans: ['free', 'pro', 'enterprise'],
    platformFeePercent: 2.5,
    trialDays: 14,
  },

  // Section 4: What AI features are available
  ai: {
    enabledTiers: ['tier1', 'tier2', 'tier3'],
    agentContext: 'Cricket stadium and event management platform',
    domainTerminology: {
      booking: 'fixture',
      customer: 'club',
      staff: 'ground crew',
    },
    defaultPromptTone: 'professional, sports-industry',
  },
}
```

The `domainTerminology` mapping means the AI agent speaks the vertical's language automatically.

### Full Launch Sequence

1. Write `vertical.config.ts` (30 mins of domain thinking)
2. Run scaffolder → frontend mockups with theme applied (review + iterate)
3. Lock design → scaffolder generates backend modules with tool definitions
4. Wire Stripe Connect onboarding into tenant provisioning
5. Deploy

Every vertical gets: themed UI, working backend, payment collection, and an AI agent that understands the domain.

---

## Implementation Priority

| Order | What | Why first |
|-------|------|-----------|
| 1 | Higher-level component library | Foundation for everything else — scaffolder needs these to generate good UI |
| 2 | Vertical theming system | Components need to be themeable before the scaffolder can apply vertical identity |
| 3 | Stripe Connect revenue engine | Every vertical needs to collect money from day one |
| 4 | AI module (Tier 1 features) | Quick wins that immediately differentiate every vertical |
| 5 | Design-first scaffolder (skill) | Once components, theming, payments, and AI Tier 1 exist, the scaffolder can generate complete verticals |
| 6 | AI Tier 2 (intelligence layer) | Needs data accumulation — build after first verticals are live |
| 7 | AI Tier 3 (conversational agent) | Highest effort, highest moat — build once Tier 1+2 are proven |
| 8 | AI Tier 4 (learning layer) | Needs cross-tenant data at scale — long-term play |
