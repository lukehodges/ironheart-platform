/**
 * SMS Provider Interface
 *
 * Every SMS provider implementation must satisfy this contract.
 * Swap Twilio → Vonage → AWS SNS by swapping the implementation
 * behind this interface — zero application code changes required.
 *
 * Usage:
 *   import { smsProvider } from '../factory'
 *   const result = await smsProvider.send({ to, body })
 */

export interface SmsSendInput {
  /**
   * Recipient phone number in E.164 format.
   * Examples: +447700900123 (UK), +14155552671 (US)
   * E.164 enforcement is the caller's responsibility before passing to the provider.
   */
  to: string
  /** SMS body text (max 1600 chars; longer messages split into segments) */
  body: string
}

export interface SmsSendResult {
  success: boolean
  /** Provider-assigned message SID / ID for tracking */
  messageId?: string
  /** Error message if success is false */
  error?: string
}

/**
 * Contract that every SMS provider must implement.
 *
 * Implementations:
 * - TwilioSmsProvider   (production)
 * - ConsoleSmsProvider  (development / CI — logs to console, no real SMS)
 */
export interface SMSProvider {
  send(input: SmsSendInput): Promise<SmsSendResult>
}
