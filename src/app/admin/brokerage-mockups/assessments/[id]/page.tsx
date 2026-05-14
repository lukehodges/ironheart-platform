"use client"

import { useParams } from "next/navigation"
import Link from "next/link"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
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
  MapPin,
  Ruler,
  Droplets,
  Camera,
  CheckCircle2,
  Circle,
  FileText,
  Mail,
  Phone,
  RotateCcw,
  Download,
} from "lucide-react"
import { assessments, assessors, sites } from "../../_mock-data"
import type { AssessmentStatus } from "../../_mock-data"

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<AssessmentStatus, string> = {
  Scheduled: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  "In Progress": "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  "Data Submitted": "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
  "Under Review": "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
  Approved: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  "Revision Requested": "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
}

const TYPE_BADGE: Record<string, string> = {
  "NN Baseline": "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  "BNG Habitat Survey": "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  "Annual Monitoring": "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  Reassessment: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
}

const TIMELINE_STEPS: { label: string; status: AssessmentStatus }[] = [
  { label: "Scheduled", status: "Scheduled" },
  { label: "Visited", status: "In Progress" },
  { label: "Data Submitted", status: "Data Submitted" },
  { label: "Reviewed", status: "Under Review" },
  { label: "Approved", status: "Approved" },
]

const STATUS_ORDER: AssessmentStatus[] = [
  "Scheduled",
  "In Progress",
  "Data Submitted",
  "Under Review",
  "Approved",
]

function getTimelineDates(assessment: { date: string; status: AssessmentStatus }): Record<string, string> {
  const baseDate = new Date(assessment.date)
  const statusIdx = STATUS_ORDER.indexOf(assessment.status)
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })

  const dates: Record<string, string> = {}

  // "Scheduled" step always shows the assessment date
  dates["Scheduled"] = fmt(baseDate)

  // Steps after "Scheduled" only show dates if the assessment has progressed past them
  if (statusIdx >= 1) {
    // Visited = same as assessment date (the site visit happened on the scheduled date)
    dates["Visited"] = fmt(baseDate)
  }
  if (statusIdx >= 2) {
    const submitted = new Date(baseDate)
    submitted.setDate(submitted.getDate() + 3)
    dates["Data Submitted"] = fmt(submitted)
  }
  if (statusIdx >= 3) {
    const reviewed = new Date(baseDate)
    reviewed.setDate(reviewed.getDate() + 10)
    dates["Reviewed"] = fmt(reviewed)
  }
  if (statusIdx >= 4) {
    const approved = new Date(baseDate)
    approved.setDate(approved.getDate() + 14)
    dates["Approved"] = fmt(approved)
  }

  return dates
}


const PHOTO_CAPTIONS = [
  "Northern boundary - arable land",
  "Southern watercourse margin",
  "Existing hedgerow network",
  "Soil sample location A",
  "View from eastern access",
  "Proposed buffer strip area",
]

const LINKED_DOCUMENTS = [
  { name: "ASM-001 Survey Report.pdf", type: "Survey Report", date: "22 May 2025" },
  { name: "Whiteley Farm Soil Analysis.pdf", type: "Lab Results", date: "25 May 2025" },
  { name: "Metric Calculation Workbook.xlsx", type: "Metric Calculation", date: "28 May 2025" },
  { name: "Site Photos Pack.zip", type: "Site Photos", date: "22 May 2025" },
]

// ─── Component ────────────────────────────────────────────────────────────────

export default function AssessmentDetail() {
  const params = useParams()
  const id = (params?.id as string) ?? "ASM-001"

  const assessment = assessments.find((a) => a.id === id) ?? assessments[0]
  const assessor = assessors.find((a) => a.id === assessment.assessorId)
  const site = sites.find((s) => s.ref === assessment.siteRef)

  const statusIndex = TIMELINE_STEPS.findIndex(
    (s) => s.status === assessment.status
  )
  const timelineDates = getTimelineDates(assessment)

  return (
    <div className="space-y-6">
      {/* Breadcrumb + Header */}
      <div>
        <nav className="mb-2 flex items-center gap-1.5 text-sm text-muted-foreground">
          <Link
            href="/admin/brokerage-mockups/assessments"
            className="hover:text-foreground transition-colors"
          >
            Assessments
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-foreground font-medium">{assessment.id}</span>
        </nav>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold text-foreground">
            {assessment.siteName}
          </h1>
          <Badge variant="secondary" className={TYPE_BADGE[assessment.type]}>
            {assessment.type}
          </Badge>
          <Badge variant="secondary" className={STATUS_STYLES[assessment.status]}>
            {assessment.status}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_420px]">
        {/* ─── Left Column ─────────────────────────────────────────────── */}
        <div className="space-y-6">
          {/* Site Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Site Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div>
                  <Link
                    href={`/admin/brokerage-mockups/sites/${site?.ref ?? ""}`}
                    className="font-medium text-blue-600 hover:underline dark:text-blue-400"
                  >
                    {site?.name ?? assessment.siteName} ({site?.ref})
                  </Link>
                  <p className="text-sm text-muted-foreground">
                    {site?.address ?? "Address not available"}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 pt-2">
                <div>
                  <p className="text-xs text-muted-foreground">Catchment</p>
                  <p className="text-sm font-medium text-foreground">
                    {site?.catchment ?? "--"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Area</p>
                  <p className="text-sm font-medium text-foreground">
                    {site?.areaHectares ?? "--"} ha
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Soil Type</p>
                  <p className="text-sm font-medium text-foreground">
                    {site?.soilType ?? "--"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Survey Data */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Survey Data</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Habitat Types Table */}
              <div>
                <h4 className="mb-2 text-sm font-medium text-foreground">
                  Habitat Types
                </h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Habitat Type</TableHead>
                      <TableHead>Area</TableHead>
                      <TableHead>Condition</TableHead>
                      <TableHead>Distinctiveness</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assessment.metricOutput?.baselineParcels ? (
                      assessment.metricOutput.baselineParcels.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium text-foreground">{p.specificHabitatType}</TableCell>
                          <TableCell className="text-muted-foreground">{p.size} {p.sizeUnit}</TableCell>
                          <TableCell className="text-muted-foreground capitalize">{p.condition.replace(/_/g, " ")}</TableCell>
                          <TableCell className="text-muted-foreground capitalize">{p.distinctiveness === "v_low" ? "V.Low" : p.distinctiveness === "v_high" ? "V.High" : p.distinctiveness}</TableCell>
                        </TableRow>
                      ))
                    ) : assessment.habitatTypes && assessment.habitatTypes.length > 0 ? (
                      assessment.habitatTypes.map((ht, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium text-foreground">{ht}</TableCell>
                          <TableCell className="text-muted-foreground">{i === 0 ? `${site?.areaHectares ?? "?"} ha` : "—"}</TableCell>
                          <TableCell className="text-muted-foreground">—</TableCell>
                          <TableCell className="text-muted-foreground">—</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-muted-foreground italic">Survey data not available</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              <Separator />

              {/* Soil & Drainage */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Soil Type</p>
                  <p className="text-sm font-medium text-foreground">
                    {site?.soilType ?? "Clay loam"} - well-structured with good retention
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Drainage Assessment</p>
                  <p className="text-sm font-medium text-foreground">
                    Moderate - natural drainage to southern watercourse
                  </p>
                </div>
              </div>

              <Separator />

              {/* Nutrient Loading */}
              <div>
                <p className="text-xs text-muted-foreground">
                  Current Nutrient Loading
                </p>
                <p className="text-sm font-medium text-foreground">
                  42.3 kg/ha/yr nitrogen (measured via soil &amp; water sampling)
                </p>
              </div>

              <Separator />

              {/* Proposed Mitigation */}
              <div>
                <p className="text-xs text-muted-foreground">
                  Proposed Mitigation
                </p>
                <p className="text-sm text-foreground">
                  Conversion from intensive arable to permanent grassland with 10m
                  riparian buffer strips along the southern watercourse boundary.
                  Reduced fertiliser inputs and managed grazing regime to minimise
                  nutrient leaching. Target loading of 8.5 kg/ha/yr.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Photos */}
          {assessment.status !== "Scheduled" ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Site Photos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {PHOTO_CAPTIONS.map((caption) => (
                    <div key={caption} className="space-y-1.5">
                      <div className="flex h-28 items-center justify-center rounded-lg bg-muted">
                        <Camera className="h-8 w-8 text-muted-foreground/50" />
                      </div>
                      <p className="text-xs text-muted-foreground">{caption}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : null}

          {/* Findings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Findings &amp; Notes</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none dark:prose-invert">
              {assessment.findings ? (
                <>
                  <p className="text-sm text-foreground leading-relaxed">
                    {assessment.findings}
                  </p>
                  <p className="text-sm text-foreground leading-relaxed">
                    Water quality samples taken at three points along the southern
                    watercourse confirm elevated nitrogen levels consistent with
                    historical fertiliser application. The proposed conversion will
                    reduce loading by approximately 80% within the first 3 years, with
                    full effect by year 5.
                  </p>
                  <p className="text-sm text-foreground leading-relaxed">
                    The existing hedgerow network is in good condition and provides
                    additional interception capacity. Recommended enhancement with
                    native species infill planting to strengthen the buffer function
                    and deliver co-benefits for biodiversity.
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  Assessment has not yet been completed. Findings will be available
                  once the assessor submits their report.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Metric Calculation Results — NN */}
          {assessment.type === "NN Baseline" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Metric Calculation Results</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="rounded-lg border border-border bg-muted/50 p-4 text-center">
                    <p className="text-xs text-muted-foreground">Baseline Loading</p>
                    <p className="mt-1 text-lg font-bold text-foreground">
                      {assessment.nutrientOutput?.baselineLoadingKgYr.toLocaleString() ?? "—"} kg/yr
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {assessment.nutrientOutput
                        ? `${assessment.nutrientOutput.loadingFactorBaseline} kg/ha × ${site?.areaHectares ?? "?"} ha`
                        : "current land use"}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border bg-muted/50 p-4 text-center">
                    <p className="text-xs text-muted-foreground">Proposed Loading</p>
                    <p className="mt-1 text-lg font-bold text-foreground">
                      {assessment.nutrientOutput?.proposedLoadingKgYr.toLocaleString() ?? "—"} kg/yr
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {assessment.nutrientOutput
                        ? `${assessment.nutrientOutput.loadingFactorProposed} kg/ha × ${site?.areaHectares ?? "?"} ha`
                        : "after mitigation"}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border bg-muted/50 p-4 text-center">
                    <p className="text-xs text-muted-foreground">Credit Yield</p>
                    <p className="mt-1 text-lg font-bold text-green-600 dark:text-green-400">
                      {assessment.nutrientOutput?.creditYieldKgYr ?? assessment.creditYield ?? "—"} kg/yr
                    </p>
                    <p className="text-xs text-muted-foreground">nitrogen credits</p>
                  </div>
                </div>
                {assessment.nutrientOutput && (
                  <div className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">Land use change: </span>
                    {assessment.nutrientOutput.landUseChange}
                  </div>
                )}
                <div className="rounded-lg border-2 border-green-200 bg-green-50 p-4 text-center dark:border-green-800 dark:bg-green-950/30">
                  <p className="text-sm text-green-800 dark:text-green-300">
                    This site can generate{" "}
                    <span className="font-bold">
                      {assessment.nutrientOutput?.creditYieldKgYr ?? assessment.creditYield ?? "—"} kg/year nitrogen credits
                    </span>
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Biodiversity Metric Results — BNG */}
          {assessment.type === "BNG Habitat Survey" && assessment.metricOutput && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Biodiversity Metric Results</CardTitle>
                <p className="text-xs text-muted-foreground">
                  {assessment.metricOutput.metricVersion} · Calculated {assessment.metricOutput.calculationDate}
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <Tabs defaultValue="baseline">
                  <TabsList className="mb-3">
                    <TabsTrigger value="baseline">Baseline Survey</TabsTrigger>
                    <TabsTrigger value="proposed">Proposed Enhancement</TabsTrigger>
                  </TabsList>

                  <TabsContent value="baseline">
                    <Table>
                      <TableHeader>
                        <TableRow className="text-xs">
                          <TableHead>Habitat Type</TableHead>
                          <TableHead>Distinctiveness</TableHead>
                          <TableHead>Condition</TableHead>
                          <TableHead>Strategic Significance</TableHead>
                          <TableHead className="text-right">Parcels</TableHead>
                          <TableHead className="text-right">Size</TableHead>
                          <TableHead className="text-right">HUs</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {assessment.metricOutput.baselineParcels.map(p => (
                          <TableRow key={p.id}>
                            <TableCell className="text-sm font-medium text-foreground">{p.specificHabitatType}</TableCell>
                            <TableCell>
                              <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-xs font-medium ${
                                p.distinctiveness === "v_high" ? "bg-green-100 text-green-800 border-green-300 dark:bg-green-900/40 dark:text-green-300"
                                : p.distinctiveness === "high" ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                                : p.distinctiveness === "medium" ? "bg-amber-50 text-amber-700 border-amber-300"
                                : "bg-slate-100 text-slate-700 border-slate-300"
                              }`}>
                                {p.distinctiveness === "v_low" ? "V.Low" : p.distinctiveness === "v_high" ? "V.High" : p.distinctiveness.charAt(0).toUpperCase() + p.distinctiveness.slice(1)}
                              </span>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground capitalize">
                              {p.condition.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground capitalize">{p.strategicSignificance}</TableCell>
                            <TableCell className="text-right text-sm">{p.parcelCount}</TableCell>
                            <TableCell className="text-right text-sm">{p.size} {p.sizeUnit}</TableCell>
                            <TableCell className="text-right text-sm font-mono">{p.biodiversityUnits.toFixed(2)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                      <tfoot>
                        <tr className="border-t border-border bg-muted/30">
                          <td colSpan={6} className="px-4 py-2 text-sm font-semibold">TOTAL</td>
                          <td className="px-4 py-2 text-sm font-semibold text-right font-mono">
                            {assessment.metricOutput.totalBaselineHUs.toFixed(2)}
                          </td>
                        </tr>
                      </tfoot>
                    </Table>
                  </TabsContent>

                  <TabsContent value="proposed">
                    <Table>
                      <TableHeader>
                        <TableRow className="text-xs">
                          <TableHead>Habitat Type</TableHead>
                          <TableHead>Distinctiveness</TableHead>
                          <TableHead>Strategic Significance</TableHead>
                          <TableHead className="text-right">Parcels</TableHead>
                          <TableHead className="text-right">Size</TableHead>
                          <TableHead className="text-right">HUs</TableHead>
                          <TableHead className="text-right">HU Gain</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {assessment.metricOutput.improvementParcels.map(p => (
                          <TableRow key={p.id}>
                            <TableCell className="text-sm font-medium text-foreground">
                              <div>{p.specificHabitatType}</div>
                              {p.temporalRisk && (
                                <div className="text-xs text-muted-foreground">Temporal risk x{p.temporalRisk}</div>
                              )}
                            </TableCell>
                            <TableCell>
                              <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-xs font-medium ${
                                p.distinctiveness === "v_high" ? "bg-green-100 text-green-800 border-green-300 dark:bg-green-900/40 dark:text-green-300"
                                : p.distinctiveness === "high" ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                                : p.distinctiveness === "medium" ? "bg-amber-50 text-amber-700 border-amber-300"
                                : "bg-slate-100 text-slate-700 border-slate-300"
                              }`}>
                                {p.distinctiveness === "v_low" ? "V.Low" : p.distinctiveness === "v_high" ? "V.High" : p.distinctiveness.charAt(0).toUpperCase() + p.distinctiveness.slice(1)}
                              </span>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground capitalize">{p.strategicSignificance}</TableCell>
                            <TableCell className="text-right text-sm">{p.parcelCount}</TableCell>
                            <TableCell className="text-right text-sm">{p.size} {p.sizeUnit}</TableCell>
                            <TableCell className="text-right text-sm font-mono">{p.biodiversityUnits.toFixed(2)}</TableCell>
                            <TableCell className="text-right text-sm">
                              {p.unitGain !== null ? (
                                <span className="font-semibold text-green-600 dark:text-green-400">+{p.unitGain.toFixed(2)}</span>
                              ) : "—"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                      <tfoot>
                        <tr className="border-t border-border bg-muted/30">
                          <td colSpan={5} className="px-4 py-2 text-sm font-semibold">TOTAL</td>
                          <td className="px-4 py-2 text-sm font-semibold text-right font-mono">
                            {assessment.metricOutput.totalImprovementHUs.toFixed(2)}
                          </td>
                          <td className="px-4 py-2 text-sm font-semibold text-right text-green-600 dark:text-green-400">
                            +{assessment.metricOutput.totalHUGain.toFixed(2)}
                          </td>
                        </tr>
                      </tfoot>
                    </Table>
                  </TabsContent>
                </Tabs>

                {/* Result banner */}
                <div className="rounded-xl border-2 border-green-200 bg-green-50 p-5 text-center dark:border-green-800 dark:bg-green-950/30">
                  <p className="text-sm font-semibold text-green-800 dark:text-green-300">
                    Net biodiversity gain available to register
                  </p>
                  <p className="mt-2 text-2xl font-bold text-green-700 dark:text-green-400">
                    +{assessment.metricOutput.totalHUGain.toFixed(1)} area HUs
                    <span className="text-base font-medium ml-2">
                      · +{assessment.metricOutput.hedgerowHUGain.toFixed(1)} hedgerow HUs
                    </span>
                  </p>
                  <p className="mt-1 text-xs text-green-700 dark:text-green-400">
                    {assessment.metricOutput.metricVersion} · {assessment.assessorName} · {assessment.metricOutput.calculationDate}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* ─── Right Sidebar ──────────────────────────────────────────── */}
        <div className="space-y-6">
          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Assessment Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-0">
                {TIMELINE_STEPS.map((step, i) => {
                  const isComplete = i <= statusIndex
                  const isCurrent = i === statusIndex
                  return (
                    <div key={step.label} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        {isComplete ? (
                          <CheckCircle2
                            className={`h-5 w-5 shrink-0 ${
                              isCurrent
                                ? "text-blue-600 dark:text-blue-400"
                                : "text-green-600 dark:text-green-400"
                            }`}
                          />
                        ) : (
                          <Circle className="h-5 w-5 shrink-0 text-muted-foreground/40" />
                        )}
                        {i < TIMELINE_STEPS.length - 1 && (
                          <div
                            className={`my-1 h-6 w-px ${
                              isComplete
                                ? "bg-green-300 dark:bg-green-700"
                                : "bg-border"
                            }`}
                          />
                        )}
                      </div>
                      <div className="pb-4">
                        <p
                          className={`text-sm font-medium ${
                            isComplete ? "text-foreground" : "text-muted-foreground"
                          }`}
                        >
                          {step.label}
                        </p>
                        {isComplete && timelineDates[step.label] && (
                          <p className="text-xs text-muted-foreground">
                            {timelineDates[step.label]}
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Assessor Card */}
          {assessor && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Assessor</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className={`${assessor.avatarColor} text-sm font-medium`}>
                      {assessor.initials}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-foreground">{assessor.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {assessor.region}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {assessor.specialism.map((s) => (
                    <Badge
                      key={s}
                      variant="secondary"
                      className="text-xs"
                    >
                      {s}
                    </Badge>
                  ))}
                </div>
                <Separator />
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-3.5 w-3.5" />
                    <span>{assessor.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-3.5 w-3.5" />
                    <span>{assessor.phone}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Linked Documents */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Linked Documents</CardTitle>
            </CardHeader>
            <CardContent>
              {assessment.status !== "Scheduled" ? (
                <div className="space-y-2">
                  {LINKED_DOCUMENTS.map((doc) => (
                    <div
                      key={doc.name}
                      className="flex items-center gap-3 rounded-lg border border-border p-2.5"
                    >
                      <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">
                          {doc.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {doc.type} &middot; {doc.date}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  No documents yet. Documents will be available after the site visit.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button className="w-full bg-green-600 hover:bg-green-700 text-white">
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Approve Assessment
              </Button>
              <Button
                variant="outline"
                className="w-full border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-950/30"
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Request Revision
              </Button>
              <Button variant="outline" className="w-full">
                <Download className="mr-2 h-4 w-4" />
                Generate Report
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
