import { Construction } from "lucide-react"

interface PlaceholderPageProps {
  title: string
  subtitle?: string
  section: string
}

export function PlaceholderPage({ title, subtitle, section }: PlaceholderPageProps) {
  return (
    <div className="flex h-full flex-col">
      {/* Breadcrumb */}
      <div className="border-b border-border px-8 py-4">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">{section}</p>
      </div>

      {/* Content */}
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="max-w-md text-center">
          <Construction className="mx-auto h-12 w-12 text-muted-foreground/40" />
          <h1 className="mt-4 font-serif text-3xl">{title}</h1>
          {subtitle && <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>}
          <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-border bg-muted/50 px-4 py-1.5 text-xs">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            Coming soon
          </div>
        </div>
      </div>
    </div>
  )
}
