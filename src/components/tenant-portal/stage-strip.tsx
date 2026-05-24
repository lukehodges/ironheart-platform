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
      className="ih-card"
      style={{ padding: 16 }}
      data-testid="stage-strip"
    >
      <p className="ih-eyebrow" style={{ marginBottom: 12 }}>
        Engagement Progress
      </p>
      <div style={{ display: "flex", alignItems: "center", overflowX: "auto" }}>
        {STAGES.map((stage, index) => {
          const isPast = currentIndex > index
          const isCurrent = currentIndex === index
          const isFuture = currentIndex < index

          return (
            <div
              key={stage}
              style={{ display: "flex", alignItems: "center", flexShrink: 0 }}
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
                      ? "var(--ih-accent)"
                      : isPast
                        ? "var(--ih-ok)"
                        : "var(--ih-line)",
                    border: isCurrent
                      ? "2px solid var(--ih-accent)"
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
                  className={isCurrent ? "ih-mono" : undefined}
                  style={{
                    fontSize: 10,
                    fontWeight: isCurrent ? 600 : 400,
                    color: isCurrent
                      ? "var(--ih-accent)"
                      : isPast
                        ? "var(--ih-ink-65)"
                        : "var(--ih-ink-30)",
                    whiteSpace: "nowrap",
                    textAlign: "center",
                    letterSpacing: isCurrent ? "0.06em" : 0,
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
                    background: isPast
                      ? "var(--ih-ok)"
                      : isCurrent
                        ? "var(--ih-accent)"
                        : "var(--ih-line)",
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
