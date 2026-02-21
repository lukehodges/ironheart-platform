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

  const tenants = list.data?.rows ?? []

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
            {tenants.map((tenant: any) => (
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
              // Load more logic - hook should handle pagination internally
              const currentTenants = list.data?.rows ?? []
              if (currentTenants.length > 0) {
                const lastTenant = currentTenants[currentTenants.length - 1]
                setFilters({ ...filters, cursor: lastTenant.id })
              }
            }}
            disabled={list.isLoading}
          >
            Load More
          </Button>
        </div>
      )}
    </div>
  )
}

function TenantStatusBadge({ status }: { status: string }) {
  const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning"; label: string }> = {
    ACTIVE: { variant: "success", label: "Active" },
    SUSPENDED: { variant: "warning", label: "Suspended" },
    CANCELLED: { variant: "destructive", label: "Cancelled" },
    PENDING: { variant: "secondary", label: "Pending" },
  }

  const config = variants[status] ?? { variant: "secondary" as const, label: status }

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
