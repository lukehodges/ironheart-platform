import { productService } from "@/modules/product/product.service"
import { ProductListClient } from "@/components/platform/product-list-client"

export default async function ProductsPage() {
  const products = await productService.listProductsWithStats({})

  return <ProductListClient initialProducts={products} />
}
