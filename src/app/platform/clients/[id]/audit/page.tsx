import { db } from "@/shared/db"
import { engagements } from "@/shared/db/schemas/client-portal.schema"
import { customers } from "@/shared/db/schemas/customer.schema"
import { eq } from "drizzle-orm"
import { notFound } from "next/navigation"
import { AuditWorkspace } from "@/components/audit/audit-workspace"

export default async function ConsultantAuditPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const eng = await db.query.engagements.findFirst({ where: eq(engagements.id, id) })
  if (!eng) notFound()

  const customer = await db.query.customers.findFirst({ where: eq(customers.id, eng.customerId) })

  const companyLabel = customer
    ? `${customer.firstName} ${customer.lastName}`.trim()
    : "Unnamed company"

  return (
    <AuditWorkspace
      engagementId={id}
      engagementTitle={eng.title}
      companyLabel={companyLabel}
      currentStage={eng.stage ?? "DISCOVERY"}
    />
  )
}
