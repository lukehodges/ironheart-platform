import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useTenantTheme } from "../use-tenant-theme";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const { mockUseQuery } = vi.hoisted(() => ({
  mockUseQuery: vi.fn(),
}));

vi.mock("@/lib/trpc/react", () => ({
  api: {
    tenant: {
      getPublicSettings: {
        useQuery: mockUseQuery,
      },
    },
  },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeTenantSettings = (overrides = {}) => ({
  slug: "test-tenant",
  businessName: "Test Business",
  primaryColor: "#FF5733",
  secondaryColor: "#33C3FF",
  accentColor: "#FFC300",
  logoUrl: "https://example.com/logo.png",
  faviconUrl: "https://example.com/favicon.ico",
  customCss: ".custom { color: red; }",
  fontFamily: "Inter, sans-serif",
  ...overrides,
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useTenantTheme", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Theme Loading", () => {
    it("fetches tenant settings correctly", () => {
      const tenantData = makeTenantSettings();

      mockUseQuery.mockReturnValue({
        data: tenantData,
        isLoading: false,
        isError: false,
      });

      const { result } = renderHook(() =>
        useTenantTheme({ tenantSlug: "test-tenant" })
      );

      expect(mockUseQuery).toHaveBeenCalledWith(
        { slug: "test-tenant" },
        expect.objectContaining({
          staleTime: 30_000,
          retry: 1,
          enabled: true,
        })
      );

      expect(result.current.theme).toEqual({
        brandColor: tenantData.primaryColor,
        primaryColor: tenantData.primaryColor,
        secondaryColor: tenantData.secondaryColor,
        accentColor: tenantData.accentColor,
        logoUrl: tenantData.logoUrl,
        faviconUrl: tenantData.faviconUrl,
        businessName: tenantData.businessName,
        tagline: null,
        customCss: tenantData.customCss,
        fontFamily: tenantData.fontFamily,
      });

      expect(result.current.businessName).toBe("Test Business");
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isError).toBe(false);
    });

    it("returns loading state", () => {
      mockUseQuery.mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
      });

      const { result } = renderHook(() =>
        useTenantTheme({ tenantSlug: "test-tenant" })
      );

      expect(result.current.isLoading).toBe(true);
      expect(result.current.theme).toBeNull();
      expect(result.current.businessName).toBeNull();
    });

    it("returns error state if tenant not found", () => {
      mockUseQuery.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
      });

      const { result } = renderHook(() =>
        useTenantTheme({ tenantSlug: "nonexistent-tenant" })
      );

      expect(result.current.isError).toBe(true);
      expect(result.current.theme).toBeNull();
      expect(result.current.businessName).toBeNull();
    });
  });

  describe("Theme Transformation", () => {
    it("uses fallback values for missing fields", () => {
      const minimalTenantData = {
        slug: "test-tenant",
        businessName: null,
        primaryColor: null,
        secondaryColor: null,
        accentColor: null,
        logoUrl: null,
        faviconUrl: null,
        customCss: null,
        fontFamily: null,
      };

      mockUseQuery.mockReturnValue({
        data: minimalTenantData,
        isLoading: false,
        isError: false,
      });

      const { result } = renderHook(() =>
        useTenantTheme({ tenantSlug: "test-tenant" })
      );

      expect(result.current.theme).toEqual({
        brandColor: "#000000",
        primaryColor: "#000000",
        secondaryColor: null,
        accentColor: null,
        logoUrl: null,
        faviconUrl: null,
        businessName: "Booking Portal",
        tagline: null,
        customCss: null,
        fontFamily: null,
      });

      expect(result.current.businessName).toBe("Booking Portal");
    });

    it("maps primaryColor to brandColor correctly", () => {
      const tenantData = makeTenantSettings({
        primaryColor: "#123456",
      });

      mockUseQuery.mockReturnValue({
        data: tenantData,
        isLoading: false,
        isError: false,
      });

      const { result } = renderHook(() =>
        useTenantTheme({ tenantSlug: "test-tenant" })
      );

      expect(result.current.theme?.brandColor).toBe("#123456");
      expect(result.current.theme?.primaryColor).toBe("#123456");
    });
  });

  describe("React Query Configuration", () => {
    it("caches result with 30s stale time", () => {
      mockUseQuery.mockReturnValue({
        data: makeTenantSettings(),
        isLoading: false,
        isError: false,
      });

      renderHook(() => useTenantTheme({ tenantSlug: "test-tenant" }));

      expect(mockUseQuery).toHaveBeenCalledWith(
        { slug: "test-tenant" },
        expect.objectContaining({
          staleTime: 30_000,
        })
      );
    });

    it("retries once on failure", () => {
      mockUseQuery.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
      });

      renderHook(() => useTenantTheme({ tenantSlug: "test-tenant" }));

      expect(mockUseQuery).toHaveBeenCalledWith(
        { slug: "test-tenant" },
        expect.objectContaining({
          retry: 1,
        })
      );
    });

    it("disables query when tenantSlug is empty", () => {
      mockUseQuery.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: false,
      });

      renderHook(() => useTenantTheme({ tenantSlug: "" }));

      expect(mockUseQuery).toHaveBeenCalledWith(
        { slug: "" },
        expect.objectContaining({
          enabled: false,
        })
      );
    });

    it("enables query when tenantSlug is provided", () => {
      mockUseQuery.mockReturnValue({
        data: makeTenantSettings(),
        isLoading: false,
        isError: false,
      });

      renderHook(() => useTenantTheme({ tenantSlug: "test-tenant" }));

      expect(mockUseQuery).toHaveBeenCalledWith(
        { slug: "test-tenant" },
        expect.objectContaining({
          enabled: true,
        })
      );
    });
  });

  describe("Business Name Extraction", () => {
    it("returns businessName from theme data", () => {
      mockUseQuery.mockReturnValue({
        data: makeTenantSettings({ businessName: "Acme Corp" }),
        isLoading: false,
        isError: false,
      });

      const { result } = renderHook(() =>
        useTenantTheme({ tenantSlug: "test-tenant" })
      );

      expect(result.current.businessName).toBe("Acme Corp");
    });

    it("returns null when theme is not loaded", () => {
      mockUseQuery.mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
      });

      const { result } = renderHook(() =>
        useTenantTheme({ tenantSlug: "test-tenant" })
      );

      expect(result.current.businessName).toBeNull();
    });

    it("returns default businessName when null in data", () => {
      mockUseQuery.mockReturnValue({
        data: makeTenantSettings({ businessName: null }),
        isLoading: false,
        isError: false,
      });

      const { result } = renderHook(() =>
        useTenantTheme({ tenantSlug: "test-tenant" })
      );

      expect(result.current.businessName).toBe("Booking Portal");
    });
  });
});
