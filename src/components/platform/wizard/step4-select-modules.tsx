"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import type { CreateTenantWizardState } from "@/types/platform-admin"

// In real implementation, fetch from backend
const AVAILABLE_MODULES = [
  {
    id: "booking-core",
    name: "Booking Management",
    description: "Core booking and scheduling functionality",
    isPremium: false,
    required: true,
  },
  {
    id: "customer-mgmt",
    name: "Customer Management",
    description: "Customer profiles, notes, and history",
    isPremium: false,
    required: true,
  },
  {
    id: "team-mgmt",
    name: "Team Management",
    description: "Staff scheduling and availability",
    isPremium: false,
    required: false,
  },
  {
    id: "workflows",
    name: "Workflow Automation",
    description: "Automated workflows and notifications",
    isPremium: true,
    required: false,
  },
  {
    id: "analytics",
    name: "Advanced Analytics",
    description: "Insights, reports, and dashboards",
    isPremium: true,
    required: false,
  },
  {
    id: "forms",
    name: "Custom Forms",
    description: "Create and embed custom forms",
    isPremium: false,
    required: false,
  },
]

interface Step4Props {
  selectedModules: string[]
  onUpdate: (modules: string[]) => void
  onNext: () => void
  onBack: () => void
}

export function Step4SelectModules({ selectedModules, onUpdate, onNext, onBack }: Step4Props) {
  const handleToggle = (moduleId: string, checked: boolean) => {
    if (checked) {
      onUpdate([...selectedModules, moduleId])
    } else {
      onUpdate(selectedModules.filter((id) => id !== moduleId))
    }
  }

  const requiredModules = AVAILABLE_MODULES.filter((m) => m.required).map((m) => m.id)
  const allSelected = [...new Set([...selectedModules, ...requiredModules])]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Select Modules</h2>
        <p className="text-muted-foreground mt-1">
          Choose which features to enable for this tenant
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Available Modules</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {AVAILABLE_MODULES.map((module) => (
            <div
              key={module.id}
              className="flex items-start gap-3 p-3 rounded-lg border"
            >
              <Checkbox
                id={module.id}
                checked={allSelected.includes(module.id)}
                onCheckedChange={(checked) =>
                  handleToggle(module.id, checked as boolean)
                }
                disabled={module.required}
              />
              <div className="flex-1">
                <Label
                  htmlFor={module.id}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <span className="font-medium">{module.name}</span>
                  {module.isPremium && (
                    <Badge variant="secondary" className="text-xs">
                      Premium
                    </Badge>
                  )}
                  {module.required && (
                    <Badge variant="outline" className="text-xs">
                      Required
                    </Badge>
                  )}
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  {module.description}
                </p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button onClick={onBack} variant="outline" size="lg">
          Back
        </Button>
        <Button onClick={onNext} size="lg" disabled={allSelected.length === 0}>
          Continue
        </Button>
      </div>
    </div>
  )
}
