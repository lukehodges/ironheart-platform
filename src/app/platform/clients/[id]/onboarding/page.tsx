import { db } from "@/shared/db"
import { engagements } from "@/shared/db/schemas/client-portal.schema"
import { customers } from "@/shared/db/schemas/customer.schema"
import { tenants } from "@/shared/db/schemas/tenant.schema"
import { eq } from "drizzle-orm"
import { notFound } from "next/navigation"
import { ChartEditor } from "@/components/onboarding/chart-editor"

export default async function ConsultantOnboardingPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const eng = await db.query.engagements.findFirst({
    where: eq(engagements.id, id),
  })
  if (!eng) notFound()

  const customer = await db.query.customers.findFirst({
    where: eq(customers.id, eng.customerId),
  })

  const clientTenant = eng.clientTenantId
    ? await db.query.tenants.findFirst({
        where: eq(tenants.id, eng.clientTenantId),
      })
    : null

  // Build company label from customer name fields
  const companyLabel = customer
    ? `${customer.firstName} ${customer.lastName}`.trim()
    : "Unnamed company"

  return (
    <ChartEditor
      mode="consultant"
      engagementId={id}
      engagementTitle={eng.title}
      companyLabel={companyLabel}
      clientTenantSlug={clientTenant?.slug ?? null}
      clientTenantProvisioned={!!eng.clientTenantId}
    />
  )
}
