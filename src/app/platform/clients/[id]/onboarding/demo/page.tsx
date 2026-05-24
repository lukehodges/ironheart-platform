import { DemoShell } from "./_components/demo-shell"

/**
 * Polished demo of the org-chart-mapping feature for client onboarding.
 *
 * Pure presentation — no DB reads, no tRPC. Renders a fictional 60-person
 * UK SaaS ("Northwind Analytics Ltd") so consultants and prospects can see
 * the full UX in action without needing a real engagement.
 *
 * Mounted at /platform/clients/[id]/onboarding/demo regardless of [id] — the
 * route param is ignored on purpose; the demo is the same Northwind seed
 * everywhere. To run it against the parent engagement's real chart, use
 * the sibling /onboarding route.
 */
export default async function OnboardingDemoPage() {
  return <DemoShell />
}
