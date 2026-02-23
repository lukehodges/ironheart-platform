# Database & ORM

## Drizzle client setup

```typescript
// src/shared/db.ts
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './db/schema'
import * as relations from './db/relations'

// Build-time guard: skip DATABASE_URL check during next build
if (!process.env.DATABASE_URL && process.env.NEXT_PHASE !== 'phase-production-build') {
  throw new Error('DATABASE_URL environment variable is not set')
}

const client = postgres(connectionString, {
  max: process.env.NODE_ENV === 'production' ? 1 : 5,  // Serverless-safe
  idle_timeout: 20,
  connect_timeout: 10,
})

export const db = drizzle(client, { schema: { ...schema, ...relations } })
```

## Common query patterns

```typescript
// Single row lookup
const result = await db
  .select()
  .from(myTable)
  .where(and(eq(myTable.id, id), eq(myTable.tenantId, tenantId)))
  .limit(1)
return result[0] ?? null returning
const [created] = await

// Insert with db
  .insert(myTable)
  .values({ id: crypto.randomUUID(), ...data })
  .returning()

// Update
const [updated] = await db
  .update(myTable)
  .set({ ...data, updatedAt: new Date() })
  .where(and(eq(myTable.id, id), eq(myTable.tenantId, tenantId)))
  .returning()

// Soft delete
await db
  .update(myTable)
  .set({ active: false, updatedAt: new Date() })
  .where(and(eq(myTable.id, id), eq(myTable.tenantId, tenantId)))

// Transaction
await db.transaction(async (tx) => {
  await tx.insert(tableA).values(...)
  await tx.insert(tableB).values(...)
})

// Pagination (limit + 1)
const rows = await db
  .select()
  .from(myTable)
  .where(eq(myTable.tenantId, tenantId))
  .orderBy(desc(myTable.createdAt))
  .limit(limit + 1)

const hasMore = rows.length > limit
return { rows: hasMore ? rows.slice(0, limit) : rows, hasMore }

// Array column membership
import { sql } from 'drizzle-orm'
.where(sql`${id}::uuid = ANY(${myTable.staffIds})`)

// Relational queries (when relations are defined)
const result = await db.query.users.findFirst({
  where: eq(users.id, userId),
  with: {
    userRoles: {
      with: { role: { with: { rolePermissions: { with: { permission: true } } } } }
    }
  }
})
```

## Important: Always include `tenantId`

Every query in a repository MUST include `tenantId` filtering. This is the primary isolation mechanism. Forgetting this is a **security vulnerability**.

```typescript
// CORRECT
.where(and(eq(table.id, id), eq(table.tenantId, tenantId)))

// WRONG — leaks data across tenants
.where(eq(table.id, id))
```
