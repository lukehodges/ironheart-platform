# Product Admin System Overhaul — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Overhaul `/platform/products` from minimal CRUD into a granular, data-dense internal admin system with tabbed product management, feature matrix, module categorization, product comparison, and lifecycle tools.

**Architecture:** Backend-first approach — extend the existing `product` module with new types, repository methods, service functions, and router endpoints. Then rebuild all frontend pages and components using existing UI primitives (Tabs, Table, Badge, DropdownMenu, Card, etc.). No new dependencies needed.

**Tech Stack:** Next.js 16, tRPC 11, Drizzle ORM, Radix UI primitives, Tailwind 4, Vitest

**Spec:** `docs/superpowers/specs/2026-03-27-product-admin-overhaul-design.md`

---

## Task 1: Add `archivedAt` to product schema and types

**Files:**
- Modify: `src/shared/db/schemas/product.schema.ts`
- Modify: `src/modules/product/product.types.ts`

- [ ] **Step 1: Add `archivedAt` column to product schema**

In `src/shared/db/schemas/product.schema.ts`, add the `archivedAt` column to the `products` table definition, after `updatedAt`:

```typescript
archivedAt: timestamp({ precision: 3, mode: "date" }),
```

- [ ] **Step 2: Add `archivedAt` to `ProductRecord` interface**

In `src/modules/product/product.types.ts`, add to the `ProductRecord` interface:

```typescript
archivedAt: Date | null;
```

- [ ] **Step 3: Add new types for stats, analytics, comparison, filters**

Append to `src/modules/product/product.types.ts`:

```typescript
export interface ProductWithStats extends ProductRecord {
  tenantCount: number;
  activeTenantCount: number;
  trialTenantCount: number;
  mrr: number;
  planCount: number;
  tenantGrowthThisMonth: number;
}

export interface ProductAnalytics {
  mrr: number;
  mrrChange: number;
  totalTenants: number;
  trialConversionRate: number;
  churnRate: number;
  tenantsByPlan: { planId: string; planName: string; count: number }[];
}

export interface ProductComparison {
  productId: string;
  productName: string;
  moduleSlugs: string[];
}

export interface ProductListFilters {
  search?: string;
  status?: "live" | "draft" | "archived";
  moduleSlug?: string;
}

export interface UpdatePlanInput {
  id: string;
  name?: string;
  priceMonthly?: number;
  priceYearly?: number | null;
  trialDays?: number;
  stripePriceId?: string;
  features?: string[];
  isDefault?: boolean;
}
```

- [ ] **Step 4: Update `toProductRecord` mapper in repository**

In `src/modules/product/product.repository.ts`, add `archivedAt` to the `toProductRecord` mapper:

```typescript
function toProductRecord(row: typeof products.$inferSelect): ProductRecord {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    tagline: row.tagline,
    description: row.description,
    logoUrl: row.logoUrl,
    domain: row.domain,
    moduleSlugs: row.moduleSlugs ?? [],
    isPublished: row.isPublished,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    archivedAt: row.archivedAt ?? null,
  };
}
```

- [ ] **Step 5: Update mock data in tests**

In `src/modules/product/__tests__/product.test.ts`, add `archivedAt: null` to the `mockProduct` object.

- [ ] **Step 6: Run tests to verify nothing broke**

Run: `npx vitest run src/modules/product`
Expected: All existing tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/shared/db/schemas/product.schema.ts src/modules/product/product.types.ts src/modules/product/product.repository.ts src/modules/product/__tests__/product.test.ts
git commit -m "feat(product): add archivedAt column and extended types for admin overhaul"
```

---

## Task 2: Add new Zod schemas for extended endpoints

**Files:**
- Modify: `src/modules/product/product.schemas.ts`

- [ ] **Step 1: Add new schemas**

Append the following schemas to `src/modules/product/product.schemas.ts`:

```typescript
export const listProductsSchema = z.object({
  search: z.string().optional(),
  status: z.enum(["live", "draft", "archived"]).optional(),
  moduleSlug: z.string().optional(),
});

export const cloneProductSchema = z.object({
  id: z.uuid(),
});

export const archiveProductSchema = z.object({
  id: z.uuid(),
});

export const productAnalyticsSchema = z.object({
  id: z.uuid(),
});

export const productComparisonSchema = z.object({
  ids: z.array(z.uuid()).min(2).max(3),
});

export const reorderPlansSchema = z.object({
  productId: z.uuid(),
  planIds: z.array(z.uuid()).min(1),
});
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/product/product.schemas.ts
git commit -m "feat(product): add Zod schemas for list filters, clone, archive, analytics, compare"
```

---

## Task 3: Extend product repository with new methods

**Files:**
- Modify: `src/modules/product/product.repository.ts`

- [ ] **Step 1: Add imports needed for new queries**

At the top of `src/modules/product/product.repository.ts`, update the drizzle-orm import:

```typescript
import { eq, and, or, like, isNull, isNotNull, count, gte, sql } from "drizzle-orm";
```

Add the tenants import:

```typescript
import { tenants } from "@/shared/db/schemas/tenant.schema";
```

Add the new types import:

```typescript
import type {
  ProductRecord,
  ProductPlanRecord,
  ProductWithPlans,
  ProductWithStats,
  ProductAnalytics,
  ProductComparison,
  ProductListFilters,
  CreateProductInput,
  UpdateProductInput,
  CreatePlanInput,
  UpdatePlanInput,
} from "./product.types";
```

- [ ] **Step 2: Add `listWithStats` method**

Add this method after the existing `list()` function:

```typescript
async function listWithStats(filters: ProductListFilters): Promise<ProductWithStats[]> {
  const allProducts = await list();
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  let filtered = allProducts;

  if (filters.search) {
    const term = filters.search.toLowerCase();
    filtered = filtered.filter(
      (p) => p.name.toLowerCase().includes(term) || p.slug.toLowerCase().includes(term)
    );
  }

  if (filters.status === "live") {
    filtered = filtered.filter((p) => p.isPublished && !p.archivedAt);
  } else if (filters.status === "draft") {
    filtered = filtered.filter((p) => !p.isPublished && !p.archivedAt);
  } else if (filters.status === "archived") {
    filtered = filtered.filter((p) => p.archivedAt !== null);
  } else {
    filtered = filtered.filter((p) => !p.archivedAt);
  }

  if (filters.moduleSlug) {
    filtered = filtered.filter((p) => p.moduleSlugs.includes(filters.moduleSlug!));
  }

  const results: ProductWithStats[] = await Promise.all(
    filtered.map(async (product) => {
      const [activeCount] = await db
        .select({ count: count() })
        .from(tenants)
        .where(and(eq(tenants.productId, product.id), eq(tenants.status, "ACTIVE"), isNull(tenants.deletedAt)));

      const [trialCount] = await db
        .select({ count: count() })
        .from(tenants)
        .where(and(eq(tenants.productId, product.id), eq(tenants.status, "TRIAL"), isNull(tenants.deletedAt)));

      const [totalCount] = await db
        .select({ count: count() })
        .from(tenants)
        .where(and(eq(tenants.productId, product.id), isNull(tenants.deletedAt)));

      const [growthCount] = await db
        .select({ count: count() })
        .from(tenants)
        .where(
          and(
            eq(tenants.productId, product.id),
            gte(tenants.createdAt, thirtyDaysAgo),
            isNull(tenants.deletedAt)
          )
        );

      const plans = await db
        .select()
        .from(productPlans)
        .where(eq(productPlans.productId, product.id));

      const defaultPlan = plans.find((p) => p.isDefault) ?? plans[0];
      const activeTenants = activeCount?.count ?? 0;
      const mrr = defaultPlan ? activeTenants * defaultPlan.priceMonthly : 0;

      return {
        ...product,
        tenantCount: totalCount?.count ?? 0,
        activeTenantCount: activeTenants,
        trialTenantCount: trialCount?.count ?? 0,
        mrr,
        planCount: plans.length,
        tenantGrowthThisMonth: growthCount?.count ?? 0,
      };
    })
  );

  return results;
}
```

- [ ] **Step 3: Add `cloneProduct` method**

```typescript
async function cloneProduct(id: string): Promise<ProductWithPlans> {
  const source = await findByIdWithPlans(id);
  if (!source) throw new NotFoundError("Product", id);

  const now = new Date();
  const newSlug = `${source.slug}-copy`;
  const newName = `${source.name} (Copy)`;

  const [newProduct] = await db.insert(products).values({
    id: crypto.randomUUID(),
    slug: newSlug,
    name: newName,
    tagline: source.tagline,
    description: source.description,
    logoUrl: source.logoUrl,
    domain: null,
    moduleSlugs: source.moduleSlugs,
    isPublished: false,
    createdAt: now,
    updatedAt: now,
  }).returning();

  const clonedPlans: ProductPlanRecord[] = [];
  for (const plan of source.plans) {
    const [newPlan] = await db.insert(productPlans).values({
      id: crypto.randomUUID(),
      productId: newProduct.id,
      slug: plan.slug,
      name: plan.name,
      priceMonthly: plan.priceMonthly,
      priceYearly: plan.priceYearly,
      trialDays: plan.trialDays,
      stripePriceId: plan.stripePriceId,
      features: plan.features,
      isDefault: plan.isDefault,
      createdAt: now,
    }).returning();
    clonedPlans.push(toPlanRecord(newPlan));
  }

  log.info({ sourceId: id, newId: newProduct.id }, "Product cloned");
  return { ...toProductRecord(newProduct), plans: clonedPlans };
}
```

- [ ] **Step 4: Add `archiveProduct` and `unarchiveProduct` methods**

```typescript
async function archiveProduct(id: string): Promise<void> {
  const existing = await findById(id);
  if (!existing) throw new NotFoundError("Product", id);
  await db.update(products).set({ archivedAt: new Date(), updatedAt: new Date() }).where(eq(products.id, id));
  log.info({ productId: id }, "Product archived");
}

async function unarchiveProduct(id: string): Promise<void> {
  const existing = await findById(id);
  if (!existing) throw new NotFoundError("Product", id);
  await db.update(products).set({ archivedAt: null, updatedAt: new Date() }).where(eq(products.id, id));
  log.info({ productId: id }, "Product unarchived");
}
```

- [ ] **Step 5: Add `getProductAnalytics` method**

```typescript
async function getProductAnalytics(productId: string): Promise<ProductAnalytics> {
  const product = await findById(productId);
  if (!product) throw new NotFoundError("Product", productId);

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

  const [totalCount] = await db
    .select({ count: count() })
    .from(tenants)
    .where(and(eq(tenants.productId, productId), isNull(tenants.deletedAt)));

  const [activeCount] = await db
    .select({ count: count() })
    .from(tenants)
    .where(and(eq(tenants.productId, productId), eq(tenants.status, "ACTIVE"), isNull(tenants.deletedAt)));

  const [cancelledCount] = await db
    .select({ count: count() })
    .from(tenants)
    .where(and(eq(tenants.productId, productId), eq(tenants.status, "CANCELLED"), isNull(tenants.deletedAt)));

  const [trialCount] = await db
    .select({ count: count() })
    .from(tenants)
    .where(and(eq(tenants.productId, productId), eq(tenants.status, "TRIAL"), isNull(tenants.deletedAt)));

  // MRR: active tenants × default plan price
  const plans = await db.select().from(productPlans).where(eq(productPlans.productId, productId));
  const defaultPlan = plans.find((p) => p.isDefault) ?? plans[0];
  const activeTenants = activeCount?.count ?? 0;
  const mrr = defaultPlan ? activeTenants * defaultPlan.priceMonthly : 0;

  // Previous month MRR (approximate: count active tenants created before 30 days ago)
  const [prevActiveCount] = await db
    .select({ count: count() })
    .from(tenants)
    .where(
      and(
        eq(tenants.productId, productId),
        eq(tenants.status, "ACTIVE"),
        isNull(tenants.deletedAt),
        gte(tenants.createdAt, sixtyDaysAgo)
      )
    );
  const prevMrr = defaultPlan ? (prevActiveCount?.count ?? 0) * defaultPlan.priceMonthly : 0;
  const mrrChange = prevMrr > 0 ? ((mrr - prevMrr) / prevMrr) * 100 : 0;

  // Trial conversion: tenants that were trial and now active / all tenants
  const total = totalCount?.count ?? 0;
  const trials = trialCount?.count ?? 0;
  const cancelled = cancelledCount?.count ?? 0;
  const trialConversionRate = total > 0 ? (activeTenants / total) * 100 : 0;
  const churnRate = total > 0 ? (cancelled / total) * 100 : 0;

  // Tenants by plan
  const tenantsByPlan = await Promise.all(
    plans.map(async (plan) => {
      const [planCount] = await db
        .select({ count: count() })
        .from(tenants)
        .where(and(eq(tenants.productId, productId), eq(tenants.planId, plan.id), isNull(tenants.deletedAt)));
      return {
        planId: plan.id,
        planName: plan.name,
        count: planCount?.count ?? 0,
      };
    })
  );

  return {
    mrr,
    mrrChange: Math.round(mrrChange * 10) / 10,
    totalTenants: total,
    trialConversionRate: Math.round(trialConversionRate * 10) / 10,
    churnRate: Math.round(churnRate * 10) / 10,
    tenantsByPlan,
  };
}
```

- [ ] **Step 6: Add `getProductComparison` method**

```typescript
async function getProductComparison(ids: string[]): Promise<ProductComparison[]> {
  const results: ProductComparison[] = [];
  for (const id of ids) {
    const product = await findById(id);
    if (!product) throw new NotFoundError("Product", id);
    results.push({
      productId: product.id,
      productName: product.name,
      moduleSlugs: product.moduleSlugs,
    });
  }
  return results;
}
```

- [ ] **Step 7: Add `updatePlan` method**

```typescript
async function updatePlan(id: string, input: Omit<UpdatePlanInput, "id">): Promise<ProductPlanRecord> {
  const existing = await findPlanById(id);
  if (!existing) throw new NotFoundError("Plan", id);
  const updateFields: Record<string, unknown> = {};
  if (input.name !== undefined) updateFields.name = input.name;
  if (input.priceMonthly !== undefined) updateFields.priceMonthly = input.priceMonthly;
  if (input.priceYearly !== undefined) updateFields.priceYearly = input.priceYearly;
  if (input.trialDays !== undefined) updateFields.trialDays = input.trialDays;
  if (input.stripePriceId !== undefined) updateFields.stripePriceId = input.stripePriceId;
  if (input.features !== undefined) updateFields.features = input.features;
  if (input.isDefault !== undefined) updateFields.isDefault = input.isDefault;
  const [row] = await db.update(productPlans).set(updateFields).where(eq(productPlans.id, id)).returning();
  log.info({ planId: id }, "Plan updated");
  return toPlanRecord(row);
}
```

- [ ] **Step 8: Export all new methods**

Update the export at the bottom of `product.repository.ts`:

```typescript
export const productRepository = {
  list, listWithStats, findById, findBySlug, findBySlugWithPlans, findByIdWithPlans,
  create, update, delete: deleteProduct,
  createPlan, updatePlan, findDefaultPlan, findPlanById, deletePlan,
  cloneProduct, archiveProduct, unarchiveProduct,
  getProductAnalytics, getProductComparison,
};
```

- [ ] **Step 9: Commit**

```bash
git add src/modules/product/product.repository.ts
git commit -m "feat(product): add repository methods for stats, clone, archive, analytics, compare"
```

---

## Task 4: Extend product service

**Files:**
- Modify: `src/modules/product/product.service.ts`

- [ ] **Step 1: Add imports for new types**

Update the type imports:

```typescript
import type {
  ProductRecord, ProductWithPlans, ProductWithStats, ProductPlanRecord,
  ProductAnalytics, ProductComparison, ProductListFilters,
  CreateProductInput, UpdateProductInput, CreatePlanInput, UpdatePlanInput,
} from "./product.types";
```

- [ ] **Step 2: Add new service methods**

Append before the export:

```typescript
async function listProductsWithStats(filters: ProductListFilters): Promise<ProductWithStats[]> {
  return productRepository.listWithStats(filters);
}

async function cloneProduct(id: string): Promise<ProductWithPlans> {
  return productRepository.cloneProduct(id);
}

async function archiveProduct(id: string): Promise<void> {
  return productRepository.archiveProduct(id);
}

async function unarchiveProduct(id: string): Promise<void> {
  return productRepository.unarchiveProduct(id);
}

async function getProductAnalytics(id: string): Promise<ProductAnalytics> {
  return productRepository.getProductAnalytics(id);
}

async function getProductComparison(ids: string[]): Promise<ProductComparison[]> {
  return productRepository.getProductComparison(ids);
}

async function updatePlan(id: string, input: Omit<UpdatePlanInput, "id">): Promise<ProductPlanRecord> {
  return productRepository.updatePlan(id, input);
}
```

- [ ] **Step 3: Update the export object**

```typescript
export const productService = {
  listProducts, listProductsWithStats, getProduct, getPublishedProduct,
  createProduct, updateProduct, deleteProduct,
  createPlan, updatePlan, getDefaultPlan, deletePlan,
  cloneProduct, archiveProduct, unarchiveProduct,
  getProductAnalytics, getProductComparison,
};
```

- [ ] **Step 4: Commit**

```bash
git add src/modules/product/product.service.ts
git commit -m "feat(product): add service methods for stats, clone, archive, analytics, compare"
```

---

## Task 5: Extend product router with new endpoints

**Files:**
- Modify: `src/modules/product/product.router.ts`

- [ ] **Step 1: Add new schema imports**

```typescript
import {
  createProductSchema, updateProductSchema, createPlanSchema, updatePlanSchema,
  productSlugSchema, listProductsSchema, cloneProductSchema, archiveProductSchema,
  productAnalyticsSchema, productComparisonSchema,
} from "./product.schemas";
```

- [ ] **Step 2: Add new routes to the router**

Add these routes inside the `router({})` call, after the existing routes:

```typescript
  listWithStats: platformAdminProcedure
    .input(listProductsSchema)
    .query(({ input }) => productService.listProductsWithStats(input)),

  clone: platformAdminProcedure
    .input(cloneProductSchema)
    .mutation(({ input }) => productService.cloneProduct(input.id)),

  archive: platformAdminProcedure
    .input(archiveProductSchema)
    .mutation(({ input }) => productService.archiveProduct(input.id)),

  unarchive: platformAdminProcedure
    .input(archiveProductSchema)
    .mutation(({ input }) => productService.unarchiveProduct(input.id)),

  analytics: platformAdminProcedure
    .input(productAnalyticsSchema)
    .query(({ input }) => productService.getProductAnalytics(input.id)),

  compare: platformAdminProcedure
    .input(productComparisonSchema)
    .query(({ input }) => productService.getProductComparison(input.ids)),

  updatePlan: platformAdminProcedure
    .input(updatePlanSchema)
    .mutation(({ input }) => productService.updatePlan(input.id, input)),
```

- [ ] **Step 3: Commit**

```bash
git add src/modules/product/product.router.ts
git commit -m "feat(product): add router endpoints for list-with-stats, clone, archive, analytics, compare"
```

---

## Task 6: Update barrel export

**Files:**
- Modify: `src/modules/product/index.ts`

- [ ] **Step 1: Ensure all new schemas are exported**

The existing barrel export already uses `export *` for types and schemas, so new additions are automatically exported. Verify:

```typescript
export { productRouter } from "./product.router";
export { productService } from "./product.service";
export * from "./product.types";
export * from "./product.schemas";
```

No change needed if this is already the content. Verify by reading the file.

- [ ] **Step 2: Run all tests**

Run: `npx vitest run src/modules/product`
Expected: All tests pass.

- [ ] **Step 3: Run type check**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 4: Commit if any changes were needed**

---

## Task 7: Write tests for new backend functionality

**Files:**
- Modify: `src/modules/product/__tests__/product.test.ts`

- [ ] **Step 1: Add mock methods for new repository functions**

Update the `vi.mock("../product.repository")` call to include new methods:

```typescript
vi.mock("../product.repository", () => ({
  productRepository: {
    list: vi.fn(),
    listWithStats: vi.fn(),
    findById: vi.fn(),
    findBySlug: vi.fn(),
    findBySlugWithPlans: vi.fn(),
    findByIdWithPlans: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    createPlan: vi.fn(),
    updatePlan: vi.fn(),
    findDefaultPlan: vi.fn(),
    findPlanById: vi.fn(),
    deletePlan: vi.fn(),
    cloneProduct: vi.fn(),
    archiveProduct: vi.fn(),
    unarchiveProduct: vi.fn(),
    getProductAnalytics: vi.fn(),
    getProductComparison: vi.fn(),
  },
}));
```

- [ ] **Step 2: Add test data for stats and analytics**

After `mockPlan`, add:

```typescript
const mockProductWithStats = {
  ...mockProduct,
  tenantCount: 24,
  activeTenantCount: 20,
  trialTenantCount: 4,
  mrr: 58000,
  planCount: 3,
  tenantGrowthThisMonth: 3,
};

const mockAnalytics = {
  mrr: 58000,
  mrrChange: 12.5,
  totalTenants: 24,
  trialConversionRate: 83.3,
  churnRate: 4.2,
  tenantsByPlan: [{ planId: "plan-001", planName: "Starter", count: 24 }],
};

const mockComparison = [
  { productId: "prod-001", productName: "IronBook", moduleSlugs: ["booking", "customer", "scheduling"] },
  { productId: "prod-002", productName: "IronReview", moduleSlugs: ["booking", "customer", "review"] },
];
```

- [ ] **Step 3: Add test for `listProductsWithStats`**

```typescript
describe("listProductsWithStats", () => {
  it("returns products with stats", async () => {
    vi.mocked(productRepository.listWithStats).mockResolvedValue([mockProductWithStats]);
    const result = await productService.listProductsWithStats({});
    expect(result).toHaveLength(1);
    expect(result[0].mrr).toBe(58000);
    expect(result[0].tenantCount).toBe(24);
  });

  it("passes filters through to repository", async () => {
    vi.mocked(productRepository.listWithStats).mockResolvedValue([]);
    await productService.listProductsWithStats({ status: "live", search: "barber" });
    expect(productRepository.listWithStats).toHaveBeenCalledWith({ status: "live", search: "barber" });
  });
});
```

- [ ] **Step 4: Add test for `cloneProduct`**

```typescript
describe("cloneProduct", () => {
  it("clones a product and its plans", async () => {
    vi.mocked(productRepository.cloneProduct).mockResolvedValue({
      ...mockProduct,
      id: "prod-002",
      slug: "ironbook-copy",
      name: "IronBook (Copy)",
      isPublished: false,
      plans: [{ ...mockPlan, id: "plan-002", productId: "prod-002" }],
    });
    const result = await productService.cloneProduct("prod-001");
    expect(result.slug).toBe("ironbook-copy");
    expect(result.isPublished).toBe(false);
    expect(result.plans).toHaveLength(1);
  });
});
```

- [ ] **Step 5: Add tests for archive/unarchive**

```typescript
describe("archiveProduct", () => {
  it("archives a product", async () => {
    vi.mocked(productRepository.archiveProduct).mockResolvedValue(undefined);
    await expect(productService.archiveProduct("prod-001")).resolves.toBeUndefined();
    expect(productRepository.archiveProduct).toHaveBeenCalledWith("prod-001");
  });
});

describe("unarchiveProduct", () => {
  it("unarchives a product", async () => {
    vi.mocked(productRepository.unarchiveProduct).mockResolvedValue(undefined);
    await expect(productService.unarchiveProduct("prod-001")).resolves.toBeUndefined();
    expect(productRepository.unarchiveProduct).toHaveBeenCalledWith("prod-001");
  });
});
```

- [ ] **Step 6: Add tests for analytics and comparison**

```typescript
describe("getProductAnalytics", () => {
  it("returns analytics for a product", async () => {
    vi.mocked(productRepository.getProductAnalytics).mockResolvedValue(mockAnalytics);
    const result = await productService.getProductAnalytics("prod-001");
    expect(result.mrr).toBe(58000);
    expect(result.tenantsByPlan).toHaveLength(1);
  });
});

describe("getProductComparison", () => {
  it("returns comparison data for multiple products", async () => {
    vi.mocked(productRepository.getProductComparison).mockResolvedValue(mockComparison);
    const result = await productService.getProductComparison(["prod-001", "prod-002"]);
    expect(result).toHaveLength(2);
    expect(result[0].moduleSlugs).toContain("booking");
  });
});
```

- [ ] **Step 7: Add test for `updatePlan`**

```typescript
describe("updatePlan", () => {
  it("updates a plan", async () => {
    vi.mocked(productRepository.updatePlan).mockResolvedValue({
      ...mockPlan,
      name: "Pro",
      priceMonthly: 4900,
    });
    const result = await productService.updatePlan("plan-001", { name: "Pro", priceMonthly: 4900 });
    expect(result.name).toBe("Pro");
    expect(result.priceMonthly).toBe(4900);
  });
});
```

- [ ] **Step 8: Run tests**

Run: `npx vitest run src/modules/product`
Expected: All tests pass (old + new).

- [ ] **Step 9: Commit**

```bash
git add src/modules/product/__tests__/product.test.ts
git commit -m "test(product): add tests for clone, archive, analytics, comparison, updatePlan"
```

---

## Task 8: Build the module category grid component

**Files:**
- Create: `src/components/platform/module-category-grid.tsx`

This component is reused in both the Modules tab and the Create Product page.

- [ ] **Step 1: Create the component**

Create `src/components/platform/module-category-grid.tsx`:

```typescript
"use client"

import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"

const MODULE_CATEGORIES = [
  {
    name: "Core",
    modules: ["booking", "scheduling", "customer", "team", "payment"],
  },
  {
    name: "Engagement",
    modules: ["forms", "review", "notification", "outreach", "ai"],
  },
  {
    name: "Operations",
    modules: ["workflow", "analytics", "calendar-sync", "pipeline"],
  },
  {
    name: "Developer",
    modules: ["developer"],
  },
] as const

const DEPENDENCY_HINTS: Record<string, string[]> = {
  booking: ["scheduling"],
  review: ["customer"],
  forms: ["customer"],
  outreach: ["customer", "notification"],
  workflow: ["notification"],
  pipeline: ["customer"],
  "calendar-sync": ["booking", "scheduling"],
}

interface ModuleCategoryGridProps {
  selected: string[]
  onChange: (modules: string[]) => void
  readOnly?: boolean
}

export function ModuleCategoryGrid({ selected, onChange, readOnly }: ModuleCategoryGridProps) {
  const toggle = (mod: string) => {
    if (readOnly) return
    const next = selected.includes(mod)
      ? selected.filter((m) => m !== mod)
      : [...selected, mod]
    onChange(next)
  }

  const getHint = (mod: string): string | null => {
    const deps = DEPENDENCY_HINTS[mod]
    if (!deps) return null
    const missing = deps.filter((d) => !selected.includes(d))
    if (missing.length === 0) return null
    return `Works best with: ${missing.join(", ")}`
  }

  return (
    <div className="space-y-6">
      {MODULE_CATEGORIES.map((category) => {
        const enabledCount = category.modules.filter((m) => selected.includes(m)).length
        return (
          <div key={category.name}>
            <div className="flex items-center gap-2 mb-3">
              <h4 className="text-sm font-medium">{category.name}</h4>
              <span className="text-xs text-muted-foreground">
                ({enabledCount}/{category.modules.length} enabled)
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {category.modules.map((mod) => {
                const isEnabled = selected.includes(mod)
                const hint = !isEnabled ? null : getHint(mod)
                return (
                  <div
                    key={mod}
                    className={`flex items-center justify-between rounded-lg border px-3 py-2.5 transition-colors ${
                      isEnabled
                        ? "border-primary/30 bg-primary/5"
                        : "border-border"
                    }`}
                  >
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{mod}</span>
                      {hint && (
                        <span className="text-[11px] text-amber-500 mt-0.5">{hint}</span>
                      )}
                    </div>
                    <Switch
                      checked={isEnabled}
                      onCheckedChange={() => toggle(mod)}
                      disabled={readOnly}
                    />
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export { MODULE_CATEGORIES, DEPENDENCY_HINTS }
```

- [ ] **Step 2: Commit**

```bash
git add src/components/platform/module-category-grid.tsx
git commit -m "feat(platform): add categorized module grid component with dependency hints"
```

---

## Task 9: Build the feature matrix component

**Files:**
- Create: `src/components/platform/feature-matrix.tsx`

- [ ] **Step 1: Create the component**

Create `src/components/platform/feature-matrix.tsx`:

```typescript
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Plus, Trash2 } from "lucide-react"

interface Plan {
  id: string
  name: string
  features: string[]
}

interface FeatureMatrixProps {
  plans: Plan[]
  onUpdate: (planId: string, features: string[]) => void
}

export function FeatureMatrix({ plans, onUpdate }: FeatureMatrixProps) {
  // Build global feature list from union of all plan features
  const allFeatures = Array.from(new Set(plans.flatMap((p) => p.features)))
  const [features, setFeatures] = useState<string[]>(allFeatures)
  const [newFeature, setNewFeature] = useState("")
  const [editingIdx, setEditingIdx] = useState<number | null>(null)
  const [editValue, setEditValue] = useState("")

  const addFeature = () => {
    const trimmed = newFeature.trim()
    if (!trimmed || features.includes(trimmed)) return
    setFeatures([...features, trimmed])
    setNewFeature("")
  }

  const removeFeature = (idx: number) => {
    const feature = features[idx]
    const next = features.filter((_, i) => i !== idx)
    setFeatures(next)
    // Remove from all plans
    for (const plan of plans) {
      if (plan.features.includes(feature)) {
        onUpdate(plan.id, plan.features.filter((f) => f !== feature))
      }
    }
  }

  const startEdit = (idx: number) => {
    setEditingIdx(idx)
    setEditValue(features[idx])
  }

  const finishEdit = (idx: number) => {
    const trimmed = editValue.trim()
    if (!trimmed) {
      setEditingIdx(null)
      return
    }
    const oldFeature = features[idx]
    const next = [...features]
    next[idx] = trimmed
    setFeatures(next)
    setEditingIdx(null)
    // Rename in all plans
    for (const plan of plans) {
      if (plan.features.includes(oldFeature)) {
        onUpdate(plan.id, plan.features.map((f) => (f === oldFeature ? trimmed : f)))
      }
    }
  }

  const toggleFeature = (planId: string, feature: string) => {
    const plan = plans.find((p) => p.id === planId)
    if (!plan) return
    const has = plan.features.includes(feature)
    const next = has
      ? plan.features.filter((f) => f !== feature)
      : [...plan.features, feature]
    onUpdate(planId, next)
  }

  if (plans.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Add at least one plan to configure the feature matrix.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left px-4 py-2 font-medium min-w-[200px]">Feature</th>
              {plans.map((plan) => (
                <th key={plan.id} className="text-center px-4 py-2 font-medium min-w-[120px]">
                  {plan.name}
                </th>
              ))}
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {features.map((feature, idx) => (
              <tr key={idx} className="border-b last:border-0">
                <td className="px-4 py-2">
                  {editingIdx === idx ? (
                    <Input
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={() => finishEdit(idx)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") finishEdit(idx)
                        if (e.key === "Escape") setEditingIdx(null)
                      }}
                      className="h-7 text-sm"
                      autoFocus
                    />
                  ) : (
                    <button
                      onClick={() => startEdit(idx)}
                      className="text-left hover:text-primary transition-colors"
                    >
                      {feature}
                    </button>
                  )}
                </td>
                {plans.map((plan) => (
                  <td key={plan.id} className="text-center px-4 py-2">
                    <Checkbox
                      checked={plan.features.includes(feature)}
                      onCheckedChange={() => toggleFeature(plan.id, feature)}
                    />
                  </td>
                ))}
                <td className="px-2">
                  <button
                    onClick={() => removeFeature(idx)}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex gap-2">
        <Input
          value={newFeature}
          onChange={(e) => setNewFeature(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault()
              addFeature()
            }
          }}
          placeholder="Add a feature..."
          className="max-w-xs"
        />
        <Button type="button" variant="outline" size="sm" onClick={addFeature} disabled={!newFeature.trim()}>
          <Plus className="h-4 w-4 mr-1" />
          Add
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/platform/feature-matrix.tsx
git commit -m "feat(platform): add feature matrix component for plan feature comparison"
```

---

## Task 10: Build the plan card component

**Files:**
- Create: `src/components/platform/plan-card.tsx`

- [ ] **Step 1: Create the component**

Create `src/components/platform/plan-card.tsx`:

```typescript
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { ChevronDown, ChevronUp, Pencil, Trash2 } from "lucide-react"

interface PlanCardProps {
  plan: {
    id: string
    slug: string
    name: string
    priceMonthly: number
    priceYearly: number | null
    trialDays: number
    stripePriceId: string
    features: string[]
    isDefault: boolean
  }
  onUpdate: (id: string, data: Record<string, unknown>) => void
  onDelete: (id: string) => void
  onMoveUp?: () => void
  onMoveDown?: () => void
  canDelete: boolean
}

export function PlanCard({ plan, onUpdate, onDelete, onMoveUp, onMoveDown, canDelete }: PlanCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [name, setName] = useState(plan.name)
  const [priceMonthly, setPriceMonthly] = useState(plan.priceMonthly)
  const [priceYearly, setPriceYearly] = useState(plan.priceYearly)
  const [trialDays, setTrialDays] = useState(plan.trialDays)
  const [stripePriceId, setStripePriceId] = useState(plan.stripePriceId)

  const save = () => {
    onUpdate(plan.id, { name, priceMonthly, priceYearly, trialDays, stripePriceId })
    setIsEditing(false)
  }

  const cancel = () => {
    setName(plan.name)
    setPriceMonthly(plan.priceMonthly)
    setPriceYearly(plan.priceYearly)
    setTrialDays(plan.trialDays)
    setStripePriceId(plan.stripePriceId)
    setIsEditing(false)
  }

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {isEditing ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Name</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} className="h-8 mt-1" />
                </div>
                <div>
                  <Label className="text-xs">Stripe Price ID</Label>
                  <Input value={stripePriceId} onChange={(e) => setStripePriceId(e.target.value)} className="h-8 mt-1 font-mono text-xs" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">Monthly (pence)</Label>
                  <Input type="number" value={priceMonthly} onChange={(e) => setPriceMonthly(Number(e.target.value))} className="h-8 mt-1" />
                </div>
                <div>
                  <Label className="text-xs">Yearly (pence)</Label>
                  <Input type="number" value={priceYearly ?? ""} onChange={(e) => setPriceYearly(e.target.value ? Number(e.target.value) : null)} className="h-8 mt-1" placeholder="Optional" />
                </div>
                <div>
                  <Label className="text-xs">Trial Days</Label>
                  <Input type="number" value={trialDays} onChange={(e) => setTrialDays(Number(e.target.value))} className="h-8 mt-1" />
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={save}>Save</Button>
                <Button size="sm" variant="outline" onClick={cancel}>Cancel</Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{plan.name}</span>
                  <span className="text-xs text-muted-foreground font-mono">{plan.slug}</span>
                  {plan.isDefault && <Badge variant="info" className="text-[10px]">Default</Badge>}
                </div>
                <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                  <span>£{(plan.priceMonthly / 100).toFixed(2)}/mo</span>
                  {plan.priceYearly && <span>£{(plan.priceYearly / 100).toFixed(2)}/yr</span>}
                  <span>{plan.trialDays}d trial</span>
                  <span className="font-mono text-xs">{plan.stripePriceId}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {!isEditing && (
          <div className="flex items-center gap-1">
            {onMoveUp && (
              <Button variant="ghost" size="sm" onClick={onMoveUp} className="h-7 w-7 p-0">
                <ChevronUp className="h-4 w-4" />
              </Button>
            )}
            {onMoveDown && (
              <Button variant="ghost" size="sm" onClick={onMoveDown} className="h-7 w-7 p-0">
                <ChevronDown className="h-4 w-4" />
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)} className="h-7 w-7 p-0">
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(plan.id)}
              disabled={!canDelete}
              className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>
    </Card>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/platform/plan-card.tsx
git commit -m "feat(platform): add plan card component with inline editing"
```

---

## Task 11: Build the product detail page with tabs

**Files:**
- Modify: `src/app/platform/products/[id]/page.tsx`
- Create: `src/components/platform/product-detail-client.tsx`

The page is a server component that fetches data, then renders a client component for the tabbed interface.

- [ ] **Step 1: Create the client component**

Create `src/components/platform/product-detail-client.tsx`:

```typescript
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { api } from "@/lib/trpc/react"
import { toast } from "sonner"
import { Copy, ExternalLink, Plus } from "lucide-react"
import { ModuleCategoryGrid } from "./module-category-grid"
import { FeatureMatrix } from "./feature-matrix"
import { PlanCard } from "./plan-card"
import type { ProductWithPlans, ProductPlanRecord, ProductAnalytics } from "@/modules/product/product.types"

interface ProductDetailClientProps {
  product: ProductWithPlans & { archivedAt: Date | null }
  tenants: {
    id: string
    name: string
    status: string
    plan: string
    subscriptionId: string | null
    planId: string | null
    createdAt: Date
  }[]
  analytics: ProductAnalytics
}

export function ProductDetailClient({ product, tenants, analytics }: ProductDetailClientProps) {
  const router = useRouter()

  // Overview state
  const [name, setName] = useState(product.name)
  const [tagline, setTagline] = useState(product.tagline)
  const [description, setDescription] = useState(product.description)
  const [domain, setDomain] = useState(product.domain ?? "")
  const [isPublished, setIsPublished] = useState(product.isPublished)
  const [moduleSlugs, setModuleSlugs] = useState(product.moduleSlugs)

  // Plan state
  const [plans, setPlans] = useState<ProductPlanRecord[]>(product.plans)
  const [showNewPlan, setShowNewPlan] = useState(false)
  const [newPlanName, setNewPlanName] = useState("")
  const [newPlanSlug, setNewPlanSlug] = useState("")
  const [newPlanPrice, setNewPlanPrice] = useState(0)
  const [newPlanStripePriceId, setNewPlanStripePriceId] = useState("")

  const updateMutation = api.product.update.useMutation({
    onSuccess: () => {
      toast.success("Product updated")
      router.refresh()
    },
    onError: (err) => toast.error(err.message),
  })

  const cloneMutation = api.product.clone.useMutation({
    onSuccess: (data) => {
      toast.success("Product cloned")
      router.push(`/platform/products/${data.id}`)
    },
    onError: (err) => toast.error(err.message),
  })

  const archiveMutation = api.product.archive.useMutation({
    onSuccess: () => {
      toast.success("Product archived")
      router.push("/platform/products")
    },
    onError: (err) => toast.error(err.message),
  })

  const unarchiveMutation = api.product.unarchive.useMutation({
    onSuccess: () => {
      toast.success("Product unarchived")
      router.refresh()
    },
    onError: (err) => toast.error(err.message),
  })

  const createPlanMutation = api.product.createPlan.useMutation({
    onSuccess: () => {
      toast.success("Plan created")
      setShowNewPlan(false)
      setNewPlanName("")
      setNewPlanSlug("")
      setNewPlanPrice(0)
      setNewPlanStripePriceId("")
      router.refresh()
    },
    onError: (err) => toast.error(err.message),
  })

  const updatePlanMutation = api.product.updatePlan.useMutation({
    onSuccess: () => {
      toast.success("Plan updated")
      router.refresh()
    },
    onError: (err) => toast.error(err.message),
  })

  const deletePlanMutation = api.product.deletePlan.useMutation({
    onSuccess: () => {
      toast.success("Plan deleted")
      router.refresh()
    },
    onError: (err) => toast.error(err.message),
  })

  const handleSave = () => {
    updateMutation.mutate({
      id: product.id,
      name,
      tagline,
      description,
      domain: domain || null,
      moduleSlugs,
      isPublished,
    })
  }

  const handleCreatePlan = () => {
    createPlanMutation.mutate({
      productId: product.id,
      name: newPlanName,
      slug: newPlanSlug,
      priceMonthly: newPlanPrice,
      stripePriceId: newPlanStripePriceId,
    })
  }

  const handleUpdatePlan = (planId: string, data: Record<string, unknown>) => {
    updatePlanMutation.mutate({ id: planId, ...data })
  }

  const handleFeatureUpdate = (planId: string, features: string[]) => {
    updatePlanMutation.mutate({ id: planId, features })
    // Optimistic update for responsiveness
    setPlans((prev) => prev.map((p) => (p.id === planId ? { ...p, features } : p)))
  }

  const isPending = updateMutation.isPending

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{product.name}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            <span className="font-mono">{product.slug}</span>
            {" · "}
            Created {product.createdAt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => cloneMutation.mutate({ id: product.id })} disabled={cloneMutation.isPending}>
            Clone
          </Button>
          {product.archivedAt ? (
            <Button variant="outline" size="sm" onClick={() => unarchiveMutation.mutate({ id: product.id })} disabled={unarchiveMutation.isPending}>
              Unarchive
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={() => archiveMutation.mutate({ id: product.id })} disabled={archiveMutation.isPending}>
              Archive
            </Button>
          )}
          <Button size="sm" onClick={handleSave} disabled={isPending}>
            {isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      {product.archivedAt && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-amber-600">
          This product was archived on {product.archivedAt.toLocaleDateString("en-GB")}. It is hidden from the product list and its landing page returns 404.
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="modules">Modules</TabsTrigger>
          <TabsTrigger value="plans">Plans & Pricing</TabsTrigger>
          <TabsTrigger value="tenants">Tenants</TabsTrigger>
          <TabsTrigger value="landing">Landing Page</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
            <Card className="p-5 space-y-4">
              <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Settings</h3>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">Name</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs">Tagline</Label>
                  <Input value={tagline} onChange={(e) => setTagline(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs">Slug</Label>
                  <Input value={product.slug} disabled className="mt-1 font-mono text-sm" />
                </div>
                <div>
                  <Label className="text-xs">Description</Label>
                  <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs">Domain</Label>
                  <Input value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="custom-domain.com" className="mt-1" />
                </div>
                <div className="flex items-center justify-between pt-2">
                  <Label>Published</Label>
                  <Switch checked={isPublished} onCheckedChange={setIsPublished} />
                </div>
              </div>
            </Card>

            <div className="space-y-4">
              <Card className="p-5">
                <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">Quick Stats</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-2xl font-semibold">{analytics.totalTenants}</p>
                    <p className="text-xs text-muted-foreground">Active Tenants</p>
                  </div>
                  <div>
                    <p className="text-2xl font-semibold">£{(analytics.mrr / 100).toFixed(0)}</p>
                    <p className="text-xs text-muted-foreground">Monthly Revenue</p>
                  </div>
                  <div>
                    <p className="text-2xl font-semibold">{moduleSlugs.length}</p>
                    <p className="text-xs text-muted-foreground">Modules Enabled</p>
                  </div>
                  <div>
                    <p className="text-2xl font-semibold">{plans.length}</p>
                    <p className="text-xs text-muted-foreground">Pricing Plans</p>
                  </div>
                </div>
              </Card>

              <Card className="p-5">
                <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">Module Summary</h3>
                <div className="flex flex-wrap gap-1.5">
                  {moduleSlugs.map((mod) => (
                    <Badge key={mod} variant="info" className="text-xs">{mod}</Badge>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Modules Tab */}
        <TabsContent value="modules">
          <div className="mt-4">
            <ModuleCategoryGrid selected={moduleSlugs} onChange={setModuleSlugs} />
          </div>
        </TabsContent>

        {/* Plans & Pricing Tab */}
        <TabsContent value="plans">
          <div className="space-y-6 mt-4">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium">Plans</h3>
                <Button size="sm" variant="outline" onClick={() => setShowNewPlan(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Plan
                </Button>
              </div>

              {showNewPlan && (
                <Card className="p-4 mb-3 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Name</Label>
                      <Input value={newPlanName} onChange={(e) => setNewPlanName(e.target.value)} className="h-8 mt-1" placeholder="Starter" />
                    </div>
                    <div>
                      <Label className="text-xs">Slug</Label>
                      <Input value={newPlanSlug} onChange={(e) => setNewPlanSlug(e.target.value)} className="h-8 mt-1" placeholder="starter" pattern="[a-z0-9-]+" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Monthly Price (pence)</Label>
                      <Input type="number" value={newPlanPrice} onChange={(e) => setNewPlanPrice(Number(e.target.value))} className="h-8 mt-1" />
                    </div>
                    <div>
                      <Label className="text-xs">Stripe Price ID</Label>
                      <Input value={newPlanStripePriceId} onChange={(e) => setNewPlanStripePriceId(e.target.value)} className="h-8 mt-1 font-mono text-xs" placeholder="price_..." />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleCreatePlan} disabled={createPlanMutation.isPending || !newPlanName || !newPlanSlug || !newPlanStripePriceId}>
                      Create Plan
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setShowNewPlan(false)}>Cancel</Button>
                  </div>
                </Card>
              )}

              <div className="space-y-2">
                {plans.map((plan, idx) => (
                  <PlanCard
                    key={plan.id}
                    plan={plan}
                    onUpdate={handleUpdatePlan}
                    onDelete={(id) => deletePlanMutation.mutate({ id })}
                    onMoveUp={idx > 0 ? () => {} : undefined}
                    onMoveDown={idx < plans.length - 1 ? () => {} : undefined}
                    canDelete={tenants.filter((t) => t.planId === plan.id).length === 0}
                  />
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium mb-3">Feature Matrix</h3>
              <FeatureMatrix
                plans={plans.map((p) => ({ id: p.id, name: p.name, features: p.features }))}
                onUpdate={handleFeatureUpdate}
              />
            </div>
          </div>
        </TabsContent>

        {/* Tenants Tab */}
        <TabsContent value="tenants">
          <div className="mt-4">
            {tenants.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-sm text-muted-foreground">
                  No tenants on this product yet.
                  {!product.isPublished && " Publish the product to enable signups."}
                </p>
              </Card>
            ) : (
              <div className="rounded-lg border overflow-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left px-4 py-2 font-medium">Tenant</th>
                      <th className="text-left px-4 py-2 font-medium">Plan</th>
                      <th className="text-left px-4 py-2 font-medium">Status</th>
                      <th className="text-left px-4 py-2 font-medium">Subscription</th>
                      <th className="text-left px-4 py-2 font-medium">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tenants.map((tenant) => (
                      <tr key={tenant.id} className="border-b last:border-0">
                        <td className="px-4 py-2 font-medium">{tenant.name}</td>
                        <td className="px-4 py-2 text-muted-foreground">{tenant.plan}</td>
                        <td className="px-4 py-2">
                          <Badge variant={tenant.status === "ACTIVE" ? "success" : tenant.status === "TRIAL" ? "info" : "warning"}>
                            {tenant.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-2 font-mono text-xs text-muted-foreground">{tenant.subscriptionId ?? "—"}</td>
                        <td className="px-4 py-2 text-muted-foreground">{tenant.createdAt.toLocaleDateString("en-GB")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Landing Page Tab */}
        <TabsContent value="landing">
          <div className="mt-4 space-y-4">
            <Card className="p-5">
              <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">Public Page</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Landing Page URL</p>
                    <p className="text-sm text-muted-foreground font-mono">/products/{product.slug}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/products/${product.slug}`)
                        toast.success("URL copied")
                      }}
                    >
                      <Copy className="h-3.5 w-3.5 mr-1" />
                      Copy
                    </Button>
                    <a href={`/products/${product.slug}`} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" size="sm">
                        <ExternalLink className="h-3.5 w-3.5 mr-1" />
                        View
                      </Button>
                    </a>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Signup URL</p>
                    <p className="text-sm text-muted-foreground font-mono">/signup/{product.slug}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/signup/${product.slug}`)
                      toast.success("URL copied")
                    }}
                  >
                    <Copy className="h-3.5 w-3.5 mr-1" />
                    Copy
                  </Button>
                </div>

                <div className="flex items-center justify-between pt-2 border-t">
                  <div>
                    <p className="text-sm font-medium">Status</p>
                    <p className="text-sm text-muted-foreground">
                      {product.isPublished ? "Published — visible to the public" : "Draft — not visible"}
                    </p>
                  </div>
                  <Badge variant={product.isPublished ? "success" : "secondary"}>
                    {product.isPublished ? "Live" : "Draft"}
                  </Badge>
                </div>
              </div>
            </Card>

            <Card className="p-5">
              <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">Preview Content</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Hero Title:</span>{" "}
                  <span className="font-medium">{product.name}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Tagline:</span>{" "}
                  <span>{product.tagline}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Description:</span>{" "}
                  <span>{product.description || "Not set"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Logo:</span>{" "}
                  <span>{product.logoUrl || "Not uploaded"}</span>
                </div>
                <p className="text-xs text-muted-foreground pt-2">
                  Edit these fields in the Overview tab.
                </p>
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics">
          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="p-4">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">MRR</p>
                <p className="text-2xl font-semibold mt-1">£{(analytics.mrr / 100).toFixed(0)}</p>
                <p className={`text-xs mt-1 ${analytics.mrrChange >= 0 ? "text-green-500" : "text-red-500"}`}>
                  {analytics.mrrChange >= 0 ? "↑" : "↓"} {Math.abs(analytics.mrrChange)}%
                </p>
              </Card>
              <Card className="p-4">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total Tenants</p>
                <p className="text-2xl font-semibold mt-1">{analytics.totalTenants}</p>
              </Card>
              <Card className="p-4">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Trial Conversion</p>
                <p className="text-2xl font-semibold mt-1">{analytics.trialConversionRate}%</p>
              </Card>
              <Card className="p-4">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Churn Rate</p>
                <p className="text-2xl font-semibold mt-1">{analytics.churnRate}%</p>
              </Card>
            </div>

            <Card className="p-5">
              <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">Plan Distribution</h3>
              {analytics.tenantsByPlan.length === 0 ? (
                <p className="text-sm text-muted-foreground">No tenants yet.</p>
              ) : (
                <div className="space-y-2">
                  {analytics.tenantsByPlan.map((entry) => {
                    const maxCount = Math.max(...analytics.tenantsByPlan.map((e) => e.count), 1)
                    const width = (entry.count / maxCount) * 100
                    return (
                      <div key={entry.planId} className="flex items-center gap-3">
                        <span className="text-sm w-24 shrink-0">{entry.planName}</span>
                        <div className="flex-1 h-6 rounded bg-muted overflow-hidden">
                          <div
                            className="h-full bg-primary/20 rounded"
                            style={{ width: `${width}%` }}
                          />
                        </div>
                        <span className="text-sm text-muted-foreground w-8 text-right">{entry.count}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
```

- [ ] **Step 2: Rebuild the server page**

Replace `src/app/platform/products/[id]/page.tsx` entirely:

```typescript
import { notFound } from "next/navigation"
import { db } from "@/shared/db"
import { products, productPlans } from "@/shared/db/schemas/product.schema"
import { tenants } from "@/shared/db/schemas/tenant.schema"
import { eq, and, isNull } from "drizzle-orm"
import { productService } from "@/modules/product/product.service"
import { ProductDetailClient } from "@/components/platform/product-detail-client"

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const [product] = await db
    .select()
    .from(products)
    .where(eq(products.id, id))
    .limit(1)

  if (!product) notFound()

  const plans = await db
    .select()
    .from(productPlans)
    .where(eq(productPlans.productId, id))
    .orderBy(productPlans.priceMonthly)

  const productTenants = await db
    .select()
    .from(tenants)
    .where(and(eq(tenants.productId, id), isNull(tenants.deletedAt)))

  const analytics = await productService.getProductAnalytics(id)

  const productWithPlans = {
    id: product.id,
    slug: product.slug,
    name: product.name,
    tagline: product.tagline,
    description: product.description,
    logoUrl: product.logoUrl,
    domain: product.domain,
    moduleSlugs: product.moduleSlugs ?? [],
    isPublished: product.isPublished,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
    archivedAt: product.archivedAt ?? null,
    plans: plans.map((p) => ({
      id: p.id,
      productId: p.productId,
      slug: p.slug,
      name: p.name,
      priceMonthly: p.priceMonthly,
      priceYearly: p.priceYearly,
      trialDays: p.trialDays,
      stripePriceId: p.stripePriceId,
      features: (p.features as string[]) ?? [],
      isDefault: p.isDefault,
      createdAt: p.createdAt,
    })),
  }

  const tenantData = productTenants.map((t) => ({
    id: t.id,
    name: t.name,
    status: t.status,
    plan: t.plan,
    subscriptionId: t.subscriptionId,
    planId: t.planId,
    createdAt: t.createdAt,
  }))

  return (
    <ProductDetailClient
      product={productWithPlans}
      tenants={tenantData}
      analytics={analytics}
    />
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/platform/product-detail-client.tsx src/app/platform/products/\[id\]/page.tsx
git commit -m "feat(platform): rebuild product detail page with tabbed interface"
```

---

## Task 12: Rebuild the product list page

**Files:**
- Modify: `src/app/platform/products/page.tsx`
- Create: `src/components/platform/product-list-client.tsx`

- [ ] **Step 1: Create the client list component**

Create `src/components/platform/product-list-client.tsx`:

```typescript
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { api } from "@/lib/trpc/react"
import { toast } from "sonner"
import { Plus, MoreHorizontal, Copy, Archive, Trash2, GitCompare } from "lucide-react"
import type { ProductWithStats } from "@/modules/product/product.types"

interface ProductListClientProps {
  initialProducts: ProductWithStats[]
}

export function ProductListClient({ initialProducts }: ProductListClientProps) {
  const router = useRouter()
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [moduleFilter, setModuleFilter] = useState<string>("all")

  const { data: products } = api.product.listWithStats.useQuery(
    {
      search: search || undefined,
      status: statusFilter === "all" ? undefined : statusFilter as "live" | "draft" | "archived",
      moduleSlug: moduleFilter === "all" ? undefined : moduleFilter,
    },
    { initialData: initialProducts }
  )

  const cloneMutation = api.product.clone.useMutation({
    onSuccess: (data) => {
      toast.success("Product cloned")
      router.push(`/platform/products/${data.id}`)
    },
    onError: (err) => toast.error(err.message),
  })

  const archiveMutation = api.product.archive.useMutation({
    onSuccess: () => {
      toast.success("Product archived")
      router.refresh()
    },
    onError: (err) => toast.error(err.message),
  })

  const deleteMutation = api.product.delete.useMutation({
    onSuccess: () => {
      toast.success("Product deleted")
      router.refresh()
    },
    onError: (err) => toast.error(err.message),
  })

  const allModules = Array.from(new Set((products ?? []).flatMap((p) => p.moduleSlugs))).sort()

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Products</h1>
        <div className="flex gap-2">
          <Link href="/platform/products/compare">
            <Button variant="outline" size="sm">
              <GitCompare className="h-4 w-4 mr-1" />
              Compare
            </Button>
          </Link>
          <Link href="/platform/products/new">
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" />
              New Product
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <Input
          placeholder="Search products..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="live">Live</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
        <Select value={moduleFilter} onValueChange={setModuleFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Module" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Modules</SelectItem>
            {allModules.map((mod) => (
              <SelectItem key={mod} value={mod}>{mod}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Modules</TableHead>
              <TableHead>Tenants</TableHead>
              <TableHead>MRR</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {(products ?? []).length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  No products found.
                </TableCell>
              </TableRow>
            ) : (
              (products ?? []).map((product) => (
                <TableRow
                  key={product.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/platform/products/${product.id}`)}
                >
                  <TableCell>
                    <div>
                      <p className="font-medium">{product.name}</p>
                      <p className="text-xs text-muted-foreground">
                        <span className="font-mono">{product.slug}</span> · {product.planCount} plans
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {product.moduleSlugs.slice(0, 2).map((mod) => (
                        <Badge key={mod} variant="info" className="text-[10px]">{mod}</Badge>
                      ))}
                      {product.moduleSlugs.length > 2 && (
                        <Badge variant="secondary" className="text-[10px]">
                          +{product.moduleSlugs.length - 2}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p>{product.tenantCount}</p>
                      {product.tenantGrowthThisMonth > 0 && (
                        <p className="text-xs text-green-500">↑ {product.tenantGrowthThisMonth} this month</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <p>£{(product.mrr / 100).toFixed(0)}</p>
                  </TableCell>
                  <TableCell>
                    <Badge variant={
                      product.archivedAt ? "secondary" :
                      product.isPublished ? "success" : "secondary"
                    }>
                      {product.archivedAt ? "Archived" : product.isPublished ? "Live" : "Draft"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); cloneMutation.mutate({ id: product.id }) }}>
                          <Copy className="h-4 w-4 mr-2" />
                          Clone
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); archiveMutation.mutate({ id: product.id }) }}>
                          <Archive className="h-4 w-4 mr-2" />
                          Archive
                        </DropdownMenuItem>
                        {product.tenantCount === 0 && (
                          <DropdownMenuItem
                            onClick={(e) => { e.stopPropagation(); deleteMutation.mutate({ id: product.id }) }}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Rebuild the server page**

Replace `src/app/platform/products/page.tsx` entirely:

```typescript
import { productService } from "@/modules/product/product.service"
import { ProductListClient } from "@/components/platform/product-list-client"

export default async function ProductsPage() {
  const products = await productService.listProductsWithStats({})

  return <ProductListClient initialProducts={products} />
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/platform/product-list-client.tsx src/app/platform/products/page.tsx
git commit -m "feat(platform): rebuild product list page with data-dense table and filters"
```

---

## Task 13: Rebuild the product create page

**Files:**
- Modify: `src/app/platform/products/new/page.tsx`

- [ ] **Step 1: Rebuild create page with categorized modules**

Replace `src/app/platform/products/new/page.tsx`:

```typescript
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { api } from "@/lib/trpc/react"
import { toast } from "sonner"
import { ModuleCategoryGrid } from "@/components/platform/module-category-grid"

export default function NewProductPage() {
  const router = useRouter()
  const [slug, setSlug] = useState("")
  const [name, setName] = useState("")
  const [tagline, setTagline] = useState("")
  const [description, setDescription] = useState("")
  const [domain, setDomain] = useState("")
  const [moduleSlugs, setModuleSlugs] = useState<string[]>([])

  const createMutation = api.product.create.useMutation({
    onSuccess: (data) => {
      toast.success("Product created — now add a plan")
      router.push(`/platform/products/${data.id}`)
    },
    onError: (err) => toast.error(err.message),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createMutation.mutate({
      slug,
      name,
      tagline,
      description: description || undefined,
      domain: domain || undefined,
      moduleSlugs,
    })
  }

  // Auto-generate slug from name
  const handleNameChange = (value: string) => {
    setName(value)
    if (!slug || slug === nameToSlug(name)) {
      setSlug(nameToSlug(value))
    }
  }

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-semibold">Create Product</h1>

      <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
        <Card className="p-5 space-y-4">
          <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Details</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">Name</Label>
              <Input value={name} onChange={(e) => handleNameChange(e.target.value)} placeholder="Barber Pro" required className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Slug</Label>
              <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="barber-pro" pattern="[a-z0-9-]+" required className="mt-1 font-mono" />
            </div>
          </div>
          <div>
            <Label className="text-xs">Tagline</Label>
            <Input value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="All-in-one barbershop management" required className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="mt-1" placeholder="Longer product description..." />
          </div>
          <div>
            <Label className="text-xs">Domain (optional)</Label>
            <Input value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="barber.ironheart.dev" className="mt-1" />
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-4">Modules</h3>
          <ModuleCategoryGrid selected={moduleSlugs} onChange={setModuleSlugs} />
        </Card>

        <Button type="submit" disabled={createMutation.isPending || moduleSlugs.length === 0 || !name || !slug || !tagline}>
          {createMutation.isPending ? "Creating..." : "Create Product"}
        </Button>
      </form>
    </div>
  )
}

function nameToSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/platform/products/new/page.tsx
git commit -m "feat(platform): rebuild create product page with categorized module grid"
```

---

## Task 14: Build the product compare page

**Files:**
- Create: `src/app/platform/products/compare/page.tsx`

- [ ] **Step 1: Create the compare page**

Create `src/app/platform/products/compare/page.tsx`:

```typescript
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { api } from "@/lib/trpc/react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

const ALL_MODULES = [
  "booking", "scheduling", "customer", "team", "payment",
  "forms", "review", "notification", "outreach", "ai",
  "workflow", "analytics", "calendar-sync", "pipeline",
  "developer",
]

const PRODUCT_COLORS = [
  { bg: "bg-blue-500/15", text: "text-blue-400", border: "border-blue-500/30", fill: "fill-blue-500/20", stroke: "stroke-blue-500" },
  { bg: "bg-emerald-500/15", text: "text-emerald-400", border: "border-emerald-500/30", fill: "fill-emerald-500/20", stroke: "stroke-emerald-500" },
  { bg: "bg-amber-500/15", text: "text-amber-400", border: "border-amber-500/30", fill: "fill-amber-500/20", stroke: "stroke-amber-500" },
]

export default function CompareProductsPage() {
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  const { data: allProducts } = api.product.listWithStats.useQuery({})
  const { data: comparison } = api.product.compare.useQuery(
    { ids: selectedIds },
    { enabled: selectedIds.length >= 2 }
  )

  const toggleProduct = (id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((p) => p !== id)
      if (prev.length >= 3) return prev
      return [...prev, id]
    })
  }

  // Compute Venn regions
  const computeVennData = () => {
    if (!comparison || comparison.length < 2) return null
    const sets = comparison.map((c) => new Set(c.moduleSlugs))

    if (comparison.length === 2) {
      const shared = ALL_MODULES.filter((m) => sets[0].has(m) && sets[1].has(m))
      const onlyA = ALL_MODULES.filter((m) => sets[0].has(m) && !sets[1].has(m))
      const onlyB = ALL_MODULES.filter((m) => !sets[0].has(m) && sets[1].has(m))
      return { type: 2 as const, shared, onlyA, onlyB }
    }

    const allThree = ALL_MODULES.filter((m) => sets[0].has(m) && sets[1].has(m) && sets[2].has(m))
    const abOnly = ALL_MODULES.filter((m) => sets[0].has(m) && sets[1].has(m) && !sets[2].has(m))
    const acOnly = ALL_MODULES.filter((m) => sets[0].has(m) && !sets[1].has(m) && sets[2].has(m))
    const bcOnly = ALL_MODULES.filter((m) => !sets[0].has(m) && sets[1].has(m) && sets[2].has(m))
    const onlyA = ALL_MODULES.filter((m) => sets[0].has(m) && !sets[1].has(m) && !sets[2].has(m))
    const onlyB = ALL_MODULES.filter((m) => !sets[0].has(m) && sets[1].has(m) && !sets[2].has(m))
    const onlyC = ALL_MODULES.filter((m) => !sets[0].has(m) && !sets[1].has(m) && sets[2].has(m))
    return { type: 3 as const, allThree, abOnly, acOnly, bcOnly, onlyA, onlyB, onlyC }
  }

  const venn = computeVennData()

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/platform/products">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
        </Link>
        <h1 className="text-2xl font-semibold">Compare Products</h1>
      </div>

      {/* Product picker */}
      <Card className="p-5">
        <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">
          Select 2-3 products to compare
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
          {(allProducts ?? []).map((product) => (
            <button
              key={product.id}
              onClick={() => toggleProduct(product.id)}
              className={`text-left px-3 py-2 rounded-lg border transition-colors ${
                selectedIds.includes(product.id)
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/30"
              }`}
              disabled={!selectedIds.includes(product.id) && selectedIds.length >= 3}
            >
              <p className="text-sm font-medium">{product.name}</p>
              <p className="text-xs text-muted-foreground">{product.moduleSlugs.length} modules</p>
            </button>
          ))}
        </div>
      </Card>

      {/* Venn visualization */}
      {venn && comparison && (
        <Card className="p-5">
          <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-4">Module Sets</h3>

          {/* Legend */}
          <div className="flex gap-4 mb-4">
            {comparison.map((c, i) => (
              <div key={c.productId} className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${PRODUCT_COLORS[i].bg} ${PRODUCT_COLORS[i].border} border`} />
                <span className="text-sm font-medium">{c.productName}</span>
              </div>
            ))}
          </div>

          {/* Venn circles using CSS */}
          <div className="relative h-80 flex items-center justify-center mb-6">
            {venn.type === 2 ? (
              <>
                <div className={`absolute w-56 h-56 rounded-full ${PRODUCT_COLORS[0].bg} ${PRODUCT_COLORS[0].border} border-2 left-1/2 -translate-x-[60%] flex flex-col items-start justify-center pl-8`}>
                  <div className="text-xs space-y-0.5">
                    {venn.onlyA.map((m) => (
                      <div key={m} className={PRODUCT_COLORS[0].text}>{m}</div>
                    ))}
                  </div>
                </div>
                <div className={`absolute w-56 h-56 rounded-full ${PRODUCT_COLORS[1].bg} ${PRODUCT_COLORS[1].border} border-2 left-1/2 -translate-x-[40%] flex flex-col items-end justify-center pr-8`}>
                  <div className="text-xs space-y-0.5 text-right">
                    {venn.onlyB.map((m) => (
                      <div key={m} className={PRODUCT_COLORS[1].text}>{m}</div>
                    ))}
                  </div>
                </div>
                <div className="absolute left-1/2 -translate-x-1/2 z-10 text-xs space-y-0.5 text-center">
                  {venn.shared.map((m) => (
                    <div key={m} className="text-foreground font-medium">{m}</div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center text-sm text-muted-foreground">
                {/* 3-way Venn simplified as a list */}
                <div className="grid grid-cols-3 gap-4">
                  {comparison.map((c, i) => {
                    const uniqueKey = i === 0 ? "onlyA" : i === 1 ? "onlyB" : "onlyC"
                    const unique = (venn as Record<string, string[]>)[uniqueKey] ?? []
                    return (
                      <div key={c.productId}>
                        <p className={`font-medium mb-2 ${PRODUCT_COLORS[i].text}`}>Only {c.productName}</p>
                        {unique.map((m) => <Badge key={m} variant="secondary" className="mr-1 mb-1 text-[10px]">{m}</Badge>)}
                        {unique.length === 0 && <span className="text-xs text-muted-foreground">None</span>}
                      </div>
                    )
                  })}
                </div>
                <div className="mt-4 pt-4 border-t">
                  <p className="font-medium mb-2">Shared by all</p>
                  {venn.allThree.map((m) => <Badge key={m} variant="info" className="mr-1 mb-1 text-[10px]">{m}</Badge>)}
                  {venn.allThree.length === 0 && <span className="text-xs text-muted-foreground">None</span>}
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Diff table */}
      {comparison && comparison.length >= 2 && (
        <Card className="p-5">
          <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">Module Diff</h3>
          <div className="rounded-lg border overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Module</TableHead>
                  {comparison.map((c) => (
                    <TableHead key={c.productId} className="text-center">{c.productName}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {ALL_MODULES.map((mod) => (
                  <TableRow key={mod}>
                    <TableCell className="font-mono text-sm">{mod}</TableCell>
                    {comparison.map((c) => (
                      <TableCell key={c.productId} className="text-center">
                        {c.moduleSlugs.includes(mod) ? (
                          <span className="text-green-500">✓</span>
                        ) : (
                          <span className="text-muted-foreground/30">—</span>
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/platform/products/compare/page.tsx
git commit -m "feat(platform): add product comparison page with Venn visualization"
```

---

## Task 15: Remove the old product form component

**Files:**
- Modify: `src/components/platform/product-form.tsx`

The old `ProductForm` component is no longer used — the create page now has its own inline form with `ModuleCategoryGrid`, and the detail page uses the tabbed `ProductDetailClient`.

- [ ] **Step 1: Delete the old product form**

Delete `src/components/platform/product-form.tsx` (it's fully replaced by `product-detail-client.tsx` and the new create page).

Run: `git rm src/components/platform/product-form.tsx`

- [ ] **Step 2: Verify no imports reference it**

Run: Search for `product-form` across the codebase. The only previous consumers were:
- `src/app/platform/products/[id]/page.tsx` — now uses `ProductDetailClient`
- `src/app/platform/products/new/page.tsx` — now has its own form

Both have been replaced in earlier tasks.

- [ ] **Step 3: Commit**

```bash
git commit -m "chore: remove old ProductForm component (replaced by tabbed detail + categorized create)"
```

---

## Task 16: Update platform sidebar navigation

**Files:**
- Modify: `src/components/platform/platform-sidebar.tsx`

- [ ] **Step 1: Add "Compare" link to the Products section**

In `src/components/platform/platform-sidebar.tsx`, find the Products nav section and add a "Compare" item after "All Products":

```typescript
{ label: "Compare", href: "/platform/products/compare" },
```

Add this to the Products section items array, right after the "All Products" entry.

- [ ] **Step 2: Commit**

```bash
git add src/components/platform/platform-sidebar.tsx
git commit -m "feat(platform): add Compare link to sidebar navigation"
```

---

## Task 17: Verify build and tests

**Files:** None (verification only)

- [ ] **Step 1: Run type check**

Run: `npx tsc --noEmit`
Expected: No type errors.

If there are errors, fix them. Common issues:
- Missing imports for new types
- `archivedAt` not being handled in mappers
- Select component import path (verify `@/components/ui/select` exists, if not use a plain `<select>` element)

- [ ] **Step 2: Run all tests**

Run: `npx vitest run`
Expected: All tests pass (existing + new).

- [ ] **Step 3: Run build**

Run: `NEXT_PHASE=phase-production-build npx next build`
Expected: Build succeeds.

Fix any build errors that come up. Common issues:
- Server components importing client-only hooks
- Missing `"use client"` directives
- Serialization issues (Date objects in server → client component props need `.toISOString()` conversion if Next.js complains)

- [ ] **Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix: resolve build and type errors from product admin overhaul"
```

---

## Summary

| Task | Description | New Files | Modified Files |
|------|-------------|-----------|----------------|
| 1 | Schema + types | — | product.schema.ts, product.types.ts, product.repository.ts, product.test.ts |
| 2 | Zod schemas | — | product.schemas.ts |
| 3 | Repository extensions | — | product.repository.ts |
| 4 | Service extensions | — | product.service.ts |
| 5 | Router extensions | — | product.router.ts |
| 6 | Barrel export verification | — | product/index.ts |
| 7 | Backend tests | — | product.test.ts |
| 8 | Module category grid | module-category-grid.tsx | — |
| 9 | Feature matrix | feature-matrix.tsx | — |
| 10 | Plan card | plan-card.tsx | — |
| 11 | Product detail (tabbed) | product-detail-client.tsx | products/[id]/page.tsx |
| 12 | Product list (data-dense) | product-list-client.tsx | products/page.tsx |
| 13 | Product create | — | products/new/page.tsx |
| 14 | Product compare | compare/page.tsx | — |
| 15 | Remove old form | — | product-form.tsx (deleted) |
| 16 | Sidebar update | — | platform-sidebar.tsx |
| 17 | Build verification | — | — |
