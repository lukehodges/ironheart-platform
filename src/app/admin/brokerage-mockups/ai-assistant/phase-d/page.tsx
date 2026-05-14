"use client"

import {
  Brain,
  Search,
  Database,
  HardDrive,
  MemoryStick,
  BookOpen,
  AlertTriangle,
  User,
  Bot,
  Sparkles,
  History,
  CheckCircle2,
  FileText,
  ArrowRight,
  RefreshCw,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { PhaseNav } from "../_components/phase-nav"

// --- Mock data ---

const correctionsLearned = [
  { rule: "Solent minimum pricing: \u00a32,800/BDU", date: "6 Mar 2026" },
  { rule: "Always check NE registration before quoting", date: "4 Mar 2026" },
  { rule: "Bellway Homes prefers 30-year management plans", date: "3 Mar 2026" },
  { rule: "Use hedgerow units (not area) for linear habitats", date: "28 Feb 2026" },
  { rule: "Persimmon requires separate invoices per phase", date: "25 Feb 2026" },
]

const affectedDeals = [
  { id: "D-0091", developer: "Persimmon Homes", price: "\u00a32,650/BDU", site: "Hamble Wetlands" },
  { id: "D-0094", developer: "Barratt Developments", price: "\u00a32,500/BDU", site: "Itchen Meadows" },
  { id: "D-0097", developer: "Crest Nicholson", price: "\u00a32,720/BDU", site: "Fareham Woodland" },
  { id: "D-0103", developer: "Vistry Group", price: "\u00a32,400/BDU", site: "Eastleigh Grassland" },
]

// --- Page ---

export default function PhaseDPage() {
  return (
    <div className="min-h-screen">
      <PhaseNav
        current="D"
        title="Phase D  -  Memory & Context"
        subtitle="The agent remembers across sessions, retrieves from a knowledge base via RAG, detects conflicts in pricing and policy, and learns from corrections."
      />

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* -- Chat panel (left, 3 cols) -- */}
          <div className="lg:col-span-3">
            <Card className="overflow-hidden">
              <CardHeader className="border-b border-border pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Brain className="h-4 w-4 text-primary" />
                    <CardTitle className="text-sm font-semibold">Session  -  9 March 2026, 9:14 AM</CardTitle>
                  </div>
                  <Badge variant="outline" className="gap-1.5 text-xs">
                    <span className="h-2 w-2 rounded-full bg-violet-500 animate-pulse" />
                    Memory active
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Viewing: Deal D-0089 \u00b7 Bellway Homes \u00b7 Context from 3 prior sessions
                </p>
              </CardHeader>

              <CardContent className="p-0">
                <div className="divide-y divide-border/50">

                  {/* Cross-session banner */}
                  <div className="px-4 py-2.5 bg-muted/50 border-b border-border">
                    <div className="flex items-center gap-2">
                      <History className="h-3.5 w-3.5 text-violet-500" />
                      <p className="text-xs font-medium text-foreground">
                        Resumed from 3 Mar session  -  Deal D-0089, Bellway Homes
                      </p>
                    </div>
                  </div>

                  {/* Agent opener */}
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
                          <p className="text-sm text-foreground">
                            Welcome back  -  last week you were reviewing Deal D-0089 with Bellway Homes. The site survey results came in yesterday. Want me to summarise the changes?
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* User message */}
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
                          Yes, and check if the unit calculation changed
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Agent response with KB citations */}
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
                        <div className="rounded-2xl rounded-tl-sm bg-card border border-border px-4 py-3 space-y-3">
                          <p className="text-sm text-foreground">
                            The updated survey for Deal D-0089 shows the habitat baseline has changed. The original assessment recorded <strong>4.2 ha of modified grassland</strong>, but the new survey reclassifies <strong>1.8 ha as species-rich neutral grassland</strong>, which has a higher distinctiveness score.
                          </p>

                          {/* Citation 1 */}
                          <div className="flex flex-wrap gap-1.5">
                            <button className="inline-flex items-center gap-1 rounded-md bg-muted border border-border px-2 py-0.5 text-xs text-foreground hover:bg-muted/80 transition-colors">
                              <FileText className="h-3 w-3 text-blue-500" />
                              <span className="font-medium">BNG-Metric-4.0-Guide.pdf</span>
                              <span className="text-muted-foreground">chunk 87</span>
                              <Badge variant="outline" className="h-4 px-1 text-[10px]">96%</Badge>
                            </button>
                          </div>

                          <p className="text-sm text-foreground">
                            This reclassification increases the required biodiversity units from <strong>38.4 BDU to 52.1 BDU</strong>  -  a 35.7% increase. The deal pricing at \u00a33,100/BDU remains above your Solent floor, but the total value rises from \u00a3119,040 to <strong>\u00a3161,510</strong>.
                          </p>

                          {/* Citation 2 */}
                          <div className="flex flex-wrap gap-1.5">
                            <button className="inline-flex items-center gap-1 rounded-md bg-muted border border-border px-2 py-0.5 text-xs text-foreground hover:bg-muted/80 transition-colors">
                              <FileText className="h-3 w-3 text-blue-500" />
                              <span className="font-medium">D-0089-Survey-Update-Mar26.pdf</span>
                              <span className="text-muted-foreground">chunk 12</span>
                              <Badge variant="outline" className="h-4 px-1 text-[10px]">93%</Badge>
                            </button>
                          </div>

                          <Separator />

                          {/* Conflict detection card */}
                          <div className="rounded-lg border-2 border-amber-500 bg-card p-4 space-y-3">
                            <div className="flex items-start gap-2">
                              <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                              <div>
                                <p className="text-sm font-semibold text-foreground">
                                  Pricing Conflict Detected
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  You previously set minimum pricing at <strong>\u00a32,800/BDU</strong> for Solent sites. 4 live deals are currently priced below this threshold.
                                </p>
                              </div>
                            </div>

                            <div className="space-y-1.5">
                              {affectedDeals.map((deal) => (
                                <div key={deal.id} className="flex items-center justify-between rounded-md bg-muted/50 border border-border px-3 py-2">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-mono font-medium text-foreground">{deal.id}</span>
                                    <span className="text-xs text-muted-foreground">{deal.developer}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-muted-foreground">{deal.site}</span>
                                    <Badge variant="outline" className="text-xs border-amber-500 text-amber-600 dark:text-amber-400">{deal.price}</Badge>
                                  </div>
                                </div>
                              ))}
                            </div>

                            <div className="flex flex-wrap gap-2 pt-1">
                              <Button size="sm" className="h-8 text-xs bg-amber-600 hover:bg-amber-700 text-white">
                                Update all 4
                              </Button>
                              <Button size="sm" variant="outline" className="h-8 text-xs">
                                Review individually
                              </Button>
                              <Button size="sm" variant="ghost" className="h-8 text-xs text-muted-foreground">
                                Keep current pricing
                              </Button>
                            </div>
                          </div>

                          <Separator />

                          {/* RAG conflict edge case */}
                          <div className="rounded-lg border-2 border-orange-500 bg-card p-4 space-y-3">
                            <div className="flex items-start gap-2">
                              <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5 shrink-0" />
                              <div>
                                <p className="text-sm font-semibold text-foreground">
                                  Conflicting Knowledge Base Guidance
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  I found conflicting guidance on management plan duration. Which should I use going forward?
                                </p>
                              </div>
                            </div>

                            <div className="space-y-2">
                              {/* Source A */}
                              <div className="rounded-md bg-muted/50 border border-border p-3">
                                <div className="flex items-center gap-2 mb-1.5">
                                  <FileText className="h-3.5 w-3.5 text-orange-500" />
                                  <span className="text-xs font-medium text-foreground">BNG-Guidelines-v3.pdf</span>
                                  <Badge variant="outline" className="h-4 px-1 text-[10px]">chunk 142</Badge>
                                  <Badge variant="outline" className="h-4 px-1 text-[10px]">94% match</Badge>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  &ldquo;All habitat management and monitoring plans must be maintained for a <strong>minimum of 30 years</strong> from the date of registration.&rdquo;
                                </p>
                              </div>

                              {/* Source B */}
                              <div className="rounded-md bg-muted/50 border border-border p-3">
                                <div className="flex items-center gap-2 mb-1.5">
                                  <FileText className="h-3.5 w-3.5 text-orange-500" />
                                  <span className="text-xs font-medium text-foreground">Internal-Policy-Handbook.pdf</span>
                                  <Badge variant="outline" className="h-4 px-1 text-[10px]">chunk 8</Badge>
                                  <Badge variant="outline" className="h-4 px-1 text-[10px]">91% match</Badge>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  &ldquo;Standard management period for all sites is <strong>25 years</strong> unless otherwise specified by the local planning authority.&rdquo;
                                </p>
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-2 pt-1">
                              <Button size="sm" className="h-8 text-xs bg-orange-600 hover:bg-orange-700 text-white">
                                Use 30 years (regulatory)
                              </Button>
                              <Button size="sm" variant="outline" className="h-8 text-xs">
                                Use 25 years (internal)
                              </Button>
                              <Button size="sm" variant="ghost" className="h-8 text-xs text-muted-foreground">
                                Flag for team review
                              </Button>
                            </div>
                          </div>

                        </div>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Input */}
                <div className="border-t border-border p-3">
                  <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/30 px-3 py-2.5">
                    <Search className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="flex-1 text-sm text-muted-foreground">Ask about deals, sites, pricing policy, or knowledge base...</span>
                    <Button size="sm" variant="default" className="h-8 w-8 p-0 rounded-lg shrink-0">
                      <Sparkles className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* -- Right panels (2 cols) -- */}
          <div className="lg:col-span-2 space-y-4">

            {/* Memory Layers panel */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Brain className="h-4 w-4 text-primary" />
                  <CardTitle className="text-sm font-semibold">Memory Layers</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-0 space-y-2.5">
                {/* Redis layer */}
                <div className="rounded-lg border border-border border-l-4 border-l-red-500 bg-card p-3">
                  <div className="flex items-center gap-2 mb-1.5">
                    <MemoryStick className="h-3.5 w-3.5 text-red-500" />
                    <span className="text-xs font-semibold text-foreground">Redis</span>
                    <Badge variant="outline" className="h-4 px-1 text-[10px]">Session</Badge>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Active conversation context</span>
                    <span className="font-mono text-foreground">~2K tokens</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">Refreshed per turn</p>
                </div>

                {/* PostgreSQL layer */}
                <div className="rounded-lg border border-border border-l-4 border-l-blue-500 bg-card p-3">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Database className="h-3.5 w-3.5 text-blue-500" />
                    <span className="text-xs font-semibold text-foreground">PostgreSQL</span>
                    <Badge variant="outline" className="h-4 px-1 text-[10px]">User Prefs</Badge>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Preferences, corrections, rules</span>
                    <span className="font-mono text-foreground">~500 tokens</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">Synced daily</p>
                </div>

                {/* pgvector layer */}
                <div className="rounded-lg border border-border border-l-4 border-l-emerald-500 bg-card p-3">
                  <div className="flex items-center gap-2 mb-1.5">
                    <HardDrive className="h-3.5 w-3.5 text-emerald-500" />
                    <span className="text-xs font-semibold text-foreground">pgvector</span>
                    <Badge variant="outline" className="h-4 px-1 text-[10px]">KB + Corrections</Badge>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Knowledge base & learned rules</span>
                    <span className="font-mono text-foreground">~1.2K tokens</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">Retrieved on query</p>
                </div>
              </CardContent>
            </Card>

            {/* Corrections Learned */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <CardTitle className="text-sm font-semibold">Corrections Learned</CardTitle>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">Rules inferred from your feedback</p>
              </CardHeader>
              <CardContent className="pt-0 space-y-2">
                {correctionsLearned.map((c, i) => (
                  <div key={i} className="flex items-start justify-between gap-2 rounded-md border border-border px-3 py-2">
                    <div className="flex items-start gap-2 min-w-0">
                      <ArrowRight className="h-3 w-3 text-primary mt-0.5 shrink-0" />
                      <span className="text-xs text-foreground leading-relaxed">{c.rule}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0">{c.date}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* KB Status */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-primary" />
                  <CardTitle className="text-sm font-semibold">Knowledge Base Status</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center">
                    <p className="text-lg font-bold text-foreground">42</p>
                    <p className="text-[10px] text-muted-foreground">Documents</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-foreground">8,347</p>
                    <p className="text-[10px] text-muted-foreground">Chunks</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-foreground">2h</p>
                    <p className="text-[10px] text-muted-foreground">Last indexed</p>
                  </div>
                </div>

                <Separator />

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-muted-foreground">Index coverage</span>
                    <span className="text-xs font-medium text-foreground">98.2%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                    <div className="bg-emerald-500 h-2 rounded-full transition-all" style={{ width: "98.2%" }} />
                  </div>
                </div>

                <div className="rounded-lg bg-card border border-border border-l-4 border-l-emerald-500 px-3 py-2 text-xs text-foreground flex items-center gap-2">
                  <RefreshCw className="h-3 w-3" />
                  All documents indexed  -  next scheduled in 4h
                </div>
              </CardContent>
            </Card>

          </div>
        </div>
      </div>
    </div>
  )
}
