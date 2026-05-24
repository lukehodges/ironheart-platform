import { db } from "@/shared/db"
import { engagements } from "@/shared/db/schemas/client-portal.schema"
import { customers } from "@/shared/db/schemas/customer.schema"
import { tenants } from "@/shared/db/schemas/tenant.schema"
import { eq } from "drizzle-orm"
import { notFound } from "next/navigation"
import EngagementHubClient from "./_components/engagement-hub-client"

export default async function ClientHubPage({
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
  if (!customer) notFound()

  const clientTenant = eng.clientTenantId
    ? await db.query.tenants.findFirst({
        where: eq(tenants.id, eng.clientTenantId),
      })
    : null

  // companyName lives in customer.notes per the provisioning-service tech-debt
  // comment (CLAUDE.md gotcha h. — customers has no companyName column).
  const companyLabel =
    (customer.notes ?? "").trim()
    || `${customer.firstName ?? ""} ${customer.lastName ?? ""}`.trim()
    || "Unnamed company"

  return (
    <EngagementHubClient
      engagement={{
        id: eng.id,
        title: eng.title,
        stage: eng.stage ?? "DISCOVERY",
        status: eng.status,
        type: eng.type,
        createdAt: eng.createdAt,
        updatedAt: eng.updatedAt,
      }}
      customer={{
        id: customer.id,
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: customer.email,
        phone: customer.phone,
        notes: customer.notes,
        createdAt: customer.createdAt,
      }}
      clientTenantSlug={clientTenant?.slug ?? null}
      companyLabel={companyLabel}
    />
  )
}
