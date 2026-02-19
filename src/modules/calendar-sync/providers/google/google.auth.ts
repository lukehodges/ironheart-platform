import { google } from 'googleapis'
import type { OAuthTokens } from '../index'
import { encryptToken, decryptToken } from '../../lib/oauth'
import { logger } from '@/shared/logger'

const log = logger.child({ module: 'google.calendar.auth' })

/**
 * Required Google OAuth2 scopes for calendar read/write access.
 */
export const GOOGLE_CALENDAR_SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
]

/**
 * Create a configured Google OAuth2 client.
 *
 * @param redirectUri - Optional redirect URI for the OAuth callback.
 *   Required when generating auth URLs or exchanging codes.
 *   Not needed when using stored tokens for API calls.
 */
export function getGoogleOAuth2Client(redirectUri?: string) {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error(
      'Google OAuth credentials are not configured. ' +
      'Set GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET environment variables.'
    )
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri)
}

/**
 * Encrypt OAuthTokens for storage in the database.
 * Both access and refresh tokens are encrypted independently.
 */
export function encryptOAuthTokens(tokens: OAuthTokens): {
  encryptedAccessToken: string
  encryptedRefreshToken: string
  tokenExpiresAt: Date
} {
  return {
    encryptedAccessToken: encryptToken(tokens.accessToken),
    encryptedRefreshToken: encryptToken(tokens.refreshToken),
    tokenExpiresAt: new Date(tokens.expiresAt),
  }
}

/**
 * Decrypt stored encrypted tokens back into OAuthTokens.
 * Throws if either token cannot be decrypted (e.g. key rotation).
 */
export function decryptOAuthTokens(stored: {
  encryptedAccessToken: string | null
  encryptedRefreshToken: string | null
  tokenExpiresAt: Date | null
}): OAuthTokens {
  if (!stored.encryptedAccessToken || !stored.encryptedRefreshToken) {
    throw new Error('Integration is missing encrypted tokens — user must re-authenticate')
  }

  try {
    return {
      accessToken: decryptToken(stored.encryptedAccessToken),
      refreshToken: decryptToken(stored.encryptedRefreshToken),
      expiresAt: stored.tokenExpiresAt?.getTime() ?? 0,
    }
  } catch (err) {
    log.error({ err }, 'Failed to decrypt OAuth tokens — possible key rotation issue')
    throw new Error('Failed to decrypt OAuth tokens. User must re-authenticate.')
  }
}

/**
 * Check if the access token is expired or will expire within the next 5 minutes.
 * Returns true if a refresh is needed.
 */
export function isTokenExpired(expiresAt: number): boolean {
  const BUFFER_MS = 5 * 60 * 1000 // 5-minute buffer
  return Date.now() + BUFFER_MS >= expiresAt
}
