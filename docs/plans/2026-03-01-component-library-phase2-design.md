# Component Library Phase 2 — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Complete the higher-level component library with EntityDetail, EntityForm, Timeline, and MetricsDashboard.

**Architecture:** Config-driven components on top of shadcn/ui, following the same patterns as Phase 1 (DataGrid, StatCard, StatusPipeline).

**Tech Stack:** React 19, Tailwind 4, CVA, shadcn/ui, @testing-library/react, vitest

---

## Phase 1 Recap (Already Complete)

| Component | Directory | Purpose |
|-----------|-----------|---------|
| `DataGrid` | `src/components/data-grid/` | Filterable, sortable, paginated list with column config, bulk actions, empty state |
| `StatCard` | `src/components/stat-card/` | KPI display with value, trend, icon, comparison period |
| `StatusPipeline` | `src/components/status-pipeline/` | Visual status flow with current state highlighted |

### Established File Pattern (follow exactly)

Each component lives in its own directory under `src/components/`:

```
src/components/{component-name}/
  {component-name}.types.ts       # TypeScript interfaces with JSDoc (no Zod)
  {component-name}.tsx             # React component implementation
  __tests__/{component-name}.test.tsx  # vitest + @testing-library/react tests
  index.ts                         # Barrel export: component + all types
```

### Established Type Conventions

- Every prop gets a `/** JSDoc comment */`
- `LucideIcon` type from `lucide-react` for icon props
- `ReactNode` from `react` for render slots
- Optional `className?: string` on every component for composition
- `isLoading?: boolean` for loading states
- Sub-interfaces extracted for complex nested types (e.g. `DataGridColumn<T>`, `PipelineStage`)
- Variant unions as literal string types (e.g. `"default" | "success" | "warning" | "destructive" | "info"`)

### Established Implementation Conventions

- Components are named exports (not default exports): `export function StatCard(...)`
- Import shadcn primitives from `@/components/ui/*`
- Import `cn` from `@/lib/utils` for className merging
- Use `Skeleton` from `@/components/ui/skeleton` for loading states
- No `"use client"` directive on higher-level components unless they use hooks directly
- Tests use `describe`/`it`/`expect` from `vitest` and `render`/`screen` from `@testing-library/react`

### Available shadcn/ui Primitives

Already installed and available for use:

`Avatar`, `Badge`, `Button`, `Card` (+ CardHeader/CardContent/CardFooter/CardTitle/CardDescription), `Checkbox`, `Collapsible`, `Command`, `Dialog`, `DropdownMenu`, `EmptyState`, `ErrorCard`, `Input`, `Label`, `PageHeader`, `Popover`, `Progress`, `ScrollArea`, `Select`, `Separator`, `Sheet`, `Skeleton`, `Switch`, `Table`, `Tabs` (+ TabsList/TabsTrigger/TabsContent), `Textarea`, `Tooltip`

---

## Task 1: EntityDetail

A tabbed detail view for any entity (customer, booking, venue, team member, etc.). This replaces the pattern of rebuilding header + tabs + metadata layouts from scratch in every detail page.

### Files

- Create: `src/components/entity-detail/entity-detail.types.ts`
- Create: `src/components/entity-detail/entity-detail.tsx`
- Create: `src/components/entity-detail/__tests__/entity-detail.test.tsx`
- Create: `src/components/entity-detail/index.ts`

### Step 1: Create the type definitions

**File:** `src/components/entity-detail/entity-detail.types.ts`

```typescript
import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"

// ---------------------------------------------------------------------------
// Avatar configuration
// ---------------------------------------------------------------------------

/**
 * Configuration for the entity's avatar display.
 */
export interface EntityDetailAvatar {
  /** Image source URL. Falls back to `fallback` if the image fails to load. */
  src?: string
  /** Fallback text displayed when no image is available (e.g. initials "JD"). */
  fallback: string
}

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------

/**
 * Configuration for the entity's status badge.
 */
export interface EntityDetailStatus {
  /** Display label for the status (e.g. "Active", "Pending", "Cancelled"). */
  label: string
  /** Visual variant controlling the badge color scheme. */
  variant: "default" | "success" | "warning" | "destructive" | "info" | "secondary" | "outline"
}

// ---------------------------------------------------------------------------
// Action button
// ---------------------------------------------------------------------------

/**
 * An action button rendered in the entity detail header.
 * Typically used for primary actions like "Edit", "Delete", "Send Invoice".
 */
export interface EntityDetailAction {
  /** Button label text. */
  label: string
  /** Optional Lucide icon rendered before the label. */
  icon?: LucideIcon
  /** Callback invoked when the button is clicked. */
  onClick: () => void
  /** Button visual variant. Defaults to "outline". */
  variant?: "default" | "secondary" | "destructive" | "outline" | "ghost" | "link"
  /** Whether the button is currently disabled. */
  disabled?: boolean
  /** Whether the action is currently pending (shows loading state). */
  isPending?: boolean
}

// ---------------------------------------------------------------------------
// Tab definition
// ---------------------------------------------------------------------------

/**
 * A single tab in the entity detail view.
 */
export interface EntityDetailTab {
  /** Unique identifier for the tab, used as the Tabs value. */
  id: string
  /** Display label shown in the tab trigger. */
  label: string
  /** Content rendered when this tab is active. */
  content: ReactNode
}

// ---------------------------------------------------------------------------
// Metadata key-value pair
// ---------------------------------------------------------------------------

/**
 * A key-value pair displayed in the metadata row below the header.
 * Used for at-a-glance information like "Email: john@example.com", "Phone: +44...", "Member since: Jan 2024".
 */
export interface EntityDetailMetadataItem {
  /** Metadata field label (e.g. "Email", "Phone", "Created"). */
  label: string
  /** Metadata field value. Can be a string or ReactNode for custom rendering (e.g. a link). */
  value: ReactNode
}

// ---------------------------------------------------------------------------
// Breadcrumb
// ---------------------------------------------------------------------------

/**
 * A breadcrumb navigation item.
 */
export interface EntityDetailBreadcrumb {
  /** Display label for the breadcrumb link. */
  label: string
  /** Navigation URL. The last breadcrumb (current page) typically has no href. */
  href?: string
}

// ---------------------------------------------------------------------------
// Main props
// ---------------------------------------------------------------------------

/**
 * Props for the EntityDetail component.
 * Renders a complete entity detail page with breadcrumbs, header (avatar, title, status, actions),
 * metadata row, and tabbed content panels.
 *
 * @example
 * ```tsx
 * <EntityDetail
 *   title="Jane Smith"
 *   subtitle="Premium Customer"
 *   avatar={{ fallback: "JS" }}
 *   status={{ label: "Active", variant: "success" }}
 *   actions={[
 *     { label: "Edit", icon: Pencil, onClick: handleEdit },
 *     { label: "Delete", icon: Trash2, onClick: handleDelete, variant: "destructive" },
 *   ]}
 *   metadata={[
 *     { label: "Email", value: "jane@example.com" },
 *     { label: "Phone", value: "+44 7700 900123" },
 *     { label: "Member since", value: "Jan 2024" },
 *   ]}
 *   tabs={[
 *     { id: "overview", label: "Overview", content: <OverviewTab /> },
 *     { id: "bookings", label: "Bookings", content: <BookingsTab /> },
 *     { id: "invoices", label: "Invoices", content: <InvoicesTab /> },
 *   ]}
 *   defaultTab="overview"
 * />
 * ```
 */
export interface EntityDetailProps {
  /** Entity name or title displayed prominently in the header. */
  title: string
  /** Optional subtitle displayed below the title (e.g. role, type, category). */
  subtitle?: string
  /** Optional avatar configuration. Renders an Avatar component in the header. */
  avatar?: EntityDetailAvatar
  /** Optional status badge displayed next to the title. */
  status?: EntityDetailStatus
  /** Array of action buttons rendered in the header (right-aligned). */
  actions?: EntityDetailAction[]
  /** Array of tab definitions. Each tab has an id, label, and content ReactNode. */
  tabs: EntityDetailTab[]
  /** The `id` of the tab that should be active by default. Defaults to the first tab's id. */
  defaultTab?: string
  /** Array of key-value metadata items displayed in a row below the header. */
  metadata?: EntityDetailMetadataItem[]
  /** Optional breadcrumb navigation displayed above the header. */
  breadcrumbs?: EntityDetailBreadcrumb[]
  /** Whether the component is in a loading state. Shows skeleton placeholders. */
  isLoading?: boolean
  /** Additional CSS class name applied to the root container. */
  className?: string
}
```

### Step 2: Implement the component

**File:** `src/components/entity-detail/entity-detail.tsx`

**Layout (top to bottom):**

1. **Breadcrumbs** (if provided) — horizontal row of links separated by `/` or `>` chevron. Last item is plain text (current page). Uses `<nav>` with `aria-label="Breadcrumb"`.

2. **Header section** — wrapped in a `Card` component:
   - Left side: `Avatar` (if provided) + vertical stack of `title` (h1, text-2xl font-bold) + `subtitle` (text-sm text-muted-foreground) + `Badge` for status (if provided).
   - Right side: action `Button` components, horizontally laid out with `gap-2`. Each button renders its optional icon before the label. Uses the `variant` prop directly on the shadcn Button.

3. **Metadata row** (if provided) — inside the same Card, below the header. Horizontal flex row with `Separator` above it. Each item renders as `label` (text-xs text-muted-foreground uppercase tracking-wide) over `value` (text-sm font-medium). Items are separated visually with vertical dividers or spacing.

4. **Tabs section** — uses shadcn `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`. Default value is `defaultTab` or `tabs[0].id`. Each tab's `content` ReactNode is rendered inside its `TabsContent`.

5. **Loading state** — when `isLoading` is true, replace title/subtitle/metadata/avatar with `Skeleton` components. Tabs still render (their content handles its own loading).

**shadcn/ui primitives used:** `Card`, `CardHeader`, `CardContent`, `Avatar`, `AvatarImage`, `AvatarFallback`, `Badge`, `Button`, `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`, `Skeleton`, `Separator`

**Additional imports:** `cn` from `@/lib/utils`, `ChevronRight` from `lucide-react` (for breadcrumb separator), `Loader2` from `lucide-react` (for pending action buttons)

### Step 3: Create the barrel export

**File:** `src/components/entity-detail/index.ts`

```typescript
export { EntityDetail } from "./entity-detail"
export type {
  EntityDetailProps,
  EntityDetailAvatar,
  EntityDetailStatus,
  EntityDetailAction,
  EntityDetailTab,
  EntityDetailMetadataItem,
  EntityDetailBreadcrumb,
} from "./entity-detail.types"
```

### Step 4: Write tests

**File:** `src/components/entity-detail/__tests__/entity-detail.test.tsx`

Tests to write:

1. **"renders title and subtitle"** — pass `title` and `subtitle`, assert both appear in the document.
2. **"renders avatar with fallback text"** — pass `avatar: { fallback: "JS" }`, assert the fallback text is rendered.
3. **"renders status badge"** — pass `status: { label: "Active", variant: "success" }`, assert "Active" badge is in the document.
4. **"renders action buttons"** — pass two actions with labels "Edit" and "Delete", assert both buttons are rendered.
5. **"calls action onClick when button is clicked"** — pass an action with a `vi.fn()` onClick, click the button, assert the function was called.
6. **"renders disabled action button"** — pass an action with `disabled: true`, assert the button has the `disabled` attribute.
7. **"renders metadata items"** — pass metadata array with label/value pairs, assert all labels and values appear.
8. **"renders tabs and shows default tab content"** — pass tabs with content, assert the default tab's content is visible.
9. **"switches tab content when tab is clicked"** — click a non-default tab trigger, assert its content becomes visible.
10. **"renders breadcrumbs with links"** — pass breadcrumbs array, assert breadcrumb labels are rendered and links have correct href.
11. **"renders loading skeletons when isLoading is true"** — pass `isLoading: true`, assert title text is NOT rendered and skeleton elements are present.
12. **"defaults to first tab when defaultTab is not provided"** — pass tabs without `defaultTab`, assert first tab's content is visible.
13. **"renders without optional props"** — pass only required `title` and `tabs`, assert it renders without errors.
14. **"renders metadata value as ReactNode"** — pass a metadata item with a ReactNode value (e.g. `<a>`), assert the link renders.

---

## Task 2: EntityForm

Auto-generates create/edit forms from a declarative field configuration array. Replaces the pattern of hand-writing form fields for every entity type.

### Files

- Create: `src/components/entity-form/entity-form.types.ts`
- Create: `src/components/entity-form/entity-form.tsx`
- Create: `src/components/entity-form/__tests__/entity-form.test.tsx`
- Create: `src/components/entity-form/index.ts`

### Step 1: Create the type definitions

**File:** `src/components/entity-form/entity-form.types.ts`

```typescript
import type { ReactNode } from "react"

// ---------------------------------------------------------------------------
// Field types
// ---------------------------------------------------------------------------

/**
 * Supported field input types for auto-generated form fields.
 */
export type EntityFormFieldType =
  | "text"
  | "number"
  | "email"
  | "tel"
  | "textarea"
  | "select"
  | "checkbox"
  | "switch"
  | "date"
  | "time"
  | "datetime"

// ---------------------------------------------------------------------------
// Select option
// ---------------------------------------------------------------------------

/**
 * An option in a select dropdown field.
 */
export interface EntityFormSelectOption {
  /** The value stored when this option is selected. */
  value: string
  /** The display label shown in the dropdown. */
  label: string
}

// ---------------------------------------------------------------------------
// Validation rules
// ---------------------------------------------------------------------------

/**
 * Validation rules for a form field.
 * Applied at submit time and optionally on blur.
 */
export interface EntityFormFieldValidation {
  /** Minimum value (for number fields) or minimum length (for text fields). */
  min?: number
  /** Maximum value (for number fields) or maximum length (for text fields). */
  max?: number
  /** Regex pattern the value must match (for text-based fields). */
  pattern?: {
    /** The regex pattern string. */
    value: string
    /** Error message displayed when the pattern does not match. */
    message: string
  }
  /** Custom validation function. Return an error message string if invalid, or undefined if valid. */
  custom?: (value: unknown) => string | undefined
}

// ---------------------------------------------------------------------------
// Field definition
// ---------------------------------------------------------------------------

/**
 * Configuration for a single form field.
 * The EntityForm component renders the appropriate input element based on the `type`.
 */
export interface EntityFormField {
  /** Unique field identifier. Used as the key in the `values` record and the `onChange` callback. */
  name: string
  /** Display label rendered above the input. */
  label: string
  /** Input type determining which UI element is rendered. */
  type: EntityFormFieldType
  /** Whether the field is required. Displays a required indicator and validates on submit. */
  required?: boolean
  /** Placeholder text for text-based inputs. */
  placeholder?: string
  /** Help text displayed below the input. */
  description?: string
  /** Options for `select` type fields. Ignored for other field types. */
  options?: EntityFormSelectOption[]
  /** Default value used when the field has no value in the `values` record. */
  defaultValue?: unknown
  /** Validation rules applied on submit. */
  validation?: EntityFormFieldValidation
  /** Whether the field is disabled. */
  disabled?: boolean
}

// ---------------------------------------------------------------------------
// Form section
// ---------------------------------------------------------------------------

/**
 * Groups related fields under a section heading with an optional description.
 * Fields not assigned to any section appear at the top of the form.
 */
export interface EntityFormSection {
  /** Section title displayed as a heading above the grouped fields. */
  title: string
  /** Optional section description displayed below the title. */
  description?: string
  /** Array of field `name` values that belong to this section. */
  fieldNames: string[]
}

// ---------------------------------------------------------------------------
// Main props
// ---------------------------------------------------------------------------

/**
 * Props for the EntityForm component.
 * Renders a complete create/edit form from a declarative field configuration array.
 * Supports controlled values, sections, two-column layout, and client-side validation.
 *
 * @example
 * ```tsx
 * <EntityForm
 *   fields={[
 *     { name: "firstName", label: "First Name", type: "text", required: true },
 *     { name: "lastName", label: "Last Name", type: "text", required: true },
 *     { name: "email", label: "Email", type: "email", required: true },
 *     { name: "phone", label: "Phone", type: "tel" },
 *     { name: "role", label: "Role", type: "select", options: [
 *       { value: "admin", label: "Admin" },
 *       { value: "member", label: "Member" },
 *     ]},
 *     { name: "active", label: "Active", type: "switch" },
 *     { name: "notes", label: "Notes", type: "textarea" },
 *   ]}
 *   values={formValues}
 *   onChange={handleFieldChange}
 *   onSubmit={handleSubmit}
 *   sections={[
 *     { title: "Personal Details", fieldNames: ["firstName", "lastName", "email", "phone"] },
 *     { title: "Settings", description: "Configure account settings", fieldNames: ["role", "active"] },
 *     { title: "Additional", fieldNames: ["notes"] },
 *   ]}
 *   layout="two-column"
 *   submitLabel="Create Member"
 * />
 * ```
 */
export interface EntityFormProps {
  /** Array of field configurations describing each form field and its input type. */
  fields: EntityFormField[]
  /** Current form values as a name-value record (controlled component). */
  values: Record<string, unknown>
  /** Callback invoked when any field value changes. Receives the field `name` and new `value`. */
  onChange: (name: string, value: unknown) => void
  /** Callback invoked when the form is submitted. Receives the full values record. Only called if validation passes. */
  onSubmit: (values: Record<string, unknown>) => void
  /** Whether the form is currently submitting (disables inputs and shows loading on submit button). */
  isSubmitting?: boolean
  /** Label for the submit button. Defaults to "Save". */
  submitLabel?: string
  /** Label for the cancel button. Defaults to "Cancel". */
  cancelLabel?: string
  /** Callback invoked when the cancel button is clicked. If not provided, the cancel button is hidden. */
  onCancel?: () => void
  /** Form layout mode. "single" renders fields in a single column; "two-column" renders fields in a responsive two-column grid. Defaults to "single". */
  layout?: "single" | "two-column"
  /** Optional sections to group fields under headings with descriptions. Fields not assigned to any section are rendered at the top. */
  sections?: EntityFormSection[]
  /** Additional CSS class name applied to the root form element. */
  className?: string
}
```

### Step 2: Implement the component

**File:** `src/components/entity-form/entity-form.tsx`

**Layout (top to bottom):**

1. **Form element** — `<form onSubmit={handleSubmit}>` with `noValidate` (we handle validation ourselves).

2. **Unsectioned fields** (if any fields are not assigned to a section) — rendered first in the form, in a grid. If `layout="two-column"`, the grid uses `grid-cols-1 md:grid-cols-2 gap-4`. Textarea and checkbox/switch fields always span full width in two-column mode (`col-span-full`).

3. **Sections** (if provided) — each section renders:
   - `Separator` (except before the first section if there are no unsectioned fields)
   - Section `title` as a `<h3>` (text-lg font-semibold)
   - Section `description` as `<p>` (text-sm text-muted-foreground) below the title
   - The section's fields in a grid (same layout logic as above)

4. **Field rendering by type** — each field renders inside a `<div>` containing:
   - `Label` component with the field label. If `required`, append a red asterisk `*`.
   - The input element determined by `type`:
     - `text` / `email` / `tel` / `number`: shadcn `Input` with `type` attribute set accordingly
     - `textarea`: shadcn `Textarea`
     - `select`: shadcn `Select` with `SelectTrigger`, `SelectContent`, `SelectItem` for each option
     - `checkbox`: shadcn `Checkbox` with label inline to the right
     - `switch`: shadcn `Switch` with label inline to the right
     - `date`: `Input` with `type="date"`
     - `time`: `Input` with `type="time"`
     - `datetime`: `Input` with `type="datetime-local"`
   - `description` as `<p>` (text-xs text-muted-foreground) below the input
   - Validation error message as `<p>` (text-xs text-destructive) below the description

5. **Footer** — `Separator` followed by a flex row with `justify-end gap-2`:
   - Cancel `Button` (variant "outline") if `onCancel` is provided
   - Submit `Button` (variant "default") with `submitLabel` text. Shows `Loader2` spinner when `isSubmitting`. Disabled when `isSubmitting`.

6. **Validation logic** — internal state `errors: Record<string, string>`. On submit:
   - Check `required` fields have non-empty values
   - Check `validation.min` / `validation.max` (number range or string length)
   - Check `validation.pattern` against string value
   - Run `validation.custom` function
   - If any errors, set state and do NOT call `onSubmit`. Clear individual field errors on change.

**shadcn/ui primitives used:** `Input`, `Textarea`, `Select` (+ SelectTrigger, SelectValue, SelectContent, SelectItem), `Checkbox`, `Switch`, `Label`, `Button`, `Separator`, `Skeleton`

**Additional imports:** `cn` from `@/lib/utils`, `Loader2` from `lucide-react`

### Step 3: Create the barrel export

**File:** `src/components/entity-form/index.ts`

```typescript
export { EntityForm } from "./entity-form"
export type {
  EntityFormProps,
  EntityFormField,
  EntityFormFieldType,
  EntityFormSelectOption,
  EntityFormFieldValidation,
  EntityFormSection,
} from "./entity-form.types"
```

### Step 4: Write tests

**File:** `src/components/entity-form/__tests__/entity-form.test.tsx`

Tests to write:

1. **"renders text input fields with labels"** — pass text fields, assert labels and inputs appear.
2. **"renders textarea field"** — pass a textarea field, assert a textarea element is rendered.
3. **"renders select field with options"** — pass a select field with options, assert the select trigger is rendered. Click it and assert options appear.
4. **"renders checkbox field"** — pass a checkbox field, assert a checkbox input is rendered with its label.
5. **"renders switch field"** — pass a switch field, assert a switch element is rendered with its label.
6. **"renders date input field"** — pass a date field, assert an input with `type="date"` is rendered.
7. **"calls onChange when text input value changes"** — type into a text input, assert `onChange` is called with the field name and new value.
8. **"calls onChange when checkbox is toggled"** — click a checkbox, assert `onChange` is called with the field name and boolean value.
9. **"calls onSubmit with current values when form is submitted"** — click submit button, assert `onSubmit` is called with the values record.
10. **"shows required indicator on required fields"** — pass a required field, assert the asterisk `*` appears near the label.
11. **"shows validation error for empty required field on submit"** — submit with an empty required field, assert error message appears and `onSubmit` is NOT called.
12. **"shows custom validation error"** — pass a field with `validation.custom` that returns an error, submit, assert the error message appears.
13. **"clears validation error when field value changes"** — trigger a validation error, then change the field value, assert the error clears.
14. **"calls onCancel when cancel button is clicked"** — pass `onCancel`, click cancel button, assert `onCancel` is called.
15. **"hides cancel button when onCancel is not provided"** — do not pass `onCancel`, assert no cancel button is rendered.
16. **"disables submit button when isSubmitting is true"** — pass `isSubmitting: true`, assert the submit button is disabled.
17. **"renders custom submit and cancel labels"** — pass custom `submitLabel` and `cancelLabel`, assert they appear on the buttons.
18. **"renders fields in sections with titles"** — pass `sections`, assert section titles appear as headings.
19. **"renders section descriptions"** — pass sections with `description`, assert descriptions appear.
20. **"renders field descriptions as help text"** — pass a field with `description`, assert it appears below the input.
21. **"renders in two-column layout"** — pass `layout="two-column"`, assert the grid container has the two-column class.
22. **"renders disabled fields"** — pass a field with `disabled: true`, assert the input is disabled.

---

## Task 3: Timeline

Activity/event feed for audit logs, booking history, workflow execution steps, customer notes, etc. Renders a vertical timeline with colored markers.

### Files

- Create: `src/components/timeline/timeline.types.ts`
- Create: `src/components/timeline/timeline.tsx`
- Create: `src/components/timeline/__tests__/timeline.test.tsx`
- Create: `src/components/timeline/index.ts`

### Step 1: Create the type definitions

**File:** `src/components/timeline/timeline.types.ts`

```typescript
import type { LucideIcon } from "lucide-react"

// ---------------------------------------------------------------------------
// Actor (who performed the action)
// ---------------------------------------------------------------------------

/**
 * The person or system that triggered a timeline event.
 */
export interface TimelineActor {
  /** Display name of the actor (e.g. "Jane Smith", "System"). */
  name: string
  /** Optional avatar image URL. Falls back to initials derived from `name`. */
  avatarUrl?: string
}

// ---------------------------------------------------------------------------
// Timeline item
// ---------------------------------------------------------------------------

/**
 * A single event in the timeline feed.
 */
export interface TimelineItem {
  /** Unique identifier for the timeline event. */
  id: string
  /** When the event occurred. Used for display formatting and ordering. */
  timestamp: Date
  /** Short title describing the event (e.g. "Booking confirmed", "Payment received"). */
  title: string
  /** Optional longer description with additional context. */
  description?: string
  /** Optional Lucide icon rendered in the timeline marker dot. If not provided, a plain colored dot is shown. */
  icon?: LucideIcon
  /** Color variant for the timeline marker. Controls the dot/icon color. Defaults to "default". */
  variant?: "default" | "success" | "warning" | "destructive" | "info"
  /** Optional actor who performed or triggered this event. */
  actor?: TimelineActor
}

// ---------------------------------------------------------------------------
// Main props
// ---------------------------------------------------------------------------

/**
 * Props for the Timeline component.
 * Renders a vertical activity feed with colored markers, timestamps, titles,
 * descriptions, and optional actor avatars.
 *
 * @example
 * ```tsx
 * <Timeline
 *   items={[
 *     {
 *       id: "1",
 *       timestamp: new Date("2024-01-15T10:30:00"),
 *       title: "Booking confirmed",
 *       description: "Appointment with Jane Smith confirmed for Jan 20th",
 *       icon: CheckCircle,
 *       variant: "success",
 *       actor: { name: "System" },
 *     },
 *     {
 *       id: "2",
 *       timestamp: new Date("2024-01-15T09:00:00"),
 *       title: "Booking created",
 *       actor: { name: "John Doe", avatarUrl: "/avatars/john.jpg" },
 *     },
 *   ]}
 *   maxItems={10}
 *   onShowMore={handleLoadMore}
 * />
 * ```
 */
export interface TimelineProps {
  /** Array of timeline events to display. Rendered in the order provided (caller handles sorting). */
  items: TimelineItem[]
  /** Whether the component is in a loading state. Shows skeleton placeholder items. */
  isLoading?: boolean
  /** Message displayed when the items array is empty. Defaults to "No activity yet". */
  emptyMessage?: string
  /** Maximum number of items to display before showing a "Show more" button. If not set, all items are shown. */
  maxItems?: number
  /** Callback invoked when the "Show more" button is clicked. Required when `maxItems` is set and there are more items. */
  onShowMore?: () => void
  /** Additional CSS class name applied to the root container. */
  className?: string
}
```

### Step 2: Implement the component

**File:** `src/components/timeline/timeline.tsx`

**Layout:**

1. **Root container** — `<div>` with `role="list"` for accessibility.

2. **Empty state** — when `items` is empty and `isLoading` is false, render a centered text message using `emptyMessage` (default: "No activity yet") in `text-sm text-muted-foreground`.

3. **Loading state** — when `isLoading` is true, render 3 skeleton timeline items. Each skeleton item has: a `Skeleton` circle (h-3 w-3 rounded-full) for the marker, a `Skeleton` rectangle for the title (h-4 w-48), and a `Skeleton` rectangle for the description (h-3 w-64).

4. **Timeline items** — each item renders as a `<div role="listitem">` with this structure:
   - **Left column** (fixed width ~40px): vertical line (`border-l-2 border-border`) with a colored marker dot centered on it.
     - Marker dot: `<div>` with `h-3 w-3 rounded-full` (or `h-6 w-6 rounded-full` if `icon` is provided, to contain the icon). Background color determined by `variant`:
       - `default`: `bg-muted-foreground`
       - `success`: `bg-success`
       - `warning`: `bg-warning`
       - `destructive`: `bg-destructive`
       - `info`: `bg-info`
     - If `icon` is provided, render the `LucideIcon` inside the dot (h-3 w-3, text-white or appropriate contrast color).
     - The vertical line extends between items. The first item has no line above, the last item has no line below.
   - **Right column** (flex-1):
     - **Top row**: `title` (text-sm font-medium) + `timestamp` (text-xs text-muted-foreground, right-aligned). Format timestamp as relative time (e.g. "2 hours ago") or short date (e.g. "Jan 15, 10:30 AM") using `Intl.DateTimeFormat`.
     - **Description** (if provided): `<p>` (text-sm text-muted-foreground, mt-1).
     - **Actor** (if provided): small inline display with optional `Avatar` (h-5 w-5) and actor `name` (text-xs text-muted-foreground, mt-1).

5. **Show more button** — if `maxItems` is set and `items.length > maxItems`, only render the first `maxItems` items. Below the list, render a `Button` (variant "ghost", size "sm") with text "Show more" that calls `onShowMore`.

**shadcn/ui primitives used:** `Avatar`, `AvatarImage`, `AvatarFallback`, `Button`, `Skeleton`

**Additional imports:** `cn` from `@/lib/utils`

### Step 3: Create the barrel export

**File:** `src/components/timeline/index.ts`

```typescript
export { Timeline } from "./timeline"
export type {
  TimelineProps,
  TimelineItem,
  TimelineActor,
} from "./timeline.types"
```

### Step 4: Write tests

**File:** `src/components/timeline/__tests__/timeline.test.tsx`

Tests to write:

1. **"renders timeline items with titles"** — pass items array, assert each item's title appears.
2. **"renders item descriptions"** — pass items with descriptions, assert description text appears.
3. **"renders item timestamps"** — pass items with timestamps, assert formatted time text appears.
4. **"renders actor names"** — pass items with actors, assert actor name text appears.
5. **"renders empty message when items array is empty"** — pass empty items array, assert default "No activity yet" message appears.
6. **"renders custom empty message"** — pass `emptyMessage="Nothing here"` with empty items, assert custom message appears.
7. **"renders loading skeletons when isLoading is true"** — pass `isLoading: true`, assert skeleton elements are present and no item titles appear.
8. **"limits displayed items when maxItems is set"** — pass 5 items with `maxItems={3}`, assert only the first 3 titles appear.
9. **"renders Show more button when items exceed maxItems"** — pass 5 items with `maxItems={3}`, assert "Show more" button appears.
10. **"calls onShowMore when Show more button is clicked"** — pass `onShowMore` as `vi.fn()`, click "Show more", assert it was called.
11. **"does not render Show more button when items are within maxItems"** — pass 2 items with `maxItems={5}`, assert no "Show more" button.
12. **"renders without optional props"** — pass only required `items`, assert it renders without errors.
13. **"renders items in provided order"** — pass items in a specific order, assert the DOM order matches (first item's title comes before second item's title).
14. **"applies variant colors to timeline markers"** — pass items with different variants, assert the marker elements have variant-appropriate classes via closest container or data attributes.

---

## Task 4: MetricsDashboard

Grid layout that renders analytics widget definitions as a responsive dashboard. KPI widgets use the existing `StatCard` component. Chart widgets render as labeled placeholder containers (chart library integration is separate).

### Files

- Create: `src/components/metrics-dashboard/metrics-dashboard.types.ts`
- Create: `src/components/metrics-dashboard/metrics-dashboard.tsx`
- Create: `src/components/metrics-dashboard/__tests__/metrics-dashboard.test.tsx`
- Create: `src/components/metrics-dashboard/index.ts`

### Step 1: Create the type definitions

**File:** `src/components/metrics-dashboard/metrics-dashboard.types.ts`

```typescript
import type { LucideIcon } from "lucide-react"

// ---------------------------------------------------------------------------
// Widget size
// ---------------------------------------------------------------------------

/**
 * Grid size for a dashboard widget.
 * The format is "columns x rows" relative to the grid.
 * - "1x1" = 1 column, 1 row (standard card)
 * - "2x1" = 2 columns, 1 row (wide card)
 * - "1x2" = 1 column, 2 rows (tall card)
 * - "2x2" = 2 columns, 2 rows (large card)
 */
export type MetricsWidgetSize = "1x1" | "2x1" | "2x2" | "1x2"

// ---------------------------------------------------------------------------
// Widget types
// ---------------------------------------------------------------------------

/**
 * The type of visualization a widget renders.
 * - "kpi" renders a StatCard with value, trend, and icon
 * - "line", "bar", "donut" render chart placeholder containers
 * - "table" renders a mini data table placeholder
 */
export type MetricsWidgetType = "kpi" | "line" | "bar" | "donut" | "table"

// ---------------------------------------------------------------------------
// KPI widget data
// ---------------------------------------------------------------------------

/**
 * Data structure for a KPI widget. Passed directly to StatCard.
 */
export interface MetricsKpiData {
  /** The primary metric value (e.g. "1,234" or "£5,600"). */
  value: string | number
  /** Optional trend percentage (positive = up, negative = down). */
  trend?: number
  /** Optional trend comparison label (e.g. "vs last month"). */
  trendLabel?: string
  /** Optional icon for the stat card. */
  icon?: LucideIcon
  /** Optional secondary description text. */
  description?: string
}

// ---------------------------------------------------------------------------
// Chart widget data
// ---------------------------------------------------------------------------

/**
 * Data structure for chart widgets (line, bar, donut).
 * The MetricsDashboard does NOT render charts itself — it provides a labeled container.
 * The `data` field holds the raw data that a chart rendering layer would consume.
 */
export interface MetricsChartData {
  /** Raw chart data. Structure depends on the chart library used downstream. */
  points: unknown[]
}

// ---------------------------------------------------------------------------
// Table widget data
// ---------------------------------------------------------------------------

/**
 * Data structure for a mini table widget.
 * The MetricsDashboard renders a simple table with headers and rows.
 */
export interface MetricsTableData {
  /** Column headers. */
  headers: string[]
  /** Row data. Each row is an array of string values matching the headers. */
  rows: string[][]
}

// ---------------------------------------------------------------------------
// Widget definition
// ---------------------------------------------------------------------------

/**
 * A single widget in the metrics dashboard.
 */
export interface MetricsWidget {
  /** Unique identifier for the widget. */
  id: string
  /** Widget visualization type. */
  type: MetricsWidgetType
  /** Display label rendered as the widget title. */
  label: string
  /** Grid size determining how many columns and rows the widget spans. */
  size: MetricsWidgetSize
  /** Widget data. Structure depends on `type`:
   * - "kpi": MetricsKpiData
   * - "line" | "bar" | "donut": MetricsChartData
   * - "table": MetricsTableData
   */
  data: MetricsKpiData | MetricsChartData | MetricsTableData
  /** Whether this individual widget is in a loading state. */
  isLoading?: boolean
}

// ---------------------------------------------------------------------------
// Main props
// ---------------------------------------------------------------------------

/**
 * Props for the MetricsDashboard component.
 * Renders a responsive CSS Grid of analytics widgets. KPI widgets use StatCard,
 * chart widgets render labeled containers, and the grid layout is driven by widget `size`.
 *
 * @example
 * ```tsx
 * <MetricsDashboard
 *   widgets={[
 *     { id: "total-bookings", type: "kpi", label: "Total Bookings", size: "1x1",
 *       data: { value: "1,234", trend: 12.5, trendLabel: "vs last month", icon: Calendar } },
 *     { id: "revenue", type: "kpi", label: "Revenue", size: "1x1",
 *       data: { value: "£24,500", trend: 8.2, icon: DollarSign } },
 *     { id: "bookings-chart", type: "line", label: "Bookings Over Time", size: "2x1",
 *       data: { points: [...] } },
 *     { id: "top-services", type: "table", label: "Top Services", size: "1x2",
 *       data: { headers: ["Service", "Count"], rows: [["Haircut", "45"], ["Color", "32"]] } },
 *   ]}
 *   columns={4}
 * />
 * ```
 */
export interface MetricsDashboardProps {
  /** Array of widget configurations to render in the dashboard grid. */
  widgets: MetricsWidget[]
  /** Number of grid columns at the largest breakpoint. Defaults to 4. Responsive breakpoints: 1 col on mobile, 2 on md, `columns` on lg. */
  columns?: number
  /** Additional CSS class name applied to the root grid container. */
  className?: string
}
```

### Step 2: Implement the component

**File:** `src/components/metrics-dashboard/metrics-dashboard.tsx`

**Layout:**

1. **Root container** — `<div>` with CSS Grid:
   ```
   grid grid-cols-1 md:grid-cols-2 lg:grid-cols-{columns} gap-4
   ```
   The `columns` prop (default 4) sets the `lg` breakpoint column count. Use inline `style={{ gridTemplateColumns }}` for the `lg` breakpoint since Tailwind cannot dynamically interpolate class values, or use a fixed set of supported values (2, 3, 4, 6) mapped to Tailwind classes:
   - 2 → `lg:grid-cols-2`
   - 3 → `lg:grid-cols-3`
   - 4 → `lg:grid-cols-4`
   - 6 → `lg:grid-cols-6`

2. **Widget grid placement** — each widget `<div>` gets `gridColumn` and `gridRow` span styles based on `size`:
   - `"1x1"` → `col-span-1 row-span-1`
   - `"2x1"` → `col-span-1 md:col-span-2 row-span-1`
   - `"1x2"` → `col-span-1 row-span-2`
   - `"2x2"` → `col-span-1 md:col-span-2 row-span-2`

3. **KPI widget rendering** — when `type === "kpi"`:
   - Render the `StatCard` component from `@/components/stat-card`, passing `data` fields:
     - `label` = widget `label`
     - `value` = `data.value`
     - `trend` = `data.trend`
     - `trendLabel` = `data.trendLabel`
     - `icon` = `data.icon`
     - `description` = `data.description`
     - `isLoading` = widget `isLoading`
   - StatCard is already wrapped in a Card, so no additional wrapper needed.

4. **Chart widget rendering** — when `type === "line" | "bar" | "donut"`:
   - Render a `Card` with `CardHeader` containing the widget `label` as `CardTitle`.
   - `CardContent` contains a placeholder `<div>` with:
     - `flex items-center justify-center` for centering
     - Minimum height based on row span: `min-h-[200px]` for 1-row, `min-h-[440px]` for 2-row
     - `text-sm text-muted-foreground` placeholder text: "{type} chart" (e.g. "Line chart")
     - `data-chart-type={type}` and `data-widget-id={id}` attributes for downstream chart library to target
   - If `isLoading`, show `Skeleton` in place of the chart area.

5. **Table widget rendering** — when `type === "table"`:
   - Render a `Card` with `CardHeader` containing the widget `label` as `CardTitle`.
   - `CardContent` contains a simple HTML `<table>` with:
     - `<thead>` row from `data.headers`
     - `<tbody>` rows from `data.rows`
     - Styled with `text-sm` and standard table spacing
   - If `isLoading`, show `Skeleton` rows.

**shadcn/ui primitives used:** `Card`, `CardHeader`, `CardTitle`, `CardContent`, `Skeleton`

**Internal imports:** `StatCard` from `@/components/stat-card`

**Additional imports:** `cn` from `@/lib/utils`

### Step 3: Create the barrel export

**File:** `src/components/metrics-dashboard/index.ts`

```typescript
export { MetricsDashboard } from "./metrics-dashboard"
export type {
  MetricsDashboardProps,
  MetricsWidget,
  MetricsWidgetSize,
  MetricsWidgetType,
  MetricsKpiData,
  MetricsChartData,
  MetricsTableData,
} from "./metrics-dashboard.types"
```

### Step 4: Write tests

**File:** `src/components/metrics-dashboard/__tests__/metrics-dashboard.test.tsx`

Tests to write:

1. **"renders KPI widgets using StatCard"** — pass a KPI widget, assert the label and value appear in the document.
2. **"renders KPI widget trend data"** — pass a KPI widget with trend, assert the trend percentage appears.
3. **"renders chart widget with label"** — pass a line chart widget, assert the widget label appears as a heading.
4. **"renders chart placeholder with correct type"** — pass a bar chart widget, assert a container with `data-chart-type="bar"` is present.
5. **"renders table widget with headers and rows"** — pass a table widget with headers and row data, assert headers and cell values appear.
6. **"renders multiple widgets in a grid"** — pass 4 widgets, assert all 4 labels appear in the document.
7. **"applies correct grid span classes for 2x1 size"** — pass a widget with `size="2x1"`, assert its container has the `md:col-span-2` class.
8. **"applies correct grid span classes for 1x2 size"** — pass a widget with `size="1x2"`, assert its container has the `row-span-2` class.
9. **"applies correct grid span classes for 2x2 size"** — pass a widget with `size="2x2"`, assert its container has both `md:col-span-2` and `row-span-2` classes.
10. **"renders loading skeleton for KPI widget"** — pass a KPI widget with `isLoading: true`, assert the value text does NOT appear and a skeleton element is present.
11. **"renders loading skeleton for chart widget"** — pass a chart widget with `isLoading: true`, assert a skeleton element is present inside the card.
12. **"renders with default 4 columns"** — render without `columns` prop, assert the grid container has the `lg:grid-cols-4` class.
13. **"renders with custom column count"** — pass `columns={3}`, assert the grid container has the `lg:grid-cols-3` class.
14. **"renders empty grid when no widgets are provided"** — pass empty `widgets` array, assert the grid container is rendered but empty.
15. **"applies custom className to root container"** — pass `className="my-custom"`, assert the root element has the class.

---

## Implementation Order

The four components can be implemented in parallel since they have no dependencies on each other, except MetricsDashboard depends on StatCard (already complete from Phase 1).

Recommended sequencing if implementing serially:

| Order | Component | Estimated Complexity | Why |
|-------|-----------|---------------------|-----|
| 1 | Timeline | Low | Simplest component, no form logic or validation |
| 2 | MetricsDashboard | Low-Medium | Mostly layout + StatCard composition |
| 3 | EntityDetail | Medium | Multiple sub-sections, tab integration |
| 4 | EntityForm | High | Field rendering, validation, controlled inputs |

**Total new files:** 16 (4 types + 4 components + 4 test files + 4 barrel exports)

**Total estimated tests:** 65 (14 + 22 + 14 + 15)
