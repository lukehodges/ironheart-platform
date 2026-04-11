// src/modules/integrations/__tests__/google-calendar.provider.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/modules/calendar-sync', () => ({
  calendarSyncService: {
    pushBookingToCalendar: vi.fn(),
    cancelBookingFromCalendar: vi.fn(),
    handleWebhook: vi.fn(),
    initiateOAuth: vi.fn(),
    completeOAuth: vi.fn(),
    disconnect: vi.fn(),
  },
  calendarSyncRepository: {
    findByWatchChannelId: vi.fn(),
  },
}))

vi.mock('@/shared/logger', () => ({
  logger: { child: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() }) },
}))

import { googleCalendarProvider } from '../providers/google-calendar.provider'
import { calendarSyncService } from '@/modules/calendar-sync'
import type { IntegrationContext } from '../integrations.types'

const CTX: IntegrationContext = {
  tenantId: '00000000-0000-0000-0000-000000000001',
  userId:   '00000000-0000-0000-0000-000000000002',
  userIntegrationId: '00000000-0000-0000-0000-000000000003',
}

describe('googleCalendarProvider', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('has correct slug and handles booking.confirmed + booking.cancelled', () => {
    expect(googleCalendarProvider.slug).toBe('google-calendar')
    expect(googleCalendarProvider.handles).toContain('booking.confirmed')
    expect(googleCalendarProvider.handles).toContain('booking.cancelled')
  })

  describe('onEvent — booking.confirmed', () => {
    it('calls pushBookingToCalendar with bookingId, userId, tenantId', async () => {
      vi.mocked(calendarSyncService.pushBookingToCalendar).mockResolvedValue(null)

      const result = await googleCalendarProvider.onEvent(
        { type: 'booking.confirmed', data: { bookingId: 'b-1', tenantId: CTX.tenantId } },
        CTX
      )

      expect(calendarSyncService.pushBookingToCalendar).toHaveBeenCalledWith('b-1', CTX.userId, CTX.tenantId)
      expect(result.success).toBe(true)
    })

    it('returns success:false (does not throw) when pushBookingToCalendar throws', async () => {
      vi.mocked(calendarSyncService.pushBookingToCalendar).mockRejectedValue(new Error('API down'))

      const result = await googleCalendarProvider.onEvent(
        { type: 'booking.confirmed', data: { bookingId: 'b-1', tenantId: CTX.tenantId } },
        CTX
      )

      expect(result.success).toBe(false)
      expect(result.error).toContain('API down')
    })
  })

  describe('onEvent — booking.cancelled', () => {
    it('calls cancelBookingFromCalendar with bookingId, userId, tenantId', async () => {
      vi.mocked(calendarSyncService.cancelBookingFromCalendar).mockResolvedValue({ deleted: true })

      const result = await googleCalendarProvider.onEvent(
        { type: 'booking.cancelled', data: { bookingId: 'b-2', tenantId: CTX.tenantId } },
        CTX
      )

      expect(calendarSyncService.cancelBookingFromCalendar).toHaveBeenCalledWith('b-2', CTX.userId, CTX.tenantId)
      expect(result.success).toBe(true)
    })

    it('returns success:false (does not throw) when cancelBookingFromCalendar throws', async () => {
      vi.mocked(calendarSyncService.cancelBookingFromCalendar).mockRejectedValue(new Error('Network error'))

      const result = await googleCalendarProvider.onEvent(
        { type: 'booking.cancelled', data: { bookingId: 'b-2', tenantId: CTX.tenantId } },
        CTX
      )

      expect(result.success).toBe(false)
    })
  })

  describe('onWebhook', () => {
    it('calls handleWebhook with channelId and resourceId from headers', async () => {
      vi.mocked(calendarSyncService.handleWebhook).mockResolvedValue(undefined)

      await googleCalendarProvider.onWebhook(
        {
          headers: {
            'x-goog-channel-id': 'ch-1',
            'x-goog-resource-id': 'res-1',
            'x-goog-resource-state': 'exists',
          },
          body: null,
        },
        CTX
      )

      expect(calendarSyncService.handleWebhook).toHaveBeenCalledWith('ch-1', 'res-1')
    })

    it('does not throw when handleWebhook throws', async () => {
      vi.mocked(calendarSyncService.handleWebhook).mockRejectedValue(new Error('Timeout'))

      await expect(
        googleCalendarProvider.onWebhook(
          { headers: { 'x-goog-channel-id': 'ch-1', 'x-goog-resource-id': 'r-1', 'x-goog-resource-state': 'exists' }, body: null },
          CTX
        )
      ).resolves.not.toThrow()
    })
  })

  describe('getOAuthUrl', () => {
    it('returns empty string (synchronous OAuth not supported)', () => {
      const url = googleCalendarProvider.getOAuthUrl('state-abc', 'https://app.ironheart.ai/callback')
      expect(typeof url).toBe('string')
    })
  })

  describe('exchangeCode', () => {
    it('delegates to calendarSyncService.completeOAuth', async () => {
      vi.mocked(calendarSyncService.completeOAuth).mockResolvedValue(undefined)

      await googleCalendarProvider.exchangeCode('code-xyz', CTX.userId, CTX.tenantId, 'https://app.ironheart.ai/callback')

      expect(calendarSyncService.completeOAuth).toHaveBeenCalledWith(
        'code-xyz',
        CTX.userId,
        CTX.tenantId,
        'GOOGLE_CALENDAR',
        'https://app.ironheart.ai/callback'
      )
    })
  })

  describe('disconnect', () => {
    it('delegates to calendarSyncService.disconnect', async () => {
      vi.mocked(calendarSyncService.disconnect).mockResolvedValue({ userId: CTX.userId, provider: 'GOOGLE_CALENDAR', watchChannelStopped: true })

      await googleCalendarProvider.disconnect(CTX.userId, CTX.tenantId)

      expect(calendarSyncService.disconnect).toHaveBeenCalledWith(CTX.userId, CTX.tenantId, 'GOOGLE_CALENDAR')
    })
  })
})
