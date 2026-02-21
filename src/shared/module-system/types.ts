export type ModuleCategory = 'operations' | 'automation' | 'finance' | 'intelligence'

export interface ModuleRoute {
  path: string
  label: string
  permission?: string
}

export interface ModuleSidebarItem {
  title: string
  href: string
  icon: string
  section: string
  permission?: string
  badge?: string
}

export interface AnalyticsWidgetDataSource {
  procedure: string
  refreshInterval?: number
}

export interface AnalyticsWidgetDefinition {
  id: string
  type: 'kpi' | 'line' | 'bar' | 'donut' | 'heatmap' | 'table' | 'custom'
  label: string
  size: '1x1' | '2x1' | '2x2' | '1x2' | '3x1' | '3x2'
  dataSource: AnalyticsWidgetDataSource
  component?: string
}

export interface ModuleSettingsTab {
  slug: string
  label: string
  icon: string
  section: 'module'
}

export interface ModuleManifest {
  slug: string
  name: string
  description: string
  icon: string
  category: ModuleCategory

  dependencies: string[]

  routes: ModuleRoute[]
  sidebarItems: ModuleSidebarItem[]
  analyticsWidgets: AnalyticsWidgetDefinition[]
  permissions: string[]

  eventsProduced: string[]
  eventsConsumed: string[]

  isCore: boolean
  availability: 'standard' | 'addon' | 'custom'

  settingsTab?: ModuleSettingsTab
  auditResources?: string[]
}
