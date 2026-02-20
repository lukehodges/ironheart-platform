"use client"

import { useEffect } from "react"
import { useParams } from "next/navigation"
import { CheckCircle, ChevronLeft } from "lucide-react"
import { useBookingFlow } from "@/hooks/use-booking-flow"
import { useTenantTheme } from "@/hooks/use-tenant-theme"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { WizardStep } from "@/types/booking-flow"

/**
 * Public booking wizard page
 *
 * Features:
 * - 3-step booking flow (service → slot → details)
 * - Tenant white-labeling via useTenantTheme
 * - Progress indicator
 * - Mobile-first responsive design
 * - Loading and error states
 * - Success confirmation
 *
 * Route: /book/[tenantSlug]
 */
export default function BookingWizardPage() {
  const params = useParams<{ tenantSlug: string }>()
  const tenantSlug = params?.tenantSlug ?? ""

  // Theme loading
  const { theme, isLoading: themeLoading, isError: themeError, businessName } = useTenantTheme({
    tenantSlug,
  })

  // Booking flow state
  const booking = useBookingFlow({
    tenantSlug,
    onSuccess: (bookingId) => {
      console.log("Booking created:", bookingId)
    },
  })

  // Update page title when theme loads
  useEffect(() => {
    if (businessName) {
      document.title = `${businessName} - Book Appointment`
    }
  }, [businessName])

  // Loading state
  if (themeLoading) {
    return <BookingPageSkeleton />
  }

  // Error state - tenant not found
  if (themeError || !theme) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-background to-muted/20">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Booking Not Available</CardTitle>
            <CardDescription>
              We couldn&apos;t find this booking page. Please check the URL and try again.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => window.location.reload()}
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const steps: { key: WizardStep; label: string; description: string }[] = [
    { key: WizardStep.SELECT_SERVICE, label: "Select Service", description: "Choose what you need" },
    { key: WizardStep.PICK_SLOT, label: "Pick Time", description: "Find a convenient slot" },
    { key: WizardStep.CUSTOMER_DETAILS, label: "Your Details", description: "Complete your booking" },
    { key: WizardStep.SUCCESS, label: "Confirmed", description: "Booking complete" },
  ]

  const currentStepIndex = steps.findIndex((s) => s.key === booking.currentStep)
  const progress = ((currentStepIndex + 1) / steps.length) * 100

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {theme.logoUrl && (
                <img
                  src={theme.logoUrl}
                  alt={businessName ?? "Logo"}
                  className="h-8 w-auto"
                />
              )}
              <div>
                <h1 className="text-lg font-semibold">{businessName}</h1>
                <p className="text-xs text-muted-foreground">Book an Appointment</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Progress bar */}
      {booking.currentStep !== WizardStep.SUCCESS && (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">
                Step {currentStepIndex + 1} of {steps.length - 1}
              </span>
              <span className="text-muted-foreground">
                {steps[currentStepIndex]?.label}
              </span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Step indicators (mobile: simplified, desktop: full) */}
        {booking.currentStep !== WizardStep.SUCCESS && (
          <div className="hidden md:flex items-center justify-between mb-8">
            {steps.slice(0, -1).map((step, index) => {
              const isActive = index === currentStepIndex
              const isCompleted = index < currentStepIndex
              return (
                <div key={step.key} className="flex items-center flex-1">
                  <div
                    className={`flex items-center gap-3 ${
                      isActive ? "text-primary" : isCompleted ? "text-success" : "text-muted-foreground"
                    }`}
                  >
                    <div
                      className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                        isActive
                          ? "border-primary bg-primary/10"
                          : isCompleted
                            ? "border-success bg-success/10"
                            : "border-border"
                      }`}
                    >
                      {isCompleted ? (
                        <CheckCircle className="w-5 h-5" />
                      ) : (
                        <span className="font-semibold">{index + 1}</span>
                      )}
                    </div>
                    <div className="hidden lg:block">
                      <div className="font-medium text-sm">{step.label}</div>
                      <div className="text-xs opacity-70">{step.description}</div>
                    </div>
                  </div>
                  {index < steps.length - 2 && (
                    <div
                      className={`h-0.5 flex-1 mx-4 ${
                        isCompleted ? "bg-success" : "bg-border"
                      }`}
                    />
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Step content */}
        {booking.currentStep === WizardStep.SELECT_SERVICE && (
          <Card>
            <CardHeader>
              <CardTitle>Select a Service</CardTitle>
              <CardDescription>Choose the service you&apos;d like to book</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Placeholder - will be replaced with ServiceSelector component in Wave 4 */}
              <div className="space-y-3">
                <div className="p-6 border border-border rounded-lg text-center text-muted-foreground">
                  Service selector component will be rendered here (Wave 4)
                </div>
                <div className="flex justify-end">
                  <Button
                    onClick={() => booking.nextStep()}
                    disabled={!booking.state.selectedService}
                  >
                    Continue
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {booking.currentStep === WizardStep.PICK_SLOT && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Pick a Time Slot</CardTitle>
                  <CardDescription>
                    Choose your preferred date and time
                  </CardDescription>
                </div>
                <Button variant="ghost" size="icon-sm" onClick={() => booking.prevStep()}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Placeholder - will be replaced with SlotPicker component in Wave 4 */}
              <div className="space-y-3">
                <div className="p-6 border border-border rounded-lg text-center text-muted-foreground">
                  Slot picker component will be rendered here (Wave 4)
                </div>
                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => booking.prevStep()}>
                    Back
                  </Button>
                  <Button
                    onClick={() => booking.nextStep()}
                    disabled={!booking.state.selectedSlot}
                  >
                    Continue
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {booking.currentStep === WizardStep.CUSTOMER_DETAILS && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Your Details</CardTitle>
                  <CardDescription>
                    Complete your booking information
                  </CardDescription>
                </div>
                <Button variant="ghost" size="icon-sm" onClick={() => booking.prevStep()}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Placeholder - will be replaced with CustomerDetailsForm component in Wave 4 */}
              <div className="space-y-3">
                <div className="p-6 border border-border rounded-lg text-center text-muted-foreground">
                  Customer details form will be rendered here (Wave 4)
                </div>
                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => booking.prevStep()}>
                    Back
                  </Button>
                  <Button
                    onClick={() => {
                      void booking.submitCustomerDetails({
                        name: "Test User",
                        email: "test@example.com",
                        phone: "1234567890",
                        notes: null,
                        dynamicFields: {},
                      })
                    }}
                    loading={booking.isSubmitting}
                  >
                    Confirm Booking
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {booking.currentStep === WizardStep.SUCCESS && (
          <Card className="text-center">
            <CardHeader>
              <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-success/10 flex items-center justify-center">
                <CheckCircle className="w-10 h-10 text-success" />
              </div>
              <CardTitle className="text-2xl">Booking Confirmed!</CardTitle>
              <CardDescription>
                Your appointment has been successfully booked
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-muted/50 rounded-lg p-6 space-y-3">
                <p className="text-sm text-muted-foreground">
                  A confirmation email has been sent to your email address.
                </p>
                {booking.state.bookingId && (
                  <div className="text-xs text-muted-foreground font-mono">
                    Booking ID: {booking.state.bookingId}
                  </div>
                )}
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => booking.reset()}
                >
                  Book Another
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => {
                    if (booking.state.bookingId) {
                      window.location.href = `/booking/${booking.state.bookingId}`
                    }
                  }}
                >
                  View Booking
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-16 border-t border-border bg-card/50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
          <div className="text-center text-sm text-muted-foreground">
            <p>
              Powered by {businessName ?? "Booking System"}
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

/**
 * Loading skeleton for booking page
 */
function BookingPageSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <header className="border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded" />
            <div className="space-y-1">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        </div>
      </header>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="space-y-4">
          <Skeleton className="h-2 w-full" />
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-10 w-24 ml-auto" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
