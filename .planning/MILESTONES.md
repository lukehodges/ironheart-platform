# Milestones

## v1.0 — Modular Monolith Foundation

**Completed:** 2026-04-11
**Phases:** 0–5 (6 phases)
**Last phase number:** 5

### What Shipped

- Next.js 16 + tRPC 11 + Drizzle ORM scaffold with WorkOS AuthKit
- Booking module: jobs, slot locking, Google Calendar two-way sync
- Scheduling module: availability windows, smart assignment, slot capacity
- Notification module: Inngest-driven, Resend + Twilio, templated sends
- Calendar sync module: push/pull, webhook channel renewal
- Workflow engine: dual-mode linear + graph, visual designer, sub-workflows
- Team module: availability, capacity, BLOCKED/SPECIFIC/RECURRING precedence
- Customer module: merge (7-table cascade), soft-delete, audit log
- Forms module: 8 field types, public token submit, session key expiry
- Review module: pre-screening, auto-publish threshold, request automation
- Tenant module: organizationSettings (27 typed columns), module gating via Redis
- Platform module: tenant provisioning, platformAdminProcedure, module seeding
- Integrations hub: wired into root router, Inngest serve endpoint
- 224 tests passing, tsc clean, build passing

### Status

Foundation complete. All modules operational on booking-centric schema. Ready for universal platform migration.
