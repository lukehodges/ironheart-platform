// src/shared/resource-pool/resource-pool.types.ts

export type SkillType = 'SERVICE' | 'CERTIFICATION' | 'LANGUAGE' | 'QUALIFICATION' | 'EQUIPMENT' | 'CUSTOM'
export type ProficiencyLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT'
export type CapacityUnit = 'COUNT' | 'HOURS' | 'POINTS'
export type AssignmentStatus = 'ASSIGNED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED'
export type CapacityEnforcementMode = 'STRICT' | 'FLEXIBLE'

export interface ResourceSkillInput {
  skillType: SkillType
  skillId: string
  skillName: string
  proficiency?: ProficiencyLevel
  verifiedBy?: string
  expiresAt?: Date
  metadata?: Record<string, unknown>
}

export interface ResourceSkillRecord {
  id: string
  tenantId: string
  userId: string
  skillType: SkillType
  skillId: string
  skillName: string
  proficiency: ProficiencyLevel
  verifiedAt: Date | null
  verifiedBy: string | null
  expiresAt: Date | null
  metadata: Record<string, unknown> | null
  createdAt: Date
  updatedAt: Date
}

export interface ResourceCapacityInput {
  capacityType: string
  maxConcurrent?: number | null
  maxDaily?: number | null
  maxWeekly?: number | null
  unit?: CapacityUnit
  effectiveFrom: string  // "YYYY-MM-DD"
  effectiveUntil?: string | null  // "YYYY-MM-DD"
}

export interface ResourceCapacityRecord {
  id: string
  tenantId: string
  userId: string
  capacityType: string
  maxConcurrent: number | null
  maxDaily: number | null
  maxWeekly: number | null
  unit: CapacityUnit
  effectiveFrom: Date
  effectiveUntil: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface AssignmentRequest {
  userId: string
  moduleSlug: string
  resourceType: string
  resourceId: string
  weight?: number
  scheduledDate?: string  // "YYYY-MM-DD"
  assignedBy?: string
  overrideReason?: string
  metadata?: Record<string, unknown>
}

export type AssignmentResult = {
  success: true
  assignmentId: string
} | {
  success: false
  reason: 'CAPACITY_EXCEEDED'
  capacityType: string
  current: number
  max: number
  enforcement: CapacityEnforcementMode
}

export interface ResourceAssignmentRecord {
  id: string
  tenantId: string
  userId: string
  moduleSlug: string
  resourceType: string
  resourceId: string
  status: AssignmentStatus
  weight: number
  scheduledDate: Date | null
  assignedAt: Date
  startedAt: Date | null
  completedAt: Date | null
  assignedBy: string | null
  overrideReason: string | null
  metadata: Record<string, unknown> | null
}

export interface CapacityUsage {
  capacityType: string
  used: number
  max: number | null
  available: number | null
  isOver: boolean
}

export interface WorkloadSummary {
  userId: string
  date: string
  capacities: CapacityUsage[]
}

export interface SkillRequirement {
  skillDefinitionId?: string
  skillType?: SkillType
  skillId?: string
  minProficiency?: ProficiencyLevel
}

export type StaffSortStrategy = 'LEAST_LOADED' | 'MOST_SKILLED' | 'NEAREST' | 'ROUND_ROBIN'

export interface FindAvailableStaffInput {
  requiredSkills?: SkillRequirement[]
  capacityType: string
  date: string  // "YYYY-MM-DD"
  minAvailableCapacity?: number
  sortBy?: StaffSortStrategy
  location?: { lat: number; lng: number }
}

export interface RankedStaffCandidate {
  userId: string
  name: string
  score: number
  reasons: string[]
  capacityUsage: CapacityUsage | null
}

// ---------------------------------------------------------------------------
// Skill Catalog
// ---------------------------------------------------------------------------

export interface SkillDefinitionInput {
  slug?: string
  name: string
  skillType: SkillType
  category?: string | null
  description?: string | null
  requiresVerification?: boolean
  requiresExpiry?: boolean
  metadata?: Record<string, unknown> | null
}

export interface SkillDefinitionRecord {
  id: string
  tenantId: string
  slug: string
  name: string
  skillType: SkillType
  category: string | null
  description: string | null
  requiresVerification: boolean
  requiresExpiry: boolean
  isActive: boolean
  metadata: Record<string, unknown> | null
  createdAt: Date
  updatedAt: Date
}

export interface SkillDefinitionFilter {
  search?: string
  skillType?: SkillType
  category?: string
  isActive?: boolean
}

// ---------------------------------------------------------------------------
// Capacity Type Registry
// ---------------------------------------------------------------------------

export interface CapacityTypeInput {
  slug: string
  name: string
  description?: string | null
  unit?: CapacityUnit
  defaultMaxDaily?: number | null
  defaultMaxWeekly?: number | null
  defaultMaxConcurrent?: number | null
}

export interface CapacityTypeRecord {
  id: string
  tenantId: string
  slug: string
  name: string
  description: string | null
  unit: CapacityUnit
  defaultMaxDaily: number | null
  defaultMaxWeekly: number | null
  defaultMaxConcurrent: number | null
  registeredByModule: string | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

// ---------------------------------------------------------------------------
// Module Manifest Integration
// ---------------------------------------------------------------------------

export interface ManifestCapacityType {
  slug: string
  name: string
  unit: CapacityUnit
  defaultMaxDaily: number | null
  defaultMaxWeekly: number | null
  defaultMaxConcurrent: number | null
}

export interface ManifestSuggestedSkill {
  slug: string
  name: string
  skillType: SkillType
}

export interface ResourcePoolManifestConfig {
  capacityType?: ManifestCapacityType
  suggestedSkills?: ManifestSuggestedSkill[]
}
