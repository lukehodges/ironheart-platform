export type StaffStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'

export type EmployeeType = 'EMPLOYED' | 'SELF_EMPLOYED' | 'CONTRACTOR'

export type AvailabilityType = 'RECURRING' | 'SPECIFIC' | 'BLOCKED'

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
  createdAt: Date
  updatedAt: Date
}

export type AvailabilityEntry =
  | {
      type: 'RECURRING'
      dayOfWeek: number   // 0 = Sunday, 6 = Saturday
      startTime: string   // "HH:MM"
      endTime: string     // "HH:MM"
    }
  | {
      type: 'SPECIFIC'
      specificDate: string // "YYYY-MM-DD"
      startTime: string    // "HH:MM"
      endTime: string      // "HH:MM"
    }
  | {
      type: 'BLOCKED'
      specificDate: string  // "YYYY-MM-DD"
      endDate?: string      // "YYYY-MM-DD" — if omitted, only specificDate is blocked
      reason?: string
      isAllDay: boolean
    }

export interface AvailabilitySlot {
  startTime: string  // "HH:MM"
  endTime: string    // "HH:MM"
}

export interface TeamSchedule {
  userId: string
  date: string       // "YYYY-MM-DD"
  slots: Array<{ startTime: string; endTime: string }>
}

export interface CreateStaffInput {
  email: string
  name: string
  phone?: string
  employeeType?: EmployeeType
  hourlyRate?: number
}

export interface UpdateStaffInput {
  id: string
  email?: string
  name?: string
  phone?: string
  employeeType?: EmployeeType
  hourlyRate?: number
  status?: StaffStatus
}
