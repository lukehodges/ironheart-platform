#!/usr/bin/env bash
# Push local .env.local secrets into Vercel's Preview + Production scopes.
# Run this yourself — the values flow from your file straight to your Vercel.
#
#   bash scripts/push-env-to-vercel.sh
#
# Deliberately EXCLUDED:
#   - DATABASE_URL / POSTGRES_* / PG* / NEON_* / VERCEL_OIDC_TOKEN
#       → Neon's integration already injects these; don't overwrite.
#   - WORKOS_REDIRECT_URI → must match each deploy's URL (set per-env separately).
#   - IRONHEART_TENANT_ID → the prod DB has its own platform tenant (bootstrap separately).
set -euo pipefail
cd "$(dirname "$0")/.."

VARS=(
  WORKOS_CLIENT_ID WORKOS_API_KEY WORKOS_COOKIE_PASSWORD
  UPSTASH_REDIS_REST_URL UPSTASH_REDIS_REST_TOKEN
  INNGEST_EVENT_KEY INNGEST_SIGNING_KEY
  NEXT_PUBLIC_SENTRY_DSN SENTRY_ORG SENTRY_PROJECT
  LOG_LEVEL DEFAULT_TENANT_SLUG PLATFORM_ADMIN_EMAILS IRONHEART_MCP_DEV_KEY
)

for name in "${VARS[@]}"; do
  val=$(grep -E "^${name}=" .env.local | head -1 | cut -d= -f2- | sed -E 's/^"//; s/"$//')
  if [ -z "$val" ]; then echo "·  $name — empty in .env.local, skipped"; continue; fi
  for envn in preview production; do
    vercel env rm "$name" "$envn" -y >/dev/null 2>&1 || true   # idempotent: replace if exists
    printf '%s' "$val" | vercel env add "$name" "$envn" >/dev/null 2>&1 \
      && echo "✓  $name → $envn" \
      || echo "✗  $name → $envn (failed)"
  done
done

echo
echo "Done. Still need per-environment values (set these in the Vercel dashboard):"
echo "  • WORKOS_REDIRECT_URI  — the prod deploy's /callback URL (+ whitelist it in WorkOS)"
echo "  • IRONHEART_TENANT_ID  — from bootstrapping the platform tenant on the Neon prod DB"
