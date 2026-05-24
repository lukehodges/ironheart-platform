import { db } from "@/shared/db"
import { engagements } from "@/shared/db/schemas/client-portal.schema"
import { customers } from "@/shared/db/schemas/customer.schema"
import { tenants } from "@/shared/db/schemas/tenant.schema"
import { eq } from "drizzle-orm"
import { notFound } from "next/navigation"
import { OnboardingShell } from "./_components/onboarding-shell"

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

  // Prefer the company-name stashed in customer.notes (provisioning pattern);
  // fall back to "FirstName LastName" or the tenant name.
  const nameFromCustomer = customer ? `${customer.firstName ?? ""} ${customer.lastName ?? ""}`.trim() : ""
  const companyLabel =
    (customer?.notes && customer.notes.trim()) ||
    nameFromCustomer ||
    clientTenant?.name ||
    "Unnamed company"

  return (
    <OnboardingShell
      engagementId={id}
      engagementTitle={eng.title}
      companyLabel={companyLabel}
      clientTenantProvisioned={!!eng.clientTenantId}
    />
  )
}
