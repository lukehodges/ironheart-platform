import { z } from "zod";

export const createCheckoutSchema = z.object({
  productSlug: z.string().min(1),
  businessName: z.string().min(1).max(200),
  email: z.string().email(),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
});

export const billingPortalSchema = z.object({
  returnUrl: z.string().url(),
});
