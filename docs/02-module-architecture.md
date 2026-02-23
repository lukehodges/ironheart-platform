# Module Architecture

Every module follows the same file structure. **This is mandatory** — do not deviate.

```
src/modules/{module}/
├── {module}.types.ts             # TypeScript interfaces only (NO Zod)
├── {module}.schemas.ts           # Zod schemas for tRPC input validation
├── {module}.repository.ts        # Drizzle queries; throws domain errors
├── {module}.service.ts           # Business logic; calls repo; emits events
├── {module}.router.ts            # tRPC procedures; thin layer; calls service
├── {module}.events.ts            # Inngest function definitions
├── {module}.manifest.ts          # Module manifest (nav, permissions, widgets)
├── index.ts                      # Barrel export
└── __tests__/
    └── {module}.test.ts          # or {module}.service.test.ts
```

## Layer responsibilities

| Layer | Does | Does NOT |
|-------|------|----------|
| **Router** | Validates input (Zod), calls service, returns result | Contain business logic, DB queries, or direct Inngest calls |
| **Service** | Business logic, orchestrates repos, emits Inngest events | Import `TRPCError`, access `db` directly |
| **Repository** | All Drizzle/DB queries, throws domain errors | Business logic, event emission |
| **Events** | Inngest function definitions, async side effects | Direct DB access (calls service/repo instead) |
| **Types** | TypeScript interfaces and type aliases | Zod schemas, runtime code |
| **Schemas** | Zod schemas for tRPC input validation | TypeScript-only types |

## Dependency direction

```
Router → Service → Repository → DB
   ↓         ↓
 Schemas   Inngest (events)
   ↓
 Types
```

**Cross-module communication:** Modules must NOT import other modules' services or repositories directly. Instead, emit an Inngest event and let the target module handle it in its `*.events.ts` file.

**Exception:** A service may import another module's service if it's a synchronous, critical-path dependency (e.g., `bookingService` imports `paymentService.createInvoiceForBooking`). Document these cross-module imports.
