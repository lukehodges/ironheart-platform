import { cn } from "@/lib/utils"
import { Check } from "lucide-react"

const STEPS = [
  { id: 1, name: "Business" },
  { id: 2, name: "Plan" },
  { id: 3, name: "Admin" },
  { id: 4, name: "Modules" },
  { id: 5, name: "Confirm" },
]

interface WizardProgressProps {
  currentStep: number
}

export function WizardProgress({ currentStep }: WizardProgressProps) {
  return (
    <nav aria-label="Progress">
      <ol className="flex items-center justify-center gap-2 md:gap-4">
        {STEPS.map((step, index) => (
          <li key={step.id} className="flex items-center">
            {/* Step Circle */}
            <div className="flex items-center">
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-semibold transition-colors",
                  currentStep > step.id
                    ? "border-primary bg-primary text-primary-foreground"
                    : currentStep === step.id
                    ? "border-primary text-primary"
                    : "border-muted-foreground/30 text-muted-foreground"
                )}
              >
                {currentStep > step.id ? (
                  <Check className="h-5 w-5" />
                ) : (
                  step.id
                )}
              </div>
              <span
                className={cn(
                  "ml-2 text-sm font-medium hidden md:inline",
                  currentStep === step.id ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {step.name}
              </span>
            </div>

            {/* Connector Line */}
            {index < STEPS.length - 1 && (
              <div
                className={cn(
                  "mx-2 h-0.5 w-8 md:w-12 transition-colors",
                  currentStep > step.id ? "bg-primary" : "bg-muted-foreground/30"
                )}
              />
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
