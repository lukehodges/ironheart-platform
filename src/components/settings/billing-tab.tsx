"use client"

import * as React from "react"
import { formatDistanceToNow } from "date-fns"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { api } from "@/lib/trpc/react"
import { Loader2, Download, Zap, Users, HardDrive } from "lucide-react"

export function BillingTab() {
  // TODO: Implement settings router with getBilling procedure
  // For now, using stub data to make build pass
  const isLoading = false
  const error = null
  const billingData = {
    plan: "Professional",
    status: "active" as const,
    currentPrice: 9900, // $99.00 in cents
    billingCycle: "month" as const,
    features: [
      "Unlimited bookings",
      "Up to 10 team members",
      "100GB storage",
      "Advanced analytics",
      "Custom branding",
      "Priority support",
    ],
    usage: {
      bookingsThisMonth: 145,
      bookingsLimit: 1000,
      teamMembers: 5,
      teamMembersLimit: 10,
      storageUsedGb: 23.5,
      storageLimitGb: 100,
    },
    invoices: [] as Array<{
      id: string
      date: string
      amount: number
      status: "paid" | "pending" | "failed" | "draft"
    }>,
  }

  if (!billingData) {
    return (
      <div className="rounded-lg border border-border p-4">
        <p className="text-sm text-muted-foreground">No billing information available.</p>
      </div>
    )
  }

  const {
    plan,
    status,
    currentPrice,
    billingCycle,
    features,
    usage,
    invoices,
  } = billingData

  // Calculate usage percentages
  const bookingsPercentage = (usage.bookingsThisMonth / usage.bookingsLimit) * 100
  const teamMembersPercentage = (usage.teamMembers / usage.teamMembersLimit) * 100
  const storagePercentage = (usage.storageUsedGb / usage.storageLimitGb) * 100

  // Format price
  const formattedPrice = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(currentPrice / 100)

  return (
    <div className="space-y-6">
      {/* Current Plan Card */}
      <Card className="border-2 border-primary">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">{plan}</CardTitle>
              <CardDescription>
                {formattedPrice} <span className="text-xs text-muted-foreground">/{billingCycle}</span>
              </CardDescription>
            </div>
            <Badge variant="default" className="h-fit">
              {status === "active" ? "Active" : status === "trial" ? "Trial" : "Inactive"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Features List */}
          <div>
            <h4 className="mb-3 font-medium text-sm">Included Features</h4>
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {features.map((feature) => (
                <li key={feature} className="flex items-center gap-2 text-sm">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          {/* Upgrade CTA */}
          <div className="pt-4">
            <UpgradeButton plan={plan} />
          </div>
        </CardContent>
      </Card>

      {/* Usage Stats */}
      <div className="space-y-4">
        <h3 className="font-semibold text-lg">Current Usage</h3>

        {/* Bookings This Month */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">Bookings This Month</CardTitle>
              </div>
              <span className="text-sm font-medium text-muted-foreground">
                {usage.bookingsThisMonth} / {usage.bookingsLimit}
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <Progress value={Math.min(bookingsPercentage, 100)} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {Math.round(bookingsPercentage)}% of your monthly limit used
            </p>
          </CardContent>
        </Card>

        {/* Team Members */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">Team Members</CardTitle>
              </div>
              <span className="text-sm font-medium text-muted-foreground">
                {usage.teamMembers} / {usage.teamMembersLimit}
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <Progress value={Math.min(teamMembersPercentage, 100)} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {Math.round(teamMembersPercentage)}% of your team limit used
            </p>
          </CardContent>
        </Card>

        {/* Storage Used */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HardDrive className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">Storage Used</CardTitle>
              </div>
              <span className="text-sm font-medium text-muted-foreground">
                {usage.storageUsedGb.toFixed(2)} / {usage.storageLimitGb} GB
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <Progress value={Math.min(storagePercentage, 100)} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {Math.round(storagePercentage)}% of your storage limit used
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Billing History */}
      <div className="space-y-4">
        <h3 className="font-semibold text-lg">Billing History</h3>

        {invoices.length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <p className="text-center text-sm text-muted-foreground">
                No invoices yet. Your billing history will appear here.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="text-sm">
                      {new Date(invoice.date).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </TableCell>
                    <TableCell className="text-sm font-medium">
                      {new Intl.NumberFormat("en-US", {
                        style: "currency",
                        currency: "USD",
                      }).format(invoice.amount / 100)}
                    </TableCell>
                    <TableCell>
                      <InvoiceStatusBadge status={invoice.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <InvoiceDownloadButton invoiceId={invoice.id} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Upgrade button - opens Stripe checkout placeholder
 */
function UpgradeButton({ plan }: { plan: string }) {
  const [isLoading, setIsLoading] = React.useState(false)

  const handleUpgrade = () => {
    setIsLoading(true)
    // Placeholder: In production, this would call api.settings.getCheckoutSession
    // and redirect to Stripe checkout
    setTimeout(() => {
      alert(`Upgrade flow for ${plan} plan - integrates with Stripe in production`)
      setIsLoading(false)
    }, 500)
  }

  return (
    <Button
      onClick={handleUpgrade}
      disabled={isLoading}
      className="w-full"
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Loading...
        </>
      ) : (
        "Upgrade Plan"
      )}
    </Button>
  )
}

/**
 * Invoice status badge with color coding
 */
function InvoiceStatusBadge({ status }: { status: string }) {
  const variants: Record<string, "default" | "success" | "warning" | "destructive"> = {
    paid: "success",
    pending: "warning",
    failed: "destructive",
    draft: "default",
  }

  const labels: Record<string, string> = {
    paid: "Paid",
    pending: "Pending",
    failed: "Failed",
    draft: "Draft",
  }

  return (
    <Badge variant={variants[status] || "default"}>
      {labels[status] || status}
    </Badge>
  )
}

/**
 * Invoice download button
 */
function InvoiceDownloadButton({ invoiceId }: { invoiceId: string }) {
  const [isLoading, setIsLoading] = React.useState(false)

  const handleDownload = async () => {
    setIsLoading(true)
    try {
      // Placeholder: In production, this would call api.settings.downloadInvoicePdf
      // and trigger a file download
      setTimeout(() => {
        const link = document.createElement("a")
        link.href = `#` // Placeholder URL
        link.download = `invoice-${invoiceId}.pdf`
        // In production: link.href = actual PDF URL from API
        // link.click()
        console.log(`Would download invoice ${invoiceId}`)
        setIsLoading(false)
      }, 300)
    } catch (error) {
      console.error("Failed to download invoice:", error)
      setIsLoading(false)
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleDownload}
      disabled={isLoading}
      className="h-8 w-8 p-0"
      title="Download invoice PDF"
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Download className="h-4 w-4" />
      )}
    </Button>
  )
}

/**
 * Loading skeleton for billing data
 */
function BillingTabSkeleton() {
  return (
    <div className="space-y-6">
      {/* Current Plan Skeleton */}
      <Card className="border-2 border-primary">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-2 flex-1">
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="h-6 w-16" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-4 w-32" />
          <div className="grid grid-cols-2 gap-2">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-4 w-full" />
            ))}
          </div>
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>

      {/* Usage Stats Skeleton */}
      <div className="space-y-4">
        <Skeleton className="h-6 w-32" />
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-3">
              <Skeleton className="h-5 w-40" />
            </CardHeader>
            <CardContent className="space-y-2">
              <Skeleton className="h-2 w-full" />
              <Skeleton className="h-4 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Billing History Skeleton */}
      <div className="space-y-4">
        <Skeleton className="h-6 w-32" />
        <Card>
          <CardContent className="p-0">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4 p-4 border-b border-border last:border-0">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-8 w-8 ml-auto" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
