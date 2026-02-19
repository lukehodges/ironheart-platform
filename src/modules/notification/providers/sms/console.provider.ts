import { logger } from '@/shared/logger'
import type { SMSProvider, SmsSendInput, SmsSendResult } from './index'

const log = logger.child({ module: 'console.sms.provider' })

/**
 * Development/test SMS provider.
 * Logs the SMS to the console instead of sending it.
 * Never sends real SMS messages — safe to use in development and CI.
 *
 * Activate with: NOTIFICATION_SMS_PROVIDER=console
 */
export class ConsoleSmsProvider implements SMSProvider {
  async send(input: SmsSendInput): Promise<SmsSendResult> {
    const messageId = `console-sms-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    log.info(
      {
        to: input.to,
        body: input.body,
        messageId,
      },
      '[DEV] SMS would be sent (ConsoleSmsProvider — no real SMS sent)'
    )
    return { success: true, messageId }
  }
}
