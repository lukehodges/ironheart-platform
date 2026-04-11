export type ResourceType = 'PERSON' | 'VEHICLE' | 'ROOM' | 'EQUIPMENT' | 'VIRTUAL'
export type AssignmentRole = 'LEAD' | 'SUPPORT' | 'DRIVER' | 'OBSERVER'

export interface Resource {
  id: string
  tenantId: string
  type: ResourceType
  name: string
  slug: string
  capacity: number
  homeAddressId: string | null
  travelEnabled: boolean
  skillTags: string[] | null
  userId: string | null
  isActive: boolean
  metadata: Record<string, unknown> | null
  createdAt: Date
  updatedAt: Date
}

export interface Address {
  id: string
  tenantId: string
  line1: string
  line2: string | null
  city: string
  county: string | null
  postcode: string
  country: string
  lat: string | null
  lng: string | null
  geocodedAt: Date | null
  label: string | null
  createdAt: Date
}

export interface CreateResourceInput {
  type: ResourceType
  name: string
  slug?: string
  capacity?: number
  travelEnabled?: boolean
  skillTags?: string[]
  userId?: string | null
  metadata?: Record<string, unknown>
}

export interface UpdateResourceInput extends Partial<CreateResourceInput> {
  isActive?: boolean
  homeAddressId?: string | null
}

export interface ListAvailableInput {
  date: Date
  startTime: string
  endTime: string
  skillTags?: string[]
  type?: ResourceType
}
