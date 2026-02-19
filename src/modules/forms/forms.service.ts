import { inngest } from "@/shared/inngest";
import { logger } from "@/shared/logger";
import { NotFoundError, ValidationError } from "@/shared/errors";
import type { Context } from "@/shared/trpc";
import { formsRepository } from "./forms.repository";
import type {
  FormField,
  FormTemplateRecord,
  CompletedFormRecord,
} from "./forms.types";
import type { z } from "zod";
import type {
  listTemplatesSchema,
  createTemplateSchema,
  updateTemplateSchema,
  sendFormSchema,
  listResponsesSchema,
} from "./forms.schemas";

const log = logger.child({ module: "forms.service" });

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function validateFormResponses(
  fields: FormField[],
  responses: Record<string, unknown>,
): string[] {
  const errors: string[] = [];
  for (const field of fields) {
    const value = responses[field.id];

    if (field.required && (value == null || value === "")) {
      errors.push(`${field.label} is required`);
      continue;
    }

    if (value != null && value !== "") {
      switch (field.type) {
        case "EMAIL":
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value))) {
            errors.push(`${field.label} must be a valid email`);
          }
          break;
        case "SELECT":
          if (!field.options?.includes(String(value))) {
            errors.push(`${field.label}: invalid option`);
          }
          break;
        case "TEXT":
        case "TEXTAREA":
          if (
            field.validation?.minLength &&
            String(value).length < field.validation.minLength
          ) {
            errors.push(
              `${field.label} must be at least ${field.validation.minLength} characters`,
            );
          }
          if (
            field.validation?.maxLength &&
            String(value).length > field.validation.maxLength
          ) {
            errors.push(
              `${field.label} must be at most ${field.validation.maxLength} characters`,
            );
          }
          break;
      }
    }
  }
  return errors;
}

// ---------------------------------------------------------------------------
// SERVICE
// ---------------------------------------------------------------------------

export const formsService = {

  // ---------------------------------------------------------------------------
  // TEMPLATE MANAGEMENT
  // ---------------------------------------------------------------------------

  async listTemplates(
    ctx: Context,
    input: z.infer<typeof listTemplatesSchema>,
  ): Promise<{ rows: FormTemplateRecord[]; hasMore: boolean }> {
    return formsRepository.listTemplates(ctx.tenantId, {
      search: input.search,
      isActive: input.isActive,
      limit: input.limit,
      cursor: input.cursor,
    });
  },

  async getTemplate(
    ctx: Context,
    templateId: string,
  ): Promise<FormTemplateRecord> {
    const template = await formsRepository.findTemplateById(
      ctx.tenantId,
      templateId,
    );
    if (!template) throw new NotFoundError("FormTemplate", templateId);
    return template;
  },

  async createTemplate(
    ctx: Context,
    input: z.infer<typeof createTemplateSchema>,
  ): Promise<FormTemplateRecord> {
    const template = await formsRepository.createTemplate(ctx.tenantId, {
      name: input.name,
      description: input.description ?? null,
      fields: input.fields,
      isActive: input.isActive,
      attachedServices: input.attachedServices ?? null,
      sendTiming: input.sendTiming,
      sendOffsetHours: input.sendOffsetHours ?? null,
      requiresSignature: input.requiresSignature,
    });

    log.info(
      { tenantId: ctx.tenantId, templateId: template.id },
      "Form template created via service",
    );

    return template;
  },

  async updateTemplate(
    ctx: Context,
    templateId: string,
    input: z.infer<typeof updateTemplateSchema>,
  ): Promise<FormTemplateRecord> {
    const updated = await formsRepository.updateTemplate(
      ctx.tenantId,
      templateId,
      {
        name: input.name,
        description: input.description,
        fields: input.fields,
        isActive: input.isActive,
        attachedServices: input.attachedServices,
        sendTiming: input.sendTiming,
        sendOffsetHours: input.sendOffsetHours,
        requiresSignature: input.requiresSignature,
      },
    );

    log.info(
      { tenantId: ctx.tenantId, templateId },
      "Form template updated via service",
    );

    return updated;
  },

  async deleteTemplate(ctx: Context, templateId: string): Promise<void> {
    // Verify the template exists before deleting
    const template = await formsRepository.findTemplateById(
      ctx.tenantId,
      templateId,
    );
    if (!template) throw new NotFoundError("FormTemplate", templateId);

    await formsRepository.deleteTemplate(ctx.tenantId, templateId);

    log.info(
      { tenantId: ctx.tenantId, templateId },
      "Form template deleted via service",
    );
  },

  // ---------------------------------------------------------------------------
  // SEND FORM
  // Creates a completed form instance with a session key and 7-day expiry.
  // The customer receives a link containing the session key to fill in the form.
  // ---------------------------------------------------------------------------

  async sendForm(
    ctx: Context,
    input: z.infer<typeof sendFormSchema>,
  ): Promise<CompletedFormRecord> {
    // Verify the template exists
    const template = await formsRepository.findTemplateById(
      ctx.tenantId,
      input.templateId,
    );
    if (!template) throw new NotFoundError("FormTemplate", input.templateId);

    const sessionKey = crypto.randomUUID();
    const expiresAt = addDays(new Date(), 7);

    const instance = await formsRepository.createInstance({
      tenantId: ctx.tenantId,
      templateId: input.templateId,
      bookingId: input.bookingId ?? null,
      customerId: input.customerId ?? null,
      sessionKey,
      status: "PENDING",
      responses: null,
      signature: null,
      completedAt: null,
      expiresAt,
    });

    log.info(
      {
        tenantId: ctx.tenantId,
        instanceId: instance.id,
        templateId: input.templateId,
        sessionKey,
      },
      "Form instance created and sent",
    );

    return instance;
  },

  // ---------------------------------------------------------------------------
  // PUBLIC FORM ACCESS (token-based)
  // ---------------------------------------------------------------------------

  async getFormByToken(
    token: string,
  ): Promise<{ template: FormTemplateRecord; instance: CompletedFormRecord }> {
    const instance = await formsRepository.findByToken(token);
    if (!instance) throw new NotFoundError("Form", token);

    // Check expiry
    if (instance.expiresAt && instance.expiresAt < new Date()) {
      throw new ValidationError("Form link has expired");
    }

    const template = await formsRepository.findTemplateById(
      instance.tenantId,
      instance.templateId,
    );
    if (!template) throw new NotFoundError("FormTemplate", instance.templateId);

    return { template, instance };
  },

  async submitFormResponse(
    token: string,
    responses: Record<string, unknown>,
    signature?: string,
  ): Promise<void> {
    // 1. Load instance by token
    const instance = await formsRepository.findByToken(token);
    if (!instance) throw new NotFoundError("Form", token);

    // 2. Check status must be PENDING
    if (instance.status !== "PENDING") {
      throw new ValidationError("Form has already been completed");
    }

    // 3. Check not expired
    if (instance.expiresAt && instance.expiresAt < new Date()) {
      throw new ValidationError("Form link has expired");
    }

    // 4. Load template for validation
    const template = await formsRepository.findTemplateById(
      instance.tenantId,
      instance.templateId,
    );
    if (!template) throw new NotFoundError("FormTemplate", instance.templateId);

    // 5. Validate form responses against field definitions
    const errors = validateFormResponses(template.fields, responses);
    if (errors.length > 0) {
      throw new ValidationError(
        `Form validation failed: ${errors.join(", ")}`,
      );
    }

    // 6. Mark the form as completed with the responses
    await formsRepository.markCompleted(instance.id, responses, signature);

    // 7. Emit event for workflow triggers and notifications
    await inngest.send({
      name: "forms/submitted",
      data: {
        formId: instance.id,
        bookingId: instance.bookingId ?? null,
        tenantId: instance.tenantId,
        customerId: instance.customerId ?? null,
      },
    });

    log.info(
      { instanceId: instance.id, tenantId: instance.tenantId },
      "Form response submitted",
    );
  },

  // ---------------------------------------------------------------------------
  // RESPONSES (admin)
  // ---------------------------------------------------------------------------

  async listResponses(
    ctx: Context,
    input: z.infer<typeof listResponsesSchema>,
  ): Promise<{ rows: CompletedFormRecord[]; hasMore: boolean }> {
    return formsRepository.listResponses(ctx.tenantId, {
      templateId: input.templateId,
      bookingId: input.bookingId,
      customerId: input.customerId,
      status: input.status,
      limit: input.limit,
      cursor: input.cursor,
    });
  },

  async getResponse(
    ctx: Context,
    responseId: string,
  ): Promise<CompletedFormRecord> {
    const response = await formsRepository.findById(ctx.tenantId, responseId);
    if (!response) throw new NotFoundError("CompletedForm", responseId);
    return response;
  },
};
