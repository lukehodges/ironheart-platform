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
    <div className="flex h-full flex-col">
      {!dismissed && (
        <div className="bg-amber-50 border-b border-amber-200 px-8 py-3 flex items-center justify-between">
          <div className="text-sm text-amber-900 max-w-3xl">
            <strong>Collaborative org chart.</strong> Your consultant has set up an initial chart. Add team members,
            edit roles, and confirm details. Interview plan settings are controlled by your consultant.
            When you're done, click <em>Notify consultant I'm ready</em>.
          </div>
          <button
            onClick={() => setDismissed(true)}
            className="text-xs text-amber-700 hover:text-amber-900 underline whitespace-nowrap ml-4"
          >
            Got it
          </button>
        </div>
      )}

      <div className="flex-1 overflow-hidden">
        <ChartEditor
          mode="client"
          engagementId={engagementId}
          engagementTitle={engagementTitle}
          companyLabel={companyLabel}
        />
      </div>

      <div className="border-t border-border px-8 py-3 flex items-center justify-between bg-muted/30">
        <p className="text-xs text-muted-foreground">
          Working at <span className="font-mono">{tenantSlug}.ironheart.app</span>
        </p>
        <button
          onClick={() => notifyMutation.mutate({ engagementId })}
          disabled={notifyMutation.isPending}
          className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {notifyMutation.isPending ? "Notifying…" : "Notify consultant I'm ready"}
        </button>
      </div>
    </div>
  )
}
