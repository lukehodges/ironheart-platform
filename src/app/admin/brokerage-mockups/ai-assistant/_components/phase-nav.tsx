import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface PhaseNavProps {
  current: "A" | "B" | "C" | "D" | "E"
  title: string
  subtitle: string
}

const PHASES = [
  { id: "A", label: "Phase A", title: "Read-only Intelligence", href: "/admin/brokerage-mockups/ai-assistant/phase-a" },
  { id: "B", label: "Phase B", title: "Actionable Agent", href: "/admin/brokerage-mockups/ai-assistant/phase-b" },
  { id: "C", label: "Phase C", title: "Workflow Intelligence", href: "/admin/brokerage-mockups/ai-assistant/phase-c" },
  { id: "D", label: "Phase D", title: "Memory & Context", href: "/admin/brokerage-mockups/ai-assistant/phase-d" },
  { id: "E", label: "Phase E", title: "Autonomous Operations", href: "/admin/brokerage-mockups/ai-assistant/phase-e" },
]

export function PhaseNav({ current, title, subtitle }: PhaseNavProps) {
  const idx = PHASES.findIndex((p) => p.id === current)
  const prev = idx > 0 ? PHASES[idx - 1] : null
  const next = idx < PHASES.length - 1 ? PHASES[idx + 1] : null

  return (
    <div className="border-b border-border bg-muted/30">
      <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Link href="/admin/brokerage-mockups/ai-assistant" className="hover:text-foreground transition-colors">
            AI Platform Vision
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-foreground font-medium">{title}</span>
        </div>

        {/* Phase stepper */}
        <div className="hidden md:flex items-center gap-1">
          {PHASES.map((p) => (
            <Link key={p.id} href={p.href}>
              <Badge
                variant={p.id === current ? "default" : "outline"}
                className="text-xs cursor-pointer"
              >
                {p.label}
              </Badge>
            </Link>
          ))}
        </div>

        {/* Prev / Next */}
        <div className="flex items-center gap-2">
          {prev ? (
            <Button variant="outline" size="sm" asChild>
              <Link href={prev.href}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                {prev.label}
              </Link>
            </Button>
          ) : (
            <div className="w-20" />
          )}
          {next ? (
            <Button variant="outline" size="sm" asChild>
              <Link href={next.href}>
                {next.label}
                <ChevronRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          ) : (
            <div className="w-20" />
          )}
        </div>
      </div>

      {/* Phase subtitle */}
      <div className="max-w-7xl mx-auto px-6 pb-3">
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  )
}
