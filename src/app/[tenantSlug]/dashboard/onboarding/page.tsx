import { db } from "@/shared/db"
import { engagements } from "@/shared/db/schemas/client-portal.schema"
import { tenants } from "@/shared/db/schemas/tenant.schema"
import { customers } from "@/shared/db/schemas/customer.schema"
import { eq } from "drizzle-orm"
import { notFound } from "next/navigation"
import { ClientOnboardingShell } from "@/components/onboarding/client-onboarding-shell"

export default async function ClientOnboardingPage({ params }: { params: Promise<{ tenantSlug: string }> }) {
  const { tenantSlug } = await params

  const tenant = await db.query.tenants.findFirst({ where: eq(tenants.slug, tenantSlug) })
  if (!tenant) notFound()

  // Find the engagement linked to this tenant (1:1 in 0.1)
  const engagement = await db.query.engagements.findFirst({
    where: eq(engagements.clientTenantId, tenant.id),
  })
  if (!engagement) {
    return (
      <div className="p-8 max-w-2xl">
        <h1 className="font-serif text-2xl mb-2">No engagement found</h1>
        <p className="text-sm text-muted-foreground">
          Your consultant hasn't set up an engagement yet. Check back later or contact your consultant.
        </p>
      </div>
    )
  }

  const customer = await db.query.customers.findFirst({
    where: eq(customers.id, engagement.customerId),
  })
  const nameFromCustomer = `${customer?.firstName ?? ""} ${customer?.lastName ?? ""}`.trim()
  const companyLabel = (customer?.notes ?? nameFromCustomer) || tenant.name

  return (
    <ClientOnboardingShell
      engagementId={engagement.id}
      engagementTitle={engagement.title}
      companyLabel={companyLabel}
      tenantSlug={tenantSlug}
    />
  )
}
