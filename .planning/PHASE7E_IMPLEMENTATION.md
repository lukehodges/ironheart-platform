# Phase 7E — Platform Admin Implementation Plan

**Goal:** Multi-tenant management interface for platform operators.

**Status:** Planning Complete → Ready for Execution

**Estimated Scope:** ~32 files, ~8,500 LOC, 120+ tests

---

## Architecture Overview

Phase 7E delivers the platform administration interface for managing all tenants. This is a **platform-admin-only** feature area requiring `isPlatformAdmin = true`.

### Key Features
1. **Tenant List & Management** — Browse, filter, search all tenants
2. **Tenant Detail** — View stats, usage, configure modules, manage plans
3. **Tenant Creation Wizard** — 5-step guided tenant provisioning
4. **Platform Analytics** — MRR, churn, growth metrics across all tenants
5. **Impersonate** — Login as tenant admin (with audit logging)

### Technical Stack
- **No new packages needed** — Uses existing Recharts, shadcn/ui
- **Route:** `/platform/*` (separate from `/admin/*`)
- **Auth:** Platform admin guard via `isPlatformAdmin` flag
- **Backend:** Uses existing `platform.router.ts` from Phase 5

### Module Dependencies
- Requires Phase 5 backend (`platform` module complete)
- Uses Phase 7A design system (shadcn/ui components)
- Follows Phase 7C-7D patterns (wizards, analytics, tables)

---

## Wave 1: Types & Schemas (4 files)

**Parallel execution:** All 4 files can be created simultaneously

### File 1.1: `src/types/platform-admin.ts`

**Purpose:** TypeScript interfaces for platform admin features

**Estimated Lines:** ~180

```typescript
// Tenant management types

export interface TenantListItem {
  id: string
  slug: string
  name: string
  plan: 'TRIAL' | 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE'
  status: 'ACTIVE' | 'SUSPENDED' | 'CANCELLED' | 'PENDING'
  userCount: number
  bookingCount: number
  createdAt: Date
  trialEndsAt?: Date | null
  suspendedAt?: Date | null
}

export interface TenantDetail extends TenantListItem {
  email: string
  domain?: string | null
  suspendedReason?: string | null
  usage: {
    bookingsThisMonth: number
    activeUsers: number
    storageUsedMB: number
    storageQuotaMB: number
    apiCallsThisMonth: number
    apiQuota: number
  }
  billing: {
    mrr: number // monthly recurring revenue
    nextBillingDate?: Date | null
    paymentMethod?: string | null
  }
  modules: TenantModuleStatus[]
}

export interface TenantModuleStatus {
  moduleId: string
  slug: string
  name: string
  description: string
  isEnabled: boolean
  isPremium: boolean
  monthlyRate?: number | null
}

export interface TenantFilters {
  search?: string
  plan?: 'TRIAL' | 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE'
  status?: 'ACTIVE' | 'SUSPENDED' | 'CANCELLED' | 'PENDING'
}

export interface CreateTenantWizardState {
  step: 1 | 2 | 3 | 4 | 5
  businessDetails: {
    businessName: string
    domain: string
    industry: string
  }
  plan: 'TRIAL' | 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE'
  adminUser: {
    email: string
    firstName: string
    lastName: string
  }
  modules: string[] // module IDs
}

// Platform analytics types

export interface PlatformMRRData {
  currentMRR: number
  previousMRR: number
  change: number // percentage
  chartData: { month: string; mrr: number }[]
}

export interface TenantsByPlanData {
  plan: string
  count: number
  percentage: number
}

export interface SignupTrendData {
  date: string
  signups: number
  conversions: number
}

export interface ChurnData {
  currentChurnRate: number
  previousChurnRate: number
  churnedTenants: {
    id: string
    name: string
    plan: string
    churnedAt: Date
    reason?: string
  }[]
}

export type ImpersonateAction = 'START' | 'END'

export interface ImpersonateAuditLog {
  tenantId: string
  tenantName: string
  adminEmail: string
  action: ImpersonateAction
  timestamp: Date
  ipAddress?: string
}
```

**Success Criteria:**
- All types compile with 0 tsc errors
- Matches backend platform.types.ts structure
- Proper discriminated unions for status/plan enums

---

### File 1.2: `src/schemas/platform-admin.schemas.ts`

**Purpose:** Zod schemas for form validation and tRPC inputs

**Estimated Lines:** ~120

```typescript
import { z } from 'zod'

// Filters
export const tenantFiltersSchema = z.object({
  search: z.string().optional(),
  plan: z.enum(['TRIAL', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE']).optional(),
  status: z.enum(['ACTIVE', 'SUSPENDED', 'CANCELLED', 'PENDING']).optional(),
  limit: z.number().int().min(1).max(100).default(50),
  cursor: z.string().optional(),
})

// Create tenant wizard - Step 1
export const businessDetailsSchema = z.object({
  businessName: z.string().min(1, 'Business name required').max(255),
  domain: z
    .string()
    .min(2)
    .max(63)
    .regex(/^[a-z0-9-]+$/, 'Lowercase letters, numbers, hyphens only'),
  industry: z.string().min(1, 'Industry required'),
})

// Create tenant wizard - Step 2
export const selectPlanSchema = z.object({
  plan: z.enum(['TRIAL', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE']),
})

// Create tenant wizard - Step 3
export const adminUserSchema = z.object({
  email: z.string().email('Valid email required'),
  firstName: z.string().min(1, 'First name required').max(100),
  lastName: z.string().min(1, 'Last name required').max(100),
})

// Create tenant wizard - Step 4
export const selectModulesSchema = z.object({
  modules: z.array(z.string()).min(1, 'Select at least one module'),
})

// Complete tenant creation (combines all steps)
export const createTenantCompleteSchema = z.object({
  businessName: z.string().min(1).max(255),
  domain: z.string().min(2).max(63).regex(/^[a-z0-9-]+$/),
  industry: z.string(),
  plan: z.enum(['TRIAL', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE']),
  email: z.string().email(),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  modules: z.array(z.string()),
})

// Tenant actions
export const suspendTenantSchema = z.object({
  tenantId: z.string(),
  reason: z.string().min(1, 'Reason required for suspension'),
})

export const changeTenantPlanSchema = z.object({
  tenantId: z.string(),
  plan: z.enum(['TRIAL', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE']),
  reason: z.string().max(500).optional(),
})

export const toggleTenantModuleSchema = z.object({
  tenantId: z.string(),
  moduleId: z.string(),
  isEnabled: z.boolean(),
})

export const impersonateTenantSchema = z.object({
  tenantId: z.string(),
})

// Platform analytics
export const platformAnalyticsFiltersSchema = z.object({
  from: z.date().optional(),
  to: z.date().optional(),
  preset: z.enum(['7d', '30d', '90d', '12m']).optional(),
})

// Type exports
export type TenantFilters = z.infer<typeof tenantFiltersSchema>
export type BusinessDetailsInput = z.infer<typeof businessDetailsSchema>
export type AdminUserInput = z.infer<typeof adminUserSchema>
export type CreateTenantCompleteInput = z.infer<typeof createTenantCompleteSchema>
```

**Success Criteria:**
- All schemas compile
- Proper Zod v4 syntax (z.uuid() not z.string().uuid())
- Matches backend platform.schemas.ts structure
- Clear error messages for validation failures

---

### File 1.3: `src/types/platform-analytics.ts`

**Purpose:** Analytics-specific types for platform metrics

**Estimated Lines:** ~80

```typescript
// Platform-wide analytics types

export interface PlatformMetrics {
  totalTenants: number
  activeTenants: number
  trialTenants: number
  mrr: number
  arr: number // annual recurring revenue
  averageRevenuePerTenant: number
  churnRate: number
  growthRate: number
}

export interface TenantGrowthData {
  date: string
  newTenants: number
  churnedTenants: number
  netGrowth: number
}

export interface RevenueBreakdown {
  plan: string
  mrr: number
  tenantCount: number
  averagePerTenant: number
}

export interface TopTenantByRevenue {
  tenantId: string
  tenantName: string
  plan: string
  mrr: number
  userCount: number
}

export type PlatformAnalyticsDateRange = '7d' | '30d' | '90d' | '12m'
```

---

### File 1.4: Update `src/types/index.ts` (barrel export)

**Purpose:** Export all platform types

**Estimated Lines:** ~10

```typescript
// Add to existing exports:
export * from './platform-admin'
export * from './platform-analytics'
```

**Success Criteria:**
- All types exported and accessible
- No circular dependencies
- Barrel export compiles cleanly

---

## Wave 2: Data Layer Hooks (4 files)

**Parallel execution:** All 4 files can be created simultaneously

### File 2.1: `src/hooks/use-platform-tenants.ts`

**Purpose:** Hook for tenant list, detail, and mutations

**Estimated Lines:** ~150

```typescript
'use client'

import { api } from '@/lib/trpc/react'
import { useState } from 'react'
import type { TenantFilters } from '@/schemas/platform-admin.schemas'

export function usePlatformTenants() {
  const [filters, setFilters] = useState<TenantFilters>({})

  const list = api.platform.listTenants.useQuery(filters, {
    keepPreviousData: true,
  })

  const utils = api.useUtils()

  const suspend = api.platform.suspendTenant.useMutation({
    onSuccess: () => {
      utils.platform.listTenants.invalidate()
      utils.platform.getTenant.invalidate()
    },
  })

  const activate = api.platform.activateTenant.useMutation({
    onSuccess: () => {
      utils.platform.listTenants.invalidate()
      utils.platform.getTenant.invalidate()
    },
  })

  const changePlan = api.platform.changePlan.useMutation({
    onSuccess: () => {
      utils.platform.getTenant.invalidate()
    },
  })

  const toggleModule = api.platform.setTenantModule.useMutation({
    onSuccess: () => {
      utils.platform.listTenantModules.invalidate()
      utils.platform.getTenant.invalidate()
    },
  })

  return {
    list,
    filters,
    setFilters,
    suspend,
    activate,
    changePlan,
    toggleModule,
  }
}

export function useTenantDetail(tenantId: string) {
  const tenant = api.platform.getTenant.useQuery({ id: tenantId })
  const modules = api.platform.listTenantModules.useQuery({ tenantId })

  return {
    tenant,
    modules,
  }
}
```

---

### File 2.2: `src/hooks/use-tenant-wizard.ts`

**Purpose:** State management for 5-step tenant creation wizard

**Estimated Lines:** ~120

```typescript
'use client'

import { useState } from 'react'
import type { CreateTenantWizardState } from '@/types/platform-admin'
import { api } from '@/lib/trpc/react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

const INITIAL_STATE: CreateTenantWizardState = {
  step: 1,
  businessDetails: {
    businessName: '',
    domain: '',
    industry: '',
  },
  plan: 'TRIAL',
  adminUser: {
    email: '',
    firstName: '',
    lastName: '',
  },
  modules: [],
}

export function useTenantWizard() {
  const [state, setState] = useState<CreateTenantWizardState>(INITIAL_STATE)
  const router = useRouter()

  const createMutation = api.platform.createTenant.useMutation({
    onSuccess: (data) => {
      toast.success('Tenant created successfully')
      router.push(`/platform/tenants/${data.id}`)
    },
    onError: (error) => {
      toast.error(`Failed to create tenant: ${error.message}`)
    },
  })

  const nextStep = () => {
    if (state.step < 5) {
      setState((prev) => ({ ...prev, step: (prev.step + 1) as any }))
    }
  }

  const prevStep = () => {
    if (state.step > 1) {
      setState((prev) => ({ ...prev, step: (prev.step - 1) as any }))
    }
  }

  const updateBusinessDetails = (details: Partial<CreateTenantWizardState['businessDetails']>) => {
    setState((prev) => ({
      ...prev,
      businessDetails: { ...prev.businessDetails, ...details },
    }))
  }

  const updatePlan = (plan: CreateTenantWizardState['plan']) => {
    setState((prev) => ({ ...prev, plan }))
  }

  const updateAdminUser = (user: Partial<CreateTenantWizardState['adminUser']>) => {
    setState((prev) => ({
      ...prev,
      adminUser: { ...prev.adminUser, ...user },
    }))
  }

  const updateModules = (modules: string[]) => {
    setState((prev) => ({ ...prev, modules }))
  }

  const submit = () => {
    createMutation.mutate({
      businessName: state.businessDetails.businessName,
      domain: state.businessDetails.domain,
      email: state.adminUser.email,
      plan: state.plan,
      // Additional fields passed to backend
    })
  }

  const reset = () => {
    setState(INITIAL_STATE)
  }

  return {
    state,
    nextStep,
    prevStep,
    updateBusinessDetails,
    updatePlan,
    updateAdminUser,
    updateModules,
    submit,
    reset,
    isSubmitting: createMutation.isPending,
  }
}
```

---

### File 2.3: `src/hooks/use-platform-analytics.ts`

**Purpose:** Platform-wide analytics data fetching

**Estimated Lines:** ~80

```typescript
'use client'

import { api } from '@/lib/trpc/react'
import type { PlatformAnalyticsDateRange } from '@/types/platform-analytics'
import { useState } from 'react'

export function usePlatformAnalytics() {
  const [dateRange, setDateRange] = useState<PlatformAnalyticsDateRange>('30d')

  // TODO: Implement platform analytics procedures
  // For now, stub to make build pass
  const stubQuery = {
    data: undefined,
    isLoading: false,
    error: null,
  }

  const metrics = stubQuery
  const mrrData = stubQuery
  const tenantsByPlan = stubQuery
  const signupTrend = stubQuery
  const churnData = stubQuery

  return {
    dateRange,
    setDateRange,
    metrics,
    mrrData,
    tenantsByPlan,
    signupTrend,
    churnData,
  }
}
```

---

### File 2.4: `src/hooks/use-impersonate.ts`

**Purpose:** Tenant impersonation with audit logging

**Estimated Lines:** ~70

```typescript
'use client'

import { api } from '@/lib/trpc/react'
import { toast } from 'sonner'

export function useImpersonate() {
  const utils = api.useUtils()

  // TODO: Implement impersonate procedure in backend
  // This is a high-security action that needs:
  // 1. Backend procedure to create impersonation session
  // 2. Audit log entry
  // 3. Token generation for tenant context
  // 4. Redirect to tenant admin area

  const start = async (tenantId: string, tenantName: string) => {
    try {
      toast.info(`Impersonating ${tenantName}...`)
      
      // Call backend to create impersonation session
      // const session = await api.platform.impersonate.mutate({ tenantId })
      
      // Redirect to tenant admin with session token
      // window.location.href = `/admin?impersonate=${session.token}`
      
      toast.warning('Impersonate feature not yet implemented')
    } catch (error: any) {
      toast.error(`Impersonation failed: ${error.message}`)
    }
  }

  const end = () => {
    // Clear impersonation session
    // Redirect back to platform admin
    window.location.href = '/platform/tenants'
  }

  return {
    start,
    end,
  }
}
```

**Success Criteria:**
- All hooks compile with 0 tsc errors
- tRPC procedures match backend
- Toast notifications on mutations
- Proper state management patterns

---

## Wave 3: Platform Layout & Auth Guard (3 files)

**Parallel execution:** Files 3.1 and 3.2 in parallel, then 3.3

### File 3.1: `src/app/platform/layout.tsx`

**Purpose:** Platform admin layout with auth guard

**Estimated Lines:** ~120

```typescript
import { redirect } from "next/navigation"
import { withAuth } from "@workos-inc/authkit-nextjs"
import { db } from "@/shared/db"
import { users } from "@/shared/db/schemas/auth.schema"
import { eq } from "drizzle-orm"
import { PlatformSidebar } from "@/components/platform/platform-sidebar"
import { PlatformTopbar } from "@/components/platform/platform-topbar"

export default async function PlatformLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Require auth
  const { user: workosUser } = await withAuth({ ensureSignedIn: true })

  if (!workosUser) {
    redirect("/sign-in")
  }

  // Load user from DB and check isPlatformAdmin flag
  let isPlatformAdmin = false

  try {
    const result = await db
      .select({
        id: users.id,
        isPlatformAdmin: users.isPlatformAdmin,
      })
      .from(users)
      .where(eq(users.workosUserId, workosUser.id))
      .limit(1)

    const dbUser = result[0]

    if (!dbUser || !dbUser.isPlatformAdmin) {
      // Not a platform admin - redirect to tenant admin
      redirect("/admin")
    }

    isPlatformAdmin = true
  } catch {
    // DB error - deny access
    redirect("/admin")
  }

  const displayName = workosUser.firstName
    ? `${workosUser.firstName} ${workosUser.lastName ?? ""}`.trim()
    : workosUser.email

  const userForDisplay = {
    name: displayName,
    email: workosUser.email,
    imageUrl: workosUser.profilePictureUrl ?? null,
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <PlatformSidebar user={userForDisplay} />
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        <PlatformTopbar user={userForDisplay} />
        <main className="flex-1 overflow-y-auto" id="platform-content">
          {children}
        </main>
      </div>
    </div>
  )
}
```

**Key Features:**
- Platform admin flag check (`isPlatformAdmin = true`)
- Redirect non-platform admins to `/admin`
- Similar structure to admin layout
- Separate sidebar/topbar for platform context

---

### File 3.2: `src/components/platform/platform-sidebar.tsx`

**Purpose:** Platform admin navigation sidebar

**Estimated Lines:** ~140

```typescript
"use client"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Building2,
  BarChart3,
  Users,
  Settings,
  ChevronLeft,
  Shield,
} from "lucide-react"

interface NavItem {
  title: string
  href: string
  icon: any
}

const NAV_ITEMS: NavItem[] = [
  {
    title: "Tenants",
    href: "/platform/tenants",
    icon: Building2,
  },
  {
    title: "Analytics",
    href: "/platform/analytics",
    icon: BarChart3,
  },
  {
    title: "Platform Settings",
    href: "/platform/settings",
    icon: Settings,
  },
]

interface PlatformSidebarProps {
  user: {
    name: string
    email: string
    imageUrl?: string | null
  }
}

export function PlatformSidebar({ user }: PlatformSidebarProps) {
  const pathname = usePathname()

  return (
    <aside className="flex h-full w-[280px] flex-col border-r border-border bg-zinc-950 text-white">
      {/* Logo / Brand */}
      <div className="flex h-16 items-center gap-2 border-b border-zinc-800 px-6">
        <Shield className="h-6 w-6 text-primary" />
        <span className="text-lg font-semibold">Platform Admin</span>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-4 py-4">
        <nav className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')

            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full justify-start gap-3 text-zinc-400 hover:bg-zinc-800 hover:text-white",
                    isActive && "bg-zinc-800 text-white"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.title}
                </Button>
              </Link>
            )
          })}
        </nav>

        {/* Back to Tenant Admin */}
        <div className="mt-8 border-t border-zinc-800 pt-4">
          <Link href="/admin">
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-zinc-400 hover:bg-zinc-800 hover:text-white"
            >
              <ChevronLeft className="h-4 w-4" />
              Back to Admin
            </Button>
          </Link>
        </div>
      </ScrollArea>

      {/* User Profile */}
      <div className="border-t border-zinc-800 p-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={user.imageUrl ?? undefined} />
            <AvatarFallback>{user.name[0]}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user.name}</p>
            <p className="text-xs text-zinc-400 truncate">{user.email}</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
```

---

### File 3.3: `src/components/platform/platform-topbar.tsx`

**Purpose:** Platform admin topbar (breadcrumbs, actions)

**Estimated Lines:** ~80

```typescript
"use client"

import { Bell, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { signOut } from "@workos-inc/authkit-nextjs/server"

interface PlatformTopbarProps {
  user: {
    name: string
    email: string
    imageUrl?: string | null
  }
}

export function PlatformTopbar({ user }: PlatformTopbarProps) {
  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-background px-6">
      <div className="flex items-center gap-4">
        {/* Breadcrumbs or page title could go here */}
      </div>

      <div className="flex items-center gap-3">
        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
        </Button>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user.imageUrl ?? undefined} />
                <AvatarFallback>{user.name[0]}</AvatarFallback>
              </Avatar>
              <span className="hidden md:inline text-sm">{user.name}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem disabled>
              <span className="text-xs text-muted-foreground">{user.email}</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <form action={signOut}>
                <button type="submit" className="flex w-full items-center gap-2">
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
              </form>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
```

**Success Criteria:**
- Layout enforces platform admin access
- Non-platform admins redirected to `/admin`
- Sidebar navigation works
- Topbar displays user info
- Mobile responsive

---

## Wave 4: Tenant List & Detail Components (8 files)

**Parallel execution:** 2 sub-waves (4 + 4)

### Sub-Wave 4A: Tenant List (4 files)

#### File 4A.1: `src/components/platform/tenant-list-table.tsx`

**Purpose:** Table of all tenants with filters

**Estimated Lines:** ~250

```typescript
"use client"

import { usePlatformTenants } from "@/hooks/use-platform-tenants"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Building2, Search } from "lucide-react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { formatDistanceToNow } from "date-fns"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/ui/empty-state"

export function TenantListTable() {
  const { list, filters, setFilters } = usePlatformTenants()
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setFilters({ ...filters, search: searchQuery })
  }

  const handleRowClick = (tenantId: string) => {
    router.push(`/platform/tenants/${tenantId}`)
  }

  if (list.isLoading) {
    return <TenantListSkeleton />
  }

  if (list.error) {
    return (
      <div className="text-center py-8 text-destructive">
        Error loading tenants: {list.error.message}
      </div>
    )
  }

  const tenants = list.data?.tenants ?? []

  if (tenants.length === 0) {
    return (
      <EmptyState
        icon={Building2}
        title="No tenants found"
        description="No tenants match your current filters."
      />
    )
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-4">
        <form onSubmit={handleSearchSubmit} className="flex-1 flex gap-2">
          <Input
            placeholder="Search tenants..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-md"
          />
          <Button type="submit" variant="secondary">
            <Search className="h-4 w-4" />
          </Button>
        </form>

        <Select
          value={filters.plan ?? "all"}
          onValueChange={(value) => setFilters({ ...filters, plan: value === "all" ? undefined : value as any })}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All plans" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All plans</SelectItem>
            <SelectItem value="TRIAL">Trial</SelectItem>
            <SelectItem value="STARTER">Starter</SelectItem>
            <SelectItem value="PROFESSIONAL">Professional</SelectItem>
            <SelectItem value="ENTERPRISE">Enterprise</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.status ?? "all"}
          onValueChange={(value) => setFilters({ ...filters, status: value === "all" ? undefined : value as any })}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="SUSPENDED">Suspended</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Users</TableHead>
              <TableHead>Bookings</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tenants.map((tenant) => (
              <TableRow
                key={tenant.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleRowClick(tenant.id)}
              >
                <TableCell className="font-medium">{tenant.name}</TableCell>
                <TableCell>
                  <Badge variant="outline">{tenant.plan}</Badge>
                </TableCell>
                <TableCell>
                  <TenantStatusBadge status={tenant.status} />
                </TableCell>
                <TableCell>{tenant.userCount}</TableCell>
                <TableCell>{tenant.bookingCount}</TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDistanceToNow(new Date(tenant.createdAt), { addSuffix: true })}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {list.data?.hasMore && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={() => {
              // Load more logic
            }}
          >
            Load More
          </Button>
        </div>
      )}
    </div>
  )
}

function TenantStatusBadge({ status }: { status: string }) {
  const variants: Record<string, any> = {
    ACTIVE: { variant: "success", label: "Active" },
    SUSPENDED: { variant: "warning", label: "Suspended" },
    CANCELLED: { variant: "destructive", label: "Cancelled" },
    PENDING: { variant: "secondary", label: "Pending" },
  }

  const config = variants[status] ?? { variant: "secondary", label: status }

  return <Badge variant={config.variant}>{config.label}</Badge>
}

function TenantListSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <Skeleton className="h-10 flex-1 max-w-md" />
        <Skeleton className="h-10 w-[180px]" />
        <Skeleton className="h-10 w-[180px]" />
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Users</TableHead>
              <TableHead>Bookings</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(10)].map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
```

#### File 4A.2: `src/app/platform/tenants/page.tsx`

**Purpose:** Tenant list page

**Estimated Lines:** ~80

```typescript
import { Suspense } from "react"
import { TenantListTable } from "@/components/platform/tenant-list-table"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import Link from "next/link"
import { Skeleton } from "@/components/ui/skeleton"

export default function TenantsPage() {
  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tenants</h1>
          <p className="text-muted-foreground mt-1">
            Manage all tenants on the platform
          </p>
        </div>
        <Link href="/platform/tenants/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Create Tenant
          </Button>
        </Link>
      </div>

      {/* Tenant List */}
      <Suspense fallback={<Skeleton className="h-[600px] w-full" />}>
        <TenantListTable />
      </Suspense>
    </div>
  )
}
```

#### File 4A.3: `src/components/platform/tenant-stats-card.tsx`

**Purpose:** Reusable stat card for tenant metrics

**Estimated Lines:** ~60

```typescript
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { LucideIcon } from "lucide-react"

interface TenantStatsCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: LucideIcon
  trend?: {
    value: number
    isPositive: boolean
  }
  className?: string
}

export function TenantStatsCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  className,
}: TenantStatsCardProps) {
  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        )}
        {trend && (
          <p
            className={cn(
              "text-xs mt-1",
              trend.isPositive ? "text-green-600" : "text-red-600"
            )}
          >
            {trend.isPositive ? "+" : ""}{trend.value}% from last month
          </p>
        )}
      </CardContent>
    </Card>
  )
}
```

#### File 4A.4: `src/components/platform/index.ts`

**Purpose:** Barrel export for platform components

**Estimated Lines:** ~15

```typescript
export { TenantListTable } from './tenant-list-table'
export { TenantStatsCard } from './tenant-stats-card'
export { PlatformSidebar } from './platform-sidebar'
export { PlatformTopbar } from './platform-topbar'
// More exports will be added in subsequent waves
```

---

### Sub-Wave 4B: Tenant Detail (4 files)

#### File 4B.1: `src/components/platform/tenant-detail-header.tsx`

**Purpose:** Tenant profile header with key info and actions

**Estimated Lines:** ~120

```typescript
"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Building2, Power, PowerOff, UserCog } from "lucide-react"
import type { TenantDetail } from "@/types/platform-admin"
import { format } from "date-fns"
import { useImpersonate } from "@/hooks/use-impersonate"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"

interface TenantDetailHeaderProps {
  tenant: TenantDetail
  onSuspend: () => void
  onActivate: () => void
}

export function TenantDetailHeader({ tenant, onSuspend, onActivate }: TenantDetailHeaderProps) {
  const impersonate = useImpersonate()

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-lg border-2 border-primary bg-primary/10">
              <Building2 className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">{tenant.name}</h2>
              <p className="text-sm text-muted-foreground mt-1">{tenant.email}</p>
              {tenant.domain && (
                <p className="text-sm text-muted-foreground">{tenant.domain}</p>
              )}
              <div className="flex gap-2 mt-2">
                <Badge variant="outline">{tenant.plan}</Badge>
                <Badge variant={tenant.status === "ACTIVE" ? "success" : "warning"}>
                  {tenant.status}
                </Badge>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            {/* Impersonate Button */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <UserCog className="h-4 w-4" />
                  Impersonate
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Impersonate Tenant</AlertDialogTitle>
                  <AlertDialogDescription>
                    You are about to login as an admin for {tenant.name}. This action will be logged in the audit trail.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => impersonate.start(tenant.id, tenant.name)}
                  >
                    Confirm
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            {/* Suspend/Activate Toggle */}
            {tenant.status === "ACTIVE" ? (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="gap-2">
                    <PowerOff className="h-4 w-4" />
                    Suspend
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Suspend Tenant</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will immediately block all access for {tenant.name}. Users will not be able to login.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={onSuspend}>
                      Suspend
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : (
              <Button variant="default" className="gap-2" onClick={onActivate}>
                <Power className="h-4 w-4" />
                Activate
              </Button>
            )}
          </div>
        </div>

        {/* Metadata */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t">
          <div>
            <p className="text-xs text-muted-foreground">Created</p>
            <p className="text-sm font-medium mt-1">
              {format(new Date(tenant.createdAt), "MMM d, yyyy")}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Users</p>
            <p className="text-sm font-medium mt-1">{tenant.userCount}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Bookings</p>
            <p className="text-sm font-medium mt-1">{tenant.bookingCount}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">MRR</p>
            <p className="text-sm font-medium mt-1">${tenant.billing.mrr}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
```

#### File 4B.2: `src/components/platform/tenant-usage-card.tsx`

**Purpose:** Display tenant usage stats with progress bars

**Estimated Lines:** ~100

```typescript
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import type { TenantDetail } from "@/types/platform-admin"

interface TenantUsageCardProps {
  usage: TenantDetail['usage']
}

export function TenantUsageCard({ usage }: TenantUsageCardProps) {
  const storagePercent = (usage.storageUsedMB / usage.storageQuotaMB) * 100
  const apiPercent = (usage.apiCallsThisMonth / usage.apiQuota) * 100

  return (
    <Card>
      <CardHeader>
        <CardTitle>Usage This Month</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Bookings */}
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted-foreground">Bookings</span>
            <span className="font-medium">{usage.bookingsThisMonth}</span>
          </div>
        </div>

        {/* Active Users */}
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted-foreground">Active Users</span>
            <span className="font-medium">{usage.activeUsers}</span>
          </div>
        </div>

        {/* Storage */}
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted-foreground">Storage</span>
            <span className="font-medium">
              {usage.storageUsedMB} MB / {usage.storageQuotaMB} MB
            </span>
          </div>
          <Progress value={storagePercent} className="h-2" />
        </div>

        {/* API Calls */}
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted-foreground">API Calls</span>
            <span className="font-medium">
              {usage.apiCallsThisMonth.toLocaleString()} / {usage.apiQuota.toLocaleString()}
            </span>
          </div>
          <Progress value={apiPercent} className="h-2" />
        </div>
      </CardContent>
    </Card>
  )
}
```

#### File 4B.3: `src/components/platform/tenant-modules-card.tsx`

**Purpose:** Module enable/disable toggles

**Estimated Lines:** ~120

```typescript
"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import type { TenantModuleStatus } from "@/types/platform-admin"
import { usePlatformTenants } from "@/hooks/use-platform-tenants"
import { toast } from "sonner"

interface TenantModulesCardProps {
  tenantId: string
  modules: TenantModuleStatus[]
}

export function TenantModulesCard({ tenantId, modules }: TenantModulesCardProps) {
  const { toggleModule } = usePlatformTenants()

  const handleToggle = (moduleId: string, currentState: boolean) => {
    toggleModule.mutate(
      {
        tenantId,
        moduleId,
        isEnabled: !currentState,
      },
      {
        onSuccess: () => {
          toast.success(`Module ${!currentState ? "enabled" : "disabled"}`)
        },
        onError: (error) => {
          toast.error(`Failed to toggle module: ${error.message}`)
        },
      }
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Modules</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {modules.map((module) => (
            <div
              key={module.moduleId}
              className="flex items-start justify-between gap-4 p-3 rounded-lg border"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium">{module.name}</p>
                  {module.isPremium && (
                    <Badge variant="secondary" className="text-xs">
                      Premium
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {module.description}
                </p>
                {module.monthlyRate && (
                  <p className="text-xs text-muted-foreground mt-1">
                    ${module.monthlyRate}/month
                  </p>
                )}
              </div>
              <Switch
                checked={module.isEnabled}
                onCheckedChange={() => handleToggle(module.moduleId, module.isEnabled)}
                disabled={toggleModule.isPending}
              />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
```

#### File 4B.4: `src/app/platform/tenants/[id]/page.tsx`

**Purpose:** Tenant detail page

**Estimated Lines:** ~120

```typescript
import { Suspense } from "react"
import { notFound } from "next/navigation"
import { TenantDetailHeader } from "@/components/platform/tenant-detail-header"
import { TenantUsageCard } from "@/components/platform/tenant-usage-card"
import { TenantModulesCard } from "@/components/platform/tenant-modules-card"
import { Skeleton } from "@/components/ui/skeleton"
import { TenantDetailContent } from "@/components/platform/tenant-detail-content"

interface TenantDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function TenantDetailPage({ params }: TenantDetailPageProps) {
  const { id } = await params

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <Suspense fallback={<TenantDetailSkeleton />}>
        <TenantDetailContent tenantId={id} />
      </Suspense>
    </div>
  )
}

function TenantDetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-48 w-full" />
      <div className="grid gap-6 md:grid-cols-2">
        <Skeleton className="h-80 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    </div>
  )
}
```

**Success Criteria:**
- All components render correctly
- Filters work on tenant list
- Row click navigates to detail
- Module toggles update with optimistic UI
- Suspend/activate buttons work
- Impersonate shows confirmation dialog

---

## Wave 5: Tenant Creation Wizard (6 files)

**Parallel execution:** 2 sub-waves (3 + 3)

### Sub-Wave 5A: Wizard Steps 1-3 (3 files)

#### File 5A.1: `src/components/platform/wizard/step1-business-details.tsx`

**Purpose:** Step 1 - Business name, domain, industry

**Estimated Lines:** ~140

```typescript
"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import type { CreateTenantWizardState } from "@/types/platform-admin"
import { businessDetailsSchema } from "@/schemas/platform-admin.schemas"
import { useState } from "react"

const INDUSTRIES = [
  "Healthcare",
  "Professional Services",
  "Beauty & Wellness",
  "Home Services",
  "Education",
  "Fitness",
  "Automotive",
  "Real Estate",
  "Other",
]

interface Step1Props {
  data: CreateTenantWizardState['businessDetails']
  onUpdate: (data: Partial<CreateTenantWizardState['businessDetails']>) => void
  onNext: () => void
}

export function Step1BusinessDetails({ data, onUpdate, onNext }: Step1Props) {
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleNext = () => {
    // Validate
    const result = businessDetailsSchema.safeParse(data)
    if (!result.success) {
      const newErrors: Record<string, string> = {}
      result.error.issues.forEach((issue) => {
        newErrors[issue.path[0] as string] = issue.message
      })
      setErrors(newErrors)
      return
    }

    setErrors({})
    onNext()
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Business Details</h2>
        <p className="text-muted-foreground mt-1">
          Enter the basic information for the new tenant
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tenant Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="businessName">
              Business Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="businessName"
              value={data.businessName}
              onChange={(e) => onUpdate({ businessName: e.target.value })}
              placeholder="Acme Corp"
              error={!!errors.businessName}
            />
            {errors.businessName && (
              <p className="text-sm text-destructive">{errors.businessName}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="domain">
              Domain Slug <span className="text-destructive">*</span>
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="domain"
                value={data.domain}
                onChange={(e) => onUpdate({ domain: e.target.value.toLowerCase() })}
                placeholder="acme"
                error={!!errors.domain}
                className="flex-1"
              />
              <span className="text-sm text-muted-foreground">.yourplatform.com</span>
            </div>
            {errors.domain && (
              <p className="text-sm text-destructive">{errors.domain}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Lowercase letters, numbers, and hyphens only
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="industry">
              Industry <span className="text-destructive">*</span>
            </Label>
            <Select value={data.industry} onValueChange={(value) => onUpdate({ industry: value })}>
              <SelectTrigger id="industry" error={!!errors.industry}>
                <SelectValue placeholder="Select industry" />
              </SelectTrigger>
              <SelectContent>
                {INDUSTRIES.map((industry) => (
                  <SelectItem key={industry} value={industry}>
                    {industry}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.industry && (
              <p className="text-sm text-destructive">{errors.industry}</p>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleNext} size="lg">
          Continue
        </Button>
      </div>
    </div>
  )
}
```

#### File 5A.2: `src/components/platform/wizard/step2-select-plan.tsx`

**Purpose:** Step 2 - Plan selection with feature comparison

**Estimated Lines:** ~180

```typescript
"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"
import type { CreateTenantWizardState } from "@/types/platform-admin"

const PLANS = [
  {
    id: "TRIAL" as const,
    name: "Trial",
    price: "$0",
    period: "14 days",
    features: [
      "Up to 50 bookings",
      "2 team members",
      "Basic support",
      "Core modules only",
    ],
  },
  {
    id: "STARTER" as const,
    name: "Starter",
    price: "$29",
    period: "per month",
    features: [
      "Up to 500 bookings/month",
      "5 team members",
      "Email support",
      "All core modules",
      "1GB storage",
    ],
  },
  {
    id: "PROFESSIONAL" as const,
    name: "Professional",
    price: "$99",
    period: "per month",
    popular: true,
    features: [
      "Unlimited bookings",
      "Unlimited team members",
      "Priority support",
      "All modules included",
      "10GB storage",
      "Custom branding",
      "Advanced analytics",
    ],
  },
  {
    id: "ENTERPRISE" as const,
    name: "Enterprise",
    price: "Custom",
    period: "contact sales",
    features: [
      "Everything in Professional",
      "Dedicated support",
      "SLA guarantee",
      "Unlimited storage",
      "White-label options",
      "Custom integrations",
    ],
  },
]

interface Step2Props {
  selectedPlan: CreateTenantWizardState['plan']
  onSelect: (plan: CreateTenantWizardState['plan']) => void
  onNext: () => void
  onBack: () => void
}

export function Step2SelectPlan({ selectedPlan, onSelect, onNext, onBack }: Step2Props) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Select Plan</h2>
        <p className="text-muted-foreground mt-1">
          Choose the subscription plan for this tenant
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {PLANS.map((plan) => (
          <Card
            key={plan.id}
            className={cn(
              "cursor-pointer transition-all hover:shadow-lg relative",
              selectedPlan === plan.id && "ring-2 ring-primary"
            )}
            onClick={() => onSelect(plan.id)}
          >
            {plan.popular && (
              <Badge className="absolute -top-2 left-1/2 -translate-x-1/2" variant="default">
                Popular
              </Badge>
            )}
            <CardHeader>
              <CardTitle className="text-lg">{plan.name}</CardTitle>
              <div className="mt-2">
                <span className="text-3xl font-bold">{plan.price}</span>
                <span className="text-sm text-muted-foreground ml-1">
                  {plan.period}
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex justify-between">
        <Button onClick={onBack} variant="outline" size="lg">
          Back
        </Button>
        <Button onClick={onNext} size="lg" disabled={!selectedPlan}>
          Continue
        </Button>
      </div>
    </div>
  )
}
```

#### File 5A.3: `src/components/platform/wizard/step3-admin-user.tsx`

**Purpose:** Step 3 - Admin user email and name

**Estimated Lines:** ~120

```typescript
"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import type { CreateTenantWizardState } from "@/types/platform-admin"
import { adminUserSchema } from "@/schemas/platform-admin.schemas"
import { useState } from "react"

interface Step3Props {
  data: CreateTenantWizardState['adminUser']
  onUpdate: (data: Partial<CreateTenantWizardState['adminUser']>) => void
  onNext: () => void
  onBack: () => void
}

export function Step3AdminUser({ data, onUpdate, onNext, onBack }: Step3Props) {
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleNext = () => {
    const result = adminUserSchema.safeParse(data)
    if (!result.success) {
      const newErrors: Record<string, string> = {}
      result.error.issues.forEach((issue) => {
        newErrors[issue.path[0] as string] = issue.message
      })
      setErrors(newErrors)
      return
    }

    setErrors({})
    onNext()
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Admin User</h2>
        <p className="text-muted-foreground mt-1">
          Create the initial admin account for this tenant
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>User Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">
              Email Address <span className="text-destructive">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              value={data.email}
              onChange={(e) => onUpdate({ email: e.target.value })}
              placeholder="admin@acme.com"
              error={!!errors.email}
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email}</p>
            )}
            <p className="text-xs text-muted-foreground">
              A WorkOS invite will be sent to this email
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="firstName">
                First Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="firstName"
                value={data.firstName}
                onChange={(e) => onUpdate({ firstName: e.target.value })}
                placeholder="John"
                error={!!errors.firstName}
              />
              {errors.firstName && (
                <p className="text-sm text-destructive">{errors.firstName}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastName">
                Last Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="lastName"
                value={data.lastName}
                onChange={(e) => onUpdate({ lastName: e.target.value })}
                placeholder="Doe"
                error={!!errors.lastName}
              />
              {errors.lastName && (
                <p className="text-sm text-destructive">{errors.lastName}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button onClick={onBack} variant="outline" size="lg">
          Back
        </Button>
        <Button onClick={handleNext} size="lg">
          Continue
        </Button>
      </div>
    </div>
  )
}
```

---

### Sub-Wave 5B: Wizard Steps 4-5 (3 files)

#### File 5B.1: `src/components/platform/wizard/step4-select-modules.tsx`

**Purpose:** Step 4 - Module selection with checkboxes

**Estimated Lines:** ~140

```typescript
"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import type { CreateTenantWizardState } from "@/types/platform-admin"

// In real implementation, fetch from backend
const AVAILABLE_MODULES = [
  {
    id: "booking-core",
    name: "Booking Management",
    description: "Core booking and scheduling functionality",
    isPremium: false,
    required: true,
  },
  {
    id: "customer-mgmt",
    name: "Customer Management",
    description: "Customer profiles, notes, and history",
    isPremium: false,
    required: true,
  },
  {
    id: "team-mgmt",
    name: "Team Management",
    description: "Staff scheduling and availability",
    isPremium: false,
    required: false,
  },
  {
    id: "workflows",
    name: "Workflow Automation",
    description: "Automated workflows and notifications",
    isPremium: true,
    required: false,
  },
  {
    id: "analytics",
    name: "Advanced Analytics",
    description: "Insights, reports, and dashboards",
    isPremium: true,
    required: false,
  },
  {
    id: "forms",
    name: "Custom Forms",
    description: "Create and embed custom forms",
    isPremium: false,
    required: false,
  },
]

interface Step4Props {
  selectedModules: string[]
  onUpdate: (modules: string[]) => void
  onNext: () => void
  onBack: () => void
}

export function Step4SelectModules({ selectedModules, onUpdate, onNext, onBack }: Step4Props) {
  const handleToggle = (moduleId: string, checked: boolean) => {
    if (checked) {
      onUpdate([...selectedModules, moduleId])
    } else {
      onUpdate(selectedModules.filter((id) => id !== moduleId))
    }
  }

  const requiredModules = AVAILABLE_MODULES.filter((m) => m.required).map((m) => m.id)
  const allSelected = [...new Set([...selectedModules, ...requiredModules])]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Select Modules</h2>
        <p className="text-muted-foreground mt-1">
          Choose which features to enable for this tenant
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Available Modules</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {AVAILABLE_MODULES.map((module) => (
            <div
              key={module.id}
              className="flex items-start gap-3 p-3 rounded-lg border"
            >
              <Checkbox
                id={module.id}
                checked={allSelected.includes(module.id)}
                onCheckedChange={(checked) =>
                  handleToggle(module.id, checked as boolean)
                }
                disabled={module.required}
              />
              <div className="flex-1">
                <Label
                  htmlFor={module.id}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <span className="font-medium">{module.name}</span>
                  {module.isPremium && (
                    <Badge variant="secondary" className="text-xs">
                      Premium
                    </Badge>
                  )}
                  {module.required && (
                    <Badge variant="outline" className="text-xs">
                      Required
                    </Badge>
                  )}
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  {module.description}
                </p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button onClick={onBack} variant="outline" size="lg">
          Back
        </Button>
        <Button onClick={onNext} size="lg" disabled={allSelected.length === 0}>
          Continue
        </Button>
      </div>
    </div>
  )
}
```

#### File 5B.2: `src/components/platform/wizard/step5-confirm.tsx`

**Purpose:** Step 5 - Review and confirm all details

**Estimated Lines:** ~140

```typescript
"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import type { CreateTenantWizardState } from "@/types/platform-admin"
import { Check } from "lucide-react"

interface Step5Props {
  state: CreateTenantWizardState
  onSubmit: () => void
  onBack: () => void
  isSubmitting: boolean
}

export function Step5Confirm({ state, onSubmit, onBack, isSubmitting }: Step5Props) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Review & Confirm</h2>
        <p className="text-muted-foreground mt-1">
          Please review all details before creating the tenant
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Business Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Business Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-xs text-muted-foreground">Business Name</p>
              <p className="font-medium">{state.businessDetails.businessName}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Domain</p>
              <p className="font-medium">{state.businessDetails.domain}.yourplatform.com</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Industry</p>
              <p className="font-medium">{state.businessDetails.industry}</p>
            </div>
          </CardContent>
        </Card>

        {/* Plan */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Plan & Admin</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-xs text-muted-foreground">Plan</p>
              <Badge variant="outline" className="mt-1">{state.plan}</Badge>
            </div>
            <Separator />
            <div>
              <p className="text-xs text-muted-foreground">Admin User</p>
              <p className="font-medium">
                {state.adminUser.firstName} {state.adminUser.lastName}
              </p>
              <p className="text-sm text-muted-foreground">{state.adminUser.email}</p>
            </div>
          </CardContent>
        </Card>

        {/* Modules */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Enabled Modules ({state.modules.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 md:grid-cols-3">
              {state.modules.map((moduleId) => (
                <div key={moduleId} className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-primary" />
                  <span>{moduleId}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-between">
        <Button onClick={onBack} variant="outline" size="lg" disabled={isSubmitting}>
          Back
        </Button>
        <Button onClick={onSubmit} size="lg" loading={isSubmitting}>
          {isSubmitting ? "Creating Tenant..." : "Create Tenant"}
        </Button>
      </div>
    </div>
  )
}
```

#### File 5B.3: `src/components/platform/wizard/wizard-progress.tsx`

**Purpose:** Progress indicator for wizard steps

**Estimated Lines:** ~80

```typescript
import { cn } from "@/lib/utils"
import { Check } from "lucide-react"

const STEPS = [
  { id: 1, name: "Business" },
  { id: 2, name: "Plan" },
  { id: 3, name: "Admin" },
  { id: 4, name: "Modules" },
  { id: 5, name: "Confirm" },
]

interface WizardProgressProps {
  currentStep: number
}

export function WizardProgress({ currentStep }: WizardProgressProps) {
  return (
    <nav aria-label="Progress">
      <ol className="flex items-center justify-center gap-2 md:gap-4">
        {STEPS.map((step, index) => (
          <li key={step.id} className="flex items-center">
            {/* Step Circle */}
            <div className="flex items-center">
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-semibold transition-colors",
                  currentStep > step.id
                    ? "border-primary bg-primary text-primary-foreground"
                    : currentStep === step.id
                    ? "border-primary text-primary"
                    : "border-muted-foreground/30 text-muted-foreground"
                )}
              >
                {currentStep > step.id ? (
                  <Check className="h-5 w-5" />
                ) : (
                  step.id
                )}
              </div>
              <span
                className={cn(
                  "ml-2 text-sm font-medium hidden md:inline",
                  currentStep === step.id ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {step.name}
              </span>
            </div>

            {/* Connector Line */}
            {index < STEPS.length - 1 && (
              <div
                className={cn(
                  "mx-2 h-0.5 w-8 md:w-12 transition-colors",
                  currentStep > step.id ? "bg-primary" : "bg-muted-foreground/30"
                )}
              />
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
```

---

## Wave 6: Wizard Page & Orchestration (2 files)

**Sequential execution:** File 6.1 first, then 6.2

### File 6.1: `src/components/platform/tenant-wizard.tsx`

**Purpose:** Wizard orchestrator component

**Estimated Lines:** ~120

```typescript
"use client"

import { useTenantWizard } from "@/hooks/use-tenant-wizard"
import { WizardProgress } from "./wizard/wizard-progress"
import { Step1BusinessDetails } from "./wizard/step1-business-details"
import { Step2SelectPlan } from "./wizard/step2-select-plan"
import { Step3AdminUser } from "./wizard/step3-admin-user"
import { Step4SelectModules } from "./wizard/step4-select-modules"
import { Step5Confirm } from "./wizard/step5-confirm"

export function TenantWizard() {
  const wizard = useTenantWizard()

  return (
    <div className="space-y-8">
      <WizardProgress currentStep={wizard.state.step} />

      <div className="max-w-4xl mx-auto">
        {wizard.state.step === 1 && (
          <Step1BusinessDetails
            data={wizard.state.businessDetails}
            onUpdate={wizard.updateBusinessDetails}
            onNext={wizard.nextStep}
          />
        )}

        {wizard.state.step === 2 && (
          <Step2SelectPlan
            selectedPlan={wizard.state.plan}
            onSelect={wizard.updatePlan}
            onNext={wizard.nextStep}
            onBack={wizard.prevStep}
          />
        )}

        {wizard.state.step === 3 && (
          <Step3AdminUser
            data={wizard.state.adminUser}
            onUpdate={wizard.updateAdminUser}
            onNext={wizard.nextStep}
            onBack={wizard.prevStep}
          />
        )}

        {wizard.state.step === 4 && (
          <Step4SelectModules
            selectedModules={wizard.state.modules}
            onUpdate={wizard.updateModules}
            onNext={wizard.nextStep}
            onBack={wizard.prevStep}
          />
        )}

        {wizard.state.step === 5 && (
          <Step5Confirm
            state={wizard.state}
            onSubmit={wizard.submit}
            onBack={wizard.prevStep}
            isSubmitting={wizard.isSubmitting}
          />
        )}
      </div>
    </div>
  )
}
```

---

### File 6.2: `src/app/platform/tenants/new/page.tsx`

**Purpose:** Create tenant page

**Estimated Lines:** ~50

```typescript
import { TenantWizard } from "@/components/platform/tenant-wizard"

export default function CreateTenantPage() {
  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Create Tenant</h1>
        <p className="text-muted-foreground mt-1">
          Set up a new tenant organization on the platform
        </p>
      </div>

      <TenantWizard />
    </div>
  )
}
```

**Success Criteria:**
- Wizard steps advance/retreat correctly
- Form validation works on each step
- Progress indicator updates
- Final submission calls backend
- Redirects to tenant detail on success

---

## Wave 7: Platform Analytics (6 files)

**Parallel execution:** 2 sub-waves (3 + 3)

### Sub-Wave 7A: Analytics Components (3 files)

#### File 7A.1: `src/components/platform/analytics/mrr-chart.tsx`

**Purpose:** Monthly recurring revenue chart

**Estimated Lines:** ~120

```typescript
"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import type { PlatformMRRData } from "@/types/platform-analytics"
import { Skeleton } from "@/components/ui/skeleton"

interface MRRChartProps {
  data: PlatformMRRData | undefined
  isLoading: boolean
}

export function MRRChart({ data, isLoading }: MRRChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Monthly Recurring Revenue</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    )
  }

  if (!data) {
    return null
  }

  const changePercent = data.change.toFixed(1)
  const isPositive = data.change > 0

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Monthly Recurring Revenue</CardTitle>
            <p className="text-2xl font-bold mt-2">
              ${data.currentMRR.toLocaleString()}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">vs last month</p>
            <p className={isPositive ? "text-green-600" : "text-red-600"}>
              {isPositive ? "+" : ""}{changePercent}%
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data.chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip
              formatter={(value: number) => `$${value.toLocaleString()}`}
            />
            <Line
              type="monotone"
              dataKey="mrr"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
```

#### File 7A.2: `src/components/platform/analytics/tenants-by-plan-chart.tsx`

**Purpose:** Pie chart showing tenant distribution by plan

**Estimated Lines:** ~100

```typescript
"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts"
import type { TenantsByPlanData } from "@/types/platform-analytics"
import { Skeleton } from "@/components/ui/skeleton"

const PLAN_COLORS: Record<string, string> = {
  TRIAL: "#94a3b8",
  STARTER: "#60a5fa",
  PROFESSIONAL: "#8b5cf6",
  ENTERPRISE: "#f59e0b",
}

interface TenantsByPlanChartProps {
  data: TenantsByPlanData[] | undefined
  isLoading: boolean
}

export function TenantsByPlanChart({ data, isLoading }: TenantsByPlanChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tenants by Plan</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    )
  }

  if (!data || data.length === 0) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tenants by Plan</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              dataKey="count"
              nameKey="plan"
              cx="50%"
              cy="50%"
              outerRadius={80}
              label={(entry) => `${entry.plan}: ${entry.count}`}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={PLAN_COLORS[entry.plan] ?? "#888"} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
```

#### File 7A.3: `src/components/platform/analytics/signup-trend-chart.tsx`

**Purpose:** Line chart showing new signups over time

**Estimated Lines:** ~110

```typescript
"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"
import type { SignupTrendData } from "@/types/platform-analytics"
import { Skeleton } from "@/components/ui/skeleton"

interface SignupTrendChartProps {
  data: SignupTrendData[] | undefined
  isLoading: boolean
}

export function SignupTrendChart({ data, isLoading }: SignupTrendChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Signup Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    )
  }

  if (!data || data.length === 0) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Signup Trend</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="signups"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              name="Signups"
            />
            <Line
              type="monotone"
              dataKey="conversions"
              stroke="hsl(var(--success))"
              strokeWidth={2}
              name="Conversions"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
```

---

### Sub-Wave 7B: Analytics Page & Metrics (3 files)

#### File 7B.1: `src/components/platform/analytics/platform-metrics-cards.tsx`

**Purpose:** KPI cards for platform metrics

**Estimated Lines:** ~100

```typescript
"use client"

import { TenantStatsCard } from "../tenant-stats-card"
import { Building2, TrendingUp, DollarSign, AlertTriangle } from "lucide-react"
import type { PlatformMetrics } from "@/types/platform-analytics"
import { Skeleton } from "@/components/ui/skeleton"

interface PlatformMetricsCardsProps {
  metrics: PlatformMetrics | undefined
  isLoading: boolean
}

export function PlatformMetricsCards({ metrics, isLoading }: PlatformMetricsCardsProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    )
  }

  if (!metrics) {
    return null
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <TenantStatsCard
        title="Total Tenants"
        value={metrics.totalTenants}
        subtitle={`${metrics.activeTenants} active`}
        icon={Building2}
        trend={{
          value: metrics.growthRate,
          isPositive: metrics.growthRate > 0,
        }}
      />

      <TenantStatsCard
        title="MRR"
        value={`$${metrics.mrr.toLocaleString()}`}
        subtitle={`$${metrics.arr.toLocaleString()} ARR`}
        icon={DollarSign}
      />

      <TenantStatsCard
        title="Avg Revenue/Tenant"
        value={`$${metrics.averageRevenuePerTenant.toFixed(0)}`}
        subtitle="per month"
        icon={TrendingUp}
      />

      <TenantStatsCard
        title="Churn Rate"
        value={`${metrics.churnRate.toFixed(1)}%`}
        subtitle="last 30 days"
        icon={AlertTriangle}
        trend={{
          value: metrics.churnRate,
          isPositive: false,
        }}
      />
    </div>
  )
}
```

#### File 7B.2: `src/components/platform/analytics/churn-table.tsx`

**Purpose:** Table of recently churned tenants

**Estimated Lines:** ~90

```typescript
"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import type { ChurnData } from "@/types/platform-analytics"
import { format } from "date-fns"
import { Skeleton } from "@/components/ui/skeleton"

interface ChurnTableProps {
  data: ChurnData | undefined
  isLoading: boolean
}

export function ChurnTable({ data, isLoading }: ChurnTableProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recently Churned Tenants</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[200px] w-full" />
        </CardContent>
      </Card>
    )
  }

  if (!data || data.churnedTenants.length === 0) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Recently Churned Tenants</CardTitle>
          <Badge variant="warning">
            {data.currentChurnRate.toFixed(1)}% churn rate
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Churned Date</TableHead>
              <TableHead>Reason</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.churnedTenants.map((tenant) => (
              <TableRow key={tenant.id}>
                <TableCell className="font-medium">{tenant.name}</TableCell>
                <TableCell>
                  <Badge variant="outline">{tenant.plan}</Badge>
                </TableCell>
                <TableCell>
                  {format(new Date(tenant.churnedAt), "MMM d, yyyy")}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {tenant.reason ?? "-"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
```

#### File 7B.3: `src/app/platform/analytics/page.tsx`

**Purpose:** Platform analytics dashboard page

**Estimated Lines:** ~80

```typescript
"use client"

import { usePlatformAnalytics } from "@/hooks/use-platform-analytics"
import { PlatformMetricsCards } from "@/components/platform/analytics/platform-metrics-cards"
import { MRRChart } from "@/components/platform/analytics/mrr-chart"
import { TenantsByPlanChart } from "@/components/platform/analytics/tenants-by-plan-chart"
import { SignupTrendChart } from "@/components/platform/analytics/signup-trend-chart"
import { ChurnTable } from "@/components/platform/analytics/churn-table"
import { DateRangePicker } from "@/components/analytics/date-range-picker"

export default function PlatformAnalyticsPage() {
  const analytics = usePlatformAnalytics()

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Platform Analytics</h1>
          <p className="text-muted-foreground mt-1">
            Monitor platform-wide performance and trends
          </p>
        </div>
        {/* Date range picker can be added here */}
      </div>

      <div className="space-y-6">
        {/* KPI Cards */}
        <PlatformMetricsCards
          metrics={analytics.metrics.data}
          isLoading={analytics.metrics.isLoading}
        />

        {/* MRR Chart */}
        <MRRChart
          data={analytics.mrrData.data}
          isLoading={analytics.mrrData.isLoading}
        />

        {/* Two-column charts */}
        <div className="grid gap-6 md:grid-cols-2">
          <TenantsByPlanChart
            data={analytics.tenantsByPlan.data}
            isLoading={analytics.tenantsByPlan.isLoading}
          />
          <SignupTrendChart
            data={analytics.signupTrend.data}
            isLoading={analytics.signupTrend.isLoading}
          />
        </div>

        {/* Churn Table */}
        <ChurnTable
          data={analytics.churnData.data}
          isLoading={analytics.churnData.isLoading}
        />
      </div>
    </div>
  )
}
```

**Success Criteria:**
- All charts render with stub data
- KPI cards display metrics
- Date range picker filters data (when implemented)
- Responsive layout on mobile
- Loading skeletons work

---

## Wave 8: Testing (4 test files)

**Parallel execution:** All 4 test files can be created simultaneously

### File 8.1: `src/components/platform/__tests__/tenant-list-table.test.tsx`

**Purpose:** Test tenant list table filtering and navigation

**Estimated Lines:** ~120

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TenantListTable } from '../tenant-list-table'

// Mock hooks
vi.mock('@/hooks/use-platform-tenants', () => ({
  usePlatformTenants: () => ({
    list: {
      data: {
        tenants: [
          {
            id: '1',
            name: 'Acme Corp',
            plan: 'PROFESSIONAL',
            status: 'ACTIVE',
            userCount: 5,
            bookingCount: 120,
            createdAt: new Date('2024-01-01'),
          },
        ],
        hasMore: false,
      },
      isLoading: false,
      error: null,
    },
    filters: {},
    setFilters: vi.fn(),
  }),
}))

describe('TenantListTable', () => {
  it('renders tenant list correctly', () => {
    render(<TenantListTable />)
    expect(screen.getByText('Acme Corp')).toBeInTheDocument()
  })

  it('filters by plan', () => {
    // Test plan filter
  })

  it('filters by status', () => {
    // Test status filter
  })

  it('searches tenants', () => {
    // Test search
  })

  it('navigates to tenant detail on row click', () => {
    // Test navigation
  })
})
```

### File 8.2: `src/hooks/__tests__/use-tenant-wizard.test.ts`

**Purpose:** Test wizard state management

**Estimated Lines:** ~100

```typescript
import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useTenantWizard } from '../use-tenant-wizard'

describe('useTenantWizard', () => {
  it('initializes with step 1', () => {
    const { result } = renderHook(() => useTenantWizard())
    expect(result.current.state.step).toBe(1)
  })

  it('advances to next step', () => {
    const { result } = renderHook(() => useTenantWizard())
    act(() => {
      result.current.nextStep()
    })
    expect(result.current.state.step).toBe(2)
  })

  it('goes back to previous step', () => {
    const { result } = renderHook(() => useTenantWizard())
    act(() => {
      result.current.nextStep()
      result.current.prevStep()
    })
    expect(result.current.state.step).toBe(1)
  })

  it('updates business details', () => {
    const { result } = renderHook(() => useTenantWizard())
    act(() => {
      result.current.updateBusinessDetails({ businessName: 'Test Co' })
    })
    expect(result.current.state.businessDetails.businessName).toBe('Test Co')
  })

  it('resets wizard state', () => {
    const { result } = renderHook(() => useTenantWizard())
    act(() => {
      result.current.nextStep()
      result.current.reset()
    })
    expect(result.current.state.step).toBe(1)
  })
})
```

### File 8.3: `src/components/platform/__tests__/tenant-wizard.test.tsx`

**Purpose:** Test wizard component integration

**Estimated Lines:** ~90

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TenantWizard } from '../tenant-wizard'

describe('TenantWizard', () => {
  it('renders step 1 initially', () => {
    render(<TenantWizard />)
    expect(screen.getByText('Business Details')).toBeInTheDocument()
  })

  it('shows progress indicator', () => {
    render(<TenantWizard />)
    // Check progress component renders
  })

  it('validates step 1 before advancing', () => {
    // Test form validation
  })

  it('submits complete tenant data', () => {
    // Test final submission
  })
})
```

### File 8.4: `src/app/platform/__tests__/platform-analytics.test.tsx`

**Purpose:** Test platform analytics page

**Estimated Lines:** ~80

```typescript
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import PlatformAnalyticsPage from '../../analytics/page'

describe('PlatformAnalyticsPage', () => {
  it('renders analytics dashboard', () => {
    render(<PlatformAnalyticsPage />)
    expect(screen.getByText('Platform Analytics')).toBeInTheDocument()
  })

  it('displays KPI cards', () => {
    // Test KPI rendering
  })

  it('renders MRR chart', () => {
    // Test chart rendering
  })

  it('shows loading skeletons', () => {
    // Test loading states
  })
})
```

**Success Criteria:**
- All tests pass
- Coverage >80% for new code
- Test hooks, components, and pages
- Mock tRPC calls appropriately

---

## Wave 9: Sidebar Navigation Integration (1 file)

### File 9.1: Update `src/components/layout/nav-config.ts`

**Purpose:** Add platform admin link to admin sidebar (for platform admins only)

**Estimated Lines:** ~15 additions

```typescript
// Add to NAV_CONFIG array:
{
  title: "Platform",
  items: [
    {
      title: "Platform Admin",
      href: "/platform/tenants",
      icon: Shield,
      requiresPlatformAdmin: true, // New flag
      description: "Manage all tenants",
    },
  ],
}
```

**Update AdminSidebar to filter by isPlatformAdmin:**

```typescript
// In admin-sidebar.tsx, filter nav items:
const visibleItems = NAV_CONFIG.flatMap((section) =>
  section.items.filter((item) => {
    if (item.requiresPlatformAdmin && !isPlatformAdmin) {
      return false
    }
    return true
  })
)
```

**Success Criteria:**
- Platform admin link only visible to platform admins
- Link navigates to `/platform/tenants`
- Icon is Shield from lucide-react
- Proper active state highlighting

---

## Final Verification Checklist

**TypeScript:**
- [ ] `npm run typecheck` — 0 errors
- [ ] All imports resolve correctly
- [ ] No `@ts-ignore` comments
- [ ] Proper type inference throughout

**Build:**
- [ ] `npm run build` — success
- [ ] No build warnings
- [ ] All pages compile
- [ ] All routes accessible

**Tests:**
- [ ] `npm run test` — all pass
- [ ] Coverage >80% for new code
- [ ] No console errors in tests
- [ ] Mock isolation correct

**Runtime:**
- [ ] `/platform/*` routes require platform admin
- [ ] Non-platform admins redirected to `/admin`
- [ ] Tenant list loads and filters work
- [ ] Tenant detail displays all sections
- [ ] Wizard completes 5 steps
- [ ] Module toggles update optimistically
- [ ] Suspend/activate buttons work
- [ ] Analytics charts render
- [ ] No console errors in browser

**Accessibility:**
- [ ] All forms keyboard accessible
- [ ] Focus rings visible
- [ ] ARIA labels on custom components
- [ ] Screen reader friendly
- [ ] Color not sole indicator

**Mobile:**
- [ ] Responsive at 390px minimum
- [ ] Sidebar navigation works
- [ ] Tables stack correctly
- [ ] Charts resize
- [ ] Wizard steps work on mobile

**Security:**
- [ ] Platform admin flag enforced server-side
- [ ] Impersonate logs to audit trail
- [ ] Suspend/activate actions logged
- [ ] No unauthorized access possible

---

## Dependencies

**No new npm packages needed!** All functionality uses:
- Existing Recharts (from Phase 7D)
- Existing shadcn/ui components
- Existing WorkOS AuthKit
- Existing tRPC setup

---

## Backend Dependencies

Phase 7E requires these backend procedures (all exist from Phase 5):

**Platform Router (`src/modules/platform/platform.router.ts`):**
- `platform.listTenants` ✓ Exists
- `platform.getTenant` ✓ Exists
- `platform.createTenant` ✓ Exists
- `platform.updateTenant` ✓ Exists
- `platform.suspendTenant` ✓ Exists
- `platform.activateTenant` ✓ Exists
- `platform.changePlan` ✓ Exists
- `platform.listTenantModules` ✓ Exists
- `platform.setTenantModule` ✓ Exists

**To Be Added (optional enhancements):**
- `platform.getPlatformMetrics` — For analytics
- `platform.impersonate` — For impersonation flow (high security)

**Status:** Backend 95% ready. Platform analytics stubs can be filled later.

---

## Estimated Timeline

- **Wave 1-2 (Types/Schemas):** 1.5 hours
- **Wave 3 (Layout/Auth):** 2 hours
- **Wave 4 (List/Detail):** 3 hours
- **Wave 5 (Wizard Steps):** 3 hours
- **Wave 6 (Wizard Page):** 1 hour
- **Wave 7 (Analytics):** 2.5 hours
- **Wave 8 (Tests):** 2 hours
- **Wave 9 (Navigation):** 0.5 hours

**Total: ~15.5 hours** (parallelized to ~5 hours with 3-4 agents)

---

## File Manifest Summary

**Total Files:** 32
**Estimated LOC:** ~8,500

### Breakdown by Wave:
- **Wave 1:** 4 files (types/schemas) — ~380 LOC
- **Wave 2:** 4 files (hooks) — ~420 LOC
- **Wave 3:** 3 files (layout/auth) — ~340 LOC
- **Wave 4:** 8 files (list/detail) — ~1,200 LOC
- **Wave 5:** 6 files (wizard) — ~890 LOC
- **Wave 6:** 2 files (wizard page) — ~170 LOC
- **Wave 7:** 6 files (analytics) — ~600 LOC
- **Wave 8:** 4 files (tests) — ~390 LOC
- **Wave 9:** 1 file (nav update) — ~15 LOC

**All files follow Phase 7A-7D patterns:**
- shadcn/ui components
- Tailwind 4 styling
- Dark mode support
- Mobile responsive
- WCAG 2.1 AA accessible
- tRPC React Query hooks
- Optimistic updates
- Toast notifications
- Loading skeletons
- Empty states

---

## Edge Cases & Special Considerations

### Impersonate Flow
- **High security action** — requires platform admin
- Audit log entry created (actor, tenant, timestamp)
- Implementation approach:
  1. Create impersonation session token
  2. Store in secure cookie/JWT
  3. Redirect to `/admin` with tenant context
  4. Show banner "Impersonating {tenant}"
  5. "Exit Impersonation" button in banner
  6. Audit log on start and end

### Tenant Suspension
- **Immediate effect** — blocks all login for tenant users
- UI should show reason for suspension
- Activation requires platform admin approval
- Audit log entry created

### Module Toggles
- **Plan restrictions** — premium modules require higher plan
- Disable toggle if plan doesn't support module
- Show upgrade prompt in tooltip
- Monthly rate displayed if applicable

### Wizard Validation
- **Step-by-step validation** — can't proceed with invalid data
- Domain uniqueness check (backend)
- Email uniqueness check (backend)
- Clear error messages on each field

### Platform Analytics
- **Stub implementation** — charts show placeholders until backend ready
- Use same patterns as Phase 7D analytics
- Recharts components already available
- Easy to wire up later

---

## Critical Files for Implementation

Here are the 5 most critical files that set the foundation:

1. **/Users/lukehodges/Documents/ironheart-refactor/src/app/platform/layout.tsx**
   - Platform admin auth guard (enforces `isPlatformAdmin = true`)
   - Rejects non-platform admins
   - Sets up sidebar/topbar layout

2. **/Users/lukehodges/Documents/ironheart-refactor/src/hooks/use-platform-tenants.ts**
   - Core data fetching hook for tenant list/detail
   - Mutation handlers for suspend/activate/modules
   - Central state management

3. **/Users/lukehodges/Documents/ironheart-refactor/src/hooks/use-tenant-wizard.ts**
   - Wizard state machine (5 steps)
   - Form validation orchestration
   - Submission handler
   - Pattern to follow for multi-step forms

4. **/Users/lukehodges/Documents/ironheart-refactor/src/components/platform/tenant-list-table.tsx**
   - Main tenant browsing interface
   - Filter/search patterns
   - Table with row navigation
   - Demonstrates existing patterns from Phase 7B

5. **/Users/lukehodges/Documents/ironheart-refactor/src/modules/platform/platform.router.ts**
   - Backend reference (already exists)
   - Shows available procedures
   - Validates frontend matches backend contracts

---

*Plan created: 2026-02-20*
*Target completion: Phase 7E complete*
*Next: Phase 8 (Mobile apps) or production launch*
