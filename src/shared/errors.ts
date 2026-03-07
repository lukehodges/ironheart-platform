import { TRPCError } from "@trpc/server";

/**
 * Base class for all Ironheart application errors.
 * Services throw these; routers convert them to TRPCErrors via toTRPCError().
 */
export class IronheartError extends Error {
  constructor(
    message: string,
    public readonly code: string
  ) {
    super(message);
    this.name = "IronheartError";
  }
}

/** Resource was not found in the database. */
export class NotFoundError extends IronheartError {
  constructor(resource: string, id: string) {
    super(`${resource} not found: ${id}`, "NOT_FOUND");
    this.name = "NotFoundError";
  }
}

/** Authenticated user lacks permission to perform this action. */
export class ForbiddenError extends IronheartError {
  constructor(message = "Access denied") {
    super(message, "FORBIDDEN");
    this.name = "ForbiddenError";
  }
}

/** Request is not authenticated. */
export class UnauthorizedError extends IronheartError {
  constructor(message = "Authentication required") {
    super(message, "UNAUTHORIZED");
    this.name = "UnauthorizedError";
  }
}

/** Input failed business rule validation (beyond Zod schema validation). */
export class ValidationError extends IronheartError {
  constructor(message: string) {
    super(message, "VALIDATION_ERROR");
    this.name = "ValidationError";
  }
}

/** Attempted to create a resource that already exists, or a state conflict. */
export class ConflictError extends IronheartError {
  constructor(message: string) {
    super(message, "CONFLICT");
    this.name = "ConflictError";
  }
}

/** Request input failed validation or is logically invalid (bad request). */
export class BadRequestError extends IronheartError {
  constructor(message: string) {
    super(message, "BAD_REQUEST");
    this.name = "BadRequestError";
  }
}

/** Assignment would exceed the staff member's capacity limits. */
export class CapacityExceededError extends IronheartError {
  constructor(
    public readonly capacityType: string,
    public readonly current: number,
    public readonly max: number,
    public readonly enforcement: 'STRICT' | 'FLEXIBLE',
  ) {
    super(
      `Capacity exceeded for ${capacityType}: ${current}/${max} (enforcement: ${enforcement})`,
      "CAPACITY_EXCEEDED"
    );
    this.name = "CapacityExceededError";
  }
}

/** Skill has expired and cannot be used for assignment. */
export class SkillExpiredError extends IronheartError {
  constructor(skillName: string, expiredAt: Date) {
    super(`Skill "${skillName}" expired at ${expiredAt.toISOString()}`, "SKILL_EXPIRED");
    this.name = "SkillExpiredError";
  }
}

/** Map IronheartError.code → tRPC error code. */
const IRONHEART_TO_TRPC: Record<string, TRPCError["code"]> = {
  NOT_FOUND: "NOT_FOUND",
  FORBIDDEN: "FORBIDDEN",
  UNAUTHORIZED: "UNAUTHORIZED",
  VALIDATION_ERROR: "BAD_REQUEST",
  CONFLICT: "CONFLICT",
  BAD_REQUEST: "BAD_REQUEST",
  CAPACITY_EXCEEDED: "CONFLICT",
  SKILL_EXPIRED: "BAD_REQUEST",
};

/**
 * Returns true if the error is an IronheartError (or duck-types as one).
 * Uses the code property instead of instanceof to survive Next.js HMR/bundling
 * where class identity can differ across module instances.
 */
export function isIronheartError(error: unknown): error is IronheartError {
  return (
    error instanceof IronheartError ||
    (error instanceof Error &&
      "code" in error &&
      typeof (error as IronheartError).code === "string" &&
      (error as IronheartError).code in IRONHEART_TO_TRPC)
  );
}

/**
 * Convert a domain error to a tRPC error.
 * Uses code-based dispatch (resilient to instanceof failures from HMR/bundling).
 */
export function toTRPCError(error: unknown): TRPCError {
  if (error instanceof TRPCError) {
    return error;
  }
  if (isIronheartError(error)) {
    const trpcCode = IRONHEART_TO_TRPC[error.code] ?? "INTERNAL_SERVER_ERROR";
    return new TRPCError({ code: trpcCode, message: error.message });
  }
  return new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: "An unexpected error occurred",
  });
}
