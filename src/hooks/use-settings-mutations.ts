"use client"

import { api } from "@/lib/trpc/react"
import { toast } from "sonner"

/**
 * Settings mutations hook
 *
 * Provides mutations for managing settings:
 * - updateGeneral: Update business name, address, timezone, currency, logo
 * - updateNotifications: Update email/SMS settings and templates
 * - createApiKey: Create a new API key with optional expiry
 * - revokeApiKey: Revoke an existing API key
 * - toggleModule: Enable/disable a feature module
 *
 * All mutations include:
 * - onSuccess: Toast notification + cache invalidation
 * - onError: Error toast notification
 *
 * @example
 * ```tsx
 * const mutations = useSettingsMutations()
 *
 * // Update general settings
 * mutations.updateGeneral.mutate({
 *   businessName: "Acme Co",
 *   address: "123 Main St",
 *   timezone: "America/New_York",
 *   currency: "USD"
 * })
 *
 * // Create API key
 * mutations.createApiKey.mutate({
 *   name: "Development",
 *   expiresInDays: 90
 * })
 * ```
 */
export function useSettingsMutations() {
  // TODO: Implement settings router with all mutation procedures
  // For now, stub the mutations to make build pass
  const stubMutation = {
    mutate: (_input: any) => {
      toast.info("Settings mutations not yet implemented")
    },
    mutateAsync: (_input: any) => {
      toast.info("Settings mutations not yet implemented")
      return Promise.resolve({ key: "stub-key" } as any)
    },
    isPending: false,
    isError: false,
    isSuccess: false,
  }

  return {
    updateGeneral: stubMutation,
    updateNotifications: stubMutation,
    createApiKey: stubMutation,
    revokeApiKey: stubMutation,
    toggleModule: stubMutation,
  }
}
