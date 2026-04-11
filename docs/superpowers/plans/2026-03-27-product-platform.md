# Product Platform Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a product layer to Ironheart so modules can be packaged as standalone SaaS products with self-serve signup, Stripe billing, and a rebuilt platform command centre.

**Architecture:** Two new backend modules (`product`, `subscription`) sitting on top of existing module gating. New `products` and `productPlans` tables. `tenants.productId` controls whether a tenant is full-platform (consulting) or product-scoped (SaaS). Platform `/platform` gets expanded nav and real dashboards.

**Tech Stack:** Next.js 16, tRPC 11, Drizzle ORM, Stripe 20.x, Inngest 3.x, WorkOS AuthKit, Vitest

**Spec:** `docs/superpowers/specs/2026-03-27-product-platform-design.md`

---

## File Map

### New files
| File | Responsibility |
|------|---------------|
| `src/shared/db/schemas/product.schema.ts` | `products` + `productPlans` Drizzle tables |
| `src/modules/product/product.types.ts` | Product + ProductPlan interfaces |
| `src/modules/product/product.schemas.ts` | Zod input schemas for tRPC |
| `src/modules/product/product.repository.ts` | CRUD queries for products + plans |
| `src/modules/product/product.service.ts` | Business logic, plan resolution |
| `src/modules/product/product.router.ts` | platformAdminProcedure + public endpoints |
| `src/modules/product/index.ts` | Barrel export |
| `src/modules/product/__tests__/product.test.ts` | Unit tests |
| `src/modules/subscription/subscription.types.ts` | Subscription interfaces |
| `src/modules/subscription/subscription.schemas.ts` | Zod input schemas |
| `src/modules/subscription/subscription.repository.ts` | Subscription DB queries |
| `src/modules/subscription/subscription.service.ts` | Checkout, webhook handling, lifecycle |
| `src/modules/subscription/subscription.router.ts` | Public checkout + tenant billing portal + platform overview |
| `src/modules/subscription/subscription.events.ts` | Inngest webhook handlers |
| `src/modules/subscription/index.ts` | Barrel export |
| `src/modules/subscription/__tests__/subscription.test.ts` | Unit tests |
| `src/app/products/[productSlug]/page.tsx` | Public product landing page |
| `src/app/signup/[productSlug]/page.tsx` | Signup form |
| `src/app/signup/[productSlug]/success/page.tsx` | Post-checkout success |
| `src/app/platform/products/page.tsx` | Product list + CRUD |
| `src/app/platform/products/[id]/page.tsx` | Product detail/edit |
| `src/app/platform/products/new/page.tsx` | Create product form |
| `src/app/platform/subscriptions/page.tsx` | Subscription overview |
| `src/app/platform/revenue/page.tsx` | Revenue analytics |
| `src/components/platform/product-form.tsx` | Create/edit product form component |
| `src/components/platform/product-list-table.tsx` | Product list table |
| `src/components/platform/subscription-table.tsx` | Subscription list table |
| `src/components/platform/analytics/revenue-chart.tsx` | Revenue over time chart |
| `src/components/signup/signup-form.tsx` | Public signup form component |

### Modified files
| File | Change |
|------|--------|
| `src/shared/db/schemas/tenant.schema.ts` | Add `productId`, `planId` columns to `tenants` |
| `src/shared/db/schema.ts` | Add `product.schema` export |
| `src/shared/inngest.ts` | Add subscription webhook events |
| `src/server/root.ts` | Wire product + subscription routers |
| `src/modules/platform/platform.service.ts` | Product-aware provisioning path |
| `src/components/platform/platform-sidebar.tsx` | Expand nav with Products, Subscriptions, Revenue sections |
| `src/app/platform/page.tsx` | Replace redirect with real dashboard |
| `src/app/admin/layout.tsx` | Add "Billing" nav item for product-scoped tenants |

---

## Task 1: Product schema + tenant columns

**Files:**
- Create: `src/shared/db/schemas/product.schema.ts`
- Modify: `src/shared/db/schemas/tenant.schema.ts`
- Modify: `src/shared/db/schema.ts`

- [ ] **Step 1: Create product schema file**

```typescript
// src/shared/db/schemas/product.schema.ts
import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { tenants } from "./tenant.schema";

export const products = pgTable("products", {
  id: uuid().primaryKey().notNull(),
  slug: text().notNull().unique(),
  name: text().notNull(),
  tagline: text().notNull(),
  description: text().notNull().default(""),
  logoUrl: text(),
  domain: text(),
  moduleSlugs: text().array().notNull().default(sql`'{}'::text[]`),
  isPublished: boolean().notNull().default(false),
  createdAt: timestamp({ precision: 3, mode: "date" })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  updatedAt: timestamp({ precision: 3, mode: "date" }).notNull(),
});

export const productPlans = pgTable("product_plans", {
  id: uuid().primaryKey().notNull(),
  productId: uuid()
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  slug: text().notNull(),
  name: text().notNull(),
  priceMonthly: integer().notNull(),
  priceYearly: integer(),
  trialDays: integer().notNull().default(14),
  stripePriceId: text().notNull(),
  features: jsonb().$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  isDefault: boolean().notNull().default(true),
  createdAt: timestamp({ precision: 3, mode: "date" })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});
```

- [ ] **Step 2: Add productId and planId to tenants table**

In `src/shared/db/schemas/tenant.schema.ts`, add after the `trialEndsAt` column (before `deletedAt`):

```typescript
// Add these imports at the top (products and productPlans from product.schema)
// Note: to avoid circular imports, use raw uuid() references here
productId: uuid(),
planId: uuid(),
```

The full column additions inside the `tenants` pgTable definition, after `trialEndsAt`:

```typescript
productId: uuid(),
planId: uuid(),
```

These are nullable UUID columns — no FK constraint in Drizzle to avoid circular schema imports. The FK relationship is enforced at the application layer.

- [ ] **Step 3: Add product schema to barrel export**

In `src/shared/db/schema.ts`, add:

```typescript
export * from "./schemas/product.schema"
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: 0 errors

- [ ] **Step 5: Commit**

```bash
git add src/shared/db/schemas/product.schema.ts src/shared/db/schemas/tenant.schema.ts src/shared/db/schema.ts
git commit -m "schema: add products, productPlans tables and tenant.productId/planId columns"
```

---

## Task 2: Product types + schemas

**Files:**
- Create: `src/modules/product/product.types.ts`
- Create: `src/modules/product/product.schemas.ts`

- [ ] **Step 1: Create product types**

```typescript
// src/modules/product/product.types.ts

export interface ProductRecord {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  logoUrl: string | null;
  domain: string | null;
  moduleSlugs: string[];
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductPlanRecord {
  id: string;
  productId: string;
  slug: string;
  name: string;
  priceMonthly: number;
  priceYearly: number | null;
  trialDays: number;
  stripePriceId: string;
  features: string[];
  isDefault: boolean;
  createdAt: Date;
}

export interface ProductWithPlans extends ProductRecord {
  plans: ProductPlanRecord[];
}

export interface CreateProductInput {
  slug: string;
  name: string;
  tagline: string;
  description?: string;
  logoUrl?: string;
  domain?: string;
  moduleSlugs: string[];
  isPublished?: boolean;
}

export interface UpdateProductInput {
  name?: string;
  tagline?: string;
  description?: string;
  logoUrl?: string | null;
  domain?: string | null;
  moduleSlugs?: string[];
  isPublished?: boolean;
}

export interface CreatePlanInput {
  productId: string;
  slug: string;
  name: string;
  priceMonthly: number;
  priceYearly?: number;
  trialDays?: number;
  stripePriceId: string;
  features?: string[];
  isDefault?: boolean;
}
```

- [ ] **Step 2: Create product schemas**

```typescript
// src/modules/product/product.schemas.ts
import { z } from "zod";

export const createProductSchema = z.object({
  slug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/),
  name: z.string().min(1).max(100),
  tagline: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  logoUrl: z.string().url().optional(),
  domain: z.string().max(100).optional(),
  moduleSlugs: z.array(z.string()).min(1),
  isPublished: z.boolean().optional(),
});

export const updateProductSchema = z.object({
  id: z.uuid(),
  name: z.string().min(1).max(100).optional(),
  tagline: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  logoUrl: z.string().url().nullable().optional(),
  domain: z.string().max(100).nullable().optional(),
  moduleSlugs: z.array(z.string()).min(1).optional(),
  isPublished: z.boolean().optional(),
});

export const createPlanSchema = z.object({
  productId: z.uuid(),
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/),
  name: z.string().min(1).max(100),
  priceMonthly: z.number().int().min(0),
  priceYearly: z.number().int().min(0).optional(),
  trialDays: z.number().int().min(0).max(365).optional(),
  stripePriceId: z.string().min(1),
  features: z.array(z.string()).optional(),
  isDefault: z.boolean().optional(),
});

export const updatePlanSchema = z.object({
  id: z.uuid(),
  name: z.string().min(1).max(100).optional(),
  priceMonthly: z.number().int().min(0).optional(),
  priceYearly: z.number().int().min(0).nullable().optional(),
  trialDays: z.number().int().min(0).max(365).optional(),
  stripePriceId: z.string().min(1).optional(),
  features: z.array(z.string()).optional(),
  isDefault: z.boolean().optional(),
});

export const productSlugSchema = z.object({
  slug: z.string(),
});
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: 0 errors

- [ ] **Step 4: Commit**

```bash
git add src/modules/product/product.types.ts src/modules/product/product.schemas.ts
git commit -m "feat(product): add types and Zod schemas"
```

---

## Task 3: Product repository

**Files:**
- Create: `src/modules/product/product.repository.ts`

- [ ] **Step 1: Create product repository**

```typescript
// src/modules/product/product.repository.ts
import { db } from "@/shared/db";
import { logger } from "@/shared/logger";
import { NotFoundError, ConflictError } from "@/shared/errors";
import { products, productPlans } from "@/shared/db/schemas/product.schema";
import { eq, and } from "drizzle-orm";
import type {
  ProductRecord,
  ProductPlanRecord,
  ProductWithPlans,
  CreateProductInput,
  UpdateProductInput,
  CreatePlanInput,
} from "./product.types";

const log = logger.child({ module: "product.repository" });

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
  };
}

function toPlanRecord(row: typeof productPlans.$inferSelect): ProductPlanRecord {
  return {
    id: row.id,
    productId: row.productId,
    slug: row.slug,
    name: row.name,
    priceMonthly: row.priceMonthly,
    priceYearly: row.priceYearly,
    trialDays: row.trialDays,
    stripePriceId: row.stripePriceId,
    features: (row.features as string[]) ?? [],
    isDefault: row.isDefault,
    createdAt: row.createdAt,
  };
}

async function list(): Promise<ProductRecord[]> {
  const rows = await db.select().from(products).orderBy(products.name);
  return rows.map(toProductRecord);
}

async function findById(id: string): Promise<ProductRecord | null> {
  const rows = await db
    .select()
    .from(products)
    .where(eq(products.id, id))
    .limit(1);
  return rows[0] ? toProductRecord(rows[0]) : null;
}

async function findBySlug(slug: string): Promise<ProductRecord | null> {
  const rows = await db
    .select()
    .from(products)
    .where(eq(products.slug, slug))
    .limit(1);
  return rows[0] ? toProductRecord(rows[0]) : null;
}

async function findBySlugWithPlans(slug: string): Promise<ProductWithPlans | null> {
  const product = await findBySlug(slug);
  if (!product) return null;

  const plans = await db
    .select()
    .from(productPlans)
    .where(eq(productPlans.productId, product.id))
    .orderBy(productPlans.priceMonthly);

  return { ...product, plans: plans.map(toPlanRecord) };
}

async function findByIdWithPlans(id: string): Promise<ProductWithPlans | null> {
  const product = await findById(id);
  if (!product) return null;

  const plans = await db
    .select()
    .from(productPlans)
    .where(eq(productPlans.productId, product.id))
    .orderBy(productPlans.priceMonthly);

  return { ...product, plans: plans.map(toPlanRecord) };
}

async function create(input: CreateProductInput): Promise<ProductRecord> {
  const existing = await findBySlug(input.slug);
  if (existing) {
    throw new ConflictError(`Product with slug '${input.slug}' already exists`);
  }

  const now = new Date();
  const [row] = await db
    .insert(products)
    .values({
      id: crypto.randomUUID(),
      slug: input.slug,
      name: input.name,
      tagline: input.tagline,
      description: input.description ?? "",
      logoUrl: input.logoUrl ?? null,
      domain: input.domain ?? null,
      moduleSlugs: input.moduleSlugs,
      isPublished: input.isPublished ?? false,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  log.info({ productId: row.id, slug: input.slug }, "Product created");
  return toProductRecord(row);
}

async function update(
  id: string,
  input: UpdateProductInput
): Promise<ProductRecord> {
  const existing = await findById(id);
  if (!existing) {
    throw new NotFoundError("Product", id);
  }

  const now = new Date();
  const updateFields: Record<string, unknown> = { updatedAt: now };

  if (input.name !== undefined) updateFields.name = input.name;
  if (input.tagline !== undefined) updateFields.tagline = input.tagline;
  if (input.description !== undefined) updateFields.description = input.description;
  if (input.logoUrl !== undefined) updateFields.logoUrl = input.logoUrl;
  if (input.domain !== undefined) updateFields.domain = input.domain;
  if (input.moduleSlugs !== undefined) updateFields.moduleSlugs = input.moduleSlugs;
  if (input.isPublished !== undefined) updateFields.isPublished = input.isPublished;

  const [row] = await db
    .update(products)
    .set(updateFields)
    .where(eq(products.id, id))
    .returning();

  log.info({ productId: id }, "Product updated");
  return toProductRecord(row);
}

async function deleteProduct(id: string): Promise<void> {
  const existing = await findById(id);
  if (!existing) {
    throw new NotFoundError("Product", id);
  }

  await db.delete(products).where(eq(products.id, id));
  log.info({ productId: id }, "Product deleted");
}

async function createPlan(input: CreatePlanInput): Promise<ProductPlanRecord> {
  const product = await findById(input.productId);
  if (!product) {
    throw new NotFoundError("Product", input.productId);
  }

  const [row] = await db
    .insert(productPlans)
    .values({
      id: crypto.randomUUID(),
      productId: input.productId,
      slug: input.slug,
      name: input.name,
      priceMonthly: input.priceMonthly,
      priceYearly: input.priceYearly ?? null,
      trialDays: input.trialDays ?? 14,
      stripePriceId: input.stripePriceId,
      features: input.features ?? [],
      isDefault: input.isDefault ?? true,
      createdAt: new Date(),
    })
    .returning();

  log.info({ planId: row.id, productId: input.productId }, "Plan created");
  return toPlanRecord(row);
}

async function findDefaultPlan(productId: string): Promise<ProductPlanRecord | null> {
  const rows = await db
    .select()
    .from(productPlans)
    .where(
      and(eq(productPlans.productId, productId), eq(productPlans.isDefault, true))
    )
    .limit(1);
  return rows[0] ? toPlanRecord(rows[0]) : null;
}

async function findPlanById(id: string): Promise<ProductPlanRecord | null> {
  const rows = await db
    .select()
    .from(productPlans)
    .where(eq(productPlans.id, id))
    .limit(1);
  return rows[0] ? toPlanRecord(rows[0]) : null;
}

async function deletePlan(id: string): Promise<void> {
  await db.delete(productPlans).where(eq(productPlans.id, id));
  log.info({ planId: id }, "Plan deleted");
}

export const productRepository = {
  list,
  findById,
  findBySlug,
  findBySlugWithPlans,
  findByIdWithPlans,
  create,
  update,
  delete: deleteProduct,
  createPlan,
  findDefaultPlan,
  findPlanById,
  deletePlan,
};
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: 0 errors

- [ ] **Step 3: Commit**

```bash
git add src/modules/product/product.repository.ts
git commit -m "feat(product): add repository with CRUD for products and plans"
```

---

## Task 4: Product service + router

**Files:**
- Create: `src/modules/product/product.service.ts`
- Create: `src/modules/product/product.router.ts`
- Create: `src/modules/product/index.ts`

- [ ] **Step 1: Create product service**

```typescript
// src/modules/product/product.service.ts
import { logger } from "@/shared/logger";
import { NotFoundError, BadRequestError } from "@/shared/errors";
import { productRepository } from "./product.repository";
import type {
  ProductRecord,
  ProductWithPlans,
  ProductPlanRecord,
  CreateProductInput,
  UpdateProductInput,
  CreatePlanInput,
} from "./product.types";

const log = logger.child({ module: "product.service" });

async function listProducts(): Promise<ProductRecord[]> {
  return productRepository.list();
}

async function getProduct(id: string): Promise<ProductWithPlans> {
  const product = await productRepository.findByIdWithPlans(id);
  if (!product) throw new NotFoundError("Product", id);
  return product;
}

async function getPublishedProduct(slug: string): Promise<ProductWithPlans> {
  const product = await productRepository.findBySlugWithPlans(slug);
  if (!product || !product.isPublished) {
    throw new NotFoundError("Product", slug);
  }
  return product;
}

async function createProduct(input: CreateProductInput): Promise<ProductRecord> {
  if (input.moduleSlugs.length === 0) {
    throw new BadRequestError("Product must include at least one module");
  }
  return productRepository.create(input);
}

async function updateProduct(
  id: string,
  input: UpdateProductInput
): Promise<ProductRecord> {
  if (input.moduleSlugs && input.moduleSlugs.length === 0) {
    throw new BadRequestError("Product must include at least one module");
  }
  return productRepository.update(id, input);
}

async function deleteProduct(id: string): Promise<void> {
  return productRepository.delete(id);
}

async function createPlan(input: CreatePlanInput): Promise<ProductPlanRecord> {
  return productRepository.createPlan(input);
}

async function getDefaultPlan(productId: string): Promise<ProductPlanRecord> {
  const plan = await productRepository.findDefaultPlan(productId);
  if (!plan) throw new NotFoundError("Default plan for product", productId);
  return plan;
}

async function deletePlan(id: string): Promise<void> {
  return productRepository.deletePlan(id);
}

export const productService = {
  listProducts,
  getProduct,
  getPublishedProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  createPlan,
  getDefaultPlan,
  deletePlan,
};
```

- [ ] **Step 2: Create product router**

```typescript
// src/modules/product/product.router.ts
import { router, platformAdminProcedure, publicProcedure } from "@/shared/trpc";
import { productService } from "./product.service";
import {
  createProductSchema,
  updateProductSchema,
  createPlanSchema,
  productSlugSchema,
} from "./product.schemas";
import { z } from "zod";

export const productRouter = router({
  // Platform admin endpoints
  list: platformAdminProcedure.query(() => productService.listProducts()),

  getById: platformAdminProcedure
    .input(z.object({ id: z.uuid() }))
    .query(({ input }) => productService.getProduct(input.id)),

  create: platformAdminProcedure
    .input(createProductSchema)
    .mutation(({ input }) => productService.createProduct(input)),

  update: platformAdminProcedure
    .input(updateProductSchema)
    .mutation(({ input }) => productService.updateProduct(input.id, input)),

  delete: platformAdminProcedure
    .input(z.object({ id: z.uuid() }))
    .mutation(({ input }) => productService.deleteProduct(input.id)),

  createPlan: platformAdminProcedure
    .input(createPlanSchema)
    .mutation(({ input }) => productService.createPlan(input)),

  deletePlan: platformAdminProcedure
    .input(z.object({ id: z.uuid() }))
    .mutation(({ input }) => productService.deletePlan(input.id)),

  // Public endpoints (for landing pages + signup)
  getPublished: publicProcedure
    .input(productSlugSchema)
    .query(({ input }) => productService.getPublishedProduct(input.slug)),
});
```

- [ ] **Step 3: Create barrel export**

```typescript
// src/modules/product/index.ts
export { productRouter } from "./product.router";
export { productService } from "./product.service";
export * from "./product.types";
export * from "./product.schemas";
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: 0 errors

- [ ] **Step 5: Commit**

```bash
git add src/modules/product/product.service.ts src/modules/product/product.router.ts src/modules/product/index.ts
git commit -m "feat(product): add service, router, and barrel export"
```

---

## Task 5: Product tests

**Files:**
- Create: `src/modules/product/__tests__/product.test.ts`

- [ ] **Step 1: Write product tests**

```typescript
// src/modules/product/__tests__/product.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { productService } from "../product.service";
import { productRepository } from "../product.repository";
import { NotFoundError, BadRequestError, ConflictError } from "@/shared/errors";

vi.mock("@/shared/db", () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([]),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([]),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
  },
}));

vi.mock("@/shared/logger", () => ({
  logger: {
    child: () => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    }),
  },
}));

vi.mock("../product.repository", () => ({
  productRepository: {
    list: vi.fn(),
    findById: vi.fn(),
    findBySlug: vi.fn(),
    findBySlugWithPlans: vi.fn(),
    findByIdWithPlans: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    createPlan: vi.fn(),
    findDefaultPlan: vi.fn(),
    findPlanById: vi.fn(),
    deletePlan: vi.fn(),
  },
}));

const mockProduct = {
  id: "prod-001",
  slug: "ironbook",
  name: "IronBook",
  tagline: "Scheduling for mobile health",
  description: "Full scheduling platform",
  logoUrl: null,
  domain: null,
  moduleSlugs: ["booking", "customer", "scheduling"],
  isPublished: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockPlan = {
  id: "plan-001",
  productId: "prod-001",
  slug: "starter",
  name: "Starter",
  priceMonthly: 2900,
  priceYearly: null,
  trialDays: 14,
  stripePriceId: "price_test123",
  features: ["Unlimited bookings"],
  isDefault: true,
  createdAt: new Date(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("productService", () => {
  describe("listProducts", () => {
    it("returns all products", async () => {
      vi.mocked(productRepository.list).mockResolvedValue([mockProduct]);
      const result = await productService.listProducts();
      expect(result).toEqual([mockProduct]);
    });
  });

  describe("getProduct", () => {
    it("returns product with plans", async () => {
      vi.mocked(productRepository.findByIdWithPlans).mockResolvedValue({
        ...mockProduct,
        plans: [mockPlan],
      });
      const result = await productService.getProduct("prod-001");
      expect(result.plans).toHaveLength(1);
    });

    it("throws NotFoundError for missing product", async () => {
      vi.mocked(productRepository.findByIdWithPlans).mockResolvedValue(null);
      await expect(productService.getProduct("missing")).rejects.toThrow(NotFoundError);
    });
  });

  describe("getPublishedProduct", () => {
    it("returns published product by slug", async () => {
      vi.mocked(productRepository.findBySlugWithPlans).mockResolvedValue({
        ...mockProduct,
        plans: [mockPlan],
      });
      const result = await productService.getPublishedProduct("ironbook");
      expect(result.slug).toBe("ironbook");
    });

    it("throws NotFoundError for unpublished product", async () => {
      vi.mocked(productRepository.findBySlugWithPlans).mockResolvedValue({
        ...mockProduct,
        isPublished: false,
        plans: [],
      });
      await expect(
        productService.getPublishedProduct("ironbook")
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe("createProduct", () => {
    it("creates product with valid input", async () => {
      vi.mocked(productRepository.create).mockResolvedValue(mockProduct);
      const result = await productService.createProduct({
        slug: "ironbook",
        name: "IronBook",
        tagline: "Scheduling for mobile health",
        moduleSlugs: ["booking", "customer"],
      });
      expect(result.slug).toBe("ironbook");
    });

    it("throws BadRequestError for empty moduleSlugs", async () => {
      await expect(
        productService.createProduct({
          slug: "empty",
          name: "Empty",
          tagline: "No modules",
          moduleSlugs: [],
        })
      ).rejects.toThrow(BadRequestError);
    });
  });

  describe("getDefaultPlan", () => {
    it("returns default plan", async () => {
      vi.mocked(productRepository.findDefaultPlan).mockResolvedValue(mockPlan);
      const result = await productService.getDefaultPlan("prod-001");
      expect(result.isDefault).toBe(true);
    });

    it("throws NotFoundError when no default plan", async () => {
      vi.mocked(productRepository.findDefaultPlan).mockResolvedValue(null);
      await expect(
        productService.getDefaultPlan("prod-001")
      ).rejects.toThrow(NotFoundError);
    });
  });
});
```

- [ ] **Step 2: Run tests**

Run: `npx vitest run src/modules/product/__tests__/product.test.ts`
Expected: all tests PASS

- [ ] **Step 3: Commit**

```bash
git add src/modules/product/__tests__/product.test.ts
git commit -m "test(product): add unit tests for product service"
```

---

## Task 6: Subscription types + schemas + Inngest events

**Files:**
- Create: `src/modules/subscription/subscription.types.ts`
- Create: `src/modules/subscription/subscription.schemas.ts`
- Modify: `src/shared/inngest.ts`

- [ ] **Step 1: Create subscription types**

```typescript
// src/modules/subscription/subscription.types.ts

export type SubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "cancelled"
  | "suspended";

export interface SubscriptionRecord {
  tenantId: string;
  productId: string;
  planId: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  status: SubscriptionStatus;
  trialEndsAt: Date | null;
  currentPeriodEnd: Date | null;
}

export interface CreateCheckoutInput {
  productSlug: string;
  businessName: string;
  email: string;
  successUrl: string;
  cancelUrl: string;
}

export interface CheckoutResult {
  checkoutUrl: string;
  sessionId: string;
}
```

- [ ] **Step 2: Create subscription schemas**

```typescript
// src/modules/subscription/subscription.schemas.ts
import { z } from "zod";

export const createCheckoutSchema = z.object({
  productSlug: z.string().min(1),
  businessName: z.string().min(1).max(200),
  email: z.string().email(),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
});

export const billingPortalSchema = z.object({
  returnUrl: z.string().url(),
});
```

- [ ] **Step 3: Add subscription events to Inngest**

In `src/shared/inngest.ts`, add these events inside the `IronheartEvents` type (after the existing Stripe events):

```typescript
  "subscription/checkout.completed": {
    data: {
      stripeSessionId: string;
      stripeCustomerId: string;
      stripeSubscriptionId: string;
      productSlug: string;
      businessName: string;
      email: string;
      planId: string;
    };
  };
  "subscription/payment.failed": {
    data: {
      stripeSubscriptionId: string;
      tenantId: string;
      stripeCustomerId: string;
    };
  };
  "subscription/cancelled": {
    data: {
      stripeSubscriptionId: string;
      tenantId: string;
    };
  };
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: 0 errors

- [ ] **Step 5: Commit**

```bash
git add src/modules/subscription/subscription.types.ts src/modules/subscription/subscription.schemas.ts src/shared/inngest.ts
git commit -m "feat(subscription): add types, schemas, and Inngest events"
```

---

## Task 7: Subscription service + repository

**Files:**
- Create: `src/modules/subscription/subscription.repository.ts`
- Create: `src/modules/subscription/subscription.service.ts`

- [ ] **Step 1: Create subscription repository**

```typescript
// src/modules/subscription/subscription.repository.ts
import { db } from "@/shared/db";
import { logger } from "@/shared/logger";
import { tenants } from "@/shared/db/schemas/tenant.schema";
import { eq } from "drizzle-orm";

const log = logger.child({ module: "subscription.repository" });

async function findTenantByStripeSubscriptionId(
  subscriptionId: string
): Promise<{ id: string; productId: string | null } | null> {
  const rows = await db
    .select({ id: tenants.id, productId: tenants.productId })
    .from(tenants)
    .where(eq(tenants.subscriptionId, subscriptionId))
    .limit(1);
  return rows[0] ?? null;
}

async function findTenantByStripeCustomerId(
  customerId: string
): Promise<{ id: string; productId: string | null } | null> {
  const rows = await db
    .select({ id: tenants.id, productId: tenants.productId })
    .from(tenants)
    .where(eq(tenants.stripeCustomerId, customerId))
    .limit(1);
  return rows[0] ?? null;
}

async function updateTenantSubscription(
  tenantId: string,
  fields: {
    stripeCustomerId?: string;
    subscriptionId?: string;
    status?: string;
    productId?: string;
    planId?: string;
  }
): Promise<void> {
  const updateFields: Record<string, unknown> = { updatedAt: new Date() };
  if (fields.stripeCustomerId !== undefined)
    updateFields.stripeCustomerId = fields.stripeCustomerId;
  if (fields.subscriptionId !== undefined)
    updateFields.subscriptionId = fields.subscriptionId;
  if (fields.status !== undefined) updateFields.status = fields.status;
  if (fields.productId !== undefined) updateFields.productId = fields.productId;
  if (fields.planId !== undefined) updateFields.planId = fields.planId;

  await db.update(tenants).set(updateFields).where(eq(tenants.id, tenantId));
  log.info({ tenantId, fields }, "Tenant subscription updated");
}

export const subscriptionRepository = {
  findTenantByStripeSubscriptionId,
  findTenantByStripeCustomerId,
  updateTenantSubscription,
};
```

- [ ] **Step 2: Create subscription service**

```typescript
// src/modules/subscription/subscription.service.ts
import { logger } from "@/shared/logger";
import { NotFoundError, BadRequestError } from "@/shared/errors";
import { getStripe } from "@/modules/payment/providers/stripe.provider";
import { productRepository } from "@/modules/product/product.repository";
import { subscriptionRepository } from "./subscription.repository";
import { inngest } from "@/shared/inngest";
import type { CreateCheckoutInput, CheckoutResult } from "./subscription.types";

const log = logger.child({ module: "subscription.service" });

async function createCheckoutSession(
  input: CreateCheckoutInput
): Promise<CheckoutResult> {
  const product = await productRepository.findBySlugWithPlans(input.productSlug);
  if (!product || !product.isPublished) {
    throw new NotFoundError("Product", input.productSlug);
  }

  const plan = product.plans.find((p) => p.isDefault);
  if (!plan) {
    throw new BadRequestError(`No default plan for product '${input.productSlug}'`);
  }

  const stripe = getStripe();

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: plan.stripePriceId, quantity: 1 }],
    subscription_data: {
      trial_period_days: plan.trialDays > 0 ? plan.trialDays : undefined,
      metadata: {
        productSlug: input.productSlug,
        businessName: input.businessName,
        planId: plan.id,
      },
    },
    customer_email: input.email,
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    metadata: {
      productSlug: input.productSlug,
      businessName: input.businessName,
      email: input.email,
      planId: plan.id,
    },
  });

  log.info(
    { sessionId: session.id, productSlug: input.productSlug },
    "Checkout session created"
  );

  return {
    checkoutUrl: session.url!,
    sessionId: session.id,
  };
}

async function createBillingPortalSession(
  tenantId: string,
  stripeCustomerId: string,
  returnUrl: string
): Promise<string> {
  const stripe = getStripe();

  const session = await stripe.billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: returnUrl,
  });

  log.info({ tenantId }, "Billing portal session created");
  return session.url;
}

async function handleCheckoutCompleted(data: {
  stripeSessionId: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  productSlug: string;
  businessName: string;
  email: string;
  planId: string;
}): Promise<void> {
  log.info(
    { productSlug: data.productSlug, email: data.email },
    "Processing checkout completion"
  );

  // Import platform service lazily to avoid circular deps
  const { platformService } = await import(
    "@/modules/platform/platform.service"
  );

  const product = await productRepository.findBySlug(data.productSlug);
  if (!product) {
    log.error({ productSlug: data.productSlug }, "Product not found during checkout");
    return;
  }

  // Provision tenant with product modules
  const tenant = await platformService.provisionTenant({
    businessName: data.businessName,
    email: data.email,
    plan: "STARTER",
    moduleSlugs: product.moduleSlugs,
  });

  // Link Stripe IDs and product to tenant
  await subscriptionRepository.updateTenantSubscription(tenant.id, {
    stripeCustomerId: data.stripeCustomerId,
    subscriptionId: data.stripeSubscriptionId,
    productId: product.id,
    planId: data.planId,
  });

  log.info(
    { tenantId: tenant.id, productSlug: data.productSlug },
    "Tenant provisioned from checkout"
  );
}

async function handlePaymentFailed(data: {
  stripeSubscriptionId: string;
  tenantId: string;
}): Promise<void> {
  log.warn({ tenantId: data.tenantId }, "Subscription payment failed");
  // Mark tenant as past_due — don't suspend yet (Stripe retries)
  // Could send dunning email via notification module here
}

async function handleSubscriptionCancelled(data: {
  stripeSubscriptionId: string;
  tenantId: string;
}): Promise<void> {
  await subscriptionRepository.updateTenantSubscription(data.tenantId, {
    status: "SUSPENDED",
  });
  log.info({ tenantId: data.tenantId }, "Tenant suspended after subscription cancellation");
}

export const subscriptionService = {
  createCheckoutSession,
  createBillingPortalSession,
  handleCheckoutCompleted,
  handlePaymentFailed,
  handleSubscriptionCancelled,
};
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: 0 errors

- [ ] **Step 4: Commit**

```bash
git add src/modules/subscription/subscription.repository.ts src/modules/subscription/subscription.service.ts
git commit -m "feat(subscription): add repository and service with Stripe checkout + webhook handling"
```

---

## Task 8: Subscription router + events + barrel export

**Files:**
- Create: `src/modules/subscription/subscription.router.ts`
- Create: `src/modules/subscription/subscription.events.ts`
- Create: `src/modules/subscription/index.ts`

- [ ] **Step 1: Create subscription router**

```typescript
// src/modules/subscription/subscription.router.ts
import {
  router,
  publicProcedure,
  tenantProcedure,
  platformAdminProcedure,
} from "@/shared/trpc";
import { subscriptionService } from "./subscription.service";
import { createCheckoutSchema, billingPortalSchema } from "./subscription.schemas";

export const subscriptionRouter = router({
  // Public: create checkout session from signup page
  createCheckout: publicProcedure
    .input(createCheckoutSchema)
    .mutation(({ input }) => subscriptionService.createCheckoutSession(input)),

  // Tenant: get billing portal URL
  billingPortal: tenantProcedure
    .input(billingPortalSchema)
    .mutation(async ({ ctx, input }) => {
      const { db } = await import("@/shared/db");
      const { tenants } = await import("@/shared/db/schemas/tenant.schema");
      const { eq } = await import("drizzle-orm");

      const [tenant] = await db
        .select({ stripeCustomerId: tenants.stripeCustomerId })
        .from(tenants)
        .where(eq(tenants.id, ctx.tenantId))
        .limit(1);

      if (!tenant?.stripeCustomerId) {
        throw new Error("No Stripe customer linked to this tenant");
      }

      const url = await subscriptionService.createBillingPortalSession(
        ctx.tenantId,
        tenant.stripeCustomerId,
        input.returnUrl
      );
      return { url };
    }),
});
```

- [ ] **Step 2: Create subscription events (Inngest handlers)**

```typescript
// src/modules/subscription/subscription.events.ts
import { inngest } from "@/shared/inngest";
import { subscriptionService } from "./subscription.service";
import { logger } from "@/shared/logger";

const log = logger.child({ module: "subscription.events" });

export const handleCheckoutCompleted = inngest.createFunction(
  { id: "subscription-checkout-completed" },
  { event: "subscription/checkout.completed" },
  async ({ event, step }) => {
    await step.run("provision-tenant", async () => {
      await subscriptionService.handleCheckoutCompleted(event.data);
    });
    log.info({ email: event.data.email }, "Checkout completed handler finished");
  }
);

export const handlePaymentFailed = inngest.createFunction(
  { id: "subscription-payment-failed" },
  { event: "subscription/payment.failed" },
  async ({ event, step }) => {
    await step.run("handle-failed-payment", async () => {
      await subscriptionService.handlePaymentFailed(event.data);
    });
  }
);

export const handleSubscriptionCancelled = inngest.createFunction(
  { id: "subscription-cancelled" },
  { event: "subscription/cancelled" },
  async ({ event, step }) => {
    await step.run("suspend-tenant", async () => {
      await subscriptionService.handleSubscriptionCancelled(event.data);
    });
  }
);

export const subscriptionFunctions = [
  handleCheckoutCompleted,
  handlePaymentFailed,
  handleSubscriptionCancelled,
];
```

- [ ] **Step 3: Create barrel export**

```typescript
// src/modules/subscription/index.ts
export { subscriptionRouter } from "./subscription.router";
export { subscriptionFunctions } from "./subscription.events";
export * from "./subscription.types";
export * from "./subscription.schemas";
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: 0 errors

- [ ] **Step 5: Commit**

```bash
git add src/modules/subscription/subscription.router.ts src/modules/subscription/subscription.events.ts src/modules/subscription/index.ts
git commit -m "feat(subscription): add router, Inngest event handlers, and barrel export"
```

---

## Task 9: Subscription tests

**Files:**
- Create: `src/modules/subscription/__tests__/subscription.test.ts`

- [ ] **Step 1: Write subscription tests**

```typescript
// src/modules/subscription/__tests__/subscription.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { subscriptionService } from "../subscription.service";
import { productRepository } from "@/modules/product/product.repository";
import { subscriptionRepository } from "../subscription.repository";
import { NotFoundError, BadRequestError } from "@/shared/errors";

vi.mock("@/shared/db", () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([]),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
  },
}));

vi.mock("@/shared/logger", () => ({
  logger: {
    child: () => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    }),
  },
}));

vi.mock("@/shared/inngest", () => ({
  inngest: { send: vi.fn().mockResolvedValue(undefined) },
}));

const mockCheckoutSession = {
  id: "cs_test_123",
  url: "https://checkout.stripe.com/test",
};

vi.mock("@/modules/payment/providers/stripe.provider", () => ({
  getStripe: () => ({
    checkout: {
      sessions: {
        create: vi.fn().mockResolvedValue(mockCheckoutSession),
      },
    },
    billingPortal: {
      sessions: {
        create: vi.fn().mockResolvedValue({ url: "https://billing.stripe.com/test" }),
      },
    },
  }),
}));

vi.mock("@/modules/product/product.repository", () => ({
  productRepository: {
    findBySlugWithPlans: vi.fn(),
    findBySlug: vi.fn(),
  },
}));

vi.mock("../subscription.repository", () => ({
  subscriptionRepository: {
    findTenantByStripeSubscriptionId: vi.fn(),
    findTenantByStripeCustomerId: vi.fn(),
    updateTenantSubscription: vi.fn(),
  },
}));

const mockProduct = {
  id: "prod-001",
  slug: "ironbook",
  name: "IronBook",
  tagline: "Scheduling",
  description: "",
  logoUrl: null,
  domain: null,
  moduleSlugs: ["booking", "customer"],
  isPublished: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  plans: [
    {
      id: "plan-001",
      productId: "prod-001",
      slug: "starter",
      name: "Starter",
      priceMonthly: 2900,
      priceYearly: null,
      trialDays: 14,
      stripePriceId: "price_test123",
      features: [],
      isDefault: true,
      createdAt: new Date(),
    },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("subscriptionService", () => {
  describe("createCheckoutSession", () => {
    it("creates Stripe checkout for published product", async () => {
      vi.mocked(productRepository.findBySlugWithPlans).mockResolvedValue(
        mockProduct
      );

      const result = await subscriptionService.createCheckoutSession({
        productSlug: "ironbook",
        businessName: "Test Clinic",
        email: "test@example.com",
        successUrl: "https://example.com/success",
        cancelUrl: "https://example.com/cancel",
      });

      expect(result.checkoutUrl).toBe("https://checkout.stripe.com/test");
      expect(result.sessionId).toBe("cs_test_123");
    });

    it("throws NotFoundError for unpublished product", async () => {
      vi.mocked(productRepository.findBySlugWithPlans).mockResolvedValue({
        ...mockProduct,
        isPublished: false,
      });

      await expect(
        subscriptionService.createCheckoutSession({
          productSlug: "ironbook",
          businessName: "Test",
          email: "test@example.com",
          successUrl: "https://example.com/success",
          cancelUrl: "https://example.com/cancel",
        })
      ).rejects.toThrow(NotFoundError);
    });

    it("throws BadRequestError when no default plan exists", async () => {
      vi.mocked(productRepository.findBySlugWithPlans).mockResolvedValue({
        ...mockProduct,
        plans: [],
      });

      await expect(
        subscriptionService.createCheckoutSession({
          productSlug: "ironbook",
          businessName: "Test",
          email: "test@example.com",
          successUrl: "https://example.com/success",
          cancelUrl: "https://example.com/cancel",
        })
      ).rejects.toThrow(BadRequestError);
    });
  });
});
```

- [ ] **Step 2: Run tests**

Run: `npx vitest run src/modules/subscription/__tests__/subscription.test.ts`
Expected: all tests PASS

- [ ] **Step 3: Commit**

```bash
git add src/modules/subscription/__tests__/subscription.test.ts
git commit -m "test(subscription): add unit tests for checkout session creation"
```

---

## Task 10: Wire routers + expand Stripe webhook

**Files:**
- Modify: `src/server/root.ts`
- Modify: `src/app/api/webhooks/stripe/route.ts`

- [ ] **Step 1: Add product and subscription routers to root**

In `src/server/root.ts`, add imports:

```typescript
import { productRouter } from "@/modules/product";
import { subscriptionRouter } from "@/modules/subscription";
```

And add to the router object:

```typescript
product: productRouter,
subscription: subscriptionRouter,
```

- [ ] **Step 2: Expand Stripe webhook to route subscription events**

Replace the full content of `src/app/api/webhooks/stripe/route.ts`:

```typescript
import { type NextRequest, NextResponse } from 'next/server'
import { inngest } from '@/shared/inngest'

export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const sig = req.headers.get('stripe-signature')

  if (!sig) {
    return NextResponse.json({ error: 'Missing Stripe-Signature header' }, { status: 400 })
  }

  let event: { type: string; id: string; data: { object: Record<string, unknown> } }

  try {
    const { constructStripeEvent } = await import('@/modules/payment/providers/stripe.provider')
    event = await constructStripeEvent(
      rawBody,
      sig,
      process.env['STRIPE_WEBHOOK_SECRET'] ?? ''
    ) as typeof event
  } catch {
    return NextResponse.json(
      { error: 'Invalid webhook signature' },
      { status: 400 }
    )
  }

  const obj = event.data.object

  // Route subscription-related events to subscription module
  if (event.type === 'checkout.session.completed' && obj['mode'] === 'subscription') {
    const metadata = (obj['metadata'] ?? {}) as Record<string, string>
    const subscription = obj['subscription'] as string | undefined
    const customer = obj['customer'] as string | undefined

    if (metadata['productSlug'] && subscription && customer) {
      await inngest.send({
        name: 'subscription/checkout.completed',
        data: {
          stripeSessionId: event.id,
          stripeCustomerId: customer,
          stripeSubscriptionId: subscription,
          productSlug: metadata['productSlug'],
          businessName: metadata['businessName'] ?? '',
          email: metadata['email'] ?? '',
          planId: metadata['planId'] ?? '',
        },
      })
      return NextResponse.json({ received: true })
    }
  }

  if (event.type === 'invoice.payment_failed') {
    const subscription = obj['subscription'] as string | undefined
    const customer = obj['customer'] as string | undefined
    if (subscription && customer) {
      await inngest.send({
        name: 'subscription/payment.failed',
        data: {
          stripeSubscriptionId: subscription,
          tenantId: '', // Resolved in handler
          stripeCustomerId: customer,
        },
      })
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    const subscriptionId = obj['id'] as string | undefined
    if (subscriptionId) {
      await inngest.send({
        name: 'subscription/cancelled',
        data: {
          stripeSubscriptionId: subscriptionId,
          tenantId: '', // Resolved in handler
        },
      })
    }
  }

  // Fallback: bridge all other events to existing payment handler
  await inngest.send({
    name: 'stripe/webhook.received',
    data: {
      eventType: event.type,
      stripeEventId: event.id,
      payload: obj,
    },
  })

  return NextResponse.json({ received: true })
}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: 0 errors

- [ ] **Step 4: Run full test suite**

Run: `npx vitest run`
Expected: all 224+ tests PASS (no regressions)

- [ ] **Step 5: Commit**

```bash
git add src/server/root.ts src/app/api/webhooks/stripe/route.ts
git commit -m "feat: wire product + subscription routers and expand Stripe webhook routing"
```

---

## Task 11: Product-aware tenant provisioning

**Files:**
- Modify: `src/modules/platform/platform.service.ts`

- [ ] **Step 1: Update provisionTenant to accept moduleSlugs parameter**

In `src/modules/platform/platform.service.ts`, modify the `provisionTenant` method signature and the module enablement section.

The `createTenantSchema` input should already support the fields. The key change is in the module enablement section (around line 126). Replace the `defaultSlugs: string[] = []` line with:

```typescript
const defaultSlugs: string[] = input.moduleSlugs ?? [];
```

This means when `subscriptionService.handleCheckoutCompleted` calls `provisionTenant({ ..., moduleSlugs: product.moduleSlugs })`, the product's modules get enabled automatically.

Also need to add `moduleSlugs` to the platform schemas. In `src/modules/platform/platform.schemas.ts`, add to `createTenantSchema`:

```typescript
moduleSlugs: z.array(z.string()).optional(),
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: 0 errors

- [ ] **Step 3: Run full test suite**

Run: `npx vitest run`
Expected: all tests PASS

- [ ] **Step 4: Commit**

```bash
git add src/modules/platform/platform.service.ts src/modules/platform/platform.schemas.ts
git commit -m "feat(platform): product-aware tenant provisioning with moduleSlugs parameter"
```

---

## Task 12: Platform sidebar expansion

**Files:**
- Modify: `src/components/platform/platform-sidebar.tsx`

- [ ] **Step 1: Expand sidebar nav items**

Replace the `NAV_ITEMS` array in `src/components/platform/platform-sidebar.tsx`:

```typescript
import {
  Building2,
  BarChart3,
  Users,
  Settings,
  ChevronLeft,
  Shield,
  Package,
  CreditCard,
  TrendingUp,
  FileText,
} from "lucide-react"

interface NavSection {
  title: string
  items: NavItem[]
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: "Products",
    items: [
      { title: "All Products", href: "/platform/products", icon: Package },
    ],
  },
  {
    title: "Customers",
    items: [
      { title: "Tenants", href: "/platform/tenants", icon: Building2 },
    ],
  },
  {
    title: "Revenue",
    items: [
      { title: "Subscriptions", href: "/platform/subscriptions", icon: CreditCard },
      { title: "Revenue", href: "/platform/revenue", icon: TrendingUp },
    ],
  },
  {
    title: "Operations",
    items: [
      { title: "Analytics", href: "/platform/analytics", icon: BarChart3 },
      { title: "Audit Log", href: "/platform/audit", icon: FileText },
      { title: "Settings", href: "/platform/settings", icon: Settings },
    ],
  },
]
```

Then update the `<nav>` render to iterate `NAV_SECTIONS` instead of flat `NAV_ITEMS`:

```tsx
<nav className="space-y-6">
  {NAV_SECTIONS.map((section) => (
    <div key={section.title}>
      <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
        {section.title}
      </p>
      <div className="space-y-1">
        {section.items.map((item) => {
          const Icon = item.icon
          const isActive =
            pathname === item.href ||
            pathname.startsWith(item.href + "/")
          return (
            <Link key={item.href} href={item.href}>
              <Button
                variant="ghost"
                className={cn(
                  "w-full justify-start gap-3 text-zinc-400 hover:bg-zinc-800 hover:text-white",
                  isActive && "bg-zinc-800 text-white"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.title}
              </Button>
            </Link>
          )
        })}
      </div>
    </div>
  ))}
</nav>
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: 0 errors

- [ ] **Step 3: Commit**

```bash
git add src/components/platform/platform-sidebar.tsx
git commit -m "feat(platform): expand sidebar with Products, Revenue, Operations sections"
```

---

## Task 13: Platform dashboard page

**Files:**
- Modify: `src/app/platform/page.tsx`

- [ ] **Step 1: Replace redirect with real dashboard**

Replace `src/app/platform/page.tsx`:

```typescript
import { db } from "@/shared/db"
import { tenants } from "@/shared/db/schemas/tenant.schema"
import { products } from "@/shared/db/schemas/product.schema"
import { eq, count, and, gte, isNull } from "drizzle-orm"
import { sql } from "drizzle-orm"

async function getDashboardData() {
  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  const [totalTenants] = await db
    .select({ count: count() })
    .from(tenants)
    .where(and(eq(tenants.status, "ACTIVE"), isNull(tenants.deletedAt)))

  const [newTenants] = await db
    .select({ count: count() })
    .from(tenants)
    .where(
      and(
        eq(tenants.status, "ACTIVE"),
        gte(tenants.createdAt, thirtyDaysAgo),
        isNull(tenants.deletedAt)
      )
    )

  const [trialTenants] = await db
    .select({ count: count() })
    .from(tenants)
    .where(and(eq(tenants.status, "TRIAL"), isNull(tenants.deletedAt)))

  const productList = await db.select().from(products).orderBy(products.name)

  // Count tenants per product
  const productStats = await Promise.all(
    productList.map(async (product) => {
      const [tenantCount] = await db
        .select({ count: count() })
        .from(tenants)
        .where(
          and(
            eq(tenants.productId, product.id),
            isNull(tenants.deletedAt)
          )
        )
      return {
        id: product.id,
        slug: product.slug,
        name: product.name,
        isPublished: product.isPublished,
        tenantCount: tenantCount?.count ?? 0,
      }
    })
  )

  return {
    totalTenants: totalTenants?.count ?? 0,
    newTenants: newTenants?.count ?? 0,
    trialTenants: trialTenants?.count ?? 0,
    products: productStats,
  }
}

export default async function PlatformDashboardPage() {
  const data = await getDashboardData()

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          {new Date().toLocaleDateString("en-GB", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-lg border bg-card p-6">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Active Tenants
          </p>
          <p className="mt-2 text-3xl font-bold">{data.totalTenants}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            +{data.newTenants} this month
          </p>
        </div>
        <div className="rounded-lg border bg-card p-6">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Trials Active
          </p>
          <p className="mt-2 text-3xl font-bold">{data.trialTenants}</p>
        </div>
        <div className="rounded-lg border bg-card p-6">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Products
          </p>
          <p className="mt-2 text-3xl font-bold">{data.products.length}</p>
        </div>
      </div>

      {/* Products */}
      <div className="rounded-lg border bg-card">
        <div className="p-4 border-b">
          <h2 className="text-sm font-semibold">Products</h2>
        </div>
        <div className="divide-y">
          {data.products.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No products yet. Create one from the Products page.
            </div>
          ) : (
            data.products.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium">{p.name}</span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full ${
                      p.isPublished
                        ? "bg-green-500/10 text-green-500"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {p.isPublished ? "Live" : "Draft"}
                  </span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {p.tenantCount} tenants
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: 0 errors

- [ ] **Step 3: Commit**

```bash
git add src/app/platform/page.tsx
git commit -m "feat(platform): replace redirect with real dashboard showing KPIs and product breakdown"
```

---

## Task 14: Platform product pages

**Files:**
- Create: `src/app/platform/products/page.tsx`
- Create: `src/app/platform/products/new/page.tsx`
- Create: `src/app/platform/products/[id]/page.tsx`
- Create: `src/components/platform/product-form.tsx`

- [ ] **Step 1: Create product list page**

```typescript
// src/app/platform/products/page.tsx
import Link from "next/link"
import { db } from "@/shared/db"
import { products } from "@/shared/db/schemas/product.schema"
import { tenants } from "@/shared/db/schemas/tenant.schema"
import { eq, count, isNull, and } from "drizzle-orm"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"

export default async function ProductsPage() {
  const productList = await db.select().from(products).orderBy(products.name)

  const productsWithCounts = await Promise.all(
    productList.map(async (product) => {
      const [tenantCount] = await db
        .select({ count: count() })
        .from(tenants)
        .where(and(eq(tenants.productId, product.id), isNull(tenants.deletedAt)))
      return { ...product, tenantCount: tenantCount?.count ?? 0 }
    })
  )

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Products</h1>
        <Link href="/platform/products/new">
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            New Product
          </Button>
        </Link>
      </div>

      <div className="rounded-lg border bg-card divide-y">
        {productsWithCounts.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">
            No products yet. Create your first product to start selling.
          </div>
        ) : (
          productsWithCounts.map((product) => (
            <Link
              key={product.id}
              href={`/platform/products/${product.id}`}
              className="flex items-center justify-between px-6 py-4 hover:bg-muted/50 transition-colors"
            >
              <div>
                <p className="font-medium">{product.name}</p>
                <p className="text-sm text-muted-foreground">
                  {product.tagline}
                </p>
                <div className="flex gap-2 mt-1">
                  {(product.moduleSlugs ?? []).map((slug) => (
                    <span
                      key={slug}
                      className="text-[10px] px-2 py-0.5 rounded bg-muted text-muted-foreground"
                    >
                      {slug}
                    </span>
                  ))}
                </div>
              </div>
              <div className="text-right">
                <span
                  className={`text-xs px-2 py-1 rounded-full ${
                    product.isPublished
                      ? "bg-green-500/10 text-green-500"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {product.isPublished ? "Live" : "Draft"}
                </span>
                <p className="text-sm text-muted-foreground mt-1">
                  {product.tenantCount} tenants
                </p>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create product form component**

```typescript
// src/components/platform/product-form.tsx
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { api } from "@/lib/trpc/react"
import { toast } from "sonner"

const AVAILABLE_MODULES = [
  "booking", "scheduling", "customer", "team", "forms",
  "review", "workflow", "payment", "analytics", "notification",
  "calendar-sync", "pipeline", "outreach", "ai", "developer",
]

interface ProductFormProps {
  initialData?: {
    id: string
    slug: string
    name: string
    tagline: string
    description: string
    domain: string | null
    moduleSlugs: string[]
    isPublished: boolean
  }
}

export function ProductForm({ initialData }: ProductFormProps) {
  const router = useRouter()
  const isEditing = !!initialData

  const [slug, setSlug] = useState(initialData?.slug ?? "")
  const [name, setName] = useState(initialData?.name ?? "")
  const [tagline, setTagline] = useState(initialData?.tagline ?? "")
  const [description, setDescription] = useState(initialData?.description ?? "")
  const [domain, setDomain] = useState(initialData?.domain ?? "")
  const [moduleSlugs, setModuleSlugs] = useState<string[]>(
    initialData?.moduleSlugs ?? []
  )
  const [isPublished, setIsPublished] = useState(
    initialData?.isPublished ?? false
  )

  const createMutation = api.product.create.useMutation({
    onSuccess: () => {
      toast.success("Product created")
      router.push("/platform/products")
      router.refresh()
    },
    onError: (err) => toast.error(err.message),
  })

  const updateMutation = api.product.update.useMutation({
    onSuccess: () => {
      toast.success("Product updated")
      router.refresh()
    },
    onError: (err) => toast.error(err.message),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const data = {
      slug,
      name,
      tagline,
      description: description || undefined,
      domain: domain || undefined,
      moduleSlugs,
      isPublished,
    }

    if (isEditing) {
      updateMutation.mutate({ id: initialData.id, ...data })
    } else {
      createMutation.mutate(data)
    }
  }

  const toggleModule = (mod: string) => {
    setModuleSlugs((prev) =>
      prev.includes(mod) ? prev.filter((m) => m !== mod) : [...prev, mod]
    )
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      <div className="space-y-2">
        <Label htmlFor="slug">Slug</Label>
        <Input
          id="slug"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          placeholder="ironbook"
          disabled={isEditing}
          pattern="[a-z0-9-]+"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="IronBook"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="tagline">Tagline</Label>
        <Input
          id="tagline"
          value={tagline}
          onChange={(e) => setTagline(e.target.value)}
          placeholder="Scheduling for mobile health providers"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Longer product description..."
          rows={4}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="domain">Custom Domain (optional)</Label>
        <Input
          id="domain"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          placeholder="ironbook.io"
        />
      </div>

      <div className="space-y-2">
        <Label>Modules</Label>
        <div className="grid grid-cols-3 gap-2">
          {AVAILABLE_MODULES.map((mod) => (
            <button
              key={mod}
              type="button"
              onClick={() => toggleModule(mod)}
              className={`px-3 py-2 text-sm rounded border transition-colors ${
                moduleSlugs.includes(mod)
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/50"
              }`}
            >
              {mod}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Switch
          checked={isPublished}
          onCheckedChange={setIsPublished}
          id="published"
        />
        <Label htmlFor="published">Published (visible on landing page)</Label>
      </div>

      <Button type="submit" disabled={isPending || moduleSlugs.length === 0}>
        {isPending
          ? "Saving..."
          : isEditing
            ? "Update Product"
            : "Create Product"}
      </Button>
    </form>
  )
}
```

- [ ] **Step 3: Create new product page**

```typescript
// src/app/platform/products/new/page.tsx
import { ProductForm } from "@/components/platform/product-form"

export default function NewProductPage() {
  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-semibold">Create Product</h1>
      <ProductForm />
    </div>
  )
}
```

- [ ] **Step 4: Create product detail page**

```typescript
// src/app/platform/products/[id]/page.tsx
import { notFound } from "next/navigation"
import { db } from "@/shared/db"
import { products, productPlans } from "@/shared/db/schemas/product.schema"
import { eq } from "drizzle-orm"
import { ProductForm } from "@/components/platform/product-form"

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

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-semibold">{product.name}</h1>
      <ProductForm
        initialData={{
          id: product.id,
          slug: product.slug,
          name: product.name,
          tagline: product.tagline,
          description: product.description,
          domain: product.domain,
          moduleSlugs: product.moduleSlugs ?? [],
          isPublished: product.isPublished,
        }}
      />

      {/* Plans section */}
      <div className="border-t pt-6 mt-8">
        <h2 className="text-lg font-semibold mb-4">Plans</h2>
        {plans.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No plans configured. Add a plan with a Stripe Price ID to enable signups.
          </p>
        ) : (
          <div className="space-y-2">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className="flex items-center justify-between rounded-lg border px-4 py-3"
              >
                <div>
                  <p className="font-medium">{plan.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {plan.stripePriceId}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium">
                    £{(plan.priceMonthly / 100).toFixed(2)}/mo
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {plan.trialDays}d trial
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: 0 errors

- [ ] **Step 6: Commit**

```bash
git add src/app/platform/products/ src/components/platform/product-form.tsx
git commit -m "feat(platform): add product list, create, and detail pages with form component"
```

---

## Task 15: Public landing page + signup flow

**Files:**
- Create: `src/app/products/[productSlug]/page.tsx`
- Create: `src/app/signup/[productSlug]/page.tsx`
- Create: `src/app/signup/[productSlug]/success/page.tsx`
- Create: `src/components/signup/signup-form.tsx`

- [ ] **Step 1: Create public product landing page**

```typescript
// src/app/products/[productSlug]/page.tsx
import { notFound } from "next/navigation"
import Link from "next/link"
import { db } from "@/shared/db"
import { products, productPlans } from "@/shared/db/schemas/product.schema"
import { eq, and } from "drizzle-orm"

export default async function ProductLandingPage({
  params,
}: {
  params: Promise<{ productSlug: string }>
}) {
  const { productSlug } = await params

  const [product] = await db
    .select()
    .from(products)
    .where(and(eq(products.slug, productSlug), eq(products.isPublished, true)))
    .limit(1)

  if (!product) notFound()

  const plans = await db
    .select()
    .from(productPlans)
    .where(eq(productPlans.productId, product.id))
    .orderBy(productPlans.priceMonthly)

  const defaultPlan = plans.find((p) => p.isDefault) ?? plans[0]

  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <header className="flex items-center justify-between px-8 py-4 border-b border-gray-100">
        <span className="text-lg font-semibold text-gray-900">
          {product.name}
        </span>
        <Link
          href={`/signup/${product.slug}`}
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 transition-colors"
        >
          Start Free Trial
        </Link>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-3xl px-8 py-24 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
          {product.tagline}
        </h1>
        {product.description && (
          <p className="mt-6 text-lg text-gray-600 leading-relaxed">
            {product.description}
          </p>
        )}
        <div className="mt-8 flex items-center justify-center gap-4">
          <Link
            href={`/signup/${product.slug}`}
            className="rounded-lg bg-gray-900 px-6 py-3 text-sm font-medium text-white hover:bg-gray-800 transition-colors"
          >
            Start Free Trial
          </Link>
        </div>
      </section>

      {/* Modules */}
      <section className="mx-auto max-w-4xl px-8 pb-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(product.moduleSlugs ?? []).map((slug) => (
            <div
              key={slug}
              className="rounded-lg border border-gray-200 p-5"
            >
              <p className="font-medium text-gray-900 capitalize">
                {slug.replace(/-/g, " ")}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      {defaultPlan && (
        <section className="border-t border-gray-100 py-16 text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-4">
            Simple pricing
          </p>
          <div className="inline-block rounded-xl border border-gray-200 px-10 py-8">
            <p className="text-4xl font-bold text-gray-900">
              £{(defaultPlan.priceMonthly / 100).toFixed(0)}
              <span className="text-base font-normal text-gray-500">/mo</span>
            </p>
            {defaultPlan.trialDays > 0 && (
              <p className="mt-2 text-sm text-gray-500">
                {defaultPlan.trialDays}-day free trial
              </p>
            )}
            {((defaultPlan.features as string[]) ?? []).length > 0 && (
              <ul className="mt-4 space-y-2 text-left text-sm text-gray-600">
                {((defaultPlan.features as string[]) ?? []).map((f, i) => (
                  <li key={i}>✓ {f}</li>
                ))}
              </ul>
            )}
            <Link
              href={`/signup/${product.slug}`}
              className="mt-6 inline-block rounded-lg bg-gray-900 px-8 py-3 text-sm font-medium text-white hover:bg-gray-800 transition-colors"
            >
              Get Started
            </Link>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="border-t border-gray-100 py-6 text-center">
        <p className="text-xs text-gray-400">
          Powered by <span className="font-medium text-gray-500">Ironheart</span>
        </p>
      </footer>
    </div>
  )
}
```

- [ ] **Step 2: Create signup form component**

```typescript
// src/components/signup/signup-form.tsx
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { api } from "@/lib/trpc/react"

interface SignupFormProps {
  productSlug: string
  productName: string
}

export function SignupForm({ productSlug, productName }: SignupFormProps) {
  const [businessName, setBusinessName] = useState("")
  const [email, setEmail] = useState("")
  const [error, setError] = useState<string | null>(null)

  const checkoutMutation = api.subscription.createCheckout.useMutation({
    onSuccess: (data) => {
      window.location.href = data.checkoutUrl
    },
    onError: (err) => setError(err.message),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const origin = window.location.origin
    checkoutMutation.mutate({
      productSlug,
      businessName,
      email,
      successUrl: `${origin}/signup/${productSlug}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${origin}/products/${productSlug}`,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-sm mx-auto">
      <div className="space-y-2">
        <Label htmlFor="businessName">Business Name</Label>
        <Input
          id="businessName"
          value={businessName}
          onChange={(e) => setBusinessName(e.target.value)}
          placeholder="Your business name"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@business.com"
          required
        />
      </div>

      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}

      <Button
        type="submit"
        className="w-full"
        disabled={checkoutMutation.isPending}
      >
        {checkoutMutation.isPending
          ? "Redirecting to checkout..."
          : `Start Free Trial of ${productName}`}
      </Button>
    </form>
  )
}
```

- [ ] **Step 3: Create signup page**

```typescript
// src/app/signup/[productSlug]/page.tsx
import { notFound } from "next/navigation"
import { db } from "@/shared/db"
import { products } from "@/shared/db/schemas/product.schema"
import { eq, and } from "drizzle-orm"
import { SignupForm } from "@/components/signup/signup-form"

export default async function SignupPage({
  params,
}: {
  params: Promise<{ productSlug: string }>
}) {
  const { productSlug } = await params

  const [product] = await db
    .select()
    .from(products)
    .where(and(eq(products.slug, productSlug), eq(products.isPublished, true)))
    .limit(1)

  if (!product) notFound()

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">
            Get started with {product.name}
          </h1>
          <p className="mt-2 text-sm text-gray-600">{product.tagline}</p>
        </div>
        <SignupForm productSlug={product.slug} productName={product.name} />
        <p className="text-center text-xs text-gray-400">
          Powered by Ironheart
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Create success page**

```typescript
// src/app/signup/[productSlug]/success/page.tsx
import Link from "next/link"

export default function SignupSuccessPage() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="text-center space-y-4 max-w-md">
        <h1 className="text-2xl font-bold text-gray-900">
          You're all set!
        </h1>
        <p className="text-gray-600">
          Your account is being set up. You'll receive an email shortly with your login details.
        </p>
        <Link
          href="/sign-in"
          className="inline-block rounded-lg bg-gray-900 px-6 py-3 text-sm font-medium text-white hover:bg-gray-800 transition-colors"
        >
          Sign In
        </Link>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: 0 errors

- [ ] **Step 6: Commit**

```bash
git add src/app/products/ src/app/signup/ src/components/signup/
git commit -m "feat: add public product landing page, signup form, and checkout flow"
```

---

## Task 16: Platform subscription + revenue pages

**Files:**
- Create: `src/app/platform/subscriptions/page.tsx`
- Create: `src/app/platform/revenue/page.tsx`

- [ ] **Step 1: Create subscriptions page**

```typescript
// src/app/platform/subscriptions/page.tsx
import { db } from "@/shared/db"
import { tenants } from "@/shared/db/schemas/tenant.schema"
import { products } from "@/shared/db/schemas/product.schema"
import { isNotNull, isNull, eq } from "drizzle-orm"

export default async function SubscriptionsPage() {
  const rows = await db
    .select({
      tenantId: tenants.id,
      tenantName: tenants.name,
      status: tenants.status,
      subscriptionId: tenants.subscriptionId,
      stripeCustomerId: tenants.stripeCustomerId,
      productId: tenants.productId,
      createdAt: tenants.createdAt,
      trialEndsAt: tenants.trialEndsAt,
    })
    .from(tenants)
    .where(isNotNull(tenants.subscriptionId))
    .orderBy(tenants.createdAt)

  // Get product names for display
  const productIds = [...new Set(rows.map((r) => r.productId).filter(Boolean))] as string[]
  const productRows =
    productIds.length > 0
      ? await db.select().from(products)
      : []
  const productMap = new Map(productRows.map((p) => [p.id, p.name]))

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-semibold">Subscriptions</h1>

      <div className="rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="px-4 py-3 font-medium">Tenant</th>
              <th className="px-4 py-3 font-medium">Product</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Subscription ID</th>
              <th className="px-4 py-3 font-medium">Since</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  No subscriptions yet.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.tenantId}>
                  <td className="px-4 py-3 font-medium">{row.tenantName}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {row.productId ? productMap.get(row.productId) ?? "—" : "Custom"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        row.status === "ACTIVE"
                          ? "bg-green-500/10 text-green-500"
                          : row.status === "TRIAL"
                            ? "bg-amber-500/10 text-amber-500"
                            : "bg-red-500/10 text-red-500"
                      }`}
                    >
                      {row.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground font-mono text-xs">
                    {row.subscriptionId ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {row.createdAt.toLocaleDateString("en-GB")}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create revenue page**

```typescript
// src/app/platform/revenue/page.tsx
import { db } from "@/shared/db"
import { tenants } from "@/shared/db/schemas/tenant.schema"
import { products } from "@/shared/db/schemas/product.schema"
import { productPlans } from "@/shared/db/schemas/product.schema"
import { eq, and, isNull, isNotNull, count } from "drizzle-orm"

export default async function RevenuePage() {
  // Count tenants with active subscriptions per product
  const productList = await db.select().from(products).orderBy(products.name)

  const revenueByProduct = await Promise.all(
    productList.map(async (product) => {
      const [activeCount] = await db
        .select({ count: count() })
        .from(tenants)
        .where(
          and(
            eq(tenants.productId, product.id),
            isNotNull(tenants.subscriptionId),
            isNull(tenants.deletedAt)
          )
        )

      const plans = await db
        .select()
        .from(productPlans)
        .where(eq(productPlans.productId, product.id))

      const defaultPlan = plans.find((p) => p.isDefault) ?? plans[0]
      const pricePerMonth = defaultPlan?.priceMonthly ?? 0
      const subscriberCount = activeCount?.count ?? 0
      const mrr = (subscriberCount * pricePerMonth) / 100

      return {
        name: product.name,
        slug: product.slug,
        subscribers: subscriberCount,
        pricePerMonth: pricePerMonth / 100,
        mrr,
      }
    })
  )

  const totalMrr = revenueByProduct.reduce((sum, p) => sum + p.mrr, 0)
  const totalSubscribers = revenueByProduct.reduce(
    (sum, p) => sum + p.subscribers,
    0
  )

  return (
    <div className="p-8 space-y-8">
      <h1 className="text-2xl font-semibold">Revenue</h1>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-lg border bg-card p-6">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            MRR
          </p>
          <p className="mt-2 text-3xl font-bold">
            £{totalMrr.toLocaleString("en-GB", { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-6">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            ARR
          </p>
          <p className="mt-2 text-3xl font-bold">
            £{(totalMrr * 12).toLocaleString("en-GB", { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-6">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Total Subscribers
          </p>
          <p className="mt-2 text-3xl font-bold">{totalSubscribers}</p>
        </div>
      </div>

      {/* Per-product breakdown */}
      <div className="rounded-lg border bg-card">
        <div className="p-4 border-b">
          <h2 className="text-sm font-semibold">Revenue by Product</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="px-4 py-3 font-medium">Product</th>
              <th className="px-4 py-3 font-medium text-right">Price</th>
              <th className="px-4 py-3 font-medium text-right">Subscribers</th>
              <th className="px-4 py-3 font-medium text-right">MRR</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {revenueByProduct.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                  No products yet.
                </td>
              </tr>
            ) : (
              revenueByProduct.map((p) => (
                <tr key={p.slug}>
                  <td className="px-4 py-3 font-medium">{p.name}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground">
                    £{p.pricePerMonth.toFixed(2)}/mo
                  </td>
                  <td className="px-4 py-3 text-right">{p.subscribers}</td>
                  <td className="px-4 py-3 text-right font-medium">
                    £{p.mrr.toLocaleString("en-GB", { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: 0 errors

- [ ] **Step 4: Commit**

```bash
git add src/app/platform/subscriptions/ src/app/platform/revenue/
git commit -m "feat(platform): add subscriptions and revenue pages with real data"
```

---

## Task 17: Final wiring + full test suite

**Files:**
- Verify all modified files compile
- Run full test suite

- [ ] **Step 1: Verify TypeScript compiles with zero errors**

Run: `npx tsc --noEmit`
Expected: 0 errors

- [ ] **Step 2: Run full test suite**

Run: `npx vitest run`
Expected: all 224+ existing tests PASS, plus new product and subscription tests PASS

- [ ] **Step 3: Verify build**

Run: `NEXT_PHASE=phase-production-build npx next build`
Expected: build succeeds

- [ ] **Step 4: Commit any final fixes**

If any fixes were needed, commit them:

```bash
git add -A
git commit -m "fix: resolve build and test issues from product platform integration"
```

- [ ] **Step 5: Final commit — feature complete**

```bash
git add -A
git commit -m "feat: product platform architecture — products, subscriptions, self-serve signup, platform command centre"
```
