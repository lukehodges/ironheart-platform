"use client"

import { useState } from "react"
import { api } from "@/lib/trpc/react"
import { ChartEditor } from "./chart-editor"

interface Props {
  engagementId: string
  engagementTitle: string
  companyLabel: string
  tenantSlug: string
}

export function ClientOnboardingShell({ engagementId, engagementTitle, companyLabel, tenantSlug }: Props) {
  const [dismissed, setDismissed] = useState(false)
  const utils = api.useUtils()

  const notifyMutation = api.onboarding.clientNotifyConsultantReady.useMutation({
    onSuccess: () => {
      utils.onboarding.clientGetActivity.invalidate({ engagementId })
      alert("Your consultant has been notified. Thank you!")
    },
    onError: (err) => {
      alert(`Failed to send notification: ${err.message}`)
    },
  })

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "var(--ih-bg)" }}>
      {!dismissed && (
        <div
          style={{
            background: "rgba(184,134,11,0.07)",
            borderBottom: "1px solid rgba(184,134,11,0.3)",
            padding: "10px 32px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
          }}
        >
          <div style={{ fontSize: 13, color: "var(--ih-ink)", maxWidth: 680, lineHeight: 1.5 }}>
            <strong style={{ color: "var(--ih-warn)" }}>Collaborative org chart.</strong>{" "}
            Your consultant has set up an initial chart. Add team members, edit roles, and confirm
            details. Interview plan settings are controlled by your consultant. When you&apos;re
            done, click <em>Notify consultant I&apos;m ready</em>.
          </div>
          <button
            onClick={() => setDismissed(true)}
            style={{
              fontSize: 11,
              color: "var(--ih-warn)",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              textDecoration: "underline",
              whiteSpace: "nowrap",
            }}
          >
            Got it
          </button>
        </div>
      )}

      <div style={{ flex: 1, overflow: "hidden" }}>
        <ChartEditor
          mode="client"
          engagementId={engagementId}
          engagementTitle={engagementTitle}
          companyLabel={companyLabel}
        />
      </div>

      <div
        style={{
          borderTop: "1px solid var(--ih-line)",
          padding: "10px 32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "var(--ih-surface-2)",
        }}
      >
        <p style={{ fontSize: 11, color: "var(--ih-ink-50)" }}>
          Working at{" "}
          <span className="ih-mono" style={{ fontSize: 11 }}>{tenantSlug}.ironheart.app</span>
        </p>
        <button
          onClick={() => notifyMutation.mutate({ engagementId })}
          disabled={notifyMutation.isPending}
          style={{
            borderRadius: 6,
            background: "var(--ih-accent)",
            border: "none",
            padding: "7px 16px",
            fontSize: 13,
            color: "#fff",
            cursor: notifyMutation.isPending ? "not-allowed" : "pointer",
            opacity: notifyMutation.isPending ? 0.6 : 1,
          }}
        >
          {notifyMutation.isPending ? "Notifying…" : "Notify consultant I'm ready"}
        </button>
      </div>
    </div>
  )
}
