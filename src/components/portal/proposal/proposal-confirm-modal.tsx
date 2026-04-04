"use client";

import { useEffect, useRef } from "react";

interface ProposalConfirmModalProps {
  engagementTitle: string;
  isLoading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ProposalConfirmModal({
  engagementTitle,
  isLoading,
  onConfirm,
  onCancel,
}: ProposalConfirmModalProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  // Focus trap: focus cancel button on mount
  useEffect(() => {
    cancelRef.current?.focus();
  }, []);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isLoading) onCancel();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isLoading, onCancel]);

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center p-6"
      style={{ animation: "fadeIn 0.2s ease" }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        style={{ background: "rgba(26,26,26,0.4)", backdropFilter: "blur(4px)" }}
        onClick={!isLoading ? onCancel : undefined}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-[400px] rounded-xl p-8 text-center"
        style={{
          background: "var(--bg-card)",
          boxShadow: "var(--shadow-lg)",
          animation: "fadeInUp 0.3s ease",
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
      >
        <h3
          id="confirm-title"
          className="mb-2 font-[var(--font-heading)] text-[20px]"
          style={{ color: "var(--text-1)" }}
        >
          Approve this proposal?
        </h3>
        <p className="mb-6 text-[14px]" style={{ color: "var(--text-3)" }}>
          You&apos;re approving <strong style={{ color: "var(--text-1)" }}>{engagementTitle}</strong>. This will kick things off.
        </p>

        <div className="flex flex-col gap-2">
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="w-full rounded-lg px-6 py-3 text-[14px] font-semibold text-white transition-transform hover:-translate-y-0.5 disabled:opacity-60 disabled:hover:translate-y-0"
            style={{
              background: "linear-gradient(135deg, var(--green) 0%, var(--green-bright) 100%)",
              boxShadow: "0 4px 16px rgba(61,138,90,0.25)",
            }}
          >
            {isLoading ? "Approving..." : "Yes, approve"}
          </button>
          <button
            ref={cancelRef}
            onClick={onCancel}
            disabled={isLoading}
            className="w-full rounded-lg px-6 py-3 text-[14px] font-medium transition-colors"
            style={{
              color: "var(--text-3)",
              background: "transparent",
              border: "1px solid var(--border)",
            }}
          >
            Go back
          </button>
        </div>
      </div>

      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
