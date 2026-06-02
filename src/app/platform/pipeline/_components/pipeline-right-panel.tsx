"use client"

import { useState } from "react"
import { api } from "@/lib/trpc/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"

// Stub-quality detail panel for a single deal. Two actions:
//   - "Move to next stage" calls pipeline.moveStage
//   - "Add note"           calls pipeline.addNote
// Stage transitions are deliberately linear here — the service enforces
// real transition rules; this UI just suggests the obvious next step.

const STAGE_ORDER = [
  "qualified",
  "demo",
  "proposal",
  "won",
] as const

type Stage = (typeof STAGE_ORDER)[number] | "lost" | "dormant"

function nextStage(current: string): Stage | null {
  const idx = STAGE_ORDER.indexOf(current as (typeof STAGE_ORDER)[number])
  if (idx < 0 || idx >= STAGE_ORDER.length - 1) return null
  return STAGE_ORDER[idx + 1]
}

export interface PipelineRightPanelProps {
  dealId: string | null
}

export function PipelineRightPanel({ dealId }: PipelineRightPanelProps) {
  const utils = api.useUtils()
  const [noteBody, setNoteBody] = useState("")

  const dealQuery = api.pipeline.getDeal.useQuery(
    { dealId: dealId ?? "" },
    { enabled: !!dealId },
  )
  const eventsQuery = api.pipeline.listDealEvents.useQuery(
    { dealId: dealId ?? "" },
    { enabled: !!dealId },
  )

  const moveStage = api.pipeline.moveStage.useMutation({
    onSuccess: async () => {
      await utils.pipeline.listDeals.invalidate()
      await utils.pipeline.getDeal.invalidate()
      await utils.pipeline.listDealEvents.invalidate()
    },
  })

  const addNote = api.pipeline.addNote.useMutation({
    onSuccess: async () => {
      setNoteBody("")
      await utils.pipeline.listDealEvents.invalidate()
    },
  })

  if (!dealId) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          Select a deal to see details.
        </CardContent>
      </Card>
    )
  }
  if (dealQuery.isLoading) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          Loading deal…
        </CardContent>
      </Card>
    )
  }
  if (dealQuery.error || !dealQuery.data) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-red-500">
          {dealQuery.error?.message ?? "Deal not found"}
        </CardContent>
      </Card>
    )
  }

  const deal = dealQuery.data as {
    id: string
    name: string
    stage: string
    valueEstimate?: number | null
    companyName?: string | null
  }

  const events = (eventsQuery.data ?? []) as unknown as Array<{
    id: string
    kind: string
    createdAt: string | Date
    payload?: unknown
  }>

  const next = nextStage(deal.stage)

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{deal.name}</CardTitle>
          <div className="text-xs text-muted-foreground">
            Stage: {deal.stage}
            {deal.companyName ? ` · ${deal.companyName}` : ""}
            {typeof deal.valueEstimate === "number"
              ? ` · £${deal.valueEstimate.toLocaleString()}`
              : ""}
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <Button
            size="sm"
            disabled={!next || moveStage.isPending}
            onClick={() => {
              if (!next) return
              moveStage.mutate({ dealId: deal.id, newStage: next })
            }}
          >
            {next ? `Move to ${next}` : "No next stage"}
          </Button>
          <Separator />
          <div className="flex flex-col gap-2">
            <Input
              placeholder="Add a note…"
              value={noteBody}
              onChange={(e) => setNoteBody(e.target.value)}
            />
            <Button
              size="sm"
              variant="secondary"
              disabled={!noteBody.trim() || addNote.isPending}
              onClick={() =>
                addNote.mutate({ dealId: deal.id, body: noteBody.trim() })
              }
            >
              Add note
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {events.length === 0 ? (
            <div className="text-xs text-muted-foreground">
              No events yet.
            </div>
          ) : (
            <ul className="flex flex-col gap-2 text-xs">
              {events.map((ev) => (
                <li key={ev.id} className="border-b pb-1 last:border-b-0">
                  <span className="font-medium">{ev.kind}</span>
                  <span className="ml-2 text-muted-foreground">
                    {new Date(ev.createdAt).toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
