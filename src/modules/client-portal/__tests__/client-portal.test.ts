// src/modules/client-portal/__tests__/client-portal.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks FIRST ──────────────────────────────────────────────────────────

vi.mock("../client-portal.repository", () => ({
  clientPortalRepository: {
    findEngagement: vi.fn(),
    findEngagementById: vi.fn(),
    findEngagementByCustomer: vi.fn(),
    listEngagements: vi.fn(),
    createEngagement: vi.fn(),
    updateEngagement: vi.fn(),
    getEngagementDetail: vi.fn(),
    findProposal: vi.fn(),
    findProposalByToken: vi.fn(),
    listProposalsByEngagement: vi.fn(),
    createProposal: vi.fn(),
    updateProposal: vi.fn(),
    listMilestones: vi.fn(),
    createMilestone: vi.fn(),
    updateMilestone: vi.fn(),
    findDeliverable: vi.fn(),
    listDeliverables: vi.fn(),
    createDeliverable: vi.fn(),
    updateDeliverable: vi.fn(),
    findApproval: vi.fn(),
    listApprovals: vi.fn(),
    createApproval: vi.fn(),
    updateApproval: vi.fn(),
    findInvoice: vi.fn(),
    listInvoices: vi.fn(),
    createInvoice: vi.fn(),
    updateInvoice: vi.fn(),
    getProposalWithSections: vi.fn(),
    createMilestoneBulk: vi.fn(),
    createDeliverableBulk: vi.fn(),
    createInvoiceBulk: vi.fn(),
    getNextInvoiceNumber: vi.fn(),
    findRulesBySectionId: vi.fn(),
    createSession: vi.fn(),
    findSessionByToken: vi.fn(),
    findSessionBySessionToken: vi.fn(),
    findCredentialByCustomerId: vi.fn(),
    upsertCredential: vi.fn(),
    findCustomerByEmail: vi.fn(),
  },
}));

vi.mock("@/shared/inngest", () => ({
  inngest: { send: vi.fn() },
}));

vi.mock("@/shared/logger", () => ({
  logger: {
    child: () => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    }),
  },
}));

vi.mock("bcryptjs", () => ({
  hash: vi.fn(async () => "$2a$12$hashedpassword"),
  compare: vi.fn(async () => true),
}));

// ── Imports AFTER mocks ──────────────────────────────────────────────────

import { clientPortalService } from "../client-portal.service";
import { clientPortalRepository } from "../client-portal.repository";
import { inngest } from "@/shared/inngest";
import { NotFoundError, BadRequestError, UnauthorizedError } from "@/shared/errors";

// ── Helpers ──────────────────────────────────────────────────────────────

const TENANT_ID = "00000000-0000-0000-0000-000000000001";
const CUSTOMER_ID = "00000000-0000-0000-0000-000000000002";
const ENGAGEMENT_ID = "00000000-0000-0000-0000-000000000003";
const PROPOSAL_ID = "00000000-0000-0000-0000-000000000004";

function makeCtx(tenantId = TENANT_ID) {
  return {
    tenantId,
    user: { id: "user-1", tenantId },
    db: {},
    session: null,
    requestId: "req-1",
    req: {} as unknown,
    tenantSlug: "test-tenant",
  } as unknown as import("@/shared/trpc").Context;
}

function makePortalCtx(customerId = CUSTOMER_ID) {
  return {
    ...makeCtx(),
    portalCustomerId: customerId,
  } as unknown as import("@/shared/trpc").PortalContext;
}

function makeEngagement(overrides = {}) {
  return {
    id: ENGAGEMENT_ID,
    tenantId: TENANT_ID,
    customerId: CUSTOMER_ID,
    type: "PROJECT" as const,
    status: "ACTIVE" as const,
    title: "AI Chatbot",
    description: null,
    startDate: new Date(),
    endDate: null,
    activeProposalId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeProposal(overrides = {}) {
  return {
    id: PROPOSAL_ID,
    engagementId: ENGAGEMENT_ID,
    status: "SENT" as const,
    scope: "Build a chatbot",
    deliverables: [{ title: "Chatbot", description: "AI chatbot" }],
    price: 480000,
    paymentSchedule: [{ label: "Deposit", amount: 240000, dueType: "ON_APPROVAL" as const }],
    terms: "Standard terms",
    token: "test-token",
    tokenExpiresAt: new Date(Date.now() + 86400000 * 30),
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

// ── Tests ────────────────────────────────────────────────────────────────

describe("clientPortalService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Engagements ────────────────────────────────────────────────────

  describe("createEngagement", () => {
    it("should create an engagement", async () => {
      const expected = makeEngagement({ status: "DRAFT" });
      vi.mocked(clientPortalRepository.createEngagement).mockResolvedValue(expected);

      const result = await clientPortalService.createEngagement(makeCtx(), {
        customerId: CUSTOMER_ID,
        type: "PROJECT",
        title: "AI Chatbot",
      });

      expect(result).toEqual(expected);
      expect(clientPortalRepository.createEngagement).toHaveBeenCalledWith(
        TENANT_ID,
        expect.objectContaining({ customerId: CUSTOMER_ID, title: "AI Chatbot" })
      );
    });
  });

  describe("getEngagement", () => {
    it("should return engagement detail", async () => {
      const detail = {
        ...makeEngagement(),
        proposals: [],
        milestones: [],
        deliverables: [],
        approvals: [],
        invoices: [],
      };
      vi.mocked(clientPortalRepository.getEngagementDetail).mockResolvedValue(detail);

      const result = await clientPortalService.getEngagement(makeCtx(), ENGAGEMENT_ID);
      expect(result.id).toBe(ENGAGEMENT_ID);
    });

    it("should throw NotFoundError for missing engagement", async () => {
      vi.mocked(clientPortalRepository.getEngagementDetail).mockResolvedValue(null);

      await expect(
        clientPortalService.getEngagement(makeCtx(), "missing-id")
      ).rejects.toThrow(NotFoundError);
    });
  });

  // ── Proposals ──────────────────────────────────────────────────────

  describe("sendProposal", () => {
    it("should send a draft proposal and emit event", async () => {
      const proposal = makeProposal({ status: "DRAFT" });
      const engagement = makeEngagement();
      vi.mocked(clientPortalRepository.findProposal).mockResolvedValue(proposal);
      vi.mocked(clientPortalRepository.findEngagement).mockResolvedValue(engagement);
      vi.mocked(clientPortalRepository.updateProposal).mockResolvedValue({
        ...proposal,
        status: "SENT",
        sentAt: new Date(),
      });
      vi.mocked(clientPortalRepository.updateEngagement).mockResolvedValue({
        ...engagement,
        status: "PROPOSED",
      });

      await clientPortalService.sendProposal(makeCtx(), { proposalId: PROPOSAL_ID });

      expect(clientPortalRepository.updateProposal).toHaveBeenCalledWith(
        PROPOSAL_ID,
        expect.objectContaining({ status: "SENT" })
      );
      expect(clientPortalRepository.updateEngagement).toHaveBeenCalledWith(
        TENANT_ID,
        expect.any(String),
        expect.objectContaining({ status: "PROPOSED" })
      );
      expect(inngest.send).toHaveBeenCalledWith(
        expect.objectContaining({ name: "portal/proposal:sent" })
      );
    });

    it("should reject sending an already-sent proposal", async () => {
      vi.mocked(clientPortalRepository.findProposal).mockResolvedValue(
        makeProposal({ status: "SENT" })
      );

      await expect(
        clientPortalService.sendProposal(makeCtx(), { proposalId: PROPOSAL_ID })
      ).rejects.toThrow(BadRequestError);
    });
  });

  // ── Portal: Auth ───────────────────────────────────────────────────

  describe("validateMagicLink", () => {
    it("should validate a valid magic link", async () => {
      vi.mocked(clientPortalRepository.findSessionByToken).mockResolvedValue({
        id: "session-1",
        customerId: CUSTOMER_ID,
        token: "valid-token",
        tokenExpiresAt: new Date(Date.now() + 86400000),
        sessionToken: "session-token",
        sessionExpiresAt: new Date(Date.now() + 86400000 * 30),
        lastAccessedAt: new Date(),
        createdAt: new Date(),
      });

      const result = await clientPortalService.validateMagicLink("valid-token");
      expect(result.customerId).toBe(CUSTOMER_ID);
      expect(result.sessionToken).toBe("session-token");
    });

    it("should reject an expired magic link", async () => {
      vi.mocked(clientPortalRepository.findSessionByToken).mockResolvedValue({
        id: "session-1",
        customerId: CUSTOMER_ID,
        token: "expired-token",
        tokenExpiresAt: new Date(Date.now() - 86400000),
        sessionToken: "session-token",
        sessionExpiresAt: new Date(Date.now() + 86400000 * 30),
        lastAccessedAt: new Date(),
        createdAt: new Date(),
      });

      await expect(
        clientPortalService.validateMagicLink("expired-token")
      ).rejects.toThrow(UnauthorizedError);
    });
  });

  describe("login", () => {
    it("should login with valid credentials", async () => {
      vi.mocked(clientPortalRepository.findCustomerByEmail).mockResolvedValue({
        id: CUSTOMER_ID,
        tenantId: TENANT_ID,
      });
      vi.mocked(clientPortalRepository.findCredentialByCustomerId).mockResolvedValue({
        passwordHash: "$2a$12$hashedpassword",
      });
      // login calls this.createMagicLinkSession which calls createSession
      vi.mocked(clientPortalRepository.createSession).mockResolvedValue({
        id: "session-1",
        customerId: CUSTOMER_ID,
        token: "new-token",
        tokenExpiresAt: new Date(),
        sessionToken: "new-session",
        sessionExpiresAt: new Date(),
        lastAccessedAt: new Date(),
        createdAt: new Date(),
      });

      const result = await clientPortalService.login({
        email: "sarah@bathpodiatry.co.uk",
        password: "securepassword",
      });

      expect(result.sessionToken).toBeDefined();
    });

    it("should reject login with wrong password", async () => {
      const { compare } = await import("bcryptjs");
      vi.mocked(compare).mockResolvedValueOnce(false as never);

      vi.mocked(clientPortalRepository.findCustomerByEmail).mockResolvedValue({
        id: CUSTOMER_ID,
        tenantId: TENANT_ID,
      });
      vi.mocked(clientPortalRepository.findCredentialByCustomerId).mockResolvedValue({
        passwordHash: "$2a$12$hashedpassword",
      });

      await expect(
        clientPortalService.login({ email: "sarah@test.com", password: "wrongpass" })
      ).rejects.toThrow(UnauthorizedError);
    });

    it("should reject login with unknown email", async () => {
      vi.mocked(clientPortalRepository.findCustomerByEmail).mockResolvedValue(null);

      await expect(
        clientPortalService.login({ email: "unknown@example.com", password: "pass" })
      ).rejects.toThrow(UnauthorizedError);
    });
  });

  // ── Portal: Deliverables ───────────────────────────────────────────

  describe("acceptDeliverable", () => {
    it("should accept a delivered deliverable", async () => {
      const deliverable = {
        id: "del-1",
        engagementId: ENGAGEMENT_ID,
        milestoneId: null,
        title: "Brand Audit",
        description: null,
        status: "DELIVERED" as const,
        fileUrl: null,
        fileName: null,
        fileSize: null,
        deliveredAt: new Date(),
        acceptedAt: null,
        sourceProposalItemId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      vi.mocked(clientPortalRepository.findDeliverable).mockResolvedValue(deliverable);
      vi.mocked(clientPortalRepository.findEngagementByCustomer).mockResolvedValue(makeEngagement());
      vi.mocked(clientPortalRepository.updateDeliverable).mockResolvedValue({
        ...deliverable,
        status: "ACCEPTED",
        acceptedAt: new Date(),
      });

      const result = await clientPortalService.acceptDeliverable(makePortalCtx(), {
        deliverableId: "del-1",
      });

      expect(result.status).toBe("ACCEPTED");
    });

    it("should reject accepting a non-delivered deliverable", async () => {
      vi.mocked(clientPortalRepository.findDeliverable).mockResolvedValue({
        id: "del-1",
        engagementId: ENGAGEMENT_ID,
        milestoneId: null,
        title: "Brand Audit",
        description: null,
        status: "PENDING" as const,
        fileUrl: null,
        fileName: null,
        fileSize: null,
        deliveredAt: null,
        acceptedAt: null,
        sourceProposalItemId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(
        clientPortalService.acceptDeliverable(makePortalCtx(), { deliverableId: "del-1" })
      ).rejects.toThrow(BadRequestError);
    });
  });

  // ── Token-based Approve/Decline ──────────────────────────────────

  describe("approveProposalByToken", () => {
    it("should approve a proposal by token and return session", async () => {
      const proposal = makeProposal({ status: "SENT" });
      const engagement = makeEngagement({ status: "PROPOSED" });
      vi.mocked(clientPortalRepository.findProposalByToken).mockResolvedValue(proposal);
      vi.mocked(clientPortalRepository.findEngagementById).mockResolvedValue(engagement);
      vi.mocked(clientPortalRepository.getProposalWithSections).mockResolvedValue({
        ...proposal, sections: [], paymentRules: [],
      });
      vi.mocked(clientPortalRepository.updateProposal).mockResolvedValue({
        ...proposal, status: "APPROVED", approvedAt: new Date(),
      });
      vi.mocked(clientPortalRepository.updateEngagement).mockResolvedValue({
        ...engagement, status: "ACTIVE",
      });
      vi.mocked(clientPortalRepository.createMilestoneBulk).mockResolvedValue([]);
      vi.mocked(clientPortalRepository.createDeliverableBulk).mockResolvedValue([]);
      vi.mocked(clientPortalRepository.createInvoiceBulk).mockResolvedValue([]);
      vi.mocked(clientPortalRepository.getNextInvoiceNumber).mockResolvedValue("INV-2026-0001");
      vi.mocked(clientPortalRepository.createSession).mockResolvedValue({
        id: "session-1", customerId: CUSTOMER_ID, token: "tok",
        tokenExpiresAt: new Date(), sessionToken: "sess-tok",
        sessionExpiresAt: new Date(), lastAccessedAt: new Date(), createdAt: new Date(),
      });

      const result = await clientPortalService.approveProposalByToken("test-token");

      expect(result.proposal.status).toBe("APPROVED");
      expect(result.sessionToken).toBeDefined();
      expect(inngest.send).toHaveBeenCalledWith(
        expect.objectContaining({ name: "portal/proposal:approved" })
      );
    });

    it("should reject expired token", async () => {
      vi.mocked(clientPortalRepository.findProposalByToken).mockResolvedValue(
        makeProposal({ status: "SENT", tokenExpiresAt: new Date(Date.now() - 86400000) })
      );

      await expect(
        clientPortalService.approveProposalByToken("expired-token")
      ).rejects.toThrow(BadRequestError);
    });
  });

  describe("declineProposalByToken", () => {
    it("should decline a proposal by token with feedback", async () => {
      const proposal = makeProposal({ status: "SENT" });
      const engagement = makeEngagement();
      vi.mocked(clientPortalRepository.findProposalByToken).mockResolvedValue(proposal);
      vi.mocked(clientPortalRepository.findEngagementById).mockResolvedValue(engagement);
      vi.mocked(clientPortalRepository.updateProposal).mockResolvedValue({
        ...proposal, status: "DECLINED", declinedAt: new Date(),
      });

      const result = await clientPortalService.declineProposalByToken("test-token", "Too expensive");

      expect(result.status).toBe("DECLINED");
      expect(inngest.send).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "portal/proposal:declined",
          data: expect.objectContaining({ feedback: "Too expensive" }),
        })
      );
    });
  });

  // ── Portal: Approval Response ──────────────────────────────────────

  describe("respondToApproval", () => {
    it("should approve a pending approval and emit event", async () => {
      const approval = {
        id: "apr-1",
        engagementId: ENGAGEMENT_ID,
        deliverableId: null,
        milestoneId: null,
        title: "Logo Concepts",
        description: "Review the 3 options",
        status: "PENDING" as const,
        clientComment: null,
        respondedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      vi.mocked(clientPortalRepository.findApproval).mockResolvedValue(approval);
      vi.mocked(clientPortalRepository.findEngagementByCustomer).mockResolvedValue(makeEngagement());
      vi.mocked(clientPortalRepository.updateApproval).mockResolvedValue({
        ...approval,
        status: "APPROVED",
        respondedAt: new Date(),
      });

      const result = await clientPortalService.respondToApproval(makePortalCtx(), {
        approvalId: "apr-1",
        approved: true,
        comment: "Looks great",
      });

      expect(result.status).toBe("APPROVED");
      expect(inngest.send).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "portal/approval:responded",
          data: expect.objectContaining({ approved: true }),
        })
      );
    });
  });
});
