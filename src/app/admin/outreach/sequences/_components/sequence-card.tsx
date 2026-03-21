"use client"

import { Mail, Linkedin, Phone, ArrowRight } from "lucide-react"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { api } from "@/lib/trpc/react"
import { toast } from "sonner"
import type { OutreachChannel, OutreachStep } from "@/modules/outreach/outreach.types"

export interface SequenceCardData {
  id: string
  name: string
  sector: string
  isActive: boolean
  archivedAt: Date | null
  abVariant: string | null
  pairedSequenceId: string | null
  steps: OutreachStep[]
  totalSent: number
  totalReplied: number
  replyRate: number
  totalConverted: number
  conversionRate: number
}

interface SequenceCardProps {
  sequence: SequenceCardData
  onEdit: (sequenceId: string) => void
}

type SequenceStatus = "ACTIVE" | "PAUSED" | "ARCHIVED"

const CHANNEL_ICONS: Record<OutreachChannel, typeof Mail> = {
  EMAIL: Mail,
  LINKEDIN_REQUEST: Linkedin,
  LINKEDIN_MESSAGE: Linkedin,
  CALL: Phone,
}

function deriveStatus(sequence: SequenceCardData): SequenceStatus {
  if (sequence.archivedAt) return "ARCHIVED"
  if (sequence.isActive) return "ACTIVE"
  return "PAUSED"
}

const STATUS_CONFIG: Record<SequenceStatus, { label: string; className: string }> = {
  ACTIVE: { label: "Active", className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
  PAUSED: { label: "Paused", className: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  ARCHIVED: { label: "Archived", className: "bg-slate-500/10 text-slate-600 border-slate-500/20" },
}

export function SequenceCard({ sequence, onEdit }: SequenceCardProps) {
  const utils = api.useUtils()
  const status = deriveStatus(sequence)
  const statusConfig = STATUS_CONFIG[status]

  const updateSequence = api.outreach.updateSequence.useMutation({
    onSuccess: () => {
      void utils.outreach.listSequences.invalidate()
      void utils.outreach.sequenceAnalytics.invalidate()
      toast.success(sequence.isActive ? "Sequence paused" : "Sequence resumed")
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const archiveSequence = api.outreach.archiveSequence.useMutation({
    onSuccess: () => {
      void utils.outreach.listSequences.invalidate()
      void utils.outreach.sequenceAnalytics.invalidate()
      toast.success("Sequence archived")
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>
            <button
              type="button"
              className="text-left hover:underline"
              onClick={() => onEdit(sequence.id)}
            >
              {sequence.name}
            </button>
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{sequence.sector}</Badge>
            <Badge className={statusConfig.className}>{statusConfig.label}</Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Stats row */}
        <div className="grid grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-xs text-muted-foreground">Sent</p>
            <p className="font-mono text-lg font-semibold">{sequence.totalSent}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Replied</p>
            <p className="font-mono text-lg font-semibold">{sequence.totalReplied}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Reply Rate</p>
            <p className="font-mono text-lg font-semibold">{sequence.replyRate.toFixed(1)}%</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Converted</p>
            <p className="font-mono text-lg font-semibold">{sequence.totalConverted}</p>
          </div>
        </div>

        {/* Step flow */}
        {sequence.steps.length > 0 && (
          <div className="flex items-center gap-1 overflow-x-auto py-2">
            {sequence.steps.map((step, index) => {
              const Icon = CHANNEL_ICONS[step.channel]
              return (
                <div key={step.position} className="flex items-center gap-1">
                  {index > 0 && (
                    <div className="flex flex-col items-center gap-0.5 px-1">
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                        {step.delayDays}d
                      </span>
                    </div>
                  )}
                  <div
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border bg-muted"
                    title={step.channel.replace(/_/g, " ")}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>

      <CardFooter className="gap-2">
        <Button variant="outline" size="sm" onClick={() => onEdit(sequence.id)}>
          Edit
        </Button>
        {status !== "ARCHIVED" && (
          <>
            <Button
              variant="outline"
              size="sm"
              disabled={updateSequence.isPending}
              onClick={() =>
                updateSequence.mutate({
                  sequenceId: sequence.id,
                  isActive: !sequence.isActive,
                })
              }
            >
              {sequence.isActive ? "Pause" : "Resume"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={archiveSequence.isPending}
              onClick={() => archiveSequence.mutate({ sequenceId: sequence.id })}
            >
              Archive
            </Button>
          </>
        )}
      </CardFooter>
    </Card>
  )
}
