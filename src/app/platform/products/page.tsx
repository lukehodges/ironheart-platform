import Link from "next/link"
import { db } from "@/shared/db"
import { products } from "@/shared/db/schemas/product.schema"
import { tenants } from "@/shared/db/schemas/tenant.schema"
import { eq, count, isNull, and } from "drizzle-orm"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"

export default async function ProductsPage() {
  const productList = await db.select().from(products).orderBy(products.name)

  const productsWithCounts = await Promise.all(
    productList.map(async (product) => {
      const [tenantCount] = await db
        .select({ count: count() })
        .from(tenants)
        .where(and(eq(tenants.productId, product.id), isNull(tenants.deletedAt)))
      return { ...product, tenantCount: tenantCount?.count ?? 0 }
    })
  )

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Products</h1>
        <Link href="/platform/products/new">
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            New Product
          </Button>
        </Link>
      </div>

      <div className="rounded-lg border bg-card divide-y">
        {productsWithCounts.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">
            No products yet. Create your first product to start selling.
          </div>
        ) : (
          productsWithCounts.map((product) => (
            <Link
              key={product.id}
              href={`/platform/products/${product.id}`}
              className="flex items-center justify-between px-6 py-4 hover:bg-muted/50 transition-colors"
            >
              <div>
                <p className="font-medium">{product.name}</p>
                <p className="text-sm text-muted-foreground">
                  {product.tagline}
                </p>
                <div className="flex gap-2 mt-1">
                  {(product.moduleSlugs ?? []).map((slug) => (
                    <span
                      key={slug}
                      className="text-[10px] px-2 py-0.5 rounded bg-muted text-muted-foreground"
                    >
                      {slug}
                    </span>
                  ))}
                </div>
              </div>
              <div className="text-right">
                <span
                  className={`text-xs px-2 py-1 rounded-full ${
                    product.isPublished
                      ? "bg-green-500/10 text-green-500"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {product.isPublished ? "Live" : "Draft"}
                </span>
                <p className="text-sm text-muted-foreground mt-1">
                  {product.tenantCount} tenants
                </p>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  )
}
