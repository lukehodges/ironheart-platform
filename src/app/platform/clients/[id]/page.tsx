import { db } from "@/shared/db"
import { engagements } from "@/shared/db/schemas/client-portal.schema"
import { customers } from "@/shared/db/schemas/customer.schema"
import { auditReports } from "@/shared/db/schemas/report-generator.schema"
import { eq } from "drizzle-orm"
import { notFound } from "next/navigation"
import { EngagementHub } from "@/components/platform-clients/engagement-hub"

export default async function EngagementHubPage({
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

  // Fetch report status directly — avoids tenant-context issues with moduleProcedure
  const report = await db.query.auditReports.findFirst({
    where: eq(auditReports.engagementId, id),
    columns: { status: true },
  })

  return (
    <EngagementHub
      engagementId={id}
      engagement={{
        id: eng.id,
        title: eng.title,
        stage: eng.stage ?? "DISCOVERY",
        type: eng.type,
        status: eng.status,
        auditWindowStart: eng.auditWindowStart ?? null,
        auditWindowEnd: eng.auditWindowEnd ?? null,
        qualificationData: eng.qualificationData as Record<string, unknown> | null,
        createdAt: eng.createdAt,
      }}
      customer={
        customer
          ? {
              name:
                (`${customer.firstName ?? ""} ${customer.lastName ?? ""}`.trim() ||
                customer.email) ??
                "Unknown",
              email: customer.email ?? "",
              phone: customer.phone ?? null,
              company:
                customer.notes?.split("\n")[0]?.trim() ?? "—",
            }
          : null
      }
      reportStatus={report?.status ?? null}
    />
  )
}
