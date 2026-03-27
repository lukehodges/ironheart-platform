import { describe, it, expect, vi, beforeEach } from "vitest";
import { subscriptionService } from "../subscription.service";
import { productRepository } from "@/modules/product/product.repository";
import { subscriptionRepository } from "../subscription.repository";
import { NotFoundError, BadRequestError } from "@/shared/errors";

vi.mock("@/shared/db", () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([]),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
  },
}));

vi.mock("@/shared/logger", () => ({
  logger: {
    child: () => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    }),
  },
}));

vi.mock("@/shared/inngest", () => ({
  inngest: { send: vi.fn().mockResolvedValue(undefined) },
}));

const mockCheckoutSession = {
  id: "cs_test_123",
  url: "https://checkout.stripe.com/test",
};

vi.mock("@/modules/payment/providers/stripe.provider", () => ({
  getStripe: () => ({
    checkout: {
      sessions: {
        create: vi.fn().mockResolvedValue(mockCheckoutSession),
      },
    },
    billingPortal: {
      sessions: {
        create: vi
          .fn()
          .mockResolvedValue({ url: "https://billing.stripe.com/test" }),
      },
    },
  }),
}));

vi.mock("@/modules/product/product.repository", () => ({
  productRepository: {
    findBySlugWithPlans: vi.fn(),
    findBySlug: vi.fn(),
  },
}));

vi.mock("../subscription.repository", () => ({
  subscriptionRepository: {
    findTenantByStripeSubscriptionId: vi.fn(),
    findTenantByStripeCustomerId: vi.fn(),
    updateTenantSubscription: vi.fn(),
  },
}));

vi.mock("@/modules/platform/platform.service", () => ({
  platformService: {
    provisionTenant: vi.fn().mockResolvedValue({ id: "tenant-001" }),
  },
}));

const mockProduct = {
  id: "prod-001",
  slug: "ironbook",
  name: "IronBook",
  tagline: "Scheduling",
  description: "",
  logoUrl: null,
  domain: null,
  moduleSlugs: ["booking", "customer"],
  isPublished: true,
  archivedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  plans: [
    {
      id: "plan-001",
      productId: "prod-001",
      slug: "starter",
      name: "Starter",
      priceMonthly: 2900,
      priceYearly: null,
      trialDays: 14,
      stripePriceId: "price_test123",
      features: [],
      isDefault: true,
      createdAt: new Date(),
    },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("subscriptionService", () => {
  describe("createCheckoutSession", () => {
    it("creates Stripe checkout for published product", async () => {
      vi.mocked(productRepository.findBySlugWithPlans).mockResolvedValue(
        mockProduct
      );

      const result = await subscriptionService.createCheckoutSession({
        productSlug: "ironbook",
        businessName: "Test Clinic",
        email: "test@example.com",
        successUrl: "https://example.com/success",
        cancelUrl: "https://example.com/cancel",
      });

      expect(result.checkoutUrl).toBe("https://checkout.stripe.com/test");
      expect(result.sessionId).toBe("cs_test_123");
    });

    it("throws NotFoundError for unpublished product", async () => {
      vi.mocked(productRepository.findBySlugWithPlans).mockResolvedValue({
        ...mockProduct,
        isPublished: false,
      });

      await expect(
        subscriptionService.createCheckoutSession({
          productSlug: "ironbook",
          businessName: "Test",
          email: "test@example.com",
          successUrl: "https://example.com/success",
          cancelUrl: "https://example.com/cancel",
        })
      ).rejects.toThrow(NotFoundError);
    });

    it("throws NotFoundError when product not found", async () => {
      vi.mocked(productRepository.findBySlugWithPlans).mockResolvedValue(null);

      await expect(
        subscriptionService.createCheckoutSession({
          productSlug: "nonexistent",
          businessName: "Test",
          email: "test@example.com",
          successUrl: "https://example.com/success",
          cancelUrl: "https://example.com/cancel",
        })
      ).rejects.toThrow(NotFoundError);
    });

    it("throws BadRequestError when no default plan exists", async () => {
      vi.mocked(productRepository.findBySlugWithPlans).mockResolvedValue({
        ...mockProduct,
        plans: [],
      });

      await expect(
        subscriptionService.createCheckoutSession({
          productSlug: "ironbook",
          businessName: "Test",
          email: "test@example.com",
          successUrl: "https://example.com/success",
          cancelUrl: "https://example.com/cancel",
        })
      ).rejects.toThrow(BadRequestError);
    });
  });

  describe("createBillingPortalSession", () => {
    it("returns billing portal URL", async () => {
      const url = await subscriptionService.createBillingPortalSession(
        "tenant-001",
        "cus_test_123",
        "https://example.com/settings"
      );

      expect(url).toBe("https://billing.stripe.com/test");
    });
  });

  describe("handleCheckoutCompleted", () => {
    it("provisions tenant and links Stripe IDs", async () => {
      vi.mocked(productRepository.findBySlug).mockResolvedValue({
        id: "prod-001",
        slug: "ironbook",
        name: "IronBook",
        tagline: "Scheduling",
        description: "",
        logoUrl: null,
        domain: null,
        moduleSlugs: ["booking", "customer"],
        isPublished: true,
        archivedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await subscriptionService.handleCheckoutCompleted({
        stripeSessionId: "cs_test_123",
        stripeCustomerId: "cus_test_123",
        stripeSubscriptionId: "sub_test_123",
        productSlug: "ironbook",
        businessName: "Test Clinic",
        email: "test@example.com",
        planId: "plan-001",
      });

      expect(
        subscriptionRepository.updateTenantSubscription
      ).toHaveBeenCalledWith("tenant-001", {
        stripeCustomerId: "cus_test_123",
        subscriptionId: "sub_test_123",
        productId: "prod-001",
        planId: "plan-001",
      });
    });

    it("returns early when product not found", async () => {
      vi.mocked(productRepository.findBySlug).mockResolvedValue(null);

      await subscriptionService.handleCheckoutCompleted({
        stripeSessionId: "cs_test_123",
        stripeCustomerId: "cus_test_123",
        stripeSubscriptionId: "sub_test_123",
        productSlug: "nonexistent",
        businessName: "Test Clinic",
        email: "test@example.com",
        planId: "plan-001",
      });

      expect(
        subscriptionRepository.updateTenantSubscription
      ).not.toHaveBeenCalled();
    });
  });

  describe("handlePaymentFailed", () => {
    it("logs warning without throwing", async () => {
      await expect(
        subscriptionService.handlePaymentFailed({
          stripeSubscriptionId: "sub_test_123",
          tenantId: "tenant-001",
        })
      ).resolves.toBeUndefined();
    });
  });

  describe("handleSubscriptionCancelled", () => {
    it("updates tenant status to SUSPENDED", async () => {
      await subscriptionService.handleSubscriptionCancelled({
        stripeSubscriptionId: "sub_test_123",
        tenantId: "tenant-001",
      });

      expect(
        subscriptionRepository.updateTenantSubscription
      ).toHaveBeenCalledWith("tenant-001", {
        status: "SUSPENDED",
      });
    });
  });
});
