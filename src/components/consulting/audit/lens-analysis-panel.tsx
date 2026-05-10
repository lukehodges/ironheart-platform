"use client"

import { useState, useRef, useCallback } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { RagScoreSelector } from "./rag-score-selector"
import { FindingsTable } from "./findings-table"
import { RecommendationsTable } from "./recommendations-table"
import { Check } from "lucide-react"

type AuditLens = "REVENUE" | "OPERATIONS" | "FINANCE" | "TECHNOLOGY" | "TEAM"
type RagScore = "RED" | "AMBER" | "GREEN"
type FindingImpact = "HIGH" | "MEDIUM" | "LOW"

interface LensAnalysis {
  id: string
  auditSessionId: string
  lens: AuditLens
  ragScore: RagScore | null
  ragJustification: string | null
  currentState: string | null
  findings: {
    id: string
    finding: string
    impact: FindingImpact
    evidence: string | null
    priority: number
    estimatedAnnualWaste: number | null
  }[]
  recommendations: {
    id: string
    action: string
    estimatedEffort: string | null
    estimatedCost: number | null
    priority: number
  }[]
}

interface LensAnalysisPanelProps {
  lenses: LensAnalysis[]
  auditSessionId: string
  onUpsertLens: (data: {
    auditSessionId: string
    lens: AuditLens
    ragScore?: RagScore | null
    ragJustification?: string | null
    currentState?: string | null
  }) => void
  onCreateFinding: (data: {
    lensAnalysisId: string
    finding: string
    impact: FindingImpact
    evidence?: string | null
    priority: number
    estimatedAnnualWaste?: number | null
  }) => void
  onUpdateFinding: (data: {
    id: string
    finding?: string
    impact?: FindingImpact
    evidence?: string | null
    priority?: number
    estimatedAnnualWaste?: number | null
  }) => void
  onDeleteFinding: (id: string) => void
  onCreateRecommendation: (data: {
    lensAnalysisId: string
    action: string
    estimatedEffort?: string | null
    estimatedCost?: number | null
    priority: number
  }) => void
  onUpdateRecommendation: (data: {
    id: string
    action?: string
    estimatedEffort?: string | null
    estimatedCost?: number | null
    priority?: number
  }) => void
  onDeleteRecommendation: (id: string) => void
  disabled?: boolean
}

const ALL_LENSES: { value: AuditLens; label: string }[] = [
  { value: "REVENUE", label: "Revenue" },
  { value: "OPERATIONS", label: "Operations" },
  { value: "FINANCE", label: "Finance" },
  { value: "TECHNOLOGY", label: "Technology" },
  { value: "TEAM", label: "Team" },
]

export function LensAnalysisPanel({
  lenses,
  auditSessionId,
  onUpsertLens,
  onCreateFinding,
  onUpdateFinding,
  onDeleteFinding,
  onCreateRecommendation,
  onUpdateRecommendation,
  onDeleteRecommendation,
  disabled,
}: LensAnalysisPanelProps) {
  const lensMap = new Map(lenses.map((l) => [l.lens, l]))

  return (
    <Tabs defaultValue="REVENUE" className="w-full">
      <TabsList className="w-full justify-start">
        {ALL_LENSES.map(({ value, label }) => {
          const lens = lensMap.get(value)
          const hasRag = !!lens?.ragScore
          return (
            <TabsTrigger key={value} value={value} className="relative gap-1.5">
              {label}
              {hasRag && (
                <Check className="h-3 w-3 text-emerald-600" />
              )}
            </TabsTrigger>
          )
        })}
      </TabsList>

      {ALL_LENSES.map(({ value }) => {
        const lens = lensMap.get(value) ?? null
        return (
          <TabsContent key={value} value={value} className="mt-4">
            <LensTab
              lens={value}
              data={lens}
              auditSessionId={auditSessionId}
              onUpsertLens={onUpsertLens}
              onCreateFinding={onCreateFinding}
              onUpdateFinding={onUpdateFinding}
              onDeleteFinding={onDeleteFinding}
              onCreateRecommendation={onCreateRecommendation}
              onUpdateRecommendation={onUpdateRecommendation}
              onDeleteRecommendation={onDeleteRecommendation}
              disabled={disabled}
            />
          </TabsContent>
        )
      })}
    </Tabs>
  )
}

function LensTab({
  lens,
  data,
  auditSessionId,
  onUpsertLens,
  onCreateFinding,
  onUpdateFinding,
  onDeleteFinding,
  onCreateRecommendation,
  onUpdateRecommendation,
  onDeleteRecommendation,
  disabled,
}: {
  lens: AuditLens
  data: LensAnalysis | null
  auditSessionId: string
  onUpsertLens: LensAnalysisPanelProps["onUpsertLens"]
  onCreateFinding: LensAnalysisPanelProps["onCreateFinding"]
  onUpdateFinding: LensAnalysisPanelProps["onUpdateFinding"]
  onDeleteFinding: LensAnalysisPanelProps["onDeleteFinding"]
  onCreateRecommendation: LensAnalysisPanelProps["onCreateRecommendation"]
  onUpdateRecommendation: LensAnalysisPanelProps["onUpdateRecommendation"]
  onDeleteRecommendation: LensAnalysisPanelProps["onDeleteRecommendation"]
  disabled?: boolean
}) {
  const [justification, setJustification] = useState(data?.ragJustification ?? "")
  const [currentState, setCurrentState] = useState(data?.currentState ?? "")
  const justificationTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const stateTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleRagChange = (score: RagScore) => {
    onUpsertLens({ auditSessionId, lens, ragScore: score })
  }

  const debouncedUpsert = useCallback(
    (field: "ragJustification" | "currentState", value: string) => {
      const timer = field === "ragJustification" ? justificationTimer : stateTimer
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => {
        onUpsertLens({ auditSessionId, lens, [field]: value })
      }, 500)
    },
    [auditSessionId, lens, onUpsertLens]
  )

  const handleJustificationChange = (value: string) => {
    setJustification(value)
    debouncedUpsert("ragJustification", value)
  }

  const handleCurrentStateChange = (value: string) => {
    setCurrentState(value)
    debouncedUpsert("currentState", value)
  }

  const handleFieldBlur = (field: "ragJustification" | "currentState") => {
    const timer = field === "ragJustification" ? justificationTimer : stateTimer
    if (timer.current) clearTimeout(timer.current)
    const value = field === "ragJustification" ? justification : currentState
    onUpsertLens({ auditSessionId, lens, [field]: value })
  }

  return (
    <div className="space-y-6">
      {/* RAG Score */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">RAG Assessment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Score</Label>
            <RagScoreSelector
              value={data?.ragScore ?? null}
              onChange={handleRagChange}
              disabled={disabled}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm">Justification</Label>
            <Textarea
              value={justification}
              onChange={(e) => handleJustificationChange(e.target.value)}
              onBlur={() => handleFieldBlur("ragJustification")}
              placeholder="Why this RAG score? What evidence supports it?"
              rows={3}
              className="text-sm"
              disabled={disabled}
            />
          </div>
        </CardContent>
      </Card>

      {/* Current State */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Current State</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={currentState}
            onChange={(e) => handleCurrentStateChange(e.target.value)}
            onBlur={() => handleFieldBlur("currentState")}
            placeholder="Describe the current state across 2-3 paragraphs..."
            rows={6}
            className="text-sm"
            disabled={disabled}
          />
        </CardContent>
      </Card>

      <Separator />

      {/* Findings */}
      {data ? (
        <FindingsTable
          findings={data.findings}
          lensAnalysisId={data.id}
          onCreateFinding={onCreateFinding}
          onUpdateFinding={onUpdateFinding}
          onDeleteFinding={onDeleteFinding}
          disabled={disabled}
        />
      ) : (
        <div className="text-sm text-muted-foreground py-4">
          Set a RAG score above to enable findings and recommendations.
        </div>
      )}

      <Separator />

      {/* Recommendations */}
      {data ? (
        <RecommendationsTable
          recommendations={data.recommendations}
          lensAnalysisId={data.id}
          onCreateRecommendation={onCreateRecommendation}
          onUpdateRecommendation={onUpdateRecommendation}
          onDeleteRecommendation={onDeleteRecommendation}
          disabled={disabled}
        />
      ) : null}
    </div>
  )
}
