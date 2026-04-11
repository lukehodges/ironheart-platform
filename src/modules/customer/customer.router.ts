import { z } from "zod";
import { router, tenantProcedure, permissionProcedure, createModuleMiddleware } from "@/shared/trpc";

const moduleGate = createModuleMiddleware('customer');
const moduleProcedure = tenantProcedure.use(moduleGate);
const modulePermission = (perm: string) => permissionProcedure(perm).use(moduleGate);
import { customerService } from "./customer.service";
import {
  listCustomersSchema,
  createCustomerSchema,
  updateCustomerSchema,
  mergeCustomersSchema,
  addNoteSchema,
  createContactSchema,
  updateContactSchema,
} from "./customer.schemas";

/**
 * Customer router.
 * Thin layer: validate → call service → return result.
 * No business logic here.
 */
export const customerRouter = router({
  // Customer CRUD
  list: moduleProcedure
    .input(listCustomersSchema)
    .query(async ({ ctx, input }) => customerService.listCustomers(ctx, input)),

  getById: moduleProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => customerService.getCustomer(ctx, input.id)),

  create: moduleProcedure
    .input(createCustomerSchema)
    .mutation(async ({ ctx, input }) => customerService.createCustomer(ctx, input)),

  update: moduleProcedure
    .input(updateCustomerSchema)
    .mutation(async ({ ctx, input }) => customerService.updateCustomer(ctx, input.id, input)),

  delete: modulePermission("customers:delete")
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => customerService.deleteCustomer(ctx, input.id)),

  merge: modulePermission("customers:write")
    .input(mergeCustomersSchema)
    .mutation(async ({ ctx, input }) =>
      customerService.mergeCustomers(ctx, input.sourceId, input.targetId)
    ),

  anonymise: modulePermission("customers:delete")
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => customerService.anonymiseCustomer(ctx, input.id)),

  // Notes
  listNotes: moduleProcedure
    .input(z.object({ customerId: z.string() }))
    .query(async ({ ctx, input }) => customerService.listNotes(ctx, input.customerId)),

  addNote: moduleProcedure
    .input(addNoteSchema)
    .mutation(async ({ ctx, input }) => customerService.addNote(ctx, input)),

  deleteNote: modulePermission("customers:write")
    .input(z.object({ noteId: z.string() }))
    .mutation(async ({ ctx, input }) => customerService.deleteNote(ctx, input.noteId)),

  // History
  getBookingHistory: moduleProcedure
    .input(z.object({ customerId: z.string() }))
    .query(async ({ ctx, input }) => customerService.getBookingHistory(ctx, input.customerId)),

  // Contacts
  contacts: router({
    list: moduleProcedure
      .input(z.object({ customerId: z.string().uuid() }))
      .query(async ({ ctx, input }) => customerService.listContacts(ctx, input.customerId)),

    create: modulePermission("customer:update")
      .input(createContactSchema)
      .mutation(async ({ ctx, input }) => customerService.createContact(ctx, input)),

    update: modulePermission("customer:update")
      .input(z.object({ contactId: z.string().uuid(), data: updateContactSchema }))
      .mutation(async ({ ctx, input }) => customerService.updateContact(ctx, input.contactId, input.data)),

    delete: modulePermission("customer:update")
      .input(z.object({ contactId: z.string().uuid() }))
      .mutation(async ({ ctx, input }) => customerService.deleteContact(ctx, input.contactId)),
  }),
});

export type CustomerRouter = typeof customerRouter;
