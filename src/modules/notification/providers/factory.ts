import type { EmailProvider } from './email'
import type { SMSProvider } from './sms'

// ─── Email Provider Factory ────────────────────────────────────────────────────

function createEmailProvider(): EmailProvider {
  const providerName = process.env.NOTIFICATION_EMAIL_PROVIDER ?? 'resend'

  switch (providerName) {
    case 'resend': {
      const { ResendEmailProvider } = require('./email/resend.provider') as typeof import('./email/resend.provider')
      return new ResendEmailProvider()
    }
    case 'console': {
      const { ConsoleEmailProvider } = require('./email/console.provider') as typeof import('./email/console.provider')
      return new ConsoleEmailProvider()
    }
    default:
      throw new Error(
        `Unknown email provider: "${providerName}". Valid values: resend, console`
      )
  }
}

// ─── SMS Provider Factory ──────────────────────────────────────────────────────

function createSmsProvider(): SMSProvider {
  const providerName = process.env.NOTIFICATION_SMS_PROVIDER ?? 'twilio'

  switch (providerName) {
    case 'twilio': {
      const { TwilioSmsProvider } = require('./sms/twilio.provider') as typeof import('./sms/twilio.provider')
      return new TwilioSmsProvider()
    }
    case 'console': {
      const { ConsoleSmsProvider } = require('./sms/console.provider') as typeof import('./sms/console.provider')
      return new ConsoleSmsProvider()
    }
    default:
      throw new Error(
        `Unknown SMS provider: "${providerName}". Valid values: twilio, console`
      )
  }
}

// ─── Lazy Singletons ───────────────────────────────────────────────────────────
// Providers are created on first access, not at module load time.
// This prevents SDK constructors (Resend, Twilio) from throwing during
// Next.js build when env vars are not present.

let _emailProvider: EmailProvider | null = null
let _smsProvider: SMSProvider | null = null

export function getEmailProvider(): EmailProvider {
  if (!_emailProvider) {
    _emailProvider = createEmailProvider()
  }
  return _emailProvider
}

export function getSmsProvider(): SMSProvider {
  if (!_smsProvider) {
    _smsProvider = createSmsProvider()
  }
  return _smsProvider
}

// Legacy named exports for backward compatibility - delegate to lazy getters.
// Do NOT access these at module evaluation time from other modules;
// use the getter functions above instead.
export const emailProvider: EmailProvider = new Proxy({} as EmailProvider, {
  get(_target, prop) {
    return (getEmailProvider() as unknown as Record<string | symbol, unknown>)[prop]
  },
})

export const smsProvider: SMSProvider = new Proxy({} as SMSProvider, {
  get(_target, prop) {
    return (getSmsProvider() as unknown as Record<string | symbol, unknown>)[prop]
  },
})
