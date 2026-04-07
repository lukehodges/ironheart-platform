import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../client-portal.repository", () => ({
  clientPortalRepository: {
    findProposalByToken: vi.fn(),
    findEngagementById: vi.fn(),
    getProposalWithSections: vi.fn(),
    updateProposal: vi.fn(),
    updateEngagement: vi.fn(),
    createMilestoneBulk: vi.fn(),
    createDeliverableBulk: vi.fn(),
    createInvoiceBulk: vi.fn(),
    getNextInvoiceNumber: vi.fn(),
    createSession: vi.fn(),
    listSections: vi.fn(),
    updateMilestone: vi.fn(),
    findEngagement: vi.fn(),
    findRulesBySectionId: vi.fn(),
    updateInvoice: vi.fn(),
  },
}));
vi.mock("@/shared/inngest", () => ({ inngest: { send: vi.fn() } }));
vi.mock("@/shared/logger", () => ({
  logger: { child: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }) },
}));
vi.mock("bcryptjs", () => ({ hash: vi.fn(), compare: vi.fn() }));

import { clientPortalService } from "../client-portal.service";
import { clientPortalRepository } from "../client-portal.repository";
import { inngest } from "@/shared/inngest";

function makeProposal(overrides = {}) {
  return {
    id: "proposal-1",
    engagementId: "eng-1",
    status: "SENT" as const,
    scope: "<p>Scope</p>",
    deliverables: [],
    price: 0,
    paymentSchedule: [],
    terms: null,
    token: "tok-123",
    tokenExpiresAt: new Date(Date.now() + 86400000),
    version: 1,
    revisionOf: null,
    problemStatement: null,
    exclusions: [],
    requirements: [],
    roiData: null,
    sentAt: new Date(),
    approvedAt: null,
    declinedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeEngagement(overrides = {}) {
  return {
    id: "eng-1",
    tenantId: "tenant-1",
    customerId: "cust-1",
    type: "PROJECT" as const,
    status: "PROPOSED" as const,
    title: "Test Engagement",
    description: null,
    startDate: null,
    endDate: null,
    activeProposalId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("materializeProposal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates milestones from PHASE sections and deliverables from items", async () => {
    const proposal = makeProposal();
    const engagement = makeEngagement();

    vi.mocked(clientPortalRepository.findProposalByToken).mockResolvedValue(proposal);
    vi.mocked(clientPortalRepository.findEngagementById).mockResolvedValue(engagement);
    vi.mocked(clientPortalRepository.getProposalWithSections).mockResolvedValue({
      ...proposal,
      sections: [
        {
          id: "sec-1",
          proposalId: "proposal-1",
          title: "Discovery",
          description: null,
          type: "PHASE" as const,
          sortOrder: 0,
          estimatedDuration: "2 weeks",
          createdAt: new Date(),
          updatedAt: new Date(),
          items: [
            {
              id: "item-1",
              sectionId: "sec-1",
              proposalId: "proposal-1",
              title: "Brand Audit",
              description: "Full brand audit",
              acceptanceCriteria: null,
              sortOrder: 0,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ],
        },
      ],
      paymentRules: [
        {
          id: "rule-1",
          proposalId: "proposal-1",
          tenantId: "tenant-1",
          sectionId: "sec-1",
          label: "Discovery payment",
          amount: 500000,
          trigger: "ON_APPROVAL" as const,
          recurringInterval: null,
          relativeDays: null,
          fixedDate: null,
          autoSend: false,
          sortOrder: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    });

    vi.mocked(clientPortalRepository.updateProposal).mockResolvedValue({
      ...proposal,
      status: "APPROVED",
      approvedAt: new Date(),
    });
    vi.mocked(clientPortalRepository.updateEngagement).mockResolvedValue({
      ...engagement,
      status: "ACTIVE",
      activeProposalId: "proposal-1",
    });
    vi.mocked(clientPortalRepository.createMilestoneBulk).mockResolvedValue([
      {
        id: "ms-1",
        engagementId: "eng-1",
        title: "Discovery",
        description: null,
        status: "UPCOMING",
        sortOrder: 0,
        dueDate: null,
        completedAt: null,
        sourceSectionId: "sec-1",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
    vi.mocked(clientPortalRepository.createDeliverableBulk).mockResolvedValue([]);
    vi.mocked(clientPortalRepository.createInvoiceBulk).mockResolvedValue([]);
    vi.mocked(clientPortalRepository.getNextInvoiceNumber).mockResolvedValue("INV-2026-0001");
    vi.mocked(clientPortalRepository.createSession).mockResolvedValue({
      id: "sess-1",
      customerId: "cust-1",
      token: "tok",
      tokenExpiresAt: new Date(),
      sessionToken: "sess-tok",
      sessionExpiresAt: new Date(),
      lastAccessedAt: new Date(),
      createdAt: new Date(),
    });

    const result = await clientPortalService.approveProposalByToken("tok-123");

    expect(clientPortalRepository.createMilestoneBulk).toHaveBeenCalledWith([
      expect.objectContaining({
        engagementId: "eng-1",
        title: "Discovery",
        sourceSectionId: "sec-1",
      }),
    ]);
    expect(clientPortalRepository.createDeliverableBulk).toHaveBeenCalled();
    expect(clientPortalRepository.createInvoiceBulk).toHaveBeenCalledWith([
      expect.objectContaining({
        engagementId: "eng-1",
        amount: 500000,
        sourcePaymentRuleId: "rule-1",
      }),
    ]);
    expect(result.sessionToken).toBeDefined();
  });

  it("skips MILESTONE_COMPLETE and RECURRING payment rules during materialization", async () => {
    const proposal = makeProposal();
    const engagement = makeEngagement();

    vi.mocked(clientPortalRepository.findProposalByToken).mockResolvedValue(proposal);
    vi.mocked(clientPortalRepository.findEngagementById).mockResolvedValue(engagement);
    vi.mocked(clientPortalRepository.getProposalWithSections).mockResolvedValue({
      ...proposal,
      sections: [],
      paymentRules: [
        {
          id: "rule-ms",
          proposalId: "proposal-1",
          tenantId: "tenant-1",
          sectionId: null,
          label: "Milestone payment",
          amount: 500000,
          trigger: "MILESTONE_COMPLETE" as const,
          recurringInterval: null,
          relativeDays: null,
          fixedDate: null,
          autoSend: false,
          sortOrder: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "rule-rec",
          proposalId: "proposal-1",
          tenantId: "tenant-1",
          sectionId: null,
          label: "Monthly retainer",
          amount: 200000,
          trigger: "RECURRING" as const,
          recurringInterval: "MONTHLY" as const,
          relativeDays: null,
          fixedDate: null,
          autoSend: false,
          sortOrder: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    });

    vi.mocked(clientPortalRepository.updateProposal).mockResolvedValue({ ...proposal, status: "APPROVED", approvedAt: new Date() });
    vi.mocked(clientPortalRepository.updateEngagement).mockResolvedValue({ ...engagement, status: "ACTIVE", activeProposalId: "proposal-1" });
    vi.mocked(clientPortalRepository.createMilestoneBulk).mockResolvedValue([]);
    vi.mocked(clientPortalRepository.createDeliverableBulk).mockResolvedValue([]);
    vi.mocked(clientPortalRepository.createInvoiceBulk).mockResolvedValue([]);
    vi.mocked(clientPortalRepository.getNextInvoiceNumber).mockResolvedValue("INV-2026-0001");
    vi.mocked(clientPortalRepository.createSession).mockResolvedValue({
      id: "sess-1", customerId: "cust-1", token: "tok", tokenExpiresAt: new Date(),
      sessionToken: "sess-tok", sessionExpiresAt: new Date(), lastAccessedAt: new Date(), createdAt: new Date(),
    });

    await clientPortalService.approveProposalByToken("tok-123");

    // Should create zero invoices — both rules are deferred
    expect(clientPortalRepository.createInvoiceBulk).toHaveBeenCalledWith([]);
  });
});

describe("updateMilestone with invoice generation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("generates invoice when milestone with MILESTONE_COMPLETE payment rule is completed", async () => {
    const milestone = {
      id: "ms-1",
      engagementId: "eng-1",
      title: "Discovery",
      description: null,
      status: "IN_PROGRESS" as const,
      sortOrder: 0,
      dueDate: null,
      completedAt: null,
      sourceSectionId: "sec-1",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const engagement = makeEngagement();
    const rule = {
      id: "rule-1",
      proposalId: "proposal-1",
      tenantId: "tenant-1",
      sectionId: "sec-1",
      label: "Discovery payment",
      amount: 500000,
      trigger: "MILESTONE_COMPLETE" as const,
      recurringInterval: null,
      relativeDays: 14,
      fixedDate: null,
      autoSend: false,
      sortOrder: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    vi.mocked(clientPortalRepository.updateMilestone).mockResolvedValue({
      ...milestone,
      status: "COMPLETED",
      completedAt: new Date(),
    });
    vi.mocked(clientPortalRepository.findEngagement).mockResolvedValue(engagement);
    vi.mocked(clientPortalRepository.findRulesBySectionId).mockResolvedValue([rule]);
    vi.mocked(clientPortalRepository.getNextInvoiceNumber).mockResolvedValue("INV-2026-0001");
    vi.mocked(clientPortalRepository.createInvoiceBulk).mockResolvedValue([]);
    vi.mocked(inngest.send).mockResolvedValue(undefined as any);

    const ctx = { tenantId: "tenant-1", user: { id: "user-1", tenantId: "tenant-1" } } as any;

    await clientPortalService.updateMilestone(ctx, {
      id: "ms-1",
      status: "COMPLETED",
    });

    expect(clientPortalRepository.findRulesBySectionId).toHaveBeenCalledWith("sec-1");
    expect(clientPortalRepository.createInvoiceBulk).toHaveBeenCalledWith([
      expect.objectContaining({
        engagementId: "eng-1",
        amount: 500000,
        sourcePaymentRuleId: "rule-1",
      }),
    ]);
  });
});
