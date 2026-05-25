export type FormFieldType =
  | 'TEXT'
  | 'TEXTAREA'
  | 'SELECT'
  | 'MULTISELECT'
  | 'DATE'
  | 'BOOLEAN'
  | 'EMAIL'
  | 'PHONE'

export interface FormFieldValidation {
  minLength?: number
  maxLength?: number
  pattern?: string
  min?: string
  max?: string
}

export interface FormField {
  id: string
  type: FormFieldType
  label: string
  required: boolean
  placeholder?: string
  options?: string[]
  validation?: FormFieldValidation
}

export type FormSendTiming = 'IMMEDIATE' | 'BEFORE_APPOINTMENT' | 'AFTER_APPOINTMENT'

export type FormStatus = 'PENDING' | 'SENT' | 'COMPLETED' | 'EXPIRED'

export interface FormTemplateRecord {
  id: string
  tenantId: string
  /** Optional slug for stable lookup (set on Ironheart master library templates). */
  slug?: string | null
  /** When non-null, scopes this template to a single engagement (a per-client clone of a master). */
  engagementId?: string | null
  name: string
  description?: string | null
  fields: FormField[]
  isActive: boolean
  attachedServices?: string[] | null
  sendTiming: FormSendTiming
  sendOffsetHours?: number | null
  requiresSignature: boolean
  createdAt: Date
  updatedAt: Date
  deletedAt?: Date | null
}

export interface CompletedFormRecord {
  id: string
  tenantId: string
  templateId: string
  bookingId?: string | null
  customerId?: string | null
  sessionKey: string
  status: FormStatus
  responses?: Record<string, unknown> | null
  signature?: string | null
  completedAt: Date | null
  expiresAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface SendFormInput {
  templateId: string
  bookingId?: string | null
  customerId?: string | null
}

export interface SubmitFormInput {
  token: string
  responses: Record<string, unknown>
}

export interface ListFormsInput {
  templateId?: string
  bookingId?: string
  customerId?: string
  status?: FormStatus
  limit: number
  cursor?: string
}

export interface CreateTemplateInput {
  name: string
  description?: string | null
  fields: FormField[]
  isActive?: boolean
  attachedServices?: string[] | null
  sendTiming?: FormSendTiming
  sendOffsetHours?: number | null
  requiresSignature?: boolean
  /** When set, the template is scoped to a single engagement (per-client clone). */
  engagementId?: string | null
  slug?: string | null
}

export interface UpdateTemplateInput {
  id: string
  name?: string
  description?: string | null
  fields?: FormField[]
  isActive?: boolean
  attachedServices?: string[] | null
  sendTiming?: FormSendTiming
  sendOffsetHours?: number | null
  requiresSignature?: boolean
}
