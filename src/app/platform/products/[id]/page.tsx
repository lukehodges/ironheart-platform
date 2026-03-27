import { notFound } from "next/navigation"
import { db } from "@/shared/db"
import { products, productPlans } from "@/shared/db/schemas/product.schema"
import { eq } from "drizzle-orm"
import { ProductForm } from "@/components/platform/product-form"

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

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-semibold">{product.name}</h1>
      <ProductForm
        initialData={{
          id: product.id,
          slug: product.slug,
          name: product.name,
          tagline: product.tagline,
          description: product.description,
          domain: product.domain,
          moduleSlugs: product.moduleSlugs ?? [],
          isPublished: product.isPublished,
        }}
      />

      {/* Plans section */}
      <div className="border-t pt-6 mt-8">
        <h2 className="text-lg font-semibold mb-4">Plans</h2>
        {plans.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No plans configured. Add a plan with a Stripe Price ID to enable signups.
          </p>
        ) : (
          <div className="space-y-2">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className="flex items-center justify-between rounded-lg border px-4 py-3"
              >
                <div>
                  <p className="font-medium">{plan.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {plan.stripePriceId}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium">
                    £{(plan.priceMonthly / 100).toFixed(2)}/mo
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {plan.trialDays}d trial
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
