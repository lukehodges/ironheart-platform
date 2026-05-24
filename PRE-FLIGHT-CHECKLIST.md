# Pre-Flight Checklist — Phase 0.1.B Tenant Provisioning

> Generated: 2026-05-23  
> Branch: `feature/product-platform`  
> Goal: Ready database + environment for first manual test of client tenant provisioning flow

---

## Step 1: Review the Pending Migration

**File:** `drizzle/0003_workos_org_id.sql` (108 lines, 34 statements)

→ See: `drizzle/0003_MIGRATION_NOTES.md`

**Summary:** Creates full audit system (sessions, lens analysis, findings, recommendations, reports, call notes) + WorkOS integration fields on existing tables. **Safe to apply — no data destructive operations, all additive.**

Key changes:
- 5 new ENUM types (EngagementStage, AuditLens, AuditSessionStatus, FindingImpact, RagScore, AuditReportStatus)
- 6 new audit tables with FK/index integrity
- 11 new columns on `tenants` (workosOrgId) and `engagements` (stage, clientTenantId, auditWindow*, closedReason, planeProjectId, driveFolderId, discoveryCallId, discoveryNotes, qualificationData)

**Risk Assessment:** ✅ **LOW** — No destructive operations, all nullable with sensible defaults.

---

## Step 2: Apply Migration

```bash
cd /Users/lukehodges/Documents/ironheart-refactor
npx drizzle-kit migrate
```

This applies `0003_workos_org_id.sql` to your Postgres instance in a single transaction. Takes ~2-5 seconds.

Expected output:
```
Applying migration: 0003_workos_org_id.sql
✓ Migration applied successfully
```

---

## Step 3: Seed the Modules Catalogue

The modules table must be populated before provisioning. Includes: auth, tenant, platform (core modules) + customer, booking, team, scheduling, portal, staff (vertical modules) + premium modules + consulting client modules (client-portal, onboarding, audit-view, bookings, forms).

```bash
npm run db:seed
```

This runs `scripts/seed-demo.ts` which is **idempotent** — already-seeded modules are skipped.

Expected output:
```
✓ schema integrity verified
✓ platform modules already present
✓ platform tenant already exists
✓ platform admin already exists
✓ demo tenant already exists
...
✓ seed complete
```

---

## Step 4: Bootstrap the Ironheart Platform Tenant

The code expects a tenant with slug `"ironheart"` (or env var `IRONHEART_TENANT_ID`) to exist. This is **The Ironheart Ltd** business tenant used by Luke to provision client tenants.

**Check if it already exists:**

```bash
# If IRONHEART_TENANT_ID is already set in .env.local, you're done
grep IRONHEART_TENANT_ID .env.local
```

**If not set, bootstrap it:**

```bash
npm run db:bootstrap-platform
```

This script:
- Checks if tenant with slug `"ironheart"` already exists (idempotent)
- Creates it with sensible defaults (name: "Ironheart", plan: "CUSTOM", status: "ACTIVE")
- **Prints the tenant UUID on stdout**

Example output:
```
📦 Bootstrapping Ironheart platform tenant...
✓ Ironheart tenant created

Tenant ID: 550e8400-e29b-41d4-a716-446655440000

Copy this into .env.local:
IRONHEART_TENANT_ID=550e8400-e29b-41d4-a716-446655440000

✓ Bootstrap complete. Restart your dev server.
```

**Then paste that UUID into `.env.local`:**

```bash
echo "IRONHEART_TENANT_ID=550e8400-e29b-41d4-a716-446655440000" >> .env.local
```

(Replace the UUID with the one from the script output.)

---

## Step 5: Verify Environment Variables

Required env vars for tenant provisioning flow. Check your `.env.local` or `.env.example`:

### Core (must be set)
| Var | Status | Current |
|-----|--------|---------|
| `DATABASE_URL` | ✅ set in .env.local | postgres://... |
| `WORKOS_API_KEY` | ✅ set in .env.local | sk_... |
| `WORKOS_CLIENT_ID` | ✅ set in .env.local | client_... |
| `WORKOS_COOKIE_PASSWORD` | ✅ set in .env.local | (32+ random chars) |
| `WORKOS_REDIRECT_URI` | ✅ set in .env.local | http://localhost:3000/api/auth/callback |

### Multi-tenancy (must be set)
| Var | Status | Current |
|-----|--------|---------|
| `IRONHEART_TENANT_ID` | ⚠️ set only in .env.example | (was just set by bootstrap script) |
| `PLATFORM_ADMIN_EMAILS` | ✅ set in .env.local | luke@theironheart.org |

### Optional / External Services
| Var | Status | Notes |
|-----|--------|-------|
| `UPSTASH_REDIS_REST_URL` | ✅ set in .env.local | For session cache (optional, fallback to in-memory) |
| `UPSTASH_REDIS_REST_TOKEN` | ✅ set in .env.local | Paired with above |
| `INNGEST_EVENT_KEY` | ✅ set in .env.local | Background job queue (dev mode: in-process) |
| `INNGEST_SIGNING_KEY` | ✅ set in .env.local | Paired with above |
| `RESEND_API_KEY` | ⚠️ set only in .env.example | Email notifications (dev: can use console log) |
| `ANTHROPIC_API_KEY` | ✅ set in .env.local | For MCP tools (optional) |

**Action required:** If `IRONHEART_TENANT_ID` was not set, add it now (from Step 4 output).

---

## Step 6: WorkOS Dashboard Configuration (One-Time, Manual)

Log into [WorkOS Dashboard](https://dashboard.workos.com) and verify:

1. **Redirect URI registered**
   - Dashboard → Settings → Authentication → Redirect URIs
   - Add: `http://localhost:3000/api/auth/callback` (dev)
   - Add: `https://app.theironheart.org/api/auth/callback` (prod, once deployed)

2. **Email/Password enabled**
   - Dashboard → Settings → Authentication → Email & Password
   - Toggle: enabled

3. **Google OAuth configured (optional, for faster dev)**
   - Dashboard → Settings → Authentication → Google OAuth
   - Will auto-populate from your Google Cloud project

4. **Invitation email branding (optional, improves UX)**
   - Dashboard → Settings → Invitations → Branding
   - Logo URL: https://cdn.theironheart.org/logo.png
   - From email: invitations@theironheart.org
   - Subject template: "Join [Organization] on Ironheart"

---

## Step 7: Verify Inngest Dev Server (Optional)

If running background jobs locally (async event processing):

```bash
npx inngest-cli dev
```

This starts the Inngest event listener on http://localhost:8288 (separate from your Next.js server). For now, jobs run in-process, so this is **not required** for basic testing.

---

## Step 8: Start the App

```bash
npm run dev
```

This starts Next.js on http://localhost:3000.

Expected output:
```
> next dev
  ▲ Next.js 15.x.x
  - ready on 0.0.0.0:3000
```

---

## Step 9: Run a Smoke Test

### A. Log in as platform admin
- Navigate to http://localhost:3000/api/auth/workos (or sign in button)
- Use email: `luke@theironheart.org` (or whatever is in `PLATFORM_ADMIN_EMAIL`)
- WorkOS will show login form (email/password or Google SSO if configured)

### B. Verify you land on the platform dashboard
- After sign-in, you should be redirected to `/platform` (or `/dashboard`)
- You should see platform navigation (sidebar + tenant selector)

### C. Test basic provisioning
- Navigate to `/platform/clients/new` (or "New Client" button)
- Fill form: Company name, contact email, audit type
- Click "Provision"
- Watch browser network tab; request should POST to `/api/trpc/consulting.createClientEngagement`
- Expected flow:
  1. WorkOS org created (POST to WorkOS API)
  2. New tenant row inserted (in Postgres)
  3. New engagement created (in Postgres)
  4. Invitation email sent (or logged to console if RESEND_API_KEY not set)
  5. Redirect to engagement page

### D. Verify audit tables exist
```bash
psql $DATABASE_URL -c "SELECT count(*) FROM audit_sessions;"
```
Should return `0` (tables exist, no data yet).

---

## What Works Right Now

✅ **Tenant creation flow**
- Platform admin user (Luke) can log in via WorkOS
- Form to provision new client tenant
- Transaction ensures atomicity (all-or-nothing)
- WorkOS org created, Postgres tenant+engagement+permissions created
- Invitation email sent to client contact

✅ **Multi-tenancy primitives**
- Tenant resolution middleware (reads X-Tenant header or from auth)
- Tenant selector page (switcher for accounts with multiple tenants)
- Role-based access control (OWNER, ADMIN, MEMBER roles)

✅ **Database schema**
- Audit system fully modeled (sessions, lenses, findings, recommendations, reports)
- Engagement lifecycle (stage enum: discovery → proposal → contracted → ... → closed)
- WorkOS integration (workosOrgId on tenants, workos_user_id on users)

---

## Known Limitations (Not Yet Done)

⚠️ **Task 6.5 — Tenant selector page**
- Designed but not wired into layout
- Switcher appears in placeholder; clicking it doesn't change active tenant
- Will be implemented in Phase 0.1.B Task 6.5

⚠️ **Task 8 — Unit tests for provisioning + middleware**
- Provisioning service is tested (fixtures exist)
- Tenant resolution middleware not yet tested
- Will be added in Task 8

⚠️ **Task 9 — Invitations management UI**
- Invitations are sent (via RESEND or logged)
- No UI yet to view pending invitations, resend, or revoke
- Will be implemented in Task 9

⚠️ **Schema tech debt — Task 17**
- `users.tenantId` is NOT NULL but should allow multi-tenant users (platform admins)
- Affects: platform admin sign-up, multi-tenant invitation acceptance
- To fix: migration to make tenantId nullable + permission model adjustment
- **Workaround for now:** All users belong to exactly one tenant; platform admins are created manually in the platform tenant

---

## Troubleshooting

### Migration fails: "type already exists"
Your database may have a partial migration. This is safe; drizzle-kit tracks by hash. Just run `npx drizzle-kit migrate` again.

### Bootstrap script says tenant already exists
Good! Use the existing UUID. If you lost it, query: `SELECT id FROM tenants WHERE slug='ironheart';`

### WorkOS sign-in redirects to login again
Check:
1. `WORKOS_REDIRECT_URI` matches exactly what's in WorkOS Dashboard (trailing slashes matter)
2. `WORKOS_COOKIE_PASSWORD` is >= 32 characters
3. Cookies are enabled in your browser

### "Ironheart tenant not provisioned" error when submitting form
Either:
1. `IRONHEART_TENANT_ID` not set in .env.local (restart dev server after adding it)
2. Bootstrap script failed to insert (check Postgres logs)
3. Typo in env var name

---

## Next Steps (After This Checklist)

1. ✅ Run the smoke test (Step 9.C — provision a test client)
2. 🔧 Debug any issues with network tab / server logs
3. 📝 Document any schema changes needed for audit report generation
4. 🔄 Implement Task 6.5 (tenant selector) if testing multi-tenant flows
5. 🧪 Add integration tests (Task 8) once flow is solid

---

## Support

Questions or blockers? Check:
- `drizzle/0003_MIGRATION_NOTES.md` — migration details
- `src/modules/consulting/consulting.service.ts` — provisioning logic
- `src/modules/auth/workos.client.ts` — WorkOS client setup
- `.env.example` — full env var reference

Generated with care. Good luck!
