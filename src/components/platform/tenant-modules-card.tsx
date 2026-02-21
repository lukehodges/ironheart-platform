"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import type { TenantModuleStatus } from "@/types/platform-admin"
import { usePlatformTenants } from "@/hooks/use-platform-tenants"
import { toast } from "sonner"

interface TenantModulesCardProps {
  tenantId: string
  modules: TenantModuleStatus[]
}

export function TenantModulesCard({ tenantId, modules }: TenantModulesCardProps) {
  const { toggleModule } = usePlatformTenants()

  const handleToggle = (moduleId: string, currentState: boolean) => {
    toggleModule.mutate(
      {
        tenantId,
        moduleId,
        isEnabled: !currentState,
      },
      {
        onSuccess: () => {
          toast.success(`Module ${!currentState ? "enabled" : "disabled"}`)
        },
        onError: (error) => {
          toast.error(`Failed to toggle module: ${error.message}`)
        },
      }
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Modules</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {modules.map((module) => (
            <div
              key={module.moduleId}
              className="flex items-start justify-between gap-4 p-3 rounded-lg border"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium">{module.name}</p>
                  {module.isPremium && (
                    <Badge variant="secondary" className="text-xs">
                      Premium
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {module.description}
                </p>
                {module.monthlyRate && (
                  <p className="text-xs text-muted-foreground mt-1">
                    ${module.monthlyRate}/month
                  </p>
                )}
              </div>
              <Switch
                checked={module.isEnabled}
                onCheckedChange={() => handleToggle(module.moduleId, module.isEnabled)}
                disabled={toggleModule.isPending}
              />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
