import { Suspense } from "react"
import { TenantListTable } from "@/components/platform/tenant-list-table"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import Link from "next/link"
import { Skeleton } from "@/components/ui/skeleton"

export default function TenantsPage() {
  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tenants</h1>
          <p className="text-muted-foreground mt-1">
            Manage all tenants on the platform
          </p>
        </div>
        <Link href="/platform/tenants/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Create Tenant
          </Button>
        </Link>
      </div>

      {/* Tenant List */}
      <Suspense fallback={<Skeleton className="h-[600px] w-full" />}>
        <TenantListTable />
      </Suspense>
    </div>
  )
}
