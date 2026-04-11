import { router, tenantProcedure, publicProcedure, permissionProcedure, createModuleMiddleware } from "@/shared/trpc";

const moduleGate = createModuleMiddleware('jobs');
const moduleProcedure = tenantProcedure.use(moduleGate);
const modulePermission = (perm: string) => permissionProcedure(perm).use(moduleGate);
import { jobService } from "./jobs.service";
import {
  listJobsSchema,
  createJobSchema,
  updateJobSchema,
  cancelJobSchema,
  calendarJobsSchema,
  confirmReservationSchema,
} from "./jobs.schemas";
import { z } from "zod";

/**
 * Main jobs router (replaces booking router).
 * Thin layer: validate → call service → return result.
 * No business logic here.
 */
export const jobsRouter = router({
  list: modulePermission("bookings:read")
    .input(listJobsSchema)
    .query(({ ctx, input }) =>
      jobService.list(ctx.tenantId, input)
    ),

  getById: moduleProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(({ ctx, input }) => jobService.getById(ctx.tenantId, input.id)),

  getPublicById: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(({ input }) => jobService.getByIdPublic(input.id)),

  create: moduleProcedure
    .input(createJobSchema)
    .mutation(async ({ ctx, input }) => {
      const { job } = await jobService.createJob(ctx.tenantId, input);
      return job;
    }),

  update: moduleProcedure
    .input(updateJobSchema)
    .mutation(({ ctx, input }) =>
      jobService.updateJob(ctx.tenantId, input.id, input)
    ),

  cancel: moduleProcedure
    .input(cancelJobSchema)
    .mutation(({ ctx, input }) =>
      jobService.cancelJob(ctx.tenantId, input.id, input.reason)
    ),

  confirmReservation: publicProcedure
    .input(confirmReservationSchema)
    .mutation(({ input }) => jobService.confirmReservation(input.bookingId, input.customerEmail, input.token)),

  getStats: moduleProcedure.query(({ ctx }) => jobService.getStats(ctx.tenantId)),

  listForCalendar: moduleProcedure
    .input(calendarJobsSchema)
    .query(({ ctx, input }) =>
      jobService.listForCalendar(ctx.tenantId, input.startDate, input.endDate, input.staffId)
    ),
});
