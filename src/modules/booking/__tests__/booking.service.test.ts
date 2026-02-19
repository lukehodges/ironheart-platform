import { describe, it, expect, vi, beforeEach } from "vitest";
import { bookingService } from "../booking.service";
import { bookingRepository } from "../booking.repository";
import { inngest } from "@/shared/inngest";
import { redis } from "@/shared/redis";
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "@/shared/errors";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("../booking.repository", () => ({
  bookingRepository: {
    findSlotById: vi.fn(),
    create: vi.fn(),
    decrementSlotCapacity: vi.fn(),
    incrementSlotCapacity: vi.fn(),
    recordStatusChange: vi.fn(),
    upsertAssignments: vi.fn(),
    updateStatus: vi.fn(),
    findById: vi.fn(),
    findByIdPublic: vi.fn(),
    findCustomerEmailForBooking: vi.fn(),
    list: vi.fn(),
    listForCalendar: vi.fn(),
    getStats: vi.fn(),
    findSlotsByDate: vi.fn(),
    findSlotsByDateRange: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock("@/shared/inngest", () => ({
  inngest: { send: vi.fn().mockResolvedValue(undefined) },
}));

// Stateful Redis mock — tracks stored values so get() returns what set() stored.
// This is required to test the lock token check in releaseSlotLock correctly.
const redisStore: Record<string, string> = {};
vi.mock("@/shared/redis", () => ({
  redis: {
    set: vi.fn((key: string, value: unknown, _opts?: unknown) => {
      redisStore[key] = String(value);
      return Promise.resolve("OK");
    }),
    get: vi.fn((key: string) => Promise.resolve(redisStore[key] ?? null)),
    del: vi.fn(() => Promise.resolve(1)),
  },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TENANT_ID = "00000000-0000-0000-0000-000000000001";
const SLOT_ID   = "00000000-0000-0000-0000-000000000002";
const BOOKING_ID = "00000000-0000-0000-0000-000000000003";
const CUSTOMER_EMAIL = "customer@example.com";

function makeSlot(overrides = {}) {
  return {
    id: SLOT_ID,
    tenantId: TENANT_ID,
    available: true,
    capacity: 5,
    bookedCount: 0,
    ...overrides,
  };
}

function makeBooking(overrides = {}) {
  const now = new Date();
  return {
    id: BOOKING_ID,
    tenantId: TENANT_ID,
    bookingNumber: "BK-2026-0001",
    status: "RESERVED",
    staffId: null,
    slotId: SLOT_ID,
    reservedAt: now,
    reservationExpiresAt: new Date(now.getTime() + 15 * 60 * 1000),
    requiresApproval: false,
    ...overrides,
  };
}

function makeMinimalInput() {
  return {
    customerId: "00000000-0000-0000-0000-000000000010",
    serviceId: "00000000-0000-0000-0000-000000000011",
    scheduledDate: new Date("2026-06-01"),
    scheduledTime: "10:00",
    durationMinutes: 60,
    slotId: SLOT_ID,
  };
}

// ---------------------------------------------------------------------------
// createBooking
// ---------------------------------------------------------------------------

describe("bookingService.createBooking", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear the stateful Redis store between tests
    for (const key of Object.keys(redisStore)) {
      delete redisStore[key];
    }
    // Re-install implementations that depend on redisStore after clearAllMocks
    vi.mocked(redis.set).mockImplementation((key: string, value: unknown, _opts?: unknown) => {
      redisStore[key] = String(value);
      return Promise.resolve("OK");
    });
    vi.mocked(redis.get).mockImplementation((key: string) => Promise.resolve(redisStore[key] ?? null));
    vi.mocked(redis.del).mockResolvedValue(1);
  });

  it("acquires Redis lock before capacity check", async () => {
    // redis.set/get/del use the stateful mock from beforeEach — no override needed
    vi.mocked(bookingRepository.findSlotById).mockResolvedValue(makeSlot() as never);
    vi.mocked(bookingRepository.create).mockResolvedValue(makeBooking() as never);
    vi.mocked(bookingRepository.decrementSlotCapacity).mockResolvedValue(undefined);
    vi.mocked(bookingRepository.recordStatusChange).mockResolvedValue(undefined);

    await bookingService.createBooking(TENANT_ID, makeMinimalInput());

    expect(redis.set).toHaveBeenCalledWith(
      `lock:slot:${TENANT_ID}:${SLOT_ID}`,
      expect.any(String), // UUID token — exact value not known ahead of time
      { nx: true, px: 5000 }
    );
    expect(redis.del).toHaveBeenCalled();
  });

  it("throws ConflictError when slot lock is already held", async () => {
    vi.mocked(redis.set).mockResolvedValue(null); // lock not acquired

    await expect(bookingService.createBooking(TENANT_ID, makeMinimalInput()))
      .rejects.toThrow(ConflictError);

    expect(bookingRepository.findSlotById).not.toHaveBeenCalled();
  });

  it("releases lock even when slot capacity check throws", async () => {
    // redis.set/get/del use the stateful mock from beforeEach — no override needed
    vi.mocked(bookingRepository.findSlotById).mockResolvedValue(makeSlot({ available: false }) as never);

    await expect(bookingService.createBooking(TENANT_ID, makeMinimalInput()))
      .rejects.toThrow(ConflictError);

    expect(redis.del).toHaveBeenCalled();
  });

  // CTO review item 9.2 — explicit slot capacity check: bookedCount >= capacity
  it("throws ConflictError when slot bookedCount equals capacity (slot full)", async () => {
    // redis.set/get/del use the stateful mock from beforeEach — no override needed
    vi.mocked(bookingRepository.findSlotById).mockResolvedValue(
      makeSlot({ available: true, capacity: 5, bookedCount: 5 }) as never
    );

    await expect(bookingService.createBooking(TENANT_ID, makeMinimalInput()))
      .rejects.toThrow(ConflictError);

    // Lock must still be released even on capacity failure
    expect(redis.del).toHaveBeenCalled();
    // Booking must NOT be created when slot is at full capacity
    expect(bookingRepository.create).not.toHaveBeenCalled();
  });

  it("throws ConflictError when slot bookedCount exceeds capacity", async () => {
    // redis.set/get/del use the stateful mock from beforeEach — no override needed
    vi.mocked(bookingRepository.findSlotById).mockResolvedValue(
      makeSlot({ available: true, capacity: 3, bookedCount: 7 }) as never
    );

    await expect(bookingService.createBooking(TENANT_ID, makeMinimalInput()))
      .rejects.toThrow(ConflictError);

    expect(redis.del).toHaveBeenCalled();
    expect(bookingRepository.create).not.toHaveBeenCalled();
  });

  it("returns a 64-char confirmation token for RESERVED bookings", async () => {
    // redis.set/get/del use the stateful mock from beforeEach — no override needed
    vi.mocked(bookingRepository.findSlotById).mockResolvedValue(makeSlot() as never);
    vi.mocked(bookingRepository.create).mockResolvedValue(makeBooking() as never);
    vi.mocked(bookingRepository.decrementSlotCapacity).mockResolvedValue(undefined);
    vi.mocked(bookingRepository.recordStatusChange).mockResolvedValue(undefined);

    const { confirmationToken } = await bookingService.createBooking(TENANT_ID, makeMinimalInput());

    expect(confirmationToken).toHaveLength(64);
    expect(confirmationToken).toMatch(/^[0-9a-f]+$/);
  });

  it("returns null confirmationToken for admin bookings without slot", async () => {
    const input = { ...makeMinimalInput(), slotId: undefined };
    vi.mocked(bookingRepository.create).mockResolvedValue(makeBooking({ status: "PENDING", slotId: null }) as never);
    vi.mocked(bookingRepository.recordStatusChange).mockResolvedValue(undefined);

    const { confirmationToken } = await bookingService.createBooking(TENANT_ID, input);

    expect(confirmationToken).toBeNull();
    expect(redis.set).not.toHaveBeenCalled(); // no lock needed without slotId
  });

  it("fires slot/reserved Inngest event for RESERVED bookings", async () => {
    // redis.set/get/del use the stateful mock from beforeEach — no override needed
    vi.mocked(bookingRepository.findSlotById).mockResolvedValue(makeSlot() as never);
    vi.mocked(bookingRepository.create).mockResolvedValue(makeBooking() as never);
    vi.mocked(bookingRepository.decrementSlotCapacity).mockResolvedValue(undefined);
    vi.mocked(bookingRepository.recordStatusChange).mockResolvedValue(undefined);

    await bookingService.createBooking(TENANT_ID, makeMinimalInput());

    expect(inngest.send).toHaveBeenCalledWith(
      expect.objectContaining({ name: "slot/reserved" })
    );
  });
});

// ---------------------------------------------------------------------------
// confirmReservation
// ---------------------------------------------------------------------------

describe("bookingService.confirmReservation", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("throws NotFoundError when booking does not exist", async () => {
    vi.mocked(bookingRepository.findByIdPublic).mockResolvedValue(null as never);

    await expect(bookingService.confirmReservation(BOOKING_ID, CUSTOMER_EMAIL, "a".repeat(64)))
      .rejects.toThrow(NotFoundError);
  });

  it("throws ConflictError when booking is not RESERVED", async () => {
    vi.mocked(bookingRepository.findByIdPublic).mockResolvedValue(
      makeBooking({ status: "CONFIRMED" }) as never
    );

    await expect(bookingService.confirmReservation(BOOKING_ID, CUSTOMER_EMAIL, "a".repeat(64)))
      .rejects.toThrow(ConflictError);
  });

  it("throws ValidationError when reservation has expired", async () => {
    vi.mocked(bookingRepository.findByIdPublic).mockResolvedValue(
      makeBooking({ reservationExpiresAt: new Date(Date.now() - 1000) }) as never
    );

    await expect(bookingService.confirmReservation(BOOKING_ID, CUSTOMER_EMAIL, "a".repeat(64)))
      .rejects.toThrow(ValidationError);
  });

  it("throws ForbiddenError when email does not match booking customer", async () => {
    vi.mocked(bookingRepository.findByIdPublic).mockResolvedValue(
      makeBooking() as never
    );
    vi.mocked(bookingRepository.findCustomerEmailForBooking).mockResolvedValue("other@example.com");

    await expect(bookingService.confirmReservation(BOOKING_ID, "wrong@example.com", "a".repeat(64)))
      .rejects.toThrow(ForbiddenError);
  });

  it("throws ForbiddenError when customer email is not found", async () => {
    vi.mocked(bookingRepository.findByIdPublic).mockResolvedValue(
      makeBooking() as never
    );
    vi.mocked(bookingRepository.findCustomerEmailForBooking).mockResolvedValue(null);

    await expect(bookingService.confirmReservation(BOOKING_ID, CUSTOMER_EMAIL, "a".repeat(64)))
      .rejects.toThrow(ForbiddenError);
  });

  it("throws ValidationError for invalid token", async () => {
    const { createHash } = await import("node:crypto");
    const correctToken = "a".repeat(64);
    const correctHash = createHash("sha256").update(correctToken).digest("hex");

    vi.mocked(bookingRepository.findByIdPublic).mockResolvedValue(
      makeBooking({ confirmationTokenHash: correctHash }) as never
    );
    vi.mocked(bookingRepository.findCustomerEmailForBooking).mockResolvedValue(CUSTOMER_EMAIL);

    await expect(bookingService.confirmReservation(BOOKING_ID, CUSTOMER_EMAIL, "b".repeat(64)))
      .rejects.toThrow(ValidationError);
  });

  it("confirms booking with correct email and token", async () => {
    const { createHash } = await import("node:crypto");
    const correctToken = "c".repeat(64);
    const correctHash = createHash("sha256").update(correctToken).digest("hex");

    vi.mocked(bookingRepository.findByIdPublic).mockResolvedValue(
      makeBooking({ confirmationTokenHash: correctHash }) as never
    );
    vi.mocked(bookingRepository.findCustomerEmailForBooking).mockResolvedValue(CUSTOMER_EMAIL);
    vi.mocked(bookingRepository.updateStatus).mockResolvedValue(
      makeBooking({ status: "CONFIRMED" }) as never
    );
    vi.mocked(bookingRepository.recordStatusChange).mockResolvedValue(undefined);

    const result = await bookingService.confirmReservation(BOOKING_ID, CUSTOMER_EMAIL, correctToken);

    expect(result.status).toBe("CONFIRMED");
    expect(inngest.send).toHaveBeenCalledWith(
      expect.objectContaining({ name: "booking/confirmed" })
    );
  });

  it("email comparison is case-insensitive", async () => {
    const { createHash } = await import("node:crypto");
    const correctToken = "d".repeat(64);
    const correctHash = createHash("sha256").update(correctToken).digest("hex");

    vi.mocked(bookingRepository.findByIdPublic).mockResolvedValue(
      makeBooking({ confirmationTokenHash: correctHash }) as never
    );
    vi.mocked(bookingRepository.findCustomerEmailForBooking).mockResolvedValue("Customer@Example.COM");
    vi.mocked(bookingRepository.updateStatus).mockResolvedValue(
      makeBooking({ status: "CONFIRMED" }) as never
    );
    vi.mocked(bookingRepository.recordStatusChange).mockResolvedValue(undefined);

    // Should succeed — emails match case-insensitively
    const result = await bookingService.confirmReservation(BOOKING_ID, "customer@example.com", correctToken);
    expect(result.status).toBe("CONFIRMED");
  });
});
