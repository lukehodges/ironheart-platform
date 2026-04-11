"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/trpc/react";
import { usePortalEngagement } from "@/components/portal/portal-engagement-context";
import { ChevronLeft, Printer, Download } from "lucide-react";

function formatCurrency(amountInCents: number): string {
  return (amountInCents / 100).toLocaleString("en-GB", {
    style: "currency",
    currency: "GBP",
  });
}

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function InvoiceReceiptPage() {
  const params = useParams();
  const invoiceId = params.invoiceId as string;
  const { engagementId, engagement } = usePortalEngagement();

  const { data, isLoading } = api.clientPortal.portal.listInvoices.useQuery(
    { engagementId },
    { enabled: !!engagementId }
  );

  const invoice = data?.find((inv) => inv.id === invoiceId) ?? null;

  if (isLoading) {
    return (
      <div
        style={{
          padding: "80px 40px",
          textAlign: "center",
          color: "var(--portal-text-muted)",
        }}
      >
        Loading receipt...
      </div>
    );
  }

  if (!invoice) {
    return (
      <div style={{ padding: "80px 40px", textAlign: "center" }}>
        <div
          style={{
            fontSize: 18,
            fontWeight: 600,
            color: "var(--portal-text)",
            marginBottom: 8,
          }}
        >
          Invoice not found
        </div>
        <div
          style={{
            fontSize: 14,
            color: "var(--portal-text-muted)",
            marginBottom: 24,
          }}
        >
          The invoice you are looking for does not exist or has been removed.
        </div>
        <Link
          href="/portal/invoices"
          style={{
            fontSize: 14,
            fontWeight: 500,
            color: "var(--portal-accent)",
            textDecoration: "underline",
            textUnderlineOffset: 2,
          }}
        >
          Back to Invoices
        </Link>
      </div>
    );
  }

  if (invoice.status !== "PAID") {
    return (
      <div style={{ padding: "80px 40px", textAlign: "center" }}>
        <div
          style={{
            fontSize: 18,
            fontWeight: 600,
            color: "var(--portal-text)",
            marginBottom: 8,
          }}
        >
          Receipt unavailable
        </div>
        <div
          style={{
            fontSize: 14,
            color: "var(--portal-text-muted)",
            marginBottom: 24,
          }}
        >
          Receipt is only available for paid invoices.
        </div>
        <Link
          href="/portal/invoices"
          style={{
            fontSize: 14,
            fontWeight: 500,
            color: "var(--portal-accent)",
            textDecoration: "underline",
            textUnderlineOffset: 2,
          }}
        >
          Back to Invoices
        </Link>
      </div>
    );
  }

  const subtotal = invoice.amount;
  const vat = Math.round(subtotal * 0.2);
  const total = subtotal + vat;
  const invoiceDate = invoice.sentAt ?? invoice.createdAt;
  const customerName = engagement?.title ?? "Customer";

  return (
    <>
      <style>{`
        @media print {
          .receipt-toolbar {
            display: none !important;
          }
          .receipt-document {
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
            max-width: 100% !important;
          }
          body {
            background: white !important;
          }
        }
      `}</style>

      {/* Toolbar */}
      <div
        className="receipt-toolbar"
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          background: "var(--portal-surface)",
          borderBottom: "1px solid var(--portal-border)",
          padding: "14px 40px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Link
          href="/portal/invoices"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 14,
            fontWeight: 500,
            color: "var(--portal-text-secondary)",
            textDecoration: "none",
            transition: "color 0.15s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "var(--portal-text)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "var(--portal-text-secondary)";
          }}
        >
          <ChevronLeft size={16} />
          Back to Invoices
        </Link>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            onClick={() => window.print()}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 16px",
              fontSize: 13,
              fontWeight: 600,
              color: "var(--portal-text)",
              background: "transparent",
              border: "1px solid var(--portal-border)",
              borderRadius: "var(--portal-radius)",
              cursor: "pointer",
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--portal-warm)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
            }}
          >
            <Printer size={14} />
            Print
          </button>
          <button
            onClick={() => {
              window.alert(
                "PDF download coming soon. Use Print and select 'Save as PDF' for now."
              );
            }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 16px",
              fontSize: 13,
              fontWeight: 600,
              color: "#fff",
              background: "var(--portal-accent)",
              border: "none",
              borderRadius: "var(--portal-radius)",
              cursor: "pointer",
              transition: "opacity 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = "0.9";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = "1";
            }}
          >
            <Download size={14} />
            Download PDF
          </button>
        </div>
      </div>

      {/* Receipt Document */}
      <div style={{ padding: "40px 40px 80px", background: "var(--portal-warm)" }}>
        <div
          className="receipt-document"
          style={{
            maxWidth: 720,
            margin: "0 auto",
            background: "#fff",
            borderRadius: "var(--portal-radius)",
            border: "1px solid var(--portal-border)",
            boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
            padding: "48px 56px",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* PAID Stamp */}
          <div
            style={{
              position: "absolute",
              top: 40,
              right: 40,
              transform: "rotate(12deg)",
              border: "3px solid var(--portal-accent)",
              borderRadius: 8,
              padding: "6px 20px",
              fontSize: 28,
              fontWeight: 800,
              letterSpacing: "4px",
              color: "var(--portal-accent)",
              textTransform: "uppercase",
              opacity: 0.6,
              pointerEvents: "none",
            }}
          >
            PAID
          </div>

          {/* Header */}
          <div style={{ marginBottom: 40 }}>
            <div
              className="font-[var(--font-heading)]"
              style={{
                fontSize: 24,
                fontWeight: 700,
                color: "var(--portal-text)",
                lineHeight: 1.3,
              }}
            >
              Luke Hodges
            </div>
            <div
              style={{
                fontSize: 13,
                color: "var(--portal-text-secondary)",
                lineHeight: 1.8,
                marginTop: 4,
              }}
            >
              AI Consulting &amp; Implementation
              <br />
              United Kingdom
              <br />
              luke@lukehodges.uk
              <br />
              +44 7XXX XXXXXX
            </div>
          </div>

          {/* Receipt Heading */}
          <div
            className="font-[var(--font-heading)]"
            style={{
              fontSize: 36,
              fontWeight: 700,
              color: "var(--portal-text)",
              marginBottom: 32,
              lineHeight: 1.2,
            }}
          >
            Receipt
          </div>

          {/* Meta Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "20px 40px",
              marginBottom: 36,
              paddingBottom: 36,
              borderBottom: "1px solid var(--portal-border-light)",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  color: "var(--portal-text-muted)",
                  marginBottom: 4,
                }}
              >
                Invoice Number
              </div>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: "var(--portal-text)",
                }}
              >
                {invoice.invoiceNumber ?? "N/A"}
              </div>
            </div>
            <div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  color: "var(--portal-text-muted)",
                  marginBottom: 4,
                }}
              >
                Bill To
              </div>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: "var(--portal-text)",
                }}
              >
                {customerName}
              </div>
            </div>
            <div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  color: "var(--portal-text-muted)",
                  marginBottom: 4,
                }}
              >
                Invoice Date
              </div>
              <div
                style={{
                  fontSize: 14,
                  color: "var(--portal-text)",
                }}
              >
                {invoiceDate ? formatDate(invoiceDate) : "N/A"}
              </div>
            </div>
            <div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  color: "var(--portal-text-muted)",
                  marginBottom: 4,
                }}
              >
                Due Date
              </div>
              <div
                style={{
                  fontSize: 14,
                  color: "var(--portal-text)",
                }}
              >
                {invoice.dueDate ? formatDate(invoice.dueDate) : "N/A"}
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          <div style={{ marginBottom: 24 }}>
            {/* Table Header */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "10px 0",
                borderBottom: "2px solid var(--portal-text)",
                marginBottom: 0,
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  color: "var(--portal-text)",
                }}
              >
                Description
              </div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  color: "var(--portal-text)",
                }}
              >
                Amount
              </div>
            </div>

            {/* Line Item Row */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                padding: "14px 0",
                borderBottom: "1px solid var(--portal-border-light)",
              }}
            >
              <div style={{ flex: 1, paddingRight: 24 }}>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: "var(--portal-text)",
                    lineHeight: 1.4,
                  }}
                >
                  {invoice.invoiceNumber ?? "Professional Services"}
                </div>
                {invoice.description && (
                  <div
                    style={{
                      fontSize: 13,
                      color: "var(--portal-text-muted)",
                      lineHeight: 1.4,
                      marginTop: 2,
                    }}
                  >
                    {invoice.description}
                  </div>
                )}
              </div>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 500,
                  color: "var(--portal-text)",
                  whiteSpace: "nowrap",
                }}
              >
                {formatCurrency(subtotal)}
              </div>
            </div>
          </div>

          {/* Totals */}
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              marginBottom: 36,
            }}
          >
            <div style={{ width: 260 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "8px 0",
                  fontSize: 14,
                  color: "var(--portal-text-secondary)",
                }}
              >
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "8px 0",
                  fontSize: 14,
                  color: "var(--portal-text-secondary)",
                  borderBottom: "1px solid var(--portal-border-light)",
                }}
              >
                <span>VAT (20%)</span>
                <span>{formatCurrency(vat)}</span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "12px 0 0",
                  alignItems: "baseline",
                }}
              >
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: "var(--portal-text)",
                  }}
                >
                  Total Paid
                </span>
                <span
                  className="font-[var(--font-heading)]"
                  style={{
                    fontSize: 22,
                    fontWeight: 700,
                    color: "var(--portal-text)",
                  }}
                >
                  {formatCurrency(total)}
                </span>
              </div>
            </div>
          </div>

          {/* Payment Info Box */}
          <div
            style={{
              background: "var(--portal-accent-light)",
              borderRadius: "var(--portal-radius)",
              padding: "20px 24px",
              marginBottom: 36,
            }}
          >
            <div
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: "var(--portal-accent)",
                marginBottom: 14,
              }}
            >
              Payment Received
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "12px 40px",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    color: "var(--portal-text-muted)",
                    marginBottom: 3,
                  }}
                >
                  Payment Date
                </div>
                <div style={{ fontSize: 14, color: "var(--portal-text)" }}>
                  {invoice.paidAt ? formatDate(invoice.paidAt) : "N/A"}
                </div>
              </div>
              <div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    color: "var(--portal-text-muted)",
                    marginBottom: 3,
                  }}
                >
                  Payment Method
                </div>
                <div style={{ fontSize: 14, color: "var(--portal-text)" }}>
                  {invoice.paymentMethod ?? "Bank Transfer"}
                </div>
              </div>
              <div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    color: "var(--portal-text-muted)",
                    marginBottom: 3,
                  }}
                >
                  Reference
                </div>
                <div style={{ fontSize: 14, color: "var(--portal-text)" }}>
                  {invoice.paymentReference ?? "N/A"}
                </div>
              </div>
              <div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    color: "var(--portal-text-muted)",
                    marginBottom: 3,
                  }}
                >
                  Status
                </div>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: "var(--portal-accent)",
                  }}
                >
                  Confirmed
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              borderTop: "1px solid var(--portal-border-light)",
              paddingTop: 24,
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontSize: 15,
                fontWeight: 600,
                color: "var(--portal-text)",
                marginBottom: 8,
              }}
            >
              Thank you for your payment.
            </div>
            <div
              style={{
                fontSize: 13,
                color: "var(--portal-text-muted)",
                lineHeight: 1.6,
              }}
            >
              If you have any questions about this receipt, please contact us at{" "}
              <a
                href="mailto:luke@lukehodges.uk"
                style={{
                  color: "var(--portal-accent)",
                  textDecoration: "underline",
                  textUnderlineOffset: 2,
                }}
              >
                luke@lukehodges.uk
              </a>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
