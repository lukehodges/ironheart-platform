"use client"

import { useRouter } from "next/navigation"
import {
  Calendar,
  Users,
  CreditCard,
  TrendingUp,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
} from "lucide-react"
import { PageHeader } from "@/components/ui/page-header"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton, SkeletonStatCard, SkeletonList } from "@/components/ui/skeleton"
import { api } from "@/lib/trpc/react"

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount / 100) // amounts stored in pence
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date))
}

const statusIcon: Record<string, typeof Clock> = {
  PENDING: Clock,
  CONFIRMED: CheckCircle2,
  COMPLETED: CheckCircle2,
  CANCELLED: XCircle,
  NO_SHOW: AlertCircle,
}

const statusColor: Record<string, string> = {
  PENDING: "bg-amber-500/10",
  CONFIRMED: "bg-blue-500/10",
  COMPLETED: "bg-emerald-500/10",
  CANCELLED: "bg-red-500/10",
  NO_SHOW: "bg-red-500/10",
}

const statusIconColor: Record<string, string> = {
  PENDING: "text-amber-500",
  CONFIRMED: "text-blue-500",
  COMPLETED: "text-emerald-500",
  CANCELLED: "text-red-500",
  NO_SHOW: "text-red-500",
}

export default function AdminDashboardPage() {
  const router = useRouter()

  const summary = api.analytics.getSummary.useQuery({ period: "TODAY" })
  const recentBookings = api.booking.list.useQuery({ limit: 5 })

  const isLoading = summary.isLoading
  const data = summary.data

  const stats = [
    {
      title: "Today's Bookings",
      value: data ? String(data.bookings.created) : "--",
      icon: Calendar,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      title: "New Customers",
      value: data ? String(data.customers.new) : "--",
      icon: Users,
      color: "text-violet-500",
      bgColor: "bg-violet-500/10",
    },
    {
      title: "Revenue (Today)",
      value: data ? formatCurrency(data.revenue.gross) : "--",
      icon: CreditCard,
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/10",
    },
    {
      title: "Avg. Rating",
      value: data
        ? data.reviews.ratingAvg > 0
          ? data.reviews.ratingAvg.toFixed(1)
          : "N/A"
        : "--",
      icon: TrendingUp,
      color: "text-amber-500",
      bgColor: "bg-amber-500/10",
    },
  ]

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Dashboard"
        description="Welcome back. Here's what's happening."
      >
        <Button size="sm" onClick={() => router.push("/admin/bookings/new")}>
          <Calendar className="h-4 w-4" />
          New Booking
        </Button>
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <SkeletonStatCard key={i} />
            ))
          : stats.map((stat) => {
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
                    {data && (
                      <p className="mt-3 text-xs text-muted-foreground">
                        {stat.title === "Today's Bookings" && data.bookings.completed > 0
                          ? `${data.bookings.completed} completed, ${data.bookings.cancelled} cancelled`
                          : stat.title === "Revenue (Today)" && data.revenue.outstanding > 0
                            ? `${formatCurrency(data.revenue.outstanding)} outstanding`
                            : `Period: ${data.period.toLowerCase()}`}
                      </p>
                    )}
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
            <Button
              variant="ghost"
              size="sm"
              className="gap-1 text-xs"
              onClick={() => router.push("/admin/bookings")}
            >
              View all <ArrowRight className="h-3 w-3" />
            </Button>
          </CardHeader>
          <CardContent>
            {recentBookings.isLoading ? (
              <SkeletonList items={5} />
            ) : recentBookings.data?.rows && recentBookings.data.rows.length > 0 ? (
              <div className="space-y-4">
                {recentBookings.data.rows.map((booking) => {
                  const IconComponent = statusIcon[booking.status] ?? Clock
                  const bgClass = statusColor[booking.status] ?? "bg-muted"
                  const iconColorClass = statusIconColor[booking.status] ?? "text-muted-foreground"
                  return (
                    <div key={booking.id} className="flex items-start gap-3">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-full ${bgClass} shrink-0`}>
                        <IconComponent className={`h-4 w-4 ${iconColorClass}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          Booking #{booking.bookingNumber}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatDate(booking.createdAt)}
                        </p>
                      </div>
                      <Badge
                        variant={
                          booking.status === "COMPLETED"
                            ? "success"
                            : booking.status === "CANCELLED" || booking.status === "NO_SHOW"
                              ? "destructive"
                              : booking.status === "CONFIRMED"
                                ? "default"
                                : "warning"
                        }
                        className="text-[10px] shrink-0"
                      >
                        {booking.status}
                      </Badge>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted shrink-0">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">No recent activity</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Bookings will appear here once created
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  )
}
