'use client'

import { api } from '@/lib/trpc/react'
import { toast } from 'sonner'

export function useImpersonate() {
  const startMutation = api.platform.startImpersonation.useMutation({
    onSuccess: (data) => {
      toast.success(`Now impersonating ${data.tenantName}`)
      // Redirect to tenant admin area
      window.location.href = '/admin'
    },
    onError: (error) => {
      toast.error(`Impersonation failed: ${error.message}`)
    },
  })

  const endMutation = api.platform.endImpersonation.useMutation({
    onSuccess: () => {
      toast.info('Impersonation ended')
      // Redirect back to platform admin
      window.location.href = '/platform/tenants'
    },
    onError: (error) => {
      toast.error(`Failed to end impersonation: ${error.message}`)
    },
  })

  const start = (tenantId: string, tenantName: string) => {
    toast.info(`Impersonating ${tenantName}...`)
    startMutation.mutate({ tenantId })
  }

  const end = () => {
    endMutation.mutate()
  }

  return {
    start,
    end,
    isStarting: startMutation.isPending,
    isEnding: endMutation.isPending,
  }
}
