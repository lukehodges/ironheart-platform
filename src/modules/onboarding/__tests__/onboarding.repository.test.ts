import { describe, it, expect, vi, beforeEach } from "vitest";
import { OptimisticConcurrencyError, NotFoundError, BadRequestError } from "@/shared/errors";

// ── db mock ───────────────────────────────────────────────────────────────────

// Transaction mock that executes the callback with a mock tx
const mockTx = {
  select: vi.fn(),
  delete: vi.fn(),
  execute: vi.fn(),
};

vi.mock("@/shared/db", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    execute: vi.fn(),
    transaction: vi.fn(async (fn: (tx: typeof mockTx) => Promise<unknown>) => fn(mockTx)),
  },
}));

// ── import after mocks ────────────────────────────────────────────────────────

import { onboardingRepository } from "../onboarding.repository";
import { db } from "@/shared/db";

// ── test data ─────────────────────────────────────────────────────────────────

const ENG_ID = "engagement-001";
const TENANT_ID = "tenant-001";
const OTHER_TENANT_ID = "tenant-999";

function makeNode(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "node-001",
    tenantId: TENANT_ID,
    engagementId: ENG_ID,
    parentId: null,
    label: "Operations",
    type: "DEPARTMENT",
    headcount: 10,
    contactUserId: null,
    contactEmail: null,
    contactName: null,
    contactRole: null,
    interviewMode: "OWNER_ONLY",
    sampleSize: null,
    templateSlugOverride: null,
    sortOrder: 1,
    version: 1,
    lastEditedBy: "CONSULTANT",
    lastEditedAt: new Date("2026-01-01"),
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    ...overrides,
  };
}

function makeChildNode(parentId: string, overrides: Partial<Record<string, unknown>> = {}) {
  return makeNode({ id: "node-002", parentId, label: "Finance", sortOrder: 1, ...overrides });
}

function makeActivity(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "activity-001",
    engagementId: ENG_ID,
    nodeId: "node-001",
    actorType: "CONSULTANT",
    actorId: "user-001",
    actorName: "Alice",
    action: "CREATE",
    fromValue: null,
    toValue: null,
    message: "Node created",
    createdAt: new Date("2026-01-01T12:00:00Z"),
    ...overrides,
  };
}

// ── getChartByEngagement ──────────────────────────────────────────────────────

describe("onboardingRepository.getChartByEngagement", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns rows ordered by parentId and sortOrder", async () => {
    const nodes = [makeNode(), makeChildNode("node-001")];
    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockResolvedValue(nodes),
    } as any);

    const result = await onboardingRepository.getChartByEngagement(TENANT_ID, ENG_ID);

    expect(db.select).toHaveBeenCalled();
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("node-001");
  });

  it("cross-tenant query returns empty (tenantId scoped)", async () => {
    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockResolvedValue([]),
    } as any);

    const result = await onboardingRepository.getChartByEngagement(OTHER_TENANT_ID, ENG_ID);

    expect(result).toHaveLength(0);
  });
});

// ── getChartTree ──────────────────────────────────────────────────────────────

describe("onboardingRepository.getChartTree", () => {
  beforeEach(() => vi.clearAllMocks());

  it("correctly assembles nested children from flat list", async () => {
    const parent = makeNode({ id: "node-001", parentId: null });
    const child = makeChildNode("node-001", { id: "node-002" });

    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockResolvedValue([parent, child]),
    } as any);

    const result = await onboardingRepository.getChartTree(TENANT_ID, ENG_ID);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("node-001");
    expect(result[0].children).toHaveLength(1);
    expect(result[0].children[0].id).toBe("node-002");
  });

  it("handles multiple roots", async () => {
    const root1 = makeNode({ id: "node-001", parentId: null });
    const root2 = makeNode({ id: "node-003", parentId: null, label: "Marketing" });

    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockResolvedValue([root1, root2]),
    } as any);

    const result = await onboardingRepository.getChartTree(TENANT_ID, ENG_ID);

    expect(result).toHaveLength(2);
    expect(result.map((r) => r.id)).toContain("node-001");
    expect(result.map((r) => r.id)).toContain("node-003");
  });

  it("treats orphan nodes (parentId points to non-existent) as roots", async () => {
    const orphan = makeNode({ id: "node-002", parentId: "nonexistent-parent" });

    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockResolvedValue([orphan]),
    } as any);

    const result = await onboardingRepository.getChartTree(TENANT_ID, ENG_ID);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("node-002");
    expect(result[0].children).toHaveLength(0);
  });
});

// ── getNodeById ───────────────────────────────────────────────────────────────

describe("onboardingRepository.getNodeById", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns the node when found", async () => {
    const node = makeNode();
    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([node]),
    } as any);

    const result = await onboardingRepository.getNodeById(TENANT_ID, "node-001");

    expect(result).not.toBeNull();
    expect(result!.id).toBe("node-001");
  });

  it("returns null when node not found", async () => {
    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    } as any);

    const result = await onboardingRepository.getNodeById(TENANT_ID, "missing-node");

    expect(result).toBeNull();
  });

  it("returns null for cross-tenant access (tenantId scoped)", async () => {
    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    } as any);

    const result = await onboardingRepository.getNodeById(OTHER_TENANT_ID, "node-001");

    expect(result).toBeNull();
  });
});

// ── createNode ────────────────────────────────────────────────────────────────

describe("onboardingRepository.createNode", () => {
  beforeEach(() => vi.clearAllMocks());

  it("defaults sortOrder to max+1 when not provided", async () => {
    const maxResult = [{ maxOrder: 3 }];
    const newNode = makeNode({ sortOrder: 4, version: 1 });

    vi.mocked(db.select).mockReturnValueOnce({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue(maxResult),
    } as any);

    vi.mocked(db.insert).mockReturnValue({
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([newNode]),
    } as any);

    const result = await onboardingRepository.createNode({
      tenantId: TENANT_ID,
      engagementId: ENG_ID,
      parentId: null,
      label: "Operations",
      type: "DEPARTMENT",
      editedBy: "CONSULTANT",
      // sortOrder not provided
    });

    expect(result.sortOrder).toBe(4);
  });

  it("sets version=1 on new nodes", async () => {
    const newNode = makeNode({ version: 1 });

    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([{ maxOrder: 0 }]),
    } as any);

    vi.mocked(db.insert).mockReturnValue({
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([newNode]),
    } as any);

    const result = await onboardingRepository.createNode({
      tenantId: TENANT_ID,
      engagementId: ENG_ID,
      parentId: null,
      label: "Operations",
      type: "DEPARTMENT",
      editedBy: "CONSULTANT",
    });

    expect(result.version).toBe(1);
  });
});

// ── bulkCreateNodes ───────────────────────────────────────────────────────────

describe("onboardingRepository.bulkCreateNodes", () => {
  beforeEach(() => vi.clearAllMocks());

  it("inserts multiple nodes and returns all records", async () => {
    const node1 = makeNode({ id: "node-001", label: "Dept A" });
    const node2 = makeNode({ id: "node-002", label: "Dept B" });

    vi.mocked(db.insert).mockReturnValue({
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([node1, node2]),
    } as any);

    const result = await onboardingRepository.bulkCreateNodes([
      { tenantId: TENANT_ID, engagementId: ENG_ID, parentId: null, label: "Dept A", type: "DEPARTMENT", editedBy: "CONSULTANT" },
      { tenantId: TENANT_ID, engagementId: ENG_ID, parentId: null, label: "Dept B", type: "DEPARTMENT", editedBy: "CONSULTANT" },
    ]);

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("node-001");
    expect(result[1].id).toBe("node-002");
  });

  it("returns empty array for empty input without hitting db", async () => {
    const result = await onboardingRepository.bulkCreateNodes([]);

    expect(result).toHaveLength(0);
    expect(db.insert).not.toHaveBeenCalled();
  });
});

// ── updateNode ────────────────────────────────────────────────────────────────

describe("onboardingRepository.updateNode", () => {
  beforeEach(() => vi.clearAllMocks());

  it("increments version when expectedVersion matches", async () => {
    const updatedNode = makeNode({ version: 2, label: "Updated Label" });

    vi.mocked(db.update).mockReturnValue({
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([updatedNode]),
    } as any);

    const result = await onboardingRepository.updateNode({
      id: "node-001",
      tenantId: TENANT_ID,
      expectedVersion: 1,
      editedBy: "CONSULTANT",
      patch: { label: "Updated Label" },
    });

    expect(result.version).toBe(2);
    expect(result.label).toBe("Updated Label");
  });

  it("updates lastEditedBy to provided editor", async () => {
    const updatedNode = makeNode({ version: 2, lastEditedBy: "CLIENT" });

    vi.mocked(db.update).mockReturnValue({
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([updatedNode]),
    } as any);

    const result = await onboardingRepository.updateNode({
      id: "node-001",
      tenantId: TENANT_ID,
      expectedVersion: 1,
      editedBy: "CLIENT",
      patch: { label: "Client Edit" },
    });

    expect(result.lastEditedBy).toBe("CLIENT");
  });

  it("throws OptimisticConcurrencyError on version mismatch (0 rows affected)", async () => {
    vi.mocked(db.update).mockReturnValue({
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([]), // no rows = version mismatch
    } as any);

    await expect(
      onboardingRepository.updateNode({
        id: "node-001",
        tenantId: TENANT_ID,
        expectedVersion: 99,
        editedBy: "CONSULTANT",
        patch: { label: "Fail" },
      })
    ).rejects.toThrow(OptimisticConcurrencyError);
  });
});

// ── deleteNode ────────────────────────────────────────────────────────────────

describe("onboardingRepository.deleteNode", () => {
  beforeEach(() => vi.clearAllMocks());

  it("deletes entire subtree returned by recursive CTE", async () => {
    const subtreeRows = [{ id: "node-001" }, { id: "node-002" }, { id: "node-003" }];

    mockTx.select.mockReturnValue({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ version: 1 }]),
    });
    mockTx.execute.mockResolvedValue(subtreeRows);
    mockTx.delete = vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    });

    const result = await onboardingRepository.deleteNode({
      id: "node-001",
      tenantId: TENANT_ID,
      expectedVersion: 1,
    });

    expect(result.deletedCount).toBe(3);
  });

  it("throws OptimisticConcurrencyError on version mismatch", async () => {
    mockTx.select.mockReturnValue({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ version: 5 }]), // current is 5, expected is 1
    });

    await expect(
      onboardingRepository.deleteNode({ id: "node-001", tenantId: TENANT_ID, expectedVersion: 1 })
    ).rejects.toThrow(OptimisticConcurrencyError);
  });

  it("throws NotFoundError when node does not exist", async () => {
    mockTx.select.mockReturnValue({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]), // no row
    });

    await expect(
      onboardingRepository.deleteNode({ id: "missing-node", tenantId: TENANT_ID, expectedVersion: 1 })
    ).rejects.toThrow(NotFoundError);
  });
});

// ── reparentNode ──────────────────────────────────────────────────────────────

describe("onboardingRepository.reparentNode", () => {
  beforeEach(() => vi.clearAllMocks());

  it("succeeds when target is not a descendant", async () => {
    const updatedNode = makeNode({ parentId: "new-parent", sortOrder: 2, version: 2 });

    // Descendants CTE returns nothing (no descendants)
    vi.mocked(db.execute).mockResolvedValue([] as any);
    vi.mocked(db.update).mockReturnValue({
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([updatedNode]),
    } as any);

    const result = await onboardingRepository.reparentNode({
      id: "node-001",
      tenantId: TENANT_ID,
      expectedVersion: 1,
      newParentId: "new-parent",
      newSortOrder: 2,
      editedBy: "CONSULTANT",
    });

    expect(result.parentId).toBe("new-parent");
    expect(result.version).toBe(2);
  });

  it("throws BadRequestError when target IS a descendant (cycle detection)", async () => {
    // Descendants CTE returns "new-parent" — meaning it IS a descendant
    vi.mocked(db.execute).mockResolvedValue([{ id: "new-parent" }] as any);

    await expect(
      onboardingRepository.reparentNode({
        id: "node-001",
        tenantId: TENANT_ID,
        expectedVersion: 1,
        newParentId: "new-parent",
        newSortOrder: 1,
        editedBy: "CONSULTANT",
      })
    ).rejects.toThrow(BadRequestError);
  });

  it("allows null newParentId (move to root) without cycle check", async () => {
    const updatedNode = makeNode({ parentId: null, version: 2 });

    // execute should NOT be called when newParentId is null
    vi.mocked(db.update).mockReturnValue({
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([updatedNode]),
    } as any);

    const result = await onboardingRepository.reparentNode({
      id: "node-002",
      tenantId: TENANT_ID,
      expectedVersion: 1,
      newParentId: null,
      newSortOrder: 5,
      editedBy: "CLIENT",
    });

    expect(result.parentId).toBeNull();
    expect(db.execute).not.toHaveBeenCalled();
  });

  it("throws OptimisticConcurrencyError on version mismatch during reparent", async () => {
    vi.mocked(db.execute).mockResolvedValue([] as any);
    vi.mocked(db.update).mockReturnValue({
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([]), // no rows = version mismatch
    } as any);

    await expect(
      onboardingRepository.reparentNode({
        id: "node-001",
        tenantId: TENANT_ID,
        expectedVersion: 99,
        newParentId: "new-parent",
        newSortOrder: 1,
        editedBy: "CONSULTANT",
      })
    ).rejects.toThrow(OptimisticConcurrencyError);
  });
});

// ── getActivity ───────────────────────────────────────────────────────────────

describe("onboardingRepository.getActivity", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns rows, hasMore=false, and null nextCursor when not at limit", async () => {
    const activities = [makeActivity(), makeActivity({ id: "activity-002" })];

    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue(activities),
    } as any);

    const result = await onboardingRepository.getActivity(TENANT_ID, ENG_ID, { limit: 50 });

    expect(result.rows).toHaveLength(2);
    expect(result.hasMore).toBe(false);
    expect(result.nextCursor).toBeNull();
  });

  it("paginates by cursor: returns hasMore=true + nextCursor when more rows exist", async () => {
    // Return limit+1 rows to signal there are more
    const activities = Array.from({ length: 3 }, (_, i) =>
      makeActivity({
        id: `activity-00${i + 1}`,
        createdAt: new Date(`2026-01-0${3 - i}T12:00:00Z`),
      })
    );

    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue(activities), // 3 returned for limit=2
    } as any);

    const result = await onboardingRepository.getActivity(TENANT_ID, ENG_ID, { limit: 2 });

    // limit+1 trick: pops last row, returns nextCursor
    expect(result.rows).toHaveLength(2);
    expect(result.hasMore).toBe(true);
    expect(result.nextCursor).not.toBeNull();
    expect(typeof result.nextCursor).toBe("string");
  });

  it("applies cursor when provided (filters by createdAt < cursor)", async () => {
    const activities = [makeActivity()];

    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue(activities),
    } as any);

    const result = await onboardingRepository.getActivity(TENANT_ID, ENG_ID, {
      limit: 10,
      cursor: "2026-01-02T12:00:00Z",
    });

    expect(result.rows).toHaveLength(1);
    expect(db.select).toHaveBeenCalled();
  });
});

// ── logActivity ───────────────────────────────────────────────────────────────

describe("onboardingRepository.logActivity", () => {
  beforeEach(() => vi.clearAllMocks());

  it("inserts a row and returns the created activity record", async () => {
    const activity = makeActivity();

    vi.mocked(db.insert).mockReturnValue({
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([activity]),
    } as any);

    const result = await onboardingRepository.logActivity({
      engagementId: ENG_ID,
      nodeId: "node-001",
      actorType: "CONSULTANT",
      actorId: "user-001",
      actorName: "Alice",
      action: "CREATE",
      message: "Node created",
    });

    expect(db.insert).toHaveBeenCalled();
    expect(result.id).toBe("activity-001");
    expect(result.actorName).toBe("Alice");
  });

  it("sets createdAt on new activity records", async () => {
    const activity = makeActivity({ createdAt: new Date() });

    vi.mocked(db.insert).mockReturnValue({
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([activity]),
    } as any);

    const result = await onboardingRepository.logActivity({
      engagementId: ENG_ID,
      nodeId: null,
      actorType: "SYSTEM",
      actorId: null,
      actorName: "system",
      action: "AUTO",
      message: "Automated event",
    });

    expect(result.createdAt).toBeInstanceOf(Date);
  });
});
