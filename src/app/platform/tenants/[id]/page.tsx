import { Suspense } from "react"
import { TenantDetailContent } from "@/components/platform/tenant-detail-content"
import { Skeleton } from "@/components/ui/skeleton"

interface TenantDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function TenantDetailPage({ params }: TenantDetailPageProps) {
  const { id } = await params

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <Suspense fallback={<TenantDetailSkeleton />}>
        <TenantDetailContent tenantId={id} />
      </Suspense>
    </div>
  )
}

function TenantDetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-48 w-full" />
      <div className="grid gap-6 md:grid-cols-2">
        <Skeleton className="h-80 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    </div>
  )
}
