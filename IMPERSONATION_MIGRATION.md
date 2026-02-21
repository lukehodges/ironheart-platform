# Impersonation Feature - Database Migration

## Schema Change

The impersonation feature adds a new table: `impersonation_sessions`

### SQL Migration (if needed)

If your database schema is already deployed and you need to add the impersonation_sessions table manually:

```sql
CREATE TABLE IF NOT EXISTS impersonation_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_admin_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  target_tenant_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_impersonation_platform_admin
  ON impersonation_sessions(platform_admin_id)
  WHERE ended_at IS NULL;

CREATE INDEX idx_impersonation_tenant
  ON impersonation_sessions(tenant_id);
```

### Drizzle Schema

The table is defined in `/src/shared/db/schemas/phase6.schema.ts` and will be automatically created if you're using Drizzle Kit to generate and run migrations.

## How It Works

1. **Platform admin starts impersonation:**
   - Creates a record in `impersonation_sessions` table
   - Stores session data in Redis with 24-hour TTL
   - Creates audit log entry with action `IMPERSONATE_START`
   - Redirects to `/admin`

2. **During impersonation:**
   - `tenantProcedure` middleware checks Redis for active session
   - If session exists and not expired, overrides tenant context
   - All actions are performed in the impersonated tenant context
   - Banner shows at top of admin area

3. **Platform admin ends impersonation:**
   - Updates `impersonation_sessions.ended_at` timestamp
   - Deletes session from Redis
   - Creates audit log entry with action `IMPERSONATE_END`
   - Redirects to `/platform/tenants`

4. **Automatic expiry:**
   - Redis TTL ensures sessions expire after 24 hours
   - Next request after expiry throws "Session expired" error
   - Middleware automatically cleans up expired Redis keys

## Security

- Only users with `isPlatformAdmin = true` can start impersonation
- Cannot impersonate suspended tenants
- All impersonation actions logged to `audit_logs` table
- Session expiry enforced at 24 hours
- IP address and User-Agent tracked for each session
- One active impersonation per platform admin (new session replaces old)

## Testing

After deployment, verify:

1. Platform admin can start impersonation from tenant detail page
2. Banner appears in admin layout during impersonation
3. Tenant context is correctly overridden
4. Platform admin can end impersonation
5. Audit logs contain `IMPERSONATE_START` and `IMPERSONATE_END` entries
6. Session expires after 24 hours
