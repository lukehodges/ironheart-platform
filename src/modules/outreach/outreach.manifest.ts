import type { ModuleManifest } from "@/shared/module-system/types"

export const outreachManifest: ModuleManifest = {
  slug: "outreach",
  name: "Outreach",
  description:
    "Cold outreach: companies, contacts, campaigns, templates, touches, replies, and DNC list. Emits events to the outbox for downstream consumers.",
  icon: "Send",
  category: "operations",
  dependencies: [],
  routes: [
    { path: "/admin/outreach", label: "Outreach", permission: "outreach:read" },
  ],
  sidebarItems: [
    {
      title: "Outreach",
      href: "/admin/outreach",
      icon: "Send",
      section: "operations",
      permission: "outreach:read",
    },
    {
      title: "Replies",
      href: "/admin/outreach/replies",
      icon: "Bell",
      section: "operations",
      permission: "outreach:read",
    },
    {
      title: "Contacts",
      href: "/admin/outreach/contacts",
      icon: "Users",
      section: "operations",
      permission: "outreach:read",
    },
    {
      title: "Campaigns",
      href: "/admin/outreach/campaigns",
      icon: "Layers",
      section: "operations",
      permission: "outreach:read",
    },
  ],
  quickActions: [],
  analyticsWidgets: [],
  permissions: ["outreach:read", "outreach:write"],
  eventsProduced: [
    "touch.queued",
    "touch.sent",
    "touch.delivered",
    "touch.bounced",
    "reply.received",
    "reply.classified",
    "dnc.added",
    "company.created",
    "contact.created",
    "leads.imported",
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
  auditResources: ["outreach-company", "outreach-contact", "outreach-touch"],
}
