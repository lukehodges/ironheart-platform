import Link from "next/link"
import { FileQuestion } from "lucide-react"

export default function PlatformNotFound() {
  return (
    <div className="flex h-full flex-col items-center justify-center p-8 text-center">
      <FileQuestion size={48} className="text-muted-foreground/40 mb-4" />
      <h1 className="font-serif text-3xl mb-2">Section not found</h1>
      <p className="text-sm text-muted-foreground mb-6 max-w-md">
        This platform section doesn&apos;t exist. Use the sidebar to navigate to a valid section.
      </p>
      <Link
        href="/platform/today"
        className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm hover:bg-primary/90"
      >
        Back to Today
      </Link>
    </div>
  )
}
