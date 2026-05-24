import { db } from "@/shared/db"
import { tenants } from "@/shared/db/schemas/tenant.schema"
import { engagements } from "@/shared/db/schemas/client-portal.schema"
import { customers } from "@/shared/db/schemas/customer.schema"
import { eq } from "drizzle-orm"
import { notFound } from "next/navigation"
import { ClientReportView } from "@/components/tenant-portal/client-report-view"

export default async function ClientReportPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>
}) {
  const { tenantSlug } = await params

  const tenant = await db.query.tenants.findFirst({
    where: eq(tenants.slug, tenantSlug),
  })
  if (!tenant) notFound()

  const engagement = await db.query.engagements.findFirst({
    where: eq(engagements.clientTenantId, tenant.id),
  })

  if (!engagement) {
    return (
      <div className="p-8 max-w-2xl">
        <h1 className="font-serif text-2xl mb-2">No engagement</h1>
        <p className="text-sm text-muted-foreground">
          No audit engagement linked to this tenant yet.
        </p>
      </div>
    )
  }

  const customer = await db.query.customers.findFirst({
    where: eq(customers.id, engagement.customerId),
  })

  return (
    <ClientReportView
      engagementId={engagement.id}
      engagementTitle={engagement.title}
      companyLabel={customer?.notes ?? tenant.name}
    />
  )
}
