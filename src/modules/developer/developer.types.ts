export type WebhookStatus = 'ACTIVE' | 'DISABLED' | 'FAILING'

export interface WebhookEndpoint {
  id: string
  tenantId: string
  url: string
  secret: string
  description: string | null
  events: string[]
  status: WebhookStatus
  failureCount: number
  lastSuccessAt: Date | null
  lastFailureAt: Date | null
  lastFailureReason: string | null
  createdAt: Date
  updatedAt: Date
}

export interface WebhookDelivery {
  id: string
  endpointId: string
  eventType: string
  eventId: string
  payload: Record<string, unknown>
  attempt: number
  status: 'PENDING' | 'SUCCESS' | 'FAILED'
  responseStatus: number | null
  responseBody: string | null
  durationMs: number | null
  deliveredAt: Date | null
  nextRetryAt: Date | null
  createdAt: Date
}

export interface DeliveryResult {
  status: 'SUCCESS' | 'FAILED'
  responseStatus?: number
  durationMs?: number
}

export interface CreateWebhookEndpointInput {
  url: string
  description?: string
  events: string[]
}

export interface ApiKeyRecord {
  id: string
  tenantId: string
  name: string
  keyHash: string
  scopes: string[]
  rateLimit: number | null
  expiresAt: Date | null
  lastUsedAt: Date | null
  usageCount: number
  isRevoked: boolean
  createdAt: Date
}
