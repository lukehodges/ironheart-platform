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
