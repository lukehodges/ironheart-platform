# Frontend Patterns

## tRPC Client Usage

The tRPC React client is exported as `api` from `@/lib/trpc/react`:

```typescript
'use client'
import { api } from '@/lib/trpc/react'

// Query
const { data, isLoading, error } = api.loyalty.getProgram.useQuery()

// Query with input
const { data } = api.loyalty.getBalance.useQuery(
  { customerId: 'abc' },
  { enabled: !!customerId }  // Conditional fetching
)

// Mutation
const utils = api.useUtils()
const createMutation = api.loyalty.createProgram.useMutation({
  onSuccess: () => {
    toast.success('Program created')
    utils.loyalty.getProgram.invalidate()  // Refetch queries
  },
  onError: (error) => {
    toast.error(error.message)
  },
})

// Calling the mutation
createMutation.mutate({ name: 'Gold', pointsPerBooking: 10 })
```

**Import rule:** Always import from `@/lib/trpc/react`, never from `@/lib/trpc/client`.

## Admin page structure

```typescript
// src/app/admin/{module}/page.tsx
'use client'

import { useState } from 'react'
import { api } from '@/lib/trpc/react'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { toast } from 'sonner'

export default function LoyaltyPage() {
  const { data, isLoading } = api.loyalty.getProgram.useQuery()

  if (isLoading) return <LoyaltyPageSkeleton />

  if (!data) {
    return (
      <EmptyState
        icon={Gift}
        title="No loyalty program"
        description="Create a loyalty program to reward your customers."
        action={<Button>Create Program</Button>}
      />
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Loyalty"
        description="Manage your loyalty program"
        actions={<Button>Edit Program</Button>}
      />
      {/* Content */}
    </div>
  )
}
```

## Component conventions

- **Loading states:** Every async page has a matching `Skeleton` component
- **Empty states:** Every list/table uses the `EmptyState` component
- **Error handling:** All errors go through `sonner` toast — **never use `alert()`**
- **Optimistic updates:** Status changes, toggles — update UI before server confirms, revert on error
- **Dark mode:** All screens must work in both modes. Use design tokens, never hardcode colors
- **Mobile:** Admin screens must work at 390px minimum
- **Density:** Enterprise density — `text-sm` for body, `text-xs` for metadata
- **Accessibility:** WCAG 2.1 AA — keyboard navigation, aria attributes, visible focus rings

## Table pattern (data table)

Follow the shadcn data-table pattern with TanStack Table:

```typescript
// Server-side filtering
const { data, isLoading } = api.module.list.useQuery({
  status: filter.status,
  search: debouncedSearch,
  limit: 50,
  cursor: cursor,
})

// Pagination with cursor
const hasMore = data?.hasMore ?? false
```

## Dialog/Sheet pattern

```typescript
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'

<Sheet open={!!selected} onOpenChange={() => setSelected(null)}>
  <SheetContent side="right" className="w-[500px]">
    <SheetHeader>
      <SheetTitle>Detail View</SheetTitle>
    </SheetHeader>
    {/* Content */}
  </SheetContent>
</Sheet>
```

## Form pattern

Use `react-hook-form` with Zod resolver:

```typescript
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createProgramSchema } from '@/modules/loyalty/loyalty.schemas'

const form = useForm({
  resolver: zodResolver(createProgramSchema),
  defaultValues: { name: '', pointsPerBooking: 1 },
})
```

## Providers

The app wraps all pages with these providers (in `src/app/layout.tsx`):

```
ThemeProvider (next-themes)
  └── TRPCReactProvider
        └── Toaster (sonner)
              └── CommandPaletteProvider
```

## Styling

- **Tailwind CSS 4** with `@theme inline` for design tokens
- **`cn()` utility** from `@/lib/utils` for class merging (clsx + tailwind-merge)
- **CSS custom properties** for light/dark/sidebar themes
- **No CSS modules** — Tailwind only (exception: FullCalendar overrides in `calendar.css`)
