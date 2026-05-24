# Impersonation Feature Specification

**Version:** 1.0
**Date:** 2026-02-20
**Status:** Ready for Implementation

---

## Overview

Platform admins can temporarily assume the identity of a tenant admin to troubleshoot issues, verify features, or assist with configuration. All impersonation actions are logged for audit and compliance.

---

## User Flow

### Starting Impersonation

1. Platform admin navigates to `/platform/tenants/[id]`
2. Clicks "Impersonate" button in tenant header
3. Confirmation dialog appears:
   ```
   Impersonate [Tenant Name]?

   You will be logged in as an admin for this tenant.
   All actions will be logged in the audit trail.

   [Cancel] [Confirm]
   ```
4. On confirm:
   - Impersonation session created in database
   - Audit log entry created (action: "IMPERSONATE_START")
   - User redirected to `/admin` (tenant admin area)
   - Impersonation banner appears at top of screen

### During Impersonation

- Banner shows: "🔴 Impersonating [Tenant Name] as Platform Admin | [End Impersonation]"
- User has FULL ACCESS to tenant admin features (not read-only)
- All mutations are logged with `isImpersonating: true` flag
- Platform admin routes (`/platform`) are hidden in sidebar
- Tenant context is set to the impersonated tenant

### Ending Impersonation

1. Click "End Impersonation" in banner
2. Impersonation session deleted from database
3. Audit log entry created (action: "IMPERSONATE_END")
4. User redirected to `/platform/tenants/[id]`
5. Banner disappears

---

## Technical Architecture

### 1. Database Schema

**Table: `impersonation_sessions`**

```typescript
{
  id: string (uuid, primary key)
  platformAdminId: string (FK → users.id)
  tenantId: string (FK → tenants.id)
  targetTenantUserId: string (FK → users.id, nullable)
  startedAt: Date
  endedAt: Date | null
  ipAddress: string | null
  userAgent: string | null
  createdAt: Date
}
```

**Why a separate table?**
- Session management (track active impersonations)
- Audit trail (historical record)
- Auto-expiry (end stale sessions after 24 hours)
- Analytics (track impersonation frequency)

### 2. Session Management

**Storage:** Upstash Redis (existing stack)

**Key format:** `impersonate:${platformAdminId}`

**Value:**
```typescript
{
  sessionId: string           // FK to impersonation_sessions.id
  tenantId: string            // Target tenant
  platformAdminEmail: string  // For audit display
  startedAt: number           // Unix timestamp
  expiresAt: number           // 24 hours from start
}
```

**TTL:** 24 hours (auto-expire)

### 3. Authentication Middleware Updates

**File:** `src/shared/trpc.ts`

Update `tenantProcedure` middleware:

```typescript
const tenantProcedure = t.procedure.use(async (opts) => {
  const { ctx } = opts;

  // 1. Check for active impersonation session
  const impersonationData = await redis.get(`impersonate:${ctx.user.id}`);

  if (impersonationData) {
    // Platform admin is impersonating
    const session = JSON.parse(impersonationData);

    // Validate session not expired
    if (session.expiresAt < Date.now()) {
      await redis.del(`impersonate:${ctx.user.id}`);
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Impersonation session expired",
      });
    }

    // Override tenant context
    return opts.next({
      ctx: {
        ...ctx,
        tenantId: session.tenantId,
        isImpersonating: true,
        impersonationSessionId: session.sessionId,
        platformAdminId: ctx.user.id,
      },
    });
  }

  // 2. Normal tenant context (existing logic)
  // ...existing code...
});
```

### 4. Backend Procedures

**File:** `src/modules/platform/platform.router.ts`

Add three new procedures:

```typescript
// Start impersonation
startImpersonation: platformAdminProcedure
  .input(z.object({ tenantId: z.string() }))
  .mutation(async ({ ctx, input }) => {
    // 1. Verify tenant exists and is active
    // 2. Create impersonation_sessions record
    // 3. Store session in Redis
    // 4. Create audit log entry
    // 5. Return success
  })

// End impersonation
endImpersonation: platformAdminProcedure
  .mutation(async ({ ctx }) => {
    // 1. Get session from Redis
    // 2. Update impersonation_sessions.endedAt
    // 3. Delete from Redis
    // 4. Create audit log entry
    // 5. Return success
  })

// Get active impersonation
getActiveImpersonation: platformAdminProcedure
  .query(async ({ ctx }) => {
    // 1. Check Redis for active session
    // 2. Return session data or null
  })
```

### 5. Frontend Components

**File:** `src/components/platform/impersonation-banner.tsx`

```typescript
'use client'

export function ImpersonationBanner() {
  const impersonation = api.platform.getActiveImpersonation.useQuery()
  const endImpersonation = api.platform.endImpersonation.useMutation({
    onSuccess: () => {
      window.location.href = '/platform/tenants'
    }
  })

  if (!impersonation.data) return null

  return (
    <div className="bg-destructive text-destructive-foreground px-4 py-2 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <AlertCircle className="h-4 w-4" />
        <span className="text-sm font-medium">
          Impersonating {impersonation.data.tenantName} as Platform Admin
        </span>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={() => endImpersonation.mutate()}
      >
        End Impersonation
      </Button>
    </div>
  )
}
```

**File:** `src/app/(admin)/layout.tsx`

Add banner above main content:

```tsx
import { ImpersonationBanner } from '@/components/platform/impersonation-banner'

export default function AdminLayout({ children }) {
  return (
    <div>
      <ImpersonationBanner />
      {/* ...existing admin layout... */}
    </div>
  )
}
```

---

## Security Requirements

### Access Control
- ✅ Only users with `isPlatformAdmin = true` can start impersonation
- ✅ Cannot impersonate the platform tenant itself
- ✅ Cannot impersonate suspended tenants
- ✅ Session expires after 24 hours (no infinite sessions)

### Audit Logging
Every impersonation action logged to `audit_logs` table:

```typescript
{
  action: "IMPERSONATE_START" | "IMPERSONATE_END"
  actor: {
    userId: platformAdminId,
    email: platformAdminEmail,
    isPlatformAdmin: true
  }
  target: {
    tenantId: targetTenantId,
    tenantName: tenantName
  }
  metadata: {
    sessionId: impersonationSessionId,
    ipAddress: request.ip,
    userAgent: request.headers['user-agent']
  }
}
```

### Session Management
- ✅ One active impersonation per platform admin (new session replaces old)
- ✅ Redis TTL ensures auto-cleanup
- ✅ Database `endedAt` tracking for historical audit
- ✅ Stale session cleanup (cron job to end sessions older than 24h)

### UI Indicators
- ✅ Red banner always visible during impersonation
- ✅ Cannot be dismissed (only ended)
- ✅ Banner shows tenant name and platform admin status
- ✅ All sidebar items show impersonated tenant context

---

## Edge Cases & Restrictions

### What Happens If...

**Platform admin closes browser during impersonation?**
- Session persists in Redis for 24 hours
- On next login, middleware detects active session
- Banner appears automatically
- Admin can end impersonation or continue

**Multiple browser tabs?**
- Impersonation state is server-side (Redis)
- All tabs show the same impersonated context
- Ending in one tab ends for all tabs

**Impersonation session expires (24h)?**
- Middleware deletes Redis key
- Next request throws "Session expired" error
- Frontend redirects to `/platform/tenants`
- Audit log shows automatic expiry

**Platform admin tries to access platform routes while impersonating?**
- Platform routes (`/platform/*`) are hidden in sidebar
- Direct navigation redirects to `/admin`
- Or show error: "End impersonation to access platform admin"

**Tenant is suspended during impersonation?**
- Tenant middleware checks status
- Shows error: "This tenant is suspended"
- Impersonation auto-ends
- Admin redirected to platform

**User permissions change during impersonation?**
- Permissions checked on every request (from DB)
- Changes take effect immediately
- No cached permission state

---

## Implementation Plan

### Phase 1: Backend (Wave 1)
**Files to create/modify:**
1. Add `impersonation_sessions` table to schema
2. Update `src/shared/trpc.ts` middleware
3. Add procedures to `platform.router.ts`
4. Create audit log helper

### Phase 2: Frontend (Wave 2)
**Files to create:**
1. `src/components/platform/impersonation-banner.tsx`
2. Update `src/app/(admin)/layout.tsx`
3. Update `src/components/platform/tenant-detail-header.tsx` (wire button)
4. Add hooks: `use-impersonation.ts`

### Phase 3: Testing (Wave 3)
**Test scenarios:**
1. Start impersonation → verify context switch
2. Perform tenant actions → verify audit logs
3. End impersonation → verify redirect
4. Session expiry → verify auto-cleanup
5. Permissions during impersonation

---

## Success Criteria

✅ Platform admin can click "Impersonate" on tenant detail page
✅ Confirmation dialog appears with clear warning
✅ Context switches to impersonated tenant
✅ Red banner visible at all times during impersonation
✅ All tenant routes work with impersonated context
✅ Platform routes are hidden/blocked during impersonation
✅ "End Impersonation" button returns to platform admin
✅ All actions logged to `audit_logs` table
✅ Session expires after 24 hours automatically
✅ No TypeScript errors
✅ All tests pass

---

## Non-Goals (Not Implemented)

❌ **Read-only impersonation** - Full access is required for troubleshooting
❌ **Impersonate specific user** - Always impersonate as tenant owner
❌ **Nested impersonation** - Cannot impersonate while already impersonating
❌ **Custom session duration** - Fixed 24 hour limit
❌ **Impersonation history UI** - Use audit logs instead

---

## Migration Notes

**No database migration needed if using Drizzle schema changes.**

If schema already exists, add table:

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
```

---

**End of Specification**
