/**
 * Next.js instrumentation hook — loads Sentry for server and edge runtimes.
 * This file is automatically called by Next.js before starting the server.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}
