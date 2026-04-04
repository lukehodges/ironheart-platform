"use client";

interface ProposalApprovedProps {
  customerName: string;
  engagementTitle: string;
  depositAmount?: number;
  sessionToken?: string;
}

export function ProposalApproved({
  customerName,
  engagementTitle,
  depositAmount,
  sessionToken,
}: ProposalApprovedProps) {
  const firstName = customerName.split(" ")[0];
  const formattedDeposit = depositAmount
    ? new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", minimumFractionDigits: 0 }).format(depositAmount / 100)
    : null;

  return (
    <div className="pb-16 pt-16 text-center">
      {/* Radial glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(ellipse 60% 40% at 50% 20%, rgba(61,138,90,0.06), transparent)" }}
      />

      {/* Success icon */}
      <div
        className="relative mx-auto mb-6 flex h-[72px] w-[72px] items-center justify-center rounded-full"
        style={{
          background: "var(--green-light)",
          border: "1px solid var(--green-border)",
          animation: "scaleIn 0.5s ease 0.1s forwards",
          opacity: 0,
        }}
      >
        <svg className="h-8 w-8" style={{ color: "var(--green)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <polyline
            points="6 12 10 16 18 8"
            style={{
              strokeDasharray: 24,
              strokeDashoffset: 24,
              animation: "checkDraw 0.5s ease 0.5s forwards",
            }}
          />
        </svg>
      </div>

      {/* Title */}
      <h1
        className="mb-3 font-[var(--font-heading)]"
        style={{
          fontSize: "clamp(28px, 3.5vw, 38px)",
          fontWeight: 400,
          color: "var(--text-1)",
          animation: "fadeInUp 0.6s ease 0.3s forwards",
          opacity: 0,
        }}
      >
        You&apos;re all set, {firstName}
      </h1>

      <p
        className="mb-10 text-[16px]"
        style={{
          color: "var(--text-2)",
          animation: "fadeInUp 0.6s ease 0.45s forwards",
          opacity: 0,
        }}
      >
        <strong style={{ color: "var(--text-1)" }}>{engagementTitle}</strong> is confirmed.
      </p>

      {/* What happens next */}
      <div
        className="mx-auto mb-8 max-w-[440px] overflow-hidden rounded-xl border text-left"
        style={{
          borderColor: "var(--border)",
          background: "var(--bg-card)",
          boxShadow: "var(--shadow-md)",
          animation: "fadeInUp 0.6s ease 0.6s forwards",
          opacity: 0,
        }}
      >
        <div className="border-b px-6 py-4" style={{ borderColor: "var(--border-light)" }}>
          <h3 className="text-[13px] font-semibold uppercase tracking-[0.1em]" style={{ color: "var(--text-3)" }}>
            What happens next
          </h3>
        </div>
        <div className="flex flex-col">
          {[
            { icon: "check", color: "green", title: "Confirmation email sent", desc: "Check your inbox for a copy of the approved proposal." },
            { icon: "clock", color: "amber", title: "Discovery call this week", desc: "I'll reach out to schedule our kickoff session." },
            { icon: "doc", color: "amber", title: "Contract & invoice", desc: "You'll receive a formal contract and first invoice." },
          ].map((step, i) => (
            <div
              key={i}
              className="flex items-start gap-4 border-b px-6 py-4 last:border-b-0"
              style={{ borderColor: "var(--border-light)" }}
            >
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                style={{
                  background: step.color === "green" ? "var(--green-light)" : "var(--amber-dim)",
                  border: step.color === "green" ? "1px solid var(--green-border)" : "1px solid var(--amber-border)",
                }}
              >
                {step.icon === "check" && (
                  <svg className="h-4 w-4" style={{ color: "var(--green)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
                {step.icon === "clock" && (
                  <svg className="h-4 w-4" style={{ color: "var(--amber)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
                  </svg>
                )}
                {step.icon === "doc" && (
                  <svg className="h-4 w-4" style={{ color: "var(--amber)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                )}
              </div>
              <div>
                <p className="text-[14px] font-semibold" style={{ color: "var(--text-1)" }}>{step.title}</p>
                <p className="text-[13px]" style={{ color: "var(--text-3)" }}>{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Deposit */}
      {formattedDeposit && (
        <div
          className="mx-auto mb-6 max-w-[440px] rounded-xl border p-6 text-center"
          style={{
            borderColor: "var(--amber-border)",
            background: "var(--bg-card)",
            animation: "fadeInUp 0.6s ease 0.75s forwards",
            opacity: 0,
          }}
        >
          <p className="mb-1 text-[12px] font-medium uppercase tracking-[0.1em]" style={{ color: "var(--text-3)" }}>
            Deposit Due
          </p>
          <p className="mb-4 font-[var(--font-heading)]" style={{ fontSize: "36px", fontWeight: 300, color: "var(--text-1)" }}>
            {formattedDeposit}
          </p>
          <button
            className="mx-auto rounded-lg px-8 py-3 text-[14px] font-semibold text-white transition-transform hover:-translate-y-0.5"
            style={{
              background: "linear-gradient(135deg, var(--amber) 0%, var(--amber-bright) 100%)",
              boxShadow: "0 4px 16px rgba(184,134,62,0.3)",
            }}
          >
            Pay Deposit
          </button>
          <p className="mt-3 flex items-center justify-center gap-1 text-[11px]" style={{ color: "var(--text-4)" }}>
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Secure payment via Stripe
          </p>
        </div>
      )}

      {/* Portal link */}
      <div
        style={{ animation: "fadeInUp 0.6s ease 0.9s forwards", opacity: 0 }}
      >
        <div className="my-6 flex items-center gap-3 text-[12px]" style={{ color: "var(--text-4)" }}>
          <div className="h-px flex-1" style={{ background: "var(--border)" }} />
          <span>or</span>
          <div className="h-px flex-1" style={{ background: "var(--border)" }} />
        </div>

        <a
          href={sessionToken ? "/portal/dashboard" : "#"}
          className="group mx-auto flex max-w-[380px] items-center justify-center gap-2 rounded-lg px-8 py-4 text-[15px] font-semibold text-white transition-transform hover:-translate-y-0.5"
          style={{
            background: "linear-gradient(135deg, var(--text-1) 0%, #2a2a2a 100%)",
            boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
          }}
        >
          <span>Go to Your Portal</span>
          <svg className="h-4 w-4 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </a>
      </div>

      {/* Footer */}
      <footer className="mt-12 text-[13px]" style={{ color: "var(--text-4)" }}>
        <p>
          Questions? <a href="mailto:luke@lukehodges.uk" className="underline transition-colors" style={{ color: "var(--amber)" }}>luke@lukehodges.uk</a>
        </p>
      </footer>

      <style jsx global>{`
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.8); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes checkDraw {
          to { stroke-dashoffset: 0; }
        }
      `}</style>
    </div>
  );
}
