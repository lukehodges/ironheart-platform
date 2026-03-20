import { inngest } from "@/shared/inngest";

/** All customer Inngest functions - register in src/app/api/inngest/route.ts */
export const customerFunctions: ReturnType<typeof inngest.createFunction>[] = [];
