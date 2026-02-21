// Platform-wide analytics types

export interface PlatformMetrics {
  totalTenants: number;
  activeTenants: number;
  trialTenants: number;
  mrr: number;
  arr: number; // annual recurring revenue
  averageRevenuePerTenant: number;
  churnRate: number;
  growthRate: number;
}

export interface TenantGrowthData {
  date: string;
  newTenants: number;
  churnedTenants: number;
  netGrowth: number;
}

export interface RevenueBreakdown {
  plan: string;
  mrr: number;
  tenantCount: number;
  averagePerTenant: number;
}

export interface TopTenantByRevenue {
  tenantId: string;
  tenantName: string;
  plan: string;
  mrr: number;
  userCount: number;
}

export type PlatformAnalyticsDateRange = '7d' | '30d' | '90d' | '12m';
