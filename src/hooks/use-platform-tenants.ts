'use client'

import { api } from '@/lib/trpc/react'
import { useState } from 'react'
import type { TenantFilters } from '@/schemas/platform-admin.schemas'

export function usePlatformTenants() {
  const [filters, setFilters] = useState<TenantFilters>({ limit: 50 })

  const list = api.platform.listTenants.useQuery(filters)

  const utils = api.useUtils()

  const suspend = api.platform.suspendTenant.useMutation({
    onSuccess: () => {
      utils.platform.listTenants.invalidate()
      utils.platform.getTenant.invalidate()
    },
  })

  const activate = api.platform.activateTenant.useMutation({
    onSuccess: () => {
      utils.platform.listTenants.invalidate()
      utils.platform.getTenant.invalidate()
    },
  })

  const changePlan = api.platform.changePlan.useMutation({
    onSuccess: () => {
      utils.platform.getTenant.invalidate()
    },
  })

  const toggleModule = api.platform.setTenantModule.useMutation({
    onSuccess: () => {
      utils.platform.listTenantModules.invalidate()
      utils.platform.getTenant.invalidate()
    },
  })

  return {
    list,
    filters,
    setFilters,
    suspend,
    activate,
    changePlan,
    toggleModule,
  }
}

export function useTenantDetail(tenantId: string) {
  const tenant = api.platform.getTenant.useQuery({ id: tenantId })
  const modules = api.platform.listTenantModules.useQuery({ tenantId })

  return {
    tenant,
    modules,
  }
}
