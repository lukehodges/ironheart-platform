"use client"

import { useState } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ReactQueryDevtools } from "@tanstack/react-query-devtools"
import {
  createTRPCReact,
  httpBatchStreamLink,
  loggerLink,
} from "@trpc/react-query"
import superjson from "superjson"
import type { AppRouter } from "@/server/root"

export const api = createTRPCReact<AppRouter>()

function getBaseUrl() {
  if (typeof window !== "undefined") return ""
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return `http://localhost:${process.env.PORT ?? 3000}`
}

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // With SSR, we usually want a higher staleTime to avoid refetching
        // immediately on the client.
        staleTime: 30 * 1000,
        retry: (failureCount, error) => {
          // Don't retry on 4xx errors
          if (error instanceof Error && "shape" in error) {
            const trpcError = error as { shape?: { data?: { httpStatus?: number } } }
            const status = trpcError.shape?.data?.httpStatus
            if (status && status >= 400 && status < 500) return false
          }
          return failureCount < 2
        },
      },
    },
  })
}

let browserQueryClient: QueryClient | undefined

function getQueryClient() {
  if (typeof window === "undefined") {
    return makeQueryClient()
  }
  if (!browserQueryClient) {
    browserQueryClient = makeQueryClient()
  }
  return browserQueryClient
}

export function TRPCReactProvider({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient()
  const [trpcClient] = useState(() =>
    api.createClient({
      links: [
        loggerLink({
          enabled: (opts) =>
            process.env.NODE_ENV === "development" ||
            (opts.direction === "down" && opts.result instanceof Error),
        }),
        httpBatchStreamLink({
          url: `${getBaseUrl()}/api/trpc`,
          headers() {
            return {
              "x-trpc-source": "react",
            }
          },
          transformer: superjson,
        }),
      ],
    })
  )

  return (
    <api.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {children}
        {process.env.NODE_ENV === "development" && (
          <ReactQueryDevtools initialIsOpen={false} />
        )}
      </QueryClientProvider>
    </api.Provider>
  )
}
