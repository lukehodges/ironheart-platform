import type { ModuleManifest } from "@/shared/module-system/types"

export const outreachManifest: ModuleManifest = {
  slug: "outreach",
  name: "Outreach",
  description:
    "Cold outreach observatory: leads roster, daily activity funnel, and the 7-day hypothesis loop. Mirrors the Master Lead List spreadsheet.",
  icon: "Send",
  category: "operations",
  dependencies: [],
  routes: [
    {
      path: "/platform/outreach",
      label: "Observatory",
      permission: "outreach:read",
    },
  ],
  sidebarItems: [
    {
      title: "Outreach",
      href: "/platform/outreach",
      icon: "Send",
      section: "operations",
      permission: "outreach:read",
    },
  ],
  quickActions: [],
  analyticsWidgets: [],
  permissions: ["outreach:read", "outreach:write"],
  eventsProduced: [
    "lead.created",
    "lead.updated",
    "touch.sent",
    "reply.received",
    "reply.classified",
    "reply.handled",
    "dnc.added",
    "leads.imported",
    "hypothesis.created",
    "hypothesis.ended",
  ],
  eventsConsumed: [],
  isCore: false,
  availability: "addon",
  settingsTab: {
    slug: "outreach-settings",
    label: "Outreach Settings",
    icon: "Send",
    section: "module",
  },
  auditResources: [
    "outreach-lead",
    "outreach-daily-activity",
    "outreach-weekly-hypothesis",
    "outreach-touch",
    "outreach-reply",
    "outreach-dnc",
  ],
}
