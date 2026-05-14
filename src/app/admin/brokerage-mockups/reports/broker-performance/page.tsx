"use client"

import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  ArrowLeft,
  Users,
  PoundSterling,
  TrendingUp,
  Clock,
} from "lucide-react"
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts"
import { brokerCommissions, deals } from "../../_mock-data"

// ---------------------------------------------------------------------------
// Broker data
// ---------------------------------------------------------------------------

interface BrokerDetail {
  name: string
  initials: string
  avatarColor: string
  dealCount: number
  commission: number
  avgDaysPerStage: number
  pipelineValue: number
  annualTarget: number
  callsLogged: number
  emailsSent: number
  assessmentsArranged: number
  siteVisits: number
  dealsProgressed: number
}

const brokerDetails: BrokerDetail[] = [
  {
    name: "James Harris",
    initials: "JH",
    avatarColor: "bg-blue-500",
    dealCount: 9,
    commission: 112440,
    avgDaysPerStage: 14,
    pipelineValue: 1800000,
    annualTarget: 200000,
    callsLogged: 142,
    emailsSent: 287,
    assessmentsArranged: 8,
    siteVisits: 15,
    dealsProgressed: 22,
  },
  {
    name: "Sarah Croft",
    initials: "SC",
    avatarColor: "bg-violet-500",
    dealCount: 4,
    commission: 56220,
    avgDaysPerStage: 18,
    pipelineValue: 400000,
    annualTarget: 150000,
    callsLogged: 89,
    emailsSent: 156,
    assessmentsArranged: 4,
    siteVisits: 7,
    dealsProgressed: 11,
  },
  {
    name: "Tom Jenkins",
    initials: "TJ",
    avatarColor: "bg-amber-500",
    dealCount: 1,
    commission: 18740,
    avgDaysPerStage: 22,
    pipelineValue: 140000,
    annualTarget: 100000,
    callsLogged: 45,
    emailsSent: 72,
    assessmentsArranged: 2,
    siteVisits: 3,
    dealsProgressed: 5,
  },
]

function formatCurrency(v: number) {
  return v >= 1000000
    ? `£${(v / 1000000).toFixed(1)}M`
    : v >= 1000
      ? `£${(v / 1000).toFixed(v >= 100000 ? 0 : 1)}k`
      : `£${v}`
}

function formatCurrencyFull(v: number) {
  return `£${v.toLocaleString("en-GB")}`
}

// Chart data
const dealsByBrokerData = brokerDetails.map((b) => ({
  name: b.name.split(" ")[0],
  "Completed": deals.filter((d) => d.broker === b.name && d.stage === "Completed").length,
  "In Progress": deals.filter((d) => d.broker === b.name && d.stage !== "Completed").length,
}))

const commissionByBrokerData = brokerDetails.map((b) => ({
  name: b.name.split(" ")[0],
  commission: b.commission,
}))

const pipelineByBrokerData = brokerDetails.map((b) => ({
  name: b.name.split(" ")[0],
  pipeline: b.pipelineValue,
}))

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function BrokerPerformancePage() {
  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/admin/brokerage-mockups/reports">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Reports
          </Button>
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-foreground">Broker Performance</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Commission earned, deal activity, and target tracking per broker
        </p>
      </div>

      {/* Broker comparison cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {brokerDetails.map((broker) => (
          <Card key={broker.name} className="border-border bg-card">
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-4">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className={`${broker.avatarColor} text-white text-sm font-bold`}>
                    {broker.initials}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-sm font-bold text-foreground">{broker.name}</h3>
                  <Badge variant="outline" className="text-[10px]">
                    {broker.dealCount} deals
                  </Badge>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1">
                    <PoundSterling className="h-3 w-3 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground">Commission</span>
                  </div>
                  <p className="text-sm font-bold text-foreground">{formatCurrencyFull(broker.commission)}</p>
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground">Avg Days/Stage</span>
                  </div>
                  <p className="text-sm font-bold text-foreground">{broker.avgDaysPerStage}</p>
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1">
                    <TrendingUp className="h-3 w-3 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground">Pipeline</span>
                  </div>
                  <p className="text-sm font-bold text-foreground">{formatCurrency(broker.pipelineValue)}</p>
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1">
                    <Users className="h-3 w-3 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground">Deals</span>
                  </div>
                  <p className="text-sm font-bold text-foreground">{broker.dealCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Deals by broker */}
        <Card className="border-border bg-card">
          <CardContent className="p-5">
            <h2 className="text-sm font-bold text-foreground mb-1">Deals by Broker</h2>
            <p className="text-xs text-muted-foreground mb-4">Completed vs In Progress</p>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dealsByBrokerData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                  <YAxis className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: 8 }}
                    labelStyle={{ color: "hsl(var(--foreground))" }}
                  />
                  <Legend />
                  <Bar dataKey="Completed" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="In Progress" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Commission by broker */}
        <Card className="border-border bg-card">
          <CardContent className="p-5">
            <h2 className="text-sm font-bold text-foreground mb-1">Commission Earned</h2>
            <p className="text-xs text-muted-foreground mb-4">Total commission per broker</p>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={commissionByBrokerData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                  <YAxis className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v: number) => formatCurrency(v)} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: 8 }}
                    labelStyle={{ color: "hsl(var(--foreground))" }}
                    formatter={(value) => formatCurrencyFull(value as number)}
                  />
                  <Bar dataKey="commission" name="Commission" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pipeline value by broker - horizontal */}
      <Card className="border-border bg-card">
        <CardContent className="p-5">
          <h2 className="text-sm font-bold text-foreground mb-1">Pipeline Value by Broker</h2>
          <p className="text-xs text-muted-foreground mb-4">Total pipeline value per broker</p>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pipelineByBrokerData} layout="vertical" margin={{ left: 60, right: 40 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis type="number" className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v: number) => formatCurrency(v)} />
                <YAxis dataKey="name" type="category" width={50} className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: 8 }}
                  labelStyle={{ color: "hsl(var(--foreground))" }}
                  formatter={(value) => formatCurrencyFull(value as number)}
                />
                <Bar dataKey="pipeline" name="Pipeline Value" fill="hsl(var(--chart-1))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Activity metrics table */}
      <Card className="border-border bg-card">
        <CardContent className="p-5">
          <h2 className="text-sm font-bold text-foreground mb-1">Activity Metrics</h2>
          <p className="text-xs text-muted-foreground mb-4">Broker activity breakdown</p>
          <div className="rounded-lg border border-border overflow-hidden overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-xs">Broker</TableHead>
                  <TableHead className="text-xs text-right">Calls Logged</TableHead>
                  <TableHead className="text-xs text-right">Emails Sent</TableHead>
                  <TableHead className="text-xs text-right">Assessments Arranged</TableHead>
                  <TableHead className="text-xs text-right">Site Visits</TableHead>
                  <TableHead className="text-xs text-right">Deals Progressed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {brokerDetails.map((broker) => (
                  <TableRow key={broker.name}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className={`${broker.avatarColor} text-white text-[10px] font-bold`}>
                            {broker.initials}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs font-medium text-foreground">{broker.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-right text-foreground">{broker.callsLogged}</TableCell>
                    <TableCell className="text-xs text-right text-foreground">{broker.emailsSent}</TableCell>
                    <TableCell className="text-xs text-right text-foreground">{broker.assessmentsArranged}</TableCell>
                    <TableCell className="text-xs text-right text-foreground">{broker.siteVisits}</TableCell>
                    <TableCell className="text-xs text-right text-foreground">{broker.dealsProgressed}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Target tracking */}
      <Card className="border-border bg-card">
        <CardContent className="p-5">
          <h2 className="text-sm font-bold text-foreground mb-1">Target Tracking</h2>
          <p className="text-xs text-muted-foreground mb-4">Annual commission target vs actual progress</p>
          <div className="space-y-5">
            {brokerDetails.map((broker) => {
              const percentage = Math.min(Math.round((broker.commission / broker.annualTarget) * 100), 100)
              return (
                <div key={broker.name} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className={`${broker.avatarColor} text-white text-[10px] font-bold`}>
                          {broker.initials}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium text-foreground">{broker.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-foreground">{formatCurrencyFull(broker.commission)}</span>
                      <span className="text-xs text-muted-foreground"> / {formatCurrencyFull(broker.annualTarget)}</span>
                      <Badge variant="outline" className="ml-2 text-[10px]">{percentage}%</Badge>
                    </div>
                  </div>
                  <Progress value={percentage} className="h-2" />
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
