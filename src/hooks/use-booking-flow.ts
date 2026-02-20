"use client"

import { useState, useCallback, useEffect } from "react"
import { toast } from "sonner"
import { api } from "@/lib/trpc/react"
import { useLocalStorage } from "@/hooks/use-local-storage"
import type {
  BookingFlowState,
  WizardStep,
  ServiceCard,
  AvailableSlot,
  CustomerDetailsForm,
} from "@/types/booking-flow"

interface UseBookingFlowOptions {
  tenantSlug: string
  onSuccess?: (bookingId: string) => void
}

interface UseBookingFlowReturn {
  // Current state
  state: BookingFlowState
  currentStep: WizardStep
  isSubmitting: boolean

  // Navigation
  nextStep: () => void
  prevStep: () => void
  goToStep: (step: WizardStep) => void

  // Service selection
  selectService: (service: ServiceCard) => void

  // Slot selection with optimistic updates
  selectSlot: (slot: AvailableSlot) => void

  // Customer details submission
  submitCustomerDetails: (details: CustomerDetailsForm) => Promise<void>

  // Reset flow
  reset: () => void
}

const STORAGE_KEY = "ironheart:booking-flow"
const STORAGE_TTL_MS = 1000 * 60 * 30 // 30 minutes

interface StoredFlowState extends BookingFlowState {
  expiresAt: number
}

const initialState: BookingFlowState = {
  currentStep: "SELECT_SERVICE" as WizardStep,
  tenantId: "",
  selectedService: null,
  selectedSlot: null,
  customerInfo: null,
  bookingId: null,
}

/**
 * Booking wizard state management hook
 *
 * Features:
 * - Step navigation with validation
 * - Service and slot selection
 * - Customer details submission
 * - LocalStorage persistence with expiry
 * - Slot race condition handling
 * - tRPC integration for booking creation
 *
 * @example
 * ```tsx
 * const booking = useBookingFlow({
 *   tenantSlug: "acme",
 *   onSuccess: (id) => router.push(`/booking/${id}/success`)
 * })
 *
 * // Step 1: Service selection
 * <ServiceSelector onSelect={booking.selectService} />
 *
 * // Step 2: Slot selection
 * <SlotPicker onSelect={booking.selectSlot} />
 *
 * // Step 3: Customer details
 * <CustomerForm onSubmit={booking.submitCustomerDetails} />
 * ```
 */
export function useBookingFlow({
  tenantSlug,
  onSuccess,
}: UseBookingFlowOptions): UseBookingFlowReturn {
  // LocalStorage persistence with TTL
  const [storedState, setStoredState] = useLocalStorage<StoredFlowState | null>(
    STORAGE_KEY,
    null
  )

  // Initialize state from storage or defaults
  const [state, setState] = useState<BookingFlowState>(() => {
    if (storedState && storedState.expiresAt > Date.now()) {
      // Restore from storage if not expired
      const { expiresAt: _expiresAt, ...flowState } = storedState
      return flowState
    }
    return { ...initialState, tenantId: tenantSlug }
  })

  // Persist state to localStorage on every change
  useEffect(() => {
    if (state.currentStep !== "SUCCESS") {
      setStoredState({
        ...state,
        expiresAt: Date.now() + STORAGE_TTL_MS,
      })
    } else {
      // Clear storage on success
      setStoredState(null)
    }
  }, [state, setStoredState])

  // tRPC mutation for creating booking
  const createBookingMutation = api.booking.create.useMutation({
    onSuccess: (booking) => {
      setState((prev) => ({
        ...prev,
        currentStep: "SUCCESS" as WizardStep,
        bookingId: booking.id,
      }))
      toast.success("Booking created successfully!")
      onSuccess?.(booking.id)
    },
    onError: (error) => {
      // Check if slot was taken (race condition)
      if (error.message.includes("slot") || error.message.includes("available")) {
        toast.error("Sorry, that time slot was just taken. Please choose another.")
        // Reset to slot selection step
        setState((prev) => ({
          ...prev,
          currentStep: "PICK_SLOT" as WizardStep,
          selectedSlot: null,
        }))
      } else {
        toast.error(error.message || "Failed to create booking")
      }
    },
  })

  // Navigation functions
  const nextStep = useCallback(() => {
    setState((prev) => {
      const steps: WizardStep[] = [
        "SELECT_SERVICE",
        "PICK_SLOT",
        "CUSTOMER_DETAILS",
        "SUCCESS",
      ] as WizardStep[]
      const currentIndex = steps.indexOf(prev.currentStep)
      const nextIndex = Math.min(currentIndex + 1, steps.length - 1)

      // Validation before advancing
      if (currentIndex === 0 && !prev.selectedService) {
        toast.error("Please select a service")
        return prev
      }
      if (currentIndex === 1 && !prev.selectedSlot) {
        toast.error("Please select a time slot")
        return prev
      }

      return { ...prev, currentStep: steps[nextIndex] }
    })
  }, [])

  const prevStep = useCallback(() => {
    setState((prev) => {
      const steps: WizardStep[] = [
        "SELECT_SERVICE",
        "PICK_SLOT",
        "CUSTOMER_DETAILS",
        "SUCCESS",
      ] as WizardStep[]
      const currentIndex = steps.indexOf(prev.currentStep)
      const prevIndex = Math.max(currentIndex - 1, 0)
      return { ...prev, currentStep: steps[prevIndex] }
    })
  }, [])

  const goToStep = useCallback((step: WizardStep) => {
    setState((prev) => ({ ...prev, currentStep: step }))
  }, [])

  // Service selection
  const selectService = useCallback((service: ServiceCard) => {
    setState((prev) => ({
      ...prev,
      selectedService: service,
      // Reset downstream selections when service changes
      selectedSlot: null,
      customerInfo: null,
      bookingId: null,
    }))
  }, [])

  // Slot selection with optimistic update
  const selectSlot = useCallback((slot: AvailableSlot) => {
    setState((prev) => ({
      ...prev,
      selectedSlot: slot,
      // Reset downstream selections when slot changes
      customerInfo: null,
      bookingId: null,
    }))
  }, [])

  // Customer details submission
  const submitCustomerDetails = useCallback(
    async (details: CustomerDetailsForm) => {
      if (!state.selectedService || !state.selectedSlot) {
        toast.error("Missing service or slot selection")
        return
      }

      // Update state with customer info
      setState((prev) => ({ ...prev, customerInfo: details }))

      // Create booking via tRPC
      // Note: For public booking portal, we'll need a public procedure
      // For now, assuming we have api.booking.create available
      // In production, this would use api.portal.createBooking or similar
      await createBookingMutation.mutateAsync({
        customerId: "00000000-0000-0000-0000-000000000000", // Placeholder - portal should create customer
        serviceId: state.selectedService.id,
        staffId: state.selectedSlot.userId ?? undefined,
        scheduledDate: state.selectedSlot.startTime,
        scheduledTime: state.selectedSlot.startTime.toTimeString().slice(0, 5),
        durationMinutes: state.selectedService.durationMinutes,
        customerNotes: details.notes ?? undefined,
        source: "PORTAL" as const,
        skipReservation: false,
      })
    },
    [state.selectedService, state.selectedSlot, createBookingMutation]
  )

  // Reset flow
  const reset = useCallback(() => {
    setState({ ...initialState, tenantId: tenantSlug })
    setStoredState(null)
  }, [tenantSlug, setStoredState])

  return {
    state,
    currentStep: state.currentStep,
    isSubmitting: createBookingMutation.isPending,
    nextStep,
    prevStep,
    goToStep,
    selectService,
    selectSlot,
    submitCustomerDetails,
    reset,
  }
}
