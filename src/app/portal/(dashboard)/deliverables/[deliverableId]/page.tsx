"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/trpc/react";
import { usePortalEngagement } from "@/components/portal/portal-engagement-context";
import { toast } from "sonner";
import { ChevronLeft, Check, X, Download, FileText, Send, Clock, Activity } from "lucide-react";
import type { DeliverableRecord } from "@/modules/client-portal/client-portal.types";

function formatDate(d: Date | string | null) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function formatFileSize(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function daysAgo(d: Date | string): string {
  const days = Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

const statusConfig: Record<string, { label: string; bg: string; color: string }> = {
  ACCEPTED: { label: "Accepted", bg: "var(--portal-accent-light)", color: "var(--portal-accent)" },
  DELIVERED: { label: "Needs Acceptance", bg: "var(--portal-blue-light)", color: "var(--portal-blue)" },
  PENDING: { label: "Pending", bg: "var(--portal-warm)", color: "var(--portal-text-muted)" },
};

export default function DeliverableDetailPage() {
  const params = useParams();
  const deliverableId = params.deliverableId as string;
  const { engagementId } = usePortalEngagement();

  const [showChangesForm, setShowChangesForm] = useState(false);
  const [changesComment, setChangesComment] = useState("");

  const { data: deliverables, isLoading, refetch } = api.clientPortal.portal.listDeliverables.useQuery(
    { engagementId },
    { enabled: !!engagementId }
  );

  const acceptMutation = api.clientPortal.portal.acceptDeliverable.useMutation({
    onSuccess: () => {
      toast.success("Deliverable accepted");
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
        <div className="mb-6 h-5 w-40 animate-pulse rounded" style={{ background: "var(--portal-border-light)" }} />
        <div className="mb-4 h-8 w-72 animate-pulse rounded-lg" style={{ background: "var(--portal-border-light)" }} />
        <div className="mb-6 h-4 w-96 animate-pulse rounded" style={{ background: "var(--portal-border-light)" }} />
        <div className="grid grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-[10px]" style={{ background: "var(--portal-border-light)" }} />
          ))}
        </div>
      </div>
    );
  }

  const items = (deliverables ?? []) as DeliverableRecord[];
  const deliverable = items.find((d) => d.id === deliverableId);

  if (!deliverable) {
    return (
      <div className="p-10">
        <Link
          href="/portal/deliverables"
          className="mb-6 inline-flex items-center gap-1 text-[13px] font-medium transition-colors hover:opacity-80"
          style={{ color: "var(--portal-text-secondary)" }}
        >
          <ChevronLeft className="h-[15px] w-[15px]" />
          Back to Deliverables
        </Link>
        <div
          className="rounded-[10px] border border-dashed p-8 text-center"
          style={{ borderColor: "var(--portal-border)", background: "var(--portal-warm)" }}
        >
          <p className="text-[13px] font-semibold" style={{ color: "var(--portal-text-secondary)" }}>
            Deliverable not found
          </p>
        </div>
      </div>
    );
  }

  const sc = statusConfig[deliverable.status] ?? statusConfig.PENDING;

  return (
    <div>
      {/* Topbar */}
      <div
        className="sticky top-0 z-40 border-b px-10 py-5"
        style={{ borderColor: "var(--portal-border)", background: "var(--portal-surface)" }}
      >
        <Link
          href="/portal/deliverables"
          className="mb-3 inline-flex items-center gap-1 text-[13px] font-medium transition-colors hover:opacity-80"
          style={{ color: "var(--portal-text-secondary)" }}
        >
          <ChevronLeft className="h-[15px] w-[15px]" />
          Back to Deliverables
        </Link>

        {/* Title + status */}
        <div className="flex items-center justify-between gap-4">
          <h1
            className="font-[var(--font-heading)] text-[26px] font-normal"
            style={{ color: "var(--portal-text)" }}
          >
            {deliverable.title}
          </h1>
          <span
            className="inline-flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1 text-xs font-semibold"
            style={{ background: sc.bg, color: sc.color }}
          >
            {deliverable.status === "ACCEPTED" && <Check className="h-[13px] w-[13px]" />}
            {sc.label}
          </span>
        </div>

        {/* Milestone info */}
        {deliverable.milestoneId && (
          <div className="mt-1 text-[13px]" style={{ color: "var(--portal-text-muted)" }}>
            Part of a project milestone
          </div>
        )}

        {/* Description */}
        {deliverable.description && (
          <div className="mt-2 text-[14px] leading-relaxed" style={{ color: "var(--portal-text-secondary)" }}>
            {deliverable.description}
          </div>
        )}
      </div>

      <div className="p-10 pb-16" style={{ maxWidth: 900 }}>
        {/* Info cards */}
        <div className="mb-6 grid grid-cols-2 gap-4">
          {/* Delivered date card */}
          <div
            className="rounded-[10px] border p-5"
            style={{ background: "var(--portal-surface)", borderColor: "var(--portal-border)", boxShadow: "var(--portal-shadow)" }}
          >
            <div className="mb-1 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wider" style={{ color: "var(--portal-text-muted)" }}>
              <Clock className="h-[14px] w-[14px]" />
              Delivered
            </div>
            <div className="text-[15px] font-semibold" style={{ color: "var(--portal-text)" }}>
              {deliverable.deliveredAt ? formatDate(deliverable.deliveredAt) : "Not yet delivered"}
            </div>
            {deliverable.milestoneId && (
              <div className="mt-1 text-[12px]" style={{ color: "var(--portal-text-muted)" }}>
                Part of Milestone
              </div>
            )}
          </div>

          {/* Status card */}
          <div
            className="rounded-[10px] border p-5"
            style={{ background: "var(--portal-surface)", borderColor: "var(--portal-border)", boxShadow: "var(--portal-shadow)" }}
          >
            <div className="mb-1 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wider" style={{ color: "var(--portal-text-muted)" }}>
              <Activity className="h-[14px] w-[14px]" />
              Status
            </div>
            <div className="text-[15px] font-semibold" style={{ color: sc.color }}>
              {sc.label}
            </div>
            {deliverable.deliveredAt && (
              <div className="mt-1 text-[12px]" style={{ color: "var(--portal-text-muted)" }}>
                Delivered {daysAgo(deliverable.deliveredAt)}
              </div>
            )}
          </div>
        </div>

        {/* File card */}
        {deliverable.fileName && (
          <div className="mb-6">
            <div className="mb-2 text-[12px] font-semibold uppercase tracking-wider" style={{ color: "var(--portal-text-muted)" }}>
              Attached File
            </div>
            <div
              className="flex items-center gap-4 rounded-[10px] border p-5"
              style={{ background: "var(--portal-surface)", borderColor: "var(--portal-border)", boxShadow: "var(--portal-shadow)" }}
            >
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[8px]"
                style={{ background: "rgba(239, 68, 68, 0.08)", color: "#ef4444" }}
              >
                <FileText className="h-[22px] w-[22px]" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[14px] font-semibold" style={{ color: "var(--portal-text)" }}>
                  {deliverable.fileName}
                </div>
                <div className="text-[12px]" style={{ color: "var(--portal-text-muted)" }}>
                  {deliverable.fileSize ? formatFileSize(deliverable.fileSize) : ""}
                  {deliverable.deliveredAt && (
                    <>{deliverable.fileSize ? " \u00B7 " : ""}Uploaded {formatDate(deliverable.deliveredAt)}</>
                  )}
                </div>
              </div>
              {deliverable.fileUrl ? (
                <a
                  href={deliverable.fileUrl}
                  download
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-[7px] border px-4 py-2 text-[13px] font-semibold transition-colors hover:opacity-80"
                  style={{ borderColor: "var(--portal-border)", color: "var(--portal-text-secondary)" }}
                >
                  <Download className="h-[15px] w-[15px]" />
                  Download
                </a>
              ) : (
                <button
                  onClick={() => alert("File download not available yet.")}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-[7px] border px-4 py-2 text-[13px] font-semibold transition-colors hover:opacity-80"
                  style={{ borderColor: "var(--portal-border)", color: "var(--portal-text-muted)" }}
                >
                  <Download className="h-[15px] w-[15px]" />
                  Download
                </button>
              )}
            </div>
          </div>
        )}

        {/* Notes section */}
        <div className="mb-6">
          <div className="mb-2 text-[12px] font-semibold uppercase tracking-wider" style={{ color: "var(--portal-text-muted)" }}>
            Notes
          </div>
          <div
            className="rounded-[10px] border p-5"
            style={{ background: "var(--portal-warm)", borderColor: "var(--portal-border)" }}
          >
            <div className="flex items-start gap-3">
              <div
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[12px] font-bold text-white"
                style={{ background: "var(--portal-accent)" }}
              >
                LH
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-semibold" style={{ color: "var(--portal-text)" }}>
                    Luke Hodges
                  </span>
                  <span className="text-[12px]" style={{ color: "var(--portal-text-muted)" }}>
                    {deliverable.deliveredAt ? formatDate(deliverable.deliveredAt) : formatDate(deliverable.createdAt)}
                  </span>
                </div>
                <p className="mt-1 text-[13px] leading-relaxed" style={{ color: "var(--portal-text-secondary)" }}>
                  Deliverable shared with you for review. Please check the attached file and accept when ready.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Action bar - only for DELIVERED status */}
        {deliverable.status === "DELIVERED" && (
          <div
            className="rounded-[10px] border p-5"
            style={{ background: "var(--portal-surface)", borderColor: "var(--portal-border)", boxShadow: "var(--portal-shadow)" }}
          >
            <div className="flex items-center justify-between gap-4">
              <div className="text-[14px] font-medium" style={{ color: "var(--portal-text-secondary)" }}>
                Ready to accept this deliverable?
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => acceptMutation.mutate({ deliverableId })}
                  disabled={acceptMutation.isPending}
                  className="inline-flex items-center gap-1.5 rounded-[7px] px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:opacity-90"
                  style={{ background: "var(--portal-accent)" }}
                >
                  <Check className="h-[15px] w-[15px]" />
                  {acceptMutation.isPending ? "Accepting..." : "Accept Deliverable"}
                </button>
                <button
                  onClick={() => setShowChangesForm((prev) => !prev)}
                  className="inline-flex items-center gap-1.5 rounded-[7px] border px-4 py-2 text-[13px] font-semibold transition-colors hover:opacity-80"
                  style={{ borderColor: "var(--portal-border)", color: "var(--portal-text-secondary)" }}
                >
                  <X className="h-[15px] w-[15px]" />
                  Request Changes
                </button>
              </div>
            </div>

            {/* Request changes form */}
            {showChangesForm && (
              <div className="mt-4 border-t pt-4" style={{ borderColor: "var(--portal-border)" }}>
                <label className="mb-1.5 block text-[13px] font-semibold" style={{ color: "var(--portal-text)" }}>
                  What changes are needed?
                </label>
                <textarea
                  value={changesComment}
                  onChange={(e) => setChangesComment(e.target.value)}
                  placeholder="Describe the changes you'd like to see..."
                  rows={4}
                  className="mb-3 w-full resize-none rounded-[7px] border px-3 py-2 text-[13px] outline-none transition-colors focus:ring-1"
                  style={{
                    borderColor: "var(--portal-border)",
                    background: "var(--portal-surface)",
                    color: "var(--portal-text)",
                  }}
                />
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      if (!changesComment.trim()) {
                        toast.error("Please describe the changes needed");
                        return;
                      }
                      alert("Change request submitted (placeholder). Backend endpoint coming soon.");
                      setChangesComment("");
                      setShowChangesForm(false);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-[7px] px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:opacity-90"
                    style={{ background: "var(--portal-blue)" }}
                  >
                    <Send className="h-[15px] w-[15px]" />
                    Submit Change Request
                  </button>
                  <button
                    onClick={() => {
                      setShowChangesForm(false);
                      setChangesComment("");
                    }}
                    className="inline-flex items-center gap-1.5 rounded-[7px] border px-4 py-2 text-[13px] font-semibold transition-colors hover:opacity-80"
                    style={{ borderColor: "var(--portal-border)", color: "var(--portal-text-muted)" }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
