// Platform admin feature types for tenant management and analytics

// Tenant management types

export interface TenantListItem {
  id: string
  slug: string
  name: string
  plan: 'TRIAL' | 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE'
  status: 'ACTIVE' | 'SUSPENDED' | 'CANCELLED' | 'PENDING'
  userCount: number
  bookingCount: number
  createdAt: Date
  trialEndsAt?: Date | null
  suspendedAt?: Date | null
}

export interface TenantDetail extends TenantListItem {
  email: string
  domain?: string | null
  suspendedReason?: string | null
  usage: {
    bookingsThisMonth: number
    activeUsers: number
    storageUsedMB: number
    storageQuotaMB: number
    apiCallsThisMonth: number
    apiQuota: number
  }
  billing: {
    mrr: number // monthly recurring revenue
    nextBillingDate?: Date | null
    paymentMethod?: string | null
  }
  modules: TenantModuleStatus[]
}

export interface TenantModuleStatus {
  moduleId: string
  slug: string
  name: string
  description: string
  isEnabled: boolean
  isPremium: boolean
  monthlyRate?: number | null
}

export interface TenantFilters {
  search?: string
  plan?: 'TRIAL' | 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE'
  status?: 'ACTIVE' | 'SUSPENDED' | 'CANCELLED' | 'PENDING'
}

export interface CreateTenantWizardState {
  step: 1 | 2 | 3 | 4 | 5
  businessDetails: {
    businessName: string
    domain: string
    industry: string
  }
  plan: 'TRIAL' | 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE'
  adminUser: {
    email: string
    firstName: string
    lastName: string
  }
  modules: string[] // module IDs
}

// Platform analytics types

export interface PlatformMRRData {
  currentMRR: number
  previousMRR: number
  change: number // percentage
  chartData: { month: string; mrr: number }[]
}

export interface TenantsByPlanData {
  plan: string
  count: number
  percentage: number
}

export interface SignupTrendData {
  date: string
  signups: number
  conversions: number
}

export interface ChurnData {
  currentChurnRate: number
  previousChurnRate: number
  churnedTenants: {
    id: string
    name: string
    plan: string
    churnedAt: Date
    reason?: string
  }[]
}

export type ImpersonateAction = 'START' | 'END'

export interface ImpersonateAuditLog {
  tenantId: string
  tenantName: string
  adminEmail: string
  action: ImpersonateAction
  timestamp: Date
  ipAddress?: string
}
