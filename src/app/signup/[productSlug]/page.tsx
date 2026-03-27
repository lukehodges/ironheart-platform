import { notFound } from "next/navigation"
import { db } from "@/shared/db"
import { products } from "@/shared/db/schemas/product.schema"
import { eq, and } from "drizzle-orm"
import { SignupForm } from "@/components/signup/signup-form"

export default async function SignupPage({
  params,
}: {
  params: Promise<{ productSlug: string }>
}) {
  const { productSlug } = await params

  const [product] = await db
    .select()
    .from(products)
    .where(and(eq(products.slug, productSlug), eq(products.isPublished, true)))
    .limit(1)

  if (!product) notFound()

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">
            Get started with {product.name}
          </h1>
          <p className="mt-2 text-sm text-gray-600">{product.tagline}</p>
        </div>
        <SignupForm productSlug={product.slug} productName={product.name} />
        <p className="text-center text-xs text-gray-400">
          Powered by Ironheart
        </p>
      </div>
    </div>
  )
}
