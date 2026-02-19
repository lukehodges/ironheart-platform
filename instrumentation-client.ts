import * as Sentry from "@sentry/nextjs";

// Required by Sentry Next.js SDK to instrument client-side navigations.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
