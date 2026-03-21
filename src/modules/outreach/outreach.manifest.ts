import type { ModuleManifest } from "@/shared/module-system/types"

export const outreachManifest: ModuleManifest = {
  slug: "outreach",
  name: "Outreach",
  description: "Cold outreach tracking with sequences, A/B testing, follow-up queues, and pipeline conversion",
  icon: "Send",
  category: "operations",
  dependencies: ["customer", "pipeline"],
  routes: [
    { path: "/admin/outreach", label: "Outreach", permission: "outreach:read" },
  ],
  sidebarItems: [
    { title: "Outreach", href: "/admin/outreach", icon: "Send", section: "operations", permission: "outreach:read" },
    { title: "Replies", href: "/admin/outreach/replies", icon: "Bell", section: "operations", permission: "outreach:read" },
    { title: "Contacts", href: "/admin/outreach/contacts", icon: "Users", section: "operations", permission: "outreach:read" },
    { title: "Sequences", href: "/admin/outreach/sequences", icon: "Layers", section: "operations", permission: "outreach:read" },
  ],
  quickActions: [],
  analyticsWidgets: [],
  permissions: ["outreach:read", "outreach:write"],
  eventsProduced: [
    "outreach/contact.enrolled",
    "outreach/activity.logged",
    "outreach/contact.converted",
  ],
  eventsConsumed: [],
  isCore: false,
  availability: "addon",
  settingsTab: { slug: "outreach-settings", label: "Outreach Settings", icon: "Send", section: "module" },
  auditResources: ["outreach-sequence", "outreach-contact"],
}
