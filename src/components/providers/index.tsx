"use client"

import { TRPCReactProvider } from "@/lib/trpc/react"
import { ThemeProvider } from "./theme-provider"
import { Toaster } from "sonner"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem
      disableTransitionOnChange
    >
      <TRPCReactProvider>
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            classNames: {
              toast: "bg-card text-card-foreground border border-border shadow-lg",
              title: "text-sm font-medium",
              description: "text-xs text-muted-foreground",
              error: "border-destructive/50",
              success: "border-success/50",
              warning: "border-warning/50",
            },
          }}
        />
      </TRPCReactProvider>
    </ThemeProvider>
  )
}
