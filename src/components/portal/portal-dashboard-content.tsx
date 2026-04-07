"use client";

import {
  CheckCircle2,
  CreditCard,
  ChevronRight,
  FileText,
  Check,
  Clock,
  AlertCircle,
  Circle,
} from "lucide-react";
import type {
  PortalDashboard,
  MilestoneStatus,
  ActivityType,
} from "@/modules/client-portal/client-portal.types";

// ── Helpers ──────────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount / 100);
}

function formatDate(date: Date | string | null): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function timeAgo(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(d);
}

function getStatusColor(status: string): {
  bg: string;
  text: string;
  dot?: string;
} {
  switch (status) {
    case "ACTIVE":
    case "COMPLETED":
    case "IN_PROGRESS":
      return {
        bg: "var(--portal-accent-light)",
        text: "var(--portal-accent)",
        dot: "var(--portal-accent)",
      };
    case "UPCOMING":
    case "DRAFT":
    case "PENDING":
      return {
        bg: "#F3F2EE",
        text: "var(--portal-text-secondary)",
      };
    case "OVERDUE":
      return {
        bg: "var(--portal-red-light)",
        text: "var(--portal-red)",
      };
    default:
      return {
        bg: "#F3F2EE",
        text: "var(--portal-text-secondary)",
      };
  }
}

function getActivityColor(type: ActivityType): string {
  if (
    type.startsWith("milestone") ||
    type.startsWith("deliverable")
  )
    return "var(--portal-accent)";
  if (type.startsWith("approval")) return "var(--portal-amber)";
  if (type.startsWith("invoice") || type.startsWith("proposal"))
    return "var(--portal-blue)";
  return "var(--portal-text-muted)";
}

function getActivityIcon(type: ActivityType) {
  if (type.startsWith("milestone") || type.startsWith("deliverable"))
    return CheckCircle2;
  if (type.startsWith("approval")) return FileText;
  if (type.startsWith("invoice")) return CreditCard;
  return Circle;
}

// ── Styles ───────────────────────────────────────────────────────────────

const card: React.CSSProperties = {
  background: "var(--portal-surface)",
  border: "1px solid var(--portal-border)",
  borderRadius: "var(--portal-radius)",
  boxShadow: "var(--portal-shadow)",
};

// ── Component ────────────────────────────────────────────────────────────

interface PortalDashboardContentProps {
  data: PortalDashboard;
}

export function PortalDashboardContent({ data }: PortalDashboardContentProps) {
  const { engagement, pendingApprovals, pendingInvoices, milestones, financials, activity } =
    data;
  const deliverables = (data as any).deliverables ?? [];

  const totalPaid = financials.totalPaid;
  const outstanding = financials.totalOutstanding;
  const overdueCount = financials.overdueCount;

  const completedMilestones = milestones.filter(
    (m) => m.status === "COMPLETED"
  ).length;
  const totalMilestones = milestones.length;

  // Awaiting acceptance = deliverables that have been DELIVERED but not yet ACCEPTED
  const awaitingAcceptanceCount = deliverables.filter(
    (d: { status: string }) => d.status === "DELIVERED"
  ).length;

  // Next upcoming milestone (not yet completed)
  const nextMilestone = milestones
    .filter((m) => m.status !== "COMPLETED" && m.dueDate)
    .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())[0] ?? null;

  const statusColors = getStatusColor(engagement.status);

  // Compute deliverable progress per milestone
  const deliverablesByMilestone = new Map<string, { total: number; completed: number }>();
  (deliverables as Array<{ milestoneId?: string | null; status: string }>).forEach((d) => {
    if (!d.milestoneId) return;
    const current = deliverablesByMilestone.get(d.milestoneId) ?? { total: 0, completed: 0 };
    current.total++;
    if (d.status === "ACCEPTED" || d.status === "DELIVERED") current.completed++;
    deliverablesByMilestone.set(d.milestoneId, current);
  });

  return (
    <div>
      {/* ── Topbar ──────────────────────────────────────────────────── */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 20,
          background: "var(--portal-surface)",
          borderBottom: "1px solid var(--portal-border)",
          padding: "20px 40px",
        }}
      >
        <h1
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: 22,
            fontWeight: 600,
            color: "var(--portal-text)",
            margin: 0,
            lineHeight: 1.3,
          }}
        >
          {engagement.title}
        </h1>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginTop: 4,
          }}
        >
          <span
            style={{
              fontSize: 14,
              color: "var(--portal-text-secondary)",
            }}
          >
            {engagement.type === "PROJECT" ? "Project" : engagement.type === "RETAINER" ? "Retainer" : "Engagement"}
          </span>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 12,
              fontWeight: 500,
              padding: "3px 10px",
              borderRadius: 20,
              background: statusColors.bg,
              color: statusColors.text,
            }}
          >
            {engagement.status === "ACTIVE" && (
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: statusColors.dot,
                  animation: "pulse 2s ease-in-out infinite",
                }}
              />
            )}
            {engagement.status}
          </span>
        </div>
      </header>

      {/* ── Content ─────────────────────────────────────────────────── */}
      <div
        style={{
          padding: "32px 40px",
          maxWidth: 1100,
        }}
      >
        {/* Action Cards */}
        {(pendingApprovals.length > 0 || pendingInvoices.filter((i) => i.status === "SENT" || i.status === "OVERDUE").length > 0) && (
          <div
            style={{
              display: "flex",
              gap: 16,
              marginBottom: 28,
            }}
          >
            {pendingApprovals.length > 0 && (
              <a
                href="/portal/approvals"
                style={{
                  ...card,
                  flex: 1,
                  padding: "18px 20px",
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  textDecoration: "none",
                  color: "inherit",
                  transition: "box-shadow 0.15s ease",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.boxShadow =
                    "0 4px 12px rgba(0,0,0,0.08)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.boxShadow =
                    "var(--portal-shadow)";
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    background: "var(--portal-amber-light)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <AlertCircle size={20} color="var(--portal-amber)" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      textTransform: "uppercase" as const,
                      letterSpacing: "0.05em",
                      color: "var(--portal-amber)",
                      marginBottom: 2,
                    }}
                  >
                    Approval Waiting
                  </div>
                  <div
                    style={{
                      fontSize: 14,
                      color: "var(--portal-text)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {pendingApprovals[0].title}
                  </div>
                </div>
                <ChevronRight
                  size={18}
                  color="var(--portal-text-muted)"
                  style={{ flexShrink: 0 }}
                />
              </a>
            )}

            {pendingInvoices.filter((i) => i.status === "SENT" || i.status === "OVERDUE").length > 0 && (() => {
              const dueInvoice = pendingInvoices.find(
                (i) => i.status === "SENT" || i.status === "OVERDUE"
              )!;
              return (
                <a
                  href="/portal/invoices"
                  style={{
                    ...card,
                    flex: 1,
                    padding: "18px 20px",
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    textDecoration: "none",
                    color: "inherit",
                    transition: "box-shadow 0.15s ease",
                    cursor: "pointer",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.boxShadow =
                      "0 4px 12px rgba(0,0,0,0.08)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.boxShadow =
                      "var(--portal-shadow)";
                  }}
                >
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      background: "var(--portal-red-light)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <CreditCard size={20} color="var(--portal-red)" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        textTransform: "uppercase" as const,
                        letterSpacing: "0.05em",
                        color: "var(--portal-red)",
                        marginBottom: 2,
                      }}
                    >
                      Invoice Due
                    </div>
                    <div
                      style={{
                        fontSize: 14,
                        color: "var(--portal-text)",
                      }}
                    >
                      {formatCurrency(dueInvoice.amount)} &middot; Due{" "}
                      {formatDate(dueInvoice.dueDate)}
                    </div>
                  </div>
                  <ChevronRight
                    size={18}
                    color="var(--portal-text-muted)"
                    style={{ flexShrink: 0 }}
                  />
                </a>
              );
            })()}
          </div>
        )}

        {/* Stats Row */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 16,
            marginBottom: 28,
          }}
        >
          <div style={{ ...card, padding: "20px 24px" }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                textTransform: "uppercase" as const,
                letterSpacing: "0.05em",
                color: "var(--portal-text-muted)",
                marginBottom: 6,
              }}
            >
              Total Paid
            </div>
            <div
              style={{
                fontFamily: "var(--font-heading)",
                fontSize: 28,
                fontWeight: 600,
                color: "var(--portal-text)",
                lineHeight: 1.2,
              }}
            >
              {formatCurrency(totalPaid)}
            </div>
            <div
              style={{
                fontSize: 13,
                color: outstanding > 0 ? "var(--portal-amber)" : "var(--portal-text-secondary)",
                marginTop: 4,
                fontWeight: outstanding > 0 ? 500 : 400,
              }}
            >
              {outstanding > 0 ? `${formatCurrency(outstanding)} outstanding` : "all invoices settled"}
            </div>
          </div>

          <div style={{ ...card, padding: "20px 24px" }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                textTransform: "uppercase" as const,
                letterSpacing: "0.05em",
                color: "var(--portal-text-muted)",
                marginBottom: 6,
              }}
            >
              Outstanding
            </div>
            <div
              style={{
                fontFamily: "var(--font-heading)",
                fontSize: 28,
                fontWeight: 600,
                color:
                  outstanding > 0
                    ? "var(--portal-amber)"
                    : "var(--portal-text)",
                lineHeight: 1.2,
              }}
            >
              {formatCurrency(outstanding)}
            </div>
            <div
              style={{
                fontSize: 13,
                color: overdueCount > 0 ? "var(--portal-red)" : awaitingAcceptanceCount > 0 ? "var(--portal-amber)" : "var(--portal-text-secondary)",
                marginTop: 4,
                fontWeight: overdueCount > 0 || awaitingAcceptanceCount > 0 ? 500 : 400,
              }}
            >
              {overdueCount > 0
                ? `${overdueCount} overdue invoice${overdueCount !== 1 ? "s" : ""}`
                : awaitingAcceptanceCount > 0
                  ? `${awaitingAcceptanceCount} awaiting acceptance`
                  : "no deliverables pending"}
            </div>
          </div>

          <div style={{ ...card, padding: "20px 24px" }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                textTransform: "uppercase" as const,
                letterSpacing: "0.05em",
                color: "var(--portal-text-muted)",
                marginBottom: 6,
              }}
            >
              Milestones
            </div>
            <div
              style={{
                fontFamily: "var(--font-heading)",
                fontSize: 28,
                fontWeight: 600,
                color: "var(--portal-text)",
                lineHeight: 1.2,
              }}
            >
              {completedMilestones}{" "}
              <span
                style={{
                  fontSize: 18,
                  fontWeight: 400,
                  color: "var(--portal-text-muted)",
                }}
              >
                / {totalMilestones}
              </span>
            </div>
            <div
              style={{
                fontSize: 13,
                color: "var(--portal-text-secondary)",
                marginTop: 4,
              }}
            >
              {nextMilestone
                ? `Next due ${formatDate(nextMilestone.dueDate)}`
                : completedMilestones === totalMilestones && totalMilestones > 0
                  ? "all complete"
                  : "no upcoming milestones"}
            </div>
          </div>
        </div>

        {/* Two Column Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 20,
          }}
        >
          {/* Milestone Progress */}
          <div style={{ ...card, padding: "24px 28px" }}>
            <h2
              style={{
                fontFamily: "var(--font-heading)",
                fontSize: 16,
                fontWeight: 600,
                color: "var(--portal-text)",
                margin: "0 0 20px 0",
              }}
            >
              Milestone Progress
            </h2>
            {milestones.length === 0 ? (
              <div
                style={{
                  fontSize: 14,
                  color: "var(--portal-text-muted)",
                  padding: "20px 0",
                  textAlign: "center",
                }}
              >
                No milestones yet
              </div>
            ) : (
              <div style={{ position: "relative" }}>
                {milestones
                  .sort((a, b) => a.sortOrder - b.sortOrder)
                  .map((milestone, idx) => (
                    <MilestoneTimelineItem
                      key={milestone.id}
                      milestone={milestone}
                      isLast={idx === milestones.length - 1}
                      deliverableProgress={deliverablesByMilestone.get(milestone.id)}
                    />
                  ))}
              </div>
            )}
          </div>

          {/* Activity Feed */}
          <div style={{ ...card, padding: "24px 28px" }}>
            <h2
              style={{
                fontFamily: "var(--font-heading)",
                fontSize: 16,
                fontWeight: 600,
                color: "var(--portal-text)",
                margin: "0 0 20px 0",
              }}
            >
              Recent Activity
            </h2>
            {activity.length === 0 ? (
              <div
                style={{
                  fontSize: 14,
                  color: "var(--portal-text-muted)",
                  padding: "20px 0",
                  textAlign: "center",
                }}
              >
                No activity yet
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 16,
                }}
              >
                {activity.slice(0, 8).map((item, idx) => {
                  const IconComp = getActivityIcon(item.type);
                  const color = getActivityColor(item.type);
                  return (
                    <div
                      key={idx}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 12,
                      }}
                    >
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 8,
                          background: `${color}14`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                          marginTop: 1,
                        }}
                      >
                        <IconComp size={16} color={color} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: 14,
                            color: "var(--portal-text)",
                            lineHeight: 1.4,
                          }}
                        >
                          {item.title}
                        </div>
                        <div
                          style={{
                            fontSize: 12,
                            color: "var(--portal-text-muted)",
                            marginTop: 2,
                          }}
                        >
                          {timeAgo(item.timestamp)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Pulse animation for status dot */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}

// ── Milestone Timeline Item ──────────────────────────────────────────────

function MilestoneTimelineItem({
  milestone,
  isLast,
  deliverableProgress,
}: {
  milestone: {
    id: string;
    title: string;
    status: MilestoneStatus;
    dueDate: Date | null;
    completedAt: Date | null;
  };
  isLast: boolean;
  deliverableProgress?: { total: number; completed: number };
}) {
  const isCompleted = milestone.status === "COMPLETED";
  const isCurrent = milestone.status === "IN_PROGRESS";
  const statusColors = getStatusColor(milestone.status);
  const progressPercent = deliverableProgress && deliverableProgress.total > 0
    ? Math.round((deliverableProgress.completed / deliverableProgress.total) * 100)
    : isCompleted ? 100 : 0;

  const dotSize = 14;
  const dotColor = isCompleted || isCurrent ? "var(--portal-accent)" : "#D1CFC8";

  return (
    <div
      style={{
        display: "flex",
        gap: 14,
        paddingBottom: isLast ? 0 : 24,
        position: "relative",
      }}
    >
      {/* Timeline dot + line */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          width: dotSize,
          flexShrink: 0,
          paddingTop: 3,
        }}
      >
        {isCompleted ? (
          <div
            style={{
              width: dotSize,
              height: dotSize,
              borderRadius: "50%",
              background: dotColor,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Check size={9} color="#fff" strokeWidth={3} />
          </div>
        ) : (
          <div
            style={{
              width: dotSize,
              height: dotSize,
              borderRadius: "50%",
              border: `2.5px solid ${dotColor}`,
              background: isCurrent ? "var(--portal-accent-light)" : "var(--portal-surface)",
              boxShadow: isCurrent ? "0 0 0 4px var(--portal-accent-light)" : "none",
            }}
          />
        )}
        {!isLast && (
          <div
            style={{
              width: 2,
              flex: 1,
              marginTop: 4,
              background: isCompleted ? "var(--portal-accent)" : "#E8E6E1",
              borderRadius: 1,
            }}
          />
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 4,
          }}
        >
          <span
            style={{
              fontSize: 14,
              fontWeight: 500,
              color: "var(--portal-text)",
            }}
          >
            {milestone.title}
          </span>
          <span
            style={{
              fontSize: 11,
              fontWeight: 500,
              padding: "2px 8px",
              borderRadius: 12,
              background: statusColors.bg,
              color: statusColors.text,
            }}
          >
            {milestone.status === "IN_PROGRESS"
              ? "In Progress"
              : milestone.status === "COMPLETED"
                ? "Complete"
                : "Upcoming"}
          </span>
        </div>
        <div
          style={{
            fontSize: 13,
            color: "var(--portal-text-muted)",
          }}
        >
          {milestone.completedAt
            ? `Completed ${formatDate(milestone.completedAt)}`
            : milestone.dueDate
              ? `Due ${formatDate(milestone.dueDate)}`
              : "No due date"}
        </div>

        {/* Progress bar for in-progress milestone */}
        {isCurrent && (
          <div>
            <div
              style={{
                marginTop: 10,
                height: 4,
                borderRadius: 2,
                background: "#E8E6E1",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${progressPercent}%`,
                  borderRadius: 2,
                  background: "var(--portal-accent)",
                  transition: "width 0.3s ease",
                }}
              />
            </div>
            {deliverableProgress && deliverableProgress.total > 0 && (
              <div
                style={{
                  fontSize: 12,
                  color: "var(--portal-text-muted)",
                  marginTop: 4,
                }}
              >
                {deliverableProgress.completed} of {deliverableProgress.total} deliverable{deliverableProgress.total !== 1 ? "s" : ""} complete
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
