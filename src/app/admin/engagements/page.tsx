"use client"

import { useState } from "react"
import { Briefcase } from "lucide-react"
import { api } from "@/lib/trpc/react"
import { cn } from "@/lib/utils"
import { CreateEngagementDialog } from "@/components/consulting/create-engagement-dialog"
import { EngagementCard, EngagementCardSkeleton } from "@/components/consulting/engagement-card"

const STAGES = [
  { value: undefined, label: "All" },
  { value: "DISCOVERY" as const, label: "Discovery" },
  { value: "PROPOSAL" as const, label: "Proposal" },
  { value: "CONTRACTED" as const, label: "Contracted" },
  { value: "ONBOARDING" as const, label: "Onboarding" },
  { value: "AUDITING" as const, label: "Auditing" },
  { value: "REPORTING" as const, label: "Reporting" },
  { value: "IMPLEMENTING" as const, label: "Implementing" },
  { value: "RETAINER" as const, label: "Retainer" },
  { value: "CLOSED_WON" as const, label: "Won" },
  { value: "CLOSED_LOST" as const, label: "Lost" },
] as const

const STAGE_TAB_COLORS: Record<string, string> = {
  DISCOVERY: "bg-[#D13A1F] text-white",
  PROPOSAL: "bg-[#B8860B] text-white",
  CONTRACTED: "bg-[#2F6F5C] text-white",
  ONBOARDING: "bg-[#2F6F5C] text-white",
  AUDITING: "bg-[#2F6F5C] text-white",
  REPORTING: "bg-[#2F6F5C] text-white",
  IMPLEMENTING: "bg-[#2F6F5C] text-white",
  RETAINER: "bg-[#0E1013] text-white",
  CLOSED_WON: "bg-[#2F6F5C] text-white",
  CLOSED_LOST: "bg-[#0E1013]/60 text-white",
}

type StageFilter = (typeof STAGES)[number]["value"]

export default function EngagementsPage() {
  const [activeStage, setActiveStage] = useState<StageFilter>(undefined)
  const utils = api.useUtils()

  const engagements = api.consulting.list.useQuery({
    stage: activeStage,
    limit: 50,
  })

  function handleCreated() {
    utils.consulting.list.invalidate()
  }

  return (
    <div className="min-h-screen bg-[#EFEAE0]">
      <div className="max-w-5xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-serif text-3xl text-[#0E1013]">
              Your <em className="italic text-[#D13A1F]">Engagements</em>
            </h1>
            <p className="text-sm text-[#0E1013]/65 mt-1">
              Track clients through every stage of the consulting pipeline.
            </p>
          </div>
          <CreateEngagementDialog onCreated={handleCreated} />
        </div>

        {/* Stage filter tabs */}
        <div className="mt-8 flex flex-wrap gap-1.5">
          {STAGES.map((s) => {
            const isActive = activeStage === s.value
            const activeColor = s.value ? STAGE_TAB_COLORS[s.value] : "bg-[#0E1013] text-white"
            return (
              <button
                key={s.label}
                type="button"
                onClick={() => setActiveStage(s.value)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200",
                  isActive
                    ? activeColor
                    : "text-[#0E1013]/50 hover:text-[#0E1013]/80 hover:bg-[#0E1013]/5"
                )}
              >
                {s.label}
              </button>
            )
          })}
        </div>

        {/* Content */}
        <div className="mt-6 space-y-3">
          {engagements.isLoading ? (
            <>
              <EngagementCardSkeleton />
              <EngagementCardSkeleton />
              <EngagementCardSkeleton />
            </>
          ) : engagements.data && engagements.data.rows.length > 0 ? (
            engagements.data.rows.map((eng) => (
              <EngagementCard key={eng.id} engagement={eng} />
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-14 h-14 rounded-2xl bg-[#D13A1F]/10 flex items-center justify-center mb-4">
                <Briefcase className="h-6 w-6 text-[#D13A1F]" />
              </div>
              <h2 className="font-serif text-xl text-[#0E1013] mb-1">No engagements yet</h2>
              <p className="text-sm text-[#0E1013]/50 text-center max-w-sm mb-6">
                Create your first engagement to start tracking a client through the consulting pipeline.
              </p>
              <CreateEngagementDialog onCreated={handleCreated} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
