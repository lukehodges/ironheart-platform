import twilio from 'twilio'
import { logger } from '@/shared/logger'
import type { SMSProvider, SmsSendInput, SmsSendResult } from './index'

const log = logger.child({ module: 'twilio.sms.provider' })

export class TwilioSmsProvider implements SMSProvider {
  async send(input: SmsSendInput): Promise<SmsSendResult> {
    const accountSid = process.env.TWILIO_ACCOUNT_SID
    const authToken = process.env.TWILIO_AUTH_TOKEN
    const fromNumber = process.env.TWILIO_FROM_NUMBER

    if (!accountSid || !authToken || !fromNumber) {
      log.warn(
        { to: input.to, missing: { accountSid: !accountSid, authToken: !authToken, fromNumber: !fromNumber } },
        'Twilio credentials not configured - SMS not sent'
      )
      return { success: false, error: 'Twilio credentials not configured' }
    }

    try {
      const client = twilio(accountSid, authToken)
      const message = await client.messages.create({
        body: input.body,
        from: fromNumber,
        to: input.to,
      })

      log.info({ to: input.to, sid: message.sid }, 'SMS sent via Twilio')
      return { success: true, messageId: message.sid }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      log.error({ to: input.to, err }, 'Twilio SMS send failed')
      return { success: false, error: message }
    }
  }
}
