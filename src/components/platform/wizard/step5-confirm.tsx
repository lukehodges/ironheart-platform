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
