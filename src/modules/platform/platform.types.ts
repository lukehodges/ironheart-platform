export type TenantPlan =
  | 'TRIAL'
  | 'STARTER'
  | 'PROFESSIONAL'
  | 'ENTERPRISE'

export type TenantStatus =
  | 'ACTIVE'
  | 'SUSPENDED'
  | 'CANCELLED'
  | 'PENDING'

export interface TenantRecord {
  id: string
  slug: string
  name: string
  plan: TenantPlan
  status: TenantStatus
  trialEndsAt?: Date | null
  suspendedAt?: Date | null
  suspendedReason?: string | null
  createdAt: Date
  updatedAt: Date
}

export interface AuditLogRecord {
  id: string
  tenantId: string
  userId?: string | null
  action: string
  entityType: string
  entityId?: string | null
  oldValues?: Record<string, unknown> | null
  newValues?: Record<string, unknown> | null
  ipAddress?: string | null
  userAgent?: string | null
  sessionId?: string | null
  requestId?: string | null
  severity: 'INFO' | 'WARNING' | 'CRITICAL'
  metadata?: Record<string, unknown> | null
  createdAt: Date
}

export interface FeatureFlag {
  id: string
  slug: string
  name: string
  description?: string | null
  defaultEnabled: boolean
  createdAt: Date
}

export interface TenantFeature {
  id: string
  tenantId: string
  flagId: string
  isEnabled: boolean
  createdAt: Date
  updatedAt: Date
}

export interface SignupRequest {
  id: string
  tenantId?: string | null
  name: string
  email: string
  businessName: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  reason?: string | null
  createdAt: Date
  updatedAt: Date
}

export interface CreateTenantInput {
  businessName: string
  email: string
  plan?: TenantPlan | null
  slug?: string | null
}

export interface ChangePlanInput {
  tenantId: string
  plan: TenantPlan
  reason?: string | null
}

export interface TenantModule {
  id: string
  tenantId: string
  moduleId: string
  moduleSlug: string
  moduleName: string
  isEnabled: boolean
  monthlyRate: string | null
  activatedAt: Date | null
  createdAt: Date
  updatedAt: Date
}
