"use client"

import { useEffect, useState } from "react"
import { api } from "@/lib/trpc/react"
import type { OnboardingPlan } from "@/modules/onboarding/onboarding.types"

interface PlanPreviewModalProps {
  engagementId: string
  onClose: () => void
}

export function PlanPreviewModal({ engagementId, onClose }: PlanPreviewModalProps) {
  const utils = api.useUtils()
  const [plan, setPlan] = useState<OnboardingPlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [planError, setPlanError] = useState<string | null>(null)

  const planMutation = api.onboarding.planForms.useMutation()
  const approveMutation = api.onboarding.approvePlan.useMutation({
    onSuccess: () => {
      utils.onboarding.getActivity.invalidate({ engagementId })
      onClose()
    },
    onError: (err) => {
      alert(`Approval failed: ${err.message}`)
    },
  })

  useEffect(() => {
    planMutation.mutate(
      { engagementId },
      {
        onSuccess: (data) => {
          setPlan(data)
          setLoading(false)
        },
        onError: (err) => {
          setPlanError(err.message)
          setLoading(false)
        },
      },
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        background: "rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        className="ih-card"
        style={{
          maxWidth: 640,
          width: "100%",
          maxHeight: "80vh",
          overflowY: "auto",
          background: "var(--ih-surface)",
          padding: 0,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal header */}
        <div style={{ padding: "24px 24px 20px", borderBottom: "1px solid var(--ih-line)" }}>
          <h2
            className="ih-serif"
            style={{ fontSize: 22, margin: 0, color: "var(--ih-ink)" }}
          >
            Onboarding plan preview
          </h2>
          <p style={{ fontSize: 13, color: "var(--ih-ink-50)", marginTop: 6, lineHeight: 1.5 }}>
            Forms that will be sent based on the current chart. No emails fire from this approval
            yet — Phase 0.2 wires the actual sending.
          </p>
        </div>

        {/* Modal body */}
        <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
          {loading && (
            <div style={{ fontSize: 13, color: "var(--ih-ink-50)" }}>Calculating plan…</div>
          )}

          {planError && (
            <div
              style={{
                borderRadius: 6,
                border: "1px solid var(--ih-danger)",
                background: "rgba(209,58,31,0.06)",
                padding: 12,
                fontSize: 13,
                color: "var(--ih-danger)",
              }}
            >
              Failed to load plan: {planError}
            </div>
          )}

          {plan && (
            <>
              {/* Summary row */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 16, fontSize: 13 }}>
                <div>
                  <span style={{ color: "var(--ih-ink-50)" }}>Tier: </span>
                  <span className="ih-mono" style={{ fontSize: 12 }}>{plan.tier}</span>
                </div>
                <div>
                  <span style={{ color: "var(--ih-ink-50)" }}>Total sends: </span>
                  <span className="ih-mono" style={{ fontSize: 12 }}>{plan.totalSends}</span>
                </div>
                <div>
                  <span style={{ color: "var(--ih-ink-50)" }}>Unfilled sample slots: </span>
                  <span className="ih-mono" style={{ fontSize: 12 }}>{plan.unfilledSampleSlots.length}</span>
                </div>
              </div>

              {/* Unfilled sample slots warning */}
              {plan.unfilledSampleSlots.length > 0 && (
                <div
                  style={{
                    borderRadius: 6,
                    border: "1px solid rgba(184,134,11,0.4)",
                    background: "rgba(184,134,11,0.06)",
                    padding: 12,
                    fontSize: 13,
                  }}
                >
                  <p style={{ fontWeight: 600, color: "var(--ih-warn)", marginBottom: 6 }}>Unfilled sample slots</p>
                  <ul style={{ color: "var(--ih-ink-65)", display: "flex", flexDirection: "column", gap: 2, paddingLeft: 0, listStyle: "none", margin: 0 }}>
                    {plan.unfilledSampleSlots.map((slot) => (
                      <li key={slot.nodeId}>
                        {slot.deptLabel}: needs {slot.needed} more named person
                        {slot.needed === 1 ? "" : "s"}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Planned sends list */}
              <div>
                <p className="ih-eyebrow" style={{ marginBottom: 8 }}>
                  Planned sends ({plan.sends.length})
                </p>
                {plan.sends.length === 0 ? (
                  <p style={{ fontSize: 13, color: "var(--ih-ink-50)", fontStyle: "italic" }}>
                    No sends planned — add named persons to ALL/SAMPLE nodes.
                  </p>
                ) : (
                  <ul style={{ display: "flex", flexDirection: "column", gap: 0, fontSize: 13, margin: 0, padding: 0, listStyle: "none" }}>
                    {plan.sends.map((send) => (
                      <li
                        key={send.nodeId}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          borderBottom: "1px solid var(--ih-line)",
                          paddingBottom: 6,
                          paddingTop: 6,
                        }}
                      >
                        <span>
                          <span style={{ fontWeight: 500, color: "var(--ih-ink)" }}>{send.contactName}</span>{" "}
                          <span style={{ color: "var(--ih-ink-50)" }}>({send.contactEmail})</span>
                        </span>
                        <span className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)" }}>
                          {send.templateSlug}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}
        </div>

        {/* Modal footer */}
        <div
          style={{
            padding: "16px 24px",
            borderTop: "1px solid var(--ih-line)",
            display: "flex",
            gap: 8,
            justifyContent: "flex-end",
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: "7px 16px",
              fontSize: 13,
              borderRadius: 6,
              border: "1px solid var(--ih-line)",
              background: "var(--ih-surface)",
              color: "var(--ih-ink)",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => approveMutation.mutate({ engagementId })}
            disabled={!plan || approveMutation.isPending}
            style={{
              padding: "7px 16px",
              fontSize: 13,
              borderRadius: 6,
              background: "var(--ih-accent)",
              border: "none",
              color: "#fff",
              cursor: !plan || approveMutation.isPending ? "not-allowed" : "pointer",
              opacity: !plan || approveMutation.isPending ? 0.5 : 1,
            }}
          >
            {approveMutation.isPending ? "Approving…" : "Approve plan"}
          </button>
        </div>
      </div>
    </div>
  )
}
