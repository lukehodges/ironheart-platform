# Production Deployment Runbook

The repeatable, delegable process for deploying ironheart-platform. If someone
who isn't Luke needs to ship a change or recover a broken deploy, this is the
document they follow.

**The one rule:** `main` is always deployable. Nothing reaches production that
hasn't passed CI and a preview check. Every production state is recoverable.

---

## The environment ladder

Each rung is a full copy of the app pointed at **its own isolated state**.
Code climbs the ladder; it never skips a rung.

| Rung | Code source | Database | External services | Who sees it |
|------|-------------|----------|-------------------|-------------|
| **Local** | your working tree | local docker Postgres (`docker-compose.dev.yml`, port 5433) | test/sandbox | you |
| **Preview** | every PR branch (auto) | Neon preview branch (auto, per deploy) | test/sandbox | anyone with the link |
| **Production** | promoted from `main` | Neon production branch (London / eu-west-2) | live | clients |

> A **staging** rung (a long-lived Neon branch + a `staging` Vercel alias) sits
> between preview and production once traffic justifies it. Until then, a
> smoke-tested preview is the gate.

The non-negotiable property: **a preview deploy must never be able to touch the
production database.** Neon branching enforces this — each preview gets its own
branch.

---

## Environment variable matrix

Secrets live in **Vercel's encrypted env store**, scoped per environment — never
in the repo. Local secrets live in `.env.local` (gitignored). Use **test/sandbox**
credentials everywhere except Production.

| Variable | Local | Preview | Production | Source / notes |
|----------|:-----:|:-------:|:----------:|----------------|
| `DATABASE_URL` (+ `POSTGRES_*`, `NEON_*`) | docker | **auto** | **auto** | Auto-injected by the Vercel↔Neon integration for Preview + Production. Local = docker. |
| `WORKOS_API_KEY` / `WORKOS_CLIENT_ID` | test | test | **live** | WorkOS dashboard. Separate envs for test vs live. |
| `WORKOS_REDIRECT_URI` | `http://localhost:3000/...` | preview URL | prod domain | Must match the deploy URL exactly. |
| `WORKOS_COOKIE_PASSWORD` | any 32+ char | unique | unique | Generate per environment. |
| `UPSTASH_REDIS_REST_URL` / `_TOKEN` | test db | test db | **prod db** | Upstash console. |
| `INNGEST_EVENT_KEY` / `INNGEST_SIGNING_KEY` | dev | branch env | prod env | Inngest cloud, per environment. |
| `NEXT_PUBLIC_SENTRY_DSN` / `SENTRY_*` | optional | prod proj | prod proj | Sentry. `SENTRY_AUTH_TOKEN` enables source-map upload in build. |
| `RESEND_API_KEY` / `RESEND_FROM_*` | test | test | **live** | Resend. |
| `TWILIO_*` | test | test | **live** | Twilio. |
| `GOOGLE_OAUTH_CLIENT_ID` / `_SECRET` | test | test | **live** | Google Cloud console. Redirect URIs per env. |
| `CALENDAR_TOKEN_ENCRYPTION_KEY` | any | unique | unique | 32-byte key, per environment. |
| `IRONHEART_TENANT_ID` | local bootstrap id | prod bootstrap id | prod bootstrap id | Output of `db:bootstrap-platform`, differs per DB. |
| `PLATFORM_ADMIN_EMAILS` | your email | — | your email | Bootstrap only; tighten after setup. |
| `LOG_LEVEL` | `debug` | `info` | `info` | Pino. |

Add a var to a Vercel scope from the CLI:
```bash
vercel env add WORKOS_API_KEY production --cwd ~/Documents/ironheart-platform
# repeat for preview; paste the value when prompted (it never enters the repo)
```

---

## Local development

```bash
docker compose -f docker-compose.dev.yml up -d   # local Postgres
npm run db:ensure-platform                         # push schema to local db
npm run db:bootstrap-platform                      # create platform tenant (sets IRONHEART_TENANT_ID)
npm run db:seed                                    # optional demo data
npm run dev                                        # http://localhost:3000
```
Health check: `curl localhost:3000/api/health` → `{"status":"healthy",...}`.

---

## Shipping a change

```
1. branch        git checkout -b feat/thing      (never commit to main)
2. open PR       push, open PR into main
3. CI gate       GitHub Actions runs typecheck · lint · test  → red blocks merge
4. preview       Vercel auto-builds the PR to a URL (own Neon branch). Open it, smoke-test.
5. merge         only when CI is green AND preview works
6. deploy        merge to main → Vercel builds & deploys production
7. tag           git tag vYYYY.MM.DD-N && git push --tags   (know what's live)
8. verify        smoke-check prod + watch Sentry / /api/health for ~10 min
```

**Why CI doesn't run `next build`:** Vercel builds every preview, so the build is
already gated there. CI stays fast and secret-free (types, lint, unit tests only).

---

## Database migrations — the careful part

Code rolls back in seconds; the database does not. So migrations must be
**backward-compatible** (expand → contract):

1. **Expand** — add new columns/tables (nullable, no drops). Deploy. Old code still works.
2. **Backfill** — populate new shape.
3. **Switch** — deploy code that uses the new shape.
4. **Contract** — only in a *later* release, remove the old columns.

This guarantees you can always roll the code back one step without the database
breaking. Never drop or rename a column in the same release that stops using it.

> Initial schema was applied to the Neon production DB with `drizzle-kit push`
> (one-time bootstrap of an empty DB). Ongoing changes should move to generated,
> versioned migrations (`drizzle-kit generate` → reviewed SQL → applied on deploy)
> so every prod schema change is auditable and reversible.

---

## Rollback

- **Code:** Vercel dashboard → Deployments → previous green deploy → **Instant Rollback** (live in seconds). Or `vercel rollback <url>`.
- **Database:** if a bad migration shipped, restore from the Neon branch / point-in-time and re-deploy the matching code tag. This is why expand/contract matters — with it, a code rollback alone usually suffices.
- **Always:** after rollback, capture what broke (Sentry + the deploy diff) before re-attempting.

---

## Pre-commit checklist

Before committing any changes (CI enforces 1–3; the rest are review discipline):

1. `npx tsc --noEmit` — zero type errors
2. `npm test` — all tests pass
3. `npm run build` — production build succeeds
4. No `alert()` calls
5. No hardcoded colors (use design tokens)
6. All queries include `tenantId` filtering
7. No `TRPCError` thrown outside routers
8. All new Inngest events added to `IronheartEvents` type
9. All new Inngest functions registered in route handler

---

## Project facts

- **Vercel project:** `ironheart-platform` (`prj_gldZnJoTZSd2cFVK8wkE8Sl7IXQX`), team `the-iron-heart`.
- **Database:** Neon, resource `ironheart-platform`, free plan, London (eu-west-2), wired to Preview + Production.
- **GitHub:** `lukehodges/ironheart-platform`. CI: `.github/workflows/ci.yml`.
- **Booking-software is a separate project** (`prj_QIiv…`) and must never share env, DB, or deploys with this one.
