import { inngest } from "@/shared/inngest";

/**
 * Team Inngest functions.
 *
 * Team lifecycle events (team/created, team/updated, team/deactivated) are
 * emitted directly from teamService. They can be consumed by the workflow
 * engine or notification module. No team-specific Inngest functions are
 * needed at this time.
 */
export const teamFunctions: ReturnType<typeof inngest.createFunction>[] = [];
