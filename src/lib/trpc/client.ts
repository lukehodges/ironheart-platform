import {
  createTRPCClient,
  httpBatchStreamLink,
  loggerLink,
} from "@trpc/client"
import superjson from "superjson"
import type { AppRouter } from "@/server/root"

function getBaseUrl() {
  if (typeof window !== "undefined") return ""
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return `http://localhost:${process.env.PORT ?? 3000}`
}

export const api = createTRPCClient<AppRouter>({
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
          "x-trpc-source": "client",
        }
      },
      transformer: superjson,
    }),
  ],
})
