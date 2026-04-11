# Ironheart — Project Brief

## What This Is

A universal SaaS platform for any service business. Started as a party entertainment booking tool (Cotswold Entertainers), now being transformed into a multi-vertical platform where engines + config replace features + clients. New verticals are onboarded through configuration, not code.

## Core Value

**Engines + config, never features + clients.** Every piece of client-specific logic must become a row in a database table.

## Current Milestone: v2.0 Universal Platform

**Goal:** Replace the booking-centric, Cotswold-specific data model with a universal platform capable of handling any service business type, any resource type, any job pattern, and any billing model.

**Target features:**
- Universal data model (jobs, resources, addresses, customerContacts)
- Rule-based payment split engine (no hardcode)
- DB-driven notification engine (no hardcode)
- Route jobs with multi-stop optimisation
- Recurring contracts with rrule scheduling
- Classes & memberships with capacity management
- Field service billing (time & materials)
- Projects & CRM pipeline

## Requirements

### Validated

<!-- Shipped in v1.0: modular monolith foundation -->

- ✓ Next.js 16 + tRPC 11 + Drizzle ORM scaffold — v1.0
- ✓ WorkOS AuthKit auth with RBAC and tenant isolation — v1.0
- ✓ Booking module (jobs, slot locking, Google Calendar sync) — v1.0
- ✓ Scheduling module (availability, smart assignment, slot locking) — v1.0
- ✓ Notification module (Inngest-driven, Resend + Twilio) — v1.0
- ✓ Workflow engine (linear + graph, visual designer) — v1.0
- ✓ Team, customer, forms, review, tenant, platform modules — v1.0
- ✓ 224 tests passing, tsc clean, build passing — v1.0
- ✓ Inngest integration hub wired into root router — v1.0

### Active

<!-- v2.0 Universal Platform scope -->

See `.planning/REQUIREMENTS.md` for full REQ-ID list.

### Out of Scope

- Mobile-native apps — web-first, mobile PWA only
- AI/ML features — not in v2.0 scope
- Multi-region DB sharding — row-level isolation is sufficient
- GraphQL — tRPC already gives type safety
- BullMQ — requires separate worker, incompatible with Vercel

## Context

**Reference codebase:** `/Users/lukehodges/Documents/ironheart` — 112k LOC, 42 Prisma models, 27 tRPC routers. Contains correct business logic. Read for reference, never modify.

**Existing clients:** Cotswold Entertainers is on the legacy codebase. No obligation to port UI gaps or maintain parity. Build for the long term.

**Phase sequencing:** Phases 1→2→3 must be sequential (each is a dependency). Phases 4–8 are independent and can be parallelised after Phase 1 completes.

**Phase 1 scope:** Wide — touches every module that references `bookings` or `staffId`. The 224 existing tests are the safety net.

## Constraints

- **Tech stack**: Next.js 16, tRPC 11, Drizzle ORM, postgres.js, WorkOS AuthKit, Inngest, Upstash Redis, Sentry, Pino, React 19, Tailwind 4 — locked
- **Database**: PostgreSQL shared with legacy codebase — same DB, different schema evolution
- **Migration**: All changes must be additive first (nullable columns, old columns kept), then backfill, then drop — zero-downtime
- **Tests**: All 224 existing tests must pass after each phase — non-negotiable safety net
- **Build**: tsc --noEmit + next build must pass — CI gate

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Universal platform over feature parity | Existing clients have working software in legacy; build for long term | ✓ Good |
| Drizzle ORM over Prisma | Better DX, type safety, no N+1 footguns, faster queries | ✓ Good |
| WorkOS AuthKit over NextAuth | Enterprise RBAC, SSO-ready, managed auth infra | ✓ Good |
| Inngest over Vercel Crons | Reliable retries, fan-out, step functions, no cron drift | ✓ Good |
| Row-level tenant isolation | Compatible with shared DB; no schema-per-tenant complexity | ✓ Good |
| Additive migrations only (nullable first) | Zero-downtime on shared prod DB | — Pending |
| `bookings` → `jobs` rename | Universal term for any service job type | — Pending |
| `staffId` → `resourceId` via resources table | Resources can be people, vehicles, rooms, equipment | — Pending |

---
*Last updated: 2026-04-11 after milestone v2.0 Universal Platform initialized*
