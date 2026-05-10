import { describe, it, expect } from "vitest";
import { QUESTIONNAIRE_TEMPLATES } from "../seed/questionnaire-templates";
import { DEFAULT_QUESTIONNAIRE_MAPPINGS, TEAM_MEMBER_TEMPLATE_SLUG, QUICK_PULSE_TEMPLATE_SLUG } from "../consulting.types";

describe("questionnaire seed templates", () => {
  it("defines exactly 7 templates", () => {
    expect(QUESTIONNAIRE_TEMPLATES).toHaveLength(7);
  });

  it("each template has a unique slug", () => {
    const slugs = QUESTIONNAIRE_TEMPLATES.map((t) => t.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("each template has at least 5 fields", () => {
    for (const template of QUESTIONNAIRE_TEMPLATES) {
      expect(template.fields.length).toBeGreaterThanOrEqual(5);
    }
  });

  it("all field IDs are unique within each template", () => {
    for (const template of QUESTIONNAIRE_TEMPLATES) {
      const ids = template.fields.map((f) => f.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it("all field types are valid FormFieldType values", () => {
    const validTypes = ["TEXT", "TEXTAREA", "SELECT", "MULTISELECT", "DATE", "BOOLEAN", "EMAIL", "PHONE"];
    for (const template of QUESTIONNAIRE_TEMPLATES) {
      for (const field of template.fields) {
        expect(validTypes).toContain(field.type);
      }
    }
  });

  it("SELECT fields have options defined", () => {
    for (const template of QUESTIONNAIRE_TEMPLATES) {
      for (const field of template.fields) {
        if (field.type === "SELECT" || field.type === "MULTISELECT") {
          expect(field.options).toBeDefined();
          expect(field.options!.length).toBeGreaterThan(0);
        }
      }
    }
  });

  it("every mapping slug has a matching template", () => {
    const slugs = QUESTIONNAIRE_TEMPLATES.map((t) => t.slug);
    for (const mapping of DEFAULT_QUESTIONNAIRE_MAPPINGS) {
      expect(slugs).toContain(mapping.templateSlug);
    }
    expect(slugs).toContain(TEAM_MEMBER_TEMPLATE_SLUG);
    expect(slugs).toContain(QUICK_PULSE_TEMPLATE_SLUG);
  });

  it("owner-director template has revenue and employee fields", () => {
    const owner = QUESTIONNAIRE_TEMPLATES.find((t) => t.slug === "questionnaire-owner-director")!;
    const fieldIds = owner.fields.map((f) => f.id);
    expect(fieldIds).toContain("annual_revenue");
    expect(fieldIds).toContain("employee_count");
  });

  it("quick-pulse template has exactly 10 fields", () => {
    const pulse = QUESTIONNAIRE_TEMPLATES.find((t) => t.slug === "questionnaire-quick-pulse")!;
    expect(pulse.fields).toHaveLength(10);
  });
});
