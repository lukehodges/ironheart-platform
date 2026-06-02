"use client"

import { api } from "@/lib/trpc/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

// Stub-quality kanban view over the new deals-not-stages pipeline model.
// Six fixed stages (qualified -> dormant) read from listDeals and grouped
// client-side. Click a card to select a deal — parent renders the right
// panel against the selectedDealId.

const STAGES = [
  "qualified",
  "demo",
  "proposal",
  "won",
  "lost",
  "dormant",
] as const

type Stage = (typeof STAGES)[number]

export interface PipelineListProps {
  onSelectDeal?: (dealId: string) => void
  selectedDealId?: string | null
}

export function PipelineList({
  onSelectDeal,
  selectedDealId,
}: PipelineListProps) {
  const { data, isLoading, error } = api.pipeline.listDeals.useQuery({})

  if (isLoading) {
    return (
      <div className="p-8 text-sm text-muted-foreground">Loading deals…</div>
    )
  }
  if (error) {
    return (
      <div className="p-8 text-sm text-red-500">
        Failed to load deals: {error.message}
      </div>
    )
  }

  const deals = (data ?? []) as Array<{
    id: string
    name: string
    stage: string
    companyName?: string | null
    valueEstimate?: number | null
  }>

  const byStage = new Map<Stage, typeof deals>()
  for (const s of STAGES) byStage.set(s, [])
  for (const d of deals) {
    const bucket = byStage.get(d.stage as Stage)
    if (bucket) bucket.push(d)
  }

  return (
    <div className="grid grid-cols-1 gap-3 p-4 md:grid-cols-3 lg:grid-cols-6">
      {STAGES.map((stage) => {
        const items = byStage.get(stage) ?? []
        return (
          <div key={stage} className="flex flex-col gap-2">
            <div className="flex items-center justify-between border-b pb-1">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {stage}
              </span>
              <span className="text-xs text-muted-foreground">
                {items.length}
              </span>
            </div>
            <div className="flex flex-col gap-2">
              {items.map((deal) => (
                <Card
                  key={deal.id}
                  onClick={() => onSelectDeal?.(deal.id)}
                  className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                    selectedDealId === deal.id ? "border-primary" : ""
                  }`}
                >
                  <CardHeader className="p-3">
                    <CardTitle className="text-sm font-medium">
                      {deal.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 pt-0">
                    {deal.companyName ? (
                      <div className="text-xs text-muted-foreground">
                        {deal.companyName}
                      </div>
                    ) : null}
                    {typeof deal.valueEstimate === "number" ? (
                      <div className="mt-1 text-xs">
                        £{deal.valueEstimate.toLocaleString()}
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              ))}
              {items.length === 0 ? (
                <div className="rounded border border-dashed p-3 text-center text-xs text-muted-foreground">
                  empty
                </div>
              ) : null}
            </div>
          </div>
        )
      })}
    </div>
  )
}
