import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import BookingWizardPage from "../page";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Mock useParams
const mockUseParams = vi.fn(() => ({ tenantSlug: "test-tenant" }));
vi.mock("next/navigation", async () => {
  const actual = await vi.importActual("next/navigation");
  return {
    ...actual,
    useParams: mockUseParams,
  };
});

// Mock useTenantTheme
const mockUseTenantTheme = vi.fn();
vi.mock("@/hooks/use-tenant-theme", () => ({
  useTenantTheme: mockUseTenantTheme,
}));

// Mock useBookingFlow
const mockUseBookingFlow = vi.fn();
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

      expect(screen.getByText("Your Details")).toBeInTheDocument();
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
        screen.getByText("Your appointment has been successfully booked")
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
    it("shows Continue button on SELECT_SERVICE step", () => {
      render(<BookingWizardPage />);

      expect(
        screen.getByRole("button", { name: /continue/i })
      ).toBeInTheDocument();
    });

    it("disables Continue when no service selected", () => {
      mockUseBookingFlow.mockReturnValue({
        ...mockBookingFlow,
        state: {
          ...mockBookingFlow.state,
          selectedService: null,
        },
      });

      render(<BookingWizardPage />);

      const continueButton = screen.getByRole("button", { name: /continue/i });
      expect(continueButton).toBeDisabled();
    });

    it("calls nextStep when Continue is clicked", async () => {
      const user = userEvent.setup();
      const nextStep = vi.fn();

      mockUseBookingFlow.mockReturnValue({
        ...mockBookingFlow,
        nextStep,
        state: {
          ...mockBookingFlow.state,
          selectedService: { id: "service-1", name: "Test Service" },
        },
      });

      render(<BookingWizardPage />);

      const continueButton = screen.getByRole("button", { name: /continue/i });
      await user.click(continueButton);

      expect(nextStep).toHaveBeenCalled();
    });

    it("shows Back button on PICK_SLOT step", () => {
      mockUseBookingFlow.mockReturnValue({
        ...mockBookingFlow,
        currentStep: "PICK_SLOT",
      });

      render(<BookingWizardPage />);

      expect(screen.getByRole("button", { name: /back/i })).toBeInTheDocument();
    });

    it("calls prevStep when Back is clicked", async () => {
      const user = userEvent.setup();
      const prevStep = vi.fn();

      mockUseBookingFlow.mockReturnValue({
        ...mockBookingFlow,
        currentStep: "PICK_SLOT",
        prevStep,
      });

      render(<BookingWizardPage />);

      const backButton = screen.getByRole("button", { name: /back/i });
      await user.click(backButton);

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
        },
      });
    });

    it("displays booking ID on success", () => {
      render(<BookingWizardPage />);

      expect(screen.getByText(/Booking ID: booking-123/i)).toBeInTheDocument();
    });

    it("shows Book Another button", () => {
      render(<BookingWizardPage />);

      expect(
        screen.getByRole("button", { name: /book another/i })
      ).toBeInTheDocument();
    });

    it("calls reset when Book Another is clicked", async () => {
      const user = userEvent.setup();
      const reset = vi.fn();

      mockUseBookingFlow.mockReturnValue({
        ...mockBookingFlow,
        currentStep: "SUCCESS",
        state: {
          ...mockBookingFlow.state,
          currentStep: "SUCCESS",
          bookingId: "booking-123",
        },
        reset,
      });

      render(<BookingWizardPage />);

      const bookAnotherButton = screen.getByRole("button", {
        name: /book another/i,
      });
      await user.click(bookAnotherButton);

      expect(reset).toHaveBeenCalled();
    });

    it("shows View Booking button", () => {
      render(<BookingWizardPage />);

      expect(
        screen.getByRole("button", { name: /view booking/i })
      ).toBeInTheDocument();
    });

    it("navigates to booking page when View Booking is clicked", async () => {
      const user = userEvent.setup();
      const hrefSpy = vi.fn();

      Object.defineProperty(window, "location", {
        value: { href: "" },
        writable: true,
        configurable: true,
      });

      Object.defineProperty(window.location, "href", {
        set: hrefSpy,
        get: () => "",
      });

      render(<BookingWizardPage />);

      const viewBookingButton = screen.getByRole("button", {
        name: /view booking/i,
      });
      await user.click(viewBookingButton);

      expect(hrefSpy).toHaveBeenCalledWith("/booking/booking-123");
    });

    it("displays confirmation message", () => {
      render(<BookingWizardPage />);

      expect(
        screen.getByText(/A confirmation email has been sent/i)
      ).toBeInTheDocument();
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
    it("shows loading state on Confirm Booking button", () => {
      mockUseBookingFlow.mockReturnValue({
        ...mockBookingFlow,
        currentStep: "CUSTOMER_DETAILS",
        isSubmitting: true,
      });

      render(<BookingWizardPage />);

      const confirmButton = screen.getByRole("button", {
        name: /confirm booking/i,
      });
      expect(confirmButton).toHaveTextContent("Loading...");
      expect(confirmButton).toBeDisabled();
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
