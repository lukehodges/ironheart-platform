"use client";

import { use, useState } from "react";
import { api } from "@/lib/trpc/react";
import { toast } from "sonner";
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
      // Set the portal session cookie so the client can access the dashboard
      document.cookie = `portal_session=${data.sessionToken}; path=/; max-age=${30 * 24 * 60 * 60}; samesite=lax`;
      setSessionToken(data.sessionToken);
      setShowConfirm(false);
      refetch();
    },
    onError: (error) => {
      setShowConfirm(false);
      toast.error(error.message || "Failed to approve proposal");
    },
  });

  const declineMutation = api.clientPortal.portal.declineProposal.useMutation({
    onSuccess: () => refetch(),
    onError: (error) => {
      toast.error(error.message || "Failed to decline proposal");
    },
  });

  const magicLinkMutation = api.clientPortal.portal.requestMagicLink.useMutation();

  function handleApproveConfirm() {
    approveMutation.mutate({ token });
  }

  function handleDeclineFeedback(feedback: string) {
    declineMutation.mutate({ token, feedback });
  }

  async function handleRequestNewLink(email: string) {
    await magicLinkMutation.mutateAsync({ email });
  }

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
    // Check new relational paymentRules first, fall back to legacy JSONB
    const depositRule = proposal.paymentRules?.find((r) => r.trigger === "ON_APPROVAL");
    const depositAmount = depositRule?.amount ?? proposal.paymentSchedule?.find((p) => p.dueType === "ON_APPROVAL")?.amount;
    const depositInvoice = depositRule
      ? proposal.depositInvoices?.find((i) => i.sourcePaymentRuleId === depositRule.id)
      : undefined;
    return (
      <ProposalLayout>
        <ProposalApproved
          customerName={proposal.customerName ?? "Client"}
          engagementTitle={proposal.engagement.title}
          depositAmount={depositAmount}
          sessionToken={sessionToken ?? undefined}
          depositInvoiceId={depositInvoice?.id}
        />
      </ProposalLayout>
    );
  }

  // Declined
  if (proposal.status === "DECLINED") {
    return (
      <ProposalLayout>
        <ProposalDeclined
          customerName={proposal.customerName ?? "Client"}
          proposalToken={token}
          onSubmitFeedback={handleDeclineFeedback}
        />
      </ProposalLayout>
    );
  }

  // Draft — show preview with disabled actions
  if (proposal.status === "DRAFT") {
    return (
      <ProposalLayout statusPill="Draft Preview" statusVariant="gray">
        <ProposalView
          proposal={proposal}
          customerName={proposal.customerName ?? "Client"}
          onApprove={() => {}}
          onDecline={() => {}}
          disabled
        />
      </ProposalLayout>
    );
  }

  // SENT — show full proposal
  return (
    <ProposalLayout statusPill="Awaiting Approval" statusVariant="amber">
      <ProposalView
        proposal={proposal}
        customerName={proposal.customerName ?? "Client"}
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
