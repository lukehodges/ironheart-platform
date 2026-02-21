"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"
import type { CreateTenantWizardState } from "@/types/platform-admin"

const PLANS = [
  {
    id: "TRIAL" as const,
    name: "Trial",
    price: "$0",
    period: "14 days",
    features: [
      "Up to 50 bookings",
      "2 team members",
      "Basic support",
      "Core modules only",
    ],
  },
  {
    id: "STARTER" as const,
    name: "Starter",
    price: "$29",
    period: "per month",
    features: [
      "Up to 500 bookings/month",
      "5 team members",
      "Email support",
      "All core modules",
      "1GB storage",
    ],
  },
  {
    id: "PROFESSIONAL" as const,
    name: "Professional",
    price: "$99",
    period: "per month",
    popular: true,
    features: [
      "Unlimited bookings",
      "Unlimited team members",
      "Priority support",
      "All modules included",
      "10GB storage",
      "Custom branding",
      "Advanced analytics",
    ],
  },
  {
    id: "ENTERPRISE" as const,
    name: "Enterprise",
    price: "Custom",
    period: "contact sales",
    features: [
      "Everything in Professional",
      "Dedicated support",
      "SLA guarantee",
      "Unlimited storage",
      "White-label options",
      "Custom integrations",
    ],
  },
]

interface Step2Props {
  selectedPlan: CreateTenantWizardState['plan']
  onSelect: (plan: CreateTenantWizardState['plan']) => void
  onNext: () => void
  onBack: () => void
}

export function Step2SelectPlan({ selectedPlan, onSelect, onNext, onBack }: Step2Props) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Select Plan</h2>
        <p className="text-muted-foreground mt-1">
          Choose the subscription plan for this tenant
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {PLANS.map((plan) => (
          <Card
            key={plan.id}
            className={cn(
              "cursor-pointer transition-all hover:shadow-lg relative",
              selectedPlan === plan.id && "ring-2 ring-primary"
            )}
            onClick={() => onSelect(plan.id)}
          >
            {plan.popular && (
              <Badge className="absolute -top-2 left-1/2 -translate-x-1/2" variant="default">
                Popular
              </Badge>
            )}
            <CardHeader>
              <CardTitle className="text-lg">{plan.name}</CardTitle>
              <div className="mt-2">
                <span className="text-3xl font-bold">{plan.price}</span>
                <span className="text-sm text-muted-foreground ml-1">
                  {plan.period}
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex justify-between">
        <Button onClick={onBack} variant="outline" size="lg">
          Back
        </Button>
        <Button onClick={onNext} size="lg" disabled={!selectedPlan}>
          Continue
        </Button>
      </div>
    </div>
  )
}
