"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/trpc/react";
import { usePortalEngagement } from "@/components/portal/portal-engagement-context";
import { toast } from "sonner";
import {
  ChevronLeft,
  CreditCard,
  DollarSign,
  Copy,
  Check,
  Shield,
  Lock,
} from "lucide-react";

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

type PaymentMethod = "card" | "bank";

const BANK_DETAILS = {
  accountName: process.env.NEXT_PUBLIC_BANK_ACCOUNT_NAME ?? "Contact us for bank details",
  sortCode: process.env.NEXT_PUBLIC_BANK_SORT_CODE ?? "",
  accountNumber: process.env.NEXT_PUBLIC_BANK_ACCOUNT_NUMBER ?? "",
};

export default function PayInvoicePage() {
  const params = useParams();
  const invoiceId = params.invoiceId as string;
  const { engagementId } = usePortalEngagement();
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>("card");
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const { data, isLoading } = api.clientPortal.portal.listInvoices.useQuery(
    { engagementId },
    { enabled: !!engagementId }
  );

  const invoice = data?.find((inv) => inv.id === invoiceId) ?? null;

  async function copyToClipboard(value: string, field: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      toast.success(`${field} copied to clipboard`);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  }

  if (isLoading) {
    return (
      <div style={{ padding: "40px" }}>
        {/* Skeleton back link */}
        <div
          style={{
            width: 140,
            height: 16,
            background: "var(--portal-border-light)",
            borderRadius: 4,
            marginBottom: 32,
          }}
        />
        {/* Skeleton banner */}
        <div
          style={{
            height: 100,
            background: "var(--portal-border-light)",
            borderRadius: "var(--portal-radius)",
            marginBottom: 32,
          }}
        />
        {/* Skeleton cards */}
        <div className="grid grid-cols-2 gap-6">
          <div
            style={{
              height: 280,
              background: "var(--portal-border-light)",
              borderRadius: "var(--portal-radius)",
            }}
          />
          <div
            style={{
              height: 280,
              background: "var(--portal-border-light)",
              borderRadius: "var(--portal-radius)",
            }}
          />
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div style={{ padding: "40px" }}>
        <Link
          href="/portal/invoices"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            fontSize: 14,
            color: "var(--portal-accent)",
            textDecoration: "none",
            marginBottom: 32,
          }}
        >
          <ChevronLeft size={16} />
          Back to Invoices
        </Link>
        <div
          style={{
            textAlign: "center",
            padding: "60px 20px",
            color: "var(--portal-text-muted)",
            fontSize: 15,
          }}
        >
          Invoice not found.
        </div>
      </div>
    );
  }

  const invoiceNumber =
    invoice.invoiceNumber ?? `Invoice #${invoice.id.slice(0, 8)}`;

  return (
    <div style={{ padding: "32px 40px", maxWidth: 900 }}>
      {/* Back Link */}
      <Link
        href="/portal/invoices"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          fontSize: 14,
          color: "var(--portal-accent)",
          textDecoration: "none",
          marginBottom: 24,
        }}
      >
        <ChevronLeft size={16} />
        Back to Invoices
      </Link>

      {/* Invoice Summary Banner */}
      <div
        style={{
          background: "var(--portal-surface)",
          border: "1px solid var(--portal-border)",
          borderRadius: "var(--portal-radius)",
          padding: "24px 28px",
          marginBottom: 28,
          boxShadow: "var(--portal-shadow)",
        }}
      >
        <div className="flex items-center justify-between">
          <div>
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
              {invoiceNumber}
            </h1>
            {invoice.description && (
              <p
                style={{
                  fontSize: 14,
                  color: "var(--portal-text-secondary)",
                  margin: "6px 0 0",
                }}
              >
                {invoice.description}
              </p>
            )}
          </div>
          <div style={{ textAlign: "right" }}>
            <div
              className="font-[var(--font-heading)]"
              style={{
                fontSize: 28,
                fontWeight: 700,
                color: "var(--portal-text)",
                lineHeight: 1.2,
              }}
            >
              {formatCurrency(invoice.amount)}
            </div>
            <div
              style={{
                fontSize: 13,
                color: "var(--portal-text-muted)",
                marginTop: 4,
              }}
            >
              Due {formatDate(invoice.dueDate)}
            </div>
          </div>
        </div>
      </div>

      {/* Choose Payment Method */}
      <h2
        style={{
          fontSize: 16,
          fontWeight: 600,
          color: "var(--portal-text)",
          margin: "0 0 16px",
        }}
      >
        Choose Payment Method
      </h2>

      {/* Payment Method Cards */}
      <div className="grid grid-cols-2 gap-6" style={{ marginBottom: 28 }}>
        {/* Card 1: Pay by Card */}
        <div
          onClick={() => setSelectedMethod("card")}
          style={{
            background: "var(--portal-surface)",
            border:
              selectedMethod === "card"
                ? "2px solid var(--portal-accent)"
                : "1px solid var(--portal-border)",
            borderRadius: "var(--portal-radius)",
            padding: selectedMethod === "card" ? "23px 23px" : "24px",
            cursor: "pointer",
            boxShadow:
              selectedMethod === "card"
                ? "0 0 0 3px var(--portal-accent-light)"
                : "var(--portal-shadow)",
            transition: "border 0.15s, box-shadow 0.15s",
          }}
        >
          <div className="flex items-center gap-3" style={{ marginBottom: 16 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 8,
                background: "var(--portal-accent-light)",
                color: "var(--portal-accent)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <CreditCard size={20} />
            </div>
            <h3
              style={{
                fontSize: 16,
                fontWeight: 600,
                color: "var(--portal-text)",
                margin: 0,
              }}
            >
              Pay by Card
            </h3>
          </div>

          {/* Card brand badges */}
          <div className="flex items-center gap-2" style={{ marginBottom: 14 }}>
            {["VISA", "MC", "AMEX"].map((brand) => (
              <span
                key={brand}
                style={{
                  display: "inline-block",
                  padding: "3px 8px",
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.5px",
                  borderRadius: 4,
                  background: "var(--portal-border-light)",
                  color: "var(--portal-text-muted)",
                }}
              >
                {brand}
              </span>
            ))}
          </div>

          <p
            style={{
              fontSize: 13,
              color: "var(--portal-text-secondary)",
              lineHeight: 1.5,
              margin: "0 0 20px",
            }}
          >
            Secure card payment processed by Stripe. You&apos;ll be redirected
            to a secure checkout page.
          </p>

          {/* Pay button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (invoice.stripePaymentUrl) {
                window.open(invoice.stripePaymentUrl, "_blank", "noopener,noreferrer");
              } else {
                window.alert(
                  "Stripe payment not yet configured. Please contact us for payment details."
                );
              }
            }}
            style={{
              width: "100%",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              padding: "12px 20px",
              fontSize: 14,
              fontWeight: 600,
              color: "#fff",
              background: "#635BFF",
              border: "none",
              borderRadius: "var(--portal-radius)",
              cursor: "pointer",
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background =
                "#5148E0";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background =
                "#635BFF";
            }}
          >
            <Lock size={14} />
            Pay {formatCurrency(invoice.amount)}
          </button>

          <div
            style={{
              fontSize: 12,
              color: "var(--portal-text-muted)",
              textAlign: "center",
              marginTop: 10,
            }}
          >
            Secured by Stripe
          </div>
        </div>

        {/* Card 2: Pay by Bank Transfer */}
        <div
          onClick={() => setSelectedMethod("bank")}
          style={{
            background: "var(--portal-surface)",
            border:
              selectedMethod === "bank"
                ? "2px solid var(--portal-accent)"
                : "1px solid var(--portal-border)",
            borderRadius: "var(--portal-radius)",
            padding: selectedMethod === "bank" ? "23px 23px" : "24px",
            cursor: "pointer",
            boxShadow:
              selectedMethod === "bank"
                ? "0 0 0 3px var(--portal-accent-light)"
                : "var(--portal-shadow)",
            transition: "border 0.15s, box-shadow 0.15s",
          }}
        >
          <div className="flex items-center gap-3" style={{ marginBottom: 16 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 8,
                background: "var(--portal-accent-light)",
                color: "var(--portal-accent)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <DollarSign size={20} />
            </div>
            <h3
              style={{
                fontSize: 16,
                fontWeight: 600,
                color: "var(--portal-text)",
                margin: 0,
              }}
            >
              Pay by Bank Transfer
            </h3>
          </div>

          {/* Bank Details */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 10,
              marginBottom: 16,
            }}
          >
            <BankDetailRow
              label="Account Name"
              value={BANK_DETAILS.accountName}
              copied={copiedField === "Account Name"}
              onCopy={() =>
                copyToClipboard(BANK_DETAILS.accountName, "Account Name")
              }
            />
            <BankDetailRow
              label="Sort Code"
              value={BANK_DETAILS.sortCode}
              copied={copiedField === "Sort Code"}
              onCopy={() =>
                copyToClipboard(BANK_DETAILS.sortCode, "Sort Code")
              }
            />
            <BankDetailRow
              label="Account Number"
              value={BANK_DETAILS.accountNumber}
              copied={copiedField === "Account Number"}
              onCopy={() =>
                copyToClipboard(BANK_DETAILS.accountNumber, "Account Number")
              }
            />
            <BankDetailRow
              label="Payment Reference"
              value={invoiceNumber}
              copied={copiedField === "Payment Reference"}
              onCopy={() =>
                copyToClipboard(invoiceNumber, "Payment Reference")
              }
            />
          </div>

          <p
            style={{
              fontSize: 12,
              color: "var(--portal-text-muted)",
              lineHeight: 1.5,
              margin: "0 0 16px",
            }}
          >
            Please use the reference above so we can match your payment. Bank
            transfers typically take 1-2 working days.
          </p>

          {/* I've Made This Payment button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              window.alert(
                "Thank you! We'll confirm your payment once it has been received."
              );
            }}
            style={{
              width: "100%",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              padding: "12px 20px",
              fontSize: 14,
              fontWeight: 600,
              color: "var(--portal-accent)",
              background: "transparent",
              border: "2px solid var(--portal-accent)",
              borderRadius: "var(--portal-radius)",
              cursor: "pointer",
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--portal-accent-light)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
            }}
          >
            <Check size={14} />
            I&apos;ve Made This Payment
          </button>
        </div>
      </div>

      {/* Security Footer */}
      <div
        className="flex items-center justify-center gap-2"
        style={{
          padding: "16px 0",
          fontSize: 13,
          color: "var(--portal-text-muted)",
        }}
      >
        <Shield size={16} />
        All payments are encrypted and processed securely.
      </div>
    </div>
  );
}

function BankDetailRow({
  label,
  value,
  copied,
  onCopy,
}: {
  label: string;
  value: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div
      className="flex items-center justify-between"
      style={{
        background: "var(--portal-warm)",
        borderRadius: 6,
        padding: "10px 14px",
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
            marginBottom: 2,
          }}
        >
          {label}
        </div>
        <div
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: "var(--portal-text)",
          }}
        >
          {value}
        </div>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onCopy();
        }}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 32,
          height: 32,
          borderRadius: 6,
          background: copied ? "var(--portal-accent-light)" : "transparent",
          border: "1px solid var(--portal-border)",
          cursor: "pointer",
          color: copied ? "var(--portal-accent)" : "var(--portal-text-muted)",
          transition: "all 0.15s",
          flexShrink: 0,
        }}
        title={`Copy ${label}`}
      >
        {copied ? <Check size={14} /> : <Copy size={14} />}
      </button>
    </div>
  );
}
