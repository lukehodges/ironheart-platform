# Module Platform Architecture Design

**Date:** 2026-02-21
**Status:** Approved
**Scope:** Backend module system — manifest contracts, registry, widget system, lifecycle, cross-module data access

---

## 1. Vision

Ironheart is a multi-tenant SaaS platform for boutique custom software development. Modules are self-contained units that can be hot-swapped per tenant. The platform spans multiple industries — modules built for one client can be reused for others.

**Scale target:** 100+ modules over time.
**Deployment flexibility:** Same app with isolated tenants now, separate deployments per enterprise client later.
**Code structure:** Monorepo with packages (migrate from `src/modules/` when proven).

**Core principle:** Modules are self-contained. Enable, disable, add, or remove a module — the rest of the system barely notices.

---

## 2. Module Manifest Contract

Every module exports a typed manifest declaring its entire footprint. The manifest is the single source of truth for what a module does.

### Interface

```typescript
// src/shared/module-system/types.ts

export type ModuleCategory = 'operations' | 'automation' | 'finance' | 'intelligence'

export interface ModuleRoute {
  path: string
  label: string
  permission?: string
}

export interface ModuleSidebarItem {
  title: string
  href: string
  icon: string                    // Lucide icon name
  section: string                 // groups items in sidebar
  permission?: string
}

export interface AnalyticsWidgetDefinition {
  id: string                      // globally unique: 'bookings-this-week'
  type: 'kpi' | 'line' | 'bar' | 'donut' | 'heatmap' | 'table' | 'custom'
  label: string
  size: '1x1' | '2x1' | '2x2' | '1x2' | '3x1' | '3x2'
  dataSource: {
    procedure: string             // tRPC procedure path
    refreshInterval?: number      // ms, default 60000
  }
  component?: string              // registry key for custom widgets only
}

export interface ModuleSettingsTab {
  slug: string
  label: string
  icon: string
  section: 'module'
}

export interface ModuleManifest {
  // Identity
  slug: string
  name: string
  description: string
  icon: string
  category: ModuleCategory

  // Dependencies
  dependencies: string[]          // slugs of required modules

  // Declarations
  routes: ModuleRoute[]
  sidebarItems: ModuleSidebarItem[]
  analyticsWidgets: AnalyticsWidgetDefinition[]
  permissions: string[]

  // Events
  eventsProduced: string[]
  eventsConsumed: string[]

  // Flags
  isCore: boolean                 // true = cannot be disabled (auth, tenant)
  availability: 'standard' | 'addon' | 'custom'

  // Optional extensions
  settingsTab?: ModuleSettingsTab
  auditResources?: string[]       // resource types this module writes to audit log
}
```

### Example: Booking Module

```typescript
// src/modules/booking/booking.manifest.ts

export const bookingManifest: ModuleManifest = {
  slug: 'booking',
  name: 'Bookings',
  description: 'Appointment scheduling and management',
  icon: 'Calendar',
  category: 'operations',

  dependencies: ['customer'],

  routes: [
    { path: '/admin/bookings', label: 'Bookings', permission: 'bookings:read' },
    { path: '/admin/calendar', label: 'Calendar', permission: 'bookings:read' },
  ],
  sidebarItems: [
    { title: 'Bookings', href: '/admin/bookings', icon: 'Calendar',
      section: 'operations', permission: 'bookings:read' },
    { title: 'Calendar', href: '/admin/calendar', icon: 'CalendarDays',
      section: 'operations', permission: 'bookings:read' },
  ],
  analyticsWidgets: [
    { id: 'bookings-this-week', type: 'kpi', label: 'Bookings This Week', size: '1x1',
      dataSource: { procedure: 'booking.analytics.thisWeek' } },
    { id: 'bookings-by-status', type: 'donut', label: 'Bookings by Status', size: '1x1',
      dataSource: { procedure: 'booking.analytics.byStatus' } },
    { id: 'booking-revenue', type: 'line', label: 'Booking Revenue', size: '2x1',
      dataSource: { procedure: 'booking.analytics.revenue' } },
  ],
  permissions: ['bookings:read', 'bookings:write', 'bookings:delete'],

  eventsProduced: ['booking/created', 'booking/confirmed', 'booking/cancelled', 'booking/completed'],
  eventsConsumed: ['payment/completed'],

  isCore: false,
  availability: 'standard',

  settingsTab: {
    slug: 'booking-settings',
    label: 'Booking Defaults',
    icon: 'Calendar',
    section: 'module',
  },

  auditResources: ['booking', 'booking-slot', 'booking-assignment'],
}
```

### Availability Values

| Value | Meaning | Example |
|-------|---------|---------|
| `standard` | Ships with the platform, every tenant gets it | Bookings, Customers, Team |
| `addon` | Available for purchase/upsell, opt-in per tenant | Advanced Workflows, Analytics Pro, SMS |
| `custom` | Built for a specific client, may be reusable later | Patient Intake, Fleet Tracking |

Custom modules can be promoted to addon or standard by changing one field.

---

## 3. Module Registry

A central class that collects all manifests at app startup and becomes the single query point.

### Interface

```typescript
// src/shared/module-system/registry.ts

export class ModuleRegistry {
  private manifests: Map<string, ModuleManifest>
  private dependencyGraph: Map<string, string[]>   // slug -> dependents

  // Registration
  register(manifest: ModuleManifest): void
  validate(): void                                  // catches circular/missing deps at startup

  // Core queries
  getManifest(slug: string): ModuleManifest | null
  getAllManifests(): ModuleManifest[]

  // Dependency enforcement
  getDependents(slug: string): string[]
  getDependencies(slug: string): string[]
  canDisable(slug: string, enabledSlugs: string[]): { allowed: boolean; blockedBy: string[] }
  canEnable(slug: string, enabledSlugs: string[]): { allowed: boolean; missingDeps: string[] }

  // Tenant-scoped queries
  getEnabledManifests(enabledSlugs: string[]): ModuleManifest[]
  getSidebarItems(enabledSlugs: string[]): ModuleSidebarItem[]
  getAnalyticsWidgets(enabledSlugs: string[]): AnalyticsWidgetDefinition[]
  getRoutes(enabledSlugs: string[]): ModuleRoute[]
  getPermissions(enabledSlugs: string[]): string[]
}
```

### Wiring

```typescript
// src/shared/module-system/register-all.ts

import { ModuleRegistry } from './registry'
import { bookingManifest } from '@/modules/booking/booking.manifest'
import { customerManifest } from '@/modules/customer/customer.manifest'
import { workflowManifest } from '@/modules/workflow/workflow.manifest'
// ... all modules

export const moduleRegistry = new ModuleRegistry()

moduleRegistry.register(bookingManifest)
moduleRegistry.register(customerManifest)
moduleRegistry.register(workflowManifest)
// ...

moduleRegistry.validate()  // throws at startup if dependency graph is invalid
```

### Runtime Flow

```
1. Request for tenant "acme-corp"
2. tenantService.getEnabledModuleSlugs("acme-corp")
   -> ['customer', 'booking', 'workflow', 'forms']  (DB + Redis cache)
3. moduleRegistry.getSidebarItems(['customer', 'booking', 'workflow', 'forms'])
   -> sidebar items from those 4 modules only
4. moduleRegistry.getAnalyticsWidgets(['customer', 'booking', 'workflow', 'forms'])
   -> widgets from those 4 modules only
```

### Dependency Enforcement

```
Admin tries to disable 'customer':
-> registry.canDisable('customer', ['customer', 'booking', 'workflow', 'forms'])
-> { allowed: false, blockedBy: ['booking'] }
-> UI: "Cannot disable Customers -- Bookings depends on it. Disable Bookings first."
```

---

## 4. Analytics Widget System

Each module declares widgets in its manifest. The analytics dashboard renders them dynamically.

### Standard Widget Types (built once, shared forever)

| Type | Data Shape | Renderer |
|------|-----------|----------|
| `kpi` | `{ value, change, trend, period }` | Single metric card with trend arrow |
| `line` | `{ points: { date, value }[] }` | Line chart with gradient fill |
| `bar` | `{ bars: { label, value }[] }` | Horizontal bar chart |
| `donut` | `{ segments: { label, value, color }[] }` | Donut chart with legend |
| `heatmap` | `{ rows: { label, cells: { hour, value }[] }[] }` | Grid heatmap |
| `table` | `{ columns: string[], rows: Record[] }` | Data table |

### Custom Widgets

When a standard type doesn't fit (e.g., a patient timeline, a floor plan, a vehicle map), modules register custom widget components.

```typescript
// src/shared/module-system/widgets/custom-widget-registry.ts

type WidgetComponent = React.ComponentType<CustomWidgetProps>

export interface CustomWidgetProps {
  data: unknown
  label: string
  filters: DateRange
  isLoading: boolean
}

const customWidgets = new Map<string, WidgetComponent>()

export function registerCustomWidget(key: string, component: WidgetComponent): void
export function getCustomWidget(key: string): WidgetComponent | null
```

```typescript
// Module registers its custom widget:
// src/modules/patient-intake/widgets/patient-timeline.tsx

export function PatientTimeline({ data, label }: CustomWidgetProps) {
  // Full creative freedom -- custom SVG, D3, anything
}

registerCustomWidget('patient-timeline', PatientTimeline)
```

### Dashboard Layout (tenant-customisable)

```typescript
// Stored in organizationSettings.dashboardLayout (JSON column)

interface DashboardLayout {
  widgets: {
    widgetId: string              // 'bookings-this-week'
    position: { x: number; y: number }
    size: '1x1' | '2x1' | '2x2' | '1x2' | '3x1' | '3x2'
  }[]
}
```

**Behaviour when a module is disabled:**
- Widgets from that module are hidden from the layout (not deleted)
- Dashboard layout positions are preserved
- Re-enable the module and widgets reappear in the same positions

**Behaviour for the widget palette:**
- "Add Widget" button shows available widgets from enabled modules only
- Disabled modules' widgets don't appear in the palette

### Growth Path

```
Start with 6 standard types -> covers 80% of needs
Build custom widgets for bespoke clients -> covers the other 20%
When a custom pattern repeats 3+ times -> promote it to a standard type
Standard type library grows organically from real client needs
```

---

## 5. Route Protection & Sidebar Generation

### Sidebar: Generated from Registry

```typescript
// src/components/layout/nav-builder.ts (replaces hardcoded nav-config.ts)

import { moduleRegistry } from '@/shared/module-system/register-all'

export function buildNavSections(
  enabledSlugs: string[],
  permissions: string[],
  isPlatformAdmin: boolean
): NavSection[] {
  const items = moduleRegistry.getSidebarItems(enabledSlugs)
  const permitted = items.filter(item =>
    !item.permission || hasPermission(item.permission, permissions)
  )
  const sections = groupByCategory(permitted)

  if (isPlatformAdmin) {
    sections.push(platformSection)
  }

  return sections
}
```

The sidebar component calls `buildNavSections` with the tenant's enabled modules. Add a module, its sidebar items appear. Disable it, they vanish.

### Route Protection: Backend (tRPC)

```typescript
// src/shared/middleware/module-gate.ts

export function createModuleGate(slug: string) {
  return async function moduleGate({ ctx, next }) {
    const enabled = await tenantService.isModuleEnabled(ctx.tenantId, slug)
    if (!enabled) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: `Module '${slug}' is not enabled for this tenant`
      })
    }
    return next({ ctx })
  }
}

// Usage in router:
const moduleGate = createModuleGate('booking')

export const bookingRouter = router({
  list: tenantProcedure
    .use(moduleGate)
    .input(listBookingsSchema)
    .query(({ ctx, input }) => bookingService.list(ctx, input)),
})
```

### Route Protection: Frontend (Next.js pages)

```typescript
// Reusable wrapper for module-gated pages

export function withModuleGate(slug: string, Component: React.FC) {
  return async function GatedPage() {
    const { tenantId } = await getSession()
    const enabled = await tenantService.isModuleEnabled(tenantId, slug)
    if (!enabled) redirect('/admin')
    return <Component />
  }
}

// Usage:
export default withModuleGate('booking', BookingsPage)
```

### Layering

```
Module enabled? -> User has permission? -> Render
     NO               (skip)              redirect to /admin
     YES              NO                  403 or hidden
     YES              YES                 render page
```

---

## 6. Module-Scoped Backend Structure

### Settings: Two Tiers

**Core settings (always present, owned by platform):**
- General (business name, timezone, currency)
- Security (API keys, webhooks)
- Billing (plan, usage)
- Modules (enable/disable toggles, registry-driven)
- Danger Zone (GDPR export, deletion)

**Module settings (dynamic, from manifests):**
Each module that declares a `settingsTab` in its manifest gets its own tab in the settings page.

```typescript
// Settings page renders tabs dynamically:
function SettingsPage() {
  const enabledModules = useEnabledModules()

  const coreTabs = ['general', 'security', 'billing', 'modules', 'danger']

  const moduleTabs = moduleRegistry
    .getEnabledManifests(enabledModules)
    .filter(m => m.settingsTab)
    .map(m => m.settingsTab)

  return (
    <Tabs>
      {coreTabs.map(tab => <CoreSettingsTab key={tab} tab={tab} />)}
      {moduleTabs.map(tab => <ModuleSettingsTab key={tab.slug} tab={tab} />)}
    </Tabs>
  )
}
```

Each module provides its own settings component that is fully self-contained.

### Audit Log: Core Aggregator

Audit log is a core module (always enabled). It aggregates entries from all modules.

```typescript
// src/shared/audit/audit-logger.ts

export async function auditLog(entry: {
  tenantId: string
  actorId: string
  action: 'created' | 'updated' | 'deleted'
  resourceType: string          // matches manifest.auditResources
  resourceId: string
  resourceName: string
  changes?: { field: string; before: unknown; after: unknown }[]
}): Promise<void>
```

**Filter behaviour:**
- Resource type dropdown populated from enabled modules' `auditResources`
- Historical entries from disabled modules still appear in the timeline (they are facts)
- Disabled modules' resource types don't appear in the filter dropdown

### Per-Module Analytics Procedures

Each module implements its own analytics tRPC procedures that match the `dataSource.procedure` paths declared in its widgets.

```typescript
// src/modules/booking/booking.router.ts (analytics sub-procedures)

analytics: router({
  thisWeek: tenantProcedure
    .use(moduleGate)
    .input(analyticsFiltersSchema)
    .query(({ ctx, input }) => bookingService.getThisWeekKPI(ctx, input)),

  byStatus: tenantProcedure
    .use(moduleGate)
    .input(analyticsFiltersSchema)
    .query(({ ctx, input }) => bookingService.getByStatus(ctx, input)),

  revenue: tenantProcedure
    .use(moduleGate)
    .input(analyticsFiltersSchema)
    .query(({ ctx, input }) => bookingService.getRevenue(ctx, input)),
}),
```

---

## 7. Module Lifecycle

### Enable a Module

```
1. registry.canEnable('booking', currentlyEnabled)
   -> Check dependencies: customer enabled? YES -> proceed
2. tenantService.enableModule(tenantId, 'booking')
   -> UPDATE tenantModules (isEnabled: true)
   -> Invalidate Redis cache
   -> auditLog (module enabled)
3. Frontend refetches enabled modules
   -> Sidebar items appear
   -> Analytics widgets become available
   -> Settings tab appears
   -> Routes accessible
```

### Disable a Module

```
1. registry.canDisable('booking', currentlyEnabled)
   -> Check dependents: anything enabled depends on booking?
   -> YES: { allowed: false, blockedBy: ['scheduling'] }
   -> NO:  { allowed: true, blockedBy: [] }
2. tenantService.disableModule(tenantId, 'booking')
   -> UPDATE tenantModules (isEnabled: false)
   -> Invalidate Redis cache
   -> auditLog (module disabled)
3. Frontend refetches
   -> Sidebar items vanish
   -> Analytics widgets hidden (layout positions preserved)
   -> Settings tab vanishes
   -> Routes redirect to /admin
   -> tRPC procedures reject with MODULE_DISABLED
   -> Inngest handlers check module status and skip if disabled

Data is untouched. Everything remains in the database.
```

### Add a New Module (development workflow)

```
1. Create src/modules/{module-name}/ with all blueprint files
2. Add one import line to register-all.ts
3. Run DB migration (if new tables needed)
4. Register Inngest functions
5. Deploy
6. Platform admin enables module for target tenants

Total shared files touched: 1 (register-all.ts)
```

### Remove a Module

```
1. Disable module for all tenants
2. Optionally run data cleanup migration (or leave for audit trail)
3. Remove import from register-all.ts
4. Delete module directory
5. Deploy

No other files affected. Audit log retains all historical entries.
```

### Inngest Event Isolation

Disabled modules' event handlers bail out silently:

```typescript
const onPaymentCompleted = inngest.createFunction(
  { id: 'booking-on-payment-completed' },
  { event: 'payment/completed' },
  async ({ event, step }) => {
    const enabled = await step.run('check-module', () =>
      tenantService.isModuleEnabled(event.data.tenantId, 'booking')
    )
    if (!enabled) return   // silently skip

    await step.run('handle', () =>
      bookingService.handlePaymentCompleted(event.data)
    )
  }
)
```

### State Diagram

```
                    +------------------+
                    |  NOT INSTALLED   |
                    | (no code exists) |
                    +--------+---------+
                             | developer adds module
                             | + registers manifest
                             v
+-----------+    enable    +-----------+
|  DISABLED  |<---------->|  ENABLED   |
|            |   disable  |            |
| - data     |  (if no    | - routes   |
|   persists | dependents)| - sidebar  |
| - audit    |            | - widgets  |
|   history  |            | - settings |
|   remains  |            | - events   |
| - no new   |            | - full     |
|   operations|           |   function |
+------+-----+            +-----------+
       | developer removes module
       v
+------------------+
|     REMOVED      |
| (code deleted,   |
|  data optional,  |
|  audit preserved)|
+------------------+
```

---

## 8. Cross-Module Data Access

Three tiers of communication, from loosest to tightest coupling.

### Tier 1: Events (Inngest) -- Preferred

Module A publishes an event. Module B listens. They never import each other.

```
Booking publishes: "booking/created"
Workflow listens: finds matching workflows, executes them
Notification listens: sends confirmation email

Booking doesn't know Workflow exists.
Disable Workflow -> booking/created still fires, nobody listens, nothing breaks.
```

**Rule:** If the interaction is "something happened, react to it" -> use events.

### Tier 2: Data Contracts -- For Declared Dependencies

When Module A declares `dependencies: ['customer']`, it may read customer data through a contract -- a thin stable interface.

```typescript
// src/modules/customer/customer.contract.ts
// PUBLIC API -- the only file other modules may import

export interface CustomerContract {
  getById(tenantId: string, customerId: string): Promise<CustomerRecord | null>
  getByEmail(tenantId: string, email: string): Promise<CustomerRecord | null>
  search(tenantId: string, query: string, limit: number): Promise<CustomerRecord[]>
}

import { customerService } from './customer.service'

export const customerContract: CustomerContract = {
  getById: (tenantId, id) => customerService.getById(tenantId, id),
  getByEmail: (tenantId, email) => customerService.getByEmail(tenantId, email),
  search: (tenantId, query, limit) => customerService.search(tenantId, query, limit),
}
```

**Import rules (enforceable via lint):**

```
A module may ONLY import from another module's:
  OK   .contract.ts   (if declared as dependency)
  OK   .types.ts      (type-only imports, always allowed)
  NO   .service.ts
  NO   .repository.ts
  NO   .router.ts
```

### Tier 3: Registry Queries -- For Cross-Cutting Features

Analytics, audit, and settings query the registry to discover what's available. They never import modules directly.

```
Analytics: registry.getAnalyticsWidgets(enabledSlugs) -> render generically
Audit:     registry.getEnabledManifests(enabledSlugs).flatMap(m => m.auditResources)
Settings:  registry.getEnabledManifests(enabledSlugs).filter(m => m.settingsTab)
Sidebar:   registry.getSidebarItems(enabledSlugs)
```

### Decision Guide

```
"Module A needs to react when something happens in Module B"
  -> Tier 1: Events. Always.

"Module A needs to READ data from Module B"
  -> Does A declare B as a dependency?
    YES -> Tier 2: Import B's contract
    NO  -> Either add the dependency or use events.

"A core feature needs to know what modules exist"
  -> Tier 3: Query the registry. Never import modules directly.
```

---

## 9. Complete Module Blueprint

Every module follows this exact file structure.

```
src/modules/{module-name}/
  {module-name}.manifest.ts       # Identity, deps, routes, widgets, settings
  {module-name}.types.ts          # TypeScript interfaces (no Zod)
  {module-name}.schemas.ts        # Zod input validation
  {module-name}.contract.ts       # Public API for dependent modules
  {module-name}.repository.ts     # Drizzle queries, domain errors
  {module-name}.service.ts        # Business logic, events, audit logging
  {module-name}.router.ts         # tRPC procedures with module gate
  {module-name}.events.ts         # Inngest handlers with module check
  {module-name}.settings.tsx      # Settings tab component (optional)
  widgets/                        # Custom analytics widgets (optional)
    {widget-name}.tsx
  index.ts                        # Barrel export
  __tests__/
    {module-name}.test.ts
```

### Developer Checklist for New Modules

```
[ ] Create module directory with all blueprint files
[ ] Write manifest (identity, deps, routes, widgets, permissions)
[ ] Write contract (minimal public API)
[ ] Write types, schemas, repository, service, router, events
[ ] Write settings tab component (if needed)
[ ] Write custom widgets (if needed)
[ ] Write tests
[ ] Add one line to register-all.ts
[ ] Add DB migration (if new tables needed)
[ ] Register Inngest functions
[ ] Deploy
[ ] Platform admin enables module for target tenants
```

### What a Developer Does NOT Touch

```
- nav-config / sidebar (generated from manifest)
- analytics page (widgets declared in manifest)
- settings page (tab declared in manifest)
- audit log page (entries written via shared auditLog())
- any other module's internal files (use events or contracts)
```

---

## 10. Backlog

### Future: Micro-Module Federation (Approach C)

When module count reaches 50+ or enterprise clients need fully isolated deployments, evaluate Approach C: each module as an independent unit with its own frontend bundle, API routes, and DB migrations, composed at deploy time. Key trigger: when a client needs modules that cannot share a process with other tenants' custom code.

### Future: Monorepo Package Migration

Current structure (`src/modules/`) migrates to monorepo packages (`packages/mod-{name}/`) when the manifest contract system is proven. The manifest pattern transfers 1:1 -- no contract changes required.

### Future: Marketplace

If third-party developers build modules, evolve from Approach A (manifests) toward Approach B (plugin architecture with extension points). The manifest contract is forward-compatible with this path.

---

*Design approved: 2026-02-21*
*Author: Luke Hodges + Claude*
