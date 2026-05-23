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
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-background border border-border rounded-lg shadow-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal header */}
        <div className="p-6 border-b border-border">
          <h2 className="font-serif text-xl">Onboarding plan preview</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Forms that will be sent based on the current chart. No emails fire from this approval
            yet — Phase 0.2 wires the actual sending.
          </p>
        </div>

        {/* Modal body */}
        <div className="p-6 space-y-4">
          {loading && (
            <div className="text-sm text-muted-foreground">Calculating plan…</div>
          )}

          {planError && (
            <div className="rounded border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
              Failed to load plan: {planError}
            </div>
          )}

          {plan && (
            <>
              {/* Summary row */}
              <div className="flex flex-wrap gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Tier: </span>
                  <span className="font-mono">{plan.tier}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Total sends: </span>
                  <span className="font-mono">{plan.totalSends}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Unfilled sample slots: </span>
                  <span className="font-mono">{plan.unfilledSampleSlots.length}</span>
                </div>
              </div>

              {/* Unfilled sample slots warning */}
              {plan.unfilledSampleSlots.length > 0 && (
                <div className="rounded border border-amber-300 bg-amber-50 p-3 text-sm">
                  <p className="font-medium text-amber-900 mb-1">Unfilled sample slots</p>
                  <ul className="text-amber-800 space-y-0.5">
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
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
                  Planned sends ({plan.sends.length})
                </p>
                {plan.sends.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No sends planned — add named persons to ALL/SAMPLE nodes.
                  </p>
                ) : (
                  <ul className="space-y-1 text-sm">
                    {plan.sends.map((send) => (
                      <li
                        key={send.nodeId}
                        className="flex justify-between border-b border-border pb-1"
                      >
                        <span>
                          <span className="font-medium">{send.contactName}</span>{" "}
                          <span className="text-muted-foreground">({send.contactEmail})</span>
                        </span>
                        <span className="font-mono text-xs text-muted-foreground">
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
        <div className="p-6 border-t border-border flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-md border border-border hover:bg-muted"
          >
            Cancel
          </button>
          <button
            onClick={() => approveMutation.mutate({ engagementId })}
            disabled={!plan || approveMutation.isPending}
            className="px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {approveMutation.isPending ? "Approving…" : "Approve plan"}
          </button>
        </div>
      </div>
    </div>
  )
}
