import type { ModuleRegistry } from '@/shared/module-system/registry'
import type { ModuleSidebarItem } from '@/shared/module-system/types'

export interface NavItem {
  title: string
  href: string
  icon: string
  permission?: string
  badge?: string
}

export interface NavSection {
  title?: string
  items: NavItem[]
}

const SECTION_LABELS: Record<string, string> = {
  operations: 'Operations',
  automation: 'Automation',
  finance: 'Finance',
  intelligence: 'Intelligence',
  account: 'Account',
}

const SECTION_ORDER = ['operations', 'automation', 'finance', 'intelligence', 'account']

function hasPermission(permission: string | undefined, permissions: string[]): boolean {
  if (!permission) return true
  if (permissions.includes('*:*')) return true
  if (permissions.includes(permission)) return true
  const [resource, action] = permission.split(':')
  if (permissions.includes(`${resource}:*`)) return true
  if (permissions.includes(`*:${action}`)) return true
  return false
}

export function buildNavSections(
  registry: ModuleRegistry,
  enabledSlugs: string[],
  permissions: string[],
  isPlatformAdmin: boolean
): NavSection[] {
  const allItems = registry.getSidebarItems(enabledSlugs)

  const permitted = allItems.filter((item) =>
    hasPermission(item.permission, permissions)
  )

  // Group by section
  const grouped = new Map<string, NavItem[]>()
  for (const item of permitted) {
    const section = item.section
    if (!grouped.has(section)) grouped.set(section, [])
    grouped.get(section)!.push({
      title: item.title,
      href: item.href,
      icon: item.icon,
      permission: item.permission,
      badge: item.badge,
    })
  }

  // Build ordered sections
  const sections: NavSection[] = []
  for (const sectionKey of SECTION_ORDER) {
    const items = grouped.get(sectionKey)
    if (items && items.length > 0) {
      sections.push({ title: SECTION_LABELS[sectionKey] ?? sectionKey, items })
    }
  }

  // Add any sections not in SECTION_ORDER
  for (const [sectionKey, items] of grouped) {
    if (!SECTION_ORDER.includes(sectionKey) && items.length > 0) {
      sections.push({ title: SECTION_LABELS[sectionKey] ?? sectionKey, items })
    }
  }

  // Platform admin section
  if (isPlatformAdmin) {
    sections.push({
      title: 'Platform Admin',
      items: [{ title: 'Platform Admin', href: '/platform', icon: 'Shield' }],
    })
  }

  return sections
}
