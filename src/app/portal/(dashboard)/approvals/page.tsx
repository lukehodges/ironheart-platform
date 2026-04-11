"use client";

import { useState } from "react";
import { api } from "@/lib/trpc/react";
import { toast } from "sonner";
import { Check, X } from "lucide-react";
import { usePortalEngagement } from "@/components/portal/portal-engagement-context";
import type { ApprovalRequestRecord } from "@/modules/client-portal/client-portal.types";

function formatDate(d: Date | string | null) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function relativeTime(d: Date | string) {
  const now = new Date();
  const date = new Date(d);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(d);
}

export default function PortalApprovalsPage() {
  const { engagementId } = usePortalEngagement();
  const [comments, setComments] = useState<Record<string, string>>({});

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
        <p className="text-sm" style={{ color: "var(--portal-text-muted)" }}>No engagement selected.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-10">
        <div className="mb-6 h-8 w-48 animate-pulse rounded-lg" style={{ background: "var(--portal-border-light)" }} />
        {[1, 2].map((i) => (
          <div key={i} className="mb-3 h-32 animate-pulse rounded-[10px]" style={{ background: "var(--portal-border-light)" }} />
        ))}
      </div>
    );
  }

  const items = (approvals ?? []) as ApprovalRequestRecord[];
  const pending = items.filter((a) => a.status === "PENDING");
  const past = items.filter((a) => a.status !== "PENDING");

  return (
    <div>
      {/* Topbar */}
      <div
        className="sticky top-0 z-40 border-b px-10 py-5"
        style={{ borderColor: "var(--portal-border)", background: "var(--portal-surface)" }}
      >
        <h1 className="font-[var(--font-heading)] text-[22px] font-normal" style={{ color: "var(--portal-text)" }}>
          Approvals
        </h1>
        <div className="mt-0.5 text-[13px]" style={{ color: "var(--portal-text-secondary)" }}>
          Review and sign off on project deliverables and milestones
        </div>
      </div>

      <div className="p-10 pb-16" style={{ maxWidth: 900 }}>
        {/* Pending section */}
        <div className="mb-3.5 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--portal-text-muted)" }}>
          Pending Your Approval
          {pending.length > 0 && (
            <span className="rounded-full px-1.5 text-[11px] font-bold leading-[18px]" style={{ background: "var(--portal-amber-light)", color: "var(--portal-amber)" }}>
              {pending.length}
            </span>
          )}
        </div>

        {pending.length === 0 ? (
          <div className="mb-8 rounded-[10px] border border-dashed p-6 text-center" style={{ borderColor: "var(--portal-border)", background: "var(--portal-warm)" }}>
            <p className="text-[13px]" style={{ color: "var(--portal-text-muted)" }}>No approvals waiting for your review</p>
          </div>
        ) : (
          pending.map((approval) => (
            <div
              key={approval.id}
              className="mb-3.5 overflow-hidden rounded-[10px] border transition-all hover:shadow-md"
              style={{
                background: "var(--portal-surface)",
                borderColor: "var(--portal-border)",
                boxShadow: "var(--portal-shadow)",
                borderLeftWidth: 3,
                borderLeftColor: "var(--portal-amber)",
              }}
            >
              <div className="p-5">
                {/* Header */}
                <div className="mb-3 flex items-start justify-between gap-4">
                  <div>
                    <div className="text-base font-semibold" style={{ color: "var(--portal-text)" }}>{approval.title}</div>
                  </div>
                  <span
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold"
                    style={{ background: "var(--portal-amber-light)", color: "var(--portal-amber)" }}
                  >
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ background: "var(--portal-amber)" }} />
                    Awaiting Review
                  </span>
                </div>

                {/* Description */}
                <p className="mb-4 text-[13px] leading-relaxed" style={{ color: "var(--portal-text-secondary)" }}>
                  {approval.description}
                </p>

                {/* Comment */}
                <div className="mb-4">
                  <label className="mb-1.5 block text-xs font-semibold" style={{ color: "var(--portal-text-secondary)" }}>
                    Add a comment (optional)
                  </label>
                  <textarea
                    value={comments[approval.id] ?? ""}
                    onChange={(e) => setComments((prev) => ({ ...prev, [approval.id]: e.target.value }))}
                    placeholder="Share any feedback or concerns..."
                    className="w-full resize-y rounded-lg border p-2.5 text-[13px] outline-none transition-all focus:shadow-[0_0_0_3px_var(--portal-accent-light)]"
                    style={{
                      borderColor: "var(--portal-border)",
                      color: "var(--portal-text)",
                      background: "var(--portal-surface)",
                      minHeight: 60,
                      fontFamily: "inherit",
                    }}
                  />
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2.5">
                  <button
                    onClick={() => respondMutation.mutate({
                      approvalId: approval.id,
                      approved: true,
                      comment: comments[approval.id] || undefined,
                    })}
                    disabled={respondMutation.isPending}
                    className="inline-flex items-center gap-1.5 rounded-[7px] px-4 py-2 text-[13px] font-semibold text-white transition-colors"
                    style={{ background: "var(--portal-accent)" }}
                  >
                    <Check className="h-[15px] w-[15px]" />
                    Approve
                  </button>
                  <button
                    onClick={() => respondMutation.mutate({
                      approvalId: approval.id,
                      approved: false,
                      comment: comments[approval.id] || undefined,
                    })}
                    disabled={respondMutation.isPending}
                    className="inline-flex items-center gap-1.5 rounded-[7px] border px-4 py-2 text-[13px] font-semibold transition-colors"
                    style={{ color: "var(--portal-red)", borderColor: "var(--portal-red-light)" }}
                  >
                    <X className="h-[15px] w-[15px]" />
                    Request Changes
                  </button>
                  <span className="ml-auto text-xs" style={{ color: "var(--portal-text-muted)" }}>
                    Submitted {relativeTime(approval.createdAt)}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}

        {/* Divider */}
        {past.length > 0 && (
          <>
            <hr className="my-9 border-0" style={{ borderTop: "1px solid var(--portal-border-light)" }} />

            <div className="mb-3.5 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--portal-text-muted)" }}>
              Past Approvals
              <span className="rounded-full px-1.5 text-[11px] font-bold leading-[18px]" style={{ background: "var(--portal-warm)", color: "var(--portal-text-muted)" }}>
                {past.length}
              </span>
            </div>

            {past.map((approval) => (
              <div
                key={approval.id}
                className="mb-2.5 flex items-center gap-3.5 rounded-[10px] border p-4"
                style={{ background: "var(--portal-surface)", borderColor: "var(--portal-border)", boxShadow: "var(--portal-shadow)" }}
              >
                <div
                  className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-lg"
                  style={{
                    background: approval.status === "APPROVED" ? "var(--portal-accent-light)" : "var(--portal-red-light)",
                    color: approval.status === "APPROVED" ? "var(--portal-accent)" : "var(--portal-red)",
                  }}
                >
                  {approval.status === "APPROVED" ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold" style={{ color: "var(--portal-text)" }}>{approval.title}</div>
                  {approval.clientComment && (
                    <div className="mt-0.5 truncate text-xs" style={{ color: "var(--portal-text-muted)" }}>{approval.clientComment}</div>
                  )}
                </div>
                <div className="shrink-0 text-right">
                  <span
                    className="inline-flex items-center gap-1 rounded px-2.5 py-0.5 text-xs font-semibold"
                    style={{
                      background: approval.status === "APPROVED" ? "var(--portal-accent-light)" : "var(--portal-red-light)",
                      color: approval.status === "APPROVED" ? "var(--portal-accent)" : "var(--portal-red)",
                    }}
                  >
                    {approval.status === "APPROVED" ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                    {approval.status === "APPROVED" ? "Approved" : "Changes Requested"}
                  </span>
                  {approval.respondedAt && (
                    <div className="mt-1 text-[11px]" style={{ color: "var(--portal-text-muted)" }}>{formatDate(approval.respondedAt)}</div>
                  )}
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
