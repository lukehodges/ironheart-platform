import Link from "next/link"
import {
  ArrowLeft,
  ArrowRight,
  Network,
  User,
  Server,
  Cpu,
  Brain,
  Layers,
  Database,
  ShieldCheck,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Pause,
  Play,
  TreePine,
  Building2,
  FileText,
  Banknote,
  Sparkles,
  Sun,
  Moon,
  Eye,
  Leaf,
  Zap,
  Globe,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

// ─── Swim-lane definitions ──────────────────────────────────────────────────

const lanes = [
  {
    label: "User",
    color: "bg-blue-50/80 dark:bg-blue-950/30",
    borderColor: "border-blue-200 dark:border-blue-800",
    headerBg: "bg-blue-100 dark:bg-blue-900/50",
    headerText: "text-blue-800 dark:text-blue-200",
  },
  {
    label: "tRPC + Next.js",
    color: "bg-violet-50/80 dark:bg-violet-950/30",
    borderColor: "border-violet-200 dark:border-violet-800",
    headerBg: "bg-violet-100 dark:bg-violet-900/50",
    headerText: "text-violet-800 dark:text-violet-200",
  },
  {
    label: "Trigger.dev",
    color: "bg-emerald-50/80 dark:bg-emerald-950/30",
    borderColor: "border-emerald-200 dark:border-emerald-800",
    headerBg: "bg-emerald-100 dark:bg-emerald-900/50",
    headerText: "text-emerald-800 dark:text-emerald-200",
  },
  {
    label: "Claude API",
    color: "bg-amber-50/80 dark:bg-amber-950/30",
    borderColor: "border-amber-200 dark:border-amber-800",
    headerBg: "bg-amber-100 dark:bg-amber-900/50",
    headerText: "text-amber-800 dark:text-amber-200",
  },
  {
    label: "Module Registry",
    color: "bg-rose-50/80 dark:bg-rose-950/30",
    borderColor: "border-rose-200 dark:border-rose-800",
    headerBg: "bg-rose-100 dark:bg-rose-900/50",
    headerText: "text-rose-800 dark:text-rose-200",
  },
  {
    label: "Data Layer",
    color: "bg-slate-50/80 dark:bg-slate-950/30",
    borderColor: "border-slate-200 dark:border-slate-800",
    headerBg: "bg-slate-100 dark:bg-slate-900/50",
    headerText: "text-slate-800 dark:text-slate-200",
  },
]

// ─── BNG Journey steps ──────────────────────────────────────────────────────

const bngSteps = [
  {
    icon: Building2,
    title: "Developer Submits Requirement",
    description: "30-unit BNG requirement for 120-home development in Solent catchment",
    color: "bg-blue-500",
    lightBg: "bg-blue-50 dark:bg-blue-950/40",
    border: "border-blue-200 dark:border-blue-800",
  },
  {
    icon: TreePine,
    title: "Agent Matches 3 Solent Sites",
    description: "AI cross-references habitat type, NCA, proximity, and unit availability in 2.3 seconds",
    color: "bg-emerald-500",
    lightBg: "bg-emerald-50 dark:bg-emerald-950/40",
    border: "border-emerald-200 dark:border-emerald-800",
  },
  {
    icon: FileText,
    title: "Draft Quote Created",
    description: "Agent generates comparison quote with unit pricing, S106 terms, and 30-year covenant details",
    color: "bg-violet-500",
    lightBg: "bg-violet-50 dark:bg-violet-950/40",
    border: "border-violet-200 dark:border-violet-800",
  },
  {
    icon: Banknote,
    title: "Deal Enters Pipeline",
    description: "Deal D-0142 created at Qualified stage, assigned to broker, automated follow-up scheduled",
    color: "bg-amber-500",
    lightBg: "bg-amber-50 dark:bg-amber-950/40",
    border: "border-amber-200 dark:border-amber-800",
  },
  {
    icon: ShieldCheck,
    title: "Compliance Copilot Monitors",
    description: "Watches stage transitions, blocks progression if baseline survey or management plan is missing",
    color: "bg-rose-500",
    lightBg: "bg-rose-50 dark:bg-rose-950/40",
    border: "border-rose-200 dark:border-rose-800",
  },
  {
    icon: Moon,
    title: "Ghost Operator Processes Invoice",
    description: "2:00 AM batch: generates invoice, matches payment terms, queues for approval at 8am",
    color: "bg-indigo-500",
    lightBg: "bg-indigo-50 dark:bg-indigo-950/40",
    border: "border-indigo-200 dark:border-indigo-800",
  },
  {
    icon: Sun,
    title: "Morning Briefing Surfaces Deal",
    description: "8:00 AM: 'Deal D-0142 closed overnight. Invoice #INV-0891 ready for review. Revenue: £90,000'",
    color: "bg-orange-500",
    lightBg: "bg-orange-50 dark:bg-orange-950/40",
    border: "border-orange-200 dark:border-orange-800",
  },
]

// ─── Component ──────────────────────────────────────────────────────────────

export default function InfrastructureArchitecturePage() {
  return (
    <div className="max-w-[1400px] mx-auto px-6 py-8 space-y-12">

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <Link
          href="/admin/brokerage-mockups/ai-assistant"
          className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          AI Platform Vision
        </Link>
        <span className="text-muted-foreground">/</span>
        <span className="text-foreground font-medium">Architecture Diagram</span>
      </div>

      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center h-12 w-12 rounded-2xl bg-primary/10 border border-primary/20">
            <Network className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground tracking-tight">Infrastructure Architecture</h1>
            <p className="text-muted-foreground">AI agent internals, approval gates, memory layers, and how they power BNG brokerage</p>
          </div>
        </div>
      </div>

      {/* ================================================================== */}
      {/* SECTION 1 - AI Agent Architecture (Swim Lane Diagram)              */}
      {/* ================================================================== */}

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Cpu className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">AI Agent Architecture</h2>
        </div>

        {/* Swim lanes container */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          {/* Lane headers */}
          <div className="grid grid-cols-6 border-b border-border">
            {lanes.map((lane) => (
              <div key={lane.label} className={`px-3 py-3 text-center ${lane.headerBg} border-r border-border last:border-r-0`}>
                <span className={`text-xs font-bold uppercase tracking-wider ${lane.headerText}`}>{lane.label}</span>
              </div>
            ))}
          </div>

          {/* Main flow rows */}
          <div className="grid grid-cols-6 min-h-[600px]">
            {lanes.map((lane, i) => (
              <div key={lane.label} className={`${lane.color} border-r border-border last:border-r-0 px-2 py-4 flex flex-col gap-3`}>

                {/* Lane 0: User */}
                {i === 0 && (
                  <>
                    <LaneNode icon={User} label="Chat Input" sublabel="Natural language query" color="bg-blue-500" />
                    <FlowArrow direction="right" />
                    <div className="flex-1" />
                    <LaneNode icon={Eye} label="Approval Card" sublabel="Approve / Edit / Reject" color="bg-blue-600" />
                    <FlowArrow direction="right" label="decision" />
                    <div className="flex-1" />
                    <LaneNode icon={Sun} label="Morning Briefing" sublabel="8:00 AM summary" color="bg-blue-400" />
                  </>
                )}

                {/* Lane 1: tRPC + Next.js */}
                {i === 1 && (
                  <>
                    <LaneNode icon={Server} label="AI Router" sublabel="chat.sendMessage" color="bg-violet-500" />
                    <FlowArrow direction="down" />
                    <LaneNode icon={ShieldCheck} label="Auth + Tenant" sublabel="tenantProcedure" color="bg-violet-600" />
                    <FlowArrow direction="right" />
                    <div className="flex-1" />
                    <LaneNode icon={Sparkles} label="Stream Response" sublabel="SSE to client" color="bg-violet-400" />
                    <FlowArrow direction="left" label="result" />
                  </>
                )}

                {/* Lane 2: Trigger.dev */}
                {i === 2 && (
                  <>
                    <LaneNode icon={Zap} label="ai.runAgent" sublabel="Durable task" color="bg-emerald-500" />
                    <FlowArrow direction="down" />
                    <LaneNode icon={Layers} label="Tool Loop" sublabel="Plan → Execute → Observe" color="bg-emerald-600" />
                    <FlowArrow direction="right" />
                    {/* Approval gate branch */}
                    <div className="rounded-xl border-2 border-dashed border-amber-400 dark:border-amber-600 bg-amber-50/50 dark:bg-amber-950/30 p-2.5 space-y-2">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300 text-center">Approval Gate</p>
                      <div className="flex items-center gap-1.5 justify-center">
                        <Pause className="h-3 w-3 text-amber-600" />
                        <span className="text-[10px] font-mono text-amber-700 dark:text-amber-300">wait.forToken()</span>
                      </div>
                      <div className="flex items-center justify-center gap-1">
                        <span className="text-[10px] text-muted-foreground">User</span>
                        <ArrowRight className="h-2.5 w-2.5 text-amber-500" />
                        <span className="text-[10px] text-muted-foreground">Card</span>
                        <ArrowRight className="h-2.5 w-2.5 text-amber-500" />
                        <span className="text-[10px] text-muted-foreground">Token</span>
                      </div>
                      <div className="flex items-center gap-1.5 justify-center">
                        <Play className="h-3 w-3 text-emerald-600" />
                        <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-300">resume()</span>
                      </div>
                    </div>
                    <FlowArrow direction="down" />
                    <LaneNode icon={CheckCircle2} label="Emit Result" sublabel="Event payload" color="bg-emerald-400" />
                  </>
                )}

                {/* Lane 3: Claude API */}
                {i === 3 && (
                  <>
                    <LaneNode icon={Brain} label="Claude 3.5 Sonnet" sublabel="System prompt + tools" color="bg-amber-500" />
                    <FlowArrow direction="down" />
                    <LaneNode icon={Sparkles} label="Tool Calls" sublabel="Structured JSON output" color="bg-amber-600" />
                    <FlowArrow direction="left" label="tool_use" />
                    <div className="flex-1" />
                    <LaneNode icon={Sparkles} label="Reasoning" sublabel="Chain-of-thought" color="bg-amber-400" />
                    <FlowArrow direction="left" label="response" />
                  </>
                )}

                {/* Lane 4: Module Registry */}
                {i === 4 && (
                  <>
                    <LaneNode icon={Layers} label="Tool Registry" sublabel="7 module schemas" color="bg-rose-500" />
                    <FlowArrow direction="down" />
                    <div className="space-y-1.5">
                      {["sites.*", "deals.*", "inventory.*", "compliance.*", "financials.*", "contacts.*", "documents.*"].map((mod) => (
                        <div key={mod} className="rounded-md bg-card border border-rose-200 dark:border-rose-800 px-2 py-1 text-[10px] font-mono text-rose-700 dark:text-rose-300 text-center">
                          {mod}
                        </div>
                      ))}
                    </div>
                    <FlowArrow direction="right" label="query" />
                  </>
                )}

                {/* Lane 5: Data Layer */}
                {i === 5 && (
                  <>
                    <LaneNode icon={Database} label="PostgreSQL" sublabel="42+ tables" color="bg-slate-500" />
                    <FlowArrow direction="down" />
                    <LaneNode icon={Database} label="Redis Cache" sublabel="Upstash · tenant-scoped" color="bg-slate-600" />
                    <FlowArrow direction="down" />
                    <LaneNode icon={Database} label="Vector Store" sublabel="pgvector embeddings" color="bg-slate-400" />
                    <div className="flex-1" />
                    <LaneNode icon={FileText} label="Audit Log" sublabel="Every tool call logged" color="bg-slate-700" />
                  </>
                )}
              </div>
            ))}
          </div>

          {/* Bottom insets row */}
          <div className="border-t border-border bg-muted/30 p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

              {/* Memory Layers */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Memory Layers</h3>
                <div className="space-y-2">
                  <div className="rounded-lg bg-blue-100 dark:bg-blue-900/40 border border-blue-200 dark:border-blue-800 px-4 py-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-blue-800 dark:text-blue-200">Session Memory</span>
                      <Badge variant="outline" className="text-[10px] border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300">L1</Badge>
                    </div>
                    <p className="text-[10px] text-blue-600 dark:text-blue-400 mt-1">Current conversation context, tool call history, page awareness</p>
                  </div>
                  <div className="rounded-lg bg-violet-100 dark:bg-violet-900/40 border border-violet-200 dark:border-violet-800 px-4 py-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-violet-800 dark:text-violet-200">Cross-session Memory</span>
                      <Badge variant="outline" className="text-[10px] border-violet-300 dark:border-violet-700 text-violet-700 dark:text-violet-300">L2</Badge>
                    </div>
                    <p className="text-[10px] text-violet-600 dark:text-violet-400 mt-1">User preferences, past corrections, entity relationships learned</p>
                  </div>
                  <div className="rounded-lg bg-emerald-100 dark:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-800 px-4 py-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-200">Knowledge Base</span>
                      <Badge variant="outline" className="text-[10px] border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300">L3</Badge>
                    </div>
                    <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1">Uploaded BNG guidance, LNRS docs, habitat classification - RAG retrieval</p>
                  </div>
                </div>
              </div>

              {/* Trust Ratchet */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Trust Ratchet</h3>
                <div className="rounded-xl border border-border bg-card p-4 space-y-4">
                  {/* Tiers */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 text-center rounded-lg bg-rose-100 dark:bg-rose-900/40 border border-rose-200 dark:border-rose-800 px-2 py-2">
                      <p className="text-[10px] font-bold text-rose-700 dark:text-rose-300">BLOCKED</p>
                      <p className="text-[10px] text-rose-600 dark:text-rose-400">Deny-listed</p>
                    </div>
                    <div className="flex-1 text-center rounded-lg bg-amber-100 dark:bg-amber-900/40 border border-amber-200 dark:border-amber-800 px-2 py-2">
                      <p className="text-[10px] font-bold text-amber-700 dark:text-amber-300">CONFIRM</p>
                      <p className="text-[10px] text-amber-600 dark:text-amber-400">Human approval</p>
                    </div>
                    <div className="flex-1 text-center rounded-lg bg-emerald-100 dark:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-800 px-2 py-2">
                      <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300">AUTO</p>
                      <p className="text-[10px] text-emerald-600 dark:text-emerald-400">Trusted action</p>
                    </div>
                  </div>
                  {/* Promotion / Demotion arrows */}
                  <div className="flex items-center justify-center gap-3 text-[10px]">
                    <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                      <ArrowRight className="h-3 w-3" />
                      <span className="font-medium">Promote</span>
                      <span className="text-muted-foreground">(50 approvals)</span>
                    </div>
                    <span className="text-muted-foreground">|</span>
                    <div className="flex items-center gap-1 text-rose-600 dark:text-rose-400">
                      <ArrowLeft className="h-3 w-3" />
                      <span className="font-medium">Demote</span>
                      <span className="text-muted-foreground">(1 rejection)</span>
                    </div>
                  </div>
                  {/* Example tools */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-mono text-muted-foreground">sites.list()</span>
                      <Badge className="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 text-[10px]">AUTO</Badge>
                    </div>
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-mono text-muted-foreground">deals.create()</span>
                      <Badge className="bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800 text-[10px]">CONFIRM</Badge>
                    </div>
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-mono text-muted-foreground">deals.delete()</span>
                      <Badge className="bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800 text-[10px]">BLOCKED</Badge>
                    </div>
                  </div>
                </div>
              </div>

              {/* Fail-safe Branches */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Fail-safe Branches</h3>
                <div className="space-y-2">
                  {[
                    {
                      label: "Token Budget Exceeded",
                      action: "Graceful stop, summarize progress, suggest follow-up",
                      icon: AlertTriangle,
                    },
                    {
                      label: "Tool Call Timeout",
                      action: "Retry with narrower query, then degrade to cached data",
                      icon: Clock,
                    },
                    {
                      label: "Approval Rejected",
                      action: "Rollback via compensation stack, log rejection reason",
                      icon: XCircle,
                    },
                    {
                      label: "Hallucination Guard",
                      action: "Cross-check entity IDs against DB before presenting",
                      icon: ShieldCheck,
                    },
                  ].map((branch) => (
                    <div key={branch.label} className="rounded-lg bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 px-3 py-2.5 flex items-start gap-2.5">
                      <branch.icon className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-[10px] font-semibold text-orange-800 dark:text-orange-200">{branch.label}</p>
                        <p className="text-[10px] text-orange-600 dark:text-orange-400">{branch.action}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* SECTION 2 - How This Powers BNG                                     */}
      {/* ================================================================== */}

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Leaf className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">How This Powers BNG</h2>
          <Badge variant="outline" className="text-xs ml-2">End-to-end journey</Badge>
        </div>

        <p className="text-sm text-muted-foreground max-w-3xl">
          One complete BNG deal lifecycle, from developer requirement to closed revenue, showing which AI layer activates at each step.
        </p>

        {/* Linear flow */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="p-6">
            <div className="relative">
              {/* Connecting line */}
              <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-400 via-emerald-400 via-amber-400 via-rose-400 to-orange-400 dark:from-blue-700 dark:via-emerald-700 dark:via-amber-700 dark:via-rose-700 dark:to-orange-700 hidden md:block" />

              <div className="space-y-4">
                {bngSteps.map((step, idx) => (
                  <div key={idx} className="flex items-start gap-4 relative">
                    {/* Step indicator */}
                    <div className={`relative z-10 flex items-center justify-center h-16 w-16 rounded-2xl ${step.color} text-white shrink-0 shadow-lg`}>
                      <step.icon className="h-7 w-7" />
                    </div>

                    {/* Card */}
                    <div className={`flex-1 rounded-xl border ${step.border} ${step.lightBg} p-4`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-[10px] font-mono">Step {idx + 1}</Badge>
                            <h3 className="text-sm font-semibold text-foreground">{step.title}</h3>
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed">{step.description}</p>
                        </div>
                      </div>
                    </div>

                    {/* Arrow to next */}
                    {idx < bngSteps.length - 1 && (
                      <div className="absolute left-[30px] -bottom-3 z-20 hidden md:block">
                        <div className="h-3 w-0.5 bg-transparent" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Callout boxes */}
          <div className="border-t border-border bg-muted/30 p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="border-primary/30 bg-primary/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                    <TreePine className="h-3.5 w-3.5" />
                    Parcel-level Allocation
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Agent allocates BDUs at the individual parcel level, tracking baseline vs. improvement scores per habitat type, ensuring no double-counting across concurrent deals.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-violet-300 dark:border-violet-700 bg-violet-50/50 dark:bg-violet-950/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-violet-700 dark:text-violet-300 flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Multi-tenant Isolation
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Every AI query, tool call, memory layer, and audit log entry is scoped to the tenant. Cross-tenant data leakage is architecturally impossible via row-level policies.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-emerald-300 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-950/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                    <Globe className="h-3.5 w-3.5" />
                    Cross-vertical Scale
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {["Nutrients", "Carbon", "Real Estate", "Energy"].map((v) => (
                      <Badge key={v} variant="outline" className="text-[10px]">{v}</Badge>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Same agent architecture, module registry, and trust ratchet apply to every vertical. BNG is the first deployment; the pattern scales to all environmental markets.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

    </div>
  )
}

// ─── Reusable lane sub-components ───────────────────────────────────────────

function LaneNode({
  icon: Icon,
  label,
  sublabel,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  sublabel: string
  color: string
}) {
  return (
    <div className="rounded-xl border border-border bg-card shadow-sm p-2.5 flex items-center gap-2">
      <div className={`flex items-center justify-center h-7 w-7 rounded-lg ${color} text-white shrink-0`}>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold text-foreground leading-tight truncate">{label}</p>
        <p className="text-[10px] text-muted-foreground leading-tight truncate">{sublabel}</p>
      </div>
    </div>
  )
}

function FlowArrow({
  direction,
  label,
}: {
  direction: "right" | "left" | "down"
  label?: string
}) {
  if (direction === "down") {
    return (
      <div className="flex flex-col items-center py-1">
        <div className="w-0.5 h-4 bg-primary/50 dark:bg-primary/40" />
        <div className="text-primary/70 dark:text-primary/60 text-[10px] leading-none">&#9660;</div>
        {label && <span className="text-[9px] text-muted-foreground mt-0.5">{label}</span>}
      </div>
    )
  }
  if (direction === "left") {
    return (
      <div className="flex items-center justify-center gap-1 py-1">
        <span className="text-primary/70 dark:text-primary/60 text-[10px] leading-none">&#9664;</span>
        <div className="h-0.5 w-6 bg-primary/50 dark:bg-primary/40" />
        {label && <span className="text-[9px] text-muted-foreground">{label}</span>}
      </div>
    )
  }
  return (
    <div className="flex items-center justify-center gap-1 py-1">
      {label && <span className="text-[9px] text-muted-foreground">{label}</span>}
      <div className="h-0.5 w-6 bg-primary/50 dark:bg-primary/40" />
      <span className="text-primary/70 dark:text-primary/60 text-[10px] leading-none">&#9654;</span>
    </div>
  )
}
