import { logger } from "@/shared/logger";
import {
  DEFAULT_QUESTIONNAIRE_MAPPINGS,
  TEAM_MEMBER_TEMPLATE_SLUG,
  type AddTeamContactInput,
} from "./consulting.types";

const log = logger.child({ module: "onboarding.service" });

export function matchQuestionnaireTemplate(role: string): string {
  const roleLower = role.toLowerCase();
  for (const mapping of DEFAULT_QUESTIONNAIRE_MAPPINGS) {
    if (mapping.roleKeywords.some((kw) => roleLower.includes(kw))) {
      return mapping.templateSlug;
    }
  }
  return TEAM_MEMBER_TEMPLATE_SLUG;
}

export const onboardingService = {
  suggestQuestionnaireAssignments(
    contacts: AddTeamContactInput[]
  ): { contact: AddTeamContactInput; templateSlug: string }[] {
    return contacts.map((contact) => ({
      contact,
      templateSlug: matchQuestionnaireTemplate(contact.role),
    }));
  },
};
