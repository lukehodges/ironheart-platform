import { logger } from '@/shared/logger'
import type { EmailProvider, EmailSendInput, EmailSendResult } from './index'

const log = logger.child({ module: 'console.email.provider' })

/**
 * Development/test email provider.
 * Logs the email to the console instead of sending it.
 * Never sends real emails — safe to use in development and CI.
 *
 * Activate with: NOTIFICATION_EMAIL_PROVIDER=console
 */
export class ConsoleEmailProvider implements EmailProvider {
  async send(input: EmailSendInput): Promise<EmailSendResult> {
    const messageId = `console-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    log.info(
      {
        to: input.to,
        subject: input.subject,
        replyTo: input.replyTo,
        htmlSnippet: input.html.substring(0, 300) + (input.html.length > 300 ? '...' : ''),
        messageId,
      },
      '[DEV] Email would be sent (ConsoleEmailProvider — no real email sent)'
    )
    return { success: true, messageId }
  }
}
