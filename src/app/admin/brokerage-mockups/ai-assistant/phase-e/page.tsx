"use client"

import Link from "next/link"
import {
  Bot,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Shield,
  TrendingUp,
  ChevronRight,
  Sparkles,
  Search,
  Activity,
  Eye,
  BookOpen,
  Wrench,
  ArrowUpRight,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { PhaseNav } from "../_components/phase-nav"

// ─── Mock data ────────────────────────────────────────────────────────────────

const completedItems = [
  {
    icon: CheckCircle2,
    text: "3 bookings confirmed",
    detail: "Taylor Wimpey (S-0005), Bellway (S-0001), Persimmon (S-0004) - all matched to available BDU slots",
  },
  {
    icon: CheckCircle2,
    text: "1 review published",
    detail: "Landowner review for Whiteley Farm - 4.8 stars, auto-published (above 4.0 threshold)",
  },
  {
    icon: CheckCircle2,
    text: "1 invoice processed",
    detail: "Invoice I-0248 for Manor Fields Q1 management fee - £6,400 sent to Taylor Wimpey accounts",
  },
]

const attentionItems = [
  {
    icon: AlertTriangle,
    color: "text-amber-500",
    text: "Mixed review held for your review",
    detail: "Hamble Wetlands landowner left 2.5 stars with comments about drainage. Below auto-publish threshold - needs manual review.",
    action: "Review now",
    href: "/admin/brokerage-mockups/ai-assistant",
  },
  {
    icon: AlertTriangle,
    color: "text-amber-500",
    text: "Aging deal: D-0067 - 14 days without update",
    detail: "Bellway Homes Solent allocation. Last activity was a site visit on 23 Feb. No follow-up logged. Recommend a check-in call.",
    action: "View deal",
    href: "/admin/brokerage-mockups/deals/D-0067",
  },
  {
    icon: Wrench,
    color: "text-blue-500",
    text: "Self-corrected error at 3:14 AM",
    detail: "Caught and fixed autonomously. See details below.",
  },
]

const errorCard = {
  timestamp: "3:14 AM",
  whatHappened: "Invoice I-0234 had duplicate line items - two identical rows for 'BDU allocation fee (30 units @ £3,000)'.",
  howCaught: "Validation check detected duplicate SKU 'BDU-ALLOC-30' appearing twice in the same invoice line items array.",
  howCorrected: "Removed duplicate line, recalculated total: £4,200 adjusted to £2,100. Invoice re-sent to Persimmon accounts.",
  whatLearned: "Added duplicate-line-item check to invoice processing pipeline. This rule will now catch any invoice with identical SKU + quantity combinations before processing.",
}

const learnedRules = [
  { rule: "Duplicate line item detection", source: "Invoice I-0234 error (3:14 AM)", module: "Invoicing" },
  { rule: "Landowner review sentiment threshold lowered to 3.5", source: "Analysis of 47 historical reviews", module: "Reviews" },
  { rule: "Auto-escalate deals with no activity >10 days", source: "D-0052 missed follow-up pattern", module: "Deals" },
]

const overnightTimeline = [
  { start: 0, width: 8, color: "bg-emerald-500", label: "3 bookings confirmed", time: "11:00 PM" },
  { start: 12, width: 6, color: "bg-emerald-500", label: "Review published", time: "12:15 AM" },
  { start: 25, width: 4, color: "bg-red-500", label: "Error caught & corrected", time: "3:14 AM" },
  { start: 32, width: 6, color: "bg-emerald-500", label: "Invoice processed", time: "4:20 AM" },
  { start: 45, width: 5, color: "bg-amber-500", label: "Review held for approval", time: "5:45 AM" },
  { start: 55, width: 10, color: "bg-emerald-500", label: "Morning briefing compiled", time: "7:30 AM" },
]

const timeMarkers = [
  { label: "11 PM", position: 0 },
  { label: "12 AM", position: 12.5 },
  { label: "2 AM", position: 25 },
  { label: "4 AM", position: 50 },
  { label: "6 AM", position: 75 },
  { label: "7 AM", position: 87.5 },
]

const complianceGaps = [
  {
    site: "Hamble Wetlands",
    type: "Habitat monitoring report",
    daysOverdue: 12,
    status: "Reminder sent",
  },
  {
    site: "Oakfield Meadows",
    type: "NE registration renewal",
    daysOverdue: 5,
    status: "Scheduled for today",
  },
  {
    site: "Riverside Copse",
    type: "S106 compliance cert",
    daysOverdue: 3,
    status: "Pending landowner signature",
  },
]

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PhaseEPage() {
  return (
    <div className="min-h-screen">
      <PhaseNav
        current="E"
        title="Phase E - Autonomous Operations"
        subtitle="The Ghost Operator runs overnight. It executes, self-corrects, and reports back transparently every morning."
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
                    <CardTitle className="text-sm font-semibold">Morning Briefing - 9 March 2026, 8:00 AM</CardTitle>
                  </div>
                  <Badge variant="outline" className="gap-1.5 text-xs">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    Autonomous mode
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Auto-generated briefing from overnight autonomous operations
                </p>
              </CardHeader>

              <CardContent className="p-0">
                <div className="divide-y divide-border/50">

                  {/* Agent morning briefing */}
                  <div className="px-4 py-4">
                    <div className="flex gap-3">
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarFallback className="bg-primary/10 text-xs"><Bot className="h-4 w-4 text-primary" /></AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium text-foreground">Ghost Operator</span>
                          <span className="text-xs text-muted-foreground">8:00 AM - auto-loaded</span>
                        </div>
                        <div className="rounded-2xl rounded-tl-sm bg-card border border-border px-4 py-3 space-y-4">

                          {/* Greeting */}
                          <p className="text-sm text-foreground font-medium">
                            Good morning. Here&apos;s what happened overnight.
                          </p>

                          {/* ── Completed section ── */}
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">Completed</span>
                            </div>
                            <div className="space-y-2">
                              {completedItems.map((item, i) => (
                                <div key={i} className="rounded-lg bg-card border border-border border-l-4 border-l-emerald-500 px-3 py-2">
                                  <div className="flex items-center gap-2">
                                    <item.icon className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                                    <span className="text-sm font-medium text-foreground">{item.text}</span>
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-0.5 ml-5.5">{item.detail}</p>
                                </div>
                              ))}
                            </div>
                          </div>

                          <Separator />

                          {/* ── Needs attention section ── */}
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <AlertTriangle className="h-4 w-4 text-amber-500" />
                              <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wide">Needs attention</span>
                            </div>
                            <div className="space-y-2">
                              {attentionItems.map((item, i) => (
                                <div key={i} className="rounded-lg bg-card border border-border border-l-4 border-l-amber-500 px-3 py-2">
                                  <div className="flex items-center gap-2">
                                    <item.icon className={`h-3.5 w-3.5 ${item.color} shrink-0`} />
                                    <span className="text-sm font-medium text-foreground">{item.text}</span>
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-0.5 ml-5.5">{item.detail}</p>
                                  {item.action && (
                                    <div className="mt-1.5 ml-5.5">
                                      <Link href={item.href!} className="text-xs font-medium text-primary hover:underline inline-flex items-center gap-1">
                                        {item.action} <ArrowUpRight className="h-3 w-3" />
                                      </Link>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>

                          <Separator />

                          {/* ── Error self-correction card ── */}
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <Shield className="h-4 w-4 text-blue-500" />
                              <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide">Transparent Accountability &mdash; {errorCard.timestamp}</span>
                            </div>
                            <div className="rounded-lg border border-border border-l-4 border-l-blue-500 bg-card px-3 py-3 space-y-2.5">
                              <div>
                                <p className="text-xs font-semibold text-foreground mb-0.5">What happened</p>
                                <p className="text-xs text-muted-foreground">{errorCard.whatHappened}</p>
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-foreground mb-0.5">How it was caught</p>
                                <p className="text-xs text-muted-foreground">{errorCard.howCaught}</p>
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-foreground mb-0.5">How it was corrected</p>
                                <p className="text-xs text-muted-foreground">{errorCard.howCorrected}</p>
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-foreground mb-0.5">What was learned</p>
                                <p className="text-xs text-muted-foreground">{errorCard.whatLearned}</p>
                              </div>
                            </div>
                          </div>

                          <Separator />

                          {/* ── What I've learned expandable ── */}
                          <details className="group">
                            <summary className="cursor-pointer text-sm font-medium text-primary hover:underline inline-flex items-center gap-1.5 list-none">
                              <BookOpen className="h-4 w-4" />
                              What I&apos;ve learned
                              <ChevronRight className="h-3.5 w-3.5 transition-transform group-open:rotate-90" />
                            </summary>
                            <div className="mt-2 space-y-2">
                              {learnedRules.map((item, i) => (
                                <div key={i} className="rounded-lg bg-muted/50 border border-border px-3 py-2">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-xs font-medium text-foreground">{item.rule}</span>
                                    <Badge variant="outline" className="text-xs shrink-0">{item.module}</Badge>
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-0.5">Source: {item.source}</p>
                                </div>
                              ))}
                              <p className="text-xs text-muted-foreground italic">3 new rules added to the autonomous processing pipeline overnight.</p>
                            </div>
                          </details>

                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Input */}
                <div className="border-t border-border p-3">
                  <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/30 px-3 py-2.5">
                    <Search className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="flex-1 text-sm text-muted-foreground">Ask about overnight activity, review held items, or adjust autonomous rules...</span>
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

            {/* Overnight Timeline */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  <CardTitle className="text-sm font-semibold">Overnight Timeline</CardTitle>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">11 PM - 8 AM activity</p>
              </CardHeader>
              <CardContent className="pt-0">
                {/* Timeline strip */}
                <div className="relative">
                  {/* Track background */}
                  <div className="relative h-10 bg-muted/50 rounded-lg overflow-hidden border border-border">
                    {overnightTimeline.map((block, i) => (
                      <div
                        key={i}
                        className="group absolute top-0 h-full flex items-center justify-center"
                        style={{
                          left: `${block.start}%`,
                          width: `${block.width}%`,
                        }}
                      >
                        <div className={`${block.color} h-full w-full rounded-sm opacity-80 hover:opacity-100 transition-opacity`} />
                        {/* Tooltip */}
                        <div className="absolute -top-9 left-1/2 -translate-x-1/2 hidden group-hover:block z-10">
                          <div className="bg-foreground text-background text-xs px-2 py-1 rounded whitespace-nowrap shadow-lg">
                            {block.label}
                          </div>
                          <div className="w-2 h-2 bg-foreground rotate-45 mx-auto -mt-1" />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Time markers */}
                  <div className="relative h-5 mt-1">
                    {timeMarkers.map((marker, i) => (
                      <span
                        key={i}
                        className="absolute text-xs text-muted-foreground -translate-x-1/2"
                        style={{ left: `${marker.position}%` }}
                      >
                        {marker.label}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Legend */}
                <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <div className="h-2.5 w-2.5 rounded-sm bg-emerald-500" />
                    <span>Auto-completed</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="h-2.5 w-2.5 rounded-sm bg-amber-500" />
                    <span>Queued for review</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="h-2.5 w-2.5 rounded-sm bg-red-500" />
                    <span>Error corrected</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Ghost Operator Confidence */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4 text-primary" />
                  <CardTitle className="text-sm font-semibold">Ghost Operator Confidence</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-center py-4">
                  <div className="text-5xl font-bold text-foreground tracking-tight">
                    96.4<span className="text-3xl text-muted-foreground">%</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1.5">1,847 autonomous decisions</p>
                  <div className="flex items-center justify-center gap-1.5 mt-2">
                    <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                    <span className="text-xs font-medium text-emerald-600">+0.3% from last week</span>
                  </div>
                </div>

                <Separator className="my-3" />

                {/* Confidence breakdown */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Bookings & scheduling</span>
                    <span className="font-medium text-foreground">99.1%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                    <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: "99.1%" }} />
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Invoice processing</span>
                    <span className="font-medium text-foreground">94.7%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                    <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: "94.7%" }} />
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Review moderation</span>
                    <span className="font-medium text-foreground">97.2%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                    <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: "97.2%" }} />
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Deal pipeline management</span>
                    <span className="font-medium text-foreground">91.8%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                    <div className="bg-amber-500 h-1.5 rounded-full" style={{ width: "91.8%" }} />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Compliance Copilot */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" />
                  <CardTitle className="text-sm font-semibold">Compliance Copilot</CardTitle>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">Active gaps detected overnight</p>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 font-medium text-muted-foreground">Site</th>
                        <th className="text-left py-2 font-medium text-muted-foreground">Type</th>
                        <th className="text-center py-2 font-medium text-muted-foreground">Overdue</th>
                        <th className="text-right py-2 font-medium text-muted-foreground">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {complianceGaps.map((gap, i) => (
                        <tr key={i}>
                          <td className="py-2 font-medium text-foreground">{gap.site}</td>
                          <td className="py-2 text-muted-foreground">{gap.type}</td>
                          <td className="py-2 text-center">
                            <Badge
                              variant={gap.daysOverdue > 7 ? "destructive" : "outline"}
                              className="text-xs"
                            >
                              {gap.daysOverdue}d
                            </Badge>
                          </td>
                          <td className="py-2 text-right">
                            <span className="text-muted-foreground">{gap.status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <Separator className="my-3" />

                <div className="rounded-lg bg-muted/50 border border-border px-3 py-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Activity className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span>Next automated compliance scan: today at 11:00 PM</span>
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
