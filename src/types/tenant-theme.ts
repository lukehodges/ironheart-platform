import { z } from 'zod';

/**
 * Tenant theme configuration for white-label branding
 */
export interface TenantThemeConfig {
  brandColor: string;
  primaryColor: string;
  secondaryColor: string | null;
  accentColor: string | null;
  logoUrl: string | null;
  faviconUrl: string | null;
  businessName: string;
  tagline: string | null;
  customCss: string | null;
  fontFamily: string | null;
}

export const TenantThemeConfigSchema = z.object({
  brandColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid hex color'),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid hex color'),
  secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid hex color').nullable(),
  accentColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid hex color').nullable(),
  logoUrl: z.string().url().nullable(),
  faviconUrl: z.string().url().nullable(),
  businessName: z.string().min(1, 'Business name is required'),
  tagline: z.string().nullable(),
  customCss: z.string().nullable(),
  fontFamily: z.string().nullable(),
});

/**
 * CSS variable overrides derived from theme config
 */
export interface ThemeOverrides {
  '--brand-color': string;
  '--primary-color': string;
  '--secondary-color'?: string;
  '--accent-color'?: string;
  '--font-family'?: string;
}

export const ThemeOverridesSchema = z.object({
  '--brand-color': z.string(),
  '--primary-color': z.string(),
  '--secondary-color': z.string().optional(),
  '--accent-color': z.string().optional(),
  '--font-family': z.string().optional(),
});

/**
 * Tenant public profile (for booking page header/footer)
 */
export interface TenantPublicProfile {
  id: string;
  businessName: string;
  logoUrl: string | null;
  tagline: string | null;
  theme: TenantThemeConfig;
  contactEmail: string | null;
  contactPhone: string | null;
  websiteUrl: string | null;
  timezone: string;
}

export const TenantPublicProfileSchema = z.object({
  id: z.uuid(),
  businessName: z.string(),
  logoUrl: z.string().url().nullable(),
  tagline: z.string().nullable(),
  theme: TenantThemeConfigSchema,
  contactEmail: z.string().email().nullable(),
  contactPhone: z.string().nullable(),
  websiteUrl: z.string().url().nullable(),
  timezone: z.string(),
});

/**
 * Tenant slug lookup result
 */
export interface TenantSlugLookup {
  tenantId: string;
  slug: string;
  isActive: boolean;
}

export const TenantSlugLookupSchema = z.object({
  tenantId: z.uuid(),
  slug: z.string().min(1),
  isActive: z.boolean(),
});
