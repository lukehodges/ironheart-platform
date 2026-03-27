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
