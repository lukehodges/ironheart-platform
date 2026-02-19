/**
 * Email Provider Interface
 *
 * Every email provider implementation must satisfy this contract.
 * Swap Resend → Postmark → SES → SendGrid by swapping the implementation
 * behind this interface — zero application code changes required.
 *
 * Usage:
 *   import { emailProvider } from '../factory'
 *   const result = await emailProvider.send({ to, subject, html })
 */

export interface EmailSendInput {
  /** Recipient email address */
  to: string
  /** Email subject line */
  subject: string
  /** Rendered HTML body (pre-rendered via @react-email/render) */
  html: string
  /** Plain text fallback — auto-generated from html if not provided */
  text?: string
  /** Reply-to address */
  replyTo?: string
  /** From name (overrides provider default) */
  fromName?: string
  /** From email address (overrides provider default) */
  fromEmail?: string
}

export interface EmailSendResult {
  success: boolean
  /** Provider-assigned message ID for tracking */
  messageId?: string
  /** Error message if success is false */
  error?: string
}

/**
 * Contract that every email provider must implement.
 *
 * Implementations:
 * - ResendEmailProvider  (production)
 * - ConsoleEmailProvider (development / CI — logs to console, no real emails)
 */
export interface EmailProvider {
  send(input: EmailSendInput): Promise<EmailSendResult>
}
