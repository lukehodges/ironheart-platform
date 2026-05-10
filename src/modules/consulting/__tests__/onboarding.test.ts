import { describe, it, expect } from "vitest";
import { matchQuestionnaireTemplate, onboardingService } from "../onboarding.service";

describe("matchQuestionnaireTemplate", () => {
  it("maps Owner to owner-director questionnaire", () => {
    expect(matchQuestionnaireTemplate("Owner")).toBe("questionnaire-owner-director");
  });

  it("maps Managing Director to owner-director questionnaire", () => {
    expect(matchQuestionnaireTemplate("Managing Director")).toBe("questionnaire-owner-director");
  });

  it("maps CEO to owner-director questionnaire", () => {
    expect(matchQuestionnaireTemplate("CEO")).toBe("questionnaire-owner-director");
  });

  it("maps Operations Manager to operations questionnaire", () => {
    expect(matchQuestionnaireTemplate("Operations Manager")).toBe("questionnaire-operations");
  });

  it("maps Ops Lead to operations questionnaire", () => {
    expect(matchQuestionnaireTemplate("Ops Lead")).toBe("questionnaire-operations");
  });

  it("maps Finance Manager to finance questionnaire", () => {
    expect(matchQuestionnaireTemplate("Finance Manager")).toBe("questionnaire-finance-admin");
  });

  it("maps Bookkeeper to finance questionnaire", () => {
    expect(matchQuestionnaireTemplate("Bookkeeper")).toBe("questionnaire-finance-admin");
  });

  it("maps Sales Lead to sales questionnaire", () => {
    expect(matchQuestionnaireTemplate("Sales Lead")).toBe("questionnaire-sales-marketing");
  });

  it("maps Marketing Manager to sales questionnaire", () => {
    expect(matchQuestionnaireTemplate("Marketing Manager")).toBe("questionnaire-sales-marketing");
  });

  it("maps unknown role to team member questionnaire", () => {
    expect(matchQuestionnaireTemplate("Warehouse Operative")).toBe("questionnaire-team-member");
  });

  it("maps generic Team Member to team member questionnaire", () => {
    expect(matchQuestionnaireTemplate("Team Member")).toBe("questionnaire-team-member");
  });

  it("is case-insensitive", () => {
    expect(matchQuestionnaireTemplate("OPERATIONS MANAGER")).toBe("questionnaire-operations");
    expect(matchQuestionnaireTemplate("ceo")).toBe("questionnaire-owner-director");
  });
});

describe("onboardingService.suggestQuestionnaireAssignments", () => {
  it("assigns correct templates to a mixed team", () => {
    const contacts = [
      { name: "Sarah Chen", email: "sarah@acme.com", role: "Owner" },
      { name: "James Wright", email: "james@acme.com", role: "Operations Manager" },
      { name: "Lisa Park", email: "lisa@acme.com", role: "Finance Manager" },
      { name: "Tom Reeves", email: "tom@acme.com", role: "Sales Lead" },
      { name: "Amy Foster", email: "amy@acme.com", role: "Warehouse Staff" },
    ];

    const result = onboardingService.suggestQuestionnaireAssignments(contacts);

    expect(result).toHaveLength(5);
    expect(result[0].templateSlug).toBe("questionnaire-owner-director");
    expect(result[1].templateSlug).toBe("questionnaire-operations");
    expect(result[2].templateSlug).toBe("questionnaire-finance-admin");
    expect(result[3].templateSlug).toBe("questionnaire-sales-marketing");
    expect(result[4].templateSlug).toBe("questionnaire-team-member");
  });
});
