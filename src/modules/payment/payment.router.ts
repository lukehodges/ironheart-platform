import { router, tenantProcedure, permissionProcedure } from '@/shared/trpc'
import * as paymentService from './payment.service'
import {
  createInvoiceSchema,
  sendInvoiceSchema,
  voidInvoiceSchema,
  recordPaymentSchema,
  listInvoicesSchema,
} from './payment.schemas'
import { z } from 'zod'

export const paymentRouter = router({
  listInvoices: permissionProcedure('payments:read')
    .input(listInvoicesSchema)
    .query(async ({ ctx, input }) => {
      return paymentService.listInvoices(ctx.tenantId, input)
    }),

  getInvoice: permissionProcedure('payments:read')
    .input(z.object({ invoiceId: z.string() }))
    .query(async ({ ctx, input }) => {
      return paymentService.findInvoice(ctx.tenantId, input.invoiceId)
    }),

  createInvoice: permissionProcedure('payments:write')
    .input(createInvoiceSchema)
    .mutation(async ({ ctx, input }) => {
      return paymentService.createInvoice(ctx.tenantId, {
        bookingId:   input.bookingId ?? null,
        customerId:  input.customerId,
        subtotal:    input.subtotal,
        taxAmount:   input.taxAmount,
        totalAmount: input.totalAmount,
        currency:    input.currency,
        dueDate:     input.dueDate ? new Date(input.dueDate) : undefined,
        notes:       input.notes,
      })
    }),

  sendInvoice: permissionProcedure('payments:write')
    .input(sendInvoiceSchema)
    .mutation(async ({ ctx, input }) => {
      return paymentService.sendInvoice(ctx.tenantId, input.invoiceId, input.version)
    }),

  voidInvoice: permissionProcedure('payments:write')
    .input(voidInvoiceSchema)
    .mutation(async ({ ctx, input }) => {
      await paymentService.voidInvoice(ctx.tenantId, input.invoiceId)
      return { success: true }
    }),

  recordPayment: permissionProcedure('payments:write')
    .input(recordPaymentSchema)
    .mutation(async ({ ctx, input }) => {
      return paymentService.recordPayment(ctx.tenantId, {
        ...input,
        bookingId: input.bookingId ?? null,
      })
    }),

  listPricingRules: tenantProcedure
    .query(async ({ ctx }) => {
      return paymentService.listPricingRules(ctx.tenantId)
    }),
})
