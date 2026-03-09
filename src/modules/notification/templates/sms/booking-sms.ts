import type { TemplateVariables, MessageTrigger } from '../../notification.types'

/**
 * SMS template functions - each returns a string body (max 160 chars for single segment).
 * Variables are substituted directly - no template engine needed for SMS.
 */

const SMS_TEMPLATES: Partial<Record<MessageTrigger, (vars: TemplateVariables) => string>> = {
  BOOKING_CONFIRMED: (vars) =>
    `Confirmed: ${vars.serviceName} on ${vars.bookingDate} at ${vars.bookingTime}. Ref: ${vars.bookingNumber}. ${vars.tenantName}`,

  BOOKING_REMINDER_24H: (vars) =>
    `Reminder: ${vars.serviceName} tomorrow at ${vars.bookingTime}${vars.locationAddress ? ` at ${vars.locationAddress}` : ''}. ${vars.tenantName}`,

  BOOKING_REMINDER_2H: (vars) =>
    `Reminder: ${vars.serviceName} in 2 hours at ${vars.bookingTime}${vars.locationAddress ? ` at ${vars.locationAddress}` : ''}. ${vars.tenantName}`,

  BOOKING_CANCELLED: (vars) =>
    `Your ${vars.serviceName} booking on ${vars.bookingDate} (ref ${vars.bookingNumber}) has been cancelled. ${vars.tenantPhone ? `Call ${vars.tenantPhone} to rebook.` : `Contact ${vars.tenantName} to rebook.`}`,

  BOOKING_APPROVED: (vars) =>
    `Approved: Your ${vars.serviceName} on ${vars.bookingDate} at ${vars.bookingTime} is confirmed. Ref: ${vars.bookingNumber}. ${vars.tenantName}`,

  BOOKING_REJECTED: (vars) =>
    `Sorry, your ${vars.serviceName} request for ${vars.bookingDate} could not be approved. ${vars.tenantPhone ? `Call ${vars.tenantPhone}` : `Contact ${vars.tenantName}`} to explore alternatives.`,

  REVIEW_REQUEST: (vars) =>
    `How was your ${vars.serviceName}? Leave a review: ${vars.reviewUrl ?? vars.portalUrl ?? ''}`,
}

/**
 * Get the SMS body for a given trigger and variables.
 * Returns null if no SMS template exists for the trigger.
 */
export function getSmsBody(trigger: MessageTrigger, vars: TemplateVariables): string | null {
  const template = SMS_TEMPLATES[trigger]
  if (!template) return null
  return template(vars)
}
