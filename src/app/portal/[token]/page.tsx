"use client";

import { use, useState, useCallback } from "react";
import { api } from "@/lib/trpc/react";
import { ProposalLayout } from "@/components/portal/proposal/proposal-layout";
import { ProposalView } from "@/components/portal/proposal/proposal-view";
import { ProposalApproved } from "@/components/portal/proposal/proposal-approved";
import { ProposalDeclined } from "@/components/portal/proposal/proposal-declined";
import { ProposalExpired } from "@/components/portal/proposal/proposal-expired";
import { ProposalConfirmModal } from "@/components/portal/proposal/proposal-confirm-modal";

export default function ProposalPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const [showConfirm, setShowConfirm] = useState(false);
  const [sessionToken, setSessionToken] = useState<string | null>(null);

  const { data: proposal, isLoading, isError, refetch } = api.clientPortal.portal.getProposal.useQuery(
    { token },
    { retry: false, refetchOnWindowFocus: false }
  );

  const approveMutation = api.clientPortal.portal.approveProposal.useMutation({
    onSuccess: (data) => {
      setSessionToken(data.sessionToken);
      setShowConfirm(false);
      refetch();
    },
  });

  const declineMutation = api.clientPortal.portal.declineProposal.useMutation({
    onSuccess: () => refetch(),
  });

  const magicLinkMutation = api.clientPortal.portal.requestMagicLink.useMutation();

  const handleApproveConfirm = useCallback(() => {
    approveMutation.mutate({ token });
  }, [approveMutation, token]);

  const handleDeclineFeedback = useCallback((feedback: string) => {
    declineMutation.mutate({ token, feedback });
  }, [declineMutation, token]);

  const handleRequestNewLink = useCallback(async (email: string) => {
    await magicLinkMutation.mutateAsync({ email });
  }, [magicLinkMutation]);

  // Loading
  if (isLoading) {
    return (
      <ProposalLayout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <p className="text-[14px]" style={{ color: "var(--text-3)" }}>Loading proposal...</p>
        </div>
      </ProposalLayout>
    );
  }

  // Not found
  if (isError || !proposal) {
    return (
      <ProposalLayout>
        <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
          <h1 className="mb-2 font-[var(--font-heading)] text-[24px]" style={{ color: "var(--text-1)" }}>
            Proposal not found
          </h1>
          <p className="text-[14px]" style={{ color: "var(--text-3)" }}>
            This link may be invalid. Please contact Luke for a new one.
          </p>
        </div>
      </ProposalLayout>
    );
  }

  // Check if token expired (for SENT proposals only)
  const isExpired = proposal.status === "SENT" && new Date(proposal.tokenExpiresAt) < new Date();

  // Expired
  if (isExpired) {
    return (
      <ProposalLayout>
        <ProposalExpired onRequestNewLink={handleRequestNewLink} />
      </ProposalLayout>
    );
  }

  // Approved
  if (proposal.status === "APPROVED") {
    const depositItem = proposal.paymentSchedule?.find(
      (p) => p.dueType === "ON_APPROVAL"
    );
    return (
      <ProposalLayout>
        <ProposalApproved
          customerName="Client"
          engagementTitle={proposal.engagement.title}
          depositAmount={depositItem?.amount}
          sessionToken={sessionToken ?? undefined}
        />
      </ProposalLayout>
    );
  }

  // Declined
  if (proposal.status === "DECLINED") {
    return (
      <ProposalLayout>
        <ProposalDeclined
          customerName="Client"
          proposalToken={token}
          onSubmitFeedback={handleDeclineFeedback}
        />
      </ProposalLayout>
    );
  }

  // Draft (not yet sent)
  if (proposal.status === "DRAFT") {
    return (
      <ProposalLayout>
        <div className="flex min-h-[60vh] items-center justify-center text-center">
          <p className="text-[14px]" style={{ color: "var(--text-3)" }}>
            This proposal hasn&apos;t been sent yet.
          </p>
        </div>
      </ProposalLayout>
    );
  }

  // SENT — show full proposal
  return (
    <ProposalLayout statusPill="Awaiting Approval" statusVariant="amber">
      <ProposalView
        proposal={proposal}
        customerName="Client"
        onApprove={() => setShowConfirm(true)}
        onDecline={() => declineMutation.mutate({ token })}
      />

      {showConfirm && (
        <ProposalConfirmModal
          engagementTitle={proposal.engagement.title}
          isLoading={approveMutation.isPending}
          onConfirm={handleApproveConfirm}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </ProposalLayout>
  );
}
