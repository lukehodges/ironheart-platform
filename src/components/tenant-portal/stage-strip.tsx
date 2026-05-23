"use client"

import type { EngagementStage } from "@/modules/client-portal/client-portal.types"

const STAGES: EngagementStage[] = [
  "DISCOVERY",
  "PROPOSAL",
  "CONTRACTED",
  "ONBOARDING",
  "AUDITING",
  "REPORTING",
  "IMPLEMENTING",
  "RETAINER",
]

const STAGE_LABELS: Record<EngagementStage, string> = {
  DISCOVERY: "Discovery",
  PROPOSAL: "Proposal",
  CONTRACTED: "Contracted",
  ONBOARDING: "Onboarding",
  AUDITING: "Auditing",
  REPORTING: "Reporting",
  IMPLEMENTING: "Implementing",
  RETAINER: "Retainer",
  CLOSED_WON: "Closed",
  CLOSED_LOST: "Closed",
}

export interface StageStripProps {
  currentStage: EngagementStage | null | undefined
}

export function StageStrip({ currentStage }: StageStripProps) {
  const currentIndex = currentStage ? STAGES.indexOf(currentStage) : -1

  return (
    <div
      className="rounded-lg border bg-card p-4"
      style={{ borderColor: "var(--ih-line)" }}
      data-testid="stage-strip"
    >
      <p
        className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3"
        style={{ letterSpacing: "0.1em", fontSize: 10 }}
      >
        Engagement Progress
      </p>
      <div className="flex items-center gap-0" style={{ overflowX: "auto" }}>
        {STAGES.map((stage, index) => {
          const isPast = currentIndex > index
          const isCurrent = currentIndex === index
          const isFuture = currentIndex < index

          return (
            <div
              key={stage}
              className="flex items-center"
              style={{ flexShrink: 0 }}
              data-testid={`stage-item-${stage}`}
            >
              {/* Stage pill */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                {/* Dot */}
                <div
                  data-testid={`stage-dot-${stage}`}
                  style={{
                    width: isCurrent ? 12 : 8,
                    height: isCurrent ? 12 : 8,
                    borderRadius: "50%",
                    background: isCurrent
                      ? "var(--ih-accent, #0ea5e9)"
                      : isPast
                        ? "var(--ih-ink-65, #6b7280)"
                        : "var(--ih-line, #e5e7eb)",
                    border: isCurrent
                      ? "2px solid var(--ih-accent, #0ea5e9)"
                      : "none",
                    flexShrink: 0,
                    transition: "all 0.15s ease",
                  }}
                  aria-label={
                    isCurrent
                      ? `${STAGE_LABELS[stage]} (current)`
                      : STAGE_LABELS[stage]
                  }
                />
                {/* Label */}
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: isCurrent ? 600 : 400,
                    color: isCurrent
                      ? "var(--ih-ink)"
                      : isPast
                        ? "var(--ih-ink-65)"
                        : "var(--ih-ink-30)",
                    whiteSpace: "nowrap",
                    textAlign: "center",
                  }}
                  data-current={isCurrent || undefined}
                  data-past={isPast || undefined}
                  data-future={isFuture || undefined}
                >
                  {STAGE_LABELS[stage]}
                </span>
              </div>

              {/* Connector line (not after last item) */}
              {index < STAGES.length - 1 && (
                <div
                  style={{
                    height: 1,
                    width: 24,
                    background:
                      isPast || isCurrent
                        ? "var(--ih-ink-40, #9ca3af)"
                        : "var(--ih-line, #e5e7eb)",
                    alignSelf: "flex-start",
                    marginTop: isCurrent ? 6 : 4,
                    flexShrink: 0,
                  }}
                  aria-hidden="true"
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
