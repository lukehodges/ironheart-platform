"use client"

import { createContext, useContext, type ReactNode } from "react"

export interface TenantInfo {
  id: string
  slug: string
  name: string
}

const TenantContext = createContext<TenantInfo | null>(null)

export function TenantContextProvider({
  children,
  tenant,
}: {
  children: ReactNode
  tenant: TenantInfo
}) {
  return (
    <TenantContext.Provider value={tenant}>{children}</TenantContext.Provider>
  )
}

export function useTenant(): TenantInfo {
  const ctx = useContext(TenantContext)
  if (!ctx) {
    throw new Error("useTenant must be used within TenantContextProvider")
  }
  return ctx
}

export function useTenantOptional(): TenantInfo | null {
  return useContext(TenantContext)
}
