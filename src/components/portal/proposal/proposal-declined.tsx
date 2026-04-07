"use client";

import { useState } from "react";

interface ProposalDeclinedProps {
  customerName: string;
  proposalToken: string;
  onSubmitFeedback: (feedback: string) => void;
  consultantName?: string;
  consultantEmail?: string;
}

export function ProposalDeclined({ customerName, proposalToken, onSubmitFeedback, consultantName, consultantEmail }: ProposalDeclinedProps) {
  const firstName = customerName.split(" ")[0];
  const [feedback, setFeedback] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit() {
    if (feedback.trim()) {
      onSubmitFeedback(feedback);
    }
    setSubmitted(true);
  }

  return (
    <div className="pb-16 pt-16 text-center">
      {/* Icon */}
      <div
        className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full"
        style={{
          background: "var(--bg-warm)",
          border: "1px solid var(--border)",
          animation: "fadeInUp 0.6s ease 0.1s forwards",
          opacity: 0,
        }}
      >
        <svg className="h-7 w-7" style={{ color: "var(--text-4)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
      </div>

      {/* Title */}
      <h1
        className="mb-3 font-[var(--font-heading)]"
        style={{
          fontSize: "clamp(24px, 3vw, 32px)",
          fontWeight: 400,
          color: "var(--text-1)",
          animation: "fadeInUp 0.6s ease 0.25s forwards",
          opacity: 0,
        }}
      >
        Thanks for letting us know
      </h1>

      <p
        className="mx-auto mb-8 max-w-[400px] text-[15px]"
        style={{
          color: "var(--text-2)",
          animation: "fadeInUp 0.6s ease 0.4s forwards",
          opacity: 0,
        }}
      >
        No worries at all, {firstName}. If anything changes in the future, I&apos;m always here.
      </p>

      {/* Feedback card */}
      <div
        className="mx-auto mb-8 max-w-[440px] rounded-xl border p-8 text-left"
        style={{
          borderColor: "var(--border)",
          background: "var(--bg-card)",
          boxShadow: "var(--shadow-md)",
          animation: "fadeInUp 0.6s ease 0.55s forwards",
          opacity: 0,
        }}
      >
        {!submitted ? (
          <>
            <h3 className="mb-1 text-[14px] font-semibold" style={{ color: "var(--text-1)" }}>
              Anything I could do differently?
            </h3>
            <p className="mb-4 text-[13px]" style={{ color: "var(--text-3)" }}>
              Completely optional — but it helps me improve.
            </p>
            <textarea
              aria-label="Feedback"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Your thoughts..."
              className="mb-3 w-full resize-none rounded-lg border px-4 py-3 text-[14px] outline-none transition-all"
              style={{
                minHeight: "120px",
                borderColor: "var(--border)",
                background: "var(--bg)",
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "var(--amber)";
                e.target.style.boxShadow = "0 0 0 3px var(--amber-dim)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "var(--border)";
                e.target.style.boxShadow = "none";
              }}
            />
            <button
              onClick={handleSubmit}
              className="rounded-lg px-5 py-2.5 text-[13px] font-medium transition-colors"
              style={{
                background: "var(--bg-warm)",
                border: "1px solid var(--border)",
                color: "var(--text-2)",
              }}
            >
              Send Feedback
            </button>
          </>
        ) : (
          <div className="py-4 text-center">
            <p className="text-[14px] font-medium" style={{ color: "var(--green)" }}>
              Thanks for the feedback — it genuinely helps.
            </p>
          </div>
        )}
      </div>

      {/* Changed your mind */}
      <div
        style={{ animation: "fadeInUp 0.6s ease 0.7s forwards", opacity: 0 }}
      >
        <div className="my-6 flex items-center gap-3 text-[12px]" style={{ color: "var(--text-4)" }}>
          <div className="h-px flex-1" style={{ background: "var(--border)" }} />
          <span>Changed your mind?</span>
          <div className="h-px flex-1" style={{ background: "var(--border)" }} />
        </div>

        <a
          href={`/portal/${proposalToken}`}
          className="group mx-auto flex max-w-[320px] items-center justify-center gap-2 rounded-lg border px-6 py-3 text-[14px] font-medium transition-colors"
          style={{
            borderColor: "var(--amber-border)",
            color: "var(--amber)",
            background: "transparent",
          }}
        >
          <span>View Proposal Again</span>
          <svg className="h-4 w-4 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </a>
      </div>

      {/* Contact section */}
      <div
        className="mt-10 border-t pt-8"
        style={{
          borderColor: "var(--border-light)",
          animation: "fadeInUp 0.6s ease 0.85s forwards",
          opacity: 0,
        }}
      >
        <p className="font-[var(--font-heading)] text-[18px]" style={{ color: "var(--text-1)" }}>{consultantName ?? "Your Consultant"}</p>
        <div className="mt-2 flex flex-col items-center gap-1 text-[13px]" style={{ color: "var(--text-3)" }}>
          {consultantEmail && (
            <a href={`mailto:${consultantEmail}`} className="transition-colors hover:underline" style={{ color: "var(--text-3)" }}>{consultantEmail}</a>
          )}
          {process.env.NEXT_PUBLIC_CONTACT_PHONE && (
            <a href={`tel:${process.env.NEXT_PUBLIC_CONTACT_PHONE.replace(/\s/g, "")}`} className="transition-colors hover:underline" style={{ color: "var(--text-3)" }}>{process.env.NEXT_PUBLIC_CONTACT_PHONE}</a>
          )}
        </div>
      </div>
    </div>
  );
}
