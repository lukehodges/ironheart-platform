import type { NotificationTriggerDefinition } from './types'

interface RegisteredTrigger extends NotificationTriggerDefinition {
  moduleSlug: string
}

export class NotificationTriggerRegistry {
  private triggers = new Map<string, RegisteredTrigger>()
  private moduleIndex = new Map<string, string[]>()

  register(moduleSlug: string, triggers: NotificationTriggerDefinition[]): void {
    for (const trigger of triggers) {
      if (this.triggers.has(trigger.key)) {
        throw new Error(
          `Notification trigger '${trigger.key}' is already registered`
        )
      }
      this.triggers.set(trigger.key, { ...trigger, moduleSlug })
    }
    const keys = triggers.map((t) => t.key)
    this.moduleIndex.set(moduleSlug, [
      ...(this.moduleIndex.get(moduleSlug) ?? []),
      ...keys,
    ])
  }

  getTrigger(key: string): NotificationTriggerDefinition | null {
    return this.triggers.get(key) ?? null
  }

  getAllTriggers(): NotificationTriggerDefinition[] {
    return Array.from(this.triggers.values())
  }

  getTriggersForModule(moduleSlug: string): NotificationTriggerDefinition[] {
    const keys = this.moduleIndex.get(moduleSlug) ?? []
    return keys.map((k) => this.triggers.get(k)!).filter(Boolean)
  }

  getAvailableVariables(triggerKey: string): string[] {
    return this.triggers.get(triggerKey)?.variables ?? []
  }
}

export const notificationTriggerRegistry = new NotificationTriggerRegistry()
