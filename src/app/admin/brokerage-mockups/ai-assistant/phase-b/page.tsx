"use client"

import Link from "next/link"
import {
  Bot,
  Send,
  Bell,
  BarChart3,
  Zap,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Brain,
  User,
  Activity,
  Shield,
  Undo2,
  Timer,
  TrendingUp,
} from "lucide-react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { PhaseNav } from "../_components/phase-nav"
import { StreamingToolCall } from "../_components/streaming-tool-call"
import { ApprovalCard } from "../_components/approval-card"

// ─── Chat Message Types ──────────────────────────────────────────────
type ChatRole = "system" | "assistant" | "user"

interface ChatMessage {
  id: string
  role: ChatRole
  time: string
  content: React.ReactNode
}

// ─── Right Panel Types ──────────────────────────────────────────────
interface ApprovalQueueItem {
  title: string
  tier: "confirm" | "escalate"
  expiresIn: string
  summary: string
}

interface AutoAction {
  icon: React.ReactNode
  label: string
  timeAgo: string
  detail: string
}

interface UndoItem {
  label: string
  completedAt: string
  undoDeadline: string
}

// ─── Mock Data: Chat Messages ────────────────────────────────────────

const chatMessages: ChatMessage[] = [
  {
    id: "1",
    role: "system",
    time: "8:00 AM",
    content: "Session started. Actionable Agent mode enabled - all actions require your approval before execution.",
  },
  {
    id: "2",
    role: "assistant",
    time: "8:01 AM",
    content: (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Sparkles className="h-4 w-4 text-primary" />
          Morning Briefing &mdash; 9 March 2026
        </div>

        <p className="text-sm text-foreground">
          Good morning. <strong>3 actions need your attention</strong>, and <strong>4 were handled automatically</strong> overnight
          under your pre-approved rules.
        </p>

        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Pending Approvals
          </h4>
          <ol className="space-y-2 text-sm text-foreground">
            <li className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
              <span>
                <strong>Compliance reminder</strong> for Whiteley Farm (S-0001) &mdash; monitoring report is 7 days overdue. Draft ready to send to Tom Jenkins.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
              <span>
                <strong>Comparison quote</strong> for Taylor Wimpey &mdash; 30 biodiversity units across 3 Solent sites. Draft quote ready for review.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
              <span>
                <strong>Site visit reschedule</strong> &mdash; Test Valley Grassland assessment moved from Tuesday to Thursday due to weather forecast (heavy rain).
              </span>
            </li>
          </ol>
        </div>

        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Handled Overnight (AUTO tier)
          </h4>
          <ul className="space-y-1 text-sm text-foreground">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
              <span>Sent 3 compliance deadline reminders (7-day warnings)</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
              <span>Updated portfolio metrics snapshot across 14 catchments</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
              <span>Confirmed booking request from Greenfield Estates (high-trust customer)</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
              <span>Published 1 five-star review (above auto-publish threshold)</span>
            </li>
          </ul>
        </div>

        <p className="text-sm text-muted-foreground">
          I&apos;ll start with the highest priority. Here&apos;s the Taylor Wimpey quote for your approval:
        </p>
      </div>
    ),
  },
  {
    id: "3",
    role: "assistant",
    time: "8:01 AM",
    content: (
      <div className="space-y-3">
        <StreamingToolCall
          steps={[
            { type: "status", label: "Retrieving Taylor Wimpey requirement..." },
            { type: "tool_call", label: "deals.getRequirement({ dealId: 'D-0042' })" },
            { type: "tool_result", label: "30 off-site biodiversity units, Solent catchment" },
            { type: "status", label: "Matching supply sites..." },
            { type: "tool_call", label: "matching.findSupply({ catchment: 'Solent', units: 30 })" },
            { type: "tool_result", label: "3 sites matched, best: Manor Fields (94% match)" },
            { type: "status", label: "Generating comparison quote..." },
            { type: "tool_call", label: "deals.createDraftQuote({ dealId: 'D-0042', siteId: 'S-0005' })" },
            { type: "tool_result", label: "Draft quote Q-0187 created" },
          ]}
        />

        <ApprovalCard
          title="Create comparison quote for Taylor Wimpey"
          tier="confirm"
          details={[
            { label: "Developer", value: "Taylor Wimpey Plc" },
            { label: "Requirement", value: "30 off-site biodiversity units" },
            { label: "Best match", value: "Manor Fields (S-0005) - 94% match" },
            { label: "Unit price", value: "£3,000" },
            { label: "Total quote value", value: "£90,000" },
            { label: "Commission (20%)", value: "£18,000" },
          ]}
          impact="Sends a branded PDF quote to james.thornton@taylorwimpey.co.uk. Deal D-0042 moves to QUOTE_SENT. This is the first quote to this developer - establishes pricing benchmark."
          reasoning="Taylor Wimpey submitted a requirement 48 hours ago (SLA target: respond within 72h). Manor Fields is the strongest match: same National Character Area, LNRS-aligned habitat types, and 15km proximity. Historical acceptance rate for similar quotes: 68%. You've approved 23/24 similar quote actions (96%)."
          expiresIn="28m 15s"
        />
      </div>
    ),
  },
  {
    id: "4",
    role: "user",
    time: "8:03 AM",
    content: "Approve - send the quote.",
  },
  {
    id: "5",
    role: "assistant",
    time: "8:03 AM",
    content: (
      <div className="space-y-4">
        <StreamingToolCall
          steps={[
            { type: "status", label: "Generating branded PDF quote..." },
            { type: "tool_call", label: "documents.generateQuotePDF({ quoteId: 'Q-0187' })" },
            { type: "tool_result", label: "PDF generated - 2 pages" },
            { type: "status", label: "Sending to Taylor Wimpey..." },
            { type: "tool_call", label: "communications.sendEmail({ to: 'james.thornton@taylorwimpey.co.uk', attachment: 'Q-0187.pdf' })" },
            { type: "tool_result", label: "Email sent successfully" },
            { type: "status", label: "Updating deal status..." },
            { type: "tool_call", label: "deals.updateStatus({ dealId: 'D-0042', status: 'QUOTE_SENT' })" },
            { type: "tool_result", label: "Deal D-0042 → QUOTE_SENT" },
          ]}
        />

        <div className="flex items-center gap-2 rounded-lg bg-muted/50 border border-primary/30 px-3 py-2.5 text-sm text-foreground">
          <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
          <span>
            <strong>Quote sent to Taylor Wimpey.</strong> Deal D-0042 moved to QUOTE_SENT.
            James Thornton will receive the PDF at james.thornton@taylorwimpey.co.uk.
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-xs">
          <Undo2 className="h-3.5 w-3.5 text-muted-foreground" />
          <button className="text-primary hover:underline cursor-pointer">
            Undo &mdash; available until 9pm
          </button>
          <span className="text-muted-foreground">(revokes email, reverts deal status)</span>
        </div>

        <Separator />

        {/* Trust ratchet suggestion */}
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
          <div className="flex items-start gap-3">
            <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10 shrink-0">
              <TrendingUp className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground mb-1">
                Suggested automation
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                Your team has approved <strong className="text-foreground">23 of 24</strong> similar
                &ldquo;Send Quote&rdquo; actions (96% approval rate). Would you like the agent to handle
                standard quotes automatically?
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                <Button size="sm" className="h-7 text-xs">
                  Yes, automate
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-xs">
                  Keep reviewing
                </Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground">
                  Remind me later
                </Button>
              </div>
            </div>
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          Moving on to your next approval &mdash; the compliance reminder for Whiteley Farm. Ready to review?
        </p>
      </div>
    ),
  },
]

// ─── Mock Data: Approval Queue ───────────────────────────────────────

const approvalQueue: ApprovalQueueItem[] = [
  {
    title: "Send compliance reminder to Tom Jenkins",
    tier: "confirm",
    expiresIn: "42m 30s",
    summary: "Whiteley Farm (S-0001) - Annual Habitat Monitoring Report, 7 days overdue",
  },
  {
    title: "Create comparison quote for Taylor Wimpey",
    tier: "confirm",
    expiresIn: "28m 15s",
    summary: "30 biodiversity units, Manor Fields (S-0005), £90,000 total",
  },
  {
    title: "Reschedule site visit - Test Valley Grassland",
    tier: "confirm",
    expiresIn: "1h 15m",
    summary: "Move from Tuesday to Thursday (weather: heavy rain forecast Tue–Wed)",
  },
]

// ─── Mock Data: Auto Actions ─────────────────────────────────────────

const autoActions: AutoAction[] = [
  {
    icon: <Bell className="h-4 w-4 text-emerald-500" />,
    label: "Sent 3 compliance deadline reminders",
    timeAgo: "11:30 PM",
    detail: "7-day warnings to assigned contacts for overdue items",
  },
  {
    icon: <BarChart3 className="h-4 w-4 text-emerald-500" />,
    label: "Updated portfolio metrics snapshot",
    timeAgo: "2:15 AM",
    detail: "42 agreements, 14 catchments, £4.2M pipeline refreshed",
  },
  {
    icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
    label: "Confirmed booking - Greenfield Estates",
    timeAgo: "3:40 AM",
    detail: "High-trust customer, within auto-approval rules",
  },
  {
    icon: <Sparkles className="h-4 w-4 text-emerald-500" />,
    label: "Published 5-star review",
    timeAgo: "6:10 AM",
    detail: "Above auto-publish threshold (4.5+), no moderation needed",
  },
]

// ─── Mock Data: Undo Stack ───────────────────────────────────────────

const undoStack: UndoItem[] = [
  {
    label: "Quote sent to Taylor Wimpey (Q-0187)",
    completedAt: "8:03 AM",
    undoDeadline: "9:00 PM",
  },
  {
    label: "Booking confirmed - Greenfield Estates",
    completedAt: "3:40 AM",
    undoDeadline: "3:40 PM",
  },
]

// ─── Page Component ──────────────────────────────────────────────────

export default function PhaseBPage() {
  return (
    <div className="min-h-screen bg-background">
      <PhaseNav
        current="B"
        title="Phase B - Actionable Agent"
        subtitle="The AI assistant can now propose actions, present them for approval, and execute on your behalf. Every mutation requires explicit consent through tiered approval cards."
      />

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-primary/10 border border-primary/20">
              <Brain className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground tracking-tight">
                Phase B: Actionable Agent
              </h1>
              <p className="text-sm text-muted-foreground">
                Propose, approve, execute &mdash; every action requires your explicit consent
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1.5 text-xs">
              <Shield className="h-3 w-3" />
              Approval Mode
            </Badge>
            <Badge variant="outline" className="gap-1.5 text-xs">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Online
            </Badge>
          </div>
        </div>

        {/* Three-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left column - Chat (3 cols) */}
          <div className="lg:col-span-3 space-y-0">
            <Card className="flex flex-col overflow-hidden">
              <CardHeader className="border-b border-border pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <CardTitle className="text-sm font-semibold">
                      Session &mdash; Morning Approvals
                    </CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      3 pending
                    </Badge>
                    <span className="text-xs text-muted-foreground">9 March 2026</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {/* Messages */}
                <div className="divide-y divide-border/50">
                  {chatMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`px-4 py-4 ${msg.role === "user" ? "bg-muted/30" : ""}`}
                    >
                      <div
                        className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
                      >
                        {/* Avatar */}
                        <Avatar className="h-8 w-8 shrink-0">
                          <AvatarFallback
                            className={
                              msg.role === "system"
                                ? "bg-muted text-muted-foreground text-xs"
                                : msg.role === "assistant"
                                  ? "bg-primary/10 text-primary text-xs"
                                  : "bg-foreground/10 text-foreground text-xs"
                            }
                          >
                            {msg.role === "user" ? (
                              <User className="h-4 w-4" />
                            ) : (
                              <Bot className="h-4 w-4" />
                            )}
                          </AvatarFallback>
                        </Avatar>

                        {/* Content */}
                        <div
                          className={`flex-1 min-w-0 ${msg.role === "user" ? "text-right" : ""}`}
                        >
                          <div
                            className={`flex items-center gap-2 mb-1 ${msg.role === "user" ? "justify-end" : ""}`}
                          >
                            <span className="text-xs font-medium text-foreground">
                              {msg.role === "system"
                                ? "System"
                                : msg.role === "assistant"
                                  ? "AI Assistant"
                                  : "You"}
                            </span>
                            <span className="text-xs text-muted-foreground">{msg.time}</span>
                          </div>
                          <div
                            className={`${
                              msg.role === "user"
                                ? "inline-block text-left rounded-2xl rounded-tr-sm bg-primary text-primary-foreground px-4 py-2.5 text-sm"
                                : msg.role === "system"
                                  ? "text-sm text-muted-foreground italic"
                                  : "rounded-2xl rounded-tl-sm bg-card border border-border px-4 py-3"
                            }`}
                          >
                            {msg.content}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Chat Input */}
                <div className="border-t border-border p-3">
                  <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/30 px-3 py-2.5">
                    <Bot className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="flex-1 text-sm text-muted-foreground">
                      Review approvals, ask questions, or give instructions...
                    </span>
                    <Button
                      size="sm"
                      variant="default"
                      className="h-8 w-8 p-0 rounded-lg shrink-0"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right column - Panels (2 cols) */}
          <div className="lg:col-span-2 space-y-5">
            {/* Approval Queue */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-primary" />
                    <CardTitle className="text-sm font-semibold">Approval Queue</CardTitle>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {approvalQueue.length} pending
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  {approvalQueue.map((item, i) => (
                    <div
                      key={i}
                      className={`rounded-lg border p-3 bg-muted/40 ${
                        item.tier === "escalate"
                          ? "border-destructive/40"
                          : "border-primary/30"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <span className="text-sm font-medium text-foreground leading-snug">
                          {item.title}
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-xs shrink-0 ${
                            item.tier === "escalate"
                              ? "border-destructive/50 text-destructive"
                              : "border-primary/50 text-primary"
                          }`}
                        >
                          {item.tier === "escalate" ? "ESCALATE" : "CONFIRM"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed mb-2">
                        {item.summary}
                      </p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Timer className="h-3 w-3" />
                          Expires in {item.expiresIn}
                        </div>
                        <Button variant="ghost" size="sm" className="h-6 text-xs px-2">
                          Review
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recent Auto Actions */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-primary" />
                    <CardTitle className="text-sm font-semibold">Recent Auto Actions</CardTitle>
                  </div>
                  <Badge variant="outline" className="text-xs gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    AUTO tier
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  {autoActions.map((action, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="mt-0.5 flex items-center justify-center h-7 w-7 rounded-lg bg-muted shrink-0">
                        {action.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground leading-snug">{action.label}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{action.detail}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {action.timeAgo}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 pt-3 border-t border-border">
                  <p className="text-xs text-muted-foreground text-center">
                    4 actions executed automatically overnight under pre-approved rules
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Undo Stack */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Undo2 className="h-4 w-4 text-primary" />
                  <CardTitle className="text-sm font-semibold">Undo Stack</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  {undoStack.map((item, i) => (
                    <div key={i} className="rounded-lg border border-border bg-card p-3">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <span className="text-sm font-medium text-foreground">{item.label}</span>
                        <Badge variant="outline" className="text-xs shrink-0">Reversible</Badge>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Completed {item.completedAt}</span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Undo until {item.undoDeadline}
                        </span>
                      </div>
                      <div className="mt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/5"
                        >
                          <Undo2 className="h-3 w-3" />
                          Undo
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Token Usage */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary" />
                  <CardTitle className="text-sm font-semibold">Token Usage This Session</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between text-sm mb-1.5">
                      <span className="text-muted-foreground">Tokens used</span>
                      <span className="font-semibold text-foreground">42,000 / 50,000</span>
                    </div>
                    <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-amber-500 transition-all"
                        style={{ width: "84%" }}
                      />
                    </div>
                    <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      84% used &mdash; approaching session limit
                    </p>
                  </div>
                  <Separator />
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg border border-border bg-muted/30 p-3 text-center">
                      <p className="text-xl font-bold text-foreground">27</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Tool calls</p>
                    </div>
                    <div className="rounded-lg border border-border bg-muted/30 p-3 text-center">
                      <p className="text-xl font-bold text-foreground">3</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Approvals processed</p>
                    </div>
                    <div className="rounded-lg border border-border bg-muted/30 p-3 text-center">
                      <p className="text-xl font-bold text-foreground">4</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Auto actions</p>
                    </div>
                    <div className="rounded-lg border border-border bg-muted/30 p-3 text-center">
                      <p className="text-xl font-bold text-foreground">£1.86</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Session cost</p>
                    </div>
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
