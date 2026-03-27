import { notFound } from "next/navigation"
import Link from "next/link"
import { db } from "@/shared/db"
import { products, productPlans } from "@/shared/db/schemas/product.schema"
import { eq, and } from "drizzle-orm"

export default async function ProductLandingPage({
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

  const plans = await db
    .select()
    .from(productPlans)
    .where(eq(productPlans.productId, product.id))
    .orderBy(productPlans.priceMonthly)

  const defaultPlan = plans.find((p) => p.isDefault) ?? plans[0]

  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <header className="flex items-center justify-between px-8 py-4 border-b border-gray-100">
        <span className="text-lg font-semibold text-gray-900">
          {product.name}
        </span>
        <Link
          href={`/signup/${product.slug}`}
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 transition-colors"
        >
          Start Free Trial
        </Link>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-3xl px-8 py-24 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
          {product.tagline}
        </h1>
        {product.description && (
          <p className="mt-6 text-lg text-gray-600 leading-relaxed">
            {product.description}
          </p>
        )}
        <div className="mt-8 flex items-center justify-center gap-4">
          <Link
            href={`/signup/${product.slug}`}
            className="rounded-lg bg-gray-900 px-6 py-3 text-sm font-medium text-white hover:bg-gray-800 transition-colors"
          >
            Start Free Trial
          </Link>
        </div>
      </section>

      {/* Modules */}
      <section className="mx-auto max-w-4xl px-8 pb-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(product.moduleSlugs ?? []).map((slug) => (
            <div
              key={slug}
              className="rounded-lg border border-gray-200 p-5"
            >
              <p className="font-medium text-gray-900 capitalize">
                {slug.replace(/-/g, " ")}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      {defaultPlan && (
        <section className="border-t border-gray-100 py-16 text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-4">
            Simple pricing
          </p>
          <div className="inline-block rounded-xl border border-gray-200 px-10 py-8">
            <p className="text-4xl font-bold text-gray-900">
              £{(defaultPlan.priceMonthly / 100).toFixed(0)}
              <span className="text-base font-normal text-gray-500">/mo</span>
            </p>
            {defaultPlan.trialDays > 0 && (
              <p className="mt-2 text-sm text-gray-500">
                {defaultPlan.trialDays}-day free trial
              </p>
            )}
            {((defaultPlan.features as string[]) ?? []).length > 0 && (
              <ul className="mt-4 space-y-2 text-left text-sm text-gray-600">
                {((defaultPlan.features as string[]) ?? []).map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>
            )}
            <Link
              href={`/signup/${product.slug}`}
              className="mt-6 inline-block rounded-lg bg-gray-900 px-8 py-3 text-sm font-medium text-white hover:bg-gray-800 transition-colors"
            >
              Get Started
            </Link>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="border-t border-gray-100 py-6 text-center">
        <p className="text-xs text-gray-400">
          Powered by <span className="font-medium text-gray-500">Ironheart</span>
        </p>
      </footer>
    </div>
  )
}
