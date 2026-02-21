'use client'

import { api } from '@/lib/trpc/react'
import { Button } from '@/components/ui/button'
import { AlertCircle } from 'lucide-react'

export function ImpersonationBanner() {
  const { data: impersonation, isLoading } = api.platform.getActiveImpersonation.useQuery()
  const endImpersonation = api.platform.endImpersonation.useMutation({
    onSuccess: () => {
      window.location.href = '/platform/tenants'
    },
  })

  if (isLoading || !impersonation) {
    return null
  }

  return (
    <div className="bg-destructive text-destructive-foreground px-4 py-2 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <AlertCircle className="h-4 w-4" />
        <span className="text-sm font-medium">
          Impersonating {impersonation.tenantName} as Platform Admin
        </span>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={() => endImpersonation.mutate()}
        disabled={endImpersonation.isPending}
      >
        {endImpersonation.isPending ? 'Ending...' : 'End Impersonation'}
      </Button>
    </div>
  )
}
