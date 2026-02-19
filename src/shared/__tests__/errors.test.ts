import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { TRPCError } from "@trpc/server";
import {
  IronheartError,
  NotFoundError,
  NotFoundError as NF,
  ForbiddenError,
  UnauthorizedError,
  ValidationError,
  ConflictError,
  toTRPCError,
} from "../errors";

// ---------------------------------------------------------------------------
// Error class unit tests
// ---------------------------------------------------------------------------

describe("IronheartError", () => {
  it("sets name to IronheartError", () => {
    const e = new IronheartError("test", "CODE");
    expect(e.name).toBe("IronheartError");
  });

  it("is instanceof Error", () => {
    const e = new IronheartError("test", "CODE");
    expect(e).toBeInstanceOf(Error);
  });

  it("exposes code property", () => {
    const e = new IronheartError("test", "MY_CODE");
    expect(e.code).toBe("MY_CODE");
  });
});

describe("NotFoundError", () => {
  it("formats message as 'Resource not found: id'", () => {
    const e = new NotFoundError("Booking", "abc-123");
    expect(e.message).toBe("Booking not found: abc-123");
  });

  it("has name NotFoundError", () => {
    const e = new NotFoundError("Booking", "id");
    expect(e.name).toBe("NotFoundError");
  });

  it("is instanceof IronheartError", () => {
    const e = new NotFoundError("Booking", "id");
    expect(e).toBeInstanceOf(IronheartError);
  });
});

describe("ForbiddenError", () => {
  it("has default message", () => {
    const e = new ForbiddenError();
    expect(e.message).toBe("Access denied");
  });

  it("accepts custom message", () => {
    const e = new ForbiddenError("Custom message");
    expect(e.message).toBe("Custom message");
  });
});

describe("UnauthorizedError", () => {
  it("has default message", () => {
    const e = new UnauthorizedError();
    expect(e.message).toBe("Authentication required");
  });
});

describe("ValidationError", () => {
  it("stores validation message", () => {
    const e = new ValidationError("Field X is required");
    expect(e.message).toBe("Field X is required");
    expect(e.name).toBe("ValidationError");
  });
});

describe("ConflictError", () => {
  it("stores conflict message", () => {
    const e = new ConflictError("Resource already exists");
    expect(e.message).toBe("Resource already exists");
  });
});

// ---------------------------------------------------------------------------
// toTRPCError — unit tests
// ---------------------------------------------------------------------------

describe("toTRPCError", () => {
  it("maps NotFoundError → NOT_FOUND", () => {
    const result = toTRPCError(new NotFoundError("Booking", "id"));
    expect(result.code).toBe("NOT_FOUND");
    expect(result.message).toContain("not found");
  });

  it("maps ForbiddenError → FORBIDDEN", () => {
    const result = toTRPCError(new ForbiddenError());
    expect(result.code).toBe("FORBIDDEN");
  });

  it("maps UnauthorizedError → UNAUTHORIZED", () => {
    const result = toTRPCError(new UnauthorizedError());
    expect(result.code).toBe("UNAUTHORIZED");
  });

  it("maps ValidationError → BAD_REQUEST", () => {
    const result = toTRPCError(new ValidationError("bad input"));
    expect(result.code).toBe("BAD_REQUEST");
  });

  it("maps ConflictError → CONFLICT", () => {
    const result = toTRPCError(new ConflictError("already exists"));
    expect(result.code).toBe("CONFLICT");
  });

  it("passes TRPCError through unchanged", () => {
    const original = new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Rate limited" });
    const result = toTRPCError(original);
    expect(result).toBe(original);
    expect(result.code).toBe("TOO_MANY_REQUESTS");
  });

  it("unknown errors → INTERNAL_SERVER_ERROR", () => {
    const result = toTRPCError(new Error("something unexpected"));
    expect(result.code).toBe("INTERNAL_SERVER_ERROR");
  });

  it("non-Error unknowns → INTERNAL_SERVER_ERROR", () => {
    expect(toTRPCError("string error").code).toBe("INTERNAL_SERVER_ERROR");
    expect(toTRPCError(42).code).toBe("INTERNAL_SERVER_ERROR");
    expect(toTRPCError(null).code).toBe("INTERNAL_SERVER_ERROR");
    expect(toTRPCError(undefined).code).toBe("INTERNAL_SERVER_ERROR");
  });

  it("always returns a TRPCError instance", () => {
    const inputs = [
      new NotFoundError("X", "1"),
      new ForbiddenError(),
      new UnauthorizedError(),
      new ValidationError("bad"),
      new ConflictError("conflict"),
      new TRPCError({ code: "NOT_FOUND" }),
      new Error("generic"),
      "string",
      null,
      undefined,
      42,
    ];
    for (const input of inputs) {
      expect(toTRPCError(input)).toBeInstanceOf(TRPCError);
    }
  });
});

// ---------------------------------------------------------------------------
// toTRPCError — property-based tests
// ---------------------------------------------------------------------------

describe("toTRPCError — properties", () => {
  it("Property: always returns a TRPCError", () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.string(),
          fc.integer(),
          fc.boolean(),
          fc.constant(null),
          fc.constant(undefined)
        ),
        (unknownValue) => {
          const result = toTRPCError(unknownValue);
          return result instanceof TRPCError;
        }
      )
    );
  });

  it("Property: IronheartError subclasses are never mapped to INTERNAL_SERVER_ERROR", () => {
    const ironheartErrors = [
      new NotFoundError("X", "id"),
      new ForbiddenError("denied"),
      new UnauthorizedError(),
      new ValidationError("invalid"),
      new ConflictError("conflict"),
    ];
    for (const e of ironheartErrors) {
      const result = toTRPCError(e);
      expect(result.code).not.toBe("INTERNAL_SERVER_ERROR");
    }
  });

  it("Property: toTRPCError preserves message from IronheartError", () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1 }), (message) => {
        const err = new ValidationError(message);
        const result = toTRPCError(err);
        return result.message === message;
      })
    );
  });
});
