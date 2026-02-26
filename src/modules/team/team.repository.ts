import { db } from "@/shared/db";
import { logger } from "@/shared/logger";
import { NotFoundError, ForbiddenError, ConflictError, BadRequestError } from "@/shared/errors";
import {
  users,
  staffProfiles,
  userAvailability,
  bookings,
  staffDepartments,
  staffDepartmentMembers,
  staffNotes,
  staffPayRates,
  staffChecklistTemplates,
  staffChecklistProgress,
  staffCustomFieldDefinitions,
  staffCustomFieldValues,
  resourceSkills,
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
  notInArray,
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
  Department,
  StaffNote,
  PayRate,
  ChecklistTemplate,
  ChecklistProgress,
  ChecklistItemProgress,
  CustomFieldDefinition,
  CustomFieldValue,
  StaffDepartmentMembership,
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

function mapToStaffMember(
  user: UserRow,
  profile: StaffProfileRow,
  departments: StaffDepartmentMembership[] = [],
): StaffMember {
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
    jobTitle: profile?.jobTitle ?? null,
    bio: profile?.bio ?? null,
    reportsTo: profile?.reportsTo ?? null,
    departments,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// ===============================================================
// TEAM REPOSITORY
// ===============================================================

export const teamRepository = {

  // ---- STAFF CRUD ----

  async findById(tenantId: string, userId: string): Promise<StaffMember | null> {
    log.info({ tenantId, userId }, "findById");
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
    if (!row) return null;

    // Fetch department memberships
    const deptRows = await db
      .select({
        departmentId: staffDepartmentMembers.departmentId,
        departmentName: staffDepartments.name,
        isPrimary: staffDepartmentMembers.isPrimary,
      })
      .from(staffDepartmentMembers)
      .innerJoin(staffDepartments, eq(staffDepartments.id, staffDepartmentMembers.departmentId))
      .where(
        and(
          eq(staffDepartmentMembers.tenantId, tenantId),
          eq(staffDepartmentMembers.userId, userId),
        )
      );

    return mapToStaffMember(row.user, row.profile, deptRows);
  },

  async listByTenant(
    tenantId: string,
    opts: {
      search?: string;
      status?: StaffStatus;
      employeeType?: string;
      departmentId?: string;
      limit: number;
      cursor?: string;
    }
  ): Promise<{ rows: StaffMember[]; hasMore: boolean }> {
    log.info({ tenantId, opts }, "listByTenant");
    const { search, status, limit, cursor } = opts;

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

    if (opts.employeeType) {
      const dbType = mapDomainEmployeeType(opts.employeeType as StaffMember["employeeType"]);
      if (dbType) {
        conditions.push(eq(staffProfiles.employeeType, dbType));
      }
    }

    if (cursor) {
      conditions.push(lte(users.createdAt, new Date(cursor)));
    }

    // If filtering by department, join through department members
    if (opts.departmentId) {
      const memberUserIds = await db
        .select({ userId: staffDepartmentMembers.userId })
        .from(staffDepartmentMembers)
        .where(
          and(
            eq(staffDepartmentMembers.tenantId, tenantId),
            eq(staffDepartmentMembers.departmentId, opts.departmentId),
          )
        );
      const ids = memberUserIds.map((r) => r.userId);
      if (ids.length === 0) return { rows: [], hasMore: false };
      conditions.push(inArray(users.id, ids));
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
    const sliced = hasMore ? rows.slice(0, limit) : rows;

    // Batch-load department memberships for all returned staff
    const userIds = sliced.map((r) => r.user.id);
    const deptRows = userIds.length > 0
      ? await db
          .select({
            userId: staffDepartmentMembers.userId,
            departmentId: staffDepartmentMembers.departmentId,
            departmentName: staffDepartments.name,
            isPrimary: staffDepartmentMembers.isPrimary,
          })
          .from(staffDepartmentMembers)
          .innerJoin(staffDepartments, eq(staffDepartments.id, staffDepartmentMembers.departmentId))
          .where(
            and(
              eq(staffDepartmentMembers.tenantId, tenantId),
              inArray(staffDepartmentMembers.userId, userIds),
            )
          )
      : [];

    const deptMap = new Map<string, StaffDepartmentMembership[]>();
    for (const d of deptRows) {
      const list = deptMap.get(d.userId) ?? [];
      list.push({ departmentId: d.departmentId, departmentName: d.departmentName, isPrimary: d.isPrimary });
      deptMap.set(d.userId, list);
    }

    return {
      rows: sliced.map((r) =>
        mapToStaffMember(r.user, r.profile, deptMap.get(r.user.id) ?? [])
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
          jobTitle: input.jobTitle ?? null,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      // If departmentId provided, add as primary member
      if (input.departmentId) {
        await tx
          .insert(staffDepartmentMembers)
          .values({
            tenantId,
            userId,
            departmentId: input.departmentId,
            isPrimary: true,
            joinedAt: now,
          });
      }

      return { user: userRow!, profile: profileRow! };
    });

    const depts: StaffDepartmentMembership[] = [];
    if (input.departmentId) {
      const dept = await db
        .select({ name: staffDepartments.name })
        .from(staffDepartments)
        .where(eq(staffDepartments.id, input.departmentId))
        .limit(1);
      if (dept[0]) {
        depts.push({ departmentId: input.departmentId, departmentName: dept[0].name, isPrimary: true });
      }
    }

    return mapToStaffMember(result.user, result.profile, depts);
  },

  async update(
    tenantId: string,
    userId: string,
    input: Partial<UpdateStaffInput>
  ): Promise<StaffMember> {
    log.info({ tenantId, userId }, "update staff");
    const now = new Date();

    const userUpdate: Record<string, unknown> = { updatedAt: now };
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
    if (input.jobTitle !== undefined) profileUpdate.jobTitle = input.jobTitle;
    if (input.bio !== undefined) profileUpdate.bio = input.bio;
    if (input.reportsTo !== undefined) profileUpdate.reportsTo = input.reportsTo;
    if (input.emergencyContactName !== undefined) profileUpdate.emergencyContactName = input.emergencyContactName;
    if (input.emergencyContactPhone !== undefined) profileUpdate.emergencyContactPhone = input.emergencyContactPhone;
    if (input.emergencyContactRelation !== undefined) profileUpdate.emergencyContactRelation = input.emergencyContactRelation;
    if (input.addressLine1 !== undefined) profileUpdate.addressLine1 = input.addressLine1;
    if (input.addressLine2 !== undefined) profileUpdate.addressLine2 = input.addressLine2;
    if (input.addressCity !== undefined) profileUpdate.addressCity = input.addressCity;
    if (input.addressPostcode !== undefined) profileUpdate.addressPostcode = input.addressPostcode;
    if (input.addressCountry !== undefined) profileUpdate.addressCountry = input.addressCountry;

    const result = await db.transaction(async (tx) => {
      const [updatedUser] = await tx
        .update(users)
        .set(userUpdate)
        .where(and(eq(users.id, userId), eq(users.tenantId, tenantId)))
        .returning();

      if (!updatedUser) throw new NotFoundError("Staff member", userId);

      let updatedProfile: typeof staffProfiles.$inferSelect | null = null;
      if (Object.keys(profileUpdate).length > 1) {
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

    // Fetch departments for the response
    const deptRows = await db
      .select({
        departmentId: staffDepartmentMembers.departmentId,
        departmentName: staffDepartments.name,
        isPrimary: staffDepartmentMembers.isPrimary,
      })
      .from(staffDepartmentMembers)
      .innerJoin(staffDepartments, eq(staffDepartments.id, staffDepartmentMembers.departmentId))
      .where(
        and(
          eq(staffDepartmentMembers.tenantId, tenantId),
          eq(staffDepartmentMembers.userId, userId),
        )
      );

    return mapToStaffMember(result.user, result.profile, deptRows);
  },

  async deactivate(tenantId: string, userId: string): Promise<void> {
    log.info({ tenantId, userId }, "deactivate staff");
    const now = new Date();

    await db.transaction(async (tx) => {
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

      // Also suspend the user account to prevent login
      await tx
        .update(users)
        .set({ status: "SUSPENDED", updatedAt: now })
        .where(and(eq(users.id, userId), eq(users.tenantId, tenantId)));
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

    const dateStr = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);

    const dayOfWeek = new Date(
      date.toLocaleString("en-US", { timeZone: timezone })
    ).getDay();

    const dateObj = new Date(dateStr);

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
        await tx
          .delete(userAvailability)
          .where(eq(userAvailability.userId, userId));
      } else {
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
          lte(bookings.scheduledDate, endDate),
          notInArray(bookings.status, ['CANCELLED', 'REJECTED']),
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

  // ---- DEPARTMENTS ----

  async listDepartments(tenantId: string): Promise<Department[]> {
    log.info({ tenantId }, "listDepartments");

    const rows = await db
      .select()
      .from(staffDepartments)
      .where(and(eq(staffDepartments.tenantId, tenantId), eq(staffDepartments.isActive, true)))
      .orderBy(asc(staffDepartments.sortOrder), asc(staffDepartments.name));

    // Count members per department
    const memberCounts = await db
      .select({
        departmentId: staffDepartmentMembers.departmentId,
        count: sql<number>`count(*)::int`,
      })
      .from(staffDepartmentMembers)
      .where(eq(staffDepartmentMembers.tenantId, tenantId))
      .groupBy(staffDepartmentMembers.departmentId);

    const countMap = new Map(memberCounts.map((r) => [r.departmentId, r.count]));

    // Build flat list first
    const flat: Department[] = rows.map((r) => ({
      id: r.id,
      tenantId: r.tenantId,
      name: r.name,
      slug: r.slug,
      description: r.description,
      parentId: r.parentId,
      managerId: r.managerId,
      color: r.color,
      sortOrder: r.sortOrder,
      isActive: r.isActive,
      memberCount: countMap.get(r.id) ?? 0,
      children: [],
    }));

    // Build tree
    const map = new Map(flat.map((d) => [d.id, d]));
    const roots: Department[] = [];
    for (const dept of flat) {
      if (dept.parentId && map.has(dept.parentId)) {
        map.get(dept.parentId)!.children.push(dept);
      } else {
        roots.push(dept);
      }
    }

    return roots;
  },

  async createDepartment(
    tenantId: string,
    input: { name: string; description?: string; parentId?: string; managerId?: string; color?: string }
  ): Promise<Department> {
    log.info({ tenantId, name: input.name }, "createDepartment");
    const now = new Date();
    const slug = slugify(input.name);

    const [row] = await db
      .insert(staffDepartments)
      .values({
        tenantId,
        name: input.name,
        slug,
        description: input.description ?? null,
        parentId: input.parentId ?? null,
        managerId: input.managerId ?? null,
        color: input.color ?? null,
        sortOrder: 0,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return {
      id: row!.id,
      tenantId: row!.tenantId,
      name: row!.name,
      slug: row!.slug,
      description: row!.description,
      parentId: row!.parentId,
      managerId: row!.managerId,
      color: row!.color,
      sortOrder: row!.sortOrder,
      isActive: row!.isActive,
      memberCount: 0,
      children: [],
    };
  },

  async updateDepartment(
    tenantId: string,
    input: {
      id: string;
      name?: string;
      description?: string | null;
      parentId?: string | null;
      managerId?: string | null;
      color?: string | null;
      sortOrder?: number;
      isActive?: boolean;
    }
  ): Promise<Department> {
    log.info({ tenantId, departmentId: input.id }, "updateDepartment");
    const now = new Date();
    const update: Record<string, unknown> = { updatedAt: now };

    if (input.name !== undefined) {
      update.name = input.name;
      update.slug = slugify(input.name);
    }
    if (input.description !== undefined) update.description = input.description;
    if (input.parentId !== undefined) update.parentId = input.parentId;
    if (input.managerId !== undefined) update.managerId = input.managerId;
    if (input.color !== undefined) update.color = input.color;
    if (input.sortOrder !== undefined) update.sortOrder = input.sortOrder;
    if (input.isActive !== undefined) update.isActive = input.isActive;

    const [row] = await db
      .update(staffDepartments)
      .set(update)
      .where(and(eq(staffDepartments.id, input.id), eq(staffDepartments.tenantId, tenantId)))
      .returning();

    if (!row) throw new NotFoundError("Department", input.id);

    // Get member count
    const countResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(staffDepartmentMembers)
      .where(eq(staffDepartmentMembers.departmentId, input.id));

    return {
      id: row.id,
      tenantId: row.tenantId,
      name: row.name,
      slug: row.slug,
      description: row.description,
      parentId: row.parentId,
      managerId: row.managerId,
      color: row.color,
      sortOrder: row.sortOrder,
      isActive: row.isActive,
      memberCount: countResult[0]?.count ?? 0,
      children: [],
    };
  },

  async deleteDepartment(tenantId: string, departmentId: string): Promise<void> {
    log.info({ tenantId, departmentId }, "deleteDepartment (soft)");
    const now = new Date();

    const [row] = await db
      .update(staffDepartments)
      .set({ isActive: false, updatedAt: now })
      .where(and(eq(staffDepartments.id, departmentId), eq(staffDepartments.tenantId, tenantId)))
      .returning({ id: staffDepartments.id });

    if (!row) throw new NotFoundError("Department", departmentId);
  },

  async addDepartmentMember(
    tenantId: string,
    input: { userId: string; departmentId: string; isPrimary: boolean }
  ): Promise<void> {
    log.info({ tenantId, userId: input.userId, departmentId: input.departmentId }, "addDepartmentMember");
    const now = new Date();

    await db.transaction(async (tx) => {
      // If isPrimary, clear other primaries for this user
      if (input.isPrimary) {
        await tx
          .update(staffDepartmentMembers)
          .set({ isPrimary: false })
          .where(
            and(
              eq(staffDepartmentMembers.tenantId, tenantId),
              eq(staffDepartmentMembers.userId, input.userId),
            )
          );
      }

      await tx
        .insert(staffDepartmentMembers)
        .values({
          tenantId,
          userId: input.userId,
          departmentId: input.departmentId,
          isPrimary: input.isPrimary,
          joinedAt: now,
        });
    });
  },

  async removeDepartmentMember(tenantId: string, userId: string, departmentId: string): Promise<void> {
    log.info({ tenantId, userId, departmentId }, "removeDepartmentMember");

    await db
      .delete(staffDepartmentMembers)
      .where(
        and(
          eq(staffDepartmentMembers.tenantId, tenantId),
          eq(staffDepartmentMembers.userId, userId),
          eq(staffDepartmentMembers.departmentId, departmentId),
        )
      );
  },

  // ---- NOTES ----

  async listNotes(
    tenantId: string,
    userId: string,
    opts: { limit: number; cursor?: string }
  ): Promise<{ rows: StaffNote[]; hasMore: boolean }> {
    log.info({ tenantId, userId, opts }, "listNotes");

    const conditions = [
      eq(staffNotes.tenantId, tenantId),
      eq(staffNotes.userId, userId),
    ];

    if (opts.cursor) {
      conditions.push(lte(staffNotes.createdAt, new Date(opts.cursor)));
    }

    const rows = await db
      .select({
        note: staffNotes,
        authorName: users.displayName,
        authorFirstName: users.firstName,
        authorLastName: users.lastName,
      })
      .from(staffNotes)
      .leftJoin(users, eq(users.id, staffNotes.authorId))
      .where(and(...conditions))
      .orderBy(desc(staffNotes.isPinned), desc(staffNotes.createdAt))
      .limit(opts.limit + 1);

    const hasMore = rows.length > opts.limit;
    const sliced = hasMore ? rows.slice(0, opts.limit) : rows;

    return {
      rows: sliced.map((r) => ({
        id: r.note.id,
        tenantId: r.note.tenantId,
        userId: r.note.userId,
        authorId: r.note.authorId,
        authorName: r.authorName ?? (`${r.authorFirstName ?? ''} ${r.authorLastName ?? ''}`.trim() || 'Unknown'),
        content: r.note.content,
        isPinned: r.note.isPinned,
        createdAt: r.note.createdAt,
        updatedAt: r.note.updatedAt,
      })),
      hasMore,
    };
  },

  async createNote(
    tenantId: string,
    authorId: string,
    input: { userId: string; content: string }
  ): Promise<StaffNote> {
    log.info({ tenantId, userId: input.userId, authorId }, "createNote");
    const now = new Date();

    const [row] = await db
      .insert(staffNotes)
      .values({
        tenantId,
        userId: input.userId,
        authorId,
        content: input.content,
        isPinned: false,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    // Fetch author name
    const author = await db
      .select({ displayName: users.displayName, firstName: users.firstName, lastName: users.lastName })
      .from(users)
      .where(eq(users.id, authorId))
      .limit(1);

    return {
      id: row!.id,
      tenantId: row!.tenantId,
      userId: row!.userId,
      authorId: row!.authorId,
      authorName: author[0]?.displayName ?? (`${author[0]?.firstName ?? ''} ${author[0]?.lastName ?? ''}`.trim() || 'Unknown'),
      content: row!.content,
      isPinned: row!.isPinned,
      createdAt: row!.createdAt,
      updatedAt: row!.updatedAt,
    };
  },

  async updateNote(
    tenantId: string,
    actorId: string,
    input: { noteId: string; content?: string; isPinned?: boolean }
  ): Promise<StaffNote> {
    log.info({ tenantId, noteId: input.noteId }, "updateNote");
    const now = new Date();

    // Fetch existing note to check ownership
    const existing = await db
      .select()
      .from(staffNotes)
      .where(and(eq(staffNotes.id, input.noteId), eq(staffNotes.tenantId, tenantId)))
      .limit(1);

    if (!existing[0]) throw new NotFoundError("Note", input.noteId);
    if (existing[0].authorId !== actorId) throw new ForbiddenError("Only the author can edit this note");

    const update: Record<string, unknown> = { updatedAt: now };
    if (input.content !== undefined) update.content = input.content;
    if (input.isPinned !== undefined) update.isPinned = input.isPinned;

    const [row] = await db
      .update(staffNotes)
      .set(update)
      .where(eq(staffNotes.id, input.noteId))
      .returning();

    const author = await db
      .select({ displayName: users.displayName, firstName: users.firstName, lastName: users.lastName })
      .from(users)
      .where(eq(users.id, row!.authorId))
      .limit(1);

    return {
      id: row!.id,
      tenantId: row!.tenantId,
      userId: row!.userId,
      authorId: row!.authorId,
      authorName: author[0]?.displayName ?? (`${author[0]?.firstName ?? ''} ${author[0]?.lastName ?? ''}`.trim() || 'Unknown'),
      content: row!.content,
      isPinned: row!.isPinned,
      createdAt: row!.createdAt,
      updatedAt: row!.updatedAt,
    };
  },

  async deleteNote(tenantId: string, actorId: string, noteId: string): Promise<void> {
    log.info({ tenantId, noteId }, "deleteNote");

    const existing = await db
      .select()
      .from(staffNotes)
      .where(and(eq(staffNotes.id, noteId), eq(staffNotes.tenantId, tenantId)))
      .limit(1);

    if (!existing[0]) throw new NotFoundError("Note", noteId);
    if (existing[0].authorId !== actorId) throw new ForbiddenError("Only the author can delete this note");

    await db
      .delete(staffNotes)
      .where(eq(staffNotes.id, noteId));
  },

  // ---- PAY RATES ----

  async listPayRates(tenantId: string, userId: string): Promise<PayRate[]> {
    log.info({ tenantId, userId }, "listPayRates");

    const rows = await db
      .select()
      .from(staffPayRates)
      .where(and(eq(staffPayRates.tenantId, tenantId), eq(staffPayRates.userId, userId)))
      .orderBy(desc(staffPayRates.effectiveFrom));

    return rows.map((r) => ({
      id: r.id,
      rateType: r.rateType as PayRate["rateType"],
      amount: Number(r.amount),
      currency: r.currency,
      effectiveFrom: r.effectiveFrom,
      effectiveUntil: r.effectiveUntil,
      reason: r.reason,
      createdBy: r.createdBy,
      createdAt: r.createdAt,
    }));
  },

  async createPayRate(
    tenantId: string,
    createdBy: string,
    input: {
      userId: string;
      rateType: string;
      amount: number;
      currency: string;
      effectiveFrom: string;
      reason?: string;
    }
  ): Promise<PayRate> {
    log.info({ tenantId, userId: input.userId }, "createPayRate");
    const now = new Date();
    const effectiveDate = new Date(input.effectiveFrom);

    // Calculate the day before for closing previous rate
    const dayBefore = new Date(effectiveDate);
    dayBefore.setDate(dayBefore.getDate() - 1);

    const [row] = await db.transaction(async (tx) => {
      // Close previous open rate
      await tx
        .update(staffPayRates)
        .set({ effectiveUntil: dayBefore })
        .where(
          and(
            eq(staffPayRates.tenantId, tenantId),
            eq(staffPayRates.userId, input.userId),
            isNull(staffPayRates.effectiveUntil),
          )
        );

      return await tx
        .insert(staffPayRates)
        .values({
          tenantId,
          userId: input.userId,
          rateType: input.rateType as "HOURLY" | "DAILY" | "SALARY" | "COMMISSION" | "PIECE_RATE",
          amount: String(input.amount),
          currency: input.currency,
          effectiveFrom: effectiveDate,
          effectiveUntil: null,
          reason: input.reason ?? null,
          createdBy,
          createdAt: now,
        })
        .returning();
    });

    return {
      id: row!.id,
      rateType: row!.rateType as PayRate["rateType"],
      amount: Number(row!.amount),
      currency: row!.currency,
      effectiveFrom: row!.effectiveFrom,
      effectiveUntil: row!.effectiveUntil,
      reason: row!.reason,
      createdBy: row!.createdBy,
      createdAt: row!.createdAt,
    };
  },

  // ---- CHECKLIST TEMPLATES ----

  async listChecklistTemplates(tenantId: string): Promise<ChecklistTemplate[]> {
    log.info({ tenantId }, "listChecklistTemplates");

    const rows = await db
      .select()
      .from(staffChecklistTemplates)
      .where(eq(staffChecklistTemplates.tenantId, tenantId))
      .orderBy(asc(staffChecklistTemplates.name));

    return rows.map((r) => ({
      id: r.id,
      tenantId: r.tenantId,
      name: r.name,
      type: r.type as ChecklistTemplate["type"],
      employeeType: r.employeeType,
      items: r.items as ChecklistTemplate["items"],
      isDefault: r.isDefault,
    }));
  },

  async createChecklistTemplate(
    tenantId: string,
    input: {
      name: string;
      type: string;
      employeeType?: string;
      items: Array<{ key: string; label: string; description: string; isRequired: boolean; order: number }>;
      isDefault: boolean;
    }
  ): Promise<ChecklistTemplate> {
    log.info({ tenantId, name: input.name }, "createChecklistTemplate");
    const now = new Date();

    const [row] = await db
      .insert(staffChecklistTemplates)
      .values({
        tenantId,
        name: input.name,
        type: input.type as "ONBOARDING" | "OFFBOARDING",
        employeeType: input.employeeType ?? null,
        items: input.items,
        isDefault: input.isDefault,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return {
      id: row!.id,
      tenantId: row!.tenantId,
      name: row!.name,
      type: row!.type as ChecklistTemplate["type"],
      employeeType: row!.employeeType,
      items: row!.items as ChecklistTemplate["items"],
      isDefault: row!.isDefault,
    };
  },

  async updateChecklistTemplate(
    tenantId: string,
    input: { id: string; name?: string; items?: Array<{ key: string; label: string; description: string; isRequired: boolean; order: number }>; isDefault?: boolean }
  ): Promise<ChecklistTemplate> {
    log.info({ tenantId, templateId: input.id }, "updateChecklistTemplate");
    const now = new Date();
    const update: Record<string, unknown> = { updatedAt: now };

    if (input.name !== undefined) update.name = input.name;
    if (input.items !== undefined) update.items = input.items;
    if (input.isDefault !== undefined) update.isDefault = input.isDefault;

    const [row] = await db
      .update(staffChecklistTemplates)
      .set(update)
      .where(and(eq(staffChecklistTemplates.id, input.id), eq(staffChecklistTemplates.tenantId, tenantId)))
      .returning();

    if (!row) throw new NotFoundError("Checklist template", input.id);

    return {
      id: row.id,
      tenantId: row.tenantId,
      name: row.name,
      type: row.type as ChecklistTemplate["type"],
      employeeType: row.employeeType,
      items: row.items as ChecklistTemplate["items"],
      isDefault: row.isDefault,
    };
  },

  // ---- CHECKLIST PROGRESS ----

  async getChecklistProgress(
    tenantId: string,
    userId: string,
    type?: string
  ): Promise<ChecklistProgress[]> {
    log.info({ tenantId, userId, type }, "getChecklistProgress");

    const conditions = [
      eq(staffChecklistProgress.tenantId, tenantId),
      eq(staffChecklistProgress.userId, userId),
    ];

    const rows = await db
      .select({
        progress: staffChecklistProgress,
        templateName: staffChecklistTemplates.name,
        templateType: staffChecklistTemplates.type,
      })
      .from(staffChecklistProgress)
      .innerJoin(staffChecklistTemplates, eq(staffChecklistTemplates.id, staffChecklistProgress.templateId))
      .where(and(...conditions))
      .orderBy(desc(staffChecklistProgress.createdAt));

    const filtered = type
      ? rows.filter((r) => r.templateType === type)
      : rows;

    return filtered.map((r) => ({
      id: r.progress.id,
      userId: r.progress.userId,
      templateId: r.progress.templateId,
      templateName: r.templateName,
      status: r.progress.status as ChecklistProgress["status"],
      items: r.progress.items as ChecklistItemProgress[],
      startedAt: r.progress.startedAt,
      completedAt: r.progress.completedAt,
    }));
  },

  async createChecklistProgress(
    tenantId: string,
    userId: string,
    templateId: string,
    items: ChecklistItemProgress[]
  ): Promise<ChecklistProgress> {
    log.info({ tenantId, userId, templateId }, "createChecklistProgress");
    const now = new Date();

    const template = await db
      .select({ name: staffChecklistTemplates.name })
      .from(staffChecklistTemplates)
      .where(eq(staffChecklistTemplates.id, templateId))
      .limit(1);

    const [row] = await db
      .insert(staffChecklistProgress)
      .values({
        tenantId,
        userId,
        templateId,
        status: "NOT_STARTED",
        items,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return {
      id: row!.id,
      userId: row!.userId,
      templateId: row!.templateId,
      templateName: template[0]?.name ?? 'Unknown',
      status: row!.status as ChecklistProgress["status"],
      items: row!.items as ChecklistItemProgress[],
      startedAt: row!.startedAt,
      completedAt: row!.completedAt,
    };
  },

  async completeChecklistItem(
    tenantId: string,
    actorId: string,
    progressId: string,
    itemKey: string
  ): Promise<ChecklistProgress> {
    log.info({ tenantId, progressId, itemKey }, "completeChecklistItem");
    const now = new Date();

    const existing = await db
      .select({
        progress: staffChecklistProgress,
        templateName: staffChecklistTemplates.name,
      })
      .from(staffChecklistProgress)
      .innerJoin(staffChecklistTemplates, eq(staffChecklistTemplates.id, staffChecklistProgress.templateId))
      .where(and(eq(staffChecklistProgress.id, progressId), eq(staffChecklistProgress.tenantId, tenantId)))
      .limit(1);

    if (!existing[0]) throw new NotFoundError("Checklist progress", progressId);

    const items = existing[0].progress.items as ChecklistItemProgress[];
    const itemIndex = items.findIndex((i) => i.key === itemKey);
    if (itemIndex === -1) throw new BadRequestError(`Checklist item not found: ${itemKey}`);

    items[itemIndex]!.completedAt = now.toISOString();
    items[itemIndex]!.completedBy = actorId;

    // Determine new status
    const allRequiredDone = items
      .filter((i) => i.isRequired)
      .every((i) => i.completedAt !== null);
    const anyDone = items.some((i) => i.completedAt !== null);

    let newStatus: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" = existing[0].progress.status as "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
    if (allRequiredDone) {
      newStatus = "COMPLETED";
    } else if (anyDone) {
      newStatus = "IN_PROGRESS";
    }

    const update: Record<string, unknown> = {
      items,
      status: newStatus,
      updatedAt: now,
    };
    if (newStatus === "IN_PROGRESS" && !existing[0].progress.startedAt) {
      update.startedAt = now;
    }
    if (newStatus === "COMPLETED") {
      update.completedAt = now;
    }

    const [row] = await db
      .update(staffChecklistProgress)
      .set(update)
      .where(eq(staffChecklistProgress.id, progressId))
      .returning();

    return {
      id: row!.id,
      userId: row!.userId,
      templateId: row!.templateId,
      templateName: existing[0].templateName,
      status: row!.status as ChecklistProgress["status"],
      items: row!.items as ChecklistItemProgress[],
      startedAt: row!.startedAt,
      completedAt: row!.completedAt,
    };
  },

  // ---- CUSTOM FIELDS ----

  async listCustomFieldDefinitions(tenantId: string): Promise<CustomFieldDefinition[]> {
    log.info({ tenantId }, "listCustomFieldDefinitions");

    const rows = await db
      .select()
      .from(staffCustomFieldDefinitions)
      .where(eq(staffCustomFieldDefinitions.tenantId, tenantId))
      .orderBy(asc(staffCustomFieldDefinitions.sortOrder), asc(staffCustomFieldDefinitions.label));

    return rows.map((r) => ({
      id: r.id,
      tenantId: r.tenantId,
      fieldKey: r.fieldKey,
      label: r.label,
      fieldType: r.fieldType as CustomFieldDefinition["fieldType"],
      options: r.options as CustomFieldDefinition["options"],
      isRequired: r.isRequired,
      showOnCard: r.showOnCard,
      showOnProfile: r.showOnProfile,
      sortOrder: r.sortOrder,
      groupName: r.groupName,
    }));
  },

  async createCustomFieldDefinition(
    tenantId: string,
    input: {
      fieldKey: string;
      label: string;
      fieldType: string;
      options?: Array<{ value: string; label: string }>;
      isRequired: boolean;
      showOnCard: boolean;
      showOnProfile: boolean;
      sortOrder: number;
      groupName?: string;
    }
  ): Promise<CustomFieldDefinition> {
    log.info({ tenantId, fieldKey: input.fieldKey }, "createCustomFieldDefinition");
    const now = new Date();

    const [row] = await db
      .insert(staffCustomFieldDefinitions)
      .values({
        tenantId,
        fieldKey: input.fieldKey,
        label: input.label,
        fieldType: input.fieldType as "TEXT" | "NUMBER" | "DATE" | "SELECT" | "MULTI_SELECT" | "BOOLEAN" | "URL" | "EMAIL" | "PHONE",
        options: input.options ?? null,
        isRequired: input.isRequired,
        showOnCard: input.showOnCard,
        showOnProfile: input.showOnProfile,
        sortOrder: input.sortOrder,
        groupName: input.groupName ?? null,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return {
      id: row!.id,
      tenantId: row!.tenantId,
      fieldKey: row!.fieldKey,
      label: row!.label,
      fieldType: row!.fieldType as CustomFieldDefinition["fieldType"],
      options: row!.options as CustomFieldDefinition["options"],
      isRequired: row!.isRequired,
      showOnCard: row!.showOnCard,
      showOnProfile: row!.showOnProfile,
      sortOrder: row!.sortOrder,
      groupName: row!.groupName,
    };
  },

  async updateCustomFieldDefinition(
    tenantId: string,
    input: {
      id: string;
      label?: string;
      options?: Array<{ value: string; label: string }>;
      isRequired?: boolean;
      showOnCard?: boolean;
      showOnProfile?: boolean;
      sortOrder?: number;
      groupName?: string | null;
    }
  ): Promise<CustomFieldDefinition> {
    log.info({ tenantId, fieldId: input.id }, "updateCustomFieldDefinition");
    const now = new Date();
    const update: Record<string, unknown> = { updatedAt: now };

    if (input.label !== undefined) update.label = input.label;
    if (input.options !== undefined) update.options = input.options;
    if (input.isRequired !== undefined) update.isRequired = input.isRequired;
    if (input.showOnCard !== undefined) update.showOnCard = input.showOnCard;
    if (input.showOnProfile !== undefined) update.showOnProfile = input.showOnProfile;
    if (input.sortOrder !== undefined) update.sortOrder = input.sortOrder;
    if (input.groupName !== undefined) update.groupName = input.groupName;

    const [row] = await db
      .update(staffCustomFieldDefinitions)
      .set(update)
      .where(and(eq(staffCustomFieldDefinitions.id, input.id), eq(staffCustomFieldDefinitions.tenantId, tenantId)))
      .returning();

    if (!row) throw new NotFoundError("Custom field definition", input.id);

    return {
      id: row.id,
      tenantId: row.tenantId,
      fieldKey: row.fieldKey,
      label: row.label,
      fieldType: row.fieldType as CustomFieldDefinition["fieldType"],
      options: row.options as CustomFieldDefinition["options"],
      isRequired: row.isRequired,
      showOnCard: row.showOnCard,
      showOnProfile: row.showOnProfile,
      sortOrder: row.sortOrder,
      groupName: row.groupName,
    };
  },

  async deleteCustomFieldDefinition(tenantId: string, fieldId: string): Promise<void> {
    log.info({ tenantId, fieldId }, "deleteCustomFieldDefinition");

    // Delete values first, then the definition
    await db.transaction(async (tx) => {
      await tx
        .delete(staffCustomFieldValues)
        .where(
          and(
            eq(staffCustomFieldValues.tenantId, tenantId),
            eq(staffCustomFieldValues.fieldDefinitionId, fieldId),
          )
        );

      const [row] = await tx
        .delete(staffCustomFieldDefinitions)
        .where(and(eq(staffCustomFieldDefinitions.id, fieldId), eq(staffCustomFieldDefinitions.tenantId, tenantId)))
        .returning({ id: staffCustomFieldDefinitions.id });

      if (!row) throw new NotFoundError("Custom field definition", fieldId);
    });
  },

  async getCustomFieldValues(tenantId: string, userId: string): Promise<CustomFieldValue[]> {
    log.info({ tenantId, userId }, "getCustomFieldValues");

    const rows = await db
      .select({
        value: staffCustomFieldValues,
        fieldKey: staffCustomFieldDefinitions.fieldKey,
        label: staffCustomFieldDefinitions.label,
        fieldType: staffCustomFieldDefinitions.fieldType,
        groupName: staffCustomFieldDefinitions.groupName,
      })
      .from(staffCustomFieldValues)
      .innerJoin(
        staffCustomFieldDefinitions,
        eq(staffCustomFieldDefinitions.id, staffCustomFieldValues.fieldDefinitionId)
      )
      .where(
        and(
          eq(staffCustomFieldValues.tenantId, tenantId),
          eq(staffCustomFieldValues.userId, userId),
        )
      );

    return rows.map((r) => ({
      fieldDefinitionId: r.value.fieldDefinitionId,
      fieldKey: r.fieldKey,
      label: r.label,
      fieldType: r.fieldType as CustomFieldValue["fieldType"],
      value: r.value.value,
      groupName: r.groupName,
    }));
  },

  async setCustomFieldValues(
    tenantId: string,
    userId: string,
    values: Array<{ fieldDefinitionId: string; value: unknown }>
  ): Promise<void> {
    log.info({ tenantId, userId, count: values.length }, "setCustomFieldValues");
    const now = new Date();

    await db.transaction(async (tx) => {
      for (const v of values) {
        // Upsert: delete then insert to handle the unique constraint
        await tx
          .delete(staffCustomFieldValues)
          .where(
            and(
              eq(staffCustomFieldValues.tenantId, tenantId),
              eq(staffCustomFieldValues.userId, userId),
              eq(staffCustomFieldValues.fieldDefinitionId, v.fieldDefinitionId),
            )
          );

        await tx
          .insert(staffCustomFieldValues)
          .values({
            tenantId,
            userId,
            fieldDefinitionId: v.fieldDefinitionId,
            value: v.value,
            createdAt: now,
            updatedAt: now,
          });
      }
    });
  },

  // ---- SKILL CATALOG ----

  async listSkillCatalog(tenantId: string): Promise<Array<{ skillId: string; skillName: string }>> {
    log.info({ tenantId }, "listSkillCatalog");

    const rows = await db
      .select({
        skillId: resourceSkills.skillId,
        skillName: resourceSkills.skillName,
      })
      .from(resourceSkills)
      .where(eq(resourceSkills.tenantId, tenantId))
      .groupBy(resourceSkills.skillId, resourceSkills.skillName)
      .orderBy(asc(resourceSkills.skillName));

    return rows;
  },
};
