# Phase 0: Scaffolding + Foundation — Executable Plan

**Written:** 2026-02-19
**Status:** Ready to execute
**Auth system:** WorkOS AuthKit (overrides Better Auth from research)
**Build strategy:** Everything written fresh from scratch (no file copying from legacy)

---

## Overview

**Phase goal:** Stand up a fresh Next.js 16 project at `/Users/lukehodges/Documents/ironheart-refactor/` with the complete `src/modules/` + `src/shared/` structure, all shared infrastructure (Inngest, Redis, WorkOS, Sentry, Drizzle, tRPC, Pino), and one working Inngest proof-of-concept that replaces the legacy 1-minute polling cron.

### Success Criteria

Phase 0 is complete when ALL of the following are true:

- [ ] `npm run dev` starts without errors at `http://localhost:3000`
- [ ] `npm run build` exits with 0 TypeScript errors
- [ ] `npx inngest-cli@latest dev` connects and shows the `release-expired-reservation` function registered
- [ ] `src/modules/` directory exists with all 12 module subdirectories
- [ ] `src/shared/` directory contains: `db.ts`, `inngest.ts`, `redis.ts`, `logger.ts`, `errors.ts`, `trpc.ts`, `permissions.ts`, `utils.ts`
- [ ] `.env.example` documents every environment variable introduced in Phase 0
- [ ] `tsc --noEmit` passes with 0 errors
- [ ] `GET /api/health` returns `{ status: 'ok' }` with 200
- [ ] `GET /api/ready` returns `{ status: 'ready' }` with 200 when DB and Redis are connected

### Reference Codebase

The legacy codebase at `/Users/lukehodges/Documents/ironheart` is **read-only reference only**. Do NOT copy any files from it. Read it to understand patterns; write everything fresh.

### Auth Override

The research file (`PHASE0_RESEARCH.md`) covers Better Auth. **Ignore those sections entirely.** Auth in this project uses **WorkOS AuthKit** (`@workos-inc/authkit-nextjs`). Phase 0 scaffolds the WorkOS config only — full wiring happens in Phase 3.

---

## Dependencies

### Runtime dependencies (install in T02)

```
inngest
@workos-inc/authkit-nextjs
@upstash/redis
@sentry/nextjs
pino
pino-pretty
@trpc/server@^11.0.0
@trpc/client@^11.0.0
@trpc/react-query@^11.0.0
superjson@^2.2.6
zod@^4.3.5
@tanstack/react-query@^5.90.19
drizzle-orm
postgres
date-fns
clsx
tailwind-merge
lucide-react
```

### Dev dependencies (install in T02)

```
drizzle-kit
@types/node
@types/react
@types/react-dom
tsx
ts-node
dotenv
```

---

## Task Breakdown

---

### PHASE0-T01: Initialise the Next.js project

**Goal:** Create a fresh Next.js 16 App Router project at `/Users/lukehodges/Documents/ironheart-refactor/`. The directory already exists with a `.planning/` folder — initialise into it without deleting the planning directory.

**Commands:**

```bash
cd /Users/lukehodges/Documents
npx create-next-app@latest ironheart-refactor \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --no-import-alias \
  --yes
```

**⚠️ Non-empty directory handling:** The `ironheart-refactor/` directory already exists with a `.planning/` subfolder. If `create-next-app` prompts "The directory is not empty. Would you like to overwrite?" — type `y` to continue. If it errors or hangs, run instead:
```bash
cd /Users/lukehodges/Documents/ironheart-refactor
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --no-import-alias --yes
```
The `.planning/` directory will be untouched either way.

**After the command completes, delete the generated boilerplate files that will be replaced:**

```bash
rm /Users/lukehodges/Documents/ironheart-refactor/src/app/page.tsx
rm /Users/lukehodges/Documents/ironheart-refactor/src/app/globals.css
rm /Users/lukehodges/Documents/ironheart-refactor/src/app/layout.tsx
rm /Users/lukehodges/Documents/ironheart-refactor/src/app/favicon.ico 2>/dev/null || true
rm -rf /Users/lukehodges/Documents/ironheart-refactor/src/app/fonts 2>/dev/null || true
rm /Users/lukehodges/Documents/ironheart-refactor/public/next.svg 2>/dev/null || true
rm /Users/lukehodges/Documents/ironheart-refactor/public/vercel.svg 2>/dev/null || true
```

**Verification:** `ls /Users/lukehodges/Documents/ironheart-refactor/` shows `package.json`, `tsconfig.json`, `next.config.ts`, `src/`, `.planning/`.

---

### PHASE0-T02: Install all Phase 0 dependencies

**Goal:** Install every npm package needed for Phase 0 in a single pass. Doing it all at once avoids partial installs and conflicting peer dependency resolution.

**Commands:**

```bash
cd /Users/lukehodges/Documents/ironheart-refactor

npm install \
  inngest \
  @workos-inc/authkit-nextjs \
  @upstash/redis \
  @sentry/nextjs \
  pino \
  pino-pretty \
  @trpc/server@^11.0.0 \
  @trpc/client@^11.0.0 \
  @trpc/react-query@^11.0.0 \
  superjson@^2.2.6 \
  zod@^4.3.5 \
  @tanstack/react-query@^5.90.19 \
  drizzle-orm \
  postgres \
  date-fns \
  clsx \
  tailwind-merge \
  lucide-react

npm install --save-dev \
  drizzle-kit \
  @types/node \
  @types/react \
  @types/react-dom \
  tsx \
  ts-node \
  dotenv
```

**Verification:** `cat /Users/lukehodges/Documents/ironheart-refactor/package.json` shows all packages in `dependencies` and `devDependencies`. No `npm ERR!` in output.

---

### PHASE0-T03: Overwrite config files

**Goal:** Replace the `create-next-app`-generated config files with clean, production-ready versions. Write every file fresh — do not copy from legacy.

**File: `/Users/lukehodges/Documents/ironheart-refactor/next.config.ts`**

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Suppress default request logging (tRPC handler manages its own)
  logging: {
    fetches: {
      fullUrl: false,
    },
  },

  // Security headers applied to all routes
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-DNS-Prefetch-Control", value: "on" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Referrer-Policy", value: "origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },

  images: {
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
```

**File: `/Users/lukehodges/Documents/ironheart-refactor/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.ts",
    ".next/dev/types/**/*.ts",
    "**/*.mts"
  ],
  "exclude": ["node_modules", "drizzle/seed.ts"]
}
```

**File: `/Users/lukehodges/Documents/ironheart-refactor/postcss.config.mjs`**

```javascript
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
```

**File: `/Users/lukehodges/Documents/ironheart-refactor/eslint.config.mjs`**

```javascript
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
]);

export default eslintConfig;
```

**File: `/Users/lukehodges/Documents/ironheart-refactor/drizzle.config.ts`**

```typescript
import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./drizzle",
  schema: "./src/shared/db/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

**Verification:** Each file exists and has the correct content. `cat /Users/lukehodges/Documents/ironheart-refactor/tsconfig.json` shows `"strict": true` and `"@/*": ["./src/*"]`.

---

### PHASE0-T04: Create directory structure

**Goal:** Create the complete `src/modules/` and `src/shared/` directory tree with placeholder `index.ts` files in every module directory.

**Commands:**

```bash
# Shared infrastructure
mkdir -p /Users/lukehodges/Documents/ironheart-refactor/src/shared

# All module directories
mkdir -p /Users/lukehodges/Documents/ironheart-refactor/src/modules/booking
mkdir -p /Users/lukehodges/Documents/ironheart-refactor/src/modules/scheduling
mkdir -p /Users/lukehodges/Documents/ironheart-refactor/src/modules/notification
mkdir -p /Users/lukehodges/Documents/ironheart-refactor/src/modules/calendar-sync
mkdir -p /Users/lukehodges/Documents/ironheart-refactor/src/modules/workflow
mkdir -p /Users/lukehodges/Documents/ironheart-refactor/src/modules/tenant
mkdir -p /Users/lukehodges/Documents/ironheart-refactor/src/modules/auth
mkdir -p /Users/lukehodges/Documents/ironheart-refactor/src/modules/customer
mkdir -p /Users/lukehodges/Documents/ironheart-refactor/src/modules/review
mkdir -p /Users/lukehodges/Documents/ironheart-refactor/src/modules/forms
mkdir -p /Users/lukehodges/Documents/ironheart-refactor/src/modules/staff
mkdir -p /Users/lukehodges/Documents/ironheart-refactor/src/modules/portal

# App router directories
mkdir -p /Users/lukehodges/Documents/ironheart-refactor/src/app/api/inngest
mkdir -p /Users/lukehodges/Documents/ironheart-refactor/src/app/api/auth/callback
mkdir -p "/Users/lukehodges/Documents/ironheart-refactor/src/app/api/trpc/[trpc]"

# Drizzle output directory
mkdir -p /Users/lukehodges/Documents/ironheart-refactor/drizzle
mkdir -p /Users/lukehodges/Documents/ironheart-refactor/src/shared/db
```

**Create placeholder `index.ts` files for all modules that are NOT built in Phase 0:**

File: `/Users/lukehodges/Documents/ironheart-refactor/src/modules/scheduling/index.ts`
```typescript
// Placeholder — implemented in Phase 2
export {};
```

File: `/Users/lukehodges/Documents/ironheart-refactor/src/modules/notification/index.ts`
```typescript
// Placeholder — implemented in Phase 4
export {};
```

File: `/Users/lukehodges/Documents/ironheart-refactor/src/modules/calendar-sync/index.ts`
```typescript
// Placeholder — implemented in Phase 4
export {};
```

File: `/Users/lukehodges/Documents/ironheart-refactor/src/modules/workflow/index.ts`
```typescript
// Placeholder — implemented in Phase 5
export {};
```

File: `/Users/lukehodges/Documents/ironheart-refactor/src/modules/tenant/index.ts`
```typescript
// Placeholder — implemented in Phase 5
export {};
```

File: `/Users/lukehodges/Documents/ironheart-refactor/src/modules/customer/index.ts`
```typescript
// Placeholder — implemented in Phase 5
export {};
```

File: `/Users/lukehodges/Documents/ironheart-refactor/src/modules/review/index.ts`
```typescript
// Placeholder — implemented in Phase 5
export {};
```

File: `/Users/lukehodges/Documents/ironheart-refactor/src/modules/forms/index.ts`
```typescript
// Placeholder — implemented in Phase 5
export {};
```

File: `/Users/lukehodges/Documents/ironheart-refactor/src/modules/staff/index.ts`
```typescript
// Placeholder — implemented in Phase 5
export {};
```

File: `/Users/lukehodges/Documents/ironheart-refactor/src/modules/portal/index.ts`
```typescript
// Placeholder — implemented in Phase 5
export {};
```

File: `/Users/lukehodges/Documents/ironheart-refactor/src/modules/auth/index.ts`
```typescript
// Placeholder — WorkOS config scaffolded in T14. Full auth wiring in Phase 3.
export {};
```

**Verification:** `ls /Users/lukehodges/Documents/ironheart-refactor/src/modules/` shows all 12 module directories. `ls /Users/lukehodges/Documents/ironheart-refactor/src/shared/` shows the directory exists.

---

### PHASE0-T05: Write `src/app/globals.css` and root layout

**Goal:** Create the minimal Tailwind CSS 4 global stylesheet and a clean root layout with no legacy chrome.

**File: `/Users/lukehodges/Documents/ironheart-refactor/src/app/globals.css`**

```css
@import "tailwindcss";
```

Note: Tailwind CSS 4 uses `@import "tailwindcss"` — NOT `@tailwind base; @tailwind components; @tailwind utilities;`. This is the entire CSS file.

**File: `/Users/lukehodges/Documents/ironheart-refactor/src/app/layout.tsx`**

```typescript
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ironheart",
  description: "Ironheart booking management platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

**File: `/Users/lukehodges/Documents/ironheart-refactor/src/app/page.tsx`**

```typescript
export default function HomePage() {
  return (
    <main>
      <h1>Ironheart Refactor</h1>
      <p>Phase 0 scaffold — health check page.</p>
    </main>
  );
}
```

**Verification:** `npm run dev` starts. `http://localhost:3000` returns HTML with "Ironheart Refactor".

---

### PHASE0-T06: Generate Drizzle schema by introspecting the existing database

**Goal:** Generate a Drizzle TypeScript schema from the existing PostgreSQL database. Since the new project shares the same database as the legacy codebase, introspection gives us the exact current schema — no hand-writing, no migration risk.

**Commands:**

```bash
cd /Users/lukehodges/Documents/ironheart-refactor

# Ensure DATABASE_URL is set in .env.local before running
npx drizzle-kit introspect
```

This reads the live PostgreSQL database and writes the Drizzle schema to `./drizzle/schema.ts` (as configured in `drizzle.config.ts`).

**After introspection, move the schema to the shared directory:**

```bash
mv /Users/lukehodges/Documents/ironheart-refactor/drizzle/schema.ts \
   /Users/lukehodges/Documents/ironheart-refactor/src/shared/db/schema.ts
```

**Why introspect rather than write by hand:**
- The legacy database has 42+ tables with complex relations and constraints — writing this by hand risks subtle mismatches
- Introspection is guaranteed to match the live database exactly
- No migration history needed — Drizzle's `push` and `generate` commands work from the schema file, not migration history

**Post-introspection step — split schema into per-module files:**

After `drizzle-kit introspect` generates `schema.ts`, split the output into per-module files before proceeding with any other tasks. A monolithic `schema.ts` creates merge conflicts as multiple phases extend the schema simultaneously.

- `src/shared/db/schemas/booking.schema.ts` — Booking, BookingStatusHistory, BookingAssignment, AvailableSlot
- `src/shared/db/schemas/scheduling.schema.ts` — UserAvailability, UserCapacity
- `src/shared/db/schemas/auth.schema.ts` — User, UserRole, Role, Permission, Tenant
- `src/shared/db/schemas/notification.schema.ts` — MessageTemplate, SentMessage
- `src/shared/db/schemas/calendar.schema.ts` — UserIntegration, UserExternalEvent, UserIntegrationSyncLog
- `src/shared/db/schemas/customer.schema.ts` — Customer, CustomerNote
- `src/shared/db/schemas/enums.schema.ts` — All enum definitions (must be imported first by all other schema files)
- `src/shared/db/schema.ts` — Re-exports all of the above as a barrel file

Example barrel file after splitting:
```typescript
// src/shared/db/schema.ts — barrel file, re-exports all schema modules
export * from './schemas/enums.schema'
export * from './schemas/auth.schema'
export * from './schemas/booking.schema'
export * from './schemas/scheduling.schema'
export * from './schemas/notification.schema'
export * from './schemas/calendar.schema'
export * from './schemas/customer.schema'
```

This prevents merge conflicts and makes module-level ownership of tables explicit. All imports throughout the codebase (`import { bookings } from '@/shared/db/schema'`) continue to work unchanged because of the barrel re-export.

**After moving and splitting, snapshot the current state so future migrations work correctly:**

```bash
cd /Users/lukehodges/Documents/ironheart-refactor
npx drizzle-kit generate --name=baseline
```

This creates a baseline migration in `./drizzle/` that represents the current DB state. Future schema changes will diff against this baseline.

**Critical note:** Do NOT run `npx drizzle-kit push` or `npx drizzle-kit migrate` in Phase 0 — the database schema already exists and running push would attempt to reconcile differences.

---

**DATABASE SAFETY PROTOCOL — READ BEFORE RUNNING ANY DRIZZLE-KIT COMMANDS**

The refactor project shares the live production/shared database with the legacy codebase. The following commands are PROHIBITED against the shared database:

```bash
# NEVER run these against the shared production database:
# drizzle-kit push   ← destructive, bypasses migration history
# drizzle-kit drop   ← drops tables

# ALWAYS use:
# drizzle-kit generate --name=description   ← generates SQL migration file
# drizzle-kit migrate                        ← applies tracked migrations
```

**Read-only development role (run once against the shared database):**

To prevent accidental DDL execution from the refactor project, create a restricted PostgreSQL role that has DML but no DDL permissions:

```sql
-- Run this once against the shared database as a superuser.
-- Creates a dev role with SELECT/INSERT/UPDATE/DELETE but no CREATE/DROP/ALTER.
CREATE ROLE ironheart_refactor_dev WITH LOGIN PASSWORD 'dev-password';
GRANT CONNECT ON DATABASE ironheart TO ironheart_refactor_dev;
GRANT USAGE ON SCHEMA public TO ironheart_refactor_dev;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ironheart_refactor_dev;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ironheart_refactor_dev;
-- Explicitly deny DDL
REVOKE CREATE ON SCHEMA public FROM ironheart_refactor_dev;
```

Set `DATABASE_URL` in `.env.local` to use this restricted role during development. Only use the superuser credentials when explicitly running `drizzle-kit migrate` to apply a planned migration.

**Schema co-ownership rule:**

> The legacy Prisma schema is the master. Any Prisma migration applied to the legacy codebase must be manually replicated to `src/shared/db/schema.ts` within 24 hours, before any `drizzle-kit generate` is run. Monitor the legacy repo's `prisma/migrations/` directory for new entries.

---

**Verification:** `ls /Users/lukehodges/Documents/ironheart-refactor/src/shared/db/schema.ts` exists. File contains TypeScript `pgTable` definitions. `ls /Users/lukehodges/Documents/ironheart-refactor/drizzle/` shows the baseline migration SQL file.

---

### PHASE0-T07: Write `src/shared/db.ts`

**Goal:** Create the Drizzle client singleton using `postgres` (the `postgres.js` driver) for serverless-safe, connection-pooled database access. No Rust binary, no cold start penalty.

**File: `/Users/lukehodges/Documents/ironheart-refactor/src/shared/db.ts`**

```typescript
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./db/schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set");
}

// In serverless environments, use a connection limit of 1 per function instance.
// In development, use a small pool to avoid exhausting connections.
const connectionString = process.env.DATABASE_URL;

const client = postgres(connectionString, {
  max: process.env.NODE_ENV === "production" ? 1 : 5,
  idle_timeout: 20,
  connect_timeout: 10,
});

export const db = drizzle(client, { schema });
export type DB = typeof db;
```

**Note on `max: 1` in production:** Vercel serverless functions are ephemeral — each invocation creates a new process. Setting `max: 1` ensures we don't exhaust the PostgreSQL connection limit across concurrent function invocations. Use Supabase or Neon connection pooler (PgBouncer) in front of the database for scale.

**Verification:** `tsc --noEmit` passes once all files exist. `typeof db` resolves correctly to the Drizzle instance with the full schema.

---

### PHASE0-T08: Write `src/shared/logger.ts`

**Goal:** Create structured Pino logger with pino-pretty in development. Exports both the raw `logger` instance and a typed `log` convenience wrapper.

**File: `/Users/lukehodges/Documents/ironheart-refactor/src/shared/logger.ts`**

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

// Convenience wrapper — matches structured logging conventions:
// log.info("message", { contextData }) → logger.info({ contextData }, "message")
export const log = {
  info: (msg: string, data?: object) => logger.info(data, msg),
  warn: (msg: string, data?: object) => logger.warn(data, msg),
  error: (msg: string, error?: Error | object) =>
    logger.error({ err: error }, msg),
  debug: (msg: string, data?: object) => logger.debug(data, msg),
};
```

**Verification:** File compiles without errors. In development, `logger.info` output is pretty-printed with colors.

---

### PHASE0-T09: Write `src/shared/errors.ts`

**Goal:** Define typed application error classes used throughout services. Errors are converted to `TRPCError` at the router layer — services throw domain errors, routers catch and convert them.

**File: `/Users/lukehodges/Documents/ironheart-refactor/src/shared/errors.ts`**

```typescript
import { TRPCError } from "@trpc/server";

/**
 * Base class for all Ironheart application errors.
 * Services throw these; routers convert them to TRPCErrors via toTRPCError().
 */
export class IronheartError extends Error {
  constructor(
    message: string,
    public readonly code: string
  ) {
    super(message);
    this.name = "IronheartError";
  }
}

/** Resource was not found in the database. */
export class NotFoundError extends IronheartError {
  constructor(resource: string, id: string) {
    super(`${resource} not found: ${id}`, "NOT_FOUND");
    this.name = "NotFoundError";
  }
}

/** Authenticated user lacks permission to perform this action. */
export class ForbiddenError extends IronheartError {
  constructor(message = "Access denied") {
    super(message, "FORBIDDEN");
    this.name = "ForbiddenError";
  }
}

/** Request is not authenticated. */
export class UnauthorizedError extends IronheartError {
  constructor(message = "Authentication required") {
    super(message, "UNAUTHORIZED");
    this.name = "UnauthorizedError";
  }
}

/** Input failed business rule validation (beyond Zod schema validation). */
export class ValidationError extends IronheartError {
  constructor(message: string) {
    super(message, "VALIDATION_ERROR");
    this.name = "ValidationError";
  }
}

/** Attempted to create a resource that already exists, or a state conflict. */
export class ConflictError extends IronheartError {
  constructor(message: string) {
    super(message, "CONFLICT");
    this.name = "ConflictError";
  }
}

/**
 * Convert a domain error to a tRPC error.
 * Call this in router catch blocks: catch (e) { throw toTRPCError(e); }
 */
export function toTRPCError(error: unknown): TRPCError {
  if (error instanceof NotFoundError) {
    return new TRPCError({ code: "NOT_FOUND", message: error.message });
  }
  if (error instanceof ForbiddenError) {
    return new TRPCError({ code: "FORBIDDEN", message: error.message });
  }
  if (error instanceof UnauthorizedError) {
    return new TRPCError({ code: "UNAUTHORIZED", message: error.message });
  }
  if (error instanceof ValidationError) {
    return new TRPCError({ code: "BAD_REQUEST", message: error.message });
  }
  if (error instanceof ConflictError) {
    return new TRPCError({ code: "CONFLICT", message: error.message });
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

**Verification:** File compiles. Importing `{ NotFoundError }` from `@/shared/errors` in another file works without errors.

---

### PHASE0-T10: Write `src/shared/utils.ts`

**Goal:** Create the universal CSS class merging utility used by every UI component.

**File: `/Users/lukehodges/Documents/ironheart-refactor/src/shared/utils.ts`**

```typescript
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind CSS classes, resolving conflicts correctly.
 * Use instead of string concatenation whenever combining Tailwind classes.
 *
 * @example
 * cn("px-4 py-2", isActive && "bg-blue-500", className)
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

**Verification:** File compiles without errors.

---

### PHASE0-T11: Write `src/shared/permissions.ts`

**Goal:** Create the RBAC permission checking utilities. These are used by `permissionProcedure` in `src/shared/trpc.ts` and throughout service layers.

**File: `/Users/lukehodges/Documents/ironheart-refactor/src/shared/permissions.ts`**

```typescript
/**
 * Role-Based Access Control (RBAC) utilities.
 *
 * Permission format: "resource:action" (e.g., "bookings:read", "staff:delete")
 * Wildcards: "bookings:*" (all booking actions), "*:read" (read all), "*:*" (full access)
 *
 * OWNER and ADMIN user types have implicit full access.
 * MEMBER users have access only through assigned Role → Permission records.
 * CUSTOMER and API users have no admin permissions.
 */

import { TRPCError } from "@trpc/server";
import type { User, Role, Permission } from "@/shared/db/schema";

/** User with their full role and permission tree loaded from the DB. */
export type UserWithRoles = User & {
  roles: {
    role: Role & {
      permissions: {
        permission: Permission;
      }[];
    };
  }[];
};

/**
 * Check if a user has a specific permission.
 *
 * @param user - User with roles and permissions loaded
 * @param requiredPermission - Permission string e.g. "bookings:read"
 * @returns true if user has the permission
 */
export function hasPermission(
  user: UserWithRoles,
  requiredPermission: string
): boolean {
  // OWNER and ADMIN have all permissions implicitly
  if (user.type === "OWNER" || user.type === "ADMIN") {
    return true;
  }

  // CUSTOMER and API users never have admin permissions
  if (user.type === "CUSTOMER" || user.type === "API") {
    return false;
  }

  const [requiredResource, requiredAction] = requiredPermission.split(":");

  if (!requiredResource || !requiredAction) {
    console.warn(
      `Invalid permission format: ${requiredPermission}. Expected "resource:action"`
    );
    return false;
  }

  for (const userRole of user.roles) {
    for (const rolePermission of userRole.role.permissions) {
      const perm = rolePermission.permission;

      // Exact match
      if (perm.resource === requiredResource && perm.action === requiredAction) {
        return true;
      }
      // Wildcard action: "bookings:*"
      if (perm.resource === requiredResource && perm.action === "*") {
        return true;
      }
      // Wildcard resource: "*:read"
      if (perm.resource === "*" && perm.action === requiredAction) {
        return true;
      }
      // Full wildcard: "*:*"
      if (perm.resource === "*" && perm.action === "*") {
        return true;
      }
    }
  }

  return false;
}

/**
 * Require a permission, throw FORBIDDEN if user lacks it.
 * Use in service layer for imperative checks.
 */
export function requirePermission(
  user: UserWithRoles,
  requiredPermission: string
): void {
  if (!hasPermission(user, requiredPermission)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `Permission denied: ${requiredPermission}`,
    });
  }
}

/** True if user has at least one of the given permissions. */
export function hasAnyPermission(
  user: UserWithRoles,
  permissions: string[]
): boolean {
  return permissions.some((p) => hasPermission(user, p));
}

/** True if user has every one of the given permissions. */
export function hasAllPermissions(
  user: UserWithRoles,
  permissions: string[]
): boolean {
  return permissions.every((p) => hasPermission(user, p));
}

/**
 * Return all permission strings for a user.
 * OWNER/ADMIN return ["*:*"]. MEMBER users return their actual permissions.
 */
export function getUserPermissions(user: UserWithRoles): string[] {
  if (user.type === "OWNER" || user.type === "ADMIN") {
    return ["*:*"];
  }

  const permissionSet = new Set<string>();
  for (const userRole of user.roles) {
    for (const rolePermission of userRole.role.permissions) {
      const perm = rolePermission.permission;
      permissionSet.add(`${perm.resource}:${perm.action}`);
    }
  }
  return Array.from(permissionSet).sort();
}

/**
 * Check if user can access a specific row-level resource.
 * OWNER/ADMIN can access everything. MEMBER can only access their own.
 */
export function canAccessResource(
  user: User,
  _resourceType: "booking" | "staff" | "customer",
  resourceOwnerId?: string | null
): boolean {
  if (user.type === "OWNER" || user.type === "ADMIN") {
    return true;
  }
  if (!resourceOwnerId) {
    return false;
  }
  return user.id === resourceOwnerId;
}

/**
 * Apply permission-based WHERE clause filter for Drizzle queries.
 * OWNER/ADMIN: no filter applied. MEMBER: filter to their assigned bookings.
 * CUSTOMER: filter to their own bookings.
 */
export function applyPermissionFilter(
  user: User,
  baseWhere: Record<string, unknown> = {}
): Record<string, unknown> {
  if (user.type === "OWNER" || user.type === "ADMIN") {
    return baseWhere;
  }

  if (user.type === "MEMBER") {
    return {
      ...baseWhere,
      bookingAssignments: {
        some: { userId: user.id },
      },
    };
  }

  if (user.type === "CUSTOMER") {
    return {
      ...baseWhere,
      customerId: user.id,
    };
  }

  return baseWhere;
}
```

**Verification:** File compiles. Imports `{ hasPermission, UserWithRoles }` from `@/shared/permissions` resolves.

---

### PHASE0-T12: Write `src/shared/inngest.ts`

**Goal:** Create the Inngest client with the full typed event catalog. Every Inngest event that will ever exist in this codebase is declared here upfront so TypeScript catches mismatches at author time.

**Critical type note:** In Inngest v3, `EventSchemas.fromRecord<T>()` expects each event value to be `{ data: { ... } }`, NOT the raw payload. The catalog from `PROJECT.md` shows payload types — wrap each one in `{ data: ... }` here.

**File: `/Users/lukehodges/Documents/ironheart-refactor/src/shared/inngest.ts`**

```typescript
import { Inngest, EventSchemas } from "inngest";

/**
 * Typed event catalog for the entire Ironheart platform.
 *
 * Each event value MUST be wrapped in { data: ... } — this is an Inngest v3 requirement.
 * Writing "slot/reserved": { slotId: string } (without the data wrapper) causes TypeScript
 * errors when calling inngest.send() or accessing event.data in function handlers.
 *
 * To add a new event: add it here, then use it in the relevant module's *.events.ts file.
 */
type IronheartEvents = {
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
    data: {
      slotId: string;
      bookingId: string;
      tenantId: string;
      expiresAt: string; // ISO 8601 UTC string — always use .toISOString(), never .toString()
    };
  };
  "slot/released": {
    data: { slotId: string; bookingId: string; tenantId: string };
  };
  "notification/send.email": {
    data: {
      to: string;
      templateId: string;
      variables: Record<string, string>;
    };
  };
  "notification/send.sms": {
    data: {
      to: string;
      templateId: string;
      variables: Record<string, string>;
    };
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

/**
 * The single Inngest client instance.
 * Import this wherever you need to send events or define functions.
 *
 * @example
 * // Sending an event from a service:
 * await inngest.send({ name: "booking/created", data: { bookingId, tenantId } });
 *
 * // Defining a function in a module's *.events.ts:
 * export const myFunction = inngest.createFunction(...)
 */
export const inngest = new Inngest({
  id: "ironheart",
  schemas: new EventSchemas().fromRecord<IronheartEvents>(),
});
```

**Verification:** File compiles. TypeScript should error if you try to call `inngest.send({ name: "booking/created", data: { wrongField: "" } })`.

---

### PHASE0-T13: Write `src/shared/redis.ts`

**Goal:** Create the Upstash Redis client singleton. Unlike the Drizzle `postgres` driver, `@upstash/redis` is HTTP-based so no connection pool management is needed — module-level instantiation is safe for serverless.

**File: `/Users/lukehodges/Documents/ironheart-refactor/src/shared/redis.ts`**

```typescript
import { Redis } from "@upstash/redis";

/**
 * Upstash Redis client.
 *
 * @upstash/redis uses HTTP REST calls, not TCP connections.
 * This means it is safe to instantiate at module level in serverless environments —
 * there is no connection pool to exhaust. Each Redis command is a single HTTP request.
 *
 * Usage patterns:
 *   // Rate limiting
 *   const count = await redis.incr(`rate:${ip}:${Math.floor(Date.now() / 60000)}`);
 *   await redis.expire(`rate:${ip}:${Math.floor(Date.now() / 60000)}`, 60);
 *
 *   // Tenant lookup cache (5 min TTL)
 *   await redis.setex(`tenant:${slug}`, 300, JSON.stringify(tenant));
 *   const cached = await redis.get<TenantRow>(`tenant:${slug}`);
 *
 *   // Session revocation
 *   await redis.setex(`session:revoked:${sessionId}`, 86400, "1");
 */
export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});
```

**Verification:** File compiles. The non-null assertions (`!`) are intentional — missing env vars should throw at startup, not silently fail.

---

### PHASE0-T14: Write `src/modules/auth/workos.config.ts`

**Goal:** Scaffold the WorkOS AuthKit configuration. Phase 0 is config-only — the WorkOS session is not yet wired into tRPC context (that happens in Phase 3). The config file establishes the import path pattern all of Phase 3 will use.

**Important:** WorkOS AuthKit (`@workos-inc/authkit-nextjs`) is a hosted auth service. WorkOS manages its own user records — there is no database conflict with the Drizzle `users` table. The `users` table holds application users; WorkOS users are the auth identity layer that will be linked in Phase 3.

**WorkOS environment variables needed:**
- `WORKOS_CLIENT_ID` — From WorkOS dashboard → API Keys
- `WORKOS_API_KEY` — From WorkOS dashboard → API Keys
- `WORKOS_REDIRECT_URI` — The callback URL (e.g., `http://localhost:3000/api/auth/callback`)
- `WORKOS_COOKIE_PASSWORD` — 32+ character random string for session cookie encryption

**File: `/Users/lukehodges/Documents/ironheart-refactor/src/modules/auth/workos.config.ts`**

```typescript
/**
 * WorkOS AuthKit configuration.
 *
 * WorkOS is a hosted auth service — it manages its own user records externally.
 * There is no database conflict with the Drizzle users table.
 *
 * Phase 0: Config scaffold only.
 * Phase 3: Wire WorkOS session into tRPC context and link WorkOS user IDs
 *           to Drizzle users table records via a userId mapping.
 *
 * Environment variables required:
 *   WORKOS_CLIENT_ID      — From WorkOS dashboard → API Keys
 *   WORKOS_API_KEY        — From WorkOS dashboard → API Keys
 *   WORKOS_REDIRECT_URI   — e.g., http://localhost:3000/api/auth/callback
 *   WORKOS_COOKIE_PASSWORD — 32+ char random string for cookie encryption
 *
 * @see https://workos.com/docs/user-management
 */

// The @workos-inc/authkit-nextjs SDK reads WORKOS_CLIENT_ID, WORKOS_API_KEY,
// WORKOS_REDIRECT_URI, and WORKOS_COOKIE_PASSWORD from the environment automatically.
// No explicit client instantiation is required for the AuthKit flow.
// This file documents the contract and exports the session helper type for use
// in the tRPC context (Phase 3).

export type WorkOSUser = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  profilePictureUrl: string | null;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
};

export type WorkOSSession = {
  user: WorkOSUser;
  accessToken: string;
  organizationId?: string;
  role?: string;
  permissions?: string[];
};

/**
 * Sign-in URL for redirecting unauthenticated users.
 * Used by middleware and protected page layouts.
 * Full integration in Phase 3.
 */
export const AUTH_SIGNIN_PATH = "/sign-in";
export const AUTH_CALLBACK_PATH = "/api/auth/callback";
```

**File: `/Users/lukehodges/Documents/ironheart-refactor/src/app/api/auth/callback/route.ts`**

```typescript
import { handleAuth } from "@workos-inc/authkit-nextjs";

/**
 * WorkOS AuthKit callback route.
 *
 * This handles the OAuth callback after WorkOS redirects back from the
 * authentication flow. WorkOS exchanges the authorization code for a session
 * and sets the session cookie.
 *
 * Route: GET /api/auth/callback
 *
 * Phase 3 will add: tenant resolution from WorkOS organization, Drizzle User
 * lookup/creation, and session enrichment with tenantId and permissions.
 */
export const GET = handleAuth();
```

**Verification:** Files compile. No TypeScript errors from the WorkOS SDK imports.

---

### PHASE0-T15: Write `src/shared/trpc.ts`

**Goal:** Create the tRPC context and base procedure exports. This is the most important file in Phase 0 — the design decisions here constrain every router in every module. Get it right now.

**Design rules enforced here:**

1. Only four base procedures are exported from shared: `publicProcedure`, `protectedProcedure`, `tenantProcedure`, `permissionProcedure`. No module-specific procedures live here.
2. `protectedProcedure` stubs the WorkOS session check — returns null session in Phase 0. Phase 3 replaces the stub.
3. `tenantProcedure` extends `protectedProcedure`. In Phase 0 it uses a default tenantId — Phase 3 will extract the real tenantId from the WorkOS organization.
4. `permissionProcedure(permission)` is a factory — it takes a permission string and returns a procedure. Module routers call `permissionProcedure("bookings:read")` to get a typed procedure.
5. `createModuleMiddleware(moduleSlug)` is included as a shared factory so any module can gate itself behind a feature flag check without duplicating the pattern.

**File: `/Users/lukehodges/Documents/ironheart-refactor/src/shared/trpc.ts`**

```typescript
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { db } from "@/shared/db";
import { logger } from "@/shared/logger";
import type { UserWithRoles } from "@/shared/permissions";

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

/**
 * The tRPC context available to all procedures.
 *
 * Phase 0: session is null (WorkOS not yet wired).
 * Phase 3: session will be the WorkOS session with user, organization, and permissions.
 */
export type Context = {
  db: typeof db;
  /**
   * WorkOS session — null for unauthenticated requests.
   * Shape will be enriched in Phase 3 when WorkOS is fully wired.
   */
  session: {
    user: {
      id: string;
      email: string;
      firstName: string | null;
      lastName: string | null;
    };
    organizationId?: string;
  } | null;
  /** Resolved tenantId for this request. Default "unknown" in Phase 0. */
  tenantId: string;
  /** Human-readable tenant slug (used in URLs). */
  tenantSlug: string;
  /**
   * Fully loaded user record from the Drizzle DB — set by tenantProcedure.
   * null in publicProcedure context.
   */
  user: UserWithRoles | null;
};

/**
 * Create the request context.
 *
 * Called once per tRPC request. Responsible for:
 * 1. Retrieving the WorkOS session (Phase 3 — stubbed here)
 * 2. Resolving the tenant from subdomain, header, or session
 * 3. Providing db access
 *
 * Phase 0 stub: session is always null, tenantId is "default".
 * Phase 3: Replace the stub with actual WorkOS session retrieval.
 */
export async function createContext({
  req,
}: {
  req: Request;
}): Promise<Context> {
  // Phase 0 stub — WorkOS session retrieval.
  // Phase 3: Use getSession() from @workos-inc/authkit-nextjs to get the session
  // from the cookie set by the /api/auth/callback route.
  const session: Context["session"] = null;

  // Tenant detection from request headers.
  // Order of precedence:
  //   1. X-Tenant-Slug header (set by middleware for subdomain routing)
  //   2. Default tenant (development / fallback)
  // Phase 3 will also check: WorkOS organization ID from session.
  const tenantSlugFromHeader = req.headers.get("x-tenant-slug");
  const tenantSlug =
    tenantSlugFromHeader || process.env.DEFAULT_TENANT_SLUG || "default";

  // TODO Phase 3: Look up tenantId from slug using Redis cache → Drizzle fallback
  const tenantId = "default";

  if (tenantSlugFromHeader) {
    logger.debug("Tenant resolved from header", { tenantSlug });
  }

  return {
    db,
    session,
    tenantId,
    tenantSlug,
    user: null,
  };
}

// ---------------------------------------------------------------------------
// tRPC initialisation
// ---------------------------------------------------------------------------

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape }) {
    return shape;
  },
});

// ---------------------------------------------------------------------------
// Base exports
// ---------------------------------------------------------------------------

export const router = t.router;
export const publicProcedure = t.procedure;
export const middleware = t.middleware;
export const createCallerFactory = t.createCallerFactory;

// ---------------------------------------------------------------------------
// Protected procedure — requires a WorkOS session
// ---------------------------------------------------------------------------

/**
 * Requires an authenticated WorkOS session.
 * Throws UNAUTHORIZED if session is null.
 *
 * Phase 0: Always throws (session is always null until Phase 3).
 * Phase 3: Will pass through once WorkOS session is wired.
 */
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You must be signed in to access this resource",
    });
  }
  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
    },
  });
});

// ---------------------------------------------------------------------------
// Tenant procedure — requires auth + tenant context
// ---------------------------------------------------------------------------

/**
 * Extends protectedProcedure. Ensures tenantId is resolved and the Drizzle
 * User record is loaded into context.
 *
 * Phase 0: tenantId will be "default" (from createContext stub).
 * Phase 3: tenantId will be resolved from WorkOS organization → DB lookup.
 */
export const tenantProcedure = protectedProcedure.use(
  async ({ ctx, next }) => {
    // TODO Phase 3: Load the full UserWithRoles record from the DB using
    // the WorkOS user ID to find the matching Drizzle users table record.
    // For now, user stays null and tenantId stays "default".
    return next({
      ctx: {
        ...ctx,
        tenantId: ctx.tenantId,
        tenantSlug: ctx.tenantSlug,
      },
    });
  }
);

// ---------------------------------------------------------------------------
// Permission procedure factory — RBAC gate
// ---------------------------------------------------------------------------

/**
 * Returns a procedure that requires a specific RBAC permission.
 * Extends tenantProcedure — also requires auth + tenant.
 *
 * @example
 * // In a module router:
 * const listBookings = permissionProcedure("bookings:read")
 *   .input(z.object({ ... }))
 *   .query(async ({ ctx, input }) => { ... });
 *
 * Phase 0: Will always throw FORBIDDEN (user is null, no permissions loaded).
 * Phase 3: Will check ctx.user.roles for the required permission.
 */
export function permissionProcedure(requiredPermission: string) {
  return tenantProcedure.use(async ({ ctx, next }) => {
    if (!ctx.user) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "User record not loaded — cannot check permissions",
      });
    }

    const [resource, action] = requiredPermission.split(":");
    if (!resource || !action) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `Invalid permission format: ${requiredPermission}`,
      });
    }

    // OWNER and ADMIN bypass permission checks
    if (ctx.user.type === "OWNER" || ctx.user.type === "ADMIN") {
      return next({ ctx });
    }

    // Check MEMBER permissions via roles
    const hasPermission = ctx.user.roles.some((userRole) =>
      userRole.role.permissions.some((rolePermission) => {
        const perm = rolePermission.permission;
        return (
          (perm.resource === resource || perm.resource === "*") &&
          (perm.action === action || perm.action === "*")
        );
      })
    );

    if (!hasPermission) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: `Permission denied: ${requiredPermission}`,
      });
    }

    return next({ ctx });
  });
}

// ---------------------------------------------------------------------------
// Platform admin procedure
// ---------------------------------------------------------------------------

/**
 * Cross-tenant platform admin access.
 * Used for Ironheart internal admin tools — not tenant admin.
 *
 * Phase 0: Stub — always throws.
 * Phase 3: Check WorkOS user has the platform admin role or
 *          PLATFORM_ADMIN_EMAILS env var contains their email.
 */
export const platformAdminProcedure = protectedProcedure.use(
  async ({ ctx, next }) => {
    const adminEmails = (process.env.PLATFORM_ADMIN_EMAILS || "")
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean);

    const userEmail = ctx.session?.user.email;
    if (!userEmail || !adminEmails.includes(userEmail)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Platform admin access required",
      });
    }

    return next({ ctx });
  }
);

// ---------------------------------------------------------------------------
// Module middleware factory
// ---------------------------------------------------------------------------

/**
 * Creates middleware that checks whether a module is enabled for the current tenant.
 * Modules use this to gate their procedures behind feature flags.
 *
 * @example
 * // In src/modules/review/review.router.ts:
 * const reviewProcedure = tenantProcedure.use(createModuleMiddleware("review-automation"));
 *
 * Phase 0: Stub — always passes through (all modules treated as enabled).
 * Phase 5: Will query TenantModule table to check the module is enabled.
 */
export function createModuleMiddleware(moduleSlug: string) {
  return middleware(async ({ ctx, next }) => {
    // TODO Phase 5: Check db.tenantModule.findFirst({ where: { tenantId: ctx.tenantId, moduleSlug, isEnabled: true } })
    logger.debug("Module access check (stub — always passes)", {
      moduleSlug,
      tenantId: ctx.tenantId,
    });
    return next({ ctx });
  });
}
```

**Verification:** File compiles. Check that `router`, `publicProcedure`, `protectedProcedure`, `tenantProcedure`, `permissionProcedure`, `createModuleMiddleware` are all exported. `tsc --noEmit` passes.

---

### PHASE0-T16: Write the root tRPC router and API route

**Goal:** Create the root tRPC router (empty for now — modules will merge their routers in later phases) and the Next.js App Router tRPC fetch handler.

**File: `/Users/lukehodges/Documents/ironheart-refactor/src/server/root.ts`**

First, create the directory:
```bash
mkdir -p /Users/lukehodges/Documents/ironheart-refactor/src/server
```

```typescript
import { router } from "@/shared/trpc";

/**
 * Root tRPC router.
 *
 * Modules merge their routers here as they are built:
 *   Phase 1: bookingRouter
 *   Phase 2: schedulingRouter
 *   Phase 3: authRouter
 *   Phase 4: notificationRouter, calendarSyncRouter
 *   Phase 5: remaining module routers
 *
 * @example Adding a router:
 * import { bookingRouter } from "@/modules/booking/booking.router";
 * export const appRouter = router({ booking: bookingRouter });
 */
export const appRouter = router({
  // Modules will be added here as phases are completed.
  // For now: empty router so tRPC initialises without error.
});

export type AppRouter = typeof appRouter;
```

**File: `/Users/lukehodges/Documents/ironheart-refactor/src/app/api/trpc/[trpc]/route.ts`**

```typescript
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { createContext } from "@/shared/trpc";
import { appRouter } from "@/server/root";

/**
 * tRPC API route handler for Next.js App Router.
 *
 * Uses fetchRequestHandler (not createNextApiHandler — that is Pages Router only).
 * Handles all tRPC requests at /api/trpc/[procedure].
 */
const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () => createContext({ req }),
    onError:
      process.env.NODE_ENV === "development"
        ? ({ path, error }) => {
            console.error(`tRPC error on ${path ?? "<no path>"}:`, error);
          }
        : undefined,
  });

export { handler as GET, handler as POST };
```

**Verification:** Files compile. `npm run dev` starts and `GET http://localhost:3000/api/trpc` returns a tRPC-shaped response (or 404 with tRPC error shape — not a Next.js 500 error).

---

### PHASE0-T17: Write `src/modules/booking/booking.events.ts` (Inngest POC)

**Goal:** Create the proof-of-concept Inngest function that replaces the legacy 1-minute polling cron. This is the most important Phase 0 deliverable after the shared infrastructure — it demonstrates the event-driven pattern for all future cron replacements.

**Why this is better than the legacy cron:**

| Legacy `/api/cron/release-slots` | New `releaseExpiredReservation` |
|---|---|
| Polls every 1 minute — up to 60s delay after expiry | Wakes at the exact expiry second |
| Processes ALL expired bookings in one run — timeout risk | Each booking is its own isolated function run |
| No cancellation when booking is confirmed | `cancelOn` auto-cancels on `booking/confirmed` |
| Requires `CRON_SECRET` header for auth | Signed by Inngest — cryptographically secure |

**File: `/Users/lukehodges/Documents/ironheart-refactor/src/modules/booking/booking.events.ts`**

```typescript
import { inngest } from "@/shared/inngest";
import { db } from "@/shared/db";
import { eq, and, gt, sql } from "drizzle-orm";
import { bookings, bookingStatusHistory, availableSlots, bookingAssignments } from "@/shared/db/schema";
import { logger } from "@/shared/logger";

/**
 * Release Expired Reservation
 *
 * Replaces: /api/cron/release-slots (Vercel Cron, every 1 minute)
 *
 * Triggered by:    "slot/reserved" event — emitted when a booking is created
 *                  with RESERVED status via the public portal.
 *
 * Sleeps until:    The exact reservation expiry timestamp (expiresAt).
 *
 * Auto-cancelled:  If a "booking/confirmed" OR "booking/cancelled" event arrives
 *                  with matching bookingId before expiry, Inngest cancels this
 *                  function automatically. No race condition possible.
 *
 * After waking:    Checks if the booking is still RESERVED. If so, runs a
 *                  database transaction to release the slot and update status.
 *
 * Emit this event when creating a RESERVED booking (Phase 1 will do this):
 *   await inngest.send({
 *     name: "slot/reserved",
 *     data: {
 *       slotId: booking.slotId,
 *       bookingId: booking.id,
 *       tenantId: booking.tenantId,
 *       expiresAt: booking.reservationExpiresAt.toISOString(), // Always ISO string, never .toString()
 *     },
 *   });
 */
export const releaseExpiredReservation = inngest.createFunction(
  {
    id: "release-expired-reservation",
    cancelOn: [
      {
        // If the user completes checkout, cancel this function — slot is claimed.
        event: "booking/confirmed",
        match: "data.bookingId",
      },
      {
        // If the booking is cancelled manually before expiry, cancel too.
        event: "booking/cancelled",
        match: "data.bookingId",
      },
    ],
  },
  { event: "slot/reserved" },
  async ({ event, step }) => {
    const { bookingId, slotId, expiresAt } = event.data;

    // Sleep until the exact reservation expiry time.
    // If expiresAt is already in the past (e.g., delayed processing),
    // step.sleepUntil() wakes immediately — this is correct behaviour.
    await step.sleepUntil("wait-for-expiry", new Date(expiresAt));

    // After waking: defensive check — cancelOn covers most cases, but
    // it is possible (though rare) for a cancel event to be missed.
    const booking = await step.run("check-booking-status", async () => {
      const rows = await db
        .select({
          id: bookings.id,
          status: bookings.status,
          slotId: bookings.slotId,
          bookingNumber: bookings.bookingNumber,
          tenantId: bookings.tenantId,
        })
        .from(bookings)
        .where(eq(bookings.id, bookingId))
        .limit(1);
      return rows[0] ?? null;
    });

    if (!booking || booking.status !== "RESERVED") {
      logger.info("Reservation already resolved, skipping release", {
        bookingId,
        status: booking?.status ?? "not found",
      });
      return { released: false, reason: "already_resolved" };
    }

    // Release the slot in a single atomic transaction.
    const result = await step.run("release-slot", async () => {
      const now = new Date();

      await db.transaction(async (tx) => {
        // 1. Update booking status to RELEASED
        await tx
          .update(bookings)
          .set({ status: "RELEASED", statusChangedAt: now, updatedAt: now })
          .where(and(eq(bookings.id, bookingId), eq(bookings.status, "RESERVED")));

        // 2. Record the status change in history
        await tx.insert(bookingStatusHistory).values({
          id: crypto.randomUUID(),
          bookingId,
          fromStatus: "RESERVED",
          toStatus: "RELEASED",
          reason: "Reservation expired — 15-minute timeout reached",
          changedAt: now,
        });

        // 3. Restore slot availability if this booking held a slot
        if (slotId) {
          await tx
            .update(availableSlots)
            .set({ bookedCount: sql`${availableSlots.bookedCount} - 1` })
            .where(
              and(
                eq(availableSlots.id, slotId),
                gt(availableSlots.bookedCount, 0)
              )
            );
        }

        // 4. Remove staff assignments (no longer needed)
        await tx
          .delete(bookingAssignments)
          .where(eq(bookingAssignments.bookingId, bookingId));
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

**Also create the booking module barrel file:**

File: `/Users/lukehodges/Documents/ironheart-refactor/src/modules/booking/index.ts`
```typescript
// Phase 0: Inngest event handlers
export { releaseExpiredReservation } from "./booking.events";

// Phase 1 will add:
// export { bookingRouter } from "./booking.router";
// export { BookingService } from "./booking.service";
```

**Verification:** File compiles. No TypeScript errors in `booking.events.ts`.

---

### PHASE0-T18: Write the Inngest serve route

**Goal:** Register all Inngest functions with the Inngest platform. The serve route is the endpoint Inngest calls to invoke functions and discover registered handlers.

**File: `/Users/lukehodges/Documents/ironheart-refactor/src/app/api/inngest/route.ts`**

```typescript
import { serve } from "inngest/next";
import { inngest } from "@/shared/inngest";
import { releaseExpiredReservation } from "@/modules/booking";

/**
 * Inngest serve endpoint.
 *
 * - GET:  Returns function metadata (used by Inngest dashboard and dev server)
 * - POST: Invokes a specific function (called by Inngest when an event triggers it)
 * - PUT:  Registers/syncs functions with the Inngest platform
 *
 * All three methods are required. Missing any one will break Inngest integration.
 *
 * To add a new Inngest function:
 * 1. Define it in the relevant module's *.events.ts file
 * 2. Export it from the module's index.ts
 * 3. Import and add it to the functions array below
 *
 * In development: Run `npx inngest-cli@latest dev` in a separate terminal.
 * The dev server at http://localhost:8288 shows registered functions and event history.
 */
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    releaseExpiredReservation,
    // Phase 2+ will add:
    // syncCalendars,
    // pullCalendarEvents,
    // refreshCalendarTokens,
    // renewWatchChannels,
    // sendReminders,
    // requestReview,
  ],
});
```

**Verification:**

```bash
# Start Next.js dev server
npm run dev

# In a separate terminal, start Inngest dev server
npx inngest-cli@latest dev

# Visit http://localhost:8288
# Should show "ironheart" app with "release-expired-reservation" function listed.
```

---

### PHASE0-T19: Configure Sentry

**Goal:** Integrate Sentry for error monitoring and performance tracing. Write all files manually (do not use the Sentry wizard — it makes invasive changes and asks interactive questions).

**File: `/Users/lukehodges/Documents/ironheart-refactor/sentry.client.config.ts`**

```typescript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // 10% of requests traced in production — adjust per performance budget
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Do not log Sentry's own internal messages to the console
  debug: false,

  // Not using Vercel Cron Monitors (using Inngest instead)
  automaticVercelMonitors: false,
});
```

**File: `/Users/lukehodges/Documents/ironheart-refactor/sentry.server.config.ts`**

```typescript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  debug: false,
  automaticVercelMonitors: false,
});
```

**File: `/Users/lukehodges/Documents/ironheart-refactor/sentry.edge.config.ts`**

```typescript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  debug: false,
  automaticVercelMonitors: false,
});
```

**File: `/Users/lukehodges/Documents/ironheart-refactor/instrumentation.ts`**

```typescript
/**
 * Next.js instrumentation hook — loads Sentry for server and edge runtimes.
 * This file is automatically called by Next.js before starting the server.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}
```

**File: `/Users/lukehodges/Documents/ironheart-refactor/instrumentation-client.ts`**

```typescript
export { onRouterTransitionStart } from "@sentry/nextjs";
```

**Update `/Users/lukehodges/Documents/ironheart-refactor/next.config.ts` to wrap with Sentry:**

Replace the existing `next.config.ts` content with:

```typescript
import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  logging: {
    fetches: {
      fullUrl: false,
    },
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-DNS-Prefetch-Control", value: "on" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Referrer-Policy", value: "origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },

  images: {
    formats: ["image/avif", "image/webp"],
  },
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT || "ironheart-refactor",

  // Suppress Sentry build output unless in CI
  silent: !process.env.CI,

  // Upload a wider set of source maps for better stack traces in production
  widenClientFileUpload: true,

  // Hide source maps from the client bundle
  hideSourceMaps: true,

  // Remove Sentry logger statements from production build
  disableLogger: true,

  // Do not create Vercel Cron Monitors (we use Inngest)
  automaticVercelMonitors: false,
});
```

**Verification:** `npm run build` completes without Sentry-related errors. `NEXT_PUBLIC_SENTRY_DSN` can be omitted in dev — Sentry initialises but silently does nothing.

---

### PHASE0-T20: Write the minimal Next.js middleware

**Goal:** Create a minimal middleware stub. Phase 3 will add WorkOS session validation and full tenant resolution. Phase 0 middleware only handles the X-Tenant-Slug header injection for local development.

**File: `/Users/lukehodges/Documents/ironheart-refactor/src/middleware.ts`**

```typescript
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Next.js Edge Middleware
 *
 * Phase 0: Minimal stub — extracts tenant slug from subdomain and injects
 * it as an X-Tenant-Slug header so tRPC context can read it.
 *
 * Phase 3: Will integrate WorkOS session validation and protect routes.
 *
 * Tenant resolution order (matching legacy):
 *   1. Subdomain: cotswolds.ironheart.app → slug = "cotswolds"
 *   2. platform_tenant_slug cookie (platform admin override)
 *   3. Default (development / root domain)
 */
export function middleware(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);

  // Extract tenant slug from subdomain
  const hostname = request.headers.get("host") || "";
  const subdomain = hostname.split(".")[0];

  // Known non-tenant subdomains to ignore
  const ignoredSubdomains = ["www", "app", "localhost", "127"];
  const isRealSubdomain =
    subdomain &&
    !ignoredSubdomains.some(
      (ignored) =>
        subdomain === ignored || subdomain.startsWith(ignored + ":")
    );

  if (isRealSubdomain) {
    requestHeaders.set("x-tenant-slug", subdomain);
  }

  // Allow platform admin to override tenant via cookie (for testing)
  const overrideCookie = request.cookies.get("platform_tenant_slug");
  if (overrideCookie?.value) {
    requestHeaders.set("x-tenant-slug", overrideCookie.value);
  }

  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

export const config = {
  // Run on all routes except static assets and Next.js internals
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```

**Verification:** Middleware compiles. `npm run dev` starts. A request to `http://localhost:3000` does not cause middleware errors.

---

### PHASE0-T21: Write `.env.example`

**Goal:** Document every environment variable introduced in Phase 0 so any developer can get set up without hunting through the codebase.

**File: `/Users/lukehodges/Documents/ironheart-refactor/.env.example`**

```bash
# =============================================================================
# Ironheart Refactor — Environment Variables
# =============================================================================
# Copy this file to .env.local and fill in the values.
# Variables marked [REQUIRED] must be set before npm run dev will work.
# Variables marked [OPTIONAL] have defaults or are only needed in production.
# Variables marked [PROD ONLY] are not needed in development.
# =============================================================================

# =============================================================================
# Database
# =============================================================================
# [REQUIRED] PostgreSQL connection string.
# Same database as the legacy ironheart project — do NOT create a separate DB.
# Format: postgresql://USER:PASSWORD@HOST:PORT/DATABASE
DATABASE_URL=postgresql://postgres:password@localhost:5432/ironheart

# =============================================================================
# WorkOS AuthKit
# =============================================================================
# [REQUIRED in Phase 3] Get these from WorkOS dashboard → API Keys
# https://dashboard.workos.com/api-keys
#
# Phase 0: These values are not used yet (auth is stubbed).
# Phase 3: These must be set before auth flows will work.
WORKOS_CLIENT_ID=client_01H...
WORKOS_API_KEY=sk_test_...

# The full URL where WorkOS redirects after authentication
# Development: http://localhost:3000/api/auth/callback
# Production:  https://your-domain.com/api/auth/callback
WORKOS_REDIRECT_URI=http://localhost:3000/api/auth/callback

# 32+ character random string for encrypting the WorkOS session cookie
# Generate with: openssl rand -base64 32
WORKOS_COOKIE_PASSWORD=your-32-character-random-string-here

# =============================================================================
# Inngest
# =============================================================================
# [OPTIONAL in development] Not needed when using the Inngest dev server locally.
# Run `npx inngest-cli@latest dev` in a separate terminal — it auto-discovers.
#
# [REQUIRED in production] Get these from https://app.inngest.com → your app → API Keys
INNGEST_EVENT_KEY=
INNGEST_SIGNING_KEY=

# =============================================================================
# Upstash Redis
# =============================================================================
# [REQUIRED in Phase 3+] Get these from https://console.upstash.com
# Create a Redis database, then copy the REST URL and token.
UPSTASH_REDIS_REST_URL=https://your-db.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-upstash-rest-token

# =============================================================================
# Sentry
# =============================================================================
# [OPTIONAL] Error monitoring. Leave empty to disable Sentry.
# Get from https://sentry.io → Settings → Projects → your project → DSN
NEXT_PUBLIC_SENTRY_DSN=

# [PROD ONLY] Used for uploading source maps during CI builds
SENTRY_ORG=your-org-slug
SENTRY_PROJECT=ironheart-refactor
SENTRY_AUTH_TOKEN=

# =============================================================================
# Application
# =============================================================================
# [OPTIONAL] Default tenant slug for development (used when no subdomain present)
DEFAULT_TENANT_SLUG=default

# [OPTIONAL] Log level. Options: trace, debug, info, warn, error, fatal
LOG_LEVEL=info

# Set automatically by Next.js — do not set manually
# NODE_ENV=development

# =============================================================================
# Platform Admin
# =============================================================================
# [OPTIONAL] Comma-separated list of email addresses with platform admin access
# (cross-tenant access for Ironheart operators, not tenant admins)
PLATFORM_ADMIN_EMAILS=
```

**Verification:** File exists. `cat /Users/lukehodges/Documents/ironheart-refactor/.env.example` shows all sections.

---

### PHASE0-T22: Add health check endpoints

**Goal:** Create `/api/health` and `/api/ready` routes so that load balancers, uptime monitors, and deployment pipelines have reliable liveness and readiness probes.

**File: `/Users/lukehodges/Documents/ironheart-refactor/src/app/api/health/route.ts`**

```typescript
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version ?? 'unknown',
  })
}
```

**File: `/Users/lukehodges/Documents/ironheart-refactor/src/app/api/ready/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { db } from '@/shared/db'
import { sql } from 'drizzle-orm'
import { redis } from '@/shared/redis'

export const dynamic = 'force-dynamic'

export async function GET() {
  const checks: Record<string, boolean> = {}

  // Check database
  try {
    await db.execute(sql`SELECT 1`)
    checks.database = true
  } catch {
    checks.database = false
  }

  // Check Redis
  try {
    await redis.ping()
    checks.redis = true
  } catch {
    checks.redis = false
  }

  const allHealthy = Object.values(checks).every(Boolean)

  return NextResponse.json(
    { status: allHealthy ? 'ready' : 'degraded', checks },
    { status: allHealthy ? 200 : 503 }
  )
}
```

**Create the route directories:**

```bash
mkdir -p /Users/lukehodges/Documents/ironheart-refactor/src/app/api/health
mkdir -p /Users/lukehodges/Documents/ironheart-refactor/src/app/api/ready
```

**Verification:**
- `GET /api/health` returns `{ "status": "ok", "timestamp": "...", "version": "..." }` with HTTP 200
- `GET /api/ready` returns `{ "status": "ready", "checks": { "database": true, "redis": true } }` with HTTP 200 when DB and Redis are connected
- `GET /api/ready` returns `{ "status": "degraded", ... }` with HTTP 503 when either dependency is unavailable

---

### PHASE0-T24: Final verification

**Goal:** Confirm Phase 0 is complete by running all verification checks.

**Step 1 — TypeScript type check:**
```bash
cd /Users/lukehodges/Documents/ironheart-refactor
npx tsc --noEmit
```
Expected: 0 errors. If errors exist, fix before proceeding.

**Step 2 — Development server:**
```bash
npm run dev
```
Expected: Server starts on port 3000. No error in terminal. `http://localhost:3000` returns "Ironheart Refactor" text.

**Step 3 — Inngest dev server (separate terminal):**
```bash
npx inngest-cli@latest dev
```
Expected:
- Dev server starts at `http://localhost:8288`
- Connects to `http://localhost:3000/api/inngest`
- Lists the `ironheart` app with function `release-expired-reservation` registered

**Step 4 — Production build:**
```bash
npm run build
```
Expected: Build completes. 0 TypeScript errors. 0 "Error:" lines in output.

**Step 5 — Directory structure check:**
```bash
ls /Users/lukehodges/Documents/ironheart-refactor/src/modules/
ls /Users/lukehodges/Documents/ironheart-refactor/src/shared/
```
Expected:
- `modules/`: booking, scheduling, notification, calendar-sync, workflow, tenant, auth, customer, review, forms, staff, portal
- `shared/`: db.ts, inngest.ts, redis.ts, logger.ts, errors.ts, trpc.ts, permissions.ts, utils.ts

**Step 6 — Drizzle schema and baseline migration generated:**
```bash
ls /Users/lukehodges/Documents/ironheart-refactor/src/shared/db/schema.ts
ls /Users/lukehodges/Documents/ironheart-refactor/drizzle/
```
Expected: `schema.ts` exists with `pgTable` definitions. `drizzle/` contains the baseline SQL migration file.

---

## Environment Variables Reference

Complete list of all environment variables introduced in Phase 0:

| Variable | Required | When | Purpose |
|---|---|---|---|
| `DATABASE_URL` | Yes | Always | PostgreSQL connection string |
| `WORKOS_CLIENT_ID` | Phase 3 | Auth flows | WorkOS app client ID |
| `WORKOS_API_KEY` | Phase 3 | Auth flows | WorkOS server API key |
| `WORKOS_REDIRECT_URI` | Phase 3 | Auth callback | OAuth redirect URL |
| `WORKOS_COOKIE_PASSWORD` | Phase 3 | Session cookies | 32+ char encryption key |
| `INNGEST_EVENT_KEY` | Production | Inngest events | Event signing key |
| `INNGEST_SIGNING_KEY` | Production | Inngest functions | Request verification key |
| `UPSTASH_REDIS_REST_URL` | Phase 3+ | Redis operations | Upstash REST endpoint |
| `UPSTASH_REDIS_REST_TOKEN` | Phase 3+ | Redis operations | Upstash auth token |
| `NEXT_PUBLIC_SENTRY_DSN` | Optional | Error tracking | Sentry project DSN |
| `SENTRY_ORG` | CI/prod | Source maps | Sentry org slug |
| `SENTRY_PROJECT` | CI/prod | Source maps | Sentry project name |
| `SENTRY_AUTH_TOKEN` | CI/prod | Source maps | Sentry upload token |
| `DEFAULT_TENANT_SLUG` | Optional | Dev | Fallback tenant for root domain |
| `LOG_LEVEL` | Optional | Logging | Pino log level (default: info) |
| `PLATFORM_ADMIN_EMAILS` | Optional | Admin access | Comma-separated admin emails |

---

## What Phase 1 Will Build On

Phase 1 (Booking Module) requires the following from Phase 0 to be fully working:

1. **`src/shared/db.ts`** — Drizzle client to query bookings, slots, customers, staff assignments
2. **`src/shared/inngest.ts`** — To emit `slot/reserved` and `booking/confirmed` events after state changes
3. **`src/shared/trpc.ts`** — `publicProcedure` for the portal booking endpoint, `tenantProcedure` for admin booking endpoints, `permissionProcedure("bookings:read")` for RBAC-gated endpoints
4. **`src/shared/errors.ts`** — `NotFoundError`, `ConflictError`, `ValidationError` thrown by the booking service
5. **`src/modules/booking/booking.events.ts`** — The `releaseExpiredReservation` function must be registered and working before Phase 1 creates RESERVED bookings (otherwise slots will never release)
6. **`src/shared/db/schema.ts`** — Drizzle schema with `bookings`, `availableSlots`, `bookingStatusHistory`, `bookingAssignments` tables introspected from the live database

Phase 1 will add: `booking.router.ts`, `booking.service.ts`, `booking.repository.ts`, `booking.schemas.ts` to `src/modules/booking/`. It will merge `bookingRouter` into `src/server/root.ts`.

---

## Known Open Questions

These require investigation before Phase 3 (Auth Phase):

### 1. WorkOS session shape in tRPC context

**What we know:** `@workos-inc/authkit-nextjs` provides `getSession()` for server-side session retrieval. The session contains the WorkOS user object.

**What is unclear:** The exact method signature and return type of `getSession()` in the version of `@workos-inc/authkit-nextjs` that gets installed. The `Context` type in `src/shared/trpc.ts` uses a hand-written `WorkOSSession` type stub — this must be reconciled with the actual SDK type in Phase 3.

**Action needed (Phase 3):** Read the installed SDK's TypeScript types and update the `Context.session` type to match exactly.

### 2. WorkOS → Drizzle User linking strategy

**What we know:** WorkOS manages auth users. The Drizzle `users` table holds application users with tenantId, RBAC roles, and team member fields. These must be linked.

**What is unclear:** Whether to use WorkOS user `id` as the foreign key in the `users` table, or maintain a separate `workos_user_id` column. The legacy `users` table does not have a `workos_user_id` column — adding it requires a migration.

**Action needed (Phase 3):** Decide on the linking strategy. Options:
- Add `workosUserId text unique` column to the `users` table via a Drizzle migration (`npx drizzle-kit generate` then `npx drizzle-kit migrate`)
- Use email as the lookup key (simpler but weaker)

### 3. tRPC `createContext` with WorkOS `getSession()`

**What we know:** `getSession()` from `@workos-inc/authkit-nextjs` reads the session from the WorkOS cookie. In Next.js App Router tRPC routes, the context function receives the raw `Request` object.

**What is unclear:** Whether `getSession()` can read cookies from the raw `Request` object, or whether it requires Next.js's `cookies()` API. If it requires `cookies()`, the `createContext` function signature may need to change.

**Action needed (Phase 3):** Test `getSession()` inside a `fetchRequestHandler` context. If it cannot read cookies, use the `cookies()` from `next/headers` approach: read the session cookie value manually and pass it to WorkOS for validation.

### 4. WorkOS multi-tenant organisation mapping

**What we know:** WorkOS has first-class support for "Organizations" (their term for tenants). The legacy platform uses subdomain-based tenant resolution.

**What is unclear:** Whether WorkOS organizations should map 1:1 to Ironheart tenants, or whether the Ironheart tenant system should remain independent with WorkOS used only for auth identity (not org management).

**Action needed (Phase 3 planning):** Decide on the mapping strategy before Phase 3 begins.

---

*Phase 0 Plan — Ironheart Refactor*
*Written: 2026-02-19*
