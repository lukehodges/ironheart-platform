import Link from "next/link"
import {
  Brain,
  ChevronRight,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Lock,
  Zap,
  Database,
  Moon,
  Search,
  GitBranch,
  Network,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

// ─── Phase data ───────────────────────────────────────────────────────────────

const phases = [
  {
    id: "A",
    href: "/admin/brokerage-mockups/ai-assistant/phase-a",
    title: "Read-only Intelligence",
    tagline: "The agent reads everything, recommends intelligently, touches nothing.",
    status: "In Development" as const,
    deliverables: [
      "Chat with streaming tool calls across all 7 modules",
      "BNG-specific entity cards (sites, deals, units)",
      "Real-time tool call audit log + token usage",
    ],
    icon: Search,
    color: "border-blue-200 dark:border-blue-800",
    badgeColor: "bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-800 font-semibold",
  },
  {
    id: "B",
    href: "/admin/brokerage-mockups/ai-assistant/phase-b",
    title: "Actionable Agent",
    tagline: "Three-tier approval system gives you control over every action.",
    status: "Planned Q2" as const,
    deliverables: [
      "CONFIRM approval cards with approve / edit / reject",
      "Trust ratchet: tools auto-promote after 50 approvals",
      "Compensation stack: undo any reversible action",
    ],
    icon: CheckCircle2,
    color: "border-emerald-200 dark:border-emerald-800",
    badgeColor: "bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
  },
  {
    id: "C",
    href: "/admin/brokerage-mockups/ai-assistant/phase-c",
    title: "Workflow Intelligence",
    tagline: "Describe a process in plain English. The agent builds the workflow.",
    status: "Planned Q2" as const,
    deliverables: [
      "Natural language \u2192 visual workflow generation",
      "AI_DECISION nodes with confidence scoring",
      "Self-healing: agent diagnoses and recovers failures",
    ],
    icon: GitBranch,
    color: "border-violet-200 dark:border-violet-800",
    badgeColor: "bg-violet-50 dark:bg-violet-950 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800",
  },
  {
    id: "D",
    href: "/admin/brokerage-mockups/ai-assistant/phase-d",
    title: "Memory & Context",
    tagline: "The agent remembers what you taught it, cites its sources, learns from corrections.",
    status: "Planned Q3" as const,
    deliverables: [
      "Cross-session memory: 'Last time you were on Deal D-0089...'",
      "Knowledge base: upload BNG docs, agent cites them",
      "Correction learning: 47 business rules, counting",
    ],
    icon: Database,
    color: "border-amber-200 dark:border-amber-800",
    badgeColor: "bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800",
  },
  {
    id: "E",
    href: "/admin/brokerage-mockups/ai-assistant/phase-e",
    title: "Autonomous Operations",
    tagline: "The Ghost Operator works overnight. You review the briefing at 8am.",
    status: "Planned Q3" as const,
    deliverables: [
      "Ghost Operator: confirms bookings, processes invoices at 2am",
      "Morning briefing: overnight summary + today's priorities",
      "Compliance copilot: blocks stage transitions on missing docs",
    ],
    icon: Moon,
    color: "border-rose-200 dark:border-rose-800",
    badgeColor: "bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800",
  },
]

// ─── Capability heatmap ───────────────────────────────────────────────────────

const capabilities = [
  { label: "Read & Reason", phases: [true, true, true, true, true] },
  { label: "Approve & Act", phases: [false, true, true, true, true] },
  { label: "Workflow Intelligence", phases: [false, false, true, true, true] },
  { label: "Memory & Context", phases: [false, false, false, true, true] },
  { label: "Autonomous Operations", phases: [false, false, false, false, true] },
  { label: "Cross-vertical Scale", phases: [true, true, true, true, true] },
]

// ─── Component ────────────────────────────────────────────────────────────────

export default function AIVisionLandingPage() {
  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-12">

      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center h-12 w-12 rounded-2xl bg-primary/10 border border-primary/20">
            <Brain className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground tracking-tight">AI Platform Vision</h1>
            <p className="text-muted-foreground">Five phases from read-only intelligence to autonomous overnight operations</p>
          </div>
        </div>
      </div>

      {/* Phase timeline */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">The Roadmap</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {phases.map((phase, idx) => (
            <div key={phase.id} className={`relative rounded-2xl border-2 ${phase.color} bg-card p-5 flex flex-col gap-3 hover:shadow-md transition-shadow`}>
              {/* Phase ID */}
              <div className="flex items-center justify-between">
                <div className="flex items-center justify-center h-9 w-9 rounded-xl bg-muted text-lg font-bold text-foreground">
                  {phase.id}
                </div>
                <Badge variant="outline" className={`text-xs ${phase.badgeColor}`}>{phase.status}</Badge>
              </div>

              {/* Title + tagline */}
              <div>
                <p className="font-semibold text-foreground text-sm leading-tight">{phase.title}</p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{phase.tagline}</p>
              </div>

              {/* Deliverables */}
              <ul className="space-y-1 flex-1">
                {phase.deliverables.map((d, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                    <CheckCircle2 className="h-3 w-3 text-primary mt-0.5 shrink-0" />
                    {d}
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <Link href={phase.href}>
                <Button variant="outline" size="sm" className="w-full text-xs h-8 gap-1.5">
                  Preview Phase {phase.id}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>

              {/* Connector arrow between cards */}
              {idx < phases.length - 1 && (
                <div className="hidden md:block absolute -right-3.5 top-1/2 -translate-y-1/2 z-10">
                  <ChevronRight className="h-5 w-5 text-muted-foreground/50" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Before/After strip */}
      <div className="rounded-2xl border border-border bg-muted/30 p-6">
        <p className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wider">Time to answer: &quot;Which Solent sites have unallocated BDUs?&quot;</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="text-center">
            <p className="text-3xl font-bold text-foreground">45 min</p>
            <p className="text-sm text-muted-foreground mt-1">Manual - open 4 spreadsheets, cross-reference, email the ecologist</p>
          </div>
          <div className="text-center border-x border-border">
            <p className="text-3xl font-bold text-primary">2.3 sec</p>
            <p className="text-sm text-muted-foreground mt-1">Phase A - agent queries all modules, returns ranked entity cards</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-foreground">0 sec</p>
            <p className="text-sm text-muted-foreground mt-1">Phase E - Ghost Operator monitors this overnight, briefing at 8am</p>
          </div>
        </div>
      </div>

      {/* Capability heatmap */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Capability Unlock Map</h2>
        <div className="rounded-2xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50">
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground w-48">Capability</th>
                {phases.map((p) => (
                  <th key={p.id} className="px-4 py-3 text-center text-xs font-medium text-muted-foreground">{p.id}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {capabilities.map((cap, i) => (
                <tr key={i} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 text-xs font-medium text-foreground">{cap.label}</td>
                  {cap.phases.map((active, j) => (
                    <td key={j} className="px-4 py-3 text-center">
                      {active ? (
                        <CheckCircle2 className="h-4 w-4 text-primary mx-auto" />
                      ) : (
                        <Lock className="h-3.5 w-3.5 text-muted-foreground/30 mx-auto" />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Infrastructure thumbnail */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-muted">
              <Network className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Architecture Diagram</p>
              <p className="text-sm text-muted-foreground">AI agent internals + how it powers BNG brokerage</p>
            </div>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/brokerage-mockups/ai-assistant/infrastructure">
              View diagram <ArrowRight className="h-4 w-4 ml-1.5" />
            </Link>
          </Button>
        </div>
        {/* Mini diagram preview */}
        <div className="bg-muted/50 border-t border-border px-6 py-4 flex items-center gap-4 overflow-x-auto">
          {["User", "tRPC + Next.js", "Trigger.dev", "Claude API", "Module Registry", "Data Layer"].map((node, i, arr) => (
            <div key={node} className="flex items-center gap-3 shrink-0">
              <div className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground whitespace-nowrap">
                {node}
              </div>
              {i < arr.length - 1 && <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />}
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}
