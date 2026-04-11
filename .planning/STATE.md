# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-11)

**Core value:** Engines + config, never features + clients
**Current focus:** Phase 1 — Universal Data Model
**Milestone:** v2.0 Universal Platform

## Current Position

Phase: 1 of 8 (Universal Data Model)
Plan: Not started
Status: Ready to plan
Last activity: 2026-04-11 — Milestone v2.0 initialized, GSD state management wired in

Progress: [░░░░░░░░░░] 0%

## Performance Metrics

**Velocity:**
- Total plans completed: 0
- Average duration: -
- Total execution time: -

## Accumulated Context

### Decisions

- **2026-04-11**: Universal platform is the priority. Existing clients (e.g. Cotswold) have working software in the old codebase — no obligation to port UI gaps or maintain parity. Build for the long term.
- **2026-04-11**: Phases 1→2→3 must be sequential (each is a dependency). Phases 4–8 are independent and can be parallelised after Phase 1 completes.
- **2026-04-11**: Phase 1 is a schema migration — `bookings` → `jobs`, new `resources`, `addresses`, `customerContacts` tables. All existing module repos need updating. Breaking change but additive (no columns dropped on day one).
- **2026-04-11**: Milestone v2.0 initialized with GSD. 40 requirements across 8 phases. All specs pre-written in docs/superpowers/specs/.

### Pending Todos

None.

### Blockers/Concerns

- Phase 1 touches every module that references `bookings` or `staffId`. Scope is wide — plan carefully before executing.
- The existing 224 tests are the safety net — they must all pass after Phase 1.
- Phase A spec at `docs/superpowers/specs/2026-04-11-phase-a-universal-data-model.md` — read before planning Phase 1.

## Session Continuity

Last session: 2026-04-11
Stopped at: Milestone v2.0 initialized. Phase 1 ready to plan.
Resume file: None
