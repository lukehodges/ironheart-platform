# Project Overview

Ironheart is a multi-tenant SaaS platform built as a **modular monolith**. It supports booking management, scheduling, workflow automation, customer management, reviews, forms, payments, analytics, and platform administration.

**Key principles:**
- Single deployable unit (no microservices)
- Modules communicate via typed events, not direct imports
- Tenant isolation via row-level filtering (`tenantId` on every query)
- Routers are thin; services contain business logic; repositories isolate DB access
- Side effects (email, SMS, calendar sync) happen asynchronously via Inngest

---

# Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js (App Router) | 16 |
| API | tRPC | 11 |
| ORM | Drizzle ORM + drizzle-kit | latest |
| Database | PostgreSQL via postgres.js | — |
| Auth | WorkOS AuthKit | latest |
| Background Jobs | Inngest | v3 |
| Cache / Rate Limiting | Upstash Redis | latest |
| Email | Resend + React Email | latest |
| SMS | Twilio | latest |
| Monitoring | Sentry + Pino | latest |
| Frontend | React 19, Tailwind CSS 4 | — |
| UI Components | shadcn/ui + Radix UI | latest |
| Testing | Vitest + Testing Library | latest |

---

# Project Structure

```
src/
├── app/                          # Next.js App Router pages
│   ├── admin/                    # Admin dashboard routes
│   ├── platform/                 # Platform admin routes (isPlatformAdmin only)
│   ├── book/[tenantSlug]/        # Public booking wizard
│   ├── forms/[sessionKey]/       # Public form submission
│   ├── review/[token]/           # Public review submission
│   └── api/
│       ├── trpc/[trpc]/route.ts  # tRPC HTTP handler
│       └── inngest/route.ts      # Inngest webhook handler
│
├── modules/                      # Business logic modules
│   ├── booking/
│   ├── scheduling/
│   ├── notification/
│   ├── calendar-sync/
│   ├── workflow/
│   ├── tenant/
│   ├── auth/
│   ├── customer/
│   ├── review/
│   ├── forms/
│   ├── team/
│   ├── payment/
│   ├── analytics/
│   ├── platform/
│   ├── developer/
│   ├── search/
│   ├── settings/
│   └── audit/
│
├── shared/                       # Cross-cutting infrastructure
│   ├── db.ts                     # Drizzle client (postgres.js)
│   ├── db/
│   │   ├── schema.ts             # Barrel export of all schemas
│   │   ├── relations.ts          # Drizzle relation definitions
│   │   └── schemas/              # Individual table schemas
│   ├── inngest.ts                # Inngest client + typed event catalog
│   ├── redis.ts                  # Upstash Redis client
│   ├── logger.ts                 # Pino structured logging
│   ├── errors.ts                 # Domain error classes
│   ├── trpc.ts                   # tRPC context + middleware + procedures
│   ├── optimistic-concurrency.ts # Version-based updates
│   ├── audit/audit-logger.ts     # Shared audit logging
│   └── module-system/            # Module registry, manifests, gates
│
├── components/                   # React components
│   ├── ui/                       # shadcn/ui primitives (26 components)
│   ├── layout/                   # Sidebar, topbar, nav
│   ├── booking-flow/             # Public booking wizard components
│   ├── public-form/              # Public form renderer
│   ├── review/                   # Review submission components
│   ├── portal/                   # Tenant portal shell
│   └── providers/                # React context providers
│
├── hooks/                        # Custom React hooks
│   ├── use-debounce.ts
│   ├── use-local-storage.ts
│   ├── use-media-query.ts
│   └── ...
│
├── lib/
│   ├── trpc/react.tsx            # tRPC React client (`api` hook)
│   ├── utils.ts                  # cn() utility
│   └── calendar-links.ts         # ICS generation
│
├── server/
│   └── root.ts                   # Root tRPC router (merges all module routers)
│
└── types/                        # Shared TypeScript types for frontend
```
