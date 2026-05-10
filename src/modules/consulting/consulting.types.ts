import type { EngagementStage, QualificationData } from "@/modules/client-portal/client-portal.types";

export type { EngagementStage, QualificationData };

export interface QuestionnaireMapping {
  roleKeywords: string[];
  templateSlug: string;
}

export const DEFAULT_QUESTIONNAIRE_MAPPINGS: QuestionnaireMapping[] = [
  { roleKeywords: ["owner", "director", "ceo", "founder", "managing"], templateSlug: "questionnaire-owner-director" },
  { roleKeywords: ["operations", "ops", "delivery", "manager"], templateSlug: "questionnaire-operations" },
  { roleKeywords: ["finance", "admin", "accounts", "bookkeeper", "accountant"], templateSlug: "questionnaire-finance-admin" },
  { roleKeywords: ["sales", "marketing", "bd", "business dev", "growth"], templateSlug: "questionnaire-sales-marketing" },
];

export const TEAM_MEMBER_TEMPLATE_SLUG = "questionnaire-team-member";
export const QUICK_PULSE_TEMPLATE_SLUG = "questionnaire-quick-pulse";

export interface StageTransitionInput {
  engagementId: string;
  targetStage: EngagementStage;
  notes?: string;
}

export interface SetAuditWindowInput {
  engagementId: string;
  startDate: string;
  endDate: string;
}

export interface ProvisionClientTenantInput {
  engagementId: string;
  companyName: string;
  ownerEmail: string;
  ownerName: string;
}

export interface AssignQuestionnaireInput {
  engagementId: string;
  contactUserId: string;
  formTemplateId: string;
}

export interface AddTeamContactInput {
  name: string;
  email: string;
  role: string;
}

export interface OnboardingStatus {
  totalContacts: number;
  questionnairesCompleted: number;
  questionnairesPending: number;
  callsBooked: number;
  callsPending: number;
  contacts: {
    userId: string;
    name: string;
    email: string;
    role: string;
    questionnaireStatus: "PENDING" | "SENT" | "COMPLETED";
    callBooked: boolean;
  }[];
}
