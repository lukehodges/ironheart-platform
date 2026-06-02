import { z } from "zod"
import {
  router,
  tenantProcedure,
  permissionProcedure,
  createModuleMiddleware,
} from "@/shared/trpc"
import { outreachService } from "./outreach.service"
import {
  // companies
  listCompaniesSchema,
  createCompanySchema,
  updateCompanySchema,
  // contacts
  listContactsSchema,
  createContactSchema,
  updateContactSchema,
  markContactBouncedSchema,
  // campaigns
  listCampaignsSchema,
  createCampaignSchema,
  // templates
  listTemplatesSchema,
  createTemplateSchema,
  // touches
  listTouchesSchema,
  sendTouchSchema,
  // replies
  listRepliesSchema,
  listRepliesEnrichedSchema,
  classifyReplySchema,
  // dnc
  addToDncSchema,
  listDncSchema,
  checkDncSchema,
  // bulk
  bulkImportLeadsSchema,
} from "./outreach.schemas"

const moduleGate = createModuleMiddleware("outreach")
const moduleProcedure = tenantProcedure.use(moduleGate)
const modulePermission = (perm: string) =>
  permissionProcedure(perm).use(moduleGate)

const uuid = z.string().uuid()

export const outreachRouter = router({
  // ----------------------------------------------------------- COMPANIES
  listCompanies: moduleProcedure
    .input(listCompaniesSchema)
    .query(({ ctx, input }) => outreachService.listCompanies(ctx, input)),

  getCompany: moduleProcedure
    .input(z.object({ id: uuid }))
    .query(({ ctx, input }) => outreachService.getCompany(ctx, input.id)),

  createCompany: modulePermission("outreach:write")
    .input(createCompanySchema)
    .mutation(({ ctx, input }) => outreachService.createCompany(ctx, input)),

  updateCompany: modulePermission("outreach:write")
    .input(updateCompanySchema)
    .mutation(({ ctx, input }) => {
      const { id, ...rest } = input
      return outreachService.updateCompany(ctx, id, rest)
    }),

  // ----------------------------------------------------------- CONTACTS
  listContacts: moduleProcedure
    .input(listContactsSchema)
    .query(({ ctx, input }) => outreachService.listContacts(ctx, input)),

  createContact: modulePermission("outreach:write")
    .input(createContactSchema)
    .mutation(({ ctx, input }) => outreachService.createContact(ctx, input)),

  updateContact: modulePermission("outreach:write")
    .input(updateContactSchema)
    .mutation(({ ctx, input }) => {
      const { id, ...rest } = input
      return outreachService.updateContact(ctx, id, rest)
    }),

  markBounced: modulePermission("outreach:write")
    .input(markContactBouncedSchema)
    .mutation(({ ctx, input }) =>
      outreachService.markContactBounced(ctx, input.id),
    ),

  // ---------------------------------------------------------- CAMPAIGNS
  listCampaigns: moduleProcedure
    .input(listCampaignsSchema)
    .query(({ ctx, input }) => outreachService.listCampaigns(ctx, input)),

  createCampaign: modulePermission("outreach:write")
    .input(createCampaignSchema)
    .mutation(({ ctx, input }) => outreachService.createCampaign(ctx, input)),

  // ---------------------------------------------------------- TEMPLATES
  listTemplates: moduleProcedure
    .input(listTemplatesSchema)
    .query(({ ctx, input }) => outreachService.listTemplates(ctx, input)),

  createTemplate: modulePermission("outreach:write")
    .input(createTemplateSchema)
    .mutation(({ ctx, input }) => outreachService.createTemplate(ctx, input)),

  // ----------------------------------------------------------- TOUCHES
  listTouches: moduleProcedure
    .input(listTouchesSchema)
    .query(({ ctx, input }) => outreachService.listTouches(ctx, input)),

  sendTouch: modulePermission("outreach:write")
    .input(sendTouchSchema)
    .mutation(({ ctx, input }) => outreachService.sendTouch(ctx, input)),

  // ----------------------------------------------------------- REPLIES
  listReplies: moduleProcedure
    .input(listRepliesSchema)
    .query(({ ctx, input }) => outreachService.listReplies(ctx, input)),

  listRepliesEnriched: moduleProcedure
    .input(listRepliesEnrichedSchema)
    .query(({ ctx, input }) =>
      outreachService.listRepliesEnriched(ctx, input),
    ),

  classifyReply: modulePermission("outreach:write")
    .input(classifyReplySchema)
    .mutation(({ ctx, input }) =>
      outreachService.classifyReply(
        ctx,
        input.replyId,
        input.classifiedAs,
        input.classifiedBy,
        input.confidence,
      ),
    ),

  // ---------------------------------------------------------- BULK IMPORT
  bulkImportLeads: modulePermission("outreach:write")
    .input(bulkImportLeadsSchema)
    .mutation(({ ctx, input }) =>
      outreachService.bulkImportLeads(ctx, input.rows),
    ),

  // ---------------------------------------------------------- DNC
  addToDnc: modulePermission("outreach:write")
    .input(addToDncSchema)
    .mutation(({ ctx, input }) => outreachService.addToDnc(ctx, input)),

  listDnc: moduleProcedure
    .input(listDncSchema)
    .query(({ ctx, input }) => outreachService.listDnc(ctx, input)),

  checkDnc: moduleProcedure
    .input(checkDncSchema)
    .query(({ ctx, input }) => outreachService.checkDnc(ctx, input.email)),
})

export type OutreachRouter = typeof outreachRouter
