# AI Module (Tier 1) — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the AI module foundation and implement Tier 1 features (single-call AI integrated into existing flows).

**Architecture:** A shared `ai` module with provider abstraction, prompt templates in DB, usage metering, and integration points into existing modules via Inngest events.

**Tech Stack:** Anthropic SDK (@anthropic-ai/sdk), tRPC 11, Drizzle ORM, Inngest, Zod v4

---

## 1. Module-as-Tool Architecture

### How toolDefinitions Extend the ModuleManifest

The existing `ModuleManifest` interface (in `src/shared/module-system/types.ts`) gains an optional `toolDefinitions` array. Each tool definition describes a capability that the AI agent can invoke at runtime. This follows the same pattern as `analyticsWidgets`, `settingsDefinitions`, and `notificationTriggers` — the manifest is the single contract between backend, frontend, AI, and billing.

```typescript
// Added to ModuleManifest in src/shared/module-system/types.ts
export interface ModuleToolDefinition {
  /** Namespaced tool name: 'booking.list', 'customer.create' */
  name: string
  /** Plain English description for the AI agent's tool discovery */
  description: string
  /**
   * Reference to the Zod schema that validates parameters.
   * Format: '{module}.schemas.{exportName}' — resolved at runtime.
   * The AI service imports the schema dynamically to validate input
   * before invoking the handler.
   */
  parametersSchema: string
  /**
   * Reference to the service method that handles the tool call.
   * Format: '{module}.service.{methodName}' — resolved at runtime.
   * The AI service imports the service dynamically and calls the method
   * with validated parameters + context.
   */
  handler: string
  /**
   * Whether this tool only reads data (true) or mutates state (false).
   * Read-only tools can be invoked without user confirmation in the
   * conversational agent (Tier 3). Mutating tools require explicit
   * user approval before execution.
   */
  readOnly: boolean
  /**
   * The RBAC permission required to invoke this tool.
   * Reuses the same permission strings from the module's manifest.permissions.
   * Example: 'bookings:read', 'customers:write'
   * The AI service checks hasPermission(user, requiredPermission) before
   * invoking the handler — same gate as tRPC permissionProcedure.
   */
  requiredPermission: string
}

// In ModuleManifest interface:
export interface ModuleManifest {
  // ... existing fields ...
  toolDefinitions?: ModuleToolDefinition[]
}
```

### How the AI Agent Discovers and Invokes Tools at Runtime

Tool discovery follows the same pattern as search providers and notification triggers:

1. **Registration** — At startup, `register-all.ts` registers module manifests into the `moduleRegistry`. The `toolDefinitions` array is already part of each manifest.

2. **Discovery** — When the AI service needs to determine available tools for a tenant, it:
   - Calls `moduleRegistry.getAllManifests()` to get all registered modules
   - Filters to modules enabled for the tenant via `tenantService.isModuleEnabled(tenantId, slug)`
   - Collects all `toolDefinitions` from enabled modules
   - Further filters by the user's RBAC permissions via `hasPermission(user, tool.requiredPermission)`

3. **Invocation** — When the AI agent decides to call a tool:
   - The AI service resolves the `parametersSchema` reference to a Zod schema (lazy import)
   - Validates the AI-generated parameters against the schema
   - Resolves the `handler` reference to a service method (lazy import)
   - Calls the handler with `(ctx, validatedInput)` where `ctx` carries `tenantId` and `user`
   - Returns the result to the AI for further reasoning

4. **Caching** — The resolved tool list per tenant+user is cached in Redis for 5 minutes (same pattern as tenant module enablement checks). Schema and handler references are resolved once and memoised in a `Map<string, { schema: ZodType; handler: Function }>`.

### Permission Model

The AI module reuses the existing RBAC system with no modifications:

- Each `ModuleToolDefinition` declares a `requiredPermission` string
- Before tool invocation, the AI service calls `hasPermission(ctx.user, tool.requiredPermission)` from `src/modules/auth/rbac.ts`
- The AI agent cannot escalate privileges — it operates within the invoking user's permission set
- Platform admins (`isPlatformAdmin: true`) bypass permission checks, same as in `tenantProcedure`
- Tools from disabled modules are never presented to the AI, enforced by the `isModuleEnabled` check during discovery

---

## 2. AI Module Structure

```
src/modules/ai/
  ai.types.ts              — AIFeature, AIPromptTemplate, AIUsageRecord, AIProviderConfig,
                              AIGenerateTextRequest, AIGenerateStructuredRequest,
                              AIGenerateTextResponse, AIGenerateStructuredResponse,
                              AITierConfig
  ai.schemas.ts            — Zod schemas for tRPC input validation (translateSearchQuery,
                              generateFormSchema, suggestDefaults, extractStructuredData,
                              draftReviewResponse, generateNotificationCopy, suggestWorkflow,
                              tagEntity, getUsageSummary, listPromptTemplates,
                              upsertPromptTemplate, deletePromptTemplate)
  ai.repository.ts         — prompt template CRUD, usage tracking writes, tenant AI config,
                              usage aggregation queries for billing
  ai.service.ts            — LLM orchestration, prompt assembly with variable interpolation,
                              response parsing, tool discovery, tenant config resolution,
                              rate limit enforcement, all Tier 1 feature orchestration methods
  ai.router.ts             — tRPC procedures for synchronous AI features (translateSearchQuery,
                              generateFormSchema, suggestDefaults, extractStructuredData) and
                              admin procedures for prompt template management and usage viewing
  ai.events.ts             — Inngest functions for async AI tasks (smart notification copy,
                              review response drafting, workflow suggestion, automated tagging)
  ai.manifest.ts           — module manifest with toolDefinitions for AI-specific tools,
                              settingsDefinitions for AI config, permissions
  providers/
    types.ts               — AIProvider interface (generateText, generateStructured)
    anthropic.ts           — Claude API client implementation using @anthropic-ai/sdk,
                              lazy-init singleton (same pattern as notification providers)
  index.ts                 — barrel export
  __tests__/
    ai.service.test.ts     — unit tests for service layer
    ai.repository.test.ts  — unit tests for repository layer
```

### File Responsibilities

**ai.types.ts** — Pure interfaces, no Zod. Defines the domain types that flow through the module:
- `AIFeature` — enum of all AI feature keys (`SMART_NOTIFICATION_COPY`, `REVIEW_RESPONSE_DRAFT`, etc.)
- `AIPromptTemplate` — DB record shape for prompt templates
- `AIUsageRecord` — DB record shape for usage tracking
- `AIProviderConfig` — per-tenant provider configuration
- Request/response types for provider abstraction

**ai.schemas.ts** — Zod v4 schemas for tRPC input validation. One schema per procedure, following the pattern in `review.schemas.ts`. Uses `z.string()` (not `z.uuid()`) for ID fields in Inngest event data.

**ai.repository.ts** — Drizzle queries only. Throws domain errors (`NotFoundError`, `BadRequestError`). Never throws `TRPCError`. Handles:
- Prompt template CRUD with tenant scoping
- Usage record insertion
- Usage aggregation (by feature, by date range, by model)
- Tenant AI config read/write

**ai.service.ts** — Business logic layer. Calls repository and provider. Emits Inngest events. Handles:
- Prompt assembly: loads template from DB, interpolates variables, constructs system/user messages
- Provider invocation: calls the provider abstraction (never the SDK directly)
- Response parsing: extracts structured data from LLM responses
- Usage tracking: records token counts after each call
- Rate limit checks: enforces per-tenant tier limits before making API calls
- All eight Tier 1 feature methods

**ai.router.ts** — Thin tRPC layer. Calls service methods. Uses `tenantProcedure` for reads, `permissionProcedure('ai:write')` for mutations. Module-gated via `createModuleMiddleware('ai')`.

**ai.events.ts** — Inngest functions for async AI tasks. Each function follows the same step-based pattern as `notification.events.ts`. Exports an `aiFunctions` array for registration in `route.ts`.

**ai.manifest.ts** — `ModuleManifest` with:
- `slug: 'ai'`
- `category: 'intelligence'`
- `isCore: false` (gated by tenant plan tier)
- `permissions: ['ai:read', 'ai:write', 'ai:admin']`
- `settingsDefinitions` for model selection, temperature, max tokens, feature toggles
- `toolDefinitions` for AI-specific tools (e.g. `ai.translateSearchQuery`, `ai.suggestDefaults`)

---

## 3. Provider Abstraction

### Interface

```typescript
// src/modules/ai/providers/types.ts

export interface AITextMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface AIGenerateTextOptions {
  messages: AITextMessage[]
  model?: string          // e.g. 'claude-sonnet-4-20250514'
  maxTokens?: number      // default: 1024
  temperature?: number    // default: 0.3 for structured tasks, 0.7 for creative
  stopSequences?: string[]
}

export interface AIGenerateTextResult {
  text: string
  inputTokens: number
  outputTokens: number
  model: string
  stopReason: 'end_turn' | 'max_tokens' | 'stop_sequence'
}

export interface AIGenerateStructuredOptions<T> {
  messages: AITextMessage[]
  schema: z.ZodType<T>    // The expected output shape — used to construct tool_use
  model?: string
  maxTokens?: number
  temperature?: number
}

export interface AIGenerateStructuredResult<T> {
  data: T
  inputTokens: number
  outputTokens: number
  model: string
}

export interface AIProvider {
  /**
   * Generate free-form text. Used for notification copy, review responses,
   * and any feature that returns prose.
   */
  generateText(options: AIGenerateTextOptions): Promise<AIGenerateTextResult>

  /**
   * Generate structured output that conforms to a Zod schema.
   * Implementation uses Claude's tool_use to force JSON output matching the schema.
   * Used for search query translation, form generation, entity extraction.
   */
  generateStructured<T>(options: AIGenerateStructuredOptions<T>): Promise<AIGenerateStructuredResult<T>>
}
```

### Anthropic Implementation

```typescript
// src/modules/ai/providers/anthropic.ts

import Anthropic from '@anthropic-ai/sdk'
import { zodToJsonSchema } from 'zod-to-json-schema'
import type { AIProvider, AIGenerateTextOptions, AIGenerateTextResult,
              AIGenerateStructuredOptions, AIGenerateStructuredResult } from './types'

const DEFAULT_MODEL = 'claude-sonnet-4-20250514'

/**
 * Anthropic Claude provider.
 *
 * Uses lazy initialisation — the SDK client is NOT constructed at module load
 * time. This prevents build failures when ANTHROPIC_API_KEY is not set (same
 * pattern as Resend/Twilio in notification providers).
 */
export class AnthropicProvider implements AIProvider {
  private client: Anthropic | null = null

  private getClient(): Anthropic {
    if (!this.client) {
      this.client = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      })
    }
    return this.client
  }

  async generateText(options: AIGenerateTextOptions): Promise<AIGenerateTextResult> {
    const { messages, model, maxTokens, temperature, stopSequences } = options
    const systemMessage = messages.find(m => m.role === 'system')
    const userMessages = messages.filter(m => m.role !== 'system')

    const response = await this.getClient().messages.create({
      model: model ?? DEFAULT_MODEL,
      max_tokens: maxTokens ?? 1024,
      temperature: temperature ?? 0.3,
      stop_sequences: stopSequences,
      system: systemMessage?.content,
      messages: userMessages.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    })

    const textBlock = response.content.find(b => b.type === 'text')

    return {
      text: textBlock?.text ?? '',
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      model: response.model,
      stopReason: response.stop_reason as AIGenerateTextResult['stopReason'],
    }
  }

  async generateStructured<T>(
    options: AIGenerateStructuredOptions<T>
  ): Promise<AIGenerateStructuredResult<T>> {
    const { messages, schema, model, maxTokens, temperature } = options
    const systemMessage = messages.find(m => m.role === 'system')
    const userMessages = messages.filter(m => m.role !== 'system')

    const jsonSchema = zodToJsonSchema(schema, 'output')

    const response = await this.getClient().messages.create({
      model: model ?? DEFAULT_MODEL,
      max_tokens: maxTokens ?? 2048,
      temperature: temperature ?? 0.1,
      system: systemMessage?.content,
      messages: userMessages.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      tools: [{
        name: 'structured_output',
        description: 'Return the structured output matching the required schema.',
        input_schema: jsonSchema.definitions?.output ?? jsonSchema,
      }],
      tool_choice: { type: 'tool', name: 'structured_output' },
    })

    const toolBlock = response.content.find(b => b.type === 'tool_use')
    const parsed = schema.parse(toolBlock?.input)

    return {
      data: parsed,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      model: response.model,
    }
  }
}
```

### Lazy Singleton (Same Pattern as Notification Providers)

```typescript
// At the bottom of providers/anthropic.ts

let _provider: AnthropicProvider | null = null

export function getAnthropicProvider(): AnthropicProvider {
  if (!_provider) {
    _provider = new AnthropicProvider()
  }
  return _provider
}
```

### Configuration Per Tenant

The `ai_tenant_config` table stores per-tenant overrides. When the AI service makes a call, it resolves configuration in this order:

1. **Tenant config** (`ai_tenant_config` row for the tenant) — model, temperature, maxTokens
2. **Prompt template config** (individual template may override model/maxTokens)
3. **System defaults** — `claude-sonnet-4-20250514`, temperature 0.3, maxTokens 1024

### Token Usage Tracking

Every AI call records usage in `ai_usage_records`. The service wraps every provider call:

```typescript
// In ai.service.ts (pseudocode)
async function callWithTracking(
  tenantId: string,
  feature: AIFeature,
  callFn: () => Promise<{ inputTokens: number; outputTokens: number; model: string }>
): Promise<...> {
  const result = await callFn()
  await aiRepository.recordUsage({
    tenantId,
    feature,
    inputTokens: result.inputTokens,
    outputTokens: result.outputTokens,
    model: result.model,
    estimatedCost: calculateCost(result.model, result.inputTokens, result.outputTokens),
  })
  return result
}
```

---

## 4. Prompt Template System

### Schema: `prompt_templates` Table

```sql
CREATE TABLE prompt_templates (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID REFERENCES tenants(id) ON DELETE CASCADE,
  key           TEXT NOT NULL,              -- 'notification.copy', 'review.response', etc.
  name          TEXT NOT NULL,              -- Human-readable: 'Smart Notification Copy'
  system_prompt TEXT NOT NULL,              -- System message template with {{variables}}
  user_prompt   TEXT NOT NULL,              -- User message template with {{variables}}
  variables     JSONB NOT NULL DEFAULT '[]', -- Array of variable names: ["customerName", "serviceName"]
  model         TEXT,                       -- Override model (null = use tenant/system default)
  max_tokens    INTEGER,                    -- Override max tokens (null = use default)
  temperature   NUMERIC(3,2),              -- Override temperature (null = use default)
  is_default    BOOLEAN NOT NULL DEFAULT false, -- true = seeded by platform, false = tenant custom
  active        BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(tenant_id, key)                   -- One active template per key per tenant
);

CREATE INDEX prompt_templates_tenant_id_idx ON prompt_templates(tenant_id);
CREATE INDEX prompt_templates_key_idx ON prompt_templates(key);
```

**Drizzle schema definition:**

```typescript
// In src/shared/db/schemas/ai.schema.ts
export const promptTemplates = pgTable('prompt_templates', {
  id:           uuid().primaryKey().notNull().default(sql`gen_random_uuid()`),
  tenantId:     uuid().notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  key:          text().notNull(),
  name:         text().notNull(),
  systemPrompt: text().notNull(),
  userPrompt:   text().notNull(),
  variables:    jsonb().notNull().default(sql`'[]'`),
  model:        text(),
  maxTokens:    integer(),
  temperature:  text(),  // stored as text, parsed to number in mapper
  isDefault:    boolean().notNull().default(false),
  active:       boolean().notNull().default(true),
  createdAt:    timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt:    timestamp({ precision: 3, mode: 'date' }).notNull(),
}, (table) => [
  index('prompt_templates_tenant_id_idx').on(table.tenantId),
  index('prompt_templates_key_idx').on(table.key),
  uniqueIndex('prompt_templates_tenant_id_key_key').on(table.tenantId, table.key),
])
```

### Default Templates Seeded Per Module

When a tenant enables the AI module, the platform seeds default prompt templates for each Tier 1 feature. This uses the same seed-on-enable pattern as `moduleSettingsService.seedModuleSettings()`:

| Key | Name | Purpose |
|-----|------|---------|
| `notification.copy` | Smart Notification Copy | Generate personalised notification body |
| `review.response` | Review Response Draft | Draft response matching tenant tone |
| `search.translate` | Natural Language Search | Convert plain English to structured query |
| `forms.generate` | Form Schema Generator | Generate form fields from description |
| `workflow.suggest` | Workflow Suggestion | Suggest automations from manual actions |
| `entity.defaults` | Smart Defaults | Suggest field values for new entities |
| `entity.tag` | Automated Tagging | Suggest tags from content analysis |
| `entity.extract` | Data Extraction | Extract structured data from unstructured text |

Each default template includes a `systemPrompt` with the platform's standard instructions and a `userPrompt` with `{{variable}}` placeholders.

### Tenant Override Mechanism

1. Default templates are seeded with `isDefault: true`
2. Tenants can create custom templates with the same `key` — the custom row has `isDefault: false`
3. Template resolution order in `ai.repository.ts`:
   - Look for active tenant custom template (`isDefault: false`, `active: true`, matching `key`)
   - Fall back to active default template (`isDefault: true`, `active: true`, matching `key`)
   - If neither exists, the service throws `NotFoundError('PromptTemplate', key)`

This mirrors how `notification.service.ts` resolves DB templates before falling back to system templates.

### Variable Interpolation Approach

Simple Handlebars-style `{{variableName}}` replacement. No expression evaluation, no conditionals — complexity belongs in the prompt, not the template engine.

```typescript
function interpolate(template: string, variables: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return variables[key] ?? match  // Leave unresolved variables as-is
  })
}
```

The `variables` JSONB column on the template serves as documentation — it declares which variables the template expects. The service validates that all declared variables are provided before interpolation and logs a warning (not an error) for any unresolved placeholders.

---

## 5. Usage Metering

### Schema: `ai_usage_records` Table

```sql
CREATE TABLE ai_usage_records (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  feature        TEXT NOT NULL,             -- AIFeature enum value
  input_tokens   INTEGER NOT NULL,
  output_tokens  INTEGER NOT NULL,
  model          TEXT NOT NULL,             -- 'claude-sonnet-4-20250514'
  estimated_cost NUMERIC(10,6) NOT NULL,   -- USD cost estimate
  user_id        UUID,                     -- Who triggered it (null for system/Inngest)
  metadata       JSONB DEFAULT '{}',       -- Feature-specific context (bookingId, reviewId, etc.)
  created_at     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX ai_usage_records_tenant_id_idx ON ai_usage_records(tenant_id);
CREATE INDEX ai_usage_records_tenant_feature_idx ON ai_usage_records(tenant_id, feature);
CREATE INDEX ai_usage_records_created_at_idx ON ai_usage_records(created_at);
```

**Drizzle schema definition:**

```typescript
export const aiUsageRecords = pgTable('ai_usage_records', {
  id:            uuid().primaryKey().notNull().default(sql`gen_random_uuid()`),
  tenantId:      uuid().notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  feature:       text().notNull(),
  inputTokens:   integer().notNull(),
  outputTokens:  integer().notNull(),
  model:         text().notNull(),
  estimatedCost: text().notNull(),  // stored as text, parsed in mapper
  userId:        uuid(),
  metadata:      jsonb().default(sql`'{}'`),
  createdAt:     timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  index('ai_usage_records_tenant_id_idx').on(table.tenantId),
  index('ai_usage_records_tenant_feature_idx').on(table.tenantId, table.feature),
  index('ai_usage_records_created_at_idx').on(table.createdAt),
])
```

### Aggregation Queries for Billing

The repository exposes aggregation methods consumed by the billing system and the admin dashboard:

```typescript
// ai.repository.ts

/** Total tokens and estimated cost for a tenant in a date range. */
async getUsageSummary(tenantId: string, from: Date, to: Date): Promise<{
  totalInputTokens: number
  totalOutputTokens: number
  totalEstimatedCost: number
  byFeature: Array<{
    feature: string
    inputTokens: number
    outputTokens: number
    estimatedCost: number
    callCount: number
  }>
}>

/** Daily token usage for a tenant (for chart rendering). */
async getDailyUsage(tenantId: string, from: Date, to: Date): Promise<Array<{
  date: string       // ISO date string
  inputTokens: number
  outputTokens: number
  estimatedCost: number
}>>

/** Check if tenant has exceeded their tier's monthly token limit. */
async getMonthlyUsage(tenantId: string): Promise<{
  inputTokens: number
  outputTokens: number
  estimatedCost: number
}>
```

### Rate Limiting Per Tenant Tier

AI features are gated by plan tier. Rate limits are enforced at the service layer before making any provider call:

| Plan Tier | Monthly Token Limit | Requests/Minute | Enabled Features |
|-----------|-------------------|-----------------|-----------------|
| Free | 0 (disabled) | 0 | None |
| Pro | 500,000 tokens | 30 | Tier 1 only |
| Enterprise | 5,000,000 tokens | 120 | Tier 1 + 2 + 3 |

The service checks monthly usage against the tenant's tier limit using a Redis counter with TTL matching the billing period:

```typescript
const rateLimitKey = `ai:rate:${tenantId}:${yearMonth}`
const monthlyUsageKey = `ai:usage:${tenantId}:${yearMonth}`
```

When the monthly limit is reached, the service throws a `BadRequestError('AI token limit exceeded for this billing period')`. The tenant can upgrade their plan to increase the limit.

### Schema: `ai_tenant_config` Table

```sql
CREATE TABLE ai_tenant_config (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          UUID NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
  enabled            BOOLEAN NOT NULL DEFAULT true,
  tier               TEXT NOT NULL DEFAULT 'pro',          -- 'free', 'pro', 'enterprise'
  default_model      TEXT DEFAULT 'claude-sonnet-4-20250514',
  default_temperature NUMERIC(3,2) DEFAULT 0.3,
  default_max_tokens INTEGER DEFAULT 1024,
  monthly_token_limit INTEGER DEFAULT 500000,
  tone_description   TEXT,                                 -- 'Professional but warm, UK English'
  brand_context      TEXT,                                 -- 'We are a premium dog grooming salon...'
  feature_flags      JSONB NOT NULL DEFAULT '{}',          -- Per-feature enable/disable overrides
  created_at         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX ai_tenant_config_tenant_id_key ON ai_tenant_config(tenant_id);
```

**Drizzle schema definition:**

```typescript
export const aiTenantConfig = pgTable('ai_tenant_config', {
  id:                uuid().primaryKey().notNull().default(sql`gen_random_uuid()`),
  tenantId:          uuid().notNull().unique().references(() => tenants.id, { onDelete: 'cascade' }),
  enabled:           boolean().notNull().default(true),
  tier:              text().notNull().default('pro'),
  defaultModel:      text().default('claude-sonnet-4-20250514'),
  defaultTemperature: text().default('0.3'),
  defaultMaxTokens:  integer().default(1024),
  monthlyTokenLimit: integer().default(500000),
  toneDescription:   text(),
  brandContext:      text(),
  featureFlags:      jsonb().notNull().default(sql`'{}'`),
  createdAt:         timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt:         timestamp({ precision: 3, mode: 'date' }).notNull(),
}, (table) => [
  uniqueIndex('ai_tenant_config_tenant_id_key').on(table.tenantId),
])
```

---

## 6. Tier 1 Features

### 6.1 Smart Notification Copy

**What triggers it:** An Inngest step inserted into the existing email/SMS delivery flow. Specifically, the `handleNotificationSendEmail` function in `notification.events.ts` gains an optional AI enhancement step before the `send-email` step. The step checks whether AI copy generation is enabled for the tenant and feature.

**What prompt it uses:** Template key `notification.copy`.

System prompt:
```
You are a notification copywriter for {{tenantName}}, a {{brandContext}}.
Tone: {{toneDescription}}.
Write a personalised notification body. Keep it concise (2-3 sentences for email, 1 sentence for SMS).
Do not include greetings or sign-offs — those are handled by the email template wrapper.
```

User prompt:
```
Notification type: {{trigger}}
Customer: {{customerName}} ({{customerFirstName}})
Service: {{serviceName}}
Booking date: {{bookingDate}} at {{bookingTime}}
Staff member: {{staffName}}
Location: {{locationAddress}}

Original template body:
{{originalBody}}

Generate a personalised version of this notification body.
```

**What it returns:** A `string` — the personalised notification body text. The original body is kept as fallback if the AI call fails.

**How it integrates with the existing module:**

In `notification.events.ts`, the `handleNotificationSendEmail` function is modified:

```typescript
// After idempotency check, before send-email step:
const enhancedBody = await step.run('ai-enhance-copy', async () => {
  try {
    return await aiService.generateNotificationCopy({
      tenantId,
      trigger,
      originalBody: html,
      templateVariables: event.data,  // customerName, serviceName, etc.
    })
  } catch (err) {
    log.warn({ err, tenantId, trigger }, 'AI copy generation failed — using original')
    return null  // Graceful fallback
  }
})

// Use enhanced body if available, otherwise use original
const finalHtml = enhancedBody ?? html
```

The AI enhancement is always wrapped in a try/catch with a graceful fallback. If the AI module is disabled for the tenant, the step returns `null` immediately (checked via `isModuleEnabled`). Notification delivery is never blocked by AI failures.

---

### 6.2 Review Response Drafting

**What triggers it:** The `review/submitted` Inngest event, which is already emitted by `review.service.ts` in the `submitReview` method.

**What prompt it uses:** Template key `review.response`.

System prompt:
```
You are drafting a response to a customer review for {{tenantName}}.
Tone: {{toneDescription}}.
Match the tone and style of these previous responses:
{{previousResponses}}

Guidelines:
- Thank the customer by name
- If rating >= 4: express gratitude, highlight the specific service
- If rating < 4: acknowledge concerns empathetically, offer to make it right
- Keep to 2-4 sentences
- Never be defensive or dismissive
- Do not offer specific discounts or compensation (the business owner will decide)
```

User prompt:
```
Customer: {{customerName}}
Rating: {{rating}}/5
Review text: {{reviewText}}
Service: {{serviceName}}
Date of service: {{bookingDate}}
Staff member: {{staffName}}

Draft a response to this review.
```

**What it returns:** A `string` — the draft response text. Saved to a new `draftResponse` field on the review record (or a separate `review_ai_drafts` table if we prefer not to modify the reviews table).

**How it integrates with the existing module:**

A new Inngest function is added to `ai.events.ts` (not `review.events.ts` — AI logic lives in the AI module):

```typescript
export const draftReviewResponse = inngest.createFunction(
  { id: 'ai-draft-review-response', name: 'AI: Draft Review Response' },
  { event: 'review/submitted' },
  async ({ event, step }) => {
    const { reviewId, tenantId, bookingId, customerId, rating } = event.data

    const draft = await step.run('generate-draft', async () => {
      return aiService.draftReviewResponse({
        tenantId,
        reviewId,
        bookingId,
        customerId,
        rating,
      })
    })

    if (draft) {
      await step.run('save-draft', async () => {
        await aiRepository.saveReviewDraft(reviewId, tenantId, draft)
      })
    }
  }
)
```

The review module's UI reads the draft from the repository when displaying the review detail view. The business owner can edit, approve, or discard the draft before publishing.

---

### 6.3 Natural Language Search

**What triggers it:** A tRPC procedure call from the search bar UI. The user types a natural language query (e.g. "bookings next week for John") and the AI translates it to a structured search query.

**What prompt it uses:** Template key `search.translate`.

System prompt:
```
You are a search query translator for a {{verticalDescription}} management platform.
Convert plain English queries into structured search parameters.

Available entity types: {{availableEntityTypes}}
Available filter fields per entity: {{filterFieldsJson}}

Return a structured query object. If the query is ambiguous, make reasonable assumptions.
If the query cannot be translated, return { "error": "description of what's unclear" }.
```

User prompt:
```
Translate this search query: "{{userQuery}}"
```

**What it returns:** A structured object conforming to:

```typescript
interface TranslatedSearchQuery {
  entityType: string          // 'booking', 'customer', 'staff', etc.
  filters: Array<{
    field: string             // 'scheduledDate', 'customerName', etc.
    operator: 'eq' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'in'
    value: string | number | boolean | string[]
  }>
  sort?: {
    field: string
    direction: 'asc' | 'desc'
  }
  limit?: number
}
```

**How it integrates with the existing module:**

The AI router exposes a `translateSearchQuery` procedure:

```typescript
// ai.router.ts
translateSearchQuery: moduleProcedure
  .input(z.object({
    query: z.string().min(2).max(500),
  }))
  .mutation(({ ctx, input }) =>
    aiService.translateSearchQuery(ctx.tenantId, input.query)
  )
```

The frontend `NaturalLanguageFilter` component calls this procedure, then passes the structured result to the existing `searchService.globalSearch` or to entity-specific list endpoints with the translated filters. The search module itself is not modified — the AI module sits in front of it as a translator.

---

### 6.4 Form Generation

**What triggers it:** A tRPC procedure call from the form builder UI. The user describes what data they want to collect in plain English.

**What prompt it uses:** Template key `forms.generate`.

System prompt:
```
You are a form builder for a {{verticalDescription}} management platform.
Generate a form schema from a natural language description.

Available field types: TEXT, TEXTAREA, NUMBER, EMAIL, PHONE, SELECT, MULTI_SELECT, DATE, TIME, CHECKBOX, FILE_UPLOAD, RATING, SIGNATURE

Each field must have: label, type, required (boolean), and optionally: placeholder, helpText, options (for SELECT/MULTI_SELECT), validation (min/max for NUMBER, minLength/maxLength for TEXT).

Return fields in a logical order (contact info first, then details, then optional fields).
```

User prompt:
```
Generate a form to collect: "{{description}}"

Context: This form is for {{tenantName}}, a {{brandContext}}.
```

**What it returns:** A structured array of form field definitions matching the forms module's field types:

```typescript
interface GeneratedFormField {
  label: string
  type: 'TEXT' | 'TEXTAREA' | 'NUMBER' | 'EMAIL' | 'PHONE' | 'SELECT' |
        'MULTI_SELECT' | 'DATE' | 'TIME' | 'CHECKBOX' | 'FILE_UPLOAD' |
        'RATING' | 'SIGNATURE'
  required: boolean
  placeholder?: string
  helpText?: string
  options?: string[]        // For SELECT and MULTI_SELECT
  validation?: {
    min?: number
    max?: number
    minLength?: number
    maxLength?: number
  }
}
```

**How it integrates with the existing module:**

```typescript
// ai.router.ts
generateFormSchema: moduleProcedure
  .input(z.object({
    description: z.string().min(10).max(1000),
  }))
  .mutation(({ ctx, input }) =>
    aiService.generateFormSchema(ctx.tenantId, input.description)
  )
```

The form builder UI receives the generated fields and pre-populates the form builder interface. The user can then adjust labels, reorder fields, change types, and add/remove fields before saving. The generated schema is a starting point, not a final product.

---

### 6.5 Workflow Suggestion

**What triggers it:** Two modes:
1. **On-demand** — tRPC procedure call from the workflow builder UI
2. **Daily cron** — Inngest cron function that analyses the previous day's audit log

**What prompt it uses:** Template key `workflow.suggest`.

System prompt:
```
You are a workflow automation advisor for a {{verticalDescription}} management platform.
Analyse manual actions and suggest workflow automations that would save time.

Available workflow triggers: {{availableTriggers}}
Available workflow actions: {{availableActions}}

For each suggestion, provide:
- A descriptive name
- The trigger event
- The sequence of actions
- The estimated time saved per occurrence
- A confidence score (0-1) based on how repetitive the pattern is
```

User prompt:
```
Here are the manual actions performed in the last {{periodDays}} days:

{{auditLogSummary}}

Suggest workflow automations that would reduce manual work.
```

**What it returns:**

```typescript
interface WorkflowSuggestion {
  name: string
  description: string
  triggerEvent: string
  actions: Array<{
    type: string
    config: Record<string, unknown>
  }>
  estimatedTimeSavedMinutes: number
  confidence: number
}
```

**How it integrates with the existing module:**

Async mode — `ai.events.ts`:

```typescript
export const suggestWorkflows = inngest.createFunction(
  {
    id: 'ai-suggest-workflows',
    name: 'AI: Suggest Workflow Automations',
  },
  { cron: '0 6 * * *' },  // Daily at 06:00 UTC
  async ({ step }) => {
    // Fan out: get all tenants with AI enabled
    const tenants = await step.run('get-ai-tenants', async () => {
      return aiRepository.getTenantsWithAIEnabled()
    })

    for (const tenant of tenants) {
      await step.run(`suggest-${tenant.id}`, async () => {
        const suggestions = await aiService.suggestWorkflows(tenant.id)
        if (suggestions.length > 0) {
          await aiRepository.saveWorkflowSuggestions(tenant.id, suggestions)
        }
      })
    }
  }
)
```

On-demand mode — `ai.router.ts`:

```typescript
suggestWorkflows: moduleProcedure
  .input(z.object({
    periodDays: z.number().int().min(1).max(90).default(7),
  }))
  .mutation(({ ctx, input }) =>
    aiService.suggestWorkflows(ctx.tenantId, input.periodDays)
  )
```

The workflow builder UI shows suggestions as cards that can be "Applied" — clicking creates a draft workflow with the suggested configuration pre-filled.

---

### 6.6 Smart Defaults

**What triggers it:** A tRPC procedure call when the user opens a create/edit form for any entity. The frontend requests suggested field values before the user starts filling in the form.

**What prompt it uses:** Template key `entity.defaults`.

System prompt:
```
You are a data assistant for {{tenantName}}.
Based on historical patterns, suggest default values for new entity fields.
Only suggest values where you have high confidence from the data patterns.
Return null for fields where you cannot make a confident suggestion.
```

User prompt:
```
Entity type: {{entityType}}
Recent entities of this type:
{{recentEntitiesJson}}

Suggest default values for a new {{entityType}}.
Context: {{additionalContext}}
```

**What it returns:**

```typescript
interface SuggestedDefaults {
  fields: Array<{
    fieldName: string
    suggestedValue: unknown
    confidence: number     // 0-1
    reason: string         // 'Most common value', 'Based on time of day', etc.
  }>
}
```

**How it integrates with the existing module:**

```typescript
// ai.router.ts
suggestDefaults: moduleProcedure
  .input(z.object({
    entityType: z.string(),  // 'booking', 'customer', 'service', etc.
    context: z.record(z.string(), z.unknown()).optional(),
  }))
  .query(({ ctx, input }) =>
    aiService.suggestDefaults(ctx.tenantId, input.entityType, input.context)
  )
```

The `AIFillButton` component on each form field calls this procedure once when the form loads. Suggestions with confidence > 0.7 are shown as pre-filled ghost values; the user clicks to accept or types to override.

---

### 6.7 Automated Tagging

**What triggers it:** Inngest events on entity create/update. Specifically, listens on:
- `booking/created` — tag new bookings based on service type, customer segment, time of day
- `team/created` — tag new team members based on skills, department
- `review/submitted` — tag reviews based on sentiment, topics mentioned

**What prompt it uses:** Template key `entity.tag`.

System prompt:
```
You are a content tagger for a {{verticalDescription}} management platform.
Analyse the entity content and suggest relevant tags/categories.

Available tag categories: {{availableCategories}}
Existing tags in use by this tenant: {{existingTags}}

Return 1-5 tags. Prefer existing tags over creating new ones.
Only create a new tag if no existing tag is appropriate.
```

User prompt:
```
Entity type: {{entityType}}
Content:
{{entityContent}}

Suggest tags for this entity.
```

**What it returns:**

```typescript
interface TagSuggestion {
  tags: Array<{
    name: string
    category?: string
    isNew: boolean         // true if this is a new tag not in existingTags
    confidence: number
  }>
}
```

**How it integrates with the existing module:**

```typescript
// ai.events.ts
export const tagEntity = inngest.createFunction(
  { id: 'ai-tag-entity', name: 'AI: Auto-Tag Entity' },
  [
    { event: 'booking/created' },
    { event: 'review/submitted' },
    { event: 'team/created' },
  ],
  async ({ event, step }) => {
    const tenantId = event.data.tenantId

    // Check AI is enabled for this tenant
    const enabled = await step.run('check-enabled', () =>
      aiService.isFeatureEnabled(tenantId, 'AUTOMATED_TAGGING')
    )
    if (!enabled) return

    const suggestions = await step.run('generate-tags', () =>
      aiService.generateTags(tenantId, event.name, event.data)
    )

    if (suggestions.tags.length > 0) {
      await step.run('apply-tags', () =>
        aiService.applyTags(tenantId, event.name, event.data, suggestions.tags)
      )
    }
  }
)
```

Tags are stored in the existing tagging system (if the entity supports tags) or in a new `ai_entity_tags` junction table.

---

### 6.8 Data Entry from Unstructured Input

**What triggers it:** A tRPC procedure call from a "Paste to Fill" UI. The user pastes raw text (an email, a message, a note) and the AI extracts structured entity fields from it.

**What prompt it uses:** Template key `entity.extract`.

System prompt:
```
You are a data extraction assistant for a {{verticalDescription}} management platform.
Extract structured data from unstructured text input.

Target entity type: {{entityType}}
Required fields: {{requiredFieldsJson}}
Optional fields: {{optionalFieldsJson}}

Extract as many fields as possible from the text. Return null for fields you cannot confidently extract.
Dates should be in ISO 8601 format. Phone numbers in E.164 format. Names should be properly capitalised.
```

User prompt:
```
Extract {{entityType}} data from this text:

---
{{rawText}}
---
```

**What it returns:**

```typescript
interface ExtractedData {
  fields: Record<string, unknown>     // Field name -> extracted value
  confidence: number                   // Overall confidence 0-1
  warnings: string[]                   // 'Could not determine phone number format', etc.
  unmatchedText: string[]              // Segments that didn't map to any field
}
```

**How it integrates with the existing module:**

```typescript
// ai.router.ts
extractStructuredData: moduleProcedure
  .input(z.object({
    entityType: z.string(),
    rawText: z.string().min(10).max(10000),
    targetFields: z.array(z.object({
      name: z.string(),
      type: z.string(),
      required: z.boolean(),
    })).optional(),
  }))
  .mutation(({ ctx, input }) =>
    aiService.extractStructuredData(ctx.tenantId, input.entityType, input.rawText, input.targetFields)
  )
```

The `AIFillButton` component (when used in "paste mode") calls this procedure. The extracted fields are mapped to the form fields and shown as pre-filled values. Fields with low confidence are highlighted with an amber indicator. The user reviews and confirms before saving.

---

## 7. New Schema

### Summary of New Tables

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `prompt_templates` | Stores customisable AI prompt templates per tenant | `tenant_id`, `key`, `system_prompt`, `user_prompt`, `variables`, `model`, `max_tokens`, `temperature`, `is_default`, `active` |
| `ai_usage_records` | Tracks every AI API call for billing and analytics | `tenant_id`, `feature`, `input_tokens`, `output_tokens`, `model`, `estimated_cost`, `user_id`, `metadata` |
| `ai_tenant_config` | Per-tenant AI configuration and feature flags | `tenant_id`, `enabled`, `tier`, `default_model`, `monthly_token_limit`, `tone_description`, `brand_context`, `feature_flags` |
| `ai_review_drafts` | Stores AI-drafted review responses | `review_id`, `tenant_id`, `draft_text`, `model`, `status` (`pending`, `accepted`, `rejected`, `edited`) |
| `ai_workflow_suggestions` | Stores AI-suggested workflow automations | `tenant_id`, `name`, `trigger_event`, `actions`, `confidence`, `status` (`pending`, `applied`, `dismissed`) |
| `ai_entity_tags` | AI-generated tags for entities | `tenant_id`, `entity_type`, `entity_id`, `tag_name`, `confidence`, `auto_applied` |

### Full Column Definitions

**`prompt_templates`** (detailed in Section 4 above)

**`ai_usage_records`** (detailed in Section 5 above)

**`ai_tenant_config`** (detailed in Section 5 above)

**`ai_review_drafts`:**

```typescript
export const aiReviewDrafts = pgTable('ai_review_drafts', {
  id:         uuid().primaryKey().notNull().default(sql`gen_random_uuid()`),
  reviewId:   uuid().notNull(),
  tenantId:   uuid().notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  draftText:  text().notNull(),
  model:      text().notNull(),
  status:     text().notNull().default('pending'),   // 'pending' | 'accepted' | 'rejected' | 'edited'
  editedText: text(),                                // If status = 'edited', the human-modified version
  createdAt:  timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt:  timestamp({ precision: 3, mode: 'date' }).notNull(),
}, (table) => [
  index('ai_review_drafts_review_id_idx').on(table.reviewId),
  index('ai_review_drafts_tenant_id_idx').on(table.tenantId),
])
```

**`ai_workflow_suggestions`:**

```typescript
export const aiWorkflowSuggestions = pgTable('ai_workflow_suggestions', {
  id:                 uuid().primaryKey().notNull().default(sql`gen_random_uuid()`),
  tenantId:           uuid().notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  name:               text().notNull(),
  description:        text().notNull(),
  triggerEvent:       text().notNull(),
  actions:            jsonb().notNull(),               // Array of { type, config }
  estimatedTimeSaved: integer(),                       // Minutes per occurrence
  confidence:         text().notNull(),                // '0.85'
  status:             text().notNull().default('pending'), // 'pending' | 'applied' | 'dismissed'
  appliedWorkflowId:  uuid(),                          // Set when user clicks "Apply"
  createdAt:          timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  index('ai_workflow_suggestions_tenant_id_idx').on(table.tenantId),
  index('ai_workflow_suggestions_status_idx').on(table.status),
])
```

**`ai_entity_tags`:**

```typescript
export const aiEntityTags = pgTable('ai_entity_tags', {
  id:          uuid().primaryKey().notNull().default(sql`gen_random_uuid()`),
  tenantId:    uuid().notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  entityType:  text().notNull(),                       // 'booking', 'review', 'customer', etc.
  entityId:    uuid().notNull(),
  tagName:     text().notNull(),
  category:    text(),
  confidence:  text().notNull(),                       // '0.92'
  autoApplied: boolean().notNull().default(true),      // false if user manually added
  createdAt:   timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  index('ai_entity_tags_tenant_entity_idx').on(table.tenantId, table.entityType, table.entityId),
  index('ai_entity_tags_tenant_tag_idx').on(table.tenantId, table.tagName),
  uniqueIndex('ai_entity_tags_unique').on(table.tenantId, table.entityType, table.entityId, table.tagName),
])
```

---

## 8. New Inngest Events

Add to `src/shared/inngest.ts` `IronheartEvents`:

```typescript
"ai/generate.copy": {
  data: {
    tenantId: string
    trigger: string             // MessageTrigger value
    bookingId: string
    originalBody: string
  }
}

"ai/draft.review.response": {
  data: {
    reviewId: string
    tenantId: string
    bookingId: string
    customerId: string
    rating: number
  }
}

"ai/suggest.workflow": {
  data: {
    tenantId: string
    periodDays: number
  }
}

"ai/tag.entity": {
  data: {
    tenantId: string
    entityType: string
    entityId: string
    eventName: string           // The original event that triggered tagging
  }
}
```

**Note on event naming:** These AI-specific events are only needed if we want to decouple AI processing from the source events. For Tier 1, the AI Inngest functions can listen directly on existing events (`review/submitted`, `booking/created`, etc.) and check feature enablement inside the handler. The dedicated `ai/*` events become useful in Tier 2/3 when we need finer-grained control over AI task queuing and prioritisation.

For Tier 1 implementation, the recommended approach is:

- **Smart Notification Copy** — Direct step in existing notification Inngest functions (no new event needed)
- **Review Response Drafting** — Listen on `review/submitted` (no new event)
- **Workflow Suggestion** — Cron-triggered (no event) + on-demand via tRPC (no event)
- **Automated Tagging** — Listen on `booking/created`, `review/submitted`, `team/created` (no new events)

The `ai/*` events are defined for future use and for cases where other modules want to explicitly request AI processing.

---

## 9. AI-Aware Frontend Components

These components are part of the higher-level component library (Section 2 of the parent design doc). They are built alongside or after the backend to consume the AI tRPC procedures.

### 9.1 AIChatPanel

Slides in from the right side. Persistent across page navigation. Used for Tier 3 conversational agent, but the shell is built in Tier 1 for the simpler features.

```typescript
interface AIChatPanelProps {
  /** Whether the panel is open */
  open: boolean
  /** Callback to close the panel */
  onClose: () => void
  /** Initial context to seed the conversation (e.g. current page entity) */
  initialContext?: {
    entityType: string
    entityId: string
    entityLabel: string
  }
  /** Tenant branding for the chat header */
  tenantName: string
  /** Position of the panel */
  position?: 'right' | 'bottom'
  /** Maximum width when in 'right' position */
  maxWidth?: number           // default: 420
}
```

**Layout:** Fixed-position panel with a header (AI icon + "Assistant" label + close button), a scrollable message list (alternating user/assistant bubbles), and a bottom input bar with a text input + send button. Messages support markdown rendering. Assistant messages show a typing indicator while streaming. Suggestions appear as clickable chips above the input bar.

### 9.2 AIInsightCard

Displays an AI-generated insight on dashboards alongside `StatCard` components.

```typescript
interface AIInsightCardProps {
  /** The AI-generated insight text */
  insight: string
  /** Category of insight for icon selection */
  category: 'trend' | 'anomaly' | 'suggestion' | 'forecast'
  /** Confidence level shown as a subtle indicator */
  confidence: number           // 0-1
  /** When the insight was generated */
  generatedAt: Date
  /** Action button config (e.g. "View Details" -> navigate to relevant page) */
  action?: {
    label: string
    href: string
  }
  /** Callback when user dismisses the insight */
  onDismiss?: () => void
  /** Loading state while insight is being generated */
  loading?: boolean
  /** Size variant matching StatCard sizes */
  size?: '1x1' | '2x1'        // default: '2x1'
}
```

**Layout:** Card with a coloured left border (varies by category: blue for trend, amber for anomaly, green for suggestion, purple for forecast). Header row with category icon + "AI Insight" label + dismiss X button. Body text with the insight. Footer with confidence dot indicator + timestamp + optional action button.

### 9.3 AISuggestionBanner

Dismissable banner at the top of relevant pages. Shows proactive AI suggestions.

```typescript
interface AISuggestionBannerProps {
  /** The suggestion text */
  message: string
  /** Type of suggestion for styling */
  type: 'workflow' | 'optimisation' | 'followUp' | 'general'
  /** Primary action button */
  action?: {
    label: string              // 'Apply', 'View', 'Try It'
    onClick: () => void
  }
  /** Secondary action */
  secondaryAction?: {
    label: string              // 'Dismiss', 'Not Now', 'Learn More'
    onClick: () => void
  }
  /** Callback when banner is dismissed via X button */
  onDismiss: () => void
  /** Whether the banner has been seen before (for animation) */
  isNew?: boolean
}
```

**Layout:** Full-width banner with a subtle gradient background (blue-purple for AI). Left side: sparkle icon + message text. Right side: primary action button (filled) + secondary action button (ghost) + dismiss X. Enters with a slide-down animation when `isNew` is true. Persists dismissal state in localStorage keyed by suggestion ID.

### 9.4 AIFillButton

Small button adjacent to any form field. Clicking fetches an AI-suggested value for that specific field.

```typescript
interface AIFillButtonProps {
  /** The entity type being created/edited */
  entityType: string
  /** The specific field name to get a suggestion for */
  fieldName: string
  /** Current form values (used as context for the suggestion) */
  formContext: Record<string, unknown>
  /** Callback with the suggested value — form parent sets the field */
  onSuggest: (value: unknown) => void
  /** Whether to support paste-to-fill mode */
  pasteMode?: boolean
  /** Callback for paste-to-fill — receives all extracted fields */
  onPasteExtract?: (fields: Record<string, unknown>) => void
  /** Size variant */
  size?: 'sm' | 'md'          // default: 'sm'
  /** Disabled state (e.g. when AI module not enabled) */
  disabled?: boolean
}
```

**Layout:** A small icon button (sparkle/wand icon) positioned at the right edge of the form field. On click, shows a brief loading spinner, then populates the field with the suggested value. If `pasteMode` is true, clicking opens a paste dialog where the user can paste text for extraction. A tooltip shows "AI Fill" on hover, and "Suggested by AI" with confidence when a value has been filled.

### 9.5 NaturalLanguageFilter

Plain English search input that sits above any `DataGrid` component. Translates natural language to structured filters.

```typescript
interface NaturalLanguageFilterProps {
  /** Callback with the translated structured filters */
  onFiltersApplied: (filters: TranslatedSearchQuery) => void
  /** Available entity types for this context */
  entityTypes: string[]
  /** Placeholder text */
  placeholder?: string         // default: 'Search in plain English...'
  /** Whether AI translation is available (show fallback to normal search if not) */
  aiEnabled: boolean
  /** Callback for fallback text search when AI is not available */
  onFallbackSearch?: (query: string) => void
  /** Recent successful queries for quick-access chips */
  recentQueries?: string[]
  /** Size variant */
  size?: 'sm' | 'md' | 'lg'   // default: 'md'
}
```

**Layout:** An input field with a sparkle icon prefix (indicating AI-powered). On Enter or after a short debounce (500ms), the input value is sent to `ai.translateSearchQuery`. While translating, a subtle shimmer animation plays on the input border. After translation, the structured filters are shown as removable filter chips below the input (e.g. "Date: Next Week", "Customer: John", "Status: Confirmed"). If AI is disabled, the component falls back to a standard text search input with `onFallbackSearch`.

---

## 10. Implementation Tasks

### Wave 1: AI Module Foundation (Types, Schemas, Provider, Repository)

Tasks in this wave have no dependencies on each other and can be implemented in parallel.

**Task 1.1: Add `ModuleToolDefinition` to `ModuleManifest`**
- File: `src/shared/module-system/types.ts`
- Add `ModuleToolDefinition` interface and `toolDefinitions?: ModuleToolDefinition[]` to `ModuleManifest`
- No breaking changes — field is optional

**Task 1.2: Create Drizzle schema for AI tables**
- File: `src/shared/db/schemas/ai.schema.ts` (new)
- Define `promptTemplates`, `aiUsageRecords`, `aiTenantConfig`, `aiReviewDrafts`, `aiWorkflowSuggestions`, `aiEntityTags`
- Export from `src/shared/db/schema.ts` barrel

**Task 1.3: Create `ai.types.ts`**
- File: `src/modules/ai/ai.types.ts` (new)
- Define: `AIFeature` (string union), `AIPromptTemplate`, `AIUsageRecord`, `AIProviderConfig`, `AITenantConfig`, `AIReviewDraft`, `AIWorkflowSuggestion`, `AIEntityTag`, `TranslatedSearchQuery`, `GeneratedFormField`, `SuggestedDefaults`, `ExtractedData`, `TagSuggestion`, `WorkflowSuggestion`

**Task 1.4: Create `ai.schemas.ts`**
- File: `src/modules/ai/ai.schemas.ts` (new)
- Define Zod schemas for all tRPC inputs: `translateSearchQuerySchema`, `generateFormSchemaSchema`, `suggestDefaultsSchema`, `extractStructuredDataSchema`, `listPromptTemplatesSchema`, `upsertPromptTemplateSchema`, `deletePromptTemplateSchema`, `getUsageSummarySchema`, `suggestWorkflowsSchema`

**Task 1.5: Create provider abstraction types**
- File: `src/modules/ai/providers/types.ts` (new)
- Define: `AITextMessage`, `AIGenerateTextOptions`, `AIGenerateTextResult`, `AIGenerateStructuredOptions`, `AIGenerateStructuredResult`, `AIProvider` interface

**Task 1.6: Create Anthropic provider implementation**
- File: `src/modules/ai/providers/anthropic.ts` (new)
- Implement `AnthropicProvider` class with lazy-init singleton
- `generateText()` using `messages.create()`
- `generateStructured()` using `messages.create()` with `tool_use` for schema-constrained output
- Add `@anthropic-ai/sdk` and `zod-to-json-schema` to `package.json`

**Task 1.7: Create `ai.repository.ts`**
- File: `src/modules/ai/ai.repository.ts` (new)
- Prompt template CRUD: `listTemplates`, `getTemplateByKey`, `upsertTemplate`, `deleteTemplate`
- Usage tracking: `recordUsage`, `getUsageSummary`, `getDailyUsage`, `getMonthlyUsage`
- Tenant config: `getTenantConfig`, `upsertTenantConfig`
- AI review drafts: `saveReviewDraft`, `getReviewDraft`, `updateDraftStatus`
- Workflow suggestions: `saveWorkflowSuggestions`, `listSuggestions`, `updateSuggestionStatus`
- Entity tags: `saveTags`, `getTagsForEntity`, `listTenantTags`
- Helper: `getTenantsWithAIEnabled`

### Wave 2: Service Layer + Prompt Templates

Depends on Wave 1 completion.

**Task 2.1: Create `ai.service.ts` — core infrastructure methods**
- File: `src/modules/ai/ai.service.ts` (new)
- Implement: `resolveConfig(tenantId)`, `resolvePromptTemplate(tenantId, key)`, `interpolateTemplate(template, variables)`, `callWithTracking(tenantId, feature, callFn)`, `isFeatureEnabled(tenantId, feature)`, `checkRateLimit(tenantId)`
- Prompt assembly: load template, interpolate variables, construct messages array
- Provider resolution: get tenant config, apply model/temperature/maxTokens overrides

**Task 2.2: Create `ai.service.ts` — Tier 1 feature methods**
- File: `src/modules/ai/ai.service.ts` (extend from 2.1)
- Implement all eight feature methods:
  - `generateNotificationCopy(tenantId, trigger, originalBody, templateVars)`
  - `draftReviewResponse(tenantId, reviewId, bookingId, customerId, rating)`
  - `translateSearchQuery(tenantId, query)`
  - `generateFormSchema(tenantId, description)`
  - `suggestWorkflows(tenantId, periodDays?)`
  - `suggestDefaults(tenantId, entityType, context?)`
  - `generateTags(tenantId, eventName, eventData)`
  - `extractStructuredData(tenantId, entityType, rawText, targetFields?)`
- Each method: load relevant data from other repositories, assemble prompt, call provider, parse response, track usage

**Task 2.3: Seed default prompt templates**
- File: `src/modules/ai/ai.service.ts` (extend with `seedDefaultTemplates` method)
- Called during module enablement, similar to `moduleSettingsService.seedModuleSettings`
- Seeds all 8 template keys with well-crafted default system and user prompts
- Idempotent — skips if templates already exist for the tenant

### Wave 3: Tier 1 Feature Integrations (One Per Existing Module)

Depends on Wave 2 completion. These tasks modify existing module files to add AI integration points.

**Task 3.1: Smart Notification Copy integration**
- File: `src/modules/notification/notification.events.ts` (modify)
- Add AI copy enhancement step to `handleNotificationSendEmail` and `handleNotificationSendSms`
- Wrapped in try/catch with graceful fallback to original content
- Check `aiService.isFeatureEnabled(tenantId, 'SMART_NOTIFICATION_COPY')` before calling

**Task 3.2: Review Response Drafting integration**
- File: `src/modules/ai/ai.events.ts` (new Inngest function)
- Add `draftReviewResponse` function listening on `review/submitted`
- Load review details, customer history, previous responses for context
- Save draft to `ai_review_drafts` table

**Task 3.3: Automated Tagging integration**
- File: `src/modules/ai/ai.events.ts` (add Inngest function)
- Add `tagEntity` function listening on `booking/created`, `review/submitted`, `team/created`
- Load entity details, generate tags, save to `ai_entity_tags`

**Task 3.4: Workflow Suggestion cron**
- File: `src/modules/ai/ai.events.ts` (add Inngest function)
- Add `suggestWorkflows` cron function (daily at 06:00 UTC)
- Fan out across all AI-enabled tenants
- Load audit log summary, generate suggestions, save to `ai_workflow_suggestions`

### Wave 4: Router + Inngest Events + Manifest + Index

Depends on Waves 2-3 completion.

**Task 4.1: Create `ai.router.ts`**
- File: `src/modules/ai/ai.router.ts` (new)
- Synchronous AI procedures: `translateSearchQuery`, `generateFormSchema`, `suggestDefaults`, `extractStructuredData`
- Admin procedures: `listPromptTemplates`, `getPromptTemplate`, `upsertPromptTemplate`, `deletePromptTemplate`
- Usage procedures: `getUsageSummary`, `getDailyUsage`
- Config procedures: `getTenantConfig`, `updateTenantConfig`
- Review draft procedures: `getReviewDraft`, `updateDraftStatus`
- Workflow suggestion procedures: `listSuggestions`, `applySuggestion`, `dismissSuggestion`
- Module-gated via `createModuleMiddleware('ai')`

**Task 4.2: Create `ai.events.ts` — final assembly**
- File: `src/modules/ai/ai.events.ts` (finalise)
- Export `aiFunctions` array with all Inngest functions
- Ensure all functions follow step-based pattern with idempotency checks

**Task 4.3: Create `ai.manifest.ts`**
- File: `src/modules/ai/ai.manifest.ts` (new)
- Module manifest with slug `ai`, category `intelligence`
- `isCore: false`, `availability: 'addon'`
- Permissions: `['ai:read', 'ai:write', 'ai:admin']`
- Settings definitions for model, temperature, feature toggles
- Tool definitions for AI-specific tools

**Task 4.4: Create `index.ts` barrel export**
- File: `src/modules/ai/index.ts` (new)
- Export router, manifest, events, service, types

**Task 4.5: Add Inngest events to `src/shared/inngest.ts`**
- Add `ai/generate.copy`, `ai/draft.review.response`, `ai/suggest.workflow`, `ai/tag.entity` event types

**Task 4.6: Wire AI module into platform**
- File: `src/shared/module-system/register-all.ts` — register `aiManifest`
- File: `src/server/root.ts` — add `ai: aiRouter` to root router
- File: `src/app/api/inngest/route.ts` — add `aiFunctions` to `serve()` call

### Wave 5: Frontend AI Components

Depends on Wave 4 completion. Can begin in parallel with Wave 6 (tests).

**Task 5.1: Build `AIChatPanel` component**
- File: `src/components/ai/ai-chat-panel.tsx` (new)
- Shell only for Tier 1 (full conversational UI in Tier 3)
- Slide-in panel, message list, input bar

**Task 5.2: Build `AIInsightCard` component**
- File: `src/components/ai/ai-insight-card.tsx` (new)
- Category-coloured card with insight text, confidence indicator, action button

**Task 5.3: Build `AISuggestionBanner` component**
- File: `src/components/ai/ai-suggestion-banner.tsx` (new)
- Full-width dismissable banner with action buttons

**Task 5.4: Build `AIFillButton` component**
- File: `src/components/ai/ai-fill-button.tsx` (new)
- Icon button with loading state, tooltip, paste-mode dialog

**Task 5.5: Build `NaturalLanguageFilter` component**
- File: `src/components/ai/natural-language-filter.tsx` (new)
- Input with AI translation, filter chip display, fallback mode

### Wave 6: Tests + Verification

Depends on all previous waves. Can begin partially in parallel with Wave 5.

**Task 6.1: AI service unit tests**
- File: `src/modules/ai/__tests__/ai.service.test.ts` (new)
- Mock provider, test prompt assembly, variable interpolation, rate limiting, feature gating
- Test all 8 Tier 1 feature methods with mocked provider responses
- Test graceful fallback when provider fails
- Test usage tracking is called after every provider call

**Task 6.2: AI repository unit tests**
- File: `src/modules/ai/__tests__/ai.repository.test.ts` (new)
- Test prompt template CRUD with tenant scoping
- Test usage aggregation queries
- Test tenant config resolution order
- Test review draft lifecycle
- Test workflow suggestion status transitions

**Task 6.3: Provider unit tests**
- File: `src/modules/ai/__tests__/anthropic.provider.test.ts` (new)
- Mock `@anthropic-ai/sdk` client
- Test `generateText` message construction
- Test `generateStructured` tool_use construction and response parsing
- Test lazy initialisation (SDK not instantiated until first call)

**Task 6.4: Integration tests for notification AI enhancement**
- File: `src/modules/notification/__tests__/notification-ai.test.ts` (new)
- Test that notification events call AI enhancement when enabled
- Test graceful fallback when AI fails
- Test that notifications still send when AI module is disabled

**Task 6.5: `tsc` + build verification**
- Run `npx tsc --noEmit` — must pass with 0 errors
- Run `npm run build` — must pass
- Run `npx vitest run` — all tests must pass
- Verify no circular imports between AI module and other modules
