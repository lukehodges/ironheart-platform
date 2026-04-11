# Admin Client Management Pages — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert all admin client management HTML mockups into production Next.js pages wired to the existing `clientPortal.admin.*` tRPC backend.

**Architecture:** 4 Next.js page routes under `/admin/clients/`, ~20 components in `src/components/clients/`, 6 dialog/sheet components for quick actions. All data fetching via tRPC React Query hooks. Milestone drag-and-drop via `@dnd-kit`. Currency stored as integer cents, displayed with GBP formatter.

**Tech Stack:** Next.js App Router, tRPC v11, React Query, shadcn/ui, @dnd-kit/core + @dnd-kit/sortable, Tailwind 4, sonner (toasts)

---

## File Structure

### Pages (4 routes)
- `src/app/admin/clients/page.tsx` — Engagement list with stats, search, filters, table
- `src/app/admin/clients/new/page.tsx` — Create engagement form
- `src/app/admin/clients/[engagementId]/page.tsx` — Tabbed engagement detail (6 tabs)
- `src/app/admin/clients/[engagementId]/proposals/new/page.tsx` — Create proposal builder

### Components (~20 files)
- `src/components/clients/engagement-stats-cards.tsx`
- `src/components/clients/engagement-filters.tsx`
- `src/components/clients/engagement-table.tsx`
- `src/components/clients/engagement-row.tsx`
- `src/components/clients/overview-tab.tsx`
- `src/components/clients/proposals-tab.tsx`
- `src/components/clients/milestones-tab.tsx`
- `src/components/clients/milestone-card.tsx`
- `src/components/clients/deliverables-tab.tsx`
- `src/components/clients/invoices-tab.tsx`
- `src/components/clients/approvals-tab.tsx`
- `src/components/clients/payment-timeline.tsx`
- `src/components/clients/proposal-form.tsx`
- `src/components/clients/deliverable-list-builder.tsx`
- `src/components/clients/payment-schedule-builder.tsx`
- `src/components/clients/create-invoice-dialog.tsx`
- `src/components/clients/share-deliverable-dialog.tsx`
- `src/components/clients/request-approval-dialog.tsx`
- `src/components/clients/mark-paid-dialog.tsx`
- `src/components/clients/add-milestone-dialog.tsx`
- `src/components/clients/edit-engagement-sheet.tsx`
- `src/components/clients/create-engagement-form.tsx`

### Shared Utility
- `src/lib/format-currency.ts` — GBP currency formatter

### Backend Changes
- Modify: `src/modules/client-portal/client-portal.repository.ts` — listEngagements customer join + searchCustomers
- Modify: `src/modules/client-portal/client-portal.service.ts` — searchCustomers passthrough
- Modify: `src/modules/client-portal/client-portal.router.ts` — searchCustomers procedure
- Modify: `src/modules/client-portal/client-portal.schemas.ts` — searchCustomers schema
- Modify: `src/modules/client-portal/client-portal.types.ts` — EngagementWithCustomer type

### Sidebar Nav
- Modify: `src/components/layout/sidebar-nav.tsx` — Add "Clients" nav item

---

## Task 0: Install @dnd-kit and add currency formatter

**Files:**
- Modify: `package.json`
- Create: `src/lib/format-currency.ts`

- [ ] **Step 1: Install @dnd-kit packages**

Run: `npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities`

- [ ] **Step 2: Create currency formatter utility**

```ts
// src/lib/format-currency.ts

const gbpFormatter = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
})

export function formatCurrency(amountInCents: number): string {
  return gbpFormatter.format(amountInCents / 100)
}

export function parseCurrencyInput(value: string): number {
  const stripped = value.replace(/[^0-9.]/g, "")
  const parsed = parseFloat(stripped)
  if (isNaN(parsed)) return 0
  return Math.round(parsed * 100)
}
```

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json src/lib/format-currency.ts
git commit -m "feat(clients): install @dnd-kit and add currency formatter"
```

---

## Task 1: Backend changes — listEngagements customer join + searchCustomers

**Files:**
- Modify: `src/modules/client-portal/client-portal.types.ts`
- Modify: `src/modules/client-portal/client-portal.schemas.ts`
- Modify: `src/modules/client-portal/client-portal.repository.ts`
- Modify: `src/modules/client-portal/client-portal.service.ts`
- Modify: `src/modules/client-portal/client-portal.router.ts`

- [ ] **Step 1: Add EngagementWithCustomer type**

In `src/modules/client-portal/client-portal.types.ts`, add after the `EngagementRecord` interface:

```ts
export interface EngagementWithCustomer extends EngagementRecord {
  customerName: string;
  customerEmail: string;
}
```

- [ ] **Step 2: Add searchCustomers schema**

In `src/modules/client-portal/client-portal.schemas.ts`, add after the `listEngagementsSchema`:

```ts
export const searchCustomersSchema = z.object({
  query: z.string().min(1),
  limit: z.number().int().max(20).default(10),
});
```

- [ ] **Step 3: Update listEngagements in repository to join customers**

In `src/modules/client-portal/client-portal.repository.ts`, replace the `listEngagements` method (lines 191-214) with:

```ts
  async listEngagements(
    tenantId: string,
    opts: { status?: string; type?: string; search?: string; limit: number; cursor?: string }
  ): Promise<{ rows: EngagementWithCustomer[]; hasMore: boolean }> {
    const conditions = [eq(engagements.tenantId, tenantId)];
    if (opts.status) conditions.push(eq(engagements.status, opts.status as any));
    if (opts.type) conditions.push(eq(engagements.type, opts.type as any));
    if (opts.search) {
      conditions.push(
        sql`(${ilike(engagements.title, `%${opts.search}%`)} OR ${ilike(customers.firstName, `%${opts.search}%`)} OR ${ilike(customers.lastName, `%${opts.search}%`)})`
      );
    }

    const rows = await db
      .select({
        engagement: engagements,
        customerFirstName: customers.firstName,
        customerLastName: customers.lastName,
        customerEmail: customers.email,
      })
      .from(engagements)
      .innerJoin(customers, eq(engagements.customerId, customers.id))
      .where(and(...conditions))
      .orderBy(desc(engagements.createdAt))
      .limit(opts.limit + 1);

    const hasMore = rows.length > opts.limit;
    const sliced = hasMore ? rows.slice(0, opts.limit) : rows;

    return {
      rows: sliced.map((r) => ({
        ...toEngagement(r.engagement),
        customerName: [r.customerFirstName, r.customerLastName].filter(Boolean).join(" "),
        customerEmail: r.customerEmail ?? "",
      })),
      hasMore,
    };
  },
```

Also add the `sql` import at the top of the file — add it to the existing drizzle-orm import:

```ts
import { eq, and, desc, ilike, sql } from "drizzle-orm";
```

And add `EngagementWithCustomer` to the type imports:

```ts
import type {
  EngagementRecord,
  EngagementWithCustomer,
  // ... rest of existing imports
} from "./client-portal.types";
```

- [ ] **Step 4: Add searchCustomers to repository**

In `src/modules/client-portal/client-portal.repository.ts`, add after `findCustomerByEmail`:

```ts
  async searchCustomers(
    tenantId: string,
    query: string,
    limit: number = 10
  ): Promise<{ id: string; firstName: string | null; lastName: string | null; email: string | null }[]> {
    const rows = await db
      .select({
        id: customers.id,
        firstName: customers.firstName,
        lastName: customers.lastName,
        email: customers.email,
      })
      .from(customers)
      .where(
        and(
          eq(customers.tenantId, tenantId),
          sql`(${ilike(customers.firstName, `%${query}%`)} OR ${ilike(customers.lastName, `%${query}%`)} OR ${ilike(customers.email, `%${query}%`)})`
        )
      )
      .orderBy(customers.lastName)
      .limit(limit);
    return rows;
  },
```

- [ ] **Step 5: Add searchCustomers to service**

In `src/modules/client-portal/client-portal.service.ts`, add a new method:

```ts
  async searchCustomers(ctx: { tenantId: string }, input: { query: string; limit: number }) {
    return clientPortalRepository.searchCustomers(ctx.tenantId, input.query, input.limit);
  },
```

- [ ] **Step 6: Add searchCustomers to router**

In `src/modules/client-portal/client-portal.router.ts`, add after the `updateEngagement` procedure inside `adminRouter`:

```ts
  searchCustomers: permissionProcedure("engagement:read")
    .input(searchCustomersSchema)
    .query(({ ctx, input }) => clientPortalService.searchCustomers(ctx, input)),
```

And add `searchCustomersSchema` to the imports from `./client-portal.schemas`.

- [ ] **Step 7: Commit**

```bash
git add src/modules/client-portal/
git commit -m "feat(clients): add customer join to listEngagements and searchCustomers endpoint"
```

---

## Task 2: Add "Clients" sidebar nav item

**Files:**
- Modify: `src/components/layout/sidebar-nav.tsx`

- [ ] **Step 1: Add Clients nav item to the static dashboard section**

In `src/components/layout/sidebar-nav.tsx`, find the `buildStaticDashboardSection` function and add a Clients item:

```ts
function buildStaticDashboardSection(): NavSection {
  return {
    items: [
      { title: "Dashboard", href: "/admin", icon: "LayoutDashboard" },
      { title: "Clients", href: "/admin/clients", icon: "Users" },
    ],
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/layout/sidebar-nav.tsx
git commit -m "feat(clients): add Clients nav item to admin sidebar"
```

---

## Task 3: Client list page — stats, filters, table

**Files:**
- Create: `src/components/clients/engagement-stats-cards.tsx`
- Create: `src/components/clients/engagement-filters.tsx`
- Create: `src/components/clients/engagement-table.tsx`
- Create: `src/components/clients/engagement-row.tsx`
- Create: `src/app/admin/clients/page.tsx`

- [ ] **Step 1: Create EngagementStatsCards**

```tsx
// src/components/clients/engagement-stats-cards.tsx
"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Activity, PoundSterling, FileText } from "lucide-react"
import { formatCurrency } from "@/lib/format-currency"
import type { EngagementWithCustomer } from "@/modules/client-portal/client-portal.types"

interface EngagementStatsCardsProps {
  engagements: EngagementWithCustomer[]
}

export function EngagementStatsCards({ engagements }: EngagementStatsCardsProps) {
  const active = engagements.filter((e) => e.status === "ACTIVE").length
  const projects = engagements.filter((e) => e.status === "ACTIVE" && e.type === "PROJECT").length
  const retainers = engagements.filter((e) => e.status === "ACTIVE" && e.type === "RETAINER").length
  const proposalsPending = engagements.filter((e) => e.status === "PROPOSED").length

  // Pipeline = sum of all non-completed/cancelled engagement values (we don't have value on engagement, so show count)
  // For now just show engagement counts since EngagementRecord doesn't have a value field

  return (
    <div className="grid grid-cols-3 gap-4">
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Active Engagements</p>
              <p className="text-3xl font-semibold tracking-tight text-primary mt-1">{active}</p>
            </div>
            <div className="rounded-lg bg-primary/10 p-2">
              <Activity className="h-5 w-5 text-primary" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {projects} project{projects !== 1 ? "s" : ""}, {retainers} retainer{retainers !== 1 ? "s" : ""}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Engagements</p>
              <p className="text-3xl font-semibold tracking-tight text-green-600 mt-1">{engagements.length}</p>
            </div>
            <div className="rounded-lg bg-green-600/10 p-2">
              <PoundSterling className="h-5 w-5 text-green-600" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Across all statuses
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Proposals Pending</p>
              <p className="text-3xl font-semibold tracking-tight text-orange-500 mt-1">{proposalsPending}</p>
            </div>
            <div className="rounded-lg bg-orange-500/10 p-2">
              <FileText className="h-5 w-5 text-orange-500" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Awaiting client review
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 2: Create EngagementFilters**

```tsx
// src/components/clients/engagement-filters.tsx
"use client"

import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import { cn } from "@/lib/utils"

const STATUS_OPTIONS = [
  { label: "All", value: undefined },
  { label: "Active", value: "ACTIVE" as const },
  { label: "Proposed", value: "PROPOSED" as const },
  { label: "Draft", value: "DRAFT" as const },
  { label: "Completed", value: "COMPLETED" as const },
]

interface EngagementFiltersProps {
  search: string
  onSearchChange: (value: string) => void
  status: string | undefined
  onStatusChange: (value: string | undefined) => void
}

export function EngagementFilters({
  search,
  onSearchChange,
  status,
  onStatusChange,
}: EngagementFiltersProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search clients or engagements..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 h-9"
        />
      </div>
      <div className="flex gap-1.5">
        {STATUS_OPTIONS.map((opt) => (
          <button
            key={opt.label}
            onClick={() => onStatusChange(opt.value)}
            className={cn(
              "inline-flex items-center rounded-md border px-3 h-9 text-xs font-semibold transition-colors",
              status === opt.value
                ? "bg-primary text-primary-foreground border-transparent shadow-sm"
                : "bg-background text-foreground border-input hover:bg-accent"
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create EngagementRow**

```tsx
// src/components/clients/engagement-row.tsx
"use client"

import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Eye, Pencil, Archive } from "lucide-react"
import { TableRow, TableCell } from "@/components/ui/table"
import type { EngagementWithCustomer } from "@/modules/client-portal/client-portal.types"

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  ACTIVE: "default",
  PROPOSED: "secondary",
  DRAFT: "outline",
  COMPLETED: "secondary",
  CANCELLED: "destructive",
}

function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diff = now.getTime() - new Date(date).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return days === 1 ? "Yesterday" : `${days} days ago`
  const weeks = Math.floor(days / 7)
  return weeks === 1 ? "1 week ago" : `${weeks} weeks ago`
}

interface EngagementRowProps {
  engagement: EngagementWithCustomer
}

export function EngagementRow({ engagement }: EngagementRowProps) {
  const router = useRouter()

  return (
    <TableRow
      className="cursor-pointer"
      onClick={() => router.push(`/admin/clients/${engagement.id}`)}
    >
      <TableCell className="font-medium">{engagement.customerName}</TableCell>
      <TableCell className="text-muted-foreground">{engagement.title}</TableCell>
      <TableCell>
        <Badge variant={engagement.type === "PROJECT" ? "default" : "outline"}>
          {engagement.type === "PROJECT" ? "Project" : "Retainer"}
        </Badge>
      </TableCell>
      <TableCell>
        <Badge variant={STATUS_VARIANT[engagement.status] ?? "secondary"}>
          {engagement.status.charAt(0) + engagement.status.slice(1).toLowerCase()}
        </Badge>
      </TableCell>
      <TableCell className="text-muted-foreground text-xs">
        {formatRelativeTime(engagement.updatedAt)}
      </TableCell>
      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => router.push(`/admin/clients/${engagement.id}`)}>
              <Eye className="mr-2 h-4 w-4" /> View
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push(`/admin/clients/${engagement.id}`)}>
              <Pencil className="mr-2 h-4 w-4" /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Archive className="mr-2 h-4 w-4" /> Archive
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  )
}
```

- [ ] **Step 4: Create EngagementTable**

```tsx
// src/components/clients/engagement-table.tsx
"use client"

import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { EngagementRow } from "./engagement-row"
import type { EngagementWithCustomer } from "@/modules/client-portal/client-portal.types"

interface EngagementTableProps {
  engagements: EngagementWithCustomer[]
  hasMore: boolean
  hasPrevious: boolean
  onNextPage: () => void
  onPreviousPage: () => void
  isLoading: boolean
}

export function EngagementTable({
  engagements,
  hasMore,
  hasPrevious,
  onNextPage,
  onPreviousPage,
  isLoading,
}: EngagementTableProps) {
  return (
    <div>
      <div className="rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[180px]">Client</TableHead>
              <TableHead>Engagement</TableHead>
              <TableHead className="w-[100px]">Type</TableHead>
              <TableHead className="w-[100px]">Status</TableHead>
              <TableHead className="w-[130px]">Last Activity</TableHead>
              <TableHead className="w-[48px]">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {engagements.map((e) => (
              <EngagementRow key={e.id} engagement={e} />
            ))}
            {engagements.length === 0 && !isLoading && (
              <TableRow>
                <TableHead colSpan={6} className="text-center py-8 text-muted-foreground">
                  No engagements found
                </TableHead>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
        <span>Showing {engagements.length} engagement{engagements.length !== 1 ? "s" : ""}</span>
        <div className="flex gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={!hasPrevious}
            onClick={onPreviousPage}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={!hasMore}
            onClick={onNextPage}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Create the client list page**

```tsx
// src/app/admin/clients/page.tsx
"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Plus } from "lucide-react"
import { PageHeader } from "@/components/ui/page-header"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { EngagementStatsCards } from "@/components/clients/engagement-stats-cards"
import { EngagementFilters } from "@/components/clients/engagement-filters"
import { EngagementTable } from "@/components/clients/engagement-table"
import { api } from "@/lib/trpc/react"
import { useDebounce } from "@/hooks/use-debounce"

const PAGE_SIZE = 25

export default function ClientsPage() {
  const router = useRouter()
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState<string | undefined>(undefined)
  const [cursorStack, setCursorStack] = useState<string[]>([])

  const debouncedSearch = useDebounce(search, 300)
  const currentCursor = cursorStack[cursorStack.length - 1]

  const { data, isLoading } = api.clientPortal.admin.listEngagements.useQuery({
    search: debouncedSearch || undefined,
    status: status as any,
    limit: PAGE_SIZE,
    cursor: currentCursor,
  })

  const engagements = data?.rows ?? []
  const hasMore = data?.hasMore ?? false

  const handleNextPage = useCallback(() => {
    if (engagements.length > 0) {
      setCursorStack((prev) => [...prev, engagements[engagements.length - 1]!.id])
    }
  }, [engagements])

  const handlePreviousPage = useCallback(() => {
    setCursorStack((prev) => prev.slice(0, -1))
  }, [])

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value)
    setCursorStack([])
  }, [])

  const handleStatusChange = useCallback((value: string | undefined) => {
    setStatus(value)
    setCursorStack([])
  }, [])

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Clients"
        description="Manage client engagements and proposals."
      >
        <Button size="sm" onClick={() => router.push("/admin/clients/new")}>
          <Plus className="h-4 w-4" />
          New Engagement
        </Button>
      </PageHeader>

      {isLoading ? (
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-[120px] rounded-xl" />
          ))}
        </div>
      ) : (
        <EngagementStatsCards engagements={engagements} />
      )}

      <EngagementFilters
        search={search}
        onSearchChange={handleSearchChange}
        status={status}
        onStatusChange={handleStatusChange}
      />

      {isLoading ? (
        <Skeleton className="h-[400px] rounded-xl" />
      ) : (
        <EngagementTable
          engagements={engagements}
          hasMore={hasMore}
          hasPrevious={cursorStack.length > 0}
          onNextPage={handleNextPage}
          onPreviousPage={handlePreviousPage}
          isLoading={isLoading}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 6: Commit**

```bash
git add src/components/clients/engagement-stats-cards.tsx src/components/clients/engagement-filters.tsx src/components/clients/engagement-table.tsx src/components/clients/engagement-row.tsx src/app/admin/clients/page.tsx
git commit -m "feat(clients): add client list page with stats, filters, and engagement table"
```

---

## Task 4: Engagement detail page shell + Overview tab

**Files:**
- Create: `src/components/clients/overview-tab.tsx`
- Create: `src/app/admin/clients/[engagementId]/page.tsx`

- [ ] **Step 1: Create OverviewTab**

```tsx
// src/components/clients/overview-tab.tsx
"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CreditCard, CloudDownload, CheckCircle, Plus, ChevronRight } from "lucide-react"
import { formatCurrency } from "@/lib/format-currency"
import type {
  EngagementRecord,
  ProposalRecord,
  MilestoneRecord,
  DeliverableRecord,
  PortalInvoiceRecord,
  ActivityItem,
} from "@/modules/client-portal/client-portal.types"

const ACTIVITY_DOT_COLOR: Record<string, string> = {
  proposal_sent: "bg-primary",
  proposal_approved: "bg-green-500",
  proposal_declined: "bg-red-500",
  milestone_started: "bg-primary",
  milestone_completed: "bg-green-500",
  deliverable_shared: "bg-primary",
  deliverable_accepted: "bg-green-500",
  approval_requested: "bg-orange-500",
  approval_responded: "bg-green-500",
  invoice_sent: "bg-orange-500",
  invoice_paid: "bg-green-500",
}

function formatDate(date: Date | null): string {
  if (!date) return "—"
  return new Date(date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
}

function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diff = now.getTime() - new Date(date).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days === 1) return "Yesterday"
  if (days < 7) return `${days} days ago`
  const weeks = Math.floor(days / 7)
  return weeks === 1 ? "1 week ago" : `${weeks} weeks ago`
}

interface OverviewTabProps {
  engagement: EngagementRecord
  proposals: ProposalRecord[]
  milestones: MilestoneRecord[]
  deliverables: DeliverableRecord[]
  invoices: PortalInvoiceRecord[]
  activity: ActivityItem[]
  onOpenDialog: (dialog: string) => void
}

export function OverviewTab({
  engagement,
  proposals,
  invoices,
  activity,
  onOpenDialog,
}: OverviewTabProps) {
  const currentProposal = proposals.find((p) => p.status === "APPROVED") ?? proposals[0]
  const totalPaid = invoices.filter((i) => i.status === "PAID").reduce((sum, i) => sum + i.amount, 0)
  const totalValue = currentProposal?.price ?? 0
  const outstanding = totalValue - totalPaid

  return (
    <div className="grid grid-cols-2 gap-4 mt-6">
      {/* Engagement Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Engagement Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-0">
          {[
            ["Type", engagement.type === "PROJECT" ? "Project (Fixed Price)" : "Retainer (Monthly)"],
            ["Start Date", formatDate(engagement.startDate)],
            ["Target Completion", formatDate(engagement.endDate)],
            ["Total Value", totalValue ? formatCurrency(totalValue) : "—"],
            ["Amount Paid", formatCurrency(totalPaid)],
            ["Outstanding", formatCurrency(outstanding)],
          ].map(([label, value], i) => (
            <div key={label} className="flex items-center justify-between py-2.5 border-b last:border-0">
              <span className="text-sm text-muted-foreground">{label}</span>
              <span className="text-sm font-medium tabular-nums">{value}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Quick Actions + Current Proposal */}
      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => onOpenDialog("createInvoice")}>
                <CreditCard className="h-3.5 w-3.5 mr-1.5" /> Send Invoice
              </Button>
              <Button variant="outline" size="sm" onClick={() => onOpenDialog("shareDeliverable")}>
                <CloudDownload className="h-3.5 w-3.5 mr-1.5" /> Share Deliverable
              </Button>
              <Button variant="outline" size="sm" onClick={() => onOpenDialog("requestApproval")}>
                <CheckCircle className="h-3.5 w-3.5 mr-1.5" /> Request Approval
              </Button>
              <Button variant="outline" size="sm" onClick={() => onOpenDialog("addMilestone")}>
                <Plus className="h-3.5 w-3.5 mr-1.5" /> Add Milestone
              </Button>
            </div>
          </CardContent>
        </Card>

        {currentProposal && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Current Proposal</CardTitle>
              {currentProposal.approvedAt && (
                <CardDescription>Accepted {formatDate(currentProposal.approvedAt)}</CardDescription>
              )}
            </CardHeader>
            <CardContent className="space-y-0">
              <div className="flex items-center justify-between py-2.5 border-b">
                <span className="text-sm text-muted-foreground">Scope</span>
                <span className="text-sm font-medium text-right max-w-[260px] truncate">{currentProposal.scope}</span>
              </div>
              <div className="flex items-center justify-between py-2.5 border-b">
                <span className="text-sm text-muted-foreground">Deliverables</span>
                <span className="text-sm font-medium">{currentProposal.deliverables.length} items</span>
              </div>
              <div className="flex items-center justify-between py-2.5">
                <span className="text-sm text-muted-foreground">Payment Schedule</span>
                <span className="text-sm font-medium">{currentProposal.paymentSchedule.length} milestones</span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Activity Feed */}
      <Card className="col-span-2">
        <CardHeader>
          <CardTitle className="text-sm">Recent Activity</CardTitle>
          <CardDescription>Latest updates on this engagement</CardDescription>
        </CardHeader>
        <CardContent>
          {activity.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No activity yet</p>
          ) : (
            <div className="space-y-0">
              {activity.slice(0, 10).map((item, i) => (
                <div key={i} className="flex items-start gap-3 py-3 border-b last:border-0">
                  <div className={`h-2 w-2 rounded-full mt-1.5 shrink-0 ${ACTIVITY_DOT_COLOR[item.type] ?? "bg-muted-foreground"}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">{item.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{formatRelativeTime(item.timestamp)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 2: Create engagement detail page**

```tsx
// src/app/admin/clients/[engagementId]/page.tsx
"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { ChevronLeft, Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { api } from "@/lib/trpc/react"
import { OverviewTab } from "@/components/clients/overview-tab"
import { ProposalsTab } from "@/components/clients/proposals-tab"
import { MilestonesTab } from "@/components/clients/milestones-tab"
import { DeliverablesTab } from "@/components/clients/deliverables-tab"
import { InvoicesTab } from "@/components/clients/invoices-tab"
import { ApprovalsTab } from "@/components/clients/approvals-tab"
import { EditEngagementSheet } from "@/components/clients/edit-engagement-sheet"
import { CreateInvoiceDialog } from "@/components/clients/create-invoice-dialog"
import { ShareDeliverableDialog } from "@/components/clients/share-deliverable-dialog"
import { RequestApprovalDialog } from "@/components/clients/request-approval-dialog"
import { MarkPaidDialog } from "@/components/clients/mark-paid-dialog"
import { AddMilestoneDialog } from "@/components/clients/add-milestone-dialog"

const TABS = ["Overview", "Proposals", "Milestones", "Deliverables", "Invoices", "Approvals"] as const
type Tab = (typeof TABS)[number]

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  ACTIVE: "default",
  PROPOSED: "secondary",
  DRAFT: "outline",
  COMPLETED: "secondary",
  CANCELLED: "destructive",
}

export default function EngagementDetailPage() {
  const params = useParams<{ engagementId: string }>()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<Tab>("Overview")
  const [openDialog, setOpenDialog] = useState<string | null>(null)
  const [markPaidInvoiceId, setMarkPaidInvoiceId] = useState<string | null>(null)

  const utils = api.useUtils()

  const { data, isLoading } = api.clientPortal.admin.getEngagement.useQuery({
    id: params.engagementId,
  })

  const invalidate = () => {
    void utils.clientPortal.admin.getEngagement.invalidate({ id: params.engagementId })
  }

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-[400px] w-full rounded-xl" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="space-y-4 animate-fade-in">
        <Link href="/admin/clients" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-3.5 w-3.5" /> Back to Clients
        </Link>
        <p className="text-muted-foreground">Engagement not found.</p>
      </div>
    )
  }

  const engagement = data
  const activity = (engagement as any).activity ?? []

  return (
    <div className="space-y-0 animate-fade-in">
      {/* Back link */}
      <Link href="/admin/clients" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-3.5 w-3.5" /> Back to Clients
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mt-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{engagement.title}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm text-muted-foreground">{(engagement as any).customerName ?? "Client"}</span>
            <span className="text-border">|</span>
            <Badge variant={engagement.type === "PROJECT" ? "default" : "outline"}>
              {engagement.type === "PROJECT" ? "Project" : "Retainer"}
            </Badge>
            <Badge variant={STATUS_VARIANT[engagement.status] ?? "secondary"}>
              {engagement.status.charAt(0) + engagement.status.slice(1).toLowerCase()}
            </Badge>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => setOpenDialog("editEngagement")}>
          <Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b mt-6">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-4 py-2.5 text-sm font-medium border-b-2 transition-colors",
              activeTab === tab
                ? "text-foreground border-primary"
                : "text-muted-foreground border-transparent hover:text-foreground"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "Overview" && (
        <OverviewTab
          engagement={engagement}
          proposals={engagement.proposals ?? []}
          milestones={engagement.milestones ?? []}
          deliverables={engagement.deliverables ?? []}
          invoices={engagement.invoices ?? []}
          activity={activity}
          onOpenDialog={setOpenDialog}
        />
      )}
      {activeTab === "Proposals" && (
        <ProposalsTab
          engagementId={engagement.id}
          proposals={engagement.proposals ?? []}
          onInvalidate={invalidate}
        />
      )}
      {activeTab === "Milestones" && (
        <MilestonesTab
          engagementId={engagement.id}
          milestones={engagement.milestones ?? []}
          deliverables={engagement.deliverables ?? []}
          onInvalidate={invalidate}
          onAddMilestone={() => setOpenDialog("addMilestone")}
        />
      )}
      {activeTab === "Deliverables" && (
        <DeliverablesTab
          deliverables={engagement.deliverables ?? []}
          milestones={engagement.milestones ?? []}
          onShareDeliverable={() => setOpenDialog("shareDeliverable")}
        />
      )}
      {activeTab === "Invoices" && (
        <InvoicesTab
          engagementId={engagement.id}
          invoices={engagement.invoices ?? []}
          proposals={engagement.proposals ?? []}
          onCreateInvoice={() => setOpenDialog("createInvoice")}
          onMarkPaid={(id) => { setMarkPaidInvoiceId(id); setOpenDialog("markPaid"); }}
          onInvalidate={invalidate}
        />
      )}
      {activeTab === "Approvals" && (
        <ApprovalsTab
          approvals={engagement.approvals ?? []}
          onRequestApproval={() => setOpenDialog("requestApproval")}
        />
      )}

      {/* Dialogs */}
      <EditEngagementSheet
        engagement={engagement}
        open={openDialog === "editEngagement"}
        onOpenChange={(open) => !open && setOpenDialog(null)}
        onSuccess={invalidate}
      />
      <CreateInvoiceDialog
        engagementId={engagement.id}
        milestones={engagement.milestones ?? []}
        open={openDialog === "createInvoice"}
        onOpenChange={(open) => !open && setOpenDialog(null)}
        onSuccess={invalidate}
      />
      <ShareDeliverableDialog
        engagementId={engagement.id}
        milestones={engagement.milestones ?? []}
        open={openDialog === "shareDeliverable"}
        onOpenChange={(open) => !open && setOpenDialog(null)}
        onSuccess={invalidate}
      />
      <RequestApprovalDialog
        engagementId={engagement.id}
        deliverables={engagement.deliverables ?? []}
        milestones={engagement.milestones ?? []}
        open={openDialog === "requestApproval"}
        onOpenChange={(open) => !open && setOpenDialog(null)}
        onSuccess={invalidate}
      />
      <MarkPaidDialog
        invoiceId={markPaidInvoiceId}
        open={openDialog === "markPaid"}
        onOpenChange={(open) => { if (!open) { setOpenDialog(null); setMarkPaidInvoiceId(null); } }}
        onSuccess={invalidate}
      />
      <AddMilestoneDialog
        engagementId={engagement.id}
        milestoneCount={engagement.milestones?.length ?? 0}
        open={openDialog === "addMilestone"}
        onOpenChange={(open) => !open && setOpenDialog(null)}
        onSuccess={invalidate}
      />
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/clients/overview-tab.tsx src/app/admin/clients/\[engagementId\]/page.tsx
git commit -m "feat(clients): add engagement detail page with overview tab"
```

---

## Task 5: Proposals tab

**Files:**
- Create: `src/components/clients/proposals-tab.tsx`

- [ ] **Step 1: Create ProposalsTab**

```tsx
// src/components/clients/proposals-tab.tsx
"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Plus, Send } from "lucide-react"
import { formatCurrency } from "@/lib/format-currency"
import { toast } from "sonner"
import { api } from "@/lib/trpc/react"
import type { ProposalRecord } from "@/modules/client-portal/client-portal.types"

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  DRAFT: "outline",
  SENT: "default",
  APPROVED: "default",
  DECLINED: "destructive",
  SUPERSEDED: "secondary",
}

function formatDate(date: Date | null): string {
  if (!date) return "—"
  return new Date(date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
}

interface ProposalsTabProps {
  engagementId: string
  proposals: ProposalRecord[]
  onInvalidate: () => void
}

export function ProposalsTab({ engagementId, proposals, onInvalidate }: ProposalsTabProps) {
  const router = useRouter()

  const sendMutation = api.clientPortal.admin.sendProposal.useMutation({
    onSuccess: () => {
      toast.success("Proposal sent to client")
      onInvalidate()
    },
    onError: (err) => toast.error(err.message),
  })

  return (
    <div className="mt-6 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {proposals.length} proposal{proposals.length !== 1 ? "s" : ""}
        </p>
        <Button size="sm" onClick={() => router.push(`/admin/clients/${engagementId}/proposals/new`)}>
          <Plus className="h-3.5 w-3.5 mr-1.5" /> New Proposal
        </Button>
      </div>

      {proposals.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No proposals yet. Create one to get started.
          </CardContent>
        </Card>
      ) : (
        proposals.map((proposal) => (
          <Card key={proposal.id}>
            <CardContent className="py-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant={STATUS_VARIANT[proposal.status] ?? "secondary"}>
                      {proposal.status.charAt(0) + proposal.status.slice(1).toLowerCase()}
                    </Badge>
                    <span className="text-sm font-medium">{formatCurrency(proposal.price)}</span>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">{proposal.scope}</p>
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <span>{proposal.deliverables.length} deliverable{proposal.deliverables.length !== 1 ? "s" : ""}</span>
                    <span>{proposal.paymentSchedule.length} payment{proposal.paymentSchedule.length !== 1 ? "s" : ""}</span>
                    {proposal.sentAt && <span>Sent {formatDate(proposal.sentAt)}</span>}
                  </div>
                </div>
                <div className="flex gap-2">
                  {proposal.status === "DRAFT" && (
                    <Button
                      variant="default"
                      size="sm"
                      disabled={sendMutation.isPending}
                      onClick={() => sendMutation.mutate({ proposalId: proposal.id })}
                    >
                      <Send className="h-3.5 w-3.5 mr-1.5" /> Send
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/clients/proposals-tab.tsx
git commit -m "feat(clients): add proposals tab component"
```

---

## Task 6: Milestones tab with drag-and-drop

**Files:**
- Create: `src/components/clients/milestone-card.tsx`
- Create: `src/components/clients/milestones-tab.tsx`

- [ ] **Step 1: Create MilestoneCard**

```tsx
// src/components/clients/milestone-card.tsx
"use client"

import { useState } from "react"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { GripVertical, ChevronRight, MoreHorizontal, Trash2, FileText, CreditCard } from "lucide-react"
import { cn } from "@/lib/utils"
import { formatCurrency } from "@/lib/format-currency"
import { api } from "@/lib/trpc/react"
import { toast } from "sonner"
import type { MilestoneRecord, DeliverableRecord, MilestoneStatus } from "@/modules/client-portal/client-portal.types"

const STATUS_CLASSES: Record<MilestoneStatus, string> = {
  UPCOMING: "bg-secondary text-secondary-foreground border-secondary",
  IN_PROGRESS: "bg-primary/10 text-primary border-primary/20",
  COMPLETED: "bg-green-500/10 text-green-600 border-green-500/20",
}

function formatDate(date: Date | null): string {
  if (!date) return ""
  return new Date(date).toISOString().split("T")[0]!
}

interface MilestoneCardProps {
  milestone: MilestoneRecord
  deliverables: DeliverableRecord[]
  isActive: boolean
  onInvalidate: () => void
}

export function MilestoneCard({ milestone, deliverables, isActive, onInvalidate }: MilestoneCardProps) {
  const [expanded, setExpanded] = useState(isActive)
  const [title, setTitle] = useState(milestone.title)

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: milestone.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const updateMutation = api.clientPortal.admin.updateMilestone.useMutation({
    onSuccess: () => onInvalidate(),
    onError: (err) => toast.error(err.message),
  })

  const handleStatusClick = (status: MilestoneStatus) => {
    updateMutation.mutate({
      id: milestone.id,
      status,
      ...(status === "COMPLETED" ? {} : {}),
    })
  }

  const handleTitleBlur = () => {
    if (title !== milestone.title && title.trim()) {
      updateMutation.mutate({ id: milestone.id, title: title.trim() })
    }
  }

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const date = e.target.value ? new Date(e.target.value) : null
    updateMutation.mutate({ id: milestone.id, dueDate: date })
  }

  const milestoneDeliverables = deliverables.filter((d) => d.milestoneId === milestone.id)

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "rounded-xl border bg-card shadow-sm transition-shadow hover:shadow-md",
        isActive && "border-primary/30"
      )}
    >
      <div className="flex items-center gap-4 px-5 py-4">
        {/* Drag handle */}
        <button
          className="flex flex-col gap-0.5 text-muted-foreground/50 hover:text-muted-foreground cursor-grab active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-5 w-5" />
        </button>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleTitleBlur}
              className="text-sm font-medium bg-transparent border-b border-dashed border-transparent hover:border-border focus:border-ring outline-none w-[300px]"
            />
            {isActive && <Badge variant="default" className="text-[10px]">Current</Badge>}
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <FileText className="h-3 w-3" />
              {milestoneDeliverables.length} deliverable{milestoneDeliverables.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-3 shrink-0">
          <input
            type="date"
            value={formatDate(milestone.dueDate)}
            onChange={handleDateChange}
            className="text-xs text-muted-foreground bg-transparent border border-transparent hover:border-border focus:border-ring rounded px-2 py-1 outline-none text-right w-[120px]"
          />

          {/* Status stepper */}
          <div className="flex gap-0.5">
            {(["UPCOMING", "IN_PROGRESS", "COMPLETED"] as MilestoneStatus[]).map((s) => (
              <button
                key={s}
                onClick={() => handleStatusClick(s)}
                className={cn(
                  "px-2.5 py-0.5 text-[10px] font-semibold border transition-colors",
                  s === "UPCOMING" && "rounded-l",
                  s === "COMPLETED" && "rounded-r",
                  milestone.status === s ? STATUS_CLASSES[s] : "bg-background text-muted-foreground border-border"
                )}
              >
                {s === "IN_PROGRESS" ? "In Progress" : s.charAt(0) + s.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          <button
            onClick={() => setExpanded(!expanded)}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronRight className={cn("h-4 w-4 transition-transform", expanded && "rotate-90")} />
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem className="text-destructive">
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Expanded deliverables */}
      {expanded && milestoneDeliverables.length > 0 && (
        <div className="border-t px-5 py-3 ml-9">
          {milestoneDeliverables.map((d) => (
            <div key={d.id} className="flex items-center gap-2.5 py-2 border-b last:border-0">
              <div
                className={cn(
                  "h-4.5 w-4.5 rounded border flex items-center justify-center shrink-0",
                  d.status === "ACCEPTED" || d.status === "DELIVERED"
                    ? "bg-green-500 border-green-500 text-white"
                    : "border-input"
                )}
              >
                {(d.status === "ACCEPTED" || d.status === "DELIVERED") && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                )}
              </div>
              <span className={cn("text-sm flex-1", (d.status === "ACCEPTED" || d.status === "DELIVERED") && "line-through text-muted-foreground")}>
                {d.title}
              </span>
              {d.status !== "PENDING" && (
                <Badge variant="default" className="text-[10px]">
                  {d.status === "ACCEPTED" ? "Approved" : "Delivered"}
                </Badge>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Create MilestonesTab**

```tsx
// src/components/clients/milestones-tab.tsx
"use client"

import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core"
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { api } from "@/lib/trpc/react"
import { toast } from "sonner"
import { MilestoneCard } from "./milestone-card"
import type { MilestoneRecord, DeliverableRecord } from "@/modules/client-portal/client-portal.types"

interface MilestonesTabProps {
  engagementId: string
  milestones: MilestoneRecord[]
  deliverables: DeliverableRecord[]
  onInvalidate: () => void
  onAddMilestone: () => void
}

export function MilestonesTab({
  engagementId,
  milestones,
  deliverables,
  onInvalidate,
  onAddMilestone,
}: MilestonesTabProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const updateMutation = api.clientPortal.admin.updateMilestone.useMutation({
    onSuccess: () => onInvalidate(),
    onError: (err) => toast.error(err.message),
  })

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = milestones.findIndex((m) => m.id === active.id)
    const newIndex = milestones.findIndex((m) => m.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    // Update sort orders for affected milestones
    const reordered = [...milestones]
    const [moved] = reordered.splice(oldIndex, 1)
    reordered.splice(newIndex, 0, moved!)

    reordered.forEach((m, i) => {
      if (m.sortOrder !== i) {
        updateMutation.mutate({ id: m.id, sortOrder: i })
      }
    })
  }

  const sorted = [...milestones].sort((a, b) => a.sortOrder - b.sortOrder)
  const activeId = sorted.find((m) => m.status === "IN_PROGRESS")?.id

  const completed = sorted.filter((m) => m.status === "COMPLETED").length
  const inProgress = sorted.filter((m) => m.status === "IN_PROGRESS").length
  const upcoming = sorted.filter((m) => m.status === "UPCOMING").length

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {sorted.length} milestone{sorted.length !== 1 ? "s" : ""}
          {sorted.length > 0 && ` · ${completed} completed, ${inProgress} in progress, ${upcoming} upcoming`}
        </p>
        <Button size="sm" onClick={onAddMilestone}>
          <Plus className="h-3.5 w-3.5 mr-1.5" /> Add Milestone
        </Button>
      </div>

      <div className="flex flex-col gap-3 mt-4">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={sorted.map((m) => m.id)} strategy={verticalListSortingStrategy}>
            {sorted.map((milestone) => (
              <MilestoneCard
                key={milestone.id}
                milestone={milestone}
                deliverables={deliverables}
                isActive={milestone.id === activeId}
                onInvalidate={onInvalidate}
              />
            ))}
          </SortableContext>
        </DndContext>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/clients/milestone-card.tsx src/components/clients/milestones-tab.tsx
git commit -m "feat(clients): add milestones tab with drag-and-drop reordering"
```

---

## Task 7: Deliverables tab + Invoices tab + Payment timeline + Approvals tab

**Files:**
- Create: `src/components/clients/deliverables-tab.tsx`
- Create: `src/components/clients/invoices-tab.tsx`
- Create: `src/components/clients/payment-timeline.tsx`
- Create: `src/components/clients/approvals-tab.tsx`

- [ ] **Step 1: Create DeliverablesTab**

```tsx
// src/components/clients/deliverables-tab.tsx
"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { CloudDownload } from "lucide-react"
import type { DeliverableRecord, MilestoneRecord } from "@/modules/client-portal/client-portal.types"

function formatDate(date: Date | null): string {
  if (!date) return "—"
  return new Date(date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
}

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  PENDING: "outline",
  DELIVERED: "default",
  ACCEPTED: "default",
}

interface DeliverablesTabProps {
  deliverables: DeliverableRecord[]
  milestones: MilestoneRecord[]
  onShareDeliverable: () => void
}

export function DeliverablesTab({ deliverables, milestones, onShareDeliverable }: DeliverablesTabProps) {
  const milestoneMap = Object.fromEntries(milestones.map((m) => [m.id, m.title]))

  return (
    <div className="mt-6 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {deliverables.length} deliverable{deliverables.length !== 1 ? "s" : ""}
        </p>
        <Button size="sm" onClick={onShareDeliverable}>
          <CloudDownload className="h-3.5 w-3.5 mr-1.5" /> Share Deliverable
        </Button>
      </div>

      <div className="rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead className="w-[180px]">Milestone</TableHead>
              <TableHead className="w-[100px]">Status</TableHead>
              <TableHead className="w-[130px]">Delivered</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {deliverables.map((d) => (
              <TableRow key={d.id}>
                <TableCell className="font-medium">{d.title}</TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {d.milestoneId ? milestoneMap[d.milestoneId] ?? "—" : "—"}
                </TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANT[d.status] ?? "secondary"}>
                    {d.status.charAt(0) + d.status.slice(1).toLowerCase()}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground text-xs">
                  {formatDate(d.deliveredAt)}
                </TableCell>
              </TableRow>
            ))}
            {deliverables.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  No deliverables yet
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create PaymentTimeline**

```tsx
// src/components/clients/payment-timeline.tsx
"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Check, Clock } from "lucide-react"
import { formatCurrency } from "@/lib/format-currency"
import type { PortalInvoiceRecord, PaymentScheduleItem } from "@/modules/client-portal/client-portal.types"

function formatDate(date: Date | null): string {
  if (!date) return ""
  return new Date(date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
}

interface PaymentTimelineProps {
  schedule: PaymentScheduleItem[]
  invoices: PortalInvoiceRecord[]
}

export function PaymentTimeline({ schedule, invoices }: PaymentTimelineProps) {
  if (schedule.length === 0) return null

  const paidCount = invoices.filter((i) => i.status === "PAID").length
  const progressPercent = schedule.length > 0 ? Math.round((paidCount / schedule.length) * 100) : 0

  return (
    <Card className="mt-6">
      <CardContent className="pt-5">
        <p className="text-sm font-semibold mb-4">Payment Timeline</p>
        <div className="relative flex">
          {/* Track */}
          <div className="absolute top-4 left-4 right-4 h-0.5 bg-border" />
          <div className="absolute top-4 left-4 h-0.5 bg-green-500" style={{ width: `${progressPercent}%` }} />

          {schedule.map((item, i) => {
            const matchedInvoice = invoices.find((inv) => inv.proposalPaymentIndex === i)
            const isPaid = matchedInvoice?.status === "PAID"

            return (
              <div key={i} className="flex-1 flex flex-col items-center relative z-10">
                <div
                  className={`h-8 w-8 rounded-full flex items-center justify-center ${
                    isPaid
                      ? "bg-green-500 text-white"
                      : "bg-background border-2 border-border text-muted-foreground"
                  }`}
                >
                  {isPaid ? <Check className="h-4 w-4" /> : <Clock className="h-3.5 w-3.5" />}
                </div>
                <div className="text-center mt-2">
                  <p className="text-xs font-semibold">{formatCurrency(item.amount)}</p>
                  <p className="text-[11px] text-muted-foreground">{item.label}</p>
                  {isPaid && matchedInvoice?.paidAt && (
                    <p className="text-[10px] text-green-500 mt-0.5">Paid {formatDate(matchedInvoice.paidAt)}</p>
                  )}
                  {!isPaid && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {item.dueType === "ON_COMPLETION" ? "On completion" : item.dueType === "ON_APPROVAL" ? "On approval" : "Pending"}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 3: Create InvoicesTab**

```tsx
// src/components/clients/invoices-tab.tsx
"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Eye, CheckCircle, Send } from "lucide-react"
import { formatCurrency } from "@/lib/format-currency"
import { api } from "@/lib/trpc/react"
import { toast } from "sonner"
import { PaymentTimeline } from "./payment-timeline"
import type { PortalInvoiceRecord, ProposalRecord } from "@/modules/client-portal/client-portal.types"

function formatDate(date: Date | null): string {
  if (!date) return "—"
  return new Date(date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
}

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  DRAFT: "outline",
  SENT: "default",
  PAID: "default",
  OVERDUE: "destructive",
}

interface InvoicesTabProps {
  engagementId: string
  invoices: PortalInvoiceRecord[]
  proposals: ProposalRecord[]
  onCreateInvoice: () => void
  onMarkPaid: (invoiceId: string) => void
  onInvalidate: () => void
}

export function InvoicesTab({
  engagementId,
  invoices,
  proposals,
  onCreateInvoice,
  onMarkPaid,
  onInvalidate,
}: InvoicesTabProps) {
  const currentProposal = proposals.find((p) => p.status === "APPROVED") ?? proposals[0]
  const schedule = currentProposal?.paymentSchedule ?? []
  const totalValue = currentProposal?.price ?? 0

  const totalInvoiced = invoices.reduce((sum, i) => sum + i.amount, 0)
  const totalPaid = invoices.filter((i) => i.status === "PAID").reduce((sum, i) => sum + i.amount, 0)
  const outstanding = totalInvoiced - totalPaid

  const invoicedPercent = totalValue > 0 ? Math.round((totalInvoiced / totalValue) * 100) : 0
  const paidPercent = totalInvoiced > 0 ? Math.round((totalPaid / totalInvoiced) * 100) : 0

  const sendMutation = api.clientPortal.admin.sendInvoice.useMutation({
    onSuccess: () => { toast.success("Invoice sent"); onInvalidate() },
    onError: (err) => toast.error(err.message),
  })

  return (
    <div className="mt-6 space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-5">
            <span className="text-xs font-medium text-muted-foreground">Total Invoiced</span>
            <p className="text-2xl font-semibold tracking-tight tabular-nums mt-1">{formatCurrency(totalInvoiced)}</p>
            <div className="flex items-center gap-2 mt-2">
              <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full bg-primary" style={{ width: `${invoicedPercent}%` }} />
              </div>
              <span className="text-xs text-muted-foreground">{invoicedPercent}% of {formatCurrency(totalValue)}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <span className="text-xs font-medium text-muted-foreground">Paid</span>
            <p className="text-2xl font-semibold tracking-tight tabular-nums mt-1 text-green-600">{formatCurrency(totalPaid)}</p>
            <div className="flex items-center gap-2 mt-2">
              <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full bg-green-500" style={{ width: `${paidPercent}%` }} />
              </div>
              <span className="text-xs text-muted-foreground">{paidPercent}% of invoiced</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <span className="text-xs font-medium text-muted-foreground">Outstanding</span>
            <p className="text-2xl font-semibold tracking-tight tabular-nums mt-1 text-orange-500">{formatCurrency(outstanding)}</p>
            <div className="flex items-center gap-2 mt-2">
              <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full bg-orange-500" style={{ width: `${totalInvoiced > 0 ? Math.round((outstanding / totalInvoiced) * 100) : 0}%` }} />
              </div>
              <span className="text-xs text-muted-foreground">{formatCurrency(totalValue - totalInvoiced)} remaining to invoice</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invoice table */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{invoices.length} invoice{invoices.length !== 1 ? "s" : ""}</p>
        <Button size="sm" onClick={onCreateInvoice}>
          <Plus className="h-3.5 w-3.5 mr-1.5" /> Create Invoice
        </Button>
      </div>

      <div className="rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[120px]">Invoice</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="w-[110px]">Amount</TableHead>
              <TableHead className="w-[100px]">Status</TableHead>
              <TableHead className="w-[120px]">Due Date</TableHead>
              <TableHead className="w-[120px]">Sent</TableHead>
              <TableHead className="w-[140px]"><span className="sr-only">Actions</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.map((inv, i) => (
              <TableRow key={inv.id}>
                <TableCell>
                  <span className="font-mono text-sm font-medium">INV-{String(i + 1).padStart(3, "0")}</span>
                </TableCell>
                <TableCell className="text-muted-foreground">{inv.description}</TableCell>
                <TableCell className="font-mono text-sm font-medium tabular-nums">{formatCurrency(inv.amount)}</TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANT[inv.status] ?? "secondary"}>
                    {inv.status.charAt(0) + inv.status.slice(1).toLowerCase()}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground text-xs">{formatDate(inv.dueDate)}</TableCell>
                <TableCell className="text-muted-foreground text-xs">{formatDate(inv.sentAt)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex gap-1 justify-end">
                    {inv.status === "PAID" && (
                      <Button variant="ghost" size="sm" className="h-6 text-xs text-muted-foreground">
                        <Eye className="h-3 w-3 mr-1" /> View
                      </Button>
                    )}
                    {inv.status === "SENT" && (
                      <Button variant="outline" size="sm" className="h-6 text-xs" onClick={() => onMarkPaid(inv.id)}>
                        <CheckCircle className="h-3 w-3 mr-1" /> Mark Paid
                      </Button>
                    )}
                    {inv.status === "DRAFT" && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-6 text-xs"
                        disabled={sendMutation.isPending}
                        onClick={() => sendMutation.mutate({ invoiceId: inv.id })}
                      >
                        <Send className="h-3 w-3 mr-1" /> Send
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {invoices.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No invoices yet
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Payment Timeline */}
      <PaymentTimeline schedule={schedule} invoices={invoices} />
    </div>
  )
}
```

- [ ] **Step 4: Create ApprovalsTab**

```tsx
// src/components/clients/approvals-tab.tsx
"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { CheckCircle } from "lucide-react"
import type { ApprovalRequestRecord } from "@/modules/client-portal/client-portal.types"

function formatDate(date: Date | null): string {
  if (!date) return "—"
  return new Date(date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
}

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  PENDING: "outline",
  APPROVED: "default",
  REJECTED: "destructive",
}

interface ApprovalsTabProps {
  approvals: ApprovalRequestRecord[]
  onRequestApproval: () => void
}

export function ApprovalsTab({ approvals, onRequestApproval }: ApprovalsTabProps) {
  return (
    <div className="mt-6 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {approvals.length} approval request{approvals.length !== 1 ? "s" : ""}
        </p>
        <Button size="sm" onClick={onRequestApproval}>
          <CheckCircle className="h-3.5 w-3.5 mr-1.5" /> Request Approval
        </Button>
      </div>

      {approvals.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No approval requests yet
          </CardContent>
        </Card>
      ) : (
        approvals.map((approval) => (
          <Card key={approval.id}>
            <CardContent className="py-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{approval.title}</span>
                    <Badge variant={STATUS_VARIANT[approval.status] ?? "secondary"}>
                      {approval.status.charAt(0) + approval.status.slice(1).toLowerCase()}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{approval.description}</p>
                  {approval.clientComment && (
                    <p className="text-sm italic text-muted-foreground mt-2">
                      Client: "{approval.clientComment}"
                    </p>
                  )}
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <span>Created {formatDate(approval.createdAt)}</span>
                    {approval.respondedAt && <span>Responded {formatDate(approval.respondedAt)}</span>}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add src/components/clients/deliverables-tab.tsx src/components/clients/invoices-tab.tsx src/components/clients/payment-timeline.tsx src/components/clients/approvals-tab.tsx
git commit -m "feat(clients): add deliverables, invoices, payment timeline, and approvals tabs"
```

---

## Task 8: All dialogs — CreateInvoice, ShareDeliverable, RequestApproval, MarkPaid, AddMilestone, EditEngagement

**Files:**
- Create: `src/components/clients/create-invoice-dialog.tsx`
- Create: `src/components/clients/share-deliverable-dialog.tsx`
- Create: `src/components/clients/request-approval-dialog.tsx`
- Create: `src/components/clients/mark-paid-dialog.tsx`
- Create: `src/components/clients/add-milestone-dialog.tsx`
- Create: `src/components/clients/edit-engagement-sheet.tsx`

- [ ] **Step 1: Create CreateInvoiceDialog**

```tsx
// src/components/clients/create-invoice-dialog.tsx
"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { api } from "@/lib/trpc/react"
import { toast } from "sonner"
import { parseCurrencyInput } from "@/lib/format-currency"
import type { MilestoneRecord } from "@/modules/client-portal/client-portal.types"

interface CreateInvoiceDialogProps {
  engagementId: string
  milestones: MilestoneRecord[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function CreateInvoiceDialog({ engagementId, milestones, open, onOpenChange, onSuccess }: CreateInvoiceDialogProps) {
  const [amount, setAmount] = useState("")
  const [description, setDescription] = useState("")
  const [dueDate, setDueDate] = useState("")
  const [milestoneId, setMilestoneId] = useState<string>("")
  const [sendAfterCreate, setSendAfterCreate] = useState(false)

  const createMutation = api.clientPortal.admin.createInvoice.useMutation({
    onSuccess: (invoice) => {
      if (sendAfterCreate) {
        sendMutation.mutate({ invoiceId: invoice.id })
      } else {
        toast.success("Invoice created")
        resetAndClose()
        onSuccess()
      }
    },
    onError: (err) => toast.error(err.message),
  })

  const sendMutation = api.clientPortal.admin.sendInvoice.useMutation({
    onSuccess: () => {
      toast.success("Invoice created and sent")
      resetAndClose()
      onSuccess()
    },
    onError: (err) => toast.error(err.message),
  })

  const resetAndClose = () => {
    setAmount("")
    setDescription("")
    setDueDate("")
    setMilestoneId("")
    setSendAfterCreate(false)
    onOpenChange(false)
  }

  const handleSubmit = (send: boolean) => {
    const cents = parseCurrencyInput(amount)
    if (!cents || !description.trim() || !dueDate) {
      toast.error("Please fill in all required fields")
      return
    }
    setSendAfterCreate(send)
    createMutation.mutate({
      engagementId,
      amount: cents,
      description: description.trim(),
      dueDate: new Date(dueDate),
      milestoneId: milestoneId || undefined,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Invoice</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Amount</Label>
            <div className="relative mt-1.5">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">&pound;</span>
              <Input value={amount} onChange={(e) => setAmount(e.target.value)} className="pl-7 tabular-nums" placeholder="0.00" />
            </div>
          </div>
          <div>
            <Label>Description</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1.5" placeholder="e.g. Deposit on signing" />
          </div>
          <div>
            <Label>Due Date</Label>
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="mt-1.5 w-[200px]" />
          </div>
          <div>
            <Label>Milestone (optional)</Label>
            <Select value={milestoneId} onValueChange={setMilestoneId}>
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                {milestones.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleSubmit(false)} disabled={createMutation.isPending || sendMutation.isPending}>
            Create Draft
          </Button>
          <Button onClick={() => handleSubmit(true)} disabled={createMutation.isPending || sendMutation.isPending}>
            Create & Send
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 2: Create ShareDeliverableDialog**

```tsx
// src/components/clients/share-deliverable-dialog.tsx
"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { api } from "@/lib/trpc/react"
import { toast } from "sonner"
import type { MilestoneRecord } from "@/modules/client-portal/client-portal.types"

interface ShareDeliverableDialogProps {
  engagementId: string
  milestones: MilestoneRecord[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function ShareDeliverableDialog({ engagementId, milestones, open, onOpenChange, onSuccess }: ShareDeliverableDialogProps) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [milestoneId, setMilestoneId] = useState<string>("")
  const [fileUrl, setFileUrl] = useState("")

  const createMutation = api.clientPortal.admin.createDeliverable.useMutation({
    onSuccess: (deliverable) => {
      deliverMutation.mutate({ id: deliverable.id })
    },
    onError: (err) => toast.error(err.message),
  })

  const deliverMutation = api.clientPortal.admin.deliverDeliverable.useMutation({
    onSuccess: () => {
      toast.success("Deliverable shared with client")
      resetAndClose()
      onSuccess()
    },
    onError: (err) => toast.error(err.message),
  })

  const resetAndClose = () => {
    setTitle("")
    setDescription("")
    setMilestoneId("")
    setFileUrl("")
    onOpenChange(false)
  }

  const handleSubmit = () => {
    if (!title.trim()) {
      toast.error("Title is required")
      return
    }
    createMutation.mutate({
      engagementId,
      title: title.trim(),
      description: description.trim() || undefined,
      milestoneId: milestoneId || undefined,
      fileUrl: fileUrl.trim() || undefined,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share Deliverable</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1.5" placeholder="e.g. Architecture Document v2" />
          </div>
          <div>
            <Label>Description (optional)</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1.5" placeholder="Brief description..." rows={3} />
          </div>
          <div>
            <Label>Milestone (optional)</Label>
            <Select value={milestoneId} onValueChange={setMilestoneId}>
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                {milestones.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>File URL (optional)</Label>
            <Input value={fileUrl} onChange={(e) => setFileUrl(e.target.value)} className="mt-1.5" placeholder="https://..." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={resetAndClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={createMutation.isPending || deliverMutation.isPending}>
            Share with Client
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 3: Create RequestApprovalDialog**

```tsx
// src/components/clients/request-approval-dialog.tsx
"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { api } from "@/lib/trpc/react"
import { toast } from "sonner"
import type { DeliverableRecord, MilestoneRecord } from "@/modules/client-portal/client-portal.types"

interface RequestApprovalDialogProps {
  engagementId: string
  deliverables: DeliverableRecord[]
  milestones: MilestoneRecord[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function RequestApprovalDialog({ engagementId, deliverables, milestones, open, onOpenChange, onSuccess }: RequestApprovalDialogProps) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [deliverableId, setDeliverableId] = useState<string>("")
  const [milestoneId, setMilestoneId] = useState<string>("")

  const mutation = api.clientPortal.admin.createApproval.useMutation({
    onSuccess: () => {
      toast.success("Approval request sent")
      setTitle("")
      setDescription("")
      setDeliverableId("")
      setMilestoneId("")
      onOpenChange(false)
      onSuccess()
    },
    onError: (err) => toast.error(err.message),
  })

  const handleSubmit = () => {
    if (!title.trim() || !description.trim()) {
      toast.error("Title and description are required")
      return
    }
    mutation.mutate({
      engagementId,
      title: title.trim(),
      description: description.trim(),
      deliverableId: deliverableId || undefined,
      milestoneId: milestoneId || undefined,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request Approval</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1.5" placeholder="e.g. Architecture sign-off" />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1.5" placeholder="What are you asking the client to approve?" rows={3} />
          </div>
          <div>
            <Label>Link to Deliverable (optional)</Label>
            <Select value={deliverableId} onValueChange={setDeliverableId}>
              <SelectTrigger className="mt-1.5"><SelectValue placeholder="None" /></SelectTrigger>
              <SelectContent>
                {deliverables.map((d) => (
                  <SelectItem key={d.id} value={d.id}>{d.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Link to Milestone (optional)</Label>
            <Select value={milestoneId} onValueChange={setMilestoneId}>
              <SelectTrigger className="mt-1.5"><SelectValue placeholder="None" /></SelectTrigger>
              <SelectContent>
                {milestones.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={mutation.isPending}>Send Request</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 4: Create MarkPaidDialog**

```tsx
// src/components/clients/mark-paid-dialog.tsx
"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { api } from "@/lib/trpc/react"
import { toast } from "sonner"

interface MarkPaidDialogProps {
  invoiceId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function MarkPaidDialog({ invoiceId, open, onOpenChange, onSuccess }: MarkPaidDialogProps) {
  const [paymentMethod, setPaymentMethod] = useState<"STRIPE" | "BANK_TRANSFER">("BANK_TRANSFER")
  const [paymentReference, setPaymentReference] = useState("")

  const mutation = api.clientPortal.admin.markInvoicePaid.useMutation({
    onSuccess: () => {
      toast.success("Invoice marked as paid")
      setPaymentMethod("BANK_TRANSFER")
      setPaymentReference("")
      onOpenChange(false)
      onSuccess()
    },
    onError: (err) => toast.error(err.message),
  })

  const handleSubmit = () => {
    if (!invoiceId) return
    mutation.mutate({
      invoiceId,
      paymentMethod,
      paymentReference: paymentReference.trim() || undefined,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mark as Paid</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Payment Method</Label>
            <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as "STRIPE" | "BANK_TRANSFER")}>
              <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                <SelectItem value="STRIPE">Stripe</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Payment Reference (optional)</Label>
            <Input value={paymentReference} onChange={(e) => setPaymentReference(e.target.value)} className="mt-1.5" placeholder="e.g. TXN-12345" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={mutation.isPending}>Confirm Payment</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 5: Create AddMilestoneDialog**

```tsx
// src/components/clients/add-milestone-dialog.tsx
"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { api } from "@/lib/trpc/react"
import { toast } from "sonner"

interface AddMilestoneDialogProps {
  engagementId: string
  milestoneCount: number
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function AddMilestoneDialog({ engagementId, milestoneCount, open, onOpenChange, onSuccess }: AddMilestoneDialogProps) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [dueDate, setDueDate] = useState("")

  const mutation = api.clientPortal.admin.createMilestone.useMutation({
    onSuccess: () => {
      toast.success("Milestone added")
      setTitle("")
      setDescription("")
      setDueDate("")
      onOpenChange(false)
      onSuccess()
    },
    onError: (err) => toast.error(err.message),
  })

  const handleSubmit = () => {
    if (!title.trim()) {
      toast.error("Title is required")
      return
    }
    mutation.mutate({
      engagementId,
      title: title.trim(),
      description: description.trim() || undefined,
      dueDate: dueDate ? new Date(dueDate) : undefined,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Milestone</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1.5" placeholder="e.g. Phase 2: Development" />
          </div>
          <div>
            <Label>Description (optional)</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1.5" placeholder="Brief description..." rows={3} />
          </div>
          <div>
            <Label>Due Date (optional)</Label>
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="mt-1.5 w-[200px]" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={mutation.isPending}>Add Milestone</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 6: Create EditEngagementSheet**

```tsx
// src/components/clients/edit-engagement-sheet.tsx
"use client"

import { useState, useEffect } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { api } from "@/lib/trpc/react"
import { toast } from "sonner"
import type { EngagementRecord } from "@/modules/client-portal/client-portal.types"

interface EditEngagementSheetProps {
  engagement: EngagementRecord
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function EditEngagementSheet({ engagement, open, onOpenChange, onSuccess }: EditEngagementSheetProps) {
  const [title, setTitle] = useState(engagement.title)
  const [type, setType] = useState(engagement.type)
  const [status, setStatus] = useState(engagement.status)
  const [description, setDescription] = useState(engagement.description ?? "")
  const [startDate, setStartDate] = useState(engagement.startDate ? new Date(engagement.startDate).toISOString().split("T")[0]! : "")
  const [endDate, setEndDate] = useState(engagement.endDate ? new Date(engagement.endDate).toISOString().split("T")[0]! : "")

  useEffect(() => {
    setTitle(engagement.title)
    setType(engagement.type)
    setStatus(engagement.status)
    setDescription(engagement.description ?? "")
    setStartDate(engagement.startDate ? new Date(engagement.startDate).toISOString().split("T")[0]! : "")
    setEndDate(engagement.endDate ? new Date(engagement.endDate).toISOString().split("T")[0]! : "")
  }, [engagement])

  const mutation = api.clientPortal.admin.updateEngagement.useMutation({
    onSuccess: () => {
      toast.success("Engagement updated")
      onOpenChange(false)
      onSuccess()
    },
    onError: (err) => toast.error(err.message),
  })

  const handleSubmit = () => {
    mutation.mutate({
      id: engagement.id,
      title: title.trim() || undefined,
      type,
      status,
      description: description.trim() || null,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
    })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Edit Engagement</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 mt-6">
          <div>
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1.5" />
          </div>
          <div>
            <Label>Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as any)}>
              <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="PROJECT">Project</SelectItem>
                <SelectItem value="RETAINER">Retainer</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as any)}>
              <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="PROPOSED">Proposed</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1.5" rows={4} />
          </div>
          <div>
            <Label>Start Date</Label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="mt-1.5 w-[200px]" />
          </div>
          <div>
            <Label>End Date</Label>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="mt-1.5 w-[200px]" />
          </div>
        </div>
        <SheetFooter className="mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={mutation.isPending}>Save Changes</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
```

- [ ] **Step 7: Commit**

```bash
git add src/components/clients/create-invoice-dialog.tsx src/components/clients/share-deliverable-dialog.tsx src/components/clients/request-approval-dialog.tsx src/components/clients/mark-paid-dialog.tsx src/components/clients/add-milestone-dialog.tsx src/components/clients/edit-engagement-sheet.tsx
git commit -m "feat(clients): add all dialog and sheet components for quick actions"
```

---

## Task 9: Create Engagement page

**Files:**
- Create: `src/components/clients/create-engagement-form.tsx`
- Create: `src/app/admin/clients/new/page.tsx`

- [ ] **Step 1: Create CreateEngagementForm**

```tsx
// src/components/clients/create-engagement-form.tsx
"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Search, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { api } from "@/lib/trpc/react"
import { useDebounce } from "@/hooks/use-debounce"

interface CreateEngagementFormProps {
  customerId: string | null
  onCustomerSelect: (id: string, name: string) => void
  title: string
  onTitleChange: (value: string) => void
  type: "PROJECT" | "RETAINER"
  onTypeChange: (value: "PROJECT" | "RETAINER") => void
  description: string
  onDescriptionChange: (value: string) => void
  startDate: string
  onStartDateChange: (value: string) => void
}

export function CreateEngagementForm({
  customerId,
  onCustomerSelect,
  title,
  onTitleChange,
  type,
  onTypeChange,
  description,
  onDescriptionChange,
  startDate,
  onStartDateChange,
}: CreateEngagementFormProps) {
  const [customerSearch, setCustomerSearch] = useState("")
  const [showDropdown, setShowDropdown] = useState(false)
  const debouncedSearch = useDebounce(customerSearch, 300)

  const { data: customers } = api.clientPortal.admin.searchCustomers.useQuery(
    { query: debouncedSearch, limit: 10 },
    { enabled: debouncedSearch.length >= 1 }
  )

  useEffect(() => {
    setShowDropdown(debouncedSearch.length >= 1 && !customerId)
  }, [debouncedSearch, customerId])

  return (
    <div className="space-y-5">
      {/* Customer selector */}
      <div>
        <Label>Client</Label>
        <div className="relative mt-1.5">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={customerSearch}
            onChange={(e) => { setCustomerSearch(e.target.value); onCustomerSelect("", "") }}
            placeholder="Search existing clients..."
            className="pl-9"
          />
          {showDropdown && (
            <div className="absolute top-full left-0 right-0 mt-1 rounded-lg border bg-card shadow-lg z-10 overflow-hidden">
              {customers?.map((c) => (
                <button
                  key={c.id}
                  className="w-full text-left px-3 py-2.5 hover:bg-accent transition-colors"
                  onClick={() => {
                    const name = [c.firstName, c.lastName].filter(Boolean).join(" ")
                    onCustomerSelect(c.id, name)
                    setCustomerSearch(name)
                    setShowDropdown(false)
                  }}
                >
                  <p className="text-sm font-medium">{[c.firstName, c.lastName].filter(Boolean).join(" ")}</p>
                  {c.email && <p className="text-xs text-muted-foreground">{c.email}</p>}
                </button>
              ))}
              {(!customers || customers.length === 0) && debouncedSearch.length >= 1 && (
                <div className="px-3 py-2.5 text-sm text-muted-foreground">No clients found</div>
              )}
            </div>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-1">Search by name or email.</p>
      </div>

      {/* Title */}
      <div>
        <Label>Engagement Title</Label>
        <Input value={title} onChange={(e) => onTitleChange(e.target.value)} className="mt-1.5" placeholder="e.g. AI Strategy & Implementation Roadmap" />
      </div>

      {/* Type toggle */}
      <div>
        <Label>Engagement Type</Label>
        <div className="flex gap-0 border rounded-md w-fit mt-1.5 overflow-hidden">
          <button
            onClick={() => onTypeChange("PROJECT")}
            className={cn(
              "px-5 py-2 text-sm font-medium border-r transition-colors",
              type === "PROJECT" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground"
            )}
          >
            Project
          </button>
          <button
            onClick={() => onTypeChange("RETAINER")}
            className={cn(
              "px-5 py-2 text-sm font-medium transition-colors",
              type === "RETAINER" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground"
            )}
          >
            Retainer
          </button>
        </div>
        <p className="text-xs text-muted-foreground mt-1">Project = fixed scope and price. Retainer = ongoing monthly engagement.</p>
      </div>

      {/* Description */}
      <div>
        <Label>Description</Label>
        <Textarea value={description} onChange={(e) => onDescriptionChange(e.target.value)} className="mt-1.5" placeholder="Brief description of the engagement scope and goals..." rows={4} />
      </div>

      {/* Start Date */}
      <div>
        <Label>Start Date <span className="font-normal text-muted-foreground">(optional)</span></Label>
        <Input type="date" value={startDate} onChange={(e) => onStartDateChange(e.target.value)} className="mt-1.5 w-[200px]" />
        <p className="text-xs text-muted-foreground mt-1">Leave blank if the start date depends on proposal acceptance.</p>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create the new engagement page**

```tsx
// src/app/admin/clients/new/page.tsx
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { api } from "@/lib/trpc/react"
import { toast } from "sonner"
import { CreateEngagementForm } from "@/components/clients/create-engagement-form"

export default function NewEngagementPage() {
  const router = useRouter()
  const [customerId, setCustomerId] = useState<string | null>(null)
  const [customerName, setCustomerName] = useState("")
  const [title, setTitle] = useState("")
  const [type, setType] = useState<"PROJECT" | "RETAINER">("PROJECT")
  const [description, setDescription] = useState("")
  const [startDate, setStartDate] = useState("")

  const mutation = api.clientPortal.admin.createEngagement.useMutation({
    onError: (err) => toast.error(err.message),
  })

  const handleSubmit = (addProposal: boolean) => {
    if (!customerId) {
      toast.error("Please select a client")
      return
    }
    if (!title.trim()) {
      toast.error("Please enter a title")
      return
    }
    mutation.mutate(
      {
        customerId,
        type,
        title: title.trim(),
        description: description.trim() || undefined,
        startDate: startDate ? new Date(startDate) : undefined,
      },
      {
        onSuccess: (engagement) => {
          if (addProposal) {
            router.push(`/admin/clients/${engagement.id}/proposals/new`)
          } else {
            toast.success("Engagement created")
            router.push("/admin/clients")
          }
        },
      }
    )
  }

  return (
    <div className="max-w-[640px] mx-auto animate-fade-in">
      <Link href="/admin/clients" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-3.5 w-3.5" /> Back to Clients
      </Link>

      <h1 className="text-2xl font-semibold tracking-tight mt-3">New Engagement</h1>
      <p className="text-sm text-muted-foreground mt-1">Create a new client engagement to track proposals, milestones and invoices.</p>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-sm">Engagement Details</CardTitle>
        </CardHeader>
        <CardContent>
          <CreateEngagementForm
            customerId={customerId}
            onCustomerSelect={(id, name) => { setCustomerId(id || null); setCustomerName(name) }}
            title={title}
            onTitleChange={setTitle}
            type={type}
            onTypeChange={setType}
            description={description}
            onDescriptionChange={setDescription}
            startDate={startDate}
            onStartDateChange={setStartDate}
          />
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-2 mt-6 pt-6 border-t">
        <Button variant="outline" onClick={() => handleSubmit(false)} disabled={mutation.isPending}>
          Create as Draft
        </Button>
        <Button onClick={() => handleSubmit(true)} disabled={mutation.isPending}>
          <ChevronRight className="h-4 w-4 mr-1" /> Create & Add Proposal
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/clients/create-engagement-form.tsx src/app/admin/clients/new/page.tsx
git commit -m "feat(clients): add create engagement page with client search"
```

---

## Task 10: Create Proposal page

**Files:**
- Create: `src/components/clients/deliverable-list-builder.tsx`
- Create: `src/components/clients/payment-schedule-builder.tsx`
- Create: `src/components/clients/proposal-form.tsx`
- Create: `src/app/admin/clients/[engagementId]/proposals/new/page.tsx`

- [ ] **Step 1: Create DeliverableListBuilder**

```tsx
// src/components/clients/deliverable-list-builder.tsx
"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Trash2 } from "lucide-react"

interface DeliverableItem {
  title: string
  description: string
}

interface DeliverableListBuilderProps {
  items: DeliverableItem[]
  onChange: (items: DeliverableItem[]) => void
}

export function DeliverableListBuilder({ items, onChange }: DeliverableListBuilderProps) {
  const addItem = () => {
    onChange([...items, { title: "", description: "" }])
  }

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index))
  }

  const updateItem = (index: number, field: keyof DeliverableItem, value: string) => {
    const updated = items.map((item, i) => i === index ? { ...item, [field]: value } : item)
    onChange(updated)
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Deliverables</p>
          <p className="text-xs text-muted-foreground">Items to be delivered as part of this proposal</p>
        </div>
        <Button variant="outline" size="sm" onClick={addItem}>
          <Plus className="h-3.5 w-3.5 mr-1.5" /> Add Deliverable
        </Button>
      </div>
      <div className="flex flex-col gap-3 mt-3">
        {items.map((item, i) => (
          <div key={i} className="flex gap-3 items-start p-3 rounded-lg border">
            <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-xs font-semibold text-muted-foreground shrink-0 mt-1">
              {i + 1}
            </div>
            <div className="flex-1 space-y-2">
              <Input
                value={item.title}
                onChange={(e) => updateItem(i, "title", e.target.value)}
                placeholder="Deliverable title"
                className="text-sm"
              />
              <Textarea
                value={item.description}
                onChange={(e) => updateItem(i, "description", e.target.value)}
                placeholder="Description (optional)"
                className="text-sm min-h-[48px]"
                rows={2}
              />
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0 mt-1"
              onClick={() => removeItem(i)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create PaymentScheduleBuilder**

```tsx
// src/components/clients/payment-schedule-builder.tsx
"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, X } from "lucide-react"
import { formatCurrency, parseCurrencyInput } from "@/lib/format-currency"

interface ScheduleItem {
  label: string
  amount: string
  dueType: string
}

interface PaymentScheduleBuilderProps {
  items: ScheduleItem[]
  onChange: (items: ScheduleItem[]) => void
}

const DUE_TYPES = [
  { label: "On proposal acceptance", value: "ON_APPROVAL" },
  { label: "On milestone completion", value: "ON_MILESTONE" },
  { label: "On completion", value: "ON_COMPLETION" },
  { label: "Specific date", value: "ON_DATE" },
]

export function PaymentScheduleBuilder({ items, onChange }: PaymentScheduleBuilderProps) {
  const addItem = () => {
    onChange([...items, { label: "", amount: "", dueType: "ON_MILESTONE" }])
  }

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index))
  }

  const updateItem = (index: number, field: keyof ScheduleItem, value: string) => {
    const updated = items.map((item, i) => i === index ? { ...item, [field]: value } : item)
    onChange(updated)
  }

  const total = items.reduce((sum, item) => sum + parseCurrencyInput(item.amount), 0)

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Payment Schedule</p>
          <p className="text-xs text-muted-foreground">Define when payments are due</p>
        </div>
        <Button variant="outline" size="sm" onClick={addItem}>
          <Plus className="h-3.5 w-3.5 mr-1.5" /> Add Line
        </Button>
      </div>

      <div className="mt-3">
        <div className="grid grid-cols-[1fr_120px_180px_40px] gap-2 text-xs font-medium text-muted-foreground pb-1">
          <span>Description</span>
          <span>Amount</span>
          <span>Due</span>
          <span></span>
        </div>
        <div className="space-y-2">
          {items.map((item, i) => (
            <div key={i} className="grid grid-cols-[1fr_120px_180px_40px] gap-2 items-center">
              <Input
                value={item.label}
                onChange={(e) => updateItem(i, "label", e.target.value)}
                className="text-sm h-[34px]"
                placeholder="Description"
              />
              <Input
                value={item.amount}
                onChange={(e) => updateItem(i, "amount", e.target.value)}
                className="text-sm h-[34px] tabular-nums"
                placeholder="0"
              />
              <Select value={item.dueType} onValueChange={(v) => updateItem(i, "dueType", v)}>
                <SelectTrigger className="text-sm h-[34px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DUE_TYPES.map((dt) => (
                    <SelectItem key={dt.value} value={dt.value}>{dt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="icon"
                className="h-[34px] w-[34px] text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => removeItem(i)}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
        {items.length > 0 && (
          <div className="text-right text-xs text-muted-foreground mt-2">
            Total: <strong className="text-foreground">{formatCurrency(total)}</strong>
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create the create proposal page**

```tsx
// src/app/admin/clients/[engagementId]/proposals/new/page.tsx
"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { ChevronLeft, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { api } from "@/lib/trpc/react"
import { toast } from "sonner"
import { parseCurrencyInput } from "@/lib/format-currency"
import { DeliverableListBuilder } from "@/components/clients/deliverable-list-builder"
import { PaymentScheduleBuilder } from "@/components/clients/payment-schedule-builder"

const DEFAULT_TERMS = `1. This proposal is valid for 30 days from the date of issue.
2. Payment terms are as outlined in the payment schedule above.
3. Late payments will incur interest at 4% above the Bank of England base rate.
4. Either party may terminate with 14 days written notice. Work completed to date will be invoiced.
5. All intellectual property created during this engagement transfers to the client upon final payment.
6. Luke Hodges trading as Ironheart Consulting. Company registration pending.`

export default function NewProposalPage() {
  const params = useParams<{ engagementId: string }>()
  const router = useRouter()

  const { data: engagement, isLoading } = api.clientPortal.admin.getEngagement.useQuery({
    id: params.engagementId,
  })

  const [scope, setScope] = useState("")
  const [deliverables, setDeliverables] = useState([{ title: "", description: "" }])
  const [priceInput, setPriceInput] = useState("")
  const [schedule, setSchedule] = useState([{ label: "", amount: "", dueType: "ON_APPROVAL" }])
  const [terms, setTerms] = useState(DEFAULT_TERMS)

  const createMutation = api.clientPortal.admin.createProposal.useMutation({
    onError: (err) => toast.error(err.message),
  })

  const sendMutation = api.clientPortal.admin.sendProposal.useMutation({
    onError: (err) => toast.error(err.message),
  })

  const validate = (): boolean => {
    if (!scope.trim()) { toast.error("Scope is required"); return false }
    if (!deliverables.some((d) => d.title.trim())) { toast.error("At least one deliverable with a title is required"); return false }
    if (parseCurrencyInput(priceInput) <= 0) { toast.error("Price must be greater than 0"); return false }
    for (const item of schedule) {
      if (!item.label.trim() || !item.amount.trim()) {
        toast.error("Each payment schedule item needs a description and amount")
        return false
      }
    }
    return true
  }

  const buildInput = () => ({
    engagementId: params.engagementId,
    scope: scope.trim(),
    deliverables: deliverables.filter((d) => d.title.trim()).map((d) => ({
      title: d.title.trim(),
      description: d.description.trim(),
    })),
    price: parseCurrencyInput(priceInput),
    paymentSchedule: schedule.filter((s) => s.label.trim()).map((s) => ({
      label: s.label.trim(),
      amount: parseCurrencyInput(s.amount),
      dueType: s.dueType as "ON_APPROVAL" | "ON_DATE" | "ON_MILESTONE" | "ON_COMPLETION",
    })),
    terms: terms.trim() || undefined,
  })

  const handleSaveDraft = () => {
    if (!validate()) return
    createMutation.mutate(buildInput(), {
      onSuccess: () => {
        toast.success("Proposal saved as draft")
        router.push(`/admin/clients/${params.engagementId}`)
      },
    })
  }

  const handleSend = () => {
    if (!validate()) return
    createMutation.mutate(buildInput(), {
      onSuccess: (proposal) => {
        sendMutation.mutate({ proposalId: proposal.id }, {
          onSuccess: () => {
            toast.success("Proposal sent to client")
            router.push(`/admin/clients/${params.engagementId}`)
          },
        })
      },
    })
  }

  if (isLoading) {
    return (
      <div className="max-w-[800px] mx-auto space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[600px] rounded-xl" />
      </div>
    )
  }

  return (
    <div className="max-w-[800px] mx-auto animate-fade-in">
      <Link href={`/admin/clients/${params.engagementId}`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-3.5 w-3.5" /> Back to {engagement?.title ?? "Engagement"}
      </Link>

      <div className="flex items-center justify-between mt-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Create Proposal</h1>
          {engagement && <p className="text-sm text-muted-foreground mt-0.5">{engagement.title}</p>}
        </div>
      </div>

      <Separator className="my-6" />

      {/* Scope */}
      <div>
        <Label>Scope of Work</Label>
        <Textarea value={scope} onChange={(e) => setScope(e.target.value)} className="mt-1.5 min-h-[140px]" placeholder="Describe the scope of work..." />
      </div>

      <Separator className="my-6" />

      {/* Deliverables */}
      <DeliverableListBuilder items={deliverables} onChange={setDeliverables} />

      <Separator className="my-6" />

      {/* Price */}
      <div>
        <Label>Total Price</Label>
        <div className="relative mt-1.5 w-[200px]">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">&pound;</span>
          <Input value={priceInput} onChange={(e) => setPriceInput(e.target.value)} className="pl-7 tabular-nums font-medium" placeholder="0" />
        </div>
        <p className="text-xs text-muted-foreground mt-1">Excluding VAT</p>
      </div>

      <Separator className="my-6" />

      {/* Payment Schedule */}
      <PaymentScheduleBuilder items={schedule} onChange={setSchedule} />

      <Separator className="my-6" />

      {/* Terms */}
      <div>
        <Label>Terms & Conditions</Label>
        <Textarea value={terms} onChange={(e) => setTerms(e.target.value)} className="mt-1.5 min-h-[120px]" />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-6 pt-6 border-t">
        <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => router.back()}>
          Cancel
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSaveDraft} disabled={createMutation.isPending || sendMutation.isPending}>
            Save Draft
          </Button>
          <Button onClick={handleSend} disabled={createMutation.isPending || sendMutation.isPending}>
            <Send className="h-4 w-4 mr-1.5" /> Send to Client
          </Button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/clients/deliverable-list-builder.tsx src/components/clients/payment-schedule-builder.tsx src/app/admin/clients/\[engagementId\]/proposals/new/page.tsx
git commit -m "feat(clients): add create proposal page with deliverable and payment schedule builders"
```

---

## Task 11: Verify build

- [ ] **Step 1: Run TypeScript check**

Run: `npx tsc --noEmit`

Fix any type errors that arise. Common issues:
- Missing imports
- Type mismatches between tRPC response and component props
- The `getEngagement` return type may need casting for nested properties

- [ ] **Step 2: Run dev server smoke test**

Run: `npm run dev`

Navigate to `/admin/clients` and verify the page loads without errors.

- [ ] **Step 3: Commit any fixes**

```bash
git add -A
git commit -m "fix(clients): resolve type errors and build issues"
```
