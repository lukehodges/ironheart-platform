import { notFound } from "next/navigation"
import { db } from "@/shared/db"
import { tenants } from "@/shared/db/schemas/tenant.schema"
import { engagements } from "@/shared/db/schemas/client-portal.schema"
import { eq } from "drizzle-orm"
import { withAuth } from "@workos-inc/authkit-nextjs"
import { TenantDashboardShell } from "@/components/tenant-portal/dashboard-shell"
import { TenantContextProvider } from "@/components/tenant-portal/tenant-context"

export default async function TenantDashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ tenantSlug: string }>
}) {
  const { tenantSlug } = await params
  const { user } = await withAuth({ ensureSignedIn: true })

  // Belt-and-braces tenant verification (middleware already enforced access)
  const tenant = await db.query.tenants.findFirst({
    where: eq(tenants.slug, tenantSlug),
  })
  if (!tenant) notFound()

  // Fetch engagement stage so the shell can show/hide the Onboarding link
  const engagement = await db.query.engagements.findFirst({
    where: eq(engagements.clientTenantId, tenant.id),
    columns: { stage: true },
  })

  return (
    <TenantContextProvider
      tenant={{ id: tenant.id, slug: tenant.slug, name: tenant.name }}
    >
      <TenantDashboardShell
        user={{
          firstName: user.firstName ?? null,
          lastName: user.lastName ?? null,
          email: user.email,
        }}
        tenantName={tenant.name}
        tenantSlug={tenant.slug}
        engagementStage={engagement?.stage ?? null}
      >
        {children}
      </TenantDashboardShell>
    </TenantContextProvider>
  )
}
