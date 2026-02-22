"use client"

import { api } from "@/lib/trpc/react"
import { toast } from "sonner"

/**
 * Settings mutations hook
 *
 * Provides mutations for managing settings:
 * - updateGeneral: Update business name, address, timezone, currency, logo
 * - updateNotifications: Update email/SMS settings and templates
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
 *   addressLine1: "123 Main St",
 *   timezone: "America/New_York",
 *   currency: "USD"
 * })
 * ```
 */
export function useSettingsMutations() {
  const utils = api.useUtils()

  const updateGeneral = api.tenant.updateSettings.useMutation({
    onSuccess: () => {
      toast.success("General settings saved")
      utils.tenant.invalidate()
    },
    onError: (error) => {
      toast.error("Failed to save general settings", {
        description: error.message,
      })
    },
  })

  const updateNotifications = api.tenant.updateSettings.useMutation({
    onSuccess: () => {
      toast.success("Notification settings saved")
      utils.tenant.invalidate()
    },
    onError: (error) => {
      toast.error("Failed to save notification settings", {
        description: error.message,
      })
    },
  })

  const enableModule = api.tenant.enableModule.useMutation({
    onSuccess: () => {
      toast.success("Module enabled")
      utils.tenant.invalidate()
    },
    onError: (error) => {
      toast.error("Failed to enable module", {
        description: error.message,
      })
    },
  })

  const disableModule = api.tenant.disableModule.useMutation({
    onSuccess: () => {
      toast.success("Module disabled")
      utils.tenant.invalidate()
    },
    onError: (error) => {
      toast.error("Failed to disable module", {
        description: error.message,
      })
    },
  })

  // TODO: Wire to real API key procedures when they exist on the tenant router
  const apiKeyStub = {
    mutate: (_input: any) => {
      toast.info("API key management not yet implemented")
    },
    mutateAsync: (_input: any) => {
      toast.info("API key management not yet implemented")
      return Promise.resolve({ key: "stub-key" } as any)
    },
    isPending: false,
    isError: false,
    isSuccess: false,
  }

  return {
    updateGeneral,
    updateNotifications,
    createApiKey: apiKeyStub,
    revokeApiKey: apiKeyStub,
    toggleModule: {
      enable: enableModule,
      disable: disableModule,
      isPending: enableModule.isPending || disableModule.isPending,
    },
  }
}
