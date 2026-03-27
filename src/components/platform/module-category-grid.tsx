"use client"

import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"

const MODULE_CATEGORIES = [
  {
    name: "Core",
    modules: ["booking", "scheduling", "customer", "team", "payment"],
  },
  {
    name: "Engagement",
    modules: ["forms", "review", "notification", "outreach", "ai"],
  },
  {
    name: "Operations",
    modules: ["workflow", "analytics", "calendar-sync", "pipeline"],
  },
  {
    name: "Developer",
    modules: ["developer"],
  },
] as const

const DEPENDENCY_HINTS: Record<string, string[]> = {
  booking: ["scheduling"],
  review: ["customer"],
  forms: ["customer"],
  outreach: ["customer", "notification"],
  workflow: ["notification"],
  pipeline: ["customer"],
  "calendar-sync": ["booking", "scheduling"],
}

interface ModuleCategoryGridProps {
  selected: string[]
  onChange: (modules: string[]) => void
  readOnly?: boolean
}

export function ModuleCategoryGrid({ selected, onChange, readOnly }: ModuleCategoryGridProps) {
  const toggle = (mod: string) => {
    if (readOnly) return
    const next = selected.includes(mod)
      ? selected.filter((m) => m !== mod)
      : [...selected, mod]
    onChange(next)
  }

  const getHint = (mod: string): string | null => {
    const deps = DEPENDENCY_HINTS[mod]
    if (!deps) return null
    const missing = deps.filter((d) => !selected.includes(d))
    if (missing.length === 0) return null
    return `Works best with: ${missing.join(", ")}`
  }

  return (
    <div className="space-y-6">
      {MODULE_CATEGORIES.map((category) => {
        const enabledCount = category.modules.filter((m) => selected.includes(m)).length
        return (
          <div key={category.name}>
            <div className="flex items-center gap-2 mb-3">
              <h4 className="text-sm font-medium">{category.name}</h4>
              <span className="text-xs text-muted-foreground">
                ({enabledCount}/{category.modules.length} enabled)
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {category.modules.map((mod) => {
                const isEnabled = selected.includes(mod)
                const hint = !isEnabled ? null : getHint(mod)
                return (
                  <div
                    key={mod}
                    className={`flex items-center justify-between rounded-lg border px-3 py-2.5 transition-colors ${
                      isEnabled
                        ? "border-primary/30 bg-primary/5"
                        : "border-border"
                    }`}
                  >
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{mod}</span>
                      {hint && (
                        <span className="text-[11px] text-amber-500 mt-0.5">{hint}</span>
                      )}
                    </div>
                    <Switch
                      checked={isEnabled}
                      onCheckedChange={() => toggle(mod)}
                      disabled={readOnly}
                    />
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export { MODULE_CATEGORIES, DEPENDENCY_HINTS }
