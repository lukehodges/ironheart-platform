# Impersonation Feature - Quick Reference

## For Developers

### Using the Impersonation Context

Any tRPC procedure using `tenantProcedure` can check if it's being called during impersonation:

```typescript
export const myProcedure = tenantProcedure
  .input(z.object({ /* ... */ }))
  .mutation(async ({ ctx, input }) => {
    // Check if platform admin is impersonating
    if (ctx.isImpersonating) {
      logger.info(
        {
          platformAdminId: ctx.platformAdminId,
          impersonationSessionId: ctx.impersonationSessionId,
          action: 'my_action',
        },
        'Action performed during impersonation'
      );
    }

    // Your normal logic here
    // ctx.tenantId will be the impersonated tenant if active
  });
```

### Frontend Hook Usage

```typescript
'use client'

import { useImpersonate } from '@/hooks/use-impersonate'

function MyComponent() {
  const impersonate = useImpersonate()

  return (
    <Button
      onClick={() => impersonate.start(tenantId, tenantName)}
      disabled={impersonate.isStarting}
    >
      Impersonate
    </Button>
  )
}
```

### Checking Active Impersonation

```typescript
'use client'

import { api } from '@/lib/trpc/react'

function MyComponent() {
  const { data: session } = api.platform.getActiveImpersonation.useQuery()

  if (session) {
    // Platform admin is currently impersonating
    console.log('Impersonating:', session.tenantName)
    console.log('Session ID:', session.sessionId)
  }
}
```

### Backend: Manual Session Check

```typescript
import { redis } from '@/shared/redis'

async function checkImpersonation(platformAdminId: string) {
  const key = `impersonate:${platformAdminId}`
  const cached = await redis.get<string>(key)

  if (!cached) return null

  const session = JSON.parse(cached)

  // Check expiry
  if (session.expiresAt < Date.now()) {
    await redis.del(key)
    return null
  }

  return session
}
```

---

## For Platform Admins

### Starting Impersonation

1. Navigate to `/platform/tenants/[id]`
2. Click **"Impersonate"** button in tenant header
3. Confirm the action in the dialog
4. You'll be redirected to `/admin` as that tenant

### During Impersonation

- A **red banner** appears at the top showing the tenant name
- You have **full access** to all tenant admin features
- All actions are **logged** in the audit trail
- Session **expires after 24 hours**

### Ending Impersonation

1. Click **"End Impersonation"** in the red banner
2. You'll be redirected back to `/platform/tenants`

---

## For Security Auditors

### Audit Trail Queries

Find all impersonation sessions for a tenant:
```sql
SELECT *
FROM audit_logs
WHERE action IN ('IMPERSONATE_START', 'IMPERSONATE_END')
  AND entity_id = 'tenant-uuid'
ORDER BY created_at DESC;
```

Find active impersonation sessions:
```sql
SELECT *
FROM impersonation_sessions
WHERE ended_at IS NULL
ORDER BY started_at DESC;
```

Find impersonation sessions by platform admin:
```sql
SELECT
  s.*,
  u.email as platform_admin_email,
  t.name as tenant_name
FROM impersonation_sessions s
JOIN users u ON u.id = s.platform_admin_id
JOIN tenants t ON t.id = s.tenant_id
WHERE u.email = 'admin@example.com'
ORDER BY s.started_at DESC;
```

---

## Redis Keys

**Format:** `impersonate:${platformAdminId}`

**Value:** JSON string
```json
{
  "sessionId": "uuid",
  "tenantId": "uuid",
  "platformAdminEmail": "admin@example.com",
  "startedAt": 1708441200000,
  "expiresAt": 1708527600000
}
```

**TTL:** 86400 seconds (24 hours)

---

## Database Schema

```sql
CREATE TABLE impersonation_sessions (
  id UUID PRIMARY KEY,
  platform_admin_id UUID NOT NULL REFERENCES users(id),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  target_tenant_user_id UUID REFERENCES users(id),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## API Endpoints

### Start Impersonation
```typescript
api.platform.startImpersonation.mutate({ tenantId: 'uuid' })
```

**Returns:**
```typescript
{
  sessionId: string
  tenantId: string
  tenantName: string
}
```

### End Impersonation
```typescript
api.platform.endImpersonation.mutate()
```

**Returns:** `void`

### Get Active Impersonation
```typescript
api.platform.getActiveImpersonation.useQuery()
```

**Returns:**
```typescript
{
  tenantId: string
  tenantName: string
  sessionId: string
} | null
```

---

## Error Codes

| Code | Message | Cause |
|------|---------|-------|
| `UNAUTHORIZED` | "Impersonation session expired" | Session TTL exceeded |
| `FORBIDDEN` | "Platform administrator access required" | Non-platform admin tried to impersonate |
| `FORBIDDEN` | "Cannot impersonate suspended tenant" | Target tenant is suspended |
| `NOT_FOUND` | "Tenant not found" | Invalid tenant ID |

---

## Troubleshooting

### "Impersonation session expired"
- Session lasted > 24 hours
- **Fix:** Start a new impersonation session

### Banner not showing
- Check Redis connection
- Verify `getActiveImpersonation` query is running
- Check browser console for errors

### Can't end impersonation
- Check network tab for API errors
- Verify Redis is reachable
- Check platform admin has active session in Redis

### Context not switching
- Check `tenantProcedure` middleware logs
- Verify Redis key exists: `impersonate:${platformAdminId}`
- Check session hasn't expired

---

## Monitoring Queries

### Count active sessions
```sql
SELECT COUNT(*)
FROM impersonation_sessions
WHERE ended_at IS NULL;
```

### Average session duration
```sql
SELECT AVG(EXTRACT(EPOCH FROM (ended_at - started_at)) / 3600) as avg_hours
FROM impersonation_sessions
WHERE ended_at IS NOT NULL;
```

### Top impersonators
```sql
SELECT
  u.email,
  COUNT(*) as session_count
FROM impersonation_sessions s
JOIN users u ON u.id = s.platform_admin_id
GROUP BY u.email
ORDER BY session_count DESC
LIMIT 10;
```

### Most impersonated tenants
```sql
SELECT
  t.name,
  COUNT(*) as impersonation_count
FROM impersonation_sessions s
JOIN tenants t ON t.id = s.tenant_id
GROUP BY t.name
ORDER BY impersonation_count DESC
LIMIT 10;
```
