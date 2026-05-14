"use client"

import Link from "next/link"
import { Brain, Search, ChevronRight, Activity, Clock, Zap, User, Bot, Sparkles, AlertTriangle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { PhaseNav } from "../_components/phase-nav"
import { StreamingToolCall } from "../_components/streaming-tool-call"
import { EntityCard } from "../_components/entity-card"
import { ApprovalCard } from "../_components/approval-card"

// ─── Mock data ────────────────────────────────────────────────────────────────

const toolSteps = [
  { type: "status" as const, label: "Searching BNG sites in Solent catchment..." },
  { type: "tool_call" as const, label: "sites.list({ region: 'Solent', limit: 100 })" },
  { type: "tool_result" as const, label: "✓ Found 47 habitat sites", detail: "ranked by area" },
  { type: "status" as const, label: "Calculating unallocated biodiversity units..." },
  { type: "tool_call" as const, label: "sites.calculateUnallocated({ siteIds: [...] })" },
  { type: "tool_result" as const, label: "✓ 8 sites with surplus ≥ 30 BDUs identified" },
  { type: "status" as const, label: "Matching to active developer requirements..." },
  { type: "tool_call" as const, label: "deals.list({ status: 'active', catchment: 'Solent' })" },
  { type: "tool_result" as const, label: "✓ 12 matching developer requirements found" },
]

const timeoutSteps = [
  { type: "status" as const, label: "Searching NE registration records..." },
  { type: "error" as const, label: "Service taking longer than expected - retrying with narrower query" },
  { type: "tool_call" as const, label: "compliance.list({ region: 'Solent', limit: 20 })" },
  { type: "tool_result" as const, label: "✓ Retrieved - 14 records in Solent catchment" },
]

const siteCards = [
  {
    title: "Manor Fields (S-0005)",
    subtitle: "North Hampshire · 26.7 ha",
    fields: [
      { label: "Total improvement BDUs", value: "203 units" },
      { label: "Unallocated", value: "203 units", highlight: true },
      { label: "Habitat type", value: "Lowland Meadow (High)" },
      { label: "Nearest developer need", value: "Taylor Wimpey · 8 km" },
    ],
    badge: { label: "94% match", variant: "default" as const },
  },
  {
    title: "Whiteley Farm (S-0001)",
    subtitle: "Solent · 60 ha",
    fields: [
      { label: "Total nitrogen credits", value: "95 kg/yr" },
      { label: "Unallocated", value: "45 kg/yr", highlight: true },
      { label: "Mitigation type", value: "Arable → Permanent Grassland" },
      { label: "Nearest developer need", value: "Bellway Homes · 12 km" },
    ],
    badge: { label: "87% match", variant: "secondary" as const },
  },
  {
    title: "Fareham Woodland (S-0008)",
    subtitle: "Solent · 18 ha",
    fields: [
      { label: "Total improvement BDUs", value: "206 area HUs" },
      { label: "Unallocated", value: "206 area HUs", highlight: true },
      { label: "Habitat type", value: "Lowland Mixed Deciduous Woodland (V. High)" },
      { label: "Nearest developer need", value: "Persimmon · 6 km" },
    ],
    badge: { label: "82% match", variant: "secondary" as const },
  },
]

const sessions = [
  { title: "Solent unallocated BDU analysis", time: "Today, 8:02 AM", turns: "current" },
  { title: "Fareham Woodland registration status", time: "Yesterday, 4:15 PM", turns: "6 turns" },
  { title: "Q1 compliance gap review", time: "7 Mar, 2:30 PM", turns: "12 turns" },
  { title: "Taylor Wimpey supply matching", time: "6 Mar, 10:00 AM", turns: "8 turns" },
]

const toolLog = [
  { name: "sites.list", calls: 2, status: "✓" },
  { name: "sites.calculateUnallocated", calls: 1, status: "✓" },
  { name: "deals.list", calls: 1, status: "✓" },
  { name: "compliance.list", calls: 1, status: "⚠ timeout → retry" },
]

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PhaseAPage() {
  return (
    <div className="min-h-screen">
      <PhaseNav
        current="A"
        title="Phase A - Read-only Intelligence"
        subtitle="The agent queries all 7 modules, reasons across them, and returns insights. It cannot write, create, or modify anything."
      />

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* ── Chat panel (left, 3 cols) ── */}
          <div className="lg:col-span-3">
            <Card className="overflow-hidden">
              <CardHeader className="border-b border-border pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <CardTitle className="text-sm font-semibold">Live session - 9 March 2026, 8:02 AM</CardTitle>
                  </div>
                  <Badge variant="outline" className="gap-1.5 text-xs">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    Read-only mode
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Viewing: BNG Portfolio Dashboard · Page context active
                </p>
              </CardHeader>

              <CardContent className="p-0">
                <div className="divide-y divide-border/50">

                  {/* User message */}
                  <div className="px-4 py-4 bg-muted/30">
                    <div className="flex gap-3 flex-row-reverse">
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarFallback className="bg-foreground/10 text-xs"><User className="h-4 w-4" /></AvatarFallback>
                      </Avatar>
                      <div className="flex-1 text-right">
                        <div className="flex items-center gap-2 justify-end mb-1">
                          <span className="text-xs text-muted-foreground">8:02 AM</span>
                          <span className="text-xs font-medium text-foreground">You</span>
                        </div>
                        <div className="inline-block text-left rounded-2xl rounded-tr-sm bg-primary text-primary-foreground px-4 py-2.5 text-sm">
                          Which BNG sites in the Solent catchment have the most unallocated biodiversity units, and which active developers could they serve?
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Agent response */}
                  <div className="px-4 py-4">
                    <div className="flex gap-3">
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarFallback className="bg-primary/10 text-xs"><Bot className="h-4 w-4 text-primary" /></AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium text-foreground">AI Assistant</span>
                          <span className="text-xs text-muted-foreground">8:02 AM</span>
                        </div>
                        <div className="rounded-2xl rounded-tl-sm bg-card border border-border px-4 py-3">
                          {/* Streaming tool calls */}
                          <p className="text-xs text-muted-foreground italic mb-2">Reasoning across modules...</p>
                          <StreamingToolCall steps={toolSteps} />

                          <Separator className="my-3" />

                          <p className="text-sm text-foreground mb-1">
                            Found <strong>8 Solent sites</strong> with surplus BDUs matched against <strong>12 active developer requirements</strong>. Top 3 by unallocated supply:
                          </p>

                          {/* Entity cards */}
                          {siteCards.map((card, i) => (
                            <EntityCard
                              key={i}
                              type="Habitat Site"
                              title={card.title}
                              subtitle={card.subtitle}
                              fields={card.fields}
                              href="/admin/brokerage-mockups/sites"
                              badge={card.badge}
                            />
                          ))}

                          {/* Tool timeout edge case */}
                          <Separator className="my-3" />
                          <p className="text-xs text-muted-foreground italic mb-2">Checking NE compliance records...</p>
                          <StreamingToolCall steps={timeoutSteps} />
                          <p className="text-sm text-foreground mt-2">All 3 sites have current NE registration. <strong>Manor Fields</strong> is the strongest match - same NCA, LNRS-aligned habitat types, closest proximity to Taylor Wimpey&apos;s requirement.</p>

                          {/* Phase B teaser */}
                          <Separator className="my-3" />
                          <ApprovalCard
                            title="Create comparison quote for Taylor Wimpey"
                            details={[
                              { label: "Site", value: "Manor Fields (S-0005)" },
                              { label: "Units", value: "30 area BDUs" },
                              { label: "Unit price", value: "£3,000" },
                              { label: "Total value", value: "£90,000" },
                            ]}
                            locked
                            lockedMessage="Approval flows and write actions unlock in Phase B. In Phase A, the agent can only query and recommend."
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Input */}
                <div className="border-t border-border p-3">
                  <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/30 px-3 py-2.5">
                    <Search className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="flex-1 text-sm text-muted-foreground">Ask anything about your portfolio, sites, deals, or compliance...</span>
                    <Button size="sm" variant="default" className="h-8 w-8 p-0 rounded-lg shrink-0">
                      <Sparkles className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ── Right panels (2 cols) ── */}
          <div className="lg:col-span-2 space-y-4">

            {/* Session list */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  <CardTitle className="text-sm font-semibold">Session History</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-0 space-y-2">
                {sessions.map((s, i) => (
                  <div key={i} className={`rounded-lg border p-3 ${i === 0 ? "border-primary/30 bg-primary/5" : "border-border"}`}>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-medium text-foreground truncate">{s.title}</p>
                      {i === 0 && <Badge variant="default" className="text-xs shrink-0">Active</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{s.time} · {s.turns}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Tool call log */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary" />
                  <CardTitle className="text-sm font-semibold">Tool Call Log</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  {toolLog.map((t, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <span className="font-mono text-foreground">{t.name}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">{t.calls}x</Badge>
                        <span className="text-muted-foreground">{t.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Token usage */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-primary" />
                  <CardTitle className="text-sm font-semibold">Session Token Usage</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Used</span>
                  <span className="font-medium text-foreground">12,450 / 50,000</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                  <div className="bg-primary h-2 rounded-full" style={{ width: "24.9%" }} />
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <div>System prompt: 500</div>
                  <div>User context: 200</div>
                  <div>Conversation: 3,200</div>
                  <div>Tool schemas: 8,550</div>
                </div>
                <div className="rounded-lg bg-muted/60 border border-border px-3 py-2 text-xs text-muted-foreground">
                  Budget healthy - 75% remaining
                </div>
              </CardContent>
            </Card>

          </div>
        </div>
      </div>
    </div>
  )
}
