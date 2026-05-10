"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  CheckCircle2,
  Circle,
  Clock,
  CalendarDays,
  MessageSquare,
  ThumbsUp,
  RotateCcw,
} from "lucide-react"
import { cn } from "@/lib/utils"

// ---------------------------------------------------------------------------
// Placeholder milestone data — will come from api.consultingClient.getProgress
// ---------------------------------------------------------------------------

type MilestoneStatus = "delivered" | "in-progress" | "upcoming"

interface Milestone {
  id: string
  title: string
  status: MilestoneStatus
  date: string
  description?: string
}

interface Deliverable {
  id: string
  title: string
  description: string
  readyForApproval: boolean
  approved: boolean
}

const MOCK_MILESTONES: Milestone[] = [
  {
    id: "1",
    title: "Kick-off & Discovery",
    status: "delivered",
    date: "15 Jan 2026",
    description: "Initial engagement setup, stakeholder mapping, and discovery sessions completed.",
  },
  {
    id: "2",
    title: "Audit Delivery",
    status: "delivered",
    date: "12 Feb 2026",
    description: "Full five-lens audit completed and report published.",
  },
  {
    id: "3",
    title: "Implementation Planning",
    status: "in-progress",
    date: "28 Feb 2026",
    description: "Prioritising findings and building a 90-day action plan with your leadership team.",
  },
  {
    id: "4",
    title: "Phase 1 Delivery — Revenue & Ops",
    status: "upcoming",
    date: "30 Apr 2026",
    description: "Pricing model standardisation and project brief framework rollout.",
  },
  {
    id: "5",
    title: "Phase 2 Delivery — Tech & Team",
    status: "upcoming",
    date: "30 Jun 2026",
    description: "CRM integration, SOP documentation, and performance review process implementation.",
  },
  {
    id: "6",
    title: "Handover & Retainer",
    status: "upcoming",
    date: "31 Jul 2026",
  },
]

const MOCK_UPDATE = {
  date: "24 Feb 2026",
  title: "Implementation Planning Update",
  body: "We have completed the prioritisation workshop with your leadership team. The 90-day action plan focuses on Revenue (pricing model) and Ops (project briefs) as the highest-impact, lowest-effort improvements. Draft plan attached for your review before we begin execution on 1 March.",
}

const MOCK_DELIVERABLES: Deliverable[] = [
  {
    id: "d1",
    title: "90-Day Implementation Plan",
    description: "Prioritised action plan covering Revenue and Ops improvements with timelines, owners, and success metrics.",
    readyForApproval: true,
    approved: false,
  },
  {
    id: "d2",
    title: "Standardised Pricing Model v1",
    description: "New pricing framework for consistent quoting across all service lines.",
    readyForApproval: false,
    approved: false,
  },
]

const STATUS_ICON: Record<MilestoneStatus, React.ReactNode> = {
  delivered: <CheckCircle2 className="h-5 w-5 text-[#2F6F5C]" />,
  "in-progress": <Clock className="h-5 w-5 text-[#B8860B]" />,
  upcoming: <Circle className="h-5 w-5 text-stone-300" />,
}

const STATUS_LABEL: Record<MilestoneStatus, { label: string; className: string }> = {
  delivered: {
    label: "Delivered",
    className: "bg-emerald-50 text-[#2F6F5C] border-emerald-200",
  },
  "in-progress": {
    label: "In Progress",
    className: "bg-amber-50 text-[#B8860B] border-amber-200",
  },
  upcoming: {
    label: "Upcoming",
    className: "bg-stone-50 text-stone-500 border-stone-200",
  },
}

export default function ProgressPage() {
  const milestones = MOCK_MILESTONES
  const latestUpdate = MOCK_UPDATE
  const deliverables = MOCK_DELIVERABLES

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-serif text-3xl text-stone-900">
          Implementation Progress
        </h1>
        <p className="mt-1 text-stone-500">
          Northvale Engineering &middot; Tracking your transformation journey
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Milestone timeline — 2 cols */}
        <div className="lg:col-span-2">
          <Card className="border-stone-200 bg-white">
            <CardHeader>
              <CardTitle className="text-base text-stone-700">
                Milestones
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 pb-2">
              {milestones.map((milestone, idx) => {
                const statusCfg = STATUS_LABEL[milestone.status]
                const isLast = idx === milestones.length - 1
                return (
                  <div key={milestone.id} className="relative flex px-6">
                    {/* Timeline line + dot */}
                    <div className="mr-4 flex flex-col items-center">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center">
                        {STATUS_ICON[milestone.status]}
                      </div>
                      {!isLast && (
                        <div
                          className={cn(
                            "w-px flex-1",
                            milestone.status === "delivered"
                              ? "bg-[#2F6F5C]/30"
                              : "bg-stone-200"
                          )}
                        />
                      )}
                    </div>

                    {/* Content */}
                    <div className={cn("pb-6", isLast && "pb-4")}>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-stone-900">
                          {milestone.title}
                        </p>
                        <Badge className={statusCfg.className}>
                          {statusCfg.label}
                        </Badge>
                      </div>
                      <div className="mt-1 flex items-center gap-1 text-xs text-stone-400">
                        <CalendarDays className="h-3 w-3" />
                        {milestone.date}
                      </div>
                      {milestone.description && (
                        <p className="mt-2 text-sm leading-relaxed text-stone-500">
                          {milestone.description}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </div>

        {/* Right column — latest update */}
        <div className="space-y-6">
          <Card className="border-stone-200 bg-white">
            <CardHeader>
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-stone-500" />
                <CardTitle className="text-base text-stone-700">
                  Latest Update
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="mb-1 text-xs text-stone-400">
                {latestUpdate.date}
              </p>
              <p className="mb-3 text-sm font-semibold text-stone-900">
                {latestUpdate.title}
              </p>
              <p className="text-sm leading-relaxed text-stone-500">
                {latestUpdate.body}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Deliverable approvals */}
      <div>
        <h2 className="mb-4 font-serif text-lg text-stone-900">
          Deliverables
        </h2>
        <div className="space-y-3">
          {deliverables.map((d) => (
            <Card key={d.id} className="border-stone-200 bg-white">
              <CardContent className="flex items-center justify-between p-5">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-stone-900">
                      {d.title}
                    </p>
                    {d.readyForApproval && !d.approved && (
                      <Badge className="bg-amber-50 text-[#B8860B] border-amber-200">
                        Awaiting Approval
                      </Badge>
                    )}
                    {d.approved && (
                      <Badge className="bg-emerald-50 text-[#2F6F5C] border-emerald-200">
                        Approved
                      </Badge>
                    )}
                    {!d.readyForApproval && !d.approved && (
                      <Badge className="bg-stone-50 text-stone-500 border-stone-200">
                        In Progress
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-stone-500">
                    {d.description}
                  </p>
                </div>

                {d.readyForApproval && !d.approved && (
                  <div className="ml-4 flex shrink-0 gap-2">
                    <Button
                      size="sm"
                      className="gap-1.5 bg-[#2F6F5C] hover:bg-[#265c4c]"
                    >
                      <ThumbsUp className="h-3.5 w-3.5" />
                      Approve
                    </Button>
                    <Button size="sm" variant="outline" className="gap-1.5">
                      <RotateCcw className="h-3.5 w-3.5" />
                      Request Changes
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
