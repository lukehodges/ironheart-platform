"use client";

import { useRouter } from "next/navigation";
import { api } from "@/lib/trpc/react";
import { toast } from "sonner";
import { Check, Download, Calendar, FileText, Clock, Layers } from "lucide-react";
import { usePortalEngagement } from "@/components/portal/portal-engagement-context";
import type { DeliverableRecord, MilestoneRecord, MilestoneStatus } from "@/modules/client-portal/client-portal.types";

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

const statusConfig: Record<string, { label: string; bg: string; color: string; borderColor?: string }> = {
  ACCEPTED: { label: "Accepted", bg: "var(--portal-accent-light)", color: "var(--portal-accent)" },
  DELIVERED: { label: "Needs Acceptance", bg: "var(--portal-blue-light)", color: "var(--portal-blue)", borderColor: "var(--portal-blue)" },
  PENDING: { label: "Pending", bg: "var(--portal-warm)", color: "var(--portal-text-muted)" },
};

const milestoneStatusConfig: Record<MilestoneStatus, { label: string; bg: string; color: string }> = {
  UPCOMING: { label: "Upcoming", bg: "var(--portal-warm)", color: "var(--portal-text-muted)" },
  IN_PROGRESS: { label: "In Progress", bg: "var(--portal-blue-light)", color: "var(--portal-blue)" },
  COMPLETED: { label: "Completed", bg: "var(--portal-accent-light)", color: "var(--portal-accent)" },
};

function DeliverableCard({
  d,
  onAccept,
  isAccepting,
}: {
  d: DeliverableRecord;
  onAccept: (id: string) => void;
  isAccepting: boolean;
}) {
  const router = useRouter();
  const sc = statusConfig[d.status] ?? statusConfig.PENDING;

  return (
    <div
      className="mb-2.5 rounded-[10px] border p-5 transition-all hover:shadow-md"
      onClick={() => router.push(`/portal/deliverables/${d.id}`)}
      style={{
        cursor: "pointer",
        background: "var(--portal-surface)",
        borderColor: "var(--portal-border)",
        boxShadow: "var(--portal-shadow)",
        borderLeftWidth: d.status === "DELIVERED" ? 3 : 1,
        borderLeftColor: d.status === "DELIVERED" ? "var(--portal-blue)" : undefined,
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="mb-1 text-[15px] font-semibold" style={{ color: "var(--portal-text)" }}>{d.title}</div>
          {d.description && (
            <div className="mb-2 text-[13px] leading-relaxed" style={{ color: "var(--portal-text-secondary)" }}>{d.description}</div>
          )}
          <div className="flex items-center gap-4 text-xs" style={{ color: "var(--portal-text-muted)" }}>
            {d.deliveredAt && (
              <span className="flex items-center gap-1">
                <Calendar className="h-[13px] w-[13px]" />
                Delivered {formatDate(d.deliveredAt)}
              </span>
            )}
            {!d.deliveredAt && d.status === "PENDING" && (
              <span className="flex items-center gap-1">
                <Clock className="h-[13px] w-[13px]" />
                Pending
              </span>
            )}
            {d.fileName && (
              <span className="flex items-center gap-1">
                <FileText className="h-[13px] w-[13px]" />
                {d.fileName}{d.fileSize ? `, ${formatFileSize(d.fileSize)}` : ""}
              </span>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span
            className="inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-semibold"
            style={{ background: sc.bg, color: sc.color }}
          >
            {d.status === "ACCEPTED" && <Check className="h-[13px] w-[13px]" />}
            {sc.label}
          </span>
          {d.status === "DELIVERED" && (
            <button
              onClick={(e) => { e.stopPropagation(); onAccept(d.id); }}
              disabled={isAccepting}
              className="inline-flex items-center gap-1.5 rounded-[7px] px-3.5 py-1.5 text-[13px] font-semibold text-white transition-colors"
              style={{ background: "var(--portal-accent)" }}
            >
              <Check className="h-[15px] w-[15px]" />
              Accept
            </button>
          )}
          {d.status === "ACCEPTED" && d.fileUrl && (
            <a
              href={d.fileUrl}
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1.5 rounded-[7px] border px-3.5 py-1.5 text-[13px] font-semibold transition-colors"
              style={{ borderColor: "var(--portal-border)", color: "var(--portal-text-secondary)" }}
            >
              <Download className="h-[15px] w-[15px]" />
              Download
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyDeliverables() {
  return (
    <div
      className="rounded-[10px] border border-dashed p-6 text-center"
      style={{ borderColor: "var(--portal-border)", background: "var(--portal-warm)" }}
    >
      <p className="text-[13px]" style={{ color: "var(--portal-text-muted)" }}>No deliverables in this milestone yet.</p>
    </div>
  );
}

function MilestoneSection({
  milestone,
  deliverables,
  onAccept,
  isAccepting,
}: {
  milestone: MilestoneRecord;
  deliverables: DeliverableRecord[];
  onAccept: (id: string) => void;
  isAccepting: boolean;
}) {
  const msc = milestoneStatusConfig[milestone.status];

  return (
    <div className="mb-8">
      {/* Milestone header */}
      <div className="mb-3 flex items-center gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2.5">
            <span className="text-[16px] font-semibold" style={{ color: "var(--portal-text)" }}>
              {milestone.title}
            </span>
            <span
              className="inline-flex items-center rounded-md px-2.5 py-0.5 text-[11px] font-semibold"
              style={{ background: msc.bg, color: msc.color }}
            >
              {msc.label}
            </span>
          </div>
          {milestone.dueDate && (
            <div className="mt-0.5 flex items-center gap-1 text-[12px]" style={{ color: "var(--portal-text-muted)" }}>
              <Calendar className="h-[12px] w-[12px]" />
              Due {formatDate(milestone.dueDate)}
            </div>
          )}
        </div>
        <div className="text-[12px]" style={{ color: "var(--portal-text-muted)" }}>
          {deliverables.length} {deliverables.length === 1 ? "deliverable" : "deliverables"}
        </div>
      </div>

      {/* Deliverables or empty state */}
      {deliverables.length === 0 ? (
        <EmptyDeliverables />
      ) : (
        deliverables.map((d) => (
          <DeliverableCard key={d.id} d={d} onAccept={onAccept} isAccepting={isAccepting} />
        ))
      )}
    </div>
  );
}

export default function PortalDeliverablesPage() {
  const { engagementId } = usePortalEngagement();

  const { data: deliverables, isLoading: isLoadingDeliverables, refetch } = api.clientPortal.portal.listDeliverables.useQuery(
    { engagementId },
    { enabled: !!engagementId }
  );

  const { data: dashboard, isLoading: isLoadingDashboard } = api.clientPortal.portal.getDashboard.useQuery(
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

  const handleAccept = (deliverableId: string) => {
    acceptMutation.mutate({ deliverableId });
  };

  if (!engagementId) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm" style={{ color: "var(--portal-text-muted)" }}>No engagement selected.</p>
      </div>
    );
  }

  const isLoading = isLoadingDeliverables || isLoadingDashboard;

  if (isLoading) {
    return (
      <div className="p-10">
        <div className="mb-6 h-8 w-48 animate-pulse rounded-lg" style={{ background: "var(--portal-border-light)" }} />
        {[1, 2, 3].map((i) => (
          <div key={i} className="mb-3 h-24 animate-pulse rounded-[10px]" style={{ background: "var(--portal-border-light)" }} />
        ))}
      </div>
    );
  }

  const items = (deliverables ?? []) as DeliverableRecord[];
  const milestones = (dashboard?.milestones ?? []) as MilestoneRecord[];
  const delivered = items.filter((d) => d.status === "DELIVERED" || d.status === "ACCEPTED").length;

  // Group deliverables by milestoneId
  const grouped = items.reduce<Record<string, DeliverableRecord[]>>((acc, d) => {
    const key = d.milestoneId ?? "__ungrouped__";
    if (!acc[key]) acc[key] = [];
    acc[key].push(d);
    return acc;
  }, {});

  const ungrouped = grouped["__ungrouped__"] ?? [];
  const hasMilestones = milestones.length > 0;

  return (
    <div>
      {/* Topbar */}
      <div
        className="sticky top-0 z-40 border-b px-10 py-5"
        style={{ borderColor: "var(--portal-border)", background: "var(--portal-surface)" }}
      >
        <h1 className="font-[var(--font-heading)] text-[22px] font-normal" style={{ color: "var(--portal-text)" }}>
          Deliverables
        </h1>
        <div className="mt-0.5 text-[13px]" style={{ color: "var(--portal-text-secondary)" }}>
          {delivered} of {items.length} delivered
        </div>
      </div>

      <div className="p-10 pb-16" style={{ maxWidth: 900 }}>
        {/* Empty state — no deliverables at all and no milestones */}
        {items.length === 0 && !hasMilestones && (
          <div
            className="rounded-[10px] border border-dashed p-8 text-center"
            style={{ borderColor: "var(--portal-border)", background: "var(--portal-warm)" }}
          >
            <div
              className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-[10px] border"
              style={{ background: "var(--portal-surface)", borderColor: "var(--portal-border)", color: "var(--portal-text-muted)" }}
            >
              <Clock className="h-[18px] w-[18px]" />
            </div>
            <p className="text-[13px] font-semibold" style={{ color: "var(--portal-text-secondary)" }}>No deliverables yet</p>
            <p className="text-[13px]" style={{ color: "var(--portal-text-muted)" }}>Deliverables will appear here as your project progresses.</p>
          </div>
        )}

        {/* Milestone sections */}
        {hasMilestones && milestones.map((milestone) => (
          <MilestoneSection
            key={milestone.id}
            milestone={milestone}
            deliverables={grouped[milestone.id] ?? []}
            onAccept={handleAccept}
            isAccepting={acceptMutation.isPending}
          />
        ))}

        {/* Ungrouped / Other section — only shown alongside milestones */}
        {hasMilestones && ungrouped.length > 0 && (
          <div className="mb-8">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex items-center gap-2.5">
                <Layers className="h-[15px] w-[15px]" style={{ color: "var(--portal-text-muted)" }} />
                <span className="text-[16px] font-semibold" style={{ color: "var(--portal-text)" }}>
                  Other
                </span>
              </div>
              <div className="text-[12px]" style={{ color: "var(--portal-text-muted)" }}>
                {ungrouped.length} {ungrouped.length === 1 ? "deliverable" : "deliverables"}
              </div>
            </div>
            {ungrouped.map((d) => (
              <DeliverableCard key={d.id} d={d} onAccept={handleAccept} isAccepting={acceptMutation.isPending} />
            ))}
          </div>
        )}

        {/* Fallback: no milestones — render flat list (all items are ungrouped) */}
        {!hasMilestones && items.length > 0 && items.map((d) => (
          <DeliverableCard key={d.id} d={d} onAccept={handleAccept} isAccepting={acceptMutation.isPending} />
        ))}
      </div>
    </div>
  );
}
