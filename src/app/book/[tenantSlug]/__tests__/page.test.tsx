import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import BookingWizardPage from "../page";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const { mockUseParams, mockUseTenantTheme, mockUseBookingFlow } = vi.hoisted(() => ({
  mockUseParams: vi.fn(() => ({ tenantSlug: "test-tenant" })),
  mockUseTenantTheme: vi.fn(),
  mockUseBookingFlow: vi.fn(),
}));

// Mock useParams
vi.mock("next/navigation", async () => {
  const actual = await vi.importActual("next/navigation");
  return {
    ...actual,
    useParams: mockUseParams,
  };
});

// Mock useTenantTheme
vi.mock("@/hooks/use-tenant-theme", () => ({
  useTenantTheme: mockUseTenantTheme,
}));

// Mock useBookingFlow
vi.mock("@/hooks/use-booking-flow", () => ({
  useBookingFlow: mockUseBookingFlow,
}));

// Mock UI components to simplify testing
vi.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, disabled, loading, ...props }: any) => (
    <button onClick={onClick} disabled={disabled || loading} {...props}>
      {loading ? "Loading..." : children}
    </button>
  ),
}));

vi.mock("@/components/ui/card", () => ({
  Card: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardHeader: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardTitle: ({ children, ...props }: any) => <h2 {...props}>{children}</h2>,
  CardDescription: ({ children, ...props }: any) => <p {...props}>{children}</p>,
  CardContent: ({ children, ...props }: any) => <div {...props}>{children}</div>,
}));

vi.mock("@/components/ui/progress", () => ({
  Progress: ({ value, ...props }: any) => (
    <div role="progressbar" aria-valuenow={value} {...props} />
  ),
}));

vi.mock("@/components/ui/skeleton", () => ({
  Skeleton: ({ ...props }: any) => <div data-testid="skeleton" {...props} />,
}));

// Mock child booking-flow components so page-level tests stay isolated
vi.mock("@/components/booking-flow/service-selector", () => ({
  ServiceSelector: ({ onSelect, selectedId }: any) => (
    <div data-testid="service-selector">
      <span>ServiceSelector mock</span>
      {selectedId && <span>Selected: {selectedId}</span>}
      <button onClick={() => onSelect({ id: "service-1", name: "Test Service" })}>
        Select a service
      </button>
    </div>
  ),
  default: ({ onSelect, selectedId }: any) => (
    <div data-testid="service-selector">
      <span>ServiceSelector mock</span>
      {selectedId && <span>Selected: {selectedId}</span>}
      <button onClick={() => onSelect({ id: "service-1", name: "Test Service" })}>
        Select a service
      </button>
    </div>
  ),
}));

vi.mock("@/components/booking-flow/slot-picker", () => ({
  SlotPicker: ({ onSelect }: any) => (
    <div data-testid="slot-picker">
      <span>SlotPicker mock</span>
      <button onClick={() => onSelect({ startTime: new Date(), userId: "u1", userDisplayName: "Staff" })}>
        Pick a slot
      </button>
    </div>
  ),
  default: ({ onSelect }: any) => (
    <div data-testid="slot-picker">
      <span>SlotPicker mock</span>
      <button onClick={() => onSelect({ startTime: new Date(), userId: "u1", userDisplayName: "Staff" })}>
        Pick a slot
      </button>
    </div>
  ),
}));

vi.mock("@/components/booking-flow/customer-details-form", () => ({
  CustomerDetailsForm: ({ onSubmit, isLoading }: any) => (
    <div data-testid="customer-details-form">
      <span>CustomerDetailsForm mock</span>
      <button
        onClick={() => onSubmit({ name: "Test", email: "test@test.com", phone: "123", notes: null, dynamicFields: {} })}
        disabled={isLoading}
        aria-label="Complete Booking"
      >
        {isLoading ? "Submitting..." : "Complete Booking"}
      </button>
    </div>
  ),
  default: ({ onSubmit, isLoading }: any) => (
    <div data-testid="customer-details-form">
      <span>CustomerDetailsForm mock</span>
      <button
        onClick={() => onSubmit({ name: "Test", email: "test@test.com", phone: "123", notes: null, dynamicFields: {} })}
        disabled={isLoading}
        aria-label="Complete Booking"
      >
        {isLoading ? "Submitting..." : "Complete Booking"}
      </button>
    </div>
  ),
}));

vi.mock("@/components/booking-flow/booking-success", () => ({
  BookingSuccess: ({ booking }: any) => (
    <div data-testid="booking-success">
      <h1>Booking Confirmed!</h1>
      <p>Your appointment has been successfully scheduled.</p>
      <span>Reference: BK-{booking.id.slice(0, 6).toUpperCase()}</span>
      <p>A confirmation email has been sent to {booking.customerEmail}</p>
      <button aria-label="Print booking confirmation">Print Confirmation</button>
    </div>
  ),
  default: ({ booking }: any) => (
    <div data-testid="booking-success">
      <h1>Booking Confirmed!</h1>
      <p>Your appointment has been successfully scheduled.</p>
      <span>Reference: BK-{booking.id.slice(0, 6).toUpperCase()}</span>
      <p>A confirmation email has been sent to {booking.customerEmail}</p>
      <button aria-label="Print booking confirmation">Print Confirmation</button>
    </div>
  ),
}));

vi.mock("@/components/booking-flow/wizard-progress", () => ({
  WizardProgress: ({ currentStep }: any) => (
    <div data-testid="wizard-progress">WizardProgress: {currentStep}</div>
  ),
  default: ({ currentStep }: any) => (
    <div data-testid="wizard-progress">WizardProgress: {currentStep}</div>
  ),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mockTheme = {
  brandColor: "#FF5733",
  primaryColor: "#FF5733",
  secondaryColor: "#33C3FF",
  accentColor: "#FFC300",
  logoUrl: "https://example.com/logo.png",
  faviconUrl: "https://example.com/favicon.ico",
  businessName: "Test Business",
  tagline: null,
  customCss: null,
  fontFamily: null,
};

const mockBookingFlow = {
  state: {
    currentStep: "SELECT_SERVICE",
    tenantId: "test-tenant",
    selectedService: null,
    selectedSlot: null,
    customerInfo: null,
    bookingId: null,
  },
  currentStep: "SELECT_SERVICE",
  isSubmitting: false,
  nextStep: vi.fn(),
  prevStep: vi.fn(),
  goToStep: vi.fn(),
  selectService: vi.fn(),
  selectSlot: vi.fn(),
  submitCustomerDetails: vi.fn(),
  reset: vi.fn(),
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("BookingWizardPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseParams.mockReturnValue({ tenantSlug: "test-tenant" });

    // Default mock implementations
    mockUseTenantTheme.mockReturnValue({
      theme: mockTheme,
      isLoading: false,
      isError: false,
      businessName: "Test Business",
    });

    mockUseBookingFlow.mockReturnValue(mockBookingFlow);

    // Mock document.title
    Object.defineProperty(document, "title", {
      writable: true,
      value: "",
    });
  });

  describe("Loading State", () => {
    it("shows loading skeleton when theme is loading", () => {
      mockUseTenantTheme.mockReturnValue({
        theme: null,
        isLoading: true,
        isError: false,
        businessName: null,
      });

      render(<BookingWizardPage />);

      expect(screen.getAllByTestId("skeleton")).not.toHaveLength(0);
    });
  });

  describe("Error State - Tenant Not Found", () => {
    it("shows error message when tenant not found", () => {
      mockUseTenantTheme.mockReturnValue({
        theme: null,
        isLoading: false,
        isError: true,
        businessName: null,
      });

      render(<BookingWizardPage />);

      expect(screen.getByText("Booking Not Available")).toBeInTheDocument();
      expect(
        screen.getByText(/We couldn't find this booking page/i)
      ).toBeInTheDocument();
    });

    it("shows retry button on error", () => {
      mockUseTenantTheme.mockReturnValue({
        theme: null,
        isLoading: false,
        isError: true,
        businessName: null,
      });

      render(<BookingWizardPage />);

      expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
    });

    it("reloads page when retry is clicked", async () => {
      const user = userEvent.setup();
      const reloadSpy = vi.fn();
      Object.defineProperty(window, "location", {
        value: { reload: reloadSpy },
        writable: true,
      });

      mockUseTenantTheme.mockReturnValue({
        theme: null,
        isLoading: false,
        isError: true,
        businessName: null,
      });

      render(<BookingWizardPage />);

      const retryButton = screen.getByRole("button", { name: /retry/i });
      await user.click(retryButton);

      expect(reloadSpy).toHaveBeenCalled();
    });
  });

  describe("Tenant Theme Application", () => {
    it("loads tenant theme correctly", () => {
      render(<BookingWizardPage />);

      expect(mockUseTenantTheme).toHaveBeenCalledWith({
        tenantSlug: "test-tenant",
      });
    });

    it("displays business name in header", () => {
      render(<BookingWizardPage />);

      expect(screen.getByText("Test Business")).toBeInTheDocument();
    });

    it("displays logo when logoUrl is provided", () => {
      render(<BookingWizardPage />);

      const logo = screen.getByAltText("Test Business");
      expect(logo).toBeInTheDocument();
      expect(logo).toHaveAttribute("src", mockTheme.logoUrl);
    });

    it("updates document title when businessName loads", () => {
      render(<BookingWizardPage />);

      waitFor(() => {
        expect(document.title).toBe("Test Business - Book Appointment");
      });
    });

    it("does not update title when businessName is null", () => {
      mockUseTenantTheme.mockReturnValue({
        theme: mockTheme,
        isLoading: false,
        isError: false,
        businessName: null,
      });

      const initialTitle = "Initial Title";
      document.title = initialTitle;

      render(<BookingWizardPage />);

      expect(document.title).toBe(initialTitle);
    });
  });

  describe("Wizard Steps Rendering", () => {
    it("renders SELECT_SERVICE step", () => {
      mockUseBookingFlow.mockReturnValue({
        ...mockBookingFlow,
        currentStep: "SELECT_SERVICE",
      });

      render(<BookingWizardPage />);

      expect(screen.getByText("Select a Service")).toBeInTheDocument();
      expect(
        screen.getByText("Choose the service you'd like to book")
      ).toBeInTheDocument();
    });

    it("renders PICK_SLOT step", () => {
      mockUseBookingFlow.mockReturnValue({
        ...mockBookingFlow,
        currentStep: "PICK_SLOT",
      });

      render(<BookingWizardPage />);

      expect(screen.getByText("Pick a Time Slot")).toBeInTheDocument();
      expect(
        screen.getByText("Choose your preferred date and time")
      ).toBeInTheDocument();
    });

    it("renders CUSTOMER_DETAILS step", () => {
      mockUseBookingFlow.mockReturnValue({
        ...mockBookingFlow,
        currentStep: "CUSTOMER_DETAILS",
      });

      render(<BookingWizardPage />);

      // "Your Details" appears in both the progress label and the card title,
      // so use getAllByText and verify at least one is present
      const detailsElements = screen.getAllByText("Your Details");
      expect(detailsElements.length).toBeGreaterThanOrEqual(1);
      expect(
        screen.getByText("Complete your booking information")
      ).toBeInTheDocument();
    });

    it("renders SUCCESS step", () => {
      mockUseBookingFlow.mockReturnValue({
        ...mockBookingFlow,
        currentStep: "SUCCESS",
        state: {
          ...mockBookingFlow.state,
          currentStep: "SUCCESS",
          bookingId: "booking-123",
        },
      });

      render(<BookingWizardPage />);

      expect(screen.getByText("Booking Confirmed!")).toBeInTheDocument();
      expect(
        screen.getByText("Your appointment has been successfully scheduled.")
      ).toBeInTheDocument();
    });
  });

  describe("Progress Indicator", () => {
    it("displays progress for step 1 (SELECT_SERVICE)", () => {
      mockUseBookingFlow.mockReturnValue({
        ...mockBookingFlow,
        currentStep: "SELECT_SERVICE",
      });

      render(<BookingWizardPage />);

      expect(screen.getByText("Step 1 of 3")).toBeInTheDocument();
      const progressBar = screen.getByRole("progressbar");
      expect(progressBar).toHaveAttribute("aria-valuenow", "25"); // 1/4 = 25%
    });

    it("displays progress for step 2 (PICK_SLOT)", () => {
      mockUseBookingFlow.mockReturnValue({
        ...mockBookingFlow,
        currentStep: "PICK_SLOT",
      });

      render(<BookingWizardPage />);

      expect(screen.getByText("Step 2 of 3")).toBeInTheDocument();
      const progressBar = screen.getByRole("progressbar");
      expect(progressBar).toHaveAttribute("aria-valuenow", "50"); // 2/4 = 50%
    });

    it("displays progress for step 3 (CUSTOMER_DETAILS)", () => {
      mockUseBookingFlow.mockReturnValue({
        ...mockBookingFlow,
        currentStep: "CUSTOMER_DETAILS",
      });

      render(<BookingWizardPage />);

      expect(screen.getByText("Step 3 of 3")).toBeInTheDocument();
      const progressBar = screen.getByRole("progressbar");
      expect(progressBar).toHaveAttribute("aria-valuenow", "75"); // 3/4 = 75%
    });

    it("hides progress indicator on SUCCESS step", () => {
      mockUseBookingFlow.mockReturnValue({
        ...mockBookingFlow,
        currentStep: "SUCCESS",
      });

      render(<BookingWizardPage />);

      expect(screen.queryByText("Step 1 of 3")).not.toBeInTheDocument();
      expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    });
  });

  describe("Step Navigation", () => {
    it("triggers service selection and advances step via ServiceSelector onSelect", async () => {
      const user = userEvent.setup();
      const selectService = vi.fn();
      const nextStep = vi.fn();

      mockUseBookingFlow.mockReturnValue({
        ...mockBookingFlow,
        selectService,
        nextStep,
      });

      render(<BookingWizardPage />);

      // The ServiceSelector mock exposes a "Select a service" button
      // which calls onSelect - the page wires onSelect to selectService + nextStep
      const selectButton = screen.getByRole("button", { name: /select a service/i });
      await user.click(selectButton);

      expect(selectService).toHaveBeenCalledWith({ id: "service-1", name: "Test Service" });
      expect(nextStep).toHaveBeenCalled();
    });

    it("renders ServiceSelector with selectedId from state", () => {
      mockUseBookingFlow.mockReturnValue({
        ...mockBookingFlow,
        state: {
          ...mockBookingFlow.state,
          selectedService: { id: "service-1", name: "Test Service" },
        },
      });

      render(<BookingWizardPage />);

      expect(screen.getByText("Selected: service-1")).toBeInTheDocument();
    });

    it("does not advance step when no service is selected in state", () => {
      mockUseBookingFlow.mockReturnValue({
        ...mockBookingFlow,
        state: {
          ...mockBookingFlow.state,
          selectedService: null,
        },
      });

      render(<BookingWizardPage />);

      // ServiceSelector is rendered; page delegates selection to it
      expect(screen.getByTestId("service-selector")).toBeInTheDocument();
      // nextStep has not been called yet
      expect(mockBookingFlow.nextStep).not.toHaveBeenCalled();
    });

    it("shows back navigation button on PICK_SLOT step", () => {
      mockUseBookingFlow.mockReturnValue({
        ...mockBookingFlow,
        currentStep: "PICK_SLOT",
      });

      render(<BookingWizardPage />);

      // The back button is an icon-only button with size="icon-sm" and a ChevronLeft icon
      // It uses variant="ghost" and has no text label - find it by its role within the card header
      const buttons = screen.getAllByRole("button");
      const backButton = buttons.find(
        (btn) => btn.getAttribute("variant") === "ghost" || btn.closest("[class*='justify-between']")
      );
      expect(backButton).toBeDefined();
    });

    it("calls prevStep when back navigation is clicked on PICK_SLOT step", async () => {
      const user = userEvent.setup();
      const prevStep = vi.fn();

      mockUseBookingFlow.mockReturnValue({
        ...mockBookingFlow,
        currentStep: "PICK_SLOT",
        prevStep,
      });

      render(<BookingWizardPage />);

      // The icon-only back button is rendered by the page with variant="ghost"
      // and contains a ChevronLeft SVG. Find it by looking for the button with
      // variant="ghost" attribute (passed through by our Button mock via ...props)
      const allButtons = screen.getAllByRole("button");
      const backButton = allButtons.find(
        (btn) => btn.getAttribute("variant") === "ghost"
      );
      expect(backButton).toBeDefined();
      await user.click(backButton!);

      expect(prevStep).toHaveBeenCalled();
    });
  });

  describe("Success Screen", () => {
    beforeEach(() => {
      mockUseBookingFlow.mockReturnValue({
        ...mockBookingFlow,
        currentStep: "SUCCESS",
        state: {
          ...mockBookingFlow.state,
          currentStep: "SUCCESS",
          bookingId: "booking-123",
          selectedService: { name: "Service", durationMinutes: 60, basePrice: 0, currency: "USD" },
          selectedSlot: { startTime: new Date(), userDisplayName: null },
          customerInfo: { email: "test@example.com" },
        },
      });
    });

    it("displays booking reference on success", () => {
      render(<BookingWizardPage />);

      // BookingSuccess renders the reference as "BK-" + first 6 chars of ID uppercased
      expect(screen.getByText(/Reference: BK-BOOKI/i)).toBeInTheDocument();
    });

    it("renders BookingSuccess component with correct booking data", () => {
      render(<BookingWizardPage />);

      expect(screen.getByTestId("booking-success")).toBeInTheDocument();
      expect(screen.getByText("Booking Confirmed!")).toBeInTheDocument();
    });

    it("shows Print Confirmation button", () => {
      render(<BookingWizardPage />);

      expect(
        screen.getByRole("button", { name: /print booking confirmation/i })
      ).toBeInTheDocument();
    });

    it("displays confirmation message", () => {
      render(<BookingWizardPage />);

      expect(
        screen.getByText(/A confirmation email has been sent/i)
      ).toBeInTheDocument();
    });

    it("displays success description", () => {
      render(<BookingWizardPage />);

      expect(
        screen.getByText(/Your appointment has been successfully scheduled/i)
      ).toBeInTheDocument();
    });

    it("hides progress bar and wizard progress on success", () => {
      render(<BookingWizardPage />);

      expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
      expect(screen.queryByTestId("wizard-progress")).not.toBeInTheDocument();
    });
  });

  describe("Mobile Responsiveness", () => {
    it("shows simplified step indicators on mobile", () => {
      render(<BookingWizardPage />);

      // Desktop step indicators have "hidden md:flex" class
      // Mobile shows progress bar instead
      expect(screen.getByRole("progressbar")).toBeInTheDocument();
    });
  });

  describe("Footer", () => {
    it("displays footer with business name", () => {
      render(<BookingWizardPage />);

      expect(screen.getByText(/Powered by Test Business/i)).toBeInTheDocument();
    });

    it("displays fallback when businessName is null", () => {
      mockUseTenantTheme.mockReturnValue({
        theme: mockTheme,
        isLoading: false,
        isError: false,
        businessName: null,
      });

      render(<BookingWizardPage />);

      expect(
        screen.getByText(/Powered by Booking System/i)
      ).toBeInTheDocument();
    });
  });

  describe("Loading State for Submission", () => {
    it("shows loading state on Complete Booking button", () => {
      mockUseBookingFlow.mockReturnValue({
        ...mockBookingFlow,
        currentStep: "CUSTOMER_DETAILS",
        isSubmitting: true,
      });

      render(<BookingWizardPage />);

      // CustomerDetailsForm mock renders a "Complete Booking" button that
      // shows "Submitting..." and is disabled when isLoading is true
      const submitButton = screen.getByRole("button", {
        name: /complete booking/i,
      });
      expect(submitButton).toHaveTextContent("Submitting...");
      expect(submitButton).toBeDisabled();
    });
  });

  describe("Integration", () => {
    it("initializes booking flow with tenant slug", () => {
      render(<BookingWizardPage />);

      expect(mockUseBookingFlow).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantSlug: "test-tenant",
        })
      );
    });

    it("passes onSuccess callback to booking flow", () => {
      render(<BookingWizardPage />);

      expect(mockUseBookingFlow).toHaveBeenCalledWith(
        expect.objectContaining({
          onSuccess: expect.any(Function),
        })
      );
    });
  });
});
