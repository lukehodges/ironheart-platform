"use client"

import {
  Bot,
  Send,
  Search,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Brain,
  User,
  Activity,
  GitBranch,
  Shield,
  ArrowDown,
  Play,
  BarChart3,
  Eye,
  CircleDot,
  HelpCircle,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { PhaseNav } from "../_components/phase-nav"
import { StreamingToolCall } from "../_components/streaming-tool-call"

// ─── Workflow Node Component ─────────────────────────────────────────────────

interface WorkflowNodeProps {
  label: string
  sublabel?: string
  type?: "trigger" | "condition" | "ai_decision" | "action" | "end"
  icon?: React.ReactNode
  highlighted?: boolean
  compact?: boolean
}

function WorkflowNode({ label, sublabel, type = "action", icon, highlighted, compact }: WorkflowNodeProps) {
  const baseClasses = "relative rounded-lg border px-3 py-2 text-center transition-all"
  const typeClasses = highlighted
    ? "border-amber-500/50 bg-amber-500/10 shadow-sm shadow-amber-500/10"
    : type === "trigger"
      ? "border-emerald-500/30 bg-emerald-500/10"
      : type === "condition"
        ? "border-blue-500/30 bg-blue-500/10"
        : type === "end"
          ? "border-red-500/30 bg-red-500/10"
          : "border-border bg-card"

  return (
    <div className={`${baseClasses} ${typeClasses} ${compact ? "px-2 py-1.5" : ""}`}>
      <div className="flex items-center justify-center gap-1.5">
        {icon && <span className="shrink-0">{icon}</span>}
        <span className={`font-medium ${compact ? "text-xs" : "text-xs"} text-foreground`}>{label}</span>
      </div>
      {sublabel && (
        <p className={`text-muted-foreground mt-0.5 ${compact ? "text-[10px]" : "text-[10px]"}`}>{sublabel}</p>
      )}
      {highlighted && (
        <div className="absolute -top-1.5 -right-1.5">
          <span className="flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500" />
          </span>
        </div>
      )}
    </div>
  )
}

// ─── Connector Line ──────────────────────────────────────────────────────────

function ConnectorDown({ label, dashed }: { label?: string; dashed?: boolean }) {
  return (
    <div className="flex flex-col items-center py-0.5">
      <div className={`w-px h-5 ${dashed ? "border-l border-dashed border-muted-foreground/40" : "bg-border"}`} />
      {label && (
        <span className="text-[9px] text-muted-foreground font-medium -mt-0.5 mb-0.5">{label}</span>
      )}
      <ArrowDown className="h-3 w-3 text-muted-foreground -mt-0.5" />
    </div>
  )
}

// ─── Branch Connector ────────────────────────────────────────────────────────

function BranchConnector({ leftLabel, rightLabel }: { leftLabel: string; rightLabel: string }) {
  return (
    <div className="relative flex items-start justify-center py-1">
      {/* Horizontal line */}
      <div className="absolute top-0 left-1/4 right-1/4 h-px bg-border" />
      {/* Left vertical */}
      <div className="absolute top-0 left-1/4 w-px h-4 bg-border" />
      {/* Right vertical */}
      <div className="absolute top-0 right-1/4 w-px h-4 bg-border" />
      {/* Center vertical from top */}
      <div className="w-px h-0 bg-border" />
      {/* Labels */}
      <div className="flex w-full justify-between px-2 pt-3">
        <span className="text-[9px] text-emerald-600 font-medium">{leftLabel}</span>
        <span className="text-[9px] text-red-600 font-medium">{rightLabel}</span>
      </div>
    </div>
  )
}

// ─── Tool Steps ──────────────────────────────────────────────────────────────

const workflowBuildSteps = [
  { type: "status" as const, label: "Analysing deal stage transition rules..." },
  { type: "tool_call" as const, label: "workflows.getStageGates({ stage: 'Contracted' })" },
  { type: "tool_result" as const, label: "Found 3 existing gate conditions for 'Contracted'" },
  { type: "status" as const, label: "Checking NE registration data schema..." },
  { type: "tool_call" as const, label: "sites.getRegistrationFields()" },
  { type: "tool_result" as const, label: "Fields: registrationStatus, registrationExpiry, neReference" },
  { type: "status" as const, label: "Building workflow graph..." },
  { type: "tool_call" as const, label: "workflows.create({ trigger: 'deal.stageChange', aiNode: true })" },
  { type: "tool_result" as const, label: "Workflow WF-0089 created with 5 nodes, 1 AI_DECISION node" },
]

// ─── Active Automations ──────────────────────────────────────────────────────

interface ActiveAutomation {
  name: string
  description: string
  hasAiNode: boolean
  status: "Active" | "Paused" | "Draft"
  runs7d: number
}

const activeAutomations: ActiveAutomation[] = [
  { name: "NE Registration Gate", description: "Blocks deal progression without valid NE registration", hasAiNode: true, status: "Active", runs7d: 18 },
  { name: "Compliance Reminder Cascade", description: "Sends reminders at 30/7/1 day thresholds", hasAiNode: false, status: "Active", runs7d: 47 },
  { name: "Developer Match & Score", description: "AI scores supply-demand matches on new requirements", hasAiNode: true, status: "Active", runs7d: 12 },
  { name: "HMMP Review Trigger", description: "Triggers ecological review when HMMP status changes", hasAiNode: false, status: "Active", runs7d: 6 },
  { name: "S106 Document Validator", description: "AI validates S106 clause completeness before legal review", hasAiNode: true, status: "Paused", runs7d: 0 },
  { name: "Quarterly Portfolio Report", description: "Generates portfolio summary every quarter", hasAiNode: false, status: "Active", runs7d: 1 },
]

// ─── Page ────────────────────────────────────────────────────────────────────

export default function PhaseCPage() {
  return (
    <div className="min-h-screen">
      <PhaseNav
        current="C"
        title="Phase C - Workflow Intelligence"
        subtitle="The agent creates, edits, and monitors automation workflows with embedded AI decision nodes. Build complex business logic through conversation."
      />

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* ── Chat panel (left, 3 cols) ── */}
          <div className="lg:col-span-3">
            <Card className="overflow-hidden">
              <CardHeader className="border-b border-border pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <GitBranch className="h-4 w-4 text-primary" />
                    <CardTitle className="text-sm font-semibold">Workflow Builder Session &mdash; 9 March 2026</CardTitle>
                  </div>
                  <Badge variant="outline" className="gap-1.5 text-xs">
                    <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                    Workflow mode
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Context: Deal lifecycle &middot; Stage gate configuration
                </p>
              </CardHeader>

              <CardContent className="p-0">
                <div className="divide-y divide-border/50">

                  {/* ── Message 1: User asks ── */}
                  <div className="px-4 py-4 bg-muted/30">
                    <div className="flex gap-3 flex-row-reverse">
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarFallback className="bg-foreground/10 text-xs"><User className="h-4 w-4" /></AvatarFallback>
                      </Avatar>
                      <div className="flex-1 text-right">
                        <div className="flex items-center gap-2 justify-end mb-1">
                          <span className="text-xs text-muted-foreground">9:14 AM</span>
                          <span className="text-xs font-medium text-foreground">You</span>
                        </div>
                        <div className="inline-block text-left rounded-2xl rounded-tr-sm bg-primary text-primary-foreground px-4 py-2.5 text-sm">
                          Create a workflow that blocks any deal from moving to &lsquo;Contracted&rsquo; if the site&apos;s NE registration is missing or expired
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ── Message 2: Agent clarifying question ── */}
                  <div className="px-4 py-4">
                    <div className="flex gap-3">
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarFallback className="bg-primary/10 text-xs"><Bot className="h-4 w-4 text-primary" /></AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium text-foreground">AI Assistant</span>
                          <span className="text-xs text-muted-foreground">9:14 AM</span>
                        </div>
                        <div className="rounded-2xl rounded-tl-sm bg-card border border-border px-4 py-3">
                          <p className="text-sm text-foreground mb-3">
                            I can build that. Before I do, one question:
                          </p>

                          {/* Clarifying question card - informational style */}
                          <div className="rounded-lg border border-indigo-500/20 bg-indigo-500/5 p-3">
                            <div className="flex items-start gap-2.5">
                              <div className="mt-0.5 flex items-center justify-center h-6 w-6 rounded-md bg-indigo-500/10 shrink-0">
                                <HelpCircle className="h-3.5 w-3.5 text-indigo-600" />
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wider mb-1">
                                  Clarification needed
                                </p>
                                <p className="text-sm text-foreground">
                                  Should I also check for <strong>LNRS alignment</strong> (Local Nature Recovery Strategy), or just NE registration status?
                                </p>
                                <p className="text-xs text-muted-foreground mt-1.5">
                                  LNRS alignment is required for some catchments but not all. Adding it would make the gate stricter.
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ── Message 3: User answers ── */}
                  <div className="px-4 py-4 bg-muted/30">
                    <div className="flex gap-3 flex-row-reverse">
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarFallback className="bg-foreground/10 text-xs"><User className="h-4 w-4" /></AvatarFallback>
                      </Avatar>
                      <div className="flex-1 text-right">
                        <div className="flex items-center gap-2 justify-end mb-1">
                          <span className="text-xs text-muted-foreground">9:15 AM</span>
                          <span className="text-xs font-medium text-foreground">You</span>
                        </div>
                        <div className="inline-block text-left rounded-2xl rounded-tr-sm bg-primary text-primary-foreground px-4 py-2.5 text-sm">
                          Just NE registration for now
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ── Message 4: Agent builds workflow ── */}
                  <div className="px-4 py-4">
                    <div className="flex gap-3">
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarFallback className="bg-primary/10 text-xs"><Bot className="h-4 w-4 text-primary" /></AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium text-foreground">AI Assistant</span>
                          <span className="text-xs text-muted-foreground">9:15 AM</span>
                        </div>
                        <div className="rounded-2xl rounded-tl-sm bg-card border border-border px-4 py-3 space-y-4">

                          {/* Streaming tool calls */}
                          <p className="text-xs text-muted-foreground italic">Building workflow...</p>
                          <StreamingToolCall steps={workflowBuildSteps} />

                          <Separator />

                          <div>
                            <p className="text-sm text-foreground mb-1">
                              Done. Here&apos;s the workflow I&apos;ve created:
                            </p>
                            <p className="text-sm text-foreground mb-3">
                              <strong>WF-0089: NE Registration Gate</strong> &mdash; triggers when any deal attempts to move to &lsquo;Contracted&rsquo; stage, then uses an AI decision node to evaluate the linked site&apos;s registration status.
                            </p>
                          </div>

                          {/* ── Inline Compact Workflow Diagram ── */}
                          <div className="rounded-lg border border-border bg-muted/30 p-4">
                            <div className="flex items-center gap-2 mb-3">
                              <GitBranch className="h-3.5 w-3.5 text-primary" />
                              <span className="text-xs font-semibold text-foreground">Workflow: NE Registration Gate</span>
                              <Badge variant="outline" className="text-[10px]">5 nodes</Badge>
                            </div>

                            {/* Diagram - vertical CSS layout */}
                            <div className="flex flex-col items-center">
                              <WorkflowNode
                                label="TRIGGER"
                                sublabel="deal.stageChange = 'Contracted'"
                                type="trigger"
                                icon={<Play className="h-3 w-3 text-emerald-600" />}
                                compact
                              />
                              <ConnectorDown />
                              <WorkflowNode
                                label="AI_DECISION"
                                sublabel="Evaluate NE registration status"
                                type="ai_decision"
                                icon={<Brain className="h-3 w-3 text-amber-600" />}
                                highlighted
                                compact
                              />
                              <BranchConnector leftLabel="PASSED" rightLabel="MISSING / EXPIRED" />

                              {/* Two branches side by side */}
                              <div className="grid grid-cols-2 gap-3 w-full mt-1">
                                {/* Left branch: passed */}
                                <div className="flex flex-col items-center">
                                  <WorkflowNode
                                    label="ALLOW"
                                    sublabel="Proceed to Contracted"
                                    type="action"
                                    icon={<CheckCircle2 className="h-3 w-3 text-emerald-500" />}
                                    compact
                                  />
                                </div>
                                {/* Right branch: missing */}
                                <div className="flex flex-col items-center">
                                  <WorkflowNode
                                    label="BLOCK + NOTIFY"
                                    sublabel="Alert deal owner"
                                    type="end"
                                    icon={<Shield className="h-3 w-3 text-red-500" />}
                                    compact
                                  />
                                </div>
                              </div>
                            </div>
                          </div>

                          <Separator />

                          {/* ── What-If Simulator ── */}
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <BarChart3 className="h-3.5 w-3.5 text-primary" />
                              <span className="text-xs font-semibold text-foreground uppercase tracking-wider">What-If Simulation</span>
                            </div>
                            <p className="text-sm text-muted-foreground mb-3">
                              If this workflow had been active for the last 90 days:
                            </p>

                            <div className="overflow-x-auto rounded-lg border border-border">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="bg-muted/50">
                                    <th className="px-3 py-2 text-left font-medium text-muted-foreground text-xs">Metric</th>
                                    <th className="px-3 py-2 text-right font-medium text-muted-foreground text-xs">Without Workflow</th>
                                    <th className="px-3 py-2 text-right font-medium text-muted-foreground text-xs">With Workflow</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                  <tr>
                                    <td className="px-3 py-2 text-xs text-foreground">Deals reaching &lsquo;Contracted&rsquo; without valid NE reg</td>
                                    <td className="px-3 py-2 text-right">
                                      <span className="text-red-600 font-semibold">12</span>
                                    </td>
                                    <td className="px-3 py-2 text-right">
                                      <span className="text-emerald-600 font-semibold">0</span>
                                    </td>
                                  </tr>
                                  <tr>
                                    <td className="px-3 py-2 text-xs text-foreground">Deals caught manually before completion</td>
                                    <td className="px-3 py-2 text-right">
                                      <span className="text-amber-600 font-semibold">2</span>
                                    </td>
                                    <td className="px-3 py-2 text-right text-xs text-muted-foreground">n/a</td>
                                  </tr>
                                  <tr>
                                    <td className="px-3 py-2 text-xs text-foreground">Deals that required post-contract remediation</td>
                                    <td className="px-3 py-2 text-right">
                                      <span className="text-red-600 font-semibold">10</span>
                                    </td>
                                    <td className="px-3 py-2 text-right">
                                      <span className="text-emerald-600 font-semibold">0</span>
                                    </td>
                                  </tr>
                                  <tr className="bg-primary/5">
                                    <td className="px-3 py-2 text-xs font-medium text-foreground">Estimated cost avoided</td>
                                    <td className="px-3 py-2 text-right text-xs text-muted-foreground">&mdash;</td>
                                    <td className="px-3 py-2 text-right">
                                      <span className="text-emerald-600 font-bold">&pound;34,000</span>
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>

                            <div className="flex items-center gap-2 mt-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 text-xs text-emerald-700">
                              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                              <span><strong>12 deals</strong> would have been blocked (instead of 2 caught manually). 10 post-contract issues avoided entirely.</span>
                            </div>
                          </div>

                          <Separator />

                          <p className="text-sm text-muted-foreground">
                            The workflow is saved as a draft. Want me to activate it, or would you like to adjust the rules first?
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Chat Input */}
                <div className="border-t border-border p-3">
                  <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/30 px-3 py-2.5">
                    <Search className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="flex-1 text-sm text-muted-foreground">Describe a workflow, ask to modify one, or run a what-if simulation...</span>
                    <Button size="sm" variant="default" className="h-8 w-8 p-0 rounded-lg shrink-0">
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ── Right panels (2 cols) ── */}
          <div className="lg:col-span-2 space-y-4">

            {/* ── Workflow Graph Preview ── */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4 text-primary" />
                    <CardTitle className="text-sm font-semibold">Workflow Graph Preview</CardTitle>
                  </div>
                  <Badge variant="secondary" className="text-xs">WF-0089</Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {/* Full workflow graph - vertical layout with connecting lines */}
                <div className="rounded-lg border border-border bg-muted/20 p-4">
                  <div className="flex flex-col items-center space-y-0">

                    {/* Node 1: Trigger */}
                    <div className="w-full max-w-[220px] rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center justify-center h-6 w-6 rounded-md bg-emerald-500/15">
                          <Play className="h-3 w-3 text-emerald-600" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-foreground">TRIGGER</p>
                          <p className="text-[10px] text-muted-foreground">deal.stageChange</p>
                        </div>
                      </div>
                    </div>

                    {/* Connector */}
                    <div className="flex flex-col items-center">
                      <div className="w-px h-5 bg-border" />
                      <ArrowDown className="h-3 w-3 text-muted-foreground -mt-0.5" />
                    </div>

                    {/* Node 2: Condition */}
                    <div className="w-full max-w-[220px] rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center justify-center h-6 w-6 rounded-md bg-blue-500/15">
                          <GitBranch className="h-3 w-3 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-foreground">IF</p>
                          <p className="text-[10px] text-muted-foreground">targetStage = &apos;Contracted&apos;</p>
                        </div>
                      </div>
                    </div>

                    {/* Connector */}
                    <div className="flex flex-col items-center">
                      <div className="w-px h-4 bg-border" />
                      <span className="text-[9px] text-emerald-600 font-medium">TRUE</span>
                      <ArrowDown className="h-3 w-3 text-muted-foreground" />
                    </div>

                    {/* Node 3: AI Decision - highlighted */}
                    <div className="w-full max-w-[220px] rounded-lg border-2 border-amber-500/50 bg-amber-500/10 px-3 py-2.5 shadow-sm shadow-amber-500/10 relative">
                      <div className="absolute -top-1.5 -right-1.5">
                        <span className="flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500" />
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center justify-center h-6 w-6 rounded-md bg-amber-500/15">
                          <Brain className="h-3 w-3 text-amber-600" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-foreground">AI_DECISION</p>
                          <p className="text-[10px] text-muted-foreground">Check NE registration</p>
                        </div>
                      </div>
                      <div className="mt-1.5 flex items-center gap-1">
                        <Badge variant="outline" className="text-[9px] border-amber-500/30 text-amber-700 px-1.5 py-0">
                          AI-powered
                        </Badge>
                      </div>
                    </div>

                    {/* Branch split */}
                    <div className="relative w-full max-w-[220px]">
                      <div className="flex flex-col items-center">
                        <div className="w-px h-3 bg-border" />
                      </div>
                      {/* Horizontal line */}
                      <div className="flex items-start justify-center">
                        <div className="w-full h-px bg-border mt-0" />
                      </div>
                      {/* Branch labels */}
                      <div className="flex justify-between px-1 mt-0.5">
                        <div className="flex flex-col items-center">
                          <div className="w-px h-3 bg-border" />
                          <span className="text-[9px] text-emerald-600 font-medium">VALID</span>
                          <ArrowDown className="h-2.5 w-2.5 text-muted-foreground" />
                        </div>
                        <div className="flex flex-col items-center">
                          <div className="w-px h-3 bg-border" />
                          <span className="text-[9px] text-red-600 font-medium">INVALID</span>
                          <ArrowDown className="h-2.5 w-2.5 text-muted-foreground" />
                        </div>
                      </div>
                    </div>

                    {/* Two branch nodes */}
                    <div className="grid grid-cols-2 gap-2 w-full max-w-[220px]">
                      <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2 py-2">
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
                          <div>
                            <p className="text-[10px] font-semibold text-foreground">ALLOW</p>
                            <p className="text-[9px] text-muted-foreground">Proceed</p>
                          </div>
                        </div>
                      </div>
                      <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-2 py-2">
                        <div className="flex items-center gap-1.5">
                          <Shield className="h-3 w-3 text-red-500 shrink-0" />
                          <div>
                            <p className="text-[10px] font-semibold text-foreground">BLOCK</p>
                            <p className="text-[9px] text-muted-foreground">Notify owner</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Merge connector */}
                    <div className="relative w-full max-w-[220px]">
                      <div className="flex justify-between px-4">
                        <div className="w-px h-3 bg-border" />
                        <div className="w-px h-3 bg-border" />
                      </div>
                      <div className="w-full h-px bg-border" />
                      <div className="flex flex-col items-center">
                        <div className="w-px h-3 bg-border" />
                        <ArrowDown className="h-3 w-3 text-muted-foreground -mt-0.5" />
                      </div>
                    </div>

                    {/* Node 6: End / Audit Log */}
                    <div className="w-full max-w-[220px] rounded-lg border border-border bg-card px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center justify-center h-6 w-6 rounded-md bg-muted">
                          <Activity className="h-3 w-3 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-foreground">AUDIT_LOG</p>
                          <p className="text-[10px] text-muted-foreground">Record decision + result</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Node legend */}
                <div className="mt-3 flex flex-wrap gap-2">
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <div className="h-2.5 w-2.5 rounded-sm bg-emerald-500/25 border border-emerald-500/40" />
                    Trigger/Allow
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <div className="h-2.5 w-2.5 rounded-sm bg-blue-500/25 border border-blue-500/40" />
                    Condition
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <div className="h-2.5 w-2.5 rounded-sm bg-amber-500/25 border border-amber-500/40" />
                    AI Decision
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <div className="h-2.5 w-2.5 rounded-sm bg-red-500/25 border border-red-500/40" />
                    Block/End
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ── Active Automations ── */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-primary" />
                  <CardTitle className="text-sm font-semibold">Active Automations</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  {activeAutomations.map((wf, i) => (
                    <div key={i} className="rounded-lg border border-border bg-card p-2.5">
                      <div className="flex items-center justify-between mb-0.5">
                        <div className="flex items-center gap-1.5">
                          {wf.hasAiNode && (
                            <Zap className="h-3 w-3 text-amber-500 shrink-0" />
                          )}
                          <span className="text-xs font-medium text-foreground">{wf.name}</span>
                        </div>
                        <Badge
                          variant="outline"
                          className={`text-[10px] gap-1 ${
                            wf.status === "Active"
                              ? ""
                              : wf.status === "Paused"
                                ? "text-amber-600 border-amber-500/30"
                                : "text-muted-foreground"
                          }`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${
                            wf.status === "Active"
                              ? "bg-emerald-500"
                              : wf.status === "Paused"
                                ? "bg-amber-500"
                                : "bg-muted-foreground"
                          }`} />
                          {wf.status}
                        </Badge>
                      </div>
                      <p className="text-[10px] text-muted-foreground leading-relaxed">{wf.description}</p>
                      <div className="flex items-center justify-between mt-1.5">
                        <span className="text-[10px] text-muted-foreground">{wf.runs7d} runs (7d)</span>
                        {wf.hasAiNode && (
                          <Badge variant="secondary" className="text-[9px] px-1.5 py-0 gap-0.5">
                            <Brain className="h-2.5 w-2.5" />
                            AI node
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* ── Cycle Detection Warning ── */}
            <Card className="border-amber-500/30">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <CardTitle className="text-sm font-semibold text-amber-700">Cycle Detection Warning</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 space-y-2">
                  <p className="text-xs text-foreground">
                    Potential circular dependency detected between two workflows:
                  </p>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-xs">
                      <CircleDot className="h-3 w-3 text-amber-500 shrink-0" />
                      <span className="font-mono text-foreground">WF-0072</span>
                      <span className="text-muted-foreground">Compliance Reminder Cascade</span>
                    </div>
                    <div className="flex items-center justify-center">
                      <div className="flex items-center gap-1 text-[10px] text-amber-600">
                        <span>triggers</span>
                        <ArrowDown className="h-2.5 w-2.5 rotate-180" />
                        <ArrowDown className="h-2.5 w-2.5" />
                        <span>triggers</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <CircleDot className="h-3 w-3 text-amber-500 shrink-0" />
                      <span className="font-mono text-foreground">WF-0081</span>
                      <span className="text-muted-foreground">HMMP Review Trigger</span>
                    </div>
                  </div>

                  <Separator className="!mt-3 !mb-2" />

                  <div className="flex items-start gap-2">
                    <Shield className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />
                    <p className="text-[11px] text-muted-foreground">
                      The engine&apos;s <span className="font-mono text-foreground">__workflowDepth</span> guard (max 3) would prevent infinite loops, but this dependency should be reviewed. The cycle was detected via <span className="font-mono text-foreground">validateWorkflowGraph()</span> during the last save.
                    </p>
                  </div>

                  <div className="flex gap-2 mt-2">
                    <Button variant="outline" size="sm" className="text-xs h-7">
                      View dependency graph
                    </Button>
                    <Button variant="outline" size="sm" className="text-xs h-7 text-amber-700 border-amber-500/30">
                      Dismiss
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

          </div>
        </div>
      </div>
    </div>
  )
}
