"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import type { ChurnData } from "@/types/platform-admin"
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
