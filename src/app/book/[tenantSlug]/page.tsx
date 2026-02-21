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
import { ServiceSelector } from "@/components/booking-flow/service-selector"
import { SlotPicker } from "@/components/booking-flow/slot-picker"
import { CustomerDetailsForm } from "@/components/booking-flow/customer-details-form"
import { BookingSuccess } from "@/components/booking-flow/booking-success"
import { WizardProgress } from "@/components/booking-flow/wizard-progress"

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
        {/* Step indicators */}
        {booking.currentStep !== WizardStep.SUCCESS && (
          <div className="mb-8">
            <WizardProgress currentStep={booking.currentStep} />
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
              {/* TODO: Replace with actual tRPC query when service module is implemented */}
              <ServiceSelector
                services={[]}
                onSelect={(service) => {
                  booking.selectService(service)
                  booking.nextStep()
                }}
                selectedId={booking.state.selectedService?.id}
              />
              <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground text-center">
                  📝 Services module not yet implemented. Add services via admin panel or seed script.
                </p>
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
              <SlotPicker
                serviceId={booking.state.selectedService?.id ?? ""}
                onSelect={(slot) => {
                  booking.selectSlot(slot)
                  booking.nextStep()
                }}
                getAvailableSlots={async (serviceId: string, date: Date) => {
                  // TODO: Implement getAvailableSlots
                  return []
                }}
              />
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
              <CustomerDetailsForm
                dynamicFields={[]}
                onSubmit={booking.submitCustomerDetails}
                isLoading={booking.isSubmitting}
              />
            </CardContent>
          </Card>
        )}

        {booking.currentStep === WizardStep.SUCCESS && booking.state.bookingId && (
          <BookingSuccess
            booking={{
              id: booking.state.bookingId,
              service: {
                name: booking.state.selectedService?.name ?? "Service",
                durationMinutes: booking.state.selectedService?.durationMinutes ?? 60,
                price: booking.state.selectedService?.basePrice ?? 0,
                currency: booking.state.selectedService?.currency ?? "USD",
              },
              staff: booking.state.selectedSlot?.userDisplayName
                ? {
                    name: booking.state.selectedSlot.userDisplayName,
                    imageUrl: null,
                  }
                : null,
              dateTime: booking.state.selectedSlot?.startTime ?? new Date(),
              location: null,
              customerEmail: booking.state.customerInfo?.email ?? "",
            }}
          />
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
