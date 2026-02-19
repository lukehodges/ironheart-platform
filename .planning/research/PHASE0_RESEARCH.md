# Phase 0: Scaffolding + Foundation — Research

**Researched:** 2026-02-19
**Domain:** Next.js 16 App Router project scaffolding, Inngest v3, Better Auth v1, Upstash Redis, Sentry, Pino, Prisma 6
**Confidence:** HIGH (stack choices verified against official docs and current sources)

---

## Summary

Phase 0 establishes the foundation that every subsequent module depends on. The key architectural decision is the migration from six Vercel Crons to Inngest event-driven functions — this changes how reservation expiry works from polling every minute to a single delayed function triggered at the exact expiry timestamp. The scaffold is best built by initialising a fresh `create-next-app` project and then copying the config files from the legacy codebase rather than forking the legacy project, because the legacy has 209 TypeScript files that would require surgical removal.

Better Auth v1 is a significant departure from NextAuth v4. It uses a different session model (database sessions vs JWT), a different route handler location (`/api/auth/[...all]/route.ts` instead of `/api/auth/[...nextauth]/route.ts`), and generates its own database tables via migration rather than relying on the Prisma `@auth/prisma-adapter`. For Phase 0 the goal is scaffold only — the full wiring happens in Phase 3.

The Prisma schema can be copied verbatim. The `prisma.config.ts` file is a Prisma 6 feature that replaces the `prisma` section in `package.json` — copy it directly. The legacy uses `PrismaPg` with a connection pool which is the correct pattern for serverless Vercel deployments.

**Primary recommendation:** Run `create-next-app`, copy config files from legacy, install new dependencies in a single pass, then scaffold each shared module with the exact file contents defined in this document.

---

## Research Question 1: Project Initialisation

### Verdict: Use `create-next-app`, then copy config files from legacy

**Why not fork the legacy:** The legacy has 209 TS files across deeply nested directories. Removing them is error-prone and leaves residual imports. A fresh scaffold is cleaner.

**Why not write config from scratch:** The legacy `next.config.ts`, `tsconfig.json`, `tailwind.config.ts`, and `prisma.config.ts` are all correct and battle-tested. Copy them directly.

### Initialisation command

```bash
npx create-next-app@latest ironheart-refactor \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --no-import-alias
```

Note: `--no-import-alias` is used because we will manually configure `@/*` → `./src/*` path in `tsconfig.json` (same as legacy). The `create-next-app` wizard sets `@/*` by default anyway; using `--no-import-alias` avoids the interactive prompt and we configure it ourselves.

### Files to copy verbatim from legacy

| Source | Destination | Notes |
|--------|-------------|-------|
| `next.config.ts` | `next.config.ts` | Security headers, image config — copy as-is |
| `tsconfig.json` | `tsconfig.json` | Same compiler options, paths |
| `prisma.config.ts` | `prisma.config.ts` | Prisma 6 config file |
| `prisma/schema.prisma` | `prisma/schema.prisma` | Full schema — see Q6 |
| `prisma/migrations/` | `prisma/migrations/` | All migration history |
| `.env.example` | `.env.example` | Template for required vars |

### Files to write fresh (do NOT copy from legacy)

| File | Why fresh |
|------|-----------|
| `src/app/layout.tsx` | New root layout, minimal — no legacy admin chrome |
| `src/app/page.tsx` | Health check page only |
| `src/middleware.ts` | Better Auth middleware (different from NextAuth) |
| `src/shared/trpc.ts` | Better Auth session (not NextAuth getServerSession) |
| `src/shared/db.ts` | Same pattern, moved to shared/ |
| `src/shared/inngest.ts` | New — does not exist in legacy |
| `src/shared/redis.ts` | New — does not exist in legacy |
| `src/app/api/inngest/route.ts` | New — replaces vercel.json crons |
| `src/app/api/auth/[...all]/route.ts` | New — Better Auth handler |

---

## Research Question 2: Inngest v3 Setup

**Confidence:** HIGH — verified against official Inngest docs and v3 migration guide

### Install

```bash
npm install inngest
```

No separate `@types/inngest` needed — the package ships full TypeScript types.

### Dev server

Inngest provides a local dev server that must run alongside `next dev`. In development, Inngest calls your local serve endpoint. Run in a separate terminal:

```bash
npx inngest-cli@latest dev
```

Or install locally and add to `package.json` scripts:

```json
"dev:inngest": "npx inngest-cli dev"
```

The dev server UI is available at `http://localhost:8288`.

### Environment variables

```bash
# Not needed in development (Inngest dev server auto-discovers)
# Required in production (Vercel):
INNGEST_SIGNING_KEY=signkey-prod-...   # From Inngest dashboard
INNGEST_EVENT_KEY=...                  # From Inngest dashboard
```

Inngest auto-reads `INNGEST_SIGNING_KEY` and `INNGEST_EVENT_KEY` from environment. In development with the dev server, these are not required.

### Client initialisation with typed events

The Inngest v3 TypeScript SDK uses `EventSchemas` with `fromRecord()` for pure TypeScript types (no Zod dependency required for the event catalog). This is the recommended pattern for a monorepo or when events are defined centrally.

**`src/shared/inngest.ts`:**

```typescript
import { Inngest, EventSchemas } from "inngest";

// Typed event catalog — every module emits/receives from this catalog.
// Add events here as modules are built.
type Events = {
  "booking/created": {
    data: { bookingId: string; tenantId: string };
  };
  "booking/confirmed": {
    data: { bookingId: string; tenantId: string };
  };
  "booking/cancelled": {
    data: { bookingId: string; tenantId: string; reason?: string };
  };
  "booking/completed": {
    data: { bookingId: string; tenantId: string };
  };
  "booking/reservation.expired": {
    data: { bookingId: string; tenantId: string };
  };
  "slot/reserved": {
    data: { slotId: string; bookingId: string; tenantId: string; expiresAt: string };
  };
  "slot/released": {
    data: { slotId: string; bookingId: string; tenantId: string };
  };
  "notification/send.email": {
    data: { to: string; templateId: string; variables: Record<string, string> };
  };
  "notification/send.sms": {
    data: { to: string; templateId: string; variables: Record<string, string> };
  };
  "calendar/sync.push": {
    data: { bookingId: string; userId: string };
  };
  "calendar/sync.pull": {
    data: { userId: string };
  };
  "calendar/webhook.received": {
    data: { channelId: string; resourceId: string };
  };
  "workflow/trigger": {
    data: { workflowId: string; event: string; data: Record<string, unknown> };
  };
  "review/request.send": {
    data: { bookingId: string; customerId: string; delay?: string };
  };
};

export const inngest = new Inngest({
  id: "ironheart",
  schemas: new EventSchemas().fromRecord<Events>(),
});
```

**Key type note:** In Inngest v3, each event in the `fromRecord()` map must have a `data` key wrapping the payload. The top-level type is `{ data: {...} }`, not the payload directly. This differs from how the event catalog is written in PROJECT.md — the PROJECT.md shows payload types, but Inngest wraps them in `{ data: ... }`.

### Serve route

**`src/app/api/inngest/route.ts`:**

```typescript
import { serve } from "inngest/next";
import { inngest } from "@/shared/inngest";
import { releaseExpiredReservation } from "@/modules/booking/booking.events";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    releaseExpiredReservation,
    // Add functions here as modules are built
  ],
});
```

The serve handler requires all three HTTP methods (GET, POST, PUT). GET returns function metadata. POST invokes functions. PUT registers functions with the Inngest platform.

### Scheduled (cron) function pattern

```typescript
export const myScheduledFunction = inngest.createFunction(
  { id: "my-scheduled-function" },
  { cron: "0 2 * * *" },          // Daily at 2am UTC
  async ({ step }) => {
    await step.run("do-work", async () => {
      // logic here
    });
  }
);
```

Timezone-aware cron: `{ cron: "TZ=Europe/London 0 2 * * *" }`

### Delayed event pattern with cancellation

This is the key pattern for replacing the `release-slots` cron. Instead of polling every minute, we emit a `slot/reserved` event when a slot is reserved, the Inngest function sleeps until the exact expiry time, then checks and releases if not yet confirmed.

```typescript
export const releaseExpiredReservation = inngest.createFunction(
  {
    id: "release-expired-reservation",
    cancelOn: [
      {
        // Cancel if the booking is confirmed before expiry
        event: "booking/confirmed",
        match: "data.bookingId",
      },
      {
        // Also cancel if cancelled manually
        event: "booking/cancelled",
        match: "data.bookingId",
      },
    ],
  },
  { event: "slot/reserved" },
  async ({ event, step }) => {
    // Sleep until the reservation expires
    await step.sleepUntil(
      "wait-for-expiry",
      new Date(event.data.expiresAt)
    );

    // After waking, release the slot
    await step.run("release-slot", async () => {
      // DB logic here (see Q8 for full implementation)
    });
  }
);
```

**How cancellation works:** `cancelOn` with `match: "data.bookingId"` means Inngest will cancel this function if a `booking/confirmed` event arrives where `data.bookingId` equals the bookingId from the triggering `slot/reserved` event. The match is a dot-path expression compared across both events. This is a first-class Inngest feature, not a workaround.

**`step.sleepUntil()` signature:**

```typescript
await step.sleepUntil(
  id: string,          // Unique step ID for idempotency
  date: Date | string  // ISO string or Date object
)
```

Accepts ISO 8601 strings or `Date` objects. The `expiresAt` stored in the DB should be serialised to ISO string when emitting the event.

---

## Research Question 3: Better Auth v1 Scaffold

**Confidence:** MEDIUM-HIGH — core API verified via official docs; org plugin config verified via official docs; exact schema migration is project-specific

### Install

```bash
npm install better-auth
```

Better Auth ships the `@better-auth/prisma` adapter separately — but for initial scaffold we only need the core package and the Prisma adapter:

```bash
npm install better-auth
# Prisma adapter is bundled in better-auth package as better-auth/adapters/prisma
```

### What Better Auth requires in the database

Better Auth generates its own tables (user, session, account, verification) via a CLI migration command:

```bash
npx better-auth migrate
```

**Critical:** Do NOT copy these tables from the legacy codebase. The legacy uses NextAuth's `@auth/prisma-adapter` which has a different schema. Better Auth generates its own schema. Run `npx better-auth migrate` to add the required tables.

Better Auth will add these tables alongside the existing 42 models in the schema:
- `user` (may conflict with existing `User` model — see gotcha below)
- `session`
- `account`
- `verification`

**Gotcha:** The legacy codebase already has a `User` model (`@@map("users")`). Better Auth also wants a `user` table. You will need to configure Better Auth to use the existing `users` table rather than creating a new one, or configure `modelId` mapping. This is a Phase 3 concern — for Phase 0 scaffold only, the auth config file is created but the migration is deferred.

### Minimum scaffold for `src/modules/auth/auth.config.ts`

This is the scaffold file — fully wired auth is Phase 3 work.

```typescript
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { organization } from "better-auth/plugins";
import { db } from "@/shared/db";

export const auth = betterAuth({
  database: prismaAdapter(db, {
    provider: "postgresql",
  }),

  // Email + password authentication (matches legacy credentials provider)
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    // Password hashing uses bcrypt by default — compatible with legacy bcryptjs hashes
    // if we migrate users with their existing password hashes
  },

  // Session configuration
  session: {
    expiresIn: 60 * 60 * 24 * 7,       // 7 days (matches legacy refresh token TTL)
    updateAge: 60 * 60 * 24,            // Refresh session if accessed after 24h
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5,                   // Cache session in cookie for 5 minutes
    },
  },

  // Multi-tenant organisation support
  plugins: [
    organization({
      // Allow any authenticated user to create an organisation (tenant)
      // In production, restrict this to platform admins
      allowUserToCreateOrganization: true,
    }),
  ],
});

// Export type for use in tRPC context and server components
export type Auth = typeof auth;
```

### Next.js route handler

**`src/app/api/auth/[...all]/route.ts`:**

```typescript
import { auth } from "@/modules/auth/auth.config";
import { toNextJsHandler } from "better-auth/next-js";

export const { GET, POST } = toNextJsHandler(auth.handler);
```

Note: Better Auth uses `[...all]` not `[...nextauth]`. The route location changes.

### Session access in server components and tRPC

```typescript
import { auth } from "@/modules/auth/auth.config";
import { headers } from "next/headers";

// In a server component or tRPC context function:
const session = await auth.api.getSession({
  headers: await headers(),
});
```

This replaces `getServerSession(authConfig)` from the legacy.

### Middleware

**`src/middleware.ts`:**

```typescript
import { betterAuthMiddleware } from "better-auth/next-js";
import { auth } from "@/modules/auth/auth.config";

export default betterAuthMiddleware(auth);

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
```

### Environment variables

```bash
BETTER_AUTH_SECRET=...          # Random 32+ char secret
BETTER_AUTH_URL=http://localhost:3000   # Full URL of your app
```

---

## Research Question 4: Upstash Redis

**Confidence:** HIGH — official Upstash docs confirm this pattern

### Install

```bash
npm install @upstash/redis
```

The `@upstash/redis` client is HTTP-based (not TCP), making it safe for serverless environments (Vercel Edge Functions, Node.js serverless). No connection pooling required — each request creates a new HTTP call.

### Environment variables

```bash
UPSTASH_REDIS_REST_URL=https://your-db.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token
```

Both are available from the Upstash Console after creating a Redis database.

### Client singleton

**`src/shared/redis.ts`:**

```typescript
import { Redis } from "@upstash/redis";

// @upstash/redis uses HTTP REST calls — safe to instantiate at module level.
// No connection pool is maintained; each command is an HTTP request.
// The SDK handles keep-alive internally.
export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});
```

No `globalThis` caching pattern needed — unlike Prisma's TCP connection pool, `@upstash/redis` is stateless HTTP. A module-level singleton is safe in serverless.

### Usage patterns for this project

```typescript
// Rate limiting
await redis.incr(`rate:${ip}:${Math.floor(Date.now() / 60000)}`);
await redis.expire(`rate:${ip}:${Math.floor(Date.now() / 60000)}`, 60);

// Caching tenant lookup
await redis.setex(`tenant:${slug}`, 300, JSON.stringify(tenant));
const cached = await redis.get<Tenant>(`tenant:${slug}`);

// Session blacklisting
await redis.setex(`session:revoked:${sessionId}`, 86400, "1");
```

---

## Research Question 5: Sentry

**Confidence:** HIGH — official Sentry docs confirm Next.js App Router setup

### Install via wizard (recommended)

```bash
npx @sentry/wizard@latest -i nextjs
```

The wizard creates all required files automatically. It asks for your DSN and project details. This is preferable to manual setup because the wizard correctly handles the Next.js 16 instrumentation hooks.

### Files the wizard creates

| File | Purpose |
|------|---------|
| `sentry.client.config.ts` | Browser-side Sentry init |
| `sentry.server.config.ts` | Node.js server-side Sentry init |
| `sentry.edge.config.ts` | Edge runtime Sentry init |
| `instrumentation.ts` | Next.js instrumentation hook (loads server/edge configs) |
| `instrumentation-client.ts` | Client-side instrumentation hook |
| `src/app/global-error.tsx` | Root error boundary that reports to Sentry |

### Manual setup (if wizard is too invasive)

If you want minimal Sentry footprint:

**`sentry.client.config.ts`:**

```typescript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  debug: false,
  // Suppress noisy integrations in development
  integrations: [],
});
```

**`sentry.server.config.ts`:**

```typescript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  debug: false,
});
```

**`instrumentation.ts`** (required for Next.js App Router):

```typescript
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}
```

**`next.config.ts`** — wrap with Sentry:

```typescript
import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ... existing config from legacy
};

export default withSentryConfig(nextConfig, {
  org: "your-org-slug",
  project: "ironheart-refactor",
  silent: !process.env.CI,
  widenClientFileUpload: true,
  hideSourceMaps: true,
  disableLogger: true,
  automaticVercelMonitors: false,  // We use Inngest, not Vercel Crons
});
```

### Environment variables

```bash
NEXT_PUBLIC_SENTRY_DSN=https://...@sentry.io/...
SENTRY_ORG=your-org
SENTRY_PROJECT=ironheart-refactor
SENTRY_AUTH_TOKEN=...   # For source map uploads in CI
```

### Avoiding Sentry noise

- Set `tracesSampleRate: 0.1` in production (10% of requests)
- Set `debug: false` always
- Set `automaticVercelMonitors: false` — we are not using Vercel Cron Monitors
- Do not enable `spotlight` in production
- The `disableLogger: true` option in `withSentryConfig` suppresses Sentry's own console output during builds

---

## Research Question 6: Prisma Schema

**Confidence:** HIGH

### Can the legacy `prisma/schema.prisma` be copied directly?

**Yes.** The legacy schema is self-contained at `prisma/schema.prisma`. There is no multi-file schema in use — the `prisma.config.ts` file points to a single `prisma/schema.prisma` file via `schema: "prisma/schema.prisma"`. Copy both files.

### The `prisma.config.ts` file

This is a **Prisma 6 feature**. It replaces the `"prisma": { "seed": "..." }` section in `package.json`. The `prisma.config.ts` in the legacy is minimal:

```typescript
import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
```

Copy this verbatim. It requires `dotenv` which the legacy has installed.

### Schema datasource gotcha

The legacy schema does NOT include `url` in the datasource block:

```prisma
datasource db {
  provider = "postgresql"
  // No url here — it comes from prisma.config.ts
}
```

This is correct for Prisma 6 when using `prisma.config.ts`. Do not add `url = env("DATABASE_URL")` to the datasource block — it causes a conflict when `prisma.config.ts` also specifies the datasource URL.

### Copy the full migrations directory

Copy `prisma/migrations/` entirely. Since we are using the same PostgreSQL database as the legacy system, we must not re-run `prisma migrate dev`. Instead:

```bash
prisma migrate deploy   # Apply any pending migrations
```

This applies migrations without creating new ones, keeping the DB in sync.

### Additional packages needed for legacy-compatible Prisma setup

The legacy uses `PrismaPg` (native pg driver adapter). Install these:

```bash
npm install pg @prisma/adapter-pg
npm install -D @prisma/client prisma
```

Versions to match (from legacy `package.json`):
- `prisma`: `^7.3.0`
- `@prisma/client`: `^7.3.0`
- `@prisma/adapter-pg`: `^7.3.0`
- `pg`: `^8.17.2`

Note: The legacy `package.json` shows `prisma@^7.3.0` in devDependencies and `@prisma/client@^7.3.0` in devDependencies. This is unusual — `@prisma/client` is typically a runtime dependency. Match the legacy placement.

---

## Research Question 7: tRPC Context Migration

**Confidence:** HIGH — derived from direct reading of legacy source

### What the legacy `src/server/trpc.ts` contains

The legacy tRPC file contains:
1. Context type and `createContext()` function
2. `initTRPC` setup with superjson transformer
3. Base exports: `router`, `publicProcedure`, `middleware`
4. `protectedProcedure` — requires session
5. `tenantProcedure` — requires session + tenant isolation
6. `permissionProcedure(requiredPermission)` — RBAC check
7. `createModuleMiddleware(moduleSlug)` — module feature gating
8. Module-specific procedures: `patientProcedure`, `reviewProcedure`, `formsProcedure`, `waitlistProcedure`, `staffProcedure`
9. `platformAdminProcedure` — cross-tenant platform admin

### What changes in `src/shared/trpc.ts`

**Remove from shared:**
- `createModuleMiddleware` and all module-specific procedures (`patientProcedure`, `reviewProcedure`, etc.) — these are defined per-module in their own module files
- `permissionProcedure` — this may stay in shared but should accept a callback instead of hardcoding the RBAC DB query pattern

**Change in shared:**
- Replace `getServerSession(authConfig)` with Better Auth's `auth.api.getSession({ headers: await headers() })`
- Replace `import { authConfig } from '@/lib/auth'` with Better Auth import
- The `session` type changes from NextAuth's `Session` to Better Auth's session type

**Keep in shared:**
- `router`, `publicProcedure`, `middleware` base exports
- `protectedProcedure` (auth check, different session source)
- `tenantProcedure` (tenant isolation logic)
- `platformAdminProcedure` (platform admin check)

### `src/shared/trpc.ts` scaffold for Phase 0

```typescript
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { db } from "@/shared/db";
import { headers } from "next/headers";
import { auth } from "@/modules/auth/auth.config";

export type Context = {
  db: typeof db;
  // Phase 0: session is 'unknown' until Better Auth is fully wired in Phase 3
  // This will be replaced with the Better Auth session type in Phase 3
  session: Awaited<ReturnType<typeof auth.api.getSession>> | null;
  tenantId: string;
  tenantSlug: string;
  tenantDetectedFrom?: string;
};

export async function createContext(): Promise<Context> {
  // Phase 0 stub — Better Auth session retrieval
  // Full wiring in Phase 3
  let session: Context["session"] = null;
  try {
    session = await auth.api.getSession({ headers: await headers() });
  } catch {
    // Session not available (unauthenticated request)
  }

  // Tenant detection: session → subdomain → default
  let tenantId = "default";
  let tenantSlug = process.env.DEFAULT_TENANT_SLUG || "";
  let tenantDetectedFrom = "default";

  // TODO Phase 3: Extract tenantId from Better Auth session/organisation
  // Better Auth's organisation plugin stores org membership differently from legacy

  return { db, session, tenantId, tenantSlug, tenantDetectedFrom };
}

const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;
export const middleware = t.middleware;

export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You must be logged in to access this resource",
    });
  }
  return next({ ctx: { ...ctx, session: ctx.session } });
});

export const tenantProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  return next({
    ctx: {
      ...ctx,
      tenantId: ctx.tenantId,
      tenantSlug: ctx.tenantSlug,
    },
  });
});

export const platformAdminProcedure = protectedProcedure.use(
  async ({ ctx, next }) => {
    // TODO Phase 3: Implement platform admin check with Better Auth
    // Legacy uses isPlatformAdmin field on User or PLATFORM_ADMIN_EMAILS env var
    return next({ ctx });
  }
);
```

**Important:** The tRPC context in Next.js App Router must be created using `createCallerFactory` or the fetch adapter. The legacy uses the old `createContext({ req })` signature. In tRPC 11 with App Router, the context function signature changed. See the app router route handler section in Phase 1 research for exact tRPC 11 App Router handler setup.

---

## Research Question 8: The Proof-of-Concept Inngest Function

**Confidence:** HIGH

### What the legacy cron does

The legacy `release-slots` cron:
1. Runs every 1 minute via Vercel Cron
2. Queries all bookings with `status: 'RESERVED'` and `reservationExpiresAt <= now`
3. For each expired booking, runs a transaction that:
   - Updates booking status to `'RELEASED'`
   - Creates a `BookingStatusHistory` entry
   - Decrements `bookedCount` on the `AvailableSlot`
   - Sets `available: true` on the slot
   - Deletes `BookingAssignment` rows for that booking
4. Returns a count of released bookings

### The new Inngest pattern (event-driven, not polling)

**When a slot is reserved:** emit `slot/reserved` event with the expiry timestamp.
**Inngest function:** sleeps until expiry, then releases if not cancelled.
**Cancellation:** the function is auto-cancelled if `booking/confirmed` arrives with the same `bookingId` before expiry.

This eliminates the polling entirely. Each reservation gets its own Inngest function run that sleeps precisely until the expiry moment.

**`src/modules/booking/booking.events.ts`:**

```typescript
import { inngest } from "@/shared/inngest";
import { db } from "@/shared/db";
import { logger } from "@/shared/logger";

/**
 * Replaces: /api/cron/release-slots (Vercel Cron, every 1 minute)
 *
 * Triggered by: "slot/reserved" event (emitted when a booking is created
 * with RESERVED status via the public portal)
 *
 * Auto-cancelled by: "booking/confirmed" or "booking/cancelled" events
 * with matching bookingId — meaning the user completed checkout before expiry.
 *
 * Pattern: delayed event (not cron) — sleeps until the exact expiry timestamp.
 */
export const releaseExpiredReservation = inngest.createFunction(
  {
    id: "release-expired-reservation",
    cancelOn: [
      {
        event: "booking/confirmed",
        match: "data.bookingId",
      },
      {
        event: "booking/cancelled",
        match: "data.bookingId",
      },
    ],
  },
  { event: "slot/reserved" },
  async ({ event, step }) => {
    const { bookingId, slotId, expiresAt } = event.data;

    // Sleep until the exact reservation expiry time
    await step.sleepUntil("wait-for-expiry", new Date(expiresAt));

    // After waking: verify the booking is still RESERVED
    // (defensive check in case cancellation event was missed)
    const booking = await step.run("check-booking-status", async () => {
      return db.booking.findUnique({
        where: { id: bookingId },
        select: { id: true, status: true, slotId: true, bookingNumber: true },
      });
    });

    if (!booking || booking.status !== "RESERVED") {
      // Already confirmed, cancelled, or released — nothing to do
      logger.info("Reservation already resolved, skipping release", {
        bookingId,
        status: booking?.status ?? "not found",
      });
      return { released: false, reason: "already_resolved" };
    }

    // Release the slot in a transaction
    const result = await step.run("release-slot", async () => {
      const now = new Date();

      await db.$transaction(async (tx) => {
        // Update booking status to RELEASED
        await tx.booking.update({
          where: { id: bookingId },
          data: {
            status: "RELEASED",
            statusChangedAt: now,
          },
        });

        // Create status history entry
        await tx.bookingStatusHistory.create({
          data: {
            bookingId,
            fromStatus: "RESERVED",
            toStatus: "RELEASED",
            reason: "Reservation expired (15-minute timeout)",
          },
        });

        // Restore slot availability if booking had a slot
        if (slotId) {
          await tx.availableSlot.update({
            where: { id: slotId },
            data: {
              bookedCount: { decrement: 1 },
              available: true,
            },
          });

          // Clean up staff assignments
          await tx.bookingAssignment.deleteMany({
            where: { bookingId },
          });
        }
      });

      return { released: true, bookingNumber: booking.bookingNumber };
    });

    logger.info("Released expired reservation", {
      bookingId,
      bookingNumber: result.bookingNumber,
    });

    return result;
  }
);
```

### How to emit the event when a reservation is created

In the booking service (Phase 1), after creating a RESERVED booking:

```typescript
await inngest.send({
  name: "slot/reserved",
  data: {
    slotId: booking.slotId,
    bookingId: booking.id,
    tenantId: booking.tenantId,
    expiresAt: booking.reservationExpiresAt.toISOString(),
  },
});
```

### Key advantages over the legacy cron

| Legacy cron | Inngest function |
|-------------|-----------------|
| Polls every 1 minute — max 1 minute delay after expiry | Wakes at exact expiry second |
| Processes ALL expired bookings in one run — risk of timeout | Each booking is its own isolated function run |
| No automatic cancellation on confirm | `cancelOn` auto-cancels on `booking/confirmed` |
| Requires `CRON_SECRET` auth header | Signed by Inngest — no secret management |
| Vercel Cron limits (daily runs on free tier) | Runs on Inngest's infrastructure |

---

## Standard Stack

### Core packages to install

```bash
# Background jobs
npm install inngest

# Auth
npm install better-auth

# Cache
npm install @upstash/redis

# Monitoring
npm install @sentry/nextjs pino pino-pretty

# API layer (matching legacy versions)
npm install @trpc/server@^11.0.0 @trpc/client@^11.0.0 @trpc/react-query@^11.0.0
npm install superjson@^2.2.6
npm install zod@^4.3.5
npm install @tanstack/react-query@^5.90.19

# Database (matching legacy versions)
npm install pg @prisma/adapter-pg
npm install -D @prisma/client prisma

# Utilities
npm install date-fns clsx tailwind-merge lucide-react

# Dev
npm install -D typescript @types/node @types/react @types/react-dom @types/pg
npm install -D tsx ts-node
```

### Full install command

```bash
npm install inngest better-auth @upstash/redis @sentry/nextjs pino pino-pretty \
  @trpc/server@^11.0.0 @trpc/client@^11.0.0 @trpc/react-query@^11.0.0 \
  superjson@^2.2.6 zod@^4.3.5 @tanstack/react-query@^5.90.19 \
  pg @prisma/adapter-pg date-fns clsx tailwind-merge lucide-react

npm install -D @prisma/client@^7.3.0 prisma@^7.3.0 @types/node @types/react \
  @types/react-dom @types/pg tsx ts-node
```

---

## Architecture Patterns

### Recommended directory structure for Phase 0

```
src/
  modules/
    booking/
      booking.events.ts          ← POC Inngest function (Phase 0 deliverable)
      booking.router.ts          ← placeholder
      booking.service.ts         ← placeholder
      booking.repository.ts      ← placeholder
      booking.schemas.ts         ← placeholder
    auth/
      auth.config.ts             ← Better Auth scaffold
    scheduling/                  ← placeholder
    notification/                ← placeholder
    calendar-sync/               ← placeholder
    workflow/                    ← placeholder
    tenant/                      ← placeholder
    customer/                    ← placeholder
    review/                      ← placeholder
    forms/                       ← placeholder
    staff/                       ← placeholder
    portal/                      ← placeholder
  shared/
    db.ts                        ← Prisma client (copy + adapt from legacy)
    inngest.ts                   ← Inngest client + typed event catalog
    redis.ts                     ← Upstash Redis client
    logger.ts                    ← Pino (copy from legacy)
    errors.ts                    ← Custom error types (new)
    trpc.ts                      ← tRPC context + middleware
  app/
    api/
      inngest/
        route.ts                 ← Inngest serve handler
      auth/
        [...all]/
          route.ts               ← Better Auth handler
      trpc/
        [trpc]/
          route.ts               ← tRPC handler (Phase 1)
    layout.tsx                   ← Minimal root layout
    page.tsx                     ← Health check
  middleware.ts                  ← Better Auth middleware
```

### Placeholder file pattern

Each module placeholder file should export a comment and a typed stub, so TypeScript doesn't complain about empty modules:

```typescript
// src/modules/scheduling/index.ts
// Placeholder — implemented in Phase 2
export {};
```

For modules with events files (that need to be registered in the Inngest serve route):

```typescript
// src/modules/notification/notification.events.ts
// Placeholder — implemented in Phase 4
import type { InngestFunction } from "inngest";
export const notificationFunctions: InngestFunction<any, any, any>[] = [];
```

---

## Shared Files: Exact Contents

### `src/shared/db.ts`

Copy the legacy `src/lib/db.ts` verbatim, changing only the import path:

```typescript
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  // Small pool for serverless — avoids exhausting PgBouncer connection limits
  const pool = new Pool({
    connectionString,
    max: 2,
    idleTimeoutMillis: 30000,
  });
  const adapter = new PrismaPg(pool);

  return new PrismaClient({ adapter });
}

export const db = globalForPrisma.prisma ?? createPrismaClient();
globalForPrisma.prisma = db;
```

### `src/shared/logger.ts`

Copy the legacy `src/lib/logger.ts` verbatim:

```typescript
import pino from "pino";

export const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  transport:
    process.env.NODE_ENV === "development"
      ? {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "SYS:standard",
            ignore: "pid,hostname",
          },
        }
      : undefined,
});

export const log = {
  info: (msg: string, data?: object) => logger.info(data, msg),
  warn: (msg: string, data?: object) => logger.warn(data, msg),
  error: (msg: string, error?: Error | object) =>
    logger.error({ err: error }, msg),
  debug: (msg: string, data?: object) => logger.debug(data, msg),
};
```

### `src/shared/errors.ts`

New file — does not exist in legacy (errors are ad-hoc `TRPCError` throws):

```typescript
import { TRPCError } from "@trpc/server";

export class NotFoundError extends Error {
  constructor(resource: string, id: string) {
    super(`${resource} not found: ${id}`);
    this.name = "NotFoundError";
  }
}

export class ForbiddenError extends Error {
  constructor(message = "Access denied") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

// Convert domain errors to tRPC errors at the router layer
export function toTRPCError(error: unknown): TRPCError {
  if (error instanceof NotFoundError) {
    return new TRPCError({ code: "NOT_FOUND", message: error.message });
  }
  if (error instanceof ForbiddenError) {
    return new TRPCError({ code: "FORBIDDEN", message: error.message });
  }
  if (error instanceof ValidationError) {
    return new TRPCError({ code: "BAD_REQUEST", message: error.message });
  }
  if (error instanceof TRPCError) {
    return error;
  }
  return new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: "An unexpected error occurred",
  });
}
```

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Delayed job execution | Custom setTimeout / DB polling | `step.sleepUntil()` in Inngest | Inngest handles distributed sleep, retry, and cancellation atomically |
| Job cancellation | Custom cancellation flag in DB | `cancelOn` in Inngest | First-class feature — no race conditions |
| Rate limiting | Custom Redis counter logic | `@upstash/ratelimit` (Phase 6) | Handles sliding window, fixed window, token bucket with atomic Redis ops |
| Auth session management | Custom JWT with refresh tokens | Better Auth sessions | Legacy JWT system is 300+ lines; Better Auth handles rotation and revocation |
| Error tracking | Custom error logging to DB | Sentry | Source maps, grouping, alerts, performance tracing |
| HTTP-based Redis | Custom fetch wrapper for Redis REST | `@upstash/redis` | Handles retries, JSON serialisation, TypeScript generics |

---

## Common Pitfalls

### Pitfall 1: Inngest typed events `data` wrapper

**What goes wrong:** The Inngest `EventSchemas.fromRecord<T>()` type parameter expects each value to be `{ data: {...} }`, not the raw payload. Writing `"slot/reserved": { slotId: string }` causes TypeScript errors when calling `inngest.send()` or `event.data` in functions.

**How to avoid:** Always wrap payload in `data`:

```typescript
// Correct
type Events = {
  "slot/reserved": {
    data: { slotId: string; bookingId: string; expiresAt: string };
  };
};

// Wrong — missing data wrapper
type Events = {
  "slot/reserved": { slotId: string; bookingId: string; expiresAt: string };
};
```

### Pitfall 2: Better Auth vs NextAuth schema conflict

**What goes wrong:** Better Auth wants to create a `user` table. The legacy already has a `users` table (via `@@map("users")` on the `User` model). Running `npx better-auth migrate` creates a separate `user` table, causing a conflict.

**How to avoid:** In Phase 3, configure Better Auth to map to the existing `users` table using the `modelId` option in the Prisma adapter, or use custom models. Phase 0 only creates the config file — do NOT run `npx better-auth migrate` in Phase 0.

### Pitfall 3: Prisma datasource URL double-specification

**What goes wrong:** If `DATABASE_URL` is specified in both `datasource db { url = env("DATABASE_URL") }` in the schema AND in `prisma.config.ts`, Prisma 6 may error or behave unpredictably.

**How to avoid:** The legacy schema has no `url` line in the datasource block. Keep it that way when copying — the URL comes from `prisma.config.ts` exclusively.

### Pitfall 4: Inngest function not registered in serve route

**What goes wrong:** An Inngest function is defined but not added to the `functions` array in the serve route handler. The function never runs, and Inngest silently ignores it.

**How to avoid:** Every Inngest function must be explicitly listed in `serve({ functions: [...] })`. Consider creating a barrel export per module:

```typescript
// src/modules/booking/index.ts
export { releaseExpiredReservation } from "./booking.events";

// src/app/api/inngest/route.ts
import { releaseExpiredReservation } from "@/modules/booking";
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [releaseExpiredReservation],
});
```

### Pitfall 5: `step.sleepUntil` with a past timestamp

**What goes wrong:** If `expiresAt` is in the past when the Inngest function starts (e.g., the event was delayed or processing was slow), `step.sleepUntil` with a past date wakes immediately. This is correct behaviour — the slot gets released promptly. However, if `expiresAt` is miscalculated (e.g., stored as local time instead of UTC), the slot may release too early or too late.

**How to avoid:** Always store `reservationExpiresAt` as UTC in the DB (Prisma `DateTime` is UTC). Always serialise to ISO string when emitting: `booking.reservationExpiresAt.toISOString()`. Never use `.toString()` which produces locale-dependent output.

### Pitfall 6: `create-next-app` Tailwind CSS 4 incompatibility

**What goes wrong:** `create-next-app` installs Tailwind CSS and creates a `globals.css` with v3-style `@tailwind base; @tailwind components; @tailwind utilities;` directives. The legacy uses Tailwind CSS v4 which uses `@import "tailwindcss"` instead.

**How to avoid:** After running `create-next-app`, replace `globals.css` content and ensure `@tailwindcss/postcss` is installed (it handles Tailwind 4's PostCSS integration). The legacy's `tailwind.config.ts` (if it exists) or `next.config.ts` tailwind section should be copied.

### Pitfall 7: tRPC context in App Router requires fetchAdapter

**What goes wrong:** The legacy creates the tRPC handler using `createNextApiHandler` (Pages Router pattern). In Next.js App Router, tRPC 11 uses `fetchRequestHandler` instead.

**How to avoid:** The serve route for tRPC in App Router looks like:

```typescript
// src/app/api/trpc/[trpc]/route.ts
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { createContext } from "@/shared/trpc";
import { appRouter } from "@/modules/_app.router";

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () => createContext(),
  });

export { handler as GET, handler as POST };
```

---

## Environment Variables Reference

Consolidated `.env.example` for the refactor project:

```bash
# Database (same as legacy — same PostgreSQL DB)
DATABASE_URL=postgresql://user:password@host:5432/dbname

# Better Auth
BETTER_AUTH_SECRET=your-32-char-random-secret
BETTER_AUTH_URL=http://localhost:3000

# Inngest (not needed in development with dev server)
INNGEST_SIGNING_KEY=signkey-prod-...
INNGEST_EVENT_KEY=...

# Upstash Redis
UPSTASH_REDIS_REST_URL=https://your-db.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token

# Sentry
NEXT_PUBLIC_SENTRY_DSN=https://...@sentry.io/...
SENTRY_ORG=your-org-slug
SENTRY_PROJECT=ironheart-refactor
SENTRY_AUTH_TOKEN=...

# Application
DEFAULT_TENANT_SLUG=default
LOG_LEVEL=info
NODE_ENV=development
```

---

## State of the Art

| Legacy Pattern | New Pattern | Why |
|----------------|-------------|-----|
| NextAuth v4 JWT sessions | Better Auth v1 database sessions | Better Auth has first-class org/RBAC support; JWT sessions lack server-side revocation |
| Vercel Crons (6 routes) | Inngest event-driven functions | Exact timing, cancellation, retry, no polling |
| `src/lib/db.ts` singleton | `src/shared/db.ts` singleton | Same pattern, new location matching module structure |
| Manual CRON_SECRET auth | Inngest signing key | Cryptographic request signing — more secure |
| `console.log` + pino | pino only (consistent) | Structured logging throughout |
| `next-auth` middleware | Better Auth middleware | Matches new auth system |

---

## Open Questions

1. **Better Auth user table conflict**
   - What we know: Legacy has `User` model with `@@map("users")`. Better Auth wants a `user` table.
   - What's unclear: Whether Better Auth's Prisma adapter can be configured to use the existing `users` table with its existing fields (including staff-merged fields) without schema conflicts.
   - Recommendation: For Phase 0, create the auth config stub only. Investigate `modelId` mapping and `customModels` option in Better Auth before Phase 3 planning.

2. **tRPC 11 context function signature with Better Auth**
   - What we know: tRPC 11 with App Router uses `fetchRequestHandler`, context is a function called per request.
   - What's unclear: Better Auth's `auth.api.getSession({ headers })` requires `import { headers } from 'next/headers'` which is a server component API. Calling it inside the tRPC fetch adapter may behave differently than expected.
   - Recommendation: Verify this works in Phase 1 when the tRPC route is first wired up. Alternative: pass the raw `Request` object through context and extract headers from it.

3. **Inngest v3 SDK version in package registry**
   - What we know: Inngest SDK v3 is the current major version.
   - What's unclear: The exact latest patch version to pin. `npm install inngest` will install the latest, but we should pin to a specific version for reproducibility.
   - Recommendation: Run `npm install inngest` and record the installed version in package.json. As of research date, v3.x is stable.

---

## Sources

### Primary (HIGH confidence)
- Inngest Next.js Quick Start: [https://www.inngest.com/docs/getting-started/nextjs-quick-start](https://www.inngest.com/docs/getting-started/nextjs-quick-start)
- Inngest Serve Reference: [https://www.inngest.com/docs/reference/serve](https://www.inngest.com/docs/reference/serve)
- Inngest TypeScript SDK: [https://www.inngest.com/docs/typescript](https://www.inngest.com/docs/typescript)
- Inngest step.sleepUntil: [https://www.inngest.com/docs/reference/functions/step-sleep-until](https://www.inngest.com/docs/reference/functions/step-sleep-until)
- Inngest cancelOn: [https://www.inngest.com/docs/reference/typescript/functions/cancel-on](https://www.inngest.com/docs/reference/typescript/functions/cancel-on)
- Inngest Cron/Scheduled Functions: [https://www.inngest.com/docs/guides/scheduled-functions](https://www.inngest.com/docs/guides/scheduled-functions)
- Better Auth Next.js Integration: [https://www.better-auth.com/docs/integrations/next](https://www.better-auth.com/docs/integrations/next)
- Better Auth Organization Plugin: [https://www.better-auth.com/docs/plugins/organization](https://www.better-auth.com/docs/plugins/organization)
- Better Auth Installation: [https://www.better-auth.com/docs/installation](https://www.better-auth.com/docs/installation)
- Better Auth Prisma Adapter: [https://www.better-auth.com/docs/adapters/prisma](https://www.better-auth.com/docs/adapters/prisma)
- Upstash Redis GitHub: [https://github.com/upstash/redis-js](https://github.com/upstash/redis-js)
- Upstash Next.js Tutorial: [https://upstash.com/docs/redis/tutorials/nextjs_with_redis](https://upstash.com/docs/redis/tutorials/nextjs_with_redis)
- Sentry Next.js Manual Setup: [https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/](https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/)
- Prisma+Better Auth Guide: [https://www.prisma.io/docs/guides/betterauth-nextjs](https://www.prisma.io/docs/guides/betterauth-nextjs)

### Secondary (MEDIUM confidence)
- Legacy codebase direct reading: `src/server/trpc.ts`, `src/lib/db.ts`, `src/lib/logger.ts`, `src/app/api/cron/release-slots/route.ts`, `src/lib/cron/release-slots.ts`, `package.json`, `next.config.ts`, `tsconfig.json`, `prisma.config.ts`, `prisma/schema.prisma`
- Inngest v3 migration guide: [https://www.inngest.com/docs/sdk/migration](https://www.inngest.com/docs/sdk/migration)
- Inngest TypeScript SDK v3 release: [https://www.inngest.com/blog/releasing-ts-sdk-3](https://www.inngest.com/blog/releasing-ts-sdk-3)

---

## Metadata

**Confidence breakdown:**
- Project initialisation strategy: HIGH — derived from direct reading of legacy codebase
- Inngest v3 serve route and typed events: HIGH — official docs confirmed
- Inngest delayed event + cancelOn pattern: HIGH — official docs confirmed
- Better Auth v1 scaffold: MEDIUM-HIGH — core config confirmed; org plugin config confirmed; user table conflict is a known open question
- Upstash Redis singleton: HIGH — official docs + multiple sources agree
- Sentry Next.js App Router setup: HIGH — official docs confirmed
- Prisma schema copy strategy: HIGH — derived from direct reading of `prisma.config.ts` and schema
- tRPC context migration: HIGH — derived from direct reading of legacy source
- Proof-of-concept Inngest function: HIGH — derived from direct reading of legacy cron + official Inngest patterns

**Research date:** 2026-02-19
**Valid until:** 2026-03-21 (30 days — Inngest and Better Auth are actively developed; check for breaking changes before Phase 3)
