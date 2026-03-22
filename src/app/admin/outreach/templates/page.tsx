"use client"

import { useState } from "react"
import { PageHeader } from "@/components/ui/page-header"
import { Button } from "@/components/ui/button"
import { Plus, FileText, Scissors } from "lucide-react"
import { TemplateCards } from "./_components/template-cards"
import { SnippetCards } from "./_components/snippet-cards"

// ---------------------------------------------------------------------------
// Templates & Snippets Page
// ---------------------------------------------------------------------------

export default function TemplatesPage() {
  const [tab, setTab] = useState<"templates" | "snippets">("templates")
  const [showNewTemplate, setShowNewTemplate] = useState(false)
  const [showNewSnippet, setShowNewSnippet] = useState(false)

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Templates"
        description="Reusable email templates and content snippets"
      >
        <Button
          size="sm"
          onClick={() =>
            tab === "templates"
              ? setShowNewTemplate(true)
              : setShowNewSnippet(true)
          }
        >
          <Plus className="h-4 w-4" aria-hidden="true" />{" "}
          {tab === "templates" ? "New Template" : "New Snippet"}
        </Button>
      </PageHeader>

      {/* Sub-tab toggle */}
      <div className="flex items-center gap-1 border rounded-lg p-0.5 bg-muted/50 w-fit">
        <Button
          variant={tab === "templates" ? "default" : "ghost"}
          size="sm"
          onClick={() => setTab("templates")}
        >
          <FileText className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />{" "}
          Templates
        </Button>
        <Button
          variant={tab === "snippets" ? "default" : "ghost"}
          size="sm"
          onClick={() => setTab("snippets")}
        >
          <Scissors className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />{" "}
          Snippets
        </Button>
      </div>

      {tab === "templates" && (
        <TemplateCards
          showNew={showNewTemplate}
          onShowNewChange={setShowNewTemplate}
        />
      )}
      {tab === "snippets" && (
        <SnippetCards
          showNew={showNewSnippet}
          onShowNewChange={setShowNewSnippet}
        />
      )}
    </div>
  )
}
