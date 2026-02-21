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
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button onClick={handleNext}>
          Continue
        </Button>
      </div>
    </div>
  )
}
