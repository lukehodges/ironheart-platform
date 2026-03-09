"use client"

import Link from "next/link"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
  Layers,
  Leaf,
  Building2,
  Zap,
} from "lucide-react"

const configMatrix = [
  {
    area: "Unit Types",
    setting: "Nitrogen (kg/yr), Phosphorus (kg/yr), BNG (biodiversity units)",
    description: "Tradeable credit types and their measurement units",
  },
  {
    area: "Assessment Templates",
    setting: "BNG Metric 4.0, Nutrient Budget Calculator",
    description: "Templates for ecological and environmental assessments",
  },
  {
    area: "Document Templates",
    setting: "S106 Agreement, Conservation Covenant, Habitat Management Plan",
    description: "Legal and regulatory document templates",
  },
  {
    area: "Matching Rules",
    setting: "Catchment-constrained, LPA proximity, habitat type",
    description: "Rules for matching supply sites to demand",
  },
  {
    area: "Compliance Schedules",
    setting: "30-year monitoring (BNG), annual reporting (nutrients)",
    description: "Regulatory compliance timelines and milestones",
  },
  {
    area: "Commission Model",
    setting: "Percentage of sale (18-20%)",
    description: "How broker fees are calculated per transaction",
  },
  {
    area: "External Registries",
    setting: "Natural England BNG Register, Nutrient Mitigation Scheme",
    description: "Connected government and industry registries",
  },
  {
    area: "Calculator Tools",
    setting: "Defra Metric 4.0, Nutrient Budget Calculator",
    description: "Built-in or integrated calculation tools",
  },
]

const verticalComparisons = [
  {
    name: "BNG / Nutrient",
    icon: Leaf,
    colour: "bg-emerald-600",
    unit: "kg/yr",
    constraint: "Catchment",
    duration: "80 years",
  },
  {
    name: "Real Estate",
    icon: Building2,
    colour: "bg-blue-600",
    unit: "Property listing",
    constraint: "Geography",
    duration: "Tenancy term",
  },
  {
    name: "Energy",
    icon: Zap,
    colour: "bg-amber-600",
    unit: "kWh",
    constraint: "Grid region",
    duration: "Contract term",
  },
]

const otherVerticals = [
  "Carbon Credits",
  "Real Estate",
  "Energy Brokerage",
  "Freight",
  "Recruitment",
  "Insurance",
]

export default function SettingsVerticalPage() {
  return (
    <div className="max-w-screen-2xl mx-auto px-6 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/brokerage-mockups/settings">
          <Button variant="ghost" size="sm" className="gap-1.5">
            <ArrowLeft className="w-4 h-4" />
            Settings
          </Button>
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">
          Vertical Configuration
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          The brokerage operating system - same platform, any vertical
        </p>
      </div>

      {/* Active vertical header */}
      <Card className="mb-8">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Layers className="w-5 h-5 text-muted-foreground" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-foreground">
                    Active Vertical:
                  </span>
                  <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800">
                    Nutrient &amp; BNG Credits
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Environmental credit brokerage for biodiversity net gain and
                  nutrient neutrality
                </p>
              </div>
            </div>
            <Select defaultValue="bng" disabled>
              <SelectTrigger className="w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bng">Nutrient &amp; BNG Credits</SelectItem>
                {otherVerticals.map((v) => (
                  <SelectItem key={v} value={v.toLowerCase().replace(/\s+/g, "-")} disabled>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Configuration matrix */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Configuration Matrix</CardTitle>
          <CardDescription>
            How the platform is configured for the active vertical
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-48">Configuration Area</TableHead>
                  <TableHead>Current Setting</TableHead>
                  <TableHead className="w-[300px]">Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {configMatrix.map((row) => (
                  <TableRow key={row.area}>
                    <TableCell className="font-medium text-sm">
                      {row.area}
                    </TableCell>
                    <TableCell className="text-sm">{row.setting}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {row.description}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Visual comparison panel */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Cross-Vertical Comparison</CardTitle>
          <CardDescription>
            Same 7 platform pillars. Different configuration.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {verticalComparisons.map((vertical) => {
              const Icon = vertical.icon
              return (
                <div
                  key={vertical.name}
                  className="rounded-lg border border-border p-4 space-y-3"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-8 h-8 rounded-lg ${vertical.colour} flex items-center justify-center`}
                    >
                      <Icon className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-sm font-semibold text-foreground">
                      {vertical.name}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Unit</span>
                      <span className="font-medium text-foreground">
                        {vertical.unit}
                      </span>
                    </div>
                    <Separator />
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Constraint</span>
                      <span className="font-medium text-foreground">
                        {vertical.constraint}
                      </span>
                    </div>
                    <Separator />
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Duration</span>
                      <span className="font-medium text-foreground">
                        {vertical.duration}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

        </CardContent>
      </Card>

      {/* Footer quote */}
      <div className="border-t border-border pt-6">
        <p className="text-sm text-muted-foreground italic text-center">
          &ldquo;We&apos;re not BNG software. We&apos;re brokerage operations
          infrastructure. BNG happens to be where we started.&rdquo;
        </p>
      </div>
    </div>
  )
}
