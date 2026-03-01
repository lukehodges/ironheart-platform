# Vertical Theming System — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a theming layer so each vertical gets its own visual identity (colors, typography, spacing, border radius) while sharing the same component library.

**Architecture:** CSS custom properties driven by a vertical config, consumed by Tailwind 4's theme system and shadcn/ui components.

**Tech Stack:** Tailwind 4, CSS custom properties, React Context

---

## 1. Theme Config Schema

### The `VerticalTheme` Interface

Every vertical (booking SaaS, cricket stadium ERP, carbon credits marketplace, medical practice, etc.) is defined by a single theme config object. This is the contract between the vertical definition and the rendering layer.

```typescript
// src/config/vertical-themes/vertical-theme.types.ts

/**
 * HSL color values for a single semantic color, covering both light and dark modes.
 * Values are space-separated HSL strings WITHOUT the `hsl()` wrapper, matching
 * the convention already established in globals.css (e.g. "221.2 83.2% 53.3%").
 */
interface ThemeColorPair {
  light: string   // e.g. "142.1 76.2% 36.3%"
  dark: string    // e.g. "142.1 70.6% 45.3%"
}

/**
 * Full color palette for a vertical. Each key maps directly to a CSS custom property
 * that shadcn/ui components already consume via globals.css.
 */
interface VerticalColorPalette {
  /** Primary action color — buttons, links, focus rings */
  primary: ThemeColorPair
  /** Primary foreground — text on primary backgrounds */
  primaryForeground: ThemeColorPair
  /** Accent color — hover states, secondary highlights */
  accent: ThemeColorPair
  /** Accent foreground — text on accent backgrounds */
  accentForeground: ThemeColorPair
  /** Ring/focus color — typically matches primary */
  ring: ThemeColorPair
  /** Sidebar background */
  sidebar: ThemeColorPair
  /** Sidebar foreground */
  sidebarForeground: ThemeColorPair
  /** Sidebar accent */
  sidebarAccent: ThemeColorPair
  /** Sidebar accent foreground */
  sidebarAccentForeground: ThemeColorPair
  /** Sidebar ring */
  sidebarRing: ThemeColorPair
  /** Chart palette — 5 colors for data visualization */
  chart1: ThemeColorPair
  chart2: ThemeColorPair
  chart3: ThemeColorPair
  chart4: ThemeColorPair
  chart5: ThemeColorPair
}

/**
 * Typography configuration for a vertical.
 */
interface VerticalTypography {
  /** Font for headings — loaded via next/font or Google Fonts */
  headingFont: string
  /** Font for body text */
  bodyFont: string
  /** Optional: monospace font for code/data display */
  monoFont?: string
}

/**
 * Branding assets for a vertical.
 */
interface VerticalBranding {
  /** Path to the vertical's logo (light mode) — relative to /public */
  logo: string
  /** Path to the vertical's logo (dark mode) — relative to /public */
  logoDark?: string
  /** Path to favicon — relative to /public */
  favicon: string
  /** Display name for the vertical (shown in page titles, etc.) */
  appName: string
}

/**
 * Density presets control spacing scale multipliers.
 * - compact: tighter spacing, smaller padding — data-heavy dashboards
 * - comfortable: default spacing — general purpose
 * - spacious: larger spacing, more breathing room — customer-facing portals
 */
type VerticalDensity = 'compact' | 'comfortable' | 'spacious'

/**
 * Border radius presets map to the --radius CSS variable.
 */
type VerticalBorderRadius = 'none' | 'sm' | 'md' | 'lg' | 'full'

/**
 * The complete theme configuration for a vertical.
 */
interface VerticalTheme {
  /** Unique identifier for this vertical's theme */
  name: string
  /** Full color palette with light/dark mode support */
  colors: VerticalColorPalette
  /** Typography stack */
  typography: VerticalTypography
  /** Branding assets */
  branding: VerticalBranding
  /** Spacing density preset */
  density: VerticalDensity
  /** Border radius preset */
  borderRadius: VerticalBorderRadius
}
```

### How This Maps to CSS Variables

The existing `globals.css` already defines all the CSS custom properties that shadcn/ui components consume. The theming system overrides a targeted subset of those variables:

| `VerticalTheme` field | CSS Variable(s) set | Consumed by |
|---|---|---|
| `colors.primary` | `--primary` | `bg-primary`, `text-primary`, Button default variant |
| `colors.primaryForeground` | `--primary-foreground` | `text-primary-foreground`, Button text |
| `colors.accent` | `--accent` | `bg-accent`, hover states on ghost/outline buttons |
| `colors.accentForeground` | `--accent-foreground` | Text on accent backgrounds |
| `colors.ring` | `--ring` | `focus-visible:ring-ring`, focus outlines |
| `colors.sidebar*` | `--sidebar`, `--sidebar-foreground`, etc. | Sidebar component styles |
| `colors.chart1..5` | `--chart-1` through `--chart-5` | Recharts/chart components |
| `typography.bodyFont` | `--font-sans` | `font-sans` utility, body text |
| `typography.headingFont` | `--font-heading` (new) | Heading components |
| `borderRadius` | `--radius` | `rounded-sm/md/lg/xl` via calc in `@theme` |
| `density` | `--density-spacing` (new) | Padding/gap multiplier |

The key insight: shadcn/ui components already reference `hsl(var(--primary))`, `hsl(var(--accent))`, etc. via the Tailwind 4 `@theme inline` block in `globals.css`. The theming system only needs to **override the underlying HSL values** -- no component changes required.

### What stays constant across all verticals

These CSS variables are **not** overridden by vertical themes because they represent structural/semantic choices that should be consistent across the platform:

- `--background`, `--foreground` -- page background and text
- `--card`, `--card-foreground` -- card surfaces
- `--popover`, `--popover-foreground` -- popover surfaces
- `--secondary`, `--secondary-foreground` -- secondary surfaces
- `--muted`, `--muted-foreground` -- muted/disabled states
- `--destructive`, `--destructive-foreground` -- error/danger states
- `--success`, `--success-foreground` -- success states
- `--warning`, `--warning-foreground` -- warning states
- `--border`, `--input` -- border and input border colors

This keeps the overall light/dark mode feel consistent while letting each vertical have a distinct brand personality.

---

## 2. CSS Variables Layer

### Mechanism Overview

The theming system works in three layers:

```
VerticalTheme config (TypeScript)
    ↓  converted to
CSS custom property overrides (inline style or <style> element)
    ↓  consumed by
Tailwind 4 @theme declarations → shadcn/ui component classes
```

### How Tailwind 4's `@theme` Directive Works

Tailwind 4 replaced `tailwind.config.ts` with CSS-native configuration. The existing `globals.css` uses `@theme inline` to register CSS variables as Tailwind theme values:

```css
@theme inline {
  --color-primary: hsl(var(--primary));
  --color-primary-foreground: hsl(var(--primary-foreground));
  --color-accent: hsl(var(--accent));
  /* ... etc ... */
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
}
```

This means Tailwind utilities like `bg-primary`, `text-accent-foreground`, `rounded-lg` all resolve through CSS variables. Overriding those variables at any point in the cascade automatically changes the appearance of every component that uses them. **No class changes needed.**

### CSS Variables That Get Overridden

The vertical theme provider sets these CSS custom properties:

```css
/* Colors — HSL values without hsl() wrapper */
--primary: 142.1 76.2% 36.3%;
--primary-foreground: 0 0% 98%;
--accent: 32.1 94.6% 43.7%;
--accent-foreground: 0 0% 98%;
--ring: 142.1 76.2% 36.3%;

/* Sidebar */
--sidebar: 142.1 20% 8%;
--sidebar-foreground: 142.1 10% 90%;
--sidebar-accent: 142.1 15% 14%;
--sidebar-accent-foreground: 142.1 10% 90%;
--sidebar-ring: 142.1 76.2% 36.3%;

/* Charts */
--chart-1: 142.1 76.2% 36.3%;
--chart-2: 32.1 94.6% 43.7%;
--chart-3: 221.2 83.2% 53.3%;
--chart-4: 271.9 81.3% 55.9%;
--chart-5: 0 84.2% 60.2%;

/* Border radius */
--radius: 0.5rem;

/* Typography (new variables) */
--font-heading: 'Inter', ui-sans-serif, system-ui, sans-serif;

/* Density (new variable) */
--density-spacing: 1;
```

### Border Radius Mapping

The `borderRadius` preset maps to a single `--radius` value. All other radius tokens (`--radius-sm`, `--radius-md`, etc.) are derived via `calc()` in the existing `@theme` block:

| Preset | `--radius` value | Resulting `rounded-sm` | `rounded-md` | `rounded-lg` | `rounded-xl` |
|--------|-----------------|----------------------|---------------|---------------|---------------|
| `none` | `0` | `0` | `0` | `0` | `4px` |
| `sm` | `0.25rem` | `0` | `2px` | `4px` | `8px` |
| `md` | `0.5rem` | `4px` | `6px` | `8px` | `12px` |
| `lg` | `0.75rem` | `8px` | `10px` | `12px` | `16px` |
| `full` | `1rem` | `12px` | `14px` | `16px` | `20px` |

### Density Mapping

The `density` preset maps to a `--density-spacing` CSS variable that acts as a multiplier. This variable is consumed by a small set of utility classes added to `globals.css`:

| Preset | `--density-spacing` | Effect |
|--------|-------------------|--------|
| `compact` | `0.75` | Tighter padding/gaps. Table rows are denser. Good for data-heavy admin views. |
| `comfortable` | `1` | Default spacing. No change from base. |
| `spacious` | `1.25` | More breathing room. Good for customer-facing portals. |

New utility classes in `globals.css`:

```css
@layer utilities {
  .density-padding {
    padding: calc(var(--density-spacing) * 1rem);
  }
  .density-gap {
    gap: calc(var(--density-spacing) * 1rem);
  }
  .density-padding-sm {
    padding: calc(var(--density-spacing) * 0.5rem);
  }
  .density-gap-sm {
    gap: calc(var(--density-spacing) * 0.5rem);
  }
}
```

The higher-level components (`DataGrid`, `StatCard`, etc.) use these density-aware utilities internally.

### Scope: Admin vs. Portal

Two scoping strategies, both already established in the codebase:

1. **Admin area (vertical identity):** Theme applied on `<html>` element via the `VerticalThemeProvider`. This sets the vertical's visual identity for the entire admin dashboard.
2. **Public portal (tenant customization):** The existing `TenantThemeProvider` applies tenant-specific overrides within `.portal-theme-scope`. This lets individual tenants customize their booking portal within the vertical's palette.

The layering:

```
<html>                     ← VerticalThemeProvider sets vertical theme here
  <body>
    <div class="admin">    ← admin sees the vertical's colors
      ...
    </div>
    <div class="portal-theme-scope">  ← TenantThemeProvider overrides for portal
      ...
    </div>
  </body>
</html>
```

---

## 3. Theme Provider Component

### File: `src/components/providers/vertical-theme-provider.tsx`

```typescript
"use client"

import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react"
import type { VerticalTheme } from "@/config/vertical-themes/vertical-theme.types"
import { defaultTheme } from "@/config/vertical-themes/default"

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface VerticalThemeContextValue {
  /** The resolved vertical theme */
  theme: VerticalTheme
  /** Whether the theme is still loading */
  isLoading: boolean
}

const VerticalThemeContext = createContext<VerticalThemeContextValue | null>(null)

/**
 * Access the current vertical theme from any component.
 * Throws if used outside of VerticalThemeProvider.
 */
export function useVerticalTheme(): VerticalThemeContextValue {
  const ctx = useContext(VerticalThemeContext)
  if (!ctx) {
    throw new Error("useVerticalTheme must be used within VerticalThemeProvider")
  }
  return ctx
}

// ---------------------------------------------------------------------------
// Border radius presets
// ---------------------------------------------------------------------------

const RADIUS_MAP: Record<VerticalTheme["borderRadius"], string> = {
  none: "0",
  sm: "0.25rem",
  md: "0.5rem",
  lg: "0.75rem",
  full: "1rem",
}

// ---------------------------------------------------------------------------
// Density presets
// ---------------------------------------------------------------------------

const DENSITY_MAP: Record<VerticalTheme["density"], string> = {
  compact: "0.75",
  comfortable: "1",
  spacious: "1.25",
}

// ---------------------------------------------------------------------------
// CSS variable generation
// ---------------------------------------------------------------------------

/**
 * Convert a VerticalTheme into a flat map of CSS custom properties.
 * Produces both light-mode (:root) and dark-mode (.dark) values.
 */
function themeToLightCssVars(theme: VerticalTheme): Record<string, string> {
  const c = theme.colors
  return {
    "--primary": c.primary.light,
    "--primary-foreground": c.primaryForeground.light,
    "--accent": c.accent.light,
    "--accent-foreground": c.accentForeground.light,
    "--ring": c.ring.light,
    "--sidebar": c.sidebar.light,
    "--sidebar-foreground": c.sidebarForeground.light,
    "--sidebar-accent": c.sidebarAccent.light,
    "--sidebar-accent-foreground": c.sidebarAccentForeground.light,
    "--sidebar-ring": c.sidebarRing.light,
    "--chart-1": c.chart1.light,
    "--chart-2": c.chart2.light,
    "--chart-3": c.chart3.light,
    "--chart-4": c.chart4.light,
    "--chart-5": c.chart5.light,
    "--radius": RADIUS_MAP[theme.borderRadius],
    "--density-spacing": DENSITY_MAP[theme.density],
  }
}

function themeToDarkCssVars(theme: VerticalTheme): Record<string, string> {
  const c = theme.colors
  return {
    "--primary": c.primary.dark,
    "--primary-foreground": c.primaryForeground.dark,
    "--accent": c.accent.dark,
    "--accent-foreground": c.accentForeground.dark,
    "--ring": c.ring.dark,
    "--sidebar": c.sidebar.dark,
    "--sidebar-foreground": c.sidebarForeground.dark,
    "--sidebar-accent": c.sidebarAccent.dark,
    "--sidebar-accent-foreground": c.sidebarAccentForeground.dark,
    "--sidebar-ring": c.sidebarRing.dark,
    "--chart-1": c.chart1.dark,
    "--chart-2": c.chart2.dark,
    "--chart-3": c.chart3.dark,
    "--chart-4": c.chart4.dark,
    "--chart-5": c.chart5.dark,
    "--radius": RADIUS_MAP[theme.borderRadius],
    "--density-spacing": DENSITY_MAP[theme.density],
  }
}

// ---------------------------------------------------------------------------
// Provider Component
// ---------------------------------------------------------------------------

interface VerticalThemeProviderProps {
  /** The vertical theme to apply. Falls back to defaultTheme if null/undefined. */
  theme?: VerticalTheme | null
  /** Whether theme data is still loading (shows children with default theme while loading) */
  isLoading?: boolean
  children: ReactNode
}

/**
 * VerticalThemeProvider — applies a vertical's visual identity via CSS variables.
 *
 * Responsibilities:
 * - Reads a VerticalTheme config
 * - Falls back to the default theme if none provided
 * - Injects CSS variables onto <html> via a <style> element
 * - Handles light/dark mode variants
 * - Sets favicon and document title from branding config
 * - Provides theme values via React Context for programmatic access
 *
 * This provider is distinct from TenantThemeProvider:
 * - VerticalThemeProvider: sets the vertical's identity (emerald for cricket, blue for booking)
 * - TenantThemeProvider: overlays individual tenant branding on the portal (tenant's logo, hex colors)
 *
 * @example
 * ```tsx
 * // In app/layout.tsx or a vertical-specific layout
 * import { cricketTheme } from "@/config/vertical-themes/cricket-stadium"
 *
 * export default function RootLayout({ children }: { children: ReactNode }) {
 *   return (
 *     <html lang="en">
 *       <body>
 *         <VerticalThemeProvider theme={cricketTheme}>
 *           {children}
 *         </VerticalThemeProvider>
 *       </body>
 *     </html>
 *   )
 * }
 * ```
 */
export function VerticalThemeProvider({
  theme: themeProp,
  isLoading = false,
  children,
}: VerticalThemeProviderProps) {
  const theme = themeProp ?? defaultTheme

  // Inject CSS variables via <style> element on <head>
  useEffect(() => {
    if (typeof window === "undefined") return

    const styleId = "vertical-theme-vars"
    let styleEl = document.getElementById(styleId) as HTMLStyleElement | null

    if (!styleEl) {
      styleEl = document.createElement("style")
      styleEl.id = styleId
      document.head.appendChild(styleEl)
    }

    const lightVars = themeToLightCssVars(theme)
    const darkVars = themeToDarkCssVars(theme)

    // Build CSS string for :root (light) and .dark (dark)
    const lightEntries = Object.entries(lightVars)
      .map(([k, v]) => `  ${k}: ${v};`)
      .join("\n")
    const darkEntries = Object.entries(darkVars)
      .map(([k, v]) => `  ${k}: ${v};`)
      .join("\n")

    styleEl.textContent = `
:root {
${lightEntries}
}
.dark {
${darkEntries}
}
`
    return () => {
      const el = document.getElementById(styleId)
      if (el) el.remove()
    }
  }, [theme])

  // Set heading font as CSS variable on <html> if different from body font
  useEffect(() => {
    if (typeof window === "undefined") return

    const html = document.documentElement
    if (theme.typography.headingFont !== theme.typography.bodyFont) {
      html.style.setProperty(
        "--font-heading",
        `'${theme.typography.headingFont}', ui-sans-serif, system-ui, sans-serif`
      )
    }
    html.style.setProperty(
      "--font-sans",
      `'${theme.typography.bodyFont}', ui-sans-serif, system-ui, sans-serif`
    )

    return () => {
      html.style.removeProperty("--font-heading")
      html.style.removeProperty("--font-sans")
    }
  }, [theme.typography])

  // Set favicon from branding
  useEffect(() => {
    if (typeof window === "undefined") return

    let faviconLink = document.querySelector(
      "link[rel='icon']"
    ) as HTMLLinkElement | null

    if (!faviconLink) {
      faviconLink = document.createElement("link")
      faviconLink.rel = "icon"
      document.head.appendChild(faviconLink)
    }

    faviconLink.href = theme.branding.favicon
  }, [theme.branding.favicon])

  const contextValue = useMemo(
    () => ({ theme, isLoading }),
    [theme, isLoading]
  )

  return (
    <VerticalThemeContext.Provider value={contextValue}>
      {children}
    </VerticalThemeContext.Provider>
  )
}
```

### Key Design Decisions

1. **`<style>` injection vs. inline styles on `<html>`:** Using a `<style>` element allows us to set both `:root` and `.dark` selectors in one shot, which is not possible with inline `style=` attributes. This mirrors the approach already used by `TenantThemeProvider`.

2. **Fallback to `defaultTheme`:** If no theme is provided (e.g., during development, or for a vertical that hasn't configured one yet), the provider falls back to the existing blue theme defined in `globals.css`.

3. **Separate from `TenantThemeProvider`:** The two providers have different responsibilities and different scopes. `VerticalThemeProvider` sets the platform-level identity; `TenantThemeProvider` overlays per-tenant branding on the public portal. They compose naturally because CSS cascade means `.portal-theme-scope` overrides win within that scope.

4. **Memoized context value:** The context value is memoized to prevent unnecessary re-renders in consumers.

---

## 4. Integration with Existing Components

### shadcn/ui Primitives: Zero Changes Required

All shadcn/ui components (`Button`, `Card`, `Input`, `Dialog`, etc.) already reference semantic CSS variables via Tailwind classes:

```typescript
// button.tsx — already uses bg-primary, text-primary-foreground
"bg-primary text-primary-foreground shadow hover:bg-primary/90"
```

When `VerticalThemeProvider` changes `--primary` from blue to emerald, every `Button` with the default variant automatically renders in emerald. This is the core benefit of the CSS variable architecture -- **zero component changes for color theming.**

The same applies to:
- `border-border` -- all borders
- `bg-background`, `text-foreground` -- page surfaces
- `focus-visible:ring-ring` -- focus outlines
- `rounded-md` -- border radius (resolves through `--radius`)

### Higher-Level Components (DataGrid, StatCard, StatusPipeline): Zero Changes Required

These components are built on top of shadcn/ui primitives and use the same Tailwind class patterns. They inherit the vertical's identity automatically because they reference the same CSS variables.

For density support, the higher-level components should use the density-aware utilities:

```typescript
// Example: DataGrid table cells could use density-aware padding
<td className="density-padding-sm text-sm">
  {cell.render()}
</td>
```

This is an **optional enhancement** -- the components work without density support and it can be added incrementally.

### Layout Components (Sidebar, Topbar): Minimal Changes

The sidebar already uses `--sidebar`, `--sidebar-foreground`, and other sidebar-specific CSS variables. Changing these via the theme config automatically rebrands the sidebar.

The only change needed:
- **Logo rendering:** The sidebar/topbar should read the logo path from the vertical theme context instead of a hardcoded path.

```typescript
// In sidebar component
const { theme } = useVerticalTheme()

// Use theme.branding.logo for the sidebar logo
<img src={theme.branding.logo} alt={theme.branding.appName} />
```

### The Existing `use-tenant-theme` Hook

**No changes required.** This hook serves a different purpose:
- `use-tenant-theme` fetches **per-tenant** branding from the database (individual business colors, logo, business name) for the **public booking portal**.
- `useVerticalTheme` provides the **vertical's** theme config (platform-level identity) for the **admin dashboard**.

The two systems compose cleanly:

```
Admin dashboard:
  VerticalThemeProvider → sets platform identity (emerald for cricket)
    → All admin components render with vertical's colors

Public portal:
  VerticalThemeProvider → sets platform identity
    → TenantThemeProvider → overrides with tenant's branding
      → Portal components render with tenant's specific colors
```

### The Existing `TenantThemeProvider`

The existing `TenantThemeProvider` in `src/components/providers/tenant-theme-provider.tsx` currently sets CSS variables like `--color-primary` (hex format) within `.portal-theme-scope`. This is slightly misaligned with the HSL-based variables that shadcn components actually consume.

A **minor refactor** is recommended (captured in Task 5 below):
- Update `TenantThemeProvider` to convert hex colors to HSL and set `--primary` (not `--color-primary`) within `.portal-theme-scope`
- This makes tenant overrides correctly cascade over the vertical theme

### Existing `TenantThemeConfig` Type

The existing `TenantThemeConfig` type in `src/types/tenant-theme.ts` stores hex colors (`primaryColor`, `secondaryColor`, `accentColor`). This is correct for tenant-level customization -- tenants think in hex colors, not HSL. The conversion happens in the provider layer.

---

## 5. Vertical Config Examples

### Default — Booking SaaS (Current Ironheart)

```typescript
// src/config/vertical-themes/default.ts
import type { VerticalTheme } from "./vertical-theme.types"

export const defaultTheme: VerticalTheme = {
  name: "Booking SaaS",
  colors: {
    primary:                { light: "221.2 83.2% 53.3%", dark: "217.2 91.2% 59.8%" },
    primaryForeground:      { light: "210 40% 98%",       dark: "222.2 47.4% 11.2%" },
    accent:                 { light: "240 4.8% 95.9%",    dark: "240 3.7% 15.9%" },
    accentForeground:       { light: "240 5.9% 10%",      dark: "0 0% 98%" },
    ring:                   { light: "221.2 83.2% 53.3%", dark: "217.2 91.2% 59.8%" },
    sidebar:                { light: "240 10% 3.9%",      dark: "240 10% 3.9%" },
    sidebarForeground:      { light: "240 4.8% 95.9%",    dark: "240 4.8% 95.9%" },
    sidebarAccent:          { light: "240 3.7% 10.9%",    dark: "240 3.7% 10.9%" },
    sidebarAccentForeground:{ light: "240 4.8% 95.9%",    dark: "240 4.8% 95.9%" },
    sidebarRing:            { light: "221.2 83.2% 53.3%", dark: "217.2 91.2% 59.8%" },
    chart1:                 { light: "221.2 83.2% 53.3%", dark: "217.2 91.2% 59.8%" },
    chart2:                 { light: "142.1 76.2% 36.3%", dark: "142.1 70.6% 45.3%" },
    chart3:                 { light: "32.1 94.6% 43.7%",  dark: "32.1 94.6% 43.7%" },
    chart4:                 { light: "271.9 81.3% 55.9%", dark: "271.9 81.3% 55.9%" },
    chart5:                 { light: "0 84.2% 60.2%",     dark: "0 62.8% 30.6%" },
  },
  typography: {
    headingFont: "Inter",
    bodyFont: "Inter",
  },
  branding: {
    logo: "/logos/ironheart-light.svg",
    logoDark: "/logos/ironheart-dark.svg",
    favicon: "/favicon.ico",
    appName: "Ironheart",
  },
  density: "comfortable",
  borderRadius: "md",
}
```

This default theme produces **identical** output to the current hardcoded values in `globals.css`, ensuring zero visual change when the theming system is first introduced.

### Cricket Stadium ERP

```typescript
// src/config/vertical-themes/cricket-stadium.ts
import type { VerticalTheme } from "./vertical-theme.types"

export const cricketStadiumTheme: VerticalTheme = {
  name: "Cricket Stadium ERP",
  colors: {
    // Emerald primary — evokes grass, cricket pitches
    primary:                { light: "142.1 76.2% 36.3%", dark: "142.1 70.6% 45.3%" },
    primaryForeground:      { light: "0 0% 98%",          dark: "0 0% 98%" },
    // Amber accent — evokes sunlight, scorecards
    accent:                 { light: "32.1 94.6% 43.7%",  dark: "38 92% 50%" },
    accentForeground:       { light: "0 0% 98%",          dark: "0 0% 98%" },
    ring:                   { light: "142.1 76.2% 36.3%", dark: "142.1 70.6% 45.3%" },
    // Dark green sidebar
    sidebar:                { light: "144 20% 8%",        dark: "144 20% 6%" },
    sidebarForeground:      { light: "142 10% 90%",       dark: "142 10% 90%" },
    sidebarAccent:          { light: "144 15% 14%",       dark: "144 15% 12%" },
    sidebarAccentForeground:{ light: "142 10% 90%",       dark: "142 10% 90%" },
    sidebarRing:            { light: "142.1 76.2% 36.3%", dark: "142.1 70.6% 45.3%" },
    // Chart colors: greens, ambers, earth tones
    chart1:                 { light: "142.1 76.2% 36.3%", dark: "142.1 70.6% 45.3%" },
    chart2:                 { light: "32.1 94.6% 43.7%",  dark: "38 92% 50%" },
    chart3:                 { light: "25 95% 53%",        dark: "25 95% 60%" },
    chart4:                 { light: "160 84% 39%",       dark: "160 84% 50%" },
    chart5:                 { light: "45 93% 47%",        dark: "45 93% 55%" },
  },
  typography: {
    headingFont: "Inter",
    bodyFont: "Inter",
  },
  branding: {
    logo: "/verticals/cricket/logo.svg",
    logoDark: "/verticals/cricket/logo-dark.svg",
    favicon: "/verticals/cricket/favicon.ico",
    appName: "StadiumOS",
  },
  density: "comfortable",
  borderRadius: "md",
}
```

### Medical Practice

```typescript
// src/config/vertical-themes/medical-practice.ts
import type { VerticalTheme } from "./vertical-theme.types"

export const medicalPracticeTheme: VerticalTheme = {
  name: "Medical Practice",
  colors: {
    // Teal primary — clinical, trustworthy, calming
    primary:                { light: "172 66% 40%",   dark: "172 66% 50%" },
    primaryForeground:      { light: "0 0% 98%",      dark: "0 0% 98%" },
    // Soft blue accent
    accent:                 { light: "199 89% 48%",   dark: "199 89% 55%" },
    accentForeground:       { light: "0 0% 98%",      dark: "0 0% 98%" },
    ring:                   { light: "172 66% 40%",   dark: "172 66% 50%" },
    // Neutral dark sidebar
    sidebar:                { light: "200 15% 10%",   dark: "200 15% 8%" },
    sidebarForeground:      { light: "200 10% 90%",   dark: "200 10% 90%" },
    sidebarAccent:          { light: "200 12% 16%",   dark: "200 12% 14%" },
    sidebarAccentForeground:{ light: "200 10% 90%",   dark: "200 10% 90%" },
    sidebarRing:            { light: "172 66% 40%",   dark: "172 66% 50%" },
    // Chart colors: clinical palette
    chart1:                 { light: "172 66% 40%",   dark: "172 66% 50%" },
    chart2:                 { light: "199 89% 48%",   dark: "199 89% 55%" },
    chart3:                 { light: "142 72% 42%",   dark: "142 72% 50%" },
    chart4:                 { light: "262 83% 58%",   dark: "262 83% 65%" },
    chart5:                 { light: "0 84% 60%",     dark: "0 72% 51%" },
  },
  typography: {
    headingFont: "Inter",
    bodyFont: "Inter",
  },
  branding: {
    logo: "/verticals/medical/logo.svg",
    logoDark: "/verticals/medical/logo-dark.svg",
    favicon: "/verticals/medical/favicon.ico",
    appName: "PracticeHub",
  },
  density: "comfortable",
  borderRadius: "lg",
}
```

---

## 6. Implementation Tasks

### Task 1: Vertical Theme Type Definitions

**Files:**
- Create: `src/config/vertical-themes/vertical-theme.types.ts`

Define the `VerticalTheme` interface and all supporting types (`ThemeColorPair`, `VerticalColorPalette`, `VerticalTypography`, `VerticalBranding`, `VerticalDensity`, `VerticalBorderRadius`) as specified in Section 1 above.

Export all types.

---

### Task 2: Default Theme Config

**Files:**
- Create: `src/config/vertical-themes/default.ts`

Create the default theme config that matches the existing `globals.css` values exactly. This is the booking SaaS theme shown in Section 5. Import `VerticalTheme` type from `vertical-theme.types.ts`.

---

### Task 3: Example Vertical Theme Configs

**Files:**
- Create: `src/config/vertical-themes/cricket-stadium.ts`
- Create: `src/config/vertical-themes/medical-practice.ts`

Create the two example vertical themes shown in Section 5. These serve as templates for future verticals.

---

### Task 4: Vertical Theme Registry

**Files:**
- Create: `src/config/vertical-themes/index.ts`

Create a barrel export and a registry map for looking up themes by name:

```typescript
import type { VerticalTheme } from "./vertical-theme.types"
import { defaultTheme } from "./default"
import { cricketStadiumTheme } from "./cricket-stadium"
import { medicalPracticeTheme } from "./medical-practice"

export type { VerticalTheme, ThemeColorPair, VerticalColorPalette } from "./vertical-theme.types"
export { defaultTheme } from "./default"
export { cricketStadiumTheme } from "./cricket-stadium"
export { medicalPracticeTheme } from "./medical-practice"

/**
 * Registry of all available vertical themes.
 * Used by the platform factory to resolve a vertical's visual identity.
 */
export const verticalThemeRegistry: Record<string, VerticalTheme> = {
  default: defaultTheme,
  "cricket-stadium": cricketStadiumTheme,
  "medical-practice": medicalPracticeTheme,
}

/**
 * Resolve a vertical theme by name, falling back to default.
 */
export function resolveVerticalTheme(name: string): VerticalTheme {
  return verticalThemeRegistry[name] ?? defaultTheme
}
```

---

### Task 5: CSS Density Utilities

**Files:**
- Edit: `src/app/globals.css`

Add density-aware utility classes and the `--font-heading` variable to the existing CSS. Add inside the existing `@layer utilities` block:

```css
/* Density-aware spacing utilities */
.density-padding {
  padding: calc(var(--density-spacing, 1) * 1rem);
}
.density-gap {
  gap: calc(var(--density-spacing, 1) * 1rem);
}
.density-padding-sm {
  padding: calc(var(--density-spacing, 1) * 0.5rem);
}
.density-gap-sm {
  gap: calc(var(--density-spacing, 1) * 0.5rem);
}
.density-padding-lg {
  padding: calc(var(--density-spacing, 1) * 1.5rem);
}
.density-gap-lg {
  gap: calc(var(--density-spacing, 1) * 1.5rem);
}
```

Add `--font-heading` to the `@theme inline` block:

```css
--font-heading: var(--font-sans);
```

Add `--density-spacing: 1;` default to `:root` in the `@layer base` block.

---

### Task 6: VerticalThemeProvider Component

**Files:**
- Create: `src/components/providers/vertical-theme-provider.tsx`

Implement the full provider component as specified in Section 3. Includes:
- `VerticalThemeContext` and `useVerticalTheme` hook
- CSS variable injection via `<style>` element
- Light/dark mode support
- Favicon and font injection
- Fallback to `defaultTheme`

---

### Task 7: Refactor TenantThemeProvider for HSL Compatibility

**Files:**
- Edit: `src/components/providers/tenant-theme-provider.tsx`

Update the existing `TenantThemeProvider` to convert tenant hex colors to HSL format and set the correct CSS variable names (`--primary` instead of `--color-primary`) so they properly cascade over the vertical theme within `.portal-theme-scope`.

Add a `hexToHsl` utility function that converts `#RRGGBB` to `"H S% L%"` format.

Before:
```css
.portal-theme-scope {
  --color-primary: #3B82F6;
}
```

After:
```css
.portal-theme-scope {
  --primary: 217 91% 60%;
}
```

---

### Task 8: Wire VerticalThemeProvider into Root Layout

**Files:**
- Edit: `src/app/layout.tsx`

Wrap the application with `VerticalThemeProvider`. For now, use the `defaultTheme` directly. When vertical resolution logic is added later (via platform factory), this will be replaced with a dynamic lookup.

```typescript
import { VerticalThemeProvider } from "@/components/providers/vertical-theme-provider"
import { defaultTheme } from "@/config/vertical-themes/default"

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <VerticalThemeProvider theme={defaultTheme}>
          {children}
        </VerticalThemeProvider>
      </body>
    </html>
  )
}
```

---

### Task 9: Tests

**Files:**
- Create: `src/config/vertical-themes/__tests__/vertical-themes.test.ts`

Test:
1. `resolveVerticalTheme` returns the correct theme by name
2. `resolveVerticalTheme` falls back to default for unknown names
3. All registered themes have valid HSL strings (regex check)
4. All registered themes have non-empty branding fields
5. Default theme values match the hardcoded values in `globals.css`
6. `RADIUS_MAP` covers all `VerticalBorderRadius` options
7. `DENSITY_MAP` covers all `VerticalDensity` options

---

### Task Order

```
Task 1 (types)
  → Task 2 (default theme) + Task 3 (example themes)     [parallel]
    → Task 4 (registry)
      → Task 5 (CSS utilities) + Task 6 (provider)       [parallel]
        → Task 7 (refactor tenant provider)
          → Task 8 (wire into layout)
            → Task 9 (tests)
```

Tasks 2 and 3 can run in parallel since they only depend on Task 1. Tasks 5 and 6 can run in parallel since they are independent files. All other tasks are sequential due to import dependencies.
