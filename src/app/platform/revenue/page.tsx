import { db } from "@/shared/db"
import { tenants } from "@/shared/db/schemas/tenant.schema"
import { products, productPlans } from "@/shared/db/schemas/product.schema"
import { eq, and, isNull, isNotNull, count } from "drizzle-orm"

export default async function RevenuePage() {
  const productList = await db.select().from(products).orderBy(products.name)

  const revenueByProduct = await Promise.all(
    productList.map(async (product) => {
      const [activeCount] = await db
        .select({ count: count() })
        .from(tenants)
        .where(
          and(
            eq(tenants.productId, product.id),
            isNotNull(tenants.subscriptionId),
            isNull(tenants.deletedAt)
          )
        )

      const plans = await db
        .select()
        .from(productPlans)
        .where(eq(productPlans.productId, product.id))

      const defaultPlan = plans.find((p) => p.isDefault) ?? plans[0]
      const pricePerMonth = defaultPlan?.priceMonthly ?? 0
      const subscriberCount = activeCount?.count ?? 0
      const mrr = (subscriberCount * pricePerMonth) / 100

      return {
        name: product.name,
        slug: product.slug,
        subscribers: subscriberCount,
        pricePerMonth: pricePerMonth / 100,
        mrr,
      }
    })
  )

  const totalMrr = revenueByProduct.reduce((sum, p) => sum + p.mrr, 0)
  const totalSubscribers = revenueByProduct.reduce(
    (sum, p) => sum + p.subscribers,
    0
  )

  return (
    <div className="p-8 space-y-8">
      <h1 className="text-2xl font-semibold">Revenue</h1>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-lg border bg-card p-6">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            MRR
          </p>
          <p className="mt-2 text-3xl font-bold">
            £{totalMrr.toLocaleString("en-GB", { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-6">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            ARR
          </p>
          <p className="mt-2 text-3xl font-bold">
            £{(totalMrr * 12).toLocaleString("en-GB", { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-6">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Total Subscribers
          </p>
          <p className="mt-2 text-3xl font-bold">{totalSubscribers}</p>
        </div>
      </div>

      {/* Per-product breakdown */}
      <div className="rounded-lg border bg-card">
        <div className="p-4 border-b">
          <h2 className="text-sm font-semibold">Revenue by Product</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="px-4 py-3 font-medium">Product</th>
              <th className="px-4 py-3 font-medium text-right">Price</th>
              <th className="px-4 py-3 font-medium text-right">Subscribers</th>
              <th className="px-4 py-3 font-medium text-right">MRR</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {revenueByProduct.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                  No products yet.
                </td>
              </tr>
            ) : (
              revenueByProduct.map((p) => (
                <tr key={p.slug}>
                  <td className="px-4 py-3 font-medium">{p.name}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground">
                    £{p.pricePerMonth.toFixed(2)}/mo
                  </td>
                  <td className="px-4 py-3 text-right">{p.subscribers}</td>
                  <td className="px-4 py-3 text-right font-medium">
                    £{p.mrr.toLocaleString("en-GB", { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
