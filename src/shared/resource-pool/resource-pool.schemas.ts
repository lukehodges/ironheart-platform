// src/shared/resource-pool/resource-pool.schemas.ts
import { z } from 'zod'

const dateRegex = /^\d{4}-\d{2}-\d{2}$/

// ---------------------------------------------------------------------------
// Skills
// ---------------------------------------------------------------------------

export const addSkillSchema = z.object({
  userId: z.string(),
  skillType: z.enum(['SERVICE', 'CERTIFICATION', 'LANGUAGE', 'QUALIFICATION', 'EQUIPMENT', 'CUSTOM']),
  skillId: z.string().min(1),
  skillName: z.string().min(1).max(255),
  proficiency: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT']).default('INTERMEDIATE'),
  expiresAt: z.string().datetime().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export const removeSkillSchema = z.object({
  userId: z.string(),
  skillType: z.enum(['SERVICE', 'CERTIFICATION', 'LANGUAGE', 'QUALIFICATION', 'EQUIPMENT', 'CUSTOM']),
  skillId: z.string(),
})

export const listSkillsSchema = z.object({
  userId: z.string(),
  skillType: z.enum(['SERVICE', 'CERTIFICATION', 'LANGUAGE', 'QUALIFICATION', 'EQUIPMENT', 'CUSTOM']).optional(),
})

export const findUsersWithSkillSchema = z.object({
  skillType: z.enum(['SERVICE', 'CERTIFICATION', 'LANGUAGE', 'QUALIFICATION', 'EQUIPMENT', 'CUSTOM']),
  skillId: z.string(),
  minProficiency: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT']).optional(),
})

// ---------------------------------------------------------------------------
// Capacities
// ---------------------------------------------------------------------------

export const setCapacitySchema = z.object({
  userId: z.string(),
  capacityType: z.string().min(1),
  maxConcurrent: z.number().int().min(0).nullable().optional(),
  maxDaily: z.number().int().min(0).nullable().optional(),
  maxWeekly: z.number().int().min(0).nullable().optional(),
  unit: z.enum(['COUNT', 'HOURS', 'POINTS']).default('COUNT'),
  effectiveFrom: z.string().regex(dateRegex),
  effectiveUntil: z.string().regex(dateRegex).nullable().optional(),
})

export const getCapacitySchema = z.object({
  userId: z.string(),
  capacityType: z.string(),
  date: z.string().regex(dateRegex).optional(),
})

export const getCapacityUsageSchema = z.object({
  userId: z.string(),
  capacityType: z.string(),
  date: z.string().regex(dateRegex),
})

// ---------------------------------------------------------------------------
// Assignments
// ---------------------------------------------------------------------------

export const requestAssignmentSchema = z.object({
  userId: z.string(),
  moduleSlug: z.string().min(1),
  resourceType: z.string().min(1),
  resourceId: z.string(),
  weight: z.number().min(0).default(1),
  scheduledDate: z.string().regex(dateRegex).optional(),
  assignedBy: z.string().optional(),
  overrideReason: z.string().max(500).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export const listAssignmentsSchema = z.object({
  userId: z.string(),
  moduleSlug: z.string().optional(),
  status: z.enum(['ASSIGNED', 'ACTIVE', 'COMPLETED', 'CANCELLED']).optional(),
  startDate: z.string().regex(dateRegex).optional(),
  endDate: z.string().regex(dateRegex).optional(),
  limit: z.number().int().max(100).default(50),
  cursor: z.string().optional(),
})

export const getWorkloadSchema = z.object({
  userId: z.string(),
  date: z.string().regex(dateRegex),
})

// ---------------------------------------------------------------------------
// Find Available Staff
// ---------------------------------------------------------------------------

export const findAvailableStaffSchema = z.object({
  requiredSkills: z.array(z.object({
    skillType: z.enum(['SERVICE', 'CERTIFICATION', 'LANGUAGE', 'QUALIFICATION', 'EQUIPMENT', 'CUSTOM']),
    skillId: z.string(),
    minProficiency: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT']).optional(),
  })).optional(),
  capacityType: z.string().min(1),
  date: z.string().regex(dateRegex),
  minAvailableCapacity: z.number().min(0).default(1),
  sortBy: z.enum(['LEAST_LOADED', 'MOST_SKILLED', 'NEAREST', 'ROUND_ROBIN']).default('LEAST_LOADED'),
  location: z.object({
    lat: z.number(),
    lng: z.number(),
  }).optional(),
})
