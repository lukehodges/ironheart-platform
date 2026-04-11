# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-11)

**Core value:** Engines + config, never features + clients
**Current focus:** Phase 1 — Universal Data Model
**Milestone:** v2.0 Universal Platform

## Current Position

Phase: 1 of 8 (Universal Data Model)
Plan: 2 of N (module code updates complete — tests next)
Status: In progress
Last activity: 2026-04-11 — Plan 01-02 complete (module code updates)

Progress: [██░░░░░░░░] ~10%

## Performance Metrics

**Velocity:**
- Total plans completed: 2
- Average duration: 38min
- Total execution time: 75min

| Plan  | Duration | Tasks | Files |
|-------|----------|-------|-------|
| 01-01 | 28min    | 3     | 8     |
| 01-02 | 47min    | 2     | 46    |

## Accumulated Context

### Decisions

- **2026-04-11**: Universal platform is the priority. Existing clients (e.g. Cotswold) have working software in the old codebase — no obligation to port UI gaps or maintain parity. Build for the long term.
- **2026-04-11**: Phases 1→2→3 must be sequential (each is a dependency). Phases 4–8 are independent and can be parallelised after Phase 1 completes.
- **2026-04-11**: Phase 1 is a schema migration — `bookings` → `jobs`, new `resources`, `addresses`, `customerContacts` tables. All existing module repos need updating. Breaking change but additive (no columns dropped on day one).
- **2026-04-11**: Milestone v2.0 initialized with GSD. 40 requirements across 8 phases. All specs pre-written in docs/superpowers/specs/.
- **2026-04-11** (01-01): drizzle-kit generate cannot be driven non-interactively — migration SQL authored manually with ALTER TABLE RENAME TO.
- **2026-04-11** (01-01): Kept backward-compat TypeScript aliases (bookings=jobs, etc.) in schema layer to allow incremental module updates in plan 02.
- **2026-04-11** (01-01): db.execute() with postgres.js returns RowList (array-like with .length) not pg QueryResult (.rowCount).
- **2026-04-11** (01-02): Kept old booking module alongside new jobs module during transition — both registered in Inngest route.ts and root.ts. Will be cleaned up in a later plan.
- **2026-04-11** (01-02): customerContacts CRUD added as nested sub-router `customer.contacts.*` — contacts are owned by the customer module.
- **2026-04-11** (01-02): resourceAvailability is the canonical table name; team and scheduling modules now use it directly (not the userAvailability alias).

### Pending Todos

None.

### Blockers/Concerns

- The migration SQL (0004_phase1-universal-data-model.sql) has not yet been applied to the database — must be applied before any module code can be tested against the DB.
- Old booking module is still registered alongside jobs module — needs cleanup plan once all consumers confirmed updated.
- Tests in plan 01-03 will need to reference jobs/resources APIs (not old booking APIs).

## Session Continuity

Last session: 2026-04-11
Stopped at: Plan 01-02 complete. Module code updates done. Ready for Plan 01-03 (tests).
Resume file: None
