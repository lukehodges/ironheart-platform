"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  FileText,
  ChevronLeft,
  Eye,
  BarChart3,
} from "lucide-react"

// ---------------------------------------------------------------------------
// Template data
// ---------------------------------------------------------------------------

interface Template {
  id: string
  title: string
  description: string
  category: string
  categoryColor: string
  stripeColor: string
  lastUpdated: string
  usageCount: number
}

const templates: Template[] = [
  {
    id: "TPL-001",
    title: "S106 Agreement",
    description: "Standard Section 106 agreement template for nutrient neutrality obligations between landowner, developer, and local planning authority.",
    category: "Legal",
    categoryColor: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800",
    stripeColor: "bg-amber-500",
    lastUpdated: "Feb 2026",
    usageCount: 12,
  },
  {
    id: "TPL-002",
    title: "Conservation Covenant",
    description: "Conservation covenant template for BNG gain sites under the Environment Act 2021. Includes 30-year minimum commitment provisions.",
    category: "Legal",
    categoryColor: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800",
    stripeColor: "bg-green-500",
    lastUpdated: "Jan 2026",
    usageCount: 4,
  },
  {
    id: "TPL-003",
    title: "Credit Purchase Agreement",
    description: "Standard credit purchase agreement for nitrogen or BNG unit transactions between supplier landowner and purchasing developer.",
    category: "Transaction",
    categoryColor: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800",
    stripeColor: "bg-blue-500",
    lastUpdated: "Feb 2026",
    usageCount: 18,
  },
  {
    id: "TPL-004",
    title: "Heads of Terms",
    description: "Non-binding heads of terms document for initial engagement with new supply-side landowners joining the mitigation scheme.",
    category: "Onboarding",
    categoryColor: "bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-950 dark:text-violet-400 dark:border-violet-800",
    stripeColor: "bg-violet-500",
    lastUpdated: "Dec 2025",
    usageCount: 8,
  },
  {
    id: "TPL-005",
    title: "Habitat Management & Monitoring Plan",
    description: "HMMP template for BNG gain sites. Details 30-year habitat creation, enhancement, and monitoring commitments required by Natural England.",
    category: "Compliance",
    categoryColor: "bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-950 dark:text-teal-400 dark:border-teal-800",
    stripeColor: "bg-teal-500",
    lastUpdated: "Feb 2026",
    usageCount: 3,
  },
  {
    id: "TPL-006",
    title: "Credit Reservation Agreement",
    description: "Short-form reservation agreement to hold nutrient credits or BNG units for a developer pending completion of planning conditions.",
    category: "Transaction",
    categoryColor: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800",
    stripeColor: "bg-blue-500",
    lastUpdated: "Jan 2026",
    usageCount: 6,
  },
  {
    id: "TPL-007",
    title: "Invoice Template",
    description: "Standard invoice template for credit sales, including VAT calculations, payment terms, and reference to underlying purchase agreement.",
    category: "Financial",
    categoryColor: "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-400 dark:border-purple-800",
    stripeColor: "bg-purple-500",
    lastUpdated: "Jan 2026",
    usageCount: 22,
  },
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function DocumentTemplatesPage() {
  return (
    <div className="max-w-screen-xl mx-auto px-6 py-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/admin/brokerage-mockups/documents"
              className="p-1 rounded-md border border-border hover:bg-accent transition-colors"
            >
              <ChevronLeft className="h-4 w-4 text-muted-foreground" />
            </Link>
            <FileText className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Document Templates
            </h1>
          </div>
          <p className="text-sm text-muted-foreground ml-[52px]">
            Pre-built templates for common brokerage documents. Use a template to create a new document quickly.
          </p>
        </div>
      </div>

      {/* Template Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {templates.map((template) => (
          <div
            key={template.id}
            className="rounded-lg border border-border bg-card overflow-hidden hover:shadow-md transition-all flex flex-col"
          >
            {/* Coloured top stripe */}
            <div className={`h-1.5 ${template.stripeColor}`} />

            <div className="p-5 flex-1 flex flex-col">
              {/* Icon + Title */}
              <div className="flex items-start gap-3 mb-3">
                <div className="rounded-lg bg-muted p-2 shrink-0">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-foreground leading-snug">
                    {template.title}
                  </h3>
                  <Badge variant="outline" className={`mt-1 text-[10px] ${template.categoryColor}`}>
                    {template.category}
                  </Badge>
                </div>
              </div>

              {/* Description */}
              <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 mb-4 flex-1">
                {template.description}
              </p>

              {/* Meta */}
              <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-4">
                <span>Last updated: {template.lastUpdated}</span>
                <span className="flex items-center gap-1">
                  <BarChart3 className="h-3 w-3" />
                  Used {template.usageCount} times
                </span>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <Button size="sm" className="flex-1 text-xs h-8">
                  Use Template
                </Button>
                <Button variant="outline" size="sm" className="text-xs h-8 gap-1">
                  <Eye className="h-3.5 w-3.5" />
                  Preview
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer note */}
      <div className="border-t border-border pt-4 mt-8">
        <p className="text-[11px] text-muted-foreground">
          Templates are configurable per vertical. Contact your platform administrator to customise templates for your organisation.
        </p>
      </div>
    </div>
  )
}
