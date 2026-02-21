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
