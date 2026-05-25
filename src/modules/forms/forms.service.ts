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
  duplicateTemplateSchema,
} from "./forms.schemas";
import { db } from "@/shared/db";
import { tenants } from "@/shared/db/schemas/tenant.schema";
import { engagements } from "@/shared/db/schemas/client-portal.schema";
import { customers } from "@/shared/db/schemas/customer.schema";
import { eq } from "drizzle-orm";

const log = logger.child({ module: "forms.service" });

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/**
 * Resolves the Ironheart platform tenant id. Templates live on this tenant
 * (master library + engagement-scoped clones). Falls back to the caller's
 * own tenantId if the env var is missing AND no tenant has slug 'ironheart'
 * — defensive only; in production the env var is always set.
 */
async function resolveIronheartTenantId(fallbackTenantId: string): Promise<string> {
  if (process.env.IRONHEART_TENANT_ID) return process.env.IRONHEART_TENANT_ID;
  const [row] = await db
    .select({ id: tenants.id })
    .from(tenants)
    .where(eq(tenants.slug, "ironheart"))
    .limit(1);
  return row?.id ?? fallbackTenantId;
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
    // Templates are stored on the Ironheart tenant (D-01: Luke is flat in /platform/*).
    // Consultant view reads the Ironheart library + engagement-scoped clones, NOT the
    // caller's ctx.tenantId. The opt-out flag falls back to ctx.tenantId for non-platform
    // callers (e.g. tenants viewing their own forms in the future).
    const tenantId =
      input.includeIronheartLibrary === false
        ? ctx.tenantId
        : await resolveIronheartTenantId(ctx.tenantId);

    return formsRepository.listTemplates(tenantId, {
      search: input.search,
      isActive: input.isActive,
      limit: input.limit,
      cursor: input.cursor,
      engagementId: input.engagementId,
    });
  },

  async duplicateTemplate(
    ctx: Context,
    input: z.infer<typeof duplicateTemplateSchema>,
  ): Promise<FormTemplateRecord> {
    const tenantId = await resolveIronheartTenantId(ctx.tenantId);

    const source = await formsRepository.findTemplateById(
      tenantId,
      input.sourceTemplateId,
    );
    if (!source) throw new NotFoundError("FormTemplate", input.sourceTemplateId);

    const clone = await formsRepository.createTemplate(tenantId, {
      name: input.name,
      description: source.description ?? null,
      fields: source.fields,
      isActive: source.isActive,
      attachedServices: source.attachedServices ?? null,
      sendTiming: source.sendTiming,
      sendOffsetHours: source.sendOffsetHours ?? null,
      requiresSignature: source.requiresSignature,
      engagementId: input.engagementId,
      // Mirror the source slug onto the clone so the form-send flow can match
      // engagement-scoped clones to the same role mapping as the master.
      slug: source.slug ?? null,
    });

    log.info(
      {
        tenantId,
        sourceTemplateId: input.sourceTemplateId,
        cloneTemplateId: clone.id,
        engagementId: input.engagementId,
      },
      "Form template duplicated as engagement clone",
    );

    return clone;
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
  ): Promise<{
    template: FormTemplateRecord;
    instance: CompletedFormRecord;
    /** Customer / company name resolved from the engagement attached to the template (if any).
     *  Null when the template isn't engagement-scoped or no engagement linkage can be resolved. */
    customerName: string | null;
  }> {
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

    // Resolve the engagement → customer name for the public form title (Slice 4).
    // Path: template.engagementId → engagements.customerId → customers.notes (companyName)
    //   or customers.firstName + lastName as fallback.
    let customerName: string | null = null;
    if (template.engagementId) {
      const rows = await db
        .select({
          companyName: customers.notes,
          firstName: customers.firstName,
          lastName: customers.lastName,
        })
        .from(engagements)
        .innerJoin(customers, eq(customers.id, engagements.customerId))
        .where(eq(engagements.id, template.engagementId))
        .limit(1);
      const row = rows[0];
      if (row) {
        customerName =
          (row.companyName ?? "").trim() ||
          `${row.firstName ?? ""} ${row.lastName ?? ""}`.trim() ||
          null;
      }
    }

    return { template, instance, customerName };
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
    // When scoping by engagementId, resolve from the Ironheart tenant —
    // form_templates + completed_forms for /platform/* live there, not on the
    // caller's ctx.tenantId. Without engagement scoping we keep the legacy
    // ctx.tenantId behaviour (used by older booking-based callers).
    const tenantId = input.engagementId
      ? await resolveIronheartTenantId(ctx.tenantId)
      : ctx.tenantId;

    return formsRepository.listResponses(tenantId, {
      templateId: input.templateId,
      bookingId: input.bookingId,
      customerId: input.customerId,
      status: input.status,
      limit: input.limit,
      cursor: input.cursor,
      engagementId: input.engagementId,
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
