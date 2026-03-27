import { logger } from "@/shared/logger";
import { NotFoundError, BadRequestError } from "@/shared/errors";
import { getStripe } from "@/modules/payment/providers/stripe.provider";
import { productRepository } from "@/modules/product/product.repository";
import { subscriptionRepository } from "./subscription.repository";
import type { CreateCheckoutInput, CheckoutResult } from "./subscription.types";

const log = logger.child({ module: "subscription.service" });

async function createCheckoutSession(
  input: CreateCheckoutInput
): Promise<CheckoutResult> {
  const product = await productRepository.findBySlugWithPlans(input.productSlug);
  if (!product || !product.isPublished) {
    throw new NotFoundError("Product", input.productSlug);
  }

  const plan = product.plans.find((p) => p.isDefault);
  if (!plan) {
    throw new BadRequestError(`No default plan for product '${input.productSlug}'`);
  }

  const stripe = getStripe();

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: plan.stripePriceId, quantity: 1 }],
    subscription_data: {
      trial_period_days: plan.trialDays > 0 ? plan.trialDays : undefined,
      metadata: {
        productSlug: input.productSlug,
        businessName: input.businessName,
        planId: plan.id,
      },
    },
    customer_email: input.email,
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    metadata: {
      productSlug: input.productSlug,
      businessName: input.businessName,
      email: input.email,
      planId: plan.id,
    },
  });

  log.info(
    { sessionId: session.id, productSlug: input.productSlug },
    "Checkout session created"
  );

  return {
    checkoutUrl: session.url!,
    sessionId: session.id,
  };
}

async function createBillingPortalSession(
  tenantId: string,
  stripeCustomerId: string,
  returnUrl: string
): Promise<string> {
  const stripe = getStripe();
  const session = await stripe.billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: returnUrl,
  });
  log.info({ tenantId }, "Billing portal session created");
  return session.url;
}

async function handleCheckoutCompleted(data: {
  stripeSessionId: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  productSlug: string;
  businessName: string;
  email: string;
  planId: string;
}): Promise<void> {
  log.info(
    { productSlug: data.productSlug, email: data.email },
    "Processing checkout completion"
  );

  const { platformService } = await import(
    "@/modules/platform/platform.service"
  );

  const product = await productRepository.findBySlug(data.productSlug);
  if (!product) {
    log.error(
      { productSlug: data.productSlug },
      "Product not found during checkout"
    );
    return;
  }

  const tenant = await platformService.provisionTenant({
    businessName: data.businessName,
    email: data.email,
    plan: "STARTER",
  });

  await subscriptionRepository.updateTenantSubscription(tenant.id, {
    stripeCustomerId: data.stripeCustomerId,
    subscriptionId: data.stripeSubscriptionId,
    productId: product.id,
    planId: data.planId,
  });

  log.info(
    { tenantId: tenant.id, productSlug: data.productSlug },
    "Tenant provisioned from checkout"
  );
}

async function handlePaymentFailed(data: {
  stripeSubscriptionId: string;
  tenantId: string;
}): Promise<void> {
  log.warn({ tenantId: data.tenantId }, "Subscription payment failed");
}

async function handleSubscriptionCancelled(data: {
  stripeSubscriptionId: string;
  tenantId: string;
}): Promise<void> {
  await subscriptionRepository.updateTenantSubscription(data.tenantId, {
    status: "SUSPENDED",
  });
  log.info(
    { tenantId: data.tenantId },
    "Tenant suspended after subscription cancellation"
  );
}

export const subscriptionService = {
  createCheckoutSession,
  createBillingPortalSession,
  handleCheckoutCompleted,
  handlePaymentFailed,
  handleSubscriptionCancelled,
};
