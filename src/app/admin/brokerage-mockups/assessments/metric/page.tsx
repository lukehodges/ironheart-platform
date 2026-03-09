"use client"

import Link from "next/link"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
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
  ChevronRight,
  ArrowRight,
  TreePine,
  Info,
} from "lucide-react"

// ─── Static Data ──────────────────────────────────────────────────────────────

const BASELINE_HABITATS = [
  {
    type: "Modified grassland",
    area: 2.5,
    condition: "Poor",
    distinctiveness: "Low",
    significance: "Within LNRS",
    units: 1.25,
  },
  {
    type: "Bramble scrub",
    area: 0.8,
    condition: "Poor",
    distinctiveness: "Low",
    significance: "Formal local strategy",
    units: 0.32,
  },
  {
    type: "Mixed plantation woodland",
    area: 1.2,
    condition: "Moderate",
    distinctiveness: "Medium",
    significance: "Within LNRS",
    units: 1.44,
  },
  {
    type: "Bare ground",
    area: 0.3,
    condition: "N/A - Other",
    distinctiveness: "V.Low",
    significance: "Area not in local strategy",
    units: 0.0,
  },
  {
    type: "Developed land; sealed surface",
    area: 0.2,
    condition: "N/A - Other",
    distinctiveness: "V.Low",
    significance: "Area not in local strategy",
    units: 0.0,
  },
]

const PROPOSED_HABITATS = [
  {
    type: "Other neutral grassland (wildflower meadow)",
    area: 2.5,
    condition: "Moderate",
    distinctiveness: "Medium",
    significance: "Within LNRS",
    units: 5.0,
  },
  {
    type: "Mixed scrub (managed)",
    area: 0.8,
    condition: "Moderate",
    distinctiveness: "Medium",
    significance: "Formal local strategy",
    units: 1.28,
  },
  {
    type: "Other woodland; broadleaved (enhanced)",
    area: 1.2,
    condition: "Good",
    distinctiveness: "Medium",
    significance: "Within LNRS",
    units: 3.6,
  },
  {
    type: "Open mosaic habitat on previously developed land",
    area: 0.3,
    condition: "Moderate",
    distinctiveness: "Medium",
    significance: "Area not in local strategy",
    units: 0.36,
  },
  {
    type: "Sustainable drainage system (SuDS)",
    area: 0.2,
    condition: "Moderate",
    distinctiveness: "Low",
    significance: "Area not in local strategy",
    units: 0.16,
  },
]

const BASELINE_TOTAL = BASELINE_HABITATS.reduce((s, h) => s + h.units, 0)
const PROPOSED_TOTAL = PROPOSED_HABITATS.reduce((s, h) => s + h.units, 0)
const NET_CHANGE = PROPOSED_TOTAL - BASELINE_TOTAL
const PERCENT_CHANGE = ((NET_CHANGE / BASELINE_TOTAL) * 100).toFixed(1)
const TEN_PERCENT_THRESHOLD = BASELINE_TOTAL * 0.1

// ─── Component ────────────────────────────────────────────────────────────────

export default function BNGMetric() {
  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link
          href="/admin/brokerage-mockups/assessments"
          className="hover:text-foreground transition-colors"
        >
          Assessments
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground font-medium">BNG Statutory Metric</span>
      </nav>

      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-green-100 p-2 dark:bg-green-900/40">
          <TreePine className="h-5 w-5 text-green-600 dark:text-green-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Statutory Biodiversity Metric &mdash; Off-Site Assessment
          </h1>
          <p className="text-sm text-muted-foreground">
            Statutory metric calculation for biodiversity net gain
          </p>
        </div>
      </div>

      {/* Baseline Habitats */}
      <Card>
        <CardHeader>
          <CardTitle>Baseline Habitats</CardTitle>
          <CardDescription>
            Current habitat types and biodiversity units before enhancement
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Habitat Type</TableHead>
                <TableHead className="text-right">Area (ha)</TableHead>
                <TableHead>Condition</TableHead>
                <TableHead>Distinctiveness</TableHead>
                <TableHead>Strategic Significance</TableHead>
                <TableHead className="text-right">Baseline Units</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {BASELINE_HABITATS.map((h) => (
                <TableRow key={h.type}>
                  <TableCell className="font-medium text-foreground">
                    {h.type}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {h.area.toFixed(1)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={
                        h.condition === "Poor"
                          ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400"
                          : h.condition === "Moderate"
                          ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400"
                          : "bg-muted text-muted-foreground"
                      }
                    >
                      {h.condition}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {h.distinctiveness}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {h.significance}
                  </TableCell>
                  <TableCell className="text-right font-medium text-foreground">
                    {h.units.toFixed(2)}
                  </TableCell>
                </TableRow>
              ))}
              {/* Total row */}
              <TableRow className="border-t-2 border-border">
                <TableCell
                  colSpan={5}
                  className="text-right font-medium text-foreground"
                >
                  Total Baseline Units
                </TableCell>
                <TableCell className="text-right font-bold text-foreground">
                  {BASELINE_TOTAL.toFixed(2)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Proposed Habitats */}
      <Card>
        <CardHeader>
          <CardTitle>Proposed Habitats (Post-Enhancement)</CardTitle>
          <CardDescription>
            Target habitat types and biodiversity units after management
            interventions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Habitat Type</TableHead>
                <TableHead className="text-right">Area (ha)</TableHead>
                <TableHead>Condition</TableHead>
                <TableHead>Distinctiveness</TableHead>
                <TableHead>Strategic Significance</TableHead>
                <TableHead className="text-right">Proposed Units</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {PROPOSED_HABITATS.map((h) => (
                <TableRow key={h.type}>
                  <TableCell className="font-medium text-foreground">
                    {h.type}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {h.area.toFixed(1)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={
                        h.condition === "Good"
                          ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400"
                          : h.condition === "Moderate"
                          ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400"
                          : "bg-muted text-muted-foreground"
                      }
                    >
                      {h.condition}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {h.distinctiveness}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {h.significance}
                  </TableCell>
                  <TableCell className="text-right font-medium text-foreground">
                    {h.units.toFixed(2)}
                  </TableCell>
                </TableRow>
              ))}
              {/* Total row */}
              <TableRow className="border-t-2 border-border">
                <TableCell
                  colSpan={5}
                  className="text-right font-medium text-foreground"
                >
                  Total Proposed Units
                </TableCell>
                <TableCell className="text-right font-bold text-foreground">
                  {PROPOSED_TOTAL.toFixed(2)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Net Change */}
      <Card>
        <CardHeader>
          <CardTitle>Net Change</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-lg border border-border bg-muted/50 p-4 text-center">
              <p className="text-xs text-muted-foreground">Proposed Units</p>
              <p className="mt-1 text-xl font-bold text-foreground">
                {PROPOSED_TOTAL.toFixed(2)}
              </p>
            </div>
            <div className="flex items-center justify-center text-2xl font-bold text-muted-foreground">
              -
            </div>
            <div className="rounded-lg border border-border bg-muted/50 p-4 text-center">
              <p className="text-xs text-muted-foreground">Baseline Units</p>
              <p className="mt-1 text-xl font-bold text-foreground">
                {BASELINE_TOTAL.toFixed(2)}
              </p>
            </div>
          </div>

          <div className="rounded-lg border-2 border-green-200 bg-green-50 p-4 text-center dark:border-green-800 dark:bg-green-950/30">
            <p className="text-lg font-bold text-green-700 dark:text-green-300">
              +{NET_CHANGE.toFixed(2)} biodiversity units
            </p>
            <p className="text-sm text-green-600 dark:text-green-400">
              ({PERCENT_CHANGE}% net gain)
            </p>
          </div>

          {/* 10% uplift bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                10% mandatory uplift requirement ({TEN_PERCENT_THRESHOLD.toFixed(2)}{" "}
                units)
              </span>
              <Badge className="bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400">
                Achieved
              </Badge>
            </div>
            <Progress value={100} className="h-3" />
            <p className="text-xs text-muted-foreground">
              Net gain of {NET_CHANGE.toFixed(2)} units exceeds the 10% threshold of{" "}
              {TEN_PERCENT_THRESHOLD.toFixed(2)} units by{" "}
              {(NET_CHANGE - TEN_PERCENT_THRESHOLD).toFixed(2)} units
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Summary Panel */}
      <Card>
        <CardHeader>
          <CardTitle>Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="rounded-xl border-2 border-green-300 bg-green-50 p-6 text-center dark:border-green-700 dark:bg-green-950/30">
            <p className="text-sm text-green-700 dark:text-green-400 mb-1">
              OFF-SITE BIODIVERSITY GAIN
            </p>
            <p className="text-3xl font-bold text-green-800 dark:text-green-300">
              {NET_CHANGE.toFixed(2)} biodiversity units
            </p>
          </div>

          <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/50 p-3">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="text-sm text-muted-foreground">
              <p className="font-medium text-foreground">Trading Rules</p>
              <p className="mt-1">
                Under the biodiversity metric trading rules, habitat units generated
                on this site can be used to offset losses of habitats of the same
                distinctiveness band or lower. Units from &quot;Medium&quot; distinctiveness
                habitats cannot be traded down to offset losses of &quot;High&quot; or
                &quot;Very High&quot; distinctiveness habitats. Strategic significance
                location also affects trading eligibility.
              </p>
            </div>
          </div>

          <Separator />

          <div className="flex flex-wrap gap-3">
            <Button className="bg-green-600 hover:bg-green-700 text-white">
              Register as Gain Site
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Link href="/admin/brokerage-mockups/matching">
              <Button variant="outline">
                Find Matching Demand
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
