"use client";

import { useState } from "react";

interface ProposalExpiredProps {
  onRequestNewLink: (email: string) => Promise<void>;
}

export function ProposalExpired({ onRequestNewLink }: ProposalExpiredProps) {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit() {
    if (!email.trim()) return;
    setSending(true);
    await onRequestNewLink(email);
    setSent(true);
    setSending(false);
  }

  return (
    <div
      className="flex min-h-[calc(100vh-65px)] flex-col items-center justify-center px-6 py-12 text-center"
      style={{ position: "relative" }}
    >
      {/* Radial glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(ellipse 60% 40% at 50% 35%, rgba(184,134,62,0.05), transparent)" }}
      />

      {/* Clock icon */}
      <div
        className="relative mb-5 flex h-[72px] w-[72px] items-center justify-center rounded-full"
        style={{
          background: "var(--bg-warm)",
          border: "1px solid var(--border)",
          animation: "fadeInUp 0.6s ease 0.1s forwards",
          opacity: 0,
        }}
      >
        <svg className="h-8 w-8" style={{ color: "var(--text-4)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <circle cx="12" cy="12" r="10" />
          <path strokeLinecap="round" d="M12 6v6l4 2" />
        </svg>
      </div>

      {/* Title */}
      <h1
        className="mb-3 font-[var(--font-heading)]"
        style={{
          fontSize: "clamp(24px, 3vw, 32px)",
          fontWeight: 400,
          color: "var(--text-1)",
          animation: "fadeInUp 0.6s ease 0.2s forwards",
          opacity: 0,
        }}
      >
        This link has expired
      </h1>

      <p
        className="mx-auto mb-8 max-w-[380px] text-[15px]"
        style={{
          color: "var(--text-2)",
          animation: "fadeInUp 0.6s ease 0.35s forwards",
          opacity: 0,
        }}
      >
        For your security, proposal links are only valid for a limited time.
      </p>

      {/* Request card */}
      <div
        className="relative w-full max-w-[400px] rounded-xl border p-8"
        style={{
          borderColor: "var(--border)",
          background: "var(--bg-card)",
          boxShadow: "var(--shadow-lg)",
          animation: "fadeInUp 0.6s ease 0.5s forwards",
          opacity: 0,
        }}
      >
        {!sent ? (
          <>
            <h3 className="mb-1 text-[14px] font-semibold" style={{ color: "var(--text-1)" }}>
              Request a new link
            </h3>
            <p className="mb-4 text-[13px]" style={{ color: "var(--text-3)" }}>
              Enter your email and we&apos;ll send a fresh link.
            </p>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="mb-3 w-full rounded-lg border px-4 py-3 text-[14px] outline-none transition-all"
              style={{
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
              disabled={sending || !email.trim()}
              className="group relative w-full overflow-hidden rounded-lg px-6 py-3 text-[14px] font-semibold text-white transition-transform hover:-translate-y-0.5 disabled:opacity-60 disabled:hover:translate-y-0"
              style={{
                background: "linear-gradient(135deg, var(--text-1) 0%, #2a2a2a 100%)",
                boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
              }}
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                {sending ? "Sending..." : "Send New Link"}
                {!sending && (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                )}
              </span>
            </button>
          </>
        ) : (
          <div className="py-4 text-center">
            <div
              className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full"
              style={{ background: "var(--green-light)", border: "1px solid var(--green-border)" }}
            >
              <svg className="h-5 w-5" style={{ color: "var(--green)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h4 className="mb-1 text-[15px] font-medium" style={{ color: "var(--text-1)" }}>
              Link sent!
            </h4>
            <p className="text-[13px]" style={{ color: "var(--text-3)" }}>
              Check your inbox for a new proposal link.
            </p>
          </div>
        )}
      </div>

      {/* Contact */}
      <div
        className="mt-8"
        style={{ animation: "fadeInUp 0.6s ease 0.65s forwards", opacity: 0 }}
      >
        <div className="mb-3 flex items-center gap-3 text-[12px]" style={{ color: "var(--text-4)" }}>
          <div className="h-px w-12" style={{ background: "var(--border)" }} />
          <span>Need help?</span>
          <div className="h-px w-12" style={{ background: "var(--border)" }} />
        </div>
        <div className="flex items-center justify-center gap-4 text-[13px]" style={{ color: "var(--text-3)" }}>
          <a href="mailto:luke@lukehodges.uk" className="transition-colors hover:underline">luke@lukehodges.uk</a>
        </div>
      </div>

      {/* Brand footer */}
      <div
        className="mt-10 flex items-center justify-center gap-2"
        style={{ animation: "fadeInUp 0.6s ease 0.8s forwards", opacity: 0 }}
      >
        <div
          className="flex h-[22px] w-[22px] items-center justify-center rounded-md text-[10px] font-semibold text-white"
          style={{ background: "linear-gradient(135deg, var(--amber) 0%, var(--amber-bright) 100%)" }}
        >
          L
        </div>
        <span className="text-[13px] font-medium" style={{ color: "var(--text-3)" }}>Luke Hodges</span>
      </div>
    </div>
  );
}
