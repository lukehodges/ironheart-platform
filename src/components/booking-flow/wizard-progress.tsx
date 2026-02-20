"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Check } from "lucide-react"
import { WizardStep } from "@/types/booking-flow"

interface WizardProgressProps {
  currentStep: WizardStep
  className?: string
}

interface StepConfig {
  step: WizardStep
  label: string
  shortLabel: string
  order: number
}

const STEP_CONFIG: StepConfig[] = [
  {
    step: WizardStep.SELECT_SERVICE,
    label: "Select Service",
    shortLabel: "Service",
    order: 1,
  },
  {
    step: WizardStep.PICK_SLOT,
    label: "Pick Slot",
    shortLabel: "Time",
    order: 2,
  },
  {
    step: WizardStep.CUSTOMER_DETAILS,
    label: "Your Details",
    shortLabel: "Details",
    order: 3,
  },
  {
    step: WizardStep.SUCCESS,
    label: "Confirmed",
    shortLabel: "Done",
    order: 4,
  },
]

export default function WizardProgress({ currentStep, className }: WizardProgressProps) {
  const currentOrder = STEP_CONFIG.find((s) => s.step === currentStep)?.order ?? 1

  return (
    <nav
      aria-label="Booking progress"
      className={cn("w-full", className)}
    >
      {/* Desktop view - full step names with connecting lines */}
      <ol className="hidden md:flex items-center justify-between w-full">
        {STEP_CONFIG.map((step, index) => {
          const isActive = step.order === currentOrder
          const isCompleted = step.order < currentOrder
          const isUpcoming = step.order > currentOrder

          return (
            <React.Fragment key={step.step}>
              <li className="flex-1 flex items-center">
                <div className="flex flex-col items-center w-full gap-2">
                  <div
                    className={cn(
                      "relative flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all",
                      isCompleted && "bg-primary border-primary text-primary-foreground",
                      isActive && "bg-primary/10 border-primary text-primary",
                      isUpcoming && "bg-background border-muted text-muted-foreground"
                    )}
                    aria-current={isActive ? "step" : undefined}
                  >
                    {isCompleted ? (
                      <Check className="h-5 w-5" aria-hidden="true" />
                    ) : (
                      <span className="font-semibold">{step.order}</span>
                    )}
                  </div>
                  <span
                    className={cn(
                      "text-sm font-medium text-center transition-colors",
                      isActive && "text-foreground",
                      isCompleted && "text-foreground",
                      isUpcoming && "text-muted-foreground"
                    )}
                  >
                    {step.label}
                  </span>
                </div>
              </li>

              {/* Connecting line */}
              {index < STEP_CONFIG.length - 1 && (
                <div
                  className={cn(
                    "flex-1 h-0.5 mx-2 transition-colors",
                    step.order < currentOrder ? "bg-primary" : "bg-muted"
                  )}
                  aria-hidden="true"
                />
              )}
            </React.Fragment>
          )
        })}
      </ol>

      {/* Mobile view - numbered dots with current step label */}
      <div className="md:hidden space-y-4">
        <div className="flex items-center justify-center gap-2">
          {STEP_CONFIG.map((step, index) => {
            const isActive = step.order === currentOrder
            const isCompleted = step.order < currentOrder

            return (
              <React.Fragment key={step.step}>
                <div
                  className={cn(
                    "flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all text-xs font-semibold",
                    isCompleted && "bg-primary border-primary text-primary-foreground",
                    isActive && "bg-primary/10 border-primary text-primary scale-110",
                    !isActive && !isCompleted && "bg-background border-muted text-muted-foreground"
                  )}
                  aria-current={isActive ? "step" : undefined}
                  aria-label={`Step ${step.order}: ${step.label}`}
                >
                  {isCompleted ? (
                    <Check className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <span>{step.order}</span>
                  )}
                </div>

                {/* Small connecting line */}
                {index < STEP_CONFIG.length - 1 && (
                  <div
                    className={cn(
                      "h-0.5 w-6 transition-colors",
                      step.order < currentOrder ? "bg-primary" : "bg-muted"
                    )}
                    aria-hidden="true"
                  />
                )}
              </React.Fragment>
            )
          })}
        </div>

        {/* Current step label */}
        <div className="text-center">
          <p className="text-sm font-medium">
            {STEP_CONFIG.find((s) => s.step === currentStep)?.label}
          </p>
        </div>
      </div>
    </nav>
  )
}

export { WizardProgress }
export type { WizardProgressProps }
