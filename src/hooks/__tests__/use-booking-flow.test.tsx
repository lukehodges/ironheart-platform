import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useBookingFlow } from "../use-booking-flow";
import { WizardStep } from "@/types/booking-flow";
import type { ServiceCard, AvailableSlot } from "@/types/booking-flow";
import type { ReactNode } from "react";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Mock tRPC
vi.mock("@/lib/trpc/react", () => ({
  api: {
    booking: {
      create: {
        useMutation: () => ({
          mutateAsync: vi.fn(),
          isPending: false,
        }),
      },
    },
  },
}));

// Mock toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

const makeServiceCard = (): ServiceCard => ({
  id: "service-1",
  name: "Test Service",
  description: "Test description",
  durationMinutes: 60,
  basePrice: 100,
  currency: "USD",
  imageUrl: null,
  isAvailable: true,
});

const makeSlot = (): AvailableSlot => ({
  startTime: new Date("2026-06-01T10:00:00Z"),
  endTime: new Date("2026-06-01T11:00:00Z"),
  userId: "user-1",
  userDisplayName: "John Doe",
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useBookingFlow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("initializes with SELECT_SERVICE step", () => {
    const { result } = renderHook(
      () => useBookingFlow({ tenantSlug: "test-tenant" }),
      { wrapper: createWrapper() }
    );

    expect(result.current.currentStep).toBe(WizardStep.SELECT_SERVICE);
    expect(result.current.state.selectedService).toBeNull();
    expect(result.current.state.selectedSlot).toBeNull();
  });

  it("selects a service", () => {
    const { result } = renderHook(
      () => useBookingFlow({ tenantSlug: "test-tenant" }),
      { wrapper: createWrapper() }
    );

    const service = makeServiceCard();

    act(() => {
      result.current.selectService(service);
    });

    expect(result.current.state.selectedService).toEqual(service);
  });

  it("selects a slot", () => {
    const { result } = renderHook(
      () => useBookingFlow({ tenantSlug: "test-tenant" }),
      { wrapper: createWrapper() }
    );

    const slot = makeSlot();

    act(() => {
      result.current.selectSlot(slot);
    });

    expect(result.current.state.selectedSlot).toEqual(slot);
  });

  it("advances to next step", () => {
    const { result } = renderHook(
      () => useBookingFlow({ tenantSlug: "test-tenant" }),
      { wrapper: createWrapper() }
    );

    const service = makeServiceCard();

    act(() => {
      result.current.selectService(service);
      result.current.nextStep();
    });

    expect(result.current.currentStep).toBe(WizardStep.PICK_SLOT);
  });

  it("goes back to previous step", () => {
    const { result } = renderHook(
      () => useBookingFlow({ tenantSlug: "test-tenant" }),
      { wrapper: createWrapper() }
    );

    const service = makeServiceCard();

    act(() => {
      result.current.selectService(service);
      result.current.nextStep();
      result.current.prevStep();
    });

    expect(result.current.currentStep).toBe(WizardStep.SELECT_SERVICE);
  });

  it("resets flow to initial state", () => {
    const { result } = renderHook(
      () => useBookingFlow({ tenantSlug: "test-tenant" }),
      { wrapper: createWrapper() }
    );

    const service = makeServiceCard();
    const slot = makeSlot();

    act(() => {
      result.current.selectService(service);
      result.current.selectSlot(slot);
      result.current.reset();
    });

    expect(result.current.currentStep).toBe(WizardStep.SELECT_SERVICE);
    expect(result.current.state.selectedService).toBeNull();
    expect(result.current.state.selectedSlot).toBeNull();
  });

  it("returns isSubmitting state", () => {
    const { result } = renderHook(
      () => useBookingFlow({ tenantSlug: "test-tenant" }),
      { wrapper: createWrapper() }
    );

    expect(result.current.isSubmitting).toBe(false);
  });
});
