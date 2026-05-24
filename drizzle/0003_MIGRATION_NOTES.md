# Migration 0003: Audit System & WorkOS Integration
> File: `drizzle/0003_workos_org_id.sql` | Date: 2026-05-23

## Summary
Comprehensive schema expansion to support full audit lifecycle (sessions, lens analysis, findings, recommendations, call notes, reports) plus critical WorkOS integration fields. **No existing data is modified or deleted.** All new tables and columns are added with sensible defaults.

- **Total lines:** 108
- **Total SQL statements:** 34 (5 ENUM types + 6 CREATE TABLE + 16 ALTER TABLE + 7 CREATE INDEX + 7 FK constraints)

## Changes by Category

### ENUM Types Created (5)
- `EngagementStage` — DISCOVERY, PROPOSAL, CONTRACTED, ONBOARDING, AUDITING, REPORTING, IMPLEMENTING, RETAINER, CLOSED_WON, CLOSED_LOST
- `AuditLens` — REVENUE, OPERATIONS, FINANCE, TECHNOLOGY, TEAM
- `AuditSessionStatus` — IN_PROGRESS, PROCESSING, READY_FOR_REPORT, COMPLETE
- `FindingImpact` — HIGH, MEDIUM, LOW
- `RagScore` — RED, AMBER, GREEN
- `AuditReportStatus` — GENERATING, DRAFT, IN_REVIEW, PUBLISHED

### New Tables Created (6)
All tables are new, data-safe, no modifications to existing records.

| Table | Purpose | Key Columns |
|-------|---------|------------|
| `audit_sessions` | Root audit engagement session | tenantId, engagementId, status |
| `audit_lens_analysis` | Analysis by lens (5-lens model) | auditSessionId, lens, ragScore, ragJustification, currentState |
| `audit_findings` | Individual findings per lens | lensAnalysisId, finding, impact, evidence, priority, estimatedAnnualWaste |
| `audit_recommendations` | Actions to remediate findings | lensAnalysisId, action, estimatedEffort, estimatedCost, priority |
| `audit_call_notes` | Raw notes from client calls | auditSessionId, contactUserId, rawNotes, callDate, callDuration |
| `audit_reports` | Compiled final reports | auditSessionId, contentHtml, contentJson, executiveSummary, totalEstimatedWaste, publishedAt |

**Risk Assessment: LOW** — All new tables. No existing data affected.

### Columns Added to Existing Tables (11 columns, 2 tables)

#### `tenants` table
- `workosOrgId` (text, nullable) — Maps tenant to WorkOS organization. **New field required for WorkOS integration.**

**Risk Assessment: LOW** — Nullable, no existing rows touched, additive only.

#### `engagements` table
- `stage` (EngagementStage, default DISCOVERY) — Tracks lifecycle stage (discovery → proposal → contracted → onboarding → auditing → reporting → implementing → retainer → closed)
- `clientTenantId` (uuid, nullable) — FK to the client tenant (supports invoicing/portal for client use)
- `auditWindowStart` (date, nullable) — Audit scope start
- `auditWindowEnd` (date, nullable) — Audit scope end
- `closedReason` (text, nullable) — Why engagement ended (won/lost/paused)
- `planeProjectId` (text, nullable) — Links to Plane project ID for async task tracking
- `driveFolderId` (text, nullable) — Google Drive folder for deliverables
- `discoveryCallId` (uuid, nullable) — FK to initial call session
- `discoveryNotes` (text, nullable) — Raw discovery notes
- `qualificationData` (jsonb, nullable) — Qualification scoring / lead scoring data

**Risk Assessment: MEDIUM** — All nullable with sensible defaults, but `stage` has DEFAULT DISCOVERY which means existing engagements will be marked as in discovery (correct assumption, but verify data semantics).

### Foreign Keys Added (7)
All enforce CASCADE on DELETE (audit records are child-owned by session/engagement):
- `audit_call_notes → audit_sessions.id`
- `audit_findings → audit_lens_analysis.id`
- `audit_lens_analysis → audit_sessions.id`
- `audit_recommendations → audit_lens_analysis.id`
- `audit_sessions → tenants.id`
- `audit_sessions → engagements.id`
- `audit_reports → {tenants, engagements, audit_sessions}.id` (3 FKs)

**Risk Assessment: LOW** — New tables only, correct referential integrity.

### Indexes Added (9)
All on audit tables for common queries:
- Session/engagement lookup: `audit_sessions (tenantId)`, `audit_sessions (engagementId)`
- Lens analysis: `audit_lens_analysis (auditSessionId)`
- Findings/recommendations: `audit_findings (lensAnalysisId)`, `audit_recommendations (lensAnalysisId)`
- Call notes: `audit_call_notes (auditSessionId)`
- Report lookup: `audit_reports (tenantId)`, `audit_reports (engagementId)`, `audit_reports (auditSessionId)`

**Risk Assessment: LOW** — All new indexes on new tables, no performance impact.

## Risk Assessment Summary

| Area | Risk | Notes |
|------|------|-------|
| Schema changes | LOW | All additive, no destructive ALTER TABLE (no DROP, no RENAME, no SET NOT NULL on existing cols) |
| Data safety | LOW | No existing data is modified, transformed, or deleted |
| Referential integrity | LOW | New FKs point to existing tables correctly, CASCADE DELETE is appropriate |
| Enum types | LOW | New ENUMs, no risk of value conflicts |
| Performance | LOW | Indexes added, no missing indexes on FKs |

## MUST REVIEW Callouts
None. This migration is **safe to apply**.

The only consideration is semantic: existing engagements will have `stage = 'DISCOVERY'` by default. If your data model requires different initial stages (e.g., some are already in PROPOSAL), you'll need a follow-up data migration to set correct values. But for a first deploy, DISCOVERY is a safe default.

## How to Apply & Rollback

### Apply
```bash
npx drizzle-kit migrate
```

This reads `drizzle/0003_workos_org_id.sql` from the migration queue and applies it to your Postgres instance in one transaction.

### Manual Rollback (if needed)
If the migration fails or you need to undo:
```sql
-- Drop indexes
DROP INDEX IF EXISTS "audit_call_notes_sessionId_idx";
DROP INDEX IF EXISTS "audit_findings_lensId_idx";
DROP INDEX IF EXISTS "audit_lens_analysis_sessionId_idx";
DROP INDEX IF EXISTS "audit_recommendations_lensId_idx";
DROP INDEX IF EXISTS "audit_sessions_tenantId_idx";
DROP INDEX IF EXISTS "audit_sessions_engagementId_idx";
DROP INDEX IF EXISTS "audit_reports_tenantId_idx";
DROP INDEX IF EXISTS "audit_reports_engagementId_idx";
DROP INDEX IF EXISTS "audit_reports_sessionId_idx";

-- Drop tables (cascade drops FKs)
DROP TABLE IF EXISTS "audit_call_notes";
DROP TABLE IF EXISTS "audit_findings";
DROP TABLE IF EXISTS "audit_recommendations";
DROP TABLE IF EXISTS "audit_lens_analysis";
DROP TABLE IF EXISTS "audit_sessions";
DROP TABLE IF EXISTS "audit_reports";

-- Remove columns from existing tables
ALTER TABLE "engagements" DROP COLUMN IF EXISTS "stage";
ALTER TABLE "engagements" DROP COLUMN IF EXISTS "clientTenantId";
ALTER TABLE "engagements" DROP COLUMN IF EXISTS "auditWindowStart";
ALTER TABLE "engagements" DROP COLUMN IF EXISTS "auditWindowEnd";
ALTER TABLE "engagements" DROP COLUMN IF EXISTS "closedReason";
ALTER TABLE "engagements" DROP COLUMN IF EXISTS "planeProjectId";
ALTER TABLE "engagements" DROP COLUMN IF EXISTS "driveFolderId";
ALTER TABLE "engagements" DROP COLUMN IF EXISTS "discoveryCallId";
ALTER TABLE "engagements" DROP COLUMN IF EXISTS "discoveryNotes";
ALTER TABLE "engagements" DROP COLUMN IF EXISTS "qualificationData";
ALTER TABLE "tenants" DROP COLUMN IF EXISTS "workosOrgId";

-- Drop enums
DROP TYPE IF EXISTS "EngagementStage";
DROP TYPE IF EXISTS "AuditLens";
DROP TYPE IF EXISTS "AuditSessionStatus";
DROP TYPE IF EXISTS "FindingImpact";
DROP TYPE IF EXISTS "RagScore";
DROP TYPE IF EXISTS "AuditReportStatus";
```

However, rollback is only safe if **no audit data has been inserted yet**. Once records exist, dropping tables will lose data. Always test in development first.
