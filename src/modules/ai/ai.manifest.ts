// src/modules/ai/ai.manifest.ts

import type { ModuleManifest } from "@/shared/module-system/types"

export const aiManifest: ModuleManifest = {
  slug: "ai",
  name: "AI Assistant",
  description: "AI-powered assistant with read-only access to all modules",
  icon: "Brain",
  category: "intelligence",
  dependencies: [],
  routes: [],
  sidebarItems: [],
  analyticsWidgets: [],
  permissions: ["ai:read", "ai:write"],
  eventsProduced: ["ai/chat.completed"],
  eventsConsumed: [],
  isCore: false,
  availability: "addon",
  auditResources: ["ai-conversation"],
}
