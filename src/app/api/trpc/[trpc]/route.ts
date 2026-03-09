import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { createContext } from "@/shared/trpc";
import { appRouter } from "@/server/root";

/**
 * tRPC API route handler for Next.js App Router.
 *
 * Uses fetchRequestHandler (not createNextApiHandler - that is Pages Router only).
 * Handles all tRPC requests at /api/trpc/[procedure].
 */
const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () => createContext({ req }),
    onError:
      process.env.NODE_ENV === "development"
        ? ({ path, error }) => {
            console.error(`tRPC error on ${path ?? "<no path>"}:`, error);
          }
        : undefined,
  });

export { handler as GET, handler as POST };
