import { db } from "@/shared/db"
import { tenants } from "@/shared/db/schemas/tenant.schema"
import { products } from "@/shared/db/schemas/product.schema"
import { isNotNull } from "drizzle-orm"

export default async function SubscriptionsPage() {
  const rows = await db
    .select({
      tenantId: tenants.id,
      tenantName: tenants.name,
      status: tenants.status,
      subscriptionId: tenants.subscriptionId,
      stripeCustomerId: tenants.stripeCustomerId,
      productId: tenants.productId,
      createdAt: tenants.createdAt,
      trialEndsAt: tenants.trialEndsAt,
    })
    .from(tenants)
    .where(isNotNull(tenants.subscriptionId))
    .orderBy(tenants.createdAt)

  const productIds = [...new Set(rows.map((r) => r.productId).filter(Boolean))] as string[]
  const productRows =
    productIds.length > 0
      ? await db.select().from(products)
      : []
  const productMap = new Map(productRows.map((p) => [p.id, p.name]))

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-semibold">Subscriptions</h1>

      <div className="rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="px-4 py-3 font-medium">Tenant</th>
              <th className="px-4 py-3 font-medium">Product</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Subscription ID</th>
              <th className="px-4 py-3 font-medium">Since</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  No subscriptions yet.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.tenantId}>
                  <td className="px-4 py-3 font-medium">{row.tenantName}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {row.productId ? productMap.get(row.productId) ?? "—" : "Custom"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        row.status === "ACTIVE"
                          ? "bg-green-500/10 text-green-500"
                          : row.status === "TRIAL"
                            ? "bg-amber-500/10 text-amber-500"
                            : "bg-red-500/10 text-red-500"
                      }`}
                    >
                      {row.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground font-mono text-xs">
                    {row.subscriptionId ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {row.createdAt.toLocaleDateString("en-GB")}
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
