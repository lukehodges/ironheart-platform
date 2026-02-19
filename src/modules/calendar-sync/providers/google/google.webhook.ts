/**
 * Google Calendar webhook header constants.
 *
 * Reference: https://developers.google.com/calendar/api/guides/push
 */
export const GOOGLE_WEBHOOK_HEADERS = {
  CHANNEL_ID: 'X-Goog-Channel-ID',
  CHANNEL_TOKEN: 'X-Goog-Channel-Token',
  CHANNEL_EXPIRATION: 'X-Goog-Channel-Expiration',
  RESOURCE_ID: 'X-Goog-Resource-Id',
  RESOURCE_URI: 'X-Goog-Resource-URI',
  RESOURCE_STATE: 'X-Goog-Resource-State',
  MESSAGE_NUMBER: 'X-Goog-Message-Number',
} as const

/** Resource states sent by Google in webhook notifications */
export type GoogleWebhookResourceState =
  | 'sync'         // Initial notification after watch registration (not a real change)
  | 'exists'       // A resource exists or was modified
  | 'not_exists'   // A resource was deleted

/**
 * Check if a Google webhook notification represents a real calendar change
 * (as opposed to the initial "sync" confirmation message).
 */
export function isRealCalendarChange(resourceState: string | null): boolean {
  return resourceState === 'exists' || resourceState === 'not_exists'
}

/**
 * Calculate when a watch channel renewal should be triggered.
 * Returns a Date 1 day before the expiration to ensure continuity.
 */
export function getWatchRenewalDate(expiresAt: string): Date {
  const expiry = new Date(expiresAt)
  expiry.setDate(expiry.getDate() - 1) // Renew 1 day before expiry
  return expiry
}
