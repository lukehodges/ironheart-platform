"use client"

import { useState } from "react"
import Link from "next/link"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  ChevronRight,
  ArrowRight,
  Save,
  FileDown,
  Calculator,
  Droplets,
} from "lucide-react"

// ─── Component ────────────────────────────────────────────────────────────────

export default function NutrientBudgetCalculator() {
  const [activeTab, setActiveTab] = useState("ws1")

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
        <span className="text-foreground font-medium">Nutrient Budget Calculator</span>
      </nav>

      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-blue-100 p-2 dark:bg-blue-900/40">
          <Calculator className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Nutrient Budget Calculator
          </h1>
          <p className="text-sm text-muted-foreground">
            Based on Natural England&apos;s Nutrient Budget methodology
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="ws1">1. Wastewater</TabsTrigger>
          <TabsTrigger value="ws2">2. Current Land</TabsTrigger>
          <TabsTrigger value="ws3">3. Future Land</TabsTrigger>
          <TabsTrigger value="ws4">4. SuDS</TabsTrigger>
          <TabsTrigger value="summary">Summary</TabsTrigger>
        </TabsList>

        {/* Worksheet 1: Wastewater */}
        <TabsContent value="ws1">
          <Card>
            <CardHeader>
              <CardTitle>Worksheet 1 &mdash; Wastewater Loading</CardTitle>
              <CardDescription>
                Calculate the nitrogen loading from new residential development via
                wastewater discharge
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>Number of Dwellings</Label>
                  <Input type="number" value={200} readOnly className="bg-muted/50" />
                </div>
                <div className="space-y-2">
                  <Label>Average Occupancy Rate</Label>
                  <Input
                    type="number"
                    value={2.4}
                    step={0.1}
                    readOnly
                    className="bg-muted/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Treatment Works</Label>
                  <Input value="Peel Common WwTW" readOnly className="bg-muted/50" />
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Water Usage (litres/person/day)</Label>
                  <Input
                    type="number"
                    value={110}
                    readOnly
                    className="bg-muted/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label>TN Concentration (mg/l)</Label>
                  <Input
                    type="number"
                    value={27}
                    readOnly
                    className="bg-muted/50"
                  />
                </div>
              </div>

              <Separator />

              {/* Calculation Display */}
              <div className="rounded-lg border border-border bg-muted/50 p-4 space-y-3">
                <h4 className="text-sm font-medium text-foreground">Calculation</h4>
                <div className="space-y-1 text-sm text-muted-foreground font-mono">
                  <p>Population: 200 dwellings x 2.4 occupancy = <span className="text-foreground font-medium">480 persons</span></p>
                  <p>Water volume: 480 x 110 l/day = <span className="text-foreground font-medium">52,800 l/day</span></p>
                  <p>Annual volume: 52,800 x 365 / 1,000 = <span className="text-foreground font-medium">19,272 m3/yr</span></p>
                  <p>Nitrogen load: 19,272 x 27 mg/l / 1,000 = <span className="text-foreground font-medium">520.3 kg/yr</span></p>
                </div>
                <div className="mt-3 rounded-md bg-card p-3 text-center">
                  <p className="text-xs text-muted-foreground">Wastewater Loading</p>
                  <p className="text-xl font-bold text-foreground">520.3 kg/yr N</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Worksheet 2: Current Land Use */}
        <TabsContent value="ws2">
          <Card>
            <CardHeader>
              <CardTitle>Worksheet 2 &mdash; Current Land Use Loading</CardTitle>
              <CardDescription>
                Calculate the existing nitrogen loading from the development site&apos;s
                current land use
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Land Parcel</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Area (ha)</TableHead>
                    <TableHead className="text-right">Loading Factor (kg/ha/yr)</TableHead>
                    <TableHead className="text-right">Loading (kg/yr)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium text-foreground">Parcel A</TableCell>
                    <TableCell className="text-muted-foreground">Arable (cereals)</TableCell>
                    <TableCell className="text-right text-muted-foreground">8.5</TableCell>
                    <TableCell className="text-right text-muted-foreground">25.0</TableCell>
                    <TableCell className="text-right font-medium text-foreground">212.5</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium text-foreground">Parcel B</TableCell>
                    <TableCell className="text-muted-foreground">Improved grassland</TableCell>
                    <TableCell className="text-right text-muted-foreground">4.2</TableCell>
                    <TableCell className="text-right text-muted-foreground">15.0</TableCell>
                    <TableCell className="text-right font-medium text-foreground">63.0</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium text-foreground">Parcel C</TableCell>
                    <TableCell className="text-muted-foreground">Woodland</TableCell>
                    <TableCell className="text-right text-muted-foreground">2.1</TableCell>
                    <TableCell className="text-right text-muted-foreground">5.0</TableCell>
                    <TableCell className="text-right font-medium text-foreground">10.5</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium text-foreground">Parcel D</TableCell>
                    <TableCell className="text-muted-foreground">Hardstanding</TableCell>
                    <TableCell className="text-right text-muted-foreground">1.2</TableCell>
                    <TableCell className="text-right text-muted-foreground">0.0</TableCell>
                    <TableCell className="text-right font-medium text-foreground">0.0</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
              <div className="flex justify-end">
                <div className="rounded-md bg-muted px-4 py-2 text-right">
                  <p className="text-xs text-muted-foreground">Subtotal &mdash; Current Land Use</p>
                  <p className="text-lg font-bold text-foreground">286.0 kg/yr N</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Worksheet 3: Future Land Use */}
        <TabsContent value="ws3">
          <Card>
            <CardHeader>
              <CardTitle>Worksheet 3 &mdash; Future Land Use Loading</CardTitle>
              <CardDescription>
                Nitrogen loading from the proposed development land use (excluding
                wastewater)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Land Parcel</TableHead>
                    <TableHead>Proposed Use</TableHead>
                    <TableHead className="text-right">Area (ha)</TableHead>
                    <TableHead className="text-right">Loading Factor (kg/ha/yr)</TableHead>
                    <TableHead className="text-right">Loading (kg/yr)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium text-foreground">Parcel A</TableCell>
                    <TableCell className="text-muted-foreground">Residential (urban)</TableCell>
                    <TableCell className="text-right text-muted-foreground">8.5</TableCell>
                    <TableCell className="text-right text-muted-foreground">12.0</TableCell>
                    <TableCell className="text-right font-medium text-foreground">102.0</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium text-foreground">Parcel B</TableCell>
                    <TableCell className="text-muted-foreground">Public open space</TableCell>
                    <TableCell className="text-right text-muted-foreground">4.2</TableCell>
                    <TableCell className="text-right text-muted-foreground">5.0</TableCell>
                    <TableCell className="text-right font-medium text-foreground">21.0</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium text-foreground">Parcel C</TableCell>
                    <TableCell className="text-muted-foreground">Woodland (retained)</TableCell>
                    <TableCell className="text-right text-muted-foreground">2.1</TableCell>
                    <TableCell className="text-right text-muted-foreground">5.0</TableCell>
                    <TableCell className="text-right font-medium text-foreground">10.5</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium text-foreground">Parcel D</TableCell>
                    <TableCell className="text-muted-foreground">Roads &amp; infrastructure</TableCell>
                    <TableCell className="text-right text-muted-foreground">1.2</TableCell>
                    <TableCell className="text-right text-muted-foreground">2.0</TableCell>
                    <TableCell className="text-right font-medium text-foreground">2.4</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
              <div className="flex justify-end">
                <div className="rounded-md bg-muted px-4 py-2 text-right">
                  <p className="text-xs text-muted-foreground">Subtotal &mdash; Future Land Use</p>
                  <p className="text-lg font-bold text-foreground">135.9 kg/yr N</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Worksheet 4: SuDS Removal */}
        <TabsContent value="ws4">
          <Card>
            <CardHeader>
              <CardTitle>Worksheet 4 &mdash; SuDS Nitrogen Removal</CardTitle>
              <CardDescription>
                Nitrogen removal from Sustainable Drainage Systems (SuDS)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SuDS Feature</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Area (m2)</TableHead>
                    <TableHead className="text-right">Removal Rate (kg/m2/yr)</TableHead>
                    <TableHead className="text-right">Removal (kg/yr)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium text-foreground">Attenuation Pond</TableCell>
                    <TableCell className="text-muted-foreground">Wet pond</TableCell>
                    <TableCell className="text-right text-muted-foreground">1,200</TableCell>
                    <TableCell className="text-right text-muted-foreground">0.025</TableCell>
                    <TableCell className="text-right font-medium text-foreground">30.0</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium text-foreground">Swale Network</TableCell>
                    <TableCell className="text-muted-foreground">Vegetated swale</TableCell>
                    <TableCell className="text-right text-muted-foreground">800</TableCell>
                    <TableCell className="text-right text-muted-foreground">0.012</TableCell>
                    <TableCell className="text-right font-medium text-foreground">9.6</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium text-foreground">Rain Gardens</TableCell>
                    <TableCell className="text-muted-foreground">Bioretention</TableCell>
                    <TableCell className="text-right text-muted-foreground">300</TableCell>
                    <TableCell className="text-right text-muted-foreground">0.018</TableCell>
                    <TableCell className="text-right font-medium text-foreground">5.4</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
              <div className="flex justify-end">
                <div className="rounded-md bg-muted px-4 py-2 text-right">
                  <p className="text-xs text-muted-foreground">Subtotal &mdash; SuDS Removal</p>
                  <p className="text-lg font-bold text-green-600 dark:text-green-400">
                    -45.0 kg/yr N
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Summary */}
        <TabsContent value="summary">
          <Card>
            <CardHeader>
              <CardTitle>Nutrient Budget Summary</CardTitle>
              <CardDescription>
                Net nitrogen budget calculation for the proposed development
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Formula breakdown */}
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div className="flex items-center gap-3">
                    <Droplets className="h-4 w-4 text-blue-500" />
                    <span className="text-sm text-foreground">
                      Wastewater Loading (WS1)
                    </span>
                  </div>
                  <span className="font-mono text-sm font-bold text-foreground">
                    + 520.3 kg/yr
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div className="flex items-center gap-3">
                    <span className="h-4 w-4 text-center text-sm font-bold text-green-600 dark:text-green-400">
                      -
                    </span>
                    <span className="text-sm text-foreground">
                      Current Land Use Loading (WS2)
                    </span>
                  </div>
                  <span className="font-mono text-sm font-bold text-green-600 dark:text-green-400">
                    - 286.0 kg/yr
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div className="flex items-center gap-3">
                    <span className="h-4 w-4 text-center text-sm font-bold text-red-600 dark:text-red-400">
                      +
                    </span>
                    <span className="text-sm text-foreground">
                      Future Land Use Loading (WS3)
                    </span>
                  </div>
                  <span className="font-mono text-sm font-bold text-foreground">
                    + 135.9 kg/yr
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div className="flex items-center gap-3">
                    <span className="h-4 w-4 text-center text-sm font-bold text-green-600 dark:text-green-400">
                      -
                    </span>
                    <span className="text-sm text-foreground">
                      SuDS Nitrogen Removal (WS4)
                    </span>
                  </div>
                  <span className="font-mono text-sm font-bold text-green-600 dark:text-green-400">
                    - 45.0 kg/yr
                  </span>
                </div>

                <Separator />

                <div className="flex items-center justify-between rounded-lg border border-border bg-muted/50 p-3">
                  <span className="text-sm font-medium text-foreground">
                    Net Budget
                  </span>
                  <span className="font-mono text-sm font-bold text-foreground">
                    = 325.2 kg/yr
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-lg border border-border bg-muted/50 p-3">
                  <span className="text-sm font-medium text-foreground">
                    Precautionary buffer (x 1.2 uncertainty factor)
                  </span>
                  <span className="font-mono text-sm font-bold text-foreground">
                    x 1.2
                  </span>
                </div>
              </div>

              {/* Calculation note */}
              <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground font-mono">
                520.3 - 286.0 + 135.9 - 45.0 = 325.2 kg/yr &times; 1.2 ={" "}
                <span className="font-bold text-foreground">390.2 kg/yr</span>
              </div>

              {/* Large output */}
              <div className="rounded-xl border-2 border-amber-300 bg-amber-50 p-6 text-center dark:border-amber-700 dark:bg-amber-950/30">
                <p className="text-sm text-amber-700 dark:text-amber-400 mb-1">
                  TOTAL MITIGATION REQUIRED
                </p>
                <p className="text-3xl font-bold text-amber-800 dark:text-amber-300">
                  390.2 kg/year
                </p>
                <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                  nitrogen mitigation required
                </p>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-3">
                <Link href="/admin/brokerage-mockups/matching">
                  <Button>
                    Find Matching Supply
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Button variant="outline">
                  <Save className="mr-2 h-4 w-4" />
                  Save Calculation
                </Button>
                <Button variant="outline">
                  <FileDown className="mr-2 h-4 w-4" />
                  Export to PDF
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
