"use client";

import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { PortalSidebar } from "@/components/portal/portal-sidebar";
import { PortalEngagementProvider } from "@/components/portal/portal-engagement-context";
import { api } from "@/lib/trpc/react";
import type { EngagementRecord } from "@/modules/client-portal/client-portal.types";

export default function PortalDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [selectedId, setSelectedId] = useState<string>(() => searchParams.get("engagement") ?? "");

  const { data: engagements, isLoading: engagementsLoading } =
    api.clientPortal.portal.listMyEngagements.useQuery();

  // Auto-select first engagement when loaded and no selection in URL
  useEffect(() => {
    if (!selectedId && engagements && engagements.length > 0) {
      const firstId = engagements[0].id;
      setSelectedId(firstId);
      const params = new URLSearchParams(searchParams.toString());
      params.set("engagement", firstId);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }
  }, [engagements, selectedId]);

  function handleEngagementChange(id: string) {
    setSelectedId(id);
    const params = new URLSearchParams(searchParams.toString());
    params.set("engagement", id);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  const engagementId = selectedId;

  const { data: dashboardData } = api.clientPortal.portal.getDashboard.useQuery(
    { engagementId },
    { enabled: !!engagementId, staleTime: 30_000 }
  );

  const engagement = dashboardData?.engagement ?? null;
  const customerName = dashboardData?.customerName ?? "Client";
  const customerEmail = dashboardData?.customerEmail ?? "";
  const pendingApprovals = dashboardData?.pendingApprovals?.filter((a) => a.status === "PENDING").length ?? 0;
  const pendingInvoices = dashboardData?.pendingInvoices?.filter((i) => i.status === "SENT" || i.status === "OVERDUE").length ?? 0;
  const pendingDeliverables = dashboardData?.deliverables?.filter((d: { status: string }) => d.status === "DELIVERED").length ?? 0;

  const allEngagements = (engagements ?? []) as EngagementRecord[];

  const contextValue = useMemo(
    () => ({
      engagement,
      engagementId,
      allEngagements,
      isLoading: engagementsLoading,
      setEngagementId: handleEngagementChange,
    }),
    [engagement, engagementId, allEngagements, engagementsLoading]
  );

  // Customer info from dashboard data
  const customerInitials = customerName !== "Client"
    ? customerName.split(" ").map((n: string) => n.charAt(0).toUpperCase()).join("").slice(0, 2)
    : "C";

  return (
    <PortalEngagementProvider value={contextValue}>
      <div className="flex min-h-screen" style={{ background: "var(--portal-bg)" }}>
        <PortalSidebar
          engagementTitle={engagement?.title ?? "Client Portal"}
          customerName={customerName}
          customerInitials={customerInitials}
          pendingDeliverables={pendingDeliverables}
          pendingApprovals={pendingApprovals}
          pendingInvoices={pendingInvoices}
          allEngagements={allEngagements}
          selectedEngagementId={engagementId}
          onEngagementChange={handleEngagementChange}
        />
        <main className="min-h-screen flex-1 md:ml-[260px]">
          {children}
        </main>
      </div>
    </PortalEngagementProvider>
  );
}
