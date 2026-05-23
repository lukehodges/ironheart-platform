/**
 * Consulting module onboarding service.
 *
 * The canonical keyword-matching logic now lives in @/modules/onboarding/onboarding.service.
 * This file re-exports the pure helper functions (no db dependency) by re-implementing
 * them from consulting.types constants, so this module stays db-free and back-compat callers
 * continue to work without needing db mocks.
 *
 * Constants (DEFAULT_QUESTIONNAIRE_MAPPINGS, TEAM_MEMBER_TEMPLATE_SLUG, etc.) also live in
 * @/modules/onboarding/onboarding.service — imported from there when a caller wants the
 * onboarding module. For consulting callers the same values are available via consulting.types.
 */
import { logger } from "@/shared/logger"
import {
  DEFAULT_QUESTIONNAIRE_MAPPINGS,
  TEAM_MEMBER_TEMPLATE_SLUG,
  QUICK_PULSE_TEMPLATE_SLUG,
  type AddTeamContactInput,
} from "./consulting.types"

const log = logger.child({ module: "onboarding.service" })

// Re-export constants so that callers using the consulting path still get them
export {
  DEFAULT_QUESTIONNAIRE_MAPPINGS,
  TEAM_MEMBER_TEMPLATE_SLUG,
  QUICK_PULSE_TEMPLATE_SLUG,
}
// OWNER_TEMPLATE_SLUG didn't exist in consulting.types — export the value directly
export const OWNER_TEMPLATE_SLUG = "questionnaire-owner-director"

/**
 * Maps a role string to the appropriate questionnaire template slug.
 * Pure function — no db dependency. Canonical copy lives in onboarding.service.ts.
 */
export function matchQuestionnaireTemplate(role: string): string {
  const roleLower = role.toLowerCase()
  for (const mapping of DEFAULT_QUESTIONNAIRE_MAPPINGS) {
    if (mapping.roleKeywords.some((kw) => roleLower.includes(kw))) {
      return mapping.templateSlug
    }
  }
  return TEAM_MEMBER_TEMPLATE_SLUG
}

export const onboardingService = {
  suggestQuestionnaireAssignments(
    contacts: AddTeamContactInput[]
  ): { contact: AddTeamContactInput; templateSlug: string }[] {
    return contacts.map((contact) => ({
      contact,
      templateSlug: matchQuestionnaireTemplate(contact.role),
    }))
  },
}
