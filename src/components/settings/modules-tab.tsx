"use client"

import { useState } from "react"
import { api } from "@/lib/trpc/react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { moduleRegistry } from "@/shared/module-system/register-all"

/**
 * ModulesTab — Module toggle cards for settings
 *
 * Queries tenant.listModules for real module data, uses the module
 * registry for dependency enforcement (canDisable/canEnable).
 */
export function ModulesTab() {
  const {
    data: modules,
    isLoading,
    error,
  } = api.tenant.listModules.useQuery(undefined, {
    staleTime: 60_000,
  })
  const utils = api.useUtils()

  const enableMutation = api.tenant.enableModule.useMutation({
    onSuccess: () => utils.tenant.listModules.invalidate(),
  })
  const disableMutation = api.tenant.disableModule.useMutation({
    onSuccess: () => utils.tenant.listModules.invalidate(),
  })

  // Optimistic state: moduleSlug -> isEnabled
  const [optimisticState, setOptimisticState] = useState<Record<string, boolean>>({})

  const enabledSlugs = modules
    ? modules.filter((m) => m.isEnabled).map((m) => m.moduleSlug)
    : []

  const handleToggleModule = async (moduleSlug: string, currentlyEnabled: boolean) => {
    const nextEnabled = !currentlyEnabled

    // Check dependency enforcement before toggling
    if (!nextEnabled) {
      const result = moduleRegistry.canDisable(moduleSlug, enabledSlugs)
      if (!result.allowed) {
        const reason = result.blockedBy.includes("__core__")
          ? "This is a core module and cannot be disabled."
          : `Cannot disable: ${result.blockedBy.join(", ")} depend on this module.`
        alert(reason)
        return
      }
    } else {
      const result = moduleRegistry.canEnable(moduleSlug, enabledSlugs)
      if (!result.allowed) {
        alert(`Enable these modules first: ${result.missingDeps.join(", ")}`)
        return
      }
    }

    // Optimistic update
    setOptimisticState((prev) => ({ ...prev, [moduleSlug]: nextEnabled }))

    try {
      if (nextEnabled) {
        await enableMutation.mutateAsync({ moduleKey: moduleSlug })
      } else {
        await disableMutation.mutateAsync({ moduleKey: moduleSlug })
      }
    } catch {
      // Revert on error
    } finally {
      setOptimisticState((prev) => {
        const next = { ...prev }
        delete next[moduleSlug]
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
        <p className="text-sm text-muted-foreground">No modules configured for this tenant.</p>
      </div>
    )
  }

  // Separate core from non-core using the registry
  const coreModules = modules.filter((m) => {
    const manifest = moduleRegistry.getManifest(m.moduleSlug)
    return manifest?.isCore
  })
  const optionalModules = modules.filter((m) => {
    const manifest = moduleRegistry.getManifest(m.moduleSlug)
    return !manifest?.isCore
  })

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">
          Enable or disable optional features. Core modules cannot be disabled.
        </p>
      </div>

      {coreModules.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Core Modules</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {coreModules.map((mod) => {
              const manifest = moduleRegistry.getManifest(mod.moduleSlug)
              return (
                <Card key={mod.moduleSlug} className="border-muted bg-muted/30">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base">{mod.moduleName}</CardTitle>
                      <Badge variant="secondary" className="text-xs">Core</Badge>
                    </div>
                    <CardDescription className="text-sm">
                      {manifest?.description ?? "Required system module"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground">Always enabled</p>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {optionalModules.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Optional Modules</h3>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {optionalModules.map((mod) => {
              const manifest = moduleRegistry.getManifest(mod.moduleSlug)
              const isEnabled = optimisticState[mod.moduleSlug] ?? mod.isEnabled
              const isToggling = mod.moduleSlug in optimisticState
              const isPending = enableMutation.isPending || disableMutation.isPending

              return (
                <Card
                  key={mod.moduleSlug}
                  className={cn(
                    "transition-all",
                    isEnabled && "border-primary/50 bg-primary/5"
                  )}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <CardTitle className="text-base">{mod.moduleName}</CardTitle>
                          {manifest?.availability === "addon" && (
                            <Badge variant="outline" className="text-xs">Addon</Badge>
                          )}
                        </div>
                        <CardDescription className="mt-1 text-sm">
                          {manifest?.description ?? ""}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent>
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        {isEnabled ? (
                          <p className="text-xs text-emerald-600 font-medium">Enabled</p>
                        ) : (
                          <p className="text-xs text-muted-foreground">Disabled</p>
                        )}
                      </div>
                      <Switch
                        checked={isEnabled}
                        onCheckedChange={() => handleToggleModule(mod.moduleSlug, mod.isEnabled)}
                        disabled={isToggling || isPending}
                        aria-label={`Toggle ${mod.moduleName} module`}
                      />
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
