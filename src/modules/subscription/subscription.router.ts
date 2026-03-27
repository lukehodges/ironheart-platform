import {
  router,
  publicProcedure,
  tenantProcedure,
} from "@/shared/trpc";
import { subscriptionService } from "./subscription.service";
import { createCheckoutSchema, billingPortalSchema } from "./subscription.schemas";

export const subscriptionRouter = router({
  createCheckout: publicProcedure
    .input(createCheckoutSchema)
    .mutation(({ input }) => subscriptionService.createCheckoutSession(input)),

  billingPortal: tenantProcedure
    .input(billingPortalSchema)
    .mutation(async ({ ctx, input }) => {
      const { db } = await import("@/shared/db");
      const { tenants } = await import("@/shared/db/schemas/tenant.schema");
      const { eq } = await import("drizzle-orm");

      const [tenant] = await db
        .select({ stripeCustomerId: tenants.stripeCustomerId })
        .from(tenants)
        .where(eq(tenants.id, ctx.tenantId))
        .limit(1);

      if (!tenant?.stripeCustomerId) {
        throw new Error("No Stripe customer linked to this tenant");
      }

      const url = await subscriptionService.createBillingPortalSession(
        ctx.tenantId,
        tenant.stripeCustomerId,
        input.returnUrl,
      );
      return { url };
    }),
});
