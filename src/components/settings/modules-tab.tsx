"use client"

import { useState, useMemo } from "react"
import { api } from "@/lib/trpc/react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { moduleRegistry } from "@/shared/module-system/register-all"
import { ModuleHierarchyTree } from "./module-hierarchy-tree"
import { ModuleSettingsForm } from "./module-settings-form"
import { GitFork, LayoutGrid, Settings } from "lucide-react"

type ViewMode = "cards" | "tree"

/**
 * Merged view of a module: registry manifest is the source of truth for
 * what modules exist; DB provides the tenant-specific enabled/disabled status.
 */
interface MergedModule {
  moduleSlug: string
  moduleName: string
  isEnabled: boolean
  /** true when a matching row exists in the tenant's DB */
  inDb: boolean
}

/**
 * ModulesTab - Module toggle cards + dependency tree for settings
 *
 * The server-side module registry is the source of truth for which modules
 * exist. DB data (tenant.listModules) provides the enabled/disabled state.
 * Modules in the registry but missing from the DB still appear (core = always
 * enabled, optional = disabled).
 */
export function ModulesTab() {
  const [viewMode, setViewMode] = useState<ViewMode>("cards")
  const {
    data: dbModules,
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

  // Merge registry manifests with DB data - registry takes precedence
  const modules = useMemo<MergedModule[]>(() => {
    const allManifests = moduleRegistry.getAllManifests()
    const dbMap = new Map(
      (dbModules ?? []).map((m) => [m.moduleSlug, m])
    )

    return allManifests.map((manifest) => {
      const dbRow = dbMap.get(manifest.slug)
      return {
        moduleSlug: manifest.slug,
        moduleName: manifest.name,
        // Core modules are always enabled; optional modules use DB state
        isEnabled: manifest.isCore ? true : (dbRow?.isEnabled ?? false),
        inDb: !!dbRow,
      }
    })
  }, [dbModules])

  const enabledSlugs = modules
    .filter((m) => m.isEnabled)
    .map((m) => m.moduleSlug)

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
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          Enable or disable optional features. Core modules cannot be disabled.
        </p>
        <div className="flex shrink-0 items-center rounded-lg border border-border p-0.5">
          <button
            type="button"
            onClick={() => setViewMode("cards")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
              viewMode === "cards"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            Cards
          </button>
          <button
            type="button"
            onClick={() => setViewMode("tree")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
              viewMode === "tree"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <GitFork className="h-3.5 w-3.5" />
            Tree
          </button>
        </div>
      </div>

      {viewMode === "tree" ? (
        <ModuleHierarchyTree />
      ) : (
        <>

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
      </>
      )}

      {/* Module Settings */}
      <ModuleSettingsSection modules={modules} />
    </div>
  )
}

/**
 * ModuleSettingsSection - Renders tabbed settings forms for enabled modules
 * that have settingsDefinitions in their manifest.
 */
function ModuleSettingsSection({
  modules,
}: {
  modules: { moduleSlug: string; moduleName: string; isEnabled: boolean }[]
}) {
  const modulesWithSettings = useMemo(() => {
    return modules.filter((m) => {
      if (!m.isEnabled) return false
      const manifest = moduleRegistry.getManifest(m.moduleSlug)
      return manifest?.settingsDefinitions && manifest.settingsDefinitions.length > 0
    })
  }, [modules])

  if (modulesWithSettings.length === 0) {
    return (
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Settings className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-medium text-muted-foreground">Module Settings</h3>
        </div>
        <div className="rounded-lg border border-dashed border-muted-foreground/50 p-8 text-center">
          <p className="text-sm text-muted-foreground">
            No enabled modules have configurable settings.
          </p>
        </div>
      </div>
    )
  }

  const defaultTab = modulesWithSettings[0]!.moduleSlug

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Settings className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-medium text-muted-foreground">Module Settings</h3>
      </div>
      <Tabs defaultValue={defaultTab}>
        <TabsList>
          {modulesWithSettings.map((mod) => (
            <TabsTrigger key={mod.moduleSlug} value={mod.moduleSlug}>
              {mod.moduleName}
            </TabsTrigger>
          ))}
        </TabsList>
        {modulesWithSettings.map((mod) => (
          <TabsContent key={mod.moduleSlug} value={mod.moduleSlug}>
            <ModuleSettingsForm moduleSlug={mod.moduleSlug} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
