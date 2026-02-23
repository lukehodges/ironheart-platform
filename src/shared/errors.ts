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

/**
 * Convert a domain error to a tRPC error.
 * Call this in router catch blocks: catch (e) { throw toTRPCError(e); }
 */
export function toTRPCError(error: unknown): TRPCError {
  if (error instanceof NotFoundError) {
    return new TRPCError({ code: "NOT_FOUND", message: error.message });
  }
  if (error instanceof ForbiddenError) {
    return new TRPCError({ code: "FORBIDDEN", message: error.message });
  }
  if (error instanceof UnauthorizedError) {
    return new TRPCError({ code: "UNAUTHORIZED", message: error.message });
  }
  if (error instanceof ValidationError) {
    return new TRPCError({ code: "BAD_REQUEST", message: error.message });
  }
  if (error instanceof ConflictError) {
    return new TRPCError({ code: "CONFLICT", message: error.message });
  }
  if (error instanceof BadRequestError) {
    return new TRPCError({ code: "BAD_REQUEST", message: error.message });
  }
  if (error instanceof CapacityExceededError) {
    return new TRPCError({ code: "CONFLICT", message: error.message });
  }
  if (error instanceof TRPCError) {
    return error;
  }
  return new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: "An unexpected error occurred",
  });
}
