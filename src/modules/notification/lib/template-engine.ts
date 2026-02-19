import type { TemplateVariables, MessageTemplateRecord } from '../notification.types'

/**
 * Interpolate a template string with variables.
 *
 * Supported syntax: {{variableName}}
 * Unknown variables are replaced with an empty string (fail-safe, not fail-hard).
 *
 * Example:
 *   interpolate("Hi {{customerFirstName}}, your booking is on {{bookingDate}}.", vars)
 *   → "Hi Alice, your booking is on Monday, 15 February 2026."
 */
export function interpolate(
  template: string,
  variables: TemplateVariables
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key: string) => {
    const value = (variables as unknown as Record<string, unknown>)[key]
    if (value === undefined || value === null) return ''
    return String(value)
  })
}

/**
 * Resolve the subject and body for an email notification.
 *
 * Priority:
 * 1. DB template bodyHtml (tenant custom HTML override) → rendered with interpolate()
 * 2. DB template body (plain text) rendered with interpolate()
 * 3. null — caller falls back to the React Email system template
 *
 * Returns null when no DB template is available, signalling the caller to use
 * the React Email component instead.
 */
export function resolveEmailContent(
  template: MessageTemplateRecord | null,
  variables: TemplateVariables
): { subject: string; html: string; text: string } | null {
  if (!template) return null

  const subject = interpolate(template.subject ?? '', variables)
  const text = interpolate(template.body, variables)
  const html = template.bodyHtml
    ? interpolate(template.bodyHtml, variables)
    : wrapInBasicHtml(text, subject)

  return { subject, html, text }
}

/**
 * Resolve the body for an SMS notification.
 *
 * Returns null when no DB template is available.
 */
export function resolveSmsContent(
  template: MessageTemplateRecord | null,
  variables: TemplateVariables
): { body: string } | null {
  if (!template) return null
  return { body: interpolate(template.body, variables) }
}

/**
 * Wrap plain text in minimal HTML for email delivery when no HTML template exists.
 * This is only used for DB templates that have `body` but no `bodyHtml`.
 * The React Email system templates produce proper HTML — this is the fallback.
 */
function wrapInBasicHtml(text: string, subject: string): string {
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>')

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>${subject}</title></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #374151; padding: 24px;">
<p>${escaped}</p>
</body>
</html>`
}
