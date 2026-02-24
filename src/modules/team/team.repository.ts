import { db } from "@/shared/db";
import { logger } from "@/shared/logger";
import { NotFoundError } from "@/shared/errors";
import {
  users,
  staffProfiles,
  userAvailability,
  bookings,
} from "@/shared/db/schema";
import {
  eq,
  and,
  or,
  gte,
  lte,
  isNull,
  isNotNull,
  ilike,
  inArray,
  sql,
  asc,
  desc,
} from "drizzle-orm";
import type {
  StaffMember,
  StaffStatus,
  AvailabilityType,
  AvailabilityEntry,
  AvailabilitySlot,
  CreateStaffInput,
  UpdateStaffInput,
} from "./team.types";

const log = logger.child({ module: "team.repository" });

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Maps a DB user row to the StaffMember interface.
 * users.status is UserStatus (PENDING/ACTIVE/SUSPENDED/DELETED).
 * StaffMember.status is StaffStatus ('ACTIVE'|'INACTIVE'|'SUSPENDED').
 * We derive status from staffStatus when available, otherwise from userStatus.
 *
 * DB employeeType enum: 'EMPLOYEE' | 'CONTRACTOR' | 'FREELANCER'
 * StaffMember.employeeType: 'EMPLOYED' | 'SELF_EMPLOYED' | 'CONTRACTOR'
 */
function mapDbEmployeeType(
  dbType: "EMPLOYEE" | "CONTRACTOR" | "FREELANCER" | null
): StaffMember["employeeType"] {
  if (dbType === "EMPLOYEE") return "EMPLOYED";
  if (dbType === "FREELANCER") return "SELF_EMPLOYED";
  if (dbType === "CONTRACTOR") return "CONTRACTOR";
  return null;
}

function mapDomainEmployeeType(
  domainType: StaffMember["employeeType"]
): "EMPLOYEE" | "CONTRACTOR" | "FREELANCER" | null {
  if (domainType === "EMPLOYED") return "EMPLOYEE";
  if (domainType === "SELF_EMPLOYED") return "FREELANCER";
  if (domainType === "CONTRACTOR") return "CONTRACTOR";
  return null;
}

type UserRow = typeof users.$inferSelect;
type StaffProfileRow = typeof staffProfiles.$inferSelect | null;

function mapToStaffMember(user: UserRow, profile: StaffProfileRow): StaffMember {
  let status: StaffStatus;
  if (profile?.staffStatus === "TERMINATED") {
    status = "INACTIVE";
  } else if (profile?.staffStatus === "ACTIVE") {
    status = "ACTIVE";
  } else if (user.status === "SUSPENDED") {
    status = "SUSPENDED";
  } else if (user.status === "DELETED") {
    status = "INACTIVE";
  } else if (user.status === "ACTIVE") {
    status = "ACTIVE";
  } else {
    status = "INACTIVE";
  }

  return {
    id: user.id,
    tenantId: user.tenantId,
    email: user.email,
    name: user.displayName ?? `${user.firstName} ${user.lastName}`.trim(),
    phone: user.phone ?? null,
    avatarUrl: user.avatarUrl ?? null,
    status,
    employeeType: mapDbEmployeeType(profile?.employeeType ?? null),
    isTeamMember: profile !== null,
    hourlyRate: profile?.hourlyRate !== null && profile?.hourlyRate !== undefined ? Number(profile.hourlyRate) : null,
    staffStatus: profile?.staffStatus ?? null,
    workosUserId: user.workosUserId ?? null,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

// ===============================================================
// TEAM REPOSITORY
// ===============================================================

export const teamRepository = {

  // ---- STAFF CRUD ----

  async findById(tenantId: string, userId: string): Promise<StaffMember | null> {
    log.info({ tenantId, userId }, "findById");
    // Search without requiring a staffProfiles row — a booking may reference a
    // staff member who was deactivated (profile deleted). Filtering too
    // aggressively causes "Staff member not found" errors when viewing bookings.
    const result = await db
      .select({
        user: users,
        profile: staffProfiles,
      })
      .from(users)
      .leftJoin(staffProfiles, eq(staffProfiles.userId, users.id))
      .where(
        and(
          eq(users.tenantId, tenantId),
          eq(users.id, userId),
        )
      )
      .limit(1);
    const row = result[0];
    return row ? mapToStaffMember(row.user, row.profile) : null;
  },

  async listByTenant(
    tenantId: string,
    opts: { search?: string; status?: StaffStatus; limit: number; cursor?: string }
  ): Promise<{ rows: StaffMember[]; hasMore: boolean }> {
    log.info({ tenantId, opts }, "listByTenant");
    const { search, status, limit, cursor } = opts;

    // Inner join with staffProfiles means only users with a staff profile
    // are returned — equivalent to the old isTeamMember = true filter.
    const conditions = [
      eq(users.tenantId, tenantId),
    ];

    if (search) {
      const pattern = `%${search}%`;
      conditions.push(
        or(
          ilike(users.firstName, pattern),
          ilike(users.lastName, pattern),
          ilike(users.displayName, pattern),
          ilike(users.email, pattern)
        ) as ReturnType<typeof eq>
      );
    }

    if (status === "ACTIVE") {
      conditions.push(
        or(
          eq(staffProfiles.staffStatus, "ACTIVE"),
          eq(users.status, "ACTIVE")
        ) as ReturnType<typeof eq>
      );
    } else if (status === "INACTIVE") {
      conditions.push(
        or(
          eq(staffProfiles.staffStatus, "TERMINATED"),
          eq(users.status, "DELETED")
        ) as ReturnType<typeof eq>
      );
    } else if (status === "SUSPENDED") {
      conditions.push(eq(users.status, "SUSPENDED"));
    }

    if (cursor) {
      conditions.push(lte(users.createdAt, new Date(cursor)));
    }

    const rows = await db
      .select({
        user: users,
        profile: staffProfiles,
      })
      .from(users)
      .innerJoin(staffProfiles, eq(staffProfiles.userId, users.id))
      .where(and(...conditions))
      .orderBy(desc(users.createdAt))
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    return {
      rows: (hasMore ? rows.slice(0, limit) : rows).map((r) =>
        mapToStaffMember(r.user, r.profile)
      ),
      hasMore,
    };
  },

  async create(tenantId: string, input: CreateStaffInput): Promise<StaffMember> {
    log.info({ tenantId, email: input.email }, "create staff");
    const now = new Date();
    const userId = crypto.randomUUID();

    const result = await db.transaction(async (tx) => {
      const [userRow] = await tx
        .insert(users)
        .values({
          id: userId,
          tenantId,
          email: input.email,
          firstName: input.name.split(" ")[0] ?? input.name,
          lastName: input.name.split(" ").slice(1).join(" ") || "",
          displayName: input.name,
          phone: input.phone ?? null,
          status: "ACTIVE",
          timezone: "Europe/London",
          locale: "en-GB",
          type: "MEMBER",
          loginCount: 0,
          failedLoginAttempts: 0,
          twoFactorEnabled: false,
          isPlatformAdmin: false,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      const [profileRow] = await tx
        .insert(staffProfiles)
        .values({
          userId,
          tenantId,
          staffStatus: "ACTIVE",
          employeeType: mapDomainEmployeeType(input.employeeType ?? null),
          hourlyRate: input.hourlyRate !== undefined ? String(input.hourlyRate) : null,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      return { user: userRow!, profile: profileRow! };
    });

    return mapToStaffMember(result.user, result.profile);
  },

  async update(
    tenantId: string,
    userId: string,
    input: Partial<UpdateStaffInput>
  ): Promise<StaffMember> {
    log.info({ tenantId, userId }, "update staff");
    const now = new Date();

    // Fields that belong on the users table
    const userUpdate: Record<string, unknown> = { updatedAt: now };
    // Fields that belong on the staffProfiles table
    const profileUpdate: Record<string, unknown> = { updatedAt: now };

    if (input.email !== undefined) userUpdate.email = input.email;
    if (input.name !== undefined) {
      userUpdate.displayName = input.name;
      userUpdate.firstName = input.name.split(" ")[0] ?? input.name;
      userUpdate.lastName = input.name.split(" ").slice(1).join(" ") || "";
    }
    if (input.phone !== undefined) userUpdate.phone = input.phone;
    if (input.employeeType !== undefined)
      profileUpdate.employeeType = mapDomainEmployeeType(input.employeeType ?? null);
    if (input.hourlyRate !== undefined)
      profileUpdate.hourlyRate = input.hourlyRate !== null ? String(input.hourlyRate) : null;
    if (input.status !== undefined) {
      if (input.status === "INACTIVE") {
        profileUpdate.staffStatus = "TERMINATED";
        userUpdate.status = "DELETED";
      } else if (input.status === "ACTIVE") {
        profileUpdate.staffStatus = "ACTIVE";
        userUpdate.status = "ACTIVE";
      } else if (input.status === "SUSPENDED") {
        userUpdate.status = "SUSPENDED";
      }
    }

    const result = await db.transaction(async (tx) => {
      const [updatedUser] = await tx
        .update(users)
        .set(userUpdate)
        .where(and(eq(users.id, userId), eq(users.tenantId, tenantId)))
        .returning();

      if (!updatedUser) throw new NotFoundError("Staff member", userId);

      // Upsert the staff profile — it may not exist if the user was created
      // before the staffProfiles table migration.
      let updatedProfile: typeof staffProfiles.$inferSelect | null = null;
      if (Object.keys(profileUpdate).length > 1) {
        // More than just updatedAt
        const existing = await tx
          .select()
          .from(staffProfiles)
          .where(eq(staffProfiles.userId, userId))
          .limit(1);

        if (existing[0]) {
          const [row] = await tx
            .update(staffProfiles)
            .set(profileUpdate)
            .where(eq(staffProfiles.userId, userId))
            .returning();
          updatedProfile = row ?? null;
        } else {
          const [row] = await tx
            .insert(staffProfiles)
            .values({
              userId,
              tenantId,
              staffStatus: "ACTIVE",
              createdAt: new Date(),
              updatedAt: now,
              ...profileUpdate,
            })
            .returning();
          updatedProfile = row ?? null;
        }
      } else {
        const existing = await tx
          .select()
          .from(staffProfiles)
          .where(eq(staffProfiles.userId, userId))
          .limit(1);
        updatedProfile = existing[0] ?? null;
      }

      return { user: updatedUser, profile: updatedProfile };
    });

    return mapToStaffMember(result.user, result.profile);
  },

  async deactivate(tenantId: string, userId: string): Promise<void> {
    log.info({ tenantId, userId }, "deactivate staff");
    const now = new Date();

    const result = await db.transaction(async (tx) => {
      // Update staffProfiles status to TERMINATED
      const profileResult = await tx
        .update(staffProfiles)
        .set({
          staffStatus: "TERMINATED",
          updatedAt: now,
        })
        .where(
          and(
            eq(staffProfiles.userId, userId),
            eq(staffProfiles.tenantId, tenantId),
          )
        )
        .returning({ userId: staffProfiles.userId });

      if (!profileResult[0]) throw new NotFoundError("Staff member", userId);

      return profileResult;
    });
  },

  // ---- AVAILABILITY ----

  async getAvailabilityEntries(
    tenantId: string,
    userId: string,
    opts?: { type?: AvailabilityType; startDate?: string; endDate?: string }
  ): Promise<AvailabilityEntry[]> {
    log.info({ tenantId, userId, opts }, "getAvailabilityEntries");
    const conditions = [eq(userAvailability.userId, userId)];

    if (opts?.type) {
      conditions.push(eq(userAvailability.type, opts.type));
    }

    if (opts?.startDate) {
      conditions.push(
        or(
          isNull(userAvailability.specificDate),
          gte(userAvailability.specificDate, new Date(opts.startDate))
        ) as ReturnType<typeof eq>
      );
    }

    if (opts?.endDate) {
      conditions.push(
        or(
          isNull(userAvailability.specificDate),
          lte(userAvailability.specificDate, new Date(opts.endDate))
        ) as ReturnType<typeof eq>
      );
    }

    const rows = await db
      .select()
      .from(userAvailability)
      .where(and(...conditions))
      .orderBy(asc(userAvailability.createdAt));

    return rows.map((row): AvailabilityEntry => {
      if (row.type === "RECURRING") {
        return {
          type: "RECURRING",
          dayOfWeek: row.dayOfWeek ?? 0,
          startTime: row.startTime,
          endTime: row.endTime,
        };
      } else if (row.type === "SPECIFIC") {
        return {
          type: "SPECIFIC",
          specificDate: row.specificDate ? row.specificDate.toISOString().slice(0, 10) : "",
          startTime: row.startTime,
          endTime: row.endTime,
        };
      } else {
        return {
          type: "BLOCKED",
          specificDate: row.specificDate ? row.specificDate.toISOString().slice(0, 10) : "",
          endDate: row.endDate ? row.endDate.toISOString().slice(0, 10) : undefined,
          reason: row.reason ?? undefined,
          isAllDay: row.isAllDay,
        };
      }
    });
  },

  async getStaffAvailableSlots(
    tenantId: string,
    userId: string,
    date: Date,
    timezone: string
  ): Promise<AvailabilitySlot[]> {
    log.info({ tenantId, userId, date, timezone }, "getStaffAvailableSlots");

    // Helper: get date string in the given timezone
    const dateStr = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date); // "YYYY-MM-DD" (en-CA uses ISO-like format)

    // Helper: get day of week in the given timezone (0=Sunday, 6=Saturday)
    const dayOfWeek = new Date(
      date.toLocaleString("en-US", { timeZone: timezone })
    ).getDay();

    const dateObj = new Date(dateStr);

    // 1. Check BLOCKED entries that cover this date
    const blocked = await db
      .select()
      .from(userAvailability)
      .where(
        and(
          eq(userAvailability.userId, userId),
          eq(userAvailability.type, "BLOCKED"),
          lte(userAvailability.specificDate, dateObj),
          or(
            isNull(userAvailability.endDate),
            gte(userAvailability.endDate, dateObj)
          )
        )
      );

    if (blocked.length > 0) return [];

    // 2. Check SPECIFIC entries for this exact date
    const specific = await db
      .select()
      .from(userAvailability)
      .where(
        and(
          eq(userAvailability.userId, userId),
          eq(userAvailability.type, "SPECIFIC"),
          eq(userAvailability.specificDate, dateObj)
        )
      );

    if (specific.length > 0) {
      return specific.map((s) => ({
        startTime: s.startTime,
        endTime: s.endTime,
      }));
    }

    // 3. Fall back to RECURRING entries for this day of week
    const recurring = await db
      .select()
      .from(userAvailability)
      .where(
        and(
          eq(userAvailability.userId, userId),
          eq(userAvailability.type, "RECURRING"),
          eq(userAvailability.dayOfWeek, dayOfWeek)
        )
      );

    return recurring.map((r) => ({
      startTime: r.startTime,
      endTime: r.endTime,
    }));
  },

  async setAvailabilityEntries(
    tenantId: string,
    userId: string,
    entries: AvailabilityEntry[],
    replaceAll: boolean
  ): Promise<void> {
    log.info({ tenantId, userId, replaceAll, count: entries.length }, "setAvailabilityEntries");

    await db.transaction(async (tx) => {
      if (replaceAll) {
        // Delete all existing entries for this user
        await tx
          .delete(userAvailability)
          .where(eq(userAvailability.userId, userId));
      } else {
        // Delete only entries of the same types as incoming
        const incomingTypes = [...new Set(entries.map((e) => e.type))];
        if (incomingTypes.length > 0) {
          await tx
            .delete(userAvailability)
            .where(
              and(
                eq(userAvailability.userId, userId),
                inArray(userAvailability.type, incomingTypes)
              )
            );
        }
      }

      if (entries.length === 0) return;

      const now = new Date();
      const rows = entries.map((entry) => {
        const base = {
          id: crypto.randomUUID(),
          userId,
          createdAt: now,
          updatedAt: now,
        };

        if (entry.type === "RECURRING") {
          return {
            ...base,
            type: "RECURRING" as const,
            dayOfWeek: entry.dayOfWeek,
            specificDate: null,
            endDate: null,
            startTime: entry.startTime,
            endTime: entry.endTime,
            reason: null,
            isAllDay: false,
          };
        } else if (entry.type === "SPECIFIC") {
          return {
            ...base,
            type: "SPECIFIC" as const,
            dayOfWeek: null,
            specificDate: new Date(entry.specificDate),
            endDate: null,
            startTime: entry.startTime,
            endTime: entry.endTime,
            reason: null,
            isAllDay: false,
          };
        } else {
          return {
            ...base,
            type: "BLOCKED" as const,
            dayOfWeek: null,
            specificDate: new Date(entry.specificDate),
            endDate: entry.endDate ? new Date(entry.endDate) : null,
            startTime: "00:00",
            endTime: "23:59",
            reason: entry.reason ?? null,
            isAllDay: entry.isAllDay,
          };
        }
      });

      await tx.insert(userAvailability).values(rows);
    });
  },

  async addBlockedEntry(
    tenantId: string,
    userId: string,
    startDate: string,
    endDate?: string,
    reason?: string
  ): Promise<void> {
    log.info({ tenantId, userId, startDate, endDate }, "addBlockedEntry");
    const now = new Date();

    await db.insert(userAvailability).values({
      id: crypto.randomUUID(),
      userId,
      type: "BLOCKED",
      dayOfWeek: null,
      specificDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : null,
      startTime: "00:00",
      endTime: "23:59",
      reason: reason ?? null,
      isAllDay: true,
      createdAt: now,
      updatedAt: now,
    });
  },

  // ---- SCHEDULE ----

  async getAssignedBookings(
    tenantId: string,
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<
    Array<{
      id: string;
      scheduledDate: Date;
      scheduledTime: string;
      durationMinutes: number;
      status: string;
    }>
  > {
    log.info({ tenantId, userId, startDate, endDate }, "getAssignedBookings");

    const rows = await db
      .select({
        id: bookings.id,
        scheduledDate: bookings.scheduledDate,
        scheduledTime: bookings.scheduledTime,
        durationMinutes: bookings.durationMinutes,
        status: bookings.status,
      })
      .from(bookings)
      .where(
        and(
          eq(bookings.tenantId, tenantId),
          eq(bookings.staffId, userId),
          gte(bookings.scheduledDate, startDate),
          lte(bookings.scheduledDate, endDate)
        )
      )
      .orderBy(asc(bookings.scheduledDate), asc(bookings.scheduledTime));

    return rows.map((row) => ({
      id: row.id,
      scheduledDate: row.scheduledDate,
      scheduledTime: row.scheduledTime,
      durationMinutes: row.durationMinutes,
      status: row.status,
    }));
  },
};
