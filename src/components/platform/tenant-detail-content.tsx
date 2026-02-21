"use client"

import { TenantDetailHeader } from "@/components/platform/tenant-detail-header"
import { TenantUsageCard } from "@/components/platform/tenant-usage-card"
import { TenantModulesCard } from "@/components/platform/tenant-modules-card"
import { useTenantDetail } from "@/hooks/use-platform-tenants"
import { usePlatformTenants } from "@/hooks/use-platform-tenants"
import { toast } from "sonner"
import type { TenantDetail, TenantModuleStatus } from "@/types/platform-admin"
import type { TenantRecord, TenantModule } from "@/modules/platform/platform.types"

interface TenantDetailContentProps {
  tenantId: string
}

// Transform backend TenantRecord to frontend TenantDetail
function transformTenantRecord(tenant: TenantRecord): TenantDetail {
  return {
    ...tenant,
    email: "", // TODO: Backend needs to return email
    userCount: 0, // TODO: Backend needs to return userCount
    bookingCount: 0, // TODO: Backend needs to return bookingCount
    domain: null,
    usage: {
      bookingsThisMonth: 0,
      activeUsers: 0,
      storageUsedMB: 0,
      storageQuotaMB: 1000,
      apiCallsThisMonth: 0,
      apiQuota: 10000,
    },
    billing: {
      mrr: 0,
      nextBillingDate: null,
      paymentMethod: null,
    },
    modules: [],
  }
}

// Transform backend TenantModule to frontend TenantModuleStatus
function transformTenantModules(modules: TenantModule[]): TenantModuleStatus[] {
  return modules.map((m) => ({
    moduleId: m.moduleId,
    slug: m.moduleSlug,
    name: m.moduleName,
    description: "", // TODO: Backend needs to return description
    isEnabled: m.isEnabled,
    isPremium: false, // TODO: Backend needs to return isPremium
    monthlyRate: m.monthlyRate ? parseFloat(m.monthlyRate) : null,
  }))
}

export function TenantDetailContent({ tenantId }: TenantDetailContentProps) {
  const { tenant, modules } = useTenantDetail(tenantId)
  const { suspend, activate } = usePlatformTenants()

  // Loading state
  if (tenant.isLoading || modules.isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading tenant details...</p>
      </div>
    )
  }

  // Error state - tenant not found
  if (!tenant.data) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-lg font-semibold">Tenant not found</p>
        <p className="text-muted-foreground">
          The tenant you are looking for does not exist or has been deleted.
        </p>
      </div>
    )
  }

  // Transform backend types to frontend types
  const tenantDetail = transformTenantRecord(tenant.data)
  const moduleStatuses = transformTenantModules(modules.data ?? [])

  const handleSuspend = () => {
    suspend.mutate(
      { id: tenantId, reason: "Suspended by platform admin" },
      {
        onSuccess: () => {
          toast.success(`${tenantDetail.name} has been suspended`)
        },
        onError: (error) => {
          toast.error(`Failed to suspend tenant: ${error.message}`)
        },
      }
    )
  }

  const handleActivate = () => {
    activate.mutate(
      { id: tenantId },
      {
        onSuccess: () => {
          toast.success(`${tenantDetail.name} has been activated`)
        },
        onError: (error) => {
          toast.error(`Failed to activate tenant: ${error.message}`)
        },
      }
    )
  }

  return (
    <div className="space-y-6">
      <TenantDetailHeader
        tenant={tenantDetail}
        onSuspend={handleSuspend}
        onActivate={handleActivate}
      />

      <div className="grid gap-6 md:grid-cols-2">
        <TenantUsageCard usage={tenantDetail.usage} />
        <TenantModulesCard
          tenantId={tenantId}
          modules={moduleStatuses}
        />
      </div>
    </div>
  )
}
