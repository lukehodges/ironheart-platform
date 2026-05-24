# Phase 7D — Advanced Admin Implementation Plan

**Goal:** Power features that justify the enterprise price point.

**Status:** Planning Complete → Ready for Execution

**Estimated Scope:** ~45 files, ~11,000 LOC, 150+ tests

---

## Architecture Overview

Phase 7D delivers 4 major feature areas:
1. **Analytics Dashboard** — KPI cards, charts, insights
2. **Workflow Builder** — Visual canvas with React Flow
3. **Settings** — 7-tab configuration center
4. **Audit Log** — Timeline of all state changes

### Technical Stack Additions
- `recharts` — Charts and data visualization
- `reactflow` — Workflow visual canvas
- `date-fns` — Date utilities for analytics

### Module Dependencies
- Requires Phase 6 backend (workflow, analytics, audit modules)
- Uses existing design system from Phase 7A
- Extends admin shell layout from Phase 7A

---

## Wave 1: Types & Schemas (4 files)

**Parallel execution:** All 4 files can be created simultaneously

### File 1.1: `src/types/analytics.ts`
```typescript
// Analytics dashboard types
export interface KPICard {
  label: string;
  value: number | string;
  change: number; // percentage
  trend: 'up' | 'down' | 'neutral';
  period: string; // "vs last week"
}

export interface DateRangePreset {
  label: string;
  value: string; // '7d' | '30d' | '90d' | '12m'
  from: Date;
  to: Date;
}

export interface ChartDataPoint {
  date: string;
  value: number;
  label?: string;
}

export interface TopServiceData {
  serviceId: string;
  serviceName: string;
  revenue: number;
  bookingCount: number;
}

export interface StaffUtilizationData {
  staffId: string;
  staffName: string;
  hourSlots: { hour: number; utilizationPercent: number }[];
}

export interface ChurnRiskCustomer {
  customerId: string;
  customerName: string;
  email: string;
  lastBookingDate: Date;
  riskLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  daysSinceLastBooking: number;
  totalSpend: number;
}

export type AnalyticsView = 'week' | 'month' | 'quarter' | 'year';
```

### File 1.2: `src/types/workflow-builder.ts`
```typescript
import type { Node, Edge } from 'reactflow';

// Workflow builder UI types
export type WorkflowNodeCategory = 'trigger' | 'action' | 'control' | 'transform';

export interface WorkflowNodePalette {
  category: WorkflowNodeCategory;
  label: string;
  items: WorkflowNodeTemplate[];
}

export interface WorkflowNodeTemplate {
  type: string; // matches backend node types
  label: string;
  icon: string; // lucide icon name
  description: string;
  defaultConfig: Record<string, unknown>;
}

export interface WorkflowCanvasState {
  nodes: Node[];
  edges: Edge[];
  selectedNodeId: string | null;
  isPanelOpen: boolean;
}

export interface NodeConfigPanelProps {
  nodeId: string;
  nodeType: string;
  config: Record<string, unknown>;
  onUpdate: (config: Record<string, unknown>) => void;
  onClose: () => void;
}

export interface WorkflowExecutionStep {
  stepId: string;
  nodeId: string;
  status: 'pending' | 'running' | 'success' | 'error';
  startedAt?: Date;
  completedAt?: Date;
  output?: unknown;
  error?: string;
}
```

### File 1.3: `src/types/settings.ts`
```typescript
// Settings page types
export type SettingsTab =
  | 'general'
  | 'notifications'
  | 'integrations'
  | 'billing'
  | 'modules'
  | 'security'
  | 'danger';

export interface GeneralSettings {
  businessName: string;
  address: string;
  timezone: string;
  currency: string;
  logoUrl?: string;
}

export interface NotificationSettings {
  emailEnabled: boolean;
  smsEnabled: boolean;
  reminderTiming: number; // hours before
  confirmationTemplate: string;
  reminderTemplate: string;
  cancellationTemplate: string;
}

export interface IntegrationConnection {
  provider: 'google' | 'outlook';
  connected: boolean;
  email?: string;
  connectedAt?: Date;
}

export interface ModuleToggle {
  moduleId: string;
  slug: string;
  name: string;
  description: string;
  isEnabled: boolean;
  isPremium: boolean;
}

export interface ApiKey {
  id: string;
  name: string;
  key: string; // masked except last 4
  createdAt: Date;
  lastUsedAt?: Date;
  expiresAt?: Date;
}
```

### File 1.4: `src/types/audit-log.ts`
```typescript
// Audit log types
export interface AuditLogEntry {
  id: string;
  timestamp: Date;
  actor: {
    id: string;
    name: string;
    email: string;
  };
  action: string; // 'created' | 'updated' | 'deleted'
  resourceType: string;
  resourceId: string;
  resourceName: string;
  changes?: {
    field: string;
    before: unknown;
    after: unknown;
  }[];
  metadata?: Record<string, unknown>;
}

export interface AuditLogFilters {
  resourceType?: string;
  actorId?: string;
  action?: string;
  from?: Date;
  to?: Date;
}

export type AuditResourceType =
  | 'booking'
  | 'customer'
  | 'staff'
  | 'service'
  | 'workflow'
  | 'settings';
```

**Success Criteria:**
- All files compile with 0 tsc errors
- Types are exported from barrel file
- No runtime dependencies

---

## Wave 2: Schemas & Validation (4 files)

**Parallel execution:** All 4 files can be created simultaneously

### File 2.1: `src/schemas/analytics.schemas.ts`
```typescript
import { z } from 'zod';

export const dateRangePresetSchema = z.enum(['7d', '30d', '90d', '12m', 'custom']);

export const analyticsFiltersSchema = z.object({
  preset: dateRangePresetSchema.optional(),
  from: z.date().optional(),
  to: z.date().optional(),
  staffIds: z.array(z.uuid()).optional(),
  serviceIds: z.array(z.uuid()).optional(),
});

export const exportFormatSchema = z.enum(['csv', 'pdf']);

export type AnalyticsFilters = z.infer<typeof analyticsFiltersSchema>;
```

### File 2.2: `src/schemas/workflow-builder.schemas.ts`
```typescript
import { z } from 'zod';

export const nodePositionSchema = z.object({
  x: z.number(),
  y: z.number(),
});

export const workflowNodeSchema = z.object({
  id: z.string(),
  type: z.string(),
  position: nodePositionSchema,
  data: z.record(z.string(), z.unknown()),
});

export const workflowEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  sourceHandle: z.string().optional(),
  targetHandle: z.string().optional(),
});

export const saveWorkflowSchema = z.object({
  id: z.uuid().optional(),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  triggerEvent: z.string(),
  nodes: z.array(workflowNodeSchema),
  edges: z.array(workflowEdgeSchema),
  isActive: z.boolean().default(false),
});

export type SaveWorkflowInput = z.infer<typeof saveWorkflowSchema>;
```

### File 2.3: `src/schemas/settings.schemas.ts`
```typescript
import { z } from 'zod';

export const generalSettingsSchema = z.object({
  businessName: z.string().min(1).max(100),
  address: z.string().max(200),
  timezone: z.string(),
  currency: z.string().length(3), // ISO 4217
  logoUrl: z.string().url().optional(),
});

export const notificationSettingsSchema = z.object({
  emailEnabled: z.boolean(),
  smsEnabled: z.boolean(),
  reminderTiming: z.number().int().min(1).max(72),
  confirmationTemplate: z.string(),
  reminderTemplate: z.string(),
  cancellationTemplate: z.string(),
});

export const createApiKeySchema = z.object({
  name: z.string().min(1).max(50),
  expiresInDays: z.number().int().min(1).max(365).optional(),
});

export type GeneralSettingsInput = z.infer<typeof generalSettingsSchema>;
export type NotificationSettingsInput = z.infer<typeof notificationSettingsSchema>;
export type CreateApiKeyInput = z.infer<typeof createApiKeySchema>;
```

### File 2.4: `src/schemas/audit-log.schemas.ts`
```typescript
import { z } from 'zod';

export const auditLogFiltersSchema = z.object({
  resourceType: z.string().optional(),
  actorId: z.uuid().optional(),
  action: z.enum(['created', 'updated', 'deleted']).optional(),
  from: z.date().optional(),
  to: z.date().optional(),
  limit: z.number().int().min(1).max(100).default(50),
  cursor: z.string().optional(),
});

export type AuditLogFiltersInput = z.infer<typeof auditLogFiltersSchema>;
```

**Success Criteria:**
- All schemas compile with 0 tsc errors
- Schemas match backend tRPC procedures
- Proper Zod v4 syntax (z.uuid() not z.string().uuid())

---

## Wave 3: Data Layer Hooks (6 files)

**Parallel execution:** All 6 files can be created simultaneously

### File 3.1: `src/hooks/use-analytics-data.ts`
```typescript
import { api } from '@/lib/trpc/client';
import type { AnalyticsFilters } from '@/schemas/analytics.schemas';

export function useAnalyticsData(filters: AnalyticsFilters) {
  const kpis = api.analytics.getKPIs.useQuery(filters, {
    refetchInterval: 60000, // 1 min
  });

  const revenueChart = api.analytics.getRevenueChart.useQuery(filters, {
    refetchInterval: 60000,
  });

  const bookingsByStatus = api.analytics.getBookingsByStatus.useQuery(filters);

  const topServices = api.analytics.getTopServices.useQuery(filters);

  const staffUtilization = api.analytics.getStaffUtilization.useQuery(filters);

  const churnRisk = api.analytics.getChurnRisk.useQuery(filters);

  return {
    kpis,
    revenueChart,
    bookingsByStatus,
    topServices,
    staffUtilization,
    churnRisk,
  };
}
```

### File 3.2: `src/hooks/use-workflow-canvas.ts`
```typescript
import { useState, useCallback } from 'react';
import { useNodesState, useEdgesState, addEdge, type Connection } from 'reactflow';
import type { WorkflowCanvasState } from '@/types/workflow-builder';

export function useWorkflowCanvas(initialNodes = [], initialEdges = []) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const addNode = useCallback(
    (type: string, position: { x: number; y: number }) => {
      const newNode = {
        id: `node-${Date.now()}`,
        type,
        position,
        data: { label: type },
      };
      setNodes((nds) => [...nds, newNode]);
    },
    [setNodes]
  );

  const updateNodeData = useCallback(
    (nodeId: string, data: Record<string, unknown>) => {
      setNodes((nds) =>
        nds.map((node) => (node.id === nodeId ? { ...node, data: { ...node.data, ...data } } : node))
      );
    },
    [setNodes]
  );

  const deleteNode = useCallback(
    (nodeId: string) => {
      setNodes((nds) => nds.filter((n) => n.id !== nodeId));
      setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
    },
    [setNodes, setEdges]
  );

  return {
    nodes,
    edges,
    selectedNodeId,
    setSelectedNodeId,
    onNodesChange,
    onEdgesChange,
    onConnect,
    addNode,
    updateNodeData,
    deleteNode,
  };
}
```

### File 3.3: `src/hooks/use-workflow-mutations.ts`
```typescript
import { api } from '@/lib/trpc/client';
import { toast } from 'sonner';

export function useWorkflowMutations() {
  const utils = api.useUtils();

  const create = api.workflow.create.useMutation({
    onSuccess: () => {
      toast.success('Workflow created');
      utils.workflow.list.invalidate();
    },
    onError: (error) => {
      toast.error(`Failed to create workflow: ${error.message}`);
    },
  });

  const update = api.workflow.update.useMutation({
    onSuccess: () => {
      toast.success('Workflow updated');
      utils.workflow.list.invalidate();
    },
    onError: (error) => {
      toast.error(`Failed to update workflow: ${error.message}`);
    },
  });

  const activate = api.workflow.activate.useMutation({
    onSuccess: () => {
      toast.success('Workflow activated');
      utils.workflow.list.invalidate();
    },
  });

  const deactivate = api.workflow.deactivate.useMutation({
    onSuccess: () => {
      toast.success('Workflow deactivated');
      utils.workflow.list.invalidate();
    },
  });

  const deleteWorkflow = api.workflow.delete.useMutation({
    onSuccess: () => {
      toast.success('Workflow deleted');
      utils.workflow.list.invalidate();
    },
  });

  return { create, update, activate, deactivate, deleteWorkflow };
}
```

### File 3.4: `src/hooks/use-settings-mutations.ts`
```typescript
import { api } from '@/lib/trpc/client';
import { toast } from 'sonner';

export function useSettingsMutations() {
  const utils = api.useUtils();

  const updateGeneral = api.settings.updateGeneral.useMutation({
    onSuccess: () => {
      toast.success('Settings saved');
      utils.settings.getGeneral.invalidate();
    },
    onError: (error) => {
      toast.error(`Failed to save: ${error.message}`);
    },
  });

  const updateNotifications = api.settings.updateNotifications.useMutation({
    onSuccess: () => {
      toast.success('Notification settings saved');
      utils.settings.getNotifications.invalidate();
    },
  });

  const createApiKey = api.settings.createApiKey.useMutation({
    onSuccess: () => {
      toast.success('API key created');
      utils.settings.listApiKeys.invalidate();
    },
  });

  const revokeApiKey = api.settings.revokeApiKey.useMutation({
    onSuccess: () => {
      toast.success('API key revoked');
      utils.settings.listApiKeys.invalidate();
    },
  });

  const toggleModule = api.settings.toggleModule.useMutation({
    onSuccess: () => {
      toast.success('Module updated');
      utils.settings.getModules.invalidate();
    },
  });

  return {
    updateGeneral,
    updateNotifications,
    createApiKey,
    revokeApiKey,
    toggleModule
  };
}
```

### File 3.5: `src/hooks/use-audit-log.ts`
```typescript
import { api } from '@/lib/trpc/client';
import { useState } from 'react';
import type { AuditLogFilters } from '@/types/audit-log';

export function useAuditLog() {
  const [filters, setFilters] = useState<AuditLogFilters>({});
  const [cursor, setCursor] = useState<string | undefined>();

  const { data, isLoading, error } = api.audit.list.useQuery({
    ...filters,
    cursor,
  });

  const exportCsv = api.audit.exportCsv.useMutation();

  return {
    entries: data?.entries ?? [],
    hasMore: data?.hasMore ?? false,
    isLoading,
    error,
    filters,
    setFilters,
    loadMore: () => setCursor(data?.nextCursor),
    exportCsv,
  };
}
```

### File 3.6: `src/hooks/use-chart-data.ts`
```typescript
import { useMemo } from 'react';
import type { ChartDataPoint } from '@/types/analytics';

export function useChartData(rawData: unknown[] | undefined) {
  return useMemo(() => {
    if (!rawData) return [];
    return rawData.map((item: any) => ({
      date: item.date,
      value: item.value ?? 0,
      label: item.label,
    }));
  }, [rawData]);
}

export function useChartColors() {
  return {
    primary: 'hsl(var(--primary))',
    success: 'hsl(var(--success))',
    warning: 'hsl(var(--warning))',
    danger: 'hsl(var(--destructive))',
    muted: 'hsl(var(--muted-foreground))',
  };
}
```

**Success Criteria:**
- All hooks compile with 0 tsc errors
- tRPC procedures match backend routers
- Optimistic updates implemented where applicable
- Toast notifications on all mutations

---

## Wave 4: Analytics Components (8 files)

**Parallel execution:** 2 sub-waves (4 + 4)

### Sub-Wave 4A: Core Analytics (4 files)

#### File 4A.1: `src/components/analytics/kpi-card.tsx`
```typescript
// Reusable KPI card with trend indicator
- Card layout with label, value, change percentage
- Green/red trend arrow based on positive/negative change
- Period label ("vs last week")
- Loading skeleton variant
```

#### File 4A.2: `src/components/analytics/revenue-chart.tsx`
```typescript
// Line chart using Recharts
- ResponsiveContainer wrapper
- LineChart with gradient fill
- X-axis: dates, Y-axis: currency
- Tooltip with custom formatter
- Toggle buttons for week/month view
- Loading skeleton
```

#### File 4A.3: `src/components/analytics/status-donut-chart.tsx`
```typescript
// Donut chart for bookings by status
- PieChart with custom colors per status
- Center label showing total
- Legend with status badges
- Responsive sizing
```

#### File 4A.4: `src/components/analytics/top-services-chart.tsx`
```typescript
// Horizontal bar chart
- BarChart with service names on Y-axis
- Revenue on X-axis
- Custom bar colors
- Truncate long service names
```

### Sub-Wave 4B: Advanced Analytics (4 files)

#### File 4B.1: `src/components/analytics/staff-utilization-heatmap.tsx`
```typescript
// Grid heatmap showing staff × time
- Staff names as row headers
- Hour slots as columns (8am-8pm)
- Color intensity based on utilization %
- Tooltip on hover with exact %
- Empty state for no data
```

#### File 4B.2: `src/components/analytics/churn-risk-table.tsx`
```typescript
// Table of at-risk customers
- Columns: Name, Email, Last Booking, Days Since, Risk Level, Total Spend
- Badge for risk level (HIGH=red, MEDIUM=amber, LOW=gray)
- Click row → customer detail
- Sort by risk level, days since booking
- Export to CSV button
```

#### File 4B.3: `src/components/analytics/date-range-picker.tsx`
```typescript
// Date range selector with presets
- Preset buttons: 7d, 30d, 90d, 12m
- Custom range with Calendar popover
- Apply/Reset buttons
- Displays selected range as text
```

#### File 4B.4: `src/components/analytics/export-menu.tsx`
```typescript
// Dropdown menu for export options
- Export CSV (downloads immediately)
- Export PDF (opens save dialog)
- Disabled state when no data
- Loading state during export
```

**Success Criteria:**
- All components render without errors
- Recharts configured correctly
- Responsive on mobile (stacked layouts)
- Loading skeletons match chart shapes
- Empty states handled

---

## Wave 5: Analytics Page (1 file)

### File 5.1: `src/app/(admin)/admin/analytics/page.tsx`
```typescript
// Main analytics dashboard page
- PageHeader with title, date range picker, export menu
- KPI cards in 4-column grid (responsive to 1 column on mobile)
- Revenue chart (full width)
- 2-column grid: Status donut + Top services bar chart
- Staff utilization heatmap (full width)
- Churn risk table (full width, paginated)
- All data loading states orchestrated
- Error boundaries per section
```

**Layout:**
```
┌─────────────────────────────────────────────────┐
│ Analytics Dashboard    [Date Range] [Export]    │
├─────────────────────────────────────────────────┤
│ [KPI Card] [KPI Card] [KPI Card] [KPI Card]     │
├─────────────────────────────────────────────────┤
│ Revenue Chart (full width line chart)           │
├─────────────────────────────────────────────────┤
│ Bookings by Status    │ Top Services            │
│ (donut chart)         │ (bar chart)             │
├─────────────────────────────────────────────────┤
│ Staff Utilization Heatmap (grid)                │
├─────────────────────────────────────────────────┤
│ Churn Risk Customers (table)                    │
└─────────────────────────────────────────────────┘
```

**Success Criteria:**
- Page renders at `/admin/analytics`
- All charts display sample data
- Filters update all charts
- Export CSV/PDF works
- Mobile responsive (stacked layout)
- 0 tsc errors, build passes

---

## Wave 6: Workflow Builder Components (12 files)

**Parallel execution:** 3 sub-waves (4 + 4 + 4)

### Sub-Wave 6A: Core Canvas (4 files)

#### File 6A.1: `src/components/workflow/workflow-canvas.tsx`
```typescript
// Main React Flow canvas
- ReactFlow with custom node types
- Background grid
- Controls (zoom, fit view)
- MiniMap
- onNodesChange, onEdgesChange, onConnect handlers
- Drag-and-drop from palette
- Click node → open config panel
```

#### File 6A.2: `src/components/workflow/node-palette.tsx`
```typescript
// Draggable node library
- Collapsible sections by category (Trigger, Actions, Control Flow, Transform)
- Draggable node templates
- Icons from lucide-react
- Description tooltip on hover
- Search/filter nodes
```

#### File 6A.3: `src/components/workflow/node-config-panel.tsx`
```typescript
// Right-side panel for node configuration
- Sheet component from shadcn
- Dynamic form based on node type
- Save/Cancel buttons
- Delete node button (with confirmation)
- Renders type-specific config components
```

#### File 6A.4: `src/components/workflow/workflow-toolbar.tsx`
```typescript
// Top toolbar above canvas
- Workflow name (editable)
- Trigger event selector
- Save button (primary)
- Activate/Deactivate toggle
- Validation status indicator (errors/warnings)
- Zoom controls
```

### Sub-Wave 6B: Node Type Components (4 files)

#### File 6B.1: `src/components/workflow/nodes/trigger-node.tsx`
```typescript
// Custom node component for TRIGGER type
- Event name display
- Handle for outgoing edge (bottom)
- Icon: Zap
- Style: purple border
```

#### File 6B.2: `src/components/workflow/nodes/action-node.tsx`
```typescript
// Generic action node (email, sms, webhook, etc.)
- Action type icon + label
- Input handle (top)
- Output handle (bottom)
- Config summary (1 line)
- Style: blue border
```

#### File 6B.3: `src/components/workflow/nodes/if-node.tsx`
```typescript
// IF control flow node
- Icon: GitBranch
- Input handle (top)
- Two output handles: "true" (right), "false" (left)
- Condition summary display
- Style: amber border
```

#### File 6B.4: `src/components/workflow/nodes/loop-node.tsx`
```typescript
// LOOP control flow node
- Icon: RotateCw
- Input handle (top)
- Loop body output (bottom)
- Loop end connector (right)
- Item count display
- Style: green border
```

### Sub-Wave 6C: Config Forms (4 files)

#### File 6C.1: `src/components/workflow/config/email-config.tsx`
```typescript
// Email action config form
- Template selector (dropdown)
- Recipient field (variable picker or literal)
- Subject field (with variable tokens)
- Variable mapping (drag-drop)
- Preview button
```

#### File 6C.2: `src/components/workflow/config/if-config.tsx`
```typescript
// IF condition config form
- Condition builder UI
- Field selector (from context)
- Operator dropdown (equals, contains, greater than, etc.)
- Value input (or variable picker)
- Add condition group (AND/OR)
```

#### File 6C.3: `src/components/workflow/config/webhook-config.tsx`
```typescript
// Webhook action config form
- URL input (required)
- HTTP method selector (GET/POST/PUT/PATCH)
- Headers builder (key-value pairs)
- Body JSON editor (with variable picker)
- Test webhook button
```

#### File 6C.4: `src/components/workflow/config/variable-config.tsx`
```typescript
// SET_VARIABLE node config form
- Variable name input
- Value type selector (literal, field reference, expression)
- Expression editor (safe arithmetic only)
- Variable scope info
```

**Success Criteria:**
- React Flow renders correctly
- Nodes are draggable and connectable
- Config panel updates node data
- All node types render with correct handles
- Validation catches orphaned nodes, cycles

---

## Wave 7: Workflow Pages (3 files)

### File 7.1: `src/app/(admin)/admin/workflows/page.tsx`
```typescript
// Workflow list page
- Table of workflows: Name, Trigger, Status (Active/Inactive), Last Run, Actions
- Filter by status, trigger event
- Search by name
- Create new workflow button → redirects to /admin/workflows/new
- Click row → edit workflow
- Activate/deactivate toggle (optimistic)
- Delete workflow (with confirmation dialog)
```

### File 7.2: `src/app/(admin)/admin/workflows/[id]/page.tsx`
```typescript
// Workflow editor page
- Full-screen canvas layout
- WorkflowCanvas (center)
- NodePalette (left sidebar, collapsible)
- NodeConfigPanel (right, conditional)
- WorkflowToolbar (top)
- Save logic: calls workflow.update mutation
- Load workflow data on mount
- Validation before save (cycles, orphans)
```

### File 7.3: `src/app/(admin)/admin/workflows/[id]/executions/page.tsx`
```typescript
// Workflow execution history
- Table: Execution ID, Started At, Completed At, Status, Duration
- Status badge (success=green, error=red, running=blue)
- Click row → execution detail drawer
- Execution detail shows per-step timeline (vertical stepper)
- Each step: node name, status, output/error, duration
- Filter by status, date range
- Auto-refresh for running executions (30s interval)
```

**Success Criteria:**
- All workflow pages render
- Canvas saves and loads correctly
- Execution history displays real data
- Node palette is draggable
- 0 tsc errors, build passes

---

## Wave 8: Settings Components (10 files)

**Parallel execution:** 2 sub-waves (5 + 5)

### Sub-Wave 8A: Setting Tabs 1-3 (5 files)

#### File 8A.1: `src/components/settings/general-tab.tsx`
```typescript
// General settings form
- Business name input
- Address textarea
- Timezone select (shadcn Select with search)
- Currency select (common currencies)
- Logo upload (file input with preview)
- Save button (calls updateGeneral mutation)
```

#### File 8A.2: `src/components/settings/notifications-tab.tsx`
```typescript
// Notification settings form
- Email enabled toggle
- SMS enabled toggle
- Reminder timing input (hours before)
- Template editors (3 textareas with variable picker):
  - Confirmation email
  - Reminder email
  - Cancellation email
- Preview button (opens dialog with sample)
```

#### File 8A.3: `src/components/settings/integrations-tab.tsx`
```typescript
// Integrations connections
- Google Calendar card:
  - Connection status badge
  - Connect button (OAuth flow)
  - Disconnect button (with confirmation)
  - Connected email display
- Outlook card (same structure)
- Future: Stripe, Zapier, etc. (placeholder cards)
```

#### File 8A.4: `src/components/settings/billing-tab.tsx`
```typescript
// Billing & plan info
- Current plan card (name, price, features)
- Usage stats: bookings this month, team members, storage
- Progress bars for limits
- Upgrade CTA button (opens Stripe checkout)
- Billing history table (invoice date, amount, status, PDF link)
```

#### File 8A.5: `src/components/settings/modules-tab.tsx`
```typescript
// Module toggle cards
- Grid of module cards:
  - Module name + description
  - Toggle switch (calls toggleModule mutation)
  - "Premium" badge if isPremium
  - Disabled if not on correct plan
- Optimistic updates on toggle
```

### Sub-Wave 8B: Settings Tabs 4-7 (5 files)

#### File 8B.1: `src/components/settings/security-tab.tsx`
```typescript
// API keys & security
- API keys table: Name, Key (masked), Created, Last Used, Actions
- Create API key button → dialog:
  - Name input
  - Expiry dropdown (30d, 90d, 1y, never)
  - Show key ONCE after creation (copy to clipboard)
- Revoke button per key (with confirmation)
- Webhook endpoints section:
  - List of registered webhooks
  - Add webhook button
  - Test button (sends sample payload)
```

#### File 8B.2: `src/components/settings/danger-tab.tsx`
```typescript
// Destructive actions
- Export all data button (GDPR compliance)
  - Downloads JSON dump
  - Progress indicator
- Delete all bookings button
  - Confirmation dialog with "type DELETE to confirm"
  - Calls dangerous mutation
- Delete organization button
  - Double confirmation
  - Only for organization owner
```

#### File 8B.3: `src/components/settings/settings-sidebar.tsx`
```typescript
// Left sidebar navigation
- Vertical tab list (shadcn Tabs)
- Icons per tab
- Active state highlighting
- Mobile: becomes dropdown select
```

#### File 8B.4: `src/components/settings/logo-uploader.tsx`
```typescript
// Logo upload component
- Drop zone (react-dropzone)
- Image preview
- Crop tool (optional: react-easy-crop)
- File validation (size, type)
- Upload progress bar
- Remove button
```

#### File 8B.5: `src/components/settings/template-editor.tsx`
```typescript
// Email template editor
- Textarea with syntax highlighting
- Variable picker (dropdown)
  - Available: {{customerName}}, {{bookingTime}}, {{serviceName}}, etc.
- Insert variable button
- Preview button → opens dialog with rendered sample
- Character count
```

**Success Criteria:**
- All tabs render correctly
- Forms save and load data
- Toggles have optimistic updates
- File upload works with validation
- Template variables insert correctly

---

## Wave 9: Settings Page (1 file)

### File 9.1: `src/app/(admin)/admin/settings/page.tsx`
```typescript
// Main settings page
- Two-column layout:
  - Left: SettingsSidebar (fixed width 240px)
  - Right: Tab content (flex-1)
- Tabs component wraps all content
- Default tab: general
- URL hash routing (e.g., #notifications)
- All tab components lazy-loaded
- Page title per tab
```

**Layout:**
```
┌──────────┬──────────────────────────────────┐
│ General  │ General Settings                 │
│ Notify   │ ┌──────────────────────────────┐ │
│ Integr.  │ │ Business Name                │ │
│ Billing  │ │ [Input]                      │ │
│ Modules  │ ├──────────────────────────────┤ │
│ Security │ │ Address                      │ │
│ Danger   │ │ [Textarea]                   │ │
│          │ └──────────────────────────────┘ │
│          │ [Save Settings]                  │
└──────────┴──────────────────────────────────┘
```

**Success Criteria:**
- Page renders at `/admin/settings`
- All 7 tabs accessible
- Hash routing works (#general, #billing, etc.)
- Forms load existing settings
- Mutations update successfully
- Mobile: sidebar becomes dropdown
- 0 tsc errors, build passes

---

## Wave 10: Audit Log Components (4 files)

### File 10.1: `src/components/audit/audit-timeline.tsx`
```typescript
// Vertical timeline of audit entries
- Chronological list (newest first)
- Each entry:
  - Timestamp (relative: "2 hours ago")
  - Actor avatar + name
  - Action badge (created=green, updated=blue, deleted=red)
  - Resource type + name
  - Changes diff (expandable)
- Infinite scroll (loads more on scroll bottom)
```

### File 10.2: `src/components/audit/audit-filters.tsx`
```typescript
// Filter panel
- Resource type multi-select (Booking, Customer, Staff, etc.)
- Actor select (all staff members)
- Action select (Created, Updated, Deleted)
- Date range picker
- Apply filters button
- Reset filters button
```

### File 10.3: `src/components/audit/change-diff.tsx`
```typescript
// Diff viewer for before/after
- Field-by-field comparison
- Side-by-side layout (desktop)
- Stacked layout (mobile)
- Color coding: red for removed, green for added
- JSON diff for complex fields
```

### File 10.4: `src/components/audit/export-audit-log.tsx`
```typescript
// Export audit log to CSV
- Export button with loading state
- Respects current filters
- Generates CSV with columns:
  - Timestamp, Actor, Action, Resource Type, Resource ID, Changes
- Downloads immediately
```

**Success Criteria:**
- Timeline renders correctly
- Filters update query
- Diffs display correctly
- CSV export works
- Infinite scroll loads more entries

---

## Wave 11: Audit Log Page (1 file)

### File 11.1: `src/app/(admin)/admin/audit/page.tsx`
```typescript
// Main audit log page
- PageHeader with title, filters button, export button
- AuditFilters component (collapsible panel at top)
- AuditTimeline component (main content)
- Loading skeleton (timeline shape)
- Empty state when no entries
- Error boundary
```

**Layout:**
```
┌─────────────────────────────────────────────────┐
│ Audit Log                    [Filters] [Export] │
├─────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────┐ │
│ │ [Filter panel - collapsible]                │ │
│ └─────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────┤
│ ○ 2 hours ago — John Doe updated Booking #123   │
│   └─ Changed status from PENDING to CONFIRMED   │
├─────────────────────────────────────────────────┤
│ ○ 5 hours ago — Jane Smith created Customer #45 │
├─────────────────────────────────────────────────┤
│ ○ 1 day ago — Admin deleted Service #7          │
│   └─ [View changes]                             │
└─────────────────────────────────────────────────┘
```

**Success Criteria:**
- Page renders at `/admin/audit`
- Timeline displays entries
- Filters work correctly
- Export generates CSV
- Infinite scroll loads more
- 0 tsc errors, build passes

---

## Wave 12: Integration & Testing (1 mega file)

### File 12.1: `__tests__/phase7d.test.tsx`

**Test Suite Structure:**
```typescript
describe('Phase 7D - Advanced Admin', () => {
  describe('Analytics Dashboard', () => {
    it('renders KPI cards with correct data')
    it('displays revenue chart with toggle')
    it('shows bookings by status donut chart')
    it('renders top services bar chart')
    it('displays staff utilization heatmap')
    it('shows churn risk table')
    it('exports to CSV')
    it('exports to PDF')
    it('filters update all charts')
    it('handles date range presets')
    it('shows loading skeletons')
    it('handles empty state')
  });

  describe('Workflow Builder', () => {
    it('renders workflow canvas')
    it('displays node palette')
    it('drags node from palette to canvas')
    it('connects two nodes')
    it('opens config panel on node click')
    it('updates node data from config panel')
    it('saves workflow')
    it('validates workflow before save')
    it('detects cycles')
    it('detects orphaned nodes')
    it('activates workflow')
    it('deactivates workflow')
    it('deletes workflow')
    it('renders execution history')
    it('shows execution detail')
  });

  describe('Settings', () => {
    it('renders all 7 tabs')
    it('saves general settings')
    it('saves notification settings')
    it('connects Google Calendar')
    it('disconnects integration')
    it('toggles module')
    it('creates API key')
    it('revokes API key')
    it('uploads logo')
    it('edits email template')
    it('previews email template')
    it('exports data (GDPR)')
    it('confirms dangerous actions')
  });

  describe('Audit Log', () => {
    it('renders audit timeline')
    it('filters by resource type')
    it('filters by actor')
    it('filters by action')
    it('filters by date range')
    it('shows change diff')
    it('loads more on scroll')
    it('exports to CSV')
  });

  describe('Navigation', () => {
    it('links to analytics from sidebar')
    it('links to workflows from sidebar')
    it('links to settings from sidebar')
    it('links to audit from sidebar')
  });

  describe('Permissions', () => {
    it('shows analytics to permitted users')
    it('hides workflows from unpermitted users')
    it('restricts settings tabs by permission')
    it('restricts audit log access')
  });

  describe('Responsive', () => {
    it('stacks KPI cards on mobile')
    it('collapses workflow palette on mobile')
    it('converts settings sidebar to dropdown on mobile')
    it('stacks audit timeline on mobile')
  });

  describe('Performance', () => {
    it('lazy loads chart data')
    it('debounces filter changes')
    it('virtualizes long audit log')
    it('memoizes expensive calculations')
  });
});
```

**Target:** 150+ tests, 95%+ coverage

---

## Wave 13: Admin Sidebar Integration (1 file)

### File 13.1: Update `src/components/admin/admin-sidebar.tsx`

Add navigation items:
```typescript
{
  title: 'Analytics',
  href: '/admin/analytics',
  icon: BarChart3,
  permission: 'analytics:view',
},
{
  title: 'Workflows',
  href: '/admin/workflows',
  icon: Workflow,
  permission: 'workflows:manage',
},
{
  title: 'Settings',
  href: '/admin/settings',
  icon: Settings,
  permission: 'settings:manage',
},
{
  title: 'Audit Log',
  href: '/admin/audit',
  icon: FileText,
  permission: 'audit:view',
},
```

**Success Criteria:**
- New items visible in sidebar
- Permission filtering works
- Active state highlights correctly
- Icons from lucide-react

---

## Final Verification Checklist

**TypeScript:**
- [ ] `npm run typecheck` — 0 errors
- [ ] All imports resolve correctly
- [ ] No `@ts-ignore` comments

**Build:**
- [ ] `npm run build` — success
- [ ] No build warnings
- [ ] All pages compile

**Tests:**
- [ ] `npm run test` — all pass
- [ ] Coverage >95% for new files
- [ ] No console errors in tests

**Runtime:**
- [ ] All pages render at correct routes
- [ ] No console errors in browser
- [ ] Dark mode works on all pages
- [ ] Mobile responsive (390px minimum)

**Accessibility:**
- [ ] All interactive elements keyboard accessible
- [ ] Focus rings visible
- [ ] ARIA labels on custom components
- [ ] Screen reader tested (VoiceOver/NVDA)

**Integration:**
- [ ] tRPC procedures match backend
- [ ] Toast notifications on all mutations
- [ ] Optimistic updates implemented
- [ ] Error boundaries catch errors

**Performance:**
- [ ] Charts lazy load data
- [ ] Filters debounced
- [ ] Long lists virtualized
- [ ] Images optimized

---

## Package Installation

```bash
npm install recharts reactflow date-fns
npm install -D @types/react-beautiful-dnd
```

---

## Estimated Timeline

- **Wave 1-2 (Types/Schemas):** 1 hour
- **Wave 3 (Hooks):** 1.5 hours
- **Wave 4-5 (Analytics):** 3 hours
- **Wave 6-7 (Workflows):** 4 hours
- **Wave 8-9 (Settings):** 3 hours
- **Wave 10-11 (Audit):** 2 hours
- **Wave 12 (Tests):** 3 hours
- **Wave 13 (Integration):** 0.5 hours

**Total: ~18 hours** (parallelized to ~6 hours with 3-4 agents)

---

## Backend Dependencies

Phase 7D requires these backend procedures to be implemented:

**Analytics Module:**
- `analytics.getKPIs`
- `analytics.getRevenueChart`
- `analytics.getBookingsByStatus`
- `analytics.getTopServices`
- `analytics.getStaffUtilization`
- `analytics.getChurnRisk`

**Workflow Module (Phase 6):**
- `workflow.list`
- `workflow.get`
- `workflow.create`
- `workflow.update`
- `workflow.activate`
- `workflow.deactivate`
- `workflow.delete`
- `workflow.getExecutions`
- `workflow.getExecutionDetail`

**Settings Module:**
- `settings.getGeneral`
- `settings.updateGeneral`
- `settings.getNotifications`
- `settings.updateNotifications`
- `settings.listApiKeys`
- `settings.createApiKey`
- `settings.revokeApiKey`
- `settings.getModules`
- `settings.toggleModule`

**Audit Module:**
- `audit.list` (with cursor pagination)
- `audit.exportCsv`

**Status:** All backend modules exist from Phase 5-6. Ready for frontend integration.

---

*Plan created: 2026-02-20*
*Target completion: Phase 7D complete*
*Next: Phase 7E (Platform Admin)*
