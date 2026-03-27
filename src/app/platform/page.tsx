import { db } from "@/shared/db"
import { tenants } from "@/shared/db/schemas/tenant.schema"
import { products } from "@/shared/db/schemas/product.schema"
import { eq, count, and, gte, isNull } from "drizzle-orm"

async function getDashboardData() {
  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  const [totalTenants] = await db
    .select({ count: count() })
    .from(tenants)
    .where(and(eq(tenants.status, "ACTIVE"), isNull(tenants.deletedAt)))

  const [newTenants] = await db
    .select({ count: count() })
    .from(tenants)
    .where(
      and(
        eq(tenants.status, "ACTIVE"),
        gte(tenants.createdAt, thirtyDaysAgo),
        isNull(tenants.deletedAt)
      )
    )

  const [trialTenants] = await db
    .select({ count: count() })
    .from(tenants)
    .where(and(eq(tenants.status, "TRIAL"), isNull(tenants.deletedAt)))

  const productList = await db.select().from(products).orderBy(products.name)

  const productStats = await Promise.all(
    productList.map(async (product) => {
      const [tenantCount] = await db
        .select({ count: count() })
        .from(tenants)
        .where(
          and(
            eq(tenants.productId, product.id),
            isNull(tenants.deletedAt)
          )
        )
      return {
        id: product.id,
        slug: product.slug,
        name: product.name,
        isPublished: product.isPublished,
        tenantCount: tenantCount?.count ?? 0,
      }
    })
  )

  return {
    totalTenants: totalTenants?.count ?? 0,
    newTenants: newTenants?.count ?? 0,
    trialTenants: trialTenants?.count ?? 0,
    products: productStats,
  }
}

export default async function PlatformDashboardPage() {
  const data = await getDashboardData()

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          {new Date().toLocaleDateString("en-GB", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-lg border bg-card p-6">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Active Tenants
          </p>
          <p className="mt-2 text-3xl font-bold">{data.totalTenants}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            +{data.newTenants} this month
          </p>
        </div>
        <div className="rounded-lg border bg-card p-6">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Trials Active
          </p>
          <p className="mt-2 text-3xl font-bold">{data.trialTenants}</p>
        </div>
        <div className="rounded-lg border bg-card p-6">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Products
          </p>
          <p className="mt-2 text-3xl font-bold">{data.products.length}</p>
        </div>
      </div>

      {/* Products */}
      <div className="rounded-lg border bg-card">
        <div className="p-4 border-b">
          <h2 className="text-sm font-semibold">Products</h2>
        </div>
        <div className="divide-y">
          {data.products.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No products yet. Create one from the Products page.
            </div>
          ) : (
            data.products.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium">{p.name}</span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full ${
                      p.isPublished
                        ? "bg-green-500/10 text-green-500"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {p.isPublished ? "Live" : "Draft"}
                  </span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {p.tenantCount} tenants
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
