import { notFound } from "next/navigation"
import { db } from "@/shared/db"
import { products, productPlans } from "@/shared/db/schemas/product.schema"
import { tenants } from "@/shared/db/schemas/tenant.schema"
import { eq, and, isNull } from "drizzle-orm"
import { productService } from "@/modules/product/product.service"
import { ProductDetailClient } from "@/components/platform/product-detail-client"

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const [product] = await db
    .select()
    .from(products)
    .where(eq(products.id, id))
    .limit(1)

  if (!product) notFound()

  const plans = await db
    .select()
    .from(productPlans)
    .where(eq(productPlans.productId, id))
    .orderBy(productPlans.priceMonthly)

  const productTenants = await db
    .select()
    .from(tenants)
    .where(and(eq(tenants.productId, id), isNull(tenants.deletedAt)))

  const analytics = await productService.getProductAnalytics(id)

  const productWithPlans = {
    id: product.id,
    slug: product.slug,
    name: product.name,
    tagline: product.tagline,
    description: product.description,
    logoUrl: product.logoUrl,
    domain: product.domain,
    moduleSlugs: product.moduleSlugs ?? [],
    isPublished: product.isPublished,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
    archivedAt: product.archivedAt ?? null,
    plans: plans.map((p) => ({
      id: p.id,
      productId: p.productId,
      slug: p.slug,
      name: p.name,
      priceMonthly: p.priceMonthly,
      priceYearly: p.priceYearly,
      trialDays: p.trialDays,
      stripePriceId: p.stripePriceId,
      features: (p.features as string[]) ?? [],
      isDefault: p.isDefault,
      createdAt: p.createdAt,
    })),
  }

  const tenantData = productTenants.map((t) => ({
    id: t.id,
    name: t.name,
    status: t.status,
    plan: t.plan,
    subscriptionId: t.subscriptionId,
    planId: t.planId,
    createdAt: t.createdAt,
  }))

  return (
    <ProductDetailClient
      product={productWithPlans}
      tenants={tenantData}
      analytics={analytics}
    />
  )
}
