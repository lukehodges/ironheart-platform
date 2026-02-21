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
