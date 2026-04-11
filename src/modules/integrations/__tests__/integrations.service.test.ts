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

  it('returns OAuth URL for google-calendar', async () => {
    const { calendarSyncService } = await import('@/modules/calendar-sync')
    vi.mocked(calendarSyncService.initiateOAuth).mockResolvedValue('https://accounts.google.com/auth?state=xyz')

    const url = await integrationsService.initiateOAuth(USER_ID, TENANT_ID, 'google-calendar', 'https://app.test/cb')

    expect(url).toContain('accounts.google.com')
    expect(calendarSyncService.initiateOAuth).toHaveBeenCalledWith(USER_ID, TENANT_ID, 'GOOGLE_CALENDAR', 'https://app.test/cb')
  })

  it('throws for unknown provider', async () => {
    await expect(
      integrationsService.initiateOAuth(USER_ID, TENANT_ID, 'nonexistent', 'https://app.test/cb')
    ).rejects.toThrow('Unknown provider')
  })
})

describe('integrationsService.disconnect', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('throws for unknown provider', async () => {
    await expect(
      integrationsService.disconnect(USER_ID, TENANT_ID, 'nonexistent')
    ).rejects.toThrow('Unknown provider')
  })
})
