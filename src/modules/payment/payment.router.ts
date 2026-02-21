import { router, tenantProcedure, permissionProcedure, createModuleMiddleware } from '@/shared/trpc'

const moduleGate = createModuleMiddleware('payment')
const moduleProcedure = tenantProcedure.use(moduleGate)
const modulePermission = (perm: string) => permissionProcedure(perm).use(moduleGate)
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
  listInvoices: modulePermission('payments:read')
    .input(listInvoicesSchema)
    .query(async ({ ctx, input }) => {
      return paymentService.listInvoices(ctx.tenantId, input)
    }),

  getInvoice: modulePermission('payments:read')
    .input(z.object({ invoiceId: z.string() }))
    .query(async ({ ctx, input }) => {
      return paymentService.findInvoice(ctx.tenantId, input.invoiceId)
    }),

  createInvoice: modulePermission('payments:write')
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

  sendInvoice: modulePermission('payments:write')
    .input(sendInvoiceSchema)
    .mutation(async ({ ctx, input }) => {
      return paymentService.sendInvoice(ctx.tenantId, input.invoiceId, input.version)
    }),

  voidInvoice: modulePermission('payments:write')
    .input(voidInvoiceSchema)
    .mutation(async ({ ctx, input }) => {
      await paymentService.voidInvoice(ctx.tenantId, input.invoiceId)
      return { success: true }
    }),

  recordPayment: modulePermission('payments:write')
    .input(recordPaymentSchema)
    .mutation(async ({ ctx, input }) => {
      return paymentService.recordPayment(ctx.tenantId, {
        ...input,
        bookingId: input.bookingId ?? null,
      })
    }),

  listPricingRules: moduleProcedure
    .query(async ({ ctx }) => {
      return paymentService.listPricingRules(ctx.tenantId)
    }),
})
