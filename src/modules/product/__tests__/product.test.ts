import { describe, it, expect, vi, beforeEach } from "vitest";
import { productService } from "../product.service";
import { productRepository } from "../product.repository";
import { NotFoundError, BadRequestError, ConflictError } from "@/shared/errors";

vi.mock("@/shared/db", () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([]),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([]),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
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

vi.mock("../product.repository", () => ({
  productRepository: {
    list: vi.fn(),
    findById: vi.fn(),
    findBySlug: vi.fn(),
    findBySlugWithPlans: vi.fn(),
    findByIdWithPlans: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    createPlan: vi.fn(),
    findDefaultPlan: vi.fn(),
    findPlanById: vi.fn(),
    deletePlan: vi.fn(),
  },
}));

const mockProduct = {
  id: "prod-001",
  slug: "ironbook",
  name: "IronBook",
  tagline: "Scheduling for mobile health",
  description: "Full scheduling platform",
  logoUrl: null,
  domain: null,
  moduleSlugs: ["booking", "customer", "scheduling"],
  isPublished: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockPlan = {
  id: "plan-001",
  productId: "prod-001",
  slug: "starter",
  name: "Starter",
  priceMonthly: 2900,
  priceYearly: null,
  trialDays: 14,
  stripePriceId: "price_test123",
  features: ["Unlimited bookings"],
  isDefault: true,
  createdAt: new Date(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("productService", () => {
  describe("listProducts", () => {
    it("returns all products", async () => {
      vi.mocked(productRepository.list).mockResolvedValue([mockProduct]);
      const result = await productService.listProducts();
      expect(result).toEqual([mockProduct]);
    });
  });

  describe("getProduct", () => {
    it("returns product with plans", async () => {
      vi.mocked(productRepository.findByIdWithPlans).mockResolvedValue({
        ...mockProduct,
        plans: [mockPlan],
      });
      const result = await productService.getProduct("prod-001");
      expect(result.plans).toHaveLength(1);
    });

    it("throws NotFoundError for missing product", async () => {
      vi.mocked(productRepository.findByIdWithPlans).mockResolvedValue(null);
      await expect(productService.getProduct("missing")).rejects.toThrow(NotFoundError);
    });
  });

  describe("getPublishedProduct", () => {
    it("returns published product by slug", async () => {
      vi.mocked(productRepository.findBySlugWithPlans).mockResolvedValue({
        ...mockProduct,
        plans: [mockPlan],
      });
      const result = await productService.getPublishedProduct("ironbook");
      expect(result.slug).toBe("ironbook");
    });

    it("throws NotFoundError for unpublished product", async () => {
      vi.mocked(productRepository.findBySlugWithPlans).mockResolvedValue({
        ...mockProduct,
        isPublished: false,
        plans: [],
      });
      await expect(
        productService.getPublishedProduct("ironbook")
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe("createProduct", () => {
    it("creates product with valid input", async () => {
      vi.mocked(productRepository.create).mockResolvedValue(mockProduct);
      const result = await productService.createProduct({
        slug: "ironbook",
        name: "IronBook",
        tagline: "Scheduling for mobile health",
        moduleSlugs: ["booking", "customer"],
      });
      expect(result.slug).toBe("ironbook");
    });

    it("throws BadRequestError for empty moduleSlugs", async () => {
      await expect(
        productService.createProduct({
          slug: "empty",
          name: "Empty",
          tagline: "No modules",
          moduleSlugs: [],
        })
      ).rejects.toThrow(BadRequestError);
    });
  });

  describe("getDefaultPlan", () => {
    it("returns default plan", async () => {
      vi.mocked(productRepository.findDefaultPlan).mockResolvedValue(mockPlan);
      const result = await productService.getDefaultPlan("prod-001");
      expect(result.isDefault).toBe(true);
    });

    it("throws NotFoundError when no default plan", async () => {
      vi.mocked(productRepository.findDefaultPlan).mockResolvedValue(null);
      await expect(
        productService.getDefaultPlan("prod-001")
      ).rejects.toThrow(NotFoundError);
    });
  });
});
