"use client";

interface ProposalLayoutProps {
  children: React.ReactNode;
  /** Status pill text, e.g. "Awaiting Approval". Omit to hide pill. */
  statusPill?: string;
  /** Status pill color variant */
  statusVariant?: "amber" | "green" | "gray";
}

export function ProposalLayout({
  children,
  statusPill,
  statusVariant = "amber",
}: ProposalLayoutProps) {
  const pillColors = {
    amber: {
      bg: "var(--amber-dim)",
      border: "var(--amber-border)",
      text: "var(--amber)",
      dot: "var(--amber)",
    },
    green: {
      bg: "var(--green-dim)",
      border: "var(--green-border)",
      text: "var(--green)",
      dot: "var(--green)",
    },
    gray: {
      bg: "rgba(0,0,0,0.03)",
      border: "rgba(0,0,0,0.08)",
      text: "var(--text-3)",
      dot: "var(--text-4)",
    },
  };

  const pill = pillColors[statusVariant];

  return (
    <div className="relative">
      {/* Grain texture overlay */}
      <div
        className="pointer-events-none fixed inset-0 z-[999]"
        style={{
          opacity: 0.3,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Sticky topbar */}
      <div
        className="sticky top-0 z-50"
        style={{
          background: "rgba(250,249,247,0.85)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderBottom: "1px solid var(--border-light)",
        }}
      >
        <div className="mx-auto flex max-w-[720px] items-center justify-between px-6 py-4">
          {/* Brand mark */}
          <div className="flex items-center gap-2.5">
            <div
              className="flex h-7 w-7 items-center justify-center rounded-md text-xs font-semibold text-white"
              style={{
                background: "linear-gradient(135deg, var(--amber) 0%, var(--amber-bright) 100%)",
                boxShadow: "0 2px 8px rgba(184,134,62,0.25)",
              }}
            >
              L
            </div>
            <span
              className="text-sm font-medium"
              style={{ color: "var(--text-2)" }}
            >
              Luke Hodges
            </span>
          </div>

          {/* Status pill */}
          {statusPill && (
            <div
              className="flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em]"
              style={{
                background: pill.bg,
                border: `1px solid ${pill.border}`,
                color: pill.text,
              }}
            >
              <span
                className="inline-block h-1.5 w-1.5 rounded-full"
                style={{
                  background: pill.dot,
                  animation: statusVariant === "amber" ? "pulse 2s ease-in-out infinite" : undefined,
                }}
              />
              {statusPill}
            </div>
          )}
        </div>
      </div>

      {/* Content wrapper */}
      <div className="mx-auto max-w-[720px] px-6">
        {children}
      </div>

      {/* Pulse animation for status dot */}
      <style jsx global>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
