// src/modules/integrations/__tests__/integrations.service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─── Mock provider ────────────────────────────────────────────────────────────
const mockProvider = {
  slug: 'test-provider',
  name: 'Test Provider',
  handles: ['booking.confirmed'] as const,
  onEvent: vi.fn().mockResolvedValue({ success: true }),
  onWebhook: vi.fn().mockResolvedValue(undefined),
  getOAuthUrl: vi.fn().mockReturnValue('https://example.com/oauth'),
  exchangeCode: vi.fn().mockResolvedValue(undefined),
  disconnect: vi.fn().mockResolvedValue(undefined),
}

vi.mock('../integrations.registry', () => ({
  getProvider: vi.fn((slug: string) => (slug === 'test-provider' ? mockProvider : null)),
  getAllProviders: vi.fn(() => [mockProvider]),
}))

vi.mock('../integrations.repository', () => ({
  integrationsRepository: {
    findConnectedUsersForBooking: vi.fn(),
    findConnectedIntegrationsForUser: vi.fn(),
  },
}))

vi.mock('@/modules/calendar-sync', () => ({
  calendarSyncService: {
    initiateOAuth: vi.fn().mockResolvedValue('https://accounts.google.com/auth'),
    completeOAuth: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue({ userId: 'u-1', provider: 'GOOGLE_CALENDAR', watchChannelStopped: true }),
  },
  calendarSyncRepository: {
    findUserIntegration: vi.fn(),
    findByWatchChannelId: vi.fn(),
  },
}))

import { integrationsService } from '../integrations.service'
import { integrationsRepository } from '../integrations.repository'

const TENANT_ID = '00000000-0000-0000-0000-000000000001'
const BOOKING_ID = '00000000-0000-0000-0000-000000000002'
const USER_ID    = '00000000-0000-0000-0000-000000000003'
const INTEGRATION_ID = '00000000-0000-0000-0000-000000000004'

describe('integrationsService.routeEvent', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('calls onEvent for each connected user when provider handles the event type', async () => {
    vi.mocked(integrationsRepository.findConnectedUsersForBooking).mockResolvedValue([
      { id: INTEGRATION_ID, userId: USER_ID, provider: 'test-provider' } as any,
    ])

    await integrationsService.routeEvent(
      { type: 'booking.confirmed', data: { bookingId: BOOKING_ID, tenantId: TENANT_ID } },
      TENANT_ID
    )

    expect(mockProvider.onEvent).toHaveBeenCalledOnce()
    expect(mockProvider.onEvent).toHaveBeenCalledWith(
      { type: 'booking.confirmed', data: { bookingId: BOOKING_ID, tenantId: TENANT_ID } },
      { tenantId: TENANT_ID, userId: USER_ID, userIntegrationId: INTEGRATION_ID }
    )
  })

  it('skips providers that do not handle the event type', async () => {
    vi.mocked(integrationsRepository.findConnectedUsersForBooking).mockResolvedValue([
      { id: INTEGRATION_ID, userId: USER_ID, provider: 'test-provider' } as any,
    ])

    await integrationsService.routeEvent(
      { type: 'booking.cancelled', data: { bookingId: BOOKING_ID, tenantId: TENANT_ID } },
      TENANT_ID
    )

    // test-provider only handles 'booking.confirmed', not 'booking.cancelled'
    expect(mockProvider.onEvent).not.toHaveBeenCalled()
  })

  it('does not throw when onEvent returns failure', async () => {
    vi.mocked(integrationsRepository.findConnectedUsersForBooking).mockResolvedValue([
      { id: INTEGRATION_ID, userId: USER_ID, provider: 'test-provider' } as any,
    ])
    mockProvider.onEvent.mockResolvedValue({ success: false, error: 'API error' })

    await expect(
      integrationsService.routeEvent(
        { type: 'booking.confirmed', data: { bookingId: BOOKING_ID, tenantId: TENANT_ID } },
        TENANT_ID
      )
    ).resolves.not.toThrow()
  })

  it('does not throw when onEvent throws unexpectedly', async () => {
    vi.mocked(integrationsRepository.findConnectedUsersForBooking).mockResolvedValue([
      { id: INTEGRATION_ID, userId: USER_ID, provider: 'test-provider' } as any,
    ])
    mockProvider.onEvent.mockRejectedValue(new Error('Network error'))

    await expect(
      integrationsService.routeEvent(
        { type: 'booking.confirmed', data: { bookingId: BOOKING_ID, tenantId: TENANT_ID } },
        TENANT_ID
      )
    ).resolves.not.toThrow()
  })

  it('skips users with no matching provider in registry', async () => {
    vi.mocked(integrationsRepository.findConnectedUsersForBooking).mockResolvedValue([
      { id: INTEGRATION_ID, userId: USER_ID, provider: 'unknown-provider' } as any,
    ])

    await integrationsService.routeEvent(
      { type: 'booking.confirmed', data: { bookingId: BOOKING_ID, tenantId: TENANT_ID } },
      TENANT_ID
    )

    expect(mockProvider.onEvent).not.toHaveBeenCalled()
  })
})

describe('integrationsService.initiateOAuth', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns OAuth URL for google-calendar via calendarSyncService', async () => {
    const { calendarSyncService } = await import('@/modules/calendar-sync')
    vi.mocked(calendarSyncService.initiateOAuth).mockResolvedValue('https://accounts.google.com/auth?state=xyz')

    const url = await integrationsService.initiateOAuth(USER_ID, TENANT_ID, 'google-calendar', 'https://app.test/cb')

    expect(url).toContain('accounts.google.com')
    expect(calendarSyncService.initiateOAuth).toHaveBeenCalledWith(USER_ID, TENANT_ID, 'GOOGLE_CALENDAR', 'https://app.test/cb')
  })

  it('passes a generated state UUID to provider.getOAuthUrl for non-Google providers', async () => {
    const url = await integrationsService.initiateOAuth(USER_ID, TENANT_ID, 'test-provider', 'https://app.test/cb')

    expect(url).toBe('https://example.com/oauth')
    expect(mockProvider.getOAuthUrl).toHaveBeenCalledOnce()
    // First arg should be a UUID (state), second is redirectUri
    const [stateArg, redirectUriArg] = mockProvider.getOAuthUrl.mock.calls[0]
    expect(stateArg).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
    expect(redirectUriArg).toBe('https://app.test/cb')
  })

  it('throws BadRequestError for unknown provider', async () => {
    await expect(
      integrationsService.initiateOAuth(USER_ID, TENANT_ID, 'nonexistent', 'https://app.test/cb')
    ).rejects.toThrow('Unknown provider')
  })

  it('throws a BadRequestError (not plain Error) for unknown provider', async () => {
    const { BadRequestError } = await import('@/shared/errors')
    await expect(
      integrationsService.initiateOAuth(USER_ID, TENANT_ID, 'nonexistent', 'https://app.test/cb')
    ).rejects.toBeInstanceOf(BadRequestError)
  })
})

describe('integrationsService.disconnect', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('throws BadRequestError for unknown provider', async () => {
    const { BadRequestError } = await import('@/shared/errors')
    await expect(
      integrationsService.disconnect(USER_ID, TENANT_ID, 'nonexistent')
    ).rejects.toBeInstanceOf(BadRequestError)
  })

  it('throws with message containing "Unknown provider"', async () => {
    await expect(
      integrationsService.disconnect(USER_ID, TENANT_ID, 'nonexistent')
    ).rejects.toThrow('Unknown provider')
  })
})

describe('integrationsService.handleWebhook', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('resolves the integration context from channel ID and calls provider.onWebhook', async () => {
    const { calendarSyncRepository } = await import('@/modules/calendar-sync')
    const mockIntegration = {
      id: INTEGRATION_ID,
      userId: USER_ID,
      tenantId: TENANT_ID,
    }
    vi.mocked(calendarSyncRepository.findByWatchChannelId).mockResolvedValue(mockIntegration as any)

    const payload = {
      headers: {
        'x-goog-channel-id': 'ch-123',
        'x-goog-resource-id': 'res-456',
        'x-goog-resource-state': 'exists',
      },
      body: null,
    }

    await integrationsService.handleWebhook('test-provider', payload)

    expect(calendarSyncRepository.findByWatchChannelId).toHaveBeenCalledWith('ch-123')
    expect(mockProvider.onWebhook).toHaveBeenCalledWith(payload, {
      tenantId: TENANT_ID,
      userId: USER_ID,
      userIntegrationId: INTEGRATION_ID,
    })
  })

  it('discards webhook when channel ID is missing from headers', async () => {
    const { calendarSyncRepository } = await import('@/modules/calendar-sync')

    await integrationsService.handleWebhook('test-provider', { headers: {}, body: null })

    expect(calendarSyncRepository.findByWatchChannelId).not.toHaveBeenCalled()
    expect(mockProvider.onWebhook).not.toHaveBeenCalled()
  })

  it('discards webhook when channel ID does not match any integration', async () => {
    const { calendarSyncRepository } = await import('@/modules/calendar-sync')
    vi.mocked(calendarSyncRepository.findByWatchChannelId).mockResolvedValue(null)

    await integrationsService.handleWebhook('test-provider', {
      headers: { 'x-goog-channel-id': 'unknown-ch', 'x-goog-resource-id': 'r-1', 'x-goog-resource-state': 'exists' },
      body: null,
    })

    expect(mockProvider.onWebhook).not.toHaveBeenCalled()
  })

  it('ignores webhooks for unknown providers', async () => {
    await integrationsService.handleWebhook('no-such-provider', {
      headers: { 'x-goog-channel-id': 'ch-1', 'x-goog-resource-id': 'r-1', 'x-goog-resource-state': 'exists' },
      body: null,
    })

    expect(mockProvider.onWebhook).not.toHaveBeenCalled()
  })
})

describe('integrationsService.listConnected', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns an entry for each provider that has a CONNECTED integration', async () => {
    vi.mocked(integrationsRepository.findConnectedIntegrationsForUser).mockResolvedValue([
      {
        id: INTEGRATION_ID,
        userId: USER_ID,
        provider: 'test-provider',
        status: 'CONNECTED',
        createdAt: new Date('2025-01-15T10:00:00.000Z'),
      } as any,
    ])

    const result = await integrationsService.listConnected(USER_ID, TENANT_ID)

    // test-provider has slug 'test-provider' which is not in SLUG_TO_DB_PROVIDER,
    // so it will be skipped (no DB mapping). Verify the repository was NOT called
    // for unmapped slugs and result is empty.
    expect(result).toEqual([])
  })

  it('returns connected providers with connectedAt when DB mapping exists', async () => {
    const { getAllProviders } = await import('../integrations.registry')
    const googleProvider = {
      slug: 'google-calendar',
      name: 'Google Calendar',
      handles: ['booking.confirmed', 'booking.cancelled'] as any,
      onEvent: vi.fn(),
      onWebhook: vi.fn(),
      getOAuthUrl: vi.fn(),
      exchangeCode: vi.fn(),
      disconnect: vi.fn(),
    }
    vi.mocked(getAllProviders).mockReturnValue([googleProvider])

    vi.mocked(integrationsRepository.findConnectedIntegrationsForUser).mockResolvedValue([
      {
        id: INTEGRATION_ID,
        userId: USER_ID,
        provider: 'GOOGLE_CALENDAR',
        status: 'CONNECTED',
        createdAt: new Date('2025-01-15T10:00:00.000Z'),
      } as any,
    ])

    const result = await integrationsService.listConnected(USER_ID, TENANT_ID)

    expect(integrationsRepository.findConnectedIntegrationsForUser).toHaveBeenCalledWith(
      USER_ID,
      TENANT_ID,
      'GOOGLE_CALENDAR'
    )
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ slug: 'google-calendar', name: 'Google Calendar' })
    expect(result[0]?.connectedAt).toBeDefined()
  })

  it('returns empty array when no providers are connected', async () => {
    const { getAllProviders } = await import('../integrations.registry')
    const googleProvider = {
      slug: 'google-calendar',
      name: 'Google Calendar',
      handles: [] as any,
      onEvent: vi.fn(),
      onWebhook: vi.fn(),
      getOAuthUrl: vi.fn(),
      exchangeCode: vi.fn(),
      disconnect: vi.fn(),
    }
    vi.mocked(getAllProviders).mockReturnValue([googleProvider])

    vi.mocked(integrationsRepository.findConnectedIntegrationsForUser).mockResolvedValue([])

    const result = await integrationsService.listConnected(USER_ID, TENANT_ID)

    expect(result).toEqual([])
  })
})
