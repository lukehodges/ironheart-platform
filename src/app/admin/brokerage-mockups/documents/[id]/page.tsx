"use client"

import { useParams } from "next/navigation"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  FileText,
  ChevronLeft,
  ChevronRight,
  Download,
  Send,
  Archive,
  Plus,
  CheckCircle2,
  Clock,
  ExternalLink,
  MapPin,
  Handshake,
  User,
} from "lucide-react"
import { documents, sites, deals, contacts } from "../../_mock-data"

// ---------------------------------------------------------------------------
// Style maps
// ---------------------------------------------------------------------------

const TYPE_STYLES: Record<string, string> = {
  S106: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800",
  "Conservation Covenant": "bg-green-100 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-800",
  "Purchase Agreement": "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800",
  "Heads of Terms": "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800",
  HMMP: "bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-950 dark:text-teal-400 dark:border-teal-800",
  "Reservation Agreement": "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800",
  Invoice: "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-400 dark:border-purple-800",
  "Survey Report": "bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-900 dark:text-gray-400 dark:border-gray-700",
  "Metric Calculation": "bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-900 dark:text-gray-400 dark:border-gray-700",
}

const STATUS_STYLES: Record<string, string> = {
  Draft: "bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-900 dark:text-gray-400 dark:border-gray-700",
  Sent: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800",
  Viewed: "bg-cyan-100 text-cyan-700 border-cyan-200 dark:bg-cyan-950 dark:text-cyan-400 dark:border-cyan-800",
  Signed: "bg-green-100 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-800",
  Completed: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800",
  Expired: "bg-red-100 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800",
}

const VERSION_STATUS_STYLES: Record<string, string> = {
  Draft: "text-muted-foreground",
  Reviewed: "text-blue-600 dark:text-blue-400",
  Final: "text-emerald-600 dark:text-emerald-400",
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
}

// ---------------------------------------------------------------------------
// Signature timeline builder
// ---------------------------------------------------------------------------

interface SignatureStep {
  label: string
  date: string
  completed: boolean
}

function buildSignatureTimeline(doc: (typeof documents)[number]): SignatureStep[] {
  const steps: SignatureStep[] = []

  // "Created" entry from first version
  if (doc.versions?.length) {
    const first = doc.versions[0]
    steps.push({
      label: `Created by ${first.author}`,
      date: formatDate(first.date),
      completed: true,
    })
  }

  // Uploaded entry (if different from created)
  if (doc.versions && doc.versions.length > 1) {
    const latest = doc.versions[doc.versions.length - 1]
    steps.push({
      label: `Version ${latest.version} uploaded by ${latest.author}`,
      date: formatDate(latest.date),
      completed: true,
    })
  }

  // Signatory entries
  if (doc.signatories?.length) {
    for (const sig of doc.signatories) {
      if (sig.signed && sig.signedDate) {
        steps.push({
          label: `Signed by ${sig.name}`,
          date: formatDate(sig.signedDate),
          completed: true,
        })
      } else {
        steps.push({
          label: `Awaiting signature from ${sig.name}`,
          date: "Pending",
          completed: false,
        })
      }
    }
  }

  return steps
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function DocumentDetailPage() {
  const params = useParams()
  const docId = (params?.id as string) ?? "DOC-001"

  const doc = documents.find((d) => d.id === docId) ?? documents[0]

  // Resolve linked entities
  const linkedSite = doc.linkedEntityType === "site"
    ? sites.find((s) => s.ref === doc.linkedEntityId)
    : null
  const linkedDeal = doc.linkedEntityType === "deal"
    ? deals.find((d) => d.id === doc.linkedEntityId)
    : null

  // Related contacts: pull from deal or site
  const relatedContactIds: string[] = []
  if (linkedDeal) {
    if (linkedDeal.supplyContact) relatedContactIds.push(linkedDeal.supplyContact)
    if (linkedDeal.demandContact) relatedContactIds.push(linkedDeal.demandContact)
  } else if (linkedSite) {
    relatedContactIds.push(linkedSite.contact)
  }
  const relatedContacts = contacts.filter((c) => relatedContactIds.includes(c.id))

  const versionLabels = ["Draft", "Reviewed", "Final"]
  const signatureTimeline = buildSignatureTimeline(doc)
  const allSigned = signatureTimeline.length > 0 && signatureTimeline.every((s) => s.completed)

  return (
    <div className="max-w-screen-xl mx-auto px-6 py-6 space-y-6">
      {/* Breadcrumb + Header */}
      <div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
          <Link href="/admin/brokerage-mockups/documents" className="hover:text-primary transition-colors">
            Documents
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-foreground font-medium">{doc.name}</span>
        </div>

        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/admin/brokerage-mockups/documents"
              className="p-1.5 rounded-md border border-border hover:bg-accent transition-colors"
            >
              <ChevronLeft className="h-4 w-4 text-muted-foreground" />
            </Link>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground">{doc.name}</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className={`inline-flex items-center rounded border px-2 py-0.5 text-[10px] font-semibold ${STATUS_STYLES[doc.status]}`}>
                  {doc.status}
                </span>
                <span className={`inline-flex items-center rounded border px-2 py-0.5 text-[10px] font-semibold ${TYPE_STYLES[doc.type] ?? TYPE_STYLES["Survey Report"]}`}>
                  {doc.type}
                </span>
                <span className="text-xs text-muted-foreground">{doc.fileSize}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
        {/* Left Column - Document Preview */}
        <div className="space-y-6">
          {/* PDF Viewer Mock */}
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <div className="px-4 py-3 bg-muted/50 border-b border-border flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground">Document Preview</span>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <span>Page 1 of 8</span>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            <div className="bg-muted/30 p-8 flex items-center justify-center min-h-[500px]">
              <div className="bg-card border border-border rounded-lg shadow-sm w-full max-w-md p-8 space-y-6">
                <div className="text-center space-y-2">
                  <h2 className="text-lg font-bold text-foreground">{doc.name}</h2>
                  <p className="text-xs text-muted-foreground">{doc.type}</p>
                  <Separator className="my-4" />
                </div>
                <div className="space-y-3 text-xs text-muted-foreground">
                  {doc.type === "S106" && (
                    <>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70">Section 106 Town and Country Planning Act 1990</p>
                      {doc.signatories?.length ? (
                        <>
                          <p><span className="font-semibold text-foreground">Between:</span></p>
                          {doc.signatories.map((s, i) => (
                            <p key={i} className="pl-4">{s.name}</p>
                          ))}
                        </>
                      ) : null}
                      <Separator className="my-3" />
                      <p><span className="font-semibold text-foreground">Linked Entity:</span> {doc.linkedEntityLabel}</p>
                    </>
                  )}
                  {doc.type === "Purchase Agreement" && (
                    <>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70">Purchase Agreement</p>
                      {doc.signatories?.length ? (
                        <>
                          <p><span className="font-semibold text-foreground">Parties:</span></p>
                          {doc.signatories.map((s, i) => (
                            <p key={i} className="pl-4">{s.name}</p>
                          ))}
                        </>
                      ) : null}
                      <Separator className="my-3" />
                      <p><span className="font-semibold text-foreground">Reference:</span> {doc.linkedEntityLabel}</p>
                    </>
                  )}
                  {doc.type === "Conservation Covenant" && (
                    <>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70">Conservation Covenant under Environment Act 2021</p>
                      {doc.signatories?.length ? (
                        <>
                          <p><span className="font-semibold text-foreground">Parties:</span></p>
                          {doc.signatories.map((s, i) => (
                            <p key={i} className="pl-4">{s.name}</p>
                          ))}
                        </>
                      ) : null}
                      <Separator className="my-3" />
                      <p><span className="font-semibold text-foreground">Site:</span> {doc.linkedEntityLabel}</p>
                    </>
                  )}
                  {doc.type === "Heads of Terms" && (
                    <>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70">Heads of Terms -- Non-Binding</p>
                      {doc.signatories?.length ? (
                        <>
                          <p><span className="font-semibold text-foreground">Parties:</span></p>
                          {doc.signatories.map((s, i) => (
                            <p key={i} className="pl-4">{s.name}</p>
                          ))}
                        </>
                      ) : null}
                      <Separator className="my-3" />
                      <p><span className="font-semibold text-foreground">Reference:</span> {doc.linkedEntityLabel}</p>
                    </>
                  )}
                  {!["S106", "Purchase Agreement", "Conservation Covenant", "Heads of Terms"].includes(doc.type) && (
                    <>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70">Document Preview</p>
                      <Separator className="my-3" />
                      <p><span className="font-semibold text-foreground">Type:</span> {doc.type}</p>
                      <p><span className="font-semibold text-foreground">Linked Entity:</span> {doc.linkedEntityLabel}</p>
                      <p><span className="font-semibold text-foreground">Uploaded by:</span> {doc.uploadedBy}</p>
                    </>
                  )}
                  <Separator className="my-3" />
                  <div className="bg-muted/50 rounded p-3 text-center text-[10px] text-muted-foreground/60">
                    [Document content continues...]
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Version History */}
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <div className="px-4 py-3 bg-muted/50 border-b border-border">
              <span className="text-xs font-semibold text-foreground">Version History</span>
            </div>
            <div className="divide-y divide-border">
              {(doc.versions ?? []).map((v, idx) => {
                const vLabel = versionLabels[idx] ?? "Update"
                return (
                  <div key={v.version} className="flex items-center gap-4 px-4 py-3">
                    <div className="rounded-full bg-muted h-8 w-8 flex items-center justify-center text-xs font-bold text-muted-foreground">
                      V{v.version}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        Version {v.version} - <span className={VERSION_STATUS_STYLES[vLabel] ?? "text-foreground"}>{vLabel}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(v.date)} by {v.author}
                      </p>
                    </div>
                    {idx === (doc.versions?.length ?? 0) - 1 && (
                      <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800">
                        Current
                      </Badge>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Signature Status Timeline */}
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <div className="px-4 py-3 bg-muted/50 border-b border-border">
              <span className="text-xs font-semibold text-foreground">Signature Status</span>
            </div>
            <div className="p-4">
              <div className="relative">
                {/* Vertical line */}
                <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-border" />

                <div className="space-y-4">
                  {signatureTimeline.map((step, idx) => (
                    <div key={idx} className="flex items-start gap-3 relative">
                      <div className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 z-10 ${
                        step.completed
                          ? "bg-emerald-100 dark:bg-emerald-950"
                          : "bg-muted"
                      }`}>
                        {step.completed ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <Clock className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                      <div className="min-w-0 pt-0.5">
                        <p className="text-xs font-medium text-foreground">{step.label}</p>
                        <p className="text-[11px] text-muted-foreground">{step.date}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Final status */}
              <div className="mt-4 pt-3 border-t border-border">
                <div className="flex items-center gap-2">
                  {allSigned ? (
                    <>
                      <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                      <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400">Completed</span>
                    </>
                  ) : (
                    <>
                      <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                      <span className="text-sm font-bold text-amber-700 dark:text-amber-400">Awaiting Signatures</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Linked Entities */}
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <div className="px-4 py-3 bg-muted/50 border-b border-border">
              <span className="text-xs font-semibold text-foreground">Linked Entities</span>
            </div>
            <div className="p-4 space-y-3">
              {linkedSite && (
                <Link
                  href={`/admin/brokerage-mockups/sites/${linkedSite.ref}`}
                  className="flex items-center gap-3 p-3 rounded-md border border-border hover:bg-accent/30 transition-colors"
                >
                  <MapPin className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-foreground">{linkedSite.ref} {linkedSite.name}</p>
                    <p className="text-[11px] text-muted-foreground">{linkedSite.address}</p>
                  </div>
                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0 ml-auto" />
                </Link>
              )}

              {linkedDeal && (
                <Link
                  href={`/admin/brokerage-mockups/deals/${linkedDeal.id}`}
                  className="flex items-center gap-3 p-3 rounded-md border border-border hover:bg-accent/30 transition-colors"
                >
                  <Handshake className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-foreground">{linkedDeal.id} {linkedDeal.title}</p>
                    <p className="text-[11px] text-muted-foreground">{linkedDeal.stage} -- {linkedDeal.displayValue}</p>
                  </div>
                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0 ml-auto" />
                </Link>
              )}

              {relatedContacts.map((contact) => (
                <Link
                  key={contact.id}
                  href={`/admin/brokerage-mockups/contacts/${contact.id}`}
                  className="flex items-center gap-3 p-3 rounded-md border border-border hover:bg-accent/30 transition-colors"
                >
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0 ${contact.avatarColor}`}>
                    {contact.initials}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-foreground">{contact.name}</p>
                    <p className="text-[11px] text-muted-foreground">{contact.company} -- {contact.type}</p>
                  </div>
                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0 ml-auto" />
                </Link>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <div className="px-4 py-3 bg-muted/50 border-b border-border">
              <span className="text-xs font-semibold text-foreground">Actions</span>
            </div>
            <div className="p-4 space-y-2">
              <Button variant="outline" className="w-full justify-start gap-2 text-xs h-9">
                <Download className="h-3.5 w-3.5" />
                Download Document
              </Button>
              <Button variant="outline" className="w-full justify-start gap-2 text-xs h-9">
                <Send className="h-3.5 w-3.5" />
                Send Reminder
              </Button>
              <Button variant="outline" className="w-full justify-start gap-2 text-xs h-9">
                <Archive className="h-3.5 w-3.5" />
                Archive
              </Button>
              <Button variant="outline" className="w-full justify-start gap-2 text-xs h-9">
                <Plus className="h-3.5 w-3.5" />
                Create New Version
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
