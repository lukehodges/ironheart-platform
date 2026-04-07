"use client";

import { useEffect, useRef, useState } from "react";
import type { ProposalRecord, MilestoneRecord } from "@/modules/client-portal/client-portal.types";
import type { ProposalDeliverable, PaymentScheduleItem } from "@/modules/client-portal/client-portal.types";

interface ProposalViewProps {
  proposal: ProposalRecord & {
    engagement: {
      id: string;
      title: string;
      customerId: string;
      status: string;
    };
    milestones: MilestoneRecord[];
  };
  customerName: string;
  onApprove: () => void;
  onDecline: () => void;
  disabled?: boolean;
}

export function ProposalView({ proposal, customerName, onApprove, onDecline }: ProposalViewProps) {
  const revealRef = useRef<HTMLDivElement>(null);

  // Intersection Observer for scroll-triggered reveal animations
  useEffect(() => {
    if (!revealRef.current) return;
    const elements = revealRef.current.querySelectorAll(".reveal");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
    );
    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const firstName = customerName.split(" ")[0];
  const formattedPrice = new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 0,
  });

  return (
    <div ref={revealRef}>
      {/* Hero */}
      <div
        className="relative pb-14 pt-[72px] text-center"
        style={{ animation: "fadeInUp 0.6s ease forwards" }}
      >
        {/* Radial glow */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: "radial-gradient(ellipse 80% 50% at 50% 20%, rgba(184,134,62,0.04), transparent)",
          }}
        />
        <div className="relative">
          {/* Meta line */}
          <p
            className="mb-6 text-[12px] font-medium uppercase tracking-[0.15em]"
            style={{ color: "var(--text-4)" }}
          >
            Proposal
          </p>

          {/* Title */}
          <h1
            className="mx-auto mb-6 max-w-[560px] font-[var(--font-heading)]"
            style={{
              fontSize: "clamp(28px, 4vw, 42px)",
              fontWeight: 400,
              lineHeight: 1.25,
            }}
          >
            {proposal.engagement.title}
          </h1>

          {/* Greeting */}
          <p className="mb-8 text-[15px]" style={{ color: "var(--text-2)" }}>
            Hi {firstName} — here&apos;s everything we discussed.
          </p>

          {/* Date and ref */}
          <div className="flex items-center justify-center gap-4 text-[13px]" style={{ color: "var(--text-3)" }}>
            <span>Prepared {new Date(proposal.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</span>
            <span style={{ color: "var(--border)" }}>|</span>
            <span>Ref: PRO-{new Date(proposal.createdAt).getFullYear()}-{proposal.id.slice(-4).toUpperCase()}</span>
            <span style={{ color: "var(--border)" }}>|</span>
            <span>Valid for 30 days</span>
          </div>
        </div>
      </div>

      {/* Ornamental divider */}
      <div className="relative my-10 flex items-center justify-center">
        <div className="h-px w-full" style={{ background: "var(--border)" }} />
        <div
          className="absolute h-1.5 w-1.5 rounded-full"
          style={{ background: "var(--amber-light)" }}
        />
      </div>

      {/* Problem Statement section */}
      {proposal.problemStatement && (
        <section className="reveal mb-12 opacity-0 transition-all duration-700 ease-out translate-y-5 [&.visible]:opacity-100 [&.visible]:translate-y-0">
          <h2
            className="mb-4 text-[12px] font-semibold uppercase tracking-[0.15em]"
            style={{ color: "var(--amber)" }}
          >
            The Problem
          </h2>
          <blockquote
            className="border-l-2 pl-5 text-[16px] leading-[1.85]"
            style={{
              borderColor: "var(--amber)",
              color: "var(--text-1)",
              fontFamily: "var(--font-heading)",
              fontStyle: "italic",
              fontWeight: 300,
              background: "rgba(184,134,62,0.04)",
              padding: "20px 20px 20px 24px",
              borderRadius: "0 6px 6px 0",
            }}
          >
            &ldquo;{proposal.problemStatement}&rdquo;
          </blockquote>
        </section>
      )}

      {/* Scope section */}
      {proposal.scope && (
        <section className="reveal mb-12 opacity-0 transition-all duration-700 ease-out translate-y-5 [&.visible]:opacity-100 [&.visible]:translate-y-0">
          <h2
            className="mb-2 text-[12px] font-semibold uppercase tracking-[0.15em]"
            style={{ color: "var(--amber)" }}
          >
            Scope
          </h2>
          <div
            className="text-[15px] leading-[1.8] [&_p]:mb-4"
            style={{ color: "var(--text-2)" }}
            dangerouslySetInnerHTML={{ __html: proposal.scope }}
          />
        </section>
      )}

      {/* Deliverables section */}
      {proposal.deliverables && proposal.deliverables.length > 0 && (
        <section className="reveal mb-12 opacity-0 transition-all duration-700 ease-out translate-y-5 [&.visible]:opacity-100 [&.visible]:translate-y-0">
          <h2
            className="mb-6 text-[12px] font-semibold uppercase tracking-[0.15em]"
            style={{ color: "var(--amber)" }}
          >
            Deliverables
          </h2>
          <div className="flex flex-col gap-3">
            {proposal.deliverables.map((item: ProposalDeliverable, i: number) => (
              <div
                key={i}
                className="grid gap-4 rounded-lg border p-4"
                style={{
                  gridTemplateColumns: "40px 1fr",
                  borderColor: "var(--border)",
                  background: "var(--bg-card)",
                }}
              >
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-full text-[13px] font-semibold"
                  style={{
                    border: "2px solid var(--amber-border)",
                    color: "var(--amber)",
                    background: "var(--amber-dim)",
                  }}
                >
                  {i + 1}
                </div>
                <div>
                  <h3 className="mb-0.5 text-[14px] font-semibold" style={{ color: "var(--text-1)" }}>
                    {item.title}
                  </h3>
                  <p className="text-[13px] leading-[1.6]" style={{ color: "var(--text-3)" }}>
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Exclusions section */}
      {proposal.exclusions && proposal.exclusions.length > 0 && (
        <section className="reveal mb-12 opacity-0 transition-all duration-700 ease-out translate-y-5 [&.visible]:opacity-100 [&.visible]:translate-y-0">
          <h2
            className="mb-4 text-[12px] font-semibold uppercase tracking-[0.15em]"
            style={{ color: "var(--amber)" }}
          >
            What&apos;s Not Included
          </h2>
          <div
            className="rounded-xl border p-5"
            style={{ borderColor: "var(--border)", background: "var(--bg-card)" }}
          >
            <ul className="flex flex-col gap-2.5">
              {proposal.exclusions.map((ex, i) => (
                <li key={i} className="flex items-start gap-3 text-[14px]" style={{ color: "var(--text-3)" }}>
                  <span className="mt-0.5 shrink-0" style={{ color: "var(--text-4)" }}>—</span>
                  {ex}
                </li>
              ))}
            </ul>
            <p
              className="mt-4 pt-4 text-[12px] leading-[1.6]"
              style={{ borderTop: "1px solid var(--border)", color: "var(--text-4)" }}
            >
              Any additional work identified during the project will be discussed and priced separately before proceeding.
            </p>
          </div>
        </section>
      )}

      {/* Requirements section */}
      {proposal.requirements && proposal.requirements.length > 0 && (
        <section className="reveal mb-12 opacity-0 transition-all duration-700 ease-out translate-y-5 [&.visible]:opacity-100 [&.visible]:translate-y-0">
          <h2
            className="mb-4 text-[12px] font-semibold uppercase tracking-[0.15em]"
            style={{ color: "var(--amber)" }}
          >
            What We Need From You
          </h2>
          <div
            className="rounded-xl border p-5"
            style={{ borderColor: "var(--border)", background: "var(--bg-card)" }}
          >
            <ul className="flex flex-col gap-3">
              {proposal.requirements.map((req, i) => (
                <li key={i} className="flex items-start gap-3 text-[14px]" style={{ color: "var(--text-2)" }}>
                  <div
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold"
                    style={{ border: "1.5px solid var(--amber-border)", color: "var(--amber)", background: "var(--amber-dim)", marginTop: "1px" }}
                  >
                    {i + 1}
                  </div>
                  {req}
                </li>
              ))}
            </ul>
            <p
              className="mt-4 pt-4 text-[12px]"
              style={{ borderTop: "1px solid var(--border)", color: "var(--text-4)" }}
            >
              Please provide the above within 2 business days of kickoff. Delays may affect the timeline.
            </p>
          </div>
        </section>
      )}

      {/* Timeline section */}
      {proposal.milestones && proposal.milestones.length > 0 && (
        <section className="reveal mb-12 opacity-0 transition-all duration-700 ease-out translate-y-5 [&.visible]:opacity-100 [&.visible]:translate-y-0">
          <h2
            className="mb-6 text-[12px] font-semibold uppercase tracking-[0.15em]"
            style={{ color: "var(--amber)" }}
          >
            Timeline
          </h2>
          <div className="relative pl-6">
            {/* Track line */}
            <div
              className="absolute bottom-2 left-[5px] top-2 w-[2px]"
              style={{
                background: "linear-gradient(to bottom, var(--amber-light), var(--border))",
              }}
            />
            <div className="flex flex-col gap-6">
              {proposal.milestones.map((milestone: MilestoneRecord, i: number) => {
                const isActive = milestone.status === "IN_PROGRESS";
                const isComplete = milestone.status === "COMPLETED";
                return (
                  <div key={milestone.id} className="relative">
                    {/* Dot */}
                    <div
                      className="absolute -left-6 top-1 h-[11px] w-[11px] rounded-full"
                      style={{
                        background: isActive || isComplete ? "var(--amber)" : "var(--bg-card)",
                        border: `2px solid ${isActive || isComplete ? "var(--amber)" : "var(--border)"}`,
                      }}
                    />
                    <div>
                      <div className="mb-1 flex items-center gap-2">
                        <h3 className="text-[14px] font-semibold" style={{ color: "var(--text-1)" }}>
                          {milestone.title}
                        </h3>
                        {isActive && (
                          <span
                            className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase"
                            style={{ background: "var(--amber-dim)", color: "var(--amber)", border: "1px solid var(--amber-border)" }}
                          >
                            Current
                          </span>
                        )}
                      </div>
                      {milestone.description && (
                        <p className="mb-1 text-[13px]" style={{ color: "var(--text-3)" }}>
                          {milestone.description}
                        </p>
                      )}
                      {milestone.dueDate && (
                        <p className="text-[12px]" style={{ color: "var(--text-4)" }}>
                          Due {new Date(milestone.dueDate).toLocaleDateString("en-GB", { day: "numeric", month: "long" })}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ROI section */}
      {proposal.roiData && (
        <section className="reveal mb-12 opacity-0 transition-all duration-700 ease-out translate-y-5 [&.visible]:opacity-100 [&.visible]:translate-y-0">
          <h2
            className="mb-6 text-[12px] font-semibold uppercase tracking-[0.15em]"
            style={{ color: "var(--amber)" }}
          >
            Return on Investment
          </h2>
          <div
            className="overflow-hidden rounded-xl border"
            style={{ borderColor: "var(--border)" }}
          >
            {(() => {
              const roi = proposal.roiData!;
              const annualValue = Math.round(roi.hoursPerWeek * roi.hourlyRate * 52 * (roi.automationPct / 100));
              const totalValue = annualValue + (roi.additionalValue ?? 0);
              const feeRatio = proposal.price > 0 && totalValue > 0 ? Math.round((proposal.price / totalValue) * 100) : null;
              const paybackMonths = proposal.price > 0 && totalValue > 0 ? Math.ceil((proposal.price / totalValue) * 12) : null;
              return (
                <>
                  <div style={{ borderBottom: "1px solid var(--border)" }}>
                    {[
                      ["Time currently spent", `${roi.hoursPerWeek} hrs / week`],
                      ["Percentage automated", `${roi.automationPct}%`],
                      ["Staff hourly cost", formattedPrice.format(roi.hourlyRate / 100)],
                      ["Annual time value recovered", `~${formattedPrice.format(annualValue / 100)} / year`],
                      ...(roi.additionalValue && roi.additionalValueLabel
                        ? [[roi.additionalValueLabel, `+${formattedPrice.format(roi.additionalValue / 100)} / year`]]
                        : []),
                    ].map(([label, value], i, arr) => (
                      <div
                        key={i}
                        className="flex items-center justify-between px-5 py-3"
                        style={{ borderBottom: i < arr.length - 1 ? "1px solid var(--border-light)" : undefined }}
                      >
                        <span className="text-[13px]" style={{ color: "var(--text-3)" }}>{label}</span>
                        <span className="text-[13px]" style={{ color: "var(--text-1)" }}>{value}</span>
                      </div>
                    ))}
                  </div>
                  <div className="px-5 py-4" style={{ background: "rgba(184,134,62,0.04)" }}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[13px] font-semibold" style={{ color: "var(--text-1)" }}>
                          Total annual value: {formattedPrice.format(totalValue / 100)}
                        </p>
                        {feeRatio !== null && paybackMonths !== null && (
                          <p className="text-[12px] mt-0.5" style={{ color: "var(--text-4)" }}>
                            Project fee is ~{feeRatio}% of year-one value — pays for itself in {paybackMonths} month{paybackMonths !== 1 ? "s" : ""}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </section>
      )}

      {/* Pricing section */}
      {proposal.price > 0 && (
        <section className="reveal mb-12 opacity-0 transition-all duration-700 ease-out translate-y-5 [&.visible]:opacity-100 [&.visible]:translate-y-0">
          <h2
            className="mb-6 text-[12px] font-semibold uppercase tracking-[0.15em]"
            style={{ color: "var(--amber)" }}
          >
            Pricing
          </h2>
          <div
            className="overflow-hidden rounded-xl border"
            style={{ borderColor: "var(--border)", boxShadow: "var(--shadow-md)" }}
          >
            {/* Total */}
            <div className="p-6 text-center" style={{ background: "var(--bg-card)" }}>
              <p className="mb-1 text-[12px] font-medium uppercase tracking-[0.1em]" style={{ color: "var(--text-3)" }}>
                Project Total
              </p>
              <p className="font-[var(--font-heading)]" style={{ fontSize: "36px", fontWeight: 300, color: "var(--text-1)" }}>
                {formattedPrice.format(proposal.price / 100)}
              </p>
            </div>

            {/* Payment schedule */}
            {proposal.paymentSchedule && proposal.paymentSchedule.length > 0 && (
              <div style={{ borderTop: "1px solid var(--border)" }}>
                <div className="px-6 pb-2 pt-4">
                  <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.1em]" style={{ color: "var(--text-4)" }}>
                    Payment Schedule
                  </p>
                </div>
                {proposal.paymentSchedule.map((item: PaymentScheduleItem, i: number) => (
                  <div
                    key={i}
                    className="flex items-center justify-between px-6 py-3"
                    style={{ borderTop: i > 0 ? "1px solid var(--border-light)" : undefined }}
                  >
                    <div>
                      <p className="text-[14px] font-medium" style={{ color: "var(--text-1)" }}>
                        {item.label}
                      </p>
                      <p className="text-[12px]" style={{ color: "var(--text-3)" }}>
                        {item.dueType === "ON_APPROVAL" && "Due on approval"}
                        {item.dueType === "ON_COMPLETION" && "Due on completion"}
                        {item.dueType === "ON_MILESTONE" && "Due on milestone"}
                        {item.dueType === "ON_DATE" && "Scheduled"}
                      </p>
                    </div>
                    <p className="font-[var(--font-heading)] text-[18px]" style={{ fontWeight: 400, color: "var(--text-1)" }}>
                      {formattedPrice.format(item.amount / 100)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Terms section */}
      {proposal.terms && (
        <section className="reveal mb-12 opacity-0 transition-all duration-700 ease-out translate-y-5 [&.visible]:opacity-100 [&.visible]:translate-y-0">
          <TermsCollapsible terms={proposal.terms} />
        </section>
      )}

      {/* CTA section */}
      <section
        className="pb-16 pt-4 text-center"
        style={{ animation: "fadeInUp 0.6s ease 0.4s forwards", opacity: 0 }}
      >
        {/* Approve button */}
        <button
          onClick={onApprove}
          className="group relative mx-auto mb-4 flex items-center justify-center gap-2 rounded-lg px-8 py-4 text-[15px] font-semibold text-white transition-transform hover:-translate-y-0.5"
          style={{
            background: "linear-gradient(135deg, var(--text-1) 0%, #2a2a2a 100%)",
            boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
            width: "100%",
            maxWidth: "380px",
          }}
        >
          <span className="relative z-10">Approve &amp; Get Started</span>
          <svg className="relative z-10 h-4 w-4 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </button>

        {/* Decline link */}
        <button
          onClick={onDecline}
          className="mb-6 text-[13px] transition-colors hover:underline"
          style={{ color: "var(--text-4)" }}
        >
          Not right now? Let me know
        </button>

        {/* Reassurance */}
        <div className="flex items-center justify-center gap-1.5 text-[12px]" style={{ color: "var(--green)" }}>
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          Secure link. Only you can view this proposal.
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 text-center text-[13px]" style={{ borderColor: "var(--border-light)", color: "var(--text-4)" }}>
        <p>Prepared by <span className="font-[var(--font-heading)]" style={{ color: "var(--text-2)" }}>Luke Hodges</span></p>
        <p className="mt-1">
          <a href="mailto:luke@lukehodges.uk" className="transition-colors hover:underline" style={{ color: "var(--text-4)" }}>
            luke@lukehodges.uk
          </a>
        </p>
      </footer>
    </div>
  );
}

// ── Terms Collapsible ───────────────────────────────────────────────────

function TermsCollapsible({ terms }: { terms: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between"
      >
        <h2
          className="text-[12px] font-semibold uppercase tracking-[0.15em]"
          style={{ color: "var(--amber)" }}
        >
          Terms &amp; Conditions
        </h2>
        <svg
          className="h-4 w-4 transition-transform duration-300"
          style={{
            color: "var(--text-4)",
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
          }}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div
        className="overflow-hidden transition-all duration-500"
        style={{
          maxHeight: isOpen ? "600px" : "0px",
          transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        <div
          className="pt-4 text-[13px] leading-[1.8]"
          style={{ color: "var(--text-3)" }}
          dangerouslySetInnerHTML={{ __html: terms }}
        />
      </div>
    </div>
  );
}
