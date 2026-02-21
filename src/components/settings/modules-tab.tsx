"use client"

import { useState } from "react"
import { api } from "@/lib/trpc/react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { useSettingsMutations } from "@/hooks/use-settings-mutations"
import { cn } from "@/lib/utils"

/**
 * ModulesTab — Module toggle cards for settings
 *
 * Displays grid of module cards with:
 * - Module name and description
 * - Toggle switch (with optimistic updates)
 * - Premium badge if applicable
 * - Disabled state with upgrade message if not on correct plan
 *
 * Grid: 2 columns on desktop, 1 column on mobile
 *
 * @example
 * ```tsx
 * <ModulesTab />
 * ```
 */
export function ModulesTab() {
  // TODO: Implement settings router with getModules procedure
  // For now, stub the data to make build pass
  const isLoading = false
  const error = null
  const modules = [] as Array<{
    moduleId: string
    name: string
    description: string
    isEnabled: boolean
    isPremium: boolean
  }>
  const mutations = useSettingsMutations()

  // Optimistic state: moduleId -> isEnabled
  const [optimisticState, setOptimisticState] = useState<Record<string, boolean>>({})

  const handleToggleModule = async (moduleId: string, currentlyEnabled: boolean) => {
    const nextEnabled = !currentlyEnabled

    // Optimistic update
    setOptimisticState((prev) => ({
      ...prev,
      [moduleId]: nextEnabled,
    }))

    try {
      await mutations.toggleModule.mutateAsync({
        moduleId,
        isEnabled: nextEnabled,
      })

      // Clear optimistic state on success
      setOptimisticState((prev) => {
        const next = { ...prev }
        delete next[moduleId]
        return next
      })
    } catch {
      // Revert optimistic state on error
      setOptimisticState((prev) => {
        const next = { ...prev }
        delete next[moduleId]
        return next
      })
    }
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
        <p className="text-sm text-destructive">Failed to load modules. Please try again.</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-48 rounded-xl" />
        ))}
      </div>
    )
  }

  if (!modules || modules.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-muted-foreground/50 p-8 text-center">
        <p className="text-sm text-muted-foreground">No modules available.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">
          Enable or disable optional features. Premium modules require an active subscription.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {modules.map((module) => {
          // Get optimistic state, fallback to actual state
          const isEnabled = optimisticState[module.moduleId] ?? module.isEnabled
          const isToggling = module.moduleId in optimisticState

          // Determine if toggle should be disabled
          // (e.g., if on free plan and module is premium)
          const isDisabled = module.isPremium && !module.isEnabled
          const showUpgradeMessage = isDisabled

          return (
            <Card
              key={module.moduleId}
              className={cn(
                "transition-all",
                isEnabled && "border-primary/50 bg-primary/5",
                isDisabled && "opacity-75"
              )}
            >
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <CardTitle className="text-base">{module.name}</CardTitle>
                      {module.isPremium && (
                        <Badge variant="warning" className="text-xs">
                          Premium
                        </Badge>
                      )}
                    </div>
                    <CardDescription className="mt-1 text-sm">
                      {module.description}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {showUpgradeMessage && (
                      <p className="text-xs text-muted-foreground">
                        Upgrade your plan to enable this module
                      </p>
                    )}
                    {!showUpgradeMessage && isEnabled && (
                      <p className="text-xs text-success font-medium">Enabled</p>
                    )}
                    {!showUpgradeMessage && !isEnabled && (
                      <p className="text-xs text-muted-foreground">Disabled</p>
                    )}
                  </div>

                  <Switch
                    checked={isEnabled}
                    onCheckedChange={() =>
                      handleToggleModule(module.moduleId, module.isEnabled)
                    }
                    disabled={isDisabled || isToggling || mutations.toggleModule.isPending}
                    aria-label={`Toggle ${module.name} module`}
                  />
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {modules.some((m) => m.isPremium && !m.isEnabled) && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
          <p className="text-sm text-foreground">
            <span className="font-medium">Want more features?</span>
            {" "}Upgrade to unlock premium modules and advanced capabilities.
          </p>
        </div>
      )}
    </div>
  )
}
