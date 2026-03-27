import { logger } from "@/shared/logger";
import { NotFoundError, BadRequestError } from "@/shared/errors";
import { productRepository } from "./product.repository";
import type {
  ProductRecord, ProductWithPlans, ProductPlanRecord,
  CreateProductInput, UpdateProductInput, CreatePlanInput,
} from "./product.types";

const log = logger.child({ module: "product.service" });

async function listProducts(): Promise<ProductRecord[]> {
  return productRepository.list();
}

async function getProduct(id: string): Promise<ProductWithPlans> {
  const product = await productRepository.findByIdWithPlans(id);
  if (!product) throw new NotFoundError("Product", id);
  return product;
}

async function getPublishedProduct(slug: string): Promise<ProductWithPlans> {
  const product = await productRepository.findBySlugWithPlans(slug);
  if (!product || !product.isPublished) throw new NotFoundError("Product", slug);
  return product;
}

async function createProduct(input: CreateProductInput): Promise<ProductRecord> {
  if (input.moduleSlugs.length === 0) throw new BadRequestError("Product must include at least one module");
  return productRepository.create(input);
}

async function updateProduct(id: string, input: UpdateProductInput): Promise<ProductRecord> {
  if (input.moduleSlugs && input.moduleSlugs.length === 0) throw new BadRequestError("Product must include at least one module");
  return productRepository.update(id, input);
}

async function deleteProduct(id: string): Promise<void> {
  return productRepository.delete(id);
}

async function createPlan(input: CreatePlanInput): Promise<ProductPlanRecord> {
  return productRepository.createPlan(input);
}

async function getDefaultPlan(productId: string): Promise<ProductPlanRecord> {
  const plan = await productRepository.findDefaultPlan(productId);
  if (!plan) throw new NotFoundError("Default plan for product", productId);
  return plan;
}

async function deletePlan(id: string): Promise<void> {
  return productRepository.deletePlan(id);
}

export const productService = {
  listProducts, getProduct, getPublishedProduct,
  createProduct, updateProduct, deleteProduct,
  createPlan, getDefaultPlan, deletePlan,
};
