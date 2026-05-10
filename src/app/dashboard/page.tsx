"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  Users,
  ClipboardList,
  CalendarCheck,
  TrendingUp,
  ArrowRight,
  CheckCircle2,
  Clock,
  AlertCircle,
} from "lucide-react"
import Link from "next/link"

// ---------------------------------------------------------------------------
// Placeholder data — will come from api.consultingClient.getEngagement
// ---------------------------------------------------------------------------

const MOCK_ENGAGEMENT = {
  clientName: "Sarah",
  companyName: "Northvale Engineering",
  engagementType: "Full Business Audit",
  stage: "AUDITING" as const,
}

const ENGAGEMENT_STAGES = [
  "ONBOARDING",
  "AUDITING",
  "REPORTING",
  "IMPLEMENTING",
  "RETAINER",
] as const

type StatusType = "action" | "pending" | "complete"

interface ActionCard {
  title: string
  description: string
  status: StatusType
  statusLabel: string
  icon: React.ReactNode
  href: string
  ctaLabel: string
}

const ACTION_CARDS: ActionCard[] = [
  {
    title: "Add Your Team",
    description: "Invite team members who will participate in the audit process.",
    status: "action",
    statusLabel: "Action needed",
    icon: <Users className="h-5 w-5" />,
    href: "/dashboard/team",
    ctaLabel: "Add team members",
  },
  {
    title: "Your Questionnaire",
    description: "Complete the pre-audit questionnaire to help us understand your business.",
    status: "pending",
    statusLabel: "Pending",
    icon: <ClipboardList className="h-5 w-5" />,
    href: "#",
    ctaLabel: "Fill questionnaire",
  },
  {
    title: "Book Your Audit Call",
    description: "Schedule your one-on-one audit session within the available window.",
    status: "action",
    statusLabel: "Action needed",
    icon: <CalendarCheck className="h-5 w-5" />,
    href: "#",
    ctaLabel: "Book a slot",
  },
  {
    title: "Team Progress",
    description: "See who has completed their questionnaire and booked their call.",
    status: "complete",
    statusLabel: "Complete",
    icon: <TrendingUp className="h-5 w-5" />,
    href: "/dashboard/team",
    ctaLabel: "View progress",
  },
]

const STATUS_CONFIG: Record<
  StatusType,
  { className: string; icon: React.ReactNode }
> = {
  action: {
    className: "bg-red-50 text-[#D13A1F] border-red-200",
    icon: <AlertCircle className="h-3 w-3" />,
  },
  pending: {
    className: "bg-amber-50 text-[#B8860B] border-amber-200",
    icon: <Clock className="h-3 w-3" />,
  },
  complete: {
    className: "bg-emerald-50 text-[#2F6F5C] border-emerald-200",
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
}

function getStageProgress(currentStage: string): number {
  const idx = ENGAGEMENT_STAGES.indexOf(
    currentStage as (typeof ENGAGEMENT_STAGES)[number]
  )
  if (idx === -1) return 0
  return Math.round(((idx + 1) / ENGAGEMENT_STAGES.length) * 100)
}

export default function DashboardPage() {
  const engagement = MOCK_ENGAGEMENT
  const progressValue = getStageProgress(engagement.stage)

  return (
    <div className="space-y-8">
      {/* Welcome section */}
      <div>
        <h1 className="font-serif text-3xl text-stone-900">
          Welcome, {engagement.clientName}
        </h1>
        <p className="mt-1 text-stone-500">
          {engagement.companyName} &middot; {engagement.engagementType}
        </p>
      </div>

      {/* Engagement progress */}
      <Card className="border-stone-200 bg-white">
        <CardContent className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-sm font-medium text-stone-700">
              Engagement Progress
            </span>
            <span className="text-sm text-stone-500">
              Stage {ENGAGEMENT_STAGES.indexOf(engagement.stage as (typeof ENGAGEMENT_STAGES)[number]) + 1} of {ENGAGEMENT_STAGES.length}
            </span>
          </div>
          <Progress value={progressValue} className="h-2.5" />
          <div className="mt-3 flex justify-between">
            {ENGAGEMENT_STAGES.map((stage) => {
              const isCurrent = stage === engagement.stage
              const isPast =
                ENGAGEMENT_STAGES.indexOf(stage) <
                ENGAGEMENT_STAGES.indexOf(
                  engagement.stage as (typeof ENGAGEMENT_STAGES)[number]
                )
              return (
                <span
                  key={stage}
                  className={`text-xs font-medium ${
                    isCurrent
                      ? "text-[#D13A1F]"
                      : isPast
                        ? "text-[#2F6F5C]"
                        : "text-stone-400"
                  }`}
                >
                  {stage.charAt(0) + stage.slice(1).toLowerCase()}
                </span>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Action cards grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {ACTION_CARDS.map((card) => {
          const statusCfg = STATUS_CONFIG[card.status]
          return (
            <Card
              key={card.title}
              className="border-stone-200 bg-white transition-shadow hover:shadow-md"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-stone-100 text-stone-600">
                      {card.icon}
                    </div>
                    <CardTitle className="text-base">{card.title}</CardTitle>
                  </div>
                  <Badge className={statusCfg.className}>
                    <span className="flex items-center gap-1">
                      {statusCfg.icon}
                      {card.statusLabel}
                    </span>
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="mb-4 text-sm text-stone-500">{card.description}</p>
                <Link href={card.href}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="group px-0 text-[#D13A1F] hover:bg-transparent hover:text-[#b5301a]"
                  >
                    {card.ctaLabel}
                    <ArrowRight className="ml-1 h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
