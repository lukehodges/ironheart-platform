# ChangeDiff Component

A versatile React component for displaying before/after comparisons of field changes, commonly used in audit logs and activity feeds.

## Features

- **Side-by-side layout** on desktop, stacked on mobile
- **Color coding**: Red badges for removed values, green badges for added values
- **Multiple value type support**: strings, numbers, booleans, objects, arrays, null, undefined
- **JSON formatting** with syntax highlighting for complex types (objects/arrays)
- **Field-by-field comparison** in a clean table/grid layout
- **Expand/collapse functionality** to toggle visibility of changes
- **Empty state** when no changes are provided
- **Keyboard accessible** with proper ARIA labels

## Basic Usage

```tsx
import { ChangeDiff } from "@/components/audit"

export function AuditEntry() {
  const changes = [
    {
      field: "status",
      before: "pending",
      after: "confirmed",
    },
    {
      field: "notes",
      before: "Old notes here",
      after: "Updated notes",
    },
  ]

  return <ChangeDiff changes={changes} />
}
```

## With Expand/Collapse

```tsx
import { useState } from "react"
import { ChangeDiff } from "@/components/audit"

export function CollapsibleChanges() {
  const [isExpanded, setIsExpanded] = useState(true)

  const changes = [
    { field: "amount", before: 100, after: 150 },
    { field: "description", before: "old", after: "new" },
  ]

  return (
    <ChangeDiff
      changes={changes}
      isExpanded={isExpanded}
      onExpandChange={setIsExpanded}
    />
  )
}
```

## Complex Object Changes

```tsx
const changes = [
  {
    field: "customer_config",
    before: {
      preferences: { notifications: true, newsletter: false },
      settings: { theme: "light" },
    },
    after: {
      preferences: { notifications: true, newsletter: true },
      settings: { theme: "dark", language: "es" },
    },
  },
  {
    field: "tags",
    before: ["vip", "verified"],
    after: ["vip", "verified", "premium"],
  },
]

export function ComplexChanges() {
  return <ChangeDiff changes={changes} />
}
```

## Data Types Support

### Strings

```tsx
const changes = [
  { field: "name", before: "John", after: "Jane" }
]
```

### Numbers

```tsx
const changes = [
  { field: "amount", before: 100.50, after: 250.00 }
]
```

### Booleans

```tsx
const changes = [
  { field: "is_active", before: false, after: true }
]
```

### Objects

```tsx
const changes = [
  {
    field: "metadata",
    before: { key: "value" },
    after: { key: "new_value", extra: "data" }
  }
]
```

### Arrays

```tsx
const changes = [
  {
    field: "items",
    before: ["a", "b"],
    after: ["a", "b", "c"]
  }
]
```

### Null/Undefined

```tsx
const changes = [
  { field: "deleted_field", before: "value", after: undefined },
  { field: "new_field", before: null, after: "value" }
]
```

## Props

### `changes` (required)

Array of change objects to display.

```tsx
interface Change {
  field: string      // Name of the field that changed
  before: unknown    // Previous value (any type)
  after: unknown     // New value (any type)
}
```

### `isExpanded` (optional)

Whether the diff content is visible. Defaults to `true`.

```tsx
<ChangeDiff changes={changes} isExpanded={false} />
```

When `false`, shows a summary message like "3 fields changed" instead of the detailed diff.

### `onExpandChange` (optional)

Callback function invoked when the user clicks the expand/collapse button.

```tsx
const handleExpandChange = (expanded: boolean) => {
  console.log("Expanded:", expanded)
}

<ChangeDiff
  changes={changes}
  isExpanded={isExpanded}
  onExpandChange={handleExpandChange}
/>
```

## Styling

The component uses Tailwind CSS and shadcn/ui components:

- **Card**: Bordered container with rounded corners
- **Badge**: Color-coded indicators (destructive=red, success=green)
- **Text**: Uses design system colors (foreground, muted-foreground, etc.)

### Colors

- **Before value**: Shown with "Removed" badge (red/destructive)
- **After value**: Shown with "Added" badge (green/success)
- **Headers**: Muted gray background
- **JSON**: Code blocks with monospace font and scrollable overflow

## Responsive Behavior

### Desktop (768px+)

- Side-by-side layout with "Before" and "After" in two columns
- Full width for complex values
- JSON code blocks with scroll on overflow

### Mobile (<768px)

- Stacked layout with "Before" and "After" sections vertically
- Full width text with word wrapping
- JSON code blocks scroll horizontally if needed

## Edge Cases

### Empty Changes

```tsx
<ChangeDiff changes={[]} />
// Displays: "No changes to display"
```

### Null/Undefined Values

- `null` displays as the string "null" (gray background)
- `undefined` displays as the string "undefined" (gray background)
- Component handles transitions from value → null/undefined

### Very Long Values

- Text wraps naturally with `break-words`
- JSON code blocks are scrollable
- Layout remains stable without breaking

### Circular References

The component safely handles circular object references with try-catch error handling in `JSON.stringify()`.

## Accessibility

- **Keyboard Navigation**: Tab to header, Enter/Space to toggle expand
- **ARIA Labels**: Buttons have descriptive `aria-label` attributes
- **Focus Visible**: Standard browser focus rings on interactive elements
- **Semantic HTML**: Uses button elements for interactivity

## Example in Audit Timeline

```tsx
import { ChangeDiff } from "@/components/audit"
import { formatDistanceToNow } from "date-fns"
import type { AuditLogEntry } from "@/types/audit-log"

interface AuditEntryProps {
  entry: AuditLogEntry
}

export function AuditTimelineEntry({ entry }: AuditEntryProps) {
  return (
    <div className="border-b pb-6">
      <div className="flex gap-3">
        <div className="flex-1">
          <p className="text-sm font-semibold">{entry.actor.name}</p>
          <p className="text-xs text-muted-foreground">
            {formatDistanceToNow(entry.timestamp, { addSuffix: true })}
          </p>
        </div>
        <Badge>{entry.action}</Badge>
      </div>

      <p className="mt-3 text-sm">
        {entry.action === "updated" && `Updated ${entry.resourceName}`}
      </p>

      {entry.changes && entry.changes.length > 0 && (
        <div className="mt-4">
          <ChangeDiff changes={entry.changes} />
        </div>
      )}
    </div>
  )
}
```

## Testing

The component includes comprehensive test coverage for:

- Rendering with and without changes
- Different data types (strings, numbers, booleans, objects, arrays, null/undefined)
- Expand/collapse functionality
- Keyboard navigation
- Accessibility features
- Edge cases (circular references, very long values, special characters)

Run tests with:

```bash
npm test src/components/audit/__tests__/change-diff.test.tsx
```
