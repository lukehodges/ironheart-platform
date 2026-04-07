"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  LayoutGrid,
  FileText,
  CreditCard,
  CheckCircle2,
  Lock,
  ChevronDown,
  LogOut,
} from "lucide-react";
import type { EngagementRecord } from "@/modules/client-portal/client-portal.types";

interface PortalSidebarProps {
  engagementTitle: string;
  customerName: string;
  customerInitials: string;
  pendingDeliverables?: number;
  pendingInvoices?: number;
  pendingApprovals?: number;
  hasPassword?: boolean;
  allEngagements?: EngagementRecord[];
  selectedEngagementId?: string;
  onEngagementChange?: (id: string) => void;
}

const navItems = [
  { href: "/portal/dashboard", label: "Dashboard", icon: LayoutGrid },
  { href: "/portal/deliverables", label: "Deliverables", icon: FileText, badgeKey: "pendingDeliverables" as const },
  { href: "/portal/invoices", label: "Invoices", icon: CreditCard, badgeKey: "pendingInvoices" as const },
  { href: "/portal/approvals", label: "Approvals", icon: CheckCircle2, badgeKey: "pendingApprovals" as const },
];

export function PortalSidebar({
  engagementTitle,
  customerName,
  customerInitials,
  pendingDeliverables = 0,
  pendingInvoices = 0,
  pendingApprovals = 0,
  hasPassword = false,
  allEngagements = [],
  selectedEngagementId,
  onEngagementChange,
}: PortalSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [showPicker, setShowPicker] = useState(false);

  async function handleLogout() {
    await fetch("/api/portal/logout", { method: "POST" });
    router.push("/portal/login");
  }

  const badges: Record<string, number> = {
    pendingDeliverables,
    pendingInvoices,
    pendingApprovals,
  };

  const hasMultiple = allEngagements.length > 1;

  return (
    <aside
      className="fixed inset-y-0 left-0 z-50 hidden w-[260px] flex-col md:flex"
      style={{ background: "var(--portal-text)", color: "#E8E6E1" }}
    >
      {/* Brand + Engagement Switcher */}
      <div
        className="px-6 pt-7 pb-6"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}
      >
        <div
          className="mb-2 text-[10px] font-medium uppercase tracking-[1.5px]"
          style={{ color: "rgba(255,255,255,0.35)" }}
        >
          Client Portal
        </div>
        {hasMultiple ? (
          <div className="relative">
            <button
              onClick={() => setShowPicker(!showPicker)}
              className="flex w-full items-center gap-2 text-left font-[var(--font-heading)] text-lg leading-tight text-white transition-colors hover:text-white/80"
              style={{ background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "inherit" }}
            >
              <span className="min-w-0 flex-1 truncate">{engagementTitle}</span>
              <ChevronDown
                className="h-4 w-4 shrink-0 transition-transform"
                style={{
                  color: "rgba(255,255,255,0.5)",
                  transform: showPicker ? "rotate(180deg)" : "rotate(0deg)",
                }}
              />
            </button>
            {showPicker && (
              <div
                className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-lg border"
                style={{
                  background: "#2a2a2a",
                  borderColor: "rgba(255,255,255,0.1)",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
                }}
              >
                {allEngagements.map((eng) => (
                  <button
                    key={eng.id}
                    onClick={() => {
                      onEngagementChange?.(eng.id);
                      setShowPicker(false);
                    }}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm transition-colors"
                    style={{
                      background: eng.id === selectedEngagementId ? "rgba(255,255,255,0.08)" : "transparent",
                      color: eng.id === selectedEngagementId ? "#fff" : "rgba(255,255,255,0.6)",
                      border: "none",
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{
                        background: eng.status === "ACTIVE" ? "var(--portal-accent)" : "rgba(255,255,255,0.25)",
                      }}
                    />
                    <span className="min-w-0 flex-1 truncate">{eng.title}</span>
                    <span
                      className="shrink-0 text-[11px]"
                      style={{ color: "rgba(255,255,255,0.3)" }}
                    >
                      {eng.status}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="font-[var(--font-heading)] text-lg leading-tight text-white">
            {engagementTitle}
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex flex-1 flex-col gap-0.5 p-3">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const badge = item.badgeKey ? badges[item.badgeKey] : 0;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all"
              style={{
                color: isActive ? "#fff" : "rgba(255,255,255,0.55)",
                background: isActive ? "rgba(255,255,255,0.1)" : "transparent",
              }}
            >
              <item.icon
                className="h-[18px] w-[18px] shrink-0"
                style={{ opacity: isActive ? 1 : 0.7 }}
              />
              {item.label}
              {badge > 0 && (
                <span
                  className="ml-auto rounded-full px-1.5 text-[11px] font-semibold leading-[18px] text-white"
                  style={{ background: "var(--portal-accent)" }}
                >
                  {badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div
        className="p-3"
        style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}
      >
        <div className="flex items-center gap-2.5 rounded-lg px-3 py-2">
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold text-white"
            style={{ background: "var(--portal-accent)" }}
          >
            {customerInitials}
          </div>
          <div className="min-w-0 flex-1">
            <div
              className="truncate text-[13px] font-medium"
              style={{ color: "rgba(255,255,255,0.85)" }}
            >
              {customerName}
            </div>
            <div className="text-[11px]" style={{ color: "rgba(255,255,255,0.4)" }}>
              Client
            </div>
          </div>
        </div>
        {!hasPassword && (
          <Link
            href="/portal/set-password"
            className="mt-1 flex items-center gap-2 rounded-md px-3 py-2 text-xs transition-colors"
            style={{ color: "rgba(255,255,255,0.4)" }}
          >
            <Lock className="h-3 w-3" />
            Set Password
          </Link>
        )}
        <button
          onClick={handleLogout}
          className="mt-1 flex w-full items-center gap-2 rounded-md px-3 py-2 text-xs transition-colors hover:text-white/60"
          style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.4)", fontFamily: "inherit" }}
        >
          <LogOut className="h-3 w-3" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
