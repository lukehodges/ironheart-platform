import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

/**
 * AES-256-GCM token encryption for OAuth access/refresh tokens.
 *
 * Why AES-256-GCM:
 * - Provides both confidentiality (encryption) and integrity (authentication tag)
 * - Authentication tag prevents bit-flip attacks on the ciphertext
 * - GCM mode is parallelizable and widely supported
 *
 * Storage format: base64(iv[12] + authTag[16] + ciphertext[variable])
 *
 * Environment variable required:
 *   CALENDAR_TOKEN_ENCRYPTION_KEY — 64-character hex string (32 bytes / 256 bits)
 *   Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 */

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12          // 96-bit IV — recommended for GCM
const AUTH_TAG_LENGTH = 16    // 128-bit authentication tag

function getEncryptionKey(): Buffer {
  const hex = process.env.CALENDAR_TOKEN_ENCRYPTION_KEY
  if (!hex) {
    throw new Error(
      'CALENDAR_TOKEN_ENCRYPTION_KEY is not set. ' +
      'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    )
  }
  if (hex.length !== 64) {
    throw new Error(
      `CALENDAR_TOKEN_ENCRYPTION_KEY must be a 64-character hex string (32 bytes). Got ${hex.length} characters.`
    )
  }
  return Buffer.from(hex, 'hex')
}

/**
 * Encrypt a plaintext OAuth token for storage in the database.
 *
 * @param plaintext - The raw access or refresh token string
 * @returns base64-encoded encrypted token (safe for DB storage)
 */
export function encryptToken(plaintext: string): string {
  const key = getEncryptionKey()
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, key, iv)

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ])
  const authTag = cipher.getAuthTag()

  // Concatenate: iv (12 bytes) + authTag (16 bytes) + ciphertext (variable)
  return Buffer.concat([iv, authTag, encrypted]).toString('base64')
}

/**
 * Decrypt an encrypted OAuth token retrieved from the database.
 *
 * @param ciphertext - base64-encoded encrypted token (from encryptToken)
 * @returns The original plaintext token
 * @throws If the authentication tag verification fails (tampered ciphertext)
 */
export function decryptToken(ciphertext: string): string {
  const key = getEncryptionKey()
  const buf = Buffer.from(ciphertext, 'base64')

  if (buf.length < IV_LENGTH + AUTH_TAG_LENGTH + 1) {
    throw new Error('Invalid ciphertext: too short to contain IV + auth tag + data')
  }

  const iv = buf.subarray(0, IV_LENGTH)
  const authTag = buf.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH)
  const encrypted = buf.subarray(IV_LENGTH + AUTH_TAG_LENGTH)

  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)

  return decipher.update(encrypted).toString('utf8') + decipher.final('utf8')
}
