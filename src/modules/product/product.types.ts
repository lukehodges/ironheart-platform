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
  archivedAt: Date | null;
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
