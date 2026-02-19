import { z } from "zod";
import { router, tenantProcedure, permissionProcedure } from "@/shared/trpc";
import { customerService } from "./customer.service";
import {
  listCustomersSchema,
  createCustomerSchema,
  updateCustomerSchema,
  mergeCustomersSchema,
  addNoteSchema,
} from "./customer.schemas";

/**
 * Customer router.
 * Thin layer: validate → call service → return result.
 * No business logic here.
 */
export const customerRouter = router({
  // Customer CRUD
  list: tenantProcedure
    .input(listCustomersSchema)
    .query(async ({ ctx, input }) => customerService.listCustomers(ctx, input)),

  getById: tenantProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => customerService.getCustomer(ctx, input.id)),

  create: tenantProcedure
    .input(createCustomerSchema)
    .mutation(async ({ ctx, input }) => customerService.createCustomer(ctx, input)),

  update: tenantProcedure
    .input(updateCustomerSchema)
    .mutation(async ({ ctx, input }) => customerService.updateCustomer(ctx, input.id, input)),

  delete: permissionProcedure("customers:delete")
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => customerService.deleteCustomer(ctx, input.id)),

  merge: permissionProcedure("customers:write")
    .input(mergeCustomersSchema)
    .mutation(async ({ ctx, input }) =>
      customerService.mergeCustomers(ctx, input.sourceId, input.targetId)
    ),

  anonymise: permissionProcedure("customers:delete")
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => customerService.anonymiseCustomer(ctx, input.id)),

  // Notes
  listNotes: tenantProcedure
    .input(z.object({ customerId: z.string() }))
    .query(async ({ ctx, input }) => customerService.listNotes(ctx, input.customerId)),

  addNote: tenantProcedure
    .input(addNoteSchema)
    .mutation(async ({ ctx, input }) => customerService.addNote(ctx, input)),

  deleteNote: permissionProcedure("customers:write")
    .input(z.object({ noteId: z.string() }))
    .mutation(async ({ ctx, input }) => customerService.deleteNote(ctx, input.noteId)),

  // History
  getBookingHistory: tenantProcedure
    .input(z.object({ customerId: z.string() }))
    .query(async ({ ctx, input }) => customerService.getBookingHistory(ctx, input.customerId)),
});

export type CustomerRouter = typeof customerRouter;
