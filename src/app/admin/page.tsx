import type { Metadata } from "next"
import {
  Calendar,
  Users,
  CreditCard,
  TrendingUp,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertCircle,
} from "lucide-react"
import { PageHeader } from "@/components/ui/page-header"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

export const metadata: Metadata = {
  title: "Dashboard",
}

const stats = [
  {
    title: "Today's Bookings",
    value: "—",
    change: null,
    icon: Calendar,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  {
    title: "Active Customers",
    value: "—",
    change: null,
    icon: Users,
    color: "text-violet-500",
    bgColor: "bg-violet-500/10",
  },
  {
    title: "Revenue This Month",
    value: "—",
    change: null,
    icon: CreditCard,
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
  },
  {
    title: "Avg. Rating",
    value: "—",
    change: null,
    icon: TrendingUp,
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
  },
]

export default function AdminDashboardPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Dashboard"
        description="Welcome back. Here's what's happening."
      >
        <Button size="sm">
          <Calendar className="h-4 w-4" />
          New Booking
        </Button>
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.title} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">{stat.title}</p>
                    <p className="text-2xl font-semibold tracking-tight">
                      {stat.value}
                    </p>
                  </div>
                  <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${stat.bgColor}`}>
                    <Icon className={`h-5 w-5 ${stat.color}`} aria-hidden="true" />
                  </div>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  Connect your database to see live data
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Two column layout */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">

        {/* Recent activity */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Recent Activity</CardTitle>
              <CardDescription>Latest bookings and updates</CardDescription>
            </div>
            <Button variant="ghost" size="sm" className="gap-1 text-xs">
              View all <ArrowRight className="h-3 w-3" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                {
                  label: "No recent activity",
                  sub: "Bookings will appear here once you connect your database",
                  icon: Clock,
                  status: "info" as const,
                },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted shrink-0">
                    <item.icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{item.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* System status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">System Status</CardTitle>
            <CardDescription>Service health overview</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { name: "API", status: "operational" },
                { name: "Database", status: "operational" },
                { name: "Background Jobs", status: "check_env" },
                { name: "Email", status: "check_env" },
              ].map((service) => (
                <div key={service.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {service.status === "operational" ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-amber-500" />
                    )}
                    <span className="text-sm">{service.name}</span>
                  </div>
                  <Badge
                    variant={service.status === "operational" ? "success" : "warning"}
                    className="text-[10px]"
                  >
                    {service.status === "operational" ? "Operational" : "Needs Config"}
                  </Badge>
                </div>
              ))}
            </div>
            <Separator className="my-4" />
            <p className="text-xs text-muted-foreground">
              Configure environment variables to activate all services.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
