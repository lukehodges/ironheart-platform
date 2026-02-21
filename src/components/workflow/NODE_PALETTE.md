# NodePalette Component

A draggable library of workflow node templates organized by category for the Phase 7D Workflow Builder.

## Overview

The `NodePalette` component provides a user-friendly interface for discovering and selecting workflow nodes to add to a canvas. It features:

- **Collapsible Categories** — Trigger, Actions, Control Flow, and Transform
- **Draggable Nodes** — Drag-and-drop templates to a workflow canvas
- **Search & Filter** — Find nodes by name, type, or description
- **Hover Tooltips** — Detailed descriptions on hover
- **Scrollable List** — Handles many nodes without overflow
- **Empty State** — User-friendly messaging when no results match

## Usage

### Basic Example

```tsx
import { NodePalette } from '@/components/workflow'

export function WorkflowBuilder() {
  const handleNodeDragStart = (
    event: React.DragEvent,
    nodeType: string,
    defaultConfig: Record<string, unknown>
  ) => {
    // Handle the dragged node
    console.log(`Dragging ${nodeType}`, defaultConfig)
  }

  return (
    <div className="flex">
      <NodePalette onNodeDragStart={handleNodeDragStart} />
      {/* Rest of your canvas goes here */}
    </div>
  )
}
```

### Integration with React Flow Canvas

```tsx
import { useCallback } from 'react'
import { NodePalette } from '@/components/workflow'

export function WorkflowCanvas() {
  const [nodes, setNodes] = useNodesState([])

  const handleNodeDragStart = useCallback(
    (event: React.DragEvent, nodeType: string, defaultConfig: Record<string, unknown>) => {
      // Store drag data
      event.dataTransfer.effectAllowed = 'copy'
      event.dataTransfer.setData('application/json', JSON.stringify({ nodeType, defaultConfig }))
    },
    []
  )

  const onDragOver = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.dataTransfer!.dropEffect = 'copy'
  }, [])

  const onDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault()
      const data = JSON.parse(e.dataTransfer!.getData('application/json'))
      const position = {
        x: e.clientX,
        y: e.clientY,
      }

      const newNode = {
        id: `node-${Date.now()}`,
        type: data.nodeType,
        position,
        data: data.defaultConfig,
      }

      setNodes((nds) => [...nds, newNode])
    },
    [setNodes]
  )

  return (
    <div className="flex h-screen">
      <NodePalette onNodeDragStart={handleNodeDragStart} />
      <div
        className="flex-1"
        onDragOver={onDragOver}
        onDrop={onDrop}
      >
        {/* React Flow canvas here */}
      </div>
    </div>
  )
}
```

## Props

### `NodePaletteProps`

```typescript
interface NodePaletteProps {
  onNodeDragStart: (
    event: React.DragEvent,
    nodeType: string,
    defaultConfig: Record<string, unknown>
  ) => void
}
```

- **onNodeDragStart** — Callback fired when a node template is dragged
  - `event` — The native drag event
  - `nodeType` — The type of node being dragged (e.g., 'SEND_EMAIL', 'IF')
  - `defaultConfig` — The default configuration object for the node type

## Node Categories

### Trigger (1 node)
- **Trigger** — Event that starts the workflow

### Actions (7 nodes)
- **Send Email** — Send an email to customer or staff
- **Send SMS** — Send a text message
- **Webhook** — Call an external API endpoint
- **Create Booking** — Create a new booking
- **Update Booking** — Modify an existing booking
- **Send Notification** — Send in-app or push notification
- **Log Message** — Write to workflow log

### Control Flow (8 nodes)
- **If/Else** — Branch based on a condition
- **Switch** — Branch based on multiple cases
- **Loop** — Repeat steps for each item in a collection
- **Wait Until** — Pause until a condition is met
- **Wait for Event** — Pause and wait for a specific event
- **Merge** — Combine multiple branches back together
- **Stop** — End the workflow execution
- **Error Handler** — Catch and handle errors

### Transform (4 nodes)
- **Set Variable** — Create or update a workflow variable
- **Filter** — Filter items based on conditions
- **Transform** — Transform data using expressions
- **Execute Workflow** — Run another workflow as a sub-process

## Features

### Search & Filtering

Users can search nodes by:
- **Name** — e.g., "Send Email"
- **Type** — e.g., "SEND_EMAIL"
- **Description** — e.g., "send" or "email"

Search is case-insensitive and matches partial strings.

```tsx
// Type "send" to see Send Email, Send SMS, Send Notification
// Type "branch" to see If/Else, Switch
// Type "webhook" to see the Webhook node
```

### Category Expansion

Categories are collapsible to reduce visual clutter:
- **Trigger** — Expanded by default
- **Actions** — Expanded by default
- **Control Flow** — Collapsed by default
- **Transform** — Collapsed by default

Click the category header to toggle expansion.

### Drag and Drop

Each node template can be dragged to add it to the canvas:

1. Click and hold on a node
2. Drag it over your canvas
3. Drop it to create a new node instance

The component automatically sets the correct drag data format for React Flow integration.

### Tooltips

Hover over any node to see:
- Node label (e.g., "Send Email")
- Node description (e.g., "Send an email to a customer or staff member")

Tooltips appear after a 200ms delay to avoid flickering.

## Styling

The component uses Tailwind CSS and follows the design system from Phase 7A:

- **Background** — `bg-background`
- **Text** — `text-foreground` with muted variants
- **Interactive** — `hover:bg-accent` for category headers
- **Nodes** — `bg-secondary/50 hover:bg-secondary` for draggable items
- **Search** — Full-width input with placeholder text and search icon
- **Scrolling** — ScrollArea component for smooth scrolling on all platforms

### Dark Mode

The component automatically respects dark/light mode preferences via CSS custom properties.

## Testing

The component has comprehensive test coverage:

```bash
npm test -- src/components/workflow/__tests__/node-palette.test.tsx
```

Tests cover:
- Rendering and visibility
- Category expansion/collapse
- Search and filtering
- Drag-start behavior
- Empty states
- Tooltip functionality
- State persistence across searches

## Accessibility

- **Keyboard Navigation** — Collapsible headers can be toggled with Enter/Space
- **ARIA Labels** — Proper `aria-expanded` and `aria-controls` attributes
- **Focus Management** — Visible focus indicators on interactive elements
- **Semantic HTML** — Proper button and heading elements

## Performance

- **Memoized Search** — Filtering is debounced with `useMemo`
- **Lazy Rendering** — Only visible nodes are rendered via `ScrollArea`
- **Minimal Rerender** — Component uses local state for UI-only changes
- **Icon Map** — Icons are pre-cached to avoid recreating them

## Architecture Details

### Node Templates Structure

Each node template includes:

```typescript
{
  type: 'SEND_EMAIL',           // Matches backend node type
  label: 'Send Email',           // Display name
  icon: 'Mail',                  // Lucide icon name
  description: '...',            // Hover description
  defaultConfig: {
    templateId: '',
    to: '',
    subject: '',
    variables: {},
  }
}
```

The `defaultConfig` is used to initialize the node when dropped on the canvas.

### Category Organization

Categories are defined in `NODE_TEMPLATES` object:

```typescript
const NODE_TEMPLATES: Record<string, WorkflowNodeTemplate[]> = {
  trigger: [/* trigger nodes */],
  action: [/* action nodes */],
  control: [/* control flow nodes */],
  transform: [/* transform nodes */],
}
```

Default expansion state is maintained in component state.

### Icon System

Icons are imported from `lucide-react` and mapped by name:

```typescript
const ICON_MAP: Record<string, React.ComponentType> = {
  Zap, Mail, MessageSquare, Webhook, GitBranch, /* ... */
}
```

This allows adding new icons without modifying the template structure.

## Future Enhancements

1. **Custom Node Types** — Allow plugins to register custom node types
2. **Node Categories** — User-definable grouping of nodes
3. **Favorites** — Frequent nodes at the top
4. **Keyboard Shortcuts** — Quick-add for common nodes
5. **Tooltips with Examples** — Show sample configurations
6. **Analytics** — Track which nodes are most used

## Related Components

- `WorkflowCanvas` — React Flow canvas for visual workflow editing
- `NodeConfigPanel` — Configuration panel for selected nodes
- `WorkflowToolbar` — Top toolbar with save, activate, validation

## Files

- `/src/components/workflow/node-palette.tsx` — Main component
- `/src/components/workflow/__tests__/node-palette.test.tsx` — Test suite
- `/src/types/workflow-builder.ts` — Type definitions
