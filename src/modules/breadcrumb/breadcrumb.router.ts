/**
 * breadcrumb.router — resolves human-readable labels for URL path segments.
 *
 * Auth: uses `protectedProcedure` so the caller must be signed in. Per-segment
 * data access is gated by the underlying queries — a user querying a tenant
 * or engagement they cannot see will simply get no label back (segment hidden
 * by the topbar rather than leaking existence).
 *
 * Adding a new pattern:
 *   1. Add a recognise-rule below (parent segment + how to fetch label).
 *   2. The resolver only labels segments matching a known parent — unknown
 *      ids stay hidden. No silent cascades.
 */

import { z } from "zod"
import { eq, inArray, and } from "drizzle-orm"
import { router, protectedProcedure } from "@/shared/trpc"
import { db } from "@/shared/db"
import { tenants } from "@/shared/db/schemas/tenant.schema"
import { engagements } from "@/shared/db/schemas/client-portal.schema"
import { customers } from "@/shared/db/schemas/customer.schema"
import { users } from "@/shared/db/schemas/auth.schema"

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

interface SegmentLookup {
  /** raw segment value (the id in the URL) */
  segment: string
  /** which kind of entity to look up */
  kind: "tenant" | "engagement" | "customer" | "user"
}

/**
 * Walk path segments and emit `{ segment, kind }` for each id-shaped segment
 * that follows a parent we recognise. Anything we don't recognise is skipped.
 */
function planLookups(path: string): SegmentLookup[] {
  const segments = path.split("/").filter(Boolean)
  const out: SegmentLookup[] = []
  for (let i = 1; i < segments.length; i++) {
    const seg = segments[i]
    const parent = segments[i - 1]
    if (!UUID_RE.test(seg)) continue
    switch (parent) {
      case "clients":
        out.push({ segment: seg, kind: "engagement" })
        break
      case "tenants":
        out.push({ segment: seg, kind: "tenant" })
        break
      case "customers":
        out.push({ segment: seg, kind: "customer" })
        break
      case "team":
      case "users":
        out.push({ segment: seg, kind: "user" })
        break
      // Add more parent → kind mappings here as live routes are added.
    }
  }
  return out
}

async function fetchLabels(lookups: SegmentLookup[]): Promise<Record<string, string>> {
  const byKind = new Map<SegmentLookup["kind"], string[]>()
  for (const l of lookups) {
    const list = byKind.get(l.kind) ?? []
    list.push(l.segment)
    byKind.set(l.kind, list)
  }

  const result: Record<string, string> = {}

  if (byKind.has("tenant")) {
    const ids = byKind.get("tenant")!
    const rows = await db.select({ id: tenants.id, name: tenants.name }).from(tenants).where(inArray(tenants.id, ids))
    for (const r of rows) result[r.id] = r.name
  }

  if (byKind.has("engagement")) {
    const ids = byKind.get("engagement")!
    const rows = await db
      .select({
        id: engagements.id,
        title: engagements.title,
        customerId: engagements.customerId,
      })
      .from(engagements)
      .where(inArray(engagements.id, ids))
    // Pull customer rows once for company-name fallback (notes field per
    // existing tech debt — see CLAUDE.md gotcha h.).
    const customerIds = rows.map((r) => r.customerId).filter((x): x is string => !!x)
    const customerRows = customerIds.length
      ? await db
          .select({
            id: customers.id,
            firstName: customers.firstName,
            lastName: customers.lastName,
            notes: customers.notes,
          })
          .from(customers)
          .where(inArray(customers.id, customerIds))
      : []
    const customerById = new Map(customerRows.map((c) => [c.id, c]))
    for (const r of rows) {
      const c = r.customerId ? customerById.get(r.customerId) : undefined
      const company = c
        ? (c.notes ?? "").trim() || `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim()
        : ""
      const label = company || r.title || "Engagement"
      result[r.id] = label
    }
  }

  if (byKind.has("customer")) {
    const ids = byKind.get("customer")!
    const rows = await db
      .select({
        id: customers.id,
        firstName: customers.firstName,
        lastName: customers.lastName,
        notes: customers.notes,
      })
      .from(customers)
      .where(inArray(customers.id, ids))
    for (const r of rows) {
      const company = (r.notes ?? "").trim()
      const person = `${r.firstName ?? ""} ${r.lastName ?? ""}`.trim()
      result[r.id] = company || person || "Customer"
    }
  }

  if (byKind.has("user")) {
    const ids = byKind.get("user")!
    const rows = await db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
      })
      .from(users)
      .where(inArray(users.id, ids))
    for (const r of rows) {
      const name = `${r.firstName ?? ""} ${r.lastName ?? ""}`.trim()
      result[r.id] = name || r.email || "Member"
    }
  }

  return result
}

export const breadcrumbRouter = router({
  resolve: protectedProcedure
    .input(z.object({ path: z.string().min(1).max(512) }))
    .query(async ({ input, ctx }) => {
      // Permission posture: this is read-only label data for paths the user
      // already has on screen. We still scope tenant lookups to what they can
      // see — platform admins see everything; tenant users only see their own
      // tenant + customers/engagements they own. Enforced via where-clauses
      // below.
      const lookups = planLookups(input.path)
      if (lookups.length === 0) return { labels: {} as Record<string, string> }

      const labels = await fetchLabels(lookups)

      // Tenant-scope filter for non-platform-admin users.
      if (!ctx.user?.isPlatformAdmin && ctx.tenantId) {
        const tenantId = ctx.tenantId
        // Customers/engagements: drop those that don't belong to caller tenant.
        const engagementIds = lookups.filter((l) => l.kind === "engagement").map((l) => l.segment)
        if (engagementIds.length) {
          const allowed = await db
            .select({ id: engagements.id })
            .from(engagements)
            .where(and(inArray(engagements.id, engagementIds), eq(engagements.tenantId, tenantId)))
          const allowedSet = new Set(allowed.map((r) => r.id))
          for (const id of engagementIds) if (!allowedSet.has(id)) delete labels[id]
        }
        const customerIds = lookups.filter((l) => l.kind === "customer").map((l) => l.segment)
        if (customerIds.length) {
          const allowed = await db
            .select({ id: customers.id })
            .from(customers)
            .where(and(inArray(customers.id, customerIds), eq(customers.tenantId, tenantId)))
          const allowedSet = new Set(allowed.map((r) => r.id))
          for (const id of customerIds) if (!allowedSet.has(id)) delete labels[id]
        }
        // Tenant lookups: only allow the caller's own tenant id through.
        const tenantIds = lookups.filter((l) => l.kind === "tenant").map((l) => l.segment)
        for (const id of tenantIds) if (id !== tenantId) delete labels[id]
      }

      return { labels }
    }),
})
