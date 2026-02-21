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
              <SelectTrigger id="industry">
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
