import { withAuth } from "@workos-inc/authkit-nextjs"
import { db } from "@/shared/db"
import { tenants } from "@/shared/db/schemas/tenant.schema"
import { engagements } from "@/shared/db/schemas/client-portal.schema"
import { eq } from "drizzle-orm"
import { StageStrip } from "@/components/tenant-portal/stage-strip"
import { ActionCard } from "@/components/tenant-portal/action-card"

export default async function TenantDashboardPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>
}) {
  const { tenantSlug } = await params
  const { user } = await withAuth({ ensureSignedIn: true })

  const tenant = await db.query.tenants.findFirst({
    where: eq(tenants.slug, tenantSlug),
  })
  if (!tenant) return null

  // Active engagement for this client tenant
  const engagement = await db.query.engagements.findFirst({
    where: eq(engagements.clientTenantId, tenant.id),
  })

  const onboardingStages = [
    "CONTRACTED",
    "ONBOARDING",
    "AUDITING",
    "REPORTING",
  ]
  const onboardingEnabled =
    !!engagement && onboardingStages.includes(engagement.stage ?? "")

  const displayName = user.firstName ?? user.email

  return (
    <div className="p-8 space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="font-serif text-3xl">Welcome, {displayName}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Your audit engagement with Ironheart — track progress and complete the
          steps below.
        </p>
      </div>

      {/* Stage strip */}
      {engagement && <StageStrip currentStage={engagement.stage} />}

      {/* Action cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ActionCard
          icon="list-checks"
          title="Build your org chart"
          subtitle="Map your team so we know who to interview."
          href={`/${tenantSlug}/dashboard/onboarding`}
          disabled={!onboardingEnabled}
        />
        <ActionCard
          icon="calendar"
          title="Upcoming sessions"
          subtitle="View scheduled calls with your consultant."
          href={`/${tenantSlug}/dashboard/sessions`}
          disabled
          badge="Coming soon"
        />
        <ActionCard
          icon="file-text"
          title="View documents"
          subtitle="Access your audit deliverables and notes."
          href={`/${tenantSlug}/dashboard/documents`}
          disabled
          badge="Coming soon"
        />
      </div>
    </div>
  )
}
