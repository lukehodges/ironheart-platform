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

export const productRepository = {
  list, findById, findBySlug, findBySlugWithPlans, findByIdWithPlans,
  create, update, delete: deleteProduct,
  createPlan, findDefaultPlan, findPlanById, deletePlan,
};
