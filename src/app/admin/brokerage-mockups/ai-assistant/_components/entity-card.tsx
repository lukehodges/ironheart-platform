import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface EntityCardProps {
  type: string
  title: string
  subtitle?: string
  fields: { label: string; value: string; highlight?: boolean }[]
  href?: string
  badge?: { label: string; variant?: "default" | "secondary" | "outline" }
}

export function EntityCard({ type, title, subtitle, fields, href, badge }: EntityCardProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 my-2">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">{type}</p>
          <p className="text-sm font-semibold text-foreground mt-0.5">{title}</p>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {badge && (
          <Badge variant={badge.variant ?? "outline"} className="text-xs shrink-0">{badge.label}</Badge>
        )}
      </div>
      <div className="space-y-1">
        {fields.map((f, i) => (
          <div key={i} className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{f.label}</span>
            <span className={f.highlight ? "font-semibold text-primary" : "text-foreground"}>{f.value}</span>
          </div>
        ))}
      </div>
      {href && (
        <div className="mt-3 pt-3 border-t border-border">
          <Link href={href} className="text-xs text-primary hover:underline flex items-center gap-1">
            View full record <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      )}
    </div>
  )
}
