import { router, tenantProcedure, permissionProcedure, createModuleMiddleware } from "@/shared/trpc"
import { outreachService } from "./outreach.service"
import {
  createSequenceSchema,
  updateSequenceSchema,
  getSequenceByIdSchema,
  archiveSequenceSchema,
  enrollContactSchema,
  listContactsSchema,
  getContactByIdSchema,
  getBodySchema,
  logActivitySchema,
  convertContactSchema,
  pauseContactSchema,
  resumeContactSchema,
  sequenceAnalyticsSchema,
  sectorAnalyticsSchema,
  categorizeContactSchema,
  snoozeContactSchema,
  batchLogActivitySchema,
  undoActivitySchema,
  getContactDetailSchema,
  getContactActivitiesSchema,
  listTemplatesSchema,
  getTemplateByIdSchema,
  createTemplateSchema,
  updateTemplateSchema,
  deleteTemplateSchema,
  listSnippetsSchema,
  getSnippetByIdSchema,
  createSnippetSchema,
  updateSnippetSchema,
  deleteSnippetSchema,
} from "./outreach.schemas"

const moduleGate = createModuleMiddleware("outreach")
const moduleProcedure = tenantProcedure.use(moduleGate)
const modulePermission = (perm: string) => permissionProcedure(perm).use(moduleGate)

export const outreachRouter = router({
  // Sequences
  listSequences: moduleProcedure
    .query(async ({ ctx }) => outreachService.listSequences(ctx)),

  getSequenceById: moduleProcedure
    .input(getSequenceByIdSchema)
    .query(async ({ ctx, input }) => outreachService.getSequenceById(ctx, input.sequenceId)),

  createSequence: modulePermission("outreach:write")
    .input(createSequenceSchema)
    .mutation(async ({ ctx, input }) => outreachService.createSequence(ctx, input)),

  updateSequence: modulePermission("outreach:write")
    .input(updateSequenceSchema)
    .mutation(async ({ ctx, input }) =>
      outreachService.updateSequence(ctx, input.sequenceId, {
        name: input.name,
        description: input.description,
        sector: input.sector,
        targetIcp: input.targetIcp,
        isActive: input.isActive,
        steps: input.steps,
      })
    ),

  archiveSequence: modulePermission("outreach:write")
    .input(archiveSequenceSchema)
    .mutation(async ({ ctx, input }) => outreachService.archiveSequence(ctx, input.sequenceId)),

  // Contacts
  enrollContact: modulePermission("outreach:write")
    .input(enrollContactSchema)
    .mutation(async ({ ctx, input }) => outreachService.enrollContact(ctx, input)),

  listContacts: moduleProcedure
    .input(listContactsSchema)
    .query(async ({ ctx, input }) => outreachService.listContacts(ctx, input)),

  getContactById: moduleProcedure
    .input(getContactByIdSchema)
    .query(async ({ ctx, input }) => outreachService.getContactById(ctx, input.contactId)),

  getBody: moduleProcedure
    .input(getBodySchema)
    .query(async ({ ctx, input }) => outreachService.getBodyForStep(ctx, input)),

  logActivity: modulePermission("outreach:write")
    .input(logActivitySchema)
    .mutation(async ({ ctx, input }) => outreachService.logActivity(ctx, input)),

  convertContact: modulePermission("outreach:write")
    .input(convertContactSchema)
    .mutation(async ({ ctx, input }) => outreachService.convertContact(ctx, input)),

  pauseContact: modulePermission("outreach:write")
    .input(pauseContactSchema)
    .mutation(async ({ ctx, input }) => outreachService.pauseContact(ctx, input.contactId)),

  resumeContact: modulePermission("outreach:write")
    .input(resumeContactSchema)
    .mutation(async ({ ctx, input }) => outreachService.resumeContact(ctx, input.contactId)),

  // Contact — categorize & snooze
  categorizeContact: modulePermission("outreach:write")
    .input(categorizeContactSchema)
    .mutation(async ({ ctx, input }) => outreachService.categorizeContact(ctx, input)),

  snoozeContact: modulePermission("outreach:write")
    .input(snoozeContactSchema)
    .mutation(async ({ ctx, input }) => outreachService.snoozeContact(ctx, input)),

  // Contact — batch & undo
  batchLogActivity: modulePermission("outreach:write")
    .input(batchLogActivitySchema)
    .mutation(async ({ ctx, input }) => outreachService.batchLogActivity(ctx, input)),

  undoActivity: modulePermission("outreach:write")
    .input(undoActivitySchema)
    .mutation(async ({ ctx, input }) => outreachService.undoActivity(ctx, input)),

  // Contact — detail & activities
  getContactDetail: moduleProcedure
    .input(getContactDetailSchema)
    .query(async ({ ctx, input }) => outreachService.getContactById(ctx, input.contactId)),

  getContactActivities: moduleProcedure
    .input(getContactActivitiesSchema)
    .query(async ({ ctx, input }) =>
      outreachService.getContactActivities(ctx, input.contactId, {
        cursor: input.cursor,
        limit: input.limit,
      }),
    ),

  // Dashboard
  getDashboard: moduleProcedure
    .query(async ({ ctx }) => outreachService.getDashboard(ctx)),

  // Analytics
  sequenceAnalytics: moduleProcedure
    .input(sequenceAnalyticsSchema)
    .query(async ({ ctx, input }) => outreachService.getSequenceAnalytics(ctx, input)),

  sectorAnalytics: moduleProcedure
    .input(sectorAnalyticsSchema)
    .query(async ({ ctx, input }) => outreachService.getSectorAnalytics(ctx, input)),

  // Templates
  listTemplates: moduleProcedure
    .input(listTemplatesSchema)
    .query(async ({ ctx, input }) => outreachService.listTemplates(ctx, input)),

  getTemplateById: moduleProcedure
    .input(getTemplateByIdSchema)
    .query(async ({ ctx, input }) => outreachService.getTemplateById(ctx, input.templateId)),

  createTemplate: modulePermission("outreach:write")
    .input(createTemplateSchema)
    .mutation(async ({ ctx, input }) => outreachService.createTemplate(ctx, input)),

  updateTemplate: modulePermission("outreach:write")
    .input(updateTemplateSchema)
    .mutation(async ({ ctx, input }) =>
      outreachService.updateTemplate(ctx, input.templateId, {
        name: input.name, category: input.category, channel: input.channel,
        subject: input.subject, bodyMarkdown: input.bodyMarkdown,
        tags: input.tags, isActive: input.isActive,
      })
    ),

  deleteTemplate: modulePermission("outreach:write")
    .input(deleteTemplateSchema)
    .mutation(async ({ ctx, input }) => outreachService.deleteTemplate(ctx, input.templateId)),

  duplicateTemplate: modulePermission("outreach:write")
    .input(getTemplateByIdSchema)
    .mutation(async ({ ctx, input }) => outreachService.duplicateTemplate(ctx, input.templateId)),

  // Snippets
  listSnippets: moduleProcedure
    .input(listSnippetsSchema)
    .query(async ({ ctx, input }) => outreachService.listSnippets(ctx, input)),

  getSnippetById: moduleProcedure
    .input(getSnippetByIdSchema)
    .query(async ({ ctx, input }) => outreachService.getSnippetById(ctx, input.snippetId)),

  createSnippet: modulePermission("outreach:write")
    .input(createSnippetSchema)
    .mutation(async ({ ctx, input }) => outreachService.createSnippet(ctx, input)),

  updateSnippet: modulePermission("outreach:write")
    .input(updateSnippetSchema)
    .mutation(async ({ ctx, input }) =>
      outreachService.updateSnippet(ctx, input.snippetId, {
        name: input.name, category: input.category,
        bodyMarkdown: input.bodyMarkdown, isActive: input.isActive,
      })
    ),

  deleteSnippet: modulePermission("outreach:write")
    .input(deleteSnippetSchema)
    .mutation(async ({ ctx, input }) => outreachService.deleteSnippet(ctx, input.snippetId)),
})
