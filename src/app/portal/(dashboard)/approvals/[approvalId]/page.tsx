"use client";

import { use, useState } from "react";
import { api } from "@/lib/trpc/react";
import { toast } from "sonner";
import { Check, X, ChevronLeft, Calendar, FileText } from "lucide-react";
import { usePortalEngagement } from "@/components/portal/portal-engagement-context";
import type { ApprovalRequestRecord } from "@/modules/client-portal/client-portal.types";

function formatDate(d: Date | string | null) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(d: Date | string) {
  return new Date(d).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ApprovalDetailPage({
  params,
}: {
  params: Promise<{ approvalId: string }>;
}) {
  const { approvalId } = use(params);
  const { engagementId } = usePortalEngagement();
  const [comment, setComment] = useState("");

  const { data: approvals, isLoading, refetch } = api.clientPortal.portal.listApprovals.useQuery(
    { engagementId },
    { enabled: !!engagementId }
  );

  const respondMutation = api.clientPortal.portal.respondToApproval.useMutation({
    onSuccess: (_, vars) => {
      toast.success(vars.approved ? "Approved" : "Changes requested");
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  if (!engagementId) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm" style={{ color: "var(--portal-text-muted)" }}>
          No engagement selected.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-10">
        <div className="mb-6 h-8 w-48 animate-pulse rounded-lg" style={{ background: "var(--portal-border-light)" }} />
        <div className="h-64 animate-pulse rounded-[10px]" style={{ background: "var(--portal-border-light)" }} />
      </div>
    );
  }

  const approval = (approvals ?? []).find(
    (a): a is ApprovalRequestRecord => a.id === approvalId
  );

  if (!approval) {
    return (
      <div>
        <div
          className="sticky top-0 z-40 border-b px-10 py-5"
          style={{ borderColor: "var(--portal-border)", background: "var(--portal-surface)" }}
        >
          <h1
            className="font-[var(--font-heading)] text-[22px] font-normal"
            style={{ color: "var(--portal-text)" }}
          >
            Approval Request
          </h1>
        </div>
        <div className="p-10">
          <a
            href="/portal/approvals"
            className="mb-6 inline-flex items-center gap-1.5 text-[13px] font-medium transition-colors hover:text-[var(--portal-accent)]"
            style={{ color: "var(--portal-text-muted)" }}
          >
            <ChevronLeft size={15} />
            Back to Approvals
          </a>
          <p className="mt-4 text-sm" style={{ color: "var(--portal-text-muted)" }}>
            Approval request not found.
          </p>
        </div>
      </div>
    );
  }

  const isPending = approval.status === "PENDING";

  return (
    <div>
      {/* Topbar */}
      <div
        className="sticky top-0 z-40 border-b px-10 py-5"
        style={{ borderColor: "var(--portal-border)", background: "var(--portal-surface)" }}
      >
        <h1
          className="font-[var(--font-heading)] text-[22px] font-normal"
          style={{ color: "var(--portal-text)" }}
        >
          Approval Request
        </h1>
        {approval.milestoneId && (
          <div className="mt-0.5 text-[13px]" style={{ color: "var(--portal-text-secondary)" }}>
            Linked to milestone
          </div>
        )}
      </div>

      <div className="p-10 pb-16" style={{ maxWidth: 900 }}>
        {/* Back link */}
        <a
          href="/portal/approvals"
          className="mb-6 inline-flex items-center gap-1.5 text-[13px] font-medium transition-colors"
          style={{ color: "var(--portal-text-muted)" }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--portal-accent)")}
          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--portal-text-muted)")}
        >
          <ChevronLeft size={15} />
          Back to Approvals
        </a>

        {/* Header */}
        <div className="mb-7">
          <div className="mb-1.5 flex items-start justify-between gap-4">
            <h2
              className="font-[var(--font-heading)] text-[26px] font-normal leading-tight"
              style={{ color: "var(--portal-text)" }}
            >
              {approval.title}
            </h2>
            <span
              className="inline-flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1 text-xs font-semibold"
              style={
                isPending
                  ? { background: "var(--portal-amber-light)", color: "var(--portal-amber)" }
                  : approval.status === "APPROVED"
                    ? { background: "var(--portal-accent-light)", color: "var(--portal-accent)" }
                    : { background: "var(--portal-red-light)", color: "var(--portal-red)" }
              }
            >
              {isPending && (
                <span
                  className="h-1.5 w-1.5 animate-pulse rounded-full"
                  style={{ background: "var(--portal-amber)" }}
                />
              )}
              {isPending
                ? "Awaiting Review"
                : approval.status === "APPROVED"
                  ? "Approved"
                  : "Changes Requested"}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-[13px]" style={{ color: "var(--portal-text-muted)" }}>
            <span className="flex items-center gap-1.5">
              <Calendar size={14} />
              Submitted {formatDateTime(approval.createdAt)}
            </span>
            {approval.milestoneId && (
              <span className="flex items-center gap-1.5">
                <FileText size={14} />
                Linked to milestone
              </span>
            )}
            {approval.respondedAt && !isPending && (
              <span className="flex items-center gap-1.5">
                <Check size={14} />
                Responded {formatDate(approval.respondedAt)}
              </span>
            )}
          </div>
        </div>

        {/* Description / context card */}
        {approval.description && (
          <div
            className="mb-6 overflow-hidden rounded-[10px] border"
            style={{
              background: "var(--portal-surface)",
              borderColor: "var(--portal-border)",
              boxShadow: "var(--portal-shadow)",
            }}
          >
            <div
              className="flex items-center gap-2.5 border-b px-[22px] py-[18px]"
              style={{ borderColor: "var(--portal-border-light)" }}
            >
              <div
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white"
                style={{ background: "var(--portal-accent)" }}
              >
                {/* Initials placeholder */}
                <FileText size={13} />
              </div>
              <h3 className="text-[15px] font-semibold" style={{ color: "var(--portal-text)" }}>
                What to review
              </h3>
            </div>
            <div className="px-[22px] py-[22px]">
              <p
                className="text-[14px] leading-[1.7]"
                style={{ color: "var(--portal-text-secondary)" }}
              >
                {approval.description}
              </p>

              {/* "What to consider" amber checklist */}
              <div
                className="mt-4 rounded-lg px-[18px] py-4"
                style={{ background: "var(--portal-warm)" }}
              >
                <div
                  className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.8px]"
                  style={{ color: "var(--portal-text-muted)" }}
                >
                  What to consider
                </div>
                <div className="flex flex-col gap-1.5">
                  {[
                    "Does this meet the agreed scope and acceptance criteria?",
                    "Are you happy to proceed to the next stage based on this?",
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-2 text-[13px]" style={{ color: "var(--portal-text-secondary)" }}>
                      <svg className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "var(--portal-accent)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Linked deliverable */}
        {approval.deliverableId && (
          <div className="mb-7">
            <div
              className="mb-3.5 text-[11px] font-semibold uppercase tracking-[1.2px]"
              style={{ color: "var(--portal-text-muted)" }}
            >
              Linked Deliverable
            </div>
            <a
              href={`/portal/deliverables/${approval.deliverableId}`}
              className="flex items-center gap-3.5 rounded-[10px] border p-[18px] transition-all"
              style={{
                background: "var(--portal-surface)",
                borderColor: "var(--portal-border)",
                boxShadow: "var(--portal-shadow)",
                color: "inherit",
                textDecoration: "none",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 12px rgba(0,0,0,0.05), 0 1px 3px rgba(0,0,0,0.03)";
                (e.currentTarget as HTMLElement).style.borderColor = "#D5D2CC";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.boxShadow = "var(--portal-shadow)";
                (e.currentTarget as HTMLElement).style.borderColor = "var(--portal-border)";
              }}
            >
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg"
                style={{ background: "var(--portal-blue-light)" }}
              >
                <FileText size={20} style={{ color: "var(--portal-blue)" }} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[14px] font-semibold" style={{ color: "var(--portal-text)" }}>
                  View linked deliverable
                </div>
                <div className="text-[12px]" style={{ color: "var(--portal-text-muted)" }}>
                  Click to view deliverable details
                </div>
              </div>
              <ChevronLeft
                size={16}
                className="rotate-180"
                style={{ color: "var(--portal-text-muted)" }}
              />
            </a>
          </div>
        )}

        {/* Responded comment */}
        {!isPending && approval.clientComment && (
          <div
            className="mb-6 rounded-[10px] border p-5"
            style={{
              background: "var(--portal-surface)",
              borderColor: "var(--portal-border)",
              boxShadow: "var(--portal-shadow)",
            }}
          >
            <div className="mb-1.5 text-[12px] font-semibold uppercase tracking-[0.8px]" style={{ color: "var(--portal-text-muted)" }}>
              Your comment
            </div>
            <p className="text-[14px] leading-relaxed" style={{ color: "var(--portal-text-secondary)" }}>
              {approval.clientComment}
            </p>
          </div>
        )}

        {/* Comment + actions (only for pending) */}
        {isPending && (
          <>
            <div
              className="mb-6 rounded-[10px] border p-[22px]"
              style={{
                background: "var(--portal-surface)",
                borderColor: "var(--portal-border)",
                boxShadow: "var(--portal-shadow)",
              }}
            >
              <label
                htmlFor="approval-comment"
                className="mb-2 block text-[13px] font-semibold"
                style={{ color: "var(--portal-text)" }}
              >
                Add a comment (optional)
              </label>
              <textarea
                id="approval-comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Share any feedback, preference, or concerns..."
                className="w-full resize-y rounded-lg border p-2.5 text-[13px] outline-none transition-all focus:shadow-[0_0_0_3px_var(--portal-accent-light)]"
                style={{
                  borderColor: "var(--portal-border)",
                  color: "var(--portal-text)",
                  background: "var(--portal-bg, var(--portal-warm))",
                  minHeight: 80,
                  fontFamily: "inherit",
                }}
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() =>
                  respondMutation.mutate({
                    approvalId: approval.id,
                    approved: true,
                    comment: comment || undefined,
                  })
                }
                disabled={respondMutation.isPending}
                className="inline-flex items-center gap-1.5 rounded-[7px] px-6 py-[11px] text-[14px] font-semibold text-white transition-colors disabled:pointer-events-none disabled:opacity-50"
                style={{ background: "var(--portal-accent)" }}
              >
                <Check size={16} />
                Approve
              </button>
              <button
                onClick={() =>
                  respondMutation.mutate({
                    approvalId: approval.id,
                    approved: false,
                    comment: comment || undefined,
                  })
                }
                disabled={respondMutation.isPending}
                className="inline-flex items-center gap-1.5 rounded-[7px] border px-6 py-[11px] text-[14px] font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50"
                style={{ color: "var(--portal-red)", borderColor: "var(--portal-red-light)" }}
              >
                <X size={16} />
                Request Changes
              </button>
              <span className="ml-auto text-[12px]" style={{ color: "var(--portal-text-muted)" }}>
                Submitted {formatDateTime(approval.createdAt)}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
