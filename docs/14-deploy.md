# Build & Deploy

## Environment variables

Required in production:

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string |
| `WORKOS_API_KEY` | WorkOS auth |
| `WORKOS_CLIENT_ID` | WorkOS auth |
| `NEXT_PUBLIC_WORKOS_REDIRECT_URI` | WorkOS redirect |
| `UPSTASH_REDIS_REST_URL` | Redis cache |
| `UPSTASH_REDIS_REST_TOKEN` | Redis auth |
| `INNGEST_EVENT_KEY` | Inngest event publishing |
| `INNGEST_SIGNING_KEY` | Inngest webhook verification |
| `RESEND_API_KEY` | Email sending |
| `SENTRY_DSN` | Error tracking |
| `NEXT_PUBLIC_SENTRY_DSN` | Client-side error tracking |

Optional:

| Variable | Purpose |
|----------|---------|
| `DEFAULT_TENANT_SLUG` | Development default tenant |
| `PLATFORM_ADMIN_EMAILS` | Bootstrap platform admin (remove after setup) |
| `TWILIO_ACCOUNT_SID` | SMS |
| `TWILIO_AUTH_TOKEN` | SMS |
| `LOG_LEVEL` | Pino log level (default: `info`) |

## Build commands

```bash
npm run dev          # Start dev server (runs migrations first)
npm run build        # Production build (runs migrations first)
npm test             # Run test suite
npm run test:coverage # Tests with coverage
npm run lint         # ESLint
npm run db:seed      # Seed demo data
```

## Pre-commit checklist

Before committing any changes:

1. `npx tsc --noEmit` — zero type errors
2. `npm test` — all tests pass
3. `npm run build` — production build succeeds
4. No `alert()` calls
5. No hardcoded colors (use design tokens)
6. All queries include `tenantId` filtering
7. No `TRPCError` thrown outside routers
8. All new Inngest events added to `IronheartEvents` type
9. All new Inngest functions registered in route handler
