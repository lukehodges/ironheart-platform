import type { ModuleManifest } from "@/shared/module-system/types"

export const pipelineManifest: ModuleManifest = {
  slug: "pipeline",
  name: "Pipeline",
  description: "Sales pipeline with configurable stages, deal tracking, and automation",
  icon: "Layers",
  category: "operations",
  dependencies: ["customer"],
  routes: [
    { path: "/admin/pipeline", label: "Pipeline", permission: "pipeline:read" },
  ],
  sidebarItems: [
    { title: "Pipeline", href: "/admin/pipeline", icon: "Layers", section: "operations", permission: "pipeline:read" },
  ],
  quickActions: [],
  analyticsWidgets: [],
  permissions: ["pipeline:read", "pipeline:write", "pipeline:delete"],
  eventsProduced: [
    "pipeline/member.added",
    "pipeline/member.moved",
    "pipeline/member.removed",
    "pipeline/member.closed",
  ],
  eventsConsumed: [],
  isCore: false,
  availability: "standard",
  settingsTab: { slug: "pipeline-settings", label: "Pipeline Settings", icon: "Layers", section: "module" },
  auditResources: ["pipeline", "pipeline-member"],
}
