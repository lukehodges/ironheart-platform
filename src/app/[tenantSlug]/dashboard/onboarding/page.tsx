import { db } from "@/shared/db"
import { engagements } from "@/shared/db/schemas/client-portal.schema"
import { tenants } from "@/shared/db/schemas/tenant.schema"
import { customers } from "@/shared/db/schemas/customer.schema"
import { eq } from "drizzle-orm"
import { notFound } from "next/navigation"
import { PortalShell } from "./_components/portal-shell"

export default async function ClientOnboardingPage({ params }: { params: Promise<{ tenantSlug: string }> }) {
  const { tenantSlug } = await params

  const tenant = await db.query.tenants.findFirst({ where: eq(tenants.slug, tenantSlug) })
  if (!tenant) notFound()

  const engagement = await db.query.engagements.findFirst({
    where: eq(engagements.clientTenantId, tenant.id),
  })
  if (!engagement) {
    return (
      <div style={{ padding: 32, maxWidth: 640 }}>
        <h1 className="ih-serif" style={{ fontSize: 24, color: "var(--ih-ink)", margin: 0 }}>No engagement found</h1>
        <p style={{ fontSize: 13, color: "var(--ih-ink-50)", marginTop: 8 }}>
          Your consultant hasn&apos;t set up an engagement yet. Check back later or contact your consultant.
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
    <PortalShell
      engagementId={engagement.id}
      engagementTitle={engagement.title}
      companyLabel={companyLabel}
      tenantSlug={tenantSlug}
      stage={engagement.stage}
    />
  )
}
