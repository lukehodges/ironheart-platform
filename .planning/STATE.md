# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-11)

**Core value:** Engines + config, never features + clients
**Current focus:** Phase 1 — Universal Data Model
**Milestone:** v2.0 Universal Platform

## Current Position

Phase: 1 of 8 (Universal Data Model)
Plan: 1 of N (schema layer complete — module updates next)
Status: In progress
Last activity: 2026-04-11 — Plan 01-01 complete (schema layer)

Progress: [█░░░░░░░░░] ~5%

## Performance Metrics

**Velocity:**
- Total plans completed: 1
- Average duration: 28min
- Total execution time: 28min

## Accumulated Context

### Decisions

- **2026-04-11**: Universal platform is the priority. Existing clients (e.g. Cotswold) have working software in the old codebase — no obligation to port UI gaps or maintain parity. Build for the long term.
- **2026-04-11**: Phases 1→2→3 must be sequential (each is a dependency). Phases 4–8 are independent and can be parallelised after Phase 1 completes.
- **2026-04-11**: Phase 1 is a schema migration — `bookings` → `jobs`, new `resources`, `addresses`, `customerContacts` tables. All existing module repos need updating. Breaking change but additive (no columns dropped on day one).
- **2026-04-11**: Milestone v2.0 initialized with GSD. 40 requirements across 8 phases. All specs pre-written in docs/superpowers/specs/.
- **2026-04-11** (01-01): drizzle-kit generate cannot be driven non-interactively — migration SQL authored manually with ALTER TABLE RENAME TO.
- **2026-04-11** (01-01): Kept backward-compat TypeScript aliases (bookings=jobs, etc.) in schema layer to allow incremental module updates in plan 02.
- **2026-04-11** (01-01): db.execute() with postgres.js returns RowList (array-like with .length) not pg QueryResult (.rowCount).

### Pending Todos

None.

### Blockers/Concerns

- Module code (booking.repository.ts, review.repository.ts, etc.) still uses old `bookingId` field names — 90 tsc errors expected until Plan 02 completes.
- The migration SQL (0004_phase1-universal-data-model.sql) has not yet been applied to the database — must be applied before any module code can be tested against the DB.
- The existing 224 tests will fail until Plan 02 completes. This is expected.

## Session Continuity

Last session: 2026-04-11
Stopped at: Plan 01-01 complete. Schema layer done. Ready for Plan 01-02 (module code updates).
Resume file: None
