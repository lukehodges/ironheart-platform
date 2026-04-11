"use client";

import { api } from "@/lib/trpc/react";
import { usePortalEngagement } from "@/components/portal/portal-engagement-context";
import { PortalDashboardContent } from "@/components/portal/portal-dashboard-content";

export default function PortalDashboardPage() {
  const { engagementId, isLoading: contextLoading } = usePortalEngagement();

  const { data, isLoading, error } = api.clientPortal.portal.getDashboard.useQuery(
    { engagementId },
    { enabled: !!engagementId, staleTime: 30_000 }
  );

  if (!engagementId) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h2 className="font-[var(--font-heading)] text-xl" style={{ color: "var(--portal-text)" }}>
            Welcome to your portal
          </h2>
          <p className="mt-2 text-sm" style={{ color: "var(--portal-text-muted)" }}>
            {contextLoading ? "Loading your engagements..." : "No active engagements found."}
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-10">
        <div className="mb-6 h-8 w-64 animate-pulse rounded-lg" style={{ background: "var(--portal-border-light)" }} />
        <div className="mb-8 grid grid-cols-3 gap-3.5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-[10px]" style={{ background: "var(--portal-border-light)" }} />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-5">
          <div className="h-64 animate-pulse rounded-[10px]" style={{ background: "var(--portal-border-light)" }} />
          <div className="h-64 animate-pulse rounded-[10px]" style={{ background: "var(--portal-border-light)" }} />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm" style={{ color: "var(--portal-red)" }}>
          {error?.message ?? "Failed to load dashboard"}
        </p>
      </div>
    );
  }

  return <PortalDashboardContent data={data} />;
}
