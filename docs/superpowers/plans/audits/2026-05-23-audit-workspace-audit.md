# Audit Workspace — Backend Discovery Audit

**Date:** 2026-05-23
**Branch:** feature/product-platform
**Phase:** 0.3 Task 1

---

## Existing Module Surface (before gap-fill)

### Router procedures (all using `moduleProcedure` = tenantProcedure + moduleGate)

| Procedure | Type | Input | Notes |
|---|---|---|---|
| `createSession` | mutation | `{ engagementId }` | Throws if active session exists |
| `getSession` | query | `{ auditSessionId }` | Returns bare session record |
| `getByEngagement` | query | `{ engagementId }` | Throws NotFoundError if none |
| `getFull` | query | `{ auditSessionId }` | Returns AuditSessionWithLenses |
| `updateCallNotes` | mutation | `{ auditSessionId, contactUserId, rawNotes, callDate?, callDuration? }` | Upsert by (session, contact) |
| `upsertLens` | mutation | `{ auditSessionId, lens, ragScore?, ragJustification?, currentState? }` | Upsert by (session, lens) |
| `createFinding` | mutation | `{ lensAnalysisId, finding, impact, evidence?, priority, estimatedAnnualWaste? }` | |
| `updateFinding` | mutation | `{ id, ...patch }` | |
| `deleteFinding` | mutation | `{ id }` | |
| `createRecommendation` | mutation | `{ lensAnalysisId, action, estimatedEffort?, estimatedCost?, priority }` | |
| `updateRecommendation` | mutation | `{ id, ...patch }` | |
| `deleteRecommendation` | mutation | `{ id }` | |
| `validateReadiness` | query | `{ auditSessionId }` | Returns AuditValidationResult |
| `markReadyForReport` | mutation | `{ auditSessionId }` | Validates → transitions status |

Total existing: **14 procedures**

### Service methods
All 14 procedures backed by service methods. Business logic complete for validation and status transitions. Inngest events fire on session create and ready-for-report.

### Repository methods
Full CRUD for all 5 tables (sessions, callNotes, lensAnalysis, findings, recommendations). Upsert patterns in place.

---

## Gap Analysis by UI Layer

### Layer 1 — Capture

**Issue:** Existing `getByEngagement` throws if no session. The UI needs an idempotent "load or create" call — consultant lands on `/platform/clients/[id]/audit` and we must always return a session.

**Issue:** All existing procedures use `tenantProcedure` (client tenant scoped). The consultant-facing UI runs under `platformAdminProcedure` with no `ctx.tenantId` — it must resolve tenantId from `engagements.clientTenantId`.

**Issue:** Auto-advance engagement stage ONBOARDING → AUDITING was missing. The events handler was a stub (no-op).

**Missing:** `getOrCreate({ engagementId })` — platformAdminProcedure, resolves tenantId from engagement, creates session + advances stage if needed, returns AuditSessionWithLenses.

**Missing:** `upsertCallNoteByEngagement({ engagementId, contactUserId, rawNotes, callDate?, callDuration? })` — autosave uses engagementId as key, no need to hold sessionId in UI state.

### Layer 2 — Processing

**Missing:** `upsertLensByEngagement({ engagementId, lens, ... })` — same pattern, engagementId-keyed for autosave.

**Missing:** `reorderFindings({ lensAnalysisId, order: string[] })` — no reorder capability in repo or service.

**Missing:** `reorderRecommendations({ lensAnalysisId, order: string[] })` — same.

Finding/recommendation CRUD (create/update/delete) already exist on moduleProcedure — UI can call those directly (lensAnalysisId is returned from upsertLens/upsertLensByEngagement).

### Layer 3 — Report Ready

**Missing:** `validateByEngagement({ engagementId })` — platformAdminProcedure version of validateReadiness.

**Missing:** `markReadyByEngagement({ engagementId })` — platformAdminProcedure version of markReadyForReport.

---

## Gap-fill Summary

### New procedures added (all `platformAdminProcedure`)

| Procedure | Type | Key Behaviour |
|---|---|---|
| `getOrCreate` | query | Idempotent fetch-or-create; auto-advances ONBOARDING → AUDITING; returns AuditSessionWithLenses |
| `upsertCallNoteByEngagement` | mutation | Resolves session from engagementId; upserts call note |
| `upsertLensByEngagement` | mutation | Resolves session from engagementId; upserts lens analysis |
| `reorderFindings` | mutation | Bulk-updates priority by index in supplied order array |
| `reorderRecommendations` | mutation | Bulk-updates priority by index in supplied order array |
| `validateByEngagement` | query | Delegates to validateReadiness; returns empty-state if no session |
| `markReadyByEngagement` | mutation | Validates → READY_FOR_REPORT; fires inngest event |

Total added: **7 procedures**

### Repository additions
- `reorderFindings(lensAnalysisId, order[])` — transactional priority update
- `reorderRecommendations(lensAnalysisId, order[])` — transactional priority update

### Schema additions (Zod)
- `getOrCreateSessionSchema`
- `upsertCallNoteByEngagementSchema`
- `upsertLensAnalysisByEngagementSchema`
- `reorderFindingsSchema`
- `reorderRecommendationsSchema`
- `validateSessionByEngagementSchema`
- `markReadyByEngagementSchema`

---

## Router Wiring

Already present in `src/server/root.ts` at line 84:
```ts
auditWorkspace: auditWorkspaceRouter,
```

No change needed.

---

## Test Coverage

- `audit-workspace.test.ts` — 10 existing tests (createSession, validateReadiness, markReadyForReport, getSession); updated with db mock to handle new db import in service.
- `audit-workspace-consultant.test.ts` — 14 new tests covering all 7 new consultant procedures.
- Total: **24 tests across 3 suites** — all pass.

---

## Known Pre-existing Issues (not introduced here)

- `action-card.test.tsx` has 10 type errors re: `LucideIcon` vs `string` — tracked as tech debt task #6, pre-existing.
- Existing 14 procedures use `moduleProcedure` (tenant-scoped). These remain correct for client portal use. The new 7 procedures use `platformAdminProcedure` for the consultant UI.
