"use client";

import { useRouter } from "next/navigation";
import { api } from "@/lib/trpc/react";
import { usePortalEngagement } from "@/components/portal/portal-engagement-context";
import { Check, CreditCard, FileText, Clock, Ban } from "lucide-react";

function formatCurrency(amountInCents: number): string {
  return (amountInCents / 100).toLocaleString("en-GB", {
    style: "currency",
    currency: "GBP",
  });
}

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

type InvoiceStatus = "DRAFT" | "SENT" | "PAID" | "OVERDUE" | "VOID";

const statusConfig: Record<
  InvoiceStatus,
  {
    icon: typeof Check;
    color: string;
    bgColor: string;
    pillBg: string;
    pillText: string;
    label: string;
  }
> = {
  PAID: {
    icon: Check,
    color: "var(--portal-accent)",
    bgColor: "var(--portal-accent-light)",
    pillBg: "var(--portal-accent-light)",
    pillText: "var(--portal-accent)",
    label: "Paid",
  },
  SENT: {
    icon: CreditCard,
    color: "var(--portal-blue)",
    bgColor: "var(--portal-blue-light)",
    pillBg: "var(--portal-blue-light)",
    pillText: "var(--portal-blue)",
    label: "Sent",
  },
  OVERDUE: {
    icon: CreditCard,
    color: "var(--portal-red)",
    bgColor: "var(--portal-red-light)",
    pillBg: "var(--portal-red-light)",
    pillText: "var(--portal-red)",
    label: "Overdue",
  },
  DRAFT: {
    icon: FileText,
    color: "var(--portal-text-muted)",
    bgColor: "var(--portal-border-light)",
    pillBg: "var(--portal-border-light)",
    pillText: "var(--portal-text-muted)",
    label: "Draft",
  },
  VOID: {
    icon: Ban,
    color: "var(--portal-text-muted)",
    bgColor: "var(--portal-border-light)",
    pillBg: "var(--portal-border-light)",
    pillText: "var(--portal-text-muted)",
    label: "Void",
  },
};

function getDueLabel(status: InvoiceStatus, dueDate: Date | string, paidAt: Date | string | null): string {
  if (status === "PAID" && paidAt) {
    return `Paid ${formatDate(paidAt)}`;
  }
  if (status === "VOID") {
    return "Voided";
  }
  if (status === "OVERDUE") {
    return `Overdue · Due ${formatDate(dueDate)}`;
  }
  if (status === "DRAFT") {
    return `Due ${formatDate(dueDate)}`;
  }
  return `Due ${formatDate(dueDate)}`;
}

export function PortalInvoicesContent() {
  const router = useRouter();
  const { engagementId } = usePortalEngagement();
  const { data, isLoading } = api.clientPortal.portal.listInvoices.useQuery(
    { engagementId },
    { enabled: !!engagementId }
  );

  const invoices = data ?? [];

  const nonVoidInvoices = invoices.filter((inv) => inv.status !== "VOID");
  const nonDraftInvoices = nonVoidInvoices.filter((inv) => inv.status !== "DRAFT");
  const totalInvoiced = nonDraftInvoices.reduce((sum, inv) => sum + inv.amount, 0);
  const totalPaid = nonVoidInvoices
    .filter((inv) => inv.status === "PAID")
    .reduce((sum, inv) => sum + inv.amount, 0);
  const outstanding = nonVoidInvoices
    .filter((inv) => inv.status === "SENT" || inv.status === "OVERDUE")
    .reduce((sum, inv) => sum + inv.amount, 0);
  const overdueCount = invoices.filter((inv) => inv.status === "OVERDUE").length;

  const totalAll = nonVoidInvoices.reduce((sum, inv) => sum + inv.amount, 0);
  const progressPercent = totalAll > 0 ? Math.round((totalPaid / totalAll) * 100) : 0;

  if (isLoading) {
    return (
      <div style={{ padding: "80px 40px", textAlign: "center", color: "var(--portal-text-muted)" }}>
        Loading invoices...
      </div>
    );
  }

  return (
    <div>
      {/* Topbar */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          background: "var(--portal-surface)",
          borderBottom: "1px solid var(--portal-border)",
          padding: "20px 40px",
        }}
      >
        <h1
          className="font-[var(--font-heading)]"
          style={{
            fontSize: 22,
            fontWeight: 600,
            color: "var(--portal-text)",
            margin: 0,
            lineHeight: 1.3,
          }}
        >
          Invoices
        </h1>
        <p
          style={{
            fontSize: 14,
            color: "var(--portal-text-secondary)",
            margin: "4px 0 0",
          }}
        >
          {invoices.length > 0
            ? `${invoices.length} invoice${invoices.length !== 1 ? "s" : ""} · ${formatCurrency(totalAll)} total engagement value`
            : "No invoices yet"}
        </p>
      </div>

      {/* Content */}
      <div style={{ padding: "32px 40px", maxWidth: 900 }}>
        {/* Overdue Warning Banner */}
        {overdueCount > 0 && (
          <div
            style={{
              background: "var(--portal-red-light)",
              border: "1px solid var(--portal-red)",
              borderRadius: "var(--portal-radius)",
              padding: "14px 20px",
              marginBottom: 20,
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <CreditCard size={20} color="var(--portal-red)" />
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--portal-red)" }}>
                {overdueCount} overdue invoice{overdueCount !== 1 ? "s" : ""}
              </div>
              <div style={{ fontSize: 13, color: "var(--portal-text-secondary)", marginTop: 2 }}>
                {formatCurrency(invoices.filter((i) => i.status === "OVERDUE").reduce((s, i) => s + i.amount, 0))} total overdue
              </div>
            </div>
          </div>
        )}

        {/* Payment Summary */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 16,
            marginBottom: 28,
          }}
        >
          {/* Total Invoiced */}
          <div
            style={{
              background: "var(--portal-surface)",
              border: "1px solid var(--portal-border)",
              borderRadius: "var(--portal-radius)",
              padding: "20px 24px",
              boxShadow: "var(--portal-shadow)",
            }}
          >
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                color: "var(--portal-text-muted)",
                marginBottom: 8,
              }}
            >
              Total Invoiced
            </div>
            <div
              className="font-[var(--font-heading)]"
              style={{
                fontSize: 28,
                fontWeight: 600,
                color: "var(--portal-text)",
                lineHeight: 1.2,
              }}
            >
              {formatCurrency(totalInvoiced)}
            </div>
            <div style={{ fontSize: 13, color: "var(--portal-text-muted)", marginTop: 4 }}>
              {nonDraftInvoices.length} invoice{nonDraftInvoices.length !== 1 ? "s" : ""} issued
            </div>
          </div>

          {/* Total Paid */}
          <div
            style={{
              background: "var(--portal-surface)",
              border: "1px solid var(--portal-border)",
              borderRadius: "var(--portal-radius)",
              padding: "20px 24px",
              boxShadow: "var(--portal-shadow)",
            }}
          >
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                color: "var(--portal-text-muted)",
                marginBottom: 8,
              }}
            >
              Total Paid
            </div>
            <div
              className="font-[var(--font-heading)]"
              style={{
                fontSize: 28,
                fontWeight: 600,
                color: "var(--portal-accent)",
                lineHeight: 1.2,
              }}
            >
              {formatCurrency(totalPaid)}
            </div>
            <div style={{ fontSize: 13, color: "var(--portal-text-muted)", marginTop: 4 }}>
              {nonVoidInvoices.filter((i) => i.status === "PAID").length} payment{nonVoidInvoices.filter((i) => i.status === "PAID").length !== 1 ? "s" : ""} received
            </div>
          </div>

          {/* Outstanding */}
          <div
            style={{
              background: "var(--portal-surface)",
              border: `1px solid ${overdueCount > 0 ? "var(--portal-red)" : "var(--portal-border)"}`,
              borderRadius: "var(--portal-radius)",
              padding: "20px 24px",
              boxShadow: "var(--portal-shadow)",
            }}
          >
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                color: "var(--portal-text-muted)",
                marginBottom: 8,
              }}
            >
              Outstanding
            </div>
            <div
              className="font-[var(--font-heading)]"
              style={{
                fontSize: 28,
                fontWeight: 600,
                color: "var(--portal-red)",
                lineHeight: 1.2,
              }}
            >
              {formatCurrency(outstanding)}
            </div>
            <div style={{ fontSize: 13, color: overdueCount > 0 ? "var(--portal-red)" : "var(--portal-text-muted)", marginTop: 4 }}>
              {overdueCount > 0
                ? `${overdueCount} overdue`
                : `${nonVoidInvoices.filter((i) => i.status === "SENT" || i.status === "OVERDUE").length} invoice${nonVoidInvoices.filter((i) => i.status === "SENT" || i.status === "OVERDUE").length !== 1 ? "s" : ""} pending`}
            </div>
          </div>
        </div>

        {/* Invoice List */}
        <div
          style={{
            background: "var(--portal-surface)",
            border: "1px solid var(--portal-border)",
            borderRadius: "var(--portal-radius)",
            boxShadow: "var(--portal-shadow)",
            marginBottom: 28,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "16px 24px",
              borderBottom: "1px solid var(--portal-border)",
            }}
          >
            <h2
              style={{
                fontSize: 16,
                fontWeight: 600,
                color: "var(--portal-text)",
                margin: 0,
              }}
            >
              All Invoices
            </h2>
          </div>

          {invoices.length === 0 ? (
            <div
              style={{
                padding: "48px 24px",
                textAlign: "center",
                color: "var(--portal-text-muted)",
                fontSize: 14,
              }}
            >
              No invoices have been created yet.
            </div>
          ) : (
            invoices.map((invoice, index) => {
              const config = statusConfig[invoice.status as InvoiceStatus] ?? statusConfig.DRAFT;
              const Icon = config.icon;
              const isDraft = invoice.status === "DRAFT";
              const isVoid = invoice.status === "VOID";
              const isOverdue = invoice.status === "OVERDUE";
              const isActionable = invoice.status === "SENT" || invoice.status === "OVERDUE";
              const isPaid = invoice.status === "PAID";

              return (
                <div
                  key={invoice.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                    padding: "16px 24px",
                    borderBottom:
                      index < invoices.length - 1
                        ? "1px solid var(--portal-border-light)"
                        : undefined,
                    opacity: isDraft || isVoid ? 0.55 : 1,
                    cursor: "default",
                    transition: "background 0.15s",
                    borderLeft: isOverdue ? "3px solid var(--portal-red)" : "3px solid transparent",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "var(--portal-warm)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  {/* Icon */}
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 8,
                      background: config.bgColor,
                      color: config.color,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Icon style={{ width: 18, height: 18 }} />
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: "var(--portal-text)",
                        lineHeight: 1.4,
                        textDecoration: isVoid ? "line-through" : undefined,
                      }}
                    >
                      {invoice.invoiceNumber ?? `Invoice #${(index + 1).toString().padStart(3, "0")}`}
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        color: "var(--portal-text-secondary)",
                        lineHeight: 1.4,
                        marginTop: 2,
                        textDecoration: isVoid ? "line-through" : undefined,
                      }}
                    >
                      {invoice.description}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: isOverdue ? "var(--portal-red)" : "var(--portal-text-muted)",
                        fontWeight: isOverdue ? 600 : 400,
                        marginTop: 4,
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                      }}
                    >
                      {invoice.sentAt && (
                        <span>Issued {formatDate(invoice.sentAt)}</span>
                      )}
                      {!invoice.sentAt && invoice.createdAt && (
                        <span>Created {formatDate(invoice.createdAt)}</span>
                      )}
                      <span style={{ color: "var(--portal-border)" }}>·</span>
                      <span>{getDueLabel(invoice.status as InvoiceStatus, invoice.dueDate, invoice.paidAt)}</span>
                    </div>
                  </div>

                  {/* Amount */}
                  <div style={{ textAlign: "right", flexShrink: 0, marginRight: 16 }}>
                    <div
                      className="font-[var(--font-heading)]"
                      style={{
                        fontSize: 20,
                        fontWeight: 600,
                        color: isVoid ? "var(--portal-text-muted)" : "var(--portal-text)",
                        lineHeight: 1.3,
                        textDecoration: isVoid ? "line-through" : undefined,
                      }}
                    >
                      {formatCurrency(invoice.amount)}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: isOverdue ? "var(--portal-red)" : "var(--portal-text-muted)",
                        fontWeight: isOverdue ? 500 : 400,
                        marginTop: 2,
                      }}
                    >
                      {getDueLabel(invoice.status as InvoiceStatus, invoice.dueDate, invoice.paidAt)}
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                    {/* Status Pill */}
                    <span
                      style={{
                        display: "inline-block",
                        fontSize: 12,
                        fontWeight: 600,
                        padding: "4px 10px",
                        borderRadius: 999,
                        background: config.pillBg,
                        color: config.pillText,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {config.label}
                    </span>

                    {/* Pay Now button for SENT/OVERDUE */}
                    {isActionable && (
                      <button
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          padding: "7px 16px",
                          fontSize: 13,
                          fontWeight: 600,
                          color: "#fff",
                          background: isOverdue ? "var(--portal-red)" : "var(--portal-accent)",
                          border: "none",
                          borderRadius: "var(--portal-radius)",
                          cursor: "pointer",
                          whiteSpace: "nowrap",
                          transition: "opacity 0.15s",
                        }}
                        onMouseEnter={(e) => {
                          (e.target as HTMLButtonElement).style.opacity = "0.9";
                        }}
                        onMouseLeave={(e) => {
                          (e.target as HTMLButtonElement).style.opacity = "1";
                        }}
                        onClick={() => router.push(`/portal/invoices/${invoice.id}/pay`)}
                      >
                        Pay Now
                      </button>
                    )}

                    {/* Download Receipt for PAID */}
                    {isPaid && (
                      <button
                        style={{
                          background: "none",
                          border: "none",
                          padding: "4px 0",
                          fontSize: 13,
                          fontWeight: 500,
                          color: "var(--portal-accent)",
                          cursor: "pointer",
                          whiteSpace: "nowrap",
                          textDecoration: "underline",
                          textUnderlineOffset: 2,
                        }}
                        onClick={() => router.push(`/portal/invoices/${invoice.id}/receipt`)}
                      >
                        Download Receipt
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Payment Progress */}
        {nonVoidInvoices.length > 0 && (
          <div
            style={{
              background: "var(--portal-surface)",
              border: "1px solid var(--portal-border)",
              borderRadius: "var(--portal-radius)",
              padding: "20px 24px",
              boxShadow: "var(--portal-shadow)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 16,
              }}
            >
              <h3
                style={{
                  fontSize: 15,
                  fontWeight: 600,
                  color: "var(--portal-text)",
                  margin: 0,
                }}
              >
                Payment Progress
              </h3>
              <span style={{ fontSize: 13, color: "var(--portal-text-secondary)" }}>
                {formatCurrency(totalPaid)} of {formatCurrency(totalAll)} paid
              </span>
            </div>

            {/* Progress Bar */}
            <div
              style={{
                width: "100%",
                height: 8,
                background: "var(--portal-border-light)",
                borderRadius: 4,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${progressPercent}%`,
                  height: "100%",
                  background: "var(--portal-accent)",
                  borderRadius: 4,
                  transition: "width 0.4s ease",
                }}
              />
            </div>

            {/* Labels */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: 8,
                fontSize: 12,
                color: "var(--portal-text-muted)",
              }}
            >
              <span>{progressPercent}% paid</span>
              <span>{formatCurrency(totalAll - totalPaid)} remaining</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
