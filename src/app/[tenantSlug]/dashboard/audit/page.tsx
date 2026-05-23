import { db } from "@/shared/db"
import { engagements } from "@/shared/db/schemas/client-portal.schema"
import { tenants } from "@/shared/db/schemas/tenant.schema"
import { eq } from "drizzle-orm"
import { notFound } from "next/navigation"
import { AuditProgressView } from "@/components/tenant-portal/audit-progress-view"

export default async function ClientAuditPage({
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
        <h1 className="font-serif text-2xl mb-2">No audit in progress</h1>
        <p className="text-sm text-muted-foreground">
          Your engagement hasn&apos;t started its audit phase yet.
        </p>
      </div>
    )
  }

  return (
    <AuditProgressView
      engagementId={engagement.id}
      engagementTitle={engagement.title}
      stage={engagement.stage ?? "DISCOVERY"}
    />
  )
}
