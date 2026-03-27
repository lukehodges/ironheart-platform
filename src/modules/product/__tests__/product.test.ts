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
    listWithStats: vi.fn(),
    updatePlan: vi.fn(),
    cloneProduct: vi.fn(),
    archiveProduct: vi.fn(),
    unarchiveProduct: vi.fn(),
    getProductAnalytics: vi.fn(),
    getProductComparison: vi.fn(),
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
  archivedAt: null,
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

const mockProductWithStats = {
  ...mockProduct,
  tenantCount: 24,
  activeTenantCount: 20,
  trialTenantCount: 4,
  mrr: 58000,
  planCount: 3,
  tenantGrowthThisMonth: 3,
};

const mockAnalytics = {
  mrr: 58000,
  mrrChange: 12.5,
  totalTenants: 24,
  trialConversionRate: 83.3,
  churnRate: 4.2,
  tenantsByPlan: [{ planId: "plan-001", planName: "Starter", count: 24 }],
};

const mockComparison = [
  { productId: "prod-001", productName: "IronBook", moduleSlugs: ["booking", "customer", "scheduling"] },
  { productId: "prod-002", productName: "IronReview", moduleSlugs: ["booking", "customer", "review"] },
];

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

  describe("listProductsWithStats", () => {
    it("returns products with stats", async () => {
      vi.mocked(productRepository.listWithStats).mockResolvedValue([mockProductWithStats]);
      const result = await productService.listProductsWithStats({});
      expect(result).toHaveLength(1);
      expect(result[0].mrr).toBe(58000);
      expect(result[0].tenantCount).toBe(24);
    });

    it("passes filters through to repository", async () => {
      vi.mocked(productRepository.listWithStats).mockResolvedValue([]);
      await productService.listProductsWithStats({ status: "live", search: "barber" });
      expect(productRepository.listWithStats).toHaveBeenCalledWith({ status: "live", search: "barber" });
    });
  });

  describe("cloneProduct", () => {
    it("clones a product", async () => {
      vi.mocked(productRepository.cloneProduct).mockResolvedValue({
        ...mockProduct,
        id: "prod-002",
        slug: "ironbook-copy",
        name: "IronBook (Copy)",
        isPublished: false,
      });
      const result = await productService.cloneProduct("prod-001");
      expect(result.slug).toBe("ironbook-copy");
      expect(result.isPublished).toBe(false);
      expect(productRepository.cloneProduct).toHaveBeenCalledWith("prod-001");
    });
  });

  describe("archiveProduct", () => {
    it("archives a product", async () => {
      vi.mocked(productRepository.archiveProduct).mockResolvedValue({
        ...mockProduct,
        archivedAt: new Date(),
      });
      const result = await productService.archiveProduct("prod-001");
      expect(result.archivedAt).toBeTruthy();
      expect(productRepository.archiveProduct).toHaveBeenCalledWith("prod-001");
    });
  });

  describe("unarchiveProduct", () => {
    it("unarchives a product", async () => {
      vi.mocked(productRepository.unarchiveProduct).mockResolvedValue({
        ...mockProduct,
        archivedAt: null,
      });
      const result = await productService.unarchiveProduct("prod-001");
      expect(result.archivedAt).toBeNull();
      expect(productRepository.unarchiveProduct).toHaveBeenCalledWith("prod-001");
    });
  });

  describe("getProductAnalytics", () => {
    it("returns analytics for a product", async () => {
      vi.mocked(productRepository.getProductAnalytics).mockResolvedValue(mockAnalytics);
      const result = await productService.getProductAnalytics("prod-001");
      expect(result.mrr).toBe(58000);
      expect(result.tenantsByPlan).toHaveLength(1);
    });
  });

  describe("getProductComparison", () => {
    it("returns comparison data for multiple products", async () => {
      vi.mocked(productRepository.getProductComparison).mockResolvedValue(mockComparison);
      const result = await productService.getProductComparison(["prod-001", "prod-002"]);
      expect(result).toHaveLength(2);
      expect(result[0].moduleSlugs).toContain("booking");
    });
  });

  describe("updatePlan", () => {
    it("updates a plan", async () => {
      vi.mocked(productRepository.updatePlan).mockResolvedValue({
        ...mockPlan,
        name: "Pro",
        priceMonthly: 4900,
      });
      const result = await productService.updatePlan("plan-001", { id: "plan-001", name: "Pro", priceMonthly: 4900 });
      expect(result.name).toBe("Pro");
      expect(result.priceMonthly).toBe(4900);
    });
  });
});
