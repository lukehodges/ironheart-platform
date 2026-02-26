"use client"

import { useState, useMemo, useCallback, useEffect } from "react"
import { api } from "@/lib/trpc/react"
import { moduleRegistry } from "@/shared/module-system/register-all"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ModuleSettingField } from "./module-setting-field"
import { toast } from "sonner"
import type { ModuleSettingDefinition } from "@/shared/module-system/types"

interface ModuleSettingsFormProps {
  moduleSlug: string
}

export function ModuleSettingsForm({ moduleSlug }: ModuleSettingsFormProps) {
  const manifest = moduleRegistry.getManifest(moduleSlug)
  const definitions = manifest?.settingsDefinitions ?? []

  const {
    data: serverSettings,
    isLoading,
    error,
  } = api.tenant.getModuleSettings.useQuery(
    { moduleSlug },
    { staleTime: 60_000 }
  )

  const utils = api.useUtils()

  const updateMutation = api.tenant.updateModuleSettings.useMutation({
    onSuccess: () => {
      toast.success("Settings saved successfully")
      utils.tenant.getModuleSettings.invalidate({ moduleSlug })
    },
    onError: (err) => {
      toast.error(err.message || "Failed to save settings")
    },
  })

  const [localValues, setLocalValues] = useState<Record<string, unknown>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Sync server data into local state when it arrives
  useEffect(() => {
    if (serverSettings) {
      setLocalValues(serverSettings)
    }
  }, [serverSettings])

  const handleChange = useCallback(
    (key: string, value: unknown) => {
      setLocalValues((prev) => ({ ...prev, [key]: value }))
      // Clear error on change
      if (errors[key]) {
        setErrors((prev) => {
          const next = { ...prev }
          delete next[key]
          return next
        })
      }
    },
    [errors]
  )

  // Group definitions by category, sorted by order
  const groupedDefinitions = useMemo(() => {
    const groups = new Map<string, ModuleSettingDefinition[]>()
    const sorted = [...definitions].sort(
      (a, b) => (a.order ?? 0) - (b.order ?? 0)
    )
    for (const def of sorted) {
      const category = def.category ?? "General"
      const group = groups.get(category)
      if (group) {
        group.push(def)
      } else {
        groups.set(category, [def])
      }
    }
    return groups
  }, [definitions])

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    for (const def of definitions) {
      const val = localValues[def.key]

      if (def.type === "number") {
        if (val !== undefined && val !== null && val !== "") {
          const num = Number(val)
          if (isNaN(num)) {
            newErrors[def.key] = "Must be a valid number"
            continue
          }
          if (def.validation?.min !== undefined && num < def.validation.min) {
            newErrors[def.key] = `Minimum value is ${def.validation.min}`
          }
          if (def.validation?.max !== undefined && num > def.validation.max) {
            newErrors[def.key] = `Maximum value is ${def.validation.max}`
          }
        }
      }

      if (def.type === "json" && typeof val === "string" && val.trim()) {
        try {
          JSON.parse(val)
        } catch {
          newErrors[def.key] = "Invalid JSON syntax"
        }
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!validate()) return

    // Build the settings payload: transform json strings back to objects
    const settings: Record<string, unknown> = {}
    for (const def of definitions) {
      const val = localValues[def.key]
      if (def.type === "json" && typeof val === "string") {
        try {
          settings[def.key] = JSON.parse(val)
        } catch {
          settings[def.key] = val
        }
      } else {
        settings[def.key] = val
      }
    }

    updateMutation.mutate({ moduleSlug, settings })
  }

  if (!definitions.length) {
    return (
      <div className="rounded-lg border border-dashed border-muted-foreground/50 p-8 text-center">
        <p className="text-sm text-muted-foreground">
          No settings available for this module.
        </p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
        <p className="text-sm text-destructive">
          Failed to load module settings. Please try again.
        </p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border p-6 space-y-4">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 animate-fade-in">
      {Array.from(groupedDefinitions.entries()).map(([category, defs]) => (
        <Card key={category}>
          <CardHeader>
            <CardTitle>{category}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {defs.map((def) => (
              <ModuleSettingField
                key={def.key}
                definition={def}
                value={localValues[def.key] ?? def.defaultValue}
                onChange={handleChange}
                error={errors[def.key]}
                disabled={updateMutation.isPending}
              />
            ))}
          </CardContent>
        </Card>
      ))}

      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={updateMutation.isPending}
          loading={updateMutation.isPending}
          className="min-w-[200px]"
        >
          {updateMutation.isPending ? "Saving..." : "Save Settings"}
        </Button>
      </div>
    </form>
  )
}
