export type StaffStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'

export type EmployeeType = 'EMPLOYED' | 'SELF_EMPLOYED' | 'CONTRACTOR'

export type AvailabilityType = 'RECURRING' | 'SPECIFIC' | 'BLOCKED'

export type PayRateType = 'HOURLY' | 'DAILY' | 'SALARY' | 'COMMISSION' | 'PIECE_RATE'

export type CustomFieldType = 'TEXT' | 'NUMBER' | 'DATE' | 'SELECT' | 'MULTI_SELECT' | 'BOOLEAN' | 'URL' | 'EMAIL' | 'PHONE'

export type ChecklistTemplateType = 'ONBOARDING' | 'OFFBOARDING'

export type ChecklistStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED'

export interface StaffMember {
  id: string
  tenantId: string
  email: string
  name: string
  phone: string | null
  avatarUrl: string | null
  status: StaffStatus
  employeeType: EmployeeType | null
  isTeamMember: boolean
  hourlyRate: number | null
  staffStatus: string | null
  workosUserId: string | null
  jobTitle: string | null
  bio: string | null
  reportsTo: string | null
  emergencyContactName: string | null
  emergencyContactPhone: string | null
  emergencyContactRelation: string | null
  addressLine1: string | null
  addressLine2: string | null
  addressCity: string | null
  addressPostcode: string | null
  addressCountry: string | null
  dateOfBirth: Date | null
  taxId: string | null
  dayRate: number | null
  mileageRate: number | null
  startDate: Date | null
  departments: StaffDepartmentMembership[]
  // Optional fields populated by list query joins
  skills?: Array<{ skillName: string; proficiency: string | null }>
  capacityUsed?: number
  capacityMax?: number
  availability?: 'available' | 'blocked' | 'unavailable'
  createdAt: Date
  updatedAt: Date
}

export interface TeamStats {
  total: number
  activeCount: number
  inactiveCount: number
  suspendedCount: number
  departmentCount: number
  avgCapacityUsed: number
  avgCapacityMax: number
}

export interface StaffDepartmentMembership {
  departmentId: string
  departmentName: string
  isPrimary: boolean
}

export type AvailabilityEntry =
  | {
      type: 'RECURRING'
      dayOfWeek: number
      startTime: string
      endTime: string
    }
  | {
      type: 'SPECIFIC'
      specificDate: string
      startTime: string
      endTime: string
    }
  | {
      type: 'BLOCKED'
      specificDate: string
      endDate?: string
      reason?: string
      isAllDay: boolean
    }

export interface AvailabilitySlot {
  startTime: string
  endTime: string
}

export interface TeamSchedule {
  userId: string
  date: string
  slots: Array<{ startTime: string; endTime: string }>
}

export interface CreateStaffInput {
  email: string
  name: string
  phone?: string
  employeeType?: EmployeeType
  hourlyRate?: number
  jobTitle?: string
  departmentId?: string
}

export interface UpdateStaffInput {
  id: string
  email?: string
  name?: string
  phone?: string
  employeeType?: EmployeeType
  hourlyRate?: number
  status?: StaffStatus
  jobTitle?: string
  bio?: string
  reportsTo?: string | null
  emergencyContactName?: string | null
  emergencyContactPhone?: string | null
  emergencyContactRelation?: string | null
  addressLine1?: string | null
  addressLine2?: string | null
  addressCity?: string | null
  addressPostcode?: string | null
  addressCountry?: string | null
}

export interface Department {
  id: string
  tenantId: string
  name: string
  slug: string
  description: string | null
  parentId: string | null
  managerId: string | null
  color: string | null
  sortOrder: number
  isActive: boolean
  memberCount: number
  children: Department[]
}

export interface StaffNote {
  id: string
  tenantId: string
  userId: string
  authorId: string
  authorName: string
  content: string
  isPinned: boolean
  createdAt: Date
  updatedAt: Date
}

export interface PayRate {
  id: string
  rateType: PayRateType
  amount: number
  currency: string
  effectiveFrom: Date
  effectiveUntil: Date | null
  reason: string | null
  createdBy: string | null
  createdAt: Date
}

export interface ChecklistTemplate {
  id: string
  tenantId: string
  name: string
  type: ChecklistTemplateType
  employeeType: string | null
  items: ChecklistItem[]
  isDefault: boolean
}

export interface ChecklistItem {
  key: string
  label: string
  description: string
  isRequired: boolean
  order: number
}

export interface ChecklistItemProgress extends ChecklistItem {
  completedAt: string | null
  completedBy: string | null
}

export interface ChecklistProgress {
  id: string
  userId: string
  templateId: string
  templateName: string
  status: ChecklistStatus
  items: ChecklistItemProgress[]
  startedAt: Date | null
  completedAt: Date | null
}

export interface CustomFieldDefinition {
  id: string
  tenantId: string
  fieldKey: string
  label: string
  fieldType: CustomFieldType
  options: Array<{ value: string; label: string }> | null
  isRequired: boolean
  showOnCard: boolean
  showOnProfile: boolean
  sortOrder: number
  groupName: string | null
}

export interface CustomFieldValue {
  fieldDefinitionId: string
  fieldKey: string
  label: string
  fieldType: CustomFieldType
  value: unknown
  groupName: string | null
}
