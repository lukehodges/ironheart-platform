"use client"

import { useParams } from "next/navigation"
import Link from "next/link"
import {
  ChevronRight,
  Check,
  X,
  AlertTriangle,
  Upload,
  ExternalLink,
  FileText,
  MapPin,
  User,
  Clock,
  Calendar,
  Shield,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

import { sites, documents, contacts } from "../../../_mock-data"

// ---------------------------------------------------------------------------
// Registration steps
// ---------------------------------------------------------------------------

type RegistrationStep =
  | "Submitted"
  | "Under Review"
  | "Queries Raised"
  | "Approved"
  | "Gain Site Ref Issued"

const STEPS: RegistrationStep[] = [
  "Submitted",
  "Under Review",
  "Queries Raised",
  "Approved",
  "Gain Site Ref Issued",
]

const CURRENT_STEP: RegistrationStep = "Under Review"

// ---------------------------------------------------------------------------
// Required documents checklist
// ---------------------------------------------------------------------------

interface RequiredDoc {
  name: string
  status: "uploaded" | "draft" | "missing"
  docId?: string
}

const REQUIRED_DOCS: RequiredDoc[] = [
  { name: "Title deeds", status: "uploaded" },
  { name: "Boundary map", status: "uploaded" },
  { name: "Legal agreement (Conservation Covenant)", status: "uploaded", docId: "DOC-004" },
  { name: "Metric calculations", status: "uploaded", docId: "DOC-010" },
  { name: "HMMP", status: "draft", docId: "DOC-008" },
  { name: "Local land charge certificate", status: "missing" },
]

// ---------------------------------------------------------------------------
// Timeline events
// ---------------------------------------------------------------------------

interface TimelineEvent {
  date: string
  title: string
  description: string
  type: "submit" | "review" | "document" | "note"
}

const TIMELINE_EVENTS: TimelineEvent[] = [
  {
    date: "8 Mar 2026",
    title: "Registration status: Under Review",
    description: "Natural England confirmed receipt and assigned case officer.",
    type: "review",
  },
  {
    date: "5 Mar 2026",
    title: "Documents submitted",
    description: "Title deeds, boundary map, conservation covenant, and metric calculations uploaded to BNG Register.",
    type: "document",
  },
  {
    date: "4 Mar 2026",
    title: "Registration fee paid",
    description: "Payment of \u00a3639 received by Natural England.",
    type: "note",
  },
  {
    date: "3 Mar 2026",
    title: "Registration submitted",
    description: "Application submitted to Natural England BNG Public Register.",
    type: "submit",
  },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function StatusIcon({ status }: { status: RequiredDoc["status"] }) {
  switch (status) {
    case "uploaded":
      return (
        <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
          <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
        </span>
      )
    case "draft":
      return (
        <span className="w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
          <AlertTriangle className="w-3 h-3 text-amber-600 dark:text-amber-400" />
        </span>
      )
    case "missing":
      return (
        <span className="w-5 h-5 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center">
          <X className="w-3 h-3 text-red-600 dark:text-red-400" />
        </span>
      )
  }
}

function StatusLabel({ status }: { status: RequiredDoc["status"] }) {
  switch (status) {
    case "uploaded":
      return <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">Uploaded</span>
    case "draft":
      return <span className="text-xs font-medium text-amber-700 dark:text-amber-400">Draft</span>
    case "missing":
      return <span className="text-xs font-medium text-red-700 dark:text-red-400">Missing</span>
  }
}

function TimelineIcon({ type }: { type: TimelineEvent["type"] }) {
  switch (type) {
    case "submit":
      return <Shield className="w-3.5 h-3.5 text-emerald-500" />
    case "review":
      return <Clock className="w-3.5 h-3.5 text-blue-500" />
    case "document":
      return <FileText className="w-3.5 h-3.5 text-indigo-500" />
    case "note":
      return <Calendar className="w-3.5 h-3.5 text-amber-500" />
  }
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function RegistrationTrackerPage() {
  const params = useParams()
  const siteId = (params.id as string) ?? "S-0008"

  const site = sites.find((s) => s.ref === siteId) ?? sites.find((s) => s.ref === "S-0008")!
  const siteContact = contacts.find((c) => c.id === site.contact)
  const siteDocuments = documents.filter(
    (d) => d.linkedEntityType === "site" && d.linkedEntityId === site.ref
  )

  const currentStepIndex = STEPS.indexOf(CURRENT_STEP)

  return (
    <div className="max-w-screen-2xl mx-auto px-6 py-8 space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/admin/brokerage-mockups/sites" className="hover:text-foreground transition-colors">
          Sites
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <Link
          href={`/admin/brokerage-mockups/sites/${site.ref}`}
          className="hover:text-foreground transition-colors"
        >
          {site.ref}
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-foreground font-medium">Registration</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            BNG Registration Tracker
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {site.name} &middot; {site.ref}
          </p>
        </div>
        <Badge className="bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800">
          Under Review
        </Badge>
      </div>

      {/* Status Timeline */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Registration Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between relative">
            {/* Connecting line */}
            <div className="absolute top-5 left-0 right-0 h-0.5 bg-border" />
            <div
              className="absolute top-5 left-0 h-0.5 bg-emerald-500 transition-all"
              style={{ width: `${(currentStepIndex / (STEPS.length - 1)) * 100}%` }}
            />

            {STEPS.map((step, i) => {
              const isCompleted = i < currentStepIndex
              const isCurrent = i === currentStepIndex
              const isPending = i > currentStepIndex

              return (
                <div key={step} className="relative flex flex-col items-center z-10" style={{ flex: 1 }}>
                  {/* Step circle */}
                  <div
                    className={[
                      "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all",
                      isCompleted
                        ? "bg-emerald-500 border-emerald-500"
                        : isCurrent
                        ? "bg-card border-emerald-500 ring-4 ring-emerald-500/20"
                        : "bg-card border-border",
                    ].join(" ")}
                  >
                    {isCompleted ? (
                      <Check className="w-4 h-4 text-white" />
                    ) : isCurrent ? (
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    ) : (
                      <span className="w-2.5 h-2.5 rounded-full bg-muted-foreground/30" />
                    )}
                  </div>

                  {/* Label */}
                  <p
                    className={[
                      "text-xs font-medium mt-2 text-center max-w-[100px]",
                      isCompleted
                        ? "text-emerald-700 dark:text-emerald-400"
                        : isCurrent
                        ? "text-foreground font-semibold"
                        : "text-muted-foreground",
                    ].join(" ")}
                  >
                    {step}
                  </p>
                  {isPending && (
                    <p className="text-[10px] text-muted-foreground/60 mt-0.5">Pending</p>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Main content: two columns */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
        {/* Left column */}
        <div className="space-y-6">
          {/* Required Documents Checklist */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  Required Documents
                </CardTitle>
                <span className="text-xs text-muted-foreground">
                  {REQUIRED_DOCS.filter((d) => d.status === "uploaded").length}/{REQUIRED_DOCS.length} complete
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {REQUIRED_DOCS.map((doc) => (
                  <div
                    key={doc.name}
                    className="flex items-center justify-between rounded-lg border border-border p-3 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <StatusIcon status={doc.status} />
                      <div>
                        <p className="text-sm font-medium text-foreground">{doc.name}</p>
                        <StatusLabel status={doc.status} />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {doc.docId && doc.status === "draft" && (
                        <Link
                          href={`/admin/brokerage-mockups/documents/${doc.docId}`}
                          className="text-xs text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1"
                        >
                          <ExternalLink className="w-3 h-3" />
                          View
                        </Link>
                      )}
                      {doc.status === "missing" && (
                        <Button variant="outline" size="sm" className="h-7 text-xs">
                          <Upload className="w-3 h-3" />
                          Upload
                        </Button>
                      )}
                      {doc.status === "uploaded" && doc.docId && (
                        <Link
                          href={`/admin/brokerage-mockups/documents/${doc.docId}`}
                          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                        >
                          <ExternalLink className="w-3 h-3" />
                          View
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Registration Details */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Shield className="w-4 h-4 text-muted-foreground" />
                Registration Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4">
                <div>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">Registry</p>
                  <p className="text-sm font-medium text-foreground">Natural England BNG Register</p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">Registration Fee</p>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground">&pound;639</p>
                    <Badge className="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 text-[10px]">
                      Paid
                    </Badge>
                  </div>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">Submitted Date</p>
                  <p className="text-sm font-medium text-foreground">3 Mar 2026</p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">Expected Review</p>
                  <p className="text-sm font-medium text-foreground">Up to 6 weeks</p>
                  <p className="text-xs text-muted-foreground">Estimated: 14 Apr 2026</p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">Gain Site Reference</p>
                  <Badge variant="outline" className="text-xs text-muted-foreground">
                    Pending
                  </Badge>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">Legal Agreement</p>
                  <p className="text-sm font-medium text-foreground">{site.legalAgreement ?? "Conservation Covenant"}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right sidebar */}
        <div className="space-y-6">
          {/* Site Summary */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                Site Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Site Ref</span>
                  <span className="font-mono font-medium text-foreground">{site.ref}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Name</span>
                  <span className="font-medium text-foreground">{site.name}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Area</span>
                  <span className="font-medium text-foreground">{site.areaHectares} ha</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Unit Type</span>
                  <Badge variant="outline" className="text-[10px]">{site.unitType}</Badge>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Credit Yield</span>
                  <span className="font-medium text-foreground">{site.totalLabel}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Catchment</span>
                  <Badge variant="outline" className="text-[10px]">{site.catchment}</Badge>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">LPA</span>
                  <span className="font-medium text-foreground">{site.lpa}</span>
                </div>
              </div>
              <Separator />
              <Link
                href={`/admin/brokerage-mockups/sites/${site.ref}`}
                className="flex items-center gap-1.5 text-xs text-emerald-600 hover:text-emerald-700 font-medium"
              >
                View full site details
                <ExternalLink className="w-3 h-3" />
              </Link>
            </CardContent>
          </Card>

          {/* Contact */}
          {siteContact && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <User className="w-4 h-4 text-muted-foreground" />
                  Landowner
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-start gap-3">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className={`${siteContact.avatarColor} text-white text-xs font-semibold`}>
                      {siteContact.initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{siteContact.name}</p>
                    <p className="text-xs text-muted-foreground">{siteContact.company}</p>
                    <p className="text-xs text-muted-foreground mt-1">{siteContact.email}</p>
                  </div>
                </div>
                <Separator className="my-3" />
                <Link
                  href={`/admin/brokerage-mockups/contacts/${siteContact.id}`}
                  className="flex items-center gap-1.5 text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                >
                  View contact
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </CardContent>
            </Card>
          )}

          {/* Linked Documents */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <FileText className="w-4 h-4 text-muted-foreground" />
                Linked Documents
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {siteDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between rounded-md border border-border p-2.5 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">{doc.name}</p>
                        <p className="text-[10px] text-muted-foreground">{doc.type} &middot; {doc.fileSize}</p>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={[
                        "text-[10px] shrink-0 ml-2",
                        doc.status === "Completed" || doc.status === "Signed"
                          ? "text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
                          : doc.status === "Draft"
                          ? "text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800"
                          : "",
                      ].join(" ")}
                    >
                      {doc.status}
                    </Badge>
                  </div>
                ))}
                {siteDocuments.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">No documents linked</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Submission Timeline */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                Submission Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {TIMELINE_EVENTS.map((event, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="mt-0.5 w-6 h-6 rounded-full bg-muted flex items-center justify-center shrink-0">
                      <TimelineIcon type={event.type} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground">{event.title}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{event.description}</p>
                      <p className="text-[10px] text-muted-foreground/60 mt-1">{event.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
