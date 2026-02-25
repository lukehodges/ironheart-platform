import { logger } from "@/shared/logger";
import { NotFoundError, ForbiddenError, ValidationError, BadRequestError } from "@/shared/errors";
import { auditLog } from "@/shared/audit/audit-logger";
import { inngest } from "@/shared/inngest";
import type { Context } from "@/shared/trpc";
import type { z } from "zod";
import type {
  StaffMember,
  AvailabilityEntry,
  AvailabilitySlot,
  Department,
  StaffNote,
  PayRate,
  ChecklistTemplate,
  ChecklistProgress,
  ChecklistItemProgress,
  CustomFieldDefinition,
  CustomFieldValue,
} from "./team.types";
import type {
  listStaffSchema,
  createStaffSchema,
  updateStaffSchema,
  getAvailabilitySchema,
  setAvailabilitySchema,
  blockDatesSchema,
  getScheduleSchema,
  createDepartmentSchema,
  updateDepartmentSchema,
  departmentMemberSchema,
  createNoteSchema,
  updateNoteSchema,
  listNotesSchema,
  createPayRateSchema,
  listPayRatesSchema,
  createChecklistTemplateSchema,
  updateChecklistTemplateSchema,
  getChecklistProgressSchema,
  completeChecklistItemSchema,
  createCustomFieldDefSchema,
  updateCustomFieldDefSchema,
  setCustomFieldValuesSchema,
  getCustomFieldValuesSchema,
} from "./team.schemas";
import { teamRepository } from "./team.repository";

const log = logger.child({ module: "team.service" });

export const teamService = {

  // ---------------------------------------------------------------------------
  // STAFF MANAGEMENT
  // ---------------------------------------------------------------------------

  async getStaffMember(ctx: Context, userId: string): Promise<StaffMember> {
    const member = await teamRepository.findById(ctx.tenantId, userId);
    if (!member) throw new NotFoundError("Staff member", userId);

    if (member.tenantId !== ctx.tenantId) {
      throw new ForbiddenError("Access denied to this staff member");
    }

    log.info({ userId, tenantId: ctx.tenantId }, "Staff member fetched");
    return member;
  },

  async listStaff(
    ctx: Context,
    input: z.infer<typeof listStaffSchema>
  ): Promise<{ rows: StaffMember[]; hasMore: boolean }> {
    const result = await teamRepository.listByTenant(ctx.tenantId, {
      search: input.search,
      status: input.status,
      employeeType: input.employeeType,
      departmentId: input.departmentId,
      limit: input.limit,
      cursor: input.cursor,
    });

    log.info(
      { tenantId: ctx.tenantId, count: result.rows.length, hasMore: result.hasMore },
      "Staff list fetched"
    );
    return result;
  },

  async createStaff(
    ctx: Context,
    input: z.infer<typeof createStaffSchema>
  ): Promise<StaffMember> {
    const member = await teamRepository.create(ctx.tenantId, {
      email: input.email,
      name: input.name,
      phone: input.phone,
      employeeType: input.employeeType,
      hourlyRate: input.hourlyRate,
      jobTitle: input.jobTitle,
      departmentId: input.departmentId,
    });

    await auditLog({
      tenantId: ctx.tenantId,
      actorId: ctx.user!.id,
      action: 'created',
      resourceType: 'team-member',
      resourceId: member.id,
      resourceName: member.name,
    });

    await inngest.send({
      name: "team/created",
      data: {
        userId: member.id,
        tenantId: ctx.tenantId,
        employeeType: input.employeeType ?? 'EMPLOYED',
      },
    });

    log.info({ userId: ctx.user?.id, tenantId: ctx.tenantId, newMemberId: member.id }, "Staff created");
    return member;
  },

  async updateStaff(
    ctx: Context,
    userId: string,
    input: z.infer<typeof updateStaffSchema>
  ): Promise<StaffMember> {
    const existing = await teamRepository.findById(ctx.tenantId, userId);
    if (!existing) throw new NotFoundError("Staff member", userId);

    const updated = await teamRepository.update(ctx.tenantId, userId, {
      email: input.email,
      name: input.name,
      phone: input.phone,
      employeeType: input.employeeType,
      hourlyRate: input.hourlyRate,
      status: input.status,
      jobTitle: input.jobTitle,
      bio: input.bio,
      reportsTo: input.reportsTo,
      emergencyContactName: input.emergencyContactName,
      emergencyContactPhone: input.emergencyContactPhone,
      emergencyContactRelation: input.emergencyContactRelation,
      addressLine1: input.addressLine1,
      addressLine2: input.addressLine2,
      addressCity: input.addressCity,
      addressPostcode: input.addressPostcode,
      addressCountry: input.addressCountry,
    });

    const changedFields = Object.keys(input).filter(k => k !== 'id' && input[k as keyof typeof input] !== undefined);
    await auditLog({
      tenantId: ctx.tenantId,
      actorId: ctx.user!.id,
      action: 'updated',
      resourceType: 'team-member',
      resourceId: userId,
      resourceName: updated.name,
    });

    await inngest.send({
      name: "team/updated",
      data: { userId, tenantId: ctx.tenantId, changes: changedFields },
    });

    log.info({ userId: ctx.user?.id, tenantId: ctx.tenantId, updatedMemberId: userId }, "Staff updated");
    return updated;
  },

  async deactivateStaff(ctx: Context, userId: string): Promise<void> {
    const existing = await teamRepository.findById(ctx.tenantId, userId);
    if (!existing) throw new NotFoundError("Staff member", userId);

    await teamRepository.deactivate(ctx.tenantId, userId);

    await auditLog({
      tenantId: ctx.tenantId,
      actorId: ctx.user!.id,
      action: 'deleted',
      resourceType: 'team-member',
      resourceId: userId,
      resourceName: existing.name,
    });

    await inngest.send({
      name: "team/deactivated",
      data: { userId, tenantId: ctx.tenantId },
    });

    log.info({ userId: ctx.user?.id, tenantId: ctx.tenantId, deactivatedMemberId: userId }, "Staff deactivated");
  },

  // ---------------------------------------------------------------------------
  // AVAILABILITY
  // ---------------------------------------------------------------------------

  async getAvailability(
    ctx: Context,
    input: z.infer<typeof getAvailabilitySchema>
  ): Promise<AvailabilityEntry[]> {
    const entries = await teamRepository.getAvailabilityEntries(
      ctx.tenantId,
      input.userId,
      {
        startDate: input.startDate,
        endDate: input.endDate,
      }
    );

    log.info(
      { tenantId: ctx.tenantId, userId: input.userId, count: entries.length },
      "Availability fetched"
    );
    return entries;
  },

  async setAvailability(
    ctx: Context,
    input: z.infer<typeof setAvailabilitySchema>
  ): Promise<void> {
    if (input.replaceAll && input.entries.length === 0) {
      log.warn(
        { tenantId: ctx.tenantId, userId: input.userId },
        "setAvailability called with replaceAll=true and empty entries — all availability will be cleared"
      );
    }

    await teamRepository.setAvailabilityEntries(
      ctx.tenantId,
      input.userId,
      input.entries as AvailabilityEntry[],
      input.replaceAll
    );

    log.info(
      { userId: ctx.user?.id, tenantId: ctx.tenantId, targetUserId: input.userId, count: input.entries.length, replaceAll: input.replaceAll },
      "Availability set"
    );
  },

  async blockDates(
    ctx: Context,
    input: z.infer<typeof blockDatesSchema>
  ): Promise<void> {
    if (input.endDate && input.endDate < input.startDate) {
      throw new ValidationError("endDate must be on or after startDate");
    }

    await teamRepository.addBlockedEntry(
      ctx.tenantId,
      input.userId,
      input.startDate,
      input.endDate,
      input.reason
    );

    log.info(
      { userId: ctx.user?.id, tenantId: ctx.tenantId, targetUserId: input.userId, startDate: input.startDate, endDate: input.endDate },
      "Dates blocked"
    );
  },

  // ---------------------------------------------------------------------------
  // SCHEDULE
  // ---------------------------------------------------------------------------

  async getSchedule(
    ctx: Context,
    input: z.infer<typeof getScheduleSchema>
  ): Promise<{
    userId: string;
    date: string;
    availableSlots: AvailabilitySlot[];
    assignedBookings: Array<{
      id: string;
      scheduledDate: Date;
      scheduledTime: string;
      durationMinutes: number;
      status: string;
    }>;
  }> {
    const timezone = input.timezone ?? "UTC";
    const dateObj = new Date(input.date);

    const [availableSlots, assignedBookings] = await Promise.all([
      teamRepository.getStaffAvailableSlots(ctx.tenantId, input.userId, dateObj, timezone),
      teamRepository.getAssignedBookings(
        ctx.tenantId,
        input.userId,
        dateObj,
        dateObj
      ),
    ]);

    log.info(
      {
        tenantId: ctx.tenantId,
        userId: input.userId,
        date: input.date,
        slotCount: availableSlots.length,
        bookingCount: assignedBookings.length,
      },
      "Schedule fetched"
    );

    return {
      userId: input.userId,
      date: input.date,
      availableSlots,
      assignedBookings,
    };
  },

  // ---------------------------------------------------------------------------
  // DEPARTMENTS
  // ---------------------------------------------------------------------------

  async listDepartments(ctx: Context): Promise<Department[]> {
    return teamRepository.listDepartments(ctx.tenantId);
  },

  async createDepartment(
    ctx: Context,
    input: z.infer<typeof createDepartmentSchema>
  ): Promise<Department> {
    const dept = await teamRepository.createDepartment(ctx.tenantId, input);

    await auditLog({
      tenantId: ctx.tenantId,
      actorId: ctx.user!.id,
      action: 'created',
      resourceType: 'department',
      resourceId: dept.id,
      resourceName: dept.name,
    });

    log.info({ tenantId: ctx.tenantId, departmentId: dept.id }, "Department created");
    return dept;
  },

  async updateDepartment(
    ctx: Context,
    input: z.infer<typeof updateDepartmentSchema>
  ): Promise<Department> {
    const dept = await teamRepository.updateDepartment(ctx.tenantId, input);

    await auditLog({
      tenantId: ctx.tenantId,
      actorId: ctx.user!.id,
      action: 'updated',
      resourceType: 'department',
      resourceId: dept.id,
      resourceName: dept.name,
    });

    log.info({ tenantId: ctx.tenantId, departmentId: dept.id }, "Department updated");
    return dept;
  },

  async deleteDepartment(ctx: Context, departmentId: string): Promise<void> {
    await teamRepository.deleteDepartment(ctx.tenantId, departmentId);

    await auditLog({
      tenantId: ctx.tenantId,
      actorId: ctx.user!.id,
      action: 'deleted',
      resourceType: 'department',
      resourceId: departmentId,
      resourceName: departmentId,
    });

    log.info({ tenantId: ctx.tenantId, departmentId }, "Department deleted (soft)");
  },

  async addDepartmentMember(
    ctx: Context,
    input: z.infer<typeof departmentMemberSchema>
  ): Promise<void> {
    await teamRepository.addDepartmentMember(ctx.tenantId, input);
    log.info({ tenantId: ctx.tenantId, userId: input.userId, departmentId: input.departmentId }, "Department member added");
  },

  async removeDepartmentMember(ctx: Context, userId: string, departmentId: string): Promise<void> {
    await teamRepository.removeDepartmentMember(ctx.tenantId, userId, departmentId);
    log.info({ tenantId: ctx.tenantId, userId, departmentId }, "Department member removed");
  },

  // ---------------------------------------------------------------------------
  // NOTES
  // ---------------------------------------------------------------------------

  async listNotes(
    ctx: Context,
    input: z.infer<typeof listNotesSchema>
  ): Promise<{ rows: StaffNote[]; hasMore: boolean }> {
    return teamRepository.listNotes(ctx.tenantId, input.userId, {
      limit: input.limit,
      cursor: input.cursor,
    });
  },

  async createNote(
    ctx: Context,
    input: z.infer<typeof createNoteSchema>
  ): Promise<StaffNote> {
    const note = await teamRepository.createNote(ctx.tenantId, ctx.user!.id, input);

    await auditLog({
      tenantId: ctx.tenantId,
      actorId: ctx.user!.id,
      action: 'created',
      resourceType: 'staff-note',
      resourceId: note.id,
      resourceName: `Note on ${input.userId}`,
    });

    log.info({ tenantId: ctx.tenantId, noteId: note.id }, "Staff note created");
    return note;
  },

  async updateNote(
    ctx: Context,
    input: z.infer<typeof updateNoteSchema>
  ): Promise<StaffNote> {
    const note = await teamRepository.updateNote(ctx.tenantId, ctx.user!.id, input);
    log.info({ tenantId: ctx.tenantId, noteId: input.noteId }, "Staff note updated");
    return note;
  },

  async deleteNote(ctx: Context, noteId: string): Promise<void> {
    await teamRepository.deleteNote(ctx.tenantId, ctx.user!.id, noteId);
    log.info({ tenantId: ctx.tenantId, noteId }, "Staff note deleted");
  },

  // ---------------------------------------------------------------------------
  // PAY RATES
  // ---------------------------------------------------------------------------

  async listPayRates(ctx: Context, userId: string): Promise<PayRate[]> {
    return teamRepository.listPayRates(ctx.tenantId, userId);
  },

  async createPayRate(
    ctx: Context,
    input: z.infer<typeof createPayRateSchema>
  ): Promise<PayRate> {
    const rate = await teamRepository.createPayRate(ctx.tenantId, ctx.user!.id, {
      userId: input.userId,
      rateType: input.rateType,
      amount: input.amount,
      currency: input.currency,
      effectiveFrom: input.effectiveFrom,
      reason: input.reason,
    });

    await auditLog({
      tenantId: ctx.tenantId,
      actorId: ctx.user!.id,
      action: 'created',
      resourceType: 'pay-rate',
      resourceId: rate.id,
      resourceName: `${input.rateType} ${input.amount} ${input.currency}`,
    });

    log.info({ tenantId: ctx.tenantId, rateId: rate.id }, "Pay rate created");
    return rate;
  },

  // ---------------------------------------------------------------------------
  // CHECKLISTS
  // ---------------------------------------------------------------------------

  async listChecklistTemplates(ctx: Context): Promise<ChecklistTemplate[]> {
    return teamRepository.listChecklistTemplates(ctx.tenantId);
  },

  async createChecklistTemplate(
    ctx: Context,
    input: z.infer<typeof createChecklistTemplateSchema>
  ): Promise<ChecklistTemplate> {
    const template = await teamRepository.createChecklistTemplate(ctx.tenantId, input);
    log.info({ tenantId: ctx.tenantId, templateId: template.id }, "Checklist template created");
    return template;
  },

  async updateChecklistTemplate(
    ctx: Context,
    input: z.infer<typeof updateChecklistTemplateSchema>
  ): Promise<ChecklistTemplate> {
    const template = await teamRepository.updateChecklistTemplate(ctx.tenantId, input);
    log.info({ tenantId: ctx.tenantId, templateId: template.id }, "Checklist template updated");
    return template;
  },

  async getChecklistProgress(
    ctx: Context,
    userId: string,
    type?: string
  ): Promise<ChecklistProgress[]> {
    return teamRepository.getChecklistProgress(ctx.tenantId, userId, type);
  },

  async completeChecklistItem(
    ctx: Context,
    progressId: string,
    itemKey: string
  ): Promise<ChecklistProgress> {
    const progress = await teamRepository.completeChecklistItem(
      ctx.tenantId,
      ctx.user!.id,
      progressId,
      itemKey
    );

    // Fire event when all required items are done
    if (progress.status === 'COMPLETED') {
      // Determine template type for event name
      const templates = await teamRepository.listChecklistTemplates(ctx.tenantId);
      const template = templates.find((t) => t.id === progress.templateId);
      const eventName = template?.type === 'OFFBOARDING'
        ? 'team/offboarding.completed' as const
        : 'team/onboarding.completed' as const;

      await inngest.send({
        name: eventName,
        data: {
          userId: progress.userId,
          tenantId: ctx.tenantId,
          templateId: progress.templateId,
        },
      });

      log.info({ tenantId: ctx.tenantId, progressId, eventName }, "Checklist completed, event fired");
    }

    return progress;
  },

  // ---------------------------------------------------------------------------
  // CUSTOM FIELDS
  // ---------------------------------------------------------------------------

  async listCustomFieldDefinitions(ctx: Context): Promise<CustomFieldDefinition[]> {
    return teamRepository.listCustomFieldDefinitions(ctx.tenantId);
  },

  async createCustomFieldDefinition(
    ctx: Context,
    input: z.infer<typeof createCustomFieldDefSchema>
  ): Promise<CustomFieldDefinition> {
    const def = await teamRepository.createCustomFieldDefinition(ctx.tenantId, input);
    log.info({ tenantId: ctx.tenantId, fieldId: def.id }, "Custom field definition created");
    return def;
  },

  async updateCustomFieldDefinition(
    ctx: Context,
    input: z.infer<typeof updateCustomFieldDefSchema>
  ): Promise<CustomFieldDefinition> {
    const def = await teamRepository.updateCustomFieldDefinition(ctx.tenantId, input);
    log.info({ tenantId: ctx.tenantId, fieldId: def.id }, "Custom field definition updated");
    return def;
  },

  async deleteCustomFieldDefinition(ctx: Context, fieldId: string): Promise<void> {
    await teamRepository.deleteCustomFieldDefinition(ctx.tenantId, fieldId);
    log.info({ tenantId: ctx.tenantId, fieldId }, "Custom field definition deleted");
  },

  async getCustomFieldValues(ctx: Context, userId: string): Promise<CustomFieldValue[]> {
    return teamRepository.getCustomFieldValues(ctx.tenantId, userId);
  },

  async setCustomFieldValues(
    ctx: Context,
    input: z.infer<typeof setCustomFieldValuesSchema>
  ): Promise<void> {
    // Validate values against field definitions
    const definitions = await teamRepository.listCustomFieldDefinitions(ctx.tenantId);
    const defMap = new Map(definitions.map((d) => [d.id, d]));

    for (const v of input.values) {
      const def = defMap.get(v.fieldDefinitionId);
      if (!def) throw new BadRequestError(`Unknown custom field: ${v.fieldDefinitionId}`);

      // Validate required fields
      if (def.isRequired && (v.value === null || v.value === undefined || v.value === '')) {
        throw new BadRequestError(`Field "${def.label}" is required`);
      }

      // Type-specific validation
      if (v.value !== null && v.value !== undefined) {
        switch (def.fieldType) {
          case 'TEXT':
          case 'URL':
          case 'EMAIL':
          case 'PHONE':
          case 'DATE':
            if (typeof v.value !== 'string') {
              throw new BadRequestError(`Field "${def.label}" must be a string`);
            }
            break;
          case 'NUMBER':
            if (typeof v.value !== 'number') {
              throw new BadRequestError(`Field "${def.label}" must be a number`);
            }
            break;
          case 'BOOLEAN':
            if (typeof v.value !== 'boolean') {
              throw new BadRequestError(`Field "${def.label}" must be a boolean`);
            }
            break;
          case 'SELECT':
            if (typeof v.value !== 'string') {
              throw new BadRequestError(`Field "${def.label}" must be a string`);
            }
            if (def.options && !def.options.some((o) => o.value === v.value)) {
              throw new BadRequestError(`Invalid option for field "${def.label}": ${String(v.value)}`);
            }
            break;
          case 'MULTI_SELECT':
            if (!Array.isArray(v.value)) {
              throw new BadRequestError(`Field "${def.label}" must be an array`);
            }
            if (def.options) {
              const validValues = new Set(def.options.map((o) => o.value));
              for (const item of v.value) {
                if (!validValues.has(item as string)) {
                  throw new BadRequestError(`Invalid option for field "${def.label}": ${String(item)}`);
                }
              }
            }
            break;
        }
      }
    }

    await teamRepository.setCustomFieldValues(ctx.tenantId, input.userId, input.values);
    log.info({ tenantId: ctx.tenantId, userId: input.userId, count: input.values.length }, "Custom field values set");
  },

  // ---------------------------------------------------------------------------
  // SKILL CATALOG
  // ---------------------------------------------------------------------------

  async listSkillCatalog(ctx: Context): Promise<Array<{ skillId: string; skillName: string }>> {
    return teamRepository.listSkillCatalog(ctx.tenantId);
  },
};
