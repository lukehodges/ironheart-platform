import { z } from "zod";
import { router, tenantProcedure, publicProcedure } from "@/shared/trpc";
import { getUserPermissions } from "./rbac";
import { eq } from "drizzle-orm";
import { users, staffProfiles } from "@/shared/db/schema";

export const authRouter = router({
  /**
   * Get the current authenticated user with enriched data.
   * Used by the client-side useCurrentUser() hook.
   */
  me: tenantProcedure.query(async ({ ctx }) => {
    const user = ctx.user!;
    const permissions = getUserPermissions(user);

    // Check if user has a staff profile (replaces removed users.isTeamMember column)
    const [profile] = await ctx.db
      .select({ userId: staffProfiles.userId })
      .from(staffProfiles)
      .where(eq(staffProfiles.userId, user.id))
      .limit(1);

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      type: user.type,
      status: user.status,
      tenantId: user.tenantId,
      tenantSlug: ctx.tenantSlug,
      isTeamMember: !!profile,
      isPlatformAdmin: user.isPlatformAdmin,
      permissions,
    };
  }),

  /**
   * Update the current user's own profile.
   */
  updateProfile: tenantProcedure
    .input(
      z.object({
        firstName: z.string().min(1).optional(),
        lastName: z.string().min(1).optional(),
        displayName: z.string().optional(),
        avatarUrl: z.string().optional().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(users)
        .set({
          ...(input.firstName !== undefined && { firstName: input.firstName }),
          ...(input.lastName !== undefined && { lastName: input.lastName }),
          ...(input.displayName !== undefined && { displayName: input.displayName }),
          ...(input.avatarUrl !== undefined && { avatarUrl: input.avatarUrl }),
          updatedAt: new Date(),
        })
        .where(eq(users.id, ctx.user!.id))
        .returning();
      return updated;
    }),

  /**
   * Public health check - no auth required.
   */
  ping: publicProcedure.query(() => ({
    status: "ok",
    timestamp: new Date().toISOString(),
  })),
});
