import { ProductForm } from "@/components/platform/product-form"

export default function NewProductPage() {
  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-semibold">Create Product</h1>
      <ProductForm />
    </div>
  )
}
