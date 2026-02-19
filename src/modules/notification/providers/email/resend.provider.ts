import { Resend } from 'resend'
import { logger } from '@/shared/logger'
import type { EmailProvider, EmailSendInput, EmailSendResult } from './index'

const log = logger.child({ module: 'resend.email.provider' })

export class ResendEmailProvider implements EmailProvider {
  private client: Resend | null = null

  private getClient(): Resend {
    if (!this.client) {
      this.client = new Resend(process.env.RESEND_API_KEY)
    }
    return this.client
  }

  async send(input: EmailSendInput): Promise<EmailSendResult> {
    if (!process.env.RESEND_API_KEY) {
      log.warn({ to: input.to }, 'RESEND_API_KEY not set — email not sent')
      return { success: false, error: 'RESEND_API_KEY not configured' }
    }

    const fromEmail = input.fromEmail ?? process.env.RESEND_FROM_EMAIL ?? 'noreply@ironheart.app'
    const fromName = input.fromName ?? process.env.RESEND_FROM_NAME ?? 'Ironheart'
    const from = `${fromName} <${fromEmail}>`

    try {
      const { data, error } = await this.getClient().emails.send({
        from,
        to: [input.to],
        subject: input.subject,
        html: input.html,
        ...(input.text && { text: input.text }),
        ...(input.replyTo && { replyTo: input.replyTo }),
      })

      if (error) {
        log.error({ to: input.to, error }, 'Resend API returned an error')
        return { success: false, error: error.message }
      }

      log.info({ to: input.to, messageId: data?.id }, 'Email sent via Resend')
      return { success: true, messageId: data?.id }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      log.error({ to: input.to, err }, 'Resend email send threw an exception')
      return { success: false, error: message }
    }
  }
}
