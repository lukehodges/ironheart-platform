import type { ModuleManifest } from "@/shared/module-system/types"

export const pipelineManifest: ModuleManifest = {
  slug: "pipeline",
  name: "Pipeline",
  description:
    "Sales pipeline: track deals from qualified to won, with stage history and forecast",
  icon: "Layers",
  category: "operations",
  dependencies: ["outreach"],
  routes: [
    {
      path: "/platform/pipeline",
      label: "Pipeline",
      permission: "pipeline:read",
    },
  ],
  sidebarItems: [
    {
      title: "Pipeline",
      href: "/platform/pipeline",
      icon: "Layers",
      section: "operations",
      permission: "pipeline:read",
    },
  ],
  quickActions: [],
  analyticsWidgets: [
    {
      id: "pipeline-weighted-value",
      type: "kpi",
      label: "Weighted Pipeline",
      size: "1x1",
      dataSource: { procedure: "pipeline.getWeightedValue" },
    },
    {
      id: "pipeline-stage-counts",
      type: "table",
      label: "By Stage",
      size: "2x1",
      dataSource: { procedure: "pipeline.getStageCounts" },
    },
  ],
  permissions: ["pipeline:read", "pipeline:write", "pipeline:delete"],
  eventsProduced: [
    "deal.created",
    "deal.updated",
    "deal.stage_changed",
    "deal.won",
    "deal.note_added",
    "deal.meeting_booked",
    "deal.proposal_sent",
    "deal.contract_signed",
  ],
  eventsConsumed: [],
  isCore: false,
  availability: "standard",
  settingsTab: {
    slug: "pipeline-settings",
    label: "Pipeline Settings",
    icon: "Layers",
    section: "module",
  },
  auditResources: ["deal", "deal-event"],
}
