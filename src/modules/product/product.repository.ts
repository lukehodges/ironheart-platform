import { db } from "@/shared/db";
import { logger } from "@/shared/logger";
import { NotFoundError, ConflictError } from "@/shared/errors";
import { products, productPlans } from "@/shared/db/schemas/product.schema";
import { eq, and, isNull, isNotNull, count, gte, sql, ilike, or } from "drizzle-orm";
import { tenants } from "@/shared/db/schemas/tenant.schema";
import type {
  ProductRecord,
  ProductPlanRecord,
  ProductWithPlans,
  CreateProductInput,
  UpdateProductInput,
  CreatePlanInput,
  UpdatePlanInput,
  ProductWithStats,
  ProductAnalytics,
  ProductComparison,
  ProductListFilters,
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
    archivedAt: row.archivedAt ?? null,
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
  const rows = await db.select().from(products).where(eq(products.id, id)).limit(1);
  return rows[0] ? toProductRecord(rows[0]) : null;
}

async function findBySlug(slug: string): Promise<ProductRecord | null> {
  const rows = await db.select().from(products).where(eq(products.slug, slug)).limit(1);
  return rows[0] ? toProductRecord(rows[0]) : null;
}

async function findBySlugWithPlans(slug: string): Promise<ProductWithPlans | null> {
  const product = await findBySlug(slug);
  if (!product) return null;
  const plans = await db.select().from(productPlans).where(eq(productPlans.productId, product.id)).orderBy(productPlans.priceMonthly);
  return { ...product, plans: plans.map(toPlanRecord) };
}

async function findByIdWithPlans(id: string): Promise<ProductWithPlans | null> {
  const product = await findById(id);
  if (!product) return null;
  const plans = await db.select().from(productPlans).where(eq(productPlans.productId, product.id)).orderBy(productPlans.priceMonthly);
  return { ...product, plans: plans.map(toPlanRecord) };
}

async function create(input: CreateProductInput): Promise<ProductRecord> {
  const existing = await findBySlug(input.slug);
  if (existing) {
    throw new ConflictError(`Product with slug '${input.slug}' already exists`);
  }
  const now = new Date();
  const [row] = await db.insert(products).values({
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
  }).returning();
  log.info({ productId: row.id, slug: input.slug }, "Product created");
  return toProductRecord(row);
}

async function update(id: string, input: UpdateProductInput): Promise<ProductRecord> {
  const existing = await findById(id);
  if (!existing) throw new NotFoundError("Product", id);
  const now = new Date();
  const updateFields: Record<string, unknown> = { updatedAt: now };
  if (input.name !== undefined) updateFields.name = input.name;
  if (input.tagline !== undefined) updateFields.tagline = input.tagline;
  if (input.description !== undefined) updateFields.description = input.description;
  if (input.logoUrl !== undefined) updateFields.logoUrl = input.logoUrl;
  if (input.domain !== undefined) updateFields.domain = input.domain;
  if (input.moduleSlugs !== undefined) updateFields.moduleSlugs = input.moduleSlugs;
  if (input.isPublished !== undefined) updateFields.isPublished = input.isPublished;
  const [row] = await db.update(products).set(updateFields).where(eq(products.id, id)).returning();
  log.info({ productId: id }, "Product updated");
  return toProductRecord(row);
}

async function deleteProduct(id: string): Promise<void> {
  const existing = await findById(id);
  if (!existing) throw new NotFoundError("Product", id);
  await db.delete(products).where(eq(products.id, id));
  log.info({ productId: id }, "Product deleted");
}

async function createPlan(input: CreatePlanInput): Promise<ProductPlanRecord> {
  const product = await findById(input.productId);
  if (!product) throw new NotFoundError("Product", input.productId);
  const [row] = await db.insert(productPlans).values({
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
  }).returning();
  log.info({ planId: row.id, productId: input.productId }, "Plan created");
  return toPlanRecord(row);
}

async function findDefaultPlan(productId: string): Promise<ProductPlanRecord | null> {
  const rows = await db.select().from(productPlans).where(and(eq(productPlans.productId, productId), eq(productPlans.isDefault, true))).limit(1);
  return rows[0] ? toPlanRecord(rows[0]) : null;
}

async function findPlanById(id: string): Promise<ProductPlanRecord | null> {
  const rows = await db.select().from(productPlans).where(eq(productPlans.id, id)).limit(1);
  return rows[0] ? toPlanRecord(rows[0]) : null;
}

async function deletePlan(id: string): Promise<void> {
  await db.delete(productPlans).where(eq(productPlans.id, id));
  log.info({ planId: id }, "Plan deleted");
}

async function listWithStats(filters: ProductListFilters): Promise<ProductWithStats[]> {
  const conditions: ReturnType<typeof eq>[] = [];

  // Status filter
  if (filters.status === "live") {
    conditions.push(eq(products.isPublished, true));
    conditions.push(isNull(products.archivedAt));
  } else if (filters.status === "draft") {
    conditions.push(eq(products.isPublished, false));
    conditions.push(isNull(products.archivedAt));
  } else if (filters.status === "archived") {
    conditions.push(isNotNull(products.archivedAt));
  } else {
    // Default: exclude archived
    conditions.push(isNull(products.archivedAt));
  }

  // Search filter
  if (filters.search) {
    const searchTerm = `%${filters.search}%`;
    conditions.push(or(ilike(products.name, searchTerm), ilike(products.slug, searchTerm))!);
  }

  // Module slug filter
  if (filters.moduleSlug) {
    conditions.push(sql`${filters.moduleSlug} = ANY(${products.moduleSlugs})`);
  }

  const rows = await db
    .select()
    .from(products)
    .where(and(...conditions))
    .orderBy(products.name);

  const result: ProductWithStats[] = [];
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  for (const row of rows) {
    const product = toProductRecord(row);

    const [totalResult] = await db
      .select({ count: count() })
      .from(tenants)
      .where(and(eq(tenants.productId, product.id), isNull(tenants.deletedAt)));
    const totalTenants = totalResult?.count ?? 0;

    const [activeResult] = await db
      .select({ count: count() })
      .from(tenants)
      .where(and(eq(tenants.productId, product.id), eq(tenants.status, "ACTIVE"), isNull(tenants.deletedAt)));
    const activeTenantCount = activeResult?.count ?? 0;

    const [trialResult] = await db
      .select({ count: count() })
      .from(tenants)
      .where(and(eq(tenants.productId, product.id), eq(tenants.status, "TRIAL"), isNull(tenants.deletedAt)));
    const trialTenantCount = trialResult?.count ?? 0;

    const [growthResult] = await db
      .select({ count: count() })
      .from(tenants)
      .where(and(eq(tenants.productId, product.id), isNull(tenants.deletedAt), gte(tenants.createdAt, thirtyDaysAgo)));
    const tenantGrowthThisMonth = growthResult?.count ?? 0;

    const [planCountResult] = await db
      .select({ count: count() })
      .from(productPlans)
      .where(eq(productPlans.productId, product.id));
    const planCount = planCountResult?.count ?? 0;

    // MRR estimate: active tenants × default plan price
    const defaultPlan = await findDefaultPlan(product.id);
    const mrr = activeTenantCount * (defaultPlan?.priceMonthly ?? 0);

    result.push({
      ...product,
      tenantCount: totalTenants,
      activeTenantCount,
      trialTenantCount,
      mrr,
      planCount,
      tenantGrowthThisMonth,
    });
  }

  return result;
}

async function cloneProduct(id: string): Promise<ProductRecord> {
  const existing = await findByIdWithPlans(id);
  if (!existing) throw new NotFoundError("Product", id);

  const now = new Date();
  const newId = crypto.randomUUID();
  const [row] = await db.insert(products).values({
    id: newId,
    slug: `${existing.slug}-copy`,
    name: `${existing.name} (Copy)`,
    tagline: existing.tagline,
    description: existing.description,
    logoUrl: existing.logoUrl,
    domain: null,
    moduleSlugs: existing.moduleSlugs,
    isPublished: false,
    createdAt: now,
    updatedAt: now,
  }).returning();

  // Clone all plans
  for (const plan of existing.plans) {
    await db.insert(productPlans).values({
      id: crypto.randomUUID(),
      productId: newId,
      slug: plan.slug,
      name: plan.name,
      priceMonthly: plan.priceMonthly,
      priceYearly: plan.priceYearly,
      trialDays: plan.trialDays,
      stripePriceId: plan.stripePriceId,
      features: plan.features,
      isDefault: plan.isDefault,
      createdAt: now,
    });
  }

  log.info({ productId: newId, sourceId: id }, "Product cloned");
  return toProductRecord(row);
}

async function archiveProduct(id: string): Promise<ProductRecord> {
  const existing = await findById(id);
  if (!existing) throw new NotFoundError("Product", id);
  const now = new Date();
  const [row] = await db
    .update(products)
    .set({ archivedAt: now, updatedAt: now })
    .where(eq(products.id, id))
    .returning();
  log.info({ productId: id }, "Product archived");
  return toProductRecord(row);
}

async function unarchiveProduct(id: string): Promise<ProductRecord> {
  const existing = await findById(id);
  if (!existing) throw new NotFoundError("Product", id);
  const now = new Date();
  const [row] = await db
    .update(products)
    .set({ archivedAt: null, updatedAt: now })
    .where(eq(products.id, id))
    .returning();
  log.info({ productId: id }, "Product unarchived");
  return toProductRecord(row);
}

async function getProductAnalytics(productId: string): Promise<ProductAnalytics> {
  const product = await findById(productId);
  if (!product) throw new NotFoundError("Product", productId);

  const [totalResult] = await db
    .select({ count: count() })
    .from(tenants)
    .where(and(eq(tenants.productId, productId), isNull(tenants.deletedAt)));
  const totalTenants = totalResult?.count ?? 0;

  const [activeResult] = await db
    .select({ count: count() })
    .from(tenants)
    .where(and(eq(tenants.productId, productId), eq(tenants.status, "ACTIVE"), isNull(tenants.deletedAt)));
  const activeTenantCount = activeResult?.count ?? 0;

  const [trialResult] = await db
    .select({ count: count() })
    .from(tenants)
    .where(and(eq(tenants.productId, productId), eq(tenants.status, "TRIAL"), isNull(tenants.deletedAt)));
  const trialTenantCount = trialResult?.count ?? 0;

  const [cancelledResult] = await db
    .select({ count: count() })
    .from(tenants)
    .where(and(eq(tenants.productId, productId), eq(tenants.status, "CANCELLED"), isNull(tenants.deletedAt)));
  const cancelledCount = cancelledResult?.count ?? 0;

  // MRR: active tenants × default plan price
  const defaultPlan = await findDefaultPlan(productId);
  const mrr = activeTenantCount * (defaultPlan?.priceMonthly ?? 0);

  // MRR change estimate: growth percentage based on trial vs active ratio
  const mrrChange = totalTenants > 0 ? Math.round((trialTenantCount / totalTenants) * 100) : 0;

  // Trial conversion rate
  const totalEverTrial = trialTenantCount + activeTenantCount + cancelledCount;
  const trialConversionRate = totalEverTrial > 0
    ? Math.round((activeTenantCount / totalEverTrial) * 100)
    : 0;

  // Churn rate
  const churnRate = totalTenants > 0
    ? Math.round((cancelledCount / totalTenants) * 100)
    : 0;

  // Tenants by plan
  const plans = await db.select().from(productPlans).where(eq(productPlans.productId, productId));
  const tenantsByPlan: ProductAnalytics["tenantsByPlan"] = [];
  for (const plan of plans) {
    const [planResult] = await db
      .select({ count: count() })
      .from(tenants)
      .where(and(eq(tenants.planId, plan.id), isNull(tenants.deletedAt)));
    tenantsByPlan.push({
      planId: plan.id,
      planName: plan.name,
      count: planResult?.count ?? 0,
    });
  }

  return { mrr, mrrChange, totalTenants, trialConversionRate, churnRate, tenantsByPlan };
}

async function getProductComparison(ids: string[]): Promise<ProductComparison[]> {
  const result: ProductComparison[] = [];
  for (const id of ids) {
    const product = await findById(id);
    if (!product) throw new NotFoundError("Product", id);
    result.push({
      productId: product.id,
      productName: product.name,
      moduleSlugs: product.moduleSlugs,
    });
  }
  return result;
}

async function updatePlan(id: string, input: UpdatePlanInput): Promise<ProductPlanRecord> {
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
  const [row] = await db
    .update(productPlans)
    .set(updateFields)
    .where(eq(productPlans.id, id))
    .returning();
  log.info({ planId: id }, "Plan updated");
  return toPlanRecord(row);
}

export const productRepository = {
  list, findById, findBySlug, findBySlugWithPlans, findByIdWithPlans,
  create, update, delete: deleteProduct,
  createPlan, findDefaultPlan, findPlanById, deletePlan,
  listWithStats, cloneProduct, archiveProduct, unarchiveProduct,
  getProductAnalytics, getProductComparison, updatePlan,
};
