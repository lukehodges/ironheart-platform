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

const TIMELINE_DATES: Record<string, string> = {
  Scheduled: "10 May 2025",
  Visited: "20 May 2025",
  "Data Submitted": "22 May 2025",
  Reviewed: "28 May 2025",
  Approved: "1 Jun 2025",
}

const HABITAT_DATA = [
  { type: "Arable (cereal)", area: "35.0 ha", condition: 2.1, distinctiveness: "Low" },
  { type: "Improved grassland", area: "18.0 ha", condition: 3.5, distinctiveness: "Low" },
  { type: "Riparian buffer (proposed)", area: "4.5 ha", condition: "N/A", distinctiveness: "Medium" },
  { type: "Hedgerow network", area: "2.5 ha", condition: 4.0, distinctiveness: "Medium" },
]

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
                      <TableHead>Type</TableHead>
                      <TableHead>Area</TableHead>
                      <TableHead>Condition Score</TableHead>
                      <TableHead>Distinctiveness</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {HABITAT_DATA.map((h) => (
                      <TableRow key={h.type}>
                        <TableCell className="font-medium text-foreground">
                          {h.type}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {h.area}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {h.condition}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {h.distinctiveness}
                        </TableCell>
                      </TableRow>
                    ))}
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

          {/* Metric Calculation Results */}
          {assessment.type === "NN Baseline" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Metric Calculation Results
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="rounded-lg border border-border bg-muted/50 p-4 text-center">
                    <p className="text-xs text-muted-foreground">Current Loading</p>
                    <p className="mt-1 text-lg font-bold text-foreground">
                      2,538 kg/yr
                    </p>
                    <p className="text-xs text-muted-foreground">
                      42.3 kg/ha x 60 ha
                    </p>
                  </div>
                  <div className="rounded-lg border border-border bg-muted/50 p-4 text-center">
                    <p className="text-xs text-muted-foreground">Proposed Loading</p>
                    <p className="mt-1 text-lg font-bold text-foreground">
                      510 kg/yr
                    </p>
                    <p className="text-xs text-muted-foreground">
                      8.5 kg/ha x 60 ha
                    </p>
                  </div>
                  <div className="rounded-lg border border-border bg-muted/50 p-4 text-center">
                    <p className="text-xs text-muted-foreground">Credit Yield</p>
                    <p className="mt-1 text-lg font-bold text-green-600 dark:text-green-400">
                      {assessment.creditYield ?? 95} kg/yr
                    </p>
                    <p className="text-xs text-muted-foreground">
                      after 80yr adjustment
                    </p>
                  </div>
                </div>
                <div className="rounded-lg border-2 border-green-200 bg-green-50 p-4 text-center dark:border-green-800 dark:bg-green-950/30">
                  <p className="text-sm text-green-800 dark:text-green-300">
                    This site can generate{" "}
                    <span className="font-bold">
                      {assessment.creditYield ?? 95} kg/year nitrogen credits
                    </span>
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
                        {isComplete && (
                          <p className="text-xs text-muted-foreground">
                            {TIMELINE_DATES[step.label] ?? "--"}
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
